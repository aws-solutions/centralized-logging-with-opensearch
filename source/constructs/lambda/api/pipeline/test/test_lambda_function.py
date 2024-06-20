# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import json
import pytest

import os
import boto3

from commonlib.exception import APIException
from moto import mock_dynamodb, mock_stepfunctions, mock_sts, mock_es, mock_events, mock_scheduler, mock_glue
from .conftest import init_table


@pytest.fixture
def create_event():
    with open("./test/event/test_event.json", "r") as f:
        event = json.load(f)
        event["arguments"] = {
            "type": "WAF",
            "source": "test-acl",
            "target": "dev",
            "destinationType": "KDS",
            "parameters": [
                {"parameterKey": "hello", "parameterValue": "world"},
                {"parameterKey": "domainName", "parameterValue": "solution-os"},
            ],
            "logProcessorConcurrency": "200",
            "osiParams": {
                "maxCapacity": 0,
                "minCapacity": 0,
            },
            "tags": [],
        }
        event["info"]["fieldName"] = "createServicePipeline"

        print(event)
        return event

@pytest.fixture
def light_engine_create_event():
    with open("./test/event/test_event.json", "r") as f:
        event = json.load(f)
        event["arguments"] = {
            "type": "WAF",
            "source": "test-acl",
            "parameters": [
                {"parameterKey": "hello", "parameterValue": "world"},
                {"parameterKey": "domainName", "parameterValue": "solution-os"},
            ],
            "ingestion": {
                "bucket": "test-bucket",
                "prefix": "test-prefix",
            },
            "tags": [],
        }
        event["info"]["fieldName"] = "createLightEngineServicePipeline"

        print(event)
        return event


@pytest.fixture
def list_event():
    with open("./test/event/test_event.json", "r") as f:
        event = json.load(f)
        event["arguments"] = {"page": 1, "count": 10}

        print(event)
        return event


@pytest.fixture
def delete_event():
    with open("./test/event/test_event.json", "r") as f:
        event = json.load(f)
        event["arguments"] = {"id": "30ab5726-68fc-4204-8d00-c34d2f2b906c"}
        event["info"]["fieldName"] = "deleteServicePipeline"
        print(event)
        return event


simple_definition = """
{
  "Comment": "A Hello World example of the Amazon States Language using Pass states",
  "StartAt": "Hello",
  "States": {
    "Hello": {
      "Type": "Pass",
      "Result": "World",
      "End": true
    }
  }
}
"""


@pytest.fixture
def sfn_client():
    with mock_stepfunctions():
        region = os.environ.get("AWS_REGION")
        sfn = boto3.client("stepfunctions", region_name=region)
        name = "SolutionAPIPipelineFlowSM"
        response = sfn.create_state_machine(
            name=name,
            definition=str(simple_definition),
            roleArn="arn:aws:iam::123456789012:role/test",
        )
        state_machine_arn = response["stateMachineArn"]
        os.environ["STATE_MACHINE_ARN"] = state_machine_arn

        yield


