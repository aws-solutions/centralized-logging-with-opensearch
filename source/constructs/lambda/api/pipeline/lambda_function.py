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
from aws_svc_mgr import SvcManager

logger = logging.getLogger()
logger.setLevel(logging.INFO)

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

dynamodb = boto3.resource("dynamodb",
                          region_name=default_region,
                          config=default_config)
sfn = boto3.client("stepfunctions",
                   region_name=default_region,
                   config=default_config)

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
                "Unknown exception, please check Lambda log for more details")

    return wrapper


@handle_error
def lambda_handler(event, context):
    # logger.info("Received event: " + json.dumps(event, indent=2))

    action = event["info"]["fieldName"]
    args = event["arguments"]

    if action == "createServicePipeline":
        return create_service_pipeline(**args)
    elif action == "deleteServicePipeline":
        return delete_service_pipeline(**args)
    elif action == "listServicePipelines":
        return list_pipelines(**args)
    elif action == "checkServiceExisting":
        return check_service_existing(**args)
    else:
        logger.info("Event received: " + json.dumps(event, indent=2))
        raise RuntimeError(f"Unknown action {action}")


def create_service_pipeline(**args):
    """Create a service pipeline deployment"""
    logger.info("Create Service Pipeline")

    id = str(uuid.uuid4())

    stack_name = create_stack_name(id)
    service_type = args["type"]
    source = args["source"]
    target = args["target"]

    pattern = service_type

    params = []
    args["parameters"].append({
        "parameterKey":
        "logSourceAccountId",
        "parameterValue":
        args.get("logSourceAccountId") or account_id,
    })
    args["parameters"].append({
        "parameterKey":
        "logSourceRegion",
        "parameterValue":
        args.get("logSourceRegion") or default_region,
    })

    svcMgr = SvcManager()
    link_acct = svcMgr.get_link_account(sub_account_id=args.get(
        "logSourceAccountId", account_id),
                                        region=args.get("logSourceRegion")
                                        or default_region)
    log_source_account_assume_role = ""
    if link_acct:
        log_source_account_assume_role = link_acct["subAccountRoleArn"]
    args["parameters"].append({
        "parameterKey": "logSourceAccountAssumeRole",
        "parameterValue": log_source_account_assume_role,
    })

    for p in args["parameters"]:
        params.append({
            "ParameterKey": p["parameterKey"],
            "ParameterValue": p["parameterValue"],
        })

    sfn_args = {
        "stackName": stack_name,
        "pattern": pattern,
        "parameters": params,
    }

    # Start the pipeline flow
    exec_sfn_flow(id, "START", sfn_args)

    # start_exec_arn = response['executionArn']
    pipeline_table.put_item(
        Item={
            "id": id,
            "type": service_type,
            "source": source,
            "target": target,
            "parameters": args["parameters"],
            "tags": args.get("tags", []),
            "createdDt": datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
            "stackName": stack_name,
            # 'startExecutionArn': start_exec_arn,
            "status": "CREATING",
        })
    return id


def delete_service_pipeline(id: str) -> str:
    """delete a service pipeline deployment"""
    logger.info("Delete Service Pipeline")

    resp = pipeline_table.get_item(Key={
        "id": id,
    })
    if "Item" not in resp:
        raise APIException("Pipeline Not Found")

    status = "INACTIVE"

    # stack_id = resp["Item"]["stackId"]

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

    input = {
        "id": id,
        "action": action,
        "args": args,
    }

    sfn.start_execution(
        name=f"{id}-{action}",
        stateMachineArn=stateMachineArn,
        input=json.dumps(input),
    )


def list_pipelines(page=1, count=20):
    logger.info(
        f"List Pipelines from DynamoDB in page {page} with {count} of records")
    response = pipeline_table.scan(
        FilterExpression=Attr("status").ne("INACTIVE"),
        ProjectionExpression=
        "id, createdDt, #type, #source,#parameters,target, #status",
        ExpressionAttributeNames={
            "#status": "status",
            "#source": "source",
            "#parameters": "parameters",
            "#type": "type",
        },
    )

    # Assume all items are returned in the scan request
    # TODO: might need use LastEvaluatedKey to continue scanning
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


def check_service_existing(type: str,
                           accountId=account_id,
                           region=default_region) -> bool:
    """Verify that Config already exists in the pipeline

    Args:
        type (string): the service type.
        accountId (string, optional): the account id of log source. Defaults to account_id.
        region (string, optional): the region of log source. Defaults to current region.

    Returns:
        bool: True means existing
    """
    if not accountId:
        accountId = account_id
    if not region:
        region = default_region
    conditions = Attr("status").ne("INACTIVE")
    conditions = conditions.__and__(Attr('type').eq(type))

    response = pipeline_table.scan(
        FilterExpression=conditions,
        ProjectionExpression="id, createdDt, #type, #parameters, #status",
        ExpressionAttributeNames={
            "#status": "status",
            "#parameters": "parameters",
            "#type": "type",
        },
    )
    items = response["Items"]
    total = len(items)

    if total > 0:
        acct_match = False
        region_match = False
        for item in items:
            #Compatible with old data judgment identifier, parameterKey in 1.0.X does not have logSourceAccountId
            for p in item["parameters"]:
                if p["parameterKey"] == "logSourceAccountId" and p[
                        "parameterValue"] == accountId:
                    acct_match = True
                if p["parameterKey"] == "logSourceRegion" and p[
                        "parameterValue"] == region:
                    region_match = True
            if acct_match and region_match:
                return True

    return False


def create_stack_name(id):
    # TODO: prefix might need to come from env
    return "LogHub-Pipe-" + id[:5]


class APIException(Exception):

    def __init__(self, message):
        self.message = message
