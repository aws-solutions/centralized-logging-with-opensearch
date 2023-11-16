# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import os
import json
import uuid
import logging
from typing import Union
from datetime import datetime
from utils import ValidateParameters, SQSClient, S3Client, parse_bytes, logger
from utils.models.etllog import ETLLogTable
from utils.models.meta import MetaTable


AWS_DDB_META = MetaTable()
AWS_DDB_ETL_LOG = ETLLogTable()
AWS_SQS = SQSClient()
AWS_S3 = S3Client()


class Parameters(ValidateParameters):
    """This class is used to parse ,validate and store all incoming parameters, and initialize SQS and DDB item data.
    
       !!!Case sensitive!!!
    """

    def _required_parameter_check(self, parameters) -> None:
        """Required parameter verification, when the parameter does not exist, an exception message will be returned."""
        self._child_parameter_lookup_check(parameters, keys=('executionName', 'sqsName', 'srcPath', 'dstPath', ))
        
        self.source = self._get_bucket_object_from_uri(parameters.get('srcPath'))
        self.destination = self._get_bucket_object_from_uri(parameters.get('dstPath'))
        self.execution_name = parameters.get('executionName')
        self.sqs_name = parameters.get('sqsName')

    def _optional_parameter_check(self, parameters) -> None:
        """Optional parameter verification, when the parameter does not exist or is illegal, supplement the default value."""
        self.function_name = parameters.get('functionName')
        self.task_id = parameters.get('taskId', str(uuid.uuid4()))
        self.keep_prefix = self._get_parameter_value(parameters.get('keepPrefix'), (bool, dict), True)
        parameters['size'] = self._get_parameter_value(parameters.get('size'), (int, str), 100)
        if isinstance(parameters['size'], str):
            try:
                self.size = parse_bytes(parameters['size'])
            except Exception:
                self.size = parse_bytes('100MiB')
            self.units = 'Bytes'
        elif isinstance(parameters['size'], int) and parameters['size'] < 1:
            self.size = 100
            self.units = None
        else:
            self.size = parameters['size']
            self.units = None if self.size <= 1000 else 'Bytes'
        self.source_type = parameters.get('sourceType')
        self.enrichment_plugins = self._get_parameter_value(parameters.get('enrichmentPlugins'), list, [])
        self.merge = self._get_parameter_value(parameters.get('merge'), bool, False)
        self.task_token = parameters.get('taskToken')
        self.extra = self._get_parameter_value(parameters.get('extra'), dict, {})
        self.delete_on_success = self._get_parameter_value(parameters.get('deleteOnSuccess'), bool, False)
        self.sqs_url = ''
        self.sqs_msg = self.get_sqs_msg()
        self.ddb_item = self.get_ddb_item()
    
    def get_sqs_msg(self) -> dict:
        """Generate default SQS message template."""
        sqs_msg = {'executionName': self.execution_name, 'functionName': self.function_name,
                   'taskToken': self.task_token, 'parentTaskId': self.task_id, 'taskId': str(uuid.uuid4()),
                   'sourceType': self.source_type, 'enrichmentPlugins': self.enrichment_plugins,
                   'deleteOnSuccess': self.delete_on_success, 'merge': self.merge, 'data': []}
        return sqs_msg

    def get_ddb_item(self) -> dict:
        """Generate default item of ETLLogTable."""
        ddb_item = {'executionName': self.execution_name, 'functionName': self.function_name,
                    'taskId': self.task_id, 'data': '{"totalSubTask": 0}', 'startTime': datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%S.') + datetime.utcnow().strftime('%f')[:3] + 'Z',
                    'endTime': '', 'status': 'Running', 'expirationTime': int(datetime.utcnow().timestamp() + AWS_DDB_META.etl_log_ttl_secs)}
        ddb_item.update(self.extra)
        ddb_item['pipelineIndexKey'] = ':'.join((ddb_item.get('pipelineId', ''), ddb_item.get('stateMachineName', ''), ddb_item['taskId']))
        return ddb_item


