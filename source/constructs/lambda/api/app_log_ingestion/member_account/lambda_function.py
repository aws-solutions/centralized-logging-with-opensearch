# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import json
from commonlib.logging import get_logger
import os

from commonlib import AWSConnection


logger = get_logger(__name__)

conn = AWSConnection()

flb_conf_uploading_event_queue_arn = os.environ.get(
    "FLUENT_BIT_CONF_UPLOADING_EVENT_QUEUE_ARN"
)

sqs_cli = conn.get_client("sqs")


def lambda_handler(event, _):

    event_type = event["Records"][0]["eventName"]

    if event_type == "INSERT" or event_type == "MODIFY":
        sub_acct = event["Records"][0]["dynamodb"]["NewImage"]
        sts_role_arn = sub_acct["subAccountRoleArn"]["S"]
        sns_cli = conn.get_client("sns", sts_role_arn=sts_role_arn)

        # request subscribtion
        sub_acct_flb_conf_uploading_event_topic_arn = sub_acct[
            "subAccountFlbConfUploadingEventTopicArn"
        ]["S"]
        sub_response = sns_cli.subscribe(
            TopicArn=sub_acct_flb_conf_uploading_event_topic_arn,
            Protocol="sqs",
            Endpoint=flb_conf_uploading_event_queue_arn,
            ReturnSubscriptionArn=True,
        )
        logger.info(f"subscribe response is {sub_response}")
        subscription_arn = sub_response["SubscriptionArn"]
        logger.info(f"subscription_arn is {subscription_arn}")

    elif event_type == "REMOVE":
        logger.info("delete")
        sub_acct = event["Records"][0]["dynamodb"]["OldImage"]
        sts_role_arn = sub_acct["subAccountRoleArn"]["S"]
        sub_acct_flb_conf_uploading_event_topic_arn = sub_acct[
            "subAccountFlbConfUploadingEventTopicArn"
        ]["S"]

        sns_cli = conn.get_client("sns", sts_role_arn=sts_role_arn)
        subs_resp = sns_cli.list_subscriptions_by_topic(
            TopicArn=sub_acct_flb_conf_uploading_event_topic_arn
        )
        for sub in subs_resp["Subscriptions"]:
            if (
                sub["Protocol"] == "sqs"
                and sub["Endpoint"] == flb_conf_uploading_event_queue_arn
                and "Deleted" != sub["SubscriptionArn"]
            ):
                logger.info(f"SubscriptionArn is {sub['SubscriptionArn']}")
                response = sns_cli.unsubscribe(SubscriptionArn=sub["SubscriptionArn"])
                logger.info(f"response is {response}")
