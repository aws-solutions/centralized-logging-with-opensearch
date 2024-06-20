# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import os
import sys
import copy
import uuid
import json
import gzip
import types
import base64
import pytest
import datetime
from boto3.dynamodb.conditions import Attr
from test.mock import mock_s3_context, mock_iam_context, mock_ddb_context, mock_sqs_context, mock_sfn_context, default_environment_variables


sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


class TestParameter:
    def test_parameter(self, mock_s3_context, mock_iam_context, mock_sqs_context, mock_ddb_context):
        from s3_object_migration.lambda_function import Parameters, AWS_S3, AWS_DDB_ETL_LOG

        account_id = os.environ["ACCOUNT_ID"]
        aws_region = os.environ["AWS_REGION"]
        staging_bucket_name = os.environ["STAGING_BUCKET_NAME"]
        s3_object_migration_event = json.loads(os.environ["S3_OBJECT_MIGRATION_EVENT"])
        function_name = os.environ["S3_OBJECTS_MIGRATION_FUNCTION_NAME"]
        event = copy.deepcopy(s3_object_migration_event)

        record = event['Records'][0]['body']
        param = Parameters(record)
        assert param.source_type == ''
        assert param.data == [{'source': {
            'bucket': staging_bucket_name,
            'key': f'AWSLogs/{account_id}/centralized/aws_apigateway_logs_gz/__ds__=2023-03-11-20-01/region={aws_region}/__execution_name__=b49a793b-38d2-40c0-af22-cfacf494732e/apigateway1.gz'},
            'destination': {
                'bucket': staging_bucket_name,
                'key': f'archive/AWSLogs/{account_id}/centralized/aws_apigateway_logs_gz/__ds__=2023-03-11-20-01/region={aws_region}/__execution_name__=b49a793b-38d2-40c0-af22-cfacf494732e/apigateway1.gz'}}]
        assert param.delete_on_success is False
        assert param.merge is False
        assert param.parent_task_id == '6b10286b-c4b3-44ed-b4e8-c251a04b6a59'
        assert param.task_token == ''

        event = copy.deepcopy(s3_object_migration_event)
        record = event['Records'][0]['body']
        record.pop('taskToken')
        record.pop('data')
        record.pop('deleteOnSuccess')
        record.pop('merge')
        param = Parameters(record)
        assert param.data == []
        assert param.delete_on_success is True
        assert param.merge is False
        assert param.task_token is None

        event = copy.deepcopy(s3_object_migration_event)
        record = event['Records'][0]['body']
        record['data'] = {}
        record['deleteOnSuccess'] = 'true'
        record['merge'] = 'false'
        param = Parameters(record)
        assert param.data == []
        assert param.delete_on_success is True
        assert param.merge is False
        
        event = copy.deepcopy(s3_object_migration_event)
        record = event['Records'][0]['body']
        record['sourceType'] = 'alb'
        record['enrichmentPlugins'] = ['geo_ip']
        param = Parameters(record)
        assert param.source_type == 'alb'

        assert param._get_parameter_value(True, (bool, str), False) is True
        assert param._get_parameter_value(True, int, 2) is True
        assert param._get_parameter_value(False, int, 2) is False
        assert param._get_parameter_value(True, str, 2) == 2
        assert param._get_parameter_value(2, bool, True) is True
        assert param._get_parameter_value(1, bool, True) is True
        assert param._get_parameter_value(0, bool, True) is True
        assert param._get_parameter_value('1', bool, True) is True
        assert param._get_parameter_value('0', bool, False) is False

        for required_param in ('executionName', 'taskId', 'parentTaskId'):
            event = copy.deepcopy(s3_object_migration_event)
            record = event['Records'][0]['body']
            record.pop(required_param)
            with pytest.raises(Exception) as exception_info:
                Parameters(record)
            assert exception_info.value.args[0] == f'Missing value for {required_param}.'

    
def record_body_to_base64(event):
    for record in event.get('Records', []):
        msg = record['body']
        msg_base64 = base64.b64encode(gzip.compress(bytes(json.dumps(msg), encoding='utf-8'))).decode('utf-8')
        record['body'] = msg_base64
    return event
    
def sqs_msg_to_lambda_event(sqs_client, url):
    event = {'Records': []}
    while True:
        msg = sqs_client.receive_message(QueueUrl=url, AttributeNames= ['ALL'])
        if msg.get('Messages') is None:
            break
        for message in msg['Messages']:
            event['Records'].append({'body': message['Body']})
    return event


def list_object_keys(s3_client, bucket, prefix):
    object = []
    for content in s3_client.list_objects(bucket, prefix):
        object.append(content['Key'])
    return object


def mock_boto3_api_call(self, operation_name, kwarg):
    from botocore.exceptions import ClientError
    
    if operation_name == 'Query':
        return {'Count': 0}
    elif operation_name == 'GetItem':
        return {}
    elif operation_name in ('SendTaskHeartbeat', 'SendTaskSuccess', 'SendTaskFailure'):
        return {}
     
     
