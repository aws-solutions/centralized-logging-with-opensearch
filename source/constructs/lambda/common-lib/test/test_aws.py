# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0


import json
import os
import boto3
from commonlib.aws import (
    create_log_group,
    get_bucket_location,
    verify_s3_bucket_prefix_overlap_for_event_notifications,
)
from commonlib.exception import APIException
import pytest

from moto import mock_s3, mock_dynamodb, mock_iam, mock_sts, mock_logs
from boto3.dynamodb.conditions import Attr
from moto.core import DEFAULT_ACCOUNT_ID as ACCOUNT_ID

from commonlib import AWSConnection, DynamoDBUtil

DDB_TABLE_NAME = "DDB_TABLE_NAME"


@pytest.fixture
def ddb_client():
    with mock_dynamodb():
        ddb = boto3.resource("dynamodb", region_name="us-east-1")
        table = ddb.create_table(
            TableName=DDB_TABLE_NAME,
            KeySchema=[{"AttributeName": "id", "KeyType": "HASH"}],
            AttributeDefinitions=[
                {"AttributeName": "id", "AttributeType": "S"},
                {"AttributeName": "name", "AttributeType": "S"},
            ],
            ProvisionedThroughput={"ReadCapacityUnits": 10, "WriteCapacityUnits": 10},
            GlobalSecondaryIndexes=[
                {
                    "IndexName": "test_gsi",
                    "KeySchema": [{"AttributeName": "name", "KeyType": "HASH"}],
                    "Projection": {"ProjectionType": "ALL"},
                    "ProvisionedThroughput": {
                        "ReadCapacityUnits": 1,
                        "WriteCapacityUnits": 1,
                    },
                }
            ],
        )
        data_list = [
            {
                "id": "001",
                "name": "name1",
                "age": 30,
            },
            {
                "id": "002",
                "name": "name2",
                "age": 20,
            },
        ]
        with table.batch_writer() as batch:
            for data in data_list:
                batch.put_item(Item=data)

        yield


class TestAWSConnection:
    mock_s3 = mock_s3()

    def setup_method(self):
        self.conn = AWSConnection()
        self.region = os.environ.get("AWS_REGION")
        assert self.region == "us-east-1"
        self.bucket_name = "test-bucket"
        self.mock_s3.start()
        boto_s3 = boto3.resource("s3", region_name=self.region)
        # Create the bucket
        boto_s3.create_bucket(Bucket=self.bucket_name)

    def teardown_method(self):
        print("Done")
        self.mock_s3.stop()

    def test_get_client(self):
        # should be able to use the get_client same as boto3.client()
        s3 = self.conn.get_client("s3")
        response = s3.list_buckets()

        buckets = response["Buckets"]
        assert len(buckets) == 1

        # should be able to use the get_client same as boto3.resource()
        s3_resource = self.conn.get_client(
            "s3", client_type="resource", region_name="us-east-1"
        )
        bucket = s3_resource.Bucket(self.bucket_name)
        assert bucket.creation_date


@mock_iam
@mock_sts
def test_get_client_assume_role():
    iam_client = boto3.client("iam")
    trust_policy_document = {
        "Version": "2012-10-17",
        "Statement": {
            "Effect": "Allow",
            "Principal": {"AWS": f"arn:aws:iam::{ACCOUNT_ID}:root"},
            "Action": "sts:AssumeRole",
        },
    }
    role_name = "test-role"
    role = iam_client.create_role(
        RoleName=role_name, AssumeRolePolicyDocument=json.dumps(trust_policy_document)
    )["Role"]
    role_arn = role["Arn"]

    conn = AWSConnection()
    s3 = conn.get_client("s3", sts_role_arn=role_arn)

    assert s3 is not None


@mock_logs
def test_create_log_group():
    client = AWSConnection().get_client("logs")

    create_log_group(client, "helloworld")
    create_log_group(client, "helloworld")

    with pytest.raises(Exception):
        create_log_group(client, "a" * 1000)


@mock_s3
def test_get_bucket_location():
    region_name = "us-east-1"
    s3 = AWSConnection().get_client("s3", region_name=region_name)
    bucket_name = "mybucket"
    s3.create_bucket(Bucket=bucket_name)
    assert region_name == get_bucket_location(s3, bucket_name)

    region_name = "us-west-2"
    s3 = AWSConnection().get_client("s3", region_name=region_name)
    bucket_name = "mybucket2"
    s3.create_bucket(
        Bucket=bucket_name,
        CreateBucketConfiguration={"LocationConstraint": region_name},
    )
    assert region_name == get_bucket_location(s3, bucket_name)


