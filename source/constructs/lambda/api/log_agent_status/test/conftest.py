import os
import boto3
import pytest

from collections.abc import Iterable


def init_ddb(config, primary_key='id'):
    """
    config = {
        "ddb_table_name": { "id": 123123, "name": "the-name" }
        "ddb_table_name2": [ { "id": 123123, "name": "the-name" }, { ... } ]
    }
    """
    ddb = boto3.resource("dynamodb")
    for table_name, value in config.items():
        table = ddb.create_table(
            TableName=table_name,
            KeySchema=[{
                "AttributeName": primary_key,
                "KeyType": "HASH"
            }],
            AttributeDefinitions=[{
                "AttributeName": primary_key,
                "AttributeType": "S"
            }],
            ProvisionedThroughput={
                "ReadCapacityUnits": 5,
                "WriteCapacityUnits": 5
            },
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

    return ddb


@pytest.fixture(autouse=True)
def default_environment_variables():
    """Mocked AWS evivronment variables such as AWS credentials and region"""
    os.environ["AWS_ACCESS_KEY_ID"] = "mocked-aws-access-key-id"
    os.environ["AWS_SECRET_ACCESS_KEY"] = "mocked-aws-secret-access-key"
    os.environ["AWS_SESSION_TOKEN"] = "mocked-aws-session-token"
    os.environ["AWS_REGION"] = "us-east-1"
    os.environ["AWS_DEFAULT_REGION"] = "us-east-1"
    os.environ["SOLUTION_VERSION"] = "v1.0.0"
    os.environ["SOLUTION_ID"] = "SO8025"
    os.environ["INSTANCEMETA_TABLE"] = "mocked-log-hub-instance-table"
    os.environ["AGENTSTATUS_TABLE"] = "mocked-log-hub-agent-status-table"
    os.environ["SUB_ACCOUNT_LINK_TABLE_NAME"] = "mocked-sub-account-link-table-name"
    os.environ["SUB_ACCOUNT_LINK_TABLE"] = "mocked-sub-account-link-table-name"
