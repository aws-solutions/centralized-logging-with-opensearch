# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import os
import re
import json
import copy
import collections
from typing import Union
from types import SimpleNamespace
from functools import cached_property
from boto3.dynamodb.conditions import Attr
from utils import ValidateParameters, S3Client, SQSClient, IAMClient, SchedulerClient, GlueClient, EventsClient, logger
from utils.models.meta import MetaTable
from utils.aws.glue.table import TableMetaData
from utils.aws.glue import dataformat
from utils.grafana import GrafanaClient, AthenaConnection
from utils.logschema import JsonSchemaToGlueSchema
from utils.logschema.services import ALB_RAW, ALB_PARQUET, ALB_METRICS
from utils.logschema.services import CLOUDFRONT_RAW, CLOUDFRONT_PARQUET, CLOUDFRONT_METRICS
from utils.logschema.services import WAF_RAW, WAF_PARQUET, WAF_METRICS
from utils.logschema.services import CLOUDTRAIL_RAW, CLOUDTRAIL_PARQUET, CLOUDTRAIL_METRICS
from utils.logschema.services import VPCFLOW_RAW, VPCFLOW_PARQUET
from dashboards import APPLICATION_GRAFANA_DETAILS, ALB_GRAFANA_DASHBOARD, ALB_GRAFANA_DETAILS, CLOUDFRONT_GRAFANA_DASHBOARD, CLOUDFRONT_GRAFANA_DETAILS, WAF_GRAFANA_DASHBOARD, WAF_GRAFANA_DETAILS, CLOUDTRAIL_GRAFANA_DASHBOARD, CLOUDTRAIL_GRAFANA_DETAILS


