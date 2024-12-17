# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import os
import pytest


@pytest.fixture(autouse=True)
def default_environment_variables():
    """Mocked AWS evivronment variables such as AWS credentials and region"""
    os.environ["AWS_ACCESS_KEY_ID"] = "mocked-aws-access-key-id"
    os.environ["AWS_SECRET_ACCESS_KEY"] = "mocked-aws-secret-access-key"
    os.environ["AWS_SESSION_TOKEN"] = "mocked-aws-session-token"
    os.environ["AWS_REGION"] = "us-east-1"
    os.environ["AWS_DEFAULT_REGION"] = "us-east-1"
    os.environ["SOLUTION_VERSION"] = "v1.0.0"
    os.environ["SOLUTION_ID"] = "SO8025"

    os.environ["LOG_TYPE"] = "APP"

    os.environ["STACK_NAME"] = "test"
    os.environ["STACK_ID"] = "test"
    os.environ["DESTINATION_NAME"] = "test"
    os.environ["DESTINATION_ARN"] = "arn:aws:kinesis:us-east-1:123456789012:stream/test"
    os.environ["LOGGROUP_NAMES"] = "test-group"
    os.environ["LOG_SOURCE_ACCOUNT_ID"] = "1234567789012"
    os.environ["LOG_BUCKET_NAME"] = "test-bucket"
    os.environ["LOG_BUECKET_PREFIX"] = "test"

    os.environ["LOG_EVENT_QUEUE_ARN"] = "arn:aws:sqs:us-east-1:123456789012:test-queue"

    os.environ["S3_ARN"] = "arn:aws:s3:us-east-1:123456789012:mocked-s3"
    os.environ[
        "LOG_EVENT_QUEUE_URL"
    ] = "https://sqs.us-east-1.amazonaws.com/123456789012/test-queue"
    os.environ["LOG_EVENT_QUEUE_NAME"] = "test-queue"

    os.environ["ROLE_NAME"] = "test-role"
    os.environ["ROLE_ARN"] = "arn:aws:iam::123456789012:role/test-role"

    os.environ["QUEUE_NAME"] = "test-queue"
    os.environ["QUEUE_URL"] = "http://queue.amazonaws.com"
    os.environ["STATE_MACHINE_ARN"] = "arn:aws:states:us-east-1:123456789012:stateMachine:S3BufferosiPipelineFlowSM2351C82D-hqyPwW58xfvI"
