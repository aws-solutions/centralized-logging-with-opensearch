# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0
import os
import json
from typing import List
import pytest
import boto3
from moto import mock_ssm, mock_sts, mock_iam

from commonlib.dao import AppLogIngestionDao
from commonlib.model import (
    LogSource,
    Ec2Source,
    LogSourceTypeEnum,
    AppLogIngestion,
    Output,
    Instance,
)


def get_app_log_ingestion_table_name():
    return os.environ.get("APP_LOG_INGESTION_TABLE_NAME")


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


def get_app_log_ingestion():
    ingestion_args = dict()
    ingestion_args["appPipelineId"] = "appPipelineId1"
    ingestion_args["accountId"] = get_ec2_source().accountId
    ingestion_args["region"] = get_ec2_source().region
    ingestion_args["sourceId"] = get_ec2_source().sourceId
    ingestion_args["stackId"] = "111"

    app_log_ingestion = AppLogIngestion(**ingestion_args)
    output = Output(
        **{
            "name": "syslog",
            "roleArn": "arn:aws:iam::111111111111:role/CL-AppPipe-s3-BufferAccessRole-name",
            "roleName": "CL-AppPipe-s3-BufferAccessRole-name",
            "params": [
                {"paramKey": "logBucketPrefix", "paramValue": "logBucketPrefix_value"},
                {"paramKey": "max_file_size", "paramValue": "logBucketPrefix_value"},
                {"paramKey": "bucket_name", "paramValue": "logBucketPrefix_value"},
                {"paramKey": "upload_timeout", "paramValue": "logBucketPrefix_value"},
                {
                    "paramKey": "compression_type",
                    "paramValue": "compression_type_value",
                },
                {"paramKey": "storage_class", "paramValue": "storage_class_value"},
            ],
        }
    )
    app_log_ingestion.output = output
    return app_log_ingestion


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


@mock_sts
def test_create_ingestion(mocker, ssm_client, iam_client):
    mocker.patch("commonlib.LinkAccountHelper")
    mocker.patch("commonlib.dao.InstanceDao")
    mocker.patch("commonlib.dao.DynamoDBUtil", return_value=None)
    mocker.patch(
        "svc.ec2_attach_iam_instance_profile.attach_permission_to_instance",
        return_value=None,
    )
    from svc.ec2 import EC2SourceHandler

    ingestion_dao = AppLogIngestionDao(table_name=get_app_log_ingestion_table_name())
    ec2_source_handler = EC2SourceHandler(ingestion_dao)
    app_log_ingestion = get_app_log_ingestion()
    instance = Instance(
        id="instance-1",
        sourceId=get_ec2_source().sourceId,
        accountId=get_ec2_source().accountId,
        region=get_ec2_source().region,
        ingestionIds=[app_log_ingestion.id],
    )
    link_account = dict()
    link_account["agentConfDoc"] = "test_doc"

    # test create_ingestion
    mocker.patch(
        "commonlib.dao.InstanceDao.get_instance_set_by_source_id", return_value=None
    )

    instance_with_ingestion_list = dict()
    instance_with_ingestion_list["instance-1"] = [app_log_ingestion]

    mocker.patch(
        "commonlib.dao.InstanceDao.add_ingestion_into_instance", return_value=instance
    )
    ingestion_list: List[AppLogIngestion] = [app_log_ingestion]
    mocker.patch(
        "commonlib.dao.InstanceDao.list_app_log_ingestions", return_value=ingestion_list
    )
    mocker.patch.object(ingestion_dao, "update_app_log_ingestion")

    link_account[
        "subAccountRoleArn"
    ] = "arn:aws:iam::123456789012:role/CL-AppPipe-s3-BufferAccessRole-name"
    mocker.patch("svc.ec2.account_helper.get_link_account", return_value=link_account)
    mocked_ec2_source_handler_generate_flb_conf = mocker.patch.object(
        ec2_source_handler, "generate_flb_conf"
    )

    ec2_source_handler.create_ingestion(get_ec2_source(), get_app_log_ingestion())

    mocked_ec2_source_handler_generate_flb_conf.assert_called_once()

    # test delete_ingestion
    mocker.patch(
        "commonlib.dao.InstanceDao.remove_ingestion_from_instance",
        return_value=instance,
    )
    ec2_source_handler.delete_ingestion(get_ec2_source(), app_log_ingestion)
