# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

from moto import mock_sqs
import os
import boto3
import json


@mock_sqs
def test_on_event():
    sqs = boto3.client("sqs", region_name=os.environ.get("AWS_REGION"))
    q = sqs.create_queue(
        QueueName=os.environ["QUEUE_NAME"],
        Attributes={
            "Policy": json.dumps(
                {
                    "Version": "2012-10-17",
                    "Id": "test",
                    "Statement": [{"Effect": "Allow", "Principal": "*", "Action": "*"}],
                }
            )
        },
    )
    res = sqs.get_queue_attributes(QueueUrl=q["QueueUrl"], AttributeNames=["QueueArn"])
    queue_arn = res["Attributes"]["QueueArn"]
    create_event = {
        "RequestType": "Create",
        "ResourceProperties": {
            "bucketArn": os.environ["S3_ARN"],
            "queueArn": queue_arn,
        },
    }
    import sqs_allow_s3_to_put_event

    sqs_allow_s3_to_put_event.on_event(create_event, None)

    delete_event = {
        "RequestType": "Delete",
        "ResourceProperties": {
            "bucketArn": os.environ["S3_ARN"],
            "queueArn": queue_arn,
        },
    }
    sqs_allow_s3_to_put_event.on_event(delete_event, None)
