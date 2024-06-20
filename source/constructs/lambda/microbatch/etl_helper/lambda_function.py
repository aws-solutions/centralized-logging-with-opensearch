# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import json
import copy
import datetime
from typing import Union
from addons import (
    AWS_DDB_META, 
    AWS_S3,
    write_logs_to_ddb, 
    get_item_by_start_query_execution, 
    get_item_by_execution_id, 
    execution_input_formatter, 
    batch_update_partition, 
    etl_date_transform
)
from utils.helpers import logger, ValidateParameters, CommonEnum, iso8601_strftime


class API(CommonEnum):
    START_QUERY_EXECUTION = 'Athena: StartQueryExecution'
    GET_QUERY_EXECUTION = 'Athena: GetQueryExecution'
    BATCH_UPDATE_PARTITION = 'Athena: BatchUpdatePartition'
    INPUT_FORMATTER = 'Step Functions: ExecutionInputFormatter'
    DYNAMODB_PUT_ITEM = 'DynamoDB: PutItem'
    ETL_DATE_TRANSFORM = 'ETL: DateTransform'


class Parameters(ValidateParameters):
    """This class is used to parse ,validate and store all incoming parameters.
       
       !!!Case sensitive!!! 
       
       :param parameters (dict): e.g.  {
                                        "API": "Athena: StartQueryExecution",
                                        "executionName": "848be54a-ae2c-414c-9ae3-f0b3d11089ab",
                                        "taskId": "e1c01f00-6f25-4c0a-8089-06b9d6ef1c81",
                                        "parameters": {
                                            "queryString": "SELECT * FROM TABLE LIMIT 10;",
                                            "workGroup": "Primary",
                                            "outputLocation": "s3://stagingbucket/athena-results"
                                        },
                                        "extra": {
                                                "parentTaskId": "00000000-0000-0000-0000-000000000000",
                                                "stateName": "Step 2.1: Create tmp table in Athena",
                                                "stateMachineName": "LogProcessor-HBTz7GoOjZoz",
                                                "pipelineId": "189f73eb-1808-47e4-a9db-ee9c35100abe"
                                                },
                                        "taskToken": "AQCEAAAAKgAAAAMAAAAA"
                                        }
    """

    def _required_parameter_check(self, parameters) -> None:
        """Required parameter verification, when the parameter does not exist, an exception message will be returned."""
        self._child_parameter_lookup_check(parameters, keys=('API', 'executionName', 'taskId', ))
        self.execution_name = parameters['executionName']
        self.task_id = parameters['taskId']
        
        self.api = parameters['API']
        self.parameters = self._init_name_space()
        if self.api not in list(API.__members__.values()):
            raise ValueError(f'Invalid API parameter, optional value: {", ".join(list(API.__members__.values()))}.')

        if self.api == API.START_QUERY_EXECUTION:
            self._api_start_query_execution_parameter_check(parameters=parameters)
        elif self.api == API.GET_QUERY_EXECUTION:
            self._api_get_query_execution_parameter_check(parameters=parameters)
        elif self.api == API.BATCH_UPDATE_PARTITION:
            self._api_batch_update_partition_parameter_check(parameters=parameters)
        elif self.api == API.INPUT_FORMATTER:
            self._execution_input_formatter_parameter_check(parameters=parameters)
        elif self.api == API.ETL_DATE_TRANSFORM:
            self._api_etl_date_transform_parameter_check(parameters=parameters)
    
    def _api_start_query_execution_parameter_check(self, parameters):
        self._child_parameter_lookup_check(parameters, keys=('parameters', ))
        self._child_parameter_lookup_check(parameters['parameters'], keys=('queryString', 'workGroup', 'outputLocation'), path='parameters')
        self.parameters.query_string = parameters['parameters']['queryString']
        self.parameters.work_group = parameters['parameters']['workGroup']
        self.parameters.output_location = parameters['parameters']['outputLocation']
    
    def _api_get_query_execution_parameter_check(self, parameters):
        self._child_parameter_lookup_check(parameters, keys=('parameters', ))
        self._child_parameter_lookup_check(parameters['parameters'], keys=('queryExecutionId',), path='parameters')
        self.parameters.query_execution_id = parameters['parameters']['queryExecutionId']
    
    def _api_batch_update_partition_parameter_check(self, parameters):
        self._child_parameter_lookup_check(parameters, keys=('parameters', ))
        self._child_parameter_lookup_check(parameters['parameters'], keys=('database', 'tableName', 'location', 'partitionPrefix', 'workGroup', 'outputLocation', ), path='parameters')
        self.parameters.database = parameters['parameters']['database']
        self.parameters.table_name = parameters['parameters']['tableName']
        self.parameters.location = self._get_bucket_object_from_uri(parameters['parameters']['location'])
        self.parameters.partition_prefix = parameters['parameters']['partitionPrefix']
        self.parameters.work_group = parameters['parameters']['workGroup']
        self.parameters.output_location = parameters['parameters']['outputLocation']
        
        self.parameters.action = parameters['parameters'].get('action', 'ADD')
        if self.parameters.action not in ('ADD', 'DROP'):
            self.parameters.action = 'ADD'
            
        AWS_S3.is_exists_bucket(self.parameters.location.bucket)
    
    def _api_etl_date_transform_parameter_check(self, parameters):
        self._child_parameter_lookup_check(parameters, keys=('parameters', ))
        self._child_parameter_lookup_check(parameters["parameters"], keys=('dateString', 'format'), path='parameters')
        
        self.parameters.date_string = parameters['parameters']['dateString']
        self.parameters.format = parameters['parameters']['format']
        self.parameters.interval_days = parameters['parameters'].get('intervalDays')
        if not isinstance(self.parameters.interval_days, int):
            logger.info('Interval Days is not exists or is null, use default value: -30.')
            self.parameters.interval_days = -30
    
    def _execution_input_formatter_parameter_check(self, parameters) -> None:
        self._child_parameter_lookup_check(parameters, keys=('parameters', ))
        self._child_parameter_lookup_check(parameters["parameters"], keys=('input',), path='parameters')
        self._child_parameter_lookup_check(parameters["parameters"]['input']['metadata'], keys=('s3', 'athena'), path='parameters.input.metadata')
        self._child_parameter_lookup_check(parameters["parameters"]['input']['metadata']['s3'], keys=('archivePath',), path='parameters.input.metadata.s3')
        self._child_parameter_lookup_check(parameters["parameters"]['input']['metadata']['athena'], keys=('statements',), path='parameters.input.metadata.athena')
        self._child_parameter_lookup_check(parameters["parameters"]['input']['metadata']['athena']['statements'], keys=('create', 'insert', 'drop', ), path='parameters.input.metadata.athena.statements')
        
        self.parameters.input = parameters['parameters']['input']
        
    def _optional_parameter_check(self, parameters) -> None:
        """Optional parameter verification, when the parameter does not exist or is illegal, supplement the default value."""
        self.extra: dict = self._get_parameter_value(parameters.get('extra', {}), dict, {}) # type: ignore
        self.function_name = self.extra.get('functionName', '') # type: ignore
        self.parent_task_id = self.extra.get('parentTaskId', '') # type: ignore
        self.state_name = self.extra.get('stateName', '') # type: ignore
        self.state_machine_name = self.extra.get('stateMachineName', '') # type: ignore
        self.pipeline_id = self.extra.get('pipelineId', '') # type: ignore
        self.task_token = parameters.get('taskToken', '')
        self.ddb_item = self.get_ddb_item()
        
    def get_ddb_item(self):
        ddb_item = {'executionName': self.execution_name, 'taskId': self.task_id, 'API': self.api, 'functionName': self.function_name, 
                    'data': '', 'startTime': '', 'endTime': '', 'status': '', 'expirationTime': int(datetime.datetime.now(datetime.UTC).timestamp() + AWS_DDB_META.etl_log_ttl_secs)}
        ddb_item.update(self.extra)
        ddb_item['pipelineIndexKey'] = ':'.join((ddb_item.get('pipelineId', ''), ddb_item.get('stateMachineName', ''), ddb_item['taskId']))
        return ddb_item


