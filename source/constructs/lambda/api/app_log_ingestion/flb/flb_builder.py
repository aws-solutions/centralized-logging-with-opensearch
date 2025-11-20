# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import os
from commonlib.logging import get_logger
from typing import List
import json
from commonlib.utils import strtobool
from commonlib.model import (
    AppLogIngestion,
    LogConfig,
    CRIEnum,
    RegularSpec,
    DeploymentKindEnum,
    LogTypeEnum,
    DeploymentEnvEnum,
    LogConfigFilterCondition,
    EksSource,
    GroupPlatformEnum,
)
from commonlib.dao import InstanceDao
from commonlib import AWSConnection
from commonlib.exception import APIException, ErrorCode
from jinja2 import FileSystemLoader, Environment
from flb.flb_model import FluentBitDataPipeline
from flb.k8s import ConfigMap

logger = get_logger(__name__)

default_region = os.environ.get("AWS_REGION")

default_open_extra_metadata_flag = strtobool(
    os.environ.get("DEFAULT_OPEN_EXTRA_METADATA_FLAG", "true")
)
solution_version = os.environ.get("SOLUTION_VERSION")

fluent_bit_eks_cluster_namespace = os.environ.get(
    "FLUENT_BIT_EKS_CLUSTER_NAME_SPACE", "logging"
)

container_log_path = os.environ.get("CONTAINER_LOG_PATH", "/var/log/containers/")
cwl_monitor_role_arn = os.environ.get("CWL_MONITOR_ROLE_ARN")
stack_prefix = os.environ.get("STACK_PREFIX", "CL")
fluent_bit_image = os.environ.get(
    "FLUENT_BIT_IMAGE",
    "public.ecr.aws/aws-observability/aws-for-fluent-bit:2.32.2.20241008",
)
fluent_bit_log_group_name = os.environ["FLUENT_BIT_LOG_GROUP_NAME"]

instance_table_name = os.environ.get("INSTANCE_TABLE_NAME")
instance_dao = InstanceDao(table_name=instance_table_name)
conn = AWSConnection()
ssm_cli = conn.get_client("ssm", region_name=default_region)


