# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import json
import logging
import os
import urllib.parse
import time
from typing import List
from botocore.exceptions import ClientError
from boto3.dynamodb.conditions import Attr
from commonlib import AWSConnection, AppSyncRouter, LinkAccountHelper
from commonlib.dao import (
    InstanceIngestionDetailDao,
)
from commonlib.model import InstanceIngestionDetail, StatusEnum


logger = logging.getLogger()
logger.setLevel(logging.INFO)

conn = AWSConnection()
router = AppSyncRouter()

solution_version = os.environ.get("SOLUTION_VERSION", "v1.0.0")
solution_id = os.environ.get("SOLUTION_ID", "SO8025")


instance_ingestion_detail_table_name = os.environ.get(
    "INSTANCE_INGESTION_DETAIL_TABLE_NAME"
)
instance_ingestion_detail_dao = InstanceIngestionDetailDao(
    table_name=instance_ingestion_detail_table_name
)

# link account
sub_account_link_table_name = os.environ.get("SUB_ACCOUNT_LINK_TABLE_NAME")
account_helper = LinkAccountHelper(sub_account_link_table_name)

# Get SSM resource
ssm_log_config_document_name = os.environ.get("SSM_LOG_CONFIG_DOCUMENT_NAME")


class SSMSendCommandStatus:
    def __init__(self, status, status_details):
        self._status = status
        self._status_details = status_details


def lambda_handler(event, _):
    # logger.info("Received event: " + json.dumps(event, indent=2))
    if is_s3_event(event):
        process_s3_event(event)
    elif is_sns_event(event):
        process_sns_event(event)
    else:
        logger.warning("Unsupported event")


def is_s3_event(event):
    return (
        "Records" in event
        and "body" in event["Records"][0]
        and "s3" in event["Records"][0]["body"]
    )


def process_s3_event(event: dict):
    keys = []

    for record in event["Records"]:
        body = record["body"]
        if isinstance(body, str):
            body = json.loads(body)

        if "Message" in body:
            body = json.loads(body["Message"])

        if body.get("Event") == "s3:TestEvent":
            continue

        if "s3" in body["Records"][0]:
            key = urllib.parse.unquote_plus(
                body["Records"][0]["s3"]["object"]["key"], encoding="utf-8"
            )
            logger.info("Fluent Bit Conf File: %s", key)
            instance_id = key.split("/")[1]

            upload_flb_config(instance_id)

    return keys


def is_sns_event(event):
    for record in event["Records"]:
        body = json.loads(record["body"])
        if "Type" not in body:
            continue
        notify_type = body["Type"]
        if notify_type in [
            "Notification",
            "SubscriptionConfirmation",
            "UnsubscribeConfirmation",
        ]:
            return True

    return False


def process_sns_event(event):
    for record in event["Records"]:
        body = json.loads(record["body"])
        event_type = body["Type"]

        if (
            event_type == "SubscriptionConfirmation"
            or event_type == "UnsubscribeConfirmation"
        ):
            handle_sns_event(body)


def process_notification(msg):
    s3_event = msg["Message"]
    process_s3_event(s3_event)


def handle_sns_event(subscribe_event: dict):
    """Confirm SNS subscription"""

    if subscribe_event["Type"] == "SubscriptionConfirmation":
        subscribe_url = subscribe_event["SubscribeURL"]
        logger.info(f"Confirming subscription {subscribe_url}")

        topic_arn = subscribe_event["TopicArn"]
        logger.info(f"Confirming topic_arn {topic_arn}")
        sns_account_id = topic_arn.split(":")[4]
        sns_region = topic_arn.split(":")[3]
        link_account = account_helper.get_link_account(sns_account_id, sns_region)
        sts_role_arn = link_account.get("subAccountRoleArn", "")

        sns_cli = conn.get_client("sns", sts_role_arn=sts_role_arn)

        logger.info(f"Confirming token {subscribe_event['Token']}")
        try:
            response = sns_cli.confirm_subscription(
                TopicArn=topic_arn,
                Token=subscribe_event["Token"],
            )
            logger.info(f"response is {response}")
        except ClientError as e:
            logger.error("Error: %s", e)
    elif subscribe_event["Type"] == "UnsubscribeConfirmation":
        logger.info(f"UnsubscribeConfirmation is {subscribe_event}")


def get_link_account(instance_ingestion_details: InstanceIngestionDetail):
    instance_ingestion_detail: InstanceIngestionDetail = instance_ingestion_details[0]
    link_account = account_helper.get_link_account(
        instance_ingestion_detail.accountId, instance_ingestion_detail.region
    )
    return link_account


def update_instance_ingestion_details_status(
    instance_ingestion_details: List[InstanceIngestionDetail],
    ssm_command_id: str,
    ssm_command_status: str,
    details: str,
    status: StatusEnum,
):
    for instance_ingestion_detail in instance_ingestion_details:
        instance_ingestion_detail.ssmCommandId = ssm_command_id
        instance_ingestion_detail.ssmCommandStatus = ssm_command_status
        instance_ingestion_detail.details = details
        instance_ingestion_detail.status = status

    instance_ingestion_detail_dao.batch_put_items(instance_ingestion_details)


