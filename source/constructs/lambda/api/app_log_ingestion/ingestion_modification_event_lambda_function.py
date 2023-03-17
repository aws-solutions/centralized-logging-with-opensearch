# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import json
import logging
import os

import boto3
from botocore import config
from util.exception import APIException
from util.ec2_log_ingestion_svc import EC2LogIngestionSvc

logger = logging.getLogger()
logger.setLevel(logging.INFO)
solution_version = os.environ.get("SOLUTION_VERSION", "v1.0.0")
solution_id = os.environ.get("SOLUTION_ID", "SO8025")
user_agent_config = {
    "user_agent_extra": f"AwsSolution/{solution_id}/{solution_version}"
}
default_config = config.Config(**user_agent_config)
awslambda = boto3.client("lambda", config=default_config)
dynamodb = boto3.resource("dynamodb", config=default_config)
sqs = boto3.resource("sqs", config=default_config)
app_log_ingestion_lambda_arn = os.environ.get("APP_LOG_INGESTION_LAMBDA_ARN")
instance_group_modification_event_queue_name = os.environ.get(
    "INSTANCE_GROUP_MODIFICATION_EVENT_QUEUE_NAME"
)
sqs_event_table_name = os.environ.get("SQS_EVENT_TABLE")
sqs_event_table = dynamodb.Table(sqs_event_table_name)

sts = boto3.client("sts", config=default_config)
account_id = sts.get_caller_identity()["Account"]

iam = boto3.client("iam", config=default_config)
iam_res = boto3.resource("iam", config=default_config)


def handle_error(func):
    """Decorator for exception handling"""

    def wrapper(*args, **kwargs):
        try:
            return func(*args, **kwargs)
        except APIException as e:
            logger.error(e, exc_info=True)
            raise e
        except Exception as e:
            logger.error(e, exc_info=True)
            raise RuntimeError(
                "Unknown exception, please check Lambda log for more details"
            )

    return wrapper


@handle_error
def lambda_handler(event, context):
    # logger.info("Received event: " + json.dumps(event, indent=2))
    message = event["Records"][0]
    message_body = json.loads(message["body"])
    action = message_body["info"]["fieldName"]

    if action == "asyncAddInstancesToInstanceGroup":
        return async_add_instances_to_instance_group(message)
    elif action == "asyncDeleteInstancesFromInstanceGroup":
        return async_delete_instances_from_instance_group(message)
    else:
        logger.info("Event received: " + json.dumps(event, indent=2))
        raise RuntimeError(f"Unknown action {action}")


def async_add_instances_to_instance_group(message):
    message_id = message["messageId"]
    message_body = json.loads(message["body"])
    group_id = message_body["arguments"]["groupId"]
    instance_set = set(message_body["arguments"]["instanceSet"])
    if EC2LogIngestionSvc.does_event_already_exist(message_id):
        raise RuntimeError("Duplicate sqs event received in modification event lambda.")
    else:
        EC2LogIngestionSvc.create_sqs_event_record(message)
        EC2LogIngestionSvc.apply_app_log_ingestion_for_new_added_instances(
            EC2LogIngestionSvc.get_current_ingestion_relationship_from_instance_meta(
                group_id
            ),
            group_id,
            instance_set,
        )
        EC2LogIngestionSvc.update_sqs_event_record(message_id, "DONE")


def async_delete_instances_from_instance_group(message):
    message_id = message["messageId"]
    message_body = json.loads(message["body"])
    group_id = message_body["arguments"]["groupId"]
    instance_set = set(message_body["arguments"]["instanceSet"])
    if EC2LogIngestionSvc.does_event_already_exist(message_id):
        raise RuntimeError("Duplicate sqs event received in modification event lambda.")
    else:
        EC2LogIngestionSvc.create_sqs_event_record(message)
        EC2LogIngestionSvc.remove_app_log_ingestion_from_new_removed_instances(
            group_id, instance_set
        )
        EC2LogIngestionSvc.update_sqs_event_record(message_id, "DONE")
