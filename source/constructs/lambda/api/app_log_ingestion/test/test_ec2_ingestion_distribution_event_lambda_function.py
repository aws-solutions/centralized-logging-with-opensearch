# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0
import os
import json
import pytest
import boto3
from moto import mock_ssm, mock_sts, mock_iam, mock_sns


from commonlib.model import (
    LogSource,
    Ec2Source,
    LogSourceTypeEnum,
    Instance,
)


@pytest.fixture
def s3_object_upload_with_cross_acct_event():
    with open("./test/event/s3_object_upload_with_cross_acct_event.json", "r") as f:
        return json.load(f)


@pytest.fixture
def s3_object_upload_with_current_acct_event():
    with open("./test/event/s3_object_upload_with_current_acct_event.json", "r") as f:
        return json.load(f)


@pytest.fixture
def subscription_confirmation_event():
    with open("./test/event/subscription_confirmation_event.json", "r") as f:
        return json.load(f)


@pytest.fixture
def unsubscribe_confirmation():
    with open("./test/event/unsubscribe_confirmation.json", "r") as f:
        return json.load(f)


def get_ec2_source():
    mock_ec2_log_source = LogSource(
        sourceId="sourceId1",
        type=LogSourceTypeEnum.EC2,
        ec2=Ec2Source(groupName="group1", groupType="EC2", groupPlatform="Linux"),
        accountId="accountI1",
        region="us-east-1",
        archiveFormat="json",
        subAccountLinkId="4512fd67-5bbf-4170-8aea-03107a500c72",
        subAccountVpcId="vpc-1001",
        subAccountPublicSubnetIds="sub-001,sub-002",
    )
    return mock_ec2_log_source


@pytest.fixture
def ssm_client():
    with mock_ssm():
        boto3.client("ssm", region_name=os.environ.get("AWS_REGION"))
        yield


@pytest.fixture
def iam_client():
    with mock_iam():
        iam_client = boto3.client("iam", region_name="us-east-1")

        assume_role_policy_str = {
            "Version": "2012-10-17",
            "Statement": [
                {
                    "Effect": "Allow",
                    "Principal": {"AWS": "arn:aws:iam::123456789012:root"},
                    "Action": "sts:AssumeRole",
                    "Condition": {},
                },
                {
                    "Effect": "Allow",
                    "Principal": {"AWS": "arn:aws:iam::123456789012:root"},
                    "Action": "sts:AssumeRole",
                },
            ],
        }

        iam_client.create_role(
            RoleName="CL-AppPipe-s3-BufferAccessRole-name",
            AssumeRolePolicyDocument=json.dumps(assume_role_policy_str),
        )
        resp = iam_client.create_role(
            RoleName="log-agent",
            AssumeRolePolicyDocument=json.dumps(assume_role_policy_str),
        )
        print(resp)
        yield


def test_process_s3_event(
    mocker,
    ssm_client,
    iam_client,
    s3_object_upload_with_cross_acct_event,
    s3_object_upload_with_current_acct_event,
    subscription_confirmation_event,
    unsubscribe_confirmation,
):
    event_handler(
        mocker, s3_object_upload_with_cross_acct_event, ssm_client, iam_client
    )
    event_handler(
        mocker, s3_object_upload_with_current_acct_event, ssm_client, iam_client
    )
    event_handler(mocker, subscription_confirmation_event, ssm_client, iam_client)
    event_handler(mocker, unsubscribe_confirmation, ssm_client, iam_client)


@mock_sts
@mock_sns
def event_handler(mocker, sqs_event, ssm_client, iam_client):
    mocker.patch("commonlib.LinkAccountHelper")
    mocker.patch("commonlib.dao.InstanceIngestionDetailDao")
    mocker.patch("commonlib.dao.DynamoDBUtil", return_value=None)

    import ec2_ingestion_distribution_event_lambda_function

    from commonlib.model import InstanceIngestionDetail, StatusEnum

    mocked_instance_ingestion_details = []

    instance_ingestion_detail = InstanceIngestionDetail(
        instanceId="instance-1",
        sourceId="test_source_id",
        accountId="123456789012",
        region="us-east-1",
        ingestionId="app_log_ingestion.id",
        status=StatusEnum.DISTRIBUTING,
    )
    mocked_instance_ingestion_details.append(instance_ingestion_detail)
    mocker.patch(
        "ec2_ingestion_distribution_event_lambda_function.instance_ingestion_detail_dao.list_instance_ingestion_details",
        mock_ingestion_value=mocked_instance_ingestion_details,
    )
    mocker.patch(
        "ec2_ingestion_distribution_event_lambda_function.instance_ingestion_detail_dao.batch_put_items"
    )

    link_account = dict()
    link_account["agentConfDoc"] = "test_doc"
    link_account["accountId"] = instance_ingestion_detail.accountId
    link_account["region"] = instance_ingestion_detail.region
    link_account[
        "subAccountRoleArn"
    ] = "arn:aws:iam::123456789012:role/CL-AppPipe-s3-BufferAccessRole-name"
    mocker.patch(
        "ec2_ingestion_distribution_event_lambda_function.account_helper.get_link_account",
        return_value=link_account,
    )

    # test upload_ingestion
    ec2_ingestion_distribution_event_lambda_function.lambda_handler(
        sqs_event,
        None,
    )
    ec2_ingestion_distribution_event_lambda_function.get_link_account(
        mocked_instance_ingestion_details
    )
    ec2_ingestion_distribution_event_lambda_function.send_ssm_command_to_instances(
        ssm_client, ["instance-1"], "test_doc", mocked_instance_ingestion_details
    )
    ec2_ingestion_distribution_event_lambda_function.retry_failed_attach_policy_command(
        ssm_client, "instance-1", "test_doc", mocked_instance_ingestion_details
    )
