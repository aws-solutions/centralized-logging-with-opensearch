from dataclasses import dataclass
import os
from abc import ABC, abstractmethod

import boto3
from botocore import config

solution_id = os.environ.get('SOLUTION_ID',
                          'SO8025/' + os.environ.get('SOLUTION_VERSION', "v1.0.0"))
user_agent_config = {'user_agent_extra': f'AwsSolution/{solution_id}'}
default_config = config.Config(**user_agent_config)
default_region = os.environ.get("AWS_REGION")
# Get S3 resource
config_file_s3_bucket_name = os.environ.get('CONFIG_FILE_S3_BUCKET_NAME')

# Get DDB resource.
dynamodb = boto3.resource('dynamodb', config=default_config)
app_pipeline_table_name = os.environ.get('APP_PIPELINE_TABLE_NAME')
app_log_config_table_name = os.environ.get('APP_LOG_CONFIG_TABLE_NAME')
app_log_ingestion_table_name = os.environ.get('APPLOGINGESTION_TABLE')
log_source_table_name = os.environ.get('LOG_SOURCE_TABLE_NAME')


app_pipeline_table = dynamodb.Table(app_pipeline_table_name)
app_log_config_table = dynamodb.Table(app_log_config_table_name)
app_log_ingestion_table = dynamodb.Table(app_log_ingestion_table_name)
log_source_table = dynamodb.Table(log_source_table_name)

sts = boto3.client("sts", config=default_config)
default_account_id = sts.get_caller_identity()["Account"]

@dataclass
class PipeObject:
    """
    Data class for pipe object.
    Define the structure of fluent bit pipeline ddb id.
    """
    source_id: str
    config_id: str
    app_pipeline_id: str

@dataclass
class PipeInfo:
    """
    Data class for pipe info. 
    Define the structure of fluent bit pipeline informations.
    """
    source_info: dict
    config_info: dict
    output_info: dict

