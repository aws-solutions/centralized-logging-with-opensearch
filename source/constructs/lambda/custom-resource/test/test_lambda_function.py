# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import pytest
import os
import boto3
from moto import mock_s3, mock_dynamodb


@pytest.fixture
def s3_client():

    with mock_s3():
        region = os.environ.get("AWS_REGION")

        s3 = boto3.resource("s3", region_name=region)
        # Create the buckets
        # for bucket_name in bucket_names:
        #     s3.create_bucket(Bucket=bucket_name)

        default_bucket = os.environ.get("WEB_BUCKET_NAME")
        s3.create_bucket(Bucket=default_bucket)
        yield


@pytest.fixture
def ddb_client():

    with mock_dynamodb():
        region = os.environ.get("AWS_REGION")

        ddb = boto3.resource("dynamodb", region_name=region)

        eks_deploy_kind_table_name = os.environ.get("EKS_DEPLOY_KIND_TABLE")
        eks_source_table_name = os.environ.get("EKS_LOG_SOURCE_TABLE")
        app_pipeline_table_name = os.environ.get("APP_PIPELINE_TABLE")

        ddb.create_table(
            TableName=eks_deploy_kind_table_name,
            KeySchema=[{"AttributeName": "id", "KeyType": "HASH"}],
            AttributeDefinitions=[{"AttributeName": "id", "AttributeType": "S"}],
            ProvisionedThroughput={"ReadCapacityUnits": 5, "WriteCapacityUnits": 5},
        )
        eks_deploy_kind_table = ddb.Table(eks_deploy_kind_table_name)
        eks_deploy_kind_table.put_item(
            Item={
                "id": "21928529-81f6-48b9-b1bd-603c52fd1e1f",
                "deploymentKind": "DaemonSet",
                "eksClusterId": "2b660db9e4fe44a1a297b61938e98957",
                "createdDt": "2022-11-23T08:37:26Z",
                "updatedDt": "2022-11-23T08:37:26Z",
            }
        )
        ddb.create_table(
            TableName=eks_source_table_name,
            KeySchema=[{"AttributeName": "id", "KeyType": "HASH"}],
            AttributeDefinitions=[{"AttributeName": "id", "AttributeType": "S"}],
            ProvisionedThroughput={"ReadCapacityUnits": 5, "WriteCapacityUnits": 5},
        )
        eks_source_table = ddb.Table(eks_source_table_name)
        eks_source_table.put_item(
            Item={
                "id": "2b660db9e4fe44a1a297b61938e98957",
                "eksClusterArn": "arn:aws:eks:us-east-1:123456789012:cluster/test",
                "eksClusterName": "test",
                "status": "ACTIVE",
                "createdDt": "2022-11-23T09:37:26Z",
                "updatedDt": "2022-11-23T09:37:26Z",
            }
        )
        ddb.create_table(
            TableName=app_pipeline_table_name,
            KeySchema=[{"AttributeName": "id", "KeyType": "HASH"}],
            AttributeDefinitions=[{"AttributeName": "id", "AttributeType": "S"}],
            ProvisionedThroughput={"ReadCapacityUnits": 5, "WriteCapacityUnits": 5},
        )
        app_pipeline_table = ddb.Table(app_pipeline_table_name)
        app_pipeline_table.put_item(
            Item={
                "id": "6683bcd2-befc-4c44-88f1-9501de1853ff",
                "aosParas": {"domainName": "dev"},
                "ec2RoleArn": "test",
                "ec2RoleName": "arn:aws:iam::1234567890:role/AOS-Agent-6683bcd2-befc-4c44-88f1-9501de1853ff",
                "status": "ACTIVE",
                "createdDt": "2022-11-23T09:37:26Z",
            }
        )

        yield


def test_lambda_function(s3_client, ddb_client):
    import lambda_function

    result = lambda_function.lambda_handler(None, None)
    # Expect Execute successfully.
    assert result == "OK"

    region = os.environ.get("AWS_REGION")
    s3 = boto3.resource("s3", region_name=region)

    default_bucket = os.environ.get("WEB_BUCKET_NAME")

    # Expect Config file is uploaded to S3
    obj = s3.Object(default_bucket, "aws-exports.json").get()
    assert "ContentLength" in obj
    assert obj["ContentLength"] > 0

    ddb = boto3.resource("dynamodb", region_name=region)
    eks_deploy_kind_table_name = os.environ.get("EKS_DEPLOY_KIND_TABLE")
    eks_source_table_name = os.environ.get("EKS_LOG_SOURCE_TABLE")
    app_pipeline_table_name = os.environ.get("APP_PIPELINE_TABLE")

    # eks deploy kind table should be empty
    eks_deploy_kind_table = ddb.Table(eks_deploy_kind_table_name)
    resp1 = eks_deploy_kind_table.scan()
    assert len(resp1["Items"]) == 0

    # eks source table should have deployment kind value
    eks_source_table = ddb.Table(eks_source_table_name)
    resp2 = eks_source_table.scan()
    assert len(resp2["Items"]) == 1
    item = resp2["Items"][0]
    assert "deploymentKind" in item
    assert item["deploymentKind"] == "DaemonSet"

    app_pipeline_table = ddb.Table(app_pipeline_table_name)
    resp3 = app_pipeline_table.scan()
    assert len(resp3["Items"]) == 1
    item = resp3["Items"][0]
    assert "aosParas" not in item
    assert "aosParams" in item
    assert "bufferAccessRoleName" in item
    assert "ec2RoleName" not in item
    assert item["bufferType"] == "None"
