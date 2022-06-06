# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import os
import io
import zipfile

import boto3
import pytest
from moto import mock_s3, mock_lambda, mock_iam, mock_dynamodb, mock_stepfunctions
from .datafile import ddb_mock_data
from botocore.exceptions import ClientError


@pytest.fixture
def lambda_client():
    with mock_lambda():
        region = os.environ.get("AWS_REGION")
        client = boto3.client("lambda", region_name=region)
        # Create mock_async_s3_child_lambda
        response = client.create_function(
            FunctionName="mock_async_s3_child_lambda",
            Runtime="python3.8",
            Role=get_role_name(),
            Handler="lambda_function.lambda_handler",
            Code={
                "ZipFile": get_test_zip_file(),
            },
            Description="test lambda function",
            Timeout=3,
            MemorySize=128,
            Publish=True,
        )
        os.environ["ASYNC_S3_CHILD_LAMBDA_ARN"] = response["FunctionArn"]

        # Create mock_async_ec2_child_lambda
        response = client.create_function(
            FunctionName="mock_async_ec2_child_lambda",
            Runtime="python3.8",
            Role=get_role_name(),
            Handler="lambda_function.lambda_handler",
            Code={
                "ZipFile": get_test_zip_file(),
            },
            Description="test lambda function",
            Timeout=3,
            MemorySize=128,
            Publish=True,
        )
        os.environ["ASYNC_EC2_CHILD_LAMBDA_ARN"] = response["FunctionArn"]

        # Create mock_async_ec2_child_lambda
        response = client.create_function(
            FunctionName="os_helper_fn",
            Runtime="python3.8",
            Role=get_role_name(),
            Handler="lambda_function.lambda_handler",
            Code={
                "ZipFile": get_test_zip_file(),
            },
            Description="test lambda function",
            Timeout=3,
            MemorySize=128,
            Publish=True,
        )
        os.environ["OS_HELPER_FN_ARN"] = response["FunctionArn"]
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


def get_test_zip_file():
    pfunc = """
    import json
    def lambda_handler(event, context):
        resp = {"value":"input_str"}
        return json.dumps(resp)
    """
    zip_output = io.BytesIO()
    zip_file = zipfile.ZipFile(zip_output, "w", zipfile.ZIP_DEFLATED)
    zip_file.writestr("lambda_function.py", pfunc)
    zip_file.close()
    zip_output.seek(0)
    return zip_output.read()


def get_role_name():
    with mock_iam():
        region = os.environ.get("AWS_REGION")
        iam = boto3.client("iam", region_name=region)
        try:
            return iam.get_role(RoleName="my-role")["Role"]["Arn"]

        except ClientError:
            return iam.create_role(
                RoleName="my-role",
                AssumeRolePolicyDocument="some policy",
                Path="/my-path/",
            )["Role"]["Arn"]


@pytest.fixture
def ddb_client():
    with mock_dynamodb():
        region = os.environ.get("AWS_REGION")
        ddb = boto3.resource("dynamodb", region_name=region)
        # Mock App Pipeline Table
        app_pipeline_table_name = os.environ.get("APP_PIPELINE_TABLE_NAME")
        app_pipeline_table = ddb.create_table(
            TableName=app_pipeline_table_name,
            KeySchema=[{"AttributeName": "id", "KeyType": "HASH"}],
            AttributeDefinitions=[{"AttributeName": "id", "AttributeType": "S"}],
            ProvisionedThroughput={"ReadCapacityUnits": 10, "WriteCapacityUnits": 10},
        )
        data_list = [
            ddb_mock_data.s3_source_pipeline_data,
            ddb_mock_data.ec2_source_pipeline_data,
        ]
        with app_pipeline_table.batch_writer() as batch:
            for data in data_list:
                batch.put_item(Item=data)

        # Mock App Log Source Table
        s3_log_source_table_name = os.environ.get("S3_LOG_SOURCE_TABLE_NAME")
        s3_log_source_table = ddb.create_table(
            TableName=s3_log_source_table_name,
            KeySchema=[{"AttributeName": "id", "KeyType": "HASH"}],
            AttributeDefinitions=[{"AttributeName": "id", "AttributeType": "S"}],
            ProvisionedThroughput={"ReadCapacityUnits": 10, "WriteCapacityUnits": 10},
        )
        data_list = [ddb_mock_data.s3_source_data_1]
        with s3_log_source_table.batch_writer() as batch:
            for data in data_list:
                batch.put_item(Item=data)

        # Mock App Log Configuration Table
        app_log_config_table_name = os.environ.get("APP_LOG_CONFIG_TABLE_NAME")
        app_log_config_table = ddb.create_table(
            TableName=app_log_config_table_name,
            KeySchema=[{"AttributeName": "id", "KeyType": "HASH"}],
            AttributeDefinitions=[{"AttributeName": "id", "AttributeType": "S"}],
            ProvisionedThroughput={"ReadCapacityUnits": 10, "WriteCapacityUnits": 10},
        )
        data_list = [ddb_mock_data.json_config_1, ddb_mock_data.regex_config_1]
        with app_log_config_table.batch_writer() as batch:
            for data in data_list:
                batch.put_item(Item=data)

        # Mock App Log Instance Meta Table
        instance_meta_table_name = os.environ.get("INSTANCE_META_TABLE_NAME")
        ddb.create_table(
            TableName=instance_meta_table_name,
            KeySchema=[{"AttributeName": "id", "KeyType": "HASH"}],
            AttributeDefinitions=[
                {"AttributeName": "id", "AttributeType": "S"},
                {"AttributeName": "instanceId", "AttributeType": "S"},
            ],
            ProvisionedThroughput={"ReadCapacityUnits": 10, "WriteCapacityUnits": 10},
            GlobalSecondaryIndexes=[
                {
                    "IndexName": "instanceId-index",
                    "KeySchema": [
                        {"AttributeName": "instanceId", "KeyType": "HASH"},
                    ],
                    "Projection": {
                        "ProjectionType": "ALL",
                    },
                    "ProvisionedThroughput": {
                        "ReadCapacityUnits": 1,
                        "WriteCapacityUnits": 1,
                    },
                },
            ],
        )

        # Mock App Log Instance Group Table
        # Here we use ddb client instead of ddb resource, because we need put Set to ddb.
        _ddb_client = boto3.client("dynamodb")
        instance_group_table_name = os.environ.get("INSTANCE_GROUP_TABLE_NAME")
        _ddb_client.create_table(
            TableName=instance_group_table_name,
            KeySchema=[{"AttributeName": "id", "KeyType": "HASH"}],
            AttributeDefinitions=[{"AttributeName": "id", "AttributeType": "S"}],
            ProvisionedThroughput={"ReadCapacityUnits": 10, "WriteCapacityUnits": 10},
        )
        data_list = [ddb_mock_data.instance_group_1, ddb_mock_data.instance_group_2]
        for data in data_list:
            _ddb_client.put_item(TableName=instance_group_table_name, Item=data)

        # Mock App Log Ingestion Table
        app_log_ingestion_table_name = os.environ.get("APPLOGINGESTION_TABLE")
        app_log_ingestion_table = ddb.create_table(
            TableName=app_log_ingestion_table_name,
            KeySchema=[{"AttributeName": "id", "KeyType": "HASH"}],
            AttributeDefinitions=[{"AttributeName": "id", "AttributeType": "S"}],
            ProvisionedThroughput={
                "ReadCapacityUnits": 10,
                "WriteCapacityUnits": 10,
            },
        )
        data_list = [
            ddb_mock_data.log_ingestion_data_1,
            # ddb_mock_data.log_ingestion_data_2,
            ddb_mock_data.log_ingestion_data_3,
            ddb_mock_data.log_ingestion_data_4,
        ]
        with app_log_ingestion_table.batch_writer() as batch:
            for data in data_list:
                batch.put_item(Item=data)
        yield


