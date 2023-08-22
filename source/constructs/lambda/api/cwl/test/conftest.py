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

    os.environ["WEB_BUCKET_NAME"] = "cl-web-bucket"
    os.environ["API_ENDPOINT"] = "https:/cl.xxx.amazonaws.com/graphql"
    os.environ["USER_POOL_ID"] = "abc"
    os.environ["USER_POOL_CLIENT_ID"] = "abcd"
    os.environ["OIDC_PROVIDER"] = ""
    os.environ["OIDC_CLIENT_ID"] = ""
    os.environ["OIDC_CUSTOMER_DOMAIN"] = ""
    os.environ["AUTHENTICATION_TYPE"] = "AMAZON_COGNITO_USER_POOLS"
    os.environ["CLOUDFRONT_URL"] = "solution.cloudfront.net"
    os.environ["TRANSFER_TASK_TABLE"] = "cl-task-table"

    os.environ["MOCK_LOG_GROUP_NAME"] = "cl-log-group"
    os.environ["SVC_PIPELINE_TABLE_NAME"] = "svc-pipeline-table-name"
    os.environ["APP_PIPELINE_TABLE_NAME"] = "app-pipeline-table-name"
    os.environ["LOG_SOURCE_TABLE_NAME"] = "app-log-source-table-name"
    os.environ["APP_LOG_INGESTION_TABLE_NAME"] = "app-log-ingestion-table-name"
    os.environ["STACK_PREFIX"] = "CL"
