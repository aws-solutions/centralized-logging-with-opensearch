# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import json
import logging
import os
from typing import List
import uuid
import gzip
import base64
from datetime import datetime


from boto3.dynamodb.conditions import Attr
from botocore.exceptions import ClientError
from commonlib import AWSConnection, handle_error, AppSyncRouter
from commonlib.utils import create_stack_name, paginate
from commonlib.exception import APIException, ErrorCode
from commonlib.model import (
    AppPipeline,
    BufferParam,
    BufferTypeEnum,
    CompressionType,
    LogConfig,
    LogTypeEnum,
    PipelineMonitorStatus,
    StatusEnum,
)
from commonlib.dao import AppLogIngestionDao, AppPipelineDao, LogConfigDao
from util.utils import make_index_template


logger = logging.getLogger()
logger.setLevel(logging.INFO)

stateMachine_arn = os.environ.get("STATE_MACHINE_ARN") or ""
app_pipeline_table_name = os.environ.get("APPPIPELINE_TABLE")
app_log_ingestion_table_name = os.environ.get("APPLOGINGESTION_TABLE")
log_config_table_name = os.environ.get("LOG_CONFIG_TABLE")

conn = AWSConnection()
router = AppSyncRouter()

dynamodb = conn.get_client("dynamodb", client_type="resource")
sfn = conn.get_client("stepfunctions")
kds = conn.get_client("kinesis")
iam = conn.get_client("iam")

app_pipeline_table = dynamodb.Table(app_pipeline_table_name)
app_log_ingestion_table = dynamodb.Table(app_log_ingestion_table_name)


def dict_to_gzip_base64(d: dict) -> str:
    return base64.b64encode(gzip.compress(json.dumps(d).encode())).decode("utf8")


@handle_error
def lambda_handler(event, context):
    logger.info("Received event: " + json.dumps(event, indent=2))
    return router.resolve(event)


