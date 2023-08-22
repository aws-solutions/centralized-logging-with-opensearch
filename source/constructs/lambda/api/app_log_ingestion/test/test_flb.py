# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import os
import sys
from commonlib.model import AppLogIngestion, EksSource, CRIEnum, DeploymentKindEnum
from typing import List

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


def get_mock_app_log_ingestion1():
    mock_app_log_ingestion1 = AppLogIngestion(
        **{
            "id": "ingestionId1",
            "appPipelineId": "appPipelineId1",
            "sourceId": "sourceId1",
            "logPath": "/app/1.log",
            "logConfig": {
                "id": "confId1",
                "version": 1,
                "name": "spring-boot-conf-1",
                "logType": "MultiLineText",
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
            "input": {"name": "tail", "params": []},
            "output": {
                "name": "S3",
                "roleArn": "arn:aws:iam::111111111111:role/CL-AppPipe-s3-BufferAccessRole-name",
                "roleName": "CL-AppPipe-s3-BufferAccessRole-name",
                "params": [
                    {
                        "paramKey": "logBucketPrefix",
                        "paramValue": "logBucketPrefix_value",
                    },
                    {"paramKey": "maxFileSize", "paramValue": "max_file_size_value"},
                    {"paramKey": "logBucketName", "paramValue": "bucket_name_value"},
                    {"paramKey": "uploadTimeout", "paramValue": "upload_timeout_value"},
                    {
                        "paramKey": "compressionType",
                        "paramValue": "compression_type_value",
                    },
                    {"paramKey": "s3StorageClass", "paramValue": "storage_class_value"},
                ],
            },
        }
    )
    return mock_app_log_ingestion1


def get_mock_app_log_ingestion2():
    mock_app_log_ingestion2 = AppLogIngestion(
        **{
            "id": "ingestionId2",
            "appPipelineId": "appPipelineId2",
            "sourceId": "sourceId1",
            "logPath": "/app/2.log",
            "logConfig": {
                "id": "confId1",
                "version": 2,
                "name": "json-conf",
                "logType": "JSON",
                "syslogParser": "RFC5424",
                "filterConfigMap": {
                    "enabled": True,
                    "filters": [
                        {
                            "condition": "Include",
                            "key": "include-status",
                            "value": "500",
                        }
                    ],
                },
                "regex": "",
                "regexFieldSpecs": [],
                "timeOffset": "-0600",
                "timeKeyRegex": "",
                "userLogFormat": "",
                "userSampleLog": "",
                "status": "ACTIVE",
            },
            "input": {"name": "tail", "params": []},
            "output": {
                "name": "AOS",
                "roleArn": "arn:aws:iam::111111111111:role/CL-AppPipe-AOS-BufferAccessRole-name",
                "roleName": "CL-AppPipe-AOS-BufferAccessRole-name",
                "params": [
                    {
                        "paramKey": "opensearchEndpoint",
                        "paramValue": "vpc-aos-endpoint.us-east-1.es.amazonaws.com",
                    },
                    {"paramKey": "indexPrefix", "paramValue": "log-indexPrefix"},
                ],
            },
        }
    )
    return mock_app_log_ingestion2


def get_mock_app_log_ingestion3():
    mock_app_log_ingestion3 = AppLogIngestion(
        **{
            "id": "ingestionId3",
            "appPipelineId": "appPipelineId3",
            "sourceId": "sourceId1",
            "logPath": "/app/3.log",
            "logConfig": {
                "id": "confId1",
                "version": 3,
                "name": "nginx-config",
                "logType": "Nginx",
                "filterConfigMap": {
                    "enabled": True,
                    "filters": [
                        {"condition": "Exclude", "key": "ex-status", "value": "200"},
                        {"condition": "Include", "key": "in-status", "value": "201"},
                    ],
                },
                "regex": '(?<remote_addr>\\S+)\\s+-\\s+(?<remote_user>\\S+)\\s+\\[(?<time_local>\\d+/\\S+/\\d+:\\d+:\\d+:\\d+\\s+\\S+)\\]\\s+"(?<request_method>\\S+)\\s+(?<request_uri>\\S+)\\s+\\S+"\\s+(?<status>\\S+)\\s+(?<body_bytes_sent>\\S+)\\s+"(?<http_referer>[^"]*)"\\s+"(?<http_user_agent>[^"]*)"\\s+"(?<http_x_forwarded_for>[^"]*)".*',
                "regexFieldSpecs": [],
                "timeKeyRegex": "",
                "userLogFormat": 'log_format  main  \'$remote_addr - $remote_user [$time_local] "$request" \'\n\'$status $body_bytes_sent "$http_referer" \'\n\'"$http_user_agent" "$http_x_forwarded_for"\';',
                "userSampleLog": '127.0.0.1 - - [24/Dec/2021:01:27:11 +0000] "GET / HTTP/1.1" 200 3520 "-" "curl/7.79.1" "-"',
                "status": "ACTIVE",
            },
            "input": {"name": "tail", "params": []},
            "output": {
                "name": "KDS",
                "roleArn": "arn:aws:iam::111111111111:role/CL-AppPipe-kds-BufferAccessRole-name",
                "roleName": "CL-AppPipe-kds-BufferAccessRole-name",
                "params": [{"paramKey": "streamName", "paramValue": "kds_stream_name"}],
            },
        }
    )
    return mock_app_log_ingestion3


def get_mock_app_log_ingestion4():
    mock_app_log_ingestion4 = AppLogIngestion(
        **{
            "id": "ingestionId4",
            "appPipelineId": "appPipelineId1",
            "sourceId": "sourceId1",
            "logPath": "/app/4.log",
            "logConfig": {
                "id": "confId2",
                "version": 4,
                "name": "test-rfc3164",
                "logType": "Syslog",
                "syslogParser": "RFC3164",
                "filterConfigMap": {"enabled": False, "filters": []},
                "regex": "^\\<(?<pri>[0-9]+)\\>(?<time>[^ ]* {1,2}[^ ]* [^ ]*) (?<host>[^ ]*) (?<ident>[a-zA-Z0-9_\\/\\.\\-]*)(?:\\[(?<pid>[0-9]+)\\])?(?:[^\\:]*\\:)? *(?<message>.*)$",
                "regexFieldSpecs": [
                    {"key": "pri", "type": "text"},
                    {"format": "%b %m %H:%M:%S", "key": "time", "type": "date"},
                    {"key": "host", "type": "text"},
                    {"key": "ident", "type": "text"},
                    {"key": "pid", "type": "text"},
                    {"key": "message", "type": "text"},
                ],
                "timeKey": "time",
                "timeOffset": "-0600",
                "userLogFormat": "",
                "userSampleLog": "<35>Oct 12 22:14:15 client_machine su: 'su root' failed for joe on /dev/pts/2",
                "status": "ACTIVE",
            },
            "input": {
                "name": "syslog",
                "params": [
                    {"paramKey": "protocolType", "paramValue": "TCP"},
                    {"paramKey": "port", "paramValue": "0000"},
                    {"paramKey": "listen", "paramValue": "127.0.0.1"},
                ],
            },
            "output": {
                "name": "MSK",
                "roleArn": "arn:aws:iam::111111111111:role/CL-AppPipe-s3-BufferAccessRole-name",
                "roleName": "CL-AppPipe-s3-BufferAccessRole-name",
                "params": [
                    {
                        "paramKey": "mskBrokerServers",
                        "paramValue": "msk-broker1,msk-broker2,msk-broker3",
                    },
                    {"paramKey": "topics", "paramValue": "msk-topic"},
                ],
            },
        }
    )
    return mock_app_log_ingestion4


def test_ingestion():
    from flb.flb_builder import InstanceFlb

    ingestion_list1: List[AppLogIngestion] = [
        get_mock_app_log_ingestion1(),
        get_mock_app_log_ingestion2(),
    ]
    ingestion_list2: List[AppLogIngestion] = [
        get_mock_app_log_ingestion3(),
        get_mock_app_log_ingestion4(),
    ]
    instance_with_ingestion_list = dict()
    instance_with_ingestion_list["instance-1"] = ingestion_list1
    instance_with_ingestion_list["instance-2"] = ingestion_list2

    instance_flb = InstanceFlb()
    instance_flb.build_instance_data_pipelines(instance_with_ingestion_list)
    instance_pipeline_map = instance_flb.get_flb_conf_content("pipeline")
    instance_parser_map = instance_flb.get_flb_conf_content("parser")

    for key in instance_with_ingestion_list.keys():
        instance_pipeline_content = instance_pipeline_map.get(key)
        print(f"***********{key}_pipeline_content**************")
        # print(f"{instance_pipeline_content}")
        instance_parser_content = instance_parser_map.get(key)
        print(f"***********{key}_parser_content**************")
        # print(f"{instance_parser_content}")


def test_k8s_ingestion():
    # testing k8s
    from flb.flb_builder import K8sFlb

    eks_ingestion_list: List[AppLogIngestion] = [
        get_mock_app_log_ingestion1(),
        get_mock_app_log_ingestion2(),
        get_mock_app_log_ingestion3(),
        get_mock_app_log_ingestion4(),
    ]
    for deployment_kind in DeploymentKindEnum.__members__.values():
        eks_source = EksSource(
            **{
                "cri": CRIEnum.CONTAINERD,
                "deploymentKind": deployment_kind.value,
                # "deploymentKind": DeploymentKindEnum.DAEMON_SET,
                "accountId": "keySuffix",
                "aosDomainId": "aosDomainId",
                "k8sVersion": "1.27",
                "eksClusterArn": "eksClusterArn",
                "eksClusterName": "test-eksClusterName",
                "eksClusterSGId": "eksClusterSGId",
                "region": "test_region",
                "endpoint": "test_endpoint",
                "logAgentRoleArn": "arn:aws:iam::111111111111:role/log-agent",
                "oidcIssuer": "oidcIssuer",
                "subnetIds": ["subnet1", "subnet2"],
                "vpcId": "vpcId",
            }
        )
        k8s_flb = K8sFlb(
            eks_source,
            ingestion_list=eks_ingestion_list,
            open_extra_metadata_flag=False,
            sub_account_cwl_monitor_role_arn=os.environ["CWL_MONITOR_ROLE_ARN"],
        )
        flb = k8s_flb.get_flb_image()
        assert "public.ecr.aws/aws-observability/aws-for-fluent-bit" in flb.get(
            "flb_img"
        )

        kubectl = k8s_flb.get_kubectl()
        assert kubectl.get("1.20") == "1.20.15/2022-10-31"

        # k8s_flb.generate_config_map()
        content = k8s_flb.generate_deployment_content()
        if deployment_kind == DeploymentKindEnum.DAEMON_SET:
            print(content)


class TestFluentBitDataPipelineBuilder:
    def test_get_time_format(
        self,
    ):
        from flb.flb_builder import FluentBitDataPipelineBuilder, RegularSpec

        ingestion_list1 = get_mock_app_log_ingestion1()
        flb_builder = FluentBitDataPipelineBuilder(ingestion=ingestion_list1)
        date_time_field = [
            RegularSpec(key="date_time", type="date", format="%b %m %H:%M:%S")
        ]

        time_format = flb_builder.get_time_format(
            time_key=flb_builder._time_key,
            reg_specs=flb_builder._log_config.regexFieldSpecs,
        )
        assert time_format == "%Y-%m-%d %H:%M:%S.%L"

        new_regular_specs = date_time_field + flb_builder._log_config.regexFieldSpecs
        time_format = flb_builder.get_time_format(
            time_key=flb_builder._time_key, reg_specs=new_regular_specs
        )
        assert time_format == "%Y-%m-%d %H:%M:%S.%L"

        new_regular_specs = flb_builder._log_config.regexFieldSpecs + date_time_field
        time_format = flb_builder.get_time_format(
            time_key=flb_builder._time_key, reg_specs=new_regular_specs
        )
        assert time_format == "%Y-%m-%d %H:%M:%S.%L"

        time_format = flb_builder.get_time_format(
            time_key=flb_builder._time_key, reg_specs=[]
        )
        assert time_format == '""'

        not_exist_time_key_regular_specs = [RegularSpec(key="host", type="text")]
        time_format = flb_builder.get_time_format(
            time_key=flb_builder._time_key,
            reg_specs=not_exist_time_key_regular_specs,
        )
        assert time_format == '""'

        not_date_type_time_key_regular_specs = [
            RegularSpec(key="date_time", type="text")
        ]
        time_format = flb_builder.get_time_format(
            time_key="date_time", reg_specs=not_date_type_time_key_regular_specs
        )
        assert time_format == '""'
