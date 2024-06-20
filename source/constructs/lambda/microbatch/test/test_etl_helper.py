# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import os
import sys
import copy
import uuid
import json
import types
import pytest
import datetime
from test.mock import mock_iam_context, mock_sqs_context, mock_ddb_context, mock_athena_context, mock_sfn_context, mock_s3_context, default_environment_variables


sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.append(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'etl_helper'))


class TestParameter:
    def test_parameter(self, mock_iam_context, mock_sqs_context, mock_ddb_context, mock_athena_context, mock_s3_context):
        from etl_helper.lambda_function import Parameters, API

        staging_bucket_name = os.environ["STAGING_BUCKET_NAME"]
        work_group = os.environ["ATHENA_WORK_GROUP"]
        etl_helper_event = json.loads(os.environ["ETL_LOG_WRITER_EVENT"])
        function_name = os.environ["ETL_LOG_WRITER_FUNCTION_NAME"] 
        ddl_create_database_execution_id = os.environ['DDL_CREATE_DATABASE_EXECUTION_ID']
        account_id = os.environ["ACCOUNT_ID"]
        database = os.environ["CENTRALIZED_DATABASE"] 
        table = os.environ["ATHENA_TABLE_NAME"]
        output_location = os.environ["ATHENA_OUTPUT_LOCATION"]
        
        event = copy.deepcopy(etl_helper_event)
        parameter = event['CreateTmpTable']
        param = Parameters(parameter)
        
        assert param.api == "Athena: StartQueryExecution"
        assert param.parent_task_id == "00000000-0000-0000-0000-000000000000"
        assert param.execution_name == "848be54a-ae2c-414c-9ae3-f0b3d11089ab"
        assert param.state_name == "Step 2.1: Create tmp table in Athena"
        assert param.parameters.query_string == parameter['parameters']['queryString']
        assert param.parameters.work_group == work_group
        assert param.parameters.output_location == f's3://{staging_bucket_name}/athena-results/'
        assert param.state_machine_name == "LogProcessor-HBTz7GoOjZoz"
        assert param.pipeline_id == "189f73eb-1808-47e4-a9db-ee9c35100abe"
        assert param.task_id == ddl_create_database_execution_id
        assert param.function_name == ''
        assert param.task_token == ''
        assert param.ddb_item['expirationTime'] > datetime.datetime.now(datetime.UTC).timestamp()
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
        assert param.parameters.query_string == parameter['parameters']['queryString']
        assert param.parameters.work_group == work_group
        assert param.parameters.output_location == f's3://{staging_bucket_name}/athena-results/'
        assert param.state_machine_name == "LogProcessor-HBTz7GoOjZoz"
        assert param.pipeline_id == "189f73eb-1808-47e4-a9db-ee9c35100abe"
        assert param.task_id == ddl_create_database_execution_id
        assert param.function_name == function_name
        assert param.task_token == ''
        assert param.ddb_item['expirationTime'] > datetime.datetime.now(datetime.UTC).timestamp()
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
        
        for required_param in list(API.__members__.values()):
            event = copy.deepcopy(etl_helper_event)
            parameter = event['CreateTmpTable']
            parameter['API'] = required_param
            parameter['parameters']['queryExecutionId'] = ddl_create_database_execution_id
            parameter['parameters']['database'] = database
            parameter['parameters']['tableName'] = table
            parameter['parameters']['location'] = f's3://{staging_bucket_name}/AWSLogs/{account_id}/centralized/aws_apigateway_logs_parquet/'
            parameter['parameters']['partitionPrefix'] = '__ds__=2023-03-11'
            parameter['parameters']['workGroup'] = work_group
            parameter['parameters']['outputLocation'] = output_location
            parameter['parameters']['dateString'] = '2024-06-01'
            parameter['parameters']['format'] = '%Y-%m-%d'
            parameter['parameters']['intervalDays'] = -7
            parameter['parameters']['input'] = {
                'metadata': {
                    's3': {
                        'archivePath': 's3://staging-bucket/archive'
                        }, 
                    'athena': {
                        'statements': {
                            'create': 'create table src;',
                            'insert': 'insert into dest select * from src;',
                            'drop': 'drop table src',
                            'aggregate': []
                        }
                    }
                }
            }
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
            assert param.ddb_item['expirationTime'] > datetime.datetime.now(datetime.UTC).timestamp()
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
            parameter['parameters'].pop(required_param, None)
            with pytest.raises(Exception) as exception_info:
                Parameters(parameter)
            assert exception_info.value.args[0] == f'Missing value for parameters.{required_param}.'
        
        event = copy.deepcopy(etl_helper_event)
        parameter = event['CreateTmpTable']
        parameter['API'] = 'do not supported API'
        with pytest.raises(Exception) as exception_info:
            Parameters(parameter)
        assert exception_info.value.args[0] == f'Invalid API parameter, optional value: {", ".join(list(API.__members__.values()))}.'

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
        assert param.ddb_item['expirationTime'] > datetime.datetime.now(datetime.UTC).timestamp()
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
        assert param.ddb_item['expirationTime'] > datetime.datetime.now(datetime.UTC).timestamp()
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
        assert exception_info.value.args[0] == f'Invalid API parameter, optional value: {", ".join(list(API.__members__.values()))}.'

        event = copy.deepcopy(etl_helper_event)
        parameter = event['CreateTmpTable']
        parameter['API'] = 'Athena: GetQueryExecution'
        parameter['parameters']['queryExecutionId'] = ddl_create_database_execution_id
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
        assert param.ddb_item['expirationTime'] > datetime.datetime.now(datetime.UTC).timestamp()
        param.ddb_item.pop('expirationTime')
        assert param.ddb_item == {'executionName': '848be54a-ae2c-414c-9ae3-f0b3d11089ab', 'taskId': ddl_create_database_execution_id, 
                                'API': 'Athena: GetQueryExecution', 'parentTaskId': '00000000-0000-0000-0000-000000000000', 
                                'pipelineId': '189f73eb-1808-47e4-a9db-ee9c35100abe',  
                                'stateMachineName': 'LogProcessor-HBTz7GoOjZoz', 'stateName': 'Step 2.1: Create tmp table in Athena', 
                                'functionName': '', 'data': '', 'startTime': '', 'endTime': '', 'status': '',
                                'pipelineIndexKey': f'189f73eb-1808-47e4-a9db-ee9c35100abe:LogProcessor-HBTz7GoOjZoz:{ddl_create_database_execution_id}'
                                }
        assert param.parameters.query_execution_id == ddl_create_database_execution_id
        with pytest.raises(Exception) as exception_info:
            param.parameters.query_string
        assert exception_info.value.args[0] == "'types.SimpleNamespace' object has no attribute 'query_string'"
        with pytest.raises(Exception) as exception_info:
            param.parameters.work_group
        assert exception_info.value.args[0] == "'types.SimpleNamespace' object has no attribute 'work_group'"
        with pytest.raises(Exception) as exception_info:
            param.parameters.output_location
        assert exception_info.value.args[0] == "'types.SimpleNamespace' object has no attribute 'output_location'"
        
        event = copy.deepcopy(etl_helper_event)
        parameter = event['CreateTmpTable']
        parameter['API'] = 'Athena: BatchUpdatePartition'
        parameter['parameters']['database'] = database
        parameter['parameters']['tableName'] = table
        parameter['parameters']['location'] = f's3://{staging_bucket_name}/AWSLogs/{account_id}/centralized/aws_apigateway_logs_parquet/'
        parameter['parameters']['partitionPrefix'] = '__ds__=2023-03-11'
        parameter['parameters']['workGroup'] = work_group
        parameter['parameters']['outputLocation'] = output_location
        param = Parameters(parameter)
        assert param.api == 'Athena: BatchUpdatePartition'
        assert param.parent_task_id == "00000000-0000-0000-0000-000000000000"
        assert param.execution_name == "848be54a-ae2c-414c-9ae3-f0b3d11089ab"
        assert param.state_name == "Step 2.1: Create tmp table in Athena"
        assert param.state_machine_name == "LogProcessor-HBTz7GoOjZoz"
        assert param.task_id == ddl_create_database_execution_id
        assert param.pipeline_id == "189f73eb-1808-47e4-a9db-ee9c35100abe"
        assert param.function_name == ''
        assert param.task_token == ''
        assert param.ddb_item['expirationTime'] > datetime.datetime.now(datetime.UTC).timestamp()
        param.ddb_item.pop('expirationTime')
        assert param.ddb_item == {'executionName': '848be54a-ae2c-414c-9ae3-f0b3d11089ab', 'taskId': ddl_create_database_execution_id, 
                                'API': 'Athena: BatchUpdatePartition', 'parentTaskId': '00000000-0000-0000-0000-000000000000', 
                                'pipelineId': '189f73eb-1808-47e4-a9db-ee9c35100abe', 
                                'stateMachineName': 'LogProcessor-HBTz7GoOjZoz', 'stateName': 'Step 2.1: Create tmp table in Athena', 
                                'functionName': '', 'data': '', 'startTime': '', 'endTime': '', 'status': '',
                                'pipelineIndexKey': f'189f73eb-1808-47e4-a9db-ee9c35100abe:LogProcessor-HBTz7GoOjZoz:{ddl_create_database_execution_id}'
                                }
        assert param.parameters.action == 'ADD'
        assert param.parameters.database == database
        assert param.parameters.table_name == table
        assert param.parameters.location.bucket == staging_bucket_name
        assert param.parameters.location.prefix == f'AWSLogs/{account_id}/centralized/aws_apigateway_logs_parquet'
        assert param.parameters.partition_prefix == '__ds__=2023-03-11'
        assert param.parameters.work_group == work_group
        assert param.parameters.output_location == output_location
        parameter['parameters']['action'] = 'DROP'
        param = Parameters(parameter)
        assert param.parameters.action == 'DROP'
        
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
        assert param.ddb_item['expirationTime'] > datetime.datetime.now(datetime.UTC).timestamp()
        param.ddb_item.pop('expirationTime')
        assert param.ddb_item == {'executionName': '848be54a-ae2c-414c-9ae3-f0b3d11089ab', 'taskId': ddl_create_database_execution_id, 
                                'API': 'DynamoDB: PutItem', 'parentTaskId': '00000000-0000-0000-0000-000000000000', 
                                'pipelineId': '189f73eb-1808-47e4-a9db-ee9c35100abe', 
                                'stateMachineName': 'LogProcessor-HBTz7GoOjZoz', 'stateName': 'Step 2.1: Create tmp table in Athena', 
                                'functionName': '', 'data': '', 'startTime': '', 'endTime': '', 'status': '',
                                'pipelineIndexKey': f'189f73eb-1808-47e4-a9db-ee9c35100abe:LogProcessor-HBTz7GoOjZoz:{ddl_create_database_execution_id}'
                                }
        with pytest.raises(Exception) as exception_info:
            param.parameters.query_string
        assert exception_info.value.args[0] == "'types.SimpleNamespace' object has no attribute 'query_string'"
        with pytest.raises(Exception) as exception_info:
            param.parameters.work_group
        assert exception_info.value.args[0] == "'types.SimpleNamespace' object has no attribute 'work_group'"
        with pytest.raises(Exception) as exception_info:
            param.parameters.output_location
        assert exception_info.value.args[0] == "'types.SimpleNamespace' object has no attribute 'output_location'"
        
        event = copy.deepcopy(etl_helper_event)
        parameter = event['CreateTmpTable']
        parameter['API'] = "Step Functions: ExecutionInputFormatter"
        parameter['parameters'] = {
            'input': {
                'metadata': {
                    's3': {
                        'archivePath': 's3://staging-bucket/archive'
                        }, 
                    'athena': {
                        'statements': {
                            'create': 'create table src;',
                            'insert': 'insert into dest select * from src;',
                            'drop': 'drop table src',
                            'aggregate': []
                        }
                    }
                }
            }
        }
        param = Parameters(parameter)
        assert param.api == "Step Functions: ExecutionInputFormatter"
        assert param.parameters.input == parameter['parameters']['input']
        assert param.parent_task_id == "00000000-0000-0000-0000-000000000000"
        assert param.execution_name == "848be54a-ae2c-414c-9ae3-f0b3d11089ab"
        assert param.state_name == "Step 2.1: Create tmp table in Athena"
        assert param.state_machine_name == "LogProcessor-HBTz7GoOjZoz"
        assert param.task_id == ddl_create_database_execution_id
        assert param.pipeline_id == "189f73eb-1808-47e4-a9db-ee9c35100abe"
        assert param.function_name == ''
        assert param.task_token == ''
        assert param.ddb_item['expirationTime'] > datetime.datetime.now(datetime.UTC).timestamp()
        param.ddb_item.pop('expirationTime')
        assert param.ddb_item == {'executionName': '848be54a-ae2c-414c-9ae3-f0b3d11089ab', 'taskId': ddl_create_database_execution_id, 
                                'API': 'Step Functions: ExecutionInputFormatter', 'parentTaskId': '00000000-0000-0000-0000-000000000000', 
                                'pipelineId': '189f73eb-1808-47e4-a9db-ee9c35100abe', 
                                'stateMachineName': 'LogProcessor-HBTz7GoOjZoz', 'stateName': 'Step 2.1: Create tmp table in Athena', 
                                'functionName': '', 'data': '', 'startTime': '', 'endTime': '', 'status': '',
                                'pipelineIndexKey': f'189f73eb-1808-47e4-a9db-ee9c35100abe:LogProcessor-HBTz7GoOjZoz:{ddl_create_database_execution_id}'
                                }

        event = copy.deepcopy(etl_helper_event)
        parameter = event['CreateTmpTable']
        parameter['API'] = "ETL: DateTransform"
        parameter['parameters'] = {
            'dateString': '2024-05-01',
            'format': '%Y-%m-%d',
            'intervalDays': -7,
        }
        param = Parameters(parameter)
        assert param.api == "ETL: DateTransform"
        assert param.parent_task_id == "00000000-0000-0000-0000-000000000000"
        assert param.execution_name == "848be54a-ae2c-414c-9ae3-f0b3d11089ab"
        assert param.state_name == "Step 2.1: Create tmp table in Athena"
        assert param.state_machine_name == "LogProcessor-HBTz7GoOjZoz"
        assert param.task_id == ddl_create_database_execution_id
        assert param.pipeline_id == "189f73eb-1808-47e4-a9db-ee9c35100abe"
        assert param.function_name == ''
        assert param.task_token == ''
        assert param.parameters.date_string == '2024-05-01'
        assert param.parameters.format == '%Y-%m-%d'
        assert param.parameters.interval_days == -7
        assert param.ddb_item['expirationTime'] > datetime.datetime.now(datetime.UTC).timestamp()
        param.ddb_item.pop('expirationTime')
        assert param.ddb_item == {'executionName': '848be54a-ae2c-414c-9ae3-f0b3d11089ab', 'taskId': ddl_create_database_execution_id, 
                                'API': 'ETL: DateTransform', 'parentTaskId': '00000000-0000-0000-0000-000000000000', 
                                'pipelineId': '189f73eb-1808-47e4-a9db-ee9c35100abe', 
                                'stateMachineName': 'LogProcessor-HBTz7GoOjZoz', 'stateName': 'Step 2.1: Create tmp table in Athena', 
                                'functionName': '', 'data': '', 'startTime': '', 'endTime': '', 'status': '',
                                'pipelineIndexKey': f'189f73eb-1808-47e4-a9db-ee9c35100abe:LogProcessor-HBTz7GoOjZoz:{ddl_create_database_execution_id}'
                                }
    
    def test_api_start_query_execution_parameter_check(self, mock_iam_context, mock_sqs_context, mock_ddb_context, mock_athena_context):
        from etl_helper.lambda_function import Parameters

        etl_helper_event = json.loads(os.environ["ETL_LOG_WRITER_EVENT"])
        work_group = os.environ["ATHENA_WORK_GROUP"]
        output_location = os.environ["ATHENA_OUTPUT_LOCATION"]
        
        api_start_query_execution_event = {
            "API": "Athena: StartQueryExecution",
            "executionName": str(uuid.uuid4()),
            "taskId": str(uuid.uuid4()),
            "parameters": {
                "queryString": "CREATE TABLE t1 (id int);",
                "workGroup": work_group,
                "outputLocation": output_location,
            },
            "extra": {
                "parentTaskId": "00000000-0000-0000-0000-000000000000",
                "stateName": "Step 2: Execution input formatting..",
                "stateMachineName": "LogProcessor-HBTz7GoOjZoz",
                "pipelineId": str(uuid.uuid4())
            },
        }
        
        parameter = etl_helper_event['CreateTmpTable']
        param = Parameters(parameter)
        
        with pytest.raises(Exception) as exception_info:
            param._api_start_query_execution_parameter_check(parameters={})
        assert exception_info.value.args[0] == 'Missing value for parameters.'
        
        for required_param in ('queryString', 'workGroup', 'outputLocation'):
            event = copy.deepcopy(api_start_query_execution_event)
            event['parameters'].pop(required_param)
            with pytest.raises(Exception) as exception_info:
                param._api_start_query_execution_parameter_check(parameters=event)
            assert exception_info.value.args[0] == f'Missing value for parameters.{required_param}.'
        
        event = copy.deepcopy(api_start_query_execution_event)
        param._api_start_query_execution_parameter_check(parameters=event)
        assert param.parameters.query_string == event['parameters']['queryString']
        assert param.parameters.work_group == event['parameters']['workGroup']
        assert param.parameters.output_location == event['parameters']['outputLocation']
    
    def test_api_get_query_execution_parameter_check(self, mock_iam_context, mock_sqs_context, mock_ddb_context, mock_athena_context):
        from etl_helper.lambda_function import Parameters

        etl_helper_event = json.loads(os.environ["ETL_LOG_WRITER_EVENT"])
        
        api_get_query_execution_event = {
            "API": "Athena: StartQueryExecution",
            "executionName": str(uuid.uuid4()),
            "taskId": str(uuid.uuid4()),
            "parameters": {
                "queryExecutionId": "CREATE TABLE t1 (id int);",
                "test": "1",
            },
            "extra": {
                "parentTaskId": "00000000-0000-0000-0000-000000000000",
                "stateName": "Step 2: Execution input formatting..",
                "stateMachineName": "LogProcessor-HBTz7GoOjZoz",
                "pipelineId": str(uuid.uuid4())
            },
        }
        
        parameter = etl_helper_event['CreateTmpTable']
        param = Parameters(parameter)
        
        with pytest.raises(Exception) as exception_info:
            param._api_get_query_execution_parameter_check(parameters={})
        assert exception_info.value.args[0] == 'Missing value for parameters.'
        
        for required_param in ('queryExecutionId',):
            event = copy.deepcopy(api_get_query_execution_event)
            event['parameters'].pop(required_param)
            with pytest.raises(Exception) as exception_info:
                param._api_get_query_execution_parameter_check(parameters=event)
            assert exception_info.value.args[0] == f'Missing value for parameters.{required_param}.'
        
        event = copy.deepcopy(api_get_query_execution_event)
        param._api_get_query_execution_parameter_check(parameters=event)
        assert param.parameters.query_execution_id == event['parameters']['queryExecutionId']
    
    def test_api_batch_update_partition_parameter_check(self, mock_s3_context, mock_iam_context, mock_sqs_context, mock_ddb_context, mock_athena_context):
        from etl_helper.lambda_function import Parameters

        batch_update_partition_event = json.loads(os.environ["ETL_ALTER_ATHENA_PARTITION_EVENT"])
        staging_bucket_name = os.environ["STAGING_BUCKET_NAME"]
        work_group = os.environ["ATHENA_WORK_GROUP"]
        account_id = os.environ["ACCOUNT_ID"]
        output_location = os.environ["ATHENA_OUTPUT_LOCATION"]
        
        event = copy.deepcopy(batch_update_partition_event)
        param = Parameters(event)
        with pytest.raises(Exception) as exception_info:
            param._api_batch_update_partition_parameter_check(parameters={})
        assert exception_info.value.args[0] == 'Missing value for parameters.'
        
        for required_param in ('database', 'tableName', 'location', 'partitionPrefix', 'workGroup', 'outputLocation',):
            event = copy.deepcopy(batch_update_partition_event)
            event['parameters'].pop(required_param)
            with pytest.raises(Exception) as exception_info:
                param._api_batch_update_partition_parameter_check(parameters=event)
            assert exception_info.value.args[0] == f'Missing value for parameters.{required_param}.'
        
        event = copy.deepcopy(batch_update_partition_event)
        param._api_batch_update_partition_parameter_check(parameters=event)
        assert param.parameters.action == 'ADD'
        assert param.parameters.database == event['parameters']['database']
        assert param.parameters.table_name == event['parameters']['tableName']
        assert param.parameters.location.bucket == staging_bucket_name
        assert param.parameters.location.prefix == f'AWSLogs/{account_id}/centralized/aws_apigateway_logs_parquet'
        assert param.parameters.partition_prefix == '__ds__=2023-03-11'
        assert param.parameters.work_group == work_group
        assert param.parameters.output_location == output_location
        
        event = copy.deepcopy(batch_update_partition_event)
        event['parameters']['action'] = 'DROP'
        param._api_batch_update_partition_parameter_check(parameters=event)
        assert param.parameters.action == 'DROP'
        
        event = copy.deepcopy(batch_update_partition_event)
        event['parameters']['action'] = 'None'
        param._api_batch_update_partition_parameter_check(parameters=event)
        assert param.parameters.action == 'ADD'
        
    def test_api_etl_date_transform_parameter_check(self, mock_iam_context, mock_sqs_context, mock_ddb_context, mock_athena_context):
        from etl_helper.lambda_function import Parameters

        etl_helper_event = json.loads(os.environ["ETL_LOG_WRITER_EVENT"])
        parameter = etl_helper_event['CreateTmpTable']
        param = Parameters(parameter)
        
        api_etl_date_transform_event = {
            "API": "Step Functions: ExecutionInputFormatter",
            "executionName": str(uuid.uuid4()),
            "taskId": str(uuid.uuid4()),
            "extra": {
                "parentTaskId": "00000000-0000-0000-0000-000000000000",
                "stateName": "Step 2: Execution input formatting..",
                "stateMachineName": "LogProcessor-HBTz7GoOjZoz",
                "pipelineId": str(uuid.uuid4())
            },
            "taskToken": "",
        }

        event = copy.deepcopy(api_etl_date_transform_event)
        with pytest.raises(Exception) as exception_info:
            param._api_etl_date_transform_parameter_check(parameters=event)
        assert exception_info.value.args[0] == 'Missing value for parameters.'

        event = copy.deepcopy(api_etl_date_transform_event)
        event['parameters'] = {'format': '%Y-%m-%d'}
        with pytest.raises(Exception) as exception_info:
            param._api_etl_date_transform_parameter_check(parameters=event)
        assert exception_info.value.args[0] == 'Missing value for parameters.dateString.'
        
        event = copy.deepcopy(api_etl_date_transform_event)
        event['parameters'] = {"dateString": "2024-06-01"}
        with pytest.raises(Exception) as exception_info:
            param._api_etl_date_transform_parameter_check(parameters=event)
        assert exception_info.value.args[0] == 'Missing value for parameters.format.'

        event = copy.deepcopy(api_etl_date_transform_event)
        event['parameters'] = {"dateString": "2024-06-01", 'format': '%Y-%m-%d'}
        param._api_etl_date_transform_parameter_check(parameters=event)
        assert param.parameters.date_string == "2024-06-01"
        assert param.parameters.format == '%Y-%m-%d'
        assert param.parameters.interval_days == -30
        
        event = copy.deepcopy(api_etl_date_transform_event)
        event['parameters'] = {"dateString": "2024-06-01", 'format': '%Y-%m-%d', 'intervalDays': -7}
        param._api_etl_date_transform_parameter_check(parameters=event)
        assert param.parameters.date_string == "2024-06-01"
        assert param.parameters.format == '%Y-%m-%d'
        assert param.parameters.interval_days == -7
        
    def test_execution_input_formatter_parameter_check(self, mock_iam_context, mock_sqs_context, mock_ddb_context, mock_athena_context):
        from etl_helper.lambda_function import Parameters

        etl_helper_event = json.loads(os.environ["ETL_LOG_WRITER_EVENT"])
        parameter = etl_helper_event['CreateTmpTable']
        param = Parameters(parameter)
        
        execution_input_formatter_event = {
            "API": "Step Functions: ExecutionInputFormatter",
            "executionName": str(uuid.uuid4()),
            "taskId": str(uuid.uuid4()),
            "extra": {
                "parentTaskId": "00000000-0000-0000-0000-000000000000",
                "stateName": "Step 2: Execution input formatting..",
                "stateMachineName": "LogProcessor-HBTz7GoOjZoz",
                "pipelineId": str(uuid.uuid4())
            },
            "taskToken": "",
            "parameters": {
                "input": {}
            }
        }

        event = copy.deepcopy(execution_input_formatter_event)
        with pytest.raises(Exception) as exception_info:
            param._execution_input_formatter_parameter_check(parameters=event)
        assert exception_info.value.args[0] == 'Missing value for parameters.input.'

        event = copy.deepcopy(execution_input_formatter_event)
        event['parameters']['input']['metadata'] = {}
        with pytest.raises(Exception) as exception_info:
            param._execution_input_formatter_parameter_check(parameters=event)
        assert exception_info.value.args[0] == 'Missing value for parameters.input.metadata.s3.'
        
        event = copy.deepcopy(execution_input_formatter_event)
        event['parameters']['input']['metadata'] = {'s3': {'key':'value'}, 'athena': {}}
        with pytest.raises(Exception) as exception_info:
            param._execution_input_formatter_parameter_check(parameters=event)
        assert exception_info.value.args[0] == 'Missing value for parameters.input.metadata.athena.'
        
        event = copy.deepcopy(execution_input_formatter_event)
        event['parameters']['input']['metadata'] = {'s3': {'key':'value'}, 'athena': {'key':'value'}}
        with pytest.raises(Exception) as exception_info:
            param._execution_input_formatter_parameter_check(parameters=event)
        assert exception_info.value.args[0] == 'Missing value for parameters.input.metadata.s3.archivePath.'
        
        event = copy.deepcopy(execution_input_formatter_event)
        event['parameters']['input']['metadata'] = {
            's3': {
                'archivePath': 's3://staging-bucket/archive'
                }, 
            'athena': {
                'statements': {
                    'create': '',
                    'insert': '',
                    'drop': '',
                    'aggregate': []
                }
            }
        }
        with pytest.raises(Exception) as exception_info:
            param._execution_input_formatter_parameter_check(parameters=event)
        assert exception_info.value.args[0] == 'Missing value for parameters.input.metadata.athena.statements.create.'
        
        event = copy.deepcopy(execution_input_formatter_event)
        event['parameters']['input']['metadata'] = {
            's3': {
                'archivePath': 's3://staging-bucket/archive'
                }, 
            'athena': {
                'statements': {
                    'create': 'create table src{} location{};',
                    'insert': 'insert into dest select * {} from src{};',
                    'drop': 'drop table src{}',
                    'aggregate': ['insert into metrics select * from dest where __execution_name__ = {};']
                }
            }
        }
        param._execution_input_formatter_parameter_check(parameters=event)
        assert param.parameters.input == event['parameters']['input']


