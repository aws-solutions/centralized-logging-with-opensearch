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

    os.environ["STATE_MACHINE_ARN"] = "mocked-sfn-machine-arn"
    os.environ["SOLUTION_VERSION"] = "v1.0.0"
    os.environ["SSM_LOG_CONFIG_DOCUMENT_NAME"] = "v1.0.0"
    os.environ["CONFIG_FILE_S3_BUCKET_NAME"] = "mocked-s3-bucket-name"
    os.environ["INSTANCE_META_TABLE_NAME"] = "mocked-instance-meta-table-name"
    os.environ["APP_PIPELINE_TABLE_NAME"] = "mocked-app-pipeline-table-name"
    os.environ["APP_LOG_CONFIG_TABLE_NAME"] = "mocked-app-log-config-table-name"
    os.environ["INSTRANCEGROUP_TABLE"] = "mocked-instance-group-table-name"
    os.environ["APPLOGINGESTION_TABLE"] = "mocked-app-log-ingestion-table-name"
    os.environ["EC2_LOG_SOURCE_TABLE_NAME"] = "mocked-ec2-log-source-table-name"
    os.environ["S3_LOG_SOURCE_TABLE_NAME"] = "mocked-s3-log-source-table-name"
    os.environ["EKS_CLUSTER_SOURCE_TABLE_NAME"] = "mocked-eks-log-source-table-name"
    os.environ["LOG_AGENT_EKS_DEPLOYMENT_KIND_TABLE"] = "mocked-log-agent-eks-deployment-kind-table"
    os.environ["EVENTBRIDGE_RULE"] = "mocked-eventbridge-rule-name"
    os.environ["SUB_ACCOUNT_LINK_TABLE_NAME"] = "mocked-sub-account-link-table-name"
    os.environ["SUB_ACCOUNT_LINK_TABLE"] = "mocked-sub-account-link-table-name"
    os.environ["INSTANCE_GROUP_MODIFICATION_EVENT_QUEUE_NAME"] = "mocked-instance-modification-event-queue-name"
