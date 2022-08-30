# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import json
import logging
import os
from datetime import datetime
from multiprocessing import Process
from util.log_agent_helper import IngestionTask

import boto3
from botocore import config
from util.exception import APIException
from util.kds_role_mgr import KDSRoleMgr
from util.sys_enum_type import SOURCETYPE

logger = logging.getLogger()
logger.setLevel(logging.INFO)
solution_version = os.environ.get("SOLUTION_VERSION", "v1.0.0")
solution_id = os.environ.get("SOLUTION_ID", "SO8025")
user_agent_config = {
    "user_agent_extra": f"AwsSolution/{solution_id}/{solution_version}"
}
default_config = config.Config(**user_agent_config)
awslambda = boto3.client('lambda', config=default_config)
dynamodb = boto3.resource('dynamodb', config=default_config)
table_name = os.environ.get('APPLOGINGESTION_TABLE')
app_log_ingestion_table = dynamodb.Table(table_name)
group_table_name = os.environ.get('INSTANCE_GROUP_TABLE_NAME')
instance_group_table = dynamodb.Table(group_table_name)
conf_table_name = os.environ.get('APP_LOG_CONFIG_TABLE_NAME')
log_conf_table = dynamodb.Table(conf_table_name)
default_region = os.environ.get('AWS_REGION')
app_pipeline_table = dynamodb.Table(os.environ.get('APP_PIPELINE_TABLE_NAME'))

sts = boto3.client("sts", config=default_config)
account_id = sts.get_caller_identity()["Account"]

iam = boto3.client('iam', config=default_config)
iam_res = boto3.resource('iam', config=default_config)


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
    action = event['action']
    args = event
    if action == "asyncCreateAppLogIngestion":
        return child_create_app_log_ingestion(**args)
    elif action == "asyncDeleteAppLogIngestion":
        return child_delete_app_log_ingestion(**args)
    else:
        logger.info('Event received: ' + json.dumps(event, indent=2))
        raise RuntimeError(f'Unknown async action {action}')


def child_create_app_log_ingestion(**args):
    group_ids = args['sourceIds']
    group_ingestion_map = args['source_ingestion_map']
    #create or update kds role
    KDSRoleMgr.generate_kds_role_4_fluent_bit(
        app_pipeline_id=args['appPipelineId'],
        source_type=SOURCETYPE.EC2,
        source_ids=group_ids)
    # create a list to keep all processes
    processes = []
    with app_log_ingestion_table.batch_writer() as batch:
        for groupId in group_ids:
            id = group_ingestion_map.get(groupId)
            # create the process, pass instance and connection
            ingestion_task = IngestionTask('FluentBit', groupId,
                                           args['confId'],
                                           args['appPipelineId'], id,
                                           args['is_multiline'])
            process = Process(target=ingestion_task.create_ingestion())
            processes.append(process)

    # start all processes
    for process in processes:
        process.start()
    # make sure that all processes have finished
    for process in processes:
        process.join()

    with app_log_ingestion_table.batch_writer(
            overwrite_by_pkeys=['id']) as batch:
        for groupId in group_ids:
            id = group_ingestion_map.get(groupId)
            source_info = instance_group_table.get_item(
                Key={'id': groupId})['Item']
            batch.put_item(
                Item={
                    'id': id,
                    'confId': args['confId'],
                    'logPath': args.get('logPath', ''),
                    'accountId': source_info.get('accountId', account_id),
                    'region': source_info.get('region', default_region),
                    'sourceId': groupId,
                    'stackId': args.get('stackId', ''),
                    'stackName': args.get('stackName', ''),
                    'appPipelineId': args['appPipelineId'],
                    'createdDt': datetime.utcnow().strftime(
                        '%Y-%m-%dT%H:%M:%SZ'),
                    'status': 'ACTIVE',
                    'sourceType': args['sourceType'],
                    'tags': args.get('tags', []),
                })


def child_delete_app_log_ingestion(**args):
    """ set status to INACTIVE in AppLogIngestion table """
    logger.info('Delete AppLogIngestion Status in DynamoDB')
    # create a list to keep all processes
    processes = []
    for id in args['ids']:
        # create the process, pass instance and connection
        ingestion = app_log_ingestion_table.get_item(Key={'id': id})['Item']
        confId = ingestion.get('confId')
        group_id = ingestion.get('sourceId')
        current_conf = log_conf_table.get_item(Key={'id': confId})['Item']
        is_multiline = True if current_conf.get(
            'multilineLogParser') else False
        ingestion_task = IngestionTask('FluentBit', group_id, '', '', id,
                                       is_multiline)
        process = Process(target=ingestion_task.delete_ingestion())
        processes.append(process)
    # start all processes
    for process in processes:
        process.start()
    # make sure that all processes have finished
    for process in processes:
        process.join()

    # Update the app log ingestion table
    for id in args['ids']:
        app_log_ingestion_table.update_item(
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
