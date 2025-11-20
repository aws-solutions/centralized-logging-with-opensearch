# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0


import os
import json
import boto3
import pytest
from moto import mock_dynamodb, mock_sts
from commonlib import APIException


@pytest.fixture
def create_source_event():
    with open("./test/event/create_event.json", "r") as f:
        return json.load(f)


@pytest.fixture
def delete_source_event():
    with open("./test/event/delete_event.json", "r") as f:
        return json.load(f)


@pytest.fixture
def get_source_event():
    with open("./test/event/get_event.json", "r") as f:
        return json.load(f)


@pytest.fixture
def list_sources_event():
    with open("./test/event/list_event.json", "r") as f:
        return json.load(f)


def init_table(table, rows):
    with table.batch_writer() as batch:
        for data in rows:
            batch.put_item(Item=data)


@pytest.fixture
def ddb_client():
    with mock_dynamodb():
        region = os.environ.get("AWS_REGION")
        ddb = boto3.resource("dynamodb", region_name=region)
        # Mock App Log Source Table

        log_source_table_name = os.environ.get("LOG_SOURCE_TABLE_NAME")
        ddb.create_table(
            TableName=log_source_table_name,
            KeySchema=[{"AttributeName": "sourceId", "KeyType": "HASH"}],
            AttributeDefinitions=[{"AttributeName": "sourceId", "AttributeType": "S"}],
            ProvisionedThroughput={"ReadCapacityUnits": 5, "WriteCapacityUnits": 5},
        )

        instance_table_name = os.environ.get("INSTANCE_TABLE_NAME")
        ddb.create_table(
            TableName=instance_table_name,
            KeySchema=[
                {"AttributeName": "id", "KeyType": "HASH"},
                {"AttributeName": "sourceId", "KeyType": "RANGE"},
            ],
            AttributeDefinitions=[
                {"AttributeName": "id", "AttributeType": "S"},
                {"AttributeName": "sourceId", "AttributeType": "S"},
            ],
            ProvisionedThroughput={"ReadCapacityUnits": 5, "WriteCapacityUnits": 5},
            GlobalSecondaryIndexes=[
                {
                    "IndexName": "SourceToInstanceIndex",
                    "KeySchema": [
                        {"AttributeName": "sourceId", "KeyType": "HASH"},
                    ],
                    "Projection": {
                        "ProjectionType": "ALL",
                    },
                    "ProvisionedThroughput": {
                        "ReadCapacityUnits": 5,
                        "WriteCapacityUnits": 5,
                    },
                },
            ],
        )

        app_ingestion_table_name = os.environ.get("APP_LOG_INGESTION_TABLE_NAME")
        app_ingestion_table = ddb.create_table(
            TableName=app_ingestion_table_name,
            KeySchema=[
                {"AttributeName": "id", "KeyType": "HASH"},
            ],
            AttributeDefinitions=[
                {"AttributeName": "id", "AttributeType": "S"},
                {"AttributeName": "sourceId", "AttributeType": "S"},
            ],
            ProvisionedThroughput={"ReadCapacityUnits": 5, "WriteCapacityUnits": 5},
            GlobalSecondaryIndexes=[
                {
                    "IndexName": "SourceToIngestionIndex",
                    "KeySchema": [
                        {"AttributeName": "sourceId", "KeyType": "HASH"},
                        {"AttributeName": "id", "KeyType": "RANGE"},
                    ],
                    "Projection": {
                        "ProjectionType": "ALL",
                    },
                    "ProvisionedThroughput": {
                        "ReadCapacityUnits": 5,
                        "WriteCapacityUnits": 5,
                    },
                },
            ],
        )
        data_list = [
            {
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
                        {"paramKey": "port", "paramValue": "501"},
                        {"paramKey": "listen", "paramValue": "127.0.0.1"},
                    ],
                },
                "logConfig": {
                    "id": "441f49e0-76d1-45c2-81be-4656a637b099",
                    "createdAt": "2023-05-23T03:14:10Z",
                    "filterConfigMap": {"enabled": False, "filters": []},
                    "logType": "Syslog",
                    "name": "syslog-ui-dev-01",
                    "regex": "^\\<(?<pri>[0-9]{1,5})\\>1 (?<time>[^ ]+) (?<host>[^ ]+) (?<ident>[^ ]+) (?<pid>[-0-9]+) (?<msgid>[^ ]+) ?<extradata>\\[.*\\]|-) (?<message>.+)$",
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
                "sourceId": "20cec29c-f6bf-4c16-8ddb-8f6e4d228191",
                "sourceType": "Syslog",
                "stackId": "arn:aws:cloudformation:us-west-2:123456789012:stack/CL-AppIngestion-Syslog-64e7b8a3/51d36010-fc6f-11ed-9c0c-0675dc9e99d7",
                "status": "ACTIVE",
                "tags": [],
                "updatedAt": "2023-05-27T09:17:34Z",
            }
        ]
        init_table(app_ingestion_table, data_list)

        yield