@pytest.fixture
def ddb_client():
    with mock_dynamodb():
        region = os.environ.get("AWS_REGION")
        ddb_name = os.environ["PIPELINE_TABLE"]

        ddb = boto3.resource("dynamodb", region_name=region)
        ddb.create_table(
            TableName=ddb_name,
            KeySchema=[{"AttributeName": "id", "KeyType": "HASH"}],
            AttributeDefinitions=[{"AttributeName": "id", "AttributeType": "S"}],
            ProvisionedThroughput={"ReadCapacityUnits": 5, "WriteCapacityUnits": 5},
        )
        # Mock the Sub account link table
        ddb.create_table(
            TableName=os.environ.get("SUB_ACCOUNT_LINK_TABLE_NAME"),
            KeySchema=[
                {"AttributeName": "subAccountId", "KeyType": "HASH"},
                {"AttributeName": "region", "KeyType": "RANGE"},
            ],
            AttributeDefinitions=[
                {"AttributeName": "subAccountId", "AttributeType": "S"},
                {"AttributeName": "region", "AttributeType": "S"},
            ],
            ProvisionedThroughput={"ReadCapacityUnits": 5, "WriteCapacityUnits": 5},
        )

        # mock microbatch meta table
        meta_table = ddb.create_table(
            TableName=os.environ.get("META_TABLE"),
            KeySchema=[{"AttributeName": "metaName", "KeyType": "HASH"}],
            AttributeDefinitions=[{"AttributeName": "metaName", "AttributeType": "S"}],
            ProvisionedThroughput={"ReadCapacityUnits": 5, "WriteCapacityUnits": 5},
        )
        with meta_table.batch_writer() as batch:
            batch.put_item(Item={
                "metaName": "EmailAddress",
                "name": "alejandro_rosalez@example.org"
            })
            batch.put_item(Item={
                "metaName": "CentralizedDatabase",
                "arn": "arn:aws:glue:us-east-1:123456789012:database/centralized",
                "name": "centralized",
                "service": "GLUE"
            })
            batch.put_item(Item={
                "metaName": "AvailableServices",
                "arn": "",
                "name": "AvailableServices",
                "service": "GLUE",
                "value": ["ec2", "scheduler"]
            })
            batch.put_item(Item={
                "metaName": "LogProcessor",
                "arn": "arn:aws:states:us-east-1:123456789012:stateMachine:LogProcessor-CBiU8jrNn8FS",
                "name": "LogProcessor-CBiU8jrNn8FS",
                "service": "StepFunction",
            })
            batch.put_item(Item={
                "metaName": "LogMerger",
                "arn": "arn:aws:states:us-east-1:123456789012:stateMachine:LogMerger-hymPoOLJPnU2",
                "name": "LogMerger-hymPoOLJPnU2",
                "service": "StepFunction",
            })
            batch.put_item(Item={
                "metaName": "LogArchive",
                "arn": "arn:aws:states:us-east-1:123456789012:stateMachine:LogArchive-qbjgRlBep0gT",
                "name": "LogArchive-qbjgRlBep0gT",
                "service": "StepFunction",
            })
        
        # mock grafana table
        grafana_table = ddb.create_table(
            TableName=os.environ.get("GRAFANA_TABLE"),
            KeySchema=[{"AttributeName": "id", "KeyType": "HASH"}],
            AttributeDefinitions=[{"AttributeName": "id", "AttributeType": "S"}],
            ProvisionedThroughput={"ReadCapacityUnits": 5, "WriteCapacityUnits": 5},
        )
        with grafana_table.batch_writer() as batch:
            batch.put_item(Item={
                "id": "28cada44-b170-46ca-a9e4-1e146338f124",
                "name": "Grafana",
                "url": "https://alb.us-east-1.elb.amazonaws.com",
                "token": "glsa_000000"
            })

        # Mock ETLLog Table
        etl_log_table_name = os.environ.get("ETLLOG_TABLE")
        etl_log_table = ddb.create_table(
            TableName=etl_log_table_name,
            KeySchema=[
                {
                    "AttributeName": "executionName", 
                    "KeyType": "HASH"
                    },
                {
                    "AttributeName": "taskId", 
                    "KeyType": "RANGE"
                    },
                ],
            AttributeDefinitions=[
                {"AttributeName": "executionName", "AttributeType": "S"},
                {"AttributeName": "taskId", "AttributeType": "S"},
                {"AttributeName": "pipelineIndexKey", "AttributeType": "S"},
                {"AttributeName": "startTime", "AttributeType": "S"},
            ],
            GlobalSecondaryIndexes=[
                {
                    'IndexName': 'IDX_PIPELINE',
                    'KeySchema': [
                        {
                            'AttributeName': 'pipelineIndexKey',
                            'KeyType': 'HASH'
                        },
                        {
                            'AttributeName': 'startTime',
                            'KeyType': 'RANGE'
                        },
                    ],
                    'Projection': {
                        'ProjectionType': 'INCLUDE',
                        'NonKeyAttributes': [
                            'endTime', 'status'
                        ]
                    },
                },
            ],
            ProvisionedThroughput={"ReadCapacityUnits": 10, "WriteCapacityUnits": 10},
        )
        data_list = [
            {
                "executionName": "88652cb2-812f-4574-af3e-0094fda842d2",
                "taskId": "00000000-0000-0000-0000-000000000000",
                "API": "Step Functions: StartExecution",
                "data": "",
                "endTime": "2023-10-16T03:48:36.340Z",
                "functionName": "",
                "parentTaskId": "",
                "pipelineId": "3d37e69e-7129-461e-b4b8-4a8e72eb5b80",
                "pipelineIndexKey": "3d37e69e-7129-461e-b4b8-4a8e72eb5b80:LogProcessor:00000000-0000-0000-0000-000000000000",
                "startTime": "2023-10-16T03:48:34.852Z",
                "stateMachineName": "LogProcessor-u5TUghpQChw4",
                "stateName": "Put task info of Step Function to DynamoDB",
                "status": "Succeeded"
            },
            {
                "executionName": "88652cb2-812f-4574-af3e-0094fda842d2",
                "taskId": "301ae590-6365-44cc-acc4-6ae479094672",
                "API": "Lambda: Invoke",
                "data": "{\"totalSubTask\": 0}",
                "endTime": "2023-10-16T03:48:36.263Z",
                "functionName": "S3ObjectScanning-WKIDdnbP5O3l",
                "parentTaskId": "00000000-0000-0000-0000-000000000000",
                "pipelineId": "3d37e69e-7129-461e-b4b8-4a8e72eb5b80",
                "pipelineIndexKey": "3d37e69e-7129-461e-b4b8-4a8e72eb5b80:LogProcessor:301ae590-6365-44cc-acc4-6ae479094672",
                "startTime": "2023-10-16T03:48:35.263Z",
                "stateMachineName": "LogProcessor-u5TUghpQChw4",
                "stateName": "Step 1: Migration S3 Objects from Staging to Archive",
                "status": "Succeeded"
            },
            {
                "executionName": "775b1764-c0cf-481e-9561-873841507ebc",
                "taskId": "00000000-0000-0000-0000-000000000000",
                "API": "Step Functions: StartExecution",
                "data": "",
                "endTime": "2023-10-16T03:53:36.230Z",
                "functionName": "",
                "parentTaskId": "",
                "pipelineId": "3d37e69e-7129-461e-b4b8-4a8e72eb5b80",
                "pipelineIndexKey": "3d37e69e-7129-461e-b4b8-4a8e72eb5b80:LogProcessor:00000000-0000-0000-0000-000000000000",
                "startTime": "2023-10-16T03:53:34.152Z",
                "stateMachineName": "LogProcessor-u5TUghpQChw4",
                "stateName": "Put task info of Step Function to DynamoDB",
                "status": "Succeeded"
            },
            {
                "executionName": "0f0a0643-748d-4bbf-a673-4aca6dc6838a",
                "taskId": "00000000-0000-0000-0000-000000000000",
                "API": "Step Functions: StartExecution",
                "data": "",
                "endTime": "2023-10-16T03:58:36.150Z",
                "functionName": "",
                "parentTaskId": "",
                "pipelineId": "3d37e69e-7129-461e-b4b8-4a8e72eb5b80",
                "pipelineIndexKey": "3d37e69e-7129-461e-b4b8-4a8e72eb5b80:LogProcessor:00000000-0000-0000-0000-000000000000",
                "startTime": "2023-10-16T03:58:34.272Z",
                "stateMachineName": "LogProcessor-u5TUghpQChw4",
                "stateName": "Put task info of Step Function to DynamoDB",
                "status": "Timed_out"
            },
            {
                "executionName": "70fa7767-82e9-469c-97ee-4fb071339ad9",
                "taskId": "00000000-0000-0000-0000-000000000000",
                "API": "Step Functions: StartExecution",
                "data": "",
                "endTime": "2023-10-16T04:03:37.150Z",
                "functionName": "",
                "parentTaskId": "",
                "pipelineId": "3d37e69e-7129-461e-b4b8-4a8e72eb5b80",
                "pipelineIndexKey": "3d37e69e-7129-461e-b4b8-4a8e72eb5b80:LogProcessor:00000000-0000-0000-0000-000000000000",
                "startTime": "2023-10-16T04:03:38.272Z",
                "stateMachineName": "LogProcessor-u5TUghpQChw4",
                "stateName": "Put task info of Step Function to DynamoDB",
                "status": "Aborted"
            },
            {
                "executionName": "47eae851-54c1-447d-a394-330469b95966",
                "taskId": "00000000-0000-0000-0000-000000000000",
                "API": "Step Functions: StartExecution",
                "data": "",
                "endTime": "2023-10-16T04:08:37.150Z",
                "functionName": "",
                "parentTaskId": "",
                "pipelineId": "3d37e69e-7129-461e-b4b8-4a8e72eb5b80",
                "pipelineIndexKey": "3d37e69e-7129-461e-b4b8-4a8e72eb5b80:LogProcessor:00000000-0000-0000-0000-000000000000",
                "startTime": "2023-10-16T04:08:38.272Z",
                "stateMachineName": "LogProcessor-u5TUghpQChw4",
                "stateName": "Put task info of Step Function to DynamoDB",
                "status": "Failed"
            },
            {
                "executionName": "3c38d333-a3a5-46f3-8791-36f203b5b98e",
                "taskId": "00000000-0000-0000-0000-000000000000",
                "API": "Step Functions: StartExecution",
                "data": "",
                "endTime": "2023-10-16T04:13:37.150Z",
                "functionName": "",
                "parentTaskId": "",
                "pipelineId": "3d37e69e-7129-461e-b4b8-4a8e72eb5b80",
                "pipelineIndexKey": "3d37e69e-7129-461e-b4b8-4a8e72eb5b80:LogProcessor:00000000-0000-0000-0000-000000000000",
                "startTime": "2023-10-16T04:13:38.272Z",
                "stateMachineName": "LogProcessor-u5TUghpQChw4",
                "stateName": "Put task info of Step Function to DynamoDB",
                "status": "Running"
            },
            {
                "executionName": "3ad531f6-e158-4f2b-afa4-ee6292e0434d",
                "taskId": "00000000-0000-0000-0000-000000000000",
                "API": "Step Functions: StartExecution",
                "data": "",
                "endTime": "2023-10-16T04:18:37.150Z",
                "functionName": "",
                "parentTaskId": "",
                "pipelineId": "3d37e69e-7129-461e-b4b8-4a8e72eb5b80",
                "pipelineIndexKey": "3d37e69e-7129-461e-b4b8-4a8e72eb5b80:LogProcessor:00000000-0000-0000-0000-000000000000",
                "startTime": "2023-10-16T04:18:38.272Z",
                "stateMachineName": "LogProcessor-u5TUghpQChw4",
                "stateName": "Put task info of Step Function to DynamoDB",
                "status": "Running"
            },
            {
                "executionName": "721858f5-5c3a-4c53-aebd-5087c445af49",
                "taskId": "00000000-0000-0000-0000-000000000000",
                "API": "Step Functions: StartExecution",
                "data": "",
                "endTime": "2023-10-16T03:48:36.340Z",
                "functionName": "",
                "parentTaskId": "",
                "pipelineId": "019cc550-ed39-48e4-997b-d476030754ec",
                "pipelineIndexKey": "019cc550-ed39-48e4-997b-d476030754ec:LogProcessor:00000000-0000-0000-0000-000000000000",
                "startTime": "2023-10-16T03:48:34.852Z",
                "stateMachineName": "LogProcessor-u5TUghpQChw4",
                "stateName": "Put task info of Step Function to DynamoDB",
                "status": "Succeeded"
            },
            {
                "executionName": "721858f5-5c3a-4c53-aebd-5087c445af49",
                "taskId": "29b62380-b5c9-4ffa-8625-2b381f58735b",
                "API": "Lambda: Invoke",
                "data": "{\"totalSubTask\": 0}",
                "endTime": "2023-10-16T03:48:36.263Z",
                "functionName": "S3ObjectScanning-WKIDdnbP5O3l",
                "parentTaskId": "00000000-0000-0000-0000-000000000000",
                "pipelineId": "019cc550-ed39-48e4-997b-d476030754ec",
                "pipelineIndexKey": "019cc550-ed39-48e4-997b-d476030754ec:LogProcessor:29b62380-b5c9-4ffa-8625-2b381f58735b",
                "startTime": "2023-10-16T03:48:35.263Z",
                "stateMachineName": "LogProcessor-u5TUghpQChw4",
                "stateName": "Step 1: Migration S3 Objects from Staging to Archive",
                "status": "Succeeded"
            },
        ]
        init_table(etl_log_table, data_list)
        yield

