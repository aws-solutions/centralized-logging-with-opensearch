# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import json
import logging
import os

from typing import Set, List
from svc.ec2 import EC2SourceHandler
from commonlib import AWSConnection, AppSyncRouter, LinkAccountHelper
from commonlib.dao import (
    AppLogIngestionDao,
    LogSourceDao,
    InstanceDao,
    AppLogIngestionDao,
)
from commonlib.model import (
    LogSource,
    StatusEnum,
    AppLogIngestion,
    LogSourceTypeEnum,
    GroupTypeEnum,
)
from boto3.dynamodb.conditions import Attr

logger = logging.getLogger()
logger.setLevel(logging.INFO)

conn = AWSConnection()
router = AppSyncRouter()

solution_version = os.environ.get("SOLUTION_VERSION", "v1.0.0")
solution_id = os.environ.get("SOLUTION_ID", "SO8025")

app_log_ingestion_table_name = os.environ.get("APP_LOG_INGESTION_TABLE_NAME")
instance_table_name = os.environ.get("INSTANCE_TABLE_NAME")
log_source_table_name = os.environ.get("LOG_SOURCE_TABLE_NAME")
# link account
sub_account_link_table_name = os.environ.get("SUB_ACCOUNT_LINK_TABLE_NAME")
# Get SSM resource
ssm_log_config_document_name = os.environ.get("SSM_LOG_CONFIG_DOCUMENT_NAME")


ingestion_dao = AppLogIngestionDao(table_name=app_log_ingestion_table_name)
instance_dao = InstanceDao(table_name=instance_table_name)
log_source_dao = LogSourceDao(table_name=log_source_table_name)
account_helper = LinkAccountHelper(sub_account_link_table_name)


class SSMSendCommandStatus:
    def __init__(self, status, status_details):
        self._status = status
        self._status_details = status_details


def lambda_handler(event, _):
    logger.info("Received event: " + json.dumps(event, indent=2))
    message = event["Records"][0]
    logger.info(message)
    ingestion_id = event["Records"][0]["dynamodb"]["Keys"]["id"]["S"]
    event_type = event["Records"][0]["eventName"]
    ingestion_status = event["Records"][0]["dynamodb"]["NewImage"]["status"]["S"]
    logger.info("Event status is: %s", ingestion_status)
    if (
        event_type == "INSERT" or event_type == "MODIFY"
    ) and ingestion_status == "ACTIVE":
        logger.info(
            "Start generate_and_upload_flb_config for ingestion: %s", ingestion_id
        )
        generate_and_upload_flb_config(ingestion_id)
    elif event_type == "MODIFY" and ingestion_status == "INACTIVE":
        logger.info(
            "Start delete_ingestion_and_refresh_flb_config for ingestion: %s",
            ingestion_id,
        )
        delete_ingestion_and_refresh_flb_config(ingestion_id)


def get_ingestion_from_ingestion_table(ingestion_id):
    return get_app_log_ingestion_from_ingestion_table(ingestion_id)


def get_log_source(ingestion_id):
    app_log_ingestion: AppLogIngestion = get_ingestion_from_ingestion_table(
        ingestion_id
    )
    log_source: LogSource = log_source_dao.get_log_source(app_log_ingestion.sourceId)
    return log_source


def generate_and_upload_flb_config(ingestion_id):
    log_source: LogSource = get_log_source(ingestion_id)
    if (
        log_source.type == LogSourceTypeEnum.EC2
        and log_source.ec2.groupType == GroupTypeEnum.EC2
    ):
        ec2_source = EC2SourceHandler(ingestion_dao)
        link_account = account_helper.get_link_account(
            log_source.accountId, log_source.region
        )
        sts_role_arn = link_account.get("subAccountRoleArn", "")
        ssm_config_document_name = link_account.get(
            "agentConfDoc", ssm_log_config_document_name
        )
        if ssm_config_document_name == ssm_log_config_document_name:
            ssm = conn.get_client("ssm")
        else:
            ssm = conn.get_client(
                "ssm",
                region_name=link_account.get("region"),
                sts_role_arn=sts_role_arn,
            )
        ec2_source.upload_config_to_ec2(
            ssm, log_source.sourceId, ssm_config_document_name, link_account
        )


def delete_ingestion_and_refresh_flb_config(ingestion_id):
    log_source: LogSource = get_log_source(ingestion_id)
    if (
        log_source.type == LogSourceTypeEnum.EC2
        and log_source.ec2.groupType == GroupTypeEnum.EC2
    ):
        logger.info("Deleting ingestion: %s", ingestion_id)
        # EC2:distribute flb config to ec2
        ec2_source = EC2SourceHandler(ingestion_dao)
        link_account = account_helper.get_link_account(
            log_source.accountId, log_source.region
        )
        sts_role_arn = link_account.get("subAccountRoleArn", "")
        ssm_config_document_name = link_account.get(
            "agentConfDoc", ssm_log_config_document_name
        )
        if ssm_config_document_name == ssm_log_config_document_name:
            ssm = conn.get_client("ssm")
        else:
            ssm = conn.get_client(
                "ssm",
                region_name=link_account.get("region"),
                sts_role_arn=sts_role_arn,
            )

        ec2_source.upload_config_to_ec2(
            ssm, log_source.sourceId, ssm_config_document_name, link_account
        )


def get_app_log_ingestion_from_ingestion_table(ingestion_id):
    app_log_ingestion = ingestion_dao.get_app_log_ingestion(ingestion_id)
    return app_log_ingestion


def get_instance_set_by_source_id(log_source: LogSource):
    # append ingestion id into instance
    instance_id_set: Set[str] = instance_dao.get_instance_set_by_source_id(
        log_source.sourceId
    )
    return instance_id_set


def get_instance_ingestion(instance_id: str):
    instances = instance_dao.get_instance_by_instance_id(instance_id)
    ingestion_ids: List[str] = []
    for instance in instances:
        ingestion_ids.extend(instance.ingestionIds)
    # get ingestion list
    ingestion_list = list()
    if len(ingestion_ids) > 0:
        ingestion_list = ingestion_dao.list_app_log_ingestions(
            Attr("id")
            .is_in(ingestion_ids)
            .__and__(Attr("status").ne(StatusEnum.INACTIVE))
        )
    return ingestion_list
