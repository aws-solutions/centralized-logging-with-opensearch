# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import json
from commonlib.logging import get_logger
import os
from typing import List, Union
import uuid
import gzip
import yaml
import base64

from boto3.dynamodb.conditions import Attr
from botocore.exceptions import ClientError
from commonlib import AWSConnection, handle_error, AppSyncRouter, DynamoDBUtil
from commonlib.utils import (
    create_stack_name,
    paginate,
    exec_sfn_flow as do_exec_sfn_flow,
    get_kv_from_buffer_param,
    set_kv_to_buffer_param,
)
from commonlib.exception import APIException, ErrorCode, IssueCode, Issue
from commonlib.model import (
    AppPipeline,
    BufferParam,
    BufferTypeEnum,
    CompressionType,
    LogConfig,
    LogEventQueueType,
    LogTypeEnum,
    PipelineAlarmStatus,
    LightEngineParams,
    StatusEnum,
    EngineType,
    LogStructure,
    IndexSuffix,
    CodecEnum,
    LogSourceTypeEnum,
    SvcPipeline,
)
from commonlib.dao import (
    AppLogIngestionDao,
    AppPipelineDao,
    LogConfigDao,
    ETLLogDao,
    OpenSearchDomainDao,
    LogSourceDao,
    SvcPipelineDao,
)
from commonlib.aws import (
    get_bucket_location,
)
from util.utils import make_index_template, get_json_schema

import yaml
import boto3
import requests
from datetime import datetime
from requests_aws4auth import AWS4Auth


logger = get_logger(__name__)

default_logging_bucket = os.environ.get("DEFAULT_LOGGING_BUCKET")
default_cmk_arn = os.environ.get("DEFAULT_CMK_ARN")
stateMachine_arn = os.environ.get("STATE_MACHINE_ARN") or ""
app_pipeline_table_name = os.environ.get("APPPIPELINE_TABLE")
svc_pipeline_table_name = os.environ["SVC_PIPELINE_TABLE_NAME"]
app_log_ingestion_table_name = os.environ.get("APPLOGINGESTION_TABLE")
log_config_table_name = os.environ.get("LOG_CONFIG_TABLE")
cluster_table_name = os.environ.get("CLUSTER_TABLE")
log_source_table_name = os.getenv("LOG_SOURCE_TABLE_NAME")

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
lambda_client = conn.get_client("lambda")
sfn = conn.get_client("stepfunctions")
kds = conn.get_client("kinesis")
iam = conn.get_client("iam")
glue = conn.get_client("glue")
sts = conn.get_client("sts")

app_pipeline_table = dynamodb.Table(app_pipeline_table_name)
app_log_ingestion_table = dynamodb.Table(app_log_ingestion_table_name)

OPENSEARCH_MASTER_ROLE_ARN = os.environ["OPENSEARCH_MASTER_ROLE_ARN"]

s3_client = conn.get_client("s3", current_region)


def aos_req_session(creds: dict = {}):
    s = requests.Session()
    s.auth = AWS4Auth(
        refreshable_credentials=boto3.Session(
            aws_access_key_id=creds.get("AccessKeyId"),
            aws_secret_access_key=creds.get("SecretAccessKey"),
            aws_session_token=creds.get("SessionToken"),
        ).get_credentials(),
        service="es",
        region=os.environ.get("AWS_REGION"),
    )
    s.headers.update({"Content-Type": "application/json"})
    return s


def dict_to_gzip_base64(d: dict) -> str:
    return base64.b64encode(gzip.compress(json.dumps(d).encode())).decode("utf8")


