# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import boto3
import os
import uuid
import logging
import time

import json
import re

from string import Template
from datetime import datetime
from botocore import config

from boto3.dynamodb.conditions import Key
from boto3.dynamodb.conditions import Attr
from util.agent_type import AgentType
from util.sys_enum_type import SOURCETYPE

from util.exception import APIException

logger = logging.getLogger()
logger.setLevel(logging.INFO)

solution = os.environ.get('SOLUTION', 'SO8025/' + os.environ['SOLUTION_VERSION'])
user_agent_config = {'user_agent_extra': f'AwsSolution/{solution}'}
default_config = config.Config(**user_agent_config)

# Get SSM resource
ssm = boto3.client('ssm', config=default_config)
ssm_log_config_document_name = os.environ.get('SSM_LOG_CONFIG_DOCUMENT_NAME')

# Get S3 resource
s3 = boto3.resource('s3', config=default_config)
config_file_s3_bucket_name = os.environ.get('CONFIG_FILE_S3_BUCKET_NAME')

# Get Lambda resource
awslambda = boto3.client('lambda', config=default_config)
iam = boto3.client('iam', config=default_config)

# Get DDB resource.
dynamodb = boto3.resource('dynamodb', config=default_config)
instance_meta_table_name = os.environ.get('INSTANCE_META_TABLE_NAME')
app_pipeline_table_name = os.environ.get('APP_PIPELINE_TABLE_NAME')
app_log_config_table_name = os.environ.get('APP_LOG_CONFIG_TABLE_NAME')
instance_group_table_name = os.environ.get('INSTANCE_GROUP_TABLE_NAME')
app_log_ingestion_table_name = os.environ.get('APPLOGINGESTION_TABLE')
ec2_log_source_table_name = os.environ.get('EC2_LOG_SOURCE_TABLE_NAME')
s3_log_source_table_name = os.environ.get('S3_LOG_SOURCE_TABLE_NAME')
eks_cluster_log_source_table_name = os.environ.get('EKS_CLUSTER_SOURCE_TABLE_NAME')

instance_meta_table = dynamodb.Table(instance_meta_table_name)
app_pipeline_table = dynamodb.Table(app_pipeline_table_name)
app_log_config_table = dynamodb.Table(app_log_config_table_name)
instance_group_table = dynamodb.Table(instance_group_table_name)
app_log_ingestion_table = dynamodb.Table(app_log_ingestion_table_name)
ec2_log_source_table = dynamodb.Table(ec2_log_source_table_name)
s3_log_source_table = dynamodb.Table(s3_log_source_table_name)
eks_cluster_log_source_table = dynamodb.Table(eks_cluster_log_source_table_name)


