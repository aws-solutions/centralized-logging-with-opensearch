# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import re
import copy
import json
import datetime
from typing import Iterator, Union
from utils import logger, CommonEnum, RDSClient, iso8601_strftime
from source.base import LogFormat, LogParser, AbstractSource


class Engine(CommonEnum):
    AURORA_MYSQL = 'aurora-mysql'
    AURORA_POSTGRESQL = 'aurora-postgresql'
    MYSQL = 'mysql'
    POSTGRESQL = 'postgres'


class DatabaseType(CommonEnum):
    CLUSTER = 'Cluster'
    INSTANCE = 'Instance'
    UNKNOWN = 'Unknown'


class AuroraMysqlAuditLogFormat(metaclass=LogFormat):
    PATTERN = r"^(\d{16}),(\S+),(\S+),(\S+),(\d+),(\d+),(\S+),(\S*),(?:'(.*)'|(.*)),(\d*)$"
    NAME = ("timestamp", "server_host", "username", "host", "connection_id", "query_id", "operation", "database", "object_1", "object_2", "return_code")
    FLAGS = re.MULTILINE
    
    @classmethod
    def _transform(cls, data: dict) -> dict:
        data["timestamp"] = iso8601_strftime(datetime=datetime.datetime.fromtimestamp(int(data["timestamp"]) / 1000000, datetime.UTC), precision=6)
        data["object"] = data["object_1"] or data["object_2"]
        data["log_type"] = "Audit"
        data.pop("server_host")
        data.pop("object_1")
        data.pop("object_2")
        return data
    
class MysqlAuditLogFormat(metaclass=LogFormat):
    PATTERN = r"^(\d{8} \d{2}:\d{2}:\d{2}),(\S+),(\S+),(\S+),(\d+),(\d+),(\S+),(\S*),(?:'(.*)'|(.*)),(\d*),(\S*),.*"
    NAME = ("timestamp", "server_host", "username", "host", "connection_id", "query_id", "operation", "database", "object_1", "object_2", "return_code", "connection_type")
    FLAGS = re.MULTILINE
    
    @classmethod
    def _transform(cls, data: dict) -> dict:
        data["timestamp"] = iso8601_strftime(datetime.datetime.strptime(data["timestamp"], "%Y%m%d %H:%M:%S"), precision=6)
        data["log_type"] = "Audit"
        data["object"] = data["object_1"] or data["object_2"]
        data.pop("server_host")
        data.pop("object_1")
        data.pop("object_2")
        if not data["connection_type"]:
            data.pop("connection_type")
        return data


class MysqlSlowQueryLogFormat(metaclass=LogFormat):
    PATTERN = (
        r"#\s+Time:\s+(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{6}Z)\n"
        r"#\s+User@Host:\s+(\w+)\[\w+\]\s+@\s+\[(.*?)\]\s+Id:\s+(\d*)\n"
        r"#\s+Query_time:\s+([\d.]*)\s+Lock_time:\s+([\d.]*)\s*Rows_sent:\s+([\d]*)\s+Rows_examined:\s+([\d]*)\n"
        r"((use \S+;\n){0,1}SET timestamp=\d+;\n.*?(?=;))"
    )
    NAME = ("timestamp", "username", "host", "query_id", "query_time", "lock_time", "rows_sent", "rows_examined", "object")
    FLAGS = re.DOTALL

    @classmethod
    def _transform(cls, data: dict) -> dict:
        data["log_type"] = "SlowQuery"
        return data


class MysqlErrorLogFormat(metaclass=LogFormat):
    PATTERN = r"(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{6}Z)\s+(\d+)\s+\[(\w+)\]\s+\[(\S+)\]\s+\[(\S+)\]\s+(.*?(?=((\n\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{6}Z\s+\d+\s+\[\w+\]\s+\[\S+\]\s+\[\S+\])|$)))"
    NAME = ("timestamp", "connection_id", "priority", "return_code", "subsystem", "object")
    FLAGS = re.DOTALL
    
    @classmethod
    def _transform(cls, data: dict) -> dict:
        data["log_type"] = "Error"
        return data