def test_lambda_handler(mock_s3_context, mock_iam_context, mock_sqs_context, mock_ddb_context, mock_sfn_context):
    from unittest.mock import patch
    from s3_object_migration.lambda_function import lambda_handler as migration_lambda_handler, AWS_S3, AWS_DDB_ETL_LOG
    
    def list_object_keys(AWS_S3, bucket, prefix):
        object = []
        for content in AWS_S3.list_objects(bucket, prefix):
            object.append(content['Key'])
        return object
    
    account_id = os.environ["ACCOUNT_ID"]
    aws_region = os.environ["AWS_REGION"]
    staging_bucket_name = os.environ["STAGING_BUCKET_NAME"]
    migration_sqs_url = os.environ['MIGRATION_SQS_URL']
    execution_name = '1ebf165b-f846-4813-8cab-305be5c8ca7e'
    parent_task_id = '6b10286b-c4b3-44ed-b4e8-c251a04b6a59'
    sub_task1_id = '9d512f44-7626-49e2-a465-f450e93f6388'
    sub_task2_id = 'bc73c25b-49c1-4d9f-a005-d0853809260d'
    
    s3_object_migration_event = json.loads(os.environ["S3_OBJECT_MIGRATION_EVENT"])
    migration_function_name = os.environ["S3_OBJECTS_MIGRATION_FUNCTION_NAME"]
    migration_context = types.SimpleNamespace()
    migration_context.function_name = migration_function_name
    
    with pytest.raises(Exception) as exception_info:
        migration_lambda_handler('not-a-dict', {})
    assert exception_info.value.args[0] == 'The event is not a dict.'

    event = copy.deepcopy(s3_object_migration_event)
    event_base64 = record_body_to_base64(event)

    migration_lambda_handler(event_base64, migration_context)
    objects = list_object_keys(AWS_S3, staging_bucket_name,
                               f'archive/AWSLogs/{account_id}/centralized/aws_apigateway_logs_gz/__ds__=2023-03-11-20-01/region={aws_region}')
    assert objects == [
        'archive/AWSLogs/123456789012/centralized/aws_apigateway_logs_gz/__ds__=2023-03-11-20-01/region=us-east-1/__execution_name__=b49a793b-38d2-40c0-af22-cfacf494732e/apigateway1.gz',
        'archive/AWSLogs/123456789012/centralized/aws_apigateway_logs_gz/__ds__=2023-03-11-20-01/region=us-east-1/__execution_name__=b49a793b-38d2-40c0-af22-cfacf494732e/apigateway2.gz']

    objects = list_object_keys(AWS_S3, staging_bucket_name,
                               f'AWSLogs/{account_id}/centralized/aws_apigateway_logs_gz/__ds__=2023-03-11-20-01/region={aws_region}')
    assert objects == [
        'AWSLogs/123456789012/centralized/aws_apigateway_logs_gz/__ds__=2023-03-11-20-01/region=us-east-1/__execution_name__=b49a793b-38d2-40c0-af22-cfacf494732e/apigateway1.gz',
        'AWSLogs/123456789012/centralized/aws_apigateway_logs_gz/__ds__=2023-03-11-20-01/region=us-east-1/__execution_name__=b49a793b-38d2-40c0-af22-cfacf494732e/apigateway2.gz',
        'AWSLogs/123456789012/centralized/aws_apigateway_logs_gz/__ds__=2023-03-11-20-01/region=us-east-1/__execution_name__=b49a793b-38d2-40c0-af22-cfacf494732e/apigateway3.gz']

    assert AWS_DDB_ETL_LOG.get(execution_name, parent_task_id)['status'] == 'Succeeded'
    assert AWS_DDB_ETL_LOG.get_subtask_status_count(execution_name, parent_task_id, status='Succeeded')[
               'taskCount'] == 2

    AWS_DDB_ETL_LOG.update(execution_name=execution_name, task_id=parent_task_id,
                           item={'endTime': '', 'status': 'Running'})
    AWS_DDB_ETL_LOG.update(execution_name=execution_name, task_id=parent_task_id,
                           item={'endTime': '', 'status': 'Running'})
    AWS_DDB_ETL_LOG.update(execution_name=execution_name, task_id=parent_task_id,
                           item={'endTime': '', 'status': 'Running'})

    for content in AWS_S3.list_objects(staging_bucket_name,
                                       f'archive/AWSLogs/{account_id}/centralized/aws_apigateway_logs_gz/__ds__=2023-03-11-20-01/region={aws_region}'):
        AWS_S3.delete_object(staging_bucket_name, content['Key'])

    # test merge txt file
    event = copy.deepcopy(s3_object_migration_event)
    event['Records'][0]['body']['merge'] = True
    event['Records'][0]['body']['deleteOnSuccess'] = True
    event['Records'][1]['body']['merge'] = True
    event['Records'][1]['body']['deleteOnSuccess'] = True
    merge_task_data1 = [{'source': {
        'bucket': os.environ["STAGING_BUCKET_NAME"],
        'key': f'AWSLogs/{account_id}/elasticloadbalancing/alb1.log'},
        'destination': {
            'bucket': staging_bucket_name,
            'key': f'archive/AWSLogs/{account_id}/elasticloadbalancing/alb1.log'}},
        {'source': {
            'bucket': staging_bucket_name,
            'key': f'AWSLogs/{account_id}/elasticloadbalancing/alb2.log'},
            'destination': {
                'bucket': staging_bucket_name,
                'key': f'archive/AWSLogs/{account_id}/elasticloadbalancing/alb2.log'}}
    ]
    merge_task_data2 = [{'source': {
        'bucket': staging_bucket_name,
        'key': f'AWSLogs/{account_id}/elasticloadbalancing/alb3.log'},
        'destination': {
            'bucket': staging_bucket_name,
            'key': f'archive/AWSLogs/{account_id}/elasticloadbalancing/alb3.log'}}

    ]
    event['Records'][0]['body']['data'] = merge_task_data1
    event['Records'][1]['body']['data'] = merge_task_data2

    event_base64 = record_body_to_base64(event)
    migration_lambda_handler(event_base64, migration_context)
    objects = list_object_keys(AWS_S3, staging_bucket_name,
                               f'archive/AWSLogs/{account_id}/elasticloadbalancing/')
    assert objects == [
        f'archive/AWSLogs/{account_id}/elasticloadbalancing/alb1.log',
        f'archive/AWSLogs/{account_id}/elasticloadbalancing/alb3.log']

    objects = list_object_keys(AWS_S3, staging_bucket_name,
                               f'AWSLogs/{account_id}/elasticloadbalancing/alb')
    assert objects == []

    # test merge gzip file
    event = copy.deepcopy(s3_object_migration_event)
    event['Records'][0]['body']['merge'] = True
    event['Records'][0]['body']['deleteOnSuccess'] = True
    event['Records'][1]['body']['merge'] = True
    event['Records'][1]['body']['deleteOnSuccess'] = True
    merge_task_data1 = [{'source': {
        'bucket': staging_bucket_name,
        'key': f'AWSLogs/{account_id}/centralized/aws_apigateway_logs_gz/__ds__=2023-03-11-20-01/region={aws_region}/__execution_name__=b49a793b-38d2-40c0-af22-cfacf494732e/apigateway1.gz'},
        'destination': {
            'bucket': staging_bucket_name,
            'key': f'archive/AWSLogs/{account_id}/centralized/aws_apigateway_logs_gz/__ds__=2023-03-11-20-01/region={aws_region}/__execution_name__=b49a793b-38d2-40c0-af22-cfacf494732e/apigateway1.gz'}},
        {'source': {
            'bucket': staging_bucket_name,
            'key': f'AWSLogs/{account_id}/centralized/aws_apigateway_logs_gz/__ds__=2023-03-11-20-01/region={aws_region}/__execution_name__=b49a793b-38d2-40c0-af22-cfacf494732e/apigateway2.gz'},
            'destination': {
                'bucket': staging_bucket_name,
                'key': f'archive/AWSLogs/{account_id}/centralized/aws_apigateway_logs_gz/__ds__=2023-03-11-20-01/region={aws_region}/__execution_name__=b49a793b-38d2-40c0-af22-cfacf494732e/apigateway2.gz'}}
    ]
    merge_task_data2 = [{'source': {
        'bucket': staging_bucket_name,
        'key': f'AWSLogs/{account_id}/centralized/aws_apigateway_logs_gz/__ds__=2023-03-11-20-01/region={aws_region}/__execution_name__=b49a793b-38d2-40c0-af22-cfacf494732e/apigateway3.gz'},
        'destination': {
            'bucket': staging_bucket_name,
            'key': f'archive/AWSLogs/{account_id}/centralized/aws_apigateway_logs_gz/__ds__=2023-03-11-20-01/region={aws_region}/__execution_name__=b49a793b-38d2-40c0-af22-cfacf494732e/apigateway3.gz'}}

    ]
    event['Records'][0]['body']['data'] = merge_task_data1
    event['Records'][1]['body']['data'] = merge_task_data2

    event_base64 = record_body_to_base64(event)
    migration_lambda_handler(event_base64, migration_context)
    objects = list_object_keys(AWS_S3, staging_bucket_name,
                               f'archive/AWSLogs/{account_id}/centralized/aws_apigateway_logs_gz/__ds__=2023-03-11-20-01/region={aws_region}')
    assert objects == [
        'archive/AWSLogs/123456789012/centralized/aws_apigateway_logs_gz/__ds__=2023-03-11-20-01/region=us-east-1/__execution_name__=b49a793b-38d2-40c0-af22-cfacf494732e/apigateway1.gz',
        'archive/AWSLogs/123456789012/centralized/aws_apigateway_logs_gz/__ds__=2023-03-11-20-01/region=us-east-1/__execution_name__=b49a793b-38d2-40c0-af22-cfacf494732e/apigateway3.gz']

    objects = list_object_keys(AWS_S3, staging_bucket_name,
                               f'AWSLogs/{account_id}/centralized/aws_apigateway_logs_gz/__ds__=2023-03-11-20-01/region={aws_region}')
    assert objects == []

    # test merge parquet
    event = copy.deepcopy(s3_object_migration_event)
    event['Records'][0]['body']['merge'] = True
    event['Records'][0]['body']['deleteOnSuccess'] = True
    event['Records'][1]['body']['merge'] = True
    event['Records'][1]['body']['deleteOnSuccess'] = True
    merge_task_data1 = [
        {'source': {
        'bucket': staging_bucket_name,
        'key': f'AWSLogs/{account_id}/centralized/aws_apigateway_logs_parquet/__ds__=2023-03-11-20-01/region={aws_region}/__execution_name__=b49a793b-38d2-40c0-af22-cfacf494732e/apigateway1.parquet'},
        'destination': {
            'bucket': staging_bucket_name,
            'key': f'archive/AWSLogs/{account_id}/centralized/aws_apigateway_logs_parquet/__ds__=2023-03-11-00-00/region={aws_region}/__execution_name__=b49a793b-38d2-40c0-af22-cfacf494732e/apigateway1.parquet'}},
        {'source': {
            'bucket': staging_bucket_name,
            'key': f'AWSLogs/{account_id}/centralized/aws_apigateway_logs_parquet/__ds__=2023-03-11-18-01/region={aws_region}/__execution_name__=b49a793b-38d2-40c0-af22-cfacf494732e/apigateway2.parquet'},
            'destination': {
                'bucket': staging_bucket_name,
                'key': f'archive/AWSLogs/{account_id}/centralized/aws_apigateway_logs_parquet/__ds__=2023-03-11-00-00/region={aws_region}/__execution_name__=b49a793b-38d2-40c0-af22-cfacf494732e/apigateway2.parquet'}}
    ]
    merge_task_data2 = [{'source': {
        'bucket': staging_bucket_name,
        'key': f'AWSLogs/{account_id}/centralized/aws_apigateway_logs_parquet/__ds__=2023-03-11-18-01/region={aws_region}/__execution_name__=b49a793b-38d2-40c0-af22-cfacf494732e/apigateway3.parquet'},
        'destination': {
            'bucket': staging_bucket_name,
            'key': f'archive/AWSLogs/{account_id}/centralized/aws_apigateway_logs_parquet/__ds__=2023-03-11-00-00/region={aws_region}/__execution_name__=b49a793b-38d2-40c0-af22-cfacf494732e/apigateway3.parquet'}}

    ]
    event['Records'][0]['body']['data'] = merge_task_data1
    event['Records'][1]['body']['data'] = merge_task_data2

    event_base64 = record_body_to_base64(event)
    migration_lambda_handler(event_base64, migration_context)
    objects = list_object_keys(AWS_S3, staging_bucket_name,
                               f'archive/AWSLogs/{account_id}/centralized/aws_apigateway_logs_parquet/__ds__=2023-03-11-00-00/region={aws_region}')
    assert 'archive/AWSLogs/123456789012/centralized/aws_apigateway_logs_parquet/__ds__=2023-03-11-00-00/region=us-east-1/__execution_name__=b49a793b-38d2-40c0-af22-cfacf494732e/apigateway1.parquet' in objects 
    assert 'archive/AWSLogs/123456789012/centralized/aws_apigateway_logs_parquet/__ds__=2023-03-11-00-00/region=us-east-1/__execution_name__=b49a793b-38d2-40c0-af22-cfacf494732e/apigateway3.parquet' in objects 

    objects = list_object_keys(AWS_S3, staging_bucket_name,
                               f'AWSLogs/{account_id}/centralized/aws_apigateway_logs_gz/__ds__=2023-03-11-20-01/region={aws_region}')
    assert objects == []

    # test non-subtask
    assert AWS_DDB_ETL_LOG.delete(execution_name, sub_task1_id)
    assert AWS_DDB_ETL_LOG.delete(execution_name, sub_task2_id)

    event = copy.deepcopy(s3_object_migration_event)
    execution_name = str(uuid.uuid4())
    task_id = event['Records'][0]['body']['taskId']
    event['Records'][0]['body']['executionName'] = execution_name
    event['Records'][0]['body']['data'] = []
    event['Records'][1]['body']['data'] = []
    event_base64 = record_body_to_base64(event)

    migration_lambda_handler(event_base64, migration_context)
    conditions = Attr('parentTaskId').eq(task_id)
    assert AWS_DDB_ETL_LOG.query_count(execution_name=execution_name, filter=conditions) == 0
    
    with patch('botocore.client.BaseClient._make_api_call', new=mock_boto3_api_call):
        event = copy.deepcopy(s3_object_migration_event)
        execution_name = str(uuid.uuid4())
        event['Records'][0]['body']['taskToken'] = 'AQCEAAAAKgAAAAMAAAAA'
        event['Records'][0]['body']['data'] = []
        event_base64 = record_body_to_base64(event)

        migration_lambda_handler(event_base64, migration_context)

def test_lambda_handler_from_scanning_to_migration_scene_1(mock_s3_context, mock_iam_context, mock_sqs_context, mock_ddb_context, mock_sfn_context):
    import boto3
    from s3_object_scanning.lambda_function import lambda_handler as scanning_lambda_handler, AWS_SQS
    from s3_object_migration.lambda_function import lambda_handler as migration_lambda_handler, AWS_S3, AWS_DDB_ETL_LOG
    
    current_dir = os.path.dirname(os.path.abspath(__file__))
    account_id = os.environ["ACCOUNT_ID"]
    aws_region = os.environ["AWS_REGION"]
    staging_bucket_name = os.environ["STAGING_BUCKET_NAME"]
    migration_sqs_url = os.environ['MIGRATION_SQS_URL']
    sqs_client = boto3.client('sqs')
    
    s3_object_scanning_event = json.loads(os.environ["S3_OBJECT_SCANNING_EVENT"])
    scanning_function_name = os.environ["S3_OBJECTS_SCANNING_FUNCTION_NAME"]
    scanning_context = types.SimpleNamespace()
    scanning_context.function_name = scanning_function_name
    
    migration_function_name = os.environ["S3_OBJECTS_MIGRATION_FUNCTION_NAME"]
    migration_context = types.SimpleNamespace()
    migration_context.function_name = migration_function_name
    
    """
    Init object path
    """
    src_prefix = f'AWSLogs/{account_id}/centralized/aws_apigateway_logs_gz/__ds__=2023-03-11'
    dst_prefix = f'archive/centralized/aws_apigateway_logs_gz/__ds__=2023-03-11'
    gz_src_apigateway_dir = f'AWSLogs/{account_id}/centralized/aws_apigateway_logs_gz/__ds__=2023-03-11-20-01/'
    gz_src_apigateway1 = f'AWSLogs/{account_id}/centralized/aws_apigateway_logs_gz/__ds__=2023-03-11-20-01/region={aws_region}/__execution_name__=b49a793b-38d2-40c0-af22-cfacf494732e/apigateway1.gz'
    gz_src_apigateway2 = f'AWSLogs/{account_id}/centralized/aws_apigateway_logs_gz/__ds__=2023-03-11-20-01/region={aws_region}/__execution_name__=b49a793b-38d2-40c0-af22-cfacf494732e/apigateway2.gz'
    gz_src_apigateway3 = f'AWSLogs/{account_id}/centralized/aws_apigateway_logs_gz/__ds__=2023-03-11-20-01/region={aws_region}/__execution_name__=b49a793b-38d2-40c0-af22-cfacf494732e/apigateway3.gz'
    gz_dst_keep_prefix_apigateway1 =  f'archive/centralized/aws_apigateway_logs_gz/__ds__=2023-03-11-20-01/region={aws_region}/__execution_name__=b49a793b-38d2-40c0-af22-cfacf494732e/apigateway1.gz'
    
    objects = list_object_keys(AWS_S3, staging_bucket_name, prefix=src_prefix)
    assert objects == [gz_src_apigateway_dir, gz_src_apigateway1, gz_src_apigateway2, gz_src_apigateway3]

    """ Scene 1:
    Testing Merge is True, DeleteOnSuccess is False, Size is 100MiB, keepPrefix is True,
    The expected result is that the files are merged into one file without deleting the original, only one migration task.
    """
    execution_name = str(uuid.uuid4())
    scanning_event = copy.deepcopy(s3_object_scanning_event)
    scanning_event['executionName'] = execution_name
    
    scanning_lambda_handler(scanning_event, scanning_context)
    conditions = Attr('parentTaskId').eq('00000000-0000-0000-0000-000000000000')
    scanning_task_info = next(AWS_DDB_ETL_LOG.query_item(execution_name=execution_name, filter=conditions))
    scanning_task_id = scanning_task_info['taskId']
    
    migration_event = sqs_msg_to_lambda_event(sqs_client=sqs_client, url=migration_sqs_url)
    assert len(migration_event['Records']) == 1
    migration_lambda_handler(migration_event, migration_context)
    
    objects = list_object_keys(AWS_S3, staging_bucket_name, prefix=dst_prefix)
    assert objects == [gz_dst_keep_prefix_apigateway1]
    
    objects = list_object_keys(AWS_S3, staging_bucket_name, prefix=src_prefix)
    assert objects == [gz_src_apigateway_dir, gz_src_apigateway1, gz_src_apigateway2, gz_src_apigateway3]
    
    assert AWS_DDB_ETL_LOG.get(execution_name, scanning_task_id)['status'] == 'Succeeded'
    assert AWS_DDB_ETL_LOG.get_subtask_status_count(execution_name, scanning_task_id, status='Succeeded')['taskCount'] == 1
    
    # recovery s3 original objects
    AWS_S3.delete_object(staging_bucket_name, f'archive/centralized/aws_apigateway_logs_gz/__ds__=2023-03-11-20-01/region={aws_region}/__execution_name__=b49a793b-38d2-40c0-af22-cfacf494732e/apigateway1.gz')


