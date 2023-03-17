# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import pytest
import os
import boto3
from .datafile import ddb_mock_data
from moto import mock_dynamodb, mock_s3, mock_ssm, mock_sts


@pytest.fixture
def ssm_client():
    with mock_ssm():
        region = os.environ.get("AWS_REGION")
        ssm = boto3.client("ssm", region_name=region)
        filepath = "./test/datafile/document_content.json"
        with open(filepath) as openFile:
            document_content = openFile.read()
            ssm.create_document(
                Content=document_content,
                Name=os.environ.get("SSM_LOG_CONFIG_DOCUMENT_NAME"),
                DocumentType="Automation",
                DocumentFormat="JSON",
            )


@pytest.fixture
def sts_client():
    with mock_sts():
        boto3.client("sts", region_name=os.environ.get("AWS_REGION"))
        yield


@pytest.fixture
def s3_client():
    with mock_s3():
        region = os.environ.get("AWS_REGION")

        s3 = boto3.resource("s3", region_name=region)
        # Create the buckets
        bucket_name = os.environ.get("CONFIG_FILE_S3_BUCKET_NAME")
        s3.create_bucket(Bucket=bucket_name)
        yield


class TestDistributeConfigHelper:
    def test_create_ingestion_parser(self, s3_client, sts_client):
        from ..util.distribute_config_helper.distribute_config_helper import DistributeConfigHelper

        bucket_name = os.environ.get("CONFIG_FILE_S3_BUCKET_NAME")

        distribute_helper = DistributeConfigHelper(bucket_name)

        # Test to save the content to /tmp as file
        content = "abc"
        file_name = "fluent-bid.conf"
        distribute_helper.fwrite(
            file_path='/tmp/log_config/' + 'test_id' + '/',
            file_name=file_name,
            content=content
        )

        # Test to distribute the file to s3
        distribute_helper.upload_folder_to_s3(
        input_dir='/tmp/log_config',
        s3_bucket_name=bucket_name,
        s3_path='app_log_config',
    )