class Mysql5ErrorLogFormat(metaclass=LogFormat):
    PATTERN = r"(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{6}Z)\s+(\d+)\s+\[(\w+)\]\s+(.*?(?=((\n\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{6}Z\s+\d+\s+\[\w+\])|$)))"
    NAME = ("timestamp", "connection_id", "priority", "object")
    FLAGS = re.DOTALL
    
    @classmethod
    def _transform(cls, data: dict) -> dict:
        data["log_type"] = "Error"
        data["return_code"] = ""
        data["subsystem"] = "-"
        return data
    

class MysqlGeneralLogFormat(metaclass=LogFormat):
    PATTERN = r"(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{6}Z)\s+(\d+)\s+(\w+)\s+(.*?(?=((\n\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{6}Z\s+\d+\s+\w+)|$)))"
    NAME = ("timestamp", "connection_id", "operation", "object")
    FLAGS = re.DOTALL
    
    @classmethod
    def _transform(cls, data: dict) -> dict:
        data["log_type"] = "General"
        return data


class PostgresQueryLogFormat(metaclass=LogFormat):
    PATTERN = r"(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}(?:\.\d{3})? \w{3})\s*(?::(\S*?)\({0,1}(\d*)\){0,1}:(\w*)@(\w*):)?\s*\[(\d+)\][:| ](\w+):\s*(.*?(?=(?:(?:\n\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}(?:\.\d{3})? \w{3}\s*(?::\S*?\({0,1}(\d*)\){0,1}:\w*@\w*:)?\s*\[\d+\][:| ]\w+)|$)))"
    NAME = ("timestamp", "host", "port", "username", "database", "connection_id", "operation", "object")
    FLAGS = re.DOTALL
    
    @classmethod
    def _transform(cls, data: dict) -> dict:
        if len(data["timestamp"]) == 23:
            data["timestamp"] = iso8601_strftime(datetime.datetime.strptime(data["timestamp"], "%Y-%m-%d %H:%M:%S %Z"), precision=6)
        elif len(data["timestamp"]) == 27:
            data["timestamp"] = iso8601_strftime(datetime.datetime.strptime(data["timestamp"], "%Y-%m-%d %H:%M:%S.%f %Z"), precision=6)
        else:
            data["timestamp"] = iso8601_strftime(precision=6)
        data["log_type"] = "Query"
        return data


