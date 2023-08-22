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
    os.environ["AWS_DEFAULT_REGION"] = "us-east-1"
    os.environ["MOTO_ACCOUNT_ID"] = "111111111111"

    os.environ["SOLUTION_VERSION"] = "v1.0.0"
    os.environ["SOLUTION_ID"] = "SO8025"

    os.environ["LOG_SOURCE_TABLE_NAME"] = "mocked-log-source-table-name"
    os.environ["INSTANCE_TABLE_NAME"] = "mocked-instance-table-name"
    os.environ["APP_LOG_INGESTION_TABLE_NAME"] = "mocked-log-ingestion-table-name"
    os.environ["SUB_ACCOUNT_LINK_TABLE_NAME"] = "mocked-link-account-table-name"

    # EKS related
    os.environ["STACK_PREFIX"] = "CL"
    os.environ["EKS_OIDC_CLIENT_ID"] = "sts.amazonaws.com"
    os.environ["EKS_OIDC_PROVIDER_ARN_PREFIX"] = "arn:aws:iam::111111111111:oidc-provider/"
