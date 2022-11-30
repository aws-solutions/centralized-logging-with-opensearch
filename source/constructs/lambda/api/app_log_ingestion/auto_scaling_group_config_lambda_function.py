# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import json
import logging
import os
import boto3

from botocore import config

from util.asg_deployment_configuration import ASGDeploymentConfigurationMng
from util.exception import APIException

logger = logging.getLogger()
logger.setLevel(logging.INFO)

solution_version = os.environ.get("SOLUTION_VERSION", "v1.0.0")
solution_id = os.environ.get("SOLUTION_ID", "SO8025")
user_agent_config = {
    "user_agent_extra": f"AwsSolution/{solution_id}/{solution_version}"
}
default_config = config.Config(**user_agent_config)
default_region = os.environ.get("AWS_REGION")
dynamodb = boto3.resource("dynamodb", config=default_config)
log_source_table = dynamodb.Table(os.environ.get("LOG_SOURCE_TABLE_NAME"))
instance_group_table = dynamodb.Table(
    os.environ.get("INSTANCE_GROUP_TABLE_NAME"))


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
                "Unknown exception, please check Lambda log for more details")

    return wrapper


@handle_error
def lambda_handler(event, context):
    # logger.info("Received event: " + json.dumps(event, indent=2))

    action = event["info"]["fieldName"]
    args = event["arguments"]

    auto_scaling_group_name = get_asg_group_name(args["groupId"])

    deploy_config_mng = ASGDeploymentConfigurationMng(
        instance_group_id=args["groupId"], asg_name=auto_scaling_group_name)

    if action == "getAutoScalingGroupConf":
        return deploy_config_mng.get_configuration()
    else:
        logger.info("Event received: " + json.dumps(event, indent=2))
        raise APIException(f"Unknown action {action}")


def get_asg_group_name(groupId):
    instance_group_resp = instance_group_table.get_item(Key={"id": groupId})
    if "Item" not in instance_group_resp:
        raise APIException("Instance Group Not Found")

    item = instance_group_resp["Item"]
    asg_group_name = list(item["instanceSet"])[0]

    return asg_group_name
