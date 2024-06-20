# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0
import re
import boto3
import json
import gzip
import base64
import urllib.parse

from fnmatch import fnmatchcase
from typing import List, Optional
from boto3.dynamodb.conditions import Attr, ConditionBase, Key
from commonlib import DynamoDBUtil, AWSConnection, ErrorCode, APIException
from commonlib.model import (
    EC2Instances,
    OpenSearchDomain,
    now_iso8601,
    LogSource,
    LogConfig,
    Instance,
    AppPipeline,
    AppLogIngestion,
    SvcPipeline,
    BufferParam,
    BufferTypeEnum,
    StatusEnum,
    EngineType,
    InstanceIngestionDetail,
    ExecutionStatus,
    LogStructure,
    LogTypeEnum,
)
from commonlib.utils import get_kv_from_buffer_param


def rekey(d: dict, prefix: str = ":"):
    ret = {}
    for k in d:
        ret[prefix + k] = d[k]
    return ret


def expr_attr_vals(d):
    return rekey(d, ":")


def expr_attr_names(d):
    return rekey(d, "#")


class OpenSearchDomainDao:
    def __init__(self, table_name) -> None:
        self.table_name = table_name
        self._ddb_table = DynamoDBUtil(self.table_name)

    def list_domains(
        self,
        filter_expression: Optional[ConditionBase] = None,
    ) -> List[OpenSearchDomain]:
        if not filter_expression:
            filter_expression = Attr("status").ne(StatusEnum.INACTIVE)

        items = self._ddb_table.list_items(filter_expression)
        return [OpenSearchDomain.parse_obj(each) for each in items]

    def set_master_role_arn(self, id_: str, master_role_arn: str):
        self._ddb_table.update_item(
            {"id": id_},
            {"masterRoleArn": master_role_arn},
        )


class LogConfigDao:
    def __init__(self, table_name) -> None:
        self.log_config_table_name = table_name
        conn = AWSConnection()
        # to create client
        self._ddb_cli = conn.get_client("dynamodb", client_type="client")
        self._ddb_table = DynamoDBUtil(self.log_config_table_name)

    def save(self, log_config: LogConfig) -> str:
        log_config.status = StatusEnum.ACTIVE
        self._ddb_table.put_item(log_config.dict())
        return log_config.id

    def get_log_config(self, id: str, version: int = 0) -> LogConfig:
        if version > 0:
            item = self._ddb_table.get_item({"id": id, "version": version}, True)
        else:
            item = self._ddb_table.query_items({"id": id}, limit=1)[0]
        return LogConfig.parse_obj(item)

    def get_log_config_by_config_name(self, config_name: str) -> List[LogConfig]:
        filter_expression = Attr("status").ne("INACTIVE") & Attr("name").eq(config_name)
        items = self._ddb_table.list_items(filter_expression=filter_expression)
        return [LogConfig.parse_obj(item) for item in items]

    def update_log_config(self, log_config: LogConfig):
        db_log_config = self._ddb_table.query_items({"id": log_config.id}, limit=1)[0]
        transact_items = list()
        update_transact_item = {
            "Update": {
                "Key": {
                    "id": {"S": log_config.id},
                    "version": {"N": f"{db_log_config.get('version')}"},
                },
                "UpdateExpression": "SET #status = :status, updatedAt=:updatedAt ",
                "TableName": self.log_config_table_name,
                "ConditionExpression": "#status= :active_status AND #version <= :version",
                "ExpressionAttributeValues": expr_attr_vals(
                    {
                        "status": {"S": StatusEnum.INACTIVE},
                        "updatedAt": {"S": now_iso8601()},
                        "active_status": {"S": StatusEnum.ACTIVE},
                        "version": {"N": f"{db_log_config.get('version')}"},
                    }
                ),
                "ExpressionAttributeNames": expr_attr_names(
                    {
                        "status": "status",
                        "version": "version",
                    }
                ),
            }
        }
        transact_items.append(update_transact_item)
        # append put item operation
        serializer = boto3.dynamodb.types.TypeSerializer()
        log_config.version = db_log_config.get("version") + 1
        log_config.status = StatusEnum.ACTIVE
        item = {k: serializer.serialize(v) for k, v in log_config.dict().items()}
        transact_items.append(
            {
                "Put": {
                    "Item": item,
                    "TableName": self.log_config_table_name,
                }
            }
        )

        self._ddb_cli.transact_write_items(TransactItems=transact_items)

    def delete_log_config(self, id: str):
        # get log conf list by id
        log_configs = self.list_log_configs(Attr("id").eq(id))
        transact_items = list()
        for log_config in log_configs:
            transact_item = {
                "Update": {
                    "TableName": self.log_config_table_name,
                    "Key": {"id": {"S": id}, "version": {"N": f"{log_config.version}"}},
                    "UpdateExpression": "SET #status = :status, updatedAt=:updatedAt ",
                    "ExpressionAttributeNames": expr_attr_names({"status": "status"}),
                    "ExpressionAttributeValues": expr_attr_vals(
                        {
                            "status": {"S": StatusEnum.INACTIVE},
                            "updatedAt": {"S": now_iso8601()},
                        }
                    ),
                }
            }
            transact_items.append(transact_item)
        self._ddb_cli.transact_write_items(TransactItems=transact_items)

    def list_log_configs(
        self,
        filter_expression: Optional[ConditionBase] = None,
    ) -> List[LogConfig]:
        if not filter_expression:
            filter_expression = Attr("status").ne(StatusEnum.INACTIVE)

        items = self._ddb_table.list_items(filter_expression)
        return [LogConfig.parse_obj(each) for each in items]


