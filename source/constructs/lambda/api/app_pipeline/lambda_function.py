# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import json
import logging
import os
from typing import List
import uuid
import gzip
import base64


from boto3.dynamodb.conditions import Attr
from botocore.exceptions import ClientError
from commonlib import AWSConnection, handle_error, AppSyncRouter, DynamoDBUtil
from commonlib.utils import (
    create_stack_name,
    paginate,
    exec_sfn_flow as do_exec_sfn_flow,
)
from commonlib.exception import APIException, ErrorCode
from commonlib.model import (
    AppPipeline,
    BufferParam,
    BufferTypeEnum,
    CompressionType,
    LogConfig,
    LogTypeEnum,
    PipelineAlarmStatus,
    StatusEnum,
    EngineType,
    AgentTypeEnum,
)
from commonlib.dao import AppLogIngestionDao, AppPipelineDao, LogConfigDao, ETLLogDao
from util.utils import make_index_template, get_json_schema


logger = logging.getLogger()
logger.setLevel(logging.INFO)

stateMachine_arn = os.environ.get("STATE_MACHINE_ARN") or ""
app_pipeline_table_name = os.environ.get("APPPIPELINE_TABLE")
app_log_ingestion_table_name = os.environ.get("APPLOGINGESTION_TABLE")
log_config_table_name = os.environ.get("LOG_CONFIG_TABLE")

etl_log_table_name = os.environ["ETLLOG_TABLE"]

metadata_table_name = os.environ["METADATA_TABLE"]
metadata_table = DynamoDBUtil(table_name=metadata_table_name)

grafana_table_name = os.environ.get("GRAFANA_TABLE")
grafana_ddb_util = DynamoDBUtil(grafana_table_name)

current_account_id = os.environ.get("ACCOUNT_ID")
current_region = os.environ.get("REGION")
current_partition = os.environ.get("PARTITION")

conn = AWSConnection()
router = AppSyncRouter()

dynamodb = conn.get_client("dynamodb", client_type="resource")
sfn = conn.get_client("stepfunctions")
kds = conn.get_client("kinesis")
iam = conn.get_client("iam")
glue = conn.get_client("glue")

app_pipeline_table = dynamodb.Table(app_pipeline_table_name)
app_log_ingestion_table = dynamodb.Table(app_log_ingestion_table_name)


def dict_to_gzip_base64(d: dict) -> str:
    return base64.b64encode(gzip.compress(json.dumps(d).encode())).decode("utf8")


@handle_error
def lambda_handler(event, context):
    logger.info("Received event: " + json.dumps(event, indent=2))
    return router.resolve(event)


def get_glue_table_info(app_pipeline: AppPipeline) -> dict:
    glue_table_info = {}

    import_dashboards = app_pipeline.lightEngineParams.importDashboards.lower()
    if import_dashboards == "true":
        grafana_info = grafana_ddb_util.get_item(
            key={"id": app_pipeline.lightEngineParams.grafanaId}
        )

    centralized_database_name = metadata_table.get_item(
        key={"metaName": "CentralizedDatabase"}
    )["name"]

    table_and_dashboard_four_tuple = (
        (
            "table",
            app_pipeline.lightEngineParams.centralizedTableName,
            f"{app_pipeline.pipelineId}-00",
            f"{app_pipeline.lightEngineParams.centralizedTableName}-details",
        ),
        (
            "metric",
            app_pipeline.lightEngineParams.centralizedMetricsTableName,
            None,
            None,
        ),
    )

    for (
        key,
        table_name,
        dashboard_uid,
        dashboard_name,
    ) in table_and_dashboard_four_tuple:
        try:
            if not table_name:
                continue
            response = glue.get_table(
                DatabaseName=centralized_database_name,
                Name=table_name,
            )
            glue_table_info[key] = {
                "databaseName": centralized_database_name,
                "tableName": table_name,
                "location": response["Table"]["StorageDescriptor"]["Location"],
                "classification": response["Table"]["Parameters"].get(
                    "classification", "parquet"
                ),
            }
            if import_dashboards == "true" and dashboard_uid is not None:
                glue_table_info[key]["dashboardName"] = dashboard_name
                glue_table_info[key][
                    "dashboardLink"
                ] = f"{grafana_info['url'].rstrip('/')}/d/{dashboard_uid}"
        except Exception as e:
            logger.warning(e)

    return glue_table_info