def mock_boto3_api_call(self, operation_name, kwarg):
    from botocore.exceptions import ClientError
    
    if operation_name == 'StartQueryExecution':
        if kwarg['QueryString'] == 'Not a SQL' or kwarg['QueryString'].startswith('ALTER TABLE'):
            raise ClientError(error_response={'Error': {'Code': '400', 'Message': 'Error Query String.'}}, operation_name=operation_name)
    elif operation_name in ('SendTaskHeartbeat', 'SendTaskSuccess', 'SendTaskFailure'):
        return {}
    elif operation_name == 'ListObjectsV2':
        return {
            'Contents': [
                {
                    'Key': 'AWSLogs/123456789012/centralized/aws_apigateway_logs_parquet/__ds__=2023-03-11-18-01/region=us-east-1/__execution_name__=b49a793b-38d2-40c0-af22-cfacf494732e/apigateway2.parquet',
                    'Size': 36332, 
                    'StorageClass': 'STANDARD'
                    }, 
                {
                    'Key': 'AWSLogs/123456789012/centralized/aws_apigateway_logs_parquet/__ds__=2023-03-11-18-01/region=us-east-1/__execution_name__=b49a793b-38d2-40c0-af22-cfacf494732e/apigateway3.parquet', 
                    'Size': 36329, 
                    'StorageClass': 'STANDARD'
                    }
                ]
            }
     
