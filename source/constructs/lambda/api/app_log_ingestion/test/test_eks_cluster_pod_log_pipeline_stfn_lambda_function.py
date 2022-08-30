# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import os
import json
import boto3
import pytest

from moto import (
    mock_dynamodb,
    mock_stepfunctions,
    mock_iam,
    mock_lambda,
    mock_sts,
)
from .conftest import init_ddb, get_test_zip_file1


@pytest.fixture
def sfn_client():
    with mock_stepfunctions():
        sfn = boto3.client("stepfunctions")
        response = sfn.create_state_machine(
            name="LogHubAPIPipelineFlowSM",
            definition=json.dumps({
                "Comment":
                "A Hello World example of the Amazon States Language using Pass states",
                "StartAt": "Hello",
                "States": {
                    "Hello": {
                        "Type": "Pass",
                        "Result": "World",
                        "End": True
                    }
                }
            }),
            roleArn="arn:aws:iam::123456789012:role/test",
        )
        os.environ["STATE_MACHINE_ARN"] = response["stateMachineArn"]

        yield


@pytest.fixture
def iam_roles():
    with mock_iam():
        iam = boto3.client("iam")
        yield {
            "LambdaRole":
            iam.create_role(
                RoleName="LogHub-EKS-Cluster-PodLog-DataBuffer",
                AssumeRolePolicyDocument="some policy",
                Path="/my-path/",
            )["Role"],
            "LogAgentRole":
            iam.create_role(RoleName="LogAgentRole",
                            AssumeRolePolicyDocument="some policy",
                            Path="/")["Role"],
        }


@pytest.fixture
def remote_lambda(iam_roles):
    with mock_lambda():
        awslambda = boto3.client('lambda')

        yield awslambda.create_function(
            FunctionName=
            'FAKE-LogHub-EKS-Cluster-PodLog-Pipel-OpenSearchHelperFn-ef8PiCbL9ixp',
            Runtime="python3.7",
            Role=iam_roles["LambdaRole"]["Arn"],
            Handler="lambda_function.lambda_handler",
            Code={"ZipFile": get_test_zip_file1()},
            Timeout=1,
        )