def _create_stack_params(param_map):
    """Helper function to create cfn stack parameter key-value pairs"""

    params = []
    for k, v in param_map.items():
        params.append(
            {
                "ParameterKey": k,
                "ParameterValue": str(v),
            }
        )

    return params


def s3_notification_prefix(s: str):
    s = s.lstrip("/")

    placeholder_sign_index = min(
        filter(lambda x: x >= 0, (len(s), s.find("%"), s.find("$")))
    )
    return urllib.parse.quote(s[0:placeholder_sign_index])


def _get_buffer_params(buffer_type, buffer_params: List[BufferParam]):
    """Helper function to get param key-value for buffer"""
    if buffer_type == "KDS":
        keys = [
            "shardCount",
            "minCapacity",
            "maxCapacity",
            "enableAutoScaling",
            "createDashboard",
        ]
    elif buffer_type == "MSK":
        keys = [
            "mskClusterArn",
            "mskClusterName",
            "topic",
        ]
    elif buffer_type == "S3":
        keys = [
            "logBucketName",
            "logBucketPrefix",
            "logBucketSuffix",
            "defaultCmkArn",
            "createDashboard",
            "enableS3Notification",
        ]
    else:
        keys = ["logProcessorRoleArn"]

    param_map = {}
    for param in buffer_params:
        if param.paramKey in keys:
            if param.paramKey == "logBucketPrefix":
                param_map[param.paramKey] = s3_notification_prefix(param.paramValue)
            else:
                param_map[param.paramKey] = param.paramValue
    return param_map


