# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import json
import logging
import os

from botocore import config

from util.eks_deployment_configuration import EKSClusterPodDeploymentConfigurationMng
from util.exception import APIException

logger = logging.getLogger()
logger.setLevel(logging.INFO)

solution_version = os.environ.get("SOLUTION_VERSION", "v1.0.0")
solution_id = os.environ.get("SOLUTION_ID", "SO8025")
user_agent_config = {
    "user_agent_extra": f"AwsSolution/{solution_id}/{solution_version}"
}
default_config = config.Config(**user_agent_config)
default_region = os.environ.get('AWS_REGION')


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


@handle_error
def lambda_handler(event, context):
    # logger.info("Received event: " + json.dumps(event, indent=2))

    action = event['info']['fieldName']
    args = event['arguments']
    deploy_config_mng = EKSClusterPodDeploymentConfigurationMng(eks_cluster_id=args['eksClusterId'])
    if action == 'getEKSDaemonSetConfig':
        return deploy_config_mng.get_configuration()
    elif action == 'getEKSSidecarConfig' or action == 'getEKSDeploymentConfig':
        if args['ingestionId']:
            deploy_config_mng.set_app_ingestion_id(args['ingestionId'])
        return deploy_config_mng.get_configuration()
    else:
        logger.info('Event received: ' + json.dumps(event, indent=2))
        raise APIException(f'Unknown action {action}')
