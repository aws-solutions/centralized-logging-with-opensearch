# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import boto3
import os

import logging

from botocore import config

from util.sys_enum_type import SOURCETYPE
from util.log_ingestion_svc import LogIngestionSvc
from util.exception import APIException
from util.aws_svc_mgr import SvcManager
from distutils.util import strtobool
from boto3.dynamodb.conditions import Attr

logger = logging.getLogger()
logger.setLevel(logging.INFO)

solution = os.environ.get("SOLUTION",
                          "SO8025/" + os.environ["SOLUTION_VERSION"])
user_agent_config = {"user_agent_extra": f"AwsSolution/{solution}"}
default_config = config.Config(**user_agent_config)
sts = boto3.client("sts", config=default_config)
dynamodb = boto3.resource("dynamodb", config=default_config)

app_log_ingestion_table_name = os.environ.get("APPLOGINGESTION_TABLE")
app_log_ingestion_table = dynamodb.Table(app_log_ingestion_table_name)
instance_group_table = dynamodb.Table(os.environ.get("INSTANCE_GROUP_TABLE_NAME"))
default_open_extra_metadata_flag = strtobool(
    os.environ.get("DEFAULT_OPEN_EXTRA_METADATA_FLAG", "true"))

default_open_containerd_runtime_flag = strtobool(
    os.environ.get("DEFAULT_OPEN_CONTAINERD_RUNTIME_FLAG", "false"))

_asg_ingestion_script_path = "./util/asg_ingestion_script/asg_ingestion_script.sh"

_bucket_name = os.environ.get("CONFIG_FILE_S3_BUCKET_NAME")
account_id = sts.get_caller_identity()["Account"]
region = os.environ.get("AWS_REGION")

class ASGDeploymentConfigurationMng:
    __group_id: str
    __log_ingestion_svc: LogIngestionSvc

    def __init__(self,
                 instance_group_id: str, asg_name: str):
        self.__group_id = instance_group_id
        self._asg_ingestion_script_path = _asg_ingestion_script_path
        self._bucket_name = _bucket_name
        self._asg_name = asg_name
        self.__log_ingestion_svc = LogIngestionSvc()
        

    def get_configuration(self):
        return self.__get_auto_scaling_group_deploy_content()
    
    def __get_auto_scaling_group_deploy_content(self) -> str:
        """
        Get ASG configuration.
        """
        # Handle cross account scenario
        group_table_resp = instance_group_table.get_item(
            Key={"id": self.__group_id})
        group_table_item = group_table_resp["Item"]
        deploy_account_id = group_table_item.get(
            "accountId") or account_id
        deploy_region = group_table_item.get("region") or region
        if deploy_account_id != account_id:
            svcMgr = SvcManager()
            link_account = svcMgr.get_link_account(
                sub_account_id=deploy_account_id, region=deploy_region)
            self._bucket_name = link_account.get("subAccountBucketName")

        if self.is_group_involved_in_ingestion(self.__group_id):     
            user_data_script = self.__log_ingestion_svc._render_template(
                self._asg_ingestion_script_path,
                BUCKET_NAME=self._bucket_name,
                ASG_NAME=self._asg_name,
            )
            return user_data_script
        else:
            return ""
    
    def is_group_involved_in_ingestion(self, groupId):
        conditions = Attr("sourceId").eq(groupId)
        conditions = conditions.__and__(Attr("status").eq("ACTIVE"))
        scan_resp = app_log_ingestion_table.scan(
            FilterExpression=conditions,
            ProjectionExpression="id",
        )
        if len(scan_resp['Items']) == 0:
            return False
        return True
