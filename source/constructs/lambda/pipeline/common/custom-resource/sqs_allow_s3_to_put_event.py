# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import hashlib
import json
import boto3
import logging
import os

logging.getLogger().setLevel(logging.INFO)

sqs = boto3.client("sqs", region_name=os.environ["AWS_REGION"])


def on_event(event, _):
    logging.info("On event %s", event)

    request_type = event["RequestType"]
    if request_type == "Create" or request_type == "Update":
        return on_create(event)
    if request_type == "Delete":
        return on_delete(event)


def on_create(event):
    props = event["ResourceProperties"]
    bucket_arn = props["bucketArn"]
    queue_arn = props["queueArn"]

    # fmt: off
    queue_url = sqs.get_queue_url(QueueName=get_queue_name_by_arn(queue_arn))["QueueUrl"]
    response = sqs.get_queue_attributes(QueueUrl=queue_url, AttributeNames=["Policy"])
    # fmt: on

    sid = sha256(bucket_arn)
    policy = json.loads(response["Attributes"]["Policy"])

    is_already_exist = (
        len([stmt for stmt in policy["Statement"] if stmt.get("Sid") == sid]) > 0
    )

    if is_already_exist:
        logging.info("The statement already exists.")
    else:
        p = {
            "Sid": sid,
            "Effect": "Allow",
            "Principal": {"Service": "s3.amazonaws.com"},
            "Action": [
                "sqs:SendMessage",
                "sqs:GetQueueAttributes",
                "sqs:GetQueueUrl",
            ],
            "Resource": queue_arn,
            "Condition": {"ArnLike": {"aws:SourceArn": bucket_arn}},
        }

        logging.info(f"Inject policy: {p}")

        policy["Statement"].append(p)

        sqs.set_queue_attributes(
            QueueUrl=queue_url, Attributes={"Policy": json.dumps(policy)}
        )


def on_delete(event):
    props = event["ResourceProperties"]
    bucket_arn = props["bucketArn"]
    queue_arn = props["queueArn"]

    # fmt: off
    queue_url = sqs.get_queue_url(QueueName=get_queue_name_by_arn(queue_arn))["QueueUrl"]
    response = sqs.get_queue_attributes(QueueUrl=queue_url, AttributeNames=["Policy"])
    # fmt: on

    sid = sha256(bucket_arn)
    policy = json.loads(response["Attributes"]["Policy"])

    policy["Statement"] = [
        stmt for stmt in policy["Statement"] if stmt.get("Sid") != sid
    ]
    sqs.set_queue_attributes(
        QueueUrl=queue_url, Attributes={"Policy": json.dumps(policy)}
    )


def get_queue_name_by_arn(arn: str) -> str:
    return arn.split(":")[-1]


def get_partition_by_arn(arn: str) -> str:
    return arn.split(":")[1]


def sha256(s: str) -> str:
    return hashlib.sha256(s.encode("utf-8")).hexdigest()
