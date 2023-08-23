# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import pytest
import os
import boto3
import json
from moto import mock_s3, mock_dynamodb, mock_cloudfront, mock_iam


@pytest.fixture
def s3_client():

    with mock_s3():
        region = os.environ.get("AWS_REGION")

        s3 = boto3.resource("s3", region_name=region)
        # Create the buckets
        default_bucket = os.environ.get("WEB_BUCKET_NAME")
        s3.create_bucket(Bucket=default_bucket)
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
                "subAccountBucketName": "ca-test-solutionloggingbucket0fa53b76-1xwsd8z6oehh9",
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
        app_pipeline_table = ddb.Table(app_pipeline_table_name)
        app_pipeline_table.put_item(
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
                        "parameterValue": "solution1-2-1-solutionloggingbucket0fa53b76-61wb3dr92joe",
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


def test_lambda_function(s3_client, ddb_client, cloudfront_client, iam_client):
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

    # ddb = boto3.resource("dynamodb", region_name=region)
    # eks_source_table_name = os.environ.get("EKS_LOG_SOURCE_TABLE")
    # app_pipeline_table_name = os.environ.get("APP_PIPELINE_TABLE")
    # pipeline_table_name = os.environ.get("PIPELINE_TABLE")

    # # eks source table should have deployment kind value
    # eks_source_table = ddb.Table(eks_source_table_name)
    # resp2 = eks_source_table.scan()
    # assert len(resp2["Items"]) == 1
    # item = resp2["Items"][0]
    # assert "deploymentKind" in item
    # assert item["deploymentKind"] == "DaemonSet"

    # app_pipeline_table = ddb.Table(app_pipeline_table_name)
    # resp3 = app_pipeline_table.scan()
    # assert len(resp3["Items"]) == 1
    # item = resp3["Items"][0]
    # assert "aosParas" not in item
    # assert "aosParams" in item
    # assert "bufferAccessRoleName" in item
    # assert "ec2RoleName" not in item
    # assert item["bufferType"] == "None"

    # pipeline_table = ddb.Table(pipeline_table_name)
    # resp4 = pipeline_table.scan()
    # assert len(resp4["Items"]) == 1
    # item = resp4["Items"][0]
    # ddb_params = item["parameters"]
    # warmAge_done = False
    # coldAge_done = False
    # retainAge_done = False
    # codec_done = False
    # refreshInterval_done = False
    # indexSuffix_done = False
    # rolloverSize_done = False
    # print(f"ddb_params is {ddb_params}")
    # for p in ddb_params:
    #     if p["parameterKey"] == "warmAge":
    #         warmAge_done = True
    #     elif p["parameterKey"] == "coldAge":
    #         coldAge_done = True
    #     elif p["parameterKey"] == "retainAge":
    #         retainAge_done = True
    #     elif p["parameterKey"] == "codec" and p["parameterValue"] == "default":
    #         codec_done = True
    #     elif p["parameterKey"] == "refreshInterval" and p["parameterValue"] == "1s":
    #         refreshInterval_done = True
    #     elif p["parameterKey"] == "indexSuffix" and p["parameterValue"] == "yyyy-MM-dd":
    #         indexSuffix_done = True
    #     elif p["parameterKey"] == "rolloverSize" and p["parameterValue"] == "":
    #         rolloverSize_done = True
    # assert warmAge_done
    # assert coldAge_done
    # assert retainAge_done
    # assert codec_done
    # assert refreshInterval_done
    # assert indexSuffix_done
    # assert rolloverSize_done
    # assert item["id"] == "840afc37-fa71-4cd4-90f8-a29ad908c390"
    # assert item["createdAt"] == "2023-01-04T09:14:42Z"
    # assert item["source"] == "test"
    # assert item["stackName"] == "Solution-Pipe-840af"
    # assert item["status"] == "CREATING"
    # assert item["target"] == "test-east1"
    # assert item["type"] == "WAF"

    # central_assume_role_policy_arn = os.environ.get("CENTRAL_ASSUME_ROLE_POLICY_ARN")
    # iam = boto3.client("iam", region_name=region)
    # policy = iam.get_policy(PolicyArn=central_assume_role_policy_arn)
    # policy_version = iam.get_policy_version(
    #     PolicyArn=central_assume_role_policy_arn,
    #     VersionId=policy["Policy"]["DefaultVersionId"],
    # )
    # policy_statement = policy_version["PolicyVersion"]["Document"]["Statement"]
    # assert policy_statement == [
    #     {
    #         "Action": "sts:AssumeRole",
    #         "Effect": "Allow",
    #         "Resource": [
    #             "arn:aws:iam::123456789012:role/ca-test-CrossAccountRoleFACE29D1-96TZ97IYN060"
    #         ],
    #     }
    # ]