def test_lambda_handler(mock_s3_context, mock_iam_context, mock_sqs_context, mock_ddb_context, mock_athena_context, mock_sfn_context):
    from unittest.mock import patch
    from etl_helper.lambda_function import lambda_handler, API
    from etl_helper.addons.resources import AWS_DDB_ETL_LOG

    etl_helper_event = json.loads(os.environ["ETL_LOG_WRITER_EVENT"])
    batch_update_partition_event = json.loads(os.environ["ETL_ALTER_ATHENA_PARTITION_EVENT"])
    function_name = os.environ["ETL_LOG_WRITER_FUNCTION_NAME"] 
    ddl_create_database_execution_id = os.environ['DDL_CREATE_DATABASE_EXECUTION_ID']

    context = types.SimpleNamespace()
    context.function_name = function_name
    
    with pytest.raises(Exception):
        lambda_handler('', context)

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
    assert response['data'] == event['parameters']['queryString']
    assert response['startTime'] is not None
    assert response['status'] == 'Succeeded'
    assert response['pipelineId'] == "189f73eb-1808-47e4-a9db-ee9c35100abe"
    
    # mock a start query execution return exception.
    event = copy.deepcopy(etl_helper_event['CreateTmpTable'])
    event['parameters']['queryString'] = 'Not a SQL'
    with patch('botocore.client.BaseClient._make_api_call', new=mock_boto3_api_call):
        lambda_handler(event, context)
    
    event = copy.deepcopy(etl_helper_event['CreateTmpTable'])
    event['API'] = "Athena: GetQueryExecution"
    event['parameters']['queryExecutionId'] = ddl_create_database_execution_id
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
    assert response['data'] == event['parameters']['queryString']
    assert response['startTime'] is not None
    assert response['status'] == 'Succeeded'
    assert response['pipelineId'] == "189f73eb-1808-47e4-a9db-ee9c35100abe"
    
    event = copy.deepcopy(etl_helper_event['CreateTmpTable'])
    event['API'] = "Athena: GetQueryExecution"
    event['parameters']['queryExecutionId'] = ddl_create_database_execution_id
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
    assert response['data'] == event['parameters']['queryString']
    assert response['startTime'] is not None
    assert response['status'] == 'Succeeded'
    assert response['pipelineId'] == "189f73eb-1808-47e4-a9db-ee9c35100abe"
    
    event = copy.deepcopy(batch_update_partition_event)
    execution_name = event['executionName']
    lambda_handler(event, context)
    
    response = AWS_DDB_ETL_LOG.get(execution_name=execution_name, task_id=event['taskId'])
    assert response['API'] == 'Athena: BatchUpdatePartition'
    assert response['parentTaskId'] == '00000000-0000-0000-0000-000000000000'
    assert response['executionName'] == execution_name
    assert response['functionName'] == function_name
    assert response['stateName'] == 'Step 2: Drop partitions for History data'
    assert response['stateMachineName'] == 'LogMerger-7vcYqNfMtsJK'
    assert response['taskId'] == event['taskId']
    assert response['data'] == {'state': {'Succeeded': 1}, 'status': 'Succeeded', 'totalSubTask': 1}
    assert response['startTime'] is not None
    assert response['status'] == 'Succeeded'
    assert response['pipelineId'] == '189f73eb-1808-47e4-a9db-ee9c35100abe'

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
    event['extra']['data'] = event['parameters']['queryString']
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
    assert response['data'] == event['parameters']['queryString']
    assert response['startTime'] is not None
    assert response['endTime'] is not None
    assert response['status'] == 'Failed'
    assert response['pipelineId'] == "189f73eb-1808-47e4-a9db-ee9c35100abe"
    
    event = copy.deepcopy(etl_helper_event['CreateTmpTable'])
    event['API'] = "Step Functions: ExecutionInputFormatter"
    event['parameters']['input'] = {
        'metadata': {
            's3': {
                'archivePath': 's3://staging-bucket/archive'
                }, 
            'athena': {
                'statements': {
                    'create': 'create table src;',
                    'insert': 'insert into dest select * from src;',
                    'drop': 'drop table src',
                    'aggregate': []
                }
            }
        }
    }
    
    lambda_handler(event, context)
    
    response = AWS_DDB_ETL_LOG.get(execution_name=execution_name, task_id=ddl_create_database_execution_id)
    assert response['API'] == "Step Functions: ExecutionInputFormatter"
    assert response['parentTaskId'] == "00000000-0000-0000-0000-000000000000"
    assert response['executionName'] == execution_name
    assert response['functionName'] == function_name
    assert response['stateName'] == "Step 2.1: Create tmp table in Athena"
    assert response['stateMachineName'] == "LogProcessor-HBTz7GoOjZoz"
    assert response['taskId'] == ddl_create_database_execution_id
    assert response['data'] == json.dumps(event['parameters']['input'])
    assert response['startTime'] is not None
    assert response['endTime'] is not None
    assert response['status'] == 'Succeeded'
    assert response['pipelineId'] == "189f73eb-1808-47e4-a9db-ee9c35100abe"
    
    event = copy.deepcopy(etl_helper_event['CreateTmpTable'])
    event['API'] = 'do not supported API'
    with pytest.raises(Exception) as exception_info:
        lambda_handler(event, context)
    assert exception_info.value.args[0] == f'Invalid API parameter, optional value: {", ".join(list(API.__members__.values()))}.'

    event = copy.deepcopy(etl_helper_event['CreateTmpTable'])
    event['API'] = "ETL: DateTransform"
    event['parameters'] = {
        'dateString': '2024-06-01',
        'format': '%Y-%m-%d',
        'intervalDays': -7
    }
    event.pop('taskToken')
    
    response = lambda_handler(event, context)
    assert response == {'date': '20240525'}
    
    response = AWS_DDB_ETL_LOG.get(execution_name=execution_name, task_id=ddl_create_database_execution_id)
    assert response['API'] == "ETL: DateTransform"
    assert response['parentTaskId'] == "00000000-0000-0000-0000-000000000000"
    assert response['executionName'] == execution_name
    assert response['functionName'] == function_name
    assert response['stateName'] == "Step 2.1: Create tmp table in Athena"
    assert response['stateMachineName'] == "LogProcessor-HBTz7GoOjZoz"
    assert response['taskId'] == ddl_create_database_execution_id
    assert response['data'] == json.dumps(event['parameters'])
    assert response['startTime'] is not None
    assert response['endTime'] is not None
    assert response['status'] == 'Succeeded'
    assert response['pipelineId'] == "189f73eb-1808-47e4-a9db-ee9c35100abe"


