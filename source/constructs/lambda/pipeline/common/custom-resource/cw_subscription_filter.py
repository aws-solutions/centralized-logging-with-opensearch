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
from boto3_client import get_client

logger = logging.getLogger()
logger.setLevel(logging.INFO)

logGroupNamesString = os.environ.get('LOGGROUP_NAMES')
kdsArn = os.environ.get('DESTINATION_ARN')
kdsName = os.environ.get('DESTINATION_NAME')

roleName = os.environ.get('ROLE_NAME')
roleArn = os.environ.get('ROLE_ARN')

stackName = os.environ['STACK_NAME']

solution = os.environ.get('SOLUTION', 'SO8025/' + os.environ['VERSION'])
user_agent_config = {'user_agent_extra': f'AwsSolution/{solution}'}
default_config = config.Config(**user_agent_config)

default_region = os.environ.get("AWS_REGION")
sts = boto3.client("sts", config=default_config)
account_id = sts.get_caller_identity()["Account"]

log_source_account_id = os.environ.get("LOG_SOURCE_ACCOUNT_ID", account_id)

log_source_account_assume_role = os.environ.get(
    "LOG_SOURCE_ACCOUNT_ASSUME_ROLE", "")


def lambda_handler(event, context):
    request_type = event['RequestType']
    if request_type == 'Create' or request_type == 'Update':
        return on_create(event)
    if request_type == 'Delete':
        return on_delete(event)
    raise Exception("Invalid request type: %s" % request_type)


def on_create(event):

    log_group_names = logGroupNamesString.split(',')

    for log_group_name in log_group_names:
        logger.info("Log group name is %s" % log_group_name)
        # Create a subscription filter
        try:
            destination_name = f'{stackName}-{kdsName}'
            client = get_client('logs')
            if not is_log_group_exist(log_group_name):
                logger.info("Log Group %s doesn't exist!" % log_group_name)
                create_log_group(log_group_name) if log_group_name else None
            if log_source_account_assume_role:
                cwl = get_client('logs', is_local_session=True)
                resp = cwl.put_destination(
                    destinationName=destination_name,
                    targetArn=kdsArn,
                    roleArn=roleArn,
                )
                destinationArn = resp['destination']['arn']
                #setup cw put-destination-policy
                access_policy = {
                    "Version":
                    "2012-10-17",
                    "Statement": [{
                        "Sid": "",
                        "Effect": "Allow",
                        "Principal": {
                            "AWS": log_source_account_id
                        },
                        "Action": "logs:PutSubscriptionFilter",
                        "Resource": destinationArn
                    }]
                }
                cwl.put_destination_policy(
                    destinationName=destination_name,
                    accessPolicy=json.dumps(access_policy),
                    forceUpdate=True)
                logger.info(f'destinationArn is {destinationArn}')
                client.put_subscription_filter(
                    logGroupName=log_group_name,
                    filterName=destination_name,
                    filterPattern='',
                    destinationArn=destinationArn,
                )
            else:

                destinationArn = kdsArn
                client.put_subscription_filter(
                    logGroupName=log_group_name,
                    filterName=destination_name,
                    filterPattern='',
                    destinationArn=destinationArn,
                    roleArn=roleArn,
                )

        except Exception as err:
            logger.info(f"Create log group subscription filter failed, %s" %
                        err)
            raise

    return {
        'statusCode': 200,
        'body': json.dumps('Create log group subscription filter success!')
    }


def on_delete(event):
    # Create CloudWatchLogs client
    client = client = get_client('logs')

    logGroupNames = logGroupNamesString.split(',')

    print(logGroupNames)

    for logGroupName in logGroupNames:
        # Delete a subscription filter
        logger.info("Subscription of log group %s is going to be deleted." %
                    logGroupName)
        try:
            client.delete_subscription_filter(
                filterName=f'{stackName}-{kdsName}',
                logGroupName=logGroupName,
            )
        except Exception as err:
            logger.info("Delete log group subscription filter failed, %s" %
                        err)

    return {
        'statusCode': 200,
        'body': json.dumps('Delete log group subscription filter success!')
    }


def is_log_group_exist(logGroupName):
    client = get_client('logs')
    response = client.describe_log_groups(logGroupNamePrefix=logGroupName)
    return response["logGroups"] != []


def create_log_group(logGroupName):
    logger.info("Create Log Group: %s" % logGroupName)
    client = get_client('logs')
    try:
        client.create_log_group(logGroupName=logGroupName)
    except Exception as err:
        logger.info("Create log group %s failed, ", err)
        logger.error(err)
        raise
