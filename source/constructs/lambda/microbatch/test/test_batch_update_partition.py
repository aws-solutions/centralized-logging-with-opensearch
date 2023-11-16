# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import os
import sys
import copy
import uuid
import json
import types
import pytest
from datetime import datetime
from boto3.dynamodb.conditions import Attr
from test.mock import mock_s3_context, mock_sqs_context, mock_iam_context, mock_ddb_context, mock_athena_context, default_environment_variables


sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


class TestParameter:
    def test_required_parameter_check(self, mock_sqs_context, mock_iam_context, mock_ddb_context, mock_athena_context):
        from batch_update_partition.lambda_function import Parameters, AWS_ATHENA, AWS_DDB_ETL_LOG

        account_id = os.environ["ACCOUNT_ID"]
        staging_bucket_name = os.environ["STAGING_BUCKET_NAME"]
        database = os.environ["CENTRALIZED_DATABASE"] 
        table = os.environ["ATHENA_TABLE_NAME"]
        work_group = os.environ["ATHENA_WORK_GROUP"]
        output_location = os.environ["ATHENA_OUTPUT_LOCATION"]
        batch_update_partition_event = json.loads(os.environ["ETL_ALTER_ATHENA_PARTITION_EVENT"])
        
        event = copy.deepcopy(batch_update_partition_event)
        param = Parameters(event)
        
        # assert param.execution_name == event['executionName']
        assert param.database == database
        assert param.table_name == table
        assert param.location.bucket == staging_bucket_name
        assert param.location.prefix == f'AWSLogs/{account_id}/centralized/aws_apigateway_logs_parquet'
        assert param.partition_prefix == event['partitionPrefix']
        assert param.work_group == work_group
        assert param.output_location == output_location
        param.ddb_item.pop('startTime')
        param.ddb_item.pop('taskId')

        for required_param in ('executionName', 'database', 'tableName', 'location', 'partitionPrefix', 'workGroup', 'outputLocation'):
            event = copy.deepcopy(batch_update_partition_event)
            event.pop(required_param)
            with pytest.raises(Exception) as exception_info:
                Parameters(event)
            assert exception_info.value.args[0] == f'Missing value for {required_param}.'
    
    def test_optional_parameter_check(self, mock_sqs_context, mock_iam_context, mock_ddb_context, mock_athena_context):
        from batch_update_partition.lambda_function import Parameters, AWS_ATHENA, AWS_DDB_ETL_LOG

        batch_update_partition_event = json.loads(os.environ["ETL_ALTER_ATHENA_PARTITION_EVENT"])
        batch_update_partition_function_name = os.environ["ETL_ALTER_ATHENA_PARTITION_FUNCTION_NAME"]
        
        event = copy.deepcopy(batch_update_partition_event)
        event['functionName'] = batch_update_partition_function_name
        event['taskId'] = str(uuid.uuid4())
        param = Parameters(event)
        param.ddb_item.pop('startTime')
        
        assert param.function_name == batch_update_partition_function_name
        assert param.action == 'ADD'
        assert param.extra == {"stateMachineName": "LogMerger-7vcYqNfMtsJK",
                                "stateName": "Step 2: Drop partitions for History data",
                                "API": "Lambda: Invoke"
                              }
        assert param.task_id == event['taskId']
        pipeline_index_key = param.ddb_item['pipelineIndexKey']
        param.ddb_item.pop('pipelineIndexKey')
        assert param.ddb_item['expirationTime'] > datetime.utcnow().timestamp()
        param.ddb_item.pop('expirationTime')
        assert param.ddb_item == {'executionName': '848be54a-ae2c-414c-9ae3-f0b3d11089ab', 'functionName': 'ETLAlterAthenaPartition-WuQ7BUYqgA2L', 
                                  'taskId': event['taskId'], 'data': '', 
                                  'endTime': '', 'status': 'Running', 
                                  'stateMachineName': 'LogMerger-7vcYqNfMtsJK', 'stateName': 'Step 2: Drop partitions for History data', 
                                  'API': 'Lambda: Invoke'}
        assert pipeline_index_key.split(':')[0] == ''
        assert pipeline_index_key.split(':')[1] == 'LogMerger-7vcYqNfMtsJK'
        assert pipeline_index_key.split(':')[2] != ''
        
        event = copy.deepcopy(batch_update_partition_event)
        event['action'] = 'DROP'
        param = Parameters(event)
        param.ddb_item.pop('startTime')
        param.ddb_item.pop('taskId')
        
        assert param.function_name == ''
        assert param.action == 'DROP'
        assert param.task_id is not None
        assert param.task_id != ''
        pipeline_index_key = param.ddb_item['pipelineIndexKey']
        param.ddb_item.pop('pipelineIndexKey')
        assert param.ddb_item['expirationTime'] > datetime.utcnow().timestamp()
        param.ddb_item.pop('expirationTime')
        assert param.ddb_item == {'executionName': '848be54a-ae2c-414c-9ae3-f0b3d11089ab', 'functionName': '', 'data': '', 
                                  'endTime': '', 'status': 'Running', 'stateMachineName': 'LogMerger-7vcYqNfMtsJK', 
                                  'stateName': 'Step 2: Drop partitions for History data', 'API': 'Lambda: Invoke'}
        assert pipeline_index_key.split(':')[0] == ''
        assert pipeline_index_key.split(':')[1] == 'LogMerger-7vcYqNfMtsJK'
        assert pipeline_index_key.split(':')[2] != ''
        
        event = copy.deepcopy(batch_update_partition_event)
        event.pop('action')
        event.pop('extra')
        param = Parameters(event)
        param.ddb_item.pop('startTime')
        param.ddb_item.pop('taskId')
        
        assert param.function_name == ''
        assert param.action == 'ADD'
        assert param.extra == {}
        assert param.task_id is not None
        assert param.task_id != ''
        pipeline_index_key = param.ddb_item['pipelineIndexKey']
        param.ddb_item.pop('pipelineIndexKey')
        assert param.ddb_item['expirationTime'] > datetime.utcnow().timestamp()
        param.ddb_item.pop('expirationTime')
        assert param.ddb_item == {'executionName': '848be54a-ae2c-414c-9ae3-f0b3d11089ab', 'functionName': '', 
                                  'data': '', 'endTime': '', 'status': 'Running'}
        assert pipeline_index_key.split(':')[0] == ''
        assert pipeline_index_key.split(':')[1] == ''
        assert pipeline_index_key.split(':')[2] != ''
        
        event = copy.deepcopy(batch_update_partition_event)
        event['action'] = 'test-string'
        param = Parameters(event)
        param.ddb_item.pop('startTime')
        param.ddb_item.pop('taskId')
        
        assert param.function_name == ''
        assert param.action == 'ADD'
                
          
