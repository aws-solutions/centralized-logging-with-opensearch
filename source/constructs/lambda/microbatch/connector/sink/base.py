# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

from utils import CommonEnum
from source.base import AbstractSource


class Status(CommonEnum):
    RUNNING = "Running"
    SUCCEEDED = "Succeeded"
    FAILED = "Failed"


class AbstractSink:

    def __init__(self, context: dict) -> None:
        """_summary_

        Args:
            context (dict): _description_
        """
        pass

    def process(self, source: AbstractSource) -> Status:
        """_summary_

        Yields:
            Iterator[dict]: _description_
        """
        for _ in source.process():
            continue
        return Status.SUCCEEDED

    @property
    def context(self) -> dict:
        """_summary_

        Returns:
            dict: _description_
        """
        return {}
