# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import os
import pytest
import boto3
from collections.abc import Iterable


@pytest.fixture(autouse=True)
def default_environment_variables():
    """Mocked AWS evivronment variables such as AWS credentials and region"""
    os.environ["AWS_ACCESS_KEY_ID"] = "mocked-aws-access-key-id"
    os.environ["AWS_SECRET_ACCESS_KEY"] = "mocked-aws-secret-access-key"
    os.environ["AWS_SESSION_TOKEN"] = "mocked-aws-session-token"
    os.environ["AWS_REGION"] = "us-east-1"
    os.environ["AWS_DEFAULT_REGION"] = "us-east-1"

    os.environ["SOLUTION_VERSION"] = "v1.0.0"

    os.environ["LOGCONFIG_TABLE"] = "mocked-app-log-config-table-name"
    os.environ["LOGCONF_TABLE"] = "mocked-app-log-config-table-name"


def init_ddb_res(config):
    """
    config = {
        "ddb_table_name": { "id": 123123, "name": "the-name" }
        "ddb_table_name2": [ { "id": 123123, "name": "the-name" }, { ... } ]
    }
    """
    ddb_res = boto3.resource("dynamodb")
    for table_name, value in config.items():
        table = ddb_res.create_table(
            TableName=table_name,
            KeySchema=[
                {"AttributeName": "id", "KeyType": "HASH"},
                {"AttributeName": "version", "KeyType": "RANGE"},
            ],
            AttributeDefinitions=[
                {"AttributeName": "id", "AttributeType": "S"},
                {"AttributeName": "version", "AttributeType": "N"},
            ],
            BillingMode="PAY_PER_REQUEST",
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

    return ddb_res
