# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import logging
import os
import boto3
from boto3.dynamodb.conditions import Attr
from botocore import config
from enum import Enum

logger = logging.getLogger()
logger.setLevel(logging.INFO)

solution_version = os.environ.get("SOLUTION_VERSION", "v1.0.0")
solution_id = os.environ.get("SOLUTION_ID", "SO8025")
user_agent_config = {
    "user_agent_extra": f"AwsSolution/{solution_id}/{solution_version}"
}
default_config = config.Config(**user_agent_config)
default_region = os.environ.get("AWS_REGION")

sts = boto3.client("sts", config=default_config)
account_id = sts.get_caller_identity()["Account"]

# Get DDB resource.
dynamodb = boto3.resource("dynamodb", config=default_config)
sub_account_link_table_name = os.environ.get("SUB_ACCOUNT_LINK_TABLE_NAME")
sub_account_link_table = dynamodb.Table(sub_account_link_table_name)


class Boto3API(Enum):
    CLIENT = 'client'
    RESOURCE = 'resource'


class DocumentType(Enum):
    AGENT_INSTALL = 'agentInstallDoc'
    AGENT_CONFIGURATION = 'agentConfDoc'


class SvcManager():
    role_session_name = 'LogHubAcctAppLog'

    def get_client(self,
                   sub_account_id: str,
                   service_name: str,
                   type: Boto3API,
                   region=default_region):
        """Get the boto3 client of the linked account.

        Args:
            sub_account_id (str): _description_
            service_name (str): _description_
            type (Boto3API): _description_
            region_name (_type_, optional): _description_. Defaults to default_region.

        Returns:
            boto3.client you specify 
        """
        if not region:
            region = default_region
        sub_account = self.get_link_account(sub_account_id)
        logger.info(
            f'accountId is {account_id}, subAccountId is {sub_account_id}')
        if sub_account and sub_account_id != account_id:
            logger.info(
                f"subAccountRoleArn is {sub_account.get('subAccountRoleArn')}")
            log_account = sts.assume_role(
                RoleArn=sub_account.get('subAccountRoleArn'),
                RoleSessionName=self.role_session_name)

            if type.value == 'client':
                return boto3.client(
                    service_name,
                    region_name=region,
                    aws_access_key_id=log_account['Credentials']
                    ['AccessKeyId'],
                    aws_secret_access_key=log_account['Credentials']
                    ['SecretAccessKey'],
                    aws_session_token=log_account['Credentials']
                    ['SessionToken'],
                    config=default_config)
            else:
                return boto3.resource(
                    service_name,
                    region_name=region,
                    aws_access_key_id=log_account['Credentials']
                    ['AccessKeyId'],
                    aws_secret_access_key=log_account['Credentials']
                    ['SecretAccessKey'],
                    aws_session_token=log_account['Credentials']
                    ['SessionToken'],
                    config=default_config)

        else:
            if type.value == 'client':
                return boto3.client(service_name,
                                    region_name=region,
                                    config=default_config)
            else:
                return boto3.resource(service_name,
                                      region_name=region,
                                      config=default_config)

    def get_link_account(self, sub_account_id: str, region=default_region):
        if not region:
            region = default_region
        if sub_account_id and sub_account_id != account_id:
            conditions = Attr("status").eq("ACTIVE")
            conditions = conditions.__and__(
                Attr("subAccountId").eq(sub_account_id))
            conditions = conditions.__and__(Attr("region").eq(region))
            response = sub_account_link_table.scan(
            FilterExpression=conditions,
            ProjectionExpression="id, #subAccountId, #subAccountName, #status, subAccountRoleArn, agentInstallDoc, " \
            "agentConfDoc, subAccountBucketName, subAccountStackId, createdDt,#region ",
            ExpressionAttributeNames={
                "#subAccountId": "subAccountId",
                "#subAccountName": "subAccountName",
                "#status": "status",
                "#region": "region"
            },
            )
            # Assume all items are returned in the scan request
            result = response["Items"]
            if result and len(result) == 1:
                return result[0]

        return None

    def get_document_name(self,
                          sub_account_id: str,
                          type: DocumentType,
                          region=default_region) -> str:
        """ Get the ssm document name for Fluent Bit 

        Args:
            sub_account_id (str): linked account id
            type (DocumentType):  AGENT_INSTALL is the ssm document for Fluent-Bit installation, AGENT_CONFIGURATION is the ssm document for Fluent-Bit configuration

        Returns:
            str: SSM Document name
        """
        sub_account = self.get_link_account(sub_account_id, region=region)
        logger.info(
            f'accountId is {account_id}, subAccountId is {sub_account_id}')
        if sub_account and sub_account_id != account_id:
            return sub_account.get(type.value, '')
        else:
            return os.environ.get('AGENT_INSTALLATION_DOCUMENT')

    def get_sub_account_links(self, page=1, count=1000):
        """List sub account links"""
        logger.info(
            f"List Sub Account Link from DynamoDB in page {page} with {count} of records"
        )
        conditions = Attr("status").eq("ACTIVE")
        response = sub_account_link_table.scan(
            FilterExpression=conditions,
            ProjectionExpression=
            "id, #subAccountId, #subAccountName, #status, subAccountRoleArn, agentInstallDoc, "
            "agentConfDoc, subAccountBucketName, subAccountStackId, createdDt ",
            ExpressionAttributeNames={
                "#subAccountId": "subAccountId",
                "#subAccountName": "subAccountName",
                "#status": "status",
            },
        )

        # Assume all items are returned in the scan request
        items = response["Items"]
        # build pagination
        total = len(items)
        start = (page - 1) * count
        end = page * count

        if start > total:
            start, end = 0, count
        logger.info(f"Return result from {start} to {end} in total of {total}")

        # set type to list type
        results = []
        for item in items:
            result = {}
            result["id"] = item["id"]
            result["subAccountId"] = item["subAccountId"]
            result["subAccountName"] = item["subAccountName"]
            result["subAccountRoleArn"] = item["subAccountRoleArn"]
            result["agentInstallDoc"] = item["agentInstallDoc"]
            result["agentConfDoc"] = item["agentConfDoc"]
            result["subAccountBucketName"] = item["subAccountBucketName"]
            result["subAccountStackId"] = item["subAccountStackId"]
            result["status"] = item["status"]
            result["createdDt"] = item["createdDt"]
            results.append(result)

        results.sort(key=lambda x: x["createdDt"], reverse=True)
        return results[start:end]
