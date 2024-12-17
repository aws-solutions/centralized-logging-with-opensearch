# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0


import os
import re
import uuid
import json
import time
import random

from functools import wraps
from typing import List
from .model import BufferParam
from .logging import get_logger

logger = get_logger(__name__)


def create_stack_name(pattern, id):
    """General Method to provision CloudFormation stack name"""
    stack_prefix = os.environ.get("STACK_PREFIX", "CL")
    return f"{stack_prefix}-{pattern}-{id[:8]}"


def paginate(
    items: list,
    page=1,
    count=20,
    *,
    sort_by: str = "createdAt",
    descending: bool = True,
):
    """Pagination Function with sort"""
    total = len(items)
    start = (page - 1) * count
    end = page * count

    if start > total:
        start, end = 0, count

    logger.info(f"Return result from {start} to {end} in total of {total}")
    if total > 0 and sort_by in items[0]:
        items.sort(key=lambda x: x[sort_by], reverse=descending)
    return total, items[start:end]


def get_name_from_tags(tags):
    """Get resource name from tags

    e.g. There is no vpc name.
    Will need to extract vpc name from tags.

    if tags = [{"Key": "Name", "Value": "my-vpc"}, ...]

    then the resource name is my-vpc
    """
    for tag in tags:
        if tag["Key"] == "Name":
            return tag["Value"]
    return "-"


def get_resource_from_arn(arn):
    """Get resource name from ARN.

    Below are the valid Arn Formats:
    arn:partition:service:region:account-id:resource-id
    arn:partition:service:region:account-id:resource-type/resource-id
    arn:partition:service:region:account-id:resource-type:resource-id
    """
    # This may be extended to extract more info than just resource name.
    fields = [
        "partition",
        "service",
        "region",
        "account-id",
        "resource-type",
        "resource-id",
    ]
    pattern = "^arn:([^:\n]*):([^:\n]*):([^:\n]*):([^:\n]*):([^:\\/\n]*)[:\\/]?(.*)$"
    result = re.match(pattern, arn)
    resource = {}
    if result:
        for i, attr in enumerate(fields):
            # print(f'{attr} = {result.group(i+1)}')
            resource[attr] = result.group(i + 1)
        return resource.get("resource-id") or resource["resource-type"]

    return ""


def get_partition(region_name: str):
    """Get aws partition name based on aws region"""
    if region_name.startswith("cn"):
        return "aws-cn"
    elif region_name.startswith("us-gov"):
        return "aws-us-gov"
    else:
        return "aws"


def exec_sfn_flow(
    sfn_client, state_machine_arn: str, flow_id: str, action="START", args=None
):
    """Helper function to execute a step function flow"""
    logger.info(f"Execute Step Function Flow: {state_machine_arn}")

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


def get_kv_from_buffer_param(key: str, buffer_param: List[BufferParam]) -> str:
    for p in buffer_param:
        if p.paramKey == key:
            return p.paramValue
    return ""


def set_kv_to_buffer_param(
    key: str, value: str, buffer_param: List[BufferParam]
) -> List[BufferParam]:
    has_key = False

    for p in buffer_param:
        if p.paramKey == key:
            p.paramValue = value
            has_key = True

    if has_key is False:
        buffer_param.append(BufferParam(paramKey=key, paramValue=value))
    return buffer_param


def strtobool(val):
    """Convert a string representation of truth to true (1) or false (0).

    True values are 'y', 'yes', 't', 'true', 'on', and '1'; false values
    are 'n', 'no', 'f', 'false', 'off', and '0'.  Raises ValueError if
    'val' is anything else.
    """
    val = val.lower()
    if val in ("y", "yes", "t", "true", "on", "1"):
        return 1
    elif val in ("n", "no", "f", "false", "off", "0"):
        return 0
    else:
        raise ValueError("invalid truth value %r" % (val,))


def random_delay(max_delay):
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            # Generate a random sleep duration between 0 and the specified maximum delay
            sleep_duration = random.uniform(0, max_delay)
            # Sleep for the randomly generated duration
            time.sleep(sleep_duration)
            # Call the original function with the provided arguments and return its result
            return func(*args, **kwargs)

        return wrapper

    return decorator
