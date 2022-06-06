'''
Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
'''

import boto3
import os
import opensearchTools
import time
import logging
import datetime
from botocore import config

logger = logging.getLogger(__name__)

solution = os.environ.get('SOLUTION', 'SO8025/' + os.environ['VERSION'])
user_agent_config = {'user_agent_extra': f'AwsSolution/{solution}'}
default_config = config.Config(**user_agent_config)

def lambda_handler(event, context):
    client = boto3.client('es', config=default_config)
    es_endpoint = os.environ['ENDPOINT']
    domainName = os.environ['DOMAIN_NAME']
    isUploadDashboard = os.environ['CREATE_DASHBOARD']
    logType = os.environ['LOG_TYPE']
    indexName = os.environ['INDEX_PREFIX']
    engineType = os.environ['ENGINE_TYPE']
    roleARNs = [os.environ['ROLE_ARN'], os.environ['SENDER_ROLE_ARN']]
    try:
        for _roleARN in roleARNs:
            client.update_elasticsearch_domain_config(
                DomainName=domainName,
                AdvancedSecurityOptions={
                    'MasterUserOptions': {
                        'MasterUserARN': _roleARN,
                    },
                },
            )
        logger.info("Inject OpenSearch Backendrole success")
    except Exception as err:
        print("Inject OpenSearch Backendrole failed:", err)
    else:
        # Upload the dashboard to the Kibana
        if isUploadDashboard == 'Yes':
            time.sleep(2)
            state = 'fail'
            for i in range(10):
                state = opensearchTools.upload_dashboard(engineType, es_endpoint, logType, indexName)
                if state == 'success':
                    break
                time.sleep(2)
                logger.info("Try to upload dashboard %d times." % (i + 1))
            logger.info("Upload dashboard %s" % state)
        else:
            logger.info("Skip upload dashboard, the upload command is: %s" %
                        str(isUploadDashboard))
            time.sleep(2)
            state = 'fail'
            for i in range(10):
                state = opensearchTools.upload_index_pattern(engineType, es_endpoint, logType, indexName)
                if state == 'success':
                    break
                time.sleep(2)
                logger.info("Try to upload index pattern %d times." % (i + 1))
            logger.info("Upload index pattern %s" % state)

        # Upload the index template
        opensearchTools.create_index_template(es_endpoint, logType, indexName)

    return {'statusCode': 200, 'body': 'Jobs completed'}
