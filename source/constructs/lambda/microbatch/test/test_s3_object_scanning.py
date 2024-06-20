# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import os
import sys
import uuid
import json
import copy
import types
import pytest
import datetime
from test.mock import mock_s3_context, mock_iam_context, mock_ddb_context, mock_sqs_context, default_environment_variables


sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


class TestParameter:
    def test_parameter(self, mock_s3_context, mock_iam_context, mock_sqs_context, mock_ddb_context):
        from s3_object_scanning.lambda_function import Parameters, AWS_S3, AWS_SQS

        account_id = os.environ["ACCOUNT_ID"]
        staging_bucket_name = os.environ["STAGING_BUCKET_NAME"]
        migration_sqs_url = os.environ["MIGRATION_SQS_URL"]
        s3_object_scanning_event = json.loads(os.environ["S3_OBJECT_SCANNING_EVENT"])
        function_name =  os.environ["S3_OBJECTS_SCANNING_FUNCTION_NAME"]

        event = copy.deepcopy(s3_object_scanning_event)
        event['functionName'] = function_name
        event['taskId'] = '0b40a554-7004-48fd-8998-742853bfa620'

        param = Parameters(event)
        assert param.source_type == 'alb'
        assert param.source.bucket == staging_bucket_name
        assert param.source.prefix == f'AWSLogs/{account_id}/centralized/aws_apigateway_logs_gz/__ds__=2023-03-11'
        assert param.destination.bucket == staging_bucket_name
        assert param.destination.prefix == 'archive/centralized/aws_apigateway_logs_gz/__ds__=2023-03-11'
        assert param.sqs_url == ''
        assert param.execution_name == 'e4233e1a-1797-49d5-926f-3339504296df'
        assert param.function_name == function_name
        assert param.task_id == '0b40a554-7004-48fd-8998-742853bfa620'
        assert param.keep_prefix is True
        assert param.enrichment_plugins == ['geo_ip', 'user_agent']
        assert param.merge is True
        assert param.task_token == ''
        assert param.max_object_files_num_per_copy_task == 1000
        assert param.max_object_files_size_per_copy_task == 10737418240
        assert param.extra == {'parentTaskId': '00000000-0000-0000-0000-000000000000', 'API': 'Lambda: Invoke',
                               'stateName': 'Step 1: S3 Migration Task from Staging to Archive',
                               'stateMachineName': 'LogProcessor-HBTz7GoOjZoz',
                               'pipelineId': '189f73eb-1808-47e4-a9db-ee9c35100abe'}
        assert param.delete_on_success is False
        
        param.sqs_url = AWS_SQS.get_queue_url(param.sqs_name)
        assert param.sqs_url == migration_sqs_url

        event = copy.deepcopy(s3_object_scanning_event)
        event['functionName'] = function_name
        event['taskId'] = '0b40a554-7004-48fd-8998-742853bfa620'
        event.pop('keepPrefix')
        param = Parameters(event)
        param.sqs_url = AWS_SQS.get_queue_url(param.sqs_name)
        assert param.keep_prefix is True
        assert param.max_records == -1
        assert param.max_object_files_num_per_copy_task == 1000
        assert param.max_object_files_size_per_copy_task == 10737418240
        
        event = copy.deepcopy(s3_object_scanning_event)
        event['functionName'] = function_name
        event['taskId'] = '0b40a554-7004-48fd-8998-742853bfa620'
        event['maxRecords'] = 15000
        event['maxObjectFilesNumPerCopyTask'] = 100
        event['maxObjectFilesSizePerCopyTask'] = 200
        event.pop('size')
        param = Parameters(event)
        param.sqs_url = AWS_SQS.get_queue_url(param.sqs_name)
        assert param.size == 268435456
        assert param.max_records == 15000
        assert param.max_object_files_num_per_copy_task == 100
        assert param.max_object_files_size_per_copy_task == 200
        
        event = copy.deepcopy(s3_object_scanning_event)
        event['functionName'] = function_name
        event['taskId'] = '0b40a554-7004-48fd-8998-742853bfa620'
        event['size'] = 0
        param = Parameters(event)
        param.sqs_url = AWS_SQS.get_queue_url(param.sqs_name)
        assert param.size == 0
        assert param.max_object_files_num_per_copy_task == 1000
        assert param.max_object_files_size_per_copy_task == 10737418240
        
        event = copy.deepcopy(s3_object_scanning_event)
        event['functionName'] = function_name
        event['taskId'] = '0b40a554-7004-48fd-8998-742853bfa620'
        event['size'] = 2048
        param = Parameters(event)
        param.sqs_url = AWS_SQS.get_queue_url(param.sqs_name)
        assert param.size == 2048
        assert param.max_object_files_num_per_copy_task == 1000
        assert param.max_object_files_size_per_copy_task == 10737418240
        
        event = copy.deepcopy(s3_object_scanning_event)
        event['functionName'] = function_name
        event['taskId'] = '0b40a554-7004-48fd-8998-742853bfa620'
        event['size'] = '100MiB'
        param = Parameters(event)
        param.sqs_url = AWS_SQS.get_queue_url(param.sqs_name)
        assert param.size == 104857600

        assert param._get_parameter_value(True, (bool, str), False) is True
        assert param._get_parameter_value(True, int, 2) is True
        assert param._get_parameter_value(False, int, 2) is False
        assert param._get_parameter_value(True, str, 2) == 2
        assert param._get_parameter_value(2, bool, True) is True
        assert param._get_parameter_value(1, bool, True) is True
        assert param._get_parameter_value(0, bool, True) is True
        assert param._get_parameter_value('1', bool, True) is True
        assert param._get_parameter_value('0', bool, False) is False

        event = s3_object_scanning_event.copy()
        event['functionName'] = function_name
        event['taskId'] = '0b40a554-7004-48fd-8998-742853bfa620'
        event['keepPrefix'] = []
        event['size'] = "123Z"
        event['merge'] = "test"
        event['extra'] = "test"
        event['deleteOnSuccess'] = "test"
        param = Parameters(event)
        param.sqs_url = AWS_SQS.get_queue_url(param.sqs_name)
        assert param.keep_prefix is True
        assert param.size == 268435456
        assert param.merge is False
        assert param.extra == {}
        assert param.delete_on_success is False

        event = s3_object_scanning_event.copy()
        event['functionName'] = function_name
        event['taskId'] = '0b40a554-7004-48fd-8998-742853bfa620'
        event['keepPrefix'] = {}
        param = Parameters(event)
        param.sqs_url = AWS_SQS.get_queue_url(param.sqs_name)
        assert param.keep_prefix == {}

        event = s3_object_scanning_event.copy()
        event['functionName'] = function_name
        event['taskId'] = '0b40a554-7004-48fd-8998-742853bfa620'
        event['size'] = 0
        param = Parameters(event)
        param.sqs_url = AWS_SQS.get_queue_url(param.sqs_name)
        assert param.size == 0
        
        event = s3_object_scanning_event.copy()
        event['functionName'] = function_name
        event['taskId'] = '0b40a554-7004-48fd-8998-742853bfa620'
        event['maxObjectFilesSizePerCopyTask'] = 'test'
        param = Parameters(event)
        param.sqs_url = AWS_SQS.get_queue_url(param.sqs_name)
        assert param.max_object_files_size_per_copy_task == 10737418240
        
        event = s3_object_scanning_event.copy()
        event['functionName'] = function_name
        event['taskId'] = '0b40a554-7004-48fd-8998-742853bfa620'
        event['size'] = 2048
        param = Parameters(event)
        param.sqs_url = AWS_SQS.get_queue_url(param.sqs_name)
        assert param.size == 2048
        
        event = s3_object_scanning_event.copy()
        event['functionName'] = function_name
        event['taskId'] = '0b40a554-7004-48fd-8998-742853bfa620'
        event['size'] = '100MiB'
        param = Parameters(event)
        param.sqs_url = AWS_SQS.get_queue_url(param.sqs_name)
        assert param.size == 104857600

        param.sqs_msg.pop('taskId')
        assert param.sqs_msg == {'executionName': 'e4233e1a-1797-49d5-926f-3339504296df',
                                 'functionName': function_name,
                                 'sourceType': 'alb', 'enrichmentPlugins': ['geo_ip', 'user_agent'],
                                 'parentTaskId': '0b40a554-7004-48fd-8998-742853bfa620', 'taskToken': '',
                                 'deleteOnSuccess': False, 'merge': True, 'data': []}
        param.ddb_item.pop('startTime')
        pipeline_index_key = param.ddb_item['pipelineIndexKey']
        param.ddb_item.pop('pipelineIndexKey')
        assert param.ddb_item['expirationTime'] > datetime.datetime.now(datetime.UTC).timestamp()
        param.ddb_item.pop('expirationTime')
        assert param.ddb_item == {'executionName': 'e4233e1a-1797-49d5-926f-3339504296df',
                                'functionName': function_name,
                                'taskId': '0b40a554-7004-48fd-8998-742853bfa620', 'data': '{"totalSubTask": 0}',
                                'endTime': '', 'status': 'Running',
                                'parentTaskId': '00000000-0000-0000-0000-000000000000', 'API': 'Lambda: Invoke',
                                'stateName': 'Step 1: S3 Migration Task from Staging to Archive',
                                'stateMachineName': 'LogProcessor-HBTz7GoOjZoz',
                                'pipelineId': '189f73eb-1808-47e4-a9db-ee9c35100abe'}
        assert pipeline_index_key.split(':')[0] == '189f73eb-1808-47e4-a9db-ee9c35100abe'
        assert pipeline_index_key.split(':')[1] == 'LogProcessor-HBTz7GoOjZoz'
        assert pipeline_index_key.split(':')[2] != ''
    
        event = s3_object_scanning_event.copy()
        event['functionName'] = function_name
        event['taskId'] = '0b40a554-7004-48fd-8998-742853bfa620'
        event.pop('sqsName')
        with pytest.raises(Exception) as exception_info:
            param = Parameters(event)
        assert exception_info.value.args[0] == 'Missing value for sqsName.'

        event = s3_object_scanning_event.copy()
        event['functionName'] = function_name
        event['taskId'] = '0b40a554-7004-48fd-8998-742853bfa620'
        event.pop('executionName')
        with pytest.raises(Exception) as exception_info:
            Parameters(event)
        assert exception_info.value.args[0] == 'Missing value for executionName.'