class FluentBitDataPipelineBuilder(object):
    def __init__(self, ingestion: AppLogIngestion):
        self._ingestion = ingestion
        self._log_config: LogConfig = self._ingestion.logConfig
        self._time_key = self._log_config.timeKey or "time"

    def get_parser_name(self) -> str:
        # If using regex from front-end, parser_name will be appended with config_id

        if self._log_config.multilineLogParser:
            parser_name = (
                self._log_config.multilineLogParser.value.lower()
                + "_"
                + self._log_config.id
                + "_v"
                + str(self._log_config.version)
            )
        else:
            parser_name = (
                self._log_config.logType.lower()
                + "_"
                + self._log_config.id
                + "_v"
                + str(self._log_config.version)
            )

        return parser_name

    def get_time_format(self, time_key: str, reg_specs: List[RegularSpec]) -> str:
        for regular_spec in reg_specs:
            if regular_spec.key == time_key and regular_spec.type == "date":
                return regular_spec.format
        return '""'

    def build_syslog_input(self):
        syslog = dict()
        for param in self._ingestion.input.params:
            if param.paramKey == "protocolType":
                syslog["mode"] = param.paramValue
            elif param.paramKey == "port":
                syslog["port"] = param.paramValue
            elif param.paramKey == "listen":
                syslog["listen"] = param.paramValue
        return syslog

    def build_tail_input(self):
        tail = dict()
        tail["logPath"] = self._ingestion.logPath
        return tail

    def build_kds_output(self):
        kds = dict()
        for param in self._ingestion.output.params:
            if param.paramKey == "streamName":
                kds["stream_name"] = param.paramValue
        return kds

    def build_s3_output(self):
        s3 = dict()
        for param in self._ingestion.output.params:
            if param.paramKey == "logBucketPrefix":
                s3["prefix"] = param.paramValue.strip("/")
            elif param.paramKey == "maxFileSize":
                s3["max_file_size"] = param.paramValue
            elif param.paramKey == "logBucketName":
                s3["bucket_name"] = param.paramValue
            elif param.paramKey == "uploadTimeout":
                s3["upload_timeout"] = param.paramValue
            elif param.paramKey == "compressionType":
                s3["compression_type"] = param.paramValue
            elif param.paramKey == "s3StorageClass":
                s3["storage_class"] = param.paramValue
        return s3

    def build_msk_output(self):
        msk = dict()
        for param in self._ingestion.output.params:
            if param.paramKey == "mskBrokerServers":
                msk["brokers"] = param.paramValue
            elif param.paramKey == "topics":
                msk["topics"] = param.paramValue

        return msk

    def build_aos_output(self):
        aos = dict()
        for param in self._ingestion.output.params:
            if param.paramKey == "opensearchEndpoint":
                aos["endpoint"] = param.paramValue
            elif param.paramKey == "indexPrefix":
                aos["idx_alias"] = param.paramValue
        return aos

    def build_grep_filters(self) -> list:
        grep_filters = list()
        if (
            self._log_config.filterConfigMap
            and self._log_config.filterConfigMap.enabled
        ):
            for filter in self._log_config.filterConfigMap.filters:
                grep_filter = dict()
                if filter.condition == LogConfigFilterCondition.INCLUDE:
                    grep_filter["include_regex"] = f"{filter.key} {filter.value}"
                else:
                    grep_filter["exclude_regex"] = f"{filter.key} {filter.value}"
                grep_filters.append(grep_filter)
        return grep_filters

    def build_multiline_filter(self):
        multiline_filter = dict()
        multiline_filter["key_name"] = "log"
        multiline_filter["parser_name"] = f"multiline-{self.get_parser_name()}"
        return multiline_filter

    def build_multiline_parser(self):
        multiline_parser = dict()
        multiline_parser["name"] = f"multiline-{self.get_parser_name()}"
        multiline_parser["regex"] = self._log_config.regex or ""
        return multiline_parser

    def build_parser_filter(self):
        parser_filter = dict()
        parser_filter["key_name"] = "log"
        parser_filter["parser_name"] = self.get_parser_name()
        return parser_filter

    def build_parser(self):
        parser = dict()
        parser["name"] = self.get_parser_name()
        if self._log_config.logType != LogTypeEnum.JSON.value:
            parser["format"] = "regex"
            parser["regex"] = self._log_config.regex
        else:
            parser["format"] = "json"
        parser["time_key"] = self._time_key

        parser["time_format"] = self.get_time_format(
            self._time_key, self._log_config.regexFieldSpecs or list()
        )

        parser["time_offset"] = self._log_config.timeOffset

        return parser

    def generate_pipeline(
        self, region_name, env=DeploymentEnvEnum.EC2.value
    ) -> FluentBitDataPipeline:
        flb_tag = f"{self._ingestion.id}.{self._log_config.id}.v{str(self._log_config.version)}"
        flb_data_pipeline = FluentBitDataPipeline(
            env=env,
            log_type=self._log_config.logType,
            tag=flb_tag,
            region_name=region_name,
            role_arn=self._ingestion.output.roleArn,
            input_name=self._ingestion.input.name,
            output_name=self._ingestion.output.name,
            ingestion_id=self._ingestion.id,
            time_key=self._time_key,
        )
        if self._ingestion.input.name == "syslog":
            flb_data_pipeline.syslog = self.build_syslog_input()
        elif self._ingestion.input.name == "tail":
            flb_data_pipeline.tail = self.build_tail_input()

        if self._ingestion.output.name == "KDS":
            flb_data_pipeline.kds = self.build_kds_output()
        elif self._ingestion.output.name == "S3":
            flb_data_pipeline.s3 = self.build_s3_output()
        elif self._ingestion.output.name == "MSK":
            flb_data_pipeline.msk = self.build_msk_output()
        elif self._ingestion.output.name == "AOS":
            flb_data_pipeline.aos = self.build_aos_output()

        flb_data_pipeline.grep_filters = self.build_grep_filters()

        flb_data_pipeline.parser_filter = self.build_parser_filter()
        flb_data_pipeline.parser = self.build_parser()

        if self._log_config.logType == LogTypeEnum.MULTILINE_TEXT.value:
            flb_data_pipeline.multiline_filter = self.build_multiline_filter()
            flb_data_pipeline.multiline_parser = self.build_multiline_parser()

        flb_data_pipeline.parser = self.build_parser()
        return flb_data_pipeline


