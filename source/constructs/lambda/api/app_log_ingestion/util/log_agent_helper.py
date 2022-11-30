# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import logging
import os
import sys
import time
from string import Template

import boto3
from botocore import config

from util.agent_type import AgentType
from util.aws_svc_mgr import Boto3API, SvcManager
from util.exception import APIException
from util.log_ingestion_svc import LogIngestionSvc
from util.sys_enum_type import (
    CRI,
    DEPLOYMENTKIND,
    LOGTYPE,
    MULTILINELOGPARSER,
    S3CUSTOMIZEREGEXLOGTYPE,
    S3PRESETLOGTYPE,
)

logger = logging.getLogger()
logger.setLevel(logging.INFO)

solution = os.environ.get("SOLUTION",
                          "SO8025/" + os.environ["SOLUTION_VERSION"])
user_agent_config = {"user_agent_extra": f"AwsSolution/{solution}"}
default_config = config.Config(**user_agent_config)
default_region = os.environ.get("AWS_REGION")
# Get S3 resource
config_file_s3_bucket_name = os.environ.get("CONFIG_FILE_S3_BUCKET_NAME")

# Get Lambda resource
awslambda = boto3.client("lambda", config=default_config)
iam = boto3.client("iam", config=default_config)

# Get DDB resource.
dynamodb = boto3.resource("dynamodb", config=default_config)
instance_meta_table_name = os.environ.get("INSTANCE_META_TABLE_NAME")
app_pipeline_table_name = os.environ.get("APP_PIPELINE_TABLE_NAME")
app_log_config_table_name = os.environ.get("APP_LOG_CONFIG_TABLE_NAME")
instance_group_table_name = os.environ.get("INSTANCE_GROUP_TABLE_NAME")
app_log_ingestion_table_name = os.environ.get("APPLOGINGESTION_TABLE")
ec2_log_source_table_name = os.environ.get("EC2_LOG_SOURCE_TABLE_NAME")
s3_log_source_table_name = os.environ.get("S3_LOG_SOURCE_TABLE_NAME")

instance_meta_table = dynamodb.Table(instance_meta_table_name)
app_pipeline_table = dynamodb.Table(app_pipeline_table_name)
app_log_config_table = dynamodb.Table(app_log_config_table_name)
instance_group_table = dynamodb.Table(instance_group_table_name)
app_log_ingestion_table = dynamodb.Table(app_log_ingestion_table_name)
ec2_log_source_table = dynamodb.Table(ec2_log_source_table_name)
s3_log_source_table = dynamodb.Table(s3_log_source_table_name)

# k8s parameters
fluent_bit_image = os.environ.get(
    "FLUENT_BIT_IMAGE",
    "public.ecr.aws/aws-observability/aws-for-fluent-bit:2.28.4")
fluent_bit_eks_cluster_name_space = os.environ.get(
    "FLUENT_BIT_EKS_CLUSTER_NAME_SPACE", "logging")
container_log_path = os.environ.get("CONTAINER_LOG_PATH",
                                    "/var/log/containers/")

FB_FILTER_UNIFORM_TIME_FORMAT = """\
[FILTER]
    Name    lua
    Match   *
    time_as_table   on
    script  uniform-time-format.lua
    call    cb_print
"""

sts = boto3.client("sts", config=default_config)
account_id = sts.get_caller_identity()["Account"]


class IngestionTask:

    def __init__(self,
                 agent_type: str,
                 group_id: str,
                 config_id: str,
                 app_pipeline_id: str,
                 log_ingestion_id: str,
                 is_multiline: bool = False,
                 time_key: str = "time",
                 instance_id=str) -> None:
        # try to find a mapping class
        if agent := getattr(sys.modules[__name__], agent_type, None):
            self._agent = agent(
                group_id,
                config_id,
                app_pipeline_id,
                log_ingestion_id,
                is_multiline,
                time_key,
                instance_id,
            )
        else:
            raise RuntimeError(f"Unknown Type {agent_type}")

    def create_ingestion(self):
        self._agent.create_ingestion_parser()
        self._agent.create_ingestion()

    def create_ingestion_to_added_instance(self):
        self._agent.create_ingestion_parser()
        self._agent.create_ingestion_to_added_instance()

    def create_ingestion_to_auto_scaling_group(self):
        self._agent.create_ingestion_parser()
        self._agent.create_ingestion_to_auto_scaling_group()

    def delete_ingestion(self):
        self._agent.delete_ingestion()

    def delete_ingestion_for_deleted_instance(self):
        self._agent.delete_ingestion_for_deleted_instance()

    def delete_ingestion_from_auto_scaling_group(self):
        self._agent.delete_ingestion_from_auto_scaling_group()


