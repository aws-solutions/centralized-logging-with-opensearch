# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import io
import os
import json
import boto3
import pytest
import zipfile
import requests
import datetime
from moto import (
    mock_s3,
    mock_dynamodb,
    mock_sqs,
    mock_athena,
    mock_ses,
    mock_sns,
    mock_glue,
    mock_iam,
    mock_scheduler,
    mock_events,
    mock_sts,
    mock_stepfunctions,
    mock_rds,
    mock_lambda,
    mock_wafv2,
)


@pytest.fixture(autouse=True)  # type: ignore
def default_environment_variables():
    """Mocked AWS
    variables such as AWS credentials and region"""
    os.environ["AWS_ACCESS_KEY_ID"] = "mocked-aws-access-key-id"
    os.environ["AWS_SECRET_ACCESS_KEY"] = "mocked-aws-secret-access-key"
    os.environ["AWS_SESSION_TOKEN"] = "mocked-aws-session-token"
    os.environ["AWS_REGION"] = "us-east-1"
    os.environ["AWS_DEFAULT_REGION"] = "us-east-1"
    os.environ["ACCOUNT_ID"] = "123456789012"
    os.environ["STAGING_BUCKET_NAME"] = "staging-bucket"
    os.environ["STAGING_BUCKET_PREFIX"] = "AWSLogs/WAFLogs"
    os.environ["SOURCE_TYPE"] = "waf"
    os.environ["ENRICHMENT_PLUGINS"] = "geo_ip,user_agent"
    os.environ["CENTRALIZED_BUCKET_NAME"] = "centralized-bucket"
    os.environ["CENTRALIZED_BUCKET_PREFIX"] = "datalake"
    os.environ["LOGGING_BUCKET_NAME"] = "logging-bucket"
    os.environ["LOGGING_BUCKET_PREFIX"] = (
        f'AWSLogs/{os.environ["ACCOUNT_ID"]}/{os.environ["AWS_REGION"]}/WAFLogs/'
    )
    os.environ["ETL_LOG_TABLE_NAME"] = "ETLLogTable"
    os.environ["META_TABLE_NAME"] = "MetaTable"
    os.environ["CENTRALIZED_DATABASE"] = "centralized"
    os.environ["UNIQUE_DATABASE"] = "unique_database"
    os.environ["CENTRALIZED_CATALOG"] = "AwsDataCatalog"
    os.environ["TMP_DATABASE"] = "tmp"
    os.environ["S3_PUBLIC_ACCESS_POLICY"] = "S3PublicAccessPolicy-SJR01YRWEDSP"
    os.environ["SEND_TEMPLATE_EMAIL_SNS_PUBLIC_POLICY"] = (
        "SendTemplateEmailSNSPublicPolicy"
    )
    os.environ["REPLICATION_SQS_NAME"] = "LogEventQueue-Zvj0MU8DLnTp"
    os.environ["REPLICATION_DLQ_NAME"] = "LogEventDLQ-PYjliv5vefCc"
    os.environ["MIGRATION_SQS_NAME"] = "S3ObjectMigrationQ"
    os.environ["LOG_PROCESSOR_NAME"] = "LogProcessor-jwEfndaqF0Yf"
    os.environ["LOG_MERGER_NAME"] = "LogMerger-RseVgZbWTVYQ"
    os.environ["LOG_ARCHIVE_NAME"] = "LogArchive-HjIal34TEnuK"
    os.environ["PIPELINE_RESOURCES_BUILDER_FUNCTION_NAME"] = (
        "PipelineResourcesBuilder-bVBCdmLwhF08"
    )
    os.environ["S3_OBJECTS_REPLICATION_FUNCTION_NAME"] = (
        "S3ObjectReplication-ZaIMYAiOjVzz"
    )
    os.environ["S3_OBJECTS_REPLICATION_FUNCTION_ARN"] = (
        f'arn:aws:lambda:{os.environ["AWS_REGION"]}:{os.environ["ACCOUNT_ID"]}:function:{os.environ["S3_OBJECTS_REPLICATION_FUNCTION_NAME"]}'
    )
    os.environ["S3_OBJECTS_SCANNING_FUNCTION_NAME"] = "S3ObjectScanning-vHVIc4qyW86Q"
    os.environ["S3_OBJECTS_SCANNING_FUNCTION_ARN"] = (
        f'arn:aws:lambda:{os.environ["AWS_REGION"]}:{os.environ["ACCOUNT_ID"]}:function:{os.environ["S3_OBJECTS_SCANNING_FUNCTION_NAME"]}'
    )
    os.environ["S3_OBJECTS_SCANNING_ROLE_ARN"] = (
        f'arn:aws:iam:{os.environ["AWS_REGION"]}:{os.environ["ACCOUNT_ID"]}:role/{os.environ["S3_OBJECTS_SCANNING_FUNCTION_NAME"]}'
    )
    os.environ["S3_OBJECT_SCANNING_EVENT"] = json.dumps(
        {
            "keepPrefix": True,
            "size": "100MiB",
            "deleteOnSuccess": False,
            "extra": {
                "parentTaskId": "00000000-0000-0000-0000-000000000000",
                "API": "Lambda: Invoke",
                "stateName": "Step 1: S3 Migration Task from Staging to Archive",
                "stateMachineName": "LogProcessor-HBTz7GoOjZoz",
                "pipelineId": "189f73eb-1808-47e4-a9db-ee9c35100abe",
            },
            "sourceType": "alb",
            "enrichmentPlugins": ["geo_ip", "user_agent"],
            "merge": True,
            "executionName": "e4233e1a-1797-49d5-926f-3339504296df",
            "sqsName": os.environ["MIGRATION_SQS_NAME"],
            "srcPath": f's3://{os.environ["STAGING_BUCKET_NAME"]}/AWSLogs/{os.environ["ACCOUNT_ID"]}/centralized/aws_apigateway_logs_gz/__ds__=2023-03-11',
            "dstPath": f's3://{os.environ["STAGING_BUCKET_NAME"]}/archive/centralized/aws_apigateway_logs_gz/__ds__=2023-03-11',
            "taskToken": "",
        }
    )
    os.environ["S3_OBJECTS_MIGRATION_FUNCTION_NAME"] = "S3ObjectMigration-EmUwufE73oj1"
    os.environ["S3_OBJECT_MIGRATION_EVENT"] = json.dumps(
        {
            "Records": [
                {
                    "body": {
                        "executionName": "1ebf165b-f846-4813-8cab-305be5c8ca7e",
                        "taskId": "9d512f44-7626-49e2-a465-f450e93f6388",
                        "taskToken": "",
                        "deleteOnSuccess": False,
                        "merge": False,
                        "data": [
                            {
                                "source": {
                                    "bucket": os.environ["STAGING_BUCKET_NAME"],
                                    "key": f'AWSLogs/{os.environ["ACCOUNT_ID"]}/centralized/aws_apigateway_logs_gz/__ds__=2023-03-11-20-01/region={os.environ["AWS_REGION"]}/__execution_name__=b49a793b-38d2-40c0-af22-cfacf494732e/apigateway1.gz',
                                },
                                "destination": {
                                    "bucket": os.environ["STAGING_BUCKET_NAME"],
                                    "key": f'archive/AWSLogs/{os.environ["ACCOUNT_ID"]}/centralized/aws_apigateway_logs_gz/__ds__=2023-03-11-20-01/region={os.environ["AWS_REGION"]}/__execution_name__=b49a793b-38d2-40c0-af22-cfacf494732e/apigateway1.gz',
                                },
                            }
                        ],
                        "parentTaskId": "6b10286b-c4b3-44ed-b4e8-c251a04b6a59",
                    }
                },
                {
                    "body": {
                        "executionName": "1ebf165b-f846-4813-8cab-305be5c8ca7e",
                        "taskId": "bc73c25b-49c1-4d9f-a005-d0853809260d",
                        "taskToken": "",
                        "deleteOnSuccess": False,
                        "merge": False,
                        "data": [
                            {
                                "source": {
                                    "bucket": os.environ["STAGING_BUCKET_NAME"],
                                    "key": f'AWSLogs/{os.environ["ACCOUNT_ID"]}/centralized/aws_apigateway_logs_gz/__ds__=2023-03-11-20-01/region={os.environ["AWS_REGION"]}/__execution_name__=b49a793b-38d2-40c0-af22-cfacf494732e/apigateway2.gz',
                                },
                                "destination": {
                                    "bucket": os.environ["STAGING_BUCKET_NAME"],
                                    "key": f'archive/AWSLogs/{os.environ["ACCOUNT_ID"]}/centralized/aws_apigateway_logs_gz/__ds__=2023-03-11-20-01/region={os.environ["AWS_REGION"]}/__execution_name__=b49a793b-38d2-40c0-af22-cfacf494732e/apigateway2.gz',
                                },
                            }
                        ],
                        "parentTaskId": "6b10286b-c4b3-44ed-b4e8-c251a04b6a59",
                    }
                },
            ]
        }
    )
    os.environ["ETL_LOG_WRITER_FUNCTION_NAME"] = "ETLLogWriter-nbE7A8RVBIH0"
    os.environ["ATHENA_TABLE_NAME"] = "aws_apigateway_logs_parquet"
    os.environ["ATHENA_WORK_GROUP"] = "Primary"
    os.environ["ATHENA_OUTPUT_LOCATION"] = (
        f's3://{os.environ["STAGING_BUCKET_NAME"]}/athena-results'
    )
    os.environ["ATHENA_PUBLIC_ACCESS_ROLE"] = (
        f'arn:aws:iam::{os.environ["ACCOUNT_ID"]}:role/AthenaPublicAccessRole'
    )
    os.environ["ETL_ALTER_ATHENA_PARTITION_FUNCTION_NAME"] = (
        "ETLAlterAthenaPartition-WuQ7BUYqgA2L"
    )
    os.environ["ETL_ALTER_ATHENA_PARTITION_EVENT"] = json.dumps(
        {
            "API": "Athena: BatchUpdatePartition",
            "executionName": "848be54a-ae2c-414c-9ae3-f0b3d11089ab",
            "taskId": "9d512f44-7626-49e2-a465-f450e93f6388",
            "parameters": {
                "action": "ADD",
                "catalog": "AwsDataCatalog",
                "database": "centralized",
                "tableName": "aws_apigateway_logs_parquet",
                "location": f's3://{os.environ["STAGING_BUCKET_NAME"]}/AWSLogs/{os.environ["ACCOUNT_ID"]}/centralized/aws_apigateway_logs_parquet/',
                "partitionPrefix": "__ds__=2023-03-11",
                "workGroup": os.environ["ATHENA_WORK_GROUP"],
                "outputLocation": os.environ["ATHENA_OUTPUT_LOCATION"],
            },
            "extra": {
                "parentTaskId": "00000000-0000-0000-0000-000000000000",
                "stateMachineName": "LogMerger-7vcYqNfMtsJK",
                "stateName": "Step 2: Drop partitions for History data",
                "pipelineId": "189f73eb-1808-47e4-a9db-ee9c35100abe",
            },
        }
    )
    os.environ["SOURCE"] = "alejandro_rosalez@example.com"
    os.environ["SEND_EMAIL_EVENT"] = json.dumps(
        {
            "Records": [
                {
                    "EventSource": "aws:sns",
                    "EventVersion": "1.0",
                    "EventSubscriptionArn": f'arn:aws:sns:{os.environ["AWS_REGION"]}:{os.environ["ACCOUNT_ID"]}:AlarmNotification:1f4157b9-89c6-49f2-8102-e75f02b47d1d',
                    "Sns": {
                        "Type": "Notification",
                        "MessageId": "07682422-f1b6-5d81-a63e-78ba3563c6c8",
                        "TopicArn": f'arn:aws:sns:{os.environ["AWS_REGION"]}:{os.environ["ACCOUNT_ID"]}:AlarmNotification',
                        "Subject": None,
                        "Message": '{"API":"SNS: Publish","executionId":"arn:aws:states:us-east-1:123456789012:execution:LogProcessor-HBTz7GoOjZoz:1ebf165b-f846-4813-8cab-305be5c8ca7e","executionName":"1ebf165b-f846-4813-8cab-305be5c8ca7e","status":"Failed","notification":{"service":"SES","recipients":["alejandro_rosalez@example.com"]},"stateName":"Send Failure Notification","sourceType":"ALB","stateMachineId":"arn:aws:states:us-east-1:123456789012:stateMachine:LogProcessor-HBTz7GoOjZoz","stateMachineName":"LogProcessor-HBTz7GoOjZoz","tableName":"aws_alb_logs","scheduleType":"LogProcessor","archivePath":"s3://stagingbucket/archive/aws_alb_logs/elasticloadbalancing/deba876a-6f13-4ac1-bd12-252254b7cd06","pipelineId":"189f73eb-1808-47e4-a9db-ee9c35100abe"}',
                        "Timestamp": "2023-03-25T09:44:53.505Z",
                        "SignatureVersion": "1",
                        "Signature": "YJ8hff1MYnoQmFupkhWyAXRutgKiF78XUBp2Ir8b7o6QSEPkghM29D53o2PcGqKGy9jJ4ubsDWcZGXALH+s6qqXOPGAuOfrRHyzEbsoSIoKZMXguANxdpPVfgKkuLDmYRDQ4o4KHUzoiNXPn04K+1dp2JOD+1tU4tgkNpIHcvAdhkBqlfDDuDLn1q7U6u75cXh/JG6Way+828XGQ2pgCeR5wqjeb03i5Lrt1KKB0sDNMCkoMchAen0Ol8B5Eq8tjJkRZEhjZhMppuuAvL40hU95fMxhEiouxmk9hpphV59H9fabxzW9gzF7EbAOAJOUhSxM7aVyI5Bf/1zGbKXoEYg==",
                        "SigningCertUrl": f'https://sns.{os.environ["AWS_REGION"]}.amazonaws.com/SimpleNotificationService-56e67fcb41f6fec09b0196692625d385.pem',
                        "UnsubscribeUrl": f'https://sns.{os.environ["AWS_REGION"]}.amazonaws.com/?Action=Unsubscribe&SubscriptionArn=arn:aws:sns:{os.environ["AWS_REGION"]}:{os.environ["ACCOUNT_ID"]}:AlarmNotification:1f4157b9-89c6-49f2-8102-e75f02b47d1d',
                        "MessageAttributes": {},
                    },
                }
            ]
        }
    )
    os.environ["SES_EMAIL_TEMPLATE"] = "MicroBatchEmailTemplate"
    os.environ["SES_EMAIL_TEMPLATE_CONTENT"] = json.dumps(
        {
            "TemplateName": os.environ["SES_EMAIL_TEMPLATE"],
            "SubjectPart": "[Notification] {{stateMachine.name}} task {{stateMachine.status}} to execute.",
            "HtmlPart": """<p>Hello</p>
                    <p>You are receiving this follow-up notification because you have one or more {{stateMachine.name}} 
                    tasks {{stateMachine.status}} to execute.</p>
                    <table style="border-collapse: collapse; width: 100%;">
                        <tr>
                            <th style="border: 1px solid #ddd; padding: 8px; padding-top: 12px; padding-bottom: 12px; text-align: left;">App Pipeline Id</th>
                            <th style="border: 1px solid #ddd; padding: 8px; padding-top: 12px; padding-bottom: 12px; text-align: left;">Index Name</th>
                            <th style="border: 1px solid #ddd; padding: 8px; padding-top: 12px; padding-bottom: 12px; text-align: left;">Ingestion Id</th>
                            <th style="border: 1px solid #ddd; padding: 8px; padding-top: 12px; padding-bottom: 12px; text-align: left;">Type</th>
                            <th style="border: 1px solid #ddd; padding: 8px; padding-top: 12px; padding-bottom: 12px; text-align: left;">State Machines</th>
                            <th style="border: 1px solid #ddd; padding: 8px; padding-top: 12px; padding-bottom: 12px; text-align: left;">Execution Name</th>
                        </tr>
                        <tr>
                            <td style="border: 1px solid #ddd; padding: 8px;">{{appPipeline.id}}</td>
                            <td style="border: 1px solid #ddd; padding: 8px;">{{appPipeline.indexName}}</td>
                            <td style="border: 1px solid #ddd; padding: 8px;">{{ingestion.id}}</td>
                            <td style="border: 1px solid #ddd; padding: 8px;">{{ingestion.type}}</td>
                            <td style="border: 1px solid #ddd; padding: 8px;"><a href={{stateMachine.url}}>{{stateMachine.name}}</a></td>
                            <td style="border: 1px solid #ddd; padding: 8px;"><a href={{execution.url}}>{{execution.name}}</a></td>
                        </tr>
                    </table>
                    {{#if logs}}
                        <p>The execution log of task {{stateMachine.name}} is as follows:</p>
                        <table style="border-collapse: collapse; width: 100%;">
                            <tr>
                                <th style="border: 1px solid #ddd; padding: 8px; padding-top: 12px; padding-bottom: 12px; text-align: left;">stateName</th>
                                <th style="border: 1px solid #ddd; padding: 8px; padding-top: 12px; padding-bottom: 12px; text-align: left;">API</th>
                                <th style="border: 1px solid #ddd; padding: 8px; padding-top: 12px; padding-bottom: 12px; text-align: left;">startTime</th>
                                <th style="border: 1px solid #ddd; padding: 8px; padding-top: 12px; padding-bottom: 12px; text-align: left;">endTime</th>
                                <th style="border: 1px solid #ddd; padding: 8px; padding-top: 12px; padding-bottom: 12px; text-align: left;">status</th>
                            </tr>
                            {{#each logs}}
                                <tr>
                                    <td style="border: 1px solid #ddd; padding: 8px;">{{stateName}}</td>
                                    <td style="border: 1px solid #ddd; padding: 8px;">{{API}}</td>
                                    <td style="border: 1px solid #ddd; padding: 8px;">{{startTime}}</td>
                                    <td style="border: 1px solid #ddd; padding: 8px;">{{endTime}}</td>
                                    <td style="border: 1px solid #ddd; padding: 8px;">{{status}}</td>
                                </tr>
                            {{/each}}
                        </table>
                    {{/if}}
                    {{#if archivePath}}
                        <p><font color="#FF0000">Objects will be deleted after a few days, so please check these logs as soon as possible, you can find them in the following buckets.</font></p>
                        <p><b>S3 Bucket URL: </b><i>{{archivePath}}</i></p>
                    {{/if}}""",
            "TextPart": "Best regards",
        }
    )
    os.environ["WAF_PIPELINE_ID"] = "949cc17d-38da-42d0-a030-4f0508a181b2"
    os.environ["WAF_INGESTION_ID"] = "dddc2d66-ac99-48a5-834d-dc2d5b75069b"
    os.environ["PIPELINE_ID"] = os.environ["WAF_PIPELINE_ID"]
    os.environ["APPLICATION_PIPELINE_ID"] = "0616c38e-b31f-401e-a642-677849226c5b"
    os.environ["APPLICATION_INGESTION_ID"] = "29df4748-3a26-4ccb-ab68-f62629a57cb5"
    os.environ["AURORA_MYSQL5_CLUSTER_IDENTIFIER"] = "aurora_mysql_cluster_5"
    os.environ["AURORA_MYSQL8_CLUSTER_IDENTIFIER"] = "aurora_mysql_cluster_8"
    os.environ["AURORA_POSTGRESQL_CLUSTER_IDENTIFIER"] = "aurora_postgresql_cluster"
    os.environ["AURORA_MYSQL8_INSTANCE_IDENTIFIER"] = "aurora_mysql_instance_8"
    os.environ["MYSQL5_INSTANCE_IDENTIFIER"] = "mysql-instance-5"
    os.environ["MYSQL8_INSTANCE_IDENTIFIER"] = "mysql-instance-8"
    os.environ["POSTGRESQL_INSTANCE_IDENTIFIER"] = "postgresql-instance"