class AppPipelineDao:
    def __init__(self, table_name) -> None:
        self._ddb_table = DynamoDBUtil(table_name)

    def get_stack_name(self, app_pipeline: AppPipeline):
        if (
            app_pipeline.engineType == EngineType.LIGHT_ENGINE
            and app_pipeline.logStructure == LogStructure.FLUENT_BIT_PARSED_JSON
        ):
            return "MicroBatchApplicationFluentBitPipeline"
        elif (
            app_pipeline.engineType == EngineType.LIGHT_ENGINE
            and app_pipeline.logStructure == LogStructure.RAW
        ):
            return "MicroBatchApplicationS3Pipeline"
        buffer_type = app_pipeline.bufferType
        enable_auto_scaling_values = [
            param.paramValue
            for param in app_pipeline.bufferParams
            if param.paramKey == "enableAutoScaling"
        ]
        enable_auto_scaling = (
            enable_auto_scaling_values[0]
            if len(enable_auto_scaling_values) > 0
            else "false"
        )

        if buffer_type == "S3":
            if (
                app_pipeline.osiParams != None
                and app_pipeline.osiParams.maxCapacity != 0
                and app_pipeline.osiParams.minCapacity != 0
            ):
                return "AppLogS3BufferOSIProcessor"
            return "AppLogS3Buffer"
        elif buffer_type == "MSK":
            return "AppLogMSKBuffer"
        elif buffer_type == "KDS":
            if enable_auto_scaling.lower() != "false":
                return "AppLogKDSBuffer"
            else:
                return "AppLogKDSBufferNoAutoScaling"
        else:
            return "AppLog"

    def get_stack_parameters(self, app_pipeline: AppPipeline):
        base_params_map = {
            "domainName": app_pipeline.aosParams.domainName,
            "engineType": app_pipeline.aosParams.engine,
            "endpoint": app_pipeline.aosParams.opensearchEndpoint,
            "indexPrefix": app_pipeline.aosParams.indexPrefix,
            "shardNumbers": app_pipeline.aosParams.shardNumbers,
            "replicaNumbers": app_pipeline.aosParams.replicaNumbers,
            "warmAge": str(app_pipeline.aosParams.warmLogTransition),
            "coldAge": str(app_pipeline.aosParams.coldLogTransition),
            "retainAge": str(app_pipeline.aosParams.logRetention),
            "rolloverSize": app_pipeline.aosParams.rolloverSize,
            "codec": app_pipeline.aosParams.codec,
            "indexSuffix": (app_pipeline.aosParams.indexSuffix or "yyyy-MM-dd").replace(
                "_", "-"
            ),
            "refreshInterval": app_pipeline.aosParams.refreshInterval,
            "vpcId": app_pipeline.aosParams.vpc.vpcId,
            "subnetIds": app_pipeline.aosParams.vpc.privateSubnetIds,
            "securityGroupId": app_pipeline.aosParams.vpc.securityGroupId,
            "backupBucketName": app_pipeline.aosParams.failedLogBucket,
        }
        # backup bucket is not required if no buffer is required.
        if app_pipeline.bufferType == BufferTypeEnum.NONE:
            base_params_map.pop("backupBucketName")

        # Also need to Add the required buffer parameters
        buffer_params_map = _get_buffer_params(
            app_pipeline.bufferType, app_pipeline.bufferParams
        )
        buffer_params_map.pop("enableAutoScaling", "false")
        return _create_stack_params(base_params_map | buffer_params_map)

    def get_light_engine_stack_parameters(
        self, app_pipeline: AppPipeline, log_config: LogConfig, grafana=None
    ):
        source_schema = json.dumps(log_config.jsonSchema)
        if len(source_schema) >= 4000:
            source_schema = base64.b64encode(
                gzip.compress(bytes(source_schema, encoding="utf-8"))
            ).decode("utf-8")

        params = {
            "stagingBucketPrefix": app_pipeline.lightEngineParams.stagingBucketPrefix,
            "centralizedBucketName": app_pipeline.lightEngineParams.centralizedBucketName,
            "centralizedBucketPrefix": app_pipeline.lightEngineParams.centralizedBucketPrefix,
            "centralizedTableName": app_pipeline.lightEngineParams.centralizedTableName,
            "centralizedMetricsTableName": app_pipeline.lightEngineParams.centralizedMetricsTableName,
            "logProcessorSchedule": app_pipeline.lightEngineParams.logProcessorSchedule,
            "logMergerSchedule": app_pipeline.lightEngineParams.logMergerSchedule,
            "logArchiveSchedule": app_pipeline.lightEngineParams.logArchiveSchedule,
            "logMergerAge": app_pipeline.lightEngineParams.logMergerAge,
            "logArchiveAge": app_pipeline.lightEngineParams.logArchiveAge,
            "importDashboards": app_pipeline.lightEngineParams.importDashboards,
            "recipients": app_pipeline.lightEngineParams.recipients,
            "sourceSchema": source_schema,
            "pipelineId": app_pipeline.pipelineId,
        }
        if grafana is not None:
            params["grafanaUrl"] = grafana["url"]
            params["grafanaToken"] = grafana["token"]

        if (
            app_pipeline.logStructure == LogStructure.RAW
            and log_config.logType == LogTypeEnum.JSON
        ):
            params["sourceDataFormat"] = "Json"
        elif app_pipeline.logStructure == LogStructure.RAW:
            params["sourceDataFormat"] = "Regex"
            skip_header_line_count = (
                get_kv_from_buffer_param(
                    key="skip.header.line.count", buffer_param=app_pipeline.bufferParams
                )
                or "0"
            )

            params["sourceTableProperties"] = json.dumps(
                {"skip.header.line.count": skip_header_line_count}
            )
            if len(params["sourceTableProperties"]) >= 4000:
                params["sourceTableProperties"] = base64.b64encode(
                    gzip.compress(
                        bytes(params["sourceTableProperties"], encoding="utf-8")
                    )
                ).decode("utf-8")

            params["sourceSerializationProperties"] = json.dumps(
                {"input.regex": log_config.regex}
            )
            if len(params["sourceSerializationProperties"]) >= 4000:
                params["sourceSerializationProperties"] = base64.b64encode(
                    gzip.compress(
                        bytes(params["sourceSerializationProperties"], encoding="utf-8")
                    )
                ).decode("utf-8")

        return _create_stack_params(params)

    def get_buffer_params(self, app_pipeline: AppPipeline) -> List[BufferParam]:
        if app_pipeline.engineType == EngineType.LIGHT_ENGINE:
            buffer_params = []
            for param in app_pipeline.bufferParams:
                if param.paramKey == "logBucketPrefix":
                    buffer_params.append(
                        BufferParam(
                            paramKey=param.paramKey,
                            paramValue=f'{param.paramValue.strip("/")}/year=%Y/month=%m/day=%d',
                        )
                    )
                else:
                    buffer_params.append(param)
            return buffer_params
        else:
            return app_pipeline.bufferParams

    def validate_duplicated_index_prefix(self, app_pipeline: AppPipeline, force: bool):
        pipelines = self.list_app_pipelines(
            Attr("status").is_in(["INACTIVE", "ACTIVE", "CREATING", "DELETING"])
            & Attr("aosParams.indexPrefix").eq(app_pipeline.indexPrefix)
            & Attr("aosParams.domainName").eq(app_pipeline.aosParams.domainName)
        )
        if len(pipelines) > 0:
            msg = f"Duplicate index prefix: {app_pipeline.indexPrefix}"
            inactive_pipelines = list(
                filter(lambda x: x.status == StatusEnum.INACTIVE, pipelines)
            )
            if len(inactive_pipelines) > 0:
                if not force:
                    raise APIException(
                        ErrorCode.DUPLICATED_WITH_INACTIVE_INDEX_PREFIX, msg
                    )
            else:
                if not force:
                    raise APIException(ErrorCode.DUPLICATED_INDEX_PREFIX, msg)

    def validate_index_prefix_overlap(self, app_pipeline: AppPipeline):
        index_prefix = app_pipeline.indexPrefix or app_pipeline.aosParams.indexPrefix
        pipelines = self.list_app_pipelines(
            Attr("aosParams.domainName").eq(app_pipeline.aosParams.domainName)
            & Attr("status").is_in(["ACTIVE", "INACTIVE", "CREATING", "DELETING"])
        )

        for p in pipelines:
            the_index_prefix = p.indexPrefix or p.aosParams.indexPrefix
            status = p.status
            if index_prefix != the_index_prefix and (
                fnmatchcase(index_prefix, the_index_prefix + "*")
                or fnmatchcase(the_index_prefix, index_prefix + "*")
            ):
                msg = f'Index prefix "{index_prefix}" overlaps "{the_index_prefix}" of app pipeline {p.pipelineId}'
                if status == "INACTIVE":
                    raise APIException(
                        ErrorCode.OVERLAP_WITH_INACTIVE_INDEX_PREFIX, msg
                    )
                else:
                    raise APIException(ErrorCode.OVERLAP_INDEX_PREFIX, msg)

    def validate_buffer_params(self, app_pipeline: AppPipeline):
        required_params = self._get_required_params(app_pipeline.bufferType)
        buffer_names = [param.paramKey for param in app_pipeline.bufferParams]
        missing_params = [
            param for param in required_params if param not in buffer_names
        ]

        if missing_params:
            raise APIException(
                ErrorCode.INVALID_BUFFER_PARAMETERS,
                "Missing buffer parameters %s for buffer type %s"
                % (",".join(missing_params), app_pipeline.bufferType),
            )

    def _get_required_params(self, buffer_type: str) -> list:
        m = {
            "S3": [
                "logBucketName",
                "logBucketPrefix",
                "defaultCmkArn",
                "maxFileSize",
                "uploadTimeout",
                "s3StorageClass",
            ],
            "KDS": [
                "shardCount",
                "minCapacity",
                "maxCapacity",
                "enableAutoScaling",
            ],
            "MSK": [
                "mskClusterArn",
                "mskClusterName",
                "topic",
                "mskBrokerServers",
            ],
        }
        return m.get(buffer_type, [])

    def validate(self, app_pipeline: AppPipeline, force: bool = False):
        self.validate_duplicated_index_prefix(app_pipeline, force)
        self.validate_index_prefix_overlap(app_pipeline)
        self.validate_buffer_params(app_pipeline)

    def save(self, app_pipeline: AppPipeline) -> AppPipeline:
        self._ddb_table.put_item(app_pipeline.dict())
        return app_pipeline

    def update_app_pipeline(self, id: str, **attributes) -> None:
        if not attributes.get("updatedAt"):
            attributes["updatedAt"] = now_iso8601()

        self._ddb_table.update_item({"pipelineId": id}, attributes)

    def get_app_pipeline(self, id: str):
        item = self._ddb_table.get_item({"pipelineId": id}, raise_if_not_found=True)
        return AppPipeline.parse_obj(item)

    def list_app_pipelines(
        self,
        filter_expression: Optional[ConditionBase] = None,
    ) -> List[AppPipeline]:
        if not filter_expression:
            filter_expression = Attr("status").ne(StatusEnum.INACTIVE)

        items = self._ddb_table.list_items(filter_expression)
        return [AppPipeline.parse_obj(each) for each in items]


