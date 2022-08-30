# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

from cmath import log
import logging
import os
import sys
import time
from datetime import datetime

import boto3
from botocore import config

from util.agent_type import AgentType
from util.exception import APIException
from util.log_ingestion_svc import LogIngestionSvc
from util.sys_enum_type import (CRI, LOGTYPE, S3CUSTOMIZEREGEXLOGTYPE,
                                S3PRESETLOGTYPE, DEPLOYMENTKIND,
                                MULTILINELOGPARSER)
from util.aws_svc_mgr import SvcManager, Boto3API

logger = logging.getLogger()
logger.setLevel(logging.INFO)

solution = os.environ.get('SOLUTION',
                          'SO8025/' + os.environ['SOLUTION_VERSION'])
user_agent_config = {'user_agent_extra': f'AwsSolution/{solution}'}
default_config = config.Config(**user_agent_config)
default_region = os.environ.get("AWS_REGION")
# Get S3 resource
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

instance_meta_table = dynamodb.Table(instance_meta_table_name)
app_pipeline_table = dynamodb.Table(app_pipeline_table_name)
app_log_config_table = dynamodb.Table(app_log_config_table_name)
instance_group_table = dynamodb.Table(instance_group_table_name)
app_log_ingestion_table = dynamodb.Table(app_log_ingestion_table_name)
ec2_log_source_table = dynamodb.Table(ec2_log_source_table_name)
s3_log_source_table = dynamodb.Table(s3_log_source_table_name)

# k8s parameters
fluent_bit_image = os.environ.get(
    'FLUENT_BIT_IMAGE',
    'public.ecr.aws/aws-observability/aws-for-fluent-bit:2.25.1')
fluent_bit_eks_cluster_name_space = os.environ.get(
    'FLUENT_BIT_EKS_CLUSTER_NAME_SPACE', 'logging')
container_log_path = os.environ.get('CONTAINER_LOG_PATH',
                                    '/var/log/containers/')

FB_FILTER_UNIFORM_TIME_FORMAT = '''\
[FILTER]
    Name    lua
    Match   *
    time_as_table   on
    script  uniform-time-format.lua
    call    cb_print
'''

sts = boto3.client("sts", config=default_config)
account_id = sts.get_caller_identity()["Account"]


class IngestionTask:

    def __init__(self,
                 agent_type: str,
                 group_id: str,
                 config_id: str,
                 app_pipeline_id: str,
                 log_ingestion_id: str,
                 is_multiline: bool = False) -> None:
        # try to find a mapping class
        if agent := getattr(sys.modules[__name__], agent_type, None):
            self._agent = agent(group_id, config_id, app_pipeline_id,
                                log_ingestion_id, is_multiline)
        else:
            raise RuntimeError(f"Unknown Type {agent_type}")

    def create_ingestion(self):
        self._agent.create_ingestion_parser()
        self._agent.create_ingestion()

    def delete_ingestion(self):
        self._agent.delete_ingestion()