@pytest.fixture
def glue_client():
    with mock_glue():
        glue = boto3.client("glue")
        glue.create_database(DatabaseInput={'Name':'centralized'})
        glue.create_table(
            DatabaseName='centralized',
            TableInput={
                'Name': 'waf',
                'StorageDescriptor': {
                    'Columns': [
                        {
                            'Name': 'id', 
                            'Type': 'integer'
                            },
                        {
                            'Name': 'name', 
                            'Type': 'string'
                            },
                        ],
                    'Location': 's3://centralized-bucket/datalake/centralized/waf',
                    'InputFormat': 'org.apache.hadoop.hive.ql.io.parquet.MapredParquetInputFormat',
                    'OutputFormat': 'org.apache.hadoop.hive.ql.io.parquet.MapredParquetOutputFormat',
                    'SerdeInfo': {
                        'SerializationLibrary': 'org.apache.hadoop.hive.ql.io.parquet.serde.ParquetHiveSerDe',
                    },
                    'Compressed': True,
                },
                'TableType': 'EXTERNAL_TABLE',
                'Parameters': {
                    'classification': 'parquet',
                    'has_encrypted_data': 'true',
                },
            }
        )
        
        glue.create_table(
            DatabaseName='centralized',
            TableInput={
                'Name': 'waf_metrics',
                'StorageDescriptor': {
                    'Columns': [
                        {
                            'Name': 'name', 
                            'Type': 'string'
                            },
                        {
                            'Name': 'count', 
                            'Type': 'integer'
                            },
                        ],
                    'Location': 's3://centralized-bucket/datalake/centralized/waf_metrics',
                    'InputFormat': 'org.apache.hadoop.hive.ql.io.parquet.MapredParquetInputFormat',
                    'OutputFormat': 'org.apache.hadoop.hive.ql.io.parquet.MapredParquetOutputFormat',
                    'SerdeInfo': {
                        'SerializationLibrary': 'org.apache.hadoop.hive.ql.io.parquet.serde.ParquetHiveSerDe',
                    },
                    'Compressed': True,
                },
                'TableType': 'EXTERNAL_TABLE',
                'Parameters': {
                    'classification': 'parquet',
                    'has_encrypted_data': 'true',
                },
            }
        )
        yield


@pytest.fixture
def events_client():
    with mock_events():
        pipeline_id = os.environ['LIGHT_ENGINE_SVC_PIPELINE_ID']
        events = boto3.client("events")
        
        events.put_rule(Name=f'LogProcessor-{pipeline_id}', ScheduleExpression='rate(5 minutes)', State='ENABLED', EventBusName='default')
        events.put_targets(Rule=f'LogProcessor-{pipeline_id}', EventBusName='default',
                           Targets=[
                                {
                                    'Id': '1234567890',
                                    'Arn': f'arn:aws:states:us-east-1:123456789012:stateMachine:LogProcessor-CBiU8jrNn8FS',
                                    'Input': json.dumps({'metadata': {}}, indent=4),
                                    'RoleArn': f'arn:aws:iam::123456789012:role/LogProcessor-CBiU8jrNn8FS',
                                    }
                                ]
                            )
        
        events.put_rule(Name=f'LogMerger-{pipeline_id}', ScheduleExpression='cron(0 1 * * ? *)', State='ENABLED', EventBusName='default')
        events.put_targets(Rule=f'LogMerger-{pipeline_id}', EventBusName='default',
                           Targets=[
                                {
                                    'Id': '1234567890',
                                    'Arn': f'arn:aws:states:us-east-1:123456789012:stateMachine:LogMerger-hymPoOLJPnU2',
                                    'Input': json.dumps({'metadata': {}}, indent=4),
                                    'RoleArn': f'arn:aws:iam::123456789012:role/LogMerger-hymPoOLJPnU2',
                                    }
                                ]
                            )
        events.put_rule(Name=f'LogArchive-{pipeline_id}', ScheduleExpression='cron(0 2 * * ? *)', State='ENABLED', EventBusName='default')
        events.put_targets(Rule=f'LogMerger-{pipeline_id}', EventBusName='default',
                           Targets=[
                                {
                                    'Id': '1234567890',
                                    'Arn': f'arn:aws:states:us-east-1:123456789012:stateMachine:LogArchive-qbjgRlBep0gT',
                                    'Input': json.dumps({'metadata': {}}, indent=4),
                                    'RoleArn': f'arn:aws:iam::123456789012:role/LogArchive-qbjgRlBep0gT',
                                    }
                                ]
                            )
        events.put_rule(Name=f'LogMergerForMetrics-{pipeline_id}', ScheduleExpression='cron(0 1 * * ? *)', State='ENABLED', EventBusName='default')
        events.put_targets(Rule=f'LogMergerForMetrics-{pipeline_id}', EventBusName='default',
                           Targets=[
                                {
                                    'Id': '1234567890',
                                    'Arn': f'arn:aws:states:us-east-1:123456789012:stateMachine:LogMerger-hymPoOLJPnU2',
                                    'Input': json.dumps({'metadata': {}}, indent=4),
                                    'RoleArn': f'arn:aws:iam::123456789012:role/LogMerger-hymPoOLJPnU2',
                                    }
                                ]
                            )

        yield
        
        
