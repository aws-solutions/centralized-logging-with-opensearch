# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

from commonlib.logging import get_logger
import os
import uuid
from boto3.dynamodb.conditions import Attr
from svc.s3 import S3SourceHandler
from svc.ec2 import EC2SourceHandler
from svc.k8s import EKSSourceHandler
from svc.syslog import SyslogSourceHandler
from commonlib import AWSConnection, ErrorCode, APIException
from commonlib.dao import (
    AppPipelineDao,
    LogConfigDao,
    LogSourceDao,
    AppLogIngestionDao,
    InstanceIngestionDetailDao,
    s3_notification_prefix,
)
from commonlib.aws import (
    verify_s3_bucket_prefix_overlap_for_event_notifications,
)
from commonlib.utils import paginate
from commonlib.model import (
    AppPipeline,
    AppLogIngestion,
    LogSource,
    SyslogSource,
    AOSParams,
    Input,
    Output,
    BufferTypeEnum,
    LogSourceTypeEnum,
    LogTypeEnum,
    Param,
    StatusEnum,
)
from typing import List

logger = get_logger(__name__)

app_pipeline_table_name = os.environ.get("APP_PIPELINE_TABLE_NAME")
app_log_ingestion_table_name = os.environ.get("APP_LOG_INGESTION_TABLE_NAME")
log_config_table_name = os.environ.get("APP_LOG_CONFIG_TABLE_NAME")
log_source_table_name = os.environ.get("LOG_SOURCE_TABLE_NAME")
instance_ingestion_detail_table_name = os.environ.get(
    "INSTANCE_INGESTION_DETAIL_TABLE_NAME"
)

app_pipeline_dao = AppPipelineDao(table_name=app_pipeline_table_name)
ingestion_dao = AppLogIngestionDao(table_name=app_log_ingestion_table_name)
log_config_dao = LogConfigDao(table_name=log_config_table_name)
log_source_dao = LogSourceDao(table_name=log_source_table_name)

instance_ingestion_detail_dao = InstanceIngestionDetailDao(
    table_name=instance_ingestion_detail_table_name
)
current_region = os.environ.get("REGION")
s3_client = AWSConnection().get_client("s3", current_region)


