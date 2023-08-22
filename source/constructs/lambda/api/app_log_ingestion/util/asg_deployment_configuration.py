# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import boto3
import os

import logging

from botocore import config
from string import Template

from commonlib import LinkAccountHelper
from commonlib.dao import AppLogIngestionDao, LogSourceDao
from commonlib.model import (
    LogSource,
)

from distutils.util import strtobool
from boto3.dynamodb.conditions import Attr

logger = logging.getLogger()
logger.setLevel(logging.INFO)

solution_version = os.environ.get("SOLUTION_VERSION", "v1.0.0")
solution_id = os.environ.get("SOLUTION_ID", "SO8025")
user_agent_config = {
    "user_agent_extra": f"AwsSolution/{solution_id}/{solution_version}"
}
default_config = config.Config(**user_agent_config)
sts = boto3.client("sts", config=default_config)
dynamodb = boto3.resource("dynamodb", config=default_config)

app_log_ingestion_table_name = os.environ.get("APP_LOG_INGESTION_TABLE_NAME")
log_source_table_name = os.environ.get("LOG_SOURCE_TABLE_NAME")
default_open_extra_metadata_flag = strtobool(
    os.environ.get("DEFAULT_OPEN_EXTRA_METADATA_FLAG", "true")
)

default_open_containerd_runtime_flag = strtobool(
    os.environ.get("DEFAULT_OPEN_CONTAINERD_RUNTIME_FLAG", "false")
)

_asg_ingestion_script_path = "./util/asg_ingestion_script/asg_ingestion_script.sh"

_bucket_name = os.environ.get("CONFIG_FILE_S3_BUCKET_NAME")
account_id = sts.get_caller_identity()["Account"]
region = os.environ.get("AWS_REGION")

# link account
sub_account_link_table_name = os.environ.get("SUB_ACCOUNT_LINK_TABLE_NAME")
account_helper = LinkAccountHelper(sub_account_link_table_name)

ingestion_dao = AppLogIngestionDao(table_name=app_log_ingestion_table_name)
log_source_dao = LogSourceDao(table_name=log_source_table_name)


class ASGDeploymentConfigurationMng:
    __group_id: str

    def __init__(self, instance_group_id: str, asg_name: str):
        self.__group_id = instance_group_id
        self._asg_ingestion_script_path = _asg_ingestion_script_path
        self._bucket_name = _bucket_name
        self._asg_name = asg_name

    def get_configuration(self):
        return self.__get_auto_scaling_group_deploy_content()

    def __get_auto_scaling_group_deploy_content(self) -> str:
        """
        Get ASG configuration.
        """
        # Handle cross account scenario
        group_table_item: LogSource = log_source_dao.get_log_source(self.__group_id)
        deploy_account_id = group_table_item.accountId or account_id
        deploy_region = group_table_item.region or region
        if deploy_account_id != account_id:
            link_account = account_helper.get_link_account(
                account_id=deploy_account_id, region=deploy_region
            )
            self._bucket_name = link_account.get("subAccountBucketName")

        if self.is_group_involved_in_ingestion(self.__group_id):
            user_data_script = self._render_template(
                self._asg_ingestion_script_path,
                SOLUTION_VERSION=solution_version,
                BUCKET_NAME=self._bucket_name,
                ASG_NAME=self._asg_name,
            )
            return user_data_script
        else:
            return ""

    def is_group_involved_in_ingestion(self, source_id):
        scan_resp = ingestion_dao.get_app_log_ingestions_by_source_id(source_id)

        if len(scan_resp) == 0:
            return False
        return True

    def _render_template(self, filename, **kwds):
        with open(filename, "r") as fp:
            s = Template(fp.read())
            return s.safe_substitute(**kwds)
