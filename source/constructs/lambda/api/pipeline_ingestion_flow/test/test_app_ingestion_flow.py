# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import json
import pytest
import copy

import os
import boto3
from moto import mock_dynamodb, mock_cloudformation


@pytest.fixture
def test_create_event():
    with open("./test/event/app_ingestion_test_event.json", "r") as f:
        event = json.load(f)
        return event


@pytest.fixture
def test_delete_event():
    with open("./test/event/app_ingestion_test_event.json", "r") as f:
        event = json.load(f)
        event["result"]["stackStatus"] = "DELETE_COMPLETE"
        return event


@pytest.fixture
def test_error_event():
    with open("./test/event/app_ingestion_test_event.json", "r") as f:
        event = json.load(f)
        event["result"]["stackStatus"] = "UPDATE_FAILED"
        return event


@pytest.fixture
def test_invalid_id():
    with open("./test/event/app_ingestion_test_event.json", "r") as f:
        event = json.load(f)
        event["id"] = "1234"
        return event


@pytest.fixture
def test_invalid_event():
    return {
        "Hello": "World",
        "arguments": {},
    }


@pytest.fixture
def cfn_client():
    with mock_cloudformation():
        region = os.environ.get("AWS_REGION")
        cfn = boto3.client("cloudformation", region_name=region)
        stack_name = "CL-AppIngestion-Syslog-64e7b8a3"

        stack_template = """
        Resources:
        TestBucket:
            Type: "AWS::S3::Bucket"
            Properties:
            BucketName: "test-bucket"
        """

        cfn.create_stack(
            StackName=stack_name,
            TemplateBody=stack_template,
            Parameters=[
                {"ParameterKey": "KeyParameter", "ParameterValue": "TestParameter"}
            ],
        )
        yield


@pytest.fixture
def ddb_client():
    with mock_dynamodb():
        region = os.environ.get("AWS_REGION")
        ingestion_table_name = os.environ["INGESTION_TABLE"]

        ddb = boto3.resource("dynamodb", region_name=region)
        ddb.create_table(
            TableName=ingestion_table_name,
            KeySchema=[{"AttributeName": "id", "KeyType": "HASH"}],
            AttributeDefinitions=[{"AttributeName": "id", "AttributeType": "S"}],
            ProvisionedThroughput={"ReadCapacityUnits": 5, "WriteCapacityUnits": 5},
        )

        table = ddb.Table(ingestion_table_name)

        table.put_item(
            Item={
                "id": "64e7b8a3-aad6-476a-9c68-2fdc3f92108a",
                "accountId": "123456789012",
                "appPipelineId": "2be18e2e-2fcf-4cbb-af32-872090a35bc3",
                "autoAddPermission": False,
                "createdAt": "2023-05-27T09:17:33Z",
                "error": "",
                "input": {
                    "name": "syslog",
                    "params": [
                        {"paramKey": "protocolType", "paramValue": "TCP"},
                        {"paramKey": "port", "paramValue": "503"},
                        {"paramKey": "listen", "paramValue": "127.0.0.1"},
                    ],
                },
                "logConfig": {
                    "id": "441f49e0-76d1-45c2-81be-4656a637b099",
                    "createdAt": "2023-05-23T03:14:10Z",
                    "filterConfigMap": {"enabled": False, "filters": []},
                    "logType": "Syslog",
                    "name": "syslog-ui-dev-01",
                    "regex": "^\\<(?<pri>[0-9]{1,5})\\>1 (?<time>[^ ]+) (?<host>[^ ]+) (?<ident>[^ ]+) (?<pid>[-0-9]+) (?<msgid>[^ ]+) (?<extradata>[.*]|-) (?<message>.+)$",
                    "regexFieldSpecs": [],
                    "status": "ACTIVE",
                    "syslogParser": "RFC5424",
                    "tags": [],
                    "timeKey": "",
                    "timeKeyRegex": "",
                    "timeOffset": "",
                    "updatedAt": "2023-05-23T03:14:10Z",
                    "userLogFormat": "",
                    "userSampleLog": "",
                    "version": 1,
                },
                "logPath": "",
                "output": {
                    "name": "S3",
                    "params": [
                        {
                            "paramKey": "logBucketName",
                            "paramValue": "amzn-s3-demo-logging-bucket",
                        },
                        {
                            "paramKey": "logBucketPrefix",
                            "paramValue": "AppLogs/syslog-ui-dev-0527-01/year=%Y/month=%m/day=%d",
                        },
                        {"paramKey": "logBucketSuffix", "paramValue": ""},
                        {
                            "paramKey": "defaultCmkArn",
                            "paramValue": "arn:aws:kms:us-west-2:123456789012:key/58000f47-d629-49d8-a6f1-278978858bb6",
                        },
                        {"paramKey": "maxFileSize", "paramValue": "50"},
                        {"paramKey": "uploadTimeout", "paramValue": "60"},
                        {"paramKey": "compressionType", "paramValue": ""},
                        {
                            "paramKey": "s3StorageClass",
                            "paramValue": "INTELLIGENT_TIERING",
                        },
                        {
                            "paramKey": "logBucketName",
                            "paramValue": "amzn-s3-demo-logging-bucket",
                        },
                    ],
                    "roleArn": "arn:aws:iam::123456789012:role/CL-buffer-access-2be18e2e-2fcf-4cbb-af32-872090a35bc3",
                    "roleName": "CL-buffer-access-2be18e2e-2fcf-4cbb-af32-872090a35bc3",
                },
                "region": "us-west-2",
                "sourceId": "19833bcc-d334-4bde-bf4e-217f9df80940",
                "sourceType": "Syslog",
                "stackId": "arn:aws:cloudformation:us-west-2:123456789012:stack/CL-AppIngestion-Syslog-64e7b8a3/51d36010-fc6f-11ed-9c0c-0675dc9e99d7",
                "status": "ACTIVE",
                "tags": [],
                "updatedAt": "2023-05-27T09:17:34Z",
            }
        )

        log_source_table_name = os.environ["LOG_SOURCE_TABLE"]

        ddb = boto3.resource("dynamodb", region_name=region)
        ddb.create_table(
            TableName=log_source_table_name,
            KeySchema=[{"AttributeName": "sourceId", "KeyType": "HASH"}],
            AttributeDefinitions=[{"AttributeName": "sourceId", "AttributeType": "S"}],
            ProvisionedThroughput={"ReadCapacityUnits": 5, "WriteCapacityUnits": 5},
        )

        table = ddb.Table(log_source_table_name)

        table.put_item(
            Item={
                "sourceId": "19833bcc-d334-4bde-bf4e-217f9df80940",
                "accountId": "123456789012",
                "createdAt": "2023-05-28T16:06:51Z",
                "region": "us-west-2",
                "status": "ACTIVE",
                "syslog": {"port": 503, "protocol": "TCP"},
                "tags": [],
                "type": "Syslog",
                "updatedAt": "2023-05-28T16:06:51Z",
            }
        )

        yield


