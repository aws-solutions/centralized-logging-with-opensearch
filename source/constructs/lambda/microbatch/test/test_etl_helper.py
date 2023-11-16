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
from test.mock import mock_iam_context, mock_sqs_context, mock_ddb_context, mock_athena_context, mock_sfn_context, default_environment_variables


sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


class TestParameter:
    def test_parameter(self, mock_iam_context, mock_sqs_context, mock_ddb_context, mock_athena_context):
        from etl_helper.lambda_function import Parameters

        staging_bucket_name = os.environ["STAGING_BUCKET_NAME"]
        work_group = os.environ["ATHENA_WORK_GROUP"]
        etl_helper_event = json.loads(os.environ["ETL_LOG_WRITER_EVENT"])
        function_name = os.environ["ETL_LOG_WRITER_FUNCTION_NAME"] 
        ddl_create_database_execution_id = os.environ['DDL_CREATE_DATABASE_EXECUTION_ID']
        
        event = copy.deepcopy(etl_helper_event)
        parameter = event['CreateTmpTable']
        param = Parameters(parameter)
        
        assert param.api == "Athena: StartQueryExecution"
        assert param.parent_task_id == "00000000-0000-0000-0000-000000000000"
        assert param.execution_name == "848be54a-ae2c-414c-9ae3-f0b3d11089ab"
        assert param.state_name == "Step 2.1: Create tmp table in Athena"
        assert param.query_string == parameter['queryString']
        assert param.work_group == work_group
        assert param.output_location == f's3://{staging_bucket_name}/athena-results/'
        assert param.state_machine_name == "LogProcessor-HBTz7GoOjZoz"
        assert param.pipeline_id == "189f73eb-1808-47e4-a9db-ee9c35100abe"
        assert param.task_id == ddl_create_database_execution_id
        assert param.function_name == ''
        assert param.task_token == ''
        assert param.ddb_item['expirationTime'] > datetime.utcnow().timestamp()
        param.ddb_item.pop('expirationTime')
        assert param.ddb_item == {'executionName': '848be54a-ae2c-414c-9ae3-f0b3d11089ab', 'taskId': ddl_create_database_execution_id, 
                                  'API': 'Athena: StartQueryExecution', 'parentTaskId': '00000000-0000-0000-0000-000000000000', 
                                  'pipelineId': '189f73eb-1808-47e4-a9db-ee9c35100abe', 
                                  'stateMachineName': 'LogProcessor-HBTz7GoOjZoz', 'stateName': 'Step 2.1: Create tmp table in Athena', 
                                  'functionName': '', 'data': '', 'startTime': '', 'endTime': '', 'status': '',
                                  'pipelineIndexKey': f'189f73eb-1808-47e4-a9db-ee9c35100abe:LogProcessor-HBTz7GoOjZoz:{ddl_create_database_execution_id}'
                                  }
        
        event = copy.deepcopy(etl_helper_event)
        parameter = event['CreateTmpTable']
        parameter['extra']['functionName'] = function_name
        param = Parameters(parameter)
        
        assert param.api == "Athena: StartQueryExecution"
        assert param.parent_task_id == "00000000-0000-0000-0000-000000000000"
        assert param.execution_name == "848be54a-ae2c-414c-9ae3-f0b3d11089ab"
        assert param.state_name == "Step 2.1: Create tmp table in Athena"
        assert param.query_string == parameter['queryString']
        assert param.work_group == work_group
        assert param.output_location == f's3://{staging_bucket_name}/athena-results/'
        assert param.state_machine_name == "LogProcessor-HBTz7GoOjZoz"
        assert param.pipeline_id == "189f73eb-1808-47e4-a9db-ee9c35100abe"
        assert param.task_id == ddl_create_database_execution_id
        assert param.function_name == function_name
        assert param.task_token == ''
        assert param.ddb_item['expirationTime'] > datetime.utcnow().timestamp()
        param.ddb_item.pop('expirationTime')
        assert param.ddb_item == {'executionName': '848be54a-ae2c-414c-9ae3-f0b3d11089ab', 'taskId': ddl_create_database_execution_id, 
                                  'API': 'Athena: StartQueryExecution', 'parentTaskId': '00000000-0000-0000-0000-000000000000', 
                                  'pipelineId': '189f73eb-1808-47e4-a9db-ee9c35100abe',
                                  'stateMachineName': 'LogProcessor-HBTz7GoOjZoz', 'stateName': 'Step 2.1: Create tmp table in Athena', 
                                  'functionName': function_name, 'data': '', 'startTime': '', 'endTime': '', 'status': '',
                                  'pipelineIndexKey': f'189f73eb-1808-47e4-a9db-ee9c35100abe:LogProcessor-HBTz7GoOjZoz:{ddl_create_database_execution_id}'
                                  }
        
        for required_param in ('API', 'executionName', 'taskId'):
            event = copy.deepcopy(etl_helper_event)
            parameter = event['CreateTmpTable']
            parameter.pop(required_param)
            with pytest.raises(Exception) as exception_info:
                Parameters(parameter)
            assert exception_info.value.args[0] == f'Missing value for {required_param}.'
        
        for required_param in ('Athena: GetQueryExecution', 'Athena: StartQueryExecution', 'DynamoDB: PutItem'):
            event = copy.deepcopy(etl_helper_event)
            parameter = event['CreateTmpTable']
            parameter['API'] = required_param
            param = Parameters(parameter)
            assert param.api == required_param
            assert param.parent_task_id == "00000000-0000-0000-0000-000000000000"
            assert param.execution_name == "848be54a-ae2c-414c-9ae3-f0b3d11089ab"
            assert param.state_name == "Step 2.1: Create tmp table in Athena"
            assert param.state_machine_name == "LogProcessor-HBTz7GoOjZoz"
            assert param.task_id == ddl_create_database_execution_id
            assert param.pipeline_id == "189f73eb-1808-47e4-a9db-ee9c35100abe"
            assert param.function_name == ''
            assert param.task_token == ''
            assert param.ddb_item['expirationTime'] > datetime.utcnow().timestamp()
            param.ddb_item.pop('expirationTime')
            assert param.ddb_item == {'executionName': '848be54a-ae2c-414c-9ae3-f0b3d11089ab', 'taskId': ddl_create_database_execution_id, 
                                    'API': required_param, 'parentTaskId': '00000000-0000-0000-0000-000000000000', 
                                    'pipelineId': '189f73eb-1808-47e4-a9db-ee9c35100abe', 
                                    'stateMachineName': 'LogProcessor-HBTz7GoOjZoz', 'stateName': 'Step 2.1: Create tmp table in Athena', 
                                    'functionName': '', 'data': '', 'startTime': '', 'endTime': '', 'status': '',
                                    'pipelineIndexKey': f'189f73eb-1808-47e4-a9db-ee9c35100abe:LogProcessor-HBTz7GoOjZoz:{ddl_create_database_execution_id}'
                                    }
        
        for required_param in ('queryString', 'workGroup', 'outputLocation'):
            event = copy.deepcopy(etl_helper_event)
            parameter = event['CreateTmpTable']
            parameter['API'] = 'Athena: StartQueryExecution'
            parameter.pop(required_param, None)
            with pytest.raises(Exception) as exception_info:
                Parameters(parameter)
            assert exception_info.value.args[0] == f'API: "Athena: StartQueryExecution", missing required parameter: {required_param}'
        
        event = copy.deepcopy(etl_helper_event)
        parameter = event['CreateTmpTable']
        parameter['API'] = 'do not supported API'
        with pytest.raises(Exception) as exception_info:
            Parameters(parameter)
        assert exception_info.value.args[0] == 'Invalid API parameter, optional value: Athena: StartQueryExecution, Athena: GetQueryExecution, DynamoDB: PutItem.'

        event = copy.deepcopy(etl_helper_event)
        parameter = event['CreateTmpTable']
        parameter.pop('extra')
        param = Parameters(parameter)
        assert param.api == 'Athena: StartQueryExecution'
        assert param.parent_task_id == ''
        assert param.execution_name == '848be54a-ae2c-414c-9ae3-f0b3d11089ab'
        assert param.state_name == ''
        assert param.state_machine_name == ''
        assert param.task_id == ddl_create_database_execution_id
        assert param.pipeline_id == ''
        assert param.function_name == ''
        assert param.task_token == ''
        assert param.ddb_item['expirationTime'] > datetime.utcnow().timestamp()
        param.ddb_item.pop('expirationTime')
        assert param.ddb_item == {'executionName': '848be54a-ae2c-414c-9ae3-f0b3d11089ab', 'taskId': ddl_create_database_execution_id, 
                                  'API': 'Athena: StartQueryExecution', 'functionName': '', 'data': '', 'startTime': '', 'endTime': '', 
                                  'status': '',
                                  'pipelineIndexKey': f'::{ddl_create_database_execution_id}'
                                  }

        event = copy.deepcopy(etl_helper_event)
        parameter = event['CreateTmpTable']
        parameter['extra'] = 'test'
        parameter.pop('taskToken')
        param = Parameters(parameter)
        assert param.api == 'Athena: StartQueryExecution'
        assert param.parent_task_id == ''
        assert param.execution_name == '848be54a-ae2c-414c-9ae3-f0b3d11089ab'
        assert param.state_name == ''
        assert param.state_machine_name == ''
        assert param.task_id == ddl_create_database_execution_id
        assert param.pipeline_id == ''
        assert param.function_name == ''
        assert param.task_token == ''
        assert param.ddb_item['expirationTime'] > datetime.utcnow().timestamp()
        param.ddb_item.pop('expirationTime')
        assert param.ddb_item == {'executionName': '848be54a-ae2c-414c-9ae3-f0b3d11089ab', 'taskId': ddl_create_database_execution_id, 
                                  'API': 'Athena: StartQueryExecution', 'functionName': '', 'data': '', 'startTime': '', 'endTime': '', 
                                  'status': '',
                                  'pipelineIndexKey': f'::{ddl_create_database_execution_id}'
                                  }

        event = copy.deepcopy(etl_helper_event)
        parameter = event['CreateTmpTable']
        parameter['API'] = 'do not supported API'
        with pytest.raises(Exception) as exception_info:
            Parameters(parameter)
        assert exception_info.value.args[0] == 'Invalid API parameter, optional value: Athena: StartQueryExecution, Athena: GetQueryExecution, DynamoDB: PutItem.'

        event = copy.deepcopy(etl_helper_event)
        parameter = event['CreateTmpTable']
        parameter['API'] = 'Athena: GetQueryExecution'
        param = Parameters(parameter)
        assert param.api == 'Athena: GetQueryExecution'
        assert param.parent_task_id == "00000000-0000-0000-0000-000000000000"
        assert param.execution_name == "848be54a-ae2c-414c-9ae3-f0b3d11089ab"
        assert param.state_name == "Step 2.1: Create tmp table in Athena"
        assert param.state_machine_name == "LogProcessor-HBTz7GoOjZoz"
        assert param.task_id == ddl_create_database_execution_id
        assert param.pipeline_id == "189f73eb-1808-47e4-a9db-ee9c35100abe"
        assert param.function_name == ''
        assert param.task_token == ''
        assert param.ddb_item['expirationTime'] > datetime.utcnow().timestamp()
        param.ddb_item.pop('expirationTime')
        assert param.ddb_item == {'executionName': '848be54a-ae2c-414c-9ae3-f0b3d11089ab', 'taskId': ddl_create_database_execution_id, 
                                'API': 'Athena: GetQueryExecution', 'parentTaskId': '00000000-0000-0000-0000-000000000000', 
                                'pipelineId': '189f73eb-1808-47e4-a9db-ee9c35100abe',  
                                'stateMachineName': 'LogProcessor-HBTz7GoOjZoz', 'stateName': 'Step 2.1: Create tmp table in Athena', 
                                'functionName': '', 'data': '', 'startTime': '', 'endTime': '', 'status': '',
                                'pipelineIndexKey': f'189f73eb-1808-47e4-a9db-ee9c35100abe:LogProcessor-HBTz7GoOjZoz:{ddl_create_database_execution_id}'
                                }
        with pytest.raises(Exception) as exception_info:
                param.query_string
        assert exception_info.value.args[0] == "'Parameters' object has no attribute 'query_string'"
        with pytest.raises(Exception) as exception_info:
                param.work_group
        assert exception_info.value.args[0] == "'Parameters' object has no attribute 'work_group'"
        with pytest.raises(Exception) as exception_info:
                param.output_location
        assert exception_info.value.args[0] == "'Parameters' object has no attribute 'output_location'"
        
        event = copy.deepcopy(etl_helper_event)
        parameter = event['CreateTmpTable']
        parameter['API'] = 'DynamoDB: PutItem'
        param = Parameters(parameter)
        assert param.api == 'DynamoDB: PutItem'
        assert param.parent_task_id == "00000000-0000-0000-0000-000000000000"
        assert param.execution_name == "848be54a-ae2c-414c-9ae3-f0b3d11089ab"
        assert param.state_name == "Step 2.1: Create tmp table in Athena"
        assert param.state_machine_name == "LogProcessor-HBTz7GoOjZoz"
        assert param.task_id == ddl_create_database_execution_id
        assert param.pipeline_id == "189f73eb-1808-47e4-a9db-ee9c35100abe"
        assert param.function_name == ''
        assert param.task_token == ''
        assert param.ddb_item['expirationTime'] > datetime.utcnow().timestamp()
        param.ddb_item.pop('expirationTime')
        assert param.ddb_item == {'executionName': '848be54a-ae2c-414c-9ae3-f0b3d11089ab', 'taskId': ddl_create_database_execution_id, 
                                'API': 'DynamoDB: PutItem', 'parentTaskId': '00000000-0000-0000-0000-000000000000', 
                                'pipelineId': '189f73eb-1808-47e4-a9db-ee9c35100abe', 
                                'stateMachineName': 'LogProcessor-HBTz7GoOjZoz', 'stateName': 'Step 2.1: Create tmp table in Athena', 
                                'functionName': '', 'data': '', 'startTime': '', 'endTime': '', 'status': '',
                                'pipelineIndexKey': f'189f73eb-1808-47e4-a9db-ee9c35100abe:LogProcessor-HBTz7GoOjZoz:{ddl_create_database_execution_id}'
                                }
        with pytest.raises(Exception) as exception_info:
                param.query_string
        assert exception_info.value.args[0] == "'Parameters' object has no attribute 'query_string'"
        with pytest.raises(Exception) as exception_info:
                param.work_group
        assert exception_info.value.args[0] == "'Parameters' object has no attribute 'work_group'"
        with pytest.raises(Exception) as exception_info:
                param.output_location
        assert exception_info.value.args[0] == "'Parameters' object has no attribute 'output_location'"
        

