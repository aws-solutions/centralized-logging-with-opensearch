# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import logging
import os
import json


from commonlib import AWSConnection, AppSyncRouter, handle_error
from commonlib.exception import APIException, ErrorCode
from util.alarm_helper import AlarmHelper

logger = logging.getLogger()
logger.setLevel(logging.INFO)

conn = AWSConnection()
router = AppSyncRouter()

stack_prefix = os.environ.get("STACK_PREFIX", "CL")


@handle_error
def lambda_handler(event, _):
    """
    This lambda handles request for central alarm system.
    """

    logger.info("Received event: " + json.dumps(event, indent=2))
    return router.resolve(event)


@router.route(field_name="getPipelineAlarm")
def get_pipeline_alarm(**args):
    """Function to get the alarm status
    Including whether enable the alarm,
    and the status of each alarm item.
    """
    pipeline_id = args["pipelineId"]
    pipeline_type = args["pipelineType"]
    alarm_name = args.get("alarmName") or ""

    alarm_helper = AlarmHelper(pipeline_id, "", "", pipeline_type)
    return alarm_helper.get_alarms(alarm_name)


@router.route(field_name="createPipelineAlarm")
def create_pipeline_alarm(**args):
    """Function to create the alarm for a specific pipeline"""
    pipeline_id = args["pipelineId"]
    pipeline_type = args["pipelineType"]
    sns_topic_arn = args.get("snsTopicArn")
    sns_topic_name = args.get("snsTopicName")
    emails = args.get("emails") or ""

    alarm_helper = AlarmHelper(pipeline_id, sns_topic_arn, emails, pipeline_type)
    alarm_helper.create_alarms(sns_topic_name)
    return "OK"


@router.route(field_name="updatePipelineAlarm")
def update_pipeline_alarm(**args):
    """Function to update the alarm for a specific pipeline
    Currently only support to update the alarm destination config
    """
    pipeline_id = args["pipelineId"]
    pipeline_type = args["pipelineType"]
    if not args.get("snsTopicArn"):
        raise APIException(ErrorCode.INVALID_ITEM, "SNS topic arn can not be empty")
    sns_topic_arn = args.get("snsTopicArn")
    emails = args.get("emails") or ""

    alarm_helper = AlarmHelper(pipeline_id, sns_topic_arn, emails, pipeline_type)
    alarm_helper.update_alarms()
    return "OK"


@router.route(field_name="deletePipelineAlarm")
def delete_pipeline_alarm(**args):
    """Function to delete the alarm for a specific pipeline"""
    pipeline_id = args["pipelineId"]
    pipeline_type = args["pipelineType"]

    alarm_helper = AlarmHelper(pipeline_id, "", "", pipeline_type)
    alarm_helper.delete_alarms()
    return "OK"
