# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

from botocore.exceptions import ClientError
from utils.helpers import logger, AWSConnection


class SFNClient:
    """Amazon Step Function Client, used to interact with Amazon Step Function"""

    def __init__(self):
        conn = AWSConnection()
        self._sfn_client = conn.get_client("stepfunctions")

    def send_callback(self, task_token, output='', error='', cause='', function='send_task_success') -> bool:
        try:
            self._sfn_client.send_task_heartbeat(taskToken=task_token)
            if function == 'send_task_success':
                self._sfn_client.send_task_success(taskToken=task_token, output=output) 
            elif function == 'send_task_failure':
                self._sfn_client.send_task_failure(taskToken=task_token, error=error, cause=cause)
            return True
        except ClientError as e:
            logger.error(e.response['Error']['Message'])
            return False