@pytest.fixture
def ddb_client(iam_roles, remote_lambda):
    with mock_dynamodb():
        yield init_ddb({
            os.environ["APP_PIPELINE_TABLE_NAME"]: {
                "id": "f34b2266-aee1-4266-ac25-be32421fb3e1",
                "aosParas": {
                    "coldLogTransition": 0,
                    "domainName": "wch-private",
                    "engine": "OpenSearch",
                    "failedLogBucket":
                    "loghub-loghubloggingbucket0fa53b76-1jyvyptgjbge9",
                    "indexPrefix": "helloworld",
                    "logRetention": 0,
                    "opensearchArn":
                    "arn:aws:es:us-west-2:1234567890AB:domain/wch-private",
                    "opensearchEndpoint":
                    "vpc-wch-private-hbgb2ktamqnb5cedzrty3blelu.us-west-2.es.amazonaws.com",
                    "vpc": {
                        "privateSubnetIds":
                        "subnet-01f09e14e5b70c11f,subnet-06843d01e3da35b7d",
                        "publicSubnetIds": "",
                        "securityGroupId": "sg-0ec6c9b448792d1e6",
                        "vpcId": "vpc-05a90814226d2c713"
                    },
                    "warmLogTransition": 0
                },
                "createdDt": "2022-05-05T07:43:55Z",
                "error": "",
                "kdsParas": {
                    "enableAutoScaling":
                    False,
                    "kdsArn":
                    "arn:aws:kinesis:us-west-2:1234567890AB:stream/LogHub-EKS-Cluster-PodLog-Pipeline-f34b2-Stream790BDEE4-aGeLDuMS7B1i",
                    "maxShardNumber":
                    0,
                    "osHelperFnArn":
                    remote_lambda["FunctionArn"],
                    "regionName":
                    "us-west-2",
                    "startShardNumber":
                    1,
                    "streamName":
                    "LogHub-EKS-Cluster-PodLog-Pipeline-f34b2-Stream790BDEE4-aGeLDuMS7B1i"
                },
                "stackId":
                "arn:aws:cloudformation:us-west-2:1234567890AB:stack/LogHub-EKS-Cluster-PodLog-Pipeline-f34b2/1e8e2860-cc47-11ec-8d95-06039fb616cf",
                "status": "ACTIVE",
                "kdsRoleArn":
                "arn:aws:iam::111111111:role/LogHub-EKS-Cluster-PodLog-DataBufferKDSRole7BCBC83-1II64RIV25JN3",
                "kdsRoleName":
                "LogHub-EKS-Cluster-PodLog-DataBufferKDSRole7BCBC83-1II64RIV25JN3",
                "tags": []
            },
            os.environ["APP_LOG_CONFIG_TABLE_NAME"]: [
                {
                    "id":
                    "e8e52b70-e7bc-4bdb-ad60-5f1addf17387",
                    "confName":
                    "SpringBoot0220",
                    "createdDt":
                    "2022-02-20T08:05:39Z",
                    "logPath":
                    "/var/log/loghub/springboot/*.log",
                    "logType":
                    "MultiLineText",
                    "multilineLogParser":
                    "JAVA_SPRING_BOOT",
                    "regularExpression":
                    "(?<time>\\d{4}-\\d{2}-\\d{2}\\s*\\d{2}:\\d{2}:\\d{2}.\\d{3})\\s*(?<level>\\S+)\\s*\\[(?<thread>\\S+)\\]\\s*(?<logger>\\S+)\\s*:\\s*(?<message>[\\s\\S]+)",
                    "regularSpecs": [{
                        "format": "yyyy-MM-dd HH:mm:ss.SSS",
                        "key": "time",
                        "type": "date"
                    }, {
                        "format": "",
                        "key": "level",
                        "type": "text"
                    }, {
                        "format": "",
                        "key": "thread",
                        "type": "text"
                    }, {
                        "format": "",
                        "key": "logger",
                        "type": "text"
                    }, {
                        "format": "",
                        "key": "message",
                        "type": "text"
                    }],
                    "status":
                    "ACTIVE",
                    "updatedDt":
                    "2022-02-20T08:08:31Z",
                    "userLogFormat":
                    "%d{yyyy-MM-dd HH:mm:ss.SSS} %-5level [%thread] %logger : %msg%n"
                },
            ],
            os.environ["APPLOGINGESTION_TABLE"]: [{
                "id":
                "60d7b565-25f4-4c3c-b09e-275e1d02183d",
                "appPipelineId":
                "f34b2266-aee1-4266-ac25-be32421fb3e1",
                "confId":
                "e8e52b70-e7bc-4bdb-ad60-5f1addf17387",
                "createdDt":
                "2022-05-05T07:43:55Z",
                "error":
                "",
                "sourceId":
                "8df489745b1c4cb5b0ef81c6144f9283",
                "sourceType":
                "EKSCluster",
                "stackId":
                "arn:aws:cloudformation:us-west-2:1234567890AB:stack/LogHub-EKS-Cluster-PodLog-Pipeline-f34b2/1e8e2860-cc47-11ec-8d95-06039fb616cf",
                "stackName":
                "LogHub-EKS-Cluster-PodLog-Pipeline-f34b2",
                "status":
                "CREATING",
                "tags": [],
                "updatedDt":
                "2022-05-05T07:47:04Z"
            }],
            os.environ["EKS_CLUSTER_SOURCE_TABLE_NAME"]: [
                {
                    "id":
                    "8df489745b1c4cb5b0ef81c6144f9283",
                    "accountId":
                    None,
                    "aosDomainId":
                    "fcb4130d5f23c9958c31e356d183d29d",
                    "createdDt":
                    "2022-04-25T03:08:51Z",
                    "eksClusterArn":
                    "arn:aws:eks:us-west-2:1234567890AB:cluster/loghub",
                    "eksClusterName":
                    "loghub",
                    "eksClusterSGId":
                    "sg-03953da75263c53b0",
                    "endpoint":
                    "https://FAKED2BE96D3A6CEE098.gr7.us-west-2.eks.amazonaws.com",
                    "logAgentRoleArn":
                    iam_roles["LogAgentRole"]["Arn"],
                    "oidcIssuer":
                    "https://oidc.eks.us-west-2.amazonaws.com/id/FAKED2BE96D3A6CEE098",
                    "region":
                    None,
                    "status":
                    "ACTIVE",
                    "subnetIds": [
                        "subnet-0591f6d40e6d4ac43", "subnet-07b05dbbfdcb6c3d9",
                        "subnet-0434b33f03359705c", "subnet-08c2c326cf328c6b1",
                        "subnet-09f4c56735e755557", "subnet-0a2bcbddfeebd6495"
                    ],
                    "tags": [],
                    "updatedDt":
                    "2022-04-25T03:08:51Z",
                    "vpcId":
                    "vpc-0e483d44af38007ec"
                },
            ],
            os.environ["SUB_ACCOUNT_LINK_TABLE_NAME"]: []
        })


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
            "LambdaRole":
            iam_client.create_role(
                RoleName=
                "LogHub-EKS-Cluster-PodLog-DataBufferKDSRole7BCBC83-1II64RIV25JN3",
                AssumeRolePolicyDocument=assume_role_policy_str,
                Path="/my-path/",
            )["Role"],
            "LogAgentRole":
            iam_client.create_role(RoleName="LogAgentRole",
                                   AssumeRolePolicyDocument="some policy",
                                   Path="/")["Role"],
        }


