# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import boto3
import os

import logging

from botocore import config
from botocore.exceptions import ClientError
from util.log_agent_helper import FluentBit
from util.log_ingestion_svc import LogIngestionSvc

from util.sys_enum_type import CRI, SOURCETYPE, DEPLOYMENTKIND
from util.exception import APIException
from distutils.util import strtobool
from util.aws_svc_mgr import SvcManager, Boto3API

logger = logging.getLogger()
logger.setLevel(logging.INFO)

solution = os.environ.get("SOLUTION",
                          "SO8025/" + os.environ["SOLUTION_VERSION"])
user_agent_config = {"user_agent_extra": f"AwsSolution/{solution}"}
default_config = config.Config(**user_agent_config)
# Get DDB resource.
dynamodb = boto3.resource("dynamodb", config=default_config)

# log_agent_eks_deployment_kind_table_name = os.environ.get(
#     "LOG_AGENT_EKS_DEPLOYMENT_KIND_TABLE"
# )
# log_agent_eks_deployment_kind_table = dynamodb.Table(
#     log_agent_eks_deployment_kind_table_name)

app_log_ingestion_table_name = os.environ.get("APPLOGINGESTION_TABLE")
app_log_ingestion_table = dynamodb.Table(app_log_ingestion_table_name)

default_open_extra_metadata_flag = strtobool(
    os.environ.get("DEFAULT_OPEN_EXTRA_METADATA_FLAG", "true"))

default_open_containerd_runtime_flag = strtobool(
    os.environ.get("DEFAULT_OPEN_CONTAINERD_RUNTIME_FLAG", "false"))