@mock_sts
def test_lambda_handler_ec2_source(
    ddb_client,
    create_source_event,
    get_source_event,
    list_sources_event,
    delete_source_event,
):
    import lambda_function as lambda_function

    list_sources_event["arguments"] = {"type": "EC2", "page": 1, "count": 10}
    # List EC2 sources
    result = lambda_function.lambda_handler(
        list_sources_event,
        None,
    )
    print(result)
    # result should be empty
    assert result["total"] == 0

    # Create one, here we have to set the region and accountId for duplicate creation test
    create_source_event["arguments"] = {
        "type": "EC2",
        "region": os.environ["AWS_DEFAULT_REGION"],
        "accountId": os.environ["MOTO_ACCOUNT_ID"],
        "ec2": {
            "groupName": "test-group",
            "groupPlatform": "Linux",
            "groupType": "ASG",
        },
    }
    source_id = lambda_function.lambda_handler(
        create_source_event,
        None,
    )
    
    # Create a log source with the same name again
    with pytest.raises(APIException):
        lambda_function.lambda_handler(
            create_source_event,
            None,
        )

    # Get the one just created.
    get_source_event["arguments"] = {
        "type": "EC2",
        "sourceId": source_id,
    }
    result = lambda_function.lambda_handler(
        get_source_event,
        None,
    )
    assert result is not None
    assert result.get("type") == "EC2"
    assert result.get("ec2") is not None

    delete_source_event["arguments"] = {
        "type": "EC2",
        "sourceId": source_id,
    }
    lambda_function.lambda_handler(
        delete_source_event,
        None,
    )

    # List EC2 sources again
    result = lambda_function.lambda_handler(
        list_sources_event,
        None,
    )
    # result should be empty
    assert result["total"] == 0


@mock_sts
def test_lambda_handler_syslog_source(
    ddb_client,
):
    import lambda_function as lambda_function

    # Test createLogSource method
    source_id = lambda_function.lambda_handler(
        {
            "arguments": {"type": "Syslog"},
            "info": {
                "fieldName": "createLogSource",
                "parentTypeName": "Mutation",
                "variables": {},
            },
        },
        None,
    )
    # Test getLogSource method
    resp = lambda_function.lambda_handler(
        {
            "arguments": {"type": "Syslog", "sourceId": source_id},
            "info": {
                "fieldName": "getLogSource",
                "parentTypeName": "Query",
                "variables": {},
            },
        },
        None,
    )
    assert resp["status"] == "ACTIVE"

    # Test checkCustomPort method
    resp = lambda_function.lambda_handler(
        {
            "arguments": {"sourceType": "Syslog", "id": source_id, "syslogPort": 500},
            "info": {
                "fieldName": "checkCustomPort",
                "parentTypeName": "Query",
                "variables": {},
            },
        },
        None,
    )

    assert resp == {"isAllowedPort": True, "msg": "", "recommendedPort": 500}

    resp = lambda_function.lambda_handler(
        {
            "arguments": {"sourceType": "Syslog", "id": source_id, "syslogPort": -1},
            "info": {
                "fieldName": "checkCustomPort",
                "parentTypeName": "Query",
                "variables": {},
            },
        },
        None,
    )

    assert resp == {"isAllowedPort": True, "msg": "", "recommendedPort": 500}

    resp = lambda_function.lambda_handler(
        {
            "arguments": {"sourceType": "Syslog", "id": source_id, "syslogPort": 1},
            "info": {
                "fieldName": "checkCustomPort",
                "parentTypeName": "Query",
                "variables": {},
            },
        },
        None,
    )

    assert resp == {"isAllowedPort": False, "msg": "OutofRange", "recommendedPort": 500}

    resp = lambda_function.lambda_handler(
        {
            "arguments": {
                "sourceType": "Syslog",
                "id": "1111111111111111111",
                "syslogPort": 501,
            },
            "info": {
                "fieldName": "checkCustomPort",
                "parentTypeName": "Query",
                "variables": {},
            },
        },
        None,
    )
    print("resp: ", resp)
    assert resp == {"isAllowedPort": False, "msg": "Conflict", "recommendedPort": 500}
