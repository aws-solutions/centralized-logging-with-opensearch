# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

from commonlib.aws import AWSConnection
from commonlib.exception import APIException
import pytest
import os
import boto3


from commonlib.model import PipelineType, PipelineAlarmType


from moto import (
    mock_sts,
    mock_dynamodb,
    mock_logs,
    mock_cloudwatch,
    mock_sns,
)

from .conftest import init_table, make_graphql_lambda_event


@pytest.fixture
def ddb_client():
    with mock_dynamodb():
        ddb = boto3.resource("dynamodb", region_name=os.environ.get("AWS_REGION"))

        # Mock Service Pipeline Table
        service_pipeline_table_name = os.environ.get("PIPELINE_TABLE_NAME")
        service_pipeline_table = ddb.create_table(
            TableName=service_pipeline_table_name,
            KeySchema=[{"AttributeName": "id", "KeyType": "HASH"}],
            AttributeDefinitions=[{"AttributeName": "id", "AttributeType": "S"}],
            ProvisionedThroughput={"ReadCapacityUnits": 10, "WriteCapacityUnits": 10},
        )
        data_list = [
            {
                "id": "c34f2159-34e4-4410-976b-9a565adef81b",
                "bufferResourceArn": "",
                "bufferResourceName": "",
                "createdAt": "2023-04-28T02:43:51Z",
                "deliveryStreamArn": "",
                "deliveryStreamName": "",
                "destinationType": "S3",
                "error": "",
                "helperLogGroupName": "/aws/lambda/CL-pipe-c34f2159-OpenSearchHelperFn-tJZgzlWN1k99",
                "logEventQueueArn": "arn:aws:sqs:us-west-2:123456789012:CL-pipe-c34f2159-LogEventQueue-9SeRI7idCHFR",
                "logEventQueueName": "CL-pipe-c34f2159-LogEventQueue-9SeRI7idCHFR",
                "monitor": {
                    "emails": ["your_email@example.com"],
                    "pipelineAlarmStatus": "ENABLED",
                    "snsTopicArn": "arn:aws:sns:us-west-2:123456789012:CL_c34f2159",
                    "snsTopicName": "CL_c34f2159",
                },
                "parameters": [
                    {"parameterKey": "engineType", "parameterValue": "OpenSearch"},
                    {
                        "parameterKey": "logBucketName",
                        "parameterValue": "solution-logs-us-west-2",
                    },
                    {
                        "parameterKey": "logBucketPrefix",
                        "parameterValue": "cloudtrail-s3/",
                    },
                    {
                        "parameterKey": "endpoint",
                        "parameterValue": "vpc-workshop-os-ig6rsq25cj44cvdrjf25ptzbaq.us-west-2.es.amazonaws.com",
                    },
                    {"parameterKey": "domainName", "parameterValue": "workshop-os"},
                    {
                        "parameterKey": "indexPrefix",
                        "parameterValue": "kervin-alarm-dev-002",
                    },
                    {"parameterKey": "createDashboard", "parameterValue": "Yes"},
                    {
                        "parameterKey": "vpcId",
                        "parameterValue": "vpc-0737368a3ba456453",
                    },
                    {
                        "parameterKey": "subnetIds",
                        "parameterValue": "subnet-0b99add032f87385b,subnet-0194f25ad3526e8b5",
                    },
                    {
                        "parameterKey": "securityGroupId",
                        "parameterValue": "sg-0a8deb49daed73ecf",
                    },
                    {"parameterKey": "shardNumbers", "parameterValue": "1"},
                    {"parameterKey": "replicaNumbers", "parameterValue": "1"},
                    {"parameterKey": "warmAge", "parameterValue": ""},
                    {"parameterKey": "coldAge", "parameterValue": ""},
                    {"parameterKey": "retainAge", "parameterValue": "3d"},
                    {"parameterKey": "rolloverSize", "parameterValue": "30gb"},
                    {"parameterKey": "indexSuffix", "parameterValue": "yyyy-MM-dd"},
                    {"parameterKey": "codec", "parameterValue": "best_compression"},
                    {"parameterKey": "refreshInterval", "parameterValue": "1s"},
                    {"parameterKey": "enableAutoScaling", "parameterValue": "No"},
                    {
                        "parameterKey": "defaultCmkArnParam",
                        "parameterValue": "arn:aws:kms:us-west-2:123456789012:key/dbf10ef9-adc5-45fe-90b7-c7cda74130c9",
                    },
                    {
                        "parameterKey": "backupBucketName",
                        "parameterValue": "centralizedlogging-solutionloggingbucket0fa53b76-1ff3q5fgfg7un",
                    },
                    {
                        "parameterKey": "logSourceAccountId",
                        "parameterValue": "123456789012",
                    },
                    {
                        "parameterKey": "logSourceRegion",
                        "parameterValue": "us-west-2",
                    },
                    {
                        "parameterKey": "logSourceAccountAssumeRole",
                        "parameterValue": "",
                    },
                ],
                "processorLogGroupName": "/aws/lambda/CL-pipe-c34f2159-LogProcessorFn",
                "source": "solution-us-west-2",
                "stackId": "arn:aws:cloudformation:us-west-2:123456789012:stack/CL-pipe-c34f2159/83608ee0-e56e-11ed-950c-0a8d5b048915",
                "stackName": "CL-pipe-c34f2159",
                "status": "ACTIVE",
                "tags": [],
                "target": "workshop-os",
                "type": "CloudTrail",
            }
        ]
        init_table(service_pipeline_table, data_list)

        # Mock App Pipeline Table
        app_pipeline_table_name = os.environ.get("APP_PIPELINE_TABLE_NAME")
        app_pipeline_table = ddb.create_table(
            TableName=app_pipeline_table_name,
            KeySchema=[{"AttributeName": "pipelineId", "KeyType": "HASH"}],
            AttributeDefinitions=[
                {"AttributeName": "pipelineId", "AttributeType": "S"}
            ],
            ProvisionedThroughput={"ReadCapacityUnits": 10, "WriteCapacityUnits": 10},
        )
        data_list = [
            {
                "pipelineId": "62a37b50-72af-4a7b-9d4b-d859d538a19c",
                "indexPrefix": "syslog-dev-03",
                "aosParams": {
                    "coldLogTransition": 0,
                    "domainName": "solution-os",
                    "engine": "OpenSearch",
                    "failedLogBucket": "solution-solutionloggingbucket0fa53b76-12cw0hl0kfnk6",
                    "indexPrefix": "syslog-dev-03",
                    "logRetention": 10,
                    "opensearchArn": "arn:aws:es:us-west-2:123456789012:domain/solution-os",
                    "opensearchEndpoint": "vpc-solution-os-yhb4z4uzd544pna27wlqqumk2y.us-west-2.es.amazonaws.com",
                    "replicaNumbers": 0,
                    "shardNumbers": 1,
                    "vpc": {
                        "privateSubnetIds": "subnet-0e33bba1e55791d9a,subnet-0c34c064b47a5f4fb",
                        "publicSubnetIds": "",
                        "securityGroupId": "sg-06ee9849f105f4208",
                        "vpcId": "vpc-09990f6348b2ba3d9",
                    },
                    "warmLogTransition": 0,
                },
                "bufferAccessRoleArn": "arn:aws:iam::123456789012:role/Solution-AppPipe-62a37-BufferAccessRoleDF53FD85-4BU06LEOL8JH",
                "bufferAccessRoleName": "Solution-AppPipe-62a37-BufferAccessRoleDF53FD85-4BU06LEOL8JH",
                "bufferParams": [
                    {"paramKey": "enableAutoScaling", "paramValue": "false"},
                    {"paramKey": "shardCount", "paramValue": "1"},
                    {"paramKey": "minCapacity", "paramValue": "1"},
                    {"paramKey": "maxCapacity", "paramValue": "5"},
                ],
                "bufferResourceArn": "arn:aws:kinesis:us-west-2:123456789012:stream/Solution-AppPipe-62a37-KDSBufferStream21B531A6-xhE79t2qh4um",
                "bufferResourceName": "Solution-AppPipe-62a37-KDSBufferStream21B531A6-xhE79t2qh4um",
                "bufferType": "KDS",
                "createdAt": "2022-10-27T07:47:19Z",
                "logConfigId": "logConfigId",
                "logConfigVersionNumber": 100,
                "error": "",
                "osHelperFnArn": "arn:aws:lambda:us-west-2:123456789012:function:Solution-AppPipe-62a37-OpenSearchHelperFn-z50kqDR01c6u",
                "stackId": "arn:aws:cloudformation:us-west-2:123456789012:stack/Solution-AppPipe-62a37/96ea1a40-55cb-11ed-868d-0a1261729f93",
                "status": "ACTIVE",
                "monitor": {
                    "status": "ENABLED",
                    "backupBucketName": "solution-solutionloggingbucket0fa53b76-12cw0hl0kfnk6",
                    "errorLogPrefix": "error/",
                },
                "helperLogGroupName": "/aws/lambda/CL-pipe-c34f2159-OpenSearchHelperFn-tJZgzlWN1k99",
                "processorLogGroupName": "/aws/lambda/CL-pipe-c34f2159-LogProcessorFn",
                "tags": [],
            },
        ]
        init_table(app_pipeline_table, data_list)

        # Mock App Ingestion Table
        app_ingestion_table_name = os.environ.get("APP_LOG_INGESTION_TABLE_NAME")
        app_ingestion_table = ddb.create_table(
            TableName=app_ingestion_table_name,
            KeySchema=[{"AttributeName": "id", "KeyType": "HASH"}],
            AttributeDefinitions=[{"AttributeName": "id", "AttributeType": "S"}],
            ProvisionedThroughput={"ReadCapacityUnits": 10, "WriteCapacityUnits": 10},
        )
        data_list = [
            {
                "id": "60d7b565-25f4-4c3c-b09e-275e1d02183d",
                "appPipelineId": "62a37b50-72af-4a7b-9d4b-d859d538a19c",
                "confId": "e8e52b70-e7bc-4bdb-ad60-5f1addf17387",
                "createdAt": "2022-05-05T07:43:55Z",
                "error": "",
                "sourceId": "8df489745b1c4cb5b0ef81c6144f9283",
                "sourceType": "EKSCluster",
                "stackId": "arn:aws:cloudformation:us-west-2:1234567890AB:stack/Solution-EKS-Cluster-PodLog-Pipeline-f34b2/1e8e2860-cc47-11ec-8d95-06039fb616cf",
                "stackName": "Solution-EKS-Cluster-PodLog-Pipeline-f34b2",
                "status": "ACTIVE",
                "tags": [],
                "updatedAt": "2022-05-05T07:47:04Z",
            },
            {
                "id": "ce7f497c-8d73-40f7-a940-26da2540822e",
                "appPipelineId": "62a37b50-72af-4a7b-9d4b-d859d538a19c",
                "confId": "e8e52b70-e7bc-4bdb-ad60-5f1addf17387",
                "createdAt": "2022-05-07T08:17:06Z",
                "error": "",
                "sourceId": "488810533e5d430ba3660b7283fb4bf1",
                "sourceType": "EKSCluster",
                "stackId": "",
                "stackName": "",
                "status": "ACTIVE",
                "tags": [],
            },
        ]
        init_table(app_ingestion_table, data_list)
        yield


