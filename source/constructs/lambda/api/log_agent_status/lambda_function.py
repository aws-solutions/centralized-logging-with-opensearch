# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import boto3
import logging
import os
import time
from datetime import datetime

from botocore import config


logger = logging.getLogger()
logger.setLevel(logging.INFO)

solution_version = os.environ.get("SOLUTION_VERSION", "v1.0.0")
solution_id = os.environ.get("SOLUTION_ID", "SO8025")
user_agent_config = {
    "user_agent_extra": f"AwsSolution/{solution_id}/{solution_version}"
}
default_config = config.Config(**user_agent_config)

# Get SSM resource
ssm_client = boto3.client('ssm', config=default_config)

# Get DDB resource.
dynamodb = boto3.resource('dynamodb', config=default_config)
agent_status_table_name = os.environ.get('AGENTSTATUS_TABLE')
agent_status_table = dynamodb.Table(agent_status_table_name)


class APIException(Exception):
    def __init__(self, message):
        self.message = message


def lambda_handler(event, context):
    instance_set = get_instances()
    unknown_instance_set = get_unknown_instances()
    command_id = ""
    for instance_id in instance_set:
        # Send the status query command by SSM
        try:
            response = ssm_client.send_command(
                InstanceIds=[instance_id],
                DocumentName="AWS-RunShellScript",
                Parameters={'commands': ['curl -s http://127.0.0.1:2022/api/v1/health']})
            command_id = response['Command']['CommandId']
        except Exception as e:
            logger.error(e)
            logger.error(
                "CURL is not successful for Instance %s, set to be Unknown!" % instance_id)
            update_log_agent_status(instance_id, "Unknown")
            continue
        # sleep for 1 second to wait for command id
        time.sleep(1)
        try:
            output = ssm_client.get_command_invocation(
                CommandId=command_id,
                InstanceId=instance_id)
            if (len(output['StandardOutputContent']) > 0) and ('fluent-bit' in output['StandardOutputContent']):
                logger.info("Instance %s is Online" % instance_id)
                update_log_agent_status(instance_id, "Online")
            else:
                logger.info("Instance %s is Offline" % instance_id)
                update_log_agent_status(instance_id, "Offline")
        except Exception as e:
            logger.error(e)
            continue
    # Check each Unknow instance status  
    for instance_id in unknown_instance_set:
        try:
            response = ssm_client.send_command(
                InstanceIds=[instance_id],
                DocumentName="AWS-RunShellScript",
                Parameters={'commands': ['curl -s http://127.0.0.1:2022/api/v1/health']})
            command_id = response['Command']['CommandId']
        except Exception as e:
            logger.error(e)
            logger.error(
                "CURL is not successful for Instance %s, set to be Unknown!" % instance_id)
            update_log_agent_status(instance_id, "Unknown")
            continue
        # sleep for 1 second to wait for command id
        time.sleep(1)
        try:
            output = ssm_client.get_command_invocation(
                CommandId=command_id,
                InstanceId=instance_id)
            if (len(output['StandardOutputContent']) > 0) and ('fluent-bit' in output['StandardOutputContent']):
                logger.info("Instance %s is Online" % instance_id)
                update_log_agent_status(instance_id, "Online")
            else:
                logger.info("Instance %s is Offline" % instance_id)
                update_log_agent_status(instance_id, "Offline")
            break
        except Exception as e:
            logger.error(e)
            continue


def update_log_agent_status(instance_id, status):
    """
    Update the instance app log agent status
    :param instance_id:
    :param status:
    :return: null
    """
    agent_status_table.update_item(
        Key={'instanceId': instance_id},
        UpdateExpression='SET #status = :sta, #updatedDt= :uDt',
        ExpressionAttributeNames={
            '#status': 'status',
            '#updatedDt': 'updatedDt',
        },
        ExpressionAttributeValues={
            ':sta': status,
            ':uDt': datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%SZ')
        }
    )


def get_instances():
    """
    Scan the table to get all instance id
    :return: instance_set
    """
    response = agent_status_table.scan()
    if 'Items' not in response:
        raise APIException('Instance agent status Not Found')
    instance_set = []
    for item in response['Items']:
        if item['status'] == 'Not_Installed':
            continue
        if item['status'] == 'Unknown':
            continue
        instance_set.append(item['instanceId'])
    return instance_set
    
def get_unknown_instances():
    """
    Scan the table to get all Unknown instance id
    :return: instance_set
    """
    response = agent_status_table.scan()
    if 'Items' not in response:
        raise APIException('Instance agent status Not Found')
    instance_set = []
    for item in response['Items']:
        if item['status'] == 'Unknown':
            instance_set.append(item['instanceId'])
    return instance_set
