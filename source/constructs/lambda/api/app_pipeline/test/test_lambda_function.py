# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import os
import json
import boto3
import pytest
import responses

from commonlib.exception import APIException

from moto import (
    mock_s3,
    mock_dynamodb,
    mock_stepfunctions,
    mock_iam,
    mock_lambda,
    mock_kinesis,
    mock_es,
    mock_glue,
    mock_events,
    mock_scheduler,
    mock_sns,
    mock_opensearch,
    mock_sts,
)
from .conftest import (
    init_ddb,
    init_table,
    get_test_zip_file1,
    make_ddb_table,
    make_graphql_lambda_event,
)

REGEX = "(?<time>\\d{4}-\\d{2}-\\d{2}\\s*\\d{2}:\\d{2}:\\d{2}.\\d{3})\\s*(?<level>\\S+)\\s*\\[(?<thread>\\S+)\\]\\s*(?<logger>\\S+)\\s*:\\s*(?<message>[\\s\\S]+)"
TIME_FORMAT = "%Y-%m-%d %H:%M:%S.%L"


@pytest.fixture
def sts_client():
    with mock_sts():
        yield


@pytest.fixture
def s3_client():
    with mock_s3():
        bucket_name = os.environ["CONFIG_FILE_S3_BUCKET_NAME"]
        logging_bucket_name = os.environ["DEFAULT_LOGGING_BUCKET"]
        region = os.environ["AWS_REGION"]
        account_id = os.environ["ACCOUNT_ID"]

        s3 = boto3.client("s3")
        s3.create_bucket(Bucket=logging_bucket_name)
        s3.create_bucket(Bucket=bucket_name)

        s3.put_bucket_notification_configuration(
            Bucket=bucket_name,
            NotificationConfiguration={
                "LambdaFunctionConfigurations": [
                    {
                        "Id": "lambda-notification",
                        "LambdaFunctionArn": f"arn:aws:lambda:{region}:{account_id}:function:test",
                        "Events": [
                            "s3:ObjectCreated:*",
                        ],
                        "Filter": {
                            "Key": {
                                "FilterRules": [
                                    {"Name": "prefix", "Value": "AWSLogs/123456789012"},
                                ]
                            }
                        },
                    }
                ],
                "EventBridgeConfiguration": {},
            },
        )
        yield


@pytest.fixture
def sns_client():
    with mock_sns():
        topic_name = "alarm_topic"

        sns = boto3.client("sns")
        response = sns.create_topic(Name=topic_name)

        os.environ["snsTopicArn"] = response["TopicArn"]
        yield


@pytest.fixture
def sfn_client():
    with mock_stepfunctions():
        sfn = boto3.client("stepfunctions")
        response = sfn.create_state_machine(
            name="SolutionAPIPipelineFlowSM",
            definition=json.dumps(
                {
                    "Comment": "A Hello World example of the Amazon States Language using Pass states",
                    "StartAt": "Hello",
                    "States": {
                        "Hello": {"Type": "Pass", "Result": "World", "End": True}
                    },
                }
            ),
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
                RoleName="LogAgentRole",
                AssumeRolePolicyDocument="some policy",
                Path="/",
            )["Role"],
            "AWSServiceRoleForAmazonOpenSearchIngestionService": iam.create_role(
                RoleName="AWSServiceRoleForAmazonOpenSearchIngestionService",
                AssumeRolePolicyDocument="some policy",
                Path="/aws-service-role/osis.amazonaws.com/",
            )["Role"],
        }


