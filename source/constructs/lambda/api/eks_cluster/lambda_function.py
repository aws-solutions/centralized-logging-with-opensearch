# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import json
import logging
import os
from botocore import config
from eks_cluster import EksClusterManager
from exception import APIException

logger = logging.getLogger()
logger.setLevel(logging.INFO)

solution_version = os.environ.get("SOLUTION_VERSION", "v1.0.0")
solution_id = os.environ.get("SOLUTION_ID", "SO8025")
user_agent_config = {
    "user_agent_extra": f"AwsSolution/{solution_id}/{solution_version}"
}
default_config = config.Config(**user_agent_config)

eks_cluster_manager = EksClusterManager()


def handle_error(func):
    """Decorator for exception handling"""

    def wrapper(*args, **kwargs):
        try:
            return func(*args, **kwargs)
        except APIException as e:
            logger.error(e)
            raise e
        except Exception as e:
            logger.error(e)
            raise RuntimeError(
                "Unknown exception, please check Lambda log for more details"
            )

    return wrapper


@handle_error
def lambda_handler(event, context):
    # logger.info("Received event: " + json.dumps(event, indent=2))

    action = event["info"]["fieldName"]
    args = event["arguments"]

    if action == "listEKSClusterNames":
        return eks_cluster_manager.list_eks_cluster_names(**args)
    elif action == "listImportedEKSClusters":
        return eks_cluster_manager.list_imported_eks_clusters(**args)
    elif action == "getEKSClusterDetails":
        return eks_cluster_manager.get_eks_cluster_details(**args)
    elif action == "importEKSCluster":
        return eks_cluster_manager.import_eks_cluster(**args)
    elif action == "removeEKSCluster":
        return eks_cluster_manager.remove_eks_cluster(**args)
    else:
        logger.info("Event received: " + json.dumps(event, indent=2))
        raise APIException(f"Unknown action {action}")