def test_get_item_by_start_query_execution(mock_iam_context, mock_sqs_context, mock_ddb_context, mock_athena_context):
    from unittest.mock import patch
    from etl_helper.lambda_function import Parameters
    from etl_helper.addons.helpers import get_item_by_start_query_execution

    etl_helper_event = json.loads(os.environ["ETL_LOG_WRITER_EVENT"])
    function_name = os.environ["ETL_LOG_WRITER_FUNCTION_NAME"] 
    ddl_create_database_execution_id = os.environ['DDL_CREATE_DATABASE_EXECUTION_ID']
    
    event = copy.deepcopy(etl_helper_event['CreateTmpTable'])
    event['API'] = "Athena: StartQueryExecution"
    event['extra']['functionName'] = function_name
    execution_name = event['executionName']
    param = Parameters(event)
    ddb_item = param.ddb_item
    
    response = get_item_by_start_query_execution(query_string=param.parameters.query_string, work_group=param.parameters.work_group, output_location=param.parameters.output_location, item=ddb_item)
    assert response['API'] == "Athena: StartQueryExecution"
    assert response['parentTaskId'] == "00000000-0000-0000-0000-000000000000"
    assert response['executionName'] == execution_name
    assert response['functionName'] == function_name
    assert response['stateName'] == "Step 2.1: Create tmp table in Athena"
    assert response['stateMachineName'] == "LogProcessor-HBTz7GoOjZoz"
    assert response['taskId'] == ddl_create_database_execution_id
    assert response['data'] == param.parameters.query_string
    assert response['startTime'] is not None
    assert response['status'] == 'Succeeded'
    assert response['pipelineId'] == "189f73eb-1808-47e4-a9db-ee9c35100abe"
    
    with patch('botocore.client.BaseClient._make_api_call', new=mock_boto3_api_call):
        response = get_item_by_start_query_execution(query_string='Not a SQL', work_group=param.parameters.work_group, output_location=param.parameters.output_location, item=ddb_item)
    
        assert response['API'] == "Athena: StartQueryExecution"
        assert response['parentTaskId'] == "00000000-0000-0000-0000-000000000000"
        assert response['executionName'] == execution_name
        assert response['functionName'] == function_name
        assert response['stateName'] == "Step 2.1: Create tmp table in Athena"
        assert response['stateMachineName'] == "LogProcessor-HBTz7GoOjZoz"
        assert response['taskId'] == ddl_create_database_execution_id
        assert response['data'] == 'Not a SQL'
        assert response['startTime'] is not None
        assert response['status'] == 'Failed'
        assert response['pipelineId'] == "189f73eb-1808-47e4-a9db-ee9c35100abe"


