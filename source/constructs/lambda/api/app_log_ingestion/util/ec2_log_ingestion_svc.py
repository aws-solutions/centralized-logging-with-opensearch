# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import boto3
import os
import logging
import json

from datetime import datetime
from botocore import config

from boto3.dynamodb.conditions import Attr
from util.aws_svc_mgr import SvcManager, Boto3API
from util.log_agent_helper import IngestionTask

logger = logging.getLogger()
logger.setLevel(logging.INFO)

solution = os.environ.get("SOLUTION",
                          "SO8025/" + os.environ["SOLUTION_VERSION"])
user_agent_config = {"user_agent_extra": f"AwsSolution/{solution}"}
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
eks_cluster_log_source_table = dynamodb.Table(
    eks_cluster_log_source_table_name)
sqs_event_table = dynamodb.Table(sqs_event_table_name)
log_source_table = dynamodb.Table(os.environ.get("LOG_SOURCE_TABLE_NAME"))

sts = boto3.client("sts", config=default_config)
elb = boto3.client("elbv2", config=default_config)
account_id = sts.get_caller_identity()["Account"]

class IngestionMapping():
    def __init__(self, pipelineId, ingestionId, configId):
        self.pipelineId = pipelineId
        self.ingestionId = ingestionId
        self.configId = configId

    def __hash__(self):
        return hash(self.pipelineId+self.ingestionId+self.configId)

    def __eq__(self, other):
        if self.pipelineId == other.pipelineId and self.ingestionId == other.ingestionId and self.configId == other.configId:
            return True
        else:
            return False

class EC2LogIngestionSvc:

    def __init__(self,
                 sub_account_id=account_id,
                 region=default_region) -> None:
        self._svcMgr = SvcManager()
        self._ssm = self._svcMgr.get_client(
            sub_account_id=sub_account_id,
            region=region,
            service_name="ssm",
            type=Boto3API.CLIENT,
        )
        link_account = self._svcMgr.get_link_account(sub_account_id, region)
        if link_account:
            self._ssm_log_config_document_name = link_account["agentConfDoc"]
        else:
            self._ssm_log_config_document_name = ssm_log_config_document_name

    def apply_app_log_ingestion_for_new_added_instances(dedupe_set, groupId, instanceSet):
        relation_set = dedupe_set
        for instance in instanceSet:
            for relation in relation_set:
                current_conf = app_log_config_table.get_item(Key={"id": relation.configId})["Item"]
                is_multiline = True if current_conf.get("multilineLogParser") else False
                ingestion_task = IngestionTask('FluentBit', 
                                                groupId,
                                                relation.configId, #configId
                                                relation.pipelineId, #pipelineId
                                                relation.ingestionId, #ingestionId
                                                is_multiline, #is_multiline
                                                current_conf['timeKey'], #timeKey
                                                instance)
                ingestion_task.create_ingestion_to_added_instance()

    def remove_app_log_ingestion_from_new_removed_instances(groupId, instanceSet):
        for instance in instanceSet:
            ingestion_task = IngestionTask('FluentBit', 
                                            groupId,
                                            '', #configId置空
                                            '', #pipelineId置空 
                                            '', #ingestionId置空
                                            '', #is_multiline置空
                                            '', #timeKey置空
                                            instance)
            ingestion_task.delete_ingestion_for_deleted_instance()

    def get_current_ingestion_relationship_from_instance_meta(groupId):
        """
        Get the mapping of pipeline config and ingestion
        """
        conditions = Attr('groupId').eq(groupId)
        resp = instance_meta_table.scan(
            FilterExpression=conditions,
            ProjectionExpression="appPipelineId, confId, #groupId, logIngestionId, #status",
            ExpressionAttributeNames={
                '#groupId': 'groupId',
                '#status': 'status'
            },
        )
        results = resp['Items']
        dedupe_set = set()
        logger.info(results)
        """ Create the relation set and auto deduplicate using set()"""
        for result in results:
            if result["status"] == "INACTIVE":
                continue
            ingestion_config_mapping_tri = IngestionMapping(result['appPipelineId'], result['logIngestionId'], result['confId'])
            dedupe_set.add(ingestion_config_mapping_tri)
        logger.info("Relation from meta table")
        logger.info(dedupe_set)
        return dedupe_set
    
    def does_event_already_exist(messageId):
        response = sqs_event_table.get_item(Key={"id": messageId})
        if "Item" not in response:
            return False
        else:
            return True

    def create_sqs_event_record(message):
        messageId = message['messageId']
        messageBody = json.loads(message['body'])
        groupId = messageBody['arguments']['groupId']
        instanceSet = set(messageBody['arguments']['instanceSet'])
        action = messageBody['info']['fieldName']
        region = message['awsRegion']
        status = 'CREATING'
        response = sqs_event_table.put_item(
            Item={
                "id": messageId,
                "action": action,
                "groupId": groupId,
                "instanceSet": instanceSet,
                "region": region,
                "status": status,
                "createdDt": datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
            })

    def update_sqs_event_record(messageId, status):
        sqs_event_table.update_item(
            Key={"id": messageId},
            UpdateExpression=
            "SET #status = :status, #updatedDt= :uDt",
            ExpressionAttributeNames={
                "#status": "status",
                "#updatedDt": "updatedDt",
            },
            ExpressionAttributeValues={
                ":status": status,
                ":uDt": datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
            },
        )