# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import json
import os
from unittest import TestCase as tc

import boto3
import pytest
from moto import mock_dynamodb
from .datafile import ddb_mock_data


@pytest.fixture
def appsync_create_s3_source_event():
    with open("./test/event/appsync_create_s3_source_event.json", "r") as f:
        return json.load(f)


@pytest.fixture
def appsync_delete_s3_source_event():
    with open("./test/event/appsync_delete_s3_source_event.json", "r") as f:
        return json.load(f)


@pytest.fixture
def appsync_get_s3_source_event():
    with open("./test/event/appsync_get_s3_source_event.json", "r") as f:
        return json.load(f)


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

        yield


def test_lambda_handler_s3_source(
    appsync_create_s3_source_event,
    appsync_delete_s3_source_event,
    appsync_get_s3_source_event,
    ddb_client,
):
    # Can only import here, as the environment variables need to be set first.
    import lambda_function

    # Test for App Log S3 source
    lambda_function.lambda_handler(appsync_create_s3_source_event, None)

    get_response = lambda_function.lambda_handler(appsync_get_s3_source_event, None)
    print(get_response)
    log_source_groud_truth = {
        "id": "9e2a1ebf-f738-4f67-bb5b-986b9360107c",
        "archiveFormat": "json",
        "createdDt": "2022-05-09T02:38:53Z",
        "region": "us-east-1",
        "s3Name": "loghub-logs-123456789012",
        "s3Prefix": "test",
        "sourceType": "S3",
        "status": "ACTIVE",
        "tags": None,
        "s3Source": {
            "s3Name": "loghub-logs-123456789012",
            "s3Prefix": "test",
            "archiveFormat": "json",
        },
    }
    dummy_obj = tc()
    tc.assertEqual(dummy_obj, get_response, log_source_groud_truth)

    lambda_function.lambda_handler(appsync_delete_s3_source_event, None)

    lambda_function.lambda_handler(
        {
            "arguments": {
                "sourceType": "S3",
            },
            "info": {
                "fieldName": "listLogSources",
                "parentTypeName": "Query",
                "variables": {},
            },
        },
        None,
    )

    lambda_function.lambda_handler(
        {
            "arguments": {
                "sourceType": "S3",
                "id": "9e2a1ebf-f738-4f67-bb5b-986b9360107a",
            },
            "info": {
                "fieldName": "updateLogSource",
                "parentTypeName": "Mutation",
                "variables": {},
            },
        },
        None,
    )


def test_lambda_handler_ec2_source(ddb_client):
    # Can only import here, as the environment variables need to be set first.
    import lambda_function

    # Test for App Log EC2 source
    lambda_function.lambda_handler(
        {
            "arguments": {
                "sourceType": "EC2",
            },
            "info": {
                "fieldName": "createLogSource",
                "parentTypeName": "Mutation",
                "variables": {},
            },
        },
        None,
    )

    lambda_function.lambda_handler(
        {
            "arguments": {
                "sourceType": "EC2",
                "id": "9e2a1ebf-f738-4f67-bb5b-986b9360107a"
            },
            "info": {
                "fieldName": "deleteLogSource",
                "parentTypeName": "Mutation",
                "variables": {},
            },
        },
        None,
    )

    lambda_function.lambda_handler(
        {
            "arguments": {
                "sourceType": "EC2",
                "id": "9e2a1ebf-f738-4f67-bb5b-986b9360107a",
            },
            "info": {
                "fieldName": "getLogSource",
                "parentTypeName": "Query",
                "variables": {},
            },
        },
        None,
    )

    lambda_function.lambda_handler(
        {
            "arguments": {
                "sourceType": "EC2",
            },
            "info": {
                "fieldName": "listLogSources",
                "parentTypeName": "Query",
                "variables": {},
            },
        },
        None,
    )
    lambda_function.lambda_handler(
        {
            "arguments": {
                "sourceType": "EC2",
                "id": "9e2a1ebf-f738-4f67-bb5b-986b9360107a",
            },
            "info": {
                "fieldName": "updateLogSource",
                "parentTypeName": "Mutation",
                "variables": {},
            },
        },
        None,
    )


def test_lambda_handler_eks_source(ddb_client):
    # Can only import here, as the environment variables need to be set first.
    import lambda_function

    # Test for App Log EKS source
    lambda_function.lambda_handler(
        {
            "arguments": {
                "sourceType": "EKSCluster",
            },
            "info": {
                "fieldName": "createLogSource",
                "parentTypeName": "Mutation",
                "variables": {},
            },
        },
        None,
    )

    lambda_function.lambda_handler(
        {
            "arguments": {
                "sourceType": "EKSCluster",
                "id": "9e2a1ebf-f738-4f67-bb5b-986b9360107a"
            },
            "info": {
                "fieldName": "deleteLogSource",
                "parentTypeName": "Mutation",
                "variables": {},
            },
        },
        None,
    )

    lambda_function.lambda_handler(
        {
            "arguments": {
                "sourceType": "EKSCluster",
                "id": "9e2a1ebf-f738-4f67-bb5b-986b9360107a",
            },
            "info": {
                "fieldName": "getLogSource",
                "parentTypeName": "Query",
                "variables": {},
            },
        },
        None,
    )

    lambda_function.lambda_handler(
        {
            "arguments": {
                "sourceType": "EKSCluster",
            },
            "info": {
                "fieldName": "listLogSources",
                "parentTypeName": "Query",
                "variables": {},
            },
        },
        None,
    )

    lambda_function.lambda_handler(
        {
            "arguments": {
                "sourceType": "EKSCluster",
                "id": "9e2a1ebf-f738-4f67-bb5b-986b9360107a",
            },
            "info": {
                "fieldName": "updateLogSource",
                "parentTypeName": "Mutation",
                "variables": {},
            },
        },
        None,
    )


def test_id_not_found(ddb_client):
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


def test_args_error(ddb_client):
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