def test_lambda_handler(mock_s3_context, mock_sqs_context, mock_iam_context, mock_ddb_context, mock_athena_context):
    from batch_update_partition.lambda_function import lambda_handler, AWS_ATHENA, AWS_DDB_ETL_LOG
    from unittest.mock import patch

    staging_bucket_name = os.environ["STAGING_BUCKET_NAME"]
    database = os.environ["CENTRALIZED_DATABASE"] 
    table = os.environ["ATHENA_TABLE_NAME"]
    batch_update_partition_event = json.loads(os.environ["ETL_ALTER_ATHENA_PARTITION_EVENT"])
    batch_update_partition_function_name = os.environ["ETL_ALTER_ATHENA_PARTITION_FUNCTION_NAME"]
    
    context = types.SimpleNamespace()
    context.function_name = batch_update_partition_function_name

    with pytest.raises(Exception) as exception_info:
        lambda_handler('not-a-dict', context)
    assert exception_info.value.args[0] == 'The event is not a dict.'
        
    event = copy.deepcopy(batch_update_partition_event)
    event['extra']['parentTaskId'] = str(uuid.uuid4())
    execution_name = event['executionName']
    
    lambda_handler(event, context)
    
    conditions = Attr('parentTaskId').eq(event['extra']['parentTaskId'])
    response = AWS_DDB_ETL_LOG.query_item(execution_name=execution_name, filter=conditions)
    item = next(response)
    task_id = item['taskId']
    assert item['executionName'] == execution_name
    assert item['functionName'] == batch_update_partition_function_name
    assert item['data'] == ''
    assert item['startTime'] != ''
    assert item['endTime'] != ''
    assert item['status'] == 'Succeeded'
    assert item['stateMachineName'] == 'LogMerger-7vcYqNfMtsJK'
    assert item['stateName'] == 'Step 2: Drop partitions for History data'
    assert item['API'] == 'Lambda: Invoke'
    assert item['parentTaskId'] == event['extra']['parentTaskId']
    
    conditions = Attr('parentTaskId').eq(task_id)
    response = AWS_DDB_ETL_LOG.query_item(execution_name=execution_name, filter=conditions)
    item = next(response)
    assert item['executionName'] == execution_name
    assert item['functionName'] == batch_update_partition_function_name
    assert item['data'][:83] == f"ALTER TABLE `{database}`.`{table}` ADD IF NOT EXISTS PARTITION"
    assert "(`__ds__`='2023-03-11-18-01', `region`='us-east-1', `__execution_name__`='b49a793b-38d2-40c0-af22-cfacf494732e')" in item['data']
    assert "(`__ds__`='2023-03-11-20-01', `region`='us-east-1', `__execution_name__`='b49a793b-38d2-40c0-af22-cfacf494732e')" in item['data']
    assert item['startTime'] != ''
    assert item['endTime'] != ''
    assert item['status'] == 'Succeeded'
    assert item['stateMachineName'] == 'LogMerger-7vcYqNfMtsJK'
    assert item['stateName'] == 'Step 2: Drop partitions for History data'
    assert item['API'] == 'Athena: StartQueryExecution'
    assert item['parentTaskId'] == task_id
    
    with pytest.raises(StopIteration):
        next(response)
    
    event = copy.deepcopy(batch_update_partition_event)
    event['extra']['parentTaskId'] = str(uuid.uuid4())
    event['action'] = 'DROP'
    execution_name = event['executionName']
    
    lambda_handler(event, context)
    
    conditions = Attr('parentTaskId').eq(event['extra']['parentTaskId'])
    response = AWS_DDB_ETL_LOG.query_item(execution_name=execution_name, filter=conditions)
    item = next(response)
    task_id = item['taskId']
    assert item['executionName'] == execution_name
    assert item['functionName'] == batch_update_partition_function_name
    assert item['data'] == ''
    assert item['startTime'] != ''
    assert item['endTime'] != ''
    assert item['status'] == 'Succeeded'
    assert item['stateMachineName'] == 'LogMerger-7vcYqNfMtsJK'
    assert item['stateName'] == 'Step 2: Drop partitions for History data'
    assert item['API'] == 'Lambda: Invoke'
    assert item['parentTaskId'] == event['extra']['parentTaskId']
    
    conditions = Attr('parentTaskId').eq(task_id)
    response = AWS_DDB_ETL_LOG.query_item(execution_name=execution_name, filter=conditions)
    item = next(response)
    assert item['executionName'] == execution_name
    assert item['functionName'] == batch_update_partition_function_name
    assert item['data'][:80] == f"ALTER TABLE `{database}`.`{table}` DROP IF EXISTS PARTITION"
    assert "(`__ds__`='2023-03-11-18-01', `region`='us-east-1', `__execution_name__`='b49a793b-38d2-40c0-af22-cfacf494732e')" in item['data']
    assert "(`__ds__`='2023-03-11-20-01', `region`='us-east-1', `__execution_name__`='b49a793b-38d2-40c0-af22-cfacf494732e')" in item['data']
    assert item['startTime'] != ''
    assert item['endTime'] != ''
    assert item['status'] == 'Succeeded'
    assert item['stateMachineName'] == 'LogMerger-7vcYqNfMtsJK'
    assert item['stateName'] == 'Step 2: Drop partitions for History data'
    assert item['API'] == 'Athena: StartQueryExecution'
    assert item['parentTaskId'] == task_id
    
    with pytest.raises(StopIteration):
        next(response)
        
    event = copy.deepcopy(batch_update_partition_event)
    event['location'] = f's3://{staging_bucket_name}/not-exists-prefix/'
    event['extra']['parentTaskId'] = str(uuid.uuid4())
    execution_name = event['executionName']
    
    lambda_handler(event, context)
    
    conditions = Attr('parentTaskId').eq(event['extra']['parentTaskId'])
    response = AWS_DDB_ETL_LOG.query_item(execution_name=execution_name, filter=conditions)
    item = next(response)
    task_id = item['taskId']
    assert item['executionName'] == execution_name
    assert item['functionName'] == batch_update_partition_function_name
    assert item['data'] == ''
    assert item['startTime'] != ''
    assert item['endTime'] != ''
    assert item['status'] == 'Succeeded'
    assert item['stateMachineName'] == 'LogMerger-7vcYqNfMtsJK'
    assert item['stateName'] == 'Step 2: Drop partitions for History data'
    assert item['API'] == 'Lambda: Invoke'
    assert item['parentTaskId'] == event['extra']['parentTaskId']

    event = copy.deepcopy(batch_update_partition_event)
    event['location'] = 's3://not-exists-bucket/AWSLogs/012345678912'
    with pytest.raises(Exception) as exception_info:
        lambda_handler(event, context)
    assert exception_info.value.args[0] == 'An error occurred (404) when calling the HeadBucket operation: Not Found'
    
    # mock failed api call
    def mock_failed_api_call(self, operation_name, kwarg):
        from botocore.exceptions import ClientError
        
        if operation_name == 'StartQueryExecution':
            if kwarg['QueryString'] == "ALTER TABLE `centralized`.`aws_apigateway_logs_parquet` ADD IF NOT EXISTS PARTITION (`__ds__`='2023-03-11', `region`='us-east-1');":
                raise ClientError(error_response={'Error': {'Code': '400', 'Message': 'Error Query String.'}}, operation_name=operation_name)
        elif operation_name == 'ListObjectsV2':
            if kwarg['Bucket'] == 'mock-bucket':
                return {
                    'Contents': [
                        {
                            'Key': 'centralized/aws_apigateway_logs_parquet/__ds__=2023-03-11/region=us-east-1/file1.parquet',
                            'Size': 123,
                            },
                        {
                            'Key': 'centralized/aws_apigateway_logs_parquet/__ds__=2023-03-11/region=us-east-1/file2.parquet',
                            'Size': 111,
                            },
                        ]
                    }
    # mock a start query execution return failed.
    event = copy.deepcopy(batch_update_partition_event)
    event['location'] = 's3://mock-bucket/centralized/aws_apigateway_logs_parquet'
    event['taskId'] = '00000'
    with patch('botocore.client.BaseClient._make_api_call', new=mock_failed_api_call):
        lambda_handler(event, context)
        
    # mock partly succeeded api call
    def mock_partly_succeeded_api_call(self, operation_name, kwarg):
        from botocore.exceptions import ClientError
        from datetime import datetime
        
        if operation_name == 'StartQueryExecution':
            if '2023-03' in kwarg['QueryString']:
                raise ClientError(error_response={'Error': {'Code': '400', 'Message': 'Error Query String.'}}, operation_name=operation_name)
            elif '2023-02' in kwarg['QueryString']:
                return {'QueryExecutionId': '000000'}
        elif operation_name == 'GetQueryExecution':
            if kwarg['QueryExecutionId'] == '000000':
                return {
                    'QueryExecution': {
                        'QueryExecutionId': '000000',
                        'Query': 'string',
                        'StatementType': 'DDL',
                        'Status': {
                            'State': 'SUCCEEDED',
                            'SubmissionDateTime': datetime.now(),
                            'CompletionDateTime': datetime.now(),
                            },
                        }
                    }
        elif operation_name == 'ListObjectsV2':
            if kwarg['Bucket'] == 'mock-bucket':
                contents = []
                for i in range(20):
                    contents.append({
                        'Key': f'centralized/aws_apigateway_logs_parquet/__ds__=2023-03-{i}/region=us-east-1/file1.parquet',
                        'Size': 123,
                        })
                for i in range(20):
                    contents.append({
                        'Key': f'centralized/aws_apigateway_logs_parquet/__ds__=2023-02-{i}/region=us-east-1/file1.parquet',
                        'Size': 100,
                        })
                return {'Contents': contents}
            
    # mock a start query execution return partly succeeded.
    event = copy.deepcopy(batch_update_partition_event)
    event['location'] = 's3://mock-bucket/centralized/aws_apigateway_logs_parquet'
    event['taskId'] = '00000'
    with patch('botocore.client.BaseClient._make_api_call', new=mock_partly_succeeded_api_call):
        lambda_handler(event, context)
    

