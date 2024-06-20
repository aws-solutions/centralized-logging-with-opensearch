# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import json
import os
from util.asg_deployment_configuration import ASGDeploymentConfigurationMng

from commonlib import handle_error
from commonlib.exception import APIException, ErrorCode
from commonlib.dao import LogSourceDao
from commonlib.model import (
    LogSource,
)
from commonlib.logging import get_logger

log_source_dao = LogSourceDao(table_name=os.environ.get("LOG_SOURCE_TABLE_NAME"))

logger = get_logger("app_log_ingestion.auto_scaling_group_config")


@handle_error
def lambda_handler(event, _):
    # logger.info("Received event: " + json.dumps(event["arguments"], indent=2))

    action = event["info"]["fieldName"]
    args = event["arguments"]

    group_id = args["groupId"]

    ec2_source = get_ec2_source(group_id)
    auto_scaling_group_name = ec2_source.asgName
    group_platform = ec2_source.groupPlatform

    deploy_config_mng = ASGDeploymentConfigurationMng(
        instance_group_id=args["groupId"],
        asg_name=auto_scaling_group_name,
        group_platform=group_platform,
    )

    if action == "getAutoScalingGroupConf":
        return deploy_config_mng.get_configuration()
    else:
        logger.info("Event received: " + json.dumps(event["arguments"], indent=2))
        raise APIException(ErrorCode.UNSUPPORTED_ACTION)


def get_ec2_source(source_id):
    log_source: LogSource = log_source_dao.get_log_source(source_id)
    return log_source.ec2
