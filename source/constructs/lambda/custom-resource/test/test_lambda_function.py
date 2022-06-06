# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import pytest
import os
import boto3
from moto import mock_s3


@pytest.fixture
def s3_client():

    with mock_s3():
        region = os.environ.get("AWS_REGION")

        s3 = boto3.resource("s3", region_name=region)
        # Create the buckets
        # for bucket_name in bucket_names:
        #     s3.create_bucket(Bucket=bucket_name)

        default_bucket = os.environ.get("WEB_BUCKET_NAME")
        s3.create_bucket(Bucket=default_bucket)
        yield


def test_lambda_function(s3_client):
    import lambda_function

    result = lambda_function.lambda_handler(None, None)
    # Expect Execute successfully.
    assert result == "OK"

    region = os.environ.get("AWS_REGION")
    s3 = boto3.resource("s3", region_name=region)
    default_bucket = os.environ.get("WEB_BUCKET_NAME")

    # Expect Config file is uploaded to S3
    obj = s3.Object(default_bucket, "aws-exports.json").get()
    assert "ContentLength" in obj
    assert obj["ContentLength"] > 0