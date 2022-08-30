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
from common import AppPipelineValidator, APIException

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
sfn = boto3.client('stepfunctions', config=default_config)

app_pipeline_table_name = os.environ.get('APPPIPELINE_TABLE')
app_log_ingestion_table_name = os.environ.get('APPLOGINGESTION_TABLE')
default_region = os.environ.get('AWS_REGION')
stateMachineArn = os.environ.get('STATE_MACHINE_ARN')
app_pipeline_table = dynamodb.Table(app_pipeline_table_name)
app_log_ingestion_table = dynamodb.Table(app_log_ingestion_table_name)

# Get kinesis resource.
kds = boto3.client('kinesis', config=default_config)


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


@handle_error
def lambda_handler(event, context):
    # logger.info("Received event: " + json.dumps(event, indent=2))

    action = event['info']['fieldName']
    args = event['arguments']

    if action == "createAppPipeline":
        return create_app_pipeline(**args)
    elif action == "deleteAppPipeline":
        return delete_app_pipeline(**args)
    elif action == "listAppPipelines":
        return list_app_pipelines(**args)
    elif action == "getAppPipeline":
        return get_app_pipeline(**args)
    else:
        logger.info('Event received: ' + json.dumps(event, indent=2))
        raise RuntimeError(f'Unknown action {action}')


def create_app_pipeline(**args):
    """  Create a appPipeline """
    logger.info('create appPipeline')
    id = str(uuid.uuid4())
    stack_name = create_stack_name(id)

    logger.info(args)

    kds_paras = args['kdsParas']
    aos_paras = args['aosParas']

    # Check if index prefix is duplicated in the same opensearch
    index_prefix = str(aos_paras['indexPrefix'])
    domain_name = str(aos_paras['domainName'])

    validator = AppPipelineValidator(app_pipeline_table)
    validator.validate_duplicate_index_prefix(args)
    validator.validate_index_prefix_overlap(index_prefix, domain_name,
                                            args.get('force'))

    sfn_args = {
        'stackName':
        stack_name,
        'pattern':
        'KDSStackNoAutoScaling',
        'parameters': [
            # Kinesis
            {
                'ParameterKey': 'ShardCountParam',
                'ParameterValue': str(kds_paras['startShardNumber'])
            },
            # Opensearch
            {
                'ParameterKey': 'OpenSearchDomainParam',
                'ParameterValue': str(aos_paras['domainName'])
            },
            {
                'ParameterKey': 'CreateDashboardParam',
                'ParameterValue': 'No'
            },
            {
                'ParameterKey': 'OpenSearchShardNumbersParam',
                'ParameterValue': str(aos_paras['shardNumbers'])
            },
            {
                'ParameterKey': 'OpenSearchReplicaNumbersParam',
                'ParameterValue': str(aos_paras['replicaNumbers'])
            },
            {
                'ParameterKey': 'OpenSearchDaysToWarmParam',
                'ParameterValue': str(aos_paras['warmLogTransition'])
            },
            {
                'ParameterKey': 'OpenSearchDaysToColdParam',
                'ParameterValue': str(aos_paras['coldLogTransition'])
            },
            {
                'ParameterKey': 'OpenSearchDaysToRetain',
                'ParameterValue': str(aos_paras['logRetention'])
            },
            {
                'ParameterKey': 'EngineTypeParam',
                'ParameterValue': str(aos_paras['engine'])
            },
            {
                'ParameterKey': 'OpenSearchEndpointParam',
                'ParameterValue': str(aos_paras['opensearchEndpoint'])
            },
            {
                'ParameterKey': 'OpenSearchIndexPrefix',
                'ParameterValue': str(aos_paras['indexPrefix'])
            },
            # VPC
            {
                'ParameterKey': 'VpcIdParam',
                'ParameterValue': str(aos_paras['vpc']['vpcId'])
            },
            {
                'ParameterKey': 'SubnetIdsParam',
                'ParameterValue': str(aos_paras['vpc']['privateSubnetIds'])
            },
            {
                'ParameterKey': 'SecurityGroupIdParam',
                'ParameterValue': str(aos_paras['vpc']['securityGroupId'])
            },
            {
                'ParameterKey': 'FailedLogBucketParam',
                'ParameterValue': str(aos_paras['failedLogBucket'])
            },
        ]
    }
    if kds_paras['enableAutoScaling']:
        params = sfn_args['parameters']
        params.append({
            'ParameterKey': 'MinCapacityParam',
            'ParameterValue': str(kds_paras['startShardNumber'])
        })
        params.append({
            'ParameterKey': 'MaxCapacityParam',
            'ParameterValue': str(kds_paras['maxShardNumber'])
        })
        sfn_args['parameters'] = params
        sfn_args['pattern'] = 'KDSStack'

    # Start the pipeline flow
    exec_sfn_flow(id, 'START', sfn_args)
    app_pipeline_table.put_item(
        Item={
            'id': id,
            'aosParas': args['aosParas'],
            'kdsParas': args['kdsParas'],
            'tags': args.get('tags', []),
            'createdDt': datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%SZ'),
            'status': 'CREATING',
        })

    return id