def upload_flb_config(instance_id: str):
    instance_ingestion_details = (
        instance_ingestion_detail_dao.list_instance_ingestion_details(
            Attr("instanceId")
            .eq(instance_id)
            .__and__(Attr("status").eq(StatusEnum.DISTRIBUTING))
        )
    )
    if len(instance_ingestion_details) > 0:
        link_account = get_link_account(instance_ingestion_details)
        sts_role_arn = link_account.get("subAccountRoleArn", "")
        ssm_config_document_name = link_account.get(
            "agentConfDoc", ssm_log_config_document_name
        )
        if ssm_config_document_name == ssm_log_config_document_name:
            ssm = conn.get_client("ssm")
        else:
            ssm = conn.get_client(
                "ssm",
                region_name=link_account.get("region"),
                sts_role_arn=sts_role_arn,
            )

        send_ssm_command_to_instances(
            ssm, [instance_id], ssm_config_document_name, instance_ingestion_details
        )


def send_ssm_command_to_instances(
    ssm,
    instance_ids,
    ssm_config_document_name: str,
    instance_ingestion_details: List[InstanceIngestionDetail],
):
    for instance_id in instance_ids:
        ssm_command_id = ""
        command_status = ""
        command_status_detail = ""
        # send the run command to ec2
        invocation_response = ""
        try:
            ssm_response = ssm_send_command(ssm, instance_id, ssm_config_document_name)
            time.sleep(20)
            ssm_command_id = ssm_response["Command"]["CommandId"]
            invocation_response = ssm.list_command_invocations(
                CommandId=ssm_command_id, Details=True
            )
            logger.info(
                "Distribution triggered for instance: %s, command: %s",
                instance_id,
                ssm_command_id,
            )
        except Exception as e:
            logger.error("Error: %s", e)
            logger.info("Instance: %s might have been terminated.", instance_id)
        send_command_status = SSMSendCommandStatus(
            "",
            "",
        )
        if invocation_response != "":
            command_status = invocation_response.get("CommandInvocations")[0].get(
                "Status"
            )
            command_status_detail = invocation_response.get("CommandInvocations")[
                0
            ].get("StatusDetails")
            send_command_status = SSMSendCommandStatus(
                command_status,
                command_status_detail,
            )
            logger.info("send_command_status.status: %s", send_command_status._status)
            logger.info(
                "send_command_status.status_details: %s",
                send_command_status._status_details,
            )
        if send_command_status._status == "Failed":
            retry_failed_attach_policy_command(
                ssm, instance_id, ssm_config_document_name, instance_ingestion_details
            )
        else:
            update_instance_ingestion_details_status(
                instance_ingestion_details,
                ssm_command_id,
                command_status,
                command_status_detail,
                StatusEnum.ACTIVE,
            )


def retry_failed_attach_policy_command(
    ssm,
    instance_id,
    ssm_config_document_name: str,
    instance_ingestion_details: List[InstanceIngestionDetail],
):
    ssm_command_id = ""
    command_status = ""
    command_status_detail = ""
    status = StatusEnum.INACTIVE
    for i in range(10):
        invocation_response = ""
        logger.info(
            "Retry sending ssm command: %s, the %d time",
            ssm_config_document_name,
            i + 1,
        )
        try:
            ssm_response = retry_ssm_command(ssm, instance_id, ssm_config_document_name)
            time.sleep(2)
            ssm_command_id = ssm_response["Command"]["CommandId"]
            invocation_response = ssm.list_command_invocations(
                CommandId=ssm_command_id, Details=True
            )
        except Exception:
            logger.info("Instance: %s might have been terminated.", instance_id)
            continue
        if invocation_response != "":
            command_status = invocation_response.get("CommandInvocations")[0].get(
                "Status"
            )
            command_status_detail = invocation_response.get("CommandInvocations")[
                0
            ].get("StatusDetails")
            logger.info("Command status: %s", command_status)
            send_command_status = SSMSendCommandStatus(
                command_status,
                command_status_detail,
            )
        if send_command_status._status == "Success":
            status = StatusEnum.ACTIVE
            break
        logger.info(
            "Retry finished, the status is still %s", send_command_status._status
        )
    update_instance_ingestion_details_status(
        instance_ingestion_details,
        ssm_command_id,
        command_status,
        command_status_detail,
        status,
    )


def retry_ssm_command(ssm, instance_id, ssm_config_document_name: str):
    """Retry ssm command"""
    ssm_response = ""
    ssm_response = ssm_send_command(ssm, instance_id, ssm_config_document_name)
    return ssm_response


def ssm_send_command(ssm, instance_id, document_name: str) -> str:
    """
    Run the document in SSM to download the log config file in EC2
    :param instance_id:
    :return:
    """
    logger.info("Run SSM documentation on instance %s" % instance_id)
    response = ssm.send_command(
        InstanceIds=[instance_id],
        DocumentName=document_name,
        Parameters={"INSTANCEID": [instance_id]},
    )
    logger.info("Triggered log config downloading to EC2 successfully")
    return response
