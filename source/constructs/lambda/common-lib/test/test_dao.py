# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import os
import re
import json
import gzip
import base64
import boto3
from commonlib.dao import InstanceDao
import pytest

from moto import mock_dynamodb
from moto.core import DEFAULT_ACCOUNT_ID as ACCOUNT_ID
from boto3.dynamodb.conditions import Attr
from commonlib.exception import APIException
from commonlib.model import (
    AOSParams,
    DomainImportStatusEnum,
    DomainImportType,
    LogStructure,
    LogTypeEnum,
    AppPipeline,
    BufferParam,
    BufferTypeEnum,
    EngineType,
    FilterConfigMap,
    LogConfig,
    LogSource,
    LogSourceTypeEnum,
    LogTypeEnum,
    MonitorDetail,
    OpenSearchIngestionInput,
    PipelineAlarmStatus,
    GroupPlatformEnum,
    GroupTypeEnum,
    ProxyInput,
    ProxyVpc,
    RegularSpec,
    Resource,
    StatusEnum,
)


def init_table(table, rows):
    with table.batch_writer() as batch:
        for data in rows:
            batch.put_item(Item=data)


@pytest.fixture
def ddb_client():
    with mock_dynamodb():
        region = os.environ.get("AWS_REGION")
        ddb = boto3.resource("dynamodb", region_name=region)
        # Mock cluster table
        opensearch_domain_table_name = os.environ.get("CLUSTER_TABLE")
        app_pipeline_table = ddb.create_table(
            TableName=opensearch_domain_table_name,
            KeySchema=[{"AttributeName": "id", "KeyType": "HASH"}],
            AttributeDefinitions=[{"AttributeName": "id", "AttributeType": "S"}],
            ProvisionedThroughput={"ReadCapacityUnits": 10, "WriteCapacityUnits": 10},
        )
        data_list = [
            {
                "id": "opensearch-1",
                "accountId": ACCOUNT_ID,
                "alarmStatus": "DISABLED",
                "domainArn": f"arn:aws:es:us-west-2:{ACCOUNT_ID}:domain/may24",
                "domainInfo": {
                    "DomainStatus": {
                        "VPCOptions": {
                            "AvailabilityZones": ["us-west-2b"],
                            "SecurityGroupIds": ["sg-0fc8398d4dc270f01"],
                            "SubnetIds": ["subnet-0eb38879d66848a99"],
                            "VPCId": "vpc-09d983bed6954836e",
                        }
                    }
                },
                "domainName": "may24",
                "endpoint": "vpc-may24.us-west-2.es.amazonaws.com",
                "engine": "OpenSearch",
                "importedDt": "2023-05-24T08:47:11Z",
                "proxyALB": "",
                "proxyError": "",
                "proxyInput": {},
                "importMethod": DomainImportType.AUTOMATIC,
                "proxyStackId": f"arn:aws:cloudformation:us-west-2:{ACCOUNT_ID}:stack/CL-Proxy-f862f9f5/9bd7c7c0-fb87-11ed-912f-0aac039a8cd1",
                "proxyStatus": "DISABLED",
                "region": "us-west-2",
                "resources": [
                    {
                        "name": "OpenSearchSecurityGroup",
                        "status": "UPDATED",
                        "values": ["sg-0fc8398d4dc270f01"],
                    },
                    {
                        "name": "VPCPeering",
                        "status": "CREATED",
                        "values": ["pcx-0f756a20c2d967681"],
                    },
                    {
                        "name": "OpenSearchRouteTables",
                        "status": "UPDATED",
                        "values": ["rtb-085e9e315daffeb47"],
                    },
                    {
                        "name": "SolutionRouteTables",
                        "status": "UPDATED",
                        "values": ["rtb-0fd78aa9852632af9", "rtb-001b397b7e8eccb55"],
                    },
                ],
                "status": "ACTIVE",
                "tags": [],
                "version": "2.5",
                "vpc": {
                    "privateSubnetIds": "subnet-081f8e7c722477a83,subnet-0c95536ae6b1cdb07",
                    "securityGroupId": "sg-0d6567095a7667f7f",
                    "vpcId": "vpc-03089a5f415c2be27",
                },
            },
            {
                "id": "opensearch-2",
                "accountId": ACCOUNT_ID,
                "alarmStatus": "DISABLED",
                "domainArn": f"arn:aws:es:us-west-2:{ACCOUNT_ID}:domain/may23",
                "domainName": "may23",
                "domainInfo": {
                    "DomainStatus": {
                        "VPCOptions": {
                            "AvailabilityZones": ["us-west-2b"],
                            "SecurityGroupIds": ["sg-0fc8398d4dc270f01"],
                            "SubnetIds": ["subnet-0eb38879d66848a99"],
                            "VPCId": "vpc-09d983bed6954836e",
                        }
                    }
                },
                "endpoint": "vpc-may23.us-west-2.es.amazonaws.com",
                "status": "INACTIVE",
                "proxyStatus": "DISABLED",
                "importMethod": DomainImportType.AUTOMATIC,
                "tags": [],
                "engine": "OpenSearch",
                "importedDt": "2023-05-24T08:47:11Z",
                "version": "2.5",
                "region": "us-west-2",
                "resources": [],
                "vpc": {
                    "privateSubnetIds": "subnet-081f8e7c722477a83,subnet-0c95536ae6b1cdb07",
                    "securityGroupId": "sg-0d6567095a7667f7f",
                    "vpcId": "vpc-03089a5f415c2be27",
                },
            },
            {
                "id": "opensearch-3",
                "accountId": ACCOUNT_ID,
                "alarmStatus": "DISABLED",
                "domainArn": f"arn:aws:es:us-west-2:{ACCOUNT_ID}:domain/may23",
                "domainName": "may25",
                "domainInfo": {
                    "DomainStatus": {
                        "VPCOptions": {
                            "AvailabilityZones": ["us-west-2b"],
                            "SecurityGroupIds": ["sg-0fc8398d4dc270f01"],
                            "SubnetIds": ["subnet-0eb38879d66848a99"],
                            "VPCId": "vpc-09d983bed6954836e",
                        }
                    }
                },
                "endpoint": "vpc-may23.us-west-2.es.amazonaws.com",
                "status": "ACTIVE",
                "proxyStatus": "DISABLED",
                "importMethod": DomainImportType.AUTOMATIC,
                "importedDt": "2023-05-24T08:47:11Z",
                "tags": [],
                "engine": "OpenSearch",
                "region": "us-west-2",
                "resources": [],
                "version": "2.5",
                "vpc": {
                    "privateSubnetIds": "subnet-081f8e7c722477a83,subnet-0c95536ae6b1cdb07",
                    "securityGroupId": "sg-0d6567095a7667f7f",
                    "vpcId": "vpc-03089a5f415c2be27",
                },
            },
        ]
        init_table(app_pipeline_table, data_list)

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
                "processorFnName": "processorFnName",
                "deliveryStreamName": "deliveryStreamName",
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
                "tags": [],
            },
            {
                "pipelineId": "222222222222222",
                "indexPrefix": "syslog-dev-04",
                "aosParams": {
                    "coldLogTransition": 0,
                    "domainName": "solution-os",
                    "engine": "OpenSearch",
                    "failedLogBucket": "solution-solutionloggingbucket0fa53b76-12cw0hl0kfnk6",
                    "indexPrefix": "syslog-dev-04",
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
                "status": "INACTIVE",
                "monitor": {
                    "status": "ENABLED",
                    "backupBucketName": "solution-solutionloggingbucket0fa53b76-12cw0hl0kfnk6",
                    "errorLogPrefix": "error/",
                },
                "logStructue": "FLUENT_BIT_PARSED_JSON",
                "tags": [],
            },
            {
                "pipelineId": "3333",
                "indexPrefix": "syslog-dev-04",
                "aosParams": {
                    "coldLogTransition": 0,
                    "domainName": "solution-os",
                    "engine": "OpenSearch",
                    "failedLogBucket": "solution-solutionloggingbucket0fa53b76-12cw0hl0kfnk6",
                    "indexPrefix": "syslog-dev-04",
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
                    {"paramKey": "logBucketPrefix", "paramValue": "prefix/"},
                    {"paramKey": "logBucketSuffix", "paramValue": ".suffix"},
                    {"paramKey": "createDashboard", "paramValue": "Yes"},
                    {"paramKey": "mskClusterArn", "paramValue": "mskClusterArn"},
                    {"paramKey": "mskClusterName", "paramValue": "mskClusterName"},
                ],
                "bufferResourceArn": "arn:aws:kinesis:us-west-2:123456789012:stream/Solution-AppPipe-62a37-KDSBufferStream21B531A6-xhE79t2qh4um",
                "bufferResourceName": "Solution-AppPipe-62a37-KDSBufferStream21B531A6-xhE79t2qh4um",
                "bufferType": "S3",
                "createdAt": "2022-10-27T07:47:19Z",
                "logConfigId": "logConfigId",
                "logConfigVersionNumber": 100,
                "error": "",
                "osHelperFnArn": "arn:aws:lambda:us-west-2:123456789012:function:Solution-AppPipe-62a37-OpenSearchHelperFn-z50kqDR01c6u",
                "stackId": "arn:aws:cloudformation:us-west-2:123456789012:stack/Solution-AppPipe-62a37/96ea1a40-55cb-11ed-868d-0a1261729f93",
                "status": "INACTIVE",
                "monitor": {
                    "status": "ENABLED",
                    "backupBucketName": "solution-solutionloggingbucket0fa53b76-12cw0hl0kfnk6",
                    "errorLogPrefix": "error/",
                },
                "tags": [],
            },
            {
                "pipelineId": "2406190a-bb74-407e-82cb-e441c4e9efe5",
                "aosParams": {
                    "codec": "best_compression",
                    "coldLogTransition": "",
                    "domainName": "solution-os",
                    "engine": "OpenSearch",
                    "failedLogBucket": "logging-bucket",
                    "indexPrefix": "clo-app-s3s",
                    "indexSuffix": "yyyy_MM_dd",
                    "logRetention": "7d",
                    "opensearchArn": "arn:aws:es:us-esat-1:123456789012:domain/solution-os",
                    "opensearchEndpoint": "solution-os.us-east-1.es.amazonaws.com",
                    "refreshInterval": "1s",
                    "replicaNumbers": 1,
                    "rolloverSize": "30gb",
                    "shardNumbers": 1,
                    "vpc": {
                        "privateSubnetIds": "subnet-1,subnet-2",
                        "publicSubnetIds": "",
                        "securityGroupId": "sg-1",
                        "vpcId": "vpc",
                    },
                    "warmLogTransition": "",
                },
                "bufferAccessRoleArn": "arn:aws:iam::123456789012:role/CL-buffer-access-2406190a",
                "bufferAccessRoleName": "CL-buffer-access-2406190a",
                "bufferParams": [
                    {"paramKey": "logBucketName", "paramValue": "logging-bucket"},
                    {
                        "paramKey": "logBucketPrefix",
                        "paramValue": "test/do-not-exists/",
                    },
                    {"paramKey": "logBucketSuffix", "paramValue": ""},
                    {
                        "paramKey": "defaultCmkArn",
                        "paramValue": "arn:aws:kms:us-east-1:1234566789012:key/a545f45f-7dff-4273-ba2f-2013b737f462",
                    },
                    {"paramKey": "maxFileSize", "paramValue": "50"},
                    {"paramKey": "uploadTimeout", "paramValue": "60"},
                    {"paramKey": "compressionType", "paramValue": "GZIP"},
                    {"paramKey": "s3StorageClass", "paramValue": "INTELLIGENT_TIERING"},
                    {"paramKey": "createDashboard", "paramValue": "No"},
                    {"paramKey": "isS3Source", "paramValue": "true"},
                    {"paramKey": "enableS3Notification", "paramValue": "False"},
                ],
                "bufferResourceArn": "arn:aws:s3:::logging-bucket",
                "bufferResourceName": "logging-bucket",
                "bufferType": "S3",
                "createdAt": "2023-11-20T07:09:49Z",
                "engineType": "OpenSearch",
                "error": "",
                "helperLogGroupName": "",
                "indexPrefix": "clo-app-s3s",
                "logConfigId": "83e01c25-962e-4913-9e4c-755de304ff4a",
                "logConfigVersionNumber": 1,
                "logEventQueueName": "CL-sqs-2406190a-bb74-407e-82cb-e441c4e9efe5",
                "logProcessorRoleArn": "arn:aws:iam::123456789012:role/CL-log-processor-2406190a",
                "monitor": {
                    "backupBucketName": "logging-bucket",
                    "emails": "",
                    "errorLogPrefix": "",
                    "pipelineAlarmStatus": "DISABLED",
                    "snsTopicArn": "",
                    "snsTopicName": "",
                    "status": "ENABLED",
                },
                "osHelperFnArn": "",
                "processorLogGroupName": "/aws/lambda/CL-AppPipe-2406190a-LogProcessorFn",
                "queueArn": "arn:aws:sqs:east-1:123456789012:CL-sqs-2406190a-bb74-407e-82cb-e441c4e9efe5",
                "stackId": "arn:aws:cloudformation:us-east-1:123456789012:stack/CL-AppPipe-2406190a/ccd8c090-8773-11ee-9276-06b91d21373f",
                "status": "ACTIVE",
                "tags": [],
                "updatedAt": "2023-11-20T07:09:49Z",
            },
        ]
        init_table(app_pipeline_table, data_list)

        # Mock Instance Table 1
        instance_table_name_1 = os.environ.get("INSTANCE_TABLE_NAME_1")
        instance_table_1 = ddb.create_table(
            TableName=instance_table_name_1,
            KeySchema=[{"AttributeName": "id", "KeyType": "HASH"}],
            AttributeDefinitions=[{"AttributeName": "id", "AttributeType": "S"}],
            ProvisionedThroughput={"ReadCapacityUnits": 10, "WriteCapacityUnits": 10},
        )
        data_list = [
            {
                "id": "i-0e3c99ac76e3c0ea1",
                "sourceId": "84c6c37e-03db-4846-bb90-93e85bb1b271",
                "createdAt": "2022-10-27T16:13:14Z",
                "updatedAt": "2022-10-27T16:18:39Z",
                "tags": [],
                "status": "ACTIVE",
                "accountId": "123456789012",
                "region": "us-west-2",
            },
            {
                "id": "i-0e3c99ac76e3c0ea2",
                "sourceId": "84c6c37e-03db-4846-bb90-93e85bb1b272",
                "createdAt": "2022-10-27T16:13:14Z",
                "updatedAt": "2022-10-27T16:18:39Z",
                "tags": [],
                "status": "ACTIVE",
                "accountId": "123456789012",
                "region": "us-west-2",
            },
            {
                "id": "i-helloworld",
                "sourceId": "d7a18244-96b4-4cf0-9806-ebe1a12315d9",
                "createdAt": "2022-10-27T16:13:14Z",
                "updatedAt": "2022-10-27T16:18:39Z",
                "tags": [],
                "status": "ACTIVE",
                "accountId": "123456789012",
                "region": "us-west-2",
            },
        ]
        init_table(instance_table_1, data_list)

        # Mock Instance Table 2
        instance_table_name_2 = os.environ.get("INSTANCE_TABLE_NAME_2")
        instance_table_2 = ddb.create_table(
            TableName=instance_table_name_2,
            KeySchema=[
                {"AttributeName": "id", "KeyType": "HASH"},
                {"AttributeName": "sourceId", "KeyType": "RANGE"},
            ],
            AttributeDefinitions=[
                {"AttributeName": "id", "AttributeType": "S"},
                {"AttributeName": "sourceId", "AttributeType": "S"},
            ],
            ProvisionedThroughput={"ReadCapacityUnits": 10, "WriteCapacityUnits": 10},
            GlobalSecondaryIndexes=[
                {
                    "IndexName": "SourceToInstanceIndex",
                    "KeySchema": [{"AttributeName": "sourceId", "KeyType": "HASH"}],
                    "Projection": {"ProjectionType": "ALL"},
                }
            ],
        )
        init_table(instance_table_2, data_list)

        # Mock App Log Source Table
        log_source_table_name = os.environ.get("LOG_SOURCE_TABLE_NAME")
        log_source_table = ddb.create_table(
            TableName=log_source_table_name,
            KeySchema=[{"AttributeName": "sourceId", "KeyType": "HASH"}],
            AttributeDefinitions=[{"AttributeName": "sourceId", "AttributeType": "S"}],
            ProvisionedThroughput={"ReadCapacityUnits": 10, "WriteCapacityUnits": 10},
        )
        data_list = [
            {
                "sourceId": "84c6c37e-03db-4846-bb90-93e85bb1b27b",
                "accountId": "123456789012",
                "createdAt": "2022-10-27T16:13:14Z",
                "region": "us-west-2",
                "syslog": {
                    "protocol": "UDP",
                    "port": 16000,
                    "nlbArn": "arn:aws:elasticloadbalancing:us-west-2:123456789012:loadbalancer/net/Solution-syslog-nlb/e504b1fb454aa0aa",
                    "nlbDNSName": "Solution-syslog-nlb-e504b1fb454aa0aa.elb.us-west-2.amazonaws.com",
                },
                "type": "Syslog",
                "status": "CREATING",
                "tags": [],
                "updatedAt": "2022-10-27T16:18:39Z",
            },
            {
                "sourceId": "7bc7770269714d4a8563f8b6305adc65",
                "accountId": "123456789012",
                "createdAt": "2023-03-01T03:25:02Z",
                "type": "EKSCluster",
                "eks": {
                    "cri": "docker",
                    "deploymentKind": "DaemonSet",
                    "eksClusterArn": "arn:aws:eks:us-west-2:123456789012:cluster/eks-for-solution",
                    "eksClusterName": "eks-for-solution",
                    "eksClusterSGId": "sg-0c29109b64fba938e",
                    "endpoint": "https://6F1D58B5DDDDCE3293C52AB7F.gr7.us-west-2.eks.amazonaws.com",
                    "logAgentRoleArn": "arn:aws:iam::123456789012:role/CL-EKS-LogAgent-Role-4ca3f4308f094",
                    "oidcIssuer": "https://oidc.eks.us-west-2.amazonaws.com/id/6F1D58B5DDDDCE3293C52AB7F",
                    "subnetIds": [
                        "subnet-0591f6d40e6d4ac43",
                        "subnet-0434b33f03359705c",
                        "subnet-08c2c326cf328c6b1",
                        "subnet-0a2bcbddfeebd6495",
                    ],
                    "vpcId": "vpc-0e483d44af38007ec",
                },
                "status": "ACTIVE",
                "tags": [],
                "updatedAt": "2023-03-01T03:25:02Z",
            },
            {
                "sourceId": "d7a18244-96b4-4cf0-9806-ebe1a12315d9",
                "accountId": "123456789012",
                "createdAt": "2022-11-03T12:54:36Z",
                "ec2": {
                    "groupName": "group1103",
                    "groupType": GroupTypeEnum.EC2,
                    "groupPlatform": GroupPlatformEnum.LINUX,
                },
                "type": "EC2",
                "region": "us-west-2",
                "status": "ACTIVE",
            },
        ]
        init_table(log_source_table, data_list)

        # Mock App Log Configuration Table
        app_log_config_table_name = os.environ.get("APP_LOG_CONFIG_TABLE_NAME")
        app_log_config_table = ddb.create_table(
            TableName=app_log_config_table_name,
            KeySchema=[{"AttributeName": "id", "KeyType": "HASH"}],
            AttributeDefinitions=[{"AttributeName": "id", "AttributeType": "S"}],
            ProvisionedThroughput={"ReadCapacityUnits": 10, "WriteCapacityUnits": 10},
        )
        data_list = [
            {
                "id": "47b23378-4ec6-4584-b264-079c75ab2e5f",
                "version": 1,
                "name": "spring-boot-conf-1",
                "logType": "JSON",
                "syslogParser": "RFC5424",
                "multilineLogParser": "JAVA_SPRING_BOOT",
                "filterConfigMap": {"enabled": False, "filters": []},
                "regex": "(?<time>\\d{4}-\\d{2}-\\d{2} \\d{2}:\\d{2}:\\d{2}.\\d{3}) (?<level>\\s*[\\S]+\\s*) \\[(?<thread>\\S+)?\\] (?<logger>.+) : (?<message>[\\s\\S]+)",
                "regexFieldSpecs": [
                    {
                        "format": "%Y-%m-%d %H:%M:%S.%L",
                        "key": "time",
                        "type": "date",
                    },
                    {"key": "level", "type": "keyword"},
                    {"key": "thread", "type": "text"},
                    {"key": "logger", "type": "text"},
                    {"key": "message", "type": "text"},
                ],
                "timeKey": "time",
                "timeOffset": "-0600",
                "timeKeyRegex": "\\d{4}-\\d{2}-\\d{2} \\d{2}:\\d{2}:\\d{2}.\\d{3}",
                "userLogFormat": "%d{yyyy-MM-dd HH:mm:ss.SSS} %-5level [%thread] %logger : %msg%n",
                "userSampleLog": "2022-02-18 10:32:26.400 ERROR [http-nio-8080-exec-1] org.apache.catalina.core.ContainerBase.[Tomcat].[localhost].[/].[dispatcherServlet] : Servlet.service() for servlet [dispatcherServlet] in context with path [] threw exception [Request processing failed; nested exception is java.lang.ArithmeticException: / by zero] with root cause\njava.lang.ArithmeticException: / by zero\n   at com.springexamples.demo.web.LoggerController.logs(LoggerController.java:22)\n   at java.base/jdk.internal.reflect.NativeMethodAccessorImpl.invoke0(Native Method)\n   at java.base/jdk.internal.reflect.NativeMethodAccessorImpl.invoke",
                "status": "INACTIVE",
            },
            {
                "id": "47b23378-4ec6-4584-b264-079c75ab2e5f",
                "version": 2,
                "name": "spring-boot-conf-2",
                "logType": "JSON",
                "syslogParser": "RFC5424",
                "multilineLogParser": "JAVA_SPRING_BOOT",
                "filterConfigMap": {"enabled": True, "filters": []},
                "regex": "(?<time>\\d{4}-\\d{2}-\\d{2} \\d{2}:\\d{2}:\\d{2}.\\d{3}) (?<level>\\s*[\\S]+\\s*) \\[(?<thread>\\S+)?\\] (?<logger>.+) : (?<message>[\\s\\S]+)",
                "regexFieldSpecs": [
                    {
                        "format": "%Y-%m-%d %H:%M:%S.%L",
                        "key": "time",
                        "type": "date",
                    },
                    {"key": "level", "type": "keyword"},
                    {"key": "thread", "type": "text"},
                    {"key": "logger", "type": "text"},
                    {"key": "message", "type": "text"},
                ],
                "timeKey": "time",
                "timeOffset": "-0600",
                "timeKeyRegex": "\\d{4}-\\d{2}-\\d{2} \\d{2}:\\d{2}:\\d{2}.\\d{3}",
                "userLogFormat": "%d{yyyy-MM-dd HH:mm:ss.SSS} %-5level [%thread] %logger : %msg%n",
                "userSampleLog": "2022-02-18 10:32:26.400 ERROR [http-nio-8080-exec-1] org.apache.catalina.core.ContainerBase.[Tomcat].[localhost].[/].[dispatcherServlet] : Servlet.service() for servlet [dispatcherServlet] in context with path [] threw exception [Request processing failed; nested exception is java.lang.ArithmeticException: / by zero] with root cause\njava.lang.ArithmeticException: / by zero\n   at com.springexamples.demo.web.LoggerController.logs(LoggerController.java:22)\n   at java.base/jdk.internal.reflect.NativeMethodAccessorImpl.invoke0(Native Method)\n   at java.base/jdk.internal.reflect.NativeMethodAccessorImpl.invoke",
                "status": "ACTIVE",
            },
            {
                "id": "87b23378-4ec6-4584-b264-079c75ab2e56",
                "version": 1,
                "name": "new-spring-boot-conf",
                "logType": "JSON",
                "syslogParser": "RFC5424",
                "multilineLogParser": "JAVA_SPRING_BOOT",
                "filterConfigMap": {"enabled": True, "filters": []},
                "regex": "(?<time>\\d{4}-\\d{2}-\\d{2} \\d{2}:\\d{2}:\\d{2}.\\d{3}) (?<level>\\s*[\\S]+\\s*) \\[(?<thread>\\S+)?\\] (?<logger>.+) : (?<message>[\\s\\S]+)",
                "regexFieldSpecs": [
                    {
                        "format": "%Y-%m-%d %H:%M:%S.%L",
                        "key": "time",
                        "type": "date",
                    },
                    {"key": "level", "type": "keyword"},
                    {"key": "thread", "type": "text"},
                    {"key": "logger", "type": "text"},
                    {"key": "message", "type": "text"},
                ],
                "timeKey": "time",
                "timeOffset": "-0600",
                "timeKeyRegex": "\\d{4}-\\d{2}-\\d{2} \\d{2}:\\d{2}:\\d{2}.\\d{3}",
                "userLogFormat": "%d{yyyy-MM-dd HH:mm:ss.SSS} %-5level [%thread] %logger : %msg%n",
                "userSampleLog": "2022-02-18 10:32:26.400 ERROR [http-nio-8080-exec-1] org.apache.catalina.core.ContainerBase.[Tomcat].[localhost].[/].[dispatcherServlet] : Servlet.service() for servlet [dispatcherServlet] in context with path [] threw exception [Request processing failed; nested exception is java.lang.ArithmeticException: / by zero] with root cause\njava.lang.ArithmeticException: / by zero\n   at com.springexamples.demo.web.LoggerController.logs(LoggerController.java:22)\n   at java.base/jdk.internal.reflect.NativeMethodAccessorImpl.invoke0(Native Method)\n   at java.base/jdk.internal.reflect.NativeMethodAccessorImpl.invoke",
                "status": "INACTIVE",
            },
        ]
        init_table(app_log_config_table, data_list)

        # Mock Service Pipeline Table
        service_pipeline_table_name = os.environ.get("SERVICE_PIPELINE_TABLE_NAME")
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
                    "status": "ENABLED",
                    "emails": "your_email@example.com",
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

        # Mock app_log_ingestion Table
        app_log_ingestion_table = ddb.create_table(
            TableName=get_app_log_ingestion_table_name(),
            KeySchema=[{"AttributeName": "id", "KeyType": "HASH"}],
            AttributeDefinitions=[{"AttributeName": "id", "AttributeType": "S"}],
            ProvisionedThroughput={"ReadCapacityUnits": 10, "WriteCapacityUnits": 10},
        )
        data_list = [
            {
                "id": "62a37b50-72af-4a7b-9d4b-d859d538a19c",
                "createdAt": "2022-10-27T07:47:19Z",
                "appPipelineId": "fake-app-pipeline-id",
                "sourceId": "62a37b50-72af-4a7b-9d4b-d859d538a191",
                "accountId": "111111111111",
                "region": "us-east-1",
                "logConfig": {
                    "id": "47b23378-4ec6-4584-b264-079c75ab2e5f",
                    "version": 3,
                    "name": "spring-boot-conf-1",
                    "logType": "JSON",
                    "syslogParser": "RFC5424",
                    "multilineLogParser": "JAVA_SPRING_BOOT",
                    "filterConfigMap": {"enabled": False, "filters": []},
                    "regex": "(?<time>\\d{4}-\\d{2}-\\d{2} \\d{2}:\\d{2}:\\d{2}.\\d{3}) (?<level>\\s*[\\S]+\\s*) \\[(?<thread>\\S+)?\\] (?<logger>.+) : (?<message>[\\s\\S]+)",
                    "regexFieldSpecs": [
                        {
                            "format": "%Y-%m-%d %H:%M:%S.%L",
                            "key": "time",
                            "type": "date",
                        },
                        {"key": "level", "type": "keyword"},
                        {"key": "thread", "type": "text"},
                        {"key": "logger", "type": "text"},
                        {"key": "message", "type": "text"},
                    ],
                    "timeKey": "time",
                    "timeOffset": "-0600",
                    "timeKeyRegex": "\\d{4}-\\d{2}-\\d{2} \\d{2}:\\d{2}:\\d{2}.\\d{3}",
                    "userLogFormat": "%d{yyyy-MM-dd HH:mm:ss.SSS} %-5level [%thread] %logger : %msg%n",
                    "userSampleLog": "2022-02-18 10:32:26.400 ERROR [http-nio-8080-exec-1] org.apache.catalina.core.ContainerBase.[Tomcat].[localhost].[/].[dispatcherServlet] : Servlet.service() for servlet [dispatcherServlet] in context with path [] threw exception [Request processing failed; nested exception is java.lang.ArithmeticException: / by zero] with root cause\njava.lang.ArithmeticException: / by zero\n   at com.springexamples.demo.web.LoggerController.logs(LoggerController.java:22)\n   at java.base/jdk.internal.reflect.NativeMethodAccessorImpl.invoke0(Native Method)\n   at java.base/jdk.internal.reflect.NativeMethodAccessorImpl.invoke",
                },
                "input": {"name": "syslog"},
                "output": {
                    "name": "kinesis_streams",
                    "roleArn": "arn:XXX",
                    "roleName": "role-name",
                    "params": [
                        {"paramKey": "enableAutoScaling", "paramValue": "false"},
                        {"paramKey": "shardCount", "paramValue": "1"},
                        {"paramKey": "minCapacity", "paramValue": "1"},
                        {"paramKey": "maxCapacity", "paramValue": "5"},
                    ],
                },
                "stackId": "",
                "status": "ACTIVE",
            }
        ]
        init_table(app_log_ingestion_table, data_list)

        # Mock InstanceIngestionDetail Table
        instance_ingestion_detail_table_name = os.environ.get(
            "INSTANCE_INGESTION_DETAIL_TABLE_NAME"
        )
        ddb.create_table(
            TableName=instance_ingestion_detail_table_name,
            KeySchema=[{"AttributeName": "id", "KeyType": "HASH"}],
            AttributeDefinitions=[{"AttributeName": "id", "AttributeType": "S"}],
            ProvisionedThroughput={"ReadCapacityUnits": 5, "WriteCapacityUnits": 5},
        )

        # Mock ETLLog Table
        etl_log_table_name = os.environ.get("ETL_LOG_TABLE_NAME")
        etl_log_table = ddb.create_table(
            TableName=etl_log_table_name,
            KeySchema=[
                {"AttributeName": "executionName", "KeyType": "HASH"},
                {"AttributeName": "taskId", "KeyType": "RANGE"},
            ],
            AttributeDefinitions=[
                {"AttributeName": "executionName", "AttributeType": "S"},
                {"AttributeName": "taskId", "AttributeType": "S"},
                {"AttributeName": "pipelineIndexKey", "AttributeType": "S"},
                {"AttributeName": "startTime", "AttributeType": "S"},
            ],
            GlobalSecondaryIndexes=[
                {
                    "IndexName": "IDX_PIPELINE",
                    "KeySchema": [
                        {"AttributeName": "pipelineIndexKey", "KeyType": "HASH"},
                        {"AttributeName": "startTime", "KeyType": "RANGE"},
                    ],
                    "Projection": {
                        "ProjectionType": "INCLUDE",
                        "NonKeyAttributes": ["endTime", "status"],
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
                "status": "Succeeded",
            },
            {
                "executionName": "88652cb2-812f-4574-af3e-0094fda842d2",
                "taskId": "301ae590-6365-44cc-acc4-6ae479094672",
                "API": "Lambda: Invoke",
                "data": '{"totalSubTask": 0}',
                "endTime": "2023-10-16T03:48:36.263Z",
                "functionName": "S3ObjectScanning-WKIDdnbP5O3l",
                "parentTaskId": "00000000-0000-0000-0000-000000000000",
                "pipelineId": "3d37e69e-7129-461e-b4b8-4a8e72eb5b80",
                "pipelineIndexKey": "3d37e69e-7129-461e-b4b8-4a8e72eb5b80:LogProcessor:301ae590-6365-44cc-acc4-6ae479094672",
                "startTime": "2023-10-16T03:48:35.263Z",
                "stateMachineName": "LogProcessor-u5TUghpQChw4",
                "stateName": "Step 1: Migration S3 Objects from Staging to Archive",
                "status": "Succeeded",
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
                "status": "Succeeded",
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
                "status": "Timed_out",
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
                "status": "Aborted",
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
                "status": "Failed",
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
                "status": "Running",
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
                "status": "Running",
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
                "status": "Succeeded",
            },
            {
                "executionName": "721858f5-5c3a-4c53-aebd-5087c445af49",
                "taskId": "29b62380-b5c9-4ffa-8625-2b381f58735b",
                "API": "Lambda: Invoke",
                "data": '{"totalSubTask": 0}',
                "endTime": "2023-10-16T03:48:36.263Z",
                "functionName": "S3ObjectScanning-WKIDdnbP5O3l",
                "parentTaskId": "00000000-0000-0000-0000-000000000000",
                "pipelineId": "019cc550-ed39-48e4-997b-d476030754ec",
                "pipelineIndexKey": "019cc550-ed39-48e4-997b-d476030754ec:LogProcessor:29b62380-b5c9-4ffa-8625-2b381f58735b",
                "startTime": "2023-10-16T03:48:35.263Z",
                "stateMachineName": "LogProcessor-u5TUghpQChw4",
                "stateName": "Step 1: Migration S3 Objects from Staging to Archive",
                "status": "Succeeded",
            },
        ]
        init_table(etl_log_table, data_list)
        yield


def get_app_pipeline_table_name():
    return os.environ.get("APP_PIPELINE_TABLE_NAME")


def get_log_source_table_name():
    return os.environ.get("LOG_SOURCE_TABLE_NAME")


def get_opensearch_table_name():
    return os.environ.get("CLUSTER_TABLE")


def test_common_enum():
    assert repr(LogTypeEnum.JSON) == "JSON"


def test_regular_spec():
    with pytest.raises(ValueError, match=r"format cannot be None"):
        RegularSpec(key="time", type="date")


def test_opensearch_domain_update_status(ddb_client):
    from commonlib.dao import OpenSearchDomainDao

    dao = OpenSearchDomainDao(get_opensearch_table_name())
    assert dao.get_domain_by_id("opensearch-1").status == DomainImportStatusEnum.ACTIVE
    dao.update_status("opensearch-1", DomainImportStatusEnum.IN_PROGRESS)
    assert (
        dao.get_domain_by_id("opensearch-1").status
        == DomainImportStatusEnum.IN_PROGRESS
    )


def test_opensearch_domain_update_resources_status(ddb_client):
    from commonlib.dao import OpenSearchDomainDao

    dao = OpenSearchDomainDao(get_opensearch_table_name())
    assert dao.get_domain_by_id("opensearch-1").error == ""
    dao.update_resources_status(
        "opensearch-1",
        DomainImportStatusEnum.IMPORTED,
        [
            Resource(
                **{
                    "name": "OpenSearchSecurityGroup",
                    "status": "UPDATED",
                    "values": ["sg-0fc8398d4dc270f01"],
                }
            )
        ],
        error="this is a fake error",
    )
    assert dao.get_domain_by_id("opensearch-1").error == "this is a fake error"
    assert dao.get_domain_by_id("opensearch-1").resources == [
        Resource(
            **{
                "name": "OpenSearchSecurityGroup",
                "status": "UPDATED",
                "values": ["sg-0fc8398d4dc270f01"],
            }
        )
    ]


def test_opensearch_domain_update_alarm(ddb_client):
    from commonlib.dao import OpenSearchDomainDao

    dao = OpenSearchDomainDao(get_opensearch_table_name())
    assert dao.get_domain_by_id("opensearch-1").alarmInput is None
    dao.update_alarm(
        "opensearch-1",
        "CREATING",
        {"a": 1},
    )
    assert dao.get_domain_by_id("opensearch-1").alarmStatus == "CREATING"
    assert dao.get_domain_by_id("opensearch-1").alarmInput == {"a": 1}


def test_opensearch_domain_update_proxy(ddb_client):
    from commonlib.dao import OpenSearchDomainDao

    dao = OpenSearchDomainDao(get_opensearch_table_name())
    assert dao.get_domain_by_id("opensearch-1").proxyInput is None
    dao.update_proxy(
        "opensearch-1",
        "CREATING",
        ProxyInput(
            certificateArn="",
            cognitoEndpoint="",
            customEndpoint="",
            elbAccessLogBucketName="",
            keyName="",
            proxyInstanceNumber="",
            proxyInstanceType="",
            vpc=ProxyVpc(
                privateSubnetIds="",
                publicSubnetIds="",
                securityGroupId="",
                vpcId="",
            ),
        ),
    )
    assert dao.get_domain_by_id("opensearch-1").proxyStatus == "CREATING"
    assert dao.get_domain_by_id("opensearch-1").proxyInput == ProxyInput(
        certificateArn="",
        cognitoEndpoint="",
        customEndpoint="",
        elbAccessLogBucketName="",
        keyName="",
        proxyInstanceNumber="",
        proxyInstanceType="",
        vpc=ProxyVpc(
            privateSubnetIds="",
            publicSubnetIds="",
            securityGroupId="",
            vpcId="",
        ),
    )


def test_opensearch_domain_set_master_role_arn(ddb_client):
    from commonlib.dao import OpenSearchDomainDao

    dao = OpenSearchDomainDao(get_opensearch_table_name())
    dao.set_master_role_arn("opensearch-1", "master-role")
    lst = dao.list_domains()

    assert len(lst) == 2
    assert lst[0].id == "opensearch-1"
    assert lst[0].masterRoleArn == "master-role"


def test_opensearch_domain_get_domain_by_name(ddb_client):
    from commonlib.dao import OpenSearchDomainDao

    dao = OpenSearchDomainDao(get_opensearch_table_name())

    domain = dao.get_domain_by_name(domain_name="may24")
    assert domain.id == "opensearch-1"
    assert domain.masterRoleArn == None

    domain = dao.get_domain_by_name(domain_name="may")
    assert domain is None

    domain = dao.get_domain_by_name(domain_name="do-not-exists")
    assert domain is None


def test_opensearch_domain_list_domains(ddb_client):
    from commonlib.dao import OpenSearchDomainDao

    dao = OpenSearchDomainDao(get_opensearch_table_name())
    lst = dao.list_domains()

    assert len(lst) == 2
    assert lst[0].id == "opensearch-1"
    assert lst[0].masterRoleArn == None

    lst = dao.list_domains(Attr("status").eq(StatusEnum.INACTIVE))

    assert len(lst) == 1
    assert lst[0].id == "opensearch-2"
    assert lst[0].masterRoleArn == None


def test_log_source_model():
    with pytest.raises(ValueError):
        LogSource(type=LogSourceTypeEnum.EC2)

    with pytest.raises(ValueError):
        LogSource(type=LogSourceTypeEnum.EKSCluster)

    with pytest.raises(ValueError):
        LogSource(type=LogSourceTypeEnum.Syslog)

    with pytest.raises(ValueError):
        LogSource(type=LogSourceTypeEnum.S3)


def test_log_source_save(ddb_client):
    from commonlib.dao import LogSourceDao

    dao = LogSourceDao(get_log_source_table_name())
    s = dao.get_log_source("84c6c37e-03db-4846-bb90-93e85bb1b27b")
    dao.save(s)

    
def test_log_source_enrich_log_source(ddb_client):
    from commonlib.dao import LogSourceDao

    dao = LogSourceDao(
        get_log_source_table_name(),
        InstanceDao(os.environ.get("INSTANCE_TABLE_NAME_2")),
    )
    ls = dao.get_log_source("d7a18244-96b4-4cf0-9806-ebe1a12315d9")
    assert len(ls.ec2.instances) == 1
    assert ls.ec2.instances[0].instanceId == "i-helloworld"


def test_log_source_get_log_source(ddb_client):
    from commonlib.dao import LogSourceDao

    dao = LogSourceDao(get_log_source_table_name())
    s = dao.get_log_source("84c6c37e-03db-4846-bb90-93e85bb1b27b")

    assert s.type == LogSourceTypeEnum.Syslog
    assert s.syslog == {
        "nlbArn": "arn:aws:elasticloadbalancing:us-west-2:123456789012:loadbalancer/net/Solution-syslog-nlb/e504b1fb454aa0aa",
        "nlbDNSName": "Solution-syslog-nlb-e504b1fb454aa0aa.elb.us-west-2.amazonaws.com",
        "port": 16000,
        "protocol": "UDP",
    }

    s = dao.get_log_source("d7a18244-96b4-4cf0-9806-ebe1a12315d9")

    assert s.type == LogSourceTypeEnum.EC2

    s = dao.get_log_source("7bc7770269714d4a8563f8b6305adc65")

    assert s.type == LogSourceTypeEnum.EKSCluster
    assert s.eks == {
        "cri": "docker",
        "k8sVersion": None,
        "deploymentKind": "DaemonSet",
        "eksClusterArn": "arn:aws:eks:us-west-2:123456789012:cluster/eks-for-solution",
        "eksClusterName": "eks-for-solution",
        "eksClusterSGId": "sg-0c29109b64fba938e",
        "endpoint": "https://6F1D58B5DDDDCE3293C52AB7F.gr7.us-west-2.eks.amazonaws.com",
        "logAgentRoleArn": "arn:aws:iam::123456789012:role/CL-EKS-LogAgent-Role-4ca3f4308f094",
        "oidcIssuer": "https://oidc.eks.us-west-2.amazonaws.com/id/6F1D58B5DDDDCE3293C52AB7F",
        "subnetIds": [
            "subnet-0591f6d40e6d4ac43",
            "subnet-0434b33f03359705c",
            "subnet-08c2c326cf328c6b1",
            "subnet-0a2bcbddfeebd6495",
        ],
        "vpcId": "vpc-0e483d44af38007ec",
    }


def test_log_source_list_log_sources(ddb_client):
    from commonlib.dao import LogSourceDao

    dao = LogSourceDao(get_log_source_table_name())
    lst = dao.list_log_sources()

    assert len(lst) == 3
    

def test_get_log_source_by_name(ddb_client):
    from commonlib.dao import LogSourceDao

    dao = LogSourceDao(get_log_source_table_name())
    lst = dao.get_log_source_by_name(name="eks-for-solution", type=LogSourceTypeEnum.EKSCluster, account_id="123456789012")
    assert len(lst) == 1
    
    lst = dao.get_log_source_by_name(name="group1103", type=LogSourceTypeEnum.EC2, account_id="123456789012")
    assert len(lst) == 1
    
    lst = dao.get_log_source_by_name(name="", type=LogSourceTypeEnum.S3, account_id="123456789012")
    assert len(lst) == 0
    
    lst = dao.get_log_source_by_name(name="", type=LogSourceTypeEnum.Syslog, account_id="123456789012")
    assert len(lst) == 1
    
    
def get_log_config_table_name():
    return os.environ.get("APP_LOG_CONFIG_TABLE_NAME")


def test_list_log_configs(ddb_client):
    from commonlib.dao import LogConfigDao
    from commonlib.model import StatusEnum

    dao = LogConfigDao(get_log_config_table_name())
    pipelines = dao.list_log_configs()

    assert len(pipelines) == 1

    p = pipelines[0]

    assert p.id == "47b23378-4ec6-4584-b264-079c75ab2e5f"
    assert p.status == "ACTIVE"

    pipelines = dao.list_log_configs(Attr("status").eq(StatusEnum.DELETING))
    assert pipelines == []


def test_save_log_config(ddb_client):
    from commonlib.dao import LogConfigDao

    dao = LogConfigDao(get_log_config_table_name())
    p = dao.get_log_config("47b23378-4ec6-4584-b264-079c75ab2e5f")
    dao.save(p)


def test_get_log_config(ddb_client):
    from commonlib.dao import LogConfigDao

    dao = LogConfigDao(get_log_config_table_name())
    p = dao.get_log_config("47b23378-4ec6-4584-b264-079c75ab2e5f", version=2)

    assert p.id == "47b23378-4ec6-4584-b264-079c75ab2e5f"
    assert p.status == "ACTIVE"
    assert p.name == "spring-boot-conf-2"

    p = dao.get_log_config("47b23378-4ec6-4584-b264-079c75ab2e5f")

    assert p.id == "47b23378-4ec6-4584-b264-079c75ab2e5f"
    assert p.status == "ACTIVE"
    assert p.name == "spring-boot-conf-2"

    with pytest.raises(Exception, match=r"Can not find"):
        dao.get_log_config("not-found", version=20000)
        dao = LogConfigDao(os.environ.get("LOGCONFIG_TABLE"))
        dao.delete_log_config("47b23378-4ec6-4584-b264-079c75ab2e5f")


def test_delete_log_config(ddb_client):
    from commonlib.dao import LogConfigDao

    dao = LogConfigDao(get_log_config_table_name())
    dao.delete_log_config("47b23378-4ec6-4584-b264-079c75ab2e5f")
    pipelines = dao.list_log_configs()
    found = False
    for pipeline in pipelines:
        if pipeline.id == "47b23378-4ec6-4584-b264-079c75ab2e5f":
            found = True
            break
    assert found is False


def test_update_log_config(ddb_client):
    from commonlib.dao import LogConfigDao

    dao = LogConfigDao(get_log_config_table_name())
    current = dao.get_log_config("47b23378-4ec6-4584-b264-079c75ab2e5f", version=2)
    current.name = "new"
    dao.update_log_config(current)
    new_item = dao.get_log_config("47b23378-4ec6-4584-b264-079c75ab2e5f")
    assert new_item.version == 3


def test_get_log_config_by_config_name(ddb_client):
    from commonlib.dao import LogConfigDao

    dao = LogConfigDao(get_log_config_table_name())

    # Test case 1: Valid config_name with one match
    config_name = "spring-boot-conf-2"
    result_configs = dao.get_log_config_by_config_name(config_name)
    assert len(result_configs) == 1
    assert result_configs[0].name == config_name

    # Test case 2: Valid INACTIVE config_name
    config_name = "spring-boot-conf-1"
    result_configs = dao.get_log_config_by_config_name(config_name)
    assert len(result_configs) == 0

    # Test case 3: Non-existent config_name
    config_name = "non_existent_config"
    result_configs = dao.get_log_config_by_config_name(config_name)
    assert len(result_configs) == 0


def test_get_instances_of_source_id(ddb_client):
    from commonlib.dao import InstanceDao

    dao = InstanceDao("mocked-instance-table-name-2")
    res = dao.get_instances_of_source_id("84c6c37e-03db-4846-bb90-93e85bb1b271")

    assert res[0].id == "i-0e3c99ac76e3c0ea1"


def test_list_instances(ddb_client):
    from commonlib.dao import InstanceDao

    dao = InstanceDao("mocked-instance-table-name-2")
    assert len(dao.list_instances()) == 3


def test_get_instance(ddb_client):
    from commonlib.dao import InstanceDao

    dao = InstanceDao("mocked-instance-table-name-2")
    i = dao.get_instance("i-0e3c99ac76e3c0ea1", "84c6c37e-03db-4846-bb90-93e85bb1b271")
    assert i.id == "i-0e3c99ac76e3c0ea1"


def test_get_instance_by_instance_id(ddb_client):
    from commonlib.dao import InstanceDao

    dao = InstanceDao("mocked-instance-table-name-2")
    instances = dao.get_instance_by_instance_id("i-0e3c99ac76e3c0ea1")
    assert len(instances) == 1
    assert instances[0].id == "i-0e3c99ac76e3c0ea1"


def test_get_instance_set_by_source_id(ddb_client):
    from commonlib.dao import InstanceDao

    dao = InstanceDao("mocked-instance-table-name-2")

    res = dao.get_instance_set_by_source_id("84c6c37e-03db-4846-bb90-93e85bb1b271")
    assert res.pop() == "i-0e3c99ac76e3c0ea1"


def test_get_source_ids_by_instance_id(ddb_client):
    from commonlib.dao import InstanceDao

    dao = InstanceDao("mocked-instance-table-name-1")

    res = dao.get_source_ids_by_instance_id("i-0e3c99ac76e3c0ea1")
    assert res.pop() == "84c6c37e-03db-4846-bb90-93e85bb1b271"


def test_add_ingestion_into_instance(ddb_client):
    from commonlib.dao import InstanceDao

    dao = InstanceDao(os.environ.get("INSTANCE_TABLE_NAME_1"))

    instance = dao.add_ingestion_into_instance(
        "i-0e3c99ac76e3c0ea1", "84c6c37e-03db-4846-bb90-93e85bb1b271", "ingestionId1"
    )
    assert len(instance.ingestionIds) == 1
    instance = dao.add_ingestion_into_instance(
        "i-0e3c99ac76e3c0ea1", "84c6c37e-03db-4846-bb90-93e85bb1b271", "ingestionId2"
    )
    assert len(instance.ingestionIds) == 2


def test_remove_ingestion_from_instance(ddb_client):
    from commonlib.dao import InstanceDao

    dao = InstanceDao(os.environ.get("INSTANCE_TABLE_NAME_1"))
    dao.add_ingestion_into_instance(
        "i-0e3c99ac76e3c0ea1", "84c6c37e-03db-4846-bb90-93e85bb1b271", "ingestionId1"
    )

    dao.add_ingestion_into_instance(
        "i-0e3c99ac76e3c0ea1", "84c6c37e-03db-4846-bb90-93e85bb1b271", "ingestionId2"
    )

    instance = dao.remove_ingestion_from_instance(
        "i-0e3c99ac76e3c0ea1", "84c6c37e-03db-4846-bb90-93e85bb1b271", "ingestionId1"
    )
    assert len(instance.ingestionIds) == 1

    assert instance.ingestionIds.pop() == "ingestionId2"


def test_str():
    case_name = "testAdvanceRepayRequest"
    newstr = re.sub("[A-Z]", lambda x: "_" + x.group(0).lower(), case_name)
    print(newstr)


def test_validate_duplicated_index_prefix(ddb_client):
    from commonlib.dao import AppPipelineDao

    dao = AppPipelineDao(os.environ.get("APP_PIPELINE_TABLE_NAME"))
    p = AppPipeline(
        indexPrefix="syslog-dev-03",
        aosParams=AOSParams(
            **{
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
            }
        ),
        logConfigId="00000000",
        logConfigVersionNumber=0,
        monitor=MonitorDetail(
            **{
                "status": "ENABLED",
                "backupBucketName": "xxxxx",
                "errorLogPrefix": "xxxxxx",
            }
        ),
    )

    with pytest.raises(APIException, match=r"DUPLICATED_INDEX_PREFIX"):
        dao.validate_duplicated_index_prefix(
            index_prefix=p.indexPrefix or p.aosParams.indexPrefix,
            domain_name=p.aosParams.domainName,
            force=False,
        )

    dao.validate_duplicated_index_prefix(
        index_prefix=p.indexPrefix or p.aosParams.indexPrefix,
        domain_name=p.aosParams.domainName,
        force=True,
    )

    p.indexPrefix = "syslog-dev-04"
    p.aosParams.indexPrefix = "syslog-dev-04"

    with pytest.raises(APIException, match=r"DUPLICATED_WITH_INACTIVE_INDEX_PREFIX"):
        dao.validate_duplicated_index_prefix(
            index_prefix=p.indexPrefix or p.aosParams.indexPrefix,
            domain_name=p.aosParams.domainName,
            force=False,
        )

    dao.validate_duplicated_index_prefix(
        index_prefix=p.indexPrefix or p.aosParams.indexPrefix,
        domain_name=p.aosParams.domainName,
        force=True,
    )


def test_validate_index_prefix_overlap(ddb_client):
    from commonlib.dao import AppPipelineDao

    dao = AppPipelineDao(os.environ.get("APP_PIPELINE_TABLE_NAME"))
    p = AppPipeline(
        indexPrefix="syslog-dev-03-overlap",
        aosParams=AOSParams(
            **{
                "coldLogTransition": 0,
                "domainName": "solution-os",
                "engine": "OpenSearch",
                "failedLogBucket": "solution-solutionloggingbucket0fa53b76-12cw0hl0kfnk6",
                "indexPrefix": "syslog-dev-overlap",
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
            }
        ),
        logConfigId="00000000",
        logConfigVersionNumber=0,
        monitor=MonitorDetail(
            **{
                "status": "ENABLED",
                "backupBucketName": "xxxxx",
                "errorLogPrefix": "xxxxxx",
            }
        ),
    )

    with pytest.raises(APIException, match=r"OVERLAP_INDEX_PREFIX"):
        dao.validate_index_prefix_overlap(
            index_prefix=p.indexPrefix or p.aosParams.indexPrefix,
            domain_name=p.aosParams.domainName,
        )

    with pytest.raises(APIException, match=r"OVERLAP_INDEX_PREFIX"):
        dao.validate_index_prefix_overlap(
            index_prefix=p.indexPrefix or p.aosParams.indexPrefix,
            domain_name=p.aosParams.domainName,
        )

    p.indexPrefix = "syslog-dev-04-overlap"
    p.aosParams.indexPrefix = "syslog-dev-04-overlap"

    with pytest.raises(APIException, match=r"OVERLAP_WITH_INACTIVE_INDEX_PREFIX"):
        dao.validate_index_prefix_overlap(
            index_prefix=p.indexPrefix or p.aosParams.indexPrefix,
            domain_name=p.aosParams.domainName,
        )

    with pytest.raises(APIException, match=r"OVERLAP_WITH_INACTIVE_INDEX_PREFIX"):
        dao.validate_index_prefix_overlap(
            index_prefix=p.indexPrefix or p.aosParams.indexPrefix,
            domain_name=p.aosParams.domainName,
        )

    p.indexPrefix = "syslog-dev-04"
    p.aosParams.indexPrefix = "syslog-dev-04"

    # duplicate is not overlap
    dao.validate_index_prefix_overlap(
        index_prefix=p.indexPrefix or p.aosParams.indexPrefix,
        domain_name=p.aosParams.domainName,
    )


def test_app_pipeline_dao_list_app_pipelines(ddb_client):
    from commonlib.dao import AppPipelineDao, StatusEnum

    dao = AppPipelineDao(os.environ.get("APP_PIPELINE_TABLE_NAME"))
    pipelines = dao.list_app_pipelines()

    assert len(pipelines) == 2

    p = pipelines[0]

    # fmt: off
    assert p.pipelineId == "62a37b50-72af-4a7b-9d4b-d859d538a19c"
    assert p.bufferAccessRoleArn == "arn:aws:iam::123456789012:role/Solution-AppPipe-62a37-BufferAccessRoleDF53FD85-4BU06LEOL8JH"
    assert p.bufferAccessRoleName == "Solution-AppPipe-62a37-BufferAccessRoleDF53FD85-4BU06LEOL8JH"
    assert p.bufferResourceArn == "arn:aws:kinesis:us-west-2:123456789012:stream/Solution-AppPipe-62a37-KDSBufferStream21B531A6-xhE79t2qh4um"
    assert p.stackId == "arn:aws:cloudformation:us-west-2:123456789012:stack/Solution-AppPipe-62a37/96ea1a40-55cb-11ed-868d-0a1261729f93"
    assert p.bufferParams == [
        {"paramKey": "enableAutoScaling", "paramValue": "false"},
        {"paramKey": "shardCount", "paramValue": "1"},
        {"paramKey": "minCapacity", "paramValue": "1"},
        {"paramKey": "maxCapacity", "paramValue": "5"},
    ]
    assert p.bufferType == "KDS"
    assert p.status == "ACTIVE"
    # fmt: on

    pipelines = dao.list_app_pipelines(Attr("status").eq(StatusEnum.ERROR))
    assert pipelines == []


def test_get_buffer_params(ddb_client):
    from commonlib.dao import (
        AppPipelineDao,
        StatusEnum,
        AppPipeline,
        BufferTypeEnum,
        LogConfig,
        LogTypeEnum,
    )
    from commonlib.model import (
        LightEngineParams,
        MonitorDetail,
        EngineType,
        LogStructure,
        PipelineMonitorStatus,
    )

    log_conf = LogConfig(
        version=1,
        name="json",
        logType=LogTypeEnum.JSON,
        regex="",
        jsonSchema={},
        regexFieldSpecs=[],
        timeKey="",
        timeOffset="",
        timeKeyRegex="",
        userLogFormat="",
        userSampleLog="",
    )
    app_pipeline = AppPipeline(
        bufferType=BufferTypeEnum.S3,
        bufferAccessRoleArn="",
        bufferAccessRoleName="",
        bufferResourceArn="",
        bufferResourceName="",
        bufferParams=[
            BufferParam(paramKey="logBucketBucket", paramValue="centralized-bucket"),
            BufferParam(
                paramKey="logBucketPrefix", paramValue="/LightEngine/AppLogs/test/"
            ),
        ],
        lightEngineParams=LightEngineParams(
            stagingBucketPrefix="awslogs",
            centralizedBucketName="centralized-bucket",
            centralizedBucketPrefix="datalake",
            centralizedTableName="test",
            centralizedMetricsTableName="",
            logProcessorSchedule="rate(5 minutes)",
            logMergerSchedule="cron(0 1 * * ? *)",
            logArchiveSchedule="cron(0 2 * * ? *)",
            logMergerAge="1",
            logArchiveAge="7",
            importDashboards="false",
            grafanaId="",
            recipients="",
        ),
        logConfigId=log_conf.id,
        logConfigVersionNumber=log_conf.version,
        monitor=MonitorDetail(status=PipelineMonitorStatus.DISABLED),
        engineType=EngineType.LIGHT_ENGINE,
        logStructure=LogStructure.FLUENT_BIT_PARSED_JSON,
        stackId="arn:aws:cloudformation:us-east-1:123456789012:stack/CL-AppPipe-c2d565b0/b2e8c620-8a8f-11ee-8d27-0e7ce14c05f5",
    )

    dao = AppPipelineDao(app_pipeline.pipelineId)
    params = dao.get_buffer_params(app_pipeline=app_pipeline)
    assert params == [
        BufferParam(paramKey="logBucketBucket", paramValue="centralized-bucket"),
        BufferParam(
            paramKey="logBucketPrefix",
            paramValue=f"LightEngine/AppLogs/test/year=%Y/month=%m/day=%d",
        ),
    ]

    app_pipeline = AppPipeline(
        bufferType=BufferTypeEnum.S3,
        bufferAccessRoleArn="",
        bufferAccessRoleName="",
        bufferResourceArn="",
        bufferResourceName="",
        bufferParams=[
            BufferParam(paramKey="logBucketBucket", paramValue="centralized-bucket"),
            BufferParam(
                paramKey="logBucketPrefix",
                paramValue="AppLogs/test/year=%Y/month=%d/day=%d/",
            ),
        ],
        lightEngineParams=LightEngineParams(
            stagingBucketPrefix="awslogs",
            centralizedBucketName="centralized-bucket",
            centralizedBucketPrefix="datalake",
            centralizedTableName="test",
            centralizedMetricsTableName="",
            logProcessorSchedule="rate(5 minutes)",
            logMergerSchedule="cron(0 1 * * ? *)",
            logArchiveSchedule="cron(0 2 * * ? *)",
            logMergerAge="1",
            logArchiveAge="7",
            importDashboards="false",
            grafanaId="",
            recipients="",
        ),
        logConfigId=log_conf.id,
        logConfigVersionNumber=log_conf.version,
        monitor=MonitorDetail(status=PipelineMonitorStatus.DISABLED),
        engineType=EngineType.OPEN_SEARCH,
        logStructure=LogStructure.FLUENT_BIT_PARSED_JSON,
    )

    dao = AppPipelineDao(app_pipeline.pipelineId)
    params = dao.get_buffer_params(app_pipeline=app_pipeline)
    assert params == [
        BufferParam(paramKey="logBucketBucket", paramValue="centralized-bucket"),
        BufferParam(
            paramKey="logBucketPrefix",
            paramValue="AppLogs/test/year=%Y/month=%d/day=%d/",
        ),
    ]


def test_app_pipeline_dao_get_light_engine_stack_parameters(ddb_client):
    from commonlib.dao import (
        AppPipelineDao,
        StatusEnum,
        AppPipeline,
        BufferTypeEnum,
        LogConfig,
        LogTypeEnum,
    )
    from commonlib.model import (
        LightEngineParams,
        MonitorDetail,
        EngineType,
        LogStructure,
        PipelineMonitorStatus,
    )

    log_conf = LogConfig(
        version=1,
        name="json",
        logType=LogTypeEnum.JSON,
        regex="",
        jsonSchema={},
        regexFieldSpecs=[],
        timeKey="",
        timeOffset="",
        timeKeyRegex="",
        userLogFormat="",
        userSampleLog="",
    )
    app_pipeline = AppPipeline(
        bufferType=BufferTypeEnum.S3,
        bufferAccessRoleArn="",
        bufferAccessRoleName="",
        bufferResourceArn="",
        bufferResourceName="",
        bufferParams=[],
        lightEngineParams=LightEngineParams(
            stagingBucketPrefix="awslogs",
            centralizedBucketName="centralized-bucket",
            centralizedBucketPrefix="datalake",
            centralizedTableName="test",
            centralizedMetricsTableName="",
            logProcessorSchedule="rate(5 minutes)",
            logMergerSchedule="cron(0 1 * * ? *)",
            logArchiveSchedule="cron(0 2 * * ? *)",
            logMergerAge="1",
            logArchiveAge="7",
            importDashboards="false",
            grafanaId="",
            recipients="",
        ),
        logConfigId=log_conf.id,
        logConfigVersionNumber=log_conf.version,
        monitor=MonitorDetail(status=PipelineMonitorStatus.DISABLED),
        engineType=EngineType.LIGHT_ENGINE,
        logStructure=LogStructure.FLUENT_BIT_PARSED_JSON,
    )

    dao = AppPipelineDao(app_pipeline.pipelineId)
    params = dao.get_light_engine_stack_parameters(
        app_pipeline=app_pipeline,
        log_config=log_conf,
        grafana={"url": "http://127.0.0.1:3000", "token": "glsa_xxx"},
    )

    assert params == [
        {"ParameterKey": "stagingBucketPrefix", "ParameterValue": "awslogs"},
        {
            "ParameterKey": "centralizedBucketName",
            "ParameterValue": "centralized-bucket",
        },
        {"ParameterKey": "centralizedBucketPrefix", "ParameterValue": "datalake"},
        {"ParameterKey": "centralizedTableName", "ParameterValue": "test"},
        {"ParameterKey": "centralizedMetricsTableName", "ParameterValue": ""},
        {"ParameterKey": "logProcessorSchedule", "ParameterValue": "rate(5 minutes)"},
        {"ParameterKey": "logMergerSchedule", "ParameterValue": "cron(0 1 * * ? *)"},
        {"ParameterKey": "logArchiveSchedule", "ParameterValue": "cron(0 2 * * ? *)"},
        {"ParameterKey": "logMergerAge", "ParameterValue": "1"},
        {"ParameterKey": "logArchiveAge", "ParameterValue": "7"},
        {"ParameterKey": "importDashboards", "ParameterValue": "false"},
        {"ParameterKey": "recipients", "ParameterValue": ""},
        {"ParameterKey": "sourceSchema", "ParameterValue": "{}"},
        {"ParameterKey": "pipelineId", "ParameterValue": app_pipeline.pipelineId},
        {"ParameterKey": "grafanaUrl", "ParameterValue": "http://127.0.0.1:3000"},
        {"ParameterKey": "grafanaToken", "ParameterValue": "glsa_xxx"},
    ]

    assert params == [
        {"ParameterKey": "stagingBucketPrefix", "ParameterValue": "awslogs"},
        {
            "ParameterKey": "centralizedBucketName",
            "ParameterValue": "centralized-bucket",
        },
        {"ParameterKey": "centralizedBucketPrefix", "ParameterValue": "datalake"},
        {"ParameterKey": "centralizedTableName", "ParameterValue": "test"},
        {"ParameterKey": "centralizedMetricsTableName", "ParameterValue": ""},
        {"ParameterKey": "logProcessorSchedule", "ParameterValue": "rate(5 minutes)"},
        {"ParameterKey": "logMergerSchedule", "ParameterValue": "cron(0 1 * * ? *)"},
        {"ParameterKey": "logArchiveSchedule", "ParameterValue": "cron(0 2 * * ? *)"},
        {"ParameterKey": "logMergerAge", "ParameterValue": "1"},
        {"ParameterKey": "logArchiveAge", "ParameterValue": "7"},
        {"ParameterKey": "importDashboards", "ParameterValue": "false"},
        {"ParameterKey": "recipients", "ParameterValue": ""},
        {"ParameterKey": "sourceSchema", "ParameterValue": "{}"},
        {"ParameterKey": "pipelineId", "ParameterValue": app_pipeline.pipelineId},
        {"ParameterKey": "grafanaUrl", "ParameterValue": "http://127.0.0.1:3000"},
        {"ParameterKey": "grafanaToken", "ParameterValue": "glsa_xxx"},
    ]

    log_conf = LogConfig(
        version=1,
        name="json",
        logType=LogTypeEnum.JSON,
        regex="",
        jsonSchema={},
        regexFieldSpecs=[],
        timeKey="",
        timeOffset="",
        timeKeyRegex="",
        userLogFormat="",
        userSampleLog="",
    )
    app_pipeline = AppPipeline(
        bufferType=BufferTypeEnum.S3,
        bufferAccessRoleArn="",
        bufferAccessRoleName="",
        bufferResourceArn="",
        bufferResourceName="",
        bufferParams=[],
        lightEngineParams=LightEngineParams(
            stagingBucketPrefix="awslogs",
            centralizedBucketName="centralized-bucket",
            centralizedBucketPrefix="datalake",
            centralizedTableName="test",
            centralizedMetricsTableName="",
            logProcessorSchedule="rate(5 minutes)",
            logMergerSchedule="cron(0 1 * * ? *)",
            logArchiveSchedule="cron(0 2 * * ? *)",
            logMergerAge="1",
            logArchiveAge="7",
            importDashboards="false",
            grafanaId="",
            recipients="",
        ),
        logConfigId=log_conf.id,
        logConfigVersionNumber=log_conf.version,
        monitor=MonitorDetail(status=PipelineMonitorStatus.DISABLED),
        engineType=EngineType.LIGHT_ENGINE,
        logStructure=LogStructure.RAW,
    )

    dao = AppPipelineDao(app_pipeline.pipelineId)
    params = dao.get_light_engine_stack_parameters(
        app_pipeline=app_pipeline,
        log_config=log_conf,
        grafana={"url": "http://127.0.0.1:3000", "token": "glsa_xxx"},
    )

    assert params == [
        {"ParameterKey": "stagingBucketPrefix", "ParameterValue": "awslogs"},
        {
            "ParameterKey": "centralizedBucketName",
            "ParameterValue": "centralized-bucket",
        },
        {"ParameterKey": "centralizedBucketPrefix", "ParameterValue": "datalake"},
        {"ParameterKey": "centralizedTableName", "ParameterValue": "test"},
        {"ParameterKey": "centralizedMetricsTableName", "ParameterValue": ""},
        {"ParameterKey": "logProcessorSchedule", "ParameterValue": "rate(5 minutes)"},
        {"ParameterKey": "logMergerSchedule", "ParameterValue": "cron(0 1 * * ? *)"},
        {"ParameterKey": "logArchiveSchedule", "ParameterValue": "cron(0 2 * * ? *)"},
        {"ParameterKey": "logMergerAge", "ParameterValue": "1"},
        {"ParameterKey": "logArchiveAge", "ParameterValue": "7"},
        {"ParameterKey": "importDashboards", "ParameterValue": "false"},
        {"ParameterKey": "recipients", "ParameterValue": ""},
        {"ParameterKey": "sourceSchema", "ParameterValue": "{}"},
        {"ParameterKey": "pipelineId", "ParameterValue": app_pipeline.pipelineId},
        {"ParameterKey": "grafanaUrl", "ParameterValue": "http://127.0.0.1:3000"},
        {"ParameterKey": "grafanaToken", "ParameterValue": "glsa_xxx"},
        {"ParameterKey": "sourceDataFormat", "ParameterValue": "Json"},
    ]

    assert params == [
        {"ParameterKey": "stagingBucketPrefix", "ParameterValue": "awslogs"},
        {
            "ParameterKey": "centralizedBucketName",
            "ParameterValue": "centralized-bucket",
        },
        {"ParameterKey": "centralizedBucketPrefix", "ParameterValue": "datalake"},
        {"ParameterKey": "centralizedTableName", "ParameterValue": "test"},
        {"ParameterKey": "centralizedMetricsTableName", "ParameterValue": ""},
        {"ParameterKey": "logProcessorSchedule", "ParameterValue": "rate(5 minutes)"},
        {"ParameterKey": "logMergerSchedule", "ParameterValue": "cron(0 1 * * ? *)"},
        {"ParameterKey": "logArchiveSchedule", "ParameterValue": "cron(0 2 * * ? *)"},
        {"ParameterKey": "logMergerAge", "ParameterValue": "1"},
        {"ParameterKey": "logArchiveAge", "ParameterValue": "7"},
        {"ParameterKey": "importDashboards", "ParameterValue": "false"},
        {"ParameterKey": "recipients", "ParameterValue": ""},
        {"ParameterKey": "sourceSchema", "ParameterValue": "{}"},
        {"ParameterKey": "pipelineId", "ParameterValue": app_pipeline.pipelineId},
        {"ParameterKey": "grafanaUrl", "ParameterValue": "http://127.0.0.1:3000"},
        {"ParameterKey": "grafanaToken", "ParameterValue": "glsa_xxx"},
        {"ParameterKey": "sourceDataFormat", "ParameterValue": "Json"},
    ]

    log_conf = LogConfig(
        version=1,
        name="singlelinetext",
        logType=LogTypeEnum.SINGLELINE_TEXT,
        regex="(?<time>\\d{4}-\\d{2}-\\d{2} \\d{2}:\\d{2}:\\d{2}.\\d{3}) (?<level>\\s*[\\S]+\\s*) \\[(?<thread>\\S+)?\\] (?<logger>.+) : (?<message>[\\s\\S]+)",
        jsonSchema={},
        regexFieldSpecs=[],
        timeKey="",
        timeOffset="",
        timeKeyRegex="",
        userLogFormat="",
        userSampleLog="",
    )
    app_pipeline = AppPipeline(
        bufferType=BufferTypeEnum.S3,
        bufferAccessRoleArn="",
        bufferAccessRoleName="",
        bufferResourceArn="",
        bufferResourceName="",
        bufferParams=[],
        lightEngineParams=LightEngineParams(
            stagingBucketPrefix="awslogs",
            centralizedBucketName="centralized-bucket",
            centralizedBucketPrefix="datalake",
            centralizedTableName="test",
            centralizedMetricsTableName="",
            logProcessorSchedule="rate(5 minutes)",
            logMergerSchedule="cron(0 1 * * ? *)",
            logArchiveSchedule="cron(0 2 * * ? *)",
            logMergerAge="1",
            logArchiveAge="7",
            importDashboards="false",
            grafanaId="",
            recipients="",
        ),
        logConfigId=log_conf.id,
        logConfigVersionNumber=log_conf.version,
        monitor=MonitorDetail(status=PipelineMonitorStatus.DISABLED),
        engineType=EngineType.LIGHT_ENGINE,
        logStructure=LogStructure.FLUENT_BIT_PARSED_JSON,
    )

    dao = AppPipelineDao(app_pipeline.pipelineId)
    params = dao.get_light_engine_stack_parameters(
        app_pipeline=app_pipeline, log_config=log_conf
    )
    assert params == [
        {"ParameterKey": "stagingBucketPrefix", "ParameterValue": "awslogs"},
        {
            "ParameterKey": "centralizedBucketName",
            "ParameterValue": "centralized-bucket",
        },
        {"ParameterKey": "centralizedBucketPrefix", "ParameterValue": "datalake"},
        {"ParameterKey": "centralizedTableName", "ParameterValue": "test"},
        {"ParameterKey": "centralizedMetricsTableName", "ParameterValue": ""},
        {"ParameterKey": "logProcessorSchedule", "ParameterValue": "rate(5 minutes)"},
        {"ParameterKey": "logMergerSchedule", "ParameterValue": "cron(0 1 * * ? *)"},
        {"ParameterKey": "logArchiveSchedule", "ParameterValue": "cron(0 2 * * ? *)"},
        {"ParameterKey": "logMergerAge", "ParameterValue": "1"},
        {"ParameterKey": "logArchiveAge", "ParameterValue": "7"},
        {"ParameterKey": "importDashboards", "ParameterValue": "false"},
        {"ParameterKey": "recipients", "ParameterValue": ""},
        {"ParameterKey": "sourceSchema", "ParameterValue": "{}"},
        {"ParameterKey": "pipelineId", "ParameterValue": app_pipeline.pipelineId},
    ]

    log_conf = LogConfig(
        version=1,
        name="singlelinetext",
        logType=LogTypeEnum.SINGLELINE_TEXT,
        regex="(?<time>\\d{4}-\\d{2}-\\d{2} \\d{2}:\\d{2}:\\d{2}.\\d{3}) (?<level>\\s*[\\S]+\\s*) \\[(?<thread>\\S+)?\\] (?<logger>.+) : (?<message>[\\s\\S]+)",
        jsonSchema={},
        regexFieldSpecs=[],
        timeKey="",
        timeOffset="",
        timeKeyRegex="",
        userLogFormat="",
        userSampleLog="",
    )
    app_pipeline = AppPipeline(
        bufferType=BufferTypeEnum.S3,
        bufferAccessRoleArn="",
        bufferAccessRoleName="",
        bufferResourceArn="",
        bufferResourceName="",
        bufferParams=[],
        lightEngineParams=LightEngineParams(
            stagingBucketPrefix="awslogs",
            centralizedBucketName="centralized-bucket",
            centralizedBucketPrefix="datalake",
            centralizedTableName="test",
            centralizedMetricsTableName="",
            logProcessorSchedule="rate(5 minutes)",
            logMergerSchedule="cron(0 1 * * ? *)",
            logArchiveSchedule="cron(0 2 * * ? *)",
            logMergerAge="1",
            logArchiveAge="7",
            importDashboards="false",
            grafanaId="",
            recipients="",
        ),
        logConfigId=log_conf.id,
        logConfigVersionNumber=log_conf.version,
        monitor=MonitorDetail(status=PipelineMonitorStatus.DISABLED),
        engineType=EngineType.LIGHT_ENGINE,
        logStructure=LogStructure.RAW,
    )

    dao = AppPipelineDao(app_pipeline.pipelineId)
    params = dao.get_light_engine_stack_parameters(
        app_pipeline=app_pipeline, log_config=log_conf
    )
    assert params == [
        {"ParameterKey": "stagingBucketPrefix", "ParameterValue": "awslogs"},
        {
            "ParameterKey": "centralizedBucketName",
            "ParameterValue": "centralized-bucket",
        },
        {"ParameterKey": "centralizedBucketPrefix", "ParameterValue": "datalake"},
        {"ParameterKey": "centralizedTableName", "ParameterValue": "test"},
        {"ParameterKey": "centralizedMetricsTableName", "ParameterValue": ""},
        {"ParameterKey": "logProcessorSchedule", "ParameterValue": "rate(5 minutes)"},
        {"ParameterKey": "logMergerSchedule", "ParameterValue": "cron(0 1 * * ? *)"},
        {"ParameterKey": "logArchiveSchedule", "ParameterValue": "cron(0 2 * * ? *)"},
        {"ParameterKey": "logMergerAge", "ParameterValue": "1"},
        {"ParameterKey": "logArchiveAge", "ParameterValue": "7"},
        {"ParameterKey": "importDashboards", "ParameterValue": "false"},
        {"ParameterKey": "recipients", "ParameterValue": ""},
        {"ParameterKey": "sourceSchema", "ParameterValue": "{}"},
        {"ParameterKey": "pipelineId", "ParameterValue": app_pipeline.pipelineId},
        {"ParameterKey": "sourceDataFormat", "ParameterValue": "Regex"},
        {
            "ParameterKey": "sourceTableProperties",
            "ParameterValue": '{"skip.header.line.count": "0"}',
        },
        {
            "ParameterKey": "sourceSerializationProperties",
            "ParameterValue": '{"input.regex": "(?<time>\\\\d{4}-\\\\d{2}-\\\\d{2} \\\\d{2}:\\\\d{2}:\\\\d{2}.\\\\d{3}) (?<level>\\\\s*[\\\\S]+\\\\s*) \\\\[(?<thread>\\\\S+)?\\\\] (?<logger>.+) : (?<message>[\\\\s\\\\S]+)"}',
        },
    ]

    json_schema = {
        "type": "object",
        "properties": {
            "pri": {"type": "string"},
            "future_use_1": {"type": "string"},
            "receive_time": {
                "type": "timestamp",
                "timeKey": True,
                "format": "yyyy-MM-dd''T''HH:mm:ss.SSSSSSSSSZ",
            },
            "serial": {"type": "string"},
            "type": {"type": "string"},
            "subtype": {"type": "string"},
            "future_use_2": {"type": "string"},
            "time_generated": {"type": "string"},
            "src": {"type": "string"},
            "dst": {"type": "string"},
            "natsrc": {"type": "string"},
            "natdst": {"type": "string"},
            "rule": {"type": "string"},
            "srcuser": {"type": "string"},
            "dstuser": {"type": "string"},
            "app": {"type": "string"},
            "vsys": {"type": "string"},
            "from": {"type": "string"},
            "to": {"type": "string"},
            "inbound_if": {"type": "string"},
            "outbound_if": {"type": "string"},
            "logset": {"type": "string"},
            "future_use_3": {"type": "string"},
            "sessionid": {"type": "string"},
            "repeatcnt": {"type": "string"},
            "sport": {"type": "string"},
            "dport": {"type": "string"},
            "natsport": {"type": "string"},
            "natdport": {"type": "string"},
            "flags": {"type": "string"},
            "proto": {"type": "string"},
            "action": {"type": "string"},
            "misc": {"type": "string"},
            "threatid": {"type": "string"},
            "category": {"type": "string"},
            "severity": {"type": "string"},
            "direction": {"type": "string"},
            "seqno": {"type": "string"},
            "actionflags": {"type": "string"},
            "srcloc": {"type": "string"},
            "dstloc": {"type": "string"},
            "future_use_4": {"type": "string"},
            "contenttype": {"type": "string"},
            "pcap_id": {"type": "string"},
            "filedigest": {"type": "string"},
            "cloud": {"type": "string"},
            "url_idx": {"type": "string"},
            "user_agent": {"type": "string"},
            "filetype": {"type": "string"},
            "xff": {"type": "string"},
            "referer": {"type": "string"},
            "sender": {"type": "string"},
            "subject": {"type": "string"},
            "recipient": {"type": "string"},
            "reportid": {"type": "string"},
            "dg_hier_level_1": {"type": "string"},
            "dg_hier_level_2": {"type": "string"},
            "dg_hier_level_3": {"type": "string"},
            "dg_hier_level_4": {"type": "string"},
            "vsys_name": {"type": "string"},
            "device_name": {"type": "string"},
            "future_use_5": {"type": "string"},
            "src_uuid": {"type": "string"},
            "dst_uuid": {"type": "string"},
            "http_method": {"type": "string"},
            "tunnelid_or_imsi": {"type": "string"},
            "monitortag_or_imei": {"type": "string"},
            "parent_session_id": {"type": "string"},
            "parent_start_time": {"type": "string"},
            "tunnel": {"type": "string"},
            "thr_category": {"type": "string"},
            "future_use_6": {"type": "string"},
            "contentver": {"type": "string"},
            "assoc_id": {"type": "string"},
            "chunks": {"type": "string"},
            "ppid": {"type": "string"},
            "http_headers": {"type": "string"},
            "url_category_list": {"type": "string"},
            "rule_uuid": {"type": "string"},
            "http2_connection": {"type": "string"},
            "dynusergroup_name": {"type": "string"},
            "xff_ip": {"type": "string"},
            "src_category": {"type": "string"},
            "src_profile": {"type": "string"},
            "src_model": {"type": "string"},
            "src_vendor": {"type": "string"},
            "src_osfamily": {"type": "string"},
            "src_osversion": {"type": "string"},
            "src_host": {"type": "string"},
            "src_mac": {"type": "string"},
            "dst_category": {"type": "string"},
            "dst_profile": {"type": "string"},
            "dst_model": {"type": "string"},
            "dst_vendor": {"type": "string"},
            "dst_osfamily": {"type": "string"},
            "dst_osversion": {"type": "string"},
            "dst_host": {"type": "string"},
            "dst_mac": {"type": "string"},
            "container_id": {"type": "string"},
            "pod_namespace": {"type": "string"},
            "pod_name": {"type": "string"},
            "src_edl": {"type": "string"},
            "dst_edl": {"type": "string"},
            "hostid": {"type": "string"},
            "serialnumber": {"type": "string"},
            "src_dag": {"type": "string"},
            "dst_dag": {"type": "string"},
            "partial_hash": {"type": "string"},
            "high_res_timestamp": {"type": "string"},
            "reason": {"type": "string"},
            "justification": {"type": "string"},
            "nssai_sst": {"type": "string"},
            "subcategory_of_app": {"type": "string"},
            "category_of_app": {"type": "string"},
            "technology_of_app": {"type": "string"},
            "risk_of_app": {"type": "string"},
            "characteristic_of_app": {"type": "string"},
            "container_of_app": {"type": "string"},
            "tunneled_app": {"type": "string"},
            "is_saas_of_app": {"type": "string"},
            "sanctioned_state_of_app": {"type": "string"},
        },
    }
    log_conf = LogConfig(
        version=1,
        name="singlelinetext",
        logType=LogTypeEnum.SINGLELINE_TEXT,
        regex=json.dumps(json_schema),
        jsonSchema=json_schema,
        regexFieldSpecs=[],
        timeKey="",
        timeOffset="",
        timeKeyRegex="",
        userLogFormat="",
        userSampleLog="",
    )
    app_pipeline = AppPipeline(
        bufferType=BufferTypeEnum.S3,
        bufferAccessRoleArn="",
        bufferAccessRoleName="",
        bufferResourceArn="",
        bufferResourceName="",
        bufferParams=[
            BufferParam(
                paramKey="skip.header.line.count", paramValue=json.dumps(json_schema)
            )
        ],
        lightEngineParams=LightEngineParams(
            stagingBucketPrefix="awslogs",
            centralizedBucketName="centralized-bucket",
            centralizedBucketPrefix="datalake",
            centralizedTableName="test",
            centralizedMetricsTableName="",
            logProcessorSchedule="rate(5 minutes)",
            logMergerSchedule="cron(0 1 * * ? *)",
            logArchiveSchedule="cron(0 2 * * ? *)",
            logMergerAge="1",
            logArchiveAge="7",
            importDashboards="false",
            grafanaId="",
            recipients="",
        ),
        logConfigId=log_conf.id,
        logConfigVersionNumber=log_conf.version,
        monitor=MonitorDetail(status=PipelineMonitorStatus.DISABLED),
        engineType=EngineType.LIGHT_ENGINE,
        logStructure=LogStructure.RAW,
    )

    dao = AppPipelineDao(app_pipeline.pipelineId)
    params = dao.get_light_engine_stack_parameters(
        app_pipeline=app_pipeline, log_config=log_conf
    )
    assert params == [
        {"ParameterKey": "stagingBucketPrefix", "ParameterValue": "awslogs"},
        {
            "ParameterKey": "centralizedBucketName",
            "ParameterValue": "centralized-bucket",
        },
        {"ParameterKey": "centralizedBucketPrefix", "ParameterValue": "datalake"},
        {"ParameterKey": "centralizedTableName", "ParameterValue": "test"},
        {"ParameterKey": "centralizedMetricsTableName", "ParameterValue": ""},
        {"ParameterKey": "logProcessorSchedule", "ParameterValue": "rate(5 minutes)"},
        {"ParameterKey": "logMergerSchedule", "ParameterValue": "cron(0 1 * * ? *)"},
        {"ParameterKey": "logArchiveSchedule", "ParameterValue": "cron(0 2 * * ? *)"},
        {"ParameterKey": "logMergerAge", "ParameterValue": "1"},
        {"ParameterKey": "logArchiveAge", "ParameterValue": "7"},
        {"ParameterKey": "importDashboards", "ParameterValue": "false"},
        {"ParameterKey": "recipients", "ParameterValue": ""},
        {
            "ParameterKey": "sourceSchema",
            "ParameterValue": base64.b64encode(
                gzip.compress(bytes(json.dumps(json_schema), encoding="utf-8"))
            ).decode("utf-8"),
        },
        {"ParameterKey": "pipelineId", "ParameterValue": app_pipeline.pipelineId},
        {"ParameterKey": "sourceDataFormat", "ParameterValue": "Regex"},
        {
            "ParameterKey": "sourceTableProperties",
            "ParameterValue": base64.b64encode(
                gzip.compress(
                    bytes(
                        json.dumps({"skip.header.line.count": json.dumps(json_schema)}),
                        encoding="utf-8",
                    )
                )
            ).decode("utf-8"),
        },
        {
            "ParameterKey": "sourceSerializationProperties",
            "ParameterValue": base64.b64encode(
                gzip.compress(
                    bytes(
                        json.dumps({"input.regex": json.dumps(json_schema)}),
                        encoding="utf-8",
                    )
                )
            ).decode("utf-8"),
        },
    ]


def check_items_in_list(list1, list2):
    for item in list1:
        if item not in list2:
            return False
    return True


def params_to_dict(lst):
    d = {}
    for each in lst:
        d[each["ParameterKey"]] = each["ParameterValue"]
    return d


def test_app_pipeline_dao_get_stack_parameters(ddb_client):
    from commonlib.dao import AppPipelineDao

    dao = AppPipelineDao(os.environ.get("APP_PIPELINE_TABLE_NAME"))
    p = dao.get_app_pipeline("3333")
    params = dao.get_stack_parameters(p)

    assert p.bufferType == "S3"
    assert check_items_in_list(
        [
            {"ParameterKey": "logBucketPrefix", "ParameterValue": "prefix/"},
            {"ParameterKey": "logBucketSuffix", "ParameterValue": ".suffix"},
        ],
        params,
    )

    p.bufferType = BufferTypeEnum.NONE
    params = params_to_dict(dao.get_stack_parameters(p))

    assert "backupBucketName" not in params

    p.bufferType = BufferTypeEnum.KDS
    params = params_to_dict(dao.get_stack_parameters(p))

    assert "shardCount" in params
    assert "minCapacity" in params
    assert "maxCapacity" in params
    assert "createDashboard" in params

    p.bufferType = BufferTypeEnum.MSK
    params = params_to_dict(dao.get_stack_parameters(p))

    assert "mskClusterArn" in params


def test_app_pipeline_dao_validate_buffer_params(ddb_client):
    from commonlib.dao import AppPipelineDao

    dao = AppPipelineDao(os.environ.get("APP_PIPELINE_TABLE_NAME"))
    p = dao.get_app_pipeline("3333")
    p.bufferType = BufferTypeEnum.KDS
    dao.validate_buffer_params(buffer_type=p.bufferType, buffer_params=p.bufferParams)

    with pytest.raises(APIException, match=r"Missing buffer parameters"):
        p.bufferType = BufferTypeEnum.S3
        dao.validate_buffer_params(
            buffer_type=p.bufferType, buffer_params=p.bufferParams
        )


def test_app_pipeline_dao_validate(ddb_client):
    from commonlib.dao import AppPipelineDao

    dao = AppPipelineDao(os.environ.get("APP_PIPELINE_TABLE_NAME"))
    p = dao.get_app_pipeline("3333")
    p.bufferType = BufferTypeEnum.KDS

    with pytest.raises(Exception, match=r"DUPLICATED_WITH_INACTIVE_INDEX_PREFIX"):
        dao.validate(p)

    p.indexPrefix = "helloworld"

    dao.validate(p)


def test_app_pipeline_get_stack_name(ddb_client):
    from commonlib.dao import AppPipelineDao

    dao = AppPipelineDao(os.environ.get("APP_PIPELINE_TABLE_NAME"))
    p = dao.get_app_pipeline("3333")
    assert "AppLogS3Buffer" == dao.get_stack_name(p)

    p.osiParams = OpenSearchIngestionInput(maxCapacity=10, minCapacity=10)
    assert "AppLogS3BufferOSIProcessor" == dao.get_stack_name(p)

    p.bufferType = BufferTypeEnum.MSK
    assert "AppLogMSKBuffer" == dao.get_stack_name(p)

    p.bufferType = BufferTypeEnum.KDS
    assert "AppLogKDSBufferNoAutoScaling" == dao.get_stack_name(p)

    p.bufferParams.insert(
        0, BufferParam(paramKey="enableAutoScaling", paramValue="true")
    )
    assert "AppLogKDSBuffer" == dao.get_stack_name(p)

    p.engineType = EngineType.LIGHT_ENGINE
    p.logStructure = LogStructure.FLUENT_BIT_PARSED_JSON
    assert "MicroBatchApplicationFluentBitPipeline" == dao.get_stack_name(p)

    p.engineType = EngineType.LIGHT_ENGINE
    p.logStructure = LogStructure.RAW
    assert "MicroBatchApplicationS3Pipeline" == dao.get_stack_name(p)


def test_app_pipeline_save(ddb_client):
    from commonlib.dao import AppPipelineDao

    dao = AppPipelineDao(os.environ.get("APP_PIPELINE_TABLE_NAME"))
    p = dao.get_app_pipeline("62a37b50-72af-4a7b-9d4b-d859d538a19c")
    dao.save(p)


def test_app_pipeline_dao_get_app_pipeline(ddb_client):
    from commonlib.dao import AppPipelineDao, LogStructure

    dao = AppPipelineDao(os.environ.get("APP_PIPELINE_TABLE_NAME"))
    p = dao.get_app_pipeline("62a37b50-72af-4a7b-9d4b-d859d538a19c")

    # fmt: off
    assert p.pipelineId == "62a37b50-72af-4a7b-9d4b-d859d538a19c"
    assert p.bufferAccessRoleArn == "arn:aws:iam::123456789012:role/Solution-AppPipe-62a37-BufferAccessRoleDF53FD85-4BU06LEOL8JH"
    assert p.bufferAccessRoleName == "Solution-AppPipe-62a37-BufferAccessRoleDF53FD85-4BU06LEOL8JH"
    assert p.bufferResourceArn == "arn:aws:kinesis:us-west-2:123456789012:stream/Solution-AppPipe-62a37-KDSBufferStream21B531A6-xhE79t2qh4um"
    assert p.stackId == "arn:aws:cloudformation:us-west-2:123456789012:stack/Solution-AppPipe-62a37/96ea1a40-55cb-11ed-868d-0a1261729f93"
    assert p.bufferParams == [
        {"paramKey": "enableAutoScaling", "paramValue": "false"},
        {"paramKey": "shardCount", "paramValue": "1"},
        {"paramKey": "minCapacity", "paramValue": "1"},
        {"paramKey": "maxCapacity", "paramValue": "5"},
    ]
    assert p.bufferType == "KDS"
    assert p.status == "ACTIVE"
    assert p.logStructure == LogStructure.FLUENT_BIT_PARSED_JSON
    # fmt: on

    p = dao.get_app_pipeline("2406190a-bb74-407e-82cb-e441c4e9efe5")
    assert p.logStructure == LogStructure.RAW

    p = dao.get_app_pipeline("222222222222222")
    assert p.logStructure == LogStructure.FLUENT_BIT_PARSED_JSON

    with pytest.raises(Exception, match=r"Can not find"):
        dao.get_app_pipeline("not-found")


def test_app_pipeline_dao_update_app_pipeline(ddb_client):
    from commonlib.dao import AppPipelineDao, StatusEnum, BufferTypeEnum

    dao = AppPipelineDao(os.environ.get("APP_PIPELINE_TABLE_NAME"))
    dao.update_app_pipeline(
        "62a37b50-72af-4a7b-9d4b-d859d538a19c",
        status=StatusEnum.INACTIVE,
        bufferType=BufferTypeEnum.S3,
        bufferParams=[{"paramKey": "enableAutoScaling", "paramValue": "false"}],
    )
    p = dao.get_app_pipeline("62a37b50-72af-4a7b-9d4b-d859d538a19c")

    # fmt: off
    assert p.pipelineId == "62a37b50-72af-4a7b-9d4b-d859d538a19c"
    assert p.bufferAccessRoleArn == "arn:aws:iam::123456789012:role/Solution-AppPipe-62a37-BufferAccessRoleDF53FD85-4BU06LEOL8JH"
    assert p.bufferAccessRoleName == "Solution-AppPipe-62a37-BufferAccessRoleDF53FD85-4BU06LEOL8JH"
    assert p.bufferResourceArn == "arn:aws:kinesis:us-west-2:123456789012:stream/Solution-AppPipe-62a37-KDSBufferStream21B531A6-xhE79t2qh4um"
    assert p.stackId == "arn:aws:cloudformation:us-west-2:123456789012:stack/Solution-AppPipe-62a37/96ea1a40-55cb-11ed-868d-0a1261729f93"
    assert p.bufferParams == [
        {"paramKey": "enableAutoScaling", "paramValue": "false"},
    ]
    assert p.bufferType == "S3"
    assert p.status == "INACTIVE"
    # fmt: on

    dao.update_app_pipeline(
        "62a37b50-72af-4a7b-9d4b-d859d538a19c",
        status=StatusEnum.ACTIVE,
        bufferType=BufferTypeEnum.KDS,
        bufferParams=[
            {"paramKey": "enableAutoScaling", "paramValue": "false"},
            {"paramKey": "shardCount", "paramValue": "1"},
            {"paramKey": "minCapacity", "paramValue": "1"},
            {"paramKey": "maxCapacity", "paramValue": "5"},
        ],
    )
    p = dao.get_app_pipeline("62a37b50-72af-4a7b-9d4b-d859d538a19c")

    assert p.bufferType == "KDS"
    assert p.status == "ACTIVE"
    assert p.bufferParams == [
        {"paramKey": "enableAutoScaling", "paramValue": "false"},
        {"paramKey": "shardCount", "paramValue": "1"},
        {"paramKey": "minCapacity", "paramValue": "1"},
        {"paramKey": "maxCapacity", "paramValue": "5"},
    ]

    dao.update_app_pipeline(
        "62a37b50-72af-4a7b-9d4b-d859d538a19c",
        **{
            "monitor.pipelineAlarmStatus": PipelineAlarmStatus.ENABLED,
        },
    )
    p = dao.get_app_pipeline("62a37b50-72af-4a7b-9d4b-d859d538a19c")
    assert p.monitor.pipelineAlarmStatus == PipelineAlarmStatus.ENABLED


def test_pipeline_alarm_dao_update_pipeline_alarm_status(ddb_client):
    from commonlib.dao import PipelineAlarmDao

    dao = PipelineAlarmDao(os.environ.get("APP_PIPELINE_TABLE_NAME"))
    dao.update_pipeline_alarm_status(
        "62a37b50-72af-4a7b-9d4b-d859d538a19c",
        status=PipelineAlarmStatus.ENABLED,
        id_key="pipelineId",
    )
    p = dao.get_pipeline_alarm_status(
        "62a37b50-72af-4a7b-9d4b-d859d538a19c", id_key="pipelineId"
    )

    assert p["pipelineAlarmStatus"] == "ENABLED"

    with pytest.raises(Exception, match=r"Can not find"):
        dao.get_pipeline_alarm_status(
            "not-found",
            id_key="pipelineId",
        )


def test_pipeline_alarm_dao_get_alarm_metric_info_by_pipeline_id(ddb_client):
    from commonlib.dao import PipelineAlarmDao

    # Test for App Pipeline
    dao = PipelineAlarmDao(os.environ.get("APP_PIPELINE_TABLE_NAME"))
    p = dao.get_alarm_metric_info_by_pipeline_id(
        "62a37b50-72af-4a7b-9d4b-d859d538a19c", id_key="pipelineId"
    )

    assert p["stackName"] == "Solution-AppPipe-62a37"
    assert (
        p["bufferResourceName"]
        == "Solution-AppPipe-62a37-KDSBufferStream21B531A6-xhE79t2qh4um"
    )
    assert (
        p["bufferResourceArn"]
        == "arn:aws:kinesis:us-west-2:123456789012:stream/Solution-AppPipe-62a37-KDSBufferStream21B531A6-xhE79t2qh4um"
    )
    assert p["bufferType"] == "KDS"

    # Test for Service Pipeline
    dao = PipelineAlarmDao(os.environ.get("SERVICE_PIPELINE_TABLE_NAME"))
    p = dao.get_alarm_metric_info_by_pipeline_id("c34f2159-34e4-4410-976b-9a565adef81b")

    assert p["stackName"] == "CL-pipe-c34f2159"
    assert p["processorLogGroupName"] == "/aws/lambda/CL-pipe-c34f2159-LogProcessorFn"
    assert p["processorFnName"] == "CL-pipe-c34f2159-LogProcessorFn"
    assert p["logEventQueueName"] == "CL-pipe-c34f2159-LogEventQueue-9SeRI7idCHFR"

    with pytest.raises(APIException, match=r"Error parse stack name"):
        dao.get_stack_name_from_stack_id("not-valid-stack-id")


def get_app_log_ingestion_table_name():
    return os.environ.get("APP_LOG_INGESTION_TABLE_NAME")


def test_applogingestiondao_save(ddb_client):
    from commonlib.dao import AppLogIngestionDao

    dao = AppLogIngestionDao(get_app_log_ingestion_table_name())
    i = dao.get_app_log_ingestion("62a37b50-72af-4a7b-9d4b-d859d538a19c")
    dao.save(i)


def test_get_app_log_ingestions_by_source_id(ddb_client):
    from commonlib.dao import AppLogIngestionDao

    dao = AppLogIngestionDao(get_app_log_ingestion_table_name())
    app_log_ingestions = dao.get_app_log_ingestions_by_source_id(
        "62a37b50-72af-4a7b-9d4b-d859d538a191"
    )

    assert len(app_log_ingestions) == 1

    p = app_log_ingestions[0]

    # fmt: off
    assert p.id == "62a37b50-72af-4a7b-9d4b-d859d538a19c"
    assert p.status == "ACTIVE"
    # fmt: on


def test_get_app_log_ingestions_by_pipeline_id(ddb_client):
    from commonlib.dao import AppLogIngestionDao

    dao = AppLogIngestionDao(get_app_log_ingestion_table_name())
    app_log_ingestions = dao.get_app_log_ingestions_by_pipeline_id(
        "fake-app-pipeline-id"
    )

    assert len(app_log_ingestions) == 1

    p = app_log_ingestions[0]

    assert p.id == "62a37b50-72af-4a7b-9d4b-d859d538a19c"
    assert p.status == "ACTIVE"


def test_list_app_log_ingestions(ddb_client):
    from commonlib.dao import AppLogIngestionDao
    from commonlib.model import StatusEnum

    dao = AppLogIngestionDao(get_app_log_ingestion_table_name())
    app_log_ingestions = dao.list_app_log_ingestions(
        Attr("status").eq("ACTIVE").__and__(Attr("input.name").eq("syslog"))
    )

    assert len(app_log_ingestions) == 1

    p = app_log_ingestions[0]

    # fmt: off
    assert p.id == "62a37b50-72af-4a7b-9d4b-d859d538a19c"
    assert p.status == "ACTIVE"
    # fmt: on

    app_log_ingestions = dao.list_app_log_ingestions(
        Attr("status").eq(StatusEnum.ERROR)
    )
    assert app_log_ingestions == []

    lst = dao.list_app_log_ingestions()
    assert len(lst) == 1
    for each in lst:
        assert each.status != StatusEnum.INACTIVE


def test_get_app_log_ingestion(ddb_client):
    from commonlib.dao import AppLogIngestionDao

    dao = AppLogIngestionDao(get_app_log_ingestion_table_name())
    p = dao.get_app_log_ingestion("62a37b50-72af-4a7b-9d4b-d859d538a19c")

    # fmt: off
    assert p.id == "62a37b50-72af-4a7b-9d4b-d859d538a19c"
    assert p.status == "ACTIVE"
    # fmt: on

    with pytest.raises(Exception, match=r"Can not find"):
        dao.get_app_log_ingestion("not-found")


def test_update_app_log_ingestion(ddb_client):
    from commonlib.dao import AppLogIngestionDao
    from commonlib.model import StatusEnum

    dao = AppLogIngestionDao(get_app_log_ingestion_table_name())
    dao.update_app_log_ingestion(
        "62a37b50-72af-4a7b-9d4b-d859d538a19c",
        status=StatusEnum.INACTIVE,
    )
    p = dao.get_app_log_ingestion("62a37b50-72af-4a7b-9d4b-d859d538a19c")

    # fmt: off
    assert p.id == "62a37b50-72af-4a7b-9d4b-d859d538a19c"
    assert p.status == "INACTIVE"
    # fmt: on

    dao.update_app_log_ingestion(
        "62a37b50-72af-4a7b-9d4b-d859d538a19c",
        status=StatusEnum.ACTIVE,
    )
    p = dao.get_app_log_ingestion("62a37b50-72af-4a7b-9d4b-d859d538a19c")

    assert p.status == "ACTIVE"


def test_save_delete_with_log_source(ddb_client):
    from commonlib.dao import AppLogIngestionDao
    from commonlib.model import (
        LogTypeEnum,
        StatusEnum,
        AppLogIngestion,
        LogConfig,
        LogSource,
        LogSourceTypeEnum,
        SyslogProtocol,
    )

    dao = AppLogIngestionDao(get_app_log_ingestion_table_name())
    config_args = dict()
    config_args["id"] = "logconf"
    config_args["version"] = "1"
    config_args["name"] = "test_conf"
    config_args["logType"] = LogTypeEnum.JSON
    config_args["regexFieldSpecs"] = []
    log_config = LogConfig(**config_args)

    ingestion_args = dict()
    ingestion_args["sourceId"] = "84c6c37e-03db-4846-bb90-93e85bb1b27b"
    ingestion_args["appPipelineId"] = "pipelineId"
    ingestion_args["logConfig"] = log_config
    ingestion_args["accountId"] = "111111111111"
    ingestion_args["region"] = "us-east-1"
    app_log_ingestion = AppLogIngestion(**ingestion_args)

    log_source_args = dict()
    log_source_args["sourceId"] = ingestion_args["sourceId"]
    # log_source_args['status']=StatusEnum.CREATING
    log_source_args["type"] = LogSourceTypeEnum.Syslog

    syslog = dict()
    syslog["protocol"] = SyslogProtocol.TCP
    syslog["port"] = 10
    syslog["nlbArn"] = "nlbArn"
    syslog["nlbDNSName"] = "nlbDNSName"
    log_source_args["syslog"] = syslog
    log_source = LogSource(**log_source_args)
    app_log_ingestion = dao.save_with_log_source(
        app_log_ingestion, get_log_source_table_name(), log_source
    )
    dao.update_app_log_ingestion(app_log_ingestion.id, status=StatusEnum.ACTIVE)

    from commonlib.dao import LogSourceDao

    logsource_dao = LogSourceDao(get_log_source_table_name())
    log_source: LogSource = logsource_dao.get_log_source(ingestion_args["sourceId"])
    assert log_source.syslog.nlbArn == "nlbArn"
    logsource_dao.update_log_source(log_source.sourceId, status=StatusEnum.ACTIVE)
    dao.delete_with_log_source(
        app_log_ingestion, get_log_source_table_name(), log_source
    )
    log_source = logsource_dao.get_log_source(ingestion_args["sourceId"])
    assert log_source.status == StatusEnum.DELETING


def test_log_config():
    LogConfig(
        id="47b23378-4ec6-4584-b264-079c75ab2e5f",
        version=3,
        name="spring-boot-conf-1",
        logType=LogTypeEnum.JSON,
        filterConfigMap=FilterConfigMap(enabled=False, filters=[]),
        regex="(?<time>\\d{4}-\\d{2}-\\d{2} \\d{2}:\\d{2}:\\d{2}.\\d{3}) (?<level>\\s*[\\S]+\\s*) \\[(?<thread>\\S+)?\\] (?<logger>.+) : (?<message>[\\s\\S]+)",
        regexFieldSpecs=[
            RegularSpec(key="time", type="date", format="%Y-%m-%d %H:%M:%S.%L"),
            RegularSpec(key="level", type="keyword"),
            RegularSpec(key="thread", type="text"),
            RegularSpec(key="logger", type="text"),
            RegularSpec(key="message", type="text"),
        ],
        timeKey="time",
        timeOffset="-0600",
        timeKeyRegex="\\d{4}-\\d{2}-\\d{2} \\d{2}:\\d{2}:\\d{2}.\\d{3}",
        userLogFormat="%d{yyyy-MM-dd HH:mm:ss.SSS} %-5level [%thread] %logger : %msg%n",
        userSampleLog="log",
    )

    LogConfig(
        id="47b23378-4ec6-4584-b264-079c75ab2e5f",
        version=3,
        name="spring-boot-conf-1",
        logType=LogTypeEnum.JSON,
        filterConfigMap=FilterConfigMap(enabled=False, filters=[]),
        regex="(?<time>\\d{4}-\\d{2}-\\d{2} \\d{2}:\\d{2}:\\d{2}.\\d{3}) (?<level>\\s*[\\S]+\\s*) \\[(?<thread>\\S+)?\\] (?<logger>.+) : (?<message>[\\s\\S]+)",
        regexFieldSpecs=[
            RegularSpec(key="time", type="date", format="%Y-%m-%d %H:%M:%S.%L"),
            RegularSpec(key="level", type="keyword"),
            RegularSpec(key="thread", type="text"),
            RegularSpec(key="logger", type="text"),
            RegularSpec(key="message", type="text"),
        ],
        timeKey="",
        timeOffset="-0600",
        timeKeyRegex="\\d{4}-\\d{2}-\\d{2} \\d{2}:\\d{2}:\\d{2}.\\d{3}",
        userLogFormat="%d{yyyy-MM-dd HH:mm:ss.SSS} %-5level [%thread] %logger : %msg%n",
        userSampleLog="log",
    )

    with pytest.raises(ValueError, match="No regexFieldSpecs"):
        LogConfig(
            id="47b23378-4ec6-4584-b264-079c75ab2e5f",
            version=3,
            name="spring-boot-conf-1",
            logType=LogTypeEnum.JSON,
            filterConfigMap=FilterConfigMap(enabled=False, filters=[]),
            regex="(?<time>\\d{4}-\\d{2}-\\d{2} \\d{2}:\\d{2}:\\d{2}.\\d{3}) (?<level>\\s*[\\S]+\\s*) \\[(?<thread>\\S+)?\\] (?<logger>.+) : (?<message>[\\s\\S]+)",
            regexFieldSpecs=[
                RegularSpec(key="level", type="keyword"),
                RegularSpec(key="thread", type="text"),
                RegularSpec(key="logger", type="text"),
                RegularSpec(key="message", type="text"),
            ],
            timeKey="timeKey",
            timeOffset="-0600",
            timeKeyRegex="\\d{4}-\\d{2}-\\d{2} \\d{2}:\\d{2}:\\d{2}.\\d{3}",
            userLogFormat="%d{yyyy-MM-dd HH:mm:ss.SSS} %-5level [%thread] %logger : %msg%n",
            userSampleLog="log",
        )

    with pytest.raises(ValueError, match="date"):
        LogConfig(
            id="47b23378-4ec6-4584-b264-079c75ab2e5f",
            version=3,
            name="spring-boot-conf-1",
            logType=LogTypeEnum.JSON,
            filterConfigMap=FilterConfigMap(enabled=False, filters=[]),
            regex="(?<time>\\d{4}-\\d{2}-\\d{2} \\d{2}:\\d{2}:\\d{2}.\\d{3}) (?<level>\\s*[\\S]+\\s*) \\[(?<thread>\\S+)?\\] (?<logger>.+) : (?<message>[\\s\\S]+)",
            regexFieldSpecs=[
                RegularSpec(key="timeKey", type="text"),
                RegularSpec(key="level", type="keyword"),
                RegularSpec(key="thread", type="text"),
                RegularSpec(key="logger", type="text"),
                RegularSpec(key="message", type="text"),
            ],
            timeKey="timeKey",
            timeOffset="-0600",
            timeKeyRegex="\\d{4}-\\d{2}-\\d{2} \\d{2}:\\d{2}:\\d{2}.\\d{3}",
            userLogFormat="%d{yyyy-MM-dd HH:mm:ss.SSS} %-5level [%thread] %logger : %msg%n",
            userSampleLog="log",
        )

    with pytest.raises(ValueError, match="not be empty"):
        LogConfig(
            id="47b23378-4ec6-4584-b264-079c75ab2e5f",
            version=3,
            name="spring-boot-conf-1",
            logType=LogTypeEnum.JSON,
            filterConfigMap=FilterConfigMap(enabled=False, filters=[]),
            regex="(?<time>\\d{4}-\\d{2}-\\d{2} \\d{2}:\\d{2}:\\d{2}.\\d{3}) (?<level>\\s*[\\S]+\\s*) \\[(?<thread>\\S+)?\\] (?<logger>.+) : (?<message>[\\s\\S]+)",
            regexFieldSpecs=[
                RegularSpec(key="timeKey", type="date", format=""),
                RegularSpec(key="level", type="keyword"),
                RegularSpec(key="thread", type="text"),
                RegularSpec(key="logger", type="text"),
                RegularSpec(key="message", type="text"),
            ],
            timeKey="timeKey",
            timeOffset="-0600",
            timeKeyRegex="\\d{4}-\\d{2}-\\d{2} \\d{2}:\\d{2}:\\d{2}.\\d{3}",
            userLogFormat="%d{yyyy-MM-dd HH:mm:ss.SSS} %-5level [%thread] %logger : %msg%n",
            userSampleLog="log",
        )


def test_s3_notification_prefix():
    from commonlib.dao import s3_notification_prefix

    assert "AppLogs/s3src/year=" == s3_notification_prefix(
        "AppLogs/s3src/year=%Y/month=%m/day=%d"
    )
    assert "AppLogs/s3src/hello" == s3_notification_prefix("AppLogs/s3src/hello")
    assert "AppLogs/s3src/hello" == s3_notification_prefix("/AppLogs/s3src/hello")
    assert "abcd/" == s3_notification_prefix(
        "/abcd/$TAG[2]/$TAG[0]/%Y/%m/%d/%H/%M/%S/$UUID.gz"
    )
    assert "abcd" == s3_notification_prefix(
        "/abcd$TAG[2]/$TAG[0]/%Y/%m/%d/%H/%M/%S/$UUID.gz"
    )
    assert "abcd" == s3_notification_prefix(
        "abcd$TAG[2]/$TAG[0]/%Y/%m/%d/%H/%M/%S/$UUID.gz"
    )
    assert "" == s3_notification_prefix("$TAG[0]/%Y/%m/%d/%H/%M/%S/")
    assert "AppLogs/s3src/" == s3_notification_prefix("/AppLogs/s3src/")
    assert "" == s3_notification_prefix("/")
    assert "" == s3_notification_prefix("")
    assert "asdasd" == s3_notification_prefix("asdasd")
    assert "AppLogs/my-debug-0728/year=" == s3_notification_prefix(
        "AppLogs/my-debug-0728/year="
    )


def test_save_instance_ingestion_detail(ddb_client):
    from commonlib.dao import InstanceIngestionDetailDao
    from commonlib.model import (
        InstanceIngestionDetail,
    )

    dao = InstanceIngestionDetailDao(
        os.environ.get("INSTANCE_INGESTION_DETAIL_TABLE_NAME")
    )

    instance_ingestion_detail_args = dict()
    instance_ingestion_detail_args["instanceId"] = "instanceId"
    instance_ingestion_detail_args["sourceId"] = "84c6c37e-03db-4846-bb90-93e85bb1b27b"
    instance_ingestion_detail_args["ingestionId"] = "ingestionId"
    instance_ingestion_detail_args["accountId"] = "111111111111"
    instance_ingestion_detail_args["region"] = "us-east-1"
    instance_ingestion_detail_args["status"] = StatusEnum.DISTRIBUTING
    instance_ingestion_detail = InstanceIngestionDetail(
        **instance_ingestion_detail_args
    )
    instance_ingestion_details = []
    instance_ingestion_details.append(instance_ingestion_detail)
    dao.batch_put_items(instance_ingestion_details)

    instance_ingestion_details_result = dao.get_instance_ingestion_details(
        instance_ingestion_detail_args["instanceId"],
        instance_ingestion_detail_args["ingestionId"],
        instance_ingestion_detail_args["sourceId"],
    )
    assert (
        instance_ingestion_details_result[0].instanceId
        == instance_ingestion_detail.instanceId
        and instance_ingestion_details[0].status == StatusEnum.DISTRIBUTING
    )

    lst = dao.list_instance_ingestion_details()
    assert len(lst) == 1
    assert lst[0].status == StatusEnum.DISTRIBUTING


class TestETLLog:
    def init(self, ddb_client):
        from commonlib.dao import ETLLogDao

        self.etl_log_table = ETLLogDao(table_name=os.environ.get("ETL_LOG_TABLE_NAME"))

    def test_query_execution_logs(self, ddb_client):
        from commonlib.model import ExecutionStatus

        self.init(ddb_client=ddb_client)

        response = self.etl_log_table.query_execution_logs(
            pipeline_index_key="3d37e69e-7129-461e-b4b8-4a8e72eb5b80:LogProcessor:00000000-0000-0000-0000-000000000000"
        )
        assert response["Items"] == [
            {
                "executionName": "3ad531f6-e158-4f2b-afa4-ee6292e0434d",
                "taskId": "00000000-0000-0000-0000-000000000000",
                "endTime": "2023-10-16T04:18:37.150Z",
                "pipelineIndexKey": "3d37e69e-7129-461e-b4b8-4a8e72eb5b80:LogProcessor:00000000-0000-0000-0000-000000000000",
                "startTime": "2023-10-16T04:18:38.272Z",
                "status": "Running",
            },
            {
                "executionName": "3c38d333-a3a5-46f3-8791-36f203b5b98e",
                "taskId": "00000000-0000-0000-0000-000000000000",
                "pipelineIndexKey": "3d37e69e-7129-461e-b4b8-4a8e72eb5b80:LogProcessor:00000000-0000-0000-0000-000000000000",
                "startTime": "2023-10-16T04:13:38.272Z",
                "endTime": "2023-10-16T04:13:37.150Z",
                "status": "Running",
            },
            {
                "executionName": "47eae851-54c1-447d-a394-330469b95966",
                "taskId": "00000000-0000-0000-0000-000000000000",
                "endTime": "2023-10-16T04:08:37.150Z",
                "pipelineIndexKey": "3d37e69e-7129-461e-b4b8-4a8e72eb5b80:LogProcessor:00000000-0000-0000-0000-000000000000",
                "startTime": "2023-10-16T04:08:38.272Z",
                "status": "Failed",
            },
            {
                "executionName": "70fa7767-82e9-469c-97ee-4fb071339ad9",
                "taskId": "00000000-0000-0000-0000-000000000000",
                "pipelineIndexKey": "3d37e69e-7129-461e-b4b8-4a8e72eb5b80:LogProcessor:00000000-0000-0000-0000-000000000000",
                "startTime": "2023-10-16T04:03:38.272Z",
                "endTime": "2023-10-16T04:03:37.150Z",
                "status": "Aborted",
            },
            {
                "executionName": "0f0a0643-748d-4bbf-a673-4aca6dc6838a",
                "taskId": "00000000-0000-0000-0000-000000000000",
                "pipelineIndexKey": "3d37e69e-7129-461e-b4b8-4a8e72eb5b80:LogProcessor:00000000-0000-0000-0000-000000000000",
                "startTime": "2023-10-16T03:58:34.272Z",
                "endTime": "2023-10-16T03:58:36.150Z",
                "status": "Timed_out",
            },
            {
                "executionName": "775b1764-c0cf-481e-9561-873841507ebc",
                "taskId": "00000000-0000-0000-0000-000000000000",
                "pipelineIndexKey": "3d37e69e-7129-461e-b4b8-4a8e72eb5b80:LogProcessor:00000000-0000-0000-0000-000000000000",
                "startTime": "2023-10-16T03:53:34.152Z",
                "endTime": "2023-10-16T03:53:36.230Z",
                "status": "Succeeded",
            },
            {
                "executionName": "88652cb2-812f-4574-af3e-0094fda842d2",
                "taskId": "00000000-0000-0000-0000-000000000000",
                "pipelineIndexKey": "3d37e69e-7129-461e-b4b8-4a8e72eb5b80:LogProcessor:00000000-0000-0000-0000-000000000000",
                "startTime": "2023-10-16T03:48:34.852Z",
                "endTime": "2023-10-16T03:48:36.340Z",
                "status": "Succeeded",
            },
        ]

        response = self.etl_log_table.query_execution_logs(
            pipeline_index_key="3d37e69e-7129-461e-b4b8-4a8e72eb5b80:LogProcessor:00000000-0000-0000-0000-000000000000",
            start_time="2023-10-16T03:48:33.000Z",
            status=ExecutionStatus.RUNNING,
            limit=1,
        )
        assert response["Items"] == [
            {
                "executionName": "3ad531f6-e158-4f2b-afa4-ee6292e0434d",
                "taskId": "00000000-0000-0000-0000-000000000000",
                "pipelineIndexKey": "3d37e69e-7129-461e-b4b8-4a8e72eb5b80:LogProcessor:00000000-0000-0000-0000-000000000000",
                "startTime": "2023-10-16T04:18:38.272Z",
                "endTime": "2023-10-16T04:18:37.150Z",
                "status": "Running",
            }
        ]
        response = self.etl_log_table.query_execution_logs(
            pipeline_index_key="3d37e69e-7129-461e-b4b8-4a8e72eb5b80:LogProcessor:00000000-0000-0000-0000-000000000000",
            start_time="2023-10-16T03:48:33.000Z",
            status=ExecutionStatus.RUNNING,
            limit=1,
            last_evaluated_key=response["LastEvaluatedKey"],
        )
        assert response["Items"] == [
            {
                "executionName": "3c38d333-a3a5-46f3-8791-36f203b5b98e",
                "taskId": "00000000-0000-0000-0000-000000000000",
                "pipelineIndexKey": "3d37e69e-7129-461e-b4b8-4a8e72eb5b80:LogProcessor:00000000-0000-0000-0000-000000000000",
                "startTime": "2023-10-16T04:13:38.272Z",
                "endTime": "2023-10-16T04:13:37.150Z",
                "status": "Running",
            },
        ]
        response = self.etl_log_table.query_execution_logs(
            pipeline_index_key="3d37e69e-7129-461e-b4b8-4a8e72eb5b80:LogProcessor:00000000-0000-0000-0000-000000000000",
            start_time="2023-10-16T03:48:33.000Z",
            status=ExecutionStatus.RUNNING,
            limit=1,
            last_evaluated_key=response["LastEvaluatedKey"],
        )
        assert response["Items"] == []

        response = self.etl_log_table.query_execution_logs(
            pipeline_index_key="3d37e69e-7129-461e-b4b8-4a8e72eb5b80:LogProcessor:00000000-0000-0000-0000-000000000000",
            start_time="2023-10-16T03:48:33.000Z",
            end_time="2023-10-16T03:53:34.152Z",
        )
        assert response["Items"] == [
            {
                "executionName": "775b1764-c0cf-481e-9561-873841507ebc",
                "taskId": "00000000-0000-0000-0000-000000000000",
                "pipelineIndexKey": "3d37e69e-7129-461e-b4b8-4a8e72eb5b80:LogProcessor:00000000-0000-0000-0000-000000000000",
                "startTime": "2023-10-16T03:53:34.152Z",
                "endTime": "2023-10-16T03:53:36.230Z",
                "status": "Succeeded",
            },
            {
                "executionName": "88652cb2-812f-4574-af3e-0094fda842d2",
                "taskId": "00000000-0000-0000-0000-000000000000",
                "pipelineIndexKey": "3d37e69e-7129-461e-b4b8-4a8e72eb5b80:LogProcessor:00000000-0000-0000-0000-000000000000",
                "startTime": "2023-10-16T03:48:34.852Z",
                "endTime": "2023-10-16T03:48:36.340Z",
                "status": "Succeeded",
            },
        ]

        response = self.etl_log_table.query_execution_logs(
            pipeline_index_key="3d37e69e-7129-461e-b4b8-4a8e72eb5b80:LogProcessor:00000000-0000-0000-0000-000000000000",
            end_time="2023-10-16T04:00:34.272Z",
        )
        assert response["Items"] == [
            {
                "executionName": "0f0a0643-748d-4bbf-a673-4aca6dc6838a",
                "taskId": "00000000-0000-0000-0000-000000000000",
                "pipelineIndexKey": "3d37e69e-7129-461e-b4b8-4a8e72eb5b80:LogProcessor:00000000-0000-0000-0000-000000000000",
                "startTime": "2023-10-16T03:58:34.272Z",
                "endTime": "2023-10-16T03:58:36.150Z",
                "status": "Timed_out",
            },
            {
                "executionName": "775b1764-c0cf-481e-9561-873841507ebc",
                "taskId": "00000000-0000-0000-0000-000000000000",
                "pipelineIndexKey": "3d37e69e-7129-461e-b4b8-4a8e72eb5b80:LogProcessor:00000000-0000-0000-0000-000000000000",
                "startTime": "2023-10-16T03:53:34.152Z",
                "endTime": "2023-10-16T03:53:36.230Z",
                "status": "Succeeded",
            },
            {
                "executionName": "88652cb2-812f-4574-af3e-0094fda842d2",
                "taskId": "00000000-0000-0000-0000-000000000000",
                "pipelineIndexKey": "3d37e69e-7129-461e-b4b8-4a8e72eb5b80:LogProcessor:00000000-0000-0000-0000-000000000000",
                "startTime": "2023-10-16T03:48:34.852Z",
                "endTime": "2023-10-16T03:48:36.340Z",
                "status": "Succeeded",
            },
        ]


def test_svc_pipeline_dao(ddb_client):
    from commonlib.dao import SvcPipelineDao, StatusEnum, BufferTypeEnum
    from commonlib.model import (
        SvcPipeline,
        EngineType,
        MonitorDetail,
        PipelineMonitorStatus,
        LightEngineParams,
    )

    dao = SvcPipelineDao(os.environ.get("SERVICE_PIPELINE_TABLE_NAME"))

    svc_pipeline = SvcPipeline(
        bufferResourceArn="",
        bufferResourceName="",
        deliveryStreamArn="",
        deliveryStreamName="",
        destinationType=BufferTypeEnum.S3,
        engineType=EngineType.LIGHT_ENGINE,
        error="",
        helperLogGroupName="",
        logEventQueueArn="",
        logEventQueueName="",
        logSourceAccountId="",
        logSourceRegion="",
        monitor=MonitorDetail(status=PipelineMonitorStatus.DISABLED),
        parameters=[],
        processorLogGroupName="",
        lightEngineParams=LightEngineParams(
            stagingBucketPrefix="awslogs",
            centralizedBucketName="centralized-bucket",
            centralizedBucketPrefix="datalake",
            centralizedTableName="test",
            centralizedMetricsTableName="",
            logProcessorSchedule="rate(5 minutes)",
            logMergerSchedule="cron(0 1 * * ? *)",
            logArchiveSchedule="cron(0 2 * * ? *)",
            logMergerAge="1",
            logArchiveAge="7",
            importDashboards="false",
            grafanaId="",
            recipients="",
        ),
        source="",
        stackId="",
        stackName="",
        target="",
        type="",
    )
    dao.save(service_pipeline=svc_pipeline)

    pipelines = dao.list_svc_pipelines()

    assert len(pipelines) == 2

    p = pipelines[0]

    # fmt: off
    assert p.id == "c34f2159-34e4-4410-976b-9a565adef81b"
    assert p.destinationType == "S3"
    assert p.engineType == "OpenSearch"
    assert p.status == "ACTIVE"
    
    p = pipelines[1]
    assert p.id == svc_pipeline.id
    assert p.destinationType == "S3"
    assert p.engineType == "LightEngine"
    # fmt: on

    pipelines = dao.list_svc_pipelines(Attr("status").eq(StatusEnum.ERROR))
    assert pipelines == []

    pipelines = dao.get_svc_pipeline(id=svc_pipeline.id)
    assert pipelines.id == svc_pipeline.id
    assert pipelines.destinationType == "S3"
    assert pipelines.engineType == "LightEngine"

    dao.update_svc_pipeline(id=svc_pipeline.id, **{"error": "Failed"})
    pipelines = dao.get_svc_pipeline(id=svc_pipeline.id)
    assert pipelines.error == "Failed"


def test_svc_pipeline_dao_get_light_engine_stack_parameters(ddb_client):
    from commonlib.dao import SvcPipelineDao, StatusEnum, BufferTypeEnum
    from commonlib.model import (
        SvcPipeline,
        EngineType,
        MonitorDetail,
        PipelineMonitorStatus,
        LightEngineParams,
    )

    dao = SvcPipelineDao(os.environ.get("SERVICE_PIPELINE_TABLE_NAME"))

    svc_pipeline = SvcPipeline(
        bufferResourceArn="",
        bufferResourceName="",
        deliveryStreamArn="",
        deliveryStreamName="",
        destinationType=BufferTypeEnum.S3,
        engineType=EngineType.LIGHT_ENGINE,
        error="",
        helperLogGroupName="",
        logEventQueueArn="",
        logEventQueueName="",
        logSourceAccountId="",
        logSourceRegion="",
        monitor=MonitorDetail(status=PipelineMonitorStatus.DISABLED),
        parameters=[],
        processorLogGroupName="",
        lightEngineParams=LightEngineParams(
            stagingBucketPrefix="awslogs",
            centralizedBucketName="centralized-bucket",
            centralizedBucketPrefix="datalake",
            centralizedTableName="test",
            centralizedMetricsTableName="",
            logProcessorSchedule="rate(5 minutes)",
            logMergerSchedule="cron(0 1 * * ? *)",
            logArchiveSchedule="cron(0 2 * * ? *)",
            logMergerAge="1",
            logArchiveAge="7",
            importDashboards="false",
            grafanaId="",
            recipients="",
        ),
        source="",
        stackId="",
        stackName="",
        target="",
        type="waf",
    )
    dao.save(service_pipeline=svc_pipeline)

    params = dao.get_light_engine_stack_parameters(
        service_pipeline=svc_pipeline,
        grafana={"url": "http://127.0.0.1:3000", "token": "glsa_xxx"},
    )

    assert params == [
        {"ParameterKey": "stagingBucketPrefix", "ParameterValue": "awslogs"},
        {
            "ParameterKey": "centralizedBucketName",
            "ParameterValue": "centralized-bucket",
        },
        {"ParameterKey": "centralizedBucketPrefix", "ParameterValue": "datalake"},
        {"ParameterKey": "centralizedTableName", "ParameterValue": "test"},
        {"ParameterKey": "logProcessorSchedule", "ParameterValue": "rate(5 minutes)"},
        {"ParameterKey": "logMergerSchedule", "ParameterValue": "cron(0 1 * * ? *)"},
        {"ParameterKey": "logArchiveSchedule", "ParameterValue": "cron(0 2 * * ? *)"},
        {"ParameterKey": "logMergerAge", "ParameterValue": "1"},
        {"ParameterKey": "logArchiveAge", "ParameterValue": "7"},
        {"ParameterKey": "importDashboards", "ParameterValue": "false"},
        {"ParameterKey": "recipients", "ParameterValue": ""},
        {"ParameterKey": "pipelineId", "ParameterValue": svc_pipeline.id},
        {"ParameterKey": "notificationService", "ParameterValue": "SNS"},
        {"ParameterKey": "grafanaUrl", "ParameterValue": "http://127.0.0.1:3000"},
        {"ParameterKey": "grafanaToken", "ParameterValue": "glsa_xxx"},
    ]

    svc_pipeline = SvcPipeline(
        bufferResourceArn="",
        bufferResourceName="",
        deliveryStreamArn="",
        deliveryStreamName="",
        destinationType=BufferTypeEnum.S3,
        engineType=EngineType.LIGHT_ENGINE,
        error="",
        helperLogGroupName="",
        logEventQueueArn="",
        logEventQueueName="",
        logSourceAccountId="",
        logSourceRegion="",
        monitor=MonitorDetail(status=PipelineMonitorStatus.DISABLED),
        parameters=[],
        processorLogGroupName="",
        lightEngineParams=LightEngineParams(
            stagingBucketPrefix="awslogs",
            centralizedBucketName="centralized-bucket",
            centralizedBucketPrefix="datalake",
            centralizedTableName="test",
            centralizedMetricsTableName="",
            logProcessorSchedule="rate(5 minutes)",
            logMergerSchedule="cron(0 1 * * ? *)",
            logArchiveSchedule="cron(0 2 * * ? *)",
            logMergerAge="1",
            logArchiveAge="7",
            importDashboards="false",
            grafanaId="",
            recipients="",
            enrichmentPlugins="geo_ip,user_agent",
        ),
        source="",
        stackId="",
        stackName="",
        target="",
        type="elb",
    )
    dao.save(service_pipeline=svc_pipeline)

    params = dao.get_light_engine_stack_parameters(service_pipeline=svc_pipeline)

    assert params == [
        {"ParameterKey": "stagingBucketPrefix", "ParameterValue": "awslogs"},
        {
            "ParameterKey": "centralizedBucketName",
            "ParameterValue": "centralized-bucket",
        },
        {"ParameterKey": "centralizedBucketPrefix", "ParameterValue": "datalake"},
        {"ParameterKey": "centralizedTableName", "ParameterValue": "test"},
        {"ParameterKey": "logProcessorSchedule", "ParameterValue": "rate(5 minutes)"},
        {"ParameterKey": "logMergerSchedule", "ParameterValue": "cron(0 1 * * ? *)"},
        {"ParameterKey": "logArchiveSchedule", "ParameterValue": "cron(0 2 * * ? *)"},
        {"ParameterKey": "logMergerAge", "ParameterValue": "1"},
        {"ParameterKey": "logArchiveAge", "ParameterValue": "7"},
        {"ParameterKey": "importDashboards", "ParameterValue": "false"},
        {"ParameterKey": "recipients", "ParameterValue": ""},
        {"ParameterKey": "pipelineId", "ParameterValue": svc_pipeline.id},
        {"ParameterKey": "notificationService", "ParameterValue": "SNS"},
        {"ParameterKey": "enrichmentPlugins", "ParameterValue": "geo_ip,user_agent"},
    ]


def test_set_kv_to_buffer_param():
    from commonlib.utils import set_kv_to_buffer_param
    from commonlib.model import BufferParam

    buffer_params = [BufferParam(paramKey="logBucketPrefix", paramValue="prefix")]

    new_buffer_params = set_kv_to_buffer_param(
        key="logBucketPrefix", value="new_prefix", buffer_param=buffer_params
    )
    assert buffer_params == [
        BufferParam(paramKey="logBucketPrefix", paramValue="new_prefix")
    ]
    assert new_buffer_params == [
        BufferParam(paramKey="logBucketPrefix", paramValue="new_prefix")
    ]

    buffer_params = [BufferParam(paramKey="logBucketPrefix", paramValue="prefix")]
    new_buffer_params = set_kv_to_buffer_param(
        key="new", value="value", buffer_param=buffer_params
    )
    assert new_buffer_params == [
        BufferParam(paramKey="logBucketPrefix", paramValue="prefix"),
        BufferParam(paramKey="new", paramValue="value"),
    ]
