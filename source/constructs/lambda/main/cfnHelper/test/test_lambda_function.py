# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import json
import pytest
import os
import boto3
from moto import mock_cloudformation, mock_s3, mock_sts, mock_dynamodb


@pytest.fixture
def start_event():
    with open("./test/event/start_event.json", "r") as f:
        return json.load(f)


@pytest.fixture
def update_event():
    with open("./test/event/update_event.json", "r") as f:
        return json.load(f)


@pytest.fixture
def stop_event():
    with open("./test/event/stop_event.json", "r") as f:
        return json.load(f)


@pytest.fixture
def query_event():
    with open("./test/event/query_event.json", "r") as f:
        return json.load(f)


@pytest.fixture
def s3_client():

    with mock_s3():
        region = os.environ.get("AWS_REGION")
        version = os.environ.get("SOLUTION_VERSION")
        solution_name = os.environ.get("SOLUTION_NAME", "clo")
        key = f"{solution_name}/{version}/AlarmForOpenSearch.template"

        s3 = boto3.resource("s3", region_name=region)
        # Create the bucket
        template_bucket = os.environ.get("TEMPLATE_OUTPUT_BUCKET")
        s3.create_bucket(Bucket=template_bucket)

        # upload template file
        data = open("./test/template/test.template", "rb")
        s3.Bucket(template_bucket).put_object(Key=key, Body=data)

        yield


@pytest.fixture
def sts_client():
    with mock_sts():
        boto3.client("sts", region_name=os.environ.get("AWS_REGION"))
        yield


@pytest.fixture
def ddb_client():
    with mock_dynamodb():
        region = os.environ.get("AWS_REGION")

        _ddb_client = boto3.client("dynamodb", region_name=region)
        # Mock the Sub account link table
        _ddb_client.create_table(
            TableName=os.environ.get("SUB_ACCOUNT_LINK_TABLE_NAME"),
            KeySchema=[{"AttributeName": "id", "KeyType": "HASH"}],
            AttributeDefinitions=[{"AttributeName": "id", "AttributeType": "S"}],
            ProvisionedThroughput={"ReadCapacityUnits": 5, "WriteCapacityUnits": 5},
        )
        yield


@mock_cloudformation
def test_lambda_function_start(start_event, s3_client, sts_client, ddb_client):
    import lambda_function

    result = lambda_function.lambda_handler(start_event, None)
    # Expect Execute successfully.
    assert result["action"] == "QUERY"
    assert "args" in result
    assert "stackId" in result["args"]

    assert "stackStatus" in result["result"]
    assert result["result"]["stackStatus"] == "CREATE_IN_PROGRESS"


@mock_cloudformation
def test_lambda_function_query(
    query_event, update_event, s3_client, sts_client, ddb_client
):
    import lambda_function

    region = os.environ.get("AWS_REGION")
    with open("./test/template/test.template", "rb") as f:
        client = boto3.client("cloudformation", region_name=region)
        body = f.read().decode("utf8")
    resp = client.create_stack(StackName="test_stack", TemplateBody=body)
    stack_id = resp["StackId"]

    assert "args" in query_event
    query_event["args"]["stackId"] = stack_id

    result = lambda_function.lambda_handler(query_event, None)
    # # Expect Execute successfully.
    assert result["action"] == "QUERY"
    assert "result" in result
    assert "stackStatus" in result["result"]
    assert result["result"]["stackStatus"] == "CREATE_COMPLETE"


@mock_cloudformation
def test_lambda_function_update(update_event, s3_client, sts_client, ddb_client):
    import lambda_function

    region = os.environ.get("AWS_REGION")
    with open("./test/template/test.template", "rb") as f:
        client = boto3.client("cloudformation", region_name=region)
        body = f.read().decode("utf8")
    client.create_stack(StackName="test_stack", TemplateBody=body)

    assert "args" in update_event
    update_event["args"]["stackName"] = "test_stack"
    result = lambda_function.lambda_handler(update_event, None)
    assert result["action"] == "QUERY"
    assert "args" in result
    assert "stackId" in result["result"]

    assert "stackStatus" in result["result"]
    assert result["result"]["stackStatus"][:6] == "UPDATE"


@mock_cloudformation
@mock_s3
def test_lambda_function_stop(stop_event):
    import lambda_function

    region = os.environ.get("AWS_REGION")
    with open("./test/template/test.template", "rb") as f:
        client = boto3.client("cloudformation", region_name=region)
        body = f.read().decode("utf8")
    resp = client.create_stack(StackName="test_stack", TemplateBody=body)
    stack_id = resp["StackId"]

    assert "args" in stop_event
    stop_event["args"]["stackId"] = stack_id

    result = lambda_function.lambda_handler(stop_event, None)
    # Expect Execute successfully.
    assert result["action"] == "QUERY"
    assert "args" in result

    assert "stackStatus" in result["result"]
    assert result["result"]["stackStatus"] == "DELETE_IN_PROGRESS"


def test_get_template_url():
    import lambda_function

    assert ".template" in lambda_function.get_template_url("S3")
    with pytest.raises(RuntimeError):
        lambda_function.get_template_url("Unknown")


@mock_cloudformation
def test_lambda_function_start_failed(start_event):
    import lambda_function

    # without mock S3, the create stack will fail
    result = lambda_function.lambda_handler(start_event, None)
    # Expect Execute successfully.
    assert "result" in result
    assert "stackStatus" in result["result"]
    assert result["result"]["stackStatus"] == "CREATE_FAILED"
