import boto3
import pytest

from moto import mock_cloudformation, mock_dynamodb
from boto3.dynamodb.conditions import Attr
from utils import (
    CfnStack,
    Arn,
    rename_dict_key,
    find_by_parameter_key,
    sqs_url_to_arn,
    first,
)


def test_arn():
    s = "arn:aws:cloudformation:us-west-2:123456789012:stack/CL-Pipe-11523875/565e4850-34f7-11ee-be3b-06f8d17b2073"
    arn = Arn.from_str(s)

    assert arn.partition == "aws"
    assert arn.service == "cloudformation"
    assert arn.region == "us-west-2"
    assert arn.account_id == "123456789012"
    assert arn.resource_type == "stack"
    assert arn.resource_id == "CL-Pipe-11523875/565e4850-34f7-11ee-be3b-06f8d17b2073"
    assert str(arn) == s


def test_rename_dict_key():
    d = dict(a=1)
    rename_dict_key(d, "a", "b")
    rename_dict_key(d, "c", "d")

    assert d == {"b": 1}


def test_find_by_parameter_key():
    params = [
        {"parameterKey": "shardNumbers", "parameterValue": "1"},
        {"parameterKey": "replicaNumbers", "parameterValue": "1"},
        {"parameterKey": "warmAge", "parameterValue": ""},
        {"parameterKey": "coldAge", "parameterValue": ""},
        {"parameterKey": "retainAge", "parameterValue": "180d"},
        {"parameterKey": "rolloverSize", "parameterValue": "30gb"},
        {"parameterKey": "indexSuffix", "parameterValue": "yyyy-MM-dd"},
        {"parameterKey": "codec", "parameterValue": "best_compression"},
        {"parameterKey": "refreshInterval", "parameterValue": "1s"},
    ]

    assert find_by_parameter_key(params, "coldAge") == {
        "parameterKey": "coldAge",
        "parameterValue": "",
    }

    assert find_by_parameter_key(params, "none") is None


def test_sqs_url_to_arn():
    url = "https://sqs.us-west-2.amazonaws.com/123456789012/CL-Pipe-4a2f8930-LogEventDLQ-P3zOGElLZI1d"
    arn = sqs_url_to_arn(url)

    assert arn.service == "sqs"
    assert arn.partition == "aws"
    assert arn.region == "us-west-2"
    assert arn.account_id == "123456789012"
    assert arn.resource == "CL-Pipe-4a2f8930-LogEventDLQ-P3zOGElLZI1d"
    assert arn.resource_type is None


def test_first():
    assert first(iter([])) is None
    assert first(iter([1])) == 1


@mock_cloudformation
def test_cfn_stack():
    template = """
{
    "AWSTemplateFormatVersion": "2010-09-09",
    "Resources": {
        "SQSQueue": {
            "Type": "AWS::SQS::Queue",
            "Properties": {}
        },
        "S3Bucket": {
            "Type": "AWS::S3::Bucket",
            "Properties": {}
        }
    }
}"""
    cf = boto3.client("cloudformation")
    cf.create_stack(StackName="abc", TemplateBody=template)

    stack = CfnStack("abc")
    resources = list(stack.resources())

    assert 2 == len(resources)
    assert resources[0]["LogicalResourceId"] == "SQSQueue"
    assert resources[1]["LogicalResourceId"] == "S3Bucket"

    resources = list(stack.resources_of("AWS::S3::Bucket"))

    assert 1 == len(resources)
    assert resources[0]["LogicalResourceId"] == "S3Bucket"

    resources = list(stack.find_resources("SQS"))
    assert 1 == len(resources)
    assert resources[0]["LogicalResourceId"] == "SQSQueue"


@pytest.fixture
def ddb_client():
    with mock_dynamodb():
        ddb = boto3.resource("dynamodb")
        src_table = ddb.create_table(
            TableName="SRC_TABLE",
            KeySchema=[{"AttributeName": "id", "KeyType": "HASH"}],
            AttributeDefinitions=[{"AttributeName": "id", "AttributeType": "S"}],
            ProvisionedThroughput={"ReadCapacityUnits": 10, "WriteCapacityUnits": 10},
        )
        src_items = [
            {"id": "0", "type": "apple"},
            {"id": "1", "type": "apple"},
            {"id": "2", "type": "orange"},
            {"id": "3", "type": "banana"},
        ]
        with src_table.batch_writer() as batch:
            for each in src_items:
                batch.put_item(Item=each)

        ddb.create_table(
            TableName="DST_TABLE",
            KeySchema=[{"AttributeName": "id", "KeyType": "HASH"}],
            AttributeDefinitions=[{"AttributeName": "id", "AttributeType": "S"}],
            ProvisionedThroughput={"ReadCapacityUnits": 10, "WriteCapacityUnits": 10},
        )
        yield (
            {
                "table_name": "SRC_TABLE",
                "items": src_items,
            },
            {
                "table_name": "DST_TABLE",
                "items": [],
            },
        )


def test_scan_table_items(ddb_client):
    from main import scan_table_items

    src, dst = ddb_client
    table_name = src["table_name"]
    items = src["items"]

    assert items == list(scan_table_items(table_name))

    assert [items[-1]] == list(
        scan_table_items(table_name, filter_expression=Attr("type").eq("banana"))
    )


def test_get_table_item(ddb_client):
    from main import get_table_item

    src, dst = ddb_client
    table_name = src["table_name"]
    items = src["items"]

    assert items[-1] == get_table_item(table_name, dict(id="3"))
    assert None is get_table_item(table_name, dict(id="100"))


def test_copy_table(ddb_client):
    from main import copy_table, scan_table_items

    src, dst = ddb_client

    assert [] == list(scan_table_items(dst["table_name"]))

    copy_table(src["table_name"], dst["table_name"])

    assert src["items"] == list(scan_table_items(dst["table_name"]))

    copy_table(src["table_name"], dst["table_name"], lambda item: dict(**item, n=1))

    assert [
        {"id": "0", "type": "apple", "n": 1},
        {"id": "1", "type": "apple", "n": 1},
        {"id": "2", "type": "orange", "n": 1},
        {"id": "3", "type": "banana", "n": 1},
    ] == list(scan_table_items(dst["table_name"]))
