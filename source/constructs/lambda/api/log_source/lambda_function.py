# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0


import json
from commonlib.logging import get_logger

from util.log_source import LogSourceUtil
from log_source_helper import SyslogHelper

from commonlib import handle_error, AppSyncRouter


logger = get_logger(__name__)

router = AppSyncRouter()


@handle_error
def lambda_handler(event, _):
    logger.info("Received event: " + json.dumps(event["arguments"], indent=2))
    return router.resolve(event)


@router.route(field_name="createLogSource")
def create_log_source(**args):
    return LogSourceUtil.get_source(args["type"]).create_log_source(**args)


@router.route(field_name="getLogSource")
def get_log_source(**args):
    # Call specific get_log_source function by type.
    source_id = args.get("sourceId")
    return LogSourceUtil.get_source(args["type"]).get_log_source(source_id)


@router.route(field_name="listLogSources")
def list_log_sources(**args):
    # Call specific list_log_sources function by type.

    page, count = args.get("page", 1), args.get("count", 20)
    return LogSourceUtil.get_source(args["type"]).list_log_sources(page, count)


@router.route(field_name="deleteLogSource")
def delete_log_source(**args):
    # Call specific delete_log_source function by type.
    source_id = args.get("sourceId")
    return LogSourceUtil.get_source(args["type"]).delete_log_source(source_id)


@router.route(field_name="updateLogSource")
def update_log_source(**args):
    # Call specific delete_log_source function by type.
    return LogSourceUtil.get_source(args["type"]).update_log_source(**args)


@router.route(field_name="checkCustomPort")
def check_custom_port(**args):
    port = args.get("syslogPort")
    syslog_helper = SyslogHelper()
    return syslog_helper.check_custom_port(port)
