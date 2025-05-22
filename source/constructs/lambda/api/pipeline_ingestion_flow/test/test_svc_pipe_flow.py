# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import json
import pytest

import os
import boto3
from moto import mock_dynamodb, mock_cloudformation
from unittest.mock import patch, MagicMock


@pytest.fixture
def test_create_event():
    with open("./test/event/svc_pipe_test_event.json", "r") as f:
        event = json.load(f)
        return event


@pytest.fixture
def test_delete_event():
    with open("./test/event/svc_pipe_test_event.json", "r") as f:
        event = json.load(f)
        event["result"]["stackStatus"] = "DELETE_COMPLETE"
        return event


@pytest.fixture
def test_error_event():
    with open("./test/event/svc_pipe_test_event.json", "r") as f:
        event = json.load(f)
        event["result"]["stackStatus"] = "UPDATE_FAILED"
        return event


@pytest.fixture
def test_invalid_id():
    with open("./test/event/svc_pipe_test_event.json", "r") as f:
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
        stack_name = "Solution-SvcPipe-2e536"

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
        table_name = os.environ["PIPELINE_TABLE"]

        ddb = boto3.resource("dynamodb", region_name=region)
        ddb.create_table(
            TableName=table_name,
            KeySchema=[{"AttributeName": "id", "KeyType": "HASH"}],
            AttributeDefinitions=[{"AttributeName": "id", "AttributeType": "S"}],
            ProvisionedThroughput={"ReadCapacityUnits": 5, "WriteCapacityUnits": 5},
        )

        table = ddb.Table(table_name)

        table.put_item(
            Item={
                "id": "2e536ae6-0f85-463c-9e61-04cebf3ec12b",
                "aosParams": {
                    "domainName": "dev",
                },
                "bufferParams": [
                    {
                        "paramKey": "logBucketName",
                        "paramValue": "solution-solutionloggingbucket0fa53b76-amdiodhh6y8i",
                    },
                    {
                        "paramKey": "logBucketPrefix",
                        "paramValue": "AppLogs/testa/year=%Y/month=%m/day=%d/",
                    },
                    {
                        "paramKey": "defaultCmkArn",
                        "paramValue": "arn:aws:kms:us-west-2:123456789012:key/1dbbdae3-3448-4890-b956-2b9b36197784",
                    },
                    {"paramKey": "maxFileSize", "paramValue": "50"},
                    {"paramKey": "uploadTimeout", "paramValue": "60"},
                    {"paramKey": "compressionType", "paramValue": "Gzip"},
                ],
                "bufferType": "S3",
                "createdAt": "2022-11-08T08:40:20Z",
                "status": "CREATING",
            }
        )

        yield


@patch('svc_pipe_flow.send_metrics')
def test_lambda_function_create_event(
    mock_send_metrics,
    ddb_client,
    test_create_event,
):
    import svc_pipe_flow

    # run lambda
    svc_pipe_flow.lambda_handler(test_create_event, None)
    region = os.environ.get("AWS_REGION")
    table_name = os.environ["PIPELINE_TABLE"]
    ddb = boto3.resource("dynamodb", region_name=region)
    table = ddb.Table(table_name)

    response = table.get_item(Key={"id": "2e536ae6-0f85-463c-9e61-04cebf3ec12b"})
    item = response["Item"]

    assert "processorLogGroupName" in item

    assert "logEventQueueName" in item
    assert "stackId" in item

    assert item["status"] == "ACTIVE"
    mock_send_metrics.assert_called_once_with(
        {
            'metricType': 'PIPELINE_MANAGEMENT',
            'pipelineType': 'Service',
            'status': 'CREATE_COMPLETE', 
            'region': 'us-east-1',
            'pipelineId': '2e536ae6-0f85-463c-9e61-04cebf3ec12b',
            'sourceType': '', 
            'engineType': '',
            'logSourceType': '', 
            'logProcessorType': 'AWS Lambda',
            'isCrossAccountIngestion': False
            }
    )


@patch('svc_pipe_flow.send_metrics')
def test_lambda_function_delete_event(
    mock_send_metrics,
    ddb_client,
    test_delete_event,
):
    import svc_pipe_flow

    # run lambda 
    svc_pipe_flow.lambda_handler(test_delete_event, None)
    region = os.environ.get("AWS_REGION")
    table_name = os.environ["PIPELINE_TABLE"]
    ddb = boto3.resource("dynamodb", region_name=region)
    table = ddb.Table(table_name)

    response = table.get_item(Key={"id": "2e536ae6-0f85-463c-9e61-04cebf3ec12b"})
    item = response["Item"]
    assert item["status"] == "INACTIVE"
    mock_send_metrics.assert_called_once_with(
        {
            'metricType': 'PIPELINE_MANAGEMENT',
            'pipelineType': 'Service',
            'status': 'DELETE_COMPLETE', 
            'region': 'us-east-1',
            'pipelineId': '2e536ae6-0f85-463c-9e61-04cebf3ec12b',
            'sourceType': '', 
            'engineType': '',
            'logSourceType': '', 
            'logProcessorType': 'AWS Lambda',
            'isCrossAccountIngestion': False
            }
    )        


def test_lambda_function_error_event(
    ddb_client,
    cfn_client,
    test_error_event,
):
    import svc_pipe_flow

    # run lambda
    svc_pipe_flow.lambda_handler(test_error_event, None)
    region = os.environ.get("AWS_REGION")
    table_name = os.environ["PIPELINE_TABLE"]
    ddb = boto3.resource("dynamodb", region_name=region)
    table = ddb.Table(table_name)

    response = table.get_item(Key={"id": "2e536ae6-0f85-463c-9e61-04cebf3ec12b"})
    item = response["Item"]
    assert item["status"] == "ERROR"


def test_lambda_function_with_invalid_id(
    ddb_client,
    test_invalid_id,
):
    import svc_pipe_flow

    with pytest.raises(RuntimeError):
        svc_pipe_flow.lambda_handler(test_invalid_id, None)


def test_lambda_function_with_invalid_event(
    ddb_client,
    test_invalid_event,
):
    import svc_pipe_flow

    with pytest.raises(RuntimeError):
        svc_pipe_flow.lambda_handler(test_invalid_event, None)
