# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import json
from utils.helpers import logger, AWSConnection


class LambdaClient:
    """Amazon Lambda Client, used to interact with Amazon Lambda."""

    def __init__(self):
        conn = AWSConnection()
        self._lambda_client = conn.get_client("lambda")

    def invoke(
        self,
        function_name: str,
        payload: dict,
        invocation_type: str = "RequestResponse",
    ) -> dict:
        """Invokes a Lambda function.

        :param function_name (str): The name or ARN of the Lambda function, version, or alias.
        :param payload (dict): The JSON that you want to provide to your Lambda function as input.
        :param invocation_type (str): Choose from the following options, RequestResponse, Event, DryRun.

        Returns: dict
        """
        response = {}
        try:
            response = self._lambda_client.invoke(
                FunctionName=function_name,
                InvocationType=invocation_type,
                LogType="None",
                Payload=json.dumps(payload).encode("utf-8"),
            )
        except Exception as e:
            logger.error(e)
        return response