class AppLogIngestionService:
    def validate_log_path(self, **args):
        if args.get("logPath"):
            result = self.list_app_log_ingestions(**args)
            logger.info(result)
            if result["total"] > 0:
                raise APIException(
                    ErrorCode.UNSUPPORTED_ACTION,
                    "Cannot import this source, the log path is duplicated",
                )

    def refresh_app_log_ingestion(self, **args):
        result = self.list_app_log_ingestions(**args)
        ingestion_list = result.get("appLogIngestions")
        for item in ingestion_list:
            app_log_ingestion: AppLogIngestion = AppLogIngestion.parse_obj(item)
            self.create_app_log_ingestion(app_log_ingestion)

    def create_app_log_ingestion(self, app_log_ingestion: AppLogIngestion):  # NOSONAR
        app_pipeline_id = app_log_ingestion.appPipelineId
        app_pipeline: AppPipeline = app_pipeline_dao.get_app_pipeline(app_pipeline_id)
        is_refresh = True
        if not app_log_ingestion.id:
            app_log_ingestion.id = str(uuid.uuid4())
            is_refresh = False
        log_config_id = app_pipeline.logConfigId
        log_config_version = app_pipeline.logConfigVersionNumber
        log_config = log_config_dao.get_log_config(log_config_id, log_config_version)

        app_log_ingestion.logConfig = log_config

        log_source: LogSource = log_source_dao.get_log_source(
            app_log_ingestion.sourceId
        )
        app_log_ingestion.accountId = log_source.accountId
        app_log_ingestion.region = log_source.region
        app_log_ingestion.sourceType = log_source.type

        if log_source.type == LogSourceTypeEnum.S3:
            logging_bucket_name = log_source.s3.bucketName
            logging_bucket_prefix = log_source.s3.keyPrefix
            verify_s3_bucket_prefix_overlap_for_event_notifications(
                s3_client,
                logging_bucket_name,
                s3_notification_prefix(logging_bucket_prefix),
            )

            # call s3 ingestion
            s3_source = S3SourceHandler(ingestion_dao)
            s3_source.create_s3_ingestion(app_log_ingestion, log_source, app_pipeline)
        else:
            args = {
                "appPipelineId": app_pipeline_id,
                "sourceId": app_log_ingestion.sourceId,
                "logPath": app_log_ingestion.logPath,
            }
            if not is_refresh:
                self.validate_log_path(**args)

            # handle output
            output_dict = dict()
            output_dict["roleArn"] = app_pipeline.bufferAccessRoleArn
            output_dict["roleName"] = app_pipeline.bufferAccessRoleName
            output_dict["name"] = app_pipeline.bufferType
            output_params = app_pipeline_dao.get_buffer_params(
                app_pipeline=app_pipeline
            )
            if app_pipeline.bufferType == BufferTypeEnum.NONE:
                output_dict["name"] = "AOS"
                output_dict["params"] = self.get_aos_params(app_pipeline.aosParams)
            else:
                if app_pipeline.bufferType == BufferTypeEnum.KDS:
                    param = {
                        "paramKey": "streamName",
                        "paramValue": app_pipeline.bufferResourceName,
                    }
                    output_params.append(param)
                elif app_pipeline.bufferType == BufferTypeEnum.S3:
                    param = {
                        "paramKey": "logBucketName",
                        "paramValue": app_pipeline.bufferResourceName,
                    }
                    output_params.append(param)
                output_dict["params"] = output_params
            output = Output(**output_dict)
            app_log_ingestion.output = output

            # handle input
            input_dict = dict()
            input_dict["name"] = "tail"
            if LogTypeEnum.WINDOWS_EVENT == log_config.logType:
                input_dict["name"] = "winlog"
            app_log_ingestion.input = Input(**input_dict)
            if log_source.type == LogSourceTypeEnum.Syslog:
                input_dict["name"] = "syslog"
                input_dict["params"] = self.get_syslog_input_params(log_source.syslog)
                app_log_ingestion.input = Input(**input_dict)

                # create NLB, syslog substack
                syslog_source = SyslogSourceHandler(ingestion_dao)
                syslog_source.create_syslog_substack(
                    log_source, app_log_ingestion, app_pipeline
                )
                # save ingestion, generate FluentBit conf & upload to s3
                syslog_source.create_ingestion(log_source, app_log_ingestion)

            elif log_source.type == LogSourceTypeEnum.EC2:
                # EC2
                ec2_source = EC2SourceHandler(ingestion_dao)
                ec2_source.check_duplicated_win_event_log(
                    log_source.sourceId, app_log_ingestion.appPipelineId
                )
                app_log_ingestion = ingestion_dao.save(app_log_ingestion)
                ec2_source.create_ingestion(log_source, app_log_ingestion)
            else:
                # With EKS scenario, we only save ingestion and attach assume role. When calling to view the EKS deployment yaml, we will call FluentBit service to generate configuration
                eks_source = EKSSourceHandler(ingestion_dao)
                eks_source.create_ingestion(log_source, app_log_ingestion)
        return app_log_ingestion.id

    def get_syslog_input_params(self, sys_log: SyslogSource) -> List[Param]:
        params: List[Param] = []

        param = {"paramKey": "protocolType", "paramValue": sys_log.protocol}
        params.append(param)

        param = {"paramKey": "port", "paramValue": sys_log.port}
        params.append(param)

        param = {"paramKey": "listen", "paramValue": f"{0}.0.0.0"}  # for pass bandit
        params.append(param)
        return params

    def get_aos_params(self, aos_params: AOSParams) -> List[Param]:
        params: List[Param] = []

        param = {
            "paramKey": "opensearchEndpoint",
            "paramValue": aos_params.opensearchEndpoint,
        }
        params.append(param)

        param = {"paramKey": "indexPrefix", "paramValue": aos_params.indexPrefix}
        params.append(param)
        return params

    def delete_app_log_ingestion(self, id: str):
        app_log_ingestion: AppLogIngestion = ingestion_dao.get_app_log_ingestion(id)
        if app_log_ingestion and (
            app_log_ingestion.status == StatusEnum.ACTIVE
            or app_log_ingestion.status == StatusEnum.ERROR
        ):
            app_log_ingestion.status = StatusEnum.INACTIVE

            log_source: LogSource = log_source_dao.get_log_source(
                app_log_ingestion.sourceId
            )
            if log_source.type == LogSourceTypeEnum.EC2:
                # delete ingestion, remove ingestion from instance, re-generate flb configuration and uploading s3
                ec2_source = EC2SourceHandler(ingestion_dao)
                ec2_source.delete_ingestion(log_source, app_log_ingestion)
            elif log_source.type == LogSourceTypeEnum.Syslog:
                # delete ingestion and log source, NLB resource
                syslog_source = SyslogSourceHandler(ingestion_dao)
                syslog_source.delete_ingestion(log_source, app_log_ingestion)
            elif log_source.type == LogSourceTypeEnum.EKSCluster:
                # only delete ingestion
                ingestion_dao.update_app_log_ingestion(id, status=StatusEnum.INACTIVE)
            else:
                s3_source = S3SourceHandler(ingestion_dao)
                app_pipeline: AppPipeline = app_pipeline_dao.get_app_pipeline(
                    app_log_ingestion.appPipelineId
                )
                s3_source.delete_ingestion(app_pipeline, log_source, app_log_ingestion)
        else:
            raise APIException(
                ErrorCode.UNSUPPORTED_ACTION,
                "Cannot delete this ingestion, please check the ingestion status",
            )

    def get_k8s_deployment_content_with_daemon_set(self, source_id: str) -> str:
        log_source: LogSource = log_source_dao.get_log_source(source_id)
        if (
            LogSource
            and log_source.status == StatusEnum.ACTIVE
            and log_source.type == LogSourceTypeEnum.EKSCluster
        ):
            eks_ingestion_list = ingestion_dao.list_app_log_ingestions(
                Attr("sourceId")
                .eq(log_source.sourceId)
                .__and__(Attr("status").eq(StatusEnum.ACTIVE))
            )
            if len(eks_ingestion_list) > 0:
                eks_source_handler = EKSSourceHandler(ingestion_dao)
                return eks_source_handler.get_deployment_content(
                    log_source, eks_ingestion_list
                )

        return ""

    def get_k8s_deployment_content_with_sidecar(self, id: str) -> str:
        ingestion = ingestion_dao.get_app_log_ingestion(id)
        if ingestion:
            log_source: LogSource = log_source_dao.get_log_source(ingestion.sourceId)
            if log_source.type == LogSourceTypeEnum.EKSCluster:
                eks_source_handler = EKSSourceHandler(ingestion_dao)
                return eks_source_handler.get_sidecar_content(log_source, ingestion)
        return ""

    def list_app_log_ingestions(self, **args) -> dict:
        """list ingestion"""
        conditions = Attr("status").ne(StatusEnum.INACTIVE)
        app_pipeline_id = args.get("appPipelineId")
        source_id = args.get("sourceId")
        region = args.get("region")
        account_id = args.get("accountId")
        log_path = args.get("logPath")

        page: int = args.get("page") or 1
        count: int = args.get("count") or 100

        if app_pipeline_id:
            conditions = conditions.__and__(Attr("appPipelineId").eq(app_pipeline_id))
        if source_id:
            conditions = conditions.__and__(Attr("sourceId").eq(source_id))
        if region:
            conditions = conditions.__and__(Attr("region").eq(region))
        if account_id:
            conditions = conditions.__and__(Attr("accountId").eq(account_id))
        if log_path:
            conditions = conditions.__and__(Attr("logPath").eq(log_path))

        results = ingestion_dao.list_app_log_ingestions(conditions)

        total, results = paginate([s.dict() for s in results], page or 1, count or 100)
        return {
            "appLogIngestions": results,
            "total": total,
        }

    def list_instance_ingestion_details(self, **args) -> dict:
        self.check_list_instance_ingestion_details_params(**args)
        conditions = Attr("status").ne(StatusEnum.ACTIVE)
        if args.get("ingestionId"):
            conditions = conditions.__and__(
                Attr("ingestionId").eq(args.get("ingestionId"))
            )
        if args.get("instanceId"):
            conditions = conditions.__and__(
                Attr("instanceId").eq(args.get("instanceId"))
            )

        results = instance_ingestion_detail_dao.list_instance_ingestion_details(
            conditions
        )
        page: int = args.get("page") or 1
        count: int = args.get("count") or 100

        total, results = paginate([s.dict() for s in results], page, count)
        return {
            "instanceIngestionDetail": results,
            "total": total,
        }

    def check_list_instance_ingestion_details_params(self, **args):
        if "ingestionId" not in args and "instanceId" not in args:
            raise APIException(
                ErrorCode.UNSUPPORTED_ACTION,
                "'ingestionId' or 'instanceId', please at least one must be selected as parameter",
            )
