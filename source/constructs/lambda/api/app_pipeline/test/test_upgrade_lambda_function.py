# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import os
import json
import boto3
import pytest

from moto import (
    mock_dynamodb,
    mock_iam,
    mock_sts,
)
from .conftest import init_ddb, get_test_zip_file1, make_graphql_lambda_event


@pytest.fixture
def iam_roles():
    with mock_iam():
        boto3.client("iam")
        yield


@pytest.fixture
def sts_client():
    with mock_sts():
        boto3.client("sts", region_name=os.environ.get("AWS_REGION"))
        yield


@pytest.fixture
def ddb_client():
    with mock_dynamodb():
        yield init_ddb({
            os.environ["APPPIPELINE_TABLE"]: [
                {
                    "id": "f34b2266-aee1-4266-ac25-be32421fb3e1",
                    "aosParas": {
                        "coldLogTransition": 0,
                        "domainName": "helloworld",
                        "engine": "OpenSearch",
                        "failedLogBucket":
                        "loghub-loghubloggingbucket0fa53b76-1jyvyptgjbge9",
                        "indexPrefix": "helloworld",
                        "logRetention": 0,
                        "opensearchArn":
                        "arn:aws:es:us-west-2:1234567890AB:domain/helloworld",
                        "opensearchEndpoint":
                        "vpc-helloworld-hbgb2ktamqnb5cedzrty3blelu.us-west-2.es.amazonaws.com",
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
                        "enableAutoScaling": False,
                        "kdsArn":
                        "arn:aws:kinesis:us-west-2:1234567890AB:stream/mock-kds",
                        "maxShardNumber": 0,
                        "osHelperFnArn": "FunctionArn",
                        "regionName": "us-west-2",
                        "startShardNumber": 1,
                        "streamName": "mock-kds"
                    },
                    "stackId":
                    "arn:aws:cloudformation:us-west-2:1234567890AB:stack/LogHub-EKS-Cluster-PodLog-Pipeline-f34b2/1e8e2860-cc47-11ec-8d95-06039fb616cf",
                    "status": "ACTIVE",
                    "tags": []
                },
                {
                    "id": "4b5b721b-01ad-4a07-98fe-4d2a0e3ce4dc",
                    "aosParas": {
                        "coldLogTransition": 0,
                        "domainName": "helloworld",
                        "engine": "OpenSearch",
                        "failedLogBucket":
                        "loghub-loghubloggingbucket0fa53b76-1jyvyptgjbge9",
                        "indexPrefix": "eks-pipe2",
                        "logRetention": 0,
                        "opensearchArn":
                        "arn:aws:es:us-west-2:1234567890AB:domain/helloworld",
                        "opensearchEndpoint":
                        "vpc-helloworld-hbgb2ktamqnb5cedzrty3blelu.us-west-2.es.amazonaws.com",
                        "vpc": {
                            "privateSubnetIds":
                            "subnet-01f09e14e5b70c11f,subnet-06843d01e3da35b7d",
                            "publicSubnetIds": "",
                            "securityGroupId": "sg-0ec6c9b448792d1e6",
                            "vpcId": "vpc-05a90814226d2c713"
                        },
                        "warmLogTransition": 0
                    },
                    "createdDt": "2022-05-07T06:36:41Z",
                    "error": "",
                    "kdsParas": {
                        "enableAutoScaling":
                        False,
                        "kdsArn":
                        "arn:aws:kinesis:us-west-2:1234567890AB:stream/LogHub-AppPipe-4b5b7-Stream790BDEE4-HZ4crmUd5jJ3",
                        "maxShardNumber":
                        0,
                        "osHelperFnArn":
                        "Arn",
                        "regionName":
                        "us-west-2",
                        "startShardNumber":
                        1,
                        "streamName":
                        "LogHub-AppPipe-4b5b7-Stream790BDEE4-HZ4crmUd5jJ3"
                    },
                    "stackId":
                    "arn:aws:cloudformation:us-west-2:1234567890AB:stack/LogHub-AppPipe-4b5b7/0f1cf390-cdd0-11ec-a7af-06957ff291a7",
                    "status": "INACTIVE",
                    "tags": []
                },
            ],
        })


def test_lambda_handler(
    sts_client,
    ddb_client,
    iam_roles,
):
    from upgrade_lambda_function import lambda_handler

    lambda_handler(
        make_graphql_lambda_event(
            'upgradeAppPipeline',
            {'ids': ['f34b2266-aee1-4266-ac25-be32421fb3e1']}), None)
