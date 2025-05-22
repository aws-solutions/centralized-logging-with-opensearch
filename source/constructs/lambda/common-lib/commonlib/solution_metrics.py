# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0
import json
from datetime import datetime, timezone
from logging import getLogger, INFO
from urllib.request import Request, urlopen
from urllib.parse import quote
import os

logger = getLogger(__name__)
logger.setLevel(INFO)


def send_metrics(metrics_data: dict, deployment_uuid: str = '') -> None:
    """Send anonymized metrics if enabled"""
    try:
        if os.getenv('SEND_ANONYMIZED_USAGE_DATA', '').lower() == 'yes' and metrics_data is not None:
            usage_data = {
                "Solution": "SO8025",
                "UUID": os.getenv('DEPLOYMENT_UUID', deployment_uuid),
                "TimeStamp": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%f"),
                "Data": metrics_data,
                "Version": os.getenv("SOLUTION_VERSION", ""),
            }
            logger.debug(f"Sending metrics data {json.dumps(usage_data)}")
            invoke_metrics_api(usage_data)
    except Exception as excep:
        logger.error(excep)

def invoke_metrics_api(payload) -> None:
    """Send metrics payload to the API endpoint"""
    url = "https://metrics.awssolutionsbuilder.com/generic"

    request_data = quote(json.dumps(payload)).encode('utf-8')
    api_request = Request(
        url,
        method="POST",
        data=request_data,
        headers={"Content-Type": "application/json"},
    )
    try:
        with urlopen(api_request) as response:
            response.read().decode('utf-8')  
            logger.debug(f"Metrics API response Status code: {response.status}")
    except Exception as e:
        logger.info(f"Error while sending metrics data: {str(e)}")
 