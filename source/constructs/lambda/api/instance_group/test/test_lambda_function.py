# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import json
import os

import boto3
import pytest
from moto import mock_dynamodb, mock_events

instance_group_data = {
    "id": {"S": "fa2eacd9-fafe-4341-b6ee-e2e2682d7dd4"},
    "createdDt": {"S": "2022-05-17T05:45:45Z"},
    "groupName": {"S": "test-1"},
    "instanceSet": {"SS": ["i-04ae114f5330ba500"]},
    "status": {"S": "ACTIVE"},
}


@pytest.fixture
def create_group_event():
    with open("./test/event/create_group_event.json", "r") as f:
        return json.load(f)


@pytest.fixture
def delete_group_event():
    with open("./test/event/delete_group_event.json", "r") as f:
        return json.load(f)


@pytest.fixture
def list_group_event():
    with open("./test/event/list_group_event.json", "r") as f:
        return json.load(f)


@pytest.fixture
def update_group_event():
    with open("./test/event/update_group_event.json", "r") as f:
        return json.load(f)


@pytest.fixture
def ddb_client():
    with mock_dynamodb():
        region = os.environ.get("AWS_REGION")

        _ddb_client = boto3.client("dynamodb", region_name=region)
        instance_group_table_name = os.environ.get("INSTRANCEGROUP_TABLE")
        _ddb_client.create_table(
            TableName=instance_group_table_name,
            KeySchema=[{"AttributeName": "id", "KeyType": "HASH"}],
            AttributeDefinitions=[{"AttributeName": "id", "AttributeType": "S"}],
            ProvisionedThroughput={"ReadCapacityUnits": 10, "WriteCapacityUnits": 10},
        )

        data_list = [instance_group_data]
        for data in data_list:
            _ddb_client.put_item(TableName=instance_group_table_name, Item=data)

        yield


@pytest.fixture
def eventbridge_client():
    with mock_events():
        region = os.environ.get("AWS_REGION")
        event_client = boto3.client("events", region_name=region)
        event_rule_name = os.environ.get("EVENTBRIDGE_RULE")

        event_client.put_rule(
            Name=event_rule_name,
            ScheduleExpression="cron(40 16 21 4 ? ?)",
            State="ENABLED",
            Description="schedule ec2 agent status check",
        )

        yield


def test_lambda_handler_group(
    create_group_event,
    delete_group_event,
    list_group_event,
    update_group_event,
    ddb_client,
    eventbridge_client,
):
    # Can only import here, as the environment variables need to be set first.
    import lambda_function

    lambda_function.lambda_handler(create_group_event, None)

    get_response = lambda_function.lambda_handler(list_group_event, None)
    assert get_response["total"] == 2
    assert {
        "id": "fa2eacd9-fafe-4341-b6ee-e2e2682d7dd4",
        "groupName": "test-1",
        "createdDt": "2022-05-17T05:45:45Z",
        "instanceSet": ["i-04ae114f5330ba500"],
    } in get_response["instanceGroups"]

    lambda_function.lambda_handler(delete_group_event, None)

    # Test upadet the group name
    lambda_function.lambda_handler(
        {
            "arguments": {
                "id": "fa2eacd9-fafe-4341-b6ee-e2e2682d7dd4",
                "groupName": "test-3",
                "instanceSet": ["i-04ae114f5330ba500", "i-04ae114f5330ba501"],
            },
            "info": {
                "fieldName": "updateInstanceGroup",
                "parentTypeName": "Mutation",
                "variables": {
                    "id": "",
                    "groupName": "test-3",
                    "instanceSet": ["i-04ae114f5330ba500", "i-04ae114f5330ba501"],
                },
            },
        },
        None,
    )


def test_delete_all_instance_group(delete_group_event, ddb_client, eventbridge_client):
    import lambda_function
    # Test Delete the Instance Group
    lambda_function.lambda_handler(delete_group_event, None)


def test_id_not_found(ddb_client, eventbridge_client):
    import lambda_function

    with pytest.raises(lambda_function.APIException):
        lambda_function.lambda_handler(
            {
                "arguments": {
                    "id": "not_exist",
                    "groupName": "test-3",
                    "instanceSet": ["i-04ae114f5330ba500", "i-04ae114f5330ba501"],
                },
                "info": {
                    "fieldName": "updateInstanceGroup",
                    "parentTypeName": "Mutation",
                    "variables": {},
                },
            },
            None,
        )


def test_args_error(ddb_client, eventbridge_client):
    import lambda_function

    with pytest.raises(RuntimeError):
        lambda_function.lambda_handler(
            {
                "arguments": {
                    "id": "not_exist",
                    "groupName": "test-3",
                    "instanceSet": ["i-04ae114f5330ba500", "i-04ae114f5330ba501"],
                },
                "info": {
                    "fieldName": "NoExistMethos",
                    "parentTypeName": "Mutation",
                    "variables": {},
                },
            },
            None,
        )
