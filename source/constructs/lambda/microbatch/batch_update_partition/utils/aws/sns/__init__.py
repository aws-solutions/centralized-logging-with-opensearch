# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0


from typing import Union
from utils.helpers import AWSConnection


class SNSClient:
    """Amazon SES Client, used to interact with Amazon Simple Email Service"""

    def __init__(self):
        conn = AWSConnection()
        self._sns_client = conn.get_client("sns")

    def publish(self, arn: str, message: str, subject: Union[str, None] = None) -> dict:
        return self._sns_client.publish(TopicArn=arn, Message=message, Subject=subject)
