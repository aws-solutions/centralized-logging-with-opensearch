# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import json
import pytest
import os
import boto3

from moto import (
    mock_dynamodb,
    mock_iam,
    mock_sts,
    mock_events,
)

from commonlib.exception import APIException


@pytest.fixture
def ddb_client():
    with mock_dynamodb():
        ddb = boto3.resource("dynamodb", region_name=os.environ.get("AWS_REGION"))
        sub_account_link_table = ddb.create_table(
            TableName=os.environ.get("SUB_ACCOUNT_LINK_TABLE_NAME"),
            KeySchema=[
                {"AttributeName": "subAccountId", "KeyType": "HASH"},
                {"AttributeName": "region", "KeyType": "RANGE"},
            ],
            AttributeDefinitions=[
                {"AttributeName": "subAccountId", "AttributeType": "S"},
                {"AttributeName": "region", "AttributeType": "S"},
            ],
            ProvisionedThroughput={"ReadCapacityUnits": 5, "WriteCapacityUnits": 5},
        )

        with sub_account_link_table.batch_writer() as batch:
            batch.put_item(
                Item={
                    "agentConfDoc": "CrossAccount-FluentBitConfigDownloading-6MPXkhKrK4II",
                    "agentInstallDoc": "CrossAccount-FluentBitDocumentInstallation-FgTWXJU7Jj0P",
                    "createdAt": "2022-06-21T08:20:45Z",
                    "id": "8bd2c371-07d7-41e2-9095-8bd9e26cb672",
                    "status": "ACTIVE",
                    "subAccountBucketName": "amzn-s3-demo-logging-bucket",
                    "subAccountId": "111122223333",
                    "region": "us-east-1",
                    "subAccountName": "sub-account-02",
                    "subAccountStackId": "arn:aws:cloudformation:us-east-1:111122223333:stack/CrossAccount/ff21",
                    "subAccountRoleArn": "arn:aws:iam::111122223333:role/CrossAccount-CrossAccountRoleFACE29D1",
                    "subAccountKMSKeyArn": "arn:aws:kms:us-east-1:111122223333:key/16ae67ab-0991-4ddb-a65b-1dd91cec52dd",
                }
            )
            batch.put_item(
                Item={
                    "agentConfDoc": "CrossAccount-FluentBitConfigDownloading-6MPXkhKrK4II",
                    "agentInstallDoc": "CrossAccount-FluentBitDocumentInstallation-FgTWXJU7Jj0P",
                    "createdAt": "2022-06-21T08:20:45Z",
                    "id": "8bd2c371-07d7-41e2-9095-8bd9e26cb620",
                    "status": "ACTIVE",
                    "subAccountBucketName": "amzn-s3-demo-logging-bucket",
                    "subAccountId": "000000000000",
                    "region": "us-east-1",
                    "subAccountName": "sub-account-11",
                    "subAccountStackId": "arn:aws:cloudformation:us-east-1:111122223333:stack/CrossAccount/ff21",
                    "subAccountRoleArn": "arn:aws:iam::111122223333:role/CrossAccount-CrossAccountRoleFACE29D1",
                    "subAccountKMSKeyArn": "arn:aws:kms:us-east-1:111122223333:key/16ae67ab-0991-4ddb-a65b-1dd91cec52dd",
                }
            )

        yield


@pytest.fixture
def iam_client():
    with mock_iam():
        region = os.environ.get("AWS_REGION")
        iam = boto3.client("iam", region_name=region)
        lambda_base_policy = {
            "Version": "2012-10-17",
            "Statement": [
                {
                    "Effect": "Allow",
                    "Action": [
                        "logs:CreateLogGroup",
                        "logs:CreateLogStream",
                        "logs:PutLogEvents",
                    ],
                    "Resource": "*",
                }
            ],
        }
        response = iam.create_policy(
            PolicyName="central_assume_role_policy",
            PolicyDocument=json.dumps(lambda_base_policy),
        )
        os.environ["CENTRAL_ASSUME_ROLE_POLICY_ARN"] = response["Policy"]["Arn"]

        # Create the central cloudwatch log role for main account and sub account agent to put log
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

        role_name = os.environ["CWL_MONITOR_ROLE_NAME"]
        resp = iam.create_role(
            RoleName=role_name,
            AssumeRolePolicyDocument=json.dumps(assume_role_policy_document),
        )
        os.environ["CWL_MONITOR_ROLE_ARN"] = resp["Role"]["Arn"]

        yield


@mock_sts
@mock_events
def test_lambda_handler(ddb_client, iam_client):
    import lambda_function

    # Test deleting an existing linked account
    lambda_function.lambda_handler(
        {
            "arguments": {
                "subAccountId": "111122223333",
            },
            "info": {
                "fieldName": "deleteSubAccountLink",
                "parentTypeName": "Mutation",
                "variables": {},
            },
        },
        None,
    )

    # Test adding an linked account
    lambda_function.lambda_handler(
        {
            "arguments": {
                "agentConfDoc": "CrossAccount-FluentBitConfigDownloading-6MPXkhKrK4II",
                "agentInstallDoc": "CrossAccount-FluentBitDocumentInstallation-FgTWXJU7Jj0P",
                "status": "ACTIVE",
                "subAccountBucketName": "amzn-s3-demo-logging-bucket",
                "subAccountId": "444455556666",
                "subAccountName": "sub-account-01",
                "subAccountStackId": "arn:aws:cloudformation:us-east-1:111122223333:stack/CrossAccount/ff21",
                "subAccountRoleArn": "arn:aws:iam::111122223333:role/CrossAccount-CrossAccountRoleFACE29D1",
                "subAccountKMSKeyArn": "arn:aws:kms:us-east-1:111122223333:key/16ae67ab-0991-4ddb-a65b-1dd91cec52dd",
            },
            "info": {
                "fieldName": "createSubAccountLink",
                "parentTypeName": "Mutation",
                "variables": {},
            },
        },
        None,
    )

    # Test get an linked account by account id and region
    res = lambda_function.lambda_handler(
        {
            "arguments": {
                "subAccountId": "444455556666",
                "region": "us-east-1",
            },
            "info": {
                "fieldName": "getSubAccountLink",
                "parentTypeName": "Query",
                "variables": {},
            },
        },
        None,
    )
    assert res is not None

    # Test get an linked account by an invalid account id
    with pytest.raises(APIException, match="ACCOUNT_NOT_FOUND"):
        lambda_function.lambda_handler(
            {
                "arguments": {
                    "subAccountId": "999999999999",
                    "region": "us-east-1",
                },
                "info": {
                    "fieldName": "getSubAccountLink",
                    "parentTypeName": "Query",
                    "variables": {},
                },
            },
            None,
        )

    # Test list linked accounts
    response = lambda_function.lambda_handler(
        {
            "arguments": {},
            "info": {
                "fieldName": "listSubAccountLinks",
                "parentTypeName": "Query",
                "variables": {},
            },
        },
        None,
    )

    assert "total" in response
    assert response["total"] == 2
