# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import os
import logging

from aws_lambda_powertools import Logger
from aws_lambda_powertools.logging.formatter import LambdaPowertoolsFormatter


class SolutionFormatter(LambdaPowertoolsFormatter):
    def __init__(self) -> None:
        super().__init__(
            use_rfc3339=True,
            log_record_order=["dateTime", "epochTime", "level", "levelS", "message"],
        )
        self.remove_keys(["timestamp"])

    def format(self, record: logging.LogRecord) -> str:  # noqa: A003
        log = self._strip_none_records(
            {
                **self._extract_log_keys(record),
                "dateTime": self.formatTime(record),
                "epochTime": record.created,
                "level": record.levelno,
                "levelS": record.levelname,
                "message": self._extract_log_message(record),
                "solutionId": os.getenv("SOLUTION_ID"),
                "traceId": self._get_latest_trace_id(),
                "stack_trace": self._serialize_stacktrace(record),
            }
        )
        return self.serialize(log)


def get_logger(name=None):
    return Logger(service=name, logger_formatter=SolutionFormatter())
