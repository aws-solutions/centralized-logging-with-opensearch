# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import json
import pytest
import os
import boto3
from moto import mock_cloudformation, mock_s3, mock_sts, mock_dynamodb


@pytest.fixture
def start_event():
    with open("./test/event/start_event.json", "r") as f:
        return json.load(f)


@pytest.fixture
def stop_event():
    with open("./test/event/stop_event.json", "r") as f:
        return json.load(f)


@pytest.fixture
def query_event():
    with open("./test/event/query_event.json", "r") as f:
        return json.load(f)
    

@pytest.fixture
def update_event():
    with open("./test/event/update_event.json", "r") as f:
        return json.load(f)

pipeline_info_1 = {
    "id": "ee776174-5492-4d36-97b7-589845388012",
    "createdAt": "2023-04-03T09:02:36Z",
    "destinationType": "S3",
    "error": "",
    "helperLogGroupName": "/aws/lambda/CL-pipe-ee776174-OpenSearchHelperFn-CQZg6RqIGSIc",
    "parameters": [
        {"parameterKey": "engineType", "parameterValue": "OpenSearch"},
        {
            "parameterKey": "logBucketName",
            "parameterValue": "amzn-s3-demo-logging-bucket",
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
            "parameterValue": "amzn-s3-demo-logging-bucket",
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
    "status": "CREATING",
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

@mock_sts
@mock_cloudformation
def test_lambda_function_start(mocker, start_event, ddb_client):
    import osi_processor_flow

    mocker.patch("osi_processor_flow.osis.create_pipeline", return_value={"Pipeline":{"PipelineName":"cl-osi-pipeline-xxx"}})
    result = osi_processor_flow.lambda_handler(start_event, None)
    # Expect Execute successfully.

    assert result["action"] == "QUERY"

    assert "osiPipelineStatus" in result["result"]
    assert result["result"]["osiPipelineStatus"] == "CREATE_IN_PROGRESS"

@mock_sts
@mock_cloudformation
def test_lambda_function_stop(mocker, stop_event, ddb_client):
    import osi_processor_flow

    mocker.patch("osi_processor_flow.osis.delete_pipeline", return_value={})
    result = osi_processor_flow.lambda_handler(stop_event, None)
    # Expect Execute successfully.

    assert result["action"] == "QUERY"

    assert "osiPipelineStatus" in result["result"]
    assert result["result"]["osiPipelineStatus"] == "DELETE_IN_PROGRESS"

@mock_sts
@mock_cloudformation
def test_lambda_function_update(mocker, update_event, ddb_client):
    import osi_processor_flow

    osi_processor_flow.lambda_handler(update_event, None)

    region = os.environ.get("AWS_REGION")
    table_name = os.environ.get("PIPELINE_TABLE_NAME")
    ddb = boto3.resource("dynamodb", region_name=region)
    table = ddb.Table(table_name)
    response = table.get_item(
        Key={"id": "ee776174-5492-4d36-97b7-589845388012"}
    )
    item = response["Item"]
    assert item["status"] == "CREATING"

@mock_sts
@mock_cloudformation
def test_lambda_function_query(mocker, query_event, ddb_client):
    import osi_processor_flow

    mocker.patch("osi_processor_flow.osis.delete_pipeline", return_value={"Pipeline":{"Status":"CREATING", "StatusReason": {"Description": "Still creating"}}})
    result = osi_processor_flow.lambda_handler(query_event, None)

    assert result["action"] == "QUERY"

    assert "osiPipelineStatus" in result["result"]
    assert result["result"]["osiPipelineStatus"] == "QUERY_FAILED"
    assert result["result"]["statusReason"] == "UNKNOWN"