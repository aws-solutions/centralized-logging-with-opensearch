# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import json
import logging
import os
import uuid
from datetime import datetime

from boto3.dynamodb.conditions import Attr

from commonlib import AWSConnection, handle_error, AppSyncRouter
from commonlib import DynamoDBUtil, LinkAccountHelper
from commonlib.model import PipelineMonitorStatus
from commonlib.exception import APIException, ErrorCode
from commonlib.utils import paginate, create_stack_name

logger = logging.getLogger()
logger.setLevel(logging.INFO)

conn = AWSConnection()
router = AppSyncRouter()

pipeline_table_name = os.environ.get("PIPELINE_TABLE")
ddb_util = DynamoDBUtil(pipeline_table_name)

stateMachineArn = os.environ.get("STATE_MACHINE_ARN")
sfn = conn.get_client("stepfunctions")

link_account_table_name = os.environ.get("SUB_ACCOUNT_LINK_TABLE_NAME")
account_helper = LinkAccountHelper(link_account_table_name)


@handle_error
def lambda_handler(event, _):
    return router.resolve(event)


@router.route(field_name="createServicePipeline")
def create_service_pipeline(**args):
    """Create a service pipeline deployment"""
    logger.info("Create Service Pipeline")

    pipeline_id = str(uuid.uuid4())

    stack_name = create_stack_name("SvcPipe", pipeline_id)
    service_type = args["type"]
    source = args["source"]
    target = args["target"]
    monitor = args.get("monitor") or {"status": PipelineMonitorStatus.ENABLED}
    destination_type = args["destinationType"]

    params = []
    account_id = args.get("logSourceAccountId") or account_helper.default_account_id
    region = args.get("logSourceRegion") or account_helper.default_region

    account = account_helper.get_link_account(account_id, region)
    log_source_account_assume_role = account.get("subAccountRoleArn", "")

    args["parameters"].append(
        {
            "parameterKey": "logSourceAccountId",
            "parameterValue": account_id,
        }
    )

    if destination_type != "KDS":
        args["parameters"].append(
            {
                "parameterKey": "logSourceRegion",
                "parameterValue": region,
            }
        )
    else:
        args["parameters"].append(
            {
                "parameterKey": "cloudFrontDistributionId",
                "parameterValue": source,
            }
        )

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

    # Start the pipeline flow
    exec_sfn_flow(pipeline_id, "START", sfn_args)

    item = {
        "id": pipeline_id,
        "type": service_type,
        "source": source,
        "target": target,
        "destinationType": destination_type,
        "parameters": args["parameters"],
        "tags": args.get("tags", []),
        "createdAt": datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
        "stackName": stack_name,
        "monitor": monitor,
        "status": "CREATING",
    }
    ddb_util.put_item(item)
    return pipeline_id


@router.route(field_name="getServicePipeline")
def get_service_pipeline(id: str):
    """Get a service pipeline detail"""

    item = ddb_util.get_item({"id": id})

    # Get the error log prefix
    error_log_prefix = get_error_export_info(item)
    item["monitor"]["errorLogPrefix"] = error_log_prefix

    return item


@router.route(field_name="deleteServicePipeline")
def delete_service_pipeline(id: str) -> str:
    """delete a service pipeline deployment"""
    logger.info("Delete Service Pipeline")

    item = ddb_util.get_item({"id": id})
    if not item:
        raise APIException(ErrorCode.ITEM_NOT_FOUND, "Pipeline is not found")

    if item.get("status") in ["INACTIVE", "DELETING"]:
        raise APIException(ErrorCode.INVALID_ITEM, "No pipeline to delete")

    status = "INACTIVE"

    if "stackId" in item and item["stackId"]:
        status = "DELETING"
        args = {"stackId": item["stackId"]}
        # Start the pipeline flow
        exec_sfn_flow(id, "STOP", args)

    update_status(id, status)
    return "OK"


def update_status(id: str, status: str):
    """Update pipeline status in pipeline table"""
    ddb_util.update_item({"id": id}, {"status": status})


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


@router.route(field_name="listServicePipelines")
def list_pipelines(page=1, count=20):
    logger.info(f"List Pipelines from DynamoDB in page {page} with {count} of records")

    items = ddb_util.list_items(filter_expression=Attr("status").ne("INACTIVE"))
    total, pipelines = paginate(items, page, count, sort_by="createdAt")
    return {
        "total": total,
        "pipelines": pipelines,
    }


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


def get_error_export_info(pipeline_item: dict):
    """Generate processor error log location."""
    log_type = pipeline_item.get("type")
    index_prefix = get_cfn_param(pipeline_item, "indexPrefix")
    return f"error/AWSLogs/{log_type}/index-prefix={index_prefix}/"


def get_cfn_param(item, param_description):
    """Get the task param from ddb"""
    for stack_param in item.get("parameters"):
        if stack_param.get("parameterKey") == param_description:
            return stack_param.get("parameterValue")
    return ""