@router.route(field_name="createAppPipeline")
def create_app_pipeline(**args):
    buffer_type = args.get("bufferType")
    buffer_params = args.get("bufferParams")
    aos_params = args.get("aosParams")
    log_config_id = args.get("logConfigId")
    log_config_version_number = args.get("logConfigVersionNumber")
    force = args.get("force")
    monitor = args.get("monitor")
    tags = args.get("tags") or []

    app_pipeline_dao = AppPipelineDao(app_pipeline_table_name)
    log_config_dao = LogConfigDao(log_config_table_name)

    index_prefix = str(aos_params["indexPrefix"])

    app_pipeline = AppPipeline(
        indexPrefix=index_prefix,
        bufferType=buffer_type,
        aosParams=aos_params,
        bufferParams=buffer_params,
        logConfigId=log_config_id,
        logConfigVersionNumber=log_config_version_number,
        tags=tags,
        monitor=monitor,
    )
    app_pipeline_dao.validate(app_pipeline, force=force)

    log_config = log_config_dao.get_log_config(
        app_pipeline.logConfigId, app_pipeline.logConfigVersionNumber
    )

    index_template = make_index_template(
        log_config=log_config,
        index_alias=index_prefix,
        number_of_shards=app_pipeline.aosParams.shardNumbers,
        number_of_replicas=app_pipeline.aosParams.replicaNumbers,
        codec=app_pipeline.aosParams.codec,
        refresh_interval=app_pipeline.aosParams.refreshInterval,
    )

    index_template_gzip_base64 = dict_to_gzip_base64(index_template)

    parameters = app_pipeline_dao.get_stack_parameters(app_pipeline) + [
        {
            "ParameterKey": "indexTemplateGzipBase64",
            "ParameterValue": index_template_gzip_base64,
        }
    ]

    parts = stateMachine_arn.split(":")
    partition = parts[1]
    region = parts[3]
    account_id = parts[4]

    buffer_access_role_name = f"CL-buffer-access-{app_pipeline.pipelineId}"
    create_role_response = iam.create_role(
        RoleName=buffer_access_role_name,
        AssumeRolePolicyDocument=json.dumps(
            {
                "Version": "2012-10-17",
                "Statement": [
                    {
                        "Effect": "Allow",
                        "Principal": {"AWS": account_id},
                        "Action": "sts:AssumeRole",
                    }
                ],
            }
        ),
    )
    app_pipeline.bufferAccessRoleName = create_role_response["Role"]["RoleName"]
    app_pipeline.bufferAccessRoleArn = create_role_response["Role"]["Arn"]

    parameters += [
        {
            "ParameterKey": "bufferAccessRoleArn",
            "ParameterValue": app_pipeline.bufferAccessRoleArn,
        },
        {
            "ParameterKey": "logType",
            "ParameterValue": log_config.logType,
        },
    ]

    if app_pipeline.bufferType == BufferTypeEnum.KDS:
        kds_name = f"CL-kds-{app_pipeline.pipelineId}"

        # fmt: off
        app_pipeline.bufferResourceArn = f"arn:{partition}:kinesis:{region}:{account_id}:stream/{kds_name}"
        app_pipeline.bufferResourceName = kds_name
        # fmt: on

        parameters += [
            {
                "ParameterKey": "StreamName",
                "ParameterValue": kds_name,
            },
        ]

    if app_pipeline.bufferType == BufferTypeEnum.S3:
        role_name = f"CL-log-processor-{app_pipeline.pipelineId}"
        sqs_name = f"CL-sqs-{app_pipeline.pipelineId}"
        # fmt: off
        app_pipeline.logProcessorRoleArn = f"arn:{partition}:iam::{account_id}:role/{role_name}"
        app_pipeline.queueArn = f"arn:{partition}:sqs:{region}:{account_id}:{sqs_name}"
        # fmt: on

        kv = params_to_kv(parameters)

        parameters += [
            {
                "ParameterKey": "LogProcessorRoleName",
                "ParameterValue": role_name,
            },
            {
                "ParameterKey": "QueueName",
                "ParameterValue": sqs_name,
            },
        ]

        is_s3_source = find_in_buffer_params(app_pipeline.bufferParams, "isS3Source")
        if is_s3_source:
            parameters += [
                {
                    "ParameterKey": "ConfigJSON",
                    "ParameterValue": json.dumps(
                        {
                            "parser": "json"
                            if log_config.logType == LogTypeEnum.JSON
                            else "regex",
                            "regex": log_config.regex,
                            "time_key": log_config.timeKey,
                            "time_format": get_time_format(log_config),
                            "time_offset": log_config.timeOffset,
                            "is_gzip": find_in_buffer_params(
                                app_pipeline.bufferParams, "compressionType"
                            )
                            == CompressionType.GZIP,
                        }
                    ),
                },
            ]

        app_pipeline.bufferResourceArn = f"arn:{partition}:s3:::{kv['logBucketName']}"
        app_pipeline.bufferResourceName = kv["logBucketName"]

    # Check which CloudFormation template to use
    pattern = app_pipeline_dao.get_stack_name(app_pipeline)

    sfn_args = {
        "stackName": create_stack_name("AppPipe", app_pipeline.pipelineId),
        "pattern": pattern,
        "parameters": parameters,
    }

    # Start the pipeline flow
    exec_sfn_flow(app_pipeline.pipelineId, "START", sfn_args)

    app_pipeline_dao.save(app_pipeline)

    return app_pipeline.pipelineId


def app_pipeline_to_dict(p: AppPipeline, log_config_dao: LogConfigDao) -> dict:
    config = log_config_dao.get_log_config(p.logConfigId, p.logConfigVersionNumber)
    ret = p.dict()
    ret["logConfig"] = config.dict()
    return ret


@router.route(field_name="listAppPipelines")
def list_app_pipelines(status: str = "", page=1, count=20):
    """List app pipelines"""
    logger.info(
        f"List AppPipeline from DynamoDB in page {page} with {count} of records"
    )
    """ build filter conditions """

    app_pipeline_dao = AppPipelineDao(app_pipeline_table_name)
    log_config_dao = LogConfigDao(log_config_table_name)

    pipelines = app_pipeline_dao.list_app_pipelines(
        Attr("status").eq(status) if status else None
    )

    pipelines.sort(key=lambda p: p.createdAt, reverse=False)

    total, pipelines = paginate(
        [app_pipeline_to_dict(i, log_config_dao) for i in pipelines],
        page=page,
        count=count,
    )

    return {
        "total": total,
        "appPipelines": pipelines,
    }