def test_lambda_handler_from_scanning_to_migration_scene_2(mock_s3_context, mock_iam_context, mock_sqs_context, mock_ddb_context, mock_sfn_context):
    import boto3
    from s3_object_scanning.lambda_function import lambda_handler as scanning_lambda_handler, AWS_SQS
    from s3_object_migration.lambda_function import lambda_handler as migration_lambda_handler, AWS_S3, AWS_DDB_ETL_LOG
    
    current_dir = os.path.dirname(os.path.abspath(__file__))
    account_id = os.environ["ACCOUNT_ID"]
    aws_region = os.environ["AWS_REGION"]
    staging_bucket_name = os.environ["STAGING_BUCKET_NAME"]
    migration_sqs_url = os.environ['MIGRATION_SQS_URL']
    sqs_client = boto3.client('sqs')
    
    s3_object_scanning_event = json.loads(os.environ["S3_OBJECT_SCANNING_EVENT"])
    scanning_function_name = os.environ["S3_OBJECTS_SCANNING_FUNCTION_NAME"]
    scanning_context = types.SimpleNamespace()
    scanning_context.function_name = scanning_function_name
    
    migration_function_name = os.environ["S3_OBJECTS_MIGRATION_FUNCTION_NAME"]
    migration_context = types.SimpleNamespace()
    migration_context.function_name = migration_function_name
    
    """
    Init object path
    """
    src_prefix = f'AWSLogs/{account_id}/centralized/aws_apigateway_logs_gz/__ds__=2023-03-11'
    dst_prefix = f'archive/centralized/aws_apigateway_logs_gz/__ds__=2023-03-11'
    gz_src_apigateway_dir = f'AWSLogs/{account_id}/centralized/aws_apigateway_logs_gz/__ds__=2023-03-11-20-01/'
    gz_src_apigateway1 = f'AWSLogs/{account_id}/centralized/aws_apigateway_logs_gz/__ds__=2023-03-11-20-01/region={aws_region}/__execution_name__=b49a793b-38d2-40c0-af22-cfacf494732e/apigateway1.gz'
    gz_src_apigateway2 = f'AWSLogs/{account_id}/centralized/aws_apigateway_logs_gz/__ds__=2023-03-11-20-01/region={aws_region}/__execution_name__=b49a793b-38d2-40c0-af22-cfacf494732e/apigateway2.gz'
    gz_src_apigateway3 = f'AWSLogs/{account_id}/centralized/aws_apigateway_logs_gz/__ds__=2023-03-11-20-01/region={aws_region}/__execution_name__=b49a793b-38d2-40c0-af22-cfacf494732e/apigateway3.gz'
    gz_dst_keep_prefix_apigateway1 =  f'archive/centralized/aws_apigateway_logs_gz/__ds__=2023-03-11-20-01/region={aws_region}/__execution_name__=b49a793b-38d2-40c0-af22-cfacf494732e/apigateway1.gz'
    
    """ Scene 2:
    Testing Merge is True, DeleteOnSuccess is True, Size is 100MiB, keepPrefix is True,
    The expected result is that the files are merged into one, the original files are deleted, and there is only one migration task
    """
    execution_name = str(uuid.uuid4())
    scanning_event = copy.deepcopy(s3_object_scanning_event)
    scanning_event['executionName'] = execution_name
    scanning_event['deleteOnSuccess'] = True
    
    scanning_lambda_handler(scanning_event, scanning_context)
    conditions = Attr('parentTaskId').eq('00000000-0000-0000-0000-000000000000')
    scanning_task_info = next(AWS_DDB_ETL_LOG.query_item(execution_name=execution_name, filter=conditions))
    scanning_task_id = scanning_task_info['taskId']
    
    migration_event = sqs_msg_to_lambda_event(sqs_client=sqs_client, url=migration_sqs_url)
    assert len(migration_event['Records']) == 1
    migration_lambda_handler(migration_event, migration_context)
    
    objects = list_object_keys(AWS_S3, staging_bucket_name, prefix=dst_prefix)
    assert objects == [gz_dst_keep_prefix_apigateway1]
    
    objects = list_object_keys(AWS_S3, staging_bucket_name, prefix=src_prefix)
    assert objects == [gz_src_apigateway_dir]
    
    assert AWS_DDB_ETL_LOG.get(execution_name, scanning_task_id)['status'] == 'Succeeded'
    assert AWS_DDB_ETL_LOG.get_subtask_status_count(execution_name, scanning_task_id, status='Succeeded')[
               'taskCount'] == 1
    
    # recovery s3 original objects
    AWS_S3.delete_object(staging_bucket_name, gz_dst_keep_prefix_apigateway1)
    AWS_S3.upload_file(f'{current_dir}/data/apigateway1.gz', bucket=staging_bucket_name, key=gz_src_apigateway1)
    AWS_S3.upload_file(f'{current_dir}/data/apigateway2.gz', bucket=staging_bucket_name, key=gz_src_apigateway2)
    AWS_S3.upload_file(f'{current_dir}/data/apigateway3.gz', bucket=staging_bucket_name, key=gz_src_apigateway3)


def test_lambda_handler_from_scanning_to_migration_scene_3(mock_s3_context, mock_iam_context, mock_sqs_context, mock_ddb_context, mock_sfn_context):
    import boto3
    from s3_object_scanning.lambda_function import lambda_handler as scanning_lambda_handler, AWS_SQS
    from s3_object_migration.lambda_function import lambda_handler as migration_lambda_handler, AWS_S3, AWS_DDB_ETL_LOG
    
    current_dir = os.path.dirname(os.path.abspath(__file__))
    account_id = os.environ["ACCOUNT_ID"]
    aws_region = os.environ["AWS_REGION"]
    staging_bucket_name = os.environ["STAGING_BUCKET_NAME"]
    migration_sqs_url = os.environ['MIGRATION_SQS_URL']
    sqs_client = boto3.client('sqs')
    
    s3_object_scanning_event = json.loads(os.environ["S3_OBJECT_SCANNING_EVENT"])
    scanning_function_name = os.environ["S3_OBJECTS_SCANNING_FUNCTION_NAME"]
    scanning_context = types.SimpleNamespace()
    scanning_context.function_name = scanning_function_name
    
    migration_function_name = os.environ["S3_OBJECTS_MIGRATION_FUNCTION_NAME"]
    migration_context = types.SimpleNamespace()
    migration_context.function_name = migration_function_name
    
    """
    Init object path
    """
    src_prefix = f'AWSLogs/{account_id}/centralized/aws_apigateway_logs_gz/__ds__=2023-03-11'
    dst_prefix = f'archive/centralized/aws_apigateway_logs_gz/__ds__=2023-03-11'
    gz_src_apigateway_dir = f'AWSLogs/{account_id}/centralized/aws_apigateway_logs_gz/__ds__=2023-03-11-20-01/'
    gz_src_apigateway1 = f'AWSLogs/{account_id}/centralized/aws_apigateway_logs_gz/__ds__=2023-03-11-20-01/region={aws_region}/__execution_name__=b49a793b-38d2-40c0-af22-cfacf494732e/apigateway1.gz'
    gz_src_apigateway2 = f'AWSLogs/{account_id}/centralized/aws_apigateway_logs_gz/__ds__=2023-03-11-20-01/region={aws_region}/__execution_name__=b49a793b-38d2-40c0-af22-cfacf494732e/apigateway2.gz'
    gz_src_apigateway3 = f'AWSLogs/{account_id}/centralized/aws_apigateway_logs_gz/__ds__=2023-03-11-20-01/region={aws_region}/__execution_name__=b49a793b-38d2-40c0-af22-cfacf494732e/apigateway3.gz'
    gz_dst_keep_prefix_apigateway1 =  f'archive/centralized/aws_apigateway_logs_gz/__ds__=2023-03-11-20-01/region={aws_region}/__execution_name__=b49a793b-38d2-40c0-af22-cfacf494732e/apigateway1.gz'
    gz_dst_keep_prefix_apigateway3 =  f'archive/centralized/aws_apigateway_logs_gz/__ds__=2023-03-11-20-01/region={aws_region}/__execution_name__=b49a793b-38d2-40c0-af22-cfacf494732e/apigateway3.gz'
    
    """ Scene 3:
    Testing Merge is True, DeleteOnSuccess is False, Size is 3KiB, keepPrefix is True,
    The expected result is that the file is merged into two files due to size limit, the original file is not deleted, and there are 2 migration tasks
    """
    execution_name = str(uuid.uuid4())
    scanning_event = copy.deepcopy(s3_object_scanning_event)
    scanning_event['executionName'] = execution_name
    scanning_event['size'] = '3KiB'
    
    scanning_lambda_handler(scanning_event, scanning_context)
    conditions = Attr('parentTaskId').eq('00000000-0000-0000-0000-000000000000')
    scanning_task_info = next(AWS_DDB_ETL_LOG.query_item(execution_name=execution_name, filter=conditions))
    scanning_task_id = scanning_task_info['taskId']
    
    migration_event = sqs_msg_to_lambda_event(sqs_client=sqs_client, url=migration_sqs_url)
    assert len(migration_event['Records']) == 2
    migration_lambda_handler(migration_event, migration_context)
    
    objects = list_object_keys(AWS_S3, staging_bucket_name, prefix=dst_prefix)
    assert objects == [gz_dst_keep_prefix_apigateway1, gz_dst_keep_prefix_apigateway3]
    
    objects = list_object_keys(AWS_S3, staging_bucket_name, prefix=src_prefix)
    assert objects == [gz_src_apigateway_dir, gz_src_apigateway1, gz_src_apigateway2, gz_src_apigateway3]
    
    assert AWS_DDB_ETL_LOG.get(execution_name, scanning_task_id)['status'] == 'Succeeded'
    assert AWS_DDB_ETL_LOG.get_subtask_status_count(execution_name, scanning_task_id, status='Succeeded')[
               'taskCount'] == 2
    
    # recovery s3 original objects
    AWS_S3.delete_object(staging_bucket_name, gz_dst_keep_prefix_apigateway1)
    AWS_S3.delete_object(staging_bucket_name, gz_dst_keep_prefix_apigateway3)


