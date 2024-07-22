# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import re
import os
import sys
import uuid
import pytest
import datetime
from test.mock import mock_sqs_context, mock_iam_context, mock_ddb_context, mock_rds_context, default_environment_variables


sys.path.append(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'connector'))


def test_engine():
    from connector.source.rds import Engine

    assert Engine.AURORA_MYSQL == 'aurora-mysql'
    assert Engine.AURORA_POSTGRESQL == 'aurora-postgresql'
    assert Engine.MYSQL == 'mysql'
    assert Engine.POSTGRESQL == 'postgres'


def test_database_type():
    from connector.source.rds import DatabaseType

    assert DatabaseType.CLUSTER == 'Cluster'
    assert DatabaseType.INSTANCE == 'Instance'
    assert DatabaseType.UNKNOWN == 'Unknown'


def test_parse_aurora_mysql_audit_log(mock_rds_context):
    from connector.source.rds import LogParser, AuroraMysqlAuditLogFormat

    mysql_audit_logs = os.environ['AURORA_MYSQL_AUDIT_LOGS']

    mysql_audit_parser = LogParser(log_format=AuroraMysqlAuditLogFormat)
    results = mysql_audit_parser.parse(string=mysql_audit_logs)
    assert next(results) == {'timestamp': '2023-12-29T02:43:30.074458Z', 'username': 'rdsadmin', 'host': 'localhost', 'connection_id': '223153',
                             'query_id': '20070830', 'operation': 'QUERY', 'database': '', 'object': "SELECT @@aurora_version", 'return_code': '0', 'log_type': 'Audit'}
    assert next(results) == {'timestamp': '2023-12-29T02:43:30.075253Z', 'username': 'rdsadmin', 'host': 'localhost', 'connection_id': '217705',
                             'query_id': '20070831', 'operation': 'QUERY', 'database': 'mysql', 'object': "select @@session.transaction_read_only", 'return_code': '0', 'log_type': 'Audit'}
    assert next(results) == {'timestamp': '2023-12-29T02:43:30.076091Z', 'username': 'rdsadmin', 'host': 'localhost', 'connection_id': '223170',
                             'query_id': '0', 'operation': 'CONNECT', 'database': '', 'object': '', 'return_code': '0', 'log_type': 'Audit'}
    assert next(results) == {'timestamp': '2023-12-29T02:43:30.076149Z', 'username': 'rdsadmin', 'host': 'localhost', 'connection_id': '217705',
                             'query_id': '20070832', 'operation': 'QUERY', 'database': 'mysql', 'object': "COMMIT", 'return_code': '0', 'log_type': 'Audit'}
    assert next(results) == {'timestamp': '2023-12-29T02:43:30.076500Z', 'username': 'rdsadmin', 'host': 'localhost', 'connection_id': '217705',
                             'query_id': '20070833', 'operation': 'QUERY', 'database': '', 'object': "SET @@sql_log_bin=on", 'return_code': '0', 'log_type': 'Audit'}
    assert next(results) == {'timestamp': '2023-12-29T02:43:30.076799Z', 'username': 'rdsadmin', 'host': 'localhost', 'connection_id': '223170', 'query_id': '20070834', 'operation': 'QUERY',
                             'database': '', 'object': "SET SESSION wait_timeout=28800,SESSION time_zone='+00:00',SESSION sql_mode=0,SESSION autocommit=1", 'return_code': '0', 'log_type': 'Audit'}
    assert next(results) == {'timestamp': '2023-12-29T02:43:30.077132Z', 'username': 'rdsadmin', 'host': 'localhost', 'connection_id': '223170', 'query_id': '20070835', 'operation': 'QUERY', 'database': '', 'object': "/* mysql-connector-java-5.1.48 ( Revision: 29734982609c32d3ab7e5cac2e6acee69ff6b4aa ) */SELECT  @@session.auto_increment_increment AS auto_increment_increment, @@character_set_client AS character_set_client, @@character_set_connection AS character_set_connection, @@character_set_results AS character_set_results, @@character_set_server AS character_set_server, @@collation_server AS collation_server, @@collation_connection AS collation_connection, @@init_connect AS init_connect, @@interactive_timeout AS interactive_timeout, @@license AS license, @@lower_case_table_names AS lower_case_table_names, @@max_allowed_packet AS max_allowed_packet, @@net_buffer_length AS net_buffer_length, @@net_write_timeout AS net_write_timeout, @@performance_schema AS performance_schema, @@sql_mode AS sql_mode, @@system_time_zone AS system_time_zone, @@time_zone AS time_zone, @@transaction_isolation AS transaction_isolation, @@wait_timeout AS wait_timeout", 'return_code': '0', 'log_type': 'Audit'}
    assert next(results) == {'timestamp': '2023-12-29T02:43:32.006334Z', 'username': 'rdsadmin', 'host': 'localhost', 'connection_id': '217704', 'query_id': '20070843',
                             'operation': 'QUERY', 'database': '', 'object': "set local oscar_local_only_replica_host_status=1", 'return_code': '0', 'log_type': 'Audit'}
    assert next(results) == {'timestamp': '2023-12-29T02:43:32.018585Z', 'username': 'rdsadmin', 'host': 'localhost', 'connection_id': '217704', 'query_id': '20070847', 'operation': 'QUERY',
                             'database': '', 'object': "SELECT durable_lsn, current_read_point, server_id, last_update_timestamp FROM information_schema.replica_host_status", 'return_code': '0', 'log_type': 'Audit'}
    assert next(results) == {'timestamp': '2023-12-29T02:43:32.025947Z', 'username': 'rdsadmin', 'host': 'localhost', 'connection_id': '217705',
                             'query_id': '20070852', 'operation': 'QUERY', 'database': 'mysql', 'object': "select @@session.transaction_read_only", 'return_code': '0', 'log_type': 'Audit'}
    assert next(results) == {'timestamp': '2023-12-29T02:43:32.026505Z', 'username': 'rdsadmin', 'host': 'localhost', 'connection_id': '217705',
                             'query_id': '20070854', 'operation': 'QUERY', 'database': '', 'object': "SET @@sql_log_bin=on", 'return_code': '0', 'log_type': 'Audit'}
    with pytest.raises(StopIteration):
        next(results)


def test_parse_mysql_audit_log(mock_rds_context):
    from connector.source.rds import LogParser, MysqlAuditLogFormat

    mysql_audit_logs = os.environ['MYSQL_AUDIT_LOGS']

    mysql_audit_parser = LogParser(log_format=MysqlAuditLogFormat)
    results = mysql_audit_parser.parse(string=mysql_audit_logs)
    assert next(results) == {'timestamp': '2024-03-23T13:36:07.000000Z', 'username': 'rdsadmin', 'host': 'localhost', 'connection_id': '4',
                             'query_id': '149867', 'operation': 'QUERY', 'database': '', 'return_code': '0', 'log_type': 'Audit', 'object': 'SELECT @@session.transaction_read_only'}
    assert next(results) == {'timestamp': '2024-03-23T13:36:08.000000Z', 'username': 'rdsadmin', 'host': 'localhost', 'connection_id': '4', 'query_id': '149868', 'operation': 'QUERY',
                             'database': '', 'return_code': '0', 'log_type': 'Audit', 'object': 'INSERT INTO mysql.rds_heartbeat2(id, value) values (1,1711200968676) ON DUPLICATE KEY UPDATE value = 1711200968676'}
    assert next(results) == {'timestamp': '2024-03-23T13:36:09.000000Z', 'username': 'rdsadmin', 'host': 'localhost', 'connection_id': '4',
                             'query_id': '149869', 'operation': 'QUERY', 'database': '', 'return_code': '0', 'log_type': 'Audit', 'object': 'SELECT 1'}
    assert next(results) == {'timestamp': '2024-03-23T13:36:10.000000Z', 'username': 'rdsadmin', 'host': 'localhost', 'connection_id': '4',
                             'query_id': '149870', 'operation': 'QUERY', 'database': '', 'return_code': '0', 'log_type': 'Audit', 'object': 'SELECT @@session.transaction_read_only'}
    assert next(results) == {'timestamp': '2024-03-23T13:36:11.000000Z', 'username': 'rdsadmin', 'host': 'localhost', 'connection_id': '4',
                             'query_id': '149871', 'operation': 'QUERY', 'database': '', 'return_code': '0', 'log_type': 'Audit', 'object': 'COMMIT'}
    assert next(results) == {'timestamp': '2024-03-23T13:36:12.000000Z', 'username': 'rdsadmin', 'host': 'localhost', 'connection_id': '4',
                             'query_id': '149872', 'operation': 'QUERY', 'database': '', 'return_code': '0', 'log_type': 'Audit', 'object': 'SELECT 1'}
    assert next(results) == {'timestamp': '2024-03-23T13:36:13.000000Z', 'username': 'rdsadmin', 'host': 'localhost', 'connection_id': '4',
                             'query_id': '149873', 'operation': 'QUERY', 'database': '', 'return_code': '0', 'log_type': 'Audit', 'object': 'SELECT @@GLOBAL.read_only'}
    with pytest.raises(StopIteration):
        next(results)


