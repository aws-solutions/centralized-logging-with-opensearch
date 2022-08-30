# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import json
import logging
import os
import uuid
from datetime import datetime

import boto3
from boto3.dynamodb.conditions import Attr
from botocore import config

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
    elif action == "listInstanceGroups":
        return list_instance_groups(**args)
    elif action == "updateInstanceGroup":
        return update_instance_group(**args)
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
        "id,accountId,#region,#groupName, #status, instanceSet,createdDt ",
        ExpressionAttributeNames={
            '#groupName': 'groupName',
            '#status': 'status',
            '#region': 'region',
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
        result['createdDt'] = item['createdDt']
        result['instanceSet'] = list(item['instanceSet'])
        results.append(result)

    results.sort(key=lambda x: x['createdDt'], reverse=True)
    return {
        'total': len(items),
        'instanceGroups': results[start:end],
    }


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


def update_instance_group(id,
                          groupName,
                          instanceSet,
                          accountId=account_id,
                          region=default_region):
    """ update groupName,instanceSet in InstanceGroup table """
    logger.info('Update groupName  in DynamoDB')
    resp = instance_group_table.get_item(Key={'id': id})
    if 'Item' not in resp:
        raise APIException('InstanceGroup Not Found')
    resp = list_instance_groups(groupName=groupName)
    total = resp['total']
    groups = resp['instanceGroups']
    """Check if the groupName exists """
    if total > 0 and groups[0]['id'] != id:
        raise APIException('GroupName already exists')
    """update  """
    instance_group_table.update_item(
        Key={'id': id},
        UpdateExpression=
        'SET #accountId=:acctId,#region=:region,#groupName = :g, #instanceSet=:st, #updatedDt= :uDt',
        ExpressionAttributeNames={
            '#accountId': 'accountId',
            '#region': 'region',
            '#groupName': 'groupName',
            '#instanceSet': 'instanceSet',
            '#updatedDt': 'updatedDt',
        },
        ExpressionAttributeValues={
            ':acctId': accountId,
            ':region': region,
            ':g': groupName,
            ':st': set(instanceSet),
            ':uDt': datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%SZ')
        })


def enable_agent_status_regular_check():
    response = event.describe_rule(Name=event_rule_name)
    if 'State' in response:
        print(response['State'])
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
