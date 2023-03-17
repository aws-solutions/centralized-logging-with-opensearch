# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import json
import logging
import os
import uuid

from datetime import datetime

import boto3
from botocore import config


from util.log_ingestion_svc import LogIngestionSvc
from util.sys_enum_type import SOURCETYPE
from common import APIException

logger = logging.getLogger()
logger.setLevel(logging.INFO)

DEFAULT_TIME_FORMAT = "%Y-%m-%dT%H:%M:%SZ"

stack_prefix = os.environ.get("STACK_PREFIX", "CL")
solution_version = os.environ.get("SOLUTION_VERSION", "v1.0.0")
solution_id = os.environ.get("SOLUTION_ID", "SO8025")
user_agent_config = {
    "user_agent_extra": f"AwsSolution/{solution_id}/{solution_version}"
}
default_config = config.Config(**user_agent_config)

sts = boto3.client("sts", config=default_config)
elb = boto3.client("elbv2", config=default_config)
account_id = sts.get_caller_identity()["Account"]
region = os.environ.get("AWS_REGION")

awslambda = boto3.client("lambda", config=default_config)
sfn = boto3.client("stepfunctions", config=default_config)
iam = boto3.client("iam", config=default_config)
async_ec2_child_lambda_arn = os.environ.get("ASYNC_EC2_CHILD_LAMBDA_ARN")
async_s3_child_lambda_arn = os.environ.get("ASYNC_S3_CHILD_LAMBDA_ARN")
async_syslog_child_lambda_arn = os.environ.get("ASYNC_SYSLOG_CHILD_LAMBDA_ARN")
failed_log_bucket = os.environ.get("CONFIG_FILE_S3_BUCKET_NAME")
log_agent_vpc_id = os.environ.get("LOG_AGENT_VPC_ID")
log_agent_subnet_ids = os.environ.get("LOG_AGENT_SUBNETS_IDS")  # Private subnets
state_machine_arn = os.environ.get("STATE_MACHINE_ARN")
default_cmk_arn = os.environ.get("DEFAULT_CMK_ARN")
ecs_cluster_name = os.environ.get("ECS_CLUSTER_NAME")

# Get DDB resource.
dynamodb = boto3.resource("dynamodb", config=default_config)
table_name = os.environ.get("APPLOGINGESTION_TABLE")
app_log_ingestion_table = dynamodb.Table(table_name)

group_table_name = os.environ.get("INSTANCE_GROUP_TABLE_NAME")
instance_group_table = dynamodb.Table(group_table_name)

conf_table_name = os.environ.get("APP_LOG_CONFIG_TABLE_NAME")
log_conf_table = dynamodb.Table(conf_table_name)
app_pipeline_table = dynamodb.Table(os.environ.get("APP_PIPELINE_TABLE_NAME"))
s3_log_source_table = dynamodb.Table(os.environ.get("S3_LOG_SOURCE_TABLE_NAME"))
log_source_table = dynamodb.Table(os.environ.get("LOG_SOURCE_TABLE_NAME"))
eks_cluster_log_source_table = dynamodb.Table(
    os.environ.get("EKS_CLUSTER_SOURCE_TABLE_NAME")
)

default_region = os.environ.get("AWS_REGION")

log_ingestion_svc = LogIngestionSvc()


def handle_error(func):
    """Decorator for exception handling"""

    def wrapper(*args, **kwargs):
        try:
            return func(*args, **kwargs)
        except APIException as e:
            logger.exception(e)
            raise e
        except Exception as e:
            logger.exception(e)
            raise RuntimeError(
                "Unknown exception, please check Lambda log for more details"
            )

    return wrapper


@handle_error
def lambda_handler(event, context):
    # logger.info("Received event: " + json.dumps(event, indent=2))

    action = event["info"]["fieldName"]
    args = event["arguments"]

    if action == "createAppLogIngestion":
        return create_app_log_ingestion(**args)
    elif action == "updateAppLogIngestion":
        return update_app_log_ingestion(**args)
    elif action == "listAppLogIngestions":
        return log_ingestion_svc.list_app_log_ingestions(**args)
    elif action == "deleteAppLogIngestion":
        return delete_app_log_ingestion(**args)
    else:
        logger.info("Event received: " + json.dumps(event, indent=2))
        raise RuntimeError(f"Unknown action {action}")


