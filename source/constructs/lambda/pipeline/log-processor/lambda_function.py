# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0
import os
import sys
from commonlib.logging import get_logger
from commonlib import AWSConnection
from event.event_parser import KDS, MSK, EventBridge, SQS
from idx.idx_svc import AosIdxService

from aws_lambda_powertools import Metrics


STACK_PREFIX = os.environ.get("STACK_PREFIX", "CL")

logger = get_logger(__name__)

log_type = os.environ.get("LOG_TYPE")
source = str(os.environ.get("SOURCE", "KDS"))
sub_category = str(os.environ.get("SUB_CATEGORY", ""))
write_idx_data = str(os.environ.get("WRITE_IDX_DATA", "True"))
idx_svc = AosIdxService()

default_region = os.environ.get("REGION")
conn = AWSConnection()
sqs_client = conn.get_client("sqs", default_region)

sqs_queue_url = str(os.environ.get("SQS_QUEUE_URL", ""))

plugins = os.environ.get("PLUGINS", "")

write_idx_data = str(os.environ.get("WRITE_IDX_DATA", "True"))

no_buffer_access_role_arn = str(os.environ.get("NO_BUFFER_ACCESS_ROLE_ARN", ""))

event_bridge_client = conn.get_client("events", default_region)

metrics = Metrics(namespace=f"Solution/{STACK_PREFIX}")


@metrics.log_metrics
def lambda_handler(event, _):  # NOSONAR
    try:
        idx_svc.init_idx_env()
        disable_event_bride_rule(event)
        if write_idx_data == str(True):
            func_name = "parse_" + source.lower() + "_event"
            getattr(sys.modules[__name__], func_name)(event)
            idx_svc.put_index_pattern()

    except Exception as e:
        if not (plugins or log_type in ("ELB", "CloudFront")) and "Records" in event:
            for event_record in event["Records"]:
                change_sqs_message_visibility(event_record)
        if "Records" in event and event["Records"]:
            record = event["Records"][0]
            if record["eventSource"] == "aws:sqs":
                handle_sqs_retries(record)
        else:
            raise e
    return "Ok"


def handle_sqs_retries(record):
    approximate_receive_count = int(
        record.get("attributes").get("ApproximateReceiveCount", "3")
    )
    if approximate_receive_count > 2:
        logger.info(f"record is {record}")
        logger.error(
            "Error: %s",
            "This message has exceeded the maximum number of retries, verify that you can connect to OpenSearch or that the data type does not match the field type defined for the index",
        )
    else:
        # NOSONAR
        raise Exception( # NOSONAR
            f"Error processing SQS message: {record}, Lambda function has been called {approximate_receive_count} times, the message will be re-consumed and then retried!"
        )


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
    kds.set_metrics(metrics)
    kds.process_event(event)


def parse_msk_event(event):
    # parse event which is from MSK
    msk: MSK = MSK(source)
    msk.set_metrics(metrics)
    msk.process_event(event)


def parse_event_bridge_event(event):
    # parse event which is from EventBridge
    evt = EventBridge(source)
    evt.set_metrics(metrics)
    evt.process_event(event)


def parse_sqs_event(event):
    # parse event which is from S3 bucket
    sqs: SQS = SQS(source)
    sqs.set_metrics(metrics)
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
