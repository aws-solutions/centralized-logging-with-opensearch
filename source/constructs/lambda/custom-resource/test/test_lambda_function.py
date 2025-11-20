# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import pytest
import os
import boto3
import json
from moto import mock_s3, mock_dynamodb, mock_cloudfront, mock_iam
from moto.core import DEFAULT_ACCOUNT_ID as ACCOUNT_ID

from commonlib.model import DomainImportType


def init_table(table, rows):
    with table.batch_writer() as batch:
        for data in rows:
            batch.put_item(Item=data)


@pytest.fixture
def s3_client():
    with mock_s3():
        region = os.environ.get("AWS_REGION")

        s3 = boto3.resource("s3", region_name=region)
        # Create the buckets
        default_bucket = os.environ.get("WEB_BUCKET_NAME")
        s3.create_bucket(Bucket=default_bucket)
        s3.create_bucket(Bucket=os.environ["DEFAULT_LOGGING_BUCKET"])
        s3.create_bucket(Bucket=os.environ["ACCESS_LOGGING_BUCKET"])
        yield


@pytest.fixture
def iam_client():
    with mock_iam():
        region = os.environ.get("AWS_REGION")

        iam = boto3.client("iam", region_name=region)
        policy_json = {
            "Version": "2012-10-17",
            "Statement": [
                {
                    "Action": [
                        "logs:CreateLogGroup",
                        "logs:CreateLogStream",
                        "logs:PutLogEvents",
                    ],
                    "Resource": "arn:aws:logs:us-east-1:123456789012:*",
                    "Effect": "Allow",
                }
            ],
        }
        response = iam.create_policy(
            PolicyName="mock-central-assume-role-policy",
            PolicyDocument=json.dumps(policy_json),
        )
        os.environ["CENTRAL_ASSUME_ROLE_POLICY_ARN"] = response["Policy"]["Arn"]
        yield


@pytest.fixture
def cloudfront_client():
    with mock_cloudfront():
        region = os.environ.get("AWS_REGION")

        cloudfront = boto3.client("cloudfront", region_name=region)

        response = cloudfront.create_distribution(
            DistributionConfig=dict(
                CallerReference="firstOne",
                Aliases=dict(Quantity=1, Items=["mydomain.com"]),
                DefaultRootObject="index.html",
                Comment="Test distribution",
                Enabled=True,
                Origins=dict(
                    Quantity=1,
                    Items=[
                        dict(
                            Id="1",
                            DomainName="mydomain.com.s3.amazonaws.com",
                            S3OriginConfig=dict(OriginAccessIdentity=""),
                        )
                    ],
                ),
                DefaultCacheBehavior=dict(
                    TargetOriginId="1",
                    ViewerProtocolPolicy="redirect-to-https",
                    TrustedSigners=dict(Quantity=0, Enabled=False),
                    ForwardedValues=dict(
                        Cookies={"Forward": "all"},
                        Headers=dict(Quantity=0),
                        QueryString=False,
                        QueryStringCacheKeys=dict(Quantity=0),
                    ),
                    MinTTL=1000,
                ),
            )
        )
        os.environ["CLOUDFRONT_DISTRIBUTION_ID"] = response["Distribution"]["Id"]
        yield


