# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import os
import pytest
from commonlib.model import (
    AppPipeline,
    LogSource,
    S3Source,
    LogSourceTypeEnum,
    S3IngestionMode,
    AOSParams,
    BufferParam,
    MonitorDetail,
    StatusEnum,
    AppLogIngestion,
    Output,
    LogStructure,
    EngineType,
)
from commonlib.exception import ErrorCode
from commonlib.dao import AppLogIngestionDao


def get_app_log_ingestion_table_name():
    return os.environ.get("APP_LOG_INGESTION_TABLE_NAME")


def test_create_s3_ingestion(mocker):
    from svc.s3 import S3SourceHandler

    s3_source = LogSource(
        sourceId="sourceId1",
        type=LogSourceTypeEnum.S3,
        s3=S3Source(
            bucketName="solution-logs-123456789012",
            keyPrefix="keyPrefix",
            keySuffix="keySuffix",
            mode=S3IngestionMode.ONE_TIME,
        ),
        accountId="accountI1",
        region="us-east-1",
        archiveFormat="json",
        subAccountLinkId="4512fd67-5bbf-4170-8aea-03107a500c72",
        subAccountVpcId="vpc-1001",
        subAccountPublicSubnetIds="sub-001,sub-002",
    )
    app_pipeline = AppPipeline(
        indexPrefix="app-pipe",
        aosParams=AOSParams(
            **{
                "coldLogTransition": 0,
                "domainName": "solution-os",
                "engine": "OpenSearch",
                "failedLogBucket": "solution-solutionloggingbucket0fa53b76-12cw0hl0kfnk6",
                "indexPrefix": "app-pipe",
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
        queueArn="sqs-queue-arn",
        logProcessorRoleArn="log-processor-role-arn",
        bufferAccessRoleArn="arn:aws:iam::123456:role/CL-AppPipe-33653b46-BufferAccessRoleDF53FD85-DNE93UP0U4NE",
        bufferAccessRoleName="CL-AppPipe-33653b46-BufferAccessRoleDF53FD85-DNE93UP0U4NE",
        bufferResourceArn="arn:aws:s3:::solution-solutionloggingbucket0fa53b76-1jyvyptgjbge9",
        bufferResourceName="solution-solutionloggingbucket0fa53b76-1jyvyptgjbge9",
        bufferParams=[
            BufferParam(
                paramKey="logBucketName",
                paramValue="solution-solutionloggingbucket0fa53b76-1jyvyptgjbge9",
            ),
            BufferParam(
                paramKey="logBucketPrefix",
                paramValue="my-key-prefix",
            ),
            BufferParam(
                paramKey="logBucketSuffix",
                paramValue="my-key-suffix",
            ),
            BufferParam(
                paramKey="defaultCmkArn",
                paramValue="arn:aws:kms:us-west-2:123456:key/7a262998-de54-444e-8643-4fa3e4ea818a",
            ),
            BufferParam(
                paramKey="maxFileSize",
                paramValue="50",
            ),
            BufferParam(
                paramKey="uploadTimeout",
                paramValue="60",
            ),
            BufferParam(
                paramKey="compressionType",
                paramValue="gzip",
            ),
            BufferParam(
                paramKey="s3StorageClass",
                paramValue="INTELLIGENT_TIERING",
            ),
        ],
        logConfigId="00000000",
        logConfigVersionNumber=0,
        monitor=MonitorDetail(
            status="ENABLED",
            backupBucketName="xxxxx",
            errorLogPrefix="xxxxxx",
        ),
    )
    ingestion_args = dict()
    ingestion_args["appPipelineId"] = app_pipeline.pipelineId
    ingestion_args["accountId"]=s3_source.accountId
    ingestion_args["region"]=s3_source.region
    ingestion_args["sourceId"] = s3_source.sourceId
    ingestion_args["stackId"] = "111"

    app_log_ingestion = AppLogIngestion(**ingestion_args)
    output = Output(
        **{
            "name": "syslog",
            "roleArn": "arn:aws:iam::111111111111:role/CL-AppPipe-s3-BufferAccessRole-name",
            "roleName": "CL-AppPipe-s3-BufferAccessRole-name",
            "params": [
                {"paramKey": "logBucketPrefix", "paramValue": "logBucketPrefix_value"},
                {"paramKey": "max_file_size", "paramValue": "logBucketPrefix_value"},
                {"paramKey": "bucket_name", "paramValue": "logBucketPrefix_value"},
                {"paramKey": "upload_timeout", "paramValue": "logBucketPrefix_value"},
                {
                    "paramKey": "compression_type",
                    "paramValue": "compression_type_value",
                },
                {"paramKey": "storage_class", "paramValue": "storage_class_value"},
            ],
        }
    )
    app_log_ingestion.output = output

    ingestion_dao = AppLogIngestionDao(table_name=get_app_log_ingestion_table_name())
    s3_source_handler = S3SourceHandler(ingestion_dao)
    # one time mode

    mocked_exec_sfn_flow = mocker.patch("svc.s3.exec_sfn_flow")
    mocker.patch.object(ingestion_dao, "save")
    s3_source_handler.create_s3_ingestion(
        app_log_ingestion=app_log_ingestion,
        log_source=s3_source,
        app_pipeline=app_pipeline,
    )
    mocked_exec_sfn_flow.assert_called_once()
    s3_source = LogSource(
        sourceId="d7a18244-96b4-4cf0-9806-ebe1a12315d9",
        accountId="123456789012",
        type=LogSourceTypeEnum.S3,
        region="us-west-2",
        status=StatusEnum.ACTIVE,
        s3=S3Source(
            mode=S3IngestionMode.ON_GOING,
            bucketName="my-bucket-name",
            keyPrefix="my-key-prefix",
            keySuffix="my-key-suffix",
        ),
    )
    # on going mode different bucket
    mocked_exec_sfn_flow = mocker.patch("svc.s3.exec_sfn_flow", return_value=None)
    s3_source_handler.create_s3_ingestion(
        app_log_ingestion=app_log_ingestion,
        log_source=s3_source,
        app_pipeline=app_pipeline,
    )
    mocked_exec_sfn_flow.assert_called_once()

    # on going mode same bucket
    app_pipeline.bufferResourceName = "my-bucket-name"
    mocker.patch.object(s3_source_handler._ingestion_dao, "get_app_log_ingestions_by_pipeline_id", return_value=[])
    mocked_exec_sfn_flow = mocker.patch("svc.s3.exec_sfn_flow", return_value=None)
    s3_source_handler.create_s3_ingestion(
        app_log_ingestion=app_log_ingestion,
        log_source=s3_source,
        app_pipeline=app_pipeline,
    )
    mocked_exec_sfn_flow.assert_not_called()


def test_create_s3_ingestion_for_light_engine(mocker):
    from svc.s3 import S3SourceHandler

    s3_source = LogSource(
        sourceId="sourceId1",
        type=LogSourceTypeEnum.S3,
        s3=S3Source(
            bucketName="solution-logs-123456789012",
            keyPrefix="keyPrefix",
            keySuffix="keySuffix",
            mode=S3IngestionMode.ONE_TIME,
        ),
        accountId="accountI1",
        region="us-east-1",
        archiveFormat="json",
        subAccountLinkId="4512fd67-5bbf-4170-8aea-03107a500c72",
        subAccountVpcId="vpc-1001",
        subAccountPublicSubnetIds="sub-001,sub-002",
    )
    app_pipeline = AppPipeline(
        indexPrefix="app-pipe",
        aosParams=AOSParams(
            **{
                "coldLogTransition": 0,
                "domainName": "solution-os",
                "engine": "OpenSearch",
                "failedLogBucket": "solution-solutionloggingbucket0fa53b76-12cw0hl0kfnk6",
                "indexPrefix": "app-pipe",
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
        queueArn="sqs-queue-arn",
        logProcessorRoleArn="log-processor-role-arn",
        bufferAccessRoleArn="arn:aws:iam::123456:role/CL-AppPipe-33653b46-BufferAccessRoleDF53FD85-DNE93UP0U4NE",
        bufferAccessRoleName="CL-AppPipe-33653b46-BufferAccessRoleDF53FD85-DNE93UP0U4NE",
        bufferResourceArn="arn:aws:s3:::solution-solutionloggingbucket0fa53b76-1jyvyptgjbge9",
        bufferResourceName="solution-solutionloggingbucket0fa53b76-1jyvyptgjbge9",
        bufferParams=[
            BufferParam(
                paramKey="logBucketName",
                paramValue="solution-solutionloggingbucket0fa53b76-1jyvyptgjbge9",
            ),
            BufferParam(
                paramKey="logBucketPrefix",
                paramValue="my-key-prefix",
            ),
            BufferParam(
                paramKey="logBucketSuffix",
                paramValue="my-key-suffix",
            ),
            BufferParam(
                paramKey="defaultCmkArn",
                paramValue="arn:aws:kms:us-west-2:123456:key/7a262998-de54-444e-8643-4fa3e4ea818a",
            ),
            BufferParam(
                paramKey="maxFileSize",
                paramValue="50",
            ),
            BufferParam(
                paramKey="uploadTimeout",
                paramValue="60",
            ),
            BufferParam(
                paramKey="compressionType",
                paramValue="gzip",
            ),
            BufferParam(
                paramKey="s3StorageClass",
                paramValue="INTELLIGENT_TIERING",
            ),
        ],
        logConfigId="00000000",
        logConfigVersionNumber=0,
        monitor=MonitorDetail(
            status="ENABLED",
            backupBucketName="xxxxx",
            errorLogPrefix="xxxxxx",
        ),
        logStructure=LogStructure.RAW,
        engineType=EngineType.LIGHT_ENGINE,
    )
    ingestion_args = dict()
    ingestion_args["appPipelineId"] = app_pipeline.pipelineId
    ingestion_args["accountId"]=s3_source.accountId
    ingestion_args["region"]=s3_source.region
    ingestion_args["sourceId"] = s3_source.sourceId
    ingestion_args["stackId"] = "111"

    app_log_ingestion = AppLogIngestion(**ingestion_args)
    output = Output(
        **{
            "name": "syslog",
            "roleArn": "arn:aws:iam::111111111111:role/CL-AppPipe-s3-BufferAccessRole-name",
            "roleName": "CL-AppPipe-s3-BufferAccessRole-name",
            "params": [
                {"paramKey": "logBucketPrefix", "paramValue": "logBucketPrefix_value"},
                {"paramKey": "max_file_size", "paramValue": "logBucketPrefix_value"},
                {"paramKey": "bucket_name", "paramValue": "logBucketPrefix_value"},
                {"paramKey": "upload_timeout", "paramValue": "logBucketPrefix_value"},
                {
                    "paramKey": "compression_type",
                    "paramValue": "compression_type_value",
                },
                {"paramKey": "storage_class", "paramValue": "storage_class_value"},
            ],
        }
    )
    app_log_ingestion.output = output

    ingestion_dao = AppLogIngestionDao(table_name=get_app_log_ingestion_table_name())
    s3_source_handler = S3SourceHandler(ingestion_dao)

    # on time
    mocked_exec_sfn_flow = mocker.patch("svc.s3.exec_sfn_flow")
    mocker.patch.object(ingestion_dao, "save")
    with pytest.raises(Exception) as exception_info:
        s3_source_handler.create_s3_ingestion(
            app_log_ingestion=app_log_ingestion,
            log_source=s3_source,
            app_pipeline=app_pipeline,
        )
    assert exception_info.value.args[1] == 'Light Engine does not support ONE_TIME mode, only ON_GOING mode.'
    
    # on going
    s3_source = LogSource(
        sourceId="d7a18244-96b4-4cf0-9806-ebe1a12315d9",
        accountId="123456789012",
        type=LogSourceTypeEnum.S3,
        region="us-west-2",
        status=StatusEnum.ACTIVE,
        s3=S3Source(
            mode=S3IngestionMode.ON_GOING,
            bucketName="my-bucket-name",
            keyPrefix="my-key-prefix",
            keySuffix="my-key-suffix",
        ),
    )
    # on going mode different bucket
    mocked_exec_sfn_flow = mocker.patch("svc.s3.exec_sfn_flow", return_value=None)
    s3_source_handler.create_s3_ingestion(
        app_log_ingestion=app_log_ingestion,
        log_source=s3_source,
        app_pipeline=app_pipeline,
    )
    mocked_exec_sfn_flow.assert_called_once()
