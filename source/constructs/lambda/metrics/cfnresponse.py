# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0
 
from __future__ import print_function
import urllib3
import json
import re
from logging import getLogger, INFO

SUCCESS = "SUCCESS"
FAILED = "FAILED"

http = urllib3.PoolManager()

logger = getLogger(__name__)
logger.setLevel(INFO)


def send(event, context, response_status, response_data, physical_resource_id=None, no_echo=False, reason=None):
    response_url = event['ResponseURL']

    response_body = {
        'Status' : response_status,
        'Reason' : reason or "See the details in CloudWatch Log Stream: {}".format(context.log_stream_name),
        'PhysicalResourceId' : physical_resource_id or context.log_stream_name,
        'StackId' : event['StackId'],
        'RequestId' : event['RequestId'],
        'LogicalResourceId' : event['LogicalResourceId'],
        'NoEcho' : no_echo,
        'Data' : response_data
    }

    json_response_body = json.dumps(response_body)

    logger.info(f"Response body: {json_response_body}")
    headers = {
        'content-type' : '',
        'content-length' : str(len(json_response_body))
    }

    try:
        response = http.request('PUT', response_url, headers=headers, body=json_response_body)
        logger.info(f"Status code: {response.status}")
    except Exception as e:
        logger.error(f"send(..) failed executing http.request(..): {mask_credentials_and_signature(e)}")
 
 
def mask_credentials_and_signature(message):
    message = re.sub(r'X-Amz-Credential=[^&\s]+', 'X-Amz-Credential=*****', message, flags=re.IGNORECASE)
    return re.sub(r'X-Amz-Signature=[^&\s]+', 'X-Amz-Signature=*****', message, flags=re.IGNORECASE)