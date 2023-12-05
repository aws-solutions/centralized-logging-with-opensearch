# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import os
import re
import boto3
import pytest

from moto import mock_dynamodb
from boto3.dynamodb.conditions import Attr
from commonlib.exception import APIException
from commonlib.model import (
    AOSParams,
    AppPipeline,
    FilterConfigMap,
    LogConfig,
    LogSourceTypeEnum,
    LogTypeEnum,
    MonitorDetail,
    PipelineAlarmStatus,
    GroupPlatformEnum,
    GroupTypeEnum,
    RegularSpec,
    StatusEnum,
    ETLLog,
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
        dao.validate_duplicated_index_prefix(p, False)

    dao.validate_duplicated_index_prefix(p, True)

    p.indexPrefix = "syslog-dev-04"
    p.aosParams.indexPrefix = "syslog-dev-04"

    with pytest.raises(APIException, match=r"DUPLICATED_WITH_INACTIVE_INDEX_PREFIX"):
        dao.validate_duplicated_index_prefix(p, False)

    dao.validate_duplicated_index_prefix(p, True)


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
        dao.validate_index_prefix_overlap(p)

    with pytest.raises(APIException, match=r"OVERLAP_INDEX_PREFIX"):
        dao.validate_index_prefix_overlap(p)

    p.indexPrefix = "syslog-dev-04-overlap"
    p.aosParams.indexPrefix = "syslog-dev-04-overlap"

    with pytest.raises(APIException, match=r"OVERLAP_WITH_INACTIVE_INDEX_PREFIX"):
        dao.validate_index_prefix_overlap(p)

    with pytest.raises(APIException, match=r"OVERLAP_WITH_INACTIVE_INDEX_PREFIX"):
        dao.validate_index_prefix_overlap(p)

    p.indexPrefix = "syslog-dev-04"
    p.aosParams.indexPrefix = "syslog-dev-04"

    # duplicate is not overlap
    dao.validate_index_prefix_overlap(p)
    dao.validate_index_prefix_overlap(p)


def test_app_pipeline_dao_list_app_pipelines(ddb_client):
    from commonlib.dao import AppPipelineDao, StatusEnum

    dao = AppPipelineDao(os.environ.get("APP_PIPELINE_TABLE_NAME"))
    pipelines = dao.list_app_pipelines()

    assert len(pipelines) == 1

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


def check_items_in_list(list1, list2):
    for item in list1:
        if item not in list2:
            return False
    return True


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


def test_app_pipeline_dao_get_app_pipeline(ddb_client):
    from commonlib.dao import AppPipelineDao

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
    # fmt: on

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
        }
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

    assert "AppLogs/s3src/year%3D" == s3_notification_prefix(
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
    assert "AppLogs/my-debug-0728/year%3D" == s3_notification_prefix(
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
