# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import os
import re
import json
import datetime
from typing import Optional, Iterator
from urllib.parse import unquote
from utils.helpers import logger, iso8601_strftime
from .resources import AWS_DDB_ETL_LOG, AWS_ATHENA, AWS_SFN, AWS_S3


def get_item_by_start_query_execution(query_string: str, work_group: str, output_location: str, item: dict) -> dict:
    """Call the start_query_execution to start the query execution, update item written to DDB and return.

    :param query_string (str): The SQL query statement.
    :param work_group (str): The Athena workgroup to use for the query.
    :param output_location (str): The location in Amazon S3 to store the results of the query execution.
    :param item (dict): Item written to DDB.
    :return: new item
    """
    logger.info(f'The API is "Athena: StartQueryExecution", required parameter queryString: {query_string}, workGroup: {work_group}, '
                    f'outputLocation: {output_location}.')
    response = AWS_ATHENA.start_query_execution(query_string=query_string, work_group=work_group,
                                                output_location=output_location, asynchronous=False,
                                                interval = 3)
    logger.info(f"The QueryString: {query_string}, response is {response}.")
    if not response['QueryExecution']['QueryExecutionId']:
        item['data'] = query_string
        item['endTime'] = iso8601_strftime()
        item['status'] = 'Failed'
    else:
        query_execution_id = response['QueryExecution']['QueryExecutionId']
        item = get_item_by_execution_id(query_execution_id=query_execution_id, item=item)
    
    return item


def get_item_by_execution_id(query_execution_id: str, item : dict) -> dict:
    """Call the get_query_execution to obtain the execution result, update item written to DDB and return. 

    :param query_execution_id (str): The unique ID of the query execution.
    :param: item (dict): Item written to DDB.
    :return: new item
    """
    query_execution_response = AWS_ATHENA.get_query_execution(query_execution_id)
    if query_execution_response['QueryExecution']['QueryExecutionId']:
        query_execution_status = AWS_ATHENA.get_query_execution_status(query_execution_response)
    
        item['data'] = query_execution_status['query']
        item['startTime'] = query_execution_status['submissionDateTime']
        item['endTime'] = query_execution_status['completionDateTime']
        item['status'] = query_execution_status['state'].title()
    else:
        item['startTime'] = iso8601_strftime()
        item['endTime'] = iso8601_strftime()
        item['status'] = 'Failed'
    return item
    

def write_logs_to_ddb(execution_name: str, task_id: str, item: dict, task_token: Optional[str] = None, output: str = '') -> None:
    """Write log data to Dynamodb, If task_token is not None, callback to step function. When task_token has a value
       and item['status'] is SUCCEEDED and COMPLETED, callback success, otherwise the callback failure.

    :param execution_name: execution name, partition key
    :param task_id: task id,  sort key
    :param item: Item written to DDB.
    :param task_token: $$.Task.Token in the step function context
    :return:
    """
    if not output:
        output = json.dumps(item)
    item['pipelineIndexKey'] = ':'.join((item.get('pipelineId', ''), item.get('stateMachineName', ''), item['taskId']))
    logger.info(f'Put item to DynamoDB, item: {item}.')
    AWS_DDB_ETL_LOG.put(execution_name=execution_name, task_id=task_id, item=item)
    if task_token:
        sfn_callback_func = 'send_task_success' if item.get('status') == 'Succeeded' else 'send_task_failure' 
        logger.info(f"Callback {sfn_callback_func} to Amazon Step Function, output: {item}.")
        AWS_SFN.send_callback(task_token, output=output, function=sfn_callback_func)


def execution_input_formatter(input: dict, execution_name: str) -> dict:
    statements = input.get('metadata', {}).get('athena', {}).get('statements', {})
    pattern = r"\{([^}]+)\}"
    repl = r'{{\1}}'
    statements['create'] = re.sub(pattern, repl, statements['create']).format(execution_name, f'{input["metadata"]["s3"]["archivePath"]}/{execution_name}')
    statements['insert'] = re.sub(pattern, repl, statements['insert']).format(execution_name, execution_name)
    statements['drop'] = re.sub(pattern, repl, statements['drop']).format(execution_name)
    aggregate = []
    for statement in statements.get('aggregate', []):
        aggregate.append(re.sub(pattern, repl, statement).format(execution_name))
    statements['aggregate'] = aggregate
    
    return input


def batch_update_partition(bucket: str, prefix: str, partition_prefix: str, database: str, table: str, action: str, work_group: str, output_location: str) -> dict:
    """The S3 bucket prefix must follow the hive style partitioning format, scan S3 files, intercept partition paths, 
       generate partition update statements, execute statements in batches, and write execution logs to DynamoDB.

    :param param (Parameters): store all input parameters.

    Returns:
        dict: Returns the execution result summary of the partition update task.
    """
    full_partition_prefix= f'{prefix}/{partition_prefix}'
    contents = AWS_S3.list_objects(bucket=bucket, prefix=full_partition_prefix)
    
    partitioning_info = set()
    for content in contents:
        object_key = content['Key']
        object_dirname = os.path.dirname(object_key)
        partitioning_path = object_dirname[len(prefix):]
        partitioning_path = partitioning_path[1:] if partitioning_path[0] == '/' else partitioning_path
        partitioning_info.add(partitioning_path)
    
    alter_athena_partition_ddl = update_partition_ddl_generator(database=database, table=table, 
                                                               partitioning_info=partitioning_info, action=action)

    results = {'status': 'Succeeded', 'totalSubTask': 0, 'state': {}}
    for ddl in alter_athena_partition_ddl:
        query_execution_info = AWS_ATHENA.start_query_execution(ddl, 
                                                    work_group=work_group, 
                                                    output_location=output_location, 
                                                    asynchronous=False)
        query_execution_status = AWS_ATHENA.get_query_execution_status(query_execution_info)
        
        results['totalSubTask'] += 1
        query_execution_state = query_execution_status['state'].title()
        if query_execution_state not in results['state']:
            results['state'][query_execution_state] = 0
        results['state'][query_execution_state] += 1
    
    succeeded_task = results['state'].get('Succeeded', 0)
    if succeeded_task == results['totalSubTask']:
        results['status'] = 'Succeeded'
    elif succeeded_task > 0 and succeeded_task < results['totalSubTask']:
        results['status'] = 'PartlySucceeded'
    elif succeeded_task == 0:
        results['status'] = 'Failed'

    return results


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


def etl_date_transform(date_string: str, format: str, interval_days: int = -30) -> dict:
    try:
        datetime.datetime.strptime(date_string, format)
    except ValueError as e:
        raise ValueError(e)
    
    results = {'date': (datetime.datetime.strptime(date_string, format) + datetime.timedelta(days=interval_days)).strftime('%Y%m%d')}
    logger.info(f"The converted time is {date_string}, and the original time is {results['date']}, IntervalDays is {interval_days}.")
    return results

