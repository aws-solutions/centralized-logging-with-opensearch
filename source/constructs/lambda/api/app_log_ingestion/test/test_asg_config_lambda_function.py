# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import os
import re
import json
import boto3
from boto3 import Session
import pytest
from moto.eks import REGION as DEFAULT_REGION
from moto import (
    mock_dynamodb,
    mock_stepfunctions,
    mock_iam,
    mock_sts,
    mock_s3
)
from .conftest import init_ddb, get_test_zip_file1, make_graphql_lambda_event
from util.exception import APIException

REGION = Session().region_name or DEFAULT_REGION
REGEX = "(?<time>\\d{4}-\\d{2}-\\d{2}\\s*\\d{2}:\\d{2}:\\d{2}.\\d{3})\\s*(?<level>\\S+)\\s*\\[(?<thread>\\S+)\\]\\s*(?<logger>\\S+)\\s*:\\s*(?<message>[\\s\\S]+)"
TIME_FORMAT = "%Y-%m-%d %H:%M:%S.%L"
ACCOUNT_ID = "123456789012"

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
def sfn_client():
    with mock_stepfunctions():
        sfn = boto3.client("stepfunctions")
        response = sfn.create_state_machine(
            name="LogHubAPIPipelineFlowSM",
            definition=json.dumps(
                {
                    "Comment": "A Hello World example of the Amazon States Language using Pass states",
                    "StartAt": "Hello",
                    "States": {
                        "Hello": {"Type": "Pass", "Result": "World", "End": True}
                    },
                }
            ),
            roleArn="arn:aws:iam::123456789012:role/test",
        )
        os.environ["STATE_MACHINE_ARN"] = response["stateMachineArn"]

        yield


@pytest.fixture
def iam_roles():
    with mock_iam():
        iam = boto3.client("iam")
        yield {
            "LambdaRole": iam.create_role(
                RoleName="lambda-role",
                AssumeRolePolicyDocument="some policy",
                Path="/my-path/",
            )["Role"],
            "LogAgentRole": iam.create_role(
                RoleName="LogAgentRole",
                AssumeRolePolicyDocument="some policy",
                Path="/",
            )["Role"],
        }


