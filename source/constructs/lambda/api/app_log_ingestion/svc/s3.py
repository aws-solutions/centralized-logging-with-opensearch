# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import os
import logging
from typing import List
from commonlib import AWSConnection, APIException, ErrorCode
from commonlib.dao import AppLogIngestionDao
from commonlib.utils import create_stack_name
from util.utils import exec_sfn_flow
from commonlib.model import (
    AppPipeline,
    BufferParam,
    LogSource,
    LogSourceTypeEnum,
    S3IngestionMode,
    AppLogIngestion,
    StatusEnum,
)

logger = logging.getLogger()
logger.setLevel(logging.INFO)

stack_prefix = os.environ.get("STACK_PREFIX", "CL")
ecs_cluster_name = os.environ.get("ECS_CLUSTER_NAME")
log_agent_vpc_id = os.environ.get("LOG_AGENT_VPC_ID")
log_agent_subnet_ids = os.environ.get("LOG_AGENT_SUBNETS_IDS")  # Private subnets
state_machine_arn = os.environ.get("STATE_MACHINE_ARN")

log_source_table_name = os.environ.get("LOG_SOURCE_TABLE_NAME")

conn = AWSConnection()
sfn = conn.get_client("stepfunctions")


class S3SourceHandler:
    def __init__(self, ingestion_dao: AppLogIngestionDao):
        self._ingestion_dao = ingestion_dao

    def create_s3_ingestion(
        self,
        app_log_ingestion: AppLogIngestion,
        log_source: LogSource,
        app_pipeline: AppPipeline,
    ):
        if log_source.type != LogSourceTypeEnum.S3:
            raise APIException(
                ErrorCode.VALUE_ERROR,
                f"The log source type must be s3, but current type is {log_source.type}.",
            )

        if not log_source.s3:
            raise APIException(
                ErrorCode.VALUE_ERROR, "The log source s3 config is empty."
            )

        aws_partition = (
            "aws-cn" if os.environ.get("AWS_REGION", "").startswith("cn-") else "aws"
        )

        pipeline_buffer_layer_is_log_source_bucket = (
            app_pipeline.bufferResourceName == log_source.s3.bucketName
        )

        log_source.s3.keyPrefix = log_source.s3.keyPrefix.lstrip("/")

        if log_source.s3.mode == S3IngestionMode.ONE_TIME:
            app_log_ingestion = self._ingestion_dao.save(app_log_ingestion)
            sfn_args = {
                "stackName": create_stack_name(
                    id=log_source.sourceId, pattern="AppIngestion-S3"
                ),
                "pattern": "S3SourceStack",
                "deployAccountId": log_source.accountId,
                "deployRegion": log_source.region,
                "parameters": self.mk_cfn_params(
                    {
                        "SourceBucketArn": f"arn:{aws_partition}:s3:::{log_source.s3.bucketName}",
                        "DestinationQueueArn": app_pipeline.queueArn,
                        "ProcessorRoleArn": app_pipeline.logProcessorRoleArn,
                        "SourceBucketKeyPrefix": log_source.s3.keyPrefix,
                        "SourceBucketKeySuffix": log_source.s3.keySuffix,
                        "ECSClusterName": str(ecs_cluster_name),
                        "ECSVpcId": str(log_agent_vpc_id),
                        "ECSSubnets": str(log_agent_subnet_ids),
                        "ShouldAttachPolicy": str(
                            not pipeline_buffer_layer_is_log_source_bucket
                        ),
                    }
                ),
            }
            exec_sfn_flow(
                sfn, state_machine_arn, app_log_ingestion.id, "START", sfn_args
            )

        elif log_source.s3.mode == S3IngestionMode.ON_GOING:
            params_dict = params_to_kv(app_pipeline.bufferParams)
            if (
                pipeline_buffer_layer_is_log_source_bucket
                and log_source.s3.keyPrefix == params_dict.get("logBucketPrefix", "")
                and log_source.s3.keySuffix == params_dict.get("logBucketSuffix", "")
            ):
                # fmt: off
                if len(self._ingestion_dao.get_app_log_ingestions_by_pipeline_id(app_pipeline.pipelineId)) > 0:
                    raise APIException(ErrorCode.ITEM_ALREADY_EXISTS, r"${common:error.ingestionAlreadyExists}")
                # fmt: on
                else:
                    app_log_ingestion.status = StatusEnum.ACTIVE
                    app_log_ingestion = self._ingestion_dao.save(app_log_ingestion)
            else:
                app_log_ingestion = self._ingestion_dao.save(app_log_ingestion)
                sfn_args = {
                    "stackName": create_stack_name(
                        id=log_source.sourceId, pattern="AppIngestion-S3"
                    ),
                    "pattern": "S3SourceStack",
                    "deployAccountId": log_source.accountId,
                    "deployRegion": log_source.region,
                    "parameters": self.mk_cfn_params(
                        {
                            "SourceBucketArn": f"arn:{aws_partition}:s3:::{log_source.s3.bucketName}",
                            "DestinationQueueArn": app_pipeline.queueArn,
                            "ProcessorRoleArn": app_pipeline.logProcessorRoleArn,
                            "SourceBucketKeyPrefix": log_source.s3.keyPrefix,
                            "SourceBucketKeySuffix": log_source.s3.keySuffix,
                            "ECSClusterName": "",
                            "ECSVpcId": "",
                            "ECSSubnets": "",
                        }
                    ),
                }
                exec_sfn_flow(
                    sfn, state_machine_arn, app_log_ingestion.id, "START", sfn_args
                )

    def mk_cfn_params(self, params: dict):
        return [
            {
                "ParameterKey": k,
                "ParameterValue": v,
            }
            for k, v in params.items()
        ]

    def delete_ingestion(
        self, log_source: LogSource, app_log_ingestion: AppLogIngestion
    ):
        """Delete a S3 source sub stack"""
        logger.info("delete a S3 source sub stack")
        stack_id = app_log_ingestion.stackId
        if stack_id:
            # Delete ingestion & log source
            self._ingestion_dao.delete_with_log_source(
                app_log_ingestion, log_source_table_name, log_source
            )
            args = {
                "stackId": stack_id,
                "deployAccountId": log_source.accountId,
                "deployRegion": log_source.region,
            }
            # Start the pipeline flow
            exec_sfn_flow(sfn, state_machine_arn, app_log_ingestion.id, "STOP", args)
        else:
            self._ingestion_dao.update_app_log_ingestion(
                app_log_ingestion.id, status=StatusEnum.INACTIVE
            )


def params_to_kv(params: List[BufferParam]) -> dict:
    d = {}
    for p in params:
        d[p.paramKey] = p.paramValue
    return d