class Parameters(ValidateParameters):
    """This class is used to parse ,validate and store all incoming parameters.
    
       Request message body structure reference aws-cdk-lib.custom_resources.Provider
       
       # see https://github.com/aws/aws-cdk/blob/main/packages/aws-cdk-lib/custom-resources/test/provider-framework/integration-test-fixtures/s3-file-handler/index.ts
       
       !!!Case sensitive!!! 
       
       :param parameters (dict): e.g.  {
                                            "RequestType": "Create|Update|Delete",
                                            "ResourceProperties": {
                                                "Resource": "pipeline",
                                                "Id": "189f73eb-1808-47e4-a9db-ee9c35100abe",
                                            }
                                       }
           

    """
    
    def _required_parameter_check(self, parameters) -> None:
        """Required parameter verification, when the parameter does not exist, an exception message will be returned."""
        self._child_parameter_lookup_check(parameters, keys=('RequestType', 'ResourceProperties',))
        self._child_parameter_lookup_check(parameters['ResourceProperties'], keys=('Resource', 'Id',))

        self.action = parameters['RequestType']
        self.id = parameters['ResourceProperties']['Id']
        self.resource = parameters['ResourceProperties']['Resource']
        if self.resource not in ('pipeline', 'ingestion'):
            raise ValueError(f'Not supported Resource: {self.resource}, supported: pipeline, ingestion')
    
        self.ddb_client_metadata = MetaTable()

        if parameters['ResourceProperties'].get('Item'):
            self.ddb_client_metadata.put(meta_name=self.id, item=parameters['ResourceProperties']['Item'])
        self.policy_sid = self.id.replace('-', '')
        
        if self.resource == 'pipeline':
            self.pipeline_id = self.id
        else:
            self.ingestion_id = self.id
            ingestion_info = self.ddb_client_metadata.get(meta_name=self.ingestion_id)
            self.pipeline_id = '' if not ingestion_info else ingestion_info.get('pipelineId', '')
        self.tags = json.loads(os.environ.get('TAGS', '[]'))
    
    @cached_property
    def staging_bucket(self) -> str:
        return self.ddb_client_metadata.get(meta_name='StagingBucket')['name']
    
    @cached_property
    def scheduler_is_available(self) -> bool:
        if 'scheduler' in self.ddb_client_metadata.get(meta_name='AvailableServices')['value']:
            return True
        else:
            return False

    def _get_scheduler_info(self, schedule: str = 'rate(5 minutes)', age: int = -1, scheduler_type: str = 'LogProcessor') -> SimpleNamespace:
        """Get step function arn, execution role, schedule rate and age corresponding to the scheduler from DynamoDB.

        Args:
            schedule (str, optional): The expression that defines when the schedule runs.
            age (int, optional): The number of days to merge / archive objects.
            scheduler_type (str, optional): Supported value: [LogProcessor, LogMerger, LogArchive]. Defaults to 'LogProcessor'.

        Returns:
            SimpleNamespace: _description_
        """
        supported_scheduler_type = ('LogProcessor', 'LogMerger', 'LogArchive')
        if scheduler_type not in supported_scheduler_type:
            raise ValueError(f'Not supported scheduler_type: {scheduler_type}, supported: {", ".join(supported_scheduler_type)}.')
        
        ns = self._init_name_space()
        ns.arn = self.ddb_client_metadata.get(meta_name=scheduler_type)['arn']
        ns.execution_role =  self.ddb_client_metadata.get(meta_name=f'{scheduler_type}StartExecutionRole')['arn']
        ns.schedule = schedule
        ns.age = age
        
        return ns

    def _get_bucket_object(self, bucket: str, prefix: str, sts_role_arn: str = '') -> SimpleNamespace:
        """Generate a bucket object, return the following attributes:
            bucket: The bucket name.
            prefix: The prefix path.
            arn: The arn of the bucket.
            uri: The s3 URI. e.g. s3://{bucket}/{prefix}.
            archive_uri: A s3 path for archiving files in staging bucket, e.g. s3://{staging_bucket}/archive/{prefix}.

        Args:
            bucket (str): The bucket name.
            prefix (str): The prefix path.

        Returns:
            SimpleNamespace: _description_
        """
        s3_client = S3Client(sts_role_arn=sts_role_arn)
        
        ns = self._init_name_space()
        ns.bucket = bucket
        
        prefix = '/' if prefix == '' else os.path.normpath(prefix)
        ns.prefix = prefix if prefix[0] != '/' else prefix[1:]
        
        ns.arn = s3_client.get_bucket_arn_from_name(bucket=ns.bucket)
        ns.uri = f's3://{ns.bucket}/{ns.prefix}'
        
        ns.archive_uri = f's3://{self.staging_bucket}/archive/{ns.prefix}'
        return ns
        
    def _get_staging_bucket_info(self, prefix: str = '/') -> SimpleNamespace:
        """Get staging bucket and prefix of bucket of pipeline from DynamoDB.
        
        Args:
            prefix (str): The prefix path. Defaults to ''.

        Returns:
            SimpleNamespace: _description_
        """

        return self._get_bucket_object(bucket=self.staging_bucket, prefix=prefix)
    
    def _get_destination_info(self, info : dict) -> SimpleNamespace:
        """Get destination info of the pipeline, return the following attributes:
            location:
                bucket (str): The bucket name for storage parquet data. 
                prefix (str): The arn of bucket as prefix for the database
                arn (str): The arn of the bucket.
                uri (str): The S3 URI, e.g. s3://{location.bucket}/{location.prefix}.
                archive_uri (str): A s3 path for archiving files in staging bucket, e.g. s3://{location.bucket}/{location.prefix}.
            database:
                name (str): The database name of centralized.
                location:
                    bucket (str): The bucket name of the database.
                    prefix (str): The prefix of the database.
                    arn (str): The arn of the bucket.
                    uri (str): The S3 URI, e.g. s3://{location.bucket}/{location.prefix}/{database.name}.
                    archive_uri (str): A s3 path for archiving files in staging bucket, e.g. s3://{location.bucket}/archive/{location.prefix}/{database.name}.
            table:
                name (str): The table name of centralized.
                schema (dict, Optional): Json schema of the table.
                location:
                    bucket (str): The bucket name of the table.
                    prefix (str): The prefix of the table.
                    arn (str): The arn of the bucket.
                    uri (str): The S3 URI, e.g. s3://{location.bucket}/{location.prefix}/{database.name}/{table.name}.
                    archive_uri (str): A s3 path for archiving files in staging bucket, e.g. s3://{location.bucket}/archive/{location.prefix}/{database.name}/{table.name}.
            metrics:
                name (str, Optional): The table name of centralized.
                schema (dict, Optional): Json schema of the table.
                location:
                    bucket (str): The bucket name of the table.
                    prefix (str): The prefix of the table.
                    arn (str): The arn of the bucket.
                    uri (str): The S3 URI, e.g. s3://{location.bucket}/{location.prefix}/{database.name}/{metrics.name}.
                    archive_uri (str): A s3 path for archiving files in staging bucket, e.g. s3://{location.bucket}/archive/{location.prefix}/{database.name}/{metrics.name}.

        Returns:
            SimpleNamespace: _description_
        """
        
        destination = self._init_name_space()
        location = info['location']
        destination.location = self._get_bucket_object(bucket=location['bucket'], prefix=location['prefix'])
        
        database = info['database']
        destination.database = self._init_name_space({'name': database['name']})
        destination.database.location = self._get_bucket_object(bucket=location['bucket'], prefix=f"{location['prefix']}/{database['name']}")
        
        table = info['table']
        destination.table = self._init_name_space({'name': table['name']})
        destination.table.schema = json.loads(table.get('schema', '{}'))
        destination.table.location = self._get_bucket_object(bucket=location['bucket'], prefix=f"{location['prefix']}/{database['name']}/{table['name']}")
        
        metrics = info['metrics']
        metrics_table_name = metrics['name'] if metrics['name'] else f"{destination.table.name}_metrics"
        
        destination.metrics = self._init_name_space({'name': metrics_table_name})
        destination.metrics.schema = json.loads(metrics.get('schema', '{}'))
        destination.metrics.location = self._get_bucket_object(bucket=location['bucket'], prefix=f"{location['prefix']}/{database['name']}/{metrics_table_name}")
        
        destination.enrichment_plugins = info['enrichmentPlugins'].split(',') if info.get('enrichmentPlugins') else []
        
        return destination

    def _is_json_string(self, input_string: str) -> bool:
        """Verify if the input string is a valid Json string.
        
        Returns:
            bool: _description_
        """
        try:
            json.loads(input_string)
            return True
        except Exception as e:
            logger.warning(e)
            return False
            
    def _validate_source_table_attribute(self, source_type: str, table_info: dict) -> bool:
        """Verify whether the attribute information of the table is compliant. 
           If the verification is passed, return True, and if the verification is not passed, return False.

        Args:
            source_type: The log type, e.g. waf.
            table_info (dict): The attribute information of the table includes the following keys.
                name (str, optional): The table name.
                schema (dict): Json schema of the raw log.
                data_format (DataFormat): The data format of raw log. supported value: see utils.aws.glue.dataformat
                table_properties (dict): The TBLPROPERTIES of raw log table.
                serialization_properties (dict): The SERDEPROPERTIES of raw log table.

        Returns:
            bool: _description_
        """
        if source_type in ('fluent-bit', 's3'):
            schema = table_info.get('schema', '{}')
            if self._is_json_string(input_string=schema) is False or not schema:
                logger.info(f"When the source type is fluent bit or s3, the schema must be defined and a valid JSON string, "
                            f"and the current value is {table_info.get('schema')}.")
                return False

            data_format = table_info.get('dataFormat', '').lower()
            if data_format not in dataformat.DATA_FORMAT_MAPPING:
                logger.info(f"Unsupported data format: {data_format}, "
                            f"supported value: {dataformat.DATA_FORMAT_MAPPING.keys()}.")
                return False
            
            for required_key in ('tableProperties', 'serializationProperties'):
                input_string = table_info.get(required_key, '{}')
                if self._is_json_string(input_string=input_string) is False:
                    logger.info(f"When the source type is fluent bit or s3, the {required_key} must be a valid JSON string, "
                            f"and the current value is {table_info.get(required_key)}.")
                    return False
            
            if data_format == 'regex' and not json.loads(table_info.get('serializationProperties', '{}')).get('input.regex'):
                logger.info('The data format is Regex, but input.regex is not defined in serializationProperties.')
                return False
        return True
    
    def _get_pipeline_source_info(self, info: dict) -> SimpleNamespace:
        """Get source info of the pipeline, return the following attributes:
            type: The log type, e.g. waf.
            database:
                name (str): The database name.
            table:
                name (str): The table name.
                schema (dict): Json schema of the raw log.
                data_format (DataFormat): The data format of raw log. supported value: see utils.aws.glue.dataformat
                table_properties (dict): The TBLPROPERTIES of raw log table.
                serialization_properties (dict): The SERDEPROPERTIES of raw log table.

        Returns:
            SimpleNamespace: _description_
        """
        supported_source_type = ('waf', 'cloudfront', 'alb', 'cloudtrail', 'vpcflow', 's3', 'fluent-bit')
        
        source = self._init_name_space()
        source.type = info['type'].lower()
        if source.type not in supported_source_type:
            raise ValueError(f'Not supported source type: {source.type}, supported: {", ".join(supported_source_type)}.')
        
        source.database = self._init_name_space({'name': self.ddb_client_metadata.get(meta_name='TmpDatabase')['name']})
        
        if self._validate_source_table_attribute(source_type=source.type, table_info=info['table']) is False:
            raise ValueError('The source table is missing required definition. Please check the configuration of the source table information.')
        
        raw_table_info = {
            'name': info['table']['name'],
            'schema': json.loads(info['table'].get('schema', '{}')),
            'data_format': dataformat.DATA_FORMAT_MAPPING.get(info['table'].get('dataFormat', '').lower(), ''),
            'table_properties': json.loads(info['table'].get('tableProperties', '{}')),
            'serialization_properties': json.loads(info['table'].get('serializationProperties', '{}')),
        }
        source.table = self._init_name_space(raw_table_info)
        
        return source

    def _get_pipeline_grafana_info(self, info: dict) -> SimpleNamespace:
        import_dashboards = True if info.get('importDashboards') == 'true' else False
        grafana_url = info.get('url', '').strip().strip('/')
        grafana_token = info.get('token', '')

        if import_dashboards is True and (not grafana_url or not grafana_token):
            raise ValueError('When import dashboards is True, Grafana url and Service Account Token must be valid values.')
        
        ns = self._init_name_space({
            'import_dashboards':  import_dashboards,
            'url': grafana_url,
            'token': grafana_token,
            })
        
        ns.datasource = self._init_name_space({
            'account_id':  self.ddb_client_metadata.get(meta_name='AccountId')['value'],
            'region': self.ddb_client_metadata.get(meta_name='Region')['value'],
            'database': self.ddb_client_metadata.get(meta_name='CentralizedDatabase')['name'],
            'work_group': self.ddb_client_metadata.get(meta_name='AthenaWorkGroup')['name'],
            'output_location': self.ddb_client_metadata.get(meta_name='AthenaOutputLocation')['name'],
            'assume_role_arn': self.ddb_client_metadata.get(meta_name='AthenaPublicAccessRole')['arn'],
            'catalog': self.ddb_client_metadata.get(meta_name='CentralizedCatalog')['name'],
            })
        
        return ns
    
    def _get_pipeline_notification_info(self, info: dict) -> SimpleNamespace:
        ns = self._init_name_space()
        
        ns.service = info['service'].upper()
        
        if ns.service == 'SNS':
            ns.recipients = info.get('recipients', '')
        else:
            ns.recipients = [] if not info.get('recipients') else info['recipients'].split(',')
        
        return ns
    
    @cached_property
    def pipeline_info(self) -> SimpleNamespace:
        """Define Pipeline related attribute information.
        """
        
        ns = self._init_name_space()
        ns.data = self.ddb_client_metadata.get(meta_name=self.pipeline_id)
        
        ns.role = self._init_name_space()
        ns.role.s3_public_access = self.ddb_client_metadata.get(meta_name='S3PublicAccessPolicy')['arn']
        ns.role.replicate = ns.data['stack']['role']['replicate']
        
        scheduler = ns.data['data']['scheduler']
        ns.scheduler = self._init_name_space()
        ns.scheduler.service = 'scheduler' if self.scheduler_is_available is True else 'events'
        ns.scheduler.log_processor = self._get_scheduler_info(schedule=scheduler['LogProcessor']['schedule'], scheduler_type='LogProcessor')
        ns.scheduler.log_merger = self._get_scheduler_info(schedule=scheduler['LogMerger']['schedule'], age=int(scheduler['LogMerger'].get('age', -1)), scheduler_type='LogMerger')
        ns.scheduler.log_archive = self._get_scheduler_info(schedule=scheduler['LogArchive']['schedule'], age=int(scheduler['LogArchive'].get('age', -1)), scheduler_type='LogArchive')
        
        ns.staging = self._get_staging_bucket_info(prefix=ns.data['data']['staging']['prefix'])
        ns.notification = self._get_pipeline_notification_info(info=ns.data['data']['notification'])
        
        source_info = ns.data['data']['source']
        source_info['table']['name'] = f"{ns.data['data']['destination']['table']['name']}{{}}"
        ns.source = self._get_pipeline_source_info(info=source_info)
        ns.destination = self._get_destination_info(info=ns.data['data']['destination'])
        
        ns.grafana = self._get_pipeline_grafana_info(info=ns.data['data']['grafana'])
        
        ns.queue = self._init_name_space()
        ns.queue.log_event_queue = ns.data['stack']['queue']['logEventQueue']
        ns.queue.log_event_dlq = ns.data['stack']['queue']['logEventDLQ']

        return ns
    
    @cached_property
    def ingestion_info(self) -> SimpleNamespace:
        """Define Ingestion related attribute information.
        """
        ns = self._init_name_space()
        ns.data = self.ddb_client_metadata.get(meta_name=self.ingestion_id)
        
        ns.role = self._init_name_space()
        ns.role.sts = ns.data['data']['role']['sts']
        
        ns.source = self._init_name_space()
        ingestion_source = ns.data['data']['source']
        ns.source.location = self._get_bucket_object(bucket=ingestion_source['bucket'], prefix=ingestion_source['prefix'], sts_role_arn=ns.role.sts)
        
        return ns


