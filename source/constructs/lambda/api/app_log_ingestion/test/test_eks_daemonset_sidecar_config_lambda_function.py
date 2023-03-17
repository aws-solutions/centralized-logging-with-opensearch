# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import os
import re
import json
import boto3
from boto3 import Session
import pytest
from copy import deepcopy
from moto.eks import REGION as DEFAULT_REGION
from moto import (
    mock_dynamodb,
    mock_stepfunctions,
    mock_iam,
    mock_lambda,
    mock_sts,
    mock_eks,
)
from .conftest import init_ddb, get_test_zip_file1, make_graphql_lambda_event
from .test_eks_constants import (
    ClusterInputs,
)

REGION = Session().region_name or DEFAULT_REGION
REGEX = "(?<time>\\d{4}-\\d{2}-\\d{2}\\s*\\d{2}:\\d{2}:\\d{2}.\\d{3})\\s*(?<level>\\S+)\\s*\\[(?<thread>\\S+)\\]\\s*(?<logger>\\S+)\\s*:\\s*(?<message>[\\s\\S]+)"
TIME_FORMAT = "%Y-%m-%d %H:%M:%S.%L"
ACCOUNT_ID = "123456789012"


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
def eks_client():
    with mock_eks():
        eks = boto3.client("eks", region_name=REGION)

        values = deepcopy(ClusterInputs.REQUIRED)
        values.extend(deepcopy(ClusterInputs.OPTIONAL))
        kwargs = dict(values)

        eks.create_cluster(name="loghub", **kwargs)
        yield


@pytest.fixture
def remote_lambda(iam_roles):
    with mock_lambda():
        awslambda = boto3.client("lambda")

        yield awslambda.create_function(
            FunctionName="FAKE-LogHub-EKS-Cluster-PodLog-Pipel-OpenSearchHelperFn-ef8PiCbL9ixp",
            Runtime="python3.7",
            Role=iam_roles["LambdaRole"]["Arn"],
            Handler="lambda_function.lambda_handler",
            Code={"ZipFile": get_test_zip_file1()},
            Timeout=1,
        )