def test_get_item_by_execution_id(mock_iam_context, mock_sqs_context, mock_ddb_context, mock_athena_context):
    from etl_helper.lambda_function import Parameters
    from etl_helper.addons.helpers import get_item_by_execution_id

    etl_helper_event = json.loads(os.environ["ETL_LOG_WRITER_EVENT"])
    function_name = os.environ["ETL_LOG_WRITER_FUNCTION_NAME"] 
    ddl_create_database_execution_id = os.environ['DDL_CREATE_DATABASE_EXECUTION_ID']
    
    event = copy.deepcopy(etl_helper_event['CreateTmpTable'])
    event['API'] = "Athena: GetQueryExecution"
    event['extra']['functionName'] = function_name
    event['parameters']['queryExecutionId'] = ddl_create_database_execution_id
    execution_name = event['executionName']
    param = Parameters(event)
    ddb_item = param.ddb_item
    
    response = get_item_by_execution_id(query_execution_id=ddl_create_database_execution_id, item=ddb_item)
    assert response['API'] == "Athena: GetQueryExecution"
    assert response['parentTaskId'] == "00000000-0000-0000-0000-000000000000"
    assert response['executionName'] == execution_name
    assert response['functionName'] == function_name
    assert response['stateName'] == "Step 2.1: Create tmp table in Athena"
    assert response['stateMachineName'] == "LogProcessor-HBTz7GoOjZoz"
    assert response['taskId'] == ddl_create_database_execution_id
    assert response['data'] == event['parameters']['queryString']
    assert response['startTime'] is not None
    assert response['status'] == 'Succeeded'
    assert response['pipelineId'] == "189f73eb-1808-47e4-a9db-ee9c35100abe"
    
    event = copy.deepcopy(etl_helper_event['CreateTmpTable'])
    event['taskId'] = str(uuid.uuid4())
    event['API'] = "Athena: GetQueryExecution"
    event['extra']['functionName'] = function_name
    event['parameters']['queryExecutionId'] = ddl_create_database_execution_id
    execution_name = event['executionName']
    param = Parameters(event)
    ddb_item = param.ddb_item
    
    response = get_item_by_execution_id(query_execution_id=event['taskId'], item=ddb_item)
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
    from etl_helper.lambda_function import Parameters
    from etl_helper.addons.resources import AWS_DDB_ETL_LOG
    from etl_helper.addons.helpers import write_logs_to_ddb

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


