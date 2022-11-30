# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import json
import logging
import os
import uuid
from datetime import datetime
import concurrent.futures

import boto3
from boto3.dynamodb.conditions import Attr
from botocore import config
from util.group_enum_type import GROUPTYPE
from aws_svc_mgr import (SvcManager, Boto3API, DocumentType)

logger = logging.getLogger()
logger.setLevel(logging.INFO)

solution_version = os.environ.get("SOLUTION_VERSION", "v1.0.0")
solution_id = os.environ.get("SOLUTION_ID", "SO8025")
user_agent_config = {
    "user_agent_extra": f"AwsSolution/{solution_id}/{solution_version}"
}
default_config = config.Config(**user_agent_config)

# Get DDB resource.
dynamodb = boto3.resource('dynamodb', config=default_config)
table_name = os.environ.get('INSTRANCEGROUP_TABLE')
instance_group_table = dynamodb.Table(table_name)
default_region = os.environ.get('AWS_REGION')

# Get Event Bridge resource
event = boto3.client('events', config=default_config)
event_rule_name = os.environ.get("EVENTBRIDGE_RULE")

sts = boto3.client("sts", config=default_config)
account_id = sts.get_caller_identity()["Account"]

sqs = boto3.resource('sqs', config=default_config)
instance_group_modification_event_queue_name = os.environ.get(
    'INSTANCE_GROUP_MODIFICATION_EVENT_QUEUE_NAME')

table_name = os.environ.get("APPLOGINGESTION_TABLE")
app_log_ingestion_table = dynamodb.Table(table_name)


class APIException(Exception):

    def __init__(self, message):
        self.message = message


def handle_error(func):
    """ Decorator for exception handling """

    def wrapper(*args, **kwargs):
        try:
            return func(*args, **kwargs)
        except APIException as e:
            logger.error(e)
            raise e
        except Exception as e:
            logger.error(e)
            raise RuntimeError(
                'Unknown exception, please check Lambda log for more details')

    return wrapper


@handle_error
def lambda_handler(event, context):
    # logger.info("Received event: " + json.dumps(event, indent=2))

    action = event['info']['fieldName']
    args = event['arguments']

    if action == "createInstanceGroup":
        return create_instance_group(**args)
    elif action == "deleteInstanceGroup":
        return delete_instance_group(**args)
    elif action == "addInstancesToInstanceGroup":
        return add_instances_to_instance_group(**args)
    elif action == "deleteInstancesFromInstanceGroup":
        return delete_instance_from_instance_group(**args)
    elif action == "listInstanceGroups":
        return list_instance_groups(**args)
    elif action == "listAutoScalingGroups":
        return list_auto_scaling_groups(**args)
    elif action == "createInstanceGroupBaseOnASG":
        return create_instance_group_base_on_asg(**args)
    else:
        logger.info('Event received: ' + json.dumps(event, indent=2))
        raise RuntimeError(f'Unknown action {action}')


def create_instance_group(**args):
    """  Create a instance group """
    logger.info('create instance group')
    group_name = args['groupName']
    sub_account_id = args.get('accountId') or account_id
    region = args.get('region') or default_region
    resp = list_instance_groups(groupName=group_name)
    total = resp['total']
    """Check if the groupName exists """
    if total > 0:
        raise APIException('Group name already exists, please use a new name.')

    id = str(uuid.uuid4())
    instance_set = args['instanceSet']
    instance_group_table.put_item(
        Item={
            'id': id,
            'groupName': group_name,
            'groupType': GROUPTYPE.EC2.value,
            'accountId': sub_account_id,
            'region': region,
            'instanceSet': set(instance_set),
            'createdDt': datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%SZ'),
            'status': 'ACTIVE',
        })
    enable_agent_status_regular_check()
    return id


def list_instance_groups(page=1, count=20, groupName=None):
    """  List instance groups """
    logger.info(
        f'List InstanceGroup from DynamoDB in page {page} with {count} of records'
    )
    conditions = Attr('status').eq('ACTIVE')

    if groupName:
        conditions = conditions.__and__(Attr('groupName').eq(groupName))

    response = instance_group_table.scan(
        FilterExpression=conditions,
        ProjectionExpression=
        "id,accountId,#region,#groupName, #groupType, #status, instanceSet,createdDt ",
        ExpressionAttributeNames={
            '#groupName': 'groupName',
            '#status': 'status',
            '#region': 'region',
            '#groupType': 'groupType',
        })

    # Assume all items are returned in the scan request
    items = response['Items']
    # logger.info(items)
    # build pagination
    total = len(items)
    start = (page - 1) * count
    end = page * count

    if start > total:
        start, end = 0, count
    logger.info(f'Return result from {start} to {end} in total of {total}')

    # set type to list type
    results = []
    for item in items:
        result = {}
        result['id'] = item['id']
        result['accountId'] = item.get('accountId', account_id)
        result['region'] = item.get('region', default_region)
        result['groupName'] = item['groupName']
        if "groupType" in item:
            result['groupType'] = item['groupType']
        else:
            result['groupType'] = GROUPTYPE.EC2.value
        result['createdDt'] = item['createdDt']
        result['instanceSet'] = list(item['instanceSet'])
        results.append(result)

    results.sort(key=lambda x: x['createdDt'], reverse=True)
    return {
        'total': len(items),
        'instanceGroups': results[start:end],
    }