@pytest.fixture
def ddb_client(iam_roles):
    with mock_dynamodb():
        yield init_ddb(
            {
                # TODO: Update this if old version (<v1.1) is no longer supported.
                os.environ["APP_PIPELINE_TABLE_NAME"]: [
                    {
                        # New Data (V1.2+)
                        "id": "4b5b721b-01ad-4a07-98fe-4d2a0e3ce4dc",
                        "aosParams": {
                            "coldLogTransition": 0,
                            "domainName": "helloworld",
                            "engine": "OpenSearch",
                            "failedLogBucket": "loghub-loghubloggingbucket0fa53b76-1jyvyptgjbge9",
                            "indexPrefix": "eks-pipe2",
                            "logRetention": 0,
                            "opensearchArn": "arn:aws:es:us-west-2:1234567890AB:domain/helloworld",
                            "opensearchEndpoint": "vpc-helloworld-hbgb2ktamqnb5cedzrty3blelu.us-west-2.es.amazonaws.com",
                            "vpc": {
                                "privateSubnetIds": "subnet-01f09e14e5b70c11f,subnet-06843d01e3da35b7d",
                                "publicSubnetIds": "",
                                "securityGroupId": "sg-0ec6c9b448792d1e6",
                                "vpcId": "vpc-05a90814226d2c713",
                            },
                            "warmLogTransition": 0,
                        },
                        "createdDt": "2022-05-07T06:36:41Z",
                        "error": "",
                        "bufferType": "KDS",
                        "bufferParams": [
                            {"paramKey": "enableAutoScaling", "paramValue": "false"},
                            {"paramKey": "shardCount", "paramValue": "1"},
                            {"paramKey": "minCapacity", "paramValue": "1"},
                            {"paramKey": "maxCapacity", "paramValue": "5"},
                        ],
                        "bufferResourceName": "LogHub-AppPipe-4b5b7-Stream790BDEE4-HZ4crmUd5jJ3",
                        "bufferResourceArn": "arn:aws:kinesis:us-west-2:123456789012:stream/LogHub-AppPipe-4b5b7-Stream790BDEE4-HZ4crmUd5jJ3",
                        "stackId": "arn:aws:cloudformation:us-west-2:123456789012:stack/LogHub-AppPipe-4b5b7/0f1cf390-cdd0-11ec-a7af-06957ff291a7",
                        "status": "ACTIVE",
                        "bufferAccessRoleArn": "arn:aws:iam::111111111:role/LogHub-EKS-Cluster-PodLog-DataBufferKDSRole7BCBC83-1II64RIV25JN3",
                        "bufferAccessRoleName": "LogHub-EKS-Cluster-PodLog-DataBufferKDSRole7BCBC83-1II64RIV25JN3",
                        "tags": [],
                    },
                ],
                os.environ["APP_LOG_CONFIG_TABLE_NAME"]: [
                    {
                        "id": "e8e52b70-e7bc-4bdb-ad60-5f1addf17387",
                        "confName": "SpringBoot0220",
                        "createdDt": "2022-02-20T08:05:39Z",
                        "logPath": "/var/log/loghub/springboot/*.log",
                        "logType": "MultiLineText",
                        "multilineLogParser": "JAVA_SPRING_BOOT",
                        "regularExpression": "",
                        "regularSpecs": [
                            {"format": "", "key": "time", "type": "date"},
                            {"format": "", "key": "level", "type": "text"},
                            {"format": "", "key": "thread", "type": "text"},
                            {"format": "", "key": "logger", "type": "text"},
                            {"format": "", "key": "message", "type": "text"},
                        ],
                        "status": "ACTIVE",
                        "updatedDt": "2022-02-20T08:08:31Z",
                        "userLogFormat": "%d{yyyy-MM-dd HH:mm:ss.SSS} %-5level [%thread] %logger : %msg%n",
                    },
                ],
                os.environ["APPLOGINGESTION_TABLE"]: [
                    {
                        "id": "60d7b565-25f4-4c3c-b09e-275e1d02183d",
                        "appPipelineId": "f34b2266-aee1-4266-ac25-be32421fb3e1",
                        "confId": "e8e52b70-e7bc-4bdb-ad60-5f1addf17387",
                        "createdDt": "2022-05-05T07:43:55Z",
                        "error": "",
                        "sourceId": "8df489745b1c4cb5b0ef81c6144f9283",
                        "sourceType": "EKSCluster",
                        "stackId": "arn:aws:cloudformation:us-west-2:1234567890AB:stack/LogHub-EKS-Cluster-PodLog-Pipeline-f34b2/1e8e2860-cc47-11ec-8d95-06039fb616cf",
                        "stackName": "LogHub-EKS-Cluster-PodLog-Pipeline-f34b2",
                        "status": "CREATING",
                        "tags": [],
                        "updatedDt": "2022-05-05T07:47:04Z",
                    },
                    {
                        "id": "ce7f497c-8d73-40f7-a940-26da2540822e",
                        "appPipelineId": "4b5b721b-01ad-4a07-98fe-4d2a0e3ce4dc",
                        "confId": "e8e52b70-e7bc-4bdb-ad60-5f1addf17387",
                        "createdDt": "2022-05-07T08:17:06Z",
                        "error": "",
                        "sourceId": "27216370-ad6e-45e5-a092-2b73ae6d3431",
                        "sourceType": "EKSCluster",
                        "stackId": "",
                        "stackName": "",
                        "status": "ACTIVE",
                        "tags": [],
                    },
                ],
                os.environ["INSTANCE_GROUP_TABLE_NAME"]: [
                    {
                        "id": "27216370-ad6e-45e5-a092-2b73ae6d3431",
                        "accountId": "123456789012",
                        "createdDt": "2023-01-19T07:04:53Z",
                        "groupName": "test",
                        "groupType": "ASG",
                        "instanceSet": {
                            "CL-Proxy-cfc08-NginxProxyEC2ASG05E5AAD2-15WD263NZ70AJ"
                        },
                        "region": None,
                        "status": "ACTIVE",
                    },
                ],
                os.environ["SUB_ACCOUNT_LINK_TABLE_NAME"]: [],
            }
        )


@pytest.fixture
def sts_client():
    with mock_sts():
        boto3.client("sts", region_name=os.environ.get("AWS_REGION"))
        yield


def test_getAutoScalingGroupConf(
    ddb_client, sfn_client, sts_client, iam_roles, s3_client
):
    from auto_scaling_group_config_lambda_function import lambda_handler

    evt_success = make_graphql_lambda_event(
        "getAutoScalingGroupConf", {"groupId": "27216370-ad6e-45e5-a092-2b73ae6d3431"}
    )

    evt_api_except = make_graphql_lambda_event(
        "getAutoScalingGroupConf", {"groupId": "27216370-ad6e-45e5-a092-aaaaaaaaaaaa"}
    )

    evt_unknown_except = make_graphql_lambda_event(
        "getAutoScalingGroupConf", {"group_Id": "27216370-ad6e-45e5-a092-2b73ae6d3431"}
    )

    config = lambda_handler(evt_success, None)
    assert re.search(r"CL-Proxy-cfc08-NginxProxyEC2ASG05E5AAD2-15WD263NZ70AJ", config)

    with pytest.raises(APIException):
        lambda_handler(evt_api_except,None)

    with pytest.raises(Exception):
        lambda_handler(evt_unknown_except,None)
