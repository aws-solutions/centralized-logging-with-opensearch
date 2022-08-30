# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import json
import logging
from util.log_agent_helper import IngestionTask
from util.exception import APIException
from util.kds_role_mgr import KDSRoleMgr
from util.sys_enum_type import SOURCETYPE

logger = logging.getLogger()
logger.setLevel(logging.INFO)


def handle_error(func):
    """ Decorator for exception handling """

    def wrapper(*args, **kwargs):
        try:
            return func(*args, **kwargs)
        except APIException as e:
            logger.error(e)
            raise e
        except Exception as e:
            logger.error(e)
            raise RuntimeError(
                'Unknown exception, please check Lambda log for more details')

    return wrapper


@handle_error
def lambda_handler(event, context):
    # logger.info("Received event: " + json.dumps(event, indent=2))

    action = event['action']
    args = event
    if action == "asyncCreateAppLogIngestion":
        return child_create_app_log_ingestion(**args)
    elif action == "asyncDeleteAppLogIngestion":
        return child_delete_app_log_ingestion(**args)
    else:
        logger.info('Event received: ' + json.dumps(event, indent=2))
        raise RuntimeError(f'Unknown async action {action}')


def child_create_app_log_ingestion(**args):
    # Create or update kds role
    KDSRoleMgr.generate_kds_role_4_fluent_bit(
        app_pipeline_id=args['appPipelineId'],
        source_type=SOURCETYPE.S3,
        source_ids=args['sourceIds'])
    ingestion_task = IngestionTask('FluentDS3', args['sourceIds'][0],
                                   args['confId'], args['appPipelineId'], '',
                                   args['is_multiline'])
    ingestion_task.create_ingestion()


def child_delete_app_log_ingestion(**args):
    # Currently, this function has no action on EC2.
    # Cause EC2 will be terminated by ASG.
    ingestion_task = IngestionTask("FluentDS3", "", "", "", args["ids"][0],
                                   False)
    ingestion_task.delete_ingestion()