@handle_error
def lambda_handler(event, context):
    logger.info(json.dumps(event["arguments"], indent=2))
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
            name = f"{schedule_name}-{app_pipeline.pipelineId}"
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
        item["executionArn"] = (
            f'arn:{current_partition}:states:{current_region}:{current_account_id}:execution:{state_machine_name}:{item["executionName"]}'
        )
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
def put_light_engine_app_pipeline(**args):  # NOSONAR
    pipeline_id = args.get("id", "")
    params = args.get("params", {})
    tags = args.get("tags") or []
    monitor = args.get("monitor")
    buffer_params = args.get("bufferParams", [])
    log_config_id = args.get("logConfigId", "")
    log_config_version_number = args.get("logConfigVersionNumber", "")
    log_structure = args.get("logStructure", LogStructure.FLUENT_BIT_PARSED_JSON)

    params["logMergerSchedule"] = params.get("logMergerSchedule") or "cron(0 1 * * ? *)"
    params["logArchiveSchedule"] = (
        params.get("logArchiveSchedule") or "cron(0 2 * * ? *)"
    )
    params["logMergerAge"] = params.get("logMergerAge") or "7"

    sfn_args = {
        "stackName": "",
        "engineType": EngineType.LIGHT_ENGINE,
    }

    app_pipeline_dao = AppPipelineDao(app_pipeline_table_name)
    log_config_dao = LogConfigDao(log_config_table_name)

    if pipeline_id:
        action = "UPDATE"
        stack_name = create_stack_name("AppPipe", pipeline_id)
        sfn_args["stackName"] = stack_name
        app_pipeline = app_pipeline_dao.get_app_pipeline(id=pipeline_id)
        app_pipeline.logConfigId = log_config_id
        app_pipeline.logConfigVersionNumber = log_config_version_number
        app_pipeline.status = StatusEnum.UPDATING
    else:
        action = "START"
        pipeline_id = str(uuid.uuid4())
        stack_name = create_stack_name("AppPipe", pipeline_id)
        sfn_args["stackName"] = stack_name
        app_pipeline = AppPipeline(
            pipelineId=pipeline_id,
            bufferType=BufferTypeEnum.S3,
            bufferParams=buffer_params,
            logConfigId=log_config_id,
            logConfigVersionNumber=log_config_version_number,
            tags=tags,
            monitor=monitor,
            engineType=EngineType.LIGHT_ENGINE,
            logStructure=log_structure,
            logEventQueueType=LogEventQueueType.EVENT_BRIDGE,
        )

        logging_bucket_name = get_kv_from_buffer_param(
            key="logBucketName", buffer_param=app_pipeline.bufferParams
        )
        logging_bucket_prefix = get_kv_from_buffer_param(
            key="logBucketPrefix", buffer_param=app_pipeline.bufferParams
        )
        context = get_kv_from_buffer_param(
            key="context", buffer_param=app_pipeline.bufferParams
        )
        logging_bucket_prefix = f'{logging_bucket_prefix.strip("/")}/{stack_name}'

        params["stagingBucketPrefix"] = logging_bucket_prefix
        app_pipeline.lightEngineParams = LightEngineParams(**params)
        app_pipeline.bufferParams = set_kv_to_buffer_param(
            key="logBucketPrefix",
            value=logging_bucket_prefix,
            buffer_param=app_pipeline.bufferParams,
        )

        app_pipeline.bufferResourceArn = (
            f"arn:{current_partition}:s3:::{logging_bucket_name}"
        )
        app_pipeline.bufferResourceName = logging_bucket_name

        sns_arn = ""
        if app_pipeline.monitor.pipelineAlarmStatus == PipelineAlarmStatus.ENABLED:
            if app_pipeline.monitor.snsTopicArn:
                sns_arn = app_pipeline.monitor.snsTopicArn
            else:
                sns_arn = f"arn:{current_partition}:sns:{current_region}:{current_account_id}:{app_pipeline.monitor.snsTopicName}_{pipeline_id[:8]}"

        app_pipeline.lightEngineParams.recipients = sns_arn

        if log_structure == LogStructure.FLUENT_BIT_PARSED_JSON:
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

            iam.put_role_policy(
                RoleName=buffer_access_role_name,
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
                            },
                            {
                                "Sid": "AllowAccessKMSKey",
                                "Effect": "Allow",
                                "Action": [
                                    "kms:GenerateDataKey*",
                                    "kms:Decrypt",
                                    "kms:Encrypt",
                                ],
                                "Resource": f"arn:{current_partition}:kms:{current_region}:{current_account_id}:key/*",
                            },
                        ],
                    }
                ),
            )

            app_pipeline.bufferAccessRoleName = create_role_response["Role"]["RoleName"]
            app_pipeline.bufferAccessRoleArn = create_role_response["Role"]["Arn"]

            sfn_args["ingestion"] = {
                "id": str(uuid.uuid4()),
                "role": "",
                "pipelineId": app_pipeline.pipelineId,
                "bucket": logging_bucket_name,
                "prefix": logging_bucket_prefix,
                "context": context or "{}",
                "services": {
                    "s3EventDriver": "EventBridge",
                },
            }

            tag = args.get("tags", [])

            sfn_args["tag"] = tag

    log_config = log_config_dao.get_log_config(
        app_pipeline.logConfigId, app_pipeline.logConfigVersionNumber
    )
    log_config.jsonSchema = get_json_schema(
        log_conf=log_config,
        engine_type=EngineType.LIGHT_ENGINE,
        log_structure=log_structure,
    )

    grafana = None
    if app_pipeline.lightEngineParams.grafanaId:
        grafana = grafana_ddb_util.get_item(
            {"id": app_pipeline.lightEngineParams.grafanaId}
        )

    sfn_args["parameters"] = app_pipeline_dao.get_light_engine_stack_parameters(
        app_pipeline=app_pipeline, log_config=log_config, grafana=grafana
    )
    sfn_args["pattern"] = app_pipeline_dao.get_stack_name(app_pipeline)

    # Start the pipeline flow
    exec_sfn_flow(app_pipeline.pipelineId, action, sfn_args)

    app_pipeline_dao.save(app_pipeline)

    return app_pipeline.pipelineId


def post_simulate_index_template(
    aos_endpoint: str, index_prefix: str, index_template: dict
):
    creds = sts.assume_role(
        RoleArn=OPENSEARCH_MASTER_ROLE_ARN, RoleSessionName="AppPipeline"
    )["Credentials"]
    s = aos_req_session(creds)
    return s.post(
        f"https://{aos_endpoint}/_index_template/_simulate/{index_prefix}-template",
        json=index_template,
        timeout=5,
    )


def try_index_template(
    aos_endpoint: str, index_prefix: str, index_template: dict, fallback_method_fn=None
):
    if not callable(fallback_method_fn):
        fallback_method_fn = lambda: None

    try:
        r = post_simulate_index_template(aos_endpoint, index_prefix, index_template)
    except Exception as e:
        logger.exception(e)
        fallback_method_fn()
    else:
        if r.status_code == 403:
            fallback_method_fn()
        elif r.status_code >= 400:
            err = r.json()["error"]
            raise APIException(
                ErrorCode.VALUE_ERROR,
                f"status_code: {r.status_code} reason: {err['reason']}",
            )


