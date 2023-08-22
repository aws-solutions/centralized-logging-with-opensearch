# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import uuid
import json
import logging


def exec_sfn_flow(
    sfn_client, state_machine_arn: str, flow_id: str, action="START", args=None
):
    """Helper function to execute a step function flow"""
    logging.info(f"Execute Step Function Flow: {state_machine_arn}")

    if args is None:
        args = {}

    input_args = {
        "id": flow_id,
        "action": action,
        "args": args,
    }
    random_code = str(uuid.uuid4())[:8]
    sfn_client.start_execution(
        name=f"{flow_id}-{random_code}-{action}",
        stateMachineArn=state_machine_arn,
        input=json.dumps(input_args),
    )