@pytest.fixture
def mock_s3_context():
    with mock_s3():
        aws_region = os.environ.get("AWS_REGION")
        account_id = os.environ["ACCOUNT_ID"]
        staging_bucket_name = os.environ["STAGING_BUCKET_NAME"]
        logging_bucket_name = os.environ["LOGGING_BUCKET_NAME"]
        centralized_bucket_name = os.environ["CENTRALIZED_BUCKET_NAME"]
        s3 = boto3.client("s3")
        # s3.create_bucket(Bucket=bucket_name, CreateBucketConfiguration={'LocationConstraint': region})
        s3.create_bucket(Bucket=logging_bucket_name)
        s3.create_bucket(Bucket=centralized_bucket_name)
        s3.create_bucket(Bucket=staging_bucket_name)
        current_dir = os.path.dirname(os.path.abspath(__file__))

        for i in range(2000):
            s3.put_object(
                Bucket=staging_bucket_name,
                Key=f"AWSLogs/{account_id}/elasticloadbalancing/elb{str(i)}.log",
                Body="my_value",
            )

        s3.put_object(
            Bucket=staging_bucket_name,
            Key=f"AWSLogs/{account_id}/elasticloadbalancing/alb1.log",
            Body="my_value",
        )
        s3.put_object(
            Bucket=staging_bucket_name,
            Key=f"AWSLogs/{account_id}/elasticloadbalancing/alb2.log",
            Body="my_value",
        )
        s3.put_object(
            Bucket=staging_bucket_name,
            Key=f"AWSLogs/{account_id}/elasticloadbalancing/alb3.log",
            Body="my_value",
        )
        s3.put_object(Bucket=staging_bucket_name, Key=f"AWSLogs/{account_id}/alb/")
        s3.put_object(
            Bucket=staging_bucket_name, Key=f"AWSLogs/{account_id}/cloudfront/"
        )
        s3.put_object(Bucket=staging_bucket_name, Key=f"AWSLogs/{account_id}/waf/")
        s3.put_object(
            Bucket=staging_bucket_name, Key=f"AWSLogs/{account_id}/apigateway/"
        )
        s3.put_object(
            Bucket=staging_bucket_name,
            Key=f"AWSLogs/{account_id}/centralized/aws_apigateway_logs_gz/__ds__=2023-03-11-20-01/",
        )
        s3.upload_file(
            f"{current_dir}/data/alb.log.gz",
            Bucket=staging_bucket_name,
            Key=f"AWSLogs/{account_id}/alb/alb.log.gz",
        )
        s3.upload_file(
            f"{current_dir}/data/cloudfront.log.gz",
            Bucket=staging_bucket_name,
            Key=f"AWSLogs/{account_id}/cloudfront/cloudfront.log.gz",
        )
        s3.upload_file(
            f"{current_dir}/data/apigateway1.gz",
            Bucket=staging_bucket_name,
            Key=f"AWSLogs/{account_id}/centralized/aws_apigateway_logs_gz/__ds__=2023-03-11-20-01/region={aws_region}/__execution_name__=b49a793b-38d2-40c0-af22-cfacf494732e/apigateway1.gz",
        )
        s3.upload_file(
            f"{current_dir}/data/apigateway2.gz",
            Bucket=staging_bucket_name,
            Key=f"AWSLogs/{account_id}/centralized/aws_apigateway_logs_gz/__ds__=2023-03-11-20-01/region={aws_region}/__execution_name__=b49a793b-38d2-40c0-af22-cfacf494732e/apigateway2.gz",
        )
        s3.upload_file(
            f"{current_dir}/data/apigateway3.gz",
            Bucket=staging_bucket_name,
            Key=f"AWSLogs/{account_id}/centralized/aws_apigateway_logs_gz/__ds__=2023-03-11-20-01/region={aws_region}/__execution_name__=b49a793b-38d2-40c0-af22-cfacf494732e/apigateway3.gz",
        )
        s3.upload_file(
            f"{current_dir}/data/apigateway1.gz",
            Bucket=staging_bucket_name,
            Key=f"AWSLogs/{account_id}/centralized/aws_apigateway_logs_gz/__ds__=2023-03-12-01-01/region={aws_region}/__execution_name__=4e837fb3-6756-4723-9dd0-766abc1d47d2/apigateway1.gz",
        )
        s3.upload_file(
            f"{current_dir}/data/apigateway2.gz",
            Bucket=staging_bucket_name,
            Key=f"AWSLogs/{account_id}/centralized/aws_apigateway_logs_gz/__ds__=2023-03-12-02-40/region={aws_region}/__execution_name__=4e837fb3-6756-4723-9dd0-766abc1d47d2/apigateway2.gz",
        )
        s3.upload_file(
            f"{current_dir}/data/apigateway3.gz",
            Bucket=staging_bucket_name,
            Key=f"AWSLogs/{account_id}/centralized/aws_apigateway_logs_gz/__ds__=2023-03-12-03-59/region={aws_region}/__execution_name__=4e837fb3-6756-4723-9dd0-766abc1d47d2/apigateway3.gz",
        )
        s3.upload_file(
            f"{current_dir}/data/apigateway1.gz",
            Bucket=staging_bucket_name,
            Key=f"AWSLogs/{account_id}/centralized/aws_apigateway_logs_gz/__ds__=2023-03-13-02-01/region={aws_region}/__execution_name__=03ed14db-7a91-4eda-a44f-6270efce4fd9/apigateway1.gz",
        )
        s3.upload_file(
            f"{current_dir}/data/apigateway2.gz",
            Bucket=staging_bucket_name,
            Key=f"AWSLogs/{account_id}/centralized/aws_apigateway_logs_gz/__ds__=2023-03-13-02-05/region={aws_region}/__execution_name__=c399c496-3f6a-4f4d-99e6-890493f19278/apigateway2.gz",
        )
        s3.upload_file(
            f"{current_dir}/data/apigateway3.gz",
            Bucket=staging_bucket_name,
            Key=f"AWSLogs/{account_id}/centralized/aws_apigateway_logs_gz/__ds__=2023-03-13-02-59/region={aws_region}/__execution_name__=c399c496-3f6a-4f4d-99e6-890493f19278/apigateway3.gz",
        )
        s3.upload_file(
            f"{current_dir}/data/apigateway1.parquet",
            Bucket=staging_bucket_name,
            Key=f"AWSLogs/{account_id}/centralized/aws_apigateway_logs_parquet/__ds__=2023-03-11-20-01/region={aws_region}/__execution_name__=b49a793b-38d2-40c0-af22-cfacf494732e/apigateway1.parquet",
        )
        s3.upload_file(
            f"{current_dir}/data/apigateway2.parquet",
            Bucket=staging_bucket_name,
            Key=f"AWSLogs/{account_id}/centralized/aws_apigateway_logs_parquet/__ds__=2023-03-11-18-01/region={aws_region}/__execution_name__=b49a793b-38d2-40c0-af22-cfacf494732e/apigateway2.parquet",
        )
        s3.upload_file(
            f"{current_dir}/data/apigateway3.parquet",
            Bucket=staging_bucket_name,
            Key=f"AWSLogs/{account_id}/centralized/aws_apigateway_logs_parquet/__ds__=2023-03-11-18-01/region={aws_region}/__execution_name__=b49a793b-38d2-40c0-af22-cfacf494732e/apigateway3.parquet",
        )
        s3.upload_file(
            f"{current_dir}/data/apigateway1.parquet",
            Bucket=staging_bucket_name,
            Key=f"AWSLogs/{account_id}/centralized/aws_apigateway_logs_parquet/__ds__=2023-03-30-20-01/region={aws_region}/__execution_name__=b49a793b-38d2-40c0-af22-cfacf494732e/apigateway1.parquet",
        )
        s3.upload_file(
            f"{current_dir}/data/apigateway2.parquet",
            Bucket=staging_bucket_name,
            Key=f"AWSLogs/{account_id}/centralized/aws_apigateway_logs_parquet/__ds__=2023-03-30-18-01/region={aws_region}/__execution_name__=b49a793b-38d2-40c0-af22-cfacf494732e/apigateway2.parquet",
        )
        s3.upload_file(
            f"{current_dir}/data/apigateway3.parquet",
            Bucket=staging_bucket_name,
            Key=f"AWSLogs/{account_id}/centralized/aws_apigateway_logs_parquet/__ds__=2023-03-30-18-01/region={aws_region}/__execution_name__=b49a793b-38d2-40c0-af22-cfacf494732e/apigateway3.parquet",
        )

        yield


