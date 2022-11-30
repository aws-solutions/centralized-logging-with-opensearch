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
log_conf_table_name = os.environ.get('LOGCONF_TABLE')
log_conf_table = dynamodb.Table(log_conf_table_name)
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
    elif action == "checkTimeFormat":
        return check_time_format(**args)
    else:
        logger.info('Event received: ' + json.dumps(event, indent=2))
        raise RuntimeError(f'Unknown action {action}')


def check_time_format(**args):
    time_srt = args['timeStr']
    format_str = args['formatStr']
    isMatch = False
    try:
        res = datetime.strptime(time_srt, format_str)
        if isinstance(res, datetime):
            isMatch = True
    except:
        isMatch = False
        pass
    return {'isMatch': isMatch}


def create_log_conf(**args):
    """  Create a LogConf """
    logger.info('create a logConf')

    resp = list_log_confs(confName=args['confName'])
    total = resp['total']
    """Check if the confName exists """
    if total > 0:
        raise APIException(
            'Log config name already exists, please use a new name.')

    id = str(uuid.uuid4())
    log_conf_table.put_item(
        Item={
            'id':
            id,
            'confName':
            args['confName'],
            'logType':
            args['logType'],
            'createdDt':
            datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%SZ'),
            'userSampleLog':
            args.get('userSampleLog', ''),
            'userLogFormat':
            args.get('userLogFormat', ''),
            'regularExpression':
            args.get('regularExpression', ''),
            'regularSpecs':
            _validate_regular_specs(args.get('regularSpecs', [])),
            'multilineLogParser':
            args.get('multilineLogParser'),
            'syslogParser':
            args.get('syslogParser'),
            'timeRegularExpression':
            args.get('timeRegularExpression', ''),
            'processorFilterRegex':
            _validate_filter_regex(
                args.get('processorFilterRegex', {'enable': False})),
            'timeKey':
            args.get('timeKey'),
            'timeOffset':
            args.get('timeOffset'),
            'status':
            'ACTIVE',
        })
    return id


def list_log_confs(page=1, count=20, confName=None, logType=None):
    """  List logconfs """
    logger.info(
        f'List LogConf from DynamoDB in page {page} with {count} of records')
    conditions = Attr('status').eq('ACTIVE')

    if confName:
        conditions = conditions.__and__(Attr('confName').eq(confName))
    if logType:
        conditions = conditions.__and__(Attr('logType').eq(logType))

    response = log_conf_table.scan(
        FilterExpression=conditions,
        ProjectionExpression="id, #confName, #logType, createdDt, #status ",
        ExpressionAttributeNames={
            '#confName': 'confName',
            '#logType': 'logType',
            '#status': 'status',
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
    items.sort(key=lambda x: x['createdDt'], reverse=True)
    return {
        'total': len(items),
        'logConfs': items[start:end],
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
        })


def update_log_conf(id, confName, logType, multilineLogParser, syslogParser,
                    userLogFormat, userSampleLog, regularExpression,
                    timeRegularExpression, regularSpecs, processorFilterRegex,
                    timeKey, timeOffset):
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
        UpdateExpression=
        'SET #confName = :cfn, #logType=:lt, #multilineLogParser=:multilineLogParser, #syslogParser=:syslogParser, #updatedDt= :uDt, #userLogFormat=:userLogFormat, #userSampleLog=:userSampleLog, #regularExpression=:regularExpression,#timeRegularExpression=:timeRegularExpression, #regularSpecs=:regularSpecs, #processorFilterRegex=:processorFilterRegex, #timeKey=:timeKey, #timeOffset=:timeOffset ',
        ExpressionAttributeNames={
            '#confName': 'confName',
            '#logType': 'logType',
            '#multilineLogParser': 'multilineLogParser',
            '#syslogParser': 'syslogParser',
            '#updatedDt': 'updatedDt',
            '#userLogFormat': 'userLogFormat',
            '#userSampleLog': 'userSampleLog',
            '#regularExpression': 'regularExpression',
            '#timeRegularExpression': 'timeRegularExpression',
            '#regularSpecs': 'regularSpecs',
            '#processorFilterRegex': 'processorFilterRegex',
            '#timeKey': 'timeKey',
            '#timeOffset': 'timeOffset',
        },
        ExpressionAttributeValues={
            ':cfn': confName,
            ':lt': logType,
            ':multilineLogParser': multilineLogParser,
            ':syslogParser': syslogParser,
            ':uDt': datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%SZ'),
            ':userLogFormat': userLogFormat,
            ':userSampleLog': userSampleLog,
            ':regularExpression': regularExpression,
            ':timeRegularExpression': timeRegularExpression,
            ':regularSpecs': _validate_regular_specs(regularSpecs),
            ':processorFilterRegex':
            _validate_filter_regex(processorFilterRegex),
            ':timeKey': timeKey,
            ':timeOffset': timeOffset,
        })


def _validate_regular_specs(lst: list) -> list:
    for each in lst:
        if not isinstance(each, dict):
            raise APIException(
                'Invalid regularSpecs: list item is not a dict.')
        if not each.get('key'):
            raise APIException(
                'Invalid regularSpecs: can not found "key" field.')
        if '' == each.get('format'):
            raise APIException('Invalid regularSpecs: empty format.')
        if ('date' == each.get('type')) and (not each.get('format')):
            raise APIException(
                'Invalid regularSpecs: "date" type must have "format"')

    return lst


def _validate_filter_regex(map: map) -> map:
    if map is None:
        return None
    if not isinstance(map, dict):
        raise APIException(
            'Invalid processorFilterRegex: item is not a dict or None.')
    if map.get('enable') is None:
        raise APIException(
            'Invalid processorFilterRegex: can not found "enable" field.')
    if map.get('enable') is True:
        if not isinstance(map.get('filters'), list):
            raise APIException(
                'Invalid processorFilterRegex: filters item is not a list.')
        for each in map.get('filters'):
            if not each.get('key'):
                raise APIException(
                    'Invalid processorFilterRegex.filters: can not found "key" field.'
                )
            if not each.get('condition'):
                raise APIException(
                    'Invalid processorFilterRegex.filters: can not found "condition" field.'
                )
            if not each.get('value'):
                raise APIException(
                    'Invalid processorFilterRegex.filters: can not found "value" field.'
                )

    return map
