# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import json
import os
import io
import zipfile

import boto3
import pytest
from moto import (
    mock_lambda,
    mock_iam,
    mock_dynamodb,
    mock_stepfunctions,
    mock_sts,
    mock_es,
)
from .datafile import ddb_mock_data
from botocore.exceptions import ClientError


@pytest.fixture
def create_ingestion_event():
    with open("./test/event/create_ingestion_event.json", "r") as f:
        return json.load(f)


@pytest.fixture
def delete_ingestion_event():
    with open("./test/event/delete_ingestion_event.json", "r") as f:
        return json.load(f)


@pytest.fixture
def query_ingestion_event():
    with open("./test/event/query_ingestion_event.json", "r") as f:
        return json.load(f)

@pytest.fixture
def create_asg_ingestion_event():
    with open("./test/event/create_asg_ingestion_event.json", "r") as f:
        return json.load(f)

@pytest.fixture
def delete_asg_ingestion_event():
    with open("./test/event/delete_asg_ingestion_event.json", "r") as f:
        return json.load(f)

@pytest.fixture
def lambda_client():
    with mock_lambda():
        region = os.environ.get("AWS_REGION")
        client = boto3.client("lambda", region_name=region)
        # Create mock_async_s3_child_lambda
        response = client.create_function(
            FunctionName="mock_async_s3_child_lambda",
            Runtime="python3.9",
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
            Runtime="python3.9",
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
            Runtime="python3.9",
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
            ddb_mock_data.log_ingestion_data_5
        ]
        with app_log_ingestion_table.batch_writer() as batch:
            for data in data_list:
                batch.put_item(Item=data)

        ddb.create_table(
            TableName=os.environ.get("SUB_ACCOUNT_LINK_TABLE_NAME"),
            KeySchema=[{"AttributeName": "id", "KeyType": "HASH"}],
            AttributeDefinitions=[{"AttributeName": "id", "AttributeType": "S"}],
            ProvisionedThroughput={"ReadCapacityUnits": 5, "WriteCapacityUnits": 5},
        )
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
def sts_client():
    with mock_sts():
        boto3.client("sts", region_name=os.environ.get("AWS_REGION"))
        yield


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


@pytest.fixture
def aos_client():
    with mock_es():
        es = boto3.client("es", region_name=os.environ.get("AWS_REGION"))
        es.create_elasticsearch_domain(DomainName="loghub-aos-comp")
        yield


def test_lambda_handler(
    create_ingestion_event,
    create_asg_ingestion_event,
    delete_ingestion_event,
    delete_asg_ingestion_event,
    query_ingestion_event,
    lambda_client,
    ddb_client,
    sfn_client,
    sts_client,
    aos_client,
):
    # Can only import here, as the environment variables need to be set first.
    import lambda_function

    lambda_function.lambda_handler(create_ingestion_event, None)
    response = lambda_function.lambda_handler(query_ingestion_event, None)
    assert "total" in response
    assert response["total"] == 2
    # assert {
    #     "id": "d8e6c7a6-4061-4a4a-864e-0000004",
    #     "appPipelineId": "ab740668-fba3-4d86-879d-e9a5a446d69f",
    #     "confId": "e4c579eb-fcf2-4ddb-8226-796f4bc8a690",
    #     "createdDt": "2022-04-26T09:59:04Z",
    #     "sourceId": "000000001-1095-44b5-8e11-40fa935f3aea",
    #     "sourceType": "S3",
    #     "stackId": "arn:aws:cloudformation:us-east-1:123456789012:stack/LogHub-AppIngestion-S3-d8e6c/xxx",
    #     "stackName": "",
    #     "status": "ERROR",
    #     "tags": [],
    #     "confName": "s3-source-config-01",
    #     "kdsRoleArn": "arn:aws:iam::111111111:role/LogHub-EKS-Cluster-PodLog-DataBufferKDSRole7BCBC83-1II64RIV25JN3",
    #     "kdsRoleName": "LogHub-EKS-Cluster-PodLog-DataBufferKDSRole7BCBC83-1II64RIV25JN3",
    #     "sourceInfo": {},
    # } in response["appLogIngestions"]
    lambda_function.lambda_handler(create_asg_ingestion_event, None)
    response = lambda_function.lambda_handler(query_ingestion_event, None)
    assert "total" in response
    assert response["total"] == 3

    lambda_function.lambda_handler(delete_ingestion_event, None)
    lambda_function.lambda_handler(delete_asg_ingestion_event, None)
