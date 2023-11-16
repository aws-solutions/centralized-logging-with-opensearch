# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

from moto import mock_sts
import pytest
import os
import boto3

@mock_sts
def test_lambda_function(mocker):
    import osi_delete_sub_stack_sfn

    event = {"action": "STOP"}

    mocker.patch("osi_delete_sub_stack_sfn.exec_sfn_flow", return_value=None)
    result = osi_delete_sub_stack_sfn.lambda_handler(event, None)
    # Expect Execute successfully.

    assert result == "OK"