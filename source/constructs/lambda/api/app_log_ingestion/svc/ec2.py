# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import os
import logging
import time

from boto3.dynamodb.conditions import Attr
from commonlib.dao import InstanceDao
from commonlib.exception import APIException, ErrorCode
from typing import Set, List
from commonlib import AWSConnection, LinkAccountHelper
from flb.distribution import FlbHandler
from commonlib.model import (
    LogSource,
    LogSourceTypeEnum,
    GroupTypeEnum,
    StatusEnum,
    AppLogIngestion,
)
from svc.ec2_attach_iam_instance_profile import attach_permission_to_instance

logger = logging.getLogger()
logger.setLevel(logging.INFO)

instance_table_name = os.environ.get("INSTANCE_TABLE_NAME")
instance_dao = InstanceDao(table_name=instance_table_name)

conn = AWSConnection()
# Get S3 resource
s3 = conn.get_client("s3")


# Get SSM resource
ssm_log_config_document_name = os.environ.get("SSM_LOG_CONFIG_DOCUMENT_NAME")
# link account
sub_account_link_table_name = os.environ.get("SUB_ACCOUNT_LINK_TABLE_NAME")
account_helper = LinkAccountHelper(sub_account_link_table_name)


class SSMSendCommandStatus:
    def __init__(self, status, status_details):
        self._status = status
        self._status_details = status_details


