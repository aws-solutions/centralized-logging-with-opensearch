# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0
import os

import boto3
import pytest
from commonlib.dao import AppLogIngestionDao
from commonlib.model import (
    AppPipeline,
    BufferParam,
    MonitorDetail,
    AOSParams,
    LogSource,
    SyslogSource,
    LogSourceTypeEnum,
    AppLogIngestion,
    SyslogProtocol,
    Output,
)
from moto import mock_elbv2




def get_app_log_ingestion_table_name():
    return os.environ.get("APP_LOG_INGESTION_TABLE_NAME")


def get_syslog_source():
    mock_syslog_source = LogSource(
        sourceId="sourceId1",
        type=LogSourceTypeEnum.Syslog,
        syslog=SyslogSource(
            protocol=SyslogProtocol.TCP,
            port=0,
            nlbArn="nlbArn",
            nlbDNSName="nlbDNSName",
        ),
        accountId="accountI1",
        region="us-east-1",
        archiveFormat="json",
        subAccountLinkId="4512fd67-5bbf-4170-8aea-03107a500c72",
        subAccountVpcId="vpc-1001",
        subAccountPublicSubnetIds="sub-001,sub-002",
    )
    return mock_syslog_source


def get_app_pipeline():
    mock_app_pipeline  = AppPipeline(
        indexPrefix="app-pipe",
        aosParams=AOSParams(
            **{
                "coldLogTransition": 0,
                "domainName": "solution-os",
                "engine": "OpenSearch",
                "failedLogBucket": "amzn-s3-demo-logging-bucket",
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
        bufferResourceArn="arn:aws:s3:::amzn-s3-demo-logging-bucket",
        bufferResourceName="amzn-s3-demo-logging-bucket",
        bufferParams=[
            BufferParam(
                paramKey="logBucketName",
                paramValue="amzn-s3-demo-logging-bucket",
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
    return mock_app_pipeline

def get_app_log_ingestion():
    ingestion_args = dict()
    ingestion_args["appPipelineId"] = "appPipelineId1"
    ingestion_args["sourceId"] = get_syslog_source().sourceId
    ingestion_args["stackId"]="111"
    ingestion_args["accountId"]=get_syslog_source().accountId
    ingestion_args["region"]=get_syslog_source().region
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
    return app_log_ingestion

@pytest.fixture
def mocked_elbv2_client():
    with mock_elbv2():
        boto3.client("elbv2")
        yield
def test_create_syslog_substack(mocker, mocked_elbv2_client):

    mocker.patch("commonlib.LinkAccountHelper")
    from svc.syslog import SyslogSourceHandler
    mocker.patch("commonlib.dao.DynamoDBUtil", return_value=None)
    ingestion_dao = AppLogIngestionDao(table_name=get_app_log_ingestion_table_name())
    syslog_source_handler = SyslogSourceHandler(ingestion_dao)
    mocked_exec_sfn_flow = mocker.patch("svc.syslog.exec_sfn_flow")
    mocked_elb = mocker.patch("svc.syslog.elb.create_load_balancer")
    syslog_source_handler.create_syslog_substack(
        get_syslog_source(), get_app_log_ingestion(), get_app_pipeline(),
    )
    mocked_exec_sfn_flow.assert_called_once()
    mocked_elb.assert_called_once()

    #testing delete syslog
    mocked_remove_sfn_flow = mocker.patch("svc.syslog.exec_sfn_flow")
    mocked_ingestion_dao_delete=mocker.patch.object(ingestion_dao, "delete_with_log_source")
    mocked_ingestion_dao = mocker.patch.object(ingestion_dao, "list_app_log_ingestions")
    mocker.patch( "svc.syslog.app_pipeline_dao.get_app_pipeline", return_value=get_app_pipeline())
    syslog_source_handler.delete_ingestion(get_syslog_source(), get_app_log_ingestion())
    mocked_remove_sfn_flow.assert_called()
    mocked_ingestion_dao_delete.assert_called_once()

def test_create_syslog_ingestion(mocker):
    mocker.patch("commonlib.LinkAccountHelper")
    from svc.syslog import SyslogSourceHandler
    mocker.patch("commonlib.dao.DynamoDBUtil", return_value=None)

    ingestion_dao = AppLogIngestionDao(table_name=get_app_log_ingestion_table_name())
    syslog_source_handler = SyslogSourceHandler(ingestion_dao)

    mocked_ingestion_dao_save_with_log_source = mocker.patch.object(ingestion_dao, "save_with_log_source")
    mocked_ingestion_dao_update_app_log_ingestion = mocker.patch.object(ingestion_dao, "update_app_log_ingestion")
    link_account=dict()
    link_account['cwlMonitorRoleArn']="arn:aws:iam::111111111111:role/test-role"
    mocker.patch("svc.syslog.account_helper.get_link_account",return_value=link_account)

    instance_with_ingestion_list = dict()
    instance_with_ingestion_list[get_syslog_source().syslog.port]=get_app_log_ingestion()

    mocked_syslog_source_handler_generate_flb_conf = mocker.patch.object(syslog_source_handler, "generate_flb_conf")
    syslog_source_handler.create_ingestion(get_syslog_source(), get_app_log_ingestion())

    mocked_ingestion_dao_save_with_log_source.assert_called_once()
    mocked_ingestion_dao_update_app_log_ingestion.assert_called_once()