def create_app_log_ingestion(**args):
    """Create a AppLogIngestion"""
    logger.info("Create App Log Ingestion")

    current_conf = log_conf_table.get_item(Key={"id": args["confId"]})["Item"]
    args["current_conf"] = current_conf
    # validate aos status:
    # During the Upgrade and Pre-upgrade process, users can not create index template
    #  and create backend role.

    pipeline_info = log_ingestion_svc.get_app_pipeline(args["appPipelineId"])
    # Handle old data
    aos_param_col = "aosParams"
    if "aosParas" in pipeline_info:
        aos_param_col = "aosParas"
    domain_name = pipeline_info[aos_param_col].get("domainName", "")

    is_aos_ready = log_ingestion_svc.check_aos_status(domain_name)
    if not is_aos_ready:
        raise APIException(
            "OpenSearch is in the process of creating, upgrading or pre-upgrading,"
            " please wait for it to be ready"
        )
    # validate duplicate conf for aos template:
    # Find out whether there is a configuration type with the same configuration type in the ingestion table according
    #  to the pipeline ID.
    # If the field name is the same and the field type is different, it needs to be rejected.
    # If the verification fails, the system will throw APIException.
    log_ingestion_svc.validate_config(**args)
    # batch write ingestion
    args = log_ingestion_svc.batch_write_app_log_ingestions(**args)

    is_multiline = True if current_conf.get("multilineLogParser") else False
    args["is_multiline"] = is_multiline

    # Asynchronous
    # ec2 as source
    if (
        args["sourceType"] == SOURCETYPE.EC2.value
        or args["sourceType"] == SOURCETYPE.ASG.value
    ):
        log_ingestion_svc.remote_create_index_template(
            args["appPipelineId"],
            args["confId"],
            args["createDashboard"],
            multiline_log_parser=current_conf.get("multilineLogParser"),
        )

        logger.info("Send the async job to child lambda for creating ec2 ingestion.")
        async_resp = awslambda.invoke(
            FunctionName=async_ec2_child_lambda_arn,
            InvocationType="Event",
            Payload=json.dumps(args),
        )
        process_async_lambda_resp(async_resp)
    # EKS
    elif args["sourceType"] == SOURCETYPE.EKS_CLUSTER.value:
        eks_src_ingestion(**args)
    # Syslog
    elif args["sourceType"] == SOURCETYPE.SYSLOG.value:
        logger.info("Send the async job to child lambda for creating Syslog ingestion.")
        async_resp = awslambda.invoke(
            FunctionName=async_syslog_child_lambda_arn,
            InvocationType="Event",
            Payload=json.dumps(args),
        )
        process_async_lambda_resp(async_resp)
        log_ingestion_svc.remote_create_index_template(
            args["appPipelineId"],
            args["confId"],
            args["createDashboard"],
            multiline_log_parser=current_conf.get("multilineLogParser"),
        )
        create_syslog_sub_stack(**args)
    else:
        raise APIException(f"Unknown sourceType ({args['sourceType']})")


def update_app_log_ingestion(id, status):
    """set status in AppLogIngestion table"""
    logger.info("Update AppLogIngestion Status in DynamoDB")
    resp = app_log_ingestion_table.get_item(Key={"id": id})
    if "Item" not in resp:
        raise APIException("App Log Ingestion Not Found")

    app_log_ingestion_table.update_item(
        Key={"id": id},
        UpdateExpression="SET #s = :s, updatedDt= :uDt",
        ExpressionAttributeNames={"#s": "status"},
        ExpressionAttributeValues={
            ":s": status,
            ":uDt": datetime.utcnow().strftime(DEFAULT_TIME_FORMAT),
        },
    )


