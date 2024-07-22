# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import time
import json
import gzip
import base64
import random
from typing import Iterator, Union
from utils.helpers import logger, AWSConnection


class SQSClient:
    def __init__(self):
        conn = AWSConnection()
        self._sqs_client = conn.get_client("sqs")

    def send_message(self, url: str, msg: dict = {}) -> None:
        return self._sqs_client.send_message(QueueUrl=url,
                                                 MessageBody=base64.b64encode(
                                                     gzip.compress(bytes(json.dumps(msg), encoding='utf-8'))).decode(
                                                     'utf-8'))

    def receive_message(self, url: str, attribute_names: list = ['ALL'], max_num: int = 10) -> Iterator[dict]:
        logger.info(f'Receiving message from SQS {url}.')
        for message in  self._sqs_client.receive_message(QueueUrl=url, 
                                                         AttributeNames=attribute_names, 
                                                         MaxNumberOfMessages=max_num).get('Messages', []):
            body = json.loads(gzip.decompress(base64.b64decode(message['Body'])))
            logger.info(f'The message body is {body}.')
            yield body

    def get_queue_url(self, name):
        return self._sqs_client.get_queue_url(QueueName=name).get('QueueUrl')
    
    def get_queue_policy(self, url: str, sid: Union[str, None] = None, exclusive: list[str] = []) -> dict:
        """Using this API, you can get the policy of a specified queue.

        :param url (str): The url of the queue.
        :param sid (str): An unique identifier for document in a policy.
        :param exclusive (dict, optional): Policy Sid that needs to be filtered out. Defaults to [].

        Returns:
            dict: The policy of a queue.
        """
        queue_policy = self._sqs_client.get_queue_attributes(QueueUrl=url, AttributeNames=['Policy']).get('Attributes', {}).get('Policy')
        if not queue_policy:
            queue_policy = '{"Version": "2012-10-17", "Statement": []}'
            
        queue_policy = json.loads(queue_policy)
        
        if sid is None and not exclusive:
            return queue_policy
        
        new_statement = []
        for statement in queue_policy['Statement']:
            if sid is not None and statement.get('Sid') == sid:
                new_statement = [statement]
                break
            elif sid is None and statement.get('Sid') not in exclusive:
                new_statement.append(statement)
        queue_policy['Statement'] = new_statement
        return queue_policy
    
    def update_queue_policy(self, arn: str, sid: str, policy_document: dict, tries: int = 3) -> dict:
        """Using this API, you can create or replace policy in a specified queue.

        :param arn (str): The arn of the queue.
        :param sid (str): An unique identifier for document in a policy.
        :param policy_document (dict): The JSON policy document that you want to use as the content for the new policy.
        :param tries (int): The maximum number of attempts. default: 3, -1 (infinite).
        
        Returns:
            dict: response
        """
        tries = 1 if tries == 0 else tries
        exception = None
        
        policy_document['Sid'] = sid
        queue_name = arn.split(':')[-1]
        queue_url = self.get_queue_url(queue_name)
        
        while tries:
            queue_policy = self.get_queue_policy(url=queue_url, exclusive=[sid])
            queue_policy['Statement'].append(policy_document)
            
            try:
                self._sqs_client.set_queue_attributes(QueueUrl=queue_url, Attributes={'Policy': json.dumps(queue_policy)})
            except Exception as e:
                exception = e
                logger.warning(e)
                
            if self.get_queue_policy(url=queue_url, sid=sid)['Statement']:
                logger.info(f'New Statement already exists in Queue Policy Document, continuing.')
                exception = None
                break
            
            delay = random.uniform(0.0, 3.0)
            logger.warning(f'New Statement does not exists in Queue Policy Document, retrying in {delay} seconds...')
            time.sleep(delay)
            tries -= 1
        
        if exception is not None:
            raise exception

        return self.get_queue_policy(url=queue_url)
    
    def delete_queue_policy(self, arn: str , sid: str, tries: int = 3) -> dict:
        """Using this API, you can delete a policy document in a specified queue.
           If the statement is empty after deleting the sid, delete the entire policy, 
           if it is not empty, keep the remaining policy.

        :param arn (str): The arn of the queue.
        :param sid (str): An unique identifier for document in a policy.
        :param tries (int): The maximum number of attempts. default: 3, -1 (infinite).
        
        Returns:
            dict: response
        """
        tries = 1 if tries == 0 else tries
        exception = None
        
        queue_name = arn.split(':')[-1]
        queue_url = self.get_queue_url(queue_name)
        
        while tries:
            queue_policy = self.get_queue_policy(url=queue_url, exclusive=[sid])
            queue_policy_str = json.dumps(queue_policy)
            if not queue_policy['Statement']:
                queue_policy_str = ''

            try:
                self._sqs_client.set_queue_attributes(QueueUrl=queue_url, Attributes={'Policy': queue_policy_str})
            except Exception as e:
                exception = e
                logger.warning(e)
                
            if not self.get_queue_policy(url=queue_url, sid=sid)['Statement']:
                logger.info(f'Statement no longer exists in Queue Policy Document, continuing.')
                exception = None
                break
            
            delay = random.uniform(0.0, 3.0)
            logger.warning(f'Statement still exists in Queue Policy Document, retrying in {delay} seconds...')
            time.sleep(delay)
            tries -= 1
        
        if exception is not None:
            raise exception
        
        return self.get_queue_policy(url=queue_url)
