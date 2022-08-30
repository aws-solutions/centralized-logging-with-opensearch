# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import boto3
import logging
import os
import time
from datetime import datetime

from botocore import config
from aws_svc_mgr import SvcManager, Boto3API
from boto3.dynamodb.conditions import Attr

logger = logging.getLogger()
logger.setLevel(logging.INFO)

solution_version = os.environ.get("SOLUTION_VERSION", "v1.0.0")
solution_id = os.environ.get("SOLUTION_ID", "SO8025")
user_agent_config = {
    "user_agent_extra": f"AwsSolution/{solution_id}/{solution_version}"
}
default_config = config.Config(**user_agent_config)
default_region = os.environ.get("AWS_REGION")
# Get DDB resource.
dynamodb = boto3.resource('dynamodb', config=default_config)
agent_status_table_name = os.environ.get('AGENTSTATUS_TABLE')
agent_status_table = dynamodb.Table(agent_status_table_name)

sts = boto3.client("sts", config=default_config)
account_id = sts.get_caller_identity()["Account"]


class APIException(Exception):

    def __init__(self, message):
        self.message = message


def lambda_handler(event, context):
    instance_set = get_instances()
    unknown_instance_set = get_unknown_instances()
    svcMgr = SvcManager()
    last_acct_id = account_id
    command_id = ""
    ssm_client = svcMgr.get_client(sub_account_id=last_acct_id,
                                   region=default_region,
                                   service_name='ssm',
                                   type=Boto3API.CLIENT)
    for instance in instance_set:
        instance_id = instance['instanceId']
        linked_account_id = instance.get('accountId', account_id)
        if last_acct_id != linked_account_id:
            last_acct_id = linked_account_id
            ssm_client = svcMgr.get_client(sub_account_id=last_acct_id,
                                           region=instance.get(
                                               'region', default_region),
                                           service_name='ssm',
                                           type=Boto3API.CLIENT)

        # Send the status query command by SSM
        try:
            response = ssm_client.send_command(
                InstanceIds=[instance_id],
                DocumentName="AWS-RunShellScript",
                Parameters={
                    'commands':
                    ['curl -s http://127.0.0.1:2022/api/v1/health']
                })
            command_id = response['Command']['CommandId']
        except Exception as e:
            logger.error(e)
            logger.error(
                "CURL is not successful for Instance %s, set to be Unknown!" %
                instance_id)
            update_log_agent_status(instance_id, "Unknown")
            continue
        # sleep for 1 second to wait for command id
        time.sleep(1)
        try:
            output = ssm_client.get_command_invocation(CommandId=command_id,
                                                       InstanceId=instance_id)
            if (len(output['StandardOutputContent']) >
                    0) and ('fluent-bit' in output['StandardOutputContent']):
                logger.info("Instance %s is Online" % instance_id)
                update_log_agent_status(instance_id, "Online")
            else:
                logger.info("Instance %s is Offline" % instance_id)
                update_log_agent_status(instance_id, "Offline")
        except Exception as e:
            logger.error(e)
            continue
    # Check each Unknow instance status
    last_acct_id = account_id
    ssm_client = svcMgr.get_client(sub_account_id=last_acct_id,
                                   region=default_region,
                                   service_name='ssm',
                                   type=Boto3API.CLIENT)
    for unknown_instance in unknown_instance_set:
        instance_id = unknown_instance['instanceId']
        linked_account_id = unknown_instance.get('accountId', account_id)
        if last_acct_id != linked_account_id:
            last_acct_id = linked_account_id
            ssm_client = svcMgr.get_client(sub_account_id=last_acct_id,
                                           region=unknown_instance.get(
                                               'region', ''),
                                           service_name='ssm',
                                           type=Boto3API.CLIENT)
        try:
            response = ssm_client.send_command(
                InstanceIds=[instance_id],
                DocumentName="AWS-RunShellScript",
                Parameters={
                    'commands':
                    ['curl -s http://127.0.0.1:2022/api/v1/health']
                })
            command_id = response['Command']['CommandId']
        except Exception as e:
            logger.error(e)
            logger.error(
                "CURL is not successful for Instance %s, set to be Unknown!" %
                instance_id)
            update_log_agent_status(instance_id, "Unknown")
            continue
        # sleep for 1 second to wait for command id
        time.sleep(1)
        try:
            output = ssm_client.get_command_invocation(CommandId=command_id,
                                                       InstanceId=instance_id)
            if (len(output['StandardOutputContent']) >
                    0) and ('fluent-bit' in output['StandardOutputContent']):
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
        })


def get_instances():
    """
    Scan the table to get all instance id
    :return: instance_set
    """

    conditions = Attr("status").ne('Not_Installed')
    conditions = conditions.__and__(Attr("status").ne('Unknown'))
    response = agent_status_table.scan(
        FilterExpression=conditions,
        ProjectionExpression=
        "instanceId, accountId, createDt, #status, id, #region",
        ExpressionAttributeNames={
            "#status": "status",
            "#region": "region",
        },
    )
    if 'Items' not in response:
        raise APIException('Instance agent status Not Found')
    return response['Items']


def get_unknown_instances():
    """
    Scan the table to get all Unknown instance id
    :return: instance_set
    """
    conditions = Attr("status").eq('Unknown')
    response = agent_status_table.scan(
        FilterExpression=conditions,
        ProjectionExpression=
        "instanceId, accountId, createDt, #status, id, #region",
        ExpressionAttributeNames={
            "#status": "status",
            "#region": "region",
        },
    )
    if 'Items' not in response:
        raise APIException('Instance agent status Not Found')
    return response['Items']
