# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import json
import logging
import os
from datetime import datetime

import boto3
from botocore import config
from common import APIException
from util.assume_role import generate_assume_role_statement_document, generate_assume_role_policy_document

logger = logging.getLogger()
logger.setLevel(logging.INFO)

solution_version = os.environ.get("SOLUTION_VERSION", "v1.0.0")
solution_id = os.environ.get("SOLUTION_ID", "SO8025")
user_agent_config = {
    "user_agent_extra": f"AwsSolution/{solution_id}/{solution_version}"
}
default_config = config.Config(**user_agent_config)
sts = boto3.client("sts", config=default_config)

account_id = sts.get_caller_identity()["Account"]
default_region = os.environ.get("AWS_REGION")

# Get DDB resource.
dynamodb = boto3.resource('dynamodb', config=default_config)
app_pipeline_table_name = os.environ.get('APPPIPELINE_TABLE')
app_pipeline_table = dynamodb.Table(app_pipeline_table_name)

iam = boto3.client('iam', config=default_config)


def handle_error(func):
    """ Decorator for exception handling """

    def wrapper(*args, **kwargs):
        try:
            return func(*args, **kwargs)
        except APIException as e:
            logger.exception(e)
            raise e
        except Exception as e:
            logger.exception(e)
            raise RuntimeError(
                'Unknown exception, please check Lambda log for more details')

    return wrapper


#@handle_error
def lambda_handler(event, context):
    # logger.info("Received event: " + json.dumps(event, indent=2))
    args = event['arguments']
    app_log_pipeline_ids = args['ids']
    for app_log_pipeline_id in app_log_pipeline_ids:

        resp = app_pipeline_table.get_item(Key={'id': app_log_pipeline_id})
        if 'Item' not in resp:
            continue

        app_log_pipeline = resp['Item']
        if not app_log_pipeline.get(
                'kdsRoleArn') and app_log_pipeline['status'] == 'ACTIVE':
            entity_str = generate_assume_role_statement_document(
                account_id=account_id)
            trust_entity = json.loads(entity_str)

            # gernerate statement
            trust_entites = list()
            trust_entites.append(trust_entity)
            assume_role_policy_document = generate_assume_role_policy_document(
                trust_entites)
            role_name = 'Agent-DataBufferKDSRole-' + app_log_pipeline_id
            response = iam.create_role(
                RoleName=role_name,
                AssumeRolePolicyDocument=assume_role_policy_document,
                Description='Using this role to send log data to KDS')
            iam.put_role_policy(
                PolicyDocument=json.dumps({
                    "Version":
                    "2012-10-17",
                    "Statement": [{
                        "Effect":
                        "Allow",
                        "Action": ["kinesis:PutRecord", "kinesis:PutRecords"],
                        "Resource":
                        app_log_pipeline['kdsParas']['kdsArn']
                    }]
                }),
                PolicyName='agent-kds-policy-' + app_log_pipeline_id,
                RoleName=role_name,
            )
            kdsRoleArn = response['Role']['Arn']
            # update app pipeline
            app_pipeline_table.update_item(
                Key={'id': app_log_pipeline_id},
                UpdateExpression=
                'SET #kdsRoleArn=:roleArn, #kdsRoleName=:roleName, #updatedDt= :uDt',
                ExpressionAttributeNames={
                    '#kdsRoleArn': 'kdsRoleArn',
                    '#kdsRoleName': 'kdsRoleName',
                    '#updatedDt': 'updatedDt',
                },
                ExpressionAttributeValues={
                    ':roleArn': kdsRoleArn,
                    ':roleName': role_name,
                    ':uDt': datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%SZ')
                })

    return 'OK'
