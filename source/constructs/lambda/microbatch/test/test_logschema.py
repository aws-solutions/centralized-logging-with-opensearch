# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import os
import sys
import json
import collections
from test.mock import (
    mock_s3_context,
    mock_ddb_context,
    mock_glue_context,
    mock_sqs_context,
    mock_iam_context,
    mock_scheduler_context,
    default_environment_variables,
)


sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


class TestServicesLogSchema:

    def test_cloudfront(
        self,
    ):
        from utils.aws.glue.table import TableMetaData
        from pipeline_resources_builder.logschema import (
            CLOUDFRONT_RAW,
            CLOUDFRONT_PARQUET,
            CLOUDFRONT_METRICS,
        )

        assert isinstance(CLOUDFRONT_RAW, TableMetaData) is True
        assert isinstance(CLOUDFRONT_PARQUET, TableMetaData) is True
        assert isinstance(CLOUDFRONT_METRICS, TableMetaData) is True

        assert CLOUDFRONT_RAW.columns == [
            {"Name": "date", "Type": "date"},
            {"Name": "time", "Type": "string"},
            {"Name": "x-edge-location", "Type": "string"},
            {"Name": "sc-bytes", "Type": "bigint"},
            {"Name": "c-ip", "Type": "string"},
            {"Name": "cs-method", "Type": "string"},
            {"Name": "cs-host", "Type": "string"},
            {"Name": "cs-uri-stem", "Type": "string"},
            {"Name": "sc-status", "Type": "int"},
            {"Name": "cs-referer", "Type": "string"},
            {"Name": "cs-user-agent", "Type": "string"},
            {"Name": "cs-uri-query", "Type": "string"},
            {"Name": "cs-cookie", "Type": "string"},
            {"Name": "x-edge-result-type", "Type": "string"},
            {"Name": "x-edge-request-id", "Type": "string"},
            {"Name": "x-host-header", "Type": "string"},
            {"Name": "cs-protocol", "Type": "string"},
            {"Name": "cs-bytes", "Type": "bigint"},
            {"Name": "time-taken", "Type": "double"},
            {"Name": "x-forwarded-for", "Type": "string"},
            {"Name": "ssl-protocol", "Type": "string"},
            {"Name": "ssl-cipher", "Type": "string"},
            {"Name": "x-edge-response-result-type", "Type": "string"},
            {"Name": "cs-protocol-version", "Type": "string"},
            {"Name": "fle-status", "Type": "string"},
            {"Name": "fle-encrypted-fields", "Type": "int"},
            {"Name": "c-port", "Type": "int"},
            {"Name": "time-to-first-byte", "Type": "double"},
            {"Name": "x-edge-detailed-result-type", "Type": "string"},
            {"Name": "sc-content-type", "Type": "string"},
            {"Name": "sc-content-len", "Type": "bigint"},
            {"Name": "sc-range-start", "Type": "bigint"},
            {"Name": "sc-range-end", "Type": "bigint"},
            {"Name": "enrichment", "Type": "string"},
        ]
        assert CLOUDFRONT_RAW.partition_keys == []
        assert CLOUDFRONT_RAW.partition_indexes == []
        assert CLOUDFRONT_RAW.partition_info == {}
        assert json.dumps(CLOUDFRONT_RAW.statements.create) == json.dumps(
            """CREATE EXTERNAL TABLE IF NOT EXISTS `{database}`.`{table_name}` (`date` date, `time` string, `x-edge-location` string, `sc-bytes` bigint, `c-ip` string, `cs-method` string, `cs-host` string, `cs-uri-stem` string, `sc-status` int, `cs-referer` string, `cs-user-agent` string, `cs-uri-query` string, `cs-cookie` string, `x-edge-result-type` string, `x-edge-request-id` string, `x-host-header` string, `cs-protocol` string, `cs-bytes` bigint, `time-taken` double, `x-forwarded-for` string, `ssl-protocol` string, `ssl-cipher` string, `x-edge-response-result-type` string, `cs-protocol-version` string, `fle-status` string, `fle-encrypted-fields` int, `c-port` int, `time-to-first-byte` double, `x-edge-detailed-result-type` string, `sc-content-type` string, `sc-content-len` bigint, `sc-range-start` bigint, `sc-range-end` bigint, `enrichment` string)  ROW FORMAT SERDE 'org.apache.hadoop.hive.serde2.lazy.LazySimpleSerDe' WITH SERDEPROPERTIES ('field.delim'='\t', 'line.delim'='\n') STORED AS INPUTFORMAT 'org.apache.hadoop.mapred.TextInputFormat' OUTPUTFORMAT 'org.apache.hadoop.hive.ql.io.HiveIgnoreKeyTextOutputFormat' LOCATION '{location}' TBLPROPERTIES ('skip.header.line.count'='2');"""
        )
        assert json.dumps(CLOUDFRONT_RAW.statements.insert) == json.dumps(
            """INSERT INTO \"{destination_database}\".\"{destination_table}\" (\"date\", \"time\", \"x-edge-location\", \"sc-bytes\", \"c-ip\", \"cs-method\", \"cs-host\", \"cs-uri-stem\", \"sc-status\", \"cs-referer\", \"cs-user-agent\", \"cs-uri-query\", \"cs-cookie\", \"x-edge-result-type\", \"x-edge-request-id\", \"x-host-header\", \"cs-protocol\", \"cs-bytes\", \"time-taken\", \"x-forwarded-for\", \"ssl-protocol\", \"ssl-cipher\", \"x-edge-response-result-type\", \"cs-protocol-version\", \"fle-status\", \"fle-encrypted-fields\", \"c-port\", \"time-to-first-byte\", \"x-edge-detailed-result-type\", \"sc-content-type\", \"sc-content-len\", \"sc-range-start\", \"sc-range-end\", \"enrichment\") SELECT \"date\", \"time\", \"x-edge-location\", \"sc-bytes\", \"c-ip\", \"cs-method\", \"cs-host\", \"cs-uri-stem\", \"sc-status\", \"cs-referer\", \"cs-user-agent\", \"cs-uri-query\", \"cs-cookie\", \"x-edge-result-type\", \"x-edge-request-id\", \"x-host-header\", \"cs-protocol\", \"cs-bytes\", \"time-taken\", \"x-forwarded-for\", \"ssl-protocol\", \"ssl-cipher\", \"x-edge-response-result-type\", \"cs-protocol-version\", \"fle-status\", \"fle-encrypted-fields\", \"c-port\", \"time-to-first-byte\", \"x-edge-detailed-result-type\", \"sc-content-type\", \"sc-content-len\", \"sc-range-start\", \"sc-range-end\", \"enrichment\" FROM \"{source_database}\".\"{source_table}\" ;"""
        )
        assert json.dumps(CLOUDFRONT_RAW.statements.drop) == json.dumps(
            """DROP TABLE IF EXISTS `{database}`.`{table_name}`"""
        )
        assert json.dumps(CLOUDFRONT_RAW.statements.aggregate) == json.dumps(
            """INSERT INTO \"{destination_database}\".\"{destination_table}\" (\"date\", \"time\", \"x-edge-location\", \"sc-bytes\", \"c-ip\", \"cs-method\", \"cs-host\", \"cs-uri-stem\", \"sc-status\", \"cs-referer\", \"cs-user-agent\", \"cs-uri-query\", \"cs-cookie\", \"x-edge-result-type\", \"x-edge-request-id\", \"x-host-header\", \"cs-protocol\", \"cs-bytes\", \"time-taken\", \"x-forwarded-for\", \"ssl-protocol\", \"ssl-cipher\", \"x-edge-response-result-type\", \"cs-protocol-version\", \"fle-status\", \"fle-encrypted-fields\", \"c-port\", \"time-to-first-byte\", \"x-edge-detailed-result-type\", \"sc-content-type\", \"sc-content-len\", \"sc-range-start\", \"sc-range-end\", \"enrichment\") SELECT \"date\", \"time\", \"x-edge-location\", \"sc-bytes\", \"c-ip\", \"cs-method\", \"cs-host\", \"cs-uri-stem\", \"sc-status\", \"cs-referer\", \"cs-user-agent\", \"cs-uri-query\", \"cs-cookie\", \"x-edge-result-type\", \"x-edge-request-id\", \"x-host-header\", \"cs-protocol\", \"cs-bytes\", \"time-taken\", \"x-forwarded-for\", \"ssl-protocol\", \"ssl-cipher\", \"x-edge-response-result-type\", \"cs-protocol-version\", \"fle-status\", \"fle-encrypted-fields\", \"c-port\", \"time-to-first-byte\", \"x-edge-detailed-result-type\", \"sc-content-type\", \"sc-content-len\", \"sc-range-start\", \"sc-range-end\", \"enrichment\" FROM \"{source_database}\".\"{source_table}\" WHERE __execution_name__ = '{execution_name}' GROUP BY \"date\", \"time\", \"x-edge-location\", \"sc-bytes\", \"c-ip\", \"cs-method\", \"cs-host\", \"cs-uri-stem\", \"sc-status\", \"cs-referer\", \"cs-user-agent\", \"cs-uri-query\", \"cs-cookie\", \"x-edge-result-type\", \"x-edge-request-id\", \"x-host-header\", \"cs-protocol\", \"cs-bytes\", \"time-taken\", \"x-forwarded-for\", \"ssl-protocol\", \"ssl-cipher\", \"x-edge-response-result-type\", \"cs-protocol-version\", \"fle-status\", \"fle-encrypted-fields\", \"c-port\", \"time-to-first-byte\", \"x-edge-detailed-result-type\", \"sc-content-type\", \"sc-content-len\", \"sc-range-start\", \"sc-range-end\", \"enrichment\";"""
        )

        assert CLOUDFRONT_PARQUET.columns == [
            {"Name": "time", "Type": "bigint"},
            {"Name": "timestamp", "Type": "timestamp"},
            {"Name": "x-edge-location", "Type": "string"},
            {"Name": "sc-bytes", "Type": "bigint"},
            {"Name": "c-ip", "Type": "string"},
            {"Name": "cs-method", "Type": "string"},
            {"Name": "cs-uri-stem", "Type": "string"},
            {"Name": "sc-status-group", "Type": "string"},
            {"Name": "sc-status", "Type": "int"},
            {"Name": "cs-referer", "Type": "string"},
            {"Name": "cs-user-agent", "Type": "string"},
            {"Name": "cs-uri-query", "Type": "string"},
            {"Name": "cs-cookie", "Type": "string"},
            {"Name": "x-edge-result-type", "Type": "string"},
            {"Name": "x-edge-request-id", "Type": "string"},
            {"Name": "x-host-header", "Type": "string"},
            {"Name": "cs-protocol", "Type": "string"},
            {"Name": "cs-bytes", "Type": "bigint"},
            {"Name": "time-taken-in-second", "Type": "int"},
            {"Name": "time-taken", "Type": "double"},
            {"Name": "x-forwarded-for", "Type": "string"},
            {"Name": "ssl-protocol", "Type": "string"},
            {"Name": "ssl-cipher", "Type": "string"},
            {"Name": "x-edge-response-result-type", "Type": "string"},
            {"Name": "cs-protocol-version", "Type": "string"},
            {"Name": "fle-status", "Type": "string"},
            {"Name": "fle-encrypted-fields", "Type": "int"},
            {"Name": "c-port", "Type": "int"},
            {"Name": "time-to-first-byte", "Type": "double"},
            {"Name": "x-edge-detailed-result-type", "Type": "string"},
            {"Name": "sc-content-type", "Type": "string"},
            {"Name": "sc-content-len", "Type": "bigint"},
            {"Name": "sc-range-start", "Type": "bigint"},
            {"Name": "sc-range-end", "Type": "bigint"},
            {"Name": "hit-cache", "Type": "boolean"},
            {"Name": "back-to-origin", "Type": "boolean"},
            {
                "Name": "enrichment",
                "Type": "struct<geo_iso_code:string,geo_country:string,geo_city:string,geo_location:string,ua_browser:string,ua_browser_version:string,ua_os:string,ua_os_version:string,ua_device:string,ua_category:string>",
            },
        ]
        assert CLOUDFRONT_PARQUET.partition_keys == [
            {"Name": "event_hour", "Type": "string"},
            {"Name": "cs-host", "Type": "string"},
            {"Name": "__execution_name__", "Type": "string"},
        ]
        assert CLOUDFRONT_PARQUET.partition_indexes == [
            {"IndexName": "IDX_EXECUTION_NAME", "Keys": ["__execution_name__"]},
            {"IndexName": "IDX_PARTITIONS", "Keys": ["event_hour", "cs-host"]},
        ]
        assert CLOUDFRONT_PARQUET.partition_info == collections.OrderedDict(
            [
                ("event_hour", {"type": "time", "from": "%Y%m%d%H", "to": "%Y%m%d00"}),
                ("cs-host", {"type": "retain"}),
                (
                    "__execution_name__",
                    {
                        "type": "default",
                        "value": "00000000-0000-0000-0000-000000000000",
                    },
                ),
            ]
        )
        assert json.dumps(CLOUDFRONT_PARQUET.statements.create) == json.dumps(
            """CREATE EXTERNAL TABLE IF NOT EXISTS `{database}`.`{table_name}` (`time` bigint, `timestamp` timestamp, `x-edge-location` string, `sc-bytes` bigint, `c-ip` string, `cs-method` string, `cs-host` string, `cs-uri-stem` string, `sc-status-group` string, `sc-status` int, `cs-referer` string, `cs-user-agent` string, `cs-uri-query` string, `cs-cookie` string, `x-edge-result-type` string, `x-edge-request-id` string, `x-host-header` string, `cs-protocol` string, `cs-bytes` bigint, `time-taken-in-second` int, `time-taken` double, `x-forwarded-for` string, `ssl-protocol` string, `ssl-cipher` string, `x-edge-response-result-type` string, `cs-protocol-version` string, `fle-status` string, `fle-encrypted-fields` int, `c-port` int, `time-to-first-byte` double, `x-edge-detailed-result-type` string, `sc-content-type` string, `sc-content-len` bigint, `sc-range-start` bigint, `sc-range-end` bigint, `hit-cache` boolean, `back-to-origin` boolean, `enrichment` struct<`geo_iso_code`:string,`geo_country`:string,`geo_city`:string,`geo_location`:string,`ua_browser`:string,`ua_browser_version`:string,`ua_os`:string,`ua_os_version`:string,`ua_device`:string,`ua_category`:string>, `event_hour` string, `__execution_name__` string) PARTITIONED BY (`event_hour` string, `cs-host` string, `__execution_name__` string) ROW FORMAT SERDE 'org.apache.hadoop.hive.ql.io.parquet.serde.ParquetHiveSerDe'  STORED AS INPUTFORMAT 'org.apache.hadoop.hive.ql.io.parquet.MapredParquetInputFormat' OUTPUTFORMAT 'org.apache.hadoop.hive.ql.io.parquet.MapredParquetOutputFormat' LOCATION '{location}' ;"""
        )
        assert json.dumps(CLOUDFRONT_PARQUET.statements.insert) == json.dumps(
            """INSERT INTO \"{destination_database}\".\"{destination_table}\" (\"time\", \"timestamp\", \"x-edge-location\", \"sc-bytes\", \"c-ip\", \"cs-method\", \"cs-host\", \"cs-uri-stem\", \"sc-status-group\", \"sc-status\", \"cs-referer\", \"cs-user-agent\", \"cs-uri-query\", \"cs-cookie\", \"x-edge-result-type\", \"x-edge-request-id\", \"x-host-header\", \"cs-protocol\", \"cs-bytes\", \"time-taken-in-second\", \"time-taken\", \"x-forwarded-for\", \"ssl-protocol\", \"ssl-cipher\", \"x-edge-response-result-type\", \"cs-protocol-version\", \"fle-status\", \"fle-encrypted-fields\", \"c-port\", \"time-to-first-byte\", \"x-edge-detailed-result-type\", \"sc-content-type\", \"sc-content-len\", \"sc-range-start\", \"sc-range-end\", \"hit-cache\", \"back-to-origin\", \"enrichment\", \"event_hour\", \"__execution_name__\") SELECT CAST(to_unixtime(from_iso8601_timestamp(concat(CAST(date AS varchar), 'T', \"time\", 'Z'))) * 1000 AS bigint), from_iso8601_timestamp(concat(CAST(\"date\" AS varchar), 'T', \"time\", 'Z')), \"x-edge-location\", \"sc-bytes\", \"c-ip\", \"cs-method\", \"cs-host\", \"cs-uri-stem\", CASE WHEN \"sc-status\" BETWEEN 100 AND 199 THEN '1xx' WHEN \"sc-status\" BETWEEN 200 AND 299 THEN '2xx' WHEN \"sc-status\" BETWEEN 300 AND 399 THEN '3xx' WHEN \"sc-status\" BETWEEN 400 AND 499 THEN '4xx' WHEN \"sc-status\" BETWEEN 500 AND 599 THEN '5xx' ELSE '-' END, \"sc-status\", \"cs-referer\", url_decode(\"cs-user-agent\"), \"cs-uri-query\", \"cs-cookie\", \"x-edge-result-type\", \"x-edge-request-id\", \"x-host-header\", \"cs-protocol\", \"cs-bytes\", cast(floor(\"time-taken\") as integer), \"time-taken\", \"x-forwarded-for\", \"ssl-protocol\", \"ssl-cipher\", \"x-edge-response-result-type\", \"cs-protocol-version\", \"fle-status\", \"fle-encrypted-fields\", \"c-port\", \"time-to-first-byte\", \"x-edge-detailed-result-type\", \"sc-content-type\", \"sc-content-len\", \"sc-range-start\", \"sc-range-end\", CASE WHEN \"x-edge-result-type\" like '%Hit' THEN true ELSE false END, CASE WHEN (\"x-edge-detailed-result-type\" = 'Miss' OR (\"x-edge-detailed-result-type\" like '%Origin%' AND \"x-edge-detailed-result-type\" <> 'OriginShieldHit')) THEN true ELSE false END, CAST(ROW(json_extract_scalar(\"enrichment\", '$.geo_iso_code'), json_extract_scalar(\"enrichment\", '$.geo_country'), json_extract_scalar(\"enrichment\", '$.geo_city'), json_extract_scalar(\"enrichment\", '$.geo_location'), json_extract_scalar(\"enrichment\", '$.ua_browser'), json_extract_scalar(\"enrichment\", '$.ua_browser_version'), json_extract_scalar(\"enrichment\", '$.ua_os'), json_extract_scalar(\"enrichment\", '$.ua_os_version'), json_extract_scalar(\"enrichment\", '$.ua_device'), json_extract_scalar(\"enrichment\", '$.ua_category')) AS ROW(geo_iso_code varchar, geo_country varchar, geo_city varchar, geo_location varchar, ua_browser varchar, ua_browser_version varchar, ua_os varchar, ua_os_version varchar, ua_device varchar, ua_category varchar)), date_format(from_iso8601_timestamp(concat(CAST(\"date\" AS varchar), 'T', \"time\", 'Z')), '%Y%m%d%H'), '{{}}' FROM \"{source_database}\".\"{source_table}\" ;"""
        )
        assert json.dumps(CLOUDFRONT_PARQUET.statements.drop) == json.dumps(
            """DROP TABLE IF EXISTS `{database}`.`{table_name}`"""
        )
        assert json.dumps(CLOUDFRONT_PARQUET.statements.aggregate) == json.dumps(
            """INSERT INTO \"{destination_database}\".\"{destination_table}\" (\"time\", \"timestamp\", \"x-edge-location\", \"sc-bytes\", \"c-ip\", \"cs-method\", \"cs-host\", \"cs-uri-stem\", \"sc-status-group\", \"sc-status\", \"cs-referer\", \"cs-user-agent\", \"cs-uri-query\", \"cs-cookie\", \"x-edge-result-type\", \"x-edge-request-id\", \"x-host-header\", \"cs-protocol\", \"cs-bytes\", \"time-taken-in-second\", \"time-taken\", \"x-forwarded-for\", \"ssl-protocol\", \"ssl-cipher\", \"x-edge-response-result-type\", \"cs-protocol-version\", \"fle-status\", \"fle-encrypted-fields\", \"c-port\", \"time-to-first-byte\", \"x-edge-detailed-result-type\", \"sc-content-type\", \"sc-content-len\", \"sc-range-start\", \"sc-range-end\", \"hit-cache\", \"back-to-origin\", \"enrichment\", \"event_hour\", \"__execution_name__\") SELECT CAST(to_unixtime(from_iso8601_timestamp(concat(CAST(date AS varchar), 'T', \"time\", 'Z'))) * 1000 AS bigint), from_iso8601_timestamp(concat(CAST(\"date\" AS varchar), 'T', \"time\", 'Z')), \"x-edge-location\", \"sc-bytes\", \"c-ip\", \"cs-method\", \"cs-host\", \"cs-uri-stem\", CASE WHEN \"sc-status\" BETWEEN 100 AND 199 THEN '1xx' WHEN \"sc-status\" BETWEEN 200 AND 299 THEN '2xx' WHEN \"sc-status\" BETWEEN 300 AND 399 THEN '3xx' WHEN \"sc-status\" BETWEEN 400 AND 499 THEN '4xx' WHEN \"sc-status\" BETWEEN 500 AND 599 THEN '5xx' ELSE '-' END, \"sc-status\", \"cs-referer\", url_decode(\"cs-user-agent\"), \"cs-uri-query\", \"cs-cookie\", \"x-edge-result-type\", \"x-edge-request-id\", \"x-host-header\", \"cs-protocol\", \"cs-bytes\", cast(floor(\"time-taken\") as integer), \"time-taken\", \"x-forwarded-for\", \"ssl-protocol\", \"ssl-cipher\", \"x-edge-response-result-type\", \"cs-protocol-version\", \"fle-status\", \"fle-encrypted-fields\", \"c-port\", \"time-to-first-byte\", \"x-edge-detailed-result-type\", \"sc-content-type\", \"sc-content-len\", \"sc-range-start\", \"sc-range-end\", CASE WHEN \"x-edge-result-type\" like '%Hit' THEN true ELSE false END, CASE WHEN (\"x-edge-detailed-result-type\" = 'Miss' OR (\"x-edge-detailed-result-type\" like '%Origin%' AND \"x-edge-detailed-result-type\" <> 'OriginShieldHit')) THEN true ELSE false END, CAST(ROW(json_extract_scalar(\"enrichment\", '$.geo_iso_code'), json_extract_scalar(\"enrichment\", '$.geo_country'), json_extract_scalar(\"enrichment\", '$.geo_city'), json_extract_scalar(\"enrichment\", '$.geo_location'), json_extract_scalar(\"enrichment\", '$.ua_browser'), json_extract_scalar(\"enrichment\", '$.ua_browser_version'), json_extract_scalar(\"enrichment\", '$.ua_os'), json_extract_scalar(\"enrichment\", '$.ua_os_version'), json_extract_scalar(\"enrichment\", '$.ua_device'), json_extract_scalar(\"enrichment\", '$.ua_category')) AS ROW(geo_iso_code varchar, geo_country varchar, geo_city varchar, geo_location varchar, ua_browser varchar, ua_browser_version varchar, ua_os varchar, ua_os_version varchar, ua_device varchar, ua_category varchar)), date_format(from_iso8601_timestamp(concat(CAST(\"date\" AS varchar), 'T', \"time\", 'Z')), '%Y%m%d%H'), '{{}}' FROM \"{source_database}\".\"{source_table}\" WHERE __execution_name__ = '{execution_name}' GROUP BY CAST(to_unixtime(from_iso8601_timestamp(concat(CAST(date AS varchar), 'T', \"time\", 'Z'))) * 1000 AS bigint), from_iso8601_timestamp(concat(CAST(\"date\" AS varchar), 'T', \"time\", 'Z')), \"x-edge-location\", \"sc-bytes\", \"c-ip\", \"cs-method\", \"cs-host\", \"cs-uri-stem\", CASE WHEN \"sc-status\" BETWEEN 100 AND 199 THEN '1xx' WHEN \"sc-status\" BETWEEN 200 AND 299 THEN '2xx' WHEN \"sc-status\" BETWEEN 300 AND 399 THEN '3xx' WHEN \"sc-status\" BETWEEN 400 AND 499 THEN '4xx' WHEN \"sc-status\" BETWEEN 500 AND 599 THEN '5xx' ELSE '-' END, \"sc-status\", \"cs-referer\", url_decode(\"cs-user-agent\"), \"cs-uri-query\", \"cs-cookie\", \"x-edge-result-type\", \"x-edge-request-id\", \"x-host-header\", \"cs-protocol\", \"cs-bytes\", cast(floor(\"time-taken\") as integer), \"time-taken\", \"x-forwarded-for\", \"ssl-protocol\", \"ssl-cipher\", \"x-edge-response-result-type\", \"cs-protocol-version\", \"fle-status\", \"fle-encrypted-fields\", \"c-port\", \"time-to-first-byte\", \"x-edge-detailed-result-type\", \"sc-content-type\", \"sc-content-len\", \"sc-range-start\", \"sc-range-end\", CASE WHEN \"x-edge-result-type\" like '%Hit' THEN true ELSE false END, CASE WHEN (\"x-edge-detailed-result-type\" = 'Miss' OR (\"x-edge-detailed-result-type\" like '%Origin%' AND \"x-edge-detailed-result-type\" <> 'OriginShieldHit')) THEN true ELSE false END, CAST(ROW(json_extract_scalar(\"enrichment\", '$.geo_iso_code'), json_extract_scalar(\"enrichment\", '$.geo_country'), json_extract_scalar(\"enrichment\", '$.geo_city'), json_extract_scalar(\"enrichment\", '$.geo_location'), json_extract_scalar(\"enrichment\", '$.ua_browser'), json_extract_scalar(\"enrichment\", '$.ua_browser_version'), json_extract_scalar(\"enrichment\", '$.ua_os'), json_extract_scalar(\"enrichment\", '$.ua_os_version'), json_extract_scalar(\"enrichment\", '$.ua_device'), json_extract_scalar(\"enrichment\", '$.ua_category')) AS ROW(geo_iso_code varchar, geo_country varchar, geo_city varchar, geo_location varchar, ua_browser varchar, ua_browser_version varchar, ua_os varchar, ua_os_version varchar, ua_device varchar, ua_category varchar)), date_format(from_iso8601_timestamp(concat(CAST(\"date\" AS varchar), 'T', \"time\", 'Z')), '%Y%m%d%H'), '{{}}';"""
        )

        assert CLOUDFRONT_METRICS.columns == [
            {"Name": "time", "Type": "bigint"},
            {"Name": "timestamp", "Type": "timestamp"},
            {"Name": "c-ip", "Type": "string"},
            {"Name": "cs-method", "Type": "string"},
            {"Name": "x-host-header", "Type": "string"},
            {"Name": "cs-protocol-version", "Type": "string"},
            {"Name": "cs-uri-stem", "Type": "string"},
            {"Name": "sc-status-group", "Type": "string"},
            {"Name": "sc-status", "Type": "int"},
            {"Name": "cs-protocol", "Type": "string"},
            {"Name": "time-taken-in-second", "Type": "int"},
            {"Name": "ssl-protocol", "Type": "string"},
            {"Name": "x-edge-location", "Type": "string"},
            {"Name": "x-edge-result-type", "Type": "string"},
            {"Name": "x-edge-response-result-type", "Type": "string"},
            {"Name": "x-edge-detailed-result-type", "Type": "string"},
            {"Name": "hit-cache", "Type": "boolean"},
            {"Name": "back-to-origin", "Type": "boolean"},
            {"Name": "ua_os", "Type": "string"},
            {"Name": "ua_device", "Type": "string"},
            {"Name": "ua_browser", "Type": "string"},
            {"Name": "ua_category", "Type": "string"},
            {"Name": "geo_iso_code", "Type": "string"},
            {"Name": "geo_country", "Type": "string"},
            {"Name": "geo_city", "Type": "string"},
            {"Name": "time-taken", "Type": "double"},
            {"Name": "time-to-first-byte", "Type": "double"},
            {"Name": "cs-bytes", "Type": "double"},
            {"Name": "sc-bytes", "Type": "double"},
            {"Name": "requests", "Type": "bigint"},
        ]
        assert CLOUDFRONT_METRICS.partition_keys == [
            {"Name": "event_hour", "Type": "string"},
            {"Name": "cs-host", "Type": "string"},
            {"Name": "__execution_name__", "Type": "string"},
        ]
        assert CLOUDFRONT_METRICS.partition_indexes == [
            {"IndexName": "IDX_EXECUTION_NAME", "Keys": ["__execution_name__"]},
            {"IndexName": "IDX_PARTITIONS", "Keys": ["event_hour", "cs-host"]},
        ]
        assert CLOUDFRONT_METRICS.partition_info == collections.OrderedDict(
            [
                ("event_hour", {"type": "time", "from": "%Y%m%d%H", "to": "%Y%m%d00"}),
                ("cs-host", {"type": "retain"}),
                (
                    "__execution_name__",
                    {
                        "type": "default",
                        "value": "00000000-0000-0000-0000-000000000000",
                    },
                ),
            ]
        )
        assert json.dumps(CLOUDFRONT_METRICS.statements.create) == json.dumps(
            """CREATE EXTERNAL TABLE IF NOT EXISTS `{database}`.`{table_name}` (`time` bigint, `timestamp` timestamp, `c-ip` string, `cs-method` string, `cs-host` string, `x-host-header` string, `cs-protocol-version` string, `cs-uri-stem` string, `sc-status-group` string, `sc-status` int, `cs-protocol` string, `time-taken-in-second` int, `ssl-protocol` string, `x-edge-location` string, `x-edge-result-type` string, `x-edge-response-result-type` string, `x-edge-detailed-result-type` string, `hit-cache` boolean, `back-to-origin` boolean, `ua_os` string, `ua_device` string, `ua_browser` string, `ua_category` string, `geo_iso_code` string, `geo_country` string, `geo_city` string, `time-taken` double, `time-to-first-byte` double, `cs-bytes` double, `sc-bytes` double, `requests` bigint, `event_hour` string, `__execution_name__` string) PARTITIONED BY (`event_hour` string, `cs-host` string, `__execution_name__` string) ROW FORMAT SERDE 'org.apache.hadoop.hive.ql.io.parquet.serde.ParquetHiveSerDe'  STORED AS INPUTFORMAT 'org.apache.hadoop.hive.ql.io.parquet.MapredParquetInputFormat' OUTPUTFORMAT 'org.apache.hadoop.hive.ql.io.parquet.MapredParquetOutputFormat' LOCATION '{location}' ;"""
        )
        assert json.dumps(CLOUDFRONT_METRICS.statements.insert) == json.dumps(
            """INSERT INTO \"{destination_database}\".\"{destination_table}\" (\"time\", \"timestamp\", \"c-ip\", \"cs-method\", \"cs-host\", \"x-host-header\", \"cs-protocol-version\", \"cs-uri-stem\", \"sc-status-group\", \"sc-status\", \"cs-protocol\", \"time-taken-in-second\", \"ssl-protocol\", \"x-edge-location\", \"x-edge-result-type\", \"x-edge-response-result-type\", \"x-edge-detailed-result-type\", \"hit-cache\", \"back-to-origin\", \"ua_os\", \"ua_device\", \"ua_browser\", \"ua_category\", \"geo_iso_code\", \"geo_country\", \"geo_city\", \"time-taken\", \"time-to-first-byte\", \"cs-bytes\", \"sc-bytes\", \"requests\", \"event_hour\", \"__execution_name__\") SELECT FLOOR(\"time\" / 60000) * 60000, DATE_TRUNC('minute', \"timestamp\"), \"c-ip\", \"cs-method\", \"cs-host\", \"x-host-header\", \"cs-protocol-version\", \"cs-uri-stem\", \"sc-status-group\", \"sc-status\", \"cs-protocol\", \"time-taken-in-second\", \"ssl-protocol\", \"x-edge-location\", \"x-edge-result-type\", \"x-edge-response-result-type\", \"x-edge-detailed-result-type\", \"hit-cache\", \"back-to-origin\", \"enrichment\".\"ua_os\", \"enrichment\".\"ua_device\", \"enrichment\".\"ua_browser\", \"enrichment\".\"ua_category\", \"enrichment\".\"geo_iso_code\", \"enrichment\".\"geo_country\", \"enrichment\".\"geo_city\", cast(sum(\"time-taken\") as double), cast(sum(\"time-to-first-byte\") as double), cast(sum(\"cs-bytes\") as double), cast(sum(\"sc-bytes\") as double), cast(count(1) as bigint), \"event_hour\", \"__execution_name__\" FROM \"{source_database}\".\"{source_table}\" ;"""
        )
        assert json.dumps(CLOUDFRONT_METRICS.statements.drop) == json.dumps(
            """DROP TABLE IF EXISTS `{database}`.`{table_name}`"""
        )
        assert json.dumps(CLOUDFRONT_METRICS.statements.aggregate) == json.dumps(
            """INSERT INTO \"{destination_database}\".\"{destination_table}\" (\"time\", \"timestamp\", \"c-ip\", \"cs-method\", \"cs-host\", \"x-host-header\", \"cs-protocol-version\", \"cs-uri-stem\", \"sc-status-group\", \"sc-status\", \"cs-protocol\", \"time-taken-in-second\", \"ssl-protocol\", \"x-edge-location\", \"x-edge-result-type\", \"x-edge-response-result-type\", \"x-edge-detailed-result-type\", \"hit-cache\", \"back-to-origin\", \"ua_os\", \"ua_device\", \"ua_browser\", \"ua_category\", \"geo_iso_code\", \"geo_country\", \"geo_city\", \"time-taken\", \"time-to-first-byte\", \"cs-bytes\", \"sc-bytes\", \"requests\", \"event_hour\", \"__execution_name__\") SELECT FLOOR(\"time\" / 60000) * 60000, DATE_TRUNC('minute', \"timestamp\"), \"c-ip\", \"cs-method\", \"cs-host\", \"x-host-header\", \"cs-protocol-version\", \"cs-uri-stem\", \"sc-status-group\", \"sc-status\", \"cs-protocol\", \"time-taken-in-second\", \"ssl-protocol\", \"x-edge-location\", \"x-edge-result-type\", \"x-edge-response-result-type\", \"x-edge-detailed-result-type\", \"hit-cache\", \"back-to-origin\", \"enrichment\".\"ua_os\", \"enrichment\".\"ua_device\", \"enrichment\".\"ua_browser\", \"enrichment\".\"ua_category\", \"enrichment\".\"geo_iso_code\", \"enrichment\".\"geo_country\", \"enrichment\".\"geo_city\", cast(sum(\"time-taken\") as double), cast(sum(\"time-to-first-byte\") as double), cast(sum(\"cs-bytes\") as double), cast(sum(\"sc-bytes\") as double), cast(count(1) as bigint), \"event_hour\", \"__execution_name__\" FROM \"{source_database}\".\"{source_table}\" WHERE __execution_name__ = '{execution_name}' GROUP BY FLOOR(\"time\" / 60000) * 60000, DATE_TRUNC('minute', \"timestamp\"), \"c-ip\", \"cs-method\", \"cs-host\", \"x-host-header\", \"cs-protocol-version\", \"cs-uri-stem\", \"sc-status-group\", \"sc-status\", \"cs-protocol\", \"time-taken-in-second\", \"ssl-protocol\", \"x-edge-location\", \"x-edge-result-type\", \"x-edge-response-result-type\", \"x-edge-detailed-result-type\", \"hit-cache\", \"back-to-origin\", \"enrichment\".\"ua_os\", \"enrichment\".\"ua_device\", \"enrichment\".\"ua_browser\", \"enrichment\".\"ua_category\", \"enrichment\".\"geo_iso_code\", \"enrichment\".\"geo_country\", \"enrichment\".\"geo_city\", \"event_hour\", \"__execution_name__\";"""
        )

    def test_alb(
        self,
    ):
        from utils.aws.glue.table import TableMetaData
        from pipeline_resources_builder.logschema import (
            ALB_RAW,
            ALB_PARQUET,
            ALB_METRICS,
        )

        assert isinstance(ALB_RAW, TableMetaData) is True
        assert isinstance(ALB_PARQUET, TableMetaData) is True
        assert isinstance(ALB_METRICS, TableMetaData) is True

        assert ALB_RAW.columns == [
            {"Name": "type", "Type": "string"},
            {"Name": "time", "Type": "string"},
            {"Name": "elb", "Type": "string"},
            {"Name": "client_ip", "Type": "string"},
            {"Name": "client_port", "Type": "int"},
            {"Name": "target_ip", "Type": "string"},
            {"Name": "target_port", "Type": "int"},
            {"Name": "request_processing_time", "Type": "double"},
            {"Name": "target_processing_time", "Type": "double"},
            {"Name": "response_processing_time", "Type": "double"},
            {"Name": "elb_status_code", "Type": "int"},
            {"Name": "target_status_code", "Type": "string"},
            {"Name": "received_bytes", "Type": "double"},
            {"Name": "sent_bytes", "Type": "double"},
            {"Name": "request_verb", "Type": "string"},
            {"Name": "request_url", "Type": "string"},
            {"Name": "request_proto", "Type": "string"},
            {"Name": "user_agent", "Type": "string"},
            {"Name": "ssl_cipher", "Type": "string"},
            {"Name": "ssl_protocol", "Type": "string"},
            {"Name": "target_group_arn", "Type": "string"},
            {"Name": "trace_id", "Type": "string"},
            {"Name": "domain_name", "Type": "string"},
            {"Name": "chosen_cert_arn", "Type": "string"},
            {"Name": "matched_rule_priority", "Type": "string"},
            {"Name": "request_creation_time", "Type": "string"},
            {"Name": "actions_executed", "Type": "string"},
            {"Name": "redirect_url", "Type": "string"},
            {"Name": "lambda_error_reason", "Type": "string"},
            {"Name": "target_port_list", "Type": "string"},
            {"Name": "target_status_code_list", "Type": "string"},
            {"Name": "classification", "Type": "string"},
            {"Name": "classification_reason", "Type": "string"},
            {"Name": "conn_trace_id", "Type": "string"},
            {"Name": "enrichment", "Type": "string"},
        ]
        assert ALB_RAW.partition_keys == []
        assert ALB_RAW.partition_indexes == []
        assert ALB_RAW.partition_info == {}
        assert json.dumps(ALB_RAW.statements.create) == json.dumps(
            """CREATE EXTERNAL TABLE IF NOT EXISTS `{database}`.`{table_name}` (`type` string, `time` string, `elb` string, `client_ip` string, `client_port` int, `target_ip` string, `target_port` int, `request_processing_time` double, `target_processing_time` double, `response_processing_time` double, `elb_status_code` int, `target_status_code` string, `received_bytes` double, `sent_bytes` double, `request_verb` string, `request_url` string, `request_proto` string, `user_agent` string, `ssl_cipher` string, `ssl_protocol` string, `target_group_arn` string, `trace_id` string, `domain_name` string, `chosen_cert_arn` string, `matched_rule_priority` string, `request_creation_time` string, `actions_executed` string, `redirect_url` string, `lambda_error_reason` string, `target_port_list` string, `target_status_code_list` string, `classification` string, `classification_reason` string, `conn_trace_id` string, `enrichment` string)  ROW FORMAT SERDE 'org.apache.hadoop.hive.serde2.RegexSerDe' WITH SERDEPROPERTIES ('input.regex'='^([^ ]*) ([^ ]*) ([^ ]*) ([^ ]*):([0-9]*) ([^ ]*)[:-]([0-9]*) ([-.0-9]*) ([-.0-9]*) ([-.0-9]*) (|[-0-9]*) (-|[-0-9]*) ([-0-9]*) ([-0-9]*) \"([^ ]*) (.*) (- |[^ ]*)\" \"([^\"]*)\" ([A-Z0-9-_]+) ([A-Za-z0-9.-]*) ([^ ]*) \"([^\"]*)\" \"([^\"]*)\" \"([^\"]*)\" ([-.0-9]*) ([^ ]*) \"([^\"]*)\" \"([^\"]*)\" \"([^ ]*)\" \"([^ ]+?)\" \"([^ ]+)\" \"([^ ]*)\" \"([^ ]*)\" ?(TID_[A-Za-z0-9.-]+)? ?(?:[^\\\\u007B]+?)? ?(\\\\u007B.*\\\\u007D)?$') STORED AS INPUTFORMAT 'org.apache.hadoop.mapred.TextInputFormat' OUTPUTFORMAT 'org.apache.hadoop.hive.ql.io.HiveIgnoreKeyTextOutputFormat' LOCATION '{location}' ;"""
        )
        assert json.dumps(ALB_RAW.statements.insert) == json.dumps(
            """INSERT INTO \"{destination_database}\".\"{destination_table}\" (\"type\", \"time\", \"elb\", \"client_ip\", \"client_port\", \"target_ip\", \"target_port\", \"request_processing_time\", \"target_processing_time\", \"response_processing_time\", \"elb_status_code\", \"target_status_code\", \"received_bytes\", \"sent_bytes\", \"request_verb\", \"request_url\", \"request_proto\", \"user_agent\", \"ssl_cipher\", \"ssl_protocol\", \"target_group_arn\", \"trace_id\", \"domain_name\", \"chosen_cert_arn\", \"matched_rule_priority\", \"request_creation_time\", \"actions_executed\", \"redirect_url\", \"lambda_error_reason\", \"target_port_list\", \"target_status_code_list\", \"classification\", \"classification_reason\", \"conn_trace_id\", \"enrichment\") SELECT \"type\", \"time\", \"elb\", \"client_ip\", \"client_port\", \"target_ip\", \"target_port\", \"request_processing_time\", \"target_processing_time\", \"response_processing_time\", \"elb_status_code\", \"target_status_code\", \"received_bytes\", \"sent_bytes\", \"request_verb\", \"request_url\", \"request_proto\", \"user_agent\", \"ssl_cipher\", \"ssl_protocol\", \"target_group_arn\", \"trace_id\", \"domain_name\", \"chosen_cert_arn\", \"matched_rule_priority\", \"request_creation_time\", \"actions_executed\", \"redirect_url\", \"lambda_error_reason\", \"target_port_list\", \"target_status_code_list\", \"classification\", \"classification_reason\", \"conn_trace_id\", \"enrichment\" FROM \"{source_database}\".\"{source_table}\" ;"""
        )
        assert json.dumps(ALB_RAW.statements.drop) == json.dumps(
            """DROP TABLE IF EXISTS `{database}`.`{table_name}`"""
        )
        assert json.dumps(ALB_RAW.statements.aggregate) == json.dumps(
            """INSERT INTO \"{destination_database}\".\"{destination_table}\" (\"type\", \"time\", \"elb\", \"client_ip\", \"client_port\", \"target_ip\", \"target_port\", \"request_processing_time\", \"target_processing_time\", \"response_processing_time\", \"elb_status_code\", \"target_status_code\", \"received_bytes\", \"sent_bytes\", \"request_verb\", \"request_url\", \"request_proto\", \"user_agent\", \"ssl_cipher\", \"ssl_protocol\", \"target_group_arn\", \"trace_id\", \"domain_name\", \"chosen_cert_arn\", \"matched_rule_priority\", \"request_creation_time\", \"actions_executed\", \"redirect_url\", \"lambda_error_reason\", \"target_port_list\", \"target_status_code_list\", \"classification\", \"classification_reason\", \"conn_trace_id\", \"enrichment\") SELECT \"type\", \"time\", \"elb\", \"client_ip\", \"client_port\", \"target_ip\", \"target_port\", \"request_processing_time\", \"target_processing_time\", \"response_processing_time\", \"elb_status_code\", \"target_status_code\", \"received_bytes\", \"sent_bytes\", \"request_verb\", \"request_url\", \"request_proto\", \"user_agent\", \"ssl_cipher\", \"ssl_protocol\", \"target_group_arn\", \"trace_id\", \"domain_name\", \"chosen_cert_arn\", \"matched_rule_priority\", \"request_creation_time\", \"actions_executed\", \"redirect_url\", \"lambda_error_reason\", \"target_port_list\", \"target_status_code_list\", \"classification\", \"classification_reason\", \"conn_trace_id\", \"enrichment\" FROM \"{source_database}\".\"{source_table}\" WHERE __execution_name__ = '{execution_name}' GROUP BY \"type\", \"time\", \"elb\", \"client_ip\", \"client_port\", \"target_ip\", \"target_port\", \"request_processing_time\", \"target_processing_time\", \"response_processing_time\", \"elb_status_code\", \"target_status_code\", \"received_bytes\", \"sent_bytes\", \"request_verb\", \"request_url\", \"request_proto\", \"user_agent\", \"ssl_cipher\", \"ssl_protocol\", \"target_group_arn\", \"trace_id\", \"domain_name\", \"chosen_cert_arn\", \"matched_rule_priority\", \"request_creation_time\", \"actions_executed\", \"redirect_url\", \"lambda_error_reason\", \"target_port_list\", \"target_status_code_list\", \"classification\", \"classification_reason\", \"conn_trace_id\", \"enrichment\";"""
        )

        assert ALB_PARQUET.columns == [
            {"Name": "time", "Type": "bigint"},
            {"Name": "timestamp", "Type": "timestamp"},
            {"Name": "type", "Type": "string"},
            {"Name": "client_ip", "Type": "string"},
            {"Name": "client_port", "Type": "int"},
            {"Name": "target_ip", "Type": "string"},
            {"Name": "target_port", "Type": "int"},
            {"Name": "request_processing_time", "Type": "double"},
            {"Name": "target_processing_time", "Type": "double"},
            {"Name": "response_processing_time", "Type": "double"},
            {"Name": "elb_status_code_group", "Type": "string"},
            {"Name": "elb_status_code", "Type": "int"},
            {"Name": "target_status_code", "Type": "string"},
            {"Name": "received_bytes", "Type": "double"},
            {"Name": "sent_bytes", "Type": "double"},
            {"Name": "request_verb", "Type": "string"},
            {"Name": "request_url", "Type": "string"},
            {"Name": "request_host", "Type": "string"},
            {"Name": "request_path", "Type": "string"},
            {"Name": "request_proto", "Type": "string"},
            {"Name": "user_agent", "Type": "string"},
            {"Name": "ssl_cipher", "Type": "string"},
            {"Name": "ssl_protocol", "Type": "string"},
            {"Name": "target_group_arn", "Type": "string"},
            {"Name": "trace_id", "Type": "string"},
            {"Name": "domain_name", "Type": "string"},
            {"Name": "chosen_cert_arn", "Type": "string"},
            {"Name": "matched_rule_priority", "Type": "string"},
            {"Name": "request_creation_time", "Type": "string"},
            {"Name": "actions_executed", "Type": "string"},
            {"Name": "redirect_url", "Type": "string"},
            {"Name": "lambda_error_reason", "Type": "string"},
            {"Name": "target_port_list", "Type": "string"},
            {"Name": "target_status_code_list", "Type": "string"},
            {"Name": "classification", "Type": "string"},
            {"Name": "classification_reason", "Type": "string"},
            {"Name": "conn_trace_id", "Type": "string"},
            {
                "Name": "enrichment",
                "Type": "struct<geo_iso_code:string,geo_country:string,geo_city:string,geo_location:string,ua_browser:string,ua_browser_version:string,ua_os:string,ua_os_version:string,ua_device:string,ua_category:string>",
            },
        ]

        assert ALB_PARQUET.partition_keys == [
            {"Name": "event_hour", "Type": "string"},
            {"Name": "elb", "Type": "string"},
            {"Name": "__execution_name__", "Type": "string"},
        ]
        assert ALB_PARQUET.partition_indexes == [
            {"IndexName": "IDX_EXECUTION_NAME", "Keys": ["__execution_name__"]},
            {"IndexName": "IDX_PARTITIONS", "Keys": ["event_hour", "elb"]},
        ]
        assert ALB_PARQUET.partition_info == collections.OrderedDict(
            [
                ("event_hour", {"type": "time", "from": "%Y%m%d%H", "to": "%Y%m%d00"}),
                ("elb", {"type": "retain"}),
                (
                    "__execution_name__",
                    {
                        "type": "default",
                        "value": "00000000-0000-0000-0000-000000000000",
                    },
                ),
            ]
        )
        assert json.dumps(ALB_PARQUET.statements.create) == json.dumps(
            """CREATE EXTERNAL TABLE IF NOT EXISTS `{database}`.`{table_name}` (`time` bigint, `timestamp` timestamp, `type` string, `elb` string, `client_ip` string, `client_port` int, `target_ip` string, `target_port` int, `request_processing_time` double, `target_processing_time` double, `response_processing_time` double, `elb_status_code_group` string, `elb_status_code` int, `target_status_code` string, `received_bytes` double, `sent_bytes` double, `request_verb` string, `request_url` string, `request_host` string, `request_path` string, `request_proto` string, `user_agent` string, `ssl_cipher` string, `ssl_protocol` string, `target_group_arn` string, `trace_id` string, `domain_name` string, `chosen_cert_arn` string, `matched_rule_priority` string, `request_creation_time` string, `actions_executed` string, `redirect_url` string, `lambda_error_reason` string, `target_port_list` string, `target_status_code_list` string, `classification` string, `classification_reason` string, `conn_trace_id` string, `enrichment` struct<`geo_iso_code`:string,`geo_country`:string,`geo_city`:string,`geo_location`:string,`ua_browser`:string,`ua_browser_version`:string,`ua_os`:string,`ua_os_version`:string,`ua_device`:string,`ua_category`:string>, `event_hour` string, `__execution_name__` string) PARTITIONED BY (`event_hour` string, `elb` string, `__execution_name__` string) ROW FORMAT SERDE 'org.apache.hadoop.hive.ql.io.parquet.serde.ParquetHiveSerDe'  STORED AS INPUTFORMAT 'org.apache.hadoop.hive.ql.io.parquet.MapredParquetInputFormat' OUTPUTFORMAT 'org.apache.hadoop.hive.ql.io.parquet.MapredParquetOutputFormat' LOCATION '{location}' ;"""
        )
        assert json.dumps(ALB_PARQUET.statements.insert) == json.dumps(
            """INSERT INTO \"{destination_database}\".\"{destination_table}\" (\"time\", \"timestamp\", \"type\", \"elb\", \"client_ip\", \"client_port\", \"target_ip\", \"target_port\", \"request_processing_time\", \"target_processing_time\", \"response_processing_time\", \"elb_status_code_group\", \"elb_status_code\", \"target_status_code\", \"received_bytes\", \"sent_bytes\", \"request_verb\", \"request_url\", \"request_host\", \"request_path\", \"request_proto\", \"user_agent\", \"ssl_cipher\", \"ssl_protocol\", \"target_group_arn\", \"trace_id\", \"domain_name\", \"chosen_cert_arn\", \"matched_rule_priority\", \"request_creation_time\", \"actions_executed\", \"redirect_url\", \"lambda_error_reason\", \"target_port_list\", \"target_status_code_list\", \"classification\", \"classification_reason\", \"conn_trace_id\", \"enrichment\", \"event_hour\", \"__execution_name__\") SELECT CAST(to_unixtime(from_iso8601_timestamp(\"time\")) * 1000 AS bigint), from_iso8601_timestamp(\"time\"), \"type\", \"elb\", \"client_ip\", \"client_port\", \"target_ip\", \"target_port\", \"request_processing_time\", \"target_processing_time\", \"response_processing_time\", CASE WHEN elb_status_code BETWEEN 100 AND 199 THEN '1xx' WHEN elb_status_code BETWEEN 200 AND 299 THEN '2xx' WHEN elb_status_code BETWEEN 300 AND 399 THEN '3xx' WHEN elb_status_code BETWEEN 400 AND 499 THEN '4xx' WHEN elb_status_code BETWEEN 500 AND 599 THEN '5xx' ELSE '-' END, \"elb_status_code\", \"target_status_code\", \"received_bytes\", \"sent_bytes\", \"request_verb\", \"request_url\", url_extract_host(\"request_url\"), url_extract_path(\"request_url\"), \"request_proto\", \"user_agent\", \"ssl_cipher\", \"ssl_protocol\", \"target_group_arn\", \"trace_id\", \"domain_name\", \"chosen_cert_arn\", \"matched_rule_priority\", \"request_creation_time\", \"actions_executed\", \"redirect_url\", \"lambda_error_reason\", \"target_port_list\", \"target_status_code_list\", \"classification\", \"classification_reason\", \"conn_trace_id\", CAST(ROW(json_extract_scalar(\"enrichment\", '$.geo_iso_code'), json_extract_scalar(\"enrichment\", '$.geo_country'), json_extract_scalar(\"enrichment\", '$.geo_city'), json_extract_scalar(\"enrichment\", '$.geo_location'), json_extract_scalar(\"enrichment\", '$.ua_browser'), json_extract_scalar(\"enrichment\", '$.ua_browser_version'), json_extract_scalar(\"enrichment\", '$.ua_os'), json_extract_scalar(\"enrichment\", '$.ua_os_version'), json_extract_scalar(\"enrichment\", '$.ua_device'), json_extract_scalar(\"enrichment\", '$.ua_category')) AS ROW(geo_iso_code varchar, geo_country varchar, geo_city varchar, geo_location varchar, ua_browser varchar, ua_browser_version varchar, ua_os varchar, ua_os_version varchar, ua_device varchar, ua_category varchar)), date_format(from_iso8601_timestamp(\"time\"), '%Y%m%d%H'), '{{}}' FROM \"{source_database}\".\"{source_table}\" ;"""
        )
        assert json.dumps(ALB_PARQUET.statements.drop) == json.dumps(
            """DROP TABLE IF EXISTS `{database}`.`{table_name}`"""
        )
        assert json.dumps(ALB_PARQUET.statements.aggregate) == json.dumps(
            """INSERT INTO \"{destination_database}\".\"{destination_table}\" (\"time\", \"timestamp\", \"type\", \"elb\", \"client_ip\", \"client_port\", \"target_ip\", \"target_port\", \"request_processing_time\", \"target_processing_time\", \"response_processing_time\", \"elb_status_code_group\", \"elb_status_code\", \"target_status_code\", \"received_bytes\", \"sent_bytes\", \"request_verb\", \"request_url\", \"request_host\", \"request_path\", \"request_proto\", \"user_agent\", \"ssl_cipher\", \"ssl_protocol\", \"target_group_arn\", \"trace_id\", \"domain_name\", \"chosen_cert_arn\", \"matched_rule_priority\", \"request_creation_time\", \"actions_executed\", \"redirect_url\", \"lambda_error_reason\", \"target_port_list\", \"target_status_code_list\", \"classification\", \"classification_reason\", \"conn_trace_id\", \"enrichment\", \"event_hour\", \"__execution_name__\") SELECT CAST(to_unixtime(from_iso8601_timestamp(\"time\")) * 1000 AS bigint), from_iso8601_timestamp(\"time\"), \"type\", \"elb\", \"client_ip\", \"client_port\", \"target_ip\", \"target_port\", \"request_processing_time\", \"target_processing_time\", \"response_processing_time\", CASE WHEN elb_status_code BETWEEN 100 AND 199 THEN '1xx' WHEN elb_status_code BETWEEN 200 AND 299 THEN '2xx' WHEN elb_status_code BETWEEN 300 AND 399 THEN '3xx' WHEN elb_status_code BETWEEN 400 AND 499 THEN '4xx' WHEN elb_status_code BETWEEN 500 AND 599 THEN '5xx' ELSE '-' END, \"elb_status_code\", \"target_status_code\", \"received_bytes\", \"sent_bytes\", \"request_verb\", \"request_url\", url_extract_host(\"request_url\"), url_extract_path(\"request_url\"), \"request_proto\", \"user_agent\", \"ssl_cipher\", \"ssl_protocol\", \"target_group_arn\", \"trace_id\", \"domain_name\", \"chosen_cert_arn\", \"matched_rule_priority\", \"request_creation_time\", \"actions_executed\", \"redirect_url\", \"lambda_error_reason\", \"target_port_list\", \"target_status_code_list\", \"classification\", \"classification_reason\", \"conn_trace_id\", CAST(ROW(json_extract_scalar(\"enrichment\", '$.geo_iso_code'), json_extract_scalar(\"enrichment\", '$.geo_country'), json_extract_scalar(\"enrichment\", '$.geo_city'), json_extract_scalar(\"enrichment\", '$.geo_location'), json_extract_scalar(\"enrichment\", '$.ua_browser'), json_extract_scalar(\"enrichment\", '$.ua_browser_version'), json_extract_scalar(\"enrichment\", '$.ua_os'), json_extract_scalar(\"enrichment\", '$.ua_os_version'), json_extract_scalar(\"enrichment\", '$.ua_device'), json_extract_scalar(\"enrichment\", '$.ua_category')) AS ROW(geo_iso_code varchar, geo_country varchar, geo_city varchar, geo_location varchar, ua_browser varchar, ua_browser_version varchar, ua_os varchar, ua_os_version varchar, ua_device varchar, ua_category varchar)), date_format(from_iso8601_timestamp(\"time\"), '%Y%m%d%H'), '{{}}' FROM \"{source_database}\".\"{source_table}\" WHERE __execution_name__ = '{execution_name}' GROUP BY CAST(to_unixtime(from_iso8601_timestamp(\"time\")) * 1000 AS bigint), from_iso8601_timestamp(\"time\"), \"type\", \"elb\", \"client_ip\", \"client_port\", \"target_ip\", \"target_port\", \"request_processing_time\", \"target_processing_time\", \"response_processing_time\", CASE WHEN elb_status_code BETWEEN 100 AND 199 THEN '1xx' WHEN elb_status_code BETWEEN 200 AND 299 THEN '2xx' WHEN elb_status_code BETWEEN 300 AND 399 THEN '3xx' WHEN elb_status_code BETWEEN 400 AND 499 THEN '4xx' WHEN elb_status_code BETWEEN 500 AND 599 THEN '5xx' ELSE '-' END, \"elb_status_code\", \"target_status_code\", \"received_bytes\", \"sent_bytes\", \"request_verb\", \"request_url\", url_extract_host(\"request_url\"), url_extract_path(\"request_url\"), \"request_proto\", \"user_agent\", \"ssl_cipher\", \"ssl_protocol\", \"target_group_arn\", \"trace_id\", \"domain_name\", \"chosen_cert_arn\", \"matched_rule_priority\", \"request_creation_time\", \"actions_executed\", \"redirect_url\", \"lambda_error_reason\", \"target_port_list\", \"target_status_code_list\", \"classification\", \"classification_reason\", \"conn_trace_id\", CAST(ROW(json_extract_scalar(\"enrichment\", '$.geo_iso_code'), json_extract_scalar(\"enrichment\", '$.geo_country'), json_extract_scalar(\"enrichment\", '$.geo_city'), json_extract_scalar(\"enrichment\", '$.geo_location'), json_extract_scalar(\"enrichment\", '$.ua_browser'), json_extract_scalar(\"enrichment\", '$.ua_browser_version'), json_extract_scalar(\"enrichment\", '$.ua_os'), json_extract_scalar(\"enrichment\", '$.ua_os_version'), json_extract_scalar(\"enrichment\", '$.ua_device'), json_extract_scalar(\"enrichment\", '$.ua_category')) AS ROW(geo_iso_code varchar, geo_country varchar, geo_city varchar, geo_location varchar, ua_browser varchar, ua_browser_version varchar, ua_os varchar, ua_os_version varchar, ua_device varchar, ua_category varchar)), date_format(from_iso8601_timestamp(\"time\"), '%Y%m%d%H'), '{{}}';"""
        )

        assert ALB_METRICS.columns == [
            {"Name": "time", "Type": "bigint"},
            {"Name": "timestamp", "Type": "timestamp"},
            {"Name": "type", "Type": "string"},
            {"Name": "client_ip", "Type": "string"},
            {"Name": "target_group_arn", "Type": "string"},
            {"Name": "target_ip", "Type": "string"},
            {"Name": "elb_status_code_group", "Type": "string"},
            {"Name": "elb_status_code", "Type": "int"},
            {"Name": "request_verb", "Type": "string"},
            {"Name": "request_host", "Type": "string"},
            {"Name": "request_path", "Type": "string"},
            {"Name": "ssl_protocol", "Type": "string"},
            {"Name": "ua_os", "Type": "string"},
            {"Name": "ua_device", "Type": "string"},
            {"Name": "ua_browser", "Type": "string"},
            {"Name": "ua_category", "Type": "string"},
            {"Name": "geo_iso_code", "Type": "string"},
            {"Name": "geo_country", "Type": "string"},
            {"Name": "geo_city", "Type": "string"},
            {"Name": "received_bytes", "Type": "double"},
            {"Name": "sent_bytes", "Type": "double"},
            {"Name": "avg_request_processing_time", "Type": "double"},
            {"Name": "avg_target_processing_time", "Type": "double"},
            {"Name": "avg_response_processing_time", "Type": "double"},
            {"Name": "requests", "Type": "bigint"},
        ]
        assert ALB_METRICS.partition_keys == [
            {"Name": "event_hour", "Type": "string"},
            {"Name": "elb", "Type": "string"},
            {"Name": "__execution_name__", "Type": "string"},
        ]
        assert ALB_METRICS.partition_indexes == [
            {"IndexName": "IDX_EXECUTION_NAME", "Keys": ["__execution_name__"]},
            {"IndexName": "IDX_PARTITIONS", "Keys": ["event_hour", "elb"]},
        ]
        assert ALB_METRICS.partition_info == collections.OrderedDict(
            [
                ("event_hour", {"type": "time", "from": "%Y%m%d%H", "to": "%Y%m%d00"}),
                ("elb", {"type": "retain"}),
                (
                    "__execution_name__",
                    {
                        "type": "default",
                        "value": "00000000-0000-0000-0000-000000000000",
                    },
                ),
            ]
        )
        assert json.dumps(ALB_METRICS.statements.create) == json.dumps(
            """CREATE EXTERNAL TABLE IF NOT EXISTS `{database}`.`{table_name}` (`time` bigint, `timestamp` timestamp, `type` string, `elb` string, `client_ip` string, `target_group_arn` string, `target_ip` string, `elb_status_code_group` string, `elb_status_code` int, `request_verb` string, `request_host` string, `request_path` string, `ssl_protocol` string, `ua_os` string, `ua_device` string, `ua_browser` string, `ua_category` string, `geo_iso_code` string, `geo_country` string, `geo_city` string, `received_bytes` double, `sent_bytes` double, `avg_request_processing_time` double, `avg_target_processing_time` double, `avg_response_processing_time` double, `requests` bigint, `event_hour` string, `__execution_name__` string) PARTITIONED BY (`event_hour` string, `elb` string, `__execution_name__` string) ROW FORMAT SERDE 'org.apache.hadoop.hive.ql.io.parquet.serde.ParquetHiveSerDe'  STORED AS INPUTFORMAT 'org.apache.hadoop.hive.ql.io.parquet.MapredParquetInputFormat' OUTPUTFORMAT 'org.apache.hadoop.hive.ql.io.parquet.MapredParquetOutputFormat' LOCATION '{location}' ;"""
        )
        assert json.dumps(ALB_METRICS.statements.insert) == json.dumps(
            """INSERT INTO \"{destination_database}\".\"{destination_table}\" (\"time\", \"timestamp\", \"type\", \"elb\", \"client_ip\", \"target_group_arn\", \"target_ip\", \"elb_status_code_group\", \"elb_status_code\", \"request_verb\", \"request_host\", \"request_path\", \"ssl_protocol\", \"ua_os\", \"ua_device\", \"ua_browser\", \"ua_category\", \"geo_iso_code\", \"geo_country\", \"geo_city\", \"received_bytes\", \"sent_bytes\", \"avg_request_processing_time\", \"avg_target_processing_time\", \"avg_response_processing_time\", \"requests\", \"event_hour\", \"__execution_name__\") SELECT FLOOR(\"time\" / 60000) * 60000, DATE_TRUNC('minute', \"timestamp\"), \"type\", \"elb\", \"client_ip\", \"target_group_arn\", \"target_ip\", \"elb_status_code_group\", \"elb_status_code\", \"request_verb\", url_extract_host(\"request_url\"), url_extract_path(\"request_url\"), \"ssl_protocol\", \"enrichment\".\"ua_os\", \"enrichment\".\"ua_device\", \"enrichment\".\"ua_browser\", \"enrichment\".\"ua_category\", \"enrichment\".\"geo_iso_code\", \"enrichment\".\"geo_country\", \"enrichment\".\"geo_city\", CAST(SUM(\"received_bytes\") AS DOUBLE), CAST(SUM(\"sent_bytes\") AS DOUBLE), CAST(AVG(\"request_processing_time\") FILTER(WHERE \"request_processing_time\" >= 0) AS DOUBLE), CAST(AVG(\"target_processing_time\") FILTER(WHERE \"target_processing_time\" >= 0) AS DOUBLE), CAST(AVG(\"response_processing_time\") FILTER(WHERE \"response_processing_time\" >= 0) AS DOUBLE), CAST(COUNT(1) AS bigint), \"event_hour\", \"__execution_name__\" FROM \"{source_database}\".\"{source_table}\" ;"""
        )
        assert json.dumps(ALB_METRICS.statements.drop) == json.dumps(
            """DROP TABLE IF EXISTS `{database}`.`{table_name}`"""
        )
        assert json.dumps(ALB_METRICS.statements.aggregate) == json.dumps(
            """INSERT INTO \"{destination_database}\".\"{destination_table}\" (\"time\", \"timestamp\", \"type\", \"elb\", \"client_ip\", \"target_group_arn\", \"target_ip\", \"elb_status_code_group\", \"elb_status_code\", \"request_verb\", \"request_host\", \"request_path\", \"ssl_protocol\", \"ua_os\", \"ua_device\", \"ua_browser\", \"ua_category\", \"geo_iso_code\", \"geo_country\", \"geo_city\", \"received_bytes\", \"sent_bytes\", \"avg_request_processing_time\", \"avg_target_processing_time\", \"avg_response_processing_time\", \"requests\", \"event_hour\", \"__execution_name__\") SELECT FLOOR(\"time\" / 60000) * 60000, DATE_TRUNC('minute', \"timestamp\"), \"type\", \"elb\", \"client_ip\", \"target_group_arn\", \"target_ip\", \"elb_status_code_group\", \"elb_status_code\", \"request_verb\", url_extract_host(\"request_url\"), url_extract_path(\"request_url\"), \"ssl_protocol\", \"enrichment\".\"ua_os\", \"enrichment\".\"ua_device\", \"enrichment\".\"ua_browser\", \"enrichment\".\"ua_category\", \"enrichment\".\"geo_iso_code\", \"enrichment\".\"geo_country\", \"enrichment\".\"geo_city\", CAST(SUM(\"received_bytes\") AS DOUBLE), CAST(SUM(\"sent_bytes\") AS DOUBLE), CAST(AVG(\"request_processing_time\") FILTER(WHERE \"request_processing_time\" >= 0) AS DOUBLE), CAST(AVG(\"target_processing_time\") FILTER(WHERE \"target_processing_time\" >= 0) AS DOUBLE), CAST(AVG(\"response_processing_time\") FILTER(WHERE \"response_processing_time\" >= 0) AS DOUBLE), CAST(COUNT(1) AS bigint), \"event_hour\", \"__execution_name__\" FROM \"{source_database}\".\"{source_table}\" WHERE __execution_name__ = '{execution_name}' GROUP BY FLOOR(\"time\" / 60000) * 60000, DATE_TRUNC('minute', \"timestamp\"), \"type\", \"elb\", \"client_ip\", \"target_group_arn\", \"target_ip\", \"elb_status_code_group\", \"elb_status_code\", \"request_verb\", url_extract_host(\"request_url\"), url_extract_path(\"request_url\"), \"ssl_protocol\", \"enrichment\".\"ua_os\", \"enrichment\".\"ua_device\", \"enrichment\".\"ua_browser\", \"enrichment\".\"ua_category\", \"enrichment\".\"geo_iso_code\", \"enrichment\".\"geo_country\", \"enrichment\".\"geo_city\", \"event_hour\", \"__execution_name__\";"""
        )

    def test_waf(
        self,
    ):
        from utils.aws.glue.table import TableMetaData
        from pipeline_resources_builder.logschema import (
            WAF_RAW,
            WAF_PARQUET,
            WAF_METRICS,
        )

        assert isinstance(WAF_RAW, TableMetaData) is True
        assert isinstance(WAF_PARQUET, TableMetaData) is True
        assert isinstance(WAF_METRICS, TableMetaData) is True

        assert WAF_RAW.columns == [
            {"Name": "timestamp", "Type": "bigint"},
            {"Name": "formatversion", "Type": "int"},
            {"Name": "webaclid", "Type": "string"},
            {"Name": "terminatingruleid", "Type": "string"},
            {"Name": "terminatingruletype", "Type": "string"},
            {"Name": "action", "Type": "string"},
            {
                "Name": "terminatingrulematchdetails",
                "Type": "array<struct<conditiontype:string,sensitivitylevel:string,location:string,matcheddata:array<string>>>",
            },
            {"Name": "httpsourcename", "Type": "string"},
            {"Name": "httpsourceid", "Type": "string"},
            {
                "Name": "rulegrouplist",
                "Type": "array<struct<rulegroupid:string,terminatingrule:struct<ruleid:string,action:string,rulematchdetails:array<struct<conditiontype:string,sensitivitylevel:string,location:string,matcheddata:array<string>>>>,nonterminatingmatchingrules:array<struct<ruleid:string,action:string,rulematchdetails:array<struct<conditiontype:string,sensitivitylevel:string,location:string,matcheddata:array<string>>>>>,excludedrules:string>>",
            },
            {
                "Name": "ratebasedrulelist",
                "Type": "array<struct<ratebasedruleid:string,limitkey:string,maxrateallowed:int>>",
            },
            {
                "Name": "nonterminatingmatchingrules",
                "Type": "array<struct<ruleid:string,action:string,rulematchdetails:array<struct<conditiontype:string,sensitivitylevel:string,location:string,matcheddata:array<string>>>,captcharesponse:struct<responsecode:string,solvetimestamp:string>>>",
            },
            {
                "Name": "requestheadersinserted",
                "Type": "array<struct<name:string,value:string>>",
            },
            {"Name": "responsecodesent", "Type": "string"},
            {"Name": "ja3fingerprint", "Type": "string"},
            {
                "Name": "httprequest",
                "Type": "struct<clientip:string,country:string,headers:array<struct<name:string,value:string>>,uri:string,args:string,httpversion:string,httpmethod:string,requestid:string>",
            },
            {"Name": "labels", "Type": "array<struct<name:string>>"},
            {
                "Name": "captcharesponse",
                "Type": "struct<responsecode:string,solvetimestamp:string,failureReason:string>",
            },
        ]
        assert WAF_RAW.partition_keys == []
        assert WAF_RAW.partition_indexes == []
        assert WAF_RAW.partition_info == {}
        assert json.dumps(WAF_RAW.statements.create) == json.dumps(
            """CREATE EXTERNAL TABLE IF NOT EXISTS `{database}`.`{table_name}` (`timestamp` bigint, `formatversion` int, `webaclid` string, `terminatingruleid` string, `terminatingruletype` string, `action` string, `terminatingrulematchdetails` array<struct<`conditiontype`:string,`sensitivitylevel`:string,`location`:string,`matcheddata`:array<string>>>, `httpsourcename` string, `httpsourceid` string, `rulegrouplist` array<struct<`rulegroupid`:string,`terminatingrule`:struct<`ruleid`:string,`action`:string,`rulematchdetails`:array<struct<`conditiontype`:string,`sensitivitylevel`:string,`location`:string,`matcheddata`:array<string>>>>,`nonterminatingmatchingrules`:array<struct<`ruleid`:string,`action`:string,`rulematchdetails`:array<struct<`conditiontype`:string,`sensitivitylevel`:string,`location`:string,`matcheddata`:array<string>>>>>,`excludedrules`:string>>, `ratebasedrulelist` array<struct<`ratebasedruleid`:string,`limitkey`:string,`maxrateallowed`:int>>, `nonterminatingmatchingrules` array<struct<`ruleid`:string,`action`:string,`rulematchdetails`:array<struct<`conditiontype`:string,`sensitivitylevel`:string,`location`:string,`matcheddata`:array<string>>>,`captcharesponse`:struct<`responsecode`:string,`solvetimestamp`:string>>>, `requestheadersinserted` array<struct<`name`:string,`value`:string>>, `responsecodesent` string, `ja3fingerprint` string, `httprequest` struct<`clientip`:string,`country`:string,`headers`:array<struct<`name`:string,`value`:string>>,`uri`:string,`args`:string,`httpversion`:string,`httpmethod`:string,`requestid`:string>, `labels` array<struct<`name`:string>>, `captcharesponse` struct<`responsecode`:string,`solvetimestamp`:string,`failureReason`:string>)  ROW FORMAT SERDE 'org.openx.data.jsonserde.JsonSerDe'  STORED AS INPUTFORMAT 'org.apache.hadoop.mapred.TextInputFormat' OUTPUTFORMAT 'org.apache.hadoop.hive.ql.io.HiveIgnoreKeyTextOutputFormat' LOCATION '{location}' ;"""
        )
        assert json.dumps(WAF_RAW.statements.insert) == json.dumps(
            """INSERT INTO \"{destination_database}\".\"{destination_table}\" (\"timestamp\", \"formatversion\", \"webaclid\", \"terminatingruleid\", \"terminatingruletype\", \"action\", \"terminatingrulematchdetails\", \"httpsourcename\", \"httpsourceid\", \"rulegrouplist\", \"ratebasedrulelist\", \"nonterminatingmatchingrules\", \"requestheadersinserted\", \"responsecodesent\", \"ja3fingerprint\", \"httprequest\", \"labels\", \"captcharesponse\") SELECT \"timestamp\", \"formatversion\", \"webaclid\", \"terminatingruleid\", \"terminatingruletype\", \"action\", \"terminatingrulematchdetails\", \"httpsourcename\", \"httpsourceid\", \"rulegrouplist\", \"ratebasedrulelist\", \"nonterminatingmatchingrules\", \"requestheadersinserted\", \"responsecodesent\", \"ja3fingerprint\", \"httprequest\", \"labels\", \"captcharesponse\" FROM \"{source_database}\".\"{source_table}\" ;"""
        )
        assert json.dumps(WAF_RAW.statements.drop) == json.dumps(
            """DROP TABLE IF EXISTS `{database}`.`{table_name}`"""
        )
        assert json.dumps(WAF_RAW.statements.aggregate) == json.dumps(
            """INSERT INTO \"{destination_database}\".\"{destination_table}\" (\"timestamp\", \"formatversion\", \"webaclid\", \"terminatingruleid\", \"terminatingruletype\", \"action\", \"terminatingrulematchdetails\", \"httpsourcename\", \"httpsourceid\", \"rulegrouplist\", \"ratebasedrulelist\", \"nonterminatingmatchingrules\", \"requestheadersinserted\", \"responsecodesent\", \"ja3fingerprint\", \"httprequest\", \"labels\", \"captcharesponse\") SELECT \"timestamp\", \"formatversion\", \"webaclid\", \"terminatingruleid\", \"terminatingruletype\", \"action\", \"terminatingrulematchdetails\", \"httpsourcename\", \"httpsourceid\", \"rulegrouplist\", \"ratebasedrulelist\", \"nonterminatingmatchingrules\", \"requestheadersinserted\", \"responsecodesent\", \"ja3fingerprint\", \"httprequest\", \"labels\", \"captcharesponse\" FROM \"{source_database}\".\"{source_table}\" WHERE __execution_name__ = '{execution_name}' GROUP BY \"timestamp\", \"formatversion\", \"webaclid\", \"terminatingruleid\", \"terminatingruletype\", \"action\", \"terminatingrulematchdetails\", \"httpsourcename\", \"httpsourceid\", \"rulegrouplist\", \"ratebasedrulelist\", \"nonterminatingmatchingrules\", \"requestheadersinserted\", \"responsecodesent\", \"ja3fingerprint\", \"httprequest\", \"labels\", \"captcharesponse\";"""
        )

        assert WAF_PARQUET.columns == [
            {"Name": "time", "Type": "bigint"},
            {"Name": "timestamp", "Type": "timestamp"},
            {"Name": "formatversion", "Type": "int"},
            {"Name": "webaclid", "Type": "string"},
            {"Name": "webaclname", "Type": "string"},
            {"Name": "terminatingruleid", "Type": "string"},
            {"Name": "terminatingruletype", "Type": "string"},
            {"Name": "action", "Type": "string"},
            {"Name": "action_fixed", "Type": "string"},
            {
                "Name": "terminatingrulematchdetails",
                "Type": "array<struct<conditiontype:string,sensitivitylevel:string,location:string,matcheddata:array<string>>>",
            },
            {"Name": "httpsourcename", "Type": "string"},
            {"Name": "httpsourceid", "Type": "string"},
            {
                "Name": "rulegrouplist",
                "Type": "array<struct<rulegroupid:string,terminatingrule:struct<ruleid:string,action:string,rulematchdetails:array<struct<conditiontype:string,sensitivitylevel:string,location:string,matcheddata:array<string>>>>,nonterminatingmatchingrules:array<struct<ruleid:string,action:string,rulematchdetails:array<struct<conditiontype:string,sensitivitylevel:string,location:string,matcheddata:array<string>>>>>,excludedrules:string>>",
            },
            {
                "Name": "ratebasedrulelist",
                "Type": "array<struct<ratebasedruleid:string,limitkey:string,maxrateallowed:int>>",
            },
            {
                "Name": "nonterminatingmatchingrules",
                "Type": "array<struct<ruleid:string,action:string,rulematchdetails:array<struct<conditiontype:string,sensitivitylevel:string,location:string,matcheddata:array<string>>>,captcharesponse:struct<responsecode:string,solvetimestamp:string>>>",
            },
            {
                "Name": "requestheadersinserted",
                "Type": "array<struct<name:string,value:string>>",
            },
            {"Name": "responsecodesent", "Type": "string"},
            {"Name": "host", "Type": "string"},
            {"Name": "clientip", "Type": "string"},
            {"Name": "country", "Type": "string"},
            {"Name": "uri", "Type": "string"},
            {"Name": "args", "Type": "string"},
            {"Name": "httpmethod", "Type": "string"},
            {"Name": "ja3fingerprint", "Type": "string"},
            {
                "Name": "httprequest",
                "Type": "struct<clientip:string,country:string,headers:array<struct<name:string,value:string>>,uri:string,args:string,httpversion:string,httpmethod:string,requestid:string>",
            },
            {"Name": "labels", "Type": "array<struct<name:string>>"},
            {
                "Name": "captcharesponse",
                "Type": "struct<responsecode:string,solvetimestamp:string,failureReason:string>",
            },
        ]
        assert WAF_PARQUET.partition_keys == [
            {"Name": "event_hour", "Type": "string"},
            {"Name": "account_id", "Type": "string"},
            {"Name": "region", "Type": "string"},
            {"Name": "__execution_name__", "Type": "string"},
        ]
        assert WAF_PARQUET.partition_indexes == [
            {"IndexName": "IDX_EXECUTION_NAME", "Keys": ["__execution_name__"]},
            {
                "IndexName": "IDX_PARTITIONS",
                "Keys": ["event_hour", "account_id", "region"],
            },
        ]
        assert WAF_PARQUET.partition_info == collections.OrderedDict(
            [
                ("event_hour", {"type": "time", "from": "%Y%m%d%H", "to": "%Y%m%d00"}),
                ("account_id", {"type": "retain"}),
                ("region", {"type": "retain"}),
                (
                    "__execution_name__",
                    {
                        "type": "default",
                        "value": "00000000-0000-0000-0000-000000000000",
                    },
                ),
            ]
        )
        assert json.dumps(WAF_PARQUET.statements.create) == json.dumps(
            """CREATE EXTERNAL TABLE IF NOT EXISTS `{database}`.`{table_name}` (`time` bigint, `timestamp` timestamp, `formatversion` int, `webaclid` string, `webaclname` string, `terminatingruleid` string, `terminatingruletype` string, `action` string, `action_fixed` string, `terminatingrulematchdetails` array<struct<`conditiontype`:string,`sensitivitylevel`:string,`location`:string,`matcheddata`:array<string>>>, `httpsourcename` string, `httpsourceid` string, `rulegrouplist` array<struct<`rulegroupid`:string,`terminatingrule`:struct<`ruleid`:string,`action`:string,`rulematchdetails`:array<struct<`conditiontype`:string,`sensitivitylevel`:string,`location`:string,`matcheddata`:array<string>>>>,`nonterminatingmatchingrules`:array<struct<`ruleid`:string,`action`:string,`rulematchdetails`:array<struct<`conditiontype`:string,`sensitivitylevel`:string,`location`:string,`matcheddata`:array<string>>>>>,`excludedrules`:string>>, `ratebasedrulelist` array<struct<`ratebasedruleid`:string,`limitkey`:string,`maxrateallowed`:int>>, `nonterminatingmatchingrules` array<struct<`ruleid`:string,`action`:string,`rulematchdetails`:array<struct<`conditiontype`:string,`sensitivitylevel`:string,`location`:string,`matcheddata`:array<string>>>,`captcharesponse`:struct<`responsecode`:string,`solvetimestamp`:string>>>, `requestheadersinserted` array<struct<`name`:string,`value`:string>>, `responsecodesent` string, `host` string, `clientip` string, `country` string, `uri` string, `args` string, `httpmethod` string, `ja3fingerprint` string, `httprequest` struct<`clientip`:string,`country`:string,`headers`:array<struct<`name`:string,`value`:string>>,`uri`:string,`args`:string,`httpversion`:string,`httpmethod`:string,`requestid`:string>, `labels` array<struct<`name`:string>>, `captcharesponse` struct<`responsecode`:string,`solvetimestamp`:string,`failureReason`:string>, `account_id` string, `region` string, `event_hour` string, `__execution_name__` string) PARTITIONED BY (`event_hour` string, `account_id` string, `region` string, `__execution_name__` string) ROW FORMAT SERDE 'org.apache.hadoop.hive.ql.io.parquet.serde.ParquetHiveSerDe'  STORED AS INPUTFORMAT 'org.apache.hadoop.hive.ql.io.parquet.MapredParquetInputFormat' OUTPUTFORMAT 'org.apache.hadoop.hive.ql.io.parquet.MapredParquetOutputFormat' LOCATION '{location}' ;"""
        )
        assert json.dumps(WAF_PARQUET.statements.insert) == json.dumps(
            """INSERT INTO \"{destination_database}\".\"{destination_table}\" (\"time\", \"timestamp\", \"formatversion\", \"webaclid\", \"webaclname\", \"terminatingruleid\", \"terminatingruletype\", \"action\", \"action_fixed\", \"terminatingrulematchdetails\", \"httpsourcename\", \"httpsourceid\", \"rulegrouplist\", \"ratebasedrulelist\", \"nonterminatingmatchingrules\", \"requestheadersinserted\", \"responsecodesent\", \"host\", \"clientip\", \"country\", \"uri\", \"args\", \"httpmethod\", \"ja3fingerprint\", \"httprequest\", \"labels\", \"captcharesponse\", \"account_id\", \"region\", \"event_hour\", \"__execution_name__\") SELECT \"timestamp\", CAST(FROM_UNIXTIME(\"timestamp\" / 1000) AS timestamp), \"formatversion\", \"webaclid\", SPLIT(\"webaclid\", '/')[3], \"terminatingruleid\", \"terminatingruletype\", \"action\", CASE WHEN action = 'ALLOW' AND labels != ARRAY[] THEN 'COUNT' ELSE action END, \"terminatingrulematchdetails\", \"httpsourcename\", \"httpsourceid\", \"rulegrouplist\", \"ratebasedrulelist\", \"nonterminatingmatchingrules\", \"requestheadersinserted\", \"responsecodesent\", case when filter(httprequest.headers, x -> lower(x.name) = 'host' ) = ARRAY[] then '' else filter(httprequest.headers, x -> lower(x.name) = 'host' )[1].value end, httprequest.clientip, httprequest.country, httprequest.uri, httprequest.args, httprequest.httpmethod, \"ja3fingerprint\", \"httprequest\", \"labels\", \"captcharesponse\", SPLIT(\"webaclid\", ':')[5], SPLIT(\"webaclid\", ':')[4], DATE_FORMAT(CAST(FROM_UNIXTIME(\"timestamp\" / 1000) AS timestamp), '%Y%m%d%H'), '{{}}' FROM \"{source_database}\".\"{source_table}\" ;"""
        )
        assert json.dumps(WAF_PARQUET.statements.drop) == json.dumps(
            """DROP TABLE IF EXISTS `{database}`.`{table_name}`"""
        )
        assert json.dumps(WAF_PARQUET.statements.aggregate) == json.dumps(
            """INSERT INTO \"{destination_database}\".\"{destination_table}\" (\"time\", \"timestamp\", \"formatversion\", \"webaclid\", \"webaclname\", \"terminatingruleid\", \"terminatingruletype\", \"action\", \"action_fixed\", \"terminatingrulematchdetails\", \"httpsourcename\", \"httpsourceid\", \"rulegrouplist\", \"ratebasedrulelist\", \"nonterminatingmatchingrules\", \"requestheadersinserted\", \"responsecodesent\", \"host\", \"clientip\", \"country\", \"uri\", \"args\", \"httpmethod\", \"ja3fingerprint\", \"httprequest\", \"labels\", \"captcharesponse\", \"account_id\", \"region\", \"event_hour\", \"__execution_name__\") SELECT \"timestamp\", CAST(FROM_UNIXTIME(\"timestamp\" / 1000) AS timestamp), \"formatversion\", \"webaclid\", SPLIT(\"webaclid\", '/')[3], \"terminatingruleid\", \"terminatingruletype\", \"action\", CASE WHEN action = 'ALLOW' AND labels != ARRAY[] THEN 'COUNT' ELSE action END, \"terminatingrulematchdetails\", \"httpsourcename\", \"httpsourceid\", \"rulegrouplist\", \"ratebasedrulelist\", \"nonterminatingmatchingrules\", \"requestheadersinserted\", \"responsecodesent\", case when filter(httprequest.headers, x -> lower(x.name) = 'host' ) = ARRAY[] then '' else filter(httprequest.headers, x -> lower(x.name) = 'host' )[1].value end, httprequest.clientip, httprequest.country, httprequest.uri, httprequest.args, httprequest.httpmethod, \"ja3fingerprint\", \"httprequest\", \"labels\", \"captcharesponse\", SPLIT(\"webaclid\", ':')[5], SPLIT(\"webaclid\", ':')[4], DATE_FORMAT(CAST(FROM_UNIXTIME(\"timestamp\" / 1000) AS timestamp), '%Y%m%d%H'), '{{}}' FROM \"{source_database}\".\"{source_table}\" WHERE __execution_name__ = '{execution_name}' GROUP BY \"timestamp\", CAST(FROM_UNIXTIME(\"timestamp\" / 1000) AS timestamp), \"formatversion\", \"webaclid\", SPLIT(\"webaclid\", '/')[3], \"terminatingruleid\", \"terminatingruletype\", \"action\", CASE WHEN action = 'ALLOW' AND labels != ARRAY[] THEN 'COUNT' ELSE action END, \"terminatingrulematchdetails\", \"httpsourcename\", \"httpsourceid\", \"rulegrouplist\", \"ratebasedrulelist\", \"nonterminatingmatchingrules\", \"requestheadersinserted\", \"responsecodesent\", case when filter(httprequest.headers, x -> lower(x.name) = 'host' ) = ARRAY[] then '' else filter(httprequest.headers, x -> lower(x.name) = 'host' )[1].value end, httprequest.clientip, httprequest.country, httprequest.uri, httprequest.args, httprequest.httpmethod, \"ja3fingerprint\", \"httprequest\", \"labels\", \"captcharesponse\", SPLIT(\"webaclid\", ':')[5], SPLIT(\"webaclid\", ':')[4], DATE_FORMAT(CAST(FROM_UNIXTIME(\"timestamp\" / 1000) AS timestamp), '%Y%m%d%H'), '{{}}';"""
        )

        assert WAF_METRICS.columns == [
            {"Name": "time", "Type": "bigint"},
            {"Name": "timestamp", "Type": "timestamp"},
            {"Name": "action", "Type": "string"},
            {"Name": "action_fixed", "Type": "string"},
            {"Name": "webaclid", "Type": "string"},
            {"Name": "webaclname", "Type": "string"},
            {"Name": "terminatingruleid", "Type": "string"},
            {"Name": "terminatingruletype", "Type": "string"},
            {"Name": "httpsourceid", "Type": "string"},
            {"Name": "httpmethod", "Type": "string"},
            {"Name": "country", "Type": "string"},
            {"Name": "clientip", "Type": "string"},
            {"Name": "host", "Type": "string"},
            {"Name": "uri", "Type": "string"},
            {"Name": "labels", "Type": "array<string>"},
            {"Name": "requests", "Type": "bigint"},
        ]
        assert WAF_METRICS.partition_keys == [
            {"Name": "event_hour", "Type": "string"},
            {"Name": "account_id", "Type": "string"},
            {"Name": "region", "Type": "string"},
            {"Name": "__execution_name__", "Type": "string"},
        ]
        assert WAF_METRICS.partition_indexes == [
            {"IndexName": "IDX_EXECUTION_NAME", "Keys": ["__execution_name__"]},
            {
                "IndexName": "IDX_PARTITIONS",
                "Keys": ["event_hour", "account_id", "region"],
            },
        ]
        assert WAF_METRICS.partition_info == collections.OrderedDict(
            [
                ("event_hour", {"type": "time", "from": "%Y%m%d%H", "to": "%Y%m%d00"}),
                ("account_id", {"type": "retain"}),
                ("region", {"type": "retain"}),
                (
                    "__execution_name__",
                    {
                        "type": "default",
                        "value": "00000000-0000-0000-0000-000000000000",
                    },
                ),
            ]
        )
        assert json.dumps(WAF_METRICS.statements.create) == json.dumps(
            """CREATE EXTERNAL TABLE IF NOT EXISTS `{database}`.`{table_name}` (`time` bigint, `timestamp` timestamp, `action` string, `action_fixed` string, `webaclid` string, `webaclname` string, `terminatingruleid` string, `terminatingruletype` string, `httpsourceid` string, `httpmethod` string, `country` string, `clientip` string, `host` string, `uri` string, `labels` array<string>, `requests` bigint, `account_id` string, `region` string, `event_hour` string, `__execution_name__` string) PARTITIONED BY (`event_hour` string, `account_id` string, `region` string, `__execution_name__` string) ROW FORMAT SERDE 'org.apache.hadoop.hive.ql.io.parquet.serde.ParquetHiveSerDe'  STORED AS INPUTFORMAT 'org.apache.hadoop.hive.ql.io.parquet.MapredParquetInputFormat' OUTPUTFORMAT 'org.apache.hadoop.hive.ql.io.parquet.MapredParquetOutputFormat' LOCATION '{location}' ;"""
        )
        assert json.dumps(WAF_METRICS.statements.insert) == json.dumps(
            """INSERT INTO \"{destination_database}\".\"{destination_table}\" (\"time\", \"timestamp\", \"action\", \"action_fixed\", \"webaclid\", \"webaclname\", \"terminatingruleid\", \"terminatingruletype\", \"httpsourceid\", \"httpmethod\", \"country\", \"clientip\", \"host\", \"uri\", \"labels\", \"requests\", \"account_id\", \"region\", \"event_hour\", \"__execution_name__\") SELECT FLOOR(\"time\" / 60000) * 60000, DATE_TRUNC('minute', \"timestamp\"), \"action\", \"action_fixed\", \"webaclid\", \"webaclname\", \"terminatingruleid\", \"terminatingruletype\", \"httpsourceid\", \"httpmethod\", \"country\", \"clientip\", \"host\", \"uri\", ARRAY_DISTINCT(FLATTEN(ARRAY_AGG(TRANSFORM(labels, x -> x.name)) FILTER (WHERE labels != ARRAY[]))), CAST(COUNT(1) AS bigint), \"account_id\", \"region\", \"event_hour\", \"__execution_name__\" FROM \"{source_database}\".\"{source_table}\" ;"""
        )
        assert json.dumps(WAF_METRICS.statements.drop) == json.dumps(
            """DROP TABLE IF EXISTS `{database}`.`{table_name}`"""
        )
        assert json.dumps(WAF_METRICS.statements.aggregate) == json.dumps(
            """INSERT INTO \"{destination_database}\".\"{destination_table}\" (\"time\", \"timestamp\", \"action\", \"action_fixed\", \"webaclid\", \"webaclname\", \"terminatingruleid\", \"terminatingruletype\", \"httpsourceid\", \"httpmethod\", \"country\", \"clientip\", \"host\", \"uri\", \"labels\", \"requests\", \"account_id\", \"region\", \"event_hour\", \"__execution_name__\") SELECT FLOOR(\"time\" / 60000) * 60000, DATE_TRUNC('minute', \"timestamp\"), \"action\", \"action_fixed\", \"webaclid\", \"webaclname\", \"terminatingruleid\", \"terminatingruletype\", \"httpsourceid\", \"httpmethod\", \"country\", \"clientip\", \"host\", \"uri\", ARRAY_DISTINCT(FLATTEN(ARRAY_AGG(TRANSFORM(labels, x -> x.name)) FILTER (WHERE labels != ARRAY[]))), CAST(COUNT(1) AS bigint), \"account_id\", \"region\", \"event_hour\", \"__execution_name__\" FROM \"{source_database}\".\"{source_table}\" WHERE __execution_name__ = '{execution_name}' GROUP BY FLOOR(\"time\" / 60000) * 60000, DATE_TRUNC('minute', \"timestamp\"), \"action\", \"action_fixed\", \"webaclid\", \"webaclname\", \"terminatingruleid\", \"terminatingruletype\", \"httpsourceid\", \"httpmethod\", \"country\", \"clientip\", \"host\", \"uri\", \"account_id\", \"region\", \"event_hour\", \"__execution_name__\";"""
        )

    def test_cloudtrail(
        self,
    ):
        from utils.aws.glue.table import TableMetaData
        from pipeline_resources_builder.logschema import (
            CLOUDTRAIL_RAW,
            CLOUDTRAIL_PARQUET,
            CLOUDTRAIL_METRICS,
        )

        assert isinstance(CLOUDTRAIL_RAW, TableMetaData) is True
        assert isinstance(CLOUDTRAIL_PARQUET, TableMetaData) is True
        assert isinstance(CLOUDTRAIL_METRICS, TableMetaData) is True

        assert CLOUDTRAIL_RAW.columns == [
            {"Name": "eventversion", "Type": "string"},
            {
                "Name": "useridentity",
                "Type": "struct<type:string,principalid:string,arn:string,accountid:string,invokedby:string,accesskeyid:string,userName:string,sessioncontext:struct<attributes:struct<mfaauthenticated:string,creationdate:string>,sessionissuer:struct<type:string,principalId:string,arn:string,accountId:string,userName:string>,ec2RoleDelivery:string,webIdFederationData:map<string,string>>>",
            },
            {"Name": "eventtime", "Type": "string"},
            {"Name": "eventsource", "Type": "string"},
            {"Name": "eventname", "Type": "string"},
            {"Name": "awsregion", "Type": "string"},
            {"Name": "sourceipaddress", "Type": "string"},
            {"Name": "useragent", "Type": "string"},
            {"Name": "errorcode", "Type": "string"},
            {"Name": "errormessage", "Type": "string"},
            {"Name": "requestparameters", "Type": "string"},
            {"Name": "responseelements", "Type": "string"},
            {"Name": "additionaleventdata", "Type": "string"},
            {"Name": "requestid", "Type": "string"},
            {"Name": "eventid", "Type": "string"},
            {
                "Name": "resources",
                "Type": "array<struct<arn:string,accountid:string,type:string>>",
            },
            {"Name": "eventtype", "Type": "string"},
            {"Name": "apiversion", "Type": "string"},
            {"Name": "readonly", "Type": "string"},
            {"Name": "recipientaccountid", "Type": "string"},
            {"Name": "serviceeventdetails", "Type": "string"},
            {"Name": "sharedeventid", "Type": "string"},
            {"Name": "vpcendpointid", "Type": "string"},
            {
                "Name": "tlsDetails",
                "Type": "struct<tlsVersion:string,cipherSuite:string,clientProvidedHostHeader:string>",
            },
        ]
        assert CLOUDTRAIL_RAW.partition_keys == []
        assert CLOUDTRAIL_RAW.partition_indexes == []
        assert CLOUDTRAIL_RAW.partition_info == {}
        assert json.dumps(CLOUDTRAIL_RAW.statements.create) == json.dumps(
            """CREATE EXTERNAL TABLE IF NOT EXISTS `{database}`.`{table_name}` (`eventversion` string, `useridentity` struct<`type`:string,`principalid`:string,`arn`:string,`accountid`:string,`invokedby`:string,`accesskeyid`:string,`userName`:string,`sessioncontext`:struct<`attributes`:struct<`mfaauthenticated`:string,`creationdate`:string>,`sessionissuer`:struct<`type`:string,`principalId`:string,`arn`:string,`accountId`:string,`userName`:string>,`ec2RoleDelivery`:string,`webIdFederationData`:map<string,string>>>, `eventtime` string, `eventsource` string, `eventname` string, `awsregion` string, `sourceipaddress` string, `useragent` string, `errorcode` string, `errormessage` string, `requestparameters` string, `responseelements` string, `additionaleventdata` string, `requestid` string, `eventid` string, `resources` array<struct<`arn`:string,`accountid`:string,`type`:string>>, `eventtype` string, `apiversion` string, `readonly` string, `recipientaccountid` string, `serviceeventdetails` string, `sharedeventid` string, `vpcendpointid` string, `tlsDetails` struct<`tlsVersion`:string,`cipherSuite`:string,`clientProvidedHostHeader`:string>)  ROW FORMAT SERDE 'org.openx.data.jsonserde.JsonSerDe'  STORED AS INPUTFORMAT 'com.amazon.emr.cloudtrail.CloudTrailInputFormat' OUTPUTFORMAT 'org.apache.hadoop.hive.ql.io.HiveIgnoreKeyTextOutputFormat' LOCATION '{location}' ;"""
        )
        assert json.dumps(CLOUDTRAIL_RAW.statements.insert) == json.dumps(
            """INSERT INTO "{destination_database}"."{destination_table}" ("eventversion", "useridentity", "eventtime", "eventsource", "eventname", "awsregion", "sourceipaddress", "useragent", "errorcode", "errormessage", "requestparameters", "responseelements", "additionaleventdata", "requestid", "eventid", "resources", "eventtype", "apiversion", "readonly", "recipientaccountid", "serviceeventdetails", "sharedeventid", "vpcendpointid", "tlsDetails") SELECT "eventversion", "useridentity", "eventtime", "eventsource", "eventname", "awsregion", "sourceipaddress", "useragent", "errorcode", "errormessage", "requestparameters", "responseelements", "additionaleventdata", "requestid", "eventid", "resources", "eventtype", "apiversion", "readonly", "recipientaccountid", "serviceeventdetails", "sharedeventid", "vpcendpointid", "tlsDetails" FROM "{source_database}"."{source_table}" ;"""
        )
        assert json.dumps(CLOUDTRAIL_RAW.statements.drop) == json.dumps(
            """DROP TABLE IF EXISTS `{database}`.`{table_name}`"""
        )
        assert json.dumps(CLOUDTRAIL_RAW.statements.aggregate) == json.dumps(
            """INSERT INTO "{destination_database}"."{destination_table}" ("eventversion", "useridentity", "eventtime", "eventsource", "eventname", "awsregion", "sourceipaddress", "useragent", "errorcode", "errormessage", "requestparameters", "responseelements", "additionaleventdata", "requestid", "eventid", "resources", "eventtype", "apiversion", "readonly", "recipientaccountid", "serviceeventdetails", "sharedeventid", "vpcendpointid", "tlsDetails") SELECT "eventversion", "useridentity", "eventtime", "eventsource", "eventname", "awsregion", "sourceipaddress", "useragent", "errorcode", "errormessage", "requestparameters", "responseelements", "additionaleventdata", "requestid", "eventid", "resources", "eventtype", "apiversion", "readonly", "recipientaccountid", "serviceeventdetails", "sharedeventid", "vpcendpointid", "tlsDetails" FROM "{source_database}"."{source_table}" WHERE __execution_name__ = '{execution_name}' GROUP BY "eventversion", "useridentity", "eventtime", "eventsource", "eventname", "awsregion", "sourceipaddress", "useragent", "errorcode", "errormessage", "requestparameters", "responseelements", "additionaleventdata", "requestid", "eventid", "resources", "eventtype", "apiversion", "readonly", "recipientaccountid", "serviceeventdetails", "sharedeventid", "vpcendpointid", "tlsDetails";"""
        )

        assert CLOUDTRAIL_PARQUET.columns == [
            {"Name": "time", "Type": "bigint"},
            {"Name": "timestamp", "Type": "timestamp"},
            {"Name": "eventversion", "Type": "string"},
            {
                "Name": "useridentity",
                "Type": "struct<type:string,principalid:string,arn:string,accountid:string,invokedby:string,accesskeyid:string,userName:string,sessioncontext:struct<attributes:struct<mfaauthenticated:string,creationdate:string>,sessionissuer:struct<type:string,principalId:string,arn:string,accountId:string,userName:string>,ec2RoleDelivery:string,webIdFederationData:map<string,string>>>",
            },
            {"Name": "eventtime", "Type": "string"},
            {"Name": "eventsource", "Type": "string"},
            {"Name": "eventname", "Type": "string"},
            {"Name": "awsregion", "Type": "string"},
            {"Name": "sourceipaddress", "Type": "string"},
            {"Name": "useragent", "Type": "string"},
            {"Name": "errorcode", "Type": "string"},
            {"Name": "errormessage", "Type": "string"},
            {"Name": "requestparameters", "Type": "string"},
            {"Name": "responseelements", "Type": "string"},
            {"Name": "additionaleventdata", "Type": "string"},
            {"Name": "requestid", "Type": "string"},
            {"Name": "eventid", "Type": "string"},
            {
                "Name": "resources",
                "Type": "array<struct<arn:string,accountid:string,type:string>>",
            },
            {"Name": "eventtype", "Type": "string"},
            {"Name": "apiversion", "Type": "string"},
            {"Name": "readonly", "Type": "string"},
            {"Name": "recipientaccountid", "Type": "string"},
            {"Name": "serviceeventdetails", "Type": "string"},
            {"Name": "sharedeventid", "Type": "string"},
            {"Name": "vpcendpointid", "Type": "string"},
            {
                "Name": "tlsDetails",
                "Type": "struct<tlsVersion:string,cipherSuite:string,clientProvidedHostHeader:string>",
            },
        ]
        assert CLOUDTRAIL_PARQUET.partition_keys == [
            {"Name": "event_hour", "Type": "string"},
            {"Name": "account_id", "Type": "string"},
            {"Name": "region", "Type": "string"},
            {"Name": "__execution_name__", "Type": "string"},
        ]
        assert CLOUDTRAIL_PARQUET.partition_indexes == [
            {"IndexName": "IDX_EXECUTION_NAME", "Keys": ["__execution_name__"]},
            {
                "IndexName": "IDX_PARTITIONS",
                "Keys": ["event_hour", "account_id", "region"],
            },
        ]
        assert CLOUDTRAIL_PARQUET.partition_info == collections.OrderedDict(
            [
                ("event_hour", {"type": "time", "from": "%Y%m%d%H", "to": "%Y%m%d00"}),
                ("account_id", {"type": "retain"}),
                ("region", {"type": "retain"}),
                (
                    "__execution_name__",
                    {
                        "type": "default",
                        "value": "00000000-0000-0000-0000-000000000000",
                    },
                ),
            ]
        )
        assert json.dumps(CLOUDTRAIL_PARQUET.statements.create) == json.dumps(
            """CREATE EXTERNAL TABLE IF NOT EXISTS `{database}`.`{table_name}` (`time` bigint, `timestamp` timestamp, `eventversion` string, `useridentity` struct<`type`:string,`principalid`:string,`arn`:string,`accountid`:string,`invokedby`:string,`accesskeyid`:string,`userName`:string,`sessioncontext`:struct<`attributes`:struct<`mfaauthenticated`:string,`creationdate`:string>,`sessionissuer`:struct<`type`:string,`principalId`:string,`arn`:string,`accountId`:string,`userName`:string>,`ec2RoleDelivery`:string,`webIdFederationData`:map<string,string>>>, `eventtime` string, `eventsource` string, `eventname` string, `awsregion` string, `sourceipaddress` string, `useragent` string, `errorcode` string, `errormessage` string, `requestparameters` string, `responseelements` string, `additionaleventdata` string, `requestid` string, `eventid` string, `resources` array<struct<`arn`:string,`accountid`:string,`type`:string>>, `eventtype` string, `apiversion` string, `readonly` string, `recipientaccountid` string, `serviceeventdetails` string, `sharedeventid` string, `vpcendpointid` string, `tlsDetails` struct<`tlsVersion`:string,`cipherSuite`:string,`clientProvidedHostHeader`:string>, `account_id` string, `region` string, `event_hour` string, `__execution_name__` string) PARTITIONED BY (`event_hour` string, `account_id` string, `region` string, `__execution_name__` string) ROW FORMAT SERDE 'org.apache.hadoop.hive.ql.io.parquet.serde.ParquetHiveSerDe'  STORED AS INPUTFORMAT 'org.apache.hadoop.hive.ql.io.parquet.MapredParquetInputFormat' OUTPUTFORMAT 'org.apache.hadoop.hive.ql.io.parquet.MapredParquetOutputFormat' LOCATION '{location}' ;"""
        )
        assert json.dumps(CLOUDTRAIL_PARQUET.statements.insert) == json.dumps(
            """INSERT INTO "{destination_database}"."{destination_table}" ("time", "timestamp", "eventversion", "useridentity", "eventtime", "eventsource", "eventname", "awsregion", "sourceipaddress", "useragent", "errorcode", "errormessage", "requestparameters", "responseelements", "additionaleventdata", "requestid", "eventid", "resources", "eventtype", "apiversion", "readonly", "recipientaccountid", "serviceeventdetails", "sharedeventid", "vpcendpointid", "tlsDetails", "account_id", "region", "event_hour", "__execution_name__") SELECT CAST(to_unixtime(from_iso8601_timestamp("eventtime")) * 1000 AS bigint), from_iso8601_timestamp("eventtime"), "eventversion", "useridentity", "eventtime", "eventsource", "eventname", "awsregion", "sourceipaddress", "useragent", "errorcode", "errormessage", "requestparameters", "responseelements", "additionaleventdata", "requestid", "eventid", "resources", "eventtype", "apiversion", "readonly", "recipientaccountid", "serviceeventdetails", "sharedeventid", "vpcendpointid", "tlsDetails", "recipientaccountid", "awsregion", date_format(from_iso8601_timestamp("eventtime"), '%Y%m%d%H'), '{{}}' FROM "{source_database}"."{source_table}" ;"""
        )
        assert json.dumps(CLOUDTRAIL_PARQUET.statements.drop) == json.dumps(
            """DROP TABLE IF EXISTS `{database}`.`{table_name}`"""
        )
        assert json.dumps(CLOUDTRAIL_PARQUET.statements.aggregate) == json.dumps(
            """INSERT INTO \"{destination_database}\".\"{destination_table}\" (\"time\", \"timestamp\", \"eventversion\", \"useridentity\", \"eventtime\", \"eventsource\", \"eventname\", \"awsregion\", \"sourceipaddress\", \"useragent\", \"errorcode\", \"errormessage\", \"requestparameters\", \"responseelements\", \"additionaleventdata\", \"requestid\", \"eventid\", \"resources\", \"eventtype\", \"apiversion\", \"readonly\", \"recipientaccountid\", \"serviceeventdetails\", \"sharedeventid\", \"vpcendpointid\", \"tlsDetails\", \"account_id\", \"region\", \"event_hour\", \"__execution_name__\") SELECT CAST(to_unixtime(from_iso8601_timestamp(\"eventtime\")) * 1000 AS bigint), from_iso8601_timestamp(\"eventtime\"), \"eventversion\", \"useridentity\", \"eventtime\", \"eventsource\", \"eventname\", \"awsregion\", \"sourceipaddress\", \"useragent\", \"errorcode\", \"errormessage\", \"requestparameters\", \"responseelements\", \"additionaleventdata\", \"requestid\", \"eventid\", \"resources\", \"eventtype\", \"apiversion\", \"readonly\", \"recipientaccountid\", \"serviceeventdetails\", \"sharedeventid\", \"vpcendpointid\", \"tlsDetails\", \"recipientaccountid\", \"awsregion\", date_format(from_iso8601_timestamp(\"eventtime\"), '%Y%m%d%H'), '{{}}' FROM \"{source_database}\".\"{source_table}\" WHERE __execution_name__ = '{execution_name}' GROUP BY CAST(to_unixtime(from_iso8601_timestamp(\"eventtime\")) * 1000 AS bigint), from_iso8601_timestamp(\"eventtime\"), \"eventversion\", \"useridentity\", \"eventtime\", \"eventsource\", \"eventname\", \"awsregion\", \"sourceipaddress\", \"useragent\", \"errorcode\", \"errormessage\", \"requestparameters\", \"responseelements\", \"additionaleventdata\", \"requestid\", \"eventid\", \"resources\", \"eventtype\", \"apiversion\", \"readonly\", \"recipientaccountid\", \"serviceeventdetails\", \"sharedeventid\", \"vpcendpointid\", \"tlsDetails\", \"recipientaccountid\", \"awsregion\", date_format(from_iso8601_timestamp(\"eventtime\"), '%Y%m%d%H'), '{{}}';"""
        )

        assert CLOUDTRAIL_METRICS.columns == [
            {"Name": "time", "Type": "bigint"},
            {"Name": "timestamp", "Type": "timestamp"},
            {"Name": "useridentitytype", "Type": "string"},
            {"Name": "accountid", "Type": "string"},
            {"Name": "username", "Type": "string"},
            {"Name": "eventtype", "Type": "string"},
            {"Name": "eventsource", "Type": "string"},
            {"Name": "eventname", "Type": "string"},
            {"Name": "sourceipaddress", "Type": "string"},
            {"Name": "errorCode", "Type": "string"},
            {"Name": "requests", "Type": "bigint"},
        ]
        assert CLOUDTRAIL_METRICS.partition_keys == [
            {"Name": "event_hour", "Type": "string"},
            {"Name": "account_id", "Type": "string"},
            {"Name": "region", "Type": "string"},
            {"Name": "__execution_name__", "Type": "string"},
        ]
        assert CLOUDTRAIL_METRICS.partition_indexes == [
            {"IndexName": "IDX_EXECUTION_NAME", "Keys": ["__execution_name__"]},
            {
                "IndexName": "IDX_PARTITIONS",
                "Keys": ["event_hour", "account_id", "region"],
            },
        ]
        assert CLOUDTRAIL_METRICS.partition_info == collections.OrderedDict(
            [
                ("event_hour", {"type": "time", "from": "%Y%m%d%H", "to": "%Y%m%d00"}),
                ("account_id", {"type": "retain"}),
                ("region", {"type": "retain"}),
                (
                    "__execution_name__",
                    {
                        "type": "default",
                        "value": "00000000-0000-0000-0000-000000000000",
                    },
                ),
            ]
        )
        assert json.dumps(CLOUDTRAIL_METRICS.statements.create) == json.dumps(
            """CREATE EXTERNAL TABLE IF NOT EXISTS `{database}`.`{table_name}` (`time` bigint, `timestamp` timestamp, `useridentitytype` string, `accountid` string, `username` string, `eventtype` string, `eventsource` string, `eventname` string, `sourceipaddress` string, `errorCode` string, `requests` bigint, `event_hour` string, `account_id` string, `region` string, `__execution_name__` string) PARTITIONED BY (`event_hour` string, `account_id` string, `region` string, `__execution_name__` string) ROW FORMAT SERDE 'org.apache.hadoop.hive.ql.io.parquet.serde.ParquetHiveSerDe'  STORED AS INPUTFORMAT 'org.apache.hadoop.hive.ql.io.parquet.MapredParquetInputFormat' OUTPUTFORMAT 'org.apache.hadoop.hive.ql.io.parquet.MapredParquetOutputFormat' LOCATION '{location}' ;"""
        )
        assert json.dumps(CLOUDTRAIL_METRICS.statements.insert) == json.dumps(
            """INSERT INTO "{destination_database}"."{destination_table}" ("time", "timestamp", "useridentitytype", "accountid", "username", "eventtype", "eventsource", "eventname", "sourceipaddress", "errorCode", "requests", "event_hour", "account_id", "region", "__execution_name__") SELECT FLOOR("time" / 60000) * 60000, DATE_TRUNC('minute', "timestamp"), useridentity.type, COALESCE(useridentity.accountid, useridentity.sessioncontext.sessionissuer.accountid), COALESCE(useridentity.username, useridentity.sessioncontext.sessionissuer.username), "eventtype", "eventsource", "eventname", "sourceipaddress", "errorCode", CAST(COUNT(1) AS bigint), "event_hour", "account_id", "region", "__execution_name__" FROM "{source_database}"."{source_table}" ;"""
        )
        assert json.dumps(CLOUDTRAIL_METRICS.statements.drop) == json.dumps(
            """DROP TABLE IF EXISTS `{database}`.`{table_name}`"""
        )
        assert json.dumps(CLOUDTRAIL_METRICS.statements.aggregate) == json.dumps(
            """INSERT INTO "{destination_database}"."{destination_table}" ("time", "timestamp", "useridentitytype", "accountid", "username", "eventtype", "eventsource", "eventname", "sourceipaddress", "errorCode", "requests", "event_hour", "account_id", "region", "__execution_name__") SELECT FLOOR("time" / 60000) * 60000, DATE_TRUNC('minute', "timestamp"), useridentity.type, COALESCE(useridentity.accountid, useridentity.sessioncontext.sessionissuer.accountid), COALESCE(useridentity.username, useridentity.sessioncontext.sessionissuer.username), "eventtype", "eventsource", "eventname", "sourceipaddress", "errorCode", CAST(COUNT(1) AS bigint), "event_hour", "account_id", "region", "__execution_name__" FROM "{source_database}"."{source_table}" WHERE __execution_name__ = '{execution_name}' GROUP BY FLOOR("time" / 60000) * 60000, DATE_TRUNC('minute', "timestamp"), useridentity.type, COALESCE(useridentity.accountid, useridentity.sessioncontext.sessionissuer.accountid), COALESCE(useridentity.username, useridentity.sessioncontext.sessionissuer.username), "eventtype", "eventsource", "eventname", "sourceipaddress", "errorCode", "event_hour", "account_id", "region", "__execution_name__";"""
        )

    def test_vpcflow(
        self,
    ):
        from utils.aws.glue.table import TableMetaData
        from pipeline_resources_builder.logschema import (
            VPCFLOW_RAW,
            VPCFLOW_PARQUET,
            VPCFLOW_METRICS,
        )

        assert isinstance(VPCFLOW_RAW, TableMetaData) is True
        assert isinstance(VPCFLOW_RAW, TableMetaData) is True
        assert isinstance(VPCFLOW_METRICS, TableMetaData) is True

        assert VPCFLOW_RAW.columns == [
            {"Name": "account-id", "Type": "string"},
            {"Name": "action", "Type": "string"},
            {"Name": "az-id", "Type": "string"},
            {"Name": "bytes", "Type": "bigint"},
            {"Name": "dstaddr", "Type": "string"},
            {"Name": "dstport", "Type": "int"},
            {"Name": "end", "Type": "bigint"},
            {"Name": "flow-direction", "Type": "string"},
            {"Name": "instance-id", "Type": "string"},
            {"Name": "interface-id", "Type": "string"},
            {"Name": "log-status", "Type": "string"},
            {"Name": "packets", "Type": "bigint"},
            {"Name": "pkt-dst-aws-service", "Type": "string"},
            {"Name": "pkt-dstaddr", "Type": "string"},
            {"Name": "pkt-src-aws-service", "Type": "string"},
            {"Name": "pkt-srcaddr", "Type": "string"},
            {"Name": "protocol", "Type": "bigint"},
            {"Name": "region", "Type": "string"},
            {"Name": "srcaddr", "Type": "string"},
            {"Name": "srcport", "Type": "int"},
            {"Name": "start", "Type": "bigint"},
            {"Name": "sublocation-id", "Type": "string"},
            {"Name": "sublocation-type", "Type": "string"},
            {"Name": "subnet-id", "Type": "string"},
            {"Name": "tcp-flags", "Type": "int"},
            {"Name": "traffic-path", "Type": "int"},
            {"Name": "type", "Type": "string"},
            {"Name": "version", "Type": "int"},
            {"Name": "vpc-id", "Type": "string"},
        ]
        assert VPCFLOW_RAW.partition_keys == []
        assert VPCFLOW_RAW.partition_indexes == []
        assert VPCFLOW_RAW.partition_info == {}
        assert json.dumps(VPCFLOW_RAW.statements.create) == json.dumps(
            """CREATE EXTERNAL TABLE IF NOT EXISTS `{database}`.`{table_name}` (`account-id` string, `action` string, `az-id` string, `bytes` bigint, `dstaddr` string, `dstport` int, `end` bigint, `flow-direction` string, `instance-id` string, `interface-id` string, `log-status` string, `packets` bigint, `pkt-dst-aws-service` string, `pkt-dstaddr` string, `pkt-src-aws-service` string, `pkt-srcaddr` string, `protocol` bigint, `region` string, `srcaddr` string, `srcport` int, `start` bigint, `sublocation-id` string, `sublocation-type` string, `subnet-id` string, `tcp-flags` int, `traffic-path` int, `type` string, `version` int, `vpc-id` string)  ROW FORMAT SERDE 'org.apache.hadoop.hive.serde2.lazy.LazySimpleSerDe' WITH SERDEPROPERTIES ('field.delim'=' ', 'line.delim'='\n') STORED AS INPUTFORMAT 'org.apache.hadoop.mapred.TextInputFormat' OUTPUTFORMAT 'org.apache.hadoop.hive.ql.io.HiveIgnoreKeyTextOutputFormat' LOCATION '{location}' TBLPROPERTIES ('skip.header.line.count'='1');"""
        )
        assert json.dumps(VPCFLOW_RAW.statements.insert) == json.dumps(
            """INSERT INTO \"{destination_database}\".\"{destination_table}\" (\"account-id\", \"action\", \"az-id\", \"bytes\", \"dstaddr\", \"dstport\", \"end\", \"flow-direction\", \"instance-id\", \"interface-id\", \"log-status\", \"packets\", \"pkt-dst-aws-service\", \"pkt-dstaddr\", \"pkt-src-aws-service\", \"pkt-srcaddr\", \"protocol\", \"region\", \"srcaddr\", \"srcport\", \"start\", \"sublocation-id\", \"sublocation-type\", \"subnet-id\", \"tcp-flags\", \"traffic-path\", \"type\", \"version\", \"vpc-id\") SELECT \"account-id\", \"action\", \"az-id\", \"bytes\", \"dstaddr\", \"dstport\", \"end\", \"flow-direction\", \"instance-id\", \"interface-id\", \"log-status\", \"packets\", \"pkt-dst-aws-service\", \"pkt-dstaddr\", \"pkt-src-aws-service\", \"pkt-srcaddr\", \"protocol\", \"region\", \"srcaddr\", \"srcport\", \"start\", \"sublocation-id\", \"sublocation-type\", \"subnet-id\", \"tcp-flags\", \"traffic-path\", \"type\", \"version\", \"vpc-id\" FROM \"{source_database}\".\"{source_table}\" ;"""
        )
        assert json.dumps(VPCFLOW_RAW.statements.drop) == json.dumps(
            """DROP TABLE IF EXISTS `{database}`.`{table_name}`"""
        )
        assert json.dumps(VPCFLOW_RAW.statements.aggregate) == json.dumps(
            """INSERT INTO \"{destination_database}\".\"{destination_table}\" (\"account-id\", \"action\", \"az-id\", \"bytes\", \"dstaddr\", \"dstport\", \"end\", \"flow-direction\", \"instance-id\", \"interface-id\", \"log-status\", \"packets\", \"pkt-dst-aws-service\", \"pkt-dstaddr\", \"pkt-src-aws-service\", \"pkt-srcaddr\", \"protocol\", \"region\", \"srcaddr\", \"srcport\", \"start\", \"sublocation-id\", \"sublocation-type\", \"subnet-id\", \"tcp-flags\", \"traffic-path\", \"type\", \"version\", \"vpc-id\") SELECT \"account-id\", \"action\", \"az-id\", \"bytes\", \"dstaddr\", \"dstport\", \"end\", \"flow-direction\", \"instance-id\", \"interface-id\", \"log-status\", \"packets\", \"pkt-dst-aws-service\", \"pkt-dstaddr\", \"pkt-src-aws-service\", \"pkt-srcaddr\", \"protocol\", \"region\", \"srcaddr\", \"srcport\", \"start\", \"sublocation-id\", \"sublocation-type\", \"subnet-id\", \"tcp-flags\", \"traffic-path\", \"type\", \"version\", \"vpc-id\" FROM \"{source_database}\".\"{source_table}\" WHERE __execution_name__ = '{execution_name}' GROUP BY \"account-id\", \"action\", \"az-id\", \"bytes\", \"dstaddr\", \"dstport\", \"end\", \"flow-direction\", \"instance-id\", \"interface-id\", \"log-status\", \"packets\", \"pkt-dst-aws-service\", \"pkt-dstaddr\", \"pkt-src-aws-service\", \"pkt-srcaddr\", \"protocol\", \"region\", \"srcaddr\", \"srcport\", \"start\", \"sublocation-id\", \"sublocation-type\", \"subnet-id\", \"tcp-flags\", \"traffic-path\", \"type\", \"version\", \"vpc-id\";"""
        )

        assert VPCFLOW_PARQUET.columns == [
            {"Name": "time", "Type": "bigint"},
            {"Name": "timestamp", "Type": "timestamp"},
            {"Name": "version", "Type": "int"},
            {"Name": "account-id", "Type": "string"},
            {"Name": "interface-id", "Type": "string"},
            {"Name": "srcaddr", "Type": "string"},
            {"Name": "dstaddr", "Type": "string"},
            {"Name": "srcport", "Type": "int"},
            {"Name": "dstport", "Type": "int"},
            {"Name": "protocol", "Type": "bigint"},
            {"Name": "packets", "Type": "bigint"},
            {"Name": "bytes", "Type": "bigint"},
            {"Name": "start", "Type": "bigint"},
            {"Name": "end", "Type": "bigint"},
            {"Name": "action", "Type": "string"},
            {"Name": "log-status", "Type": "string"},
            {"Name": "vpc-id", "Type": "string"},
            {"Name": "subnet-id", "Type": "string"},
            {"Name": "instance-id", "Type": "string"},
            {"Name": "tcp-flags", "Type": "int"},
            {"Name": "type", "Type": "string"},
            {"Name": "pkt-srcaddr", "Type": "string"},
            {"Name": "pkt-dstaddr", "Type": "string"},
            {"Name": "az-id", "Type": "string"},
            {"Name": "sublocation-type", "Type": "string"},
            {"Name": "sublocation-id", "Type": "string"},
            {"Name": "pkt-src-aws-service", "Type": "string"},
            {"Name": "pkt-dst-aws-service", "Type": "string"},
            {"Name": "flow-direction", "Type": "string"},
            {"Name": "traffic-path", "Type": "int"},
        ]
        assert VPCFLOW_PARQUET.partition_keys == [
            {"Name": "event_hour", "Type": "string"},
            {"Name": "account_id", "Type": "string"},
            {"Name": "region", "Type": "string"},
            {"Name": "__execution_name__", "Type": "string"},
        ]
        assert VPCFLOW_PARQUET.partition_indexes == [
            {"IndexName": "IDX_EXECUTION_NAME", "Keys": ["__execution_name__"]},
            {
                "IndexName": "IDX_PARTITIONS",
                "Keys": ["event_hour", "account_id", "region"],
            },
        ]
        assert VPCFLOW_PARQUET.partition_info == collections.OrderedDict(
            [
                ("event_hour", {"type": "time", "from": "%Y%m%d%H", "to": "%Y%m%d00"}),
                ("account_id", {"type": "retain"}),
                ("region", {"type": "retain"}),
                (
                    "__execution_name__",
                    {
                        "type": "default",
                        "value": "00000000-0000-0000-0000-000000000000",
                    },
                ),
            ]
        )
        assert json.dumps(VPCFLOW_PARQUET.statements.create) == json.dumps(
            """CREATE EXTERNAL TABLE IF NOT EXISTS `{database}`.`{table_name}` (`time` bigint, `timestamp` timestamp, `version` int, `account-id` string, `interface-id` string, `srcaddr` string, `dstaddr` string, `srcport` int, `dstport` int, `protocol` bigint, `packets` bigint, `bytes` bigint, `start` bigint, `end` bigint, `action` string, `log-status` string, `vpc-id` string, `subnet-id` string, `instance-id` string, `tcp-flags` int, `type` string, `pkt-srcaddr` string, `pkt-dstaddr` string, `az-id` string, `sublocation-type` string, `sublocation-id` string, `pkt-src-aws-service` string, `pkt-dst-aws-service` string, `flow-direction` string, `traffic-path` int, `account_id` string, `region` string, `event_hour` string, `__execution_name__` string) PARTITIONED BY (`event_hour` string, `account_id` string, `region` string, `__execution_name__` string) ROW FORMAT SERDE 'org.apache.hadoop.hive.ql.io.parquet.serde.ParquetHiveSerDe'  STORED AS INPUTFORMAT 'org.apache.hadoop.hive.ql.io.parquet.MapredParquetInputFormat' OUTPUTFORMAT 'org.apache.hadoop.hive.ql.io.parquet.MapredParquetOutputFormat' LOCATION '{location}' ;"""
        )
        assert json.dumps(VPCFLOW_PARQUET.statements.insert) == json.dumps(
            """INSERT INTO \"{destination_database}\".\"{destination_table}\" (\"time\", \"timestamp\", \"version\", \"account-id\", \"interface-id\", \"srcaddr\", \"dstaddr\", \"srcport\", \"dstport\", \"protocol\", \"packets\", \"bytes\", \"start\", \"end\", \"action\", \"log-status\", \"vpc-id\", \"subnet-id\", \"instance-id\", \"tcp-flags\", \"type\", \"pkt-srcaddr\", \"pkt-dstaddr\", \"az-id\", \"sublocation-type\", \"sublocation-id\", \"pkt-src-aws-service\", \"pkt-dst-aws-service\", \"flow-direction\", \"traffic-path\", \"account_id\", \"region\", \"event_hour\", \"__execution_name__\") SELECT CAST(\"start\" * 1000 AS bigint), from_unixtime(\"start\"), \"version\", \"account-id\", \"interface-id\", \"srcaddr\", \"dstaddr\", \"srcport\", \"dstport\", \"protocol\", \"packets\", \"bytes\", \"start\", \"end\", \"action\", \"log-status\", \"vpc-id\", \"subnet-id\", \"instance-id\", \"tcp-flags\", \"type\", \"pkt-srcaddr\", \"pkt-dstaddr\", \"az-id\", \"sublocation-type\", \"sublocation-id\", \"pkt-src-aws-service\", \"pkt-dst-aws-service\", \"flow-direction\", \"traffic-path\", \"account-id\", \"region\", date_format(from_unixtime(\"start\"), '%Y%m%d%H'), '{{}}' FROM \"{source_database}\".\"{source_table}\" ;"""
        )
        assert json.dumps(VPCFLOW_PARQUET.statements.drop) == json.dumps(
            """DROP TABLE IF EXISTS `{database}`.`{table_name}`"""
        )
        assert json.dumps(VPCFLOW_PARQUET.statements.aggregate) == json.dumps(
            """INSERT INTO \"{destination_database}\".\"{destination_table}\" (\"time\", \"timestamp\", \"version\", \"account-id\", \"interface-id\", \"srcaddr\", \"dstaddr\", \"srcport\", \"dstport\", \"protocol\", \"packets\", \"bytes\", \"start\", \"end\", \"action\", \"log-status\", \"vpc-id\", \"subnet-id\", \"instance-id\", \"tcp-flags\", \"type\", \"pkt-srcaddr\", \"pkt-dstaddr\", \"az-id\", \"sublocation-type\", \"sublocation-id\", \"pkt-src-aws-service\", \"pkt-dst-aws-service\", \"flow-direction\", \"traffic-path\", \"account_id\", \"region\", \"event_hour\", \"__execution_name__\") SELECT CAST(\"start\" * 1000 AS bigint), from_unixtime(\"start\"), \"version\", \"account-id\", \"interface-id\", \"srcaddr\", \"dstaddr\", \"srcport\", \"dstport\", \"protocol\", \"packets\", \"bytes\", \"start\", \"end\", \"action\", \"log-status\", \"vpc-id\", \"subnet-id\", \"instance-id\", \"tcp-flags\", \"type\", \"pkt-srcaddr\", \"pkt-dstaddr\", \"az-id\", \"sublocation-type\", \"sublocation-id\", \"pkt-src-aws-service\", \"pkt-dst-aws-service\", \"flow-direction\", \"traffic-path\", \"account-id\", \"region\", date_format(from_unixtime(\"start\"), '%Y%m%d%H'), '{{}}' FROM \"{source_database}\".\"{source_table}\" WHERE __execution_name__ = '{execution_name}' GROUP BY CAST(\"start\" * 1000 AS bigint), from_unixtime(\"start\"), \"version\", \"account-id\", \"interface-id\", \"srcaddr\", \"dstaddr\", \"srcport\", \"dstport\", \"protocol\", \"packets\", \"bytes\", \"start\", \"end\", \"action\", \"log-status\", \"vpc-id\", \"subnet-id\", \"instance-id\", \"tcp-flags\", \"type\", \"pkt-srcaddr\", \"pkt-dstaddr\", \"az-id\", \"sublocation-type\", \"sublocation-id\", \"pkt-src-aws-service\", \"pkt-dst-aws-service\", \"flow-direction\", \"traffic-path\", \"account-id\", \"region\", date_format(from_unixtime(\"start\"), '%Y%m%d%H'), '{{}}';"""
        )

        assert VPCFLOW_METRICS.columns == [
            {"Name": "time", "Type": "bigint"},
            {"Name": "timestamp", "Type": "timestamp"},
            {"Name": "account-id", "Type": "string"},
            {"Name": "vpc-id", "Type": "string"},
            {"Name": "subnet-id", "Type": "string"},
            {"Name": "flow-direction", "Type": "string"},
            {"Name": "traffic-path", "Type": "int"},
            {"Name": "type", "Type": "string"},
            {"Name": "action", "Type": "string"},
            {"Name": "srcaddr", "Type": "string"},
            {"Name": "dstaddr", "Type": "string"},
            {"Name": "pkt-src-aws-service", "Type": "string"},
            {"Name": "pkt-dst-aws-service", "Type": "string"},
            {"Name": "protocol", "Type": "bigint"},
            {"Name": "packets", "Type": "bigint"},
            {"Name": "bytes", "Type": "bigint"},
            {"Name": "requests", "Type": "bigint"},
        ]
        assert VPCFLOW_METRICS.partition_keys == [
            {"Name": "event_hour", "Type": "string"},
            {"Name": "account_id", "Type": "string"},
            {"Name": "region", "Type": "string"},
            {"Name": "__execution_name__", "Type": "string"},
        ]
        assert VPCFLOW_METRICS.partition_indexes == [
            {"IndexName": "IDX_EXECUTION_NAME", "Keys": ["__execution_name__"]},
            {
                "IndexName": "IDX_PARTITIONS",
                "Keys": ["event_hour", "account_id", "region"],
            },
        ]
        assert VPCFLOW_METRICS.partition_info == collections.OrderedDict(
            [
                ("event_hour", {"type": "time", "from": "%Y%m%d%H", "to": "%Y%m%d00"}),
                ("account_id", {"type": "retain"}),
                ("region", {"type": "retain"}),
                (
                    "__execution_name__",
                    {
                        "type": "default",
                        "value": "00000000-0000-0000-0000-000000000000",
                    },
                ),
            ]
        )
        assert json.dumps(VPCFLOW_METRICS.statements.create) == json.dumps(
            """CREATE EXTERNAL TABLE IF NOT EXISTS `{database}`.`{table_name}` (`time` bigint, `timestamp` timestamp, `account-id` string, `vpc-id` string, `subnet-id` string, `flow-direction` string, `traffic-path` int, `type` string, `action` string, `srcaddr` string, `dstaddr` string, `pkt-src-aws-service` string, `pkt-dst-aws-service` string, `protocol` bigint, `packets` bigint, `bytes` bigint, `requests` bigint, `account_id` string, `region` string, `event_hour` string, `__execution_name__` string) PARTITIONED BY (`event_hour` string, `account_id` string, `region` string, `__execution_name__` string) ROW FORMAT SERDE 'org.apache.hadoop.hive.ql.io.parquet.serde.ParquetHiveSerDe'  STORED AS INPUTFORMAT 'org.apache.hadoop.hive.ql.io.parquet.MapredParquetInputFormat' OUTPUTFORMAT 'org.apache.hadoop.hive.ql.io.parquet.MapredParquetOutputFormat' LOCATION '{location}' ;"""
        )
        assert json.dumps(VPCFLOW_METRICS.statements.insert) == json.dumps(
            """INSERT INTO \"{destination_database}\".\"{destination_table}\" (\"time\", \"timestamp\", \"account-id\", \"vpc-id\", \"subnet-id\", \"flow-direction\", \"traffic-path\", \"type\", \"action\", \"srcaddr\", \"dstaddr\", \"pkt-src-aws-service\", \"pkt-dst-aws-service\", \"protocol\", \"packets\", \"bytes\", \"requests\", \"account_id\", \"region\", \"event_hour\", \"__execution_name__\") SELECT FLOOR(\"time\" / 60000) * 60000, DATE_TRUNC('minute', \"timestamp\"), \"account-id\", \"vpc-id\", \"subnet-id\", \"flow-direction\", \"traffic-path\", \"type\", \"action\", \"srcaddr\", \"dstaddr\", \"pkt-src-aws-service\", \"pkt-dst-aws-service\", \"protocol\", CAST(SUM(\"packets\") AS DOUBLE), CAST(SUM(\"packets\") AS DOUBLE), CAST(COUNT(1) AS bigint), \"account_id\", \"region\", \"event_hour\", \"__execution_name__\" FROM \"{source_database}\".\"{source_table}\" ;"""
        )
        assert json.dumps(VPCFLOW_METRICS.statements.drop) == json.dumps(
            """DROP TABLE IF EXISTS `{database}`.`{table_name}`"""
        )
        assert json.dumps(VPCFLOW_METRICS.statements.aggregate) == json.dumps(
            """INSERT INTO \"{destination_database}\".\"{destination_table}\" (\"time\", \"timestamp\", \"account-id\", \"vpc-id\", \"subnet-id\", \"flow-direction\", \"traffic-path\", \"type\", \"action\", \"srcaddr\", \"dstaddr\", \"pkt-src-aws-service\", \"pkt-dst-aws-service\", \"protocol\", \"packets\", \"bytes\", \"requests\", \"account_id\", \"region\", \"event_hour\", \"__execution_name__\") SELECT FLOOR(\"time\" / 60000) * 60000, DATE_TRUNC('minute', \"timestamp\"), \"account-id\", \"vpc-id\", \"subnet-id\", \"flow-direction\", \"traffic-path\", \"type\", \"action\", \"srcaddr\", \"dstaddr\", \"pkt-src-aws-service\", \"pkt-dst-aws-service\", \"protocol\", CAST(SUM(\"packets\") AS DOUBLE), CAST(SUM(\"packets\") AS DOUBLE), CAST(COUNT(1) AS bigint), \"account_id\", \"region\", \"event_hour\", \"__execution_name__\" FROM \"{source_database}\".\"{source_table}\" WHERE __execution_name__ = '{execution_name}' GROUP BY FLOOR(\"time\" / 60000) * 60000, DATE_TRUNC('minute', \"timestamp\"), \"account-id\", \"vpc-id\", \"subnet-id\", \"flow-direction\", \"traffic-path\", \"type\", \"action\", \"srcaddr\", \"dstaddr\", \"pkt-src-aws-service\", \"pkt-dst-aws-service\", \"protocol\", \"account_id\", \"region\", \"event_hour\", \"__execution_name__\";"""
        )

    def test_s3(
        self,
    ):
        from utils.aws.glue.table import TableMetaData
        from pipeline_resources_builder.logschema import S3_RAW, S3_PARQUET, S3_METRICS

        assert isinstance(S3_RAW, TableMetaData) is True
        assert isinstance(S3_PARQUET, TableMetaData) is True
        assert isinstance(S3_METRICS, TableMetaData) is True

        assert S3_RAW.columns == [
            {"Name": "bucket_owner", "Type": "string"},
            {"Name": "bucket", "Type": "string"},
            {"Name": "timestamp", "Type": "string"},
            {"Name": "remote_ip", "Type": "string"},
            {"Name": "requester", "Type": "string"},
            {"Name": "request_id", "Type": "string"},
            {"Name": "operation", "Type": "string"},
            {"Name": "key", "Type": "string"},
            {"Name": "request_uri", "Type": "string"},
            {"Name": "http_status", "Type": "int"},
            {"Name": "error_code", "Type": "string"},
            {"Name": "bytes_sent", "Type": "string"},
            {"Name": "object_size", "Type": "string"},
            {"Name": "total_time", "Type": "string"},
            {"Name": "turn_around_time", "Type": "string"},
            {"Name": "referrer", "Type": "string"},
            {"Name": "user_agent", "Type": "string"},
            {"Name": "version_id", "Type": "string"},
            {"Name": "host_id", "Type": "string"},
            {"Name": "signature_version", "Type": "string"},
            {"Name": "cipher_suite", "Type": "string"},
            {"Name": "authentication_type", "Type": "string"},
            {"Name": "host_header", "Type": "string"},
            {"Name": "tls_version", "Type": "string"},
            {"Name": "access_point_arn", "Type": "string"},
            {"Name": "acl_required", "Type": "string"},
        ]
        assert S3_RAW.partition_keys == []
        assert S3_RAW.partition_indexes == []
        assert S3_RAW.partition_info == {}
        assert json.dumps(S3_RAW.statements.create) == json.dumps(
            """CREATE EXTERNAL TABLE IF NOT EXISTS `{database}`.`{table_name}` (`bucket_owner` string, `bucket` string, `timestamp` string, `remote_ip` string, `requester` string, `request_id` string, `operation` string, `key` string, `request_uri` string, `http_status` int, `error_code` string, `bytes_sent` string, `object_size` string, `total_time` string, `turn_around_time` string, `referrer` string, `user_agent` string, `version_id` string, `host_id` string, `signature_version` string, `cipher_suite` string, `authentication_type` string, `host_header` string, `tls_version` string, `access_point_arn` string, `acl_required` string)  ROW FORMAT SERDE 'org.apache.hadoop.hive.serde2.RegexSerDe' WITH SERDEPROPERTIES ('input.regex'='^([^ ]*) ([^ ]*) \\\\[(.*?)\\\\] ([^ ]*) ([^ ]*) ([^ ]*) ([^ ]*) ([^ ]*) (\"[^\"]*\"|-) (-|[0-9]*) ([^ ]*) ([^ ]*) ([^ ]*) ([^ ]*) ([^ ]*) ([^ ]*) (\"[^\"]*\"|-) ([^ ]*)(?: ([^ ]*) ([^ ]*) ([^ ]*) ([^ ]*) ([^ ]*) ([^ ]*) ([^ ]*) (-|Yes))?.*$') STORED AS INPUTFORMAT 'org.apache.hadoop.mapred.TextInputFormat' OUTPUTFORMAT 'org.apache.hadoop.hive.ql.io.HiveIgnoreKeyTextOutputFormat' LOCATION '{location}' ;"""
        )
        assert json.dumps(S3_RAW.statements.insert) == json.dumps(
            """INSERT INTO \"{destination_database}\".\"{destination_table}\" (\"bucket_owner\", \"bucket\", \"timestamp\", \"remote_ip\", \"requester\", \"request_id\", \"operation\", \"key\", \"request_uri\", \"http_status\", \"error_code\", \"bytes_sent\", \"object_size\", \"total_time\", \"turn_around_time\", \"referrer\", \"user_agent\", \"version_id\", \"host_id\", \"signature_version\", \"cipher_suite\", \"authentication_type\", \"host_header\", \"tls_version\", \"access_point_arn\", \"acl_required\") SELECT \"bucket_owner\", \"bucket\", \"timestamp\", \"remote_ip\", \"requester\", \"request_id\", \"operation\", \"key\", \"request_uri\", \"http_status\", \"error_code\", \"bytes_sent\", \"object_size\", \"total_time\", \"turn_around_time\", \"referrer\", \"user_agent\", \"version_id\", \"host_id\", \"signature_version\", \"cipher_suite\", \"authentication_type\", \"host_header\", \"tls_version\", \"access_point_arn\", \"acl_required\" FROM \"{source_database}\".\"{source_table}\" ;"""
        )
        assert json.dumps(S3_RAW.statements.drop) == json.dumps(
            """DROP TABLE IF EXISTS `{database}`.`{table_name}`"""
        )
        assert json.dumps(S3_RAW.statements.aggregate) == json.dumps(
            """INSERT INTO \"{destination_database}\".\"{destination_table}\" (\"bucket_owner\", \"bucket\", \"timestamp\", \"remote_ip\", \"requester\", \"request_id\", \"operation\", \"key\", \"request_uri\", \"http_status\", \"error_code\", \"bytes_sent\", \"object_size\", \"total_time\", \"turn_around_time\", \"referrer\", \"user_agent\", \"version_id\", \"host_id\", \"signature_version\", \"cipher_suite\", \"authentication_type\", \"host_header\", \"tls_version\", \"access_point_arn\", \"acl_required\") SELECT \"bucket_owner\", \"bucket\", \"timestamp\", \"remote_ip\", \"requester\", \"request_id\", \"operation\", \"key\", \"request_uri\", \"http_status\", \"error_code\", \"bytes_sent\", \"object_size\", \"total_time\", \"turn_around_time\", \"referrer\", \"user_agent\", \"version_id\", \"host_id\", \"signature_version\", \"cipher_suite\", \"authentication_type\", \"host_header\", \"tls_version\", \"access_point_arn\", \"acl_required\" FROM \"{source_database}\".\"{source_table}\" WHERE __execution_name__ = '{execution_name}' GROUP BY \"bucket_owner\", \"bucket\", \"timestamp\", \"remote_ip\", \"requester\", \"request_id\", \"operation\", \"key\", \"request_uri\", \"http_status\", \"error_code\", \"bytes_sent\", \"object_size\", \"total_time\", \"turn_around_time\", \"referrer\", \"user_agent\", \"version_id\", \"host_id\", \"signature_version\", \"cipher_suite\", \"authentication_type\", \"host_header\", \"tls_version\", \"access_point_arn\", \"acl_required\";"""
        )

        assert S3_PARQUET.columns == [
            {"Name": "time", "Type": "bigint"},
            {"Name": "timestamp", "Type": "timestamp"},
            {"Name": "bucket_owner", "Type": "string"},
            {"Name": "bucket", "Type": "string"},
            {"Name": "remote_ip", "Type": "string"},
            {"Name": "requester", "Type": "string"},
            {"Name": "request_id", "Type": "string"},
            {"Name": "operation", "Type": "string"},
            {"Name": "key", "Type": "string"},
            {"Name": "request_uri", "Type": "string"},
            {"Name": "http_status_group", "Type": "string"},
            {"Name": "http_status", "Type": "int"},
            {"Name": "error_code", "Type": "string"},
            {"Name": "bytes_sent", "Type": "double"},
            {"Name": "object_size", "Type": "double"},
            {"Name": "total_time", "Type": "double"},
            {"Name": "turn_around_time", "Type": "double"},
            {"Name": "referrer", "Type": "string"},
            {"Name": "user_agent", "Type": "string"},
            {"Name": "version_id", "Type": "string"},
            {"Name": "host_id", "Type": "string"},
            {"Name": "signature_version", "Type": "string"},
            {"Name": "cipher_suite", "Type": "string"},
            {"Name": "authentication_type", "Type": "string"},
            {"Name": "host_header", "Type": "string"},
            {"Name": "tls_version", "Type": "string"},
            {"Name": "access_point_arn", "Type": "string"},
            {"Name": "acl_required", "Type": "string"},
        ]
        assert S3_PARQUET.partition_keys == [
            {"Name": "event_hour", "Type": "string"},
            {"Name": "__execution_name__", "Type": "string"},
        ]
        assert S3_PARQUET.partition_indexes == [
            {"IndexName": "IDX_EXECUTION_NAME", "Keys": ["__execution_name__"]},
            {"IndexName": "IDX_PARTITIONS", "Keys": ["event_hour"]},
        ]
        assert S3_PARQUET.partition_info == collections.OrderedDict(
            [
                ("event_hour", {"type": "time", "from": "%Y%m%d%H", "to": "%Y%m%d00"}),
                (
                    "__execution_name__",
                    {
                        "type": "default",
                        "value": "00000000-0000-0000-0000-000000000000",
                    },
                ),
            ]
        )
        assert json.dumps(S3_PARQUET.statements.create) == json.dumps(
            """CREATE EXTERNAL TABLE IF NOT EXISTS `{database}`.`{table_name}` (`time` bigint, `timestamp` timestamp, `bucket_owner` string, `bucket` string, `remote_ip` string, `requester` string, `request_id` string, `operation` string, `key` string, `request_uri` string, `http_status_group` string, `http_status` int, `error_code` string, `bytes_sent` double, `object_size` double, `total_time` double, `turn_around_time` double, `referrer` string, `user_agent` string, `version_id` string, `host_id` string, `signature_version` string, `cipher_suite` string, `authentication_type` string, `host_header` string, `tls_version` string, `access_point_arn` string, `acl_required` string, `event_hour` string, `__execution_name__` string) PARTITIONED BY (`event_hour` string, `__execution_name__` string) ROW FORMAT SERDE 'org.apache.hadoop.hive.ql.io.parquet.serde.ParquetHiveSerDe'  STORED AS INPUTFORMAT 'org.apache.hadoop.hive.ql.io.parquet.MapredParquetInputFormat' OUTPUTFORMAT 'org.apache.hadoop.hive.ql.io.parquet.MapredParquetOutputFormat' LOCATION '{location}' ;"""
        )
        assert json.dumps(S3_PARQUET.statements.insert) == json.dumps(
            """INSERT INTO \"{destination_database}\".\"{destination_table}\" (\"time\", \"timestamp\", \"bucket_owner\", \"bucket\", \"remote_ip\", \"requester\", \"request_id\", \"operation\", \"key\", \"request_uri\", \"http_status_group\", \"http_status\", \"error_code\", \"bytes_sent\", \"object_size\", \"total_time\", \"turn_around_time\", \"referrer\", \"user_agent\", \"version_id\", \"host_id\", \"signature_version\", \"cipher_suite\", \"authentication_type\", \"host_header\", \"tls_version\", \"access_point_arn\", \"acl_required\", \"event_hour\", \"__execution_name__\") SELECT CAST(to_unixtime(parse_datetime(timestamp, 'dd/MMM/yyyy:HH:mm:ss Z')) * 1000 AS bigint), parse_datetime(timestamp, 'dd/MMM/yyyy:HH:mm:ss Z'), \"bucket_owner\", \"bucket\", \"remote_ip\", \"requester\", \"request_id\", \"operation\", \"key\", \"request_uri\", CASE WHEN http_status BETWEEN 100 AND 199 THEN '1xx' WHEN http_status BETWEEN 200 AND 299 THEN '2xx' WHEN http_status BETWEEN 300 AND 399 THEN '3xx' WHEN http_status BETWEEN 400 AND 499 THEN '4xx' WHEN http_status BETWEEN 500 AND 599 THEN '5xx' ELSE '-' END, \"http_status\", \"error_code\", case when bytes_sent = '-' then 0.0 else cast(bytes_sent as double) end, case when object_size = '-' then 0.0 else cast(object_size as double) end, case when total_time = '-' then 0.0 else cast(total_time as double) end, case when turn_around_time = '-' then 0.0 else cast(turn_around_time as double) end, \"referrer\", \"user_agent\", \"version_id\", \"host_id\", \"signature_version\", \"cipher_suite\", \"authentication_type\", \"host_header\", \"tls_version\", \"access_point_arn\", \"acl_required\", date_format(parse_datetime(timestamp, 'dd/MMM/yyyy:HH:mm:ss Z'), '%Y%m%d%H'), '{{}}' FROM \"{source_database}\".\"{source_table}\" ;"""
        )
        assert json.dumps(S3_PARQUET.statements.drop) == json.dumps(
            """DROP TABLE IF EXISTS `{database}`.`{table_name}`"""
        )
        assert json.dumps(S3_PARQUET.statements.aggregate) == json.dumps(
            """INSERT INTO \"{destination_database}\".\"{destination_table}\" (\"time\", \"timestamp\", \"bucket_owner\", \"bucket\", \"remote_ip\", \"requester\", \"request_id\", \"operation\", \"key\", \"request_uri\", \"http_status_group\", \"http_status\", \"error_code\", \"bytes_sent\", \"object_size\", \"total_time\", \"turn_around_time\", \"referrer\", \"user_agent\", \"version_id\", \"host_id\", \"signature_version\", \"cipher_suite\", \"authentication_type\", \"host_header\", \"tls_version\", \"access_point_arn\", \"acl_required\", \"event_hour\", \"__execution_name__\") SELECT CAST(to_unixtime(parse_datetime(timestamp, 'dd/MMM/yyyy:HH:mm:ss Z')) * 1000 AS bigint), parse_datetime(timestamp, 'dd/MMM/yyyy:HH:mm:ss Z'), \"bucket_owner\", \"bucket\", \"remote_ip\", \"requester\", \"request_id\", \"operation\", \"key\", \"request_uri\", CASE WHEN http_status BETWEEN 100 AND 199 THEN '1xx' WHEN http_status BETWEEN 200 AND 299 THEN '2xx' WHEN http_status BETWEEN 300 AND 399 THEN '3xx' WHEN http_status BETWEEN 400 AND 499 THEN '4xx' WHEN http_status BETWEEN 500 AND 599 THEN '5xx' ELSE '-' END, \"http_status\", \"error_code\", case when bytes_sent = '-' then 0.0 else cast(bytes_sent as double) end, case when object_size = '-' then 0.0 else cast(object_size as double) end, case when total_time = '-' then 0.0 else cast(total_time as double) end, case when turn_around_time = '-' then 0.0 else cast(turn_around_time as double) end, \"referrer\", \"user_agent\", \"version_id\", \"host_id\", \"signature_version\", \"cipher_suite\", \"authentication_type\", \"host_header\", \"tls_version\", \"access_point_arn\", \"acl_required\", date_format(parse_datetime(timestamp, 'dd/MMM/yyyy:HH:mm:ss Z'), '%Y%m%d%H'), '{{}}' FROM \"{source_database}\".\"{source_table}\" WHERE __execution_name__ = '{execution_name}' GROUP BY CAST(to_unixtime(parse_datetime(timestamp, 'dd/MMM/yyyy:HH:mm:ss Z')) * 1000 AS bigint), parse_datetime(timestamp, 'dd/MMM/yyyy:HH:mm:ss Z'), \"bucket_owner\", \"bucket\", \"remote_ip\", \"requester\", \"request_id\", \"operation\", \"key\", \"request_uri\", CASE WHEN http_status BETWEEN 100 AND 199 THEN '1xx' WHEN http_status BETWEEN 200 AND 299 THEN '2xx' WHEN http_status BETWEEN 300 AND 399 THEN '3xx' WHEN http_status BETWEEN 400 AND 499 THEN '4xx' WHEN http_status BETWEEN 500 AND 599 THEN '5xx' ELSE '-' END, \"http_status\", \"error_code\", case when bytes_sent = '-' then 0.0 else cast(bytes_sent as double) end, case when object_size = '-' then 0.0 else cast(object_size as double) end, case when total_time = '-' then 0.0 else cast(total_time as double) end, case when turn_around_time = '-' then 0.0 else cast(turn_around_time as double) end, \"referrer\", \"user_agent\", \"version_id\", \"host_id\", \"signature_version\", \"cipher_suite\", \"authentication_type\", \"host_header\", \"tls_version\", \"access_point_arn\", \"acl_required\", date_format(parse_datetime(timestamp, 'dd/MMM/yyyy:HH:mm:ss Z'), '%Y%m%d%H'), '{{}}';"""
        )

        assert S3_METRICS.columns == [
            {"Name": "time", "Type": "bigint"},
            {"Name": "timestamp", "Type": "timestamp"},
            {"Name": "bucket", "Type": "string"},
            {"Name": "remote_ip", "Type": "string"},
            {"Name": "operation", "Type": "string"},
            {"Name": "http_status_group", "Type": "string"},
            {"Name": "http_status", "Type": "int"},
            {"Name": "bytes_sent", "Type": "double"},
            {"Name": "object_size", "Type": "double"},
            {"Name": "total_time", "Type": "double"},
            {"Name": "turn_around_time", "Type": "double"},
            {"Name": "requests", "Type": "bigint"},
        ]
        assert S3_METRICS.partition_keys == [
            {"Name": "event_hour", "Type": "string"},
            {"Name": "__execution_name__", "Type": "string"},
        ]
        assert S3_METRICS.partition_indexes == [
            {"IndexName": "IDX_EXECUTION_NAME", "Keys": ["__execution_name__"]},
            {"IndexName": "IDX_PARTITIONS", "Keys": ["event_hour"]},
        ]
        assert S3_METRICS.partition_info == collections.OrderedDict(
            [
                ("event_hour", {"type": "time", "from": "%Y%m%d%H", "to": "%Y%m%d00"}),
                (
                    "__execution_name__",
                    {
                        "type": "default",
                        "value": "00000000-0000-0000-0000-000000000000",
                    },
                ),
            ]
        )
        assert json.dumps(S3_METRICS.statements.create) == json.dumps(
            """CREATE EXTERNAL TABLE IF NOT EXISTS `{database}`.`{table_name}` (`time` bigint, `timestamp` timestamp, `bucket` string, `remote_ip` string, `operation` string, `http_status_group` string, `http_status` int, `bytes_sent` double, `object_size` double, `total_time` double, `turn_around_time` double, `requests` bigint, `event_hour` string, `__execution_name__` string) PARTITIONED BY (`event_hour` string, `__execution_name__` string) ROW FORMAT SERDE 'org.apache.hadoop.hive.ql.io.parquet.serde.ParquetHiveSerDe'  STORED AS INPUTFORMAT 'org.apache.hadoop.hive.ql.io.parquet.MapredParquetInputFormat' OUTPUTFORMAT 'org.apache.hadoop.hive.ql.io.parquet.MapredParquetOutputFormat' LOCATION '{location}' ;"""
        )
        assert json.dumps(S3_METRICS.statements.insert) == json.dumps(
            """INSERT INTO \"{destination_database}\".\"{destination_table}\" (\"time\", \"timestamp\", \"bucket\", \"remote_ip\", \"operation\", \"http_status_group\", \"http_status\", \"bytes_sent\", \"object_size\", \"total_time\", \"turn_around_time\", \"requests\", \"event_hour\", \"__execution_name__\") SELECT FLOOR(\"time\" / 60000) * 60000, DATE_TRUNC('minute', \"timestamp\"), \"bucket\", \"remote_ip\", \"operation\", \"http_status_group\", \"http_status\", CAST(SUM(bytes_sent) AS DOUBLE), CAST(SUM(object_size) AS DOUBLE), CAST(SUM(total_time) AS DOUBLE), CAST(SUM(turn_around_time) AS DOUBLE), CAST(COUNT(1) AS bigint), \"event_hour\", \"__execution_name__\" FROM \"{source_database}\".\"{source_table}\" ;"""
        )
        assert json.dumps(S3_METRICS.statements.drop) == json.dumps(
            """DROP TABLE IF EXISTS `{database}`.`{table_name}`"""
        )
        assert json.dumps(S3_METRICS.statements.aggregate) == json.dumps(
            """INSERT INTO \"{destination_database}\".\"{destination_table}\" (\"time\", \"timestamp\", \"bucket\", \"remote_ip\", \"operation\", \"http_status_group\", \"http_status\", \"bytes_sent\", \"object_size\", \"total_time\", \"turn_around_time\", \"requests\", \"event_hour\", \"__execution_name__\") SELECT FLOOR(\"time\" / 60000) * 60000, DATE_TRUNC('minute', \"timestamp\"), \"bucket\", \"remote_ip\", \"operation\", \"http_status_group\", \"http_status\", CAST(SUM(bytes_sent) AS DOUBLE), CAST(SUM(object_size) AS DOUBLE), CAST(SUM(total_time) AS DOUBLE), CAST(SUM(turn_around_time) AS DOUBLE), CAST(COUNT(1) AS bigint), \"event_hour\", \"__execution_name__\" FROM \"{source_database}\".\"{source_table}\" WHERE __execution_name__ = '{execution_name}' GROUP BY FLOOR(\"time\" / 60000) * 60000, DATE_TRUNC('minute', \"timestamp\"), \"bucket\", \"remote_ip\", \"operation\", \"http_status_group\", \"http_status\", \"event_hour\", \"__execution_name__\";"""
        )

    def test_ses(
        self,
    ):
        from utils.aws.glue.table import TableMetaData
        from pipeline_resources_builder.logschema import (
            SES_RAW,
            SES_PARQUET,
            SES_METRICS,
        )

        assert isinstance(SES_RAW, TableMetaData) is True
        assert isinstance(SES_PARQUET, TableMetaData) is True
        assert isinstance(SES_METRICS, TableMetaData) is True

        assert SES_RAW.columns == [
            {
                "Name": "delivery",
                "Type": "struct<smtpResponse:string,processingTimeMillis:int,reportingMTA:string,recipients:array<string>,timestamp:string>",
            },
            {
                "Name": "mail",
                "Type": "struct<sourceArn:string,headers:array<struct<name:string,value:string>>,sendingAccountId:string,destination:array<string>,headersTruncated:boolean,messageId:string,source:string,timestamp:string,commonHeaders:struct<messageId:string,from:array<string>,to:array<string>,subject:string>,tags:struct<scenes:array<string>,tagId:array<string>>>",
            },
            {
                "Name": "complaint",
                "Type": "struct<feedbackId:string,complainedRecipients:array<struct<emailAddress:string>>,userAgent:string,complaintFeedbackType:string,timestamp:string,arrivalDate:string>",
            },
            {
                "Name": "bounce",
                "Type": "struct<bounceSubType:string,feedbackId:string,reportingMTA:string,bounceType:string,bouncedRecipients:array<struct<action:string,emailAddress:string,diagnosticCode:string,status:string>>,timestamp:string>",
            },
            {"Name": "reject", "Type": "struct<reason:string>"},
            {
                "Name": "failure",
                "Type": "struct<errorMessage:string,templateName:string>",
            },
            {"Name": "eventType", "Type": "string"},
            {
                "Name": "subscription",
                "Type": "struct<contactList:string,source:string,oldTopicPreferences:struct<topicSubscriptionStatus:array<struct<subscriptionStatus:string,topicName:string>>,unsubscribeAll:boolean>,newTopicPreferences:struct<topicSubscriptionStatus:array<struct<subscriptionStatus:string,topicName:string>>,unsubscribeAll:boolean>,timestamp:string>",
            },
            {
                "Name": "click",
                "Type": "struct<ipAddress:string,link:string,userAgent:string,linkTags:struct<samplekey0:array<string>,samplekey1:array<string>>,timestamp:string>",
            },
            {
                "Name": "open",
                "Type": "struct<ipAddress:string,userAgent:string,timestamp:string>",
            },
            {
                "Name": "deliveryDelay",
                "Type": "struct<expirationTime:string,delayedRecipients:array<struct<diagnosticCode:string,emailAddress:string,status:string>>,timestamp:string,delayType:string>",
            },
        ]
        assert SES_RAW.partition_keys == []
        assert SES_RAW.partition_indexes == []
        assert SES_RAW.partition_info == {}
        assert json.dumps(SES_RAW.statements.create) == json.dumps(
            """CREATE EXTERNAL TABLE IF NOT EXISTS `{database}`.`{table_name}` (`delivery` struct<`smtpResponse`:string,`processingTimeMillis`:int,`reportingMTA`:string,`recipients`:array<string>,`timestamp`:string>, `mail` struct<`sourceArn`:string,`headers`:array<struct<`name`:string,`value`:string>>,`sendingAccountId`:string,`destination`:array<string>,`headersTruncated`:boolean,`messageId`:string,`source`:string,`timestamp`:string,`commonHeaders`:struct<`messageId`:string,`from`:array<string>,`to`:array<string>,`subject`:string>,`tags`:struct<`scenes`:array<string>,`tagId`:array<string>>>, `complaint` struct<`feedbackId`:string,`complainedRecipients`:array<struct<`emailAddress`:string>>,`userAgent`:string,`complaintFeedbackType`:string,`timestamp`:string,`arrivalDate`:string>, `bounce` struct<`bounceSubType`:string,`feedbackId`:string,`reportingMTA`:string,`bounceType`:string,`bouncedRecipients`:array<struct<`action`:string,`emailAddress`:string,`diagnosticCode`:string,`status`:string>>,`timestamp`:string>, `reject` struct<`reason`:string>, `failure` struct<`errorMessage`:string,`templateName`:string>, `eventType` string, `subscription` struct<`contactList`:string,`source`:string,`oldTopicPreferences`:struct<`topicSubscriptionStatus`:array<struct<`subscriptionStatus`:string,`topicName`:string>>,`unsubscribeAll`:boolean>,`newTopicPreferences`:struct<`topicSubscriptionStatus`:array<struct<`subscriptionStatus`:string,`topicName`:string>>,`unsubscribeAll`:boolean>,`timestamp`:string>, `click` struct<`ipAddress`:string,`link`:string,`userAgent`:string,`linkTags`:struct<`samplekey0`:array<string>,`samplekey1`:array<string>>,`timestamp`:string>, `open` struct<`ipAddress`:string,`userAgent`:string,`timestamp`:string>, `deliveryDelay` struct<`expirationTime`:string,`delayedRecipients`:array<struct<`diagnosticCode`:string,`emailAddress`:string,`status`:string>>,`timestamp`:string,`delayType`:string>)  ROW FORMAT SERDE 'org.openx.data.jsonserde.JsonSerDe'  STORED AS INPUTFORMAT 'org.apache.hadoop.mapred.TextInputFormat' OUTPUTFORMAT 'org.apache.hadoop.hive.ql.io.HiveIgnoreKeyTextOutputFormat' LOCATION '{location}' ;"""
        )
        assert json.dumps(SES_RAW.statements.insert) == json.dumps(
            """INSERT INTO \"{destination_database}\".\"{destination_table}\" (\"delivery\", \"mail\", \"complaint\", \"bounce\", \"reject\", \"failure\", \"eventType\", \"subscription\", \"click\", \"open\", \"deliveryDelay\") SELECT \"delivery\", \"mail\", \"complaint\", \"bounce\", \"reject\", \"failure\", \"eventType\", \"subscription\", \"click\", \"open\", \"deliveryDelay\" FROM \"{source_database}\".\"{source_table}\" ;"""
        )
        assert json.dumps(SES_RAW.statements.drop) == json.dumps(
            """DROP TABLE IF EXISTS `{database}`.`{table_name}`"""
        )
        assert json.dumps(SES_RAW.statements.aggregate) == json.dumps(
            """INSERT INTO \"{destination_database}\".\"{destination_table}\" (\"delivery\", \"mail\", \"complaint\", \"bounce\", \"reject\", \"failure\", \"eventType\", \"subscription\", \"click\", \"open\", \"deliveryDelay\") SELECT \"delivery\", \"mail\", \"complaint\", \"bounce\", \"reject\", \"failure\", \"eventType\", \"subscription\", \"click\", \"open\", \"deliveryDelay\" FROM \"{source_database}\".\"{source_table}\" WHERE __execution_name__ = '{execution_name}' GROUP BY \"delivery\", \"mail\", \"complaint\", \"bounce\", \"reject\", \"failure\", \"eventType\", \"subscription\", \"click\", \"open\", \"deliveryDelay\";"""
        )

        assert SES_PARQUET.columns == [
            {"Name": "time", "Type": "bigint"},
            {"Name": "timestamp", "Type": "timestamp"},
            {"Name": "tagId", "Type": "string"},
            {"Name": "subject", "Type": "string"},
            {"Name": "source", "Type": "string"},
            {"Name": "sender", "Type": "array<string>"},
            {"Name": "recipient", "Type": "array<string>"},
            {"Name": "eventType", "Type": "string"},
            {
                "Name": "mail",
                "Type": "struct<sourceArn:string,headers:array<struct<name:string,value:string>>,sendingAccountId:string,destination:array<string>,headersTruncated:boolean,messageId:string,source:string,timestamp:string,commonHeaders:struct<messageId:string,from:array<string>,to:array<string>,subject:string>,tags:struct<scenes:array<string>,tagId:array<string>>>",
            },
            {
                "Name": "delivery",
                "Type": "struct<smtpResponse:string,processingTimeMillis:int,reportingMTA:string,recipients:array<string>,timestamp:string>",
            },
            {
                "Name": "complaint",
                "Type": "struct<feedbackId:string,complainedRecipients:array<struct<emailAddress:string>>,userAgent:string,complaintFeedbackType:string,timestamp:string,arrivalDate:string>",
            },
            {
                "Name": "bounce",
                "Type": "struct<bounceSubType:string,feedbackId:string,reportingMTA:string,bounceType:string,bouncedRecipients:array<struct<action:string,emailAddress:string,diagnosticCode:string,status:string>>,timestamp:string>",
            },
            {"Name": "reject", "Type": "struct<reason:string>"},
            {
                "Name": "failure",
                "Type": "struct<errorMessage:string,templateName:string>",
            },
            {
                "Name": "subscription",
                "Type": "struct<contactList:string,source:string,oldTopicPreferences:struct<topicSubscriptionStatus:array<struct<subscriptionStatus:string,topicName:string>>,unsubscribeAll:boolean>,newTopicPreferences:struct<topicSubscriptionStatus:array<struct<subscriptionStatus:string,topicName:string>>,unsubscribeAll:boolean>,timestamp:string>",
            },
            {
                "Name": "click",
                "Type": "struct<ipAddress:string,link:string,userAgent:string,linkTags:struct<samplekey0:array<string>,samplekey1:array<string>>,timestamp:string>",
            },
            {
                "Name": "open",
                "Type": "struct<ipAddress:string,userAgent:string,timestamp:string>",
            },
            {
                "Name": "deliveryDelay",
                "Type": "struct<expirationTime:string,delayedRecipients:array<struct<diagnosticCode:string,emailAddress:string,status:string>>,timestamp:string,delayType:string>",
            },
        ]
        assert SES_PARQUET.partition_keys == [
            {"Name": "event_hour", "Type": "string"},
            {"Name": "__execution_name__", "Type": "string"},
        ]
        assert SES_PARQUET.partition_indexes == [
            {"IndexName": "IDX_EXECUTION_NAME", "Keys": ["__execution_name__"]},
            {"IndexName": "IDX_PARTITIONS", "Keys": ["event_hour"]},
        ]
        assert SES_PARQUET.partition_info == collections.OrderedDict(
            [
                ("event_hour", {"type": "time", "from": "%Y%m%d%H", "to": "%Y%m%d00"}),
                (
                    "__execution_name__",
                    {
                        "type": "default",
                        "value": "00000000-0000-0000-0000-000000000000",
                    },
                ),
            ]
        )
        assert json.dumps(SES_PARQUET.statements.create) == json.dumps(
            """CREATE EXTERNAL TABLE IF NOT EXISTS `{database}`.`{table_name}` (`time` bigint, `timestamp` timestamp, `tagId` string, `subject` string, `source` string, `sender` array<string>, `recipient` array<string>, `eventType` string, `mail` struct<`sourceArn`:string,`headers`:array<struct<`name`:string,`value`:string>>,`sendingAccountId`:string,`destination`:array<string>,`headersTruncated`:boolean,`messageId`:string,`source`:string,`timestamp`:string,`commonHeaders`:struct<`messageId`:string,`from`:array<string>,`to`:array<string>,`subject`:string>,`tags`:struct<`scenes`:array<string>,`tagId`:array<string>>>, `delivery` struct<`smtpResponse`:string,`processingTimeMillis`:int,`reportingMTA`:string,`recipients`:array<string>,`timestamp`:string>, `complaint` struct<`feedbackId`:string,`complainedRecipients`:array<struct<`emailAddress`:string>>,`userAgent`:string,`complaintFeedbackType`:string,`timestamp`:string,`arrivalDate`:string>, `bounce` struct<`bounceSubType`:string,`feedbackId`:string,`reportingMTA`:string,`bounceType`:string,`bouncedRecipients`:array<struct<`action`:string,`emailAddress`:string,`diagnosticCode`:string,`status`:string>>,`timestamp`:string>, `reject` struct<`reason`:string>, `failure` struct<`errorMessage`:string,`templateName`:string>, `subscription` struct<`contactList`:string,`source`:string,`oldTopicPreferences`:struct<`topicSubscriptionStatus`:array<struct<`subscriptionStatus`:string,`topicName`:string>>,`unsubscribeAll`:boolean>,`newTopicPreferences`:struct<`topicSubscriptionStatus`:array<struct<`subscriptionStatus`:string,`topicName`:string>>,`unsubscribeAll`:boolean>,`timestamp`:string>, `click` struct<`ipAddress`:string,`link`:string,`userAgent`:string,`linkTags`:struct<`samplekey0`:array<string>,`samplekey1`:array<string>>,`timestamp`:string>, `open` struct<`ipAddress`:string,`userAgent`:string,`timestamp`:string>, `deliveryDelay` struct<`expirationTime`:string,`delayedRecipients`:array<struct<`diagnosticCode`:string,`emailAddress`:string,`status`:string>>,`timestamp`:string,`delayType`:string>, `event_hour` string, `__execution_name__` string) PARTITIONED BY (`event_hour` string, `__execution_name__` string) ROW FORMAT SERDE 'org.apache.hadoop.hive.ql.io.parquet.serde.ParquetHiveSerDe'  STORED AS INPUTFORMAT 'org.apache.hadoop.hive.ql.io.parquet.MapredParquetInputFormat' OUTPUTFORMAT 'org.apache.hadoop.hive.ql.io.parquet.MapredParquetOutputFormat' LOCATION '{location}' ;"""
        )
        assert json.dumps(SES_PARQUET.statements.insert) == json.dumps(
            """INSERT INTO \"{destination_database}\".\"{destination_table}\" (\"time\", \"timestamp\", \"tagId\", \"subject\", \"source\", \"sender\", \"recipient\", \"eventType\", \"mail\", \"delivery\", \"complaint\", \"bounce\", \"reject\", \"failure\", \"subscription\", \"click\", \"open\", \"deliveryDelay\", \"event_hour\", \"__execution_name__\") SELECT CAST(to_unixtime(case when eventType = 'Bounce' then coalesce(parse_datetime(bounce.timestamp, 'YYYY-MM-dd''T''HH:mm:ss.SSSSSSSSSZ'), now()) when eventType = 'Complaint' then coalesce(parse_datetime(complaint.timestamp, 'YYYY-MM-dd''T''HH:mm:ss.SSSSSSSSSZ'), now())  when eventType = 'Delivery' then coalesce(parse_datetime(delivery.timestamp, 'YYYY-MM-dd''T''HH:mm:ss.SSSSSSSSSZ'), now()) when eventType = 'Send' then parse_datetime(mail.timestamp, 'YYYY-MM-dd''T''HH:mm:ss.SSSSSSSSSZ') when eventType = 'Reject' then now() when eventType = 'Open' then coalesce(parse_datetime(open.timestamp, 'YYYY-MM-dd''T''HH:mm:ss.SSSSSSSSSZ'), now()) when eventType = 'Click' then coalesce(parse_datetime(click.timestamp, 'YYYY-MM-dd''T''HH:mm:ss.SSSSSSSSSZ'), now()) when eventType = 'Rendering Failure' then now() when eventType = 'DeliveryDelay' then coalesce(parse_datetime(deliveryDelay.timestamp, 'YYYY-MM-dd''T''HH:mm:ss.SSSSSSSSSZ'), now()) when eventType = 'Subscription' then coalesce(parse_datetime(subscription.timestamp, 'YYYY-MM-dd''T''HH:mm:ss.SSSSSSSSSZ'), now()) else now() end) * 1000 AS bigint), case when eventType = 'Bounce' then coalesce(parse_datetime(bounce.timestamp, 'YYYY-MM-dd''T''HH:mm:ss.SSSSSSSSSZ'), now()) when eventType = 'Complaint' then coalesce(parse_datetime(complaint.timestamp, 'YYYY-MM-dd''T''HH:mm:ss.SSSSSSSSSZ'), now())  when eventType = 'Delivery' then coalesce(parse_datetime(delivery.timestamp, 'YYYY-MM-dd''T''HH:mm:ss.SSSSSSSSSZ'), now()) when eventType = 'Send' then parse_datetime(mail.timestamp, 'YYYY-MM-dd''T''HH:mm:ss.SSSSSSSSSZ') when eventType = 'Reject' then now() when eventType = 'Open' then coalesce(parse_datetime(open.timestamp, 'YYYY-MM-dd''T''HH:mm:ss.SSSSSSSSSZ'), now()) when eventType = 'Click' then coalesce(parse_datetime(click.timestamp, 'YYYY-MM-dd''T''HH:mm:ss.SSSSSSSSSZ'), now()) when eventType = 'Rendering Failure' then now() when eventType = 'DeliveryDelay' then coalesce(parse_datetime(deliveryDelay.timestamp, 'YYYY-MM-dd''T''HH:mm:ss.SSSSSSSSSZ'), now()) when eventType = 'Subscription' then coalesce(parse_datetime(subscription.timestamp, 'YYYY-MM-dd''T''HH:mm:ss.SSSSSSSSSZ'), now()) else now() end, case when mail.tags.tagId = ARRAY[] or mail.tags.tagId is null then '-' else mail.tags.tagId[1] end, case when mail.commonHeaders.subject is null or mail.commonHeaders.subject = '' then '-' else mail.commonHeaders.subject end, mail.source, mail.commonHeaders.\"from\", mail.destination, \"eventType\", \"mail\", \"delivery\", \"complaint\", \"bounce\", \"reject\", \"failure\", \"subscription\", \"click\", \"open\", \"deliveryDelay\", date_format(case when eventType = 'Bounce' then coalesce(parse_datetime(bounce.timestamp, 'YYYY-MM-dd''T''HH:mm:ss.SSSSSSSSSZ'), now()) when eventType = 'Complaint' then coalesce(parse_datetime(complaint.timestamp, 'YYYY-MM-dd''T''HH:mm:ss.SSSSSSSSSZ'), now())  when eventType = 'Delivery' then coalesce(parse_datetime(delivery.timestamp, 'YYYY-MM-dd''T''HH:mm:ss.SSSSSSSSSZ'), now()) when eventType = 'Send' then parse_datetime(mail.timestamp, 'YYYY-MM-dd''T''HH:mm:ss.SSSSSSSSSZ') when eventType = 'Reject' then now() when eventType = 'Open' then coalesce(parse_datetime(open.timestamp, 'YYYY-MM-dd''T''HH:mm:ss.SSSSSSSSSZ'), now()) when eventType = 'Click' then coalesce(parse_datetime(click.timestamp, 'YYYY-MM-dd''T''HH:mm:ss.SSSSSSSSSZ'), now()) when eventType = 'Rendering Failure' then now() when eventType = 'DeliveryDelay' then coalesce(parse_datetime(deliveryDelay.timestamp, 'YYYY-MM-dd''T''HH:mm:ss.SSSSSSSSSZ'), now()) when eventType = 'Subscription' then coalesce(parse_datetime(subscription.timestamp, 'YYYY-MM-dd''T''HH:mm:ss.SSSSSSSSSZ'), now()) else now() end, '%Y%m%d%H'), '{{}}' FROM \"{source_database}\".\"{source_table}\" ;"""
        )
        assert json.dumps(SES_PARQUET.statements.drop) == json.dumps(
            """DROP TABLE IF EXISTS `{database}`.`{table_name}`"""
        )
        assert json.dumps(SES_PARQUET.statements.aggregate) == json.dumps(
            """INSERT INTO \"{destination_database}\".\"{destination_table}\" (\"time\", \"timestamp\", \"tagId\", \"subject\", \"source\", \"sender\", \"recipient\", \"eventType\", \"mail\", \"delivery\", \"complaint\", \"bounce\", \"reject\", \"failure\", \"subscription\", \"click\", \"open\", \"deliveryDelay\", \"event_hour\", \"__execution_name__\") SELECT CAST(to_unixtime(case when eventType = 'Bounce' then coalesce(parse_datetime(bounce.timestamp, 'YYYY-MM-dd''T''HH:mm:ss.SSSSSSSSSZ'), now()) when eventType = 'Complaint' then coalesce(parse_datetime(complaint.timestamp, 'YYYY-MM-dd''T''HH:mm:ss.SSSSSSSSSZ'), now())  when eventType = 'Delivery' then coalesce(parse_datetime(delivery.timestamp, 'YYYY-MM-dd''T''HH:mm:ss.SSSSSSSSSZ'), now()) when eventType = 'Send' then parse_datetime(mail.timestamp, 'YYYY-MM-dd''T''HH:mm:ss.SSSSSSSSSZ') when eventType = 'Reject' then now() when eventType = 'Open' then coalesce(parse_datetime(open.timestamp, 'YYYY-MM-dd''T''HH:mm:ss.SSSSSSSSSZ'), now()) when eventType = 'Click' then coalesce(parse_datetime(click.timestamp, 'YYYY-MM-dd''T''HH:mm:ss.SSSSSSSSSZ'), now()) when eventType = 'Rendering Failure' then now() when eventType = 'DeliveryDelay' then coalesce(parse_datetime(deliveryDelay.timestamp, 'YYYY-MM-dd''T''HH:mm:ss.SSSSSSSSSZ'), now()) when eventType = 'Subscription' then coalesce(parse_datetime(subscription.timestamp, 'YYYY-MM-dd''T''HH:mm:ss.SSSSSSSSSZ'), now()) else now() end) * 1000 AS bigint), case when eventType = 'Bounce' then coalesce(parse_datetime(bounce.timestamp, 'YYYY-MM-dd''T''HH:mm:ss.SSSSSSSSSZ'), now()) when eventType = 'Complaint' then coalesce(parse_datetime(complaint.timestamp, 'YYYY-MM-dd''T''HH:mm:ss.SSSSSSSSSZ'), now())  when eventType = 'Delivery' then coalesce(parse_datetime(delivery.timestamp, 'YYYY-MM-dd''T''HH:mm:ss.SSSSSSSSSZ'), now()) when eventType = 'Send' then parse_datetime(mail.timestamp, 'YYYY-MM-dd''T''HH:mm:ss.SSSSSSSSSZ') when eventType = 'Reject' then now() when eventType = 'Open' then coalesce(parse_datetime(open.timestamp, 'YYYY-MM-dd''T''HH:mm:ss.SSSSSSSSSZ'), now()) when eventType = 'Click' then coalesce(parse_datetime(click.timestamp, 'YYYY-MM-dd''T''HH:mm:ss.SSSSSSSSSZ'), now()) when eventType = 'Rendering Failure' then now() when eventType = 'DeliveryDelay' then coalesce(parse_datetime(deliveryDelay.timestamp, 'YYYY-MM-dd''T''HH:mm:ss.SSSSSSSSSZ'), now()) when eventType = 'Subscription' then coalesce(parse_datetime(subscription.timestamp, 'YYYY-MM-dd''T''HH:mm:ss.SSSSSSSSSZ'), now()) else now() end, case when mail.tags.tagId = ARRAY[] or mail.tags.tagId is null then '-' else mail.tags.tagId[1] end, case when mail.commonHeaders.subject is null or mail.commonHeaders.subject = '' then '-' else mail.commonHeaders.subject end, mail.source, mail.commonHeaders.\"from\", mail.destination, \"eventType\", \"mail\", \"delivery\", \"complaint\", \"bounce\", \"reject\", \"failure\", \"subscription\", \"click\", \"open\", \"deliveryDelay\", date_format(case when eventType = 'Bounce' then coalesce(parse_datetime(bounce.timestamp, 'YYYY-MM-dd''T''HH:mm:ss.SSSSSSSSSZ'), now()) when eventType = 'Complaint' then coalesce(parse_datetime(complaint.timestamp, 'YYYY-MM-dd''T''HH:mm:ss.SSSSSSSSSZ'), now())  when eventType = 'Delivery' then coalesce(parse_datetime(delivery.timestamp, 'YYYY-MM-dd''T''HH:mm:ss.SSSSSSSSSZ'), now()) when eventType = 'Send' then parse_datetime(mail.timestamp, 'YYYY-MM-dd''T''HH:mm:ss.SSSSSSSSSZ') when eventType = 'Reject' then now() when eventType = 'Open' then coalesce(parse_datetime(open.timestamp, 'YYYY-MM-dd''T''HH:mm:ss.SSSSSSSSSZ'), now()) when eventType = 'Click' then coalesce(parse_datetime(click.timestamp, 'YYYY-MM-dd''T''HH:mm:ss.SSSSSSSSSZ'), now()) when eventType = 'Rendering Failure' then now() when eventType = 'DeliveryDelay' then coalesce(parse_datetime(deliveryDelay.timestamp, 'YYYY-MM-dd''T''HH:mm:ss.SSSSSSSSSZ'), now()) when eventType = 'Subscription' then coalesce(parse_datetime(subscription.timestamp, 'YYYY-MM-dd''T''HH:mm:ss.SSSSSSSSSZ'), now()) else now() end, '%Y%m%d%H'), '{{}}' FROM \"{source_database}\".\"{source_table}\" WHERE __execution_name__ = '{execution_name}' GROUP BY CAST(to_unixtime(case when eventType = 'Bounce' then coalesce(parse_datetime(bounce.timestamp, 'YYYY-MM-dd''T''HH:mm:ss.SSSSSSSSSZ'), now()) when eventType = 'Complaint' then coalesce(parse_datetime(complaint.timestamp, 'YYYY-MM-dd''T''HH:mm:ss.SSSSSSSSSZ'), now())  when eventType = 'Delivery' then coalesce(parse_datetime(delivery.timestamp, 'YYYY-MM-dd''T''HH:mm:ss.SSSSSSSSSZ'), now()) when eventType = 'Send' then parse_datetime(mail.timestamp, 'YYYY-MM-dd''T''HH:mm:ss.SSSSSSSSSZ') when eventType = 'Reject' then now() when eventType = 'Open' then coalesce(parse_datetime(open.timestamp, 'YYYY-MM-dd''T''HH:mm:ss.SSSSSSSSSZ'), now()) when eventType = 'Click' then coalesce(parse_datetime(click.timestamp, 'YYYY-MM-dd''T''HH:mm:ss.SSSSSSSSSZ'), now()) when eventType = 'Rendering Failure' then now() when eventType = 'DeliveryDelay' then coalesce(parse_datetime(deliveryDelay.timestamp, 'YYYY-MM-dd''T''HH:mm:ss.SSSSSSSSSZ'), now()) when eventType = 'Subscription' then coalesce(parse_datetime(subscription.timestamp, 'YYYY-MM-dd''T''HH:mm:ss.SSSSSSSSSZ'), now()) else now() end) * 1000 AS bigint), case when eventType = 'Bounce' then coalesce(parse_datetime(bounce.timestamp, 'YYYY-MM-dd''T''HH:mm:ss.SSSSSSSSSZ'), now()) when eventType = 'Complaint' then coalesce(parse_datetime(complaint.timestamp, 'YYYY-MM-dd''T''HH:mm:ss.SSSSSSSSSZ'), now())  when eventType = 'Delivery' then coalesce(parse_datetime(delivery.timestamp, 'YYYY-MM-dd''T''HH:mm:ss.SSSSSSSSSZ'), now()) when eventType = 'Send' then parse_datetime(mail.timestamp, 'YYYY-MM-dd''T''HH:mm:ss.SSSSSSSSSZ') when eventType = 'Reject' then now() when eventType = 'Open' then coalesce(parse_datetime(open.timestamp, 'YYYY-MM-dd''T''HH:mm:ss.SSSSSSSSSZ'), now()) when eventType = 'Click' then coalesce(parse_datetime(click.timestamp, 'YYYY-MM-dd''T''HH:mm:ss.SSSSSSSSSZ'), now()) when eventType = 'Rendering Failure' then now() when eventType = 'DeliveryDelay' then coalesce(parse_datetime(deliveryDelay.timestamp, 'YYYY-MM-dd''T''HH:mm:ss.SSSSSSSSSZ'), now()) when eventType = 'Subscription' then coalesce(parse_datetime(subscription.timestamp, 'YYYY-MM-dd''T''HH:mm:ss.SSSSSSSSSZ'), now()) else now() end, case when mail.tags.tagId = ARRAY[] or mail.tags.tagId is null then '-' else mail.tags.tagId[1] end, case when mail.commonHeaders.subject is null or mail.commonHeaders.subject = '' then '-' else mail.commonHeaders.subject end, mail.source, mail.commonHeaders.\"from\", mail.destination, \"eventType\", \"mail\", \"delivery\", \"complaint\", \"bounce\", \"reject\", \"failure\", \"subscription\", \"click\", \"open\", \"deliveryDelay\", date_format(case when eventType = 'Bounce' then coalesce(parse_datetime(bounce.timestamp, 'YYYY-MM-dd''T''HH:mm:ss.SSSSSSSSSZ'), now()) when eventType = 'Complaint' then coalesce(parse_datetime(complaint.timestamp, 'YYYY-MM-dd''T''HH:mm:ss.SSSSSSSSSZ'), now())  when eventType = 'Delivery' then coalesce(parse_datetime(delivery.timestamp, 'YYYY-MM-dd''T''HH:mm:ss.SSSSSSSSSZ'), now()) when eventType = 'Send' then parse_datetime(mail.timestamp, 'YYYY-MM-dd''T''HH:mm:ss.SSSSSSSSSZ') when eventType = 'Reject' then now() when eventType = 'Open' then coalesce(parse_datetime(open.timestamp, 'YYYY-MM-dd''T''HH:mm:ss.SSSSSSSSSZ'), now()) when eventType = 'Click' then coalesce(parse_datetime(click.timestamp, 'YYYY-MM-dd''T''HH:mm:ss.SSSSSSSSSZ'), now()) when eventType = 'Rendering Failure' then now() when eventType = 'DeliveryDelay' then coalesce(parse_datetime(deliveryDelay.timestamp, 'YYYY-MM-dd''T''HH:mm:ss.SSSSSSSSSZ'), now()) when eventType = 'Subscription' then coalesce(parse_datetime(subscription.timestamp, 'YYYY-MM-dd''T''HH:mm:ss.SSSSSSSSSZ'), now()) else now() end, '%Y%m%d%H'), '{{}}';"""
        )

        assert SES_METRICS.columns == [
            {"Name": "time", "Type": "bigint"},
            {"Name": "timestamp", "Type": "timestamp"},
            {"Name": "tagId", "Type": "string"},
            {"Name": "source", "Type": "string"},
            {"Name": "subject", "Type": "string"},
            {"Name": "sum_bounce", "Type": "bigint"},
            {"Name": "sum_complaint", "Type": "bigint"},
            {"Name": "sum_delivery", "Type": "bigint"},
            {"Name": "sum_send", "Type": "bigint"},
            {"Name": "sum_reject", "Type": "bigint"},
            {"Name": "sum_open", "Type": "bigint"},
            {"Name": "sum_click", "Type": "bigint"},
            {"Name": "sum_failure", "Type": "bigint"},
            {"Name": "sum_delivery_delay", "Type": "bigint"},
            {"Name": "sum_delivery_delay_internalfailure", "Type": "bigint"},
            {"Name": "sum_delivery_delay_general", "Type": "bigint"},
            {"Name": "sum_delivery_delay_mailboxfull", "Type": "bigint"},
            {"Name": "sum_delivery_delay_spamdetected", "Type": "bigint"},
            {"Name": "sum_delivery_delay_recipientservererror", "Type": "bigint"},
            {"Name": "sum_delivery_delay_ipfailure", "Type": "bigint"},
            {
                "Name": "sum_delivery_delay_transientcommunicationfailure",
                "Type": "bigint",
            },
            {
                "Name": "sum_delivery_delay_byoiphostnamelookupunavailable",
                "Type": "bigint",
            },
            {"Name": "sum_delivery_delay_undetermined", "Type": "bigint"},
            {"Name": "sum_delivery_delay_sendingdeferral", "Type": "bigint"},
            {"Name": "sum_subscription", "Type": "bigint"},
        ]
        assert SES_METRICS.partition_keys == [
            {"Name": "event_hour", "Type": "string"},
            {"Name": "__execution_name__", "Type": "string"},
        ]
        assert SES_METRICS.partition_indexes == [
            {"IndexName": "IDX_EXECUTION_NAME", "Keys": ["__execution_name__"]},
            {"IndexName": "IDX_PARTITIONS", "Keys": ["event_hour"]},
        ]
        assert SES_METRICS.partition_info == collections.OrderedDict(
            [
                ("event_hour", {"type": "time", "from": "%Y%m%d%H", "to": "%Y%m%d00"}),
                (
                    "__execution_name__",
                    {
                        "type": "default",
                        "value": "00000000-0000-0000-0000-000000000000",
                    },
                ),
            ]
        )
        assert json.dumps(SES_METRICS.statements.create) == json.dumps(
            """CREATE EXTERNAL TABLE IF NOT EXISTS `{database}`.`{table_name}` (`time` bigint, `timestamp` timestamp, `tagId` string, `source` string, `subject` string, `sum_bounce` bigint, `sum_complaint` bigint, `sum_delivery` bigint, `sum_send` bigint, `sum_reject` bigint, `sum_open` bigint, `sum_click` bigint, `sum_failure` bigint, `sum_delivery_delay` bigint, `sum_delivery_delay_internalfailure` bigint, `sum_delivery_delay_general` bigint, `sum_delivery_delay_mailboxfull` bigint, `sum_delivery_delay_spamdetected` bigint, `sum_delivery_delay_recipientservererror` bigint, `sum_delivery_delay_ipfailure` bigint, `sum_delivery_delay_transientcommunicationfailure` bigint, `sum_delivery_delay_byoiphostnamelookupunavailable` bigint, `sum_delivery_delay_undetermined` bigint, `sum_delivery_delay_sendingdeferral` bigint, `sum_subscription` bigint, `event_hour` string, `__execution_name__` string) PARTITIONED BY (`event_hour` string, `__execution_name__` string) ROW FORMAT SERDE 'org.apache.hadoop.hive.ql.io.parquet.serde.ParquetHiveSerDe'  STORED AS INPUTFORMAT 'org.apache.hadoop.hive.ql.io.parquet.MapredParquetInputFormat' OUTPUTFORMAT 'org.apache.hadoop.hive.ql.io.parquet.MapredParquetOutputFormat' LOCATION '{location}' ;"""
        )
        assert json.dumps(SES_METRICS.statements.insert) == json.dumps(
            """INSERT INTO \"{destination_database}\".\"{destination_table}\" (\"time\", \"timestamp\", \"tagId\", \"source\", \"subject\", \"sum_bounce\", \"sum_complaint\", \"sum_delivery\", \"sum_send\", \"sum_reject\", \"sum_open\", \"sum_click\", \"sum_failure\", \"sum_delivery_delay\", \"sum_delivery_delay_internalfailure\", \"sum_delivery_delay_general\", \"sum_delivery_delay_mailboxfull\", \"sum_delivery_delay_spamdetected\", \"sum_delivery_delay_recipientservererror\", \"sum_delivery_delay_ipfailure\", \"sum_delivery_delay_transientcommunicationfailure\", \"sum_delivery_delay_byoiphostnamelookupunavailable\", \"sum_delivery_delay_undetermined\", \"sum_delivery_delay_sendingdeferral\", \"sum_subscription\", \"event_hour\", \"__execution_name__\") SELECT FLOOR(\"time\" / 3600000) * 3600000, DATE_TRUNC('hour', \"timestamp\"), \"tagId\", \"source\", \"subject\", sum(case when eventType = 'Bounce' then 1 else 0 end), sum(case when eventType = 'Complaint' then 1 else 0 end), sum(case when eventType = 'Delivery' then 1 else 0 end), sum(case when eventType = 'Send' then 1 else 0 end), sum(case when eventType = 'Reject' then 1 else 0 end), sum(case when eventType = 'Open' then 1 else 0 end), sum(case when eventType = 'Click' then 1 else 0 end), sum(case when eventType = 'Rendering Failure' then 1 else 0 end), sum(case when eventType = 'DeliveryDelay' then 1 else 0 end), sum(case when eventType = 'DeliveryDelay' and deliveryDelay.delayType= 'InternalFailure' then 1 else 0 end), sum(case when eventType = 'DeliveryDelay' and deliveryDelay.delayType= 'General' then 1 else 0 end), sum(case when eventType = 'DeliveryDelay' and deliveryDelay.delayType= 'MailboxFull' then 1 else 0 end), sum(case when eventType = 'DeliveryDelay' and deliveryDelay.delayType= 'SpamDetected' then 1 else 0 end), sum(case when eventType = 'DeliveryDelay' and deliveryDelay.delayType= 'RecipientServerError' then 1 else 0 end), sum(case when eventType = 'DeliveryDelay' and deliveryDelay.delayType= 'IPFailure' then 1 else 0 end), sum(case when eventType = 'DeliveryDelay' and deliveryDelay.delayType= 'TransientCommunicationFailure' then 1 else 0 end), sum(case when eventType = 'DeliveryDelay' and deliveryDelay.delayType= 'BYOIPHostNameLookupUnavailable' then 1 else 0 end), sum(case when eventType = 'DeliveryDelay' and deliveryDelay.delayType= 'Undetermined' then 1 else 0 end), sum(case when eventType = 'DeliveryDelay' and deliveryDelay.delayType= 'SendingDeFerral' then 1 else 0 end), sum(case when eventType = 'Subscription' then 1 else 0 end), \"event_hour\", \"__execution_name__\" FROM \"{source_database}\".\"{source_table}\" ;"""
        )
        assert json.dumps(SES_METRICS.statements.drop) == json.dumps(
            """DROP TABLE IF EXISTS `{database}`.`{table_name}`"""
        )
        assert json.dumps(SES_METRICS.statements.aggregate) == json.dumps(
            """INSERT INTO \"{destination_database}\".\"{destination_table}\" (\"time\", \"timestamp\", \"tagId\", \"source\", \"subject\", \"sum_bounce\", \"sum_complaint\", \"sum_delivery\", \"sum_send\", \"sum_reject\", \"sum_open\", \"sum_click\", \"sum_failure\", \"sum_delivery_delay\", \"sum_delivery_delay_internalfailure\", \"sum_delivery_delay_general\", \"sum_delivery_delay_mailboxfull\", \"sum_delivery_delay_spamdetected\", \"sum_delivery_delay_recipientservererror\", \"sum_delivery_delay_ipfailure\", \"sum_delivery_delay_transientcommunicationfailure\", \"sum_delivery_delay_byoiphostnamelookupunavailable\", \"sum_delivery_delay_undetermined\", \"sum_delivery_delay_sendingdeferral\", \"sum_subscription\", \"event_hour\", \"__execution_name__\") SELECT FLOOR(\"time\" / 3600000) * 3600000, DATE_TRUNC('hour', \"timestamp\"), \"tagId\", \"source\", \"subject\", sum(case when eventType = 'Bounce' then 1 else 0 end), sum(case when eventType = 'Complaint' then 1 else 0 end), sum(case when eventType = 'Delivery' then 1 else 0 end), sum(case when eventType = 'Send' then 1 else 0 end), sum(case when eventType = 'Reject' then 1 else 0 end), sum(case when eventType = 'Open' then 1 else 0 end), sum(case when eventType = 'Click' then 1 else 0 end), sum(case when eventType = 'Rendering Failure' then 1 else 0 end), sum(case when eventType = 'DeliveryDelay' then 1 else 0 end), sum(case when eventType = 'DeliveryDelay' and deliveryDelay.delayType= 'InternalFailure' then 1 else 0 end), sum(case when eventType = 'DeliveryDelay' and deliveryDelay.delayType= 'General' then 1 else 0 end), sum(case when eventType = 'DeliveryDelay' and deliveryDelay.delayType= 'MailboxFull' then 1 else 0 end), sum(case when eventType = 'DeliveryDelay' and deliveryDelay.delayType= 'SpamDetected' then 1 else 0 end), sum(case when eventType = 'DeliveryDelay' and deliveryDelay.delayType= 'RecipientServerError' then 1 else 0 end), sum(case when eventType = 'DeliveryDelay' and deliveryDelay.delayType= 'IPFailure' then 1 else 0 end), sum(case when eventType = 'DeliveryDelay' and deliveryDelay.delayType= 'TransientCommunicationFailure' then 1 else 0 end), sum(case when eventType = 'DeliveryDelay' and deliveryDelay.delayType= 'BYOIPHostNameLookupUnavailable' then 1 else 0 end), sum(case when eventType = 'DeliveryDelay' and deliveryDelay.delayType= 'Undetermined' then 1 else 0 end), sum(case when eventType = 'DeliveryDelay' and deliveryDelay.delayType= 'SendingDeFerral' then 1 else 0 end), sum(case when eventType = 'Subscription' then 1 else 0 end), \"event_hour\", \"__execution_name__\" FROM \"{source_database}\".\"{source_table}\" WHERE __execution_name__ = '{execution_name}' GROUP BY FLOOR(\"time\" / 3600000) * 3600000, DATE_TRUNC('hour', \"timestamp\"), \"tagId\", \"source\", \"subject\", \"event_hour\", \"__execution_name__\";"""
        )