def test_lambda_handler_from_scanning_to_migration_scene_4(mock_s3_context, mock_iam_context, mock_sqs_context, mock_ddb_context, mock_sfn_context):
    import boto3
    from s3_object_scanning.lambda_function import lambda_handler as scanning_lambda_handler, AWS_SQS
    from s3_object_migration.lambda_function import lambda_handler as migration_lambda_handler, AWS_S3, AWS_DDB_ETL_LOG
    
    current_dir = os.path.dirname(os.path.abspath(__file__))
    account_id = os.environ["ACCOUNT_ID"]
    aws_region = os.environ["AWS_REGION"]
    staging_bucket_name = os.environ["STAGING_BUCKET_NAME"]
    migration_sqs_url = os.environ['MIGRATION_SQS_URL']
    sqs_client = boto3.client('sqs')
    
    s3_object_scanning_event = json.loads(os.environ["S3_OBJECT_SCANNING_EVENT"])
    scanning_function_name = os.environ["S3_OBJECTS_SCANNING_FUNCTION_NAME"]
    scanning_context = types.SimpleNamespace()
    scanning_context.function_name = scanning_function_name
    
    migration_function_name = os.environ["S3_OBJECTS_MIGRATION_FUNCTION_NAME"]
    migration_context = types.SimpleNamespace()
    migration_context.function_name = migration_function_name
    
    """
    Init object path
    """
    src_prefix = f'AWSLogs/{account_id}/centralized/aws_apigateway_logs_gz/__ds__=2023-03-11'
    dst_prefix = f'archive/centralized/aws_apigateway_logs_gz/__ds__=2023-03-11'
    gz_src_apigateway_dir = f'AWSLogs/{account_id}/centralized/aws_apigateway_logs_gz/__ds__=2023-03-11-20-01/'
    gz_src_apigateway1 = f'AWSLogs/{account_id}/centralized/aws_apigateway_logs_gz/__ds__=2023-03-11-20-01/region={aws_region}/__execution_name__=b49a793b-38d2-40c0-af22-cfacf494732e/apigateway1.gz'
    gz_src_apigateway2 = f'AWSLogs/{account_id}/centralized/aws_apigateway_logs_gz/__ds__=2023-03-11-20-01/region={aws_region}/__execution_name__=b49a793b-38d2-40c0-af22-cfacf494732e/apigateway2.gz'
    gz_src_apigateway3 = f'AWSLogs/{account_id}/centralized/aws_apigateway_logs_gz/__ds__=2023-03-11-20-01/region={aws_region}/__execution_name__=b49a793b-38d2-40c0-af22-cfacf494732e/apigateway3.gz'
    gz_dst_keep_prefix_apigateway1 =  f'archive/centralized/aws_apigateway_logs_gz/__ds__=2023-03-11-20-01/region={aws_region}/__execution_name__=b49a793b-38d2-40c0-af22-cfacf494732e/apigateway1.gz'
    gz_dst_keep_prefix_apigateway3 =  f'archive/centralized/aws_apigateway_logs_gz/__ds__=2023-03-11-20-01/region={aws_region}/__execution_name__=b49a793b-38d2-40c0-af22-cfacf494732e/apigateway3.gz'
    
    """ Scene 4:
    Testing Merge is True, DeleteOnSuccess is False, Size is 2, keepPrefix is True,
    The expected result is that the file is merged into two files due to size limit, the original file is not deleted, and there are 2 migration tasks
    """
    execution_name = str(uuid.uuid4())
    scanning_event = copy.deepcopy(s3_object_scanning_event)
    scanning_event['executionName'] = execution_name
    scanning_event['size'] = '3KiB'
    
    scanning_lambda_handler(scanning_event, scanning_context)
    conditions = Attr('parentTaskId').eq('00000000-0000-0000-0000-000000000000')
    scanning_task_info = next(AWS_DDB_ETL_LOG.query_item(execution_name=execution_name, filter=conditions))
    scanning_task_id = scanning_task_info['taskId']
    
    migration_event = sqs_msg_to_lambda_event(sqs_client=sqs_client, url=migration_sqs_url)
    assert len(migration_event['Records']) == 2
    migration_lambda_handler(migration_event, migration_context)
    
    objects = list_object_keys(AWS_S3, staging_bucket_name, prefix=dst_prefix)
    assert objects == [gz_dst_keep_prefix_apigateway1, gz_dst_keep_prefix_apigateway3]
    
    objects = list_object_keys(AWS_S3, staging_bucket_name, prefix=src_prefix)
    assert objects == [gz_src_apigateway_dir, gz_src_apigateway1, gz_src_apigateway2, gz_src_apigateway3]
    
    assert AWS_DDB_ETL_LOG.get(execution_name, scanning_task_id)['status'] == 'Succeeded'
    assert AWS_DDB_ETL_LOG.get_subtask_status_count(execution_name, scanning_task_id, status='Succeeded')[
               'taskCount'] == 2
    
    # recovery s3 original objects
    AWS_S3.delete_object(staging_bucket_name, gz_dst_keep_prefix_apigateway1)
    AWS_S3.delete_object(staging_bucket_name, gz_dst_keep_prefix_apigateway3)


def test_lambda_handler_from_scanning_to_migration_scene_5(mock_s3_context, mock_iam_context, mock_sqs_context, mock_ddb_context, mock_sfn_context):
    import boto3
    from s3_object_scanning.lambda_function import lambda_handler as scanning_lambda_handler, AWS_SQS
    from s3_object_migration.lambda_function import lambda_handler as migration_lambda_handler, AWS_S3, AWS_DDB_ETL_LOG
    
    current_dir = os.path.dirname(os.path.abspath(__file__))
    account_id = os.environ["ACCOUNT_ID"]
    aws_region = os.environ["AWS_REGION"]
    staging_bucket_name = os.environ["STAGING_BUCKET_NAME"]
    migration_sqs_url = os.environ['MIGRATION_SQS_URL']
    sqs_client = boto3.client('sqs')
    
    s3_object_scanning_event = json.loads(os.environ["S3_OBJECT_SCANNING_EVENT"])
    scanning_function_name = os.environ["S3_OBJECTS_SCANNING_FUNCTION_NAME"]
    scanning_context = types.SimpleNamespace()
    scanning_context.function_name = scanning_function_name
    
    migration_function_name = os.environ["S3_OBJECTS_MIGRATION_FUNCTION_NAME"]
    migration_context = types.SimpleNamespace()
    migration_context.function_name = migration_function_name
    
    """
    Init object path
    """
    src_prefix = f'AWSLogs/{account_id}/centralized/aws_apigateway_logs_gz/__ds__=2023-03-11'
    dst_prefix = f'archive/centralized/aws_apigateway_logs_gz/__ds__=2023-03-11'
    gz_src_apigateway_dir = f'AWSLogs/{account_id}/centralized/aws_apigateway_logs_gz/__ds__=2023-03-11-20-01/'
    gz_src_apigateway1 = f'AWSLogs/{account_id}/centralized/aws_apigateway_logs_gz/__ds__=2023-03-11-20-01/region={aws_region}/__execution_name__=b49a793b-38d2-40c0-af22-cfacf494732e/apigateway1.gz'
    gz_src_apigateway2 = f'AWSLogs/{account_id}/centralized/aws_apigateway_logs_gz/__ds__=2023-03-11-20-01/region={aws_region}/__execution_name__=b49a793b-38d2-40c0-af22-cfacf494732e/apigateway2.gz'
    gz_src_apigateway3 = f'AWSLogs/{account_id}/centralized/aws_apigateway_logs_gz/__ds__=2023-03-11-20-01/region={aws_region}/__execution_name__=b49a793b-38d2-40c0-af22-cfacf494732e/apigateway3.gz'
    gz_dst_keep_prefix_apigateway1 =  f'archive/centralized/aws_apigateway_logs_gz/__ds__=2023-03-11-20-01/region={aws_region}/__execution_name__=b49a793b-38d2-40c0-af22-cfacf494732e/apigateway1.gz'
    gz_dst_keep_prefix_apigateway3 =  f'archive/centralized/aws_apigateway_logs_gz/__ds__=2023-03-11-20-01/region={aws_region}/__execution_name__=b49a793b-38d2-40c0-af22-cfacf494732e/apigateway3.gz'
    
    """ Scene 5:
    Testing Merge is True, DeleteOnSuccess is False, Size is 3072, keepPrefix is True,
    Since size> 1000, it is processed in byte units by default. The expected result is that all files are merged into 2 files, 
        the original file and prefix are kept, and there are 2 migration tasks
    """
    execution_name = str(uuid.uuid4())
    scanning_event = copy.deepcopy(s3_object_scanning_event)
    scanning_event['executionName'] = execution_name
    scanning_event['size'] = 3072
    
    scanning_lambda_handler(scanning_event, scanning_context)
    conditions = Attr('parentTaskId').eq('00000000-0000-0000-0000-000000000000')
    scanning_task_info = next(AWS_DDB_ETL_LOG.query_item(execution_name=execution_name, filter=conditions))
    scanning_task_id = scanning_task_info['taskId']
    
    migration_event = sqs_msg_to_lambda_event(sqs_client=sqs_client, url=migration_sqs_url)
    assert len(migration_event['Records']) == 2
    migration_lambda_handler(migration_event, migration_context)
    
    objects = list_object_keys(AWS_S3, staging_bucket_name, prefix=dst_prefix)
    assert objects == [gz_dst_keep_prefix_apigateway1, gz_dst_keep_prefix_apigateway3]
    
    objects = list_object_keys(AWS_S3, staging_bucket_name, prefix=src_prefix)
    assert objects == [gz_src_apigateway_dir, gz_src_apigateway1, gz_src_apigateway2, gz_src_apigateway3]
    
    assert AWS_DDB_ETL_LOG.get(execution_name, scanning_task_id)['status'] == 'Succeeded'
    assert AWS_DDB_ETL_LOG.get_subtask_status_count(execution_name, scanning_task_id, status='Succeeded')[
               'taskCount'] == 2
    
    # recovery s3 original objects
    AWS_S3.delete_object(staging_bucket_name, gz_dst_keep_prefix_apigateway1)
    AWS_S3.delete_object(staging_bucket_name, gz_dst_keep_prefix_apigateway3)


def test_lambda_handler_from_scanning_to_migration_scene_6(mock_s3_context, mock_iam_context, mock_sqs_context, mock_ddb_context, mock_sfn_context):
    import boto3
    from s3_object_scanning.lambda_function import lambda_handler as scanning_lambda_handler, AWS_SQS
    from s3_object_migration.lambda_function import lambda_handler as migration_lambda_handler, AWS_S3, AWS_DDB_ETL_LOG
    
    current_dir = os.path.dirname(os.path.abspath(__file__))
    account_id = os.environ["ACCOUNT_ID"]
    aws_region = os.environ["AWS_REGION"]
    staging_bucket_name = os.environ["STAGING_BUCKET_NAME"]
    migration_sqs_url = os.environ['MIGRATION_SQS_URL']
    sqs_client = boto3.client('sqs')
    
    s3_object_scanning_event = json.loads(os.environ["S3_OBJECT_SCANNING_EVENT"])
    scanning_function_name = os.environ["S3_OBJECTS_SCANNING_FUNCTION_NAME"]
    scanning_context = types.SimpleNamespace()
    scanning_context.function_name = scanning_function_name
    
    migration_function_name = os.environ["S3_OBJECTS_MIGRATION_FUNCTION_NAME"]
    migration_context = types.SimpleNamespace()
    migration_context.function_name = migration_function_name
    
    """
    Init object path
    """
    src_prefix = f'AWSLogs/{account_id}/centralized/aws_apigateway_logs_gz/__ds__=2023-03-11'
    dst_prefix = f'archive/centralized/aws_apigateway_logs_gz/__ds__=2023-03-11'
    gz_src_apigateway_dir = f'AWSLogs/{account_id}/centralized/aws_apigateway_logs_gz/__ds__=2023-03-11-20-01/'
    gz_src_apigateway1 = f'AWSLogs/{account_id}/centralized/aws_apigateway_logs_gz/__ds__=2023-03-11-20-01/region={aws_region}/__execution_name__=b49a793b-38d2-40c0-af22-cfacf494732e/apigateway1.gz'
    gz_src_apigateway2 = f'AWSLogs/{account_id}/centralized/aws_apigateway_logs_gz/__ds__=2023-03-11-20-01/region={aws_region}/__execution_name__=b49a793b-38d2-40c0-af22-cfacf494732e/apigateway2.gz'
    gz_src_apigateway3 = f'AWSLogs/{account_id}/centralized/aws_apigateway_logs_gz/__ds__=2023-03-11-20-01/region={aws_region}/__execution_name__=b49a793b-38d2-40c0-af22-cfacf494732e/apigateway3.gz'
    gz_dst_keep_prefix_apigateway1 =  f'archive/centralized/aws_apigateway_logs_gz/__ds__=2023-03-11-20-01/region={aws_region}/__execution_name__=b49a793b-38d2-40c0-af22-cfacf494732e/apigateway1.gz'
    gz_dst_keep_prefix_apigateway3 =  f'archive/centralized/aws_apigateway_logs_gz/__ds__=2023-03-11-20-01/region={aws_region}/__execution_name__=b49a793b-38d2-40c0-af22-cfacf494732e/apigateway3.gz'
    
    """ Scene 6:
    Testing Merge is True, DeleteOnSuccess is False, Size is 3072, keepPrefix is True,
    Since size> 1000, it is processed in byte units by default. The expected result is that all files are merged into 2 files, 
        the original file and prefix are kept, and there are 2 migration tasks
    """
    execution_name = str(uuid.uuid4())
    scanning_event = copy.deepcopy(s3_object_scanning_event)
    scanning_event['executionName'] = execution_name
    scanning_event['size'] = 3072
    
    scanning_lambda_handler(scanning_event, scanning_context)
    conditions = Attr('parentTaskId').eq('00000000-0000-0000-0000-000000000000')
    scanning_task_info = next(AWS_DDB_ETL_LOG.query_item(execution_name=execution_name, filter=conditions))
    scanning_task_id = scanning_task_info['taskId']
    
    migration_event = sqs_msg_to_lambda_event(sqs_client=sqs_client, url=migration_sqs_url)
    assert len(migration_event['Records']) == 2
    migration_lambda_handler(migration_event, migration_context)
    
    objects = list_object_keys(AWS_S3, staging_bucket_name, prefix=dst_prefix)
    assert objects == [gz_dst_keep_prefix_apigateway1, gz_dst_keep_prefix_apigateway3]
    
    objects = list_object_keys(AWS_S3, staging_bucket_name, prefix=src_prefix)
    assert objects == [gz_src_apigateway_dir, gz_src_apigateway1, gz_src_apigateway2, gz_src_apigateway3]
    
    assert AWS_DDB_ETL_LOG.get(execution_name, scanning_task_id)['status'] == 'Succeeded'
    assert AWS_DDB_ETL_LOG.get_subtask_status_count(execution_name, scanning_task_id, status='Succeeded')[
               'taskCount'] == 2
    
    # recovery s3 original objects
    AWS_S3.delete_object(staging_bucket_name, gz_dst_keep_prefix_apigateway1)
    AWS_S3.delete_object(staging_bucket_name, gz_dst_keep_prefix_apigateway3)


