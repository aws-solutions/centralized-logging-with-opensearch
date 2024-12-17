# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import re
from typing import Iterator


class LogFormat(type):
    PATTERN: str
    NAME: tuple
    FLAGS: re.RegexFlag

    @classmethod
    def _transform(cls, data: dict) -> dict:
        return data


class LogParser:

    def __init__(self, log_format: LogFormat):
        self.log_format = log_format

    def parse(self, string: str) -> Iterator[dict]:
        for matched in re.finditer(
            self.log_format.PATTERN, string, self.log_format.FLAGS
        ):
            yield self.log_format._transform(
                data=dict(zip(self.log_format.NAME, matched.groups()))
            )


class AbstractSource:

    def __init__(self, context: dict) -> None:
        """_summary_

        Args:
            context (dict): _description_
        """
        pass

    def process(self) -> Iterator[str]:
        """_summary_

        Yields:
            Iterator[str]: _description_
        """
        yield ""

    @property
    def context(self) -> dict:
        """_summary_

        Returns:
            dict: _description_
        """
        return {}
