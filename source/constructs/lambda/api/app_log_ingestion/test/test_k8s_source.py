# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import os
import boto3
import json
import pytest
from copy import deepcopy
from .test_eks_constants import (
    ClusterInputs,
)
from moto import mock_iam, mock_eks, mock_sts
from typing import List
from commonlib.dao import AppLogIngestionDao
from commonlib.model import (
    LogSource,
    AppLogIngestion,
    CRIEnum,
    LogSourceTypeEnum,
    EksSource,
    DeploymentKindEnum,
    Output,
)


@pytest.fixture
def sts_client():
    with mock_sts():
        boto3.client("sts", region_name="us-east-1")
        yield


def get_eks_source():
    mock_eks_log_source = LogSource(
        sourceId="eks12345",
        type=LogSourceTypeEnum.EKSCluster,
        eks=EksSource(
            cri=CRIEnum.CONTAINERD,
            deploymentKind=DeploymentKindEnum.DAEMON_SET,
            accountId="123456789012",
            aosDomainId="aosDomainId",
            eksClusterArn="eksClusterArn",
            eksClusterName="eksClusterName",
            eksClusterSGId="eksClusterSGId",
            region="us-east-1",
            endpoint="test_endpoint",
            logAgentRoleArn="arn:aws:iam::123456789012:role/log-agent",
            oidcIssuer="oidcIssuer",
            subnetIds=["subnet1", "subnet2"],
            vpcId="vpcId",
        ),
        accountId="123456789012",
        region="us-east-1",
        archiveFormat="json",
        subAccountLinkId="4512fd67-5bbf-4170-8aea-03107a500c72",
        subAccountVpcId="vpc-1001",
        subAccountPublicSubnetIds="sub-001,sub-002",
    )
    return mock_eks_log_source


def get_app_log_ingestion_table_name():
    return os.environ.get("APP_LOG_INGESTION_TABLE_NAME")


@pytest.fixture
def iam_client():
    with mock_iam():
        iam_client = boto3.client("iam", region_name="us-east-1")
        print(os.environ["ACCOUNT_ID"])
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


@pytest.fixture
def eks_client():
    with mock_eks():
        eks = boto3.client("eks", region_name="us-east-1")

        values = deepcopy(ClusterInputs.REQUIRED)
        values.extend(deepcopy(ClusterInputs.OPTIONAL))
        kwargs = dict(values)

        eks.create_cluster(name=get_eks_source().eks.eksClusterName, **kwargs)
        yield


def get_app_log_ingestion():
    ingestion_args = dict()
    ingestion_args["appPipelineId"] = "appPipelineId1"
    ingestion_args["sourceId"] = get_eks_source().sourceId
    ingestion_args["accountId"] = get_eks_source().accountId
    ingestion_args["region"] = get_eks_source().region
    app_log_ingestion = AppLogIngestion(**ingestion_args)
    output = Output(
        **{
            "name": "s3",
            "roleArn": "arn:aws:iam::123456789012:role/CL-AppPipe-s3-BufferAccessRole-name",
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


def test_create_ingestion(mocker, sts_client, iam_client):
    mocker.patch("commonlib.LinkAccountHelper")
    from svc.k8s import EKSSourceHandler

    mocker.patch("commonlib.dao.DynamoDBUtil", return_value=None)
    ingestion_dao = AppLogIngestionDao(table_name=get_app_log_ingestion_table_name())
    eks_source = EKSSourceHandler(ingestion_dao)
    mock_app_log_ingestion = get_app_log_ingestion()
    mock_app_log_ingestion.id = "ingestion_id1"

    mock_ingestion_list: List[AppLogIngestion] = []
    mock_ingestion_list.append(mock_app_log_ingestion)
    mocker.patch.object(
        ingestion_dao, "list_app_log_ingestions", return_value=mock_ingestion_list
    )
    mock_log_source = get_eks_source()
    link_account = dict()
    link_account[
        "subAccountRoleArn"
    ] = "arn:aws:iam::123456789012:role/CL-AppPipe-s3-BufferAccessRole-name"
    mocker.patch("svc.k8s.account_helper.get_link_account", return_value=link_account)
    mocker.patch.object(ingestion_dao, "save", return_value=mock_ingestion_list)
    eks_source.create_ingestion(mock_log_source, mock_app_log_ingestion)


def test_get_deployment_content(mocker, eks_client):
    mocker.patch("commonlib.LinkAccountHelper")
    from svc.k8s import EKSSourceHandler

    mocker.patch("commonlib.dao.DynamoDBUtil", return_value=None)
    ingestion_dao = AppLogIngestionDao(table_name=get_app_log_ingestion_table_name())
    eks_source = EKSSourceHandler(ingestion_dao)
    link_account = dict()
    link_account[
        "subAccountCwlMonitorRoleArn"
    ] = "arn:aws:iam::123456789012:role/subAccountCwlMonitorRole"
    mocker.patch("svc.k8s.account_helper.get_link_account", return_value=link_account)
    mocker.patch(
        "svc.k8s.K8sFlb.generate_deployment_content", return_value="mocker_data"
    )
    # eks_cluster={'status':'ACTIVE','version':'1.27'}
    # eks_resp={'cluster':eks_cluster}
    # mocker.patch("svc.k8s.conn.get_client",return_value=eks)
    # mocker.patch("svc.k8s.describe_cluster.cluster", return_value=eks_cluster)
    # 'get_client().describe_cluster()'
    # eks_cluster
    # mocker.patch("svc.k8s.get_deployment_content.cluster",return_value=eks_cluster)
    assert (
        eks_source.get_sidecar_content(get_eks_source(), get_app_log_ingestion())
        == "mocker_data"
    )
