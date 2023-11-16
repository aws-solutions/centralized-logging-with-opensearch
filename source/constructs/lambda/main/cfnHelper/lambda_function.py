# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0
import os
import json
import logging
from abc import ABC, abstractmethod

import boto3
from botocore import config
from commonlib import AWSConnection, LinkAccountHelper
logger = logging.getLogger()
logger.setLevel(logging.INFO)

solution_version = os.environ.get("SOLUTION_VERSION", "v1.0.0")
solution_id = os.environ.get("SOLUTION_ID", "SO8025")
user_agent_config = {
    "user_agent_extra": f"AwsSolution/{solution_id}/{solution_version}"
}
default_config = config.Config(**user_agent_config)

default_region = os.environ.get("AWS_REGION")

template_output_bucket = os.environ.get("TEMPLATE_OUTPUT_BUCKET", "aws-gcr-solutions")
solution_name = os.environ.get("SOLUTION_NAME", "clo")
template_prefix = f"https://{template_output_bucket}.s3.amazonaws.com/{solution_name}/{solution_version}"

sts = boto3.client("sts", config=default_config)
account_id = sts.get_caller_identity()["Account"]

conn = AWSConnection()
# link account
sub_account_link_table_name = os.environ.get("SUB_ACCOUNT_LINK_TABLE_NAME")
account_helper = LinkAccountHelper(sub_account_link_table_name)


class Context:
    def __init__(self, action, args):
        if action == "START":
            self._state = StartState(self, args)
        elif action == "STOP":
            self._state = StopState(self, args)
        else:
            self._state = QueryState(self, args)

        self._deploy_account_id = args.get("deployAccountId") or account_id
        self._deploy_region = args.get("deployRegion") or default_region
        link_account = account_helper.get_link_account(self._deploy_account_id, self._deploy_region)
        if link_account and "subAccountRoleArn" in link_account:
            self._cfn = conn.get_client(service_name="cloudformation", region_name=self._deploy_region,sts_role_arn=link_account.get("subAccountRoleArn"))
        else:
            self._cfn = conn.get_client(service_name="cloudformation", region_name=self._deploy_region)
        

    def get_client(self):
        return self._cfn

    def get_deploy_info(self):
        return {
            "deployAccountId": self._deploy_account_id,
            "deployRegion": self._deploy_region,
        }

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
            stack_id = start_cfn(
                self._context.get_client(), stack_name, pattern, params
            )
            args = {
                "stackId": stack_id,
                "deployAccountId": self._context.get_deploy_info()["deployAccountId"],
                "deployRegion": self._context.get_deploy_info()["deployRegion"],
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
            stop_cfn(self._context.get_client(), self._args["stackId"])
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
            status, outputs = get_cfn_status(
                self._context.get_client(), self._args["stackId"]
            )
        except Exception as e:
            status = "QUERY_FAILED"
            error = str(e)
        return {
            "stackStatus": status,
            "error": error,
            "outputs": outputs,
        }


def lambda_handler(event, _):
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


def start_cfn(cfn_client: boto3.client, stack_name, pattern, params):
    logger.info("Start CloudFormation deployment")

    template_url = get_template_url(pattern)

    response = cfn_client.create_stack(
        StackName=stack_name,
        TemplateURL=template_url,
        Parameters=params,
        DisableRollback=False,
        Capabilities=[
            "CAPABILITY_IAM",
            "CAPABILITY_NAMED_IAM",
        ],
        EnableTerminationProtection=False,
    )

    stack_id = response["StackId"]
    return stack_id


def stop_cfn(cfn_client: boto3.client, stack_id):
    logger.info("Delete CloudFormation deployment")
    cfn_client.delete_stack(
        StackName=stack_id,
    )


def get_cfn_status(cfn_client: boto3.client, stack_id):
    logger.info("Get CloudFormation deployment status")
    response = cfn_client.describe_stacks(
        StackName=stack_id,
    )

    stack = response["Stacks"][0]
    stack_status = stack["StackStatus"]
    outputs = stack["Outputs"] if "Outputs" in stack else []
    return stack_status, outputs


def get_template_url(pattern):
    tpl_list = {
        "S3": f"{template_prefix}/S3AccessLog.template",
        "CloudTrail": f"{template_prefix}/CloudTrailLog.template",
        "CloudFront": f"{template_prefix}/CloudFrontLog.template",
        "RDS": f"{template_prefix}/RDSLog.template",
        "Lambda": f"{template_prefix}/LambdaLog.template",
        "ELB": f"{template_prefix}/ELBLog.template",
        "WAF": f"{template_prefix}/WAFLog.template",
        "WAFSampled": f"{template_prefix}/WAFSampledLog.template",
        "VPC": f"{template_prefix}/VPCFlowLog.template",
        "Config": f"{template_prefix}/ConfigLog.template",
        "CloudTrailLogOSIProcessor": f"{template_prefix}/CloudTrailLogOSIProcessor.template",
        "ELBLogOSIProcessor": f"{template_prefix}/ELBLogOSIProcessor.template",
        "VPCFlowLogOSIProcessor": f"{template_prefix}/VPCFlowLogOSIProcessor.template",
        "WAFLogOSIProcessor": f"{template_prefix}/WAFLogOSIProcessor.template",
        "ProxyForOpenSearch": f"{template_prefix}/NginxForOpenSearch.template",
        "AlarmForOpenSearch": f"{template_prefix}/AlarmForOpenSearch.template",
        "S3toKDSStack": f"{template_prefix}/S3toKDSStack.template",
        "S3SourceStack": f"{template_prefix}/S3SourceStack.template",
        "AppLogKDSBuffer": f"{template_prefix}/AppLogKDSBuffer.template",
        "AppLogKDSBufferNoAutoScaling": f"{template_prefix}/AppLogKDSBufferNoAutoScaling.template",
        "AppLogS3BufferOSIProcessor": f"{template_prefix}/AppLogS3BufferOSIProcessor.template",
        "AppLogMSKBuffer": f"{template_prefix}/AppLogMSKBuffer.template",
        "AppLogS3Buffer": f"{template_prefix}/AppLogS3Buffer.template",
        "AppLog": f"{template_prefix}/AppLog.template",
        "SyslogtoECSStack": f"{template_prefix}/SyslogtoECSStack.template",
        "CloudFrontRealtimeLogKDSBufferNoAutoScaling": f"{template_prefix}/CloudFrontRealtimeLogKDSBufferNoAutoScaling.template",
        "CloudFrontRealtimeLogKDSBuffer": f"{template_prefix}/CloudFrontRealtimeLogKDSBuffer.template",
        "CloudWatchLogKDSBuffer": f"{template_prefix}/CloudWatchLogKDSBuffer.template",
        "CloudWatchLogKDSBufferNoAutoScaling": f"{template_prefix}/CloudWatchLogKDSBufferNoAutoScaling.template",
        "MicroBatchAwsServicesWafPipeline": f"{template_prefix}/MicroBatchAwsServicesWafPipeline.template",
        "MicroBatchAwsServicesCloudFrontPipeline": f"{template_prefix}/MicroBatchAwsServicesCloudFrontPipeline.template",
        "MicroBatchAwsServicesAlbPipeline": f"{template_prefix}/MicroBatchAwsServicesAlbPipeline.template",
        "MicroBatchApplicationFluentBitPipeline": f"{template_prefix}/MicroBatchApplicationFluentBitPipeline.template",
    }

    if pattern not in tpl_list:
        raise RuntimeError(f"Unable to find template for pattern {pattern}")
    return tpl_list.get(pattern)