@router.route(field_name="batchExportAppPipelines")
def batch_export_app_pipelines(**args):
    app_pipeline_dao = AppPipelineDao(app_pipeline_table_name)
    app_log_ingestion_dao = AppLogIngestionDao(table_name=app_log_ingestion_table_name)
    log_config_dao = LogConfigDao(table_name=log_config_table_name)
    log_source_dao = LogSourceDao(table_name=log_source_table_name)

    app_pipelines = []
    for app_pipeline_id in args["appPipelineIds"]:
        app_pipeline = app_pipeline_dao.get_app_pipeline(app_pipeline_id)

        if (
            app_pipeline.status in (StatusEnum.INACTIVE, StatusEnum.DELETING)
            or app_pipeline.engineType == EngineType.LIGHT_ENGINE
            or app_pipeline.logStructure != LogStructure.FLUENT_BIT_PARSED_JSON
        ):
            continue

        app_log_ingestions_list = app_log_ingestion_dao.list_app_log_ingestions(
            Attr("status").eq(StatusEnum.ACTIVE)
            & Attr("appPipelineId").eq(app_pipeline.pipelineId)
        )
        log_config = log_config_dao.get_log_config(
            id=app_pipeline.logConfigId, version=app_pipeline.logConfigVersionNumber
        )

        app_pipeline_info = dict(
            id=app_pipeline.pipelineId,
            logConfigName=log_config.name,
            logConfigVersionNumber=log_config.version,
            bufferType=str(app_pipeline.bufferType),
            aosParams=(
                dict(
                    domainName=app_pipeline.aosParams.domainName,
                    indexPrefix=app_pipeline.aosParams.indexPrefix,
                    indexSuffix=app_pipeline.aosParams.indexSuffix,
                    rolloverSize=app_pipeline.aosParams.rolloverSize,
                    codec=str(app_pipeline.aosParams.codec),
                    refreshInterval=app_pipeline.aosParams.refreshInterval,
                    shardNumbers=app_pipeline.aosParams.shardNumbers,
                    replicaNumbers=app_pipeline.aosParams.replicaNumbers,
                    warmLogTransition=app_pipeline.aosParams.warmLogTransition,
                    coldLogTransition=app_pipeline.aosParams.coldLogTransition,
                    logRetention=app_pipeline.aosParams.logRetention,
                )
                if app_pipeline.aosParams is not None
                else None
            ),
            monitor=dict(
                pipelineAlarmStatus=str(app_pipeline.monitor.pipelineAlarmStatus),
                snsTopicArn=app_pipeline.monitor.snsTopicArn,
            ),
        )
        log_sources = []
        for ingestion in app_log_ingestions_list:
            log_source = log_source_dao.get_log_source(ingestion.sourceId)
            if log_source.type not in (
                LogSourceTypeEnum.EC2,
                LogSourceTypeEnum.EKSCluster,
            ):
                continue

            log_sources.append(
                dict(
                    id=ingestion.id,
                    type=str(log_source.type),
                    name=log_source.name,
                    accountId=log_source.accountId,
                    logPath=ingestion.logPath,
                    autoAddPermission=ingestion.autoAddPermission,
                )
            )

        if log_sources:
            app_pipeline_info["logSources"] = log_sources  # type: ignore

        if app_pipeline.bufferType != BufferTypeEnum.NONE:
            app_pipeline_info["bufferParams"] = {
                bufferParam.paramKey: bufferParam.paramValue
                for bufferParam in app_pipeline.bufferParams
                if bufferParam.paramKey not in ("defaultCmkArn", "logBucketSuffix")
            }

        app_pipelines.append(app_pipeline_info)

    yaml_bytes = yaml.dump(
        {"appPipelines": app_pipelines}, sort_keys=False, encoding="utf-8"
    )

    object_key = f"Export/AppPipeline/{datetime.now().strftime('%Y-%m-%d')}/AppPipeline-{uuid.uuid4()}-{datetime.now().strftime('%Y%m%d')}.yaml"
    s3_client.put_object(Body=yaml_bytes, Bucket=default_logging_bucket, Key=object_key)
    presigned_url = s3_client.generate_presigned_url(
        ClientMethod="get_object",
        Params={"Bucket": default_logging_bucket, "Key": object_key},
        ExpiresIn=1800,
    )
    return presigned_url


