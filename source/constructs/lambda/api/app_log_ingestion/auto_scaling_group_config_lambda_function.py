# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import json
import logging
import os
from util.asg_deployment_configuration import ASGDeploymentConfigurationMng

from commonlib import handle_error
from commonlib.exception import APIException, ErrorCode
from commonlib.dao import LogSourceDao
from commonlib.model import (
    LogSource,
)

log_source_dao = LogSourceDao(table_name=os.environ.get("LOG_SOURCE_TABLE_NAME"))

logger = logging.getLogger()
logger.setLevel(logging.INFO)


@handle_error
def lambda_handler(event, _):
    # logger.info("Received event: " + json.dumps(event, indent=2))

    action = event["info"]["fieldName"]
    args = event["arguments"]

    group_id = args["groupId"]

    auto_scaling_group_name = get_asg_group_name(group_id)

    deploy_config_mng = ASGDeploymentConfigurationMng(
        instance_group_id=args["groupId"], asg_name=auto_scaling_group_name
    )

    if action == "getAutoScalingGroupConf":
        return deploy_config_mng.get_configuration()
    else:
        logger.info("Event received: " + json.dumps(event, indent=2))
        raise APIException(ErrorCode.UNSUPPORTED_ACTION)


def get_asg_group_name(source_id):
    log_source: LogSource = log_source_dao.get_log_source(
        source_id
    )

    asg_group_name = log_source.ec2.asgName

    return asg_group_name
