# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0
import os
import json
from commonlib.logging import get_logger

from commonlib.dao import LogSourceDao, AppLogIngestionDao
from commonlib.model import AppLogIngestion, EngineType
from util.pipeline_helper import StackErrorHelper

logger = get_logger(__name__)

app_log_ingestion_dao = AppLogIngestionDao(os.environ.get("INGESTION_TABLE"))
log_source_dao = LogSourceDao(os.environ.get("LOG_SOURCE_TABLE"))


def lambda_handler(event, _):
    """
    This function is used to update the app log ingestion table and log source table when
    the substack is created or deleted.
    If an ingestion create a substack, this function will be triggered.
    If the log source is syslog, this function will also update the
    log source status (for syslog port recommendation feature).
    """
    try:
        result = event["result"]
        ingestion_id = event["id"]
        result["action"] = event["action"]
        result["engineType"] = event.get("engineType", EngineType.OPEN_SEARCH)
        result["pattern"] = event.get("pattern")

        update_ingestion_status(ingestion_id, result)

        ingestion: AppLogIngestion = app_log_ingestion_dao.get_app_log_ingestion(
            ingestion_id
        )

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

    if (
        result["engineType"] == EngineType.LIGHT_ENGINE
        and result["pattern"] == "S3SourceStack"
    ):
        status = "ERROR"
        error = ""

        if result.get("Error"):
            error = json.loads(result.get("Cause", "{}")).get("errorMessage", "")
        elif result["action"] == "STOP":
            status = "INACTIVE"
        elif result["action"] == "START":
            status = "ACTIVE"

        app_log_ingestion_dao.update_app_log_ingestion(
            ingestion_id, status=status, error=error
        )
    else:
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

        app_log_ingestion_dao.update_app_log_ingestion(
            ingestion_id, status=status, stackId=stack_id, error=error
        )


def update_log_source_status(source_id: str, result):
    """
    Update the source status in DDB.
    """
    logger.info("Update Log Source Status in DynamoDB")
    if result["engineType"] == EngineType.OPEN_SEARCH:
        stack_status = result["stackStatus"]

        if stack_status == "CREATE_COMPLETE":
            status = "ACTIVE"
        elif stack_status == "DELETE_COMPLETE":
            status = "INACTIVE"
        else:
            status = "ERROR"

        log_source_dao.update_log_source(source_id, status=status)
    elif result["engineType"] == EngineType.LIGHT_ENGINE:
        status = "ERROR"

        if not result.get("Error") and result["action"] == "STOP":
            status = "INACTIVE"
        elif not result.get("Error") and result["action"] == "START":
            status = "ACTIVE"

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
