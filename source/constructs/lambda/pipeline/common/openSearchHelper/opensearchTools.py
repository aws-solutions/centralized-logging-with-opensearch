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

import json
import logging
import os
import re

import boto3
import requests
from crhelper import CfnResource
from requests_aws4auth import AWS4Auth

logger = logging.getLogger(__name__)
helper_config = CfnResource(json_logging=False,
                            log_level='DEBUG',
                            boto_level='CRITICAL',
                            sleep_on_delete=120)

region = os.environ['AWS_REGION']
KIBANA_HEADERS = {'Content-Type': 'application/json', 'kbn-xsrf': 'true'}
OPENSEARCH_DASHBOARD_HEADERS = {
    'Content-Type': 'application/json', 'osd-xsrf': 'true'}


def auth_opensearch(opensearch_endpoint):
    service = 'es'
    credentials = boto3.Session().get_credentials()
    awsauth = AWS4Auth(credentials.access_key,
                       credentials.secret_key,
                       region,
                       service,
                       session_token=credentials.token)
    return awsauth


def output_message(key, res):
    return (f'{key}: status={res.status_code}, message={res.text}')


def query_opensearch(opensearch_endpoint,
                     awsauth,
                     method=None,
                     path=None,
                     payload=None,
                     headers=None):
    if not headers:
        headers = {'Content-Type': 'application/json'}
    url = 'https://' + opensearch_endpoint + '/' + path
    if method.lower() == 'get':
        res = requests.get(url, auth=awsauth, stream=True)
    elif method.lower() == 'post':
        res = requests.post(url, auth=awsauth, json=payload, headers=headers)
    elif method.lower() == 'put':
        res = requests.put(url, auth=awsauth, json=payload, headers=headers)
    elif method.lower() == 'patch':
        res = requests.put(url, auth=awsauth, json=payload, headers=headers)
    elif method.lower() == 'head':
        res = requests.head(url, auth=awsauth, json=payload, headers=headers)
    return (res)


def set_tenant_get_cookies(engineType, opensearch_endpoint, tenant, auth):
    if engineType == 'OpenSearch':
        base_url = f'https://{opensearch_endpoint}/_dashboards'
        headers = OPENSEARCH_DASHBOARD_HEADERS
    else:
        base_url = f'https://{opensearch_endpoint}/_plugin/kibana'
        headers = KIBANA_HEADERS
    if isinstance(auth, dict):
        url = f'{base_url}/auth/login?security_tenant={tenant}'
        response = requests.post(url,
                                 headers=headers,
                                 json=json.dumps(auth))
    elif isinstance(auth, AWS4Auth):
        url = f'{base_url}/app/dashboards?security_tenant={tenant}'
        response = requests.get(url, headers=headers, auth=auth)
    else:
        logger.error('There is no valid authentication')
        return False
    if response.status_code in (200, ):
        logger.info('Authentication success to access kibana')
        return response.cookies
    else:
        print(response.cookies)
        logger.error("Authentication failed to access kibana")
        logger.error(response.reason)
        return False


