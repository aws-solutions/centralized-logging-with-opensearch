# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import logging
import os
from typing import List
from commonlib import AWSConnection, LinkAccountHelper
from commonlib.model import LogSource, AppLogIngestion, StatusEnum
from flb.distribution import FlbHandler
from commonlib.utils import create_stack_name
from util.utils import exec_sfn_flow
from botocore.exceptions import ClientError
from boto3.dynamodb.conditions import Attr

logger = logging.getLogger()
logger.setLevel(logging.INFO)
conn = AWSConnection()
elb = conn.get_client("elbv2")
sfn = conn.get_client("stepfunctions")
stack_prefix = os.environ.get("STACK_PREFIX", "CL")
ecs_cluster_name = os.environ.get("ECS_CLUSTER_NAME")
log_agent_vpc_id = os.environ.get("LOG_AGENT_VPC_ID")
log_agent_subnet_ids = os.environ.get("LOG_AGENT_SUBNETS_IDS")  # Private subnets
state_machine_arn = os.environ.get("STATE_MACHINE_ARN")

failed_log_bucket = os.environ.get("CONFIG_FILE_S3_BUCKET_NAME")

log_source_table_name = os.environ.get("LOG_SOURCE_TABLE_NAME")
# link account
sub_account_link_table_name = os.environ.get("SUB_ACCOUNT_LINK_TABLE_NAME")
account_helper = LinkAccountHelper(sub_account_link_table_name)


class SyslogSourceHandler(FlbHandler):
    def create_syslog_nlb(self):
        """
        This function will create a nlb only once.
        It will check this solution whether has created a nlb for syslog or not.
        If there is already a nlb, it will return the arn of existed nlb.
        """
        syslog_nlb_arn = ""
        syslog_nlb_dns_name = ""
        try:
            response = elb.describe_load_balancers(
                Names=[
                    "Logging-syslog-nlb",
                ]
            )
        except ClientError as err:
            if err.response["Error"]["Code"] == "LoadBalancerNotFound":
                try:
                    response = elb.create_load_balancer(
                        Name="Logging-syslog-nlb",
                        Subnets=log_agent_subnet_ids.split(","),
                        Type="network",
                        Scheme="internal",
                    )
                except Exception as err:
                    logger.error("Failed to create NLB for Syslog")
                    logger.error(err)
                    raise err
            else:
                logger.error("Failed to describe NLB for Syslog")
                logger.error(err)
                raise err
        syslog_nlb_arn = response["LoadBalancers"][0].get("LoadBalancerArn")
        syslog_nlb_dns_name = response["LoadBalancers"][0].get("DNSName")
        return syslog_nlb_arn, syslog_nlb_dns_name

    def create_ingestion(
        self, log_source: LogSource, app_log_ingestion: AppLogIngestion
    ):
        # save ingestion
        app_log_ingestion.status = StatusEnum.DISTRIBUTING
        app_log_ingestion = self._ingestion_dao.save_with_log_source(
            app_log_ingestion, log_source_table_name, log_source
        )

        # syslog:1.generate flb config 2.upload flb config to s3
        instance_with_ingestion_list = dict()
        instance_with_ingestion_list["syslog/" + str(log_source.syslog.port)] = [
            app_log_ingestion
        ]
        link_account = account_helper.get_link_account(
            log_source.accountId, log_source.region
        )
        self.generate_flb_conf(instance_with_ingestion_list, link_account)

        # update status to ACTIVE
        self._ingestion_dao.update_app_log_ingestion(
            app_log_ingestion.id, status=StatusEnum.CREATING
        )

    def create_syslog_substack(
        self, log_source: LogSource, app_log_ingestion: AppLogIngestion
    ):
        """Create a syslog substack"""
        logger.info("create syslog substack")
        stack_name = create_stack_name("AppIngestion-Syslog", app_log_ingestion.id)

        _buffer_access_role_arn = app_log_ingestion.output.roleArn
        _deploy_account_id = log_source.accountId
        _deploy_region = log_source.region

        # Call the function to create nlb if needed
        syslog_nlb_arn, syslog_nlb_dns_name = self.create_syslog_nlb()
        log_source.syslog.nlbArn = syslog_nlb_arn
        log_source.syslog.nlbDNSName = syslog_nlb_dns_name
        _port = log_source.syslog.port
        _protocol_type = log_source.syslog.protocol

        # Config the substack params
        sfn_args = {
            "stackName": stack_name,
            "pattern": "SyslogtoECSStack",
            "deployAccountId": _deploy_account_id,
            "deployRegion": _deploy_region,
            "parameters": [
                # System level params
                {
                    "ParameterKey": "NlbArn",
                    "ParameterValue": syslog_nlb_arn,
                },
                {
                    "ParameterKey": "ECSClusterName",
                    "ParameterValue": str(ecs_cluster_name),
                },
                {
                    "ParameterKey": "ConfigS3BucketName",
                    "ParameterValue": str(failed_log_bucket),
                },
                # Buffer layer
                {
                    "ParameterKey": "ECSTaskRoleArn",
                    "ParameterValue": str(_buffer_access_role_arn),
                },
                # VPC
                {
                    "ParameterKey": "ECSVpcId",
                    "ParameterValue": str(log_agent_vpc_id),
                },
                {
                    "ParameterKey": "ECSSubnets",
                    "ParameterValue": str(log_agent_subnet_ids),
                },
                # fluent-bit config params
                {
                    "ParameterKey": "NlbPortParam",
                    "ParameterValue": str(_port),
                },
                {
                    "ParameterKey": "NlbProtocolTypeParam",
                    "ParameterValue": str(_protocol_type),
                },
                {
                    "ParameterKey": "ServiceConfigS3KeyParam",
                    "ParameterValue": "app_log_config/syslog/" + str(_port) + "/",
                },
            ],
        }

        # Start the pipeline flow
        exec_sfn_flow(sfn, state_machine_arn, app_log_ingestion.id, "START", sfn_args)

    def delete_syslog_nlb(self):
        """
        This function will delete the nlb.
        """
        try:
            response = elb.describe_load_balancers(
                Names=[
                    "Logging-syslog-nlb",
                ]
            )
            syslog_nlb_arn = response["LoadBalancers"][0].get("LoadBalancerArn")
            elb.delete_load_balancer(
                LoadBalancerArn=syslog_nlb_arn,
            )
        except ClientError as err:
            if err.response["Error"]["Code"] == "LoadBalancerNotFound":
                logger.error("Failed to delete NLB for Syslog, NLB not found!")
                logger.error(err)
            else:
                logger.error("Failed to delete NLB for Syslog")
                logger.error(err)
                raise err

    def delete_ingestion(
        self, log_source: LogSource, app_log_ingestion: AppLogIngestion
    ):
        """Delete a syslog sub stack"""
        logger.info("delete syslog sub stack")

        # Delete ingestion & log source
        self._ingestion_dao.delete_with_log_source(
            app_log_ingestion, log_source_table_name, log_source
        )
        ingestion_list: List[
            AppLogIngestion
        ] = self._ingestion_dao.list_app_log_ingestions(
            Attr("status").eq("ACTIVE").__and__(Attr("input.name").eq("syslog"))
        )
        if len(ingestion_list) == 0:
            self.delete_syslog_nlb()
        stack_id = app_log_ingestion.stackId
        if stack_id:
            args = {
                "stackId": stack_id,
                "deployAccountId": log_source.accountId,  # Syslog will be in the same account and region
                "deployRegion": log_source.region,
            }
            # Start the pipeline flow
            exec_sfn_flow(sfn, state_machine_arn, app_log_ingestion.id, "STOP", args)
