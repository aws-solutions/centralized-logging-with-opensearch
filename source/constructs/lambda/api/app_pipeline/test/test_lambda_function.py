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
    mock_kinesis,
)
from .conftest import init_ddb, get_test_zip_file1, make_graphql_lambda_event

REGEX = "(?<time>\\d{4}-\\d{2}-\\d{2}\\s*\\d{2}:\\d{2}:\\d{2}.\\d{3})\\s*(?<level>\\S+)\\s*\\[(?<thread>\\S+)\\]\\s*(?<logger>\\S+)\\s*:\\s*(?<message>[\\s\\S]+)"
TIME_FORMAT = "%Y-%m-%d %H:%M:%S.%L"


@pytest.fixture
def sfn_client():
    with mock_stepfunctions():
        sfn = boto3.client("stepfunctions")
        response = sfn.create_state_machine(
            name="LogHubAPIPipelineFlowSM",
            definition=json.dumps({
                "Comment": "A Hello World example of the Amazon States Language using Pass states",
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
            "LambdaRole": iam.create_role(
                RoleName="lambda-role",
                AssumeRolePolicyDocument="some policy",
                Path="/my-path/",
            )["Role"],
            "LogAgentRole": iam.create_role(
                RoleName="LogAgentRole", AssumeRolePolicyDocument="some policy", Path="/"
            )["Role"],
        }


@pytest.fixture
def remote_lambda(iam_roles):
    with mock_lambda():
        awslambda = boto3.client('lambda')

        yield awslambda.create_function(
            FunctionName='FAKE-LogHub-EKS-Cluster-PodLog-Pipel-OpenSearchHelperFn-ef8PiCbL9ixp',
            Runtime="python3.7",
            Role=iam_roles["LambdaRole"]["Arn"],
            Handler="lambda_function.lambda_handler",
            Code={"ZipFile": get_test_zip_file1()},
            Timeout=1,
        )


@pytest.fixture
def kinesis_client():
    with mock_kinesis():
        client = boto3.client("kinesis")
        yield client.create_stream(StreamName="mock-kds", ShardCount=5)


@pytest.fixture
def ddb_client(iam_roles, remote_lambda):
    with mock_dynamodb():
        yield init_ddb({
            os.environ["APPPIPELINE_TABLE"]: [
                {
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
                            "vpcId": "vpc-05a90814226d2c713"
                        },
                        "warmLogTransition": 0
                    },
                    "createdDt": "2022-05-05T07:43:55Z",
                    "error": "",
                    "kdsParas": {
                        "enableAutoScaling": False,
                        "kdsArn": "arn:aws:kinesis:us-west-2:1234567890AB:stream/mock-kds",
                        "maxShardNumber": 0,
                        "osHelperFnArn": remote_lambda["FunctionArn"],
                        "regionName": "us-west-2",
                        "startShardNumber": 1,
                        "streamName": "mock-kds"
                    },
                    "stackId": "arn:aws:cloudformation:us-west-2:1234567890AB:stack/LogHub-EKS-Cluster-PodLog-Pipeline-f34b2/1e8e2860-cc47-11ec-8d95-06039fb616cf",
                    "status": "ACTIVE",
                    "tags": []
                },
                {
                    "id": "4b5b721b-01ad-4a07-98fe-4d2a0e3ce4dc",
                    "aosParas": {
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
                            "vpcId": "vpc-05a90814226d2c713"
                        },
                        "warmLogTransition": 0
                    },
                    "createdDt": "2022-05-07T06:36:41Z",
                    "error": "",
                    "kdsParas": {
                        "enableAutoScaling": False,
                        "kdsArn": "arn:aws:kinesis:us-west-2:1234567890AB:stream/LogHub-AppPipe-4b5b7-Stream790BDEE4-HZ4crmUd5jJ3",
                        "maxShardNumber": 0,
                        "osHelperFnArn": remote_lambda["FunctionArn"],
                        "regionName": "us-west-2",
                        "startShardNumber": 1,
                        "streamName": "LogHub-AppPipe-4b5b7-Stream790BDEE4-HZ4crmUd5jJ3"
                    },
                    "stackId": "arn:aws:cloudformation:us-west-2:1234567890AB:stack/LogHub-AppPipe-4b5b7/0f1cf390-cdd0-11ec-a7af-06957ff291a7",
                    "status": "ACTIVE",
                    "tags": []
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
                        {
                            "format": TIME_FORMAT,
                            "key": "time",
                            "type": "date"
                        },
                        {
                            "format": "",
                            "key": "level",
                            "type": "text"
                        },
                        {
                            "format": "",
                            "key": "thread",
                            "type": "text"
                        },
                        {
                            "format": "",
                            "key": "logger",
                            "type": "text"
                        },
                        {
                            "format": "",
                            "key": "message",
                            "type": "text"
                        }
                    ],
                    "status": "ACTIVE",
                    "updatedDt": "2022-02-20T08:08:31Z",
                    "userLogFormat": "%d{yyyy-MM-dd HH:mm:ss.SSS} %-5level [%thread] %logger : %msg%n"
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
                    "updatedDt": "2022-05-05T07:47:04Z"
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
                    "tags": []
                }
            ],
        })