class TableMetaDataGenerator:
    """Determine the log type based on the source type. Currently, the following types of logs are supported:
        Services:
            waf: AWS WAF logs.
            alb: AWS Application load balancer access logs.
            cloudfront: AWS CloudFront standard logs.
        Application:
            fluent-bit: The logs collected by fluent-bit are uniformly structured in Json format. 
                Before uploading logs to S3, fluent-bit will add agent information to the logs.
            s3: The format of logs stored on S3 is user-defined, provided that the log format can be parsed by Athena.    
    """
    
    def __init__(self, source: SimpleNamespace, destination: SimpleNamespace):
        """
        Args:
            source (SimpleNamespace): corresponding to Parameters.source, see Parameters._get_pipeline_source_info().
            destination (SimpleNamespace): corresponding to Parameters.destination, see Parameters._get_destination_info().
        """
        self.schema_transformer = JsonSchemaToGlueSchema()
        self.source = source
        self.destination = destination

    def add_fluent_bit_agent_info(self, schema: dict, table_type: str = 'tmp') -> dict:
        """Add agent related information to the schema based on the value of the table_type. 
           When the table_type is centralized, merge the agent information into one field.

        Args:
            schema (dict): The json schema of the log.
            table_type (str, optional): Supported value: tmp, centralized. Defaults to 'tmp'.
        Returns:
            dict: _description_
        """
        new_schema = copy.deepcopy(schema)
        ordered_properties = collections.OrderedDict()
        ordered_properties.update(new_schema['properties'])
        if table_type == 'tmp':
            for name in ('file_name', 'az', 'ec2_instance_id', 'private_ip', 'hostname', 'cluster'):
                if name not in ordered_properties:
                    ordered_properties[name] = {'type': 'string'}
            ordered_properties['kubernetes'] = {
                'type': 'object',
                'properties':{
                    'pod_name': {
                        'type': 'string'
                    },
                    'namespace_name': {
                        'type': 'string'
                    },
                    'container_name': {
                        'type': 'string'
                    },
                    'docker_id': {
                        'type': 'string'
                    }
                }
            }
        else:
            ordered_properties['agent_info'] = {
                'type': 'object',
                'properties': {
                    'file_name': {
                        'type': 'string',
                    },
                    'az': {
                        'type': 'string',
                    },
                    'ec2_instance_id': {
                        'type': 'string',
                    },
                    'private_ip': {
                        'type': 'string',
                    },
                    'hostname': {
                        'type': 'string',
                    },
                    'cluster': {
                        'type': 'string',
                    },
                    'kubernetes': {
                        'type': 'object',
                        'properties':{
                            'pod_name': {
                                'type': 'string'
                            },
                            'namespace_name': {
                                'type': 'string'
                            },
                            'container_name': {
                                'type': 'string'
                            },
                            'docker_id': {
                                'type': 'string'
                            }
                        }
                    }
                },
                'expression': 'CAST(ROW("file_name", "az", "ec2_instance_id", "private_ip", "hostname", "cluster", "kubernetes") AS ROW("file_name" varchar, "az" varchar, "ec2_instance_id" varchar, "private_ip" varchar, "hostname" varchar, "cluster" varchar, "kubernetes" ROW("pod_name" varchar, "namespace_name" varchar, "container_name" varchar, "docker_id" varchar)))'
            }
        new_schema['properties'] = ordered_properties
        return new_schema
    
    def find_time_key(self, schema: dict, source_type: str = 'fluent-bit') -> dict:
        """Find time key in Json Schema, search down the time key field layer by layer (ignore array and map type), 
           and then search the sub-level after the current layer is searched,  and return if the first time key field is found.
           
           If no timeKey is specified when the source type is fluent bit, use the "time" field as the timekey (fluent bit will supplement the time field in Iso8601 format).
           If no timeKey is specified when the source type is s3, return {}, it will not add a time partition key.

        Args:
            schema (dict): JSON Schema is a structure of JSON data
            source_type (str, optional): Defaults to fluent-bit.

        Returns:
            dict: Property of the time key field.
        """
        time_key = {}
        if source_type == 'fluent-bit':
            time_key = {'time': {'type': 'timestamp', 'format': 'YYYY-MM-dd\'\'T\'\'HH:mm:ss.SSSSSSSSSZ', 'path': '"time"'}}

        object_type_schema = []
        
        for name, property in schema['properties'].items():
            if property.get('timeKey') is True:
                return {'time': property}
            elif property['type'] == 'object':
                object_type_schema.append(property)
                
        for schema in object_type_schema:
            time_key_in_nested = self.find_time_key(schema=schema, source_type=source_type)
            if time_key_in_nested != time_key:
                return time_key_in_nested
        return time_key
    
    def add_time_key(self, schema: dict, source_type: str = 'fluent-bit') -> dict:
        """Find the timeKey field from the Json schema, and if it exists, add the time (UNIX timestamp in millisecond) 
           and timestamp (timestamp type) fields to the Json schema. If it does not exist, do nothing.

        Args:
            schema (dict): JSON Schema is a structure of JSON data
            source_type (str, optional): Defaults to 'fluent-bit'.

        Returns:
            dict: JSON Schema is a structure of JSON data
        """
        schema = self.schema_transformer.add_path(json_schema=schema)
        time_key = self.find_time_key(schema, source_type=source_type)
        if time_key:
            new_schema = copy.deepcopy(schema)
            new_schema['properties'].pop('time', None)
            new_schema['properties'].pop('timestamp', None)
    
            ordered_properties = collections.OrderedDict()
            if time_key["time"]["type"] in ('integer', 'big_int'):
                ordered_properties['time'] = {
                    'type': 'big_int',
                    'expression': time_key["time"].get("expression") or time_key["time"]["path"],
                }
                ordered_properties['timestamp'] = {
                    'type': 'timestamp',
                    'expression': f'CAST(FROM_UNIXTIME({time_key["time"].get("expression") or time_key["time"]["path"]}) AS timestamp)'
                }
            else:
                ordered_properties['time'] = {
                    'type': 'big_int',
                    'expression': f'CAST(to_unixtime(parse_datetime({time_key["time"]["path"]}, \'{time_key["time"]["format"]}\')) * 1000 AS bigint)',
                }
                ordered_properties['timestamp'] = {
                    'type': 'timestamp',
                    'expression': f'parse_datetime({time_key["time"]["path"]}, \'{time_key["time"]["format"]}\')'
                }
            ordered_properties.update(new_schema['properties'])
            new_schema['properties'] = ordered_properties
            
            return new_schema
        
        return schema

    def add_default_partition(self, schema: dict, source_type='fluent-bit') -> dict:
        """When data is converted to Parquet, it will be add __execution_name__ as a partition key, 
           and add an event_hour as a time partition key when a timeKey is specified in the schema, 
           and will not be added if not specified.

        Args:
            schema (dict): JSON Schema is a structure of JSON data

        Returns:
            dict: JSON Schema is a structure of JSON data
        """
        new_schema = copy.deepcopy(schema)
        new_schema = self.schema_transformer.add_path(json_schema=new_schema)
        time_key = self.find_time_key(new_schema, source_type=source_type)

        if time_key and not new_schema['properties'].get('event_hour'):
            new_schema['properties']['event_hour'] = {
                'type': 'string',
                'partition': True
            }
            if time_key["time"]["type"] in ('integer', 'big_int'):
                new_schema['properties']['event_hour']['expression'] = f'date_format(CAST(FROM_UNIXTIME({time_key["time"].get("expression") or time_key["time"]["path"]}) AS timestamp), \'%Y%m%d%H\')'
            else:
                new_schema['properties']['event_hour']['expression'] = f'date_format(parse_datetime({time_key["time"]["path"]}, \'{time_key["time"]["format"]}\'), \'%Y%m%d%H\')'
        if not new_schema['properties'].get('__execution_name__'):
            new_schema['properties']['__execution_name__'] = {
                'type': 'string',
                'partition': True,
                'expression': "'{{}}'"
            }
            
        return new_schema

    def get_raw_table_metadata(self, schema: dict, data_format: dataformat.DataFormat, table_properties: dict = {}, serialization_properties: dict = {}, source_type: str = 'fluent-bit') -> TableMetaData:
        """_summary_

        Args:
            schema (dict): The json schema of the raw log.
            data_format (DataFormat): The data format of raw log. supported value: see utils.aws.glue.dataformat
            table_properties (dict, optional): The TBLPROPERTIES of raw log table. Defaults to {}.
            serialization_properties (dict, optional): The SERDEPROPERTIES of raw log table. Defaults to {}.
            source_type (str, optional): When source_type is fluent-bit, it will call add_fluent_bit_agent_info function to add agent related information into schema.

        Returns:
            TableMetaData: _description_
        """
        raw_log_schema = self.schema_transformer.convert_time_type_to_string(json_schema=schema)
        if source_type == 'fluent-bit':
            if not self.find_time_key(schema=schema, source_type='s3'):
                raw_log_schema['properties']['time'] = {
                    'type': 'string', 
                    'timeKey': True,
                    'format': 'YYYY-MM-dd\'\'T\'\'HH:mm:ss.SSSSSSSSSZ'
                    }
            raw_log_schema = self.add_fluent_bit_agent_info(schema=raw_log_schema, table_type='tmp')
        
        return TableMetaData(schema=raw_log_schema, data_format=data_format, table_properties=table_properties, serialization_properties=serialization_properties, ignore_partition=True)
    
    def get_parquet_table_metadata_from_raw(self, schema: dict, source_type: str = 'fluent-bit') -> TableMetaData:
        """Generate parquet log schema through raw log schema, the following operations need to be performed.
            1. Add "path" key to schema, e.g. "processInfo"."processTime"
            2. Add default partition key to schema, e.g. event_hour, __execution_name__.
            3. Optional: if source_type is fluent-bit, add agent info to schema.
            4. Add time and timestamp field to schema if timeKey is specified.
            5. sort partition key.

        Args:
            schema (dict): JSON Schema is a structure of JSON data
            source_type (str, optional): Defaults to 'fluent-bit'.

        Returns:
            TableMetaData: see utils.aws.glue.table.TableMetaData
        """
        parquet_schema = copy.deepcopy(schema)
        parquet_schema = self.schema_transformer.add_path(json_schema=parquet_schema)
        parquet_schema = self.add_default_partition(schema=parquet_schema, source_type=source_type)
        partition_schema = self.schema_transformer.extract_partition_keys(json_schema=parquet_schema)
        
        parquet_schema = self.schema_transformer.remove_partition(json_schema=parquet_schema)
        parquet_schema = self.schema_transformer.convert_time_type_to_string(json_schema=parquet_schema)
        if source_type == 'fluent-bit':
            parquet_schema = self.add_fluent_bit_agent_info(schema=parquet_schema, table_type='centralized')
        parquet_schema = self.add_time_key(schema=parquet_schema, source_type=source_type)

        for key, value in partition_schema['properties'].items():
            parquet_schema['properties'].pop(key, None)
            parquet_schema['properties'][key] = value
        
        return TableMetaData(schema=parquet_schema, data_format=dataformat.Parquet, ignore_partition=False)

    def get_table_metadata(self) -> tuple[TableMetaData, TableMetaData, Union[TableMetaData, None]]:
        """Parsing source.type, returning or generating TableMetaData class information.
           If source.type is a Service logs, it returns directly, If it is an Application, 
           generate TableMetadata for raw and parquet through Json schema.

        Returns:
            tuple[TableMetaData, TableMetaData, Union[TableMetaData, None]]: [raw, parquet, metrics (optional)]
        """
        raw, parquet, metrics = None, None, None

        if self.source.type == 'waf':
            raw, parquet, metrics  = WAF_RAW, WAF_PARQUET, WAF_METRICS
        elif self.source.type == 'cloudfront':
            raw, parquet, metrics  = CLOUDFRONT_RAW, CLOUDFRONT_PARQUET, CLOUDFRONT_METRICS
        elif self.source.type == 'alb':
            raw, parquet, metrics  = ALB_RAW, ALB_PARQUET, ALB_METRICS
        elif self.source.type == 'cloudtrail':
            raw, parquet, metrics  = CLOUDTRAIL_RAW, CLOUDTRAIL_PARQUET, CLOUDTRAIL_METRICS
        elif self.source.type == 'vpcflow':
            raw, parquet, metrics  = VPCFLOW_RAW, VPCFLOW_PARQUET, None
        else:
            raw = self.get_raw_table_metadata(schema=self.source.table.schema, data_format=self.source.table.data_format, 
                                                table_properties=self.source.table.table_properties, 
                                                serialization_properties=self.source.table.serialization_properties,
                                                source_type=self.source.type)
            parquet_schema = self.destination.table.schema
            if parquet_schema:
                if self.source.type == 'fluent-bit':
                    parquet_schema = self.add_fluent_bit_agent_info(schema=parquet_schema, table_type='centralized')
                parquet = TableMetaData(schema=self.destination.table.schema, data_format=dataformat.Parquet, ignore_partition=False)
            else:
                source_schema = self.source.table.schema
                parquet = self.get_parquet_table_metadata_from_raw(schema=source_schema, source_type=self.source.type)
            
            if self.destination.metrics.schema:
                metrics = TableMetaData(schema=self.destination.metrics.schema, data_format=dataformat.Parquet, ignore_partition=False)
        
        return raw, parquet, metrics

    def get_table_metadata_and_statements(self) -> tuple[TableMetaData, TableMetaData, Union[TableMetaData, None], SimpleNamespace]:
        """Returning or generating TableMetaData class information and SQL statements, statements contains the following.
            1. create: Create SQL statements for reading raw logs from table.
            2. insert: Write the data from the raw log table into the Parquet insert statement.
            3. drop: Delete drop statement for reading raw log table.
            4. aggregate: SQL statements based on Parquet tables for aggregation calculations, it can be a List, 
                traversing and executing multiple metric calculations.

        Returns:
            tuple[TableMetaData, TableMetaData, Union[TableMetaData, None], SimpleNamespace]: [raw, parquet, metrics (optional), statements]
        """
        raw, parquet, metrics = self.get_table_metadata()
        
        statements = SimpleNamespace()
        statements.create = raw.statements.create.format(database=self.source.database.name, table_name=self.source.table.name, location='{}')
        statements.insert = parquet.statements.insert.format(destination_database=self.destination.database.name, 
                                                             destination_table=self.destination.table.name, 
                                                             source_database=self.source.database.name, 
                                                             source_table=self.source.table.name)
        statements.drop = raw.statements.drop.format(database=self.source.database.name, table_name=self.source.table.name)
        statements.aggregate = []
        
        if metrics:
            statements.aggregate.append(metrics.statements.aggregate.format(destination_database=self.destination.database.name, 
                                                                            destination_table=self.destination.metrics.name, 
                                                                            source_database=self.destination.database.name, 
                                                                            source_table=self.destination.table.name,
                                                                            execution_name='{}'))
        return raw, parquet, metrics, statements
 