def get_scheduler_expression(name: str, group: str, client) -> str:
    try:
        if client._service_model._service_name == "events":
            return client.describe_rule(Name=name, EventBusName=group)[
                "ScheduleExpression"
            ]
        elif client._service_model._service_name == "scheduler":
            return client.get_schedule(GroupName=group, Name=name)["ScheduleExpression"]
    except Exception as e:
        logger.warning(e)
    return ""


def get_schedules_info(app_pipeline: AppPipeline) -> list:
    schedules_info = []
    available_services = metadata_table.get_item(key={"metaName": "AvailableServices"})[
        "value"
    ]

    if "scheduler" in available_services:
        scheduler_type = "EventBridgeScheduler"
        scheduler = conn.get_client("scheduler")
    else:
        scheduler_type = "EventBridgeEvents"
        scheduler = conn.get_client("events")

    for meta_name, schedule_name in (
        ("LogProcessor", "LogProcessor"),
        ("LogMerger", "LogMerger"),
        ("LogMerger", "LogMergerForMetrics"),
        ("LogArchive", "LogArchive"),
        ("LogArchive", "LogArchiveForMetrics"),
    ):
        meta_schedule = metadata_table.get_item(key={"metaName": meta_name})
        if scheduler_type == "EventBridgeScheduler":
            name = schedule_name
            group = app_pipeline.pipelineId
        else:
            name = (
                f"{schedule_name}-{app_pipeline.lightEngineParams.centralizedTableName}"
            )
            group = "default"
        schedule_expression = get_scheduler_expression(
            name=name, group=group, client=scheduler
        )
        schedule = {
            "type": schedule_name,
            "stateMachine": {
                "arn": meta_schedule["arn"],
                "name": meta_schedule["name"],
            },
            "scheduler": {
                "type": scheduler_type,
                "group": group,
                "name": name,
                "expression": schedule_expression,
            },
        }
        if meta_name == "LogMerger":
            schedule["scheduler"]["age"] = app_pipeline.lightEngineParams.logMergerAge
        elif meta_name == "LogArchive":
            schedule["scheduler"]["age"] = app_pipeline.lightEngineParams.logArchiveAge

        if schedule_expression != "":
            schedules_info.append(schedule)
    return schedules_info


@router.route(field_name="getLightEngineAppPipelineExecutionLogs")
def get_light_engine_app_pipeline_logs(**args):
    pipeline_id = args["pipelineId"]
    state_machine_name = args["stateMachineName"]
    schedule_type = args["type"]
    pipeline_index_key = (
        f"{pipeline_id}:{schedule_type}:00000000-0000-0000-0000-000000000000"
    )

    etl_log_dao = ETLLogDao(etl_log_table_name)
    response = etl_log_dao.query_execution_logs(
        pipeline_index_key=pipeline_index_key,
        start_time=args.get("startTime"),
        end_time=args.get("endTime"),
        status=args.get("status"),
        limit=args.get("limit", 10),
        last_evaluated_key=args.get("lastEvaluatedKey"),
    )

    execution_tasks = {}
    execution_tasks["items"] = response["Items"]
    if response.get("LastEvaluatedKey"):
        execution_tasks["lastEvaluatedKey"] = response["LastEvaluatedKey"]

    for item in execution_tasks["items"]:
        item[
            "executionArn"
        ] = f'arn:{current_partition}:states:{current_region}:{current_account_id}:execution:{state_machine_name}:{item["executionName"]}'
        item.pop("pipelineIndexKey", None)

    return execution_tasks


@router.route(field_name="getLightEngineAppPipelineDetail")
def get_light_engine_app_pipeline_detail(**args):
    app_pipeline_detail = {
        "analyticsEngine": {
            "engineType": EngineType.LIGHT_ENGINE,
        },
        "schedules": [],
    }

    pipeline_id = args.get("pipelineId")
    if not pipeline_id:
        raise KeyError(f"Missing required parameter: pipelineId.")

    app_pipeline_dao = AppPipelineDao(app_pipeline_table_name)
    app_pipeline = app_pipeline_dao.get_app_pipeline(id=pipeline_id)

    app_pipeline_detail["analyticsEngine"].update(
        get_glue_table_info(app_pipeline=app_pipeline)
    )
    app_pipeline_detail["schedules"] = get_schedules_info(app_pipeline=app_pipeline)

    return app_pipeline_detail