@pytest.fixture
def mock_sqs_context():
    with mock_sqs():
        aws_region = os.environ.get("AWS_REGION")
        account_id = os.environ.get("ACCOUNT_ID")
        migration_sqs_name = os.environ.get("MIGRATION_SQS_NAME")
        replication_sqs_name = os.environ.get("REPLICATION_SQS_NAME")
        replication_dlq_name = os.environ.get("REPLICATION_DLQ_NAME")
        sqs = boto3.resource("sqs", region_name=aws_region)
        migration_queue = sqs.create_queue(QueueName=migration_sqs_name)  # type: ignore
        os.environ["MIGRATION_SQS_URL"] = migration_queue.url
        os.environ["MIGRATION_SQS_ARN"] = (
            f"arn:aws:sqs:{aws_region}:{account_id}:{migration_sqs_name}"
        )

        replication_queue = sqs.create_queue(QueueName=replication_sqs_name)  # type: ignore
        os.environ["REPLICATION_SQS_URL"] = replication_queue.url
        os.environ["REPLICATION_SQS_ARN"] = (
            f"arn:aws:sqs:{aws_region}:{account_id}:{replication_sqs_name}"
        )

        replication_dlq = sqs.create_queue(QueueName=replication_dlq_name)  # type: ignore
        os.environ["REPLICATION_DLQ_URL"] = replication_dlq.url
        os.environ["REPLICATION_DLQ_ARN"] = (
            f"arn:aws:sqs:{aws_region}:{account_id}:{replication_dlq_name}"
        )
        yield