def delete_app_log_ingestion(ids):
    """set status to INACTIVE in AppLogIngestion table"""
    logger.info("Delete AppLogIngestion Status in DynamoDB")

    # Update the app log ingestion table
    for ingestion_id in ids:
        args = {
            "id": ingestion_id,
            "status": "DELETING",
        }
        update_app_log_ingestion(**args)

    # Asynchronous
    logger.info("Send the async job to child lambda.")
    ec2_ids, eks_ids, syslog_ids = separate_ingestion_ids_by_type(ids)
    if len(ec2_ids) > 0:
        args = {"action": "asyncDeleteAppLogIngestion", "ids": ec2_ids}
        async_resp = awslambda.invoke(
            FunctionName=async_ec2_child_lambda_arn,
            InvocationType="Event",
            Payload=json.dumps(args),
        )
        process_async_lambda_resp(async_resp)

    if len(eks_ids) > 0:
        for eks_id in eks_ids:
            args = {
                "id": eks_id,
                "status": "INACTIVE",
            }
            update_app_log_ingestion(**args)

    if len(syslog_ids) > 0:
        for ingestion_id in syslog_ids:
            delete_syslog_source_sub_stack(ingestion_id)


def create_syslog_sub_stack(**args):
    """Create a syslog sub stack"""
    logger.info("create syslog sub stack")
    for source_id in args["sourceIds"]:
        id = args["source_ingestion_map"].get(source_id)
        stack_name = create_stack_name(id, "Syslog")

        # Get the app pipeline info
        app_pipeline_resp = app_pipeline_table.get_item(
            Key={"id": args["appPipelineId"]}
        )["Item"]
        _buffer_access_role_arn = app_pipeline_resp.get("bufferAccessRoleArn")

        # Get the syslog source info
        log_source_resp = log_source_table.get_item(Key={"id": source_id})["Item"]
        _deploy_account_id = log_source_resp.get("accountId", account_id)
        _deploy_region = log_source_resp.get("region", region)
        _port = 0
        _protocol_type = ""
        for info in log_source_resp["sourceInfo"]:
            if info["key"] == "syslogPort":
                _port = info["value"]
            elif info["key"] == "syslogProtocol":
                _protocol_type = info["value"]

        # Call the function to create nlb if needed
        syslog_nlb_arn, syslog_nlb_dns_name = log_ingestion_svc.create_syslog_nlb(
            log_agent_subnet_ids
        )

        # Config the sub stack params
        sfn_args = {
            "stackName": stack_name,
            "pattern": "SyslogtoECSStack",
            "deployAccountId": _deploy_account_id,
            "deployRegion": _deploy_region,
            "parameters": [
                # System level params
                {
                    "ParameterKey": "NlbArn",
                    "ParameterValue": syslog_nlb_arn,
                },
                {
                    "ParameterKey": "ECSClusterName",
                    "ParameterValue": str(ecs_cluster_name),
                },
                {
                    "ParameterKey": "ConfigS3BucketName",
                    "ParameterValue": str(failed_log_bucket),
                },
                # Buffer layer
                {
                    "ParameterKey": "ECSTaskRoleArn",
                    "ParameterValue": str(_buffer_access_role_arn),
                },
                # VPC
                {
                    "ParameterKey": "ECSVpcId",
                    "ParameterValue": str(log_agent_vpc_id),
                },
                {
                    "ParameterKey": "ECSSubnets",
                    "ParameterValue": str(log_agent_subnet_ids),
                },
                # fluent-bit config params
                {
                    "ParameterKey": "NlbPortParam",
                    "ParameterValue": str(_port),
                },
                {
                    "ParameterKey": "NlbProtocolTypeParam",
                    "ParameterValue": str(_protocol_type),
                },
                {
                    "ParameterKey": "ServiceConfigS3KeyParam",
                    "ParameterValue": "app_log_config/syslog/" + str(_port) + "/",
                },
            ],
        }

        # Start the pipeline flow
        exec_sfn_flow(id, "START", sfn_args)

        # Set the syslog port from REGISTERED to ACTIVE in log source table
        # And write back the syslog_nlb_arn, syslog_nlb_dns_name to log source table
        log_source_resp["sourceInfo"].extend(
            [
                {"key": "syslogNlbArn", "value": syslog_nlb_arn},
                {"key": "syslogNlbDNSName", "value": syslog_nlb_dns_name},
            ]
        )
        log_source_table.update_item(
            Key={"id": source_id},
            UpdateExpression="SET #s = :s, updatedDt = :uDt, sourceInfo= :sourceInfo",
            ExpressionAttributeNames={
                "#s": "status",
            },
            ExpressionAttributeValues={
                ":s": "ACTIVE",
                ":uDt": datetime.utcnow().strftime(DEFAULT_TIME_FORMAT),
                ":sourceInfo": log_source_resp["sourceInfo"],
            },
        )