def test_lambda_handler_from_scanning_to_migration_scene_7(mock_s3_context, mock_iam_context, mock_sqs_context, mock_ddb_context, mock_sfn_context):
    import boto3
    from s3_object_scanning.lambda_function import lambda_handler as scanning_lambda_handler, AWS_SQS
    from s3_object_migration.lambda_function import lambda_handler as migration_lambda_handler, AWS_S3, AWS_DDB_ETL_LOG
    
    current_dir = os.path.dirname(os.path.abspath(__file__))
    account_id = os.environ["ACCOUNT_ID"]
    aws_region = os.environ["AWS_REGION"]
    staging_bucket_name = os.environ["STAGING_BUCKET_NAME"]
    migration_sqs_url = os.environ['MIGRATION_SQS_URL']
    sqs_client = boto3.client('sqs')
    
    s3_object_scanning_event = json.loads(os.environ["S3_OBJECT_SCANNING_EVENT"])
    scanning_function_name = os.environ["S3_OBJECTS_SCANNING_FUNCTION_NAME"]
    scanning_context = types.SimpleNamespace()
    scanning_context.function_name = scanning_function_name
    
    migration_function_name = os.environ["S3_OBJECTS_MIGRATION_FUNCTION_NAME"]
    migration_context = types.SimpleNamespace()
    migration_context.function_name = migration_function_name
    
    """
    Init object path
    """
    src_prefix = f'AWSLogs/{account_id}/centralized/aws_apigateway_logs_gz/__ds__=2023-03-11'
    dst_prefix = f'archive/centralized/aws_apigateway_logs_gz/__ds__=2023-03-11'
    gz_src_apigateway_dir = f'AWSLogs/{account_id}/centralized/aws_apigateway_logs_gz/__ds__=2023-03-11-20-01/'
    gz_src_apigateway1 = f'AWSLogs/{account_id}/centralized/aws_apigateway_logs_gz/__ds__=2023-03-11-20-01/region={aws_region}/__execution_name__=b49a793b-38d2-40c0-af22-cfacf494732e/apigateway1.gz'
    gz_src_apigateway2 = f'AWSLogs/{account_id}/centralized/aws_apigateway_logs_gz/__ds__=2023-03-11-20-01/region={aws_region}/__execution_name__=b49a793b-38d2-40c0-af22-cfacf494732e/apigateway2.gz'
    gz_src_apigateway3 = f'AWSLogs/{account_id}/centralized/aws_apigateway_logs_gz/__ds__=2023-03-11-20-01/region={aws_region}/__execution_name__=b49a793b-38d2-40c0-af22-cfacf494732e/apigateway3.gz'
    gz_dst_keep_prefix_dict_apigateway1 =  f'archive/centralized/aws_apigateway_logs_gz/__ds__=2023-03-11-00-00/region={aws_region}/__execution_name__=00000000-0000-0000-0000-000000000000/apigateway1.gz'
    
    """ Scene 7:
    Testing Merge is True, DeleteOnSuccess is False, Size is 100MiB, keepPrefix is dict,
    The expected result is that the file is merged into one file, the original file is not deleted, and there are 1 migration tasks
    """
    execution_name = str(uuid.uuid4())
    scanning_event = copy.deepcopy(s3_object_scanning_event)
    scanning_event['executionName'] = execution_name
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
    conditions = Attr('parentTaskId').eq('00000000-0000-0000-0000-000000000000')
    scanning_task_info = next(AWS_DDB_ETL_LOG.query_item(execution_name=execution_name, filter=conditions))
    scanning_task_id = scanning_task_info['taskId']
    
    migration_event = sqs_msg_to_lambda_event(sqs_client=sqs_client, url=migration_sqs_url)
    assert len(migration_event['Records']) == 1
    migration_lambda_handler(migration_event, migration_context)
    
    objects = list_object_keys(AWS_S3, staging_bucket_name, prefix=dst_prefix)
    assert objects == [gz_dst_keep_prefix_dict_apigateway1]
    
    objects = list_object_keys(AWS_S3, staging_bucket_name, prefix=src_prefix)
    assert objects == [gz_src_apigateway_dir, gz_src_apigateway1, gz_src_apigateway2, gz_src_apigateway3]
    
    assert AWS_DDB_ETL_LOG.get(execution_name, scanning_task_id)['status'] == 'Succeeded'
    assert AWS_DDB_ETL_LOG.get_subtask_status_count(execution_name, scanning_task_id, status='Succeeded')[
               'taskCount'] == 1
    
    # recovery s3 original objects
    AWS_S3.delete_object(staging_bucket_name, gz_dst_keep_prefix_dict_apigateway1)


def test_lambda_handler_from_scanning_to_migration_scene_8(mock_s3_context, mock_iam_context, mock_sqs_context, mock_ddb_context, mock_sfn_context):
    import boto3
    from s3_object_scanning.lambda_function import lambda_handler as scanning_lambda_handler, AWS_SQS
    from s3_object_migration.lambda_function import lambda_handler as migration_lambda_handler, AWS_S3, AWS_DDB_ETL_LOG
    
    current_dir = os.path.dirname(os.path.abspath(__file__))
    account_id = os.environ["ACCOUNT_ID"]
    aws_region = os.environ["AWS_REGION"]
    staging_bucket_name = os.environ["STAGING_BUCKET_NAME"]
    migration_sqs_url = os.environ['MIGRATION_SQS_URL']
    sqs_client = boto3.client('sqs')
    
    s3_object_scanning_event = json.loads(os.environ["S3_OBJECT_SCANNING_EVENT"])
    scanning_function_name = os.environ["S3_OBJECTS_SCANNING_FUNCTION_NAME"]
    scanning_context = types.SimpleNamespace()
    scanning_context.function_name = scanning_function_name
    
    migration_function_name = os.environ["S3_OBJECTS_MIGRATION_FUNCTION_NAME"]
    migration_context = types.SimpleNamespace()
    migration_context.function_name = migration_function_name
    
    """
    Init object path
    """
    src_prefix = f'AWSLogs/{account_id}/centralized/aws_apigateway_logs_gz/__ds__=2023-03-11'
    dst_prefix = f'archive/centralized/aws_apigateway_logs_gz/__ds__=2023-03-11'
    gz_src_apigateway_dir = f'AWSLogs/{account_id}/centralized/aws_apigateway_logs_gz/__ds__=2023-03-11-20-01/'
    gz_src_apigateway1 = f'AWSLogs/{account_id}/centralized/aws_apigateway_logs_gz/__ds__=2023-03-11-20-01/region={aws_region}/__execution_name__=b49a793b-38d2-40c0-af22-cfacf494732e/apigateway1.gz'
    gz_src_apigateway2 = f'AWSLogs/{account_id}/centralized/aws_apigateway_logs_gz/__ds__=2023-03-11-20-01/region={aws_region}/__execution_name__=b49a793b-38d2-40c0-af22-cfacf494732e/apigateway2.gz'
    gz_src_apigateway3 = f'AWSLogs/{account_id}/centralized/aws_apigateway_logs_gz/__ds__=2023-03-11-20-01/region={aws_region}/__execution_name__=b49a793b-38d2-40c0-af22-cfacf494732e/apigateway3.gz'
    gz_dst_not_keep_prefix_apigateway1 =  f'archive/centralized/aws_apigateway_logs_gz/__ds__=2023-03-11/apigateway1.gz'
    
    """ Scene 8:
    Testing Merge is True, DeleteOnSuccess is False, Size is 100MiB, keepPrefix is False,
    The expected result is that the files are relocated to the destination directory. Since the size is 100MiB, 
        the 3 files are divided into 1 migration tasks, original file is deleted.
    """
    execution_name = str(uuid.uuid4())
    scanning_event = copy.deepcopy(s3_object_scanning_event)
    scanning_event['executionName'] = execution_name
    scanning_event['keepPrefix'] = False
    
    scanning_lambda_handler(scanning_event, scanning_context)
    conditions = Attr('parentTaskId').eq('00000000-0000-0000-0000-000000000000')
    scanning_task_info = next(AWS_DDB_ETL_LOG.query_item(execution_name=execution_name, filter=conditions))
    scanning_task_id = scanning_task_info['taskId']
    
    migration_event = sqs_msg_to_lambda_event(sqs_client=sqs_client, url=migration_sqs_url)
    assert len(migration_event['Records']) == 1
    migration_lambda_handler(migration_event, migration_context)
    
    objects = list_object_keys(AWS_S3, staging_bucket_name, prefix=dst_prefix)
    assert objects == [gz_dst_not_keep_prefix_apigateway1]
    
    objects = list_object_keys(AWS_S3, staging_bucket_name, prefix=src_prefix)
    assert objects == [gz_src_apigateway_dir, gz_src_apigateway1, gz_src_apigateway2, gz_src_apigateway3]
    
    assert AWS_DDB_ETL_LOG.get(execution_name, scanning_task_id)['status'] == 'Succeeded'
    assert AWS_DDB_ETL_LOG.get_subtask_status_count(execution_name, scanning_task_id, status='Succeeded')[
               'taskCount'] == 1
    
    # recovery s3 original objects
    AWS_S3.delete_object(staging_bucket_name, gz_dst_not_keep_prefix_apigateway1)
    

