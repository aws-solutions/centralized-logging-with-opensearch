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
from util.assume_role import generate_assume_role_statement_document, generate_assume_role_policy_document

logger = logging.getLogger()
logger.setLevel(os.environ.get('LOGGER_LEVEL') or logging.INFO)

solution_version = os.environ.get("SOLUTION_VERSION", "v1.0.0")
solution_id = os.environ.get("SOLUTION_ID", "SO8025")
user_agent_config = {
    "user_agent_extra": f"AwsSolution/{solution_id}/{solution_version}"
}
default_config = config.Config(**user_agent_config)
default_region = os.environ.get('AWS_REGION')
sts = boto3.client("sts", config=default_config)
account_id = sts.get_caller_identity()["Account"]

iam = boto3.client('iam', config=default_config)
# Get DDB resource.
dynamodb = boto3.resource('dynamodb', config=default_config)

app_pipeline_table = dynamodb.Table(os.environ.get('APP_PIPELINE_TABLE_NAME'))
app_log_config_table = dynamodb.Table(
    os.environ.get('APP_LOG_CONFIG_TABLE_NAME'))
app_log_ingestion_table = dynamodb.Table(
    os.environ.get('APPLOGINGESTION_TABLE'))
eks_cluster_log_source_table = dynamodb.Table(
    os.environ.get('EKS_CLUSTER_SOURCE_TABLE_NAME'))

sfn = boto3.client('stepfunctions', config=default_config)
stateMachineArn = os.environ.get('STATE_MACHINE_ARN')

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
    if action == "createEKSClusterPodLogWithoutDataBufferIngestion":
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

    if default_region in ["cn-north-1", "cn-northwest-1"]:
        partition = "aws-cn"
    else:
        partition = "aws"

    entity_str = generate_assume_role_statement_document(account_id=account_id)
    trust_entity = json.loads(entity_str)

    # gernerate statement
    trust_entites = list()
    trust_entites.append(trust_entity)
    assume_role_policy_document = generate_assume_role_policy_document(
        trust_entites)
    role_name = 'AOS-Agent-' + app_log_pipeline_id
    response = iam.create_role(
        RoleName=role_name,
        AssumeRolePolicyDocument=assume_role_policy_document,
        Description='Using this role to send log data to AOS')
    iam.put_role_policy(
        PolicyDocument=json.dumps({
            "Version":
            "2012-10-17",
            "Statement": [{
                "Effect":
                "Allow",
                "Action": [
                    "es:ESHttpGet", "es:ESHttpDelete", "es:ESHttpPut",
                    "es:ESHttpPost", "es:ESHttpHead", "es:ESHttpPatch"
                ],
                "Resource":
                f"arn:{partition}:es:{default_region}:{account_id}:domain/{domain_name}"
            }]
        }),
        PolicyName='AOS-Agent-policy-' + app_log_pipeline_id,
        RoleName=role_name,
    )
    ec2RoleArn = response['Role']['Arn']
    app_pipeline_table.put_item(
        Item={
            'id': app_log_pipeline_id,
            'aosParas': args['aosParas'],
            'ec2RoleName': role_name,
            'ec2RoleArn': ec2RoleArn,
            'tags': args.get('tags', []),
            'createdDt': datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%SZ'),
            'status': 'CREATING',
        })
    #log_ingestion_svc.attached_eks_cluster_account_role(**args)

    args['appPipelineId'] = app_log_pipeline_id
    args['stackId'] = ''
    args['stackName'] = ''
    args = log_ingestion_svc.batch_write_app_log_ingestions(**args)
    source_ingestion_map = args['source_ingestion_map']
    app_log_ingestion_id = source_ingestion_map.get(args['sourceIds'][0])
    stack_name = create_stack_name(app_log_pipeline_id)
    logger.info(args)
    sfn_args = {
        'stackName':
        stack_name,
        'pattern':
        'OpenSearchAdminStack',
        'parameters': [
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
            # EC2Role
            {
                'ParameterKey': 'LogProcessorRoleArnParam',
                'ParameterValue': ec2RoleArn
            },
        ]
    }

    sfn_args['confId'] = args['confId']
    sfn_args['sourceIds'] = args['sourceIds']
    sfn_args['sourceType'] = args['sourceType']
    sfn_args['source_ingestion_map'] = args['source_ingestion_map']
    # Start the eks cluster pod log pipeline flow: Agent to AOS
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
    return 'LogHub-EKS-Cluster-PodLog-Without-Data-Buffer-Pipeline-' + id[:5]
