# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import json
import os
import boto3
import logging

from botocore import config

logger = logging.getLogger()
logger.setLevel(logging.INFO)

solution = os.environ.get("SOLUTION", "SO8025/v1.0.0")
user_agent_config = {"user_agent_extra": f"AwsSolution/{solution}"}
default_config = config.Config(**user_agent_config)

client_kinesis = boto3.client("kinesis", config=default_config)
client_ssm = boto3.client("ssm", config=default_config)
client_cloudwatch = boto3.client("cloudwatch", config=default_config)
client_lambda = boto3.client("lambda", config=default_config)
client_cloudformation = boto3.client("cloudformation", config=default_config)

PARAMETER_STORE = os.environ["ParameterStore"]
AUTOSCALINGPOLICYOUT_ARN = ""
AUTOSCALINGPOLICYIN_ARN = ""
CLOUDWATCHALARMNAMEOUT = os.environ["CloudWatchAlarmNameOut"]
CLOUDWATCHALARMNAMEIN = os.environ["CloudWatchAlarmNameIn"]

failure_reason = ""


def update_shards(desired_capacity, resource_name):
    global failure_reason
    # Update the shard count to the new Desired Capacity value
    try:
        response = client_kinesis.update_shard_count(
            StreamName=resource_name,
            TargetShardCount=int(desired_capacity),
            ScalingType="UNIFORM_SCALING",
        )
        logger.info("Response: %s", response)
        scaling_status = "InProgress"

        # need also to update alarm threshold using the put_metric_alarm
        update_alarm_out(int(desired_capacity), resource_name)
        update_alarm_in(int(desired_capacity), resource_name)

    # In case of error of updating the sharding, raise an exception. Possible cause, you cannot re-shard more than twice a day
    except Exception as e:
        logger.error(e)
        failure_reason = str(e)
        scaling_status = "Failed"

    return scaling_status


# function to update scale out alarm threshol
def update_alarm_out(shards, stream):
    new_threshold = (
        (1000 * shards * 60) * 80 / 100
    )  # assuming alarm will fire at 80% of incoming records
    try:
        client_cloudwatch.put_metric_alarm(
            AlarmName=CLOUDWATCHALARMNAMEOUT,
            AlarmDescription="incomingRecord exceeds threshold",
            MetricName="IncomingRecords",
            Namespace="AWS/Kinesis",
            Dimensions=[{"Name": "StreamName", "Value": stream}],
            Statistic="Sum",
            Period=60,
            EvaluationPeriods=1,
            Threshold=new_threshold,
            ComparisonOperator="GreaterThanThreshold",
            AlarmActions=[AUTOSCALINGPOLICYOUT_ARN],
        )
    except Exception as e:
        logger.error(e)


# fuction to update scale in alarm threshol
def update_alarm_in(shards, stream):
    new_threshold = (
        (1000 * shards * 60) * 80 / 100
    )  # assuming alarm will fire at 80% of incoming records
    try:
        client_cloudwatch.put_metric_alarm(
            AlarmName=CLOUDWATCHALARMNAMEIN,
            AlarmDescription="incomingRecord below threshold",
            MetricName="IncomingRecords",
            Namespace="AWS/Kinesis",
            Dimensions=[{"Name": "StreamName", "Value": stream}],
            Statistic="Sum",
            Period=300,
            EvaluationPeriods=3,
            Threshold=new_threshold,
            ComparisonOperator="LessThanThreshold",
            AlarmActions=[AUTOSCALINGPOLICYIN_ARN],
        )
    except Exception as e:
        logger.error(e)


def response_function(status_code, response_body):
    return_json = {
        "statusCode": status_code,
        "body": json.dumps(response_body) if response_body else json.dumps({}),
        "headers": {
            "Content-Type": "application/json",
        },
    }
    # log response
    logger.info(return_json)
    return return_json