def lambda_handler(event, context) -> Union[None, dict]:
    logger.info(f'Received request: {json.dumps(event)}')
    if not isinstance(event, dict):
        raise ValueError('The event is not a dict.')

    param = Parameters(event)
    param.function_name = context.function_name
    param.ddb_item['functionName'] = param.function_name
    logger.info(f'The parameters: API: {param.api}, execution_name: {param.execution_name}, taskId: {param.task_id}, '
                    f'function_name: {param.function_name}, parentTaskId: {param.parent_task_id}, '
                    f'stateMachineName: {param.state_machine_name}, stateName: {param.state_name}, pipelineId: {param.pipeline_id}, '
                    f'extra: {param.extra}, taskToken: {param.task_token}.')
    
    item, output, results = copy.deepcopy(param.ddb_item), '', {}
    item['startTime'] = iso8601_strftime()

    if param.api == API.START_QUERY_EXECUTION:
        item = get_item_by_start_query_execution(query_string=param.parameters.query_string, work_group=param.parameters.work_group, output_location=param.parameters.output_location, item=item)
        write_logs_to_ddb(execution_name=param.execution_name, task_id=param.task_id, item=item, task_token=param.task_token)
    elif param.api == API.GET_QUERY_EXECUTION:
        item = get_item_by_execution_id(query_execution_id=param.parameters.query_execution_id, item=item)
        write_logs_to_ddb(execution_name=param.execution_name, task_id=param.task_id, item=item, task_token=param.task_token)
    elif param.api == API.BATCH_UPDATE_PARTITION:
        results = batch_update_partition(
            bucket=param.parameters.location.bucket, 
            prefix=param.parameters.location.prefix, 
            partition_prefix=param.parameters.partition_prefix,
            database=param.parameters.database,
            table=param.parameters.table_name,
            action=param.parameters.action,
            work_group=param.parameters.work_group,
            output_location=param.parameters.output_location,
            )
        item['endTime'] = iso8601_strftime()
        item['data'] = results
        item['status'] = results['status']
        write_logs_to_ddb(execution_name=param.execution_name, task_id=param.task_id, item=item, task_token=param.task_token)
    elif param.api == API.INPUT_FORMATTER:
        output = json.dumps(execution_input_formatter(input=param.parameters.input, execution_name=param.execution_name))
        item['endTime'] = iso8601_strftime()
        item['data'] = output
        item['status'] = 'Succeeded'
        write_logs_to_ddb(execution_name=param.execution_name, task_id=param.task_id, item=item, task_token=param.task_token, output=output)
    elif param.api == API.ETL_DATE_TRANSFORM:
        item['data'] = json.dumps({'dateString': param.parameters.date_string, 'format': param.parameters.format, 'intervalDays': param.parameters.interval_days})
        item['endTime'] = iso8601_strftime()
        item['status'] = 'Succeeded'
        results = etl_date_transform(date_string=param.parameters.date_string, format=param.parameters.format, interval_days=param.parameters.interval_days)
        write_logs_to_ddb(execution_name=param.execution_name, task_id=param.task_id, item=item, task_token=param.task_token)
    elif param.api == API.DYNAMODB_PUT_ITEM:
        write_logs_to_ddb(execution_name=param.execution_name, task_id=param.task_id, item=item, task_token=param.task_token)
    
    if not param.task_token:
        return results
