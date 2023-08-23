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

@pytest.fixture
def generate_and_upload_flb_config_event():
    with open("./test/event/generate_and_upload_flb_config_event.json", "r") as f:
        return json.load(f)
    
@pytest.fixture
def delete_ingestion_and_refresh_flb_config_event():
    with open("./test/event/delete_ingestion_and_refresh_flb_config_event.json", "r") as f:
        return json.load(f)
    

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
def test_generate_and_upload_flb_config(mocker, generate_and_upload_flb_config_event, ssm_client, iam_client):
    mocker.patch("commonlib.LinkAccountHelper")
    mocker.patch("commonlib.dao.InstanceDao")
    mocker.patch("commonlib.dao.DynamoDBUtil", return_value=None)

    import ec2_ingestion_distribution_event_lambda_function

    from svc.ec2 import EC2SourceHandler

    # start with empty list
    ingestion_args = dict()
    ingestion_args["appPipelineId"] = "daa44adb-d48b-4bb3-990b-e91d45bb0ff5"
    ingestion_args["sourceId"] = "e6521c5c-cf73-4f6b-86af-4bac56f5d5d1"
    ingestion_object = AppLogIngestion(**ingestion_args)
    ec2_log_source = LogSource(
        sourceId="e6521c5c-cf73-4f6b-86af-4bac56f5d5d1",
        type=LogSourceTypeEnum.EC2,
        ec2=Ec2Source(
            groupName="ec2-groupname",
            groupType="EC2",
            groupPlatform="Linux",
        ),
        accountId="accountI1",
        region="us-east-1",
        archiveFormat="json",
        subAccountLinkId="4512fd67-5bbf-4170-8aea-03107a500c72",
        subAccountVpcId="vpc-1001",
        subAccountPublicSubnetIds="sub-001,sub-002",
    )
    mock_ingestion_value = list(ingestion_object)
    mocker.patch(
        "ec2_ingestion_distribution_event_lambda_function.get_app_log_ingestion_from_ingestion_table", mock_ingestion_value=mock_ingestion_value
    )
    mock_instance_table_value = None
    mocker.patch(
        "ec2_ingestion_distribution_event_lambda_function.instance_dao.get_instance_by_instance_id", mock_ingestion_value=mock_instance_table_value
    )
    mock_source_value = ec2_log_source
    mocker.patch(
        "ec2_ingestion_distribution_event_lambda_function.log_source_dao.get_log_source", return_value=mock_source_value
    )
    link_account = dict()
    link_account["agentConfDoc"] = "test_doc"
    link_account["subAccountRoleArn"] = "arn:aws:iam::123456789012:role/CL-AppPipe-s3-BufferAccessRole-name"
    mocker.patch(
        "ec2_ingestion_distribution_event_lambda_function.account_helper.get_link_account", return_value=link_account
    )

    # test upload_ingestion
    ec2_ingestion_distribution_event_lambda_function.lambda_handler(
        generate_and_upload_flb_config_event,
        None,
    )

@mock_sts
def test_delete_ingestion_and_refresh_flb_config(mocker, delete_ingestion_and_refresh_flb_config_event, ssm_client, iam_client):
    mocker.patch("commonlib.LinkAccountHelper")
    mocker.patch("commonlib.dao.InstanceDao")
    mocker.patch("commonlib.dao.DynamoDBUtil", return_value=None)

    import ec2_ingestion_distribution_event_lambda_function

    from svc.ec2 import EC2SourceHandler

    # start with empty list
    ingestion_args = dict()
    ingestion_args["appPipelineId"] = "daa44adb-d48b-4bb3-990b-e91d45bb0ff5"
    ingestion_args["sourceId"] = "e6521c5c-cf73-4f6b-86af-4bac56f5d5d1"
    ingestion_object = AppLogIngestion(**ingestion_args)
    ec2_log_source = LogSource(
        sourceId="e6521c5c-cf73-4f6b-86af-4bac56f5d5d1",
        type=LogSourceTypeEnum.EC2,
        ec2=Ec2Source(
            groupName="ec2-groupname",
            groupType="EC2",
            groupPlatform="Linux",
        ),
        accountId="accountI1",
        region="us-east-1",
        archiveFormat="json",
        subAccountLinkId="4512fd67-5bbf-4170-8aea-03107a500c72",
        subAccountVpcId="vpc-1001",
        subAccountPublicSubnetIds="sub-001,sub-002",
    )
    mock_ingestion_value = list(ingestion_object)
    mocker.patch(
        "ec2_ingestion_distribution_event_lambda_function.get_app_log_ingestion_from_ingestion_table", mock_ingestion_value=mock_ingestion_value
    )
    mock_instance_table_value = None
    mocker.patch(
        "ec2_ingestion_distribution_event_lambda_function.instance_dao.get_instance_by_instance_id", mock_ingestion_value=mock_instance_table_value
    )
    mock_source_value = ec2_log_source
    mocker.patch(
        "ec2_ingestion_distribution_event_lambda_function.log_source_dao.get_log_source", return_value=mock_source_value
    )
    link_account = dict()
    link_account["agentConfDoc"] = "test_doc"
    link_account["subAccountRoleArn"] = "arn:aws:iam::123456789012:role/CL-AppPipe-s3-BufferAccessRole-name"
    mocker.patch(
        "ec2_ingestion_distribution_event_lambda_function.account_helper.get_link_account", return_value=link_account
    )

    # test upload_ingestion
    ec2_ingestion_distribution_event_lambda_function.lambda_handler(
        delete_ingestion_and_refresh_flb_config_event,
        None,
    )