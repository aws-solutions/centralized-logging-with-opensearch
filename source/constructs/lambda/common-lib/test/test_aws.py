# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0


import os
import boto3
import pytest

from moto import mock_s3, mock_dynamodb
from boto3.dynamodb.conditions import Attr

from commonlib import AWSConnection, DynamoDBUtil

DDB_TABLE_NAME = "DDB_TABLE_NAME"


@pytest.fixture
def ddb_client():
    with mock_dynamodb():
        ddb = boto3.resource("dynamodb", region_name="us-east-1")
        table = ddb.create_table(
            TableName=DDB_TABLE_NAME,
            KeySchema=[{"AttributeName": "id", "KeyType": "HASH"}],
            AttributeDefinitions=[{"AttributeName": "id", "AttributeType": "S"}],
            ProvisionedThroughput={"ReadCapacityUnits": 10, "WriteCapacityUnits": 10},
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


class TestAWSConnection:
    mock_s3 = mock_s3()

    def setup(self):
        self.conn = AWSConnection()
        self.region = os.environ.get("AWS_REGION")
        assert self.region == "us-east-1"
        self.bucket_name = "test-bucket"
        self.mock_s3.start()
        boto_s3 = boto3.resource("s3", region_name=self.region)
        # Create the bucket
        boto_s3.create_bucket(Bucket=self.bucket_name)

    def tearDown(self):
        print("Done")
        self.mock_s3.stop()

    def test_get_client(self):
        # should be able to use the get_client same as boto3.client()
        s3 = self.conn.get_client("s3")
        response = s3.list_buckets()

        buckets = response["Buckets"]
        assert len(buckets) == 1

        # should be able to use the get_client same as boto3.resource()
        s3_resource = self.conn.get_client("s3", client_type="resource")
        bucket = s3_resource.Bucket(self.bucket_name)
        assert bucket.creation_date


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