def test_lambda_handler_from_scanning_to_migration_scene_9(mock_s3_context, mock_iam_context, mock_sqs_context, mock_ddb_context, mock_sfn_context):
    import boto3
    from s3_object_scanning.lambda_function import lambda_handler as scanning_lambda_handler, AWS_SQS
    from s3_object_migration.lambda_function import lambda_handler as migration_lambda_handler, AWS_S3, AWS_DDB_ETL_LOG
    
    current_dir = os.path.dirname(os.path.abspath(__file__))
    account_id = os.environ["ACCOUNT_ID"]
    aws_region = os.environ["AWS_REGION"]
    staging_bucket_name = os.environ["STAGING_BUCKET_NAME"]
    migration_sqs_url = os.environ['MIGRATION_SQS_URL']
    sqs_client = boto3.client('sqs')
    
    s3_object_scanning_event = json.loads(os.environ["S3_OBJECT_SCANNING_EVENT"])
    scanning_function_name = os.environ["S3_OBJECTS_SCANNING_FUNCTION_NAME"]
    scanning_context = types.SimpleNamespace()
    scanning_context.function_name = scanning_function_name
    
    migration_function_name = os.environ["S3_OBJECTS_MIGRATION_FUNCTION_NAME"]
    migration_context = types.SimpleNamespace()
    migration_context.function_name = migration_function_name
    
    """
    Init object path
    """
    src_prefix = f'AWSLogs/{account_id}/centralized/aws_apigateway_logs_gz/__ds__=2023-03-11'
    dst_prefix = f'archive/centralized/aws_apigateway_logs_gz/__ds__=2023-03-11'
    gz_src_apigateway_dir = f'AWSLogs/{account_id}/centralized/aws_apigateway_logs_gz/__ds__=2023-03-11-20-01/'
    gz_src_apigateway1 = f'AWSLogs/{account_id}/centralized/aws_apigateway_logs_gz/__ds__=2023-03-11-20-01/region={aws_region}/__execution_name__=b49a793b-38d2-40c0-af22-cfacf494732e/apigateway1.gz'
    gz_src_apigateway2 = f'AWSLogs/{account_id}/centralized/aws_apigateway_logs_gz/__ds__=2023-03-11-20-01/region={aws_region}/__execution_name__=b49a793b-38d2-40c0-af22-cfacf494732e/apigateway2.gz'
    gz_src_apigateway3 = f'AWSLogs/{account_id}/centralized/aws_apigateway_logs_gz/__ds__=2023-03-11-20-01/region={aws_region}/__execution_name__=b49a793b-38d2-40c0-af22-cfacf494732e/apigateway3.gz'
    gz_dst_keep_prefix_apigateway1 =  f'archive/centralized/aws_apigateway_logs_gz/__ds__=2023-03-11-20-01/region={aws_region}/__execution_name__=b49a793b-38d2-40c0-af22-cfacf494732e/apigateway1.gz'
    gz_dst_keep_prefix_apigateway2 =  f'archive/centralized/aws_apigateway_logs_gz/__ds__=2023-03-11-20-01/region={aws_region}/__execution_name__=b49a793b-38d2-40c0-af22-cfacf494732e/apigateway2.gz'
    gz_dst_keep_prefix_apigateway3 =  f'archive/centralized/aws_apigateway_logs_gz/__ds__=2023-03-11-20-01/region={aws_region}/__execution_name__=b49a793b-38d2-40c0-af22-cfacf494732e/apigateway3.gz'
    
    """ Scene 9:
    Testing Merge is False, DeleteOnSuccess is False, Size is 2, keepPrefix is True,
    The expected result is that the files are relocated to the destination directory. Since the size is 2, 
        the 3 files are divided into 2 migration tasks.
    """
    execution_name = str(uuid.uuid4())
    scanning_event = copy.deepcopy(s3_object_scanning_event)
    scanning_event['executionName'] = execution_name
    scanning_event['merge'] = False
    scanning_event['maxObjectFilesNumPerCopyTask'] = 2
    
    scanning_lambda_handler(scanning_event, scanning_context)
    conditions = Attr('parentTaskId').eq('00000000-0000-0000-0000-000000000000')
    scanning_task_info = next(AWS_DDB_ETL_LOG.query_item(execution_name=execution_name, filter=conditions))
    scanning_task_id = scanning_task_info['taskId']
    
    migration_event = sqs_msg_to_lambda_event(sqs_client=sqs_client, url=migration_sqs_url)
    assert len(migration_event['Records']) == 2
    migration_lambda_handler(migration_event, migration_context)
    
    objects = list_object_keys(AWS_S3, staging_bucket_name, prefix=dst_prefix)
    assert objects == [gz_dst_keep_prefix_apigateway1, gz_dst_keep_prefix_apigateway2, gz_dst_keep_prefix_apigateway3]
    
    objects = list_object_keys(AWS_S3, staging_bucket_name, prefix=src_prefix)
    assert objects == [gz_src_apigateway_dir, gz_src_apigateway1, gz_src_apigateway2, gz_src_apigateway3]
    
    assert AWS_DDB_ETL_LOG.get(execution_name, scanning_task_id)['status'] == 'Succeeded'
    assert AWS_DDB_ETL_LOG.get_subtask_status_count(execution_name, scanning_task_id, status='Succeeded')[
               'taskCount'] == 2
    
    # recovery s3 original objects
    AWS_S3.delete_object(staging_bucket_name, gz_dst_keep_prefix_apigateway1)
    AWS_S3.delete_object(staging_bucket_name, gz_dst_keep_prefix_apigateway2)
    AWS_S3.delete_object(staging_bucket_name, gz_dst_keep_prefix_apigateway3)
    

def test_lambda_handler_from_scanning_to_migration_scene_10(mock_s3_context, mock_iam_context, mock_sqs_context, mock_ddb_context, mock_sfn_context):
    import boto3
    from s3_object_scanning.lambda_function import lambda_handler as scanning_lambda_handler, AWS_SQS
    from s3_object_migration.lambda_function import lambda_handler as migration_lambda_handler, AWS_S3, AWS_DDB_ETL_LOG
    
    current_dir = os.path.dirname(os.path.abspath(__file__))
    account_id = os.environ["ACCOUNT_ID"]
    aws_region = os.environ["AWS_REGION"]
    staging_bucket_name = os.environ["STAGING_BUCKET_NAME"]
    migration_sqs_url = os.environ['MIGRATION_SQS_URL']
    sqs_client = boto3.client('sqs')
    
    s3_object_scanning_event = json.loads(os.environ["S3_OBJECT_SCANNING_EVENT"])
    scanning_function_name = os.environ["S3_OBJECTS_SCANNING_FUNCTION_NAME"]
    scanning_context = types.SimpleNamespace()
    scanning_context.function_name = scanning_function_name
    
    migration_function_name = os.environ["S3_OBJECTS_MIGRATION_FUNCTION_NAME"]
    migration_context = types.SimpleNamespace()
    migration_context.function_name = migration_function_name
    
    """
    Init object path
    """
    src_prefix = f'AWSLogs/{account_id}/centralized/aws_apigateway_logs_gz/__ds__=2023-03-11'
    dst_prefix = f'archive/centralized/aws_apigateway_logs_gz/__ds__=2023-03-11'
    gz_src_apigateway_dir = f'AWSLogs/{account_id}/centralized/aws_apigateway_logs_gz/__ds__=2023-03-11-20-01/'
    gz_src_apigateway1 = f'AWSLogs/{account_id}/centralized/aws_apigateway_logs_gz/__ds__=2023-03-11-20-01/region={aws_region}/__execution_name__=b49a793b-38d2-40c0-af22-cfacf494732e/apigateway1.gz'
    gz_src_apigateway2 = f'AWSLogs/{account_id}/centralized/aws_apigateway_logs_gz/__ds__=2023-03-11-20-01/region={aws_region}/__execution_name__=b49a793b-38d2-40c0-af22-cfacf494732e/apigateway2.gz'
    gz_src_apigateway3 = f'AWSLogs/{account_id}/centralized/aws_apigateway_logs_gz/__ds__=2023-03-11-20-01/region={aws_region}/__execution_name__=b49a793b-38d2-40c0-af22-cfacf494732e/apigateway3.gz'
    gz_dst_keep_prefix_apigateway1 =  f'archive/centralized/aws_apigateway_logs_gz/__ds__=2023-03-11-20-01/region={aws_region}/__execution_name__=b49a793b-38d2-40c0-af22-cfacf494732e/apigateway1.gz'
    gz_dst_keep_prefix_apigateway2 =  f'archive/centralized/aws_apigateway_logs_gz/__ds__=2023-03-11-20-01/region={aws_region}/__execution_name__=b49a793b-38d2-40c0-af22-cfacf494732e/apigateway2.gz'
    gz_dst_keep_prefix_apigateway3 =  f'archive/centralized/aws_apigateway_logs_gz/__ds__=2023-03-11-20-01/region={aws_region}/__execution_name__=b49a793b-38d2-40c0-af22-cfacf494732e/apigateway3.gz'
    
    """ Scene 10:
    Testing Merge is False, DeleteOnSuccess is False, Size is 3KiB, keepPrefix is True,
    The expected result is that the files are relocated to the destination directory. Since the size is 3KiB, 
        the 3 files are divided into 2 migration tasks.
    """
    execution_name = str(uuid.uuid4())
    scanning_event = copy.deepcopy(s3_object_scanning_event)
    scanning_event['executionName'] = execution_name
    scanning_event['merge'] = False
    scanning_event['maxObjectFilesSizePerCopyTask'] = '3KiB'
    
    
    scanning_lambda_handler(scanning_event, scanning_context)
    conditions = Attr('parentTaskId').eq('00000000-0000-0000-0000-000000000000')
    scanning_task_info = next(AWS_DDB_ETL_LOG.query_item(execution_name=execution_name, filter=conditions))
    scanning_task_id = scanning_task_info['taskId']
    
    migration_event = sqs_msg_to_lambda_event(sqs_client=sqs_client, url=migration_sqs_url)
    assert len(migration_event['Records']) == 2
    migration_lambda_handler(migration_event, migration_context)
    
    objects = list_object_keys(AWS_S3, staging_bucket_name, prefix=dst_prefix)
    assert objects == [gz_dst_keep_prefix_apigateway1, gz_dst_keep_prefix_apigateway2, gz_dst_keep_prefix_apigateway3]
    
    objects = list_object_keys(AWS_S3, staging_bucket_name, prefix=src_prefix)
    assert objects == [gz_src_apigateway_dir, gz_src_apigateway1, gz_src_apigateway2, gz_src_apigateway3]
    
    assert AWS_DDB_ETL_LOG.get(execution_name, scanning_task_id)['status'] == 'Succeeded'
    assert AWS_DDB_ETL_LOG.get_subtask_status_count(execution_name, scanning_task_id, status='Succeeded')[
               'taskCount'] == 2
    
    # recovery s3 original objects
    AWS_S3.delete_object(staging_bucket_name, gz_dst_keep_prefix_apigateway1)
    AWS_S3.delete_object(staging_bucket_name, gz_dst_keep_prefix_apigateway2)
    AWS_S3.delete_object(staging_bucket_name, gz_dst_keep_prefix_apigateway3)