class InstanceDao(DynamoDBUtil):
    index_name = "SourceToInstanceIndex"

    def __init__(self, table_name) -> None:
        super().__init__(table_name)

    def get_source_ids_by_instance_id(self, instance_id: str):
        source_set = set()
        items = self.query_items({"id": instance_id})
        instance_object_list = [Instance.parse_obj(each) for each in items]
        for instance_object in instance_object_list:
            source_set.add(instance_object.sourceId)
        return source_set

    def get_instances_of_source_id(self, source_id: str) -> List[Instance]:
        items = self.query_items({"sourceId": source_id}, index_name=self.index_name)
        return [Instance.parse_obj(each) for each in items]

    def get_instance_set_by_source_id(self, source_id: str):
        instance_set = set()
        items = self.query_items({"sourceId": source_id}, index_name=self.index_name)
        instance_object_list = [Instance.parse_obj(each) for each in items]
        for instance_object in instance_object_list:
            instance_set.add(instance_object.id)
        return instance_set

    def list_instances(
        self,
        filter_expression: Optional[ConditionBase] = None,
    ) -> List[Instance]:
        items = self.list_items(filter_expression)
        return [Instance.parse_obj(each) for each in items]

    def get_instance(self, id: str, source_id: str):
        item = self.get_item({"id": id, "sourceId": source_id})
        return Instance.parse_obj(item)

    def get_instance_by_instance_id(self, instance_id: str):
        items = self.query_items({"id": instance_id})
        return [Instance.parse_obj(each) for each in items]

    def add_ingestion_into_instance(
        self, id: str, source_id: str, ingestion_id: str
    ) -> Instance:
        item = self._table.update_item(
            Key={"id": id, "sourceId": source_id},
            UpdateExpression="Add ingestionIds :p SET updatedAt=:upAt",
            ExpressionAttributeValues={
                ":p": {ingestion_id},
                ":upAt": now_iso8601(),
            },
            ReturnValues="ALL_NEW",
        )
        return Instance.parse_obj(item["Attributes"])

    def remove_ingestion_from_instance(
        self, id: str, source_id: str, ingestion_id: str
    ) -> Instance:
        item = self._table.update_item(
            Key={"id": id, "sourceId": source_id},
            UpdateExpression="Delete ingestionIds :p SET updatedAt=:upAt",
            ExpressionAttributeValues={
                ":p": {ingestion_id},
                ":upAt": now_iso8601(),
            },
            ReturnValues="ALL_NEW",
        )
        return Instance.parse_obj(item["Attributes"])


