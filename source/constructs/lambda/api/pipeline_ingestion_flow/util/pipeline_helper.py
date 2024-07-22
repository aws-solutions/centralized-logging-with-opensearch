# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

from commonlib.logging import get_logger
import re

from commonlib import AWSConnection
from commonlib.exception import APIException, ErrorCode

conn = AWSConnection()

logger = get_logger(__name__)


dynamodb_client = conn.get_client("dynamodb", client_type="resource")
cfn_client = conn.get_client("cloudformation")


class StackErrorHelper:
    """Helper Class for Stack Error"""

    def __init__(self, stack_id):
        super().__init__()
        self.stack_id = stack_id
        self._stack_name = get_stack_name(self.stack_id)

    def get_cfn_stack_earliest_error_event(self):
        """
        This function will get the earliest error event of a stack.
        If there is none error, return "".

        Return:
            err_message: string
        """
        cfn_err_message_array = []
        max_err_events_return_count = 2

        response = cfn_client.describe_stack_events(
            StackName=self._stack_name,
        )
        stack_events = response.get("StackEvents")
        while "NextToken" in response:
            response = cfn_client.describe_stack_events(
                StackName=self._stack_name, NextToken=response["NextToken"]
            )
            stack_events.extend(response.get("StackEvents"))

        err_events_return_count = 0
        for event in list(reversed(stack_events)):
            if "FAILED" in event["ResourceStatus"]:
                cfn_err_message_array.append(event.get("ResourceStatusReason"))
                err_events_return_count += 1
                if err_events_return_count >= max_err_events_return_count:
                    break

        result = " ".join(cfn_err_message_array)
        return result


def get_stack_name(stack_id):
    """return the stack name"""
    regex = r"arn:.*?:cloudformation:.*?:.*?:stack/(.*)/.*"
    match_obj = re.match(regex, stack_id, re.I)
    if match_obj:
        stack_name = match_obj.group(1)
    else:
        raise APIException(ErrorCode.UNKNOWN_ERROR, "Error parse stack name.")

    return stack_name
