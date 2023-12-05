# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0
import os
import sys
import logging
import boto3
from event.event_parser import KDS, MSK, WAFSampled, SQS
from idx.idx_svc import AosIdxService


logger = logging.getLogger()
logger.setLevel(logging.INFO)

log_type = os.environ.get("LOG_TYPE")
source = str(os.environ.get("SOURCE", "KDS"))
sub_category = str(os.environ.get("SUB_CATEGORY", ""))
write_idx_data = str(os.environ.get("WRITE_IDX_DATA", "True"))
idx_svc = AosIdxService()

sqs_client = boto3.client("sqs")
sqs_queue_url = str(os.environ.get("SQS_QUEUE_URL", ""))

plugins = os.environ.get("PLUGINS", "")

write_idx_data = str(os.environ.get("WRITE_IDX_DATA", "True"))

no_buffer_access_role_arn = str(os.environ.get("NO_BUFFER_ACCESS_ROLE_ARN", ""))

event_bridge_client = boto3.client("events")


def lambda_handler(event, _):
    try:
        idx_svc.init_idx_env()
        disable_event_bride_rule(event)
        if write_idx_data == str(True):
            func_name = "parse_" + source.lower() + "_event"
            getattr(sys.modules[__name__], func_name)(event)

    except Exception as e:
        if not (plugins or log_type in ("ELB", "CloudFront")) and "Records" in event:
            for event_record in event["Records"]:
                change_sqs_message_visibility(event_record)
        raise e
    return "Ok"


def change_sqs_message_visibility(event_record):
    if (
        "receiptHandle" in event_record
        and event_record.get("eventSource", "") == "aws:sqs"
    ):
        receipt_handle = event_record["receiptHandle"]
        # Change visibility timeout of message from queue(300 seconds)
        if sqs_queue_url:
            sqs_client.change_message_visibility(
                QueueUrl=sqs_queue_url,
                ReceiptHandle=receipt_handle,
                VisibilityTimeout=300,
            )


def parse_kds_event(event):
    kds: KDS = KDS(source)
    kds.process_event(event)


def parse_msk_event(event):
    # parse event which is from MSK
    msk: MSK = MSK(source)
    msk.process_event(event)


def parse_event_bridge_event(event):
    # parse event which is from EventBridge
    if log_type in ("WAFSampled"):
        waf_sampled: WAFSampled = WAFSampled()
        waf_sampled.process_event(event)


def parse_sqs_event(event):
    # parse event which is from S3 bucket
    sqs: SQS = SQS(source)
    sqs.process_event(event)


def disable_event_bride_rule(event):
    if (
        "detail-type" in event
        and event.get("detail-type") == "Scheduled Event"
        and write_idx_data != str(True)
    ):
        rule_arn: str = event.get("resources")[0]
        rule_name = rule_arn.split(":")[-1].replace("rule/", "", 1)
        logger.info(f"rule_name is {rule_name}")
        response = event_bridge_client.disable_rule(Name=rule_name)
        logger.info("delete rule response is %s", response)