def mock_boto3_api_call(self, operation_name, kwarg):
    from botocore.exceptions import ClientError
    
    if operation_name == 'StartQueryExecution':
        if kwarg['QueryString'] == 'Not a SQL':
            raise ClientError(error_response={'Error': {'Code': '400', 'Message': 'Error Query String.'}}, operation_name=operation_name)
    elif operation_name in ('SendTaskHeartbeat', 'SendTaskSuccess', 'SendTaskFailure'):
        return {}
     
def test_lambda_handler(mock_iam_context, mock_sqs_context, mock_ddb_context, mock_athena_context, mock_sfn_context):
    from etl_helper.lambda_function import lambda_handler, AWS_DDB_ETL_LOG
    from unittest.mock import patch

    etl_helper_event = json.loads(os.environ["ETL_LOG_WRITER_EVENT"])
    function_name = os.environ["ETL_LOG_WRITER_FUNCTION_NAME"] 
    ddl_create_database_execution_id = os.environ['DDL_CREATE_DATABASE_EXECUTION_ID']

    context = types.SimpleNamespace()
    context.function_name = function_name
    
    event = copy.deepcopy(etl_helper_event['CreateTmpTable'])
    execution_name = event['executionName']
    lambda_handler(event, context)
    
    response = AWS_DDB_ETL_LOG.get(execution_name=execution_name, task_id=ddl_create_database_execution_id)
    assert response['API'] == "Athena: StartQueryExecution"
    assert response['parentTaskId'] == "00000000-0000-0000-0000-000000000000"
    assert response['executionName'] == execution_name
    assert response['functionName'] == function_name
    assert response['stateName'] == "Step 2.1: Create tmp table in Athena"
    assert response['stateMachineName'] == "LogProcessor-HBTz7GoOjZoz"
    assert response['taskId'] == ddl_create_database_execution_id
    assert response['data'] == event['queryString']
    assert response['startTime'] is not None
    assert response['status'] == 'Succeeded'
    assert response['pipelineId'] == "189f73eb-1808-47e4-a9db-ee9c35100abe"
    
    # mock a start query execution return exception.
    event = copy.deepcopy(etl_helper_event['CreateTmpTable'])
    event['queryString'] = 'Not a SQL'
    with patch('botocore.client.BaseClient._make_api_call', new=mock_boto3_api_call):
        lambda_handler(event, context)
    
    event = copy.deepcopy(etl_helper_event['CreateTmpTable'])
    event['API'] = "Athena: GetQueryExecution"
    execution_name = event['executionName']
    lambda_handler(event, context)
    
    response = AWS_DDB_ETL_LOG.get(execution_name=execution_name, task_id=ddl_create_database_execution_id)
    assert response['API'] == "Athena: GetQueryExecution"
    assert response['parentTaskId'] == "00000000-0000-0000-0000-000000000000"
    assert response['executionName'] == execution_name
    assert response['functionName'] == function_name
    assert response['stateName'] == "Step 2.1: Create tmp table in Athena"
    assert response['stateMachineName'] == "LogProcessor-HBTz7GoOjZoz"
    assert response['taskId'] == ddl_create_database_execution_id
    assert response['data'] == event['queryString']
    assert response['startTime'] is not None
    assert response['status'] == 'Succeeded'
    assert response['pipelineId'] == "189f73eb-1808-47e4-a9db-ee9c35100abe"
    
    event = copy.deepcopy(etl_helper_event['CreateTmpTable'])
    event['API'] = "Athena: GetQueryExecution"
    execution_name = event['executionName']
    lambda_handler(event, context)
    
    response = AWS_DDB_ETL_LOG.get(execution_name=execution_name, task_id=ddl_create_database_execution_id)
    assert response['API'] == "Athena: GetQueryExecution"
    assert response['parentTaskId'] == "00000000-0000-0000-0000-000000000000"
    assert response['executionName'] == execution_name
    assert response['functionName'] == function_name
    assert response['stateName'] == "Step 2.1: Create tmp table in Athena"
    assert response['stateMachineName'] == "LogProcessor-HBTz7GoOjZoz"
    assert response['taskId'] == ddl_create_database_execution_id
    assert response['data'] == event['queryString']
    assert response['startTime'] is not None
    assert response['status'] == 'Succeeded'
    assert response['pipelineId'] == "189f73eb-1808-47e4-a9db-ee9c35100abe"
    
    event = copy.deepcopy(etl_helper_event['CreateTmpTable'])
    event['API'] = "DynamoDB: PutItem"
    execution_name = event['executionName']
    lambda_handler(event, context)
    
    response = AWS_DDB_ETL_LOG.get(execution_name=execution_name, task_id=ddl_create_database_execution_id)
    assert response['API'] == "DynamoDB: PutItem"
    assert response['parentTaskId'] == "00000000-0000-0000-0000-000000000000"
    assert response['executionName'] == execution_name
    assert response['functionName'] == function_name
    assert response['stateName'] == "Step 2.1: Create tmp table in Athena"
    assert response['stateMachineName'] == "LogProcessor-HBTz7GoOjZoz"
    assert response['taskId'] == ddl_create_database_execution_id
    assert response['data'] == ''
    assert response['startTime'] is not None
    assert response['endTime'] is not None
    assert response['status'] == ''
    assert response['pipelineId'] == "189f73eb-1808-47e4-a9db-ee9c35100abe"
    
    event = copy.deepcopy(etl_helper_event['CreateTmpTable'])
    event['API'] = "DynamoDB: PutItem"
    event['extra']['data'] = event['queryString']
    event['extra']['status'] = 'Failed'
    execution_name = event['executionName']
    lambda_handler(event, context)
    
    response = AWS_DDB_ETL_LOG.get(execution_name=execution_name, task_id=ddl_create_database_execution_id)
    assert response['API'] == "DynamoDB: PutItem"
    assert response['parentTaskId'] == "00000000-0000-0000-0000-000000000000"
    assert response['executionName'] == execution_name
    assert response['functionName'] == function_name
    assert response['stateName'] == "Step 2.1: Create tmp table in Athena"
    assert response['stateMachineName'] == "LogProcessor-HBTz7GoOjZoz"
    assert response['taskId'] == ddl_create_database_execution_id
    assert response['data'] == event['queryString']
    assert response['startTime'] is not None
    assert response['endTime'] is not None
    assert response['status'] == 'Failed'
    assert response['pipelineId'] == "189f73eb-1808-47e4-a9db-ee9c35100abe"
    
    event = copy.deepcopy(etl_helper_event['CreateTmpTable'])
    event['API'] = 'do not supported API'
    with pytest.raises(Exception) as exception_info:
        lambda_handler(event, context)
    assert exception_info.value.args[0] == 'Invalid API parameter, optional value: Athena: StartQueryExecution, Athena: GetQueryExecution, DynamoDB: PutItem.'

    event = "test event is a string"
    with pytest.raises(Exception) as exception_info:
        lambda_handler(event, context)
    assert exception_info.value.args[0] == 'The event is not a dict.'