class LogSourceDao:
    def __init__(self, table_name, instance_dao: Optional[InstanceDao] = None) -> None:
        self._ddb_table = DynamoDBUtil(table_name)
        self._instance_dao = instance_dao

    def save(self, log_source: LogSource) -> LogSource:
        self._ddb_table.put_item(log_source.dict())
        return log_source

    def update_log_source(self, id: str, **attributes) -> None:
        if not attributes.get("updatedAt"):
            attributes["updatedAt"] = now_iso8601()

        self._ddb_table.update_item({"sourceId": id}, attributes)

    def _enrich_log_source(self, log_source: LogSource):
        if self._instance_dao and log_source.ec2:
            log_source.ec2.instances = [
                EC2Instances(instanceId=each.id)
                for each in self._instance_dao.get_instances_of_source_id(
                    log_source.sourceId
                )
            ]
        return log_source

    def get_log_source(self, id: str):
        item = self._ddb_table.get_item({"sourceId": id})
        return self._enrich_log_source(LogSource.parse_obj(item))

    def list_log_sources(
        self,
        filter_expression: Optional[ConditionBase] = None,
    ) -> List[LogSource]:
        if not filter_expression:
            filter_expression = Attr("status").ne(StatusEnum.INACTIVE)

        items = self._ddb_table.list_items(filter_expression)
        return [self._enrich_log_source(LogSource.parse_obj(each)) for each in items]


