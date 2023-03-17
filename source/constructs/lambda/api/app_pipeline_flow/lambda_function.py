# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0
import os
import json
import logging

import boto3
from botocore import config

logger = logging.getLogger()
logger.setLevel(logging.INFO)

solution_version = os.environ.get("SOLUTION_VERSION", "v1.0.0")
solution_id = os.environ.get("SOLUTION_ID", "SO8025")
user_agent_config = {
    "user_agent_extra": f"AwsSolution/{solution_id}/{solution_version}"
}
default_config = config.Config(**user_agent_config)

default_region = os.environ.get("AWS_REGION")

dynamodb = boto3.resource("dynamodb", config=default_config, region_name=default_region)
pipeline_table_name = os.environ.get("PIPELINE_TABLE")

pipeline_table = dynamodb.Table(pipeline_table_name)


def lambda_handler(event, _):
    # logger.info("Received event: " + json.dumps(event, indent=2))
    """
    It's expected that the event (input) must be in a format of
    {
        'action':  START | STOP | QUERY,
        'args': {
            ...
        }

    }
    """
    # logger.info(pipeline_table_name)
    try:
        result = event["result"]
        pipeline_id = event["id"]

        resp = pipeline_table.get_item(
            Key={
                "id": pipeline_id,
            }
        )
        print(resp)
        if "Item" not in resp:

            raise RuntimeError("Pipeline Not Found")

        update_status(pipeline_id, result)

    except Exception as e:
        logger.error(e)
        logger.error("Invalid Request received: " + json.dumps(event, indent=2))
        raise RuntimeError("Unable to update app pipeline")

    return "OK"


def update_status(pipeline_id: str, result):

    logger.info("Update Pipeline Status in DynamoDB")
    stack_status = result["stackStatus"]
    stack_id = result["stackId"]
    error = result["error"]
    outputs = result["outputs"]

    helper_arn = ""
    buffer_resource_arn, buffer_resource_name = "", ""
    buffer_access_role_arn, buffer_access_role_name = "", ""

    for output in outputs:
        if output["OutputKey"] == "OSInitHelperFn":
            helper_arn = output["OutputValue"]
        elif output["OutputKey"] == "BufferResourceArn":
            buffer_resource_arn = output["OutputValue"]
        elif output["OutputKey"] == "BufferResourceName":
            buffer_resource_name = output["OutputValue"]
        elif output["OutputKey"] == "BufferAccessRoleArn":
            buffer_access_role_arn = output["OutputValue"]
        elif output["OutputKey"] == "BufferAccessRoleName":
            buffer_access_role_name = output["OutputValue"]

    if stack_status == "CREATE_COMPLETE":
        status = "ACTIVE"
    elif stack_status == "DELETE_COMPLETE":
        status = "INACTIVE"
    else:
        status = "ERROR"

    update_expr = (
        "SET #status = :s, stackId = :sid, #error = :err, osHelperFnArn = :helper"
        ", bufferResourceArn = :bufferArn, bufferResourceName = :bufferName"
        ", bufferAccessRoleArn = :roleArn, bufferAccessRoleName = :roleName"
    )

    pipeline_table.update_item(
        Key={"id": pipeline_id},
        UpdateExpression=update_expr,
        ExpressionAttributeNames={
            "#status": "status",
            "#error": "error",
        },
        ExpressionAttributeValues={
            ":s": status,
            ":sid": stack_id,
            ":err": error,
            ":helper": helper_arn,
            ":bufferArn": buffer_resource_arn,
            ":bufferName": buffer_resource_name,
            ":roleArn": buffer_access_role_arn,
            ":roleName": buffer_access_role_name,
        },
    )
