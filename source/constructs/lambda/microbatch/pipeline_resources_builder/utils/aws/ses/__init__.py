# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import json
from utils.aws.commonlib import AWSConnection
from utils.logger import logger


class SESClient:
    """Amazon SES Client, used to interact with Amazon Simple Email Service"""

    def __init__(self):
        conn = AWSConnection()
        self._ses_client = conn.get_client("ses")

    def send_templated_email(self, source: str, to: list, template: str, data: dict) -> dict:
        return self._ses_client.send_templated_email(Source=f"no-reply <{source}>",
                                                     Destination={'ToAddresses': to},
                                                     Template=template,
                                                     TemplateData=json.dumps(data))
