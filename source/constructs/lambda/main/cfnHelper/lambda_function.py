# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0
import os
import json
import logging
from abc import ABC, abstractmethod

import boto3
from botocore import config

logger = logging.getLogger()
logger.setLevel(logging.INFO)


solution_version = os.environ.get("SOLUTION_VERSION", "v1.0.0")
solution_id = os.environ.get("SOLUTION_ID", "SO8025")
user_agent_config = {
    "user_agent_extra": f"AwsSolution/{solution_id}/{solution_version}"
}
default_config = config.Config(**user_agent_config)

default_region = os.environ.get("AWS_REGION")
cfn = boto3.client("cloudformation", region_name=default_region, config=default_config)

dist_output_bucket = os.environ.get("DIST_OUTPUT_BUCKET", "aws-gcr-solutions")
template_prefix = (
    f"https://{dist_output_bucket}.s3.amazonaws.com/log-hub/{solution_version}"
)


class Context:
    def __init__(self, action, args):
        if action == "START":
            self._state = StartState(self, args)
        elif action == "STOP":
            self._state = StopState(self, args)
        else:
            self._state = QueryState(self, args)

    def transit(self, state):
        self._state = state

    def run(self):
        return self._state.run()

    def get_state(self):
        return self._state.get_state()


class State(ABC):
    """Base State class"""

    _action = ""

    def __init__(self, context, args):
        self._context = context
        self._args = args

    @abstractmethod
    def run(self):
        """main execution logic

        Returns: A dict contains stack status, and error message
        """
        return {
            "stackStatus": "",
            "error": "",
        }

    def get_state(self):
        return {
            "action": self._action,
            "args": self._args,
        }


class StartState(State):
    _action = "START"

    def run(self):
        status = "CREATE_IN_PROGRESS"
        error = ""
        try:
            stack_name = self._args["stackName"]
            pattern = self._args["pattern"]
            params = self._args["parameters"]
            # start cfn deployment
            stack_id = start_cfn(stack_name, pattern, params)
            args = {
                "stackId": stack_id,
            }

            # Move to query after start
            self._context.transit(QueryState(self._context, args))
        except Exception as e:
            status = "CREATE_FAILED"
            error = str(e)
        return {
            "stackStatus": status,
            "error": error,
        }


class StopState(State):
    _action = "STOP"

    def run(self):
        status = "DELETE_IN_PROGRESS"
        error = ""

        try:
            # delete cfn deployment
            stop_cfn(self._args["stackId"])
            # Move to query after stop
            self._context.transit(QueryState(self._context, self._args))
        except Exception as e:
            status = "DELETE_FAILED"
            error = str(e)
        return {
            "stackStatus": status,
            "error": error,
        }


class QueryState(State):
    _action = "QUERY"

    def run(self):
        error = ""
        outputs = []
        try:
            status, outputs = get_cfn_status(self._args["stackId"])
        except Exception as e:
            status = "QUERY_FAILED"
            error = str(e)
        return {
            "stackStatus": status,
            "error": error,
            "outputs": outputs,
        }


def lambda_handler(event, context):
    # print("Received event: " + json.dumps(event, indent=2))
    """
    It's expected that the event (input) must be in a format of
    {
        'action':  START | STOP | QUERY,
        'args': {
            ...
        }

    }
    """
    output = {}
    try:
        action = event["action"]
        args = event["args"] if "args" in event else {}

        ctx = Context(action, args)
        result = ctx.run()
        output = ctx.get_state()
        output["result"] = result

    except Exception as e:
        logger.error(e)
        logger.error("Invalid Request received: " + json.dumps(event, indent=2))

    return output


def start_cfn(stack_name, pattern, params):
    logger.info("Start CloudFormation deployment")

    template_url = get_template_url(pattern)

    response = cfn.create_stack(
        StackName=stack_name,
        TemplateURL=template_url,
        Parameters=params,
        DisableRollback=False,
        Capabilities=[
            "CAPABILITY_IAM",
        ],
        # RoleARN=exec_role_arn,
        EnableTerminationProtection=False,
    )

    # print(response)
    stack_id = response["StackId"]
    return stack_id


def stop_cfn(stack_id):
    logger.info("Delete CloudFormation deployment")
    cfn.delete_stack(
        StackName=stack_id,
        # RoleARN=exec_role_arn,
    )


def get_cfn_status(stack_id):
    logger.info("Get CloudFormation deployment status")
    response = cfn.describe_stacks(
        StackName=stack_id,
    )
    # print(response)

    stack = response["Stacks"][0]
    stack_status = stack["StackStatus"]
    outputs = stack["Outputs"] if "Outputs" in stack else []
    return stack_status, outputs


def get_template_url(pattern):
    # TODO: Might consider to use SSM parameter store
    tpl_list = {
        'S3': f'{template_prefix}/S3AccessLog.template',
        'CloudTrail': f'{template_prefix}/CloudTrailLog.template',
        'CloudFront': f'{template_prefix}/CloudFrontLog.template',
        'RDS': f'{template_prefix}/RDSLog.template',
        'Lambda': f'{template_prefix}/LambdaLog.template',
        'ELB': f'{template_prefix}/ELBLog.template',
        'WAF': f'{template_prefix}/WAFLog.template',
        'ProxyForOpenSearch': f'{template_prefix}/NginxForOpenSearch.template',
        'AlarmForOpenSearch': f'{template_prefix}/AlarmForOpenSearch.template',
        'KDSStack': f'{template_prefix}/KDSStack.template',
        'KDSStackNoAutoScaling': f'{template_prefix}/KDSStackNoAutoScaling.template',
        'S3toKDSStack': f'{template_prefix}/S3toKDSStack.template',
    }

    if pattern not in tpl_list:
        raise RuntimeError(f"Unable to find template for pattern {pattern}")
    return tpl_list.get(pattern)