class FluentBit(AgentType):
    """An implementation of AgentType for Fluent Bit Agent"""

    _health_check_retry_interval = 2  # secs

    _service_template_path = './util/fluentbit_template/log-agent-service.template'
    _input_template_path = './util/fluentbit_template/log-agent-input.template'
    _input_multiline_template_path = './util/fluentbit_template/log-agent-input-multiline.template'
    _output_template_path = './util/fluentbit_template/log-agent-output.template'
    _system_parser_template_path = './util/fluentbit_template/log-agent-system-parser.template'
    _parser_template_path = './util/fluentbit_template/log-agent-parser.template'
    _uniform_time_format_lua = './util/fluentbit_template/uniform-time-format.lua'

    # k8s Fluent Bit
    _k8s_input_output_filter_daemonset_template_path = './util/eks_cluster_pod_template/fluent-bit-input-output-filter-daemonset.template.yaml'
    """
    The parameters that need to be replaced are as follows:
    $LOGHUB_CHECKPOINT
    $LOGHUB_CONFIG_TAG
    $LOGHUB_CONFIG_REGION
    $LOGHUB_CONFIG_KDS_NAME
    $LOGHUB_USER_DEFINE_FILTER: 
        1.it will be replace the content of user defined filter template in the daemonset pattern 
        2.it will be replace '' in the sidecar pattern
    $LOGHUB_CONFIG_TAG_PREFIX
    $LOGHUB_MERGE_PARSER
    $LOGHUB_PARSER_NAME   
    $LOGHUB_KDS_ROLE_ARN
    """
    _k8s_input_output_filter_daemonset_aos_template_path = './util/eks_cluster_pod_template/fluent-bit-input-output-filter-daemonset-aos.template.yaml'
    """
    The parameters that need to be replaced are as follows:
    $LOGHUB_CHECKPOINT
    $LOGHUB_CONFIG_TAG
    $LOGHUB_CONFIG_REGION
    $LOGHUB_CONFIG_KDS_NAME
    $LOGHUB_USER_DEFINE_FILTER: 
        1.it will be replace the content of user defined filter template in the daemonset pattern 
        2.it will be replace '' in the sidecar pattern
    $LOGHUB_CONFIG_TAG_PREFIX
    $LOGHUB_MERGE_PARSER
    $LOGHUB_PARSER_NAME
    LOGHUB_AOS_IDX_NAME   
    $LOGHUB_EC2_ROLE_ARN
    """
    _k8s_input_output_sidecar_template_path = './util/eks_cluster_pod_template/fluent-bit-input-output-sidecar.template.yaml'
    """
    The parameters that need to be replaced are as follows:
    $LOGHUB_CONFIG_TAG
    $LOGHUB_CHECKPOINT
    $LOGHUB_MULTILINE
    $LOGHUB_PARSER_NAME   
    $LOGHUB_CONFIG_REGION
    $LOGHUB_CONFIG_KDS_NAME
    $LOGHUB_KDS_ROLE_ARN
    """
    _k8s_input_output_sidecar_aos_template_path = './util/eks_cluster_pod_template/fluent-bit-input-output-sidecar-aos.template.yaml'
    """
    The parameters that need to be replaced are as follows:
    $LOGHUB_CONFIG_TAG
    $LOGHUB_CHECKPOINT
    $LOGHUB_MULTILINE
    $LOGHUB_PARSER_NAME   
    $LOGHUB_CONFIG_REGION
    $LOGHUB_CONFIG_KDS_NAME
    $LOGHUB_AOS_IDX_NAME    
    $LOGHUB_EC2_ROLE_ARN
    """

    _k8s_configmap_template_path = './util/eks_cluster_pod_template/fluent-bit-configmap.template.yaml'
    """
    Both daemonset and sidecar are required for configmap.
    The parameters that need to be replaced are as follows:
    $NAMESPACE=fluent_bit_eks_cluster_name_space
    $FLUENT_BIT_INPUT_OUTPUT_FILTER=_k8s_input_output_filter_template_template_path
    $USER_DEFINE_PARSER=_k8s_user_define_parser_template_path
    """

    _k8s_configmap_aos_template_path = './util/eks_cluster_pod_template/fluent-bit-configmap-aos.template.yaml'
    """
    Both daemonset and sidecar are required for configmap.
    The parameters that need to be replaced are as follows:
    $NAMESPACE=fluent_bit_eks_cluster_name_space
    $FLUENT_BIT_INPUT_OUTPUT_FILTER=_k8s_input_output_filter_template_template_path
    $USER_DEFINE_PARSER=_k8s_user_define_parser_template_path
    """

    _k8s_user_defined_multiline_filter_template_path = './util/eks_cluster_pod_template/fluent-bit-user-defined-multiline-filter.template.yaml'
    """
    The parameters that need to be replaced are as follows:
    $LOGHUB_CONFIG_TAG
    $LOGHUB_MULTILINE_PARSER
    """
    _k8s_user_defined_docker_firstline_parser_template_path = './util/eks_cluster_pod_template/fluent-bit-user-defined-docker-firstline-parser.template.yaml'
    """
    The parameters are only for docker runtime interface
    $LOGHUB_PARSER_NAME
    $LOGHUB_REGEX
    """
    _k8s_user_defined_parser_template_path = './util/eks_cluster_pod_template/fluent-bit-user-defined-parser.template.yaml'
    """
    Both daemonset and sidecar are required for configmap.
    The parameters that need to be replaced are as follows:
    $LOGHUB_PARSER_NAME
    $LOGHUB_PARSER_FORMAT
    $LOGHUB_TIME_KEY
    $LOGHUB_TIME_FORMAT
    """
    _k8s_user_defined_multiline_parser_template_path = './util/eks_cluster_pod_template/fluent-bit-user-defined-multiline-parser.template.yaml'
    """
    Both daemonset and sidecar are required for configmap.
    The parameters that need to be replaced are as follows:
    $LOGHUB_MULTILINE_PARSER_NAME
    $LOGHUB_PARSER_FORMAT
    $LOGHUB_TIME_KEY
    $LOGHUB_TIME_FORMAT
    """
    _k8s_daemonset_template_path = './util/eks_cluster_pod_template/fluent-bit-daemonset.template.yaml'
    """
    $NAMESPACE=fluent_bit_eks_cluster_name_space
    $FLUENT_BIT_IMAGE=fluent_bit_image
    $EKS_CLUSTER_NAME
    """
    _k8s_role_binding_template_path = './util/eks_cluster_pod_template/fluent-bit-role-binding.template.yaml'
    """
    Both daemonset and sidecar are required for role binding.
    The parameters that need to be replaced are as follows:
    $NAMESPACE=fluent_bit_eks_cluster_name_space
    """
    _k8s_svc_account_template_path = './util/eks_cluster_pod_template/fluent-bit-service-account.template.yaml'
    """
    Both daemonset and sidecar are required for svc account.
    The parameters that need to be replaced are as follows:
    $NAMESPACE=fluent_bit_eks_cluster_name_space
    $EKS_FLUENT_BIT_ROLE_ARN
    
    """
    _k8s_sidecar_template_path = './util/eks_cluster_pod_template/fluent-bit-sidecar.template.yaml'
    """
    The parameters that need to be replaced are as follows:
    $FLUENT_BIT_IMAGE=fluent_bit_image
    $EKS_CLUSTER_NAME
    """
    _k8s_name_space_template_path = './util/eks_cluster_pod_template/fluent-bit-namespace.template.yaml'
    """
    Both daemonset and sidecar are required for svc account. BTW, Sidecar pattern needs to prompt the user to replace the namespace.
    The parameters that need to be replaced are as follows:
    $NAMESPACE=fluent_bit_eks_cluster_name_space
    """

    _k8s_fluent_bit_k8s_filter_template_path = './util/eks_cluster_pod_template/fluent-bit-k8s-filter.yaml'

    # S3

    __config_id: str
    __app_pipeline_id: str
    __config_info: dict
    __is_multiline: bool

    def __init__(self,
                 group_id="",
                 config_id="",
                 app_pipeline_id="",
                 log_ingestion_id="",
                 is_multiline=False):
        self.__group_id = group_id
        self.__config_id = config_id
        self.__app_pipeline_id = app_pipeline_id
        self.__log_ingestion_id = log_ingestion_id
        self.__is_multiline = is_multiline
        self.__account_id = account_id
        self.__region = default_region

        if group_id:
            group = instance_group_table.get_item(Key={'id': group_id})['Item']
            self.__account_id = group.get('accountId', account_id)
            self.__region = group.get('region', default_region)

            svcMgr = SvcManager()
            s3 = svcMgr.get_client(sub_account_id=self.__account_id,
                                   service_name='s3',
                                   type=Boto3API.RESOURCE,
                                   region=self.__region)
            link_account = svcMgr.get_link_account(
                sub_account_id=self.__account_id, region=self.__region)
            if link_account:
                bucket_name = link_account['subAccountBucketName']
            else:
                bucket_name = config_file_s3_bucket_name
            self._s3_bucket = s3.Bucket(bucket_name)
            self._ssm = svcMgr.get_client(sub_account_id=self.__account_id,
                                          service_name='ssm',
                                          type=Boto3API.CLIENT,
                                          region=self.__region)
        self.__log_ingestion_svc = LogIngestionSvc(self.__account_id,
                                                   self.__region)
        if config_id == "":
            self.__config_info = {}
        else:
            self.__config_info = self.__log_ingestion_svc.get_config_detail(
                config_id=self.__config_id)

    @classmethod
    def get_fluent_bit_instance(cls, config_id: str, app_pipeline_id: str,
                                log_ingestion_id: str):
        return cls(group_id='',
                   config_id=config_id,
                   app_pipeline_id=app_pipeline_id,
                   log_ingestion_id=log_ingestion_id,
                   is_multiline=True)

    def create_ingestion_parser(self):
        """
        generate applog_parsers.conf
        """
        self._generate_parser()
        # self.__log_ingestion_svc.upload_folder_to_s3(self._s3_bucket,
        #                                              "/tmp/log_config",
        #                                              "app_log_config")

    def create_ingestion(self):
        """
        generate fluent-bit.conf
        """
        self._generate_conf_with_init_member()
        self.__log_ingestion_svc.upload_folder_to_s3(self._s3_bucket,
                                                     "/tmp/log_config",
                                                     "app_log_config")
        self.__log_ingestion_svc.upload_config_to_ec2(self, self.__group_id,
                                                      self.__log_ingestion_id,
                                                      self.__config_id,
                                                      self.__app_pipeline_id)

    def delete_ingestion(self):
        # update the instance meta table
        ids = self.__log_ingestion_svc.get_instance_meta_id(
            self.__log_ingestion_id)
        for id in ids:
            instance_meta_table.update_item(
                Key={'id': id},
                UpdateExpression='SET #status = :s',
                ExpressionAttributeNames={
                    '#status': 'status',
                },
                ExpressionAttributeValues={
                    ':s': 'INACTIVE',
                })
        # generate_config_again
        response = app_log_ingestion_table.get_item(
            Key={'id': self.__log_ingestion_id})
        if 'Item' not in response:
            raise APIException('App Log Ingestion item Not Found')
        group_id = response['Item'].get('groupId',
                                        response['Item'].get('sourceId'))
        self._generate_conf(group_id, is_multiline=self.__is_multiline)

        # send to the instances
        self.__log_ingestion_svc.upload_folder_to_s3(self._s3_bucket,
                                                     "/tmp/log_config",
                                                     "app_log_config")
        self.__log_ingestion_svc.upload_config_to_ec2(self, group_id,
                                                      self.__log_ingestion_id)

    def _generate_parser(self):
        """Generate the parser config"""
        instance_ids = self.__log_ingestion_svc.get_instances(self.__group_id)

        for instance_id in instance_ids:

            file_data = ""
            if self.__config_id != '':
                # Append the new parser in the parser config file
                file_data += self._generate_single_parser(
                    self.__app_pipeline_id, self.__group_id,
                    self.__config_id) + '\n'

                config_info = self.__log_ingestion_svc.get_config_detail(
                    self.__config_id)
                file_data += self.__log_ingestion_svc._render_template(
                    self._system_parser_template_path,
                    LOGHUB_TIME_FORMAT=self.
                    __log_ingestion_svc._get_time_format(
                        config_info.get('regularSpecs', []))) + '\n'
            else:
                file_data += self.__log_ingestion_svc._render_template(
                    self._system_parser_template_path,
                    LOGHUB_TIME_FORMAT='""') + '\n'

            # Append the history parser
            mapping_history = self.__log_ingestion_svc.get_instance_history_mapping(
                instance_id)
            for mapping in mapping_history:
                if mapping['status'] == 'INACTIVE':
                    continue
                file_data += self._generate_single_parser(
                    mapping['appPipelineId'], mapping['groupId'],
                    mapping['confId'])

            folder_path = '/tmp/log_config/' + instance_id
            if not os.path.exists(folder_path):
                os.makedirs(folder_path)
            updated_config_path = folder_path + '/applog_parsers.conf'
            tmp_file = open(updated_config_path, "w")
            tmp_file.write(file_data)
            tmp_file.close()

    def _generate_conf_with_init_member(self):
        self._generate_conf(group_id=self.__group_id,
                            config_id=self.__config_id,
                            app_pipeline_id=self.__app_pipeline_id,
                            is_multiline=self.__is_multiline)

    def _generate_conf(self,
                       group_id,
                       config_id='',
                       app_pipeline_id='',
                       is_multiline=False):

        instance_ids = self.__log_ingestion_svc.get_instances(group_id)

        for instance_id in instance_ids:

            file_data = ""
            # Append the SERVICE part in the config file
            with open(self._service_template_path) as openFile:
                config_service = openFile.read()
            file_data += config_service
            file_data += '\n'

            if config_id != '':
                # Append the new config pair in the config file
                file_data += self._generate_conf_input_output_pair(
                    config_id, app_pipeline_id, self.__log_ingestion_id,
                    group_id, is_multiline)

            # Append the history config pairs
            mapping_history = self.__log_ingestion_svc.get_instance_history_mapping(
                instance_id)
            for mapping in mapping_history:
                if mapping['status'] == 'INACTIVE':
                    continue
                file_data += self._generate_conf_input_output_pair(
                    mapping['confId'], mapping['appPipelineId'],
                    mapping['logIngestionId'], mapping['groupId'],
                    is_multiline)

            file_data += '\n' + FB_FILTER_UNIFORM_TIME_FORMAT

            folder_path = '/tmp/log_config/' + instance_id
            if not os.path.exists(folder_path):
                os.makedirs(folder_path)
            updated_config_path = folder_path + '/fluent-bit.conf'
            tmp_file = open(updated_config_path, "w")
            tmp_file.write(file_data)
            tmp_file.close()

            fwrite(f'{folder_path}/uniform-time-format.lua',
                   fread(self._uniform_time_format_lua))

    def _generate_conf_input_output_pair(self,
                                         config_id,
                                         app_pipeline_id,
                                         log_ingestion_id,
                                         group_id,
                                         is_multiline=False):
        """Generate the config file part of a single pair"""
        config_info = self.__log_ingestion_svc.get_config_detail(config_id)
        app_pipeline_info = self.__log_ingestion_svc.get_app_pipeline(
            app_pipeline_id)
        kds_paras = app_pipeline_info['kdsParas']
        config_tag = config_id + '_' + app_pipeline_id
        config_checkpoint = '/tmp/checkpoint-' + config_tag + '.db'
        parser_name = self.__generate_ec2_parser_name(config_info['logType'],
                                                      app_pipeline_id,
                                                      group_id, config_id)

        #Get Log Path from AppLogIngestion table. If it is null, it will be obtained from logConf table
        app_log_ingest_resp = app_log_ingestion_table.get_item(
            Key={'id': log_ingestion_id})
        if 'Item' not in app_log_ingest_resp:
            raise APIException('App Log Ingestion item Not Found')
        app_log_ingestion_info = app_log_ingest_resp['Item']
        log_path = app_log_ingestion_info.get("logPath",
                                              config_info.get('logPath'))
        file_data = ""
        if is_multiline:
            file_data += self._generate_input_multiline(
                log_path, config_tag, config_checkpoint, parser_name)
        else:
            file_data += self._generate_input(log_path, config_tag,
                                              config_checkpoint, parser_name)

        # ARN of an IAM role to assume (for cross account access)
        kds_role_arn = app_pipeline_info.get('kdsRoleArn', '')
        if kds_role_arn:
            kds_role_arn = 'Role_arn ' + kds_role_arn
        file_data += self._generate_output(config_tag, config_info,
                                           kds_paras['regionName'],
                                           kds_paras['streamName'],
                                           kds_role_arn)
        return file_data

    def _generate_input(self, log_path, config_tag, config_checkpoint,
                        parser_name):
        """Generate the input part"""
        return self._generate_input_with_template_file(
            template_file=self._input_template_path,
            log_path=log_path,
            config_tag=config_tag,
            config_checkpoint=config_checkpoint,
            parser_name=parser_name)

    def _generate_input_with_template_file(self, template_file, log_path,
                                           config_tag, config_checkpoint,
                                           parser_name):
        """Generate the input part"""
        input_data = ""
        with open(template_file, "r") as openFile:
            for line in openFile:
                line = line.replace("LOGHUB_CONFIG_PATH", log_path) \
                    .replace("LOGHUB_CONFIG_TAG", config_tag) \
                    .replace("LOGHUB_CHECKPOINT", config_checkpoint) \
                    .replace("LOGHUB_PARSER", parser_name)
                input_data += line
        input_data += '\n'
        return input_data

    def _generate_input_multiline(self, log_path, config_tag,
                                  config_checkpoint, parser_name):
        """Generate the input part"""
        return self._generate_input_multiline_with_template_file(
            template_file=self._input_multiline_template_path,
            log_path=log_path,
            config_tag=config_tag,
            config_checkpoint=config_checkpoint,
            parser_name=parser_name,
        )

    def _generate_input_multiline_with_template_file(self, template_file,
                                                     log_path, config_tag,
                                                     config_checkpoint,
                                                     parser_name):
        """Generate the input part"""
        return self.__log_ingestion_svc._render_template(
            template_file,
            LOGHUB_CONFIG_PATH=log_path,
            LOGHUB_CONFIG_TAG=config_tag,
            LOGHUB_CHECKPOINT=config_checkpoint,
            LOGHUB_PARSER=parser_name,
        )

    def _generate_output_with_init_member(self, config_tag, config_region,
                                          config_kds_name):
        # ARN of an IAM role to assume (for cross account access)
        app_pipeline_info = self.__log_ingestion_svc.get_app_pipeline(
            self.__app_pipeline_id)
        kds_role_arn = app_pipeline_info.get('kdsRoleArn', '')
        if kds_role_arn:
            kds_role_arn = 'Role_arn ' + kds_role_arn
        """Generate the output part"""
        return self._generate_output(config_tag,
                                     config_info=self.__config_info,
                                     config_region=config_region,
                                     config_kds_name=config_kds_name,
                                     config_kds_role_arn=kds_role_arn)

    def _generate_output(self, config_tag, config_info, config_region,
                         config_kds_name, config_kds_role_arn):
        """Generate the output part"""
        return self._generate_output_with_template_file(
            template_file=self._output_template_path,
            config_tag=config_tag,
            config_info=config_info,
            config_region=config_region,
            config_kds_name=config_kds_name,
            config_kds_role_arn=config_kds_role_arn,
        )

    def _generate_output_with_template_file(self, template_file, config_tag,
                                            config_info, config_region,
                                            config_kds_name,
                                            config_kds_role_arn):
        """Generate the output part"""
        output_data = ""
        with open(template_file, "r") as openFile:
            for line in openFile:
                line = line.replace("LOGHUB_CONFIG_TAG", config_tag) \
                    .replace("LOGHUB_CONFIG_REGION", config_region) \
                    .replace("LOGHUB_CONFIG_KDS_NAME", config_kds_name) \
                    .replace("LOGHUB_CONFIG_KDS_ROLE_ARN", config_kds_role_arn)
                output_data += line
        output_data += '\n'
        return output_data

    def _generate_single_parser(self, app_pipeline_id, group_id, config_id):
        """Generate the parer part"""
        config_info = self.__log_ingestion_svc.get_config_detail(config_id)
        return self._generate_parser_by_config_info(app_pipeline_id, group_id,
                                                    config_info)

    def _generate_parser_by_config_info(self, app_pipeline_id, group_id,
                                        config_info):
        parser_format = 'json'
        regex_content = ''
        if config_info['logType'] != LOGTYPE.JSON.value:
            parser_format = 'regex'
            regex_content = 'Regex       ' + config_info['regularExpression']
        time_key = ''
        time_format = ''
        if 'regularSpecs' in config_info and config_info['regularSpecs']:
            time_key = 'Time_Key    time'
            time_format = 'Time_Format ' + \
                self.__log_ingestion_svc._get_time_format(config_info.get('regularSpecs'))
        user_define_parser = self.__log_ingestion_svc._render_template(
            self._parser_template_path,
            LOGHUB_PARSER_NAME=self.__generate_ec2_parser_name(
                config_info['logType'], app_pipeline_id, group_id,
                config_info['id']),
            LOGHUB_PARSER_FORMAT=parser_format,
            LOGHUB_REGEX=regex_content,
            LOGHUB_TIME_KEY=time_key,
            LOGHUB_TIME_FORMAT=time_format,
        )
        return user_define_parser

    def generate_k8s_ns_and_svcacct_and_role(self,
                                             log_agent_role_arn: str,
                                             create_ns=True) -> str:
        """
        Generate namespace, service account, role and role-binding for fluent bit.
        """
        ns = ""
        if create_ns:
            ns = self.__log_ingestion_svc._render_template(
                self._k8s_name_space_template_path,
                LOGHUB_NAMESPACE=fluent_bit_eks_cluster_name_space,
            )
        svc_acct = self.__log_ingestion_svc._render_template(
            self._k8s_svc_account_template_path,
            LOGHUB_NAMESPACE=fluent_bit_eks_cluster_name_space,
            LOGHUB_EKS_FLUENT_BIT_ROLE_ARN=log_agent_role_arn,
        )
        role_and_role_binding = self.__log_ingestion_svc._render_template(
            self._k8s_role_binding_template_path,
            LOGHUB_NAMESPACE=fluent_bit_eks_cluster_name_space,
        )
        return ns + svc_acct + role_and_role_binding

    def generate_k8s_fluent_bit_multiline_filter(
            self, config_tag: str, multiline_parser_name: str) -> str:
        """
        Multiline parsing log parsing
        """
        return self.__log_ingestion_svc._render_template(
            self._k8s_user_defined_multiline_filter_template_path,
            LOGHUB_CONFIG_TAG=config_tag + '*',
            LOGHUB_MULTILINE_PARSER='multiline-' + multiline_parser_name,
        )

    def generate_k8s_fluent_bit_inout_and_filter(
            self,
            cri='docker',
            deployment_kind=DEPLOYMENTKIND.DAEMONSET.value,
            role_arn='',
            extra_metadata_suffix='',
            direct_aos=False) -> str:
        """ 
        parse fluent-bit-input-output-filter.template
        The parameters that need to be replaced are as follows:
            $LOGHUB_CONFIG_TAG
            $LOGHUB_CONFIG_PATH
            $LOGHUB_CONTAINER_PARSER=container_log_parser
            $LOGHUB_CHECKPOINT

            $LOGHUB_DOCKER_MODE_SWITCH
            $LOGHUB_DOCKER_MODE_PARSER

            $LOGHUB_CONFIG_REGION
            $LOGHUB_CONFIG_KDS_NAME

            $LOGHUB_USER_DEFINE_FILTER : 
                1.it will be replace the content of user defined filter template in the daemonset pattern 
                2.it will be replace '' in the sidecar pattern

            $LOGHUB_CONFIG_TAG_PREFIX
            $LOGHUB_MERGE_PARSER
        """
        config_tag = self.__config_id + '.' + self.__app_pipeline_id
        config_tag_prefix = 'loghub.' + config_tag + '.'
        config_checkpoint = '/var/fluent-bit/state/flb_container-' + config_tag + '.db'
        kds_paras = self.__log_ingestion_svc.get_app_pipeline(
            self.__app_pipeline_id).get('kdsParas')
        aos_paras = self.__log_ingestion_svc.get_app_pipeline(
            self.__app_pipeline_id).get('aosParas')

        # prepare parameters for docker and containerd
        docker_mode_switch = 'On'
        docker_mode_parser = ''
        multiline_filter = ''
        if self.__config_info['logType'] == LOGTYPE.MULTI_LINE_TEXT.value:
            container_log_parser = 'Multiline.parser    cri'
            key_name = 'log'
            docker_mode_parser = 'Docker_Mode_Parser  ' + self.__get_parser_name(
            ) + '.docker.firstline'
            # multiline_switch and loghub_parser are only for sidecar
            multiline_switch = 'On'
            loghub_parser = 'Parser_Firstline    ' + self.__get_parser_name()
            if self.__config_info[
                    'multilineLogParser'] == MULTILINELOGPARSER.JAVA_SPRING_BOOT.value:
                multiline_filter = self.generate_k8s_fluent_bit_multiline_filter(
                    config_tag_prefix + '*', self.__get_parser_name())
        else:
            key_name = 'message'
            container_log_parser = 'Parser              cri_regex'
            multiline_switch = 'Off'
            loghub_parser = 'Parser              ' + self.__get_parser_name()

        #Get Log Path from AppLogIngestion table. If it is null, it will be obtained from logConf table
        app_log_ingest_resp = app_log_ingestion_table.get_item(
            Key={'id': self.__log_ingestion_id})
        if 'Item' not in app_log_ingest_resp:
            raise APIException('App Log Ingestion item Not Found')
        app_log_ingestion_info = app_log_ingest_resp['Item']
        log_path = app_log_ingestion_info.get(
            "logPath", self.__config_info.get('logPath'))
        # Parser
        if deployment_kind == DEPLOYMENTKIND.DAEMONSET.value:

            if CRI.CONTAINERD.value == cri:
                docker_mode_switch = 'Off'
                docker_mode_parser = ''
            else:
                container_log_parser = 'Parser              docker'
                key_name = 'log'
                # For docker cri, it don't need multiline_filter
                multiline_filter = ''

            # DaemonSet pattern
            if not direct_aos:
                #direct to write the KDS
                input_and_output_filter = self.__log_ingestion_svc._render_template(
                    self._k8s_input_output_filter_daemonset_template_path,
                    LOGHUB_CONFIG_TAG=config_tag_prefix + '*',
                    LOGHUB_CONFIG_PATH=log_path,
                    LOGHUB_CONTAINER_PARSER=container_log_parser,
                    LOGHUB_CHECKPOINT=config_checkpoint,
                    LOGHUB_DOCKER_MODE_SWITCH=docker_mode_switch,
                    LOGHUB_DOCKER_MODE_PARSER=docker_mode_parser,
                    LOGHUB_CONFIG_REGION=kds_paras['regionName'],
                    LOGHUB_CONFIG_KDS_NAME=kds_paras['streamName'],
                    LOGHUB_FILTER_PARSER_KEY_NAME=key_name,
                    LOGHUB_PARSER_NAME=self.__get_parser_name(),
                    LOGHUB_FLUENT_BIT_MULTILINE_FILTER=multiline_filter,
                    LOGHUB_KDS_ROLE_ARN=role_arn,
                )
            else:
                #direct to write the AOS
                input_and_output_filter = self.__log_ingestion_svc._render_template(
                    self._k8s_input_output_filter_daemonset_aos_template_path,
                    LOGHUB_CONFIG_TAG=config_tag_prefix + '*',
                    LOGHUB_CONFIG_PATH=log_path,
                    LOGHUB_CONTAINER_PARSER=container_log_parser,
                    LOGHUB_CHECKPOINT=config_checkpoint,
                    LOGHUB_DOCKER_MODE_SWITCH=docker_mode_switch,
                    LOGHUB_DOCKER_MODE_PARSER=docker_mode_parser,
                    LOGHUB_CONFIG_REGION=default_region,
                    LOGHUB_AOS_ENDPOINT=aos_paras['opensearchEndpoint'],
                    LOGHUB_FILTER_PARSER_KEY_NAME=key_name,
                    LOGHUB_PARSER_NAME=self.__get_parser_name(),
                    LOGHUB_FLUENT_BIT_MULTILINE_FILTER=multiline_filter,
                    LOGHUB_EC2_ROLE_ARN=role_arn,
                    LOGHUB_AOS_IDX_PREFIX=aos_paras['indexPrefix'],
                )

        else:
            # sidecar pattern
            if not direct_aos:
                #direct to write the KDS
                input_and_output_filter = self.__log_ingestion_svc._render_template(
                    self._k8s_input_output_sidecar_template_path,
                    LOGHUB_CONFIG_TAG=config_tag_prefix + '*',
                    LOGHUB_CONFIG_PATH=log_path,
                    LOGHUB_CHECKPOINT=config_checkpoint,
                    LOGHUB_MULTILINE_SWITCH=multiline_switch,
                    LOGHUB_PARSER=loghub_parser,
                    LOGHUB_CONFIG_REGION=kds_paras['regionName'],
                    LOGHUB_CONFIG_KDS_NAME=kds_paras['streamName'],
                    LOGHUB_KDS_ROLE_ARN=role_arn,
                )
            else:
                #direct to write the AOS
                input_and_output_filter = self.__log_ingestion_svc._render_template(
                    self._k8s_input_output_sidecar_aos_template_path,
                    LOGHUB_CONFIG_TAG=config_tag_prefix + '*',
                    LOGHUB_CONFIG_PATH=log_path,
                    LOGHUB_CHECKPOINT=config_checkpoint,
                    LOGHUB_MULTILINE_SWITCH=multiline_switch,
                    LOGHUB_PARSER=loghub_parser,
                    LOGHUB_CONFIG_REGION=default_region,
                    LOGHUB_AOS_ENDPOINT=aos_paras['opensearchEndpoint'],
                    LOGHUB_EC2_ROLE_ARN=role_arn,
                    LOGHUB_AOS_IDX_PREFIX=aos_paras['indexPrefix'],
                )

        return input_and_output_filter

    def __get_parser_name(self) -> str:
        # If using regex from front-end, parser_name will be appended with config_id
        if self.__config_info['logType'] in LOGTYPE._value2member_map_:
            if 'multilineLogParser' in self.__config_info and self.__config_info[
                    'multilineLogParser'] in MULTILINELOGPARSER._value2member_map_:
                parser_name = self.__config_info['multilineLogParser'].lower(
                ) + '_' + self.__config_id
            else:
                parser_name = self.__config_info['logType'].lower(
                ) + '_' + self.__config_id
        else:
            parser_name = self.__config_info['logType'].lower()
        return parser_name

    def __generate_ec2_parser_name(self, log_type, app_pipeline_id, group_id,
                                   config_id) -> str:
        """
        generate the parser name for Fluent-bit in ec2
        """
        if log_type in LOGTYPE._value2member_map_:
            parser_name = log_type.lower() + '_' + app_pipeline_id.lower(
            ) + '_' + group_id.lower() + '_' + config_id.lower()
        else:
            parser_name = log_type.lower()
        return parser_name

    def generate_k8s_fluent_bit_user_defined_docker_firstline_parser(self):
        """
        parse fluent-bit-user-defined-docker-firstline-parser.template
        """
        if self.__config_info['logType'] == LOGTYPE.MULTI_LINE_TEXT.value:
            user_define_docker_firstline_parser = self.__log_ingestion_svc._render_template(
                self._k8s_user_defined_docker_firstline_parser_template_path,
                LOGHUB_PARSER_NAME=self.__get_parser_name(),
                LOGHUB_REGEX=self.__config_info['regularExpression'],
            )
            return user_define_docker_firstline_parser
        else:
            return ''

    def generate_k8s_fluent_bit_user_defined_parser(self):
        """
        parse fluent-bit-user-defined-parser.template
        """
        parser_format = 'json'
        regex_content = ''
        if self.__config_info['logType'] != LOGTYPE.JSON.value:
            parser_format = 'regex'
            regex_content = 'Regex       ' + self.__config_info[
                'regularExpression']
        time_key = ''
        time_format = ''
        if 'regularSpecs' in self.__config_info and self.__config_info[
                'regularSpecs']:
            time_key = 'Time_Key    time'
            time_format = 'Time_Format ' + \
                self.__log_ingestion_svc._get_time_format(self.__config_info.get('regularSpecs'))
        user_define_parser = self.__log_ingestion_svc._render_template(
            self._k8s_user_defined_parser_template_path,
            LOGHUB_PARSER_NAME=self.__get_parser_name(),
            LOGHUB_PARSER_FORMAT=parser_format,
            LOGHUB_REGEX=regex_content,
            LOGHUB_TIME_KEY=time_key,
            LOGHUB_TIME_FORMAT=time_format,
        )
        return user_define_parser

    def generate_k8s_fluent_bit_user_defined_multiline_parser(self):
        """
        parse fluent-bit-user-defined-multiline-parser.template
        """
        if self.__config_info[
                'logType'] == LOGTYPE.MULTI_LINE_TEXT.value and self.__config_info[
                    'multilineLogParser'] == MULTILINELOGPARSER.JAVA_SPRING_BOOT.value:
            return self.__log_ingestion_svc._render_template(
                self._k8s_user_defined_multiline_parser_template_path,
                LOGHUB_MULTILINE_PARSER_NAME='multiline-' +
                self.__get_parser_name(),
                LOGHUB_REGEX=self.__config_info['regularExpression'],
            )
        else:
            return ''

    def generate_k8s_configmap(self,
                               input_and_output_filter: str,
                               docker_firstline_parser: str,
                               user_define_parser: str,
                               user_define_multiline_parser: str,
                               deployment_kind=DEPLOYMENTKIND,
                               direct_aos=False) -> str:
        """
        parse fluent-bit-configmap.template
        """
        configmap_template_file = self._k8s_configmap_template_path
        if direct_aos:
            configmap_template_file = self._k8s_configmap_aos_template_path
        if deployment_kind.value == DEPLOYMENTKIND.DAEMONSET.value:
            k8s_filter = self.__log_ingestion_svc._render_template(
                self._k8s_fluent_bit_k8s_filter_template_path)
        else:
            k8s_filter = ""

        configmap = self.__log_ingestion_svc._render_template(
            configmap_template_file,
            LOGHUB_NAMESPACE=fluent_bit_eks_cluster_name_space,
            LOGHUB_FLUENT_BIT_INPUT_OUTPUT_FILTER=input_and_output_filter,
            LOGHUB_USER_DEFINE_DOCKER_FIRSTLINE_PARSER=docker_firstline_parser,
            LOGHUB_USER_DEFINE_PARSER=user_define_parser,
            LOGHUB_USER_DEFINE_MULTILINE_PARSER=user_define_multiline_parser,
            LOGHUB_FLUENT_BIT_K8S_FILTER=k8s_filter,
        )

        return configmap

    def generate_k8s_daemonset_config(self, eks_cluster_name) -> str:
        """
        parse fluent-bit-daemonset.template
        """
        daemonset = self.__log_ingestion_svc._render_template(
            self._k8s_daemonset_template_path,
            LOGHUB_NAMESPACE=fluent_bit_eks_cluster_name_space,
            LOGHUB_FLUENT_BIT_IMAGE=fluent_bit_image,
            LOGHUB_EKS_CLUSTER_NAME=eks_cluster_name,
        )
        return daemonset

    def generate_k8s_sidecar_config(self, eks_cluster_name) -> str:
        """
        parse fluent-bit-sidecar.template
        """
        # example: replace "/var/nginx/access.log" to "/var/nginx"
        #Get Log Path from AppLogIngestion table. If it is null, it will be obtained from logConf table
        app_log_ingest_resp = app_log_ingestion_table.get_item(
            Key={'id': self.__log_ingestion_id})
        if 'Item' not in app_log_ingest_resp:
            raise APIException('App Log Ingestion item Not Found')
        app_log_ingestion_info = app_log_ingest_resp['Item']
        log_path = app_log_ingestion_info.get(
            "logPath", self.__config_info.get('logPath'))

        file_path = log_path.split('/')
        file_name = file_path[-1]
        log_path = log_path.replace('/' + file_name, '')

        sidcar = self.__log_ingestion_svc._render_template(
            self._k8s_sidecar_template_path,
            LOGHUB_NAMESPACE=fluent_bit_eks_cluster_name_space,
            LOGHUB_FLUENT_BIT_IMAGE=fluent_bit_image,
            LOGHUB_EKS_CLUSTER_NAME=eks_cluster_name,
            LOGHUB_LOG_PATH=log_path,
        )
        return sidcar

    def agent_health_check(self, instance_id_set):
        unsuccessful_instances = set()
        try:
            response = self._ssm.send_command(
                InstanceIds=list(instance_id_set),
                DocumentName="AWS-RunShellScript",
                Parameters={
                    'commands':
                    ['curl -s http://127.0.0.1:2022/api/v1/health']
                },
            )
            command_id = response['Command']['CommandId']
        except Exception as e:
            logger.error(e)
            return unsuccessful_instances
        time.sleep(self._health_check_retry_interval)
        for instance_id in instance_id_set:
            try:
                output = self._ssm.get_command_invocation(
                    CommandId=command_id,
                    InstanceId=instance_id,
                )
                if (len(output['StandardOutputContent']) > 0) and (
                        'fluent-bit' in output['StandardOutputContent']):
                    continue
                else:
                    unsuccessful_instances.add(instance_id)
            except Exception as e:
                logger.error(e)
                return unsuccessful_instances
        return unsuccessful_instances


