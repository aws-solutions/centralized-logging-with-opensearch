# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import json
import pytest
import os
import boto3
from moto import mock_iam, mock_lambda, mock_sts, mock_dynamodb
from .conftest import (
    get_test_zip_file1,
)

pipeline_info_1 = {
    "id": "cl-osi-pipeline-xxx",
    "createdAt": "2023-04-03T09:02:36Z",
    "destinationType": "S3",
    "error": "",
    "helperLogGroupName": "/aws/lambda/CL-pipe-ee776174-OpenSearchHelperFn-CQZg6RqIGSIc",
    "parameters": [
        {"parameterKey": "engineType", "parameterValue": "OpenSearch"},
        {
            "parameterKey": "logBucketName",
            "parameterValue": "centralizedlogging-solutionloggingbucket0fa53b76-1ff3q5fgfg7un",
        },
        {
            "parameterKey": "logBucketPrefix",
            "parameterValue": "AWSLogs/111111111111/WAFLogs/us-west-2/solution-dev-us-west-2-01/",
        },
        {
            "parameterKey": "endpoint",
            "parameterValue": "vpc-solution-os-yhb4z4uzd544pna27wlqqumk2y.us-west-2.es.amazonaws.com",
        },
        {"parameterKey": "domainName", "parameterValue": "solution-os"},
        {"parameterKey": "indexPrefix", "parameterValue": "solution-dev-us-west-2-01"},
        {"parameterKey": "createDashboard", "parameterValue": "Yes"},
        {"parameterKey": "vpcId", "parameterValue": "vpc-0737368a3ba456453"},
        {
            "parameterKey": "subnetIds",
            "parameterValue": "subnet-0b99add032f87385b,subnet-0194f25ad3526e8b5",
        },
        {"parameterKey": "securityGroupId", "parameterValue": "sg-0a8deb49daed73ecf"},
        {"parameterKey": "shardNumbers", "parameterValue": "1"},
        {"parameterKey": "replicaNumbers", "parameterValue": "1"},
        {"parameterKey": "warmAge", "parameterValue": ""},
        {"parameterKey": "coldAge", "parameterValue": ""},
        {"parameterKey": "retainAge", "parameterValue": "3d"},
        {"parameterKey": "rolloverSize", "parameterValue": "30gb"},
        {"parameterKey": "indexSuffix", "parameterValue": "yyyy-MM-dd"},
        {"parameterKey": "codec", "parameterValue": "best_compression"},
        {"parameterKey": "refreshInterval", "parameterValue": "1s"},
        {
            "parameterKey": "backupBucketName",
            "parameterValue": "centralizedlogging-solutionloggingbucket0fa53b76-1ff3q5fgfg7un",
        },
        {
            "parameterKey": "defaultCmkArnParam",
            "parameterValue": "arn:aws:kms:us-west-2:111111111111:key/dbf10ef9-adc5-45fe-90b7-c7cda74130c9",
        },
        {"parameterKey": "logSourceAccountId", "parameterValue": "111111111111"},
        {"parameterKey": "logSourceRegion", "parameterValue": "us-west-2"},
        {"parameterKey": "logSourceAccountAssumeRole", "parameterValue": ""},
    ],
    "processorLogGroupName": "/aws/lambda/CL-pipe-ee776174-LogProcessorFn",
    "source": "solution-dev-us-west-2-01",
    "stackId": "arn:aws:cloudformation:us-west-2:111111111111:stack/CL-pipe-ee776174/47d47e00-d1fe-11ed-87a3-0274021fa06b",
    "stackName": "CL-pipe-ee776174",
    "status": "ACTIVE",
    "tags": [],
    "target": "solution-os",
    "type": "WAF",
}

@pytest.fixture
def ddb_client():
    with mock_dynamodb():
        ddb = boto3.resource("dynamodb", region_name=os.environ.get("AWS_REGION"))
        # Mock the AppPipelineTable
        app_pipeline_table_name = "Solution-AppPipelineTable-xxx"
        app_pipeline_table = ddb.create_table(
            TableName=app_pipeline_table_name,
            KeySchema=[{"AttributeName": "id", "KeyType": "HASH"}],
            AttributeDefinitions=[{"AttributeName": "id", "AttributeType": "S"}],
            ProvisionedThroughput={"ReadCapacityUnits": 10, "WriteCapacityUnits": 10},
        )
        data_list = [pipeline_info_1]
        with app_pipeline_table.batch_writer() as batch:
            for data in data_list:
                batch.put_item(Item=data)

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
def remote_lambda(iam_roles):
    with mock_lambda():
        awslambda = boto3.client("lambda")

        yield awslambda.create_function(
            FunctionName="CL-logProcessorFn-ef8PiCbL9ixp",
            Runtime="python3.11",
            Role=iam_roles["LambdaRole"]["Arn"],
            Handler="lambda_function.lambda_handler",
            Code={"ZipFile": get_test_zip_file1()},
            Timeout=1,
        )

@pytest.fixture
def check_event():
    with open("./test/event/check_event.json", "r") as f:
        return json.load(f)

@mock_sts
def test_lambda_function_ok(mocker, check_event, remote_lambda, ddb_client):
    import osi_log_processor_helper

    aws_ddb_client = boto3.resource('dynamodb')
    pipeline_table_name = os.environ['PIPELINE_TABLE_NAME']
    osi_pipeline_name = os.environ['OSI_PIPELINE_NAME']
    pipeline_table = aws_ddb_client.Table(pipeline_table_name)

    result = osi_log_processor_helper.lambda_handler(check_event, None)
    # Expect Execute successfully.

    assert result["action"] == "UPDATE"

    response = pipeline_table.get_item(Key={'id': osi_pipeline_name})
    print(response)
    assert response['Item']['status'] == 'CREATING'

