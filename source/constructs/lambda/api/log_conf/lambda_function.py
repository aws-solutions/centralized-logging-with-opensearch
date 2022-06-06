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
table_name = os.environ.get('LOGCONF_TABLE')
log_conf_table = dynamodb.Table(table_name)
default_region = os.environ.get('AWS_REGION')


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

    if action == "createLogConf":
        return create_log_conf(**args)
    elif action == "deleteLogConf":
        return delete_log_conf(**args)
    elif action == "listLogConfs":
        return list_log_confs(**args)
    elif action == "updateLogConf":
        return update_log_conf(**args)
    else:
        logger.info('Event received: ' + json.dumps(event, indent=2))
        raise RuntimeError(f'Unknown action {action}')


def create_log_conf(**args):
    """  Create a LogConf """
    logger.info('create a logConf')

    resp = list_log_confs(confName=args['confName'])
    total = resp['total']
    """Check if the confName exists """
    if total > 0:
        raise APIException('Log config name already exists, please use a new name.')

    id = str(uuid.uuid4())
    log_conf_table.put_item(
        Item={
            'id': id,
            'confName': args['confName'],
            'logPath': args['logPath'],
            'logType': args['logType'],
            'createdDt': datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%SZ'),
            'userLogFormat': args.get('userLogFormat', ''),
            'regularExpression': args.get('regularExpression', ''),
            'regularSpecs': _validate_regular_specs(args.get('regularSpecs', [])),
            'multilineLogParser': args.get('multilineLogParser'),
            'status': 'ACTIVE',
        }
    )
    return id


def list_log_confs(page=1, count=20, confName=None, logType=None):
    """  List logconfs """
    logger.info(f'List LogConf from DynamoDB in page {page} with {count} of records')
    conditions = Attr('status').eq('ACTIVE')

    if confName:
        conditions = conditions.__and__(Attr('confName').eq(confName))
    if logType:
        conditions = conditions.__and__(Attr('logType').eq(logType))

    response = log_conf_table.scan(
        FilterExpression=conditions,
        ProjectionExpression="id, #confName, logPath, #logType, createdDt, #status ",
        ExpressionAttributeNames={
            '#confName': 'confName',
            '#logType': 'logType',
            '#status': 'status',
        }
    )

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
    items.sort(key=lambda x: x['createdDt'], reverse=True)
    return {
        'total': len(items),
        'logConfs': items[start: end],
    }


def delete_log_conf(id: str) -> str:
    """ set status to INACTIVE in LogConf table """
    logger.info('Update LogConf Status in DynamoDB')
    resp = log_conf_table.get_item(Key={'id': id})
    if 'Item' not in resp:
        raise APIException('LogConf Not Found')

    log_conf_table.update_item(
        Key={'id': id},
        UpdateExpression='SET #status = :s, #updatedDt= :uDt',
        ExpressionAttributeNames={
            '#status': 'status',
            '#updatedDt': 'updatedDt'
        },
        ExpressionAttributeValues={
            ':s': 'INACTIVE',
            ':uDt': datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%SZ')
        }
    )


def update_log_conf(id, confName, logPath, logType, multilineLogParser, userLogFormat, regularExpression, regularSpecs):
    """ update confName in LogConf table """
    logger.info('Update LogConf  in DynamoDB')
    resp = log_conf_table.get_item(Key={'id': id})
    if 'Item' not in resp:
        raise APIException('LogConf Not Found')
    resp = list_log_confs(confName=confName)
    total = resp['total']
    confs = resp['logConfs']
    """Check if the confName exists """
    if total > 0 and confs[0]['id'] != id:
        raise APIException('confName already exists')

    log_conf_table.update_item(
        Key={'id': id},
        UpdateExpression='SET #confName = :cfn, #logPath=:lp, #logType=:lt, #multilineLogParser=:multilineLogParser, #updatedDt= :uDt, #userLogFormat=:userLogFormat, #regularExpression=:regularExpression, #regularSpecs=:regularSpecs',
        ExpressionAttributeNames={
            '#confName': 'confName',
            '#logPath': 'logPath',
            '#logType': 'logType',
            '#multilineLogParser': 'multilineLogParser',
            '#updatedDt': 'updatedDt',
            '#userLogFormat': 'userLogFormat',
            '#regularExpression': 'regularExpression',
            '#regularSpecs': 'regularSpecs',

        },
        ExpressionAttributeValues={
            ':cfn': confName,
            ':lp': logPath,
            ':lt': logType,
            ':multilineLogParser': multilineLogParser,
            ':uDt': datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%SZ'),
            ':userLogFormat': userLogFormat,
            ':regularExpression': regularExpression,
            ':regularSpecs': _validate_regular_specs(regularSpecs),
        }
    )


def _validate_regular_specs(lst: list) -> list:
    for each in lst:
        if not isinstance(each, dict):
            raise APIException('Invalid regularSpecs: list item is not a dict.')
        if not each.get('key'):
            raise APIException('Invalid regularSpecs: can not found "key" field.')
        if '' == each.get('format'):
            raise APIException('Invalid regularSpecs: empty format.')
        if ('date' == each.get('type')) and (not each.get('format')):
            raise APIException('Invalid regularSpecs: "date" type must have "format"')

    return lst