def test_lambda_handler_from_scanning_to_migration_scene_11(mock_s3_context, mock_iam_context, mock_sqs_context, mock_ddb_context, mock_sfn_context):
    import boto3
    from s3_object_scanning.lambda_function import lambda_handler as scanning_lambda_handler, AWS_SQS
    from s3_object_migration.lambda_function import lambda_handler as migration_lambda_handler, AWS_S3, AWS_DDB_ETL_LOG
    
    current_dir = os.path.dirname(os.path.abspath(__file__))
    account_id = os.environ["ACCOUNT_ID"]
    aws_region = os.environ["AWS_REGION"]
    staging_bucket_name = os.environ["STAGING_BUCKET_NAME"]
    migration_sqs_url = os.environ['MIGRATION_SQS_URL']
    sqs_client = boto3.client('sqs')
    
    s3_object_scanning_event = json.loads(os.environ["S3_OBJECT_SCANNING_EVENT"])
    scanning_function_name = os.environ["S3_OBJECTS_SCANNING_FUNCTION_NAME"]
    scanning_context = types.SimpleNamespace()
    scanning_context.function_name = scanning_function_name
    
    migration_function_name = os.environ["S3_OBJECTS_MIGRATION_FUNCTION_NAME"]
    migration_context = types.SimpleNamespace()
    migration_context.function_name = migration_function_name
    
    """
    Init object path
    """
    src_prefix = f'AWSLogs/{account_id}/centralized/aws_apigateway_logs_gz/__ds__=2023-03-11'
    dst_prefix = f'archive/centralized/aws_apigateway_logs_gz/__ds__=2023-03-11'
    gz_src_apigateway_dir = f'AWSLogs/{account_id}/centralized/aws_apigateway_logs_gz/__ds__=2023-03-11-20-01/'
    gz_src_apigateway1 = f'AWSLogs/{account_id}/centralized/aws_apigateway_logs_gz/__ds__=2023-03-11-20-01/region={aws_region}/__execution_name__=b49a793b-38d2-40c0-af22-cfacf494732e/apigateway1.gz'
    gz_src_apigateway2 = f'AWSLogs/{account_id}/centralized/aws_apigateway_logs_gz/__ds__=2023-03-11-20-01/region={aws_region}/__execution_name__=b49a793b-38d2-40c0-af22-cfacf494732e/apigateway2.gz'
    gz_src_apigateway3 = f'AWSLogs/{account_id}/centralized/aws_apigateway_logs_gz/__ds__=2023-03-11-20-01/region={aws_region}/__execution_name__=b49a793b-38d2-40c0-af22-cfacf494732e/apigateway3.gz'
    gz_dst_keep_prefix_apigateway1 =  f'archive/centralized/aws_apigateway_logs_gz/__ds__=2023-03-11-20-01/region={aws_region}/__execution_name__=b49a793b-38d2-40c0-af22-cfacf494732e/apigateway1.gz'
    gz_dst_keep_prefix_apigateway2 =  f'archive/centralized/aws_apigateway_logs_gz/__ds__=2023-03-11-20-01/region={aws_region}/__execution_name__=b49a793b-38d2-40c0-af22-cfacf494732e/apigateway2.gz'
    gz_dst_keep_prefix_apigateway3 =  f'archive/centralized/aws_apigateway_logs_gz/__ds__=2023-03-11-20-01/region={aws_region}/__execution_name__=b49a793b-38d2-40c0-af22-cfacf494732e/apigateway3.gz'
    
    """ Scene 11:
    Testing Merge is False, DeleteOnSuccess is False, Size is 10MiB, keepPrefix is True,
    The expected result is that the files are relocated to the destination directory. Since the size is 10MiB, 
        the 3 files are divided into 1 migration tasks, original file is deleted
    """
    execution_name = str(uuid.uuid4())
    scanning_event = copy.deepcopy(s3_object_scanning_event)
    scanning_event['executionName'] = execution_name
    scanning_event['merge'] = False
    scanning_event['size'] = '10MiB'
    
    scanning_lambda_handler(scanning_event, scanning_context)
    conditions = Attr('parentTaskId').eq('00000000-0000-0000-0000-000000000000')
    scanning_task_info = next(AWS_DDB_ETL_LOG.query_item(execution_name=execution_name, filter=conditions))
    scanning_task_id = scanning_task_info['taskId']
    
    migration_event = sqs_msg_to_lambda_event(sqs_client=sqs_client, url=migration_sqs_url)
    assert len(migration_event['Records']) == 1
    migration_lambda_handler(migration_event, migration_context)
    
    objects = list_object_keys(AWS_S3, staging_bucket_name, prefix=dst_prefix)
    assert objects == [gz_dst_keep_prefix_apigateway1, gz_dst_keep_prefix_apigateway2, gz_dst_keep_prefix_apigateway3]
    
    objects = list_object_keys(AWS_S3, staging_bucket_name, prefix=src_prefix)
    assert objects == [gz_src_apigateway_dir, gz_src_apigateway1, gz_src_apigateway2, gz_src_apigateway3]
    
    assert AWS_DDB_ETL_LOG.get(execution_name, scanning_task_id)['status'] == 'Succeeded'
    assert AWS_DDB_ETL_LOG.get_subtask_status_count(execution_name, scanning_task_id, status='Succeeded')[
               'taskCount'] == 1
    
    # recovery s3 original objects
    AWS_S3.delete_object(staging_bucket_name, gz_dst_keep_prefix_apigateway1)
    AWS_S3.delete_object(staging_bucket_name, gz_dst_keep_prefix_apigateway2)
    AWS_S3.delete_object(staging_bucket_name, gz_dst_keep_prefix_apigateway3)


