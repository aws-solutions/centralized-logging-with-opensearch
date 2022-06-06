# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import json
import logging
import os
from botocore import config

from util.log_ingestion_svc import LogIngestionSvc
from util.exception import APIException
from util.sys_enum_type import SOURCETYPE
logger = logging.getLogger()
logger.setLevel(logging.INFO)

solution_version = os.environ.get("SOLUTION_VERSION", "v1.0.0")
solution_id = os.environ.get("SOLUTION_ID", "SO8025")
user_agent_config = {
    "user_agent_extra": f"AwsSolution/{solution_id}/{solution_version}"
}
default_config = config.Config(**user_agent_config)

log_ingestion_svc = LogIngestionSvc()


def handle_error(func):
    """ Decorator for exception handling """

    def wrapper(*args, **kwargs):
        try:
            return func(*args, **kwargs)
        except APIException as e:
            logger.exception(e)
            raise e
        except Exception as e:
            logger.exception(e)
            raise RuntimeError(
                'Unknown exception, please check Lambda log for more details')

    return wrapper


def lambda_handler(event, context):
    logger.info(f"EKS pipe line Received event:{event}")
    output = {}
    try:
        args = event["args"] if "args" in event else {}
        args['appPipelineId'] = event['appPipelineId']
        args['appLogIngestionId'] = event['appLogIngestionId']
        args['sourceType']=SOURCETYPE.EKS_CLUSTER.value
        
        result = event['result']
        args['stackId'] = result['stackId']
        log_ingestion_svc.update_eks_cluster_pod_log_ingestion(**args)

    except Exception as e:
        logger.exception(e)
        logger.error("Invalid Request received: " + json.dumps(event, indent=2))

    return output
