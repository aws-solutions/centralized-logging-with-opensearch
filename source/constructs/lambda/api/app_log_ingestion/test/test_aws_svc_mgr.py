# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import os
import boto3
import pytest
from moto import mock_dynamodb, mock_sts
from .conftest import init_ddb


@pytest.fixture
def sts_client():
    with mock_sts():
        boto3.client("sts", region_name=os.environ.get("AWS_REGION"))
        yield


@pytest.fixture
def ddb_client():
    with mock_dynamodb():
        yield init_ddb({
            os.environ["SUB_ACCOUNT_LINK_TABLE_NAME"]: {
                "id": "e6099c4a-7001-4e4a-ab0d-3319f441a04a",
                "agentConfDoc":
                "CrossAccount-FluentBitConfigDownloading-oLGRW4c1kO2E",
                "agentInstallDoc":
                "CrossAccount-FluentBitDocumentInstallation-9d5zIvOSNGUi",
                "createdDt": "2022-07-14T12:34:35Z",
                "region": "us-west-2",
                "status": "ACTIVE",
                "subAccountBucketName":
                "crossaccount-loghubloggingbucket0fa53b76-16pw04457dx1j",
                "subAccountId": "056627083435",
                "subAccountKMSKeyArn":
                "arn:aws:kms:us-west-2:056627083435:key/20cccd33-776b-4bcb-88f2-3a9bd47c02b2",
                "subAccountName": "magic-en",
                "subAccountPublicSubnetIds":
                "subnet-0b6b13021cf0840c0,subnet-01ae8fbe2a0e7ff77",
                "subAccountRoleArn":
                "arn:aws:iam::056627083435:role/CrossAccount-CrossAccountRoleFACE29D1-1KM3QA0O84K34",
                "subAccountStackId":
                "arn:aws:cloudformation:us-west-2:056627083435:stack/CrossAccount/cf324d00-ff8b-11ec-8943-021a55f488dd",
                "subAccountVpcId": "vpc-0327820b5f509ad58"
            }
        })


def test_svc_manager(sts_client, ddb_client):
    from ..util import aws_svc_mgr
    svcManager = aws_svc_mgr.SvcManager()
    document = svcManager.get_document_name(
        "056627083435", aws_svc_mgr.DocumentType.AGENT_CONFIGURATION,
        "us-west-2")

    assert "CrossAccount-FluentBitConfigDownloading-oLGRW4c1kO2E" == document
    sub_acct = svcManager.get_link_account("056627083435", "us-west-2")
    assert "056627083435" in sub_acct.get("subAccountId")
    acct_list = svcManager.get_sub_account_links(1, 1000)
    assert 1 == len(acct_list)

    s3 = svcManager.get_client("056627083435", "dynamodb",
                               aws_svc_mgr.Boto3API.CLIENT)
    s3 = svcManager.get_client("056627083435", "dynamodb",
                               aws_svc_mgr.Boto3API.RESOURCE)

    s3 = svcManager.get_client("056627083435", "dynamodb",
                               aws_svc_mgr.Boto3API.CLIENT, "us-west-1")
    s3 = svcManager.get_client("056627083435", "dynamodb",
                               aws_svc_mgr.Boto3API.RESOURCE, "us-west-2")
