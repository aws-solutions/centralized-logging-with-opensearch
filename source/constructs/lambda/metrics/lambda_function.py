# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import json
from logging import getLogger, INFO
import uuid

import cfnresponse
from commonlib.solution_metrics import send_metrics

logger = getLogger(__name__)
logger.setLevel(INFO)

def handler(event, context):
    """Handle the Lambda request for a deployment action"""
    response_data: dict[str, str] = {}
    logger.info(f"received event: {json.dumps(event)}")
    try:
        request_type = event['RequestType']
        resource_properties = event.get("ResourceProperties", {})

        if event['ResourceType'] == "Custom::CreateUUID" and request_type == 'Create':
            response_data['UUID'] = str(uuid.uuid4())

        if event.get("ResourceType", '') == "Custom::AnonymousMetrics":
            
            metrics_data = {}
            metrics_data["RequestType"] = request_type
            metrics_data["Region"] = resource_properties["Region"]
            metrics_data["Template"] = resource_properties["Template"]
            logger.debug(f"Sending metrics data {metrics_data}")
            send_metrics(metrics_data, resource_properties["DeploymentUuid"])

        cfnresponse.send(event, context, cfnresponse.SUCCESS, response_data, event.get('PhysicalResourceId', ""))
    except Exception as exc:
        logger.exception(exc)
        cfnresponse.send(
            event,
            context,
            cfnresponse.FAILED,
            response_data,
            reason=str(exc),
        )