class AppPipelineAnalyzer:

    def __init__(self, content_string: str):
        self.content_string = content_string

        self.s3_client = conn.get_client("s3")
        self.sns_client = conn.get_client("sns")
        self.aos_client = conn.get_client("opensearch")

        self.app_pipeline_dao = AppPipelineDao(table_name=app_pipeline_table_name)
        self.app_log_ingestion_dao = AppLogIngestionDao(
            table_name=app_log_ingestion_table_name
        )
        self.log_config_dao = LogConfigDao(table_name=log_config_table_name)
        self.log_source_dao = LogSourceDao(table_name=log_source_table_name)
        self.cluster_dao = OpenSearchDomainDao(table_name=cluster_table_name)
        self.aos_dao = OpenSearchDomainDao(table_name=cluster_table_name)

        self.default_logging_bucket = default_logging_bucket
        self.default_cmk_arn = default_cmk_arn

        self.response = {
            "findings": [],
            "resolvers": [],
        }
        self.bucket_notification = {}
        self.error_finding = 0

        try:
            self.content = yaml.safe_load(self.content_string)
        except Exception:
            self.content = {}
            self.add_finding(issue=IssueCode.YAML_SYNTAX_ERROR)

    def add_finding(self, issue: Issue, finding_detail_args: dict = {}, path: str = ""):
        self.response["findings"].append(
            {
                "findingDetails": issue.DETAILS.format(**finding_detail_args),
                "findingType": issue.TYPE,
                "issueCode": issue.CODE,
                "location": {
                    "path": path,
                },
            }
        )
        if issue.TYPE == "ERROR":
            self.error_finding += 1

    def add_resolver(
        self,
        operation_name: str,
        variables: dict = {},
        parent: Union[list, None] = None,
    ):
        resolver = dict(
            operationName=operation_name,
            variables=variables,
        )

        if isinstance(parent, list):
            parent.append(resolver)
        elif parent is None:
            self.response["resolvers"].append(resolver)

    def _is_numeric(self, value: Union[str, int]) -> bool:
        if isinstance(value, int):
            return True
        elif isinstance(value, str):
            return value.isdigit()

    def _is_boolean(self, value: Union[str, int, bool]) -> bool:
        if (
            isinstance(value, bool)
            or isinstance(value, int)
            or (isinstance(value, str) and self._is_numeric(value))
            or (
                isinstance(value, str)
                and not self._is_numeric(value)
                and value.lower()
                in ("true", "false", "yes", "no", "enabled", "disabled")
            )
        ):
            return True
        return False

    def _is_time(self, value: str) -> bool:
        if (
            (value[-1] in ("d", "h", "m", "s") and self._is_numeric(value[:-1]))
            or (value[-2:] in ("ms") and self._is_numeric(value[:-2]))
            or (value[-6:] in ("micros") and self._is_numeric(value[:-6]))
        ):
            return True
        return False

    def _is_bytes(self, value: str) -> bool:
        if (value[-1].lower() in ("b") and self._is_numeric(value[:-1])) or (
            value[-2:].lower() in ("kb", "mb", "gb", "tb", "pb")
            and self._is_numeric(value[:-2])
        ):
            return True
        return False

    def _parse_boolean_value(self, value: Union[str, int, bool]) -> bool:
        if isinstance(value, bool):
            return value
        elif isinstance(value, int):
            return bool(value)
        elif isinstance(value, str) and self._is_numeric(value):
            return bool(int(value))
        elif (
            isinstance(value, str)
            and not self._is_numeric(value)
            and value.lower()
            in (
                "true",
                "yes",
                "enabled",
            )
        ):
            return True
        return False

    def _validate_data_type(self, obj: dict, key: str, data_type: str, path: str = ""):
        if not obj.get(key):
            return

        value = obj[key]
        element_path = f"{path}.{key}"

        if data_type == "integer" and not self._is_numeric(value):
            self.add_finding(
                issue=IssueCode.MISMATCH_DATA_TYPE,
                finding_detail_args={"value": value, "data_type": "integer"},
                path=element_path,
            )
        elif data_type == "boolean" and not self._is_boolean(value):
            self.add_finding(
                issue=IssueCode.MISMATCH_DATA_TYPE,
                finding_detail_args={"value": value, "data_type": "boolean"},
                path=element_path,
            )
        elif data_type == "time" and not self._is_time(value):
            self.add_finding(
                issue=IssueCode.MISMATCH_DATA_TYPE,
                finding_detail_args={"value": value, "data_type": "time"},
                path=element_path,
            )
        elif data_type == "bytes" and not self._is_bytes(value):
            self.add_finding(
                issue=IssueCode.MISMATCH_DATA_TYPE,
                finding_detail_args={"value": value, "data_type": "bytes"},
                path=element_path,
            )

    def _check_required_element(
        self, obj: dict, elements: tuple, parent: str, path: str = ""
    ):
        for element in elements:
            if element not in obj.keys():
                self.add_finding(
                    issue=IssueCode.MISSING_ELEMENT,
                    finding_detail_args={"element": element, "parent": parent},
                    path=path,
                )

    def _validate_log_config(self, app_pipeline: dict, path: str = ""):
        items = []

        if "logConfigName" not in app_pipeline.keys():
            self.add_finding(
                issue=IssueCode.MISSING_ELEMENT,
                finding_detail_args={
                    "element": "logConfigName",
                    "parent": "appPipelines",
                },
                path=path,
            )
        else:
            items = self.log_config_dao.get_log_config_by_config_name(
                config_name=app_pipeline["logConfigName"]
            )
            if not items:
                self.add_finding(
                    issue=IssueCode.INVALID_RESOURCE,
                    finding_detail_args={
                        "resource": f"logConfigName: {app_pipeline['logConfigName']}"
                    },
                    path=f"{path}.logConfigName",
                )

        if "logConfigVersionNumber" not in app_pipeline.keys():
            self.add_finding(
                issue=IssueCode.MISSING_VERSION,
                finding_detail_args={"element": "logConfigVersionNumber"},
                path=path,
            )
        elif not self._is_numeric(app_pipeline.get("logConfigVersionNumber", 0)):
            self.add_finding(
                issue=IssueCode.MISMATCH_DATA_TYPE,
                finding_detail_args={
                    "value": app_pipeline["logConfigVersionNumber"],
                    "data_type": "integer",
                },
                path=f"{path}.logConfigVersionNumber",
            )
        elif (
            items
            and "logConfigVersionNumber" in app_pipeline.keys()
            and self._is_numeric(app_pipeline["logConfigVersionNumber"])
            and not list(
                filter(
                    lambda x: int(x.version)
                    >= int(app_pipeline["logConfigVersionNumber"]),
                    items,
                )
            )
        ):
            self.add_finding(
                issue=IssueCode.INVALID_VALUE,
                finding_detail_args={
                    "value": app_pipeline["logConfigVersionNumber"],
                    "key": "logConfigVersionNumber",
                },
                path=f"{path}.logConfigVersionNumber",
            )

    def _validate_s3_buffer_params(self, buffer_params: dict, path: str = ""):
        self._check_required_element(
            obj=buffer_params,
            elements=("logBucketName", "logBucketPrefix"),
            parent="bufferParams",
            path=path,
        )

        is_existing_bucket = False
        if buffer_params.get("logBucketName"):
            try:
                get_bucket_location(self.s3_client, buffer_params["logBucketName"])
                is_existing_bucket = True
            except Exception:
                self.add_finding(
                    issue=IssueCode.INVALID_BUCKET,
                    finding_detail_args={"bucket": buffer_params["logBucketName"]},
                    path=f"{path}.logBucketName",
                )

        bucket_notification_prefix = []
        if is_existing_bucket and buffer_params.get("logBucketPrefix"):
            bucket_notification_prefix = self.bucket_notification.get(
                buffer_params["logBucketName"], []
            )
            bucket_notification_prefix.append(buffer_params["logBucketPrefix"])
            self.bucket_notification[buffer_params["logBucketName"]] = (
                bucket_notification_prefix
            )

        for prefix in bucket_notification_prefix[:-1]:
            if buffer_params["logBucketPrefix"].startswith(prefix) or prefix.startswith(
                buffer_params["logBucketPrefix"]
            ):
                self.add_finding(
                    issue=IssueCode.BUCKET_NOTIFICATION_OVERLAP,
                    path=f"{path}.logBucketPrefix",
                )
                break

        self._validate_data_type(
            obj=buffer_params, key="maxFileSize", data_type="integer", path=path
        )
        self._validate_data_type(
            obj=buffer_params, key="uploadTimeout", data_type="integer", path=path
        )

        supported_compression_type = ("GZIP", "NONE")
        if (
            buffer_params.get("compressionType")
            and buffer_params["compressionType"] not in supported_compression_type
        ):
            self.add_finding(
                issue=IssueCode.INVALID_ENUM,
                finding_detail_args={
                    "value": buffer_params["compressionType"],
                    "enum": "bufferType",
                    "values": ", ".join(supported_compression_type),
                },
                path=f"{path}.compressionType",
            )

        supported_s3_storage_class = (
            "STANDARD",
            "STANDARD_IA",
            "ONEZONE_IA",
            "INTELLIGENT_TIERING",
        )
        if (
            buffer_params.get("s3StorageClass")
            and buffer_params["s3StorageClass"] not in supported_s3_storage_class
        ):
            self.add_finding(
                issue=IssueCode.INVALID_ENUM,
                finding_detail_args={
                    "value": buffer_params["s3StorageClass"],
                    "enum": "bufferType",
                    "values": ", ".join(supported_s3_storage_class),
                },
                path=f"{path}.s3StorageClass",
            )

    def _validate_kds_buffer_params(self, buffer_params: dict, path: str = ""):
        self._check_required_element(
            obj=buffer_params,
            elements=("enableAutoScaling", "shardCount", "minCapacity", "maxCapacity"),
            parent="bufferParams",
            path=path,
        )

        self._validate_data_type(
            obj=buffer_params, key="enableAutoScaling", data_type="boolean", path=path
        )
        self._validate_data_type(
            obj=buffer_params, key="shardCount", data_type="integer", path=path
        )
        self._validate_data_type(
            obj=buffer_params, key="minCapacity", data_type="integer", path=path
        )
        self._validate_data_type(
            obj=buffer_params, key="maxCapacity", data_type="integer", path=path
        )
        self._validate_data_type(
            obj=buffer_params, key="createDashboard", data_type="boolean", path=path
        )

        if (
            buffer_params.get("minCapacity")
            and self._is_numeric(buffer_params["minCapacity"])
            and buffer_params.get("maxCapacity")
            and self._is_numeric(buffer_params["maxCapacity"])
            and int(buffer_params["maxCapacity"]) < int(buffer_params["minCapacity"])
        ):
            self.add_finding(
                issue=IssueCode.INVALID_VALUE,
                finding_detail_args={
                    "value": buffer_params["maxCapacity"],
                    "key": "maxCapacity",
                },
                path=f"{path}.maxCapacity",
            )

    def _validate_buffer_params(
        self, buffer_type: str, buffer_params: dict, path: str = ""
    ):
        supported_buffer_type = [
            BufferTypeEnum.NONE,
            BufferTypeEnum.S3,
            BufferTypeEnum.KDS,
        ]

        if not buffer_type:
            self.add_finding(
                issue=IssueCode.MISSING_ELEMENT,
                finding_detail_args={"element": "bufferType", "parent": "appPipelines"},
                path=path,
            )
        elif buffer_type not in supported_buffer_type:
            self.add_finding(
                issue=IssueCode.INVALID_ENUM,
                finding_detail_args={
                    "value": buffer_type,
                    "enum": "bufferType",
                    "values": ", ".join(supported_buffer_type),
                },
                path=f"{path}.bufferType",
            )

        if buffer_type and buffer_type != BufferTypeEnum.NONE and not buffer_params:
            self.add_finding(
                issue=IssueCode.MISSING_ELEMENT,
                finding_detail_args={
                    "element": "bufferParams",
                    "parent": "appPipelines",
                },
                path=path,
            )

        if buffer_type == BufferTypeEnum.S3:
            self._validate_s3_buffer_params(
                buffer_params=buffer_params, path=f"{path}.bufferParams"
            )
        elif buffer_type == BufferTypeEnum.KDS:
            self._validate_kds_buffer_params(
                buffer_params=buffer_params, path=f"{path}.bufferParams"
            )

    def _validate_aos_domain(self, domain_name: str, index_prefix: str, path: str = ""):
        domain = self.cluster_dao.get_domain_by_name(domain_name=domain_name)

        if not domain:
            self.add_finding(
                issue=IssueCode.INVALID_RESOURCE,
                finding_detail_args={"resource": f"domainName: {domain_name}"},
                path=f"{path}.domainName",
            )
            return

        describe_domain_response = {"DomainStatus": {}}
        try:
            describe_domain_response = self.aos_client.describe_domain(
                DomainName=domain_name
            )
        except Exception as e:
            self.add_finding(
                issue=IssueCode.INVALID_RESOURCE_STATUS,
                finding_detail_args={"resource": f"domainName: {domain_name}"},
                path=f"{path}.domainName",
            )

        if describe_domain_response["DomainStatus"].get(
            "Deleted"
        ) is True or describe_domain_response["DomainStatus"].get(
            "DomainProcessingStatus"
        ) in (
            "Isolated",
            "Deleting",
        ):
            self.add_finding(
                issue=IssueCode.INVALID_RESOURCE_STATUS,
                finding_detail_args={"resource": f"domainName: {domain_name}"},
                path=f"{path}.domainName",
            )

        try:
            self.app_pipeline_dao.validate_index_prefix_overlap(
                index_prefix=index_prefix, domain_name=domain_name
            )
        except APIException as e:
            self.add_finding(
                issue=IssueCode.OPENSEARCH_INDEX_OVERLAP,
                finding_detail_args={"msg": e.message},
                path=f"{path}.indexPrefix",
            )

        if index_prefix:
            index_template = {
                "index_patterns": [f"{index_prefix}-*"],
                "template": {
                    "settings": {
                        "index": {
                            "number_of_shards": "1",
                            "number_of_replicas": "1",
                            "codec": "best_compression",
                            "refresh_interval": "1s",
                            "plugins": {
                                "index_state_management": {
                                    "rollover_alias": index_prefix
                                }
                            },
                        }
                    },
                    "mappings": {"properties": {}},
                },
            }
            try:
                r = post_simulate_index_template(
                    aos_endpoint=domain.endpoint,
                    index_prefix=index_prefix,
                    index_template=index_template,
                )
            except Exception as e:
                self.add_finding(
                    issue=IssueCode.HTTP_REQUEST_ERROR,
                    finding_detail_args={"msg": e},
                    path=f"{path}.domainName",
                )
            else:
                if r.status_code >= 400:
                    self.add_finding(
                        issue=IssueCode.HTTP_REQUEST_ERROR,
                        finding_detail_args={
                            "msg": r.json().get("error", {}).get("reason", "")
                        },
                        path=f"{path}.indexPrefix",
                    )

    def _validate_aos_params(self, params: dict, path: str = ""):
        self._check_required_element(
            obj=params,
            elements=("domainName", "indexPrefix"),
            parent="aosParams",
            path=path,
        )

        if params.get("indexSuffix", IndexSuffix.yyyy_MM_dd) not in list(
            IndexSuffix.__members__.values()
        ):
            self.add_finding(
                issue=IssueCode.INVALID_ENUM,
                finding_detail_args={
                    "value": params["indexSuffix"],
                    "enum": "indexSuffix",
                    "values": ", ".join(list(IndexSuffix.__members__.values())),
                },
                path=f"{path}.indexSuffix",
            )

        if params.get("codec", CodecEnum.BEST_COMPRESSION) not in list(
            CodecEnum.__members__.values()
        ):
            self.add_finding(
                issue=IssueCode.INVALID_ENUM,
                finding_detail_args={
                    "value": params["codec"],
                    "enum": "CodecEnum",
                    "values": ", ".join(list(CodecEnum.__members__.values())),
                },
                path=f"{path}.codec",
            )

        self._validate_data_type(
            obj=params, key="shardNumbers", data_type="integer", path=path
        )
        self._validate_data_type(
            obj=params, key="replicaNumbers", data_type="integer", path=path
        )
        self._validate_data_type(
            obj=params, key="rolloverSize", data_type="bytes", path=path
        )
        self._validate_data_type(
            obj=params, key="refreshInterval", data_type="time", path=path
        )
        self._validate_data_type(
            obj=params, key="warmLogTransition", data_type="time", path=path
        )
        self._validate_data_type(
            obj=params, key="coldLogTransition", data_type="time", path=path
        )
        self._validate_data_type(
            obj=params, key="logRetention", data_type="time", path=path
        )

        if params.get("domainName", ""):
            self._validate_aos_domain(
                domain_name=params["domainName"],
                index_prefix=params.get("indexPrefix", ""),
                path=path,
            )

    def _validate_monitor(self, params: dict, path: str = ""):
        self._validate_data_type(
            obj=params, key="pipelineAlarmStatus", data_type="boolean", path=path
        )

        if self._parse_boolean_value(params.get("pipelineAlarmStatus", False)) is True:
            if not params.get("snsTopicArn"):
                self.add_finding(
                    issue=IssueCode.MISSING_ELEMENT,
                    finding_detail_args={"element": "snsTopicArn", "parent": "monitor"},
                    path=path,
                )
            else:
                try:
                    self.sns_client.get_topic_attributes(TopicArn=params["snsTopicArn"])
                except Exception:
                    self.add_finding(
                        issue=IssueCode.INVALID_RESOURCE,
                        finding_detail_args={
                            "resource": f"snsTopicArn: {params['snsTopicArn']}"
                        },
                        path=f"{path}.snsTopicArn",
                    )

    def _validate_log_sources(self, sources: list, path: str = ""):
        for idx, source in enumerate(sources):
            element_path = f"{path}[{idx}]"
            if "id" in source.keys():
                self.add_finding(
                    issue=IssueCode.INVALID_ELEMENT,
                    finding_detail_args={"element": "id"},
                    path=f"{element_path}.id",
                )

            self._check_required_element(
                obj=source,
                elements=("type", "name", "accountId", "logPath"),
                parent="logSource",
                path=element_path,
            )
            self._validate_data_type(
                obj=source, key="autoAddPermission", data_type="boolean", path=path
            )

            if source.get("type") and source["type"] not in (
                LogSourceTypeEnum.EC2,
                LogSourceTypeEnum.EKSCluster,
            ):
                self.add_finding(
                    issue=IssueCode.UNSUPPORTED_LOG_SOURCE, path=f"{element_path}.name"
                )

            if source.get("type") and source.get("name") and source.get("accountId"):
                log_source = self.log_source_dao.get_log_source_by_name(
                    name=source["name"],
                    type=source["type"],
                    account_id=str(source["accountId"]),
                )
                if not log_source:
                    self.add_finding(
                        issue=IssueCode.INVALID_RESOURCE,
                        finding_detail_args={"resource": f"name: {source['name']}"},
                        path=f"{element_path}.name",
                    )

    def validate_app_pipelines(self):
        path = "appPipelines"

        if not isinstance(self.content, dict):
            self.add_finding(
                issue=IssueCode.INVALID_ELEMENT,
                finding_detail_args={"element": "appPipelines"},
                path=path,
            )
            return
        if not self.content.get("appPipelines"):
            self.add_finding(
                issue=IssueCode.MISSING_ELEMENT,
                finding_detail_args={"element": "appPipelines", "parent": "yaml"},
            )
            return

        if not isinstance(self.content.get("appPipelines"), list):
            self.add_finding(
                issue=IssueCode.INVALID_ELEMENT,
                finding_detail_args={"element": "appPipelines"},
                path=path,
            )
            return

        for idx, app_pipeline in enumerate(self.content["appPipelines"]):
            element_path = f"{path}[{idx}]"

            if "id" in app_pipeline.keys():
                self.add_finding(
                    issue=IssueCode.INVALID_ELEMENT,
                    finding_detail_args={"element": "id"},
                    path=f"{element_path}.id",
                )

            self._validate_log_config(app_pipeline=app_pipeline, path=element_path)
            self._validate_buffer_params(
                buffer_type=app_pipeline.get("bufferType"),
                buffer_params=app_pipeline.get("bufferParams", {}),
                path=element_path,
            )
            self._validate_aos_params(
                params=app_pipeline.get("aosParams", {}), path=element_path
            )
            self._validate_monitor(
                params=app_pipeline.get("monitor", {}), path=element_path
            )
            self._validate_log_sources(
                sources=app_pipeline.get("logSources", []),
                path=f"{element_path}.logSources",
            )

    def build_resolvers(self):  # NOSONAR
        if not self.content.get("appPipelines"):
            return

        for app_pipeline in self.content["appPipelines"]:
            domain = self.cluster_dao.get_domain_by_name(
                domain_name=app_pipeline["aosParams"]["domainName"]
            )
            log_config_id = self.log_config_dao.get_log_config_by_config_name(
                config_name=app_pipeline["logConfigName"]
            )[0].id
            log_config_version_number = app_pipeline.get("logConfigVersionNumber")
            if log_config_version_number is None:
                log_config = self.log_config_dao.get_log_config(id=log_config_id)
                log_config_version_number = log_config.version

            variables = dict(
                bufferType=app_pipeline["bufferType"],
                aosParams=dict(
                    domainName=app_pipeline["aosParams"]["domainName"],
                    engine="OpenSearch",
                    indexPrefix=app_pipeline["aosParams"]["indexPrefix"],
                    opensearchArn=domain.domainArn,
                    opensearchEndpoint=domain.endpoint,
                    replicaNumbers=str(
                        app_pipeline["aosParams"].get("replicaNumbers", "1")
                    ),
                    shardNumbers=str(
                        app_pipeline["aosParams"].get("shardNumbers", "1")
                    ),
                    indexSuffix=app_pipeline["aosParams"].get(
                        "indexSuffix", "yyyy_MM_dd"
                    ),
                    codec=app_pipeline["aosParams"].get("codec", "best_compression"),
                    refreshInterval=app_pipeline["aosParams"].get(
                        "refreshInterval", "1s"
                    ),
                    vpc=dict(
                        privateSubnetIds=domain.vpc.privateSubnetIds,
                        publicSubnetIds=domain.vpc.publicSubnetIds,
                        securityGroupId=domain.vpc.securityGroupId,
                        vpcId=domain.vpc.vpcId,
                    ),
                    rolloverSize=app_pipeline["aosParams"].get("rolloverSize", "30gb"),
                    warmLogTransition=app_pipeline["aosParams"].get(
                        "warmLogTransition", ""
                    ),
                    coldLogTransition=app_pipeline["aosParams"].get(
                        "coldLogTransition", ""
                    ),
                    logRetention=app_pipeline["aosParams"].get("logRetention", "180d"),
                    failedLogBucket=self.default_logging_bucket,
                ),
                logConfigId=log_config_id,
                logConfigVersionNumber=int(log_config_version_number),
                monitor=dict(
                    status="ENABLED",
                    pipelineAlarmStatus=(
                        "ENABLED"
                        if self._parse_boolean_value(
                            app_pipeline["monitor"].get(
                                "pipelineAlarmStatus", "DISABLED"
                            )
                        )
                        is True
                        else "DISABLED"
                    ),
                    snsTopicArn=app_pipeline["monitor"].get("snsTopicArn", ""),
                    snsTopicName=(
                        app_pipeline["monitor"]["snsTopicArn"].split(":")[-1]
                        if app_pipeline["monitor"].get("snsTopicArn")
                        else ""
                    ),
                ),
                logProcessorConcurrency="0",
                force=False,
                bufferParams=[],
                parameters=[],
                tags=[],
                logSources=[],
            )

            if app_pipeline["bufferType"] == BufferTypeEnum.S3:
                variables["bufferParams"] = [
                    dict(
                        paramKey="logBucketName",
                        paramValue=app_pipeline["bufferParams"]["logBucketName"],
                    ),
                    dict(
                        paramKey="logBucketPrefix",
                        paramValue=app_pipeline["bufferParams"]["logBucketPrefix"],
                    ),
                    dict(paramKey="logBucketSuffix", paramValue=""),
                    dict(paramKey="defaultCmkArn", paramValue=self.default_cmk_arn),
                    dict(
                        paramKey="maxFileSize",
                        paramValue=app_pipeline["bufferParams"].get(
                            "maxFileSize", "50"
                        ),
                    ),
                    dict(
                        paramKey="uploadTimeout",
                        paramValue=app_pipeline["bufferParams"].get(
                            "uploadTimeout", "60"
                        ),
                    ),
                    dict(
                        paramKey="compressionType",
                        paramValue=app_pipeline["bufferParams"].get(
                            "compressionType", "GZIP"
                        ),
                    ),
                    dict(
                        paramKey="s3StorageClass",
                        paramValue=app_pipeline["bufferParams"].get(
                            "s3StorageClass", "INTELLIGENT_TIERING"
                        ),
                    ),
                    dict(
                        paramKey="createDashboard",
                        paramValue=(
                            "Yes"
                            if self._parse_boolean_value(
                                app_pipeline["bufferParams"].get(
                                    "createDashboard", "No"
                                )
                            )
                            is True
                            else "No"
                        ),
                    ),
                ]
            elif app_pipeline["bufferType"] == BufferTypeEnum.KDS:
                variables["bufferParams"] = [
                    dict(
                        paramKey="enableAutoScaling",
                        paramValue=(
                            "true"
                            if self._parse_boolean_value(
                                app_pipeline["bufferParams"].get(
                                    "enableAutoScaling", "false"
                                )
                            )
                            is True
                            else "false"
                        ),
                    ),
                    dict(
                        paramKey="shardCount",
                        paramValue=str(
                            app_pipeline["bufferParams"].get("shardCount", "1")
                        ),
                    ),
                    dict(
                        paramKey="minCapacity",
                        paramValue=str(
                            app_pipeline["bufferParams"].get("minCapacity", "1")
                        ),
                    ),
                    dict(
                        paramKey="maxCapacity",
                        paramValue=str(
                            app_pipeline["bufferParams"].get("maxCapacity", "1")
                        ),
                    ),
                    dict(
                        paramKey="createDashboard",
                        paramValue=(
                            "Yes"
                            if self._parse_boolean_value(
                                app_pipeline["bufferParams"].get(
                                    "createDashboard", "No"
                                )
                            )
                            is True
                            else "No"
                        ),
                    ),
                ]

            for source in app_pipeline.get("logSources", []):
                log_source = self.log_source_dao.get_log_source_by_name(
                    name=source["name"],
                    type=source["type"],
                    account_id=str(source["accountId"]),
                )
                if log_source[0].type not in (
                    LogSourceTypeEnum.EC2,
                    LogSourceTypeEnum.EKSCluster,
                ):
                    continue
                self.add_resolver(
                    operation_name="CreateAppLogIngestion",
                    variables=dict(
                        sourceId=log_source[0].sourceId,
                        logPath=source["logPath"],
                        autoAddPermission=self._parse_boolean_value(
                            source.get("autoAddPermission", True)
                        ),
                    ),
                    parent=variables["logSources"],
                )
            self.add_resolver(operation_name="CreateAppPipeline", variables=variables)

    def run(self):
        if not self.content:
            return self.response

        self.validate_app_pipelines()

        if self.error_finding > 0:
            return self.response

        self.build_resolvers()

        return self.response