def lambda_handler(event, context) -> None:
    logger.info(f'Received request: {json.dumps(event)}')
    if not isinstance(event, dict):
        raise ValueError('The event is not a dict.')
    
    event['functionName'] = context.function_name
    event['taskId'] = str(uuid.uuid4())

    param = Parameters(event)
    AWS_S3.is_exists_bucket(param.source.bucket)
    AWS_S3.is_exists_bucket(param.destination.bucket)
    param.sqs_url = AWS_SQS.get_queue_url(param.sqs_name)
    
    logger.info(f'The parameters: source.bucket: {param.source.bucket}, source.prefix: {param.source.prefix}, '
                f'destination.bucket: {param.destination.bucket}, destination.prefix: {param.destination.prefix}, '
                f'execution_name: {param.execution_name}, sqs_name: {param.sqs_name}, function_name: {param.function_name}, '
                f'task_id: {param.task_id}, keep_prefix: {param.keep_prefix}, size: {param.size}, '
                f'units: {param.units}, merge: {param.merge}, extra: {param.extra}, delete_on_success: {param.delete_on_success}, '
                f'sqs_url: {param.sqs_url}, task_token: {param.task_token}.')
    logger.debug(f'The initialization SQS\' message is {param.sqs_msg}.')
    logger.debug(f'The initialization DDB\' item is {param.ddb_item}.')

    logger.info(f'Put scanning task to DynamoDB, executionName: {param.execution_name}, taskId: {param.task_id}, '
                f'item: {param.ddb_item}.')
    AWS_DDB_ETL_LOG.put(execution_name=param.execution_name, task_id=param.task_id, item=param.ddb_item)
    migration_task_count = migration_task_generator(param)
    AWS_DDB_ETL_LOG.update(execution_name=param.execution_name, task_id=param.task_id,
                           item={'data': json.dumps({'totalSubTask': migration_task_count})})

    if migration_task_count == 0:
        logger.info(f'No objects were found, send message to SQS {param.sqs_url} triggers callback.')
        AWS_SQS.send_message(param.sqs_url, param.sqs_msg)
        return
    logger.info(f'Number of migration tasks: {migration_task_count}, waiting for the migration task to complete.')


def migration_task_generator(param: Parameters) -> int:
    """This function is used to parse the objects list in the S3 bucket, repackage it as a migration message and send
    it to SQS to trigger the migration operation.

    :param param: Parameter Object, used to obtain the incoming parameter values that need to be used,
        such as Parameter.source.
    :return: The number of migration tasks sent to SQS, used to maintain the status of the completion
        of the migration task.
    """
    task_count = 0
    migration_tasks = {}

    for content in AWS_S3.list_objects(bucket=param.source.bucket, prefix=param.source.prefix):
        if content['Size'] == 0:
            logger.debug(f"Ignore object due to content size is zero, key is {content['Key']}.")
            continue

        converted_prefix = prefix_converter(content['Key'], keep_prefix=param.keep_prefix)
        dst_key = f'{param.destination.prefix}/{converted_prefix}' if param.keep_prefix is False else ''.join([param.destination.prefix, converted_prefix[len(param.source.prefix):]])
        unique_prefix = os.path.dirname(dst_key) if param.merge is True else 'all'

        task = {'source': {'bucket': param.source.bucket, 'key': content['Key']},
                'destination': {'bucket': param.destination.bucket,
                                'key': dst_key}}
        logger.debug(f'The migration task is {task}.')
        size = content['Size'] if param.units is not None else 1
        if unique_prefix not in migration_tasks.keys():
            migration_tasks[unique_prefix] = {'data': [task], 'size': size}
        else:
            migration_tasks[unique_prefix]['data'].append(task)
            migration_tasks[unique_prefix]['size'] += size

        if migration_tasks[unique_prefix]['size'] >= param.size:
            data = migration_tasks[unique_prefix]['data']
            logger.info(f'The messages num is {migration_tasks[unique_prefix]["size"]}, has reached max size {param.size}, send message to SQS {param.sqs_url}.')
            migration_task_writer(data, param.sqs_msg, param.sqs_url, param.ddb_item, parent_task_id=param.task_id)
            migration_tasks.pop(unique_prefix)
            task_count += 1

    for unique_prefix in migration_tasks.keys():
        data = migration_tasks[unique_prefix]['data']
        logger.debug(f'unique_prefix: {unique_prefix}, data: {data}')
        logger.info(f'Send the remaining messages to SQS {param.sqs_url}, the number of messages is {len(data)}.')
        migration_task_writer(data, param.sqs_msg, param.sqs_url, param.ddb_item, parent_task_id=param.task_id)
        task_count += 1

    return task_count


