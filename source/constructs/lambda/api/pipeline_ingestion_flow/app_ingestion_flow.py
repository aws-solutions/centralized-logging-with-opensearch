# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0
import os
import json
import logging

from commonlib.dao import LogSourceDao, AppLogIngestionDao
from commonlib.model import (AppLogIngestion)
from util.pipeline_helper import StackErrorHelper

logger = logging.getLogger()
logger.setLevel(logging.INFO)

app_log_ingestion_dao = AppLogIngestionDao(os.environ.get("INGESTION_TABLE"))
log_source_dao = LogSourceDao(os.environ.get("LOG_SOURCE_TABLE"))


def lambda_handler(event, _):
    # logger.info("Received event: " + json.dumps(event, indent=2))
    """
    This function is used to update the app log ingestion table and log source table when
    the substack is created or deleted.
    If an ingestion create a substack, this function will be triggered.
    If the log source is syslog, this function will also update the
    log source status (for syslog port recommendation feature).
    """
    # logger.info(ingestion_table_name)
    try:
        result = event["result"]
        ingestion_id = event["id"]

        update_ingestion_status(ingestion_id, result)

        ingestion: AppLogIngestion = app_log_ingestion_dao.get_app_log_ingestion(ingestion_id)
        
        update_log_source_status(ingestion.sourceId, result)

    except Exception as e:
        logger.error(e)
        logger.error("Invalid Request received: " + json.dumps(event, indent=2))
        raise RuntimeError("Unable to update app ingestion table or log source table")

    return "OK"


def update_ingestion_status(ingestion_id: str, result):
    """
    Update the ingestion status in DDB.
    """
    logger.info("Update Ingestion Status in DynamoDB")
    stack_status = result["stackStatus"]
    stack_id = result["stackId"]
    error = result["error"]

    if stack_status == "CREATE_COMPLETE":
        status = "ACTIVE"
    elif stack_status == "DELETE_COMPLETE":
        status = "INACTIVE"
    else:
        status = "ERROR"
        error = get_earliest_error_event(stack_id)
    
    app_log_ingestion_dao.update_app_log_ingestion(ingestion_id, status=status, stackId=stack_id, error=error)


def update_log_source_status(source_id: str, result):
    """
    Update the source status in DDB.
    """
    logger.info("Update Log Source Status in DynamoDB")
    stack_status = result["stackStatus"]

    if stack_status == "CREATE_COMPLETE":
        status = "ACTIVE"
    elif stack_status == "DELETE_COMPLETE":
        status = "INACTIVE"
    else:
        status = "ERROR"

    log_source_dao.update_log_source(source_id, status=status)


def get_earliest_error_event(stack_id: str):
    """
    Input:
        stack_id: string
    Output:
        error_message: "xxxxx"
    """
    stack_error_helper = StackErrorHelper(stack_id)
    return stack_error_helper.get_cfn_stack_earliest_error_event()