def test_get_item_from_execution_id(mock_iam_context, mock_sqs_context, mock_ddb_context, mock_athena_context):
    from etl_helper.lambda_function import Parameters, get_item_from_execution_id, AWS_ATHENA, AWS_DDB_ETL_LOG

    etl_helper_event = json.loads(os.environ["ETL_LOG_WRITER_EVENT"])
    function_name = os.environ["ETL_LOG_WRITER_FUNCTION_NAME"] 
    ddl_create_database_execution_id = os.environ['DDL_CREATE_DATABASE_EXECUTION_ID']

    context = types.SimpleNamespace()
    context.function_name = function_name
    
    event = copy.deepcopy(etl_helper_event['CreateTmpTable'])
    event['API'] = "Athena: GetQueryExecution"
    event['extra']['functionName'] = function_name
    execution_name = event['executionName']
    param = Parameters(event)
    ddb_item = param.ddb_item
    
    response = get_item_from_execution_id(query_execution_id=ddl_create_database_execution_id, item=ddb_item)
    assert response['API'] == "Athena: GetQueryExecution"
    assert response['parentTaskId'] == "00000000-0000-0000-0000-000000000000"
    assert response['executionName'] == execution_name
    assert response['functionName'] == function_name
    assert response['stateName'] == "Step 2.1: Create tmp table in Athena"
    assert response['stateMachineName'] == "LogProcessor-HBTz7GoOjZoz"
    assert response['taskId'] == ddl_create_database_execution_id
    assert response['data'] == event['queryString']
    assert response['startTime'] is not None
    # assert response['endTime'] is not None
    assert response['status'] == 'Succeeded'
    assert response['pipelineId'] == "189f73eb-1808-47e4-a9db-ee9c35100abe"
    
    event = copy.deepcopy(etl_helper_event['CreateTmpTable'])
    event['taskId'] = str(uuid.uuid4())
    event['API'] = "Athena: GetQueryExecution"
    event['extra']['functionName'] = function_name
    execution_name = event['executionName']
    param = Parameters(event)
    ddb_item = param.ddb_item
    
    response = get_item_from_execution_id(query_execution_id=event['taskId'], item=ddb_item)
    assert response['API'] == "Athena: GetQueryExecution"
    assert response['parentTaskId'] == "00000000-0000-0000-0000-000000000000"
    assert response['executionName'] == execution_name
    assert response['functionName'] == function_name
    assert response['stateName'] == "Step 2.1: Create tmp table in Athena"
    assert response['stateMachineName'] == "LogProcessor-HBTz7GoOjZoz"
    assert response['taskId'] == event['taskId']
    assert response['data'] == ''
    assert response['startTime'] is not None
    assert response['endTime'] is not None
    assert response['status'] == 'Failed'
    assert response['pipelineId'] == "189f73eb-1808-47e4-a9db-ee9c35100abe"
    
        