def test_parse_mysql_slow_query_log(mock_rds_context):
    from connector.source.rds import LogParser, MysqlSlowQueryLogFormat

    mysql_slow_query_logs = os.environ['MYSQL_SLOW_QUERY_LOGS']

    mysql_slow_query_parser = LogParser(log_format=MysqlSlowQueryLogFormat)
    results = mysql_slow_query_parser.parse(string=mysql_slow_query_logs)
    assert next(results) == {'timestamp': '2023-11-30T07:22:10.190471Z', 'username': 'admin', 'host': '127.0.0.1', 'query_id': '7432', 'query_time': '2.000192',
                             'lock_time': '0.000000', 'rows_sent': '1', 'rows_examined': '1', 'object': 'use audit;\nSET timestamp=1701328928;\nselect sleep(2)', 'log_type': 'SlowQuery'}
    assert next(results) == {'timestamp': '2024-01-03T01:35:35.952622Z', 'username': 'admin', 'host': '127.0.0.1', 'query_id': '260259', 'query_time': '2.000294',
                             'lock_time': '0.000000', 'rows_sent': '1', 'rows_examined': '1', 'object': 'SET timestamp=1704245733;\nselect\nsleep(2)', 'log_type': 'SlowQuery'}
    assert next(results) == {'timestamp': '2024-01-03T07:15:38.660108Z', 'username': 'admin', 'host': '127.0.0.2', 'query_id': '262030', 'query_time': '2.000231',
                             'lock_time': '0.000000', 'rows_sent': '1', 'rows_examined': '1', 'object': 'use audit;\nSET timestamp=1704266136;\nselect sleep(2)', 'log_type': 'SlowQuery'}
    assert next(results) == {'timestamp': '2024-01-03T07:15:42.875605Z', 'username': 'admin', 'host': '127.0.0.1', 'query_id': '262030', 'query_time': '2.000255',
                             'lock_time': '0.000000', 'rows_sent': '1', 'rows_examined': '1', 'object': 'SET timestamp=1704266140;\nselect sleep(2)', 'log_type': 'SlowQuery'}
    assert next(results) == {'timestamp': '2024-01-03T07:17:20.525029Z', 'username': 'admin', 'host': '127.0.0.1', 'query_id': '262030', 'query_time': '2.002099', 'lock_time': '0.000000',
                             'rows_sent': '1', 'rows_examined': '2', 'object': 'SET timestamp=1704266238;\nwith dataset as (\nselect sleep(2) as t)\nselect *\nfrom dataset', 'log_type': 'SlowQuery'}
    assert next(results) == {'timestamp': '2024-01-03T07:20:25.435204Z', 'username': 'admin', 'host': '127.0.0.1', 'query_id': '262030', 'query_time': '2.000233',
                             'lock_time': '0.000000', 'rows_sent': '1', 'rows_examined': '1', 'object': 'SET timestamp=1704266423;\nselect sleep(2)', 'log_type': 'SlowQuery'}
    with pytest.raises(StopIteration):
        next(results)


def test_parse_mysql_error_log(mock_rds_context):
    from connector.source.rds import LogParser, MysqlErrorLogFormat, Mysql5ErrorLogFormat

    mysql_error_logs_8 = os.environ['MYSQL8_ERROR_LOGS']

    mysql_error_parser_8 = LogParser(log_format=MysqlErrorLogFormat)
    results = mysql_error_parser_8.parse(string=mysql_error_logs_8)
    assert next(results) == {'timestamp': '2023-11-28T09:13:22.104678Z', 'connection_id': '0', 'priority': 'System', 'return_code': 'MY-010116',
                             'subsystem': 'Server', 'object': '/rdsdbbin/oscar/bin/mysqld (mysqld 8.0.28) starting as process 259 (mysqld.cc:5965)', 'log_type': 'Error'}
    assert next(results) == {'timestamp': '2023-11-28T09:13:22.112841Z', 'connection_id': '0', 'priority': 'Note', 'return_code': 'MY-010747', 'subsystem': 'Server',
                             'object': "Plugin 'FEDERATED' is disabled. (sql_plugin.cc:3604)\n231128  9:13:22 server_audit: Audit STARTED.\nFound DAS config file, trying to load DAS switcher from DAS config file.\n2023-11-28 09:13:22 22566174378368:[DAS][INFO]: Calculated persistence threads 4\naurora_enable_das:0\n231128  9:13:22 server_audit: server_audit_incl_users set to ''.\n231128  9:13:22 server_audit: server_audit_excl_users set to ''.", 'log_type': 'Error'}
    assert next(results) == {'timestamp': '2023-11-28T09:13:22.114869Z', 'connection_id': '1', 'priority': 'System', 'return_code': 'MY-013576',
                             'subsystem': 'InnoDB', 'object': 'InnoDB initialization has started. (ha_innodb.cc:13611)', 'log_type': 'Error'}
    assert next(results) == {'timestamp': '2023-11-28T09:13:34.131165Z', 'connection_id': '5', 'priority': 'Note', 'return_code': 'MY-013386', 'subsystem': 'Server',
                             'object': "Running queries to upgrade MySQL server. (server.cc:758)\n# Existing AMS 5.7 external services integration privilege columns is converted to role grants for the user\nINSERT INTO mysql.role_edges (from_host, from_user, to_host, to_user) select '%', 'AWS_LOAD_S3_ACCESS', host, user from mysql.user where load_from_s3_priv = 'Y';\n. Ignored error No: 1054, Ignored error: Unknown column 'load_from_s3_priv' in 'where clause'(server.cc:629)", 'log_type': 'Error'}
    assert next(results) == {'timestamp': '2023-11-28T09:13:38.582491Z', 'connection_id': '5', 'priority': 'Note',
                             'return_code': 'MY-013387', 'subsystem': 'Server', 'object': 'Upgrading system table data. (server.cc:784)', 'log_type': 'Error'}
    assert next(results) == {'timestamp': '2023-11-28T09:13:39.861463Z', 'connection_id': '5', 'priority': 'Note',
                             'return_code': 'MY-013385', 'subsystem': 'Server', 'object': 'Upgrading the sys schema. (server.cc:720)', 'log_type': 'Error'}
    with pytest.raises(StopIteration):
        next(results)

    mysql_error_logs_5 = os.environ['MYSQL5_ERROR_LOGS']

    mysql_error_parser_5 = LogParser(log_format=Mysql5ErrorLogFormat)
    results = mysql_error_parser_5.parse(string=mysql_error_logs_5)
    assert next(results) == {'timestamp': '2024-03-27T04:38:18.925623Z', 'connection_id': '0',
                             'priority': 'Note', 'object': '#', 'log_type': 'Error', 'return_code': '', 'subsystem': '-'}
    assert next(results) == {'timestamp': '2024-03-27T04:38:19.085914Z', 'connection_id': '0', 'priority': 'Warning',
                             'object': "The syntax '--secure-auth' is deprecated and will be removed in a future release", 'log_type': 'Error', 'return_code': '', 'subsystem': '-'}
    assert next(results) == {'timestamp': '2024-03-27T04:38:19.086121Z', 'connection_id': '0', 'priority': 'Warning',
                             'object': "'NO_AUTO_CREATE_USER' sql mode was not set.", 'log_type': 'Error', 'return_code': '', 'subsystem': '-'}
    assert next(results) == {'timestamp': '2024-03-27T04:38:19.087012Z', 'connection_id': '0', 'priority': 'Note',
                             'object': '/rdsdbbin/oscar/bin/mysqld (mysqld 5.7.12-log) starting as process 256 ...', 'log_type': 'Error', 'return_code': '', 'subsystem': '-'}
    assert next(results) == {'timestamp': '2024-03-27T04:38:19.094698Z', 'connection_id': '0', 'priority': 'Warning',
                             'object': 'You need to use --log-bin to make --log-slave-updates work.', 'log_type': 'Error', 'return_code': '', 'subsystem': '-'}
    assert next(results) == {'timestamp': '2024-03-27T04:38:19.096007Z', 'connection_id': '0', 'priority': 'Warning',
                             'object': 'InnoDB: Setting innodb_checksums to OFF is DEPRECATED. This option may be removed in future releases. You should set innodb_checksum_algorithm=NONE instead.', 'log_type': 'Error', 'return_code': '', 'subsystem': '-'}
    assert next(results) == {'timestamp': '2024-03-27T04:38:19.096085Z', 'connection_id': '0', 'priority': 'Note',
                             'object': 'InnoDB: PUNCH HOLE support available', 'log_type': 'Error', 'return_code': '', 'subsystem': '-'}
    with pytest.raises(StopIteration):
        next(results)


def test_parse_mysql_general_log(mock_rds_context):
    from connector.source.rds import LogParser, MysqlGeneralLogFormat

    mysql_general_logs = os.environ['MYSQL_GENERAL_LOGS']

    mysql_general_parser = LogParser(log_format=MysqlGeneralLogFormat)
    results = mysql_general_parser.parse(string=mysql_general_logs)
    assert next(results) == {'timestamp': '2024-01-03T08:00:01.341151Z', 'connection_id': '217720',
                             'operation': 'Query', 'object': 'SET @@sql_log_bin=on', 'log_type': 'General'}
    assert next(results) == {'timestamp': '2024-01-03T08:00:01.511636Z', 'connection_id': '217704',
                             'operation': 'Query', 'object': 'set local oscar_local_only_replica_host_status=1;', 'log_type': 'General'}
    assert next(results) == {'timestamp': '2024-01-03T08:00:01.511747Z', 'connection_id': '217704', 'operation': 'Query',
                             'object': 'SELECT durable_lsn, current_read_point, server_id, last_update_timestamp FROM information_schema.replica_host_status;', 'log_type': 'General'}
    assert next(results) == {'timestamp': '2024-01-03T08:12:18.027713Z', 'connection_id': '217705',
                             'operation': 'Query', 'object': 'SET @@sql_log_bin=on', 'log_type': 'General'}
    assert next(results) == {'timestamp': '2024-01-03T08:12:19.125290Z', 'connection_id': '262325', 'operation': 'Query',
                             'object': 'with dataset as (\nselect sleep(2) as t)\nselect * from t', 'log_type': 'General'}
    assert next(results) == {'timestamp': '2024-01-03T08:12:19.340385Z', 'connection_id': '126289',
                             'operation': 'Query', 'object': 'SELECT 1', 'log_type': 'General'}
    assert next(results) == {'timestamp': '2024-01-03T08:12:20.050828Z', 'connection_id': '217704',
                             'operation': 'Query', 'object': 'set local oscar_local_only_replica_host_status=1;', 'log_type': 'General'}
    assert next(results) == {'timestamp': '2024-01-03T08:12:20.050990Z', 'connection_id': '217704', 'operation': 'Query',
                             'object': 'SELECT durable_lsn, current_read_point, server_id, last_update_timestamp FROM information_schema.replica_host_status;', 'log_type': 'General'}
    with pytest.raises(StopIteration):
        next(results)


