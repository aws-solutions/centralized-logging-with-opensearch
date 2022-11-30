# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import pytest
from pytest_mock import mocker
from unittest.mock import patch


import os
import boto3
from moto import mock_sts, mock_ssm


@pytest.fixture
def sts_client():
    with mock_sts():
        boto3.client("sts", region_name=os.environ.get("AWS_REGION"))
        yield


@pytest.fixture
def ssm_client():
    with mock_ssm():
        region = os.environ.get("AWS_REGION")
        ssm = boto3.client("ssm", region_name=region)
        filepath = "./test/datafile/document_content.json"
        with open(filepath) as openFile:
            document_content = openFile.read()
            ssm.create_document(
                Content=document_content,
                Name=os.environ.get("SSM_LOG_CONFIG_DOCUMENT_NAME"),
                DocumentType="Automation",
                DocumentFormat="JSON",
            )


@pytest.fixture
def ddb_connect():
    from ..util.fluentbit_config_helper.ddb_connect import SyslogDDBConnect, PipeObject, PipeInfo
    with patch('util.fluentbit_config_helper.ddb_connect.SyslogDDBConnect') as MockClass:
        instance = MockClass.return_value
        instance.get_pipe_info_list.return_value = [PipeInfo(source_info={'source_id': '2a749676-bf9a-4610-be2e-8e59414ae331', 'account_id': '012345678912', 'region': 'us-west-2', 'protocol_type': 'UDP', 'port': '15000'}, config_info={'config_id': '482a7d61-db33-4cbb-998f-af52f4652d7d', 'time_offset': None, 'regular_expression': '^\\<(?<pri>[0-9]+)\\>(?<time>[^ ]* {1,2}[^ ]* [^ ]*) (?<host>[^ ]*) (?<ident>[a-zA-Z0-9_\\/\\.\\-]*)(?:\\[(?<pid>[0-9]+)\\])?(?:[^\\:]*\\:)? *(?<message>.*)$', 'time_key': 'time', 'time_format': '%b %y %H:%M:%S', 'parser_format': 'regex'}, output_info={
                                                             'app_pipeline_id': '62a37b50-72af-4a7b-9d4b-d859d538a19c', 'buffer_type': 'KDS', 'buffer_region': 'us-west-2', 'buffer_access_role_arn': 'arn:aws:iam::012345678912:role/LogHub-AppPipe-62a37-BufferAccessRoleDF53FD85-4BU06LEOL8JH', 'buffer_access_role_name': 'LogHub-AppPipe-62a37-BufferAccessRoleDF53FD85-4BU06LEOL8JH', 'buffer_resource_arn': 'arn:aws:kinesis:us-west-2:012345678912:stream/LogHub-AppPipe-62a37-KDSBufferStream21B531A6-xhE79t2qh4um', 'buffer_resource_name': 'LogHub-AppPipe-62a37-KDSBufferStream21B531A6-xhE79t2qh4um'})]

        yield instance


