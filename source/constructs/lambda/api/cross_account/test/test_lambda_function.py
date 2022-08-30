# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import json
import pytest
import os
import boto3

from moto import (
    mock_dynamodb,
    mock_iam,
)


@pytest.fixture
def ddb_client():
    with mock_dynamodb():
        ddb = boto3.resource("dynamodb", region_name=os.environ.get("AWS_REGION"))
        sub_account_link_table = ddb.create_table(
            TableName=os.environ.get("SUB_ACCOUNT_LINK_TABLE_NAME"),
            KeySchema=[{"AttributeName": "id", "KeyType": "HASH"}],
            AttributeDefinitions=[{"AttributeName": "id", "AttributeType": "S"}],
            ProvisionedThroughput={"ReadCapacityUnits": 5, "WriteCapacityUnits": 5},
        )

        with sub_account_link_table.batch_writer() as batch:
            batch.put_item(
                Item={
                    "agentConfDoc": "CrossAccount-FluentBitConfigDownloading-6MPXkhKrK4II",
                    "agentInstallDoc": "CrossAccount-FluentBitDocumentInstallation-FgTWXJU7Jj0P",
                    "createdDt": "2022-06-21T08:20:45Z",
                    "id": "8bd2c371-07d7-41e2-9095-8bd9e26cb672",
                    "status": "ACTIVE",
                    "subAccountBucketName": "crossaccount-loghubloggingbucket0fa53b76-tbeb1h6udhav",
                    "subAccountId": "123456789012",
                    "subAccountName": "sub-account-02",
                    "subAccountStackId": "arn:aws:cloudformation:us-east-1:123456789012:stack/CrossAccount/ff21",
                    "subAccountRoleArn": "arn:aws:iam::123456789012:role/CrossAccount-CrossAccountRoleFACE29D1",
                    "subAccountKMSKeyArn": "arn:aws:kms:us-east-1:123456789012:key/16ae67ab-0991-4ddb-a65b-1dd91cec52dd"
                }
            )
            batch.put_item(
                Item={
                    "agentConfDoc": "CrossAccount-FluentBitConfigDownloading-6MPXkhKrK4II",
                    "agentInstallDoc": "CrossAccount-FluentBitDocumentInstallation-FgTWXJU7Jj0P",
                    "createdDt": "2022-06-21T08:20:45Z",
                    "id": "8bd2c371-07d7-41e2-9095-8bd9e26cb620",
                    "status": "ACTIVE",
                    "subAccountBucketName": "crossaccount-loghubloggingbucket0fa53b76-tbeb1h6udhav",
                    "subAccountId": "123456789020",
                    "subAccountName": "sub-account-11",
                    "subAccountStackId": "arn:aws:cloudformation:us-east-1:123456789012:stack/CrossAccount/ff21",
                    "subAccountRoleArn": "arn:aws:iam::123456789012:role/CrossAccount-CrossAccountRoleFACE29D1",
                    "subAccountKMSKeyArn": "arn:aws:kms:us-east-1:123456789012:key/16ae67ab-0991-4ddb-a65b-1dd91cec52dd"
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

        yield


def test_lambda_handler(ddb_client, iam_client):
    import lambda_function

    # Test deleting an existing linked account
    lambda_function.lambda_handler(
        {
            "arguments": {
                "id": "8bd2c371-07d7-41e2-9095-8bd9e26cb672",
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
                "subAccountBucketName": "crossaccount-loghubloggingbucket0fa53b76-tbeb1h6udhav",
                "subAccountId": "123456789011",
                "subAccountName": "sub-account-01",
                "subAccountStackId": "arn:aws:cloudformation:us-east-1:123456789012:stack/CrossAccount/ff21",
                "subAccountRoleArn": "arn:aws:iam::123456789012:role/CrossAccount-CrossAccountRoleFACE29D1",
                "subAccountKMSKeyArn": "arn:aws:kms:us-east-1:123456789012:key/16ae67ab-0991-4ddb-a65b-1dd91cec52dd"
            },
            "info": {
                "fieldName": "createSubAccountLink",
                "parentTypeName": "Mutation",
                "variables": {},
            },
        },
        None,
    )

    # Test updating an existed linked account
    lambda_function.lambda_handler(
        {
            "arguments": {
                "id": "8bd2c371-07d7-41e2-9095-8bd9e26cb620",
                "subAccountVpcId": "vpc-0f0ec3719e2b45b9a",
                "subAccountPublicSubnetIds": "subnet-0beacf91077d910aa,subnet-0beacf91077d910ac",
                "agentConfDoc": "CrossAccount-FluentBitConfigDownloading-6MPXkhKrK4II",
                "agentInstallDoc": "CrossAccount-FluentBitDocumentInstallation-FgTWXJU7Jj0P",
                "status": "ACTIVE",
                "subAccountBucketName": "crossaccount-loghubloggingbucket0fa53b76-tbeb1h6udhav",
                "subAccountId": "123456789020",
                "subAccountName": "sub-account-11",
                "subAccountStackId": "arn:aws:cloudformation:us-east-1:123456789012:stack/CrossAccount/ff21",
                "subAccountRoleArn": "arn:aws:iam::123456789012:role/CrossAccount-CrossAccountRoleFACE29D1",
                "subAccountKMSKeyArn": "arn:aws:kms:us-east-1:123456789012:key/16ae67ab-0991-4ddb-a65b-1dd91cec52dd"
            },
            "info": {
                "fieldName": "updateSubAccountLink",
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
                "accountId": "123456789011",
                "region": "us-east-1",
            },
            "info": {
                "fieldName": "getSubAccountLinkByAccountIdRegion",
                "parentTypeName": "Query",
                "variables": {},
            },
        },
        None,
    )
    assert res is not None
    with pytest.raises(lambda_function.APIException):
        lambda_function.lambda_handler(
            {
                "arguments": {
                    "accountId": "no-exist-id",
                    "region": "us-east-1",
                },
                "info": {
                    "fieldName": "getSubAccountLinkByAccountIdRegion",
                    "parentTypeName": "Query",
                    "variables": {},
                },
            },
            None,
        )

    # Test adding a duplicate linked account
    with pytest.raises(lambda_function.APIException):
        lambda_function.lambda_handler(
            {
                "arguments": {
                    "agentConfDoc": "CrossAccount-FluentBitConfigDownloading-6MPXkhKrK4II",
                    "agentInstallDoc": "CrossAccount-FluentBitDocumentInstallation-FgTWXJU7Jj0P",
                    "status": "ACTIVE",
                    "subAccountBucketName": "crossaccount-loghubloggingbucket0fa53b76-tbeb1h6udhav",
                    "subAccountId": "123456789011",
                    "subAccountName": "sub-account-03",
                    "subAccountStackId": "arn:aws:cloudformation:us-east-1:123456789012:stack/CrossAccount/ff21",
                    "subAccountRoleArn": "arn:aws:iam::123456789012:role/CrossAccount-CrossAccountRoleFACE29D1",
                    "subAccountKMSKeyArn": "arn:aws:kms:us-east-1:123456789012:key/16ae67ab-0991-4ddb-a65b-1dd91cec52dd"
                },
                "info": {
                    "fieldName": "createSubAccountLink",
                    "parentTypeName": "Mutation",
                    "variables": {},
                },
            },
            None,
        )

    # Test adding a duplicate accountName
    with pytest.raises(lambda_function.APIException):
        lambda_function.lambda_handler(
            {
                "arguments": {
                    "agentConfDoc": "CrossAccount-FluentBitConfigDownloading-6MPXkhKrK4II",
                    "agentInstallDoc": "CrossAccount-FluentBitDocumentInstallation-FgTWXJU7Jj0P",
                    "status": "ACTIVE",
                    "subAccountBucketName": "crossaccount-loghubloggingbucket0fa53b76-tbeb1h6udhav",
                    "subAccountId": "123456789014",
                    "subAccountName": "sub-account-01",
                    "subAccountStackId": "arn:aws:cloudformation:us-east-1:123456789012:stack/CrossAccount/ff21",
                    "subAccountRoleArn": "arn:aws:iam::123456789012:role/CrossAccount-CrossAccountRoleFACE29D1",
                    "subAccountKMSKeyArn": "arn:aws:kms:us-east-1:123456789012:key/16ae67ab-0991-4ddb-a65b-1dd91cec52dd"
                },
                "info": {
                    "fieldName": "createSubAccountLink",
                    "parentTypeName": "Mutation",
                    "variables": {},
                },
            },
            None,
        )

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

    # Test the unknow action
    with pytest.raises(RuntimeError):
        lambda_function.lambda_handler(
            {
                "arguments": {
                    "id": "8bd2c371-07d7-41e2-9095-8bd9e26cb672",
                },
                "info": {
                    "fieldName": "unknownAction",
                    "parentTypeName": "Mutation",
                    "variables": {},
                },
            },
            None,
        )
