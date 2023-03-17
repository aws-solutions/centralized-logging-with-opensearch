# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import json
import pytest

import os
import boto3
from moto import mock_dynamodb, mock_stepfunctions, mock_sts, mock_es


@pytest.fixture
def create_event():
    with open("./test/event/test_event.json", "r") as f:
        event = json.load(f)
        event["arguments"] = {
            "type": "WAF",
            "source": "test-acl",
            "target": "dev",
            "destinationType": "KDS",
            "parameters": [
                {"parameterKey": "hello", "parameterValue": "world"},
                {"parameterKey": "domainName", "parameterValue": "loghub-os"},
            ],
            "tags": [],
        }
        event["info"]["fieldName"] = "createServicePipeline"

        print(event)
        return event


@pytest.fixture
def list_event():
    with open("./test/event/test_event.json", "r") as f:
        event = json.load(f)
        event["arguments"] = {"page": 1, "count": 10}

        print(event)
        return event


@pytest.fixture
def delete_event():
    with open("./test/event/test_event.json", "r") as f:
        event = json.load(f)
        event["arguments"] = {"id": "30ab5726-68fc-4204-8d00-c34d2f2b906c"}
        event["info"]["fieldName"] = "deleteServicePipeline"
        print(event)
        return event


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


@pytest.fixture
def ddb_client():
    with mock_dynamodb():
        region = os.environ.get("AWS_REGION")
        ddb_name = "log-hub-pipeline-table"
        os.environ["PIPELINE_TABLE"] = ddb_name

        ddb = boto3.resource("dynamodb", region_name=region)
        ddb.create_table(
            TableName=ddb_name,
            KeySchema=[{"AttributeName": "id", "KeyType": "HASH"}],
            AttributeDefinitions=[{"AttributeName": "id", "AttributeType": "S"}],
            ProvisionedThroughput={"ReadCapacityUnits": 5, "WriteCapacityUnits": 5},
        )
        # Mock the Sub account link table
        ddb.create_table(
            TableName=os.environ.get("SUB_ACCOUNT_LINK_TABLE_NAME"),
            KeySchema=[{"AttributeName": "id", "KeyType": "HASH"}],
            AttributeDefinitions=[{"AttributeName": "id", "AttributeType": "S"}],
            ProvisionedThroughput={"ReadCapacityUnits": 5, "WriteCapacityUnits": 5},
        )

        yield


@pytest.fixture
def sts_client():
    with mock_sts():
        boto3.client("sts", region_name=os.environ.get("AWS_REGION"))
        yield


@pytest.fixture
def aos_client():
    with mock_es():
        es = boto3.client("es", region_name=os.environ.get("AWS_REGION"))
        es.create_elasticsearch_domain(DomainName="loghub-os")
        yield


def test_lambda_function(
    sfn_client,
    ddb_client,
    sts_client,
    aos_client,
    create_event,
    list_event,
    delete_event,
):
    import lambda_function

    # start with empty list
    result = lambda_function.lambda_handler(list_event, None)
    assert result["total"] == 0

    # create a pipeline
    id = lambda_function.lambda_handler(create_event, None)
    # Expect Execute successfully.
    assert id is not None

    # list again
    result = lambda_function.lambda_handler(list_event, None)
    assert result["total"] == 1
    pipelines = result["pipelines"]
    assert len(pipelines) == 1
    assert "source" in pipelines[0]
    assert "target" in pipelines[0]

    # delete an non-existing one
    with pytest.raises(lambda_function.APIException):
        lambda_function.lambda_handler(delete_event, None)

    # delete a real one
    delete_event["arguments"]["id"] = id
    result = lambda_function.lambda_handler(delete_event, None)
    assert result == "OK"

    # list again.
    result = lambda_function.lambda_handler(list_event, None)
    assert result["total"] == 0