class PipelineAlarmDao:
    """Pipeline Alarm Dao"""

    def __init__(self, table_name) -> None:
        self._ddb_table = DynamoDBUtil(table_name)

    def update_pipeline_alarm_status(
        self,
        pipeline_id: str,
        status: str,
        sns_topic_name: str = "",
        sns_topic_arn: str = "",
        emails: str = "",
        id_key: str = "id",
    ):
        """Update pipeline alarm status"""

        self._ddb_table.update_item(
            {id_key: pipeline_id},
            {
                "monitor.pipelineAlarmStatus": status,
                "monitor.snsTopicName": sns_topic_name,
                "monitor.snsTopicArn": sns_topic_arn,
                "monitor.emails": emails,
            },
        )

    def get_pipeline_alarm_status(self, pipeline_id: str, id_key: str = "id"):
        """Get pipeline alarm status"""

        item = self._ddb_table.get_item({id_key: pipeline_id}, raise_if_not_found=True)
        return item.get("monitor")

    def get_stack_name_from_stack_id(self, stack_id):
        """return the stack name from stack id"""
        regex = r"arn:.*?:cloudformation:.*?:.*?:stack/(.*)/.*"
        match_obj = re.match(regex, stack_id, re.I)
        if match_obj:
            stack_name = match_obj.group(1)
        else:
            raise APIException(ErrorCode.INVALID_ITEM, "Error parse stack name.")

        return stack_name

    def get_alarm_metric_info_by_pipeline_id(
        self, pipeline_id: str, id_key: str = "id"
    ):
        """Get alarm metric info by pipeline id,
        this function can handler both App and Service Pipeline.
        """

        alarm_info = {}

        item = self._ddb_table.get_item({id_key: pipeline_id}, raise_if_not_found=True)

        alarm_info["stackName"] = (
            item.get("stackName")
            if item.get("stackName")
            else self.get_stack_name_from_stack_id(item.get("stackId"))
        )

        if item.get("processorLogGroupName"):
            alarm_info["processorLogGroupName"] = item.get("processorLogGroupName")
            processor_fn_name = re.findall(
                r"/aws/lambda/(.*)", item.get("processorLogGroupName")
            )[0]
            alarm_info["processorFnName"] = processor_fn_name

        if item.get("bufferResourceName"):
            alarm_info["bufferResourceName"] = item.get("bufferResourceName")

        if item.get("logEventQueueName"):
            alarm_info["logEventQueueName"] = item.get("logEventQueueName")

        if item.get("processorFnName"):
            alarm_info["processorFnName"] = item.get("processorFnName")

        if item.get("deliveryStreamName"):
            alarm_info["deliveryStreamName"] = item.get("deliveryStreamName")

        if item.get("bufferResourceArn"):
            alarm_info["bufferResourceArn"] = item.get("bufferResourceArn")

        if item.get("bufferType"):
            alarm_info["bufferType"] = item.get("bufferType")

        alarm_info["engineType"] = item.get("engineType", EngineType.OPEN_SEARCH)

        return alarm_info