@pytest.fixture
def scheduler_client():
    with mock_scheduler():
        scheduler = boto3.client("scheduler")
        pipeline_id = os.environ["LIGHT_ENGINE_SVC_PIPELINE_ID"]
        
        scheduler.create_schedule_group(Name=pipeline_id, Tags=[{'Key': 'Application', 'Value': 'clo'}])
        
        scheduler.create_schedule(FlexibleTimeWindow={'Mode': 'OFF'}, GroupName=pipeline_id,
                                Name='LogProcessor', ScheduleExpression='rate(5 minutes)',
                                State='ENABLED', Target={
                                    'Arn': f'arn:aws:states:us-east-1:123456789012:stateMachine:LogProcessor-CBiU8jrNn8FS',
                                    'Input': json.dumps({}, indent=4),
                                    'RoleArn': f'arn:aws:iam::123456789012:role/LogProcessor-CBiU8jrNn8FS'})
        scheduler.create_schedule(FlexibleTimeWindow={'Mode': 'OFF'}, GroupName=pipeline_id,
                                Name='LogMerger', ScheduleExpression='cron(0 1 * * ? *)',
                                State='ENABLED', Target={
                                    'Arn': f'arn:aws:states:us-east-1:123456789012:stateMachine:LogMerger-hymPoOLJPnU2',
                                    'Input': json.dumps({}, indent=4),
                                    'RoleArn': f'arn:aws:iam::123456789012:role/LogMerger-hymPoOLJPnU2'})
        scheduler.create_schedule(FlexibleTimeWindow={'Mode': 'OFF'}, GroupName=pipeline_id,
                                Name='LogArchive', ScheduleExpression='cron(0 2 * * ? *)',
                                State='ENABLED', Target={
                                    'Arn': f'arn:aws:states:us-east-1:123456789012:stateMachine:LogArchive-qbjgRlBep0gT',
                                    'Input': json.dumps({}, indent=4),
                                    'RoleArn': f'arn:aws:iam::123456789012:role/LogArchive-qbjgRlBep0gT'})
        scheduler.create_schedule(FlexibleTimeWindow={'Mode': 'OFF'}, GroupName=pipeline_id,
                                Name='LogMergerForMetrics', ScheduleExpression='cron(0 1 * * ? *)',
                                State='ENABLED', Target={
                                    'Arn': f'arn:aws:states:us-east-1:123456789012:stateMachine:LogMerger-hymPoOLJPnU2',
                                    'Input': json.dumps({}, indent=4),
                                    'RoleArn': f'arn:aws:iam::123456789012:role/LogMerger-hymPoOLJPnU2'})
        
        yield
        

@pytest.fixture
def sts_client():
    with mock_sts():
        boto3.client("sts", region_name=os.environ.get("AWS_REGION"))
        yield


@pytest.fixture
def aos_client():
    with mock_es():
        es = boto3.client("es", region_name=os.environ.get("AWS_REGION"))
        es.create_elasticsearch_domain(DomainName="solution-os")
        yield

light_engine_creation_event = {
    "type": "WAF",
    "source": "test-acl",
    "parameters": [
        {"parameterKey": "importDashboards", "parameterValue": "true"},
        {"parameterKey": "grafanaId", "parameterValue": "28cada44-b170-46ca-a9e4-1e146338f124"},
        {"parameterKey": "centralizedBucketName", "parameterValue": "centralized-bucket"},
        {"parameterKey": "centralizedBucketPrefix", "parameterValue": "datalake"},
        {"parameterKey": "logArchiveSchedule", "parameterValue": "cron(0 2 * * ? *)"},
        {"parameterKey": "logMergerSchedule", "parameterValue": "cron(0 1 * * ? *)"},
        {"parameterKey": "logProcessorSchedule", "parameterValue": "rate(5 minutes)"},
        {"parameterKey": "logArchiveAge", "parameterValue": "7"},
        {"parameterKey": "logMergerAge", "parameterValue": "1"},
        {"parameterKey": "centralizedTableName", "parameterValue": "waf"},
    ],
    "ingestion": {
        "bucket": "test-bucket",
        "prefix": "test-prefix",
    },
    "tags": [],
}


def test_lambda_function(
    sfn_client,
    ddb_client,
    sts_client,
    aos_client,
    create_event,
    list_event,
    delete_event,
    light_engine_create_event,
):
    import lambda_function

    # start with empty list
    result = lambda_function.lambda_handler(list_event, None)
    assert result["total"] == 0

    # create a pipeline
    id = lambda_function.lambda_handler(create_event, None)
    # Expect Execute successfully.
    assert id is not None

    # list again
    result = lambda_function.lambda_handler(list_event, None)
    assert result["total"] == 1
    pipelines = result["pipelines"]
    assert len(pipelines) == 1
    assert "source" in pipelines[0]
    assert "target" in pipelines[0]

    # delete an non-existing one
    with pytest.raises(APIException):
        lambda_function.lambda_handler(delete_event, None)

    # delete a real one
    delete_event["arguments"]["id"] = id
    result = lambda_function.lambda_handler(delete_event, None)
    assert result == "OK"

    # list again.
    result = lambda_function.lambda_handler(list_event, None)
    assert result["total"] == 0

    # create a light engine pipeline
    id = lambda_function.lambda_handler(light_engine_create_event, None)
    # Expect Execute successfully.
    assert id is not None

    # get created pipeline
    result = lambda_function.lambda_handler(list_event, None)
    pipeline = result["pipelines"][0]
    print('#pipeline: ', pipeline)
    # assert stagingBucketPrefix generated
    # assert pipeline["prefix"] == f"AWSLogs/WAFLogs/{pipeline['stackName']}"
    # assert pipeline['ingestion']["prefix"] == "test-prefix"


def test_get_value_through_parameter_key(sts_client):
    from lambda_function import get_value_through_parameter_key
    
    assert get_value_through_parameter_key(key='loggingBucket', parameters=[{'parameterKey':'loggingBucket', 'parameterValue':'logging-bucket'}]) == 'logging-bucket'
    assert get_value_through_parameter_key(key='loggingBucket', parameters=[]) == ''