def create_instance_group_base_on_asg(**args):
    """  Create a instance group base on ASG"""
    logger.info('create instance group base on ASG')
    group_name = args['groupName']
    sub_account_id = args.get('accountId') or account_id
    region = args.get('region') or default_region
    resp = list_instance_groups(groupName=group_name)
    total = resp['total']
    """Check if the groupName exists """
    if total > 0:
        raise APIException('Group name already exists, please use a new name.')

    id = str(uuid.uuid4())
    auto_scaling_group_name = args['autoScalingGroupName']
    group_set = set()
    group_set.add(auto_scaling_group_name)
    instance_group_table.put_item(
        Item={
            'id': id,
            'groupName': group_name,
            'groupType': GROUPTYPE.ASG.value,
            'accountId': sub_account_id,
            'region': region,
            'instanceSet': group_set,
            'createdDt': datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%SZ'),
            'status': 'ACTIVE',
        })
    enable_agent_status_regular_check()
    return id


def list_auto_scaling_groups(maxResults=10,
                             nextToken='',
                             accountId=account_id,
                             region=default_region):
    """  List Auto-Scaling Groups """
    logger.info(f'List Auto-Scaling Groups in the specified account')
    try:
        # Get SSM resource
        svcMgr = SvcManager()
        asg = svcMgr.get_client(sub_account_id=accountId,
                                service_name='autoscaling',
                                type=Boto3API.CLIENT,
                                region=region)
        if nextToken == '':
            resp = asg.describe_auto_scaling_groups(MaxRecords=maxResults, )
        else:
            resp = asg.describe_auto_scaling_groups(
                NextToken=nextToken,
                MaxRecords=maxResults,
            )
        auto_scaling_group_info_list = resp['AutoScalingGroups']
    except Exception as e:
        err_message = str(e)
        trimed_message = err_message.split(':', 1)[1]
        raise APIException(trimed_message)

    autoScalingGroups = []
    for asg_info in auto_scaling_group_info_list:
        autoScalingGroup = parse_auto_scaling_group_info(asg_info)
        autoScalingGroups.append(autoScalingGroup)

    if 'NextToken' in resp:
        next_token = resp['NextToken']
    else:
        next_token = ""

    return {
        'autoScalingGroups': autoScalingGroups,
        'nextToken': next_token,
    }


def parse_auto_scaling_group_info(asg_info):
    asg = {}
    asg['autoScalingGroupName'] = asg_info['AutoScalingGroupName']
    asg['minSize'] = asg_info['MinSize']
    asg['maxSize'] = asg_info['MaxSize']
    asg['desiredCapacity'] = asg_info['DesiredCapacity']
    asg['instances'] = []
    for instance in asg_info['Instances']:
        asg['instances'].append(instance['InstanceId'])
    return asg


def delete_instance_group(id: str) -> str:
    """ set status to INACTIVE in InstanceGroup table """
    logger.info('Update InstanceGroup Status in DynamoDB')
    resp = instance_group_table.get_item(Key={'id': id})
    if 'Item' not in resp:
        raise APIException('InstanceGroup Not Found')

    instance_group_table.update_item(
        Key={'id': id},
        UpdateExpression='SET #status = :s, #updatedDt= :uDt',
        ExpressionAttributeNames={
            '#status': 'status',
            '#updatedDt': 'updatedDt'
        },
        ExpressionAttributeValues={
            ':s': 'INACTIVE',
            ':uDt': datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%SZ')
        })
    disable_agent_status_regular_check()