class AppLogIngestionDao:
    def __init__(self, table_name) -> None:
        self._table_name = table_name
        self._ddb_table = DynamoDBUtil(table_name)
        conn = AWSConnection()
        # to create client
        self._ddb_cli = conn.get_client("dynamodb", client_type="client")

    def save(self, app_log_ingestion: AppLogIngestion) -> AppLogIngestion:
        self._ddb_table.put_item(app_log_ingestion.dict())
        return app_log_ingestion

    def save_with_log_source(
        self,
        app_log_ingestion: AppLogIngestion,
        log_source_table_name: str,
        log_source: LogSource,
    ) -> AppLogIngestion:
        transact_items = list()
        # append put item operation
        serializer = boto3.dynamodb.types.TypeSerializer()
        item = {k: serializer.serialize(v) for k, v in app_log_ingestion.dict().items()}
        transact_items.append(
            {
                "Put": {
                    "Item": item,
                    "TableName": self._table_name,
                }
            }
        )
        update_transact_item = {
            "Update": {
                "TableName": log_source_table_name,
                "Key": {
                    "sourceId": {"S": log_source.sourceId},
                },
                "UpdateExpression": "SET #status = :distributing_status, syslog.nlbArn=:nlbArn, syslog.nlbDNSName=:nlbDNSName, updatedAt=:updatedAt ",
                "ExpressionAttributeValues": expr_attr_vals(
                    {
                        "distributing_status": {"S": StatusEnum.CREATING},
                        "nlbArn": {"S": log_source.syslog.nlbArn},
                        "nlbDNSName": {"S": log_source.syslog.nlbDNSName},
                        "updatedAt": {"S": now_iso8601()},
                    }
                ),
                "ExpressionAttributeNames": expr_attr_names(
                    {
                        "status": "status",
                    }
                ),
                "ReturnValuesOnConditionCheckFailure": "ALL_OLD",
            }
        }
        transact_items.append(update_transact_item)
        self._ddb_cli.transact_write_items(TransactItems=transact_items)
        return app_log_ingestion

    def delete_with_log_source(
        self,
        app_log_ingestion: AppLogIngestion,
        log_source_table_name: str,
        log_source: LogSource,
    ):
        transact_items = list()
        transact_items.append(
            {
                "Update": {
                    "TableName": self._table_name,
                    "Key": {
                        "id": {"S": app_log_ingestion.id},
                    },
                    "UpdateExpression": "SET #status = :status, updatedAt=:updatedAt",
                    "ConditionExpression": "#status IN (:active_status, :creating_status, :error_status)",
                    "ExpressionAttributeValues": {
                        ":status": {"S": StatusEnum.DELETING},
                        ":updatedAt": {"S": now_iso8601()},
                        ":active_status": {"S": StatusEnum.ACTIVE},
                        ":creating_status": {"S": StatusEnum.CREATING},
                        ":error_status": {"S": StatusEnum.ERROR},
                    },
                    "ExpressionAttributeNames": {
                        "#status": "status",
                    },
                    "ReturnValuesOnConditionCheckFailure": "ALL_OLD",
                }
            }
        )
        transact_items.append(
            {
                "Update": {
                    "TableName": log_source_table_name,
                    "Key": {
                        "sourceId": {"S": log_source.sourceId},
                    },
                    "UpdateExpression": "SET #status = :status, updatedAt=:updatedAt",
                    "ConditionExpression": "#status IN (:active_status, :creating_status, :error_status)",
                    "ExpressionAttributeValues": {
                        ":status": {"S": StatusEnum.DELETING},
                        ":updatedAt": {"S": now_iso8601()},
                        ":active_status": {"S": StatusEnum.ACTIVE},
                        ":creating_status": {"S": StatusEnum.CREATING},
                        ":error_status": {"S": StatusEnum.ERROR},
                    },
                    "ExpressionAttributeNames": {
                        "#status": "status",
                    },
                    "ReturnValuesOnConditionCheckFailure": "ALL_OLD",
                }
            }
        )
        self._ddb_cli.transact_write_items(TransactItems=transact_items)
        return app_log_ingestion

    def update_app_log_ingestion(self, id: str, **attributes) -> None:
        if not attributes.get("updatedAt"):
            attributes["updatedAt"] = now_iso8601()
        self._ddb_table.update_item({"id": id}, attributes)

    def get_app_log_ingestion(self, id: str) -> AppLogIngestion:
        item = self._ddb_table.get_item({"id": id}, True)
        return AppLogIngestion.parse_obj(item)

    def get_app_log_ingestions_by_source_id(
        self,
        source_id,
    ) -> List[AppLogIngestion]:
        filter_expression = (
            Attr("sourceId")
            .eq(source_id)
            .__and__(Attr("status").ne(StatusEnum.INACTIVE))
        )
        items = self._ddb_table.list_items(filter_expression)
        return [AppLogIngestion.parse_obj(each) for each in items]

    def get_app_log_ingestions_by_pipeline_id(
        self,
        pipeline_id,
    ) -> List[AppLogIngestion]:
        filter_expression = (
            Attr("appPipelineId")
            .eq(pipeline_id)
            .__and__(Attr("status").eq(StatusEnum.ACTIVE))
        )
        items = self._ddb_table.list_items(filter_expression)
        return [AppLogIngestion.parse_obj(each) for each in items]

    def list_app_log_ingestions(
        self,
        filter_expression: Optional[ConditionBase] = None,
    ) -> List[AppLogIngestion]:
        if not filter_expression:
            filter_expression = Attr("status").ne(StatusEnum.INACTIVE)

        items = self._ddb_table.list_items(filter_expression)
        return [AppLogIngestion.parse_obj(each) for each in items]