def test_get_glue_table_info(glue_client, ddb_client):
    from lambda_function import SvcPipeline, EngineType, BufferTypeEnum, get_glue_table_info, glue
    from commonlib.model import LightEngineParams, MonitorDetail, PipelineMonitorStatus
    
    pipeline_id = os.environ['LIGHT_ENGINE_SVC_PIPELINE_ID']
    parameters = [
        {"parameterKey": "importDashboards", "parameterValue": "true"},
        {"parameterKey": "grafanaId", "parameterValue": "28cada44-b170-46ca-a9e4-1e146338f124"},
        {"parameterKey": "centralizedBucketName", "parameterValue": "centralized-bucket"},
        {"parameterKey": "centralizedBucketPrefix", "parameterValue": "datalake"},
        {"parameterKey": "logArchiveSchedule", "parameterValue": "cron(0 2 * * ? *)"},
        {"parameterKey": "logMergerSchedule", "parameterValue": "cron(0 1 * * ? *)"},
        {"parameterKey": "logProcessorSchedule", "parameterValue": "rate(5 minutes)"},
        {"parameterKey": "logArchiveAge", "parameterValue": "7"},
        {"parameterKey": "logMergerAge", "parameterValue": "1"},
        {"parameterKey": "centralizedTableName", "parameterValue": "waf"},
    ]
    
    light_engine_params = LightEngineParams(
        stagingBucketPrefix="/AWSLogs/WAFLogs/web_acl_01",
        centralizedBucketName="centralized-bucket",
        centralizedBucketPrefix="datalake",
        centralizedTableName="waf",
        centralizedMetricsTableName="waf_metrics",
        logProcessorSchedule="rate(5 minutes)",
        logMergerSchedule="cron(0 1 * * ? *)",
        logArchiveSchedule="cron(0 2 * * ? *)",
        logMergerAge="1",
        logArchiveAge="7",
        importDashboards="true",
        grafanaId="28cada44-b170-46ca-a9e4-1e146338f124",
        recipients="alejandro_rosalez@example.org",
    )
    
    light_engine_service_pipeline = SvcPipeline(
        id=pipeline_id,
        destinationType=BufferTypeEnum.S3,
        parameters=parameters,
        tags=[],
        monitor=MonitorDetail(status=PipelineMonitorStatus.DISABLED),
        engineType=EngineType.LIGHT_ENGINE,
        lightEngineParams=light_engine_params,
    )
    
    response = get_glue_table_info(service_pipeline=light_engine_service_pipeline)
    assert response == {
        'table': {
            'databaseName': 'centralized', 
            'tableName': 'waf', 
            'location': 's3://centralized-bucket/datalake/centralized/waf', 
            'classification': 'parquet', 
            'dashboardName': 'waf-details', 
            'dashboardLink': f'https://alb.us-east-1.elb.amazonaws.com/d/{pipeline_id}-00'
            }, 
        'metric': {
            'databaseName': 'centralized', 
            'tableName': 'waf_metrics', 
            'location': 's3://centralized-bucket/datalake/centralized/waf_metrics', 
            'classification': 'parquet',
            'dashboardLink': f'https://alb.us-east-1.elb.amazonaws.com/d/{pipeline_id}-01',
            'dashboardName': 'waf-dashboard',
            }
        }
    
    light_engine_service_pipeline.lightEngineParams.importDashboards = "false"
    response = get_glue_table_info(service_pipeline=light_engine_service_pipeline)
    assert response == {
        'table': {
            'databaseName': 'centralized', 
            'tableName': 'waf', 
            'location': 's3://centralized-bucket/datalake/centralized/waf', 
            'classification': 'parquet'
            }, 
        'metric': {
            'databaseName': 'centralized', 
            'tableName': 'waf_metrics', 
            'location': 's3://centralized-bucket/datalake/centralized/waf_metrics', 
            'classification': 'parquet'
            }
        }
    light_engine_service_pipeline.lightEngineParams.importDashboards = "true"
    
    light_engine_service_pipeline.lightEngineParams.centralizedMetricsTableName = "do-not-exists-table"
    response = get_glue_table_info(service_pipeline=light_engine_service_pipeline)
    assert response == {
        'table': {
            'databaseName': 'centralized', 
            'tableName': 'waf', 
            'location': 's3://centralized-bucket/datalake/centralized/waf', 
            'classification': 'parquet',
            'dashboardName': 'waf-details', 
            'dashboardLink': f'https://alb.us-east-1.elb.amazonaws.com/d/{pipeline_id}-00'
            },
        'metric': {
            'databaseName': 'centralized', 
            'tableName': 'waf_metrics', 
            'location': 's3://centralized-bucket/datalake/centralized/waf_metrics', 
            'classification': 'parquet',
            'dashboardLink': f'https://alb.us-east-1.elb.amazonaws.com/d/{pipeline_id}-01',
            'dashboardName': 'waf-dashboard',
            }
        }
    light_engine_service_pipeline.lightEngineParams.centralizedMetricsTableName = "waf_metrics"


def test_get_scheduler_expression(events_client, scheduler_client):
    from lambda_function import get_scheduler_expression, conn
    
    light_engine_svc_pipeline_id = os.environ["LIGHT_ENGINE_SVC_PIPELINE_ID"]
    
    events = conn.get_client('events')
    response = get_scheduler_expression(name='do-not-exists', group='default', client=events)
    assert response == ''
    
    response = get_scheduler_expression(name=f'LogProcessor-{light_engine_svc_pipeline_id}', group='default', client=events)
    assert response == 'rate(5 minutes)'
    
    response = get_scheduler_expression(name=f'LogMerger-{light_engine_svc_pipeline_id}', group='default', client=events)
    assert response == 'cron(0 1 * * ? *)'
    
    response = get_scheduler_expression(name=f'LogMergerForMetrics-{light_engine_svc_pipeline_id}', group='default', client=events)
    assert response == 'cron(0 1 * * ? *)'
    
    response = get_scheduler_expression(name=f'LogArchive-{light_engine_svc_pipeline_id}', group='default', client=events)
    assert response == 'cron(0 2 * * ? *)'
    
    scheduler = conn.get_client('scheduler')
    response = get_scheduler_expression(name='do-not-exists', group=light_engine_svc_pipeline_id, client=scheduler)
    assert response == ''
    
    response = get_scheduler_expression(name='LogProcessor', group=light_engine_svc_pipeline_id, client=scheduler)
    assert response == 'rate(5 minutes)'
    
    response = get_scheduler_expression(name='LogMerger', group=light_engine_svc_pipeline_id, client=scheduler)
    assert response == 'cron(0 1 * * ? *)'
    
    response = get_scheduler_expression(name='LogMergerForMetrics', group=light_engine_svc_pipeline_id, client=scheduler)
    assert response == 'cron(0 1 * * ? *)'
    
    response = get_scheduler_expression(name='LogArchive', group=light_engine_svc_pipeline_id, client=scheduler)
    assert response == 'cron(0 2 * * ? *)'


