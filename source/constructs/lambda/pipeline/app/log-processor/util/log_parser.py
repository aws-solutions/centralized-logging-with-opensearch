# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import json
import logging
import sys
from abc import ABC, abstractmethod

logger = logging.getLogger()


class LogType(ABC):
    """An abstract class represents one type of Logs.

    Each AWS service has its own log format.
    Create a class for each service with an implementation of `parse(line)` to parse its service logs
    """

    _fields = []  # list of fields
    _format = "text"  # log file format, such as json, text, etc.

    @abstractmethod
    def parse(self, line: str):
        """Parse the original raw log record, and return processed json record(s).

        This should be implemented in each service class.
        """
        pass

    @property
    def fields(self):
        return self._fields

    @property
    def format(self):
        return self._format


class CloudTrailCWL(LogType):
    """An implementation of LogType for CloudTrail Logs"""

    _format = "json"

    def _convert_event(self, cloudtrail_event: dict):
        """Unify all cloudtrail event format for different resources.

        There are different cloudtrail event format in different resources.
        Below logic is trying to unify the format
        In order to load as much as possible
        Otherwise, different format may be rejected with mapper_parsing_exception
        """

        # convert requestParameters.parameters from text to dict
        if "requestParameters" in cloudtrail_event and isinstance(
            cloudtrail_event["requestParameters"], dict
        ):
            if isinstance(cloudtrail_event["requestParameters"].get("parameters"), str):
                cloudtrail_event["requestParameters"]["parameters"] = {
                    "value": cloudtrail_event["requestParameters"].get("parameters")
                }
            if isinstance(
                cloudtrail_event["requestParameters"].get(
                    "DescribeEgressOnlyInternetGatewaysRequest"
                ),
                str,
            ):
                cloudtrail_event["requestParameters"][
                    "DescribeEgressOnlyInternetGatewaysRequest"
                ] = {
                    "value": cloudtrail_event["requestParameters"].get(
                        "DescribeEgressOnlyInternetGatewaysRequest"
                    )
                }
            if isinstance(
                cloudtrail_event["requestParameters"].get(
                    "DescribeVpcEndpointServiceConfigurationsRequest"
                ),
                str,
            ):
                cloudtrail_event["requestParameters"][
                    "DescribeVpcEndpointServiceConfigurationsRequest"
                ] = {
                    "value": cloudtrail_event["requestParameters"].get(
                        "DescribeVpcEndpointServiceConfigurationsRequest"
                    )
                }
            if isinstance(
                cloudtrail_event["requestParameters"].get("DescribeNatGatewaysRequest"),
                str,
            ):
                cloudtrail_event["requestParameters"]["DescribeNatGatewaysRequest"] = {
                    "value": cloudtrail_event["requestParameters"].get(
                        "DescribeNatGatewaysRequest"
                    )
                }
            if isinstance(
                cloudtrail_event["requestParameters"].get(
                    "DescribeVpcEndpointsRequest"
                ),
                str,
            ):
                cloudtrail_event["requestParameters"]["DescribeVpcEndpointsRequest"] = {
                    "value": cloudtrail_event["requestParameters"].get(
                        "DescribeVpcEndpointsRequest"
                    )
                }
            if isinstance(
                cloudtrail_event["requestParameters"].get("filter"),
                str,
            ):
                cloudtrail_event["requestParameters"]["filter"] = {
                    "value": cloudtrail_event["requestParameters"].get("filter")
                }
            if isinstance(
                cloudtrail_event["requestParameters"].get("attribute"),
                str,
            ):
                cloudtrail_event["requestParameters"]["attribute"] = {
                    "value": cloudtrail_event["requestParameters"].get("attribute")
                }
            if isinstance(
                cloudtrail_event["requestParameters"].get("iamInstanceProfile"),
                str,
            ):
                cloudtrail_event["requestParameters"]["iamInstanceProfile"] = {
                    "value": cloudtrail_event["requestParameters"].get(
                        "iamInstanceProfile"
                    )
                }
            if isinstance(
                cloudtrail_event["requestParameters"].get("content"),
                str,
            ):
                cloudtrail_event["requestParameters"]["content"] = {
                    "value": cloudtrail_event["requestParameters"].get("content")
                }
            if isinstance(
                cloudtrail_event["requestParameters"].get("DescribeFlowLogsRequest"),
                str,
            ):
                cloudtrail_event["requestParameters"]["DescribeFlowLogsRequest"] = {
                    "value": cloudtrail_event["requestParameters"].get(
                        "DescribeFlowLogsRequest"
                    )
                }
            if isinstance(
                cloudtrail_event["requestParameters"].get("overrides"), dict
            ) and isinstance(
                cloudtrail_event["requestParameters"]["overrides"].get(
                    "containerOverrides"
                ),
                list,
            ):
                container_overrides = cloudtrail_event["requestParameters"][
                    "overrides"
                ]["containerOverrides"]

                for container_override in container_overrides:
                    if isinstance(container_override.get("environment"), str):
                        container_override["environment"] = {
                            "value": container_override.get("environment")
                        }
                cloudtrail_event["requestParameters"]["overrides"][
                    "containerOverrides"
                ] = container_overrides

        # convert requestParameters.parameters from text to dict
        if "responseElements" in cloudtrail_event and isinstance(
            cloudtrail_event["responseElements"], dict
        ):
            if isinstance(cloudtrail_event["responseElements"].get("role"), str):
                cloudtrail_event["responseElements"]["role"] = {
                    "value": cloudtrail_event["responseElements"].get("role")
                }

            if isinstance(cloudtrail_event["responseElements"].get("tasks"), list):
                tasks = cloudtrail_event["responseElements"].get("tasks")
                for task in tasks:
                    if isinstance(task.get("overrides"), dict) and isinstance(
                        task["overrides"].get("containerOverrides"), list
                    ):
                        container_overrides = task["overrides"]["containerOverrides"]
                        for container_override in container_overrides:
                            if isinstance(container_override.get("environment"), str):
                                container_override["environment"] = {
                                    "value": container_override.get("environment")
                                }

        return cloudtrail_event

    def parse(self, line: str):
        try:
            result = []
            log_events = json.loads(line)["logEvents"]
            for log_event in log_events:
                message = log_event["message"]
                value = json.loads(message)
                result.append(self._convert_event(value))
            return result
        except Exception as e:
            logger.error(e)
            return []


class LogParser:
    """A wrapper class that handles all types of service logs"""

    def __init__(self, log_type: str) -> None:
        # try to find a mapping class
        if service := getattr(sys.modules[__name__], log_type, None):
            self._service = service()
        else:
            raise RuntimeError(f"Unknown Type {log_type}")

    def parse(self, record):
        return self._service.parse(record)

    def export_format(self):
        return "json" if self._service.format == "json" else "csv"
