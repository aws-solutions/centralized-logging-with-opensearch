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
    os.environ["MOTO_ACCOUNT_ID"] = "111111111111"

    os.environ["SOLUTION_VERSION"] = "v1.0.0"

    os.environ["SUB_ACCOUNT_LINK_TABLE_NAME"] = "mocked-sub-account-link-table-name"
    os.environ["BASE_RESOURCE_ARN"] = "arn:aws:logs:us-east-1:123456789012:*"
    os.environ["CWL_MONITOR_ROLE_NAME"] = "mocked-cwl-role-name"
