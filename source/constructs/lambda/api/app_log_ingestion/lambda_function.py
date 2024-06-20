# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import json
from commonlib.logging import get_logger
import os
from typing import List
from commonlib.model import AppLogIngestion
from commonlib import AWSConnection, handle_error, AppSyncRouter
from commonlib.dao import AppLogIngestionDao
from svc.service import AppLogIngestionService

logger = get_logger(__name__)

conn = AWSConnection()
router = AppSyncRouter()

app_log_ingestion_table_name = os.environ.get("APP_LOG_INGESTION_TABLE_NAME")
dao = AppLogIngestionDao(table_name=app_log_ingestion_table_name)

ingestion_svc = AppLogIngestionService()


@handle_error
def lambda_handler(event, _):
    logger.info("Received event: " + json.dumps(event["arguments"], indent=2))
    return router.resolve(event)


@router.route(field_name="createAppLogIngestion")
def create_app_log_ingestion(**args):
    app_log_ingestion: AppLogIngestion = AppLogIngestion(**args)
    return ingestion_svc.create_app_log_ingestion(app_log_ingestion)


@router.route(field_name="deleteAppLogIngestion")
def delete_app_log_ingestion(ids: List[str]):
    for id in ids:
        ingestion_svc.delete_app_log_ingestion(id)
    return "OK"


@router.route(field_name="getAppLogIngestion")
def get_app_log_ingestion(id: str):
    return dao.get_app_log_ingestion(id).dict()


@router.route(field_name="listAppLogIngestions")
def list_app_log_ingestions(**args):
    return ingestion_svc.list_app_log_ingestions(**args)


@router.route(field_name="getK8sDeploymentContentWithDaemonSet")
def get_k8s_deployment_content_with_daemon_set(**args) -> str:
    source_id = args.get("sourceId")
    return ingestion_svc.get_k8s_deployment_content_with_daemon_set(source_id)


@router.route(field_name="getK8sDeploymentContentWithSidecar")
def get_k8s_deployment_content_with_sidecar(id: str) -> str:
    return ingestion_svc.get_k8s_deployment_content_with_sidecar(id)


@router.route(field_name="listInstanceIngestionDetails")
def list_instance_ingestion_details(**args):
    return ingestion_svc.list_instance_ingestion_details(**args)