@router.route(field_name="batchImportAppPipelinesAnalyzer")
def batch_import_app_pipelines_analyzer(**args):
    content_string = base64.b64decode(args.get("contentString", "")).decode("utf-8")

    analyzer = AppPipelineAnalyzer(content_string=content_string)
    return analyzer.run()


@router.route(field_name="updateAppPipeline")
def update_app_pipeline(**args):
    app_pipeline_dao = AppPipelineDao(app_pipeline_table_name)

    app_pipeline = app_pipeline_dao.get_app_pipeline(args["id"])
    if args.get("logConfigId") != app_pipeline.logConfigId:
        raise APIException(ErrorCode.ITEM_NOT_FOUND)
    if app_pipeline.status != StatusEnum.ACTIVE:
        raise APIException(ErrorCode.UNSUPPORTED_ACTION)
    if app_pipeline.engineType == EngineType.LIGHT_ENGINE:
        put_light_engine_app_pipeline(**args)
    elif app_pipeline.engineType == EngineType.OPEN_SEARCH:
        put_app_pipeline(**args)


@router.route(field_name="createAppPipeline")
def put_app_pipeline(**args):  # NOSONAR
    log_config_id = args.get("logConfigId")
    log_config_version_number = args.get("logConfigVersionNumber")
    log_processor_concurrency = args.get("logProcessorConcurrency", "0")

    app_pipeline_dao = AppPipelineDao(app_pipeline_table_name)
    log_config_dao = LogConfigDao(log_config_table_name)

    if args.get("id"):
        app_pipeline = app_pipeline_dao.get_app_pipeline(args.get("id"))
        app_pipeline.logConfigId = args.get("logConfigId")
        app_pipeline.logConfigVersionNumber = args.get("logConfigVersionNumber")
    else:
        buffer_type = args.get("bufferType")
        buffer_params = args.get("bufferParams")
        aos_params = args.get("aosParams")

        force = args.get("force", False)
        monitor = args.get("monitor")
        osi = args.get("osiParams")
        tags = args.get("tags") or []
        index_prefix = str(aos_params["indexPrefix"])
        params = args.get("parameters", [])
        app_pipeline = AppPipeline(
            indexPrefix=index_prefix,
            bufferType=buffer_type,
            parameters=params,
            aosParams=aos_params,
            bufferParams=buffer_params,
            logConfigId=log_config_id,
            logConfigVersionNumber=log_config_version_number,
            engineType=EngineType.OPEN_SEARCH,
            tags=tags,
            monitor=monitor,
            osiParams=osi,
            logEventQueueType=LogEventQueueType.EVENT_BRIDGE,
        )
        logging_bucket_name = get_kv_from_buffer_param(
            key="logBucketName", buffer_param=app_pipeline.bufferParams
        )
        logging_bucket_prefix = get_kv_from_buffer_param(
            key="logBucketPrefix", buffer_param=app_pipeline.bufferParams
        )
        logger.info(f"logBucketName={logging_bucket_name}")
        logger.info(f"logBucketPrefix={logging_bucket_prefix}")

    app_pipeline.logProcessorLastConcurrency = int(log_processor_concurrency)
    parameters = convert_parameter_key(app_pipeline.parameters)
    log_config = log_config_dao.get_log_config(
        app_pipeline.logConfigId, app_pipeline.logConfigVersionNumber
    )

    index_template = make_index_template(
        log_config=log_config,
        index_alias=app_pipeline.indexPrefix,
        number_of_shards=app_pipeline.aosParams.shardNumbers,
        number_of_replicas=app_pipeline.aosParams.replicaNumbers,
        codec=app_pipeline.aosParams.codec,
        refresh_interval=app_pipeline.aosParams.refreshInterval,
    )
    logger.info(index_template)
    try_index_template(
        app_pipeline.aosParams.opensearchEndpoint,
        app_pipeline.indexPrefix,
        index_template,
        fallback_method_fn=lambda: app_pipeline_dao.validate(app_pipeline, force=force),
    )

    index_template_gzip_base64 = dict_to_gzip_base64(index_template)

    parameters += app_pipeline_dao.get_stack_parameters(app_pipeline) + [
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
    if not args.get("id"):
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
                        },
                    ],
                }
            ),
        )

        app_pipeline.bufferAccessRoleName = create_role_response["Role"]["RoleName"]
        app_pipeline.bufferAccessRoleArn = create_role_response["Role"]["Arn"]
    else:
        parameters += [
            {
                "ParameterKey": "rolloverIdx",
                "ParameterValue": "0",
            },
        ]

    parameters += [
        {
            "ParameterKey": "bufferAccessRoleArn",
            "ParameterValue": app_pipeline.bufferAccessRoleArn,
        },
        {
            "ParameterKey": "logType",
            "ParameterValue": log_config.logType,
        },
        {
            "ParameterKey": "logProcessorConcurrency",
            "ParameterValue": log_processor_concurrency,
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
    elif app_pipeline.bufferType == BufferTypeEnum.S3:
        role_name = f"CL-log-processor-{app_pipeline.pipelineId}"
        sqs_name = f"CL-sqs-{app_pipeline.pipelineId}"
        # fmt: off
        app_pipeline.logProcessorRoleArn = f"arn:{partition}:iam::{account_id}:role/{role_name}"
        app_pipeline.queueArn = f"arn:{partition}:sqs:{region}:{account_id}:{sqs_name}"
        # fmt: on

        kv = params_to_kv(parameters)

        if (
            app_pipeline.osiParams
            and app_pipeline.osiParams.maxCapacity != 0
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
                            "parser": (
                                "json"
                                if log_config.logType == LogTypeEnum.JSON
                                else "regex"
                            ),
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

    tag = args.get("tags", [])

    sfn_args["tag"] = tag

    # Start the pipeline flow
    action = "START"
    if args.get("id"):
        action = "UPDATE"
        app_pipeline.status = StatusEnum.UPDATING
    exec_sfn_flow(app_pipeline.pipelineId, action, sfn_args)

    app_pipeline_dao.save(app_pipeline)

    return app_pipeline.pipelineId


def convert_parameter_key(parameters: list) -> list:
    params = []
    for p in parameters:
        params.append(
            {
                "ParameterKey": p["parameterKey"],
                "ParameterValue": p["parameterValue"],
            }
        )

    return params


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
    item["logProcessorConcurrency"] = item.get("logProcessorLastConcurrency", "-")
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


@router.route(field_name="getAccountUnreservedConurrency")
def get_account_unreserved_conurrency():
    logger.info("Get account unreserved concurrency quota.")
    unreserved_concurrency = 0
    try:
        # Try get account unreserved concurrency
        resp = lambda_client.get_account_settings()
        account_limit = resp.get("AccountLimit")
        unreserved_concurrency = account_limit.get("UnreservedConcurrentExecutions")
    except Exception as e:
        logger.info(e)

    return unreserved_concurrency


@router.route(field_name="resumePipeline")
def resume_app_pipeline(id: str):
    app_pipeline_dao = AppPipelineDao(app_pipeline_table_name)
    svc_pipeline_dao = SvcPipelineDao(svc_pipeline_table_name)

    def _restore_log_processor_concurrency(p: Union[SvcPipeline, AppPipeline]):
        if p.logProcessorLastConcurrency is None:
            lambda_client.delete_function_concurrency(
                FunctionName=p.processorLogGroupName.lstrip("/aws/lambda/")
            )
        else:
            lambda_client.put_function_concurrency(
                FunctionName=p.processorLogGroupName.lstrip("/aws/lambda/"),
                ReservedConcurrentExecutions=p.logProcessorLastConcurrency,
            )

    try:
        p = app_pipeline_dao.get_app_pipeline(id)
        if p.status != StatusEnum.PAUSED:
            raise APIException(
                ErrorCode.UNSUPPORTED_ACTION,
                "Only paused pipeline is supported to resume",
            )
        _restore_log_processor_concurrency(p)
        app_pipeline_dao.update_app_pipeline(p.pipelineId, status=StatusEnum.ACTIVE)
    except APIException as e:
        if e.type == ErrorCode.ITEM_NOT_FOUND.name:
            p = svc_pipeline_dao.get_svc_pipeline(id)
            if p.status != StatusEnum.PAUSED:
                raise APIException(
                    ErrorCode.UNSUPPORTED_ACTION,
                    "Only paused pipeline is supported to resume",
                )
            _restore_log_processor_concurrency(p)
            svc_pipeline_dao.update_svc_pipeline(p.id, status=StatusEnum.ACTIVE)
        else:
            raise e


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
