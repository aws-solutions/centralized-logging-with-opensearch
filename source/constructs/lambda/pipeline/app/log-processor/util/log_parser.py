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

    def parse(self, line: str):
        try:
            result = []
            log_events = json.loads(line)["logEvents"]
            for log_event in log_events:
                message = log_event["message"]
                value = json.loads(message)
                result.append(value)
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