def test_write_logs_to_ddb(mock_iam_context, mock_sqs_context, mock_ddb_context, mock_athena_context, mock_sfn_context):
    from unittest.mock import patch
    from etl_helper.lambda_function import Parameters, write_logs_to_ddb, AWS_ATHENA, AWS_DDB_ETL_LOG

    etl_helper_event = json.loads(os.environ["ETL_LOG_WRITER_EVENT"])
    function_name = os.environ["ETL_LOG_WRITER_FUNCTION_NAME"] 
    ddl_create_database_execution_id = os.environ['DDL_CREATE_DATABASE_EXECUTION_ID']

    context = types.SimpleNamespace()
    context.function_name = function_name
    
    event = copy.deepcopy(etl_helper_event['CreateTmpTable'])
    event['extra']['functionName'] = function_name
    execution_name = event['executionName']
    param = Parameters(event)
    ddb_item = param.ddb_item
    
    write_logs_to_ddb(execution_name=param.execution_name, task_id=param.task_id, item=ddb_item, task_token='')
    response = AWS_DDB_ETL_LOG.get(execution_name=execution_name, task_id=param.task_id)
    assert response['API'] == "Athena: StartQueryExecution"
    assert response['parentTaskId'] == "00000000-0000-0000-0000-000000000000"
    assert response['executionName'] == "848be54a-ae2c-414c-9ae3-f0b3d11089ab"
    assert response['functionName'] == function_name
    assert response['stateName'] == "Step 2.1: Create tmp table in Athena"
    assert response['stateMachineName'] == "LogProcessor-HBTz7GoOjZoz"
    assert response['taskId'] == ddl_create_database_execution_id
    assert response['startTime'] is not None
    assert response['pipelineId'] == "189f73eb-1808-47e4-a9db-ee9c35100abe"
    
    event = copy.deepcopy(etl_helper_event['CreateTmpTable'])
    event['extra']['functionName'] = function_name
    execution_name = event['executionName']
    param = Parameters(event)
    ddb_item = param.ddb_item
    ddb_item['status'] = 'Succeeded'
    
    write_logs_to_ddb(execution_name=param.execution_name, task_id=param.task_id, item=ddb_item, task_token=param.task_token)
    response = AWS_DDB_ETL_LOG.get(execution_name=execution_name, task_id=param.task_id)
    assert response['API'] == "Athena: StartQueryExecution"
    assert response['parentTaskId'] == "00000000-0000-0000-0000-000000000000"
    assert response['executionName'] == "848be54a-ae2c-414c-9ae3-f0b3d11089ab"
    assert response['functionName'] == function_name
    assert response['stateName'] == "Step 2.1: Create tmp table in Athena"
    assert response['stateMachineName'] == "LogProcessor-HBTz7GoOjZoz"
    assert response['taskId'] == ddl_create_database_execution_id
    assert response['startTime'] is not None
    assert response['status'] == 'Succeeded'
    assert response['pipelineId'] == "189f73eb-1808-47e4-a9db-ee9c35100abe"
    
    event = copy.deepcopy(etl_helper_event['CreateTmpTable'])
    event['extra']['functionName'] = function_name
    execution_name = event['executionName']
    param = Parameters(event)
    ddb_item = param.ddb_item
    ddb_item['status'] = 'Failed'
    
    write_logs_to_ddb(execution_name=param.execution_name, task_id=param.task_id, item=ddb_item, task_token=param.task_token)
    response = AWS_DDB_ETL_LOG.get(execution_name=execution_name, task_id=param.task_id)
    assert response['API'] == "Athena: StartQueryExecution"
    assert response['parentTaskId'] == "00000000-0000-0000-0000-000000000000"
    assert response['executionName'] == "848be54a-ae2c-414c-9ae3-f0b3d11089ab"
    assert response['functionName'] == function_name
    assert response['stateName'] == "Step 2.1: Create tmp table in Athena"
    assert response['stateMachineName'] == "LogProcessor-HBTz7GoOjZoz"
    assert response['taskId'] == ddl_create_database_execution_id
    assert response['startTime'] is not None
    assert response['status'] == 'Failed'
    assert response['pipelineId'] == "189f73eb-1808-47e4-a9db-ee9c35100abe"
    
    event = copy.deepcopy(etl_helper_event['CreateTmpTable'])
    event['taskToken'] = 'AQCEAAAAKgAAAAMAAAAA'
    event['extra']['functionName'] = function_name
    execution_name = event['executionName']
    param = Parameters(event)
    ddb_item = param.ddb_item
    ddb_item['status'] = 'Failed'
    
    with patch('botocore.client.BaseClient._make_api_call', new=mock_boto3_api_call):
        write_logs_to_ddb(execution_name=param.execution_name, task_id=param.task_id, item=ddb_item, task_token=param.task_token)
        
    
    