class InstanceIngestionDetailDao:
    def __init__(self, table_name) -> None:
        self._ddb_table = DynamoDBUtil(table_name)

    def batch_put_items(self, items: List[InstanceIngestionDetail]):
        self._ddb_table.batch_put_items(
            [InstanceIngestionDetail.dict(each) for each in items]
        )

    def get_instance_ingestion_details(
        self, instance_id: str, ingestion_id: str, source_id: str
    ) -> List[InstanceIngestionDetail]:
        return self.list_instance_ingestion_details(
            Attr("instanceId")
            .eq(instance_id)
            .__and__(Attr("ingestionId").eq(ingestion_id))
            .__and__(Attr("sourceId").eq(source_id))
        )

    def list_instance_ingestion_details(
        self, filter_expression: Optional[ConditionBase] = None
    ) -> List[InstanceIngestionDetail]:
        if not filter_expression:
            filter_expression = Attr("status").ne(StatusEnum.INACTIVE)

        items = self._ddb_table.list_items(filter_expression)
        return [InstanceIngestionDetail.parse_obj(each) for each in items]


class SvcPipelineDao:
    def __init__(self, table_name) -> None:
        self._ddb_table = DynamoDBUtil(table_name)

    def get_light_engine_stack_parameters(
        self, service_pipeline: SvcPipeline, grafana=None
    ):
        params = {
            "stagingBucketPrefix": service_pipeline.lightEngineParams.stagingBucketPrefix,
            "centralizedBucketName": service_pipeline.lightEngineParams.centralizedBucketName,
            "centralizedBucketPrefix": service_pipeline.lightEngineParams.centralizedBucketPrefix,
            "centralizedTableName": service_pipeline.lightEngineParams.centralizedTableName,
            "logProcessorSchedule": service_pipeline.lightEngineParams.logProcessorSchedule,
            "logMergerSchedule": service_pipeline.lightEngineParams.logMergerSchedule,
            "logArchiveSchedule": service_pipeline.lightEngineParams.logArchiveSchedule,
            "logMergerAge": service_pipeline.lightEngineParams.logMergerAge,
            "logArchiveAge": service_pipeline.lightEngineParams.logArchiveAge,
            "importDashboards": service_pipeline.lightEngineParams.importDashboards,
            "recipients": service_pipeline.lightEngineParams.recipients,
            "pipelineId": service_pipeline.id,
            "notificationService": service_pipeline.lightEngineParams.notificationService,
        }
        if grafana is not None:
            params["grafanaUrl"] = grafana["url"]
            params["grafanaToken"] = grafana["token"]

        if service_pipeline.type.lower() in ("elb", "cloudfront"):
            params[
                "enrichmentPlugins"
            ] = service_pipeline.lightEngineParams.enrichmentPlugins
        return _create_stack_params(params)

    def save(self, service_pipeline: SvcPipeline) -> SvcPipeline:
        self._ddb_table.put_item(service_pipeline.dict())
        return service_pipeline

    def update_svc_pipeline(self, id: str, **attributes) -> None:
        if not attributes.get("updatedAt"):
            attributes["updatedAt"] = now_iso8601()

        self._ddb_table.update_item({"id": id}, attributes)

    def get_svc_pipeline(self, id: str):
        item = self._ddb_table.get_item({"id": id}, raise_if_not_found=True)
        return SvcPipeline.parse_obj(item)

    def list_svc_pipelines(
        self,
        filter_expression: Optional[ConditionBase] = None,
    ) -> List[SvcPipeline]:
        if not filter_expression:
            filter_expression = Attr("status").ne(StatusEnum.INACTIVE)

        items = self._ddb_table.list_items(filter_expression)
        return [SvcPipeline.parse_obj(each) for each in items]


class ETLLogDao:
    def __init__(self, table_name) -> None:
        self._ddb_table = DynamoDBUtil(table_name)

    def query_execution_logs(
        self,
        pipeline_index_key: str,
        start_time: Optional[str] = None,
        end_time: Optional[str] = "",
        status: Optional[ExecutionStatus] = None,
        limit: Optional[int] = 10,
        last_evaluated_key: Optional[str] = None,
    ):
        key_condition_expression = Key("pipelineIndexKey").eq(pipeline_index_key)
        if start_time and end_time:
            key_condition_expression = key_condition_expression & Key(
                "startTime"
            ).between(start_time, end_time)
        elif start_time and not end_time:
            key_condition_expression = key_condition_expression & Key("startTime").gt(
                start_time
            )
        elif not start_time and end_time:
            key_condition_expression = key_condition_expression & Key("startTime").lt(
                end_time
            )

        query_parameters = {
            "IndexName": "IDX_PIPELINE",
            "KeyConditionExpression": (key_condition_expression),
            "ScanIndexForward": False,
            "Limit": limit,
        }

        if last_evaluated_key:
            query_parameters["ExclusiveStartKey"] = last_evaluated_key

        if status:
            query_parameters["FilterExpression"] = Attr("status").eq(status)

        return self._ddb_table._table.query(**query_parameters)