class Flb:
    def __init__(self):
        self._template_loader = FileSystemLoader(
            searchpath="./flb/flb_template", encoding="utf-8"
        )
        self._template_env = Environment(
            loader=self._template_loader,
            autoescape=True,
            trim_blocks=True,
            lstrip_blocks=True,
        )

    def _build_data_pipelines(
        self,
        ingestion_list: List[AppLogIngestion],
        region_name=default_region,
        env=DeploymentEnvEnum.EKSCluster.value,
    ) -> List[FluentBitDataPipeline]:
        flb_data_pipelines: List[FluentBitDataPipeline] = []
        parser_name_dict = dict()
        for ingestion in ingestion_list:
            flb_pipeline_builder = FluentBitDataPipelineBuilder(ingestion)
            flb_pipeline = flb_pipeline_builder.generate_pipeline(
                region_name=region_name, env=env
            )
            if flb_pipeline.parser["name"] in parser_name_dict:
                flb_pipeline.duplicated_parser = True
            else:
                parser_name_dict[flb_pipeline.parser["name"]] = flb_pipeline.parser[
                    "name"
                ]
                flb_pipeline.duplicated_parser = False

            flb_data_pipelines.append(flb_pipeline)
        return flb_data_pipelines

    def _get_os(self, instance_id: str) -> GroupPlatformEnum:
        instance_list = instance_dao.get_instance_by_instance_id(instance_id)
        if len(instance_list) > 0:
            ec2_instance = instance_list[0]
            return ec2_instance.platformType
        return GroupPlatformEnum.LINUX

    def _get_flb_params(self):
        log_level = ssm_cli.get_parameter(
            Name=f"/{stack_prefix}/FLB/log_level", WithDecryption=True
        )["Parameter"]["Value"]

        flush = ssm_cli.get_parameter(
            Name=f"/{stack_prefix}/FLB/flush", WithDecryption=True
        )["Parameter"]["Value"]

        mem_buf_limit = ssm_cli.get_parameter(
            Name=f"/{stack_prefix}/FLB/mem_buf_limit", WithDecryption=True
        )["Parameter"]["Value"]

        buffer_chunk_size = ssm_cli.get_parameter(
            Name=f"/{stack_prefix}/FLB/buffer_chunk_size", WithDecryption=True
        )["Parameter"]["Value"]

        buffer_max_size = ssm_cli.get_parameter(
            Name=f"/{stack_prefix}/FLB/buffer_max_size", WithDecryption=True
        )["Parameter"]["Value"]

        buffer_size = ssm_cli.get_parameter(
            Name=f"/{stack_prefix}/FLB/buffer_size", WithDecryption=True
        )["Parameter"]["Value"]

        retry_limit = ssm_cli.get_parameter(
            Name=f"/{stack_prefix}/FLB/retry_limit", WithDecryption=True
        )["Parameter"]["Value"]

        store_dir_limit_size = ssm_cli.get_parameter(
            Name=f"/{stack_prefix}/FLB/store_dir_limit_size", WithDecryption=True
        )["Parameter"]["Value"]

        storage_type = ssm_cli.get_parameter(
            Name=f"/{stack_prefix}/FLB/storage_type",
            WithDecryption=True,
        )["Parameter"]["Value"]

        storage_pause_on_chunks_overlimit = ssm_cli.get_parameter(
            Name=f"/{stack_prefix}/FLB/storage_pause_on_chunks_overlimit",
            WithDecryption=True,
        )["Parameter"]["Value"]

        storage_total_limit_size = ssm_cli.get_parameter(
            Name=f"/{stack_prefix}/FLB/storage_total_limit_size",
            WithDecryption=True,
        )["Parameter"]["Value"]

        flb_params = {
            "log_level": log_level,
            "flush": flush,
            "mem_buf_limit": mem_buf_limit,
            "buffer_chunk_size": buffer_chunk_size,
            "buffer_max_size": buffer_max_size,
            "buffer_size": buffer_size,
            "retry_limit": retry_limit,
            "store_dir_limit_size": store_dir_limit_size,
            "storage_type": storage_type,
            "storage_pause_on_chunks_overlimit": storage_pause_on_chunks_overlimit,
            "storage_total_limit_size": storage_total_limit_size,
        }
        return flb_params


