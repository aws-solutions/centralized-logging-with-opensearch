# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0


import os
import boto3
import pytest
import json

from moto import mock_dynamodb, mock_sts, mock_iam
from commonlib import LinkAccountHelper
from commonlib.exception import APIException

partition_key = "subAccountId"
sort_key = "region"


def write_data(ddb_table):
    with ddb_table.batch_writer() as batch:
        batch.put_item(
            Item={
                partition_key: "111122223333",
                sort_key: "us-east-1",
                "agentConfDoc": "CrossAccount-FluentBitConfigDownloading-6MPXkhKrK4II",
                "agentInstallDoc": "CrossAccount-FluentBitDocumentInstallation-FgTWXJU7Jj0P",
                "createdAt": "2022-06-20T08:20:45Z",
                "status": "ACTIVE",
                "subAccountBucketName": "crossaccount-solutionloggingbucket0fa53b76-tbeb1h6udhav",
                "subAccountName": "sub-account-01",
                "subAccountStackId": "arn:aws:cloudformation:us-east-1:xxx:stack/CrossAccount/ff21",
                "subAccountRoleArn": "arn:aws:iam::xxx:role/CrossAccount-CrossAccountRoleFACE29D1",
                "subAccountKMSKeyArn": "arn:aws:kms:us-east-1:xxx:key/16ae67ab-0991-4ddb-a65b-1dd91cec52dd",
            }
        )


class TestLinkAccountHelper:
    mock_dynamodb = mock_dynamodb()
    mock_sts = mock_sts()
    mock_iam = mock_iam()

    def setup(self):
        default_region = os.environ.get("AWS_REGION")
        self.mock_dynamodb.start()
        self.mock_sts.start()
        self.mock_iam.start()
        self.account_table_name = "test-table"

        self.ddb_client = boto3.resource("dynamodb", region_name=default_region)
        self.iam_client = boto3.client("iam", region_name=default_region)

        account_table = self.ddb_client.create_table(
            TableName=self.account_table_name,
            KeySchema=[
                {"AttributeName": partition_key, "KeyType": "HASH"},
                {"AttributeName": sort_key, "KeyType": "RANGE"},
            ],
            AttributeDefinitions=[
                {"AttributeName": partition_key, "AttributeType": "S"},
                {"AttributeName": sort_key, "AttributeType": "S"},
            ],
            ProvisionedThroughput={"ReadCapacityUnits": 5, "WriteCapacityUnits": 5},
        )

        self.role_name = "CWL_MONITOR_ROLE_NAME"
        assume_role_policy_document = {
            "Version": "2012-10-17",
            "Statement": [
                {
                    "Effect": "Allow",
                    "Principal": {"Service": "ec2.amazonaws.com"},
                    "Action": "sts:AssumeRole",
                }
            ],
        }

        resp = self.iam_client.create_role(
            RoleName=self.role_name,
            AssumeRolePolicyDocument=json.dumps(assume_role_policy_document),
        )
        os.environ["CWL_MONITOR_ROLE_NAME"] = self.role_name
        os.environ["CWL_MONITOR_ROLE_ARN"] = resp["Role"]["Arn"]

        self.acc_helper = LinkAccountHelper(self.account_table_name)
        write_data(account_table)

    def tearDown(self):
        self.mock_dynamodb.stop()
        self.mock_sts.stop()
        self.mock_iam.stop()

    def test_link_account_ops(self):
        """Test the CRUD of link accounts"""
        assert self.acc_helper.default_account_id == os.environ.get("MOTO_ACCOUNT_ID")
        assert self.acc_helper.default_region == os.environ.get("AWS_REGION")

        _, accounts = self.acc_helper.list_sub_account_links()
        assert len(accounts) == 1

        account1 = self.acc_helper.get_link_account(account_id="111122223333")
        assert account1 is not None
        assert account1["subAccountName"] == "sub-account-01"

        self.acc_helper.update_link_account(
            account_id="111122223333", uploading_event_topic_arn="arn:topic"
        )
        account1 = self.acc_helper.get_link_account(account_id="111122223333")
        assert "subAccountFlbConfUploadingEventTopicArn" in account1
        assert (
            account1.get("subAccountFlbConfUploadingEventTopicArn", "") == "arn:topic"
        )

        account2 = self.acc_helper.get_link_account()
        assert account2 == {}

        with pytest.raises(APIException, match="ACCOUNT_NOT_FOUND"):
            account2 = self.acc_helper.get_link_account(account_id="444455556666")

        self.acc_helper.delete_sub_account_link(account_id="111122223333")

        _, accounts = self.acc_helper.list_sub_account_links()
        assert len(accounts) == 0

        extra = {
            "agentConfDoc": "CrossAccount-FluentBitConfigDownloading-6MPXkhKrK4II",
            "agentInstallDoc": "CrossAccount-FluentBitDocumentInstallation-FgTWXJU7Jj0P",
            "subAccountBucketName": "crossaccount-solutionloggingbucket0fa53b76-tbeb1h6udhav",
            "subAccountName": "sub-account-01",
            "subAccountStackId": "arn:aws:cloudformation:us-east-1:xxx:stack/CrossAccount/ff21",
            "subAccountRoleArn": "arn:aws:iam::xxx:role/CrossAccount-CrossAccountRoleFACE29D1",
            "subAccountKMSKeyArn": "arn:aws:kms:us-east-1:xxx:key/16ae67ab-0991-4ddb-a65b-1dd91cec52dd",
        }
        self.acc_helper.create_sub_account_link(account_id="111122223333", **extra)
        _, accounts = self.acc_helper.list_sub_account_links()
        assert len(accounts) == 1

        with pytest.raises(APIException, match="ACCOUNT_ALREADY_EXISTS"):
            self.acc_helper.create_sub_account_link(account_id="111122223333", **extra)

        # Test the trust relation ship update
        response = self.iam_client.get_role(RoleName=self.role_name)

        trust_policy = response["Role"]["AssumeRolePolicyDocument"]
        assert trust_policy == {
            "Version": "2012-10-17",
            "Statement": [
                {
                    "Effect": "Allow",
                    "Principal": {"AWS": "arn:aws:iam::111122223333:root"},
                    "Action": "sts:AssumeRole",
                    "Condition": {},
                },
                {
                    "Effect": "Allow",
                    "Principal": {"Service": "ec2.amazonaws.com"},
                    "Action": "sts:AssumeRole",
                },
            ],
        }
