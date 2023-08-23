# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import json
import pytest
from commonlib.model import LogSource, Ec2Source, LogSourceTypeEnum, AppLogIngestion
from moto import mock_sts


@pytest.fixture
def get_auto_scaling_group_conf_event():
    with open("./test/event/test_event.json", "r") as f:
        event = json.load(f)
        # please replace event["arguments"]
        event["arguments"] = {
            "groupId": "sourceId1",
        }
        event["info"]["fieldName"] = "getAutoScalingGroupConf"
        return event


@mock_sts
def test_lambda_handler(mocker, get_auto_scaling_group_conf_event):
    import auto_scaling_group_config_lambda_function

    log_source: LogSource = LogSource(
        sourceId="sourceId1",
        type=LogSourceTypeEnum.EC2,
        ec2=Ec2Source(groupName="group1", groupType="ASG", groupPlatform="Linux"),
        accountId="accountI1",
        region="us-east-1",
        archiveFormat="json",
        subAccountLinkId="4512fd67-5bbf-4170-8aea-03107a500c72",
        subAccountVpcId="vpc-1001",
        subAccountPublicSubnetIds="sub-001,sub-002",
    )
    ingestion_args = dict()
    ingestion_args["appPipelineId"] = "appPipelineId1"
    ingestion_args["sourceId"] = log_source.sourceId
    ingestion_args["accountId"] = log_source.accountId
    ingestion_args["region"] = log_source.region
    app_log_ingestion = AppLogIngestion(**ingestion_args)
    link_account = {
        "accountId": app_log_ingestion.accountId,
        "subAccountBucketName": "mocked_bucket",
    }
    mocker.patch(
        "commonlib.LinkAccountHelper.get_link_account", return_value=link_account
    )
    mocker.patch("commonlib.dao.DynamoDBUtil", return_value=None)
    mocker.patch("commonlib.dao.LogSourceDao.get_log_source", return_value=log_source)
    get_app_log_ingestions_by_source_id_call = mocker.patch(
        "commonlib.dao.AppLogIngestionDao.get_app_log_ingestions_by_source_id",
        return_value=[app_log_ingestion],
    )
    auto_scaling_group_config_lambda_function.lambda_handler(
        get_auto_scaling_group_conf_event, None
    )
    get_app_log_ingestions_by_source_id_call.assert_called_once()