def load_dashboard_into_opensearch(engineType, opensearch_endpoint, logType, indexName, auth, cookies):
    """
    Upload the dashboard to the Amazon OpenSearch, including the relevent assets
    Args:
        engineType:
        opensearch_endpoint:
        logType:
        indexName:
        auth:
        cookies:

    Returns:

    """
    # There are four log types in RDS Log
    dasboard_name = indexName.lower() + '-' + logType.lower() + '-dashboard'
    if logType == 'RDS':
        indexName_error = indexName.lower() + '-' + logType.lower() + \
            '-' + 'error' + '-*'
        indexName_slowquery = indexName.lower() + '-' + logType.lower() + \
            '-' + 'slowquery'
        indexName_audit = indexName.lower() + '-' + logType.lower() + \
            '-' + 'audit' + '-*'
        indexName_general = indexName.lower() + '-' + logType.lower() + \
            '-' + 'general' + '-*'
        dashboard_id = hash(indexName)

        raw_dashboard_path = './dashboard/' + logType.lower() + '.ndjson'
        updated_dashboard_path = '/tmp/' + logType.lower() + '-' + str(
            dashboard_id) + '.ndjson'
        tmp_file1 = open(raw_dashboard_path, "r")
        tmp_file2 = open(updated_dashboard_path, "w")

        for s in tmp_file1.readlines():
            tmp_file2.write(
                s.replace("LOGHUB_DASHBOARD_NAME", dasboard_name)
                .replace("LOGHUB_INDEX_NAME_ERROR", indexName_error)
                .replace("LOGHUB_INDEX_NAME_SLOWQUERY", indexName_slowquery)
                .replace("LOGHUB_INDEX_NAME_AUDIT", indexName_audit)
                .replace("LOGHUB_INDEX_NAME_GENERAL", indexName_general)
                .replace("LOGHUB_DASHBOARD_ID", str(dashboard_id)))

        tmp_file1.close()
        tmp_file2.close()
    else:
        indexName = indexName.lower() + '-' + logType.lower() + '-*'
        dashboard_id = hash(indexName)

        raw_dashboard_path = './dashboard/' + logType.lower() + '.ndjson'
        updated_dashboard_path = '/tmp/' + logType.lower() + '-' + str(
            dashboard_id) + '.ndjson'
        tmp_file1 = open(raw_dashboard_path, "r")
        tmp_file2 = open(updated_dashboard_path, "w")

        for s in tmp_file1.readlines():
            tmp_file2.write(
                s.replace("LOGHUB_DASHBOARD_NAME", dasboard_name).replace(
                    "LOGHUB_INDEX_NAME",
                    indexName).replace("LOGHUB_DASHBOARD_ID", str(dashboard_id)))

        tmp_file1.close()
        tmp_file2.close()

    files = {'file': open(updated_dashboard_path, 'rb')}
    logger.info(files)

    if engineType == 'OpenSearch':
        url = (f'https://{opensearch_endpoint}/_dashboards/api/saved_objects/'
               f'_import?createNewCopies=true')
        headers = {'osd-xsrf': 'true'}
    else:
        url = (f'https://{opensearch_endpoint}/_plugin/kibana/api/saved_objects/'
               f'_import?createNewCopies=true')
        headers = {'kbn-xsrf': 'true'}

    response = requests.post(url,
                             cookies=cookies,
                             files=files,
                             headers=headers,
                             auth=auth)
    state = json.loads(response.text).get('success')
    logger.info(response.text)
    if str(state) == 'True':
        return 'success'
    elif str(state) == 'false':
        err_message = json.loads(response.text).get('errors')
        logger.info(err_message)
        return 'fail'
    else:
        err_message = json.loads(response.text).get('message')
        logger.info(err_message)
        return 'fail'


def load_index_pattern_into_opensearch(engineType, opensearch_endpoint, logType, indexName, auth, cookies):
    """
    Upload the pattern to the Amazon OpenSearch
    Args:
        engineType:
        opensearch_endpoint:
        logType:
        indexName:
        auth:
        cookies:

    Returns:

    """
    # There are four log types in RDS Log
    if logType == 'RDS':
        indexName_error = indexName.lower() + '-' + logType.lower() + \
            '-' + 'error' + '-*'
        indexName_slowquery = indexName.lower() + '-' + logType.lower() + \
            '-' + 'slowquery' + '-*'
        indexName_audit = indexName.lower() + '-' + logType.lower() + \
            '-' + 'audit' + '-*'
        indexName_general = indexName.lower() + '-' + logType.lower() + \
            '-' + 'general' + '-*'

        raw_pattern_path = './index_pattern/' + logType.lower() + '-indexpattern.ndjson'
        updated_pattern_path = '/tmp/' + logType.lower() + '-indexpattern.ndjson'
        tmp_file1 = open(raw_pattern_path, "r")
        tmp_file2 = open(updated_pattern_path, "w")

        for s in tmp_file1.readlines():
            tmp_file2.write(
                s.replace("LOGHUB_INDEX_NAME_ERROR", indexName_error)
                .replace("LOGHUB_INDEX_NAME_SLOWQUERY", indexName_slowquery)
                .replace("LOGHUB_INDEX_NAME_AUDIT", indexName_audit)
                .replace("LOGHUB_INDEX_NAME_GENERAL", indexName_general))

        tmp_file1.close()
        tmp_file2.close()
    else:
        indexName = indexName.lower() + '-' + logType.lower() + '-*'

        raw_pattern_path = './index_pattern/' + logType.lower() + '-indexpattern.ndjson'
        updated_pattern_path = '/tmp/' + logType.lower() + '-indexpattern.ndjson'
        tmp_file1 = open(raw_pattern_path, "r")
        tmp_file2 = open(updated_pattern_path, "w")

        for s in tmp_file1.readlines():
            tmp_file2.write(s.replace("LOGHUB_INDEX_NAME", indexName))

        tmp_file1.close()
        tmp_file2.close()

    files = {'file': open(updated_pattern_path, 'rb')}
    logger.info(files)

    if engineType == 'OpenSearch':
        url = (f'https://{opensearch_endpoint}/_dashboards/api/saved_objects/'
               f'_import?createNewCopies=true')
        headers = {'osd-xsrf': 'true'}
    else:
        url = (f'https://{opensearch_endpoint}/_plugin/kibana/api/saved_objects/'
               f'_import?createNewCopies=true')
        headers = {'kbn-xsrf': 'true'}

    response = requests.post(url,
                             cookies=cookies,
                             files=files,
                             headers=headers,
                             auth=auth)
    state = json.loads(response.text).get('success')
    logger.info(response.text)
    if str(state) == 'True':
        return 'success'
    elif str(state) == 'false':
        err_message = json.loads(response.text).get('errors')
        logger.info(err_message)
        return 'fail'
    else:
        err_message = json.loads(response.text).get('message')
        logger.info(err_message)
        return 'fail'


