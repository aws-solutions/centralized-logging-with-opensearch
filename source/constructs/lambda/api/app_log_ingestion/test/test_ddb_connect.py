# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import pytest
import os
import boto3
from .datafile import ddb_mock_data
from moto import mock_dynamodb, mock_s3, mock_ssm, mock_sts


@pytest.fixture
def ssm_client():
    with mock_ssm():
        region = os.environ.get("AWS_REGION")
        ssm = boto3.client("ssm", region_name=region)
        filepath = "./test/datafile/document_content.json"
        with open(filepath) as openFile:
            document_content = openFile.read()
            ssm.create_document(
                Content=document_content,
                Name=os.environ.get("SSM_LOG_CONFIG_DOCUMENT_NAME"),
                DocumentType="Automation",
                DocumentFormat="JSON",
            )


@pytest.fixture
def ddb_client():
    with mock_dynamodb():
        region = os.environ.get("AWS_REGION")
        ddb = boto3.resource("dynamodb", region_name=region)
        # Mock App Pipeline Table
        app_pipeline_table_name = os.environ.get("APP_PIPELINE_TABLE_NAME")
        app_pipeline_table = ddb.create_table(
            TableName=app_pipeline_table_name,
            KeySchema=[{
                "AttributeName": "id",
                "KeyType": "HASH"
            }],
            AttributeDefinitions=[{
                "AttributeName": "id",
                "AttributeType": "S"
            }],
            ProvisionedThroughput={
                "ReadCapacityUnits": 10,
                "WriteCapacityUnits": 10
            },
        )
        data_list = [
            {
                "id": "62a37b50-72af-4a7b-9d4b-d859d538a19c",
                "aosParams": {
                    "coldLogTransition": 0,
                    "domainName": "loghub-os",
                    "engine": "OpenSearch",
                    "failedLogBucket": "loghub-loghubloggingbucket0fa53b76-12cw0hl0kfnk6",
                    "indexPrefix": "syslog-dev-03",
                    "logRetention": 10,
                    "opensearchArn": "arn:aws:es:us-west-2:012345678912:domain/loghub-os",
                    "opensearchEndpoint": "vpc-loghub-os-yhb4z4uzd544pna27wlqqumk2y.us-west-2.es.amazonaws.com",
                    "replicaNumbers": 0,
                    "shardNumbers": 1,
                    "vpc": {
                        "privateSubnetIds": "subnet-0e33bba1e55791d9a,subnet-0c34c064b47a5f4fb",
                        "publicSubnetIds": "",
                        "securityGroupId": "sg-06ee9849f105f4208",
                        "vpcId": "vpc-09990f6348b2ba3d9"
                    },
                    "warmLogTransition": 0
                },
                "bufferAccessRoleArn": "arn:aws:iam::012345678912:role/LogHub-AppPipe-62a37-BufferAccessRoleDF53FD85-4BU06LEOL8JH",
                "bufferAccessRoleName": "LogHub-AppPipe-62a37-BufferAccessRoleDF53FD85-4BU06LEOL8JH",
                "bufferParams": [
                    {
                        "paramKey": "enableAutoScaling",
                        "paramValue": "false"
                    },
                    {
                        "paramKey": "shardCount",
                        "paramValue": "1"
                    },
                    {
                        "paramKey": "minCapacity",
                        "paramValue": "1"
                    },
                    {
                        "paramKey": "maxCapacity",
                        "paramValue": "5"
                    }
                ],
                "bufferResourceArn": "arn:aws:kinesis:us-west-2:012345678912:stream/LogHub-AppPipe-62a37-KDSBufferStream21B531A6-xhE79t2qh4um",
                "bufferResourceName": "LogHub-AppPipe-62a37-KDSBufferStream21B531A6-xhE79t2qh4um",
                "bufferType": "KDS",
                "createdDt": "2022-10-27T07:47:19Z",
                "error": "",
                "osHelperFnArn": "arn:aws:lambda:us-west-2:012345678912:function:LogHub-AppPipe-62a37-OpenSearchHelperFn-z50kqDR01c6u",
                "stackId": "arn:aws:cloudformation:us-west-2:012345678912:stack/LogHub-AppPipe-62a37/96ea1a40-55cb-11ed-868d-0a1261729f93",
                "status": "ACTIVE",
                "tags": [
                ]
            }
        ]
        with app_pipeline_table.batch_writer() as batch:
            for data in data_list:
                batch.put_item(Item=data)

        # Mock App Log Source Table
        log_source_table_name = os.environ.get("LOG_SOURCE_TABLE_NAME")
        log_source_table = ddb.create_table(
            TableName=log_source_table_name,
            KeySchema=[{
                "AttributeName": "id",
                "KeyType": "HASH"
            }],
            AttributeDefinitions=[{
                "AttributeName": "id",
                "AttributeType": "S"
            }],
            ProvisionedThroughput={
                "ReadCapacityUnits": 10,
                "WriteCapacityUnits": 10
            },
        )
        data_list = [
            {
                "id": "84c6c37e-03db-4846-bb90-93e85bb1b27b",
                "accountId": "012345678912",
                "createdDt": "2022-10-27T16:13:14Z",
                "region": "us-west-2",
                "sourceInfo": [
                    {
                        "key": "syslogProtocol",
                        "value": "UDP"
                    },
                    {
                        "key": "syslogPort",
                        "value": "16000"
                    },
                    {
                        "key": "syslogNlbArn",
                        "value": "arn:aws:elasticloadbalancing:us-west-2:012345678912:loadbalancer/net/LogHub-syslog-nlb/e504b1fb454aa0aa"
                    },
                    {
                        "key": "syslogNlbDNSName",
                        "value": "LogHub-syslog-nlb-e504b1fb454aa0aa.elb.us-west-2.amazonaws.com"
                    }
                ],
                "sourceType": "Syslog",
                "status": "ACTIVE",
                "tags": [
                ],
                "updatedDt": "2022-10-27T16:18:39Z"
            }
        ]
        with log_source_table.batch_writer() as batch:
            for data in data_list:
                batch.put_item(Item=data)

        # Mock App Log Configuration Table
        app_log_config_table_name = os.environ.get("APP_LOG_CONFIG_TABLE_NAME")
        app_log_config_table = ddb.create_table(
            TableName=app_log_config_table_name,
            KeySchema=[{
                "AttributeName": "id",
                "KeyType": "HASH"
            }],
            AttributeDefinitions=[{
                "AttributeName": "id",
                "AttributeType": "S"
            }],
            ProvisionedThroughput={
                "ReadCapacityUnits": 10,
                "WriteCapacityUnits": 10
            },
        )
        data_list = [
            {
                "id": "482a7d61-db33-4cbb-998f-af52f4652d7d",
                "confName": "syslog-dev-01",
                "createdDt": "2022-10-24T08:14:05Z",
                "logType": "SingleLineText",
                "multilineLogParser": None,
                "processorFilterRegex": {
                    "enable": False,
                    "filters": [
                        {
                            "condition": "Include",
                            "key": "pri",
                            "value": ""
                        },
                        {
                            "condition": "Include",
                            "key": "time",
                            "value": ""
                        },
                        {
                            "condition": "Include",
                            "key": "host",
                            "value": ""
                        },
                        {
                            "condition": "Include",
                            "key": "ident",
                            "value": ""
                        },
                        {
                            "condition": "Include",
                            "key": "pid",
                            "value": ""
                        },
                        {
                            "condition": "Include",
                            "key": "message",
                            "value": ""
                        }
                    ]
                },
                "regularExpression": "^\\<(?<pri>[0-9]+)\\>(?<time>[^ ]* {1,2}[^ ]* [^ ]*) (?<host>[^ ]*) (?<ident>[a-zA-Z0-9_\\/\\.\\-]*)(?:\\[(?<pid>[0-9]+)\\])?(?:[^\\:]*\\:)? *(?<message>.*)$",
                "regularSpecs": [
                    {
                        "key": "pri",
                        "type": "text"
                    },
                    {
                        "format": "%b %y %H:%M:%S",
                        "key": "time",
                        "type": "date"
                    },
                    {
                        "key": "host",
                        "type": "text"
                    },
                    {
                        "key": "ident",
                        "type": "text"
                    },
                    {
                        "key": "pid",
                        "type": "text"
                    },
                    {
                        "key": "message",
                        "type": "text"
                    }
                ],
                "status": "ACTIVE",
                "timeKey": "time",
                "timeOffset": None,
                "userLogFormat": "^\\<(?<pri>[0-9]+)\\>(?<time>[^ ]* {1,2}[^ ]* [^ ]*) (?<host>[^ ]*) (?<ident>[a-zA-Z0-9_\\/\\.\\-]*)(?:\\[(?<pid>[0-9]+)\\])?(?:[^\\:]*\\:)? *(?<message>.*)$",
                "userSampleLog": "<35>Oct 12 22:14:15 client_machine su: 'su root' failed for joe on /dev/pts/2"
            }
        ]
        with app_log_config_table.batch_writer() as batch:
            for data in data_list:
                batch.put_item(Item=data)
        
        yield