def test_alter_athena_table_partition_handler(mock_s3_context, mock_sqs_context, mock_iam_context, mock_ddb_context, mock_athena_context):
    from batch_update_partition.lambda_function import batch_update_partition_handler, Parameters, AWS_ATHENA, AWS_DDB_ETL_LOG

    database = os.environ["CENTRALIZED_DATABASE"] 
    table = os.environ["ATHENA_TABLE_NAME"]
    batch_update_partition_event = json.loads(os.environ["ETL_ALTER_ATHENA_PARTITION_EVENT"])
    batch_update_partition_function_name = os.environ["ETL_ALTER_ATHENA_PARTITION_FUNCTION_NAME"]
    
    context = types.SimpleNamespace()
    context.function_name = batch_update_partition_function_name

    event = copy.deepcopy(batch_update_partition_event)
    execution_name = event['executionName']
    event['extra']['parentTaskId'] = str(uuid.uuid4())
    param = Parameters(event)
    
    response = batch_update_partition_handler(param)
    assert response['totalSubTask'] == 1
    assert response['state']['Succeeded'] == 1
    
    response = AWS_DDB_ETL_LOG.query_item(execution_name=execution_name)
    item = next(response)
    assert item['executionName'] == execution_name
    assert item['functionName'] == ''
    assert item['data'][:83] == f"ALTER TABLE `{database}`.`{table}` ADD IF NOT EXISTS PARTITION"
    assert "(`__ds__`='2023-03-11-18-01', `region`='us-east-1', `__execution_name__`='b49a793b-38d2-40c0-af22-cfacf494732e')" in item['data']
    assert "(`__ds__`='2023-03-11-20-01', `region`='us-east-1', `__execution_name__`='b49a793b-38d2-40c0-af22-cfacf494732e')" in item['data']
    assert item['startTime'] != ''
    assert item['endTime'] != ''
    assert item['status'] == 'Succeeded'
    assert item['stateMachineName'] == 'LogMerger-7vcYqNfMtsJK'
    assert item['stateName'] == 'Step 2: Drop partitions for History data'
    assert item['API'] == 'Athena: StartQueryExecution'
    assert item['parentTaskId'] == param.task_id
    
    with pytest.raises(StopIteration):
        next(response)
    
    event = copy.deepcopy(batch_update_partition_event)
    execution_name = str(uuid.uuid4())
    event['executionName'] = execution_name
    event['action'] = 'DROP'
    event['extra']['parentTaskId'] = str(uuid.uuid4())
    param = Parameters(event)
    
    response = batch_update_partition_handler(param)
    assert response['totalSubTask'] == 1
    assert response['state']['Succeeded'] == 1
    
    response = AWS_DDB_ETL_LOG.query_item(execution_name=execution_name)
    item = next(response)
    assert item['executionName'] == execution_name
    assert item['functionName'] == ''
    assert item['data'][:80] == f"ALTER TABLE `{database}`.`{table}` DROP IF EXISTS PARTITION"
    assert "(`__ds__`='2023-03-11-18-01', `region`='us-east-1', `__execution_name__`='b49a793b-38d2-40c0-af22-cfacf494732e')" in item['data']
    assert "(`__ds__`='2023-03-11-20-01', `region`='us-east-1', `__execution_name__`='b49a793b-38d2-40c0-af22-cfacf494732e')" in item['data']
    assert item['startTime'] != ''
    assert item['endTime'] != ''
    assert item['status'] == 'Succeeded'
    assert item['stateMachineName'] == 'LogMerger-7vcYqNfMtsJK'
    assert item['stateName'] == 'Step 2: Drop partitions for History data'
    assert item['API'] == 'Athena: StartQueryExecution'
    assert item['parentTaskId'] == param.task_id
    
    with pytest.raises(StopIteration):
        next(response)


