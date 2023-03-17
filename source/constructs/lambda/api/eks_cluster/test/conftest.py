# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import os
import pytest


@pytest.fixture(autouse=True)
def default_environment_variables():
    """Mocked AWS evivronment variables such as AWS credentials and region"""

    os.environ["AWS_ACCESS_KEY_ID"] = "mocked-aws-access-key-id"
    os.environ["AWS_SECRET_ACCESS_KEY"] = "mocked-aws-secret-access-key"
    os.environ["AWS_DEFAULT_REGION"] = "us-west-2"

    os.environ[
        "EKS_CLUSTER_LOG_SOURCE_TABLE"
    ] = "LogHub-EKSClusterLogSourceTable-T0PAX2WWT7CM"
    os.environ[
        "LOG_AGENT_EKS_DEPLOYMENT_KIND_TABLE"
    ] = "LogHub-LogAgentEKSDeploymentKindTable-FI0Z7PRZE6BT"
    os.environ["APP_LOG_PIPELINE_TABLE"] = "LogHub-AppPipelineTable-1A5LCWZNZ4RJZ"
    os.environ["AOS_DOMAIN_TABLE"] = "LogHub-ClusterTable-1OXKJHGWKVNJ"
    os.environ["SUB_ACCOUNT_LINK_TABLE_NAME"] = "mocked-sub-account-link-table-name"
    os.environ["SUB_ACCOUNT_LINK_TABLE"] = "mocked-sub-account-link-table-name"
