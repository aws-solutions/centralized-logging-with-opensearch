# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0


import json

import os

from commonlib.logging import get_logger
from boto3_client import get_client

logger = get_logger(__name__)

log_bucket_name = os.environ.get("LOG_BUCKET_NAME", "")
log_type = os.environ.get("LOG_TYPE")

def lambda_handler(event, _):
    request_type = event["RequestType"]
    if request_type == "Create" or request_type == "Update":
        return on_create()
    if request_type == "Delete":
        logger.info("Nothing to do")
        return {
            "statusCode": 200,
        }
    raise ValueError("Invalid request type: %s" % request_type)


def on_create():
    try:
        if log_type in ["RDS", "Lambda"]: #For Lambda and RDS service pipelines, the log bucket is in master account
            s3 = get_client("s3", is_local_session= True)
        else: 
            s3 = get_client("s3")
        
        history_config = s3.get_bucket_notification_configuration(
            Bucket=log_bucket_name,
        )

        logger.info(f"history notification config is {history_config}")

        resp = s3.put_bucket_notification_configuration(
            Bucket=log_bucket_name,
            NotificationConfiguration={
                "EventBridgeConfiguration": {},  # Enable event bridge notification
                "QueueConfigurations": history_config.get("QueueConfigurations", []),
                "TopicConfigurations": history_config.get("TopicConfigurations", []),
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