@pytest.fixture
def ddb_client(iam_roles, remote_lambda):
    with mock_dynamodb():
        yield init_ddb(
            {
                # TODO: Update this if old version (<v1.1) is no longer supported.
                os.environ["APP_PIPELINE_TABLE_NAME"]: [
                    {
                        # Old Data (< V1.1)
                        "id": "f34b2266-aee1-4266-ac25-be32421fb3e1",
                        "aosParas": {
                            "coldLogTransition": 0,
                            "domainName": "helloworld",
                            "engine": "OpenSearch",
                            "failedLogBucket": "loghub-loghubloggingbucket0fa53b76-1jyvyptgjbge9",
                            "indexPrefix": "helloworld",
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
                        "createdDt": "2022-05-05T07:43:55Z",
                        "error": "",
                        "kdsParas": {
                            "enableAutoScaling": False,
                            "kdsArn": "arn:aws:kinesis:us-west-2:1234567890AB:stream/LogHub-EKS-Cluster-PodLog-Pipeline-f34b2-Stream790BDEE4-aGeLDuMS7B1i",
                            "maxShardNumber": 0,
                            "osHelperFnArn": remote_lambda["FunctionArn"],
                            "regionName": "us-west-2",
                            "startShardNumber": 1,
                            "streamName": "LogHub-EKS-Cluster-PodLog-Pipeline-f34b2-Stream790BDEE4-aGeLDuMS7B1i",
                        },
                        "stackId": "arn:aws:cloudformation:us-west-2:1234567890AB:stack/LogHub-EKS-Cluster-PodLog-Pipeline-f34b2/1e8e2860-cc47-11ec-8d95-06039fb616cf",
                        "status": "ACTIVE",
                        "kdsRoleArn": "arn:aws:iam::111111111:role/LogHub-EKS-Cluster-PodLog-DataBufferKDSRole7BCBC83-1II64RIV25JN3",
                        "kdsRoleName": "LogHub-EKS-Cluster-PodLog-DataBufferKDSRole7BCBC83-1II64RIV25JN3",
                        "tags": [],
                    },
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
                        "regularExpression": REGEX,
                        "regularSpecs": [
                            {"format": TIME_FORMAT, "key": "time", "type": "date"},
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
                        "sourceId": "488810533e5d430ba3660b7283fb4bf1",
                        "sourceType": "EKSCluster",
                        "stackId": "",
                        "stackName": "",
                        "status": "ACTIVE",
                        "tags": [],
                    },
                ],
                os.environ["EKS_CLUSTER_SOURCE_TABLE_NAME"]: [
                    {
                        "id": "8df489745b1c4cb5b0ef81c6144f9283",
                        "accountId": str(ACCOUNT_ID),
                        "aosDomainId": "fcb4130d5f23c9958c31e356d183d29d",
                        "createdDt": "2022-04-25T03:08:51Z",
                        "eksClusterArn": "arn:aws:eks:us-west-2:1234567890AB:cluster/loghub",
                        "eksClusterName": "loghub",
                        "eksClusterSGId": "sg-03953da75263c53b0",
                        "endpoint": "https://FAKED2BE96D3A6CEE098.gr7.us-west-2.eks.amazonaws.com",
                        "logAgentRoleArn": iam_roles["LogAgentRole"]["Arn"],
                        "oidcIssuer": "https://oidc.eks.us-west-2.amazonaws.com/id/FAKED2BE96D3A6CEE098",
                        "region": REGION,
                        "cri": "docker",
                        "status": "ACTIVE",
                        "deploymentKind": "DaemonSet",
                        "subnetIds": [
                            "subnet-0591f6d40e6d4ac43",
                            "subnet-07b05dbbfdcb6c3d9",
                            "subnet-0434b33f03359705c",
                            "subnet-08c2c326cf328c6b1",
                            "subnet-09f4c56735e755557",
                            "subnet-0a2bcbddfeebd6495",
                        ],
                        "tags": [],
                        "updatedDt": "2022-04-25T03:08:51Z",
                        "vpcId": "vpc-0e483d44af38007ec",
                    },
                    {
                        "id": "488810533e5d430ba3660b7283fb4bf1",
                        "accountId": str(ACCOUNT_ID),
                        "aosDomainId": "fcb4130d5f23c9958c31e356d183d29d",
                        "createdDt": "2022-05-07T08:16:40Z",
                        "cri": "docker",
                        "eksClusterArn": "arn:aws:eks:us-west-2:1234567890AB:cluster/loghub",
                        "eksClusterName": "loghub",
                        "eksClusterSGId": "sg-03953da75263c53b0",
                        "endpoint": "https://0F5DCD2AD2199B20D2BE96D3A6CEE098.gr7.us-west-2.eks.amazonaws.com",
                        "logAgentRoleArn": iam_roles["LogAgentRole"]["Arn"],
                        "oidcIssuer": "https://oidc.eks.us-west-2.amazonaws.com/id/0F5DCD2AD2199B20D2BE96D3A6CEE098",
                        "region": REGION,
                        "status": "ACTIVE",
                        "deploymentKind": "Sidecar",
                        "subnetIds": [
                            "subnet-0591f6d40e6d4ac43",
                            "subnet-07b05dbbfdcb6c3d9",
                            "subnet-0434b33f03359705c",
                            "subnet-08c2c326cf328c6b1",
                            "subnet-09f4c56735e755557",
                            "subnet-0a2bcbddfeebd6495",
                        ],
                        "tags": [],
                        "updatedDt": "2022-05-07T08:16:40Z",
                        "vpcId": "vpc-0e483d44af38007ec",
                    },
                ],
                # os.environ["LOG_AGENT_EKS_DEPLOYMENT_KIND_TABLE"]: [
                #     {
                #         "id": "322387e1-30f3-496c-afa4-7057eaeccc32",
                #         "createdDt": "2022-04-25T03:08:51Z",
                #         "deploymentKind": "DaemonSet",
                #         "eksClusterId": "8df489745b1c4cb5b0ef81c6144f9283",
                #         "updatedDt": "2022-04-25T03:08:51Z",
                #     },
                #     {
                #         "id": "2c07cbb7-b3a6-47b7-8100-f3c7d909c316",
                #         "createdDt": "2022-05-07T08:16:40Z",
                #         "deploymentKind": "Sidecar",
                #         "eksClusterId": "488810533e5d430ba3660b7283fb4bf1",
                #         "updatedDt": "2022-05-07T08:16:40Z",
                #     },
                # ],
                os.environ["SUB_ACCOUNT_LINK_TABLE_NAME"]: [],
            }
        )


@pytest.fixture
def sts_client():
    with mock_sts():
        boto3.client("sts", region_name=os.environ.get("AWS_REGION"))
        yield


@pytest.fixture
def iam_client():
    with mock_iam():
        iam_client = boto3.client("iam", region_name=os.environ.get("AWS_REGION"))
        # iam_res = boto3.resource("iam",
        #                          region_name=os.environ.get("AWS_REGION"))
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
            "LogHub-EKS-Cluster-PodLog-DataBufferKDSRole7BCBC83-1II64RIV25JN3Role": iam_client.create_role(
                RoleName="LogHub-EKS-Cluster-PodLog-DataBufferKDSRole7BCBC83-1II64RIV25JN3",
                AssumeRolePolicyDocument=assume_role_policy_str,
                Path="/my-path/",
            )[
                "Role"
            ],
        }


