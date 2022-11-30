# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import json
import logging
import os

from util.distribute_config_helper.distribute_config_helper import \
    DistributeConfigHelper
from util.exception import APIException
from util.fluentbit_config_helper.ddb_connect import SyslogDDBConnect, PipeObject
from util.log_agent_helper_v2 import SyslogFLBConfigMgr

logger = logging.getLogger()
logger.setLevel(logging.INFO)

config_file_s3_bucket_name = os.environ.get('CONFIG_FILE_S3_BUCKET_NAME')

def handle_error(func):
    """ Decorator for exception handling """

    def wrapper(*args, **kwargs):
        try:
            return func(*args, **kwargs)
        except APIException as err:
            logger.error(err, exc_info=True)
            raise err
        except Exception as err:
            logger.error(err, exc_info=True)
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
    else:
        logger.info('Event received: ' + json.dumps(event, indent=2))
        raise RuntimeError(f'Unknown async action {action}')


def child_create_app_log_ingestion(**args):
    """
    Function to create flunet-bit config file and distribute to the s3 bucket.
    The ECS Service pipeline is created by sub cloudformation stack.
    """
    # Syslog do not need to create buffer role.
    # It use ECS Service role to access the buffer layer.
    pipe_object_list = [
        PipeObject(
            source_id=args["sourceId"],
            config_id=args["confId"],
            app_pipeline_id=args["appPipelineId"],
        )
    ]
    ddb_connect = SyslogDDBConnect(pipe_object_list)
    syslog_flb_config_mgr = SyslogFLBConfigMgr(ddb_connect)
    distribute_helper = DistributeConfigHelper()
    
    syslog_flb_config_mgr.generate_agent_config()
    agent_configs = syslog_flb_config_mgr.get_agent_configs()
    port = syslog_flb_config_mgr.get_port()

    for file_name, content in agent_configs.items():
        distribute_helper.fwrite(
            file_path='/tmp/log_config/syslog/' + port + '/',
            file_name=file_name,
            content=content
        )
    distribute_helper.upload_folder_to_s3(
        input_dir='/tmp/log_config',
        s3_bucket_name=config_file_s3_bucket_name,
        s3_path='app_log_config',
    )
