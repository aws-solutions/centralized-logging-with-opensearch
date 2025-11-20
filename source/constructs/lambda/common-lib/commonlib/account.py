# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0


import os
import json
from string import Template
from datetime import datetime
from typing import Union

from .aws import DynamoDBUtil, AWSConnection
from .utils import paginate
from .exception import APIException, ErrorCode
from .logging import get_logger

logger = get_logger(__name__)

STATEMENT_TEMPLATE = """
{
    "Effect": "Allow",
    "Principal": {
        "AWS": "$ACCOUNT_ID"
    },
    "Action": "sts:AssumeRole",
    "Condition": {
    }
}
"""

POLICY_DOCUMENT_TEMPLATE = """
{
    "Version": "2012-10-17",
    "Statement": $STATEMENT
}
"""


class LinkAccountHelper:
    """Data Access Layer for Link Account table

    This should only be used in Backend APIs.

    Note that we don't implement soft delete for this.
    """

    def __init__(self, link_account_table_name) -> None:
        self._ddb_util = DynamoDBUtil(link_account_table_name)
        conn = AWSConnection()
        sts = conn.get_client("sts")
        self.events_client = conn.get_client("events")
        self.iam_client = conn.get_client("iam")
        self.iam_res = conn.get_client("iam", client_type="resource")
        self._default_account_id = sts.get_caller_identity()["Account"]
        self._default_region = os.environ.get("AWS_REGION")
        self._cwl_role_name = os.environ.get("CWL_MONITOR_ROLE_NAME")
        self._cwl_role_arn = os.environ.get("CWL_MONITOR_ROLE_ARN")
        self._pk = "subAccountId"
        self._sk = "region"

    def _get_ddb_key(self, account_id: str = "", region: str = ""):
        account_id = account_id or self._default_account_id
        region = region or self._default_region
        if account_id == self._default_account_id and region == self._default_region:
            # Current account and region will be ignored.
            return {}
        return {self._pk: account_id, self._sk: region}

    def get_link_account(self, account_id: str = "", region: str = "") -> dict:
        """Get a sub account link

        If it's current account and region, return {}

        Args:
            account_id (str, optional): account id. Defaults to "" (current account).
            region (str, optional): AWS region. Defaults to "" (current region).

        Raises:
            APIException: when account is not found

        Returns:
            dict: account details in dict.
        """
        key = self._get_ddb_key(account_id, region)
        if not key:
            # return empty dict for current account and region
            return {}
        account = self._ddb_util.get_item(key)
        if not account:
            raise APIException(ErrorCode.ACCOUNT_NOT_FOUND)
        return account

    def update_link_account(
        self,
        account_id: str = "",
        region: str = "",
        windows_agent_install_doc: str = "",
        windows_agent_conf_doc: str = "",
        agent_status_check_doc: str = "",
        agent_install_doc: str = "",
    ) -> Union[dict, str]:
        """Get a sub account link

        If it's current account and region, return {}

        Args:
            account_id (str, optional): account id. Defaults to "" (current account).
            region (str, optional): AWS region. Defaults to "" (current region).

        Raises:
            APIException: when account is not found

        Returns:
            dict: account details in dict.
        """
        key = self._get_ddb_key(
            account_id or self._default_account_id, region or self._default_region
        )
        if not key:
            # return empty dict for current account and region
            return {}
        account = self._ddb_util.get_item(key)
        if not account:
            raise APIException(ErrorCode.ACCOUNT_NOT_FOUND)
        account["windowsAgentInstallDoc"] = windows_agent_install_doc
        account["windowsAgentConfDoc"] = windows_agent_conf_doc
        account["agentStatusCheckDoc"] = agent_status_check_doc
        account["agentInstallDoc"] = agent_install_doc
        account["updatedAt"] = datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")
        self.events_client.put_permission(
            EventBusName="default",
            Action="events:PutEvents",
            Principal=account_id,
            StatementId=f"CLOAcceptFrom{account_id}",
        )
        self._ddb_util.put_item(account)
        return "OK"

    def create_sub_account_link(
        self, account_id: str = "", region: str = "", **extra_info
    ) -> str:
        """Create a sub account link

        Args:
            account_id (str, optional): account id. Defaults to "" (current account).
            region (str, optional): AWS region. Defaults to "" (current region).
            extra_info: Other information

        Raises:
            APIException: When account already exists

        Returns:
            str: Status
        """
        key = self._get_ddb_key(account_id, region)
        account = self._ddb_util.get_item(key)

        if account:
            raise APIException(ErrorCode.ACCOUNT_ALREADY_EXISTS)

        # Update the central cloudwatch role's trust relationships for sub account agent to send monitoring data
        try:
            self.update_role(self._cwl_role_name, [account_id])
        except Exception as err:
            logger.error(err)
            raise APIException(ErrorCode.UPDATE_CWL_ROLE_FAILED)

        self.events_client.put_permission(
            EventBusName="default",
            Action="events:PutEvents",
            Principal=account_id,
            StatementId=f"CLOAcceptFrom{account_id}",
        )

        item = extra_info
        item[self._pk] = account_id or self._default_account_id
        item[self._sk] = region or self._default_region
        item["cwlMonitorRoleArn"] = self._cwl_role_arn
        item["status"] = "ACTIVE"
        item["createdAt"] = datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")

        self._ddb_util.put_item(item)
        return "OK"

    def list_sub_account_links(self, page=1, count=20) -> tuple[int, list]:
        """List sub account links"""
        items = self._ddb_util.list_items()
        total, accounts = paginate(items, page, count)
        return total, accounts

    def delete_sub_account_link(self, account_id: str, region=""):
        """Delete sub account link"""

        try:
            self.events_client.remove_permission(
                StatementId=f"CLOAcceptFrom{account_id}",
                EventBusName="default",
                RemoveAllPermissions=False,
            )
        except self.events_client.exceptions.ResourceNotFoundException:
            logger.info(f"Permission CLOAcceptFrom{account_id} not found")
        key = self._get_ddb_key(account_id, region)
        return self._ddb_util.delete_item(key)

    @property
    def default_account_id(self) -> str:
        """Current AWS Account ID"""
        return self._default_account_id

    @property
    def default_region(self) -> str:
        """Current AWS Region"""
        return self._default_region

    @default_region.setter
    def default_region(self, value):
        self._default_region = value

    def update_role(self, role_name: str, sub_account_ids=list()):
        """
        update the centralized role, like cloudwatch log access role
        """
        trust_account_set = set()
        for sub_account_id in sub_account_ids:
            trust_account_set.add(sub_account_id)

        trust_entities = list()

        # exist, update assume role policy document
        response = self.iam_client.get_role(RoleName=role_name)
        assume_role_policy_document_json = response["Role"]["AssumeRolePolicyDocument"]
        assume_role_statement = assume_role_policy_document_json["Statement"]
        # remove duplicate accounts
        assume_role_statement_str = json.dumps(assume_role_statement)
        for trust_account in trust_account_set.copy():
            if assume_role_statement_str.find(trust_account) > 0:
                trust_account_set.remove(trust_account)

        if len(trust_account_set) > 0:
            for trust_account in trust_account_set:
                statement = self.generate_assume_role_statement_document(
                    account_id=trust_account
                )
                trust_entities.append(json.loads(statement))

            trust_entities.extend(assume_role_statement)
            # generate policy document for assume role
            assume_role_policy_document = self.generate_assume_role_policy_document(
                trust_entities
            )
            assume_role_policy = self.iam_res.AssumeRolePolicy(role_name)
            assume_role_policy.update(PolicyDocument=assume_role_policy_document)

    def generate_assume_role_policy_document(self, statement_list=list()) -> str:
        statement_list_str = json.dumps(statement_list)
        return self.render_template(
            POLICY_DOCUMENT_TEMPLATE, STATEMENT=statement_list_str
        )

    def generate_assume_role_statement_document(self, account_id: str) -> str:
        if self._default_region in ["cn-north-1", "cn-northwest-1"]:
            account_str = f"arn:aws-cn:iam::{account_id}:root"
        else:
            account_str = f"arn:aws:iam::{account_id}:root"

        return self.render_template(STATEMENT_TEMPLATE, ACCOUNT_ID=account_str)

    @staticmethod
    def render_template(template, **kwds):
        s = Template(template)
        return s.safe_substitute(**kwds).strip()