@pytest.fixture
def ddb_no_ingestion_client(iam_roles, remote_lambda):
    with mock_dynamodb():
        yield init_ddb({
            os.environ["APPPIPELINE_TABLE"]: [
                {
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
                            "vpcId": "vpc-05a90814226d2c713"
                        },
                        "warmLogTransition": 0
                    },
                    "createdDt": "2022-05-05T07:43:55Z",
                    "error": "",
                    "kdsParas": {
                        "enableAutoScaling": False,
                        "kdsArn": "arn:aws:kinesis:us-west-2:1234567890AB:stream/mock-kds",
                        "maxShardNumber": 0,
                        "osHelperFnArn": remote_lambda["FunctionArn"],
                        "regionName": "us-west-2",
                        "startShardNumber": 1,
                        "streamName": "mock-kds"
                    },
                    "stackId": "arn:aws:cloudformation:us-west-2:1234567890AB:stack/LogHub-EKS-Cluster-PodLog-Pipeline-f34b2/1e8e2860-cc47-11ec-8d95-06039fb616cf",
                    "status": "ACTIVE",
                    "tags": []
                },
                {
                    "id": "4b5b721b-01ad-4a07-98fe-4d2a0e3ce4dc",
                    "aosParas": {
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
                            "vpcId": "vpc-05a90814226d2c713"
                        },
                        "warmLogTransition": 0
                    },
                    "createdDt": "2022-05-07T06:36:41Z",
                    "error": "",
                    "kdsParas": {
                        "enableAutoScaling": False,
                        "kdsArn": "arn:aws:kinesis:us-west-2:1234567890AB:stream/LogHub-AppPipe-4b5b7-Stream790BDEE4-HZ4crmUd5jJ3",
                        "maxShardNumber": 0,
                        "osHelperFnArn": remote_lambda["FunctionArn"],
                        "regionName": "us-west-2",
                        "startShardNumber": 1,
                        "streamName": "LogHub-AppPipe-4b5b7-Stream790BDEE4-HZ4crmUd5jJ3"
                    },
                    "stackId": "arn:aws:cloudformation:us-west-2:1234567890AB:stack/LogHub-AppPipe-4b5b7/0f1cf390-cdd0-11ec-a7af-06957ff291a7",
                    "status": "ACTIVE",
                    "tags": []
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
                        {
                            "format": TIME_FORMAT,
                            "key": "time",
                            "type": "date"
                        },
                        {
                            "format": "",
                            "key": "level",
                            "type": "text"
                        },
                        {
                            "format": "",
                            "key": "thread",
                            "type": "text"
                        },
                        {
                            "format": "",
                            "key": "logger",
                            "type": "text"
                        },
                        {
                            "format": "",
                            "key": "message",
                            "type": "text"
                        }
                    ],
                    "status": "ACTIVE",
                    "updatedDt": "2022-02-20T08:08:31Z",
                    "userLogFormat": "%d{yyyy-MM-dd HH:mm:ss.SSS} %-5level [%thread] %logger : %msg%n"
                },
            ],
            os.environ["APPLOGINGESTION_TABLE"]: [],
        })


