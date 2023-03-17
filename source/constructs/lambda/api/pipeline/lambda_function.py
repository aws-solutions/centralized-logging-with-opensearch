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
from aws_svc_mgr import SvcManager

logger = logging.getLogger()
logger.setLevel(logging.INFO)

stack_prefix = os.environ.get("STACK_PREFIX", "CL")
solution_version = os.environ.get("SOLUTION_VERSION", "v1.0.0")
solution_id = os.environ.get("SOLUTION_ID", "SO8025")
user_agent_config = {
    "user_agent_extra": f"AwsSolution/{solution_id}/{solution_version}"
}
default_config = config.Config(**user_agent_config)

sts = boto3.client("sts", config=default_config)
account_id = sts.get_caller_identity()["Account"]

table_name = os.environ.get("PIPELINE_TABLE")
stateMachineArn = os.environ.get("STATE_MACHINE_ARN")
default_region = os.environ.get("AWS_REGION")

dynamodb = boto3.resource("dynamodb", region_name=default_region, config=default_config)
sfn = boto3.client("stepfunctions", region_name=default_region, config=default_config)

pipeline_table = dynamodb.Table(table_name)


def handle_error(func):
    """Decorator for exception handling"""

    def wrapper(*args, **kwargs):
        try:
            return func(*args, **kwargs)
        except APIException as e:
            logger.error(e)
            raise e
        except Exception as e:
            logger.error(e)
            raise RuntimeError(
                "Unknown exception, please check Lambda log for more details"
            )

    return wrapper


@handle_error
def lambda_handler(event, _):
    # logger.info("Received event: " + json.dumps(event, indent=2))

    action = event["info"]["fieldName"]
    args = event["arguments"]

    if action == "createServicePipeline":
        return create_service_pipeline(**args)
    elif action == "deleteServicePipeline":
        return delete_service_pipeline(**args)
    elif action == "listServicePipelines":
        return list_pipelines(**args)
    else:
        logger.info("Event received: " + json.dumps(event, indent=2))
        raise RuntimeError(f"Unknown action {action}")


def create_service_pipeline(**args):
    """Create a service pipeline deployment"""
    logger.info("Create Service Pipeline")

    pipeline_id = str(uuid.uuid4())

    stack_name = create_stack_name(pipeline_id)
    service_type = args["type"]
    source = args["source"]
    target = args["target"]
    destination_type = args["destinationType"]

    params = []
    args["parameters"].append(
        {
            "parameterKey": "logSourceAccountId",
            "parameterValue": args.get("logSourceAccountId") or account_id,
        }
    )

    if destination_type != "KDS":
        args["parameters"].append(
            {
                "parameterKey": "logSourceRegion",
                "parameterValue": args.get("logSourceRegion") or default_region,
            }
        )
    else:
        args["parameters"].append(
            {
                "parameterKey": "cloudFrontDistributionId",
                "parameterValue": source,
            }
        )

    svc_mgr = SvcManager()
    link_acct = svc_mgr.get_link_account(
        sub_account_id=args.get("logSourceAccountId", account_id),
        region=args.get("logSourceRegion") or default_region,
    )
    log_source_account_assume_role = ""
    if link_acct:
        log_source_account_assume_role = link_acct["subAccountRoleArn"]
    args["parameters"].append(
        {
            "parameterKey": "logSourceAccountAssumeRole",
            "parameterValue": log_source_account_assume_role,
        }
    )

    enable_autoscaling = "no"
    for p in args["parameters"]:
        if p["parameterKey"] == "enableAutoScaling":
            enable_autoscaling = p["parameterValue"]
            continue
        params.append(
            {
                "ParameterKey": p["parameterKey"],
                "ParameterValue": p["parameterValue"],
            }
        )

    pattern = _get_pattern_by_buffer(service_type, destination_type, enable_autoscaling)

    sfn_args = {
        "stackName": stack_name,
        "pattern": pattern,
        "parameters": params,
    }

    # Check the OpenSearch status
    domain_name = ""
    for p in args["parameters"]:
        if p["parameterKey"] == "domainName":
            domain_name = p["parameterValue"]
            break
    check_aos_status(domain_name)

    # Start the pipeline flow
    exec_sfn_flow(pipeline_id, "START", sfn_args)

    pipeline_table.put_item(
        Item={
            "id": pipeline_id,
            "type": service_type,
            "source": source,
            "target": target,
            "destinationType": destination_type,
            "parameters": args["parameters"],
            "tags": args.get("tags", []),
            "createdDt": datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
            "stackName": stack_name,
            # 'startExecutionArn': start_exec_arn,
            "status": "CREATING",
        }
    )
    return pipeline_id


def delete_service_pipeline(id: str) -> str:
    """delete a service pipeline deployment"""
    logger.info("Delete Service Pipeline")

    resp = pipeline_table.get_item(
        Key={
            "id": id,
        }
    )
    if "Item" not in resp:
        raise APIException("Pipeline Not Found")

    if resp["Item"].get("status") in ["INACTIVE", "DELETING"]:
        raise APIException("No pipeline to delete")

    status = "INACTIVE"

    if "stackId" in resp["Item"] and resp["Item"]["stackId"]:
        status = "DELETING"
        args = {"stackId": resp["Item"]["stackId"]}
        # Start the pipeline flow
        exec_sfn_flow(id, "STOP", args)

    update_status(id, status)
    return "OK"


def update_status(id: str, status: str):
    """Update pipeline status in pipeline table"""
    logger.info("Update Pipeline Status in DynamoDB")
    pipeline_table.update_item(
        Key={"id": id},
        UpdateExpression="SET #status = :s",
        ExpressionAttributeNames={"#status": "status"},
        ExpressionAttributeValues={
            ":s": status,
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


def list_pipelines(page=1, count=20):
    logger.info(f"List Pipelines from DynamoDB in page {page} with {count} of records")
    response = pipeline_table.scan(
        FilterExpression=Attr("status").ne("INACTIVE"),
        ProjectionExpression="id, createdDt, #type, #source,#parameters,target, #status",
        ExpressionAttributeNames={
            "#status": "status",
            "#source": "source",
            "#parameters": "parameters",
            "#type": "type",
        },
    )

    # Assume all items are returned in the scan request
    items = response["Items"]
    # logger.info(items)

    total = len(items)
    start = (page - 1) * count
    end = page * count

    if start > total:
        start, end = 0, count
    logger.info(f"Return result from {start} to {end} in total of {total}")
    items.sort(key=lambda x: x["createdDt"], reverse=True)
    return {
        "total": len(items),
        "pipelines": items[start:end],
    }


def create_stack_name(id):
    return stack_prefix + "-Pipe-" + id[:8]


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


def _get_pattern_by_buffer(service_type, destination_type, enable_autoscaling="no"):
    if service_type == "CloudFront" and destination_type == "KDS":
        if enable_autoscaling.lower() != "no":
            return "CloudFrontRealtimeLogKDSBuffer"
        else:
            return "CloudFrontRealtimeLogKDSBufferNoAutoScaling"
    if (
        service_type == "CloudTrail" or service_type == "VPC"
    ) and destination_type == "CloudWatch":
        if enable_autoscaling.lower() != "no":
            return "CloudWatchLogKDSBuffer"
        else:
            return "CloudWatchLogKDSBufferNoAutoScaling"
    else:
        return service_type


class APIException(Exception):
    def __init__(self, message):
        self.message = message