def test_get_schedules_info(ddb_client, events_client, scheduler_client):
    from lambda_function import SvcPipeline, EngineType, BufferTypeEnum, get_schedules_info, meta_ddb_util
    from commonlib.model import LightEngineParams, MonitorDetail, PipelineMonitorStatus
    
    pipeline_id = os.environ['LIGHT_ENGINE_SVC_PIPELINE_ID']
    
    parameters = [
        {"parameterKey": "importDashboards", "parameterValue": "true"},
        {"parameterKey": "grafanaId", "parameterValue": "28cada44-b170-46ca-a9e4-1e146338f124"},
        {"parameterKey": "centralizedBucketName", "parameterValue": "centralized-bucket"},
        {"parameterKey": "centralizedBucketPrefix", "parameterValue": "datalake"},
        {"parameterKey": "logArchiveSchedule", "parameterValue": "cron(0 2 * * ? *)"},
        {"parameterKey": "logMergerSchedule", "parameterValue": "cron(0 1 * * ? *)"},
        {"parameterKey": "logProcessorSchedule", "parameterValue": "rate(5 minutes)"},
        {"parameterKey": "logArchiveAge", "parameterValue": "7"},
        {"parameterKey": "logMergerAge", "parameterValue": "1"},
        {"parameterKey": "centralizedTableName", "parameterValue": "waf"},
    ]
    
    light_engine_params = LightEngineParams(
        stagingBucketPrefix="/AWSLogs/WAFLogs/web_acl_01",
        centralizedBucketName="centralized-bucket",
        centralizedBucketPrefix="datalake",
        centralizedTableName="waf",
        centralizedMetricsTableName="waf_metrics",
        logProcessorSchedule="rate(5 minutes)",
        logMergerSchedule="cron(0 1 * * ? *)",
        logArchiveSchedule="cron(0 2 * * ? *)",
        logMergerAge="1",
        logArchiveAge="7",
        importDashboards="true",
        grafanaId="28cada44-b170-46ca-a9e4-1e146338f124",
        recipients="alejandro_rosalez@example.org",
    )
    
    light_engine_service_pipeline = SvcPipeline(
        id=pipeline_id,
        destinationType=BufferTypeEnum.S3,
        parameters=parameters,
        tags=[],
        monitor=MonitorDetail(status=PipelineMonitorStatus.DISABLED),
        engineType=EngineType.LIGHT_ENGINE,
        lightEngineParams=light_engine_params,
    )
    
    response = get_schedules_info(service_pipeline=light_engine_service_pipeline)
    assert response == [
        {
            'type': 'LogProcessor', 
            'stateMachine': {
                'arn': 'arn:aws:states:us-east-1:123456789012:stateMachine:LogProcessor-CBiU8jrNn8FS', 
                'name': 'LogProcessor-CBiU8jrNn8FS'
                }, 
            'scheduler': {
                'type': 'EventBridgeScheduler', 
                'group': pipeline_id, 
                'name': 'LogProcessor', 
                'expression': 'rate(5 minutes)'
                }
            }, 
        {
            'type': 'LogMerger', 
            'stateMachine': {
                'arn': 'arn:aws:states:us-east-1:123456789012:stateMachine:LogMerger-hymPoOLJPnU2', 
                'name': 'LogMerger-hymPoOLJPnU2'
                }, 
            'scheduler': {
                'type': 'EventBridgeScheduler', 
                'group': pipeline_id, 
                'name': 'LogMerger', 
                'expression': 'cron(0 1 * * ? *)', 
                'age': '1'
                }
            }, 
        {
            'type': 'LogMergerForMetrics', 
            'stateMachine': {
                'arn': 'arn:aws:states:us-east-1:123456789012:stateMachine:LogMerger-hymPoOLJPnU2', 
                'name': 'LogMerger-hymPoOLJPnU2'
                }, 
            'scheduler': {
                'type': 'EventBridgeScheduler', 
                'group': pipeline_id, 
                'name': 'LogMergerForMetrics', 
                'expression': 'cron(0 1 * * ? *)',
                'age': '1'
                }
            },
        {
            'type': 'LogArchive', 
            'stateMachine': {
                'arn': 'arn:aws:states:us-east-1:123456789012:stateMachine:LogArchive-qbjgRlBep0gT', 
                'name': 'LogArchive-qbjgRlBep0gT'
                }, 
            'scheduler': {
                'type': 'EventBridgeScheduler', 
                'group': pipeline_id, 
                'name': 'LogArchive', 
                'expression': 'cron(0 2 * * ? *)', 
                'age': '7'
                }
            }, 
        ]

    meta_ddb_util.update_item(key={'metaName': 'AvailableServices'}, attributes_map={'value':['ec2', 'events']})
    response = get_schedules_info(service_pipeline=light_engine_service_pipeline)
    assert response == [
        {
            'type': 'LogProcessor', 
            'stateMachine': {
                'arn': 'arn:aws:states:us-east-1:123456789012:stateMachine:LogProcessor-CBiU8jrNn8FS', 
                'name': 'LogProcessor-CBiU8jrNn8FS'
                }, 
            'scheduler': {
                'type': 'EventBridgeEvents', 
                'group': 'default', 
                'name': f'LogProcessor-{pipeline_id}', 
                'expression': 'rate(5 minutes)'
                }
            }, 
        {
            'type': 'LogMerger', 
            'stateMachine': {
                'arn': 'arn:aws:states:us-east-1:123456789012:stateMachine:LogMerger-hymPoOLJPnU2', 
                'name': 'LogMerger-hymPoOLJPnU2'
                }, 
            'scheduler': {
                'type': 'EventBridgeEvents', 
                'group': 'default', 
                'name': f'LogMerger-{pipeline_id}', 
                'expression': 'cron(0 1 * * ? *)', 
                'age': '1'
                }
            }, 
        {
            'type': 'LogMergerForMetrics', 
            'stateMachine': {
                'arn': 'arn:aws:states:us-east-1:123456789012:stateMachine:LogMerger-hymPoOLJPnU2', 
                'name': 'LogMerger-hymPoOLJPnU2'
                }, 
            'scheduler': {
                'type': 'EventBridgeEvents', 
                'group': 'default', 
                'name': f'LogMergerForMetrics-{pipeline_id}', 
                'expression': 'cron(0 1 * * ? *)', 
                'age': '1'
                }
            },
        {
            'type': 'LogArchive', 
            'stateMachine': {
                'arn': 'arn:aws:states:us-east-1:123456789012:stateMachine:LogArchive-qbjgRlBep0gT', 
                'name': 'LogArchive-qbjgRlBep0gT'
                }, 
            'scheduler': {
                'type': 'EventBridgeEvents', 
                'group': 'default', 
                'name': f'LogArchive-{pipeline_id}', 
                'expression': 'cron(0 2 * * ? *)', 
                'age': '7'
                }
            },
        ]


def test_get_light_engine_service_pipeline_detail(ddb_client, glue_client, events_client, scheduler_client):
    from lambda_function import SvcPipeline, EngineType, BufferTypeEnum, SvcPipelineDao, get_light_engine_service_pipeline_detail, meta_ddb_util
    from commonlib.model import LightEngineParams, MonitorDetail, PipelineMonitorStatus
    
    pipeline_id = os.environ['LIGHT_ENGINE_SVC_PIPELINE_ID']
    service_pipeline_table_name = os.environ["PIPELINE_TABLE"]
    
    parameters = [
        {"parameterKey": "importDashboards", "parameterValue": "true"},
        {"parameterKey": "grafanaId", "parameterValue": "28cada44-b170-46ca-a9e4-1e146338f124"},
        {"parameterKey": "centralizedBucketName", "parameterValue": "centralized-bucket"},
        {"parameterKey": "centralizedBucketPrefix", "parameterValue": "datalake"},
        {"parameterKey": "logArchiveSchedule", "parameterValue": "cron(0 2 * * ? *)"},
        {"parameterKey": "logMergerSchedule", "parameterValue": "cron(0 1 * * ? *)"},
        {"parameterKey": "logProcessorSchedule", "parameterValue": "rate(5 minutes)"},
        {"parameterKey": "logArchiveAge", "parameterValue": "7"},
        {"parameterKey": "logMergerAge", "parameterValue": "1"},
        {"parameterKey": "centralizedTableName", "parameterValue": "waf"},
    ]
    
    light_engine_params = LightEngineParams(
        stagingBucketPrefix="/AWSLogs/WAFLogs/web_acl_01",
        centralizedBucketName="centralized-bucket",
        centralizedBucketPrefix="datalake",
        centralizedTableName="waf",
        centralizedMetricsTableName="waf_metrics",
        logProcessorSchedule="rate(5 minutes)",
        logMergerSchedule="cron(0 1 * * ? *)",
        logArchiveSchedule="cron(0 2 * * ? *)",
        logMergerAge="1",
        logArchiveAge="7",
        importDashboards="true",
        grafanaId="28cada44-b170-46ca-a9e4-1e146338f124",
        recipients="alejandro_rosalez@example.org",
    )
    
    light_engine_service_pipeline = SvcPipeline(
        id=pipeline_id,
        destinationType=BufferTypeEnum.S3,
        parameters=parameters,
        tags=[],
        monitor=MonitorDetail(status=PipelineMonitorStatus.DISABLED),
        engineType=EngineType.LIGHT_ENGINE,
        lightEngineParams=light_engine_params,
    )
    
    service_pipeline_dao = SvcPipelineDao(service_pipeline_table_name)
    service_pipeline_dao.save(service_pipeline=light_engine_service_pipeline)
    
    with pytest.raises(KeyError):
        get_light_engine_service_pipeline_detail()
    
    response = get_light_engine_service_pipeline_detail(pipelineId=pipeline_id)
    assert response == {
        'analyticsEngine': {
            'engineType': 'LightEngine',
            'table': {
                'databaseName': 'centralized', 
                'tableName': 'waf', 
                'location': 's3://centralized-bucket/datalake/centralized/waf', 
                'classification': 'parquet', 
                'dashboardName': 'waf-details', 
                'dashboardLink': f'https://alb.us-east-1.elb.amazonaws.com/d/{pipeline_id}-00'
                }, 
            'metric': {
                'databaseName': 'centralized', 
                'tableName': 'waf_metrics', 
                'location': 's3://centralized-bucket/datalake/centralized/waf_metrics', 
                'classification': 'parquet',
                'dashboardName': 'waf-dashboard', 
                'dashboardLink': f'https://alb.us-east-1.elb.amazonaws.com/d/{pipeline_id}-01'
                },
            }, 
        'schedules': [
            {
                'type': 'LogProcessor', 
                'stateMachine': {
                    'arn': 'arn:aws:states:us-east-1:123456789012:stateMachine:LogProcessor-CBiU8jrNn8FS', 
                    'name': 'LogProcessor-CBiU8jrNn8FS'
                    }, 
                'scheduler': {
                    'type': 'EventBridgeScheduler', 
                    'group': pipeline_id, 
                    'name': 'LogProcessor', 
                    'expression': 'rate(5 minutes)'
                    }
                }, 
            {
                'type': 'LogMerger', 
                'stateMachine': {
                    'arn': 'arn:aws:states:us-east-1:123456789012:stateMachine:LogMerger-hymPoOLJPnU2', 
                    'name': 'LogMerger-hymPoOLJPnU2'
                    }, 
                'scheduler': {
                    'type': 'EventBridgeScheduler', 
                    'group': pipeline_id, 
                    'name': 'LogMerger', 
                    'expression': 'cron(0 1 * * ? *)', 
                    'age': '1'
                    }
                }, 
            {
                'type': 'LogMergerForMetrics', 
                'stateMachine': {
                    'arn': 'arn:aws:states:us-east-1:123456789012:stateMachine:LogMerger-hymPoOLJPnU2', 
                    'name': 'LogMerger-hymPoOLJPnU2'
                    }, 
                'scheduler': {
                    'type': 'EventBridgeScheduler', 
                    'group': pipeline_id, 
                    'name': 'LogMergerForMetrics', 
                    'expression': 'cron(0 1 * * ? *)',
                    'age': '1'
                    }
                },
            {
                'type': 'LogArchive', 
                'stateMachine': {
                    'arn': 'arn:aws:states:us-east-1:123456789012:stateMachine:LogArchive-qbjgRlBep0gT', 
                    'name': 'LogArchive-qbjgRlBep0gT'
                    }, 
                'scheduler': {
                    'type': 'EventBridgeScheduler', 
                    'group': pipeline_id, 
                    'name': 'LogArchive', 
                    'expression': 'cron(0 2 * * ? *)', 
                    'age': '7'
                    }
                }, 
            ]
        }


