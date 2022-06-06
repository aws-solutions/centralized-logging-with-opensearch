# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import json
import pytest
import os
import boto3

from moto import (
    mock_dynamodb,
)

test_events = [
    ({"maxResults": 10}, "listInstances"),
]


test_ssm_instances_info_list = [
    {"InstanceId": "1", "PlatformName": "test", "IPAddress": "", "ComputerName": "test-1"}
]

@pytest.fixture(params=test_events)
def test_event(request):
    with open("./test/event/test_event.json", "r") as f:
        event = json.load(f)

        arg, action = request.param
        event["arguments"] = arg
        event["info"]["fieldName"] = action
        print(event)
        return event


@pytest.fixture
def ddb_client():
    with mock_dynamodb():
        ddb = boto3.resource("dynamodb", region_name=os.environ.get("AWS_REGION"))
        ddb.create_table(
            TableName=os.environ.get("INSTANCEMETA_TABLE"),
            KeySchema=[{"AttributeName": "id", "KeyType": "HASH"}],
            AttributeDefinitions=[{"AttributeName": "id", "AttributeType": "S"}],
            ProvisionedThroughput={"ReadCapacityUnits": 5, "WriteCapacityUnits": 5},
        )
        ddb.create_table(
            TableName=os.environ.get("AGENTSTATUS_TABLE"),
            KeySchema=[{"AttributeName": "id", "KeyType": "HASH"}],
            AttributeDefinitions=[{"AttributeName": "id", "AttributeType": "S"}],
            ProvisionedThroughput={"ReadCapacityUnits": 5, "WriteCapacityUnits": 5},
        )

        yield


def mock_list_instance(lambda_function, mocker):
    print("Setup listInstance API mocks")
    ssm_mock = mocker.MagicMock()
    ssm_mock.describe_instance_information.return_value = {
        "InstanceInformationList": test_ssm_instances_info_list,
        "NextToken": ""
    }
    ec2_mock = mocker.MagicMock()
    ec2_mock.describe_tags.return_value = {
        'Tags': []
    }
    mocker.patch.multiple(lambda_function, ssm=ssm_mock, ec2=ec2_mock)


def assert_list_instance_result(result):
    print("Assert listInstance API response")
    assert len(result["instances"]) == 1
    assert result["instances"][0]["name"] == "-"
    assert result["nextToken"] == ""


test_handler = {
    "listInstances": (
        mock_list_instance,
        assert_list_instance_result
    )
}


def test_lambda_handler(mocker, test_event):
    import lambda_function

    # Given API call send to lambda as event
    # And aws service been mocked
    setup_mocks, assertion = test_handler[test_event["info"]["fieldName"]]
    setup_mocks(lambda_function, mocker)

    # When calling lambda_handler to handler API call
    result = lambda_function.lambda_handler(test_event, None)

    # Then API response should be as expected
    assertion(result)


def test_parse_ssm_instance_info(mocker):
    import lambda_function

    # Given a instance info returned from ssm
    ssm_instance_info = test_ssm_instances_info_list[0]
    ec2_mock = mocker.MagicMock()
    ec2_mock.describe_tags.return_value = {
        'Tags': [
            {'Key': 'Name', 'Value': 'test'},
        ]
    }
    mocker.patch.multiple(lambda_function, ec2=ec2_mock)

    # When ssm instance info is parsed
    instance = lambda_function.parse_ssm_instance_info(ssm_instance_info)

    # Then parsed result as expected
    assert instance['name'] == 'test'
    assert instance['id'] == ssm_instance_info['InstanceId']
    assert instance['platformName'] == ssm_instance_info['PlatformName']
    assert instance['ipAddress'] == ssm_instance_info['IPAddress']