def test_parse_postgres_query_log(mock_rds_context):
    from connector.source.rds import LogParser, PostgresQueryLogFormat

    postgres_query_logs = os.environ['POSTGRES_QUERY_LOGS']

    postgres_query_parser = LogParser(log_format=PostgresQueryLogFormat)
    results = postgres_query_parser.parse(string=postgres_query_logs)
    assert next(results) == {'timestamp': '2023-11-29T09:23:46.000000Z', 'host': '', 'port': '', 'username': '',
                             'database': '', 'connection_id': '560', 'operation': 'LOG', 'object': 'checkpoint starting: time', 'log_type': 'Query'}
    assert next(results) == {'timestamp': '2023-11-29T09:23:46.000000Z', 'host': '', 'port': '', 'username': '', 'database': '', 'connection_id': '560', 'operation': 'LOG',
                             'object': 'checkpoint complete: wrote 0 buffers (0.0%); 0 WAL file(s) added, 0 removed, 0 recycled; write=0.001 s, sync=0.001 s, total=0.001 s; sync files=0, longest=0.000 s, average=0.000 s; distance=0 kB, estimate=0 kB', 'log_type': 'Query'}
    assert next(results) == {'timestamp': '2023-11-29T09:23:51.000000Z', 'host': '10.0.2.55', 'port': '57562', 'username': 'postgres', 'database': 'postgres', 'connection_id': '29735', 'operation': 'LOG',
                             'object': 'statement: SELECT d.datname as "Name",\n        pg_catalog.pg_get_userbyid(d.datdba) as "Owner",\n        pg_catalog.pg_encoding_to_char(d.encoding) as "Encoding",\n        d.datcollate as "Collate",\n        d.datctype as "Ctype",\n        pg_catalog.array_to_string(d.datacl, E\'\n\') AS "Access privileges"\n    FROM pg_catalog.pg_database d\n    ORDER BY 1;', 'log_type': 'Query'}
    assert next(results) == {'timestamp': '2023-11-29T09:24:05.000000Z', 'host': '10.0.2.55', 'port': '57562', 'username': 'postgres',
                             'database': 'postgres', 'connection_id': '29735', 'operation': 'ERROR', 'object': 'syntax error at or near "/" at character 1', 'log_type': 'Query'}
    assert next(results) == {'timestamp': '2023-11-29T09:24:05.000000Z', 'host': '10.0.2.55', 'port': '57562', 'username': 'postgres', 'database': 'postgres',
                             'connection_id': '29735', 'operation': 'STATEMENT', 'object': '/h\n    LIst\n    list\n    select * from audit.record_history;', 'log_type': 'Query'}
    assert next(results) == {'timestamp': '2023-11-29T09:24:09.000000Z', 'host': '10.0.2.55', 'port': '57562', 'username': 'postgres',
                             'database': 'postgres', 'connection_id': '29735', 'operation': 'LOG', 'object': 'statement: select * from audit.record_history;', 'log_type': 'Query'}
    assert next(results) == {'timestamp': '2023-11-29T09:24:09.000000Z', 'host': '10.0.2.55', 'port': '57562', 'username': 'postgres', 'database': 'postgres',
                             'connection_id': '29735', 'operation': 'ERROR', 'object': 'relation "audit.record_history" does not exist at character 15', 'log_type': 'Query'}
    assert next(results) == {'timestamp': '2023-11-29T09:24:09.000000Z', 'host': '10.0.2.55', 'port': '57562', 'username': 'postgres',
                             'database': 'postgres', 'connection_id': '29735', 'operation': 'STATEMENT', 'object': 'select * from audit.record_history;', 'log_type': 'Query'}
    assert next(results) == {'timestamp': '2023-11-29T09:24:22.000000Z', 'host': '10.0.2.55', 'port': '57562', 'username': 'postgres',
                             'database': 'postgres', 'connection_id': '29735', 'operation': 'LOG', 'object': 'statement: select * from audit.record_history;', 'log_type': 'Query'}
    assert next(results) == {'timestamp': '2024-03-27T01:35:26.270000Z', 'host': None, 'port': None, 'username': None, 'database': None,
                             'connection_id': '394', 'operation': 'LOG', 'object': 'skipping missing configuration file "/rdsdbdata/config/recovery.conf"', 'log_type': 'Query'}
    assert next(results) == {'timestamp': '2024-03-27T01:35:26.271000Z', 'host': None, 'port': None, 'username': None, 'database': None,
                             'connection_id': '394', 'operation': 'LOG', 'object': 'skipping missing configuration file "/rdsdbdata/config/recovery.conf"', 'log_type': 'Query'}
    assert next(results) == {'timestamp': '2024-03-27T01:36:27.000000Z', 'host': '10.0.2.55', 'port': '57562', 'username': 'postgres',
                             'database': 'postgres', 'connection_id': '29735', 'operation': 'LOG', 'object': 'statement: select * from audit.record_history;', 'log_type': 'Query'}
    with pytest.raises(StopIteration):
        next(results)

    postgres_query_log_format = PostgresQueryLogFormat()
    data = postgres_query_log_format._transform(data={'timestamp': '2024-03-27 01:31:26 UTC'})
    assert data == {'log_type': 'Query', 'timestamp': '2024-03-27T01:31:26.000000Z'}

    data = postgres_query_log_format._transform(data={'timestamp': '2024-03-27 01:31:26.123 GMT'})
    assert data == {'log_type': 'Query', 'timestamp': '2024-03-27T01:31:26.123000Z'}

    data = postgres_query_log_format._transform(data={'timestamp': '2024-03-27'})
    assert isinstance(datetime.datetime.fromisoformat(data['timestamp']), datetime.datetime) is True


def mock_rds_api_call(self, operation_name, kwarg):  # NOSONAR
    from test.mock import mock_rds_context, default_environment_variables
    from botocore.exceptions import ClientError

    staging_bucket = os.environ['STAGING_BUCKET_NAME']

    aurora_mysql_cluster_8 = os.environ['AURORA_MYSQL8_CLUSTER_IDENTIFIER']
    aurora_postgresql_cluster = os.environ['AURORA_POSTGRESQL_CLUSTER_IDENTIFIER']
    aurora_mysql_instance_8 = os.environ['AURORA_MYSQL8_INSTANCE_IDENTIFIER']
    mysql_instance_8 = os.environ['MYSQL8_INSTANCE_IDENTIFIER']
    postgresql_instance = os.environ['POSTGRESQL_INSTANCE_IDENTIFIER']

    aurora_mysql_audit_logs = os.environ['AURORA_MYSQL_AUDIT_LOGS']
    mysql_audit_logs = os.environ['MYSQL_AUDIT_LOGS']
    mysql_slow_query_logs = os.environ['MYSQL_SLOW_QUERY_LOGS']
    mysql8_error_logs = os.environ['MYSQL8_ERROR_LOGS']
    mysql_general_logs = os.environ['MYSQL_GENERAL_LOGS']
    postgres_query_logs = os.environ['POSTGRES_QUERY_LOGS']

    if operation_name in ('GetItem'):
        return {}
    elif operation_name in ('PutObject'):
        if kwarg['Bucket'] == 'do-not-exists-bucket':
            raise ClientError(error_response={'Error': {'Code': '400',
                              'Message': 'Error Query String.'}}, operation_name=operation_name)
        elif kwarg['Bucket'] == staging_bucket:
            return {}
    elif operation_name in ('DescribeDBClusters'):
        if kwarg['DBClusterIdentifier'] == aurora_mysql_cluster_8:
            return {
                'DBClusters': [
                    {
                        'DBClusterIdentifier': aurora_mysql_cluster_8,
                        'Status': 'available',
                        'DBClusterMembers': [
                            {
                                'DBInstanceIdentifier': aurora_mysql_instance_8,
                                'IsClusterWriter': True,
                                'DBClusterParameterGroupStatus': 'in-sync',
                                'PromotionTier': 1
                            },
                        ],
                    }
                ]
            }
        elif kwarg['DBClusterIdentifier'] == aurora_postgresql_cluster:
            return {
                'DBClusters': [
                    {
                        'DBClusterIdentifier': aurora_postgresql_cluster,
                        'Status': 'available',
                        'DBClusterMembers': [
                            {
                                'DBInstanceIdentifier': postgresql_instance,
                                'IsClusterWriter': True,
                                'DBClusterParameterGroupStatus': 'in-sync',
                                'PromotionTier': 1
                            },
                        ],
                    }
                ]
            }
        elif kwarg['DBClusterIdentifier'] == 'do-not-exists-cluster':
            raise ClientError(error_response={'Error': {'Code': '400',
                              'Message': 'Error Query String.'}}, operation_name=operation_name)
    elif operation_name in ('DescribeDBInstances'):
        if kwarg['DBInstanceIdentifier'] == mysql_instance_8:
            return {
                'DBInstances': [
                    {
                        'DBInstanceIdentifier': mysql_instance_8,
                        'Engine': 'mysql',
                        'EngineVersion': '8.0.36',
                        'Endpoint': {
                            'Address': f'{mysql_instance_8}.us-east-1.rds.amazonaws.com',
                            'Port': 3306,
                        },
                    }
                ]
            }
        elif kwarg['DBInstanceIdentifier'] == aurora_mysql_instance_8:
            return {
                'DBInstances': [
                    {
                        'DBInstanceIdentifier': aurora_mysql_instance_8,
                        'Engine': 'aurora-mysql',
                        'EngineVersion': '8.0.mysql_aurora.3.06.0',
                        'Endpoint': {
                            'Address': f'{aurora_mysql_instance_8}.us-east-1.rds.amazonaws.com',
                            'Port': 3306,
                        },
                    }
                ]
            }
        elif kwarg['DBInstanceIdentifier'] == postgresql_instance:
            return {
                'DBInstances': [
                    {
                        'DBInstanceIdentifier': postgresql_instance,
                        'Engine': 'postgres',
                        'EngineVersion': '12.12',
                        'Endpoint': {
                            'Address': f'{postgresql_instance}.us-east-1.rds.amazonaws.com',
                            'Port': 5432,
                        },
                    }
                ]
            }
        elif kwarg['DBInstanceIdentifier'] == 'do-not-exists-instance':
            raise ClientError(error_response={'Error': {'Code': '400',
                              'Message': 'Error Query String.'}}, operation_name=operation_name)
    elif operation_name in ('DescribeDBLogFiles'):
        if kwarg['DBInstanceIdentifier'] in (mysql_instance_8, aurora_mysql_instance_8) and kwarg.get('FilenameContains') == 'audit':
            return {
                'Marker': '',
                'DescribeDBLogFiles': [
                    {
                        'LogFileName': 'audit/audit.log',
                        'LastWritten': 1704416941258,
                        'Size': 10817
                    }
                ]
            }
        elif kwarg['DBInstanceIdentifier'] in (mysql_instance_8, aurora_mysql_instance_8):
            return {
                'Marker': '',
                'DescribeDBLogFiles': [
                    {
                        'LogFileName': 'audit/audit.log',
                        'LastWritten': 1704416941258,
                        'Size': 10817
                    },
                    {
                        'LogFileName': 'slowquery/slowquery.log',
                        'LastWritten': 1704416941258,
                        'Size': 10817
                    },
                    {
                        'LogFileName': 'error/mysql-error.log',
                        'LastWritten': 1704416941258,
                        'Size': 10817
                    },
                    {
                        'LogFileName': 'general/mysql-general.log',
                        'LastWritten': 1704416958038,
                        'Size': 468796
                    },
                    {
                        'LogFileName': 'test/no-parser.log',
                        'LastWritten': 1704416958038,
                        'Size': 468796
                    }
                ]
            }
        elif kwarg['DBInstanceIdentifier'] == postgresql_instance:
            return {
                'Marker': '',
                'DescribeDBLogFiles': [
                    {
                        'LogFileName': 'error/postgres-error.log',
                        'LastWritten': 1704416941258,
                        'Size': 10817
                    },
                ]
            }
    elif operation_name in ('DownloadDBLogFilePortion'):
        if kwarg['DBInstanceIdentifier'] == mysql_instance_8 and kwarg['LogFileName'] == 'audit/audit.log':
            return {
                'Marker': '2024-01-01.2:0',
                'LogFileData': mysql_audit_logs,
                'AdditionalDataPending': False
            }
        elif kwarg['DBInstanceIdentifier'] == aurora_mysql_instance_8 and kwarg['LogFileName'] == 'audit/audit.log':
            return {
                'Marker': '2024-01-01.2:0',
                'LogFileData': aurora_mysql_audit_logs,
                'AdditionalDataPending': False
            }
        elif kwarg['DBInstanceIdentifier'] in (mysql_instance_8, aurora_mysql_instance_8) and kwarg['LogFileName'] == 'slowquery/slowquery.log':
            return {
                'Marker': '2024-01-01.2:0',
                'LogFileData': mysql_slow_query_logs,
                'AdditionalDataPending': False
            }
        elif kwarg['DBInstanceIdentifier'] in (mysql_instance_8, aurora_mysql_instance_8) and kwarg['LogFileName'] == 'error/mysql-error.log':
            return {
                'Marker': '2024-01-01.2:0',
                'LogFileData': mysql8_error_logs,
                'AdditionalDataPending': False
            }
        elif kwarg['DBInstanceIdentifier'] in (mysql_instance_8, aurora_mysql_instance_8) and kwarg['LogFileName'] == 'general/mysql-general.log':
            return {
                'Marker': '2024-01-01.2:0',
                'LogFileData': mysql_general_logs,
                'AdditionalDataPending': False
            }
        elif kwarg['DBInstanceIdentifier'] == postgresql_instance and kwarg['LogFileName'] == 'error/postgres-error.log':
            return {
                'Marker': '2024-01-01.2:0',
                'LogFileData': postgres_query_logs,
                'AdditionalDataPending': False
            }


