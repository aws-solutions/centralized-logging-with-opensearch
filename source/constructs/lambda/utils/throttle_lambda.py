# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0
import os
import boto3
import textwrap

from commonlib.logging import get_logger
from commonlib.dao import SvcPipelineDao, AppPipelineDao
from commonlib.model import StatusEnum

SVC_PIPELINE_TABLE_NAME = os.environ["PIPELINE_TABLE_NAME"]
APP_PIPELINE_TABLE_NAME = os.environ["APP_PIPELINE_TABLE_NAME"]
SNS_EMAIL_TOPIC_ARN = os.environ["SNS_EMAIL_TOPIC_ARN"]

logger = get_logger("throttle_lambda")

svc_pipeline_dao = SvcPipelineDao(SVC_PIPELINE_TABLE_NAME)
app_pipeline_dao = AppPipelineDao(APP_PIPELINE_TABLE_NAME)


def extract_lambda_arn(event):
    account_id = event["accountId"]
    region = event["region"]
    function_name = None

    # Determine the partition based on the region
    if region.startswith("cn-"):
        partition = "aws-cn"
    else:
        partition = "aws"

    # Iterate through the metrics to find the function name
    for metric in event["alarmData"]["configuration"]["metrics"]:
        dimensions = (
            metric.get("metricStat", {}).get("metric", {}).get("dimensions", {})
        )
        if "FunctionName" in dimensions:
            function_name = dimensions["FunctionName"]
            break

    # Construct the Lambda ARN
    if function_name:
        lambda_arn = (
            f"arn:{partition}:lambda:{region}:{account_id}:function:{function_name}"
        )
        return lambda_arn
    else:
        return None


def extract_pipeline_type_pipeline_id_prefix_from_arn(arn):
    # Split the ARN string to get the last part containing the function name
    function_name_part = arn.split(":")[-1]
    # Split the function name part to get the desired pattern
    function_name_parts = function_name_part.split("-")
    if len(function_name_parts) > 2:
        return function_name_parts[1], function_name_parts[2]
    return None


def get_lambda_concurrency(lambda_arn):
    # Create a boto3 client for Lambda
    client = boto3.client("lambda")

    # Get the Lambda function concurrency
    response = client.get_function_concurrency(FunctionName=lambda_arn)
    return response.get("ReservedConcurrentExecutions")


def throttle_lambda(lambda_arn):
    # Extract the region from the Lambda ARN
    arn_parts = lambda_arn.split(":")
    region = arn_parts[3]

    # Create a boto3 client for Lambda in the correct region
    client = boto3.client("lambda", region_name=region)

    # Set the concurrency limit to 0
    response = client.put_function_concurrency(
        FunctionName=lambda_arn, ReservedConcurrentExecutions=0
    )

    return response


def send_sns_message(topic_arn, message, subject=None):
    # Create an SNS client
    sns_client = boto3.client("sns")

    # Prepare the parameters for the publish action
    params = {"TopicArn": topic_arn, "Message": message}
    if subject:
        params["Subject"] = subject

    # Publish the message to the SNS topic
    response = sns_client.publish(**params)

    return response


def handler(event, _):
    logger.info(event)

    lambda_arn = extract_lambda_arn(event)
    if not lambda_arn:
        logger.warn(f"Unable to extract lambda arn from event: {event}")
        return

    result = extract_pipeline_type_pipeline_id_prefix_from_arn(lambda_arn)
    if not result:
        logger.warn(
            f"Unable to extract pipeline type and pipeline id prefix from arn: {lambda_arn}"
        )
        return

    pipe_type, pipe_id_prefix = result
    pipe_type = pipe_type.lower()

    concurrency = get_lambda_concurrency(lambda_arn)

    if "app" in pipe_type:
        pipelines = app_pipeline_dao.find_id_begins_with(pipe_id_prefix)
        if pipelines:
            p = pipelines[0]
            app_pipeline_dao.update_log_processor_last_concurrency(
                p.pipelineId, concurrency
            )
    else:
        pipelines = svc_pipeline_dao.find_id_begins_with(pipe_id_prefix)
        if pipelines:
            p = pipelines[0]
            svc_pipeline_dao.update_log_processor_last_concurrency(p.id, concurrency)

    throttle_lambda(lambda_arn)

    def _do_send_email(pipeline_id: str):
        send_sns_message(
            SNS_EMAIL_TOPIC_ARN,
            subject="[Action needed] Your log analytics pipeline has been paused",
            message=textwrap.dedent(
                """\
                    Dear,
                    This notification is to inform you that your log analytics pipeline ({}) has been paused. This action was automatically taken because the error rate in the log processing has exceeded the threshold.
                    To investigate why your pipeline has been paused, please visit the Metrics and Logging page. This page provides detailed insights and metrics that can help you identify and address the underlying issues.
                    For more information, please visit the FAQ https://docs.aws.amazon.com/solutions/latest/centralized-logging-with-opensearch/frequently-asked-questions.html and Troubleshooting https://docs.aws.amazon.com/solutions/latest/centralized-logging-with-opensearch/troubleshooting.html sections on the implementation guide.
                    Best Regards,
                    Centralized Logging with OpenSearch solution
                """.format(
                    pipeline_id
                )
            ),
        )

    if "app" in pipe_type:
        pipelines = app_pipeline_dao.find_id_begins_with(pipe_id_prefix)
        if pipelines:
            p = pipelines[0]
            app_pipeline_dao.update_app_pipeline(p.pipelineId, status=StatusEnum.PAUSED)
            _do_send_email(p.pipelineId)
    else:
        pipelines = svc_pipeline_dao.find_id_begins_with(pipe_id_prefix)
        if pipelines:
            p = pipelines[0]
            svc_pipeline_dao.update_svc_pipeline(p.id, status=StatusEnum.PAUSED)
            _do_send_email(p.id)
