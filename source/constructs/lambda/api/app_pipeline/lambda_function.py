# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import json
import logging
import os
import uuid
from datetime import datetime

import boto3
from boto3.dynamodb.conditions import Attr
from botocore import config
from botocore.exceptions import ClientError
from common import APIException
from util.validator import AppPipelineValidator

logger = logging.getLogger()
logger.setLevel(logging.INFO)

stack_prefix = os.environ.get("STACK_PREFIX", "CL")
solution_version = os.environ.get("SOLUTION_VERSION", "v1.0.0")
solution_id = os.environ.get("SOLUTION_ID", "SO8025")
user_agent_config = {
    "user_agent_extra": f"AwsSolution/{solution_id}/{solution_version}"
}
default_config = config.Config(**user_agent_config)

# Get DDB resource.
dynamodb = boto3.resource("dynamodb", config=default_config)
sfn = boto3.client("stepfunctions", config=default_config)

app_pipeline_table_name = os.environ.get("APPPIPELINE_TABLE")
app_log_ingestion_table_name = os.environ.get("APPLOGINGESTION_TABLE")
default_region = os.environ.get("AWS_REGION")
stateMachineArn = os.environ.get("STATE_MACHINE_ARN")
app_pipeline_table = dynamodb.Table(app_pipeline_table_name)
app_log_ingestion_table = dynamodb.Table(app_log_ingestion_table_name)

# Get kinesis resource.
kds = boto3.client("kinesis", config=default_config)


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

    if action == "createAppPipeline":
        return create_app_pipeline(**args)
    elif action == "deleteAppPipeline":
        return delete_app_pipeline(**args)
    elif action == "listAppPipelines":
        return list_app_pipelines(**args)
    elif action == "getAppPipeline":
        return get_app_pipeline(**args)
    else:
        logger.info("Event received: " + json.dumps(event, indent=2))
        raise RuntimeError(f"Unknown action {action}")


def create_app_pipeline(**args):
    """Create a appPipeline"""
    logger.info("create appPipeline")

    aos_params = args["aosParams"]

    # Check if index prefix is duplicated in the same opensearch
    index_prefix = str(aos_params["indexPrefix"])
    domain_name = str(aos_params["domainName"])

    # Check the OpenSearch status
    # During the Upgrade and Pre-upgrade process, users can not create index template
    #  and create backend role.
    check_aos_status(domain_name)

    buffer_type = args["bufferType"]
    buffer_params = args.get("bufferParams", [])

    validator = AppPipelineValidator(app_pipeline_table)
    validator.validate_duplicate_index_prefix(args)
    validator.validate_index_prefix_overlap(
        index_prefix, domain_name, args.get("force")
    )
    # TODO: Support optional parameters
    validator.validate_buffer_params(buffer_type, buffer_params)

    pipeline_id = str(uuid.uuid4())
    stack_name = create_stack_name(pipeline_id)

    base_params_map = {
        "domainName": aos_params["domainName"],
        "engineType": aos_params["engine"],
        "endpoint": aos_params["opensearchEndpoint"],
        "indexPrefix": aos_params["indexPrefix"],
        "shardNumbers": aos_params["shardNumbers"],
        "replicaNumbers": aos_params["replicaNumbers"],
        "warmAge": aos_params.get("warmLogTransition", ""),
        "coldAge": aos_params.get("coldLogTransition", ""),
        "retainAge": aos_params.get("logRetention", ""),
        "rolloverSize": aos_params["rolloverSize"],
        "codec": aos_params.get("codec", "best_compression"),
        "indexSuffix": aos_params.get("indexSuffix", "yyyy-MM-dd"),
        "refreshInterval": aos_params["refreshInterval"],
        "vpcId": aos_params["vpc"]["vpcId"],
        "subnetIds": aos_params["vpc"]["privateSubnetIds"],
        "securityGroupId": aos_params["vpc"]["securityGroupId"],
        "backupBucketName": aos_params["failedLogBucket"],
    }
    # backup bucket is not required if no buffer is required.
    if buffer_type == "None":
        base_params_map.pop("backupBucketName")

    # Also need to Add the required buffer parameters
    buffer_params_map = _get_buffer_params(buffer_type, buffer_params)
    enable_autoscaling = buffer_params_map.pop("enableAutoScaling", "false")
    parameters = _create_stack_params(base_params_map | buffer_params_map)

    # Check which CloudFormation template to use
    pattern = _get_pattern_by_buffer(buffer_type, enable_autoscaling)

    sfn_args = {
        "stackName": stack_name,
        "pattern": pattern,
        "parameters": parameters,
    }

    # Start the pipeline flow
    exec_sfn_flow(pipeline_id, "START", sfn_args)
    app_pipeline_table.put_item(
        Item={
            "id": pipeline_id,
            "aosParams": args["aosParams"],
            "bufferType": args["bufferType"],
            "bufferParams": args["bufferParams"],
            "tags": args.get("tags", []),
            "createdDt": datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
            "status": "CREATING",
        }
    )

    return pipeline_id


