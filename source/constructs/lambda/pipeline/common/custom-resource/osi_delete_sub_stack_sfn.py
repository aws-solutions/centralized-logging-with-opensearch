# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

from commonlib.logging import get_logger
import os

from commonlib.utils import exec_sfn_flow
from commonlib import AWSConnection, AppSyncRouter

logger = get_logger(__name__)

state_machine_arn = os.environ["STATE_MACHINE_ARN"]

conn = AWSConnection()
router = AppSyncRouter()

sfn = conn.get_client("stepfunctions")

def lambda_handler(event, _):
    logger.info(event)

    exec_sfn_flow(sfn, state_machine_arn, "cl-osi-delete-pipeline", "STOP")

    return "OK"