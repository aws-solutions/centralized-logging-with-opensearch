# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import time
import json
import random
from typing import Union
from utils.helpers import logger, AWSConnection


class IAMClient:
    """Amazon IAM Client, used to interact with Amazon IAM."""

    def __init__(self):
        conn = AWSConnection()
        self._iam_client = conn.get_client("iam")
    
    def get_policy_document(self, arn: str, sid: Union[str, None] = None, exclusive: list[str] = []) -> dict:
        """Using this API, you can get the default version document of a specified policy.

        :param arn (str): The arn of the policy.
        :param sid (str): An unique identifier for document in a policy.
        :param exclusive (dict, optional): Policy Sid that needs to be filtered out. Defaults to [].

        Returns:
            dict: The default version document of policy.
        """
            
        policy_info = self._iam_client.get_policy(PolicyArn=arn)['Policy']
        default_version_id = policy_info['DefaultVersionId']
        policy_version = self._iam_client.get_policy_version(PolicyArn=arn, VersionId=default_version_id)['PolicyVersion']
            
        if sid is None and not exclusive:
            return policy_version
        
        new_statement = []

        for statement in policy_version['Document']['Statement']:
            if sid is not None and statement.get('Sid') == sid:
                new_statement = [statement]
                break
            elif sid is None and statement.get('Sid') not in exclusive:
                new_statement.append(statement)
        policy_version['Document']['Statement'] = new_statement
        return policy_version
    
    def update_policy_document(self, arn: str, sid: str, policy_document: dict, tries: int = 3) -> dict:
        """Using this API, you can create or replace document in a specified policy.

        :param arn (str): The arn of the policy.
        :param sid (str): An unique identifier for document in a policy.
        :param policy_document (dict): The JSON policy document that you want to use as the content for the new policy.
        :param tries (int): The maximum number of attempts. default: 3, -1 (infinite).
        
        """        
        tries = 1 if tries == 0 else tries
        exception = None
        
        policy_document['Sid'] = sid
        
        while tries:
            policy_version =  self.get_policy_document(arn=arn, exclusive=[sid])
            
            policy_version['Document']['Statement'].append(policy_document)
            policy_version['Document'] = json.dumps(policy_version['Document'])

            self.delete_oldest_policy_version(arn=arn)
            
            try:
                self._iam_client.create_policy_version(PolicyArn=arn, PolicyDocument=policy_version['Document'], SetAsDefault=True)
            except Exception as e:
                exception = e
                logger.warning(e)
                
            if self.get_policy_document(arn=arn, sid=sid)['Document']['Statement']:
                logger.info(f'New document already exists in Policy, continuing.')
                exception = None
                break
            
            delay = random.uniform(0.0, 3.0)
            logger.warning(f'Document does not exist in Policy, retrying in {delay} seconds...')
            time.sleep(delay)
            tries -= 1
        
        if exception is not None:
            raise exception
            
        return self.get_policy_document(arn=arn)

    def delete_oldest_policy_version(self, arn: str) -> None:
        """Using this API, you can delete oldest policy version.

        :param arn (str): The arn of the policy.
 
        """
        policy_versions = self._iam_client.list_policy_versions(PolicyArn=arn)
        
        version_ids = [int(document['VersionId'][1:]) for document in policy_versions['Versions'] if document['IsDefaultVersion'] is False]
        for version_id in sorted(version_ids):
            try:
                self._iam_client.delete_policy_version(PolicyArn=arn, VersionId=f'v{version_id}')
                break
            except Exception as e:
                logger.error(e)

    def delete_policy_document(self, arn: str , sid: str, tries: int = 3) -> dict:
        """Using this API, you can delete a statement in a specified policy. statements cannot be empty.

        :param arn (str): The arn of the policy.
        :param sid (str): An unique identifier for document in a policy.
        :param tries (int): The maximum number of attempts. default: 3, -1 (infinite).
        
        Returns:
            dict: response
        """
        tries = 1 if tries == 0 else tries
        exception = None
        
        while tries:
            policy_version =  self.get_policy_document(arn=arn, exclusive=[sid])
            policy_version['Document'] = json.dumps(policy_version['Document'])
            
            self.delete_oldest_policy_version(arn=arn)
            
            try:
                self._iam_client.create_policy_version(PolicyArn=arn, PolicyDocument=policy_version['Document'], SetAsDefault=True)
            except Exception as e:
                exception = e
                logger.warning(e)
                
            if not self.get_policy_document(arn=arn, sid=sid)['Document']['Statement']:
                logger.info(f'Document no longer exists in Policy, continuing.')
                exception = None
                break
            
            delay = random.uniform(0.0, 3.0)
            logger.warning(f'Document still exists in Policy, retrying in {delay} seconds...')
            time.sleep(delay)
            tries -= 1
        
        if exception is not None:
            raise exception
        
        return self.get_policy_document(arn=arn)
    
    def get_role_policy(self, role_name: str, policy_name: str) -> dict:
        """Using this API, you can retrieves the specified inline policy document that is embedded with the specified IAM role.
        
        see https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/iam/client/get_role_policy.html
        
        :param role_name (str): The name of the role.
        :param policy_name (str):The name of the policy.
        
        Returns:
            dict: response
        """
        try:
            response = self._iam_client.get_role_policy(RoleName=role_name, PolicyName=policy_name)
        except Exception as e:
            logger.info(e)
            response = {}
        return response
    
    def put_role_policy(self, role_name: str, policy_name: str, policy_document: dict) -> dict:
        """Using this API, you can adds or updates an inline policy document that is embedded in the specified IAM role.
        
        see https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/iam/client/put_role_policy.html
        
        :param role_name (str): The name of the role.
        :param policy_name (str):The name of the policy.
        
        Returns:
            dict: response
        """
        if self.get_role_policy(role_name=role_name, policy_name=policy_name):
            self._iam_client.delete_role_policy(RoleName=role_name, PolicyName=policy_name)

        return self._iam_client.put_role_policy(RoleName=role_name, PolicyName=policy_name, PolicyDocument=json.dumps(policy_document))
        
    def delete_role_policy(self, role_name: str, policy_name: str) -> dict:
        """Using this API, you can delete a inline policy in a specified role.
        
        see https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/iam/client/delete_role_policy.html

        :param role_name (str): The name of the role.
        :param policy_name (str):The name of the policy.
        
        Returns:
            dict: response
        """
        if self.get_role_policy(role_name=role_name, policy_name=policy_name):
            return self._iam_client.delete_role_policy(RoleName=role_name, PolicyName=policy_name)
        return {}
    
    def get_role(self, role_name: str) -> dict:
        """Using this API, you can retrieves information about the specified role, including the role’s path, GUID, ARN, and the role’s trust policy that grants permission to assume the role.
        
        see https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/iam/client/get_role.html

        :param role_name (str): The name of the role.
        
        Returns:
            dict: response
        """
        return self._iam_client.get_role(RoleName=role_name)
        
    def update_assume_role_policy(self, role_name: str, policy_document: dict) -> dict:
        """Using this API, you can updates the policy that grants an IAM entity permission to assume a role.
        
        see https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/iam/client/update_assume_role_policy.html

        :param role_name (str): The name of the role.
        :param policy_document (dict): The JSON policy document that you want to use as the content for the new policy.
        
        Returns:
            dict: response
        """
        return self._iam_client.update_assume_role_policy(RoleName=role_name, PolicyDocument=json.dumps(policy_document))

    def add_service_principal_to_assume_role_policy(self, role_name: str, service_principal: str, tries: int = 3) -> dict:
        """Using this API, you can add a service principal to assume role policy of role.
        
        :param role_name (str): The name of the role.
        :param service_principal (dict): The service principal name. e.g ec2.amazonaws.com
        :param tries (int): The maximum number of attempts. default: 3, -1 (infinite).
        
        Returns:
            dict: response
        """
        tries = 1 if tries == 0 else tries
        exception = None
        response = {}

        while tries:
            try:
                role_info = self.get_role(role_name=role_name)
                assume_role_policy_document = role_info['Role']['AssumeRolePolicyDocument']
                
                statement = {
                    'Effect': 'Allow', 
                    'Principal': {
                        'Service': service_principal
                        }, 
                    'Action': 'sts:AssumeRole'
                    }
                if statement in assume_role_policy_document['Statement']:
                    exception = None
                    break
                
                assume_role_policy_document['Statement'].append(statement)
                response = self.update_assume_role_policy(role_name=role_name, policy_document=assume_role_policy_document)
                exception = None
            except Exception as e:
                exception = e
                delay = random.uniform(0.0, 30.0)
                logger.warning(f'Add service principal to assume role policy failed, retrying in {delay} seconds...')
                time.sleep(delay)
                tries -= 1

        if exception is not None:
            raise exception
        return response