@pytest.fixture
def mock_iam_context():
    with mock_iam():
        aws_region = os.environ.get("AWS_REGION")
        account_id = os.environ["ACCOUNT_ID"]
        staging_bucket_name = os.environ["STAGING_BUCKET_NAME"]
        logging_bucket_name = os.environ["LOGGING_BUCKET_NAME"]
        s3_public_access_policy = os.environ["S3_PUBLIC_ACCESS_POLICY"]
        s3_objects_replication_function_name = os.environ[
            "S3_OBJECTS_REPLICATION_FUNCTION_NAME"
        ]
        send_template_email_sns_public_policy = os.environ[
            "SEND_TEMPLATE_EMAIL_SNS_PUBLIC_POLICY"
        ]
        log_processor_name = os.environ["LOG_PROCESSOR_NAME"]
        log_merger_name = os.environ["LOG_MERGER_NAME"]
        log_archive_name = os.environ["LOG_ARCHIVE_NAME"]

        iam_client = boto3.client("iam")

        policy_document = {
            "Version": "2012-10-17",
            "Statement": [
                {
                    "Action": [
                        "s3:ListBucket",
                        "s3:ListBucketMultipartUploads",
                        "s3:ListMultipartUploadParts",
                        "s3:GetObject",
                        "s3:GetBucketLocation",
                        "s3:AbortMultipartUpload",
                        "s3:CreateBucket",
                        "s3:PutObject",
                        "s3:DeleteObject",
                    ],
                    "Resource": [
                        f"arn:aws:s3:::{staging_bucket_name}",
                        f"arn:aws:s3:::{staging_bucket_name}/*",
                    ],
                    "Effect": "Allow",
                },
                {
                    "Sid": "S3AccessPolicyForDestination",
                    "Action": [
                        "s3:ListBucket",
                        "s3:ListBucketMultipartUploads",
                        "s3:ListMultipartUploadParts",
                        "s3:GetObject",
                        "s3:GetBucketLocation",
                        "s3:AbortMultipartUpload",
                        "s3:CreateBucket",
                        "s3:PutObject",
                        "s3:DeleteObject",
                    ],
                    "Resource": [
                        f"arn:aws:s3:::{logging_bucket_name}",
                        f"arn:aws:s3:::{logging_bucket_name}/*",
                    ],
                    "Effect": "Allow",
                },
            ],
        }

        response = iam_client.create_policy(
            PolicyName=s3_public_access_policy,
            PolicyDocument=json.dumps(policy_document),
        )
        s3_public_access_policy_arn = response["Policy"]["Arn"]
        os.environ["S3_PUBLIC_ACCESS_POLICY_ARN"] = s3_public_access_policy_arn

        assume_role_policy_document = {
            "Version": "2012-10-17",
            "Statement": [
                {
                    "Effect": "Allow",
                    "Principal": {"Service": ["lambda.amazonaws.com"]},
                    "Action": ["sts:AssumeRole"],
                }
            ],
        }
        response = iam_client.create_role(
            RoleName=s3_objects_replication_function_name,
            AssumeRolePolicyDocument=json.dumps(assume_role_policy_document),
        )
        os.environ["S3_OBJECTS_REPLICATION_ROLE_ARN"] = response["Role"]["Arn"]

        iam_client.put_role_policy(
            RoleName=s3_objects_replication_function_name,
            PolicyName="S3ObjectsReplicationPolicy",
            PolicyDocument=json.dumps(policy_document),
        )

        policy_document = {
            "Version": "2012-10-17",
            "Statement": [
                {"Effect": "Allow", "Action": "sns:ListTopics", "Resource": "*"}
            ],
        }
        response = iam_client.create_policy(
            PolicyName=send_template_email_sns_public_policy,
            PolicyDocument=json.dumps(policy_document),
        )
        send_template_email_sns_public_policy_arn = response["Policy"]["Arn"]
        os.environ["SEND_TEMPLATE_EMAIL_SNS_PUBLIC_POLICY_ARN"] = (
            send_template_email_sns_public_policy_arn
        )

        response = iam_client.create_role(
            RoleName=log_processor_name,
            AssumeRolePolicyDocument=json.dumps(assume_role_policy_document),
        )
        os.environ["LOG_PROCESSOR_START_EXECUTION_ROLE_ARN"] = response["Role"]["Arn"]

        response = iam_client.create_role(
            RoleName=log_merger_name,
            AssumeRolePolicyDocument=json.dumps(assume_role_policy_document),
        )
        os.environ["LOG_MERGER_START_EXECUTION_ROLE_ARN"] = response["Role"]["Arn"]

        response = iam_client.create_role(
            RoleName=log_archive_name,
            AssumeRolePolicyDocument=json.dumps(assume_role_policy_document),
        )
        os.environ["LOG_ARCHIVE_START_EXECUTION_ROLE_ARN"] = response["Role"]["Arn"]

        policy_document = {
            "Version": "2012-10-17",
            "Statement": [
                {
                    "Sid": "EventBridge",
                    "Effect": "Allow",
                    "Action": [
                        "events:PutRule",
                        "events:DeleteRule",
                        "events:PutTargets",
                        "events:ListRules",
                        "events:ListTargetsByRule",
                        "events:RemoveTargets",
                    ],
                    "Resource": [
                        f"arn:aws:events:{aws_region}:{account_id}:rule/*/*",
                        f"arn:aws:events:{aws_region}:{account_id}:rule/*",
                    ],
                }
            ],
        }
        response = iam_client.create_role(
            RoleName="PipelineResourcesBuilderRole",
            AssumeRolePolicyDocument=json.dumps(assume_role_policy_document),
        )
        os.environ["PIPELINE_RESOURCES_BUILDER_ROLE_ARN"] = response["Role"]["Arn"]
        response = iam_client.create_policy(
            PolicyName="PipelineResourcesBuilderSchedulePolicy",
            PolicyDocument=json.dumps(policy_document),
        )
        os.environ["PIPELINE_RESOURCES_BUILDER_SCHEDULE_POLICY_ARN"] = response[
            "Policy"
        ]["Arn"]
        iam_client.attach_role_policy(
            RoleName="PipelineResourcesBuilderRole", PolicyArn=response["Policy"]["Arn"]
        )

        yield


