# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0


import os
import pytest


@pytest.fixture(autouse=True)
def default_environment_variables():
    os.environ["AWS_ACCESS_KEY_ID"] = "mocked-aws-access-key-id"
    os.environ["AWS_SECRET_ACCESS_KEY"] = "mocked-aws-secret-access-key"
    os.environ["AWS_SESSION_TOKEN"] = "mocked-aws-session-token"
    os.environ["AWS_REGION"] = "us-east-1"
    os.environ["SOLUTION_VERSION"] = "v1.0.0"
    os.environ["SOLUTION_ID"] = "SO8025"
    os.environ["MOTO_ACCOUNT_ID"] = "111111111111"

    os.environ["STATE_MACHINE_ARN"] = "mocked-sfn-machine-arn"
    os.environ["SOLUTION_VERSION"] = "v1.0.0"
    os.environ["SSM_LOG_CONFIG_DOCUMENT_NAME"] = "v1.0.0"
    os.environ["CONFIG_FILE_S3_BUCKET_NAME"] = "mocked-s3-bucket-name"
    os.environ["INSTANCE_META_TABLE_NAME"] = "mocked-instance-meta-table-name"
    os.environ["APP_PIPELINE_TABLE_NAME"] = "mocked-app-pipeline-table-name"
    os.environ["APP_LOG_CONFIG_TABLE_NAME"] = "mocked-app-log-config-table-name"
    os.environ["INSTANCE_TABLE_NAME_1"] = "mocked-instance-table-name-1"
    os.environ["INSTANCE_TABLE_NAME_2"] = "mocked-instance-table-name-2"
    os.environ["INSTANCE_GROUP_TABLE_NAME"] = "mocked-instance-group-table-name"
    os.environ["APP_LOG_INGESTION_TABLE_NAME"] = "mocked-app-log-ingestion-table-name"
    os.environ["EC2_LOG_SOURCE_TABLE_NAME"] = "mocked-ec2-log-source-table-name"
    os.environ["S3_LOG_SOURCE_TABLE_NAME"] = "mocked-s3-log-source-table-name"
    os.environ["LOG_SOURCE_TABLE_NAME"] = "mocked-log-source-table-name"
    os.environ["ETL_LOG_TABLE_NAME"] = "mocked-etl-log-table-name"
    os.environ["EKS_CLUSTER_SOURCE_TABLE_NAME"] = "mocked-eks-log-source-table-name"
    os.environ[
        "LOG_AGENT_EKS_DEPLOYMENT_KIND_TABLE"
    ] = "mocked-log-agent-eks-deployment-kind-table"
    os.environ["SERVICE_PIPELINE_TABLE_NAME"] = "mocked-service-pipeline-table-name"
    os.environ[
        "INSTANCE_INGESTION_DETAIL_TABLE_NAME"
    ] = "mocked-instance_ingestion_detail_table_name"