@pytest.fixture
def sts_client():
    with mock_sts():
        boto3.client("sts", region_name=os.environ.get("AWS_REGION"))
        yield


@pytest.fixture
def s3_client():
    with mock_s3():
        region = os.environ.get("AWS_REGION")

        s3 = boto3.resource("s3", region_name=region)
        # Create the buckets
        bucket_name = os.environ.get("CONFIG_FILE_S3_BUCKET_NAME")
        s3.create_bucket(Bucket=bucket_name)
        yield


class TestDDBConnect:
    def test_create_ingestion_parser(self, ddb_client, s3_client, sts_client):
        from ..util.fluentbit_config_helper.ddb_connect import SyslogDDBConnect, PipeObject

        source_id = "84c6c37e-03db-4846-bb90-93e85bb1b27b"
        config_id = "482a7d61-db33-4cbb-998f-af52f4652d7d"
        app_pipeline_id = "62a37b50-72af-4a7b-9d4b-d859d538a19c"

        pipe_object_list = [
            PipeObject(
            source_id=source_id,
            config_id=config_id,
            app_pipeline_id=app_pipeline_id,
        )
        ]

        ddb_connect = SyslogDDBConnect(pipe_object_list)

        # Test to get the pipe source/input info
        ddb_connect.get_source_info(source_id)

        # Test to get the pipe output info
        ddb_connect.get_config_info(config_id)

        # Test to get the pipe config/parser info
        ddb_connect.get_output_info(app_pipeline_id)

        # Test to get the pipe info list
        ddb_connect.get_pipe_info_list()