@pytest.fixture
def ddb_client():
    with mock_dynamodb():
        region = os.environ.get("AWS_REGION")

        ddb = boto3.resource("dynamodb", region_name=region)

        eks_source_table_name = os.environ.get("EKS_LOG_SOURCE_TABLE")
        app_pipeline_table_name = os.environ.get("APP_PIPELINE_TABLE")
        pipeline_table_name = os.environ.get("PIPELINE_TABLE")
        sub_account_link_table_name = os.environ.get("SUB_ACCOUNT_LINK_TABLE")

        opensearch_domain_table_name = os.environ.get("OPENSEARCH_DOMAIN_TABLE")
        table = ddb.create_table(
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
                "importMethod": DomainImportType.AUTOMATIC,
                "proxyALB": "",
                "proxyError": "",
                "proxyInput": {},
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
        ]

        init_table(table, data_list)

        ddb.create_table(
            TableName=sub_account_link_table_name,
            KeySchema=[{"AttributeName": "id", "KeyType": "HASH"}],
            AttributeDefinitions=[{"AttributeName": "id", "AttributeType": "S"}],
            ProvisionedThroughput={"ReadCapacityUnits": 5, "WriteCapacityUnits": 5},
        )
        sub_account_link_table = ddb.Table(sub_account_link_table_name)
        sub_account_link_table.put_item(
            Item={
                "id": "5d0c9861-28f1-4d66-8d84-0eb785060463",
                "agentConfDoc": "ca-test-FluentBitConfigDownloading-3KBw8CA0PMcg",
                "agentInstallDoc": "ca-test-FluentBitDocumentInstallation-3UddqmfkvYoB",
                "createdAt": "2022-11-26T11:54:02Z",
                "region": "us-east-1",
                "status": "ACTIVE",
                "subAccountBucketName": "amzn-s3-demo-logging-bucket",
                "subAccountId": "123456789012",
                "subAccountKMSKeyArn": "arn:aws:kms:us-east-1:123456789012:key/dd64f1a5-a4c7-4703-a2c8-4542158fd15f",
                "subAccountName": "My-account",
                "subAccountPublicSubnetIds": "",
                "subAccountRoleArn": "arn:aws:iam::123456789012:role/ca-test-CrossAccountRoleFACE29D1-96TZ97IYN060",
                "subAccountStackId": "arn:aws:cloudformation:us-east-1:123456789012:stack/ca-test/63639c20-6d7f-11ed-8a6d-0ab0cd798f0a",
                "subAccountVpcId": "",
            }
        )

        ddb.create_table(
            TableName=eks_source_table_name,
            KeySchema=[{"AttributeName": "id", "KeyType": "HASH"}],
            AttributeDefinitions=[{"AttributeName": "id", "AttributeType": "S"}],
            ProvisionedThroughput={"ReadCapacityUnits": 5, "WriteCapacityUnits": 5},
        )
        eks_source_table = ddb.Table(eks_source_table_name)
        eks_source_table.put_item(
            Item={
                "id": "2b660db9e4fe44a1a297b61938e98957",
                "eksClusterArn": "arn:aws:eks:us-east-1:123456789012:cluster/test",
                "eksClusterName": "test",
                "status": "ACTIVE",
                "createdAt": "2022-11-23T09:37:26Z",
                "updatedAt": "2022-11-23T09:37:26Z",
                "deploymentKind": "DaemonSet",
            }
        )
        ddb.create_table(
            TableName=app_pipeline_table_name,
            KeySchema=[{"AttributeName": "id", "KeyType": "HASH"}],
            AttributeDefinitions=[{"AttributeName": "id", "AttributeType": "S"}],
            ProvisionedThroughput={"ReadCapacityUnits": 5, "WriteCapacityUnits": 5},
        )
        table = ddb.Table(app_pipeline_table_name)
        table.put_item(
            Item={
                "id": "6683bcd2-befc-4c44-88f1-9501de1853ff",
                "aosParas": {"domainName": "dev"},
                "ec2RoleArn": "test",
                "ec2RoleName": "arn:aws:iam::1234567890:role/AOS-Agent-6683bcd2-befc-4c44-88f1-9501de1853ff",
                "status": "ACTIVE",
                "createdAt": "2022-11-23T09:37:26Z",
            }
        )
        ddb.create_table(
            TableName=pipeline_table_name,
            KeySchema=[{"AttributeName": "id", "KeyType": "HASH"}],
            AttributeDefinitions=[{"AttributeName": "id", "AttributeType": "S"}],
            ProvisionedThroughput={"ReadCapacityUnits": 5, "WriteCapacityUnits": 5},
        )
        pipeline_table = ddb.Table(pipeline_table_name)
        pipeline_table.put_item(
            Item={
                "id": "840afc37-fa71-4cd4-90f8-a29ad908c390",
                "createdAt": "2023-01-04T09:14:42Z",
                "parameters": [
                    {"parameterKey": "engineType", "parameterValue": "OpenSearch"},
                    {
                        "parameterKey": "logBucketName",
                        "parameterValue": "aws-waf-logs-solution-123456789012-us-east-1",
                    },
                    {
                        "parameterKey": "logBucketPrefix",
                        "parameterValue": "AWSLogs/123456789012/WAFLogs/cloudfront/test/",
                    },
                    {
                        "parameterKey": "endpoint",
                        "parameterValue": "vpc-test-east1-xxx.us-east-1.es.amazonaws.com",
                    },
                    {"parameterKey": "domainName", "parameterValue": "test-east1"},
                    {"parameterKey": "indexPrefix", "parameterValue": "test"},
                    {"parameterKey": "createDashboard", "parameterValue": "Yes"},
                    {
                        "parameterKey": "vpcId",
                        "parameterValue": "vpc-1234",
                    },
                    {
                        "parameterKey": "subnetIds",
                        "parameterValue": "subnet-1234,subnet-5678",
                    },
                    {
                        "parameterKey": "securityGroupId",
                        "parameterValue": "sg-1234",
                    },
                    {"parameterKey": "daysToWarm", "parameterValue": "0"},
                    {"parameterKey": "daysToCold", "parameterValue": "0"},
                    {"parameterKey": "daysToRetain", "parameterValue": "1"},
                    {"parameterKey": "shardNumbers", "parameterValue": "5"},
                    {"parameterKey": "replicaNumbers", "parameterValue": "1"},
                    {
                        "parameterKey": "backupBucketName",
                        "parameterValue": "amzn-s3-demo-logging-bucket",
                    },
                    {
                        "parameterKey": "defaultCmkArnParam",
                        "parameterValue": "arn:aws:kms:us-east-1:123456789012:key/880f02cb-ab63-4a49-bc29-139326589790",
                    },
                    {
                        "parameterKey": "logSourceAccountId",
                        "parameterValue": "123456789012",
                    },
                    {"parameterKey": "logSourceRegion", "parameterValue": "us-east-1"},
                    {
                        "parameterKey": "logSourceAccountAssumeRole",
                        "parameterValue": "",
                    },
                ],
                "source": "test",
                "stackName": "Solution-Pipe-840af",
                "status": "CREATING",
                "tags": [],
                "target": "test-east1",
                "type": "WAF",
            }
        )

        yield


def test_lambda_function(mocker, s3_client, ddb_client, cloudfront_client, iam_client):
    mocker.patch("lambda_function.is_advanced_security_enabled_safe", return_value=True)
    mocker.patch("lambda_function.set_master_user_arn")
    mocker.patch("lambda_function.enable_s3_bucket_access_logging")
    import lambda_function

    result = lambda_function.lambda_handler(None, None)
    # Expect Execute successfully.
    assert result == "OK"

    region = os.environ.get("AWS_REGION")
    s3 = boto3.resource("s3", region_name=region)

    default_bucket = os.environ.get("WEB_BUCKET_NAME")

    # Expect Config file is uploaded to S3
    obj = s3.Object(default_bucket, "aws-exports.json").get()
    assert "ContentLength" in obj
    assert obj["ContentLength"] > 0