@mock_sts
@mock_cloudwatch
@mock_logs
@mock_sns
def test_service_pipeline_alarm_api(ddb_client):
    import lambda_function

    # Test create the alarm for service pipeline
    result = lambda_function.lambda_handler(
        make_graphql_lambda_event(
            "createPipelineAlarm",
            {
                "pipelineId": "c34f2159-34e4-4410-976b-9a565adef81b",
                "pipelineType": PipelineType.SERVICE,
                "emails": "your_email@example.com",
            },
        ),
        None,
    )
    assert result == "OK"

    # Test create the alarm for service pipeline with specified sns topic name
    result = lambda_function.lambda_handler(
        make_graphql_lambda_event(
            "createPipelineAlarm",
            {
                "pipelineId": "c34f2159-34e4-4410-976b-9a565adef81b",
                "pipelineType": PipelineType.SERVICE,
                "snsTopicName": "test-topic-name",
                "emails": "your_email@example.com",
            },
        ),
        None,
    )
    assert result == "OK"

    conn = AWSConnection()
    sns_client = conn.get_client("sns")
    response = sns_client.list_topics()
    topics = response["Topics"]
    assert topics == [
        {"TopicArn": "arn:aws:sns:us-east-1:123456789012:CL_c34f2159"},
        {"TopicArn": "arn:aws:sns:us-east-1:123456789012:test-topic-name_c34f2159"},
    ]

    # Test create the alarm for service pipeline with specified sns topic name,
    # and this topic has already been created
    result = lambda_function.lambda_handler(
        make_graphql_lambda_event(
            "createPipelineAlarm",
            {
                "pipelineId": "c34f2159-34e4-4410-976b-9a565adef81b",
                "pipelineType": PipelineType.SERVICE,
                "snsTopicName": "test-topic-name",
                "emails": "your_email@example.com",
            },
        ),
        None,
    )
    assert result == "OK"

    response = sns_client.list_topics()
    topics = response["Topics"]
    assert topics == [
        {"TopicArn": "arn:aws:sns:us-east-1:123456789012:CL_c34f2159"},
        {"TopicArn": "arn:aws:sns:us-east-1:123456789012:test-topic-name_c34f2159"},
    ]

    # Test get the alarm for service pipeline
    result = lambda_function.lambda_handler(
        make_graphql_lambda_event(
            "getPipelineAlarm",
            {
                "pipelineId": "c34f2159-34e4-4410-976b-9a565adef81b",
                "pipelineType": PipelineType.SERVICE,
                "alarmName": PipelineAlarmType.PROCESSOR_ERROR_RECORD_ALARM,
            },
        ),
        None,
    )
    assert result == {
        "alarms": [
            {
                "name": PipelineAlarmType.PROCESSOR_ERROR_RECORD_ALARM,
                "resourceId": "c34f2159-34e4-4410-976b-9a565adef81b",
                "status": "OK",
            }
        ]
    }

    # Test update alarm sns topic arn for service pipeline
    # Create a new sns topic first
    sns = boto3.client("sns", region_name=os.environ.get("AWS_REGION"))
    response = sns.create_topic(
        Name="new-sns-topic",
    )
    new_topic_arn = response["TopicArn"]

    result = lambda_function.lambda_handler(
        make_graphql_lambda_event(
            "updatePipelineAlarm",
            {
                "pipelineId": "c34f2159-34e4-4410-976b-9a565adef81b",
                "pipelineType": PipelineType.SERVICE,
                "snsTopicArn": new_topic_arn,
            },
        ),
        None,
    )
    assert result == "OK"

    # Test update alarm without configuring a sns topic arn
    with pytest.raises(APIException):
        result = lambda_function.lambda_handler(
            make_graphql_lambda_event(
                "updatePipelineAlarm",
                {
                    "pipelineId": "c34f2159-34e4-4410-976b-9a565adef81b",
                    "pipelineType": PipelineType.SERVICE,
                },
            ),
            None,
        )

    # Test delete the alarm for service pipeline
    result = lambda_function.lambda_handler(
        make_graphql_lambda_event(
            "deletePipelineAlarm",
            {
                "pipelineId": "c34f2159-34e4-4410-976b-9a565adef81b",
                "pipelineType": PipelineType.SERVICE,
            },
        ),
        None,
    )
    assert result == "OK"


