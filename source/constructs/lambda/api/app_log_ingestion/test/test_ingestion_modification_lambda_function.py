# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import os
import json
import boto3
import pytest
from moto import (
    mock_s3,
    mock_iam,
    mock_sts
)
from commonlib.model import (
    LogSource,
    Ec2Source,
    LogSourceTypeEnum,
    AppLogIngestion,
    GroupTypeEnum,
    GroupPlatformEnum,
)
from botocore.exceptions import ClientError


@pytest.fixture
def s3_client():
    with mock_s3():
        region = os.environ.get("AWS_REGION")

        s3 = boto3.resource("s3", region_name=region)
        # Create the buckets
        bucket_name = os.environ.get("CONFIG_FILE_S3_BUCKET_NAME")
        s3.create_bucket(Bucket=bucket_name)
        yield


@pytest.fixture
def sts_client():
    with mock_sts():
        boto3.client("sts", region_name=os.environ.get("AWS_REGION"))
        yield


def get_role_name():
    with mock_iam():
        region = os.environ.get("AWS_REGION")
        iam = boto3.client("iam", region_name=region)
        try:
            return iam.get_role(RoleName="my-role")["Role"]["Arn"]

        except ClientError:
            return iam.create_role(
                RoleName="my-role",
                AssumeRolePolicyDocument="some policy",
                Path="/my-path/",
            )["Role"]["Arn"]


@pytest.fixture
def iam_client():
    with mock_iam():
        iam_client = boto3.client("iam", region_name=os.environ.get("AWS_REGION"))
        assume_role_policy_str = json.dumps(
            {
                "Version": "2012-10-17",
                "Statement": [
                    {
                        "Effect": "Allow",
                        "Principal": {"AWS": "arn:aws:iam::111111111:root"},
                        "Action": "sts:AssumeRole",
                        "Condition": {},
                    },
                    {
                        "Effect": "Allow",
                        "Principal": {"AWS": "arn:aws:iam::111111111:root"},
                        "Action": "sts:AssumeRole",
                    },
                ],
            }
        )
        yield {
            "Solution-EKS-Cluster-PodLog-DataBufferKDSRole7BCBC83-1II64RIV25JN3Role": iam_client.create_role(
                RoleName="Solution-EKS-Cluster-PodLog-DataBufferKDSRole7BCBC83-1II64RIV25JN3",
                AssumeRolePolicyDocument=assume_role_policy_str,
                Path="/my-path/",
            )[
                "Role"
            ],
        }


simple_definition = """
{
  "Comment": "A Hello World example of the Amazon States Language using Pass states",
  "StartAt": "Hello",
  "States": {
    "Hello": {
      "Type": "Pass",
      "Result": "World",
      "End": true
    }
  }
}
"""


@pytest.fixture
def add_instances_to_instance_group_event():
    with open("./test/event/apply_app_log_ingestion_for_single_instance.json", "r") as f:
        return json.load(f)


@pytest.fixture
def refresh_app_log_ingestion_for_single_instance_event():
    with open("./test/event/refresh_app_log_ingestion_for_single_instance.json", "r") as f:
        return json.load(f)


def test_apply_app_log_ingestion_for_single_instance(
    add_instances_to_instance_group_event,
    s3_client,
    sts_client,
    iam_client,
    mocker
):
    # Can only import here, as the environment variables need to be set first.
    mocker.patch("commonlib.dao.AppLogIngestionDao")
    mocker.patch("commonlib.LinkAccountHelper")
    import ingestion_modification_event_lambda_function
    ingestion_args = dict()
    ingestion_args["appPipelineId"] = "appPipelineId1"
    ingestion_args["sourceId"] = "sourceId1"
    ingestion_object = AppLogIngestion(**ingestion_args)
    ec2_log_source = LogSource(
        sourceId="sourceId1",
        type=LogSourceTypeEnum.EC2,
        ec2=Ec2Source(
            groupName="ec2-groupname",
            groupType=GroupTypeEnum.EC2,
            groupPlatform=GroupPlatformEnum.LINUX,
        ),
        accountId="accountI1",
        region="us-east-1",
        archiveFormat="json",
        subAccountLinkId="4512fd67-5bbf-4170-8aea-03107a500c72",
        subAccountVpcId="vpc-1001",
        subAccountPublicSubnetIds="sub-001,sub-002",
    )
    # start with empty list
    mock_ingestion_value = list(ingestion_object)
    mocker.patch(
        "ingestion_modification_event_lambda_function.ingestion_dao.get_app_log_ingestions_by_source_id", mock_ingestion_value=mock_ingestion_value
    )
    mock_source_value = ec2_log_source
    mocker.patch(
        "ingestion_modification_event_lambda_function.log_source_dao.get_log_source", return_value=mock_source_value
    )
    link_account = dict()
    link_account["agentConfDoc"] = "test_doc"
    link_account["subAccountRoleArn"] = "arn:aws:iam::123456789012:role/CL-AppPipe-s3-BufferAccessRole-name"
    mocker.patch(
        "ingestion_modification_event_lambda_function.account_helper.get_link_account", return_value=link_account
    )

    # Test add instance to instance group with ingestion
    ingestion_modification_event_lambda_function.lambda_handler(
        add_instances_to_instance_group_event,
        None,
    )


def test_refresh_app_log_ingestion_for_single_instance(
    refresh_app_log_ingestion_for_single_instance_event,
    s3_client,
    sts_client,
    iam_client,
    mocker
):
    # Can only import here, as the environment variables need to be set first.
    mocker.patch("commonlib.dao.AppLogIngestionDao")
    mocker.patch("commonlib.LinkAccountHelper")
    import ingestion_modification_event_lambda_function
    ingestion_args = dict()
    ingestion_args["appPipelineId"] = "appPipelineId1"
    ingestion_args["sourceId"] = "sourceId1"
    ingestion_object = AppLogIngestion(**ingestion_args)
    ec2_log_source = LogSource(
        sourceId="sourceId1",
        type=LogSourceTypeEnum.EC2,
        ec2=Ec2Source(
            groupName="ec2-groupname",
            groupType=GroupTypeEnum.EC2,
            groupPlatform=GroupPlatformEnum.LINUX,
        ),
        accountId="accountI1",
        region="us-east-1",
        archiveFormat="json",
        subAccountLinkId="4512fd67-5bbf-4170-8aea-03107a500c72",
        subAccountVpcId="vpc-1001",
        subAccountPublicSubnetIds="sub-001,sub-002",
    )
    # start with empty list
    mock_ingestion_value = list(ingestion_object)
    mocker.patch(
        "ingestion_modification_event_lambda_function.ingestion_dao.get_app_log_ingestions_by_source_id", mock_ingestion_value=mock_ingestion_value
    )
    mock_source_value = ec2_log_source
    mocker.patch(
        "ingestion_modification_event_lambda_function.log_source_dao.get_log_source", return_value=mock_source_value
    )
    mock_instance_table_value = None
    mocker.patch(
        "ingestion_modification_event_lambda_function.instance_dao.get_instance_by_instance_id", mock_ingestion_value=mock_instance_table_value
    )
    link_account = dict()
    link_account["agentConfDoc"] = "test_doc"
    link_account["subAccountRoleArn"] = "arn:aws:iam::123456789012:role/CL-AppPipe-s3-BufferAccessRole-name"
    mocker.patch(
        "ingestion_modification_event_lambda_function.account_helper.get_link_account", return_value=link_account
    )

    # Test delete instance from instance group with ingestion
    ingestion_modification_event_lambda_function.lambda_handler(
        refresh_app_log_ingestion_for_single_instance_event,
        None
    )