def test_lambda_handler_from_scanning_to_migration_scene_12(mock_s3_context, mock_iam_context, mock_sqs_context, mock_ddb_context, mock_sfn_context):
    import boto3
    from s3_object_scanning.lambda_function import lambda_handler as scanning_lambda_handler, AWS_SQS
    from s3_object_migration.lambda_function import lambda_handler as migration_lambda_handler, AWS_S3, AWS_DDB_ETL_LOG
    
    current_dir = os.path.dirname(os.path.abspath(__file__))
    account_id = os.environ["ACCOUNT_ID"]
    aws_region = os.environ["AWS_REGION"]
    staging_bucket_name = os.environ["STAGING_BUCKET_NAME"]
    migration_sqs_url = os.environ['MIGRATION_SQS_URL']
    sqs_client = boto3.client('sqs')
    
    s3_object_scanning_event = json.loads(os.environ["S3_OBJECT_SCANNING_EVENT"])
    scanning_function_name = os.environ["S3_OBJECTS_SCANNING_FUNCTION_NAME"]
    scanning_context = types.SimpleNamespace()
    scanning_context.function_name = scanning_function_name
    
    migration_function_name = os.environ["S3_OBJECTS_MIGRATION_FUNCTION_NAME"]
    migration_context = types.SimpleNamespace()
    migration_context.function_name = migration_function_name
    
    """
    Init object path
    """
    src_prefix = f'AWSLogs/{account_id}/centralized/aws_apigateway_logs_gz/__ds__=2023-03-11'
    dst_prefix = f'archive/centralized/aws_apigateway_logs_gz/__ds__=2023-03-11'
    gz_src_apigateway_dir = f'AWSLogs/{account_id}/centralized/aws_apigateway_logs_gz/__ds__=2023-03-11-20-01/'
    gz_src_apigateway1 = f'AWSLogs/{account_id}/centralized/aws_apigateway_logs_gz/__ds__=2023-03-11-20-01/region={aws_region}/__execution_name__=b49a793b-38d2-40c0-af22-cfacf494732e/apigateway1.gz'
    gz_src_apigateway2 = f'AWSLogs/{account_id}/centralized/aws_apigateway_logs_gz/__ds__=2023-03-11-20-01/region={aws_region}/__execution_name__=b49a793b-38d2-40c0-af22-cfacf494732e/apigateway2.gz'
    gz_src_apigateway3 = f'AWSLogs/{account_id}/centralized/aws_apigateway_logs_gz/__ds__=2023-03-11-20-01/region={aws_region}/__execution_name__=b49a793b-38d2-40c0-af22-cfacf494732e/apigateway3.gz'
    gz_dst_keep_prefix_dict_apigateway1 =  f'archive/centralized/aws_apigateway_logs_gz/__ds__=2023-03-11-00-00/region={aws_region}/__execution_name__=00000000-0000-0000-0000-000000000000/apigateway1.gz'
    gz_dst_keep_prefix_dict_apigateway2 =  f'archive/centralized/aws_apigateway_logs_gz/__ds__=2023-03-11-00-00/region={aws_region}/__execution_name__=00000000-0000-0000-0000-000000000000/apigateway2.gz'
    gz_dst_keep_prefix_dict_apigateway3 =  f'archive/centralized/aws_apigateway_logs_gz/__ds__=2023-03-11-00-00/region={aws_region}/__execution_name__=00000000-0000-0000-0000-000000000000/apigateway3.gz'
    
    """ Scene 12:
    Testing Merge is False, DeleteOnSuccess is False, Size is 100MiB, keepPrefix is dict,
    The expected result is that the files are relocated to the destination directory. Since the size is 100MiB, 
        the 3 files are divided into 1 migration tasks, original file is deleted.
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
    conditions = Attr('parentTaskId').eq('00000000-0000-0000-0000-000000000000')
    scanning_task_info = next(AWS_DDB_ETL_LOG.query_item(execution_name=execution_name, filter=conditions))
    scanning_task_id = scanning_task_info['taskId']
    
    migration_event = sqs_msg_to_lambda_event(sqs_client=sqs_client, url=migration_sqs_url)
    assert len(migration_event['Records']) == 1
    migration_lambda_handler(migration_event, migration_context)
    
    objects = list_object_keys(AWS_S3, staging_bucket_name, prefix=dst_prefix)
    assert objects == [gz_dst_keep_prefix_dict_apigateway1, gz_dst_keep_prefix_dict_apigateway2, gz_dst_keep_prefix_dict_apigateway3]
    
    objects = list_object_keys(AWS_S3, staging_bucket_name, prefix=src_prefix)
    assert objects == [gz_src_apigateway_dir, gz_src_apigateway1, gz_src_apigateway2, gz_src_apigateway3]
    
    assert AWS_DDB_ETL_LOG.get(execution_name, scanning_task_id)['status'] == 'Succeeded'
    assert AWS_DDB_ETL_LOG.get_subtask_status_count(execution_name, scanning_task_id, status='Succeeded')[
               'taskCount'] == 1
    
    # recovery s3 original objects
    AWS_S3.delete_object(staging_bucket_name, gz_dst_keep_prefix_dict_apigateway1)
    AWS_S3.delete_object(staging_bucket_name, gz_dst_keep_prefix_dict_apigateway2)
    AWS_S3.delete_object(staging_bucket_name, gz_dst_keep_prefix_dict_apigateway3)
    
    
def test_lambda_handler_from_scanning_to_migration_scene_13(mock_s3_context, mock_iam_context, mock_sqs_context, mock_ddb_context, mock_sfn_context):
    import boto3
    from s3_object_scanning.lambda_function import lambda_handler as scanning_lambda_handler, AWS_SQS
    from s3_object_migration.lambda_function import lambda_handler as migration_lambda_handler, AWS_S3, AWS_DDB_ETL_LOG
    
    current_dir = os.path.dirname(os.path.abspath(__file__))
    account_id = os.environ["ACCOUNT_ID"]
    aws_region = os.environ["AWS_REGION"]
    staging_bucket_name = os.environ["STAGING_BUCKET_NAME"]
    migration_sqs_url = os.environ['MIGRATION_SQS_URL']
    sqs_client = boto3.client('sqs')
    
    s3_object_scanning_event = json.loads(os.environ["S3_OBJECT_SCANNING_EVENT"])
    scanning_function_name = os.environ["S3_OBJECTS_SCANNING_FUNCTION_NAME"]
    scanning_context = types.SimpleNamespace()
    scanning_context.function_name = scanning_function_name
    
    migration_function_name = os.environ["S3_OBJECTS_MIGRATION_FUNCTION_NAME"]
    migration_context = types.SimpleNamespace()
    migration_context.function_name = migration_function_name
    
    """
    Init object path
    """
    src_prefix = f'AWSLogs/{account_id}/centralized/aws_apigateway_logs_gz/__ds__=2023-03-11'
    dst_prefix = f'archive/centralized/aws_apigateway_logs_gz/__ds__=2023-03-11'
    gz_src_apigateway_dir = f'AWSLogs/{account_id}/centralized/aws_apigateway_logs_gz/__ds__=2023-03-11-20-01/'
    gz_src_apigateway1 = f'AWSLogs/{account_id}/centralized/aws_apigateway_logs_gz/__ds__=2023-03-11-20-01/region={aws_region}/__execution_name__=b49a793b-38d2-40c0-af22-cfacf494732e/apigateway1.gz'
    gz_src_apigateway2 = f'AWSLogs/{account_id}/centralized/aws_apigateway_logs_gz/__ds__=2023-03-11-20-01/region={aws_region}/__execution_name__=b49a793b-38d2-40c0-af22-cfacf494732e/apigateway2.gz'
    gz_src_apigateway3 = f'AWSLogs/{account_id}/centralized/aws_apigateway_logs_gz/__ds__=2023-03-11-20-01/region={aws_region}/__execution_name__=b49a793b-38d2-40c0-af22-cfacf494732e/apigateway3.gz'
    gz_dst_not_keep_prefix_apigateway1 =  f'archive/centralized/aws_apigateway_logs_gz/__ds__=2023-03-11/apigateway1.gz'
    gz_dst_not_keep_prefix_apigateway2 =  f'archive/centralized/aws_apigateway_logs_gz/__ds__=2023-03-11/apigateway2.gz'
    gz_dst_not_keep_prefix_apigateway3 =  f'archive/centralized/aws_apigateway_logs_gz/__ds__=2023-03-11/apigateway3.gz'
    
    """ Scene 13:
    Testing Merge is False, DeleteOnSuccess is False, Size is 100MiB, keepPrefix is False,
    The expected result is that the files are relocated to the destination directory. Since the size is 100MiB, 
        the 3 files are divided into 1 migration tasks, original file is deleted.
    """
    execution_name = str(uuid.uuid4())
    scanning_event = copy.deepcopy(s3_object_scanning_event)
    scanning_event['executionName'] = execution_name
    scanning_event['merge'] = False
    scanning_event['keepPrefix'] = False
    
    scanning_lambda_handler(scanning_event, scanning_context)
    conditions = Attr('parentTaskId').eq('00000000-0000-0000-0000-000000000000')
    scanning_task_info = next(AWS_DDB_ETL_LOG.query_item(execution_name=execution_name, filter=conditions))
    scanning_task_id = scanning_task_info['taskId']
    
    migration_event = sqs_msg_to_lambda_event(sqs_client=sqs_client, url=migration_sqs_url)
    assert len(migration_event['Records']) == 1
    migration_lambda_handler(migration_event, migration_context)
    
    objects = list_object_keys(AWS_S3, staging_bucket_name, prefix=dst_prefix)
    assert objects == [gz_dst_not_keep_prefix_apigateway1, gz_dst_not_keep_prefix_apigateway2, gz_dst_not_keep_prefix_apigateway3]
    
    objects = list_object_keys(AWS_S3, staging_bucket_name, prefix=src_prefix)
    assert objects == [gz_src_apigateway_dir, gz_src_apigateway1, gz_src_apigateway2, gz_src_apigateway3]
    
    assert AWS_DDB_ETL_LOG.get(execution_name, scanning_task_id)['status'] == 'Succeeded'
    assert AWS_DDB_ETL_LOG.get_subtask_status_count(execution_name, scanning_task_id, status='Succeeded')[
               'taskCount'] == 1
    
    # recovery s3 original objects
    AWS_S3.delete_object(staging_bucket_name, gz_dst_not_keep_prefix_apigateway1)
    AWS_S3.delete_object(staging_bucket_name, gz_dst_not_keep_prefix_apigateway2)
    AWS_S3.delete_object(staging_bucket_name, gz_dst_not_keep_prefix_apigateway3)


def test_lambda_handler_from_scanning_to_migration_scene_14(mock_s3_context, mock_iam_context, mock_sqs_context, mock_ddb_context, mock_sfn_context):
    import boto3
    from s3_object_scanning.lambda_function import lambda_handler as scanning_lambda_handler, AWS_SQS
    from s3_object_migration.lambda_function import lambda_handler as migration_lambda_handler, AWS_S3, AWS_DDB_ETL_LOG
    
    current_dir = os.path.dirname(os.path.abspath(__file__))
    account_id = os.environ["ACCOUNT_ID"]
    aws_region = os.environ["AWS_REGION"]
    staging_bucket_name = os.environ["STAGING_BUCKET_NAME"]
    migration_sqs_url = os.environ['MIGRATION_SQS_URL']
    sqs_client = boto3.client('sqs')
    
    s3_object_scanning_event = json.loads(os.environ["S3_OBJECT_SCANNING_EVENT"])
    scanning_function_name = os.environ["S3_OBJECTS_SCANNING_FUNCTION_NAME"]
    scanning_context = types.SimpleNamespace()
    scanning_context.function_name = scanning_function_name
    
    migration_function_name = os.environ["S3_OBJECTS_MIGRATION_FUNCTION_NAME"]
    migration_context = types.SimpleNamespace()
    migration_context.function_name = migration_function_name
    
    """ Scene 14:
    Testing no objects in bucket
    The expected result is one migration message in SQS and no subtasks in DDB.
    """
    execution_name = str(uuid.uuid4())
    scanning_event = copy.deepcopy(s3_object_scanning_event)
    scanning_event['executionName'] = execution_name
    scanning_event['srcPath'] = f"s3://{staging_bucket_name}/not-exists-prefix/"
    
    scanning_lambda_handler(scanning_event, scanning_context)
    conditions = Attr('parentTaskId').eq('00000000-0000-0000-0000-000000000000')
    scanning_task_info = next(AWS_DDB_ETL_LOG.query_item(execution_name=execution_name, filter=conditions))
    scanning_task_id = scanning_task_info['taskId']
    
    migration_event = sqs_msg_to_lambda_event(sqs_client=sqs_client, url=migration_sqs_url)
    assert len(migration_event['Records']) == 1
    migration_lambda_handler(migration_event, migration_context)
    
    assert AWS_DDB_ETL_LOG.get(execution_name, scanning_task_id)['status'] == 'Succeeded'
    assert AWS_DDB_ETL_LOG.get_subtask_status_count(execution_name, scanning_task_id, status='Succeeded')[
               'taskCount'] == 0
    migration_task_info_iterator = AWS_DDB_ETL_LOG.query_subtasks(execution_name=execution_name, parent_task_id=scanning_task_id)
    with pytest.raises(StopIteration):
        next(migration_task_info_iterator)


def test_lambda_handler_from_scanning_to_migration_scene_15(mock_s3_context, mock_iam_context, mock_sqs_context, mock_ddb_context, mock_sfn_context):
    import boto3
    from s3_object_scanning.lambda_function import lambda_handler as scanning_lambda_handler, AWS_SQS
    from s3_object_migration.lambda_function import lambda_handler as migration_lambda_handler, AWS_S3, AWS_DDB_ETL_LOG
    
    current_dir = os.path.dirname(os.path.abspath(__file__))
    account_id = os.environ["ACCOUNT_ID"]
    aws_region = os.environ["AWS_REGION"]
    staging_bucket_name = os.environ["STAGING_BUCKET_NAME"]
    migration_sqs_url = os.environ['MIGRATION_SQS_URL']
    sqs_client = boto3.client('sqs')
    
    s3_object_scanning_event = json.loads(os.environ["S3_OBJECT_SCANNING_EVENT"])
    scanning_function_name = os.environ["S3_OBJECTS_SCANNING_FUNCTION_NAME"]
    scanning_context = types.SimpleNamespace()
    scanning_context.function_name = scanning_function_name
    
    migration_function_name = os.environ["S3_OBJECTS_MIGRATION_FUNCTION_NAME"]
    migration_context = types.SimpleNamespace()
    migration_context.function_name = migration_function_name
    
    tmp_bucket_prefix = f'tmp/AWSLogs/{account_id}/centralized/aws_apigateway_logs_gz/__ds__=2023-03-13-02-59/region={aws_region}/__execution_name__=c399c496-3f6a-4f4d-99e6-890493f19278'
    
    tasks = [
        {
            'source': {
                'bucket': staging_bucket_name,
                'key': f'AWSLogs/{account_id}/centralized/aws_apigateway_logs_gz/__ds__=2023-03-13-02-59/region={aws_region}/__execution_name__=c399c496-3f6a-4f4d-99e6-890493f19278/apigateway3.gz'
            },
            'destination': {
                'bucket': staging_bucket_name,
                'key': f'{tmp_bucket_prefix}/apigateway3.gz'
            },
        },
        {
            'source': {
                'bucket': staging_bucket_name,
                'key': f'AWSLogs/{account_id}/centralized/aws_apigateway_logs_parquet/__ds__=2023-03-11-20-01/region={aws_region}/__execution_name__=b49a793b-38d2-40c0-af22-cfacf494732e/apigateway1.parquet'
            },
            'destination': {
                'bucket': staging_bucket_name,
                'key': f'{tmp_bucket_prefix}/apigateway1.parquet'
            },
        }
    ]
    AWS_S3.batch_copy_objects(tasks=tasks)
    
    """ Scene 15:
    Testing status is FAILED
    """
    execution_name = str(uuid.uuid4())
    scanning_event = copy.deepcopy(s3_object_scanning_event)
    scanning_event['executionName'] = execution_name
    scanning_event['srcPath'] = f"s3://{staging_bucket_name}/tmp/AWSLogs/{account_id}/centralized/aws_apigateway_logs_gz"
    scanning_event['merge'] = True
    scanning_event['taskToken'] = ''
    
    scanning_lambda_handler(scanning_event, scanning_context)
    conditions = Attr('parentTaskId').eq('00000000-0000-0000-0000-000000000000')
    scanning_task_info = next(AWS_DDB_ETL_LOG.query_item(execution_name=execution_name, filter=conditions))
    scanning_task_id = scanning_task_info['taskId']
    
    migration_event = sqs_msg_to_lambda_event(sqs_client=sqs_client, url=migration_sqs_url)
    assert len(migration_event['Records']) == 1
    migration_lambda_handler(migration_event, migration_context)
    
    msg = json.loads(gzip.decompress(base64.b64decode(migration_event['Records'][0]['body'])))
    assert AWS_DDB_ETL_LOG.get(execution_name, msg['taskId'])['status'] == 'Failed'
    assert AWS_DDB_ETL_LOG.get_subtask_status_count(execution_name, scanning_task_id, status='Succeeded')[
               'taskCount'] == 0
    assert AWS_DDB_ETL_LOG.get_subtask_status_count(execution_name, scanning_task_id, status='Failed')[
               'taskCount'] == 1
        
        
def test_check_patent_task_completion(mock_s3_context, mock_iam_context, mock_sqs_context, mock_ddb_context, mock_sfn_context):
    from s3_object_migration.lambda_function import Parameters, AWS_S3, AWS_DDB_ETL_LOG, check_parent_task_completion
    from unittest.mock import patch
    
    execution_name = '1ebf165b-f846-4813-8cab-305be5c8ca7e'
    parent_task_id = '6b10286b-c4b3-44ed-b4e8-c251a04b6a59'
    sub_task1_id = '9d512f44-7626-49e2-a465-f450e93f6388'
    sub_task2_id = 'bc73c25b-49c1-4d9f-a005-d0853809260d'
    
    s3_object_migration_event = json.loads(os.environ["S3_OBJECT_MIGRATION_EVENT"])
    migration_function_name = os.environ["S3_OBJECTS_MIGRATION_FUNCTION_NAME"]
    migration_context = types.SimpleNamespace()
    migration_context.function_name = migration_function_name
    
    migration_event = copy.deepcopy(s3_object_migration_event)
    record = migration_event['Records'][0]['body']
    param = Parameters(record)
    
    assert check_parent_task_completion(param=param) is False
    
    AWS_DDB_ETL_LOG.update(execution_name=execution_name, task_id=sub_task1_id, item={
        'endTime': datetime.datetime.now(datetime.UTC).isoformat(), 'status': 'Succeeded',
        'functionName': migration_function_name})

    assert check_parent_task_completion(param=param) is False
    assert AWS_DDB_ETL_LOG.get(execution_name=execution_name, task_id=parent_task_id)['status'] == 'Running'
    
    AWS_DDB_ETL_LOG.update(execution_name=execution_name, task_id=sub_task2_id, item={
        'endTime': datetime.datetime.now(datetime.UTC).isoformat(), 'status': 'Succeeded',
        'functionName': migration_function_name})
    
    assert check_parent_task_completion(param=param) is True
    assert AWS_DDB_ETL_LOG.get(execution_name=execution_name, task_id=parent_task_id)['status'] == 'Succeeded'
    
    AWS_DDB_ETL_LOG.update(execution_name=execution_name, task_id=parent_task_id, item={'endTime': '', 
        'status': 'Running', 'functionName': '', 'data': json.dumps({'totalSubTask': 0})})
    AWS_DDB_ETL_LOG.delete(execution_name=execution_name, task_id=sub_task1_id)
    AWS_DDB_ETL_LOG.delete(execution_name=execution_name, task_id=sub_task2_id)
    assert check_parent_task_completion(param=param) is True
    assert AWS_DDB_ETL_LOG.get(execution_name=execution_name, task_id=parent_task_id)['status'] == 'Succeeded'

    with patch('botocore.client.BaseClient._make_api_call', new=mock_boto3_api_call):
        migration_event = copy.deepcopy(s3_object_migration_event)
        record = migration_event['Records'][0]['body']
        record['taskToken'] = 'AQCEAAAAKgAAAAMAAAAA'
        param = Parameters(record)
        
        assert check_parent_task_completion(param=param) is True