class DDBConnect(ABC):
    def __init__(self, pipe_object_list: list[PipeObject]) -> None:
        """
        Merge service, input, parser(include filter) and output together
        Input:
        [
            PipeObject(
                source_id=source_id_1,
                config_id=config_id_1,
                app_pipeline_id=app_pipeline_1
            ),
            PipeObject(
                source_id=source_id_2,
                config_id=config_id_2,
                app_pipeline_id=app_pipeline_2
            ),
            ...
        ]
        :return:
        """
        self.pipe_object_list = pipe_object_list

    def get_pipe_info_list(self) -> list[PipeInfo]:
        """
        Query the source, config(include filter) and output data from ddb.
        Return the pipe info array.
        :return:
            [
                PipeInfo(
                    source_info=source_object_1,
                    config_info=config_object_1,
                    output_info=output_object_1
                ),
                PipeInfo(
                    source_info=source_object_2,
                    config_info=config_object_2,
                    output_info=output_object_2
                ),
                ...
            ]
        """
        pipe_info_list = []

        for pipe_object in self.pipe_object_list:
            pipe_info = PipeInfo(
                source_info=self.get_source_info(pipe_object.source_id),
                config_info=self.get_config_info(pipe_object.config_id),
                output_info=self.get_output_info(pipe_object.app_pipeline_id, pipe_object.config_id)
            )
            
            pipe_info_list.append(pipe_info)

        return pipe_info_list

    @abstractmethod
    def get_source_info(self, source_id):
        pass

    def get_output_info(self, app_pipeline_id, config_id="") -> dict:
        app_pipeline_resp = app_pipeline_table.get_item(
            Key={'id': app_pipeline_id})['Item']

        buffer_type = app_pipeline_resp.get("bufferType").upper()
        buffer_access_role_arn = app_pipeline_resp.get("bufferAccessRoleArn", "")
        buffer_access_role_name = app_pipeline_resp.get("bufferAccessRoleName", "")
        buffer_resource_arn = app_pipeline_resp.get("bufferResourceArn", "")
        buffer_resource_name = app_pipeline_resp.get("bufferResourceName", "")
        buffer_params = app_pipeline_resp.get("bufferParams", [])

        output_info = {
            "app_pipeline_id": app_pipeline_id,
            "buffer_type": buffer_type,
            "buffer_region": default_region,
            "buffer_access_role_arn": buffer_access_role_arn,
            "buffer_access_role_name": buffer_access_role_name,
            "buffer_resource_arn": buffer_resource_arn,
            "buffer_resource_name": buffer_resource_name,
            "buffer_params": buffer_params
        }

        if buffer_type == "S3":
            enrich_output_info = self._get_output_info_s3(buffer_params, output_info)
        elif buffer_type == "KDS":
            enrich_output_info = self._get_output_info_kds(buffer_params, output_info)
        elif buffer_type == "MSK":
            enrich_output_info = self._get_output_info_msk(buffer_params, output_info)
        else:
            # None buffer layer
            aos_params = app_pipeline_resp.get("aosParams", {})
            enrich_output_info = self._get_output_info_aos(aos_params, output_info, config_id)

        return enrich_output_info

    def get_config_info(self, config_id):
        app_config_resp = app_log_config_table.get_item(
            Key={'id': config_id})['Item']

        log_type = app_config_resp.get("logType")
        processor_filter_regex = app_config_resp.get("processorFilterRegex")
        time_offset = app_config_resp.get("timeOffset")
        regular_expression = app_config_resp.get("regularExpression")
        time_key = app_config_resp.get("timeKey")
        parser_format = self._get_parser_format(app_config_resp.get("logType"))
        time_format = self._get_time_format(app_config_resp.get('regularSpecs'))

        return {
            "config_id": config_id,
            "logType": log_type,
            "processorFilterRegex": processor_filter_regex,
            "time_offset": time_offset,
            "regular_expression": regular_expression,
            "time_key": time_key,
            "time_format": time_format,
            "parser_format": parser_format,
        }

    def _get_output_info_s3(self, buffer_params, output_info):
        enrich_output_info = output_info
        for param in buffer_params:
            if param['paramKey'] == 'logBucketPrefix':
                enrich_output_info['log_bucket_prefix'] = param['paramValue']
            elif param['paramKey'] == 'maxFileSize':
                enrich_output_info['max_file_size'] = param['paramValue']
            elif param['paramKey'] == 'uploadTimeout':
                enrich_output_info['upload_timeout'] = param['paramValue']
            elif param['paramKey'] == 'compressionType':
                enrich_output_info['compression_type'] = param['paramValue']
        return enrich_output_info

    def _get_output_info_msk(self, buffer_params, output_info):
        return output_info

    def _get_output_info_kds(self, buffer_params, output_info):
        return output_info

    def _get_output_info_aos(self, aos_params, output_info, config_id):
        enrich_output_info = output_info
        # Get the time key from config table
        app_config_resp = app_log_config_table.get_item(
            Key={'id': config_id})['Item']

        enrich_output_info['time_key'] = app_config_resp.get("timeKey")

        enrich_output_info['opensearch_endpoint'] = aos_params['opensearchEndpoint']
        enrich_output_info['index_prefix'] = aos_params['indexPrefix']

        return enrich_output_info

    @staticmethod
    def _get_time_format(regularSpecs: list) -> str:
        """
        Help function to get the time format from log config
        """
        kvs = list(filter(lambda x: x.get("format"), regularSpecs))
        if len(kvs) > 0:
            return kvs[0]["format"]
        return '""'  # empty string

    @staticmethod
    def _get_parser_format(logType: str) -> str:
        """
        Help function to map the log type to parser format
        """
        if logType == "SingleLineText":
            return "regex"
        elif logType == "Syslog":
            return "regex"
        elif logType == "JSON":
            return "json"
        else:
            raise RuntimeError(f'Unknown logType: {logType}')


class SyslogDDBConnect(DDBConnect):
    def get_source_info(self, source_id):
        log_source_resp = log_source_table.get_item(
            Key={'id': source_id})['Item']

        port = ''
        protocol_type = ''
        account_id = log_source_resp.get('accountId', default_account_id)
        region = log_source_resp.get('region', default_region)

        for info in log_source_resp['sourceInfo']:
            if info['key'] == 'syslogPort':
                port = info['value']
            elif info['key'] == 'syslogProtocol':
                protocol_type = info['value']

        return {
            "source_id": source_id,
            "account_id": account_id,
            "region": region,
            "protocol_type": protocol_type,
            "port": port
        }
