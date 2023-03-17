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

log_group_names = os.environ.get("LOGGROUP_NAMES").split(",")
kdsArn = os.environ.get("DESTINATION_ARN")
kdsName = os.environ.get("DESTINATION_NAME")

roleName = os.environ.get("ROLE_NAME")
roleArn = os.environ.get("ROLE_ARN")

stackName = os.environ["STACK_NAME"]

solution_version = os.environ.get("SOLUTION_VERSION", "v1.0.0")
solution_id = os.environ.get("SOLUTION_ID", "SO8025")
user_agent_config = {
    "user_agent_extra": f"AwsSolution/{solution_id}/{solution_version}"
}
default_config = config.Config(**user_agent_config)

default_region = os.environ.get("AWS_REGION")
sts = boto3.client("sts", config=default_config)
account_id = sts.get_caller_identity()["Account"]

log_source_account_id = os.environ.get("LOG_SOURCE_ACCOUNT_ID", account_id)

log_source_account_assume_role = os.environ.get("LOG_SOURCE_ACCOUNT_ASSUME_ROLE", "")


def lambda_handler(event, _):
    request_type = event["RequestType"]
    if request_type == "Create" or request_type == "Update":
        return on_create(event)
    if request_type == "Delete":
        return on_delete(event)
    raise Exception("Invalid request type: %s" % request_type)


def on_create(_):

    for log_group_name in log_group_names:
        logger.info("Log group name is %s" % log_group_name)
        # Create a subscription filter
        try:
            destination_name = f"{stackName}-{kdsName}"
            client = get_client("logs")
            if not exist_log_group(log_group_name):
                logger.info("Log Group %s doesn't exist!" % log_group_name)
                create_log_group(log_group_name) if log_group_name else None
            if log_source_account_assume_role:
                cwl = get_client("logs", is_local_session=True)
                resp = cwl.put_destination(
                    destinationName=destination_name,
                    targetArn=kdsArn,
                    roleArn=roleArn,
                )
                destinationArn = resp["destination"]["arn"]
                # setup cw put-destination-policy
                access_policy = {
                    "Version": "2012-10-17",
                    "Statement": [
                        {
                            "Sid": "",
                            "Effect": "Allow",
                            "Principal": {"AWS": log_source_account_id},
                            "Action": "logs:PutSubscriptionFilter",
                            "Resource": destinationArn,
                        }
                    ],
                }
                cwl.put_destination_policy(
                    destinationName=destination_name,
                    accessPolicy=json.dumps(access_policy),
                    forceUpdate=True,
                )
                logger.info(f"destinationArn is {destinationArn}")
                client.put_subscription_filter(
                    logGroupName=log_group_name,
                    filterName=destination_name,
                    filterPattern="",
                    destinationArn=destinationArn,
                )
            else:

                destinationArn = kdsArn
                client.put_subscription_filter(
                    logGroupName=log_group_name,
                    filterName=destination_name,
                    filterPattern="",
                    destinationArn=destinationArn,
                    roleArn=roleArn,
                )

        except Exception as err:
            logger.info("Create log group subscription filter failed, %s" % err)
            raise

    return {
        "statusCode": 200,
        "body": json.dumps("Create log group subscription filter success!"),
    }


def on_delete(_):
    # Create CloudWatchLogs client
    client = client = get_client("logs")

    for log_group_name in log_group_names:
        # Delete a subscription filter
        logger.info(
            "Subscription of log group %s is going to be deleted." % log_group_name
        )
        try:
            client.delete_subscription_filter(
                filterName=f"{stackName}-{kdsName}",
                logGroupName=log_group_name,
            )
        except Exception as err:
            logger.info("Delete log group subscription filter failed, %s" % err)

    return {
        "statusCode": 200,
        "body": json.dumps("Delete log group subscription filter success!"),
    }


def exist_log_group(log_group_name):
    client = get_client("logs")
    response = client.describe_log_groups(logGroupNamePrefix=log_group_name)
    return response["logGroups"] != []


def create_log_group(log_group_name):
    logger.info("Create Log Group: %s" % log_group_name)
    client = get_client("logs")
    try:
        client.create_log_group(logGroupName=log_group_name)
    except Exception as err:
        logger.info("Create log group %s failed, ", err)
        logger.error(err)
        raise
