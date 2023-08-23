# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import json
import os

import boto3
import pytest
from commonlib.model import (
    AppPipeline,
    AppLogIngestion,
    MonitorDetail,
    LogSource,
    SyslogSource,
    S3Source,
    EksSource,
    Ec2Source,
    SyslogProtocol,
    BufferTypeEnum,
    AOSParams,
    LogSourceTypeEnum,
    LogTypeEnum,
    CRIEnum,
    DeploymentKindEnum,
    LogConfig,
    S3IngestionMode,
    StatusEnum,
)
from moto import mock_sts, mock_ssm, mock_s3, mock_elbv2, mock_iam


@pytest.fixture
def create_event():
    with open("./test/event/test_event.json", "r") as f:
        event = json.load(f)
        # please replace event["arguments"]
        event["arguments"] = {
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
        }
        event["info"]["fieldName"] = "createLogConfigV2"

        print(event)
        return event


@pytest.fixture
def sts_client():
    with mock_sts():
        boto3.client("sts", region_name=os.environ.get("AWS_REGION"))
        yield


@pytest.fixture
def s3_client():
    with mock_s3():
        boto3.client("s3", region_name=os.environ.get("AWS_REGION"))
        yield


@pytest.fixture
def iam_client():
    with mock_iam():
        boto3.client("iam", region_name=os.environ.get("AWS_REGION"))
        yield


@pytest.fixture
def ssm_client():
    with mock_ssm():
        boto3.client("ssm", region_name=os.environ.get("AWS_REGION"))
        yield


@pytest.fixture
def elbv2_client():
    with mock_elbv2():
        boto3.client("elbv2", region_name=os.environ.get("AWS_REGION"))
        yield


