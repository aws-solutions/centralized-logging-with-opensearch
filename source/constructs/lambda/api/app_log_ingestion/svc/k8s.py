# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import os
import json
import re

from commonlib.logging import get_logger
from boto3.dynamodb.conditions import Attr
from botocore.exceptions import ClientError
from typing import List
from flb.distribution import FlbHandler
from commonlib import ErrorCode, APIException
from commonlib import AWSConnection, LinkAccountHelper
from commonlib.model import (
    LogSource,
    AppLogIngestion,
    StatusEnum,
)
from flb.flb_builder import K8sFlb

logger = get_logger(__name__)

conn = AWSConnection()

iam_res = conn.get_client(service_name="iam", client_type="resource")
# link account
sub_account_link_table_name = os.environ.get("SUB_ACCOUNT_LINK_TABLE_NAME")
account_helper = LinkAccountHelper(sub_account_link_table_name)


cwl_monitor_role_arn = os.environ.get("CWL_MONITOR_ROLE_ARN")


class EKSSourceHandler(FlbHandler):
    def role_arn2role_name(self, arn: str):
        return re.findall(r"/([-\w]+)$", arn, re.MULTILINE)[0]

    def create_ingestion(
        self, log_source: LogSource, app_log_ingestion: AppLogIngestion
    ):
        app_log_ingestion.status = StatusEnum.ACTIVE
        self._ingestion_dao.save(app_log_ingestion)
        ingestion_list = self._ingestion_dao.list_app_log_ingestions(
            Attr("sourceId")
            .eq(log_source.sourceId)
            .__and__(Attr("status").eq(StatusEnum.ACTIVE))
        )
        arn_list: List[str] = []
        for ingestion in ingestion_list:
            role_arn = ingestion.output.roleArn
            if role_arn:
                arn_list.append(role_arn)
        arn_list.append(cwl_monitor_role_arn)
        logger.info(f"Put role policy to {log_source.eks.logAgentRoleArn}")
        link_account = account_helper.get_link_account(
            log_source.accountId, log_source.region
        )
        iam_client = conn.get_client(
            service_name="iam",
            region_name=log_source.region,
            sts_role_arn=link_account.get("subAccountRoleArn") or "",
        )
        iam_client.put_role_policy(
            PolicyDocument=json.dumps(
                {
                    "Version": "2012-10-17",
                    "Statement": [
                        {
                            "Effect": "Allow",
                            "Action": "sts:AssumeRole",
                            "Resource": list(filter(bool, arn_list)),
                        }
                    ],
                }
            ),
            PolicyName=f"eks-log-src-{log_source.sourceId[:5]}",
            RoleName=self.role_arn2role_name(log_source.eks.logAgentRoleArn),
        )
        trust_account_set = [log_source.accountId]
        self.update_role_policy(
            trust_account_set,
            log_source.region,
            app_log_ingestion.output.roleName,
            app_log_ingestion.output.roleArn,
        )

    def get_deployment_content(
        self, log_source: LogSource, eks_ingestion_list: List[AppLogIngestion]
    ) -> str:
        sub_acct_cwl_monitor_role_arn = cwl_monitor_role_arn
        link_account = account_helper.get_link_account(
            log_source.accountId, log_source.region
        )
        eks_source = log_source.eks
        if link_account:
            sub_acct_cwl_monitor_role_arn = (
                link_account.get("subAccountCwlMonitorRoleArn") or cwl_monitor_role_arn
            )
            sts_role_arn = link_account.get("subAccountRoleArn", "")
            eks_client = conn.get_client("eks", sts_role_arn=sts_role_arn)
        else:
            eks_client = conn.get_client("eks")
        try:
            resp = eks_client.describe_cluster(name=eks_source.eksClusterName)
        except ClientError as e:
            if e.response["Error"]["Code"] == "ResourceNotFoundException":
                raise APIException(ErrorCode.ITEM_NOT_FOUND, "EKS cluster is not found")
            else:
                raise e

        cluster = resp["cluster"]
        logger.info(
            f'Describe eks cluster "{eks_source.eksClusterName}" reponse: {cluster}'
        )
        # Check domain status. domain creating in progress (if any) should be ignored.
        if cluster["status"] != "ACTIVE":
            raise APIException(
                ErrorCode.UNSUPPORTED_ACTION,
                "Cannot view EKS cluster, please check EKS cluster status",
            )
        eks_source.k8sVersion = cluster["version"]
        k8s_flb = K8sFlb(
            eks_source=eks_source,
            ingestion_list=eks_ingestion_list,
            sub_account_cwl_monitor_role_arn=sub_acct_cwl_monitor_role_arn,
        )
        return k8s_flb.generate_deployment_content()

    def get_sidecar_content(
        self, log_source: LogSource, ingestion: AppLogIngestion
    ) -> str:
        eks_ingestion_list: List[AppLogIngestion] = [ingestion]
        return self.get_deployment_content(log_source, eks_ingestion_list)