class EKSClusterPodDeploymentConfigurationMng:
    __eks_cluster_id: str
    __deployment_kind = ""
    __log_ingestion_svc: LogIngestionSvc
    __eks_cluster_log_source: None
    __app_ingestion_id = ""
    __open_extra_metadata_flag = False
    __open_containerd_runtime_flag = False

    def __init__(self,
                 eks_cluster_id: str,
                 open_extra_metadata_flag=False,
                 open_containerd_runtime_flag=False):
        self.__eks_cluster_id = eks_cluster_id
        self.__log_ingestion_svc = LogIngestionSvc()
        self.__eks_cluster_log_source = self.__log_ingestion_svc.get_eks_cluster_log_source(
            self.__eks_cluster_id)
        # TODO: Set this
        self.__deployment_kind = self.__eks_cluster_log_source[
            "deploymentKind"]
        #self.__deployment_kind = "DaemonSet"
        if not self.__deployment_kind or (
                self.__deployment_kind != DEPLOYMENTKIND.DAEMONSET.value
                and self.__deployment_kind != DEPLOYMENTKIND.SIDECAR.value):
            raise APIException(
                f"Unknown DeploymentKind {self.__deployment_kind}!")

        if default_open_extra_metadata_flag or open_extra_metadata_flag:
            self.__open_extra_metadata_flag = True
        if default_open_containerd_runtime_flag or open_containerd_runtime_flag:
            self.__open_containerd_runtime_flag = True

    # def __get_log_agent_eks_deployment_kind_by_id(self) -> str:
    #     """
    #     get deployment kind by eks cluster id
    #     """
    #     conditions = Attr("eksClusterId").eq(self.__eks_cluster_id)
    #     response = log_agent_eks_deployment_kind_table.scan(
    #         FilterExpression=conditions,
    #         ProjectionExpression="id, #eksClusterId,deploymentKind,createdDt,updatedDt ",
    #         ExpressionAttributeNames={
    #             "#eksClusterId": "eksClusterId",
    #         },
    #     )
    #     if "Items" in response:
    #         items = response["Items"]
    #         return items[0]["deploymentKind"]
    #     else:
    #         return ""

    def set_app_ingestion_id(self, app_ingestion_id):
        self.__app_ingestion_id = app_ingestion_id

    def __get_eks_cluster_version(self, eks_account_id: str, region_name: str,
                                  eks_cluster_name: str):
        # Get EKS cluster details
        svcMgr = SvcManager()
        eks = svcMgr.get_client(
            sub_account_id=eks_account_id,
            region=region_name,
            service_name="eks",
            type=Boto3API.CLIENT,
        )

        try:
            eks_cluster = eks.describe_cluster(name=eks_cluster_name)
        except ClientError as e:
            if e.response["Error"]["Code"] == "ResourceNotFoundException":
                raise APIException("EKS Cluster Not Found")
            else:
                raise e
        # Check domain status. Inactive domain (if any) should be ignored.
        if ("DELETING" in eks_cluster["cluster"]["status"]) or (
                "FAILED" in eks_cluster["cluster"]["status"]):
            raise APIException("The domain to be imported must be active")

        # Check domain status. domain creating in progress (if any) should be ignored.
        if not ("ACTIVE" in eks_cluster["cluster"]["status"]):
            raise APIException(
                "Cannot import domain when creation is still in progress")
        logger.info(
            f'eks "{eks_cluster_name}" describe cluster reponse is {eks_cluster}'
        )
        return eks_cluster["cluster"]["version"]

    def get_configuration(self):
        """
        Get Sidecar configuration or Daemonset configuration by appIngestionId.
        """
        if self.__app_ingestion_id:
            logger.info(f"app_ingestion_id is {self.__app_ingestion_id}")
            return self.__get_sidecar_configuration_deploy_content()
        else:
            return self.__get_daemonset_configuration_deploy_content()

    def __get_sidecar_configuration_deploy_content(self) -> str:
        """
        Get Sidecar configuration.
        """
        resp = app_log_ingestion_table.get_item(
            Key={"id": self.__app_ingestion_id})
        if "Item" not in resp:
            raise APIException("EKS Source AppPipeline Not Found")
        app_log_ingestion = resp["Item"]
        if (app_log_ingestion["sourceId"] != self.__eks_cluster_id
                or app_log_ingestion["sourceType"] !=
                SOURCETYPE.EKS_CLUSTER.value):
            raise APIException("EKS Source AppPipeline Not Found")
        if app_log_ingestion["status"] != "ACTIVE":
            return ""
        fluent_bit = FluentBit.get_fluent_bit_instance(
            config_id=app_log_ingestion["confId"],
            app_pipeline_id=app_log_ingestion["appPipelineId"],
            log_ingestion_id=app_log_ingestion["id"],
        )

        eks_cluster_name = self.__eks_cluster_log_source["eksClusterName"]
        log_agent_role_arn = self.__eks_cluster_log_source["logAgentRoleArn"]
        cri = self.__eks_cluster_log_source["cri"]

        ns_and_svcacct_and_role = fluent_bit.generate_k8s_ns_and_svcacct_and_role(
            log_agent_role_arn, False)

        # configmap=fluent-bit-configmap.template+input_and_output_filter+user_define_parser
        app_log_pipeline = self.__log_ingestion_svc.get_app_pipeline(
            app_log_ingestion["appPipelineId"])
        if app_log_pipeline["status"] != "ACTIVE":
            return ""

        # TODO: double check this:
        # direct_aos = False
        # if "kdsRoleArn" in app_log_pipeline and app_log_pipeline["kdsRoleArn"]:
        #     # ARN of an IAM role to assume (for cross account access)
        #     role_arn = "Role_arn            " + app_log_pipeline["kdsRoleArn"]
        # elif "ec2RoleArn" in app_log_pipeline and app_log_pipeline["ec2RoleArn"]:
        #     # ARN of an IAM role to assume (for cross account access)
        #     role_arn = "AWS_Role_ARN        " + app_log_pipeline["ec2RoleArn"]
        #     direct_aos = True
        # else:
        #     role_arn = ""
        role_arn = app_log_pipeline.get("bufferAccessRoleArn", "")

        extra_metadata_suffix = ""
        if self.__open_extra_metadata_flag:
            extra_metadata_suffix = "var.log.containers."

        inout_and_filter = fluent_bit.generate_k8s_fluent_bit_inout_and_filter(
            cri,
            self.__deployment_kind,
            role_arn=role_arn,
            extra_metadata_suffix=extra_metadata_suffix,
        )
        user_define_parser = fluent_bit.generate_k8s_fluent_bit_user_defined_parser(
            DEPLOYMENTKIND.SIDECAR.value, cri)
        configmap = fluent_bit.generate_k8s_configmap(inout_and_filter, "",
                                                      user_define_parser, "",
                                                      DEPLOYMENTKIND.SIDECAR,
                                                      cri)
        sidecar_config = fluent_bit.generate_k8s_sidecar_config(
            eks_cluster_name)
        content = ns_and_svcacct_and_role + configmap + sidecar_config

        return content

    def __get_eks_cluster_ids_by_name(self, eks_cluster_name: str,
                                      eks_account_id: str,
                                      region_name: str) -> list:
        """
        Get eks cluseter id array by name
        """
        eks_cluster_log_source_list = (
            self.__log_ingestion_svc.get_eks_cluster_list_by_name(
                eks_cluster_name, eks_account_id, region_name))
        eks_cluster_ids = []
        if eks_cluster_log_source_list:
            for eks_cluster_log_source in eks_cluster_log_source_list:
                eks_cluster_ids.append(eks_cluster_log_source["id"])
        return eks_cluster_ids

    def __get_daemonset_configuration_deploy_content(self) -> str:
        """
        Get Daemonset configuration
        """
        content = ""
        # get EKS cluster_name,log_agent_role_arn, and CRI
        eks_cluster_name = self.__eks_cluster_log_source["eksClusterName"]
        log_agent_role_arn = self.__eks_cluster_log_source["logAgentRoleArn"]
        #cri = eks_cluster_log_source["cri"]

        # get eks cluseter id array by name
        eks_cluster_list = self.__get_eks_cluster_ids_by_name(
            eks_cluster_name,
            eks_account_id=self.__eks_cluster_log_source["accountId"],
            region_name=self.__eks_cluster_log_source["region"],
        )
        # get eks cluster version for downloading kubectl
        eks_cluster_vesrion = self.__get_eks_cluster_version(
            self.__eks_cluster_log_source["accountId"],
            self.__eks_cluster_log_source["region"], eks_cluster_name)

        if eks_cluster_list:
            resp = self.__log_ingestion_svc.list_app_log_ingestions(
                sourceId=self.__eks_cluster_id,
                souceType=SOURCETYPE.EKS_CLUSTER.value,
                page=1,
                count=1000,
            )

            if resp["total"] > 0:
                # traverse all ingestions under the same eks cluster
                resp = self.__log_ingestion_svc.list_app_log_ingestions(
                    sourceIds=eks_cluster_list,
                    souceType=SOURCETYPE.EKS_CLUSTER.value,
                    page=1,
                    count=1000,
                )
                if self.__open_containerd_runtime_flag:
                    runtime_list = [member.value for member in CRI]
                else:
                    runtime_list = [self.__eks_cluster_log_source["cri"]]

                fluent_bit = None
                configmap = ''
                for idx, cri in enumerate(runtime_list):
                    first_call = True
                    ns_and_svcacct_and_role = ""
                    inout_and_filter = ""
                    user_define_parser = ""
                    user_define_multiline_parser = ""

                    app_log_ingestions = resp["appLogIngestions"]
                    conf_ids = []
                    docker_firstline_parser = ""
                    extra_metadata_suffix = ""
                    if self.__open_extra_metadata_flag:
                        extra_metadata_suffix = "var.log.containers."
                    for app_log_ingestion in app_log_ingestions:
                        if app_log_ingestion["status"] != "ACTIVE":
                            continue
                        config_id = app_log_ingestion["confId"]
                        fluent_bit = FluentBit.get_fluent_bit_instance(
                            config_id,
                            app_log_ingestion["appPipelineId"],
                            app_log_ingestion["id"],
                        )

                        if first_call:
                            # namespace, service account, and role only need to be called once
                            ns_and_svcacct_and_role = (
                                fluent_bit.
                                generate_k8s_ns_and_svcacct_and_role(
                                    log_agent_role_arn))
                            first_call = False

                        # configmap=fluent-bit-configmap.template+input_and_output_filter+user_define_parser
                        app_log_pipeline = self.__log_ingestion_svc.get_app_pipeline(
                            app_log_ingestion["appPipelineId"])
                        if app_log_pipeline["status"] != "ACTIVE":
                            continue

                        # TODO: Double check this
                        role_arn = app_log_pipeline.get(
                            "bufferAccessRoleArn", "")
                        # direct_aos = False
                        # if (
                        #     "kdsRoleArn" in app_log_pipeline
                        #     and app_log_pipeline["kdsRoleArn"]
                        # ):
                        #     # ARN of an IAM role to assume (for cross account access)
                        #     role_arn = (
                        #         "Role_arn            " + app_log_pipeline["kdsRoleArn"]
                        #     )
                        # elif (
                        #     "ec2RoleArn" in app_log_pipeline
                        #     and app_log_pipeline["ec2RoleArn"]
                        # ):
                        #     # ARN of an IAM role to assume (for cross account access)
                        #     role_arn = (
                        #         "AWS_Role_ARN        " + app_log_pipeline["ec2RoleArn"]
                        #     )
                        #     direct_aos = True
                        # else:
                        #     role_arn = ""
                        inout_and_filter += (
                            fluent_bit.
                            generate_k8s_fluent_bit_inout_and_filter(
                                cri,
                                role_arn=role_arn,
                                extra_metadata_suffix=extra_metadata_suffix,
                            ))
                        if config_id not in conf_ids:
                            conf_ids.append(config_id)

                            user_define_parser += (
                                fluent_bit.
                                generate_k8s_fluent_bit_user_defined_parser(
                                    DEPLOYMENTKIND.DAEMONSET.value, cri))
                            if cri == CRI.CONTAINERD.value:
                                user_define_multiline_parser += (
                                    fluent_bit.
                                    generate_k8s_fluent_bit_user_defined_multiline_parser(
                                    ))
                            else:
                                # docker runtime interface
                                docker_firstline_parser += (
                                    fluent_bit.
                                    generate_k8s_fluent_bit_user_defined_docker_firstline_parser(
                                    ))

                    if fluent_bit:
                        configmap += fluent_bit.generate_k8s_configmap(
                            inout_and_filter,
                            docker_firstline_parser,
                            user_define_parser,
                            user_define_multiline_parser,
                            DEPLOYMENTKIND.DAEMONSET,
                            cri,
                        )
                        if idx == len(runtime_list) - 1:
                            daemonset_config = fluent_bit.generate_k8s_daemonset_config(
                                eks_cluster_name, eks_cluster_vesrion, cri)
                            content = ns_and_svcacct_and_role + configmap + daemonset_config
                            return content

        return ""