@router.route(field_name="createLightEngineAppPipeline")
def create_light_engine_app_pipeline(**args):
    pipeline_id = str(uuid.uuid4())
    params = args.get("params")
    tags = args.get("tags") or []
    monitor = args.get("monitor")
    buffer_params = args.get("bufferParams", [])
    log_config_id = args.get("logConfigId")
    log_config_version_number = args.get("logConfigVersionNumber")
    app_pipeline_dao = AppPipelineDao(app_pipeline_table_name)
    log_config_dao = LogConfigDao(log_config_table_name)

    buffer_access_role_name = f"CL-buffer-access-{pipeline_id}"
    create_role_response = iam.create_role(
        RoleName=buffer_access_role_name,
        AssumeRolePolicyDocument=json.dumps(
            {
                "Version": "2012-10-17",
                "Statement": [
                    {
                        "Effect": "Allow",
                        "Principal": {"AWS": current_account_id},
                        "Action": "sts:AssumeRole",
                    }
                ],
            }
        ),
    )
    stack_name = create_stack_name("AppPipe", pipeline_id)
    params["stagingBucketPrefix"] = f"AppLogs/{stack_name}"

    logging_bucket_name = [
        param["paramValue"]
        for param in buffer_params
        if param["paramKey"] == "logBucketName"
    ][0]
    logging_bucket_prefix = [
        param["paramValue"]
        for param in buffer_params
        if param["paramKey"] == "logBucketPrefix"
    ][0]

    app_pipeline = AppPipeline(
        pipelineId=pipeline_id,
        bufferType=BufferTypeEnum.S3,
        bufferParams=buffer_params,
        lightEngineParams=params,
        logConfigId=log_config_id,
        logConfigVersionNumber=log_config_version_number,
        tags=tags,
        monitor=monitor,
        engineType=EngineType.LIGHT_ENGINE,
        bufferAccessRoleName=create_role_response["Role"]["RoleName"],
        bufferAccessRoleArn=create_role_response["Role"]["Arn"],
        bufferResourceArn=f"arn:{current_partition}:s3:::{logging_bucket_name}",
        bufferResourceName=logging_bucket_name,
    )

    sns_arn = ""
    if app_pipeline.monitor.pipelineAlarmStatus == PipelineAlarmStatus.ENABLED:
        if app_pipeline.monitor.snsTopicArn:
            sns_arn = app_pipeline.monitor.snsTopicArn
        else:
            sns_arn = f"arn:{current_partition}:sns:{current_region}:{current_account_id}:{app_pipeline.monitor.snsTopicName}_{pipeline_id[:8]}"

    app_pipeline.lightEngineParams.recipients = sns_arn

    agent_type = AgentTypeEnum.FLUENT_BIT
    for param in buffer_params:
        if param["paramKey"] == "isS3Source" and param["paramValue"].lower() == "true":
            agent_type = AgentTypeEnum.NONE
    log_config = log_config_dao.get_log_config(
        app_pipeline.logConfigId, app_pipeline.logConfigVersionNumber
    )
    log_config.jsonSchema = get_json_schema(
        log_conf=log_config, engine_type=EngineType.LIGHT_ENGINE, agent_type=agent_type
    )

    grafana = None
    if app_pipeline.lightEngineParams.grafanaId:
        grafana = grafana_ddb_util.get_item(
            {"id": app_pipeline.lightEngineParams.grafanaId}
        )
    parameters = app_pipeline_dao.get_light_engine_stack_parameters(
        app_pipeline=app_pipeline, log_config=log_config, grafana=grafana
    )
    pattern = app_pipeline_dao.get_stack_name(app_pipeline)

    iam.put_role_policy(
        RoleName=app_pipeline.bufferAccessRoleName,
        PolicyName=f"{stack_name}-AllowBufferAccess",
        PolicyDocument=json.dumps(
            {
                "Version": "2012-10-17",
                "Statement": [
                    {
                        "Sid": "AllowPutToBuffer",
                        "Effect": "Allow",
                        "Action": "s3:PutObject",
                        "Resource": f"{app_pipeline.bufferResourceArn}/{os.path.normpath(logging_bucket_prefix)}/*",
                    }
                ],
            }
        ),
    )

    sfn_args = {
        "stackName": stack_name,
        "pattern": pattern,
        "parameters": parameters,
        "engineType": EngineType.LIGHT_ENGINE,
        "ingestion": {
            "id": str(uuid.uuid4()),
            "role": "",
            "pipelineId": app_pipeline.pipelineId,
            "bucket": logging_bucket_name,
            "prefix": logging_bucket_prefix,
        },
    }

    # Start the pipeline flow
    exec_sfn_flow(app_pipeline.pipelineId, "START", sfn_args)

    app_pipeline_dao.save(app_pipeline)

    return app_pipeline.pipelineId