@pytest.fixture
def mock_ddb_context():
    with mock_dynamodb():
        aws_region = os.environ["AWS_REGION"]
        account_id = os.environ["ACCOUNT_ID"]
        staging_bucket_name = os.environ["STAGING_BUCKET_NAME"]
        etl_log_table_name = os.environ.get("ETL_LOG_TABLE_NAME")
        meta_table_name = os.environ["META_TABLE_NAME"]
        log_processor_name = os.environ["LOG_PROCESSOR_NAME"]
        log_merger_name = os.environ["LOG_MERGER_NAME"]
        log_archive_name = os.environ["LOG_ARCHIVE_NAME"]
        tmp_database_name = os.environ["TMP_DATABASE"]
        s3_public_access_policy = os.environ["S3_PUBLIC_ACCESS_POLICY"]
        athena_work_group = os.environ["ATHENA_WORK_GROUP"]
        athena_output_location = os.environ["ATHENA_OUTPUT_LOCATION"]
        athena_public_access_role = os.environ["ATHENA_PUBLIC_ACCESS_ROLE"]
        send_template_email_sns_public_policy = os.environ[
            "SEND_TEMPLATE_EMAIL_SNS_PUBLIC_POLICY"
        ]
        centralized_bucket_name = os.environ["CENTRALIZED_BUCKET_NAME"]
        centralized_bucket_prefix = os.environ["CENTRALIZED_BUCKET_PREFIX"]
        centralized_catalog = os.environ["CENTRALIZED_CATALOG"]
        centralized_database = os.environ["CENTRALIZED_DATABASE"]
        replication_sqs_arn = os.environ["REPLICATION_SQS_ARN"]
        replication_dlq_arn = os.environ["REPLICATION_DLQ_ARN"]
        replication_function_arn = os.environ["S3_OBJECTS_REPLICATION_FUNCTION_ARN"]
        replication_role_arn = os.environ["S3_OBJECTS_REPLICATION_ROLE_ARN"]
        logging_bucket_name = os.environ["LOGGING_BUCKET_NAME"]
        logging_bucket_prefix = os.environ["LOGGING_BUCKET_PREFIX"]
        waf_pipeline_id = os.environ["WAF_PIPELINE_ID"]
        waf_ingestion_id = os.environ["WAF_INGESTION_ID"]
        application_pipeline_id = os.environ["APPLICATION_PIPELINE_ID"]
        application_ingestion_id = os.environ["APPLICATION_INGESTION_ID"]
        log_processor_start_execution_role_arn = os.environ[
            "LOG_PROCESSOR_START_EXECUTION_ROLE_ARN"
        ]
        log_merger_start_execution_role_arn = os.environ[
            "LOG_MERGER_START_EXECUTION_ROLE_ARN"
        ]
        log_archive_start_execution_role_arn = os.environ[
            "LOG_ARCHIVE_START_EXECUTION_ROLE_ARN"
        ]
        pipeline_resources_builder_role_arn = os.environ[
            "PIPELINE_RESOURCES_BUILDER_ROLE_ARN"
        ]
        pipeline_resources_builder_schedule_policy_arn = os.environ[
            "PIPELINE_RESOURCES_BUILDER_SCHEDULE_POLICY_ARN"
        ]
        pipeline_resources_builder_function_name = os.environ[
            "PIPELINE_RESOURCES_BUILDER_FUNCTION_NAME"
        ]

        dynamodb = boto3.resource("dynamodb", region_name=aws_region)

        etl_log_table = dynamodb.create_table(  # type: ignore
            TableName=etl_log_table_name,
            KeySchema=[
                {"AttributeName": "executionName", "KeyType": "HASH"},
                {"AttributeName": "taskId", "KeyType": "RANGE"},
            ],
            AttributeDefinitions=[
                {"AttributeName": "executionName", "AttributeType": "S"},
                {"AttributeName": "taskId", "AttributeType": "S"},
            ],
            BillingMode="PAY_PER_REQUEST",
        )
        etl_log_step_function = {
            "executionName": "1ebf165b-f846-4813-8cab-305be5c8ca7e",
            "taskId": "00000000-0000-0000-0000-000000000000",
            "API": "Step Functions: StartExecution",
            "parentTaskId": "",
            "pipelineId": "189f73eb-1808-47e4-a9db-ee9c35100abe",
            "startTime": datetime.datetime.now(datetime.UTC).isoformat(),
            "endTime": "",
            "stateMachineName": "LogProcessor-HBTz7GoOjZoz",
            "stateName": "Put task info of Step Function to DynamoDB",
            "status": "Running",
        }
        etl_log_s3_object_scanning = {
            "executionName": "1ebf165b-f846-4813-8cab-305be5c8ca7e",
            "taskId": "6b10286b-c4b3-44ed-b4e8-c251a04b6a59",
            "API": "Lambda: Invoke",
            "data": '{"totalSubTask": 2}',
            "functionName": os.environ["S3_OBJECTS_SCANNING_FUNCTION_NAME"],
            "parentTaskId": "00000000-0000-0000-0000-000000000000",
            "pipelineId": "189f73eb-1808-47e4-a9db-ee9c35100abe",
            "startTime": datetime.datetime.now(datetime.UTC).isoformat(),
            "endTime": "",
            "stateMachineName": "LogProcessor-HBTz7GoOjZoz",
            "stateName": "Step 1: S3 Migration Task from Staging to Archive",
            "status": "Running",
        }
        etl_log_s3_object_migration_task1 = {
            "executionName": "1ebf165b-f846-4813-8cab-305be5c8ca7e",
            "taskId": "9d512f44-7626-49e2-a465-f450e93f6388",
            "API": "Lambda: Invoke",
            "data": "",
            "functionName": os.environ["S3_OBJECTS_SCANNING_FUNCTION_NAME"],
            "parentTaskId": "6b10286b-c4b3-44ed-b4e8-c251a04b6a59",
            "pipelineId": "189f73eb-1808-47e4-a9db-ee9c35100abe",
            "startTime": datetime.datetime.now(datetime.UTC).isoformat(),
            "endTime": "",
            "stateMachineName": "LogProcessor-HBTz7GoOjZoz",
            "stateName": "Step 1: S3 Migration Task from Staging to Archive",
            "status": "Running",
        }
        etl_log_s3_object_migration_task2 = {
            "executionName": "1ebf165b-f846-4813-8cab-305be5c8ca7e",
            "taskId": "bc73c25b-49c1-4d9f-a005-d0853809260d",
            "API": "Lambda: Invoke",
            "data": "",
            "functionName": os.environ["S3_OBJECTS_SCANNING_FUNCTION_NAME"],
            "parentTaskId": "6b10286b-c4b3-44ed-b4e8-c251a04b6a59",
            "pipelineId": "189f73eb-1808-47e4-a9db-ee9c35100abe",
            "startTime": datetime.datetime.now(datetime.UTC).isoformat(),
            "endTime": "",
            "stateMachineName": "LogProcessor-HBTz7GoOjZoz",
            "stateName": "Step 1: S3 Migration Task from Staging to Archive",
            "status": "Running",
        }
        etl_log_table.put_item(Item=etl_log_step_function)
        etl_log_table.put_item(Item=etl_log_s3_object_scanning)
        etl_log_table.put_item(Item=etl_log_s3_object_migration_task1)
        etl_log_table.put_item(Item=etl_log_s3_object_migration_task2)

        meta_table = dynamodb.create_table(  # type: ignore
            TableName=meta_table_name,
            KeySchema=[{"AttributeName": "metaName", "KeyType": "HASH"}],
            AttributeDefinitions=[{"AttributeName": "metaName", "AttributeType": "S"}],
            BillingMode="PAY_PER_REQUEST",
        )
        email_address = {
            "metaName": "EmailAddress",
            "service": "CloudFormation",
            "type": "Parameter",
            "arn": "",
            "name": "EmailAddress",
            "value": "alejandro_rosalez@example.com",
        }
        meta_available_services = {
            "metaName": "AvailableServices",
            "service": "AWS",
            "type": "AvailableServices",
            "value": ["scheduler", "events"],
        }
        meta_account_id = {
            "metaName": "AccountId",
            "service": "AWS",
            "type": "Account",
            "arn": "",
            "name": "Account",
            "value": account_id,
        }
        meta_region = {
            "metaName": "Region",
            "service": "AWS",
            "type": "Region",
            "arn": "",
            "name": "Region",
            "value": aws_region,
        }
        meta_partition = {
            "metaName": "Partition",
            "service": "AWS",
            "type": "Partition",
            "arn": "",
            "name": "Partition",
            "value": "aws",
        }
        meta_aws_console_url = {
            "metaName": "AwsConsoleUrl",
            "service": "AWS",
            "type": "Url",
            "arn": "",
            "name": "AwsConsoleUrl",
            "value": f"https://{aws_region}.console.com",
        }
        meta_etl_log_ttl_secs = {
            "metaName": "ETLLogTimeToLiveSecs",
            "service": "Solution",
            "type": "Parameter",
            "arn": "",
            "name": "ETLLogTimeToLiveSecs",
            "value": "2592000",
        }
        meta_catalog = {
            "metaName": "CentralizedCatalog",
            "arn": "",
            "name": centralized_catalog,
            "service": "GLUE",
        }
        meta_centralized_database = {
            "metaName": "CentralizedDatabase",
            "arn": f"arn:aws:glue:{aws_region}:{account_id}:database/{centralized_database}",
            "name": centralized_database,
            "service": "GLUE",
        }
        meta_work_group = {
            "metaName": "AthenaWorkGroup",
            "arn": "",
            "name": athena_work_group,
            "service": "Athena",
        }
        meta_output_location = {
            "metaName": "AthenaOutputLocation",
            "arn": "",
            "name": athena_output_location,
            "service": "Athena",
        }
        meta_assume_role_arn = {
            "metaName": "AthenaPublicAccessRole",
            "arn": athena_public_access_role,
            "name": "AthenaPublicAccessRole",
            "service": "Athena",
        }
        tmp_database = {
            "metaName": "TmpDatabase",
            "arn": f"arn:aws:glue:{aws_region}:{account_id}:database/{tmp_database_name}",
            "name": tmp_database_name,
            "service": "GLUE",
        }
        log_processor = {
            "metaName": "LogProcessor",
            "arn": f"arn:aws:states:{aws_region}:{account_id}:stateMachine:{log_processor_name}",
            "name": log_processor_name,
            "service": "StepFunction",
            "url": f"https://{aws_region}.console.aws.amazon.com/states/home?region={aws_region}#/statemachines/view/arn:aws:states:{aws_region}:{account_id}:stateMachine:{log_processor_name}",
        }
        log_merger = {
            "metaName": "LogMerger",
            "arn": f"arn:aws:states:{aws_region}:{account_id}:stateMachine:{log_merger_name}",
            "name": log_merger_name,
            "service": "StepFunction",
            "url": f"https://{aws_region}.console.aws.amazon.com/states/home?region={aws_region}#/statemachines/view/arn:aws:states:{aws_region}:{account_id}:stateMachine:{log_merger_name}",
        }
        log_archive = {
            "metaName": "LogArchive",
            "arn": f"arn:aws:states:{aws_region}:{account_id}:stateMachine:{log_archive_name}",
            "name": log_archive_name,
            "service": "StepFunction",
            "url": f"https://{aws_region}.console.aws.amazon.com/states/home?region={aws_region}#/statemachines/view/arn:aws:states:{aws_region}:{account_id}:stateMachine:{log_archive_name}",
        }
        log_processor_start_execution_role = {
            "metaName": "LogProcessorStartExecutionRole",
            "arn": log_processor_start_execution_role_arn,
            "name": log_processor_name,
            "service": "StepFunction",
            "url": f"https://{aws_region}.console.aws.amazon.com/iamv2/home?region={aws_region}#/roles/details/{log_processor_name}",
        }
        log_merger_start_execution_role = {
            "metaName": "LogMergerStartExecutionRole",
            "arn": log_merger_start_execution_role_arn,
            "name": log_merger_name,
            "service": "IAM",
            "url": f"https://{aws_region}.console.aws.amazon.com/iamv2/home?region={aws_region}#/roles/details/{log_merger_name}",
        }
        log_archive_start_execution_role = {
            "metaName": "LogArchiveStartExecutionRole",
            "arn": log_archive_start_execution_role_arn,
            "name": log_archive_name,
            "service": "IAM",
            "url": f"https://{aws_region}.console.aws.amazon.com/iamv2/home?region={aws_region}#/roles/details/{log_archive_name}",
        }
        s3_public_access_policy_item = {
            "metaName": "S3PublicAccessPolicy",
            "arn": f"arn:aws:iam::{account_id}:policy/{s3_public_access_policy}",
            "name": s3_public_access_policy,
            "service": "IAM",
            "url": "",
        }
        send_template_email_sns_public_policy_item = {
            "metaName": "SendTemplateEmailSNSPublicPolicy",
            "arn": f"arn:aws:iam::{account_id}:policy/{send_template_email_sns_public_policy}",
            "name": send_template_email_sns_public_policy,
            "service": "IAM",
            "url": "",
        }
        simple_email_service_state = {
            "metaName": "SimpleEmailServiceState",
            "arn": "",
            "name": "SimpleEmailServiceState",
            "service": "CloudFormation",
            "type": "Parameter",
            "url": "",
            "value": "ENABLED",
        }
        send_email_template_name = {
            "metaName": "SimpleEmailServiceTemplate",
            "arn": "",
            "name": "SimpleEmailServiceTemplate",
            "service": "SES",
            "url": "",
            "value": os.environ["SES_EMAIL_TEMPLATE"],
        }
        staging_bucket = {
            "metaName": "StagingBucket",
            "arn": f"arn:aws:s3:::{staging_bucket_name}",
            "name": staging_bucket_name,
            "service": "S3",
            "url": "",
        }
        meta_pipeline_resources_builder = {
            "metaName": "PipelineResourcesBuilder",
            "arn": f"arn:aws:lambda::{account_id}:function/{pipeline_resources_builder_function_name}",
            "name": pipeline_resources_builder_function_name,
            "service": "Lambda",
            "url": "",
        }
        meta_pipeline_resources_builder_role = {
            "metaName": "PipelineResourcesBuilderRole",
            "arn": pipeline_resources_builder_role_arn,
            "name": pipeline_resources_builder_role_arn.split("/")[-1],
            "service": "IAM",
            "url": "",
        }
        meta_pipeline_resources_builder_schedule_policy = {
            "metaName": "PipelineResourcesBuilderSchedulePolicy",
            "arn": pipeline_resources_builder_schedule_policy_arn,
            "name": pipeline_resources_builder_schedule_policy_arn.split("/")[-1],
            "service": "IAM",
            "url": "",
        }

        waf_pipeline_info = {
            "metaName": waf_pipeline_id,
            "data": {
                "source": {
                    "type": "WAF",
                    "table": {
                        "schema": "{}",
                        "dataFormat": "",
                        "tableProperties": "{}",
                        "serializationProperties": "{}",
                    },
                },
                "destination": {
                    "location": {
                        "bucket": centralized_bucket_name,
                        "prefix": centralized_bucket_prefix,
                    },
                    "database": {
                        "name": centralized_database,
                    },
                    "table": {
                        "name": "waf",
                        "schema": "{}",
                    },
                    "metrics": {
                        "name": "",
                        "schema": "{}",
                    },
                },
                "notification": {
                    "service": "SES",
                    "recipients": "alejandro_rosalez@example.com,alejandro_rosalez@example.org",
                },
                "grafana": {
                    "importDashboards": "false",
                    "url": "",
                    "token": "",
                },
                "scheduler": {
                    "service": "scheduler",
                    "LogProcessor": {
                        "schedule": "rate(5 minutes)",
                    },
                    "LogMerger": {
                        "schedule": "cron(0 1 * * ? *)",
                        "age": 3,
                    },
                    "LogArchive": {
                        "schedule": "cron(0 2 * * ? *)",
                        "age": 7,
                    },
                },
                "staging": {"prefix": "AWSLogs/WAFLogs"},
            },
            "type": "Pipeline",
            "stack": {
                "lambda": {"replicate": replication_function_arn},
                "queue": {
                    "logEventQueue": replication_sqs_arn,
                    "logEventDLQ": replication_dlq_arn,
                },
                "role": {"replicate": replication_role_arn},
            },
        }

        waf_ingestion_info = {
            "metaName": waf_ingestion_id,
            "data": {
                "role": {
                    "sts": "",
                },
                "source": {
                    "bucket": logging_bucket_name,
                    "prefix": logging_bucket_prefix,
                },
                "services": {
                    "s3EventDriver": "SQS",
                },
            },
            "pipelineId": waf_pipeline_id,
            "type": "Ingestion",
        }

        application_pipeline_info = {
            "metaName": application_pipeline_id,
            "data": {
                "source": {
                    "type": "fluent-bit",
                    "table": {
                        "schema": '{"type":"object","properties":{"timestamp":{"type":"string","timeKey":true,"format":"YYYY-MM-dd\'\'T\'\'HH:mm:ss.SSSSSSSSSZ"},"correlationId":{"type":"string"},"processInfo":{"type":"object","properties":{"hostname":{"type":"string"},"domainId":{"type":"string"},"groupId":{"type":"string"},"groupName":{"type":"string"},"serviceId":{"type":"string","partition":true},"serviceName":{"type":"string"},"version":{"type":"string"}}},"transactionSummary":{"type":"object","properties":{"path":{"type":"string"},"protocol":{"type":"string"},"protocolSrc":{"type":"string"},"status":{"type":"string"},"serviceContexts":{"type":"array","items":{"type":"object","properties":{"service":{"type":"string"},"monitor":{"type":"boolean"},"client":{"type":"string"},"org":{},"app":{},"method":{"type":"string"},"status":{"type":"string"},"duration":{"type":"number"}}}}}}}}',
                        "dataFormat": "json",
                        "tableProperties": "{}",
                        "serializationProperties": "{}",
                    },
                },
                "destination": {
                    "location": {
                        "bucket": centralized_bucket_name,
                        "prefix": centralized_bucket_prefix,
                    },
                    "database": {
                        "name": centralized_database,
                    },
                    "table": {
                        "name": "application",
                        "schema": "{}",
                    },
                    "metrics": {
                        "name": "",
                        "schema": "{}",
                    },
                },
                "notification": {
                    "service": "SES",
                    "recipients": "alejandro_rosalez@example.com,alejandro_rosalez@example.org",
                },
                "grafana": {
                    "importDashboards": "false",
                    "url": "",
                    "token": "",
                },
                "scheduler": {
                    "service": "scheduler",
                    "LogProcessor": {
                        "schedule": "rate(5 minutes)",
                    },
                    "LogMerger": {
                        "schedule": "cron(0 1 * * ? *)",
                        "age": 3,
                    },
                    "LogArchive": {
                        "schedule": "cron(0 2 * * ? *)",
                        "age": 7,
                    },
                },
                "staging": {"prefix": "APPLogs/ServicesLogs"},
            },
            "type": "Pipeline",
            "stack": {
                "lambda": {"replicate": replication_function_arn},
                "queue": {
                    "logEventQueue": replication_sqs_arn,
                    "logEventDLQ": replication_dlq_arn,
                },
                "role": {"replicate": replication_role_arn},
            },
        }

        application_ingestion_info = {
            "metaName": application_ingestion_id,
            "data": {
                "role": {
                    "sts": "",
                },
                "source": {
                    "bucket": logging_bucket_name,
                    "prefix": logging_bucket_prefix,
                },
                "services": {
                    "s3EventDriver": "SQS",
                },
            },
            "pipelineId": application_pipeline_id,
            "type": "Ingestion",
        }
        meta_table.put_item(Item=meta_available_services)
        meta_table.put_item(Item=meta_account_id)
        meta_table.put_item(Item=meta_region)
        meta_table.put_item(Item=meta_partition)
        meta_table.put_item(Item=meta_aws_console_url)
        meta_table.put_item(Item=meta_etl_log_ttl_secs)
        meta_table.put_item(Item=meta_catalog)
        meta_table.put_item(Item=meta_centralized_database)
        meta_table.put_item(Item=meta_work_group)
        meta_table.put_item(Item=meta_output_location)
        meta_table.put_item(Item=meta_assume_role_arn)
        meta_table.put_item(Item=tmp_database)
        meta_table.put_item(Item=log_processor)
        meta_table.put_item(Item=log_merger)
        meta_table.put_item(Item=log_archive)
        meta_table.put_item(Item=log_processor_start_execution_role)
        meta_table.put_item(Item=log_merger_start_execution_role)
        meta_table.put_item(Item=log_archive_start_execution_role)
        meta_table.put_item(Item=s3_public_access_policy_item)
        meta_table.put_item(Item=send_template_email_sns_public_policy_item)
        meta_table.put_item(Item=email_address)
        meta_table.put_item(Item=staging_bucket)
        meta_table.put_item(Item=waf_pipeline_info)
        meta_table.put_item(Item=waf_ingestion_info)
        meta_table.put_item(Item=application_pipeline_info)
        meta_table.put_item(Item=application_ingestion_info)
        meta_table.put_item(Item=meta_pipeline_resources_builder)
        meta_table.put_item(Item=meta_pipeline_resources_builder_role)
        meta_table.put_item(Item=meta_pipeline_resources_builder_schedule_policy)
        meta_table.put_item(Item=send_email_template_name)
        meta_table.put_item(Item=simple_email_service_state)
        yield