def test_lambda_handler(mock_s3_context, mock_iam_context, mock_sqs_context, mock_ddb_context):
    import boto3
    from s3_object_scanning.lambda_function import lambda_handler as scanning_lambda_handler, AWS_DDB_ETL_LOG, AWS_S3, AWS_SQS
    
    def list_object_keys(bucket, prefix):
        object = []
        for content in AWS_S3.list_objects(bucket, prefix):
            object.append(content['Key'])
        return object

    account_id = os.environ["ACCOUNT_ID"]
    aws_region = os.environ["AWS_REGION"]
    staging_bucket_name = os.environ["STAGING_BUCKET_NAME"]
    migration_sqs_url = os.environ['MIGRATION_SQS_URL']
    
    s3_object_scanning_event = json.loads(os.environ["S3_OBJECT_SCANNING_EVENT"])
    s3_object_scanning_event['srcPath'] = f's3://{staging_bucket_name}/AWSLogs/{account_id}/centralized/aws_apigateway_logs_parquet/__ds__=2023-03-11'
    s3_object_scanning_event['dstPath'] = f's3://{staging_bucket_name}/archive/centralized/aws_apigateway_logs_parquet/__ds__=2023-03-11'
    scanning_function_name = os.environ["S3_OBJECTS_SCANNING_FUNCTION_NAME"]
    scanning_context = types.SimpleNamespace()
    scanning_context.function_name = scanning_function_name

    sqs_client = boto3.client('sqs')
    
    """
    Init object path
    """
    src_prefix = f'AWSLogs/{account_id}/centralized/aws_apigateway_logs_parquet/__ds__=2023-03-11'
    dst_prefix = f'archive/centralized/aws_apigateway_logs_parquet/__ds__=2023-03-11'
    parquet_src_apigateway1 = f'AWSLogs/{account_id}/centralized/aws_apigateway_logs_parquet/__ds__=2023-03-11-20-01/region={aws_region}/__execution_name__=b49a793b-38d2-40c0-af22-cfacf494732e/apigateway1.parquet'
    parquet_src_apigateway2 = f'AWSLogs/{account_id}/centralized/aws_apigateway_logs_parquet/__ds__=2023-03-11-18-01/region={aws_region}/__execution_name__=b49a793b-38d2-40c0-af22-cfacf494732e/apigateway2.parquet'
    parquet_src_apigateway3 = f'AWSLogs/{account_id}/centralized/aws_apigateway_logs_parquet/__ds__=2023-03-11-18-01/region={aws_region}/__execution_name__=b49a793b-38d2-40c0-af22-cfacf494732e/apigateway3.parquet'
    parquet_dst_keep_prefix_apigateway1 =  f'archive/centralized/aws_apigateway_logs_parquet/__ds__=2023-03-11-20-01/region={aws_region}/__execution_name__=b49a793b-38d2-40c0-af22-cfacf494732e/apigateway1.parquet'
    parquet_dst_keep_prefix_apigateway2 =  f'archive/centralized/aws_apigateway_logs_parquet/__ds__=2023-03-11-18-01/region={aws_region}/__execution_name__=b49a793b-38d2-40c0-af22-cfacf494732e/apigateway2.parquet'
    parquet_dst_keep_prefix_apigateway3 =  f'archive/centralized/aws_apigateway_logs_parquet/__ds__=2023-03-11-18-01/region={aws_region}/__execution_name__=b49a793b-38d2-40c0-af22-cfacf494732e/apigateway3.parquet'
    parquet_dst_keep_prefix_dict_apigateway1 =  f'archive/centralized/aws_apigateway_logs_parquet/__ds__=2023-03-11-00-00/region={aws_region}/__execution_name__=00000000-0000-0000-0000-000000000000/apigateway1.parquet'
    parquet_dst_keep_prefix_dict_apigateway2 =  f'archive/centralized/aws_apigateway_logs_parquet/__ds__=2023-03-11-00-00/region={aws_region}/__execution_name__=00000000-0000-0000-0000-000000000000/apigateway2.parquet'
    parquet_dst_keep_prefix_dict_apigateway3 =  f'archive/centralized/aws_apigateway_logs_parquet/__ds__=2023-03-11-00-00/region={aws_region}/__execution_name__=00000000-0000-0000-0000-000000000000/apigateway3.parquet'
    parquet_dst_not_keep_prefix_apigateway1 =  f'archive/centralized/aws_apigateway_logs_parquet/__ds__=2023-03-11/apigateway1.parquet'
    parquet_dst_not_keep_prefix_apigateway2 =  f'archive/centralized/aws_apigateway_logs_parquet/__ds__=2023-03-11/apigateway2.parquet'
    parquet_dst_not_keep_prefix_apigateway3 =  f'archive/centralized/aws_apigateway_logs_parquet/__ds__=2023-03-11/apigateway3.parquet'
    
    objects = list_object_keys(staging_bucket_name, prefix=src_prefix)
    assert objects == [parquet_src_apigateway2, parquet_src_apigateway3, parquet_src_apigateway1]
    
    with pytest.raises(Exception) as exception_info:
        scanning_lambda_handler('not-a-dict', {})
    assert exception_info.value.args[0] == 'The event is not a dict.'
    
    """ Scene 1:
    Testing Merge is True, DeleteOnSuccess is False, Size is 100MiB, keepPrefix is True,
    Because there are two subdirectories, the expected result is 2 migration message in SQS and 2 subtask in DDB
    """
    
    execution_name = str(uuid.uuid4())
    scanning_event = copy.deepcopy(s3_object_scanning_event)
    scanning_event['executionName'] = execution_name
    
    scanning_lambda_handler(scanning_event, scanning_context)
    migration_task_iterator = AWS_SQS.receive_message(url=migration_sqs_url)
    migration_task = next(migration_task_iterator)
    migration_task.pop('taskId')
    migration_task.pop('parentTaskId')
    assert migration_task == {'executionName': execution_name, 'functionName': 'S3ObjectScanning-vHVIc4qyW86Q', 'taskToken': '', 'deleteOnSuccess': False, 'merge': True, 
                              'sourceType': 'alb', 'enrichmentPlugins': ['geo_ip', 'user_agent'],
                              'data': [{'source': {'bucket': staging_bucket_name, 'key': parquet_src_apigateway2}, 'destination': {'bucket': staging_bucket_name, 'key': parquet_dst_keep_prefix_apigateway2}}, 
                                       {'source': {'bucket': staging_bucket_name, 'key': parquet_src_apigateway3}, 'destination': {'bucket': staging_bucket_name, 'key': parquet_dst_keep_prefix_apigateway3}}
                             ]}
    migration_task = next(migration_task_iterator)
    migration_task.pop('taskId')
    migration_task.pop('parentTaskId')
    assert migration_task == {'executionName': execution_name, 'functionName': 'S3ObjectScanning-vHVIc4qyW86Q', 'taskToken': '', 'deleteOnSuccess': False, 'merge': True, 
                              'sourceType': 'alb', 'enrichmentPlugins': ['geo_ip', 'user_agent'],
                              'data': [{'source': {'bucket': staging_bucket_name, 'key': parquet_src_apigateway1}, 'destination': {'bucket': staging_bucket_name, 'key': parquet_dst_keep_prefix_apigateway1}}
                             ]}
    with pytest.raises(StopIteration):
        next(migration_task_iterator)
    
    scanning_task_info = next(AWS_DDB_ETL_LOG.query_subtasks(execution_name=execution_name, parent_task_id='00000000-0000-0000-0000-000000000000'))
    scanning_task_id = scanning_task_info['taskId']
    scanning_task_info.pop('taskId')
    scanning_task_info.pop('startTime')
    pipeline_index_key = scanning_task_info['pipelineIndexKey']
    scanning_task_info.pop('pipelineIndexKey')
    assert scanning_task_info['expirationTime'] > datetime.datetime.now(datetime.UTC).timestamp()
    scanning_task_info.pop('expirationTime')
    assert scanning_task_info == {'executionName': execution_name, 'functionName': 'S3ObjectScanning-vHVIc4qyW86Q', 
                                  'data': '{"totalSubTask": 2}', 'endTime': '', 'status': 'Running', 'parentTaskId': '00000000-0000-0000-0000-000000000000', 
                                  'API': 'Lambda: Invoke', 'stateName': 'Step 1: S3 Migration Task from Staging to Archive', 
                                  'stateMachineName': 'LogProcessor-HBTz7GoOjZoz', 
                                  'pipelineId': '189f73eb-1808-47e4-a9db-ee9c35100abe'}
    assert pipeline_index_key.split(':')[0] == '189f73eb-1808-47e4-a9db-ee9c35100abe'
    assert pipeline_index_key.split(':')[1] == 'LogProcessor-HBTz7GoOjZoz'
    assert pipeline_index_key.split(':')[2] != ''
    
    migration_task_info_iterator = AWS_DDB_ETL_LOG.query_subtasks(execution_name=execution_name, parent_task_id=scanning_task_id)
    migration_task_info = next(migration_task_info_iterator)
    migration_task_info.pop('taskId')
    migration_task_info.pop('startTime')
    pipeline_index_key = migration_task_info['pipelineIndexKey']
    migration_task_info.pop('pipelineIndexKey')
    assert migration_task_info['expirationTime'] > datetime.datetime.now(datetime.UTC).timestamp()
    migration_task_info.pop('expirationTime')
    assert migration_task_info == {'executionName': execution_name, 'functionName': 'S3ObjectScanning-vHVIc4qyW86Q', 
                                  'data': '', 'endTime': '', 'status': 'Running', 'parentTaskId': scanning_task_id, 
                                  'API': 'Lambda: Invoke', 'stateName': 'Step 1: S3 Migration Task from Staging to Archive', 
                                  'stateMachineName': 'LogProcessor-HBTz7GoOjZoz', 
                                  'pipelineId': '189f73eb-1808-47e4-a9db-ee9c35100abe'}
    assert pipeline_index_key.split(':')[0] == '189f73eb-1808-47e4-a9db-ee9c35100abe'
    assert pipeline_index_key.split(':')[1] == 'LogProcessor-HBTz7GoOjZoz'
    assert pipeline_index_key.split(':')[2] != ''
    migration_task_info = next(migration_task_info_iterator)
    migration_task_info.pop('taskId')
    migration_task_info.pop('startTime')
    pipeline_index_key = migration_task_info['pipelineIndexKey']
    migration_task_info.pop('pipelineIndexKey')
    assert migration_task_info['expirationTime'] > datetime.datetime.now(datetime.UTC).timestamp()
    migration_task_info.pop('expirationTime')
    assert migration_task_info == {'executionName': execution_name, 'functionName': 'S3ObjectScanning-vHVIc4qyW86Q', 
                                  'data': '', 'endTime': '', 'status': 'Running', 'parentTaskId': scanning_task_id, 
                                  'API': 'Lambda: Invoke', 'stateName': 'Step 1: S3 Migration Task from Staging to Archive', 
                                  'stateMachineName': 'LogProcessor-HBTz7GoOjZoz', 
                                  'pipelineId': '189f73eb-1808-47e4-a9db-ee9c35100abe'}
    assert pipeline_index_key.split(':')[0] == '189f73eb-1808-47e4-a9db-ee9c35100abe'
    assert pipeline_index_key.split(':')[1] == 'LogProcessor-HBTz7GoOjZoz'
    assert pipeline_index_key.split(':')[2] != ''
    with pytest.raises(StopIteration):
        next(migration_task_info_iterator)
    
    """ Scene 2:
    Testing Merge is True, DeleteOnSuccess is True, Size is 100MiB, keepPrefix is True,
    Because there are two subdirectories, the expected result is 2 migration message in SQS and 2 subtask in DDB
    """
    
    execution_name = str(uuid.uuid4())
    scanning_event = copy.deepcopy(s3_object_scanning_event)
    scanning_event['executionName'] = execution_name
    scanning_event['deleteOnSuccess'] = True
    
    scanning_lambda_handler(scanning_event, scanning_context)
    migration_task_iterator = AWS_SQS.receive_message(url=migration_sqs_url)
    migration_task = next(migration_task_iterator)
    migration_task.pop('taskId')
    migration_task.pop('parentTaskId')
    assert migration_task == {'executionName': execution_name, 'functionName': 'S3ObjectScanning-vHVIc4qyW86Q', 'taskToken': '', 'deleteOnSuccess': True, 'merge': True, 
                              'sourceType': 'alb', 'enrichmentPlugins': ['geo_ip', 'user_agent'],
                              'data': [{'source': {'bucket': staging_bucket_name, 'key': parquet_src_apigateway2}, 'destination': {'bucket': staging_bucket_name, 'key': parquet_dst_keep_prefix_apigateway2}}, 
                                       {'source': {'bucket': staging_bucket_name, 'key': parquet_src_apigateway3}, 'destination': {'bucket': staging_bucket_name, 'key': parquet_dst_keep_prefix_apigateway3}}
                             ]}
    migration_task = next(migration_task_iterator)
    migration_task.pop('taskId')
    migration_task.pop('parentTaskId')
    assert migration_task == {'executionName': execution_name, 'functionName': 'S3ObjectScanning-vHVIc4qyW86Q', 'taskToken': '', 'deleteOnSuccess': True, 'merge': True, 
                              'sourceType': 'alb', 'enrichmentPlugins': ['geo_ip', 'user_agent'],
                              'data': [{'source': {'bucket': staging_bucket_name, 'key': parquet_src_apigateway1}, 'destination': {'bucket': staging_bucket_name, 'key': parquet_dst_keep_prefix_apigateway1}}
                             ]}
    with pytest.raises(StopIteration):
        next(migration_task_iterator)
    
    scanning_task_info = next(AWS_DDB_ETL_LOG.query_subtasks(execution_name=execution_name, parent_task_id='00000000-0000-0000-0000-000000000000'))
    scanning_task_id = scanning_task_info['taskId']
    scanning_task_info.pop('taskId')
    scanning_task_info.pop('startTime')
    pipeline_index_key = scanning_task_info['pipelineIndexKey']
    scanning_task_info.pop('pipelineIndexKey')
    assert scanning_task_info['expirationTime'] > datetime.datetime.now(datetime.UTC).timestamp()
    scanning_task_info.pop('expirationTime')
    assert scanning_task_info == {'executionName': execution_name, 'functionName': 'S3ObjectScanning-vHVIc4qyW86Q', 
                                  'data': '{"totalSubTask": 2}', 'endTime': '', 'status': 'Running', 'parentTaskId': '00000000-0000-0000-0000-000000000000', 
                                  'API': 'Lambda: Invoke', 'stateName': 'Step 1: S3 Migration Task from Staging to Archive', 
                                  'stateMachineName': 'LogProcessor-HBTz7GoOjZoz', 
                                  'pipelineId': '189f73eb-1808-47e4-a9db-ee9c35100abe'}
    assert pipeline_index_key.split(':')[0] == '189f73eb-1808-47e4-a9db-ee9c35100abe'
    assert pipeline_index_key.split(':')[1] == 'LogProcessor-HBTz7GoOjZoz'
    assert pipeline_index_key.split(':')[2] != ''
    migration_task_info_iterator = AWS_DDB_ETL_LOG.query_subtasks(execution_name=execution_name, parent_task_id=scanning_task_id)
    migration_task_info = next(migration_task_info_iterator)
    migration_task_info.pop('taskId')
    migration_task_info.pop('startTime')
    pipeline_index_key = migration_task_info['pipelineIndexKey']
    migration_task_info.pop('pipelineIndexKey')
    assert migration_task_info['expirationTime'] > datetime.datetime.now(datetime.UTC).timestamp()
    migration_task_info.pop('expirationTime')
    assert migration_task_info == {'executionName': execution_name, 'functionName': 'S3ObjectScanning-vHVIc4qyW86Q', 
                                  'data': '', 'endTime': '', 'status': 'Running', 'parentTaskId': scanning_task_id, 
                                  'API': 'Lambda: Invoke', 'stateName': 'Step 1: S3 Migration Task from Staging to Archive', 
                                  'stateMachineName': 'LogProcessor-HBTz7GoOjZoz',
                                  'pipelineId': '189f73eb-1808-47e4-a9db-ee9c35100abe'}
    assert pipeline_index_key.split(':')[0] == '189f73eb-1808-47e4-a9db-ee9c35100abe'
    assert pipeline_index_key.split(':')[1] == 'LogProcessor-HBTz7GoOjZoz'
    assert pipeline_index_key.split(':')[2] != ''
    migration_task_info = next(migration_task_info_iterator)
    migration_task_info.pop('taskId')
    migration_task_info.pop('startTime')
    pipeline_index_key = migration_task_info['pipelineIndexKey']
    migration_task_info.pop('pipelineIndexKey')
    assert migration_task_info['expirationTime'] > datetime.datetime.now(datetime.UTC).timestamp()
    migration_task_info.pop('expirationTime')
    assert migration_task_info == {'executionName': execution_name, 'functionName': 'S3ObjectScanning-vHVIc4qyW86Q', 
                                  'data': '', 'endTime': '', 'status': 'Running', 'parentTaskId': scanning_task_id, 
                                  'API': 'Lambda: Invoke', 'stateName': 'Step 1: S3 Migration Task from Staging to Archive', 
                                  'stateMachineName': 'LogProcessor-HBTz7GoOjZoz', 
                                  'pipelineId': '189f73eb-1808-47e4-a9db-ee9c35100abe'}
    assert pipeline_index_key.split(':')[0] == '189f73eb-1808-47e4-a9db-ee9c35100abe'
    assert pipeline_index_key.split(':')[1] == 'LogProcessor-HBTz7GoOjZoz'
    assert pipeline_index_key.split(':')[2] != ''
    with pytest.raises(StopIteration):
        next(migration_task_info_iterator)

    """ Scene 3:
    Testing Merge is True, DeleteOnSuccess is False, Size is 15KiB, keepPrefix is True,
    Since Size is 15KiB, But the actual file is larger than 16KiB, so all files in one task, 
        the expected result is 1 SQS messages with 1 subtasks in DDB
    """
    
    execution_name = str(uuid.uuid4())
    scanning_event = copy.deepcopy(s3_object_scanning_event)
    scanning_event['executionName'] = execution_name
    scanning_event['size'] = '15KiB'
    
    scanning_lambda_handler(scanning_event, scanning_context)
    migration_task_iterator = AWS_SQS.receive_message(url=migration_sqs_url)
    migration_task = next(migration_task_iterator)
    migration_task.pop('taskId')
    migration_task.pop('parentTaskId')
    assert migration_task == {'executionName': execution_name, 'functionName': 'S3ObjectScanning-vHVIc4qyW86Q', 'taskToken': '', 'deleteOnSuccess': False, 'merge': False, 
                              'sourceType': 'alb', 'enrichmentPlugins': ['geo_ip', 'user_agent'],
                              'data': [{'source': {'bucket': staging_bucket_name, 'key': parquet_src_apigateway2}, 'destination': {'bucket': staging_bucket_name, 'key': parquet_dst_keep_prefix_apigateway2}},
                                       {'source': {'bucket': staging_bucket_name, 'key': parquet_src_apigateway3}, 'destination': {'bucket': staging_bucket_name, 'key': parquet_dst_keep_prefix_apigateway3}},
                                       {'source': {'bucket': staging_bucket_name, 'key': parquet_src_apigateway1}, 'destination': {'bucket': staging_bucket_name, 'key': parquet_dst_keep_prefix_apigateway1}}
                             ]}
    
    scanning_task_info = next(AWS_DDB_ETL_LOG.query_subtasks(execution_name=execution_name, parent_task_id='00000000-0000-0000-0000-000000000000'))
    scanning_task_id = scanning_task_info['taskId']
    scanning_task_info.pop('taskId')
    scanning_task_info.pop('startTime')
    pipeline_index_key = scanning_task_info['pipelineIndexKey']
    scanning_task_info.pop('pipelineIndexKey')
    assert scanning_task_info['expirationTime'] > datetime.datetime.now(datetime.UTC).timestamp()
    scanning_task_info.pop('expirationTime')
    assert scanning_task_info == {'executionName': execution_name, 'functionName': 'S3ObjectScanning-vHVIc4qyW86Q', 
                                  'data': '{"totalSubTask": 1}', 'endTime': '', 'status': 'Running', 'parentTaskId': '00000000-0000-0000-0000-000000000000', 
                                  'API': 'Lambda: Invoke', 'stateName': 'Step 1: S3 Migration Task from Staging to Archive', 
                                  'stateMachineName': 'LogProcessor-HBTz7GoOjZoz', 
                                  'pipelineId': '189f73eb-1808-47e4-a9db-ee9c35100abe'}
    assert pipeline_index_key.split(':')[0] == '189f73eb-1808-47e4-a9db-ee9c35100abe'
    assert pipeline_index_key.split(':')[1] == 'LogProcessor-HBTz7GoOjZoz'
    assert pipeline_index_key.split(':')[2] != ''
    migration_task_info_iterator = AWS_DDB_ETL_LOG.query_subtasks(execution_name=execution_name, parent_task_id=scanning_task_id)
    migration_task_info = next(migration_task_info_iterator)
    migration_task_info.pop('taskId')
    migration_task_info.pop('startTime')
    pipeline_index_key = migration_task_info['pipelineIndexKey']
    migration_task_info.pop('pipelineIndexKey')
    assert migration_task_info['expirationTime'] > datetime.datetime.now(datetime.UTC).timestamp()
    migration_task_info.pop('expirationTime')
    assert migration_task_info == {'executionName': execution_name, 'functionName': 'S3ObjectScanning-vHVIc4qyW86Q', 
                                  'data': '', 'endTime': '', 'status': 'Running', 'parentTaskId': scanning_task_id, 
                                  'API': 'Lambda: Invoke', 'stateName': 'Step 1: S3 Migration Task from Staging to Archive', 
                                  'stateMachineName': 'LogProcessor-HBTz7GoOjZoz', 
                                  'pipelineId': '189f73eb-1808-47e4-a9db-ee9c35100abe'}
    assert pipeline_index_key.split(':')[0] == '189f73eb-1808-47e4-a9db-ee9c35100abe'
    assert pipeline_index_key.split(':')[1] == 'LogProcessor-HBTz7GoOjZoz'
    assert pipeline_index_key.split(':')[2] != ''
    
    """ Scene 4:
    Testing Merge is True, DeleteOnSuccess is False, Size is 40KiB, keepPrefix is True,
    Since Size is 40KiB, But the actual file is 35KiB, so one task per 2 files, 
        the expected result is 2 SQS messages with 2 subtasks in DDB
    """
    
    execution_name = str(uuid.uuid4())
    scanning_event = copy.deepcopy(s3_object_scanning_event)
    scanning_event['executionName'] = execution_name
    scanning_event['size'] = '40KiB'
    
    scanning_lambda_handler(scanning_event, scanning_context)
    migration_task_iterator = AWS_SQS.receive_message(url=migration_sqs_url)
    migration_task = next(migration_task_iterator)
    migration_task.pop('taskId')
    migration_task.pop('parentTaskId')
    assert migration_task == {'executionName': execution_name, 'functionName': 'S3ObjectScanning-vHVIc4qyW86Q', 'taskToken': '', 'deleteOnSuccess': False, 'merge': True, 
                              'sourceType': 'alb', 'enrichmentPlugins': ['geo_ip', 'user_agent'],
                              'data': [{'source': {'bucket': staging_bucket_name, 'key': parquet_src_apigateway2}, 'destination': {'bucket': staging_bucket_name, 'key': parquet_dst_keep_prefix_apigateway2}}, 
                                       {'source': {'bucket': staging_bucket_name, 'key': parquet_src_apigateway3}, 'destination': {'bucket': staging_bucket_name, 'key': parquet_dst_keep_prefix_apigateway3}}
                             ]}
    migration_task = next(migration_task_iterator)
    migration_task.pop('taskId')
    migration_task.pop('parentTaskId')
    assert migration_task == {'executionName': execution_name, 'functionName': 'S3ObjectScanning-vHVIc4qyW86Q', 'taskToken': '', 'deleteOnSuccess': False, 'merge': True, 
                              'sourceType': 'alb', 'enrichmentPlugins': ['geo_ip', 'user_agent'],
                              'data': [{'source': {'bucket': staging_bucket_name, 'key': parquet_src_apigateway1}, 'destination': {'bucket': staging_bucket_name, 'key': parquet_dst_keep_prefix_apigateway1}}
                             ]}
    with pytest.raises(StopIteration):
        next(migration_task_iterator)
    
    scanning_task_info = next(AWS_DDB_ETL_LOG.query_subtasks(execution_name=execution_name, parent_task_id='00000000-0000-0000-0000-000000000000'))
    scanning_task_id = scanning_task_info['taskId']
    scanning_task_info.pop('taskId')
    scanning_task_info.pop('startTime')
    pipeline_index_key = scanning_task_info['pipelineIndexKey']
    scanning_task_info.pop('pipelineIndexKey')
    assert scanning_task_info['expirationTime'] > datetime.datetime.now(datetime.UTC).timestamp()
    scanning_task_info.pop('expirationTime')
    assert scanning_task_info == {'executionName': execution_name, 'functionName': 'S3ObjectScanning-vHVIc4qyW86Q', 
                                  'data': '{"totalSubTask": 2}', 'endTime': '', 'status': 'Running', 'parentTaskId': '00000000-0000-0000-0000-000000000000', 
                                  'API': 'Lambda: Invoke', 'stateName': 'Step 1: S3 Migration Task from Staging to Archive', 
                                  'stateMachineName': 'LogProcessor-HBTz7GoOjZoz',
                                  'pipelineId': '189f73eb-1808-47e4-a9db-ee9c35100abe'}
    assert pipeline_index_key.split(':')[0] == '189f73eb-1808-47e4-a9db-ee9c35100abe'
    assert pipeline_index_key.split(':')[1] == 'LogProcessor-HBTz7GoOjZoz'
    assert pipeline_index_key.split(':')[2] != ''
    migration_task_info_iterator = AWS_DDB_ETL_LOG.query_subtasks(execution_name=execution_name, parent_task_id=scanning_task_id)
    migration_task_info = next(migration_task_info_iterator)
    migration_task_info.pop('taskId')
    migration_task_info.pop('startTime')
    pipeline_index_key = migration_task_info['pipelineIndexKey']
    migration_task_info.pop('pipelineIndexKey')
    assert migration_task_info['expirationTime'] > datetime.datetime.now(datetime.UTC).timestamp()
    migration_task_info.pop('expirationTime')
    assert migration_task_info == {'executionName': execution_name, 'functionName': 'S3ObjectScanning-vHVIc4qyW86Q', 
                                  'data': '', 'endTime': '', 'status': 'Running', 'parentTaskId': scanning_task_id, 
                                  'API': 'Lambda: Invoke', 'stateName': 'Step 1: S3 Migration Task from Staging to Archive', 
                                  'stateMachineName': 'LogProcessor-HBTz7GoOjZoz', 
                                  'pipelineId': '189f73eb-1808-47e4-a9db-ee9c35100abe'}
    assert pipeline_index_key.split(':')[0] == '189f73eb-1808-47e4-a9db-ee9c35100abe'
    assert pipeline_index_key.split(':')[1] == 'LogProcessor-HBTz7GoOjZoz'
    assert pipeline_index_key.split(':')[2] != ''
    migration_task_info = next(migration_task_info_iterator)
    migration_task_info.pop('taskId')
    migration_task_info.pop('startTime')
    pipeline_index_key = migration_task_info['pipelineIndexKey']
    migration_task_info.pop('pipelineIndexKey')
    assert migration_task_info['expirationTime'] > datetime.datetime.now(datetime.UTC).timestamp()
    migration_task_info.pop('expirationTime')
    assert migration_task_info == {'executionName': execution_name, 'functionName': 'S3ObjectScanning-vHVIc4qyW86Q', 
                                  'data': '', 'endTime': '', 'status': 'Running', 'parentTaskId': scanning_task_id, 
                                  'API': 'Lambda: Invoke', 'stateName': 'Step 1: S3 Migration Task from Staging to Archive', 
                                  'stateMachineName': 'LogProcessor-HBTz7GoOjZoz', 
                                  'pipelineId': '189f73eb-1808-47e4-a9db-ee9c35100abe'}
    assert pipeline_index_key.split(':')[0] == '189f73eb-1808-47e4-a9db-ee9c35100abe'
    assert pipeline_index_key.split(':')[1] == 'LogProcessor-HBTz7GoOjZoz'
    assert pipeline_index_key.split(':')[2] != ''
    with pytest.raises(StopIteration):
        next(migration_task_info_iterator)
    
    """ Scene 5:
    Testing Merge is True, DeleteOnSuccess is False, Size is 40KiB, keepPrefix is False,
    Since Size is 40KiB, But the actual file is 35KiB, so one task per 2 files, 
        the expected result is 2 SQS messages with 2 subtasks in DDB
    """
    
    execution_name = str(uuid.uuid4())
    scanning_event = copy.deepcopy(s3_object_scanning_event)
    scanning_event['executionName'] = execution_name
    scanning_event['size'] = '40KiB'
    scanning_event['keepPrefix'] = False
    
    scanning_lambda_handler(scanning_event, scanning_context)
    migration_task_iterator = AWS_SQS.receive_message(url=migration_sqs_url)
    migration_task = next(migration_task_iterator)
    migration_task.pop('taskId')
    migration_task.pop('parentTaskId')
    assert migration_task == {'executionName': execution_name, 'functionName': 'S3ObjectScanning-vHVIc4qyW86Q', 'taskToken': '', 'deleteOnSuccess': False, 'merge': True, 
                              'sourceType': 'alb', 'enrichmentPlugins': ['geo_ip', 'user_agent'],
                              'data': [{'source': {'bucket': staging_bucket_name, 'key': parquet_src_apigateway2}, 'destination': {'bucket': staging_bucket_name, 'key': parquet_dst_not_keep_prefix_apigateway2}}, 
                                       {'source': {'bucket': staging_bucket_name, 'key': parquet_src_apigateway3}, 'destination': {'bucket': staging_bucket_name, 'key': parquet_dst_not_keep_prefix_apigateway3}}
                             ]}
    migration_task = next(migration_task_iterator)
    migration_task.pop('taskId')
    migration_task.pop('parentTaskId')
    assert migration_task == {'executionName': execution_name, 'functionName': 'S3ObjectScanning-vHVIc4qyW86Q', 'taskToken': '', 'deleteOnSuccess': False, 'merge': True, 
                              'sourceType': 'alb', 'enrichmentPlugins': ['geo_ip', 'user_agent'],
                              'data': [{'source': {'bucket': staging_bucket_name, 'key': parquet_src_apigateway1}, 'destination': {'bucket': staging_bucket_name, 'key': parquet_dst_not_keep_prefix_apigateway1}}
                             ]}
    with pytest.raises(StopIteration):
        next(migration_task_iterator)
    
    scanning_task_info = next(AWS_DDB_ETL_LOG.query_subtasks(execution_name=execution_name, parent_task_id='00000000-0000-0000-0000-000000000000'))
    scanning_task_id = scanning_task_info['taskId']
    scanning_task_info.pop('taskId')
    scanning_task_info.pop('startTime')
    pipeline_index_key = scanning_task_info['pipelineIndexKey']
    scanning_task_info.pop('pipelineIndexKey')
    assert scanning_task_info['expirationTime'] > datetime.datetime.now(datetime.UTC).timestamp()
    scanning_task_info.pop('expirationTime')
    assert scanning_task_info == {'executionName': execution_name, 'functionName': 'S3ObjectScanning-vHVIc4qyW86Q', 
                                  'data': '{"totalSubTask": 2}', 'endTime': '', 'status': 'Running', 'parentTaskId': '00000000-0000-0000-0000-000000000000', 
                                  'API': 'Lambda: Invoke', 'stateName': 'Step 1: S3 Migration Task from Staging to Archive', 
                                  'stateMachineName': 'LogProcessor-HBTz7GoOjZoz', 
                                  'pipelineId': '189f73eb-1808-47e4-a9db-ee9c35100abe'}
    assert pipeline_index_key.split(':')[0] == '189f73eb-1808-47e4-a9db-ee9c35100abe'
    assert pipeline_index_key.split(':')[1] == 'LogProcessor-HBTz7GoOjZoz'
    assert pipeline_index_key.split(':')[2] != ''
    migration_task_info_iterator = AWS_DDB_ETL_LOG.query_subtasks(execution_name=execution_name, parent_task_id=scanning_task_id)
    migration_task_info = next(migration_task_info_iterator)
    migration_task_info.pop('taskId')
    migration_task_info.pop('startTime')
    pipeline_index_key = migration_task_info['pipelineIndexKey']
    migration_task_info.pop('pipelineIndexKey')
    assert migration_task_info['expirationTime'] > datetime.datetime.now(datetime.UTC).timestamp()
    migration_task_info.pop('expirationTime')
    assert migration_task_info == {'executionName': execution_name, 'functionName': 'S3ObjectScanning-vHVIc4qyW86Q', 
                                  'data': '', 'endTime': '', 'status': 'Running', 'parentTaskId': scanning_task_id, 
                                  'API': 'Lambda: Invoke', 'stateName': 'Step 1: S3 Migration Task from Staging to Archive', 
                                  'stateMachineName': 'LogProcessor-HBTz7GoOjZoz', 
                                  'pipelineId': '189f73eb-1808-47e4-a9db-ee9c35100abe'}
    assert pipeline_index_key.split(':')[0] == '189f73eb-1808-47e4-a9db-ee9c35100abe'
    assert pipeline_index_key.split(':')[1] == 'LogProcessor-HBTz7GoOjZoz'
    assert pipeline_index_key.split(':')[2] != ''
    migration_task_info = next(migration_task_info_iterator)
    migration_task_info.pop('taskId')
    migration_task_info.pop('startTime')
    pipeline_index_key = migration_task_info['pipelineIndexKey']
    migration_task_info.pop('pipelineIndexKey')
    assert migration_task_info['expirationTime'] > datetime.datetime.now(datetime.UTC).timestamp()
    migration_task_info.pop('expirationTime')
    assert migration_task_info == {'executionName': execution_name, 'functionName': 'S3ObjectScanning-vHVIc4qyW86Q', 
                                  'data': '', 'endTime': '', 'status': 'Running', 'parentTaskId': scanning_task_id, 
                                  'API': 'Lambda: Invoke', 'stateName': 'Step 1: S3 Migration Task from Staging to Archive', 
                                  'stateMachineName': 'LogProcessor-HBTz7GoOjZoz', 
                                  'pipelineId': '189f73eb-1808-47e4-a9db-ee9c35100abe'}
    assert pipeline_index_key.split(':')[0] == '189f73eb-1808-47e4-a9db-ee9c35100abe'
    assert pipeline_index_key.split(':')[1] == 'LogProcessor-HBTz7GoOjZoz'
    assert pipeline_index_key.split(':')[2] != ''
    with pytest.raises(StopIteration):
        next(migration_task_info_iterator)
        
    """ Scene 6:
    Testing Merge is True, DeleteOnSuccess is False, Size is 500, keepPrefix is dict,
    The expected result is 1 SQS messages with 1 subtasks in DDB
    """
    
    execution_name = str(uuid.uuid4())
    scanning_event = copy.deepcopy(s3_object_scanning_event)
    scanning_event['executionName'] = execution_name
    scanning_event['maxObjectFilesNumPerCopyTask'] = 500
    scanning_event['keepPrefix'] = {"__ds__": {
            "type": "time",
            "from": "%Y-%m-%d-%H-%M",
            "to": "%Y-%m-%d-00-00",
        },
            "region": {
                "type": "retain",
            },
            "__execution_name__": {
                "type": "default",
                "value": "00000000-0000-0000-0000-000000000000"
            }
        }
    
    scanning_lambda_handler(scanning_event, scanning_context)
    migration_task_iterator = AWS_SQS.receive_message(url=migration_sqs_url)
    migration_task = next(migration_task_iterator)
    migration_task.pop('taskId')
    migration_task.pop('parentTaskId')
    assert migration_task == {'executionName': execution_name, 'functionName': 'S3ObjectScanning-vHVIc4qyW86Q', 'taskToken': '', 'deleteOnSuccess': False, 'merge': True, 
                              'sourceType': 'alb', 'enrichmentPlugins': ['geo_ip', 'user_agent'],
                              'data': [{'source': {'bucket': staging_bucket_name, 'key': parquet_src_apigateway2}, 'destination': {'bucket': staging_bucket_name, 'key': parquet_dst_keep_prefix_dict_apigateway2}}, 
                                       {'source': {'bucket': staging_bucket_name, 'key': parquet_src_apigateway3}, 'destination': {'bucket': staging_bucket_name, 'key': parquet_dst_keep_prefix_dict_apigateway3}},
                                       {'source': {'bucket': staging_bucket_name, 'key': parquet_src_apigateway1}, 'destination': {'bucket': staging_bucket_name, 'key': parquet_dst_keep_prefix_dict_apigateway1}}
                             ]}
    assert pipeline_index_key.split(':')[0] == '189f73eb-1808-47e4-a9db-ee9c35100abe'
    assert pipeline_index_key.split(':')[1] == 'LogProcessor-HBTz7GoOjZoz'
    assert pipeline_index_key.split(':')[2] != ''
    with pytest.raises(StopIteration):
        next(migration_task_iterator)
    
    scanning_task_info = next(AWS_DDB_ETL_LOG.query_subtasks(execution_name=execution_name, parent_task_id='00000000-0000-0000-0000-000000000000'))
    scanning_task_id = scanning_task_info['taskId']
    scanning_task_info.pop('taskId')
    scanning_task_info.pop('startTime')
    pipeline_index_key = scanning_task_info['pipelineIndexKey']
    scanning_task_info.pop('pipelineIndexKey')
    assert scanning_task_info['expirationTime'] > datetime.datetime.now(datetime.UTC).timestamp()
    scanning_task_info.pop('expirationTime')
    assert scanning_task_info == {'executionName': execution_name, 'functionName': 'S3ObjectScanning-vHVIc4qyW86Q', 
                                  'data': '{"totalSubTask": 1}', 'endTime': '', 'status': 'Running', 'parentTaskId': '00000000-0000-0000-0000-000000000000', 
                                  'API': 'Lambda: Invoke', 'stateName': 'Step 1: S3 Migration Task from Staging to Archive', 
                                  'stateMachineName': 'LogProcessor-HBTz7GoOjZoz', 
                                  'pipelineId': '189f73eb-1808-47e4-a9db-ee9c35100abe'}
    assert pipeline_index_key.split(':')[0] == '189f73eb-1808-47e4-a9db-ee9c35100abe'
    assert pipeline_index_key.split(':')[1] == 'LogProcessor-HBTz7GoOjZoz'
    assert pipeline_index_key.split(':')[2] != ''
    migration_task_info_iterator = AWS_DDB_ETL_LOG.query_subtasks(execution_name=execution_name, parent_task_id=scanning_task_id)
    migration_task_info = next(migration_task_info_iterator)
    migration_task_info.pop('taskId')
    migration_task_info.pop('startTime')
    pipeline_index_key = migration_task_info['pipelineIndexKey']
    migration_task_info.pop('pipelineIndexKey')
    assert migration_task_info['expirationTime'] > datetime.datetime.now(datetime.UTC).timestamp()
    migration_task_info.pop('expirationTime')
    assert migration_task_info == {'executionName': execution_name, 'functionName': 'S3ObjectScanning-vHVIc4qyW86Q', 
                                  'data': '', 'endTime': '', 'status': 'Running', 'parentTaskId': scanning_task_id, 
                                  'API': 'Lambda: Invoke', 'stateName': 'Step 1: S3 Migration Task from Staging to Archive', 
                                  'stateMachineName': 'LogProcessor-HBTz7GoOjZoz',
                                  'pipelineId': '189f73eb-1808-47e4-a9db-ee9c35100abe'}
    assert pipeline_index_key.split(':')[0] == '189f73eb-1808-47e4-a9db-ee9c35100abe'
    assert pipeline_index_key.split(':')[1] == 'LogProcessor-HBTz7GoOjZoz'
    assert pipeline_index_key.split(':')[2] != ''
    with pytest.raises(StopIteration):
        next(migration_task_info_iterator)
        
    """ Scene 7:
    Testing Merge is False, DeleteOnSuccess is False, Size is 100MiB, keepPrefix is True,
    The expected result is 1 SQS messages with 1 subtasks in DDB
    """
    
    execution_name = str(uuid.uuid4())
    scanning_event = copy.deepcopy(s3_object_scanning_event)
    scanning_event['executionName'] = execution_name
    scanning_event['merge'] = False
    
    scanning_lambda_handler(scanning_event, scanning_context)
    migration_task_iterator = AWS_SQS.receive_message(url=migration_sqs_url)
    migration_task = next(migration_task_iterator)
    migration_task.pop('taskId')
    migration_task.pop('parentTaskId')
    assert migration_task == {'executionName': execution_name, 'functionName': 'S3ObjectScanning-vHVIc4qyW86Q', 'taskToken': '', 'deleteOnSuccess': False, 'merge': False, 
                              'sourceType': 'alb', 'enrichmentPlugins': ['geo_ip', 'user_agent'],
                              'data': [{'source': {'bucket': staging_bucket_name, 'key': parquet_src_apigateway2}, 'destination': {'bucket': staging_bucket_name, 'key': parquet_dst_keep_prefix_apigateway2}}, 
                                       {'source': {'bucket': staging_bucket_name, 'key': parquet_src_apigateway3}, 'destination': {'bucket': staging_bucket_name, 'key': parquet_dst_keep_prefix_apigateway3}},
                                       {'source': {'bucket': staging_bucket_name, 'key': parquet_src_apigateway1}, 'destination': {'bucket': staging_bucket_name, 'key': parquet_dst_keep_prefix_apigateway1}}
                             ]}
    with pytest.raises(StopIteration):
        next(migration_task_iterator)
    
    scanning_task_info = next(AWS_DDB_ETL_LOG.query_subtasks(execution_name=execution_name, parent_task_id='00000000-0000-0000-0000-000000000000'))
    scanning_task_id = scanning_task_info['taskId']
    scanning_task_info.pop('taskId')
    scanning_task_info.pop('startTime')
    pipeline_index_key = scanning_task_info['pipelineIndexKey']
    scanning_task_info.pop('pipelineIndexKey')
    assert scanning_task_info['expirationTime'] > datetime.datetime.now(datetime.UTC).timestamp()
    scanning_task_info.pop('expirationTime')
    assert scanning_task_info == {'executionName': execution_name, 'functionName': 'S3ObjectScanning-vHVIc4qyW86Q', 
                                  'data': '{"totalSubTask": 1}', 'endTime': '', 'status': 'Running', 'parentTaskId': '00000000-0000-0000-0000-000000000000', 
                                  'API': 'Lambda: Invoke', 'stateName': 'Step 1: S3 Migration Task from Staging to Archive', 
                                  'stateMachineName': 'LogProcessor-HBTz7GoOjZoz',
                                  'pipelineId': '189f73eb-1808-47e4-a9db-ee9c35100abe'}
    assert pipeline_index_key.split(':')[0] == '189f73eb-1808-47e4-a9db-ee9c35100abe'
    assert pipeline_index_key.split(':')[1] == 'LogProcessor-HBTz7GoOjZoz'
    assert pipeline_index_key.split(':')[2] != ''
    migration_task_info_iterator = AWS_DDB_ETL_LOG.query_subtasks(execution_name=execution_name, parent_task_id=scanning_task_id)
    migration_task_info = next(migration_task_info_iterator)
    migration_task_info.pop('taskId')
    migration_task_info.pop('startTime')
    pipeline_index_key = migration_task_info['pipelineIndexKey']
    migration_task_info.pop('pipelineIndexKey')
    assert migration_task_info['expirationTime'] > datetime.datetime.now(datetime.UTC).timestamp()
    migration_task_info.pop('expirationTime')
    assert migration_task_info == {'executionName': execution_name, 'functionName': 'S3ObjectScanning-vHVIc4qyW86Q', 
                                  'data': '', 'endTime': '', 'status': 'Running', 'parentTaskId': scanning_task_id, 
                                  'API': 'Lambda: Invoke', 'stateName': 'Step 1: S3 Migration Task from Staging to Archive', 
                                  'stateMachineName': 'LogProcessor-HBTz7GoOjZoz', 
                                  'pipelineId': '189f73eb-1808-47e4-a9db-ee9c35100abe'}
    assert pipeline_index_key.split(':')[0] == '189f73eb-1808-47e4-a9db-ee9c35100abe'
    assert pipeline_index_key.split(':')[1] == 'LogProcessor-HBTz7GoOjZoz'
    assert pipeline_index_key.split(':')[2] != ''
    with pytest.raises(StopIteration):
        next(migration_task_info_iterator)
    
    """ Scene 8:
    Testing Merge is False, DeleteOnSuccess is False, Size is 2, keepPrefix is True,
    The expected result is 2 SQS messages with 2 subtasks in DDB
    """
    
    execution_name = str(uuid.uuid4())
    scanning_event = copy.deepcopy(s3_object_scanning_event)
    scanning_event['executionName'] = execution_name
    scanning_event['merge'] = False
    scanning_event['maxObjectFilesNumPerCopyTask'] = 2
    
    scanning_lambda_handler(scanning_event, scanning_context)
    migration_task_iterator = AWS_SQS.receive_message(url=migration_sqs_url)
    migration_task = next(migration_task_iterator)
    migration_task.pop('taskId')
    migration_task.pop('parentTaskId')
    assert migration_task == {'executionName': execution_name, 'functionName': 'S3ObjectScanning-vHVIc4qyW86Q', 'taskToken': '', 'deleteOnSuccess': False, 'merge': False, 
                              'sourceType': 'alb', 'enrichmentPlugins': ['geo_ip', 'user_agent'],
                              'data': [{'source': {'bucket': staging_bucket_name, 'key': parquet_src_apigateway2}, 'destination': {'bucket': staging_bucket_name, 'key': parquet_dst_keep_prefix_apigateway2}}, 
                                       {'source': {'bucket': staging_bucket_name, 'key': parquet_src_apigateway3}, 'destination': {'bucket': staging_bucket_name, 'key': parquet_dst_keep_prefix_apigateway3}}
                             ]}
    migration_task = next(migration_task_iterator)
    migration_task.pop('taskId')
    migration_task.pop('parentTaskId')
    assert migration_task == {'executionName': execution_name, 'functionName': 'S3ObjectScanning-vHVIc4qyW86Q', 'taskToken': '', 'deleteOnSuccess': False, 'merge': False, 
                              'sourceType': 'alb', 'enrichmentPlugins': ['geo_ip', 'user_agent'],
                              'data': [{'source': {'bucket': staging_bucket_name, 'key': parquet_src_apigateway1}, 'destination': {'bucket': staging_bucket_name, 'key': parquet_dst_keep_prefix_apigateway1}}
                             ]}
    with pytest.raises(StopIteration):
        next(migration_task_iterator)
    
    scanning_task_info = next(AWS_DDB_ETL_LOG.query_subtasks(execution_name=execution_name, parent_task_id='00000000-0000-0000-0000-000000000000'))
    scanning_task_id = scanning_task_info['taskId']
    scanning_task_info.pop('taskId')
    scanning_task_info.pop('startTime')
    pipeline_index_key = scanning_task_info['pipelineIndexKey']
    scanning_task_info.pop('pipelineIndexKey')
    assert scanning_task_info['expirationTime'] > datetime.datetime.now(datetime.UTC).timestamp()
    scanning_task_info.pop('expirationTime')
    assert scanning_task_info == {'executionName': execution_name, 'functionName': 'S3ObjectScanning-vHVIc4qyW86Q', 
                                  'data': '{"totalSubTask": 2}', 'endTime': '', 'status': 'Running', 'parentTaskId': '00000000-0000-0000-0000-000000000000', 
                                  'API': 'Lambda: Invoke', 'stateName': 'Step 1: S3 Migration Task from Staging to Archive', 
                                  'stateMachineName': 'LogProcessor-HBTz7GoOjZoz',  
                                  'pipelineId': '189f73eb-1808-47e4-a9db-ee9c35100abe'}
    assert pipeline_index_key.split(':')[0] == '189f73eb-1808-47e4-a9db-ee9c35100abe'
    assert pipeline_index_key.split(':')[1] == 'LogProcessor-HBTz7GoOjZoz'
    assert pipeline_index_key.split(':')[2] != ''
    migration_task_info_iterator = AWS_DDB_ETL_LOG.query_subtasks(execution_name=execution_name, parent_task_id=scanning_task_id)
    migration_task_info = next(migration_task_info_iterator)
    migration_task_info.pop('taskId')
    migration_task_info.pop('startTime')
    pipeline_index_key = migration_task_info['pipelineIndexKey']
    migration_task_info.pop('pipelineIndexKey')
    assert migration_task_info['expirationTime'] > datetime.datetime.now(datetime.UTC).timestamp()
    migration_task_info.pop('expirationTime')
    assert migration_task_info == {'executionName': execution_name, 'functionName': 'S3ObjectScanning-vHVIc4qyW86Q', 
                                  'data': '', 'endTime': '', 'status': 'Running', 'parentTaskId': scanning_task_id, 
                                  'API': 'Lambda: Invoke', 'stateName': 'Step 1: S3 Migration Task from Staging to Archive', 
                                  'stateMachineName': 'LogProcessor-HBTz7GoOjZoz', 
                                  'pipelineId': '189f73eb-1808-47e4-a9db-ee9c35100abe'}
    assert pipeline_index_key.split(':')[0] == '189f73eb-1808-47e4-a9db-ee9c35100abe'
    assert pipeline_index_key.split(':')[1] == 'LogProcessor-HBTz7GoOjZoz'
    assert pipeline_index_key.split(':')[2] != ''
    migration_task_info = next(migration_task_info_iterator)
    migration_task_info.pop('taskId')
    migration_task_info.pop('startTime')
    pipeline_index_key = migration_task_info['pipelineIndexKey']
    migration_task_info.pop('pipelineIndexKey')
    assert migration_task_info['expirationTime'] > datetime.datetime.now(datetime.UTC).timestamp()
    migration_task_info.pop('expirationTime')
    assert migration_task_info == {'executionName': execution_name, 'functionName': 'S3ObjectScanning-vHVIc4qyW86Q', 
                                  'data': '', 'endTime': '', 'status': 'Running', 'parentTaskId': scanning_task_id, 
                                  'API': 'Lambda: Invoke', 'stateName': 'Step 1: S3 Migration Task from Staging to Archive', 
                                  'stateMachineName': 'LogProcessor-HBTz7GoOjZoz', 
                                  'pipelineId': '189f73eb-1808-47e4-a9db-ee9c35100abe'}
    assert pipeline_index_key.split(':')[0] == '189f73eb-1808-47e4-a9db-ee9c35100abe'
    assert pipeline_index_key.split(':')[1] == 'LogProcessor-HBTz7GoOjZoz'
    assert pipeline_index_key.split(':')[2] != ''
    with pytest.raises(StopIteration):
        next(migration_task_info_iterator)
    
    """ Scene 9:
    Testing Merge is False, DeleteOnSuccess is False, Size is 2, keepPrefix is False,
    The expected result is 2 SQS messages with 2 subtasks in DDB
    """
    
    execution_name = str(uuid.uuid4())
    scanning_event = copy.deepcopy(s3_object_scanning_event)
    scanning_event['executionName'] = execution_name
    scanning_event['merge'] = False
    scanning_event['maxObjectFilesNumPerCopyTask'] = 2
    scanning_event['keepPrefix'] = False
    
    scanning_lambda_handler(scanning_event, scanning_context)
    migration_task_iterator = AWS_SQS.receive_message(url=migration_sqs_url)
    migration_task = next(migration_task_iterator)
    migration_task.pop('taskId')
    migration_task.pop('parentTaskId')
    assert migration_task == {'executionName': execution_name, 'functionName': 'S3ObjectScanning-vHVIc4qyW86Q', 'taskToken': '', 'deleteOnSuccess': False, 'merge': False, 
                              'sourceType': 'alb', 'enrichmentPlugins': ['geo_ip', 'user_agent'],
                              'data': [{'source': {'bucket': staging_bucket_name, 'key': parquet_src_apigateway2}, 'destination': {'bucket': staging_bucket_name, 'key': parquet_dst_not_keep_prefix_apigateway2}}, 
                                       {'source': {'bucket': staging_bucket_name, 'key': parquet_src_apigateway3}, 'destination': {'bucket': staging_bucket_name, 'key': parquet_dst_not_keep_prefix_apigateway3}}
                             ]}
    migration_task = next(migration_task_iterator)
    migration_task.pop('taskId')
    migration_task.pop('parentTaskId')
    assert migration_task == {'executionName': execution_name, 'functionName': 'S3ObjectScanning-vHVIc4qyW86Q', 'taskToken': '', 'deleteOnSuccess': False, 'merge': False, 
                              'sourceType': 'alb', 'enrichmentPlugins': ['geo_ip', 'user_agent'],
                              'data': [{'source': {'bucket': staging_bucket_name, 'key': parquet_src_apigateway1}, 'destination': {'bucket': staging_bucket_name, 'key': parquet_dst_not_keep_prefix_apigateway1}}
                             ]}
    with pytest.raises(StopIteration):
        next(migration_task_iterator)
    
    scanning_task_info = next(AWS_DDB_ETL_LOG.query_subtasks(execution_name=execution_name, parent_task_id='00000000-0000-0000-0000-000000000000'))
    scanning_task_id = scanning_task_info['taskId']
    scanning_task_info.pop('taskId')
    scanning_task_info.pop('startTime')
    pipeline_index_key = scanning_task_info['pipelineIndexKey']
    scanning_task_info.pop('pipelineIndexKey')
    assert scanning_task_info['expirationTime'] > datetime.datetime.now(datetime.UTC).timestamp()
    scanning_task_info.pop('expirationTime')
    assert scanning_task_info == {'executionName': execution_name, 'functionName': 'S3ObjectScanning-vHVIc4qyW86Q', 
                                  'data': '{"totalSubTask": 2}', 'endTime': '', 'status': 'Running', 'parentTaskId': '00000000-0000-0000-0000-000000000000', 
                                  'API': 'Lambda: Invoke', 'stateName': 'Step 1: S3 Migration Task from Staging to Archive', 
                                  'stateMachineName': 'LogProcessor-HBTz7GoOjZoz', 
                                  'pipelineId': '189f73eb-1808-47e4-a9db-ee9c35100abe'}
    assert pipeline_index_key.split(':')[0] == '189f73eb-1808-47e4-a9db-ee9c35100abe'
    assert pipeline_index_key.split(':')[1] == 'LogProcessor-HBTz7GoOjZoz'
    assert pipeline_index_key.split(':')[2] != ''
    migration_task_info_iterator = AWS_DDB_ETL_LOG.query_subtasks(execution_name=execution_name, parent_task_id=scanning_task_id)
    migration_task_info = next(migration_task_info_iterator)
    migration_task_info.pop('taskId')
    migration_task_info.pop('startTime')
    pipeline_index_key = migration_task_info['pipelineIndexKey']
    migration_task_info.pop('pipelineIndexKey')
    assert migration_task_info['expirationTime'] > datetime.datetime.now(datetime.UTC).timestamp()
    migration_task_info.pop('expirationTime')
    assert migration_task_info == {'executionName': execution_name, 'functionName': 'S3ObjectScanning-vHVIc4qyW86Q', 
                                  'data': '', 'endTime': '', 'status': 'Running', 'parentTaskId': scanning_task_id, 
                                  'API': 'Lambda: Invoke', 'stateName': 'Step 1: S3 Migration Task from Staging to Archive', 
                                  'stateMachineName': 'LogProcessor-HBTz7GoOjZoz', 
                                  'pipelineId': '189f73eb-1808-47e4-a9db-ee9c35100abe'}
    assert pipeline_index_key.split(':')[0] == '189f73eb-1808-47e4-a9db-ee9c35100abe'
    assert pipeline_index_key.split(':')[1] == 'LogProcessor-HBTz7GoOjZoz'
    assert pipeline_index_key.split(':')[2] != ''
    migration_task_info = next(migration_task_info_iterator)
    migration_task_info.pop('taskId')
    migration_task_info.pop('startTime')
    pipeline_index_key = migration_task_info['pipelineIndexKey']
    migration_task_info.pop('pipelineIndexKey')
    assert migration_task_info['expirationTime'] > datetime.datetime.now(datetime.UTC).timestamp()
    migration_task_info.pop('expirationTime')
    assert migration_task_info == {'executionName': execution_name, 'functionName': 'S3ObjectScanning-vHVIc4qyW86Q', 
                                  'data': '', 'endTime': '', 'status': 'Running', 'parentTaskId': scanning_task_id, 
                                  'API': 'Lambda: Invoke', 'stateName': 'Step 1: S3 Migration Task from Staging to Archive', 
                                  'stateMachineName': 'LogProcessor-HBTz7GoOjZoz', 
                                  'pipelineId': '189f73eb-1808-47e4-a9db-ee9c35100abe'}
    assert pipeline_index_key.split(':')[0] == '189f73eb-1808-47e4-a9db-ee9c35100abe'
    assert pipeline_index_key.split(':')[1] == 'LogProcessor-HBTz7GoOjZoz'
    assert pipeline_index_key.split(':')[2] != ''
    with pytest.raises(StopIteration):
        next(migration_task_info_iterator)
    
    """ Scene 9:
    Testing Merge is False, DeleteOnSuccess is False, Size is 100MiB, keepPrefix is dict,
    The expected result is 2 SQS messages with 2 subtasks in DDB
    """
    
    execution_name = str(uuid.uuid4())
    scanning_event = copy.deepcopy(s3_object_scanning_event)
    scanning_event['executionName'] = execution_name
    scanning_event['merge'] = False
    scanning_event['keepPrefix'] = {"__ds__": {
            "type": "time",
            "from": "%Y-%m-%d-%H-%M",
            "to": "%Y-%m-%d-00-00",
        },
            "region": {
                "type": "retain",
            },
            "__execution_name__": {
                "type": "default",
                "value": "00000000-0000-0000-0000-000000000000"
            }
        }
    
    scanning_lambda_handler(scanning_event, scanning_context)
    migration_task_iterator = AWS_SQS.receive_message(url=migration_sqs_url)
    migration_task = next(migration_task_iterator)
    migration_task.pop('taskId')
    migration_task.pop('parentTaskId')
    assert migration_task == {'executionName': execution_name, 'functionName': 'S3ObjectScanning-vHVIc4qyW86Q', 'taskToken': '', 'deleteOnSuccess': False, 'merge': False, 
                              'sourceType': 'alb', 'enrichmentPlugins': ['geo_ip', 'user_agent'],
                              'data': [{'source': {'bucket': staging_bucket_name, 'key': parquet_src_apigateway2}, 'destination': {'bucket': staging_bucket_name, 'key': parquet_dst_keep_prefix_dict_apigateway2}}, 
                                       {'source': {'bucket': staging_bucket_name, 'key': parquet_src_apigateway3}, 'destination': {'bucket': staging_bucket_name, 'key': parquet_dst_keep_prefix_dict_apigateway3}},
                                       {'source': {'bucket': staging_bucket_name, 'key': parquet_src_apigateway1}, 'destination': {'bucket': staging_bucket_name, 'key': parquet_dst_keep_prefix_dict_apigateway1}}
                             ]}
    with pytest.raises(StopIteration):
        next(migration_task_iterator)
    
    scanning_task_info = next(AWS_DDB_ETL_LOG.query_subtasks(execution_name=execution_name, parent_task_id='00000000-0000-0000-0000-000000000000'))
    scanning_task_id = scanning_task_info['taskId']
    scanning_task_info.pop('taskId')
    scanning_task_info.pop('startTime')
    pipeline_index_key = scanning_task_info['pipelineIndexKey']
    scanning_task_info.pop('pipelineIndexKey')
    assert scanning_task_info['expirationTime'] > datetime.datetime.now(datetime.UTC).timestamp()
    scanning_task_info.pop('expirationTime')
    assert scanning_task_info == {'executionName': execution_name, 'functionName': 'S3ObjectScanning-vHVIc4qyW86Q', 
                                  'data': '{"totalSubTask": 1}', 'endTime': '', 'status': 'Running', 'parentTaskId': '00000000-0000-0000-0000-000000000000', 
                                  'API': 'Lambda: Invoke', 'stateName': 'Step 1: S3 Migration Task from Staging to Archive', 
                                  'stateMachineName': 'LogProcessor-HBTz7GoOjZoz', 
                                  'pipelineId': '189f73eb-1808-47e4-a9db-ee9c35100abe'}
    assert pipeline_index_key.split(':')[0] == '189f73eb-1808-47e4-a9db-ee9c35100abe'
    assert pipeline_index_key.split(':')[1] == 'LogProcessor-HBTz7GoOjZoz'
    assert pipeline_index_key.split(':')[2] != ''
    migration_task_info_iterator = AWS_DDB_ETL_LOG.query_subtasks(execution_name=execution_name, parent_task_id=scanning_task_id)
    migration_task_info = next(migration_task_info_iterator)
    migration_task_info.pop('taskId')
    migration_task_info.pop('startTime')
    pipeline_index_key = migration_task_info['pipelineIndexKey']
    migration_task_info.pop('pipelineIndexKey')
    assert migration_task_info['expirationTime'] > datetime.datetime.now(datetime.UTC).timestamp()
    migration_task_info.pop('expirationTime')
    assert migration_task_info == {'executionName': execution_name, 'functionName': 'S3ObjectScanning-vHVIc4qyW86Q', 
                                  'data': '', 'endTime': '', 'status': 'Running', 'parentTaskId': scanning_task_id, 
                                  'API': 'Lambda: Invoke', 'stateName': 'Step 1: S3 Migration Task from Staging to Archive', 
                                  'stateMachineName': 'LogProcessor-HBTz7GoOjZoz', 
                                  'pipelineId': '189f73eb-1808-47e4-a9db-ee9c35100abe'}
    assert pipeline_index_key.split(':')[0] == '189f73eb-1808-47e4-a9db-ee9c35100abe'
    assert pipeline_index_key.split(':')[1] == 'LogProcessor-HBTz7GoOjZoz'
    assert pipeline_index_key.split(':')[2] != ''
    with pytest.raises(StopIteration):
        next(migration_task_info_iterator)
    
    """ Scene 10:
    Test cases with no files in the bucket
    The expected result is 1 SQS messages with 0 subtasks in DDB
    """
    
    execution_name = str(uuid.uuid4())
    scanning_event = copy.deepcopy(s3_object_scanning_event)
    scanning_event.pop('enrichmentPlugins')
    scanning_event['executionName'] = execution_name
    scanning_event['srcPath'] = f's3://{staging_bucket_name}/not-exists-prefix'
    
    scanning_lambda_handler(scanning_event, scanning_context)
    migration_task_iterator = AWS_SQS.receive_message(url=migration_sqs_url)
    migration_task = next(migration_task_iterator)
    migration_task.pop('taskId')
    migration_task.pop('parentTaskId')
    assert migration_task == {'executionName': execution_name, 'functionName': 'S3ObjectScanning-vHVIc4qyW86Q', 'taskToken': '', 'deleteOnSuccess': False, 'merge': True, 
                              'sourceType': 'alb', 'enrichmentPlugins': [],
                              'data': []}
    with pytest.raises(StopIteration):
        next(migration_task_iterator)
    
    scanning_task_info = next(AWS_DDB_ETL_LOG.query_subtasks(execution_name=execution_name, parent_task_id='00000000-0000-0000-0000-000000000000'))
    scanning_task_id = scanning_task_info['taskId']
    scanning_task_info.pop('taskId')
    scanning_task_info.pop('startTime')
    pipeline_index_key = scanning_task_info['pipelineIndexKey']
    scanning_task_info.pop('pipelineIndexKey')
    assert scanning_task_info['expirationTime'] > datetime.datetime.now(datetime.UTC).timestamp()
    scanning_task_info.pop('expirationTime')
    assert scanning_task_info == {'executionName': execution_name, 'functionName': 'S3ObjectScanning-vHVIc4qyW86Q', 
                                  'data': '{"totalSubTask": 0}', 'endTime': '', 'status': 'Running', 'parentTaskId': '00000000-0000-0000-0000-000000000000', 
                                  'API': 'Lambda: Invoke', 'stateName': 'Step 1: S3 Migration Task from Staging to Archive', 
                                  'stateMachineName': 'LogProcessor-HBTz7GoOjZoz', 
                                  'pipelineId': '189f73eb-1808-47e4-a9db-ee9c35100abe'}
    assert pipeline_index_key.split(':')[0] == '189f73eb-1808-47e4-a9db-ee9c35100abe'
    assert pipeline_index_key.split(':')[1] == 'LogProcessor-HBTz7GoOjZoz'
    assert pipeline_index_key.split(':')[2] != ''
    migration_task_info_iterator = AWS_DDB_ETL_LOG.query_subtasks(execution_name=execution_name, parent_task_id=scanning_task_id)
    with pytest.raises(StopIteration):
        next(migration_task_info_iterator)
    
    """ Scene 11:
    Test cases with Merge is True and file size > size
    """
    
    execution_name = str(uuid.uuid4())
    scanning_event = copy.deepcopy(s3_object_scanning_event)
    scanning_event['executionName'] = execution_name
    scanning_event['merge'] = True
    scanning_event['size'] = '3000B'
    scanning_event['keepPrefix'] = {"__ds__": {
            "type": "time",
            "from": "%Y-%m-%d-%H-%M",
            "to": "%Y-%m-%d-00-00",
        },
            "region": {
                "type": "retain",
            },
            "__execution_name__": {
                "type": "default",
                "value": "00000000-0000-0000-0000-000000000000"
            }
        }
    
    scanning_lambda_handler(scanning_event, scanning_context)
    migration_task_iterator = AWS_SQS.receive_message(url=migration_sqs_url)
    migration_task = next(migration_task_iterator)
    migration_task.pop('taskId')
    migration_task.pop('parentTaskId')
    assert migration_task == {'executionName': execution_name, 'functionName': 'S3ObjectScanning-vHVIc4qyW86Q', 'taskToken': '', 'deleteOnSuccess': False, 'merge': False, 
                              'sourceType': 'alb', 'enrichmentPlugins': ['geo_ip', 'user_agent'],
                              'data': [{'source': {'bucket': staging_bucket_name, 'key': parquet_src_apigateway2}, 'destination': {'bucket': staging_bucket_name, 'key': parquet_dst_keep_prefix_dict_apigateway2}}, 
                                       {'source': {'bucket': staging_bucket_name, 'key': parquet_src_apigateway3}, 'destination': {'bucket': staging_bucket_name, 'key': parquet_dst_keep_prefix_dict_apigateway3}},
                                       {'source': {'bucket': staging_bucket_name, 'key': parquet_src_apigateway1}, 'destination': {'bucket': staging_bucket_name, 'key': parquet_dst_keep_prefix_dict_apigateway1}}
                             ]}
    with pytest.raises(StopIteration):
        next(migration_task_iterator)
    
    scanning_task_info = next(AWS_DDB_ETL_LOG.query_subtasks(execution_name=execution_name, parent_task_id='00000000-0000-0000-0000-000000000000'))
    scanning_task_id = scanning_task_info['taskId']
    scanning_task_info.pop('taskId')
    scanning_task_info.pop('startTime')
    pipeline_index_key = scanning_task_info['pipelineIndexKey']
    scanning_task_info.pop('pipelineIndexKey')
    assert scanning_task_info['expirationTime'] > datetime.datetime.now(datetime.UTC).timestamp()
    scanning_task_info.pop('expirationTime')
    assert scanning_task_info == {'executionName': execution_name, 'functionName': 'S3ObjectScanning-vHVIc4qyW86Q', 
                                  'data': '{"totalSubTask": 1}', 'endTime': '', 'status': 'Running', 'parentTaskId': '00000000-0000-0000-0000-000000000000', 
                                  'API': 'Lambda: Invoke', 'stateName': 'Step 1: S3 Migration Task from Staging to Archive', 
                                  'stateMachineName': 'LogProcessor-HBTz7GoOjZoz', 
                                  'pipelineId': '189f73eb-1808-47e4-a9db-ee9c35100abe'}
    assert pipeline_index_key.split(':')[0] == '189f73eb-1808-47e4-a9db-ee9c35100abe'
    assert pipeline_index_key.split(':')[1] == 'LogProcessor-HBTz7GoOjZoz'
    assert pipeline_index_key.split(':')[2] != ''
    migration_task_info_iterator = AWS_DDB_ETL_LOG.query_subtasks(execution_name=execution_name, parent_task_id=scanning_task_id)
    migration_task_info = next(migration_task_info_iterator)
    migration_task_info.pop('taskId')
    migration_task_info.pop('startTime')
    pipeline_index_key = migration_task_info['pipelineIndexKey']
    migration_task_info.pop('pipelineIndexKey')
    assert migration_task_info['expirationTime'] > datetime.datetime.now(datetime.UTC).timestamp()
    migration_task_info.pop('expirationTime')
    assert migration_task_info == {'executionName': execution_name, 'functionName': 'S3ObjectScanning-vHVIc4qyW86Q', 
                                  'data': '', 'endTime': '', 'status': 'Running', 'parentTaskId': scanning_task_id, 
                                  'API': 'Lambda: Invoke', 'stateName': 'Step 1: S3 Migration Task from Staging to Archive', 
                                  'stateMachineName': 'LogProcessor-HBTz7GoOjZoz', 
                                  'pipelineId': '189f73eb-1808-47e4-a9db-ee9c35100abe'}
    assert pipeline_index_key.split(':')[0] == '189f73eb-1808-47e4-a9db-ee9c35100abe'
    assert pipeline_index_key.split(':')[1] == 'LogProcessor-HBTz7GoOjZoz'
    assert pipeline_index_key.split(':')[2] != ''
    with pytest.raises(StopIteration):
        next(migration_task_info_iterator)
    
    """ Scene 12:
    Test cases with Merge is True and file size < size
    """
    
    execution_name = str(uuid.uuid4())
    scanning_event = copy.deepcopy(s3_object_scanning_event)
    scanning_event['executionName'] = execution_name
    scanning_event['merge'] = True
    scanning_event['size'] = '40KiB'
    scanning_event['keepPrefix'] = {"__ds__": {
            "type": "time",
            "from": "%Y-%m-%d-%H-%M",
            "to": "%Y-%m-%d-00-00",
        },
            "region": {
                "type": "retain",
            },
            "__execution_name__": {
                "type": "default",
                "value": "00000000-0000-0000-0000-000000000000"
            }
        }
    
    scanning_lambda_handler(scanning_event, scanning_context)
    migration_task_iterator = AWS_SQS.receive_message(url=migration_sqs_url)
    migration_task = next(migration_task_iterator)
    migration_task.pop('taskId')
    migration_task.pop('parentTaskId')
    assert migration_task == {'executionName': execution_name, 'functionName': 'S3ObjectScanning-vHVIc4qyW86Q', 'taskToken': '', 'deleteOnSuccess': False, 'merge': True, 
                              'sourceType': 'alb', 'enrichmentPlugins': ['geo_ip', 'user_agent'],
                              'data': [{'source': {'bucket': staging_bucket_name, 'key': parquet_src_apigateway2}, 'destination': {'bucket': staging_bucket_name, 'key': parquet_dst_keep_prefix_dict_apigateway2}}, 
                                       {'source': {'bucket': staging_bucket_name, 'key': parquet_src_apigateway3}, 'destination': {'bucket': staging_bucket_name, 'key': parquet_dst_keep_prefix_dict_apigateway3}}
                             ]}
    migration_task = next(migration_task_iterator)
    migration_task.pop('taskId')
    migration_task.pop('parentTaskId')
    assert migration_task == {'executionName': execution_name, 'functionName': 'S3ObjectScanning-vHVIc4qyW86Q', 'taskToken': '', 'deleteOnSuccess': False, 'merge': True, 
                              'sourceType': 'alb', 'enrichmentPlugins': ['geo_ip', 'user_agent'],
                              'data': [{'source': {'bucket': staging_bucket_name, 'key': parquet_src_apigateway1}, 'destination': {'bucket': staging_bucket_name, 'key': parquet_dst_keep_prefix_dict_apigateway1}}
                             ]}
    with pytest.raises(StopIteration):
        next(migration_task_iterator)
    
    scanning_task_info = next(AWS_DDB_ETL_LOG.query_subtasks(execution_name=execution_name, parent_task_id='00000000-0000-0000-0000-000000000000'))
    scanning_task_id = scanning_task_info['taskId']
    scanning_task_info.pop('taskId')
    scanning_task_info.pop('startTime')
    pipeline_index_key = scanning_task_info['pipelineIndexKey']
    scanning_task_info.pop('pipelineIndexKey')
    assert scanning_task_info['expirationTime'] > datetime.datetime.now(datetime.UTC).timestamp()
    scanning_task_info.pop('expirationTime')
    assert scanning_task_info == {'executionName': execution_name, 'functionName': 'S3ObjectScanning-vHVIc4qyW86Q', 
                                  'data': '{"totalSubTask": 2}', 'endTime': '', 'status': 'Running', 'parentTaskId': '00000000-0000-0000-0000-000000000000', 
                                  'API': 'Lambda: Invoke', 'stateName': 'Step 1: S3 Migration Task from Staging to Archive', 
                                  'stateMachineName': 'LogProcessor-HBTz7GoOjZoz', 
                                  'pipelineId': '189f73eb-1808-47e4-a9db-ee9c35100abe'}
    assert pipeline_index_key.split(':')[0] == '189f73eb-1808-47e4-a9db-ee9c35100abe'
    assert pipeline_index_key.split(':')[1] == 'LogProcessor-HBTz7GoOjZoz'
    assert pipeline_index_key.split(':')[2] != ''
    migration_task_info_iterator = AWS_DDB_ETL_LOG.query_subtasks(execution_name=execution_name, parent_task_id=scanning_task_id)
    migration_task_info = next(migration_task_info_iterator)
    migration_task_info.pop('taskId')
    migration_task_info.pop('startTime')
    pipeline_index_key = migration_task_info['pipelineIndexKey']
    migration_task_info.pop('pipelineIndexKey')
    assert migration_task_info['expirationTime'] > datetime.datetime.now(datetime.UTC).timestamp()
    migration_task_info.pop('expirationTime')
    assert migration_task_info == {'executionName': execution_name, 'functionName': 'S3ObjectScanning-vHVIc4qyW86Q', 
                                  'data': '', 'endTime': '', 'status': 'Running', 'parentTaskId': scanning_task_id, 
                                  'API': 'Lambda: Invoke', 'stateName': 'Step 1: S3 Migration Task from Staging to Archive', 
                                  'stateMachineName': 'LogProcessor-HBTz7GoOjZoz', 
                                  'pipelineId': '189f73eb-1808-47e4-a9db-ee9c35100abe'}
    assert pipeline_index_key.split(':')[0] == '189f73eb-1808-47e4-a9db-ee9c35100abe'
    assert pipeline_index_key.split(':')[1] == 'LogProcessor-HBTz7GoOjZoz'
    assert pipeline_index_key.split(':')[2] != ''
    migration_task_info = next(migration_task_info_iterator)
    migration_task_info.pop('taskId')
    migration_task_info.pop('startTime')
    pipeline_index_key = migration_task_info['pipelineIndexKey']
    migration_task_info.pop('pipelineIndexKey')
    assert migration_task_info['expirationTime'] > datetime.datetime.now(datetime.UTC).timestamp()
    migration_task_info.pop('expirationTime')
    assert migration_task_info == {'executionName': execution_name, 'functionName': 'S3ObjectScanning-vHVIc4qyW86Q', 
                                  'data': '', 'endTime': '', 'status': 'Running', 'parentTaskId': scanning_task_id, 
                                  'API': 'Lambda: Invoke', 'stateName': 'Step 1: S3 Migration Task from Staging to Archive', 
                                  'stateMachineName': 'LogProcessor-HBTz7GoOjZoz', 
                                  'pipelineId': '189f73eb-1808-47e4-a9db-ee9c35100abe'}
    assert pipeline_index_key.split(':')[0] == '189f73eb-1808-47e4-a9db-ee9c35100abe'
    assert pipeline_index_key.split(':')[1] == 'LogProcessor-HBTz7GoOjZoz'
    assert pipeline_index_key.split(':')[2] != ''
    with pytest.raises(StopIteration):
        next(migration_task_info_iterator)
    
    """ Scene 13:
    Test cases with Merge is True and has file size < size and file size > size
    """
    execution_name = str(uuid.uuid4())
    scanning_event = copy.deepcopy(s3_object_scanning_event)
    scanning_event['executionName'] = execution_name
    scanning_event['srcPath'] = f's3://{staging_bucket_name}/AWSLogs/{account_id}/centralized/aws_apigateway_logs_gz/__ds__=2023-03-13-02'
    scanning_event['merge'] = True
    scanning_event['size'] = '2500B'
    scanning_event['keepPrefix'] = {"__ds__": {
            "type": "time",
            "from": "%Y-%m-%d-%H-%M",
            "to": "%Y-%m-%d-00-00",
        },
            "region": {
                "type": "retain",
            },
            "__execution_name__": {
                "type": "default",
                "value": "00000000-0000-0000-0000-000000000000"
            }
        }

    scanning_lambda_handler(scanning_event, scanning_context)
    migration_task_iterator = AWS_SQS.receive_message(url=migration_sqs_url)
    migration_task = next(migration_task_iterator)
    migration_task.pop('taskId')
    migration_task.pop('parentTaskId')
    assert migration_task == {'executionName': execution_name, 'functionName': 'S3ObjectScanning-vHVIc4qyW86Q', 'taskToken': '', 'deleteOnSuccess': False, 'merge': True, 
                              'sourceType': 'alb', 'enrichmentPlugins': ['geo_ip', 'user_agent'],
                              'data': [{'source': {'bucket': staging_bucket_name, 'key': f'AWSLogs/{account_id}/centralized/aws_apigateway_logs_gz/__ds__=2023-03-13-02-05/region=us-east-1/__execution_name__=c399c496-3f6a-4f4d-99e6-890493f19278/apigateway2.gz'}, 'destination': {'bucket': staging_bucket_name, 'key': 'archive/centralized/aws_apigateway_logs_parquet/__ds__=2023-03-11-00/region=us-east-1/__execution_name__=00000000-0000-0000-0000-000000000000/apigateway2.gz'}}, 
                                       {'source': {'bucket': staging_bucket_name, 'key': f'AWSLogs/{account_id}/centralized/aws_apigateway_logs_gz/__ds__=2023-03-13-02-59/region=us-east-1/__execution_name__=c399c496-3f6a-4f4d-99e6-890493f19278/apigateway3.gz'}, 'destination': {'bucket': staging_bucket_name, 'key': 'archive/centralized/aws_apigateway_logs_parquet/__ds__=2023-03-11-00/region=us-east-1/__execution_name__=00000000-0000-0000-0000-000000000000/apigateway3.gz'}}
                             ]}
    migration_task = next(migration_task_iterator)
    migration_task.pop('taskId')
    migration_task.pop('parentTaskId')
    assert migration_task == {'executionName': execution_name, 'functionName': 'S3ObjectScanning-vHVIc4qyW86Q', 'taskToken': '', 'deleteOnSuccess': False, 'merge': False, 
                              'sourceType': 'alb', 'enrichmentPlugins': ['geo_ip', 'user_agent'],
                              'data': [{'source': {'bucket': staging_bucket_name, 'key': f'AWSLogs/{account_id}/centralized/aws_apigateway_logs_gz/__ds__=2023-03-13-02-01/region=us-east-1/__execution_name__=03ed14db-7a91-4eda-a44f-6270efce4fd9/apigateway1.gz'}, 'destination': {'bucket': staging_bucket_name, 'key': 'archive/centralized/aws_apigateway_logs_parquet/__ds__=2023-03-11-00/region=us-east-1/__execution_name__=00000000-0000-0000-0000-000000000000/apigateway1.gz'}}
                             ]}
    with pytest.raises(StopIteration):
        next(migration_task_iterator)
    
    scanning_task_info = next(AWS_DDB_ETL_LOG.query_subtasks(execution_name=execution_name, parent_task_id='00000000-0000-0000-0000-000000000000'))
    scanning_task_id = scanning_task_info['taskId']
    scanning_task_info.pop('taskId')
    scanning_task_info.pop('startTime')
    pipeline_index_key = scanning_task_info['pipelineIndexKey']
    scanning_task_info.pop('pipelineIndexKey')
    assert scanning_task_info['expirationTime'] > datetime.datetime.now(datetime.UTC).timestamp()
    scanning_task_info.pop('expirationTime')
    assert scanning_task_info == {'executionName': execution_name, 'functionName': 'S3ObjectScanning-vHVIc4qyW86Q', 
                                  'data': '{"totalSubTask": 2}', 'endTime': '', 'status': 'Running', 'parentTaskId': '00000000-0000-0000-0000-000000000000', 
                                  'API': 'Lambda: Invoke', 'stateName': 'Step 1: S3 Migration Task from Staging to Archive', 
                                  'stateMachineName': 'LogProcessor-HBTz7GoOjZoz', 
                                  'pipelineId': '189f73eb-1808-47e4-a9db-ee9c35100abe'}
    assert pipeline_index_key.split(':')[0] == '189f73eb-1808-47e4-a9db-ee9c35100abe'
    assert pipeline_index_key.split(':')[1] == 'LogProcessor-HBTz7GoOjZoz'
    assert pipeline_index_key.split(':')[2] != ''
    migration_task_info_iterator = AWS_DDB_ETL_LOG.query_subtasks(execution_name=execution_name, parent_task_id=scanning_task_id)
    migration_task_info = next(migration_task_info_iterator)
    migration_task_info.pop('taskId')
    migration_task_info.pop('startTime')
    pipeline_index_key = migration_task_info['pipelineIndexKey']
    migration_task_info.pop('pipelineIndexKey')
    assert migration_task_info['expirationTime'] > datetime.datetime.now(datetime.UTC).timestamp()
    migration_task_info.pop('expirationTime')
    assert migration_task_info == {'executionName': execution_name, 'functionName': 'S3ObjectScanning-vHVIc4qyW86Q', 
                                  'data': '', 'endTime': '', 'status': 'Running', 'parentTaskId': scanning_task_id, 
                                  'API': 'Lambda: Invoke', 'stateName': 'Step 1: S3 Migration Task from Staging to Archive', 
                                  'stateMachineName': 'LogProcessor-HBTz7GoOjZoz', 
                                  'pipelineId': '189f73eb-1808-47e4-a9db-ee9c35100abe'}
    assert pipeline_index_key.split(':')[0] == '189f73eb-1808-47e4-a9db-ee9c35100abe'
    assert pipeline_index_key.split(':')[1] == 'LogProcessor-HBTz7GoOjZoz'
    assert pipeline_index_key.split(':')[2] != ''
    migration_task_info = next(migration_task_info_iterator)
    migration_task_info.pop('taskId')
    migration_task_info.pop('startTime')
    pipeline_index_key = migration_task_info['pipelineIndexKey']
    migration_task_info.pop('pipelineIndexKey')
    assert migration_task_info['expirationTime'] > datetime.datetime.now(datetime.UTC).timestamp()
    migration_task_info.pop('expirationTime')
    assert migration_task_info == {'executionName': execution_name, 'functionName': 'S3ObjectScanning-vHVIc4qyW86Q', 
                                  'data': '', 'endTime': '', 'status': 'Running', 'parentTaskId': scanning_task_id, 
                                  'API': 'Lambda: Invoke', 'stateName': 'Step 1: S3 Migration Task from Staging to Archive', 
                                  'stateMachineName': 'LogProcessor-HBTz7GoOjZoz', 
                                  'pipelineId': '189f73eb-1808-47e4-a9db-ee9c35100abe'}
    assert pipeline_index_key.split(':')[0] == '189f73eb-1808-47e4-a9db-ee9c35100abe'
    assert pipeline_index_key.split(':')[1] == 'LogProcessor-HBTz7GoOjZoz'
    assert pipeline_index_key.split(':')[2] != ''
    with pytest.raises(StopIteration):
        next(migration_task_info_iterator)


