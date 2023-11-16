# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import os
import json
import uuid
import copy
from datetime import datetime
from typing import Iterator
from urllib.parse import unquote
from utils import ValidateParameters, S3Client, AthenaClient, logger
from utils.models.etllog import ETLLogTable
from utils.models.meta import MetaTable


AWS_DDB_META = MetaTable()
AWS_DDB_ETL_LOG = ETLLogTable()
AWS_S3 = S3Client()
AWS_ATHENA = AthenaClient()


class Parameters(ValidateParameters):
    """This class is used to parse ,validate and store all incoming parameters.
    
       !!!Case sensitive!!!
       
       e.g.
       {
            "executionName": "848be54a-ae2c-414c-9ae3-f0b3d11089ab",
            "action": "DROP",
            "catalog": "AwsDataCatalog",
            "database": "centralized",
            "tableName": "aws_apigateway_logs_parquet",
            "location": "s3://stagingbucket/archive/aws_apigateway_logs_parquet/e1f9deb3-9267-431d-8e2c-ac352cacc71a",
            "partitionPrefix": "__ds__=2023-01-01",
            "workGroup": "Primary",
            "outputLocation": "s3://stagingbucket/athena-results",
            "extra": {
                "stateMachineName": "LogMerger-7vcYqNfMtsJK",
                "stateName": "Step 2: Drop partitions for History data",
                "API": "Lambda: Invoke"
            }
        }
    """
        
    def _required_parameter_check(self, parameters) -> None:
        """Required parameter verification, when the parameter does not exist, an exception message will be returned."""
        self._child_parameter_lookup_check(parameters, keys=('executionName', 'database', 'tableName', 'location', 'partitionPrefix', 'workGroup', 'outputLocation', ))

        self.execution_name = parameters['executionName']
        self.database = parameters['database']
        self.table_name = parameters['tableName']
        self.location = self._get_bucket_object_from_uri(parameters['location'])
        self.partition_prefix = parameters['partitionPrefix']
        self.work_group = parameters['workGroup']
        self.output_location = parameters['outputLocation']
    
    def _optional_parameter_check(self, parameters) -> None:
        """Optional parameter verification, when the parameter does not exist or is illegal, supplement the default value."""
        self.function_name = parameters.get('functionName', '')
        self.action = parameters.get('action', 'ADD')
        if self.action not in ('ADD', 'DROP'):
            self.action = 'ADD'
        self.extra = self._get_parameter_value(parameters.get('extra'), dict, {})
        self.task_id = self._get_parameter_value(parameters.get('taskId'), str, str(uuid.uuid4()))
        self.ddb_item = self.get_ddb_item()
    
    
    def get_ddb_item(self) -> dict:
        """Generate default item of ETLLogTable."""
        ddb_item = {'executionName': self.execution_name, 'functionName': self.function_name,
                    'taskId': self.task_id, 'data': '', 'startTime': datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%S.') + datetime.utcnow().strftime('%f')[:3] + 'Z',
                    'endTime': '', 'status': 'Running', 'expirationTime': int(datetime.utcnow().timestamp() + AWS_DDB_META.etl_log_ttl_secs)}
        ddb_item.update(self.extra)
        ddb_item['pipelineIndexKey'] = ':'.join((ddb_item.get('pipelineId', ''), ddb_item.get('stateMachineName', ''), ddb_item['taskId']))
        return ddb_item
        