@mock_s3
def test_overlap():
    s3 = AWSConnection().get_client("s3", region_name="us-east-1")
    bucket_name = "mybucket"
    s3.create_bucket(Bucket=bucket_name)

    # 添加notification配置
    s3.put_bucket_notification_configuration(
        Bucket=bucket_name,
        NotificationConfiguration={
            "LambdaFunctionConfigurations": [
                {
                    "Events": ["s3:ObjectCreated:*"],
                    "LambdaFunctionArn": "arn:aws:lambda:us-east-1:123456789012:function:myLambda",
                    "Filter": {
                        "Key": {"FilterRules": [{"Name": "prefix", "Value": "images/"}]}
                    },
                }
            ]
        },
    )

    # # 测试重叠
    with pytest.raises(APIException) as excinfo:
        verify_s3_bucket_prefix_overlap_for_event_notifications(
            s3, bucket_name, "images/cats"
        )
    # 验证异常信息
    assert "overlapped" in str(excinfo.value)


@mock_s3
def test_non_overlap():
    bucket_name = "mybucket"
    s3 = AWSConnection().get_client("s3", region_name="us-east-1")
    s3.create_bucket(Bucket=bucket_name)
    # 添加notification配置
    s3.put_bucket_notification_configuration(
        Bucket=bucket_name,
        NotificationConfiguration={
            "LambdaFunctionConfigurations": [
                {
                    "Events": ["s3:ObjectCreated:*"],
                    "LambdaFunctionArn": "arn:aws:lambda:us-east-1:123456789012:function:myLambda",
                    "Filter": {
                        "Key": {"FilterRules": [{"Name": "prefix", "Value": "images/"}]}
                    },
                }
            ]
        },
    )

    # 测试不重叠
    verify_s3_bucket_prefix_overlap_for_event_notifications(s3, bucket_name, "logs/")


def test_ddb_utils_get_item(ddb_client):
    u = DynamoDBUtil("DDB_TABLE_NAME")
    item = u.get_item({"id": "001"})

    assert item == {
        "id": "001",
        "name": "name1",
        "age": 30,
    }

    with pytest.raises(Exception, match="Can not find item"):
        u.get_item({"id": "not-found"}, raise_if_not_found=True)


def test_ddb_utils_list_items(ddb_client):
    u = DynamoDBUtil("DDB_TABLE_NAME")
    items = u.list_items(limit=1)

    assert items == [
        {
            "id": "001",
            "name": "name1",
            "age": 30,
        },
    ]

    items = u.list_items(limit=1, index_name="test_gsi")

    assert items == [
        {
            "id": "001",
            "name": "name1",
            "age": 30,
        },
    ]

    items = u.list_items()

    assert items == [
        {
            "id": "001",
            "name": "name1",
            "age": 30,
        },
        {
            "id": "002",
            "name": "name2",
            "age": 20,
        },
    ]

    items = u.list_items(Attr("age").gte(25))

    assert items == [
        {
            "id": "001",
            "name": "name1",
            "age": 30,
        },
    ]

    items = u.list_items(Attr("age").gte(100))

    assert items == []

    items = u.list_items(projection_attribute_names=["age"])

    assert items == [
        {
            "age": 30,
        },
        {
            "age": 20,
        },
    ]


def test_ddb_utils_update_items(ddb_client):
    u = DynamoDBUtil("DDB_TABLE_NAME")
    u.update_item({"id": "001"}, {"age": 35})

    item = u.get_item({"id": "001"})

    assert item == {
        "id": "001",
        "name": "name1",
        "age": 35,
    }


def test_ddb_utils_put_items(ddb_client):
    u = DynamoDBUtil("DDB_TABLE_NAME")
    u.put_item(
        {
            "id": "003",
            "name": "name3",
            "age": 40,
        }
    )

    items = u.list_items()

    assert items == [
        {
            "id": "001",
            "name": "name1",
            "age": 30,
        },
        {
            "id": "002",
            "name": "name2",
            "age": 20,
        },
        {
            "id": "003",
            "name": "name3",
            "age": 40,
        },
    ]


def test_batch_delete_items(ddb_client):
    u = DynamoDBUtil("DDB_TABLE_NAME")
    u.batch_delete_items([{"id": "001"}])

    items = u.list_items()

    assert items == [
        {
            "id": "002",
            "name": "name2",
            "age": 20,
        },
    ]