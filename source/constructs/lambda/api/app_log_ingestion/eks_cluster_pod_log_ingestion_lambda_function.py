# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import json
import logging
import os
import uuid
from datetime import datetime

import boto3

from botocore import config
from util.log_ingestion_svc import LogIngestionSvc
from util.sys_enum_type import SOURCETYPE
from common import AppPipelineValidator, APIException

logger = logging.getLogger()
logger.setLevel(logging.INFO)

solution_version = os.environ.get("SOLUTION_VERSION", "v1.0.0")
solution_id = os.environ.get("SOLUTION_ID", "SO8025")
user_agent_config = {
    "user_agent_extra": f"AwsSolution/{solution_id}/{solution_version}"
}
default_config = config.Config(**user_agent_config)
default_region = os.environ.get('AWS_REGION')

sfn = boto3.client('stepfunctions', config=default_config)
stateMachineArn = os.environ.get('STATE_MACHINE_ARN')

# Get DDB resource.
dynamodb = boto3.resource('dynamodb', config=default_config)

app_pipeline_table = dynamodb.Table(os.environ.get('APP_PIPELINE_TABLE_NAME'))
app_log_config_table = dynamodb.Table(
    os.environ.get('APP_LOG_CONFIG_TABLE_NAME'))

log_ingestion_svc = LogIngestionSvc()


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
    if action == "createEKSClusterPodLogIngestion":
        return create_eks_cluster_pod_log_ingestion(**args)
    else:
        logger.info('Event received: ' + json.dumps(event, indent=2))
        raise APIException(f'Unknown action {action}')


def create_eks_cluster_pod_log_ingestion(**args):
    """  Create a eks cluster pod log pipeline and ingestion """

    aos_paras = args['aosParas']

    index_prefix = str(aos_paras['indexPrefix'])
    domain_name = str(aos_paras['domainName'])

    validator = AppPipelineValidator(app_pipeline_table)
    validator.validate_duplicate_index_prefix(args)
    validator.validate_index_prefix_overlap(index_prefix, domain_name,
                                            args.get('force'))

    app_log_conf_resp = app_log_config_table.get_item(
        Key={'id': args['confId']})
    if 'Item' not in app_log_conf_resp:
        raise APIException(
            f"Conf Id {args['confId']} Not Found, please check!")
    args['current_conf'] = app_log_conf_resp['Item']

    logger.info('create eks cluster pod log pineline and ingestion')
    args['sourceType'] = SOURCETYPE.EKS_CLUSTER.value
    args['sourceIds'] = [args['eksClusterId']]

    app_log_pipeline_id = str(uuid.uuid4())
    args['appPipelineId'] = app_log_pipeline_id
    # input args['sourceIds']:eksClusterId, args['sourceType']: EKSCluster,args['appPipelineId']: app_log_pipeline_id,args['tags']
    log_ingestion_svc.validate_config(**args)
    app_pipeline_table.put_item(
        Item={
            'id': app_log_pipeline_id,
            'aosParas': args['aosParas'],
            'kdsParas': args['kdsParas'],
            'tags': args.get('tags', []),
            'createdDt': datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%SZ'),
            'status': 'CREATING',
        })
    args['appPipelineId'] = app_log_pipeline_id
    args['stackId'] = ''
    args['stackName'] = ''
    args = log_ingestion_svc.batch_write_app_log_ingestions(**args)

    source_ingestion_map = args['source_ingestion_map']
    app_log_ingestion_id = source_ingestion_map.get(args['sourceIds'][0])

    stack_name = create_stack_name(app_log_pipeline_id)
    logger.info(args)
    kds_paras = args['kdsParas']
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
                'ParameterValue': str(args['createDashboard'])
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

    sfn_args['confId'] = args['confId']
    sfn_args['sourceIds'] = args['sourceIds']
    sfn_args['sourceType'] = args['sourceType']
    sfn_args['source_ingestion_map'] = args['source_ingestion_map']
    # Start the eks cluster pod log pipeline flow
    logger.info('Start the eks cluster pod log pipeline flow ')
    exec_sfn_flow(app_log_pipeline_id, app_log_ingestion_id, 'START', sfn_args)

    return app_log_ingestion_id


def exec_sfn_flow(id: str, ingestion_id: str, action='START', args=None):
    """ Helper function to execute a step function flow """
    logger.info(f'Execute Step Function Flow: {stateMachineArn}')

    if args is None:
        args = {}

    input = {
        'id': id,
        'appLogIngestionId': ingestion_id,
        'appPipelineId': id,
        'action': action,
        'args': args,
    }

    sfn.start_execution(
        name=f'{id}-{action}',
        stateMachineArn=stateMachineArn,
        input=json.dumps(input),
    )


def create_stack_name(id):
    return 'LogHub-EKS-Cluster-PodLog-Pipeline-' + id[:5]