def test_getEKSDaemonSetConf(
    ddb_client, sfn_client, sts_client, iam_roles, eks_client, iam_client, remote_lambda
):
    from eks_daemonset_sidecar_config_lambda_function import lambda_handler
    from ..util import log_agent_helper

    evt = make_graphql_lambda_event(
        "getEKSDaemonSetConf", {"eksClusterId": "8df489745b1c4cb5b0ef81c6144f9283"}
    )

    config = lambda_handler(evt, None)
    # print(config)
    assert re.search(
        r"Name\s+java_spring_boot_e8e52b70-e7bc-4bdb-ad60-5f1addf17387", config
    )
    assert re.search(
        r"Name\s+java_spring_boot_e8e52b70-e7bc-4bdb-ad60-5f1addf17387.docker.firstline",
        config,
    )
    assert REGEX in config
    assert TIME_FORMAT in config
    assert iam_roles["LogAgentRole"]["Arn"] in config
    # test does not contain processorFilterRegex for DaemonSet
    assert re.search(r'Regex status \^%\'"\(400\|401\|404\|405\).*\\*"', config) is None
    assert re.search(r"Exclude request /user/log*", config) is None

    # test processorFilterRegex.enable is False for DaemonSet
    log_agent_helper.app_log_config_table.update_item(
        Key={"id": "e8e52b70-e7bc-4bdb-ad60-5f1addf17387"},
        UpdateExpression="SET #processorFilterRegex = :processorFilterRegex",
        ExpressionAttributeNames={
            "#processorFilterRegex": "processorFilterRegex",
        },
        ExpressionAttributeValues={
            ":processorFilterRegex": {"enable": False},
        },
    )
    config = lambda_handler(evt, None)
    assert re.search(r'Regex status \^%\'"\(400\|401\|404\|405\).*\\*"', config) is None
    assert re.search(r"Exclude request /user/log*", config) is None

    # test processorFilterRegex.enable is True for DaemonSet
    log_agent_helper.app_log_config_table.update_item(
        Key={"id": "e8e52b70-e7bc-4bdb-ad60-5f1addf17387"},
        UpdateExpression="SET #processorFilterRegex = :processorFilterRegex",
        ExpressionAttributeNames={
            "#processorFilterRegex": "processorFilterRegex",
        },
        ExpressionAttributeValues={
            ":processorFilterRegex": {
                "enable": True,
                "filters": [
                    {
                        "key": "status",
                        "condition": "Include",
                        "value": '^%\'"(400|401|404|405).*\*"',
                    },
                    {"key": "request", "condition": "Exclude", "value": "/user/log*"},
                ],
            },
        },
    )
    config = lambda_handler(evt, None)
    assert re.search(r'Regex status \^%\'"\(400\|401\|404\|405\).*\\*"', config)
    assert re.search(r"Exclude request /user/log*", config)


def test_getEKSSidecarConf(
    ddb_client, sfn_client, sts_client, iam_roles, iam_client, remote_lambda
):
    from eks_daemonset_sidecar_config_lambda_function import lambda_handler
    from ..util import log_agent_helper

    evt = make_graphql_lambda_event(
        "getEKSSidecarConf",
        {
            "eksClusterId": "488810533e5d430ba3660b7283fb4bf1",
            "ingestionId": "ce7f497c-8d73-40f7-a940-26da2540822e",
        },
    )

    config = lambda_handler(evt, None)

    assert re.search(
        r"Name\s+java_spring_boot_e8e52b70-e7bc-4bdb-ad60-5f1addf17387", config
    )
    # assert re.search(r'Name\s+java_spring_boot_e8e52b70-e7bc-4bdb-ad60-5f1addf17387.docker.firstline', config)
    assert REGEX in config
    assert TIME_FORMAT in config
    assert iam_roles["LogAgentRole"]["Arn"] in config
    # test does not contain processorFilterRegex for SideCar
    assert re.search(r'Regex status \^%\'"\(400\|401\|404\|405\).*\\*"', config) is None
    assert re.search(r"Exclude request /user/log*", config) is None

    # test processorFilterRegex.enable is False for SideCar
    log_agent_helper.app_log_config_table.update_item(
        Key={"id": "e8e52b70-e7bc-4bdb-ad60-5f1addf17387"},
        UpdateExpression="SET #processorFilterRegex = :processorFilterRegex",
        ExpressionAttributeNames={
            "#processorFilterRegex": "processorFilterRegex",
        },
        ExpressionAttributeValues={
            ":processorFilterRegex": {"enable": False},
        },
    )
    config = lambda_handler(evt, None)
    assert re.search(r'Regex status \^%\'"\(400\|401\|404\|405\).*\\*"', config) is None
    assert re.search(r"Exclude request /user/log*", config) is None

    # test processorFilterRegex.enable is True for SideCar
    log_agent_helper.app_log_config_table.update_item(
        Key={"id": "e8e52b70-e7bc-4bdb-ad60-5f1addf17387"},
        UpdateExpression="SET #processorFilterRegex = :processorFilterRegex",
        ExpressionAttributeNames={
            "#processorFilterRegex": "processorFilterRegex",
        },
        ExpressionAttributeValues={
            ":processorFilterRegex": {
                "enable": True,
                "filters": [
                    {
                        "key": "status",
                        "condition": "Include",
                        "value": '^%\'"(400|401|404|405).*\*"',
                    },
                    {"key": "request", "condition": "Exclude", "value": "/user/log*"},
                ],
            },
        },
    )
    config = lambda_handler(evt, None)
    # print(config)
    assert re.search(r'Regex status \^%\'"\(400\|401\|404\|405\).*\\*"', config)
    assert re.search(r"Exclude request /user/log*", config)

    # Test the unknow action
    with pytest.raises(RuntimeError):
        lambda_handler(
            {"action": "unknowAction"},
            None,
        )
