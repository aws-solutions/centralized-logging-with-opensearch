# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import os
import boto3

from commonlib.utils import (
    get_kv_from_buffer_param,
    get_resource_from_arn,
    get_name_from_tags,
    get_partition,
    paginate,
    create_stack_name,
    exec_sfn_flow,
)
from commonlib.model import BufferParam
from moto import mock_stepfunctions
from moto.core import DEFAULT_ACCOUNT_ID as ACCOUNT_ID

SFN_DEF = (
    '{"Comment": "An example of the Amazon States Language using a choice state.",'
    '"StartAt": "DefaultState",'
    '"States": '
    '{"DefaultState": {"Type": "Fail","Error": "DefaultStateError","Cause": "No Matches!"}}}'
)


def get_default_role():
    return "arn:aws:iam::" + ACCOUNT_ID + ":role/unknown_sf_role"


def test_get_resource_from_arn():
    s3_arn = "arn:aws:s3:::test-bucket"
    assert get_resource_from_arn(s3_arn) == "test-bucket"

    s3_arn2 = "arn:aws:s3:::my_corporate_bucket/*"
    assert get_resource_from_arn(s3_arn2) == "*"

    iam_role_arn = "arn:aws:iam::123456789012:role/Admin"
    assert get_resource_from_arn(iam_role_arn) == "Admin"

    kdf_arn = "arn:aws:firehose:us-west-2:123456789012:deliverystream/test"
    assert get_resource_from_arn(kdf_arn) == "test"

    vpc_arn = "arn:aws:ec2:us-east-1:123456789012:vpc/vpc-0e9801d129EXAMPLE"
    assert get_resource_from_arn(vpc_arn) == "vpc-0e9801d129EXAMPLE"

    invalid_arn = "abc"
    assert get_resource_from_arn(invalid_arn) == ""


def test_get_name_from_tags():
    tag1 = [{"Key": "abc", "Value": "efg"}]
    assert get_name_from_tags(tag1) == "-"
    tag2 = [
        {"Key": "abc", "Value": "efg"},
        {"Key": "Name", "Value": "hello"},
    ]
    assert get_name_from_tags(tag2) == "hello"


def test_get_partition():
    assert get_partition("cn-north-1") == "aws-cn"
    assert get_partition("us-east-1") == "aws"
    assert get_partition("us-gov-east-1") == "aws-us-gov"


def test_paginate_default_values():
    items = [
        {"id": 1, "name": "John"},
        {"id": 2, "name": "Bob"},
        {"id": 3, "name": "Jane"},
        {"id": 4, "name": "Alice"},
    ]
    total, result = paginate(items)
    assert total == 4
    assert result == [
        {"id": 1, "name": "John"},
        {"id": 2, "name": "Bob"},
        {"id": 3, "name": "Jane"},
        {"id": 4, "name": "Alice"},
    ]


def test_paginate_custom_page_and_count():
    items = [
        {"id": 1, "name": "John"},
        {"id": 2, "name": "Bob"},
        {"id": 3, "name": "Jane"},
        {"id": 4, "name": "Alice"},
    ]
    total, result = paginate(items, page=2, count=3)
    assert total == 4
    assert result == [{"id": 4, "name": "Alice"}]

    total, result = paginate(items, page=10, count=3)
    assert total == 4
    assert result == [
        {"id": 1, "name": "John"},
        {"id": 2, "name": "Bob"},
        {"id": 3, "name": "Jane"},
    ]


def test_paginate_sort_by_field():
    items = [
        {"id": 1, "name": "John"},
        {"id": 2, "name": "Bob"},
        {"id": 3, "name": "Jane"},
        {"id": 4, "name": "Alice"},
    ]
    # desending is true
    total, result = paginate(items, sort_by="name")

    assert total == 4
    assert result == [
        {"id": 1, "name": "John"},
        {"id": 3, "name": "Jane"},
        {"id": 2, "name": "Bob"},
        {"id": 4, "name": "Alice"},
    ]


def test_paginate_sort_by_field_descending_false():
    items = [
        {"id": 1, "name": "John"},
        {"id": 2, "name": "Bob"},
        {"id": 3, "name": "Jane"},
        {"id": 4, "name": "Alice"},
    ]
    total, result = paginate(items, sort_by="name", descending=False)
    assert total == 4
    assert result == [
        {"id": 4, "name": "Alice"},
        {"id": 2, "name": "Bob"},
        {"id": 3, "name": "Jane"},
        {"id": 1, "name": "John"},
    ]


def test_create_stack_name():
    os.environ["STACK_PREFIX"] = "Test"
    id = "abc"
    assert create_stack_name("Haha", id) == "Test-Haha-abc"


@mock_stepfunctions
def test_exec_sfn_flow():
    client = boto3.client("stepfunctions")
    response = client.create_state_machine(
        name="sample-state", definition=str(SFN_DEF), roleArn=get_default_role()
    )
    arn = response["stateMachineArn"]

    exec_sfn_flow(
        client,
        arn,
        "flowid",
    )


def test_get_kv_from_buffer_param():
    assert "Value1" == get_kv_from_buffer_param("Key1", [
        BufferParam(paramKey="Key1", paramValue="Value1"),
        BufferParam(paramKey="Key2", paramValue="Value2"),
    ])
    assert "" == get_kv_from_buffer_param("Key99", [
        BufferParam(paramKey="Key1", paramValue="Value1"),
        BufferParam(paramKey="Key2", paramValue="Value2"),
    ])