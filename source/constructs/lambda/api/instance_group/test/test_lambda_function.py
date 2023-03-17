# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import json
import os

import boto3
import pytest
from moto import mock_dynamodb, mock_events, mock_sts, mock_sqs

instance_group_data_ec2 = {
    "id": {"S": "fa2eacd9-fafe-4341-b6ee-e2e2682d7dd4"},
    "createdDt": {"S": "2022-05-17T05:45:45Z"},
    "groupName": {"S": "test-2"},
    "groupType": {"S": "EC2"},
    "instanceSet": {"SS": ["i-04ae114f5330ba500"]},
    "status": {"S": "ACTIVE"},
}

instance_group_data_asg = {
    "id": {"S": "fa2eacd9-fafe-4341-b6ee-e2e2682d7dd5"},
    "createdDt": {"S": "2022-05-17T05:45:45Z"},
    "groupName": {"S": "test-3"},
    "instanceSet": {"SS": ["test-group"]},
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
def add_instances_to_group_event():
    with open("./test/event/add_instances_to_group_event.json", "r") as f:
        return json.load(f)

@pytest.fixture
def delete_instances_from_group_event():
    with open("./test/event/delete_instances_from_group_event.json", "r") as f:
        return json.load(f)

@pytest.fixture
def delete_exist_instances_from_group_event():
    with open("./test/event/delete_exist_instances_from_group_event.json", "r") as f:
        return json.load(f)

@pytest.fixture
def create_instance_group_base_on_asg_event():
    with open("./test/event/create_instance_group_base_on_asg_event.json", "r") as f:
        return json.load(f)

@pytest.fixture
def delete_instance_group_base_on_asg_event():
    with open("./test/event/delete_instance_group_base_on_asg_event.json", "r") as f:
        return json.load(f)

@pytest.fixture
def list_asg_event():
    with open("./test/event/list_asg_event.json", "r") as f:
        return json.load(f)

@pytest.fixture
def sqs_client():
    with mock_sqs():
        region = os.environ.get("AWS_REGION")
        
        _sqs_client = boto3.client("sqs", region_name=region)
        queueName = os.environ.get("INSTANCE_GROUP_MODIFICATION_EVENT_QUEUE_NAME")
        _sqs_client.create_queue(QueueName=queueName)

        yield

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

        data_list = [instance_group_data_ec2]
        data_list.append(instance_group_data_asg)
        for data in data_list:
            _ddb_client.put_item(TableName=instance_group_table_name, Item=data)

        # Mock the Sub account link table
        _ddb_client.create_table(
            TableName=os.environ.get("SUB_ACCOUNT_LINK_TABLE_NAME"),
            KeySchema=[{"AttributeName": "id", "KeyType": "HASH"}],
            AttributeDefinitions=[{"AttributeName": "id", "AttributeType": "S"}],
            ProvisionedThroughput={"ReadCapacityUnits": 5, "WriteCapacityUnits": 5},
        )

        # Mock App Log Ingestion Table
        app_log_ingestion_table_name = os.environ.get("APPLOGINGESTION_TABLE")
        _ddb_client.create_table(
            TableName=app_log_ingestion_table_name,
            KeySchema=[{"AttributeName": "id", "KeyType": "HASH"}],
            AttributeDefinitions=[{"AttributeName": "id", "AttributeType": "S"}],
            ProvisionedThroughput={
                "ReadCapacityUnits": 10,
                "WriteCapacityUnits": 10,
            },
        )

        yield


@pytest.fixture
def sts_client():
    with mock_sts():
        boto3.client("sts", region_name=os.environ.get("AWS_REGION"))
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
    add_instances_to_group_event,
    delete_instances_from_group_event,
    ddb_client,
    sqs_client,
    eventbridge_client,
    sts_client,
):
    # Can only import here, as the environment variables need to be set first.
    import lambda_function

    lambda_function.lambda_handler(create_group_event, None)

    get_response = lambda_function.lambda_handler(list_group_event, None)
    assert get_response["total"] == 3
    assert {
        "id": "fa2eacd9-fafe-4341-b6ee-e2e2682d7dd4",
        "accountId": "123456789012",
        "region": "us-east-1",
        "groupName": "test-2",
        "groupType": "EC2",
        "createdDt": "2022-05-17T05:45:45Z",
        "instanceSet": ["i-04ae114f5330ba500"], 
    } in get_response["instanceGroups"]

def test_delete_all_instance_group(delete_group_event, ddb_client, sqs_client, eventbridge_client, sts_client):
    import lambda_function
    # Test Delete the Instance Group
    lambda_function.lambda_handler(delete_group_event, None)

def test_args_error(ddb_client, sqs_client, eventbridge_client, sts_client):
    import lambda_function

    with pytest.raises(RuntimeError):
        lambda_function.lambda_handler(
            {
                "arguments": {
                    "id": "not_exist",
                    "groupName": "test-1",
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

@mock_sqs
def test_add_instances_to_group(ddb_client, sqs_client, eventbridge_client, sts_client):
    import lambda_function
    # Test add twice the same instance to one group
    lambda_function.lambda_handler(
        {
            "arguments": {
                "sourceId": "fa2eacd9-fafe-4341-b6ee-e2e2682d7dd4",
                "instanceIdSet": ["i-0e0464d25bf022b05"],
            },
            "info": {
                "fieldName": "addInstancesToInstanceGroup",
                "parentTypeName": "Mutation",
                "variables": {},
            },
        },
        None,
    )

def test_delete_nonexist_instances_from_group(delete_instances_from_group_event, ddb_client, sqs_client, eventbridge_client, sts_client):
    import lambda_function
    # Test delete 
    with pytest.raises(Exception):
        lambda_function.lambda_handler(delete_instances_from_group_event, None)

def test_delete_all_instancs_from_group(create_group_event, delete_exist_instances_from_group_event, ddb_client, sqs_client, eventbridge_client, sts_client):
    import lambda_function
    # Test Delete the Instance Group
    lambda_function.lambda_handler(create_group_event, None)
    with pytest.raises(Exception):
        lambda_function.lambda_handler(delete_exist_instances_from_group_event, None)

def test_create_delete_instance_group_base_on_asg(
    create_instance_group_base_on_asg_event,
    delete_instance_group_base_on_asg_event,
    ddb_client,
    eventbridge_client,
    sts_client,
):
    import lambda_function

    lambda_function.lambda_handler(create_instance_group_base_on_asg_event, None)

    lambda_function.lambda_handler(delete_instance_group_base_on_asg_event, None)