def test_validate_index_prefix_overlap(
    ddb_client, sfn_client, iam_roles, remote_lambda
):
    from common import AppPipelineValidator, APIException

    with pytest.raises(APIException):
        v = AppPipelineValidator(ddb_client.Table(os.environ["APPPIPELINE_TABLE"]))
        v.validate_index_prefix_overlap('hello', 'helloworld')


def test_get_app_pipeline(
    kinesis_client, ddb_client, sfn_client, iam_roles, remote_lambda
):
    from lambda_function import lambda_handler

    res = lambda_handler(make_graphql_lambda_event('getAppPipeline', {
        'id': 'f34b2266-aee1-4266-ac25-be32421fb3e1'
    }), None)

    assert res['id'] == 'f34b2266-aee1-4266-ac25-be32421fb3e1'


def test_delete_app_pipeline_expect_failed(
    kinesis_client, ddb_client, sfn_client, iam_roles, remote_lambda
):
    from lambda_function import lambda_handler, APIException

    with pytest.raises(APIException, match=r'Please delete the application log ingestion first'):
        lambda_handler(make_graphql_lambda_event('deleteAppPipeline', {
            'id': 'f34b2266-aee1-4266-ac25-be32421fb3e1'
        }), None)


def test_delete_app_pipeline_expect_success(
    kinesis_client, ddb_no_ingestion_client, sfn_client, iam_roles, remote_lambda
):
    from lambda_function import lambda_handler

    lambda_handler(make_graphql_lambda_event('deleteAppPipeline', {
        'id': 'f34b2266-aee1-4266-ac25-be32421fb3e1'
    }), None)


def test_list_app_pipelines(
    kinesis_client, ddb_no_ingestion_client, sfn_client, iam_roles, remote_lambda
):
    from lambda_function import lambda_handler

    res = lambda_handler(make_graphql_lambda_event('listAppPipelines', {
        'status': 'ACTIVE',
    }), None)

    assert res['total'] == 2

    res = lambda_handler(make_graphql_lambda_event('listAppPipelines', {
        'status': 'DELETED',
    }), None)

    assert res['total'] == 0

    res = lambda_handler(make_graphql_lambda_event('listAppPipelines', {
        'status': '',
    }), None)

    assert res['total'] == 2

    res = lambda_handler(make_graphql_lambda_event('listAppPipelines', {
    }), None)

    assert res['total'] == 2


def test_create_app_pipeline(
    kinesis_client, ddb_no_ingestion_client, sfn_client, iam_roles, remote_lambda
):
    from lambda_function import lambda_handler

    lambda_handler(make_graphql_lambda_event('createAppPipeline', {
        "aosParas": {
            "opensearchArn": "arn:aws:es:us-west-2:1234567890AB:domain/helloworld",
            "opensearchEndpoint": "vpc-helloworld-hbgb2ktamqnb5cedzrty3blelu.us-west-2.es.amazonaws.com",
            "domainName": "helloworld",
            "indexPrefix": "spring",
            "warmLogTransition": 0,
            "coldLogTransition": 0,
            "logRetention": 1,
            "shardNumbers": 5,
            "replicaNumbers": 1,
            "engine": "OpenSearch",
            "vpc": {
                "privateSubnetIds": "subnet-01f09e14e5b70c11f,subnet-06843d01e3da35b7d",
                "publicSubnetIds": "",
                "securityGroupId": "sg-0ec6c9b448792d1e6",
                "vpcId": "vpc-05a90814226d2c713"
            },
            "failedLogBucket": "loghub-loghubloggingbucket0fa53b76-1jyvyptgjbge9"
        },
        "kdsParas": {
            "kdsArn": "",
            "streamName": "",
            "enableAutoScaling": False,
            "startShardNumber": 1,
            "maxShardNumber": 0,
            "regionName": ""
        },
        "tags": []
    }), None)

    res = lambda_handler(make_graphql_lambda_event('listAppPipelines', {
        'status': 'CREATING',
    }), None)

    assert res['total'] == 1