@pytest.fixture
def remote_lambda(iam_roles):
    with mock_lambda():
        awslambda = boto3.client("lambda")

        yield awslambda.create_function(
            FunctionName="FAKE-Solution-EKS-Cluster-PodLog-Pipel-OpenSearchHelperFn-ef8PiCbL9ixp",
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
        region = os.environ.get("AWS_REGION")
        account_id = os.environ["ACCOUNT_ID"]

        ddb = boto3.resource("dynamodb", region_name=region)

        make_ddb_table(
            os.environ["APPPIPELINE_TABLE"],
            pk="pipelineId",
            rows=[
                {
                    "pipelineId": "f34b2266-aee1-4266-ac25-be32421fb3e1",
                    "aosParams": {
                        "coldLogTransition": 0,
                        "domainName": "helloworld",
                        "engine": "OpenSearch",
                        "failedLogBucket": "amzn-s3-demo-logging-bucket",
                        "indexPrefix": "helloworld",
                        "logRetention": 0,
                        "opensearchArn": "arn:aws:es:us-west-2:1234567890AB:domain/helloworld",
                        "opensearchEndpoint": "vpc-helloworld-hbgb2ktamqnb5cedzrty3blelu.us-west-2.es.amazonaws.com",
                        "vpc": {
                            "privateSubnetIds": "subnet-01f09e14e5b70c11f,subnet-06843d01e3da35b7d",
                            "publicSubnetIds": "",
                            "securityGroupId": "sg-0ec6c9b448792d1e6",
                            "vpcId": "vpc-05a90814226d2c713",
                        },
                        "warmLogTransition": "",
                        "rolloverSize": "30gb",
                        "replicaNumbers": 0,
                        "shardNumbers": 1,
                    },
                    "createdAt": "2022-05-05T07:43:55Z",
                    "error": "",
                    "bufferType": "KDS",
                    "bufferParams": [
                        {"paramKey": "enableAutoScaling", "paramValue": "false"},
                        {"paramKey": "shardCount", "paramValue": "1"},
                        {"paramKey": "minCapacity", "paramValue": "1"},
                        {"paramKey": "maxCapacity", "paramValue": "5"},
                    ],
                    "logConfigId": "e8e52b70-e7bc-4bdb-ad60-5f1addf17387",
                    "logConfigVersionNumber": 0,
                    "stackId": "arn:aws:cloudformation:us-west-2:1234567890AB:stack/Solution-EKS-Cluster-PodLog-Pipeline-f34b2/1e8e2860-cc47-11ec-8d95-06039fb616cf",
                    "status": "ACTIVE",
                    "monitor": {
                        "status": "ENABLED",
                        "backupBucketName": "amzn-s3-demo-logging-bucket",
                        "errorLogPrefix": "error/",
                    },
                    "tags": [],
                },
                {
                    "pipelineId": "4b5b721b-01ad-4a07-98fe-4d2a0e3ce4dc",
                    "aosParas": {
                        "coldLogTransition": 0,
                        "domainName": "helloworld",
                        "engine": "OpenSearch",
                        "failedLogBucket": "amzn-s3-demo-logging-bucket",
                        "indexPrefix": "eks-pipe2",
                        "logRetention": 0,
                        "opensearchArn": "arn:aws:es:us-west-2:1234567890AB:domain/helloworld",
                        "opensearchEndpoint": "vpc-helloworld-hbgb2ktamqnb5cedzrty3blelu.us-west-2.es.amazonaws.com",
                        "vpc": {
                            "privateSubnetIds": "subnet-01f09e14e5b70c11f,subnet-06843d01e3da35b7d",
                            "publicSubnetIds": "",
                            "securityGroupId": "sg-0ec6c9b448792d1e6",
                            "vpcId": "vpc-05a90814226d2c713",
                        },
                        "logConfigId": "e8e52b70-e7bc-4bdb-ad60-5f1addf17387",
                        "logConfigVersionNumber": 0,
                        "warmLogTransition": "",
                        "rolloverSize": "30gb",
                        "replicaNumbers": 0,
                        "shardNumbers": 1,
                    },
                    "createdAt": "2022-05-07T06:36:41Z",
                    "error": "",
                    "bufferType": "KDS",
                    "bufferParams": [
                        {"paramKey": "enableAutoScaling", "paramValue": "false"},
                        {"paramKey": "shardCount", "paramValue": "1"},
                        {"paramKey": "minCapacity", "paramValue": "1"},
                        {"paramKey": "maxCapacity", "paramValue": "5"},
                    ],
                    "stackId": "arn:aws:cloudformation:us-west-2:1234567890AB:stack/Solution-AppPipe-4b5b7/0f1cf390-cdd0-11ec-a7af-06957ff291a7",
                    "status": "ACTIVE",
                    "monitor": {
                        "status": "ENABLED",
                        "backupBucketName": "amzn-s3-demo-logging-bucket",
                        "errorLogPrefix": "error/",
                    },
                    "tags": [],
                },
            ],
        )
        make_ddb_table(
            os.environ["LOG_CONFIG_TABLE"],
            pk="id",
            pk_type="S",
            sk="version",
            sk_type="N",
            rows=[
                {
                    "id": "e8e52b70-e7bc-4bdb-ad60-5f1addf17387",
                    "version": 0,
                    "name": "SpringBoot0220",
                    "createdAt": "2022-02-20T08:05:39Z",
                    "logPath": "/var/log/solution/springboot/*.log",
                    "logType": "MultiLineText",
                    "multilineLogParser": "JAVA_SPRING_BOOT",
                    "regularExpression": REGEX,
                    "regexFieldSpecs": [
                        {"format": TIME_FORMAT, "key": "time", "type": "date"},
                        {"format": "", "key": "level", "type": "text"},
                        {"format": "", "key": "thread", "type": "text"},
                        {"format": "", "key": "logger", "type": "text"},
                        {"format": "", "key": "message", "type": "text"},
                    ],
                    "status": "ACTIVE",
                    "updatedAt": "2022-02-20T08:08:31Z",
                    "userLogFormat": "%d{yyyy-MM-dd HH:mm:ss.SSS} %-5level [%thread] %logger : %msg%n",
                },
                {
                    "id": "e8e52b70-e7bc-4bdb-ad60-5f1addf17387",
                    "version": 1,
                    "name": "SpringBoot0220",
                    "createdAt": "2022-02-20T08:05:39Z",
                    "logPath": "/var/log/solution/springboot/*.log",
                    "logType": "MultiLineText",
                    "multilineLogParser": "JAVA_SPRING_BOOT",
                    "regularExpression": REGEX,
                    "regexFieldSpecs": [
                        {"format": TIME_FORMAT, "key": "time", "type": "date"},
                        {"format": "", "key": "level", "type": "text"},
                        {"format": "", "key": "thread", "type": "text"},
                        {"format": "", "key": "logger", "type": "text"},
                        {"format": "", "key": "message", "type": "text"},
                    ],
                    "status": "ACTIVE",
                    "updatedAt": "2024-02-20T08:08:31Z",
                    "userLogFormat": "%d{yyyy-MM-dd HH:mm:ss.SSS} %-5level [%thread] %logger : %msg%n",
                },
                {
                    "id": "47b23378-4ec6-4584-b264-079c75ab2e5f",
                    "version": 0,
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
                    "status": "ACTIVE",
                },
            ],
        )
        make_ddb_table(
            os.environ["METADATA_TABLE"],
            pk="metaName",
            rows=[
                {
                    "metaName": "CentralizedDatabase",
                    "arn": "arn:aws:glue:us-east-1:123456789012:database/centralized",
                    "name": "centralized",
                    "service": "GLUE",
                },
                {
                    "metaName": "AvailableServices",
                    "arn": "",
                    "name": "AvailableServices",
                    "service": "GLUE",
                    "value": ["ec2", "scheduler"],
                },
                {
                    "metaName": "LogProcessor",
                    "arn": "arn:aws:states:us-east-1:123456789012:stateMachine:LogProcessor-CBiU8jrNn8FS",
                    "name": "LogProcessor-CBiU8jrNn8FS",
                    "service": "StepFunction",
                },
                {
                    "metaName": "LogMerger",
                    "arn": "arn:aws:states:us-east-1:123456789012:stateMachine:LogMerger-hymPoOLJPnU2",
                    "name": "LogMerger-hymPoOLJPnU2",
                    "service": "StepFunction",
                },
                {
                    "metaName": "LogArchive",
                    "arn": "arn:aws:states:us-east-1:123456789012:stateMachine:LogArchive-qbjgRlBep0gT",
                    "name": "LogArchive-qbjgRlBep0gT",
                    "service": "StepFunction",
                },
            ],
        )
        make_ddb_table(
            os.environ["GRAFANA_TABLE"],
            pk="id",
            rows=[
                {
                    "id": "28cada44-b170-46ca-a9e4-1e146338f124",
                    "name": "Grafana",
                    "url": "https://alb.us-east-1.elb.amazonaws.com",
                    "token": "glsa_000000",
                },
            ],
        )
        make_ddb_table(
            os.environ.get("LOG_SOURCE_TABLE_NAME"),
            pk="sourceId",
            pk_type="S",
            rows=[
                {
                    "sourceId": "b693176e-5369-4e3c-88fb-4296e2a39943",
                    "accountId": account_id,
                    "createdAt": "2024-01-12T02:35:37Z",
                    "ec2": {
                        "groupName": "test",
                        "groupPlatform": "Linux",
                        "groupType": "EC2",
                    },
                    "region": region,
                    "status": "ACTIVE",
                    "type": "EC2",
                    "updatedAt": "2024-01-12T02:35:42Z",
                },
                {
                    "sourceId": "cbd1092c-7f3a-4975-ae9f-ca373be83203",
                    "accountId": account_id,
                    "createdAt": "2023-08-02T12:42:49Z",
                    "eks": {
                        "cri": "containerd",
                        "deploymentKind": "Sidecar",
                        "eksClusterArn": f"arn:aws:eks:{region}:{account_id}:cluster/sidecar",
                        "eksClusterName": "sidecar",
                        "eksClusterSGId": "sg-0a640e56278b62c23",
                        "endpoint": f"https://C2534EAAE6FA7284AEF4C541FAD0.gr7.{region}.eks.amazonaws.com",
                        "logAgentRoleArn": f"arn:aws:iam::{account_id}:role/CL-EKS-LogAgent-Role",
                        "oidcArn": f"arn:aws:iam::{account_id}:oidc-provider/oidc.eks.{region}.amazonaws.com/id/C2534EAAE6FA7284AEF4C541FAD0",
                        "oidcIssuer": f"https://oidc.eks.{region}.amazonaws.com/id/C2534EAAE6FA7284AEF4C541FAD0",
                        "subnetIds": [
                            "subnet-0e447ddfd88ce78c3",
                            "subnet-0340e66e2160db14b",
                        ],
                        "vpcId": "vpc-04c0eabd64f211246",
                    },
                    "region": region,
                    "status": "ACTIVE",
                    "tags": [],
                    "type": "EKSCluster",
                    "updatedAt": "2023-08-02T13:02:07Z",
                },
                {
                    "sourceId": "f09ed760-a4e4-4757-9913-bb40e0a0d894",
                    "accountId": account_id,
                    "createdAt": "2023-12-27T06:33:32Z",
                    "region": region,
                    "s3": {
                        "bucketName": "logging-bucket",
                        "keyPrefix": "LightEngine/AppLogs/s3s/cl_app_le_s3s/",
                        "keySuffix": "",
                        "mode": "ON_GOING",
                    },
                    "status": "ACTIVE",
                    "type": "S3",
                    "updatedAt": "2023-12-27T06:35:20Z",
                },
            ],
        )
        make_ddb_table(
            os.environ["CLUSTER_TABLE"],
            pk="id",
            pk_type="S",
            rows=[
                {
                    "id": "2864694e441928e0d6f8bbbcb619facd",
                    "accountId": account_id,
                    "alarmError": "",
                    "alarmInput": {},
                    "alarmStatus": "DISABLED",
                    "domainArn": f"arn:aws:es:{region}:{account_id}:domain/opensearch-for-clo",
                    "vpc": {
                        "privateSubnetIds": "subnet-0340e66e21b,subnet-0e447ddfd78c3",
                        "publicSubnetIds": "subnet-034861aa573,subnet-06d528",
                        "securityGroupId": "sg-0599320",
                        "vpcId": "vpc-04c0ea1246",
                    },
                    "domainInfo": {
                        "DomainStatus": {
                            "VPCOptions": {
                                "AvailabilityZones": [f"{region}a"],
                                "SecurityGroupIds": ["sg-0e809acc6a"],
                                "SubnetIds": ["subnet-0a158ed79e0be"],
                                "VPCId": "vpc-04c0eab1246",
                            }
                        }
                    },
                    "domainName": "aos",
                    "endpoint": f"vpc-opensearch-for-clo-c42z4u7rmh.{region}.es.amazonaws.com",
                    "engine": "OpenSearch",
                    "importedDt": "2023-08-02T05:50:14Z",
                    "importMethod": "AUTOMATIC",
                    "masterRoleArn": f"arn:aws:iam::{account_id}:role/clo-OpenSearchMasterRole",
                    "proxyALB": f"CL-Pr-LoadB-1I0TWZX-.{region}.elb.amazonaws.com",
                    "proxyError": "",
                    "proxyInput": {
                        "certificateArn": f"arn:aws:acm:{region}:{account_id}:certificate/576518a3",
                        "cognitoEndpoint": "",
                        "customEndpoint": "",
                        "elbAccessLogBucketName": "logging-bucket",
                        "keyName": "EC2",
                        "proxyInstanceNumber": "1",
                        "proxyInstanceType": "t3.large",
                        "vpc": {
                            "privateSubnetIds": "subnet-0340e66e21b,subnet-0e447ddfd78c3",
                            "publicSubnetIds": "subnet-034861aa573,subnet-06d528",
                            "securityGroupId": "sg-0599320",
                            "vpcId": "vpc-04c0ea1246",
                        },
                    },
                    "proxyStackId": f"arn:aws:cloudformation:{region}:{account_id}:stack/CL-Proxy-5b41b55f/81e894b0",
                    "proxyStatus": "ENABLED",
                    "region": region,
                    "resources": [
                        {
                            "name": "VPCPeering",
                            "values": ["VPCPeering"],
                            "status": "CREATED",
                        }
                    ],
                    "status": "IMPORTED",
                    "tags": [],
                    "version": "2.7",
                    "vpc": {
                        "privateSubnetIds": "subnet-0340e66e2160,subnet-0edfd88ce78c3",
                        "securityGroupId": "sg-0f600225",
                        "vpcId": "vpc-04c1246",
                    },
                },
                {
                    "id": "deleted-aos",
                    "accountId": account_id,
                    "alarmError": "",
                    "alarmInput": {},
                    "alarmStatus": "DISABLED",
                    "domainArn": f"arn:aws:es:{region}:{account_id}:domain/opensearch-for-clo",
                    "domainInfo": {
                        "DomainStatus": {
                            "VPCOptions": {
                                "AvailabilityZones": [f"{region}a"],
                                "SecurityGroupIds": ["sg-0e809acc6a"],
                                "SubnetIds": ["subnet-0a158ed79e0be"],
                                "VPCId": "vpc-04c0eab1246",
                            }
                        }
                    },
                    "domainName": "deleted-aos",
                    "endpoint": f"vpc-opensearch-for-clo-c42zrmh.{region}.es.amazonaws.com",
                    "engine": "OpenSearch",
                    "importedDt": "2023-08-02T05:50:14Z",
                    "importMethod": "AUTOMATIC",
                    "masterRoleArn": f"arn:aws:iam::{account_id}:role/clo-OpenSearchMasterRole",
                    "proxyALB": f"CL-Pr-LoadB-1I0TWZX-.{region}.elb.amazonaws.com",
                    "proxyError": "",
                    "proxyInput": {
                        "certificateArn": f"arn:aws:acm:{region}:{account_id}:certificate/576518a3",
                        "cognitoEndpoint": "",
                        "customEndpoint": "",
                        "elbAccessLogBucketName": "logging-bucket",
                        "keyName": "EC2",
                        "proxyInstanceNumber": "1",
                        "proxyInstanceType": "t3.large",
                        "vpc": {
                            "privateSubnetIds": "subnet-0340e66e21b,subnet-0e447ddfd78c3",
                            "publicSubnetIds": "subnet-034861aa573,subnet-06d528",
                            "securityGroupId": "sg-0599320",
                            "vpcId": "vpc-04c0ea1246",
                        },
                    },
                    "region": region,
                    "resources": [
                        {
                            "name": "VPCPeering",
                            "values": ["VPCPeering"],
                            "status": "CREATED",
                        }
                    ],
                    "status": "INACTIVE",
                    "tags": [],
                    "version": "2.7",
                    "vpc": {
                        "privateSubnetIds": "subnet-0340e66e2160,subnet-0edfd88ce78c3",
                        "securityGroupId": "sg-0f600225",
                        "vpcId": "vpc-04c1246",
                    },
                },
            ],
        )
        init_ddb(
            {
                os.environ["APPLOGINGESTION_TABLE"]: [
                    {
                        "id": "60d7b565-25f4-4c3c-b09e-275e1d02183d",
                        "appPipelineId": "f34b2266-aee1-4266-ac25-be32421fb3e1",
                        "confId": "e8e52b70-e7bc-4bdb-ad60-5f1addf17387",
                        "createdAt": "2022-05-05T07:43:55Z",
                        "error": "",
                        "sourceId": "8df489745b1c4cb5b0ef81c6144f9283",
                        "sourceType": "EKSCluster",
                        "stackId": "arn:aws:cloudformation:us-west-2:1234567890AB:stack/Solution-EKS-Cluster-PodLog-Pipeline-f34b2/1e8e2860-cc47-11ec-8d95-06039fb616cf",
                        "stackName": "Solution-EKS-Cluster-PodLog-Pipeline-f34b2",
                        "status": "CREATING",
                        "tags": [],
                        "updatedAt": "2022-05-05T07:47:04Z",
                    },
                    {
                        "id": "ce7f497c-8d73-40f7-a940-26da2540822e",
                        "appPipelineId": "4b5b721b-01ad-4a07-98fe-4d2a0e3ce4dc",
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
                ],
            }
        )

        # Mock ETLLog Table
        etl_log_table_name = os.environ.get("ETLLOG_TABLE")
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


@pytest.fixture
def glue_client():
    with mock_glue():
        glue = boto3.client("glue")
        glue.create_database(DatabaseInput={"Name": "centralized"})
        glue.create_table(
            DatabaseName="centralized",
            TableInput={
                "Name": "waf",
                "StorageDescriptor": {
                    "Columns": [
                        {"Name": "id", "Type": "integer"},
                        {"Name": "name", "Type": "string"},
                    ],
                    "Location": "s3://centralized-bucket/datalake/centralized/waf",
                    "InputFormat": "org.apache.hadoop.hive.ql.io.parquet.MapredParquetInputFormat",
                    "OutputFormat": "org.apache.hadoop.hive.ql.io.parquet.MapredParquetOutputFormat",
                    "SerdeInfo": {
                        "SerializationLibrary": "org.apache.hadoop.hive.ql.io.parquet.serde.ParquetHiveSerDe",
                    },
                    "Compressed": True,
                },
                "TableType": "EXTERNAL_TABLE",
                "Parameters": {
                    "classification": "parquet",
                    "has_encrypted_data": "true",
                },
            },
        )

        glue.create_table(
            DatabaseName="centralized",
            TableInput={
                "Name": "waf_metrics",
                "StorageDescriptor": {
                    "Columns": [
                        {"Name": "name", "Type": "string"},
                        {"Name": "count", "Type": "integer"},
                    ],
                    "Location": "s3://centralized-bucket/datalake/centralized/waf_metrics",
                    "InputFormat": "org.apache.hadoop.hive.ql.io.parquet.MapredParquetInputFormat",
                    "OutputFormat": "org.apache.hadoop.hive.ql.io.parquet.MapredParquetOutputFormat",
                    "SerdeInfo": {
                        "SerializationLibrary": "org.apache.hadoop.hive.ql.io.parquet.serde.ParquetHiveSerDe",
                    },
                    "Compressed": True,
                },
                "TableType": "EXTERNAL_TABLE",
                "Parameters": {
                    "classification": "parquet",
                    "has_encrypted_data": "true",
                },
            },
        )
        yield


@pytest.fixture
def events_client():
    with mock_events():
        events = boto3.client("events")

        events.put_rule(
            Name=f"LogProcessor-{os.environ['LIGHT_ENGINE_APP_PIPELINE_ID']}",
            ScheduleExpression="rate(5 minutes)",
            State="ENABLED",
            EventBusName="default",
        )
        events.put_targets(
            Rule=f"LogProcessor-{os.environ['LIGHT_ENGINE_APP_PIPELINE_ID']}",
            EventBusName="default",
            Targets=[
                {
                    "Id": "1234567890",
                    "Arn": f"arn:aws:states:us-east-1:123456789012:stateMachine:LogProcessor-CBiU8jrNn8FS",
                    "Input": json.dumps({"metadata": {}}, indent=4),
                    "RoleArn": f"arn:aws:iam::123456789012:role/LogProcessor-CBiU8jrNn8FS",
                }
            ],
        )

        events.put_rule(
            Name=f"LogMerger-{os.environ['LIGHT_ENGINE_APP_PIPELINE_ID']}",
            ScheduleExpression="cron(0 1 * * ? *)",
            State="ENABLED",
            EventBusName="default",
        )
        events.put_targets(
            Rule=f"LogMerger-{os.environ['LIGHT_ENGINE_APP_PIPELINE_ID']}",
            EventBusName="default",
            Targets=[
                {
                    "Id": "1234567890",
                    "Arn": f"arn:aws:states:us-east-1:123456789012:stateMachine:LogMerger-hymPoOLJPnU2",
                    "Input": json.dumps({"metadata": {}}, indent=4),
                    "RoleArn": f"arn:aws:iam::123456789012:role/LogMerger-hymPoOLJPnU2",
                }
            ],
        )
        events.put_rule(
            Name=f"LogArchive-{os.environ['LIGHT_ENGINE_APP_PIPELINE_ID']}",
            ScheduleExpression="cron(0 2 * * ? *)",
            State="ENABLED",
            EventBusName="default",
        )
        events.put_targets(
            Rule=f"LogMerger-{os.environ['LIGHT_ENGINE_APP_PIPELINE_ID']}",
            EventBusName="default",
            Targets=[
                {
                    "Id": "1234567890",
                    "Arn": f"arn:aws:states:us-east-1:123456789012:stateMachine:LogArchive-qbjgRlBep0gT",
                    "Input": json.dumps({"metadata": {}}, indent=4),
                    "RoleArn": f"arn:aws:iam::123456789012:role/LogArchive-qbjgRlBep0gT",
                }
            ],
        )
        events.put_rule(
            Name=f"LogMergerForMetrics-{os.environ['LIGHT_ENGINE_APP_PIPELINE_ID']}",
            ScheduleExpression="cron(0 1 * * ? *)",
            State="ENABLED",
            EventBusName="default",
        )
        events.put_targets(
            Rule=f"LogMergerForMetrics-{os.environ['LIGHT_ENGINE_APP_PIPELINE_ID']}",
            EventBusName="default",
            Targets=[
                {
                    "Id": "1234567890",
                    "Arn": f"arn:aws:states:us-east-1:123456789012:stateMachine:LogMerger-hymPoOLJPnU2",
                    "Input": json.dumps({"metadata": {}}, indent=4),
                    "RoleArn": f"arn:aws:iam::123456789012:role/LogMerger-hymPoOLJPnU2",
                }
            ],
        )

        yield


@pytest.fixture
def scheduler_client():
    with mock_scheduler():
        scheduler = boto3.client("scheduler")
        pipeline_id = os.environ["LIGHT_ENGINE_APP_PIPELINE_ID"]

        scheduler.create_schedule_group(
            Name=pipeline_id, Tags=[{"Key": "Application", "Value": "clo"}]
        )

        scheduler.create_schedule(
            FlexibleTimeWindow={"Mode": "OFF"},
            GroupName=pipeline_id,
            Name="LogProcessor",
            ScheduleExpression="rate(5 minutes)",
            State="ENABLED",
            Target={
                "Arn": f"arn:aws:states:us-east-1:123456789012:stateMachine:LogProcessor-CBiU8jrNn8FS",
                "Input": json.dumps({}, indent=4),
                "RoleArn": f"arn:aws:iam::123456789012:role/LogProcessor-CBiU8jrNn8FS",
            },
        )
        scheduler.create_schedule(
            FlexibleTimeWindow={"Mode": "OFF"},
            GroupName=pipeline_id,
            Name="LogMerger",
            ScheduleExpression="cron(0 1 * * ? *)",
            State="ENABLED",
            Target={
                "Arn": f"arn:aws:states:us-east-1:123456789012:stateMachine:LogMerger-hymPoOLJPnU2",
                "Input": json.dumps({}, indent=4),
                "RoleArn": f"arn:aws:iam::123456789012:role/LogMerger-hymPoOLJPnU2",
            },
        )
        scheduler.create_schedule(
            FlexibleTimeWindow={"Mode": "OFF"},
            GroupName=pipeline_id,
            Name="LogArchive",
            ScheduleExpression="cron(0 2 * * ? *)",
            State="ENABLED",
            Target={
                "Arn": f"arn:aws:states:us-east-1:123456789012:stateMachine:LogArchive-qbjgRlBep0gT",
                "Input": json.dumps({}, indent=4),
                "RoleArn": f"arn:aws:iam::123456789012:role/LogArchive-qbjgRlBep0gT",
            },
        )
        scheduler.create_schedule(
            FlexibleTimeWindow={"Mode": "OFF"},
            GroupName=pipeline_id,
            Name="LogMergerForMetrics",
            ScheduleExpression="cron(0 1 * * ? *)",
            State="ENABLED",
            Target={
                "Arn": f"arn:aws:states:us-east-1:123456789012:stateMachine:LogMerger-hymPoOLJPnU2",
                "Input": json.dumps({}, indent=4),
                "RoleArn": f"arn:aws:iam::123456789012:role/LogMerger-hymPoOLJPnU2",
            },
        )

        yield


@pytest.fixture
def check_osi_event():
    with open("./test/event/check_osi_event.json", "r") as f:
        return json.load(f)


@pytest.fixture
def get_unreserved_concurrency_event():
    with open("./test/event/get_unreserved_concurrency_event.json", "r") as f:
        return json.load(f)


@pytest.fixture
def ddb_no_ingestion_client(iam_roles, remote_lambda):
    with mock_dynamodb():
        account_id = os.environ["ACCOUNT_ID"]
        region = os.environ["AWS_REGION"]

        make_ddb_table(
            os.environ["APPPIPELINE_TABLE"],
            pk="pipelineId",
            rows=[
                {
                    "pipelineId": "f34b2266-aee1-4266-ac25-be32421fb3e1",
                    "aosParams": {
                        "coldLogTransition": 0,
                        "domainName": "helloworld",
                        "engine": "OpenSearch",
                        "failedLogBucket": "amzn-s3-demo-logging-bucket",
                        "indexPrefix": "helloworld",
                        "logRetention": 0,
                        "opensearchArn": "arn:aws:es:us-west-2:1234567890AB:domain/helloworld",
                        "opensearchEndpoint": "vpc-helloworld-hbgb2ktamqnb5cedzrty3blelu.us-west-2.es.amazonaws.com",
                        "vpc": {
                            "privateSubnetIds": "subnet-01f09e14e5b70c11f,subnet-06843d01e3da35b7d",
                            "publicSubnetIds": "",
                            "securityGroupId": "sg-0ec6c9b448792d1e6",
                            "vpcId": "vpc-05a90814226d2c713",
                        },
                        "replicaNumbers": 0,
                        "shardNumbers": 1,
                        "warmLogTransition": "",
                        "rolloverSize": "30gb",
                    },
                    "logConfigId": "e8e52b70-e7bc-4bdb-ad60-5f1addf17387",
                    "logConfigVersionNumber": 0,
                    "createdAt": "2022-05-05T07:43:55Z",
                    "error": "",
                    "kdsParas": {
                        "enableAutoScaling": False,
                        "kdsArn": "arn:aws:kinesis:us-west-2:1234567890AB:stream/mock-kds",
                        "maxShardNumber": 0,
                        "osHelperFnArn": remote_lambda["FunctionArn"],
                        "regionName": "us-west-2",
                        "startShardNumber": 1,
                        "streamName": "mock-kds",
                    },
                    "stackId": "arn:aws:cloudformation:us-west-2:1234567890AB:stack/Solution-EKS-Cluster-PodLog-Pipeline-f34b2/1e8e2860-cc47-11ec-8d95-06039fb616cf",
                    "status": "ACTIVE",
                    "monitor": {
                        "status": "ENABLED",
                        "backupBucketName": "amzn-s3-demo-logging-bucket",
                    },
                    "tags": [],
                },
                {
                    "pipelineId": "4b5b721b-01ad-4a07-98fe-4d2a0e3ce4dc",
                    "aosParams": {
                        "coldLogTransition": 0,
                        "domainName": "helloworld",
                        "engine": "OpenSearch",
                        "failedLogBucket": "amzn-s3-demo-logging-bucket",
                        "indexPrefix": "eks-pipe2",
                        "logRetention": 0,
                        "opensearchArn": "arn:aws:es:us-west-2:1234567890AB:domain/helloworld",
                        "opensearchEndpoint": "vpc-helloworld-hbgb2ktamqnb5cedzrty3blelu.us-west-2.es.amazonaws.com",
                        "vpc": {
                            "privateSubnetIds": "subnet-01f09e14e5b70c11f,subnet-06843d01e3da35b7d",
                            "publicSubnetIds": "",
                            "securityGroupId": "sg-0ec6c9b448792d1e6",
                            "vpcId": "vpc-05a90814226d2c713",
                        },
                        "replicaNumbers": 0,
                        "shardNumbers": 1,
                        "warmLogTransition": "",
                        "rolloverSize": "30gb",
                    },
                    "logConfigId": "e8e52b70-e7bc-4bdb-ad60-5f1addf17387",
                    "logConfigVersionNumber": 0,
                    "createdAt": "2022-05-07T06:36:41Z",
                    "error": "",
                    "kdsParas": {
                        "enableAutoScaling": False,
                        "kdsArn": "arn:aws:kinesis:us-west-2:1234567890AB:stream/Solution-AppPipe-4b5b7-Stream790BDEE4-HZ4crmUd5jJ3",
                        "maxShardNumber": 0,
                        "osHelperFnArn": remote_lambda["FunctionArn"],
                        "regionName": "us-west-2",
                        "startShardNumber": 1,
                        "streamName": "Solution-AppPipe-4b5b7-Stream790BDEE4-HZ4crmUd5jJ3",
                    },
                    "stackId": "arn:aws:cloudformation:us-west-2:1234567890AB:stack/Solution-AppPipe-4b5b7/0f1cf390-cdd0-11ec-a7af-06957ff291a7",
                    "status": "ACTIVE",
                    "monitor": {
                        "status": "ENABLED",
                        "backupBucketName": "amzn-s3-demo-logging-bucket",
                    },
                    "tags": [],
                },
            ],
        )

        make_ddb_table(
            os.environ["LOG_CONFIG_TABLE"],
            pk="id",
            pk_type="S",
            sk="version",
            sk_type="N",
            rows=[
                {
                    "id": "e8e52b70-e7bc-4bdb-ad60-5f1addf17387",
                    "version": 0,
                    "name": "SpringBoot0220",
                    "createdAt": "2022-02-20T08:05:39Z",
                    "logPath": "/var/log/solution/springboot/*.log",
                    "logType": "MultiLineText",
                    "multilineLogParser": "JAVA_SPRING_BOOT",
                    "regex": REGEX,
                    "regexFieldSpecs": [
                        {"format": TIME_FORMAT, "key": "time", "type": "date"},
                        {"format": "", "key": "level", "type": "text"},
                        {"format": "", "key": "thread", "type": "text"},
                        {"format": "", "key": "logger", "type": "text"},
                        {"format": "", "key": "message", "type": "text"},
                    ],
                    "status": "ACTIVE",
                    "updatedAt": "2022-02-20T08:08:31Z",
                    "userLogFormat": "%d{yyyy-MM-dd HH:mm:ss.SSS} %-5level [%thread] %logger : %msg%n",
                },
                {
                    "id": "47b23378-4ec6-4584-b264-079c75ab2e5f",
                    "version": 0,
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
                    "status": "ACTIVE",
                },
            ],
        )

        init_ddb(
            {
                os.environ["APPLOGINGESTION_TABLE"]: [],
            }
        )

        yield


@pytest.fixture
def aos_client():
    with mock_es():
        es = boto3.client("es", region_name=os.environ.get("AWS_REGION"))
        es.create_elasticsearch_domain(DomainName="helloworld")

        aos = boto3.client("opensearch", region_name=os.environ.get("AWS_REGION"))
        aos.create_domain(DomainName="aos")
        yield


@pytest.fixture
def opensearch_client():
    with mock_opensearch():
        aos = boto3.client("opensearch", region_name=os.environ.get("AWS_REGION"))
        aos.create_domain(DomainName="aos")
        yield


light_engine_creation_event = {
    "params": {
        "stagingBucketPrefix": "/AWSLogs/test",
        "centralizedBucketName": "clo-light-engine-parquet",
        "centralizedBucketPrefix": "/test",
        "importDashboards": "false",
        "logMergerSchedule": "cron(0 1 * * ? *)",
        "logProcessorSchedule": "rate(5 minutes)",
        "logArchiveSchedule": "cron(0 2 * * ? *)",
        "logMergerAge": "7",
        "logArchiveAge": "30",
        "centralizedTableName": "test-app",
    },
    "bufferParams": [
        {"paramKey": "logBucketName", "paramValue": "test-logging-bucket"},
        {"paramKey": "logBucketPrefix", "paramValue": "/aws/logs"},
    ],
    "tags": [],
    "logConfigId": "47b23378-4ec6-4584-b264-079c75ab2e5f",
    "logConfigVersionNumber": 0,
    "force": False,
    "monitor": {
        "status": "DISABLED",
    },
}


def test_get_app_pipeline(
    kinesis_client, ddb_client, sfn_client, aos_client, iam_roles, remote_lambda
):
    from lambda_function import lambda_handler

    res = lambda_handler(
        make_graphql_lambda_event(
            "getAppPipeline", {"id": "f34b2266-aee1-4266-ac25-be32421fb3e1"}
        ),
        None,
    )

    assert res["pipelineId"] == "f34b2266-aee1-4266-ac25-be32421fb3e1"


def test_delete_app_pipeline_expect_failed(
    kinesis_client, ddb_client, sfn_client, aos_client, iam_roles, remote_lambda
):
    from lambda_function import lambda_handler

    with pytest.raises(
        Exception, match=r"Please open the pipeline and delete all log sources first."
    ):
        lambda_handler(
            make_graphql_lambda_event(
                "deleteAppPipeline", {"id": "f34b2266-aee1-4266-ac25-be32421fb3e1"}
            ),
            None,
        )


def test_delete_app_pipeline_expect_success(
    kinesis_client,
    ddb_no_ingestion_client,
    sfn_client,
    aos_client,
    iam_roles,
    remote_lambda,
):
    from lambda_function import lambda_handler

    lambda_handler(
        make_graphql_lambda_event(
            "deleteAppPipeline", {"id": "f34b2266-aee1-4266-ac25-be32421fb3e1"}
        ),
        None,
    )


def test_list_app_pipelines(
    kinesis_client,
    ddb_no_ingestion_client,
    sfn_client,
    aos_client,
    iam_roles,
    remote_lambda,
):
    from lambda_function import lambda_handler

    res = lambda_handler(
        make_graphql_lambda_event(
            "listAppPipelines",
            {
                "status": "ACTIVE",
            },
        ),
        None,
    )

    assert res["total"] == 2

    res = lambda_handler(
        make_graphql_lambda_event(
            "listAppPipelines",
            {
                "status": "DELETED",
            },
        ),
        None,
    )

    assert res["total"] == 0

    res = lambda_handler(
        make_graphql_lambda_event(
            "listAppPipelines",
            {
                "status": "",
            },
        ),
        None,
    )

    assert res["total"] == 2

    res = lambda_handler(make_graphql_lambda_event("listAppPipelines", {}), None)

    assert res["total"] == 2


def test_create_app_pipeline(
    mocker,
    kinesis_client,
    ddb_no_ingestion_client,
    sfn_client,
    aos_client,
    iam_roles,
    remote_lambda,
):
    mocker.patch("lambda_function.post_simulate_index_template", side_effect=ValueError)

    from lambda_function import lambda_handler

    lambda_handler(
        make_graphql_lambda_event(
            "createAppPipeline",
            {
                "aosParams": {
                    "opensearchArn": "arn:aws:es:us-west-2:1234567890AB:domain/helloworld",
                    "opensearchEndpoint": "vpc-helloworld-hbgb2ktamqnb5cedzrty3blelu.us-west-2.es.amazonaws.com",
                    "domainName": "helloworld",
                    "indexPrefix": "spring",
                    "warmLogTransition": "1d",
                    "coldLogTransition": "2d",
                    "logRetention": "3d",
                    "rolloverSize": "300gb",
                    "codec": "default",
                    "indexSuffix": "yyyy-MM-dd",
                    "refreshInterval": "1s",
                    "shardNumbers": 5,
                    "replicaNumbers": 1,
                    "engine": "OpenSearch",
                    "vpc": {
                        "privateSubnetIds": "subnet-01f09e14e5b70c11f,subnet-06843d01e3da35b7d",
                        "publicSubnetIds": "",
                        "securityGroupId": "sg-0ec6c9b448792d1e6",
                        "vpcId": "vpc-05a90814226d2c713",
                    },
                    "failedLogBucket": "amzn-s3-demo-logging-bucket",
                },
                "bufferType": "KDS",
                "bufferParams": [
                    {"paramKey": "enableAutoScaling", "paramValue": "false"},
                    {"paramKey": "shardCount", "paramValue": "1"},
                    {"paramKey": "minCapacity", "paramValue": "1"},
                    {"paramKey": "maxCapacity", "paramValue": "5"},
                ],
                "tags": [],
                "logConfigId": "47b23378-4ec6-4584-b264-079c75ab2e5f",
                "logConfigVersionNumber": 0,
                "force": False,
                "logProcessorConcurrency": "200",
                "monitor": {
                    "status": "ENABLED",
                    "backupBucketName": "amzn-s3-demo-logging-bucket",
                },
            },
        ),
        None,
    )

    res = lambda_handler(
        make_graphql_lambda_event(
            "listAppPipelines",
            {
                "status": "CREATING",
            },
        ),
        None,
    )

    assert res["total"] == 1

    with pytest.raises(APIException):
        lambda_handler(
            make_graphql_lambda_event(
                "createAppPipeline",
                {
                    "aosParams": {
                        "opensearchArn": "arn:aws:es:us-west-2:1234567890AB:domain/helloworld",
                        "opensearchEndpoint": "vpc-helloworld-hbgb2ktamqnb5cedzrty3blelu.us-west-2.es.amazonaws.com",
                        "domainName": "helloworld",
                        "indexPrefix": "spring",
                        "warmLogTransition": "1d",
                        "coldLogTransition": "2d",
                        "logRetention": "3d",
                        "rolloverSize": "300gb",
                        "codec": "default",
                        "indexSuffix": "yyyy-MM-dd",
                        "refreshInterval": "1s",
                        "shardNumbers": 5,
                        "replicaNumbers": 1,
                        "engine": "OpenSearch",
                        "vpc": {
                            "privateSubnetIds": "subnet-01f09e14e5b70c11f,subnet-06843d01e3da35b7d",
                            "publicSubnetIds": "",
                            "securityGroupId": "sg-0ec6c9b448792d1e6",
                            "vpcId": "vpc-05a90814226d2c713",
                        },
                        "failedLogBucket": "amzn-s3-demo-logging-bucket",
                    },
                    "bufferType": "KDS",
                    "bufferParams": [
                        {"paramKey": "enableAutoScaling", "paramValue": "false"},
                        {"paramKey": "shardCount", "paramValue": "1"},
                        {"paramKey": "minCapacity", "paramValue": "1"},
                        {"paramKey": "maxCapacity", "paramValue": "5"},
                    ],
                    "logConfigId": "47b23378-4ec6-4584-b264-079c75ab2e5f",
                    "logConfigVersionNumber": 0,
                    "force": False,
                    "logProcessorConcurrency": "200",
                    "monitor": {
                        "status": "ENABLED",
                        "backupBucketName": "amzn-s3-demo-logging-bucket",
                    },
                    "tags": [],
                },
            ),
            None,
        )

    pipeline_id = lambda_handler(
        make_graphql_lambda_event(
            "createAppPipeline",
            {
                "aosParams": {
                    "opensearchArn": "arn:aws:es:us-west-2:1234567890AB:domain/new-domain-name",
                    "opensearchEndpoint": "vpc-new-domain-name-hbgb2ktamqnb5cedzrty3blelu.us-west-2.es.amazonaws.com",
                    "domainName": "new-domain-name",
                    "indexPrefix": "spring",
                    "warmLogTransition": "1d",
                    "coldLogTransition": "2d",
                    "logRetention": "3d",
                    "rolloverSize": "300gb",
                    "codec": "default",
                    "indexSuffix": "yyyy-MM-dd",
                    "refreshInterval": "1s",
                    "shardNumbers": 5,
                    "replicaNumbers": 1,
                    "engine": "OpenSearch",
                    "vpc": {
                        "privateSubnetIds": "subnet-01f09e14e5b70c11f,subnet-06843d01e3da35b7d",
                        "publicSubnetIds": "",
                        "securityGroupId": "sg-0ec6c9b448792d1e6",
                        "vpcId": "vpc-05a90814226d2c713",
                    },
                    "failedLogBucket": "amzn-s3-demo-logging-bucket",
                },
                "bufferType": "KDS",
                "bufferParams": [
                    {"paramKey": "enableAutoScaling", "paramValue": "false"},
                    {"paramKey": "shardCount", "paramValue": "1"},
                    {"paramKey": "minCapacity", "paramValue": "1"},
                    {"paramKey": "maxCapacity", "paramValue": "5"},
                ],
                "tags": [],
                "logConfigId": "47b23378-4ec6-4584-b264-079c75ab2e5f",
                "logConfigVersionNumber": 0,
                "force": False,
                "logProcessorConcurrency": "200",
                "monitor": {
                    "status": "ENABLED",
                    "backupBucketName": "amzn-s3-demo-logging-bucket",
                },
            },
        ),
        None,
    )
    print("pipeline_id", pipeline_id)

    client = boto3.client("kinesis")
    client.create_stream(StreamName=f"CL-kds-{pipeline_id}", ShardCount=5)

    res = lambda_handler(
        make_graphql_lambda_event(
            "getAppPipeline",
            {"id": pipeline_id},
        ),
        None,
    )

    assert res["status"] == "CREATING"


def test_put_light_engine_app_pipeline(mocker, ddb_client, sfn_client):
    from lambda_function import lambda_handler

    creation_event = make_graphql_lambda_event(
        "createLightEngineAppPipeline", light_engine_creation_event
    )

    pipeline_id = lambda_handler(creation_event, None)
    assert pipeline_id is not None
    pipeline = lambda_handler(
        make_graphql_lambda_event("getAppPipeline", {"id": pipeline_id}),
        None,
    )
    assert (
        pipeline["lightEngineParams"]["centralizedBucketName"]
        == "clo-light-engine-parquet"
    )


def test_put_light_engine_app_with_alarm_arn(
    mocker,
    ddb_client,
    sfn_client,
):
    from lambda_function import lambda_handler

    creation_event = make_graphql_lambda_event(
        "createLightEngineAppPipeline",
        {
            **light_engine_creation_event,
            "monitor": {
                "status": "ENABLED",
                "backupBucketName": "",
                "errorLogPrefix": "error/APPLogs/index-prefix=/",
                "pipelineAlarmStatus": "ENABLED",
                "snsTopicName": "",
                "snsTopicArn": "arn:aws:sns:us-east-1:12345:test-topic",
                "emails": "",
            },
        },
    )

    pipeline_id = lambda_handler(creation_event, None)
    assert pipeline_id is not None
    pipeline = lambda_handler(
        make_graphql_lambda_event("getAppPipeline", {"id": pipeline_id}),
        None,
    )
    assert (
        pipeline["lightEngineParams"]["recipients"]
        == "arn:aws:sns:us-east-1:12345:test-topic"
    )


def test_put_light_engine_app_with_alarm_name(
    mocker,
    ddb_client,
    sfn_client,
):
    from lambda_function import lambda_handler

    creation_event = make_graphql_lambda_event(
        "createLightEngineAppPipeline",
        {
            **light_engine_creation_event,
            "monitor": {
                "status": "ENABLED",
                "backupBucketName": "",
                "errorLogPrefix": "error/APPLogs/index-prefix=/",
                "pipelineAlarmStatus": "ENABLED",
                "snsTopicName": "test-topic",
                "snsTopicArn": "",
                "emails": "alejandro_rosalez@example.org",
            },
        },
    )

    pipeline_id = lambda_handler(creation_event, None)
    assert pipeline_id is not None
    pipeline = lambda_handler(
        make_graphql_lambda_event("getAppPipeline", {"id": pipeline_id}),
        None,
    )
    assert (
        pipeline["lightEngineParams"]["recipients"]
        == f"arn:aws:sns:us-east-1:12345678:test-topic_{pipeline_id[:8]}"
    )


def test_get_glue_table_info(glue_client, ddb_client):
    from lambda_function import (
        AppPipeline,
        EngineType,
        BufferTypeEnum,
        get_glue_table_info,
    )
    from commonlib.model import (
        LightEngineParams,
        MonitorDetail,
        OpenSearchIngestionInput,
        PipelineMonitorStatus,
    )

    pipeline_id = os.environ["LIGHT_ENGINE_APP_PIPELINE_ID"]
    buffer_params = [
        {"paramKey": "logBucketName", "paramValue": "logging-bucket"},
        {"paramKey": "logBucketPrefix", "paramValue": "LightEngine/AppLogs/test/"},
        {"paramKey": "logBucketSuffix", "paramValue": ""},
        {
            "paramKey": "defaultCmkArn",
            "paramValue": "arn:aws:kms:us-east-1:123456789012:key/0000",
        },
        {"paramKey": "maxFileSize", "paramValue": "50"},
        {"paramKey": "uploadTimeout", "paramValue": "60"},
        {"paramKey": "compressionType", "paramValue": "GZIP"},
        {"paramKey": "s3StorageClass", "paramValue": "INTELLIGENT_TIERING"},
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

    light_engine_app_pipeline = AppPipeline(
        pipelineId=pipeline_id,
        bufferType=BufferTypeEnum.S3,
        bufferParams=buffer_params,
        logConfigId="30f5569e-faae-41de-bea8-4a5b2f4a5491",
        logConfigVersionNumber=1,
        tags=[],
        monitor=MonitorDetail(status=PipelineMonitorStatus.DISABLED),
        osiParams=OpenSearchIngestionInput(maxCapacity=0, minCapacity=0),
        engineType=EngineType.LIGHT_ENGINE,
        lightEngineParams=light_engine_params,
    )

    response = get_glue_table_info(app_pipeline=light_engine_app_pipeline)
    assert response == {
        "table": {
            "databaseName": "centralized",
            "tableName": "waf",
            "location": "s3://centralized-bucket/datalake/centralized/waf",
            "classification": "parquet",
            "dashboardName": "waf-details",
            "dashboardLink": f"https://alb.us-east-1.elb.amazonaws.com/d/{pipeline_id}-00",
        },
        "metric": {
            "databaseName": "centralized",
            "tableName": "waf_metrics",
            "location": "s3://centralized-bucket/datalake/centralized/waf_metrics",
            "classification": "parquet",
        },
    }

    light_engine_app_pipeline.lightEngineParams.importDashboards = "false"
    response = get_glue_table_info(app_pipeline=light_engine_app_pipeline)
    assert response == {
        "table": {
            "databaseName": "centralized",
            "tableName": "waf",
            "location": "s3://centralized-bucket/datalake/centralized/waf",
            "classification": "parquet",
        },
        "metric": {
            "databaseName": "centralized",
            "tableName": "waf_metrics",
            "location": "s3://centralized-bucket/datalake/centralized/waf_metrics",
            "classification": "parquet",
        },
    }
    light_engine_app_pipeline.lightEngineParams.importDashboards = "true"

    light_engine_app_pipeline.lightEngineParams.centralizedMetricsTableName = (
        "do-not-exists-table"
    )
    response = get_glue_table_info(app_pipeline=light_engine_app_pipeline)
    assert response == {
        "table": {
            "databaseName": "centralized",
            "tableName": "waf",
            "location": "s3://centralized-bucket/datalake/centralized/waf",
            "classification": "parquet",
            "dashboardName": "waf-details",
            "dashboardLink": f"https://alb.us-east-1.elb.amazonaws.com/d/{pipeline_id}-00",
        },
    }
    light_engine_app_pipeline.lightEngineParams.centralizedMetricsTableName = (
        "waf_metrics"
    )


def test_get_scheduler_expression(events_client, scheduler_client):
    from lambda_function import get_scheduler_expression, conn

    light_engine_app_pipeline_id = os.environ["LIGHT_ENGINE_APP_PIPELINE_ID"]

    events = conn.get_client("events")
    response = get_scheduler_expression(
        name="do-not-exists", group="default", client=events
    )
    assert response == ""

    response = get_scheduler_expression(
        name=f"LogProcessor-{light_engine_app_pipeline_id}",
        group="default",
        client=events,
    )
    assert response == "rate(5 minutes)"

    response = get_scheduler_expression(
        name=f"LogMerger-{light_engine_app_pipeline_id}", group="default", client=events
    )
    assert response == "cron(0 1 * * ? *)"

    response = get_scheduler_expression(
        name=f"LogMergerForMetrics-{light_engine_app_pipeline_id}",
        group="default",
        client=events,
    )
    assert response == "cron(0 1 * * ? *)"

    response = get_scheduler_expression(
        name=f"LogArchive-{light_engine_app_pipeline_id}",
        group="default",
        client=events,
    )
    assert response == "cron(0 2 * * ? *)"

    scheduler = conn.get_client("scheduler")
    response = get_scheduler_expression(
        name="do-not-exists", group=light_engine_app_pipeline_id, client=scheduler
    )
    assert response == ""

    response = get_scheduler_expression(
        name="LogProcessor", group=light_engine_app_pipeline_id, client=scheduler
    )
    assert response == "rate(5 minutes)"

    response = get_scheduler_expression(
        name="LogMerger", group=light_engine_app_pipeline_id, client=scheduler
    )
    assert response == "cron(0 1 * * ? *)"

    response = get_scheduler_expression(
        name="LogMergerForMetrics", group=light_engine_app_pipeline_id, client=scheduler
    )
    assert response == "cron(0 1 * * ? *)"

    response = get_scheduler_expression(
        name="LogArchive", group=light_engine_app_pipeline_id, client=scheduler
    )
    assert response == "cron(0 2 * * ? *)"


def test_get_schedules_info(ddb_client, events_client, scheduler_client):
    from lambda_function import (
        AppPipeline,
        EngineType,
        BufferTypeEnum,
        get_schedules_info,
        metadata_table,
    )
    from commonlib.model import (
        LightEngineParams,
        MonitorDetail,
        OpenSearchIngestionInput,
        PipelineMonitorStatus,
    )

    pipeline_id = os.environ["LIGHT_ENGINE_APP_PIPELINE_ID"]
    buffer_params = [
        {"paramKey": "logBucketName", "paramValue": "logging-bucket"},
        {"paramKey": "logBucketPrefix", "paramValue": "LightEngine/AppLogs/test/"},
        {"paramKey": "logBucketSuffix", "paramValue": ""},
        {
            "paramKey": "defaultCmkArn",
            "paramValue": "arn:aws:kms:us-east-1:123456789012:key/0000",
        },
        {"paramKey": "maxFileSize", "paramValue": "50"},
        {"paramKey": "uploadTimeout", "paramValue": "60"},
        {"paramKey": "compressionType", "paramValue": "GZIP"},
        {"paramKey": "s3StorageClass", "paramValue": "INTELLIGENT_TIERING"},
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

    light_engine_app_pipeline = AppPipeline(
        pipelineId=pipeline_id,
        bufferType=BufferTypeEnum.S3,
        bufferParams=buffer_params,
        logConfigId="30f5569e-faae-41de-bea8-4a5b2f4a5491",
        logConfigVersionNumber=1,
        tags=[],
        monitor=MonitorDetail(status=PipelineMonitorStatus.DISABLED),
        osiParams=OpenSearchIngestionInput(maxCapacity=0, minCapacity=0),
        engineType=EngineType.LIGHT_ENGINE,
        lightEngineParams=light_engine_params,
    )

    response = get_schedules_info(app_pipeline=light_engine_app_pipeline)
    assert response == [
        {
            "type": "LogProcessor",
            "stateMachine": {
                "arn": "arn:aws:states:us-east-1:123456789012:stateMachine:LogProcessor-CBiU8jrNn8FS",
                "name": "LogProcessor-CBiU8jrNn8FS",
            },
            "scheduler": {
                "type": "EventBridgeScheduler",
                "group": "c5840c23-79c2-4bf5-b35d-025dad5ba254",
                "name": "LogProcessor",
                "expression": "rate(5 minutes)",
            },
        },
        {
            "type": "LogMerger",
            "stateMachine": {
                "arn": "arn:aws:states:us-east-1:123456789012:stateMachine:LogMerger-hymPoOLJPnU2",
                "name": "LogMerger-hymPoOLJPnU2",
            },
            "scheduler": {
                "type": "EventBridgeScheduler",
                "group": "c5840c23-79c2-4bf5-b35d-025dad5ba254",
                "name": "LogMerger",
                "expression": "cron(0 1 * * ? *)",
                "age": "1",
            },
        },
        {
            "type": "LogMergerForMetrics",
            "stateMachine": {
                "arn": "arn:aws:states:us-east-1:123456789012:stateMachine:LogMerger-hymPoOLJPnU2",
                "name": "LogMerger-hymPoOLJPnU2",
            },
            "scheduler": {
                "type": "EventBridgeScheduler",
                "group": "c5840c23-79c2-4bf5-b35d-025dad5ba254",
                "name": "LogMergerForMetrics",
                "expression": "cron(0 1 * * ? *)",
                "age": "1",
            },
        },
        {
            "type": "LogArchive",
            "stateMachine": {
                "arn": "arn:aws:states:us-east-1:123456789012:stateMachine:LogArchive-qbjgRlBep0gT",
                "name": "LogArchive-qbjgRlBep0gT",
            },
            "scheduler": {
                "type": "EventBridgeScheduler",
                "group": "c5840c23-79c2-4bf5-b35d-025dad5ba254",
                "name": "LogArchive",
                "expression": "cron(0 2 * * ? *)",
                "age": "7",
            },
        },
    ]

    metadata_table.update_item(
        key={"metaName": "AvailableServices"},
        attributes_map={"value": ["ec2", "events"]},
    )
    response = get_schedules_info(app_pipeline=light_engine_app_pipeline)
    assert response == [
        {
            "type": "LogProcessor",
            "stateMachine": {
                "arn": "arn:aws:states:us-east-1:123456789012:stateMachine:LogProcessor-CBiU8jrNn8FS",
                "name": "LogProcessor-CBiU8jrNn8FS",
            },
            "scheduler": {
                "type": "EventBridgeEvents",
                "group": "default",
                "name": f"LogProcessor-{pipeline_id}",
                "expression": "rate(5 minutes)",
            },
        },
        {
            "type": "LogMerger",
            "stateMachine": {
                "arn": "arn:aws:states:us-east-1:123456789012:stateMachine:LogMerger-hymPoOLJPnU2",
                "name": "LogMerger-hymPoOLJPnU2",
            },
            "scheduler": {
                "type": "EventBridgeEvents",
                "group": "default",
                "name": f"LogMerger-{pipeline_id}",
                "expression": "cron(0 1 * * ? *)",
                "age": "1",
            },
        },
        {
            "type": "LogMergerForMetrics",
            "stateMachine": {
                "arn": "arn:aws:states:us-east-1:123456789012:stateMachine:LogMerger-hymPoOLJPnU2",
                "name": "LogMerger-hymPoOLJPnU2",
            },
            "scheduler": {
                "type": "EventBridgeEvents",
                "group": "default",
                "name": f"LogMergerForMetrics-{pipeline_id}",
                "expression": "cron(0 1 * * ? *)",
                "age": "1",
            },
        },
        {
            "type": "LogArchive",
            "stateMachine": {
                "arn": "arn:aws:states:us-east-1:123456789012:stateMachine:LogArchive-qbjgRlBep0gT",
                "name": "LogArchive-qbjgRlBep0gT",
            },
            "scheduler": {
                "type": "EventBridgeEvents",
                "group": "default",
                "name": f"LogArchive-{pipeline_id}",
                "expression": "cron(0 2 * * ? *)",
                "age": "7",
            },
        },
    ]


def test_get_light_engine_app_pipeline_detail(
    ddb_client, glue_client, events_client, scheduler_client
):
    from lambda_function import (
        AppPipeline,
        EngineType,
        BufferTypeEnum,
        AppPipelineDao,
        get_light_engine_app_pipeline_detail,
        metadata_table,
    )
    from commonlib.model import (
        LightEngineParams,
        MonitorDetail,
        OpenSearchIngestionInput,
        PipelineMonitorStatus,
    )

    pipeline_id = os.environ["LIGHT_ENGINE_APP_PIPELINE_ID"]
    app_pipeline_table_name = os.environ["APPPIPELINE_TABLE"]
    buffer_params = [
        {"paramKey": "logBucketName", "paramValue": "logging-bucket"},
        {"paramKey": "logBucketPrefix", "paramValue": "LightEngine/AppLogs/test/"},
        {"paramKey": "logBucketSuffix", "paramValue": ""},
        {
            "paramKey": "defaultCmkArn",
            "paramValue": "arn:aws:kms:us-east-1:123456789012:key/0000",
        },
        {"paramKey": "maxFileSize", "paramValue": "50"},
        {"paramKey": "uploadTimeout", "paramValue": "60"},
        {"paramKey": "compressionType", "paramValue": "GZIP"},
        {"paramKey": "s3StorageClass", "paramValue": "INTELLIGENT_TIERING"},
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

    light_engine_app_pipeline = AppPipeline(
        pipelineId=pipeline_id,
        bufferType=BufferTypeEnum.S3,
        bufferParams=buffer_params,
        logConfigId="30f5569e-faae-41de-bea8-4a5b2f4a5491",
        logConfigVersionNumber=1,
        tags=[],
        monitor=MonitorDetail(status=PipelineMonitorStatus.DISABLED),
        osiParams=OpenSearchIngestionInput(maxCapacity=0, minCapacity=0),
        engineType=EngineType.LIGHT_ENGINE,
        lightEngineParams=light_engine_params,
    )

    app_pipeline_dao = AppPipelineDao(app_pipeline_table_name)
    app_pipeline_dao.save(app_pipeline=light_engine_app_pipeline)

    with pytest.raises(KeyError):
        get_light_engine_app_pipeline_detail()

    response = get_light_engine_app_pipeline_detail(pipelineId=pipeline_id)
    assert response == {
        "analyticsEngine": {
            "engineType": "LightEngine",
            "table": {
                "databaseName": "centralized",
                "tableName": "waf",
                "location": "s3://centralized-bucket/datalake/centralized/waf",
                "classification": "parquet",
                "dashboardName": "waf-details",
                "dashboardLink": f"https://alb.us-east-1.elb.amazonaws.com/d/{pipeline_id}-00",
            },
            "metric": {
                "databaseName": "centralized",
                "tableName": "waf_metrics",
                "location": "s3://centralized-bucket/datalake/centralized/waf_metrics",
                "classification": "parquet",
            },
        },
        "schedules": [
            {
                "type": "LogProcessor",
                "stateMachine": {
                    "arn": "arn:aws:states:us-east-1:123456789012:stateMachine:LogProcessor-CBiU8jrNn8FS",
                    "name": "LogProcessor-CBiU8jrNn8FS",
                },
                "scheduler": {
                    "type": "EventBridgeScheduler",
                    "group": "c5840c23-79c2-4bf5-b35d-025dad5ba254",
                    "name": "LogProcessor",
                    "expression": "rate(5 minutes)",
                },
            },
            {
                "type": "LogMerger",
                "stateMachine": {
                    "arn": "arn:aws:states:us-east-1:123456789012:stateMachine:LogMerger-hymPoOLJPnU2",
                    "name": "LogMerger-hymPoOLJPnU2",
                },
                "scheduler": {
                    "type": "EventBridgeScheduler",
                    "group": "c5840c23-79c2-4bf5-b35d-025dad5ba254",
                    "name": "LogMerger",
                    "expression": "cron(0 1 * * ? *)",
                    "age": "1",
                },
            },
            {
                "type": "LogMergerForMetrics",
                "stateMachine": {
                    "arn": "arn:aws:states:us-east-1:123456789012:stateMachine:LogMerger-hymPoOLJPnU2",
                    "name": "LogMerger-hymPoOLJPnU2",
                },
                "scheduler": {
                    "type": "EventBridgeScheduler",
                    "group": "c5840c23-79c2-4bf5-b35d-025dad5ba254",
                    "name": "LogMergerForMetrics",
                    "expression": "cron(0 1 * * ? *)",
                    "age": "1",
                },
            },
            {
                "type": "LogArchive",
                "stateMachine": {
                    "arn": "arn:aws:states:us-east-1:123456789012:stateMachine:LogArchive-qbjgRlBep0gT",
                    "name": "LogArchive-qbjgRlBep0gT",
                },
                "scheduler": {
                    "type": "EventBridgeScheduler",
                    "group": "c5840c23-79c2-4bf5-b35d-025dad5ba254",
                    "name": "LogArchive",
                    "expression": "cron(0 2 * * ? *)",
                    "age": "7",
                },
            },
        ],
    }


def test_check_osis_availability(iam_roles, check_osi_event):
    from lambda_function import lambda_handler

    res = lambda_handler(
        check_osi_event,
        None,
    )

    assert res == True


def test_get_account_unreserved_conurrency(iam_roles, get_unreserved_concurrency_event):
    from lambda_function import lambda_handler

    res = lambda_handler(
        get_unreserved_concurrency_event,
        None,
    )

    assert res == 0


def test_get_light_engine_app_pipeline_logs(ddb_client):
    from lambda_function import get_light_engine_app_pipeline_logs

    request = {
        "pipelineId": "3d37e69e-7129-461e-b4b8-4a8e72eb5b80",
        "stateMachineName": "LogProcessor-u5TUghpQChw4",
        "type": "LogProcessor",
    }

    response = get_light_engine_app_pipeline_logs(**request)
    assert response["items"] == [
        {
            "executionName": "3ad531f6-e158-4f2b-afa4-ee6292e0434d",
            "taskId": "00000000-0000-0000-0000-000000000000",
            "endTime": "2023-10-16T04:18:37.150Z",
            "startTime": "2023-10-16T04:18:38.272Z",
            "status": "Running",
            "executionArn": "arn:aws:states:us-east-1:12345678:execution:LogProcessor-u5TUghpQChw4:3ad531f6-e158-4f2b-afa4-ee6292e0434d",
        },
        {
            "executionName": "3c38d333-a3a5-46f3-8791-36f203b5b98e",
            "taskId": "00000000-0000-0000-0000-000000000000",
            "startTime": "2023-10-16T04:13:38.272Z",
            "endTime": "2023-10-16T04:13:37.150Z",
            "status": "Running",
            "executionArn": "arn:aws:states:us-east-1:12345678:execution:LogProcessor-u5TUghpQChw4:3c38d333-a3a5-46f3-8791-36f203b5b98e",
        },
        {
            "executionName": "47eae851-54c1-447d-a394-330469b95966",
            "taskId": "00000000-0000-0000-0000-000000000000",
            "endTime": "2023-10-16T04:08:37.150Z",
            "startTime": "2023-10-16T04:08:38.272Z",
            "status": "Failed",
            "executionArn": "arn:aws:states:us-east-1:12345678:execution:LogProcessor-u5TUghpQChw4:47eae851-54c1-447d-a394-330469b95966",
        },
        {
            "executionName": "70fa7767-82e9-469c-97ee-4fb071339ad9",
            "taskId": "00000000-0000-0000-0000-000000000000",
            "startTime": "2023-10-16T04:03:38.272Z",
            "endTime": "2023-10-16T04:03:37.150Z",
            "status": "Aborted",
            "executionArn": "arn:aws:states:us-east-1:12345678:execution:LogProcessor-u5TUghpQChw4:70fa7767-82e9-469c-97ee-4fb071339ad9",
        },
        {
            "executionName": "0f0a0643-748d-4bbf-a673-4aca6dc6838a",
            "taskId": "00000000-0000-0000-0000-000000000000",
            "startTime": "2023-10-16T03:58:34.272Z",
            "endTime": "2023-10-16T03:58:36.150Z",
            "status": "Timed_out",
            "executionArn": "arn:aws:states:us-east-1:12345678:execution:LogProcessor-u5TUghpQChw4:0f0a0643-748d-4bbf-a673-4aca6dc6838a",
        },
        {
            "executionName": "775b1764-c0cf-481e-9561-873841507ebc",
            "taskId": "00000000-0000-0000-0000-000000000000",
            "startTime": "2023-10-16T03:53:34.152Z",
            "endTime": "2023-10-16T03:53:36.230Z",
            "status": "Succeeded",
            "executionArn": "arn:aws:states:us-east-1:12345678:execution:LogProcessor-u5TUghpQChw4:775b1764-c0cf-481e-9561-873841507ebc",
        },
        {
            "executionName": "88652cb2-812f-4574-af3e-0094fda842d2",
            "taskId": "00000000-0000-0000-0000-000000000000",
            "startTime": "2023-10-16T03:48:34.852Z",
            "endTime": "2023-10-16T03:48:36.340Z",
            "status": "Succeeded",
            "executionArn": "arn:aws:states:us-east-1:12345678:execution:LogProcessor-u5TUghpQChw4:88652cb2-812f-4574-af3e-0094fda842d2",
        },
    ]

    request = {
        "pipelineId": "3d37e69e-7129-461e-b4b8-4a8e72eb5b80",
        "stateMachineName": "LogProcessor-u5TUghpQChw4",
        "type": "LogProcessor",
        "startTime": "2023-10-16T03:48:33.000Z",
        "endTime": "2023-10-16T03:53:34.152Z",
        "status": "Succeeded",
    }

    response = get_light_engine_app_pipeline_logs(**request)
    assert response["items"] == [
        {
            "executionName": "775b1764-c0cf-481e-9561-873841507ebc",
            "taskId": "00000000-0000-0000-0000-000000000000",
            "startTime": "2023-10-16T03:53:34.152Z",
            "endTime": "2023-10-16T03:53:36.230Z",
            "status": "Succeeded",
            "executionArn": "arn:aws:states:us-east-1:12345678:execution:LogProcessor-u5TUghpQChw4:775b1764-c0cf-481e-9561-873841507ebc",
        },
        {
            "executionName": "88652cb2-812f-4574-af3e-0094fda842d2",
            "taskId": "00000000-0000-0000-0000-000000000000",
            "startTime": "2023-10-16T03:48:34.852Z",
            "endTime": "2023-10-16T03:48:36.340Z",
            "status": "Succeeded",
            "executionArn": "arn:aws:states:us-east-1:12345678:execution:LogProcessor-u5TUghpQChw4:88652cb2-812f-4574-af3e-0094fda842d2",
        },
    ]

    request = {
        "pipelineId": "3d37e69e-7129-461e-b4b8-4a8e72eb5b80",
        "stateMachineName": "LogProcessor-u5TUghpQChw4",
        "type": "LogProcessor",
        "startTime": "2023-10-16T03:48:33.000Z",
        "status": "Running",
        "limit": 1,
    }
    response = get_light_engine_app_pipeline_logs(**request)
    assert response["items"] == [
        {
            "executionName": "3ad531f6-e158-4f2b-afa4-ee6292e0434d",
            "taskId": "00000000-0000-0000-0000-000000000000",
            "startTime": "2023-10-16T04:18:38.272Z",
            "endTime": "2023-10-16T04:18:37.150Z",
            "status": "Running",
            "executionArn": "arn:aws:states:us-east-1:12345678:execution:LogProcessor-u5TUghpQChw4:3ad531f6-e158-4f2b-afa4-ee6292e0434d",
        }
    ]
    request = {
        "pipelineId": "3d37e69e-7129-461e-b4b8-4a8e72eb5b80",
        "stateMachineName": "LogProcessor-u5TUghpQChw4",
        "type": "LogProcessor",
        "startTime": "2023-10-16T03:48:33.000Z",
        "status": "Running",
        "limit": 1,
        "lastEvaluatedKey": response.get("lastEvaluatedKey"),
    }
    response = get_light_engine_app_pipeline_logs(**request)
    assert response["items"] == [
        {
            "executionName": "3c38d333-a3a5-46f3-8791-36f203b5b98e",
            "taskId": "00000000-0000-0000-0000-000000000000",
            "startTime": "2023-10-16T04:13:38.272Z",
            "endTime": "2023-10-16T04:13:37.150Z",
            "status": "Running",
            "executionArn": "arn:aws:states:us-east-1:12345678:execution:LogProcessor-u5TUghpQChw4:3c38d333-a3a5-46f3-8791-36f203b5b98e",
        },
    ]
    request = {
        "pipelineId": "3d37e69e-7129-461e-b4b8-4a8e72eb5b80",
        "stateMachineName": "LogProcessor-u5TUghpQChw4",
        "type": "LogProcessor",
        "startTime": "2023-10-16T03:48:33.000Z",
        "status": "Running",
        "limit": 1,
        "lastEvaluatedKey": response.get("lastEvaluatedKey"),
    }
    response = get_light_engine_app_pipeline_logs(**request)
    assert response["items"] == []


class TestAppPipelineAnalyzer:

    def test_validate_yaml_syntax(self):
        from lambda_function import AppPipelineAnalyzer

        content_string = "key: value\n    sub-key: sub-value"
        analyzer = AppPipelineAnalyzer(content_string)
        assert analyzer.response == {
            "findings": [
                {
                    "findingDetails": "The YAML file has syntax error, please fix all syntax error and upload again.",
                    "findingType": "ERROR",
                    "issueCode": "YAML_SYNTAX_ERROR",
                    "location": {"path": ""},
                }
            ],
            "resolvers": [],
        }

        content_string = "key: value"
        analyzer = AppPipelineAnalyzer(content_string)
        assert analyzer.response == {
            "findings": [],
            "resolvers": [],
        }

    def test_is_numeric(self):
        from lambda_function import AppPipelineAnalyzer

        content_string = "app_pipelines:\n- id: bb7754e0-129a-40c0-bed0-e4e7342184ee\n  logConfigName: SpringBoot0220\n  logConfigVersionNumber: 1"
        analyzer = AppPipelineAnalyzer(content_string)
        assert analyzer._is_numeric("1") is True
        assert analyzer._is_numeric(1) is True
        assert analyzer._is_numeric("a") is False

    def test_is_boolean(self):
        from lambda_function import AppPipelineAnalyzer

        content_string = "app_pipelines:\n- id: bb7754e0-129a-40c0-bed0-e4e7342184ee\n  logConfigName: SpringBoot0220\n  logConfigVersionNumber: 1"
        analyzer = AppPipelineAnalyzer(content_string)
        assert analyzer._is_boolean(True) is True
        assert analyzer._is_boolean(False) is True
        assert analyzer._is_boolean(5) is True
        assert analyzer._is_boolean(0) is True
        assert analyzer._is_boolean("True") is True
        assert analyzer._is_boolean("true") is True
        assert analyzer._is_boolean("False") is True
        assert analyzer._is_boolean("false") is True
        assert analyzer._is_boolean("Yes") is True
        assert analyzer._is_boolean("yes") is True
        assert analyzer._is_boolean("No") is True
        assert analyzer._is_boolean("no") is True
        assert analyzer._is_boolean("test") is False

    def test_is_time(self):
        from lambda_function import AppPipelineAnalyzer

        content_string = "app_pipelines:\n- id: bb7754e0-129a-40c0-bed0-e4e7342184ee\n  logConfigName: SpringBoot0220\n  logConfigVersionNumber: 1"
        analyzer = AppPipelineAnalyzer(content_string)
        assert analyzer._is_time("1s") is True
        assert analyzer._is_time("1m") is True
        assert analyzer._is_time("1h") is True
        assert analyzer._is_time("1d") is True
        assert analyzer._is_time("1ms") is True
        assert analyzer._is_time("1micros") is True
        assert analyzer._is_time("d") is False
        assert analyzer._is_time("ms") is False
        assert analyzer._is_time("micros") is False
        assert analyzer._is_time("xxx") is False

    def test_is_bytes(self):
        from lambda_function import AppPipelineAnalyzer

        content_string = "app_pipelines:\n- id: bb7754e0-129a-40c0-bed0-e4e7342184ee\n  logConfigName: SpringBoot0220\n  logConfigVersionNumber: 1"
        analyzer = AppPipelineAnalyzer(content_string)
        assert analyzer._is_bytes("1b") is True
        assert analyzer._is_bytes("1kb") is True
        assert analyzer._is_bytes("1mb") is True
        assert analyzer._is_bytes("1gb") is True
        assert analyzer._is_bytes("1tb") is True
        assert analyzer._is_bytes("1pb") is True
        assert analyzer._is_bytes("b") is False
        assert analyzer._is_bytes("kb") is False
        assert analyzer._is_bytes("xxx") is False

    def test_parse_boolean_value(self):
        from lambda_function import AppPipelineAnalyzer

        content_string = "app_pipelines:\n- id: bb7754e0-129a-40c0-bed0-e4e7342184ee\n  logConfigName: SpringBoot0220\n  logConfigVersionNumber: 1"
        analyzer = AppPipelineAnalyzer(content_string)
        assert analyzer._parse_boolean_value(True) is True
        assert analyzer._parse_boolean_value(False) is False
        assert analyzer._parse_boolean_value(5) is True
        assert analyzer._parse_boolean_value(0) is False
        assert analyzer._parse_boolean_value("True") is True
        assert analyzer._parse_boolean_value("true") is True
        assert analyzer._parse_boolean_value("False") is False
        assert analyzer._parse_boolean_value("false") is False
        assert analyzer._parse_boolean_value("Yes") is True
        assert analyzer._parse_boolean_value("yes") is True
        assert analyzer._parse_boolean_value("No") is False
        assert analyzer._parse_boolean_value("no") is False
        assert analyzer._parse_boolean_value("test") is False

    def test_validate_data_type(self):
        from lambda_function import AppPipelineAnalyzer

        content_string = "app_pipelines:\n- id: bb7754e0-129a-40c0-bed0-e4e7342184ee\n  logConfigName: SpringBoot0220\n  logConfigVersionNumber: 1"
        analyzer = AppPipelineAnalyzer(content_string)
        analyzer._validate_data_type(
            obj={"int": "a"}, key="int", data_type="integer", path="path"
        )
        assert analyzer.response == {
            "findings": [
                {
                    "findingDetails": "The value a does not match the expected data type integer.",
                    "findingType": "ERROR",
                    "issueCode": "MISMATCH_DATA_TYPE",
                    "location": {"path": "path.int"},
                }
            ],
            "resolvers": [],
        }

        analyzer = AppPipelineAnalyzer(content_string)
        analyzer._validate_data_type(
            obj={"int": "1"}, key="int", data_type="integer", path="path"
        )
        assert analyzer.response == {
            "findings": [],
            "resolvers": [],
        }

        analyzer = AppPipelineAnalyzer(content_string)
        analyzer._validate_data_type(
            obj={"bool": "T"}, key="bool", data_type="boolean", path="path"
        )
        assert analyzer.response == {
            "findings": [
                {
                    "findingDetails": "The value T does not match the expected data type boolean.",
                    "findingType": "ERROR",
                    "issueCode": "MISMATCH_DATA_TYPE",
                    "location": {"path": "path.bool"},
                }
            ],
            "resolvers": [],
        }

        analyzer = AppPipelineAnalyzer(content_string)
        analyzer._validate_data_type(
            obj={"time": "1s"}, key="time", data_type="time", path="path"
        )
        assert analyzer.response == {
            "findings": [],
            "resolvers": [],
        }

        analyzer = AppPipelineAnalyzer(content_string)
        analyzer._validate_data_type(
            obj={"time": "xxx"}, key="time", data_type="time", path="path"
        )
        assert analyzer.response == {
            "findings": [
                {
                    "findingDetails": "The value xxx does not match the expected data type time.",
                    "findingType": "ERROR",
                    "issueCode": "MISMATCH_DATA_TYPE",
                    "location": {"path": "path.time"},
                }
            ],
            "resolvers": [],
        }

        analyzer = AppPipelineAnalyzer(content_string)
        analyzer._validate_data_type(
            obj={"bytes": "1b"}, key="bytes", data_type="bytes", path="path"
        )
        assert analyzer.response == {
            "findings": [],
            "resolvers": [],
        }

        analyzer = AppPipelineAnalyzer(content_string)
        analyzer._validate_data_type(
            obj={"bytes": "xxx"}, key="bytes", data_type="bytes", path="path"
        )
        assert analyzer.response == {
            "findings": [
                {
                    "findingDetails": "The value xxx does not match the expected data type bytes.",
                    "findingType": "ERROR",
                    "issueCode": "MISMATCH_DATA_TYPE",
                    "location": {"path": "path.bytes"},
                }
            ],
            "resolvers": [],
        }

        analyzer = AppPipelineAnalyzer(content_string)
        analyzer._validate_data_type(
            obj={"bool": "true"}, key="bool", data_type="boolean", path="path"
        )
        assert analyzer.response == {
            "findings": [],
            "resolvers": [],
        }

    def test_check_required_element(self):
        from lambda_function import AppPipelineAnalyzer

        content_string = "app_pipelines:\n- id: bb7754e0-129a-40c0-bed0-e4e7342184ee\n  logConfigName: SpringBoot0220\n  logConfigVersionNumber: 1"
        analyzer = AppPipelineAnalyzer(content_string)
        analyzer._check_required_element(
            obj={}, elements=("key1", "key2"), parent="parent", path="bufferParams"
        )

        assert analyzer.response == {
            "findings": [
                {
                    "findingDetails": "Element key1 is required, please add element key1 to the parent.",
                    "findingType": "ERROR",
                    "issueCode": "MISSING_ELEMENT",
                    "location": {"path": "bufferParams"},
                },
                {
                    "findingDetails": "Element key2 is required, please add element key2 to the parent.",
                    "findingType": "ERROR",
                    "issueCode": "MISSING_ELEMENT",
                    "location": {"path": "bufferParams"},
                },
            ],
            "resolvers": [],
        }

        analyzer = AppPipelineAnalyzer(content_string)
        analyzer._check_required_element(
            obj={"key1": "value1"},
            elements=("key1", "key2"),
            parent="parent",
            path="bufferParams",
        )

        assert analyzer.response == {
            "findings": [
                {
                    "findingDetails": "Element key2 is required, please add element key2 to the parent.",
                    "findingType": "ERROR",
                    "issueCode": "MISSING_ELEMENT",
                    "location": {"path": "bufferParams"},
                },
            ],
            "resolvers": [],
        }

    def test_validate_log_config(self, ddb_client):
        from lambda_function import AppPipelineAnalyzer

        content_string = "app_pipelines:\n- id: bb7754e0-129a-40c0-bed0-e4e7342184ee\n  logConfigName: SpringBoot0220\n  logConfigVersionNumber: 1"
        analyzer = AppPipelineAnalyzer(content_string)
        analyzer._validate_log_config(app_pipeline={}, path="appPipelines[0]")
        assert analyzer.response == {
            "findings": [
                {
                    "findingDetails": "Element logConfigName is required, please add element logConfigName to the appPipelines.",
                    "findingType": "ERROR",
                    "issueCode": "MISSING_ELEMENT",
                    "location": {"path": "appPipelines[0]"},
                },
                {
                    "findingDetails": "We recommend that you specify element logConfigVersionNumber. If not specified, the latest version will be used.",
                    "findingType": "SUGGESTION",
                    "issueCode": "MISSING_VERSION",
                    "location": {"path": "appPipelines[0]"},
                },
            ],
            "resolvers": [],
        }

        analyzer = AppPipelineAnalyzer(content_string)
        analyzer._validate_log_config(
            app_pipeline={
                "logConfigName": "do-not-exists",
                "logConfigVersionNumber": "1",
            },
            path="appPipelines[0]",
        )
        assert analyzer.response == {
            "findings": [
                {
                    "findingDetails": "The resource logConfigName: do-not-exists is not found.",
                    "findingType": "ERROR",
                    "issueCode": "INVALID_RESOURCE",
                    "location": {"path": "appPipelines[0].logConfigName"},
                }
            ],
            "resolvers": [],
        }

        analyzer = AppPipelineAnalyzer(content_string)
        analyzer._validate_log_config(
            app_pipeline={"logConfigName": "do-not-exists", "logConfigVersionNumber": 1}
        )
        assert analyzer.response == {
            "findings": [
                {
                    "findingDetails": "The resource logConfigName: do-not-exists is not found.",
                    "findingType": "ERROR",
                    "issueCode": "INVALID_RESOURCE",
                    "location": {"path": ".logConfigName"},
                }
            ],
            "resolvers": [],
        }

        analyzer = AppPipelineAnalyzer(content_string)
        analyzer._validate_log_config(
            app_pipeline={
                "logConfigName": "do-not-exists",
                "logConfigVersionNumber": "a",
            }
        )
        assert analyzer.response == {
            "findings": [
                {
                    "findingDetails": "The resource logConfigName: do-not-exists is not found.",
                    "findingType": "ERROR",
                    "issueCode": "INVALID_RESOURCE",
                    "location": {"path": ".logConfigName"},
                },
                {
                    "findingDetails": "The value a does not match the expected data type integer.",
                    "findingType": "ERROR",
                    "issueCode": "MISMATCH_DATA_TYPE",
                    "location": {"path": ".logConfigVersionNumber"},
                },
            ],
            "resolvers": [],
        }

        analyzer = AppPipelineAnalyzer(content_string)
        analyzer._validate_log_config(
            app_pipeline={"logConfigName": "SpringBoot0220"}, path="appPipelines[0]"
        )
        assert analyzer.response == {
            "findings": [
                {
                    "findingDetails": "We recommend that you specify element logConfigVersionNumber. If not specified, the latest version will be used.",
                    "findingType": "SUGGESTION",
                    "issueCode": "MISSING_VERSION",
                    "location": {"path": "appPipelines[0]"},
                }
            ],
            "resolvers": [],
        }

        analyzer = AppPipelineAnalyzer(content_string)
        analyzer._validate_log_config(
            app_pipeline={
                "logConfigName": "SpringBoot0220",
                "logConfigVersionNumber": "a",
            },
            path="appPipelines[0]",
        )
        assert analyzer.response == {
            "findings": [
                {
                    "findingDetails": "The value a does not match the expected data type integer.",
                    "findingType": "ERROR",
                    "issueCode": "MISMATCH_DATA_TYPE",
                    "location": {"path": "appPipelines[0].logConfigVersionNumber"},
                }
            ],
            "resolvers": [],
        }

        analyzer = AppPipelineAnalyzer(content_string)
        analyzer._validate_log_config(
            app_pipeline={
                "logConfigName": "SpringBoot0220",
                "logConfigVersionNumber": "1",
            },
            path="appPipelines[0]",
        )
        assert analyzer.response == {
            "findings": [],
            "resolvers": [],
        }

    def test_validate_s3_buffer_params(self, s3_client):
        from lambda_function import AppPipelineAnalyzer

        bucket_name = os.environ["CONFIG_FILE_S3_BUCKET_NAME"]

        content_string = "app_pipelines:\n- id: bb7754e0-129a-40c0-bed0-e4e7342184ee\n  logConfigName: SpringBoot0220\n  logConfigVersionNumber: 1"
        analyzer = AppPipelineAnalyzer(content_string)
        analyzer._validate_s3_buffer_params(
            buffer_params={}, path="appPipelines[0].bufferParams"
        )
        assert analyzer.response == {
            "findings": [
                {
                    "findingDetails": "Element logBucketName is required, please add element logBucketName to the bufferParams.",
                    "findingType": "ERROR",
                    "issueCode": "MISSING_ELEMENT",
                    "location": {"path": "appPipelines[0].bufferParams"},
                },
                {
                    "findingDetails": "Element logBucketPrefix is required, please add element logBucketPrefix to the bufferParams.",
                    "findingType": "ERROR",
                    "issueCode": "MISSING_ELEMENT",
                    "location": {"path": "appPipelines[0].bufferParams"},
                },
            ],
            "resolvers": [],
        }

        analyzer = AppPipelineAnalyzer(content_string)
        analyzer._validate_s3_buffer_params(
            buffer_params={
                "logBucketName": bucket_name,
                "logBucketPrefix": "AWSLogs/new",
                "maxFileSize": "10MiB",
                "uploadTimeout": "60s",
                "compressionType": "do-not-supported",
                "s3StorageClass": "do-not-supported",
            },
            path="appPipelines[0].bufferParams",
        )
        assert analyzer.response == {
            "findings": [
                {
                    "findingDetails": "The value 10MiB does not match the expected data type integer.",
                    "findingType": "ERROR",
                    "issueCode": "MISMATCH_DATA_TYPE",
                    "location": {"path": "appPipelines[0].bufferParams.maxFileSize"},
                },
                {
                    "findingDetails": "The value 60s does not match the expected data type integer.",
                    "findingType": "ERROR",
                    "issueCode": "MISMATCH_DATA_TYPE",
                    "location": {"path": "appPipelines[0].bufferParams.uploadTimeout"},
                },
                {
                    "findingDetails": "The Value do-not-supported is not valid for the bufferType, Supported values: GZIP, NONE.",
                    "findingType": "ERROR",
                    "issueCode": "INVALID_ENUM",
                    "location": {
                        "path": "appPipelines[0].bufferParams.compressionType"
                    },
                },
                {
                    "findingDetails": "The Value do-not-supported is not valid for the bufferType, Supported values: STANDARD, STANDARD_IA, ONEZONE_IA, INTELLIGENT_TIERING.",
                    "findingType": "ERROR",
                    "issueCode": "INVALID_ENUM",
                    "location": {"path": "appPipelines[0].bufferParams.s3StorageClass"},
                },
            ],
            "resolvers": [],
        }

        analyzer = AppPipelineAnalyzer(content_string)
        analyzer._validate_s3_buffer_params(
            buffer_params={
                "logBucketName": bucket_name,
                "logBucketPrefix": "AWSLogs/new",
            },
            path="appPipelines[0].bufferParams",
        )
        analyzer._validate_s3_buffer_params(
            buffer_params={"logBucketName": bucket_name, "logBucketPrefix": "AWSLogs/"},
            path="appPipelines[0].bufferParams",
        )
        analyzer._validate_s3_buffer_params(
            buffer_params={
                "logBucketName": bucket_name,
                "logBucketPrefix": "AWSLogs/new",
            },
            path="appPipelines[0].bufferParams",
        )
        analyzer._validate_s3_buffer_params(
            buffer_params={
                "logBucketName": bucket_name,
                "logBucketPrefix": "AWSLogs/new/123",
            },
            path="appPipelines[0].bufferParams",
        )
        analyzer._validate_s3_buffer_params(
            buffer_params={
                "logBucketName": bucket_name,
                "logBucketPrefix": "no-overlap/AWSLogs",
            },
            path="appPipelines[0].bufferParams",
        )
        assert analyzer.response == {
            "findings": [
                {
                    "findingDetails": "Configuration is ambiguously defined. Cannot have overlapping suffixes in two rules if the prefixes are overlapping for the same event type.",
                    "findingType": "ERROR",
                    "issueCode": "BUCKET_NOTIFICATION_OVERLAP",
                    "location": {
                        "path": "appPipelines[0].bufferParams.logBucketPrefix"
                    },
                },
                {
                    "findingDetails": "Configuration is ambiguously defined. Cannot have overlapping suffixes in two rules if the prefixes are overlapping for the same event type.",
                    "findingType": "ERROR",
                    "issueCode": "BUCKET_NOTIFICATION_OVERLAP",
                    "location": {
                        "path": "appPipelines[0].bufferParams.logBucketPrefix"
                    },
                },
                {
                    "findingDetails": "Configuration is ambiguously defined. Cannot have overlapping suffixes in two rules if the prefixes are overlapping for the same event type.",
                    "findingType": "ERROR",
                    "issueCode": "BUCKET_NOTIFICATION_OVERLAP",
                    "location": {
                        "path": "appPipelines[0].bufferParams.logBucketPrefix"
                    },
                },
            ],
            "resolvers": [],
        }

        analyzer = AppPipelineAnalyzer(content_string)
        analyzer._validate_s3_buffer_params(
            buffer_params={
                "logBucketName": bucket_name,
                "logBucketPrefix": "AWSLogs/new",
            },
            path="appPipelines[0].bufferParams",
        )
        assert analyzer.response == {
            "findings": [],
            "resolvers": [],
        }

    def test_validate_kds_buffer_params(self):
        from lambda_function import AppPipelineAnalyzer

        content_string = "app_pipelines:\n- id: bb7754e0-129a-40c0-bed0-e4e7342184ee\n  logConfigName: SpringBoot0220\n  logConfigVersionNumber: 1"
        analyzer = AppPipelineAnalyzer(content_string)
        analyzer._validate_kds_buffer_params(
            buffer_params={}, path="appPipelines[0].bufferParams"
        )
        assert analyzer.response == {
            "findings": [
                {
                    "findingDetails": "Element enableAutoScaling is required, please add element enableAutoScaling to the bufferParams.",
                    "findingType": "ERROR",
                    "issueCode": "MISSING_ELEMENT",
                    "location": {"path": "appPipelines[0].bufferParams"},
                },
                {
                    "findingDetails": "Element shardCount is required, please add element shardCount to the bufferParams.",
                    "findingType": "ERROR",
                    "issueCode": "MISSING_ELEMENT",
                    "location": {"path": "appPipelines[0].bufferParams"},
                },
                {
                    "findingDetails": "Element minCapacity is required, please add element minCapacity to the bufferParams.",
                    "findingType": "ERROR",
                    "issueCode": "MISSING_ELEMENT",
                    "location": {"path": "appPipelines[0].bufferParams"},
                },
                {
                    "findingDetails": "Element maxCapacity is required, please add element maxCapacity to the bufferParams.",
                    "findingType": "ERROR",
                    "issueCode": "MISSING_ELEMENT",
                    "location": {"path": "appPipelines[0].bufferParams"},
                },
            ],
            "resolvers": [],
        }

        analyzer = AppPipelineAnalyzer(content_string)
        analyzer._validate_kds_buffer_params(
            buffer_params={
                "enableAutoScaling": "true",
                "shardCount": 1,
                "minCapacity": 2,
                "maxCapacity": 1,
                "createDashboard": "a",
            },
            path="appPipelines[0].bufferParams",
        )
        assert analyzer.response == {
            "findings": [
                {
                    "findingDetails": "The value a does not match the expected data type boolean.",
                    "findingType": "ERROR",
                    "issueCode": "MISMATCH_DATA_TYPE",
                    "location": {
                        "path": "appPipelines[0].bufferParams.createDashboard"
                    },
                },
                {
                    "findingDetails": "The Value 1 is not valid for the maxCapacity.",
                    "findingType": "ERROR",
                    "issueCode": "INVALID_VALUE",
                    "location": {"path": "appPipelines[0].bufferParams.maxCapacity"},
                },
            ],
            "resolvers": [],
        }

    def test_validate_buffer_params(self, s3_client):
        from lambda_function import AppPipelineAnalyzer, BufferTypeEnum

        bucket_name = os.environ["CONFIG_FILE_S3_BUCKET_NAME"]

        content_string = "app_pipelines:\n- id: bb7754e0-129a-40c0-bed0-e4e7342184ee\n  logConfigName: SpringBoot0220\n  logConfigVersionNumber: 1"
        analyzer = AppPipelineAnalyzer(content_string)
        analyzer._validate_buffer_params(
            buffer_type="", buffer_params={}, path="appPipelines[0]"
        )
        assert analyzer.response == {
            "findings": [
                {
                    "findingDetails": "Element bufferType is required, please add element bufferType to the appPipelines.",
                    "findingType": "ERROR",
                    "issueCode": "MISSING_ELEMENT",
                    "location": {"path": "appPipelines[0]"},
                }
            ],
            "resolvers": [],
        }

        analyzer = AppPipelineAnalyzer(content_string)
        analyzer._validate_buffer_params(
            buffer_type="do-not-supported", buffer_params={}, path="appPipelines[0]"
        )
        assert analyzer.response == {
            "findings": [
                {
                    "findingDetails": "The Value do-not-supported is not valid for the bufferType, Supported values: None, S3, KDS.",
                    "findingType": "ERROR",
                    "issueCode": "INVALID_ENUM",
                    "location": {"path": "appPipelines[0].bufferType"},
                },
                {
                    "findingDetails": "Element bufferParams is required, please add element bufferParams to the appPipelines.",
                    "findingType": "ERROR",
                    "issueCode": "MISSING_ELEMENT",
                    "location": {"path": "appPipelines[0]"},
                },
            ],
            "resolvers": [],
        }

        analyzer = AppPipelineAnalyzer(content_string)
        analyzer._validate_buffer_params(
            buffer_type=BufferTypeEnum.KDS, buffer_params={}, path="appPipelines[0]"
        )
        assert analyzer.response == {
            "findings": [
                {
                    "findingDetails": "Element bufferParams is required, please add element bufferParams to the appPipelines.",
                    "findingType": "ERROR",
                    "issueCode": "MISSING_ELEMENT",
                    "location": {"path": "appPipelines[0]"},
                },
                {
                    "findingDetails": "Element enableAutoScaling is required, please add element enableAutoScaling to the bufferParams.",
                    "findingType": "ERROR",
                    "issueCode": "MISSING_ELEMENT",
                    "location": {"path": "appPipelines[0].bufferParams"},
                },
                {
                    "findingDetails": "Element shardCount is required, please add element shardCount to the bufferParams.",
                    "findingType": "ERROR",
                    "issueCode": "MISSING_ELEMENT",
                    "location": {"path": "appPipelines[0].bufferParams"},
                },
                {
                    "findingDetails": "Element minCapacity is required, please add element minCapacity to the bufferParams.",
                    "findingType": "ERROR",
                    "issueCode": "MISSING_ELEMENT",
                    "location": {"path": "appPipelines[0].bufferParams"},
                },
                {
                    "findingDetails": "Element maxCapacity is required, please add element maxCapacity to the bufferParams.",
                    "findingType": "ERROR",
                    "issueCode": "MISSING_ELEMENT",
                    "location": {"path": "appPipelines[0].bufferParams"},
                },
            ],
            "resolvers": [],
        }

        analyzer = AppPipelineAnalyzer(content_string)
        analyzer._validate_buffer_params(
            buffer_type=BufferTypeEnum.S3,
            buffer_params={"logBucketName": bucket_name, "logBucketPrefix": "test"},
            path="appPipelines[0]",
        )
        assert analyzer.response == {
            "findings": [],
            "resolvers": [],
        }

        analyzer = AppPipelineAnalyzer(content_string)
        analyzer._validate_buffer_params(
            buffer_type=BufferTypeEnum.KDS,
            buffer_params={
                "enableAutoScaling": "true",
                "shardCount": "1",
                "minCapacity": "1",
                "maxCapacity": 2,
            },
            path="appPipelines[0]",
        )
        assert analyzer.response == {
            "findings": [],
            "resolvers": [],
        }

    @responses.activate
    def test_validate_aos_domain(self, ddb_client, opensearch_client, sts_client):
        from lambda_function import AppPipelineAnalyzer

        region = os.environ["AWS_REGION"]

        content_string = "app_pipelines:\n- id: bb7754e0-129a-40c0-bed0-e4e7342184ee\n  logConfigName: SpringBoot0220\n  logConfigVersionNumber: 1"
        analyzer = AppPipelineAnalyzer(content_string)
        analyzer._validate_aos_domain(
            domain_name="", index_prefix="", path="appPipelines[0].aosParams"
        )
        assert analyzer.response == {
            "findings": [
                {
                    "findingDetails": "The resource domainName:  is not found.",
                    "findingType": "ERROR",
                    "issueCode": "INVALID_RESOURCE",
                    "location": {"path": "appPipelines[0].aosParams.domainName"},
                }
            ],
            "resolvers": [],
        }

        analyzer = AppPipelineAnalyzer(content_string)
        analyzer._validate_aos_domain(
            domain_name="do-not-exists",
            index_prefix="",
            path="appPipelines[0].aosParams",
        )
        assert analyzer.response == {
            "findings": [
                {
                    "findingDetails": "The resource domainName: do-not-exists is not found.",
                    "findingType": "ERROR",
                    "issueCode": "INVALID_RESOURCE",
                    "location": {"path": "appPipelines[0].aosParams.domainName"},
                }
            ],
            "resolvers": [],
        }

        analyzer = AppPipelineAnalyzer(content_string)
        analyzer._validate_aos_domain(
            domain_name="deleted-aos", index_prefix="", path="appPipelines[0].aosParams"
        )
        assert analyzer.response == {
            "findings": [
                {
                    "findingDetails": "The resource domainName: deleted-aos is not found.",
                    "findingType": "ERROR",
                    "issueCode": "INVALID_RESOURCE",
                    "location": {"path": "appPipelines[0].aosParams.domainName"},
                }
            ],
            "resolvers": [],
        }

        aos_endpoint = f"vpc-opensearch-for-clo-c42z4u7rmh.{region}.es.amazonaws.com"
        responses.add(
            responses.POST,
            f"https://{aos_endpoint}/_index_template/_simulate/exception-template",
            json={"error": {"reason": "exception"}},
            status=404,
        )
        analyzer = AppPipelineAnalyzer(content_string)
        analyzer._validate_aos_domain(
            domain_name="aos",
            index_prefix="exception",
            path="appPipelines[0].aosParams",
        )
        assert analyzer.response == {
            "findings": [
                {
                    "findingDetails": "exception",
                    "findingType": "ERROR",
                    "issueCode": "HTTP_REQUEST_ERROR",
                    "location": {"path": "appPipelines[0].aosParams.indexPrefix"},
                }
            ],
            "resolvers": [],
        }

        aos_endpoint = f"vpc-opensearch-for-clo-c42z4u7rmh.{region}.es.amazonaws.com"
        responses.add(
            responses.POST,
            f"https://{aos_endpoint}/_index_template/_simulate/cl-app-aos-kds-json-template",
            json={"DomainStatus": {}},
            status=200,
        )
        analyzer = AppPipelineAnalyzer(content_string)
        analyzer._validate_aos_domain(
            domain_name="aos",
            index_prefix="cl-app-aos-kds-json",
            path="appPipelines[0].aosParams",
        )
        assert analyzer.response == {
            "findings": [],
            "resolvers": [],
        }

    @responses.activate
    def test_validate_aos_params(self, ddb_client, opensearch_client, sts_client):
        from lambda_function import AppPipelineAnalyzer

        region = os.environ["AWS_REGION"]
        aos_endpoint = f"vpc-opensearch-for-clo-c42z4u7rmh.{region}.es.amazonaws.com"
        responses.add(
            responses.POST,
            f"https://{aos_endpoint}/_index_template/_simulate/cl-app-aos-kds-json-template",
            json={"DomainStatus": {}},
            status=200,
        )

        content_string = "app_pipelines:\n- id: bb7754e0-129a-40c0-bed0-e4e7342184ee\n  logConfigName: SpringBoot0220\n  logConfigVersionNumber: 1"
        analyzer = AppPipelineAnalyzer(content_string)
        analyzer._validate_aos_params(params={}, path="appPipelines[0].aosParams")
        assert analyzer.response == {
            "findings": [
                {
                    "findingDetails": "Element domainName is required, please add element domainName to the aosParams.",
                    "findingType": "ERROR",
                    "issueCode": "MISSING_ELEMENT",
                    "location": {"path": "appPipelines[0].aosParams"},
                },
                {
                    "findingDetails": "Element indexPrefix is required, please add element indexPrefix to the aosParams.",
                    "findingType": "ERROR",
                    "issueCode": "MISSING_ELEMENT",
                    "location": {"path": "appPipelines[0].aosParams"},
                },
            ],
            "resolvers": [],
        }

        content_string = "app_pipelines:\n- id: bb7754e0-129a-40c0-bed0-e4e7342184ee\n  logConfigName: SpringBoot0220\n  logConfigVersionNumber: 1"
        analyzer = AppPipelineAnalyzer(content_string)
        analyzer._validate_aos_params(
            params={
                "domainName": "aos",
                "indexPrefix": "cl-app-aos-kds-json",
                "indexSuffix": "error",
                "codec": "",
                "shardNumbers": "x",
                "replicaNumbers": "x",
                "rolloverSize": "x",
                "refreshInterval": "x",
                "warmLogTransition": "",
                "coldLogTransition": "",
                "logRetention": "",
            },
            path="appPipelines[0].aosParams",
        )
        assert analyzer.response == {
            "findings": [
                {
                    "findingDetails": "The Value error is not valid for the indexSuffix, Supported values: yyyy_MM_dd, yyyy_MM_dd_HH, yyyy_MM, yyyy.",
                    "findingType": "ERROR",
                    "issueCode": "INVALID_ENUM",
                    "location": {"path": "appPipelines[0].aosParams.indexSuffix"},
                },
                {
                    "findingDetails": "The Value  is not valid for the CodecEnum, Supported values: best_compression, default.",
                    "findingType": "ERROR",
                    "issueCode": "INVALID_ENUM",
                    "location": {"path": "appPipelines[0].aosParams.codec"},
                },
                {
                    "findingDetails": "The value x does not match the expected data type integer.",
                    "findingType": "ERROR",
                    "issueCode": "MISMATCH_DATA_TYPE",
                    "location": {"path": "appPipelines[0].aosParams.shardNumbers"},
                },
                {
                    "findingDetails": "The value x does not match the expected data type integer.",
                    "findingType": "ERROR",
                    "issueCode": "MISMATCH_DATA_TYPE",
                    "location": {"path": "appPipelines[0].aosParams.replicaNumbers"},
                },
                {
                    "findingDetails": "The value x does not match the expected data type bytes.",
                    "findingType": "ERROR",
                    "issueCode": "MISMATCH_DATA_TYPE",
                    "location": {"path": "appPipelines[0].aosParams.rolloverSize"},
                },
                {
                    "findingDetails": "The value x does not match the expected data type time.",
                    "findingType": "ERROR",
                    "issueCode": "MISMATCH_DATA_TYPE",
                    "location": {"path": "appPipelines[0].aosParams.refreshInterval"},
                },
            ],
            "resolvers": [],
        }

        content_string = "app_pipelines:\n- id: bb7754e0-129a-40c0-bed0-e4e7342184ee\n  logConfigName: SpringBoot0220\n  logConfigVersionNumber: 1"
        analyzer = AppPipelineAnalyzer(content_string)
        analyzer._validate_aos_params(
            params={
                "domainName": "aos",
                "indexPrefix": "cl-app-aos-kds-json",
                "indexSuffix": "yyyy_MM_dd",
                "codec": "best_compression",
                "shardNumbers": "1",
                "replicaNumbers": "1",
                "rolloverSize": "30gb",
                "refreshInterval": "1s",
                "warmLogTransition": "1s",
                "coldLogTransition": "7m",
                "logRetention": "7d",
            },
            path="appPipelines[0].aosParams",
        )
        assert analyzer.response == {
            "findings": [],
            "resolvers": [],
        }

        analyzer = AppPipelineAnalyzer(content_string)
        analyzer._validate_aos_params(
            params={"domainName": "aos", "indexPrefix": "cl-app-aos-kds-json"},
            path="appPipelines[0].aosParams",
        )
        assert analyzer.response == {
            "findings": [],
            "resolvers": [],
        }

    def test_validate_monitor(self, sns_client):
        from lambda_function import AppPipelineAnalyzer

        sns_topic_arn = os.environ["snsTopicArn"]
        region = os.environ["AWS_REGION"]
        account_id = os.environ["ACCOUNT_ID"]

        content_string = "app_pipelines:\n- id: bb7754e0-129a-40c0-bed0-e4e7342184ee\n  logConfigName: SpringBoot0220\n  logConfigVersionNumber: 1"
        analyzer = AppPipelineAnalyzer(content_string)
        analyzer._validate_monitor(params={}, path="appPipelines[0].monitor")
        assert analyzer.response == {
            "findings": [],
            "resolvers": [],
        }

        analyzer = AppPipelineAnalyzer(content_string)
        analyzer._validate_monitor(
            params={"pipelineAlarmStatus": "DISABLED"}, path="appPipelines[0].monitor"
        )
        assert analyzer.response == {
            "findings": [],
            "resolvers": [],
        }

        analyzer = AppPipelineAnalyzer(content_string)
        analyzer._validate_monitor(
            params={"pipelineAlarmStatus": "ENABLED"}, path="appPipelines[0].monitor"
        )
        assert analyzer.response == {
            "findings": [
                {
                    "findingDetails": "Element snsTopicArn is required, please add element snsTopicArn to the monitor.",
                    "findingType": "ERROR",
                    "issueCode": "MISSING_ELEMENT",
                    "location": {"path": "appPipelines[0].monitor"},
                }
            ],
            "resolvers": [],
        }

        analyzer = AppPipelineAnalyzer(content_string)
        analyzer._validate_monitor(
            params={
                "pipelineAlarmStatus": "ENABLED",
                "snsTopicArn": f"arn:aws:sns:{region}:{account_id}:do-not-exists",
            },
            path="appPipelines[0].monitor",
        )
        assert analyzer.response == {
            "findings": [
                {
                    "findingDetails": f"The resource snsTopicArn: arn:aws:sns:{region}:{account_id}:do-not-exists is not found.",
                    "findingType": "ERROR",
                    "issueCode": "INVALID_RESOURCE",
                    "location": {"path": "appPipelines[0].monitor.snsTopicArn"},
                }
            ],
            "resolvers": [],
        }

        analyzer = AppPipelineAnalyzer(content_string)
        analyzer._validate_monitor(
            params={"pipelineAlarmStatus": "ENABLED", "snsTopicArn": sns_topic_arn},
            path="appPipelines[0].monitor",
        )
        assert analyzer.response == {
            "findings": [],
            "resolvers": [],
        }

    def test_validate_log_sources(self, ddb_client):
        from lambda_function import AppPipelineAnalyzer

        content_string = "app_pipelines:\n- id: bb7754e0-129a-40c0-bed0-e4e7342184ee\n  logConfigName: SpringBoot0220\n  logConfigVersionNumber: 1"
        analyzer = AppPipelineAnalyzer(content_string)
        analyzer._validate_log_sources(sources=[], path="appPipelines[0].logSources")
        assert analyzer.response == {
            "findings": [],
            "resolvers": [],
        }

        analyzer = AppPipelineAnalyzer(content_string)
        analyzer._validate_log_sources(
            sources=[{"id": "1234", "autoAddPermission": "true"}],
            path="appPipelines[0].logSources",
        )
        assert analyzer.response == {
            "findings": [
                {
                    "findingDetails": "The element id is not valid, please include only supported element.",
                    "findingType": "ERROR",
                    "issueCode": "INVALID_ELEMENT",
                    "location": {"path": "appPipelines[0].logSources[0].id"},
                },
                {
                    "findingDetails": "Element type is required, please add element type to the logSource.",
                    "findingType": "ERROR",
                    "issueCode": "MISSING_ELEMENT",
                    "location": {"path": "appPipelines[0].logSources[0]"},
                },
                {
                    "findingDetails": "Element name is required, please add element name to the logSource.",
                    "findingType": "ERROR",
                    "issueCode": "MISSING_ELEMENT",
                    "location": {"path": "appPipelines[0].logSources[0]"},
                },
                {
                    "findingDetails": "Element accountId is required, please add element accountId to the logSource.",
                    "findingType": "ERROR",
                    "issueCode": "MISSING_ELEMENT",
                    "location": {"path": "appPipelines[0].logSources[0]"},
                },
                {
                    "findingDetails": "Element logPath is required, please add element logPath to the logSource.",
                    "findingType": "ERROR",
                    "issueCode": "MISSING_ELEMENT",
                    "location": {"path": "appPipelines[0].logSources[0]"},
                },
            ],
            "resolvers": [],
        }

        analyzer = AppPipelineAnalyzer(content_string)
        analyzer._validate_log_sources(
            sources=[
                {
                    "name": "test",
                    "type": "EC2",
                    "accountId": os.environ["ACCOUNT_ID"],
                    "logPath": "/tmp/*.log",
                    "autoAddPermission": "true",
                },
                {
                    "name": "do-not-exists",
                    "type": "EC2",
                    "accountId": "123456789012",
                    "logPath": "/tmp/*.log",
                    "autoAddPermission": "true",
                },
            ],
            path="appPipelines[0].logSources",
        )
        assert analyzer.response == {
            "findings": [
                {
                    "findingDetails": "The resource name: do-not-exists is not found.",
                    "findingType": "ERROR",
                    "issueCode": "INVALID_RESOURCE",
                    "location": {"path": "appPipelines[0].logSources[1].name"},
                }
            ],
            "resolvers": [],
        }

        analyzer = AppPipelineAnalyzer(content_string)
        analyzer._validate_log_sources(
            sources=[
                {
                    "name": "",
                    "type": "S3",
                    "accountId": os.environ["ACCOUNT_ID"],
                    "logPath": "/tmp/*.log",
                    "autoAddPermission": "true",
                },
                {
                    "name": "do-not-exists",
                    "type": "EC2",
                    "accountId": os.environ["ACCOUNT_ID"],
                    "logPath": "/tmp/*.log",
                    "autoAddPermission": "true",
                },
            ],
            path="appPipelines[0].logSources",
        )
        assert analyzer.response == {
            "findings": [
                {
                    "findingDetails": "Unsupported Log Source, will be ignored during pipeline creation.",
                    "findingType": "WARNING",
                    "issueCode": "UNSUPPORTED_LOG_SOURCE",
                    "location": {"path": "appPipelines[0].logSources[0].name"},
                },
                {
                    "findingDetails": "The resource name: do-not-exists is not found.",
                    "findingType": "ERROR",
                    "issueCode": "INVALID_RESOURCE",
                    "location": {"path": "appPipelines[0].logSources[1].name"},
                },
            ],
            "resolvers": [],
        }

        analyzer = AppPipelineAnalyzer(content_string)
        analyzer._validate_log_sources(
            sources=[
                {
                    "name": "test",
                    "type": "EC2",
                    "accountId": os.environ["ACCOUNT_ID"],
                    "logPath": "/tmp/*.log",
                    "autoAddPermission": "true",
                }
            ],
            path="appPipelines[0].appLogIngestions",
        )
        assert analyzer.response == {
            "findings": [],
            "resolvers": [],
        }

    def test_validate_app_pipelines(self, ddb_client, opensearch_client, sts_client):
        from lambda_function import AppPipelineAnalyzer

        content_string = "key: value\n    sub-key: sub-value"
        analyzer = AppPipelineAnalyzer(content_string)
        analyzer.validate_app_pipelines()
        assert analyzer.response == {
            "findings": [
                {
                    "findingDetails": "The YAML file has syntax error, please fix all syntax error and upload again.",
                    "findingType": "ERROR",
                    "issueCode": "YAML_SYNTAX_ERROR",
                    "location": {"path": ""},
                },
                {
                    "findingDetails": "Element appPipelines is required, please add element appPipelines to the yaml.",
                    "findingType": "ERROR",
                    "issueCode": "MISSING_ELEMENT",
                    "location": {"path": ""},
                },
            ],
            "resolvers": [],
        }

        content_string = "appPipelines: value\nsub-key: sub-value"
        analyzer = AppPipelineAnalyzer(content_string)
        analyzer.validate_app_pipelines()
        assert analyzer.response == {
            "findings": [
                {
                    "findingDetails": "The element appPipelines is not valid, please include only supported element.",
                    "findingType": "ERROR",
                    "issueCode": "INVALID_ELEMENT",
                    "location": {"path": "appPipelines"},
                }
            ],
            "resolvers": [],
        }

        content_string = "appPipelines:\n- id: 123"
        analyzer = AppPipelineAnalyzer(content_string)
        analyzer.validate_app_pipelines()
        assert analyzer.response == {
            "findings": [
                {
                    "findingDetails": "The element id is not valid, please include only supported element.",
                    "findingType": "ERROR",
                    "issueCode": "INVALID_ELEMENT",
                    "location": {"path": "appPipelines[0].id"},
                },
                {
                    "findingDetails": "Element logConfigName is required, please add element logConfigName to the appPipelines.",
                    "findingType": "ERROR",
                    "issueCode": "MISSING_ELEMENT",
                    "location": {"path": "appPipelines[0]"},
                },
                {
                    "findingDetails": "We recommend that you specify element logConfigVersionNumber. If not specified, the latest version will be used.",
                    "findingType": "SUGGESTION",
                    "issueCode": "MISSING_VERSION",
                    "location": {"path": "appPipelines[0]"},
                },
                {
                    "findingDetails": "Element bufferType is required, please add element bufferType to the appPipelines.",
                    "findingType": "ERROR",
                    "issueCode": "MISSING_ELEMENT",
                    "location": {"path": "appPipelines[0]"},
                },
                {
                    "findingDetails": "Element domainName is required, please add element domainName to the aosParams.",
                    "findingType": "ERROR",
                    "issueCode": "MISSING_ELEMENT",
                    "location": {"path": "appPipelines[0]"},
                },
                {
                    "findingDetails": "Element indexPrefix is required, please add element indexPrefix to the aosParams.",
                    "findingType": "ERROR",
                    "issueCode": "MISSING_ELEMENT",
                    "location": {"path": "appPipelines[0]"},
                },
            ],
            "resolvers": [],
        }

    def test_build_resolvers(
        self, s3_client, ddb_client, opensearch_client, sns_client, sts_client
    ):
        from lambda_function import AppPipelineAnalyzer

        content_string = f"""appPipelines:
- logConfigName: SpringBoot0220
  logConfigVersionNumber: 1
  bufferType: S3
  bufferParams:
    logBucketName: {os.environ["DEFAULT_LOGGING_BUCKET"]}
    logBucketPrefix: AppLogs/cl-app-aos-s3-json/year=%Y/month=%m/day=%d/
  aosParams:
    domainName: aos
    indexPrefix: cl-app-aos-s3-json
  monitor:
    pipelineAlarmStatus: ENABLED
    snsTopicArn: {os.environ["snsTopicArn"]}
  logSources:
  - name: test
    type: EC2
    accountId: {os.environ["ACCOUNT_ID"]}
    logPath: /var/log/containers/*json-*.log
    autoAddPermission: true"""

        analyzer = AppPipelineAnalyzer(content_string)
        analyzer.build_resolvers()
        assert analyzer.response == {
            "findings": [],
            "resolvers": [
                {
                    "operationName": "CreateAppPipeline",
                    "variables": {
                        "bufferType": "S3",
                        "aosParams": {
                            "domainName": "aos",
                            "engine": "OpenSearch",
                            "indexPrefix": "cl-app-aos-s3-json",
                            "opensearchArn": "arn:aws:es:us-east-1:12345678:domain/opensearch-for-clo",
                            "opensearchEndpoint": "vpc-opensearch-for-clo-c42z4u7rmh.us-east-1.es.amazonaws.com",
                            "replicaNumbers": "1",
                            "shardNumbers": "1",
                            "indexSuffix": "yyyy_MM_dd",
                            "codec": "best_compression",
                            "refreshInterval": "1s",
                            "vpc": {
                                "privateSubnetIds": "subnet-0340e66e2160,subnet-0edfd88ce78c3",
                                "publicSubnetIds": "",
                                "securityGroupId": "sg-0f600225",
                                "vpcId": "vpc-04c1246",
                            },
                            "rolloverSize": "30gb",
                            "warmLogTransition": "",
                            "coldLogTransition": "",
                            "logRetention": "180d",
                            "failedLogBucket": os.environ["DEFAULT_LOGGING_BUCKET"],
                        },
                        "logConfigId": "e8e52b70-e7bc-4bdb-ad60-5f1addf17387",
                        "logConfigVersionNumber": 1,
                        "monitor": {
                            "status": "ENABLED",
                            "pipelineAlarmStatus": "ENABLED",
                            "snsTopicArn": "arn:aws:sns:us-east-1:123456789012:alarm_topic",
                            "snsTopicName": "alarm_topic",
                        },
                        "logProcessorConcurrency": "0",
                        "force": False,
                        "logSources": [
                            {
                                "operationName": "CreateAppLogIngestion",
                                "variables": {
                                    "autoAddPermission": True,
                                    "logPath": "/var/log/containers/*json-*.log",
                                    "sourceId": "b693176e-5369-4e3c-88fb-4296e2a39943",
                                },
                            },
                        ],
                        "bufferParams": [
                            {
                                "paramKey": "logBucketName",
                                "paramValue": os.environ["DEFAULT_LOGGING_BUCKET"],
                            },
                            {
                                "paramKey": "logBucketPrefix",
                                "paramValue": "AppLogs/cl-app-aos-s3-json/year=%Y/month=%m/day=%d/",
                            },
                            {"paramKey": "logBucketSuffix", "paramValue": ""},
                            {
                                "paramKey": "defaultCmkArn",
                                "paramValue": os.environ["DEFAULT_CMK_ARN"],
                            },
                            {"paramKey": "maxFileSize", "paramValue": "50"},
                            {"paramKey": "uploadTimeout", "paramValue": "60"},
                            {"paramKey": "compressionType", "paramValue": "GZIP"},
                            {
                                "paramKey": "s3StorageClass",
                                "paramValue": "INTELLIGENT_TIERING",
                            },
                            {"paramKey": "createDashboard", "paramValue": "No"},
                        ],
                        "parameters": [],
                        "tags": [],
                    },
                }
            ],
        }

        content_string = f"""appPipelines:
- logConfigName: SpringBoot0220
  logConfigVersionNumber: 1
  bufferType: KDS
  bufferParams:
    enableAutoScaling: 'true'
    shardCount: '1'
    minCapacity: '1'
    maxCapacity: '2'
    createDashboard: 'Yes'
  aosParams:
    domainName: aos
    indexPrefix: cl-app-aos-kds-json
    indexSuffix: yyyy_MM
    rolloverSize: 50gb
    codec: default
    refreshInterval: 30s
    shardNumbers: 2
    replicaNumbers: 2
    warmLogTransition: '1s'
    coldLogTransition: '3d'
    logRetention: 180d
  monitor:
    pipelineAlarmStatus: DISABLED
    snsTopicArn: ''
  logSources:
  - name: test
    type: EC2
    accountId: {os.environ["ACCOUNT_ID"]}
    logPath: /var/log/containers/*json-*.log
    autoAddPermission: true"""

        analyzer = AppPipelineAnalyzer(content_string)
        analyzer.build_resolvers()
        assert analyzer.response == {
            "findings": [],
            "resolvers": [
                {
                    "operationName": "CreateAppPipeline",
                    "variables": {
                        "bufferType": "KDS",
                        "aosParams": {
                            "domainName": "aos",
                            "engine": "OpenSearch",
                            "indexPrefix": "cl-app-aos-kds-json",
                            "opensearchArn": "arn:aws:es:us-east-1:12345678:domain/opensearch-for-clo",
                            "opensearchEndpoint": "vpc-opensearch-for-clo-c42z4u7rmh.us-east-1.es.amazonaws.com",
                            "replicaNumbers": "2",
                            "shardNumbers": "2",
                            "indexSuffix": "yyyy_MM",
                            "codec": "default",
                            "refreshInterval": "30s",
                            "vpc": {
                                "privateSubnetIds": "subnet-0340e66e2160,subnet-0edfd88ce78c3",
                                "publicSubnetIds": "",
                                "securityGroupId": "sg-0f600225",
                                "vpcId": "vpc-04c1246",
                            },
                            "rolloverSize": "50gb",
                            "warmLogTransition": "1s",
                            "coldLogTransition": "3d",
                            "logRetention": "180d",
                            "failedLogBucket": os.environ["DEFAULT_LOGGING_BUCKET"],
                        },
                        "logConfigId": "e8e52b70-e7bc-4bdb-ad60-5f1addf17387",
                        "logConfigVersionNumber": 1,
                        "monitor": {
                            "status": "ENABLED",
                            "pipelineAlarmStatus": "DISABLED",
                            "snsTopicArn": "",
                            "snsTopicName": "",
                        },
                        "logProcessorConcurrency": "0",
                        "force": False,
                        "logSources": [
                            {
                                "operationName": "CreateAppLogIngestion",
                                "variables": {
                                    "autoAddPermission": True,
                                    "logPath": "/var/log/containers/*json-*.log",
                                    "sourceId": "b693176e-5369-4e3c-88fb-4296e2a39943",
                                },
                            },
                        ],
                        "bufferParams": [
                            {"paramKey": "enableAutoScaling", "paramValue": "true"},
                            {"paramKey": "shardCount", "paramValue": "1"},
                            {"paramKey": "minCapacity", "paramValue": "1"},
                            {"paramKey": "maxCapacity", "paramValue": "2"},
                            {"paramKey": "createDashboard", "paramValue": "Yes"},
                        ],
                        "parameters": [],
                        "tags": [],
                    },
                }
            ],
        }

        content_string = f"""appPipelines:
- logConfigName: SpringBoot0220
  logConfigVersionNumber: 0
  bufferType: None
  bufferParams:
    enableAutoScaling: 'true'
    shardCount: '1'
    minCapacity: '1'
    maxCapacity: '2'
    createDashboard: 'Yes'
  aosParams:
    domainName: aos
    indexPrefix: cl-app-aos-none-json
    indexSuffix: yyyy_MM
    rolloverSize: 50gb
    codec: default
    refreshInterval: 30s
    shardNumbers: 2
    replicaNumbers: 2
    warmLogTransition: '1s'
    coldLogTransition: '3d'
    logRetention: 180d
  monitor:
    pipelineAlarmStatus: DISABLED
    snsTopicArn: ''
  logSources: []
"""

        analyzer = AppPipelineAnalyzer(content_string)
        analyzer.build_resolvers()
        assert analyzer.response == {
            "findings": [],
            "resolvers": [
                {
                    "operationName": "CreateAppPipeline",
                    "variables": {
                        "bufferType": "None",
                        "bufferParams": [],
                        "aosParams": {
                            "domainName": "aos",
                            "engine": "OpenSearch",
                            "indexPrefix": "cl-app-aos-none-json",
                            "opensearchArn": "arn:aws:es:us-east-1:12345678:domain/opensearch-for-clo",
                            "opensearchEndpoint": "vpc-opensearch-for-clo-c42z4u7rmh.us-east-1.es.amazonaws.com",
                            "replicaNumbers": "2",
                            "shardNumbers": "2",
                            "indexSuffix": "yyyy_MM",
                            "codec": "default",
                            "refreshInterval": "30s",
                            "vpc": {
                                "privateSubnetIds": "subnet-0340e66e2160,subnet-0edfd88ce78c3",
                                "publicSubnetIds": "",
                                "securityGroupId": "sg-0f600225",
                                "vpcId": "vpc-04c1246",
                            },
                            "rolloverSize": "50gb",
                            "warmLogTransition": "1s",
                            "coldLogTransition": "3d",
                            "logRetention": "180d",
                            "failedLogBucket": os.environ["DEFAULT_LOGGING_BUCKET"],
                        },
                        "logConfigId": "e8e52b70-e7bc-4bdb-ad60-5f1addf17387",
                        "logConfigVersionNumber": 0,
                        "monitor": {
                            "status": "ENABLED",
                            "pipelineAlarmStatus": "DISABLED",
                            "snsTopicArn": "",
                            "snsTopicName": "",
                        },
                        "logProcessorConcurrency": "0",
                        "force": False,
                        "parameters": [],
                        "tags": [],
                        "logSources": [],
                    },
                }
            ],
        }

    @responses.activate
    def test_run(
        self, s3_client, ddb_client, opensearch_client, sns_client, sts_client
    ):
        from lambda_function import AppPipelineAnalyzer

        region = os.environ["AWS_REGION"]
        aos_endpoint = f"vpc-opensearch-for-clo-c42z4u7rmh.{region}.es.amazonaws.com"
        responses.add(
            responses.POST,
            f"https://{aos_endpoint}/_index_template/_simulate/cl-app-aos-s3-json-template",
            json={"DomainStatus": {}},
            status=200,
        )

        content_string = f"""appPipelines: []"""

        analyzer = AppPipelineAnalyzer(content_string)
        analyzer.run()
        assert analyzer.response == {
            "findings": [
                {
                    "findingDetails": "Element appPipelines is required, please add element appPipelines to the yaml.",
                    "findingType": "ERROR",
                    "issueCode": "MISSING_ELEMENT",
                    "location": {"path": ""},
                }
            ],
            "resolvers": [],
        }

        content_string = f"""appPipelines:\n- id: bb7754e0-129a-40c0-bed0-e4e7342184ee\n  logConfigName: SpringBoot0220\n  logConfigVersionNumber: 1"""

        analyzer = AppPipelineAnalyzer(content_string)
        analyzer.run()
        assert analyzer.response == {
            "findings": [
                {
                    "findingDetails": "The element id is not valid, please include only supported element.",
                    "findingType": "ERROR",
                    "issueCode": "INVALID_ELEMENT",
                    "location": {"path": "appPipelines[0].id"},
                },
                {
                    "findingDetails": "Element bufferType is required, please add element bufferType to the appPipelines.",
                    "findingType": "ERROR",
                    "issueCode": "MISSING_ELEMENT",
                    "location": {"path": "appPipelines[0]"},
                },
                {
                    "findingDetails": "Element domainName is required, please add element domainName to the aosParams.",
                    "findingType": "ERROR",
                    "issueCode": "MISSING_ELEMENT",
                    "location": {"path": "appPipelines[0]"},
                },
                {
                    "findingDetails": "Element indexPrefix is required, please add element indexPrefix to the aosParams.",
                    "findingType": "ERROR",
                    "issueCode": "MISSING_ELEMENT",
                    "location": {"path": "appPipelines[0]"},
                },
            ],
            "resolvers": [],
        }

        content_string = f"""appPipelines:
- logConfigName: SpringBoot0220
  logConfigVersionNumber: 1
  bufferType: S3
  bufferParams:
    logBucketName: {os.environ["DEFAULT_LOGGING_BUCKET"]}
    logBucketPrefix: AppLogs/cl-app-aos-s3-json/year=%Y/month=%m/day=%d/
  aosParams:
    domainName: aos
    indexPrefix: cl-app-aos-s3-json
  monitor:
    pipelineAlarmStatus: ENABLED
    snsTopicArn: {os.environ["snsTopicArn"]}
  logSources:
  - name: test
    type: EC2
    accountId: {os.environ["ACCOUNT_ID"]}
    logPath: /var/log/containers/*json-*.log
    autoAddPermission: true
    """

        analyzer = AppPipelineAnalyzer(content_string)
        analyzer.run()
        assert analyzer.response == {
            "findings": [],
            "resolvers": [
                {
                    "operationName": "CreateAppPipeline",
                    "variables": {
                        "bufferType": "S3",
                        "aosParams": {
                            "domainName": "aos",
                            "engine": "OpenSearch",
                            "indexPrefix": "cl-app-aos-s3-json",
                            "opensearchArn": "arn:aws:es:us-east-1:12345678:domain/opensearch-for-clo",
                            "opensearchEndpoint": "vpc-opensearch-for-clo-c42z4u7rmh.us-east-1.es.amazonaws.com",
                            "replicaNumbers": "1",
                            "shardNumbers": "1",
                            "indexSuffix": "yyyy_MM_dd",
                            "codec": "best_compression",
                            "refreshInterval": "1s",
                            "vpc": {
                                "privateSubnetIds": "subnet-0340e66e2160,subnet-0edfd88ce78c3",
                                "publicSubnetIds": "",
                                "securityGroupId": "sg-0f600225",
                                "vpcId": "vpc-04c1246",
                            },
                            "rolloverSize": "30gb",
                            "warmLogTransition": "",
                            "coldLogTransition": "",
                            "logRetention": "180d",
                            "failedLogBucket": os.environ["DEFAULT_LOGGING_BUCKET"],
                        },
                        "logConfigId": "e8e52b70-e7bc-4bdb-ad60-5f1addf17387",
                        "logConfigVersionNumber": 1,
                        "monitor": {
                            "status": "ENABLED",
                            "pipelineAlarmStatus": "ENABLED",
                            "snsTopicArn": "arn:aws:sns:us-east-1:123456789012:alarm_topic",
                            "snsTopicName": "alarm_topic",
                        },
                        "logProcessorConcurrency": "0",
                        "force": False,
                        "logSources": [
                            {
                                "operationName": "CreateAppLogIngestion",
                                "variables": {
                                    "autoAddPermission": True,
                                    "logPath": "/var/log/containers/*json-*.log",
                                    "sourceId": "b693176e-5369-4e3c-88fb-4296e2a39943",
                                },
                            },
                        ],
                        "bufferParams": [
                            {
                                "paramKey": "logBucketName",
                                "paramValue": os.environ["DEFAULT_LOGGING_BUCKET"],
                            },
                            {
                                "paramKey": "logBucketPrefix",
                                "paramValue": "AppLogs/cl-app-aos-s3-json/year=%Y/month=%m/day=%d/",
                            },
                            {"paramKey": "logBucketSuffix", "paramValue": ""},
                            {
                                "paramKey": "defaultCmkArn",
                                "paramValue": os.environ["DEFAULT_CMK_ARN"],
                            },
                            {"paramKey": "maxFileSize", "paramValue": "50"},
                            {"paramKey": "uploadTimeout", "paramValue": "60"},
                            {"paramKey": "compressionType", "paramValue": "GZIP"},
                            {
                                "paramKey": "s3StorageClass",
                                "paramValue": "INTELLIGENT_TIERING",
                            },
                            {"paramKey": "createDashboard", "paramValue": "No"},
                        ],
                        "parameters": [],
                        "tags": [],
                    },
                }
            ],
        }