class PipelineResourceBuilder:
    def __init__(self, parameters: Parameters):
        self.parameters = parameters
        self.sns_arn_regex = r'^arn:([^:\n]*):sns:([^:\n]*):(\d{12}):(.*)$'
        
        self.ddb_client_metadata = MetaTable()
        self.scheduler_client = SchedulerClient()
        self.events_client = EventsClient()
        self.sqs_client = SQSClient()
        self.glue_client = GlueClient()
        self.iam_client = IAMClient()

    @cached_property
    def table_metadata_and_statements(self) -> SimpleNamespace:
        self.table_metadata_generator = TableMetaDataGenerator(source=self.parameters.pipeline_info.source, destination=self.parameters.pipeline_info.destination)
        raw, parquet, metrics, statements = self.table_metadata_generator.get_table_metadata_and_statements()
        
        ns = SimpleNamespace()
        ns.raw = raw
        ns.parquet = parquet
        ns.metrics = metrics
        ns.statements = statements
        return ns
    
    def _init_grafana_info(self) -> None:
        self.athena_connection = AthenaConnection(database=self.parameters.pipeline_info.grafana.datasource.database,
                                                  account_id=self.parameters.pipeline_info.grafana.datasource.account_id, 
                                                  region=self.parameters.pipeline_info.grafana.datasource.region, 
                                                  work_group=self.parameters.pipeline_info.grafana.datasource.work_group, 
                                                  assume_role_arn=self.parameters.pipeline_info.grafana.datasource.assume_role_arn,
                                                  output_location=self.parameters.pipeline_info.grafana.datasource.output_location)
        self.grafana_client = GrafanaClient(url=self.parameters.pipeline_info.grafana.url, token=self.parameters.pipeline_info.grafana.token, verify=False)
        self.grafana_client.check_permission()
        self.grafana_folder_title = 'clo'
        self.grafana_details_uid = f'{self.parameters.pipeline_id}-00'
        self.grafana_dashboard_uid = f'{self.parameters.pipeline_id}-01'
    
    def get_grafana_dashboard(self, source_type: str) -> tuple[dict, Union[dict, None]]:
        if source_type == 'alb':
            return ALB_GRAFANA_DETAILS, ALB_GRAFANA_DASHBOARD
        elif source_type == 'waf':
            return WAF_GRAFANA_DETAILS, WAF_GRAFANA_DASHBOARD
        elif source_type == 'cloudfront':
            return CLOUDFRONT_GRAFANA_DETAILS, CLOUDFRONT_GRAFANA_DASHBOARD
        elif source_type == 'cloudtrail':
            return CLOUDTRAIL_GRAFANA_DETAILS, CLOUDTRAIL_GRAFANA_DASHBOARD
        elif source_type == 'vpcflow':
            return APPLICATION_GRAFANA_DETAILS, None
        else:
            return APPLICATION_GRAFANA_DETAILS, None

    def import_dashboards_into_grafana(self) -> None:
        self._init_grafana_info()
        
        details, dashboard = self.get_grafana_dashboard(source_type=self.parameters.pipeline_info.source.type)
            
        if details:
            details['title'] = f'{self.parameters.pipeline_info.destination.table.name}-details'
            details['uid'] = self.grafana_details_uid
            self.grafana_client.import_details_for_services(table=self.parameters.pipeline_info.destination.table.name, metrics_table=self.parameters.pipeline_info.destination.metrics.name, dashboard=details, athena_connection=self.athena_connection, overwrite=True, folder_title=self.grafana_folder_title)
        
        if dashboard:
            dashboard['title'] = f'{self.parameters.pipeline_info.destination.table.name}-dashboard'
            dashboard['uid'] = self.grafana_dashboard_uid
            self.grafana_client.import_dashboard_for_services(table=self.parameters.pipeline_info.destination.metrics.name, dashboard=dashboard, athena_connection=self.athena_connection, overwrite=True, folder_title=self.grafana_folder_title)

    def delete_dashboards_from_grafana(self) -> None:
        try:
            self._init_grafana_info()
            
            self.grafana_client.dashboard.delete_dashboard(dashboard_uid=self.grafana_details_uid)
            self.grafana_client.dashboard.delete_dashboard(dashboard_uid=self.grafana_dashboard_uid)
        except Exception as e:
            logger.error(e)
    
    def create_glue_table(self) -> None:
        logger.info(f'Start {self.parameters.action.lower()} the table in Glue Data Catalog, database: {self.parameters.pipeline_info.destination.database.name}, table name: {self.parameters.pipeline_info.destination.table.name}.')
        self.glue_client.update_table(database=self.parameters.pipeline_info.destination.database.name, name=self.parameters.pipeline_info.destination.table.name, table_metadata=self.table_metadata_and_statements.parquet, location=self.parameters.pipeline_info.destination.table.location.uri)
        if self.table_metadata_and_statements.metrics:
            logger.info(f'Start {self.parameters.action.lower()} the metrics table in Glue Data Catalog, database: {self.parameters.pipeline_info.destination.database.name}, table name: {self.parameters.pipeline_info.destination.metrics.name}.')
            self.glue_client.update_table(database=self.parameters.pipeline_info.destination.database.name, name=self.parameters.pipeline_info.destination.metrics.name, table_metadata=self.table_metadata_and_statements.metrics, location=self.parameters.pipeline_info.destination.metrics.location.uri)
    
    def delete_glue_table(self) -> None:
        logger.info(f'Start delete the table in Glue Data Catalog, database: {self.parameters.pipeline_info.destination.database.name}, table name: {self.parameters.pipeline_info.destination.table.name}.')
        self.glue_client.delete_table(database=self.parameters.pipeline_info.destination.database.name, name=self.parameters.pipeline_info.destination.table.name)
        if self.table_metadata_and_statements.metrics:
            logger.info(f'Start delete the metrics table in Glue Data Catalog, database: {self.parameters.pipeline_info.destination.database.name}, table name: {self.parameters.pipeline_info.destination.metrics.name}.')
            self.glue_client.delete_table(database=self.parameters.pipeline_info.destination.database.name, name=self.parameters.pipeline_info.destination.metrics.name)
    
    def create_rule(self) -> None:
        logger.info(f'Start {self.parameters.action.lower()} the rule of Amazon EventBridge, rule name: LogProcessor-{self.parameters.pipeline_info.destination.table.name}, schedule: {self.parameters.pipeline_info.scheduler.log_processor.schedule}.')
        self.events_client.create_processor_rule(pipeline_id=self.parameters.pipeline_id, source_type=self.parameters.pipeline_info.source.type, 
                                                table_name=self.parameters.pipeline_info.destination.table.name, staging_location=self.parameters.pipeline_info.staging.uri, 
                                                archive_location=self.parameters.pipeline_info.staging.archive_uri, statements=self.table_metadata_and_statements.statements,
                                                service=self.parameters.pipeline_info.notification.service, recipients=self.parameters.pipeline_info.notification.recipients, 
                                                sfn_arn=self.parameters.pipeline_info.scheduler.log_processor.arn, enrichment_plugins=self.parameters.pipeline_info.destination.enrichment_plugins,
                                                role_arn=self.parameters.pipeline_info.scheduler.log_processor.execution_role, name=f'LogProcessor-{self.parameters.pipeline_info.destination.table.name}', 
                                                schedule=self.parameters.pipeline_info.scheduler.log_processor.schedule, event_bus_name='default')
        
        logger.info(f'Start {self.parameters.action.lower()} the rule of Amazon EventBridge, rule name: LogMerger-{self.parameters.pipeline_info.destination.table.name}, schedule: {self.parameters.pipeline_info.scheduler.log_merger.schedule}.')
        self.events_client.create_merger_rule(pipeline_id=self.parameters.pipeline_id, source_type=self.parameters.pipeline_info.source.type, schedule_type='LogMerger', 
                                            table_name=self.parameters.pipeline_info.destination.table.name, table_location=self.parameters.pipeline_info.destination.table.location.uri, 
                                            archive_location=self.parameters.pipeline_info.destination.table.location.archive_uri, partition_info=self.table_metadata_and_statements.parquet.partition_info,
                                            age=self.parameters.pipeline_info.scheduler.log_merger.age, database=self.parameters.pipeline_info.destination.database.name,
                                            service=self.parameters.pipeline_info.notification.service, recipients=self.parameters.pipeline_info.notification.recipients,
                                            sfn_arn=self.parameters.pipeline_info.scheduler.log_merger.arn, role_arn=self.parameters.pipeline_info.scheduler.log_merger.execution_role, name=f'LogMerger-{self.parameters.pipeline_info.destination.table.name}',
                                            schedule=self.parameters.pipeline_info.scheduler.log_merger.schedule, event_bus_name='default')
        
        logger.info(f'Start {self.parameters.action.lower()} the rule of Amazon EventBridge, rule name: LogArchive-{self.parameters.pipeline_info.destination.table.name}, schedule: {self.parameters.pipeline_info.scheduler.log_archive.schedule}.')
        self.events_client.create_archive_rule(pipeline_id=self.parameters.pipeline_id, source_type=self.parameters.pipeline_info.source.type, schedule_type='LogArchive',
                                            table_name=self.parameters.pipeline_info.destination.table.name, table_location=self.parameters.pipeline_info.destination.table.location.uri,
                                            archive_location=self.parameters.pipeline_info.destination.table.location.archive_uri, 
                                            age=self.parameters.pipeline_info.scheduler.log_archive.age, database=self.parameters.pipeline_info.destination.database.name, 
                                            service=self.parameters.pipeline_info.notification.service, recipients=self.parameters.pipeline_info.notification.recipients,
                                            sfn_arn=self.parameters.pipeline_info.scheduler.log_archive.arn, role_arn=self.parameters.pipeline_info.scheduler.log_archive.execution_role, name=f'LogArchive-{self.parameters.pipeline_info.destination.table.name}', 
                                            schedule=self.parameters.pipeline_info.scheduler.log_archive.schedule, event_bus_name='default')
        
        if self.table_metadata_and_statements.metrics:
            logger.info(f'Start {self.parameters.action.lower()} the rule of Amazon EventBridge, rule name: LogMergerForMetrics-{self.parameters.pipeline_info.destination.table.name}, schedule: {self.parameters.pipeline_info.scheduler.log_merger.schedule}.')
            self.events_client.create_merger_rule(pipeline_id=self.parameters.pipeline_id, source_type=self.parameters.pipeline_info.source.type, schedule_type='LogMergerForMetrics',
                                                table_name=self.parameters.pipeline_info.destination.metrics.name, table_location=self.parameters.pipeline_info.destination.metrics.location.uri, 
                                                archive_location=self.parameters.pipeline_info.destination.metrics.location.archive_uri, partition_info=self.table_metadata_and_statements.metrics.partition_info,
                                                age=self.parameters.pipeline_info.scheduler.log_merger.age, database=self.parameters.pipeline_info.destination.database.name, 
                                                service=self.parameters.pipeline_info.notification.service, recipients=self.parameters.pipeline_info.notification.recipients,
                                                sfn_arn=self.parameters.pipeline_info.scheduler.log_merger.arn, role_arn=self.parameters.pipeline_info.scheduler.log_merger.execution_role, name=f'LogMergerForMetrics-{self.parameters.pipeline_info.destination.table.name}',
                                                schedule=self.parameters.pipeline_info.scheduler.log_merger.schedule, event_bus_name='default')
            logger.info(f'Start {self.parameters.action.lower()} the rule of Amazon EventBridge, rule name: LogArchiveForMetrics-{self.parameters.pipeline_info.destination.table.name}, schedule: {self.parameters.pipeline_info.scheduler.log_archive.schedule}.')
            self.events_client.create_archive_rule(pipeline_id=self.parameters.pipeline_id, source_type=self.parameters.pipeline_info.source.type, schedule_type='LogArchiveForMetrics',
                                                table_name=self.parameters.pipeline_info.destination.metrics.name, table_location=self.parameters.pipeline_info.destination.metrics.location.uri,
                                                archive_location=self.parameters.pipeline_info.destination.metrics.location.archive_uri, 
                                                age=self.parameters.pipeline_info.scheduler.log_archive.age, database=self.parameters.pipeline_info.destination.database.name, 
                                                service=self.parameters.pipeline_info.notification.service, recipients=self.parameters.pipeline_info.notification.recipients,
                                                sfn_arn=self.parameters.pipeline_info.scheduler.log_archive.arn, role_arn=self.parameters.pipeline_info.scheduler.log_archive.execution_role, name=f'LogArchiveForMetrics-{self.parameters.pipeline_info.destination.table.name}', 
                                                schedule=self.parameters.pipeline_info.scheduler.log_archive.schedule, event_bus_name='default')
            
    def delete_rule(self) -> None:
        for name in ('LogProcessor', 'LogMerger', 'LogMergerForMetrics', 'LogArchive', 'LogArchiveForMetrics', ):
            rule_name = f'{name}-{self.parameters.pipeline_info.destination.table.name}'
            logger.info(f'Start delete rule of Amazon EventBridge, the rule name: {rule_name}.')
            self.events_client.delete_rule(name=rule_name, event_bus_name='default', force=True)
    
    def create_scheduler(self) -> None:
        logger.info(f'Start {self.parameters.action.lower()} the scheduler group of Amazon EventBridge, scheduler group name: {self.parameters.pipeline_id}.')
        self.scheduler_client.create_schedule_group(name=self.parameters.pipeline_id, tags=self.parameters.tags)
        
        logger.info(f'Start {self.parameters.action.lower()} the scheduler of Amazon EventBridge, scheduler group name: {self.parameters.pipeline_id}, scheduler name: LogProcessor, schedule: {self.parameters.pipeline_info.scheduler.log_processor.schedule}.')
        self.scheduler_client.create_processor_schedule(pipeline_id=self.parameters.pipeline_id, source_type=self.parameters.pipeline_info.source.type, 
                                                staging_location=self.parameters.pipeline_info.staging.uri, table_name=self.parameters.pipeline_info.destination.table.name,
                                                archive_location=self.parameters.pipeline_info.staging.archive_uri, statements=self.table_metadata_and_statements.statements,
                                                service=self.parameters.pipeline_info.notification.service, recipients=self.parameters.pipeline_info.notification.recipients,
                                                sfn_arn=self.parameters.pipeline_info.scheduler.log_processor.arn, enrichment_plugins=self.parameters.pipeline_info.destination.enrichment_plugins,
                                                role_arn=self.parameters.pipeline_info.scheduler.log_processor.execution_role, group_name=self.parameters.pipeline_id, name='LogProcessor', 
                                                schedule=self.parameters.pipeline_info.scheduler.log_processor.schedule)
        
        logger.info(f'Start {self.parameters.action.lower()} the scheduler of Amazon EventBridge, scheduler group name: {self.parameters.pipeline_id}, scheduler name: LogMerger, schedule: {self.parameters.pipeline_info.scheduler.log_merger.schedule}.')
        self.scheduler_client.create_merger_schedule(pipeline_id=self.parameters.pipeline_id, source_type=self.parameters.pipeline_info.source.type, schedule_type='LogMerger',
                                            table_name=self.parameters.pipeline_info.destination.table.name, table_location=self.parameters.pipeline_info.destination.table.location.uri, 
                                            archive_location=self.parameters.pipeline_info.destination.table.location.archive_uri, partition_info=self.table_metadata_and_statements.parquet.partition_info,
                                            age=self.parameters.pipeline_info.scheduler.log_merger.age, database=self.parameters.pipeline_info.destination.database.name,
                                            service=self.parameters.pipeline_info.notification.service, recipients=self.parameters.pipeline_info.notification.recipients,
                                            sfn_arn=self.parameters.pipeline_info.scheduler.log_merger.arn, role_arn=self.parameters.pipeline_info.scheduler.log_merger.execution_role, name='LogMerger', 
                                            schedule=self.parameters.pipeline_info.scheduler.log_merger.schedule, group_name=self.parameters.pipeline_id)
        
        if self.table_metadata_and_statements.metrics:
            logger.info(f'Start {self.parameters.action.lower()} the scheduler of Amazon EventBridge, scheduler group name: {self.parameters.pipeline_id}, scheduler name: LogMergerForMetrics, schedule: {self.parameters.pipeline_info.scheduler.log_merger.schedule}.')
            self.scheduler_client.create_merger_schedule(pipeline_id=self.parameters.pipeline_id, source_type=self.parameters.pipeline_info.source.type, schedule_type='LogMergerForMetrics',
                                                table_name=self.parameters.pipeline_info.destination.metrics.name, table_location=self.parameters.pipeline_info.destination.metrics.location.uri, 
                                                archive_location=self.parameters.pipeline_info.destination.metrics.location.archive_uri, partition_info=self.table_metadata_and_statements.metrics.partition_info,
                                                age=self.parameters.pipeline_info.scheduler.log_merger.age, database=self.parameters.pipeline_info.destination.database.name, 
                                                service=self.parameters.pipeline_info.notification.service, recipients=self.parameters.pipeline_info.notification.recipients,
                                                sfn_arn=self.parameters.pipeline_info.scheduler.log_merger.arn, role_arn=self.parameters.pipeline_info.scheduler.log_merger.execution_role, name='LogMergerForMetrics',
                                                schedule=self.parameters.pipeline_info.scheduler.log_merger.schedule, group_name=self.parameters.pipeline_id)
        
        logger.info(f'Start {self.parameters.action.lower()} the scheduler of Amazon EventBridge, scheduler group name: {self.parameters.pipeline_id}, scheduler name: LogArchive, schedule: {self.parameters.pipeline_info.scheduler.log_archive.schedule}.')
        self.scheduler_client.create_archive_schedule(pipeline_id=self.parameters.pipeline_id, source_type=self.parameters.pipeline_info.source.type, schedule_type='LogArchive',
                                            table_name=self.parameters.pipeline_info.destination.table.name, table_location=self.parameters.pipeline_info.destination.table.location.uri,
                                            archive_location=self.parameters.pipeline_info.destination.table.location.archive_uri, 
                                            age=self.parameters.pipeline_info.scheduler.log_archive.age, database=self.parameters.pipeline_info.destination.database.name, 
                                            service=self.parameters.pipeline_info.notification.service, recipients=self.parameters.pipeline_info.notification.recipients,
                                            sfn_arn=self.parameters.pipeline_info.scheduler.log_archive.arn, role_arn=self.parameters.pipeline_info.scheduler.log_archive.execution_role, name='LogArchive', 
                                            schedule=self.parameters.pipeline_info.scheduler.log_archive.schedule, group_name=self.parameters.pipeline_id)
        
        if self.table_metadata_and_statements.metrics:
            logger.info(f'Start {self.parameters.action.lower()} the scheduler of Amazon EventBridge, scheduler group name: {self.parameters.pipeline_id}, scheduler name: LogMergerForMetrics, schedule: {self.parameters.pipeline_info.scheduler.log_merger.schedule}.')
            self.scheduler_client.create_merger_schedule(pipeline_id=self.parameters.pipeline_id, source_type=self.parameters.pipeline_info.source.type, schedule_type='LogMergerForMetrics',
                                                table_name=self.parameters.pipeline_info.destination.metrics.name, table_location=self.parameters.pipeline_info.destination.metrics.location.uri, 
                                                archive_location=self.parameters.pipeline_info.destination.metrics.location.archive_uri, partition_info=self.table_metadata_and_statements.metrics.partition_info,
                                                age=self.parameters.pipeline_info.scheduler.log_merger.age, database=self.parameters.pipeline_info.destination.database.name, 
                                                service=self.parameters.pipeline_info.notification.service, recipients=self.parameters.pipeline_info.notification.recipients,
                                                sfn_arn=self.parameters.pipeline_info.scheduler.log_merger.arn, role_arn=self.parameters.pipeline_info.scheduler.log_merger.execution_role, name='LogMergerForMetrics',
                                                schedule=self.parameters.pipeline_info.scheduler.log_merger.schedule, group_name=self.parameters.pipeline_id)
            logger.info(f'Start {self.parameters.action.lower()} the scheduler of Amazon EventBridge, scheduler group name: {self.parameters.pipeline_id}, scheduler name: LogArchiveForMetrics, schedule: {self.parameters.pipeline_info.scheduler.log_archive.schedule}.')
            self.scheduler_client.create_archive_schedule(pipeline_id=self.parameters.pipeline_id, source_type=self.parameters.pipeline_info.source.type, schedule_type='LogArchiveForMetrics',
                                                table_name=self.parameters.pipeline_info.destination.metrics.name, table_location=self.parameters.pipeline_info.destination.metrics.location.uri,
                                                archive_location=self.parameters.pipeline_info.destination.metrics.location.archive_uri, 
                                                age=self.parameters.pipeline_info.scheduler.log_archive.age, database=self.parameters.pipeline_info.destination.database.name, 
                                                service=self.parameters.pipeline_info.notification.service, recipients=self.parameters.pipeline_info.notification.recipients,
                                                sfn_arn=self.parameters.pipeline_info.scheduler.log_archive.arn, role_arn=self.parameters.pipeline_info.scheduler.log_archive.execution_role, name='LogArchiveForMetrics', 
                                                schedule=self.parameters.pipeline_info.scheduler.log_archive.schedule, group_name=self.parameters.pipeline_id)
        
    def delete_scheduler(self) -> None:
        for schedule_name in ('LogProcessor', 'LogMerger', 'LogMergerForMetrics', 'LogArchive', 'LogArchiveForMetrics', ):
            logger.info(f'Start delete scheduler of Amazon EventBridge, scheduler group name: {self.parameters.pipeline_id}, scheduler name: {schedule_name}.')
            self.scheduler_client.delete_schedule(name=schedule_name, group_name=self.parameters.pipeline_id)
        logger.info(f'Start delete scheduler group of Amazon EventBridge, scheduler group name: {self.parameters.pipeline_id}.')
        self.scheduler_client.delete_schedule_group(name=self.parameters.pipeline_id)
        
    def _init_destination_policy_info(self) -> None:
        self.destination_policy_resources = [
                f'{self.parameters.pipeline_info.destination.table.location.arn}/{self.parameters.pipeline_info.destination.table.location.prefix}*'
            ]
        if self.table_metadata_and_statements.metrics:
            self.destination_policy_resources.append(f'{self.parameters.pipeline_info.destination.metrics.location.arn}/{self.parameters.pipeline_info.destination.metrics.location.prefix}*')

        self.s3_public_access_policy_sid = 'S3AccessPolicyForDestination'
        self.s3_public_access_policy_document = self.iam_client.get_policy_document(arn=self.parameters.pipeline_info.role.s3_public_access, sid=self.s3_public_access_policy_sid)
    
    def grant_destination_bucket_access_permission(self) -> None:
        self._init_destination_policy_info()
        
        statement = self.s3_public_access_policy_document['Document']['Statement']
        
        if statement:
            old_statement = copy.deepcopy(statement)
            statement_resources = statement[0]['Resource']
            
            for resource in self.destination_policy_resources:
                if resource not in statement_resources:
                    statement_resources.append(resource)
                    
                bucket_arn = resource.split('/')[0]
                if bucket_arn not in statement_resources:
                    statement_resources.append(bucket_arn)
            logger.info(f'Grant destination bucket access permission, policy arn: {self.parameters.pipeline_info.role.s3_public_access}, sid: {self.s3_public_access_policy_sid}, old document: {old_statement}, new document: {statement[0]}.')
            self.iam_client.update_policy_document(arn=self.parameters.pipeline_info.role.s3_public_access, sid=self.s3_public_access_policy_sid, policy_document=statement[0])
        else:
            statement_resources = []
            
            for resource in self.destination_policy_resources:
                statement_resources.append(resource)
                
                bucket_arn = resource.split('/')[0]
                if bucket_arn not in statement_resources:
                    statement_resources.append(bucket_arn)
            
            policy_document = {'Effect': 'Allow',
                                'Action': [
                                    's3:ListBucket',
                                    's3:ListBucketMultipartUploads',
                                    's3:ListMultipartUploadParts',
                                    's3:GetObject',
                                    's3:GetBucketLocation',
                                    's3:AbortMultipartUpload',
                                    's3:CreateBucket',
                                    's3:PutObject',
                                    's3:DeleteObject',
                                    ],
                                'Resource': statement_resources,
                                }
            logger.info(f'Grant destination bucket access permission, policy arn: {self.parameters.pipeline_info.role.s3_public_access}, sid: {self.s3_public_access_policy_sid}, old document: {{}}, new document: {policy_document}.')
            self.iam_client.update_policy_document(arn=self.parameters.pipeline_info.role.s3_public_access, sid=self.s3_public_access_policy_sid, policy_document=policy_document)
    
    def revoke_destination_bucket_access_permission(self) -> None:
        self._init_destination_policy_info()
        
        statement = self.s3_public_access_policy_document['Document']['Statement']
        
        if statement:
            old_statement = copy.deepcopy(statement)
            statement_resources = statement[0]['Resource']
            
            for resource in self.destination_policy_resources:
                if resource in statement_resources:
                    statement_resources.remove(resource)
                    
                bucket_arn = resource.split('/')[0]
                if bucket_arn in statement_resources and bucket_arn not in [x.split('/')[0] for x in statement_resources if x != bucket_arn]:
                    statement_resources.remove(bucket_arn)

            if statement_resources:
                logger.info(f'Revoke destination bucket access permission, policy arn: {self.parameters.pipeline_info.role.s3_public_access}, sid: {self.s3_public_access_policy_sid}, old document: {old_statement}, new document: {statement[0]}.')
                self.iam_client.update_policy_document(arn=self.parameters.pipeline_info.role.s3_public_access, sid=self.s3_public_access_policy_sid, policy_document=statement[0])
            else:
                logger.info(f'Revoke destination bucket access permission, policy arn: {self.parameters.pipeline_info.role.s3_public_access}, sid: {self.s3_public_access_policy_sid}, old document: {old_statement}, new document: {{}}.')
                self.iam_client.delete_policy_document(arn=self.parameters.pipeline_info.role.s3_public_access, sid=self.s3_public_access_policy_sid)
    
    def grant_sqs_send_message_permission_to_source_bucket(self) -> None:
        for queue_arn in (self.parameters.pipeline_info.queue.log_event_queue, self.parameters.pipeline_info.queue.log_event_dlq, ):
            policy_document = {'Effect': 'Allow',
                                'Principal': {
                                    'Service': 's3.amazonaws.com'
                                    },
                                'Action': [
                                    'sqs:SendMessage'
                                    ],
                                'Resource': queue_arn,
                                'Condition': {
                                    'ArnLike': {
                                        'aws:SourceArn': self.parameters.ingestion_info.source.location.arn
                                        }
                                    }
                                }
            logger.info(f'Grant SQS SendMessage permission to source bucket, queue arn: {queue_arn}, sid: {self.parameters.policy_sid}, document: {policy_document}.')
            self.sqs_client.update_queue_policy(arn=queue_arn, sid=self.parameters.policy_sid, policy_document=policy_document)
    
    def revoke_sqs_send_message_permission(self) -> None:
        for queue_arn in (self.parameters.pipeline_info.queue.log_event_queue, self.parameters.pipeline_info.queue.log_event_dlq, ):
            logger.info(f'Revoke SQS SendMessage permission from source bucket, queue arn: {queue_arn}, sid: {self.parameters.policy_sid}.')
            self.sqs_client.delete_queue_policy(arn=queue_arn, sid=self.parameters.policy_sid)
    
    def _init_send_email_via_sns_policy_info(self) -> None:
        self.send_email_via_sns_policy_arn = self.ddb_client_metadata.get(meta_name='SendTemplateEmailSNSPublicPolicy')['arn']

    def grant_publish_sns_message_permission(self) -> None:
        self._init_send_email_via_sns_policy_info()
        policy_document = {'Effect': 'Allow',
                            'Action': 'SNS:Publish',
                            'Resource': self.parameters.pipeline_info.notification.recipients,
                            }
        logger.info(f'Grant SNS Publish permission, policy arn: {self.send_email_via_sns_policy_arn}, sid: {self.parameters.policy_sid}, policy document: {policy_document}.')
        self.iam_client.update_policy_document(arn=self.send_email_via_sns_policy_arn, sid=self.parameters.policy_sid, policy_document=policy_document)
        
    def revoke_publish_sns_message_permission(self) -> None:
        self._init_send_email_via_sns_policy_info()
        logger.info(f'Revoke SNS Publish permission, policy arn: {self.send_email_via_sns_policy_arn}, sid: {self.parameters.policy_sid}.')
        self.iam_client.delete_policy_document(arn=self.send_email_via_sns_policy_arn, sid=self.parameters.policy_sid)
    
    def grant_source_bucket_access_permission(self) -> None:
        s3_action = [
            's3:GetObject', 
            's3:GetObjectTagging'
            ]
        
        policy_document = {'Effect': 'Allow',
                            'Action': s3_action,
                            'Principal': {
                                'AWS': self.parameters.pipeline_info.role.replicate
                                },
                            'Resource': [f'{self.parameters.ingestion_info.source.location.arn}/{self.parameters.ingestion_info.source.location.prefix}*']
                            }
        logger.info(f'Grant source bucket access permission to update bucket policy, bucket name: {self.parameters.ingestion_info.source.location.bucket}, sid: {self.parameters.policy_sid,}, document: {policy_document}.')
        self.s3_client.update_bucket_policy(bucket=self.parameters.ingestion_info.source.location.bucket, sid=self.parameters.policy_sid, policy_document=policy_document)
        
        policy_document = {
                'Version': '2012-10-17',
                'Statement': [
                    {
                        'Effect': 'Allow',
                        'Action': s3_action,
                        'Resource': [f'{self.parameters.ingestion_info.source.location.arn}/{self.parameters.ingestion_info.source.location.prefix}*']
                        },
                ],
            }
        if self.parameters.ingestion_info.role.sts:
            policy_document['Statement'].append({
                'Effect': 'Allow',
                'Action': 'sts:AssumeRole',
                'Resource': [
                    self.parameters.ingestion_info.role.sts
                    ]
            })
        role_name = self.parameters.pipeline_info.role.replicate.split('/')[-1]
        logger.info(f'Grant source bucket access permission to put role policy, role name: {role_name}, policy name: {self.parameters.policy_sid,}, policy document: {policy_document}.')
        self.iam_client.put_role_policy(role_name=role_name, policy_name=self.parameters.policy_sid, policy_document=policy_document)
    
    def revoke_source_bucket_access_permission(self) -> None:
        logger.info(f'Revoke source bucket access permission to update bucket policy, bucket name: {self.parameters.ingestion_info.source.location.bucket}, sid: {self.parameters.policy_sid,}.')
        self.s3_client.delete_bucket_policy(bucket=self.parameters.ingestion_info.source.location.bucket, sid=self.parameters.policy_sid)
        
        role_name = self.parameters.pipeline_info.role.replicate.split('/')[-1]
        logger.info(f'Revoke source bucket access permission to delete role policy, role name: {role_name}, policy name: {self.parameters.policy_sid,}.')
        self.iam_client.delete_role_policy(role_name=role_name, policy_name=self.parameters.policy_sid)
    
    def put_event_notification_into_source_bucket(self) -> None:
        logger.info(f'Put event notification into source bucket, bucket name: {self.parameters.ingestion_info.source.location.bucket}, prefix: {self.parameters.ingestion_info.source.location.prefix}, queue arn: {self.parameters.pipeline_info.queue.log_event_queue}.')
        self.s3_client.update_bucket_notification(bucket=self.parameters.ingestion_info.source.location.bucket, prefix=self.parameters.ingestion_info.source.location.prefix, 
                                        notification_id=self.parameters.ingestion_id, queue_arn=self.parameters.pipeline_info.queue.log_event_queue)
    
    def delete_event_notification_from_source_bucket(self) -> None:
        logger.info(f'Delete event notification from source bucket, bucket name: {self.parameters.ingestion_info.source.location.bucket}, notification_id: {self.parameters.ingestion_id}.')
        self.s3_client.delete_bucket_notification(bucket=self.parameters.ingestion_info.source.location.bucket, notification_id=self.parameters.ingestion_id)

    def execute_all_ingestion_operations_in_pipeline_in_bulk(self, pipeline_id: str, action: str = 'create'):
        request_type = 'Create' if action == 'create' else 'Delete'
        
        conditions = Attr('pipelineId').eq(pipeline_id)
        for ingestion_info in self.ddb_client_metadata.scan_item(filter=conditions):
            logger.info(f"Start {request_type} the Ingestion: {ingestion_info['metaName']} of Pipeline: {pipeline_id}.")
            ingestion_create_event = {
                "RequestType": request_type,
                "ResourceProperties": {
                    "Resource": "ingestion",
                    "Id": ingestion_info['metaName'],
                    }
                }
            if request_type == 'Create':
                PipelineResourceBuilder(parameters=Parameters(ingestion_create_event)).create_ingestion()
            elif request_type == 'Delete':
                PipelineResourceBuilder(parameters=Parameters(ingestion_create_event)).delete_ingestion() 
            
    def create_pipeline(self) -> None:
        """Create Pipeline-related resources and grant permissions.
            1. Create or Update glue table to storage detail logs.
            2. Create or Update glue table to storage metrics if metrics schema is specified.
            3. Create or Update a schedule group for this pipeline.
            4. Create or Update a schedule in this schedule group for LogProcessor.
            5. Create or Update a schedule in this schedule group for LogMerger.
            6. Create or Update a schedule in this schedule group for LogArchive.
            7. Create or Update a LogMerger schedule for Metrics if metrics schema is specified.
            8. Granting access to the destination bucket.
            9. Import Dashboard to Grafana if grafana.import_dashboards is True.
        
        Args:
            parameters (Parameters): see Parameters._loading_pipeline_info()
        """
        if self.ddb_client_metadata.get(meta_name=self.parameters.pipeline_id) is None:
            raise ValueError(f'Pipeline Id: {self.parameters.pipeline_id} Information is not exist in Meta Table.')
    
        self.create_glue_table()
        if self.parameters.pipeline_info.scheduler.service == 'scheduler':
            self.create_scheduler()
        else:
            self.create_rule()
        
        if self.parameters.pipeline_info.destination.table.location.bucket != self.parameters.pipeline_info.staging.bucket:
            self.grant_destination_bucket_access_permission()
        
        if self.parameters.pipeline_info.notification.service == 'SNS' and re.match(self.sns_arn_regex, self.parameters.pipeline_info.notification.recipients):
            self.grant_publish_sns_message_permission()

        if self.parameters.pipeline_info.grafana.import_dashboards is True:
            self.import_dashboards_into_grafana()
        
        self.execute_all_ingestion_operations_in_pipeline_in_bulk(pipeline_id=self.parameters.pipeline_id, action='create')
    
    def delete_pipeline(self) -> None:
        """Delete Pipeline-related resources and revoke permissions.
            1. Delete glue table used to storage detail logs.
            2. Delete glue table used to storage metrics.
            3. Delete LogProcessor schedule.
            4. Delete LogMerger schedule.
            5. Delete LogArchive schedule.
            6. Delete LogMerger schedule for Metrics.
            7. Delete schedule group.
            8. Revoke access to the destination bucket.
        
        Args:
            parameters (Parameters): see Parameters._loading_pipeline_info()
        """
        
        if self.ddb_client_metadata.get(meta_name=self.parameters.pipeline_id) is None:
            return

        self.execute_all_ingestion_operations_in_pipeline_in_bulk(pipeline_id=self.parameters.pipeline_id, action='delete')
        
        self.delete_glue_table()
        if self.parameters.pipeline_info.scheduler.service == 'scheduler':
            self.delete_scheduler()
        else:
            self.delete_rule()
        
        if self.parameters.pipeline_info.destination.location.bucket != self.parameters.pipeline_info.staging.bucket:
            self.revoke_destination_bucket_access_permission()
        
        if self.parameters.pipeline_info.notification.service == 'SNS' and re.match(self.sns_arn_regex, self.parameters.pipeline_info.notification.recipients):
            self.revoke_publish_sns_message_permission()

        if self.parameters.pipeline_info.grafana.import_dashboards is True:
            self.delete_dashboards_from_grafana()

        self.ddb_client_metadata.delete(meta_name=self.parameters.pipeline_id)

    def create_ingestion(self) -> None:
        """Create ingestion-related resources and grant permissions.
            1. Update SQS Policy to allow S3 to send notifications.
            2. Granting access to the source bucket.
            3. Add S3 notification to send the Create Object event to SQS.
        
        Args:
            parameters (Parameters): see Parameters._loading_ingestion_info()
        """
        if self.ddb_client_metadata.get(meta_name=self.parameters.ingestion_id) is None:
            raise ValueError(f'Ingestion Id: {self.parameters.ingestion_id} Information is not exist in Meta Table.')
        
        if self.ddb_client_metadata.get(meta_name=self.parameters.pipeline_id) is None:
            raise ValueError(f'Pipeline Id: {self.parameters.pipeline_id} Information is not exist in Meta Table.')
        
        self.s3_client = S3Client(sts_role_arn=self.parameters.ingestion_info.role.sts)
        
        if self.parameters.ingestion_info.source.location.bucket != self.parameters.pipeline_info.staging.bucket:
            self.grant_sqs_send_message_permission_to_source_bucket()
            self.grant_source_bucket_access_permission()
            self.put_event_notification_into_source_bucket()
            
        if self.parameters.pipeline_info.source.type == 'alb':
            alb_policy_sid = f'{self.parameters.pipeline_info.source.type}{self.parameters.policy_sid}'
            self.s3_client.put_bucket_policy_for_alb(bucket=self.parameters.ingestion_info.source.location.bucket, prefix=self.parameters.ingestion_info.source.location.prefix, sid=alb_policy_sid)

    def delete_ingestion(self) -> None:
        """Delete ingestion-related resources and revoke permissions.
            1. Update SQS Policy to revoke S3 to send notifications.
            2. Revoke access to the source bucket.
            2. Delete S3 notification.
        
        Args:
            parameters (Parameters): see Parameters._loading_ingestion_info()
        """
        if self.ddb_client_metadata.get(meta_name=self.parameters.ingestion_id) is None:
            return

        if self.ddb_client_metadata.get(meta_name=self.parameters.pipeline_id) is None:
            self.ddb_client_metadata.delete(meta_name=self.parameters.ingestion_id)
            return
        
        self.s3_client = S3Client(sts_role_arn=self.parameters.ingestion_info.role.sts)
        
        if self.parameters.ingestion_info.source.location.bucket != self.parameters.pipeline_info.staging.bucket:
            self.delete_event_notification_from_source_bucket()
            self.revoke_source_bucket_access_permission()
            self.revoke_sqs_send_message_permission()
            
        if self.parameters.pipeline_info.source.type == 'alb':
            alb_policy_sid = f'{self.parameters.pipeline_info.source.type}{self.parameters.policy_sid}'
            self.s3_client.delete_bucket_policy(bucket=self.parameters.ingestion_info.source.location.bucket, sid=alb_policy_sid)

        self.ddb_client_metadata.delete(meta_name=self.parameters.ingestion_id)


def lambda_handler(event, _) -> None:
    logger.info(f'Received request: {json.dumps(event)}')
    if not isinstance(event, dict):
        raise ValueError('The event is not a dict.')
    
    param = Parameters(event)
        
    if param.action in ('Create', 'Update') and param.resource == 'pipeline':
        logger.info(f'Start the Pipeline {param.action.lower()} process.')
        PipelineResourceBuilder(parameters=param).create_pipeline()
    elif param.action in ('Create', 'Update') and param.resource == 'ingestion':
        logger.info(f'Start the Ingestion {param.action.lower()} process.')
        PipelineResourceBuilder(parameters=param).create_ingestion()
    elif param.action == 'Delete' and param.resource == 'pipeline':
        logger.info('Start the Pipeline delete process.')
        PipelineResourceBuilder(parameters=param).delete_pipeline()
    elif param.action == 'Delete' and param.resource == 'ingestion':
        logger.info('Start the Ingestion delete process.')
        PipelineResourceBuilder(parameters=param).delete_ingestion()

