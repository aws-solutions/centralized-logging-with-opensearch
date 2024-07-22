# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import os
import json
from utils.aws import IAMClient, SESClient
from utils.helpers import logger, AWSConnection, file_reader
from utils.models.meta import MetaTable


AWS_DDB_META = MetaTable()
AWS_IAM = IAMClient()
AWS_SES = SESClient()


def available_services() -> list:
    conn = AWSConnection()
    return conn.get_available_services()
    
    
def check_scheduler_services(request_type: str) -> None:
    if request_type == 'Delete':
        return 
    
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


def check_ses_services(request_type: str) -> None:
    simple_email_service_state = AWS_DDB_META.get(meta_name='SimpleEmailServiceState')['value'].lower()
    ses_email_template_name = AWS_DDB_META.get(meta_name='SimpleEmailServiceTemplate')['value']
    email_address = AWS_DDB_META.get(meta_name='EmailAddress')['value']
    
    if request_type in ('Create', 'Update') and simple_email_service_state == 'enabled':
        current_path = os.path.dirname(os.path.abspath(__file__))
        
        if not AWS_SES.get_template(template_name=ses_email_template_name):
            AWS_SES.create_template(
                template_name=ses_email_template_name, 
                subject='[Notification] {{stateMachine.name}} task {{stateMachine.status}} to execute.',
                text='Best regards',
                html=str(file_reader(path=f"{current_path}/assets/sendemail.template", extension='text').read()),
                )
        if not AWS_SES.get_identity_verification_attributes(identity=email_address).get('VerificationAttributes'):
            AWS_SES.verify_email_identity(email_address=email_address)
    elif request_type == 'Delete' and simple_email_service_state == "enabled":
        AWS_SES.delete_identity(identity=email_address)
        AWS_SES.delete_template(template_name=ses_email_template_name)


def init_stack_environment(request_type: str):
    check_scheduler_services(request_type=request_type)
    check_ses_services(request_type=request_type)


def lambda_handler(event, _) -> None:
    logger.info(f'Received request: {json.dumps(event)}')
    if not isinstance(event, dict):
        raise ValueError('The event is not a dict.')
    
    if event['RequestType'] in ('Create', 'Update'):
        for item in event['ResourceProperties'].get('Items', []):
            AWS_DDB_META.put(meta_name=item['metaName'], item=item)
        init_stack_environment(request_type=event['RequestType'])
    elif event['RequestType'] in ('Delete'):
        init_stack_environment(request_type=event['RequestType'])
        for item in event['ResourceProperties'].get('Items', []):
            AWS_DDB_META.delete(meta_name=item['metaName'])
            
            