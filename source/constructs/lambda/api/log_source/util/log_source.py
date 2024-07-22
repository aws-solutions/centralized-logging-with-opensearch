# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0


from commonlib.logging import get_logger
import os
import sys
import uuid
from datetime import datetime

from boto3.dynamodb.conditions import Attr

from commonlib import DynamoDBUtil
from commonlib.account import LinkAccountHelper
from commonlib.dao import InstanceDao, LogSourceDao
from commonlib.utils import paginate
from commonlib.exception import APIException, ErrorCode
from commonlib.model import StatusEnum, GroupPlatformEnum

from util.eks import EksClusterUtil

logger = get_logger(__name__)


log_source_table_name = os.getenv("LOG_SOURCE_TABLE_NAME")
instance_table = os.getenv("INSTANCE_TABLE_NAME")
app_ingestion_table_name = os.getenv("APP_LOG_INGESTION_TABLE_NAME")

link_account_table_name = os.environ.get("SUB_ACCOUNT_LINK_TABLE_NAME")
account_helper = LinkAccountHelper(link_account_table_name)
data_format = "%Y-%m-%dT%H:%M:%SZ"


class LogSource:
    """Base Log Source Class represent a certain type of Log source only

    This class can handle common CRUD operations of log source records

    But each operations can also be overwrited to fit business needs.
    """

    # Type used for filter from table
    type = "Common"

    def __init__(self) -> None:
        self._ddb_util = DynamoDBUtil(log_source_table_name)
        self._pk = "sourceId"

    def get_log_source(self, source_id: str) -> dict:
        """Query Log Source by source_id"""
        key = {self._pk: source_id}
        item = self._ddb_util.get_item(key, raise_if_not_found=True)
        return item

    def list_log_sources(self, page: int, count: int) -> dict:
        """Scan a list of Log Sources for current type"""
        # Scan from log source table
        filter_expression = Attr("status").ne("INACTIVE") & Attr("type").eq(self.type)

        items = self._ddb_util.list_items(filter_expression=filter_expression)
        total, sources = paginate(items, page, count)
        return {
            "logSources": sources,
            "total": total,
        }

    def create_log_source(self, **args) -> str:
        """Create Log Source for current type"""

        source_id = str(uuid.uuid4())
        args[self._pk] = source_id
        args["createdAt"] = datetime.utcnow().strftime(data_format)
        args["updatedAt"] = datetime.utcnow().strftime(data_format)
        args["status"] = "ACTIVE"
        if not args.get("accountId"):
            args["accountId"] = account_helper.default_account_id
        if not args.get("region"):
            args["region"] = account_helper.default_region
        # Here we have to remove the null object to avoid check failed in commonlib dao.
        args_without_none = {k: v for k, v in args.items() if v is not None}
        self._ddb_util.put_item(args_without_none)
        return source_id

    def delete_log_source(self, source_id: str) -> str:
        """Delete Log Source for current type

        This is to set the status as INACTIVE (soft delete)
        """
        # Check if the log source is in use in ingestions
        ingestion_ddb_util = DynamoDBUtil(app_ingestion_table_name)
        ingestions = ingestion_ddb_util.query_items(
            key={self._pk: source_id}, index_name="SourceToIngestionIndex"
        )
        active_ingestions = [
            ingestion
            for ingestion in ingestions
            if ingestion.get("status") != StatusEnum.INACTIVE
        ]
        if active_ingestions:
            raise APIException(
                ErrorCode.UNSUPPORTED_ACTION_SOURCE_HAS_INGESTION,
                "Cannot delete the source while it's still in use in ingestions",
            )
        # If not used, perform soft delete.
        item = self._ddb_util.get_item(key={self._pk: source_id})

        item["status"] = StatusEnum.INACTIVE
        item["updatedAt"] = datetime.utcnow().strftime(data_format)

        # Update item
        self._ddb_util.put_item(item)

        return "OK"

    def update_log_source(self, **args) -> str:
        raise APIException(ErrorCode.UNSUPPORTED_ACTION)