def migration_task_writer(tasks: list, msg: dict, sqs_url: str, item: dict, parent_task_id: str = '') -> None:
    """Send the migration task to SQS and write it to DDB, including the following two operations:
       1. Add uuid as the unique id of the task, migration task data and the id of the parent task in the message
           body sent to SQS.
       2. Add uuid as the unique id of task, add task start time and parent task id.
    :param tasks: Migration task list, which needs to be added to the sqs message body.
    :param msg: The message body sent to sqs.
    :param sqs_url: SQS url.
    :param item: Item written to DDB.
    :param parent_task_id: Parent task id.
    :return: None
    """
    msg['taskId'] = str(uuid.uuid4())
    msg['parentTaskId'] = parent_task_id
    msg['data'] = tasks
    item['taskId'] = msg['taskId']
    item['startTime'] = datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%S.') + datetime.utcnow().strftime('%f')[:3] + 'Z'
    item['parentTaskId'] = parent_task_id
    item['data'] = ''
    item['pipelineIndexKey'] = ':'.join((item.get('pipelineId', ''), item.get('stateMachineName', ''), item['taskId']))
    logger.debug(f'Sending message {msg} to SQS {sqs_url}.')
    AWS_SQS.send_message(sqs_url, msg)
    logger.info(f'Put migration task to DynamoDB, executionName: {item["executionName"]}, '
                f'taskId: {item["taskId"]}, item: {item}')
    AWS_DDB_ETL_LOG.put(execution_name=item['executionName'], task_id=item['taskId'], item=item)


def time_partition_transform(time: str, from_format: str = '%Y-%m-%d-%H-%M', to_format: str = '%Y-%m-%d-00-00') -> str:
    """This function is used to convert the format of the time partition field.
    For example, we can convert the time partition of __ds__=2023-01-01-03-51 to __ds__=2023-01-01-00-00,
    thereby reducing the number of partitions.

    :param time: the time string need to convert, such as 2023-01-01-03-51.
    :param from_format: format of the time string, such as %Y-%m-%d-%H-%M.
    :param to_format: converted time string format, such as %Y-%m-%d-00-00.
    :return: converted time string format, such as 2023-01-01-00-00.
    """
    try:
        return datetime.strftime(datetime.strptime(time, from_format), to_format)
    except Exception as e:
        logging.error(f'Time transform failed, time: {time}, from_format: {from_format}, to_format: {to_format}.')
        raise e


def prefix_converter(prefix: str, keep_prefix: Union[bool, dict] = True) -> str:
    """Generate a new prefix according to the parameters passed in by keep_prefix.
    The keep_prefix parameter supports two types of data: boolean and dict.
    When keep_prefix is True, the new prefix is the same as the original prefix.
    When keep_prefix is False, the returned prefix only contains File name。
    When keep_prefix is a dictionary, the format is as follows:
    {
        "__ds__":{
            "type":"time",
            "from":"%Y-%m-%d-%H-%M",
            "to":"%Y-%m-%d-00-00"
        },
        "region":{
            "type":"retain"
        },
        "__execution_name__":{
            "type":"default",
            "value":"00000000-0000-0000-0000-000000000000"
        }
    }
    The key value in the dictionary corresponds to the partition key of Apache Hive style partitions.
    For example, __ds__ represents the time field, and the display format in prefix is __ds__=2023-01-01-03-51.
    The type field contains three types:
        1. time: The representative is a time field, which may need to be transformed by time_partition_transform.
        2. retain: Keep the original value without any processing.
        3. default: Replace original value with default value, we can merge __execution_name__ partition field
            with this attribute value.


    :param prefix: A prefix string in Apache Hive style partitions format.
    :param keep_prefix: The keep_prefix parameter supports two types of data: boolean and dict, default is True.
    :return: A new Apache Hive style partitions format prefix after partition conversion.
    """
    if isinstance(keep_prefix, dict):
        pks = {x.lower(): keep_prefix[x] for x in keep_prefix.keys()}
        split_dirname = prefix.split('/')
        new_split_dirname = split_dirname.copy()

        i = 0
        for idx, dirname in enumerate(split_dirname):
            if '=' in dirname:
                partition_key = dirname.split('=')[0]
                lower_partition_key = partition_key.lower()
                partition_value = '='.join(dirname.split('=')[1:])
                if lower_partition_key not in pks.keys():
                    new_split_dirname.pop(idx - i)
                    i += 1
                elif pks[lower_partition_key]['type'] == 'time':
                    new_split_dirname[idx - i] = '='.join(
                        [partition_key, time_partition_transform(partition_value, pks[lower_partition_key]['from'],
                                                                 pks[lower_partition_key]['to'])])
                elif pks[lower_partition_key]['type'] == 'default':
                    new_split_dirname[idx - i] = '='.join([partition_key, pks[lower_partition_key]['value']])
        return '/'.join(new_split_dirname)

    return prefix if keep_prefix is True else os.path.basename(prefix)