def test_migration_task_generator(mock_s3_context, mock_iam_context, mock_sqs_context, mock_ddb_context):
    from s3_object_scanning.lambda_function import migration_task_generator, Parameters, AWS_SQS
    account_id = os.environ["ACCOUNT_ID"]
    staging_bucket_name = os.environ["STAGING_BUCKET_NAME"]
    s3_object_scanning_event = json.loads(os.environ["S3_OBJECT_SCANNING_EVENT"])

    event = s3_object_scanning_event.copy()
    param = Parameters(event)
    param.sqs_url = AWS_SQS.get_queue_url(param.sqs_name)
    param.size = 104857600
    
    assert migration_task_generator(param) == 1

    param.max_object_files_num_per_copy_task = 1
    assert migration_task_generator(param) == 1

    param.size = 2050
    param.max_object_files_num_per_copy_task = 2
    assert migration_task_generator(param) == 2

    param.max_object_files_num_per_copy_task = 2
    param.merge = True
    assert migration_task_generator(param) == 2

    param.source.prefix = f"AWSLogs/{account_id}/centralized/aws_apigateway_logs_gz"
    param.max_object_files_num_per_copy_task = 1
    param.merge = False
    assert migration_task_generator(param) == 9

    param.source.prefix = f"AWSLogs/{account_id}/centralized/aws_apigateway_logs_gz"
    param.max_object_files_num_per_copy_task = 2
    param.merge = False
    assert migration_task_generator(param) == 5

    param.source.prefix = f"AWSLogs/{account_id}/centralized/aws_apigateway_logs_gz"
    param.max_object_files_num_per_copy_task = 1
    param.merge = False
    param.keep_prefix = False
    assert migration_task_generator(param) == 9

    param.source.prefix = f"AWSLogs/{account_id}/centralized/aws_apigateway_logs_gz"
    param.max_object_files_num_per_copy_task = 2
    param.merge = False
    param.keep_prefix = False
    assert migration_task_generator(param) == 5
    
    param.source.prefix = f"AWSLogs/{account_id}/centralized/aws_apigateway_logs_gz"
    param.max_object_files_num_per_copy_task = 3
    param.merge = False
    param.keep_prefix = False
    assert migration_task_generator(param) == 3
    
    param.source.prefix = f"AWSLogs/{account_id}/centralized/aws_apigateway_logs_gz"
    param.size = 104857600
    param.max_object_files_size_per_copy_task = 2048
    param.max_object_files_num_per_copy_task = 2
    param.merge = True
    param.keep_prefix = {"__ds__": { # type: ignore
            "type": "time",
            "from": "%Y-%m-%d-%H-%M",
            "to": "%Y-%m-%d-00-00",
        },
            "region": {
                "type": "retain",
            },
            "__execution_name__": {
                "type": "default",
                "value": "00000000-0000-0000-0000-000000000000"
            }
        }
    assert migration_task_generator(param) == 3
    
    param.source.prefix = f"AWSLogs/{account_id}/centralized/aws_apigateway_logs_gz"
    param.size = 104857600
    param.max_object_files_size_per_copy_task = 2048
    param.max_object_files_num_per_copy_task = 3
    param.merge = True
    param.keep_prefix = {"__ds__": { # type: ignore
            "type": "time",
            "from": "%Y-%m-%d-%H-%M",
            "to": "%Y-%m-%d-00-00",
        },
            "region": {
                "type": "retain",
            },
            "__execution_name__": {
                "type": "default",
                "value": "00000000-0000-0000-0000-000000000000"
            }
        }
    assert migration_task_generator(param) == 3

    event['size'] = '3 KiB'
    param = Parameters(event)
    param.sqs_url = AWS_SQS.get_queue_url(param.sqs_name)
    param.source.prefix = f"AWSLogs/{account_id}/centralized/aws_apigateway_logs_gz"
    param.merge = True
    param.keep_prefix = {"__ds__": { # type: ignore
            "type": "time",
            "from": "%Y-%m-%d-%H-%M",
            "to": "%Y-%m-%d-00-00",
        },
            "region": {
                "type": "retain",
            },
            "__execution_name__": {
                "type": "default",
                "value": "00000000-0000-0000-0000-000000000000"
            }
        }
    assert migration_task_generator(param) == 6

    event['size'] = '1 MiB'
    param = Parameters(event)
    param.sqs_url = AWS_SQS.get_queue_url(param.sqs_name)
    param.source.prefix = f"AWSLogs/{account_id}/centralized/aws_apigateway_logs_gz"
    param.merge = True
    param.keep_prefix = {"__ds__": { # type: ignore
            "type": "time",
            "from": "%Y-%m-%d-%H-%M",
            "to": "%Y-%m-%d-00-00",
        },
            "region": {
                "type": "retain",
            },
            "__execution_name__": {
                "type": "default",
                "value": "00000000-0000-0000-0000-000000000000"
            }
        }
    assert migration_task_generator(param) == 3
    
    event['size'] = '1 B'
    param = Parameters(event)
    param.sqs_url = AWS_SQS.get_queue_url(param.sqs_name)
    param.source.prefix = f"AWSLogs/{account_id}/centralized/aws_apigateway_logs_gz"
    param.merge = True
    param.keep_prefix = {"__ds__": { # type: ignore
            "type": "time",
            "from": "%Y-%m-%d-%H-%M",
            "to": "%Y-%m-%d-00-00",
        },
            "region": {
                "type": "retain",
            },
            "__execution_name__": {
                "type": "default",
                "value": "00000000-0000-0000-0000-000000000000"
            }
        }

    assert migration_task_generator(param) == 1
    
    event['size'] = '4 KiB'
    param = Parameters(event)
    param.sqs_url = AWS_SQS.get_queue_url(param.sqs_name)
    param.source.prefix = f"AWSLogs/{account_id}/centralized/aws_apigateway_logs_gz"
    param.merge = True
    param.keep_prefix = {"__ds__": { # type: ignore
            "type": "time",
            "from": "%Y-%m-%d-%H-%M",
            "to": "%Y-%m-%d-00-00",
        },
            "region": {
                "type": "retain",
            },
            "__execution_name__": {
                "type": "default",
                "value": "00000000-0000-0000-0000-000000000000"
            }
        }

    assert migration_task_generator(param) == 6
    
    event = s3_object_scanning_event.copy()
    event['srcPath'] = f's3://{staging_bucket_name}/AWSLogs/{account_id}/elasticloadbalancing/elb'
    event['maxObjectFilesNumPerCopyTask'] = 100
    event['merge'] = False
    param = Parameters(event)
    param.sqs_url = AWS_SQS.get_queue_url(param.sqs_name)

    assert migration_task_generator(param) == 20
    
    # test merge is True and file size < size
    event = s3_object_scanning_event.copy()
    event['srcPath'] = f's3://{staging_bucket_name}/AWSLogs/{account_id}/centralized/aws_apigateway_logs_gz'
    event['size'] = '3000B'
    event['merge'] = True
    param = Parameters(event)
    param.sqs_url = AWS_SQS.get_queue_url(param.sqs_name)
    param.keep_prefix = {"__ds__": { # type: ignore
            "type": "time",
            "from": "%Y-%m-%d-%H-%M",
            "to": "%Y-%m-%d-00-00",
        },
            "region": {
                "type": "retain",
            },
            "__execution_name__": {
                "type": "default",
                "value": "00000000-0000-0000-0000-000000000000"
            }
        }
    assert migration_task_generator(param) == 6
    
    # test merge is False
    event = s3_object_scanning_event.copy()
    event['srcPath'] = f's3://{staging_bucket_name}/AWSLogs/{account_id}/centralized/aws_apigateway_logs_gz'
    event['size'] = 100
    event['merge'] = False
    param = Parameters(event)
    param.sqs_url = AWS_SQS.get_queue_url(param.sqs_name)
    assert migration_task_generator(param) == 1
    
    # test merge is True and file size > size
    event = s3_object_scanning_event.copy()
    event['srcPath'] = f's3://{staging_bucket_name}/AWSLogs/{account_id}/centralized/aws_apigateway_logs_gz'
    event['size'] = '2000B'
    event['merge'] = True
    param = Parameters(event)
    param.sqs_url = AWS_SQS.get_queue_url(param.sqs_name)
    param.keep_prefix = {"__ds__": { # type: ignore
            "type": "time",
            "from": "%Y-%m-%d-%H-%M",
            "to": "%Y-%m-%d-00-00",
        },
            "region": {
                "type": "retain",
            },
            "__execution_name__": {
                "type": "default",
                "value": "00000000-0000-0000-0000-000000000000"
            }
        }
    assert migration_task_generator(param) == 1