def test_create_eks_cluster_pod_log_ingestion(ddb_client, sfn_client,
                                              sts_client, iam_roles,
                                              iam_client, remote_lambda):
    from eks_cluster_pod_log_pipeline_stfn_lambda_function import lambda_handler

    evt = {
        "id": "f34b2266-aee1-4266-ac25-be32421fb3e1",
        "appLogIngestionId": "60d7b565-25f4-4c3c-b09e-275e1d02183d",
        "appPipelineId": "f34b2266-aee1-4266-ac25-be32421fb3e1",
        "action": "START",
        "args": {
            "stackName":
            "LogHub-EKS-Cluster-PodLog-Pipeline-f34b2",
            "pattern":
            "KDSStack",
            "parameters": [{
                "ParameterKey": "ShardCountParam",
                "ParameterValue": "1"
            }, {
                "ParameterKey": "OpenSearchDomainParam",
                "ParameterValue": "wch-private"
            }, {
                "ParameterKey": "CreateDashboardParam",
                "ParameterValue": "No"
            }, {
                "ParameterKey": "OpenSearchDaysToWarmParam",
                "ParameterValue": "0"
            }, {
                "ParameterKey": "OpenSearchDaysToColdParam",
                "ParameterValue": "0"
            }, {
                "ParameterKey": "OpenSearchDaysToRetain",
                "ParameterValue": "0"
            }, {
                "ParameterKey": "EngineTypeParam",
                "ParameterValue": "OpenSearch"
            }, {
                "ParameterKey":
                "OpenSearchEndpointParam",
                "ParameterValue":
                "vpc-wch-private-hbgb2ktamqnb5cedzrty3blelu.us-west-2.es.amazonaws.com"
            }, {
                "ParameterKey": "OpenSearchIndexPrefix",
                "ParameterValue": "test"
            }, {
                "ParameterKey": "VpcIdParam",
                "ParameterValue": "vpc-05a90814226d2c713"
            }, {
                "ParameterKey":
                "SubnetIdsParam",
                "ParameterValue":
                "subnet-01f09e14e5b70c11f,subnet-06843d01e3da35b7d"
            }, {
                "ParameterKey": "SecurityGroupIdParam",
                "ParameterValue": "sg-0ec6c9b448792d1e6"
            }, {
                "ParameterKey":
                "FailedLogBucketParam",
                "ParameterValue":
                "loghub-loghubloggingbucket0fa53b76-1jyvyptgjbge9"
            }],
            "confId":
            "e8e52b70-e7bc-4bdb-ad60-5f1addf17387",
            "sourceIds": ["8df489745b1c4cb5b0ef81c6144f9283"],
            "sourceType":
            "EKSCluster",
            "createDashboard":
            "Yes",
            "source_ingestion_map": {
                "8df489745b1c4cb5b0ef81c6144f9283":
                "60d7b565-25f4-4c3c-b09e-275e1d02183d"
            }
        },
        "result": {
            "stackId":
            "arn:aws:cloudformation:us-west-2:1234567890AB:stack/LogHub-EKS-Cluster-PodLog-Pipeline-f34b2/1e8e2860-cc47-11ec-8d95-06039fb616cf",
            "stackStatus":
            "CREATE_COMPLETE",
            "error":
            "",
            "outputs": [{
                "OutputKey": "OSInitHelperFn",
                "OutputValue": remote_lambda["FunctionArn"],
            }, {
                "OutputKey":
                "KinesisStreamArn",
                "OutputValue":
                "arn:aws:kinesis:us-west-2:1234567890AB:stream/LogHub-EKS-Cluster-PodLog-Pipeline-f34b2-Stream790BDEE4-aGeLDuMS7B1i"
            }, {
                "OutputKey":
                "MyApiEndpoint869ABE96",
                "OutputValue":
                "https://jcrdnmy5s2.execute-api.us-west-2.amazonaws.com/prod/"
            }, {
                "OutputKey":
                "KinesisStreamName",
                "OutputValue":
                "LogHub-EKS-Cluster-PodLog-Pipeline-f34b2-Stream790BDEE4-aGeLDuMS7B1i"
            }, {
                "OutputKey": "KinesisStreamRegion",
                "OutputValue": "us-west-2"
            }]
        }
    }

    lambda_handler(evt, None)

    item = ddb_client.Table(os.environ["APPLOGINGESTION_TABLE"]).get_item(
        Key={'id': '60d7b565-25f4-4c3c-b09e-275e1d02183d'})['Item']

    assert item['status'] == 'ACTIVE'