def list_app_pipelines(status: str = '', page=1, count=20):
    """  List app pipelines """
    logger.info(
        f'List AppPipeline from DynamoDB in page {page} with {count} of records'
    )
    """ build filter conditions """

    if not status:
        conditions = Attr('status').ne('INACTIVE')
    else:
        conditions = Attr('status').eq(status)

    response = app_pipeline_table.scan(
        FilterExpression=conditions,
        ProjectionExpression=
        "id, kdsParas, kdsRoleArn,ec2RoleArn,aosParas, tags, #status, createdDt ",
        ExpressionAttributeNames={
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
        'appPipelines': items[start:end],
    }


# obtain the app pipline details and kds details
def get_app_pipeline(id: str) -> str:
    resp = app_pipeline_table.get_item(Key={'id': id})
    if 'Item' not in resp:
        raise APIException('AppPipeline Not Found')

    if 'kdsParas' in resp['Item']:
        kds_paras = resp['Item']['kdsParas']
        if 'streamName' in kds_paras and kds_paras['streamName']:
            kds_resp = kds.describe_stream_summary(
                StreamName=kds_paras['streamName'])
            if 'StreamDescriptionSummary' in kds_resp:
                kds_paras['openShardCount'] = kds_resp[
                    'StreamDescriptionSummary'].get('OpenShardCount')
                kds_paras['consumerCount'] = kds_resp[
                    'StreamDescriptionSummary'].get('ConsumerCount')
        resp['Item']['kdsParas'] = kds_paras
    return resp['Item']


def delete_app_pipeline(id: str):
    """ set status to INACTIVE in AppPipeline table """
    logger.info('Update AppPipeline Status in DynamoDB')
    pipeline_resp = app_pipeline_table.get_item(Key={'id': id})
    if 'Item' not in pipeline_resp:
        raise APIException('AppPipeline Not Found')

    # Check if data exists in the AppLog Ingestion table
    # build filter conditions
    conditions = Attr('status').ne('INACTIVE')
    conditions = conditions.__and__(Attr('appPipelineId').eq(id))

    ingestion_resp = app_log_ingestion_table.scan(
        FilterExpression=conditions,
        ProjectionExpression="id,#status,sourceType,sourceId,appPipelineId ",
        ExpressionAttributeNames={'#status': 'status'})
    # Assume all items are returned in the scan request
    items = ingestion_resp['Items']
    # logger.info(items)
    # build pagination
    total = len(items)
    if total > 0:
        raise APIException('Please delete the application log ingestion first')

    stack_id = pipeline_resp['Item']['stackId']
    if stack_id:
        args = {'stackId': stack_id}
        # Start the pipeline flow
        exec_sfn_flow(id, 'STOP', args)

    app_pipeline_table.update_item(
        Key={'id': id},
        UpdateExpression='SET #status = :s, #updatedDt= :uDt',
        ExpressionAttributeNames={
            '#status': 'status',
            '#updatedDt': 'updatedDt'
        },
        ExpressionAttributeValues={
            ':s': 'DELETING',
            ':uDt': datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%SZ')
        })


def update_app_log_pipeline(**args):
    """ update status, kds paras in AppLogIngestion table """
    logger.info('Update AppPipeline Status in DynamoDB')
    resp = app_pipeline_table.get_item(Key={'id': args['id']})
    if 'Item' not in resp:
        raise APIException('AppPipeline Not Found')

    app_pipeline_table.update_item(
        Key={'id': args['id']},
        UpdateExpression='SET #status = :s, #kdsParas= :kp, #updatedDt= :uDt,',
        ExpressionAttributeNames={
            '#status': 'status',
            '#kdsParas': 'kdsParas',
            '#updatedDt': 'updatedDt'
        },
        ExpressionAttributeValues={
            ':s': args['status'],
            ':kp': args['kdsParas'],
            ':uDt': datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%SZ')
        })


def exec_sfn_flow(id: str, action='START', args=None):
    """ Helper function to execute a step function flow """
    logger.info(f'Execute Step Function Flow: {stateMachineArn}')

    if args is None:
        args = {}

    input = {
        'id': id,
        'action': action,
        'args': args,
    }

    sfn.start_execution(
        name=f'{id}-{action}',
        stateMachineArn=stateMachineArn,
        input=json.dumps(input),
    )


def create_stack_name(id):
    # TODO: prefix might need to come from env
    return 'LogHub-AppPipe-' + id[:5]