def list_app_pipelines(status: str = "", page=1, count=20):
    """List app pipelines"""
    logger.info(
        f"List AppPipeline from DynamoDB in page {page} with {count} of records"
    )
    """ build filter conditions """

    if not status:
        conditions = Attr("status").ne("INACTIVE")
    else:
        conditions = Attr("status").eq(status)

    response = app_pipeline_table.scan(
        FilterExpression=conditions,
    )

    # Assume all items returned are in the scan request
    items = response["Items"]
    # logger.info(items)
    # build pagination
    total = len(items)
    start = (page - 1) * count
    end = page * count

    if start > total:
        start, end = 0, count
    logger.info(f"Return result from {start} to {end} in total of {total}")
    items.sort(key=lambda x: x["createdDt"], reverse=True)

    return {
        "total": len(items),
        "appPipelines": items[start:end],
    }


# obtain the app pipeline details and kds details
def get_app_pipeline(id: str) -> str:
    resp = app_pipeline_table.get_item(Key={"id": id})
    if "Item" not in resp:
        raise APIException("AppPipeline Not Found")

    item = resp["Item"]

    # If buffer is KDS, then
    # Get up-to-date shard count and consumer count.
    if item.get("bufferType") == "KDS" and item.get("bufferResourceName"):
        stream_name = item["bufferResourceName"]
        kds_resp = kds.describe_stream_summary(StreamName=stream_name)
        logger.info(f"kds_resp is {kds_resp}")
        if "StreamDescriptionSummary" in kds_resp:
            summary = kds_resp["StreamDescriptionSummary"]
            item["bufferParams"].append(
                {
                    "paramKey": "OpenShardCount",
                    "paramValue": summary.get("OpenShardCount"),
                }
            )
            item["bufferParams"].append(
                {
                    "paramKey": "ConsumerCount",
                    "paramValue": summary.get("ConsumerCount"),
                }
            )

    return item


def delete_app_pipeline(id: str):
    """set status to INACTIVE in AppPipeline table"""
    logger.info("Update AppPipeline Status in DynamoDB")
    pipeline_resp = app_pipeline_table.get_item(Key={"id": id})
    if "Item" not in pipeline_resp:
        raise APIException("AppPipeline Not Found")

    # Check if data exists in the AppLog Ingestion table
    # build filter conditions
    conditions = Attr("status").ne("INACTIVE")
    conditions = conditions.__and__(Attr("appPipelineId").eq(id))

    ingestion_resp = app_log_ingestion_table.scan(
        FilterExpression=conditions,
        ProjectionExpression="id,#status,sourceType,sourceId,appPipelineId ",
        ExpressionAttributeNames={"#status": "status"},
    )
    # Assume all items are returned in the scan request
    items = ingestion_resp["Items"]
    # logger.info(items)
    # build pagination
    total = len(items)
    if total > 0:
        raise APIException("Please delete the application log ingestion first")

    stack_id = pipeline_resp["Item"]["stackId"]
    if stack_id:
        args = {"stackId": stack_id}
        # Start the pipeline flow
        exec_sfn_flow(id, "STOP", args)

    app_pipeline_table.update_item(
        Key={"id": id},
        UpdateExpression="SET #status = :s, #updatedDt= :uDt",
        ExpressionAttributeNames={"#status": "status", "#updatedDt": "updatedDt"},
        ExpressionAttributeValues={
            ":s": "DELETING",
            ":uDt": datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
        },
    )


