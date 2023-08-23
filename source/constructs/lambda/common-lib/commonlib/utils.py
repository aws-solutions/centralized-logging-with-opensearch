# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0


import os
import re
import logging

logger = logging.getLogger(__name__)


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
        print(resource)
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
