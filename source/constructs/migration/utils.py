import re
import boto3

from typing import Any, Dict, List, Optional


def first(i):
    return next(i, None)


def rename_dict_key(d: Dict[str, Any], old_key: str, new_key: str) -> None:
    if old_key in d:
        d[new_key] = d.pop(old_key)


def sqs_url_to_arn(url):
    parts = url.split("/")
    if len(parts) != 5:
        raise ValueError("Invalid SQS URL format")

    region = parts[2].split(".")[1]
    account_id = parts[3]
    queue_name = parts[4]

    if region.startswith("cn"):
        partition = "aws-cn"
    else:
        partition = "aws"

    return Arn(partition, "sqs", region, account_id, queue_name)


def find_by_parameter_key(data: List[dict], search_key: str) -> Optional[dict]:
    """
    Finds a dictionary with a specified 'parameterKey' in a list of dictionaries.

    :param data: List of dictionaries to search.
    :param search_key: The 'parameterKey' value to search for.
    :return: The dictionary with the specified 'parameterKey', or None if not found.
    """
    for entry in data:
        if entry.get("parameterKey") == search_key:
            return entry
    return None


def find_by_key(
    data: List[dict], search_key: str, key_name: str = "key"
) -> Optional[dict]:
    for entry in data:
        if entry.get(key_name) == search_key:
            return entry
    return None


class Arn:
    def __init__(
        self, partition: str, service: str, region: str, account_id: str, resource: str
    ):
        self.partition = partition
        self.service = service
        self.region = region
        self.account_id = account_id
        self.resource = resource

    @property
    def resource_type(self):
        parts = self.resource.split("/", 1)
        if len(parts) == 2:
            return parts[0]
        parts = self.resource.split(":", 1)
        if len(parts) == 2:
            return parts[0]
        return None

    @property
    def resource_id(self):
        parts = self.resource.split("/", 1)
        if len(parts) == 2:
            return parts[1]
        parts = self.resource.split(":", 1)
        if len(parts) == 2:
            return parts[1]
        return None

    @staticmethod
    def from_str(s: str):
        parts = s.split(":", 5)
        return Arn(parts[1], parts[2], parts[3], parts[4], parts[5])

    def __str__(self):
        return f"arn:{self.partition}:{self.service}:{self.region}:{self.account_id}:{self.resource}"


class CfnStack:
    def __init__(self, stack_name: str):
        self._stack_name = stack_name

    def resources(self):
        client = boto3.client("cloudformation")
        paginator = client.get_paginator("list_stack_resources")
        response_iterator = paginator.paginate(StackName=self._stack_name)

        for page in response_iterator:
            for resource in page["StackResourceSummaries"]:
                yield resource

    def resources_of(self, resource_type: str):
        if resource_type:
            return filter(
                lambda x: x["ResourceType"] == resource_type,
                self.resources(),
            )
        return self.resources()

    def find_resources(self, logical_resource_id_regex: str, resource_type: str = ""):
        return filter(
            lambda x: re.search(
                logical_resource_id_regex, x["LogicalResourceId"], re.MULTILINE
            ),
            self.resources_of(resource_type),
        )