def get_app_pipeline_with_aos():
    mock_app_pipeline = AppPipeline(
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
    return mock_app_pipeline


def get_app_pipeline_with_s3_buffer():
    mock_app_pipeline = AppPipeline(
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
        bufferType=BufferTypeEnum.S3,
        bufferAccessRoleArn="bufferAccessRoleArn",
        bufferAccessRoleName="bufferAccessRoleName",
        bufferParams=[
            {"paramKey": "logBucketName", "paramValue": "logBucketName"},
            {"paramKey": "logBucketPrefix", "paramValue": "logBucketPrefix"},
            {"paramKey": "maxFileSize", "paramValue": "50"},
            {"paramKey": "uploadTimeout", "paramValue": "60"},
            {"paramKey": "compressionType", "paramValue": "gzip"},
            {"paramKey": "s3StorageClass", "paramValue": "INTELLIGENT_TIERING"},
        ],
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
    return mock_app_pipeline


def get_app_pipeline_with_kds_buffer():
    mock_app_pipeline = AppPipeline(
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
        bufferType=BufferTypeEnum.KDS,
        bufferAccessRoleArn="bufferAccessRoleArn",
        bufferAccessRoleName="bufferAccessRoleName",
        bufferParams=[{"paramKey": "stream_name", "paramValue": "kds_name"}],
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
    return mock_app_pipeline


def get_app_pipeline_with_msk_buffer():
    mock_app_pipeline = AppPipeline(
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
        bufferType=BufferTypeEnum.MSK,
        bufferAccessRoleArn="bufferAccessRoleArn",
        bufferAccessRoleName="bufferAccessRoleName",
        bufferParams=[
            {"paramKey": "mskBrokerServers", "paramValue": "mskBrokerServers"},
            {"paramKey": "topics", "paramValue": "topics"},
        ],
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
    return mock_app_pipeline


def get_log_config():
    config_args = dict()
    config_args["id"] = "logconf"
    config_args["version"] = "1"
    config_args["name"] = "test_conf"
    config_args["logType"] = LogTypeEnum.JSON
    config_args["regexFieldSpecs"] = []
    mock_log_config = LogConfig(**config_args)
    return mock_log_config


def get_ec2_source():
    mock_ec2_log_source = LogSource(
        sourceId="sourceId1",
        type=LogSourceTypeEnum.EC2,
        ec2=Ec2Source(groupName="group1", groupType="EC2", groupPlatform="Linux"),
        accountId="accountI1",
        region="us-east-1",
        archiveFormat="json",
        subAccountLinkId="4512fd67-5bbf-4170-8aea-03107a500c72",
        subAccountVpcId="vpc-1001",
        subAccountPublicSubnetIds="sub-001,sub-002",
    )
    return mock_ec2_log_source


def get_s3_source():
    mock_s3_log_source = LogSource(
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
    return mock_s3_log_source


def get_eks_source():
    mock_eks_log_source = LogSource(
        sourceId="sourceId1",
        type=LogSourceTypeEnum.EKSCluster,
        eks=EksSource(
            cri=CRIEnum.CONTAINERD,
            deploymentKind=DeploymentKindEnum.DAEMON_SET,
            accountId="keySuffix",
            aosDomainId="aosDomainId",
            eksClusterArn="eksClusterArn",
            eksClusterName="eksClusterName",
            eksClusterSGId="eksClusterSGId",
            region="test_region",
            endpoint="test_endpoint",
            logAgentRoleArn="logAgentRoleArn",
            oidcIssuer="oidcIssuer",
            subnetIds=["subnet1", "subnet2"],
            vpcId="vpcId",
        ),
        accountId="accountI1",
        region="us-east-1",
        archiveFormat="json",
        subAccountLinkId="4512fd67-5bbf-4170-8aea-03107a500c72",
        subAccountVpcId="vpc-1001",
        subAccountPublicSubnetIds="sub-001,sub-002",
    )
    return mock_eks_log_source


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


def get_app_log_ingestion():
    ingestion_args = dict()
    ingestion_args["appPipelineId"] = "appPipelineId1"
    ingestion_args["sourceId"] = get_s3_source().sourceId
    ingestion_args["accountId"] = get_s3_source().accountId
    ingestion_args["region"] = get_s3_source().region
    app_log_ingestion = AppLogIngestion(**ingestion_args)
    return app_log_ingestion


def test_create_app_log_ingestion(mocker):
    mocker.patch("commonlib.dao.InstanceDao")
    mocker.patch("commonlib.LinkAccountHelper")
    from svc.service import AppLogIngestionService

    # app pipline with aos
    mocker.patch(
        "svc.service.app_pipeline_dao.get_app_pipeline",
        return_value=get_app_pipeline_with_aos(),
    )
    mocker.patch(
        "svc.service.log_config_dao.get_log_config", return_value=get_log_config()
    )

    mock_app_log_ingestion = get_app_log_ingestion()
    mock_app_log_ingestion.id = "ingestion_id1"
    mocker.patch("svc.service.ingestion_dao.save", return_value=mock_app_log_ingestion)
    ingestion_svc = AppLogIngestionService()

    # create s3 source
    mocker.patch(
        "svc.service.log_source_dao.get_log_source", return_value=get_s3_source()
    )
    mocker.patch("svc.service.S3SourceHandler.create_s3_ingestion", return_value=None)
    ingestion_svc.create_app_log_ingestion(mock_app_log_ingestion)

    # create syslog source with aos
    mocker.patch(
        "svc.service.log_source_dao.get_log_source", return_value=get_syslog_source()
    )
    mocker.patch(
        "svc.service.SyslogSourceHandler.create_syslog_substack", return_value=None
    )
    mocker.patch("svc.service.SyslogSourceHandler.create_ingestion", return_value=None)
    ingestion_svc.create_app_log_ingestion(mock_app_log_ingestion)

    # create syslog source with s3 buffer
    mocker.patch(
        "svc.service.app_pipeline_dao.get_app_pipeline",
        return_value=get_app_pipeline_with_s3_buffer(),
    )
    ingestion_svc.create_app_log_ingestion(mock_app_log_ingestion)

    # create syslog source with kds buffer
    mocker.patch(
        "svc.service.app_pipeline_dao.get_app_pipeline",
        return_value=get_app_pipeline_with_kds_buffer(),
    )
    ingestion_svc.create_app_log_ingestion(mock_app_log_ingestion)

    # create syslog source with msk buffer
    mocker.patch(
        "svc.service.app_pipeline_dao.get_app_pipeline",
        return_value=get_app_pipeline_with_msk_buffer(),
    )
    ingestion_svc.create_app_log_ingestion(mock_app_log_ingestion)

    # create eks source with aos
    mocker.patch(
        "svc.service.log_source_dao.get_log_source", return_value=get_eks_source()
    )
    mocker.patch("svc.service.EKSSourceHandler.create_ingestion", return_value=None)
    ingestion_svc.create_app_log_ingestion(mock_app_log_ingestion)

    # create eks source with s3 buffer
    mocker.patch(
        "svc.service.app_pipeline_dao.get_app_pipeline",
        return_value=get_app_pipeline_with_s3_buffer(),
    )
    ingestion_svc.create_app_log_ingestion(mock_app_log_ingestion)

    # create eks source with kds buffer
    mocker.patch(
        "svc.service.app_pipeline_dao.get_app_pipeline",
        return_value=get_app_pipeline_with_kds_buffer(),
    )
    ingestion_svc.create_app_log_ingestion(mock_app_log_ingestion)

    # create eks source with msk buffer
    mocker.patch(
        "svc.service.app_pipeline_dao.get_app_pipeline",
        return_value=get_app_pipeline_with_msk_buffer(),
    )
    ingestion_svc.create_app_log_ingestion(mock_app_log_ingestion)

    # create ec2 source with aos
    mocker.patch(
        "svc.service.log_source_dao.get_log_source", return_value=get_ec2_source()
    )
    mocker.patch("svc.service.EC2SourceHandler.create_ingestion", return_value=None)
    ingestion_svc.create_app_log_ingestion(mock_app_log_ingestion)

    # create ec2 source with s3 buffer
    mocker.patch(
        "svc.service.app_pipeline_dao.get_app_pipeline",
        return_value=get_app_pipeline_with_s3_buffer(),
    )
    ingestion_svc.create_app_log_ingestion(mock_app_log_ingestion)

    # create ec2 source with kds buffer
    mocker.patch(
        "svc.service.app_pipeline_dao.get_app_pipeline",
        return_value=get_app_pipeline_with_kds_buffer(),
    )
    ingestion_svc.create_app_log_ingestion(mock_app_log_ingestion)

    # create ec2 source with msk buffer
    mocker.patch(
        "svc.service.app_pipeline_dao.get_app_pipeline",
        return_value=get_app_pipeline_with_msk_buffer(),
    )
    ingestion_svc.create_app_log_ingestion(mock_app_log_ingestion)


def test_delete_app_log_ingestion(mocker):
    mocker.patch("commonlib.dao.InstanceDao")
    mocker.patch("commonlib.LinkAccountHelper")
    from svc.service import AppLogIngestionService

    mock_app_log_ingestion: AppLogIngestion = AppLogIngestion(
        **{
            "id": "id1",
            "appPipelineId": "appPipelineId1",
            "sourceId": "sourceId1",
            "accountId": "111111111111",
            "region": "us-east-1",
            "status": "ACTIVE",
        }
    )
    mocker.patch(
        "svc.service.ingestion_dao.get_app_log_ingestion",
        return_value=mock_app_log_ingestion,
    )

    ingestion_svc = AppLogIngestionService()
    # deletes ec2 source
    mocker.patch(
        "svc.service.log_source_dao.get_log_source", return_value=get_ec2_source()
    )
    mocker.patch("svc.service.EC2SourceHandler.delete_ingestion", return_value=None)
    ingestion_svc.delete_app_log_ingestion(mock_app_log_ingestion.id)
    # deletes syslog source
    mocker.patch(
        "svc.service.log_source_dao.get_log_source", return_value=get_syslog_source()
    )
    mocker.patch("svc.service.SyslogSourceHandler.delete_ingestion", return_value=None)
    mock_app_log_ingestion.status = StatusEnum.ACTIVE
    ingestion_svc.delete_app_log_ingestion(mock_app_log_ingestion.id)

    # deletes eks source
    mocker.patch(
        "svc.service.log_source_dao.get_log_source", return_value=get_eks_source()
    )
    mocker.patch(
        "svc.service.ingestion_dao.update_app_log_ingestion", return_value=None
    )
    mock_app_log_ingestion.status = StatusEnum.ACTIVE
    ingestion_svc.delete_app_log_ingestion(mock_app_log_ingestion.id)

    # deletes s3 source
    mocker.patch(
        "svc.service.log_source_dao.get_log_source", return_value=get_s3_source()
    )
    mock_app_log_ingestion.status = StatusEnum.ACTIVE
    ingestion_svc.delete_app_log_ingestion(mock_app_log_ingestion.id)


def test_get_k8s_deployment_content_with_daemon_set(mocker):
    ingestion_args = dict()
    ingestion_args["appPipelineId"] = "appPipelineId1"
    ingestion_args["sourceId"] = get_eks_source().sourceId
    ingestion_args["accountId"] = get_eks_source().accountId
    ingestion_args["region"] = get_eks_source().region
    mocker.patch("commonlib.dao.InstanceDao")
    mocker.patch("commonlib.LinkAccountHelper")
    from svc.service import AppLogIngestionService

    ingestion_svc = AppLogIngestionService()
    mocker.patch(
        "svc.service.log_source_dao.get_log_source", return_value=get_eks_source()
    )
    app_log_ingestion = AppLogIngestion(**ingestion_args)
    mocker.patch(
        "svc.service.ingestion_dao.list_app_log_ingestions",
        return_value=[app_log_ingestion],
    )
    mocker.patch(
        "svc.service.EKSSourceHandler.get_deployment_content",
        return_value="mocked_daemonset_data",
    )
    assert (
        ingestion_svc.get_k8s_deployment_content_with_daemon_set("appPipelineId1")
        == "mocked_daemonset_data"
    )


def test_get_k8s_deployment_content_with_sidecar(mocker):
    ingestion_args = dict()
    ingestion_args["appPipelineId"] = "appPipelineId1"
    ingestion_args["sourceId"] = get_eks_source().sourceId
    ingestion_args["accountId"] = get_eks_source().accountId
    ingestion_args["region"] = get_eks_source().region
    mocker.patch("commonlib.dao.InstanceDao")
    mocker.patch("commonlib.LinkAccountHelper")
    from svc.service import AppLogIngestionService

    ingestion_svc = AppLogIngestionService()
    app_log_ingestion = AppLogIngestion(**ingestion_args)
    mocker.patch(
        "svc.service.ingestion_dao.get_app_log_ingestion",
        return_value=app_log_ingestion,
    )
    mocker.patch(
        "svc.service.log_source_dao.get_log_source", return_value=get_eks_source()
    )
    mocker.patch(
        "svc.service.EKSSourceHandler.get_sidecar_content", return_value="mocker_data"
    )
    assert (
        ingestion_svc.get_k8s_deployment_content_with_sidecar("appPipelineId1")
        == "mocker_data"
    )


def test_list_app_log_ingestions(mocker):
    ingestion_args = dict()
    ingestion_args["appPipelineId"] = "appPipelineId1"
    ingestion_args["sourceId"] = get_eks_source().sourceId
    ingestion_args["accountId"] = get_eks_source().accountId
    ingestion_args["region"] = get_eks_source().region
    mocker.patch("commonlib.dao.InstanceDao")
    mocker.patch("commonlib.LinkAccountHelper")
    from svc.service import AppLogIngestionService

    ingestion_svc = AppLogIngestionService()
    app_log_ingestion = AppLogIngestion(**ingestion_args)
    mocker.patch(
        "svc.service.ingestion_dao.list_app_log_ingestions",
        return_value=[app_log_ingestion],
    )
    result = ingestion_svc.list_app_log_ingestions(
        appPipelineId="appPipelineId",
        sourceId="sourceId",
        region="region",
        accountId="accountId",
    )
    assert result["total"] == 1
