# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import json
import logging
import os

import boto3
from botocore import config

from log_source_helper import LogSourceHelper

logger = logging.getLogger()
logger.setLevel(logging.INFO)

solution_version = os.environ.get("SOLUTION_VERSION", "v1.0.0")
solution_id = os.environ.get("SOLUTION_ID", "SO8025")
user_agent_config = {
    "user_agent_extra": f"AwsSolution/{solution_id}/{solution_version}"
}
default_config = config.Config(**user_agent_config)

# Get DDB resource.
dynamodb = boto3.resource("dynamodb", config=default_config)
s3_log_source_table_name = os.environ.get("S3_LOG_SOURCE_TABLE_NAME")
log_source_table_name = os.environ.get("LOG_SOURCE_TABLE_NAME")

s3_log_source_table = dynamodb.Table(s3_log_source_table_name)
log_source_table = dynamodb.Table(log_source_table_name)

default_region = os.environ.get("AWS_REGION")


class APIException(Exception):
    def __init__(self, message):
        self.message = message


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
def lambda_handler(event, context):
    # logger.info("Received event: " + json.dumps(event, indent=2))

    action = event["info"]["fieldName"]
    args = event["arguments"]
    source_type = args["sourceType"]

    log_source_helper = LogSourceHelper(source_type, args, log_source_table)

    if action == "createLogSource":
        return log_source_helper.create_log_source()
    elif action == "deleteLogSource":
        return log_source_helper.delete_log_source()
    elif action == "listLogSources":
        return log_source_helper.list_log_sources()
    elif action == "updateLogSource":
        return log_source_helper.update_log_source()
    elif action == "getLogSource":
        return log_source_helper.get_log_source()
    elif action == "checkCustomPort":
        return log_source_helper.check_custom_port()
    else:
        logger.info("Event received: " + json.dumps(event, indent=2))
        raise RuntimeError(f"Unknown action {action}")
