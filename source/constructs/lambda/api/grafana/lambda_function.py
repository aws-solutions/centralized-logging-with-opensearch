# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import logging
import os
import uuid
from datetime import datetime
from commonlib import AWSConnection, handle_error, AppSyncRouter
from commonlib.model import DomainStatusCheckType, GrafanaStatusCheckItem
from commonlib.exception import ErrorCode
from commonlib import DynamoDBUtil
from commonlib.utils import paginate
from util.grafana import GrafanaClient

logger = logging.getLogger()
logger.setLevel(logging.INFO)

conn = AWSConnection()
router = AppSyncRouter()

grafana_table_name = os.environ.get("GRAFANA_TABLE")
ddb_util = DynamoDBUtil(grafana_table_name)

@handle_error
def lambda_handler(event, _):
    return router.resolve(event)

@router.route(field_name="createGrafana")
def create_grafana(**args):
    """Create a Grafana"""
    logger.info("Create Grafana")

    grafana_id = str(uuid.uuid4())

    item = {
        "id": grafana_id,
        "name": args["name"],
        "url": args["url"],
        "token": args["token"],
        "tags": args.get("tags", []),
        "createdAt": datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
    }
    ddb_util.put_item(item)
    return grafana_id

@router.route(field_name="listGrafanas")
def list_grafanas(page=1, count=20):
    logger.info(f"List Grafanas from DynamoDB in page {page} with {count} of records")

    items = ddb_util.list_items()
    total, grafanas = paginate(items, page, count, sort_by="createdAt")
    return {
        "total": total,
        "grafanas": grafanas,
    }

@router.route(field_name="getGrafana")
def get_grafana(id: str):
    logger.info(f"get grafana from DynamoDB by id {id}")

    item = ddb_util.get_item({"id": id})
    return item

@router.route(field_name="deleteGrafana")
def delete_grafana(id: str):
    """Delete a Grafana"""
    logger.info("Delete Grafana")

    ddb_util.delete_item({"id": id})
    return "OK"

@router.route(field_name="updateGrafana")
def update_grafana(id: str, **args):
    """Update a Grafana"""
    logger.info("Update Grafana")
    updatable_attr = ["url", "token"]
    # only allow limited not-None key to be updated
    update_body = {key: value for key, value in args.items() if value is not None and key in updatable_attr}

    ddb_util.update_item({"id": id}, update_body)
    return "OK"

@router.route(field_name="checkGrafana")
def check_grafana(**args):
    """Update a Grafana
    Args:
        id (str): Grafana id (optional)
        url (str): Grafana url (optional)
        token (str): Grafana token (optional)
    Returns:
        status (str): FAILED | PASSED
        details (list): [
            {
                name (str): "Check URL Connectivity"
                value (str): [] # dummy value
                errorCode (str): "GRAFANA_URL_CONNECTIVITY_FAILED"
                status (str): "FAILED"
            }
        ]
    """
    logger.info("Check Grafana")

    grafana_id = args.get("id")
    url = args.get("url")
    token = args.get("token")

    if grafana_id:
        # Fetch 'url' and 'token' based on 'id' from DDB
        item = ddb_util.get_item({"id": grafana_id})
        url, token = item["url"], item["token"]

    grafana_client = GrafanaClient(url=url, token=token, verify=False, timeout=5)

    check_detail_list = []

    check_url_connectivity_result = grafana_client.check_url_connectivity()
    record_check_detail(
        check_detail_list,
        check_url_connectivity_result,
        GrafanaStatusCheckItem.URL_CONNECTIVITY,
        ErrorCode.GRAFANA_URL_CONNECTIVITY_FAILED.name,
    )

    if check_url_connectivity_result:
        checks = [
            (grafana_client.check_token_validity(), GrafanaStatusCheckItem.TOKEN_VALIDITY, ErrorCode.GRAFANA_TOKEN_VALIDATION_FAILED.name),
            (grafana_client.has_installed_athena_plugin(), GrafanaStatusCheckItem.HAS_INSTALLED_ATHENA_PLUGIN, ErrorCode.GRAFANA_HAS_INSTALLED_ATHENA_PLUGIN_FAILED.name),
            (grafana_client.check_data_source_permission(), GrafanaStatusCheckItem.DATA_SOURCE_PERMISSION, ErrorCode.GRAFANA_DATA_SOURCE_PERMISSION_CHECK_FAILED.name),
            (grafana_client.check_folder_permission(), GrafanaStatusCheckItem.FOLDER_PERMISSION, ErrorCode.GRAFANA_FOLDER_PERMISSION_CHECK_FAILED.name),
            (grafana_client.check_dashboards_permission(), GrafanaStatusCheckItem.DASHBOARDS_PERMISSION, ErrorCode.GRAFANA_DASHBOARDS_PERMISSION_CHECK_FAILED.name)
        ]

        global_status = DomainStatusCheckType.PASSED

        for check_result, check_item, error_code in checks:
            record_check_detail(check_detail_list, check_result, check_item, error_code)
            if not check_result:
                global_status = DomainStatusCheckType.FAILED
    else:
        # In the event of a URL connection failure, fail early
        checks = [
            (False, GrafanaStatusCheckItem.TOKEN_VALIDITY, ErrorCode.GRAFANA_TOKEN_VALIDATION_FAILED.name),
            (False, GrafanaStatusCheckItem.HAS_INSTALLED_ATHENA_PLUGIN, ErrorCode.GRAFANA_HAS_INSTALLED_ATHENA_PLUGIN_FAILED.name),
            (False, GrafanaStatusCheckItem.DATA_SOURCE_PERMISSION, ErrorCode.GRAFANA_DATA_SOURCE_PERMISSION_CHECK_FAILED.name),
            (False, GrafanaStatusCheckItem.FOLDER_PERMISSION, ErrorCode.GRAFANA_FOLDER_PERMISSION_CHECK_FAILED.name),
            (False, GrafanaStatusCheckItem.DASHBOARDS_PERMISSION, ErrorCode.GRAFANA_DASHBOARDS_PERMISSION_CHECK_FAILED.name)
        ]
        for check_result, check_item, error_code in checks:
            record_check_detail(check_detail_list, check_result, check_item, error_code)
        global_status = DomainStatusCheckType.FAILED
    return {
        "status": global_status,
        "details": check_detail_list,
    }


def record_check_detail(
    details: list, check_result: bool, name: str, error_code
):
    """Record the check detail"""
    details.append(
        {
            "name": name,
            "values": [],  # dummy value, compatibility for AOS check
            "errorCode": error_code if not check_result else None,
            "status": DomainStatusCheckType.PASSED
            if check_result
            else DomainStatusCheckType.FAILED,
        }
    )