class TestSyslogFLBConfigMgr:
    def test_create_ingestion_parser(self, sts_client, ssm_client, ddb_connect):
        from ..util.log_agent_helper_v2 import SyslogFLBConfigMgr
        from ..util.fluentbit_config_helper.ddb_connect import SyslogDDBConnect, PipeObject, PipeInfo

        class MockSyslogDDBConnect(SyslogDDBConnect):
            def get_pipe_info_list(self):
                return [
                    PipeInfo(
                        source_info={
                            'source_id': '2a749676-bf9a-4610-be2e-8e59414ae331',
                            'account_id': '012345678912',
                            'region': 'us-west-2',
                            'protocol_type': 'UDP',
                            'port': '15000'},
                        config_info={'config_id': '482a7d61-db33-4cbb-998f-af52f4652d7d',
                                     'time_offset': None,
                                     'regular_expression': '^\\<(?<pri>[0-9]+)\\>(?<time>[^ ]* {1,2}[^ ]* [^ ]*) (?<host>[^ ]*) (?<ident>[a-zA-Z0-9_\\/\\.\\-]*)(?:\\[(?<pid>[0-9]+)\\])?(?:[^\\:]*\\:)? *(?<message>.*)$',
                                     'time_key': 'time',
                                     'time_format': '%b %y %H:%M:%S',
                                     'parser_format': 'regex'},
                        output_info={'app_pipeline_id': '62a37b50-72af-4a7b-9d4b-d859d538a19c',
                                     'buffer_type': 'KDS',
                                     'buffer_region': 'us-west-2',
                                     'buffer_access_role_arn': 'arn:aws:iam::012345678912:role/LogHub-AppPipe-62a37-BufferAccessRoleDF53FD85-4BU06LEOL8JH',
                                     'buffer_access_role_name': 'LogHub-AppPipe-62a37-BufferAccessRoleDF53FD85-4BU06LEOL8JH',
                                     'buffer_resource_arn': 'arn:aws:kinesis:us-west-2:012345678912:stream/LogHub-AppPipe-62a37-KDSBufferStream21B531A6-xhE79t2qh4um',
                                     'buffer_resource_name': 'LogHub-AppPipe-62a37-KDSBufferStream21B531A6-xhE79t2qh4um'}
                    )
                ]
        ddb_connect = MockSyslogDDBConnect([])
        syslog_flb_config_mgr = SyslogFLBConfigMgr(ddb_connect)

        syslog_flb_config_mgr.generate_agent_config()
        agent_configs = syslog_flb_config_mgr.get_agent_configs()

    def test_syslog_s3_buffer_layer(self, sts_client, ssm_client, ddb_connect):
        from ..util.log_agent_helper_v2 import SyslogFLBConfigMgr
        from ..util.fluentbit_config_helper.ddb_connect import SyslogDDBConnect, PipeObject, PipeInfo

        class MockSyslogDDBConnect(SyslogDDBConnect):
            def __init__(self, log_bucket_prefix, compression_type, filter_config):
                super(MockSyslogDDBConnect, self).__init__([])
                self.log_bucket_prefix = log_bucket_prefix
                self.compression_type = compression_type
                self.filter_config = filter_config

            def get_pipe_info_list(self):
                return [
                    PipeInfo(
                        source_info={
                            'source_id': '2a749676-bf9a-4610-be2e-8e59414ae331',
                            'account_id': '012345678912',
                            'region': 'us-west-2',
                            'protocol_type': 'UDP',
                            'port': '15000'
                        },
                        config_info={
                            'config_id': '482a7d61-db33-4cbb-998f-af52f4652d7d',
                            "processorFilterRegex": self.filter_config,
                            'time_offset': None,
                            'regular_expression': '^\\<(?<pri>[0-9]+)\\>(?<time>[^ ]* {1,2}[^ ]* [^ ]*) (?<host>[^ ]*) (?<ident>[a-zA-Z0-9_\\/\\.\\-]*)(?:\\[(?<pid>[0-9]+)\\])?(?:[^\\:]*\\:)? *(?<message>.*)$',
                            'time_key': 'time',
                            'time_format': '%b %y %H:%M:%S',
                            'parser_format': 'regex'
                        },
                        output_info={
                            'app_pipeline_id': '62a37b50-72af-4a7b-9d4b-d859d538a19c',
                            'buffer_type': 'S3',
                            'compression_type': self.compression_type,
                            'log_bucket_prefix': self.log_bucket_prefix,
                            'buffer_resource_arn': 'bucket-arn',
                            'buffer_resource_name': 'bucket-name',
                            'upload_timeout': '10',
                        },
                    )
                ]
        ddb_connect = MockSyslogDDBConnect(
            compression_type='gzip',
            log_bucket_prefix='AppLogs/s3src/year=%Y/month=%m/day=%d',
            filter_config={
                "enable": True,
                "filters": [
                    {
                        "condition": "Include",
                        "key": "ident",
                        "value": "su"
                    },
                    {
                        "condition": "Exclude",
                        "key": "host",
                        "value": "client_*"
                    }
                ]
            }
        )
        syslog_flb_config_mgr = SyslogFLBConfigMgr(ddb_connect)

        syslog_flb_config_mgr.generate_agent_config()
        agent_configs = syslog_flb_config_mgr.get_agent_configs()

        assert agent_configs['fluent-bit.conf'] == '''\
[SERVICE]
    flush           5
    daemon          off
    log_level       info
    log_File        /tmp/log-agent.log
    http_server     On
    http_listen     0.0.0.0
    http_port       2022
    storage.path    /fluent-bit/flb-storage/
    Parsers_File    /fluent-bit/etc/applog_parsers.conf

[INPUT]
    Name             syslog
    Mode             UDP
    Listen           0.0.0.0
    Port             15000
    Tag              2a749-482a7-62a37
    Parser           parser_2a749-482a7-62a37
    Mem_Buf_Limit    30M

[OUTPUT]
    Name                s3
    use_put_object      On
    json_date_key       time
    json_date_format    iso8601
    Retry_Limit         False
    tls.verify          False
    Match               2a749-482a7-62a37
    bucket              bucket-name
    total_file_size     100M
    upload_timeout      10s
    s3_key_format       /AppLogs/s3src/year=%Y/month=%m/day=%d/%H-%M-%S-$UUID.gz
    compression         gzip

[FILTER]
    Name     grep
    Match    2a749-482a7-62a37
    Regex    ident su

[FILTER]
    Name       grep
    Match      2a749-482a7-62a37
    Exclude    host client_*

'''

        ddb_connect = MockSyslogDDBConnect(
            compression_type='None',
            log_bucket_prefix='AppLogs/s3src/year=%Y/month=%m/day=%d',
            filter_config={
                "enable": True,
                "filters": [
                    {
                        "condition": "Include",
                        "key": "ident",
                        "value": "su"
                    },
                    {
                        "condition": "Exclude",
                        "key": "host",
                        "value": "client_*"
                    }
                ]
            }
        )
        syslog_flb_config_mgr = SyslogFLBConfigMgr(ddb_connect)

        syslog_flb_config_mgr.generate_agent_config()
        agent_configs = syslog_flb_config_mgr.get_agent_configs()

        assert agent_configs['fluent-bit.conf'] == '''\
[SERVICE]
    flush           5
    daemon          off
    log_level       info
    log_File        /tmp/log-agent.log
    http_server     On
    http_listen     0.0.0.0
    http_port       2022
    storage.path    /fluent-bit/flb-storage/
    Parsers_File    /fluent-bit/etc/applog_parsers.conf

[INPUT]
    Name             syslog
    Mode             UDP
    Listen           0.0.0.0
    Port             15000
    Tag              2a749-482a7-62a37
    Parser           parser_2a749-482a7-62a37
    Mem_Buf_Limit    30M

[OUTPUT]
    Name                s3
    use_put_object      On
    json_date_key       time
    json_date_format    iso8601
    Retry_Limit         False
    tls.verify          False
    Match               2a749-482a7-62a37
    bucket              bucket-name
    total_file_size     100M
    upload_timeout      10s
    s3_key_format       /AppLogs/s3src/year=%Y/month=%m/day=%d/%H-%M-%S-$UUID

[FILTER]
    Name     grep
    Match    2a749-482a7-62a37
    Regex    ident su

[FILTER]
    Name       grep
    Match      2a749-482a7-62a37
    Exclude    host client_*

'''

        ddb_connect = MockSyslogDDBConnect(
            compression_type='None',
            log_bucket_prefix='AppLogs/s3src/year=%Y/month=%m/day=%d',
            filter_config={
                "enable": False,
                "filters": [
                    {
                        "condition": "Include",
                        "key": "ident",
                        "value": "su"
                    },
                    {
                        "condition": "Exclude",
                        "key": "host",
                        "value": "client_*"
                    }
                ]
            }
        )
        syslog_flb_config_mgr = SyslogFLBConfigMgr(ddb_connect)

        syslog_flb_config_mgr.generate_agent_config()
        agent_configs = syslog_flb_config_mgr.get_agent_configs()

        assert agent_configs['fluent-bit.conf'] == '''\
[SERVICE]
    flush           5
    daemon          off
    log_level       info
    log_File        /tmp/log-agent.log
    http_server     On
    http_listen     0.0.0.0
    http_port       2022
    storage.path    /fluent-bit/flb-storage/
    Parsers_File    /fluent-bit/etc/applog_parsers.conf

[INPUT]
    Name             syslog
    Mode             UDP
    Listen           0.0.0.0
    Port             15000
    Tag              2a749-482a7-62a37
    Parser           parser_2a749-482a7-62a37
    Mem_Buf_Limit    30M

[OUTPUT]
    Name                s3
    use_put_object      On
    json_date_key       time
    json_date_format    iso8601
    Retry_Limit         False
    tls.verify          False
    Match               2a749-482a7-62a37
    bucket              bucket-name
    total_file_size     100M
    upload_timeout      10s
    s3_key_format       /AppLogs/s3src/year=%Y/month=%m/day=%d/%H-%M-%S-$UUID

'''

        ddb_connect = MockSyslogDDBConnect(
            compression_type='None',
            log_bucket_prefix='AppLogs/s3src/year=%Y/month=%m/day=%d',
            filter_config={
                "enable": False,
                "filters": []
            }
        )
        syslog_flb_config_mgr = SyslogFLBConfigMgr(ddb_connect)

        syslog_flb_config_mgr.generate_agent_config()
        agent_configs = syslog_flb_config_mgr.get_agent_configs()

        assert agent_configs['fluent-bit.conf'] == '''\
[SERVICE]
    flush           5
    daemon          off
    log_level       info
    log_File        /tmp/log-agent.log
    http_server     On
    http_listen     0.0.0.0
    http_port       2022
    storage.path    /fluent-bit/flb-storage/
    Parsers_File    /fluent-bit/etc/applog_parsers.conf

[INPUT]
    Name             syslog
    Mode             UDP
    Listen           0.0.0.0
    Port             15000
    Tag              2a749-482a7-62a37
    Parser           parser_2a749-482a7-62a37
    Mem_Buf_Limit    30M

[OUTPUT]
    Name                s3
    use_put_object      On
    json_date_key       time
    json_date_format    iso8601
    Retry_Limit         False
    tls.verify          False
    Match               2a749-482a7-62a37
    bucket              bucket-name
    total_file_size     100M
    upload_timeout      10s
    s3_key_format       /AppLogs/s3src/year=%Y/month=%m/day=%d/%H-%M-%S-$UUID

'''