class FluentDS3(AgentType):
    """An implementation of AgentType for FluentD Agent and using S3 as Log Source"""
    __log_ingestion_svc: LogIngestionSvc
    _health_check_retry_interval = 3  # secs

    _service_template_path = './util/fluentd_s3_template/log-agent-service.template'
    _input_template_path = './util/fluentd_s3_template/log-agent-input.template'
    _output_template_path = './util/fluentd_s3_template/log-agent-output.template'
    _cross_account_kds_template_path = './util/fluentd_s3_template/log-agent-cross-account-kds.template'
    _regex_parser_template_path = './util/fluentd_s3_template/log-agent-parser-regex.template'
    _json_parser_template_path = './util/fluentd_s3_template/log-agent-parser-json.template'

    _log_source_table = s3_log_source_table

    def __init__(self,
                 group_id="",
                 config_id="",
                 app_pipeline_id="",
                 log_ingestion_id="",
                 is_multiline=False):
        self.__source_id = group_id  # Using group_id as source_id for fluentd in S3
        self.__config_id = config_id
        self.__app_pipeline_id = app_pipeline_id
        self.__log_ingestion_id = log_ingestion_id
        self.__is_multiline = is_multiline

        self.__account_id = account_id
        self.__region = default_region

        if self.__source_id:
            s3_log_source = s3_log_source_table.get_item(
                Key={'id': self.__source_id})['Item']
            self.__account_id = s3_log_source.get('accountId', account_id)
            self.__region = s3_log_source.get('region', default_region)

            svcMgr = SvcManager()
            self.__role_session_name = svcMgr.role_session_name
            s3 = svcMgr.get_client(sub_account_id=self.__account_id,
                                   service_name='s3',
                                   type=Boto3API.RESOURCE,
                                   region=self.__region)

            link_account = svcMgr.get_link_account(
                sub_account_id=self.__account_id, region=self.__region)
            if link_account:
                bucket_name = link_account['subAccountBucketName']
            else:
                bucket_name = config_file_s3_bucket_name

            self._s3_bucket = s3.Bucket(bucket_name)
            self._ssm = svcMgr.get_client(sub_account_id=self.__account_id,
                                          service_name='ssm',
                                          type=Boto3API.CLIENT,
                                          region=self.__region)

        self.__log_ingestion_svc = LogIngestionSvc(self.__account_id,
                                                   self.__region)

    def create_ingestion_parser(self):
        # FluentD in S3 Source case doesn't need Parser configuration.
        pass

    def create_ingestion(self):
        self._generate_conf_with_init_member()
        self.__log_ingestion_svc.upload_folder_to_s3(self._s3_bucket,
                                                     "/tmp/log_config",
                                                     "app_log_config")

    def delete_ingestion(self):
        # FluentD in S3 Source case doesn't need to delete ingestion.
        # The instance will be deleted by the auto scaling group.
        pass

    def _generate_conf_with_init_member(self):
        self._generate_conf(source_id=self.__source_id,
                            config_id=self.__config_id,
                            app_pipeline_id=self.__app_pipeline_id,
                            is_multiline=self.__is_multiline)

    def _generate_conf(self,
                       source_id,
                       config_id,
                       app_pipeline_id='',
                       is_multiline=False):

        app_pipeline_info = self.__log_ingestion_svc.get_app_pipeline(
            app_pipeline_id)
        kds_paras = app_pipeline_info['kdsParas']
        source_info = self._get_source_detail(source_id)
        config_tag = config_id + '_' + app_pipeline_id

        file_data = ""
        # Append the SERVICE part in the config file
        with open(self._service_template_path) as openFile:
            config_service = openFile.read()
        file_data += config_service
        file_data += '\n'

        file_data += self._generate_input(config_tag, source_info)

        file_data += self._generate_output(
            config_tag, kds_paras, app_pipeline_info.get('kdsRoleArn', ''))

        folder_path = '/tmp/log_config/' + source_id
        if not os.path.exists(folder_path):
            os.makedirs(folder_path)
        updated_config_path = folder_path + '/td-agent.conf'
        tmp_file = open(updated_config_path, "w")
        tmp_file.write(file_data)
        tmp_file.close()

    def _generate_parser(self):
        """Generate the parser config"""
        file_data = ""
        file_data += self._generate_single_parser_with_init_member()

        return file_data

    def _generate_single_parser_with_init_member(self):
        return self._generate_single_parser(self.__config_id)

    def _generate_single_parser(self, config_id):
        """Generate the parer part"""
        config_info = self.__log_ingestion_svc.get_config_detail(config_id)
        parser_data = ""
        if config_info[
                'logType'] in S3CUSTOMIZEREGEXLOGTYPE._value2member_map_:
            with open(self._regex_parser_template_path, "r") as openFile:
                for line in openFile:
                    line = line.replace("LOGHUB_REGEX", config_info['regularExpression']) \
                        .replace("$LOGHUB_TIME_FORMAT",
                                 self.__log_ingestion_svc._get_time_format(config_info.get('regularSpecs', [])))
                    parser_data += line
        elif config_info['logType'] in S3PRESETLOGTYPE._value2member_map_:
            if config_info['logType'] == S3PRESETLOGTYPE.JSON.value:
                with open(self._json_parser_template_path, "r") as openFile:
                    # If there is no time field in the raw log
                    # format will be empty, and fluend will use system time
                    for line in openFile:
                        line = line.replace(
                            "$LOGHUB_TIME_FORMAT",
                            self.__log_ingestion_svc._get_time_format(
                                config_info.get('regularSpecs', [])))
                        parser_data += line
            elif config_info['logType'] == S3PRESETLOGTYPE.CSV.value:
                pass
        parser_data += '\n'
        return parser_data

    def _generate_output(self, config_tag, kds_paras, kds_role_arn):
        """Generate the output part"""
        #_cross_account_kds_template_path
        if kds_role_arn:
            cross_acct_kds_data = self.__log_ingestion_svc._render_template(
                self._cross_account_kds_template_path,
                ROLE_ARN=kds_role_arn,
                ROLE_SESSION_NAME=self.__role_session_name)
        else:
            cross_acct_kds_data = ''

        output_data = self.__log_ingestion_svc._render_template(
            self._output_template_path,
            LOGHUB_CONFIG_TAG=config_tag,
            LOGHUB_CONFIG_KDS_ROLE=cross_acct_kds_data)

        output_data += '\n'

        return output_data

    def _generate_input(self, config_tag, source_info):
        """Generate the input part"""
        input_data = ""

        # LOGHUB_CONFIG_SQS_NAME will be updated by the EC2 UserData
        with open(self._input_template_path, "r") as openFile:
            for line in openFile:
                line = line.replace("LOGHUB_CONFIG_TAG", config_tag) \
                    .replace("LOGHUB_CONFIG_S3_NAME", source_info['s3Name']) \
                    .replace("LOGHUB_CONFIG_S3_REGION", source_info['region']) \
                    .replace("LOGHUB_CONFIG_ARCHIVE_FORMAT", source_info['archiveFormat'])
                input_data += line

        _parser = self._generate_parser()
        input_data += _parser
        input_data += '</source> \n\n'
        return input_data

    def _get_source_detail(self, source_id):
        response = self._log_source_table.get_item(Key={'id': source_id})
        if 'Item' not in response:
            raise APIException('S3 Log Source Not Found')

        return response['Item']

    def agent_health_check(self, instance_id_set):
        unsuccessful_instances = set()
        # Wait for another interval for fluentd restart
        time.sleep(self._health_check_retry_interval)
        try:
            response = self._ssm.send_command(
                InstanceIds=list(instance_id_set),
                DocumentName="AWS-RunShellScript",
                Parameters={
                    'commands':
                    ['curl -s http://localhost:24220/api/plugins.json']
                },
            )
            command_id = response['Command']['CommandId']
        except Exception as e:
            logger.error(e)
            return unsuccessful_instances
        time.sleep(self._health_check_retry_interval)
        for instance_id in instance_id_set:
            try:
                output = self._ssm.get_command_invocation(
                    CommandId=command_id,
                    InstanceId=instance_id,
                )
                if (len(output['StandardOutputContent']) >
                        0) and ('plugins' in output['StandardOutputContent']):
                    continue
                else:
                    unsuccessful_instances.add(instance_id)
            except Exception as e:
                logger.error(e)
                return unsuccessful_instances
        return unsuccessful_instances


def fwrite(filename: str, s: str):
    with open(filename, 'w') as fp:
        fp.write(s)


def fread(filename: str) -> str:
    with open(filename, 'r') as fp:
        return fp.read()
