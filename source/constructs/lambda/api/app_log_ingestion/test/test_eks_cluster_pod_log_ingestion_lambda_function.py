# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import os
import json
import boto3
import pytest

from uuid import UUID
from moto import mock_dynamodb, mock_stepfunctions
from .conftest import init_ddb, make_graphql_lambda_event


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
def ddb_client():
    with mock_dynamodb():
        yield init_ddb({
            os.environ["APP_PIPELINE_TABLE_NAME"]: {
                "id": "f34b2266-aee1-4266-ac25-be32421fb3e1",
                "aosParas": {
                    "coldLogTransition": 0,
                    "domainName": "wch-private",
                    "engine": "OpenSearch",
                    "failedLogBucket": "loghub-loghubloggingbucket0fa53b76-1jyvyptgjbge9",
                    "indexPrefix": "helloworld",
                    "logRetention": 0,
                    "opensearchArn": "arn:aws:es:us-west-2:1234567890AB:domain/wch-private",
                    "opensearchEndpoint": "vpc-wch-private-hbgb2ktamqnb5cedzrty3blelu.us-west-2.es.amazonaws.com",
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
                    "kdsArn": "arn:aws:kinesis:us-west-2:1234567890AB:stream/LogHub-EKS-Cluster-PodLog-Pipeline-f34b2-Stream790BDEE4-aGeLDuMS7B1i",
                    "maxShardNumber": 0,
                    "osHelperFnArn": "arn:aws:lambda:us-west-2:1234567890AB:function:LogHub-EKS-Cluster-PodLog-Pipel-OpenSearchHelperFn-ef8PiCbL9ixp",
                    "regionName": "us-west-2",
                    "startShardNumber": 1,
                    "streamName": "LogHub-EKS-Cluster-PodLog-Pipeline-f34b2-Stream790BDEE4-aGeLDuMS7B1i"
                },
                "stackId": "arn:aws:cloudformation:us-west-2:1234567890AB:stack/LogHub-EKS-Cluster-PodLog-Pipeline-f34b2/1e8e2860-cc47-11ec-8d95-06039fb616cf",
                "status": "ACTIVE",
                "tags": []
            },
            os.environ["APP_LOG_CONFIG_TABLE_NAME"]: [
                {
                    "id": "e8e52b70-e7bc-4bdb-ad60-5f1addf17387",
                    "confName": "SpringBoot0220",
                    "createdDt": "2022-02-20T08:05:39Z",
                    "logPath": "/var/log/loghub/springboot/*.log",
                    "logType": "MultiLineText",
                    "multilineLogParser": "JAVA_SPRING_BOOT",
                    "regularExpression": "(?<time>\\d{4}-\\d{2}-\\d{2}\\s*\\d{2}:\\d{2}:\\d{2}.\\d{3})\\s*(?<level>\\S+)\\s*\\[(?<thread>\\S+)\\]\\s*(?<logger>\\S+)\\s*:\\s*(?<message>[\\s\\S]+)",
                    "regularSpecs": [
                        {
                            "format": "yyyy-MM-dd HH:mm:ss.SSS",
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
            os.environ["APPLOGINGESTION_TABLE"]: []
        })


def test_create_eks_cluster_pod_log_ingestion(
    ddb_client, sfn_client
):
    from eks_cluster_pod_log_ingestion_lambda_function import lambda_handler

    evt = make_graphql_lambda_event('createEKSClusterPodLogIngestion', {
        "confId": "e8e52b70-e7bc-4bdb-ad60-5f1addf17387",
        "eksClusterId": "8df489745b1c4cb5b0ef81c6144f9283",
        "aosParas": {
            "opensearchArn": "arn:aws:es:us-west-2:1234567890AB:domain/wch-private",
            "domainName": "wch-private",
            "opensearchEndpoint": "vpc-private-hbgb2ktamqnb5cedzrty3blelu.us-west-2.es.amazonaws.com",
            "indexPrefix": "test",
            "warmLogTransition": 0,
            "coldLogTransition": 0,
            "logRetention": 0,
            "engine": "OpenSearch",
            "vpc": {
                "privateSubnetIds": "subnet-01f09e14e5b70c11f,subnet-06843d01e3da35b7d",
                "publicSubnetIds": "",
                "securityGroupId": "sg-0ec6c9b448792d1e6",
                "vpcId": "vpc-05a90814226d2c713"
            },
            "failedLogBucket": "loghub-loghubloggingbucket0fa53b76-1jyvyptgjbge9",
        },
        "kdsParas": {
            "kdsArn": "",
            "streamName": "",
            "enableAutoScaling": False,
            "startShardNumber": 1,
            "maxShardNumber": 0,
            "regionName": ""
        },
        "tags": [],
    })

    res = lambda_handler(evt, None)

    assert is_valid_uuid(res)

    # Test the unknow action
    with pytest.raises(RuntimeError):
        lambda_handler(
            {
                "action": "unknowAction",
                "confId": "e8e52b70-e7bc-4bdb-ad60-5f1addf17387",
            },
            None,
        )


def is_valid_uuid(uuid_to_test, version=4):
    """
    Check if uuid_to_test is a valid UUID.

     Parameters
    ----------
    uuid_to_test : str
    version : {1, 2, 3, 4}

     Returns
    -------
    `True` if uuid_to_test is a valid UUID, otherwise `False`.

     Examples
    --------
    >>> is_valid_uuid('c9bf9e57-1685-4c89-bafb-ff5af830be8a')
    True
    >>> is_valid_uuid('c9bf9e58')
    False
    """

    try:
        uuid_obj = UUID(uuid_to_test, version=version)
    except ValueError:
        return False
    return str(uuid_obj) == uuid_to_test
