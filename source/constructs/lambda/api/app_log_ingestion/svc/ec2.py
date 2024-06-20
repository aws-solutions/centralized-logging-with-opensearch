# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import os
from commonlib.logging import get_logger


from boto3.dynamodb.conditions import Attr
from typing import Set, List
from commonlib.dao import InstanceDao, InstanceIngestionDetailDao
from commonlib import AWSConnection, LinkAccountHelper
from flb.distribution import FlbHandler
from commonlib.model import (
    LogSource,
    LogSourceTypeEnum,
    GroupTypeEnum,
    StatusEnum,
    AppLogIngestion,
    InstanceIngestionDetail,
    LogTypeEnum,
)
from commonlib.exception import APIException, ErrorCode
from svc.ec2_attach_iam_instance_profile import attach_permission_to_instance

logger = get_logger(__name__)

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

instance_ingestion_detail_table_name = os.environ.get(
    "INSTANCE_INGESTION_DETAIL_TABLE_NAME"
)
instance_ingestion_detail_dao = InstanceIngestionDetailDao(
    table_name=instance_ingestion_detail_table_name
)


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
        if (
            log_source.type == LogSourceTypeEnum.EC2
            and log_source.ec2.groupType == GroupTypeEnum.EC2
        ):
            associate_instance_profile_arn = link_account.get(
                "subAccountIamInstanceProfileArn",
                os.environ["EC2_IAM_INSTANCE_PROFILE_ARN"],
            )
            sts_role_arn = link_account.get("subAccountRoleArn", "")
            app_log_ingestion_id = ""
            if app_log_ingestion and app_log_ingestion.autoAddPermission:
                attach_permission_to_instance(
                    list(instance_id_set), associate_instance_profile_arn, sts_role_arn
                )
                app_log_ingestion_id = app_log_ingestion.id

            self.save_instance_ingestion_details(
                app_log_ingestion_id, instance_id_set, log_source
            )
        self.generate_flb_conf(instance_with_ingestion_list, link_account)

    def save_instance_ingestion_details(
        self, app_log_ingestion_id, instance_id_set: Set[str], log_source: LogSource
    ):
        if len(instance_id_set) > 0:
            instance_ingestion_details = []
            for instance_id in instance_id_set:
                instance_ingestion_detail_dict = {
                    "ingestionId": app_log_ingestion_id,
                    "instanceId": instance_id,
                    "sourceId": log_source.sourceId,
                    "accountId": log_source.accountId,
                    "region": log_source.region,
                    "status": StatusEnum.DISTRIBUTING,
                }
                instance_ingestion_detail: InstanceIngestionDetail = (
                    InstanceIngestionDetail(**instance_ingestion_detail_dict)
                )
                instance_ingestion_details.append(instance_ingestion_detail)
            instance_ingestion_detail_dao.batch_put_items(instance_ingestion_details)

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
        self.save_instance_ingestion_details(
            app_log_ingestion.id, instance_id_set, log_source
        )
        # ASG & EC2:1.generate flb config 2.upload flb config to s3
        link_account = account_helper.get_link_account(
            log_source.accountId, log_source.region
        )
        self.generate_flb_conf(instance_with_ingestion_list, link_account)
        self._ingestion_dao.update_app_log_ingestion(
            app_log_ingestion.id, status=StatusEnum.INACTIVE
        )

    def check_duplicated_win_event_log(self, source_id, app_pipeline_id: str):
        applog_ingestion_list = (
            self._ingestion_dao.get_app_log_ingestions_by_pipeline_id(app_pipeline_id)
        )
        for applog_ingestion in applog_ingestion_list:
            if (applog_ingestion.sourceId == source_id) and (
                applog_ingestion.logConfig.logType == LogTypeEnum.WINDOWS_EVENT
            ):
                raise APIException(
                    ErrorCode.ITEM_ALREADY_EXISTS,
                    r"${common:error.ingestionAlreadyExists}",
                )