def test_update_partition_ddl_generator(mock_s3_context, mock_sqs_context, mock_iam_context, mock_ddb_context, mock_athena_context):
    from batch_update_partition.lambda_function import update_partition_ddl_generator, Parameters, AWS_ATHENA, AWS_DDB_ETL_LOG

    database = os.environ["CENTRALIZED_DATABASE"] 
    table = os.environ["ATHENA_TABLE_NAME"] 
    
    partitioning_info = set()
    response = update_partition_ddl_generator(database=database, table=table, partitioning_info=set())
    with pytest.raises(StopIteration):
        next(response)
    
    partitioning_info = set()
    partitioning_info.add('__ds__=2023-01-01-05-02/region=us-east-1/api_name=%27Amazon%27/__execution_name__=29a19402-6248-4f17-a025-637b4214a5ef')
    ddl = update_partition_ddl_generator(database=database, table=table, partitioning_info=partitioning_info)
    assert next(ddl) == f"ALTER TABLE `{database}`.`{table}` ADD IF NOT EXISTS PARTITION (`__ds__`='2023-01-01-05-02', `region`='us-east-1', `api_name`='''Amazon''', `__execution_name__`='29a19402-6248-4f17-a025-637b4214a5ef');"
    with pytest.raises(StopIteration):
        next(response)
        
    partitioning_info = set()
    partitioning_info.add('__ds__=2023-01-01-05-02/region=us-east-1/api_name=%27Amazon%27/__execution_name__=29a19402-6248-4f17-a025-637b4214a5ef')
    partitioning_info.add('__ds__=2023-01-01-05-02/region=us-east-1/api_name=AmazonWebService/__execution_name__=29a19402-6248-4f17-a025-637b4214a5ef')
    ddl = update_partition_ddl_generator(database=database, table=table, partitioning_info=partitioning_info)
    ddl = next(ddl)
    assert ddl[:83] == f"ALTER TABLE `{database}`.`{table}` ADD IF NOT EXISTS PARTITION"
    assert "(`__ds__`='2023-01-01-05-02', `region`='us-east-1', `api_name`='''Amazon''', `__execution_name__`='29a19402-6248-4f17-a025-637b4214a5ef')" in ddl
    assert "(`__ds__`='2023-01-01-05-02', `region`='us-east-1', `api_name`='AmazonWebService', `__execution_name__`='29a19402-6248-4f17-a025-637b4214a5ef')" in ddl
    with pytest.raises(StopIteration):
        next(response)
        
    partitioning_info = set()
    partitioning_info.add('__ds__=2023-01-01-05-02/region=us-east-1/api_name=%27Amazon%27/__execution_name__=29a19402-6248-4f17-a025-637b4214a5ef')
    partitioning_info.add('__ds__=2023-01-01-05-02/region=us-east-1/api_name=AmazonWebService/__execution_name__=29a19402-6248-4f17-a025-637b4214a5ef')
    partitioning_info.add('__ds__=2023-01-01-05-02/region=us-east-1/api_name=%22Amazon%22/__execution_name__=29a19402-6248-4f17-a025-637b4214a5ef')
    ddl = update_partition_ddl_generator(database=database, table=table, partitioning_info=partitioning_info)
    ddl = next(ddl)
    assert ddl[:83] == f"ALTER TABLE `{database}`.`{table}` ADD IF NOT EXISTS PARTITION"
    assert "(`__ds__`='2023-01-01-05-02', `region`='us-east-1', `api_name`='''Amazon''', `__execution_name__`='29a19402-6248-4f17-a025-637b4214a5ef')" in ddl
    assert "(`__ds__`='2023-01-01-05-02', `region`='us-east-1', `api_name`='AmazonWebService', `__execution_name__`='29a19402-6248-4f17-a025-637b4214a5ef')" in ddl
    assert "(`__ds__`='2023-01-01-05-02', `region`='us-east-1', `api_name`='\"Amazon\"', `__execution_name__`='29a19402-6248-4f17-a025-637b4214a5ef')" in ddl
    with pytest.raises(StopIteration):
        next(response)

    partitioning_info = set()
    partitioning_info.add('__ds__=2023-01-01-05-02/region=us-east-1/api_name=%27Amazon%27/__execution_name__=29a19402-6248-4f17-a025-637b4214a5ef')
    partitioning_info.add('__ds__=2023-01-01-05-02/region=us-east-1/api_name=AmazonWebService/__execution_name__=29a19402-6248-4f17-a025-637b4214a5ef')
    partitioning_info.add('__ds__=2023-01-01-05-02/region=us-east-1/api_name=%22Amazon%22/__execution_name__=29a19402-6248-4f17-a025-637b4214a5ef')
    response = update_partition_ddl_generator(database=database, table=table, partitioning_info=partitioning_info, batch_num=2)
    assert len(list(response)) == 2
    
    
    
    partitioning_info = set()
    partitioning_info.add('__ds__=2023-01-01-05-02/region=us-east-1/api_name=%27Amazon%27/__execution_name__=29a19402-6248-4f17-a025-637b4214a5ef')
    ddl = update_partition_ddl_generator(database=database, table=table, partitioning_info=partitioning_info, action='DROP')
    assert next(ddl) == f"ALTER TABLE `{database}`.`{table}` DROP IF EXISTS PARTITION (`__ds__`='2023-01-01-05-02', `region`='us-east-1', `api_name`='''Amazon''', `__execution_name__`='29a19402-6248-4f17-a025-637b4214a5ef');"
    with pytest.raises(StopIteration):
        next(response)
        
    partitioning_info = set()
    partitioning_info.add('__ds__=2023-01-01-05-02/region=us-east-1/api_name=%27Amazon%27/__execution_name__=29a19402-6248-4f17-a025-637b4214a5ef')
    partitioning_info.add('__ds__=2023-01-01-05-02/region=us-east-1/api_name=AmazonWebService/__execution_name__=29a19402-6248-4f17-a025-637b4214a5ef')
    ddl = update_partition_ddl_generator(database=database, table=table, partitioning_info=partitioning_info, action='DROP')
    ddl = next(ddl)
    assert ddl[:80] == f"ALTER TABLE `{database}`.`{table}` DROP IF EXISTS PARTITION"
    assert "(`__ds__`='2023-01-01-05-02', `region`='us-east-1', `api_name`='''Amazon''', `__execution_name__`='29a19402-6248-4f17-a025-637b4214a5ef')" in ddl
    assert "(`__ds__`='2023-01-01-05-02', `region`='us-east-1', `api_name`='AmazonWebService', `__execution_name__`='29a19402-6248-4f17-a025-637b4214a5ef')" in ddl
    with pytest.raises(StopIteration):
        next(response)
        
    partitioning_info = set()
    partitioning_info.add('__ds__=2023-01-01-05-02/region=us-east-1/api_name=%27Amazon%27/__execution_name__=29a19402-6248-4f17-a025-637b4214a5ef')
    partitioning_info.add('__ds__=2023-01-01-05-02/region=us-east-1/api_name=AmazonWebService/__execution_name__=29a19402-6248-4f17-a025-637b4214a5ef')
    partitioning_info.add('__ds__=2023-01-01-05-02/region=us-east-1/api_name=%22Amazon%22/__execution_name__=29a19402-6248-4f17-a025-637b4214a5ef')
    ddl = update_partition_ddl_generator(database=database, table=table, partitioning_info=partitioning_info, action='DROP')
    ddl = next(ddl)
    assert ddl[:80] == f"ALTER TABLE `{database}`.`{table}` DROP IF EXISTS PARTITION"
    assert "(`__ds__`='2023-01-01-05-02', `region`='us-east-1', `api_name`='''Amazon''', `__execution_name__`='29a19402-6248-4f17-a025-637b4214a5ef')" in ddl
    assert "(`__ds__`='2023-01-01-05-02', `region`='us-east-1', `api_name`='AmazonWebService', `__execution_name__`='29a19402-6248-4f17-a025-637b4214a5ef')" in ddl
    assert "(`__ds__`='2023-01-01-05-02', `region`='us-east-1', `api_name`='\"Amazon\"', `__execution_name__`='29a19402-6248-4f17-a025-637b4214a5ef')" in ddl
    with pytest.raises(StopIteration):
        next(response)

    partitioning_info = set()
    partitioning_info.add('__ds__=2023-01-01-05-02/region=us-east-1/api_name=%27Amazon%27/__execution_name__=29a19402-6248-4f17-a025-637b4214a5ef')
    partitioning_info.add('__ds__=2023-01-01-05-02/region=us-east-1/api_name=AmazonWebService/__execution_name__=29a19402-6248-4f17-a025-637b4214a5ef')
    partitioning_info.add('__ds__=2023-01-01-05-02/region=us-east-1/api_name=%22Amazon%22/__execution_name__=29a19402-6248-4f17-a025-637b4214a5ef')
    response = update_partition_ddl_generator(database=database, table=table, partitioning_info=partitioning_info, action='DROP', batch_num=2)
    assert len(list(response)) == 2
 
 