def test_migration_task_writer(mock_s3_context, mock_iam_context, mock_sqs_context, mock_ddb_context):
    from s3_object_scanning.lambda_function import migration_task_writer, Parameters, AWS_S3, AWS_SQS, AWS_DDB_ETL_LOG
    s3_object_scanning_event = json.loads(os.environ["S3_OBJECT_SCANNING_EVENT"])
    function_name =  os.environ["S3_OBJECTS_SCANNING_FUNCTION_NAME"]

    event = s3_object_scanning_event.copy()
    event['functionName'] = function_name
    event['taskId'] = '0b40a554-7004-48fd-8998-742853bfa620'
    param = Parameters(event)
    param.sqs_url = AWS_SQS.get_queue_url(param.sqs_name)
    
    tasks = [{'source': {'bucket': param.source.bucket, 'key': 'AWSLogs/3a2p257d.log.gz'}, 'destination': {'bucket': param.destination.bucket, 'key': 'archive/aws_alb_logs/3a2p257d.log.gz'}}]

    parent_task_id = str(uuid.uuid4())
    migration_task_writer(tasks, param.sqs_msg, param.sqs_url, param.ddb_item, parent_task_id=parent_task_id)
    response = next(AWS_DDB_ETL_LOG.query_item(execution_name=param.execution_name, consistent=True))
    response.pop('startTime')
    response.pop('taskId')
    pipeline_index_key = response['pipelineIndexKey']
    response.pop('pipelineIndexKey')
    assert response['expirationTime'] > datetime.datetime.now(datetime.UTC).timestamp()
    response.pop('expirationTime')
    assert response == {
        'executionName': 'e4233e1a-1797-49d5-926f-3339504296df', 
        'functionName': function_name, 
        'data': '', 
        'endTime': '', 
        'status': 'Running', 
        'parentTaskId': parent_task_id, 
        'API': 'Lambda: Invoke', 
        'stateName': 'Step 1: S3 Migration Task from Staging to Archive', 
        'stateMachineName': 'LogProcessor-HBTz7GoOjZoz', 
        'pipelineId': '189f73eb-1808-47e4-a9db-ee9c35100abe',
        }
    assert pipeline_index_key.split(':')[0] == '189f73eb-1808-47e4-a9db-ee9c35100abe'
    assert pipeline_index_key.split(':')[1] == 'LogProcessor-HBTz7GoOjZoz'
    assert pipeline_index_key.split(':')[2] != ''
    
    response = AWS_SQS.receive_message(param.sqs_url)
    msg = next(response)
    msg.pop('taskId')
    assert msg == {
        'sourceType': 'alb', 'enrichmentPlugins': ['geo_ip', 'user_agent'],
        'executionName': 'e4233e1a-1797-49d5-926f-3339504296df', 
        'functionName': function_name, 
        'taskToken': '', 
        'deleteOnSuccess': False, 
        'merge': True, 
        'data': [{'source': {'bucket': 'staging-bucket', 'key': 'AWSLogs/3a2p257d.log.gz'}, 'destination': {'bucket': 'staging-bucket', 'key': 'archive/aws_alb_logs/3a2p257d.log.gz'}}], 
        'parentTaskId': parent_task_id
        }

    execution_name = str(uuid.uuid4())
    event['executionName'] = execution_name
    param = Parameters(event)
    param.sqs_url = AWS_SQS.get_queue_url(param.sqs_name)
    tasks = [{'source': {'bucket': param.source.bucket, 'key': 'AWSLogs/3a2p257d.log.gz'}, 'destination': {'bucket': param.destination.bucket, 'key': 'archive/aws_alb_logs/3a2p257d.log.gz'}}]

    migration_task_writer(tasks, param.sqs_msg, param.sqs_url, param.ddb_item)
    response = next(AWS_DDB_ETL_LOG.query_item(execution_name=param.execution_name, consistent=True))
    response.pop('startTime')
    response.pop('taskId')
    pipeline_index_key = response['pipelineIndexKey']
    response.pop('pipelineIndexKey')
    assert response['expirationTime'] > datetime.datetime.now(datetime.UTC).timestamp()
    response.pop('expirationTime')
    assert response == {
        'executionName': execution_name, 
        'functionName': function_name, 
        'data': '', 
        'endTime': '', 
        'status': 'Running', 
        'parentTaskId': '', 
        'API': 'Lambda: Invoke', 
        'stateName': 'Step 1: S3 Migration Task from Staging to Archive', 
        'stateMachineName': 'LogProcessor-HBTz7GoOjZoz', 
        'pipelineId': '189f73eb-1808-47e4-a9db-ee9c35100abe'
        }
    assert pipeline_index_key.split(':')[0] == '189f73eb-1808-47e4-a9db-ee9c35100abe'
    assert pipeline_index_key.split(':')[1] == 'LogProcessor-HBTz7GoOjZoz'
    assert pipeline_index_key.split(':')[2] != ''
    
    response = AWS_SQS.receive_message(param.sqs_url)
    msg = next(response)
    msg.pop('taskId')
    assert msg == {'sourceType': 'alb', 'enrichmentPlugins': ['geo_ip', 'user_agent'], 'executionName': execution_name, 'functionName': function_name, 'taskToken': '', 'deleteOnSuccess': False, 'merge': True, 'data': [{'source': {'bucket': 'staging-bucket', 'key': 'AWSLogs/3a2p257d.log.gz'}, 'destination': {'bucket': 'staging-bucket', 'key': 'archive/aws_alb_logs/3a2p257d.log.gz'}}], 'parentTaskId': ''}


