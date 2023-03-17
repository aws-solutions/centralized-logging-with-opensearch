# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0


import json
import boto3
import os
from botocore import config
import logging
from boto3_client import get_client

logger = logging.getLogger()
logger.setLevel(logging.INFO)

stack_id = os.environ["STACK_ID"]
stack_name = os.environ["STACK_NAME"]

solution_version = os.environ.get("SOLUTION_VERSION", "v1.0.0")
solution_id = os.environ.get("SOLUTION_ID", "SO8025")
user_agent_config = {
    "user_agent_extra": f"AwsSolution/{solution_id}/{solution_version}"
}
default_config = config.Config(**user_agent_config)

default_region = os.environ.get("AWS_REGION")
sts = boto3.client("sts", config=default_config)
account_id = sts.get_caller_identity()["Account"]

log_source_account_id = (
    os.environ.get("LOG_SOURCE_ACCOUNT_ID", account_id) or account_id
)
log_source_region = (
    os.environ.get("LOG_SOURCE_REGION", default_region) or default_region
)
log_source_account_assume_role = os.environ.get("LOG_SOURCE_ACCOUNT_ASSUME_ROLE", "")
log_bucket_name = os.environ.get("LOG_BUCKET_NAME", "")

log_event_queue_url = os.environ.get("LOG_EVENT_QUEUE_URL", "")
log_event_queue_name = os.environ.get("LOG_EVENT_QUEUE_NAME", "")
log_event_queue_arn = os.environ.get("LOG_EVENT_QUEUE_ARN", "")
log_buecket_prefix = os.environ.get("LOG_BUECKET_PREFIX", "")

log_type = os.environ.get("LOG_TYPE")
notification_id = f"{stack_name}-{log_event_queue_name}"


def lambda_handler(event, context):

    request_type = event["RequestType"]
    if request_type == "Create" or request_type == "Update":
        return on_create()
    if request_type == "Delete":
        return on_delete()
    raise Exception("Invalid request type: %s" % request_type)


def on_create():
    if (
        account_id != log_source_account_id
        and log_source_account_id
        and log_type not in ["RDS", "Lambda"]
    ):
        try:
            s3 = get_client("s3")
            history_config = s3.get_bucket_notification_configuration(
                Bucket=log_bucket_name,
            )
            logger.info(f"history notification config is {history_config}")

            queue_configurations = history_config.get("QueueConfigurations", [])
            queue_configurations.append(
                {
                    "Id": notification_id,
                    "QueueArn": log_event_queue_arn,
                    "Events": ["s3:ObjectCreated:*"],
                    "Filter": {
                        "Key": {
                            "FilterRules": [
                                {"Name": "prefix", "Value": log_buecket_prefix}
                            ]
                        }
                    },
                }
            )
            resp = s3.put_bucket_notification_configuration(
                Bucket=log_bucket_name,
                ExpectedBucketOwner=log_source_account_id,
                NotificationConfiguration={
                    "QueueConfigurations": queue_configurations,
                    "TopicConfigurations": history_config.get(
                        "TopicConfigurations", []
                    ),
                    "LambdaFunctionConfigurations": history_config.get(
                        "LambdaFunctionConfigurations", []
                    ),
                },
            )
            logger.info(f"put_bucket_notification_configuration resp is {resp}")
        except Exception as err:
            print("Create log source s3 bucket notification failed, %s" % err)
            raise

    return {
        "statusCode": 200,
        "body": json.dumps("Create log source s3 bucket notification success!"),
    }


def on_delete():
    if (
        account_id != log_source_account_id
        and log_source_account_id
        and log_type not in ["RDS", "Lambda"]
    ):
        try:
            s3 = get_client("s3")
            history_config = s3.get_bucket_notification_configuration(
                Bucket=log_bucket_name,
            )
            logger.info(f"history notification config is {history_config}")
            queue_configurations = history_config.get("QueueConfigurations", [])
            deleted_queue_configurations = [
                x for x in queue_configurations if x["Id"] != notification_id
            ]

            resp = s3.put_bucket_notification_configuration(
                Bucket=log_bucket_name,
                ExpectedBucketOwner=log_source_account_id,
                NotificationConfiguration={
                    "QueueConfigurations": deleted_queue_configurations,
                    "TopicConfigurations": history_config.get(
                        "TopicConfigurations", []
                    ),
                    "LambdaFunctionConfigurations": history_config.get(
                        "LambdaFunctionConfigurations", []
                    ),
                },
            )
            logger.info(f"put_bucket_notification_configuration resp is {resp}")
        except Exception as err:
            print("Delete log source s3 bucket notification failed, %s" % err)
            raise

    return {
        "statusCode": 200,
        "body": json.dumps("Delete log source s3 bucket notification success!"),
    }
