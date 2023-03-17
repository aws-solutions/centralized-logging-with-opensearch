# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

from moto import mock_logs, mock_s3, settings, mock_sts
import pytest
import os
import boto3


@pytest.fixture
def s3_client():
    bucket_name = os.environ.get("LOG_BUCKET_NAME")
    with mock_s3():
        s3 = boto3.resource("s3", region_name="us-east-1")
        # Create the bucket
        s3.create_bucket(Bucket=bucket_name)
        yield


@mock_sts
def test_lambda_handler_on_create(s3_client):
    from log_source_s3_bucket_policy_processor import lambda_handler

    assert lambda_handler(
        {
            "RequestType": "Create",
        },
        None,
    )


@mock_sts
def test_lambda_handler_on_delete(s3_client):
    from log_source_s3_bucket_policy_processor import lambda_handler

    assert lambda_handler(
        {
            "RequestType": "Delete",
        },
        None,
    )
