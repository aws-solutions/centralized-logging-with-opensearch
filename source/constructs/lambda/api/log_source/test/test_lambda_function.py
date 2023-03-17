# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import json
import os
import io
import zipfile

import boto3
import pytest
from moto import mock_dynamodb, mock_sts, mock_lambda, mock_iam
from botocore.exceptions import ClientError
from .datafile import ddb_mock_data


@pytest.fixture
def appsync_create_s3_source_event():
    with open("./test/event/appsync_create_s3_source_event.json", "r") as f:
        return json.load(f)


@pytest.fixture
def appsync_get_s3_source_event():
    with open("./test/event/appsync_get_s3_source_event.json", "r") as f:
        return json.load(f)


@pytest.fixture
def sts_client():
    with mock_sts():
        boto3.client("sts", region_name=os.environ.get("AWS_REGION"))
        yield


@pytest.fixture
def lambda_client():
    with mock_lambda():
        region = os.environ.get("AWS_REGION")
        client = boto3.client("lambda", region_name=region)
        # Create mock_async_s3_child_lambda
        response = client.create_function(
            FunctionName="mock_async_cross_aacount_lambda",
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
        os.environ["ASYNC_CROSS_ACCOUNT_LAMBDA_ARN"] = response["FunctionArn"]


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


@pytest.fixture
def ddb_client():
    with mock_dynamodb():
        region = os.environ.get("AWS_REGION")
        ddb = boto3.resource("dynamodb", region_name=region)
        # Mock App Log Source Table
        s3_log_source_table_name = os.environ.get("S3_LOG_SOURCE_TABLE_NAME")
        s3_log_source_table = ddb.create_table(
            TableName=s3_log_source_table_name,
            KeySchema=[{"AttributeName": "id", "KeyType": "HASH"}],
            AttributeDefinitions=[{"AttributeName": "id", "AttributeType": "S"}],
            ProvisionedThroughput={"ReadCapacityUnits": 10, "WriteCapacityUnits": 10},
        )
        data_list = [ddb_mock_data.s3_log_source_data]
        with s3_log_source_table.batch_writer() as batch:
            for data in data_list:
                batch.put_item(Item=data)

        log_source_table_name = os.environ.get("LOG_SOURCE_TABLE_NAME")
        ddb.create_table(
            TableName=log_source_table_name,
            KeySchema=[{"AttributeName": "id", "KeyType": "HASH"}],
            AttributeDefinitions=[{"AttributeName": "id", "AttributeType": "S"}],
            ProvisionedThroughput={"ReadCapacityUnits": 10, "WriteCapacityUnits": 10},
        )

        log_source_table = ddb.Table(log_source_table_name)

        log_source_table.put_item(
            Item={
                'id': '1111111111111111111',
                'sourceType': 'Syslog',
                'accountId': '123456789012',
                'region': 'us-east-1',
                'sourceInfo': [
                    {
                        'key': 'syslogPort',
                        'value': 501
                    }
                ],
                'createdDt': '2023-01-30T02:01:23Z',
                'tags': [],
                'status': 'ACTIVE',
                'sourceId': '1111111111111111111'
            }
        )

        yield


# def test_lambda_handler_s3_source(
#     appsync_create_s3_source_event,
#     appsync_get_s3_source_event,
#     ddb_client,
#     sts_client,
#     lambda_client,
# ):
#     # Can only import here, as the environment variables need to be set first.
#     import lambda_function

#     # Test for App Log S3 source
#     lambda_function.lambda_handler(appsync_create_s3_source_event, None)


def test_lambda_handler_syslog_source(
    ddb_client,
    sts_client,
    lambda_client,
):
    import lambda_function

    # Test createLogSource method
    source_id = lambda_function.lambda_handler({
        "arguments": {
            "sourceType": "Syslog"
        },
        "info": {
            "fieldName": "createLogSource",
            "parentTypeName": "Mutation",
            "variables": {},
        },
    }, None)

    # Test getLogSource method
    resp = lambda_function.lambda_handler({
        "arguments": {
            "sourceType": "Syslog",
            "id": source_id
        },
        "info": {
            "fieldName": "getLogSource",
            "parentTypeName": "Query",
            "variables": {},
        },
    }, None)

    assert resp["status"] == "REGISTERED"

    # Test checkCustomPort method
    resp = lambda_function.lambda_handler({
        "arguments": {
            "sourceType": "Syslog",
            "id": source_id,
            "syslogPort": 500
        },
        "info": {
            "fieldName": "checkCustomPort",
            "parentTypeName": "Mutation",
            "variables": {},
        },
    }, None)

    assert resp == {'isAllowedPort': True, 'msg': '', 'recommendedPort': 500}

    resp = lambda_function.lambda_handler({
        "arguments": {
            "sourceType": "Syslog",
            "id": source_id,
            "syslogPort": -1
        },
        "info": {
            "fieldName": "checkCustomPort",
            "parentTypeName": "Mutation",
            "variables": {},
        },
    }, None)

    assert resp == {'isAllowedPort': True, 'msg': '', 'recommendedPort': 500}

    resp = lambda_function.lambda_handler({
        "arguments": {
            "sourceType": "Syslog",
            "id": source_id,
            "syslogPort": 1
        },
        "info": {
            "fieldName": "checkCustomPort",
            "parentTypeName": "Mutation",
            "variables": {},
        },
    }, None)

    assert resp == {'isAllowedPort': False, 'msg': 'OutofRange', 'recommendedPort': 500}

    resp = lambda_function.lambda_handler({
        "arguments": {
            "sourceType": "Syslog",
            "id": "1111111111111111111",
            "syslogPort": 501
        },
        "info": {
            "fieldName": "checkCustomPort",
            "parentTypeName": "Mutation",
            "variables": {},
        },
    }, None)
    assert resp == {'isAllowedPort': False, 'msg': 'Conflict', 'recommendedPort': 500}


def test_id_not_found(ddb_client, sts_client, lambda_client):
    import lambda_function

    with pytest.raises(RuntimeError):
        lambda_function.lambda_handler(
            {
                "arguments": {
                    "sourceType": "S3",
                    "id": "xxxxxxxxxx",
                },
                "info": {
                    "fieldName": "getLogSource",
                    "parentTypeName": "Query",
                    "variables": {},
                },
            },
            None,
        )


def test_args_error(ddb_client, sts_client, lambda_client):
    import lambda_function

    with pytest.raises(RuntimeError):
        lambda_function.lambda_handler(
            {
                "arguments": {
                    "sourceType": "NoExist",
                    "id": "9e2a1ebf-f738-4f67-bb5b-986b9360107c",
                },
                "info": {
                    "fieldName": "getLogSource",
                    "parentTypeName": "Query",
                    "variables": {},
                },
            },
            None,
        )

    with pytest.raises(RuntimeError):
        lambda_function.lambda_handler(
            {
                "arguments": {
                    "sourceType": "S3",
                    "id": "9e2a1ebf-f738-4f67-bb5b-986b9360107c",
                },
                "info": {
                    "fieldName": "NoExistMethos",
                    "parentTypeName": "Query",
                    "variables": {},
                },
            },
            None,
        )