@router.route(field_name="createAppPipeline")
def create_app_pipeline(**args):
    buffer_type = args.get("bufferType")
    buffer_params = args.get("bufferParams")
    aos_params = args.get("aosParams")
    log_config_id = args.get("logConfigId")
    log_config_version_number = args.get("logConfigVersionNumber")
    force = args.get("force")
    monitor = args.get("monitor")
    osi = args.get("osiParams")
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
        engineType=EngineType.OPEN_SEARCH,
        tags=tags,
        monitor=monitor,
        osiParams=osi,
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
                "ParameterKey": "streamName",
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

        if app_pipeline.osiParams != None:
            if (
                app_pipeline.osiParams.maxCapacity != 0
                and app_pipeline.osiParams.minCapacity != 0
            ):
                parameters += [
                    {
                        "ParameterKey": "maxCapacity",
                        "ParameterValue": str(app_pipeline.osiParams.maxCapacity),
                    },
                    {
                        "ParameterKey": "minCapacity",
                        "ParameterValue": str(app_pipeline.osiParams.minCapacity),
                    },
                    {
                        "ParameterKey": "pipelineTableArn",
                        "ParameterValue": app_pipeline_table.table_arn,
                    },
                    {
                        "ParameterKey": "osiPipelineName",
                        "ParameterValue": app_pipeline.pipelineId,
                    },
                ]
        else:
            parameters += [
                {
                    "ParameterKey": "logProcessorRoleName",
                    "ParameterValue": role_name,
                },
                {
                    "ParameterKey": "queueName",
                    "ParameterValue": sqs_name,
                },
            ]

        is_s3_source = find_in_buffer_params(app_pipeline.bufferParams, "isS3Source")
        if is_s3_source:
            parameters += [
                {
                    "ParameterKey": "configJSON",
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
        "engineType": EngineType.OPEN_SEARCH,
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


def safe_delete_role(iam_client, role_name):
    try:
        response = iam_client.list_role_policies(RoleName=role_name)
        inline_policy_names = response["PolicyNames"]
    except iam_client.exceptions.NoSuchEntityException:
        return

    for policy_name in inline_policy_names:
        iam_client.delete_role_policy(RoleName=role_name, PolicyName=policy_name)

    # List attached policies
    attached_policies = iam_client.list_attached_role_policies(RoleName=role_name)[
        "AttachedPolicies"
    ]

    # Detach all attached policies
    for policy in attached_policies:
        policy_arn = policy["PolicyArn"]
        iam_client.detach_role_policy(RoleName=role_name, PolicyArn=policy_arn)

    iam_client.delete_role(RoleName=role_name)


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
        safe_delete_role(iam, app_pipeline.bufferAccessRoleName)

    stack_id = app_pipeline.stackId
    if stack_id:
        args = {"stackId": stack_id}
        # Start the pipeline flow
        exec_sfn_flow(id, "STOP", args)

    app_pipeline_dao.update_app_pipeline(id, status=StatusEnum.DELETING)


@router.route(field_name="checkOSIAvailability")
def check_osi_availability():
    logger.info("Check if OSI is available in the current region: %s.", current_region)
    try:
        # Try get OSI services linked role
        resp = iam.get_role(
            RoleName="AWSServiceRoleForAmazonOpenSearchIngestionService"
        )
        logger.info(resp)
        return True
    except Exception as e:
        logger.info(e)

    return False


def exec_sfn_flow(id: str, action="START", args=None):
    do_exec_sfn_flow(sfn, stateMachine_arn, id, action, args)


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