def test_execution_input_formatter():
    from etl_helper.addons.helpers import execution_input_formatter
    
    metadata = {
        'metadata': {
            's3': {
                'archivePath': 's3://staging-bucket/archive'
                }, 
            'athena': {
                'statements': {
                    'create': 'create table src{} {1, 3} location{} {2}{3};',
                    'insert': 'insert into dest {1, a} select * {} {2} from src{} {3};',
                    'drop': 'drop table {2}src{}{1}',
                    'aggregate': ['insert into metrics {a, b}select * from dest where __execution_name__ = {}{b};']
                }
            }
        }
    }

    assert execution_input_formatter(input=metadata, execution_name='0000') == {
        'metadata': {
            's3': {
                'archivePath': 's3://staging-bucket/archive'
                }, 
            'athena': {
                'statements': {
                    'create': 'create table src0000 {1, 3} locations3://staging-bucket/archive/0000 {2}{3};', 
                    'insert': 'insert into dest {1, a} select * 0000 {2} from src0000 {3};', 
                    'drop': 'drop table {2}src0000{1}', 
                    'aggregate': [
                        'insert into metrics {a, b}select * from dest where __execution_name__ = 0000{b};'
                        ]
                    }
                }
            }
        }


def test_batch_update_partition(mock_s3_context, mock_sqs_context, mock_iam_context, mock_ddb_context, mock_athena_context):
    from unittest.mock import patch
    from etl_helper.lambda_function import Parameters
    from etl_helper.addons.helpers import batch_update_partition

    batch_update_partition_event = json.loads(os.environ["ETL_ALTER_ATHENA_PARTITION_EVENT"])
    
    event = copy.deepcopy(batch_update_partition_event)
    event['extra']['parentTaskId'] = str(uuid.uuid4())
    param = Parameters(event)
    
    response = batch_update_partition(bucket=param.parameters.location.bucket, 
                                      prefix=param.parameters.location.prefix,
                                      partition_prefix=param.parameters.partition_prefix,
                                      database=param.parameters.database,
                                      table=param.parameters.table_name,
                                      action=param.parameters.action,
                                      work_group=param.parameters.work_group,
                                      output_location=param.parameters.output_location,
                                      )
    assert response['status'] == 'Succeeded'
    assert response['totalSubTask'] == 1
    assert response['state']['Succeeded'] == 1
    
    with patch('botocore.client.BaseClient._make_api_call', new=mock_boto3_api_call):
        response = batch_update_partition(bucket=param.parameters.location.bucket, 
                                          prefix=param.parameters.location.prefix,
                                          partition_prefix=param.parameters.partition_prefix,
                                          database=param.parameters.database,
                                          table=param.parameters.table_name,
                                          action=param.parameters.action,
                                          work_group=param.parameters.work_group,
                                          output_location=param.parameters.output_location,
                                          )
        assert response['status'] == 'Failed'
        assert response['totalSubTask'] == 1
        assert response['state']['Failed'] == 1


def test_update_partition_ddl_generator(mock_s3_context, mock_sqs_context, mock_iam_context, mock_ddb_context, mock_athena_context):
    from etl_helper.addons.helpers import update_partition_ddl_generator

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


def test_etl_date_transform(mock_iam_context, mock_sqs_context, mock_ddb_context, mock_athena_context, mock_sfn_context):
    from etl_helper.addons.helpers import etl_date_transform
    
    assert etl_date_transform(date_string='2023-01-01', format='%Y-%m-%d', interval_days=-3) == {'date': '20221229'}
    assert etl_date_transform(date_string='2023-01-01', format='%Y-%m-%d') == {'date': '20221202'}
    
    with pytest.raises(ValueError):
        etl_date_transform(date_string='2023-01-01', format='%Y%m%d')

