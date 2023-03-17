# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import boto3
import os
import logging
import json

from datetime import datetime
from botocore import config

from boto3.dynamodb.conditions import Attr
from aws_svc_mgr import SvcManager, Boto3API
from util.log_agent_helper import IngestionTask

logger = logging.getLogger()
logger.setLevel(logging.INFO)

solution_version = os.environ.get("SOLUTION_VERSION", "v1.0.0")
solution_id = os.environ.get("SOLUTION_ID", "SO8025")
user_agent_config = {
    "user_agent_extra": f"AwsSolution/{solution_id}/{solution_version}"
}
default_config = config.Config(**user_agent_config)
default_region = os.environ.get("AWS_REGION")

# Get SSM resource
ssm_log_config_document_name = os.environ.get("SSM_LOG_CONFIG_DOCUMENT_NAME")

# Get Lambda resource
awslambda = boto3.client("lambda", config=default_config)

# Get DDB resource.
dynamodb = boto3.resource("dynamodb", config=default_config)
instance_meta_table_name = os.environ.get("INSTANCE_META_TABLE_NAME")
app_pipeline_table_name = os.environ.get("APP_PIPELINE_TABLE_NAME")
app_log_config_table_name = os.environ.get("APP_LOG_CONFIG_TABLE_NAME")
instance_group_table_name = os.environ.get("INSTANCE_GROUP_TABLE_NAME")
app_log_ingestion_table_name = os.environ.get("APPLOGINGESTION_TABLE")
ec2_log_source_table_name = os.environ.get("EC2_LOG_SOURCE_TABLE_NAME")
s3_log_source_table_name = os.environ.get("S3_LOG_SOURCE_TABLE_NAME")
eks_cluster_log_source_table_name = os.environ.get("EKS_CLUSTER_SOURCE_TABLE_NAME")
sqs_event_table_name = os.environ.get("SQS_EVENT_TABLE")

instance_meta_table = dynamodb.Table(instance_meta_table_name)
app_pipeline_table = dynamodb.Table(app_pipeline_table_name)
app_log_config_table = dynamodb.Table(app_log_config_table_name)
instance_group_table = dynamodb.Table(instance_group_table_name)
app_log_ingestion_table = dynamodb.Table(app_log_ingestion_table_name)
ec2_log_source_table = dynamodb.Table(ec2_log_source_table_name)
s3_log_source_table = dynamodb.Table(s3_log_source_table_name)
eks_cluster_log_source_table = dynamodb.Table(eks_cluster_log_source_table_name)
sqs_event_table = dynamodb.Table(sqs_event_table_name)
log_source_table = dynamodb.Table(os.environ.get("LOG_SOURCE_TABLE_NAME"))

sts = boto3.client("sts", config=default_config)
elb = boto3.client("elbv2", config=default_config)
account_id = sts.get_caller_identity()["Account"]


class IngestionMapping:
    def __init__(self, pipeline_id, ingestion_id, conf_id):
        self._pipeline_id = pipeline_id
        self._ingestion_id = ingestion_id
        self._conf_id = conf_id

    def __hash__(self):
        return hash(self._pipeline_id + self._ingestion_id + self._conf_id)

    def __eq__(self, other):
        if (
            self._pipeline_id == other.pipelineId
            and self._ingestion_id == other.ingestionId
            and self._conf_id == other.configId
        ):
            return True
        else:
            return False


class EC2LogIngestionSvc:
    def __init__(self, sub_account_id=account_id, region=default_region) -> None:
        self._svc_mgr = SvcManager()
        self._ssm = self._svc_mgr.get_client(
            sub_account_id=sub_account_id,
            region=region,
            service_name="ssm",
            type=Boto3API.CLIENT,
        )
        link_account = self._svc_mgr.get_link_account(sub_account_id, region)
        if link_account:
            self._ssm_log_config_document_name = link_account["agentConfDoc"]
        else:
            self._ssm_log_config_document_name = ssm_log_config_document_name

    @staticmethod
    def apply_app_log_ingestion_for_new_added_instances(
        dedupe_set, group_id, instance_set
    ):
        relation_set = dedupe_set
        for instance in instance_set:
            for relation in relation_set:
                current_conf = app_log_config_table.get_item(
                    Key={"id": relation._conf_id}
                )["Item"]
                is_multiline = True if current_conf.get("multilineLogParser") else False
                if current_conf.get("timeKey"):
                    ingestion_task = IngestionTask(
                        "FluentBit",
                        group_id,
                        relation._conf_id,  # configId
                        relation._pipeline_id,  # pipelineId
                        relation._ingestion_id,  # ingestionId
                        is_multiline,  # is_multiline
                        current_conf["timeKey"],  # timeKey
                        instance,
                    )
                else:
                    ingestion_task = IngestionTask(
                        "FluentBit",
                        group_id,
                        relation._conf_id,  # configId
                        relation._pipeline_id,  # pipelineId
                        relation._ingestion_id,  # ingestionId
                        is_multiline,  # is_multiline
                        "",  # timeKey
                        instance,
                    )
                ingestion_task.create_ingestion_to_added_instance()

    @staticmethod
    def remove_app_log_ingestion_from_new_removed_instances(group_id, instance_set):
        for instance in instance_set:
            ingestion_task = IngestionTask(
                "FluentBit",
                group_id,
                "",  # configId
                "",  # pipelineId
                "",  # ingestionId
                "",  # is_multiline
                "",  # timeKey
                instance,
            )
            ingestion_task.delete_ingestion_for_deleted_instance()

    @staticmethod
    def get_current_ingestion_relationship_from_instance_meta(group_id):
        """Get the mapping of pipeline config and ingestion"""
        conditions = Attr("groupId").eq(group_id)
        resp = instance_meta_table.scan(
            FilterExpression=conditions,
            ProjectionExpression="appPipelineId, confId, #groupId, logIngestionId, #status",
            ExpressionAttributeNames={"#groupId": "groupId", "#status": "status"},
        )
        results = resp["Items"]
        dedupe_set = set()
        logger.info(results)
        """ Create the relation set and auto deduplicate using set()"""
        for result in results:
            if result["status"] == "INACTIVE":
                continue
            ingestion_config_mapping_tri = IngestionMapping(
                result["appPipelineId"], result["logIngestionId"], result["confId"]
            )
            dedupe_set.add(ingestion_config_mapping_tri)
        logger.info("Relation from meta table")
        logger.info(dedupe_set)
        return dedupe_set

    @staticmethod
    def does_event_already_exist(message_id):
        response = sqs_event_table.get_item(Key={"id": message_id})
        if "Item" not in response:
            return False
        else:
            return True

    @staticmethod
    def create_sqs_event_record(message):
        message_id = message["messageId"]
        message_body = json.loads(message["body"])
        group_id = message_body["arguments"]["groupId"]
        instance_set = set(message_body["arguments"]["instanceSet"])
        action = message_body["info"]["fieldName"]
        region = message["awsRegion"]
        status = "CREATING"
        sqs_event_table.put_item(
            Item={
                "id": message_id,
                "action": action,
                "groupId": group_id,
                "instanceSet": instance_set,
                "region": region,
                "status": status,
                "createdDt": datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
            }
        )

    @staticmethod
    def update_sqs_event_record(message_id, status):
        sqs_event_table.update_item(
            Key={"id": message_id},
            UpdateExpression="SET #status = :status, #updatedDt= :uDt",
            ExpressionAttributeNames={
                "#status": "status",
                "#updatedDt": "updatedDt",
            },
            ExpressionAttributeValues={
                ":status": status,
                ":uDt": datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
            },
        )