def test_create_light_engine_service_pipeline(sfn_client, ddb_client, sts_client, light_engine_create_event):
    from lambda_function import create_light_engine_service_pipeline, SvcPipeline, SvcPipelineDao, BufferTypeEnum, EngineType, LightEngineParams, pipeline_table_name
    
    service_pipeline_id = create_light_engine_service_pipeline(**light_engine_creation_event)
    assert service_pipeline_id != ''
    
    service_pipeline_dao = SvcPipelineDao(table_name=pipeline_table_name)
    service_pipeline_info = service_pipeline_dao.get_svc_pipeline(id=service_pipeline_id)
    assert service_pipeline_info.id == service_pipeline_id
    assert service_pipeline_info.destinationType == BufferTypeEnum.S3
    assert service_pipeline_info.engineType == EngineType.LIGHT_ENGINE
    assert service_pipeline_info.lightEngineParams.stagingBucketPrefix[:38] == 'LightEngine/AWSLogs/WAFLogs/CL-SvcPipe'
    assert service_pipeline_info.lightEngineParams.centralizedBucketName == 'centralized-bucket'
    assert service_pipeline_info.lightEngineParams.centralizedBucketPrefix == 'datalake'
    assert service_pipeline_info.lightEngineParams.centralizedTableName == 'waf'
    assert service_pipeline_info.lightEngineParams.centralizedMetricsTableName == ''
    assert service_pipeline_info.lightEngineParams.logProcessorSchedule == 'rate(5 minutes)'
    assert service_pipeline_info.lightEngineParams.logMergerSchedule == 'cron(0 1 * * ? *)'
    assert service_pipeline_info.lightEngineParams.logArchiveSchedule == 'cron(0 2 * * ? *)'
    assert service_pipeline_info.lightEngineParams.logMergerAge == '1'
    assert service_pipeline_info.lightEngineParams.logArchiveAge == '7'
    assert service_pipeline_info.lightEngineParams.importDashboards == 'true'
    assert service_pipeline_info.lightEngineParams.grafanaId == '28cada44-b170-46ca-a9e4-1e146338f124'
    assert service_pipeline_info.lightEngineParams.recipients == ''
    assert service_pipeline_info.lightEngineParams.notificationService == 'SNS'

def test_create_light_engine_service_pipeline_with_alarm_arn(sfn_client, ddb_client, sts_client, light_engine_create_event):
    from lambda_function import create_light_engine_service_pipeline, SvcPipeline, SvcPipelineDao, BufferTypeEnum, EngineType, LightEngineParams, pipeline_table_name
    
    service_pipeline_id = create_light_engine_service_pipeline(**light_engine_creation_event, monitor={
        "status": "ENABLED",
        "backupBucketName": "",
        "errorLogPrefix": "error/APPLogs/index-prefix=/",
        "pipelineAlarmStatus": "ENABLED",
        "snsTopicName": "",
        "snsTopicArn": "arn:aws:sns:us-east-1:12345:test-topic",
        "emails": "",
    })
    assert service_pipeline_id != ''
    
    service_pipeline_dao = SvcPipelineDao(table_name=pipeline_table_name)
    service_pipeline_info = service_pipeline_dao.get_svc_pipeline(id=service_pipeline_id)
    assert service_pipeline_info.lightEngineParams.recipients == "arn:aws:sns:us-east-1:12345:test-topic"

def test_create_light_engine_service_pipeline_with_alarm_arn(sfn_client, ddb_client, sts_client, light_engine_create_event):
    from lambda_function import create_light_engine_service_pipeline, SvcPipeline, SvcPipelineDao, BufferTypeEnum, EngineType, LightEngineParams, pipeline_table_name
    
    service_pipeline_id = create_light_engine_service_pipeline(**light_engine_creation_event, monitor={
        "status": "ENABLED",
        "backupBucketName": "",
        "errorLogPrefix": "error/APPLogs/index-prefix=/",
        "pipelineAlarmStatus": "ENABLED",
        "snsTopicName": "test-topic",
        "snsTopicArn": "",
        "emails": "alejandro_rosalez@example.org",
    })
    assert service_pipeline_id != ''
    
    service_pipeline_dao = SvcPipelineDao(table_name=pipeline_table_name)
    service_pipeline_info = service_pipeline_dao.get_svc_pipeline(id=service_pipeline_id)
    assert service_pipeline_info.lightEngineParams.recipients == f"arn:aws:sns:us-east-1:12345678:test-topic_{service_pipeline_id[:8]}"

