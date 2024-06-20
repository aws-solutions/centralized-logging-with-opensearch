# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import os

import boto3
import pytest

from collections.abc import Iterable


def make_graphql_lambda_event(name, args):
    return {"arguments": args, "info": {"fieldName": name}}


def init_ddb(config):
    """
    config = {
        "ddb_table_name": { "id": 123123, "name": "the-name" }
        "ddb_table_name2": [ { "id": 123123, "name": "the-name" }, { ... } ]
    }
    """
    ddb = boto3.resource("dynamodb", region_name=os.environ.get("AWS_REGION"))
    for table_name, value in config.items():
        table = ddb.create_table(
            TableName=table_name,
            KeySchema=[{
                "AttributeName": "id",
                "KeyType": "HASH"
            }],
            AttributeDefinitions=[{
                "AttributeName": "id",
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

    os.environ["PARTITION"] = "aws"
    os.environ["AWS_REGION"] = "us-west-2"
    os.environ["AWS_DEFAULT_REGION"] = "us-west-2"


    os.environ["CLUSTER_TABLE"] = "mocked-cluster-table-name"
    os.environ["OPENSEARCH_MASTER_ROLE_ARN"] = "OPENSEARCH_MASTER_ROLE_ARN"
    os.environ["APP_PIPELINE_TABLE_NAME"] = "mocked-app-pipeline-table-name"
    os.environ["SVC_PIPELINE_TABLE"] = "mocked-PipelineTable-table-name"
    os.environ[
        "EKS_CLUSTER_SOURCE_TABLE_NAME"] = "mocked-eks-log-source-table-name"

    os.environ["DEFAULT_VPC_ID"] = "vpc-0d4784f4acdc470ff"
    os.environ["DEFAULT_SG_ID"] = "sg-07f612619eeede959"
    os.environ[
        "DEFAULT_PRIVATE_SUBNET_IDS"] = "subnet-04f5c7724b23a0458,subnet-02d8be2eeaa198079"