def test_time_partition_transform(mock_s3_context, mock_iam_context, mock_sqs_context, mock_ddb_context):
    from s3_object_scanning.lambda_function import time_partition_transform

    assert time_partition_transform('2023-01-01-03-59', '%Y-%m-%d-%H-%M', '%Y-%m-%d-00-00') == '2023-01-01-00-00'
    assert time_partition_transform('2023-01-01-03-59', '%Y-%m-%d-%H-%M') == '2023-01-01-00-00'
    assert time_partition_transform('2023-01-01-03-59', to_format='%Y-%m-%d-00-00') == '2023-01-01-00-00'
    assert time_partition_transform('2023-01-01-03-59', to_format='%Y-%m-%d-%H-%M') == '2023-01-01-03-59'
    assert time_partition_transform('2023-01-01-03-59') == '2023-01-01-00-00'

    with pytest.raises(Exception) as exception_info:
        time_partition_transform('2023-01-01-03-60')
    assert exception_info.value.args[0] == 'unconverted data remains: 0'

    with pytest.raises(Exception) as exception_info:
        time_partition_transform('2023-01-01-24-59')
    assert exception_info.value.args[0] == "time data '2023-01-01-24-59' does not match format '%Y-%m-%d-%H-%M'"

    with pytest.raises(Exception) as exception_info:
        time_partition_transform('2023-01-32-03-59')
    assert exception_info.value.args[0] == "time data '2023-01-32-03-59' does not match format '%Y-%m-%d-%H-%M'"

    with pytest.raises(Exception) as exception_info:
        time_partition_transform('2023-13-01-03-59')
    assert exception_info.value.args[0] == "time data '2023-13-01-03-59' does not match format '%Y-%m-%d-%H-%M'"

    with pytest.raises(Exception) as exception_info:
        time_partition_transform('2023-12-01-03-59', '%Y-%m-%d-00-00')
    assert exception_info.value.args[0] == "time data '2023-12-01-03-59' does not match format '%Y-%m-%d-00-00'"

    # assert time_partition_transform('2023-12-01-03-59', from_format='%Y-%m-%d-%H-%M', to_format='%Y-%i-%K-00-00') == '2023-i-K-00-00'


