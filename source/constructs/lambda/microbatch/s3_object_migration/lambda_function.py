# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import json
import gzip
import base64
from datetime import datetime
from utils import ValidateParameters, SFNClient, S3Client, logger
from utils.models.etllog import ETLLogTable

try:
    from utils.enrichment import EnrichProcessor
except ImportError:
    EnrichProcessor = None


AWS_DDB_ETL_LOG = ETLLogTable()
AWS_S3 = S3Client()
AWS_SFN = SFNClient()


class Parameters(ValidateParameters):
    """This class is used to parse ,validate and store all incoming parameters.
    
       !!!Case sensitive!!!
    """
    def _required_parameter_check(self, parameters) -> None:
        """Required parameter verification, when the parameter does not exist, an exception message will be returned."""
        self._child_parameter_lookup_check(parameters, keys=('executionName', 'taskId', 'parentTaskId', ))
        
        self.execution_name = parameters['executionName']
        self.task_id = parameters['taskId']
        self.parent_task_id = parameters['parentTaskId']

    def _optional_parameter_check(self, parameters) -> None:
        """Optional parameter verification, when the parameter does not exist or is illegal, supplement the default value."""
        self.source_type = self._get_parameter_value(parameters.get('sourceType'), str, '')
        self.enrichment_plugins = set(self._get_parameter_value(parameters.get('enrichmentPlugins'), list, []))
        self.merge = self._get_parameter_value(parameters.get('merge'), bool, False)
        self.delete_on_success = self._get_parameter_value(parameters.get('deleteOnSuccess'), bool, True)
        self.data = self._get_parameter_value(parameters.get('data'), list, [])
        self.function_name = parameters.get('functionName', '')
        self.task_token = parameters.get('taskToken')


def lambda_handler(event, context):
    logger.info(f'Received request: {json.dumps(event)}')
    if not isinstance(event, dict):
        raise ValueError('The event is not a dict.')
    
    function_name = context.function_name

    for record in event.get('Records', []):
        msg = json.loads(gzip.decompress(base64.b64decode(record['body'])))
        msg['functionName'] = function_name
        param = Parameters(msg)
        
        logger.info(f'The parameters: execution_name: {param.execution_name}, taskId: {param.task_id}, '
                    f'function_name: {param.function_name}, parentTaskId: {param.parent_task_id}, '
                    f'merge: {param.merge}, deleteOnSuccess: {param.delete_on_success}, taskToken: {param.task_token}, '
                    f'data: {param.data}.')
        if param.task_token:
            logger.debug("Send task heartbeat to Amazon Step Function.")
            AWS_SFN.send_callback(task_token=param.task_token, function='send_task_heartbeat')

        if param.merge is True:
            logger.info('Merge is True, start subtasks to merge objects.')
            AWS_S3.merge_objects(param.data, delete_on_success=param.delete_on_success)
        else:
            if param.enrichment_plugins and EnrichProcessor is not None:
                logger.info('Merge is False, start subtasks to enrich and upload objects.')
                enrichment_processor = EnrichProcessor(source_type=param.source_type)
                AWS_S3.batch_copy_objects(param.data, delete_on_success=param.delete_on_success, 
                                          enrich_func=enrichment_processor.process or None, 
                                          enrich_plugins=param.enrichment_plugins)
            else:
                logger.info('Merge is False, start subtasks to copying objects.')
                AWS_S3.batch_copy_objects(param.data, delete_on_success=param.delete_on_success)

        logger.info(f'This subtask is completed, update {AWS_DDB_ETL_LOG.model.__table_name__}\'s'
                    ' subtask status to Succeeded.')
        if param.data:
            logger.info('This migration task is completed, and update migration subtask status to Succeeded.')
            AWS_DDB_ETL_LOG.update(execution_name=param.execution_name, task_id=param.task_id,
                                item={'endTime': datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%S.') + datetime.utcnow().strftime('%f')[:3] + 'Z', 'status': 'Succeeded',
                                    'functionName': function_name})
        check_parent_task_completion(param)


def check_parent_task_completion(param: Parameters) -> bool:
    callback_msg = {'statusCode': 200, 'hasObjects': False}
    completion_status = AWS_DDB_ETL_LOG.get_subtask_status_count(execution_name=param.execution_name,
                                                                 parent_task_id=param.parent_task_id,
                                                                 status='Succeeded')
    logger.info(f"Completion of subtasks, totalSubTask: {completion_status['totalSubTask']}"
                f", completed: {completion_status['taskCount']}.")

    if completion_status['totalSubTask'] == completion_status['taskCount']:
        callback_msg['hasObjects'] = False if completion_status['totalSubTask'] == 0 else True
        logger.info('All of migration subtasks are completed, update scanning task status to Succeeded.')
        AWS_DDB_ETL_LOG.update(execution_name=param.execution_name, task_id=param.parent_task_id,
                                item={'endTime': datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%S.') + datetime.utcnow().strftime('%f')[:3] + 'Z', 'status': 'Succeeded'})
        if param.task_token:
            logger.info("Send task success to Amazon Step Function.")
            AWS_SFN.send_callback(task_token=param.task_token, output=json.dumps(callback_msg),
                                    function='send_task_success')
        return True
    return False