class EC2LogSource(LogSource):
    type = "EC2"

    def __init__(self) -> None:
        super().__init__()

        self._instance_ddb_util = DynamoDBUtil(instance_table)
        self._index_name = "SourceToInstanceIndex"
        self._dao = LogSourceDao(
            log_source_table_name, instance_dao=InstanceDao(instance_table)
        )

    def create_log_source(self, **args):
        ec2_source_info = args.get("ec2")
        if not ec2_source_info:
            raise APIException(
                ErrorCode.INVALID_ITEM, "Missing required info for EC2 source type"
            )
        # Group type can be EC2 or ASG
        # Scan from log source table
        filter_expression = (
            Attr("status").ne("INACTIVE")
            & Attr("type").eq(args.get("type"))
            & Attr("accountId").eq(
                args.get("accountId") or account_helper.default_account_id
            )
            & Attr("region").eq(args.get("region") or account_helper.default_region)
            & Attr("ec2.groupName").eq(ec2_source_info.get("groupName"))
        )
        items = self._dao.list_log_sources(filter_expression=filter_expression)
        if len(items) > 0:
            raise APIException(
                ErrorCode.ITEM_ALREADY_EXISTS, r"${common:error.logSourceAlreadyExists}"
            )
        instances = ec2_source_info.pop("instances", [])
        source_id = super().create_log_source(**args)
        self._batch_add_instances(
            source_id,
            ec2_source_info.get("groupPlatform", GroupPlatformEnum.LINUX),
            instances,
        )
        return source_id

    def _batch_add_instances(
        self, source_id, group_platform: GroupPlatformEnum, instances
    ):
        log_source = self._dao.get_log_source(id=source_id)
        existed_instances = []
        new_add_instances = []
        for instance in instances:
            if instance in log_source.ec2.instances:
                existed_instances.append(instance["instanceId"])
                continue

            instance["id"] = instance["instanceId"]
            instance["sourceId"] = source_id
            instance["platformType"] = group_platform
            instance["createdAt"] = datetime.utcnow().strftime(data_format)
            instance["updatedAt"] = instance["createdAt"]
            del instance["instanceId"]
            new_add_instances.append(instance)
        if len(existed_instances) > 0:
            raise APIException(
                ErrorCode.ITEM_ALREADY_EXISTS,
                r"${common:error.instanceAlreadyExists}" + f"{existed_instances}",
            )
        self._instance_ddb_util.batch_put_items(new_add_instances)

    def _batch_delete_instances(self, source_id, instances):
        keys = []
        for instance in instances:
            keys.append(
                {
                    "id": instance.get("id") or instance.get("instanceId"),
                    self._pk: source_id,
                }
            )

        self._instance_ddb_util.batch_delete_items(keys)

    def update_log_source(self, **args) -> str:
        """Support add/remove of instances to an existing instance group"""
        ec2_source_info = args.get("ec2")
        if not ec2_source_info:
            raise APIException(
                ErrorCode.INVALID_ITEM, "Missing required info for EC2 source type"
            )
        # The log source must exist
        source_id = args.get("sourceId")
        item = self._ddb_util.get_item(
            key={self._pk: source_id}, raise_if_not_found=True
        )
        # Not supported if status is inactive (deleted)
        if item["status"] != "ACTIVE":
            raise APIException(ErrorCode.ITEM_NOT_FOUND, "Log source is not found")

        # Not supported if group type is ASG
        group_type = ec2_source_info.get("groupType", "EC2")
        if group_type != "EC2":
            raise APIException(
                ErrorCode.UNSUPPORTED_ACTION,
                "Cannot Add/Remove instances for this type of source",
            )
        source_id = item[self._pk]
        instances = ec2_source_info.get("instances", [])

        # Depends on whether action is ADD or REMOVE
        if args["action"] == "ADD":
            self._batch_add_instances(
                source_id, item["ec2"]["groupPlatform"], instances
            )
        else:
            self._batch_delete_instances(source_id, instances)

        return "OK"

    def delete_log_source(self, source_id: str):
        super().delete_log_source(source_id)

        # For ec2, also need to delete the instances form instance table
        instances = self._instance_ddb_util.query_items(
            key={self._pk: source_id}, index_name=self._index_name
        )
        self._batch_delete_instances(source_id, instances)

        return "OK"

    def get_log_source(self, source_id: str) -> dict:
        return self._dao.get_log_source(source_id).dict()


class SyslogLogSource(LogSource):
    type = "Syslog"


class EKSClusterLogSource(LogSource):
    type = "EKSCluster"

    def create_log_source(self, **args) -> str:
        eks_source_info = args.get("eks")
        if not eks_source_info:
            raise APIException(
                ErrorCode.INVALID_ITEM, "Missing required info for EKS source type"
            )
        # Scan from log source table
        filter_expression = (
            Attr("status").ne("INACTIVE")
            & Attr("type").eq(args.get("type"))
            & Attr("accountId").eq(
                args.get("accountId") or account_helper.default_account_id
            )
            & Attr("region").eq(args.get("region") or account_helper.default_region)
            & Attr("eks.eksClusterName").eq(eks_source_info.get("eksClusterName"))
        )

        items = self._ddb_util.list_items(filter_expression=filter_expression)
        if len(items) > 0:
            raise APIException(ErrorCode.EKS_CLUSTER_ALREADY_IMPORTED)

        account = account_helper.get_link_account(
            args.get("accountId"), args.get("region")
        )
        sts_role_arn = account.get("subAccountRoleArn", "")
        eks_util = EksClusterUtil(sts_role_arn)

        # enrich eks cluster info
        eks_cluster_name = eks_source_info.get("eksClusterName")
        cluster_info = eks_util.describe_cluster(eks_cluster_name)
        agent_role_arn = eks_util.create_agent_role(
            oidc_provider_arn=cluster_info["oidcArn"],
            oidc_provider_url=cluster_info["oidcIssuer"],
        )
        eks_source_info["logAgentRoleArn"] = agent_role_arn
        args["eks"] = eks_source_info | cluster_info
        return super().create_log_source(**args)


class S3LogSource(LogSource):
    type = "S3"


class LogSourceUtil:
    @staticmethod
    def get_source(type) -> LogSource:
        log_source = getattr(sys.modules[__name__], type + "LogSource", None)
        return log_source()