simple_definition = """
{
  "Comment": "A Hello World example of the Amazon States Language using Pass states",
  "StartAt": "Hello",
  "States": {
    "Hello": {
      "Type": "Pass",
      "Result": "World",
      "End": true
    }
  }
}
"""


@pytest.fixture
def sfn_client():
    with mock_stepfunctions():
        region = os.environ.get("AWS_REGION")
        sfn = boto3.client("stepfunctions", region_name=region)
        name = "LogHubAPIPipelineFlowSM"
        response = sfn.create_state_machine(
            name=name,
            definition=str(simple_definition),
            roleArn="arn:aws:iam::123456789012:role/test",
        )
        state_machine_arn = response["stateMachineArn"]
        os.environ["STATE_MACHINE_ARN"] = state_machine_arn

        yield


def test_lambda_handler(
    lambda_client,
    ddb_client,
    sfn_client,
    s3_client,
):
    # Can only import here, as the environment variables need to be set first.
    import s3_as_source_lambda_function

    # Test the create ingestion api
    s3_as_source_lambda_function.lambda_handler(
        {
            "confId": "e4c579eb-fcf2-4ddb-8226-796f4bc8a690",
            "sourceIds": ["9681daea-1095-44b5-8e11-40fa935f3aea"],
            "sourceType": "S3",
            "stackId": "",
            "stackName": "",
            "appPipelineId": "ab740668-fba3-4d86-879d-e9a5a446d69f",
            "tags": [],
            "current_conf": {
                "regularExpression": "",
                "logType": "JSON",
                "confName": "ee-json-0505-02",
                "createdDt": "2022-05-05T07:53:09Z",
                "logPath": "/home/ec2-user/*.json",
                "status": "ACTIVE",
                "multilineLogParser": None,
                "userLogFormat": "",
                "regularSpecs": [
                    {"type": "date", "format": "%d/%b/%Y:%H:%M:%S %z", "key": "time"},
                    {"type": "text", "key": "host"},
                    {"type": "text", "key": "user-identifier"},
                    {"type": "text", "key": "method"},
                    {"type": "text", "key": "request"},
                    {"type": "text", "key": "protocol"},
                    {"type": "integer", "key": "status"},
                    {"type": "integer", "key": "bytes"},
                    {"type": "text", "key": "referer"},
                ],
                "id": "e4c579eb-fcf2-4ddb-8226-796f4bc8a690",
            },
            "page": 1,
            "count": 10,
            "sourceId": "9681daea-1095-44b5-8e11-40fa935f3aea",
            "source_ingestion_map": {
                "9681daea-1095-44b5-8e11-40fa935f3aea": "818b97bd-7fdd-4b73-b411-acef7a72da96"
            },
            "action": "asyncCreateAppLogIngestion",
            "is_multiline": False,
        },
        None,
    )

    # Test the delete ingestion api
    s3_as_source_lambda_function.lambda_handler(
        {
            "action": "asyncDeleteAppLogIngestion",
            "ids": ["53da2dc5-aa5c-4e6a-bba0-761cbd446fb6"],
        },
        None,
    )

    # Test the unknow action
    with pytest.raises(RuntimeError):
        s3_as_source_lambda_function.lambda_handler(
            {
                "action": "unknowAction",
                "ids": ["53da2dc5-aa5c-4e6a-bba0-761cbd446fb6"],
            },
            None,
        )
