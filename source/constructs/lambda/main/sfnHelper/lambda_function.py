# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import os
import json
import logging

import boto3
from botocore import config

logger = logging.getLogger()
logger.setLevel(logging.INFO)

solution_version = os.environ.get('SOLUTION_VERSION', 'v1.0.0')
solution_id = os.environ.get('SOLUTION_ID', 'SO8025')
user_agent_config = {
    'user_agent_extra': f'AwsSolution/{solution_id}/{solution_version}'}
default_config = config.Config(**user_agent_config)

sfn = boto3.client('stepfunctions', config=default_config)


def lambda_handler(event, context):
    """
    It's expected that the event (input) must be in a format of 
    {
        'token': token,
        'args': {
            'stackId': stackId,
            ...
        },
        'result': {
            'stackStatus': status,
            'error': error,
            '
        }

    }
    """

    # print("Received event: " + json.dumps(event, indent=2))

    try:
        token = event['token']
        args = event['args']
        result = event['result']
        output = {
            'stackId': args.get('stackId', ''),
            'stackStatus': result.get('stackStatus', 'UNKNOWN'),
            'error': result.get('error', ''),
            'outputs': result.get('outputs', [])
        }

        notify_parent_flow(token, output)

    except Exception as e:
        logger.error(e)
        logger.error("Invalid Request received: " +
                     json.dumps(event, indent=2))

    return 'OK'


def notify_parent_flow(token, output):
    """ Return the outputs to parent flow """
    logger.info(f'Send success to parent flow with output {output}')
    sfn.send_task_success(
        taskToken=token,
        output=json.dumps(output)
    )