class TestRDSSource:

    def test_init(self):
        from connector.source.rds import RDSSource

        db_identifiers = ['aurora-mysql', 'database-1']
        current_epoch_time_in_ms = int(datetime.datetime.now().timestamp() * 1000)
        log_file_marker = {
            'database-1': {
                'error/mysql-error.log': {
                    'LogFileName': 'error/mysql-error.log',
                    'LastWritten': 1704357600484,
                    'Size': 0,
                    'Marker': '2024-01-04.9:0'
                }
            },
            'aurora-mysql-instance-1': {
                'audit/audit.log.0.2024-01-04-08-30.0': {
                    'LogFileName': 'audit/audit.log.0.2024-01-04-08-30.0',
                    'LastWritten': 1704357690097,
                    'Size': 326043,
                    'Marker': '9:326043'
                },
                'audit/audit.log.1.2024-01-04-08-30.0': {
                    'LogFileName': 'audit/audit.log.1.2024-01-04-08-30.0',
                    'LastWritten': 1704357686041,
                    'Size': 104002,
                    'Marker': '9:105090'
                }
            }
        }
        log_file_marker_expire_days = 5
        context = dict(
            DBIdentifiers=db_identifiers,
            LastWritten=current_epoch_time_in_ms,
            LogFileMarker=log_file_marker,
            LogFileMarkerExpireDays=log_file_marker_expire_days,
        )
        rds_source = RDSSource(context=context)

        assert rds_source.db_identifiers == set(db_identifiers)
        assert rds_source.last_written == current_epoch_time_in_ms
        assert rds_source.log_file_marker == log_file_marker
        assert rds_source.log_file_marker_expire_days == log_file_marker_expire_days

        context = dict()
        rds_source = RDSSource(context=context)

        assert rds_source.db_identifiers == set()
        assert isinstance(rds_source.last_written, int) is True
        assert rds_source.last_written > 0
        assert rds_source.log_file_marker == {}
        assert rds_source.log_file_marker_expire_days == 3

    def test_check_database_type(self, mock_rds_context):
        from connector.source.rds import RDSSource, DatabaseType

        aurora_mysql_cluster_8 = os.environ['AURORA_MYSQL8_CLUSTER_IDENTIFIER']
        aurora_postgresql_cluster = os.environ['AURORA_POSTGRESQL_CLUSTER_IDENTIFIER']
        mysql_instance_8 = os.environ['MYSQL8_INSTANCE_IDENTIFIER']
        postgresql_instance = os.environ['POSTGRESQL_INSTANCE_IDENTIFIER']

        context = dict(
            DBIdentifiers=[aurora_mysql_cluster_8, aurora_postgresql_cluster,
                           'do-not-exists-cluster', 'do-not-exists-instance'],
        )
        rds_source = RDSSource(context=context)

        assert rds_source._check_database_type(db_identifier=aurora_mysql_cluster_8) == DatabaseType.CLUSTER
        assert rds_source._check_database_type(db_identifier=aurora_postgresql_cluster) == DatabaseType.CLUSTER
        assert rds_source._check_database_type(db_identifier=mysql_instance_8) == DatabaseType.INSTANCE
        assert rds_source._check_database_type(db_identifier=postgresql_instance) == DatabaseType.INSTANCE

    def test_get_log_parser(self):
        from connector.source.rds import RDSSource, Engine, AuroraMysqlAuditLogFormat, MysqlAuditLogFormat, MysqlSlowQueryLogFormat, MysqlErrorLogFormat, Mysql5ErrorLogFormat, MysqlGeneralLogFormat, PostgresQueryLogFormat

        aurora_mysql_cluster_8 = os.environ['AURORA_MYSQL8_CLUSTER_IDENTIFIER']
        aurora_postgresql_cluster = os.environ['AURORA_POSTGRESQL_CLUSTER_IDENTIFIER']

        context = dict(
            DBIdentifiers=[aurora_mysql_cluster_8, aurora_postgresql_cluster],
        )
        rds_source = RDSSource(context=context)

        aurora_mysql_engine_version_57 = '5.7.mysql_aurora.2.12.2'
        aurora_mysql_engine_version_80 = '8.0.mysql_aurora.3.06.0'
        mysql_engine_version_57 = '5.7.44'
        mysql_engine_version_80 = '8.0.36'
        postgres_engine_version = '15.4'

        assert rds_source._get_log_parser(log_file_name='audit/audit.log.0.2024-01-01-00-00.0', engine=Engine.AURORA_MYSQL,
                                          engine_version=aurora_mysql_engine_version_57).log_format == AuroraMysqlAuditLogFormat  # type: ignore
        assert rds_source._get_log_parser(log_file_name='audit/audit.log.0.2024-01-01-00-00.0', engine=Engine.AURORA_MYSQL,
                                          engine_version=aurora_mysql_engine_version_80).log_format == AuroraMysqlAuditLogFormat  # type: ignore
        assert rds_source._get_log_parser(log_file_name='slowquery/slowquery.log.0.2024-01-01-00-00.0', engine=Engine.AURORA_MYSQL,
                                          engine_version=aurora_mysql_engine_version_57).log_format == MysqlSlowQueryLogFormat  # type: ignore
        assert rds_source._get_log_parser(log_file_name='slowquery/slowquery.log.0.2024-01-01-00-00.0', engine=Engine.AURORA_MYSQL,
                                          engine_version=aurora_mysql_engine_version_80).log_format == MysqlSlowQueryLogFormat  # type: ignore
        assert rds_source._get_log_parser(log_file_name='error/error.log.0.2024-01-01-00-00.0', engine=Engine.AURORA_MYSQL,
                                          engine_version=aurora_mysql_engine_version_57).log_format == Mysql5ErrorLogFormat  # type: ignore
        assert rds_source._get_log_parser(log_file_name='error/error.log.0.2024-01-01-00-00.0', engine=Engine.AURORA_MYSQL,
                                          engine_version=aurora_mysql_engine_version_80).log_format == MysqlErrorLogFormat  # type: ignore
        assert rds_source._get_log_parser(log_file_name='general/general.log.0.2024-01-01-00-00.0', engine=Engine.AURORA_MYSQL,
                                          engine_version=aurora_mysql_engine_version_57).log_format == MysqlGeneralLogFormat  # type: ignore
        assert rds_source._get_log_parser(log_file_name='general/general.log.0.2024-01-01-00-00.0', engine=Engine.AURORA_MYSQL,
                                          engine_version=aurora_mysql_engine_version_80).log_format == MysqlGeneralLogFormat  # type: ignore

        assert rds_source._get_log_parser(log_file_name='audit/audit.log.0.2024-01-01-00-00.0', engine=Engine.MYSQL,
                                          engine_version=mysql_engine_version_57).log_format == MysqlAuditLogFormat  # type: ignore
        assert rds_source._get_log_parser(log_file_name='audit/audit.log.0.2024-01-01-00-00.0', engine=Engine.MYSQL,
                                          engine_version=mysql_engine_version_80).log_format == MysqlAuditLogFormat  # type: ignore
        assert rds_source._get_log_parser(log_file_name='slowquery/slowquery.log.0.2024-01-01-00-00.0', engine=Engine.MYSQL,
                                          engine_version=mysql_engine_version_57).log_format == MysqlSlowQueryLogFormat  # type: ignore
        assert rds_source._get_log_parser(log_file_name='slowquery/slowquery.log.0.2024-01-01-00-00.0', engine=Engine.MYSQL,
                                          engine_version=mysql_engine_version_80).log_format == MysqlSlowQueryLogFormat  # type: ignore
        assert rds_source._get_log_parser(log_file_name='error/error.log.0.2024-01-01-00-00.0', engine=Engine.MYSQL,
                                          engine_version=mysql_engine_version_57).log_format == Mysql5ErrorLogFormat  # type: ignore
        assert rds_source._get_log_parser(log_file_name='error/error.log.0.2024-01-01-00-00.0', engine=Engine.MYSQL,
                                          engine_version=mysql_engine_version_80).log_format == MysqlErrorLogFormat  # type: ignore
        assert rds_source._get_log_parser(log_file_name='general/general.log.0.2024-01-01-00-00.0', engine=Engine.MYSQL,
                                          engine_version=mysql_engine_version_57).log_format == MysqlGeneralLogFormat  # type: ignore
        assert rds_source._get_log_parser(log_file_name='general/general.log.0.2024-01-01-00-00.0', engine=Engine.MYSQL,
                                          engine_version=mysql_engine_version_80).log_format == MysqlGeneralLogFormat  # type: ignore

        assert rds_source._get_log_parser(log_file_name='error/error.log.0.2024-01-01-00-00.0', engine=Engine.AURORA_POSTGRESQL,
                                          engine_version=postgres_engine_version).log_format == PostgresQueryLogFormat  # type: ignore
        assert rds_source._get_log_parser(log_file_name='error/error.log.0.2024-01-01-00-00.0', engine=Engine.POSTGRESQL,
                                          engine_version=postgres_engine_version).log_format == PostgresQueryLogFormat  # type: ignore

        assert rds_source._get_log_parser(log_file_name='error/error.log.0.2024-01-01-00-00.0',
                                          engine='Unknown', engine_version='') is None  # type: ignore

    def test_get_db_cluster_logs(self, mock_rds_context):
        from connector.source.rds import RDSSource
        from unittest.mock import patch

        aurora_mysql_cluster_8 = os.environ['AURORA_MYSQL8_CLUSTER_IDENTIFIER']
        aurora_postgresql_cluster = os.environ['AURORA_POSTGRESQL_CLUSTER_IDENTIFIER']

        context = dict(
            DBIdentifiers=[aurora_mysql_cluster_8, aurora_postgresql_cluster,
                           'do-not-exists-cluster', 'do-not-exists-instance'],
        )
        rds_source = RDSSource(context=context)

        with patch('botocore.client.BaseClient._make_api_call', new=mock_rds_api_call):
            logs = list(rds_source.process())
            assert len(logs) == 43

    def test_get_db_instance_logs(self, mock_rds_context):
        from connector.source.rds import RDSSource
        from unittest.mock import patch

        aurora_mysql_instance_8 = os.environ['AURORA_MYSQL8_INSTANCE_IDENTIFIER']
        postgresql_instance = os.environ['POSTGRESQL_INSTANCE_IDENTIFIER']

        context = dict(
            DBIdentifiers=[aurora_mysql_instance_8, postgresql_instance, 'do-not-exists-instance'],
        )
        rds_source = RDSSource(context=context)
        results = [
            f'''{{"timestamp": "2023-12-29T02:43:30.074458Z", "username": "rdsadmin", "host": "localhost", "connection_id": "223153", "query_id": "20070830", "operation": "QUERY", "database": "", "return_code": "0", "object": "SELECT @@aurora_version", "log_type": "Audit", "db_cluster_identifier": "", "db_instance_identifier": "{
                aurora_mysql_instance_8}", "engine": "aurora-mysql", "engine_version": "8.0.mysql_aurora.3.06.0", "endpoint_address": "{aurora_mysql_instance_8}.us-east-1.rds.amazonaws.com", "endpoint_port": 3306}}\n''',
            f'''{{"timestamp": "2023-12-29T02:43:30.075253Z", "username": "rdsadmin", "host": "localhost", "connection_id": "217705", "query_id": "20070831", "operation": "QUERY", "database": "mysql", "return_code": "0", "object": "select @@session.transaction_read_only", "log_type": "Audit", "db_cluster_identifier": "", "db_instance_identifier": "{
                aurora_mysql_instance_8}", "engine": "aurora-mysql", "engine_version": "8.0.mysql_aurora.3.06.0", "endpoint_address": "{aurora_mysql_instance_8}.us-east-1.rds.amazonaws.com", "endpoint_port": 3306}}\n''',
            f'''{{"timestamp": "2023-12-29T02:43:30.076091Z", "username": "rdsadmin", "host": "localhost", "connection_id": "223170", "query_id": "0", "operation": "CONNECT", "database": "", "return_code": "0", "object": "", "log_type": "Audit", "db_cluster_identifier": "", "db_instance_identifier": "{
                aurora_mysql_instance_8}", "engine": "aurora-mysql", "engine_version": "8.0.mysql_aurora.3.06.0", "endpoint_address": "{aurora_mysql_instance_8}.us-east-1.rds.amazonaws.com", "endpoint_port": 3306}}\n''',
            f'''{{"timestamp": "2023-12-29T02:43:30.076149Z", "username": "rdsadmin", "host": "localhost", "connection_id": "217705", "query_id": "20070832", "operation": "QUERY", "database": "mysql", "return_code": "0", "object": "COMMIT", "log_type": "Audit", "db_cluster_identifier": "", "db_instance_identifier": "{
                aurora_mysql_instance_8}", "engine": "aurora-mysql", "engine_version": "8.0.mysql_aurora.3.06.0", "endpoint_address": "{aurora_mysql_instance_8}.us-east-1.rds.amazonaws.com", "endpoint_port": 3306}}\n''',
            f'''{{"timestamp": "2023-12-29T02:43:30.076500Z", "username": "rdsadmin", "host": "localhost", "connection_id": "217705", "query_id": "20070833", "operation": "QUERY", "database": "", "return_code": "0", "object": "SET @@sql_log_bin=on", "log_type": "Audit", "db_cluster_identifier": "", "db_instance_identifier": "{
                aurora_mysql_instance_8}", "engine": "aurora-mysql", "engine_version": "8.0.mysql_aurora.3.06.0", "endpoint_address": "{aurora_mysql_instance_8}.us-east-1.rds.amazonaws.com", "endpoint_port": 3306}}\n''',
            f'''{{"timestamp": "2023-12-29T02:43:30.076799Z", "username": "rdsadmin", "host": "localhost", "connection_id": "223170", "query_id": "20070834", "operation": "QUERY", "database": "", "return_code": "0", "object": "SET SESSION wait_timeout=28800,SESSION time_zone=\'+00:00\',SESSION sql_mode=0,SESSION autocommit=1", "log_type": "Audit", "db_cluster_identifier": "", "db_instance_identifier": "{
                aurora_mysql_instance_8}", "engine": "aurora-mysql", "engine_version": "8.0.mysql_aurora.3.06.0", "endpoint_address": "{aurora_mysql_instance_8}.us-east-1.rds.amazonaws.com", "endpoint_port": 3306}}\n''',
            f'''{{"timestamp": "2023-12-29T02:43:30.077132Z", "username": "rdsadmin", "host": "localhost", "connection_id": "223170", "query_id": "20070835", "operation": "QUERY", "database": "", "return_code": "0", "object": "/* mysql-connector-java-5.1.48 ( Revision: 29734982609c32d3ab7e5cac2e6acee69ff6b4aa ) */SELECT  @@session.auto_increment_increment AS auto_increment_increment, @@character_set_client AS character_set_client, @@character_set_connection AS character_set_connection, @@character_set_results AS character_set_results, @@character_set_server AS character_set_server, @@collation_server AS collation_server, @@collation_connection AS collation_connection, @@init_connect AS init_connect, @@interactive_timeout AS interactive_timeout, @@license AS license, @@lower_case_table_names AS lower_case_table_names, @@max_allowed_packet AS max_allowed_packet, @@net_buffer_length AS net_buffer_length, @@net_write_timeout AS net_write_timeout, @@performance_schema AS performance_schema, @@sql_mode AS sql_mode, @@system_time_zone AS system_time_zone, @@time_zone AS time_zone, @@transaction_isolation AS transaction_isolation, @@wait_timeout AS wait_timeout", "log_type": "Audit", "db_cluster_identifier": "", "db_instance_identifier": "{
                aurora_mysql_instance_8}", "engine": "aurora-mysql", "engine_version": "8.0.mysql_aurora.3.06.0", "endpoint_address": "{aurora_mysql_instance_8}.us-east-1.rds.amazonaws.com", "endpoint_port": 3306}}\n''',
            f'''{{"timestamp": "2023-12-29T02:43:32.006334Z", "username": "rdsadmin", "host": "localhost", "connection_id": "217704", "query_id": "20070843", "operation": "QUERY", "database": "", "return_code": "0", "object": "set local oscar_local_only_replica_host_status=1", "log_type": "Audit", "db_cluster_identifier": "", "db_instance_identifier": "{
                aurora_mysql_instance_8}", "engine": "aurora-mysql", "engine_version": "8.0.mysql_aurora.3.06.0", "endpoint_address": "{aurora_mysql_instance_8}.us-east-1.rds.amazonaws.com", "endpoint_port": 3306}}\n''',
            f'''{{"timestamp": "2023-12-29T02:43:32.018585Z", "username": "rdsadmin", "host": "localhost", "connection_id": "217704", "query_id": "20070847", "operation": "QUERY", "database": "", "return_code": "0", "object": "SELECT durable_lsn, current_read_point, server_id, last_update_timestamp FROM information_schema.replica_host_status", "log_type": "Audit", "db_cluster_identifier": "", "db_instance_identifier": "{
                aurora_mysql_instance_8}", "engine": "aurora-mysql", "engine_version": "8.0.mysql_aurora.3.06.0", "endpoint_address": "{aurora_mysql_instance_8}.us-east-1.rds.amazonaws.com", "endpoint_port": 3306}}\n''',
            f'''{{"timestamp": "2023-12-29T02:43:32.025947Z", "username": "rdsadmin", "host": "localhost", "connection_id": "217705", "query_id": "20070852", "operation": "QUERY", "database": "mysql", "return_code": "0", "object": "select @@session.transaction_read_only", "log_type": "Audit", "db_cluster_identifier": "", "db_instance_identifier": "{
                aurora_mysql_instance_8}", "engine": "aurora-mysql", "engine_version": "8.0.mysql_aurora.3.06.0", "endpoint_address": "{aurora_mysql_instance_8}.us-east-1.rds.amazonaws.com", "endpoint_port": 3306}}\n''',
            f'''{{"timestamp": "2023-12-29T02:43:32.026505Z", "username": "rdsadmin", "host": "localhost", "connection_id": "217705", "query_id": "20070854", "operation": "QUERY", "database": "", "return_code": "0", "object": "SET @@sql_log_bin=on", "log_type": "Audit", "db_cluster_identifier": "", "db_instance_identifier": "{
                aurora_mysql_instance_8}", "engine": "aurora-mysql", "engine_version": "8.0.mysql_aurora.3.06.0", "endpoint_address": "{aurora_mysql_instance_8}.us-east-1.rds.amazonaws.com", "endpoint_port": 3306}}\n''',
            f'''{{"timestamp": "2023-11-30T07:22:10.190471Z", "username": "admin", "host": "127.0.0.1", "query_id": "7432", "query_time": "2.000192", "lock_time": "0.000000", "rows_sent": "1", "rows_examined": "1", "object": "use audit;\\nSET timestamp=1701328928;\\nselect sleep(2)", "log_type": "SlowQuery", "db_cluster_identifier": "", "db_instance_identifier": "{
                aurora_mysql_instance_8}", "engine": "aurora-mysql", "engine_version": "8.0.mysql_aurora.3.06.0", "endpoint_address": "{aurora_mysql_instance_8}.us-east-1.rds.amazonaws.com", "endpoint_port": 3306}}\n''',
            f'''{{"timestamp": "2024-01-03T01:35:35.952622Z", "username": "admin", "host": "127.0.0.1", "query_id": "260259", "query_time": "2.000294", "lock_time": "0.000000", "rows_sent": "1", "rows_examined": "1", "object": "SET timestamp=1704245733;\\nselect\\nsleep(2)", "log_type": "SlowQuery", "db_cluster_identifier": "", "db_instance_identifier": "{
                aurora_mysql_instance_8}", "engine": "aurora-mysql", "engine_version": "8.0.mysql_aurora.3.06.0", "endpoint_address": "{aurora_mysql_instance_8}.us-east-1.rds.amazonaws.com", "endpoint_port": 3306}}\n''',
            f'''{{"timestamp": "2024-01-03T07:15:38.660108Z", "username": "admin", "host": "127.0.0.2", "query_id": "262030", "query_time": "2.000231", "lock_time": "0.000000", "rows_sent": "1", "rows_examined": "1", "object": "use audit;\\nSET timestamp=1704266136;\\nselect sleep(2)", "log_type": "SlowQuery", "db_cluster_identifier": "", "db_instance_identifier": "{
                aurora_mysql_instance_8}", "engine": "aurora-mysql", "engine_version": "8.0.mysql_aurora.3.06.0", "endpoint_address": "{aurora_mysql_instance_8}.us-east-1.rds.amazonaws.com", "endpoint_port": 3306}}\n''',
            f'''{{"timestamp": "2024-01-03T07:15:42.875605Z", "username": "admin", "host": "127.0.0.1", "query_id": "262030", "query_time": "2.000255", "lock_time": "0.000000", "rows_sent": "1", "rows_examined": "1", "object": "SET timestamp=1704266140;\\nselect sleep(2)", "log_type": "SlowQuery", "db_cluster_identifier": "", "db_instance_identifier": "{
                aurora_mysql_instance_8}", "engine": "aurora-mysql", "engine_version": "8.0.mysql_aurora.3.06.0", "endpoint_address": "{aurora_mysql_instance_8}.us-east-1.rds.amazonaws.com", "endpoint_port": 3306}}\n''',
            f'''{{"timestamp": "2024-01-03T07:17:20.525029Z", "username": "admin", "host": "127.0.0.1", "query_id": "262030", "query_time": "2.002099", "lock_time": "0.000000", "rows_sent": "1", "rows_examined": "2", "object": "SET timestamp=1704266238;\\nwith dataset as (\\nselect sleep(2) as t)\\nselect *\\nfrom dataset", "log_type": "SlowQuery", "db_cluster_identifier": "", "db_instance_identifier": "{
                aurora_mysql_instance_8}", "engine": "aurora-mysql", "engine_version": "8.0.mysql_aurora.3.06.0", "endpoint_address": "{aurora_mysql_instance_8}.us-east-1.rds.amazonaws.com", "endpoint_port": 3306}}\n''',
            f'''{{"timestamp": "2024-01-03T07:20:25.435204Z", "username": "admin", "host": "127.0.0.1", "query_id": "262030", "query_time": "2.000233", "lock_time": "0.000000", "rows_sent": "1", "rows_examined": "1", "object": "SET timestamp=1704266423;\\nselect sleep(2)", "log_type": "SlowQuery", "db_cluster_identifier": "", "db_instance_identifier": "{
                aurora_mysql_instance_8}", "engine": "aurora-mysql", "engine_version": "8.0.mysql_aurora.3.06.0", "endpoint_address": "{aurora_mysql_instance_8}.us-east-1.rds.amazonaws.com", "endpoint_port": 3306}}\n''',
            f'''{{"timestamp": "2023-11-28T09:13:22.104678Z", "connection_id": "0", "priority": "System", "return_code": "MY-010116", "subsystem": "Server", "object": "/rdsdbbin/oscar/bin/mysqld (mysqld 8.0.28) starting as process 259 (mysqld.cc:5965)", "log_type": "Error", "db_cluster_identifier": "", "db_instance_identifier": "{
                aurora_mysql_instance_8}", "engine": "aurora-mysql", "engine_version": "8.0.mysql_aurora.3.06.0", "endpoint_address": "{aurora_mysql_instance_8}.us-east-1.rds.amazonaws.com", "endpoint_port": 3306}}\n''',
            f'''{{"timestamp": "2023-11-28T09:13:22.112841Z", "connection_id": "0", "priority": "Note", "return_code": "MY-010747", "subsystem": "Server", "object": "Plugin \'FEDERATED\' is disabled. (sql_plugin.cc:3604)\\n231128  9:13:22 server_audit: Audit STARTED.\\nFound DAS config file, trying to load DAS switcher from DAS config file.\\n2023-11-28 09:13:22 22566174378368:[DAS][INFO]: Calculated persistence threads 4\\naurora_enable_das:0\\n231128  9:13:22 server_audit: server_audit_incl_users set to \'\'.\\n231128  9:13:22 server_audit: server_audit_excl_users set to \'\'.", "log_type": "Error", "db_cluster_identifier": "", "db_instance_identifier": "{
                aurora_mysql_instance_8}", "engine": "aurora-mysql", "engine_version": "8.0.mysql_aurora.3.06.0", "endpoint_address": "{aurora_mysql_instance_8}.us-east-1.rds.amazonaws.com", "endpoint_port": 3306}}\n''',
            f'''{{"timestamp": "2023-11-28T09:13:22.114869Z", "connection_id": "1", "priority": "System", "return_code": "MY-013576", "subsystem": "InnoDB", "object": "InnoDB initialization has started. (ha_innodb.cc:13611)", "log_type": "Error", "db_cluster_identifier": "", "db_instance_identifier": "{
                aurora_mysql_instance_8}", "engine": "aurora-mysql", "engine_version": "8.0.mysql_aurora.3.06.0", "endpoint_address": "{aurora_mysql_instance_8}.us-east-1.rds.amazonaws.com", "endpoint_port": 3306}}\n''',
            f'''{{"timestamp": "2023-11-28T09:13:34.131165Z", "connection_id": "5", "priority": "Note", "return_code": "MY-013386", "subsystem": "Server", "object": "Running queries to upgrade MySQL server. (server.cc:758)\\n# Existing AMS 5.7 external services integration privilege columns is converted to role grants for the user\\nINSERT INTO mysql.role_edges (from_host, from_user, to_host, to_user) select \'%\', \'AWS_LOAD_S3_ACCESS\', host, user from mysql.user where load_from_s3_priv = \'Y\';\\n. Ignored error No: 1054, Ignored error: Unknown column \'load_from_s3_priv\' in \'where clause\'(server.cc:629)", "log_type": "Error", "db_cluster_identifier": "", "db_instance_identifier": "{
                aurora_mysql_instance_8}", "engine": "aurora-mysql", "engine_version": "8.0.mysql_aurora.3.06.0", "endpoint_address": "{aurora_mysql_instance_8}.us-east-1.rds.amazonaws.com", "endpoint_port": 3306}}\n''',
            f'''{{"timestamp": "2023-11-28T09:13:38.582491Z", "connection_id": "5", "priority": "Note", "return_code": "MY-013387", "subsystem": "Server", "object": "Upgrading system table data. (server.cc:784)", "log_type": "Error", "db_cluster_identifier": "", "db_instance_identifier": "{
                aurora_mysql_instance_8}", "engine": "aurora-mysql", "engine_version": "8.0.mysql_aurora.3.06.0", "endpoint_address": "{aurora_mysql_instance_8}.us-east-1.rds.amazonaws.com", "endpoint_port": 3306}}\n''',
            f'''{{"timestamp": "2023-11-28T09:13:39.861463Z", "connection_id": "5", "priority": "Note", "return_code": "MY-013385", "subsystem": "Server", "object": "Upgrading the sys schema. (server.cc:720)", "log_type": "Error", "db_cluster_identifier": "", "db_instance_identifier": "{
                aurora_mysql_instance_8}", "engine": "aurora-mysql", "engine_version": "8.0.mysql_aurora.3.06.0", "endpoint_address": "{aurora_mysql_instance_8}.us-east-1.rds.amazonaws.com", "endpoint_port": 3306}}\n''',
            f'''{{"timestamp": "2024-01-03T08:00:01.341151Z", "connection_id": "217720", "operation": "Query", "object": "SET @@sql_log_bin=on", "log_type": "General", "db_cluster_identifier": "", "db_instance_identifier": "{
                aurora_mysql_instance_8}", "engine": "aurora-mysql", "engine_version": "8.0.mysql_aurora.3.06.0", "endpoint_address": "{aurora_mysql_instance_8}.us-east-1.rds.amazonaws.com", "endpoint_port": 3306}}\n''',
            f'''{{"timestamp": "2024-01-03T08:00:01.511636Z", "connection_id": "217704", "operation": "Query", "object": "set local oscar_local_only_replica_host_status=1;", "log_type": "General", "db_cluster_identifier": "", "db_instance_identifier": "{
                aurora_mysql_instance_8}", "engine": "aurora-mysql", "engine_version": "8.0.mysql_aurora.3.06.0", "endpoint_address": "{aurora_mysql_instance_8}.us-east-1.rds.amazonaws.com", "endpoint_port": 3306}}\n''',
            f'''{{"timestamp": "2024-01-03T08:00:01.511747Z", "connection_id": "217704", "operation": "Query", "object": "SELECT durable_lsn, current_read_point, server_id, last_update_timestamp FROM information_schema.replica_host_status;", "log_type": "General", "db_cluster_identifier": "", "db_instance_identifier": "{
                aurora_mysql_instance_8}", "engine": "aurora-mysql", "engine_version": "8.0.mysql_aurora.3.06.0", "endpoint_address": "{aurora_mysql_instance_8}.us-east-1.rds.amazonaws.com", "endpoint_port": 3306}}\n''',
            f'''{{"timestamp": "2024-01-03T08:12:18.027713Z", "connection_id": "217705", "operation": "Query", "object": "SET @@sql_log_bin=on", "log_type": "General", "db_cluster_identifier": "", "db_instance_identifier": "{
                aurora_mysql_instance_8}", "engine": "aurora-mysql", "engine_version": "8.0.mysql_aurora.3.06.0", "endpoint_address": "{aurora_mysql_instance_8}.us-east-1.rds.amazonaws.com", "endpoint_port": 3306}}\n''',
            f'''{{"timestamp": "2024-01-03T08:12:19.125290Z", "connection_id": "262325", "operation": "Query", "object": "with dataset as (\\nselect sleep(2) as t)\\nselect * from t", "log_type": "General", "db_cluster_identifier": "", "db_instance_identifier": "{
                aurora_mysql_instance_8}", "engine": "aurora-mysql", "engine_version": "8.0.mysql_aurora.3.06.0", "endpoint_address": "{aurora_mysql_instance_8}.us-east-1.rds.amazonaws.com", "endpoint_port": 3306}}\n''',
            f'''{{"timestamp": "2024-01-03T08:12:19.340385Z", "connection_id": "126289", "operation": "Query", "object": "SELECT 1", "log_type": "General", "db_cluster_identifier": "", "db_instance_identifier": "{
                aurora_mysql_instance_8}", "engine": "aurora-mysql", "engine_version": "8.0.mysql_aurora.3.06.0", "endpoint_address": "{aurora_mysql_instance_8}.us-east-1.rds.amazonaws.com", "endpoint_port": 3306}}\n''',
            f'''{{"timestamp": "2024-01-03T08:12:20.050828Z", "connection_id": "217704", "operation": "Query", "object": "set local oscar_local_only_replica_host_status=1;", "log_type": "General", "db_cluster_identifier": "", "db_instance_identifier": "{
                aurora_mysql_instance_8}", "engine": "aurora-mysql", "engine_version": "8.0.mysql_aurora.3.06.0", "endpoint_address": "{aurora_mysql_instance_8}.us-east-1.rds.amazonaws.com", "endpoint_port": 3306}}\n''',
            f'''{{"timestamp": "2024-01-03T08:12:20.050990Z", "connection_id": "217704", "operation": "Query", "object": "SELECT durable_lsn, current_read_point, server_id, last_update_timestamp FROM information_schema.replica_host_status;", "log_type": "General", "db_cluster_identifier": "", "db_instance_identifier": "{
                aurora_mysql_instance_8}", "engine": "aurora-mysql", "engine_version": "8.0.mysql_aurora.3.06.0", "endpoint_address": "{aurora_mysql_instance_8}.us-east-1.rds.amazonaws.com", "endpoint_port": 3306}}\n''',
            f'''{{"timestamp": "2023-11-29T09:23:46.000000Z", "host": "", "port": "", "username": "", "database": "", "connection_id": "560", "operation": "LOG", "object": "checkpoint starting: time", "log_type": "Query", "db_cluster_identifier": "", "db_instance_identifier": "{
                postgresql_instance}", "engine": "postgres", "engine_version": "12.12", "endpoint_address": "{postgresql_instance}.us-east-1.rds.amazonaws.com", "endpoint_port": 5432}}\n''',
            f'''{{"timestamp": "2023-11-29T09:23:46.000000Z", "host": "", "port": "", "username": "", "database": "", "connection_id": "560", "operation": "LOG", "object": "checkpoint complete: wrote 0 buffers (0.0%); 0 WAL file(s) added, 0 removed, 0 recycled; write=0.001 s, sync=0.001 s, total=0.001 s; sync files=0, longest=0.000 s, average=0.000 s; distance=0 kB, estimate=0 kB", "log_type": "Query", "db_cluster_identifier": "", "db_instance_identifier": "{
                postgresql_instance}", "engine": "postgres", "engine_version": "12.12", "endpoint_address": "{postgresql_instance}.us-east-1.rds.amazonaws.com", "endpoint_port": 5432}}\n''',
            f'''{{"timestamp": "2023-11-29T09:23:51.000000Z", "host": "10.0.2.55", "port": "57562", "username": "postgres", "database": "postgres", "connection_id": "29735", "operation": "LOG", "object": "statement: SELECT d.datname as \\"Name\\",\\n        pg_catalog.pg_get_userbyid(d.datdba) as \\"Owner\\",\\n        pg_catalog.pg_encoding_to_char(d.encoding) as \\"Encoding\\",\\n        d.datcollate as \\"Collate\\",\\n        d.datctype as \\"Ctype\\",\\n        pg_catalog.array_to_string(d.datacl, E\'\\n\') AS \\"Access privileges\\"\\n    FROM pg_catalog.pg_database d\\n    ORDER BY 1;", "log_type": "Query", "db_cluster_identifier": "", "db_instance_identifier": "{
                postgresql_instance}", "engine": "postgres", "engine_version": "12.12", "endpoint_address": "{postgresql_instance}.us-east-1.rds.amazonaws.com", "endpoint_port": 5432}}\n''',
            f'''{{"timestamp": "2023-11-29T09:24:05.000000Z", "host": "10.0.2.55", "port": "57562", "username": "postgres", "database": "postgres", "connection_id": "29735", "operation": "ERROR", "object": "syntax error at or near \\"/\\" at character 1", "log_type": "Query", "db_cluster_identifier": "", "db_instance_identifier": "{
                postgresql_instance}", "engine": "postgres", "engine_version": "12.12", "endpoint_address": "{postgresql_instance}.us-east-1.rds.amazonaws.com", "endpoint_port": 5432}}\n''',
            f'''{{"timestamp": "2023-11-29T09:24:05.000000Z", "host": "10.0.2.55", "port": "57562", "username": "postgres", "database": "postgres", "connection_id": "29735", "operation": "STATEMENT", "object": "/h\\n    LIst\\n    list\\n    select * from audit.record_history;", "log_type": "Query", "db_cluster_identifier": "", "db_instance_identifier": "{
                postgresql_instance}", "engine": "postgres", "engine_version": "12.12", "endpoint_address": "{postgresql_instance}.us-east-1.rds.amazonaws.com", "endpoint_port": 5432}}\n''',
            f'''{{"timestamp": "2023-11-29T09:24:09.000000Z", "host": "10.0.2.55", "port": "57562", "username": "postgres", "database": "postgres", "connection_id": "29735", "operation": "LOG", "object": "statement: select * from audit.record_history;", "log_type": "Query", "db_cluster_identifier": "", "db_instance_identifier": "{
                postgresql_instance}", "engine": "postgres", "engine_version": "12.12", "endpoint_address": "{postgresql_instance}.us-east-1.rds.amazonaws.com", "endpoint_port": 5432}}\n''',
            f'''{{"timestamp": "2023-11-29T09:24:09.000000Z", "host": "10.0.2.55", "port": "57562", "username": "postgres", "database": "postgres", "connection_id": "29735", "operation": "ERROR", "object": "relation \\"audit.record_history\\" does not exist at character 15", "log_type": "Query", "db_cluster_identifier": "", "db_instance_identifier": "{
                postgresql_instance}", "engine": "postgres", "engine_version": "12.12", "endpoint_address": "{postgresql_instance}.us-east-1.rds.amazonaws.com", "endpoint_port": 5432}}\n''',
            f'''{{"timestamp": "2023-11-29T09:24:09.000000Z", "host": "10.0.2.55", "port": "57562", "username": "postgres", "database": "postgres", "connection_id": "29735", "operation": "STATEMENT", "object": "select * from audit.record_history;", "log_type": "Query", "db_cluster_identifier": "", "db_instance_identifier": "{
                postgresql_instance}", "engine": "postgres", "engine_version": "12.12", "endpoint_address": "{postgresql_instance}.us-east-1.rds.amazonaws.com", "endpoint_port": 5432}}\n''',
            f'''{{"timestamp": "2023-11-29T09:24:22.000000Z", "host": "10.0.2.55", "port": "57562", "username": "postgres", "database": "postgres", "connection_id": "29735", "operation": "LOG", "object": "statement: select * from audit.record_history;", "log_type": "Query", "db_cluster_identifier": "", "db_instance_identifier": "{
                postgresql_instance}", "engine": "postgres", "engine_version": "12.12", "endpoint_address": "{postgresql_instance}.us-east-1.rds.amazonaws.com", "endpoint_port": 5432}}\n''',
            f'''{{"timestamp": "2024-03-27T01:35:26.270000Z", "host": null, "port": null, "username": null, "database": null, "connection_id": "394", "operation": "LOG", "object": "skipping missing configuration file \\"/rdsdbdata/config/recovery.conf\\"", "log_type": "Query", "db_cluster_identifier": "", "db_instance_identifier": "{
                postgresql_instance}", "engine": "postgres", "engine_version": "12.12", "endpoint_address": "{postgresql_instance}.us-east-1.rds.amazonaws.com", "endpoint_port": 5432}}\n''',
            f'''{{"timestamp": "2024-03-27T01:35:26.271000Z", "host": null, "port": null, "username": null, "database": null, "connection_id": "394", "operation": "LOG", "object": "skipping missing configuration file \\"/rdsdbdata/config/recovery.conf\\"", "log_type": "Query", "db_cluster_identifier": "", "db_instance_identifier": "{
                postgresql_instance}", "engine": "postgres", "engine_version": "12.12", "endpoint_address": "{postgresql_instance}.us-east-1.rds.amazonaws.com", "endpoint_port": 5432}}\n''',
            f'''{{"timestamp": "2024-03-27T01:36:27.000000Z", "host": "10.0.2.55", "port": "57562", "username": "postgres", "database": "postgres", "connection_id": "29735", "operation": "LOG", "object": "statement: select * from audit.record_history;", "log_type": "Query", "db_cluster_identifier": "", "db_instance_identifier": "{
                postgresql_instance}", "engine": "postgres", "engine_version": "12.12", "endpoint_address": "{postgresql_instance}.us-east-1.rds.amazonaws.com", "endpoint_port": 5432}}\n''',
        ]
        with patch('botocore.client.BaseClient._make_api_call', new=mock_rds_api_call):
            logs = list(rds_source.process())
            assert len(logs) == 43
            for log in logs:
                assert log in results

        context = dict(
            DBIdentifiers=[aurora_mysql_instance_8],
            FilenameContains=["audit"],
        )
        rds_source = RDSSource(context=context)
        with patch('botocore.client.BaseClient._make_api_call', new=mock_rds_api_call):
            logs = list(rds_source.process())
            assert len(logs) == 11
            for log in logs:
                assert log in results

    def test_clean_expired_marker(self):
        from connector.source.rds import RDSSource

        aurora_mysql_cluster_8 = os.environ['AURORA_MYSQL8_CLUSTER_IDENTIFIER']
        aurora_postgresql_cluster = os.environ['AURORA_POSTGRESQL_CLUSTER_IDENTIFIER']
        mysql_instance_8 = os.environ['MYSQL8_INSTANCE_IDENTIFIER']
        postgresql_instance = os.environ['POSTGRESQL_INSTANCE_IDENTIFIER']

        db_identifiers = [aurora_mysql_cluster_8, aurora_postgresql_cluster, mysql_instance_8, postgresql_instance]
        log_file_marker = {
            'database-1': {
                'error/mysql-error.log': {
                    'LogFileName': 'error/mysql-error.log',
                    'LastWritten': 1604357600484,
                    'Size': 0,
                    'Marker': '2024-01-01.9:0'
                }
            },
            'aurora-mysql-instance-1': {
                'audit/audit.log.0.2024-01-01-00-00.0': {
                    'LogFileName': 'audit/audit.log.0.2024-01-01-00-00.0',
                    'LastWritten': 1704357690097,
                    'Size': 326043,
                    'Marker': '9:326043'
                },
                'audit/audit.log.1.2024-01-01-00-30.0': {
                    'LogFileName': 'audit/audit.log.1.2024-01-01-00-30.0',
                    'LastWritten': 1604357686041,
                    'Size': 104002,
                    'Marker': '9:105090'
                }
            }
        }
        context = dict(
            DBIdentifiers=db_identifiers,
            LogFileMarker=log_file_marker,
            LogFileMarkerExpireDays=1,
        )
        rds_source = RDSSource(context=context)
        rds_source._clean_expired_marker()
        assert rds_source.log_file_marker == {}

    def test_process(self, mock_rds_context):
        from connector.source.rds import RDSSource
        from unittest.mock import patch

        aurora_mysql_cluster_8 = os.environ['AURORA_MYSQL8_CLUSTER_IDENTIFIER']
        postgresql_instance = os.environ['POSTGRESQL_INSTANCE_IDENTIFIER']

        with patch('botocore.client.BaseClient._make_api_call', new=mock_rds_api_call):
            context = dict(
                DBIdentifiers=[aurora_mysql_cluster_8, postgresql_instance,
                               'do-not-exists-cluster', 'do-not-exists-instance'],
            )
            rds_source = RDSSource(context=context)
            logs = list(rds_source.process())
            assert len(logs) == 43

    def test_context(self):
        from connector.source.rds import RDSSource

        aurora_mysql_cluster_8 = os.environ['AURORA_MYSQL8_CLUSTER_IDENTIFIER']
        mysql_instance_8 = os.environ['MYSQL8_INSTANCE_IDENTIFIER']

        db_identifiers = [aurora_mysql_cluster_8, mysql_instance_8]
        current_epoch_time_in_ms = 1604357600484
        log_file_marker = {
            'database-1': {
                'error/mysql-error.log': {
                    'LogFileName': 'error/mysql-error.log',
                    'LastWritten': 1704357600484,
                    'Size': 0,
                    'Marker': '2024-01-04.9:0'
                }
            },
            'aurora-mysql-instance-1': {
                'audit/audit.log.0.2024-01-04-08-30.0': {
                    'LogFileName': 'audit/audit.log.0.2024-01-04-08-30.0',
                    'LastWritten': 1704357690097,
                    'Size': 326043,
                    'Marker': '9:326043'
                },
                'audit/audit.log.1.2024-01-04-08-30.0': {
                    'LogFileName': 'audit/audit.log.1.2024-01-04-08-30.0',
                    'LastWritten': 1704357686041,
                    'Size': 104002,
                    'Marker': '9:105090'
                }
            }
        }
        log_file_marker_expire_days = 5
        context = dict(
            DBIdentifiers=db_identifiers,
            LastWritten=current_epoch_time_in_ms,
            LogFileMarker=log_file_marker,
            LogFileMarkerExpireDays=log_file_marker_expire_days,
        )

        rds_source = RDSSource(context=context)

        assert set(rds_source.context['DBIdentifiers']) == set(db_identifiers)  # type: ignore
        assert rds_source.context['LastWritten'] > current_epoch_time_in_ms  # type: ignore
        assert rds_source.context['LogFileMarker'] == log_file_marker
        assert rds_source.context['LogFileMarkerExpireDays'] == log_file_marker_expire_days

        context = dict(LastWritten=current_epoch_time_in_ms)
        rds_source = RDSSource(context=context)

        assert rds_source.context['DBIdentifiers'] == []
        assert rds_source.context['LastWritten'] > current_epoch_time_in_ms  # type: ignore
        assert rds_source.context['LogFileMarker'] == {}
        assert rds_source.context['LogFileMarkerExpireDays'] == 3