class RDSSource(AbstractSource):
    
    def __init__(self, context: dict) -> None:
        self.rds_client = RDSClient(sts_role_arn=context.get('role', ''))
        self.current_epoch_time_in_ms = int(datetime.datetime.now().timestamp() * 1000)
        self.db_identifiers: set = set(context.get('DBIdentifiers', list()))
        self.last_written: int = int(context.get('LastWritten', (datetime.datetime.now().timestamp() - 300) * 1000))
        self.filename_contains_set: set = set(context.get('FilenameContains', list()))
        self.log_file_marker: dict = context.get('LogFileMarker', dict())
        self.log_file_marker_expire_days = context.get('LogFileMarkerExpireDays', 3)
    
    def _check_database_type(self, db_identifier: str) -> DatabaseType:
        if self.rds_client.describe_db_cluster(db_cluster_identifier=db_identifier):
            return DatabaseType.CLUSTER
        elif self.rds_client.describe_db_instance(db_instance_identifier=db_identifier):
            return DatabaseType.INSTANCE
        return DatabaseType.UNKNOWN

    def _get_log_parser(self, log_file_name: str, engine: Engine, engine_version: str) -> Union[LogParser, None]:
        if engine in (Engine.POSTGRESQL, Engine.AURORA_POSTGRESQL) and log_file_name.startswith('error'):
            return LogParser(log_format=PostgresQueryLogFormat)
        elif engine in (Engine.MYSQL, Engine.AURORA_MYSQL):
            if log_file_name.startswith('audit') and engine == Engine.AURORA_MYSQL:
                return LogParser(log_format=AuroraMysqlAuditLogFormat)
            elif log_file_name.startswith('audit') and engine == Engine.MYSQL:
                return LogParser(log_format=MysqlAuditLogFormat)
            elif log_file_name.startswith('slowquery'):
                return LogParser(log_format=MysqlSlowQueryLogFormat)
            elif log_file_name.startswith('error') and engine_version[0] == '5':
                return LogParser(log_format=Mysql5ErrorLogFormat)
            elif log_file_name.startswith('error'):
                return LogParser(log_format=MysqlErrorLogFormat)
            elif log_file_name.startswith('general'):
                return LogParser(log_format=MysqlGeneralLogFormat)
        else:
            return None
    
    def _get_db_cluster_logs(self, db_cluster_identifier: str) -> Iterator[dict]:
        db_clusters_info = self.rds_client.describe_db_cluster(db_cluster_identifier=db_cluster_identifier)
        for db_instances in db_clusters_info['DBClusterMembers']:
            db_instance_identifier = db_instances['DBInstanceIdentifier']
            for log_entry in self._get_db_instance_logs(db_instance_identifier=db_instance_identifier):
                log_entry['db_cluster_identifier'] = db_cluster_identifier
                yield log_entry

    def _get_db_instance_logs(self, db_instance_identifier: str) -> Iterator[dict]:
        db_instance_info = self.rds_client.describe_db_instance(db_instance_identifier=db_instance_identifier)
        engine = db_instance_info.get('Engine', '')
        engine_version = db_instance_info.get('EngineVersion', '')
        endpoint_address = db_instance_info.get('Endpoint', {}).get('Address', '')
        endpoint_port = db_instance_info.get('Endpoint', {}).get('Port', '')
        
        db_instance_log_files = self.rds_client.describe_db_instance_log_files(db_instance_identifier=db_instance_identifier, filename_contains_set=self.filename_contains_set, file_last_written=self.last_written)
        for log_file_name in db_instance_log_files.keys():
            parser = self._get_log_parser(log_file_name=log_file_name, engine=engine, engine_version=engine_version)
            if not parser:
                logger.warning(f'No matching LogParser, DBInstanceIdentifier: {db_instance_identifier}, engine: {engine}, log file name: {log_file_name}.')
                continue
            
            marker = self.log_file_marker.get(db_instance_identifier, {}).get(log_file_name, {}).get('Marker')
            log_file = self.rds_client.download_db_log_file_portion(db_instance_identifier=db_instance_identifier, log_file_name=log_file_name, marker=marker)
            for log_entry in parser.parse(string=log_file['LogFileData']):
                log_entry['db_cluster_identifier'] = ''
                log_entry['db_instance_identifier'] = db_instance_identifier
                log_entry['engine'] = engine
                log_entry['engine_version'] = engine_version
                log_entry['endpoint_address'] = endpoint_address
                log_entry['endpoint_port'] = endpoint_port
                yield log_entry
            self.log_file_marker.setdefault(db_instance_identifier, {})
            self.log_file_marker[db_instance_identifier][log_file_name] = db_instance_log_files[log_file_name]
            self.log_file_marker[db_instance_identifier][log_file_name]['Marker'] = log_file['Marker']
    
    def _clean_expired_marker(self) -> None:
        tmp_log_file_marker = copy.deepcopy(self.log_file_marker)
        for db_instance_identifier in self.log_file_marker.keys():
            for log_file_name in self.log_file_marker[db_instance_identifier].keys():
                if self.log_file_marker[db_instance_identifier][log_file_name]['LastWritten'] < (self.current_epoch_time_in_ms - self.log_file_marker_expire_days * 24 * 60 * 60 * 1000):
                    tmp_log_file_marker[db_instance_identifier].pop(log_file_name)
            
            if not tmp_log_file_marker[db_instance_identifier]:
                tmp_log_file_marker.pop(db_instance_identifier)
        self.log_file_marker = tmp_log_file_marker
    
    def process(self) -> Iterator[str]:
        for db_identifier in self.db_identifiers:
            database_type = self._check_database_type(db_identifier=db_identifier)
            logger.info(f'The DB Identifier: {db_identifier} is {database_type}.')

            logs = []
            if database_type == DatabaseType.CLUSTER:
                logs = self._get_db_cluster_logs(db_cluster_identifier=db_identifier)
            elif database_type == DatabaseType.INSTANCE:
                logs = self._get_db_instance_logs(db_instance_identifier=db_identifier)
            
            for log_entry in logs:
                yield f'{json.dumps(log_entry)}\n'
        
        self._clean_expired_marker()
    
    @property
    def context(self):
        return dict(DBIdentifiers=list(self.db_identifiers), LastWritten=self.current_epoch_time_in_ms, LogFileMarker=self.log_file_marker, LogFileMarkerExpireDays=self.log_file_marker_expire_days)