def exec_sfn_flow(id: str, action="START", args=None):
    """Helper function to execute a step function flow"""
    logger.info(f"Execute Step Function Flow: {stateMachineArn}")

    if args is None:
        args = {}

    input_args = {
        "id": id,
        "action": action,
        "args": args,
    }

    sfn.start_execution(
        name=f"{id}-{action}",
        stateMachineArn=stateMachineArn,
        input=json.dumps(input_args),
    )


def create_stack_name(id):
    return stack_prefix + "-AppPipe-" + id[:8]


def check_aos_status(aos_domain_name):
    """
    Helper function to check the aos status before create pipeline or ingestion.
    During the Upgrade and Pre-upgrade process, users can not create index template
    and create backend role.
    """
    region = default_region

    es = boto3.client("es", region_name=region)

    # Get the domain status.
    try:
        describe_resp = es.describe_elasticsearch_domain(DomainName=aos_domain_name)
        logger.info(json.dumps(describe_resp["DomainStatus"], indent=4, default=str))
    except ClientError as err:
        if err.response["Error"]["Code"] == "ResourceNotFoundException":
            raise APIException("OpenSearch Domain Not Found")
        raise err

    # Check domain status.
    if (
        not (describe_resp["DomainStatus"]["Created"])
        or describe_resp["DomainStatus"]["Processing"]
    ):
        raise APIException(
            "OpenSearch is in the process of creating, upgrading or pre-upgrading,"
            " please wait for it to be ready"
        )


def _get_pattern_by_buffer(buffer_type, enable_autoscaling="True"):
    if buffer_type == "S3":
        return "AppLogS3Buffer"
    elif buffer_type == "MSK":
        return "AppLogMSKBuffer"
    elif buffer_type == "KDS":
        if enable_autoscaling.lower() != "false":
            return "AppLogKDSBuffer"
        else:
            return "AppLogKDSBufferNoAutoScaling"
    else:
        return "AppLog"


def _get_buffer_params(buffer_type, buffer_params):
    """Helper function to get param key-value for buffer"""
    if buffer_type == "KDS":
        keys = ["shardCount", "minCapacity", "maxCapacity", "enableAutoScaling"]
    elif buffer_type == "MSK":
        keys = [
            "mskClusterArn",
            "mskClusterName",
            "topic",
        ]
    elif buffer_type == "S3":
        keys = [
            "logBucketName",
            "logBucketPrefix",
            "defaultCmkArn",
        ]
    else:
        keys = ["logProcessorRoleArn"]

    param_map = {}
    for param in buffer_params:
        if param["paramKey"] in keys:
            if param["paramKey"] == "logBucketPrefix":
                param_map[param["paramKey"]] = s3_notification_prefix(
                    param["paramValue"]
                )
            else:
                param_map[param["paramKey"]] = param["paramValue"]
    return param_map


def _create_stack_params(param_map):
    """Helper function to create cfn stack parameter key-value pairs"""

    params = []
    for k, v in param_map.items():
        params.append(
            {
                "ParameterKey": k,
                "ParameterValue": str(v),
            }
        )

    return params


def s3_notification_prefix(s: str):
    s = s.lstrip("/")

    placeholder_sign_index = min(
        filter(lambda x: x >= 0, (len(s), s.find("%"), s.find("$")))
    )
    rear_slash_index = s.rfind("/", 0, placeholder_sign_index)
    return s[0 : rear_slash_index + 1]