@mock_sts
@mock_cloudwatch
@mock_logs
@mock_sns
def test_app_pipeline_alarm_api(ddb_client):
    import lambda_function

    # Test create the alarm for app pipeline
    result = lambda_function.lambda_handler(
        make_graphql_lambda_event(
            "createPipelineAlarm",
            {
                "pipelineId": "62a37b50-72af-4a7b-9d4b-d859d538a19c",
                "pipelineType": PipelineType.APP,
                "emails": "your_email@example.com",
            },
        ),
        None,
    )
    assert result == "OK"

    # Test get the alarm for app pipeline
    # Pipeline level
    result = lambda_function.lambda_handler(
        make_graphql_lambda_event(
            "getPipelineAlarm",
            {
                "pipelineId": "62a37b50-72af-4a7b-9d4b-d859d538a19c",
                "pipelineType": PipelineType.APP,
                "alarmName": PipelineAlarmType.PROCESSOR_ERROR_RECORD_ALARM,
            },
        ),
        None,
    )
    assert result == {
        "alarms": [
            {
                "name": PipelineAlarmType.PROCESSOR_ERROR_RECORD_ALARM,
                "resourceId": "62a37b50-72af-4a7b-9d4b-d859d538a19c",
                "status": "OK",
            }
        ]
    }

    # Ingestion level
    result = lambda_function.lambda_handler(
        make_graphql_lambda_event(
            "getPipelineAlarm",
            {
                "pipelineId": "62a37b50-72af-4a7b-9d4b-d859d538a19c",
                "pipelineType": PipelineType.APP,
                "alarmName": PipelineAlarmType.FLUENTBIT_OUTPUT_RETRIED_RECORDS_ALARM,
            },
        ),
        None,
    )
    assert result == {
        "alarms": [
            {
                "name": PipelineAlarmType.FLUENTBIT_OUTPUT_RETRIED_RECORDS_ALARM,
                "resourceId": "60d7b565-25f4-4c3c-b09e-275e1d02183d",
                "status": "OK",
            },
            {
                "name": PipelineAlarmType.FLUENTBIT_OUTPUT_RETRIED_RECORDS_ALARM,
                "resourceId": "ce7f497c-8d73-40f7-a940-26da2540822e",
                "status": "OK",
            },
        ]
    }

    # Test update alarm sns topic arn for app pipeline
    # Create a new sns topic first
    sns = boto3.client("sns", region_name=os.environ.get("AWS_REGION"))
    response = sns.create_topic(
        Name="new-sns-topic",
    )
    new_topic_arn = response["TopicArn"]

    result = lambda_function.lambda_handler(
        make_graphql_lambda_event(
            "updatePipelineAlarm",
            {
                "pipelineId": "62a37b50-72af-4a7b-9d4b-d859d538a19c",
                "pipelineType": PipelineType.APP,
                "snsTopicArn": new_topic_arn,
            },
        ),
        None,
    )
    assert result == "OK"

    # Test delete the alarm for app pipeline
    result = lambda_function.lambda_handler(
        make_graphql_lambda_event(
            "deletePipelineAlarm",
            {
                "pipelineId": "62a37b50-72af-4a7b-9d4b-d859d538a19c",
                "pipelineType": PipelineType.APP,
            },
        ),
        None,
    )
    assert result == "OK"