class InstanceFlb(Flb):
    def __init__(self, sub_account_cwl_monitor_role_arn: str = cwl_monitor_role_arn):
        super().__init__()
        self._instance_flb_pipelines = dict()
        self._sub_account_cwl_monitor_role_arn = sub_account_cwl_monitor_role_arn

    def build_instance_data_pipelines(self, instance_with_ingestion_list: dict):
        if len(instance_with_ingestion_list) > 0:
            for instance_id, ingestion_list in instance_with_ingestion_list.items():
                flb_data_pipelines = self._build_data_pipelines(
                    ingestion_list, env=DeploymentEnvEnum.EC2.value
                )
                self._instance_flb_pipelines[instance_id] = flb_data_pipelines

    def get_flb_conf_content(self, content_type="parser"):
        instance_content = dict()
        if len(self._instance_flb_pipelines) > 0:
            flb_params = self._get_flb_params()
            content_template = self._template_env.get_template(f"{content_type}.conf")
            for key, value in self._instance_flb_pipelines.items():
                params = dict()
                params["flb_data_pipelines"] = value

                # Getting customized parameters from ssm
                params["ssm_params"] = flb_params
                # build cwl monitor param
                params["region"] = default_region
                params["stack_prefix"] = stack_prefix
                params["fluent_bit_log_group_name"] = fluent_bit_log_group_name
                params["cwl_monitor_role_arn"] = self._sub_account_cwl_monitor_role_arn
                params["env"] = DeploymentEnvEnum.EC2.value
                params["os"] = self._get_os(key)
                params["placeholder"] = ""
                content: str = content_template.render(params)
                instance_content[key] = content
        return instance_content


