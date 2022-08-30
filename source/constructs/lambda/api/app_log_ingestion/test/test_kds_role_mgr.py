# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import os
import boto3
import json
import pytest
from moto import mock_dynamodb, mock_sts, mock_iam
from .conftest import init_ddb

#os.environ["AWS_REGION"] = 'us-west-1'


@pytest.fixture
def sts_client():
    with mock_sts():
        boto3.client("sts", region_name=os.environ.get("AWS_REGION"))
        yield


@pytest.fixture
def iam_client():
    with mock_iam():
        iam_client = boto3.client("iam",
                                  region_name=os.environ.get("AWS_REGION"))
        # iam_res = boto3.resource("iam",
        #                          region_name=os.environ.get("AWS_REGION"))
        assume_role_policy_str = json.dumps({
            "Version":
            "2012-10-17",
            "Statement": [{
                "Effect": "Allow",
                "Principal": {
                    "AWS": "arn:aws:iam::111111111:root"
                },
                "Action": "sts:AssumeRole",
                "Condition": {}
            }, {
                "Effect": "Allow",
                "Principal": {
                    "AWS": "arn:aws:iam::111111111:root"
                },
                "Action": "sts:AssumeRole"
            }]
        })
        yield {
            "LogHub-EKS-Cluster-PodLog-DataBufferKDSRole7BCBC83-1II64RIV25JN3Role":
            iam_client.create_role(
                RoleName=
                "LogHub-EKS-Cluster-PodLog-DataBufferKDSRole7BCBC83-1II64RIV25JN3",
                AssumeRolePolicyDocument=assume_role_policy_str,
                Path="/my-path/",
            )["Role"],
        }