# trick for updating environment variable with application autoscaling arn (need to update all the current variables)
def autoscaling_policy_arn(context):
    logger.info(context.function_name)
    function_name = context.function_name
    logger.info(context.invoked_function_arn)
    tags = client_lambda.list_tags(Resource=context.invoked_function_arn)

    logger.info(tags)
    stack_name = tags["Tags"]["aws:cloudformation:stack-name"]
    logger.info(stack_name)

    response = client_cloudformation.describe_stack_resources(
        StackName=stack_name, LogicalResourceId="KinesisScaleOut"
    )

    auto_scaling_policy_out = response["StackResources"][0]["PhysicalResourceId"]
    logger.info("Autoscaling Policy Out: " + auto_scaling_policy_out)
    response2 = client_cloudformation.describe_stack_resources(
        StackName=stack_name, LogicalResourceId="KinesisScaleIn"
    )

    auto_scaling_policy_in = response2["StackResources"][0]["PhysicalResourceId"]
    logger.info("Autoscaling Policy In: " + auto_scaling_policy_in)

    response = client_lambda.update_function_configuration(
        FunctionName=function_name,
        Timeout=3,
        Environment={
            "Variables": {
                "AutoScalingPolicyOut": auto_scaling_policy_out,
                "AutoScalingPolicyIn": auto_scaling_policy_in,
                "ParameterStore": PARAMETER_STORE,
                "CloudWatchAlarmNameOut": CLOUDWATCHALARMNAMEOUT,
                "CloudWatchAlarmNameIn": CLOUDWATCHALARMNAMEIN,
            }
        },
    )
    logger.info(response)
    return response


def get_desired_capacity(actual_capacity):
    response = client_ssm.get_parameter(Name=PARAMETER_STORE)
    logger.info(response)

    desired_capacity = actual_capacity

    if "Parameter" in response:
        if "Value" in response["Parameter"]:
            desired_capacity = response["Parameter"]["Value"]
            logger.info(desired_capacity)
    else:
        # if I do not have an entry in ParameterStore, I assume that the desired_capacity is like the actualCapacity
        desired_capacity = actual_capacity

    return desired_capacity


def if_autoscaling_policy_arn(context):
    if ("AutoScalingPolicyOut" not in os.environ) and (
        "AutoScalingPolicyIn" not in os.environ
    ):
        autoscaling_policy_arn(context)


def lambda_handler(event, context):
    # log the event
    logger.info(json.dumps(event))

    # get Stream name
    if "scalableTargetDimensionId" in event["pathParameters"]:
        resource_name = event["pathParameters"]["scalableTargetDimensionId"]
        logger.info(resource_name)
    else:
        message = "Error, scalableTargetDimensionId not found"
        return response_function(400, str(message))

    # try to get information of the Kinesis stream
    try:
        response = client_kinesis.describe_stream_summary(
            StreamName=resource_name,
        )
        logger.info(response)
        stream_status = response["StreamDescriptionSummary"]["StreamStatus"]
        shards_number = response["StreamDescriptionSummary"]["OpenShardCount"]
        actual_capacity = shards_number
    except Exception as e:
        logger.error(e)
        message = "Error, cannot find a Kinesis stream called " + resource_name
        return response_function(404, message)

    # try to retrive the desired capacity from ParameterStore
    desired_capacity = get_desired_capacity(actual_capacity)

    if stream_status == "UPDATING":
        scaling_status = "InProgress"
    elif stream_status == "ACTIVE":
        scaling_status = "Successful"

    global failure_reason
    if event["httpMethod"] == "PATCH":
        # Check whether autoscaling is calling to change the Desired Capacity
        if "desiredCapacity" in event["body"]:
            desired_capacity_body = json.loads(event["body"])
            desired_capacity_body = desired_capacity_body["desiredCapacity"]

            # Check whether the new desired capacity is negative. If so, I need to calculate the new desired capacity
            if int(desired_capacity_body) >= 0:
                desired_capacity = desired_capacity_body

                # Store the new desired capacity in a ParamenterStore
                response = client_ssm.put_parameter(
                    Name=PARAMETER_STORE,
                    Value=str(int(desired_capacity)),
                    Type="String",
                    Overwrite=True,
                )
                logger.info(response)
                logger.info("Trying to set capacity to " + str(desired_capacity))

                global AUTOSCALINGPOLICYOUT_ARN
                global AUTOSCALINGPOLICYIN_ARN

                if_autoscaling_policy_arn(context)

                AUTOSCALINGPOLICYOUT_ARN = os.environ["AutoScalingPolicyOut"]
                AUTOSCALINGPOLICYIN_ARN = os.environ["AutoScalingPolicyIn"]

                scaling_status = update_shards(desired_capacity, resource_name)

    if scaling_status == "Successful" and float(desired_capacity) != float(
        actual_capacity
    ):
        scaling_status = update_shards(desired_capacity, resource_name)

    returning_json = {
        "actualCapacity": float(actual_capacity),
        "desiredCapacity": float(desired_capacity),
        "dimensionName": resource_name,
        "resourceName": resource_name,
        "scalableTargetDimensionId": resource_name,
        "scalingStatus": scaling_status,
        "version": "MyVersion",
    }

    try:
        returning_json["failureReason"] = failure_reason
    except Exception:
        pass

    logger.info(returning_json)

    return response_function(200, returning_json)