class EC2SourceHandler(FlbHandler):
    
    def create_ingestion(
        self, log_source: LogSource, app_log_ingestion: AppLogIngestion
    ):
        # append ingestion id into instance
        instance_id_set: Set[str] = instance_dao.get_instance_set_by_source_id(
            log_source.sourceId
        )
        self.create_ingestion_by_instance_id_set(
            log_source, instance_id_set, app_log_ingestion
        )

    def get_instance_ingestion(self, instance_id: str):
        instances = instance_dao.get_instance_by_instance_id(instance_id)
        ingestion_ids: List[str] = []
        for instance in instances:
            ingestion_ids.extend(instance.ingestionIds)
        # get ingestion list
        ingestion_list = list()
        if len(ingestion_ids) > 0:
            ingestion_list = self._ingestion_dao.list_app_log_ingestions(
                Attr("id")
                .is_in(ingestion_ids)
                .__and__(Attr("status").ne(StatusEnum.INACTIVE))
            )
        return ingestion_list

    def create_ingestion_by_instance_id_set(
        self,
        log_source: LogSource,
        instance_id_set: Set[str],
        app_log_ingestion: AppLogIngestion,
    ):
        instance_with_ingestion_list = dict()
        for instance_id in instance_id_set:
            instance_dao.add_ingestion_into_instance(
                instance_id, log_source.sourceId, app_log_ingestion.id
            )
            instance_with_ingestion_list[instance_id] = self.get_instance_ingestion(
                instance_id
            )

        trust_account_set = [log_source.accountId]
        self.update_role_policy(
            trust_account_set,
            log_source.region,
            app_log_ingestion.output.roleName,
            app_log_ingestion.output.roleArn,
        )
        # update status to DISTRIBUTING
        self._ingestion_dao.update_app_log_ingestion(
            app_log_ingestion.id, status=StatusEnum.DISTRIBUTING
        )

        self.generate_flb_config_to_s3(
            log_source, instance_id_set, instance_with_ingestion_list, app_log_ingestion
        )

        # update status to ACTIVE
        app_log_ingestion.status = StatusEnum.ACTIVE
        self._ingestion_dao.update_app_log_ingestion(
            app_log_ingestion.id, status=StatusEnum.ACTIVE
        )

    def generate_flb_config_to_s3(
        self,
        log_source: LogSource,
        instance_id_set: Set[str],
        instance_with_ingestion_list,
        app_log_ingestion: AppLogIngestion,
    ):
        # ASG & EC2:1.generate flb config 2.upload flb config to s3
        link_account = account_helper.get_link_account(
            log_source.accountId, log_source.region
        )
        self.generate_flb_conf(instance_with_ingestion_list, link_account)

        if (
            log_source.type == LogSourceTypeEnum.EC2
            and log_source.ec2.groupType == GroupTypeEnum.EC2
        ):
            associate_instance_profile_arn = link_account.get(
                "subAccountIamInstanceProfileArn",
                os.environ["EC2_IAM_INSTANCE_PROFILE_ARN"],
            )
            sts_role_arn = link_account.get("subAccountRoleArn", "")
            if app_log_ingestion and app_log_ingestion.autoAddPermission:
                attach_permission_to_instance(
                    list(instance_id_set), associate_instance_profile_arn, sts_role_arn
                )

    def delete_ingestion(
        self, log_source: LogSource, app_log_ingestion: AppLogIngestion
    ):
        self._ingestion_dao.update_app_log_ingestion(
            app_log_ingestion.id, status=StatusEnum.DELETING
        )
        instance_id_set: Set[str] = instance_dao.get_instance_set_by_source_id(
            log_source.sourceId
        )
        instance_with_ingestion_list = dict()
        for instance_id in instance_id_set:
            instance_dao.remove_ingestion_from_instance(
                instance_id, log_source.sourceId, app_log_ingestion.id
            )
            instance_with_ingestion_list[instance_id] = self.get_instance_ingestion(
                instance_id
            )
        # ASG & EC2:1.generate flb config 2.upload flb config to s3
        link_account = account_helper.get_link_account(
            log_source.accountId, log_source.region
        )
        self.generate_flb_conf(instance_with_ingestion_list, link_account)
        self._ingestion_dao.update_app_log_ingestion(
            app_log_ingestion.id, status=StatusEnum.INACTIVE
        )


    def upload_config_to_ec2(self, ssm, group_id, ssm_config_document_name: str, link_account):
        """Upload the config file to EC2 by SSM"""

        res = dict()
        instance_ids = instance_dao.get_instance_set_by_source_id(group_id)
        return self.send_ssm_command_to_instances(
            ssm, instance_ids, ssm_config_document_name, res, link_account
        )


    def refresh_config_to_single_ec2(
        self, ssm, instance_id_set, ssm_config_document_name: str, link_account
    ):
        """Refresh the config file to EC2 by SSM"""

        res = dict()
        return self.send_ssm_command_to_instances(
            ssm, instance_id_set, ssm_config_document_name, res, link_account
        )
    
    def get_instance_arch(self, instance_id: str, link_account) -> str:
        ec2 = conn.get_client(
            service_name="ec2",
            region_name=link_account.get("region"),
            sts_role_arn=link_account.get("subAccountRoleArn"),
        )
    
        # Get EC2 resource
        describe_instance_response = ec2.describe_instances(InstanceIds=[instance_id])
        reservations = describe_instance_response["Reservations"][0]
        instances = reservations["Instances"][0]
        architecture = instances["Architecture"]
        
        arch_append = ""
        if architecture == "arm64":
            arch_append = "-arm64"
        return arch_append


    def send_ssm_command_to_instances(
        self, ssm, instance_ids, ssm_config_document_name: str, res_dict, link_account
    ):
        for instance_id in instance_ids:
            # send the run command to ec2
            invocation_response = ""
            try:
                ssm_response = self.ssm_send_command(
                    ssm, instance_id, ssm_config_document_name, self.get_instance_arch(instance_id=instance_id, link_account=link_account)
                )
                time.sleep(20)
                ssm_command_id = ssm_response["Command"]["CommandId"]
                invocation_response = ssm.list_command_invocations(
                    CommandId=ssm_command_id, Details=True
                )
                logger.info("Distribution triggered for instance: %s, command: %s", instance_id, ssm_command_id)
            except Exception as e:
                logger.error("Error: %s", e)
                logger.info("Instance: %s might have been terminated.", instance_id)
            send_command_status = SSMSendCommandStatus(
                "",
                "",
            )
            if invocation_response != "":
                command_status = invocation_response.get("CommandInvocations")[0].get(
                    "Status"
                )
                command_status_detail = invocation_response.get("CommandInvocations")[
                    0
                ].get("StatusDetails")
                send_command_status = SSMSendCommandStatus(
                    command_status,
                    command_status_detail,
                )
                logger.info(
                    "send_command_status.status: %s", send_command_status._status
                )
                logger.info(
                    "send_command_status.status_details: %s",
                    send_command_status._status_details,
                )
            if send_command_status._status == "Failed":
                self.retry_failed_attach_policy_command(
                    ssm, instance_id, ssm_config_document_name, link_account
                )
            res_dict[str(instance_id)] = send_command_status
        return res_dict

    def retry_failed_attach_policy_command(
        self, ssm, instance_id, ssm_config_document_name: str, link_account
    ):
        for i in range(10):
            invocation_response = ""
            logger.info(
                "Retry sending ssm command: %s, the %d time",
                ssm_config_document_name,
                i + 1,
            )
            try:
                ssm_response = self.retry_ssm_command(
                    ssm, instance_id, ssm_config_document_name, link_account
                )
                time.sleep(2)
                ssm_command_id = ssm_response["Command"]["CommandId"]
                invocation_response = ssm.list_command_invocations(
                    CommandId=ssm_command_id, Details=True
                )
            except Exception:
                logger.info("Instance: %s might have been terminated.", instance_id)
                continue
            if invocation_response != "":
                command_status = invocation_response.get("CommandInvocations")[0].get(
                    "Status"
                )
                command_status_detail = invocation_response.get("CommandInvocations")[
                    0
                ].get("StatusDetails")
                logger.info("Command status: %s", command_status)
                send_command_status = SSMSendCommandStatus(
                    command_status,
                    command_status_detail,
                )
            if send_command_status._status == "Success":
                continue
            logger.info(
                "Retry finished, the status is still %s", send_command_status._status
            )

    def retry_ssm_command(self, ssm, instance_id, ssm_config_document_name: str, link_account):
        """Retry ssm command"""
        ssm_response = ""
        ssm_response = self.ssm_send_command(ssm, instance_id, ssm_config_document_name, self.get_instance_arch(instance_id=instance_id, link_account=link_account))
        return ssm_response

    def ssm_send_command(self, ssm, instance_id, document_name: str, arch: str) -> str:
        """
        Run the document in SSM to download the log config file in EC2
        :param instance_id:
        :return:
        """
        logger.info("Run SSM documentation on instance %s" % instance_id)
        
        response = ssm.send_command(
            InstanceIds=[instance_id],
            DocumentName=document_name,
            Parameters={"INSTANCEID": [instance_id], "ARCHITECTURE": [arch],},
        )
        logger.info("Triggered log config downloading to EC2 successfully")
        return response