def configure_aes_total_fields_limit(opensearch_endpoint, indexName, limit_number,
                                     awsauth):
    """
    Config the OpenSearch fields limit
    Args:
        opensearch_endpoint:
        indexName:
        limit_number:
        awsauth:

    Returns:

    """
    payload = {"index.mapping.total_fields.limit": limit_number}
    path = str(indexName) + '/_settings'
    res = query_opensearch(opensearch_endpoint, awsauth, 'PUT', path, payload)
    if res.status_code == 200:
        logger.info("Change total_fields limit for index: %s to %d." %
                    (indexName, limit_number))
        return 'success'
    else:
        logger.error(output_message(path, res))
        return 'fail'


@helper_config.create
@helper_config.update
def upload_dashboard(engineType, opensearch_endpoint, logType, indexName):
    tenant = 'global'
    awsauth = auth_opensearch(opensearch_endpoint)
    cookies = set_tenant_get_cookies(
        engineType, opensearch_endpoint, tenant, awsauth)
    state = load_dashboard_into_opensearch(engineType, opensearch_endpoint, logType, indexName, awsauth,
                                           cookies)
    return state


@helper_config.create
@helper_config.update
def upload_index_pattern(engineType, opensearch_endpoint, logType, indexName):
    tenant = 'global'
    awsauth = auth_opensearch(opensearch_endpoint)
    cookies = set_tenant_get_cookies(
        engineType, opensearch_endpoint, tenant, awsauth)
    state = load_index_pattern_into_opensearch(engineType, opensearch_endpoint, logType, indexName, awsauth,
                                               cookies)
    return state


@helper_config.create
@helper_config.update
def update_total_fields_limit(opensearch_endpoint, indexName, limit_number):
    awsauth = auth_opensearch(opensearch_endpoint)
    state = configure_aes_total_fields_limit(opensearch_endpoint, indexName,
                                             limit_number, awsauth)
    return state


@helper_config.create
@helper_config.update
def index_exists(opensearch_endpoint, indexName):
    awsauth = auth_opensearch(opensearch_endpoint)
    path = str(indexName)
    res = query_opensearch(opensearch_endpoint, awsauth, 'HEAD', path)
    if res.status_code == 200:
        logger.info("Index name: %s exists." % (indexName))
        return 'success'
    else:
        logger.info("Index name: %s doesn't exist." % (indexName))
        return 'fail'


@helper_config.create
@helper_config.update
def create_index(opensearch_endpoint, indexName):
    awsauth = auth_opensearch(opensearch_endpoint)
    payload = {
        "settings": {
            "index.mapping.ignore_malformed": "true"
        }
    }
    path = str(indexName)
    res = query_opensearch(opensearch_endpoint, awsauth, 'PUT', path, payload)
    if res.status_code == 200:
        logger.info("Create Index %s." % (indexName))
        return 'success'


@helper_config.create
@helper_config.update
def create_index_template(opensearch_endpoint, logType, indexName):
    awsauth = auth_opensearch(opensearch_endpoint)
    if logType.lower() == "rds":
        template_path = './index_template/' + logType.lower() + '-slowquery-indextemplate.json'
        index_patterns = indexName + '-' + logType.lower() + '-slowquery-*'
        path = '_index_template/template_' + indexName + '-' + logType.lower() + '-slowquery'
    else:
        template_path = './index_template/' + logType.lower() + '-indextemplate.json'
        index_patterns = indexName + '-' + logType.lower() + '-*'
        path = '_index_template/template_' + indexName + '-' + logType.lower()

    with open(template_path, 'r') as myfile:
        data = myfile.read()

    template = json.loads(data)

    payload = {
        "index_patterns": [index_patterns],
        "priority": 1,
        "template": template
    }
    res = query_opensearch(opensearch_endpoint, awsauth, 'PUT', path, payload)
    if res.status_code == 200:
        logger.info("Create Index template %s." %
                    ('template_' + indexName + '-' + logType.lower()))
        return 'success'