@pytest.fixture
def ddb_client():
    with mock_dynamodb():
        yield init_ddb({
            os.environ["SUB_ACCOUNT_LINK_TABLE_NAME"]: {
                "id": "e6099c4a-7001-4e4a-ab0d-3319f441a04a",
                "agentConfDoc":
                "CrossAccount-FluentBitConfigDownloading-oLGRW4c1kO2E",
                "agentInstallDoc":
                "CrossAccount-FluentBitDocumentInstallation-9d5zIvOSNGUi",
                "createdDt": "2022-07-14T12:34:35Z",
                "region": "us-west-2",
                "status": "ACTIVE",
                "subAccountBucketName":
                "crossaccount-loghubloggingbucket0fa53b76-16pw04457dx1j",
                "subAccountId": "056627083435",
                "subAccountKMSKeyArn":
                "arn:aws:kms:us-west-2:056627083435:key/20cccd33-776b-4bcb-88f2-3a9bd47c02b2",
                "subAccountName": "magic-en",
                "subAccountPublicSubnetIds":
                "subnet-0b6b13021cf0840c0,subnet-01ae8fbe2a0e7ff77",
                "subAccountRoleArn":
                "arn:aws:iam::056627083435:role/CrossAccount-CrossAccountRoleFACE29D1-1KM3QA0O84K34",
                "subAccountStackId":
                "arn:aws:cloudformation:us-west-2:056627083435:stack/CrossAccount/cf324d00-ff8b-11ec-8943-021a55f488dd",
                "subAccountVpcId": "vpc-0327820b5f509ad58"
            },
            os.environ["EKS_CLUSTER_SOURCE_TABLE_NAME"]: {
                "id":
                "9ec8bfb2832a4ea3bdf2fcd7afa4887c",
                "accountId":
                "056627083435",
                "aosDomainId":
                "40485c141648f8d0acbbec6eda19a4a7",
                "createdDt":
                "2022-07-14T12:55:04Z",
                "cri":
                "docker",
                "eksClusterArn":
                "arn:aws:eks:us-west-2:056627083435:cluster/test-cross-acount-sidecar",
                "eksClusterName":
                "test-cross-acount-sidecar",
                "eksClusterSGId":
                "sg-0309ace781f7bb196",
                "endpoint":
                "https://495B50BAB232BED64A48C40F334C9B09.gr7.us-west-2.eks.amazonaws.com",
                "logAgentRoleArn":
                "arn:aws:iam::056627083435:role/LogHub-EKS-LogAgent-Role-2623e75d063340a4ac37c4f4874bbc48",
                "oidcIssuer":
                "https://oidc.eks.us-west-2.amazonaws.com/id/495B50BAB232BED64A48C40F334C9B09",
                "region":
                "us-west-2",
                "status":
                "ACTIVE",
                "subnetIds": [
                    "subnet-07004ac7f2e2164dd", "subnet-0fc8749589c18edf9",
                    "subnet-014eadb944d87d020", "subnet-0d1d910c8c4399a9d"
                ],
                "tags": [],
                "updatedDt":
                "2022-07-14T12:55:04Z",
                "vpcId":
                "vpc-0d1d79173ff9e6f53"
            },
            os.environ["S3_LOG_SOURCE_TABLE_NAME"]: [],
            os.environ["INSTANCE_GROUP_TABLE_NAME"]: [],
            os.environ["APP_PIPELINE_TABLE_NAME"]: [{
                "id":
                "bb8303df-0c78-4a9b-95d3-fd5b4bfd5f79",
                "aosParas": {
                    "coldLogTransition": 0,
                    "domainName": "loghub-aos",
                    "engine": "OpenSearch",
                    "failedLogBucket":
                    "loghub-loghubloggingbucket0fa53b76-19bviwwrvqyz3",
                    "indexPrefix": "eks-nginx01",
                    "logRetention": 0,
                    "opensearchArn":
                    "arn:aws:es:us-west-2:783732175206:domain/loghub-aos",
                    "opensearchEndpoint":
                    "vpc-loghub-aos-rckjrxo5icri37ro3eq2tac4di.us-west-2.es.amazonaws.com",
                    "replicaNumbers": 0,
                    "shardNumbers": 1,
                    "vpc": {
                        "privateSubnetIds":
                        "subnet-04f5c7724b23a0458,subnet-02d8be2eeaa198079",
                        "publicSubnetIds": "",
                        "securityGroupId": "sg-07f612619eeede959",
                        "vpcId": "vpc-0d4784f4acdc470ff"
                    },
                    "warmLogTransition": 0
                },
                "createdDt":
                "2022-07-14T12:57:34Z",
                "error":
                "",
                "kdsParas": {
                    "enableAutoScaling":
                    False,
                    "kdsArn":
                    "arn:aws:kinesis:us-west-2:111111:stream/LogHub-EKS-Cluster-PodLog-Pipeline-bb830-Stream790BDEE4-fpwLPjH5CsQ1",
                    "maxShardNumber":
                    0,
                    "osHelperFnArn":
                    "arn:aws:lambda:us-west-2:1111111:function:LogHub-EKS-Cluster-PodLog-Pipel-OpenSearchHelperFn-9teq81BBvyOp",
                    "regionName":
                    "us-west-2",
                    "startShardNumber":
                    1,
                    "streamName":
                    "LogHub-EKS-Cluster-PodLog-Pipeline-bb830-Stream790BDEE4-fpwLPjH5CsQ1"
                },
                "kdsRoleArn":
                "arn:aws:iam::111111111:role/LogHub-EKS-Cluster-PodLog-DataBufferKDSRole7BCBC83-1II64RIV25JN3",
                "kdsRoleName":
                "LogHub-EKS-Cluster-PodLog-DataBufferKDSRole7BCBC83-1II64RIV25JN3",
                "stackId":
                "arn:aws:cloudformation:us-west-2:1111111:stack/LogHub-EKS-Cluster-PodLog-Pipeline-bb830/88d714c0-0374-11ed-8741-06913de18dd5",
                "status":
                "ACTIVE",
                "tags": [{
                    "key": "nb",
                    "value": "test"
                }]
            }, {
                "id":
                "cc8303df-9c78-2a9b-95d3-t35b4bfd5f84",
                "aosParas": {
                    "coldLogTransition": 0,
                    "domainName": "loghub-aos",
                    "engine": "OpenSearch",
                    "failedLogBucket":
                    "loghub-loghubloggingbucket0fa53b76-19bviwwrvqyz3",
                    "indexPrefix": "eks-nginx01",
                    "logRetention": 0,
                    "opensearchArn":
                    "arn:aws:es:us-west-2:783732175206:domain/loghub-aos",
                    "opensearchEndpoint":
                    "vpc-loghub-aos-rckjrxo5icri37ro3eq2tac4di.us-west-2.es.amazonaws.com",
                    "replicaNumbers": 0,
                    "shardNumbers": 1,
                    "vpc": {
                        "privateSubnetIds":
                        "subnet-04f5c7724b23a0458,subnet-02d8be2eeaa198079",
                        "publicSubnetIds": "",
                        "securityGroupId": "sg-07f612619eeede959",
                        "vpcId": "vpc-0d4784f4acdc470ff"
                    },
                    "warmLogTransition": 0
                },
                "createdDt":
                "2022-07-14T12:57:34Z",
                "error":
                "",
                "kdsParas": {
                    "enableAutoScaling":
                    False,
                    "kdsArn":
                    "arn:aws:kinesis:us-west-2:783732175206:stream/LogHub-EKS-Cluster-PodLog-Pipeline-bb830-Stream790BDEE4-fpwLPjH5CsQ1",
                    "maxShardNumber":
                    0,
                    "osHelperFnArn":
                    "arn:aws:lambda:us-west-2:783732175206:function:LogHub-EKS-Cluster-PodLog-Pipel-OpenSearchHelperFn-9teq81BBvyOp",
                    "regionName":
                    "us-west-2",
                    "startShardNumber":
                    1,
                    "streamName":
                    "LogHub-EKS-Cluster-PodLog-Pipeline-bb830-Stream790BDEE4-fpwLPjH5CsQ1"
                },
                "kdsRoleName":
                "LogHub-EKS-Cluster-PodLog-DataBufferKDSRole7BCBC83-1II64RIV25JN3",
                "stackId":
                "arn:aws:cloudformation:us-west-2:783732175206:stack/LogHub-EKS-Cluster-PodLog-Pipeline-bb830/88d714c0-0374-11ed-8741-06913de18dd5",
                "status":
                "ACTIVE",
                "tags": [{
                    "key": "nb",
                    "value": "test"
                }]
            }],
        })


def generate_kds_role_4_fluent_bit(sts_client, iam_client, ddb_client):
    from ..util import kds_role_mgr, sys_enum_type
    kds_role_mgr.generate_kds_role_4_fluent_bit(
        "bb8303df-0c78-4a9b-95d3-fd5b4bfd5f79",
        sys_enum_type.SOURCETYPE.EKS_CLUSTER,
        source_ids=["9ec8bfb2832a4ea3bdf2fcd7afa4887c"])
    kds_role_mgr.generate_kds_role_4_fluent_bit(
        "cc8303df-9c78-2a9b-95d3-t35b4bfd5f84",
        sys_enum_type.SOURCETYPE.EKS_CLUSTER,
        source_ids=["9ec8bfb2832a4ea3bdf2fcd7afa4887c"])