@pytest.fixture
def mock_ses_context():
    with mock_ses():
        aws_region = os.environ.get("AWS_REGION")
        source = os.environ["SOURCE"]
        ses_email_template_content = json.loads(
            os.environ["SES_EMAIL_TEMPLATE_CONTENT"]
        )
        ses_client = boto3.client("ses", region_name=aws_region)
        ses_client.create_template(Template=ses_email_template_content)
        ses_client.verify_email_address(EmailAddress=source)
        yield


@pytest.fixture
def mock_lambda_context():
    with mock_lambda():
        aws_region = os.environ.get("AWS_REGION")
        pipeline_resources_builder = os.environ[
            "PIPELINE_RESOURCES_BUILDER_FUNCTION_NAME"
        ]
        pipeline_resources_builder_role_arn = os.environ[
            "PIPELINE_RESOURCES_BUILDER_ROLE_ARN"
        ]

        lambda_client = boto3.client("lambda", region_name=aws_region)
        code = (
            "def lambda_handler(event, _):\n"
            "    return {'statusCode': 200, 'body': 'Success'}"
        )
        zip_buffer = io.BytesIO()

        with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zip_file:
            zip_file.writestr("lambda_function.py", code)

        lambda_client.create_function(
            FunctionName=pipeline_resources_builder,
            Runtime="python3.12",
            Role=pipeline_resources_builder_role_arn,
            Code={"ZipFile": zip_buffer.getvalue()},
        )
        yield


@pytest.fixture
def mock_athena_context():
    with mock_athena():
        aws_region = os.environ.get("AWS_REGION")
        account_id = os.environ["ACCOUNT_ID"]
        athena_database = os.environ["CENTRALIZED_DATABASE"]
        athena_table_name = os.environ["ATHENA_TABLE_NAME"]
        work_group = os.environ["ATHENA_WORK_GROUP"]
        staging_bucket = os.environ["STAGING_BUCKET_NAME"]
        result_configuration = {
            "OutputLocation": f"s3://{staging_bucket}/athena-results/"
        }
        athena_client = boto3.client("athena", region_name=aws_region)

        DDL_CREATE_DATABASE = f"CREATE DATABASE IF NOT EXISTS {athena_database};"
        DDL_CREATE_TABLE = f"""CREATE TABLE IF NOT EXISTS {athena_database}.{athena_table_name}(time timestamp, method string, bytes int) STORED AS PARQUET
                                PARTITION BY (`__ds__` string, `region` string, `__execution_name__` string)
                               LOCATION 's3://{staging_bucket}/AWSLogs/{account_id}/centralized/aws_apigateway_logs_parquet/';"""
        DML_SELECT = f"SELECT * FROM {athena_database}.{athena_table_name} limit 10;"

        athena_client.create_work_group(Name=work_group)
        response = athena_client.start_query_execution(
            QueryString=DDL_CREATE_DATABASE,
            WorkGroup=work_group,
            ResultConfiguration=result_configuration,
        )
        os.environ["DDL_CREATE_DATABASE_EXECUTION_ID"] = response["QueryExecutionId"]
        response = athena_client.start_query_execution(
            QueryString=DDL_CREATE_TABLE,
            WorkGroup=work_group,
            ResultConfiguration=result_configuration,
        )
        os.environ["DDL_CREATE_TABLE_EXECUTION_ID"] = response["QueryExecutionId"]
        response = athena_client.start_query_execution(
            QueryString=DML_SELECT,
            WorkGroup=work_group,
            ResultConfiguration=result_configuration,
        )
        os.environ["DML_SELECT_EXECUTION_ID"] = response["QueryExecutionId"]

        os.environ["ETL_LOG_WRITER_EVENT"] = json.dumps(
            {
                "CreateTmpTable": {
                    "API": "Athena: StartQueryExecution",
                    "executionName": "848be54a-ae2c-414c-9ae3-f0b3d11089ab",
                    "taskId": os.environ["DDL_CREATE_DATABASE_EXECUTION_ID"],
                    "parameters": {
                        "queryString": DDL_CREATE_DATABASE,
                        "workGroup": work_group,
                        "outputLocation": f"s3://{staging_bucket}/athena-results/",
                    },
                    "extra": {
                        "parentTaskId": "00000000-0000-0000-0000-000000000000",
                        "stateName": "Step 2.1: Create tmp table in Athena",
                        "stateMachineName": "LogProcessor-HBTz7GoOjZoz",
                        "pipelineId": "189f73eb-1808-47e4-a9db-ee9c35100abe",
                    },
                    "taskToken": "",
                },
                "aggregateMeasures": [
                    {
                        "API": "Athena: StartQueryExecution",
                        "executionName": "848be54a-ae2c-414c-9ae3-f0b3d11089ab",
                        "taskId": os.environ["DDL_CREATE_TABLE_EXECUTION_ID"],
                        "extra": {
                            "parentTaskId": "00000000-0000-0000-0000-000000000000",
                            "executionName": "848be54a-ae2c-414c-9ae3-f0b3d11089ab",
                            "stateName": "Step 2.4: Measuring KPIs in Athena - Optional",
                            "stateMachineName": "LogProcessor-HBTz7GoOjZoz",
                            "pipelineId": "189f73eb-1808-47e4-a9db-ee9c35100abe",
                        },
                        "taskToken": "AQCEAAAAKgAAAAMAAAAA",
                    },
                    {
                        "API": "Athena: StartQueryExecution",
                        "executionName": "848be54a-ae2c-414c-9ae3-f0b3d11089ab",
                        "taskId": os.environ["DML_SELECT_EXECUTION_ID"],
                        "extra": {
                            "parentTaskId": "00000000-0000-0000-0000-000000000000",
                            "stateName": "Step 2.4: Measuring KPIs in Athena - Optional",
                            "stateMachineName": "LogProcessor-HBTz7GoOjZoz",
                            "pipelineId": "189f73eb-1808-47e4-a9db-ee9c35100abe",
                        },
                    },
                ],
            }
        )
        yield


@pytest.fixture
def mock_glue_context():
    with mock_glue():
        aws_region = os.environ.get("AWS_REGION")
        account_id = os.environ["ACCOUNT_ID"]
        centralized_database = os.environ["CENTRALIZED_DATABASE"]
        unique_database = os.environ["UNIQUE_DATABASE"]
        tmp_database = os.environ["TMP_DATABASE"]

        glue_client = boto3.client("glue", region_name=aws_region)

        glue_client.create_database(DatabaseInput={"Name": centralized_database})
        glue_client.create_database(DatabaseInput={"Name": unique_database})
        glue_client.create_database(DatabaseInput={"Name": tmp_database})

        yield


@pytest.fixture
def mock_sfn_context():
    with mock_stepfunctions():
        yield


@pytest.fixture
def mock_scheduler_context():
    with mock_scheduler():
        aws_region = os.environ["AWS_REGION"]
        account_id = os.environ["ACCOUNT_ID"]
        log_processor_name = os.environ["LOG_PROCESSOR_NAME"]
        application_pipeline_id = os.environ["APPLICATION_PIPELINE_ID"]

        scheduler_client = boto3.client("scheduler")

        scheduler_client.create_schedule_group(
            Name=application_pipeline_id, Tags=[{"Key": "Application", "Value": "clo"}]
        )

        response = scheduler_client.create_schedule(
            FlexibleTimeWindow={"Mode": "OFF"},
            GroupName=application_pipeline_id,
            Name="LogProcessor",
            ScheduleExpression="rate(5 minutes)",
            State="ENABLED",
            Target={
                "Arn": f"arn:aws:states:{aws_region}:{account_id}:stateMachine:{log_processor_name}",
                "Input": json.dumps({}, indent=4),
                "RoleArn": f"arn:aws:iam::{account_id}:role/{log_processor_name}",
            },
        )
        yield


@pytest.fixture
def mock_sns_context():
    with mock_sns():
        sns_client = boto3.client("sns")

        receive_failed_topic = sns_client.create_topic(Name="ReceiveStatesFailedTopic")

        os.environ["RECEIVE_STATES_FAILED_TOPIC_ARN"] = receive_failed_topic["TopicArn"]
        yield


