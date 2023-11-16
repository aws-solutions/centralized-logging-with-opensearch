# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import os

import pytest


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
    # os.environ["SERVICE_PIPELINE_TABLE_NAME"] = "mocked-service-pipeline-table-name"
    os.environ["PIPELINE_TABLE_NAME"] = "mocked-service-pipeline-table-name"
    os.environ["APP_PIPELINE_TABLE_NAME"] = "mocked-app-pipeline-table-name"
    os.environ["APP_LOG_INGESTION_TABLE_NAME"] = "mocked-app-ingestion-table-name"
    os.environ["METADATA_TABLE_NAME"] = "mocked-metadata-table-name"


def make_graphql_lambda_event(name, args):
    """
    Helper function to create a GraphQL Lambda event.
    """
    return {"arguments": args, "info": {"fieldName": name}}


def init_table(table, rows):
    with table.batch_writer() as batch:
        for data in rows:
            batch.put_item(Item=data)