def lambda_handler(event, context) -> None:
    logger.info(f'Received request: {json.dumps(event)}')
    if not isinstance(event, dict):
        raise ValueError('The event is not a dict.')
    
    event['functionName'] = context.function_name
    param = Parameters(event)
    
    AWS_S3.is_exists_bucket(param.location.bucket)
    AWS_DDB_ETL_LOG.put(execution_name=param.execution_name, task_id=param.task_id, item=param.ddb_item)
    logger.info(f'The initialization DDB\' item is {param.ddb_item}.')
    
    status = 'Succeeded'
    execution_status = batch_update_partition_handler(param)
    total_subtask = execution_status['totalSubTask']
    succeeded_task = execution_status['state'].get('Succeeded', 0)
    if succeeded_task == total_subtask:
        status = 'Succeeded'
    elif succeeded_task > 0 and succeeded_task < execution_status['totalSubTask']:
        status = 'PartlySucceeded'
    elif succeeded_task == 0:
        status = 'Failed'
    
    logger.info(f'Task execution status: {execution_status}')
    AWS_DDB_ETL_LOG.update(execution_name=param.execution_name, task_id=param.task_id, 
                           item={'endTime': datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%S.') + datetime.utcnow().strftime('%f')[:3] + 'Z', 'status': status})


def batch_update_partition_handler(param: Parameters) -> dict:
    """The S3 bucket prefix must follow the hive style partitioning format, scan S3 files, intercept partition paths, 
       generate partition update statements, execute statements in batches, and write execution logs to DynamoDB.

    :param param (Parameters): store all input parameters.

    Returns:
        dict: Returns the execution result summary of the partition update task.
    """
    prefix = f'{param.location.prefix}/{param.partition_prefix}'
    contents = AWS_S3.list_objects(bucket=param.location.bucket, prefix=prefix)
    
    partitioning_info = set()
    for content in contents:
        object_key = content['Key']
        object_dirname = os.path.dirname(object_key)
        partitioning_path = object_dirname[len(param.location.prefix):]
        partitioning_path = partitioning_path[1:] if partitioning_path[0] == '/' else partitioning_path
        partitioning_info.add(partitioning_path)

    alter_athena_partition_ddl = update_partition_ddl_generator(database=param.database, table=param.table_name, 
                                                               partitioning_info=partitioning_info, action=param.action)

    subtask_status = {'totalSubTask': 0, 'state': {}}
    for ddl in alter_athena_partition_ddl:
        query_execution_info = AWS_ATHENA.start_query_execution(ddl, 
                                                    work_group=param.work_group, 
                                                    output_location=param.output_location, 
                                                    asynchronous=False)
        item = copy.deepcopy(param.ddb_item)
        query_execution_status = AWS_ATHENA.get_query_execution_status(query_execution_info)
        
        subtask_status['totalSubTask'] += 1
        query_execution_state = query_execution_status['state'].title()
        if query_execution_state not in subtask_status['state']:
            subtask_status['state'][query_execution_state] = 0
        subtask_status['state'][query_execution_state] += 1
        
        item['API'] = 'Athena: StartQueryExecution'
        item['parentTaskId'] = param.task_id
        item['data'] = query_execution_status['query']
        item['startTime'] = query_execution_status['submissionDateTime']
        item['endTime'] = query_execution_status['completionDateTime']
        item['status'] = query_execution_state
        item['pipelineIndexKey'] = ':'.join((item.get('pipelineId', ''), item.get('stateMachineName', ''), query_execution_status['queryExecutionId']))
        logger.info(f"Put update partition task to DynamoDB, executionName: {param.execution_name}, "
                f"taskId: {query_execution_status['queryExecutionId']}, item: {item}")
        AWS_DDB_ETL_LOG.put(execution_name=param.execution_name, task_id=query_execution_status['queryExecutionId'], item=item)
    return subtask_status


def update_partition_ddl_generator(database: str, table: str, partitioning_info: set, action='ADD', batch_num: int = 20) -> Iterator[str]:
    """Generate update partition ddl statement, because the maximum allowed query string length is 262144 bytes, 
       so use batch_num to control the number of partitions updated in each batch.

    :param database (str): The name of the database.
    :param table (str): The name of the table.
    :param partitioning_info (set): Hive style (or format) partitioning. The paths include both the names of the partition keys 
        and the values that each path represents. e.g. __ds__=2023-01-01-00-00/region=us-east-1/__execution_name_=8caebd12-b4d8-4d6c-8e3f-c5e246631ab6
    :param action (str, optional): ADD or DROP partition from a table. Defaults to 'ADD'.
    :param batch_num (int, optional): The number of partitions each DDL statement contains. Defaults to 20.

    Yields:
        Iterator[str]: Returns the DDL statements executed in each batch.
    """
    ddl_alter_template = ' '.join((f'ALTER TABLE `{database}`.`{table}`', 'ADD IF NOT EXISTS {partition};'))
    if action != 'ADD':
        ddl_alter_template = ' '.join((f'ALTER TABLE `{database}`.`{table}`', 'DROP IF EXISTS {partition};'))
        
    ddl_partition_template = 'PARTITION ({partition_spec})'
    ddl_partition_separator = ' ' if action == 'ADD' else ','

    cn = 0
    partition = []
    for partitioning_path in sorted(partitioning_info):
        partition_spec = []
        for directory in partitioning_path.split('/'):
            partition_name = unquote(directory.split('=')[0])
            partition_value = unquote('='.join(directory.split('=')[1:])).replace("'", "''")
            partition_key = f"`{partition_name}`='{partition_value}'"
            partition_spec.append(partition_key)
        partition.append(ddl_partition_template.format(partition_spec=', '.join(partition_spec)))
        cn += 1
        if cn >= batch_num:
            ddl = ddl_alter_template.format(partition=ddl_partition_separator.join(partition))
            logger.info(f'The partition num has reached {batch_num}, return ddl to execute,  {ddl}.')
            yield ddl
            cn = 0
            partition = []

    if partition:
        ddl = ddl_alter_template.format(partition=ddl_partition_separator.join(partition))
        logger.info(f'Return the remaining ddl to execute, ddl: {ddl}.')
        yield ddl_alter_template.format(partition=ddl_partition_separator.join(partition))