class FluentBit(AgentType):
    """An implementation of AgentType for Fluent Bit Agent"""

    _health_check_retry_interval = 2  # secs

    _service_template_path = "./util/fluentbit_template/log-agent-service.template"
    _input_template_path = "./util/fluentbit_template/log-agent-input.template"
    _input_multiline_template_path = (
        "./util/fluentbit_template/log-agent-input-multiline.template")
    _output_template_path = "./util/fluentbit_template/log-agent-output.template"
    _system_parser_template_path = (
        "./util/fluentbit_template/log-agent-system-parser.template")
    _parser_template_path = "./util/fluentbit_template/log-agent-parser.template"
    _uniform_time_format_lua = "./util/fluentbit_template/uniform-time-format.lua"
    _filter_template_path = "./util/fluentbit_template/log-agent-grep-filter.template"

    # k8s Fluent Bit
    _k8s_input_output_filter_daemonset_template_path = "./util/eks_cluster_pod_template/fluent-bit-input-output-filter-daemonset.template.yaml"
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
    # _k8s_input_output_filter_daemonset_aos_template_path = "./util/eks_cluster_pod_template/fluent-bit-input-output-filter-daemonset-aos.template.yaml"
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
    _k8s_input_output_sidecar_template_path = (
        "./util/eks_cluster_pod_template/fluent-bit-input-output-sidecar.template.yaml"
    )
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
    # _k8s_input_output_sidecar_aos_template_path = "./util/eks_cluster_pod_template/fluent-bit-input-output-sidecar-aos.template.yaml"
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

    _k8s_configmap_template_path = (
        "./util/eks_cluster_pod_template/fluent-bit-configmap.template.yaml")
    """
    Both daemonset and sidecar are required for configmap.
    The parameters that need to be replaced are as follows:
    $NAMESPACE=fluent_bit_eks_cluster_name_space
    $FLUENT_BIT_INPUT_OUTPUT_FILTER=_k8s_input_output_filter_template_template_path
    $USER_DEFINE_PARSER=_k8s_user_define_parser_template_path
    """

    # _k8s_configmap_aos_template_path = (
    #     "./util/eks_cluster_pod_template/fluent-bit-configmap-aos.template.yaml"
    # )
    """
    Both daemonset and sidecar are required for configmap.
    The parameters that need to be replaced are as follows:
    $NAMESPACE=fluent_bit_eks_cluster_name_space
    $FLUENT_BIT_INPUT_OUTPUT_FILTER=_k8s_input_output_filter_template_template_path
    $USER_DEFINE_PARSER=_k8s_user_define_parser_template_path
    """

    _k8s_user_defined_multiline_filter_template_path = "./util/eks_cluster_pod_template/fluent-bit-user-defined-multiline-filter.template.yaml"
    """
    The parameters that need to be replaced are as follows:
    $LOGHUB_CONFIG_TAG
    $LOGHUB_MULTILINE_PARSER
    """
    _k8s_user_defined_docker_firstline_parser_template_path = "./util/eks_cluster_pod_template/fluent-bit-user-defined-docker-firstline-parser.template.yaml"
    """
    The parameters are only for docker runtime interface
    $LOGHUB_PARSER_NAME
    $LOGHUB_REGEX
    """
    _k8s_user_defined_parser_template_path = (
        "./util/eks_cluster_pod_template/fluent-bit-user-defined-parser.template.yaml"
    )
    """
    Both daemonset and sidecar are required for configmap.
    The parameters that need to be replaced are as follows:
    $LOGHUB_PARSER_NAME
    $LOGHUB_PARSER_FORMAT
    $LOGHUB_TIME_KEY
    $LOGHUB_TIME_FORMAT
    """
    _k8s_user_defined_multiline_parser_template_path = "./util/eks_cluster_pod_template/fluent-bit-user-defined-multiline-parser.template.yaml"
    """
    Both daemonset and sidecar are required for configmap.
    The parameters that need to be replaced are as follows:
    $LOGHUB_MULTILINE_PARSER_NAME
    $LOGHUB_PARSER_FORMAT
    $LOGHUB_TIME_KEY
    $LOGHUB_TIME_FORMAT
    """
    _k8s_daemonset_template_path = (
        "./util/eks_cluster_pod_template/fluent-bit-daemonset.template.")
    """
    $NAMESPACE=fluent_bit_eks_cluster_name_space
    $FLUENT_BIT_IMAGE=fluent_bit_image
    $EKS_CLUSTER_NAME
    """
    _k8s_role_binding_template_path = (
        "./util/eks_cluster_pod_template/fluent-bit-role-binding.template.yaml"
    )
    """
    Both daemonset and sidecar are required for role binding.
    The parameters that need to be replaced are as follows:
    $NAMESPACE=fluent_bit_eks_cluster_name_space
    """
    _k8s_svc_account_template_path = (
        "./util/eks_cluster_pod_template/fluent-bit-service-account.template.yaml"
    )
    """
    Both daemonset and sidecar are required for svc account.
    The parameters that need to be replaced are as follows:
    $NAMESPACE=fluent_bit_eks_cluster_name_space
    $EKS_FLUENT_BIT_ROLE_ARN
    
    """
    _k8s_sidecar_template_path = (
        "./util/eks_cluster_pod_template/fluent-bit-sidecar.template.yaml")
    """
    The parameters that need to be replaced are as follows:
    $FLUENT_BIT_IMAGE=fluent_bit_image
    $EKS_CLUSTER_NAME
    """
    _k8s_name_space_template_path = (
        "./util/eks_cluster_pod_template/fluent-bit-namespace.template.yaml")
    """
    Both daemonset and sidecar are required for svc account. BTW, Sidecar pattern needs to prompt the user to replace the namespace.
    The parameters that need to be replaced are as follows:
    $NAMESPACE=fluent_bit_eks_cluster_name_space
    """

    _k8s_fluent_bit_k8s_filter_template_path = (
        "./util/eks_cluster_pod_template/fluent-bit-k8s-filter.yaml")
    """
    eks output template
    """
    _fluent_bit_output = {
        "eks_fluent_bit_output_s3_template_path":
        "./util/eks_cluster_pod_template/fluent-bit-output-s3.template.yaml",
        "eks_fluent_bit_output_kds_template_path":
        "./util/eks_cluster_pod_template/fluent-bit-output-kds.template.yaml",
        "eks_fluent_bit_output_aos_template_path":
        "./util/eks_cluster_pod_template/fluent-bit-output-aos.template.yaml",
        "eks_fluent_bit_output_msk_template_path":
        "./util/eks_cluster_pod_template/fluent-bit-output-msk.template.yaml",
        "ec2_fluent_bit_output_s3_template_path":
        "./util/fluentbit_template/fluent-bit-output-s3.template.yaml",
        "ec2_fluent_bit_output_kds_template_path":
        "./util/fluentbit_template/fluent-bit-output-kds.template.yaml",
        "ec2_fluent_bit_output_aos_template_path":
        "./util/fluentbit_template/fluent-bit-output-aos.template.yaml",
        "ec2_fluent_bit_output_msk_template_path":
        "./util/fluentbit_template/fluent-bit-output-msk.template.yaml"
    }

    _k8s_fluent_bit_grep_filter_template_path = (
        "./util/eks_cluster_pod_template/fluent-bit-grep-filter.template.yaml")
    """
    The parameters that need to be replaced are as follows:
    $LOGHUB_CONFIG_TAG
    $LOGHUB_FILTER_CONDITION
    $LOGHUB_FILTER_KEY
    $LOGHUB_FILTER_VALUE
    """

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
                 is_multiline=False,
                 time_key="time",
                 instance_id=""):
        self.__group_id = group_id
        self.__config_id = config_id
        self.__app_pipeline_id = app_pipeline_id
        self.__log_ingestion_id = log_ingestion_id
        self.__is_multiline = is_multiline
        self.__account_id = account_id
        self.__region = default_region
        self._time_key = time_key
        self.__instance_id = instance_id

        if group_id:
            group = instance_group_table.get_item(Key={"id": group_id})["Item"]
            self.__account_id = group.get("accountId", account_id)
            self.__region = group.get("region", default_region)

            svcMgr = SvcManager()
            s3 = svcMgr.get_client(
                sub_account_id=self.__account_id,
                service_name="s3",
                type=Boto3API.RESOURCE,
                region=self.__region,
            )
            link_account = svcMgr.get_link_account(
                sub_account_id=self.__account_id, region=self.__region)
            if link_account:
                bucket_name = link_account["subAccountBucketName"]
            else:
                bucket_name = config_file_s3_bucket_name
            self._s3_bucket = s3.Bucket(bucket_name)
            self._ssm = svcMgr.get_client(
                sub_account_id=self.__account_id,
                service_name="ssm",
                type=Boto3API.CLIENT,
                region=self.__region,
            )
        self.__log_ingestion_svc = LogIngestionSvc(self.__account_id,
                                                   self.__region)
        if config_id == "":
            self.__config_info = {}
        else:
            self.__config_info = self.__log_ingestion_svc.get_config_detail(
                config_id=self.__config_id)
        if app_pipeline_id == "":
            self.__app_pipeline_info = {}
        else:
            self.__app_pipeline_info = self.__log_ingestion_svc.get_app_pipeline(
                app_pipeline_id)

    @classmethod
    def get_fluent_bit_instance(cls, config_id: str, app_pipeline_id: str,
                                log_ingestion_id: str):
        return cls(
            group_id="",
            config_id=config_id,
            app_pipeline_id=app_pipeline_id,
            log_ingestion_id=log_ingestion_id,
            is_multiline=True,
        )

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
        self.__log_ingestion_svc.upload_config_to_ec2(
            self,
            self.__group_id,
            self.__log_ingestion_id,
            self.__config_id,
            self.__app_pipeline_id,
        )

    def create_ingestion_to_added_instance(self):
        """
        involve new instance into ingestions
        """
        self._generate_conf_with_init_member_for_single_instance()
        self.__log_ingestion_svc.upload_folder_to_s3(self._s3_bucket,
                                                     "/tmp/log_config",
                                                     "app_log_config")  # 上传至s3
        self.__log_ingestion_svc.upload_config_to_single_modified_ec2(
            self,
            self.__group_id,
            self.__instance_id,
            self.__log_ingestion_id,
            self.__config_id,
            self.__app_pipeline_id,
        )  # 根据instance下发

    def create_ingestion_to_auto_scaling_group(self):
        """
        generate ASG fluent-bit.conf
        """
        self._generate_conf_with_init_member()
        self.__log_ingestion_svc.upload_folder_to_s3(self._s3_bucket,
                                                     "/tmp/log_config",
                                                     "app_log_config")
        self.__log_ingestion_svc.upload_config_info_to_instance_meta_table(
            self,
            self.__group_id,
            self.__log_ingestion_id,
            self.__config_id,
            self.__app_pipeline_id,
        )

    def delete_ingestion_for_deleted_instance(self):
        """
        inactivate instances from instamce_meta
        """
        # update the instance meta table
        self.__log_ingestion_svc.deactivate_new_deleted_instances(
            self.__instance_id, self.__group_id)
        # generate_config_again
        self._generate_conf_for_single_instance(
            self.__group_id,
            self.__instance_id,
            is_multiline=self.__is_multiline)
        # send to the instances
        self.__log_ingestion_svc.upload_folder_to_s3(self._s3_bucket,
                                                     "/tmp/log_config",
                                                     "app_log_config")
        self.__log_ingestion_svc.upload_config_to_single_modified_ec2(
            self,
            self.__group_id,
            self.__instance_id,
        )  # 根据instance下发

    def delete_ingestion_from_auto_scaling_group(self):
        # update the instance meta table
        ids = self.__log_ingestion_svc.get_instance_meta_id(
            self.__log_ingestion_id)
        for id in ids:
            instance_meta_table.update_item(
                Key={"id": id},
                UpdateExpression="SET #status = :s",
                ExpressionAttributeNames={
                    "#status": "status",
                },
                ExpressionAttributeValues={
                    ":s": "INACTIVE",
                },
            )
        # generate_config_again
        response = app_log_ingestion_table.get_item(
            Key={"id": self.__log_ingestion_id})
        if "Item" not in response:
            raise APIException("App Log Ingestion item Not Found")
        group_id = response["Item"].get("groupId",
                                        response["Item"].get("sourceId"))
        self._generate_conf(group_id, is_multiline=self.__is_multiline)

        # upload to s3
        self.__log_ingestion_svc.upload_folder_to_s3(self._s3_bucket,
                                                     "/tmp/log_config",
                                                     "app_log_config")
        self.__log_ingestion_svc.upload_config_info_to_instance_meta_table(
            self,
            self.__group_id,
            self.__log_ingestion_id,
            self.__config_id,
            self.__app_pipeline_id,
        )

    def delete_ingestion(self):
        # update the instance meta table
        ids = self.__log_ingestion_svc.get_instance_meta_id(
            self.__log_ingestion_id)
        for id in ids:
            instance_meta_table.update_item(
                Key={"id": id},
                UpdateExpression="SET #status = :s",
                ExpressionAttributeNames={
                    "#status": "status",
                },
                ExpressionAttributeValues={
                    ":s": "INACTIVE",
                },
            )
        # generate_config_again
        response = app_log_ingestion_table.get_item(
            Key={"id": self.__log_ingestion_id})
        if "Item" not in response:
            raise APIException("App Log Ingestion item Not Found")
        group_id = response["Item"].get("groupId",
                                        response["Item"].get("sourceId"))
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
            if self.__config_id != "":
                # Append the new parser in the parser config file
                file_data += (self._generate_single_parser(
                    self.__app_pipeline_id, self.__group_id, self.__config_id)
                              + "\n")

                config_info = self.__log_ingestion_svc.get_config_detail(
                    self.__config_id)
                file_data += (self.__log_ingestion_svc._render_template(
                    self._system_parser_template_path,
                    LOGHUB_TIME_FORMAT=self.__log_ingestion_svc.
                    _get_time_format(config_info.get("regularSpecs", [])),
                ) + "\n")
            else:
                file_data += (self.__log_ingestion_svc._render_template(
                    self._system_parser_template_path, LOGHUB_TIME_FORMAT='""')
                              + "\n")

            # Append the history parser
            mapping_history = self.__log_ingestion_svc.get_instance_history_mapping(
                instance_id)
            for mapping in mapping_history:
                if mapping["status"] == "INACTIVE":
                    continue
                file_data += self._generate_single_parser(
                    mapping["appPipelineId"], mapping["groupId"],
                    mapping["confId"])

            folder_path = "/tmp/log_config/" + instance_id
            if not os.path.exists(folder_path):
                os.makedirs(folder_path)
            updated_config_path = folder_path + "/applog_parsers.conf"
            tmp_file = open(updated_config_path, "w")
            tmp_file.write(file_data)
            tmp_file.close()

    def _generate_conf_with_init_member(self):
        """Used by EC2"""
        self._generate_conf(
            group_id=self.__group_id,
            config_id=self.__config_id,
            app_pipeline_id=self.__app_pipeline_id,
            is_multiline=self.__is_multiline,
        )

    def _generate_conf_with_init_member_for_single_instance(self):
        """Used by EC2"""
        self._generate_conf_for_single_instance(
            group_id=self.__group_id,
            instance_id=self.__instance_id,
            config_id=self.__config_id,
            app_pipeline_id=self.__app_pipeline_id,
            is_multiline=self.__is_multiline,
        )

    def _generate_conf(self,
                       group_id,
                       config_id="",
                       app_pipeline_id="",
                       is_multiline=False):
        """Used by EC2"""

        instance_ids = self.__log_ingestion_svc.get_instances(group_id)

        for instance_id in instance_ids:

            file_data = ""
            # Append the SERVICE part in the config file
            with open(self._service_template_path) as openFile:
                config_service = openFile.read()
            file_data += config_service
            file_data += "\n"

            if config_id != "":
                # Append the new config pair in the config file
                file_data += self._generate_conf_input_output_pair(
                    config_id,
                    app_pipeline_id,
                    self.__log_ingestion_id,
                    group_id,
                    is_multiline,
                )

            # Append the history config pairs
            mapping_history = self.__log_ingestion_svc.get_instance_history_mapping(
                instance_id)
            for mapping in mapping_history:
                if mapping["status"] == "INACTIVE":
                    continue
                file_data += self._generate_conf_input_output_pair(
                    mapping["confId"],
                    mapping["appPipelineId"],
                    mapping["logIngestionId"],
                    mapping["groupId"],
                    is_multiline,
                )

            folder_path = "/tmp/log_config/" + instance_id
            if not os.path.exists(folder_path):
                os.makedirs(folder_path)
            updated_config_path = folder_path + "/fluent-bit.conf"
            tmp_file = open(updated_config_path, "w")
            tmp_file.write(file_data)
            tmp_file.close()

            s = Template(fread(self._uniform_time_format_lua)).safe_substitute(
                TIME_KEY=(self._time_key or "time"))
            fwrite(f"{folder_path}/uniform-time-format.lua", s)

    def _generate_conf_for_single_instance(self,
                                           group_id="",
                                           instance_id="",
                                           config_id="",
                                           app_pipeline_id="",
                                           is_multiline=False):
        """Used by EC2"""

        file_data = ""
        # Append the SERVICE part in the config file
        with open(self._service_template_path) as openFile:
            config_service = openFile.read()
        file_data += config_service
        file_data += "\n"

        if config_id != "":
            # Append the new config pair in the config file
            file_data += self._generate_conf_input_output_pair(
                config_id,
                app_pipeline_id,
                self.__log_ingestion_id,
                group_id,
                is_multiline,
            )

        # Append the history config pairs
        mapping_history = self.__log_ingestion_svc.get_instance_history_mapping(
            instance_id)
        for mapping in mapping_history:
            if mapping["status"] == "INACTIVE":
                continue
            file_data += self._generate_conf_input_output_pair(
                mapping["confId"],
                mapping["appPipelineId"],
                mapping["logIngestionId"],
                mapping["groupId"],
                is_multiline,
            )

        folder_path = "/tmp/log_config/" + instance_id
        if not os.path.exists(folder_path):
            os.makedirs(folder_path)
        updated_config_path = folder_path + "/fluent-bit.conf"
        tmp_file = open(updated_config_path, "w")
        tmp_file.write(file_data)
        tmp_file.close()

        s = Template(fread(self._uniform_time_format_lua)).safe_substitute(
            TIME_KEY=(self._time_key or "time"))
        fwrite(f"{folder_path}/uniform-time-format.lua", s)

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

        config_tag = config_id + "_" + app_pipeline_id
        config_checkpoint = "/tmp/checkpoint-" + config_tag + ".db"
        parser_name = self.__generate_ec2_parser_name(config_info["logType"],
                                                      app_pipeline_id,
                                                      group_id, config_id)

        # Get Log Path from AppLogIngestion table. If it is null, it will be obtained from logConf table
        app_log_ingest_resp = app_log_ingestion_table.get_item(
            Key={"id": log_ingestion_id})
        if "Item" not in app_log_ingest_resp:
            raise APIException("App Log Ingestion item Not Found")
        app_log_ingestion_info = app_log_ingest_resp["Item"]
        log_path = app_log_ingestion_info.get("logPath",
                                              config_info.get("logPath"))
        file_data = ""
        if is_multiline:
            file_data += self._generate_input_multiline(
                log_path, config_tag, config_checkpoint, parser_name)
        else:
            file_data += self._generate_input(log_path, config_tag,
                                              config_checkpoint, parser_name)

        file_data += self._generate_conf_filter(config_info,
                                                config_tag,
                                                type="FluentBit")

        # ARN of an IAM role to assume (for cross account access)
        role_arn = app_pipeline_info.get("bufferAccessRoleArn", "")

        file_data += self._generate_output(
            app_pipeline_info,
            config_tag,
            default_region,
            role_arn,
            time_key=config_info.get("timeKey", 'time'),
            type="EC2",
        )
        return file_data

    def _generate_input(self, log_path, config_tag, config_checkpoint,
                        parser_name):
        """Generate the input part"""
        return self._generate_input_with_template_file(
            template_file=self._input_template_path,
            log_path=log_path,
            config_tag=config_tag,
            config_checkpoint=config_checkpoint,
            parser_name=parser_name,
        )

    def _generate_input_with_template_file(self, template_file, log_path,
                                           config_tag, config_checkpoint,
                                           parser_name):
        """Generate the input part"""
        input_data = ""
        with open(template_file, "r") as openFile:
            for line in openFile:
                line = (line.replace("LOGHUB_CONFIG_PATH", log_path).replace(
                    "LOGHUB_CONFIG_TAG", config_tag).replace(
                        "LOGHUB_CHECKPOINT",
                        config_checkpoint).replace("LOGHUB_PARSER",
                                                   parser_name))
                input_data += line
        input_data += "\n"
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

    def _generate_conf_filter(self, config_info, config_tag, type="FluentBit"):
        if type == "EKS":
            _filter_template_path = self._k8s_fluent_bit_grep_filter_template_path
        else:
            _filter_template_path = self._filter_template_path

        filter_data = ""
        if (config_info.get("processorFilterRegex", {
                "enable": False
        }).get("enable") is True):
            for filter in config_info.get("processorFilterRegex").get(
                    "filters"):
                filter_data += "\n"
                filter_condition = ("Regex" if filter["condition"] == "Include"
                                    else "Exclude")
                filter_key = filter["key"]
                filter_value = filter["value"]
                filter_data += self._generate_filter_with_template_file(
                    _filter_template_path,
                    config_tag,
                    filter_condition,
                    filter_key,
                    filter_value,
                )
                filter_data += "\n"
            filter_data += "\n"
        return filter_data

    def _generate_filter_with_template_file(self, template_file, config_tag,
                                            filter_condition, filter_key,
                                            filter_value):
        """Generate the filter part"""
        return self.__log_ingestion_svc._render_template(
            template_file,
            LOGHUB_CONFIG_TAG=config_tag,
            LOGHUB_FILTER_CONDITION=filter_condition,
            LOGHUB_FILTER_KEY=filter_key,
            LOGHUB_FILTER_VALUE=filter_value,
        )

    def _generate_output(
        self,
        app_pipeline_info,
        config_tag,
        config_region,
        role_arn="",
        time_key='time',
        type="EKS",
    ):
        """Generate the output part"""
        # TODO: Double check which one needs role_arn
        # Support of old data
        output = ""
        if not time_key:
            time_key = 'time'
        aos_param_col = "aosParams"
        if "aosParas" in app_pipeline_info:
            aos_param_col = "aosParas"
            if app_pipeline_info.get("kdsParas"):
                buffer_type = "KDS"

            else:
                buffer_type = "None"
        else:
            buffer_type = app_pipeline_info.get("bufferType", "")

        if buffer_type == "KDS":
            if "kdsParas" in app_pipeline_info and app_pipeline_info.get(
                    "kdsParas"):
                stream_name = app_pipeline_info["kdsParas"].get(
                    "streamName", "")
            else:
                stream_name = app_pipeline_info.get("bufferResourceName", "")
            output = self.__log_ingestion_svc._render_template(
                self._fluent_bit_output.get(
                    type.lower() + "_fluent_bit_output_kds_template_path"),
                LOGHUB_CONFIG_TAG=config_tag,
                LOGHUB_CONFIG_REGION=config_region,
                LOGHUB_KDS_STREAM_NAME=stream_name,
                TIME_KEY=time_key,
                LOGHUB_BUFFER_ACCESS_ROLE_ARN=role_arn,
            )
        elif buffer_type == "S3":
            bucket_name = app_pipeline_info.get("bufferResourceName")
            buffer_params = app_pipeline_info.get("bufferParams")
            compressionType = ''
            for param in buffer_params:
                if param["paramKey"] == "logBucketPrefix":
                    prefix = param["paramValue"]
                elif param["paramKey"] == "maxFileSize":
                    max_file_size = param["paramValue"]
                elif param["paramKey"] == "uploadTimeout":
                    upload_timeout = param["paramValue"]
                elif param["paramKey"] == "compressionType":
                    compressionType = param["paramValue"]

            output = self.__log_ingestion_svc._render_template(
                self._fluent_bit_output.get(
                    type.lower() + "_fluent_bit_output_s3_template_path"),
                LOGHUB_CONFIG_TAG=config_tag,
                LOGHUB_CONFIG_REGION=config_region,
                LOGHUB_S3_BUCKET_NAME=bucket_name,
                LOGHUB_S3_PREFIX=prefix,
                LOGHUB_S3_SUFFIX='.gz'
                if compressionType.lower() == 'gzip' else '',
                LOGHUB_S3_COMPRESSION=f'compression    {compressionType}'
                if compressionType.lower() == 'gzip' else '',
                LOGHUB_S3_MAX_FILE_SIZE=max_file_size + 'M',
                LOGHUB_S3_UPLOAD_TIMEOUT=upload_timeout + 's',
                LOGHUB_TIMEKEY=time_key,
                LOGHUB_BUFFER_ACCESS_ROLE_ARN=role_arn,
            )
        elif buffer_type == "MSK":
            buffer_params = app_pipeline_info.get("bufferParams")
            for param in buffer_params:
                if param["paramKey"] == "mskBrokerServers":
                    brokers = param["paramValue"]
                elif param["paramKey"] == "topic":
                    topic = param["paramValue"]
            output = self.__log_ingestion_svc._render_template(
                self._fluent_bit_output.get(
                    type.lower() + "_fluent_bit_output_msk_template_path"),
                LOGHUB_CONFIG_TAG=config_tag,
                LOGHUB_CONFIG_REGION=config_region,
                LOGHUB_MSK_BROKER_SERVERS=brokers,
                LOGHUB_MSK_TOPICS=topic,
                LOGHUB_TIMEKEY=time_key,
            )
        else:
            # Buffer is None. set Output to AOS
            aos_params = app_pipeline_info.get(aos_param_col)
            if aos_params == None:
                output = self.__log_ingestion_svc._render_template(
                    self._fluent_bit_output.get(
                        type.lower() + "_fluent_bit_output_aos_template_path"),
                    LOGHUB_CONFIG_TAG=config_tag,
                    LOGHUB_CONFIG_REGION=config_region,
                    LOGHUB_AOS_ENDPOINT="",
                    LOGHUB_AOS_IDX_PREFIX="",
                    LOGHUB_TIMEKEY=time_key,
                    LOGHUB_BUFFER_ACCESS_ROLE_ARN=role_arn,
                )
            else:
                output = self.__log_ingestion_svc._render_template(
                    self._fluent_bit_output.get(
                        type.lower() + "_fluent_bit_output_aos_template_path"),
                    LOGHUB_CONFIG_TAG=config_tag,
                    LOGHUB_CONFIG_REGION=config_region,
                    LOGHUB_AOS_ENDPOINT=aos_params.get("opensearchEndpoint",
                                                       ""),
                    LOGHUB_AOS_IDX_PREFIX=aos_params.get("indexPrefix", ""),
                    LOGHUB_TIMEKEY=time_key,
                    LOGHUB_BUFFER_ACCESS_ROLE_ARN=role_arn,
                )
        if type == "EC2":
            # Add an extra line at the end.
            output = output.lstrip("    ") + "\n"
        return output

    def _generate_single_parser(self, app_pipeline_id, group_id, config_id):
        """Generate the parer part"""
        config_info = self.__log_ingestion_svc.get_config_detail(config_id)
        return self._generate_parser_by_config_info(app_pipeline_id, group_id,
                                                    config_info)

    def _generate_parser_by_config_info(self, app_pipeline_id, group_id,
                                        config_info):
        parser_format = "json"
        regex_content = ""
        if config_info["logType"] != LOGTYPE.JSON.value:
            parser_format = "regex"
            regex_content = "Regex       " + config_info["regularExpression"]
        time_key = ""
        time_format = ""
        if ("regularSpecs" in config_info and config_info["regularSpecs"]):
            time_key = f"Time_Key    {config_info.get('timeKey','time')}"
            time_format = "Time_Format " + self.__log_ingestion_svc._get_time_format(
                config_info.get("regularSpecs"))
        user_define_parser = self.__log_ingestion_svc._render_template(
            self._parser_template_path,
            LOGHUB_PARSER_NAME=self.__generate_ec2_parser_name(
                config_info["logType"], app_pipeline_id, group_id,
                config_info["id"]),
            LOGHUB_PARSER_FORMAT=parser_format,
            LOGHUB_REGEX=regex_content,
            LOGHUB_TIME_KEY=time_key,
            LOGHUB_TIME_FORMAT=time_format,
            LOGHUB_TIME_OFFSET=flb_key_value(
                key="Time_Offset", val=config_info.get("timeOffset")),
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
            LOGHUB_CONFIG_TAG=config_tag,
            LOGHUB_MULTILINE_PARSER="multiline-" + multiline_parser_name,
        )

    def generate_k8s_fluent_bit_inout_and_filter(
        self,
        cri=CRI.DOCKER.value,
        deployment_kind=DEPLOYMENTKIND.DAEMONSET.value,
        role_arn="",
        extra_metadata_suffix="",
    ) -> str:
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
        config_tag = self.__config_id + "." + self.__app_pipeline_id
        config_tag_prefix = "loghub." + config_tag + ".*"
        config_checkpoint = "/var/fluent-bit/state/flb_container-" + config_tag + ".db"

        # prepare parameters for docker and containerd
        docker_mode_switch = "On"
        docker_mode_parser = ""
        multiline_filter = ""
        if self.__config_info["logType"] == LOGTYPE.MULTI_LINE_TEXT.value:
            container_log_parser = "Parser              cri_regex"
            key_name = "log"
            docker_mode_parser = ("Docker_Mode_Parser  " +
                                  self.__get_parser_name() +
                                  ".docker.firstline")
            # multiline_switch and loghub_parser are only for sidecar
            multiline_switch = "On"
            loghub_parser = "Parser_Firstline    " + self.__get_parser_name()
            if (self.__config_info["multilineLogParser"] ==
                    MULTILINELOGPARSER.JAVA_SPRING_BOOT.value):
                multiline_filter = self.generate_k8s_fluent_bit_multiline_filter(
                    config_tag_prefix, self.__get_parser_name())
        else:
            key_name = "log"
            container_log_parser = "Parser              cri_regex"
            multiline_switch = "Off"
            loghub_parser = "Parser              " + self.__get_parser_name()

        # Get Log Path from AppLogIngestion table. If it is null, it will be obtained from logConf table
        app_log_ingest_resp = app_log_ingestion_table.get_item(
            Key={"id": self.__log_ingestion_id})
        if "Item" not in app_log_ingest_resp:
            raise APIException("App Log Ingestion item Not Found")
        app_log_ingestion_info = app_log_ingest_resp["Item"]
        log_path = app_log_ingestion_info.get(
            "logPath", self.__config_info.get("logPath"))

        # Add Filters Config
        filter_data = self._generate_conf_filter(self.__config_info,
                                                 config_tag_prefix,
                                                 type="EKS")
        time_key = self.__config_info.get("timeKey", 'time')
        # TODO: double check config region.
        # Assuming pipeline region is same as current region
        output_data = self._generate_output(self.__app_pipeline_info,
                                            config_tag_prefix, default_region,
                                            role_arn, time_key)
        # Parser
        if deployment_kind == DEPLOYMENTKIND.DAEMONSET.value:

            if CRI.CONTAINERD.value == cri:
                docker_mode_switch = "Off"
                docker_mode_parser = ""
            else:
                container_log_parser = "Parser              docker"
                key_name = "log"
                # For docker cri, it don't need multiline_filter
                multiline_filter = ""

            # DaemonSet pattern
            input_and_output_filter = self.__log_ingestion_svc._render_template(
                self._k8s_input_output_filter_daemonset_template_path,
                LOGHUB_CONFIG_TAG=config_tag_prefix,
                LOGHUB_CONFIG_PATH=log_path,
                LOGHUB_CONTAINER_PARSER=container_log_parser,
                LOGHUB_CHECKPOINT=config_checkpoint,
                LOGHUB_DOCKER_MODE_SWITCH=docker_mode_switch,
                LOGHUB_DOCKER_MODE_PARSER=docker_mode_parser,
                LOGHUB_FLUENT_BIT_OUTPUT=output_data,
                LOGHUB_FILTER_PARSER_KEY_NAME=key_name,
                LOGHUB_PARSER_NAME=self.__get_parser_name(),
                LOGHUB_FLUENT_BIT_MULTILINE_FILTER=multiline_filter,
                LOGHUB_KDS_ROLE_ARN=role_arn,
                LOGHUB_FLUENT_BIT_FILTER=filter_data,
            )

        else:
            # sidecar pattern
            input_and_output_filter = self.__log_ingestion_svc._render_template(
                self._k8s_input_output_sidecar_template_path,
                LOGHUB_CONFIG_TAG=config_tag_prefix,
                LOGHUB_CONFIG_PATH=log_path,
                LOGHUB_CHECKPOINT=config_checkpoint,
                LOGHUB_MULTILINE_SWITCH=multiline_switch,
                LOGHUB_PARSER=loghub_parser,
                LOGHUB_FLUENT_BIT_OUTPUT=output_data,
                LOGHUB_KDS_ROLE_ARN=role_arn,
                LOGHUB_FLUENT_BIT_FILTER=filter_data,
            )

        return input_and_output_filter

    def __get_parser_name(self) -> str:
        # If using regex from front-end, parser_name will be appended with config_id
        if self.__config_info["logType"] in LOGTYPE._value2member_map_:
            if ("multilineLogParser" in self.__config_info
                    and self.__config_info["multilineLogParser"]
                    in MULTILINELOGPARSER._value2member_map_):
                parser_name = (
                    self.__config_info["multilineLogParser"].lower() + "_" +
                    self.__config_id)
            else:
                parser_name = (self.__config_info["logType"].lower() + "_" +
                               self.__config_id)
        else:
            parser_name = self.__config_info["logType"].lower()
        return parser_name

    def __generate_ec2_parser_name(self, log_type, app_pipeline_id, group_id,
                                   config_id) -> str:
        """
        generate the parser name for Fluent-bit in ec2
        """
        if log_type in LOGTYPE._value2member_map_:
            parser_name = (log_type.lower() + "_" + app_pipeline_id.lower() +
                           "_" + group_id.lower() + "_" + config_id.lower())
        else:
            parser_name = log_type.lower()
        return parser_name

    def generate_k8s_fluent_bit_user_defined_docker_firstline_parser(self):
        """
        parse fluent-bit-user-defined-docker-firstline-parser.template
        """
        if self.__config_info["logType"] == LOGTYPE.MULTI_LINE_TEXT.value:
            user_define_docker_firstline_parser = (
                self.__log_ingestion_svc._render_template(
                    self.
                    _k8s_user_defined_docker_firstline_parser_template_path,
                    LOGHUB_PARSER_NAME=self.__get_parser_name(),
                    LOGHUB_REGEX=self.__config_info["regularExpression"],
                ))
            return user_define_docker_firstline_parser
        else:
            return ""

    def generate_k8s_fluent_bit_user_defined_parser(
            self,
            deployment_kind=DEPLOYMENTKIND.DAEMONSET.value,
            cri=CRI.DOCKER.value):
        """
        parse fluent-bit-user-defined-parser.template
        """
        parser_format = "json"
        regex_content = ""
        if self.__config_info["logType"] != LOGTYPE.JSON.value:
            parser_format = "regex"
            regex_content = "Regex       " + self.__config_info[
                "regularExpression"]
        time_key = ""
        time_format = ""
        if ("regularSpecs" in self.__config_info
                and self.__config_info["regularSpecs"]):
            time_key = f"Time_Key    time"
            if self.__config_info.get('timeKey'):
                time_key = f"Time_Key    {self.__config_info.get('timeKey')}"
            time_format = "Time_Format " + self.__log_ingestion_svc._get_time_format(
                self.__config_info.get("regularSpecs"))

        if (self.__config_info["logType"] == LOGTYPE.MULTI_LINE_TEXT.value
                and self.__config_info["multilineLogParser"]
                == MULTILINELOGPARSER.JAVA_SPRING_BOOT.value
                and deployment_kind == DEPLOYMENTKIND.DAEMONSET.value
                and cri == CRI.CONTAINERD.value):
            time_key = ""
            time_format = ""

        user_define_parser = self.__log_ingestion_svc._render_template(
            self._k8s_user_defined_parser_template_path,
            LOGHUB_PARSER_NAME=self.__get_parser_name(),
            LOGHUB_PARSER_FORMAT=parser_format,
            LOGHUB_REGEX=regex_content,
            LOGHUB_TIME_KEY=time_key,
            LOGHUB_TIME_FORMAT=time_format,
            LOGHUB_TIME_OFFSET=flb_key_value(key="Time_Offset",
                                             val=self.__config_info.get(
                                                 "timeOffset", "")),
        )
        return user_define_parser

    def generate_k8s_fluent_bit_user_defined_multiline_parser(self):
        """
        parse fluent-bit-user-defined-multiline-parser.template
        """
        if (self.__config_info["logType"] == LOGTYPE.MULTI_LINE_TEXT.value
                and self.__config_info["multilineLogParser"]
                == MULTILINELOGPARSER.JAVA_SPRING_BOOT.value):
            return self.__log_ingestion_svc._render_template(
                self._k8s_user_defined_multiline_parser_template_path,
                LOGHUB_MULTILINE_PARSER_NAME="multiline-" +
                self.__get_parser_name(),
                LOGHUB_REGEX=self.__config_info["timeRegularExpression"],
            )
        else:
            return ""

    def generate_k8s_configmap(self,
                               input_and_output_filter: str,
                               docker_firstline_parser: str,
                               user_define_parser: str,
                               user_define_multiline_parser: str,
                               deployment_kind=DEPLOYMENTKIND,
                               cri=CRI.DOCKER.value) -> str:
        """
        parse fluent-bit-configmap.template
        """
        configmap_template_file = self._k8s_configmap_template_path
        if deployment_kind.value == DEPLOYMENTKIND.DAEMONSET.value:
            k8s_filter = self.__log_ingestion_svc._render_template(
                self._k8s_fluent_bit_k8s_filter_template_path)
        else:
            k8s_filter = ""

        configmap = self.__log_ingestion_svc._render_template(
            configmap_template_file,
            CRI=cri,
            LOGHUB_NAMESPACE=fluent_bit_eks_cluster_name_space,
            LOGHUB_FLUENT_BIT_INPUT_OUTPUT_FILTER=input_and_output_filter,
            LOGHUB_USER_DEFINE_DOCKER_FIRSTLINE_PARSER=docker_firstline_parser,
            LOGHUB_USER_DEFINE_PARSER=user_define_parser,
            LOGHUB_USER_DEFINE_MULTILINE_PARSER=user_define_multiline_parser,
            LOGHUB_FLUENT_BIT_K8S_FILTER=k8s_filter,
        )

        return configmap

    def generate_k8s_daemonset_config(self,
                                      eks_cluster_name: str,
                                      eks_cluster_version: str,
                                      cri=CRI.DOCKER.value) -> str:
        """
        parse fluent-bit-daemonset.template
        """
        daemonset = self.__log_ingestion_svc._render_template(
            self._k8s_daemonset_template_path + cri + '.yaml',
            LOGHUB_NAMESPACE=fluent_bit_eks_cluster_name_space,
            LOGHUB_FLUENT_BIT_IMAGE=fluent_bit_image,
            LOGHUB_EKS_CLUSTER_NAME=eks_cluster_name,
            LOGHUB_EKS_CLUSTER_VERSION=eks_cluster_version,
        )
        return daemonset

    def generate_k8s_sidecar_config(self, eks_cluster_name) -> str:
        """
        parse fluent-bit-sidecar.template
        """
        # example: replace "/var/nginx/access.log" to "/var/nginx"
        # Get Log Path from AppLogIngestion table. If it is null, it will be obtained from logConf table
        app_log_ingest_resp = app_log_ingestion_table.get_item(
            Key={"id": self.__log_ingestion_id})
        if "Item" not in app_log_ingest_resp:
            raise APIException("App Log Ingestion item Not Found")
        app_log_ingestion_info = app_log_ingest_resp["Item"]
        log_path = app_log_ingestion_info.get(
            "logPath", self.__config_info.get("logPath"))

        file_path = log_path.split("/")
        file_name = file_path[-1]
        log_path = log_path.replace("/" + file_name, "")

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
                    "commands":
                    ["curl -s http://127.0.0.1:2022/api/v1/health"]
                },
            )
            command_id = response["Command"]["CommandId"]
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
                if (len(output["StandardOutputContent"]) > 0) and (
                        "fluent-bit" in output["StandardOutputContent"]):
                    continue
                else:
                    unsuccessful_instances.add(instance_id)
            except Exception as e:
                logger.error(e)
                return unsuccessful_instances
        return unsuccessful_instances


def fwrite(filename: str, s: str):
    with open(filename, "w") as fp:
        fp.write(s)


def fread(filename: str) -> str:
    with open(filename, "r") as fp:
        return fp.read()


def flb_key_value(key: str, val: str) -> str:
    if val:
        return f"{key}    {val}"
    return ""