def update_instance_group(id, instanceSet):
    """ update instanceSet in InstanceGroup table """
    logger.info('Update instanceSet in DynamoDB')
    resp = instance_group_table.get_item(Key={'id': id})
    if 'Item' not in resp:
        raise APIException('InstanceGroup Not Found')
    """ update  """
    instance_group_table.update_item(Key={'id': id},
                                     UpdateExpression='SET #instanceSet=:st',
                                     ExpressionAttributeNames={
                                         '#instanceSet': 'instanceSet',
                                     },
                                     ExpressionAttributeValues={
                                         ':st': set(instanceSet),
                                     })


def add_instances_to_instance_group(**args):
    """ Add instanceSet in InstanceGroup table """
    groupId = args['sourceId']
    instance_set_to_be_added = args['instanceIdSet']
    resp = instance_group_table.get_item(Key={'id': groupId})
    if 'Item' not in resp:
        raise APIException('InstanceGroup Not Found')
    instance_set_from_table = resp['Item']['instanceSet']

    logger.info('Add instances in group table')
    for instance in instance_set_to_be_added:
        instance_set_from_table.add(instance)
    update_instance_group(groupId, instance_set_from_table)

    logger.info('Check instance status in appLogIngestionTable')
    if is_group_involved_in_ingestion(groupId):
        logger.info('Instance group is involved in ingestions.')
        try:
            event_queue = sqs.get_queue_by_name(
                QueueName=instance_group_modification_event_queue_name)
            message_body = {
                'info': {
                    'fieldName': 'asyncAddInstancesToInstanceGroup',
                },
                'arguments': {
                    'groupId': groupId,
                    'instanceSet': list(instance_set_to_be_added)
                }
            }
            response = event_queue.send_message(
                MessageBody=json.dumps(message_body))
            logger.info(response)
        except Exception as e:
            logger.exception(e)
            raise RuntimeError(
                "Receive exception when sending addition event to instance modification queue"
            )
    else:
        logger.info('Instance group not involved in ingestion, done.')


def delete_instance_from_instance_group(**args):
    """ Delete instanceSet in InstanceGroup table """
    groupId = args['sourceId']
    instance_set_to_be_deleted = args['instanceIdSet']
    resp = instance_group_table.get_item(Key={'id': groupId})
    if 'Item' not in resp:
        raise APIException('InstanceGroup Not Found')
    instance_set_from_table = resp['Item']['instanceSet']
    if len(instance_set_from_table) <= len(instance_set_to_be_deleted):
        raise APIException(
            "This instance group must have at least one instance")
    logger.info('Delete instances in group table')
    for instance in instance_set_to_be_deleted:
        instance_set_from_table.remove(instance)
    update_instance_group(groupId, instance_set_from_table)

    logger.info('Check instance status in appLogIngestionTable')
    if is_group_involved_in_ingestion(groupId):
        logger.info('Instance group is involved in ingestions.')
        try:
            event_queue = sqs.get_queue_by_name(
                QueueName=instance_group_modification_event_queue_name)
            message_body = {
                'info': {
                    'fieldName': 'asyncDeleteInstancesFromInstanceGroup',
                },
                'arguments': {
                    'groupId': groupId,
                    'instanceSet': list(instance_set_to_be_deleted)
                }
            }
            response = event_queue.send_message(
                MessageBody=json.dumps(message_body))
            logger.info(response)
        except Exception as e:
            logger.exception(e)
            raise RuntimeError(
                "Receive exception when sending deletion event to instance modification queue"
            )
    else:
        logger.info('Instance group not involved in ingestion, done.')


def is_group_involved_in_ingestion(groupId):
    conditions = Attr("sourceId").eq(groupId)
    conditions = conditions.__and__(Attr("status").eq("ACTIVE"))
    scan_resp = app_log_ingestion_table.scan(
        FilterExpression=conditions,
        ProjectionExpression="id",
    )
    if len(scan_resp['Items']) == 0:
        return False
    return True


def enable_agent_status_regular_check():
    response = event.describe_rule(Name=event_rule_name)
    if 'State' in response:
        logger.info(response['State'])
        if response['State'] == 'ENABLED':
            return
        else:
            event.enable_rule(Name=event_rule_name, )
            logger.info("Enable the agent status regular check")
            return
    else:
        raise APIException('Event Bridge doesn\'t exist')


def disable_agent_status_regular_check():
    conditions = Attr('status').eq('ACTIVE')

    response = instance_group_table.scan(
        FilterExpression=conditions,
        ProjectionExpression="id, #status, instanceSet,createdDt ",
        ExpressionAttributeNames={
            '#status': 'status',
        })
    if 'Items' not in response:
        raise APIException('Instance group table Not Found')
    if len(response['Items']) == 0:
        logger.info(
            "The count of instance group is 0, disable the event bridge.")
        event.disable_rule(Name=event_rule_name, )
    return