@pytest.fixture
def mock_events_context():
    with mock_events():
        aws_region = os.environ["AWS_REGION"]
        account_id = os.environ["ACCOUNT_ID"]
        log_processor_name = os.environ["LOG_PROCESSOR_NAME"]

        events_client = boto3.client("events")

        response = events_client.put_rule(
            Name="LogProcessor",
            ScheduleExpression="rate(5 minutes)",
            State="ENABLED",
            EventBusName="default",
        )
        events_client.put_targets(
            Rule="LogProcessor",
            EventBusName="default",
            Targets=[
                {
                    "Id": "1234567890",
                    "Arn": f"arn:aws:states:{aws_region}:{account_id}:stateMachine:{log_processor_name}",
                    "Input": json.dumps({"metadata": {}}, indent=4),
                    "RoleArn": f"arn:aws:iam::{account_id}:role/{log_processor_name}",
                }
            ],
        )
        os.environ["LOGPROCESSOR_RULE_ARN"] = response["RuleArn"]
        yield


@pytest.fixture
def mock_sts_context():
    with mock_sts():
        yield


@pytest.fixture
def mock_rds_context():
    with mock_rds():
        aurora_mysql_cluster_5 = os.environ["AURORA_MYSQL5_CLUSTER_IDENTIFIER"]
        aurora_mysql_cluster_8 = os.environ["AURORA_MYSQL8_CLUSTER_IDENTIFIER"]
        aurora_postgresql_cluster = os.environ["AURORA_POSTGRESQL_CLUSTER_IDENTIFIER"]
        mysql_instance_5 = os.environ["MYSQL5_INSTANCE_IDENTIFIER"]
        mysql_instance_8 = os.environ["MYSQL8_INSTANCE_IDENTIFIER"]
        postgresql_instance = os.environ["POSTGRESQL_INSTANCE_IDENTIFIER"]

        rds_client = boto3.client("rds")

        rds_client.create_db_cluster(
            DBClusterIdentifier=aurora_mysql_cluster_5,
            Engine="aurora-mysql",
            EngineVersion="5.7.mysql_aurora.2.12.2",
            MasterUsername="admin",
            MasterUserPassword="123456789012",
        )
        rds_client.create_db_cluster(
            DBClusterIdentifier=aurora_mysql_cluster_8,
            Engine="aurora-mysql",
            EngineVersion="8.0.mysql_aurora.3.06.0",
            MasterUsername="admin",
            MasterUserPassword="123456789012",
        )
        rds_client.create_db_cluster(
            DBClusterIdentifier=aurora_postgresql_cluster,
            Engine="aurora-postgresql",
            EngineVersion="12.12",
            MasterUsername="admin",
            MasterUserPassword="123456789012",
        )
        rds_client.create_db_instance(
            DBInstanceIdentifier=mysql_instance_5,
            DBInstanceClass="db.m5.large",
            Engine="mysql",
            EngineVersion="5.7.44",
        )
        rds_client.create_db_instance(
            DBInstanceIdentifier=mysql_instance_8,
            DBInstanceClass="db.m5.large",
            Engine="mysql",
            EngineVersion="8.0.36",
        )
        rds_client.create_db_instance(
            DBInstanceIdentifier=postgresql_instance,
            DBInstanceClass="db.m5.large",
            Engine="postgres",
            EngineVersion="12.12",
        )

        os.environ[
            "AURORA_MYSQL_AUDIT_LOGS"
        ] = """1703817810074458,aurora-mysql-instance-1,rdsadmin,localhost,223153,20070830,QUERY,,'SELECT @@aurora_version',0
1703817810075253,aurora-mysql-instance-1,rdsadmin,localhost,217705,20070831,QUERY,mysql,'select @@session.transaction_read_only',0
1703817810076091,aurora-mysql-instance-1,rdsadmin,localhost,223170,0,CONNECT,,,0
1703817810076149,aurora-mysql-instance-1,rdsadmin,localhost,217705,20070832,QUERY,mysql,'COMMIT',0
1703817810076500,aurora-mysql-instance-1,rdsadmin,localhost,217705,20070833,QUERY,,'SET @@sql_log_bin=on',0
1703817810076799,aurora-mysql-instance-1,rdsadmin,localhost,223170,20070834,QUERY,,'SET SESSION wait_timeout=28800,SESSION time_zone=\'+00:00\',SESSION sql_mode=0,SESSION autocommit=1',0
1703817810077132,aurora-mysql-instance-1,rdsadmin,localhost,223170,20070835,QUERY,,'/* mysql-connector-java-5.1.48 ( Revision: 29734982609c32d3ab7e5cac2e6acee69ff6b4aa ) */SELECT  @@session.auto_increment_increment AS auto_increment_increment, @@character_set_client AS character_set_client, @@character_set_connection AS character_set_connection, @@character_set_results AS character_set_results, @@character_set_server AS character_set_server, @@collation_server AS collation_server, @@collation_connection AS collation_connection, @@init_connect AS init_connect, @@interactive_timeout AS interactive_timeout, @@license AS license, @@lower_case_table_names AS lower_case_table_names, @@max_allowed_packet AS max_allowed_packet, @@net_buffer_length AS net_buffer_length, @@net_write_timeout AS net_write_timeout, @@performance_schema AS performance_schema, @@sql_mode AS sql_mode, @@system_time_zone AS system_time_zone, @@time_zone AS time_zone, @@transaction_isolation AS transaction_isolation, @@wait_timeout AS wait_timeout',0
1703817812006334,aurora-mysql-instance-1,rdsadmin,localhost,217704,20070843,QUERY,,'set local oscar_local_only_replica_host_status=1',0
1703817812018585,aurora-mysql-instance-1,rdsadmin,localhost,217704,20070847,QUERY,,'SELECT durable_lsn, current_read_point, server_id, last_update_timestamp FROM information_schema.replica_host_status',0
1703817812025947,aurora-mysql-instance-1,rdsadmin,localhost,217705,20070852,QUERY,mysql,'select @@session.transaction_read_only',0
1703817812026505,aurora-mysql-instance-1,rdsadmin,localhost,217705,20070854,QUERY,,'SET @@sql_log_bin=on',0"""
        os.environ[
            "MYSQL_AUDIT_LOGS"
        ] = """20240323 13:36:07,ip-172-17-4-137,rdsadmin,localhost,4,149867,QUERY,,'SELECT @@session.transaction_read_only',0,,
20240323 13:36:08,ip-172-17-4-137,rdsadmin,localhost,4,149868,QUERY,,'INSERT INTO mysql.rds_heartbeat2(id, value) values (1,1711200968676) ON DUPLICATE KEY UPDATE value = 1711200968676',0,,
20240323 13:36:09,ip-172-17-4-137,rdsadmin,localhost,4,149869,QUERY,,'SELECT 1',0,,
20240323 13:36:10,ip-172-17-4-137,rdsadmin,localhost,4,149870,QUERY,,'SELECT @@session.transaction_read_only',0,,
20240323 13:36:11,ip-172-17-4-137,rdsadmin,localhost,4,149871,QUERY,,'COMMIT',0,,
20240323 13:36:12,ip-172-17-4-137,rdsadmin,localhost,4,149872,QUERY,,'SELECT 1',0,,
20240323 13:36:13,ip-172-17-4-137,rdsadmin,localhost,4,149873,QUERY,,'SELECT @@GLOBAL.read_only',0,,"""
        os.environ[
            "MYSQL_SLOW_QUERY_LOGS"
        ] = """/rdsdbbin/oscar/bin/mysqld, Version: 8.0.28 (Source distribution). started with:
Tcp port: 3306  Unix socket: /tmp/mysql.sock
Time                 Id Command    Argument
# Time: 2023-11-30T07:22:10.190471Z
# User@Host: admin[admin] @  [127.0.0.1]  Id:  7432
# Query_time: 2.000192  Lock_time: 0.000000 Rows_sent: 1  Rows_examined: 1
use audit;
SET timestamp=1701328928;
select sleep(2);
/rdsdbbin/oscar/bin/mysqld, Version: 8.0.28 (Source distribution). started with:
Tcp port: 3306  Unix socket: /tmp/mysql.sock
Time                 Id Command    Argument
/rdsdbbin/oscar/bin/mysqld, Version: 8.0.28 (Source distribution). started with:
Tcp port: 3306  Unix socket: /tmp/mysql.sock
Time                 Id Command    Argument
/rdsdbbin/oscar/bin/mysqld, Version: 8.0.28 (Source distribution). started with:
Tcp port: 3306  Unix socket: /tmp/mysql.sock
Time                 Id Command    Argument
/rdsdbbin/oscar/bin/mysqld, Version: 8.0.28 (Source distribution). started with:
Tcp port: 3306 Unix socket: /tmp/mysql.sock
Time Id Command Argument
/rdsdbbin/oscar/bin/mysqld, Version: 8.0.28 (Source distribution). started with:
Tcp port: 3306 Unix socket: /tmp/mysql.sock
Time Id Command Argument
# Time: 2024-01-03T01:35:35.952622Z
# User@Host: admin[admin] @ [127.0.0.1] Id: 260259
# Query_time: 2.000294 Lock_time: 0.000000 Rows_sent: 1 Rows_examined: 1
SET timestamp=1704245733;
select
sleep(2);
/rdsdbbin/oscar/bin/mysqld, Version: 8.0.28 (Source distribution). started with:
Tcp port: 3306 Unix socket: /tmp/mysql.sock
Time Id Command Argument
# Time: 2024-01-03T07:15:38.660108Z
# User@Host: admin[admin] @ [127.0.0.2] Id: 262030
# Query_time: 2.000231 Lock_time: 0.000000 Rows_sent: 1 Rows_examined: 1
use audit;
SET timestamp=1704266136;
select sleep(2);
# Time: 2024-01-03T07:15:42.875605Z
# User@Host: admin[admin] @ [127.0.0.1] Id: 262030
# Query_time: 2.000255 Lock_time: 0.000000 Rows_sent: 1 Rows_examined: 1
SET timestamp=1704266140;
select sleep(2);
# Time: 2024-01-03T07:17:20.525029Z
# User@Host: admin[admin] @ [127.0.0.1] Id: 262030
# Query_time: 2.002099 Lock_time: 0.000000 Rows_sent: 1 Rows_examined: 2
SET timestamp=1704266238;
with dataset as (
select sleep(2) as t)
select *
from dataset;
# Time: 2024-01-03T07:20:25.435204Z
# User@Host: admin[admin] @ [127.0.0.1] Id: 262030
# Query_time: 2.000233 Lock_time: 0.000000 Rows_sent: 1 Rows_examined: 1
SET timestamp=1704266423;
select sleep(2);"""
        os.environ[
            "MYSQL8_ERROR_LOGS"
        ] = """2023-11-28T09:13:22.104678Z 0 [System] [MY-010116] [Server] /rdsdbbin/oscar/bin/mysqld (mysqld 8.0.28) starting as process 259 (mysqld.cc:5965)
2023-11-28T09:13:22.112841Z 0 [Note] [MY-010747] [Server] Plugin 'FEDERATED' is disabled. (sql_plugin.cc:3604)
231128  9:13:22 server_audit: Audit STARTED.
Found DAS config file, trying to load DAS switcher from DAS config file.
2023-11-28 09:13:22 22566174378368:[DAS][INFO]: Calculated persistence threads 4
aurora_enable_das:0
231128  9:13:22 server_audit: server_audit_incl_users set to ''.
231128  9:13:22 server_audit: server_audit_excl_users set to ''.
2023-11-28T09:13:22.114869Z 1 [System] [MY-013576] [InnoDB] InnoDB initialization has started. (ha_innodb.cc:13611)
2023-11-28T09:13:34.131165Z 5 [Note] [MY-013386] [Server] Running queries to upgrade MySQL server. (server.cc:758)
# Existing AMS 5.7 external services integration privilege columns is converted to role grants for the user
INSERT INTO mysql.role_edges (from_host, from_user, to_host, to_user) select '%', 'AWS_LOAD_S3_ACCESS', host, user from mysql.user where load_from_s3_priv = 'Y';
. Ignored error No: 1054, Ignored error: Unknown column 'load_from_s3_priv' in 'where clause'(server.cc:629)
2023-11-28T09:13:38.582491Z 5 [Note] [MY-013387] [Server] Upgrading system table data. (server.cc:784)
2023-11-28T09:13:39.861463Z 5 [Note] [MY-013385] [Server] Upgrading the sys schema. (server.cc:720)"""
        os.environ[
            "MYSQL5_ERROR_LOGS"
        ] = """2024-03-27T04:38:18.925623Z 0 [Note] #
2024-03-27T04:38:19.085914Z 0 [Warning] The syntax '--secure-auth' is deprecated and will be removed in a future release
2024-03-27T04:38:19.086121Z 0 [Warning] 'NO_AUTO_CREATE_USER' sql mode was not set.
2024-03-27T04:38:19.087012Z 0 [Note] /rdsdbbin/oscar/bin/mysqld (mysqld 5.7.12-log) starting as process 256 ...
2024-03-27T04:38:19.094698Z 0 [Warning] You need to use --log-bin to make --log-slave-updates work.
2024-03-27T04:38:19.096007Z 0 [Warning] InnoDB: Setting innodb_checksums to OFF is DEPRECATED. This option may be removed in future releases. You should set innodb_checksum_algorithm=NONE instead.
2024-03-27T04:38:19.096085Z 0 [Note] InnoDB: PUNCH HOLE support available"""
        os.environ[
            "MYSQL_GENERAL_LOGS"
        ] = """/rdsdbbin/oscar/bin/mysqld, Version: 8.0.28 (Source distribution). started with:
Tcp port: 3306  Unix socket: /tmp/mysql.sock
Time                 Id Command    Argument
2024-01-03T08:00:01.341151Z	217720 Query	SET @@sql_log_bin=on
2024-01-03T08:00:01.511636Z	217704 Query	set local oscar_local_only_replica_host_status=1;
2024-01-03T08:00:01.511747Z	217704 Query	SELECT durable_lsn, current_read_point, server_id, last_update_timestamp FROM information_schema.replica_host_status;
2024-01-03T08:12:18.027713Z	217705 Query	SET @@sql_log_bin=on
2024-01-03T08:12:19.125290Z	262325 Query	with dataset as (
select sleep(2) as t)
select * from t
2024-01-03T08:12:19.340385Z	126289 Query	SELECT 1
2024-01-03T08:12:20.050828Z	217704 Query	set local oscar_local_only_replica_host_status=1;
2024-01-03T08:12:20.050990Z	217704 Query	SELECT durable_lsn, current_read_point, server_id, last_update_timestamp FROM information_schema.replica_host_status;"""
        os.environ[
            "POSTGRES_QUERY_LOGS"
        ] = """2023-11-29 09:23:46 UTC::@:[560]:LOG:  checkpoint starting: time
2023-11-29 09:23:46 UTC::@:[560]:LOG:  checkpoint complete: wrote 0 buffers (0.0%); 0 WAL file(s) added, 0 removed, 0 recycled; write=0.001 s, sync=0.001 s, total=0.001 s; sync files=0, longest=0.000 s, average=0.000 s; distance=0 kB, estimate=0 kB
2023-11-29 09:23:51 UTC:10.0.2.55(57562):postgres@postgres:[29735]:LOG:  duration: 100.50 ms statement: SELECT d.datname as "Name",
        pg_catalog.pg_get_userbyid(d.datdba) as "Owner",
        pg_catalog.pg_encoding_to_char(d.encoding) as "Encoding",
        d.datcollate as "Collate",
        d.datctype as "Ctype",
        pg_catalog.array_to_string(d.datacl, E'\n') AS "Access privileges"
    FROM pg_catalog.pg_database d
    ORDER BY 1;
2023-11-29 09:24:05 UTC:10.0.2.55(57562):postgres@postgres:[29735]:ERROR:  syntax error at or near "/" at character 1
2023-11-29 09:24:05 UTC:10.0.2.55(57562):postgres@postgres:[29735]:STATEMENT:  /h
    LIst
    list
    select * from audit.record_history;
2023-11-29 09:24:09 UTC:10.0.2.55(57562):postgres@postgres:[29735]:LOG:  statement: select * from audit.record_history;
2023-11-29 09:24:09 UTC:10.0.2.55(57562):postgres@postgres:[29735]:ERROR:  relation "audit.record_history" does not exist at character 15
2023-11-29 09:24:09 UTC:10.0.2.55(57562):postgres@postgres:[29735]:STATEMENT:  select * from audit.record_history;
2023-11-29 09:24:22 UTC:10.0.2.55(57562):postgres@postgres:[29735]:LOG:  statement: select * from audit.record_history;
2024-03-27 01:35:26.270 GMT [394] LOG:  skipping missing configuration file "/rdsdbdata/config/recovery.conf"
2024-03-27 01:35:26.271 GMT [394] LOG:  skipping missing configuration file "/rdsdbdata/config/recovery.conf"
2024-03-27 01:36:27 UTC:10.0.2.55(57562):postgres@postgres:[29735]:LOG:  statement: select * from audit.record_history;
"""
        yield