def delete_syslog_source_sub_stack(ingestion_id):
    """Delete a syslog sub stack"""
    logger.info("delete syslog sub stack")

    resp = app_log_ingestion_table.get_item(Key={"id": ingestion_id})
    if "Item" not in resp:
        raise APIException("Syslog Source AppPipeline Not Found")

    stack_id = resp["Item"]["stackId"]
    source_id = resp["Item"]["sourceId"]

    if stack_id:
        args = {
            "stackId": stack_id,
            "deployAccountId": account_id,  # Syslog will be in the same account and region
            "deployRegion": region,
        }
        # Start the pipeline flow
        exec_sfn_flow(ingestion_id, "STOP", args)

    # Update the log source table
    log_source_table.update_item(
        Key={"id": source_id},
        UpdateExpression="SET #s = :s, updatedDt = :uDt",
        ExpressionAttributeNames={"#s": "status"},
        ExpressionAttributeValues={
            ":s": "INACTIVE",
            ":uDt": datetime.utcnow().strftime(DEFAULT_TIME_FORMAT),
        },
    )

    # Call the function to delete nlb if needed
    source_info = log_source_table.get_item(Key={"id": source_id})["Item"]
    log_ingestion_svc.delete_syslog_nlb(source_info)


def eks_src_ingestion(**args):
    log_ingestion_svc.create_eks_cluster_pod_log_ingestion(**args)


def create_stack_name(id, log_type):
    return stack_prefix + "-AppIngestion-" + str(log_type) + "-" + id[:8]


def exec_sfn_flow(flow_id: str, action="START", args=None):
    """Helper function to execute a step function flow"""
    logger.info(f"Execute Step Function Flow: {state_machine_arn}")

    if args is None:
        args = {}

    input_args = {
        "id": flow_id,
        "action": action,
        "args": args,
    }
    random_code = str(uuid.uuid4())[:8]
    sfn.start_execution(
        name=f"{flow_id}-{random_code}-{action}",
        stateMachineArn=state_machine_arn,
        input=json.dumps(input_args),
    )


def separate_ingestion_ids_by_type(ids):
    """Helper function to separate the ingestion ids by source type"""
    ec2_ids = []
    eks_ids = []
    syslog_ids = []
    for ingestion_id in ids:
        log_ingestion_resp = app_log_ingestion_table.get_item(Key={"id": ingestion_id})
        source_type = log_ingestion_resp["Item"].get("sourceType", "EC2")
        if source_type == SOURCETYPE.EC2.value or source_type == SOURCETYPE.ASG.value:
            ec2_ids.append(ingestion_id)
        if source_type == SOURCETYPE.EKS_CLUSTER.value:
            eks_ids.append(ingestion_id)
        if source_type == SOURCETYPE.SYSLOG.value:
            syslog_ids.append(ingestion_id)
    return ec2_ids, eks_ids, syslog_ids


def process_async_lambda_resp(async_resp):
    logger.info(f'Remote resp {async_resp["Payload"].read()}')

    if async_resp["StatusCode"] > 300:
        raise APIException("Error call async Lambda")