class LogIngestionSvc:

    def get_instances(self, group_id):
        """
        Get the instance ids by group id
        :param group_id:
        :return: instanceSet
        """
        response = instance_group_table.get_item(Key={'id': group_id})
        if 'Item' not in response:
            raise APIException('Instance Group Not Found')

        return response['Item']['instanceSet']

    def get_instance_history_mapping(self, instance_id):
        """
        Get the history of instance mapping
        :param instance_id:
        :return:
        """
        response = instance_meta_table.query(
            IndexName='instanceId-index',
            KeyConditionExpression=Key('instanceId').eq(instance_id)
        )
        if 'Items' not in response:
            raise APIException('Instance Metadata Not Found')

        return response['Items']

    def upload_folder_to_s3(self, s3_bucket, input_dir, s3_path):
        """
        Upload a folder to s3, and keep the folder structure
        :param s3_bucket:
        :param input_dir:
        :param s3_path:
        :return:
        """
        logger.info("Uploading results to s3 initiated...")

        try:
            for path, subdirs, files in os.walk(input_dir):
                for file in files:
                    dest_path = path.replace(input_dir, "")
                    __s3file = os.path.normpath(s3_path + '/' + dest_path + '/' + file)
                    __local_file = os.path.join(path, file)
                    logger.info("Upload : %s  to Target: %s" % (__local_file, __s3file))
                    s3_bucket.upload_file(__local_file, __s3file)
        except Exception as e:
            logger.error(" ... Failed!! Quitting Upload!!")
            logger.error(e)
            raise e

    def upload_config_to_ec2(self, logAgent: AgentType, group_id, log_ingestion_id, new_config_id='',
                             new_app_pipeline_id=''):
        """Upload the config file to EC2 by SSM"""
        instance_ids = self.get_instances(group_id)
        _health_check_retry_interval = 2  # sec, times
        for instance_id in instance_ids:
            # send the run command to ec2
            self.ssm_send_command(instance_id)
            # update the instance_meta_table
            if new_config_id != '':
                self.create_instance_meta(instance_id, new_app_pipeline_id, new_config_id, group_id, log_ingestion_id)
        time.sleep(_health_check_retry_interval)
        # Retry process
        unsuccessful_instance_ids = logAgent.agent_health_check(instance_ids)
        if len(unsuccessful_instance_ids) > 0:
            logger.info("Start retry config distribution for unsuccessful instances: " + str(unsuccessful_instance_ids))
            for i in range(_health_check_retry_interval):
                for instance_id in unsuccessful_instance_ids:
                    self.ssm_send_command(instance_id)
                time.sleep(_health_check_retry_interval)
                unsuccessful_instance_ids = logAgent.agent_health_check(unsuccessful_instance_ids)
                logger.info("Retry times: %d, unsuccessful instance left: %s" % (i + 1, str(unsuccessful_instance_ids)))
                if len(unsuccessful_instance_ids) == 0:
                    break
        if len(unsuccessful_instance_ids) > 0:
            logger.info("Unsuccessful instances (after 2 retries): %s" % str(unsuccessful_instance_ids))
        else:
            logger.info("Distributed agent config to: %s successfully" % str(instance_ids))

    def ssm_send_command(self, instance_id):
        """
        Run the document in SSM to download the log config file in EC2
        :param instance_id:
        :return:
        """
        logger.info('Run SSM documentation on instance %s' % instance_id)
        response = ssm.send_command(
            InstanceIds=[instance_id],
            DocumentName=ssm_log_config_document_name,
            Parameters={
                'INSTANCEID': [instance_id]
            },
        )
        logger.info('Triggered log config downloading to EC2 successfully')
        command_id = response['Command']['CommandId']
        return command_id

    def create_instance_meta(self, instance_id, app_pipeline_id, config_id, group_id, log_ingestion_id):
        """
        Create the instance meta item
        :param instance_id:
        :param app_pipeline_id:
        :param config_id:
        :param group_id:
        :param log_ingestion_id:
        :return: id
        """
        id = str(uuid.uuid4())
        logger.info('Create Instance Meta Data, id %s' % id)
        instance_meta_table.put_item(
            Item={
                'id': id,
                'instanceId': instance_id,
                'appPipelineId': app_pipeline_id,
                'confId': config_id,
                'groupId': group_id,
                'logIngestionId': log_ingestion_id,
                'status': 'ACTIVE',
                'createdDt': datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%SZ'),
            }
        )
        return id


    def get_kinesis_data_stream_detail(self, app_pipeline_id):
        """
        Get kinesis data stream detail by app pipeline id
        :param app_pipeline_id:
        :return: kds_paras
        """
        response = app_pipeline_table.get_item(Key={'id': app_pipeline_id})
        if 'Item' not in response:
            raise APIException('App Pipeline Not Found')

        kds_paras = response['Item']['kdsParas']

        return kds_paras

    def get_config_detail(self, config_id):
        """
        Get the config detail by config id
        :param config_id:
        :return:
        """
        response = app_log_config_table.get_item(Key={'id': config_id})
        if 'Item' not in response:
            raise APIException('App Config Not Found')

        return response['Item']

    def get_instance_meta_id(self, log_ingestion_id):
        """
        Get the app log instance_meta table id by log_ingestion id
        :param log_ingestion_id:
        :return: ids
        """
        conditions = Attr('logIngestionId').eq(log_ingestion_id)

        resp = instance_meta_table.scan(
            FilterExpression=conditions,
            ProjectionExpression="id, #logIngestionId",
            ExpressionAttributeNames={
                '#logIngestionId': 'logIngestionId',
            },
        )
        result = resp['Items']
        ids = [item['id'] for item in result]
        return ids

    def _render_template(self, filename, **kwds):
        with open(filename, 'r') as fp:
            s = Template(fp.read())
            return s.safe_substitute(**kwds)

    # TODO: It's a hack here, we need to add a "timeFormat" field in GraphQL.
    def _get_time_format(self, regularSpecs: list) -> str:
        kvs = list(filter(lambda x: x.get('format'), regularSpecs))
        if len(kvs) > 0:
            return kvs[0]['format']
        return '""'  # empty string

    def validate_config(self, **args):
        current_conf = args['current_conf']
        current_log_type = current_conf['logType']
        # Validation will inclued historical inactive ingestions.
        # Which means even if users have deleted the ingestion,
        # new created ingestion still needs to be checked with deleted ones.
        resp = self.list_app_log_ingestions(appPipelineId=args['appPipelineId'],
                                            page=1, count=10,
                                            no_page=True, include_inactive=True)
        # Since the ingestion of INACTIVE is considered, it needs to be de-duplicated here
        confIds = list(set([ingestion['confId'] for ingestion in resp['appLogIngestions']]))
        if len(confIds) > 0:
            resp = self.do_batch_get({
                app_log_config_table.name: {
                    'Keys': [{'id': id_} for id_ in confIds]
                }
            })
            ingestion_confs = resp[app_log_config_table.name]
            for ingestion_conf in ingestion_confs:
                ingestion_conf_type = ingestion_conf['logType']

                if current_log_type != ingestion_conf_type:
                    raise APIException(
                        f"The current config type \"{current_log_type}\" must be the same as the "
                        f"initial config type \"{ingestion_conf_type}\" of the ingestion.\n"
                        f"If you want to ingest \"{current_log_type}\" type logs, please create a new App Pipeline.")
                self.validate_index_mapping(current_conf, ingestion_conf)

    def transform(self, lst: list, preserve_key=False) -> dict:
        """
        Transform key value pair list into a dict.

        Examples #1:

        Given: preserve_key=False
        Input:
        [
            { "key": "ip", "type": "ip" },
            { "key": "time_local", "type": "date", "format": "dd/MMM/yyyy:HH:mm:ss Z||epoch_millis" },
        ]
        Output:
        {
            "ip": { "type": "ip" },
            "time_local": { "type": "date", "format": "dd/MMM/yyyy:HH:mm:ss Z||epoch_millis" },
        }

        Examples #2:

        Given: preserve_key=True
        Input:
        [
            { "key": "ip", "type": "ip" },
            { "key": "time_local", "type": "date", "format": "dd/MMM/yyyy:HH:mm:ss Z||epoch_millis" },
        ]
        Output:
        {
            "ip": { "key": "ip", "type": "ip" },
            "time_local": { "key": "time_local", "type": "date", "format": "dd/MMM/yyyy:HH:mm:ss Z||epoch_millis" },
        }
        """
        d = {}
        for each in lst:
            key = each['key']
            val = {'type': each['type']}
            if preserve_key:
                val['key'] = key
            if each.get('format'):
                val['format'] = each['format']
            d[key] = val
        return d

    def validate_index_mapping(self, conf1, conf2):
        """
        Validate if two index mappings are matched.

        Examples #1:

        Input:
        conf1 = {
            'regularSpecs': [
                {'type': 'ip', 'key': 'ip'},
                {'type': 'text', 'key': 'text'}
            ]
        }
        conf2 = {
            'regularSpecs': [
                {'type': 'ip', 'key': 'ip'},
                {'type': 'text', 'key': 'text'}
            ]
        }
        Output: Valid

        Examples #2:

        Input:
        conf1 = {
            'regularSpecs': [
                {'type': 'ip', 'key': 'ip'},
                {'type': 'text', 'key': 'text'}
            ]
        }
        conf2 = {
            'regularSpecs': [
                {'type': 'ip', 'key': 'ip'},
                {'type': 'number', 'key': 'text'}
            ]
        }
        Output: Invalid

        """
        assert isinstance(conf1, dict)
        assert isinstance(conf2, dict)

        conf1_regex_specs_dict = self.transform(conf1.get('regularSpecs', []), preserve_key=True)
        conf2_regex_specs_dict = self.transform(conf2.get('regularSpecs', []), preserve_key=True)

        for key in conf1_regex_specs_dict:
            val1 = conf1_regex_specs_dict[key]
            val2 = conf2_regex_specs_dict.get(key)
            if (val2 is not None) and (val2 != val1):
                raise APIException(
                    f"Invalid index mapping: config1={conf1.get('id')} index mapping={val1} and config2={conf2.get('id')} index mapping={val2} mismatch")

    # See https://github.com/awsdocs/aws-doc-sdk-examples/blob/aff1457e152f5a38e6a176fce40a918d63ff7c07/python
    # /example_code/dynamodb/batching/dynamo_batching.py#L65:5
    def do_batch_get(self, batch_keys):
        """
        Gets a batch of items from Amazon DynamoDB. Batches can contain keys from
        more than one table.
        When Amazon DynamoDB cannot process all items in a batch, a set of unprocessed
        keys is returned. This function uses an exponential backoff algorithm to retry
        getting the unprocessed keys until all are retrieved or the specified
        number of tries is reached.
        :param batch_keys: The set of keys to retrieve. A batch can contain at most 100
                        keys. Otherwise, Amazon DynamoDB returns an error.
        :return: The dictionary of retrieved items grouped under their respective
                table names.
        """
        tries = 0
        max_tries = 5
        sleepy_time = 1  # Start with 1 second of sleep, then exponentially increase.
        retrieved = {key: [] for key in batch_keys}
        while tries < max_tries:
            response = dynamodb.batch_get_item(RequestItems=batch_keys)
            # Collect any retrieved items and retry unprocessed keys.
            for key in response.get('Responses', []):
                retrieved[key] += response['Responses'][key]
            unprocessed = response['UnprocessedKeys']
            if len(unprocessed) > 0:
                batch_keys = unprocessed
                unprocessed_count = sum(
                    [len(batch_key['Keys']) for batch_key in batch_keys.values()])
                logger.info(
                    "%s unprocessed keys returned. Sleep, then retry.",
                    unprocessed_count)
                tries += 1
                if tries < max_tries:
                    logger.info("Sleeping for %s seconds.", sleepy_time)
                    time.sleep(sleepy_time)
                    sleepy_time = min(sleepy_time * 2, 32)
            else:
                break

        return retrieved

    def batch_write_app_log_ingestions(self, **args):
        source_ids = args['sourceIds']
        source_ingestion_map = {}
        for sourceId in source_ids:
            source_ingestion_map[sourceId] = str(uuid.uuid4())
            args['page'] = 1
            args['count'] = 10
            args['sourceId'] = sourceId
            resp = self.list_app_log_ingestions(**args)
            if 'total' in resp and resp['total'] > 0:
                raise APIException(
                    f'please check sourceId {sourceId} and conId {args["confId"]},'
                    f' they already exist in applineId {args["appPipelineId"]}')

        with app_log_ingestion_table.batch_writer() as batch:
            for sourceId in source_ids:
                id = source_ingestion_map.get(sourceId)
                batch.put_item(
                    Item={
                        'id': id,
                        'confId': args['confId'],
                        'sourceId': sourceId,
                        'stackId': args['stackId'],
                        'stackName': args['stackName'],
                        'appPipelineId': args['appPipelineId'],
                        'createdDt': datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%SZ'),
                        'status': 'CREATING',
                        'sourceType': args['sourceType'],
                        'tags': args.get('tags', []),
                    }
                )
        args['source_ingestion_map'] = source_ingestion_map
        args['action'] = "asyncCreateAppLogIngestion"
        return args

    def list_app_log_ingestions(self, **args):
        """  List app log ingestion """
        page = args.get('page',1)
        count = args.get('count',100)
        logger.info(f'List AppLogIngestion from DynamoDB in page {page} with {count} of records')

        """ build filter conditions """
        conditions = Attr('status').is_in(['ACTIVE', 'CREATING', 'DELETING', 'ERROR'])

        if 'status' in args and args['status'] and args['status'] != 'ACTIVE':
            conditions = Attr('status').eq(args['status'])

        if args.get('include_inactive'):
            logger.info('List AppLogIngestion from DynamoDB with inactive items')
            conditions = Attr('status').is_in(['ACTIVE', 'CREATING', 'DELETING', 'ERROR', 'INACTIVE'])

        if 'id' in args and args['id']:
            conditions = conditions.__and__(Attr('id').eq(args['id']))

        if 'confId' in args and args['confId']:
            conditions = conditions.__and__(Attr('confId').eq(args['confId']))

        if 'sourceIds' in args and args['sourceIds']:
            conditions = conditions.__and__(Attr('sourceId').is_in(args['sourceIds']))
        elif 'sourceId' in args and args['sourceId']:
            conditions = conditions.__and__(Attr('sourceId').eq(args['sourceId']))

        if 'sourceType' in args and args['sourceType']:
            conditions = conditions.__and__(Attr('sourceType').eq(args['sourceType']))

        if 'appPipelineId' in args and args['appPipelineId']:
            conditions = conditions.__and__(Attr('appPipelineId').eq(args['appPipelineId']))

        response = app_log_ingestion_table.scan(
            FilterExpression=conditions,
            ProjectionExpression="#id, createdDt, #confId, #sourceId, groupId, stackId, stackName, #appPipelineId, "
                                 "#sourceType, #status, tags ",
            ExpressionAttributeNames={
                '#id': 'id',
                '#confId': 'confId',
                '#sourceId': 'sourceId',
                '#sourceType': 'sourceType',
                '#appPipelineId': 'appPipelineId',
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

        if args.get('no_page'):
            logger.info('List AppLogIngestion from DynamoDB under no paging mode')
            start = 0
            end = len(items)

        if start > total:
            start, end = 0, count
        logger.info(f'Return result from {start} to {end} in total of {total}')
        items.sort(key=lambda x: x['createdDt'], reverse=True)
        results = items[start: end]
        for result in results:
            result = self.compatible_historical_helper(result)

            log_conf_resp = app_log_config_table.get_item(Key={'id': result['confId']})
            if 'Item' in log_conf_resp:
                result['confName'] = log_conf_resp['Item']['confName']
            else:
                result['confName'] = ''

            source_type = result['sourceType']

            if source_type == SOURCETYPE.EC2.value:
                instance_group_resp = instance_group_table.get_item(Key={'id': result['sourceId']})
                sourceName = ''
                if 'Item' in instance_group_resp:
                    sourceName = instance_group_resp['Item']['groupName']

                result['sourceInfo'] = {
                    "sourceId": result['sourceId'],
                    "sourceName": sourceName,
                    "sourceType": source_type
                }
            elif source_type == SOURCETYPE.S3.value:
                s3_log_source_resp = s3_log_source_table.get_item(Key={'id': result['sourceId']})
                result['sourceInfo'] = {}
                if 'Item' in s3_log_source_resp:
                    result['sourceInfo'] = {
                        "sourceId": result['sourceId'],
                        "sourceName": s3_log_source_resp['Item']['s3Name'],
                        "sourceType": source_type,
                        "createdDt": s3_log_source_resp['Item']['createdDt'],
                        "region": s3_log_source_resp['Item']['region'],
                        "accountId": '',
                        "s3Source": {
                            "s3Name": s3_log_source_resp['Item']['s3Name'],
                            "s3Prefix": s3_log_source_resp['Item']['s3Prefix'],
                            "archiveFormat": s3_log_source_resp['Item']['archiveFormat']
                        },

                        "logPath": ''

                    }
                    result['sourceName'] = s3_log_source_resp['Item']['s3Name']

            elif source_type == SOURCETYPE.EKS_CLUSTER.value:
                """
                get EKS Cluster details
                """
                result['sourceInfo'] = {}
                eks_cluster_log_source_resp = eks_cluster_log_source_table.get_item(Key={'id': result['sourceId']})
                if 'Item' in eks_cluster_log_source_resp:
                    # get depolymentkind by eksClusterId
                    result['sourceInfo'] = {
                        "sourceId": result['sourceId'],
                        "sourceName": eks_cluster_log_source_resp['Item']['eksClusterName'],
                        "sourceType": source_type,
                        "createdDt": eks_cluster_log_source_resp['Item']['createdDt'],
                        "region": eks_cluster_log_source_resp['Item']['region'],
                        "accountId": eks_cluster_log_source_resp['Item']['accountId'],
                        "logPath": ''
                    }
        return {
            'total': len(items),
            'appLogIngestions': results,
        }

    def compatible_historical_helper(self, data):
        """ Helper function to be compatible with history data"""

        # compatible with v0.2.0
        if 'sourceType' not in data:
            data['sourceType'] = 'EC2'
            data['sourceId'] = data['groupId']

        return data

    def remote_create_index_template(self, appPipelineId: str, confId: str, multiline_log_parser: str = None):
        resp = app_pipeline_table.get_item(Key={'id': appPipelineId})
        item = resp['Item']
        os_helper_fn_arn = item['kdsParas']['osHelperFnArn']

        resp = app_log_config_table.get_item(Key={'id': confId})
        item = resp['Item']
        log_type = item['logType']

        # TODO: This is a hack here, since time format is parsed in fluent-bit side.
        # So there's no need to set in OpenSearch side.
        def _without_time_key(x):
            return not x.get('format')

        mappings = self.transform(filter(_without_time_key, item.get('regularSpecs', [])))

        payload = {
            'action': 'CreateIndexTemplate',
            'props': {
                'log_type': log_type,
                'mappings': mappings,
            },
        }

        if multiline_log_parser:
            payload['props']['multiline_log_parser'] = multiline_log_parser

        logger.info(f'Remote call {os_helper_fn_arn} with {payload}')

        resp = awslambda.invoke(
            FunctionName=os_helper_fn_arn,
            Payload=json.dumps(payload),
        )

        logger.info(f'Remote resp {resp["Payload"].read()}')

        if resp['StatusCode'] > 300:
            raise APIException('Error creating index template')

    def role_arn2role_name(self, arn: str):
        return re.findall(r"/([-\w]+)$", arn, re.MULTILINE)[0]

    def attached_eks_cluster_account_role(self, **args):
        try:
            source_ids = args['sourceIds']

            if len(source_ids) <= 0:
                logger.info('Nothing to do')
                return

            resp = self.do_batch_get({
                eks_cluster_log_source_table.name: {
                    'Keys': [{'id': src_id} for src_id in source_ids]
                }
            })

            # get app_pipeline_ids list by sourceId
            query_args = dict()
            query_args['sourceIds'] = args['sourceIds']
            query_args['sourceType'] = args['sourceType']
            app_log_ingestion_list_result = self.list_app_log_ingestions(**query_args)
            app_log_ingestion_list = app_log_ingestion_list_result['appLogIngestions']
            logger.info(f'app_pipeline_list is {app_log_ingestion_list}')
            app_pipeline_ids = []
            for app_log_pipeline in app_log_ingestion_list:
                app_pipelin_id = app_log_pipeline['appPipelineId']
                if app_pipelin_id not in app_pipeline_ids:
                    app_pipeline_ids.append(app_pipelin_id)

            # get kds arn list by app_pipeline_ids
            query_pipeline_resp = self.do_batch_get({
                app_pipeline_table.name: {
                    'Keys': [{'id': pipeline_id} for pipeline_id in app_pipeline_ids]
                }
            })

            app_pipelines = query_pipeline_resp[app_pipeline_table.name]
            arns = []
            for app_pipeline in app_pipelines:    
                arns.append(app_pipeline['kdsParas']['kdsArn'])

            # update role
            for eks_log_src in resp[eks_cluster_log_source_table.name]:
                logger.info(f"Put role policy to {eks_log_src['logAgentRoleArn']}")
                iam.put_role_policy(
                    PolicyDocument=json.dumps({
                        "Version": "2012-10-17",
                        "Statement": [{
                            "Effect": "Allow",
                            "Action": [
                                "kinesis:PutRecord",
                                "kinesis:PutRecords"
                            ],
                            "Resource": list(filter(bool, arns))
                        }]
                    }),
                    PolicyName=f"eks-log-src-{eks_log_src['id'][:5]}",
                    RoleName=self.role_arn2role_name(eks_log_src['logAgentRoleArn']),
                )

            self.remote_create_index_template(args['appPipelineId'], args['confId'],
                                              multiline_log_parser=args['current_conf'].get('multilineLogParser'))

        except Exception as e:
            args['error'] = str(e)
            args['status'] = 'ERROR'
            self.batch_create_ingestion(**args)
            raise APIException(str(e))

    def get_eks_cluster_list_by_name(self, eks_cluster_name: str, eks_account_id: str, region_name: str) -> list:
        """
        get eks cluster list by eks cluster name
        """
        conditions = Attr('status').eq('ACTIVE')
        conditions = conditions.__and__(Attr('eksClusterName').eq(eks_cluster_name))
        conditions = conditions.__and__(Attr('accountId').eq(eks_account_id))
        conditions = conditions.__and__(Attr('region').eq(region_name))
        response = eks_cluster_log_source_table.scan(
            FilterExpression=conditions,
            ProjectionExpression="id,aosDomainId,#region,#accountId,#eksClusterName,eksClusterArn,cri,subnetIds, vpcId, eksClusterSGId,oidcIssuer,endpoint,createdDt,logAgentRoleArn,tags,updatedDt,#status",
            ExpressionAttributeNames={
                '#region': 'region',
                '#status': 'status',
                '#eksClusterName': 'eksClusterName',
                '#accountId': 'accountId',
            }
        )
        if ('Items' in response) and (len(response['Items']) > 0):
            return response['Items']
        else:
            return list()

    def get_eks_cluster_log_source(self, eksClusterId: str):
        """
        Get EKS Cluster Log Source By Id
        """
        eks_cluster_log_source_resp = eks_cluster_log_source_table.get_item(Key={'id': eksClusterId})
        if 'Item' not in eks_cluster_log_source_resp:
            raise APIException(f'EKS Cluster Log Source Not Found, EKSCluster id is {eksClusterId}')
        return eks_cluster_log_source_resp['Item']

    def create_eks_cluster_pod_log_ingestion(self, **args):
        logger.info('Creating EKS log ingestion')
        args['status'] = 'ACTIVE'
        args['error'] = ''
        self.attached_eks_cluster_account_role(**args)
        self.batch_create_ingestion(**args)

    def update_eks_cluster_pod_log_ingestion(self, **args):
        args['status'] = 'ACTIVE'
        args['error'] = ''
        current_conf = app_log_config_table.get_item(Key={'id': args['confId']})['Item']
        args['current_conf'] = current_conf
        self.attached_eks_cluster_account_role(**args)
        self.batch_set_ingestion_active(**args)

    def batch_set_ingestion_active(self, **args):
        # Insert ingestion,status is Active
        source_ids = args['sourceIds']
        for sourceId in source_ids:
            id = args['source_ingestion_map'].get(sourceId)
            app_log_ingestion_table.update_item(
                Key={'id': id},
                UpdateExpression='SET #status = :status,#stackId=:stackId,#stackName=:stackName,#error=:error, #updatedDt= :uDt',
                ExpressionAttributeNames={
                    '#status': 'status',
                    '#stackId': 'stackId',
                    '#stackName': 'stackName',
                    '#error': 'error',
                    '#updatedDt': 'updatedDt'
                },
                ExpressionAttributeValues={
                    ':status': args['status'],
                    ':stackId': args['stackId'],
                    ':stackName': args['stackName'],
                    ':error': args['error'],
                    ':uDt': datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%SZ')
                }
            )

    def batch_create_ingestion(self, **args):
        # Insert ingestion,status is Active
        source_ids = args['sourceIds']
        with app_log_ingestion_table.batch_writer() as batch:
            for sourceId in source_ids:
                id = args['source_ingestion_map'].get(sourceId)
                batch.put_item(
                    Item={
                        'id': id,
                        'confId': args['confId'],
                        'sourceId': sourceId,
                        'stackId': args['stackId'],
                        'stackName': args['stackName'],
                        'appPipelineId': args['appPipelineId'],
                        'createdDt': datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%SZ'),
                        'status': args['status'],
                        'error': args['error'],
                        'sourceType': args['sourceType'],
                        'tags': args.get('tags', []),
                    }
                )