def test_lambda_function(
    ddb_client,
    test_create_event,
):
    import app_ingestion_flow

    # run lambda
    app_ingestion_flow.lambda_handler(test_create_event, None)
    region = os.environ.get("AWS_REGION")
    ddb = boto3.resource("dynamodb", region_name=region)
    source_table = ddb.Table(os.environ["LOG_SOURCE_TABLE"])

    response = source_table.get_item(
        Key={"sourceId": "19833bcc-d334-4bde-bf4e-217f9df80940"}
    )
    item = response["Item"]
    assert item["status"] == "ACTIVE"


def test_lambda_function_create_event_for_light_engine(
    ddb_client,
    test_create_event,
):
    import app_ingestion_flow

    # run lambda
    app_ingestion_flow.lambda_handler(test_create_event, None)
    test_create_event["engineType"] = "LightEngine"

    region = os.environ.get("AWS_REGION")
    ddb = boto3.resource("dynamodb", region_name=region)
    source_table = ddb.Table(os.environ["LOG_SOURCE_TABLE"])

    response = source_table.get_item(
        Key={"sourceId": "19833bcc-d334-4bde-bf4e-217f9df80940"}
    )
    item = response["Item"]
    assert item["status"] == "ACTIVE"


def test_lambda_function_delete_event(
    ddb_client,
    test_delete_event,
):
    import app_ingestion_flow

    # run lambda
    app_ingestion_flow.lambda_handler(test_delete_event, None)
    region = os.environ.get("AWS_REGION")
    ddb = boto3.resource("dynamodb", region_name=region)
    source_table = ddb.Table(os.environ["LOG_SOURCE_TABLE"])

    response = source_table.get_item(
        Key={"sourceId": "19833bcc-d334-4bde-bf4e-217f9df80940"}
    )
    item = response["Item"]
    assert item["status"] == "INACTIVE"


def test_lambda_function_delete_event_for_light_engine(
    ddb_client,
    test_delete_event,
):
    import app_ingestion_flow

    # run lambda
    app_ingestion_flow.lambda_handler(test_delete_event, None)
    test_delete_event["engineType"] = "LightEngine"

    region = os.environ.get("AWS_REGION")
    ddb = boto3.resource("dynamodb", region_name=region)
    source_table = ddb.Table(os.environ["LOG_SOURCE_TABLE"])

    response = source_table.get_item(
        Key={"sourceId": "19833bcc-d334-4bde-bf4e-217f9df80940"}
    )
    item = response["Item"]
    assert item["status"] == "INACTIVE"


def test_lambda_function_error_event(
    ddb_client,
    cfn_client,
    test_error_event,
):
    import app_ingestion_flow

    # run lambda
    app_ingestion_flow.lambda_handler(test_error_event, None)
    region = os.environ.get("AWS_REGION")
    ddb = boto3.resource("dynamodb", region_name=region)
    source_table = ddb.Table(os.environ["LOG_SOURCE_TABLE"])

    response = source_table.get_item(
        Key={"sourceId": "19833bcc-d334-4bde-bf4e-217f9df80940"}
    )
    item = response["Item"]
    assert item["status"] == "ERROR"


def test_lambda_function_error_event_for_light_engine(
    ddb_client,
    cfn_client,
    test_error_event,
):
    import app_ingestion_flow

    test_error_event["engineType"] = "LightEngine"
    test_error_event["pattern"] = "S3SourceStack"
    test_error_event["result"]["Error"] = "NoSuchBucket"
    # run lambda
    app_ingestion_flow.lambda_handler(test_error_event, None)
    region = os.environ.get("AWS_REGION")
    ddb = boto3.resource("dynamodb", region_name=region)
    source_table = ddb.Table(os.environ["LOG_SOURCE_TABLE"])

    response = source_table.get_item(
        Key={"sourceId": "19833bcc-d334-4bde-bf4e-217f9df80940"}
    )
    item = response["Item"]
    assert item["status"] == "ERROR"


def test_lambda_function_with_invalid_id(
    ddb_client,
    test_invalid_id,
):
    import app_ingestion_flow

    with pytest.raises(RuntimeError):
        app_ingestion_flow.lambda_handler(test_invalid_id, None)


def test_lambda_function_with_invalid_event(
    ddb_client,
    test_invalid_event,
):
    import app_ingestion_flow

    with pytest.raises(RuntimeError):
        app_ingestion_flow.lambda_handler(test_invalid_event, None)