class TestLogFormat:
    def test_log_format(self):
        from connector.source.base import LogFormat

        log_format = LogFormat

        assert log_format._transform(data={'a': 1}) == {'a': 1}


class TestAbstractSource:
    def test_configure(self):
        from connector.source.base import AbstractSource

        source = AbstractSource(context={})

    def test_process(self):
        from connector.source.base import AbstractSource

        source = AbstractSource(context={})
        assert next(source.process()) == ''

    def test_context(self):
        from connector.source.base import AbstractSource

        source = AbstractSource(context={})
        assert source.context == {}


class TestAbstractSink:
    def test_configure(self):
        from connector.sink.base import AbstractSink

        sink = AbstractSink(context={})

    def test_process(self):
        from connector.source.base import AbstractSource
        from connector.sink.base import AbstractSink

        source = AbstractSource(context={})

        sink = AbstractSink(context={})
        sink.process(source=source)

    def test_context(self):
        from connector.sink.base import AbstractSink

        sink = AbstractSink(context={})
        assert sink.context == {}


class TestParameters:

    def test_required_parameter_check(self, mock_sqs_context, mock_iam_context, mock_ddb_context, mock_rds_context):
        from connector.lambda_function import Parameters, AWS_DDB_META

        meta_name = str(uuid.uuid4())
        staging_bucket = os.environ["STAGING_BUCKET_NAME"]
        staging_prefix = 'AWSLogs/RDS/'
        db_identifiers = ['aurora-mysql', 'mysql-instance', 'postgres-instance', 'do-not-exists-cluster']

        event = {
            "metaName": meta_name,
            "source": {
                "type": "rds",
                "context": {
                    'DBIdentifiers': db_identifiers,
                }
            },
            "sink": {
                "type": "s3",
                "context": {
                    "bucket": staging_bucket,
                    "prefix": staging_prefix,
                }
            }
        }
        param = Parameters(parameters=event)
        assert param.meta_name == meta_name
        assert param.source.type == 'rds'
        assert param.source.cls.db_identifiers == set(db_identifiers)
        assert param.source.cls.last_written > 0
        assert param.source.cls.log_file_marker == {}
        assert param.source.cls.log_file_marker_expire_days == 3

        assert param.sink.type == 's3'
        assert param.sink.cls.bucket == staging_bucket

        match = re.match(f"{staging_prefix.strip('/')}/year=\\d{{4}}/month=\\d{{2}}/day=\\d{{2}}",
                         param.sink.cls.prefix)
        assert match is not None