class K8sFlb(Flb):
    def __init__(
        self,
        eks_source: EksSource,
        ingestion_list: List[AppLogIngestion],
        open_extra_metadata_flag=default_open_extra_metadata_flag,
        sub_account_cwl_monitor_role_arn: str = cwl_monitor_role_arn,
    ):
        super().__init__()
        self._eks_source = eks_source
        self._open_extra_metadata_flag = open_extra_metadata_flag
        self._configmap_list = list()
        self._sub_account_cwl_monitor_role_arn = sub_account_cwl_monitor_role_arn
        self._ingestion_list = ingestion_list

    def generate_config_map(self):
        if self._eks_source.deploymentKind == DeploymentKindEnum.DAEMON_SET:
            for cri in CRIEnum.__members__.values():
                config_map = ConfigMap(
                    svc_acct_role=self._eks_source.logAgentRoleArn,
                    namespace=fluent_bit_eks_cluster_namespace,
                    container_runtime=cri.value,
                    open_extra_metadata_flag=self._open_extra_metadata_flag,
                )
                config_map.flb_data_pipelines = self._build_data_pipelines(
                    self._ingestion_list,
                    region_name=default_region,
                    env=DeploymentEnvEnum.EKSCluster,
                )
                self._configmap_list.append(config_map)
        else:
            config_map = ConfigMap(
                svc_acct_role=self._eks_source.logAgentRoleArn,
                namespace=fluent_bit_eks_cluster_namespace,
                open_extra_metadata_flag=False,
            )
            config_map.flb_data_pipelines = self._build_data_pipelines(
                self._ingestion_list,
                region_name=default_region,
                env=DeploymentEnvEnum.EKSCluster,
            )
            self._configmap_list.append(config_map)

    def generate_deployment_content(self) -> str:
        self.generate_config_map()
        content = ""
        if len(self._configmap_list) > 0:
            template_file = f"./k8s-{self._eks_source.deploymentKind}.conf"
            k8s_template = self._template_env.get_template(template_file)
            params = dict()
            # Getting customized parameters from ssm
            params["ssm_params"] = self._get_flb_params()

            params["env"] = DeploymentEnvEnum.EKSCluster.value
            params["eks_cluster_name"] = self._eks_source.eksClusterName
            params["svc_acct_role"] = self._eks_source.logAgentRoleArn
            params["namespace"] = fluent_bit_eks_cluster_namespace
            params["open_extra_metadata_flag"] = self._open_extra_metadata_flag
            params["k8s_deployment_kind"] = self._eks_source.deploymentKind

            # build cwl monitor param
            params["region"] = default_region
            params["stack_prefix"] = stack_prefix
            params["fluent_bit_log_group_name"] = fluent_bit_log_group_name
            params["cwl_monitor_role_arn"] = self._sub_account_cwl_monitor_role_arn
            params["placeholder"] = "    "
            params["fluent_bit_image"] = fluent_bit_image
            eks_cluster_version = self._eks_source.k8sVersion
            if self._eks_source.deploymentKind == DeploymentKindEnum.DAEMON_SET:
                params["configmap_list"] = self._configmap_list

                def generate_k8s_kubectl_binary_download_url(
                    eks_cluster_version: str, arch: str
                ) -> str:
                    version_map = self.get_kubectl()
                    if eks_cluster_version not in version_map.keys():
                        raise APIException(
                            ErrorCode.VALUE_ERROR,
                            f"Not supported version: {eks_cluster_version}.",
                        )

                    if arch not in ["arm64", "amd64"]:
                        raise APIException(
                            ErrorCode.VALUE_ERROR,
                            f"Not supported arch: {arch}, supported: amd64/arm64.",
                        )

                    version_path = version_map[eks_cluster_version]
                    return f"https://s3.us-west-2.amazonaws.com/amazon-eks/{version_path}/bin/linux/{arch}/kubectl"

                eks_kubectl_download_url_x86_64 = (
                    generate_k8s_kubectl_binary_download_url(
                        eks_cluster_version, "amd64"
                    )
                )
                eks_kubectl_download_url_arm64 = (
                    generate_k8s_kubectl_binary_download_url(
                        eks_cluster_version, "arm64"
                    )
                )
                params["kubectl_download_url_x86_64"] = eks_kubectl_download_url_x86_64
                params["kubectl_download_url_arm"] = eks_kubectl_download_url_arm64

            else:
                ingestion = self._ingestion_list[0]
                log_path = ingestion.logPath
                path = log_path.split(",")[-1]
                file_paths = path.split("/")
                file_name = file_paths[-1]
                mount_path = path.replace("/" + file_name, "")
                params["mount_path"] = mount_path
                params["configmap"] = self._configmap_list[0]
            content = k8s_template.render(params)

        return content

    def get_kubectl(self):
        # Read kubectl version mapping from local file
        current_dir = os.path.dirname(os.path.abspath(__file__))
        kubectl_version_file = os.path.join(current_dir, "kubectl_version.json")
        
        with open(kubectl_version_file, 'r') as f:
            return json.load(f)
