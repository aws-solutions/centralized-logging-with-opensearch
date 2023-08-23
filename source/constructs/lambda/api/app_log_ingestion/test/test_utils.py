# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

from moto import mock_stepfunctions
from ..util.utils import exec_sfn_flow
import boto3
import os


simple_definition = """
{
  "Comment": "A Hello World example of the Amazon States Language using Pass states",
  "StartAt": "Hello",
  "States": {
    "Hello": {
      "Type": "Pass",
      "Result": "World",
      "End": true
    }
  }
}
"""


def test_exec_sfn_flow():
    with mock_stepfunctions():
        region = os.environ.get("AWS_REGION")
        sfn_client = boto3.client("stepfunctions", region_name=region)
        name = "SolutionAPIPipelineFlowSM"
        response = sfn_client.create_state_machine(
            name=name,
            definition=str(simple_definition),
            roleArn="arn:aws:iam::123456789012:role/test",
        )
        state_machine_arn = response["stateMachineArn"]
        exec_sfn_flow(sfn_client, state_machine_arn, flow_id="mocked-flow-id")
