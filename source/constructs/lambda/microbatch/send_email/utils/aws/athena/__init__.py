# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import time
from datetime import datetime
from typing import Union
from utils.aws.commonlib import AWSConnection
from utils.logger import logger


class AthenaClient:
    """Amazon Athena Client, used to interact with Amazon Athena."""

    def __init__(self):
        conn = AWSConnection()
        self._athena_client = conn.get_client("athena")

    def get_query_execution(self, query_execution_id: str) -> dict:
        """Returns information about a single execution of a query if you have access to the workgroup in which the query ran. 
           Each time a query executes, information about the query execution is saved with a unique ID.

        :param query_execution_id (str): The unique ID of the query execution.

        Returns: dict
        """
        response = {'QueryExecution': {'QueryExecutionId': ''}}
        try:
            query_execution_response = self._athena_client.get_query_execution(QueryExecutionId=query_execution_id)
        except Exception as e:
            logger.error(e)
            return response
        response['QueryExecution'] = query_execution_response['QueryExecution']
        logger.info(f'Get Athena query execution information, QueryExecutionId: {query_execution_id}, Response: {response}.')
        return response

    def get_query_execution_status(self, execution_info: dict) -> dict:
        """The state of query execution via get_query_execution' response

       :param execution_info (dict): get_query_execution' response

        Returns: str: the state of query execution, e.g. RUNNING or FAILED to QUEUED or CANCELLED or SUCCEEDED
        """
        iso8601_strftime_pattern_prefix = '%Y-%m-%dT%H:%M:%S.'
        
        submission_date_time = execution_info['QueryExecution']['Status']['SubmissionDateTime']
        submission_date_time = submission_date_time.utcnow().strftime(iso8601_strftime_pattern_prefix) + submission_date_time.utcnow().strftime('%f')[:3] + 'Z'
        
        completion_date_time = execution_info['QueryExecution']['Status'].get('CompletionDateTime')
        if not isinstance(completion_date_time, datetime):
            completion_date_time = datetime.utcnow().strftime(iso8601_strftime_pattern_prefix) + datetime.utcnow().strftime('%f')[:3] + 'Z'
        else:
            completion_date_time = completion_date_time.utcnow().strftime(iso8601_strftime_pattern_prefix) + completion_date_time.utcnow().strftime('%f')[:3] + 'Z'
        
        return {'queryExecutionId': execution_info['QueryExecution']['QueryExecutionId'], 
                'state': execution_info['QueryExecution']['Status']['State'],
                'query': execution_info['QueryExecution']['Query'], 
                'submissionDateTime': submission_date_time,
                'completionDateTime': completion_date_time}

    def start_query_execution(self, query_string, work_group: Union[str, None] = None, output_location: Union[str, None] = None, asynchronous: bool = False, interval: int = 1) -> dict:
        """Call start_query_execution to execute SQL statement, if query_string is a DML statement, you must specify work_group and output_location.
        
        :param query_string (_type_): SQL statement need to execution.
        :param work_group (Union[str, None], optional): Required when query_string is a DML statement. Defaults to None.
        :param output_location (Union[str, None], optional): Required when query_string is a DML statement. Defaults to None.
        :param asynchronous (bool, optional): When it is true, wait for the execution to be completed and return the execution result; 
                when it is false, only query_execution_id will be returned. Defaults to False.

        Returns:
            dict: response
        """
        kwargs = {}
        if work_group is not None:
            kwargs['WorkGroup'] = work_group
        if output_location is not None:
            kwargs['ResultConfiguration'] = {"OutputLocation": output_location}
            
        logger.debug(f'Starting Athena query execution, this queryString is {query_string}.')
        try:
            query_execution_response = self._athena_client.start_query_execution(
                QueryString=query_string,
                **kwargs
            )
        except Exception as e:
            logger.error(e)
            return {
                'QueryExecution': {
                    'QueryExecutionId': '', 
                    'Query': query_string,
                    'Status': {
                        'State': 'FAILED',
                        'SubmissionDateTime': datetime.now(),
                        'CompletionDateTime': datetime.now()
                        }
                    }
                }
        
        query_execution_id = query_execution_response['QueryExecutionId']
        if asynchronous is True:
            response = self.get_query_execution(query_execution_id=query_execution_id)
            logger.info(f'Start query execution is asynchronous, the response is {response}.')
            return response
        
        while True:
            response = self.get_query_execution(query_execution_id)
            if response['QueryExecution']['Status']['State'] in ('SUCCEEDED', 'FAILED', 'CANCELLED'):
                break
            # It is not recommended to modify it. When there are too many partitions, it is easy to cause lambda execution timeout.
            time.sleep(interval)
        logger.info(f'Start query execution is synchronous, the response is {response}.')
        return response
