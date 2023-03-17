# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import os
import boto3
import pytest
import io
import zipfile


from moto import mock_dynamodb, mock_sts
from collections.abc import Iterable


def _process_lambda(func_str):
    zip_output = io.BytesIO()
    zip_file = zipfile.ZipFile(zip_output, "w", zipfile.ZIP_DEFLATED)
    zip_file.writestr("lambda_function.py", func_str)
    zip_file.close()
    zip_output.seek(0)
    return zip_output.read()


def get_test_zip_file1():
    pfunc = """
def lambda_handler(event, context):
    print("custom log event")
    return event
"""
    return _process_lambda(pfunc)


def make_graphql_lambda_event(name, args):
    return {"arguments": args, "info": {"fieldName": name}}


def init_ddb(config):
    """
    config = {
        "ddb_table_name": { "id": 123123, "name": "the-name" }
        "ddb_table_name2": [ { "id": 123123, "name": "the-name" }, { ... } ]
    }
    """
    ddb = boto3.resource("dynamodb")
    for table_name, value in config.items():
        table = ddb.create_table(
            TableName=table_name,
            KeySchema=[{"AttributeName": "id", "KeyType": "HASH"}],
            AttributeDefinitions=[{"AttributeName": "id", "AttributeType": "S"}],
            ProvisionedThroughput={"ReadCapacityUnits": 5, "WriteCapacityUnits": 5},
        )

        if isinstance(value, dict):
            table.put_item(Item=value)
        elif isinstance(value, Iterable):
            for v in value:
                table.put_item(Item=v)
        elif value is not None:
            table.put_item(Item=value)
        else:
            pass

    return ddb


@pytest.fixture
def sts_client():
    with mock_sts():
        boto3.client("sts", region_name=os.environ.get("AWS_REGION"))
        yield


@pytest.fixture
def ddb_client():
    with mock_dynamodb():
        yield init_ddb(
            {
                os.environ["SUB_ACCOUNT_LINK_TABLE_NAME"]: {
                    "id": "e6099c4a-7001-4e4a-ab0d-3319f441a04a",
                    "agentConfDoc": "CrossAccount-FluentBitConfigDownloading-oLGRW4c1kO2E",
                    "agentInstallDoc": "CrossAccount-FluentBitDocumentInstallation-9d5zIvOSNGUi",
                    "createdDt": "2022-07-14T12:34:35Z",
                    "region": "us-west-2",
                    "status": "ACTIVE",
                    "subAccountBucketName": "crossaccount-loghubloggingbucket0fa53b76-16pw04457dx1j",
                    "subAccountId": "1234567890AB",
                    "subAccountKMSKeyArn": "arn:aws:kms:us-west-2:1234567890AB:key/20cccd33-776b-4bcb-xxx",
                    "subAccountName": "magic-en",
                    "subAccountPublicSubnetIds": "subnet-0b6b13021cf0840c0,subnet-01ae8fbe2a0e7ff77",
                    "subAccountRoleArn": "arn:aws:iam::1234567890AB:role/CrossAccount-CrossAccountRoleFACE29D1-xxx",
                    "subAccountStackId": "arn:aws:cloudformation:us-west-2:1234567890AB:stack/CrossAccount/cf324d00-xx",
                    "subAccountVpcId": "vpc-0327820b5f509ad58",
                }
            }
        )


def test_svc_manager(sts_client, ddb_client):
    from aws_svc_mgr import SvcManager, Boto3API, DocumentType

    svcManager = SvcManager()
    document = svcManager.get_document_name(
        "1234567890AB", DocumentType.AGENT_CONFIGURATION, "us-west-2"
    )

    assert "CrossAccount-FluentBitConfigDownloading-oLGRW4c1kO2E" == document
    sub_acct = svcManager.get_link_account("1234567890AB", "us-west-2")
    assert "1234567890AB" in sub_acct.get("subAccountId")
    acct_list = svcManager.get_sub_account_links(1, 1000)
    assert 1 == len(acct_list)

    svcManager.get_client("1234567890AB", "dynamodb", Boto3API.CLIENT)
    svcManager.get_client("1234567890AB", "dynamodb", Boto3API.RESOURCE)

    svcManager.get_client("1234567890AB", "dynamodb", Boto3API.CLIENT, "us-west-1")
    svcManager.get_client("1234567890AB", "dynamodb", Boto3API.RESOURCE, "us-west-2")
