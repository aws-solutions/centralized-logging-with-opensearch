# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import json
import logging
import os

from svc.ec2 import EC2SourceHandler
from commonlib import AWSConnection, handle_error, AppSyncRouter
from commonlib.dao import AppLogIngestionDao, LogSourceDao, InstanceDao
from commonlib.model import (
    LogSource,
)

logger = logging.getLogger()
logger.setLevel(logging.INFO)

conn = AWSConnection()
router = AppSyncRouter()

solution_version = os.environ.get("SOLUTION_VERSION", "v1.0.0")
solution_id = os.environ.get("SOLUTION_ID", "SO8025")

awslambda = conn.get_client("lambda")
dynamodb = conn.get_client("dynamodb", client_type="resource")
sqs = conn.get_client("sqs")
app_log_ingestion_table_name = os.environ.get("APP_LOG_INGESTION_TABLE_NAME")
instance_table_name = os.environ.get("INSTANCE_TABLE_NAME")
log_source_table_name = os.environ.get("LOG_SOURCE_TABLE_NAME")
# Get SSM resource
ssm_log_config_document_name = os.environ.get("SSM_LOG_CONFIG_DOCUMENT_NAME")

sts = conn.get_client("sts")
account_id = sts.get_caller_identity()["Account"]

iam = conn.get_client("iam")
iam_res = conn.get_client("iam", client_type="resource")

ingestion_dao = AppLogIngestionDao(table_name=app_log_ingestion_table_name)
instance_dao = InstanceDao(table_name=instance_table_name)
log_source_dao = LogSourceDao(table_name=log_source_table_name)


@handle_error
def lambda_handler(event, _):
    # logger.info("Received event: " + json.dumps(event, indent=2))

    instance_id = event["Records"][0]["dynamodb"]["Keys"]["id"]["S"]
    source_id = event["Records"][0]["dynamodb"]["Keys"]["sourceId"]["S"]
    event_type = event["Records"][0]["eventName"]
    if event_type == "INSERT":
        apply_app_log_ingestion_for_single_instance(instance_id, source_id)
    elif event_type == "REMOVE":
        refresh_app_log_ingestion_for_single_instance(instance_id, source_id)
    # logger.info("Ingestion modified for instance:" + instance_id)


def apply_app_log_ingestion_for_single_instance(instance_id, source_id):
    """Apply ingestions to single instance"""
    ingestion_obj_list = ingestion_dao.get_app_log_ingestions_by_source_id(source_id)
    ec2_source = EC2SourceHandler(ingestion_dao)
    log_source: LogSource = log_source_dao.get_log_source(source_id)
    if ingestion_obj_list:
        for ingestion in ingestion_obj_list:
            ec2_source.create_ingestion_by_instance_id_set(
                log_source, [instance_id], ingestion
            )
            logger.info(
                "Ingestion:" + ingestion.id + "applied for instance:" + instance_id
            )


def refresh_app_log_ingestion_for_single_instance(instance_id, source_id):
    """Refresh ingestions to single instance"""
    instance_obj_list = instance_dao.get_instance_by_instance_id(instance_id)
    ec2_source = EC2SourceHandler(ingestion_dao)
    if instance_obj_list:
        for instance_obj in instance_obj_list:
            ingestion_id_set = instance_obj.ingestionIds
            remained_source_id = instance_obj.sourceId
            log_source: LogSource = log_source_dao.get_log_source(remained_source_id)
            for ingestion_id in ingestion_id_set:
                ingestion = ingestion_dao.get_app_log_ingestion(ingestion_id)
                ec2_source.create_ingestion_by_instance_id_set(
                    log_source, [instance_id], ingestion
                )

        logger.info("Ingestion refreshed for instance:" + instance_id)
    else:
        log_source: LogSource = log_source_dao.get_log_source(source_id)
        instance_with_ingestion_list = {instance_id: []}
        ec2_source.generate_flb_config_to_s3(
            log_source, [instance_id], instance_with_ingestion_list, None
        )

        logger.info("The last ingestion was removed for instance:" + instance_id)
