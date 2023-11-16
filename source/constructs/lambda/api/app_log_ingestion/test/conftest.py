# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import io
import os
import zipfile

import boto3
import pytest

from collections.abc import Iterable


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
    return event
"""
    return _process_lambda(pfunc)


def make_graphql_lambda_event(name, args):
    return {"arguments": args, "info": {"fieldName": name}}


def init_ddb(config):
    """
    config = {
        "ddb_table_name": { "id": 123123, "name": "the-name" }
        "ddb_table_name2": [ { "id": 123123, "name": "the-name" }, { ... } ]
    }
    """
    ddb = boto3.resource("dynamodb")
    for table_name, value in config.items():
        table = ddb.create_table(
            TableName=table_name,
            KeySchema=[{"AttributeName": "id", "KeyType": "HASH"}],
            AttributeDefinitions=[{"AttributeName": "id", "AttributeType": "S"}],
            ProvisionedThroughput={"ReadCapacityUnits": 5, "WriteCapacityUnits": 5},
        )

        if isinstance(value, dict):
            table.put_item(Item=value)
        elif isinstance(value, Iterable):
            for v in value:
                table.put_item(Item=v)
        elif value is not None:
            table.put_item(Item=value)
        else:
            pass

    return ddb


@pytest.fixture(autouse=True)
def default_environment_variables():
    """Mocked AWS evivronment variables such as AWS credentials and region"""
    os.environ["AWS_ACCESS_KEY_ID"] = "mocked-aws-access-key-id"
    os.environ["AWS_SECRET_ACCESS_KEY"] = "mocked-aws-secret-access-key"
    os.environ["AWS_SESSION_TOKEN"] = "mocked-aws-session-token"
    os.environ["AWS_REGION"] = "us-east-1"
    os.environ["AWS_DEFAULT_REGION"] = "us-east-1"
    os.environ["STATE_MACHINE_ARN"] = "mocked-sfn-machine-arn"
    os.environ["SOLUTION_VERSION"] = "v2.0.0"
    os.environ["SSM_LOG_CONFIG_DOCUMENT_NAME"] = "v1.0.0"
    os.environ["CONFIG_FILE_S3_BUCKET_NAME"] = "mocked-s3-bucket-name"
    os.environ["INSTANCE_META_TABLE_NAME"] = "mocked-instance-meta-table-name"
    os.environ["INSTANCE_TABLE_NAME"] = "mocked-instance-table-name"
    os.environ["APP_PIPELINE_TABLE_NAME"] = "mocked-app-pipeline-table-name"
    os.environ["APP_LOG_CONFIG_TABLE_NAME"] = "mocked-app-log-config-table-name"
    os.environ["INSTANCE_GROUP_TABLE_NAME"] = "mocked-instance-group-table-name"
    os.environ["APP_LOG_INGESTION_TABLE_NAME"] = "mocked-app-log-ingestion-table-name"
    os.environ["EC2_LOG_SOURCE_TABLE_NAME"] = "mocked-ec2-log-source-table-name"
    os.environ["S3_LOG_SOURCE_TABLE_NAME"] = "mocked-s3-log-source-table-name"
    os.environ["LOG_SOURCE_TABLE_NAME"] = "mocked-log-source-table-name"
    os.environ["EKS_CLUSTER_SOURCE_TABLE_NAME"] = "mocked-eks-log-source-table-name"
    os.environ[
        "INSTANCE_INGESTION_DETAIL_TABLE_NAME"
    ] = "mocked-instance-ingestion-detail-table-name"
    os.environ[
        "INSTANCE_GROUP_MODIFICATION_EVENT_QUEUE_NAME"
    ] = "mocked-instance-modification-event-queue-name"
    os.environ["SQS_EVENT_TABLE"] = "mocked-sqs-event-table"
    os.environ["SUB_ACCOUNT_LINK_TABLE_NAME"] = "mocked-sub-account-link-table-name"
    os.environ["SUB_ACCOUNT_LINK_TABLE"] = "mocked-sub-account-link-table-name"
    os.environ[
        "DEFAULT_CMK_ARN"
    ] = "arn:aws:kms:us-east-1:123456789012:key/16ae67ab-0991-4ddb-a65b-1dd91cec52dd"

    os.environ["ECS_CLUSTER_NAME"] = "ECS_CLUSTER_NAME"
    os.environ["LOG_AGENT_VPC_ID"] = "LOG_AGENT_VPC_ID"
    os.environ["LOG_AGENT_SUBNETS_IDS"] = "LOG_AGENT_SUBNETS_IDS"
    os.environ[
        "CWL_MONITOR_ROLE_ARN"
    ] = "arn:aws:logs:us-east-1:123456789012:log-group:test:*"
    os.environ["EC2_IAM_INSTANCE_PROFILE_ARN"] = "EC2_IAM_INSTANCE_PROFILE_ARN"
    os.environ["FLB_S3_ADDR"] = "aws-gcr-solutions-assets.s3.amazonaws.com"
    os.environ["FLUENT_BIT_LOG_GROUP_NAME"] = "fluent-bit-log-group"
    os.environ[
        "FLUENT_BIT_CONF_UPLOADING_EVENT_QUEUE_ARN"
    ] = "arn:aws:sqs:us-east-1:123456789012:mocked-CentralizedLogging-CLFlbConfUploadingEventQueue"
