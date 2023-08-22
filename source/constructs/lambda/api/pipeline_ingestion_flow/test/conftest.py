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
    os.environ["SOLUTION_VERSION"] = "v1.0.0"
    os.environ["SOLUTION_ID"] = "SO8025"
    os.environ["PIPELINE_TABLE"] = "Solution-AppPipelineTable-xxx"
    os.environ["INGESTION_TABLE"] = "Solution-AppIngestionTable-xxx"
    os.environ["LOG_SOURCE_TABLE"] = "Solution-LogSourceTable-xxx"
    os.environ["PIPELINE_TABLE_NAME"] = "Solution-AppPipelineTable-xxx"