@pytest.fixture
def mock_wafv2_context():
    with mock_wafv2():
        wafv2 = boto3.client("wafv2")

        os.environ["WAF_WEB_ACL_NAME_01"] = "WAF_WEB_ACL_01"
        os.environ["WAF_WEB_ACL_NAME_02"] = "WAF_WEB_ACL_02"

        kwargs = dict(
            DefaultAction={
                "Block": {
                    "CustomResponse": {
                        "ResponseCode": 200,
                        "CustomResponseBodyKey": "string",
                        "ResponseHeaders": [
                            {"Name": "string", "Value": "string"},
                        ],
                    }
                },
                "Allow": {
                    "CustomRequestHandling": {
                        "InsertHeaders": [
                            {"Name": "string", "Value": "string"},
                        ]
                    }
                },
            },
            Rules=[
                {
                    "Name": "string",
                    "Priority": 123,
                    "Statement": {
                        "ByteMatchStatement": {
                            "SearchString": "bytes",
                            "FieldToMatch": {
                                "SingleHeader": {"Name": "string"},
                                "SingleQueryArgument": {"Name": "string"},
                                "AllQueryArguments": {},
                                "UriPath": {},
                                "QueryString": {},
                                "Body": {"OversizeHandling": "CONTINUE"},
                                "Method": {},
                                "JsonBody": {
                                    "MatchPattern": {
                                        "All": {},
                                        "IncludedPaths": ["string"],
                                    },
                                    "MatchScope": "ALL",
                                    "InvalidFallbackBehavior": "MATCH",
                                    "OversizeHandling": "CONTINUE",
                                },
                                "Headers": {
                                    "MatchPattern": {
                                        "All": {},
                                        "IncludedHeaders": ["string"],
                                        "ExcludedHeaders": ["string"],
                                    },
                                    "MatchScope": "ALL",
                                    "OversizeHandling": "CONTINUE",
                                },
                                "Cookies": {
                                    "MatchPattern": {
                                        "All": {},
                                        "IncludedCookies": ["string"],
                                        "ExcludedCookies": ["string"],
                                    },
                                    "MatchScope": "ALL",
                                    "OversizeHandling": "CONTINUE",
                                },
                                "HeaderOrder": {"OversizeHandling": "CONTINUE"},
                                "JA3Fingerprint": {"FallbackBehavior": "MATCH"},
                            },
                            "TextTransformations": [{"Priority": 123, "Type": "NONE"}],
                            "PositionalConstraint": "EXACTLY",
                        }
                    },
                    "OverrideAction": {
                        "Count": {
                            "CustomRequestHandling": {
                                "InsertHeaders": [{"Name": "string", "Value": "string"}]
                            }
                        },
                        "None": {},
                    },
                    "RuleLabels": [{"Name": "string"}],
                    "VisibilityConfig": {
                        "SampledRequestsEnabled": True,
                        "CloudWatchMetricsEnabled": False,
                        "MetricName": "string",
                    },
                    "CaptchaConfig": {"ImmunityTimeProperty": {"ImmunityTime": 123}},
                    "ChallengeConfig": {"ImmunityTimeProperty": {"ImmunityTime": 123}},
                }
            ],
            VisibilityConfig={
                "SampledRequestsEnabled": True,
                "CloudWatchMetricsEnabled": False,
                "MetricName": "string",
            },
            CustomResponseBodies={
                "string": {
                    "ContentType": "APPLICATION_JSON",
                    "Content": "string",
                }
            },
            CaptchaConfig={"ImmunityTimeProperty": {"ImmunityTime": 123}},
            ChallengeConfig={"ImmunityTimeProperty": {"ImmunityTime": 123}},
            TokenDomains=[
                "string",
            ],
            AssociationConfig={
                "RequestBody": {"string": {"DefaultSizeInspectionLimit": "KB_16"}}
            },
        )

        wafv2.create_web_acl(
            Name=os.environ["WAF_WEB_ACL_NAME_01"],
            Scope="CLOUDFRONT",
            **kwargs,
        )
        wafv2.create_web_acl(
            Name=os.environ["WAF_WEB_ACL_NAME_02"],
            Scope="CLOUDFRONT",
            **kwargs,
        )
        yield


@pytest.fixture(scope="session")
def download_maxminddb():
    maxminddb_url = (
        "https://aws-gcr-solutions-assets.s3.amazonaws.com/maxmind/GeoLite2-City.mmdb"
    )

    local_path = f"{os.path.dirname(os.path.dirname(os.path.abspath(__file__)))}/s3_object_replication/enrichment/maxminddb/GeoLite2-City.mmdb"
    if os.path.exists(os.path.dirname(local_path)) is False:
        os.makedirs(os.path.dirname(local_path), mode=755, exist_ok=True)

    if os.path.exists(local_path) is False:
        r = requests.get(maxminddb_url)
        with open(local_path, "wb") as fd:
            fd.write(r.content)
    yield

    if os.path.exists(local_path):
        os.remove(local_path)
