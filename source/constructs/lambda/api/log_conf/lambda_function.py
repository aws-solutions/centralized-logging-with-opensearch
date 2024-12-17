# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

from commonlib.logging import get_logger
import os
from datetime import datetime
from boto3.dynamodb.conditions import Attr


from commonlib.model import LogConfig, StatusEnum
from commonlib import (
    AWSConnection,
    handle_error,
    AppSyncRouter,
    APIException,
    ErrorCode,
)
from commonlib.utils import paginate

from commonlib.dao import LogConfigDao


logger = get_logger(__name__)

conn = AWSConnection()
router = AppSyncRouter()

log_config_table_name = os.environ.get("LOGCONFIG_TABLE")

dao = LogConfigDao(log_config_table_name)


@handle_error
def lambda_handler(event, _):

    return router.resolve(event)


@router.route(field_name="listLogConfigVersions")
def list_log_config_versions(**args):
    return dao.list_log_config_versions(args["id"])


@router.route(field_name="createLogConfig")
def create_log_config(**args):
    # fmt: off
    if len(dao.get_log_config_by_config_name(args.get("name", ""))) > 0:
        raise APIException(ErrorCode.ITEM_ALREADY_EXISTS, r"${common:error.configAlreadyExists}")
    # fmt: on
    args["version"] = 1
    try:
        s = LogConfig(**args)
        return dao.save(s)
    except ValueError:
        raise APIException(ErrorCode.INVALID_ITEM)


@router.route(field_name="updateLogConfig")
def update_log_config(**args):
    try:
        s = LogConfig(**args)
        return dao.update_log_config(s)
    except ValueError:
        raise APIException(ErrorCode.INVALID_ITEM)


@router.route(field_name="deleteLogConfig")
def delete_log_config(id: str):
    dao.delete_log_config(id)
    return "OK"


@router.route(field_name="getLogConfig")
def get_log_config(id: str, version: int = 0):
    return dao.get_log_config(id, version).dict()


@router.route(field_name="listLogConfigs")
def list_log_config(page: int, count: int):
    results = dao.list_log_configs(Attr("status").ne(StatusEnum.INACTIVE))
    total, results = paginate([s.dict() for s in results], page, count)
    return {
        "logConfigs": results,
        "total": total,
    }


@router.route(field_name="checkTimeFormat")
def check_time_format(**args):
    time_srt = args["timeStr"]
    format_str = args["formatStr"]
    # fluent-bit only use %L, but python datetime.strptime only support %f
    format_str = format_str.replace("%L", "%f")
    is_match = False
    try:
        res = datetime.strptime(time_srt, format_str)
        if isinstance(res, datetime):
            is_match = True
    except Exception:
        is_match = False
    return {"isMatch": is_match}