def test_lambda_handler():
    from connector.lambda_function import lambda_handler
    from connector.sink.base import Status
    from unittest.mock import patch

    meta_name = str(uuid.uuid4())
    staging_bucket = os.environ["STAGING_BUCKET_NAME"]
    staging_prefix = 'AWSLogs/RDS/'

    aurora_mysql_cluster_8 = os.environ['AURORA_MYSQL8_CLUSTER_IDENTIFIER']
    mysql_instance_8 = os.environ['MYSQL8_INSTANCE_IDENTIFIER']
    postgresql_instance = os.environ['POSTGRESQL_INSTANCE_IDENTIFIER']
    db_identifiers = [aurora_mysql_cluster_8, mysql_instance_8, postgresql_instance, 'do-not-exists-cluster']

    event = {
        "metaName": meta_name,
        "source": {
            "type": "rds",
            "context": {
                'DBIdentifiers': db_identifiers,
            }
        },
        "sink": {
            "type": "s3",
            "context": {
                "bucket": staging_bucket,
                "prefix": staging_prefix,
            }
        }
    }

    with patch('botocore.client.BaseClient._make_api_call', new=mock_rds_api_call):
        status = lambda_handler(event, None)
        assert status == Status.SUCCEEDED

    meta_name = str(uuid.uuid4())
    staging_bucket = 'do-not-exists-bucket'

    event = {
        "metaName": meta_name,
        "source": {
            "type": "rds",
            "context": {
                'DBIdentifiers': db_identifiers,
            }
        },
        "sink": {
            "type": "s3",
            "context": {
                "bucket": staging_bucket,
                "prefix": staging_prefix,
            }
        }
    }

    with patch('botocore.client.BaseClient._make_api_call', new=mock_rds_api_call):
        status = lambda_handler(event, None)
        assert status == Status.FAILED