# obtain the app pipeline details and kds details
@router.route(field_name="getAppPipeline")
def get_app_pipeline(id: str):
    app_pipeline_dao = AppPipelineDao(app_pipeline_table_name)
    log_config_dao = LogConfigDao(log_config_table_name)

    item = app_pipeline_to_dict(app_pipeline_dao.get_app_pipeline(id), log_config_dao)

    # If buffer is KDS, then
    # Get up-to-date shard count and consumer count.
    if item.get("bufferType") == "KDS" and item.get("bufferResourceName"):
        stream_name = item["bufferResourceName"]
        try:
            kds_resp = kds.describe_stream_summary(StreamName=stream_name)
            logger.info(f"kds_resp is {kds_resp}")
            if "StreamDescriptionSummary" in kds_resp:
                summary = kds_resp["StreamDescriptionSummary"]
                item["bufferParams"].append(
                    {
                        "paramKey": "OpenShardCount",
                        "paramValue": summary.get("OpenShardCount"),
                    }
                )
                item["bufferParams"].append(
                    {
                        "paramKey": "ConsumerCount",
                        "paramValue": summary.get("ConsumerCount"),
                    }
                )
        except ClientError as ex:
            if ex.response["Error"]["Code"] == "ResourceNotFoundException":
                logger.error(f"Kinesis Data Stream not found right now: {ex}")
            else:
                raise ex

    # Get the error log prefix
    item["monitor"]["errorLogPrefix"] = get_error_export_info(item)

    return item


@router.route(field_name="deleteAppPipeline")
def delete_app_pipeline(id: str):
    """set status to INACTIVE in AppPipeline table"""
    logger.info("Update AppPipeline Status in DynamoDB")

    app_pipeline_dao = AppPipelineDao(app_pipeline_table_name)
    app_pipeline = app_pipeline_dao.get_app_pipeline(id)

    app_log_ingestion = AppLogIngestionDao(app_log_ingestion_table_name)
    ingestions = app_log_ingestion.list_app_log_ingestions(
        Attr("status").ne(StatusEnum.INACTIVE)
        & Attr("appPipelineId").eq(app_pipeline.pipelineId)
    )

    if len(ingestions) > 0:
        raise APIException(
            ErrorCode.UNSUPPORTED_ACTION_HAS_INGESTION,
            "Please open the pipeline and delete all log sources first.",
        )

    if app_pipeline.bufferAccessRoleName:
        response = iam.list_role_policies(RoleName=app_pipeline.bufferAccessRoleName)
        inline_policy_names = response["PolicyNames"]

        for policy_name in inline_policy_names:
            iam.delete_role_policy(
                RoleName=app_pipeline.bufferAccessRoleName, PolicyName=policy_name
            )

        iam.delete_role(RoleName=app_pipeline.bufferAccessRoleName)

    stack_id = app_pipeline.stackId
    if stack_id:
        args = {"stackId": stack_id}
        # Start the pipeline flow
        exec_sfn_flow(id, "STOP", args)

    app_pipeline_dao.update_app_pipeline(id, status=StatusEnum.DELETING)


def exec_sfn_flow(id: str, action="START", args=None):
    """Helper function to execute a step function flow"""
    logger.info(f"Execute Step Function Flow: {stateMachine_arn}")

    if args is None:
        args = {}

    input_args = {
        "id": id,
        "action": action,
        "args": args,
    }

    sfn.start_execution(
        name=f"{id}-{action}",
        stateMachineArn=stateMachine_arn,
        input=json.dumps(input_args),
    )


def _get_pattern_by_buffer(buffer_type, enable_autoscaling="True"):
    if buffer_type == "S3":
        return "AppLogS3Buffer"
    elif buffer_type == "MSK":
        return "AppLogMSKBuffer"
    elif buffer_type == "KDS":
        if enable_autoscaling.lower() != "false":
            return "AppLogKDSBuffer"
        else:
            return "AppLogKDSBufferNoAutoScaling"
    else:
        return "AppLog"


def get_error_export_info(pipeline_item: dict):
    """Generate processor error log location."""
    index_prefix = pipeline_item.get("indexPrefix")
    return f"error/APPLogs/index-prefix={index_prefix}/"


def find_in_buffer_params(params: List[BufferParam], key: str):
    for p in params:
        if p.paramKey == key:
            return p.paramValue
    return ""


def params_to_kv(lst) -> dict:
    d = {}
    for each in lst:
        d[each["ParameterKey"]] = each["ParameterValue"]
    return d


def get_time_format(log_config: LogConfig):
    for each in log_config.regexFieldSpecs:
        if each.format:
            return each.format
    return ""