def test_prefix_converter(mock_s3_context, mock_iam_context, mock_sqs_context, mock_ddb_context):
    from s3_object_scanning.lambda_function import prefix_converter
    # Test the conversion time format of __ds__, retain region pk, set default value to __execution_name__
    dest_prefix = prefix_converter(
        prefix='test/apachelogs_delta/__ds__=2022-11-07-01-02/region=us-west-1/__execution_name__=99cc021e-d2b8-4eef-81f8-51954ddaa472/20221107_075154_00055_6j3ik',
        keep_prefix={"__ds__": {
            "type": "time",
            "from": "%Y-%m-%d-%H-%M",
            "to": "%Y-%m-%d-00-00",
        },
            "region": {
                "type": "retain",
            },
            "__execution_name__": {
                "type": "default",
                "value": "00000000-0000-0000-0000-000000000000"
            }
        }
    )
    assert dest_prefix == 'test/apachelogs_delta/__ds__=2022-11-07-00-00/region=us-west-1/__execution_name__=00000000-0000-0000-0000-000000000000/20221107_075154_00055_6j3ik'

    # Test the conversion time format of __ds__, retain region pk, set default value to __execution_name__ , preserve character case.
    dest_prefix = prefix_converter(
        prefix='test/apachelogs_delta/__Ds__=2022-11-07-01-02/Region=us-west-1/__Execution_name__=99cc021e-d2b8-4eef-81f8-51954ddaa472/20221107_075154_00055_6j3ik',
        keep_prefix={"__ds__": {
            "type": "time",
            "from": "%Y-%m-%d-%H-%M",
            "to": "%Y-%m-%d-00-00",
        },
            "region": {
                "type": "retain",
            },
            "__execution_name__": {
                "type": "default",
                "value": "00000000-0000-0000-0000-000000000000"
            }
        }
    )
    assert dest_prefix == 'test/apachelogs_delta/__Ds__=2022-11-07-00-00/Region=us-west-1/__Execution_name__=00000000-0000-0000-0000-000000000000/20221107_075154_00055_6j3ik'

    # Test the conversion time format of __ds__, delete region pk, set default value to __execution_name__
    dest_prefix = prefix_converter(
        prefix='test/apachelogs_delta/__ds__=2022-11-07-01-02/Region=us-west-1/__execution_name__=99cc021e-d2b8-4eef-81f8-51954ddaa472/20221107_075154_00055_6j3ik',
        keep_prefix={"__ds__": {
            "type": "time",
            "from": "%Y-%m-%d-%H-%M",
            "to": "%Y-%m-%d-%H-00",
        },
            "__execution_name__": {
                "type": "default",
                "value": "00000000-0000-0000-0000-000000000000"
            }
        }
    )
    assert dest_prefix == 'test/apachelogs_delta/__ds__=2022-11-07-01-00/__execution_name__=00000000-0000-0000-0000-000000000000/20221107_075154_00055_6j3ik'

    # Test the conversion time format of __ds__, delete region pk, set default value to __execution_name__, preserve character case.
    dest_prefix = prefix_converter(
        prefix='test/apachelogs_delta/__Ds__=2022-11-07-01-02/Region=us-west-1/__Execution_name__=99cc021e-d2b8-4eef-81f8-51954ddaa472/20221107_075154_00055_6j3ik',
        keep_prefix={"__ds__": {
            "type": "time",
            "from": "%Y-%m-%d-%H-%M",
            "to": "%Y-%m-%d-%H-00",
        },
            "__execution_name__": {
                "type": "default",
                "value": "00000000-0000-0000-0000-000000000000"
            }
        }
    )
    assert dest_prefix == 'test/apachelogs_delta/__Ds__=2022-11-07-01-00/__Execution_name__=00000000-0000-0000-0000-000000000000/20221107_075154_00055_6j3ik'

    # Test the keep prefix
    dest_prefix = prefix_converter(
        prefix='test/apachelogs_delta/__ds__=2022-11-07-01-02/region=us-west-1/__execution_name__=99cc021e-d2b8-4eef-81f8-51954ddaa472/20221107_075154_00055_6j3ik',
        keep_prefix=True
    )
    assert dest_prefix == 'test/apachelogs_delta/__ds__=2022-11-07-01-02/region=us-west-1/__execution_name__=99cc021e-d2b8-4eef-81f8-51954ddaa472/20221107_075154_00055_6j3ik'

    # Test do not keep prefix
    dest_prefix = prefix_converter(
        prefix='test/apachelogs_delta/__ds__=2022-11-07-01-02/region=us-west-1/__execution_name__=99cc021e-d2b8-4eef-81f8-51954ddaa472/20221107_075154_00055_6j3ik',
        keep_prefix=False
    )
    assert dest_prefix == '20221107_075154_00055_6j3ik'
