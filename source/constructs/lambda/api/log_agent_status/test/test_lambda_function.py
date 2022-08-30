# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import json
import pytest
import os
import boto3
from moto import mock_sts, mock_dynamodb, mock_ssm
from .conftest import init_ddb

class Boto3Mocker:
    def __init__(self, tags=[]):
        self._tags = tags

class SvcManagerMocker:
    def __init__(self, tags=[]):
        self._tags = tags

    def get_client(self, **args):
        return Boto3Mocker(self._tags)

@pytest.fixture
def sts_client():
    with mock_sts():
        boto3.client("sts", region_name=os.environ.get("AWS_REGION"))
        yield

@pytest.fixture
def ddb_client():
    with mock_dynamodb():
        init_ddb({
            os.environ.get("AGENTSTATUS_TABLE"): [
                {
                    "instanceId": "i-01dfa6dc7c3fa3416",
                    "accountId": "",
                    "createDt": "2022-07-10T08:42:26Z",
                    "id": "f571cf40-c674-4c37-b48b-cb0ad6de2d31",
                    "status": "Online",
                    "updatedDt": "2022-07-18T09:05:16Z"
                },
                {
                    "instanceId": "i-0c3fdfaaeefe50b5f",
                    "accountId": "",
                    "createDt": "2022-07-10T08:42:13Z",
                    "id": "Empty_Command_Id",
                    "status": "Not_Installed",
                    "updatedDt": "2022-07-10T08:42:13Z"
                },
                {
                    "instanceId": "i-0c3fdfaaeefe50b6f",
                    "accountId": "",
                    "createDt": "2022-07-10T08:42:13Z",
                    "id": "Empty_Command_Id",
                    "status": "Unknown",
                    "updatedDt": "2022-07-10T08:42:13Z"
                }
            ]
        }, primary_key='instanceId')
        yield

@pytest.fixture
def ddb_client_2():
    with mock_dynamodb():
        init_ddb({
            os.environ.get("AGENTSTATUS_TABLE"): [
                {
                    "instanceId": "i-01dfa6dc7c3fa3416",
                    "accountId": "650618379932",
                    "createDt": "2022-07-10T08:42:26Z",
                    "id": "f571cf40-c674-4c37-b48b-cb0ad6de2d31",
                    "status": "Online",
                    "updatedDt": "2022-07-18T09:05:16Z"
                },
                {
                    "instanceId": "i-0c3fdfaaeefe50b5f",
                    "accountId": "650618379932",
                    "createDt": "2022-07-10T08:42:13Z",
                    "id": "Empty_Command_Id",
                    "status": "Not_Installed",
                    "updatedDt": "2022-07-10T08:42:13Z"
                },
                {
                    "instanceId": "i-0c3fdfaaeefe50b6f",
                    "accountId": "650618379932",
                    "createDt": "2022-07-10T08:42:13Z",
                    "id": "Empty_Command_Id",
                    "status": "Unknown",
                    "updatedDt": "2022-07-10T08:42:13Z"
                }
            ]
        }, primary_key='instanceId')
        yield

@pytest.fixture
def ddb_client_3():
    with mock_dynamodb():
        init_ddb({
            os.environ.get("AGENTSTATUS_TABLE"): []
        }, primary_key='instanceId')
        yield

@pytest.fixture
def ssm_client():
    with mock_ssm():
        region = os.environ.get("AWS_REGION")
        ssm = boto3.client("ssm", region_name=region)

def test_lambda_handler_no_accountId(mocker, sts_client, ssm_client, ddb_client):
    import lambda_function

    lambda_function.lambda_handler(None, None)

def test_lambda_handler_with_accountId(mocker, sts_client, ssm_client, ddb_client_2):
    import lambda_function
    
    svc_manager_mock = mocker.MagicMock()
    svc_manager_mock.return_value = SvcManagerMocker([{'Key': 'Name', 'Value': 'test'}])

    mocker.patch.multiple(lambda_function, SvcManager=svc_manager_mock)

    lambda_function.lambda_handler(None, None)

def test_lambda_handler_with_empty_table(mocker, sts_client, ssm_client, ddb_client_3):
    import lambda_function
    
    svc_manager_mock = mocker.MagicMock()
    svc_manager_mock.return_value = SvcManagerMocker([{'Key': 'Name', 'Value': 'test'}])

    mocker.patch.multiple(lambda_function, SvcManager=svc_manager_mock)

    lambda_function.lambda_handler(None, None)



