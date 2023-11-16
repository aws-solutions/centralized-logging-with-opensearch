# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import os
import pytest


def init_table(table, rows):
    with table.batch_writer() as batch:
        for data in rows:
            batch.put_item(Item=data)
            
            
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
    os.environ["SUB_ACCOUNT_LINK_TABLE_NAME"] = "mocked-sub-account-link-table-name"
    os.environ["SUB_ACCOUNT_LINK_TABLE"] = "mocked-sub-account-link-table-name"
    os.environ["PIPELINE_TABLE"] = "mocked-service-pipeline-table-name"
    os.environ["GRAFANA_TABLE"] = "mocked-grafana-table-name"
    os.environ["META_TABLE"] = "mocked-meta-table-name"
    os.environ["ETLLOG_TABLE"] = "mocked-etl-log-table-name"
    os.environ['LIGHT_ENGINE_SVC_PIPELINE_ID'] = "7704bc43-1370-43d8-a920-babfbfbfe407"
    os.environ["ACCOUNT_ID"] = "12345678"
    os.environ["REGION"] = "us-east-1"
    os.environ["PARTITION"] = "aws"
