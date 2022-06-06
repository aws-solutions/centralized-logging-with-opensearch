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
import boto3
import os
from botocore import config
import logging

logger = logging.getLogger()
logger.setLevel(logging.INFO)

logGroupNamesString = os.environ.get('LOGGROUP_NAMES')
destinationArn = os.environ.get('DESTINATION_ARN')
roleArn = os.environ.get('ROLE_ARN')
stackName = os.environ['STACK_NAME']


solution = os.environ.get('SOLUTION', 'SO8025/' + os.environ['VERSION'])
user_agent_config = {'user_agent_extra': f'AwsSolution/{solution}'}
default_config = config.Config(**user_agent_config)


def lambda_handler(event, context):
    print(event)
    request_type = event['RequestType']
    if request_type == 'Create' or request_type == 'Update':
        return on_create(event)
    if request_type == 'Delete':
        return on_delete(event)
    raise Exception("Invalid request type: %s" % request_type)


def on_create(event):
    client = boto3.client('logs', config=default_config)

    log_group_names = logGroupNamesString.split(',')

    for log_group_name in log_group_names:
        logger.info("Log group name is %s" % log_group_name)
        # Create a subscription filter
        if not is_log_group_exist(log_group_name):
            logger.info("Log Group %s doesn't exist!" % log_group_name)
            create_log_group(log_group_name)
        try:
            client.put_subscription_filter(
                destinationArn=destinationArn,
                filterName=stackName,
                filterPattern='',
                logGroupName=log_group_name,
                roleArn=roleArn,
            )
        except Exception as err:
            print("Create log group subscription filter failed, %s" % err)
            raise

    return {
        'statusCode': 200,
        'body': json.dumps('Create log group subscription filter success!')
    }


def on_delete(event):
    # Create CloudWatchLogs client
    client = boto3.client('logs', config=default_config)

    logGroupNames = logGroupNamesString.split(',')

    print(logGroupNames)

    for logGroupName in logGroupNames:
        # Delete a subscription filter
        logger.info("Subscription of log group %s is going to be deleted." % logGroupName)
        try:
            client.delete_subscription_filter(
                filterName=stackName,
                logGroupName=logGroupName,
            )
        except Exception as err:
            logger.info("Delete log group subscription filter failed, %s" % err)

    return {
        'statusCode': 200,
        'body': json.dumps('Delete log group subscription filter success!')
    }


def is_log_group_exist(logGroupName):
    client = boto3.client('logs', config=default_config)
    response = client.describe_log_groups(
        logGroupNamePrefix=logGroupName
    )
    return response["logGroups"] != []
    

def create_log_group(logGroupName):
    logger.info("Create Log Group: %s" % logGroupName)
    client = boto3.client('logs', config=default_config)
    try:
        client.create_log_group(logGroupName=logGroupName)
    except Exception as err:
        logger.info("Create log group %s failed, ", err)
        logger.error(err)
        raise