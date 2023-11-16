# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import json
from utils import logger, IAMClient
from utils.aws.commonlib import AWSConnection
from utils.models.meta import MetaTable


AWS_DDB_META = MetaTable()
AWS_IAM = IAMClient()


def available_services() -> list:
    conn = AWSConnection()
    return conn.get_available_services()
    
    
def check_scheduler_services() -> None:
    partition = AWS_DDB_META.get(meta_name='Partition')['value']
    region = AWS_DDB_META.get(meta_name='Region')['value']
    account_id = AWS_DDB_META.get(meta_name='AccountId')['value']
        
    available_services_list = available_services()
    if region in ('cn-north-1', 'cn-northwest-1') and 'scheduler' in available_services_list:
        available_services_list.remove('scheduler')
        
    AWS_DDB_META.put(meta_name='AvailableServices', item={'name': 'AvailableServices', 'service': 'AWS', 'type': 'AvailableServices', 'value': available_services_list})
    if 'scheduler' in available_services_list:
        pipeline_resources_builder_schedule_policy_arn = AWS_DDB_META.get(meta_name='PipelineResourcesBuilderSchedulePolicy')['arn']
        
        for meta_name in ('LogProcessorStartExecutionRole', 'LogMergerStartExecutionRole', 'LogArchiveStartExecutionRole'):
            role_name = AWS_DDB_META.get(meta_name=meta_name)['name']
            AWS_IAM.add_service_principal_to_assume_role_policy(role_name=role_name, service_principal='scheduler.amazonaws.com')
        
        policy_document = {
            'Effect': 'Allow',
            'Action': [
                "scheduler:GetSchedule",
                "scheduler:UpdateSchedule",
                "scheduler:CreateSchedule",
                "scheduler:GetScheduleGroup",
                "scheduler:DeleteScheduleGroup",
                "scheduler:CreateScheduleGroup",
                "scheduler:DeleteSchedule",
                "scheduler:TagResource",
            ], 
            'Resource': [
                f'arn:{partition}:scheduler:{region}:{account_id}:schedule/*/*',
                f'arn:{partition}:scheduler:{region}:{account_id}:schedule-group/*',
            ],
          }
        AWS_IAM.update_policy_document(arn=pipeline_resources_builder_schedule_policy_arn, sid='EventBridgeScheduler', policy_document=policy_document)


def init_stack_environment():
    check_scheduler_services()


def lambda_handler(event, _) -> None:
    logger.info(f'Received request: {json.dumps(event)}')
    if not isinstance(event, dict):
        raise ValueError('The event is not a dict.')
    
    if event['RequestType'] in ('Create', 'Update'):
        for item in event['ResourceProperties'].get('Items', []):
            AWS_DDB_META.put(meta_name=item['metaName'], item=item)
        init_stack_environment()
    elif event['RequestType'] in ('Delete'):
        for item in event['ResourceProperties'].get('Items', []):
            AWS_DDB_META.delete(meta_name=item['metaName'])
            
            