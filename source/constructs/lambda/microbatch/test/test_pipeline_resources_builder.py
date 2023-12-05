# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import os
import sys
import copy
import uuid
import json
import types
import collections
import pytest
from pytest_httpserver import HTTPServer
from test.mock import mock_s3_context, mock_iam_context, mock_ddb_context, mock_glue_context, mock_sqs_context, mock_iam_context, mock_scheduler_context, mock_events_context, mock_sns_context, mock_sts_context, default_environment_variables


sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.append(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'pipeline_resources_builder'))


class TestParameter:
    def test_required_parameter_check(self, mock_s3_context, mock_iam_context, mock_sqs_context, mock_ddb_context):
        from pipeline_resources_builder.lambda_function import Parameters, MetaTable, dataformat
        
        AWS_DDB_META = MetaTable()
        
        waf_pipeline_id = os.environ["WAF_PIPELINE_ID"]
        waf_ingestion_id = os.environ["WAF_INGESTION_ID"]

        create_waf_pipeline_event = {'RequestType': 'Create', 'ResourceProperties': {'Resource': 'pipeline', 'Id': waf_pipeline_id}}
        create_waf_ingestion_event = {'RequestType': 'Create', 'ResourceProperties': {'Resource': 'ingestion', 'Id': waf_ingestion_id}}
        
        for required_param in ('RequestType', 'ResourceProperties',):
            event = copy.deepcopy(create_waf_pipeline_event)
            event.pop(required_param)
            with pytest.raises(Exception) as exception_info:
                Parameters(event)
            assert exception_info.value.args[0] == f'Missing value for {required_param}.'
        
        for required_param in ('Resource', 'Id',):
            event = copy.deepcopy(create_waf_pipeline_event)
            event['ResourceProperties'].pop(required_param)
            with pytest.raises(Exception) as exception_info:
                Parameters(event)
            assert exception_info.value.args[0] == f'Missing value for {required_param}.'
            
        event = copy.deepcopy(create_waf_pipeline_event)
        event['ResourceProperties']['Resource'] = 'do-not-supported-resource'
        with pytest.raises(Exception) as exception_info:
            Parameters(event)
        assert exception_info.value.args[0] == f'Not supported Resource: {event["ResourceProperties"]["Resource"]}, supported: pipeline, ingestion'
        
        event = copy.deepcopy(create_waf_pipeline_event)
        param = Parameters(event)
        
        assert isinstance(param.ddb_client_metadata, MetaTable) is True
        assert param.policy_sid == waf_pipeline_id.replace('-', '')
        assert param.pipeline_id == waf_pipeline_id
        
        event = copy.deepcopy(create_waf_ingestion_event)
        param = Parameters(event)
        
        assert isinstance(param.ddb_client_metadata, MetaTable) is True
        assert param.policy_sid == waf_ingestion_id.replace('-', '')
        assert param.pipeline_id == waf_pipeline_id
        assert param.ingestion_id == waf_ingestion_id
        
        ingestion_id = str(uuid.uuid4())
        create_ingestion_event = {
            'RequestType': 'Create', 
            'ResourceProperties': {
                'Resource': 'ingestion', 
                'Id': ingestion_id,
                'Item': {
                    'metaName': 'f7f11467-bab8-4516-9425-a62b4d7fcfb5',
                    'data': {
                        'role': {
                            'sts': ''
                            },
                        'source': {
                            'bucket': 'logging-bucket',
                            'prefix': '/AWSLogs/WAFLogs'
                            },
                        },
                    'pipelineId': waf_pipeline_id,
                    }
                }
            }
        event = copy.deepcopy(create_ingestion_event)
        Parameters(event)
        
        response = AWS_DDB_META.get(meta_name=ingestion_id)
        assert response['data']['role']['sts'] == ''
        assert response['data']['source']['bucket'] == 'logging-bucket'
        assert response['data']['source']['prefix'] == '/AWSLogs/WAFLogs'
        assert response['pipelineId'] == waf_pipeline_id
        
        ingestion_id = str(uuid.uuid4())
        create_ingestion_event = {
            'RequestType': 'Create', 
            'ResourceProperties': {
                'Resource': 'ingestion', 
                'Id': ingestion_id,
                }
            }
        event = copy.deepcopy(create_ingestion_event)
        param = Parameters(event)
        
        assert param.ingestion_id == ingestion_id
        assert param.pipeline_id == ''
        
        ingestion_id = str(uuid.uuid4())
        create_ingestion_event = {
            'RequestType': 'Create', 
            'ResourceProperties': {
                'Resource': 'ingestion', 
                'Id': ingestion_id,
                'Item': {
                    'metaName': 'f7f11467-bab8-4516-9425-a62b4d7fcfb5',
                    'data': {
                        'role': {
                            'sts': ''
                            },
                        'source': {
                            'bucket': 'logging-bucket',
                            'prefix': '/AWSLogs/WAFLogs'
                            },
                        },
                    }
                }
            }
        event = copy.deepcopy(create_ingestion_event)
        param = Parameters(event)
        
        assert param.ingestion_id == ingestion_id
        assert param.pipeline_id == ''
    
    def test_staging_bucket(self, mock_s3_context, mock_iam_context, mock_sqs_context, mock_ddb_context):
        from pipeline_resources_builder.lambda_function import Parameters, MetaTable
        
        AWS_DDB_META = MetaTable()
        
        waf_pipeline_id = os.environ["WAF_PIPELINE_ID"]
        staging_bucket = os.environ["STAGING_BUCKET_NAME"]
        
        create_waf_pipeline_event = {'RequestType': 'Create', 'ResourceProperties': {'Resource': 'pipeline', 'Id': waf_pipeline_id}}
        
        event = copy.deepcopy(create_waf_pipeline_event)
        param = Parameters(event)
        
        assert param.staging_bucket == staging_bucket
        assert param.staging_bucket == AWS_DDB_META.get(meta_name='StagingBucket')['name']
    
    def test_scheduler_is_available(self, mock_s3_context, mock_iam_context, mock_sqs_context, mock_ddb_context):
        from pipeline_resources_builder.lambda_function import Parameters, MetaTable
        
        AWS_DDB_META = MetaTable()
        
        waf_pipeline_id = os.environ["WAF_PIPELINE_ID"]
        create_waf_pipeline_event = {'RequestType': 'Create', 'ResourceProperties': {'Resource': 'pipeline', 'Id': waf_pipeline_id}}
        
        AWS_DDB_META.put(meta_name='AvailableServices', item={'value': ['scheduler']})
        event = copy.deepcopy(create_waf_pipeline_event)
        param = Parameters(event)
        assert param.scheduler_is_available is True
        
        AWS_DDB_META.put(meta_name='AvailableServices', item={'value': ['events']})
        event = copy.deepcopy(create_waf_pipeline_event)
        param = Parameters(event)
        assert param.scheduler_is_available is False

    def test_get_scheduler_info(self, mock_s3_context, mock_iam_context, mock_sqs_context, mock_ddb_context):
        from pipeline_resources_builder.lambda_function import Parameters, MetaTable
        
        AWS_DDB_META = MetaTable()
        
        waf_pipeline_id = os.environ["WAF_PIPELINE_ID"]

        log_processor_arn = AWS_DDB_META.get(meta_name='LogProcessor')['arn']
        log_processor_execution_role_arn =  AWS_DDB_META.get(meta_name='LogProcessorStartExecutionRole')['arn']
        log_merger_arn = AWS_DDB_META.get(meta_name='LogMerger')['arn']
        log_merger_execution_role_arn =  AWS_DDB_META.get(meta_name='LogMergerStartExecutionRole')['arn']
        log_archive_arn = AWS_DDB_META.get(meta_name='LogArchive')['arn']
        log_archive_execution_role_arn =  AWS_DDB_META.get(meta_name='LogArchiveStartExecutionRole')['arn']
        waf_pipeline_info =AWS_DDB_META.get(meta_name=waf_pipeline_id)
        
        create_waf_pipeline_event = {'RequestType': 'Create', 'ResourceProperties': {'Resource': 'pipeline', 'Id': waf_pipeline_id}}
        
        event = copy.deepcopy(create_waf_pipeline_event)
        param = Parameters(event)
        with pytest.raises(ValueError):
            param._get_scheduler_info(scheduler_type='do-not-supported-scheduler-type')
        
        log_processor = param._get_scheduler_info(schedule=waf_pipeline_info['data']['scheduler']['LogProcessor']['schedule'], scheduler_type='LogProcessor')
        assert log_processor.arn == log_processor_arn
        assert log_processor.execution_role == log_processor_execution_role_arn
        assert log_processor.schedule == waf_pipeline_info['data']['scheduler']['LogProcessor']['schedule']
        assert log_processor.age == waf_pipeline_info['data']['scheduler']['LogProcessor'].get('age', -1)
        
        log_merger = param._get_scheduler_info(schedule=waf_pipeline_info['data']['scheduler']['LogMerger']['schedule'], age=waf_pipeline_info['data']['scheduler']['LogMerger'].get('age'), scheduler_type='LogMerger')
        assert log_merger.arn == log_merger_arn
        assert log_merger.execution_role == log_merger_execution_role_arn
        assert log_merger.schedule == waf_pipeline_info['data']['scheduler']['LogMerger']['schedule']
        assert log_merger.age == waf_pipeline_info['data']['scheduler']['LogMerger'].get('age')
        
        log_archive = param._get_scheduler_info(schedule=waf_pipeline_info['data']['scheduler']['LogArchive']['schedule'], age=waf_pipeline_info['data']['scheduler']['LogArchive'].get('age'), scheduler_type='LogArchive')
        assert log_archive.arn == log_archive_arn
        assert log_archive.execution_role == log_archive_execution_role_arn
        assert log_archive.schedule == waf_pipeline_info['data']['scheduler']['LogArchive']['schedule']
        assert log_archive.age == waf_pipeline_info['data']['scheduler']['LogArchive'].get('age')
    
    def test_get_bucket_object(self, mock_s3_context, mock_iam_context, mock_sqs_context, mock_ddb_context):
        from pipeline_resources_builder.lambda_function import Parameters, MetaTable
        
        AWS_DDB_META = MetaTable()
        
        centralized_bucket_name = os.environ["CENTRALIZED_BUCKET_NAME"]
        waf_pipeline_id = os.environ["WAF_PIPELINE_ID"]
        
        staging_bucket_name = AWS_DDB_META.get(meta_name='StagingBucket')['name']
        
        create_waf_pipeline_event = {'RequestType': 'Create', 'ResourceProperties': {'Resource': 'pipeline', 'Id': waf_pipeline_id}}
        
        event = copy.deepcopy(create_waf_pipeline_event)
        param = Parameters(event)
        
        bucket_object = param._get_bucket_object(bucket=centralized_bucket_name, prefix='///AWS/WAFLogs//')
        
        assert bucket_object.bucket == centralized_bucket_name
        assert bucket_object.prefix == 'AWS/WAFLogs'
        assert bucket_object.arn ==  f"arn:aws:s3:::{centralized_bucket_name}"
        assert bucket_object.uri == f's3://{centralized_bucket_name}/AWS/WAFLogs'
        assert bucket_object.archive_uri == f's3://{staging_bucket_name}/archive/AWS/WAFLogs'
        
        bucket_object = param._get_bucket_object(bucket=centralized_bucket_name, prefix='/')
        
        assert bucket_object.bucket == centralized_bucket_name
        assert bucket_object.prefix == ''
        assert bucket_object.arn ==  f"arn:aws:s3:::{centralized_bucket_name}"
        assert bucket_object.uri == f's3://{centralized_bucket_name}/'
        assert bucket_object.archive_uri == f's3://{staging_bucket_name}/archive/'
        
        bucket_object = param._get_bucket_object(bucket=centralized_bucket_name, prefix='')
        
        assert bucket_object.bucket == centralized_bucket_name
        assert bucket_object.prefix == ''
        assert bucket_object.arn ==  f"arn:aws:s3:::{centralized_bucket_name}"
        assert bucket_object.uri == f's3://{centralized_bucket_name}/'
        assert bucket_object.archive_uri == f's3://{staging_bucket_name}/archive/'

    def test_get_staging_bucket_info(self, mock_s3_context, mock_iam_context, mock_sqs_context, mock_ddb_context):
        from pipeline_resources_builder.lambda_function import Parameters, MetaTable
        
        AWS_DDB_META = MetaTable()
        
        waf_pipeline_id = os.environ["WAF_PIPELINE_ID"]
        
        waf_pipeline_info =AWS_DDB_META.get(meta_name=waf_pipeline_id)
        staging_bucket_name = AWS_DDB_META.get(meta_name='StagingBucket')['name']
        
        create_waf_pipeline_event = {'RequestType': 'Create', 'ResourceProperties': {'Resource': 'pipeline', 'Id': waf_pipeline_id}}
        
        event = copy.deepcopy(create_waf_pipeline_event)
        param = Parameters(event)
        
        staging_bucket_object = param._get_staging_bucket_info()
        
        assert staging_bucket_object.bucket == staging_bucket_name
        assert staging_bucket_object.prefix == ''
        assert staging_bucket_object.arn ==  f"arn:aws:s3:::{staging_bucket_name}"
        assert staging_bucket_object.uri == f"s3://{staging_bucket_name}/"
        assert staging_bucket_object.archive_uri == f"s3://{staging_bucket_name}/archive/"
        
        event = copy.deepcopy(create_waf_pipeline_event)
        param = Parameters(event)
        
        staging_bucket_object = param._get_staging_bucket_info(prefix=waf_pipeline_info['data']['staging']['prefix'])
        
        assert staging_bucket_object.bucket == staging_bucket_name
        assert staging_bucket_object.prefix == waf_pipeline_info['data']['staging']['prefix']
        assert staging_bucket_object.arn ==  f"arn:aws:s3:::{staging_bucket_name}"
        assert staging_bucket_object.uri == f"s3://{staging_bucket_name}/{waf_pipeline_info['data']['staging']['prefix']}"
        assert staging_bucket_object.archive_uri == f"s3://{staging_bucket_name}/archive/{waf_pipeline_info['data']['staging']['prefix']}"

    def test_get_destination_info(self, mock_s3_context, mock_iam_context, mock_sqs_context, mock_ddb_context):
        from pipeline_resources_builder.lambda_function import Parameters, MetaTable
        
        AWS_DDB_META = MetaTable()
        
        waf_pipeline_id = os.environ["WAF_PIPELINE_ID"]
        
        staging_bucket_name = AWS_DDB_META.get(meta_name='StagingBucket')['name']
        waf_pipeline_info =AWS_DDB_META.get(meta_name=waf_pipeline_id)
        
        create_waf_pipeline_event = {'RequestType': 'Create', 'ResourceProperties': {'Resource': 'pipeline', 'Id': waf_pipeline_id}}
        
        event = copy.deepcopy(create_waf_pipeline_event)
        param = Parameters(event)
        
        destination = param._get_destination_info(info=waf_pipeline_info['data']['destination'])
        
        assert destination.location.prefix == waf_pipeline_info['data']['destination']['location']['prefix']
        assert destination.location.arn == f"arn:aws:s3:::{waf_pipeline_info['data']['destination']['location']['bucket']}"
        assert destination.location.uri == f"s3://{waf_pipeline_info['data']['destination']['location']['bucket']}/{waf_pipeline_info['data']['destination']['location']['prefix']}"
        assert destination.location.archive_uri == f"s3://{staging_bucket_name}/archive/{waf_pipeline_info['data']['destination']['location']['prefix']}"
        assert destination.database.name == waf_pipeline_info['data']['destination']['database']['name']
        assert destination.database.location.bucket == waf_pipeline_info['data']['destination']['location']['bucket']
        assert destination.database.location.prefix == f"{waf_pipeline_info['data']['destination']['location']['prefix']}/{waf_pipeline_info['data']['destination']['database']['name']}"
        assert destination.database.location.arn == f"arn:aws:s3:::{waf_pipeline_info['data']['destination']['location']['bucket']}"
        assert destination.database.location.uri == f"s3://{waf_pipeline_info['data']['destination']['location']['bucket']}/{waf_pipeline_info['data']['destination']['location']['prefix']}/{waf_pipeline_info['data']['destination']['database']['name']}"
        assert destination.database.location.archive_uri == f"s3://{staging_bucket_name}/archive/{waf_pipeline_info['data']['destination']['location']['prefix']}/{waf_pipeline_info['data']['destination']['database']['name']}"
        assert destination.table.name == waf_pipeline_info['data']['destination']['table']['name']
        assert destination.table.schema == json.loads(waf_pipeline_info['data']['destination']['table'].get('schema', '{}'))
        assert destination.table.location.bucket == waf_pipeline_info['data']['destination']['location']['bucket']
        assert destination.table.location.prefix == f"{waf_pipeline_info['data']['destination']['location']['prefix']}/{waf_pipeline_info['data']['destination']['database']['name']}/{waf_pipeline_info['data']['destination']['table']['name']}"
        assert destination.table.location.arn == f"arn:aws:s3:::{waf_pipeline_info['data']['destination']['location']['bucket']}"
        assert destination.table.location.uri == f"s3://{waf_pipeline_info['data']['destination']['location']['bucket']}/{waf_pipeline_info['data']['destination']['location']['prefix']}/{waf_pipeline_info['data']['destination']['database']['name']}/{waf_pipeline_info['data']['destination']['table']['name']}"
        assert destination.table.location.archive_uri == f"s3://{staging_bucket_name}/archive/{waf_pipeline_info['data']['destination']['location']['prefix']}/{waf_pipeline_info['data']['destination']['database']['name']}/{waf_pipeline_info['data']['destination']['table']['name']}"
        assert destination.metrics.name == waf_pipeline_info['data']['destination']['metrics']['name'] if waf_pipeline_info['data']['destination']['metrics']['name'] else f"{waf_pipeline_info['data']['destination']['table']['name']}_metrics"
        assert destination.metrics.schema == json.loads(waf_pipeline_info['data']['destination']['metrics'].get('schema', '{}'))
        assert destination.metrics.location.bucket == waf_pipeline_info['data']['destination']['location']['bucket']
        assert destination.metrics.location.prefix == f"{waf_pipeline_info['data']['destination']['location']['prefix']}/{waf_pipeline_info['data']['destination']['database']['name']}/{waf_pipeline_info['data']['destination']['table']['name']}_metrics"
        assert destination.metrics.location.arn == f"arn:aws:s3:::{waf_pipeline_info['data']['destination']['location']['bucket']}"
        assert destination.metrics.location.uri == f"s3://{waf_pipeline_info['data']['destination']['location']['bucket']}/{waf_pipeline_info['data']['destination']['location']['prefix']}/{waf_pipeline_info['data']['destination']['database']['name']}/{waf_pipeline_info['data']['destination']['table']['name']}_metrics"
        assert destination.metrics.location.archive_uri == f"s3://{staging_bucket_name}/archive/{waf_pipeline_info['data']['destination']['location']['prefix']}/{waf_pipeline_info['data']['destination']['database']['name']}/{waf_pipeline_info['data']['destination']['table']['name']}_metrics"
        assert destination.enrichment_plugins == []

        table_schema = {
            'type': 'object',
            'properties': {
                'time': {
                    'type': 'big_int',
                    'expression': '''CAST(to_unixtime(from_iso8601_timestamp("time")) * 1000 AS bigint)''',
                },
                'timestamp': {
                    'type': 'timestamp',
                    'expression': '''from_iso8601_timestamp("time")''',
                },
                'type': {
                    'type': 'string'
                },
                'elb': {
                    'type': 'string',
                    'partition': True
                },
                'client_ip': {
                    'type': 'string'
                },
                'client_port': {
                    'type': 'integer'
                },
                'target_ip': {
                    'type': 'string'
                },
                'target_port': {
                    'type': 'integer'
                },
                'event_hour': {
                    'type': 'string',
                    'partition': True,
                    'expression': '''date_format(from_iso8601_timestamp("time"), '%Y%m%d%H')''',
                },
                '__execution_name__': {
                    'type': 'string',
                    'partition': True,
                    'expression': "'{{}}'"
                }
            }
        }
        
        metrics_schema = {
            'type': 'object',
            'properties': {
                'time': {
                    'type': 'big_int',
                    'expression': '''FLOOR("time" / 60000) * 60000''',
                },
                'timestamp': {
                    'type': 'timestamp',
                    'expression': '''DATE_TRUNC('minute', "timestamp")'''
                },
                'type': {
                    'type': 'string'
                },
                'request_host': {
                    'type': 'string',
                    'expression': '''url_extract_host("request_url")''',
                },
                'requests': {
                    'type': 'big_int',
                    'measure': True,
                    'expression': '''CAST(COUNT(1) AS bigint)''',
                },
                'event_hour': {
                    'type': 'string',
                    'partition': True,
                },
                '__execution_name__': {
                    'type': 'string',
                    'partition': True,
                }
            }
        }
        
        waf_pipeline_info_copy = copy.deepcopy(waf_pipeline_info)
        waf_pipeline_info_copy['data']['destination']['table']['schema'] = json.dumps(table_schema)
        waf_pipeline_info_copy['data']['destination']['metrics']['name'] = 'aws_waf_logs_metrics'
        waf_pipeline_info_copy['data']['destination']['metrics']['schema'] = json.dumps(metrics_schema)
        waf_pipeline_info_copy['data']['destination']['enrichmentPlugins'] = 'geo_ip,user_agent'
        AWS_DDB_META.update(meta_name=waf_pipeline_id, item=waf_pipeline_info_copy)
        
        event = copy.deepcopy(create_waf_pipeline_event)
        param = Parameters(event)
        
        destination = param._get_destination_info(info=waf_pipeline_info_copy['data']['destination'])
        
        assert destination.location.prefix == waf_pipeline_info['data']['destination']['location']['prefix']
        assert destination.location.arn == f"arn:aws:s3:::{waf_pipeline_info['data']['destination']['location']['bucket']}"
        assert destination.location.uri == f"s3://{waf_pipeline_info['data']['destination']['location']['bucket']}/{waf_pipeline_info['data']['destination']['location']['prefix']}"
        assert destination.location.archive_uri == f"s3://{staging_bucket_name}/archive/{waf_pipeline_info['data']['destination']['location']['prefix']}"
        assert destination.database.name == waf_pipeline_info['data']['destination']['database']['name']
        assert destination.database.location.bucket == waf_pipeline_info['data']['destination']['location']['bucket']
        assert destination.database.location.prefix == f"{waf_pipeline_info['data']['destination']['location']['prefix']}/{waf_pipeline_info['data']['destination']['database']['name']}"
        assert destination.database.location.arn == f"arn:aws:s3:::{waf_pipeline_info['data']['destination']['location']['bucket']}"
        assert destination.database.location.uri == f"s3://{waf_pipeline_info['data']['destination']['location']['bucket']}/{waf_pipeline_info['data']['destination']['location']['prefix']}/{waf_pipeline_info['data']['destination']['database']['name']}"
        assert destination.database.location.archive_uri == f"s3://{staging_bucket_name}/archive/{waf_pipeline_info['data']['destination']['location']['prefix']}/{waf_pipeline_info['data']['destination']['database']['name']}"
        assert destination.table.name == waf_pipeline_info['data']['destination']['table']['name']
        assert destination.table.schema == table_schema
        assert destination.table.location.bucket == waf_pipeline_info['data']['destination']['location']['bucket']
        assert destination.table.location.prefix == f"{waf_pipeline_info['data']['destination']['location']['prefix']}/{waf_pipeline_info['data']['destination']['database']['name']}/{waf_pipeline_info['data']['destination']['table']['name']}"
        assert destination.table.location.arn == f"arn:aws:s3:::{waf_pipeline_info['data']['destination']['location']['bucket']}"
        assert destination.table.location.uri == f"s3://{waf_pipeline_info['data']['destination']['location']['bucket']}/{waf_pipeline_info['data']['destination']['location']['prefix']}/{waf_pipeline_info['data']['destination']['database']['name']}/{waf_pipeline_info['data']['destination']['table']['name']}"
        assert destination.table.location.archive_uri == f"s3://{staging_bucket_name}/archive/{waf_pipeline_info['data']['destination']['location']['prefix']}/{waf_pipeline_info['data']['destination']['database']['name']}/{waf_pipeline_info['data']['destination']['table']['name']}"
        assert destination.metrics.name =='aws_waf_logs_metrics'
        assert destination.metrics.schema == metrics_schema
        assert destination.metrics.location.bucket == waf_pipeline_info['data']['destination']['location']['bucket']
        assert destination.metrics.location.prefix == f"{waf_pipeline_info['data']['destination']['location']['prefix']}/{waf_pipeline_info['data']['destination']['database']['name']}/{destination.metrics.name}"
        assert destination.metrics.location.arn == f"arn:aws:s3:::{waf_pipeline_info['data']['destination']['location']['bucket']}"
        assert destination.metrics.location.uri == f"s3://{waf_pipeline_info['data']['destination']['location']['bucket']}/{waf_pipeline_info['data']['destination']['location']['prefix']}/{waf_pipeline_info['data']['destination']['database']['name']}/{destination.metrics.name}"
        assert destination.metrics.location.archive_uri == f"s3://{staging_bucket_name}/archive/{waf_pipeline_info['data']['destination']['location']['prefix']}/{waf_pipeline_info['data']['destination']['database']['name']}/{destination.metrics.name}"
        assert destination.enrichment_plugins == ['geo_ip', 'user_agent']
        
    def test_is_json_string(self, mock_s3_context, mock_iam_context, mock_sqs_context, mock_ddb_context):
        from pipeline_resources_builder.lambda_function import Parameters
        
        waf_pipeline_id = os.environ["WAF_PIPELINE_ID"]
        
        create_waf_pipeline_event = {'RequestType': 'Create', 'ResourceProperties': {'Resource': 'pipeline', 'Id': waf_pipeline_id}}
        
        event = copy.deepcopy(create_waf_pipeline_event)
        param = Parameters(event)
        
        input_string = "{'key': 'value'}"
        assert param._is_json_string(input_string=input_string) is False
        
        input_string = ""
        assert param._is_json_string(input_string=input_string) is False
        
        input_string = "{}"
        assert param._is_json_string(input_string=input_string) is True
        
        input_string = '{"key": "value"}'
        assert param._is_json_string(input_string=input_string) is True
        
    def test_validate_source_table_attribute(self, mock_s3_context, mock_iam_context, mock_sqs_context, mock_ddb_context):
        from pipeline_resources_builder.lambda_function import Parameters, dataformat, MetaTable
        
        AWS_DDB_META = MetaTable()
        
        waf_pipeline_id = os.environ["WAF_PIPELINE_ID"]
        
        tmp_database_name = AWS_DDB_META.get(meta_name='TmpDatabase')['name']
        waf_pipeline_info =AWS_DDB_META.get(meta_name=waf_pipeline_id)
        
        create_waf_pipeline_event = {'RequestType': 'Create', 'ResourceProperties': {'Resource': 'pipeline', 'Id': waf_pipeline_id}}
        
        event = copy.deepcopy(create_waf_pipeline_event)
        param = Parameters(event)
        
        table_info = {}
        for source_type in ('fluent-bit', 's3'):
            result = param._validate_source_table_attribute(source_type=source_type, table_info=table_info)
            assert result is False
        
        table_info = {
            'schema': '',
        }
        for source_type in ('fluent-bit', 's3'):
            result = param._validate_source_table_attribute(source_type=source_type, table_info=table_info)
            assert result is False
        
        table_info = {
            'schema': "{'key': 'value'}",
        }
        for source_type in ('fluent-bit', 's3'):
            result = param._validate_source_table_attribute(source_type=source_type, table_info=table_info)
            assert result is False
        
        table_info = {
            'schema': '{"type": "object", "properties": {"host": {"type": "string"}}}',
        }
        for source_type in ('fluent-bit', 's3'):
            result = param._validate_source_table_attribute(source_type=source_type, table_info=table_info)
            assert result is False
        
        table_info = {
            'schema': '{"type": "object", "properties": {"host": {"type": "string"}}}',
            'dataFormat': '',
        }
        for source_type in ('fluent-bit', 's3'):
            result = param._validate_source_table_attribute(source_type=source_type, table_info=table_info)
            assert result is False
            
        table_info = {
            'schema': '{"type": "object", "properties": {"host": {"type": "string"}}}',
            'dataFormat': 'do-not-supported-format',
        }
        for source_type in ('fluent-bit', 's3'):
            result = param._validate_source_table_attribute(source_type=source_type, table_info=table_info)
            assert result is False
            
        table_info = {
            'schema': '{"type": "object", "properties": {"host": {"type": "string"}}}',
            'dataFormat': 'json',
        }
        for source_type in ('fluent-bit', 's3'):
            result = param._validate_source_table_attribute(source_type=source_type, table_info=table_info)
            assert result is True
        
        table_info = {
            'schema': '{"type": "object", "properties": {"host": {"type": "string"}}}',
            'dataFormat': 'json',
            'tableProperties': '',
        }
        for source_type in ('fluent-bit', 's3'):
            result = param._validate_source_table_attribute(source_type=source_type, table_info=table_info)
            assert result is False
            
        table_info = {
            'schema': '{"type": "object", "properties": {"host": {"type": "string"}}}',
            'dataFormat': 'json',
            'tableProperties': "not a dict",
        }
        for source_type in ('fluent-bit', 's3'):
            result = param._validate_source_table_attribute(source_type=source_type, table_info=table_info)
            assert result is False
            
        table_info = {
            'name': 'application',
            'schema': '{"type": "object", "properties": {"host": {"type": "string"}}}',
            'dataFormat': 'json',
            'tableProperties': "{'skip.header.line.count': '2'}",
        }
        for source_type in ('fluent-bit', 's3'):
            result = param._validate_source_table_attribute(source_type=source_type, table_info=table_info)
            assert result is False
        
        table_info = {
            'schema': '{"type": "object", "properties": {"host": {"type": "string"}}}',
            'dataFormat': 'json',
            'tableProperties': '{"skip.header.line.count": "2"}',
        }
        for source_type in ('fluent-bit', 's3'):
            result = param._validate_source_table_attribute(source_type=source_type, table_info=table_info)
            assert result is True
        
        table_info = {
            'name': 'application',
            'schema': '{"type": "object", "properties": {"host": {"type": "string"}}}',
            'dataFormat': 'json',
            'tableProperties': '{"skip.header.line.count": "2"}',
            'serializationProperties': '',
        }
        for source_type in ('fluent-bit', 's3'):
            result = param._validate_source_table_attribute(source_type=source_type, table_info=table_info)
            assert result is False
        
        table_info = {
            'schema': '{"type": "object", "properties": {"host": {"type": "string"}}}',
            'dataFormat': 'json',
            'tableProperties': '{"skip.header.line.count": "2"}',
            'serializationProperties': 'not a dict',
        }
        for source_type in ('fluent-bit', 's3'):
            result = param._validate_source_table_attribute(source_type=source_type, table_info=table_info)
            assert result is False
            
        table_info = {
            'schema': '{"type": "object", "properties": {"host": {"type": "string"}}}',
            'dataFormat': 'json',
            'tableProperties': '{"skip.header.line.count": "2"}',
            'serializationProperties': "{'input.regex': '([^ ]*) ([^ ]*)'}",
        }
        for source_type in ('fluent-bit', 's3'):
            result = param._validate_source_table_attribute(source_type=source_type, table_info=table_info)
            assert result is False
        
        table_info = {
            'schema': '{"type": "object", "properties": {"host": {"type": "string"}}}',
            'dataFormat': 'regex',
            'tableProperties': '{"skip.header.line.count": "2"}',
            'serializationProperties': '{"input.regex": "([^ ]*) ([^ ]*)"}',
        }
        for source_type in ('fluent-bit', 's3'):
            result = param._validate_source_table_attribute(source_type=source_type, table_info=table_info)
            assert result is True
        
        table_info = {
            'schema': '{"type": "object", "properties": {"host": {"type": "string"}}}',
            'dataFormat': 'regex',
            'tableProperties': '{"skip.header.line.count": "2"}',
            'serializationProperties': '{}',
        }
        for source_type in ('fluent-bit', 's3'):
            result = param._validate_source_table_attribute(source_type=source_type, table_info=table_info)
            assert result is False
                    
    def test_get_pipeline_source_info(self, mock_s3_context, mock_iam_context, mock_sqs_context, mock_ddb_context):
        from pipeline_resources_builder.lambda_function import Parameters, dataformat, MetaTable
        
        AWS_DDB_META = MetaTable()
        
        waf_pipeline_id = os.environ["WAF_PIPELINE_ID"]
        
        tmp_database_name = AWS_DDB_META.get(meta_name='TmpDatabase')['name']
        waf_pipeline_info =AWS_DDB_META.get(meta_name=waf_pipeline_id)
        waf_pipeline_info['data']['source']['table']['name'] = f"{waf_pipeline_info['data']['destination']['table']['name']}{{}}"
        
        create_waf_pipeline_event = {'RequestType': 'Create', 'ResourceProperties': {'Resource': 'pipeline', 'Id': waf_pipeline_id}}
        
        event = copy.deepcopy(create_waf_pipeline_event)
        param = Parameters(event)
        
        # do not supported source type
        with pytest.raises(ValueError):
            param._get_pipeline_source_info(info={
                'type': 'do-not-supported',
                'table': {
                    'name': waf_pipeline_info['data']['destination']['table']['name'],
                    'schema': '{}',
                    'dataFormat': '', 
                    'tableProperties': '{}', 
                    'serializationProperties': '{}',
                    },
                })
        
        source = param._get_pipeline_source_info(info=waf_pipeline_info['data']['source'])
        
        assert source.type == waf_pipeline_info['data']['source']['type'].lower()
        assert source.database.name == tmp_database_name
        assert source.table.name == f"{waf_pipeline_info['data']['destination']['table']['name']}{{}}"
        assert source.table.schema == json.loads(waf_pipeline_info['data']['source']['table'].get('schema', '{}'))
        assert source.table.data_format == dataformat.DATA_FORMAT_MAPPING.get(waf_pipeline_info['data']['source']['table'].get('dataFormat'), '')
        assert source.table.table_properties == json.loads(waf_pipeline_info['data']['source']['table'].get('tableProperties', '{}'))
        assert source.table.serialization_properties == json.loads(waf_pipeline_info['data']['source']['table'].get('serializationProperties', ''))

        for source_type in ('fluent-bit', 's3'):
            source_info = {
                'type': source_type,
                'table': {
                    'name': waf_pipeline_info['data']['destination']['table']['name'],
                    'schema': '{}',
                    'dataFormat': '', 
                    'tableProperties': '{}', 
                    'serializationProperties': '{}',
                    },
                }
            with pytest.raises(Exception) as exception_info:
                param._get_pipeline_source_info(info=source_info)
            assert exception_info.value.args[0] == 'The source table is missing required definition. Please check the configuration of the source table information.'

        raw_schema = {
            'type': 'object',
            'properties': {
                'timestamp': {
                    'type': 'timestamp',
                    'timeKey': True,
                    'format': '%Y-%m-%d %H:%M:%S',
                },
                'type': {
                    'type': 'string'
                },
                'elb': {
                    'type': 'string',
                    'partition': True
                },
                'client_ip': {
                    'type': 'string'
                },
                'client_port': {
                    'type': 'integer'
                },
                'target_ip': {
                    'type': 'string'
                },
                'target_port': {
                    'type': 'integer'
                },
            }
        }

        for source_type in ('fluent-bit', 's3'):
            source_info = {
                'type': source_type,
                'table': {
                    'name': 'test{}',
                    'schema': json.dumps(raw_schema),
                    'dataFormat': 'regex', 
                    'tableProperties': '{"skip.header.line.count": "2"}', 
                    'serializationProperties': '{"input.regex": "([^ ]*) ([^ ]*)"}',
                    },
                }
            source = param._get_pipeline_source_info(info=source_info)
        
            assert source.type == source_type.lower()
            assert source.database.name == tmp_database_name
            assert source.table.name == 'test{}'
            assert source.table.schema == raw_schema
            assert source.table.data_format == dataformat.Regex
            assert source.table.table_properties == {"skip.header.line.count": "2"}
            assert source.table.serialization_properties == {"input.regex": "([^ ]*) ([^ ]*)"}
        
    def test_get_pipeline_grafana_info(self, mock_s3_context, mock_iam_context, mock_sqs_context, mock_ddb_context):
        from pipeline_resources_builder.lambda_function import Parameters, MetaTable
        
        AWS_DDB_META = MetaTable()
        
        waf_pipeline_id = os.environ["WAF_PIPELINE_ID"]
        account_id = os.environ["ACCOUNT_ID"]
        aws_region = os.environ['AWS_REGION']
        centralized_catalog = os.environ["CENTRALIZED_CATALOG"]
        centralized_database = os.environ["CENTRALIZED_DATABASE"]
        athena_work_group = os.environ["ATHENA_WORK_GROUP"]
        athena_output_location = os.environ["ATHENA_OUTPUT_LOCATION"]
        athena_public_access_role = os.environ["ATHENA_PUBLIC_ACCESS_ROLE"]
        
        create_waf_pipeline_event = {'RequestType': 'Create', 'ResourceProperties': {'Resource': 'pipeline', 'Id': waf_pipeline_id}}
        
        waf_pipeline_info = AWS_DDB_META.get(meta_name=waf_pipeline_id)
        
        event = copy.deepcopy(create_waf_pipeline_event)
        param = Parameters(event)
        
        grafana = param._get_pipeline_grafana_info(info=waf_pipeline_info['data']['grafana'])
        
        assert grafana.import_dashboards == False
        assert grafana.url == ''
        assert grafana.token == ''
        assert grafana.datasource.account_id == account_id
        assert grafana.datasource.region == aws_region
        assert grafana.datasource.catalog == centralized_catalog
        assert grafana.datasource.database == centralized_database
        assert grafana.datasource.work_group == athena_work_group
        assert grafana.datasource.output_location == athena_output_location
        assert grafana.datasource.assume_role_arn == athena_public_access_role
        
        with pytest.raises(ValueError):
             param._get_pipeline_grafana_info(info={
                 'importDashboards': 'true',
                 'url': '',
                 'token': '',
                 })
        
        with pytest.raises(ValueError):
             param._get_pipeline_grafana_info(info={
                 'importDashboards': 'true',
                 'url': '',
                 'token': 'glsa_123456789012',
                 })
        
        with pytest.raises(ValueError):
             param._get_pipeline_grafana_info(info={
                 'importDashboards': 'true',
                 'url': 'http://locahost:3000',
                 'token': '',
                 })
        
        grafana = param._get_pipeline_grafana_info(info={
            'importDashboards': 'true',
            'url': 'http://locahost:3000',
            'token': 'glsa_123456789012',
            })
        
        assert grafana.import_dashboards is True
        assert grafana.url == 'http://locahost:3000'
        assert grafana.token == 'glsa_123456789012'
        assert grafana.datasource.account_id == account_id
        assert grafana.datasource.region == aws_region
        assert grafana.datasource.catalog == centralized_catalog
        assert grafana.datasource.database == centralized_database
        assert grafana.datasource.work_group == athena_work_group
        assert grafana.datasource.output_location == athena_output_location
        assert grafana.datasource.assume_role_arn == athena_public_access_role
        
        grafana = param._get_pipeline_grafana_info(info={
            'importDashboards': 'test',
            'url': '',
            'token': '',
        })
        
        assert grafana.import_dashboards == False
        assert grafana.url == ''
        assert grafana.token == ''
        assert grafana.datasource.account_id == account_id
        assert grafana.datasource.region == aws_region
        assert grafana.datasource.catalog == centralized_catalog
        assert grafana.datasource.database == centralized_database
        assert grafana.datasource.work_group == athena_work_group
        assert grafana.datasource.output_location == athena_output_location
        assert grafana.datasource.assume_role_arn == athena_public_access_role
    
    def test_get_pipeline_notification_info(self, mock_s3_context, mock_iam_context, mock_sqs_context, mock_ddb_context, mock_sns_context):
        from pipeline_resources_builder.lambda_function import Parameters, dataformat, MetaTable
        
        AWS_DDB_META = MetaTable()
        
        waf_pipeline_id = os.environ["WAF_PIPELINE_ID"]
        receive_states_failed_topic_arn = os.environ['RECEIVE_STATES_FAILED_TOPIC_ARN']
        
        create_waf_pipeline_event = {'RequestType': 'Create', 'ResourceProperties': {'Resource': 'pipeline', 'Id': waf_pipeline_id}}

        event = copy.deepcopy(create_waf_pipeline_event)
        param = Parameters(event)
        
        notification = param._get_pipeline_notification_info(info={'service': 'sns', 'recipients': receive_states_failed_topic_arn})
        assert notification.service == 'SNS'
        assert notification.recipients == receive_states_failed_topic_arn
        
        notification = param._get_pipeline_notification_info(info={'service': 'sns'})
        assert notification.service == 'SNS'
        assert notification.recipients == ''
        
        notification = param._get_pipeline_notification_info(info={'service': 'ses', 'recipients': 'alejandro_rosalez@example.com,alejandro_rosalez@example.org'})
        assert notification.service == 'SES'
        assert notification.recipients == ['alejandro_rosalez@example.com', 'alejandro_rosalez@example.org']
        
        notification = param._get_pipeline_notification_info(info={'service': 'ses'})
        assert notification.service == 'SES'
        assert notification.recipients == []
    
    def test_pipeline_info(self, mock_s3_context, mock_iam_context, mock_sqs_context, mock_ddb_context):
        from pipeline_resources_builder.lambda_function import Parameters, dataformat, MetaTable
        
        AWS_DDB_META = MetaTable()
        
        account_id = os.environ["ACCOUNT_ID"]
        aws_region = os.environ['AWS_REGION']
        waf_pipeline_id = os.environ["WAF_PIPELINE_ID"]
        waf_ingestion_id = os.environ["WAF_INGESTION_ID"]
        
        tmp_database_name = AWS_DDB_META.get(meta_name='TmpDatabase')['name']
        staging_bucket_arn = AWS_DDB_META.get(meta_name='StagingBucket')['arn']
        staging_bucket_name = AWS_DDB_META.get(meta_name='StagingBucket')['name']
        s3_public_access_arn = AWS_DDB_META.get(meta_name='S3PublicAccessPolicy')['arn']
        log_processor_arn = AWS_DDB_META.get(meta_name='LogProcessor')['arn']
        log_processor_execution_role_arn =  AWS_DDB_META.get(meta_name='LogProcessorStartExecutionRole')['arn']
        log_merger_arn = AWS_DDB_META.get(meta_name='LogMerger')['arn']
        log_merger_execution_role_arn =  AWS_DDB_META.get(meta_name='LogMergerStartExecutionRole')['arn']
        log_archive_arn = AWS_DDB_META.get(meta_name='LogArchive')['arn']
        log_archive_execution_role_arn =  AWS_DDB_META.get(meta_name='LogArchiveStartExecutionRole')['arn']
        waf_pipeline_info =AWS_DDB_META.get(meta_name=waf_pipeline_id)
        waf_ingestion_info =AWS_DDB_META.get(meta_name=waf_ingestion_id)

        centralized_catalog = os.environ["CENTRALIZED_CATALOG"]
        centralized_database = os.environ["CENTRALIZED_DATABASE"]
        athena_work_group = os.environ["ATHENA_WORK_GROUP"]
        athena_output_location = os.environ["ATHENA_OUTPUT_LOCATION"]
        athena_public_access_role = os.environ["ATHENA_PUBLIC_ACCESS_ROLE"]
        
        create_waf_pipeline_event = {'RequestType': 'Create', 'ResourceProperties': {'Resource': 'pipeline', 'Id': waf_pipeline_id}}

        event = copy.deepcopy(create_waf_pipeline_event)
        param = Parameters(event)
        
        assert param.pipeline_info.role.s3_public_access == s3_public_access_arn
        assert param.pipeline_info.role.replicate == waf_pipeline_info['stack']['role']['replicate']
        assert param.pipeline_info.scheduler.service == 'scheduler'
        assert param.pipeline_info.scheduler.log_processor.arn == log_processor_arn
        assert param.pipeline_info.scheduler.log_processor.execution_role == log_processor_execution_role_arn
        assert param.pipeline_info.scheduler.log_processor.schedule == waf_pipeline_info['data']['scheduler']['LogProcessor']['schedule']
        assert param.pipeline_info.scheduler.log_processor.age == waf_pipeline_info['data']['scheduler']['LogProcessor'].get('age', -1)
        assert param.pipeline_info.scheduler.log_merger.arn == log_merger_arn
        assert param.pipeline_info.scheduler.log_merger.execution_role == log_merger_execution_role_arn
        assert param.pipeline_info.scheduler.log_merger.schedule == waf_pipeline_info['data']['scheduler']['LogMerger']['schedule']
        assert param.pipeline_info.scheduler.log_merger.age == waf_pipeline_info['data']['scheduler']['LogMerger'].get('age')
        assert param.pipeline_info.scheduler.log_archive.arn == log_archive_arn
        assert param.pipeline_info.scheduler.log_archive.execution_role == log_archive_execution_role_arn
        assert param.pipeline_info.scheduler.log_archive.schedule == waf_pipeline_info['data']['scheduler']['LogArchive']['schedule']
        assert param.pipeline_info.scheduler.log_archive.age == waf_pipeline_info['data']['scheduler']['LogArchive'].get('age')
        assert param.pipeline_info.staging.bucket == staging_bucket_name
        assert param.pipeline_info.staging.prefix == waf_pipeline_info['data']['staging']['prefix']
        assert param.pipeline_info.staging.arn == staging_bucket_arn
        assert param.pipeline_info.staging.uri == f"s3://{staging_bucket_name}/{waf_pipeline_info['data']['staging']['prefix']}"
        assert param.pipeline_info.staging.archive_uri == f"s3://{staging_bucket_name}/archive/{waf_pipeline_info['data']['staging']['prefix']}"
        assert param.pipeline_info.notification.service == 'SES'
        assert param.pipeline_info.notification.recipients == waf_pipeline_info['data']['notification']['recipients'].split(',')
        assert param.pipeline_info.source.type == waf_pipeline_info['data']['source']['type'].lower()
        assert param.pipeline_info.source.database.name == tmp_database_name
        assert param.pipeline_info.source.table.name == f"{waf_pipeline_info['data']['destination']['table']['name']}{{}}"
        assert param.pipeline_info.source.table.schema == json.loads(waf_pipeline_info['data']['source']['table'].get('schema', '{}'))
        assert param.pipeline_info.source.table.data_format == dataformat.DATA_FORMAT_MAPPING.get(waf_pipeline_info['data']['source']['table'].get('dataFormat'), '')
        assert param.pipeline_info.source.table.table_properties == json.loads(waf_pipeline_info['data']['source']['table'].get('tableProperties', '{}'))
        assert param.pipeline_info.source.table.serialization_properties == json.loads(waf_pipeline_info['data']['source']['table'].get('serializationProperties', ''))
        assert param.pipeline_info.destination.location.bucket == waf_pipeline_info['data']['destination']['location']['bucket']
        assert param.pipeline_info.destination.location.prefix == waf_pipeline_info['data']['destination']['location']['prefix']
        assert param.pipeline_info.destination.location.arn == f"arn:aws:s3:::{waf_pipeline_info['data']['destination']['location']['bucket']}"
        assert param.pipeline_info.destination.location.uri == f"s3://{waf_pipeline_info['data']['destination']['location']['bucket']}/{waf_pipeline_info['data']['destination']['location']['prefix']}"
        assert param.pipeline_info.destination.location.archive_uri == f"s3://{staging_bucket_name}/archive/{waf_pipeline_info['data']['destination']['location']['prefix']}"
        assert param.pipeline_info.destination.database.name == waf_pipeline_info['data']['destination']['database']['name']
        assert param.pipeline_info.destination.database.location.bucket == waf_pipeline_info['data']['destination']['location']['bucket']
        assert param.pipeline_info.destination.database.location.prefix == f"{waf_pipeline_info['data']['destination']['location']['prefix']}/{waf_pipeline_info['data']['destination']['database']['name']}"
        assert param.pipeline_info.destination.database.location.arn == f"arn:aws:s3:::{waf_pipeline_info['data']['destination']['location']['bucket']}"
        assert param.pipeline_info.destination.database.location.uri == f"s3://{waf_pipeline_info['data']['destination']['location']['bucket']}/{waf_pipeline_info['data']['destination']['location']['prefix']}/{waf_pipeline_info['data']['destination']['database']['name']}"
        assert param.pipeline_info.destination.database.location.archive_uri == f"s3://{staging_bucket_name}/archive/{waf_pipeline_info['data']['destination']['location']['prefix']}/{waf_pipeline_info['data']['destination']['database']['name']}"
        assert param.pipeline_info.destination.table.name == waf_pipeline_info['data']['destination']['table']['name']
        assert param.pipeline_info.destination.table.schema == json.loads(waf_pipeline_info['data']['destination']['table'].get('schema', '{}'))
        assert param.pipeline_info.destination.table.location.bucket == waf_pipeline_info['data']['destination']['location']['bucket']
        assert param.pipeline_info.destination.table.location.prefix == f"{waf_pipeline_info['data']['destination']['location']['prefix']}/{waf_pipeline_info['data']['destination']['database']['name']}/{waf_pipeline_info['data']['destination']['table']['name']}"
        assert param.pipeline_info.destination.table.location.arn == f"arn:aws:s3:::{waf_pipeline_info['data']['destination']['location']['bucket']}"
        assert param.pipeline_info.destination.table.location.uri == f"s3://{waf_pipeline_info['data']['destination']['location']['bucket']}/{waf_pipeline_info['data']['destination']['location']['prefix']}/{waf_pipeline_info['data']['destination']['database']['name']}/{waf_pipeline_info['data']['destination']['table']['name']}"
        assert param.pipeline_info.destination.table.location.archive_uri == f"s3://{staging_bucket_name}/archive/{waf_pipeline_info['data']['destination']['location']['prefix']}/{waf_pipeline_info['data']['destination']['database']['name']}/{waf_pipeline_info['data']['destination']['table']['name']}"
        assert param.pipeline_info.destination.metrics.name == waf_pipeline_info['data']['destination']['metrics']['name'] if waf_pipeline_info['data']['destination']['metrics']['name'] else f"{waf_pipeline_info['data']['destination']['table']['name']}_metrics"
        assert param.pipeline_info.destination.metrics.schema == json.loads(waf_pipeline_info['data']['destination']['metrics'].get('schema', '{}'))
        assert param.pipeline_info.destination.metrics.location.bucket == waf_pipeline_info['data']['destination']['location']['bucket']
        assert param.pipeline_info.destination.metrics.location.prefix == f"{waf_pipeline_info['data']['destination']['location']['prefix']}/{waf_pipeline_info['data']['destination']['database']['name']}/{param.pipeline_info.destination.metrics.name}"
        assert param.pipeline_info.destination.metrics.location.arn == f"arn:aws:s3:::{waf_pipeline_info['data']['destination']['location']['bucket']}"
        assert param.pipeline_info.destination.metrics.location.uri == f"s3://{waf_pipeline_info['data']['destination']['location']['bucket']}/{waf_pipeline_info['data']['destination']['location']['prefix']}/{waf_pipeline_info['data']['destination']['database']['name']}/{param.pipeline_info.destination.metrics.name}"
        assert param.pipeline_info.destination.metrics.location.archive_uri == f"s3://{staging_bucket_name}/archive/{waf_pipeline_info['data']['destination']['location']['prefix']}/{waf_pipeline_info['data']['destination']['database']['name']}/{param.pipeline_info.destination.metrics.name}"
        assert param.pipeline_info.grafana.import_dashboards == False
        assert param.pipeline_info.grafana.url == ''
        assert param.pipeline_info.grafana.token == ''
        assert param.pipeline_info.grafana.datasource.account_id == account_id
        assert param.pipeline_info.grafana.datasource.region == aws_region
        assert param.pipeline_info.grafana.datasource.catalog == centralized_catalog
        assert param.pipeline_info.grafana.datasource.database == centralized_database
        assert param.pipeline_info.grafana.datasource.work_group == athena_work_group
        assert param.pipeline_info.grafana.datasource.output_location == athena_output_location
        assert param.pipeline_info.grafana.datasource.assume_role_arn == athena_public_access_role
        assert param.pipeline_info.queue.log_event_queue == waf_pipeline_info['stack']['queue']['logEventQueue']
        assert param.pipeline_info.queue.log_event_dlq == waf_pipeline_info['stack']['queue']['logEventDLQ']
        waf_pipeline_info_copy = copy.deepcopy(waf_pipeline_info)
        waf_pipeline_info_copy['data']['source']['table']['name'] = f"{waf_pipeline_info['data']['destination']['table']['name']}{{}}"
        assert param.pipeline_info.data == waf_pipeline_info_copy
        
        AWS_DDB_META.put(meta_name='AvailableServices', item={'value': ['events']})
        create_waf_pipeline_event = {'RequestType': 'Create', 'ResourceProperties': {'Resource': 'pipeline', 'Id': waf_pipeline_id}}
        event = copy.deepcopy(create_waf_pipeline_event)
        param = Parameters(event)
        
        assert param.pipeline_info.scheduler.service == 'events'
    
    def test_ingestion_info(self, mock_s3_context, mock_iam_context, mock_sqs_context, mock_ddb_context):
        from pipeline_resources_builder.lambda_function import Parameters, dataformat, MetaTable
        
        AWS_DDB_META = MetaTable()
        
        waf_pipeline_id = os.environ["WAF_PIPELINE_ID"]
        waf_ingestion_id = os.environ["WAF_INGESTION_ID"]
        
        tmp_database_name = AWS_DDB_META.get(meta_name='TmpDatabase')['name']
        staging_bucket_arn = AWS_DDB_META.get(meta_name='StagingBucket')['arn']
        staging_bucket_name = AWS_DDB_META.get(meta_name='StagingBucket')['name']
        waf_pipeline_info =AWS_DDB_META.get(meta_name=waf_pipeline_id)
        waf_ingestion_info =AWS_DDB_META.get(meta_name=waf_ingestion_id)

        create_waf_ingestion_event = {'RequestType': 'Create', 'ResourceProperties': {'Resource': 'ingestion', 'Id': waf_ingestion_id}}
        
        event = copy.deepcopy(create_waf_ingestion_event)
        param = Parameters(event)
        
        assert param.pipeline_info.source.type == waf_pipeline_info['data']['source']['type'].lower()
        assert param.pipeline_info.source.database.name == tmp_database_name
        assert param.pipeline_info.source.table.name == f"{waf_pipeline_info['data']['destination']['table']['name']}{{}}"
        assert param.pipeline_info.source.table.schema == json.loads(waf_pipeline_info['data']['source']['table'].get('schema', '{}'))
        assert param.pipeline_info.source.table.data_format == dataformat.DATA_FORMAT_MAPPING.get(waf_pipeline_info['data']['source']['table'].get('dataFormat'), '')
        assert param.pipeline_info.source.table.table_properties == json.loads(waf_pipeline_info['data']['source']['table'].get('tableProperties', '{}'))
        assert param.pipeline_info.source.table.serialization_properties == json.loads(waf_pipeline_info['data']['source']['table'].get('serializationProperties', ''))
        assert param.pipeline_info.destination.location.bucket == waf_pipeline_info['data']['destination']['location']['bucket']
        assert param.pipeline_info.destination.location.prefix == waf_pipeline_info['data']['destination']['location']['prefix']
        assert param.pipeline_info.destination.location.arn == f"arn:aws:s3:::{waf_pipeline_info['data']['destination']['location']['bucket']}"
        assert param.pipeline_info.destination.location.uri == f"s3://{waf_pipeline_info['data']['destination']['location']['bucket']}/{waf_pipeline_info['data']['destination']['location']['prefix']}"
        assert param.pipeline_info.destination.location.archive_uri == f"s3://{staging_bucket_name}/archive/{waf_pipeline_info['data']['destination']['location']['prefix']}"
        assert param.pipeline_info.destination.database.name == waf_pipeline_info['data']['destination']['database']['name']
        assert param.pipeline_info.destination.database.location.bucket == waf_pipeline_info['data']['destination']['location']['bucket']
        assert param.pipeline_info.destination.database.location.prefix == f"{waf_pipeline_info['data']['destination']['location']['prefix']}/{waf_pipeline_info['data']['destination']['database']['name']}"
        assert param.pipeline_info.destination.database.location.arn == f"arn:aws:s3:::{waf_pipeline_info['data']['destination']['location']['bucket']}"
        assert param.pipeline_info.destination.database.location.uri == f"s3://{waf_pipeline_info['data']['destination']['location']['bucket']}/{waf_pipeline_info['data']['destination']['location']['prefix']}/{waf_pipeline_info['data']['destination']['database']['name']}"
        assert param.pipeline_info.destination.database.location.archive_uri == f"s3://{staging_bucket_name}/archive/{waf_pipeline_info['data']['destination']['location']['prefix']}/{waf_pipeline_info['data']['destination']['database']['name']}"
        assert param.pipeline_info.destination.table.name == waf_pipeline_info['data']['destination']['table']['name']
        assert param.pipeline_info.destination.table.schema == json.loads(waf_pipeline_info['data']['destination']['table'].get('schema', '{}'))
        assert param.pipeline_info.destination.table.location.bucket == waf_pipeline_info['data']['destination']['location']['bucket']
        assert param.pipeline_info.destination.table.location.prefix == f"{waf_pipeline_info['data']['destination']['location']['prefix']}/{waf_pipeline_info['data']['destination']['database']['name']}/{waf_pipeline_info['data']['destination']['table']['name']}"
        assert param.pipeline_info.destination.table.location.arn == f"arn:aws:s3:::{waf_pipeline_info['data']['destination']['location']['bucket']}"
        assert param.pipeline_info.destination.table.location.uri == f"s3://{waf_pipeline_info['data']['destination']['location']['bucket']}/{waf_pipeline_info['data']['destination']['location']['prefix']}/{waf_pipeline_info['data']['destination']['database']['name']}/{waf_pipeline_info['data']['destination']['table']['name']}"
        assert param.pipeline_info.destination.table.location.archive_uri == f"s3://{staging_bucket_name}/archive/{waf_pipeline_info['data']['destination']['location']['prefix']}/{waf_pipeline_info['data']['destination']['database']['name']}/{waf_pipeline_info['data']['destination']['table']['name']}"
        assert param.pipeline_info.destination.metrics.name == waf_pipeline_info['data']['destination']['metrics']['name'] if waf_pipeline_info['data']['destination']['metrics']['name'] else f"{waf_pipeline_info['data']['destination']['table']['name']}_metrics"
        assert param.pipeline_info.destination.metrics.schema == json.loads(waf_pipeline_info['data']['destination']['metrics'].get('schema', '{}'))
        assert param.pipeline_info.destination.metrics.location.bucket == waf_pipeline_info['data']['destination']['location']['bucket']
        assert param.pipeline_info.destination.metrics.location.prefix == f"{waf_pipeline_info['data']['destination']['location']['prefix']}/{waf_pipeline_info['data']['destination']['database']['name']}/{param.pipeline_info.destination.metrics.name}"
        assert param.pipeline_info.destination.metrics.location.arn == f"arn:aws:s3:::{waf_pipeline_info['data']['destination']['location']['bucket']}"
        assert param.pipeline_info.destination.metrics.location.uri == f"s3://{waf_pipeline_info['data']['destination']['location']['bucket']}/{waf_pipeline_info['data']['destination']['location']['prefix']}/{waf_pipeline_info['data']['destination']['database']['name']}/{param.pipeline_info.destination.metrics.name}"
        assert param.pipeline_info.destination.metrics.location.archive_uri == f"s3://{staging_bucket_name}/archive/{waf_pipeline_info['data']['destination']['location']['prefix']}/{waf_pipeline_info['data']['destination']['database']['name']}/{param.pipeline_info.destination.metrics.name}"
        assert param.pipeline_info.staging.bucket == staging_bucket_name
        assert param.pipeline_info.staging.prefix == waf_pipeline_info['data']['staging']['prefix']
        assert param.pipeline_info.staging.arn == staging_bucket_arn
        assert param.pipeline_info.staging.uri == f"s3://{staging_bucket_name}/{waf_pipeline_info['data']['staging']['prefix']}"
        assert param.pipeline_info.staging.archive_uri == f"s3://{staging_bucket_name}/archive/{waf_pipeline_info['data']['staging']['prefix']}"
        assert param.pipeline_info.role.replicate == waf_pipeline_info['stack']['role']['replicate']
        assert param.pipeline_info.queue.log_event_queue == waf_pipeline_info['stack']['queue']['logEventQueue']
        assert param.pipeline_info.queue.log_event_dlq == waf_pipeline_info['stack']['queue']['logEventDLQ']
        waf_pipeline_info_copy = copy.deepcopy(waf_pipeline_info)
        waf_pipeline_info_copy['data']['source']['table']['name'] = f"{waf_pipeline_info['data']['destination']['table']['name']}{{}}"
        assert param.pipeline_info.data == waf_pipeline_info_copy
        
        assert param.ingestion_info.source.location.bucket == waf_ingestion_info['data']['source']['bucket']
        assert param.ingestion_info.source.location.prefix == os.path.normpath(waf_ingestion_info['data']['source']['prefix'])
        assert param.ingestion_info.source.location.arn == f"arn:aws:s3:::{waf_ingestion_info['data']['source']['bucket']}"
        assert param.ingestion_info.source.location.uri == f"s3://{waf_ingestion_info['data']['source']['bucket']}/{os.path.normpath(waf_ingestion_info['data']['source']['prefix'])}"
        assert param.ingestion_info.source.location.archive_uri == f"s3://{staging_bucket_name}/archive/{os.path.normpath(waf_ingestion_info['data']['source']['prefix'])}"
        assert param.ingestion_info.role.sts == waf_ingestion_info['data']['role']['sts']
        assert param.ingestion_info.data == waf_ingestion_info
        
        ingestion_id = str(uuid.uuid4())
        ingestion_info = copy.deepcopy(waf_ingestion_info)
        ingestion_info['data']['source']['prefix'] = ''
        AWS_DDB_META.put(meta_name=ingestion_id, item=ingestion_info)

        create_ingestion_event = {'RequestType': 'Create', 'ResourceProperties': {'Resource': 'ingestion', 'Id': ingestion_id}}
        
        event = copy.deepcopy(create_ingestion_event)
        param = Parameters(event)
       
        assert param.ingestion_info.source.location.bucket == ingestion_info['data']['source']['bucket']
        assert param.ingestion_info.source.location.prefix == ''
        assert param.ingestion_info.source.location.arn == f"arn:aws:s3:::{ingestion_info['data']['source']['bucket']}"
        assert param.ingestion_info.source.location.uri == f"s3://{ingestion_info['data']['source']['bucket']}/"
        assert param.ingestion_info.source.location.archive_uri == f"s3://{staging_bucket_name}/archive/"
        assert param.ingestion_info.role.sts == ingestion_info['data']['role']['sts']
        assert param.ingestion_info.data == ingestion_info


class TestTableMetaDataGenerator:
    def test_add_fluent_bit_agent_info(self,):
        from pipeline_resources_builder.lambda_function import TableMetaDataGenerator
        
        source = types.SimpleNamespace()
        destination = types.SimpleNamespace()
        
        table_metadata_generator = TableMetaDataGenerator(source=source, destination=destination)
        
        schema = {'type': 'object', 'properties': collections.OrderedDict()}
        schema['properties']['time'] = {'type': 'timestamp', 'timeKey': True, 'format': '%Y-%m-%dT%H:%M:%SZ'}
        schema['properties']['host'] = {'type': 'string'}
        new_schema = table_metadata_generator.add_fluent_bit_agent_info(schema=schema)
        assert schema == {'type': 'object', 'properties': collections.OrderedDict([('time', {'type': 'timestamp', 'timeKey': True, 'format': '%Y-%m-%dT%H:%M:%SZ'}), ('host', {'type': 'string'})])}
        assert new_schema == {'type': 'object', 'properties': collections.OrderedDict([('time', {'type': 'timestamp', 'timeKey': True, 'format': '%Y-%m-%dT%H:%M:%SZ'}), ('host', {'type': 'string'}), ('file_name', {'type': 'string'}), ('az', {'type': 'string'}), ('ec2_instance_id', {'type': 'string'}), ('private_ip', {'type': 'string'}), ('hostname', {'type': 'string'}), ('cluster', {'type': 'string'}), ('kubernetes', {'type': 'object', 'properties': {'pod_name': {'type': 'string'}, 'namespace_name': {'type': 'string'}, 'container_name': {'type': 'string'}, 'docker_id': {'type': 'string'}}})])}
        
        schema = {'type': 'object', 'properties': collections.OrderedDict()}
        schema['properties']['time'] = {'type': 'timestamp', 'timeKey': True, 'format': '%Y-%m-%dT%H:%M:%SZ'}
        schema['properties']['host'] = {'type': 'string'}
        new_schema = table_metadata_generator.add_fluent_bit_agent_info(schema=schema, table_type='tmp')
        assert schema == {'type': 'object', 'properties': collections.OrderedDict([('time', {'type': 'timestamp', 'timeKey': True, 'format': '%Y-%m-%dT%H:%M:%SZ'}), ('host', {'type': 'string'})])}
        assert new_schema == {'type': 'object', 'properties': collections.OrderedDict([('time', {'type': 'timestamp', 'timeKey': True, 'format': '%Y-%m-%dT%H:%M:%SZ'}), ('host', {'type': 'string'}), ('file_name', {'type': 'string'}), ('az', {'type': 'string'}), ('ec2_instance_id', {'type': 'string'}), ('private_ip', {'type': 'string'}), ('hostname', {'type': 'string'}), ('cluster', {'type': 'string'}), ('kubernetes', {'type': 'object', 'properties': {'pod_name': {'type': 'string'}, 'namespace_name': {'type': 'string'}, 'container_name': {'type': 'string'}, 'docker_id': {'type': 'string'}}})])}
        
        schema = {'type': 'object', 'properties': collections.OrderedDict()}
        schema['properties']['time'] = {'type': 'timestamp', 'timeKey': True, 'format': '%Y-%m-%dT%H:%M:%SZ'}
        schema['properties']['host'] = {'type': 'string'}
        new_schema = table_metadata_generator.add_fluent_bit_agent_info(schema=schema, table_type='centralized')
        assert schema == {'type': 'object', 'properties': collections.OrderedDict([('time', {'type': 'timestamp', 'timeKey': True, 'format': '%Y-%m-%dT%H:%M:%SZ'}), ('host', {'type': 'string'})])}
        assert new_schema == {'type': 'object', 'properties': collections.OrderedDict([('time', {'type': 'timestamp', 'timeKey': True, 'format': '%Y-%m-%dT%H:%M:%SZ'}), ('host', {'type': 'string'}), ('agent_info', {'type': 'object', 'properties': {'file_name': {'type': 'string'}, 'az': {'type': 'string'}, 'ec2_instance_id': {'type': 'string'}, 'private_ip': {'type': 'string'}, 'hostname': {'type': 'string'}, 'cluster': {'type': 'string'}, 'kubernetes': {'type': 'object', 'properties': {'pod_name': {'type': 'string'}, 'namespace_name': {'type': 'string'}, 'container_name': {'type': 'string'}, 'docker_id': {'type': 'string'}}}}, 'expression': 'CAST(ROW("file_name", "az", "ec2_instance_id", "private_ip", "hostname", "cluster", "kubernetes") AS ROW("file_name" varchar, "az" varchar, "ec2_instance_id" varchar, "private_ip" varchar, "hostname" varchar, "cluster" varchar, "kubernetes" ROW("pod_name" varchar, "namespace_name" varchar, "container_name" varchar, "docker_id" varchar)))'})])}
    
    def test_find_time_key(self,):
        from pipeline_resources_builder.lambda_function import TableMetaDataGenerator
        
        source = types.SimpleNamespace()
        destination = types.SimpleNamespace()
        
        table_metadata_generator = TableMetaDataGenerator(source=source, destination=destination)
        
        schema = {'type': 'object', 'properties': collections.OrderedDict()}
        schema['properties']['host'] = {'type': 'string', 'path': '"host"'}
        time_key = table_metadata_generator.find_time_key(schema=schema)
        assert time_key == {'time': {'type': 'timestamp', 'format': 'YYYY-MM-dd\'\'T\'\'HH:mm:ss.SSSSSSSSSZ', 'path': '"time"'}}
        time_key = table_metadata_generator.find_time_key(schema=schema, source_type='fluent-bit')
        assert time_key == {'time': {'type': 'timestamp', 'format': 'YYYY-MM-dd\'\'T\'\'HH:mm:ss.SSSSSSSSSZ', 'path': '"time"'}}
        time_key = table_metadata_generator.find_time_key(schema=schema, source_type='s3')
        assert time_key == {}
        
        schema = {'type': 'object', 'properties': collections.OrderedDict()}
        schema['properties']['timestamp'] = {'type': 'timestamp', 'timeKey': True, 'format': 'YYYY-MM-dd\'\'T\'\'HH:mm:ss.SSSSSSSSSZ', 'path': '"timestamp"'}
        schema['properties']['host'] = {'type': 'string', 'path': '"host"'}
        time_key = table_metadata_generator.find_time_key(schema=schema)
        assert time_key == {'time': {'timeKey': True, 'type': 'timestamp', 'format': 'YYYY-MM-dd\'\'T\'\'HH:mm:ss.SSSSSSSSSZ', 'path': '"timestamp"'}}
        time_key = table_metadata_generator.find_time_key(schema=schema, source_type='fluent-bit')
        assert time_key == {'time': {'timeKey': True, 'type': 'timestamp', 'format': 'YYYY-MM-dd\'\'T\'\'HH:mm:ss.SSSSSSSSSZ', 'path': '"timestamp"'}}
        time_key = table_metadata_generator.find_time_key(schema=schema, source_type='s3')
        assert time_key == {'time': {'timeKey': True, 'type': 'timestamp', 'format': 'YYYY-MM-dd\'\'T\'\'HH:mm:ss.SSSSSSSSSZ', 'path': '"timestamp"'}}
        
        # two time key in json schema
        schema = {'type': 'object', 'properties': collections.OrderedDict()}
        schema['properties']['timestamp'] = {'type': 'timestamp', 'timeKey': True, 'format': 'YYYY-MM-dd\'\'T\'\'HH:mm:ss.SSSSSSSSSZ', 'path': '"timestamp"'}
        schema['properties']['time'] = {'type': 'timestamp', 'timeKey': True, 'format': 'YYYY-MM-dd\'\'T\'\'HH:mm:ss.SSSSSSSSSZ', 'path': '"time"'}
        schema['properties']['host'] = {'type': 'string', 'path': '"host"'}
        time_key = table_metadata_generator.find_time_key(schema=schema)
        assert time_key == {'time': {'timeKey': True, 'type': 'timestamp', 'format': 'YYYY-MM-dd\'\'T\'\'HH:mm:ss.SSSSSSSSSZ', 'path': '"timestamp"'}}
        time_key = table_metadata_generator.find_time_key(schema=schema, source_type='fluent-bit')
        assert time_key == {'time': {'timeKey': True, 'type': 'timestamp', 'format': 'YYYY-MM-dd\'\'T\'\'HH:mm:ss.SSSSSSSSSZ', 'path': '"timestamp"'}}
        time_key = table_metadata_generator.find_time_key(schema=schema, source_type='s3')
        assert time_key == {'time': {'timeKey': True, 'type': 'timestamp', 'format': 'YYYY-MM-dd\'\'T\'\'HH:mm:ss.SSSSSSSSSZ', 'path': '"timestamp"'}}
        
        #  two time key in json schema
        schema = {'type': 'object', 'properties': collections.OrderedDict()}
        schema['properties']['processInfo'] = {'type': 'object', 'properties': {
            'host': {'type': 'string', 'path': '"processInfo"."host"'}, 
            'processTime': {'type': 'timestamp', 'timeKey': True, 'format': 'YYYY-MM-dd\'\'T\'\'HH:mm:ss.SSSSSSSSSZ', 'path': '"processInfo"."processTime"'}
            }
        }
        schema['properties']['timestamp'] = {'type': 'timestamp', 'timeKey': True, 'format': 'YYYY-MM-dd\'\'T\'\'HH:mm:ss.SSSSSSSSSZ', 'path': '"timestamp"'}
        time_key = table_metadata_generator.find_time_key(schema=schema)
        assert time_key == {'time': {'timeKey': True, 'type': 'timestamp', 'format': 'YYYY-MM-dd\'\'T\'\'HH:mm:ss.SSSSSSSSSZ', 'path': '"timestamp"'}}
        time_key = table_metadata_generator.find_time_key(schema=schema, source_type='fluent-bit')
        assert time_key == {'time': {'timeKey': True, 'type': 'timestamp', 'format': 'YYYY-MM-dd\'\'T\'\'HH:mm:ss.SSSSSSSSSZ', 'path': '"timestamp"'}}
        time_key = table_metadata_generator.find_time_key(schema=schema, source_type='s3')
        assert time_key == {'time': {'timeKey': True, 'type': 'timestamp', 'format': 'YYYY-MM-dd\'\'T\'\'HH:mm:ss.SSSSSSSSSZ', 'path': '"timestamp"'}}
        
        #  time key in object
        schema = {'type': 'object', 'properties': collections.OrderedDict()}
        schema['properties']['processInfo'] = {'type': 'object', 'properties': {
            'host': {'type': 'string', 'path': '"processInfo"."host"'}, 
            'processTime': {'type': 'timestamp', 'timeKey': True, 'format': 'YYYY-MM-dd\'\'T\'\'HH:mm:ss.SSSSSSSSSZ', 'path': '"processInfo"."processTime"'}
            }
        }
        time_key = table_metadata_generator.find_time_key(schema=schema)
        assert time_key == {'time': {'timeKey': True, 'type': 'timestamp', 'format': 'YYYY-MM-dd\'\'T\'\'HH:mm:ss.SSSSSSSSSZ', 'path': '"processInfo"."processTime"'}}
        time_key = table_metadata_generator.find_time_key(schema=schema, source_type='fluent-bit')
        assert time_key == {'time': {'timeKey': True, 'type': 'timestamp', 'format': 'YYYY-MM-dd\'\'T\'\'HH:mm:ss.SSSSSSSSSZ', 'path': '"processInfo"."processTime"'}}
        time_key = table_metadata_generator.find_time_key(schema=schema, source_type='s3')
        assert time_key == {'time': {'timeKey': True, 'type': 'timestamp', 'format': 'YYYY-MM-dd\'\'T\'\'HH:mm:ss.SSSSSSSSSZ', 'path': '"processInfo"."processTime"'}}
        
        # two time key in object
        schema = {'type': 'object', 'properties': collections.OrderedDict()}
        schema['properties']['processInfo'] = {'type': 'object', 'properties': {
            'host': {'type': 'string', 'path': '"processInfo"."host"'}, 
            'processTime': {'type': 'timestamp', 'timeKey': True, 'format': 'YYYY-MM-dd\'\'T\'\'HH:mm:ss.SSSSSSSSSZ', 'path': '"processInfo"."processTime"'},
            'receiveTime': {'type': 'timestamp', 'timeKey': True, 'format': 'YYYY-MM-dd\'\'T\'\'HH:mm:ss.SSSSSSSSSZ', 'path': '"processInfo"."receiveTime"'}
            }
        }
        schema['properties']['timestamp'] = {'type': 'timestamp', 'timeKey': True, 'format': 'YYYY-MM-dd\'\'T\'\'HH:mm:ss.SSSSSSSSSZ', 'path': '"timestamp"'}
        time_key = table_metadata_generator.find_time_key(schema=schema)
        assert time_key == {'time': {'timeKey': True, 'type': 'timestamp', 'format': 'YYYY-MM-dd\'\'T\'\'HH:mm:ss.SSSSSSSSSZ', 'path': '"timestamp"'}}
        time_key = table_metadata_generator.find_time_key(schema=schema, source_type='fluent-bit')
        assert time_key == {'time': {'timeKey': True, 'type': 'timestamp', 'format': 'YYYY-MM-dd\'\'T\'\'HH:mm:ss.SSSSSSSSSZ', 'path': '"timestamp"'}}
        time_key = table_metadata_generator.find_time_key(schema=schema, source_type='s3')
        assert time_key == {'time': {'timeKey': True, 'type': 'timestamp', 'format': 'YYYY-MM-dd\'\'T\'\'HH:mm:ss.SSSSSSSSSZ', 'path': '"timestamp"'}}
        
        # two time key in object
        schema = {'type': 'object', 'properties': collections.OrderedDict()}
        schema['properties']['processInfo'] = {'type': 'object', 'properties': {
            'host': {'type': 'string', 'path': '"processInfo"."host"'}, 
            'processTime': {'type': 'timestamp', 'timeKey': True, 'format': 'YYYY-MM-dd\'\'T\'\'HH:mm:ss.SSSSSSSSSZ', 'path': '"processInfo"."processTime"'},
            'receiveTime': {'type': 'timestamp', 'timeKey': True, 'format': 'YYYY-MM-dd\'\'T\'\'HH:mm:ss.SSSSSSSSSZ', 'path': '"processInfo"."receiveTime"'}
            }
        }
        time_key = table_metadata_generator.find_time_key(schema=schema)
        assert time_key == {'time': {'timeKey': True, 'type': 'timestamp', 'format': 'YYYY-MM-dd\'\'T\'\'HH:mm:ss.SSSSSSSSSZ', 'path': '"processInfo"."processTime"'}}
        time_key = table_metadata_generator.find_time_key(schema=schema, source_type='fluent-bit')
        assert time_key == {'time': {'timeKey': True, 'type': 'timestamp', 'format': 'YYYY-MM-dd\'\'T\'\'HH:mm:ss.SSSSSSSSSZ', 'path': '"processInfo"."processTime"'}}
        time_key = table_metadata_generator.find_time_key(schema=schema, source_type='s3')
        assert time_key == {'time': {'timeKey': True, 'type': 'timestamp', 'format': 'YYYY-MM-dd\'\'T\'\'HH:mm:ss.SSSSSSSSSZ', 'path': '"processInfo"."processTime"'}}
        
        # time key in nested, ignore array, select object
        schema = {'type': 'object', 'properties': collections.OrderedDict()}
        schema['properties']['headers'] = {'type': 'array', 'items': {
            'type': 'object',
            'properties': {
                'host': {'type': 'string', 'path': '"headers"."host"'}, 
                'processTime': {'type': 'timestamp', 'timeKey': True, 'format': 'YYYY-MM-dd\'\'T\'\'HH:mm:ss.SSSSSSSSSZ', 'path': '"headers"."processTime"'}
                }
            },
            'path': '"headers"'
        }
        schema['properties']['processInfo'] = {'type': 'object', 'properties': {
            'host': {'type': 'string', 'path': '"processInfo"."host"'}, 
            'processTime': {'type': 'timestamp', 'timeKey': True, 'format': 'YYYY-MM-dd\'\'T\'\'HH:mm:ss.SSSSSS', 'path': '"processInfo"."processTime"'}
            }
        }
        time_key = table_metadata_generator.find_time_key(schema=schema)
        assert time_key == {'time': {'timeKey': True, 'type': 'timestamp', 'format': 'YYYY-MM-dd\'\'T\'\'HH:mm:ss.SSSSSS', 'path': '"processInfo"."processTime"'}}
        time_key = table_metadata_generator.find_time_key(schema=schema, source_type='fluent-bit')
        assert time_key == {'time': {'timeKey': True, 'type': 'timestamp', 'format': 'YYYY-MM-dd\'\'T\'\'HH:mm:ss.SSSSSS', 'path': '"processInfo"."processTime"'}}
        time_key = table_metadata_generator.find_time_key(schema=schema, source_type='s3')
        assert time_key == {'time': {'timeKey': True, 'type': 'timestamp', 'format': 'YYYY-MM-dd\'\'T\'\'HH:mm:ss.SSSSSS', 'path': '"processInfo"."processTime"'}}
        
        # time key in array, ignore
        schema = {'type': 'object', 'properties': collections.OrderedDict()}
        schema['properties']['headers'] = {'type': 'array', 'items': {
            'type': 'object',
            'properties': {
                'host': {'type': 'string'}, 
                'processTime': {'type': 'timestamp', 'timeKey': True, 'format': 'YYYY-MM-dd\'\'T\'\'HH:mm:ss.SSSSSSSSSZ'}
                }
            }
        }
        time_key = table_metadata_generator.find_time_key(schema=schema)
        assert time_key == {'time': {'type': 'timestamp', 'format': 'YYYY-MM-dd\'\'T\'\'HH:mm:ss.SSSSSSSSSZ', 'path': '"time"'}}
        time_key = table_metadata_generator.find_time_key(schema=schema, source_type='fluent-bit')
        assert time_key == {'time': {'type': 'timestamp', 'format': 'YYYY-MM-dd\'\'T\'\'HH:mm:ss.SSSSSSSSSZ', 'path': '"time"'}}
        time_key = table_metadata_generator.find_time_key(schema=schema, source_type='s3')
        assert time_key == {}
    
    def test_add_time_key(self,):
        from pipeline_resources_builder.lambda_function import TableMetaDataGenerator
        
        source = types.SimpleNamespace()
        destination = types.SimpleNamespace()
        
        table_metadata_generator = TableMetaDataGenerator(source=source, destination=destination)
        
        # do not specified timeKey in json schema
        schema = {'type': 'object', 'properties': collections.OrderedDict()}
        schema['properties']['host'] = {'type': 'string'}
        new_schema = table_metadata_generator.add_time_key(schema=schema)
        assert schema == {'type': 'object', 'properties': collections.OrderedDict([('host', {'type': 'string', 'path': '"host"'})])}
        assert new_schema == {'type': 'object', 'properties': collections.OrderedDict([('time', {'type': 'big_int', 'expression': 'CAST(to_unixtime(parse_datetime("time", \'YYYY-MM-dd\'\'T\'\'HH:mm:ss.SSSSSSSSSZ\')) * 1000 AS bigint)'}), ('timestamp', {'type': 'timestamp', 'expression': 'parse_datetime("time", \'YYYY-MM-dd\'\'T\'\'HH:mm:ss.SSSSSSSSSZ\')'}), ('host', {'type': 'string', 'path': '"host"'})])}
        new_schema = table_metadata_generator.add_time_key(schema=schema, source_type='fluent-bit')
        assert schema == {'type': 'object', 'properties': collections.OrderedDict([('host', {'type': 'string', 'path': '"host"'})])}
        assert new_schema == {'type': 'object', 'properties': collections.OrderedDict([('time', {'type': 'big_int', 'expression': 'CAST(to_unixtime(parse_datetime("time", \'YYYY-MM-dd\'\'T\'\'HH:mm:ss.SSSSSSSSSZ\')) * 1000 AS bigint)'}), ('timestamp', {'type': 'timestamp', 'expression': 'parse_datetime("time", \'YYYY-MM-dd\'\'T\'\'HH:mm:ss.SSSSSSSSSZ\')'}), ('host', {'type': 'string', 'path': '"host"'})])}
        new_schema = table_metadata_generator.add_time_key(schema=schema, source_type='s3')
        assert schema == {'type': 'object', 'properties': collections.OrderedDict([('host', {'type': 'string', 'path': '"host"'})])}
        assert new_schema == schema
        
        # Have timeKey in json schema
        schema = {'type': 'object', 'properties': collections.OrderedDict()}
        schema['properties']['timestamp'] = {'type': 'timestamp', 'timeKey': True, 'format': 'YYYY-MM-dd\'\'T\'\'HH:mm:ss.SSSSSS'}
        schema['properties']['host'] = {'type': 'string'}
        new_schema = table_metadata_generator.add_time_key(schema=schema)
        assert schema == {'type': 'object', 'properties': collections.OrderedDict([('timestamp', {'type': 'timestamp', 'timeKey': True, 'format': 'YYYY-MM-dd\'\'T\'\'HH:mm:ss.SSSSSS', 'path': '"timestamp"'}), ('host', {'type': 'string', 'path': '"host"'})])}
        assert new_schema == {'type': 'object', 'properties': collections.OrderedDict([('time', {'type': 'big_int', 'expression': 'CAST(to_unixtime(parse_datetime("timestamp", \'YYYY-MM-dd\'\'T\'\'HH:mm:ss.SSSSSS\')) * 1000 AS bigint)'}), ('timestamp', {'type': 'timestamp', 'expression': 'parse_datetime("timestamp", \'YYYY-MM-dd\'\'T\'\'HH:mm:ss.SSSSSS\')'}), ('host', {'type': 'string', 'path': '"host"'})])}
        new_schema = table_metadata_generator.add_time_key(schema=schema, source_type='fluent-bit')
        assert schema == {'type': 'object', 'properties': collections.OrderedDict([('timestamp', {'type': 'timestamp', 'timeKey': True, 'format': 'YYYY-MM-dd\'\'T\'\'HH:mm:ss.SSSSSS', 'path': '"timestamp"'}), ('host', {'type': 'string', 'path': '"host"'})])}
        assert new_schema == {'type': 'object', 'properties': collections.OrderedDict([('time', {'type': 'big_int', 'expression': 'CAST(to_unixtime(parse_datetime("timestamp", \'YYYY-MM-dd\'\'T\'\'HH:mm:ss.SSSSSS\')) * 1000 AS bigint)'}), ('timestamp', {'type': 'timestamp', 'expression': 'parse_datetime("timestamp", \'YYYY-MM-dd\'\'T\'\'HH:mm:ss.SSSSSS\')'}), ('host', {'type': 'string', 'path': '"host"'})])}
        new_schema = table_metadata_generator.add_time_key(schema=schema, source_type='s3')
        assert schema == {'type': 'object', 'properties': collections.OrderedDict([('timestamp', {'type': 'timestamp', 'timeKey': True, 'format': 'YYYY-MM-dd\'\'T\'\'HH:mm:ss.SSSSSS', 'path': '"timestamp"'}), ('host', {'type': 'string', 'path': '"host"'})])}
        assert new_schema == {'type': 'object', 'properties': collections.OrderedDict([('time', {'type': 'big_int', 'expression': 'CAST(to_unixtime(parse_datetime("timestamp", \'YYYY-MM-dd\'\'T\'\'HH:mm:ss.SSSSSS\')) * 1000 AS bigint)'}), ('timestamp', {'type': 'timestamp', 'expression': 'parse_datetime("timestamp", \'YYYY-MM-dd\'\'T\'\'HH:mm:ss.SSSSSS\')'}), ('host', {'type': 'string', 'path': '"host"'})])}
    
        # Time key is string in json schema
        schema = {'type': 'object', 'properties': collections.OrderedDict()}
        schema['properties']['timestamp'] = {'type': 'string', 'timeKey': True, 'format': 'YYYY-MM-dd\'\'T\'\'HH:mm:ss.SSSSSS'}
        schema['properties']['host'] = {'type': 'string'}
        new_schema = table_metadata_generator.add_time_key(schema=schema)
        assert schema == {'type': 'object', 'properties': collections.OrderedDict([('timestamp', {'type': 'string', 'timeKey': True, 'format': 'YYYY-MM-dd\'\'T\'\'HH:mm:ss.SSSSSS', 'path': '"timestamp"'}), ('host', {'type': 'string', 'path': '"host"'})])}
        assert new_schema == {'type': 'object', 'properties': collections.OrderedDict([('time', {'type': 'big_int', 'expression': 'CAST(to_unixtime(parse_datetime("timestamp", \'YYYY-MM-dd\'\'T\'\'HH:mm:ss.SSSSSS\')) * 1000 AS bigint)'}), ('timestamp', {'type': 'timestamp', 'expression': 'parse_datetime("timestamp", \'YYYY-MM-dd\'\'T\'\'HH:mm:ss.SSSSSS\')'}), ('host', {'type': 'string', 'path': '"host"'})])}
        new_schema = table_metadata_generator.add_time_key(schema=schema, source_type='fluent-bit')
        assert schema == {'type': 'object', 'properties': collections.OrderedDict([('timestamp', {'type': 'string', 'timeKey': True, 'format': 'YYYY-MM-dd\'\'T\'\'HH:mm:ss.SSSSSS', 'path': '"timestamp"'}), ('host', {'type': 'string', 'path': '"host"'})])}
        assert new_schema == {'type': 'object', 'properties': collections.OrderedDict([('time', {'type': 'big_int', 'expression': 'CAST(to_unixtime(parse_datetime("timestamp", \'YYYY-MM-dd\'\'T\'\'HH:mm:ss.SSSSSS\')) * 1000 AS bigint)'}), ('timestamp', {'type': 'timestamp', 'expression': 'parse_datetime("timestamp", \'YYYY-MM-dd\'\'T\'\'HH:mm:ss.SSSSSS\')'}), ('host', {'type': 'string', 'path': '"host"'})])}
        new_schema = table_metadata_generator.add_time_key(schema=schema, source_type='s3')
        assert schema == {'type': 'object', 'properties': collections.OrderedDict([('timestamp', {'type': 'string', 'timeKey': True, 'format': 'YYYY-MM-dd\'\'T\'\'HH:mm:ss.SSSSSS', 'path': '"timestamp"'}), ('host', {'type': 'string', 'path': '"host"'})])}
        assert new_schema == {'type': 'object', 'properties': collections.OrderedDict([('time', {'type': 'big_int', 'expression': 'CAST(to_unixtime(parse_datetime("timestamp", \'YYYY-MM-dd\'\'T\'\'HH:mm:ss.SSSSSS\')) * 1000 AS bigint)'}), ('timestamp', {'type': 'timestamp', 'expression': 'parse_datetime("timestamp", \'YYYY-MM-dd\'\'T\'\'HH:mm:ss.SSSSSS\')'}), ('host', {'type': 'string', 'path': '"host"'})])}
    
        # Time key is big_int and have expression in json schema
        schema = {'type': 'object', 'properties': collections.OrderedDict()}
        schema['properties']['timestamp'] = {'type': 'big_int', 'timeKey': True, 'expression': '"timestamp" / 1000'}
        schema['properties']['host'] = {'type': 'string'}
        new_schema = table_metadata_generator.add_time_key(schema=schema)
        assert schema == {'type': 'object', 'properties': collections.OrderedDict([('timestamp', {'type': 'big_int', 'timeKey': True, 'expression': '"timestamp" / 1000', 'path': '"timestamp"'}), ('host', {'type': 'string', 'path': '"host"'})])}
        assert new_schema == {'type': 'object', 'properties': collections.OrderedDict([('time', {'type': 'big_int', 'expression': '"timestamp" / 1000'}), ('timestamp', {'type': 'timestamp', 'expression': 'CAST(FROM_UNIXTIME("timestamp" / 1000) AS timestamp)'}), ('host', {'type': 'string', 'path': '"host"'})])}
        new_schema = table_metadata_generator.add_time_key(schema=schema, source_type='fluent-bit')
        assert schema == {'type': 'object', 'properties': collections.OrderedDict([('timestamp', {'type': 'big_int', 'timeKey': True, 'expression': '"timestamp" / 1000', 'path': '"timestamp"'}), ('host', {'type': 'string', 'path': '"host"'})])}
        assert new_schema == {'type': 'object', 'properties': collections.OrderedDict([('time', {'type': 'big_int', 'expression': '"timestamp" / 1000'}), ('timestamp', {'type': 'timestamp', 'expression': 'CAST(FROM_UNIXTIME("timestamp" / 1000) AS timestamp)'}), ('host', {'type': 'string', 'path': '"host"'})])}
        new_schema = table_metadata_generator.add_time_key(schema=schema, source_type='s3')
        assert schema == {'type': 'object', 'properties': collections.OrderedDict([('timestamp', {'type': 'big_int', 'timeKey': True, 'expression': '"timestamp" / 1000', 'path': '"timestamp"'}), ('host', {'type': 'string', 'path': '"host"'})])}
        assert new_schema == {'type': 'object', 'properties': collections.OrderedDict([('time', {'type': 'big_int', 'expression': '"timestamp" / 1000'}), ('timestamp', {'type': 'timestamp', 'expression': 'CAST(FROM_UNIXTIME("timestamp" / 1000) AS timestamp)'}), ('host', {'type': 'string', 'path': '"host"'})])}
    
        # Time key is integer and no expression in json schema
        schema = {'type': 'object', 'properties': collections.OrderedDict()}
        schema['properties']['timestamp'] = {'type': 'integer', 'timeKey': True}
        schema['properties']['host'] = {'type': 'string'}
        new_schema = table_metadata_generator.add_time_key(schema=schema)
        assert schema == {'type': 'object', 'properties': collections.OrderedDict([('timestamp', {'type': 'integer', 'timeKey': True, 'path': '"timestamp"'}), ('host', {'type': 'string', 'path': '"host"'})])}
        assert new_schema == {'type': 'object', 'properties': collections.OrderedDict([('time', {'type': 'big_int', 'expression': '"timestamp"'}), ('timestamp', {'type': 'timestamp', 'expression': 'CAST(FROM_UNIXTIME("timestamp") AS timestamp)'}), ('host', {'type': 'string', 'path': '"host"'})])}
        new_schema = table_metadata_generator.add_time_key(schema=schema, source_type='fluent-bit')
        assert schema == {'type': 'object', 'properties': collections.OrderedDict([('timestamp', {'type': 'integer', 'timeKey': True, 'path': '"timestamp"'}), ('host', {'type': 'string', 'path': '"host"'})])}
        assert new_schema == {'type': 'object', 'properties': collections.OrderedDict([('time', {'type': 'big_int', 'expression': '"timestamp"'}), ('timestamp', {'type': 'timestamp', 'expression': 'CAST(FROM_UNIXTIME("timestamp") AS timestamp)'}), ('host', {'type': 'string', 'path': '"host"'})])}
        new_schema = table_metadata_generator.add_time_key(schema=schema, source_type='s3')
        assert schema == {'type': 'object', 'properties': collections.OrderedDict([('timestamp', {'type': 'integer', 'timeKey': True, 'path': '"timestamp"'}), ('host', {'type': 'string', 'path': '"host"'})])}
        assert new_schema == {'type': 'object', 'properties': collections.OrderedDict([('time', {'type': 'big_int', 'expression': '"timestamp"'}), ('timestamp', {'type': 'timestamp', 'expression': 'CAST(FROM_UNIXTIME("timestamp") AS timestamp)'}), ('host', {'type': 'string', 'path': '"host"'})])}
    
    def test_add_default_partition(self,):
        from pipeline_resources_builder.lambda_function import TableMetaDataGenerator
        
        source = types.SimpleNamespace()
        destination = types.SimpleNamespace()
        
        table_metadata_generator = TableMetaDataGenerator(source=source, destination=destination)
        
        # no timeKey in Json schema
        schema = {'type': 'object', 'properties': collections.OrderedDict()}
        schema['properties']['host'] = {'type': 'string'}
        new_schema = table_metadata_generator.add_default_partition(schema=schema)
        assert schema == {'type': 'object', 'properties': collections.OrderedDict([('host', {'type': 'string'})])}
        assert new_schema == {'type': 'object', 'properties': collections.OrderedDict([('host', {'type': 'string', 'path': '"host"'}), ('event_hour', {'type': 'string', 'partition': True, 'expression': 'date_format(parse_datetime("time", \'YYYY-MM-dd\'\'T\'\'HH:mm:ss.SSSSSSSSSZ\'), \'%Y%m%d%H\')'}), ('__execution_name__', {'type': 'string', 'partition': True, 'expression': "'{{}}'"})])}
        new_schema = table_metadata_generator.add_default_partition(schema=schema, source_type='fluent-bit')
        assert schema == {'type': 'object', 'properties': collections.OrderedDict([('host', {'type': 'string'})])}
        assert new_schema == {'type': 'object', 'properties': collections.OrderedDict([('host', {'type': 'string', 'path': '"host"'}), ('event_hour', {'type': 'string', 'partition': True, 'expression': 'date_format(parse_datetime("time", \'YYYY-MM-dd\'\'T\'\'HH:mm:ss.SSSSSSSSSZ\'), \'%Y%m%d%H\')'}), ('__execution_name__', {'type': 'string', 'partition': True, 'expression': "'{{}}'"})])}
        new_schema = table_metadata_generator.add_default_partition(schema=schema, source_type='s3')
        assert schema == {'type': 'object', 'properties': collections.OrderedDict([('host', {'type': 'string'})])}
        assert new_schema == {'type': 'object', 'properties': collections.OrderedDict([('host', {'type': 'string', 'path': '"host"'}), ('__execution_name__', {'type': 'string', 'partition': True, 'expression': "'{{}}'"})])}

        # have timeKey in json schema
        schema = {'type': 'object', 'properties': collections.OrderedDict()}
        schema['properties']['timestamp'] = {'type': 'timestamp', 'timeKey': True, 'format': 'YYYY-MM-dd\'\'T\'\'HH:mm:ss.SSSSSSSSSZ'}
        schema['properties']['host'] = {'type': 'string', 'partition': True}
        new_schema = table_metadata_generator.add_default_partition(schema=schema)
        assert schema == {'type': 'object', 'properties': collections.OrderedDict([('timestamp', {'type': 'timestamp', 'timeKey': True, 'format': 'YYYY-MM-dd\'\'T\'\'HH:mm:ss.SSSSSSSSSZ'}), ('host', {'type': 'string', 'partition': True})])}
        assert new_schema == {'type': 'object', 'properties': collections.OrderedDict([('timestamp', {'type': 'timestamp', 'timeKey': True, 'format': 'YYYY-MM-dd\'\'T\'\'HH:mm:ss.SSSSSSSSSZ', 'path': '"timestamp"'}), ('host', {'type': 'string', 'partition': True, 'path': '"host"'}), ('event_hour', {'type': 'string', 'partition': True, 'expression': 'date_format(parse_datetime("timestamp", \'YYYY-MM-dd\'\'T\'\'HH:mm:ss.SSSSSSSSSZ\'), \'%Y%m%d%H\')'}), ('__execution_name__', {'type': 'string', 'partition': True, 'expression': "'{{}}'"})])}
        new_schema = table_metadata_generator.add_default_partition(schema=schema, source_type='fluent-bit')
        assert schema == {'type': 'object', 'properties': collections.OrderedDict([('timestamp', {'type': 'timestamp', 'timeKey': True, 'format': 'YYYY-MM-dd\'\'T\'\'HH:mm:ss.SSSSSSSSSZ'}), ('host', {'type': 'string', 'partition': True})])}
        assert new_schema == {'type': 'object', 'properties': collections.OrderedDict([('timestamp', {'type': 'timestamp', 'timeKey': True, 'format': 'YYYY-MM-dd\'\'T\'\'HH:mm:ss.SSSSSSSSSZ', 'path': '"timestamp"'}), ('host', {'type': 'string', 'partition': True, 'path': '"host"'}), ('event_hour', {'type': 'string', 'partition': True, 'expression': 'date_format(parse_datetime("timestamp", \'YYYY-MM-dd\'\'T\'\'HH:mm:ss.SSSSSSSSSZ\'), \'%Y%m%d%H\')'}), ('__execution_name__', {'type': 'string', 'partition': True, 'expression': "'{{}}'"})])}
        new_schema = table_metadata_generator.add_default_partition(schema=schema, source_type='s3')
        assert schema == {'type': 'object', 'properties': collections.OrderedDict([('timestamp', {'type': 'timestamp', 'timeKey': True, 'format': 'YYYY-MM-dd\'\'T\'\'HH:mm:ss.SSSSSSSSSZ'}), ('host', {'type': 'string', 'partition': True})])}
        assert new_schema == {'type': 'object', 'properties': collections.OrderedDict([('timestamp', {'type': 'timestamp', 'timeKey': True, 'format': 'YYYY-MM-dd\'\'T\'\'HH:mm:ss.SSSSSSSSSZ', 'path': '"timestamp"'}), ('host', {'type': 'string', 'partition': True, 'path': '"host"'}), ('event_hour', {'type': 'string', 'partition': True, 'expression': 'date_format(parse_datetime("timestamp", \'YYYY-MM-dd\'\'T\'\'HH:mm:ss.SSSSSSSSSZ\'), \'%Y%m%d%H\')'}), ('__execution_name__', {'type': 'string', 'partition': True, 'expression': "'{{}}'"})])}

        # Time key is big_int and have expression in json schema
        schema = {'type': 'object', 'properties': collections.OrderedDict()}
        schema['properties']['timestamp'] = {'type': 'big_int', 'timeKey': True, 'expression': '"timestamp" / 1000'}
        schema['properties']['host'] = {'type': 'string', 'partition': True}
        new_schema = table_metadata_generator.add_default_partition(schema=schema)
        assert schema == {'type': 'object', 'properties': collections.OrderedDict([('timestamp', {'type': 'big_int', 'timeKey': True, 'expression': '"timestamp" / 1000'}), ('host', {'type': 'string', 'partition': True})])}
        assert new_schema == {'type': 'object', 'properties': collections.OrderedDict([('timestamp', {'type': 'big_int', 'timeKey': True, 'expression': '"timestamp" / 1000', 'path': '"timestamp"'}), ('host', {'type': 'string', 'partition': True, 'path': '"host"'}), ('event_hour', {'type': 'string', 'partition': True, 'expression': 'date_format(CAST(FROM_UNIXTIME("timestamp" / 1000) AS timestamp), \'%Y%m%d%H\')'}), ('__execution_name__', {'type': 'string', 'partition': True, 'expression': "'{{}}'"})])}
        new_schema = table_metadata_generator.add_default_partition(schema=schema, source_type='fluent-bit')
        assert schema == {'type': 'object', 'properties': collections.OrderedDict([('timestamp', {'type': 'big_int', 'timeKey': True, 'expression': '"timestamp" / 1000'}), ('host', {'type': 'string', 'partition': True})])}
        assert new_schema == {'type': 'object', 'properties': collections.OrderedDict([('timestamp', {'type': 'big_int', 'timeKey': True, 'expression': '"timestamp" / 1000', 'path': '"timestamp"'}), ('host', {'type': 'string', 'partition': True, 'path': '"host"'}), ('event_hour', {'type': 'string', 'partition': True, 'expression': 'date_format(CAST(FROM_UNIXTIME("timestamp" / 1000) AS timestamp), \'%Y%m%d%H\')'}), ('__execution_name__', {'type': 'string', 'partition': True, 'expression': "'{{}}'"})])}
        new_schema = table_metadata_generator.add_default_partition(schema=schema, source_type='s3')
        assert schema == {'type': 'object', 'properties': collections.OrderedDict([('timestamp', {'type': 'big_int', 'timeKey': True, 'expression': '"timestamp" / 1000'}), ('host', {'type': 'string', 'partition': True})])}
        assert new_schema == {'type': 'object', 'properties': collections.OrderedDict([('timestamp', {'type': 'big_int', 'timeKey': True, 'expression': '"timestamp" / 1000', 'path': '"timestamp"'}), ('host', {'type': 'string', 'partition': True, 'path': '"host"'}), ('event_hour', {'type': 'string', 'partition': True, 'expression': 'date_format(CAST(FROM_UNIXTIME("timestamp" / 1000) AS timestamp), \'%Y%m%d%H\')'}), ('__execution_name__', {'type': 'string', 'partition': True, 'expression': "'{{}}'"})])}

        # Time key is integer and no expression in json schema
        schema = {'type': 'object', 'properties': collections.OrderedDict()}
        schema['properties']['timestamp'] = {'type': 'integer', 'timeKey': True}
        schema['properties']['host'] = {'type': 'string', 'partition': True}
        new_schema = table_metadata_generator.add_default_partition(schema=schema)
        assert schema == {'type': 'object', 'properties': collections.OrderedDict([('timestamp', {'type': 'integer', 'timeKey': True}), ('host', {'type': 'string', 'partition': True})])}
        assert new_schema == {'type': 'object', 'properties': collections.OrderedDict([('timestamp', {'type': 'integer', 'timeKey': True, 'path': '"timestamp"'}), ('host', {'type': 'string', 'partition': True, 'path': '"host"'}), ('event_hour', {'type': 'string', 'partition': True, 'expression': 'date_format(CAST(FROM_UNIXTIME("timestamp") AS timestamp), \'%Y%m%d%H\')'}), ('__execution_name__', {'type': 'string', 'partition': True, 'expression': "'{{}}'"})])}
        new_schema = table_metadata_generator.add_default_partition(schema=schema, source_type='fluent-bit')
        assert schema == {'type': 'object', 'properties': collections.OrderedDict([('timestamp', {'type': 'integer', 'timeKey': True}), ('host', {'type': 'string', 'partition': True})])}
        assert new_schema == {'type': 'object', 'properties': collections.OrderedDict([('timestamp', {'type': 'integer', 'timeKey': True, 'path': '"timestamp"'}), ('host', {'type': 'string', 'partition': True, 'path': '"host"'}), ('event_hour', {'type': 'string', 'partition': True, 'expression': 'date_format(CAST(FROM_UNIXTIME("timestamp") AS timestamp), \'%Y%m%d%H\')'}), ('__execution_name__', {'type': 'string', 'partition': True, 'expression': "'{{}}'"})])}
        new_schema = table_metadata_generator.add_default_partition(schema=schema, source_type='s3')
        assert schema == {'type': 'object', 'properties': collections.OrderedDict([('timestamp', {'type': 'integer', 'timeKey': True}), ('host', {'type': 'string', 'partition': True})])}
        assert new_schema == {'type': 'object', 'properties': collections.OrderedDict([('timestamp', {'type': 'integer', 'timeKey': True, 'path': '"timestamp"'}), ('host', {'type': 'string', 'partition': True, 'path': '"host"'}), ('event_hour', {'type': 'string', 'partition': True, 'expression': 'date_format(CAST(FROM_UNIXTIME("timestamp") AS timestamp), \'%Y%m%d%H\')'}), ('__execution_name__', {'type': 'string', 'partition': True, 'expression': "'{{}}'"})])}

    def test_get_raw_table_metadata(self):
        from pipeline_resources_builder.lambda_function import TableMetaDataGenerator, dataformat, TableMetaData
        
        source = types.SimpleNamespace()
        destination = types.SimpleNamespace()
        
        table_metadata_generator = TableMetaDataGenerator(source=source, destination=destination)
        
        # Do not have timestamp data type in json schema
        schema = {'type': 'object', 'properties': {'host': {'type': 'string'}}}
        data_format = dataformat.Tsv
        table_properties = {'skip.header.line.count': '2'}
        serialization_properties = {'field.delim': '\t', 'line.delim': '\n'}
        
        table_metadata = table_metadata_generator.get_raw_table_metadata(schema=schema, data_format=data_format, table_properties=table_properties, serialization_properties=serialization_properties)
        assert isinstance(table_metadata, TableMetaData) is True
        assert table_metadata.schema == {'type': 'object', 'properties': {'time': {'type': 'string', 'timeKey': True, 'format': 'YYYY-MM-dd\'\'T\'\'HH:mm:ss.SSSSSSSSSZ', 'path': '"time"'}, 'host': {'type': 'string', 'path': '"host"'}, 'file_name': {'type': 'string', 'path': '"file_name"'}, 'az': {'type': 'string', 'path': '"az"'}, 'ec2_instance_id': {'type': 'string', 'path': '"ec2_instance_id"'}, 'private_ip': {'type': 'string', 'path': '"private_ip"'}, 'hostname': {'type': 'string', 'path': '"hostname"'}, 'cluster': {'type': 'string', 'path': '"cluster"'}, 'kubernetes': {'type': 'object', 'properties': {'pod_name': {'type': 'string', 'path': '"kubernetes"."pod_name"'}, 'namespace_name': {'type': 'string', 'path': '"kubernetes"."namespace_name"'}, 'container_name': {'type': 'string', 'path': '"kubernetes"."container_name"'}, 'docker_id': {'type': 'string', 'path': '"kubernetes"."docker_id"'}}, 'path': '"kubernetes"'}}}
        assert table_metadata.ignore_partition is True
        
        table_metadata = table_metadata_generator.get_raw_table_metadata(schema=schema, data_format=data_format, table_properties=table_properties, serialization_properties=serialization_properties, source_type='fluent-bit')
        assert isinstance(table_metadata, TableMetaData) is True
        assert table_metadata.schema == {'type': 'object', 'properties': {'host': {'type': 'string', 'path': '"host"'}, 'time': {'type': 'string', 'timeKey': True, 'format': 'YYYY-MM-dd\'\'T\'\'HH:mm:ss.SSSSSSSSSZ', 'path': '"time"'}, 'file_name': {'type': 'string', 'path': '"file_name"'}, 'az': {'type': 'string', 'path': '"az"'}, 'ec2_instance_id': {'type': 'string', 'path': '"ec2_instance_id"'}, 'private_ip': {'type': 'string', 'path': '"private_ip"'}, 'hostname': {'type': 'string', 'path': '"hostname"'}, 'cluster': {'type': 'string', 'path': '"cluster"'}, 'kubernetes': {'type': 'object', 'properties': {'pod_name': {'type': 'string', 'path': '"kubernetes"."pod_name"'}, 'namespace_name': {'type': 'string', 'path': '"kubernetes"."namespace_name"'}, 'container_name': {'type': 'string', 'path': '"kubernetes"."container_name"'}, 'docker_id': {'type': 'string', 'path': '"kubernetes"."docker_id"'}}, 'path': '"kubernetes"'}}}
        assert table_metadata.ignore_partition is True
        
        table_metadata = table_metadata_generator.get_raw_table_metadata(schema=schema, data_format=data_format, table_properties=table_properties, serialization_properties=serialization_properties, source_type='s3')
        assert isinstance(table_metadata, TableMetaData) is True
        assert table_metadata.schema == {'type': 'object', 'properties': {'host': {'type': 'string', 'path': '"host"'}}}
        assert table_metadata.ignore_partition is True
        
        # Have timestamp data type in json schema
        schema = {'type': 'object', 'properties': {'timestamp': {'type': 'timestamp', 'timeKey': True, 'format': '%Y-%m-%dT%H:%M:%SZ'}}}
        data_format = dataformat.Tsv
        table_properties = {'skip.header.line.count': '2'}
        serialization_properties = {'field.delim': '\t', 'line.delim': '\n'}
        
        table_metadata = table_metadata_generator.get_raw_table_metadata(schema=schema, data_format=data_format, table_properties=table_properties, serialization_properties=serialization_properties)
        assert isinstance(table_metadata, TableMetaData) is True
        assert table_metadata.schema == {'type': 'object', 'properties': {'timestamp': {'type': 'string', 'timeKey': True, 'format': '%Y-%m-%dT%H:%M:%SZ', 'path': '"timestamp"'}, 'file_name': {'type': 'string', 'path': '"file_name"'}, 'az': {'type': 'string', 'path': '"az"'}, 'ec2_instance_id': {'type': 'string', 'path': '"ec2_instance_id"'}, 'private_ip': {'type': 'string', 'path': '"private_ip"'}, 'hostname': {'type': 'string', 'path': '"hostname"'}, 'cluster': {'type': 'string', 'path': '"cluster"'}, 'kubernetes': {'type': 'object', 'properties': {'pod_name': {'type': 'string', 'path': '"kubernetes"."pod_name"'}, 'namespace_name': {'type': 'string', 'path': '"kubernetes"."namespace_name"'}, 'container_name': {'type': 'string', 'path': '"kubernetes"."container_name"'}, 'docker_id': {'type': 'string', 'path': '"kubernetes"."docker_id"'}}, 'path': '"kubernetes"'}}}
        assert table_metadata.ignore_partition is True
        
        table_metadata = table_metadata_generator.get_raw_table_metadata(schema=schema, data_format=data_format, table_properties=table_properties, serialization_properties=serialization_properties, source_type='fluent-bit')
        assert isinstance(table_metadata, TableMetaData) is True
        assert table_metadata.schema == {'type': 'object', 'properties': {'timestamp': {'type': 'string', 'timeKey': True, 'format': '%Y-%m-%dT%H:%M:%SZ', 'path': '"timestamp"'}, 'file_name': {'type': 'string', 'path': '"file_name"'}, 'az': {'type': 'string', 'path': '"az"'}, 'ec2_instance_id': {'type': 'string', 'path': '"ec2_instance_id"'}, 'private_ip': {'type': 'string', 'path': '"private_ip"'}, 'hostname': {'type': 'string', 'path': '"hostname"'}, 'cluster': {'type': 'string', 'path': '"cluster"'}, 'kubernetes': {'type': 'object', 'properties': {'pod_name': {'type': 'string', 'path': '"kubernetes"."pod_name"'}, 'namespace_name': {'type': 'string', 'path': '"kubernetes"."namespace_name"'}, 'container_name': {'type': 'string', 'path': '"kubernetes"."container_name"'}, 'docker_id': {'type': 'string', 'path': '"kubernetes"."docker_id"'}}, 'path': '"kubernetes"'}}}
        assert table_metadata.ignore_partition is True
        
        table_metadata = table_metadata_generator.get_raw_table_metadata(schema=schema, data_format=data_format, table_properties=table_properties, serialization_properties=serialization_properties, source_type='s3')
        assert isinstance(table_metadata, TableMetaData) is True
        assert table_metadata.schema == {'type': 'object', 'properties': {'timestamp': {'type': 'string', 'timeKey': True, 'format': '%Y-%m-%dT%H:%M:%SZ', 'path': '"timestamp"'}}}
        assert table_metadata.ignore_partition is True
    
    def test_get_parquet_table_metadata_from_raw(self):
        from pipeline_resources_builder.lambda_function import TableMetaDataGenerator, dataformat, TableMetaData
        
        source = types.SimpleNamespace()
        destination = types.SimpleNamespace()
        
        table_metadata_generator = TableMetaDataGenerator(source=source, destination=destination)
        
        # Do not have timestamp data type and partition in json schema
        schema = {'type': 'object', 'properties': {'host': {'type': 'string'}}}
        
        table_metadata = table_metadata_generator.get_parquet_table_metadata_from_raw(schema=schema)
        assert isinstance(table_metadata, TableMetaData) is True
        assert table_metadata.schema == {'type': 'object', 'properties': collections.OrderedDict([('time', {'type': 'big_int', 'expression': 'CAST(to_unixtime(parse_datetime("time", \'YYYY-MM-dd\'\'T\'\'HH:mm:ss.SSSSSSSSSZ\')) * 1000 AS bigint)', 'path': '"time"'}), ('timestamp', {'type': 'timestamp', 'expression': 'parse_datetime("time", \'YYYY-MM-dd\'\'T\'\'HH:mm:ss.SSSSSSSSSZ\')', 'path': '"timestamp"'}), ('host', {'type': 'string', 'path': '"host"'}), ('agent_info', {'type': 'object', 'properties': {'file_name': {'type': 'string', 'path': '"agent_info"."file_name"'}, 'az': {'type': 'string', 'path': '"agent_info"."az"'}, 'ec2_instance_id': {'type': 'string', 'path': '"agent_info"."ec2_instance_id"'}, 'private_ip': {'type': 'string', 'path': '"agent_info"."private_ip"'}, 'hostname': {'type': 'string', 'path': '"agent_info"."hostname"'}, 'cluster': {'type': 'string', 'path': '"agent_info"."cluster"'}, 'kubernetes': {'type': 'object', 'properties': {'pod_name': {'type': 'string', 'path': '"agent_info"."kubernetes"."pod_name"'}, 'namespace_name': {'type': 'string', 'path': '"agent_info"."kubernetes"."namespace_name"'}, 'container_name': {'type': 'string', 'path': '"agent_info"."kubernetes"."container_name"'}, 'docker_id': {'type': 'string', 'path': '"agent_info"."kubernetes"."docker_id"'}}, 'path': '"agent_info"."kubernetes"'}}, 'expression': 'CAST(ROW("file_name", "az", "ec2_instance_id", "private_ip", "hostname", "cluster", "kubernetes") AS ROW("file_name" varchar, "az" varchar, "ec2_instance_id" varchar, "private_ip" varchar, "hostname" varchar, "cluster" varchar, "kubernetes" ROW("pod_name" varchar, "namespace_name" varchar, "container_name" varchar, "docker_id" varchar)))', 'path': '"agent_info"'}), ('event_hour', {'type': 'string', 'partition': True, 'expression': 'date_format(parse_datetime("time", \'YYYY-MM-dd\'\'T\'\'HH:mm:ss.SSSSSSSSSZ\'), \'%Y%m%d%H\')', 'path': '"event_hour"'}), ('__execution_name__', {'type': 'string', 'partition': True, 'expression': "'{{}}'", 'path': '"__execution_name__"'})])}
        assert table_metadata.ignore_partition is False
        
        table_metadata = table_metadata_generator.get_parquet_table_metadata_from_raw(schema=schema, source_type='fluent-bit')
        assert isinstance(table_metadata, TableMetaData) is True
        assert table_metadata.schema == {'type': 'object', 'properties': collections.OrderedDict([('time', {'type': 'big_int', 'expression': 'CAST(to_unixtime(parse_datetime("time", \'YYYY-MM-dd\'\'T\'\'HH:mm:ss.SSSSSSSSSZ\')) * 1000 AS bigint)', 'path': '"time"'}), ('timestamp', {'type': 'timestamp', 'expression': 'parse_datetime("time", \'YYYY-MM-dd\'\'T\'\'HH:mm:ss.SSSSSSSSSZ\')', 'path': '"timestamp"'}), ('host', {'type': 'string', 'path': '"host"'}), ('agent_info', {'type': 'object', 'properties': {'file_name': {'type': 'string', 'path': '"agent_info"."file_name"'}, 'az': {'type': 'string', 'path': '"agent_info"."az"'}, 'ec2_instance_id': {'type': 'string', 'path': '"agent_info"."ec2_instance_id"'}, 'private_ip': {'type': 'string', 'path': '"agent_info"."private_ip"'}, 'hostname': {'type': 'string', 'path': '"agent_info"."hostname"'}, 'cluster': {'type': 'string', 'path': '"agent_info"."cluster"'}, 'kubernetes': {'type': 'object', 'properties': {'pod_name': {'type': 'string', 'path': '"agent_info"."kubernetes"."pod_name"'}, 'namespace_name': {'type': 'string', 'path': '"agent_info"."kubernetes"."namespace_name"'}, 'container_name': {'type': 'string', 'path': '"agent_info"."kubernetes"."container_name"'}, 'docker_id': {'type': 'string', 'path': '"agent_info"."kubernetes"."docker_id"'}}, 'path': '"agent_info"."kubernetes"'}}, 'expression': 'CAST(ROW("file_name", "az", "ec2_instance_id", "private_ip", "hostname", "cluster", "kubernetes") AS ROW("file_name" varchar, "az" varchar, "ec2_instance_id" varchar, "private_ip" varchar, "hostname" varchar, "cluster" varchar, "kubernetes" ROW("pod_name" varchar, "namespace_name" varchar, "container_name" varchar, "docker_id" varchar)))', 'path': '"agent_info"'}), ('event_hour', {'type': 'string', 'partition': True, 'expression': 'date_format(parse_datetime("time", \'YYYY-MM-dd\'\'T\'\'HH:mm:ss.SSSSSSSSSZ\'), \'%Y%m%d%H\')', 'path': '"event_hour"'}), ('__execution_name__', {'type': 'string', 'partition': True, 'expression': "'{{}}'", 'path': '"__execution_name__"'})])}
        assert table_metadata.ignore_partition is False
        
        table_metadata = table_metadata_generator.get_parquet_table_metadata_from_raw(schema=schema, source_type='s3')
        assert isinstance(table_metadata, TableMetaData) is True
        assert table_metadata.schema == {'type': 'object', 'properties': {'host': {'type': 'string', 'path': '"host"'}, '__execution_name__': {'type': 'string', 'partition': True, 'expression': "'{{}}'", 'path': '"__execution_name__"'}}}
        assert table_metadata.ignore_partition is False
        
        # Have timestamp data type and partition key in json schema
        schema = {'type': 'object', 'properties': {'timestamp': {'type': 'timestamp', 'timeKey': True, 'format': 'YYYY-MM-dd\'\'T\'\'HH:mm:ss.SSSSSSSSSZ'}, 'service': {'type': 'string', 'partition': True}}}
        data_format = dataformat.Tsv
        table_properties = {'skip.header.line.count': '2'}
        serialization_properties = {'field.delim': '\t', 'line.delim': '\n'}
        
        table_metadata = table_metadata_generator.get_parquet_table_metadata_from_raw(schema=schema)
        assert isinstance(table_metadata, TableMetaData) is True
        assert table_metadata.schema == {'type': 'object', 'properties': collections.OrderedDict([('time', {'type': 'big_int', 'expression': 'CAST(to_unixtime(parse_datetime("timestamp", \'YYYY-MM-dd\'\'T\'\'HH:mm:ss.SSSSSSSSSZ\')) * 1000 AS bigint)', 'path': '"time"'}), ('timestamp', {'type': 'timestamp', 'expression': 'parse_datetime("timestamp", \'YYYY-MM-dd\'\'T\'\'HH:mm:ss.SSSSSSSSSZ\')', 'path': '"timestamp"'}), ('agent_info', {'type': 'object', 'properties': {'file_name': {'type': 'string', 'path': '"agent_info"."file_name"'}, 'az': {'type': 'string', 'path': '"agent_info"."az"'}, 'ec2_instance_id': {'type': 'string', 'path': '"agent_info"."ec2_instance_id"'}, 'private_ip': {'type': 'string', 'path': '"agent_info"."private_ip"'}, 'hostname': {'type': 'string', 'path': '"agent_info"."hostname"'}, 'cluster': {'type': 'string', 'path': '"agent_info"."cluster"'}, 'kubernetes': {'type': 'object', 'properties': {'pod_name': {'type': 'string', 'path': '"agent_info"."kubernetes"."pod_name"'}, 'namespace_name': {'type': 'string', 'path': '"agent_info"."kubernetes"."namespace_name"'}, 'container_name': {'type': 'string', 'path': '"agent_info"."kubernetes"."container_name"'}, 'docker_id': {'type': 'string', 'path': '"agent_info"."kubernetes"."docker_id"'}}, 'path': '"agent_info"."kubernetes"'}}, 'expression': 'CAST(ROW("file_name", "az", "ec2_instance_id", "private_ip", "hostname", "cluster", "kubernetes") AS ROW("file_name" varchar, "az" varchar, "ec2_instance_id" varchar, "private_ip" varchar, "hostname" varchar, "cluster" varchar, "kubernetes" ROW("pod_name" varchar, "namespace_name" varchar, "container_name" varchar, "docker_id" varchar)))', 'path': '"agent_info"'}), ('event_hour', {'type': 'string', 'partition': True, 'expression': 'date_format(parse_datetime("timestamp", \'YYYY-MM-dd\'\'T\'\'HH:mm:ss.SSSSSSSSSZ\'), \'%Y%m%d%H\')', 'path': '"event_hour"'}), ('service', {'type': 'string', 'partition': True, 'path': '"service"'}), ('__execution_name__', {'type': 'string', 'partition': True, 'expression': "'{{}}'", 'path': '"__execution_name__"'})])}
        assert table_metadata.ignore_partition is False
        
        table_metadata = table_metadata_generator.get_parquet_table_metadata_from_raw(schema=schema, source_type='fluent-bit')
        assert isinstance(table_metadata, TableMetaData) is True
        assert table_metadata.schema == {'type': 'object', 'properties': collections.OrderedDict([('time', {'type': 'big_int', 'expression': 'CAST(to_unixtime(parse_datetime("timestamp", \'YYYY-MM-dd\'\'T\'\'HH:mm:ss.SSSSSSSSSZ\')) * 1000 AS bigint)', 'path': '"time"'}), ('timestamp', {'type': 'timestamp', 'expression': 'parse_datetime("timestamp", \'YYYY-MM-dd\'\'T\'\'HH:mm:ss.SSSSSSSSSZ\')', 'path': '"timestamp"'}), ('agent_info', {'type': 'object', 'properties': {'file_name': {'type': 'string', 'path': '"agent_info"."file_name"'}, 'az': {'type': 'string', 'path': '"agent_info"."az"'}, 'ec2_instance_id': {'type': 'string', 'path': '"agent_info"."ec2_instance_id"'}, 'private_ip': {'type': 'string', 'path': '"agent_info"."private_ip"'}, 'hostname': {'type': 'string', 'path': '"agent_info"."hostname"'}, 'cluster': {'type': 'string', 'path': '"agent_info"."cluster"'}, 'kubernetes': {'type': 'object', 'properties': {'pod_name': {'type': 'string', 'path': '"agent_info"."kubernetes"."pod_name"'}, 'namespace_name': {'type': 'string', 'path': '"agent_info"."kubernetes"."namespace_name"'}, 'container_name': {'type': 'string', 'path': '"agent_info"."kubernetes"."container_name"'}, 'docker_id': {'type': 'string', 'path': '"agent_info"."kubernetes"."docker_id"'}}, 'path': '"agent_info"."kubernetes"'}}, 'expression': 'CAST(ROW("file_name", "az", "ec2_instance_id", "private_ip", "hostname", "cluster", "kubernetes") AS ROW("file_name" varchar, "az" varchar, "ec2_instance_id" varchar, "private_ip" varchar, "hostname" varchar, "cluster" varchar, "kubernetes" ROW("pod_name" varchar, "namespace_name" varchar, "container_name" varchar, "docker_id" varchar)))', 'path': '"agent_info"'}), ('event_hour', {'type': 'string', 'partition': True, 'expression': 'date_format(parse_datetime("timestamp", \'YYYY-MM-dd\'\'T\'\'HH:mm:ss.SSSSSSSSSZ\'), \'%Y%m%d%H\')', 'path': '"event_hour"'}), ('service', {'type': 'string', 'partition': True, 'path': '"service"'}), ('__execution_name__', {'type': 'string', 'partition': True, 'expression': "'{{}}'", 'path': '"__execution_name__"'})])}
        assert table_metadata.ignore_partition is False
        
        table_metadata = table_metadata_generator.get_parquet_table_metadata_from_raw(schema=schema, source_type='s3')
        assert isinstance(table_metadata, TableMetaData) is True
        assert table_metadata.schema == {'type': 'object', 'properties': collections.OrderedDict([('time', {'type': 'big_int', 'expression': 'CAST(to_unixtime(parse_datetime("timestamp", \'YYYY-MM-dd\'\'T\'\'HH:mm:ss.SSSSSSSSSZ\')) * 1000 AS bigint)', 'path': '"time"'}), ('timestamp', {'type': 'timestamp', 'expression': 'parse_datetime("timestamp", \'YYYY-MM-dd\'\'T\'\'HH:mm:ss.SSSSSSSSSZ\')', 'path': '"timestamp"'}), ('event_hour', {'type': 'string', 'partition': True, 'expression': 'date_format(parse_datetime("timestamp", \'YYYY-MM-dd\'\'T\'\'HH:mm:ss.SSSSSSSSSZ\'), \'%Y%m%d%H\')', 'path': '"event_hour"'}), ('service', {'type': 'string', 'partition': True, 'path': '"service"'}), ('__execution_name__', {'type': 'string', 'partition': True, 'expression': "'{{}}'", 'path': '"__execution_name__"'})])}
        assert table_metadata.ignore_partition is False
    
    def test_get_table_metadata(self, mock_s3_context, mock_sqs_context, mock_ddb_context):
        from pipeline_resources_builder.lambda_function import Parameters, TableMetaDataGenerator, TableMetaData, MetaTable
        from pipeline_resources_builder.lambda_function import WAF_RAW, WAF_PARQUET, WAF_METRICS
        from pipeline_resources_builder.lambda_function import ALB_RAW, ALB_PARQUET, ALB_METRICS
        from pipeline_resources_builder.lambda_function import CLOUDFRONT_RAW, CLOUDFRONT_PARQUET, CLOUDFRONT_METRICS
        from pipeline_resources_builder.lambda_function import CLOUDTRAIL_RAW, CLOUDTRAIL_PARQUET, CLOUDTRAIL_METRICS
        from pipeline_resources_builder.lambda_function import VPCFLOW_RAW, VPCFLOW_PARQUET
        
        AWS_DDB_META = MetaTable()

        application_pipeline_id = os.environ["APPLICATION_PIPELINE_ID"]
        application_pipeline_info = AWS_DDB_META.get(meta_name=application_pipeline_id)
        
        create_application_pipeline_event = {'RequestType': 'Create', 'ResourceProperties': {'Resource': 'pipeline', 'Id': application_pipeline_id}}
        
        source = types.SimpleNamespace()
        destination = types.SimpleNamespace()
        
        source.type = 'waf'
        table_metadata_generator = TableMetaDataGenerator(source=source, destination=destination)
        raw, parquet, metrics = table_metadata_generator.get_table_metadata()
        assert raw is WAF_RAW
        assert parquet is WAF_PARQUET
        assert metrics is WAF_METRICS
        
        source.type = 'alb'
        table_metadata_generator = TableMetaDataGenerator(source=source, destination=destination)
        raw, parquet, metrics = table_metadata_generator.get_table_metadata()
        assert raw is ALB_RAW
        assert parquet is ALB_PARQUET
        assert metrics is ALB_METRICS
        
        source.type = 'cloudfront'
        table_metadata_generator = TableMetaDataGenerator(source=source, destination=destination)
        raw, parquet, metrics = table_metadata_generator.get_table_metadata()
        assert raw is CLOUDFRONT_RAW
        assert parquet is CLOUDFRONT_PARQUET
        assert metrics is CLOUDFRONT_METRICS
        
        source.type = 'cloudtrail'
        table_metadata_generator = TableMetaDataGenerator(source=source, destination=destination)
        raw, parquet, metrics = table_metadata_generator.get_table_metadata()
        assert raw is CLOUDTRAIL_RAW
        assert parquet is CLOUDTRAIL_PARQUET
        assert metrics is CLOUDTRAIL_METRICS
        
        source.type = 'vpcflow'
        table_metadata_generator = TableMetaDataGenerator(source=source, destination=destination)
        raw, parquet, metrics = table_metadata_generator.get_table_metadata()
        assert raw is VPCFLOW_RAW
        assert parquet is VPCFLOW_PARQUET
        assert metrics is None
        
        # source type is 'fluent-bit'
        event = copy.deepcopy(create_application_pipeline_event)
        param = Parameters(event)

        table_metadata_generator = TableMetaDataGenerator(source=param.pipeline_info.source, destination=param.pipeline_info.destination)
        raw, parquet, metrics = table_metadata_generator.get_table_metadata()
        assert isinstance(raw, TableMetaData) is True
        assert raw.schema == {
            'type': 'object', 
            'properties': {
                'timestamp': {
                    'type': 'string', 
                    'timeKey': True, 
                    'format': 'YYYY-MM-dd\'\'T\'\'HH:mm:ss.SSSSSSSSSZ', 
                    'path': '"timestamp"'
                    }, 
                'correlationId': {
                    'type': 'string', 
                    'path': '"correlationId"'
                    }, 
                'processInfo': {
                    'type': 'object', 
                    'properties': {
                        'hostname': {
                            'type': 'string', 
                            'path': '"processInfo"."hostname"'
                            }, 
                        'domainId': {
                            'type': 'string', 
                            'path': '"processInfo"."domainId"'
                            }, 
                        'groupId': {
                            'type': 'string', 
                            'path': '"processInfo"."groupId"'
                            }, 
                        'groupName': {
                            'type': 'string', 
                            'path': '"processInfo"."groupName"'
                            }, 
                        'serviceId': {
                            'type': 'string', 
                            'partition': True, 
                            'path': '"processInfo"."serviceId"'
                            }, 
                        'serviceName': {
                            'type': 'string', 
                            'path': '"processInfo"."serviceName"'
                            }, 
                        'version': {
                            'type': 'string', 
                            'path': '"processInfo"."version"'
                            }
                        }, 
                    'path': '"processInfo"'
                    }, 
                'transactionSummary': {
                    'type': 'object', 
                    'properties': {
                        'path': {
                            'type': 'string', 
                            'path': '"transactionSummary"."path"'
                            }, 
                        'protocol': {
                            'type': 'string', 
                            'path': '"transactionSummary"."protocol"'
                            }, 
                        'protocolSrc': {
                            'type': 'string', 
                            'path': '"transactionSummary"."protocolSrc"'
                            }, 
                        'status': {
                            'type': 'string', 
                            'path': '"transactionSummary"."status"'
                            }, 
                        'serviceContexts': {
                            'type': 'array', 
                            'items': {
                                'type': 'object', 
                                'properties': {
                                    'service': {'type': 'string'}, 
                                    'monitor': {'type': 'boolean'}, 
                                    'client': {'type': 'string'}, 
                                    'org': {}, 
                                    'app': {}, 
                                    'method': {'type': 'string'}, 
                                    'status': {'type': 'string'}, 
                                    'duration': {'type': 'number'}
                                    }
                                }, 
                            'path': '"transactionSummary"."serviceContexts"'}
                        }, 
                    'path': '"transactionSummary"'
                    }, 
                'file_name': {'type': 'string', 'path': '"file_name"'}, 
                'az': {'type': 'string', 'path': '"az"'}, 
                'ec2_instance_id': {'type': 'string', 'path': '"ec2_instance_id"'}, 
                'private_ip': {'type': 'string', 'path': '"private_ip"'}, 
                'hostname': {'type': 'string', 'path': '"hostname"'}, 
                'cluster': {'type': 'string', 'path': '"cluster"'},
                'kubernetes': {
                    'type': 'object', 
                    'properties': {
                        'pod_name': {'type': 'string', 'path': '"kubernetes"."pod_name"'}, 
                        'namespace_name': {'type': 'string', 'path': '"kubernetes"."namespace_name"'}, 
                        'container_name': {'type': 'string', 'path': '"kubernetes"."container_name"'}, 
                        'docker_id': {'type': 'string', 'path': '"kubernetes"."docker_id"'}
                        }, 
                    'path': '"kubernetes"'
                    },
                }
            }
        assert isinstance(parquet, TableMetaData) is True
        assert parquet.schema == {
            'type': 'object',
            'properties': {
                'time': {
                    'type': 'big_int',
                    'expression': 'CAST(to_unixtime(parse_datetime("timestamp", \'YYYY-MM-dd\'\'T\'\'HH:mm:ss.SSSSSSSSSZ\')) * 1000 AS bigint)',
                    'path': '"time"'
                },
                'timestamp': {
                    'type': 'timestamp',
                    'expression': 'parse_datetime("timestamp", \'YYYY-MM-dd\'\'T\'\'HH:mm:ss.SSSSSSSSSZ\')',
                    'path': '"timestamp"'
                },
                'correlationId': {
                    'type': 'string',
                    'path': '"correlationId"'
                },
                'processInfo': {
                    'type': 'object',
                    'properties': {
                        'hostname': {
                            'type': 'string',
                            'path': '"processInfo"."hostname"'
                        },
                        'domainId': {
                            'type': 'string',
                            'path': '"processInfo"."domainId"'
                        },
                        'groupId': {
                            'type': 'string',
                            'path': '"processInfo"."groupId"'
                        },
                        'groupName': {
                            'type': 'string',
                            'path': '"processInfo"."groupName"'
                        },
                        'serviceId': {
                            'type': 'string',
                            'partition': True,
                            'path': '"processInfo"."serviceId"'
                        },
                        'serviceName': {
                            'type': 'string',
                            'path': '"processInfo"."serviceName"'
                        },
                        'version': {
                            'type': 'string',
                            'path': '"processInfo"."version"'
                        }
                    },
                    'path': '"processInfo"'
                },
                'transactionSummary': {
                    'type': 'object',
                    'properties': {
                        'path': {
                            'type': 'string',
                            'path': '"transactionSummary"."path"'
                        },
                        'protocol': {
                            'type': 'string',
                            'path': '"transactionSummary"."protocol"'
                        },
                        'protocolSrc': {
                            'type': 'string',
                            'path': '"transactionSummary"."protocolSrc"'
                        },
                        'status': {
                            'type': 'string',
                            'path': '"transactionSummary"."status"'
                        },
                        'serviceContexts': {
                            'type': 'array',
                            'items': {
                                'type': 'object',
                                'properties': {
                                    'service': {
                                        'type': 'string'
                                    },
                                    'monitor': {
                                        'type': 'boolean'
                                    },
                                    'client': {
                                        'type': 'string'
                                    },
                                    'org': {},
                                    'app': {},
                                    'method': {
                                        'type': 'string'
                                    },
                                    'status': {
                                        'type': 'string'
                                    },
                                    'duration': {
                                        'type': 'number'
                                    }
                                }
                            },
                            'path': '"transactionSummary"."serviceContexts"'
                        }
                    },
                    'path': '"transactionSummary"'
                },
                'agent_info': {
                    'type': 'object',
                    'properties': {
                        'file_name': {
                            'type': 'string',
                            'path': '"agent_info"."file_name"'
                        },
                        'az': {
                            'type': 'string',
                            'path': '"agent_info"."az"'
                        },
                        'ec2_instance_id': {
                            'type': 'string',
                            'path': '"agent_info"."ec2_instance_id"'
                        },
                        'private_ip': {
                            'type': 'string',
                            'path': '"agent_info"."private_ip"'
                        },
                        'hostname': {
                            'type': 'string',
                            'path': '"agent_info"."hostname"'
                        },
                        'cluster': {
                            'type': 'string',
                            'path': '"agent_info"."cluster"'
                        },
                        'kubernetes': {
                            'type': 'object', 
                            'properties': {
                                'pod_name': {'type': 'string', 'path': '"agent_info"."kubernetes"."pod_name"'}, 
                                'namespace_name': {'type': 'string', 'path': '"agent_info"."kubernetes"."namespace_name"'}, 
                                'container_name': {'type': 'string', 'path': '"agent_info"."kubernetes"."container_name"'}, 
                                'docker_id': {'type': 'string', 'path': '"agent_info"."kubernetes"."docker_id"'}
                            }, 
                            'path': '"agent_info"."kubernetes"'
                        },
                    },
                    'expression': 'CAST(ROW("file_name", "az", "ec2_instance_id", "private_ip", "hostname", "cluster", "kubernetes") AS ROW("file_name" varchar, "az" varchar, "ec2_instance_id" varchar, "private_ip" varchar, "hostname" varchar, "cluster" varchar, "kubernetes" ROW("pod_name" varchar, "namespace_name" varchar, "container_name" varchar, "docker_id" varchar)))',
                    'path': '"agent_info"'
                },
                'event_hour': {
                    'type': 'string',
                    'partition': True,
                    'expression': 'date_format(parse_datetime("timestamp", \'YYYY-MM-dd\'\'T\'\'HH:mm:ss.SSSSSSSSSZ\'), \'%Y%m%d%H\')',
                    'path': '"event_hour"'
                },
                'serviceId': {
                    'type': 'string',
                    'partition': True,
                    'path': '"processInfo"."serviceId"'
                },
                '__execution_name__': {
                    'type': 'string',
                    'partition': True,
                    'expression': '\'{{}}\'',
                    'path': '"__execution_name__"'
                }
            }
        }
        assert metrics is None
        
        pipeline_id = str(uuid.uuid4())
        pipeline_info = copy.deepcopy(application_pipeline_info)
        pipeline_info['data']['destination']['table']['schema'] = json.dumps({
            'type': 'object',
            'properties': {
                'time': {
                    'type': 'big_int',
                    'expression': 'CAST(to_unixtime(parse_datetime("timestamp", \'YYYY-MM-dd\'\'T\'\'HH:mm:ss.SSSSSSSSSZ\')) * 1000 AS bigint)',
                },
                'timestamp': {
                    'type': 'timestamp',
                    'expression': 'parse_datetime("timestamp", \'YYYY-MM-dd\'\'T\'\'HH:mm:ss.SSSSSSSSSZ\')',
                },
                'type': {
                    'type': 'string'
                },
                'elb': {
                    'type': 'string',
                    'partition': True
                },
                'client_ip': {
                    'type': 'string'
                },
                'client_port': {
                    'type': 'integer'
                },
                'target_ip': {
                    'type': 'string'
                },
                'target_port': {
                    'type': 'integer'
                },
                'event_hour': {
                    'type': 'string',
                    'partition': True,
                    'expression': 'date_format(parse_datetime("timestamp", \'YYYY-MM-dd\'\'T\'\'HH:mm:ss.SSSSSSSSSZ\'), \'%Y%m%d%H\')',
                },
                '__execution_name__': {
                    'type': 'string',
                    'partition': True,
                    'expression': "'{{}}'"
                }
            }
        })
        
        pipeline_info['data']['destination']['metrics']['schema'] = json.dumps({
            'type': 'object',
            'properties': {
                'time': {
                    'type': 'big_int',
                    'expression': '''FLOOR("time" / 60000) * 60000''',
                },
                'timestamp': {
                    'type': 'timestamp',
                    'expression': '''DATE_TRUNC('minute', "timestamp")'''
                },
                'type': {
                    'type': 'string'
                },
                'request_host': {
                    'type': 'string',
                    'expression': '''url_extract_host("request_url")''',
                },
                'requests': {
                    'type': 'big_int',
                    'measure': True,
                    'expression': '''CAST(COUNT(1) AS bigint)''',
                },
                'event_hour': {
                    'type': 'string',
                    'partition': True,
                },
                '__execution_name__': {
                    'type': 'string',
                    'partition': True,
                }
            }
        })
        
        AWS_DDB_META.put(meta_name=pipeline_id, item=pipeline_info)
        
        event = copy.deepcopy(create_application_pipeline_event)
        event['ResourceProperties']['Id'] = pipeline_id
        param = Parameters(event)
        
        table_metadata_generator = TableMetaDataGenerator(source=param.pipeline_info.source, destination=param.pipeline_info.destination)
        raw, parquet, metrics = table_metadata_generator.get_table_metadata()
        assert isinstance(raw, TableMetaData) is True
        assert raw.schema == {
            'type': 'object', 
            'properties': {
                'timestamp': {
                    'type': 'string', 
                    'timeKey': True, 
                    'format': 'YYYY-MM-dd\'\'T\'\'HH:mm:ss.SSSSSSSSSZ', 
                    'path': '"timestamp"'
                    }, 
                'correlationId': {
                    'type': 'string', 
                    'path': '"correlationId"'
                    }, 
                'processInfo': {
                    'type': 'object', 
                    'properties': {
                        'hostname': {
                            'type': 'string', 
                            'path': '"processInfo"."hostname"'
                            }, 
                        'domainId': {
                            'type': 'string', 
                            'path': '"processInfo"."domainId"'
                            }, 
                        'groupId': {
                            'type': 'string', 
                            'path': '"processInfo"."groupId"'
                            }, 
                        'groupName': {
                            'type': 'string', 
                            'path': '"processInfo"."groupName"'
                            }, 
                        'serviceId': {
                            'type': 'string', 
                            'partition': True, 
                            'path': '"processInfo"."serviceId"'
                            }, 
                        'serviceName': {
                            'type': 'string', 
                            'path': '"processInfo"."serviceName"'
                            }, 
                        'version': {
                            'type': 'string', 
                            'path': '"processInfo"."version"'
                            }
                        }, 
                    'path': '"processInfo"'
                    }, 
                'transactionSummary': {
                    'type': 'object', 
                    'properties': {
                        'path': {
                            'type': 'string', 
                            'path': '"transactionSummary"."path"'
                            }, 
                        'protocol': {
                            'type': 'string', 
                            'path': '"transactionSummary"."protocol"'
                            }, 
                        'protocolSrc': {
                            'type': 'string', 
                            'path': '"transactionSummary"."protocolSrc"'
                            }, 
                        'status': {
                            'type': 'string', 
                            'path': '"transactionSummary"."status"'
                            }, 
                        'serviceContexts': {
                            'type': 'array', 
                            'items': {
                                'type': 'object', 
                                'properties': {
                                    'service': {'type': 'string'}, 
                                    'monitor': {'type': 'boolean'}, 
                                    'client': {'type': 'string'}, 
                                    'org': {}, 
                                    'app': {}, 
                                    'method': {'type': 'string'}, 
                                    'status': {'type': 'string'}, 
                                    'duration': {'type': 'number'}
                                    }
                                }, 
                            'path': '"transactionSummary"."serviceContexts"'}
                        }, 
                    'path': '"transactionSummary"'
                    }, 
                'file_name': {'type': 'string', 'path': '"file_name"'}, 
                'az': {'type': 'string', 'path': '"az"'}, 
                'ec2_instance_id': {'type': 'string', 'path': '"ec2_instance_id"'}, 
                'private_ip': {'type': 'string', 'path': '"private_ip"'}, 
                'hostname': {'type': 'string', 'path': '"hostname"'}, 
                'cluster': {'type': 'string', 'path': '"cluster"'},
                'kubernetes': {
                    'type': 'object', 
                    'properties': {
                        'pod_name': {'type': 'string', 'path': '"kubernetes"."pod_name"'}, 
                        'namespace_name': {'type': 'string', 'path': '"kubernetes"."namespace_name"'}, 
                        'container_name': {'type': 'string', 'path': '"kubernetes"."container_name"'}, 
                        'docker_id': {'type': 'string', 'path': '"kubernetes"."docker_id"'}
                        }, 
                    'path': '"kubernetes"'
                    },
                }
            }        
        assert isinstance(parquet, TableMetaData) is True
        assert parquet.schema == {
            'type': 'object',
            'properties': {
                'time': {
                    'type': 'big_int',
                    'expression': 'CAST(to_unixtime(parse_datetime("timestamp", \'YYYY-MM-dd\'\'T\'\'HH:mm:ss.SSSSSSSSSZ\')) * 1000 AS bigint)',
                    'path': '"time"'
                },
                'timestamp': {
                    'type': 'timestamp',
                    'expression': 'parse_datetime("timestamp", \'YYYY-MM-dd\'\'T\'\'HH:mm:ss.SSSSSSSSSZ\')',
                    'path': '"timestamp"'
                },
                'type': {
                    'type': 'string',
                    'path': '"type"'
                },
                'elb': {
                    'type': 'string',
                    'partition': True,
                    'path': '"elb"'
                },
                'client_ip': {
                    'type': 'string',
                    'path': '"client_ip"'
                },
                'client_port': {
                    'type': 'integer',
                    'path': '"client_port"'
                },
                'target_ip': {
                    'type': 'string',
                    'path': '"target_ip"'
                },
                'target_port': {
                    'type': 'integer',
                    'path': '"target_port"'
                },
                'event_hour': {
                    'type': 'string',
                    'partition': True,
                    'expression': 'date_format(parse_datetime("timestamp", \'YYYY-MM-dd\'\'T\'\'HH:mm:ss.SSSSSSSSSZ\'), \'%Y%m%d%H\')',
                    'path': '"event_hour"'
                },
                '__execution_name__': {
                    'type': 'string',
                    'partition': True,
                    'expression': '\'{{}}\'',
                    'path': '"__execution_name__"'
                }
            }
        }
        assert isinstance(metrics, TableMetaData) is True
        assert metrics.schema == { # type: ignore
            'type': 'object',
            'properties': {
                'time': {
                    'type': 'big_int',
                    'expression': 'FLOOR("time" / 60000) * 60000',
                    'path': '"time"'
                },
                'timestamp': {
                    'type': 'timestamp',
                    'expression': 'DATE_TRUNC(\'minute\', "timestamp")',
                    'path': '"timestamp"'
                },
                'type': {
                    'type': 'string',
                    'path': '"type"'
                },
                'request_host': {
                    'type': 'string',
                    'expression': 'url_extract_host("request_url")',
                    'path': '"request_host"'
                },
                'requests': {
                    'type': 'big_int',
                    'measure': True,
                    'expression': 'CAST(COUNT(1) AS bigint)',
                    'path': '"requests"'
                },
                'event_hour': {
                    'type': 'string',
                    'partition': True,
                    'path': '"event_hour"'
                },
                '__execution_name__': {
                    'type': 'string',
                    'partition': True,
                    'path': '"__execution_name__"'
                }
            }
        }
        
        # source type is 's3'
        pipeline_id = str(uuid.uuid4())
        pipeline_info = copy.deepcopy(application_pipeline_info)
        pipeline_info['data']['source']['type'] = 's3'
        
        AWS_DDB_META.put(meta_name=pipeline_id, item=pipeline_info)
        
        event = copy.deepcopy(create_application_pipeline_event)
        event['ResourceProperties']['Id'] = pipeline_id
        param = Parameters(event)
        
        table_metadata_generator = TableMetaDataGenerator(source=param.pipeline_info.source, destination=param.pipeline_info.destination)
        raw, parquet, metrics = table_metadata_generator.get_table_metadata()
        assert isinstance(raw, TableMetaData) is True
        assert raw.schema == {
            'type': 'object', 
            'properties': {
                'timestamp': {
                    'type': 'string', 
                    'timeKey': True, 
                    'format': 'YYYY-MM-dd\'\'T\'\'HH:mm:ss.SSSSSSSSSZ', 
                    'path': '"timestamp"'
                    }, 
                'correlationId': {
                    'type': 'string', 
                    'path': '"correlationId"'
                    }, 
                'processInfo': {
                    'type': 'object', 
                    'properties': {
                        'hostname': {
                            'type': 'string', 
                            'path': '"processInfo"."hostname"'
                            }, 
                        'domainId': {
                            'type': 'string', 
                            'path': '"processInfo"."domainId"'
                            }, 
                        'groupId': {
                            'type': 'string', 
                            'path': '"processInfo"."groupId"'
                            }, 
                        'groupName': {
                            'type': 'string', 
                            'path': '"processInfo"."groupName"'
                            }, 
                        'serviceId': {
                            'type': 'string', 
                            'partition': True, 
                            'path': '"processInfo"."serviceId"'
                            }, 
                        'serviceName': {
                            'type': 'string', 
                            'path': '"processInfo"."serviceName"'
                            }, 
                        'version': {
                            'type': 'string', 
                            'path': '"processInfo"."version"'
                            }
                        }, 
                    'path': '"processInfo"'
                    }, 
                'transactionSummary': {
                    'type': 'object', 
                    'properties': {
                        'path': {
                            'type': 'string', 
                            'path': '"transactionSummary"."path"'
                            }, 
                        'protocol': {
                            'type': 'string', 
                            'path': '"transactionSummary"."protocol"'
                            }, 
                        'protocolSrc': {
                            'type': 'string', 
                            'path': '"transactionSummary"."protocolSrc"'
                            }, 
                        'status': {
                            'type': 'string', 
                            'path': '"transactionSummary"."status"'
                            }, 
                        'serviceContexts': {
                            'type': 'array', 
                            'items': {
                                'type': 'object', 
                                'properties': {
                                    'service': {'type': 'string'}, 
                                    'monitor': {'type': 'boolean'}, 
                                    'client': {'type': 'string'}, 
                                    'org': {}, 
                                    'app': {}, 
                                    'method': {'type': 'string'}, 
                                    'status': {'type': 'string'}, 
                                    'duration': {'type': 'number'}
                                    }
                                }, 
                            'path': '"transactionSummary"."serviceContexts"'}
                        }, 
                    'path': '"transactionSummary"'
                    }
                }
            }
        assert isinstance(parquet, TableMetaData) is True
        assert parquet.schema == {
            'type': 'object',
            'properties': {
                'time': {
                    'type': 'big_int',
                    'expression': 'CAST(to_unixtime(parse_datetime("timestamp", \'YYYY-MM-dd\'\'T\'\'HH:mm:ss.SSSSSSSSSZ\')) * 1000 AS bigint)',
                    'path': '"time"'
                },
                'timestamp': {
                    'type': 'timestamp',
                    'expression': 'parse_datetime("timestamp", \'YYYY-MM-dd\'\'T\'\'HH:mm:ss.SSSSSSSSSZ\')',
                    'path': '"timestamp"'
                },
                'correlationId': {
                    'type': 'string',
                    'path': '"correlationId"'
                },
                'processInfo': {
                    'type': 'object',
                    'properties': {
                        'hostname': {
                            'type': 'string',
                            'path': '"processInfo"."hostname"'
                        },
                        'domainId': {
                            'type': 'string',
                            'path': '"processInfo"."domainId"'
                        },
                        'groupId': {
                            'type': 'string',
                            'path': '"processInfo"."groupId"'
                        },
                        'groupName': {
                            'type': 'string',
                            'path': '"processInfo"."groupName"'
                        },
                        'serviceId': {
                            'type': 'string',
                            'partition': True,
                            'path': '"processInfo"."serviceId"'
                        },
                        'serviceName': {
                            'type': 'string',
                            'path': '"processInfo"."serviceName"'
                        },
                        'version': {
                            'type': 'string',
                            'path': '"processInfo"."version"'
                        }
                    },
                    'path': '"processInfo"'
                },
                'transactionSummary': {
                    'type': 'object',
                    'properties': {
                        'path': {
                            'type': 'string',
                            'path': '"transactionSummary"."path"'
                        },
                        'protocol': {
                            'type': 'string',
                            'path': '"transactionSummary"."protocol"'
                        },
                        'protocolSrc': {
                            'type': 'string',
                            'path': '"transactionSummary"."protocolSrc"'
                        },
                        'status': {
                            'type': 'string',
                            'path': '"transactionSummary"."status"'
                        },
                        'serviceContexts': {
                            'type': 'array',
                            'items': {
                                'type': 'object',
                                'properties': {
                                    'service': {
                                        'type': 'string'
                                    },
                                    'monitor': {
                                        'type': 'boolean'
                                    },
                                    'client': {
                                        'type': 'string'
                                    },
                                    'org': {},
                                    'app': {},
                                    'method': {
                                        'type': 'string'
                                    },
                                    'status': {
                                        'type': 'string'
                                    },
                                    'duration': {
                                        'type': 'number'
                                    }
                                }
                            },
                            'path': '"transactionSummary"."serviceContexts"'
                        }
                    },
                    'path': '"transactionSummary"'
                },
                'event_hour': {
                    'type': 'string',
                    'partition': True,
                    'expression': 'date_format(parse_datetime("timestamp", \'YYYY-MM-dd\'\'T\'\'HH:mm:ss.SSSSSSSSSZ\'), \'%Y%m%d%H\')',
                    'path': '"event_hour"'
                },
                'serviceId': {
                    'type': 'string',
                    'partition': True,
                    'path': '"processInfo"."serviceId"'
                },
                '__execution_name__': {
                    'type': 'string',
                    'partition': True,
                    'expression': '\'{{}}\'',
                    'path': '"__execution_name__"'
                }
            }
        }
        assert metrics is None
        
        pipeline_id = str(uuid.uuid4())
        pipeline_info = copy.deepcopy(application_pipeline_info)
        pipeline_info['data']['source']['type'] = 's3'
        
        pipeline_info['data']['destination']['table']['schema'] = json.dumps({
            'type': 'object',
            'properties': {
                'time': {
                    'type': 'big_int',
                    'expression': 'CAST(to_unixtime(parse_datetime("time", \'YYYY-MM-dd\'\'T\'\'HH:mm:ss.SSSSSSSSSZ\')) * 1000 AS bigint)',
                },
                'timestamp': {
                    'type': 'timestamp',
                    'expression': 'parse_datetime("time", \'YYYY-MM-dd\'\'T\'\'HH:mm:ss.SSSSSSSSSZ\')',
                },
                'type': {
                    'type': 'string'
                },
                'elb': {
                    'type': 'string',
                    'partition': True
                },
                'client_ip': {
                    'type': 'string'
                },
                'client_port': {
                    'type': 'integer'
                },
                'target_ip': {
                    'type': 'string'
                },
                'target_port': {
                    'type': 'integer'
                },
                'event_hour': {
                    'type': 'string',
                    'partition': True,
                    'expression': 'date_format(parse_datetime("time", \'YYYY-MM-dd\'\'T\'\'HH:mm:ss.SSSSSSSSSZ\'), \'%Y%m%d%H\')',
                },
                '__execution_name__': {
                    'type': 'string',
                    'partition': True,
                    'expression': "'{{}}'"
                }
            }
        })
        
        pipeline_info['data']['destination']['metrics']['schema'] = json.dumps({
            'type': 'object',
            'properties': {
                'time': {
                    'type': 'big_int',
                    'expression': '''FLOOR("time" / 60000) * 60000''',
                },
                'timestamp': {
                    'type': 'timestamp',
                    'expression': '''DATE_TRUNC('minute', "timestamp")'''
                },
                'type': {
                    'type': 'string'
                },
                'request_host': {
                    'type': 'string',
                    'expression': '''url_extract_host("request_url")''',
                },
                'requests': {
                    'type': 'big_int',
                    'measure': True,
                    'expression': '''CAST(COUNT(1) AS bigint)''',
                },
                'event_hour': {
                    'type': 'string',
                    'partition': True,
                },
                '__execution_name__': {
                    'type': 'string',
                    'partition': True,
                }
            }
        })
        
        AWS_DDB_META.put(meta_name=pipeline_id, item=pipeline_info)
        
        event = copy.deepcopy(create_application_pipeline_event)
        event['ResourceProperties']['Id'] = pipeline_id
        param = Parameters(event)
        
        table_metadata_generator = TableMetaDataGenerator(source=param.pipeline_info.source, destination=param.pipeline_info.destination)
        raw, parquet, metrics = table_metadata_generator.get_table_metadata()
        assert isinstance(raw, TableMetaData) is True
        assert raw.schema == {
            'type': 'object', 
            'properties': {
                'timestamp': {
                    'type': 'string', 
                    'timeKey': True, 
                    'format': 'YYYY-MM-dd\'\'T\'\'HH:mm:ss.SSSSSSSSSZ', 
                    'path': '"timestamp"'
                    }, 
                'correlationId': {
                    'type': 'string', 
                    'path': '"correlationId"'
                    }, 
                'processInfo': {
                    'type': 'object', 
                    'properties': {
                        'hostname': {
                            'type': 'string', 
                            'path': '"processInfo"."hostname"'
                            }, 
                        'domainId': {
                            'type': 'string', 
                            'path': '"processInfo"."domainId"'
                            }, 
                        'groupId': {
                            'type': 'string', 
                            'path': '"processInfo"."groupId"'
                            }, 
                        'groupName': {
                            'type': 'string', 
                            'path': '"processInfo"."groupName"'
                            }, 
                        'serviceId': {
                            'type': 'string', 
                            'partition': True, 
                            'path': '"processInfo"."serviceId"'
                            }, 
                        'serviceName': {
                            'type': 'string', 
                            'path': '"processInfo"."serviceName"'
                            }, 
                        'version': {
                            'type': 'string', 
                            'path': '"processInfo"."version"'
                            }
                        }, 
                    'path': '"processInfo"'
                    }, 
                'transactionSummary': {
                    'type': 'object', 
                    'properties': {
                        'path': {
                            'type': 'string', 
                            'path': '"transactionSummary"."path"'
                            }, 
                        'protocol': {
                            'type': 'string', 
                            'path': '"transactionSummary"."protocol"'
                            }, 
                        'protocolSrc': {
                            'type': 'string', 
                            'path': '"transactionSummary"."protocolSrc"'
                            }, 
                        'status': {
                            'type': 'string', 
                            'path': '"transactionSummary"."status"'
                            }, 
                        'serviceContexts': {
                            'type': 'array', 
                            'items': {
                                'type': 'object', 
                                'properties': {
                                    'service': {'type': 'string'}, 
                                    'monitor': {'type': 'boolean'}, 
                                    'client': {'type': 'string'}, 
                                    'org': {}, 
                                    'app': {}, 
                                    'method': {'type': 'string'}, 
                                    'status': {'type': 'string'}, 
                                    'duration': {'type': 'number'}
                                    }
                                }, 
                            'path': '"transactionSummary"."serviceContexts"'}
                        }, 
                    'path': '"transactionSummary"'
                    }
                }
            }        
        assert isinstance(parquet, TableMetaData) is True
        assert parquet.schema == {
            'type': 'object',
            'properties': {
                'time': {
                    'type': 'big_int',
                    'expression': 'CAST(to_unixtime(parse_datetime("time", \'YYYY-MM-dd\'\'T\'\'HH:mm:ss.SSSSSSSSSZ\')) * 1000 AS bigint)',
                    'path': '"time"'
                },
                'timestamp': {
                    'type': 'timestamp',
                    'expression': 'parse_datetime("time", \'YYYY-MM-dd\'\'T\'\'HH:mm:ss.SSSSSSSSSZ\')',
                    'path': '"timestamp"'
                },
                'type': {
                    'type': 'string',
                    'path': '"type"'
                },
                'elb': {
                    'type': 'string',
                    'partition': True,
                    'path': '"elb"'
                },
                'client_ip': {
                    'type': 'string',
                    'path': '"client_ip"'
                },
                'client_port': {
                    'type': 'integer',
                    'path': '"client_port"'
                },
                'target_ip': {
                    'type': 'string',
                    'path': '"target_ip"'
                },
                'target_port': {
                    'type': 'integer',
                    'path': '"target_port"'
                },
                'event_hour': {
                    'type': 'string',
                    'partition': True,
                    'expression': 'date_format(parse_datetime("time", \'YYYY-MM-dd\'\'T\'\'HH:mm:ss.SSSSSSSSSZ\'), \'%Y%m%d%H\')',
                    'path': '"event_hour"'
                },
                '__execution_name__': {
                    'type': 'string',
                    'partition': True,
                    'expression': '\'{{}}\'',
                    'path': '"__execution_name__"'
                }
            }
        }
        assert isinstance(metrics, TableMetaData) is True
        assert metrics.schema == { # type: ignore
            'type': 'object',
            'properties': {
                'time': {
                    'type': 'big_int',
                    'expression': 'FLOOR("time" / 60000) * 60000',
                    'path': '"time"'
                },
                'timestamp': {
                    'type': 'timestamp',
                    'expression': 'DATE_TRUNC(\'minute\', "timestamp")',
                    'path': '"timestamp"'
                },
                'type': {
                    'type': 'string',
                    'path': '"type"'
                },
                'request_host': {
                    'type': 'string',
                    'expression': 'url_extract_host("request_url")',
                    'path': '"request_host"'
                },
                'requests': {
                    'type': 'big_int',
                    'measure': True,
                    'expression': 'CAST(COUNT(1) AS bigint)',
                    'path': '"requests"'
                },
                'event_hour': {
                    'type': 'string',
                    'partition': True,
                    'path': '"event_hour"'
                },
                '__execution_name__': {
                    'type': 'string',
                    'partition': True,
                    'path': '"__execution_name__"'
                }
            }
        }
    
    def test_get_table_metadata_and_statements_waf(self, mock_s3_context, mock_iam_context, mock_sqs_context, mock_ddb_context):
        from pipeline_resources_builder.lambda_function import Parameters, TableMetaDataGenerator
        from pipeline_resources_builder.lambda_function import WAF_RAW, WAF_PARQUET, WAF_METRICS
        
        waf_pipeline_id = os.environ["WAF_PIPELINE_ID"]
        
        create_waf_pipeline_event = {'RequestType': 'Create', 'ResourceProperties': {'Resource': 'pipeline', 'Id': waf_pipeline_id}}
        
        # waf
        event = copy.deepcopy(create_waf_pipeline_event)
        param = Parameters(event)
        
        table_metadata_generator = TableMetaDataGenerator(source=param.pipeline_info.source, destination=param.pipeline_info.destination)
        raw, parquet, metrics, statements = table_metadata_generator.get_table_metadata_and_statements()
        assert raw is WAF_RAW
        assert parquet is WAF_PARQUET
        assert metrics is WAF_METRICS
        assert statements.create == "CREATE EXTERNAL TABLE IF NOT EXISTS `tmp`.`waf{}` (`timestamp` bigint, `formatversion` int, `webaclid` string, `terminatingruleid` string, `terminatingruletype` string, `action` string, `terminatingrulematchdetails` array<struct<`conditiontype`:string,`sensitivitylevel`:string,`location`:string,`matcheddata`:array<string>>>, `httpsourcename` string, `httpsourceid` string, `rulegrouplist` array<struct<`rulegroupid`:string,`terminatingrule`:struct<`ruleid`:string,`action`:string,`rulematchdetails`:array<struct<`conditiontype`:string,`sensitivitylevel`:string,`location`:string,`matcheddata`:array<string>>>>,`nonterminatingmatchingrules`:array<struct<`ruleid`:string,`action`:string,`rulematchdetails`:array<struct<`conditiontype`:string,`sensitivitylevel`:string,`location`:string,`matcheddata`:array<string>>>>>,`excludedrules`:string>>, `ratebasedrulelist` array<struct<`ratebasedruleid`:string,`limitkey`:string,`maxrateallowed`:int>>, `nonterminatingmatchingrules` array<struct<`ruleid`:string,`action`:string,`rulematchdetails`:array<struct<`conditiontype`:string,`sensitivitylevel`:string,`location`:string,`matcheddata`:array<string>>>,`captcharesponse`:struct<`responsecode`:string,`solvetimestamp`:string>>>, `requestheadersinserted` array<struct<`name`:string,`value`:string>>, `responsecodesent` string, `httprequest` struct<`clientip`:string,`country`:string,`headers`:array<struct<`name`:string,`value`:string>>,`uri`:string,`args`:string,`httpversion`:string,`httpmethod`:string,`requestid`:string>, `labels` array<struct<`name`:string>>, `captcharesponse` struct<`responsecode`:string,`solvetimestamp`:string,`failureReason`:string>)  ROW FORMAT SERDE 'org.openx.data.jsonserde.JsonSerDe'  STORED AS INPUTFORMAT 'org.apache.hadoop.mapred.TextInputFormat' OUTPUTFORMAT 'org.apache.hadoop.hive.ql.io.HiveIgnoreKeyTextOutputFormat' LOCATION '{}' ;"
        assert statements.insert == """INSERT INTO "centralized"."waf" ("time", "timestamp", "formatversion", "webaclid", "webaclname", "terminatingruleid", "terminatingruletype", "action", "terminatingrulematchdetails", "httpsourcename", "httpsourceid", "rulegrouplist", "ratebasedrulelist", "nonterminatingmatchingrules", "requestheadersinserted", "responsecodesent", "httprequest", "labels", "captcharesponse", "account_id", "region", "event_hour", "__execution_name__") SELECT "timestamp", CAST(FROM_UNIXTIME("timestamp" / 1000) AS timestamp), "formatversion", "webaclid", SPLIT("webaclid", '/')[3], "terminatingruleid", "terminatingruletype", "action", "terminatingrulematchdetails", "httpsourcename", "httpsourceid", "rulegrouplist", "ratebasedrulelist", "nonterminatingmatchingrules", "requestheadersinserted", "responsecodesent", "httprequest", "labels", "captcharesponse", SPLIT("webaclid", ':')[5], SPLIT("webaclid", ':')[4], DATE_FORMAT(CAST(FROM_UNIXTIME("timestamp" / 1000) AS timestamp), '%Y%m%d%H'), '{}' FROM "tmp"."waf{}";"""
        assert statements.drop == 'DROP TABLE IF EXISTS `tmp`.`waf{}`'
        assert statements.aggregate == ['INSERT INTO "centralized"."waf_metrics" ("time", "timestamp", "action", "webaclid", "webaclname", "terminatingruleid", "terminatingruletype", "httpsourceid", "httpmethod", "country", "clientip", "uri", "first_label", "requests", "account_id", "region", "event_hour", "__execution_name__") SELECT FLOOR("time" / 60000) * 60000, DATE_TRUNC(\'minute\', "timestamp"), "action", "webaclid", "webaclname", "terminatingruleid", "terminatingruletype", "httpsourceid", "httprequest"."httpmethod", "httprequest"."country", "httprequest"."clientip", "httprequest"."uri", CASE WHEN labels = ARRAY[] THEN \'\' ELSE labels[1].name END, CAST(COUNT(1) AS bigint), "account_id", "region", "event_hour", "__execution_name__" FROM "centralized"."waf" WHERE __execution_name__ = \'{}\' GROUP BY FLOOR("time" / 60000) * 60000, DATE_TRUNC(\'minute\', "timestamp"), "action", "webaclid", "webaclname", "terminatingruleid", "terminatingruletype", "httpsourceid", "httprequest"."httpmethod", "httprequest"."country", "httprequest"."clientip", "httprequest"."uri", CASE WHEN labels = ARRAY[] THEN \'\' ELSE labels[1].name END, "account_id", "region", "event_hour", "__execution_name__";']

    def test_get_table_metadata_and_statements_alb(self, mock_s3_context, mock_iam_context, mock_sqs_context, mock_ddb_context):
        from pipeline_resources_builder.lambda_function import Parameters, TableMetaDataGenerator, MetaTable
        from pipeline_resources_builder.lambda_function import ALB_RAW, ALB_PARQUET, ALB_METRICS
        
        AWS_DDB_META = MetaTable()
        
        waf_pipeline_id = os.environ["WAF_PIPELINE_ID"]
        waf_pipeline_info = AWS_DDB_META.get(meta_name=waf_pipeline_id)
        
        create_waf_pipeline_event = {'RequestType': 'Create', 'ResourceProperties': {'Resource': 'pipeline', 'Id': waf_pipeline_id}}
        
        # alb
        pipeline_id = str(uuid.uuid4())
        pipeline_info = copy.deepcopy(waf_pipeline_info)
        pipeline_info['data']['source']['type'] = 'alb'
        pipeline_info['data']['source']['table']['name'] = 'alb{}'
        pipeline_info['data']['destination']['table']['name'] = 'alb'
        pipeline_info['data']['destination']['metrics']['name'] = 'alb_metrics'
        
        AWS_DDB_META.put(meta_name=pipeline_id, item=pipeline_info)
        
        event = copy.deepcopy(create_waf_pipeline_event)
        event['ResourceProperties']['Id'] = pipeline_id
        param = Parameters(event)
        
        table_metadata_generator = TableMetaDataGenerator(source=param.pipeline_info.source, destination=param.pipeline_info.destination)
        raw, parquet, metrics, statements = table_metadata_generator.get_table_metadata_and_statements()
        assert raw is ALB_RAW
        assert parquet is ALB_PARQUET
        assert metrics is ALB_METRICS
        assert statements.create == """CREATE EXTERNAL TABLE IF NOT EXISTS `tmp`.`alb{}` (`type` string, `time` string, `elb` string, `client_ip` string, `client_port` int, `target_ip` string, `target_port` int, `request_processing_time` double, `target_processing_time` double, `response_processing_time` double, `elb_status_code` int, `target_status_code` string, `received_bytes` double, `sent_bytes` double, `request_verb` string, `request_url` string, `request_proto` string, `user_agent` string, `ssl_cipher` string, `ssl_protocol` string, `target_group_arn` string, `trace_id` string, `domain_name` string, `chosen_cert_arn` string, `matched_rule_priority` string, `request_creation_time` string, `actions_executed` string, `redirect_url` string, `lambda_error_reason` string, `target_port_list` string, `target_status_code_list` string, `classification` string, `classification_reason` string, `enrichment` string)  ROW FORMAT SERDE 'org.apache.hadoop.hive.serde2.RegexSerDe' WITH SERDEPROPERTIES ('input.regex'='([^ ]*) ([^ ]*) ([^ ]*) ([^ ]*):([0-9]*) ([^ ]*)[:-]([0-9]*) ([-.0-9]*) ([-.0-9]*) ([-.0-9]*) (|[-0-9]*) (-|[-0-9]*) ([-0-9]*) ([-0-9]*) "([^ ]*) (.*) (- |[^ ]*)" "([^"]*)" ([A-Z0-9-_]+) ([A-Za-z0-9.-]*) ([^ ]*) "([^"]*)" "([^"]*)" "([^"]*)" ([-.0-9]*) ([^ ]*) "([^"]*)" "([^"]*)" "([^ ]*)" "([^s]+?)" "([^s]+)" "([^ ]*)" "([^ ]*)" ?(.*)') STORED AS INPUTFORMAT 'org.apache.hadoop.mapred.TextInputFormat' OUTPUTFORMAT 'org.apache.hadoop.hive.ql.io.HiveIgnoreKeyTextOutputFormat' LOCATION '{}' ;"""
        assert statements.insert == """INSERT INTO "centralized"."alb" ("time", "timestamp", "type", "elb", "client_ip", "client_port", "target_ip", "target_port", "request_processing_time", "target_processing_time", "response_processing_time", "elb_status_code_group", "elb_status_code", "target_status_code", "received_bytes", "sent_bytes", "request_verb", "request_url", "request_host", "request_path", "request_proto", "user_agent", "ssl_cipher", "ssl_protocol", "target_group_arn", "trace_id", "domain_name", "chosen_cert_arn", "matched_rule_priority", "request_creation_time", "actions_executed", "redirect_url", "lambda_error_reason", "target_port_list", "target_status_code_list", "classification", "classification_reason", "enrichment", "event_hour", "__execution_name__") SELECT CAST(to_unixtime(from_iso8601_timestamp("time")) * 1000 AS bigint), from_iso8601_timestamp("time"), "type", "elb", "client_ip", "client_port", "target_ip", "target_port", "request_processing_time", "target_processing_time", "response_processing_time", CASE WHEN elb_status_code BETWEEN 100 AND 199 THEN '1xx' WHEN elb_status_code BETWEEN 200 AND 299 THEN '2xx' WHEN elb_status_code BETWEEN 300 AND 399 THEN '3xx' WHEN elb_status_code BETWEEN 400 AND 499 THEN '4xx' WHEN elb_status_code BETWEEN 500 AND 599 THEN '5xx' ELSE '-' END, "elb_status_code", "target_status_code", "received_bytes", "sent_bytes", "request_verb", "request_url", url_extract_host("request_url"), url_extract_path("request_url"), "request_proto", "user_agent", "ssl_cipher", "ssl_protocol", "target_group_arn", "trace_id", "domain_name", "chosen_cert_arn", "matched_rule_priority", "request_creation_time", "actions_executed", "redirect_url", "lambda_error_reason", "target_port_list", "target_status_code_list", "classification", "classification_reason", CAST(ROW(json_extract_scalar("enrichment", '$.geo_iso_code'), json_extract_scalar("enrichment", '$.geo_country'), json_extract_scalar("enrichment", '$.geo_city'), json_extract_scalar("enrichment", '$.geo_location'), json_extract_scalar("enrichment", '$.ua_browser'), json_extract_scalar("enrichment", '$.ua_browser_version'), json_extract_scalar("enrichment", '$.ua_os'), json_extract_scalar("enrichment", '$.ua_os_version'), json_extract_scalar("enrichment", '$.ua_device'), json_extract_scalar("enrichment", '$.ua_category')) AS ROW(geo_iso_code varchar, geo_country varchar, geo_city varchar, geo_location varchar, ua_browser varchar, ua_browser_version varchar, ua_os varchar, ua_os_version varchar, ua_device varchar, ua_category varchar)), date_format(from_iso8601_timestamp("time"), '%Y%m%d%H'), '{}' FROM "tmp"."alb{}";"""
        assert statements.drop == 'DROP TABLE IF EXISTS `tmp`.`alb{}`'
        assert statements.aggregate == ['INSERT INTO "centralized"."alb_metrics" ("time", "timestamp", "type", "elb", "client_ip", "target_group_arn", "target_ip", "elb_status_code_group", "elb_status_code", "request_verb", "request_host", "request_path", "ssl_protocol", "user_agent", "ua_os", "ua_device", "ua_browser", "ua_category", "geo_iso_code", "geo_country", "geo_city", "received_bytes", "sent_bytes", "request_processing_time", "target_processing_time", "response_processing_time", "requests", "event_hour", "__execution_name__") SELECT FLOOR("time" / 60000) * 60000, DATE_TRUNC(\'minute\', "timestamp"), "type", "elb", "client_ip", "target_group_arn", "target_ip", "elb_status_code_group", "elb_status_code", "request_verb", url_extract_host("request_url"), url_extract_path("request_url"), "ssl_protocol", "user_agent", "enrichment"."ua_os", "enrichment"."ua_device", "enrichment"."ua_browser", "enrichment"."ua_category", "enrichment"."geo_iso_code", "enrichment"."geo_country", "enrichment"."geo_city", CAST(SUM("received_bytes") AS DOUBLE), CAST(SUM("sent_bytes") AS DOUBLE), CAST(SUM("request_processing_time") AS DOUBLE), CAST(SUM("target_processing_time") AS DOUBLE), CAST(SUM("response_processing_time") AS DOUBLE), CAST(COUNT(1) AS bigint), "event_hour", "__execution_name__" FROM "centralized"."alb" WHERE __execution_name__ = \'{}\' GROUP BY FLOOR("time" / 60000) * 60000, DATE_TRUNC(\'minute\', "timestamp"), "type", "elb", "client_ip", "target_group_arn", "target_ip", "elb_status_code_group", "elb_status_code", "request_verb", url_extract_host("request_url"), url_extract_path("request_url"), "ssl_protocol", "user_agent", "enrichment"."ua_os", "enrichment"."ua_device", "enrichment"."ua_browser", "enrichment"."ua_category", "enrichment"."geo_iso_code", "enrichment"."geo_country", "enrichment"."geo_city", "event_hour", "__execution_name__";']
        
    def test_get_table_metadata_and_statements_cloudfront(self, mock_s3_context, mock_iam_context, mock_sqs_context, mock_ddb_context):
        from pipeline_resources_builder.lambda_function import Parameters, TableMetaDataGenerator, MetaTable
        from pipeline_resources_builder.lambda_function import CLOUDFRONT_RAW, CLOUDFRONT_PARQUET, CLOUDFRONT_METRICS
        
        AWS_DDB_META = MetaTable()

        waf_pipeline_id = os.environ["WAF_PIPELINE_ID"]
        waf_pipeline_info = AWS_DDB_META.get(meta_name=waf_pipeline_id)
        
        create_waf_pipeline_event = {'RequestType': 'Create', 'ResourceProperties': {'Resource': 'pipeline', 'Id': waf_pipeline_id}}
        
        # cloudfront
        pipeline_id = str(uuid.uuid4())
        pipeline_info = copy.deepcopy(waf_pipeline_info)
        pipeline_info['data']['source']['type'] = 'cloudfront'
        pipeline_info['data']['source']['table']['name'] = 'cloudfront{}'
        pipeline_info['data']['destination']['table']['name'] = 'cloudfront'
        pipeline_info['data']['destination']['metrics']['name'] = 'cloudfront_metrics'
        
        AWS_DDB_META.put(meta_name=pipeline_id, item=pipeline_info)
        
        event = copy.deepcopy(create_waf_pipeline_event)
        event['ResourceProperties']['Id'] = pipeline_id
        param = Parameters(event)
        
        table_metadata_generator = TableMetaDataGenerator(source=param.pipeline_info.source, destination=param.pipeline_info.destination)
        raw, parquet, metrics, statements = table_metadata_generator.get_table_metadata_and_statements()
        assert raw is CLOUDFRONT_RAW
        assert parquet is CLOUDFRONT_PARQUET
        assert metrics is CLOUDFRONT_METRICS
        assert statements.create == "CREATE EXTERNAL TABLE IF NOT EXISTS `tmp`.`cloudfront{}` (`date` date, `time` string, `x-edge-location` string, `sc-bytes` bigint, `c-ip` string, `cs-method` string, `cs-host` string, `cs-uri-stem` string, `sc-status` int, `cs-referer` string, `cs-user-agent` string, `cs-uri-query` string, `cs-cookie` string, `x-edge-result-type` string, `x-edge-request-id` string, `x-host-header` string, `cs-protocol` string, `cs-bytes` bigint, `time-taken` double, `x-forwarded-for` string, `ssl-protocol` string, `ssl-cipher` string, `x-edge-response-result-type` string, `cs-protocol-version` string, `fle-status` string, `fle-encrypted-fields` int, `c-port` int, `time-to-first-byte` double, `x-edge-detailed-result-type` string, `sc-content-type` string, `sc-content-len` bigint, `sc-range-start` bigint, `sc-range-end` bigint, `enrichment` string)  ROW FORMAT SERDE 'org.apache.hadoop.hive.serde2.lazy.LazySimpleSerDe' WITH SERDEPROPERTIES ('field.delim'='\t', 'line.delim'='\n') STORED AS INPUTFORMAT 'org.apache.hadoop.mapred.TextInputFormat' OUTPUTFORMAT 'org.apache.hadoop.hive.ql.io.HiveIgnoreKeyTextOutputFormat' LOCATION '{}' TBLPROPERTIES ('skip.header.line.count'='2');"
        assert statements.insert == """INSERT INTO "centralized"."cloudfront" ("time", "timestamp", "x-edge-location", "sc-bytes", "c-ip", "cs-method", "cs-host", "cs-uri-stem", "sc-status-group", "sc-status", "cs-referer", "cs-user-agent", "cs-uri-query", "cs-cookie", "x-edge-result-type", "x-edge-request-id", "x-host-header", "cs-protocol", "cs-bytes", "time-taken-in-second", "time-taken", "x-forwarded-for", "ssl-protocol", "ssl-cipher", "x-edge-response-result-type", "cs-protocol-version", "fle-status", "fle-encrypted-fields", "c-port", "time-to-first-byte", "x-edge-detailed-result-type", "sc-content-type", "sc-content-len", "sc-range-start", "sc-range-end", "hit-cache", "back-to-origin", "enrichment", "event_hour", "__execution_name__") SELECT CAST(to_unixtime(from_iso8601_timestamp(concat(CAST(date AS varchar), 'T', "time", 'Z'))) * 1000 AS bigint), from_iso8601_timestamp(concat(CAST("date" AS varchar), 'T', "time", 'Z')), "x-edge-location", "sc-bytes", "c-ip", "cs-method", "cs-host", "cs-uri-stem", CASE WHEN "sc-status" BETWEEN 100 AND 199 THEN '1xx' WHEN "sc-status" BETWEEN 200 AND 299 THEN '2xx' WHEN "sc-status" BETWEEN 300 AND 399 THEN '3xx' WHEN "sc-status" BETWEEN 400 AND 499 THEN '4xx' WHEN "sc-status" BETWEEN 500 AND 599 THEN '5xx' ELSE '-' END, "sc-status", "cs-referer", url_decode("cs-user-agent"), "cs-uri-query", "cs-cookie", "x-edge-result-type", "x-edge-request-id", "x-host-header", "cs-protocol", "cs-bytes", cast(floor("time-taken") as integer), "time-taken", "x-forwarded-for", "ssl-protocol", "ssl-cipher", "x-edge-response-result-type", "cs-protocol-version", "fle-status", "fle-encrypted-fields", "c-port", "time-to-first-byte", "x-edge-detailed-result-type", "sc-content-type", "sc-content-len", "sc-range-start", "sc-range-end", CASE WHEN "x-edge-result-type" like '%Hit' THEN true ELSE false END, CASE WHEN ("x-edge-detailed-result-type" = 'Miss' OR ("x-edge-detailed-result-type" like '%Origin%' AND "x-edge-detailed-result-type" <> 'OriginShieldHit')) THEN true ELSE false END, CAST(ROW(json_extract_scalar("enrichment", '$.geo_iso_code'), json_extract_scalar("enrichment", '$.geo_country'), json_extract_scalar("enrichment", '$.geo_city'), json_extract_scalar("enrichment", '$.geo_location'), json_extract_scalar("enrichment", '$.ua_browser'), json_extract_scalar("enrichment", '$.ua_browser_version'), json_extract_scalar("enrichment", '$.ua_os'), json_extract_scalar("enrichment", '$.ua_os_version'), json_extract_scalar("enrichment", '$.ua_device'), json_extract_scalar("enrichment", '$.ua_category')) AS ROW(geo_iso_code varchar, geo_country varchar, geo_city varchar, geo_location varchar, ua_browser varchar, ua_browser_version varchar, ua_os varchar, ua_os_version varchar, ua_device varchar, ua_category varchar)), date_format(from_iso8601_timestamp(concat(CAST("date" AS varchar), 'T', "time", 'Z')), '%Y%m%d%H'), '{}' FROM "tmp"."cloudfront{}";"""
        assert statements.drop == 'DROP TABLE IF EXISTS `tmp`.`cloudfront{}`'
        assert statements.aggregate == ['INSERT INTO "centralized"."cloudfront_metrics" ("time", "timestamp", "c-ip", "cs-method", "cs-host", "cs-protocol-version", "cs-uri-stem", "sc-status-group", "sc-status", "cs-protocol", "time-taken-in-second", "ssl-protocol", "x-edge-location", "x-edge-result-type", "x-edge-response-result-type", "x-edge-detailed-result-type", "hit-cache", "back-to-origin", "ua_os", "ua_device", "ua_browser", "ua_category", "geo_iso_code", "geo_country", "geo_city", "time-taken", "time-to-first-byte", "cs-bytes", "sc-bytes", "requests", "event_hour", "__execution_name__") SELECT FLOOR("time" / 60000) * 60000, DATE_TRUNC(\'minute\', "timestamp"), "c-ip", "cs-method", "cs-host", "cs-protocol-version", "cs-uri-stem", "sc-status-group", "sc-status", "cs-protocol", "time-taken-in-second", "ssl-protocol", "x-edge-location", "x-edge-result-type", "x-edge-response-result-type", "x-edge-detailed-result-type", "hit-cache", "back-to-origin", "enrichment"."ua_os", "enrichment"."ua_device", "enrichment"."ua_browser", "enrichment"."ua_category", "enrichment"."geo_iso_code", "enrichment"."geo_country", "enrichment"."geo_city", cast(sum("time-taken") as double), cast(sum("time-to-first-byte") as double), cast(sum("cs-bytes") as double), cast(sum("sc-bytes") as double), cast(count(1) as bigint), "event_hour", "__execution_name__" FROM "centralized"."cloudfront" WHERE __execution_name__ = \'{}\' GROUP BY FLOOR("time" / 60000) * 60000, DATE_TRUNC(\'minute\', "timestamp"), "c-ip", "cs-method", "cs-host", "cs-protocol-version", "cs-uri-stem", "sc-status-group", "sc-status", "cs-protocol", "time-taken-in-second", "ssl-protocol", "x-edge-location", "x-edge-result-type", "x-edge-response-result-type", "x-edge-detailed-result-type", "hit-cache", "back-to-origin", "enrichment"."ua_os", "enrichment"."ua_device", "enrichment"."ua_browser", "enrichment"."ua_category", "enrichment"."geo_iso_code", "enrichment"."geo_country", "enrichment"."geo_city", "event_hour", "__execution_name__";']
    
    def test_get_table_metadata_and_statements_cloudtrail(self, mock_s3_context, mock_iam_context, mock_sqs_context, mock_ddb_context):
        from pipeline_resources_builder.lambda_function import Parameters, TableMetaDataGenerator, MetaTable
        from pipeline_resources_builder.lambda_function import CLOUDTRAIL_RAW, CLOUDTRAIL_PARQUET, CLOUDTRAIL_METRICS
        
        AWS_DDB_META = MetaTable()

        waf_pipeline_id = os.environ["WAF_PIPELINE_ID"]
        waf_pipeline_info = AWS_DDB_META.get(meta_name=waf_pipeline_id)
        
        create_waf_pipeline_event = {'RequestType': 'Create', 'ResourceProperties': {'Resource': 'pipeline', 'Id': waf_pipeline_id}}
        
        # cloudtrail
        pipeline_id = str(uuid.uuid4())
        pipeline_info = copy.deepcopy(waf_pipeline_info)
        pipeline_info['data']['source']['type'] = 'cloudtrail'
        pipeline_info['data']['source']['table']['name'] = 'cloudtrail{}'
        pipeline_info['data']['destination']['table']['name'] = 'cloudtrail'
        pipeline_info['data']['destination']['metrics']['name'] = 'cloudtrail_metrics'
        
        AWS_DDB_META.put(meta_name=pipeline_id, item=pipeline_info)
        
        event = copy.deepcopy(create_waf_pipeline_event)
        event['ResourceProperties']['Id'] = pipeline_id
        param = Parameters(event)
        
        table_metadata_generator = TableMetaDataGenerator(source=param.pipeline_info.source, destination=param.pipeline_info.destination)
        raw, parquet, metrics, statements = table_metadata_generator.get_table_metadata_and_statements()
        assert raw is CLOUDTRAIL_RAW
        assert parquet is CLOUDTRAIL_PARQUET
        assert metrics is CLOUDTRAIL_METRICS
        assert statements.create == "CREATE EXTERNAL TABLE IF NOT EXISTS `tmp`.`cloudtrail{}` (`eventversion` string, `useridentity` struct<`type`:string,`principalid`:string,`arn`:string,`accountid`:string,`invokedby`:string,`accesskeyid`:string,`userName`:string,`sessioncontext`:struct<`attributes`:struct<`mfaauthenticated`:string,`creationdate`:string>,`sessionissuer`:struct<`type`:string,`principalId`:string,`arn`:string,`accountId`:string,`userName`:string>,`ec2RoleDelivery`:string,`webIdFederationData`:map<string,string>>>, `eventtime` string, `eventsource` string, `eventname` string, `awsregion` string, `sourceipaddress` string, `useragent` string, `errorcode` string, `errormessage` string, `requestparameters` string, `responseelements` string, `additionaleventdata` string, `requestid` string, `eventid` string, `resources` array<struct<`arn`:string,`accountid`:string,`type`:string>>, `eventtype` string, `apiversion` string, `readonly` string, `recipientaccountid` string, `serviceeventdetails` string, `sharedeventid` string, `vpcendpointid` string, `tlsDetails` struct<`tlsVersion`:string,`cipherSuite`:string,`clientProvidedHostHeader`:string>)  ROW FORMAT SERDE 'org.openx.data.jsonserde.JsonSerDe'  STORED AS INPUTFORMAT 'com.amazon.emr.cloudtrail.CloudTrailInputFormat' OUTPUTFORMAT 'org.apache.hadoop.hive.ql.io.HiveIgnoreKeyTextOutputFormat' LOCATION '{}' ;"
        assert statements.insert == """INSERT INTO "centralized"."cloudtrail" ("time", "timestamp", "eventversion", "useridentity", "eventtime", "eventsource", "eventname", "awsregion", "sourceipaddress", "useragent", "errorcode", "errormessage", "requestparameters", "responseelements", "additionaleventdata", "requestid", "eventid", "resources", "eventtype", "apiversion", "readonly", "recipientaccountid", "serviceeventdetails", "sharedeventid", "vpcendpointid", "tlsDetails", "account_id", "region", "event_hour", "__execution_name__") SELECT CAST(to_unixtime(from_iso8601_timestamp("eventtime")) * 1000 AS bigint), from_iso8601_timestamp("eventtime"), "eventversion", "useridentity", "eventtime", "eventsource", "eventname", "awsregion", "sourceipaddress", "useragent", "errorcode", "errormessage", "requestparameters", "responseelements", "additionaleventdata", "requestid", "eventid", "resources", "eventtype", "apiversion", "readonly", "recipientaccountid", "serviceeventdetails", "sharedeventid", "vpcendpointid", "tlsDetails", "recipientaccountid", "awsregion", date_format(from_iso8601_timestamp("eventtime"), '%Y%m%d%H'), '{}' FROM "tmp"."cloudtrail{}";"""
        assert statements.drop == 'DROP TABLE IF EXISTS `tmp`.`cloudtrail{}`'
        assert statements.aggregate == ['INSERT INTO "centralized"."cloudtrail_metrics" ("time", "timestamp", "useridentitytype", "accountid", "username", "eventtype", "eventsource", "eventname", "sourceipaddress", "errorCode", "requests", "event_hour", "account_id", "region", "__execution_name__") SELECT FLOOR("time" / 60000) * 60000, DATE_TRUNC(\'minute\', "timestamp"), useridentity.type, COALESCE(useridentity.accountid, useridentity.sessioncontext.sessionissuer.accountid), COALESCE(useridentity.username, useridentity.sessioncontext.sessionissuer.username), "eventtype", "eventsource", "eventname", "sourceipaddress", "errorCode", CAST(COUNT(1) AS bigint), "event_hour", "account_id", "region", "__execution_name__" FROM "centralized"."cloudtrail" WHERE __execution_name__ = \'{}\' GROUP BY FLOOR("time" / 60000) * 60000, DATE_TRUNC(\'minute\', "timestamp"), useridentity.type, COALESCE(useridentity.accountid, useridentity.sessioncontext.sessionissuer.accountid), COALESCE(useridentity.username, useridentity.sessioncontext.sessionissuer.username), "eventtype", "eventsource", "eventname", "sourceipaddress", "errorCode", "event_hour", "account_id", "region", "__execution_name__";']
        
    def test_get_table_metadata_and_statements_vpcflow(self, mock_s3_context, mock_iam_context, mock_sqs_context, mock_ddb_context):
        from pipeline_resources_builder.lambda_function import Parameters, TableMetaDataGenerator, MetaTable
        from pipeline_resources_builder.lambda_function import VPCFLOW_RAW, VPCFLOW_PARQUET
        
        AWS_DDB_META = MetaTable()

        waf_pipeline_id = os.environ["WAF_PIPELINE_ID"]
        waf_pipeline_info = AWS_DDB_META.get(meta_name=waf_pipeline_id)
        
        create_waf_pipeline_event = {'RequestType': 'Create', 'ResourceProperties': {'Resource': 'pipeline', 'Id': waf_pipeline_id}}
        
        # vpcflow
        pipeline_id = str(uuid.uuid4())
        pipeline_info = copy.deepcopy(waf_pipeline_info)
        pipeline_info['data']['source']['type'] = 'vpcflow'
        pipeline_info['data']['source']['table']['name'] = 'vpcflow{}'
        pipeline_info['data']['destination']['table']['name'] = 'vpcflow'
        pipeline_info['data']['destination']['metrics']['name'] = 'vpcflow_metrics'
        
        AWS_DDB_META.put(meta_name=pipeline_id, item=pipeline_info)
        
        event = copy.deepcopy(create_waf_pipeline_event)
        event['ResourceProperties']['Id'] = pipeline_id
        param = Parameters(event)
        
        table_metadata_generator = TableMetaDataGenerator(source=param.pipeline_info.source, destination=param.pipeline_info.destination)
        raw, parquet, metrics, statements = table_metadata_generator.get_table_metadata_and_statements()
        assert raw is VPCFLOW_RAW
        assert parquet is VPCFLOW_PARQUET
        assert metrics is None
        assert statements.create == "CREATE EXTERNAL TABLE IF NOT EXISTS `tmp`.`vpcflow{}` (`account-id` string, `action` string, `az-id` string, `bytes` bigint, `dstaddr` string, `dstport` int, `end` bigint, `flow-direction` string, `instance-id` string, `interface-id` string, `log-status` string, `packets` bigint, `pkt-dst-aws-service` string, `pkt-dstaddr` string, `pkt-src-aws-service` string, `pkt-srcaddr` string, `protocol` bigint, `region` string, `srcaddr` string, `srcport` int, `start` bigint, `sublocation-id` string, `sublocation-type` string, `subnet-id` string, `tcp-flags` int, `traffic-path` int, `type` string, `version` int, `vpc-id` string)  ROW FORMAT SERDE 'org.apache.hadoop.hive.serde2.lazy.LazySimpleSerDe' WITH SERDEPROPERTIES ('field.delim'=' ', 'line.delim'='\n') STORED AS INPUTFORMAT 'org.apache.hadoop.mapred.TextInputFormat' OUTPUTFORMAT 'org.apache.hadoop.hive.ql.io.HiveIgnoreKeyTextOutputFormat' LOCATION '{}' TBLPROPERTIES ('skip.header.line.count'='1');"
        assert statements.insert == """INSERT INTO "centralized"."vpcflow" ("time", "timestamp", "version", "account-id", "interface-id", "srcaddr", "dstaddr", "srcport", "dstport", "protocol", "packets", "bytes", "start", "end", "action", "log-status", "vpc-id", "subnet-id", "instance-id", "tcp-flags", "type", "pkt-srcaddr", "pkt-dstaddr", "az-id", "sublocation-type", "sublocation-id", "pkt-src-aws-service", "pkt-dst-aws-service", "flow-direction", "traffic-path", "account_id", "region", "event_hour", "__execution_name__") SELECT CAST("start" * 1000 AS bigint), from_unixtime("start"), "version", "account-id", "interface-id", "srcaddr", "dstaddr", "srcport", "dstport", "protocol", "packets", "bytes", "start", "end", "action", "log-status", "vpc-id", "subnet-id", "instance-id", "tcp-flags", "type", "pkt-srcaddr", "pkt-dstaddr", "az-id", "sublocation-type", "sublocation-id", "pkt-src-aws-service", "pkt-dst-aws-service", "flow-direction", "traffic-path", "account-id", "region", date_format(from_unixtime("start"), '%Y%m%d%H'), '{}' FROM "tmp"."vpcflow{}";"""
        assert statements.drop == 'DROP TABLE IF EXISTS `tmp`.`vpcflow{}`'
        assert statements.aggregate == []

    def test_get_table_metadata_and_statements_application(self, mock_s3_context, mock_iam_context, mock_sqs_context, mock_ddb_context):
        from pipeline_resources_builder.lambda_function import Parameters, TableMetaDataGenerator, TableMetaData, MetaTable
        
        AWS_DDB_META = MetaTable()
        
        application_pipeline_id = os.environ["APPLICATION_PIPELINE_ID"]
        application_pipeline_info = AWS_DDB_META.get(meta_name=application_pipeline_id)
        create_application_pipeline_event = {'RequestType': 'Create', 'ResourceProperties': {'Resource': 'pipeline', 'Id': application_pipeline_id}}
        
        # fluent-bit
        event = copy.deepcopy(create_application_pipeline_event)
        param = Parameters(event)
        
        table_metadata_generator = TableMetaDataGenerator(source=param.pipeline_info.source, destination=param.pipeline_info.destination)
        raw, parquet, metrics, statements = table_metadata_generator.get_table_metadata_and_statements()
        assert isinstance(raw, TableMetaData) is True
        assert isinstance(parquet, TableMetaData) is True
        assert metrics is None
        assert statements.create == "CREATE EXTERNAL TABLE IF NOT EXISTS `tmp`.`application{}` (`timestamp` string, `correlationId` string, `processInfo` struct<`hostname`:string,`domainId`:string,`groupId`:string,`groupName`:string,`serviceId`:string,`serviceName`:string,`version`:string>, `transactionSummary` struct<`path`:string,`protocol`:string,`protocolSrc`:string,`status`:string,`serviceContexts`:array<struct<`service`:string,`monitor`:boolean,`client`:string,`org`:string,`app`:string,`method`:string,`status`:string,`duration`:double>>>, `file_name` string, `az` string, `ec2_instance_id` string, `private_ip` string, `hostname` string, `cluster` string, `kubernetes` struct<`pod_name`:string,`namespace_name`:string,`container_name`:string,`docker_id`:string>)  ROW FORMAT SERDE 'org.openx.data.jsonserde.JsonSerDe'  STORED AS INPUTFORMAT 'org.apache.hadoop.mapred.TextInputFormat' OUTPUTFORMAT 'org.apache.hadoop.hive.ql.io.HiveIgnoreKeyTextOutputFormat' LOCATION '{}' ;"
        assert statements.insert == """INSERT INTO "centralized"."application" ("time", "timestamp", "correlationId", "processInfo", "transactionSummary", "agent_info", "event_hour", "serviceId", "__execution_name__") SELECT CAST(to_unixtime(parse_datetime("timestamp", 'YYYY-MM-dd''T''HH:mm:ss.SSSSSSSSSZ')) * 1000 AS bigint), parse_datetime("timestamp", 'YYYY-MM-dd''T''HH:mm:ss.SSSSSSSSSZ'), "correlationId", "processInfo", "transactionSummary", CAST(ROW("file_name", "az", "ec2_instance_id", "private_ip", "hostname", "cluster", "kubernetes") AS ROW("file_name" varchar, "az" varchar, "ec2_instance_id" varchar, "private_ip" varchar, "hostname" varchar, "cluster" varchar, "kubernetes" ROW("pod_name" varchar, "namespace_name" varchar, "container_name" varchar, "docker_id" varchar))), date_format(parse_datetime("timestamp", 'YYYY-MM-dd''T''HH:mm:ss.SSSSSSSSSZ'), '%Y%m%d%H'), "processInfo"."serviceId", '{}' FROM "tmp"."application{}";"""
        assert statements.drop == 'DROP TABLE IF EXISTS `tmp`.`application{}`'
        assert statements.aggregate == []
        
        pipeline_id = str(uuid.uuid4())
        pipeline_info = copy.deepcopy(application_pipeline_info)
        pipeline_info['data']['destination']['table']['schema'] = json.dumps({
            'type': 'object',
            'properties': {
                'time': {
                    'type': 'big_int',
                    'expression': '''CAST(to_unixtime(from_iso8601_timestamp("time")) * 1000 AS bigint)''',
                },
                'timestamp': {
                    'type': 'timestamp',
                    'expression': '''from_iso8601_timestamp("time")''',
                },
                'type': {
                    'type': 'string'
                },
                'elb': {
                    'type': 'string',
                    'partition': True
                },
                'client_ip': {
                    'type': 'string'
                },
                'client_port': {
                    'type': 'integer'
                },
                'target_ip': {
                    'type': 'string'
                },
                'target_port': {
                    'type': 'integer'
                },
                'event_hour': {
                    'type': 'string',
                    'partition': True,
                    'expression': '''date_format(from_iso8601_timestamp("time"), '%Y%m%d%H')''',
                },
                '__execution_name__': {
                    'type': 'string',
                    'partition': True,
                    'expression': "'{{}}'"
                }
            }
        })
        pipeline_info['data']['destination']['metrics']['schema'] = json.dumps({
            'type': 'object',
            'properties': {
                'time': {
                    'type': 'big_int',
                    'expression': '''FLOOR("time" / 60000) * 60000''',
                },
                'timestamp': {
                    'type': 'timestamp',
                    'expression': '''DATE_TRUNC('minute', "timestamp")'''
                },
                'type': {
                    'type': 'string'
                },
                'request_host': {
                    'type': 'string',
                    'expression': '''url_extract_host("request_url")''',
                },
                'requests': {
                    'type': 'big_int',
                    'measure': True,
                    'expression': '''CAST(COUNT(1) AS bigint)''',
                },
                'event_hour': {
                    'type': 'string',
                    'partition': True,
                },
                '__execution_name__': {
                    'type': 'string',
                    'partition': True,
                }
            }
        })
        
        AWS_DDB_META.put(meta_name=pipeline_id, item=pipeline_info)
        
        event = copy.deepcopy(create_application_pipeline_event)
        event['ResourceProperties']['Id'] = pipeline_id
        param = Parameters(event)
        
        table_metadata_generator = TableMetaDataGenerator(source=param.pipeline_info.source, destination=param.pipeline_info.destination)
        raw, parquet, metrics, statements = table_metadata_generator.get_table_metadata_and_statements()
        assert isinstance(raw, TableMetaData) is True
        assert isinstance(parquet, TableMetaData) is True
        assert isinstance(metrics, TableMetaData) is True
        assert statements.create == "CREATE EXTERNAL TABLE IF NOT EXISTS `tmp`.`application{}` (`timestamp` string, `correlationId` string, `processInfo` struct<`hostname`:string,`domainId`:string,`groupId`:string,`groupName`:string,`serviceId`:string,`serviceName`:string,`version`:string>, `transactionSummary` struct<`path`:string,`protocol`:string,`protocolSrc`:string,`status`:string,`serviceContexts`:array<struct<`service`:string,`monitor`:boolean,`client`:string,`org`:string,`app`:string,`method`:string,`status`:string,`duration`:double>>>, `file_name` string, `az` string, `ec2_instance_id` string, `private_ip` string, `hostname` string, `cluster` string, `kubernetes` struct<`pod_name`:string,`namespace_name`:string,`container_name`:string,`docker_id`:string>)  ROW FORMAT SERDE 'org.openx.data.jsonserde.JsonSerDe'  STORED AS INPUTFORMAT 'org.apache.hadoop.mapred.TextInputFormat' OUTPUTFORMAT 'org.apache.hadoop.hive.ql.io.HiveIgnoreKeyTextOutputFormat' LOCATION '{}' ;"
        assert statements.insert == """INSERT INTO "centralized"."application" ("time", "timestamp", "type", "elb", "client_ip", "client_port", "target_ip", "target_port", "event_hour", "__execution_name__") SELECT CAST(to_unixtime(from_iso8601_timestamp("time")) * 1000 AS bigint), from_iso8601_timestamp("time"), "type", "elb", "client_ip", "client_port", "target_ip", "target_port", date_format(from_iso8601_timestamp("time"), '%Y%m%d%H'), '{}' FROM "tmp"."application{}";"""
        assert statements.drop == 'DROP TABLE IF EXISTS `tmp`.`application{}`'
        assert statements.aggregate == ['INSERT INTO "centralized"."application_metrics" ("time", "timestamp", "type", "request_host", "requests", "event_hour", "__execution_name__") SELECT FLOOR("time" / 60000) * 60000, DATE_TRUNC(\'minute\', "timestamp"), "type", url_extract_host("request_url"), CAST(COUNT(1) AS bigint), "event_hour", "__execution_name__" FROM "centralized"."application" WHERE __execution_name__ = \'{}\' GROUP BY FLOOR("time" / 60000) * 60000, DATE_TRUNC(\'minute\', "timestamp"), "type", url_extract_host("request_url"), "event_hour", "__execution_name__";']
        
        # s3
        pipeline_id = str(uuid.uuid4())
        pipeline_info = copy.deepcopy(application_pipeline_info)
        pipeline_info['data']['source']['type'] = 's3'
        
        AWS_DDB_META.put(meta_name=pipeline_id, item=pipeline_info)

        event = copy.deepcopy(create_application_pipeline_event)
        event['ResourceProperties']['Id'] = pipeline_id
        param = Parameters(event)
        
        table_metadata_generator = TableMetaDataGenerator(source=param.pipeline_info.source, destination=param.pipeline_info.destination)
        raw, parquet, metrics, statements = table_metadata_generator.get_table_metadata_and_statements()
        assert isinstance(raw, TableMetaData) is True
        assert isinstance(parquet, TableMetaData) is True
        assert metrics is None
        assert statements.create == "CREATE EXTERNAL TABLE IF NOT EXISTS `tmp`.`application{}` (`timestamp` string, `correlationId` string, `processInfo` struct<`hostname`:string,`domainId`:string,`groupId`:string,`groupName`:string,`serviceId`:string,`serviceName`:string,`version`:string>, `transactionSummary` struct<`path`:string,`protocol`:string,`protocolSrc`:string,`status`:string,`serviceContexts`:array<struct<`service`:string,`monitor`:boolean,`client`:string,`org`:string,`app`:string,`method`:string,`status`:string,`duration`:double>>>)  ROW FORMAT SERDE 'org.openx.data.jsonserde.JsonSerDe'  STORED AS INPUTFORMAT 'org.apache.hadoop.mapred.TextInputFormat' OUTPUTFORMAT 'org.apache.hadoop.hive.ql.io.HiveIgnoreKeyTextOutputFormat' LOCATION '{}' ;"
        assert statements.insert == """INSERT INTO "centralized"."application" ("time", "timestamp", "correlationId", "processInfo", "transactionSummary", "event_hour", "serviceId", "__execution_name__") SELECT CAST(to_unixtime(parse_datetime("timestamp", 'YYYY-MM-dd''T''HH:mm:ss.SSSSSSSSSZ')) * 1000 AS bigint), parse_datetime("timestamp", 'YYYY-MM-dd''T''HH:mm:ss.SSSSSSSSSZ'), "correlationId", "processInfo", "transactionSummary", date_format(parse_datetime("timestamp", 'YYYY-MM-dd''T''HH:mm:ss.SSSSSSSSSZ'), '%Y%m%d%H'), "processInfo"."serviceId", '{}' FROM "tmp"."application{}";"""
        assert statements.drop == 'DROP TABLE IF EXISTS `tmp`.`application{}`'
        assert statements.aggregate == []
        
        pipeline_id = str(uuid.uuid4())
        pipeline_info = copy.deepcopy(application_pipeline_info)
        pipeline_info['data']['source']['type'] = 's3'
        pipeline_info['data']['destination']['table']['schema'] = json.dumps({
            'type': 'object',
            'properties': {
                'time': {
                    'type': 'big_int',
                    'expression': '''CAST(to_unixtime(from_iso8601_timestamp("time")) * 1000 AS bigint)''',
                },
                'timestamp': {
                    'type': 'timestamp',
                    'expression': '''from_iso8601_timestamp("time")''',
                },
                'type': {
                    'type': 'string'
                },
                'elb': {
                    'type': 'string',
                    'partition': True
                },
                'client_ip': {
                    'type': 'string'
                },
                'client_port': {
                    'type': 'integer'
                },
                'target_ip': {
                    'type': 'string'
                },
                'target_port': {
                    'type': 'integer'
                },
                'event_hour': {
                    'type': 'string',
                    'partition': True,
                    'expression': '''date_format(from_iso8601_timestamp("time"), '%Y%m%d%H')''',
                },
                '__execution_name__': {
                    'type': 'string',
                    'partition': True,
                    'expression': "'{{}}'"
                }
            }
        })
        pipeline_info['data']['destination']['metrics']['schema'] = json.dumps({
            'type': 'object',
            'properties': {
                'time': {
                    'type': 'big_int',
                    'expression': '''FLOOR("time" / 60000) * 60000''',
                },
                'timestamp': {
                    'type': 'timestamp',
                    'expression': '''DATE_TRUNC('minute', "timestamp")'''
                },
                'type': {
                    'type': 'string'
                },
                'request_host': {
                    'type': 'string',
                    'expression': '''url_extract_host("request_url")''',
                },
                'requests': {
                    'type': 'big_int',
                    'measure': True,
                    'expression': '''CAST(COUNT(1) AS bigint)''',
                },
                'event_hour': {
                    'type': 'string',
                    'partition': True,
                },
                '__execution_name__': {
                    'type': 'string',
                    'partition': True,
                }
            }
        })
        
        AWS_DDB_META.put(meta_name=pipeline_id, item=pipeline_info)
        
        event = copy.deepcopy(create_application_pipeline_event)
        event['ResourceProperties']['Id'] = pipeline_id
        param = Parameters(event)
        
        table_metadata_generator = TableMetaDataGenerator(source=param.pipeline_info.source, destination=param.pipeline_info.destination)
        raw, parquet, metrics, statements = table_metadata_generator.get_table_metadata_and_statements()
        assert isinstance(raw, TableMetaData) is True
        assert isinstance(parquet, TableMetaData) is True
        assert isinstance(metrics, TableMetaData) is True
        assert statements.create == "CREATE EXTERNAL TABLE IF NOT EXISTS `tmp`.`application{}` (`timestamp` string, `correlationId` string, `processInfo` struct<`hostname`:string,`domainId`:string,`groupId`:string,`groupName`:string,`serviceId`:string,`serviceName`:string,`version`:string>, `transactionSummary` struct<`path`:string,`protocol`:string,`protocolSrc`:string,`status`:string,`serviceContexts`:array<struct<`service`:string,`monitor`:boolean,`client`:string,`org`:string,`app`:string,`method`:string,`status`:string,`duration`:double>>>)  ROW FORMAT SERDE 'org.openx.data.jsonserde.JsonSerDe'  STORED AS INPUTFORMAT 'org.apache.hadoop.mapred.TextInputFormat' OUTPUTFORMAT 'org.apache.hadoop.hive.ql.io.HiveIgnoreKeyTextOutputFormat' LOCATION '{}' ;"
        assert statements.insert == """INSERT INTO "centralized"."application" ("time", "timestamp", "type", "elb", "client_ip", "client_port", "target_ip", "target_port", "event_hour", "__execution_name__") SELECT CAST(to_unixtime(from_iso8601_timestamp("time")) * 1000 AS bigint), from_iso8601_timestamp("time"), "type", "elb", "client_ip", "client_port", "target_ip", "target_port", date_format(from_iso8601_timestamp("time"), '%Y%m%d%H'), '{}' FROM "tmp"."application{}";"""
        assert statements.drop == 'DROP TABLE IF EXISTS `tmp`.`application{}`'
        assert statements.aggregate == ['INSERT INTO "centralized"."application_metrics" ("time", "timestamp", "type", "request_host", "requests", "event_hour", "__execution_name__") SELECT FLOOR("time" / 60000) * 60000, DATE_TRUNC(\'minute\', "timestamp"), "type", url_extract_host("request_url"), CAST(COUNT(1) AS bigint), "event_hour", "__execution_name__" FROM "centralized"."application" WHERE __execution_name__ = \'{}\' GROUP BY FLOOR("time" / 60000) * 60000, DATE_TRUNC(\'minute\', "timestamp"), "type", url_extract_host("request_url"), "event_hour", "__execution_name__";']


class TestPipelineResourceBuilder:
    
    def init_default_parameter(self, httpserver, mock_iam_context, mock_s3_context, mock_sqs_context, mock_ddb_context, mock_glue_context, mock_scheduler_context):
        from pipeline_resources_builder.lambda_function import PipelineResourceBuilder, Parameters, MetaTable
        
        AWS_DDB_META = MetaTable()
        
        self.aws_region = os.environ["AWS_REGION"]
        self.account_id = os.environ["ACCOUNT_ID"]
        self.staging_bucket_name = os.environ["STAGING_BUCKET_NAME"]
        self.logging_bucket_name = os.environ["LOGGING_BUCKET_NAME"]
        self.logging_bucket_prefix = os.environ["LOGGING_BUCKET_PREFIX"]
        self.centralized_bucket_name = os.environ["CENTRALIZED_BUCKET_NAME"]
        self.centralized_bucket_prefix = 'datalake'
        self.centralized_database = os.environ["CENTRALIZED_DATABASE"]
        self.tmp_database = os.environ["TMP_DATABASE"]
        self.s3_public_access_policy = os.environ["S3_PUBLIC_ACCESS_POLICY"]
        self.s3_public_access_policy_arn = f'arn:aws:iam::{self.account_id}:policy/{self.s3_public_access_policy}'
        self.replication_sqs_arn = os.environ['REPLICATION_SQS_ARN']
        self.replication_sqs_name = os.environ['REPLICATION_SQS_NAME']
        self.replication_dlq_arn = os.environ['REPLICATION_DLQ_ARN']
        self.replication_dlq_name = os.environ['REPLICATION_DLQ_NAME']
        self.replication_function_arn = os.environ["S3_OBJECTS_REPLICATION_FUNCTION_ARN"]
        self.replication_role_arn = os.environ["S3_OBJECTS_REPLICATION_ROLE_ARN"]
        self.log_processor_name = os.environ["LOG_PROCESSOR_NAME"]
        self.log_merger_name = os.environ["LOG_MERGER_NAME"]
        self.log_archive_name = os.environ["LOG_ARCHIVE_NAME"]
        self.log_processor_arn = f'arn:aws:states:{self.aws_region}:{self.account_id}:stateMachine:{self.log_processor_name}'
        self.log_merger_arn = f'arn:aws:states:{self.aws_region}:{self.account_id}:stateMachine:{self.log_merger_name}'
        self.log_archive_arn = f'arn:aws:states:{self.aws_region}:{self.account_id}:stateMachine:{self.log_archive_name}'
        self.log_processor_start_execution_role = f'arn:aws:iam::{self.account_id}:role/{self.log_processor_name}'
        self.log_merger_start_execution_role = f'arn:aws:iam::{self.account_id}:role/{self.log_merger_name}'
        self.log_archive_start_execution_role = f'arn:aws:iam::{self.account_id}:role/{self.log_archive_name}'
        self.table_name = 'waf'
        self.sts_role = ''
        self.notification_service = 'SES'
        self.recipients = 'alejandro_rosalez@example.com,alejandro_rosalez@example.org'
        self.processor_schedule = 'rate(5 minutes)'
        self.merger_schedule = 'cron(0 1 * * ? *)'
        self.archive_schedule = 'cron(0 1 * * ? *)'
        self.merger_age = 3
        self.archive_age = 7
        self.staging_bucket_prefix = 'AWSLogs/WAFLogs'
        
        self.pipeline_id = str(uuid.uuid4())
        self.pipeline_info = {
            'data': {
                'source': {
                    'type': 'WAF',
                    'table': {
                        'schema': '{}',
                        'dataFormat': '', 
                        'tableProperties': '{}', 
                        'serializationProperties': '{}', 
                    },
                },
                'destination': {
                    'location': {
                        'bucket': self.centralized_bucket_name,
                        'prefix': self.centralized_bucket_prefix,
                    },
                    'database': {
                        'name': self.centralized_database,
                    },
                    'table': {
                        'name': self.table_name,
                        'schema': '{}',
                    },
                    'metrics': {
                        'name': '',
                        'schema': '{}',
                    },
                },
                'notification': {
                    'service': self.notification_service,
                    'recipients': self.recipients
                },
                'grafana': {
                    'importDashboards': 'false',
                    'url': '',
                    'token': '',
                },
                'scheduler': {
                    'service': 'scheduler',
                    'LogProcessor': {
                        'schedule': self.processor_schedule,
                    },
                    'LogMerger': {
                        'schedule': self.merger_schedule,
                        'age': self.merger_age,
                    },
                    'LogArchive': {
                        'schedule': self.archive_schedule,
                        'age': self.archive_age,
                    },
                },
                'staging': {
                    'prefix': self.staging_bucket_prefix
                }
            },
            'stack': {
                'lambda': {
                    'replicate': self.replication_function_arn
                },
                'queue':{
                    'logEventQueue': self.replication_sqs_arn,
                    'logEventDLQ': self.replication_dlq_arn,
                },
                'role': {
                    'replicate': self.replication_role_arn
                }
            }
        }
        self.pipeline_event = {'RequestType': 'Create', 'ResourceProperties': {'Resource': 'pipeline', 'Id': self.pipeline_id}}
        AWS_DDB_META.put(meta_name=self.pipeline_id, item=self.pipeline_info)
        
        self.ingestion_id = str(uuid.uuid4())
        self.ingestion_info = {
            'data': {
                'role': {
                    'sts': '',
                },
                'source': {
                    'bucket': self.logging_bucket_name,
                    'prefix': self.logging_bucket_prefix,
                },
            },
            'pipelineId': self.pipeline_id
        }
        
        self.ingestion_event = {'RequestType': 'Create', 'ResourceProperties': {'Resource': 'ingestion', 'Id': self.ingestion_id}}
        AWS_DDB_META.put(meta_name=self.ingestion_id, item=self.ingestion_info)
        
        httpserver.expect_request(uri='/', method='GET').respond_with_data(status=200)
        httpserver.expect_request(uri='/api/user/preferences', method='GET').respond_with_data(response_data=json.dumps({}))
        httpserver.expect_request(uri='/api/datasources/name/TestCreateAthenaDatasource', method='GET').respond_with_data(response_data=json.dumps({'message': 'Data source not found'}), status=404)
        httpserver.expect_request(uri='/api/datasources', method='POST').respond_with_data(response_data=json.dumps({'datasource': {'id': 98, 'uid': 'BasXA4g_ar', 'name': 'Athena', 'type': 'grafana-athena-datasource'}, 'id': 98, 'message': 'Datasource added', 'name': 'TestCreateAthenaDatasource'}))
        httpserver.expect_request(uri='/api/datasources/uid/BasXA4g_ar', method='DELETE').respond_with_data(status=200)
        httpserver.expect_request(uri='/api/folders', method='POST').respond_with_data(response_data=json.dumps({'id': 19, 'uid': 'zypaSkX4k', 'title': 'clo', 'url': '/dashboards/f/zypaSkX4k/clo', 'hasAcl': False, 'canSave': True, 'canEdit': True, 'canAdmin': True, 'canDelete': True, 'createdBy': 'Anonymous', 'updatedBy': 'Anonymous','version': 1}))
        httpserver.expect_request(uri='/api/folders/zypaSkX4k', method='DELETE').respond_with_data(status=200)
        httpserver.expect_request(uri='/api/dashboards/uid/0HklGl_Vz', method='DELETE').respond_with_data(response_data=json.dumps({'id': 17, 'message': 'Dashboard Production Overview deleted', 'title': 'Production Overview'}))
        
        httpserver.expect_request(uri='/api/plugins/grafana-athena-datasource/settings', method='GET').respond_with_data(response_data=json.dumps({'name': 'Amazon Athena', 'type': 'datasource', 'id': 'grafana-athena-datasource', 'enabled': False, 'pinned': False}))
        httpserver.expect_request(uri=f'/api/datasources/name/Athena-clo-{self.account_id}-{self.aws_region}', method='GET').respond_with_data(response_data=json.dumps({'id': 96, 'name': f'Athena-clo-{self.account_id}-{self.aws_region}', 'uid': 'g5Aeh9_Vk', 'type': 'grafana-athena-datasource'}))
        httpserver.expect_request(uri='/api/datasources/uid/g5Aeh9_Vk', method='PUT').respond_with_data(response_data=json.dumps({'datasource': {'id': 96, 'uid': 'g5Aeh9_Vk', 'name': f'Athena-clo-{self.account_id}-{self.aws_region}', 'type': 'grafana-athena-datasource'}, 'id': 96, 'message': 'Datasource updated', 'name': f'Athena-clo-{self.account_id}-{self.aws_region}'}))
        httpserver.expect_request(uri='/api/dashboards/db', method='POST').respond_with_data(response_data=json.dumps({'id': 7, 'status': 'success', 'uid': 'w0x1c_Y4k5', 'version': 1}))
        httpserver.expect_request(uri='/api/dashboards/uid/w0x1c_Y4k5', method='DELETE').respond_with_data(response_data=json.dumps({'id': 17, 'message': 'Dashboard Production Overview deleted', 'title': 'Production Overview'}))
        httpserver.expect_request(uri='/api/folders', method='GET').respond_with_data(response_data=json.dumps([{'id': 1, 'uid': 'q_XODzX4z', 'title': 'General'}, {'id': 19, 'uid': 'zypaSkX4k', 'title': 'clo'}]))
        httpserver.expect_request(uri='/api/folders/zypaSkX4k', method='GET').respond_with_data(response_data=json.dumps({'id': 19, 'uid': 'zypaSkX4k', 'title': 'clo', 'url': '/dashboards/f/zypaSkX4k/clo', 'hasAcl': False, 'canSave': True, 'canEdit': True, 'canAdmin': True, 'canDelete': True, 'version': 1}))
        httpserver.expect_request(uri=f'/api/dashboards/uid/{self.pipeline_id}-00', method='GET').respond_with_data(response_data=json.dumps({'message': 'Dashboard not found', 'traceID': ''}), status=404)
        httpserver.expect_request(uri=f'/api/dashboards/uid/{self.pipeline_id}-01', method='GET').respond_with_data(response_data=json.dumps({'message': 'Dashboard not found', 'traceID': ''}), status=404)
    
        self.pipeline_parameters = Parameters(self.pipeline_event)
        self.pipeline_resource_builder = PipelineResourceBuilder(parameters=self.pipeline_parameters)
        
        self.ingestion_parameters = Parameters(self.ingestion_event)
        self.ingestion_resource_builder = PipelineResourceBuilder(parameters=self.ingestion_parameters)
        
    def test_init(self, httpserver: HTTPServer, mock_iam_context, mock_s3_context, mock_sqs_context, mock_ddb_context, mock_glue_context, mock_scheduler_context):
        from pipeline_resources_builder.lambda_function import S3Client, MetaTable, SchedulerClient, EventsClient, SQSClient, GlueClient, IAMClient
        self.init_default_parameter(httpserver, mock_iam_context, mock_s3_context, mock_sqs_context, mock_ddb_context, mock_glue_context, mock_scheduler_context)
        
        assert self.pipeline_resource_builder.parameters == self.pipeline_parameters
        assert isinstance(self.pipeline_resource_builder.ddb_client_metadata, MetaTable) is True
        assert isinstance(self.pipeline_resource_builder.scheduler_client, SchedulerClient) is True
        assert isinstance(self.pipeline_resource_builder.events_client, EventsClient) is True
        assert isinstance(self.pipeline_resource_builder.sqs_client, SQSClient) is True
        assert isinstance(self.pipeline_resource_builder.glue_client, GlueClient) is True
        assert isinstance(self.pipeline_resource_builder.iam_client, IAMClient) is True
    
    def test_table_metadata_and_statements(self, httpserver: HTTPServer, mock_iam_context, mock_s3_context, mock_sqs_context, mock_ddb_context, mock_glue_context, mock_scheduler_context):
        from pipeline_resources_builder.lambda_function import TableMetaData
        
        self.init_default_parameter(httpserver, mock_iam_context, mock_s3_context, mock_sqs_context, mock_ddb_context, mock_glue_context, mock_scheduler_context)

        table_metadat_and_statements = self.pipeline_resource_builder.table_metadata_and_statements
        assert isinstance(table_metadat_and_statements.raw, TableMetaData) is True
        assert isinstance(table_metadat_and_statements.parquet, TableMetaData) is True
        assert isinstance(table_metadat_and_statements.metrics, TableMetaData) is True
        assert isinstance(table_metadat_and_statements.statements, types.SimpleNamespace) is True
    
    def test_init_grafana_info(self, httpserver: HTTPServer, mock_iam_context, mock_s3_context, mock_sqs_context, mock_ddb_context, mock_glue_context, mock_scheduler_context):
        from pipeline_resources_builder.lambda_function import PipelineResourceBuilder, Parameters, GrafanaClient, MetaTable
        
        self.init_default_parameter(httpserver, mock_iam_context, mock_s3_context, mock_sqs_context, mock_ddb_context, mock_glue_context, mock_scheduler_context)
        
        AWS_DDB_META = MetaTable()
        
        pipeline_id = str(uuid.uuid4())
        pipeline_info = copy.deepcopy(self.pipeline_info)
        pipeline_info['data']['grafana']['importDashboards'] = 'true'
        pipeline_info['data']['grafana']['url'] = httpserver.url_for('')
        pipeline_info['data']['grafana']['token'] = 'glsa_123456789012'
        pipeline_event = {'RequestType': 'Create', 'ResourceProperties': {'Resource': 'pipeline', 'Id': pipeline_id}}
        
        AWS_DDB_META.put(meta_name=pipeline_id, item=pipeline_info)
        
        parameters = Parameters(pipeline_event)
        pipeline_resource_builder = PipelineResourceBuilder(parameters=parameters)
        
        pipeline_resource_builder._init_grafana_info()
        assert isinstance(pipeline_resource_builder.grafana_client, GrafanaClient) is True
        assert pipeline_resource_builder.grafana_folder_title == 'clo'
        assert pipeline_resource_builder.grafana_details_uid == f'{pipeline_id}-00'
        assert pipeline_resource_builder.grafana_dashboard_uid == f'{pipeline_id}-01'
    
    def test_get_grafana_dashboard(self, httpserver: HTTPServer, mock_iam_context, mock_s3_context, mock_sqs_context, mock_ddb_context, mock_glue_context, mock_scheduler_context):
        from pipeline_resources_builder.lambda_function import ALB_GRAFANA_DETAILS, ALB_GRAFANA_DASHBOARD
        from pipeline_resources_builder.lambda_function import WAF_GRAFANA_DETAILS, WAF_GRAFANA_DASHBOARD
        from pipeline_resources_builder.lambda_function import CLOUDFRONT_GRAFANA_DETAILS, CLOUDFRONT_GRAFANA_DASHBOARD
        from pipeline_resources_builder.lambda_function import CLOUDTRAIL_GRAFANA_DETAILS, CLOUDTRAIL_GRAFANA_DASHBOARD
        from pipeline_resources_builder.lambda_function import APPLICATION_GRAFANA_DETAILS
        
        self.init_default_parameter(httpserver, mock_iam_context, mock_s3_context, mock_sqs_context, mock_ddb_context, mock_glue_context, mock_scheduler_context)
        
        details, dashboards = self.pipeline_resource_builder.get_grafana_dashboard(source_type='alb')
        assert details == ALB_GRAFANA_DETAILS
        assert dashboards == ALB_GRAFANA_DASHBOARD
        
        details, dashboards = self.pipeline_resource_builder.get_grafana_dashboard(source_type='waf')
        assert details == WAF_GRAFANA_DETAILS
        assert dashboards == WAF_GRAFANA_DASHBOARD
        
        details, dashboards = self.pipeline_resource_builder.get_grafana_dashboard(source_type='cloudfront')
        assert details == CLOUDFRONT_GRAFANA_DETAILS
        assert dashboards == CLOUDFRONT_GRAFANA_DASHBOARD
        
        details, dashboards = self.pipeline_resource_builder.get_grafana_dashboard(source_type='cloudtrail')
        assert details == CLOUDTRAIL_GRAFANA_DETAILS
        assert dashboards == CLOUDTRAIL_GRAFANA_DASHBOARD
        
        details, dashboards = self.pipeline_resource_builder.get_grafana_dashboard(source_type='vpcflow')
        assert details == APPLICATION_GRAFANA_DETAILS
        assert dashboards is None
        
        details, dashboards = self.pipeline_resource_builder.get_grafana_dashboard(source_type='application')
        assert details == APPLICATION_GRAFANA_DETAILS
        assert dashboards is None
    
    def test_import_dashboards_into_grafana(self, httpserver: HTTPServer, mock_iam_context, mock_s3_context, mock_sqs_context, mock_ddb_context, mock_glue_context, mock_scheduler_context):
        from pipeline_resources_builder.lambda_function import PipelineResourceBuilder, Parameters, MetaTable
        
        self.init_default_parameter(httpserver, mock_iam_context, mock_s3_context, mock_sqs_context, mock_ddb_context, mock_glue_context, mock_scheduler_context)
        
        AWS_DDB_META = MetaTable()
        
        # test for services
        pipeline_id = str(uuid.uuid4())
        pipeline_info = copy.deepcopy(self.pipeline_info)
        pipeline_info['data']['source']['type'] = 'waf'
        pipeline_info['data']['grafana']['importDashboards'] = 'true'
        pipeline_info['data']['grafana']['url'] = httpserver.url_for('')
        pipeline_info['data']['grafana']['token'] = 'glsa_123456789012'
        pipeline_event = {'RequestType': 'Create', 'ResourceProperties': {'Resource': 'pipeline', 'Id': pipeline_id}}
        
        AWS_DDB_META.put(meta_name=pipeline_id, item=pipeline_info)
        
        parameters = Parameters(pipeline_event)
        pipeline_resource_builder = PipelineResourceBuilder(parameters=parameters)
        
        httpserver.expect_oneshot_request(uri=f'/api/dashboards/uid/{pipeline_id}-00', method='GET').respond_with_data(response_data=json.dumps({'message': 'Dashboard not found', 'traceID': ''}), status=404)
        httpserver.expect_oneshot_request(uri=f'/api/dashboards/uid/{pipeline_id}-01', method='GET').respond_with_data(response_data=json.dumps({'message': 'Dashboard not found', 'traceID': ''}), status=404)

        pipeline_resource_builder.import_dashboards_into_grafana()
        
        # test for application 
        pipeline_id = str(uuid.uuid4())
        pipeline_info = copy.deepcopy(self.pipeline_info)
        pipeline_info['data']['source']['type'] = 's3'
        pipeline_info['data']['source']['table']['schema'] = '{"type": "objects","properties":{"time":{"type":"string"}}}'
        pipeline_info['data']['source']['table']['dataFormat'] = 'JSON'
        pipeline_info['data']['grafana']['importDashboards'] = 'true'
        pipeline_info['data']['grafana']['url'] = httpserver.url_for('')
        pipeline_info['data']['grafana']['token'] = 'glsa_123456789012'
        pipeline_event = {'RequestType': 'Create', 'ResourceProperties': {'Resource': 'pipeline', 'Id': pipeline_id}}
        
        AWS_DDB_META.put(meta_name=pipeline_id, item=pipeline_info)
        
        parameters = Parameters(pipeline_event)
        pipeline_resource_builder = PipelineResourceBuilder(parameters=parameters)
        
        httpserver.expect_oneshot_request(uri=f'/api/dashboards/uid/{pipeline_id}-00', method='GET').respond_with_data(response_data=json.dumps({'message': 'Dashboard not found', 'traceID': ''}), status=404)
        
        pipeline_resource_builder.import_dashboards_into_grafana()
    
    def test_delete_dashboards_from_grafana(self, httpserver: HTTPServer, mock_iam_context, mock_s3_context, mock_sqs_context, mock_ddb_context, mock_glue_context, mock_scheduler_context):
        from pipeline_resources_builder.lambda_function import PipelineResourceBuilder, Parameters, MetaTable
        
        self.init_default_parameter(httpserver, mock_iam_context, mock_s3_context, mock_sqs_context, mock_ddb_context, mock_glue_context, mock_scheduler_context)
        
        AWS_DDB_META = MetaTable()
        
        # test for services
        pipeline_id = str(uuid.uuid4())
        pipeline_info = copy.deepcopy(self.pipeline_info)
        pipeline_info['data']['source']['type'] = 'waf'
        pipeline_info['data']['grafana']['importDashboards'] = 'true'
        pipeline_info['data']['grafana']['url'] = httpserver.url_for('')
        pipeline_info['data']['grafana']['token'] = 'glsa_123456789012'
        pipeline_event = {'RequestType': 'Create', 'ResourceProperties': {'Resource': 'pipeline', 'Id': pipeline_id}}
        
        AWS_DDB_META.put(meta_name=pipeline_id, item=pipeline_info)
        
        parameters = Parameters(pipeline_event)
        pipeline_resource_builder = PipelineResourceBuilder(parameters=parameters)
        
        httpserver.expect_request(uri=f'/api/dashboards/uid/{pipeline_id}-00', method='DELETE').respond_with_data(response_data=json.dumps({'id': 17, 'message': 'Dashboard Production Overview deleted', 'title': 'Production Overview'}))
        httpserver.expect_request(uri=f'/api/dashboards/uid/{pipeline_id}-01', method='DELETE').respond_with_data(response_data=json.dumps({'id': 17, 'message': 'Dashboard Production Overview deleted', 'title': 'Production Overview'}))
        
        pipeline_resource_builder.delete_dashboards_from_grafana()
        
        httpserver.expect_oneshot_request(uri='/api/folders', method='POST').respond_with_data(response_data='{}', status=401)
        httpserver.expect_request(uri=f'/api/dashboards/uid/{pipeline_id}-00', method='DELETE').respond_with_data(response_data=json.dumps({'id': 17, 'message': 'Dashboard Production Overview deleted', 'title': 'Production Overview'}))
        httpserver.expect_request(uri=f'/api/dashboards/uid/{pipeline_id}-01', method='DELETE').respond_with_data(response_data=json.dumps({'id': 17, 'message': 'Dashboard Production Overview deleted', 'title': 'Production Overview'}))
        
        pipeline_resource_builder.delete_dashboards_from_grafana()
    
    def test_create_glue_table(self, httpserver: HTTPServer, mock_iam_context, mock_s3_context, mock_sqs_context, mock_ddb_context, mock_glue_context, mock_scheduler_context):
        from pipeline_resources_builder.lambda_function import PipelineResourceBuilder, Parameters, MetaTable, GlueClient
        
        self.init_default_parameter(httpserver, mock_iam_context, mock_s3_context, mock_sqs_context, mock_ddb_context, mock_glue_context, mock_scheduler_context)
        
        AWS_DDB_META = MetaTable()
        AWS_GLUE = GlueClient()
        
        # test for services
        pipeline_id = str(uuid.uuid4())
        pipeline_info = copy.deepcopy(self.pipeline_info)
        pipeline_info['data']['source']['type'] = 'waf'
        pipeline_info['data']['destination']['table']['name'] = 'waf'
        pipeline_info['data']['grafana']['importDashboards'] = 'true'
        pipeline_info['data']['grafana']['url'] = httpserver.url_for('')
        pipeline_info['data']['grafana']['token'] = 'glsa_123456789012'
        pipeline_event = {'RequestType': 'Create', 'ResourceProperties': {'Resource': 'pipeline', 'Id': pipeline_id}}
        
        AWS_DDB_META.put(meta_name=pipeline_id, item=pipeline_info)
        
        parameters = Parameters(pipeline_event)
        pipeline_resource_builder = PipelineResourceBuilder(parameters=parameters)
        pipeline_resource_builder.create_glue_table()
        
        response = AWS_GLUE.get_table(database=self.centralized_database, name='waf')
        assert response['Table']['DatabaseName'] == self.centralized_database
        assert response['Table']['Name'] == 'waf'
        
        response = AWS_GLUE.get_table(database=self.centralized_database, name='waf_metrics')
        assert response['Table']['DatabaseName'] == self.centralized_database
        assert response['Table']['Name'] == 'waf_metrics'
        
        # test for application 
        pipeline_id = str(uuid.uuid4())
        pipeline_info = copy.deepcopy(self.pipeline_info)
        pipeline_info['data']['source']['type'] = 's3'
        pipeline_info['data']['source']['table']['schema'] = '{"type": "objects","properties":{"time":{"type":"string"}}}'
        pipeline_info['data']['source']['table']['dataFormat'] = 'JSON'
        pipeline_info['data']['destination']['table']['name'] = 'application'
        pipeline_info['data']['grafana']['importDashboards'] = 'true'
        pipeline_info['data']['grafana']['url'] = httpserver.url_for('')
        pipeline_info['data']['grafana']['token'] = 'glsa_123456789012'
        pipeline_event = {'RequestType': 'Create', 'ResourceProperties': {'Resource': 'pipeline', 'Id': pipeline_id}}
        
        AWS_DDB_META.put(meta_name=pipeline_id, item=pipeline_info)
        
        parameters = Parameters(pipeline_event)
        pipeline_resource_builder = PipelineResourceBuilder(parameters=parameters)
        
        pipeline_resource_builder.create_glue_table()
        
        response = AWS_GLUE.get_table(database=self.centralized_database, name='application')
        assert response['Table']['DatabaseName'] == self.centralized_database
        assert response['Table']['Name'] == 'application'
        
        response = AWS_GLUE.get_table(database=self.centralized_database, name='application_metrics')
        assert response == {}
        
    def test_update_glue_table(self, httpserver: HTTPServer, mock_iam_context, mock_s3_context, mock_sqs_context, mock_ddb_context, mock_glue_context, mock_scheduler_context):
        from pipeline_resources_builder.lambda_function import PipelineResourceBuilder, Parameters
        
        self.init_default_parameter(httpserver, mock_iam_context, mock_s3_context, mock_sqs_context, mock_ddb_context, mock_glue_context, mock_scheduler_context)
    
    def test_delete_glue_table(self, httpserver: HTTPServer, mock_iam_context, mock_s3_context, mock_sqs_context, mock_ddb_context, mock_glue_context, mock_scheduler_context):
        from pipeline_resources_builder.lambda_function import PipelineResourceBuilder, Parameters, MetaTable, GlueClient
        
        self.init_default_parameter(httpserver, mock_iam_context, mock_s3_context, mock_sqs_context, mock_ddb_context, mock_glue_context, mock_scheduler_context)
        
        AWS_DDB_META = MetaTable()
        AWS_GLUE = GlueClient()
        
        # test for services
        pipeline_id = str(uuid.uuid4())
        pipeline_info = copy.deepcopy(self.pipeline_info)
        pipeline_info['data']['source']['type'] = 'waf'
        pipeline_info['data']['destination']['table']['name'] = 'waf'
        pipeline_info['data']['grafana']['importDashboards'] = 'true'
        pipeline_info['data']['grafana']['url'] = httpserver.url_for('')
        pipeline_info['data']['grafana']['token'] = 'glsa_123456789012'
        pipeline_event = {'RequestType': 'Create', 'ResourceProperties': {'Resource': 'pipeline', 'Id': pipeline_id}}
        
        AWS_DDB_META.put(meta_name=pipeline_id, item=pipeline_info)
        
        parameters = Parameters(pipeline_event)
        pipeline_resource_builder = PipelineResourceBuilder(parameters=parameters)
        pipeline_resource_builder.create_glue_table()
        
        response = AWS_GLUE.get_table(database=self.centralized_database, name='waf')
        assert response['Table']['DatabaseName'] == self.centralized_database
        assert response['Table']['Name'] == 'waf'
        
        response = AWS_GLUE.get_table(database=self.centralized_database, name='waf_metrics')
        assert response['Table']['DatabaseName'] == self.centralized_database
        assert response['Table']['Name'] == 'waf_metrics'
        
        pipeline_resource_builder.delete_glue_table()
        
        response = AWS_GLUE.get_table(database=self.centralized_database, name='waf')
        assert response == {}
        response = AWS_GLUE.get_table(database=self.centralized_database, name='waf_metrics')
        assert response == {}
    
    def test_create_rule(self, httpserver: HTTPServer, mock_iam_context, mock_s3_context, mock_sqs_context, mock_ddb_context, mock_glue_context, mock_scheduler_context, mock_events_context):
        from pipeline_resources_builder.lambda_function import PipelineResourceBuilder, Parameters, MetaTable, EventsClient
        
        self.init_default_parameter(httpserver, mock_iam_context, mock_s3_context, mock_sqs_context, mock_ddb_context, mock_glue_context, mock_scheduler_context)
        
        AWS_DDB_META = MetaTable()
        AWS_EVENTS = EventsClient()
        
        # test for services
        pipeline_id = str(uuid.uuid4())
        pipeline_info = copy.deepcopy(self.pipeline_info)
        pipeline_info['data']['source']['type'] = 'waf'
        pipeline_info['data']['destination']['table']['name'] = 'waf'
        pipeline_info['data']['scheduler']['LogProcessor']['schedule'] = 'rate(5 minutes)'
        pipeline_info['data']['scheduler']['LogMerger']['schedule'] = 'cron(0 1 * * ? *)'
        pipeline_info['data']['scheduler']['LogArchive']['schedule'] = 'cron(0 2 * * ? *)'
        pipeline_event = {'RequestType': 'Create', 'ResourceProperties': {'Resource': 'pipeline', 'Id': pipeline_id}}
        
        AWS_DDB_META.put(meta_name=pipeline_id, item=pipeline_info)
        
        parameters = Parameters(pipeline_event)
        pipeline_resource_builder = PipelineResourceBuilder(parameters=parameters)
        
        pipeline_resource_builder.create_rule()
        
        response = AWS_EVENTS._events_client.list_rules(NamePrefix='LogProcessor-waf', EventBusName='default')
        assert response['Rules'][0]['Name'] == 'LogProcessor-waf'
        assert response['Rules'][0]['State'] == 'ENABLED'
        assert response['Rules'][0]['ScheduleExpression'] == 'rate(5 minutes)'
        
        response = AWS_EVENTS._events_client.list_targets_by_rule(Rule='LogProcessor-waf', EventBusName='default')
        assert response['Targets'][0]['Id'] == pipeline_id
        
        response = AWS_EVENTS._events_client.list_rules(NamePrefix='LogMerger-waf', EventBusName='default')
        assert response['Rules'][0]['Name'] == 'LogMerger-waf'
        assert response['Rules'][0]['State'] == 'ENABLED'
        assert response['Rules'][0]['ScheduleExpression'] == 'cron(0 1 * * ? *)'
        
        response = AWS_EVENTS._events_client.list_targets_by_rule(Rule='LogMerger-waf', EventBusName='default')
        assert response['Targets'][0]['Id'] == pipeline_id
        
        response = AWS_EVENTS._events_client.list_rules(NamePrefix='LogMergerForMetrics-waf', EventBusName='default')
        assert response['Rules'][0]['Name'] == f'LogMergerForMetrics-waf'
        assert response['Rules'][0]['State'] == 'ENABLED'
        assert response['Rules'][0]['ScheduleExpression'] == 'cron(0 1 * * ? *)'
        
        response = AWS_EVENTS._events_client.list_targets_by_rule(Rule='LogMergerForMetrics-waf', EventBusName='default')
        assert response['Targets'][0]['Id'] == pipeline_id
        
        response = AWS_EVENTS._events_client.list_rules(NamePrefix='LogArchive-waf', EventBusName='default')
        assert response['Rules'][0]['Name'] == 'LogArchive-waf'
        assert response['Rules'][0]['State'] == 'ENABLED'
        assert response['Rules'][0]['ScheduleExpression'] == 'cron(0 2 * * ? *)'
        
        response = AWS_EVENTS._events_client.list_targets_by_rule(Rule='LogArchive-waf', EventBusName='default')
        assert response['Targets'][0]['Id'] == pipeline_id
        
        response = AWS_EVENTS._events_client.list_rules(NamePrefix='LogArchiveForMetrics-waf', EventBusName='default')
        assert response['Rules'][0]['Name'] == 'LogArchiveForMetrics-waf'
        assert response['Rules'][0]['State'] == 'ENABLED'
        assert response['Rules'][0]['ScheduleExpression'] == 'cron(0 2 * * ? *)'
        
        response = AWS_EVENTS._events_client.list_targets_by_rule(Rule='LogArchive-waf', EventBusName='default')
        assert response['Targets'][0]['Id'] == pipeline_id
        
        # test for application
        pipeline_id = str(uuid.uuid4())
        pipeline_info = copy.deepcopy(self.pipeline_info)
        pipeline_info['data']['source']['type'] = 's3'
        pipeline_info['data']['source']['table']['schema'] = '{"type": "objects","properties":{"time":{"type":"string"}}}'
        pipeline_info['data']['source']['table']['dataFormat'] = 'JSON'
        pipeline_info['data']['destination']['table']['name'] = 'application'
        pipeline_info['data']['scheduler']['LogProcessor']['schedule'] = 'rate(5 minutes)'
        pipeline_info['data']['scheduler']['LogMerger']['schedule'] = 'cron(0 1 * * ? *)'
        pipeline_info['data']['scheduler']['LogArchive']['schedule'] = 'cron(0 2 * * ? *)'
        pipeline_event = {'RequestType': 'Create', 'ResourceProperties': {'Resource': 'pipeline', 'Id': pipeline_id}}
        
        AWS_DDB_META.put(meta_name=pipeline_id, item=pipeline_info)
        
        parameters = Parameters(pipeline_event)
        pipeline_resource_builder = PipelineResourceBuilder(parameters=parameters)
        
        pipeline_resource_builder.create_rule()
        
        response = AWS_EVENTS._events_client.list_rules(NamePrefix='LogProcessor-application', EventBusName='default')
        assert response['Rules'][0]['Name'] == 'LogProcessor-application'
        assert response['Rules'][0]['State'] == 'ENABLED'
        assert response['Rules'][0]['ScheduleExpression'] == 'rate(5 minutes)'
        
        response = AWS_EVENTS._events_client.list_targets_by_rule(Rule='LogProcessor-application', EventBusName='default')
        assert response['Targets'][0]['Id'] == pipeline_id
        
        response = AWS_EVENTS._events_client.list_rules(NamePrefix='LogMerger-application', EventBusName='default')
        assert response['Rules'][0]['Name'] == 'LogMerger-application'
        assert response['Rules'][0]['State'] == 'ENABLED'
        assert response['Rules'][0]['ScheduleExpression'] == 'cron(0 1 * * ? *)'
        
        response = AWS_EVENTS._events_client.list_targets_by_rule(Rule='LogMerger-application', EventBusName='default')
        assert response['Targets'][0]['Id'] == pipeline_id
        
        response = AWS_EVENTS._events_client.list_rules(NamePrefix='LogMergerForMetrics-application', EventBusName='default')
        assert response['Rules'] == []
        
        response = AWS_EVENTS._events_client.list_rules(NamePrefix='LogArchive-application', EventBusName='default')
        assert response['Rules'][0]['Name'] == 'LogArchive-application'
        assert response['Rules'][0]['State'] == 'ENABLED'
        assert response['Rules'][0]['ScheduleExpression'] == 'cron(0 2 * * ? *)'
        
        response = AWS_EVENTS._events_client.list_targets_by_rule(Rule='LogArchive-application', EventBusName='default')
        assert response['Targets'][0]['Id'] == pipeline_id
        
        response = AWS_EVENTS._events_client.list_rules(NamePrefix='LogArchiveForMetrics-application', EventBusName='default')
        assert response['Rules'] == []
    
    def test_delete_rule(self, httpserver: HTTPServer, mock_iam_context, mock_s3_context, mock_sqs_context, mock_ddb_context, mock_glue_context, mock_scheduler_context, mock_events_context):
        from pipeline_resources_builder.lambda_function import PipelineResourceBuilder, Parameters, MetaTable, EventsClient
        
        self.init_default_parameter(httpserver, mock_iam_context, mock_s3_context, mock_sqs_context, mock_ddb_context, mock_glue_context, mock_scheduler_context)
        
        AWS_DDB_META = MetaTable()
        AWS_EVENTS = EventsClient()

        # test for services
        pipeline_id = str(uuid.uuid4())
        pipeline_info = copy.deepcopy(self.pipeline_info)
        pipeline_info['data']['source']['type'] = 'waf'
        pipeline_info['data']['destination']['table']['name'] = 'waf'
        pipeline_info['data']['scheduler']['LogProcessor']['schedule'] = 'rate(5 minutes)'
        pipeline_info['data']['scheduler']['LogMerger']['schedule'] = 'cron(0 1 * * ? *)'
        pipeline_info['data']['scheduler']['LogArchive']['schedule'] = 'cron(0 2 * * ? *)'
        pipeline_event = {'RequestType': 'Create', 'ResourceProperties': {'Resource': 'pipeline', 'Id': pipeline_id}}
        
        AWS_DDB_META.put(meta_name=pipeline_id, item=pipeline_info)
        
        parameters = Parameters(pipeline_event)
        pipeline_resource_builder = PipelineResourceBuilder(parameters=parameters)
        
        pipeline_resource_builder.create_rule()
        
        response = AWS_EVENTS._events_client.list_rules(NamePrefix='LogProcessor-waf', EventBusName='default')
        assert response['Rules'][0]['Name'] == 'LogProcessor-waf'
        assert response['Rules'][0]['State'] == 'ENABLED'
        assert response['Rules'][0]['ScheduleExpression'] == 'rate(5 minutes)'
        
        response = AWS_EVENTS._events_client.list_targets_by_rule(Rule='LogProcessor-waf', EventBusName='default')
        assert response['Targets'][0]['Id'] == pipeline_id
        
        response = AWS_EVENTS._events_client.list_rules(NamePrefix='LogMerger-waf', EventBusName='default')
        assert response['Rules'][0]['Name'] == 'LogMerger-waf'
        assert response['Rules'][0]['State'] == 'ENABLED'
        assert response['Rules'][0]['ScheduleExpression'] == 'cron(0 1 * * ? *)'
        
        response = AWS_EVENTS._events_client.list_targets_by_rule(Rule='LogMerger-waf', EventBusName='default')
        assert response['Targets'][0]['Id'] == pipeline_id
        
        response = AWS_EVENTS._events_client.list_rules(NamePrefix='LogMergerForMetrics-waf', EventBusName='default')
        assert response['Rules'][0]['Name'] == f'LogMergerForMetrics-waf'
        assert response['Rules'][0]['State'] == 'ENABLED'
        assert response['Rules'][0]['ScheduleExpression'] == 'cron(0 1 * * ? *)'
        
        response = AWS_EVENTS._events_client.list_targets_by_rule(Rule='LogMergerForMetrics-waf', EventBusName='default')
        assert response['Targets'][0]['Id'] == pipeline_id
        
        response = AWS_EVENTS._events_client.list_rules(NamePrefix='LogArchive-waf', EventBusName='default')
        assert response['Rules'][0]['Name'] == 'LogArchive-waf'
        assert response['Rules'][0]['State'] == 'ENABLED'
        assert response['Rules'][0]['ScheduleExpression'] == 'cron(0 2 * * ? *)'
        
        response = AWS_EVENTS._events_client.list_targets_by_rule(Rule='LogArchive-waf', EventBusName='default')
        assert response['Targets'][0]['Id'] == pipeline_id
        
        response = AWS_EVENTS._events_client.list_rules(NamePrefix='LogArchiveForMetrics-waf', EventBusName='default')
        assert response['Rules'][0]['Name'] == 'LogArchiveForMetrics-waf'
        assert response['Rules'][0]['State'] == 'ENABLED'
        assert response['Rules'][0]['ScheduleExpression'] == 'cron(0 2 * * ? *)'
        
        response = AWS_EVENTS._events_client.list_targets_by_rule(Rule='LogArchiveForMetrics-waf', EventBusName='default')
        assert response['Targets'][0]['Id'] == pipeline_id
        
        pipeline_resource_builder.delete_rule()
        
        response = AWS_EVENTS._events_client.list_rules(NamePrefix='LogProcessor-waf', EventBusName='default')
        assert response['Rules'] == []

        response = AWS_EVENTS._events_client.list_rules(NamePrefix='LogMerger-waf', EventBusName='default')
        assert response['Rules'] == []
        
        response = AWS_EVENTS._events_client.list_rules(NamePrefix='LogMergerForMetrics-waf', EventBusName='default')
        assert response['Rules'] == []
        
        response = AWS_EVENTS._events_client.list_rules(NamePrefix='LogArchive-waf', EventBusName='default')
        assert response['Rules'] == []
        
        response = AWS_EVENTS._events_client.list_rules(NamePrefix='LogArchiveForMetrics-waf', EventBusName='default')
        assert response['Rules'] == []
        
        # test for application
        pipeline_id = str(uuid.uuid4())
        pipeline_info = copy.deepcopy(self.pipeline_info)
        pipeline_info['data']['source']['type'] = 's3'
        pipeline_info['data']['source']['table']['schema'] = '{"type": "objects","properties":{"time":{"type":"string"}}}'
        pipeline_info['data']['source']['table']['dataFormat'] = 'JSON'
        pipeline_info['data']['destination']['table']['name'] = 'application'
        pipeline_info['data']['scheduler']['LogProcessor']['schedule'] = 'rate(5 minutes)'
        pipeline_info['data']['scheduler']['LogMerger']['schedule'] = 'cron(0 1 * * ? *)'
        pipeline_info['data']['scheduler']['LogArchive']['schedule'] = 'cron(0 2 * * ? *)'
        pipeline_event = {'RequestType': 'Create', 'ResourceProperties': {'Resource': 'pipeline', 'Id': pipeline_id}}
        
        AWS_DDB_META.put(meta_name=pipeline_id, item=pipeline_info)
        
        parameters = Parameters(pipeline_event)
        pipeline_resource_builder = PipelineResourceBuilder(parameters=parameters)
        
        pipeline_resource_builder.create_rule()
        
        response = AWS_EVENTS._events_client.list_rules(NamePrefix='LogProcessor-application', EventBusName='default')
        assert response['Rules'][0]['Name'] == 'LogProcessor-application'
        assert response['Rules'][0]['State'] == 'ENABLED'
        assert response['Rules'][0]['ScheduleExpression'] == 'rate(5 minutes)'
        
        response = AWS_EVENTS._events_client.list_targets_by_rule(Rule='LogProcessor-application', EventBusName='default')
        assert response['Targets'][0]['Id'] == pipeline_id
        
        response = AWS_EVENTS._events_client.list_rules(NamePrefix='LogMerger-application', EventBusName='default')
        assert response['Rules'][0]['Name'] == 'LogMerger-application'
        assert response['Rules'][0]['State'] == 'ENABLED'
        assert response['Rules'][0]['ScheduleExpression'] == 'cron(0 1 * * ? *)'
        
        response = AWS_EVENTS._events_client.list_targets_by_rule(Rule='LogMerger-application', EventBusName='default')
        assert response['Targets'][0]['Id'] == pipeline_id
        
        response = AWS_EVENTS._events_client.list_rules(NamePrefix='LogMergerForMetrics-application', EventBusName='default')
        assert response['Rules'] == []
        
        response = AWS_EVENTS._events_client.list_rules(NamePrefix='LogArchive-application', EventBusName='default')
        assert response['Rules'][0]['Name'] == 'LogArchive-application'
        assert response['Rules'][0]['State'] == 'ENABLED'
        assert response['Rules'][0]['ScheduleExpression'] == 'cron(0 2 * * ? *)'
        
        response = AWS_EVENTS._events_client.list_targets_by_rule(Rule='LogArchive-application', EventBusName='default')
        assert response['Targets'][0]['Id'] == pipeline_id
        
        response = AWS_EVENTS._events_client.list_rules(NamePrefix='LogArchiveForMetrics-application', EventBusName='default')
        assert response['Rules'] == []
        
        pipeline_resource_builder.delete_rule()
        
        response = AWS_EVENTS._events_client.list_rules(NamePrefix='LogProcessor-application', EventBusName='default')
        assert response['Rules'] == []

        response = AWS_EVENTS._events_client.list_rules(NamePrefix='LogMerger-application', EventBusName='default')
        assert response['Rules'] == []
        
        response = AWS_EVENTS._events_client.list_rules(NamePrefix='LogMergerForMetrics-application', EventBusName='default')
        assert response['Rules'] == []
        
        response = AWS_EVENTS._events_client.list_rules(NamePrefix='LogArchive-application', EventBusName='default')
        assert response['Rules'] == []
        
        response = AWS_EVENTS._events_client.list_rules(NamePrefix='LogArchiveForMetrics-application', EventBusName='default')
        assert response['Rules'] == []
    
    def test_create_scheduler(self, httpserver: HTTPServer, mock_iam_context, mock_s3_context, mock_sqs_context, mock_ddb_context, mock_glue_context, mock_scheduler_context, mock_events_context):
        from pipeline_resources_builder.lambda_function import PipelineResourceBuilder, Parameters, MetaTable, SchedulerClient
        
        self.init_default_parameter(httpserver, mock_iam_context, mock_s3_context, mock_sqs_context, mock_ddb_context, mock_glue_context, mock_scheduler_context)
        
        AWS_DDB_META = MetaTable()
        AWS_SCHEDULER = SchedulerClient()
        
        # test for services
        pipeline_id = str(uuid.uuid4())
        pipeline_info = copy.deepcopy(self.pipeline_info)
        pipeline_info['data']['source']['type'] = 'waf'
        pipeline_info['data']['destination']['table']['name'] = 'waf'
        pipeline_info['data']['scheduler']['LogProcessor']['schedule'] = 'rate(5 minutes)'
        pipeline_info['data']['scheduler']['LogMerger']['schedule'] = 'cron(0 1 * * ? *)'
        pipeline_info['data']['scheduler']['LogArchive']['schedule'] = 'cron(0 2 * * ? *)'
        pipeline_event = {'RequestType': 'Create', 'ResourceProperties': {'Resource': 'pipeline', 'Id': pipeline_id}}
        
        AWS_DDB_META.put(meta_name=pipeline_id, item=pipeline_info)
        
        parameters = Parameters(pipeline_event)
        pipeline_resource_builder = PipelineResourceBuilder(parameters=parameters)
        
        pipeline_resource_builder.create_scheduler()
        
        response = AWS_SCHEDULER.get_schedule_group(name=pipeline_id)
        assert response['Name'] == pipeline_id
        
        response = AWS_SCHEDULER.get_schedule(name='LogProcessor', group_name=pipeline_id)
        assert response['Arn'] == f'arn:aws:scheduler:{self.aws_region}:{self.account_id}:schedule/{pipeline_id}/LogProcessor'
        assert response['FlexibleTimeWindow'] == {'Mode': 'OFF'}
        assert response['GroupName'] == pipeline_id
        assert response['Name'] == 'LogProcessor'
        assert response['ScheduleExpression'] == 'rate(5 minutes)'
        assert response['State'] == 'ENABLED'
        
        response = AWS_SCHEDULER.get_schedule(name='LogMerger', group_name=pipeline_id)
        assert response['Arn'] == f'arn:aws:scheduler:{self.aws_region}:{self.account_id}:schedule/{pipeline_id}/LogMerger'
        assert response['FlexibleTimeWindow'] == {'MaximumWindowInMinutes': 30, 'Mode': 'FLEXIBLE'}
        assert response['GroupName'] == pipeline_id
        assert response['Name'] == 'LogMerger'
        assert response['ScheduleExpression'] == 'cron(0 1 * * ? *)'
        assert response['State'] == 'ENABLED'

        response = AWS_SCHEDULER.get_schedule(name='LogMergerForMetrics', group_name=pipeline_id)
        assert response['Arn'] == f'arn:aws:scheduler:{self.aws_region}:{self.account_id}:schedule/{pipeline_id}/LogMergerForMetrics'
        assert response['FlexibleTimeWindow'] == {'MaximumWindowInMinutes': 30, 'Mode': 'FLEXIBLE'}
        assert response['GroupName'] == pipeline_id
        assert response['Name'] == 'LogMergerForMetrics'
        assert response['ScheduleExpression'] == 'cron(0 1 * * ? *)'
        assert response['State'] == 'ENABLED'
        
        response = AWS_SCHEDULER.get_schedule(name='LogArchive', group_name=pipeline_id)
        assert response['Arn'] == f'arn:aws:scheduler:{self.aws_region}:{self.account_id}:schedule/{pipeline_id}/LogArchive'
        assert response['FlexibleTimeWindow'] == {'MaximumWindowInMinutes': 30, 'Mode': 'FLEXIBLE'}
        assert response['GroupName'] == pipeline_id
        assert response['Name'] == 'LogArchive'
        assert response['ScheduleExpression'] == 'cron(0 2 * * ? *)'
        assert response['State'] == 'ENABLED'
        
        response = AWS_SCHEDULER.get_schedule(name='LogArchiveForMetrics', group_name=pipeline_id)
        assert response['Arn'] == f'arn:aws:scheduler:{self.aws_region}:{self.account_id}:schedule/{pipeline_id}/LogArchiveForMetrics'
        assert response['FlexibleTimeWindow'] == {'MaximumWindowInMinutes': 30, 'Mode': 'FLEXIBLE'}
        assert response['GroupName'] == pipeline_id
        assert response['Name'] == 'LogArchiveForMetrics'
        assert response['ScheduleExpression'] == 'cron(0 2 * * ? *)'
        assert response['State'] == 'ENABLED'
        
        # test for application
        pipeline_id = str(uuid.uuid4())
        pipeline_info = copy.deepcopy(self.pipeline_info)
        pipeline_info['data']['source']['type'] = 's3'
        pipeline_info['data']['source']['table']['schema'] = '{"type": "objects","properties":{"time":{"type":"string"}}}'
        pipeline_info['data']['source']['table']['dataFormat'] = 'JSON'
        pipeline_info['data']['destination']['table']['name'] = 'application'
        pipeline_info['data']['scheduler']['LogProcessor']['schedule'] = 'rate(5 minutes)'
        pipeline_info['data']['scheduler']['LogMerger']['schedule'] = 'cron(0 1 * * ? *)'
        pipeline_info['data']['scheduler']['LogArchive']['schedule'] = 'cron(0 2 * * ? *)'
        pipeline_event = {'RequestType': 'Create', 'ResourceProperties': {'Resource': 'pipeline', 'Id': pipeline_id}}
        
        AWS_DDB_META.put(meta_name=pipeline_id, item=pipeline_info)
        
        parameters = Parameters(pipeline_event)
        pipeline_resource_builder = PipelineResourceBuilder(parameters=parameters)
        
        pipeline_resource_builder.create_scheduler()
        
        response = AWS_SCHEDULER.get_schedule_group(name=pipeline_id)
        assert response['Name'] == pipeline_id
        
        response = AWS_SCHEDULER.get_schedule(name='LogProcessor', group_name=pipeline_id)
        assert response['Arn'] == f'arn:aws:scheduler:{self.aws_region}:{self.account_id}:schedule/{pipeline_id}/LogProcessor'
        assert response['FlexibleTimeWindow'] == {'Mode': 'OFF'}
        assert response['GroupName'] == pipeline_id
        assert response['Name'] == 'LogProcessor'
        assert response['ScheduleExpression'] == 'rate(5 minutes)'
        assert response['State'] == 'ENABLED'
        
        response = AWS_SCHEDULER.get_schedule(name='LogMerger', group_name=pipeline_id)
        assert response['Arn'] == f'arn:aws:scheduler:{self.aws_region}:{self.account_id}:schedule/{pipeline_id}/LogMerger'
        assert response['FlexibleTimeWindow'] == {'MaximumWindowInMinutes': 30, 'Mode': 'FLEXIBLE'}
        assert response['GroupName'] == pipeline_id
        assert response['Name'] == 'LogMerger'
        assert response['ScheduleExpression'] == 'cron(0 1 * * ? *)'
        assert response['State'] == 'ENABLED'

        response = AWS_SCHEDULER.get_schedule(name='LogMergerForMetrics', group_name=pipeline_id)
        assert response == {}
        
        response = AWS_SCHEDULER.get_schedule(name='LogArchive', group_name=pipeline_id)
        assert response['Arn'] == f'arn:aws:scheduler:{self.aws_region}:{self.account_id}:schedule/{pipeline_id}/LogArchive'
        assert response['FlexibleTimeWindow'] == {'MaximumWindowInMinutes': 30, 'Mode': 'FLEXIBLE'}
        assert response['GroupName'] == pipeline_id
        assert response['Name'] == 'LogArchive'
        assert response['ScheduleExpression'] == 'cron(0 2 * * ? *)'
        assert response['State'] == 'ENABLED'
        
        response = AWS_SCHEDULER.get_schedule(name='LogArchiveForMetrics', group_name=pipeline_id)
        assert response == {}
        
    
    def test_delete_scheduler(self, httpserver: HTTPServer, mock_iam_context, mock_s3_context, mock_sqs_context, mock_ddb_context, mock_glue_context, mock_scheduler_context, mock_events_context):
        from pipeline_resources_builder.lambda_function import PipelineResourceBuilder, Parameters, MetaTable, SchedulerClient
        
        self.init_default_parameter(httpserver, mock_iam_context, mock_s3_context, mock_sqs_context, mock_ddb_context, mock_glue_context, mock_scheduler_context)
        
        AWS_DDB_META = MetaTable()
        AWS_SCHEDULER = SchedulerClient()

        # test for services
        pipeline_id = str(uuid.uuid4())
        pipeline_info = copy.deepcopy(self.pipeline_info)
        pipeline_info['data']['source']['type'] = 'waf'
        pipeline_info['data']['destination']['table']['name'] = 'waf'
        pipeline_info['data']['scheduler']['LogProcessor']['schedule'] = 'rate(5 minutes)'
        pipeline_info['data']['scheduler']['LogMerger']['schedule'] = 'cron(0 1 * * ? *)'
        pipeline_info['data']['scheduler']['LogArchive']['schedule'] = 'cron(0 2 * * ? *)'
        pipeline_event = {'RequestType': 'Create', 'ResourceProperties': {'Resource': 'pipeline', 'Id': pipeline_id}}
        
        AWS_DDB_META.put(meta_name=pipeline_id, item=pipeline_info)
        
        parameters = Parameters(pipeline_event)
        pipeline_resource_builder = PipelineResourceBuilder(parameters=parameters)
        
        pipeline_resource_builder.create_scheduler()
        
        response = AWS_SCHEDULER.get_schedule_group(name=pipeline_id)
        assert response['Name'] == pipeline_id
        
        response = AWS_SCHEDULER.get_schedule(name='LogProcessor', group_name=pipeline_id)
        assert response['Arn'] == f'arn:aws:scheduler:{self.aws_region}:{self.account_id}:schedule/{pipeline_id}/LogProcessor'
        assert response['FlexibleTimeWindow'] == {'Mode': 'OFF'}
        assert response['GroupName'] == pipeline_id
        assert response['Name'] == 'LogProcessor'
        assert response['ScheduleExpression'] == 'rate(5 minutes)'
        assert response['State'] == 'ENABLED'
        
        response = AWS_SCHEDULER.get_schedule(name='LogMerger', group_name=pipeline_id)
        assert response['Arn'] == f'arn:aws:scheduler:{self.aws_region}:{self.account_id}:schedule/{pipeline_id}/LogMerger'
        assert response['FlexibleTimeWindow'] == {'MaximumWindowInMinutes': 30, 'Mode': 'FLEXIBLE'}
        assert response['GroupName'] == pipeline_id
        assert response['Name'] == 'LogMerger'
        assert response['ScheduleExpression'] == 'cron(0 1 * * ? *)'
        assert response['State'] == 'ENABLED'

        response = AWS_SCHEDULER.get_schedule(name='LogMergerForMetrics', group_name=pipeline_id)
        assert response['Arn'] == f'arn:aws:scheduler:{self.aws_region}:{self.account_id}:schedule/{pipeline_id}/LogMergerForMetrics'
        assert response['FlexibleTimeWindow'] == {'MaximumWindowInMinutes': 30, 'Mode': 'FLEXIBLE'}
        assert response['GroupName'] == pipeline_id
        assert response['Name'] == 'LogMergerForMetrics'
        assert response['ScheduleExpression'] == 'cron(0 1 * * ? *)'
        assert response['State'] == 'ENABLED'
        
        response = AWS_SCHEDULER.get_schedule(name='LogArchive', group_name=pipeline_id)
        assert response['Arn'] == f'arn:aws:scheduler:{self.aws_region}:{self.account_id}:schedule/{pipeline_id}/LogArchive'
        assert response['FlexibleTimeWindow'] == {'MaximumWindowInMinutes': 30, 'Mode': 'FLEXIBLE'}
        assert response['GroupName'] == pipeline_id
        assert response['Name'] == 'LogArchive'
        assert response['ScheduleExpression'] == 'cron(0 2 * * ? *)'
        assert response['State'] == 'ENABLED'
        
        response = AWS_SCHEDULER.get_schedule(name='LogArchiveForMetrics', group_name=pipeline_id)
        assert response['Arn'] == f'arn:aws:scheduler:{self.aws_region}:{self.account_id}:schedule/{pipeline_id}/LogArchiveForMetrics'
        assert response['FlexibleTimeWindow'] == {'MaximumWindowInMinutes': 30, 'Mode': 'FLEXIBLE'}
        assert response['GroupName'] == pipeline_id
        assert response['Name'] == 'LogArchiveForMetrics'
        assert response['ScheduleExpression'] == 'cron(0 2 * * ? *)'
        assert response['State'] == 'ENABLED'
        
        pipeline_resource_builder.delete_scheduler()
        
        response = AWS_SCHEDULER.get_schedule(name='LogProcessor', group_name=pipeline_id)
        assert response == {}
        
        response = AWS_SCHEDULER.get_schedule(name='LogMerger', group_name=pipeline_id)
        assert response == {}

        response = AWS_SCHEDULER.get_schedule(name='LogMergerForMetrics', group_name=pipeline_id)
        assert response == {}
        
        response = AWS_SCHEDULER.get_schedule(name='LogArchive', group_name=pipeline_id)
        assert response == {}
        
        response = AWS_SCHEDULER.get_schedule(name='LogArchiveForMetrics', group_name=pipeline_id)
        assert response == {}
                
        # test for application
        pipeline_id = str(uuid.uuid4())
        pipeline_info = copy.deepcopy(self.pipeline_info)
        pipeline_info['data']['source']['type'] = 's3'
        pipeline_info['data']['source']['table']['schema'] = '{"type": "objects","properties":{"time":{"type":"string"}}}'
        pipeline_info['data']['source']['table']['dataFormat'] = 'JSON'
        pipeline_info['data']['destination']['table']['name'] = 'application'
        pipeline_info['data']['scheduler']['LogProcessor']['schedule'] = 'rate(5 minutes)'
        pipeline_info['data']['scheduler']['LogMerger']['schedule'] = 'cron(0 1 * * ? *)'
        pipeline_info['data']['scheduler']['LogArchive']['schedule'] = 'cron(0 2 * * ? *)'
        pipeline_event = {'RequestType': 'Create', 'ResourceProperties': {'Resource': 'pipeline', 'Id': pipeline_id}}
        
        AWS_DDB_META.put(meta_name=pipeline_id, item=pipeline_info)
        
        parameters = Parameters(pipeline_event)
        pipeline_resource_builder = PipelineResourceBuilder(parameters=parameters)
        
        pipeline_resource_builder.create_scheduler()
        
        response = AWS_SCHEDULER.get_schedule_group(name=pipeline_id)
        assert response['Name'] == pipeline_id
        
        response = AWS_SCHEDULER.get_schedule(name='LogProcessor', group_name=pipeline_id)
        assert response['Arn'] == f'arn:aws:scheduler:{self.aws_region}:{self.account_id}:schedule/{pipeline_id}/LogProcessor'
        assert response['FlexibleTimeWindow'] == {'Mode': 'OFF'}
        assert response['GroupName'] == pipeline_id
        assert response['Name'] == 'LogProcessor'
        assert response['ScheduleExpression'] == 'rate(5 minutes)'
        assert response['State'] == 'ENABLED'
        
        response = AWS_SCHEDULER.get_schedule(name='LogMerger', group_name=pipeline_id)
        assert response['Arn'] == f'arn:aws:scheduler:{self.aws_region}:{self.account_id}:schedule/{pipeline_id}/LogMerger'
        assert response['FlexibleTimeWindow'] == {'MaximumWindowInMinutes': 30, 'Mode': 'FLEXIBLE'}
        assert response['GroupName'] == pipeline_id
        assert response['Name'] == 'LogMerger'
        assert response['ScheduleExpression'] == 'cron(0 1 * * ? *)'
        assert response['State'] == 'ENABLED'

        response = AWS_SCHEDULER.get_schedule(name='LogMergerForMetrics', group_name=pipeline_id)
        assert response == {}
        
        response = AWS_SCHEDULER.get_schedule(name='LogArchive', group_name=pipeline_id)
        assert response['Arn'] == f'arn:aws:scheduler:{self.aws_region}:{self.account_id}:schedule/{pipeline_id}/LogArchive'
        assert response['FlexibleTimeWindow'] == {'MaximumWindowInMinutes': 30, 'Mode': 'FLEXIBLE'}
        assert response['GroupName'] == pipeline_id
        assert response['Name'] == 'LogArchive'
        assert response['ScheduleExpression'] == 'cron(0 2 * * ? *)'
        assert response['State'] == 'ENABLED'
        
        response = AWS_SCHEDULER.get_schedule(name='LogArchiveForMetrics', group_name=pipeline_id)
        assert response == {}
        
        pipeline_resource_builder.delete_scheduler()
        
        response = AWS_SCHEDULER.get_schedule(name='LogProcessor', group_name=pipeline_id)
        assert response == {}
        
        response = AWS_SCHEDULER.get_schedule(name='LogMerger', group_name=pipeline_id)
        assert response == {}

        response = AWS_SCHEDULER.get_schedule(name='LogMergerForMetrics', group_name=pipeline_id)
        assert response == {}
        
        response = AWS_SCHEDULER.get_schedule(name='LogArchive', group_name=pipeline_id)
        assert response == {}
        
        response = AWS_SCHEDULER.get_schedule(name='LogArchiveForMetrics', group_name=pipeline_id)
        assert response == {}
    
    def test_init_destination_policy_info(self, httpserver: HTTPServer, mock_iam_context, mock_s3_context, mock_sqs_context, mock_ddb_context, mock_glue_context, mock_scheduler_context, mock_events_context):
        from pipeline_resources_builder.lambda_function import PipelineResourceBuilder, Parameters, MetaTable
        
        self.init_default_parameter(httpserver, mock_iam_context, mock_s3_context, mock_sqs_context, mock_ddb_context, mock_glue_context, mock_scheduler_context)
        
        AWS_DDB_META = MetaTable()
        
        self.pipeline_resource_builder._init_destination_policy_info()
        
        assert self.pipeline_resource_builder.destination_policy_resources == [
            'arn:aws:s3:::centralized-bucket/datalake/centralized/waf*', 
            'arn:aws:s3:::centralized-bucket/datalake/centralized/waf_metrics*'
            ]
        assert self.pipeline_resource_builder.s3_public_access_policy_sid == 'S3AccessPolicyForDestination'
        assert self.pipeline_resource_builder.s3_public_access_policy_document['Document']['Statement'] == [
            {'Sid': 'S3AccessPolicyForDestination', 
             'Action': [
                 's3:ListBucket', 
                 's3:ListBucketMultipartUploads', 
                 's3:ListMultipartUploadParts', 
                 's3:GetObject', 
                 's3:GetBucketLocation', 
                 's3:AbortMultipartUpload', 
                 's3:CreateBucket', 
                 's3:PutObject', 
                 's3:DeleteObject'
                 ], 
             'Resource': [
                 'arn:aws:s3:::logging-bucket', 
                 'arn:aws:s3:::logging-bucket/*'
                 ], 
             'Effect': 'Allow'
             }
            ]
        
        application_pipeline_id = str(uuid.uuid4())
        application_pipeline_info = {
            'metaName': application_pipeline_id,
            'data': {
                'source': {
                    'type': 'fluent-bit',
                    'table': {
                        'schema': '{"type":"object","properties":{"timestamp":{"type":"string","timeKey":true,"format":"YYYY-MM-dd\'\'T\'\'HH:mm:ss.SSSSSSSSSZ"},"correlationId":{"type":"string"},"processInfo":{"type":"object","properties":{"hostname":{"type":"string"},"domainId":{"type":"string"},"groupId":{"type":"string"},"groupName":{"type":"string"},"serviceId":{"type":"string","partition":true},"serviceName":{"type":"string"},"version":{"type":"string"}}},"transactionSummary":{"type":"object","properties":{"path":{"type":"string"},"protocol":{"type":"string"},"protocolSrc":{"type":"string"},"status":{"type":"string"},"serviceContexts":{"type":"array","items":{"type":"object","properties":{"service":{"type":"string"},"monitor":{"type":"boolean"},"client":{"type":"string"},"org":{},"app":{},"method":{"type":"string"},"status":{"type":"string"},"duration":{"type":"number"}}}}}}}}',
                        'dataFormat': 'json', 
                        'tableProperties': '{}', 
                        'serializationProperties': '{}', 
                    },
                },
                'destination': {
                    'location': {
                        'bucket': self.centralized_bucket_name,
                        'prefix': self.centralized_bucket_prefix,
                    },
                    'database': {
                        'name': self.centralized_database,
                    },
                    'table': {
                        'name': 'application',
                        'schema': '{}',
                    },
                    'metrics': {
                        'name': '',
                        'schema': '{}',
                    },
                },
                'notification': {
                    'service': 'SES',
                    'recipients': 'alejandro_rosalez@example.com,alejandro_rosalez@example.org'
                },
                'grafana': {
                    'importDashboards': 'false',
                    'url': '',
                    'token': '',
                },
                'scheduler': {
                    'LogProcessor': {
                        'schedule': 'rate(5 minutes)',
                    },
                    'LogMerger': {
                        'schedule': 'cron(0 1 * * ? *)',
                        'age': 3,
                    },
                    'LogArchive': {
                        'schedule': 'cron(0 2 * * ? *)',
                        'age': 7,
                    },
                },
                'staging': {
                    'prefix': 'APPLogs/ServicesLogs'
                }
            },
            'stack': {
                'lambda': {
                    'replicate': self.replication_function_arn
                },
                'queue':{
                    'logEventQueue': self.replication_sqs_arn,
                    'logEventDLQ': self.replication_dlq_arn,
                },
                'role': {
                    'replicate': self.replication_role_arn
                }
            }
        }

        AWS_DDB_META.put(meta_name=application_pipeline_id, item=application_pipeline_info)
        
        create_pipeline_event = copy.deepcopy(self.pipeline_event)
        create_pipeline_event['ResourceProperties']['Id'] = application_pipeline_id
        param = Parameters(create_pipeline_event)
        pipeline_resource_builder = PipelineResourceBuilder(parameters=param)
    
        pipeline_resource_builder.table_metadata_and_statements.metrics = None
        pipeline_resource_builder._init_destination_policy_info()
        
        assert pipeline_resource_builder.destination_policy_resources == [
            'arn:aws:s3:::centralized-bucket/datalake/centralized/application*'
            ]
        assert pipeline_resource_builder.s3_public_access_policy_sid == 'S3AccessPolicyForDestination'
        assert pipeline_resource_builder.s3_public_access_policy_document['Document']['Statement'] == [
            {'Sid': 'S3AccessPolicyForDestination', 
             'Action': [
                 's3:ListBucket', 
                 's3:ListBucketMultipartUploads', 
                 's3:ListMultipartUploadParts', 
                 's3:GetObject', 
                 's3:GetBucketLocation', 
                 's3:AbortMultipartUpload', 
                 's3:CreateBucket', 
                 's3:PutObject', 
                 's3:DeleteObject'
                 ], 
             'Resource': [
                 'arn:aws:s3:::logging-bucket', 
                 'arn:aws:s3:::logging-bucket/*'
                 ], 
             'Effect': 'Allow'
             }
            ]
    
    def test_grant_destination_bucket_access_permission(self, httpserver: HTTPServer, mock_iam_context, mock_s3_context, mock_sqs_context, mock_ddb_context, mock_glue_context, mock_scheduler_context):
        from pipeline_resources_builder.lambda_function import PipelineResourceBuilder, Parameters, MetaTable, IAMClient
        
        self.init_default_parameter(httpserver, mock_iam_context, mock_s3_context, mock_sqs_context, mock_ddb_context, mock_glue_context, mock_scheduler_context)
        
        AWS_DDB_META = MetaTable()
        AWS_IAM = IAMClient()
        
        pipeline_id = str(uuid.uuid4())
        pipeline_info = copy.deepcopy(self.pipeline_info)
        
        AWS_DDB_META.put(meta_name=pipeline_id, item=pipeline_info)
        
        pipeline_event = copy.deepcopy(self.pipeline_event)
        pipeline_event['ResourceProperties']['Id'] = pipeline_id
        
        parameters = Parameters(pipeline_event)
        pipeline_resource_builder = PipelineResourceBuilder(parameters=parameters)

        pipeline_resource_builder.grant_destination_bucket_access_permission()
        
        response = AWS_IAM.get_policy_document(arn=pipeline_resource_builder.parameters.pipeline_info.role.s3_public_access, sid=pipeline_resource_builder.s3_public_access_policy_sid)
        assert response['Document']['Statement'] == [
            {
                'Sid': 'S3AccessPolicyForDestination', 
                'Action': [
                    's3:ListBucket', 
                    's3:ListBucketMultipartUploads', 
                    's3:ListMultipartUploadParts', 
                    's3:GetObject', 
                    's3:GetBucketLocation', 
                    's3:AbortMultipartUpload', 
                    's3:CreateBucket', 
                    's3:PutObject', 
                    's3:DeleteObject'
                    ], 
                'Resource': [
                    'arn:aws:s3:::logging-bucket', 
                    'arn:aws:s3:::logging-bucket/*', 
                    'arn:aws:s3:::centralized-bucket/datalake/centralized/waf*', 
                    'arn:aws:s3:::centralized-bucket', 
                    'arn:aws:s3:::centralized-bucket/datalake/centralized/waf_metrics*'
                    ], 
                'Effect': 'Allow'
                }
            ]
        
        # repeat to grant permission
        pipeline_resource_builder.grant_destination_bucket_access_permission()
        
        response = AWS_IAM.get_policy_document(arn=pipeline_resource_builder.parameters.pipeline_info.role.s3_public_access, sid=pipeline_resource_builder.s3_public_access_policy_sid)
        assert response['Document']['Statement'] == [
            {
                'Sid': 'S3AccessPolicyForDestination', 
                'Action': [
                    's3:ListBucket', 
                    's3:ListBucketMultipartUploads', 
                    's3:ListMultipartUploadParts', 
                    's3:GetObject', 
                    's3:GetBucketLocation', 
                    's3:AbortMultipartUpload', 
                    's3:CreateBucket', 
                    's3:PutObject', 
                    's3:DeleteObject'
                    ], 
                'Resource': [
                    'arn:aws:s3:::logging-bucket', 
                    'arn:aws:s3:::logging-bucket/*', 
                    'arn:aws:s3:::centralized-bucket/datalake/centralized/waf*', 
                    'arn:aws:s3:::centralized-bucket', 
                    'arn:aws:s3:::centralized-bucket/datalake/centralized/waf_metrics*'
                    ], 
                'Effect': 'Allow'
                }
            ]
        
        policy_document = {
            "Version": "2012-10-17",
            "Statement": [
                {
                    "Action": [
                        "s3:GetObject",
                        "s3:GetObjectTagging",
                    ],
                    "Resource": [
                        "arn:aws:s3:::staging-bucket/*"
                    ],
                    "Effect": "Allow"
                }
            ]
        }
        
        response = AWS_IAM._iam_client.create_policy(PolicyName="TestPolicy", PolicyDocument=json.dumps(policy_document))
        test_policy_arn = response['Policy']['Arn']
        
        AWS_DDB_META.update(meta_name='S3PublicAccessPolicy', item={
            'arn': test_policy_arn,
            'name': 'S3PublicAccessPolicy',
            'service': 'IAM',
            'url': '',
            })
        
        pipeline_id = str(uuid.uuid4())
        pipeline_info = copy.deepcopy(self.pipeline_info)
        
        AWS_DDB_META.put(meta_name=pipeline_id, item=pipeline_info)
        
        pipeline_event = copy.deepcopy(self.pipeline_event)
        pipeline_event['ResourceProperties']['Id'] = pipeline_id
        
        parameters = Parameters(pipeline_event)
        pipeline_resource_builder = PipelineResourceBuilder(parameters=parameters)

        pipeline_resource_builder.grant_destination_bucket_access_permission()

        response = AWS_IAM.get_policy_document(arn=pipeline_resource_builder.parameters.pipeline_info.role.s3_public_access, sid=pipeline_resource_builder.s3_public_access_policy_sid)
        assert response['Document']['Statement'] == [
            {
                'Effect': 'Allow', 
                'Action': [
                    's3:ListBucket', 
                    's3:ListBucketMultipartUploads', 
                    's3:ListMultipartUploadParts', 
                    's3:GetObject', 
                    's3:GetBucketLocation', 
                    's3:AbortMultipartUpload', 
                    's3:CreateBucket', 
                    's3:PutObject', 
                    's3:DeleteObject'
                    ], 
                'Resource': [
                    'arn:aws:s3:::centralized-bucket/datalake/centralized/waf*', 
                    'arn:aws:s3:::centralized-bucket',
                    'arn:aws:s3:::centralized-bucket/datalake/centralized/waf_metrics*'
                    ], 
                'Sid': 'S3AccessPolicyForDestination'
                }
            ]
        
    def test_revoke_destination_bucket_access_permission(self, httpserver: HTTPServer, mock_iam_context, mock_s3_context, mock_sqs_context, mock_ddb_context, mock_glue_context, mock_scheduler_context):
        from pipeline_resources_builder.lambda_function import PipelineResourceBuilder, Parameters, MetaTable, IAMClient
        
        self.init_default_parameter(httpserver, mock_iam_context, mock_s3_context, mock_sqs_context, mock_ddb_context, mock_glue_context, mock_scheduler_context)
        
        AWS_DDB_META = MetaTable()
        AWS_IAM = IAMClient()

        pipeline_id = str(uuid.uuid4())
        pipeline_info = copy.deepcopy(self.pipeline_info)
        
        AWS_DDB_META.put(meta_name=pipeline_id, item=pipeline_info)
        
        pipeline_event = copy.deepcopy(self.pipeline_event)
        pipeline_event['ResourceProperties']['Id'] = pipeline_id
        
        parameters = Parameters(pipeline_event)
        pipeline_resource_builder = PipelineResourceBuilder(parameters=parameters)

        pipeline_resource_builder.grant_destination_bucket_access_permission()
        pipeline_resource_builder.revoke_destination_bucket_access_permission()
        
        response = AWS_IAM.get_policy_document(arn=pipeline_resource_builder.parameters.pipeline_info.role.s3_public_access, sid=pipeline_resource_builder.s3_public_access_policy_sid)
        assert response['Document']['Statement'] == [
            {
                'Sid': 'S3AccessPolicyForDestination', 
                'Action': [
                    's3:ListBucket', 
                    's3:ListBucketMultipartUploads', 
                    's3:ListMultipartUploadParts', 
                    's3:GetObject', 
                    's3:GetBucketLocation', 
                    's3:AbortMultipartUpload', 
                    's3:CreateBucket', 
                    's3:PutObject', 
                    's3:DeleteObject'
                    ], 
                'Resource': [
                    'arn:aws:s3:::logging-bucket', 
                    'arn:aws:s3:::logging-bucket/*'
                    ], 
                'Effect': 'Allow'
                }
            ]
        
        policy_document = {
            "Version": "2012-10-17",
            "Statement": [
                {
                    "Action": [
                        "s3:GetObject",
                        "s3:GetObjectTagging",
                    ],
                    "Resource": [
                        "arn:aws:s3:::staging-bucket/*"
                    ],
                    "Effect": "Allow"
                }
            ]
        }
        
        response = AWS_IAM._iam_client.create_policy(PolicyName="TestPolicy", PolicyDocument=json.dumps(policy_document))
        test_policy_arn = response['Policy']['Arn']
        
        AWS_DDB_META.update(meta_name='S3PublicAccessPolicy', item={
            'arn': test_policy_arn,
            'name': 'S3PublicAccessPolicy',
            'service': 'IAM',
            'url': '',
            })
        
        pipeline_id = str(uuid.uuid4())
        pipeline_info = copy.deepcopy(self.pipeline_info)
        
        AWS_DDB_META.put(meta_name=pipeline_id, item=pipeline_info)
        
        pipeline_event = copy.deepcopy(self.pipeline_event)
        pipeline_event['ResourceProperties']['Id'] = pipeline_id
        
        parameters = Parameters(pipeline_event)
        pipeline_resource_builder = PipelineResourceBuilder(parameters=parameters)

        pipeline_resource_builder.grant_destination_bucket_access_permission()
        
        pipeline_resource_builder.grant_destination_bucket_access_permission()
        pipeline_resource_builder.revoke_destination_bucket_access_permission()
        
        response = AWS_IAM.get_policy_document(arn=test_policy_arn, sid=pipeline_resource_builder.s3_public_access_policy_sid)
        assert response['Document']['Statement'] == []
        
    def test_grant_sqs_send_message_permission_to_source_bucket(self, httpserver: HTTPServer, mock_iam_context, mock_s3_context, mock_sqs_context, mock_ddb_context, mock_glue_context, mock_scheduler_context):
        from pipeline_resources_builder.lambda_function import PipelineResourceBuilder, Parameters, SQSClient
        
        self.init_default_parameter(httpserver, mock_iam_context, mock_s3_context, mock_sqs_context, mock_ddb_context, mock_glue_context, mock_scheduler_context)
        
        AWS_SQS = SQSClient()

        replication_sqs_url = AWS_SQS.get_queue_url(name=self.replication_sqs_name)
        replication_dlq_url = AWS_SQS.get_queue_url(name=self.replication_dlq_name)
        
        parameters = Parameters(self.ingestion_event)
        pipeline_resource_builder = PipelineResourceBuilder(parameters=parameters)
        
        pipeline_resource_builder.grant_sqs_send_message_permission_to_source_bucket()

        response = AWS_SQS.get_queue_policy(url=replication_sqs_url)
        assert response['Statement'] == [
            {
                'Effect': 'Allow', 
                'Principal': {'Service': 's3.amazonaws.com'}, 
                'Action': ['sqs:SendMessage'], 
                'Resource': self.replication_sqs_arn, 
                'Condition': {
                    'ArnLike': {
                        'aws:SourceArn': 'arn:aws:s3:::logging-bucket'
                        }
                    }, 
                'Sid': pipeline_resource_builder.parameters.policy_sid
                    }
            ]
        
        response = AWS_SQS.get_queue_policy(url=replication_dlq_url)
        assert response['Statement'] == [
            {
                'Effect': 'Allow', 
                'Principal': {'Service': 's3.amazonaws.com'}, 
                'Action': ['sqs:SendMessage'], 
                'Resource': self.replication_dlq_arn, 
                'Condition': {
                    'ArnLike': {
                        'aws:SourceArn': 'arn:aws:s3:::logging-bucket'
                        }
                    }, 
                'Sid': pipeline_resource_builder.parameters.policy_sid
                    }
            ]
    
    def test_revoke_sqs_send_message_permission(self, httpserver: HTTPServer, mock_iam_context, mock_s3_context, mock_sqs_context, mock_ddb_context, mock_glue_context, mock_scheduler_context):
        from pipeline_resources_builder.lambda_function import PipelineResourceBuilder, Parameters, SQSClient
        
        self.init_default_parameter(httpserver, mock_iam_context, mock_s3_context, mock_sqs_context, mock_ddb_context, mock_glue_context, mock_scheduler_context)
        
        AWS_SQS = SQSClient()

        replication_sqs_url = AWS_SQS.get_queue_url(name=self.replication_sqs_name)
        replication_dlq_url = AWS_SQS.get_queue_url(name=self.replication_dlq_name)
        
        parameters = Parameters(self.ingestion_event)
        pipeline_resource_builder = PipelineResourceBuilder(parameters=parameters)
        
        pipeline_resource_builder.grant_sqs_send_message_permission_to_source_bucket()
        pipeline_resource_builder.revoke_sqs_send_message_permission()

        response = AWS_SQS.get_queue_policy(url=replication_sqs_url)
        assert response['Statement'] == []
        
        response = AWS_SQS.get_queue_policy(url=replication_dlq_url)
        assert response['Statement'] == []
    
    def test_init_send_email_via_sns_policy_info(self, httpserver: HTTPServer, mock_iam_context, mock_s3_context, mock_sqs_context, mock_ddb_context, mock_glue_context, mock_scheduler_context, mock_sns_context):
        from pipeline_resources_builder.lambda_function import PipelineResourceBuilder, Parameters
        
        self.init_default_parameter(httpserver, mock_iam_context, mock_s3_context, mock_sqs_context, mock_ddb_context, mock_glue_context, mock_scheduler_context)
        
        send_template_email_sns_public_policy_arn = os.environ["SEND_TEMPLATE_EMAIL_SNS_PUBLIC_POLICY_ARN"]
        
        parameters = Parameters(self.pipeline_event)
        pipeline_resource_builder = PipelineResourceBuilder(parameters=parameters)
        
        pipeline_resource_builder._init_send_email_via_sns_policy_info()
        assert pipeline_resource_builder.send_email_via_sns_policy_arn == send_template_email_sns_public_policy_arn
    
    def test_grant_publish_sns_message_permission(self, httpserver: HTTPServer, mock_iam_context, mock_s3_context, mock_sqs_context, mock_ddb_context, mock_glue_context, mock_scheduler_context, mock_sns_context):
        from pipeline_resources_builder.lambda_function import PipelineResourceBuilder, Parameters, MetaTable, IAMClient
        
        self.init_default_parameter(httpserver, mock_iam_context, mock_s3_context, mock_sqs_context, mock_ddb_context, mock_glue_context, mock_scheduler_context)
        
        AWS_DDB_META = MetaTable()
        AWS_IAM = IAMClient()
        
        send_template_email_sns_public_policy_arn = os.environ["SEND_TEMPLATE_EMAIL_SNS_PUBLIC_POLICY_ARN"]
        receive_failed_topic_arn = os.environ['RECEIVE_STATES_FAILED_TOPIC_ARN']
        
        pipeline_id = str(uuid.uuid4())
        pipeline_info = copy.deepcopy(self.pipeline_info)
        pipeline_info['data']['notification']['service'] = 'SNS'
        pipeline_info['data']['notification']['recipients'] = receive_failed_topic_arn
        pipeline_event = {'RequestType': 'Create', 'ResourceProperties': {'Resource': 'pipeline', 'Id': pipeline_id}}
        
        AWS_DDB_META.put(meta_name=pipeline_id, item=pipeline_info)
        
        parameters = Parameters(pipeline_event)
        pipeline_resource_builder = PipelineResourceBuilder(parameters=parameters)
        
        pipeline_resource_builder.grant_publish_sns_message_permission()
        assert AWS_IAM.get_policy_document(arn=send_template_email_sns_public_policy_arn, sid=pipeline_id.replace('-', ''))['Document'] == {
            'Statement': [
                {
                    'Action': 'SNS:Publish', 
                    'Effect': 'Allow', 
                    'Resource': receive_failed_topic_arn, 
                    'Sid': pipeline_id.replace('-', '')
                    }
                ], 
            'Version': '2012-10-17'
            }
    
    def test_revoke_publish_sns_message_permission(self, httpserver: HTTPServer, mock_iam_context, mock_s3_context, mock_sqs_context, mock_ddb_context, mock_glue_context, mock_scheduler_context, mock_sns_context):
        from pipeline_resources_builder.lambda_function import PipelineResourceBuilder, Parameters, MetaTable, IAMClient
        
        self.init_default_parameter(httpserver, mock_iam_context, mock_s3_context, mock_sqs_context, mock_ddb_context, mock_glue_context, mock_scheduler_context)
        
        AWS_DDB_META = MetaTable()
        AWS_IAM = IAMClient()

        send_template_email_sns_public_policy_arn = os.environ["SEND_TEMPLATE_EMAIL_SNS_PUBLIC_POLICY_ARN"]
        receive_failed_topic_arn = os.environ['RECEIVE_STATES_FAILED_TOPIC_ARN']
        
        pipeline_id = str(uuid.uuid4())
        pipeline_info = copy.deepcopy(self.pipeline_info)
        pipeline_info['data']['notification']['service'] = 'SNS'
        pipeline_info['data']['notification']['recipients'] = receive_failed_topic_arn
        pipeline_event = {'RequestType': 'Create', 'ResourceProperties': {'Resource': 'pipeline', 'Id': pipeline_id}}
        
        AWS_DDB_META.put(meta_name=pipeline_id, item=pipeline_info)
        
        parameters = Parameters(pipeline_event)
        pipeline_resource_builder = PipelineResourceBuilder(parameters=parameters)
        
        pipeline_resource_builder.grant_publish_sns_message_permission()
        pipeline_resource_builder.revoke_publish_sns_message_permission()
        assert AWS_IAM.get_policy_document(arn=send_template_email_sns_public_policy_arn, sid=pipeline_id.replace('-', ''))['Document']['Statement'] == []
        
    def test_grant_source_bucket_access_permission(self, httpserver: HTTPServer, mock_iam_context, mock_s3_context, mock_sqs_context, mock_ddb_context, mock_glue_context, mock_scheduler_context, mock_sts_context):
        from pipeline_resources_builder.lambda_function import PipelineResourceBuilder, Parameters, MetaTable, IAMClient, S3Client
        
        self.init_default_parameter(httpserver, mock_iam_context, mock_s3_context, mock_sqs_context, mock_ddb_context, mock_glue_context, mock_scheduler_context)  
    
        AWS_DDB_META = MetaTable()
        AWS_IAM = IAMClient()
        AWS_S3 = S3Client()
        
        ingestion_id = str(uuid.uuid4())
        ingestion_info = copy.deepcopy(self.ingestion_info)
        
        AWS_DDB_META.put(meta_name=ingestion_id, item=ingestion_info)
        
        ingestion_event = copy.deepcopy(self.ingestion_event)
        ingestion_event['ResourceProperties']['Id'] = ingestion_id
        
        ingestion_parameters = Parameters(ingestion_event)
        ingestion_resource_builder = PipelineResourceBuilder(parameters=ingestion_parameters)
        ingestion_resource_builder.s3_client = S3Client(sts_role_arn=ingestion_parameters.ingestion_info.role.sts)
        
        ingestion_resource_builder.grant_source_bucket_access_permission()
        
        response = AWS_S3.get_bucket_policy(bucket=ingestion_parameters.ingestion_info.source.location.bucket, sid=ingestion_parameters.policy_sid)
        assert response['Statement'] == [
            {
                'Effect': 'Allow', 
                'Action': [
                    's3:GetObject',
                    's3:GetObjectTagging',
                ],
                'Principal': {'AWS': self.replication_role_arn}, 
                'Resource': [
                    f'arn:aws:s3:::{self.logging_bucket_name}/AWSLogs/{self.account_id}/{self.aws_region}/WAFLogs*'
                    ], 
                'Sid': ingestion_parameters.policy_sid
                }
            ]
        
        response = AWS_IAM.get_role_policy(role_name=ingestion_parameters.pipeline_info.role.replicate.split('/')[-1], policy_name=ingestion_parameters.policy_sid)
        assert response['RoleName'] == ingestion_parameters.pipeline_info.role.replicate.split('/')[-1]
        assert response['PolicyName'] == ingestion_parameters.policy_sid
        assert response['PolicyDocument'] == {
            'Version': '2012-10-17', 
            'Statement': [
                {
                    'Effect': 'Allow', 
                    'Action': [
                        's3:GetObject',
                        's3:GetObjectTagging',
                    ],
                    'Resource': [
                        f'arn:aws:s3:::{self.logging_bucket_name}/AWSLogs/{self.account_id}/{self.aws_region}/WAFLogs*'
                        ]
                    }
                ]
            }
        
        # repeat to grant permission
        ingestion_resource_builder.grant_source_bucket_access_permission()
        
        response = AWS_S3.get_bucket_policy(bucket=ingestion_parameters.ingestion_info.source.location.bucket, sid=ingestion_parameters.policy_sid)
        assert response['Statement'] == [
            {
                'Effect': 'Allow', 
                'Action': [
                    's3:GetObject',
                    's3:GetObjectTagging',
                ],
                'Principal': {'AWS': self.replication_role_arn}, 
                'Resource': [
                    f'arn:aws:s3:::{self.logging_bucket_name}/AWSLogs/{self.account_id}/{self.aws_region}/WAFLogs*'
                    ], 
                'Sid': ingestion_parameters.policy_sid
                }
            ]
        
        response = AWS_IAM.get_role_policy(role_name=ingestion_parameters.pipeline_info.role.replicate.split('/')[-1], policy_name=ingestion_parameters.policy_sid)
        assert response['RoleName'] == ingestion_parameters.pipeline_info.role.replicate.split('/')[-1]
        assert response['PolicyName'] == ingestion_parameters.policy_sid
        assert response['PolicyDocument'] == {
            'Version': '2012-10-17', 
            'Statement': [
                {
                    'Effect': 'Allow', 
                    'Action': [
                        's3:GetObject',
                        's3:GetObjectTagging',
                    ],
                    'Resource': [
                        f'arn:aws:s3:::{self.logging_bucket_name}/AWSLogs/{self.account_id}/{self.aws_region}/WAFLogs*'
                        ]
                    }
                ]
            }
        
        # role.sts is not None
        log_processor_start_execution_role_arn = os.environ["LOG_PROCESSOR_START_EXECUTION_ROLE_ARN"]
        application_ingestion_id = os.environ['APPLICATION_INGESTION_ID']
        application_ingestion_info = AWS_DDB_META.get(meta_name=application_ingestion_id)
        application_ingestion_info['data']['role']['sts'] = log_processor_start_execution_role_arn
        
        ingestion_id = str(uuid.uuid4())
        ingestion_info = copy.deepcopy(application_ingestion_info)
        
        AWS_DDB_META.put(meta_name=ingestion_id, item=ingestion_info)
        
        ingestion_event = copy.deepcopy(self.ingestion_event)
        ingestion_event['ResourceProperties']['Id'] = ingestion_id
        
        ingestion_parameters = Parameters(ingestion_event)
        ingestion_resource_builder = PipelineResourceBuilder(parameters=ingestion_parameters)
        ingestion_resource_builder.s3_client = S3Client(sts_role_arn=ingestion_parameters.ingestion_info.role.sts)
        
        ingestion_resource_builder.grant_source_bucket_access_permission()
        
        response = AWS_S3.get_bucket_policy(bucket=ingestion_parameters.ingestion_info.source.location.bucket, sid=ingestion_parameters.policy_sid)
        assert response['Statement'] == [
            {
                'Effect': 'Allow', 
                'Action': [
                    's3:GetObject',
                    's3:GetObjectTagging',
                ],
                'Principal': {'AWS': self.replication_role_arn}, 
                'Resource': [
                    f'arn:aws:s3:::{self.logging_bucket_name}/AWSLogs/{self.account_id}/{self.aws_region}/WAFLogs*'
                    ], 
                'Sid': ingestion_parameters.policy_sid
                }
            ]
        
        response = AWS_IAM.get_role_policy(role_name=ingestion_parameters.pipeline_info.role.replicate.split('/')[-1], policy_name=ingestion_parameters.policy_sid)
        assert response['RoleName'] == ingestion_parameters.pipeline_info.role.replicate.split('/')[-1]
        assert response['PolicyName'] == ingestion_parameters.policy_sid
        assert response['PolicyDocument'] == {
            'Version': '2012-10-17', 
            'Statement': [
                {
                    'Effect': 'Allow', 
                    'Action': [
                        's3:GetObject',
                        's3:GetObjectTagging',
                    ],
                    'Resource': [
                        f'arn:aws:s3:::{self.logging_bucket_name}/AWSLogs/{self.account_id}/{self.aws_region}/WAFLogs*'
                        ]
                    },
                {
                    'Effect': 'Allow',
                    'Action': 'sts:AssumeRole',
                    'Resource': [
                        log_processor_start_execution_role_arn
                        ]
                }
                ]
            }
        
    def test_revoke_source_bucket_access_permission(self, httpserver: HTTPServer, mock_iam_context, mock_s3_context, mock_sqs_context, mock_ddb_context, mock_glue_context, mock_scheduler_context):
        from pipeline_resources_builder.lambda_function import PipelineResourceBuilder, Parameters, MetaTable, IAMClient, S3Client
        
        self.init_default_parameter(httpserver, mock_iam_context, mock_s3_context, mock_sqs_context, mock_ddb_context, mock_glue_context, mock_scheduler_context)
        
        AWS_DDB_META = MetaTable()
        AWS_IAM = IAMClient()
        AWS_S3 = S3Client()

        ingestion_id = str(uuid.uuid4())
        ingestion_info = copy.deepcopy(self.ingestion_info)
        
        AWS_DDB_META.put(meta_name=ingestion_id, item=ingestion_info)
        
        ingestion_event = copy.deepcopy(self.ingestion_event)
        ingestion_event['ResourceProperties']['Id'] = ingestion_id
        
        ingestion_parameters = Parameters(ingestion_event)
        ingestion_resource_builder = PipelineResourceBuilder(parameters=ingestion_parameters)
        ingestion_resource_builder.s3_client = S3Client(sts_role_arn=ingestion_parameters.ingestion_info.role.sts)
        
        ingestion_resource_builder.grant_source_bucket_access_permission()
        ingestion_resource_builder.revoke_source_bucket_access_permission()
        
        response = AWS_S3.get_bucket_policy(bucket=ingestion_parameters.ingestion_info.source.location.bucket, sid=ingestion_parameters.policy_sid)
        assert response['Statement'] == []
        
        response = AWS_IAM.get_role_policy(role_name=ingestion_parameters.pipeline_info.role.replicate.split('/')[-1], policy_name=ingestion_parameters.policy_sid)
        assert response == {}
        
        # repeat to revoke permission
        ingestion_resource_builder.revoke_source_bucket_access_permission()
        
        response = AWS_S3.get_bucket_policy(bucket=ingestion_parameters.ingestion_info.source.location.bucket, sid=ingestion_parameters.policy_sid)
        assert response['Statement'] == []
        
        response = AWS_IAM.get_role_policy(role_name=ingestion_parameters.pipeline_info.role.replicate.split('/')[-1], policy_name=ingestion_parameters.policy_sid)
        assert response == {}

    def test_put_event_notification_into_source_bucket(self, httpserver: HTTPServer, mock_iam_context, mock_s3_context, mock_sqs_context, mock_ddb_context, mock_glue_context, mock_scheduler_context):
        from pipeline_resources_builder.lambda_function import PipelineResourceBuilder, Parameters, MetaTable, S3Client
        
        self.init_default_parameter(httpserver, mock_iam_context, mock_s3_context, mock_sqs_context, mock_ddb_context, mock_glue_context, mock_scheduler_context)
        
        AWS_DDB_META = MetaTable()
        AWS_S3 = S3Client()
        
        ingestion_id = str(uuid.uuid4())
        ingestion_info = copy.deepcopy(self.ingestion_info)
        
        AWS_DDB_META.put(meta_name=ingestion_id, item=ingestion_info)
        
        ingestion_event = copy.deepcopy(self.ingestion_event)
        ingestion_event['ResourceProperties']['Id'] = ingestion_id
        
        ingestion_parameters = Parameters(ingestion_event)
        ingestion_resource_builder = PipelineResourceBuilder(parameters=ingestion_parameters)
        ingestion_resource_builder.s3_client = S3Client(sts_role_arn=ingestion_parameters.ingestion_info.role.sts)
        
        ingestion_resource_builder.put_event_notification_into_source_bucket()
        
        response = AWS_S3.get_bucket_notification(bucket=ingestion_parameters.ingestion_info.source.location.bucket)
        assert response == {
            'QueueConfigurations': [
                {
                    'Id': ingestion_parameters.ingestion_id, 
                    'QueueArn': ingestion_parameters.pipeline_info.queue.log_event_queue, 
                    'Events': ['s3:ObjectCreated:*'], 
                    'Filter': {
                        'Key': {
                            'FilterRules': [
                                {
                                    'Name': 'prefix', 
                                    'Value': ingestion_parameters.ingestion_info.source.location.prefix
                                    }
                                ]
                            }
                        }
                    }
                ]
            }
        
        # repeat to put notification
        response = AWS_S3.get_bucket_notification(bucket=ingestion_parameters.ingestion_info.source.location.bucket)
        assert response == {
            'QueueConfigurations': [
                {
                    'Id': ingestion_parameters.ingestion_id, 
                    'QueueArn': ingestion_parameters.pipeline_info.queue.log_event_queue, 
                    'Events': ['s3:ObjectCreated:*'], 
                    'Filter': {
                        'Key': {
                            'FilterRules': [
                                {
                                    'Name': 'prefix', 
                                    'Value': ingestion_parameters.ingestion_info.source.location.prefix
                                    }
                                ]
                            }
                        }
                    }
                ]
            }
    
    def test_delete_event_notification_from_source_bucket(self, httpserver: HTTPServer, mock_iam_context, mock_s3_context, mock_sqs_context, mock_ddb_context, mock_glue_context, mock_scheduler_context):
        from pipeline_resources_builder.lambda_function import PipelineResourceBuilder, Parameters, MetaTable, S3Client
        
        self.init_default_parameter(httpserver, mock_iam_context, mock_s3_context, mock_sqs_context, mock_ddb_context, mock_glue_context, mock_scheduler_context)
        
        AWS_DDB_META = MetaTable()
        AWS_S3 = S3Client()

        ingestion_id = str(uuid.uuid4())
        ingestion_info = copy.deepcopy(self.ingestion_info)
        
        AWS_DDB_META.put(meta_name=ingestion_id, item=ingestion_info)
        
        ingestion_event = copy.deepcopy(self.ingestion_event)
        ingestion_event['ResourceProperties']['Id'] = ingestion_id
        
        ingestion_parameters = Parameters(ingestion_event)
        ingestion_resource_builder = PipelineResourceBuilder(parameters=ingestion_parameters)
        ingestion_resource_builder.s3_client = S3Client(sts_role_arn=ingestion_parameters.ingestion_info.role.sts)
        
        ingestion_resource_builder.put_event_notification_into_source_bucket()
        ingestion_resource_builder.delete_event_notification_from_source_bucket()
        
        response = AWS_S3.get_bucket_notification(bucket=self.ingestion_parameters.ingestion_info.source.location.bucket)
        assert response == {}
        
        # repeat to delete notification from bucket
        ingestion_resource_builder.delete_event_notification_from_source_bucket()
        
        response = AWS_S3.get_bucket_notification(bucket=self.ingestion_parameters.ingestion_info.source.location.bucket)
        assert response == {}
    
    def test_execute_all_ingestion_operations_in_pipeline_in_bulk(self, httpserver: HTTPServer, mock_iam_context, mock_s3_context, mock_sqs_context, mock_ddb_context, mock_glue_context, mock_sns_context, mock_events_context, mock_scheduler_context, mock_sts_context):
        from pipeline_resources_builder.lambda_function import PipelineResourceBuilder, Parameters, MetaTable, EventsClient, S3Client, SchedulerClient, GlueClient, IAMClient, SQSClient
        
        self.init_default_parameter(httpserver, mock_iam_context, mock_s3_context, mock_sqs_context, mock_ddb_context, mock_glue_context, mock_scheduler_context)
        
        AWS_S3 = S3Client()
        AWS_DDB_META = MetaTable()
        AWS_EVENTS = EventsClient()
        AWS_SCHEDULER = SchedulerClient()
        AWS_GLUE = GlueClient()
        AWS_IAM = IAMClient()
        AWS_SQS = SQSClient()
        replication_sqs_url = AWS_SQS.get_queue_url(name=self.replication_sqs_name)

        # test create action, have one ingestion in pipeline
        pipeline_id = str(uuid.uuid4())
        pipeline_info = copy.deepcopy(self.pipeline_info)
        pipeline_info['data']['grafana']['importDashboards'] = 'false'
        pipeline_info['data']['grafana']['url'] = ''
        pipeline_info['data']['grafana']['token'] = ''
        AWS_DDB_META.put(meta_name=pipeline_id, item=pipeline_info)
        pipeline_event = {'RequestType': 'Create', 'ResourceProperties': {'Resource': 'pipeline', 'Id': pipeline_id}}
        
        ingestion_id = str(uuid.uuid4())
        ingestion_info = copy.deepcopy(self.ingestion_info)
        ingestion_info['pipelineId'] = pipeline_id
        AWS_DDB_META.put(meta_name=ingestion_id, item=ingestion_info)

        parameters = Parameters(pipeline_event)
        pipeline_resource_builder = PipelineResourceBuilder(parameters=parameters)
        pipeline_resource_builder.execute_all_ingestion_operations_in_pipeline_in_bulk(pipeline_id=pipeline_id, action='create')
        
        response = AWS_SQS.get_queue_policy(url=replication_sqs_url)
        assert response['Statement'] == [
            {'Effect': 'Allow', 
            'Principal': {
                'Service': 's3.amazonaws.com'
                }, 
            'Action': ['sqs:SendMessage'], 
            'Resource': self.replication_sqs_arn,
            'Condition': {
                'ArnLike': {
                    'aws:SourceArn': f'arn:aws:s3:::{self.logging_bucket_name}'
                    }
                }, 
            'Sid': ingestion_id.replace('-', '')
            }
            ]
        
        replication_dlq_url = AWS_SQS.get_queue_url(name=self.replication_dlq_name)
        response = AWS_SQS.get_queue_policy(url=replication_dlq_url)
        assert response['Statement'] == [
            {'Effect': 'Allow', 
            'Principal': {
                'Service': 's3.amazonaws.com'
                }, 
            'Action': ['sqs:SendMessage'], 
            'Resource': self.replication_dlq_arn,
            'Condition': {
                'ArnLike': {
                    'aws:SourceArn': f'arn:aws:s3:::{self.logging_bucket_name}'
                    }
                }, 
            'Sid': ingestion_id.replace('-', '')
            }
            ]

        response = AWS_S3.get_bucket_policy(bucket=self.logging_bucket_name)
        assert response['Statement'] == [
            {
                'Effect': 'Allow', 
                'Action': [
                    's3:GetObject',
                    's3:GetObjectTagging',
                ],
                'Principal': {
                    'AWS': self.replication_role_arn
                    }, 
                'Resource': [
                    f'arn:aws:s3:::{self.logging_bucket_name}/AWSLogs/{self.account_id}/{self.aws_region}/WAFLogs*'
                    ], 
                'Sid': ingestion_id.replace('-', '')
                }
            ]
        
        response = AWS_S3.get_bucket_notification(bucket=self.logging_bucket_name)
        assert response['QueueConfigurations'] == [
            {
                'Id': ingestion_id, 
                'QueueArn': self.replication_sqs_arn, 
                'Events': ['s3:ObjectCreated:*'], 
                'Filter': {
                    'Key': {
                        'FilterRules': [
                            {
                                'Name': 'prefix', 
                                'Value': f'AWSLogs/{self.account_id}/{self.aws_region}/WAFLogs'
                                }
                            ]
                        }
                    }
                }
            ]
        
        pipeline_resource_builder.execute_all_ingestion_operations_in_pipeline_in_bulk(pipeline_id=pipeline_id, action='delete')
        
        # test delete action, no ingestion in pipeline
        pipeline_id = str(uuid.uuid4())
        pipeline_info = copy.deepcopy(self.pipeline_info)
        pipeline_info['data']['grafana']['importDashboards'] = 'false'
        pipeline_info['data']['grafana']['url'] = ''
        pipeline_info['data']['grafana']['token'] = ''
        AWS_DDB_META.put(meta_name=pipeline_id, item=pipeline_info)
        pipeline_event = {'RequestType': 'Delete', 'ResourceProperties': {'Resource': 'pipeline', 'Id': pipeline_id}}
        
        ingestion_id = str(uuid.uuid4())
        ingestion_info = copy.deepcopy(self.ingestion_info)
        ingestion_info['pipelineId'] = pipeline_id
        AWS_DDB_META.put(meta_name=ingestion_id, item=ingestion_info)
        
        parameters = Parameters(pipeline_event)
        pipeline_resource_builder = PipelineResourceBuilder(parameters=parameters)
        pipeline_resource_builder.execute_all_ingestion_operations_in_pipeline_in_bulk(pipeline_id=pipeline_id, action='create')
        pipeline_resource_builder.execute_all_ingestion_operations_in_pipeline_in_bulk(pipeline_id=pipeline_id, action='delete')
        
        response = AWS_SQS.get_queue_policy(url=replication_sqs_url)
        assert response['Statement'] == []
        
        replication_dlq_url = AWS_SQS.get_queue_url(name=self.replication_dlq_name)
        response = AWS_SQS.get_queue_policy(url=replication_dlq_url)
        assert response['Statement'] == []

        response = AWS_S3.get_bucket_policy(bucket=self.logging_bucket_name)
        assert response['Statement'] == []
        
        response = AWS_S3.get_bucket_notification(bucket=self.logging_bucket_name)
        assert response == {}
        
    def test_create_pipeline(self, httpserver: HTTPServer, mock_iam_context, mock_s3_context, mock_sqs_context, mock_ddb_context, mock_glue_context, mock_sns_context, mock_events_context, mock_scheduler_context):
        from pipeline_resources_builder.lambda_function import PipelineResourceBuilder, Parameters, MetaTable, EventsClient, SchedulerClient, GlueClient, IAMClient
        
        self.init_default_parameter(httpserver, mock_iam_context, mock_s3_context, mock_sqs_context, mock_ddb_context, mock_glue_context, mock_scheduler_context)
        
        AWS_DDB_META = MetaTable()
        AWS_EVENTS = EventsClient()
        AWS_SCHEDULER = SchedulerClient()
        AWS_GLUE = GlueClient()
        AWS_IAM = IAMClient()

        # test create a not exists pipeline
        do_not_exists_pipeline_event = copy.deepcopy(self.pipeline_event)
        do_not_exists_pipeline_event['ResourceProperties']['Id'] = 'do-not-exists'
        parameters = Parameters(do_not_exists_pipeline_event)
        pipeline_resource_builder = PipelineResourceBuilder(parameters=parameters)
        with pytest.raises(Exception) as exception_info:
            pipeline_resource_builder.create_pipeline()
        assert exception_info.value.args[0] == 'Pipeline Id: do-not-exists Information is not exist in Meta Table.'
        
        # test import_dashboards is True
        pipeline_id = str(uuid.uuid4())
        pipeline_info = copy.deepcopy(self.pipeline_info)
        pipeline_info['data']['grafana']['importDashboards'] = 'true'
        pipeline_info['data']['grafana']['url'] = httpserver.url_for('')
        pipeline_info['data']['grafana']['token'] = 'glsa_123456789012'
        
        pipeline_event = {'RequestType': 'Create', 'ResourceProperties': {'Resource': 'pipeline', 'Id': pipeline_id}}
        AWS_DDB_META.put(meta_name=pipeline_id, item=pipeline_info)
        parameters = Parameters(pipeline_event)
        pipeline_resource_builder = PipelineResourceBuilder(parameters=parameters)
        
        httpserver.expect_oneshot_request(uri=f'/api/dashboards/uid/{pipeline_id}-00', method='GET').respond_with_data(response_data=json.dumps({'message': 'Dashboard not found', 'traceID': ''}), status=404)
        httpserver.expect_oneshot_request(uri=f'/api/dashboards/uid/{pipeline_id}-01', method='GET').respond_with_data(response_data=json.dumps({'message': 'Dashboard not found', 'traceID': ''}), status=404)
        httpserver.expect_oneshot_request(uri=f'/api/dashboards/uid/{pipeline_id}-00', method='DELETE').respond_with_data(response_data=json.dumps({'id': 17, 'message': 'Dashboard Production Overview deleted', 'title': 'Production Overview'}))
        httpserver.expect_oneshot_request(uri=f'/api/dashboards/uid/{pipeline_id}-01', method='DELETE').respond_with_data(response_data=json.dumps({'id': 18, 'message': 'Dashboard Production Overview deleted', 'title': 'Production Overview'}))
        
        pipeline_resource_builder.create_pipeline()
        
        # test schedule_service = 'events'
        self.sts_role = ''
        self.table_name = 'test_waf_01'
        self.notification_service = 'SES'
        self.recipients = 'alejandro_rosalez@example.com,alejandro_rosalez@example.org'
        self.processor_schedule = 'rate(5 minutes)'
        self.merger_schedule = 'cron(0 1 * * ? *)'
        self.archive_schedule = 'cron(0 1 * * ? *)'
        self.merger_age = 3
        self.archive_age = 7
        self.staging_bucket_prefix = 'AWSLogs/WAFLogs'
        
        pipeline_id = str(uuid.uuid4())
        pipeline_info = copy.deepcopy(self.pipeline_info)
        pipeline_info['data']['destination']['table']['name'] = self.table_name
        pipeline_info['data']['notification']['service'] = self.notification_service
        pipeline_info['data']['notification']['recipients'] = self.recipients
        pipeline_info['data']['scheduler']['service'] = 'events'
        pipeline_info['data']['scheduler']['LogProcessor']['schedule'] = self.processor_schedule
        pipeline_info['data']['scheduler']['LogMerger']['schedule'] = self.merger_schedule
        pipeline_info['data']['scheduler']['LogMerger']['age'] = self.merger_age
        pipeline_info['data']['scheduler']['LogArchive']['schedule'] = self.archive_schedule
        pipeline_info['data']['scheduler']['LogArchive']['age'] = self.archive_age
        pipeline_info['data']['staging']['prefix'] = self.staging_bucket_prefix
        pipeline_event = {'RequestType': 'Create', 'ResourceProperties': {'Resource': 'pipeline', 'Id': pipeline_id}}
        
        AWS_DDB_META.put(meta_name='AvailableServices', item={'value': ['events']})
        AWS_DDB_META.put(meta_name=pipeline_id, item=pipeline_info)
        
        pipeline_parameters = Parameters(pipeline_event)
        pipeline_resource_builder = PipelineResourceBuilder(parameters=pipeline_parameters)
        pipeline_resource_builder.create_pipeline()
        
        response = AWS_GLUE.get_table(database=self.centralized_database, name=self.table_name)
        assert response['Table']['Name'] == self.table_name
        assert response['Table']['DatabaseName'] == self.centralized_database
        assert response['Table']['StorageDescriptor']['Columns'] == [
            {'Name': 'time', 'Type': 'bigint'}, 
            {'Name': 'timestamp', 'Type': 'timestamp'},
            {'Name': 'formatversion', 'Type': 'int'}, 
            {'Name': 'webaclid', 'Type': 'string'}, 
            {'Name': 'webaclname', 'Type': 'string'}, 
            {'Name': 'terminatingruleid', 'Type': 'string'}, 
            {'Name': 'terminatingruletype', 'Type': 'string'}, 
            {'Name': 'action', 'Type': 'string'}, 
            {'Name': 'terminatingrulematchdetails', 'Type': 'array<struct<conditiontype:string,sensitivitylevel:string,location:string,matcheddata:array<string>>>'}, 
            {'Name': 'httpsourcename', 'Type': 'string'}, 
            {'Name': 'httpsourceid', 'Type': 'string'}, 
            {'Name': 'rulegrouplist', 'Type': 'array<struct<rulegroupid:string,terminatingrule:struct<ruleid:string,action:string,rulematchdetails:array<struct<conditiontype:string,sensitivitylevel:string,location:string,matcheddata:array<string>>>>,nonterminatingmatchingrules:array<struct<ruleid:string,action:string,rulematchdetails:array<struct<conditiontype:string,sensitivitylevel:string,location:string,matcheddata:array<string>>>>>,excludedrules:string>>'}, 
            {'Name': 'ratebasedrulelist', 'Type': 'array<struct<ratebasedruleid:string,limitkey:string,maxrateallowed:int>>'}, 
            {'Name': 'nonterminatingmatchingrules', 'Type': 'array<struct<ruleid:string,action:string,rulematchdetails:array<struct<conditiontype:string,sensitivitylevel:string,location:string,matcheddata:array<string>>>,captcharesponse:struct<responsecode:string,solvetimestamp:string>>>'}, 
            {'Name': 'requestheadersinserted', 'Type': 'array<struct<name:string,value:string>>'}, 
            {'Name': 'responsecodesent', 'Type': 'string'}, 
            {'Name': 'httprequest', 'Type': 'struct<clientip:string,country:string,headers:array<struct<name:string,value:string>>,uri:string,args:string,httpversion:string,httpmethod:string,requestid:string>'}, 
            {'Name': 'labels', 'Type': 'array<struct<name:string>>'}, 
            {'Name': 'captcharesponse', 'Type': 'struct<responsecode:string,solvetimestamp:string,failureReason:string>'}
            ]
        assert response['Table']['StorageDescriptor']['Location'] == f's3://{self.centralized_bucket_name}/{self.centralized_bucket_prefix}/{self.centralized_database}/{self.table_name}'
        assert response['Table']['StorageDescriptor']['InputFormat'] == 'org.apache.hadoop.hive.ql.io.parquet.MapredParquetInputFormat'
        assert response['Table']['StorageDescriptor']['OutputFormat'] == 'org.apache.hadoop.hive.ql.io.parquet.MapredParquetOutputFormat'
        assert response['Table']['StorageDescriptor']['Compressed'] is True
        assert response['Table']['StorageDescriptor']['SerdeInfo']['SerializationLibrary'] == 'org.apache.hadoop.hive.ql.io.parquet.serde.ParquetHiveSerDe'
        # assert response['Table']['StorageDescriptor']['SerdeInfo']['Parameters']['serialization.format'] == '1'
        assert response['Table']['PartitionKeys'] == [
            {'Name': 'event_hour', 'Type': 'string'}, 
            {'Name': 'account_id', 'Type': 'string'}, 
            {'Name': 'region', 'Type': 'string'}, 
            {'Name': '__execution_name__', 'Type': 'string'}
            ]
        assert response['Table']['TableType'] == 'EXTERNAL_TABLE'
        assert response['Table']['Parameters'] == {'partition_filtering.enabled': 'true', 'classification': 'parquet', 'has_encrypted_data': 'true'}
        
        response = AWS_GLUE.get_partition_indexes(database=self.centralized_database, table_name=self.table_name)
        assert response['PartitionIndexDescriptorList'] == []
        
        response = AWS_GLUE.get_table(database=self.centralized_database, name=f'{self.table_name}_metrics')
        assert response['Table']['Name'] == f'{self.table_name}_metrics'
        assert response['Table']['DatabaseName'] == self.centralized_database
        assert response['Table']['StorageDescriptor']['Columns'] == [
            {'Name': 'time', 'Type': 'bigint'}, 
            {'Name': 'timestamp', 'Type': 'timestamp'}, 
            {'Name': 'action', 'Type': 'string'}, 
            {'Name': 'webaclid', 'Type': 'string'}, 
            {'Name': 'webaclname', 'Type': 'string'}, 
            {'Name': 'terminatingruleid', 'Type': 'string'}, 
            {'Name': 'terminatingruletype', 'Type': 'string'}, 
            {'Name': 'httpsourceid', 'Type': 'string'}, 
            {'Name': 'httpmethod', 'Type': 'string'}, 
            {'Name': 'country', 'Type': 'string'}, 
            {'Name': 'clientip', 'Type': 'string'}, 
            {'Name': 'uri', 'Type': 'string'}, 
            {'Name': 'first_label', 'Type': 'string'},
            {'Name': 'requests', 'Type': 'bigint'}
            ]
        assert response['Table']['StorageDescriptor']['Location'] == f's3://{self.centralized_bucket_name}/{self.centralized_bucket_prefix}/{self.centralized_database}/{self.table_name}_metrics'
        assert response['Table']['StorageDescriptor']['InputFormat'] == 'org.apache.hadoop.hive.ql.io.parquet.MapredParquetInputFormat'
        assert response['Table']['StorageDescriptor']['OutputFormat'] == 'org.apache.hadoop.hive.ql.io.parquet.MapredParquetOutputFormat'
        assert response['Table']['StorageDescriptor']['Compressed'] is True
        assert response['Table']['StorageDescriptor']['SerdeInfo']['SerializationLibrary'] == 'org.apache.hadoop.hive.ql.io.parquet.serde.ParquetHiveSerDe'
        # assert response['Table']['StorageDescriptor']['SerdeInfo']['Parameters']['serialization.format'] == '1'
        assert response['Table']['PartitionKeys'] == [
            {'Name': 'event_hour', 'Type': 'string'},
            {'Name': 'account_id', 'Type': 'string'}, 
            {'Name': 'region', 'Type': 'string'}, 
            {'Name': '__execution_name__', 'Type': 'string'}
            ]
        assert response['Table']['TableType'] == 'EXTERNAL_TABLE'
        assert response['Table']['Parameters'] == {'partition_filtering.enabled': 'true', 'classification': 'parquet', 'has_encrypted_data': 'true'}
        
        response = AWS_GLUE.get_partition_indexes(database=self.centralized_database, table_name=f'{self.table_name}_metrics')
        assert response['PartitionIndexDescriptorList'] == []
        
        response = AWS_EVENTS._events_client.list_rules(NamePrefix=f'LogProcessor-{pipeline_parameters.pipeline_info.destination.table.name}', EventBusName='default')
        assert response['Rules'][0] == {
            'Name': f'LogProcessor-{pipeline_parameters.pipeline_info.destination.table.name}', 
            'Arn': f'arn:aws:events:{self.aws_region}:{self.account_id}:rule/LogProcessor-{pipeline_parameters.pipeline_info.destination.table.name}', 
            'State': 'ENABLED', 
            'ScheduleExpression': self.processor_schedule, 
            'EventBusName': 'default'
            }
        response = AWS_EVENTS._events_client.list_targets_by_rule(Rule=f'LogProcessor-{pipeline_parameters.pipeline_info.destination.table.name}', EventBusName='default')
        assert response['Targets'][0]['Id'] == pipeline_id
        assert response['Targets'][0]['Arn'] == pipeline_parameters.pipeline_info.scheduler.log_processor.arn
        assert response['Targets'][0]['RoleArn'] == pipeline_parameters.pipeline_info.scheduler.log_processor.execution_role
        assert json.loads(response['Targets'][0]['Input']) == {
            "metadata": {
                "pipelineId": pipeline_id,
                "sourceType": "waf",
                "scheduleType": "LogProcessor",
                "enrichmentPlugins": [],
                "s3": {
                    "srcPath": f"s3://{self.staging_bucket_name}/AWSLogs/WAFLogs",
                    "archivePath": f"s3://{self.staging_bucket_name}/archive/AWSLogs/WAFLogs"
                },
                "athena": {
                    "tableName": self.table_name,
                    "statements": {
                        "create": "CREATE EXTERNAL TABLE IF NOT EXISTS `tmp`.`test_waf_01{}` (`timestamp` bigint, `formatversion` int, `webaclid` string, `terminatingruleid` string, `terminatingruletype` string, `action` string, `terminatingrulematchdetails` array<struct<`conditiontype`:string,`sensitivitylevel`:string,`location`:string,`matcheddata`:array<string>>>, `httpsourcename` string, `httpsourceid` string, `rulegrouplist` array<struct<`rulegroupid`:string,`terminatingrule`:struct<`ruleid`:string,`action`:string,`rulematchdetails`:array<struct<`conditiontype`:string,`sensitivitylevel`:string,`location`:string,`matcheddata`:array<string>>>>,`nonterminatingmatchingrules`:array<struct<`ruleid`:string,`action`:string,`rulematchdetails`:array<struct<`conditiontype`:string,`sensitivitylevel`:string,`location`:string,`matcheddata`:array<string>>>>>,`excludedrules`:string>>, `ratebasedrulelist` array<struct<`ratebasedruleid`:string,`limitkey`:string,`maxrateallowed`:int>>, `nonterminatingmatchingrules` array<struct<`ruleid`:string,`action`:string,`rulematchdetails`:array<struct<`conditiontype`:string,`sensitivitylevel`:string,`location`:string,`matcheddata`:array<string>>>,`captcharesponse`:struct<`responsecode`:string,`solvetimestamp`:string>>>, `requestheadersinserted` array<struct<`name`:string,`value`:string>>, `responsecodesent` string, `httprequest` struct<`clientip`:string,`country`:string,`headers`:array<struct<`name`:string,`value`:string>>,`uri`:string,`args`:string,`httpversion`:string,`httpmethod`:string,`requestid`:string>, `labels` array<struct<`name`:string>>, `captcharesponse` struct<`responsecode`:string,`solvetimestamp`:string,`failureReason`:string>)  ROW FORMAT SERDE 'org.openx.data.jsonserde.JsonSerDe'  STORED AS INPUTFORMAT 'org.apache.hadoop.mapred.TextInputFormat' OUTPUTFORMAT 'org.apache.hadoop.hive.ql.io.HiveIgnoreKeyTextOutputFormat' LOCATION '{}' ;",
                        "drop": "DROP TABLE IF EXISTS `tmp`.`test_waf_01{}`",
                        "insert": "INSERT INTO \"centralized\".\"test_waf_01\" (\"time\", \"timestamp\", \"formatversion\", \"webaclid\", \"webaclname\", \"terminatingruleid\", \"terminatingruletype\", \"action\", \"terminatingrulematchdetails\", \"httpsourcename\", \"httpsourceid\", \"rulegrouplist\", \"ratebasedrulelist\", \"nonterminatingmatchingrules\", \"requestheadersinserted\", \"responsecodesent\", \"httprequest\", \"labels\", \"captcharesponse\", \"account_id\", \"region\", \"event_hour\", \"__execution_name__\") SELECT \"timestamp\", CAST(FROM_UNIXTIME(\"timestamp\" / 1000) AS timestamp), \"formatversion\", \"webaclid\", SPLIT(\"webaclid\", '/')[3], \"terminatingruleid\", \"terminatingruletype\", \"action\", \"terminatingrulematchdetails\", \"httpsourcename\", \"httpsourceid\", \"rulegrouplist\", \"ratebasedrulelist\", \"nonterminatingmatchingrules\", \"requestheadersinserted\", \"responsecodesent\", \"httprequest\", \"labels\", \"captcharesponse\", SPLIT(\"webaclid\", ':')[5], SPLIT(\"webaclid\", ':')[4], DATE_FORMAT(CAST(FROM_UNIXTIME(\"timestamp\" / 1000) AS timestamp), '%Y%m%d%H'), '{}' FROM \"tmp\".\"test_waf_01{}\";",
                        "aggregate": [
                            "INSERT INTO \"centralized\".\"test_waf_01_metrics\" (\"time\", \"timestamp\", \"action\", \"webaclid\", \"webaclname\", \"terminatingruleid\", \"terminatingruletype\", \"httpsourceid\", \"httpmethod\", \"country\", \"clientip\", \"uri\", \"first_label\", \"requests\", \"account_id\", \"region\", \"event_hour\", \"__execution_name__\") SELECT FLOOR(\"time\" / 60000) * 60000, DATE_TRUNC('minute', \"timestamp\"), \"action\", \"webaclid\", \"webaclname\", \"terminatingruleid\", \"terminatingruletype\", \"httpsourceid\", \"httprequest\".\"httpmethod\", \"httprequest\".\"country\", \"httprequest\".\"clientip\", \"httprequest\".\"uri\", CASE WHEN labels = ARRAY[] THEN '' ELSE labels[1].name END, CAST(COUNT(1) AS bigint), \"account_id\", \"region\", \"event_hour\", \"__execution_name__\" FROM \"centralized\".\"test_waf_01\" WHERE __execution_name__ = '{}' GROUP BY FLOOR(\"time\" / 60000) * 60000, DATE_TRUNC('minute', \"timestamp\"), \"action\", \"webaclid\", \"webaclname\", \"terminatingruleid\", \"terminatingruletype\", \"httpsourceid\", \"httprequest\".\"httpmethod\", \"httprequest\".\"country\", \"httprequest\".\"clientip\", \"httprequest\".\"uri\", CASE WHEN labels = ARRAY[] THEN '' ELSE labels[1].name END, \"account_id\", \"region\", \"event_hour\", \"__execution_name__\";"
                        ]
                    },
                },
                "notification": {
                    "service": self.notification_service,
                    "recipients": self.recipients.split(',')
                }
            }
        }
        
        response = AWS_EVENTS._events_client.list_rules(NamePrefix=f'LogMerger-{pipeline_parameters.pipeline_info.destination.table.name}', EventBusName='default')
        assert response['Rules'][0] == {
            'Name': f'LogMerger-{pipeline_parameters.pipeline_info.destination.table.name}', 
            'Arn': f'arn:aws:events:{self.aws_region}:{self.account_id}:rule/LogMerger-{pipeline_parameters.pipeline_info.destination.table.name}', 
            'State': 'ENABLED', 
            'ScheduleExpression': self.merger_schedule, 
            'EventBusName': 'default'
            }
        response = AWS_EVENTS._events_client.list_targets_by_rule(Rule=f'LogMerger-{pipeline_parameters.pipeline_info.destination.table.name}', EventBusName='default')
        assert response['Targets'][0]['Id'] == pipeline_id
        assert response['Targets'][0]['Arn'] == pipeline_parameters.pipeline_info.scheduler.log_merger.arn
        assert response['Targets'][0]['RoleArn'] == pipeline_parameters.pipeline_info.scheduler.log_merger.execution_role
        assert json.loads(response['Targets'][0]['Input']) == {
            "metadata": {
                "pipelineId": pipeline_id,
                "sourceType": "waf",
                "scheduleType": "LogMerger",
                "s3": {
                    "srcPath": f"s3://{self.centralized_bucket_name}/{self.centralized_bucket_prefix}/{self.centralized_database}/{self.table_name}",
                    "archivePath": f"s3://{self.staging_bucket_name}/archive/{self.centralized_bucket_prefix}/{self.centralized_database}/{self.table_name}"
                },
                "athena": {
                    "firstPartitionKey": "event_hour",
                    "partitionInfo": {
                        "event_hour": {
                            "type": "time",
                            "from": "%Y%m%d%H",
                            "to": "%Y%m%d00"
                        },
                        "account_id": {
                            "type": "retain"
                        },
                        "region": {
                            "type": "retain"
                        },
                        "__execution_name__": {
                            "type": "default",
                            "value": "00000000-0000-0000-0000-000000000000"
                        }
                    },
                    "intervalDays": int(-self.merger_age),
                    "database": self.centralized_database,
                    "tableName": self.table_name
                },
                "notification": {
                    "service": self.notification_service,
                    "recipients": self.recipients.split(',')
                }
            }
        }

        response = AWS_EVENTS._events_client.list_rules(NamePrefix=f'LogMergerForMetrics-{pipeline_parameters.pipeline_info.destination.table.name}', EventBusName='default')
        assert response['Rules'][0] == {
            'Name': f'LogMergerForMetrics-{pipeline_parameters.pipeline_info.destination.table.name}', 
            'Arn': f'arn:aws:events:{self.aws_region}:{self.account_id}:rule/LogMergerForMetrics-{pipeline_parameters.pipeline_info.destination.table.name}', 
            'State': 'ENABLED', 
            'ScheduleExpression': self.merger_schedule, 
            'EventBusName': 'default'
            }
        response = AWS_EVENTS._events_client.list_targets_by_rule(Rule=f'LogMergerForMetrics-{pipeline_parameters.pipeline_info.destination.table.name}', EventBusName='default')
        assert response['Targets'][0]['Id'] == pipeline_id
        assert response['Targets'][0]['Arn'] == pipeline_parameters.pipeline_info.scheduler.log_merger.arn
        assert response['Targets'][0]['RoleArn'] == pipeline_parameters.pipeline_info.scheduler.log_merger.execution_role
        assert json.loads(response['Targets'][0]['Input']) == {
            "metadata": {
                "pipelineId": pipeline_id,
                "sourceType": "waf",
                "scheduleType": "LogMergerForMetrics",
                "s3": {
                    "srcPath": f"s3://{self.centralized_bucket_name}/{self.centralized_bucket_prefix}/{self.centralized_database}/{self.table_name}_metrics",
                    "archivePath": f"s3://{self.staging_bucket_name}/archive/{self.centralized_bucket_prefix}/{self.centralized_database}/{self.table_name}_metrics"
                },
                "athena": {
                    "firstPartitionKey": "event_hour",
                    "partitionInfo": {
                        "event_hour": {
                            "type": "time",
                            "from": "%Y%m%d%H",
                            "to": "%Y%m%d00"
                        },
                        "account_id": {
                            "type": "retain"
                        },
                        "region": {
                            "type": "retain"
                        },
                        "__execution_name__": {
                            "type": "default",
                            "value": "00000000-0000-0000-0000-000000000000"
                        }
                    },
                    "intervalDays": int(-self.merger_age),
                    "database": self.centralized_database,
                    "tableName": f"{self.table_name}_metrics"
                },
                "notification": {
                    "service": self.notification_service,
                    "recipients": self.recipients.split(',')
                }
            }
        }
        
        response = AWS_EVENTS._events_client.list_rules(NamePrefix=f'LogArchive-{pipeline_parameters.pipeline_info.destination.table.name}', EventBusName='default')
        assert response['Rules'][0] == {
            'Name': f'LogArchive-{pipeline_parameters.pipeline_info.destination.table.name}', 
            'Arn': f'arn:aws:events:{self.aws_region}:{self.account_id}:rule/LogArchive-{pipeline_parameters.pipeline_info.destination.table.name}', 
            'State': 'ENABLED', 
            'ScheduleExpression': self.archive_schedule, 
            'EventBusName': 'default'
            }
        response = AWS_EVENTS._events_client.list_targets_by_rule(Rule=f'LogArchive-{pipeline_parameters.pipeline_info.destination.table.name}', EventBusName='default')
        assert response['Targets'][0]['Id'] == pipeline_id
        assert response['Targets'][0]['Arn'] == pipeline_parameters.pipeline_info.scheduler.log_archive.arn
        assert response['Targets'][0]['RoleArn'] == pipeline_parameters.pipeline_info.scheduler.log_archive.execution_role
        assert json.loads(response['Targets'][0]['Input']) == {
            "metadata": {
                "pipelineId": pipeline_id,
                "sourceType": "waf",
                "scheduleType": "LogArchive",
                "s3": {
                    "srcPath": f"s3://{self.centralized_bucket_name}/{self.centralized_bucket_prefix}/{self.centralized_database}/{self.table_name}",
                    "archivePath": f"s3://{self.staging_bucket_name}/archive/{self.centralized_bucket_prefix}/{self.centralized_database}/{self.table_name}"
                },
                "athena": {
                    'firstPartitionKey': 'event_hour',
                    "intervalDays": int(-self.archive_age),
                    "database": self.centralized_database,
                    "tableName": self.table_name,
                },
                "notification": {
                    "service": self.notification_service,
                    "recipients": self.recipients.split(',')
                }
            }
        }
        
        response = AWS_EVENTS._events_client.list_rules(NamePrefix=f'LogArchiveForMetrics-{pipeline_parameters.pipeline_info.destination.table.name}', EventBusName='default')
        assert response['Rules'][0] == {
            'Name': f'LogArchiveForMetrics-{pipeline_parameters.pipeline_info.destination.table.name}', 
            'Arn': f'arn:aws:events:{self.aws_region}:{self.account_id}:rule/LogArchiveForMetrics-{pipeline_parameters.pipeline_info.destination.table.name}', 
            'State': 'ENABLED', 
            'ScheduleExpression': self.archive_schedule, 
            'EventBusName': 'default'
            }
        response = AWS_EVENTS._events_client.list_targets_by_rule(Rule=f'LogArchiveForMetrics-{pipeline_parameters.pipeline_info.destination.table.name}', EventBusName='default')
        assert response['Targets'][0]['Id'] == pipeline_id
        assert response['Targets'][0]['Arn'] == pipeline_parameters.pipeline_info.scheduler.log_archive.arn
        assert response['Targets'][0]['RoleArn'] == pipeline_parameters.pipeline_info.scheduler.log_archive.execution_role
        assert json.loads(response['Targets'][0]['Input']) == {
            "metadata": {
                "pipelineId": pipeline_id,
                "sourceType": "waf",
                "scheduleType": "LogArchiveForMetrics",
                "s3": {
                    "srcPath": f"s3://{self.centralized_bucket_name}/{self.centralized_bucket_prefix}/{self.centralized_database}/{self.table_name}_metrics",
                    "archivePath": f"s3://{self.staging_bucket_name}/archive/{self.centralized_bucket_prefix}/{self.centralized_database}/{self.table_name}_metrics"
                },
                "athena": {
                    'firstPartitionKey': 'event_hour',
                    "intervalDays": int(-self.archive_age),
                    "database": self.centralized_database,
                    "tableName": f"{self.table_name}_metrics",
                },
                "notification": {
                    "service": self.notification_service,
                    "recipients": self.recipients.split(',')
                }
            }
        }

        response = AWS_IAM.get_policy_document(arn=self.s3_public_access_policy_arn)
        assert response['Document']['Statement'] == [
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
                        "s3:DeleteObject"
                    ],
                    "Resource": [
                        f"arn:aws:s3:::{self.staging_bucket_name}",
                        f"arn:aws:s3:::{self.staging_bucket_name}/*"
                    ],
                    "Effect": "Allow"
                },
            {
                'Sid': 'S3AccessPolicyForDestination',
                'Effect': 'Allow', 
                'Action': [
                    's3:ListBucket', 
                    's3:ListBucketMultipartUploads', 
                    's3:ListMultipartUploadParts', 
                    's3:GetObject', 
                    's3:GetBucketLocation', 
                    's3:AbortMultipartUpload', 
                    's3:CreateBucket', 
                    's3:PutObject', 
                    's3:DeleteObject'
                    ], 
                'Resource': [
                    f'arn:aws:s3:::{self.logging_bucket_name}', 
                    f'arn:aws:s3:::{self.logging_bucket_name}/*',
                    f'arn:aws:s3:::{self.centralized_bucket_name}/{self.centralized_bucket_prefix}/{self.centralized_database}/waf*',
                    f'arn:aws:s3:::{self.centralized_bucket_name}',
                    f'arn:aws:s3:::{self.centralized_bucket_name}/{self.centralized_bucket_prefix}/{self.centralized_database}/waf_metrics*',
                    f'arn:aws:s3:::{self.centralized_bucket_name}/{self.centralized_bucket_prefix}/{self.centralized_database}/{self.table_name}*',
                    f'arn:aws:s3:::{self.centralized_bucket_name}/{self.centralized_bucket_prefix}/{self.centralized_database}/{self.table_name}_metrics*'], 
                }
            ]
        
        pipeline_resource_builder.delete_pipeline()
        
        # test waf log format
        self.sts_role = ''
        self.table_name = 'test_waf_02'
        self.notification_service = 'SES'
        self.recipients = 'alejandro_rosalez@example.com,alejandro_rosalez@example.org'
        self.processor_schedule = 'rate(5 minutes)'
        self.merger_schedule = 'cron(0 1 * * ? *)'
        self.archive_schedule = 'cron(0 1 * * ? *)'
        self.merger_age = 3
        self.archive_age = 7
        self.staging_bucket_prefix = 'AWSLogs/WAFLogs'
        
        pipeline_id = str(uuid.uuid4())
        pipeline_info = copy.deepcopy(self.pipeline_info)
        pipeline_info['data']['destination']['table']['name'] = self.table_name
        pipeline_info['data']['notification']['service'] = self.notification_service
        pipeline_info['data']['notification']['recipients'] = self.recipients
        pipeline_info['data']['scheduler']['service'] = 'scheduler'
        pipeline_info['data']['scheduler']['LogProcessor']['schedule'] = self.processor_schedule
        pipeline_info['data']['scheduler']['LogMerger']['schedule'] = self.merger_schedule
        pipeline_info['data']['scheduler']['LogMerger']['age'] = self.merger_age
        pipeline_info['data']['scheduler']['LogArchive']['schedule'] = self.archive_schedule
        pipeline_info['data']['scheduler']['LogArchive']['age'] = self.archive_age
        pipeline_info['data']['staging']['prefix'] = self.staging_bucket_prefix
        pipeline_event = {'RequestType': 'Create', 'ResourceProperties': {'Resource': 'pipeline', 'Id': pipeline_id}}
        AWS_DDB_META.put(meta_name='AvailableServices', item={'value': ['scheduler']})
        AWS_DDB_META.put(meta_name=pipeline_id, item=pipeline_info)
        
        pipeline_parameters = Parameters(pipeline_event)
        pipeline_resource_builder = PipelineResourceBuilder(parameters=pipeline_parameters)
        pipeline_resource_builder.create_pipeline()
        
        response = AWS_GLUE.get_table(database=self.centralized_database, name=self.table_name)
        assert response['Table']['Name'] == self.table_name
        assert response['Table']['DatabaseName'] == self.centralized_database
        assert response['Table']['StorageDescriptor']['Columns'] == [
            {'Name': 'time', 'Type': 'bigint'}, 
            {'Name': 'timestamp', 'Type': 'timestamp'},
            {'Name': 'formatversion', 'Type': 'int'}, 
            {'Name': 'webaclid', 'Type': 'string'}, 
            {'Name': 'webaclname', 'Type': 'string'}, 
            {'Name': 'terminatingruleid', 'Type': 'string'}, 
            {'Name': 'terminatingruletype', 'Type': 'string'}, 
            {'Name': 'action', 'Type': 'string'}, 
            {'Name': 'terminatingrulematchdetails', 'Type': 'array<struct<conditiontype:string,sensitivitylevel:string,location:string,matcheddata:array<string>>>'}, 
            {'Name': 'httpsourcename', 'Type': 'string'}, 
            {'Name': 'httpsourceid', 'Type': 'string'}, 
            {'Name': 'rulegrouplist', 'Type': 'array<struct<rulegroupid:string,terminatingrule:struct<ruleid:string,action:string,rulematchdetails:array<struct<conditiontype:string,sensitivitylevel:string,location:string,matcheddata:array<string>>>>,nonterminatingmatchingrules:array<struct<ruleid:string,action:string,rulematchdetails:array<struct<conditiontype:string,sensitivitylevel:string,location:string,matcheddata:array<string>>>>>,excludedrules:string>>'}, 
            {'Name': 'ratebasedrulelist', 'Type': 'array<struct<ratebasedruleid:string,limitkey:string,maxrateallowed:int>>'}, 
            {'Name': 'nonterminatingmatchingrules', 'Type': 'array<struct<ruleid:string,action:string,rulematchdetails:array<struct<conditiontype:string,sensitivitylevel:string,location:string,matcheddata:array<string>>>,captcharesponse:struct<responsecode:string,solvetimestamp:string>>>'}, 
            {'Name': 'requestheadersinserted', 'Type': 'array<struct<name:string,value:string>>'}, 
            {'Name': 'responsecodesent', 'Type': 'string'}, 
            {'Name': 'httprequest', 'Type': 'struct<clientip:string,country:string,headers:array<struct<name:string,value:string>>,uri:string,args:string,httpversion:string,httpmethod:string,requestid:string>'}, 
            {'Name': 'labels', 'Type': 'array<struct<name:string>>'}, 
            {'Name': 'captcharesponse', 'Type': 'struct<responsecode:string,solvetimestamp:string,failureReason:string>'}
            ]
        assert response['Table']['StorageDescriptor']['Location'] == f's3://{self.centralized_bucket_name}/{self.centralized_bucket_prefix}/{self.centralized_database}/{self.table_name}'
        assert response['Table']['StorageDescriptor']['InputFormat'] == 'org.apache.hadoop.hive.ql.io.parquet.MapredParquetInputFormat'
        assert response['Table']['StorageDescriptor']['OutputFormat'] == 'org.apache.hadoop.hive.ql.io.parquet.MapredParquetOutputFormat'
        assert response['Table']['StorageDescriptor']['Compressed'] is True
        assert response['Table']['StorageDescriptor']['SerdeInfo']['SerializationLibrary'] == 'org.apache.hadoop.hive.ql.io.parquet.serde.ParquetHiveSerDe'
        # assert response['Table']['StorageDescriptor']['SerdeInfo']['Parameters']['serialization.format'] == '1'
        assert response['Table']['PartitionKeys'] == [
            {'Name': 'event_hour', 'Type': 'string'}, 
            {'Name': 'account_id', 'Type': 'string'}, 
            {'Name': 'region', 'Type': 'string'}, 
            {'Name': '__execution_name__', 'Type': 'string'}
            ]
        assert response['Table']['TableType'] == 'EXTERNAL_TABLE'
        assert response['Table']['Parameters'] == {'partition_filtering.enabled': 'true', 'classification': 'parquet', 'has_encrypted_data': 'true'}
        
        response = AWS_GLUE.get_partition_indexes(database=self.centralized_database, table_name=self.table_name)
        assert response['PartitionIndexDescriptorList'] == []
        
        response = AWS_GLUE.get_table(database=self.centralized_database, name=f'{self.table_name}_metrics')
        assert response['Table']['Name'] == f'{self.table_name}_metrics'
        assert response['Table']['DatabaseName'] == self.centralized_database
        assert response['Table']['StorageDescriptor']['Columns'] == [
            {'Name': 'time', 'Type': 'bigint'}, 
            {'Name': 'timestamp', 'Type': 'timestamp'}, 
            {'Name': 'action', 'Type': 'string'}, 
            {'Name': 'webaclid', 'Type': 'string'}, 
            {'Name': 'webaclname', 'Type': 'string'}, 
            {'Name': 'terminatingruleid', 'Type': 'string'}, 
            {'Name': 'terminatingruletype', 'Type': 'string'}, 
            {'Name': 'httpsourceid', 'Type': 'string'}, 
            {'Name': 'httpmethod', 'Type': 'string'}, 
            {'Name': 'country', 'Type': 'string'}, 
            {'Name': 'clientip', 'Type': 'string'}, 
            {'Name': 'uri', 'Type': 'string'}, 
            {'Name': 'first_label', 'Type': 'string'},
            {'Name': 'requests', 'Type': 'bigint'}
            ]
        assert response['Table']['StorageDescriptor']['Location'] == f's3://{self.centralized_bucket_name}/{self.centralized_bucket_prefix}/{self.centralized_database}/{self.table_name}_metrics'
        assert response['Table']['StorageDescriptor']['InputFormat'] == 'org.apache.hadoop.hive.ql.io.parquet.MapredParquetInputFormat'
        assert response['Table']['StorageDescriptor']['OutputFormat'] == 'org.apache.hadoop.hive.ql.io.parquet.MapredParquetOutputFormat'
        assert response['Table']['StorageDescriptor']['Compressed'] is True
        assert response['Table']['StorageDescriptor']['SerdeInfo']['SerializationLibrary'] == 'org.apache.hadoop.hive.ql.io.parquet.serde.ParquetHiveSerDe'
        # assert response['Table']['StorageDescriptor']['SerdeInfo']['Parameters']['serialization.format'] == '1'
        assert response['Table']['PartitionKeys'] == [
            {'Name': 'event_hour', 'Type': 'string'},
            {'Name': 'account_id', 'Type': 'string'}, 
            {'Name': 'region', 'Type': 'string'}, 
            {'Name': '__execution_name__', 'Type': 'string'}
            ]
        assert response['Table']['TableType'] == 'EXTERNAL_TABLE'
        assert response['Table']['Parameters'] == {'partition_filtering.enabled': 'true', 'classification': 'parquet', 'has_encrypted_data': 'true'}
        
        response = AWS_GLUE.get_partition_indexes(database=self.centralized_database, table_name=f'{self.table_name}_metrics')
        assert response['PartitionIndexDescriptorList'] == []
        
        response = AWS_SCHEDULER.get_schedule_group(name=pipeline_id)
        assert response['Arn'] == f'arn:aws:scheduler:{self.aws_region}:{self.account_id}:schedule-group/{pipeline_id}'
        
        response = AWS_SCHEDULER.get_schedule(name='LogProcessor', group_name=pipeline_id)
        assert response['Arn'] == f'arn:aws:scheduler:{self.aws_region}:{self.account_id}:schedule/{pipeline_id}/LogProcessor'
        assert response['FlexibleTimeWindow'] == {'Mode': 'OFF'}
        assert response['GroupName'] == pipeline_id
        assert response['ScheduleExpression'] == self.processor_schedule
        assert response['State'] == 'ENABLED'
        assert response['Target']['Arn'] == self.log_processor_arn
        
        assert json.loads(response['Target']['Input']) == {
            "metadata": {
                "pipelineId": pipeline_id,
                "sourceType": "waf",
                "scheduleType": "LogProcessor",
                "enrichmentPlugins": [],
                "s3": {
                    "srcPath": f"s3://{self.staging_bucket_name}/AWSLogs/WAFLogs",
                    "archivePath": f"s3://{self.staging_bucket_name}/archive/AWSLogs/WAFLogs"
                },
                "athena": {
                        "tableName": self.table_name,
                        "statements": {
                        "create": "CREATE EXTERNAL TABLE IF NOT EXISTS `tmp`.`test_waf_02{}` (`timestamp` bigint, `formatversion` int, `webaclid` string, `terminatingruleid` string, `terminatingruletype` string, `action` string, `terminatingrulematchdetails` array<struct<`conditiontype`:string,`sensitivitylevel`:string,`location`:string,`matcheddata`:array<string>>>, `httpsourcename` string, `httpsourceid` string, `rulegrouplist` array<struct<`rulegroupid`:string,`terminatingrule`:struct<`ruleid`:string,`action`:string,`rulematchdetails`:array<struct<`conditiontype`:string,`sensitivitylevel`:string,`location`:string,`matcheddata`:array<string>>>>,`nonterminatingmatchingrules`:array<struct<`ruleid`:string,`action`:string,`rulematchdetails`:array<struct<`conditiontype`:string,`sensitivitylevel`:string,`location`:string,`matcheddata`:array<string>>>>>,`excludedrules`:string>>, `ratebasedrulelist` array<struct<`ratebasedruleid`:string,`limitkey`:string,`maxrateallowed`:int>>, `nonterminatingmatchingrules` array<struct<`ruleid`:string,`action`:string,`rulematchdetails`:array<struct<`conditiontype`:string,`sensitivitylevel`:string,`location`:string,`matcheddata`:array<string>>>,`captcharesponse`:struct<`responsecode`:string,`solvetimestamp`:string>>>, `requestheadersinserted` array<struct<`name`:string,`value`:string>>, `responsecodesent` string, `httprequest` struct<`clientip`:string,`country`:string,`headers`:array<struct<`name`:string,`value`:string>>,`uri`:string,`args`:string,`httpversion`:string,`httpmethod`:string,`requestid`:string>, `labels` array<struct<`name`:string>>, `captcharesponse` struct<`responsecode`:string,`solvetimestamp`:string,`failureReason`:string>)  ROW FORMAT SERDE 'org.openx.data.jsonserde.JsonSerDe'  STORED AS INPUTFORMAT 'org.apache.hadoop.mapred.TextInputFormat' OUTPUTFORMAT 'org.apache.hadoop.hive.ql.io.HiveIgnoreKeyTextOutputFormat' LOCATION '{}' ;",
                        "drop": "DROP TABLE IF EXISTS `tmp`.`test_waf_02{}`",
                        "insert": "INSERT INTO \"centralized\".\"test_waf_02\" (\"time\", \"timestamp\", \"formatversion\", \"webaclid\", \"webaclname\", \"terminatingruleid\", \"terminatingruletype\", \"action\", \"terminatingrulematchdetails\", \"httpsourcename\", \"httpsourceid\", \"rulegrouplist\", \"ratebasedrulelist\", \"nonterminatingmatchingrules\", \"requestheadersinserted\", \"responsecodesent\", \"httprequest\", \"labels\", \"captcharesponse\", \"account_id\", \"region\", \"event_hour\", \"__execution_name__\") SELECT \"timestamp\", CAST(FROM_UNIXTIME(\"timestamp\" / 1000) AS timestamp), \"formatversion\", \"webaclid\", SPLIT(\"webaclid\", '/')[3], \"terminatingruleid\", \"terminatingruletype\", \"action\", \"terminatingrulematchdetails\", \"httpsourcename\", \"httpsourceid\", \"rulegrouplist\", \"ratebasedrulelist\", \"nonterminatingmatchingrules\", \"requestheadersinserted\", \"responsecodesent\", \"httprequest\", \"labels\", \"captcharesponse\", SPLIT(\"webaclid\", ':')[5], SPLIT(\"webaclid\", ':')[4], DATE_FORMAT(CAST(FROM_UNIXTIME(\"timestamp\" / 1000) AS timestamp), '%Y%m%d%H'), '{}' FROM \"tmp\".\"test_waf_02{}\";",
                        "aggregate": [
                            "INSERT INTO \"centralized\".\"test_waf_02_metrics\" (\"time\", \"timestamp\", \"action\", \"webaclid\", \"webaclname\", \"terminatingruleid\", \"terminatingruletype\", \"httpsourceid\", \"httpmethod\", \"country\", \"clientip\", \"uri\", \"first_label\", \"requests\", \"account_id\", \"region\", \"event_hour\", \"__execution_name__\") SELECT FLOOR(\"time\" / 60000) * 60000, DATE_TRUNC('minute', \"timestamp\"), \"action\", \"webaclid\", \"webaclname\", \"terminatingruleid\", \"terminatingruletype\", \"httpsourceid\", \"httprequest\".\"httpmethod\", \"httprequest\".\"country\", \"httprequest\".\"clientip\", \"httprequest\".\"uri\", CASE WHEN labels = ARRAY[] THEN '' ELSE labels[1].name END, CAST(COUNT(1) AS bigint), \"account_id\", \"region\", \"event_hour\", \"__execution_name__\" FROM \"centralized\".\"test_waf_02\" WHERE __execution_name__ = '{}' GROUP BY FLOOR(\"time\" / 60000) * 60000, DATE_TRUNC('minute', \"timestamp\"), \"action\", \"webaclid\", \"webaclname\", \"terminatingruleid\", \"terminatingruletype\", \"httpsourceid\", \"httprequest\".\"httpmethod\", \"httprequest\".\"country\", \"httprequest\".\"clientip\", \"httprequest\".\"uri\", CASE WHEN labels = ARRAY[] THEN '' ELSE labels[1].name END, \"account_id\", \"region\", \"event_hour\", \"__execution_name__\";"
                        ]
                    },
                },
                "notification": {
                    "service": self.notification_service,
                    "recipients": self.recipients.split(',')
                }
            }
        }
        assert response['Target']['RoleArn'] == self.log_processor_start_execution_role
        
        response = AWS_SCHEDULER.get_schedule(name='LogMerger', group_name=pipeline_id)
        assert response['Arn'] == f'arn:aws:scheduler:{self.aws_region}:{self.account_id}:schedule/{pipeline_id}/LogMerger'
        assert response['FlexibleTimeWindow'] == {'Mode': 'FLEXIBLE', 'MaximumWindowInMinutes': 30}
        assert response['GroupName'] == pipeline_id
        assert response['ScheduleExpression'] == self.merger_schedule
        assert response['State'] == 'ENABLED'
        assert response['Target']['Arn'] == self.log_merger_arn
        
        assert json.loads(response['Target']['Input']) == {
            "metadata": {
                "pipelineId": pipeline_id,
                "sourceType": "waf",
                "scheduleType": "LogMerger",
                "s3": {
                    "srcPath": f"s3://{self.centralized_bucket_name}/{self.centralized_bucket_prefix}/{self.centralized_database}/{self.table_name}",
                    "archivePath": f"s3://{self.staging_bucket_name}/archive/{self.centralized_bucket_prefix}/{self.centralized_database}/{self.table_name}"
                },
                "athena": {
                    "firstPartitionKey": "event_hour",
                    "partitionInfo": {
                        "event_hour": {
                            "type": "time",
                            "from": "%Y%m%d%H",
                            "to": "%Y%m%d00"
                        },
                        "account_id": {
                            "type": "retain"
                        },
                        "region": {
                            "type": "retain"
                        },
                        "__execution_name__": {
                            "type": "default",
                            "value": "00000000-0000-0000-0000-000000000000"
                        }
                    },
                    "intervalDays": int(-self.merger_age),
                    "database": self.centralized_database,
                    "tableName": self.table_name
                },
                "notification": {
                    "service": self.notification_service,
                    "recipients": self.recipients.split(',')
                }
            }
        }
        assert response['Target']['RoleArn'] == self.log_merger_start_execution_role
        
        response = AWS_SCHEDULER.get_schedule(name='LogMergerForMetrics', group_name=pipeline_id)
        assert response['Arn'] == f'arn:aws:scheduler:{self.aws_region}:{self.account_id}:schedule/{pipeline_id}/LogMergerForMetrics'
        assert response['FlexibleTimeWindow'] == {'Mode': 'FLEXIBLE', 'MaximumWindowInMinutes': 30}
        assert response['GroupName'] == pipeline_id
        assert response['ScheduleExpression'] == self.merger_schedule
        assert response['State'] == 'ENABLED'
        assert response['Target']['Arn'] == self.log_merger_arn
        
        assert json.loads(response['Target']['Input']) == {
            "metadata": {
                "pipelineId": pipeline_id,
                "sourceType": "waf",
                "scheduleType": "LogMergerForMetrics",
                "s3": {
                    "srcPath": f"s3://{self.centralized_bucket_name}/{self.centralized_bucket_prefix}/{self.centralized_database}/{self.table_name}_metrics",
                    "archivePath": f"s3://{self.staging_bucket_name}/archive/{self.centralized_bucket_prefix}/{self.centralized_database}/{self.table_name}_metrics"
                },
                "athena": {
                    "firstPartitionKey": "event_hour",
                    "partitionInfo": {
                        "event_hour": {
                            "type": "time",
                            "from": "%Y%m%d%H",
                            "to": "%Y%m%d00"
                        },
                        "account_id": {
                            "type": "retain"
                        },
                        "region": {
                            "type": "retain"
                        },
                        "__execution_name__": {
                            "type": "default",
                            "value": "00000000-0000-0000-0000-000000000000"
                        }
                    },
                    "intervalDays": int(-self.merger_age),
                    "database": self.centralized_database,
                    "tableName": f"{self.table_name}_metrics",
                },
                "notification": {
                    "service": self.notification_service,
                    "recipients": self.recipients.split(',')
                }
            }
        }
        assert response['Target']['RoleArn'] == self.log_merger_start_execution_role
        
        response = AWS_SCHEDULER.get_schedule(name='LogArchive', group_name=pipeline_id)
        assert response['Arn'] == f'arn:aws:scheduler:{self.aws_region}:{self.account_id}:schedule/{pipeline_id}/LogArchive'
        assert response['FlexibleTimeWindow'] == {'Mode': 'FLEXIBLE', 'MaximumWindowInMinutes': 30}
        assert response['GroupName'] == pipeline_id
        assert response['ScheduleExpression'] == self.archive_schedule
        assert response['State'] == 'ENABLED'
        assert response['Target']['Arn'] == self.log_archive_arn
        
        assert json.loads(response['Target']['Input']) == {
            "metadata": {
                "pipelineId": pipeline_id,
                "sourceType": "waf",
                "scheduleType": "LogArchive",
                "s3": {
                    "srcPath": f"s3://{self.centralized_bucket_name}/{self.centralized_bucket_prefix}/{self.centralized_database}/{self.table_name}",
                    "archivePath": f"s3://{self.staging_bucket_name}/archive/{self.centralized_bucket_prefix}/{self.centralized_database}/{self.table_name}"
                },
                "athena": {
                    'firstPartitionKey': 'event_hour',
                    "intervalDays": int(-self.archive_age),
                    "database": self.centralized_database,
                    "tableName": self.table_name,
                },
                "notification": {
                    "service": self.notification_service,
                    "recipients": self.recipients.split(',')
                }
            }
        }
        assert response['Target']['RoleArn'] == self.log_archive_start_execution_role
        
        response = AWS_SCHEDULER.get_schedule(name='LogArchiveForMetrics', group_name=pipeline_id)
        assert response['Arn'] == f'arn:aws:scheduler:{self.aws_region}:{self.account_id}:schedule/{pipeline_id}/LogArchiveForMetrics'
        assert response['FlexibleTimeWindow'] == {'Mode': 'FLEXIBLE', 'MaximumWindowInMinutes': 30}
        assert response['GroupName'] == pipeline_id
        assert response['ScheduleExpression'] == self.archive_schedule
        assert response['State'] == 'ENABLED'
        assert response['Target']['Arn'] == self.log_archive_arn
        
        assert json.loads(response['Target']['Input']) == {
            "metadata": {
                "pipelineId": pipeline_id,
                "sourceType": "waf",
                "scheduleType": "LogArchiveForMetrics",
                "s3": {
                    "srcPath": f"s3://{self.centralized_bucket_name}/{self.centralized_bucket_prefix}/{self.centralized_database}/{self.table_name}_metrics",
                    "archivePath": f"s3://{self.staging_bucket_name}/archive/{self.centralized_bucket_prefix}/{self.centralized_database}/{self.table_name}_metrics"
                },
                "athena": {
                    'firstPartitionKey': 'event_hour',
                    "intervalDays": int(-self.archive_age),
                    "database": self.centralized_database,
                    "tableName": f"{self.table_name}_metrics",
                },
                "notification": {
                    "service": self.notification_service,
                    "recipients": self.recipients.split(',')
                }
            }
        }
        assert response['Target']['RoleArn'] == self.log_archive_start_execution_role
        
        response = AWS_IAM.get_policy_document(arn=self.s3_public_access_policy_arn)
        assert response['Document']['Statement'] == [
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
                        "s3:DeleteObject"
                    ],
                    "Resource": [
                        f"arn:aws:s3:::{self.staging_bucket_name}",
                        f"arn:aws:s3:::{self.staging_bucket_name}/*"
                    ],
                    "Effect": "Allow"
                },
            {
                'Sid': 'S3AccessPolicyForDestination',
                'Effect': 'Allow', 
                'Action': [
                    's3:ListBucket', 
                    's3:ListBucketMultipartUploads', 
                    's3:ListMultipartUploadParts', 
                    's3:GetObject', 
                    's3:GetBucketLocation', 
                    's3:AbortMultipartUpload', 
                    's3:CreateBucket', 
                    's3:PutObject', 
                    's3:DeleteObject'
                    ], 
                'Resource': [
                    f'arn:aws:s3:::{self.logging_bucket_name}', 
                    f'arn:aws:s3:::{self.logging_bucket_name}/*',
                    'arn:aws:s3:::centralized-bucket/datalake/centralized/waf*',
                    f'arn:aws:s3:::{self.centralized_bucket_name}',
                    'arn:aws:s3:::centralized-bucket/datalake/centralized/waf_metrics*',
                    f'arn:aws:s3:::{self.centralized_bucket_name}/{self.centralized_bucket_prefix}/{self.centralized_database}/{self.table_name}*',
                    f'arn:aws:s3:::{self.centralized_bucket_name}/{self.centralized_bucket_prefix}/{self.centralized_database}/{self.table_name}_metrics*'], 
                }
            ]
        
        pipeline_resource_builder.delete_pipeline()

        # test waf log format
        # filter '/' in prefix' begin char or end char
        self.table_name = 'test_waf_03'
        self.logging_bucket_prefix = f'/AWSLogs/{self.account_id}/{self.aws_region}/WAFLogs/'
        self.processor_schedule = 'rate(5 minutes)'
        self.merger_schedule = 'cron(0 2 * * ? *)'
        self.archive_schedule = 'cron(0 3 * * ? *)'
        self.merger_age = 5
        self.archive_age = 10
        self.staging_bucket_prefix = '/AWSLogs/WAFLogs/'
        
        pipeline_id = str(uuid.uuid4())
        pipeline_info = copy.deepcopy(self.pipeline_info)
        pipeline_info['data']['destination']['table']['name'] = self.table_name
        pipeline_info['data']['notification']['service'] = self.notification_service
        pipeline_info['data']['notification']['recipients'] = self.recipients
        pipeline_info['data']['scheduler']['service'] = 'scheduler'
        pipeline_info['data']['scheduler']['LogProcessor']['schedule'] = self.processor_schedule
        pipeline_info['data']['scheduler']['LogMerger']['schedule'] = self.merger_schedule
        pipeline_info['data']['scheduler']['LogMerger']['age'] = self.merger_age
        pipeline_info['data']['scheduler']['LogArchive']['schedule'] = self.archive_schedule
        pipeline_info['data']['scheduler']['LogArchive']['age'] = self.archive_age
        pipeline_info['data']['staging']['prefix'] = self.staging_bucket_prefix
        pipeline_event = {'RequestType': 'Create', 'ResourceProperties': {'Resource': 'pipeline', 'Id': pipeline_id}}
        AWS_DDB_META.put(meta_name='AvailableServices', item={'value': ['scheduler']})
        AWS_DDB_META.put(meta_name=pipeline_id, item=pipeline_info)
        
        pipeline_parameters = Parameters(pipeline_event)
        pipeline_resource_builder = PipelineResourceBuilder(parameters=pipeline_parameters)
        pipeline_resource_builder.create_pipeline()
        
        response = AWS_GLUE.get_table(database=self.centralized_database, name=self.table_name)
        assert response['Table']['Name'] == self.table_name
        assert response['Table']['DatabaseName'] == self.centralized_database
        assert response['Table']['StorageDescriptor']['Columns'] == [
            {'Name': 'time', 'Type': 'bigint'}, 
            {'Name': 'timestamp', 'Type': 'timestamp'},
            {'Name': 'formatversion', 'Type': 'int'}, 
            {'Name': 'webaclid', 'Type': 'string'}, 
            {'Name': 'webaclname', 'Type': 'string'}, 
            {'Name': 'terminatingruleid', 'Type': 'string'}, 
            {'Name': 'terminatingruletype', 'Type': 'string'}, 
            {'Name': 'action', 'Type': 'string'}, 
            {'Name': 'terminatingrulematchdetails', 'Type': 'array<struct<conditiontype:string,sensitivitylevel:string,location:string,matcheddata:array<string>>>'}, 
            {'Name': 'httpsourcename', 'Type': 'string'}, 
            {'Name': 'httpsourceid', 'Type': 'string'}, 
            {'Name': 'rulegrouplist', 'Type': 'array<struct<rulegroupid:string,terminatingrule:struct<ruleid:string,action:string,rulematchdetails:array<struct<conditiontype:string,sensitivitylevel:string,location:string,matcheddata:array<string>>>>,nonterminatingmatchingrules:array<struct<ruleid:string,action:string,rulematchdetails:array<struct<conditiontype:string,sensitivitylevel:string,location:string,matcheddata:array<string>>>>>,excludedrules:string>>'}, 
            {'Name': 'ratebasedrulelist', 'Type': 'array<struct<ratebasedruleid:string,limitkey:string,maxrateallowed:int>>'}, 
            {'Name': 'nonterminatingmatchingrules', 'Type': 'array<struct<ruleid:string,action:string,rulematchdetails:array<struct<conditiontype:string,sensitivitylevel:string,location:string,matcheddata:array<string>>>,captcharesponse:struct<responsecode:string,solvetimestamp:string>>>'}, 
            {'Name': 'requestheadersinserted', 'Type': 'array<struct<name:string,value:string>>'}, 
            {'Name': 'responsecodesent', 'Type': 'string'}, 
            {'Name': 'httprequest', 'Type': 'struct<clientip:string,country:string,headers:array<struct<name:string,value:string>>,uri:string,args:string,httpversion:string,httpmethod:string,requestid:string>'}, 
            {'Name': 'labels', 'Type': 'array<struct<name:string>>'}, 
            {'Name': 'captcharesponse', 'Type': 'struct<responsecode:string,solvetimestamp:string,failureReason:string>'}
            ]
        assert response['Table']['StorageDescriptor']['Location'] == f's3://{self.centralized_bucket_name}/{self.centralized_bucket_prefix}/{self.centralized_database}/{self.table_name}'
        assert response['Table']['StorageDescriptor']['InputFormat'] == 'org.apache.hadoop.hive.ql.io.parquet.MapredParquetInputFormat'
        assert response['Table']['StorageDescriptor']['OutputFormat'] == 'org.apache.hadoop.hive.ql.io.parquet.MapredParquetOutputFormat'
        assert response['Table']['StorageDescriptor']['Compressed'] is True
        assert response['Table']['StorageDescriptor']['SerdeInfo']['SerializationLibrary'] == 'org.apache.hadoop.hive.ql.io.parquet.serde.ParquetHiveSerDe'
        # assert response['Table']['StorageDescriptor']['SerdeInfo']['Parameters']['serialization.format'] == '1'
        assert response['Table']['PartitionKeys'] == [
            {'Name': 'event_hour', 'Type': 'string'}, 
            {'Name': 'account_id', 'Type': 'string'}, 
            {'Name': 'region', 'Type': 'string'}, 
            {'Name': '__execution_name__', 'Type': 'string'}
            ]
        assert response['Table']['TableType'] == 'EXTERNAL_TABLE'
        assert response['Table']['Parameters'] == {'partition_filtering.enabled': 'true', 'classification': 'parquet', 'has_encrypted_data': 'true'}
        
        response = AWS_GLUE.get_partition_indexes(database=self.centralized_database, table_name=self.table_name)
        assert response['PartitionIndexDescriptorList'] == []
        
        response = AWS_GLUE.get_table(database=self.centralized_database, name=f'{self.table_name}_metrics')
        assert response['Table']['Name'] == f'{self.table_name}_metrics'
        assert response['Table']['DatabaseName'] == self.centralized_database
        assert response['Table']['StorageDescriptor']['Columns'] == [
            {'Name': 'time', 'Type': 'bigint'}, 
            {'Name': 'timestamp', 'Type': 'timestamp'}, 
            {'Name': 'action', 'Type': 'string'}, 
            {'Name': 'webaclid', 'Type': 'string'}, 
            {'Name': 'webaclname', 'Type': 'string'}, 
            {'Name': 'terminatingruleid', 'Type': 'string'}, 
            {'Name': 'terminatingruletype', 'Type': 'string'}, 
            {'Name': 'httpsourceid', 'Type': 'string'}, 
            {'Name': 'httpmethod', 'Type': 'string'}, 
            {'Name': 'country', 'Type': 'string'}, 
            {'Name': 'clientip', 'Type': 'string'}, 
            {'Name': 'uri', 'Type': 'string'}, 
            {'Name': 'first_label', 'Type': 'string'},
            {'Name': 'requests', 'Type': 'bigint'}
            ]
        assert response['Table']['StorageDescriptor']['Location'] == f's3://{self.centralized_bucket_name}/{self.centralized_bucket_prefix}/{self.centralized_database}/{self.table_name}_metrics'
        assert response['Table']['StorageDescriptor']['InputFormat'] == 'org.apache.hadoop.hive.ql.io.parquet.MapredParquetInputFormat'
        assert response['Table']['StorageDescriptor']['OutputFormat'] == 'org.apache.hadoop.hive.ql.io.parquet.MapredParquetOutputFormat'
        assert response['Table']['StorageDescriptor']['Compressed'] is True
        assert response['Table']['StorageDescriptor']['SerdeInfo']['SerializationLibrary'] == 'org.apache.hadoop.hive.ql.io.parquet.serde.ParquetHiveSerDe'
        # assert response['Table']['StorageDescriptor']['SerdeInfo']['Parameters']['serialization.format'] == '1'
        assert response['Table']['PartitionKeys'] == [
            {'Name': 'event_hour', 'Type': 'string'},
            {'Name': 'account_id', 'Type': 'string'}, 
            {'Name': 'region', 'Type': 'string'}, 
            {'Name': '__execution_name__', 'Type': 'string'}
            ]
        assert response['Table']['TableType'] == 'EXTERNAL_TABLE'
        assert response['Table']['Parameters'] == {'partition_filtering.enabled': 'true', 'classification': 'parquet', 'has_encrypted_data': 'true'}
        
        response = AWS_GLUE.get_partition_indexes(database=self.centralized_database, table_name=f'{self.table_name}_metrics')
        assert response['PartitionIndexDescriptorList'] == []
        
        response = AWS_SCHEDULER.get_schedule_group(name=pipeline_id)
        assert response['Arn'] == f'arn:aws:scheduler:{self.aws_region}:{self.account_id}:schedule-group/{pipeline_id}'
        
        response = AWS_SCHEDULER.get_schedule(name='LogProcessor', group_name=pipeline_id)
        assert response['Arn'] == f'arn:aws:scheduler:{self.aws_region}:{self.account_id}:schedule/{pipeline_id}/LogProcessor'
        assert response['FlexibleTimeWindow'] == {'Mode': 'OFF'}
        assert response['GroupName'] == pipeline_id
        assert response['ScheduleExpression'] == self.processor_schedule
        assert response['State'] == 'ENABLED'
        assert response['Target']['Arn'] == self.log_processor_arn
        
        assert json.loads(response['Target']['Input']) == {
            "metadata": {
                "pipelineId": pipeline_id,
                "sourceType": "waf",
                "scheduleType": "LogProcessor",
                "enrichmentPlugins": [],
                "s3": {
                    "srcPath": f"s3://{self.staging_bucket_name}/AWSLogs/WAFLogs",
                    "archivePath": f"s3://{self.staging_bucket_name}/archive/AWSLogs/WAFLogs"
                },
                "athena": {
                    "tableName": self.table_name,
                    "statements": {
                        "create": "CREATE EXTERNAL TABLE IF NOT EXISTS `tmp`.`test_waf_03{}` (`timestamp` bigint, `formatversion` int, `webaclid` string, `terminatingruleid` string, `terminatingruletype` string, `action` string, `terminatingrulematchdetails` array<struct<`conditiontype`:string,`sensitivitylevel`:string,`location`:string,`matcheddata`:array<string>>>, `httpsourcename` string, `httpsourceid` string, `rulegrouplist` array<struct<`rulegroupid`:string,`terminatingrule`:struct<`ruleid`:string,`action`:string,`rulematchdetails`:array<struct<`conditiontype`:string,`sensitivitylevel`:string,`location`:string,`matcheddata`:array<string>>>>,`nonterminatingmatchingrules`:array<struct<`ruleid`:string,`action`:string,`rulematchdetails`:array<struct<`conditiontype`:string,`sensitivitylevel`:string,`location`:string,`matcheddata`:array<string>>>>>,`excludedrules`:string>>, `ratebasedrulelist` array<struct<`ratebasedruleid`:string,`limitkey`:string,`maxrateallowed`:int>>, `nonterminatingmatchingrules` array<struct<`ruleid`:string,`action`:string,`rulematchdetails`:array<struct<`conditiontype`:string,`sensitivitylevel`:string,`location`:string,`matcheddata`:array<string>>>,`captcharesponse`:struct<`responsecode`:string,`solvetimestamp`:string>>>, `requestheadersinserted` array<struct<`name`:string,`value`:string>>, `responsecodesent` string, `httprequest` struct<`clientip`:string,`country`:string,`headers`:array<struct<`name`:string,`value`:string>>,`uri`:string,`args`:string,`httpversion`:string,`httpmethod`:string,`requestid`:string>, `labels` array<struct<`name`:string>>, `captcharesponse` struct<`responsecode`:string,`solvetimestamp`:string,`failureReason`:string>)  ROW FORMAT SERDE 'org.openx.data.jsonserde.JsonSerDe'  STORED AS INPUTFORMAT 'org.apache.hadoop.mapred.TextInputFormat' OUTPUTFORMAT 'org.apache.hadoop.hive.ql.io.HiveIgnoreKeyTextOutputFormat' LOCATION '{}' ;",
                        "drop": "DROP TABLE IF EXISTS `tmp`.`test_waf_03{}`",
                        "insert": "INSERT INTO \"centralized\".\"test_waf_03\" (\"time\", \"timestamp\", \"formatversion\", \"webaclid\", \"webaclname\", \"terminatingruleid\", \"terminatingruletype\", \"action\", \"terminatingrulematchdetails\", \"httpsourcename\", \"httpsourceid\", \"rulegrouplist\", \"ratebasedrulelist\", \"nonterminatingmatchingrules\", \"requestheadersinserted\", \"responsecodesent\", \"httprequest\", \"labels\", \"captcharesponse\", \"account_id\", \"region\", \"event_hour\", \"__execution_name__\") SELECT \"timestamp\", CAST(FROM_UNIXTIME(\"timestamp\" / 1000) AS timestamp), \"formatversion\", \"webaclid\", SPLIT(\"webaclid\", '/')[3], \"terminatingruleid\", \"terminatingruletype\", \"action\", \"terminatingrulematchdetails\", \"httpsourcename\", \"httpsourceid\", \"rulegrouplist\", \"ratebasedrulelist\", \"nonterminatingmatchingrules\", \"requestheadersinserted\", \"responsecodesent\", \"httprequest\", \"labels\", \"captcharesponse\", SPLIT(\"webaclid\", ':')[5], SPLIT(\"webaclid\", ':')[4], DATE_FORMAT(CAST(FROM_UNIXTIME(\"timestamp\" / 1000) AS timestamp), '%Y%m%d%H'), '{}' FROM \"tmp\".\"test_waf_03{}\";",
                        "aggregate": [
                            "INSERT INTO \"centralized\".\"test_waf_03_metrics\" (\"time\", \"timestamp\", \"action\", \"webaclid\", \"webaclname\", \"terminatingruleid\", \"terminatingruletype\", \"httpsourceid\", \"httpmethod\", \"country\", \"clientip\", \"uri\", \"first_label\", \"requests\", \"account_id\", \"region\", \"event_hour\", \"__execution_name__\") SELECT FLOOR(\"time\" / 60000) * 60000, DATE_TRUNC('minute', \"timestamp\"), \"action\", \"webaclid\", \"webaclname\", \"terminatingruleid\", \"terminatingruletype\", \"httpsourceid\", \"httprequest\".\"httpmethod\", \"httprequest\".\"country\", \"httprequest\".\"clientip\", \"httprequest\".\"uri\", CASE WHEN labels = ARRAY[] THEN '' ELSE labels[1].name END, CAST(COUNT(1) AS bigint), \"account_id\", \"region\", \"event_hour\", \"__execution_name__\" FROM \"centralized\".\"test_waf_03\" WHERE __execution_name__ = '{}' GROUP BY FLOOR(\"time\" / 60000) * 60000, DATE_TRUNC('minute', \"timestamp\"), \"action\", \"webaclid\", \"webaclname\", \"terminatingruleid\", \"terminatingruletype\", \"httpsourceid\", \"httprequest\".\"httpmethod\", \"httprequest\".\"country\", \"httprequest\".\"clientip\", \"httprequest\".\"uri\", CASE WHEN labels = ARRAY[] THEN '' ELSE labels[1].name END, \"account_id\", \"region\", \"event_hour\", \"__execution_name__\";"
                        ]
                    }
                },
                "notification": {
                    "service": self.notification_service,
                    "recipients": self.recipients.split(',')
                }
            }
        }
        assert response['Target']['RoleArn'] == self.log_processor_start_execution_role
        
        response = AWS_SCHEDULER.get_schedule(name='LogMerger', group_name=pipeline_id)
        assert response['Arn'] == f'arn:aws:scheduler:{self.aws_region}:{self.account_id}:schedule/{pipeline_id}/LogMerger'
        assert response['FlexibleTimeWindow'] == {'Mode': 'FLEXIBLE', 'MaximumWindowInMinutes': 30}
        assert response['GroupName'] == pipeline_id
        assert response['ScheduleExpression'] == self.merger_schedule
        assert response['State'] == 'ENABLED'
        assert response['Target']['Arn'] == self.log_merger_arn
        
        assert json.loads(response['Target']['Input']) == {
            "metadata": {
                "pipelineId": pipeline_id,
                "sourceType": "waf",
                "scheduleType": "LogMerger",
                "s3": {
                    "srcPath": f"s3://{self.centralized_bucket_name}/{self.centralized_bucket_prefix}/{self.centralized_database}/{self.table_name}",
                    "archivePath": f"s3://{self.staging_bucket_name}/archive/{self.centralized_bucket_prefix}/{self.centralized_database}/{self.table_name}"
                },
                "athena": {
                    "firstPartitionKey": "event_hour",
                    "partitionInfo": {
                        "event_hour": {
                            "type": "time",
                            "from": "%Y%m%d%H",
                            "to": "%Y%m%d00"
                        },
                        "account_id": {
                            "type": "retain"
                        },
                        "region": {
                            "type": "retain"
                        },
                        "__execution_name__": {
                            "type": "default",
                            "value": "00000000-0000-0000-0000-000000000000"
                        }
                    },
                    "intervalDays": int(-self.merger_age),
                    "database": self.centralized_database,
                    "tableName": self.table_name
                },
                "notification": {
                    "service": self.notification_service,
                    "recipients": self.recipients.split(',')
                }
            }
        }
        assert response['Target']['RoleArn'] == self.log_merger_start_execution_role
        
        response = AWS_SCHEDULER.get_schedule(name='LogMergerForMetrics', group_name=pipeline_id)
        assert response['Arn'] == f'arn:aws:scheduler:{self.aws_region}:{self.account_id}:schedule/{pipeline_id}/LogMergerForMetrics'
        assert response['FlexibleTimeWindow'] == {'Mode': 'FLEXIBLE', 'MaximumWindowInMinutes': 30}
        assert response['GroupName'] == pipeline_id
        assert response['ScheduleExpression'] == self.merger_schedule
        assert response['State'] == 'ENABLED'
        assert response['Target']['Arn'] == self.log_merger_arn
        
        assert json.loads(response['Target']['Input']) == {
            "metadata": {
                "pipelineId": pipeline_id,
                "sourceType": "waf",
                "scheduleType": "LogMergerForMetrics",
                "s3": {
                    "srcPath": f"s3://{self.centralized_bucket_name}/{self.centralized_bucket_prefix}/{self.centralized_database}/{self.table_name}_metrics",
                    "archivePath": f"s3://{self.staging_bucket_name}/archive/{self.centralized_bucket_prefix}/{self.centralized_database}/{self.table_name}_metrics"
                },
                "athena": {
                    "firstPartitionKey": "event_hour",
                    "partitionInfo": {
                        "event_hour": {
                            "type": "time",
                            "from": "%Y%m%d%H",
                            "to": "%Y%m%d00"
                        },
                        "account_id": {
                            "type": "retain"
                        },
                        "region": {
                            "type": "retain"
                        },
                        "__execution_name__": {
                            "type": "default",
                            "value": "00000000-0000-0000-0000-000000000000"
                        }
                    },
                    "intervalDays": int(-self.merger_age),
                    "database": self.centralized_database,
                    "tableName": f"{self.table_name}_metrics",
                },
                "notification": {
                    "service": self.notification_service,
                    "recipients": self.recipients.split(',')
                }
            }
        }
        assert response['Target']['RoleArn'] == self.log_merger_start_execution_role
        
        response = AWS_SCHEDULER.get_schedule(name='LogArchive', group_name=pipeline_id)
        assert response['Arn'] == f'arn:aws:scheduler:{self.aws_region}:{self.account_id}:schedule/{pipeline_id}/LogArchive'
        assert response['FlexibleTimeWindow'] == {'Mode': 'FLEXIBLE', 'MaximumWindowInMinutes': 30}
        assert response['GroupName'] == pipeline_id
        assert response['ScheduleExpression'] == self.archive_schedule
        assert response['State'] == 'ENABLED'
        assert response['Target']['Arn'] == self.log_archive_arn
        
        assert json.loads(response['Target']['Input']) == {
            "metadata": {
                "pipelineId": pipeline_id,
                "sourceType": "waf",
                "scheduleType": "LogArchive",
                "s3": {
                    "srcPath": f"s3://{self.centralized_bucket_name}/{self.centralized_bucket_prefix}/{self.centralized_database}/{self.table_name}",
                    "archivePath": f"s3://{self.staging_bucket_name}/archive/{self.centralized_bucket_prefix}/{self.centralized_database}/{self.table_name}"
                },
                "athena": {
                    'firstPartitionKey': 'event_hour',
                    "intervalDays": int(-self.archive_age),
                    "database": self.centralized_database,
                    "tableName": self.table_name,
                },
                "notification": {
                    "service": self.notification_service,
                    "recipients": self.recipients.split(',')
                }
            }
        }
        assert response['Target']['RoleArn'] == self.log_archive_start_execution_role
        
        response = AWS_SCHEDULER.get_schedule(name='LogArchiveForMetrics', group_name=pipeline_id)
        assert response['Arn'] == f'arn:aws:scheduler:{self.aws_region}:{self.account_id}:schedule/{pipeline_id}/LogArchiveForMetrics'
        assert response['FlexibleTimeWindow'] == {'Mode': 'FLEXIBLE', 'MaximumWindowInMinutes': 30}
        assert response['GroupName'] == pipeline_id
        assert response['ScheduleExpression'] == self.archive_schedule
        assert response['State'] == 'ENABLED'
        assert response['Target']['Arn'] == self.log_archive_arn
        
        assert json.loads(response['Target']['Input']) == {
            "metadata": {
                "pipelineId": pipeline_id,
                "sourceType": "waf",
                "scheduleType": "LogArchiveForMetrics",
                "s3": {
                    "srcPath": f"s3://{self.centralized_bucket_name}/{self.centralized_bucket_prefix}/{self.centralized_database}/{self.table_name}_metrics",
                    "archivePath": f"s3://{self.staging_bucket_name}/archive/{self.centralized_bucket_prefix}/{self.centralized_database}/{self.table_name}_metrics"
                },
                "athena": {
                    'firstPartitionKey': 'event_hour',
                    "intervalDays": int(-self.archive_age),
                    "database": self.centralized_database,
                    "tableName": f"{self.table_name}_metrics",
                },
                "notification": {
                    "service": self.notification_service,
                    "recipients": self.recipients.split(',')
                }
            }
        }
        assert response['Target']['RoleArn'] == self.log_archive_start_execution_role
        
        response = AWS_IAM.get_policy_document(arn=self.s3_public_access_policy_arn)
        assert response['Document']['Statement'] == [
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
                        "s3:DeleteObject"
                    ],
                    "Resource": [
                        f"arn:aws:s3:::{self.staging_bucket_name}",
                        f"arn:aws:s3:::{self.staging_bucket_name}/*"
                    ],
                    "Effect": "Allow"
                },
            {
                'Sid': 'S3AccessPolicyForDestination',
                'Effect': 'Allow',
                'Action': [
                    's3:ListBucket', 
                    's3:ListBucketMultipartUploads', 
                    's3:ListMultipartUploadParts', 
                    's3:GetObject', 
                    's3:GetBucketLocation', 
                    's3:AbortMultipartUpload', 
                    's3:CreateBucket', 
                    's3:PutObject', 
                    's3:DeleteObject'
                    ], 
                'Resource': [
                    f'arn:aws:s3:::{self.logging_bucket_name}', 
                    f'arn:aws:s3:::{self.logging_bucket_name}/*',
                    f'arn:aws:s3:::{self.centralized_bucket_name}/{self.centralized_bucket_prefix}/{self.centralized_database}/waf*',
                    f'arn:aws:s3:::{self.centralized_bucket_name}', 
                    f'arn:aws:s3:::{self.centralized_bucket_name}/{self.centralized_bucket_prefix}/{self.centralized_database}/waf_metrics*',
                    f'arn:aws:s3:::{self.centralized_bucket_name}/{self.centralized_bucket_prefix}/{self.centralized_database}/{self.table_name}*',
                    f'arn:aws:s3:::{self.centralized_bucket_name}/{self.centralized_bucket_prefix}/{self.centralized_database}/{self.table_name}_metrics*'
                    ]
                }
            ]
        
        pipeline_resource_builder.delete_pipeline()
        
        # test centralized_bucket_name == staging_bucket_name
        centralized_bucket_name = self.staging_bucket_name
        self.table_name = 'waf'
        self.sts_role = ''
        self.notification_service = 'SES'
        self.recipients = 'alejandro_rosalez@example.com,alejandro_rosalez@example.org'
        self.processor_schedule = 'rate(5 minutes)'
        self.merger_schedule = 'cron(0 1 * * ? *)'
        self.archive_schedule = 'cron(0 1 * * ? *)'
        self.merger_age = 3
        self.archive_age = 7
        self.staging_bucket_prefix = 'AWSLogs/WAFLogs'
        
        pipeline_id = str(uuid.uuid4())
        pipeline_info = copy.deepcopy(self.pipeline_info)
        pipeline_info['data']['destination']['table']['name'] = self.table_name
        pipeline_info['data']['destination']['location']['bucket'] = centralized_bucket_name
        pipeline_info['data']['notification']['service'] = self.notification_service
        pipeline_info['data']['notification']['recipients'] = self.recipients
        pipeline_info['data']['scheduler']['service'] = 'scheduler'
        pipeline_info['data']['scheduler']['LogProcessor']['schedule'] = self.processor_schedule
        pipeline_info['data']['scheduler']['LogMerger']['schedule'] = self.merger_schedule
        pipeline_info['data']['scheduler']['LogMerger']['age'] = self.merger_age
        pipeline_info['data']['scheduler']['LogArchive']['schedule'] = self.archive_schedule
        pipeline_info['data']['scheduler']['LogArchive']['age'] = self.archive_age
        pipeline_info['data']['staging']['prefix'] = self.staging_bucket_prefix
        pipeline_event = {'RequestType': 'Create', 'ResourceProperties': {'Resource': 'pipeline', 'Id': pipeline_id}}
        AWS_DDB_META.put(meta_name='AvailableServices', item={'value': ['scheduler']})
        AWS_DDB_META.put(meta_name=pipeline_id, item=pipeline_info)
        
        pipeline_parameters = Parameters(pipeline_event)
        pipeline_resource_builder = PipelineResourceBuilder(parameters=pipeline_parameters)
        pipeline_resource_builder.create_pipeline()
        
        response = AWS_GLUE.get_table(database=self.centralized_database, name=self.table_name)
        assert response['Table']['Name'] == self.table_name
        assert response['Table']['DatabaseName'] == self.centralized_database
        assert response['Table']['StorageDescriptor']['Columns'] == [
            {'Name': 'time', 'Type': 'bigint'}, 
            {'Name': 'timestamp', 'Type': 'timestamp'},
            {'Name': 'formatversion', 'Type': 'int'}, 
            {'Name': 'webaclid', 'Type': 'string'}, 
            {'Name': 'webaclname', 'Type': 'string'}, 
            {'Name': 'terminatingruleid', 'Type': 'string'}, 
            {'Name': 'terminatingruletype', 'Type': 'string'}, 
            {'Name': 'action', 'Type': 'string'}, 
            {'Name': 'terminatingrulematchdetails', 'Type': 'array<struct<conditiontype:string,sensitivitylevel:string,location:string,matcheddata:array<string>>>'}, 
            {'Name': 'httpsourcename', 'Type': 'string'}, 
            {'Name': 'httpsourceid', 'Type': 'string'}, 
            {'Name': 'rulegrouplist', 'Type': 'array<struct<rulegroupid:string,terminatingrule:struct<ruleid:string,action:string,rulematchdetails:array<struct<conditiontype:string,sensitivitylevel:string,location:string,matcheddata:array<string>>>>,nonterminatingmatchingrules:array<struct<ruleid:string,action:string,rulematchdetails:array<struct<conditiontype:string,sensitivitylevel:string,location:string,matcheddata:array<string>>>>>,excludedrules:string>>'}, 
            {'Name': 'ratebasedrulelist', 'Type': 'array<struct<ratebasedruleid:string,limitkey:string,maxrateallowed:int>>'}, 
            {'Name': 'nonterminatingmatchingrules', 'Type': 'array<struct<ruleid:string,action:string,rulematchdetails:array<struct<conditiontype:string,sensitivitylevel:string,location:string,matcheddata:array<string>>>,captcharesponse:struct<responsecode:string,solvetimestamp:string>>>'}, 
            {'Name': 'requestheadersinserted', 'Type': 'array<struct<name:string,value:string>>'}, 
            {'Name': 'responsecodesent', 'Type': 'string'}, 
            {'Name': 'httprequest', 'Type': 'struct<clientip:string,country:string,headers:array<struct<name:string,value:string>>,uri:string,args:string,httpversion:string,httpmethod:string,requestid:string>'}, 
            {'Name': 'labels', 'Type': 'array<struct<name:string>>'}, 
            {'Name': 'captcharesponse', 'Type': 'struct<responsecode:string,solvetimestamp:string,failureReason:string>'}
            ]
        assert response['Table']['StorageDescriptor']['Location'] == f's3://{centralized_bucket_name}/{self.centralized_bucket_prefix}/{self.centralized_database}/{self.table_name}'
        assert response['Table']['StorageDescriptor']['InputFormat'] == 'org.apache.hadoop.hive.ql.io.parquet.MapredParquetInputFormat'
        assert response['Table']['StorageDescriptor']['OutputFormat'] == 'org.apache.hadoop.hive.ql.io.parquet.MapredParquetOutputFormat'
        assert response['Table']['StorageDescriptor']['Compressed'] is True
        assert response['Table']['StorageDescriptor']['SerdeInfo']['SerializationLibrary'] == 'org.apache.hadoop.hive.ql.io.parquet.serde.ParquetHiveSerDe'
        # assert response['Table']['StorageDescriptor']['SerdeInfo']['Parameters']['serialization.format'] == '1'
        assert response['Table']['PartitionKeys'] == [
            {'Name': 'event_hour', 'Type': 'string'}, 
            {'Name': 'account_id', 'Type': 'string'}, 
            {'Name': 'region', 'Type': 'string'}, 
            {'Name': '__execution_name__', 'Type': 'string'}
            ]
        assert response['Table']['TableType'] == 'EXTERNAL_TABLE'
        assert response['Table']['Parameters'] == {'partition_filtering.enabled': 'true', 'classification': 'parquet', 'has_encrypted_data': 'true'}
        
        response = AWS_GLUE.get_partition_indexes(database=self.centralized_database, table_name=self.table_name)
        assert response['PartitionIndexDescriptorList'] == []
        
        response = AWS_GLUE.get_table(database=self.centralized_database, name=f'{self.table_name}_metrics')
        assert response['Table']['Name'] == f'{self.table_name}_metrics'
        assert response['Table']['DatabaseName'] == self.centralized_database
        assert response['Table']['StorageDescriptor']['Columns'] == [
            {'Name': 'time', 'Type': 'bigint'}, 
            {'Name': 'timestamp', 'Type': 'timestamp'}, 
            {'Name': 'action', 'Type': 'string'}, 
            {'Name': 'webaclid', 'Type': 'string'}, 
            {'Name': 'webaclname', 'Type': 'string'}, 
            {'Name': 'terminatingruleid', 'Type': 'string'}, 
            {'Name': 'terminatingruletype', 'Type': 'string'}, 
            {'Name': 'httpsourceid', 'Type': 'string'}, 
            {'Name': 'httpmethod', 'Type': 'string'}, 
            {'Name': 'country', 'Type': 'string'}, 
            {'Name': 'clientip', 'Type': 'string'}, 
            {'Name': 'uri', 'Type': 'string'}, 
            {'Name': 'first_label', 'Type': 'string'},
            {'Name': 'requests', 'Type': 'bigint'}
            ]
        assert response['Table']['StorageDescriptor']['Location'] == f's3://{centralized_bucket_name}/{self.centralized_bucket_prefix}/{self.centralized_database}/{self.table_name}_metrics'
        assert response['Table']['StorageDescriptor']['InputFormat'] == 'org.apache.hadoop.hive.ql.io.parquet.MapredParquetInputFormat'
        assert response['Table']['StorageDescriptor']['OutputFormat'] == 'org.apache.hadoop.hive.ql.io.parquet.MapredParquetOutputFormat'
        assert response['Table']['StorageDescriptor']['Compressed'] is True
        assert response['Table']['StorageDescriptor']['SerdeInfo']['SerializationLibrary'] == 'org.apache.hadoop.hive.ql.io.parquet.serde.ParquetHiveSerDe'
        # assert response['Table']['StorageDescriptor']['SerdeInfo']['Parameters']['serialization.format'] == '1'
        assert response['Table']['PartitionKeys'] == [
            {'Name': 'event_hour', 'Type': 'string'},
            {'Name': 'account_id', 'Type': 'string'}, 
            {'Name': 'region', 'Type': 'string'}, 
            {'Name': '__execution_name__', 'Type': 'string'}
            ]
        assert response['Table']['TableType'] == 'EXTERNAL_TABLE'
        assert response['Table']['Parameters'] == {'partition_filtering.enabled': 'true', 'classification': 'parquet', 'has_encrypted_data': 'true'}
        
        response = AWS_GLUE.get_partition_indexes(database=self.centralized_database, table_name=f'{self.table_name}_metrics')
        assert response['PartitionIndexDescriptorList'] == []
        
        response = AWS_SCHEDULER.get_schedule_group(name=pipeline_id)
        assert response['Arn'] == f'arn:aws:scheduler:{self.aws_region}:{self.account_id}:schedule-group/{pipeline_id}'
        
        response = AWS_SCHEDULER.get_schedule(name='LogProcessor', group_name=pipeline_id)
        assert response['Arn'] == f'arn:aws:scheduler:{self.aws_region}:{self.account_id}:schedule/{pipeline_id}/LogProcessor'
        assert response['FlexibleTimeWindow'] == {'Mode': 'OFF'}
        assert response['GroupName'] == pipeline_id
        assert response['ScheduleExpression'] == self.processor_schedule
        assert response['State'] == 'ENABLED'
        assert response['Target']['Arn'] == self.log_processor_arn

        assert json.loads(response['Target']['Input']) == {
            "metadata": {
                "pipelineId": pipeline_id,
                "sourceType": "waf",
                "scheduleType": "LogProcessor",
                "enrichmentPlugins": [],
                "s3": {
                    "srcPath": f"s3://{self.staging_bucket_name}/AWSLogs/WAFLogs",
                    "archivePath": f"s3://{self.staging_bucket_name}/archive/AWSLogs/WAFLogs"
                },
                "athena": {
                    "tableName": self.table_name,
                    "statements": {
                        "create": "CREATE EXTERNAL TABLE IF NOT EXISTS `tmp`.`waf{}` (`timestamp` bigint, `formatversion` int, `webaclid` string, `terminatingruleid` string, `terminatingruletype` string, `action` string, `terminatingrulematchdetails` array<struct<`conditiontype`:string,`sensitivitylevel`:string,`location`:string,`matcheddata`:array<string>>>, `httpsourcename` string, `httpsourceid` string, `rulegrouplist` array<struct<`rulegroupid`:string,`terminatingrule`:struct<`ruleid`:string,`action`:string,`rulematchdetails`:array<struct<`conditiontype`:string,`sensitivitylevel`:string,`location`:string,`matcheddata`:array<string>>>>,`nonterminatingmatchingrules`:array<struct<`ruleid`:string,`action`:string,`rulematchdetails`:array<struct<`conditiontype`:string,`sensitivitylevel`:string,`location`:string,`matcheddata`:array<string>>>>>,`excludedrules`:string>>, `ratebasedrulelist` array<struct<`ratebasedruleid`:string,`limitkey`:string,`maxrateallowed`:int>>, `nonterminatingmatchingrules` array<struct<`ruleid`:string,`action`:string,`rulematchdetails`:array<struct<`conditiontype`:string,`sensitivitylevel`:string,`location`:string,`matcheddata`:array<string>>>,`captcharesponse`:struct<`responsecode`:string,`solvetimestamp`:string>>>, `requestheadersinserted` array<struct<`name`:string,`value`:string>>, `responsecodesent` string, `httprequest` struct<`clientip`:string,`country`:string,`headers`:array<struct<`name`:string,`value`:string>>,`uri`:string,`args`:string,`httpversion`:string,`httpmethod`:string,`requestid`:string>, `labels` array<struct<`name`:string>>, `captcharesponse` struct<`responsecode`:string,`solvetimestamp`:string,`failureReason`:string>)  ROW FORMAT SERDE 'org.openx.data.jsonserde.JsonSerDe'  STORED AS INPUTFORMAT 'org.apache.hadoop.mapred.TextInputFormat' OUTPUTFORMAT 'org.apache.hadoop.hive.ql.io.HiveIgnoreKeyTextOutputFormat' LOCATION '{}' ;",
                    "drop": "DROP TABLE IF EXISTS `tmp`.`waf{}`",
                    "insert": "INSERT INTO \"centralized\".\"waf\" (\"time\", \"timestamp\", \"formatversion\", \"webaclid\", \"webaclname\", \"terminatingruleid\", \"terminatingruletype\", \"action\", \"terminatingrulematchdetails\", \"httpsourcename\", \"httpsourceid\", \"rulegrouplist\", \"ratebasedrulelist\", \"nonterminatingmatchingrules\", \"requestheadersinserted\", \"responsecodesent\", \"httprequest\", \"labels\", \"captcharesponse\", \"account_id\", \"region\", \"event_hour\", \"__execution_name__\") SELECT \"timestamp\", CAST(FROM_UNIXTIME(\"timestamp\" / 1000) AS timestamp), \"formatversion\", \"webaclid\", SPLIT(\"webaclid\", '/')[3], \"terminatingruleid\", \"terminatingruletype\", \"action\", \"terminatingrulematchdetails\", \"httpsourcename\", \"httpsourceid\", \"rulegrouplist\", \"ratebasedrulelist\", \"nonterminatingmatchingrules\", \"requestheadersinserted\", \"responsecodesent\", \"httprequest\", \"labels\", \"captcharesponse\", SPLIT(\"webaclid\", ':')[5], SPLIT(\"webaclid\", ':')[4], DATE_FORMAT(CAST(FROM_UNIXTIME(\"timestamp\" / 1000) AS timestamp), '%Y%m%d%H'), '{}' FROM \"tmp\".\"waf{}\";",
                    "aggregate": [
                        "INSERT INTO \"centralized\".\"waf_metrics\" (\"time\", \"timestamp\", \"action\", \"webaclid\", \"webaclname\", \"terminatingruleid\", \"terminatingruletype\", \"httpsourceid\", \"httpmethod\", \"country\", \"clientip\", \"uri\", \"first_label\", \"requests\", \"account_id\", \"region\", \"event_hour\", \"__execution_name__\") SELECT FLOOR(\"time\" / 60000) * 60000, DATE_TRUNC('minute', \"timestamp\"), \"action\", \"webaclid\", \"webaclname\", \"terminatingruleid\", \"terminatingruletype\", \"httpsourceid\", \"httprequest\".\"httpmethod\", \"httprequest\".\"country\", \"httprequest\".\"clientip\", \"httprequest\".\"uri\", CASE WHEN labels = ARRAY[] THEN '' ELSE labels[1].name END, CAST(COUNT(1) AS bigint), \"account_id\", \"region\", \"event_hour\", \"__execution_name__\" FROM \"centralized\".\"waf\" WHERE __execution_name__ = '{}' GROUP BY FLOOR(\"time\" / 60000) * 60000, DATE_TRUNC('minute', \"timestamp\"), \"action\", \"webaclid\", \"webaclname\", \"terminatingruleid\", \"terminatingruletype\", \"httpsourceid\", \"httprequest\".\"httpmethod\", \"httprequest\".\"country\", \"httprequest\".\"clientip\", \"httprequest\".\"uri\", CASE WHEN labels = ARRAY[] THEN '' ELSE labels[1].name END, \"account_id\", \"region\", \"event_hour\", \"__execution_name__\";"                    ]
                    }
                },
                "notification": {
                    "service": self.notification_service,
                    "recipients": self.recipients.split(',')
                }
            }
        }
        assert response['Target']['RoleArn'] == self.log_processor_start_execution_role
        
        response = AWS_SCHEDULER.get_schedule(name='LogMerger', group_name=pipeline_id)
        assert response['Arn'] == f'arn:aws:scheduler:{self.aws_region}:{self.account_id}:schedule/{pipeline_id}/LogMerger'
        assert response['FlexibleTimeWindow'] == {'Mode': 'FLEXIBLE', 'MaximumWindowInMinutes': 30}
        assert response['GroupName'] == pipeline_id
        assert response['ScheduleExpression'] == self.merger_schedule
        assert response['State'] == 'ENABLED'
        assert response['Target']['Arn'] == self.log_merger_arn
        
        assert json.loads(response['Target']['Input']) == {
            "metadata": {
                "pipelineId": pipeline_id,
                "sourceType": "waf",
                "scheduleType": "LogMerger",
                "s3": {
                    "srcPath": f"s3://{centralized_bucket_name}/{self.centralized_bucket_prefix}/{self.centralized_database}/{self.table_name}",
                    "archivePath": f"s3://{self.staging_bucket_name}/archive/{self.centralized_bucket_prefix}/{self.centralized_database}/{self.table_name}"
                },
                "athena": {
                    "firstPartitionKey": "event_hour",
                    "partitionInfo": {
                        "event_hour": {
                            "type": "time",
                            "from": "%Y%m%d%H",
                            "to": "%Y%m%d00"
                        },
                        "account_id": {
                            "type": "retain"
                        },
                        "region": {
                            "type": "retain"
                        },
                        "__execution_name__": {
                            "type": "default",
                            "value": "00000000-0000-0000-0000-000000000000"
                        }
                    },
                    "intervalDays": int(-self.merger_age),
                    "database": self.centralized_database,
                    "tableName": self.table_name
                },
                "notification": {
                    "service": self.notification_service,
                    "recipients": self.recipients.split(',')
                }
            }
        }
        assert response['Target']['RoleArn'] == self.log_merger_start_execution_role
        
        response = AWS_SCHEDULER.get_schedule(name='LogMergerForMetrics', group_name=pipeline_id)
        assert response['Arn'] == f'arn:aws:scheduler:{self.aws_region}:{self.account_id}:schedule/{pipeline_id}/LogMergerForMetrics'
        assert response['FlexibleTimeWindow'] == {'Mode': 'FLEXIBLE', 'MaximumWindowInMinutes': 30}
        assert response['GroupName'] == pipeline_id
        assert response['ScheduleExpression'] == self.merger_schedule
        assert response['State'] == 'ENABLED'
        assert response['Target']['Arn'] == self.log_merger_arn
        
        assert json.loads(response['Target']['Input']) == {
            "metadata": {
                "pipelineId": pipeline_id,
                "sourceType": "waf",
                "scheduleType": "LogMergerForMetrics",
                "s3": {
                    "srcPath": f"s3://{centralized_bucket_name}/{self.centralized_bucket_prefix}/{self.centralized_database}/{self.table_name}_metrics",
                    "archivePath": f"s3://{self.staging_bucket_name}/archive/{self.centralized_bucket_prefix}/{self.centralized_database}/{self.table_name}_metrics"
                },
                "athena": {
                    "firstPartitionKey": "event_hour",
                    "partitionInfo": {
                        "event_hour": {
                            "type": "time",
                            "from": "%Y%m%d%H",
                            "to": "%Y%m%d00"
                        },
                        "account_id": {
                            "type": "retain"
                        },
                        "region": {
                            "type": "retain"
                        },
                        "__execution_name__": {
                            "type": "default",
                            "value": "00000000-0000-0000-0000-000000000000"
                        }
                    },
                    "intervalDays": int(-self.merger_age),
                    "database": self.centralized_database,
                    "tableName": f"{self.table_name}_metrics",
                },
                "notification": {
                    "service": self.notification_service,
                    "recipients": self.recipients.split(',')
                }
            }
        }
        assert response['Target']['RoleArn'] == self.log_merger_start_execution_role
        
        response = AWS_SCHEDULER.get_schedule(name='LogArchive', group_name=pipeline_id)
        assert response['Arn'] == f'arn:aws:scheduler:{self.aws_region}:{self.account_id}:schedule/{pipeline_id}/LogArchive'
        assert response['FlexibleTimeWindow'] == {'Mode': 'FLEXIBLE', 'MaximumWindowInMinutes': 30}
        assert response['GroupName'] == pipeline_id
        assert response['ScheduleExpression'] == self.archive_schedule
        assert response['State'] == 'ENABLED'
        assert response['Target']['Arn'] == self.log_archive_arn
        
        assert json.loads(response['Target']['Input']) == {
            "metadata": {
                "pipelineId": pipeline_id,
                "sourceType": "waf",
                "scheduleType": "LogArchive",
                "s3": {
                    "srcPath": f"s3://{centralized_bucket_name}/{self.centralized_bucket_prefix}/{self.centralized_database}/{self.table_name}",
                    "archivePath": f"s3://{self.staging_bucket_name}/archive/{self.centralized_bucket_prefix}/{self.centralized_database}/{self.table_name}"
                },
                "athena": {
                    'firstPartitionKey': 'event_hour',
                    "intervalDays": int(-self.archive_age),
                    "database": self.centralized_database,
                    "tableName": self.table_name,
                },
                "notification": {
                    "service": self.notification_service,
                    "recipients": self.recipients.split(',')
                }
            }
        }
        assert response['Target']['RoleArn'] == self.log_archive_start_execution_role
        
        response = AWS_SCHEDULER.get_schedule(name='LogArchiveForMetrics', group_name=pipeline_id)
        assert response['Arn'] == f'arn:aws:scheduler:{self.aws_region}:{self.account_id}:schedule/{pipeline_id}/LogArchiveForMetrics'
        assert response['FlexibleTimeWindow'] == {'Mode': 'FLEXIBLE', 'MaximumWindowInMinutes': 30}
        assert response['GroupName'] == pipeline_id
        assert response['ScheduleExpression'] == self.archive_schedule
        assert response['State'] == 'ENABLED'
        assert response['Target']['Arn'] == self.log_archive_arn
        
        assert json.loads(response['Target']['Input']) == {
            "metadata": {
                "pipelineId": pipeline_id,
                "sourceType": "waf",
                "scheduleType": "LogArchiveForMetrics",
                "s3": {
                    "srcPath": f"s3://{centralized_bucket_name}/{self.centralized_bucket_prefix}/{self.centralized_database}/{self.table_name}_metrics",
                    "archivePath": f"s3://{self.staging_bucket_name}/archive/{self.centralized_bucket_prefix}/{self.centralized_database}/{self.table_name}_metrics"
                },
                "athena": {
                    'firstPartitionKey': 'event_hour',
                    "intervalDays": int(-self.archive_age),
                    "database": self.centralized_database,
                    "tableName": f"{self.table_name}_metrics",
                },
                "notification": {
                    "service": self.notification_service,
                    "recipients": self.recipients.split(',')
                }
            }
        }
        assert response['Target']['RoleArn'] == self.log_archive_start_execution_role
        
        response = AWS_IAM.get_policy_document(arn=self.s3_public_access_policy_arn)
        assert response['Document']['Statement'] == [
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
                        "s3:DeleteObject"
                    ],
                    "Resource": [
                        f"arn:aws:s3:::{self.staging_bucket_name}",
                        f"arn:aws:s3:::{self.staging_bucket_name}/*"
                    ],
                    "Effect": "Allow"
                },
            {
                'Sid': 'S3AccessPolicyForDestination',
                'Action': [
                    's3:ListBucket', 
                    's3:ListBucketMultipartUploads', 
                    's3:ListMultipartUploadParts', 
                    's3:GetObject', 
                    's3:GetBucketLocation', 
                    's3:AbortMultipartUpload', 
                    's3:CreateBucket', 
                    's3:PutObject', 
                    's3:DeleteObject'], 
                'Resource': [
                    f'arn:aws:s3:::{self.logging_bucket_name}', 
                    f'arn:aws:s3:::{self.logging_bucket_name}/*',
                    f'arn:aws:s3:::{self.centralized_bucket_name}/{self.centralized_bucket_prefix}/{self.centralized_database}/waf*',
                    f'arn:aws:s3:::{self.centralized_bucket_name}', 
                    f'arn:aws:s3:::{self.centralized_bucket_name}/{self.centralized_bucket_prefix}/{self.centralized_database}/waf_metrics*',
                    ], 
                'Effect': 'Allow',
            }
            ]
        
        pipeline_resource_builder.delete_pipeline()
        
        # test alb log format
        self.sts_role = ''
        self.table_name = 'alb'
        self.centralized_bucket_name = os.environ["CENTRALIZED_BUCKET_NAME"]
        self.notification_service = 'SES'
        self.recipients = 'alejandro_rosalez@example.com,alejandro_rosalez@example.org'
        self.processor_schedule = 'rate(5 minutes)'
        self.merger_schedule = 'cron(0 1 * * ? *)'
        self.archive_schedule = 'cron(0 1 * * ? *)'
        self.merger_age = 3
        self.archive_age = 7
        self.staging_bucket_prefix = 'AWSLogs/ALBLogs'
        
        pipeline_id = str(uuid.uuid4())
        pipeline_info = copy.deepcopy(self.pipeline_info)
        pipeline_info['data']['source']['type'] = 'alb'
        pipeline_info['data']['destination']['table']['name'] = self.table_name
        pipeline_info['data']['destination']['enrichmentPlugins'] = 'geo_ip'
        pipeline_info['data']['notification']['service'] = self.notification_service
        pipeline_info['data']['notification']['recipients'] = self.recipients
        pipeline_info['data']['scheduler']['LogProcessor']['schedule'] = self.processor_schedule
        pipeline_info['data']['scheduler']['LogMerger']['schedule'] = self.merger_schedule
        pipeline_info['data']['scheduler']['LogMerger']['age'] = self.merger_age
        pipeline_info['data']['scheduler']['LogArchive']['schedule'] = self.archive_schedule
        pipeline_info['data']['scheduler']['LogArchive']['age'] = self.archive_age
        pipeline_info['data']['staging']['prefix'] = self.staging_bucket_prefix
        pipeline_event = {'RequestType': 'Create', 'ResourceProperties': {'Resource': 'pipeline', 'Id': pipeline_id}}
        
        AWS_DDB_META.put(meta_name=pipeline_id, item=pipeline_info)
        
        pipeline_parameters = Parameters(pipeline_event)
        pipeline_resource_builder = PipelineResourceBuilder(parameters=pipeline_parameters)
        pipeline_resource_builder.create_pipeline()
        
        response = AWS_GLUE.get_table(database=self.centralized_database, name=self.table_name)
        assert response['Table']['Name'] == self.table_name
        assert response['Table']['DatabaseName'] == self.centralized_database
        assert response['Table']['StorageDescriptor']['Columns'] == [
            {'Name': 'time', 'Type': 'bigint'}, 
            {'Name': 'timestamp', 'Type': 'timestamp'}, 
            {'Name': 'type', 'Type': 'string'}, 
            {'Name': 'client_ip', 'Type': 'string'}, 
            {'Name': 'client_port', 'Type': 'int'}, 
            {'Name': 'target_ip', 'Type': 'string'}, 
            {'Name': 'target_port', 'Type': 'int'},
            {'Name': 'request_processing_time', 'Type': 'double'}, 
            {'Name': 'target_processing_time', 'Type': 'double'}, 
            {'Name': 'response_processing_time', 'Type': 'double'}, 
            {'Name': 'elb_status_code_group', 'Type': 'string'}, 
            {'Name': 'elb_status_code', 'Type': 'int'}, 
            {'Name': 'target_status_code', 'Type': 'string'},
            {'Name': 'received_bytes', 'Type': 'double'}, 
            {'Name': 'sent_bytes', 'Type': 'double'}, 
            {'Name': 'request_verb', 'Type': 'string'}, 
            {'Name': 'request_url', 'Type': 'string'}, 
            {'Name': 'request_host', 'Type': 'string'}, 
            {'Name': 'request_path', 'Type': 'string'}, 
            {'Name': 'request_proto', 'Type': 'string'}, 
            {'Name': 'user_agent', 'Type': 'string'}, 
            {'Name': 'ssl_cipher', 'Type': 'string'}, 
            {'Name': 'ssl_protocol', 'Type': 'string'}, 
            {'Name': 'target_group_arn', 'Type': 'string'}, 
            {'Name': 'trace_id', 'Type': 'string'}, 
            {'Name': 'domain_name', 'Type': 'string'}, 
            {'Name': 'chosen_cert_arn', 'Type': 'string'}, 
            {'Name': 'matched_rule_priority', 'Type': 'string'}, 
            {'Name': 'request_creation_time', 'Type': 'string'}, 
            {'Name': 'actions_executed', 'Type': 'string'}, 
            {'Name': 'redirect_url', 'Type': 'string'}, 
            {'Name': 'lambda_error_reason', 'Type': 'string'}, 
            {'Name': 'target_port_list', 'Type': 'string'}, 
            {'Name': 'target_status_code_list', 'Type': 'string'}, 
            {'Name': 'classification', 'Type': 'string'}, 
            {'Name': 'classification_reason', 'Type': 'string'},
            {'Name': 'enrichment', 'Type': 'struct<geo_iso_code:string,geo_country:string,geo_city:string,geo_location:string,ua_browser:string,ua_browser_version:string,ua_os:string,ua_os_version:string,ua_device:string,ua_category:string>'}
        ]
        assert response['Table']['StorageDescriptor']['Location'] == f's3://{self.centralized_bucket_name}/{self.centralized_bucket_prefix}/{self.centralized_database}/{self.table_name}'
        assert response['Table']['StorageDescriptor']['InputFormat'] == 'org.apache.hadoop.hive.ql.io.parquet.MapredParquetInputFormat'
        assert response['Table']['StorageDescriptor']['OutputFormat'] == 'org.apache.hadoop.hive.ql.io.parquet.MapredParquetOutputFormat'
        assert response['Table']['StorageDescriptor']['Compressed'] is True
        assert response['Table']['StorageDescriptor']['SerdeInfo']['SerializationLibrary'] == 'org.apache.hadoop.hive.ql.io.parquet.serde.ParquetHiveSerDe'
        # assert response['Table']['StorageDescriptor']['SerdeInfo']['Parameters']['serialization.format'] == '1'
        assert response['Table']['PartitionKeys'] == [
            {'Name': 'event_hour', 'Type': 'string'}, 
            {'Name': 'elb', 'Type': 'string'}, 
            {'Name': '__execution_name__', 'Type': 'string'}
            ]
        assert response['Table']['TableType'] == 'EXTERNAL_TABLE'
        assert response['Table']['Parameters'] == {'partition_filtering.enabled': 'true', 'classification': 'parquet', 'has_encrypted_data': 'true'}
        
        response = AWS_GLUE.get_partition_indexes(database=self.centralized_database, table_name=self.table_name)
        assert response['PartitionIndexDescriptorList'] == []
        
        response = AWS_GLUE.get_table(database=self.centralized_database, name=f'{self.table_name}_metrics')
        assert response['Table']['Name'] == f'{self.table_name}_metrics'
        assert response['Table']['DatabaseName'] == self.centralized_database

        assert response['Table']['StorageDescriptor']['Columns'] == [
            {'Name': 'time', 'Type': 'bigint'}, 
            {'Name': 'timestamp', 'Type': 'timestamp'}, 
            {'Name': 'type', 'Type': 'string'}, 
            {'Name': 'client_ip', 'Type': 'string'}, 
            {'Name': 'target_group_arn', 'Type': 'string'}, 
            {'Name': 'target_ip', 'Type': 'string'}, 
            {'Name': 'elb_status_code_group', 'Type': 'string'}, 
            {'Name': 'elb_status_code', 'Type': 'int'}, 
            {'Name': 'request_verb', 'Type': 'string'}, 
            {'Name': 'request_host', 'Type': 'string'}, 
            {'Name': 'request_path', 'Type': 'string'}, 
            {'Name': 'ssl_protocol', 'Type': 'string'}, 
            {'Name': 'user_agent', 'Type': 'string'}, 
            {'Name': 'ua_os', 'Type': 'string'},
            {'Name': 'ua_device', 'Type': 'string'},
            {'Name': 'ua_browser', 'Type': 'string'},
            {'Name': 'ua_category', 'Type': 'string'},
            {'Name': 'geo_iso_code', 'Type': 'string'},
            {'Name': 'geo_country', 'Type': 'string'},
            {'Name': 'geo_city', 'Type': 'string'},
            {'Name': 'received_bytes', 'Type': 'double'}, 
            {'Name': 'sent_bytes', 'Type': 'double'}, 
            {'Name': 'request_processing_time', 'Type': 'double'}, 
            {'Name': 'target_processing_time', 'Type': 'double'}, 
            {'Name': 'response_processing_time', 'Type': 'double'}, 
            {'Name': 'requests', 'Type': 'bigint'}
            ]
        assert response['Table']['StorageDescriptor']['Location'] == f's3://{self.centralized_bucket_name}/{self.centralized_bucket_prefix}/{self.centralized_database}/{self.table_name}_metrics'
        assert response['Table']['StorageDescriptor']['InputFormat'] == 'org.apache.hadoop.hive.ql.io.parquet.MapredParquetInputFormat'
        assert response['Table']['StorageDescriptor']['OutputFormat'] == 'org.apache.hadoop.hive.ql.io.parquet.MapredParquetOutputFormat'
        assert response['Table']['StorageDescriptor']['Compressed'] is True
        assert response['Table']['StorageDescriptor']['SerdeInfo']['SerializationLibrary'] == 'org.apache.hadoop.hive.ql.io.parquet.serde.ParquetHiveSerDe'
        # assert response['Table']['StorageDescriptor']['SerdeInfo']['Parameters']['serialization.format'] == '1'
        assert response['Table']['PartitionKeys'] == [
            {'Name': 'event_hour', 'Type': 'string'},
            {'Name': 'elb', 'Type': 'string'}, 
            {'Name': '__execution_name__', 'Type': 'string'}
            ]
        assert response['Table']['TableType'] == 'EXTERNAL_TABLE'
        assert response['Table']['Parameters'] == {'partition_filtering.enabled': 'true', 'classification': 'parquet', 'has_encrypted_data': 'true'}
        
        response = AWS_GLUE.get_partition_indexes(database=self.centralized_database, table_name=f'{self.table_name}_metrics')
        assert response['PartitionIndexDescriptorList'] == []
        
        response = AWS_SCHEDULER.get_schedule_group(name=pipeline_id)
        assert response['Arn'] == f'arn:aws:scheduler:{self.aws_region}:{self.account_id}:schedule-group/{pipeline_id}'
        
        response = AWS_SCHEDULER.get_schedule(name='LogProcessor', group_name=pipeline_id)
        assert response['Arn'] == f'arn:aws:scheduler:{self.aws_region}:{self.account_id}:schedule/{pipeline_id}/LogProcessor'
        assert response['FlexibleTimeWindow'] == {'Mode': 'OFF'}
        assert response['GroupName'] == pipeline_id
        assert response['ScheduleExpression'] == self.processor_schedule
        assert response['State'] == 'ENABLED'
        assert response['Target']['Arn'] == self.log_processor_arn

        assert json.loads(response['Target']['Input']) == {
            "metadata": {
                "pipelineId": pipeline_id,
                "sourceType": "alb",
                "scheduleType": "LogProcessor",
                "enrichmentPlugins": ["geo_ip"],
                "s3": {
                    "srcPath": f"s3://{self.staging_bucket_name}/AWSLogs/ALBLogs",
                    "archivePath": f"s3://{self.staging_bucket_name}/archive/AWSLogs/ALBLogs"
                },
                "athena": {
                    "tableName": self.table_name,
                    "statements": {
                        "create": "CREATE EXTERNAL TABLE IF NOT EXISTS `tmp`.`alb{}` (`type` string, `time` string, `elb` string, `client_ip` string, `client_port` int, `target_ip` string, `target_port` int, `request_processing_time` double, `target_processing_time` double, `response_processing_time` double, `elb_status_code` int, `target_status_code` string, `received_bytes` double, `sent_bytes` double, `request_verb` string, `request_url` string, `request_proto` string, `user_agent` string, `ssl_cipher` string, `ssl_protocol` string, `target_group_arn` string, `trace_id` string, `domain_name` string, `chosen_cert_arn` string, `matched_rule_priority` string, `request_creation_time` string, `actions_executed` string, `redirect_url` string, `lambda_error_reason` string, `target_port_list` string, `target_status_code_list` string, `classification` string, `classification_reason` string, `enrichment` string)  ROW FORMAT SERDE 'org.apache.hadoop.hive.serde2.RegexSerDe' WITH SERDEPROPERTIES ('input.regex'='([^ ]*) ([^ ]*) ([^ ]*) ([^ ]*):([0-9]*) ([^ ]*)[:-]([0-9]*) ([-.0-9]*) ([-.0-9]*) ([-.0-9]*) (|[-0-9]*) (-|[-0-9]*) ([-0-9]*) ([-0-9]*) \"([^ ]*) (.*) (- |[^ ]*)\" \"([^\"]*)\" ([A-Z0-9-_]+) ([A-Za-z0-9.-]*) ([^ ]*) \"([^\"]*)\" \"([^\"]*)\" \"([^\"]*)\" ([-.0-9]*) ([^ ]*) \"([^\"]*)\" \"([^\"]*)\" \"([^ ]*)\" \"([^s]+?)\" \"([^s]+)\" \"([^ ]*)\" \"([^ ]*)\" ?(.*)') STORED AS INPUTFORMAT 'org.apache.hadoop.mapred.TextInputFormat' OUTPUTFORMAT 'org.apache.hadoop.hive.ql.io.HiveIgnoreKeyTextOutputFormat' LOCATION '{}' ;",
                        "drop": "DROP TABLE IF EXISTS `tmp`.`alb{}`",
                        "insert": "INSERT INTO \"centralized\".\"alb\" (\"time\", \"timestamp\", \"type\", \"elb\", \"client_ip\", \"client_port\", \"target_ip\", \"target_port\", \"request_processing_time\", \"target_processing_time\", \"response_processing_time\", \"elb_status_code_group\", \"elb_status_code\", \"target_status_code\", \"received_bytes\", \"sent_bytes\", \"request_verb\", \"request_url\", \"request_host\", \"request_path\", \"request_proto\", \"user_agent\", \"ssl_cipher\", \"ssl_protocol\", \"target_group_arn\", \"trace_id\", \"domain_name\", \"chosen_cert_arn\", \"matched_rule_priority\", \"request_creation_time\", \"actions_executed\", \"redirect_url\", \"lambda_error_reason\", \"target_port_list\", \"target_status_code_list\", \"classification\", \"classification_reason\", \"enrichment\", \"event_hour\", \"__execution_name__\") SELECT CAST(to_unixtime(from_iso8601_timestamp(\"time\")) * 1000 AS bigint), from_iso8601_timestamp(\"time\"), \"type\", \"elb\", \"client_ip\", \"client_port\", \"target_ip\", \"target_port\", \"request_processing_time\", \"target_processing_time\", \"response_processing_time\", CASE WHEN elb_status_code BETWEEN 100 AND 199 THEN '1xx' WHEN elb_status_code BETWEEN 200 AND 299 THEN '2xx' WHEN elb_status_code BETWEEN 300 AND 399 THEN '3xx' WHEN elb_status_code BETWEEN 400 AND 499 THEN '4xx' WHEN elb_status_code BETWEEN 500 AND 599 THEN '5xx' ELSE '-' END, \"elb_status_code\", \"target_status_code\", \"received_bytes\", \"sent_bytes\", \"request_verb\", \"request_url\", url_extract_host(\"request_url\"), url_extract_path(\"request_url\"), \"request_proto\", \"user_agent\", \"ssl_cipher\", \"ssl_protocol\", \"target_group_arn\", \"trace_id\", \"domain_name\", \"chosen_cert_arn\", \"matched_rule_priority\", \"request_creation_time\", \"actions_executed\", \"redirect_url\", \"lambda_error_reason\", \"target_port_list\", \"target_status_code_list\", \"classification\", \"classification_reason\", CAST(ROW(json_extract_scalar(\"enrichment\", '$.geo_iso_code'), json_extract_scalar(\"enrichment\", '$.geo_country'), json_extract_scalar(\"enrichment\", '$.geo_city'), json_extract_scalar(\"enrichment\", '$.geo_location'), json_extract_scalar(\"enrichment\", '$.ua_browser'), json_extract_scalar(\"enrichment\", '$.ua_browser_version'), json_extract_scalar(\"enrichment\", '$.ua_os'), json_extract_scalar(\"enrichment\", '$.ua_os_version'), json_extract_scalar(\"enrichment\", '$.ua_device'), json_extract_scalar(\"enrichment\", '$.ua_category')) AS ROW(geo_iso_code varchar, geo_country varchar, geo_city varchar, geo_location varchar, ua_browser varchar, ua_browser_version varchar, ua_os varchar, ua_os_version varchar, ua_device varchar, ua_category varchar)), date_format(from_iso8601_timestamp(\"time\"), '%Y%m%d%H'), '{}' FROM \"tmp\".\"alb{}\";",
                        "aggregate": [
                            "INSERT INTO \"centralized\".\"alb_metrics\" (\"time\", \"timestamp\", \"type\", \"elb\", \"client_ip\", \"target_group_arn\", \"target_ip\", \"elb_status_code_group\", \"elb_status_code\", \"request_verb\", \"request_host\", \"request_path\", \"ssl_protocol\", \"user_agent\", \"ua_os\", \"ua_device\", \"ua_browser\", \"ua_category\", \"geo_iso_code\", \"geo_country\", \"geo_city\", \"received_bytes\", \"sent_bytes\", \"request_processing_time\", \"target_processing_time\", \"response_processing_time\", \"requests\", \"event_hour\", \"__execution_name__\") SELECT FLOOR(\"time\" / 60000) * 60000, DATE_TRUNC('minute', \"timestamp\"), \"type\", \"elb\", \"client_ip\", \"target_group_arn\", \"target_ip\", \"elb_status_code_group\", \"elb_status_code\", \"request_verb\", url_extract_host(\"request_url\"), url_extract_path(\"request_url\"), \"ssl_protocol\", \"user_agent\", \"enrichment\".\"ua_os\", \"enrichment\".\"ua_device\", \"enrichment\".\"ua_browser\", \"enrichment\".\"ua_category\", \"enrichment\".\"geo_iso_code\", \"enrichment\".\"geo_country\", \"enrichment\".\"geo_city\", CAST(SUM(\"received_bytes\") AS DOUBLE), CAST(SUM(\"sent_bytes\") AS DOUBLE), CAST(SUM(\"request_processing_time\") AS DOUBLE), CAST(SUM(\"target_processing_time\") AS DOUBLE), CAST(SUM(\"response_processing_time\") AS DOUBLE), CAST(COUNT(1) AS bigint), \"event_hour\", \"__execution_name__\" FROM \"centralized\".\"alb\" WHERE __execution_name__ = '{}' GROUP BY FLOOR(\"time\" / 60000) * 60000, DATE_TRUNC('minute', \"timestamp\"), \"type\", \"elb\", \"client_ip\", \"target_group_arn\", \"target_ip\", \"elb_status_code_group\", \"elb_status_code\", \"request_verb\", url_extract_host(\"request_url\"), url_extract_path(\"request_url\"), \"ssl_protocol\", \"user_agent\", \"enrichment\".\"ua_os\", \"enrichment\".\"ua_device\", \"enrichment\".\"ua_browser\", \"enrichment\".\"ua_category\", \"enrichment\".\"geo_iso_code\", \"enrichment\".\"geo_country\", \"enrichment\".\"geo_city\", \"event_hour\", \"__execution_name__\";"
                        ]
                    }
                },
                "notification": {
                    "service": self.notification_service,
                    "recipients": self.recipients.split(',')
                }
            }
        }
        assert response['Target']['RoleArn'] == self.log_processor_start_execution_role
        
        response = AWS_SCHEDULER.get_schedule(name='LogMerger', group_name=pipeline_id)
        assert response['Arn'] == f'arn:aws:scheduler:{self.aws_region}:{self.account_id}:schedule/{pipeline_id}/LogMerger'
        assert response['FlexibleTimeWindow'] == {'Mode': 'FLEXIBLE', 'MaximumWindowInMinutes': 30}
        assert response['GroupName'] == pipeline_id
        assert response['ScheduleExpression'] == self.merger_schedule
        assert response['State'] == 'ENABLED'
        assert response['Target']['Arn'] == self.log_merger_arn
        
        assert json.loads(response['Target']['Input']) == {
            "metadata": {
                "pipelineId": pipeline_id,
                "sourceType": "alb",
                "scheduleType": "LogMerger",
                "s3": {
                    "srcPath": f"s3://{self.centralized_bucket_name}/{self.centralized_bucket_prefix}/{self.centralized_database}/{self.table_name}",
                    "archivePath": f"s3://{self.staging_bucket_name}/archive/{self.centralized_bucket_prefix}/{self.centralized_database}/{self.table_name}"
                },
                "athena": {
                    "firstPartitionKey": "event_hour",
                    "partitionInfo": {
                        "event_hour": {
                            "type": "time",
                            "from": "%Y%m%d%H",
                            "to": "%Y%m%d00"
                        },
                        "elb": {
                            "type": "retain"
                        },
                        "__execution_name__": {
                            "type": "default",
                            "value": "00000000-0000-0000-0000-000000000000"
                        }
                    },
                    "intervalDays": int(-self.merger_age),
                    "database": self.centralized_database,
                    "tableName": self.table_name
                },
                "notification": {
                    "service": self.notification_service,
                    "recipients": self.recipients.split(',')
                }
            }
        }
        assert response['Target']['RoleArn'] == self.log_merger_start_execution_role
        
        response = AWS_SCHEDULER.get_schedule(name='LogMergerForMetrics', group_name=pipeline_id)
        assert response['Arn'] == f'arn:aws:scheduler:{self.aws_region}:{self.account_id}:schedule/{pipeline_id}/LogMergerForMetrics'
        assert response['FlexibleTimeWindow'] == {'Mode': 'FLEXIBLE', 'MaximumWindowInMinutes': 30}
        assert response['GroupName'] == pipeline_id
        assert response['ScheduleExpression'] == self.merger_schedule
        assert response['State'] == 'ENABLED'
        assert response['Target']['Arn'] == self.log_merger_arn
        
        assert json.loads(response['Target']['Input']) == {
            "metadata": {
                "pipelineId": pipeline_id,
                "sourceType": "alb",
                "scheduleType": "LogMergerForMetrics",
                "s3": {
                    "srcPath": f"s3://{self.centralized_bucket_name}/{self.centralized_bucket_prefix}/{self.centralized_database}/{self.table_name}_metrics",
                    "archivePath": f"s3://{self.staging_bucket_name}/archive/{self.centralized_bucket_prefix}/{self.centralized_database}/{self.table_name}_metrics"
                },
                "athena": {
                    "firstPartitionKey": "event_hour",
                    "partitionInfo": {
                        "event_hour": {
                            "type": "time",
                            "from": "%Y%m%d%H",
                            "to": "%Y%m%d00"
                        },
                        "elb": {
                            "type": "retain"
                        },
                        "__execution_name__": {
                            "type": "default",
                            "value": "00000000-0000-0000-0000-000000000000"
                        }
                    },
                    "intervalDays": int(-self.merger_age),
                    "database": self.centralized_database,
                    "tableName": f"{self.table_name}_metrics",
                },
                "notification": {
                    "service": self.notification_service,
                    "recipients": self.recipients.split(',')
                }
            }
        }
        assert response['Target']['RoleArn'] == self.log_merger_start_execution_role
        
        response = AWS_SCHEDULER.get_schedule(name='LogArchive', group_name=pipeline_id)
        assert response['Arn'] == f'arn:aws:scheduler:{self.aws_region}:{self.account_id}:schedule/{pipeline_id}/LogArchive'
        assert response['FlexibleTimeWindow'] == {'Mode': 'FLEXIBLE', 'MaximumWindowInMinutes': 30}
        assert response['GroupName'] == pipeline_id
        assert response['ScheduleExpression'] == self.archive_schedule
        assert response['State'] == 'ENABLED'
        assert response['Target']['Arn'] == self.log_archive_arn
        
        assert json.loads(response['Target']['Input']) == {
            "metadata": {
                "pipelineId": pipeline_id,
                "sourceType": "alb",
                "scheduleType": "LogArchive",
                "s3": {
                    "srcPath": f"s3://{self.centralized_bucket_name}/{self.centralized_bucket_prefix}/{self.centralized_database}/{self.table_name}",
                    "archivePath": f"s3://{self.staging_bucket_name}/archive/{self.centralized_bucket_prefix}/{self.centralized_database}/{self.table_name}"
                },
                "athena": {
                    'firstPartitionKey': 'event_hour',
                    "intervalDays": int(-self.archive_age),
                    "database": self.centralized_database,
                    "tableName": self.table_name,
                },
                "notification": {
                    "service": self.notification_service,
                    "recipients": self.recipients.split(',')
                }
            }
        }
        assert response['Target']['RoleArn'] == self.log_archive_start_execution_role
        
        response = AWS_SCHEDULER.get_schedule(name='LogArchiveForMetrics', group_name=pipeline_id)
        assert response['Arn'] == f'arn:aws:scheduler:{self.aws_region}:{self.account_id}:schedule/{pipeline_id}/LogArchiveForMetrics'
        assert response['FlexibleTimeWindow'] == {'Mode': 'FLEXIBLE', 'MaximumWindowInMinutes': 30}
        assert response['GroupName'] == pipeline_id
        assert response['ScheduleExpression'] == self.archive_schedule
        assert response['State'] == 'ENABLED'
        assert response['Target']['Arn'] == self.log_archive_arn
        
        assert json.loads(response['Target']['Input']) == {
            "metadata": {
                "pipelineId": pipeline_id,
                "sourceType": "alb",
                "scheduleType": "LogArchiveForMetrics",
                "s3": {
                    "srcPath": f"s3://{self.centralized_bucket_name}/{self.centralized_bucket_prefix}/{self.centralized_database}/{self.table_name}_metrics",
                    "archivePath": f"s3://{self.staging_bucket_name}/archive/{self.centralized_bucket_prefix}/{self.centralized_database}/{self.table_name}_metrics"
                },
                "athena": {
                    'firstPartitionKey': 'event_hour',
                    "intervalDays": int(-self.archive_age),
                    "database": self.centralized_database,
                    "tableName": f"{self.table_name}_metrics",
                },
                "notification": {
                    "service": self.notification_service,
                    "recipients": self.recipients.split(',')
                }
            }
        }
        assert response['Target']['RoleArn'] == self.log_archive_start_execution_role
        
        response = AWS_IAM.get_policy_document(arn=self.s3_public_access_policy_arn)
        assert response['Document']['Statement'] == [
            {
                'Action': [
                    's3:ListBucket', 
                    's3:ListBucketMultipartUploads', 
                    's3:ListMultipartUploadParts', 
                    's3:GetObject', 
                    's3:GetBucketLocation', 
                    's3:AbortMultipartUpload', 
                    's3:CreateBucket', 
                    's3:PutObject', 
                    's3:DeleteObject'], 
                'Resource': [
                    f'arn:aws:s3:::{self.staging_bucket_name}', 
                    f'arn:aws:s3:::{self.staging_bucket_name}/*'], 
                'Effect': 'Allow'
            }, 
            {
                'Sid': 'S3AccessPolicyForDestination',
                'Effect': 'Allow', 
                'Action': [
                    's3:ListBucket', 
                    's3:ListBucketMultipartUploads', 
                    's3:ListMultipartUploadParts', 
                    's3:GetObject', 
                    's3:GetBucketLocation', 
                    's3:AbortMultipartUpload', 
                    's3:CreateBucket', 
                    's3:PutObject', 
                    's3:DeleteObject'
                    ], 
                'Resource': [
                    f'arn:aws:s3:::{self.logging_bucket_name}', 
                    f'arn:aws:s3:::{self.logging_bucket_name}/*',
                    f'arn:aws:s3:::{self.centralized_bucket_name}/{self.centralized_bucket_prefix}/{self.centralized_database}/waf*',
                    f'arn:aws:s3:::{self.centralized_bucket_name}',
                    f'arn:aws:s3:::{self.centralized_bucket_name}/{self.centralized_bucket_prefix}/{self.centralized_database}/waf_metrics*',
                    f'arn:aws:s3:::{self.centralized_bucket_name}/{self.centralized_bucket_prefix}/{self.centralized_database}/{self.table_name}*',
                    f'arn:aws:s3:::{self.centralized_bucket_name}/{self.centralized_bucket_prefix}/{self.centralized_database}/{self.table_name}_metrics*',
                    ]
                }
            ]
        
        pipeline_resource_builder.delete_pipeline()
        
        # test cloudfront log format
        self.sts_role = ''
        self.table_name = 'cloudfront'
        self.centralized_bucket_name = os.environ["CENTRALIZED_BUCKET_NAME"]
        self.notification_service = 'SES'
        self.recipients = 'alejandro_rosalez@example.com,alejandro_rosalez@example.org'
        self.processor_schedule = 'rate(5 minutes)'
        self.merger_schedule = 'cron(0 1 * * ? *)'
        self.archive_schedule = 'cron(0 1 * * ? *)'
        self.merger_age = 3
        self.archive_age = 7
        self.staging_bucket_prefix = 'AWSLogs/ALBLogs'
        
        pipeline_id = str(uuid.uuid4())
        pipeline_info = copy.deepcopy(self.pipeline_info)
        pipeline_info['data']['source']['type'] = 'cloudfront'
        pipeline_info['data']['destination']['table']['name'] = self.table_name
        pipeline_info['data']['destination']['enrichmentPlugins'] = 'geo_ip,user_agent'
        pipeline_info['data']['notification']['service'] = self.notification_service
        pipeline_info['data']['notification']['recipients'] = self.recipients
        pipeline_info['data']['scheduler']['LogProcessor']['schedule'] = self.processor_schedule
        pipeline_info['data']['scheduler']['LogMerger']['schedule'] = self.merger_schedule
        pipeline_info['data']['scheduler']['LogMerger']['age'] = self.merger_age
        pipeline_info['data']['scheduler']['LogArchive']['schedule'] = self.archive_schedule
        pipeline_info['data']['scheduler']['LogArchive']['age'] = self.archive_age
        pipeline_info['data']['staging']['prefix'] = self.staging_bucket_prefix
        pipeline_event = {'RequestType': 'Create', 'ResourceProperties': {'Resource': 'pipeline', 'Id': pipeline_id}}
        
        AWS_DDB_META.put(meta_name=pipeline_id, item=pipeline_info)
        
        pipeline_parameters = Parameters(pipeline_event)
        pipeline_resource_builder = PipelineResourceBuilder(parameters=pipeline_parameters)
        pipeline_resource_builder.create_pipeline()
        
        response = AWS_GLUE.get_table(database=self.centralized_database, name=self.table_name)
        assert response['Table']['Name'] == self.table_name
        assert response['Table']['DatabaseName'] == self.centralized_database
        assert response['Table']['StorageDescriptor']['Columns'] == [
            {'Name': 'time', 'Type': 'bigint'}, 
            {'Name': 'timestamp', 'Type': 'timestamp'}, 
            {'Name': 'x-edge-location', 'Type': 'string'}, 
            {'Name': 'sc-bytes', 'Type': 'bigint'}, 
            {'Name': 'c-ip', 'Type': 'string'}, 
            {'Name': 'cs-method', 'Type': 'string'}, 
            {'Name': 'cs-uri-stem', 'Type': 'string'}, 
            {'Name': 'sc-status-group', 'Type': 'string'}, 
            {'Name': 'sc-status', 'Type': 'int'}, 
            {'Name': 'cs-referer', 'Type': 'string'}, 
            {'Name': 'cs-user-agent', 'Type': 'string'}, 
            {'Name': 'cs-uri-query', 'Type': 'string'}, 
            {'Name': 'cs-cookie', 'Type': 'string'}, 
            {'Name': 'x-edge-result-type', 'Type': 'string'}, 
            {'Name': 'x-edge-request-id', 'Type': 'string'},
            {'Name': 'x-host-header', 'Type': 'string'}, 
            {'Name': 'cs-protocol', 'Type': 'string'}, 
            {'Name': 'cs-bytes', 'Type': 'bigint'},
            {'Name': 'time-taken-in-second', 'Type': 'int'}, 
            {'Name': 'time-taken', 'Type': 'double'}, 
            {'Name': 'x-forwarded-for', 'Type': 'string'}, 
            {'Name': 'ssl-protocol', 'Type': 'string'}, 
            {'Name': 'ssl-cipher', 'Type': 'string'}, 
            {'Name': 'x-edge-response-result-type', 'Type': 'string'}, 
            {'Name': 'cs-protocol-version', 'Type': 'string'},
            {'Name': 'fle-status', 'Type': 'string'}, 
            {'Name': 'fle-encrypted-fields', 'Type': 'int'}, 
            {'Name': 'c-port', 'Type': 'int'}, 
            {'Name': 'time-to-first-byte', 'Type': 'double'}, 
            {'Name': 'x-edge-detailed-result-type', 'Type': 'string'}, 
            {'Name': 'sc-content-type', 'Type': 'string'}, 
            {'Name': 'sc-content-len', 'Type': 'bigint'}, 
            {'Name': 'sc-range-start', 'Type': 'bigint'}, 
            {'Name': 'sc-range-end', 'Type': 'bigint'}, 
            {'Name': 'hit-cache', 'Type': 'boolean'}, 
            {'Name': 'back-to-origin', 'Type': 'boolean'},
            {'Name': 'enrichment', 'Type': 'struct<geo_iso_code:string,geo_country:string,geo_city:string,geo_location:string,ua_browser:string,ua_browser_version:string,ua_os:string,ua_os_version:string,ua_device:string,ua_category:string>'}
        ]
        assert response['Table']['StorageDescriptor']['Location'] == f's3://{self.centralized_bucket_name}/{self.centralized_bucket_prefix}/{self.centralized_database}/{self.table_name}'
        assert response['Table']['StorageDescriptor']['InputFormat'] == 'org.apache.hadoop.hive.ql.io.parquet.MapredParquetInputFormat'
        assert response['Table']['StorageDescriptor']['OutputFormat'] == 'org.apache.hadoop.hive.ql.io.parquet.MapredParquetOutputFormat'
        assert response['Table']['StorageDescriptor']['Compressed'] is True
        assert response['Table']['StorageDescriptor']['SerdeInfo']['SerializationLibrary'] == 'org.apache.hadoop.hive.ql.io.parquet.serde.ParquetHiveSerDe'
        # assert response['Table']['StorageDescriptor']['SerdeInfo']['Parameters']['serialization.format'] == '1'
        assert response['Table']['PartitionKeys'] == [
            {'Name': 'event_hour', 'Type': 'string'}, 
            {'Name': 'cs-host', 'Type': 'string'}, 
            {'Name': '__execution_name__', 'Type': 'string'}
            ]
        assert response['Table']['TableType'] == 'EXTERNAL_TABLE'
        assert response['Table']['Parameters'] == {'partition_filtering.enabled': 'true', 'classification': 'parquet', 'has_encrypted_data': 'true'}
        
        response = AWS_GLUE.get_partition_indexes(database=self.centralized_database, table_name=self.table_name)
        assert response['PartitionIndexDescriptorList'] == []
        
        response = AWS_GLUE.get_table(database=self.centralized_database, name=f'{self.table_name}_metrics')
        assert response['Table']['Name'] == f'{self.table_name}_metrics'
        assert response['Table']['DatabaseName'] == self.centralized_database

        assert response['Table']['StorageDescriptor']['Columns'] == [
            {'Name': 'time', 'Type': 'bigint'},
            {'Name': 'timestamp', 'Type': 'timestamp'}, 
            {'Name': 'c-ip', 'Type': 'string'}, 
            {'Name': 'cs-method', 'Type': 'string'}, 
            {'Name': 'cs-protocol-version', 'Type': 'string'}, 
            {'Name': 'cs-uri-stem', 'Type': 'string'}, 
            {'Name': 'sc-status-group', 'Type': 'string'}, 
            {'Name': 'sc-status', 'Type': 'int'}, 
            {'Name': 'cs-protocol', 'Type': 'string'}, 
            {'Name': 'time-taken-in-second', 'Type': 'int'}, 
            {'Name': 'ssl-protocol', 'Type': 'string'}, 
            {'Name': 'x-edge-location', 'Type': 'string'},
            {'Name': 'x-edge-result-type', 'Type': 'string'},
            {'Name': 'x-edge-response-result-type', 'Type': 'string'},
            {'Name': 'x-edge-detailed-result-type', 'Type': 'string'}, 
            {'Name': 'hit-cache', 'Type': 'boolean'}, 
            {'Name': 'back-to-origin', 'Type': 'boolean'}, 
            {'Name': 'ua_os', 'Type': 'string'},
            {'Name': 'ua_device', 'Type': 'string'},
            {'Name': 'ua_browser', 'Type': 'string'},
            {'Name': 'ua_category', 'Type': 'string'},
            {'Name': 'geo_iso_code', 'Type': 'string'},
            {'Name': 'geo_country', 'Type': 'string'},
            {'Name': 'geo_city', 'Type': 'string'},
            {'Name': 'time-taken', 'Type': 'double'}, 
            {'Name': 'time-to-first-byte', 'Type': 'double'},
            {'Name': 'cs-bytes', 'Type': 'double'}, 
            {'Name': 'sc-bytes', 'Type': 'double'}, 
            {'Name': 'requests', 'Type': 'bigint'}
            ]
        assert response['Table']['StorageDescriptor']['Location'] == f's3://{self.centralized_bucket_name}/{self.centralized_bucket_prefix}/{self.centralized_database}/{self.table_name}_metrics'
        assert response['Table']['StorageDescriptor']['InputFormat'] == 'org.apache.hadoop.hive.ql.io.parquet.MapredParquetInputFormat'
        assert response['Table']['StorageDescriptor']['OutputFormat'] == 'org.apache.hadoop.hive.ql.io.parquet.MapredParquetOutputFormat'
        assert response['Table']['StorageDescriptor']['Compressed'] is True
        assert response['Table']['StorageDescriptor']['SerdeInfo']['SerializationLibrary'] == 'org.apache.hadoop.hive.ql.io.parquet.serde.ParquetHiveSerDe'
        # assert response['Table']['StorageDescriptor']['SerdeInfo']['Parameters']['serialization.format'] == '1'
        assert response['Table']['PartitionKeys'] == [
            {'Name': 'event_hour', 'Type': 'string'},
            {'Name': 'cs-host', 'Type': 'string'}, 
            {'Name': '__execution_name__', 'Type': 'string'}
            ]
        assert response['Table']['TableType'] == 'EXTERNAL_TABLE'
        assert response['Table']['Parameters'] == {'partition_filtering.enabled': 'true', 'classification': 'parquet', 'has_encrypted_data': 'true'}
        
        response = AWS_GLUE.get_partition_indexes(database=self.centralized_database, table_name=f'{self.table_name}_metrics')
        assert response['PartitionIndexDescriptorList'] == []
        
        response = AWS_SCHEDULER.get_schedule_group(name=pipeline_id)
        assert response['Arn'] == f'arn:aws:scheduler:{self.aws_region}:{self.account_id}:schedule-group/{pipeline_id}'
        
        response = AWS_SCHEDULER.get_schedule(name='LogProcessor', group_name=pipeline_id)
        assert response['Arn'] == f'arn:aws:scheduler:{self.aws_region}:{self.account_id}:schedule/{pipeline_id}/LogProcessor'
        assert response['FlexibleTimeWindow'] == {'Mode': 'OFF'}
        assert response['GroupName'] == pipeline_id
        assert response['ScheduleExpression'] == self.processor_schedule
        assert response['State'] == 'ENABLED'
        assert response['Target']['Arn'] == self.log_processor_arn
        
        assert json.loads(response['Target']['Input']) == {
            "metadata": {
                "pipelineId": pipeline_id,
                "sourceType": "cloudfront",
                "scheduleType": "LogProcessor",
                "enrichmentPlugins": ["geo_ip", "user_agent"],
                "s3": {
                    "srcPath": f"s3://{self.staging_bucket_name}/AWSLogs/ALBLogs",
                    "archivePath": f"s3://{self.staging_bucket_name}/archive/AWSLogs/ALBLogs"
                },
                "athena": {
                    "tableName": self.table_name,
                    "statements": {
                        "create": "CREATE EXTERNAL TABLE IF NOT EXISTS `tmp`.`cloudfront{}` (`date` date, `time` string, `x-edge-location` string, `sc-bytes` bigint, `c-ip` string, `cs-method` string, `cs-host` string, `cs-uri-stem` string, `sc-status` int, `cs-referer` string, `cs-user-agent` string, `cs-uri-query` string, `cs-cookie` string, `x-edge-result-type` string, `x-edge-request-id` string, `x-host-header` string, `cs-protocol` string, `cs-bytes` bigint, `time-taken` double, `x-forwarded-for` string, `ssl-protocol` string, `ssl-cipher` string, `x-edge-response-result-type` string, `cs-protocol-version` string, `fle-status` string, `fle-encrypted-fields` int, `c-port` int, `time-to-first-byte` double, `x-edge-detailed-result-type` string, `sc-content-type` string, `sc-content-len` bigint, `sc-range-start` bigint, `sc-range-end` bigint, `enrichment` string)  ROW FORMAT SERDE 'org.apache.hadoop.hive.serde2.lazy.LazySimpleSerDe' WITH SERDEPROPERTIES ('field.delim'='\t', 'line.delim'='\n') STORED AS INPUTFORMAT 'org.apache.hadoop.mapred.TextInputFormat' OUTPUTFORMAT 'org.apache.hadoop.hive.ql.io.HiveIgnoreKeyTextOutputFormat' LOCATION '{}' TBLPROPERTIES ('skip.header.line.count'='2');",
                        "drop": "DROP TABLE IF EXISTS `tmp`.`cloudfront{}`",
                        "insert": "INSERT INTO \"centralized\".\"cloudfront\" (\"time\", \"timestamp\", \"x-edge-location\", \"sc-bytes\", \"c-ip\", \"cs-method\", \"cs-host\", \"cs-uri-stem\", \"sc-status-group\", \"sc-status\", \"cs-referer\", \"cs-user-agent\", \"cs-uri-query\", \"cs-cookie\", \"x-edge-result-type\", \"x-edge-request-id\", \"x-host-header\", \"cs-protocol\", \"cs-bytes\", \"time-taken-in-second\", \"time-taken\", \"x-forwarded-for\", \"ssl-protocol\", \"ssl-cipher\", \"x-edge-response-result-type\", \"cs-protocol-version\", \"fle-status\", \"fle-encrypted-fields\", \"c-port\", \"time-to-first-byte\", \"x-edge-detailed-result-type\", \"sc-content-type\", \"sc-content-len\", \"sc-range-start\", \"sc-range-end\", \"hit-cache\", \"back-to-origin\", \"enrichment\", \"event_hour\", \"__execution_name__\") SELECT CAST(to_unixtime(from_iso8601_timestamp(concat(CAST(date AS varchar), 'T', \"time\", 'Z'))) * 1000 AS bigint), from_iso8601_timestamp(concat(CAST(\"date\" AS varchar), 'T', \"time\", 'Z')), \"x-edge-location\", \"sc-bytes\", \"c-ip\", \"cs-method\", \"cs-host\", \"cs-uri-stem\", CASE WHEN \"sc-status\" BETWEEN 100 AND 199 THEN '1xx' WHEN \"sc-status\" BETWEEN 200 AND 299 THEN '2xx' WHEN \"sc-status\" BETWEEN 300 AND 399 THEN '3xx' WHEN \"sc-status\" BETWEEN 400 AND 499 THEN '4xx' WHEN \"sc-status\" BETWEEN 500 AND 599 THEN '5xx' ELSE '-' END, \"sc-status\", \"cs-referer\", url_decode(\"cs-user-agent\"), \"cs-uri-query\", \"cs-cookie\", \"x-edge-result-type\", \"x-edge-request-id\", \"x-host-header\", \"cs-protocol\", \"cs-bytes\", cast(floor(\"time-taken\") as integer), \"time-taken\", \"x-forwarded-for\", \"ssl-protocol\", \"ssl-cipher\", \"x-edge-response-result-type\", \"cs-protocol-version\", \"fle-status\", \"fle-encrypted-fields\", \"c-port\", \"time-to-first-byte\", \"x-edge-detailed-result-type\", \"sc-content-type\", \"sc-content-len\", \"sc-range-start\", \"sc-range-end\", CASE WHEN \"x-edge-result-type\" like '%Hit' THEN true ELSE false END, CASE WHEN (\"x-edge-detailed-result-type\" = 'Miss' OR (\"x-edge-detailed-result-type\" like '%Origin%' AND \"x-edge-detailed-result-type\" <> 'OriginShieldHit')) THEN true ELSE false END, CAST(ROW(json_extract_scalar(\"enrichment\", '$.geo_iso_code'), json_extract_scalar(\"enrichment\", '$.geo_country'), json_extract_scalar(\"enrichment\", '$.geo_city'), json_extract_scalar(\"enrichment\", '$.geo_location'), json_extract_scalar(\"enrichment\", '$.ua_browser'), json_extract_scalar(\"enrichment\", '$.ua_browser_version'), json_extract_scalar(\"enrichment\", '$.ua_os'), json_extract_scalar(\"enrichment\", '$.ua_os_version'), json_extract_scalar(\"enrichment\", '$.ua_device'), json_extract_scalar(\"enrichment\", '$.ua_category')) AS ROW(geo_iso_code varchar, geo_country varchar, geo_city varchar, geo_location varchar, ua_browser varchar, ua_browser_version varchar, ua_os varchar, ua_os_version varchar, ua_device varchar, ua_category varchar)), date_format(from_iso8601_timestamp(concat(CAST(\"date\" AS varchar), 'T', \"time\", 'Z')), '%Y%m%d%H'), '{}' FROM \"tmp\".\"cloudfront{}\";",
                        "aggregate": [
                            "INSERT INTO \"centralized\".\"cloudfront_metrics\" (\"time\", \"timestamp\", \"c-ip\", \"cs-method\", \"cs-host\", \"cs-protocol-version\", \"cs-uri-stem\", \"sc-status-group\", \"sc-status\", \"cs-protocol\", \"time-taken-in-second\", \"ssl-protocol\", \"x-edge-location\", \"x-edge-result-type\", \"x-edge-response-result-type\", \"x-edge-detailed-result-type\", \"hit-cache\", \"back-to-origin\", \"ua_os\", \"ua_device\", \"ua_browser\", \"ua_category\", \"geo_iso_code\", \"geo_country\", \"geo_city\", \"time-taken\", \"time-to-first-byte\", \"cs-bytes\", \"sc-bytes\", \"requests\", \"event_hour\", \"__execution_name__\") SELECT FLOOR(\"time\" / 60000) * 60000, DATE_TRUNC('minute', \"timestamp\"), \"c-ip\", \"cs-method\", \"cs-host\", \"cs-protocol-version\", \"cs-uri-stem\", \"sc-status-group\", \"sc-status\", \"cs-protocol\", \"time-taken-in-second\", \"ssl-protocol\", \"x-edge-location\", \"x-edge-result-type\", \"x-edge-response-result-type\", \"x-edge-detailed-result-type\", \"hit-cache\", \"back-to-origin\", \"enrichment\".\"ua_os\", \"enrichment\".\"ua_device\", \"enrichment\".\"ua_browser\", \"enrichment\".\"ua_category\", \"enrichment\".\"geo_iso_code\", \"enrichment\".\"geo_country\", \"enrichment\".\"geo_city\", cast(sum(\"time-taken\") as double), cast(sum(\"time-to-first-byte\") as double), cast(sum(\"cs-bytes\") as double), cast(sum(\"sc-bytes\") as double), cast(count(1) as bigint), \"event_hour\", \"__execution_name__\" FROM \"centralized\".\"cloudfront\" WHERE __execution_name__ = '{}' GROUP BY FLOOR(\"time\" / 60000) * 60000, DATE_TRUNC('minute', \"timestamp\"), \"c-ip\", \"cs-method\", \"cs-host\", \"cs-protocol-version\", \"cs-uri-stem\", \"sc-status-group\", \"sc-status\", \"cs-protocol\", \"time-taken-in-second\", \"ssl-protocol\", \"x-edge-location\", \"x-edge-result-type\", \"x-edge-response-result-type\", \"x-edge-detailed-result-type\", \"hit-cache\", \"back-to-origin\", \"enrichment\".\"ua_os\", \"enrichment\".\"ua_device\", \"enrichment\".\"ua_browser\", \"enrichment\".\"ua_category\", \"enrichment\".\"geo_iso_code\", \"enrichment\".\"geo_country\", \"enrichment\".\"geo_city\", \"event_hour\", \"__execution_name__\";"
                        ]
                    }
                },
                "notification": {
                    "service": self.notification_service,
                    "recipients": self.recipients.split(',')
                }
            }
        }
        assert response['Target']['RoleArn'] == self.log_processor_start_execution_role
        
        response = AWS_SCHEDULER.get_schedule(name='LogMerger', group_name=pipeline_id)
        assert response['Arn'] == f'arn:aws:scheduler:{self.aws_region}:{self.account_id}:schedule/{pipeline_id}/LogMerger'
        assert response['FlexibleTimeWindow'] == {'Mode': 'FLEXIBLE', 'MaximumWindowInMinutes': 30}
        assert response['GroupName'] == pipeline_id
        assert response['ScheduleExpression'] == self.merger_schedule
        assert response['State'] == 'ENABLED'
        assert response['Target']['Arn'] == self.log_merger_arn
        
        assert json.loads(response['Target']['Input']) == {
            "metadata": {
                "pipelineId": pipeline_id,
                "sourceType": "cloudfront",
                "scheduleType": "LogMerger",
                "s3": {
                    "srcPath": f"s3://{self.centralized_bucket_name}/{self.centralized_bucket_prefix}/{self.centralized_database}/{self.table_name}",
                    "archivePath": f"s3://{self.staging_bucket_name}/archive/{self.centralized_bucket_prefix}/{self.centralized_database}/{self.table_name}"
                },
                "athena": {
                    "firstPartitionKey": "event_hour",
                    "partitionInfo": {
                        "event_hour": {
                            "type": "time",
                            "from": "%Y%m%d%H",
                            "to": "%Y%m%d00"
                        },
                        "cs-host": {
                            "type": "retain"
                        },
                        "__execution_name__": {
                            "type": "default",
                            "value": "00000000-0000-0000-0000-000000000000"
                        }
                    },
                    "intervalDays": int(-self.merger_age),
                    "database": self.centralized_database,
                    "tableName": self.table_name
                },
                "notification": {
                    "service": self.notification_service,
                    "recipients": self.recipients.split(',')
                }
            }
        }
        assert response['Target']['RoleArn'] == self.log_merger_start_execution_role
        
        response = AWS_SCHEDULER.get_schedule(name='LogMergerForMetrics', group_name=pipeline_id)
        assert response['Arn'] == f'arn:aws:scheduler:{self.aws_region}:{self.account_id}:schedule/{pipeline_id}/LogMergerForMetrics'
        assert response['FlexibleTimeWindow'] == {'Mode': 'FLEXIBLE', 'MaximumWindowInMinutes': 30}
        assert response['GroupName'] == pipeline_id
        assert response['ScheduleExpression'] == self.merger_schedule
        assert response['State'] == 'ENABLED'
        assert response['Target']['Arn'] == self.log_merger_arn
        
        assert json.loads(response['Target']['Input']) == {
            "metadata": {
                "pipelineId": pipeline_id,
                "sourceType": "cloudfront",
                "scheduleType": "LogMergerForMetrics",
                "s3": {
                    "srcPath": f"s3://{self.centralized_bucket_name}/{self.centralized_bucket_prefix}/{self.centralized_database}/{self.table_name}_metrics",
                    "archivePath": f"s3://{self.staging_bucket_name}/archive/{self.centralized_bucket_prefix}/{self.centralized_database}/{self.table_name}_metrics"
                },
                "athena": {
                    "firstPartitionKey": "event_hour",
                    "partitionInfo": {
                        "event_hour": {
                            "type": "time",
                            "from": "%Y%m%d%H",
                            "to": "%Y%m%d00"
                        },
                        "cs-host": {
                            "type": "retain"
                        },
                        "__execution_name__": {
                            "type": "default",
                            "value": "00000000-0000-0000-0000-000000000000"
                        }
                    },
                    "intervalDays": int(-self.merger_age),
                    "database": self.centralized_database,
                    "tableName": f"{self.table_name}_metrics",
                },
                "notification": {
                    "service": self.notification_service,
                    "recipients": self.recipients.split(',')
                }
            }
        }
        assert response['Target']['RoleArn'] == self.log_merger_start_execution_role
        
        response = AWS_SCHEDULER.get_schedule(name='LogArchive', group_name=pipeline_id)
        assert response['Arn'] == f'arn:aws:scheduler:{self.aws_region}:{self.account_id}:schedule/{pipeline_id}/LogArchive'
        assert response['FlexibleTimeWindow'] == {'Mode': 'FLEXIBLE', 'MaximumWindowInMinutes': 30}
        assert response['GroupName'] == pipeline_id
        assert response['ScheduleExpression'] == self.archive_schedule
        assert response['State'] == 'ENABLED'
        assert response['Target']['Arn'] == self.log_archive_arn
        
        assert json.loads(response['Target']['Input']) == {
            "metadata": {
                "pipelineId": pipeline_id,
                "sourceType": "cloudfront",
                "scheduleType": "LogArchive",
                "s3": {
                    "srcPath": f"s3://{self.centralized_bucket_name}/{self.centralized_bucket_prefix}/{self.centralized_database}/{self.table_name}",
                    "archivePath": f"s3://{self.staging_bucket_name}/archive/{self.centralized_bucket_prefix}/{self.centralized_database}/{self.table_name}"
                },
                "athena": {
                    'firstPartitionKey': 'event_hour',
                    "intervalDays": int(-self.archive_age),
                    "database": self.centralized_database,
                    "tableName": self.table_name,
                },
                "notification": {
                    "service": self.notification_service,
                    "recipients": self.recipients.split(',')
                }
            }
        }
        assert response['Target']['RoleArn'] == self.log_archive_start_execution_role
        
        response = AWS_SCHEDULER.get_schedule(name='LogArchiveForMetrics', group_name=pipeline_id)
        assert response['Arn'] == f'arn:aws:scheduler:{self.aws_region}:{self.account_id}:schedule/{pipeline_id}/LogArchiveForMetrics'
        assert response['FlexibleTimeWindow'] == {'Mode': 'FLEXIBLE', 'MaximumWindowInMinutes': 30}
        assert response['GroupName'] == pipeline_id
        assert response['ScheduleExpression'] == self.archive_schedule
        assert response['State'] == 'ENABLED'
        assert response['Target']['Arn'] == self.log_archive_arn
        
        assert json.loads(response['Target']['Input']) == {
            "metadata": {
                "pipelineId": pipeline_id,
                "sourceType": "cloudfront",
                "scheduleType": "LogArchiveForMetrics",
                "s3": {
                    "srcPath": f"s3://{self.centralized_bucket_name}/{self.centralized_bucket_prefix}/{self.centralized_database}/{self.table_name}_metrics",
                    "archivePath": f"s3://{self.staging_bucket_name}/archive/{self.centralized_bucket_prefix}/{self.centralized_database}/{self.table_name}_metrics"
                },
                "athena": {
                    'firstPartitionKey': 'event_hour',
                    "intervalDays": int(-self.archive_age),
                    "database": self.centralized_database,
                    "tableName": f"{self.table_name}_metrics",
                },
                "notification": {
                    "service": self.notification_service,
                    "recipients": self.recipients.split(',')
                }
            }
        }
        assert response['Target']['RoleArn'] == self.log_archive_start_execution_role
        
        response = AWS_IAM.get_policy_document(arn=self.s3_public_access_policy_arn)
        assert response['Document']['Statement'] == [
            {
                'Action': [
                    's3:ListBucket', 
                    's3:ListBucketMultipartUploads', 
                    's3:ListMultipartUploadParts', 
                    's3:GetObject', 
                    's3:GetBucketLocation', 
                    's3:AbortMultipartUpload', 
                    's3:CreateBucket', 
                    's3:PutObject', 
                    's3:DeleteObject'], 
                'Resource': [
                    f'arn:aws:s3:::{self.staging_bucket_name}', 
                    f'arn:aws:s3:::{self.staging_bucket_name}/*'], 
                'Effect': 'Allow'
            }, 
            {
                'Effect': 'Allow', 
                'Action': [
                    's3:ListBucket', 
                    's3:ListBucketMultipartUploads', 
                    's3:ListMultipartUploadParts', 
                    's3:GetObject', 
                    's3:GetBucketLocation', 
                    's3:AbortMultipartUpload', 
                    's3:CreateBucket', 
                    's3:PutObject', 
                    's3:DeleteObject'
                    ], 
                'Resource': [
                    f'arn:aws:s3:::{self.logging_bucket_name}', 
                    f'arn:aws:s3:::{self.logging_bucket_name}/*',
                    f'arn:aws:s3:::{self.centralized_bucket_name}/{self.centralized_bucket_prefix}/{self.centralized_database}/waf*',
                    f'arn:aws:s3:::{self.centralized_bucket_name}',
                    f'arn:aws:s3:::{self.centralized_bucket_name}/{self.centralized_bucket_prefix}/{self.centralized_database}/waf_metrics*',
                    f'arn:aws:s3:::{self.centralized_bucket_name}/{self.centralized_bucket_prefix}/{self.centralized_database}/{self.table_name}*',
                    f'arn:aws:s3:::{self.centralized_bucket_name}/{self.centralized_bucket_prefix}/{self.centralized_database}/{self.table_name}_metrics*',
                    ], 
                'Sid': 'S3AccessPolicyForDestination'
                }
            ]

        pipeline_resource_builder.delete_pipeline()
        
        # test sns notification
        notification_service = 'SNS'
        send_template_email_sns_public_policy_arn = os.environ["SEND_TEMPLATE_EMAIL_SNS_PUBLIC_POLICY_ARN"]
        receive_failed_topic_arn = os.environ['RECEIVE_STATES_FAILED_TOPIC_ARN']
        
        pipeline_id = str(uuid.uuid4())
        pipeline_info = copy.deepcopy(self.pipeline_info)
        pipeline_info['data']['notification']['service'] = notification_service
        pipeline_info['data']['notification']['recipients'] = receive_failed_topic_arn
        pipeline_event = {'RequestType': 'Create', 'ResourceProperties': {'Resource': 'pipeline', 'Id': pipeline_id}}
        
        AWS_DDB_META.put(meta_name=pipeline_id, item=pipeline_info)
        
        pipeline_parameters = Parameters(pipeline_event)
        pipeline_resource_builder = PipelineResourceBuilder(parameters=pipeline_parameters)
        pipeline_resource_builder.create_pipeline()
        
        assert AWS_IAM.get_policy_document(arn=send_template_email_sns_public_policy_arn, sid=pipeline_parameters.policy_sid)['Document'] == {
            'Statement': [
                {
                    'Action': 'SNS:Publish', 
                    'Effect': 'Allow', 
                    'Resource': receive_failed_topic_arn, 
                    'Sid': pipeline_id.replace('-', '')
                    }
                ], 
            'Version': '2012-10-17'
            }
        
        pipeline_id = str(uuid.uuid4())
        pipeline_info = copy.deepcopy(self.pipeline_info)
        pipeline_info['data']['notification']['service'] = notification_service
        pipeline_info['data']['notification']['recipients'] = 'arn:aws:iam::123456789012:policy/not-a-sns-arn'
        pipeline_event = {'RequestType': 'Create', 'ResourceProperties': {'Resource': 'pipeline', 'Id': pipeline_id}}
        
        AWS_DDB_META.put(meta_name=pipeline_id, item=pipeline_info)
        
        pipeline_parameters = Parameters(pipeline_event)
        pipeline_resource_builder = PipelineResourceBuilder(parameters=pipeline_parameters)
        pipeline_resource_builder.create_pipeline()
        
        assert AWS_IAM.get_policy_document(arn=send_template_email_sns_public_policy_arn, sid=pipeline_parameters.policy_sid)['Document']['Statement'] == []
        
    def test_delete_pipeline(self, httpserver: HTTPServer, mock_iam_context, mock_s3_context, mock_sqs_context, mock_ddb_context, mock_glue_context, mock_sns_context, mock_events_context, mock_scheduler_context):
        from pipeline_resources_builder.lambda_function import PipelineResourceBuilder, Parameters, MetaTable, EventsClient, SchedulerClient, GlueClient, IAMClient, SQSClient, S3Client
        from botocore.errorfactory import ClientError
        
        self.init_default_parameter(httpserver, mock_iam_context, mock_s3_context, mock_sqs_context, mock_ddb_context, mock_glue_context, mock_scheduler_context)
        
        AWS_DDB_META = MetaTable()
        AWS_EVENTS = EventsClient()
        AWS_SCHEDULER = SchedulerClient()
        AWS_GLUE = GlueClient()
        AWS_IAM = IAMClient()
        AWS_SQS = SQSClient()
        AWS_S3 = S3Client()
        
        # test do not exists pipeline
        pipeline_event = {'RequestType': 'Create', 'ResourceProperties': {'Resource': 'pipeline', 'Id':'do-not-exists'}}
        parameters = Parameters(pipeline_event)
        pipeline_resource_builder = PipelineResourceBuilder(parameters=parameters)
        assert pipeline_resource_builder.delete_pipeline() is None
        
        # test delete a pipelie have ingestion
        pipeline_id = str(uuid.uuid4())
        pipeline_info = copy.deepcopy(self.pipeline_info)
        ingestion_id = str(uuid.uuid4())
        ingestion_info = copy.deepcopy(self.ingestion_info)
        ingestion_info['pipelineId'] = pipeline_id
        create_pipeline_event = copy.deepcopy(self.pipeline_event)
        create_pipeline_event['ResourceProperties']['Id'] = pipeline_id
        delete_pipeline_event = {'RequestType': 'Delete', 'ResourceProperties': {'Resource': 'pipeline', 'Id': pipeline_id}}
        delete_pipeline_event['ResourceProperties']['Id'] = pipeline_id
        create_ingestion_event = copy.deepcopy(self.ingestion_event)
        create_ingestion_event['ResourceProperties']['Id'] = ingestion_id
        AWS_DDB_META.put(meta_name=pipeline_id, item=pipeline_info)
        AWS_DDB_META.put(meta_name=ingestion_id, item=ingestion_info)
        
        PipelineResourceBuilder(parameters=Parameters(create_pipeline_event)).create_pipeline()
        PipelineResourceBuilder(parameters=Parameters(create_ingestion_event)).create_ingestion()
        PipelineResourceBuilder(parameters=Parameters(delete_pipeline_event)).delete_pipeline()
        
        assert AWS_DDB_META.get(meta_name=pipeline_id) is None
        assert AWS_DDB_META.get(meta_name=ingestion_id) is None
        
        response = AWS_GLUE.get_table(database=self.centralized_database, name=self.table_name)
        assert response == {}

        response = AWS_GLUE.get_table(database=self.centralized_database, name=f'{self.table_name}_metrics')
        assert response == {}
        
        response = AWS_SCHEDULER.get_schedule_group(name=pipeline_id)
        assert response == {}
        
        response = AWS_EVENTS._events_client.list_rules(NamePrefix=f'LogProcessor-{self.table_name}', EventBusName='default')
        assert response['Rules'] == []
        
        response = AWS_EVENTS._events_client.list_rules(NamePrefix=f'LogMerger-{self.table_name}', EventBusName='default')
        assert response['Rules'] == []
        
        response = AWS_EVENTS._events_client.list_rules(NamePrefix=f'LogMergerForMetrics-{self.table_name}', EventBusName='default')
        assert response['Rules'] == []
        
        response = AWS_EVENTS._events_client.list_rules(NamePrefix=f'LogArchive-{self.table_name}', EventBusName='default')
        assert response['Rules'] == []
        
        response = AWS_EVENTS._events_client.list_rules(NamePrefix=f'LogArchiveForMetrics-{self.table_name}', EventBusName='default')
        assert response['Rules'] == []
        
        response = AWS_IAM.get_policy_document(arn=self.s3_public_access_policy_arn)
        assert response['Document']['Statement'] == [
            {
                'Action': [
                    's3:ListBucket', 
                    's3:ListBucketMultipartUploads', 
                    's3:ListMultipartUploadParts', 
                    's3:GetObject', 
                    's3:GetBucketLocation', 
                    's3:AbortMultipartUpload', 
                    's3:CreateBucket', 
                    's3:PutObject', 
                    's3:DeleteObject'], 
                'Resource': [
                    f'arn:aws:s3:::{self.staging_bucket_name}', 
                    f'arn:aws:s3:::{self.staging_bucket_name}/*'], 
                'Effect': 'Allow'
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
                        "s3:DeleteObject"
                    ],
                    "Resource": [
                        f"arn:aws:s3:::{self.logging_bucket_name}",
                        f"arn:aws:s3:::{self.logging_bucket_name}/*"
                    ],
                    "Effect": "Allow"
                }
            ]
        
        replication_sqs_url = AWS_SQS.get_queue_url(name=self.replication_sqs_name)
            
        response = AWS_SQS.get_queue_policy(url=replication_sqs_url)
        assert response['Statement'] == []
        
        replication_dlq_url = AWS_SQS.get_queue_url(name=self.replication_dlq_name)
        response = AWS_SQS.get_queue_policy(url=replication_dlq_url)
        assert response['Statement'] == []

        response = AWS_S3.get_bucket_policy(bucket=self.logging_bucket_name)
        assert response['Statement'] == []
        
        response = AWS_S3.get_bucket_notification(bucket=self.logging_bucket_name)
        assert response == {}
        
        # test import_dashboards is True
        pipeline_id = str(uuid.uuid4())
        pipeline_info = copy.deepcopy(self.pipeline_info)
        pipeline_info['data']['grafana']['importDashboards'] = 'true'
        pipeline_info['data']['grafana']['url'] = httpserver.url_for('')
        pipeline_info['data']['grafana']['token'] = 'glsa_123456789012'
        
        pipeline_event = {'RequestType': 'Create', 'ResourceProperties': {'Resource': 'pipeline', 'Id': pipeline_id}}
        AWS_DDB_META.put(meta_name=pipeline_id, item=pipeline_info)
        parameters = Parameters(pipeline_event)
        pipeline_resource_builder = PipelineResourceBuilder(parameters=parameters)
        
        httpserver.expect_oneshot_request(uri=f'/api/dashboards/uid/{pipeline_id}-00', method='DELETE').respond_with_data(response_data=json.dumps({'id': 17, 'message': 'Dashboard Production Overview deleted', 'title': 'Production Overview'}))
        httpserver.expect_oneshot_request(uri=f'/api/dashboards/uid/{pipeline_id}-01', method='DELETE').respond_with_data(response_data=json.dumps({'id': 18, 'message': 'Dashboard Production Overview deleted', 'title': 'Production Overview'}))
        
        pipeline_resource_builder.delete_pipeline()
        
        # test schedule_service is events
        self.sts_role = ''
        self.table_name = 'waf'
        self.notification_service = 'SES'
        self.recipients = 'alejandro_rosalez@example.com,alejandro_rosalez@example.org'
        self.processor_schedule = 'rate(5 minutes)'
        self.merger_schedule = 'cron(0 1 * * ? *)'
        self.archive_schedule = 'cron(0 1 * * ? *)'
        self.merger_age = 3
        self.archive_age = 7
        self.staging_bucket_prefix = 'AWSLogs/WAFLogs'
        
        pipeline_id = str(uuid.uuid4())
        pipeline_info = copy.deepcopy(self.pipeline_info)
        pipeline_info['data']['source']['type'] = 'waf'
        pipeline_info['data']['destination']['table']['name'] = self.table_name
        pipeline_info['data']['notification']['service'] = self.notification_service
        pipeline_info['data']['notification']['recipients'] = self.recipients
        pipeline_info['data']['scheduler']['service'] = 'events'
        pipeline_info['data']['scheduler']['LogProcessor']['schedule'] = self.processor_schedule
        pipeline_info['data']['scheduler']['LogMerger']['schedule'] = self.merger_schedule
        pipeline_info['data']['scheduler']['LogMerger']['age'] = self.merger_age
        pipeline_info['data']['scheduler']['LogArchive']['schedule'] = self.archive_schedule
        pipeline_info['data']['scheduler']['LogArchive']['age'] = self.archive_age
        pipeline_info['data']['staging']['prefix'] = self.staging_bucket_prefix
        pipeline_event = {'RequestType': 'Create', 'ResourceProperties': {'Resource': 'pipeline', 'Id': pipeline_id}}
        
        AWS_DDB_META.put(meta_name='AvailableServices', item={'value': ['events']})
        AWS_DDB_META.put(meta_name=pipeline_id, item=pipeline_info)
        
        parameters = Parameters(pipeline_event)
        pipeline_resource_builder = PipelineResourceBuilder(parameters=parameters)
        pipeline_resource_builder.create_pipeline()
        pipeline_resource_builder.delete_pipeline()
        
        response = AWS_GLUE.get_table(database=self.centralized_database, name=self.table_name)
        assert response == {}

        response = AWS_GLUE.get_table(database=self.centralized_database, name=f'{self.table_name}_metrics')
        assert response == {}
        
        response = AWS_SCHEDULER.get_schedule_group(name=pipeline_id)
        assert response == {}
        
        response = AWS_EVENTS._events_client.list_rules(NamePrefix=f'LogProcessor-{self.pipeline_parameters.pipeline_info.destination.table.name}', EventBusName='default')
        assert response['Rules'] == []
        
        response = AWS_EVENTS._events_client.list_rules(NamePrefix=f'LogMerger-{self.pipeline_parameters.pipeline_info.destination.table.name}', EventBusName='default')
        assert response['Rules'] == []
        
        response = AWS_EVENTS._events_client.list_rules(NamePrefix=f'LogMergerForMetrics-{self.pipeline_parameters.pipeline_info.destination.table.name}', EventBusName='default')
        assert response['Rules'] == []
        
        response = AWS_EVENTS._events_client.list_rules(NamePrefix=f'LogArchive-{self.pipeline_parameters.pipeline_info.destination.table.name}', EventBusName='default')
        assert response['Rules'] == []
        
        response = AWS_EVENTS._events_client.list_rules(NamePrefix=f'LogArchiveForMetrics-{self.pipeline_parameters.pipeline_info.destination.table.name}', EventBusName='default')
        assert response['Rules'] == []
        
        response = AWS_IAM.get_policy_document(arn=self.s3_public_access_policy_arn)
        assert response['Document']['Statement'] == [
            {
                'Action': [
                    's3:ListBucket', 
                    's3:ListBucketMultipartUploads', 
                    's3:ListMultipartUploadParts', 
                    's3:GetObject', 
                    's3:GetBucketLocation', 
                    's3:AbortMultipartUpload', 
                    's3:CreateBucket', 
                    's3:PutObject', 
                    's3:DeleteObject'], 
                'Resource': [
                    f'arn:aws:s3:::{self.staging_bucket_name}', 
                    f'arn:aws:s3:::{self.staging_bucket_name}/*'], 
                'Effect': 'Allow'
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
                        "s3:DeleteObject"
                    ],
                    "Resource": [
                        f"arn:aws:s3:::{self.logging_bucket_name}",
                        f"arn:aws:s3:::{self.logging_bucket_name}/*"
                    ],
                    "Effect": "Allow"
                }
            ]
        
        # test waf log format
        self.sts_role = ''
        self.table_name = 'waf'
        self.notification_service = 'SES'
        self.recipients = 'alejandro_rosalez@example.com,alejandro_rosalez@example.org'
        self.processor_schedule = 'rate(5 minutes)'
        self.merger_schedule = 'cron(0 1 * * ? *)'
        self.archive_schedule = 'cron(0 1 * * ? *)'
        self.merger_age = 3
        self.archive_age = 7
        self.staging_bucket_prefix = 'AWSLogs/WAFLogs'
        
        pipeline_id = str(uuid.uuid4())
        pipeline_info = copy.deepcopy(self.pipeline_info)
        pipeline_info['data']['source']['type'] = 'waf'
        pipeline_info['data']['destination']['table']['name'] = self.table_name
        pipeline_info['data']['notification']['service'] = self.notification_service
        pipeline_info['data']['notification']['recipients'] = self.recipients
        pipeline_info['data']['scheduler']['LogProcessor']['schedule'] = self.processor_schedule
        pipeline_info['data']['scheduler']['LogMerger']['schedule'] = self.merger_schedule
        pipeline_info['data']['scheduler']['LogMerger']['age'] = self.merger_age
        pipeline_info['data']['scheduler']['LogArchive']['schedule'] = self.archive_schedule
        pipeline_info['data']['scheduler']['LogArchive']['age'] = self.archive_age
        pipeline_info['data']['staging']['prefix'] = self.staging_bucket_prefix
        pipeline_event = {'RequestType': 'Create', 'ResourceProperties': {'Resource': 'pipeline', 'Id': pipeline_id}}
        
        AWS_DDB_META.put(meta_name=pipeline_id, item=pipeline_info)
        
        parameters = Parameters(pipeline_event)
        pipeline_resource_builder = PipelineResourceBuilder(parameters=parameters)
        pipeline_resource_builder.create_pipeline()
        pipeline_resource_builder.delete_pipeline()
        
        response = AWS_GLUE.get_table(database=self.centralized_database, name=self.table_name)
        assert response == {}

        response = AWS_GLUE.get_table(database=self.centralized_database, name=f'{self.table_name}_metrics')
        assert response == {}
        
        response = AWS_SCHEDULER.get_schedule_group(name=pipeline_id)
        assert response == {}

        response = AWS_SCHEDULER.get_schedule(name='LogProcessor', group_name=pipeline_id)
        assert response == {}
        
        response = AWS_SCHEDULER.get_schedule(name='LogMerger', group_name=pipeline_id)
        assert response == {}
        
        response = AWS_SCHEDULER.get_schedule(name='LogMergerForMetrics', group_name=pipeline_id)
        assert response == {}
        
        response = AWS_SCHEDULER.get_schedule(name='LogArchive', group_name=pipeline_id)
        assert response == {}
        
        response = AWS_SCHEDULER.get_schedule(name='LogArchiveForMetrics', group_name=pipeline_id)
        assert response == {}
        
        response = AWS_IAM.get_policy_document(arn=self.s3_public_access_policy_arn)
        assert response['Document']['Statement'] == [
            {
                'Action': [
                    's3:ListBucket', 
                    's3:ListBucketMultipartUploads', 
                    's3:ListMultipartUploadParts', 
                    's3:GetObject', 
                    's3:GetBucketLocation', 
                    's3:AbortMultipartUpload', 
                    's3:CreateBucket', 
                    's3:PutObject', 
                    's3:DeleteObject'], 
                'Resource': [
                    f'arn:aws:s3:::{self.staging_bucket_name}', 
                    f'arn:aws:s3:::{self.staging_bucket_name}/*'], 
                'Effect': 'Allow'
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
                        "s3:DeleteObject"
                    ],
                    "Resource": [
                        f"arn:aws:s3:::{self.logging_bucket_name}",
                        f"arn:aws:s3:::{self.logging_bucket_name}/*"
                    ],
                    "Effect": "Allow"
                }
            ]

        # repeat delete
        AWS_DDB_META.put(meta_name=pipeline_id, item=pipeline_info)
        pipeline_resource_builder.delete_pipeline()
        
        response = AWS_GLUE.get_table(database=self.centralized_database, name=self.table_name)
        assert response == {}

        response = AWS_GLUE.get_table(database=self.centralized_database, name=f'{self.table_name}_metrics')
        assert response == {}

        response = AWS_SCHEDULER.get_schedule_group(name=pipeline_id)
        assert response == {}

        response = AWS_SCHEDULER.get_schedule(name='LogProcessor', group_name=pipeline_id)
        assert response == {}
        
        response = AWS_SCHEDULER.get_schedule(name='LogMerger', group_name=pipeline_id)
        assert response == {}
        
        response = AWS_SCHEDULER.get_schedule(name='LogMergerForMetrics', group_name=pipeline_id)
        assert response == {}
        
        response = AWS_SCHEDULER.get_schedule(name='LogArchive', group_name=pipeline_id)
        assert response == {}
        
        response = AWS_SCHEDULER.get_schedule(name='LogArchiveForMetrics', group_name=pipeline_id)
        assert response == {}
        
        response = AWS_IAM.get_policy_document(arn=self.s3_public_access_policy_arn)
        assert response['Document']['Statement'] == [
            {
                'Action': [
                    's3:ListBucket', 
                    's3:ListBucketMultipartUploads', 
                    's3:ListMultipartUploadParts', 
                    's3:GetObject', 
                    's3:GetBucketLocation', 
                    's3:AbortMultipartUpload', 
                    's3:CreateBucket', 
                    's3:PutObject', 
                    's3:DeleteObject'], 
                'Resource': [
                    f'arn:aws:s3:::{self.staging_bucket_name}', 
                    f'arn:aws:s3:::{self.staging_bucket_name}/*'], 
                'Effect': 'Allow'
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
                        "s3:DeleteObject"
                    ],
                    "Resource": [
                        f"arn:aws:s3:::{self.logging_bucket_name}",
                        f"arn:aws:s3:::{self.logging_bucket_name}/*"
                    ],
                    "Effect": "Allow"
                }
            ]
        
        # test sns notification
        notification_service = 'SNS'
        send_template_email_sns_public_policy_arn = os.environ["SEND_TEMPLATE_EMAIL_SNS_PUBLIC_POLICY_ARN"]
        receive_failed_topic_arn = os.environ['RECEIVE_STATES_FAILED_TOPIC_ARN']
        
        pipeline_id = str(uuid.uuid4())
        pipeline_info = copy.deepcopy(self.pipeline_info)
        pipeline_info['data']['notification']['service'] = notification_service
        pipeline_info['data']['notification']['recipients'] = receive_failed_topic_arn
        pipeline_event = {'RequestType': 'Create', 'ResourceProperties': {'Resource': 'pipeline', 'Id': pipeline_id}}
        
        AWS_DDB_META.put(meta_name=pipeline_id, item=pipeline_info)
        
        parameters = Parameters(pipeline_event)
        pipeline_resource_builder = PipelineResourceBuilder(parameters=parameters)
        pipeline_resource_builder.create_pipeline()
        pipeline_resource_builder.delete_pipeline()
        
        assert AWS_IAM.get_policy_document(arn=send_template_email_sns_public_policy_arn, sid=parameters.policy_sid)['Document']['Statement'] == []
        
        pipeline_id = str(uuid.uuid4())
        pipeline_info = copy.deepcopy(self.pipeline_info)
        pipeline_info['data']['notification']['service'] = notification_service
        pipeline_info['data']['notification']['recipients'] = 'arn:aws:iam::123456789012:policy/not-a-sns-arn'
        pipeline_event = {'RequestType': 'Create', 'ResourceProperties': {'Resource': 'pipeline', 'Id': pipeline_id}}
        
        AWS_DDB_META.put(meta_name=pipeline_id, item=pipeline_info)
        
        parameters = Parameters(pipeline_event)
        pipeline_resource_builder = PipelineResourceBuilder(parameters=parameters)
        pipeline_resource_builder.create_pipeline()
        pipeline_resource_builder.delete_pipeline()
        
        assert AWS_IAM.get_policy_document(arn=send_template_email_sns_public_policy_arn, sid=parameters.policy_sid)['Document']['Statement'] == []
  
    def test_create_ingestion(self, httpserver: HTTPServer, mock_s3_context, mock_sqs_context, mock_ddb_context, mock_glue_context, mock_scheduler_context, mock_iam_context, mock_sts_context):
        from pipeline_resources_builder.lambda_function import PipelineResourceBuilder, Parameters, MetaTable, SQSClient, S3Client, IAMClient

        self.init_default_parameter(httpserver, mock_s3_context, mock_sqs_context, mock_ddb_context, mock_glue_context, mock_scheduler_context, mock_iam_context)
        
        AWS_DDB_META = MetaTable()
        AWS_SQS = SQSClient()
        AWS_S3 = S3Client()
        AWS_IAM = IAMClient()

        # test create a not exists ingestion
        do_not_exists_ingestion_event = {'RequestType': 'Create', 'ResourceProperties': {'Resource': 'ingestion', 'Id': 'do-not-exists'}}
        parameters = Parameters(do_not_exists_ingestion_event)
        pipeline_resource_builder = PipelineResourceBuilder(parameters=parameters)
        with pytest.raises(Exception) as exception_info:
            pipeline_resource_builder.create_ingestion()
        assert exception_info.value.args[0] == 'Ingestion Id: do-not-exists Information is not exist in Meta Table.'
        
        # test create a ingestion using a not exists pipeline
        ingestion_id =  str(uuid.uuid4())
        ingestion_event = copy.deepcopy(self.ingestion_event)
        ingestion_event['ResourceProperties']['Id'] = ingestion_id
        ingestion_info = copy.deepcopy(self.ingestion_info)
        ingestion_info['pipelineId'] = 'do-not-exists'
        AWS_DDB_META.put(meta_name=ingestion_id, item=ingestion_info)
        parameters = Parameters(ingestion_event)
        pipeline_resource_builder = PipelineResourceBuilder(parameters=parameters)
        with pytest.raises(Exception) as exception_info:
            pipeline_resource_builder.create_ingestion()
        assert exception_info.value.args[0] == 'Pipeline Id: do-not-exists Information is not exist in Meta Table.'
        
        # test alb log format
        self.sts_role = ''
        self.table_name = 'alb'
        self.notification_service = 'SES'
        self.recipients = 'alejandro_rosalez@example.com,alejandro_rosalez@example.org'
        self.processor_schedule = 'rate(5 minutes)'
        self.merger_schedule = 'cron(0 1 * * ? *)'
        self.archive_schedule = 'cron(0 1 * * ? *)'
        self.merger_age = 3
        self.archive_age = 7
        self.staging_bucket_prefix = 'AWSLogs/WAFLogs'
        
        pipeline_id = str(uuid.uuid4())
        pipeline_info = copy.deepcopy(self.pipeline_info)
        pipeline_info['data']['source']['type'] = 'alb'
        pipeline_info['data']['destination']['table']['name'] = self.table_name
        pipeline_info['data']['notification']['service'] = self.notification_service
        pipeline_info['data']['notification']['recipients'] = self.recipients
        pipeline_info['data']['scheduler']['LogProcessor']['schedule'] = self.processor_schedule
        pipeline_info['data']['scheduler']['LogMerger']['schedule'] = self.merger_schedule
        pipeline_info['data']['scheduler']['LogMerger']['age'] = self.merger_age
        pipeline_info['data']['scheduler']['LogArchive']['schedule'] = self.archive_schedule
        pipeline_info['data']['scheduler']['LogArchive']['age'] = self.archive_age
        pipeline_info['data']['staging']['prefix'] = self.staging_bucket_prefix

        AWS_DDB_META.put(meta_name=pipeline_id, item=pipeline_info)
        
        ingestion_id = str(uuid.uuid4())
        ingestion_info = copy.deepcopy(self.ingestion_info)
        ingestion_info['data']['role']['sts'] = self.sts_role
        ingestion_info['data']['source']['bucket'] = self.logging_bucket_name
        ingestion_info['data']['source']['prefix'] = self.logging_bucket_prefix
        ingestion_info['pipelineId'] = pipeline_id
        ingestion_event = {'RequestType': 'Create', 'ResourceProperties': {'Resource': 'ingestion', 'Id': ingestion_id}}
        
        AWS_DDB_META.put(meta_name=ingestion_id, item=ingestion_info)

        parameters = Parameters(ingestion_event)
        pipeline_resource_builder = PipelineResourceBuilder(parameters=parameters)
        pipeline_resource_builder.create_ingestion()
        
        assert isinstance(pipeline_resource_builder.s3_client, S3Client) is True
        replication_sqs_url = AWS_SQS.get_queue_url(name=self.replication_sqs_name)
        
        response = AWS_SQS.get_queue_policy(url=replication_sqs_url)
        assert response['Statement'] == [
            {'Effect': 'Allow', 
            'Principal': {
                'Service': 's3.amazonaws.com'
                }, 
            'Action': ['sqs:SendMessage'], 
            'Resource': self.replication_sqs_arn,
            'Condition': {
                'ArnLike': {
                    'aws:SourceArn': f'arn:aws:s3:::{self.logging_bucket_name}'
                    }
                }, 
            'Sid': ingestion_id.replace('-', '')
            }
            ]
        
        replication_dlq_url = AWS_SQS.get_queue_url(name=self.replication_dlq_name)
        response = AWS_SQS.get_queue_policy(url=replication_dlq_url)
        assert response['Statement'] == [
            {'Effect': 'Allow', 
            'Principal': {
                'Service': 's3.amazonaws.com'
                }, 
            'Action': ['sqs:SendMessage'], 
            'Resource': self.replication_dlq_arn,
            'Condition': {
                'ArnLike': {
                    'aws:SourceArn': f'arn:aws:s3:::{self.logging_bucket_name}'
                    }
                }, 
            'Sid': ingestion_id.replace('-', '')
            }
            ]

        response = AWS_S3.get_bucket_policy(bucket=self.logging_bucket_name)
        assert response['Statement'] == [
            {
                'Effect': 'Allow', 
                'Action': [
                    's3:GetObject',
                    's3:GetObjectTagging',
                ],
                'Principal': {
                    'AWS': self.replication_role_arn
                    }, 
                'Resource': [
                    f'arn:aws:s3:::{self.logging_bucket_name}/AWSLogs/{self.account_id}/{self.aws_region}/WAFLogs*'
                    ], 
                'Sid': ingestion_id.replace('-', '')
                },
            {
                'Effect': 'Allow', 
                'Principal': {'AWS': 'arn:aws:iam::127311923021:root'}, 
                'Action': [
                    's3:PutObject',
                    's3:PutObjectTagging',
                ], 
                'Resource': f'arn:aws:s3:::{self.logging_bucket_name}/AWSLogs/{self.account_id}/{self.aws_region}/WAFLogs*', 
                'Sid':  f'{parameters.pipeline_info.source.type}{parameters.policy_sid}'
                },
            ]
        
        response = AWS_S3.get_bucket_notification(bucket=self.logging_bucket_name)
        assert response['QueueConfigurations'] == [
            {
                'Id': ingestion_id, 
                'QueueArn': self.replication_sqs_arn, 
                'Events': ['s3:ObjectCreated:*'], 
                'Filter': {
                    'Key': {
                        'FilterRules': [
                            {
                                'Name': 'prefix', 
                                'Value': f'AWSLogs/{self.account_id}/{self.aws_region}/WAFLogs'
                                }
                            ]
                        }
                    }
                }
            ]
        
        pipeline_resource_builder.delete_ingestion()
        
        # test waf log format
        self.sts_role = ''
        self.table_name = 'waf'
        self.notification_service = 'SES'
        self.recipients = 'alejandro_rosalez@example.com,alejandro_rosalez@example.org'
        self.processor_schedule = 'rate(5 minutes)'
        self.merger_schedule = 'cron(0 1 * * ? *)'
        self.archive_schedule = 'cron(0 1 * * ? *)'
        self.merger_age = 3
        self.archive_age = 7
        self.staging_bucket_prefix = 'AWSLogs/WAFLogs'
        
        pipeline_id = str(uuid.uuid4())
        pipeline_info = copy.deepcopy(self.pipeline_info)
        pipeline_info['data']['source']['type'] = 'waf'
        pipeline_info['data']['destination']['table']['name'] = self.table_name
        pipeline_info['data']['notification']['service'] = self.notification_service
        pipeline_info['data']['notification']['recipients'] = self.recipients
        pipeline_info['data']['scheduler']['LogProcessor']['schedule'] = self.processor_schedule
        pipeline_info['data']['scheduler']['LogMerger']['schedule'] = self.merger_schedule
        pipeline_info['data']['scheduler']['LogMerger']['age'] = self.merger_age
        pipeline_info['data']['scheduler']['LogArchive']['schedule'] = self.archive_schedule
        pipeline_info['data']['scheduler']['LogArchive']['age'] = self.archive_age
        pipeline_info['data']['staging']['prefix'] = self.staging_bucket_prefix

        AWS_DDB_META.put(meta_name=pipeline_id, item=pipeline_info)
        
        ingestion_id = str(uuid.uuid4())
        ingestion_info = copy.deepcopy(self.ingestion_info)
        ingestion_info['data']['role']['sts'] = self.sts_role
        ingestion_info['data']['source']['bucket'] = self.logging_bucket_name
        ingestion_info['data']['source']['prefix'] = self.logging_bucket_prefix
        ingestion_info['pipelineId'] = pipeline_id
        ingestion_event = {'RequestType': 'Create', 'ResourceProperties': {'Resource': 'ingestion', 'Id': ingestion_id}}
        
        AWS_DDB_META.put(meta_name=ingestion_id, item=ingestion_info)

        parameters = Parameters(ingestion_event)
        pipeline_resource_builder = PipelineResourceBuilder(parameters=parameters)
        pipeline_resource_builder.create_ingestion()
        
        replication_sqs_url = AWS_SQS.get_queue_url(name=self.replication_sqs_name)
        
        response = AWS_SQS.get_queue_policy(url=replication_sqs_url)
        assert response['Statement'] == [
            {'Effect': 'Allow', 
            'Principal': {
                'Service': 's3.amazonaws.com'
                }, 
            'Action': ['sqs:SendMessage'], 
            'Resource': self.replication_sqs_arn,
            'Condition': {
                'ArnLike': {
                    'aws:SourceArn': f'arn:aws:s3:::{self.logging_bucket_name}'
                    }
                }, 
            'Sid': ingestion_id.replace('-', '')
            }
            ]
        
        replication_dlq_url = AWS_SQS.get_queue_url(name=self.replication_dlq_name)
        response = AWS_SQS.get_queue_policy(url=replication_dlq_url)
        assert response['Statement'] == [
            {'Effect': 'Allow', 
            'Principal': {
                'Service': 's3.amazonaws.com'
                }, 
            'Action': ['sqs:SendMessage'], 
            'Resource': self.replication_dlq_arn,
            'Condition': {
                'ArnLike': {
                    'aws:SourceArn': f'arn:aws:s3:::{self.logging_bucket_name}'
                    }
                }, 
            'Sid': ingestion_id.replace('-', '')
            }
            ]

        response = AWS_S3.get_bucket_policy(bucket=self.logging_bucket_name)
        assert response['Statement'] == [
            {
                'Effect': 'Allow', 
                'Action': [
                    's3:GetObject',
                    's3:GetObjectTagging',
                ],
                'Principal': {
                    'AWS': self.replication_role_arn
                    }, 
                'Resource': [
                    f'arn:aws:s3:::{self.logging_bucket_name}/AWSLogs/{self.account_id}/{self.aws_region}/WAFLogs*'
                    ], 
                'Sid': ingestion_id.replace('-', '')
                },
            ]
        
        response = AWS_S3.get_bucket_notification(bucket=self.logging_bucket_name)
        assert response['QueueConfigurations'] == [
            {
                'Id': ingestion_id, 
                'QueueArn': self.replication_sqs_arn, 
                'Events': ['s3:ObjectCreated:*'], 
                'Filter': {
                    'Key': {
                        'FilterRules': [
                            {
                                'Name': 'prefix', 
                                'Value': f'AWSLogs/{self.account_id}/{self.aws_region}/WAFLogs'
                                }
                            ]
                        }
                    }
                }
            ]
        
        pipeline_resource_builder.delete_ingestion()
        
        # test for 
        self.sts_role = ''
        self.logging_bucket_prefix = f'/AWSLogs/{self.account_id}/{self.aws_region}/WAFLogs/'
        self.staging_bucket_prefix = '/AWSLogs/WAFLogs/'
        
        pipeline_id = str(uuid.uuid4())
        pipeline_info = copy.deepcopy(self.pipeline_info)
        pipeline_info['data']['source']['type'] = 'waf'
        pipeline_info['data']['destination']['table']['name'] = self.table_name
        pipeline_info['data']['notification']['service'] = self.notification_service
        pipeline_info['data']['notification']['recipients'] = self.recipients
        pipeline_info['data']['scheduler']['LogProcessor']['schedule'] = self.processor_schedule
        pipeline_info['data']['scheduler']['LogMerger']['schedule'] = self.merger_schedule
        pipeline_info['data']['scheduler']['LogMerger']['age'] = self.merger_age
        pipeline_info['data']['scheduler']['LogArchive']['schedule'] = self.archive_schedule
        pipeline_info['data']['scheduler']['LogArchive']['age'] = self.archive_age
        pipeline_info['data']['staging']['prefix'] = self.staging_bucket_prefix

        AWS_DDB_META.put(meta_name=pipeline_id, item=pipeline_info)
        
        ingestion_id = str(uuid.uuid4())
        ingestion_info = copy.deepcopy(self.ingestion_info)
        ingestion_info['data']['role']['sts'] = self.sts_role
        ingestion_info['data']['source']['bucket'] = self.logging_bucket_name
        ingestion_info['data']['source']['prefix'] = self.logging_bucket_prefix
        ingestion_info['pipelineId'] = pipeline_id
        ingestion_event = {'RequestType': 'Create', 'ResourceProperties': {'Resource': 'ingestion', 'Id': ingestion_id}}
        
        AWS_DDB_META.put(meta_name=ingestion_id, item=ingestion_info)

        parameters = Parameters(ingestion_event)
        pipeline_resource_builder = PipelineResourceBuilder(parameters=parameters)
        pipeline_resource_builder.create_ingestion()
        
        replication_sqs_url = AWS_SQS.get_queue_url(name=self.replication_sqs_name)
        
        response = AWS_SQS.get_queue_policy(url=replication_sqs_url)
        assert response['Statement'] == [
            {'Effect': 'Allow', 
            'Principal': {
                'Service': 's3.amazonaws.com'
                }, 
            'Action': ['sqs:SendMessage'], 
            'Resource': self.replication_sqs_arn,
            'Condition': {
                'ArnLike': {
                    'aws:SourceArn': f'arn:aws:s3:::{self.logging_bucket_name}'
                    }
                }, 
            'Sid': ingestion_id.replace('-', '')
            }
            ]
        
        replication_dlq_url = AWS_SQS.get_queue_url(name=self.replication_dlq_name)
        response = AWS_SQS.get_queue_policy(url=replication_dlq_url)
        assert response['Statement'] == [
            {'Effect': 'Allow', 
            'Principal': {
                'Service': 's3.amazonaws.com'
                }, 
            'Action': ['sqs:SendMessage'], 
            'Resource': self.replication_dlq_arn,
            'Condition': {
                'ArnLike': {
                    'aws:SourceArn': f'arn:aws:s3:::{self.logging_bucket_name}'
                    }
                }, 
            'Sid': ingestion_id.replace('-', '')
            }
            ]

        response = AWS_S3.get_bucket_policy(bucket=self.logging_bucket_name)
        assert response['Statement'] == [
            {
                'Effect': 'Allow', 
                'Action': [
                    's3:GetObject',
                    's3:GetObjectTagging',
                ],
                'Principal': {
                    'AWS': self.replication_role_arn
                    }, 
                'Resource': [
                    f'arn:aws:s3:::{self.logging_bucket_name}/AWSLogs/{self.account_id}/{self.aws_region}/WAFLogs*'
                    ], 
                'Sid': ingestion_id.replace('-', '')
                }
            ]
        
        response = AWS_S3.get_bucket_notification(bucket=self.logging_bucket_name)
        assert response['QueueConfigurations'] == [
            {
                'Id': ingestion_id, 
                'QueueArn': self.replication_sqs_arn, 
                'Events': ['s3:ObjectCreated:*'], 
                'Filter': {
                    'Key': {
                        'FilterRules': [
                            {
                                'Name': 'prefix', 
                                'Value': f'AWSLogs/{self.account_id}/{self.aws_region}/WAFLogs'
                                }
                            ]
                        }
                    }
                }
            ]
        
        pipeline_resource_builder.delete_ingestion()
        
        # test source.bucekt = staging.bucket
        pipeline_id = str(uuid.uuid4())
        ingestion_id = str(uuid.uuid4())
        
        logging_bucket_name = self.staging_bucket_name
        self.logging_bucket_prefix = f'/AWSLogs/{self.account_id}/{self.aws_region}/WAFLogs/'
        self.staging_bucket_prefix = '/AWSLogs/WAFLogs/'
        
        pipeline_id = str(uuid.uuid4())
        pipeline_info = copy.deepcopy(self.pipeline_info)
        pipeline_info['data']['source']['type'] = 'waf'
        pipeline_info['data']['destination']['table']['name'] = self.table_name
        pipeline_info['data']['notification']['service'] = self.notification_service
        pipeline_info['data']['notification']['recipients'] = self.recipients
        pipeline_info['data']['scheduler']['LogProcessor']['schedule'] = self.processor_schedule
        pipeline_info['data']['scheduler']['LogMerger']['schedule'] = self.merger_schedule
        pipeline_info['data']['scheduler']['LogMerger']['age'] = self.merger_age
        pipeline_info['data']['scheduler']['LogArchive']['schedule'] = self.archive_schedule
        pipeline_info['data']['scheduler']['LogArchive']['age'] = self.archive_age
        pipeline_info['data']['staging']['prefix'] = self.staging_bucket_prefix

        AWS_DDB_META.put(meta_name=pipeline_id, item=pipeline_info)
        
        ingestion_id = str(uuid.uuid4())
        ingestion_info = copy.deepcopy(self.ingestion_info)
        ingestion_info['data']['role']['sts'] = self.sts_role
        ingestion_info['data']['source']['bucket'] = logging_bucket_name
        ingestion_info['data']['source']['prefix'] = self.logging_bucket_prefix
        ingestion_info['pipelineId'] = pipeline_id
        ingestion_event = {'RequestType': 'Create', 'ResourceProperties': {'Resource': 'ingestion', 'Id': ingestion_id}}
        
        AWS_DDB_META.put(meta_name=ingestion_id, item=ingestion_info)

        parameters = Parameters(ingestion_event)
        pipeline_resource_builder = PipelineResourceBuilder(parameters=parameters)
        pipeline_resource_builder.create_ingestion()
        
        replication_sqs_url = AWS_SQS.get_queue_url(name=self.replication_sqs_name)
        
        response = AWS_SQS.get_queue_policy(url=replication_sqs_url)
        assert response['Statement'] == []
        
        replication_dlq_url = AWS_SQS.get_queue_url(name=self.replication_dlq_name)
        response = AWS_SQS.get_queue_policy(url=replication_dlq_url)
        assert response['Statement'] == []

        response = AWS_S3.get_bucket_policy(bucket=logging_bucket_name)
        assert response['Statement'] == []
        
        response = AWS_S3.get_bucket_notification(bucket=logging_bucket_name)
        assert response == {}
        
        pipeline_resource_builder.delete_ingestion()
        
        # test logging bucket prefix == ''
        self.sts_role = ''
        self.table_name = 'waf'
        self.notification_service = 'SES'
        self.recipients = 'alejandro_rosalez@example.com,alejandro_rosalez@example.org'
        self.processor_schedule = 'rate(5 minutes)'
        self.merger_schedule = 'cron(0 1 * * ? *)'
        self.archive_schedule = 'cron(0 1 * * ? *)'
        self.merger_age = 3
        self.archive_age = 7
        self.staging_bucket_prefix = 'AWSLogs/WAFLogs'
        
        pipeline_id = str(uuid.uuid4())
        pipeline_info = copy.deepcopy(self.pipeline_info)
        pipeline_info['data']['source']['type'] = 'waf'
        pipeline_info['data']['destination']['table']['name'] = self.table_name
        pipeline_info['data']['notification']['service'] = self.notification_service
        pipeline_info['data']['notification']['recipients'] = self.recipients
        pipeline_info['data']['scheduler']['LogProcessor']['schedule'] = self.processor_schedule
        pipeline_info['data']['scheduler']['LogMerger']['schedule'] = self.merger_schedule
        pipeline_info['data']['scheduler']['LogMerger']['age'] = self.merger_age
        pipeline_info['data']['scheduler']['LogArchive']['schedule'] = self.archive_schedule
        pipeline_info['data']['scheduler']['LogArchive']['age'] = self.archive_age
        pipeline_info['data']['staging']['prefix'] = self.staging_bucket_prefix

        AWS_DDB_META.put(meta_name=pipeline_id, item=pipeline_info)
        
        ingestion_id = str(uuid.uuid4())
        ingestion_info = copy.deepcopy(self.ingestion_info)
        ingestion_info['data']['role']['sts'] = self.sts_role
        ingestion_info['data']['source']['bucket'] = self.logging_bucket_name
        ingestion_info['data']['source']['prefix'] = ''
        ingestion_info['pipelineId'] = pipeline_id
        ingestion_event = {'RequestType': 'Create', 'ResourceProperties': {'Resource': 'ingestion', 'Id': ingestion_id}}
        
        AWS_DDB_META.put(meta_name=ingestion_id, item=ingestion_info)

        parameters = Parameters(ingestion_event)
        pipeline_resource_builder = PipelineResourceBuilder(parameters=parameters)
        try:
            pipeline_resource_builder.create_ingestion()
        except Exception:
            pass
        
        assert isinstance(pipeline_resource_builder.s3_client, S3Client) is True
        replication_sqs_url = AWS_SQS.get_queue_url(name=self.replication_sqs_name)
        
        response = AWS_SQS.get_queue_policy(url=replication_sqs_url)
        assert response['Statement'] == [
            {'Effect': 'Allow', 
            'Principal': {
                'Service': 's3.amazonaws.com'
                }, 
            'Action': ['sqs:SendMessage'], 
            'Resource': self.replication_sqs_arn,
            'Condition': {
                'ArnLike': {
                    'aws:SourceArn': f'arn:aws:s3:::{self.logging_bucket_name}'
                    }
                }, 
            'Sid': ingestion_id.replace('-', '')
            }
            ]
        
        replication_dlq_url = AWS_SQS.get_queue_url(name=self.replication_dlq_name)
        response = AWS_SQS.get_queue_policy(url=replication_dlq_url)
        assert response['Statement'] == [
            {'Effect': 'Allow', 
            'Principal': {
                'Service': 's3.amazonaws.com'
                }, 
            'Action': ['sqs:SendMessage'], 
            'Resource': self.replication_dlq_arn,
            'Condition': {
                'ArnLike': {
                    'aws:SourceArn': f'arn:aws:s3:::{self.logging_bucket_name}'
                    }
                }, 
            'Sid': ingestion_id.replace('-', '')
            }
            ]

        response = AWS_S3.get_bucket_policy(bucket=self.logging_bucket_name)
        assert response['Statement'] == [
            {
                'Effect': 'Allow', 
                'Action': [
                    's3:GetObject',
                    's3:GetObjectTagging',
                ],
                'Principal': {
                    'AWS': self.replication_role_arn
                    }, 
                'Resource': [
                    f'arn:aws:s3:::{self.logging_bucket_name}/*'
                    ], 
                'Sid': ingestion_id.replace('-', '')
                },
            ]
        
        # moto can not put event notification when prefix is '', so can not test this.
        # response = AWS_S3.get_bucket_notification(bucket=self.logging_bucket_name)
        # assert response['QueueConfigurations'] == [
        #     {
        #         'Id': ingestion_id, 
        #         'QueueArn': self.replication_sqs_arn, 
        #         'Events': ['s3:ObjectCreated:*'], 
        #         'Filter': {
        #             'Key': {
        #                 'FilterRules': [
        #                     {
        #                         'Name': 'prefix', 
        #                         'Value': ''
        #                         }
        #                     ]
        #                 }
        #             }
        #         }
        #     ]
        
        response = AWS_IAM.get_role_policy(role_name=self.replication_role_arn.split('/')[-1], policy_name=ingestion_id.replace('-', ''))
        assert response['PolicyDocument'] == {
            'Statement': [
                {
                    'Action': [
                        's3:GetObject',
                        's3:GetObjectTagging',
                    ], 
                    'Effect': 'Allow', 
                    'Resource': [
                        'arn:aws:s3:::logging-bucket/*'
                        ]
                    }, 
            ],
            'Version': '2012-10-17'
            }
        
        pipeline_resource_builder.delete_ingestion()
        

    def test_delete_ingestion(self, httpserver: HTTPServer, mock_iam_context, mock_s3_context, mock_sqs_context, mock_ddb_context, mock_glue_context, mock_scheduler_context):
        from pipeline_resources_builder.lambda_function import PipelineResourceBuilder, Parameters, MetaTable, SQSClient, S3Client

        self.init_default_parameter(httpserver, mock_iam_context, mock_s3_context, mock_sqs_context, mock_ddb_context, mock_glue_context, mock_scheduler_context)
        
        AWS_DDB_META = MetaTable()
        AWS_SQS = SQSClient()
        AWS_S3 = S3Client()
        
        # test alb log format
        self.sts_role = ''
        self.table_name = 'alb'
        self.notification_service = 'SES'
        self.recipients = 'alejandro_rosalez@example.com,alejandro_rosalez@example.org'
        self.processor_schedule = 'rate(5 minutes)'
        self.merger_schedule = 'cron(0 1 * * ? *)'
        self.archive_schedule = 'cron(0 1 * * ? *)'
        self.merger_age = 3
        self.archive_age = 7
        self.staging_bucket_prefix = 'AWSLogs/WAFLogs'
        
        pipeline_id = str(uuid.uuid4())
        pipeline_info = copy.deepcopy(self.pipeline_info)
        pipeline_info['data']['source']['type'] = 'alb'
        pipeline_info['data']['destination']['table']['name'] = self.table_name
        pipeline_info['data']['notification']['service'] = self.notification_service
        pipeline_info['data']['notification']['recipients'] = self.recipients
        pipeline_info['data']['scheduler']['LogProcessor']['schedule'] = self.processor_schedule
        pipeline_info['data']['scheduler']['LogMerger']['schedule'] = self.merger_schedule
        pipeline_info['data']['scheduler']['LogMerger']['age'] = self.merger_age
        pipeline_info['data']['scheduler']['LogArchive']['schedule'] = self.archive_schedule
        pipeline_info['data']['scheduler']['LogArchive']['age'] = self.archive_age
        pipeline_info['data']['staging']['prefix'] = self.staging_bucket_prefix

        AWS_DDB_META.put(meta_name=pipeline_id, item=pipeline_info)
        
        ingestion_id = str(uuid.uuid4())
        ingestion_info = copy.deepcopy(self.ingestion_info)
        ingestion_info['data']['role']['sts'] = self.sts_role
        ingestion_info['data']['source']['bucket'] = self.logging_bucket_name
        ingestion_info['data']['source']['prefix'] = self.logging_bucket_prefix
        ingestion_info['pipelineId'] = pipeline_id
        ingestion_event = {'RequestType': 'Create', 'ResourceProperties': {'Resource': 'ingestion', 'Id': ingestion_id}}
        
        AWS_DDB_META.put(meta_name=ingestion_id, item=ingestion_info)

        parameters = Parameters(ingestion_event)
        pipeline_resource_builder = PipelineResourceBuilder(parameters=parameters)
        pipeline_resource_builder.create_ingestion()
        pipeline_resource_builder.delete_ingestion()
        
        assert isinstance(pipeline_resource_builder.s3_client, S3Client) is True
        replication_sqs_url = AWS_SQS.get_queue_url(name=self.replication_sqs_name)
        
        response = AWS_SQS.get_queue_policy(url=replication_sqs_url)
        assert response['Statement'] == []
        
        replication_dlq_url = AWS_SQS.get_queue_url(name=self.replication_dlq_name)
        response = AWS_SQS.get_queue_policy(url=replication_dlq_url)
        assert response['Statement'] == []

        response = AWS_S3.get_bucket_policy(bucket=self.logging_bucket_name)
        assert response['Statement'] == []
        
        response = AWS_S3.get_bucket_notification(bucket=self.logging_bucket_name)
        assert response == {}
        
        # test waf log format
        self.sts_role = ''
        self.table_name = 'waf'
        self.notification_service = 'SES'
        self.recipients = 'alejandro_rosalez@example.com,alejandro_rosalez@example.org'
        self.processor_schedule = 'rate(5 minutes)'
        self.merger_schedule = 'cron(0 1 * * ? *)'
        self.archive_schedule = 'cron(0 1 * * ? *)'
        self.merger_age = 3
        self.archive_age = 7
        self.staging_bucket_prefix = 'AWSLogs/WAFLogs'
        
        pipeline_id = str(uuid.uuid4())
        pipeline_info = copy.deepcopy(self.pipeline_info)
        pipeline_info['data']['source']['type'] = 'waf'
        pipeline_info['data']['destination']['table']['name'] = self.table_name
        pipeline_info['data']['notification']['service'] = self.notification_service
        pipeline_info['data']['notification']['recipients'] = self.recipients
        pipeline_info['data']['scheduler']['LogProcessor']['schedule'] = self.processor_schedule
        pipeline_info['data']['scheduler']['LogMerger']['schedule'] = self.merger_schedule
        pipeline_info['data']['scheduler']['LogMerger']['age'] = self.merger_age
        pipeline_info['data']['scheduler']['LogArchive']['schedule'] = self.archive_schedule
        pipeline_info['data']['scheduler']['LogArchive']['age'] = self.archive_age
        pipeline_info['data']['staging']['prefix'] = self.staging_bucket_prefix

        AWS_DDB_META.put(meta_name=pipeline_id, item=pipeline_info)
        
        ingestion_id = str(uuid.uuid4())
        ingestion_info = copy.deepcopy(self.ingestion_info)
        ingestion_info['data']['role']['sts'] = self.sts_role
        ingestion_info['data']['source']['bucket'] = self.logging_bucket_name
        ingestion_info['data']['source']['prefix'] = self.logging_bucket_prefix
        ingestion_info['pipelineId'] = pipeline_id
        ingestion_event = {'RequestType': 'Create', 'ResourceProperties': {'Resource': 'ingestion', 'Id': ingestion_id}}
        
        AWS_DDB_META.put(meta_name=ingestion_id, item=ingestion_info)

        parameters = Parameters(ingestion_event)
        pipeline_resource_builder = PipelineResourceBuilder(parameters=parameters)
        pipeline_resource_builder.create_ingestion()
        pipeline_resource_builder.delete_ingestion()
        
        replication_sqs_url = AWS_SQS.get_queue_url(name=self.replication_sqs_name)
        
        response = AWS_SQS.get_queue_policy(url=replication_sqs_url)
        assert response['Statement'] == []
        
        replication_dlq_url = AWS_SQS.get_queue_url(name=self.replication_dlq_name)
        response = AWS_SQS.get_queue_policy(url=replication_dlq_url)
        assert response['Statement'] == []

        response = AWS_S3.get_bucket_policy(bucket=self.logging_bucket_name)
        assert response['Statement'] == []
        
        response = AWS_S3.get_bucket_notification(bucket=self.logging_bucket_name)
        assert response == {}
        
        # repeat delete
        AWS_DDB_META.put(meta_name=ingestion_id, item=ingestion_info)
        pipeline_resource_builder.delete_ingestion()
        
        replication_sqs_url = AWS_SQS.get_queue_url(name=self.replication_sqs_name)
        
        response = AWS_SQS.get_queue_policy(url=replication_sqs_url)
        assert response['Statement'] == []
        
        replication_dlq_url = AWS_SQS.get_queue_url(name=self.replication_dlq_name)
        response = AWS_SQS.get_queue_policy(url=replication_dlq_url)
        assert response['Statement'] == []

        response = AWS_S3.get_bucket_policy(bucket=self.logging_bucket_name)
        assert response['Statement'] == []
        
        response = AWS_S3.get_bucket_notification(bucket=self.logging_bucket_name)
        assert response == {}


def test_lambda_handler(httpserver: HTTPServer, mock_iam_context, mock_s3_context, mock_sqs_context, mock_ddb_context, mock_glue_context, mock_scheduler_context, mock_events_context):
    from pipeline_resources_builder.lambda_function import lambda_handler, MetaTable, EventsClient, SchedulerClient, GlueClient, IAMClient, SQSClient, S3Client
    
    AWS_DDB_META = MetaTable()
    AWS_EVENTS = EventsClient()
    AWS_SCHEDULER = SchedulerClient()
    AWS_GLUE = GlueClient()
    AWS_IAM = IAMClient()
    AWS_SQS = SQSClient()
    AWS_S3 = S3Client()
        
    aws_region = os.environ["AWS_REGION"]
    account_id = os.environ["ACCOUNT_ID"]
    staging_bucket_name = os.environ["STAGING_BUCKET_NAME"]
    logging_bucket_name = os.environ["LOGGING_BUCKET_NAME"]
    logging_bucket_prefix = os.environ["LOGGING_BUCKET_PREFIX"]
    centralized_bucket_name = os.environ["CENTRALIZED_BUCKET_NAME"]
    centralized_bucket_prefix = 'datalake'
    centralized_database = os.environ["CENTRALIZED_DATABASE"]
    tmp_database = os.environ["TMP_DATABASE"]
    s3_public_access_policy = os.environ["S3_PUBLIC_ACCESS_POLICY"]
    s3_public_access_policy_arn = f'arn:aws:iam::{account_id}:policy/{s3_public_access_policy}'
    replication_sqs_arn = os.environ['REPLICATION_SQS_ARN']
    replication_sqs_name = os.environ['REPLICATION_SQS_NAME']
    replication_dlq_arn = os.environ['REPLICATION_DLQ_ARN']
    replication_dlq_name = os.environ['REPLICATION_DLQ_NAME']
    replication_function_arn = os.environ["S3_OBJECTS_REPLICATION_FUNCTION_ARN"]
    replication_role_arn = os.environ["S3_OBJECTS_REPLICATION_ROLE_ARN"]
    log_processor_name = os.environ["LOG_PROCESSOR_NAME"]
    log_merger_name = os.environ["LOG_MERGER_NAME"]
    log_archive_name = os.environ["LOG_ARCHIVE_NAME"]
    log_processor_arn = f'arn:aws:states:{aws_region}:{account_id}:stateMachine:{log_processor_name}'
    log_merger_arn = f'arn:aws:states:{aws_region}:{account_id}:stateMachine:{log_merger_name}'
    log_archive_arn = f'arn:aws:states:{aws_region}:{account_id}:stateMachine:{log_archive_name}'
    log_processor_start_execution_role = f'arn:aws:iam::{account_id}:role/{log_processor_name}'
    log_merger_start_execution_role = f'arn:aws:iam::{account_id}:role/{log_merger_name}'
    log_archive_start_execution_role = f'arn:aws:iam::{account_id}:role/{log_archive_name}'
    table_name = 'waf'
    sts_role = ''
    notification_service = 'SES'
    recipients = 'alejandro_rosalez@example.com,alejandro_rosalez@example.org'
    processor_schedule = 'rate(5 minutes)'
    merger_schedule = 'cron(0 1 * * ? *)'
    archive_schedule = 'cron(0 2 * * ? *)'
    merger_age = 3
    archive_age = 7
    staging_bucket_prefix = 'AWSLogs/WAFLogs'
    waf_pipeline_id = os.environ["WAF_PIPELINE_ID"]
    waf_pipeline_info = AWS_DDB_META.get(meta_name=waf_pipeline_id)
    waf_ingestion_id = os.environ["WAF_INGESTION_ID"]
    waf_ingestion_info = AWS_DDB_META.get(meta_name=waf_ingestion_id)
    create_waf_pipeline_event = {'RequestType': 'Create', 'ResourceProperties': {'Resource': 'pipeline', 'Id': waf_pipeline_id}}
    delete_waf_pipeline_event = {'RequestType': 'Delete', 'ResourceProperties': {'Resource': 'pipeline', 'Id': waf_pipeline_id}}
    create_waf_ingestion_event = {'RequestType': 'Create', 'ResourceProperties': {'Resource': 'ingestion', 'Id': waf_ingestion_id}}
    delete_waf_ingestion_event = {'RequestType': 'Delete', 'ResourceProperties': {'Resource': 'ingestion', 'Id': waf_ingestion_id}}
    
    context = types.SimpleNamespace()
    context.function_name = 'PipelineResourceBuilder'
    
    # event is not a dict
    with pytest.raises(Exception) as exception_info:
        lambda_handler('', context)
    assert exception_info.value.args[0] == 'The event is not a dict.'
    
    # test missing required parameter in event
    pipeline_event = copy.deepcopy(create_waf_pipeline_event)
    pipeline_event.pop('RequestType')
    with pytest.raises(Exception) as exception_info:
        lambda_handler(pipeline_event, context)
    assert exception_info.value.args[0] == 'Missing value for RequestType.'
    
    # test create pipeline event
    pipeline_event = copy.deepcopy(create_waf_pipeline_event)
    pipeline_event['ResourceProperties']['Id'] = 'do-not-exists'
    with pytest.raises(Exception) as exception_info:
        lambda_handler(pipeline_event, context)
    assert exception_info.value.args[0] == 'Pipeline Id: do-not-exists Information is not exist in Meta Table.'
    
    pipeline_id = str(uuid.uuid4())
    pipeline_info = copy.deepcopy(waf_pipeline_info)
    pipeline_info['data']['scheduler']['service'] = 'events'
    create_pipeline_event = copy.deepcopy(create_waf_pipeline_event)
    create_pipeline_event['ResourceProperties']['Id'] = pipeline_id
    delete_pipeline_event = copy.deepcopy(delete_waf_pipeline_event)
    delete_pipeline_event['ResourceProperties']['Id'] = pipeline_id
    AWS_DDB_META.put(meta_name='AvailableServices', item={'value': ['events']})
    AWS_DDB_META.put(meta_name=pipeline_id, item=pipeline_info)
    
    lambda_handler(create_pipeline_event, context)
    
    response = AWS_GLUE.get_table(database=centralized_database, name=table_name)
    assert response['Table']['Name'] == table_name
    assert response['Table']['DatabaseName'] == centralized_database
    assert response['Table']['StorageDescriptor']['Columns'] == [
        {'Name': 'time', 'Type': 'bigint'}, 
        {'Name': 'timestamp', 'Type': 'timestamp'},
        {'Name': 'formatversion', 'Type': 'int'}, 
        {'Name': 'webaclid', 'Type': 'string'}, 
        {'Name': 'webaclname', 'Type': 'string'}, 
        {'Name': 'terminatingruleid', 'Type': 'string'}, 
        {'Name': 'terminatingruletype', 'Type': 'string'}, 
        {'Name': 'action', 'Type': 'string'}, 
        {'Name': 'terminatingrulematchdetails', 'Type': 'array<struct<conditiontype:string,sensitivitylevel:string,location:string,matcheddata:array<string>>>'}, 
        {'Name': 'httpsourcename', 'Type': 'string'}, 
        {'Name': 'httpsourceid', 'Type': 'string'}, 
        {'Name': 'rulegrouplist', 'Type': 'array<struct<rulegroupid:string,terminatingrule:struct<ruleid:string,action:string,rulematchdetails:array<struct<conditiontype:string,sensitivitylevel:string,location:string,matcheddata:array<string>>>>,nonterminatingmatchingrules:array<struct<ruleid:string,action:string,rulematchdetails:array<struct<conditiontype:string,sensitivitylevel:string,location:string,matcheddata:array<string>>>>>,excludedrules:string>>'}, 
        {'Name': 'ratebasedrulelist', 'Type': 'array<struct<ratebasedruleid:string,limitkey:string,maxrateallowed:int>>'}, 
        {'Name': 'nonterminatingmatchingrules', 'Type': 'array<struct<ruleid:string,action:string,rulematchdetails:array<struct<conditiontype:string,sensitivitylevel:string,location:string,matcheddata:array<string>>>,captcharesponse:struct<responsecode:string,solvetimestamp:string>>>'}, 
        {'Name': 'requestheadersinserted', 'Type': 'array<struct<name:string,value:string>>'}, 
        {'Name': 'responsecodesent', 'Type': 'string'}, 
        {'Name': 'httprequest', 'Type': 'struct<clientip:string,country:string,headers:array<struct<name:string,value:string>>,uri:string,args:string,httpversion:string,httpmethod:string,requestid:string>'}, 
        {'Name': 'labels', 'Type': 'array<struct<name:string>>'}, 
        {'Name': 'captcharesponse', 'Type': 'struct<responsecode:string,solvetimestamp:string,failureReason:string>'}
        ]
    assert response['Table']['StorageDescriptor']['Location'] == f's3://{centralized_bucket_name}/{centralized_bucket_prefix}/{centralized_database}/{table_name}'
    assert response['Table']['StorageDescriptor']['InputFormat'] == 'org.apache.hadoop.hive.ql.io.parquet.MapredParquetInputFormat'
    assert response['Table']['StorageDescriptor']['OutputFormat'] == 'org.apache.hadoop.hive.ql.io.parquet.MapredParquetOutputFormat'
    assert response['Table']['StorageDescriptor']['Compressed'] is True
    assert response['Table']['StorageDescriptor']['SerdeInfo']['SerializationLibrary'] == 'org.apache.hadoop.hive.ql.io.parquet.serde.ParquetHiveSerDe'
    # assert response['Table']['StorageDescriptor']['SerdeInfo']['Parameters']['serialization.format'] == '1'
    assert response['Table']['PartitionKeys'] == [
        {'Name': 'event_hour', 'Type': 'string'}, 
        {'Name': 'account_id', 'Type': 'string'}, 
        {'Name': 'region', 'Type': 'string'}, 
        {'Name': '__execution_name__', 'Type': 'string'}
        ]
    assert response['Table']['TableType'] == 'EXTERNAL_TABLE'
    assert response['Table']['Parameters'] == {'partition_filtering.enabled': 'true', 'classification': 'parquet', 'has_encrypted_data': 'true'}
    
    response = AWS_GLUE.get_partition_indexes(database=centralized_database, table_name=table_name)
    assert response['PartitionIndexDescriptorList'] == []
    
    response = AWS_GLUE.get_table(database=centralized_database, name=f'{table_name}_metrics')
    assert response['Table']['Name'] == f'{table_name}_metrics'
    assert response['Table']['DatabaseName'] == centralized_database
    assert response['Table']['StorageDescriptor']['Columns'] == [
        {'Name': 'time', 'Type': 'bigint'}, 
        {'Name': 'timestamp', 'Type': 'timestamp'}, 
        {'Name': 'action', 'Type': 'string'}, 
        {'Name': 'webaclid', 'Type': 'string'}, 
        {'Name': 'webaclname', 'Type': 'string'}, 
        {'Name': 'terminatingruleid', 'Type': 'string'}, 
        {'Name': 'terminatingruletype', 'Type': 'string'}, 
        {'Name': 'httpsourceid', 'Type': 'string'}, 
        {'Name': 'httpmethod', 'Type': 'string'}, 
        {'Name': 'country', 'Type': 'string'}, 
        {'Name': 'clientip', 'Type': 'string'}, 
        {'Name': 'uri', 'Type': 'string'}, 
        {'Name': 'first_label', 'Type': 'string'},
        {'Name': 'requests', 'Type': 'bigint'}
        ]
    assert response['Table']['StorageDescriptor']['Location'] == f's3://{centralized_bucket_name}/{centralized_bucket_prefix}/{centralized_database}/{table_name}_metrics'
    assert response['Table']['StorageDescriptor']['InputFormat'] == 'org.apache.hadoop.hive.ql.io.parquet.MapredParquetInputFormat'
    assert response['Table']['StorageDescriptor']['OutputFormat'] == 'org.apache.hadoop.hive.ql.io.parquet.MapredParquetOutputFormat'
    assert response['Table']['StorageDescriptor']['Compressed'] is True
    assert response['Table']['StorageDescriptor']['SerdeInfo']['SerializationLibrary'] == 'org.apache.hadoop.hive.ql.io.parquet.serde.ParquetHiveSerDe'
    # assert response['Table']['StorageDescriptor']['SerdeInfo']['Parameters']['serialization.format'] == '1'
    assert response['Table']['PartitionKeys'] == [
        {'Name': 'event_hour', 'Type': 'string'},
        {'Name': 'account_id', 'Type': 'string'}, 
        {'Name': 'region', 'Type': 'string'}, 
        {'Name': '__execution_name__', 'Type': 'string'}
        ]
    assert response['Table']['TableType'] == 'EXTERNAL_TABLE'
    assert response['Table']['Parameters'] == {'partition_filtering.enabled': 'true', 'classification': 'parquet', 'has_encrypted_data': 'true'}
    
    response = AWS_GLUE.get_partition_indexes(database=centralized_database, table_name=f'{table_name}_metrics')
    assert response['PartitionIndexDescriptorList'] == []
    
    response = AWS_EVENTS._events_client.list_rules(NamePrefix=f'LogProcessor-{table_name}', EventBusName='default')
    assert response['Rules'][0] == {
        'Name': f'LogProcessor-{table_name}', 
        'Arn': f'arn:aws:events:{aws_region}:{account_id}:rule/LogProcessor-{table_name}', 
        'State': 'ENABLED', 
        'ScheduleExpression': processor_schedule, 
        'EventBusName': 'default'
        }
    response = AWS_EVENTS._events_client.list_targets_by_rule(Rule=f'LogProcessor-{table_name}', EventBusName='default')
    assert response['Targets'][0]['Id'] == pipeline_id
    assert response['Targets'][0]['Arn'] == log_processor_arn
    assert response['Targets'][0]['RoleArn'] == log_processor_start_execution_role
    assert json.loads(response['Targets'][0]['Input']) == {
        "metadata": {
            "pipelineId": pipeline_id,
            "sourceType": "waf",
            "scheduleType": "LogProcessor",
            "enrichmentPlugins": [],
            "s3": {
                "srcPath": f"s3://{staging_bucket_name}/AWSLogs/WAFLogs",
                "archivePath": f"s3://{staging_bucket_name}/archive/AWSLogs/WAFLogs"
            },
            "athena": {
                "tableName": table_name,
                "statements": {
                    "create": "CREATE EXTERNAL TABLE IF NOT EXISTS `tmp`.`waf{}` (`timestamp` bigint, `formatversion` int, `webaclid` string, `terminatingruleid` string, `terminatingruletype` string, `action` string, `terminatingrulematchdetails` array<struct<`conditiontype`:string,`sensitivitylevel`:string,`location`:string,`matcheddata`:array<string>>>, `httpsourcename` string, `httpsourceid` string, `rulegrouplist` array<struct<`rulegroupid`:string,`terminatingrule`:struct<`ruleid`:string,`action`:string,`rulematchdetails`:array<struct<`conditiontype`:string,`sensitivitylevel`:string,`location`:string,`matcheddata`:array<string>>>>,`nonterminatingmatchingrules`:array<struct<`ruleid`:string,`action`:string,`rulematchdetails`:array<struct<`conditiontype`:string,`sensitivitylevel`:string,`location`:string,`matcheddata`:array<string>>>>>,`excludedrules`:string>>, `ratebasedrulelist` array<struct<`ratebasedruleid`:string,`limitkey`:string,`maxrateallowed`:int>>, `nonterminatingmatchingrules` array<struct<`ruleid`:string,`action`:string,`rulematchdetails`:array<struct<`conditiontype`:string,`sensitivitylevel`:string,`location`:string,`matcheddata`:array<string>>>,`captcharesponse`:struct<`responsecode`:string,`solvetimestamp`:string>>>, `requestheadersinserted` array<struct<`name`:string,`value`:string>>, `responsecodesent` string, `httprequest` struct<`clientip`:string,`country`:string,`headers`:array<struct<`name`:string,`value`:string>>,`uri`:string,`args`:string,`httpversion`:string,`httpmethod`:string,`requestid`:string>, `labels` array<struct<`name`:string>>, `captcharesponse` struct<`responsecode`:string,`solvetimestamp`:string,`failureReason`:string>)  ROW FORMAT SERDE 'org.openx.data.jsonserde.JsonSerDe'  STORED AS INPUTFORMAT 'org.apache.hadoop.mapred.TextInputFormat' OUTPUTFORMAT 'org.apache.hadoop.hive.ql.io.HiveIgnoreKeyTextOutputFormat' LOCATION '{}' ;",
                    "drop": "DROP TABLE IF EXISTS `tmp`.`waf{}`",
                    "insert": "INSERT INTO \"centralized\".\"waf\" (\"time\", \"timestamp\", \"formatversion\", \"webaclid\", \"webaclname\", \"terminatingruleid\", \"terminatingruletype\", \"action\", \"terminatingrulematchdetails\", \"httpsourcename\", \"httpsourceid\", \"rulegrouplist\", \"ratebasedrulelist\", \"nonterminatingmatchingrules\", \"requestheadersinserted\", \"responsecodesent\", \"httprequest\", \"labels\", \"captcharesponse\", \"account_id\", \"region\", \"event_hour\", \"__execution_name__\") SELECT \"timestamp\", CAST(FROM_UNIXTIME(\"timestamp\" / 1000) AS timestamp), \"formatversion\", \"webaclid\", SPLIT(\"webaclid\", '/')[3], \"terminatingruleid\", \"terminatingruletype\", \"action\", \"terminatingrulematchdetails\", \"httpsourcename\", \"httpsourceid\", \"rulegrouplist\", \"ratebasedrulelist\", \"nonterminatingmatchingrules\", \"requestheadersinserted\", \"responsecodesent\", \"httprequest\", \"labels\", \"captcharesponse\", SPLIT(\"webaclid\", ':')[5], SPLIT(\"webaclid\", ':')[4], DATE_FORMAT(CAST(FROM_UNIXTIME(\"timestamp\" / 1000) AS timestamp), '%Y%m%d%H'), '{}' FROM \"tmp\".\"waf{}\";",
                    "aggregate": [
                        "INSERT INTO \"centralized\".\"waf_metrics\" (\"time\", \"timestamp\", \"action\", \"webaclid\", \"webaclname\", \"terminatingruleid\", \"terminatingruletype\", \"httpsourceid\", \"httpmethod\", \"country\", \"clientip\", \"uri\", \"first_label\", \"requests\", \"account_id\", \"region\", \"event_hour\", \"__execution_name__\") SELECT FLOOR(\"time\" / 60000) * 60000, DATE_TRUNC('minute', \"timestamp\"), \"action\", \"webaclid\", \"webaclname\", \"terminatingruleid\", \"terminatingruletype\", \"httpsourceid\", \"httprequest\".\"httpmethod\", \"httprequest\".\"country\", \"httprequest\".\"clientip\", \"httprequest\".\"uri\", CASE WHEN labels = ARRAY[] THEN '' ELSE labels[1].name END, CAST(COUNT(1) AS bigint), \"account_id\", \"region\", \"event_hour\", \"__execution_name__\" FROM \"centralized\".\"waf\" WHERE __execution_name__ = '{}' GROUP BY FLOOR(\"time\" / 60000) * 60000, DATE_TRUNC('minute', \"timestamp\"), \"action\", \"webaclid\", \"webaclname\", \"terminatingruleid\", \"terminatingruletype\", \"httpsourceid\", \"httprequest\".\"httpmethod\", \"httprequest\".\"country\", \"httprequest\".\"clientip\", \"httprequest\".\"uri\", CASE WHEN labels = ARRAY[] THEN '' ELSE labels[1].name END, \"account_id\", \"region\", \"event_hour\", \"__execution_name__\";"
                        ]
                    }
            },
            "notification": {
                "service": notification_service,
                "recipients": recipients.split(',')
            }
        }
    }
    
    response = AWS_EVENTS._events_client.list_rules(NamePrefix=f'LogMerger-{table_name}', EventBusName='default')
    assert response['Rules'][0] == {
        'Name': f'LogMerger-{table_name}', 
        'Arn': f'arn:aws:events:{aws_region}:{account_id}:rule/LogMerger-{table_name}', 
        'State': 'ENABLED', 
        'ScheduleExpression': merger_schedule, 
        'EventBusName': 'default'
        }
    response = AWS_EVENTS._events_client.list_targets_by_rule(Rule=f'LogMerger-{table_name}', EventBusName='default')
    assert response['Targets'][0]['Id'] == pipeline_id
    assert response['Targets'][0]['Arn'] == log_merger_arn
    assert response['Targets'][0]['RoleArn'] == log_merger_start_execution_role
    assert json.loads(response['Targets'][0]['Input']) == {
        "metadata": {
            "pipelineId": pipeline_id,
            "sourceType": "waf",
            "scheduleType": "LogMerger",
            "s3": {
                "srcPath": f"s3://{centralized_bucket_name}/{centralized_bucket_prefix}/{centralized_database}/{table_name}",
                "archivePath": f"s3://{staging_bucket_name}/archive/{centralized_bucket_prefix}/{centralized_database}/{table_name}"
            },
            "athena": {
                "firstPartitionKey": "event_hour",
                "partitionInfo": {
                    "event_hour": {
                        "type": "time",
                        "from": "%Y%m%d%H",
                        "to": "%Y%m%d00"
                    },
                    "account_id": {
                        "type": "retain"
                    },
                    "region": {
                        "type": "retain"
                    },
                    "__execution_name__": {
                        "type": "default",
                        "value": "00000000-0000-0000-0000-000000000000"
                    }
                },
                "intervalDays": int(-merger_age),
                "database": centralized_database,
                "tableName": table_name
            },
            "notification": {
                "service": notification_service,
                "recipients": recipients.split(',')
            }
        }
    }

    response = AWS_EVENTS._events_client.list_rules(NamePrefix=f'LogMergerForMetrics-{table_name}', EventBusName='default')
    assert response['Rules'][0] == {
        'Name': f'LogMergerForMetrics-{table_name}', 
        'Arn': f'arn:aws:events:{aws_region}:{account_id}:rule/LogMergerForMetrics-{table_name}', 
        'State': 'ENABLED', 
        'ScheduleExpression': merger_schedule, 
        'EventBusName': 'default'
        }
    response = AWS_EVENTS._events_client.list_targets_by_rule(Rule=f'LogMergerForMetrics-{table_name}', EventBusName='default')
    assert response['Targets'][0]['Id'] == pipeline_id
    assert response['Targets'][0]['Arn'] == log_merger_arn
    assert response['Targets'][0]['RoleArn'] == log_merger_start_execution_role
    assert json.loads(response['Targets'][0]['Input']) == {
        "metadata": {
            "pipelineId": pipeline_id,
            "sourceType": "waf",
            "scheduleType": "LogMergerForMetrics",
            "s3": {
                "srcPath": f"s3://{centralized_bucket_name}/{centralized_bucket_prefix}/{centralized_database}/{table_name}_metrics",
                "archivePath": f"s3://{staging_bucket_name}/archive/{centralized_bucket_prefix}/{centralized_database}/{table_name}_metrics"
            },
            "athena": {
                "firstPartitionKey": "event_hour",
                "partitionInfo": {
                    "event_hour": {
                        "type": "time",
                        "from": "%Y%m%d%H",
                        "to": "%Y%m%d00"
                    },
                    "account_id": {
                        "type": "retain"
                    },
                    "region": {
                        "type": "retain"
                    },
                    "__execution_name__": {
                        "type": "default",
                        "value": "00000000-0000-0000-0000-000000000000"
                    }
                },
                "intervalDays": int(-merger_age),
                "database": centralized_database,
                "tableName": f'{table_name}_metrics'
            },
            "notification": {
                "service": notification_service,
                "recipients": recipients.split(',')
            }
        }
    }
    
    response = AWS_EVENTS._events_client.list_rules(NamePrefix=f'LogArchive-{table_name}', EventBusName='default')
    assert response['Rules'][0] == {
        'Name': f'LogArchive-{table_name}', 
        'Arn': f'arn:aws:events:{aws_region}:{account_id}:rule/LogArchive-{table_name}', 
        'State': 'ENABLED', 
        'ScheduleExpression': archive_schedule, 
        'EventBusName': 'default'
        }
    response = AWS_EVENTS._events_client.list_targets_by_rule(Rule=f'LogArchive-{table_name}', EventBusName='default')
    assert response['Targets'][0]['Id'] == pipeline_id
    assert response['Targets'][0]['Arn'] == log_archive_arn
    assert response['Targets'][0]['RoleArn'] == log_archive_start_execution_role
    assert json.loads(response['Targets'][0]['Input']) == {
        "metadata": {
            "pipelineId": pipeline_id,
            "sourceType": "waf",
            "scheduleType": "LogArchive",
            "s3": {
                "srcPath": f"s3://{centralized_bucket_name}/{centralized_bucket_prefix}/{centralized_database}/{table_name}",
                "archivePath": f"s3://{staging_bucket_name}/archive/{centralized_bucket_prefix}/{centralized_database}/{table_name}"
            },
            "athena": {
                'firstPartitionKey': 'event_hour',
                "intervalDays": int(-archive_age),
                "database": centralized_database,
                "tableName": table_name,
            },
            "notification": {
                "service": notification_service,
                "recipients": recipients.split(',')
            }
        }
    }
    
    response = AWS_EVENTS._events_client.list_targets_by_rule(Rule=f'LogArchiveForMetrics-{table_name}', EventBusName='default')
    assert response['Targets'][0]['Id'] == pipeline_id
    assert response['Targets'][0]['Arn'] == log_archive_arn
    assert response['Targets'][0]['RoleArn'] == log_archive_start_execution_role
    assert json.loads(response['Targets'][0]['Input']) == {
        "metadata": {
            "pipelineId": pipeline_id,
            "sourceType": "waf",
            "scheduleType": "LogArchiveForMetrics",
            "s3": {
                "srcPath": f"s3://{centralized_bucket_name}/{centralized_bucket_prefix}/{centralized_database}/{table_name}_metrics",
                "archivePath": f"s3://{staging_bucket_name}/archive/{centralized_bucket_prefix}/{centralized_database}/{table_name}_metrics"
            },
            "athena": {
                'firstPartitionKey': 'event_hour',
                "intervalDays": int(-archive_age),
                "database": centralized_database,
                "tableName": f"{table_name}_metrics",
            },
            "notification": {
                "service": notification_service,
                "recipients": recipients.split(',')
            }
        }
    }

    response = AWS_IAM.get_policy_document(arn=s3_public_access_policy_arn)
    assert response['Document']['Statement'] == [
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
                    "s3:DeleteObject"
                ],
                "Resource": [
                    f"arn:aws:s3:::{staging_bucket_name}",
                    f"arn:aws:s3:::{staging_bucket_name}/*"
                ],
                "Effect": "Allow"
            },
        {
            'Sid': 'S3AccessPolicyForDestination',
            'Effect': 'Allow', 
            'Action': [
                's3:ListBucket', 
                's3:ListBucketMultipartUploads', 
                's3:ListMultipartUploadParts', 
                's3:GetObject', 
                's3:GetBucketLocation', 
                's3:AbortMultipartUpload', 
                's3:CreateBucket', 
                's3:PutObject', 
                's3:DeleteObject'
                ], 
            'Resource': [
                f'arn:aws:s3:::{logging_bucket_name}', 
                f'arn:aws:s3:::{logging_bucket_name}/*',
                f'arn:aws:s3:::{centralized_bucket_name}/{centralized_bucket_prefix}/{centralized_database}/{table_name}*',
                f'arn:aws:s3:::{centralized_bucket_name}',
                f'arn:aws:s3:::{centralized_bucket_name}/{centralized_bucket_prefix}/{centralized_database}/{table_name}_metrics*'], 
            }
        ]
    lambda_handler(delete_pipeline_event, context)
    
    pipeline_id = str(uuid.uuid4())
    pipeline_info = copy.deepcopy(waf_pipeline_info)
    pipeline_info['data']['scheduler'].pop('service', None)
    create_pipeline_event = copy.deepcopy(create_waf_pipeline_event)
    create_pipeline_event['ResourceProperties']['Id'] = pipeline_id
    delete_pipeline_event = copy.deepcopy(delete_waf_pipeline_event)
    delete_pipeline_event['ResourceProperties']['Id'] = pipeline_id
    AWS_DDB_META.put(meta_name=pipeline_id, item=pipeline_info)
    
    lambda_handler(create_pipeline_event, context)
    
    response = AWS_EVENTS._events_client.list_rules(NamePrefix=f'LogProcessor-{table_name}', EventBusName='default')
    assert response['Rules'][0] == {
        'Name': f'LogProcessor-{table_name}', 
        'Arn': f'arn:aws:events:{aws_region}:{account_id}:rule/LogProcessor-{table_name}', 
        'State': 'ENABLED', 
        'ScheduleExpression': processor_schedule, 
        'EventBusName': 'default'
        }
    response = AWS_EVENTS._events_client.list_targets_by_rule(Rule=f'LogProcessor-{table_name}', EventBusName='default')
    assert response['Targets'][0]['Id'] == pipeline_id
    assert response['Targets'][0]['Arn'] == log_processor_arn
    assert response['Targets'][0]['RoleArn'] == log_processor_start_execution_role
    assert json.loads(response['Targets'][0]['Input']) == {
        "metadata": {
            "pipelineId": pipeline_id,
            "sourceType": "waf",
            "scheduleType": "LogProcessor",
            "enrichmentPlugins": [],
            "s3": {
                "srcPath": f"s3://{staging_bucket_name}/AWSLogs/WAFLogs",
                "archivePath": f"s3://{staging_bucket_name}/archive/AWSLogs/WAFLogs"
            },
            "athena": {
                "tableName": table_name,
                "statements": {
                    "create": "CREATE EXTERNAL TABLE IF NOT EXISTS `tmp`.`waf{}` (`timestamp` bigint, `formatversion` int, `webaclid` string, `terminatingruleid` string, `terminatingruletype` string, `action` string, `terminatingrulematchdetails` array<struct<`conditiontype`:string,`sensitivitylevel`:string,`location`:string,`matcheddata`:array<string>>>, `httpsourcename` string, `httpsourceid` string, `rulegrouplist` array<struct<`rulegroupid`:string,`terminatingrule`:struct<`ruleid`:string,`action`:string,`rulematchdetails`:array<struct<`conditiontype`:string,`sensitivitylevel`:string,`location`:string,`matcheddata`:array<string>>>>,`nonterminatingmatchingrules`:array<struct<`ruleid`:string,`action`:string,`rulematchdetails`:array<struct<`conditiontype`:string,`sensitivitylevel`:string,`location`:string,`matcheddata`:array<string>>>>>,`excludedrules`:string>>, `ratebasedrulelist` array<struct<`ratebasedruleid`:string,`limitkey`:string,`maxrateallowed`:int>>, `nonterminatingmatchingrules` array<struct<`ruleid`:string,`action`:string,`rulematchdetails`:array<struct<`conditiontype`:string,`sensitivitylevel`:string,`location`:string,`matcheddata`:array<string>>>,`captcharesponse`:struct<`responsecode`:string,`solvetimestamp`:string>>>, `requestheadersinserted` array<struct<`name`:string,`value`:string>>, `responsecodesent` string, `httprequest` struct<`clientip`:string,`country`:string,`headers`:array<struct<`name`:string,`value`:string>>,`uri`:string,`args`:string,`httpversion`:string,`httpmethod`:string,`requestid`:string>, `labels` array<struct<`name`:string>>, `captcharesponse` struct<`responsecode`:string,`solvetimestamp`:string,`failureReason`:string>)  ROW FORMAT SERDE 'org.openx.data.jsonserde.JsonSerDe'  STORED AS INPUTFORMAT 'org.apache.hadoop.mapred.TextInputFormat' OUTPUTFORMAT 'org.apache.hadoop.hive.ql.io.HiveIgnoreKeyTextOutputFormat' LOCATION '{}' ;",
                    "drop": "DROP TABLE IF EXISTS `tmp`.`waf{}`",
                    "insert": "INSERT INTO \"centralized\".\"waf\" (\"time\", \"timestamp\", \"formatversion\", \"webaclid\", \"webaclname\", \"terminatingruleid\", \"terminatingruletype\", \"action\", \"terminatingrulematchdetails\", \"httpsourcename\", \"httpsourceid\", \"rulegrouplist\", \"ratebasedrulelist\", \"nonterminatingmatchingrules\", \"requestheadersinserted\", \"responsecodesent\", \"httprequest\", \"labels\", \"captcharesponse\", \"account_id\", \"region\", \"event_hour\", \"__execution_name__\") SELECT \"timestamp\", CAST(FROM_UNIXTIME(\"timestamp\" / 1000) AS timestamp), \"formatversion\", \"webaclid\", SPLIT(\"webaclid\", '/')[3], \"terminatingruleid\", \"terminatingruletype\", \"action\", \"terminatingrulematchdetails\", \"httpsourcename\", \"httpsourceid\", \"rulegrouplist\", \"ratebasedrulelist\", \"nonterminatingmatchingrules\", \"requestheadersinserted\", \"responsecodesent\", \"httprequest\", \"labels\", \"captcharesponse\", SPLIT(\"webaclid\", ':')[5], SPLIT(\"webaclid\", ':')[4], DATE_FORMAT(CAST(FROM_UNIXTIME(\"timestamp\" / 1000) AS timestamp), '%Y%m%d%H'), '{}' FROM \"tmp\".\"waf{}\";",
                    "aggregate": [
                        "INSERT INTO \"centralized\".\"waf_metrics\" (\"time\", \"timestamp\", \"action\", \"webaclid\", \"webaclname\", \"terminatingruleid\", \"terminatingruletype\", \"httpsourceid\", \"httpmethod\", \"country\", \"clientip\", \"uri\", \"first_label\", \"requests\", \"account_id\", \"region\", \"event_hour\", \"__execution_name__\") SELECT FLOOR(\"time\" / 60000) * 60000, DATE_TRUNC('minute', \"timestamp\"), \"action\", \"webaclid\", \"webaclname\", \"terminatingruleid\", \"terminatingruletype\", \"httpsourceid\", \"httprequest\".\"httpmethod\", \"httprequest\".\"country\", \"httprequest\".\"clientip\", \"httprequest\".\"uri\", CASE WHEN labels = ARRAY[] THEN '' ELSE labels[1].name END, CAST(COUNT(1) AS bigint), \"account_id\", \"region\", \"event_hour\", \"__execution_name__\" FROM \"centralized\".\"waf\" WHERE __execution_name__ = '{}' GROUP BY FLOOR(\"time\" / 60000) * 60000, DATE_TRUNC('minute', \"timestamp\"), \"action\", \"webaclid\", \"webaclname\", \"terminatingruleid\", \"terminatingruletype\", \"httpsourceid\", \"httprequest\".\"httpmethod\", \"httprequest\".\"country\", \"httprequest\".\"clientip\", \"httprequest\".\"uri\", CASE WHEN labels = ARRAY[] THEN '' ELSE labels[1].name END, \"account_id\", \"region\", \"event_hour\", \"__execution_name__\";"
                        ]
                    }
            },
            "notification": {
                "service": notification_service,
                "recipients": recipients.split(',')
            }
        }
    }
    
    response = AWS_EVENTS._events_client.list_rules(NamePrefix=f'LogMerger-{table_name}', EventBusName='default')
    assert response['Rules'][0] == {
        'Name': f'LogMerger-{table_name}', 
        'Arn': f'arn:aws:events:{aws_region}:{account_id}:rule/LogMerger-{table_name}', 
        'State': 'ENABLED', 
        'ScheduleExpression': merger_schedule, 
        'EventBusName': 'default'
        }
    response = AWS_EVENTS._events_client.list_targets_by_rule(Rule=f'LogMerger-{table_name}', EventBusName='default')
    assert response['Targets'][0]['Id'] == pipeline_id
    assert response['Targets'][0]['Arn'] == log_merger_arn
    assert response['Targets'][0]['RoleArn'] == log_merger_start_execution_role
    assert json.loads(response['Targets'][0]['Input']) == {
        "metadata": {
            "pipelineId": pipeline_id,
            "sourceType": "waf",
            "scheduleType": "LogMerger",
            "s3": {
                "srcPath": f"s3://{centralized_bucket_name}/{centralized_bucket_prefix}/{centralized_database}/{table_name}",
                "archivePath": f"s3://{staging_bucket_name}/archive/{centralized_bucket_prefix}/{centralized_database}/{table_name}"
            },
            "athena": {
                "firstPartitionKey": "event_hour",
                "partitionInfo": {
                    "event_hour": {
                        "type": "time",
                        "from": "%Y%m%d%H",
                        "to": "%Y%m%d00"
                    },
                    "account_id": {
                        "type": "retain"
                    },
                    "region": {
                        "type": "retain"
                    },
                    "__execution_name__": {
                        "type": "default",
                        "value": "00000000-0000-0000-0000-000000000000"
                    }
                },
                "intervalDays": int(-merger_age),
                "database": centralized_database,
                "tableName": table_name
            },
            "notification": {
                "service": notification_service,
                "recipients": recipients.split(',')
            }
        }
    }

    response = AWS_EVENTS._events_client.list_rules(NamePrefix=f'LogMergerForMetrics-{table_name}', EventBusName='default')
    assert response['Rules'][0] == {
        'Name': f'LogMergerForMetrics-{table_name}', 
        'Arn': f'arn:aws:events:{aws_region}:{account_id}:rule/LogMergerForMetrics-{table_name}', 
        'State': 'ENABLED', 
        'ScheduleExpression': merger_schedule, 
        'EventBusName': 'default'
        }
    response = AWS_EVENTS._events_client.list_targets_by_rule(Rule=f'LogMergerForMetrics-{table_name}', EventBusName='default')
    assert response['Targets'][0]['Id'] == pipeline_id
    assert response['Targets'][0]['Arn'] == log_merger_arn
    assert response['Targets'][0]['RoleArn'] == log_merger_start_execution_role
    assert json.loads(response['Targets'][0]['Input']) == {
        "metadata": {
            "pipelineId": pipeline_id,
            "sourceType": "waf",
            "scheduleType": "LogMergerForMetrics",
            "s3": {
                "srcPath": f"s3://{centralized_bucket_name}/{centralized_bucket_prefix}/{centralized_database}/{table_name}_metrics",
                "archivePath": f"s3://{staging_bucket_name}/archive/{centralized_bucket_prefix}/{centralized_database}/{table_name}_metrics"
            },
            "athena": {
                "firstPartitionKey": "event_hour",
                "partitionInfo": {
                    "event_hour": {
                        "type": "time",
                        "from": "%Y%m%d%H",
                        "to": "%Y%m%d00"
                    },
                    "account_id": {
                        "type": "retain"
                    },
                    "region": {
                        "type": "retain"
                    },
                    "__execution_name__": {
                        "type": "default",
                        "value": "00000000-0000-0000-0000-000000000000"
                    }
                },
                "intervalDays": int(-merger_age),
                "database": centralized_database,
                "tableName": f'{table_name}_metrics'
            },
            "notification": {
                "service": notification_service,
                "recipients": recipients.split(',')
            }
        }
    }
    
    response = AWS_EVENTS._events_client.list_rules(NamePrefix=f'LogArchive-{table_name}', EventBusName='default')
    assert response['Rules'][0] == {
        'Name': f'LogArchive-{table_name}', 
        'Arn': f'arn:aws:events:{aws_region}:{account_id}:rule/LogArchive-{table_name}', 
        'State': 'ENABLED', 
        'ScheduleExpression': archive_schedule, 
        'EventBusName': 'default'
        }
    response = AWS_EVENTS._events_client.list_targets_by_rule(Rule=f'LogArchive-{table_name}', EventBusName='default')
    assert response['Targets'][0]['Id'] == pipeline_id
    assert response['Targets'][0]['Arn'] == log_archive_arn
    assert response['Targets'][0]['RoleArn'] == log_archive_start_execution_role
    assert json.loads(response['Targets'][0]['Input']) == {
        "metadata": {
            "pipelineId": pipeline_id,
            "sourceType": "waf",
            "scheduleType": "LogArchive",
            "s3": {
                "srcPath": f"s3://{centralized_bucket_name}/{centralized_bucket_prefix}/{centralized_database}/{table_name}",
                "archivePath": f"s3://{staging_bucket_name}/archive/{centralized_bucket_prefix}/{centralized_database}/{table_name}"
            },
            "athena": {
                'firstPartitionKey': 'event_hour',
                "intervalDays": int(-archive_age),
                "database": centralized_database,
                "tableName": table_name,
            },
            "notification": {
                "service": notification_service,
                "recipients": recipients.split(',')
            }
        }
    }
    response = AWS_EVENTS._events_client.list_rules(NamePrefix=f'LogArchive-{table_name}', EventBusName='default')
    assert response['Rules'][0] == {
        'Name': f'LogArchive-{table_name}', 
        'Arn': f'arn:aws:events:{aws_region}:{account_id}:rule/LogArchive-{table_name}', 
        'State': 'ENABLED', 
        'ScheduleExpression': archive_schedule, 
        'EventBusName': 'default'
        }
    response = AWS_EVENTS._events_client.list_targets_by_rule(Rule=f'LogArchiveForMetrics-{table_name}', EventBusName='default')
    assert response['Targets'][0]['Id'] == pipeline_id
    assert response['Targets'][0]['Arn'] == log_archive_arn
    assert response['Targets'][0]['RoleArn'] == log_archive_start_execution_role
    assert json.loads(response['Targets'][0]['Input']) == {
        "metadata": {
            "pipelineId": pipeline_id,
            "sourceType": "waf",
            "scheduleType": "LogArchiveForMetrics",
            "s3": {
                "srcPath": f"s3://{centralized_bucket_name}/{centralized_bucket_prefix}/{centralized_database}/{table_name}_metrics",
                "archivePath": f"s3://{staging_bucket_name}/archive/{centralized_bucket_prefix}/{centralized_database}/{table_name}_metrics"
            },
            "athena": {
                'firstPartitionKey': 'event_hour',
                "intervalDays": int(-archive_age),
                "database": centralized_database,
                "tableName": f"{table_name}_metrics",
            },
            "notification": {
                "service": notification_service,
                "recipients": recipients.split(',')
            }
        }
    }
    lambda_handler(delete_pipeline_event, context)
    
    pipeline_id = str(uuid.uuid4())
    pipeline_info = copy.deepcopy(waf_pipeline_info)
    pipeline_info['data']['scheduler']['service'] = 'scheduler'
    create_pipeline_event = copy.deepcopy(create_waf_pipeline_event)
    create_pipeline_event['ResourceProperties']['Id'] = pipeline_id
    delete_pipeline_event = copy.deepcopy(delete_waf_pipeline_event)
    delete_pipeline_event['ResourceProperties']['Id'] = pipeline_id
    AWS_DDB_META.put(meta_name='AvailableServices', item={'value': ['scheduler']})
    AWS_DDB_META.put(meta_name=pipeline_id, item=pipeline_info)
    
    lambda_handler(create_pipeline_event, context)
    
    response = AWS_SCHEDULER.get_schedule_group(name=pipeline_id)
    assert response['Arn'] == f'arn:aws:scheduler:{aws_region}:{account_id}:schedule-group/{pipeline_id}'
    
    response = AWS_SCHEDULER.get_schedule(name='LogProcessor', group_name=pipeline_id)
    assert response['Arn'] == f'arn:aws:scheduler:{aws_region}:{account_id}:schedule/{pipeline_id}/LogProcessor'
    assert response['FlexibleTimeWindow'] == {'Mode': 'OFF'}
    assert response['GroupName'] == pipeline_id
    assert response['ScheduleExpression'] == processor_schedule
    assert response['State'] == 'ENABLED'
    assert response['Target']['Arn'] == log_processor_arn
    
    assert json.loads(response['Target']['Input']) == {
        "metadata": {
            "pipelineId": pipeline_id,
            "sourceType": "waf",
            "scheduleType": "LogProcessor",
            "enrichmentPlugins": [],
            "s3": {
                "srcPath": f"s3://{staging_bucket_name}/AWSLogs/WAFLogs",
                "archivePath": f"s3://{staging_bucket_name}/archive/AWSLogs/WAFLogs"
            },
            "athena": {
                "tableName": table_name,
                "statements": {
                    "create": "CREATE EXTERNAL TABLE IF NOT EXISTS `tmp`.`waf{}` (`timestamp` bigint, `formatversion` int, `webaclid` string, `terminatingruleid` string, `terminatingruletype` string, `action` string, `terminatingrulematchdetails` array<struct<`conditiontype`:string,`sensitivitylevel`:string,`location`:string,`matcheddata`:array<string>>>, `httpsourcename` string, `httpsourceid` string, `rulegrouplist` array<struct<`rulegroupid`:string,`terminatingrule`:struct<`ruleid`:string,`action`:string,`rulematchdetails`:array<struct<`conditiontype`:string,`sensitivitylevel`:string,`location`:string,`matcheddata`:array<string>>>>,`nonterminatingmatchingrules`:array<struct<`ruleid`:string,`action`:string,`rulematchdetails`:array<struct<`conditiontype`:string,`sensitivitylevel`:string,`location`:string,`matcheddata`:array<string>>>>>,`excludedrules`:string>>, `ratebasedrulelist` array<struct<`ratebasedruleid`:string,`limitkey`:string,`maxrateallowed`:int>>, `nonterminatingmatchingrules` array<struct<`ruleid`:string,`action`:string,`rulematchdetails`:array<struct<`conditiontype`:string,`sensitivitylevel`:string,`location`:string,`matcheddata`:array<string>>>,`captcharesponse`:struct<`responsecode`:string,`solvetimestamp`:string>>>, `requestheadersinserted` array<struct<`name`:string,`value`:string>>, `responsecodesent` string, `httprequest` struct<`clientip`:string,`country`:string,`headers`:array<struct<`name`:string,`value`:string>>,`uri`:string,`args`:string,`httpversion`:string,`httpmethod`:string,`requestid`:string>, `labels` array<struct<`name`:string>>, `captcharesponse` struct<`responsecode`:string,`solvetimestamp`:string,`failureReason`:string>)  ROW FORMAT SERDE 'org.openx.data.jsonserde.JsonSerDe'  STORED AS INPUTFORMAT 'org.apache.hadoop.mapred.TextInputFormat' OUTPUTFORMAT 'org.apache.hadoop.hive.ql.io.HiveIgnoreKeyTextOutputFormat' LOCATION '{}' ;",
                    "drop": "DROP TABLE IF EXISTS `tmp`.`waf{}`",
                    "insert": "INSERT INTO \"centralized\".\"waf\" (\"time\", \"timestamp\", \"formatversion\", \"webaclid\", \"webaclname\", \"terminatingruleid\", \"terminatingruletype\", \"action\", \"terminatingrulematchdetails\", \"httpsourcename\", \"httpsourceid\", \"rulegrouplist\", \"ratebasedrulelist\", \"nonterminatingmatchingrules\", \"requestheadersinserted\", \"responsecodesent\", \"httprequest\", \"labels\", \"captcharesponse\", \"account_id\", \"region\", \"event_hour\", \"__execution_name__\") SELECT \"timestamp\", CAST(FROM_UNIXTIME(\"timestamp\" / 1000) AS timestamp), \"formatversion\", \"webaclid\", SPLIT(\"webaclid\", '/')[3], \"terminatingruleid\", \"terminatingruletype\", \"action\", \"terminatingrulematchdetails\", \"httpsourcename\", \"httpsourceid\", \"rulegrouplist\", \"ratebasedrulelist\", \"nonterminatingmatchingrules\", \"requestheadersinserted\", \"responsecodesent\", \"httprequest\", \"labels\", \"captcharesponse\", SPLIT(\"webaclid\", ':')[5], SPLIT(\"webaclid\", ':')[4], DATE_FORMAT(CAST(FROM_UNIXTIME(\"timestamp\" / 1000) AS timestamp), '%Y%m%d%H'), '{}' FROM \"tmp\".\"waf{}\";",
                    "aggregate": [
                        "INSERT INTO \"centralized\".\"waf_metrics\" (\"time\", \"timestamp\", \"action\", \"webaclid\", \"webaclname\", \"terminatingruleid\", \"terminatingruletype\", \"httpsourceid\", \"httpmethod\", \"country\", \"clientip\", \"uri\", \"first_label\", \"requests\", \"account_id\", \"region\", \"event_hour\", \"__execution_name__\") SELECT FLOOR(\"time\" / 60000) * 60000, DATE_TRUNC('minute', \"timestamp\"), \"action\", \"webaclid\", \"webaclname\", \"terminatingruleid\", \"terminatingruletype\", \"httpsourceid\", \"httprequest\".\"httpmethod\", \"httprequest\".\"country\", \"httprequest\".\"clientip\", \"httprequest\".\"uri\", CASE WHEN labels = ARRAY[] THEN '' ELSE labels[1].name END, CAST(COUNT(1) AS bigint), \"account_id\", \"region\", \"event_hour\", \"__execution_name__\" FROM \"centralized\".\"waf\" WHERE __execution_name__ = '{}' GROUP BY FLOOR(\"time\" / 60000) * 60000, DATE_TRUNC('minute', \"timestamp\"), \"action\", \"webaclid\", \"webaclname\", \"terminatingruleid\", \"terminatingruletype\", \"httpsourceid\", \"httprequest\".\"httpmethod\", \"httprequest\".\"country\", \"httprequest\".\"clientip\", \"httprequest\".\"uri\", CASE WHEN labels = ARRAY[] THEN '' ELSE labels[1].name END, \"account_id\", \"region\", \"event_hour\", \"__execution_name__\";"
                        ]
                    }
                },
            "notification": {
                "service": notification_service,
                "recipients": recipients.split(',')
            }
        }
    }
    assert response['Target']['RoleArn'] == log_processor_start_execution_role
    
    response = AWS_SCHEDULER.get_schedule(name='LogMerger', group_name=pipeline_id)
    assert response['Arn'] == f'arn:aws:scheduler:{aws_region}:{account_id}:schedule/{pipeline_id}/LogMerger'
    assert response['FlexibleTimeWindow'] == {'Mode': 'FLEXIBLE', 'MaximumWindowInMinutes': 30}
    assert response['GroupName'] == pipeline_id
    assert response['ScheduleExpression'] == merger_schedule
    assert response['State'] == 'ENABLED'
    assert response['Target']['Arn'] == log_merger_arn
    
    assert json.loads(response['Target']['Input']) == {
        "metadata": {
            "pipelineId": pipeline_id,
            "sourceType": "waf",
            "scheduleType": "LogMerger",
            "s3": {
                "srcPath": f"s3://{centralized_bucket_name}/{centralized_bucket_prefix}/{centralized_database}/{table_name}",
                "archivePath": f"s3://{staging_bucket_name}/archive/{centralized_bucket_prefix}/{centralized_database}/{table_name}"
            },
            "athena": {
                "firstPartitionKey": "event_hour",
                "partitionInfo": {
                    "event_hour": {
                        "type": "time",
                        "from": "%Y%m%d%H",
                        "to": "%Y%m%d00"
                    },
                    "account_id": {
                        "type": "retain"
                    },
                    "region": {
                        "type": "retain"
                    },
                    "__execution_name__": {
                        "type": "default",
                        "value": "00000000-0000-0000-0000-000000000000"
                    }
                },
                "intervalDays": int(-merger_age),
                "database": centralized_database,
                "tableName": table_name
            },
            "notification": {
                "service": notification_service,
                "recipients": recipients.split(',')
            }
        }
    }
    assert response['Target']['RoleArn'] == log_merger_start_execution_role
    
    response = AWS_SCHEDULER.get_schedule(name='LogMergerForMetrics', group_name=pipeline_id)
    assert response['Arn'] == f'arn:aws:scheduler:{aws_region}:{account_id}:schedule/{pipeline_id}/LogMergerForMetrics'
    assert response['FlexibleTimeWindow'] == {'Mode': 'FLEXIBLE', 'MaximumWindowInMinutes': 30}
    assert response['GroupName'] == pipeline_id
    assert response['ScheduleExpression'] == merger_schedule
    assert response['State'] == 'ENABLED'
    assert response['Target']['Arn'] == log_merger_arn
    
    assert json.loads(response['Target']['Input']) == {
        "metadata": {
            "pipelineId": pipeline_id,
            "sourceType": "waf",
            "scheduleType": "LogMergerForMetrics",
            "s3": {
                "srcPath": f"s3://{centralized_bucket_name}/{centralized_bucket_prefix}/{centralized_database}/{table_name}_metrics",
                "archivePath": f"s3://{staging_bucket_name}/archive/{centralized_bucket_prefix}/{centralized_database}/{table_name}_metrics"
            },
            "athena": {
                "firstPartitionKey": "event_hour",
                "partitionInfo": {
                    "event_hour": {
                        "type": "time",
                        "from": "%Y%m%d%H",
                        "to": "%Y%m%d00"
                    },
                    "account_id": {
                        "type": "retain"
                    },
                    "region": {
                        "type": "retain"
                    },
                    "__execution_name__": {
                        "type": "default",
                        "value": "00000000-0000-0000-0000-000000000000"
                    }
                },
                "intervalDays": int(-merger_age),
                "database": centralized_database,
                "tableName": f"{table_name}_metrics",
            },
            "notification": {
                "service": notification_service,
                "recipients": recipients.split(',')
            }
        }
    }
    assert response['Target']['RoleArn'] == log_merger_start_execution_role
    
    response = AWS_SCHEDULER.get_schedule(name='LogArchive', group_name=pipeline_id)
    assert response['Arn'] == f'arn:aws:scheduler:{aws_region}:{account_id}:schedule/{pipeline_id}/LogArchive'
    assert response['FlexibleTimeWindow'] == {'Mode': 'FLEXIBLE', 'MaximumWindowInMinutes': 30}
    assert response['GroupName'] == pipeline_id
    assert response['ScheduleExpression'] == archive_schedule
    assert response['State'] == 'ENABLED'
    assert response['Target']['Arn'] == log_archive_arn
    
    assert json.loads(response['Target']['Input']) == {
        "metadata": {
            "pipelineId": pipeline_id,
            "sourceType": "waf",
            "scheduleType": "LogArchive",
            "s3": {
                "srcPath": f"s3://{centralized_bucket_name}/{centralized_bucket_prefix}/{centralized_database}/{table_name}",
                "archivePath": f"s3://{staging_bucket_name}/archive/{centralized_bucket_prefix}/{centralized_database}/{table_name}"
            },
            "athena": {
                'firstPartitionKey': 'event_hour',
                "intervalDays": int(-archive_age),
                "database": centralized_database,
                "tableName": table_name,
            },
            "notification": {
                "service": notification_service,
                "recipients": recipients.split(',')
            }
        }
    }
    assert response['Target']['RoleArn'] == log_archive_start_execution_role
    
    response = AWS_SCHEDULER.get_schedule(name='LogArchiveForMetrics', group_name=pipeline_id)
    assert response['Arn'] == f'arn:aws:scheduler:{aws_region}:{account_id}:schedule/{pipeline_id}/LogArchiveForMetrics'
    assert response['FlexibleTimeWindow'] == {'Mode': 'FLEXIBLE', 'MaximumWindowInMinutes': 30}
    assert response['GroupName'] == pipeline_id
    assert response['ScheduleExpression'] == archive_schedule
    assert response['State'] == 'ENABLED'
    assert response['Target']['Arn'] == log_archive_arn
    
    assert json.loads(response['Target']['Input']) == {
        "metadata": {
            "pipelineId": pipeline_id,
            "sourceType": "waf",
            "scheduleType": "LogArchiveForMetrics",
            "s3": {
                "srcPath": f"s3://{centralized_bucket_name}/{centralized_bucket_prefix}/{centralized_database}/{table_name}_metrics",
                "archivePath": f"s3://{staging_bucket_name}/archive/{centralized_bucket_prefix}/{centralized_database}/{table_name}_metrics"
            },
            "athena": {
                'firstPartitionKey': 'event_hour',
                "intervalDays": int(-archive_age),
                "database": centralized_database,
                "tableName": f"{table_name}_metrics",
            },
            "notification": {
                "service": notification_service,
                "recipients": recipients.split(',')
            }
        }
    }
    assert response['Target']['RoleArn'] == log_archive_start_execution_role
    
    # test delete pipeline
    delete_pipeline_event = copy.deepcopy(delete_waf_pipeline_event)
    delete_pipeline_event['ResourceProperties']['Id'] = 'do-not-exists'
    assert lambda_handler(delete_pipeline_event, context) is None
    
    os.environ['SCHEDULE_SERVICE'] = 'events'
    pipeline_id = str(uuid.uuid4())
    pipeline_info = copy.deepcopy(waf_pipeline_info)
    ingestion_id = str(uuid.uuid4())
    ingestion_info = copy.deepcopy(waf_ingestion_info)
    ingestion_info['pipelineId'] = pipeline_id
    create_pipeline_event = copy.deepcopy(create_waf_pipeline_event)
    create_pipeline_event['ResourceProperties']['Id'] = pipeline_id
    delete_pipeline_event = copy.deepcopy(delete_waf_pipeline_event)
    delete_pipeline_event['ResourceProperties']['Id'] = pipeline_id
    create_ingestion_event = copy.deepcopy(create_waf_ingestion_event)
    create_ingestion_event['ResourceProperties']['Id'] = ingestion_id
    AWS_DDB_META.put(meta_name=pipeline_id, item=pipeline_info)
    AWS_DDB_META.put(meta_name=ingestion_id, item=ingestion_info)
    
    lambda_handler(create_pipeline_event, context)
    lambda_handler(create_ingestion_event, context)
    lambda_handler(delete_pipeline_event, context)
    
    response = AWS_GLUE.get_table(database=centralized_database, name=table_name)
    assert response == {}

    response = AWS_GLUE.get_table(database=centralized_database, name=f'{table_name}_metrics')
    assert response == {}
    
    response = AWS_SCHEDULER.get_schedule_group(name=pipeline_id)
    assert response == {}
    
    response = AWS_EVENTS._events_client.list_rules(NamePrefix=f'LogProcessor-{table_name}', EventBusName='default')
    assert response['Rules'] == []
    
    response = AWS_EVENTS._events_client.list_rules(NamePrefix=f'LogMerger-{table_name}', EventBusName='default')
    assert response['Rules'] == []
    
    response = AWS_EVENTS._events_client.list_rules(NamePrefix=f'LogMergerForMetrics-{table_name}', EventBusName='default')
    assert response['Rules'] == []
    
    response = AWS_EVENTS._events_client.list_rules(NamePrefix=f'LogArchive-{table_name}', EventBusName='default')
    assert response['Rules'] == []
    
    response = AWS_EVENTS._events_client.list_rules(NamePrefix=f'LogArchiveForMetrics-{table_name}', EventBusName='default')
    assert response['Rules'] == []
    
    response = AWS_IAM.get_policy_document(arn=s3_public_access_policy_arn)
    assert response['Document']['Statement'] == [
        {
            'Action': [
                's3:ListBucket', 
                's3:ListBucketMultipartUploads', 
                's3:ListMultipartUploadParts', 
                's3:GetObject', 
                's3:GetBucketLocation', 
                's3:AbortMultipartUpload', 
                's3:CreateBucket', 
                's3:PutObject', 
                's3:DeleteObject'], 
            'Resource': [
                f'arn:aws:s3:::{staging_bucket_name}', 
                f'arn:aws:s3:::{staging_bucket_name}/*'], 
            'Effect': 'Allow'
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
                    "s3:DeleteObject"
                ],
                "Resource": [
                    f"arn:aws:s3:::{logging_bucket_name}",
                    f"arn:aws:s3:::{logging_bucket_name}/*"
                ],
                "Effect": "Allow"
            }
        ]
    
    replication_sqs_url = AWS_SQS.get_queue_url(name=replication_sqs_name)
        
    response = AWS_SQS.get_queue_policy(url=replication_sqs_url)
    assert response['Statement'] == []
    
    replication_dlq_url = AWS_SQS.get_queue_url(name=replication_dlq_name)
    response = AWS_SQS.get_queue_policy(url=replication_dlq_url)
    assert response['Statement'] == []

    response = AWS_S3.get_bucket_policy(bucket=logging_bucket_name)
    assert response['Statement'] == []
    
    response = AWS_S3.get_bucket_notification(bucket=logging_bucket_name)
    assert response == {}
    
    os.environ.pop('SCHEDULE_SERVICE', None)
    pipeline_id = str(uuid.uuid4())
    pipeline_info = copy.deepcopy(waf_pipeline_info)
    ingestion_id = str(uuid.uuid4())
    ingestion_info = copy.deepcopy(waf_ingestion_info)
    ingestion_info['pipelineId'] = pipeline_id
    create_pipeline_event = copy.deepcopy(create_waf_pipeline_event)
    create_pipeline_event['ResourceProperties']['Id'] = pipeline_id
    delete_pipeline_event = copy.deepcopy(delete_waf_pipeline_event)
    delete_pipeline_event['ResourceProperties']['Id'] = pipeline_id
    create_ingestion_event = copy.deepcopy(create_waf_ingestion_event)
    create_ingestion_event['ResourceProperties']['Id'] = ingestion_id
    AWS_DDB_META.put(meta_name=pipeline_id, item=pipeline_info)
    AWS_DDB_META.put(meta_name=ingestion_id, item=ingestion_info)
    
    lambda_handler(create_pipeline_event, context)
    lambda_handler(create_ingestion_event, context)
    lambda_handler(delete_pipeline_event, context)
    
    response = AWS_EVENTS._events_client.list_rules(NamePrefix=f'LogProcessor-{table_name}', EventBusName='default')
    assert response['Rules'] == []
    
    response = AWS_EVENTS._events_client.list_rules(NamePrefix=f'LogMerger-{table_name}', EventBusName='default')
    assert response['Rules'] == []
    
    response = AWS_EVENTS._events_client.list_rules(NamePrefix=f'LogMergerForMetrics-{table_name}', EventBusName='default')
    assert response['Rules'] == []
    
    response = AWS_EVENTS._events_client.list_rules(NamePrefix=f'LogArchive-{table_name}', EventBusName='default')
    assert response['Rules'] == []
    
    response = AWS_EVENTS._events_client.list_rules(NamePrefix=f'LogArchiveForMetrics-{table_name}', EventBusName='default')
    assert response['Rules'] == []
    
    os.environ['SCHEDULE_SERVICE'] = 'scheduler'
    pipeline_id = str(uuid.uuid4())
    pipeline_info = copy.deepcopy(waf_pipeline_info)
    ingestion_id = str(uuid.uuid4())
    ingestion_info = copy.deepcopy(waf_ingestion_info)
    ingestion_info['pipelineId'] = pipeline_id
    create_pipeline_event = copy.deepcopy(create_waf_pipeline_event)
    create_pipeline_event['ResourceProperties']['Id'] = pipeline_id
    delete_pipeline_event = copy.deepcopy(delete_waf_pipeline_event)
    delete_pipeline_event['ResourceProperties']['Id'] = pipeline_id
    create_ingestion_event = copy.deepcopy(create_waf_ingestion_event)
    create_ingestion_event['ResourceProperties']['Id'] = ingestion_id
    AWS_DDB_META.put(meta_name=pipeline_id, item=pipeline_info)
    AWS_DDB_META.put(meta_name=ingestion_id, item=ingestion_info)
    
    lambda_handler(create_pipeline_event, context)
    lambda_handler(create_ingestion_event, context)
    lambda_handler(delete_pipeline_event, context)
    
    response = AWS_SCHEDULER.get_schedule_group(name=pipeline_id)
    assert response == {}

    response = AWS_SCHEDULER.get_schedule(name='LogProcessor', group_name=pipeline_id)
    assert response == {}
    
    response = AWS_SCHEDULER.get_schedule(name='LogMerger', group_name=pipeline_id)
    assert response == {}
    
    response = AWS_SCHEDULER.get_schedule(name='LogMergerForMetrics', group_name=pipeline_id)
    assert response == {}
    
    response = AWS_SCHEDULER.get_schedule(name='LogArchive', group_name=pipeline_id)
    assert response == {}
    
    response = AWS_SCHEDULER.get_schedule(name='LogArchiveForMetrics', group_name=pipeline_id)
    assert response == {}
    
    # create ingestion
    create_ingestion_event = copy.deepcopy(create_waf_ingestion_event)
    create_ingestion_event['ResourceProperties']['Id'] = 'do-not-exists'
    with pytest.raises(Exception) as exception_info:
        lambda_handler(create_ingestion_event, context)
    assert exception_info.value.args[0] == 'Ingestion Id: do-not-exists Information is not exist in Meta Table.'
    
    ingestion_id =  str(uuid.uuid4())
    ingestion_info = copy.deepcopy(waf_ingestion_info)
    ingestion_info['pipelineId'] = 'do-not-exists'
    AWS_DDB_META.put(meta_name=ingestion_id, item=ingestion_info)
    create_ingestion_event = copy.deepcopy(create_waf_ingestion_event)
    create_ingestion_event['ResourceProperties']['Id'] = ingestion_id
    with pytest.raises(Exception) as exception_info:
        lambda_handler(create_ingestion_event, context)
    assert exception_info.value.args[0] == 'Pipeline Id: do-not-exists Information is not exist in Meta Table.'

    os.environ['SCHEDULE_SERVICE'] = 'events'
    pipeline_id = str(uuid.uuid4())
    pipeline_info = copy.deepcopy(waf_pipeline_info)
    ingestion_id = str(uuid.uuid4())
    ingestion_info = copy.deepcopy(waf_ingestion_info)
    ingestion_info['pipelineId'] = pipeline_id
    create_pipeline_event = copy.deepcopy(create_waf_pipeline_event)
    create_pipeline_event['ResourceProperties']['Id'] = pipeline_id
    delete_pipeline_event = copy.deepcopy(delete_waf_pipeline_event)
    delete_pipeline_event['ResourceProperties']['Id'] = pipeline_id
    create_ingestion_event = copy.deepcopy(create_waf_ingestion_event)
    create_ingestion_event['ResourceProperties']['Id'] = ingestion_id
    delete_ingestion_event = copy.deepcopy(delete_waf_ingestion_event)
    delete_ingestion_event['ResourceProperties']['Id'] = ingestion_id
    AWS_DDB_META.put(meta_name=pipeline_id, item=pipeline_info)
    AWS_DDB_META.put(meta_name=ingestion_id, item=ingestion_info)
    
    lambda_handler(create_pipeline_event, context)
    lambda_handler(create_ingestion_event, context)
    
    replication_sqs_url = AWS_SQS.get_queue_url(name=replication_sqs_name)
        
    response = AWS_SQS.get_queue_policy(url=replication_sqs_url)
    assert response['Statement'] == [
        {'Effect': 'Allow', 
        'Principal': {
            'Service': 's3.amazonaws.com'
            }, 
        'Action': ['sqs:SendMessage'], 
        'Resource': replication_sqs_arn,
        'Condition': {
            'ArnLike': {
                'aws:SourceArn': f'arn:aws:s3:::{logging_bucket_name}'
                }
            }, 
        'Sid': ingestion_id.replace('-', '')
        }
        ]
    
    replication_dlq_url = AWS_SQS.get_queue_url(name=replication_dlq_name)
    response = AWS_SQS.get_queue_policy(url=replication_dlq_url)
    assert response['Statement'] == [
        {'Effect': 'Allow', 
        'Principal': {
            'Service': 's3.amazonaws.com'
            }, 
        'Action': ['sqs:SendMessage'], 
        'Resource': replication_dlq_arn,
        'Condition': {
            'ArnLike': {
                'aws:SourceArn': f'arn:aws:s3:::{logging_bucket_name}'
                }
            }, 
        'Sid': ingestion_id.replace('-', '')
        }
        ]

    response = AWS_S3.get_bucket_policy(bucket=logging_bucket_name)
    assert response['Statement'] == [
        {
            'Effect': 'Allow', 
            'Action': [
                's3:GetObject',
                's3:GetObjectTagging',
            ],
            'Principal': {
                'AWS': replication_role_arn
                }, 
            'Resource': [
                f'arn:aws:s3:::{logging_bucket_name}/AWSLogs/{account_id}/{aws_region}/WAFLogs*'
                ], 
            'Sid': ingestion_id.replace('-', '')
            },
        ]
    
    response = AWS_S3.get_bucket_notification(bucket=logging_bucket_name)
    assert response['QueueConfigurations'] == [
        {
            'Id': ingestion_id, 
            'QueueArn': replication_sqs_arn, 
            'Events': ['s3:ObjectCreated:*'], 
            'Filter': {
                'Key': {
                    'FilterRules': [
                        {
                            'Name': 'prefix', 
                            'Value': f'AWSLogs/{account_id}/{aws_region}/WAFLogs'
                            }
                        ]
                    }
                }
            }
        ]
    lambda_handler(delete_ingestion_event, context)
    
    # test delete ingestion
    delete_ingestion_event = copy.deepcopy(delete_waf_ingestion_event)
    delete_ingestion_event['ResourceProperties']['Id'] = 'do-not-exists'
    assert lambda_handler(delete_ingestion_event, context) is None

    ingestion_id =  str(uuid.uuid4())
    ingestion_info = copy.deepcopy(waf_ingestion_info)
    ingestion_info['pipelineId'] = 'do-not-exists'
    AWS_DDB_META.put(meta_name=ingestion_id, item=ingestion_info)
    delete_ingestion_event = copy.deepcopy(delete_waf_ingestion_event)
    delete_ingestion_event['ResourceProperties']['Id'] = ingestion_id
    assert lambda_handler(delete_ingestion_event, context) is None
    assert AWS_DDB_META.get(meta_name=ingestion_id) is None
    
    os.environ['SCHEDULE_SERVICE'] = 'events'
    pipeline_id = str(uuid.uuid4())
    pipeline_info = copy.deepcopy(waf_pipeline_info)
    ingestion_id = str(uuid.uuid4())
    ingestion_info = copy.deepcopy(waf_ingestion_info)
    ingestion_info['pipelineId'] = pipeline_id
    create_pipeline_event = copy.deepcopy(create_waf_pipeline_event)
    create_pipeline_event['ResourceProperties']['Id'] = pipeline_id
    delete_pipeline_event = copy.deepcopy(delete_waf_pipeline_event)
    delete_pipeline_event['ResourceProperties']['Id'] = pipeline_id
    create_ingestion_event = copy.deepcopy(create_waf_ingestion_event)
    create_ingestion_event['ResourceProperties']['Id'] = ingestion_id
    delete_ingestion_event = copy.deepcopy(delete_waf_ingestion_event)
    delete_ingestion_event['ResourceProperties']['Id'] = ingestion_id
    AWS_DDB_META.put(meta_name=pipeline_id, item=pipeline_info)
    AWS_DDB_META.put(meta_name=ingestion_id, item=ingestion_info)
    
    lambda_handler(create_pipeline_event, context)
    lambda_handler(create_ingestion_event, context)
    lambda_handler(delete_ingestion_event, context)

    replication_sqs_url = AWS_SQS.get_queue_url(name=replication_sqs_name)
        
    response = AWS_SQS.get_queue_policy(url=replication_sqs_url)
    assert response['Statement'] == []
    
    replication_dlq_url = AWS_SQS.get_queue_url(name=replication_dlq_name)
    response = AWS_SQS.get_queue_policy(url=replication_dlq_url)
    assert response['Statement'] == []

    response = AWS_S3.get_bucket_policy(bucket=logging_bucket_name)
    assert response['Statement'] == []
    
    response = AWS_S3.get_bucket_notification(bucket=logging_bucket_name)
    assert response == {}

    