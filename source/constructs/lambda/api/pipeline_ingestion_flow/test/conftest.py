# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import os
import io
import pytest
import zipfile

def _process_lambda(func_str):
    zip_output = io.BytesIO()
    zip_file = zipfile.ZipFile(zip_output, "w", zipfile.ZIP_DEFLATED)
    zip_file.writestr("lambda_function.py", func_str)
    zip_file.close()
    zip_output.seek(0)
    return zip_output.read()

def get_test_zip_file1():
    pfunc = """
        def lambda_handler(event, context):
            print("custom log event")
            return "Ok"
        """
    return _process_lambda(pfunc)

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
    os.environ["PIPELINE_TABLE"] = "Solution-AppPipelineTable-xxx"
    os.environ["INGESTION_TABLE"] = "Solution-AppIngestionTable-xxx"
    os.environ["LOG_SOURCE_TABLE"] = "Solution-LogSourceTable-xxx"
    os.environ["PIPELINE_TABLE_NAME"] = "Solution-AppPipelineTable-xxx"
    os.environ["OSI_PIPELINE_NAME"] = "cl-osi-pipeline-xxx"
    os.environ["LOG_SOURCE_REGION"] = "us-east-1"
    os.environ["LOG_SOURCE_ACCOUNT_ASSUME_ROLE"] = "log-source-account-assume-role"
    os.environ["LOG_PROCESSOR_GROUP_NAME"] = "log-processor-group-name"
    os.environ["LOG_PROCESSOR_NAME"] = "CL-logProcessorFn-ef8PiCbL9ixp"
    os.environ["MAX_CAPACITY"] = "4"
    os.environ["MIN_CAPACITY"] = "1"
    os.environ["SQS_QUEUE_URL"] = "https://sqs.amzon.aws.com"
    os.environ["OSI_PROCESSOR_ROLE_NAME"] = "osi-processor-role-name"
    os.environ["AOS_ENDPOINT"] = "vpc-endpoint.aws.com"
    os.environ["AOS_INDEX"] = "aos-prefix"
    os.environ["LOG_TYPE"] = "CloudTrail"