def test_get_light_engine_app_pipeline_logs(ddb_client):
    from lambda_function import get_light_engine_service_pipeline_logs
    
    request = {
        'pipelineId': '3d37e69e-7129-461e-b4b8-4a8e72eb5b80',
        'stateMachineName': 'LogProcessor-u5TUghpQChw4',
        'type': 'LogProcessor',
    }
    
    response = get_light_engine_service_pipeline_logs(**request)
    assert response['items'] == [
            {
                "executionName": "3ad531f6-e158-4f2b-afa4-ee6292e0434d",
                "taskId": "00000000-0000-0000-0000-000000000000",
                "endTime": "2023-10-16T04:18:37.150Z",
                "startTime": "2023-10-16T04:18:38.272Z",
                "status": "Running",
                "executionArn": "arn:aws:states:us-east-1:12345678:execution:LogProcessor-u5TUghpQChw4:3ad531f6-e158-4f2b-afa4-ee6292e0434d"
            },
            {
                'executionName': '3c38d333-a3a5-46f3-8791-36f203b5b98e', 
                'taskId': '00000000-0000-0000-0000-000000000000', 
                'startTime': '2023-10-16T04:13:38.272Z', 
                'endTime': '2023-10-16T04:13:37.150Z', 
                'status': 'Running',
                "executionArn": "arn:aws:states:us-east-1:12345678:execution:LogProcessor-u5TUghpQChw4:3c38d333-a3a5-46f3-8791-36f203b5b98e"
                }, 
            {
                "executionName": "47eae851-54c1-447d-a394-330469b95966",
                "taskId": "00000000-0000-0000-0000-000000000000",
                "endTime": "2023-10-16T04:08:37.150Z",
                'startTime': '2023-10-16T04:08:38.272Z',
                "status": "Failed",
                "executionArn": "arn:aws:states:us-east-1:12345678:execution:LogProcessor-u5TUghpQChw4:47eae851-54c1-447d-a394-330469b95966"
            },
            {
                'executionName': '70fa7767-82e9-469c-97ee-4fb071339ad9', 
                'taskId': '00000000-0000-0000-0000-000000000000', 
                'startTime': '2023-10-16T04:03:38.272Z', 
                'endTime': '2023-10-16T04:03:37.150Z', 
                'status': 'Aborted',
                "executionArn": "arn:aws:states:us-east-1:12345678:execution:LogProcessor-u5TUghpQChw4:70fa7767-82e9-469c-97ee-4fb071339ad9"
                }, 
            {
                'executionName': '0f0a0643-748d-4bbf-a673-4aca6dc6838a', 
                'taskId': '00000000-0000-0000-0000-000000000000', 
                'startTime': '2023-10-16T03:58:34.272Z', 
                'endTime': '2023-10-16T03:58:36.150Z', 
                'status': 'Timed_out',
                "executionArn": "arn:aws:states:us-east-1:12345678:execution:LogProcessor-u5TUghpQChw4:0f0a0643-748d-4bbf-a673-4aca6dc6838a"
                }, 
            {
                'executionName': '775b1764-c0cf-481e-9561-873841507ebc', 
                'taskId': '00000000-0000-0000-0000-000000000000', 
                'startTime': '2023-10-16T03:53:34.152Z', 
                'endTime': '2023-10-16T03:53:36.230Z', 
                'status': 'Succeeded',
                "executionArn": "arn:aws:states:us-east-1:12345678:execution:LogProcessor-u5TUghpQChw4:775b1764-c0cf-481e-9561-873841507ebc"
                }, 
            {
                'executionName': '88652cb2-812f-4574-af3e-0094fda842d2', 
                'taskId': '00000000-0000-0000-0000-000000000000', 
                'startTime': '2023-10-16T03:48:34.852Z', 
                'endTime': '2023-10-16T03:48:36.340Z', 
                'status': 'Succeeded',
                "executionArn": "arn:aws:states:us-east-1:12345678:execution:LogProcessor-u5TUghpQChw4:88652cb2-812f-4574-af3e-0094fda842d2"
                },
            ]
    
    request = {
        'pipelineId': '3d37e69e-7129-461e-b4b8-4a8e72eb5b80',
        'stateMachineName': 'LogProcessor-u5TUghpQChw4',
        'type': 'LogProcessor',
        'startTime': '2023-10-16T03:48:33.000Z',
        'endTime': '2023-10-16T03:53:34.152Z',
        'status': 'Succeeded',
    }
    
    response = get_light_engine_service_pipeline_logs(**request)
    assert response['items'] == [
            {
                'executionName': '775b1764-c0cf-481e-9561-873841507ebc', 
                'taskId': '00000000-0000-0000-0000-000000000000', 
                'startTime': '2023-10-16T03:53:34.152Z', 
                'endTime': '2023-10-16T03:53:36.230Z', 
                'status': 'Succeeded',
                "executionArn": "arn:aws:states:us-east-1:12345678:execution:LogProcessor-u5TUghpQChw4:775b1764-c0cf-481e-9561-873841507ebc"
                }, 
            {
                'executionName': '88652cb2-812f-4574-af3e-0094fda842d2', 
                'taskId': '00000000-0000-0000-0000-000000000000', 
                'startTime': '2023-10-16T03:48:34.852Z', 
                'endTime': '2023-10-16T03:48:36.340Z', 
                'status': 'Succeeded',
                "executionArn": "arn:aws:states:us-east-1:12345678:execution:LogProcessor-u5TUghpQChw4:88652cb2-812f-4574-af3e-0094fda842d2"
                },
            ]
    
    request = {
        'pipelineId': '3d37e69e-7129-461e-b4b8-4a8e72eb5b80',
        'stateMachineName': 'LogProcessor-u5TUghpQChw4',
        'type': 'LogProcessor',
        'startTime': '2023-10-16T03:48:33.000Z',
        'status': 'Running',
        'limit': 1
    }
    response = get_light_engine_service_pipeline_logs(**request)
    assert response['items'] == [
        {
            'executionName': '3ad531f6-e158-4f2b-afa4-ee6292e0434d', 
            'taskId': '00000000-0000-0000-0000-000000000000', 
            'startTime': '2023-10-16T04:18:38.272Z', 'endTime': '2023-10-16T04:18:37.150Z', 
            'status': 'Running',
            "executionArn": "arn:aws:states:us-east-1:12345678:execution:LogProcessor-u5TUghpQChw4:3ad531f6-e158-4f2b-afa4-ee6292e0434d"
            }
        ]
    request = {
        'pipelineId': '3d37e69e-7129-461e-b4b8-4a8e72eb5b80',
        'stateMachineName': 'LogProcessor-u5TUghpQChw4',
        'type': 'LogProcessor',
        'startTime': '2023-10-16T03:48:33.000Z',
        'status': 'Running',
        'limit': 1,
        'lastEvaluatedKey': response.get('lastEvaluatedKey')
    }
    response = get_light_engine_service_pipeline_logs(**request)
    assert response['items'] == [
        {
            'executionName': '3c38d333-a3a5-46f3-8791-36f203b5b98e', 
            'taskId': '00000000-0000-0000-0000-000000000000', 
            'startTime': '2023-10-16T04:13:38.272Z', 
            'endTime': '2023-10-16T04:13:37.150Z', 
            'status': 'Running',
            "executionArn": "arn:aws:states:us-east-1:12345678:execution:LogProcessor-u5TUghpQChw4:3c38d333-a3a5-46f3-8791-36f203b5b98e"
            }, 
        ]
    request = {
        'pipelineId': '3d37e69e-7129-461e-b4b8-4a8e72eb5b80',
        'stateMachineName': 'LogProcessor-u5TUghpQChw4',
        'type': 'LogProcessor',
        'startTime': '2023-10-16T03:48:33.000Z',
        'status': 'Running',
        'limit': 1,
        'lastEvaluatedKey': response.get('lastEvaluatedKey')
    }
    response = get_light_engine_service_pipeline_logs(**request)
    assert response['items'] == []
    