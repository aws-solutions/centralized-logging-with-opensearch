# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import os
import sys
import json
import pytest
import collections
from test.mock import mock_s3_context, mock_iam_context, mock_sqs_context, mock_ddb_context, mock_athena_context, mock_scheduler_context, mock_events_context, default_environment_variables


sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


class TestDataFormat:
    
    def test_input_format(self,):
        from utils.aws.glue.dataformat import InputFormat
        
        assert InputFormat.AVRO == 'org.apache.hadoop.hive.ql.io.avro.AvroContainerInputFormat'
        assert InputFormat.CLOUDTRAIL == 'com.amazon.emr.cloudtrail.CloudTrailInputFormat'
        assert InputFormat.ORC == 'org.apache.hadoop.hive.ql.io.orc.OrcInputFormat'
        assert InputFormat.PARQUET == 'org.apache.hadoop.hive.ql.io.parquet.MapredParquetInputFormat'
        assert InputFormat.TEXT == 'org.apache.hadoop.mapred.TextInputFormat'

    def test_output_format(self,):
        from utils.aws.glue.dataformat import OutputFormat
        
        assert OutputFormat.AVRO == 'org.apache.hadoop.hive.ql.io.avro.AvroContainerOutputFormat'
        assert OutputFormat.ORC == 'org.apache.hadoop.hive.ql.io.orc.OrcOutputFormat'
        assert OutputFormat.HIVE_IGNORE_KEY_TEXT == 'org.apache.hadoop.hive.ql.io.HiveIgnoreKeyTextOutputFormat'
        assert OutputFormat.PARQUET == 'org.apache.hadoop.hive.ql.io.parquet.MapredParquetOutputFormat'
        

    def test_serialization_library(self,):
        from utils.aws.glue.dataformat import SerializationLibrary
        
        assert SerializationLibrary.AVRO == 'org.apache.hadoop.hive.serde2.avro.AvroSerDe'
        assert SerializationLibrary.CLOUDTRAIL == 'org.openx.data.jsonserde.JsonSerDe'
        assert SerializationLibrary.LAZY_SIMPLE == 'org.apache.hadoop.hive.serde2.lazy.LazySimpleSerDe'
        assert SerializationLibrary.OPEN_CSV == 'org.apache.hadoop.hive.serde2.OpenCSVSerde'
        assert SerializationLibrary.OPENX_JSON == 'org.openx.data.jsonserde.JsonSerDe'
        assert SerializationLibrary.ORC == 'org.apache.hadoop.hive.ql.io.orc.OrcSerde'
        assert SerializationLibrary.PARQUET == 'org.apache.hadoop.hive.ql.io.parquet.serde.ParquetHiveSerDe'
        assert SerializationLibrary.REGEXP == 'org.apache.hadoop.hive.serde2.RegexSerDe'


    def test_classification_string(self,):
        from utils.aws.glue.dataformat import ClassificationString
        
        assert ClassificationString.AVRO == 'avro'
        assert ClassificationString.CSV == 'csv'
        assert ClassificationString.JSON == 'json'
        assert ClassificationString.ORC == 'orc'
        assert ClassificationString.PARQUET == 'parquet'
        assert ClassificationString.NONE == ''


    def test_avro(self,):
        from utils.aws.glue.dataformat import DataFormat, Avro
        
        assert isinstance(Avro, DataFormat) is True
        assert Avro.INPUT_FORMAT == 'org.apache.hadoop.hive.ql.io.avro.AvroContainerInputFormat'
        assert Avro.OUTPUT_FORMAT == 'org.apache.hadoop.hive.ql.io.avro.AvroContainerOutputFormat'
        assert Avro.SERIALIZATION_LIBRARY == 'org.apache.hadoop.hive.serde2.avro.AvroSerDe'
        assert Avro.CLASSIFICATION_STRING == 'avro'


    def test_cloudtrail_logs(self,):
        from utils.aws.glue.dataformat import DataFormat, CloudTrailLogs
        
        assert isinstance(CloudTrailLogs, DataFormat) is True
        assert CloudTrailLogs.INPUT_FORMAT == 'com.amazon.emr.cloudtrail.CloudTrailInputFormat'
        assert CloudTrailLogs.OUTPUT_FORMAT == 'org.apache.hadoop.hive.ql.io.HiveIgnoreKeyTextOutputFormat'
        assert CloudTrailLogs.SERIALIZATION_LIBRARY == 'org.openx.data.jsonserde.JsonSerDe'
        assert CloudTrailLogs.CLASSIFICATION_STRING == ''

    def test_csv(self,):
        from utils.aws.glue.dataformat import DataFormat, Csv
        
        assert isinstance(Csv, DataFormat) is True
        assert Csv.INPUT_FORMAT == 'org.apache.hadoop.mapred.TextInputFormat'
        assert Csv.OUTPUT_FORMAT == 'org.apache.hadoop.hive.ql.io.HiveIgnoreKeyTextOutputFormat'
        assert Csv.SERIALIZATION_LIBRARY == 'org.apache.hadoop.hive.serde2.OpenCSVSerde'
        assert Csv.CLASSIFICATION_STRING == 'csv'


    def test_json(self,):
        from utils.aws.glue.dataformat import DataFormat, Json
        
        assert isinstance(Json, DataFormat) is True
        assert Json.INPUT_FORMAT == 'org.apache.hadoop.mapred.TextInputFormat'
        assert Json.OUTPUT_FORMAT == 'org.apache.hadoop.hive.ql.io.HiveIgnoreKeyTextOutputFormat'
        assert Json.SERIALIZATION_LIBRARY == 'org.openx.data.jsonserde.JsonSerDe'
        assert Json.CLASSIFICATION_STRING == 'json'


    def test_orc(self,):
        from utils.aws.glue.dataformat import DataFormat, Orc
        
        assert isinstance(Orc, DataFormat) is True
        assert Orc.INPUT_FORMAT == 'org.apache.hadoop.hive.ql.io.orc.OrcInputFormat'
        assert Orc.OUTPUT_FORMAT == 'org.apache.hadoop.hive.ql.io.orc.OrcOutputFormat'
        assert Orc.SERIALIZATION_LIBRARY == 'org.apache.hadoop.hive.ql.io.orc.OrcSerde'
        assert Orc.CLASSIFICATION_STRING == 'orc'


    def test_parquet(self,):
        from utils.aws.glue.dataformat import DataFormat, Parquet
        
        assert isinstance(Parquet, DataFormat) is True
        assert Parquet.INPUT_FORMAT == 'org.apache.hadoop.hive.ql.io.parquet.MapredParquetInputFormat'
        assert Parquet.OUTPUT_FORMAT == 'org.apache.hadoop.hive.ql.io.parquet.MapredParquetOutputFormat'
        assert Parquet.SERIALIZATION_LIBRARY == 'org.apache.hadoop.hive.ql.io.parquet.serde.ParquetHiveSerDe'
        assert Parquet.CLASSIFICATION_STRING == 'parquet'


    def test_tsv(self,):
        from utils.aws.glue.dataformat import DataFormat, Tsv
        
        assert isinstance(Tsv, DataFormat) is True
        assert Tsv.INPUT_FORMAT == 'org.apache.hadoop.mapred.TextInputFormat'
        assert Tsv.OUTPUT_FORMAT == 'org.apache.hadoop.hive.ql.io.HiveIgnoreKeyTextOutputFormat'
        assert Tsv.SERIALIZATION_LIBRARY == 'org.apache.hadoop.hive.serde2.lazy.LazySimpleSerDe'
        assert Tsv.CLASSIFICATION_STRING == ''
    
    def test_regex(self,):
        from utils.aws.glue.dataformat import DataFormat, Regex
        
        assert isinstance(Regex, DataFormat) is True
        assert Regex.INPUT_FORMAT == 'org.apache.hadoop.mapred.TextInputFormat'
        assert Regex.OUTPUT_FORMAT == 'org.apache.hadoop.hive.ql.io.HiveIgnoreKeyTextOutputFormat'
        assert Regex.SERIALIZATION_LIBRARY == 'org.apache.hadoop.hive.serde2.RegexSerDe'
        assert Regex.CLASSIFICATION_STRING == ''
    
    def test_data_format(self,):
        from utils.aws.glue.dataformat import DataFormat, InputFormat, OutputFormat, SerializationLibrary, ClassificationString
        regex = DataFormat
        regex.INPUT_FORMAT = InputFormat.TEXT
        regex.OUTPUT_FORMAT = OutputFormat.HIVE_IGNORE_KEY_TEXT
        regex.SERIALIZATION_LIBRARY = SerializationLibrary.REGEXP
        regex.CLASSIFICATION_STRING = ClassificationString.NONE
        
        assert regex.INPUT_FORMAT == 'org.apache.hadoop.mapred.TextInputFormat'
        assert regex.OUTPUT_FORMAT == 'org.apache.hadoop.hive.ql.io.HiveIgnoreKeyTextOutputFormat'
        assert regex.SERIALIZATION_LIBRARY == 'org.apache.hadoop.hive.serde2.RegexSerDe'
        assert regex.CLASSIFICATION_STRING == ''
        
    def test_data_format_mapping(self):
        from utils.aws.glue.dataformat import DATA_FORMAT_MAPPING, Avro, CloudTrailLogs, Csv, Json, Orc, Parquet, Tsv, Regex
        
        assert DATA_FORMAT_MAPPING['avro'] is Avro
        assert DATA_FORMAT_MAPPING['cloudtraillogs'] is CloudTrailLogs
        assert DATA_FORMAT_MAPPING['csv'] is Csv
        assert DATA_FORMAT_MAPPING['json'] is Json
        assert DATA_FORMAT_MAPPING['orc'] is Orc
        assert DATA_FORMAT_MAPPING['parquet'] is Parquet
        assert DATA_FORMAT_MAPPING['tsv'] is Tsv
        assert DATA_FORMAT_MAPPING['regex'] is Regex

    
class TestSchema:
    def init_default_parameter(self):
        from utils.aws.glue.schema import Schema
        self.schema = Schema()
        
    def test_data_type(self):
        from utils.aws.glue.schema import DataType
        
        big_int = DataType(input_string='bigint')
        assert big_int.input_string == 'bigint'
        assert big_int.is_primitive is True
        
        map_field = DataType(input_string='map', is_primitive=False)
        assert map_field.input_string == 'map'
        assert map_field.is_primitive is False
    
    def test_schema_boolean(self):
        from utils.aws.glue.schema import DataType
        
        self.init_default_parameter()
        
        boolean_field = self.schema.boolean()
        assert isinstance(boolean_field, DataType) is True
        assert boolean_field.input_string == 'boolean'
        assert boolean_field.is_primitive is True
    
    def test_schema_binary(self):
        from utils.aws.glue.schema import DataType
        
        self.init_default_parameter()
        
        binary_field = self.schema.binary()
        assert isinstance(binary_field, DataType) is True
        assert binary_field.input_string == 'binary'
        assert binary_field.is_primitive is True
    
    def test_schema_big_int(self):
        from utils.aws.glue.schema import DataType
        
        self.init_default_parameter()
        
        big_int_field = self.schema.big_int()
        assert isinstance(big_int_field, DataType) is True
        assert big_int_field.input_string == 'bigint'
        assert big_int_field.is_primitive is True
    
    def test_schema_double(self):
        from utils.aws.glue.schema import DataType
        
        self.init_default_parameter()
        double_field = self.schema.double()
        
        assert isinstance(double_field, DataType) is True
        assert double_field.input_string == 'double'
        assert double_field.is_primitive is True
    
    def test_schema_number(self):
        from utils.aws.glue.schema import DataType
        
        self.init_default_parameter()

        number_field = self.schema.number()
        assert isinstance(number_field, DataType) is True
        assert number_field.input_string == 'double'
        assert number_field.is_primitive is True
    
    def test_schema_float(self):
        from utils.aws.glue.schema import DataType
        
        self.init_default_parameter()

        float_field = self.schema.float()
        assert isinstance(float_field, DataType) is True
        assert float_field.input_string == 'float'
        assert float_field.is_primitive is True
    
    def test_schema_integer(self):
        from utils.aws.glue.schema import DataType
        
        self.init_default_parameter()

        integer_field = self.schema.integer()
        assert isinstance(integer_field, DataType) is True
        assert integer_field.input_string == 'int'
        assert integer_field.is_primitive is True
    
    def test_schema_small_int(self):
        from utils.aws.glue.schema import DataType
        
        self.init_default_parameter()

        small_int_field = self.schema.small_int()
        assert isinstance(small_int_field, DataType) is True
        assert small_int_field.input_string == 'smallint'
        assert small_int_field.is_primitive is True
    
    def test_schema_tiny_int(self):
        from utils.aws.glue.schema import DataType
        
        self.init_default_parameter()

        tiny_int_field = self.schema.tiny_int()
        assert isinstance(tiny_int_field, DataType) is True
        assert tiny_int_field.input_string == 'tinyint'
        assert tiny_int_field.is_primitive is True
    
    def test_schema_date(self):
        from utils.aws.glue.schema import DataType
        
        self.init_default_parameter()

        date_field = self.schema.date()
        assert isinstance(date_field, DataType) is True
        assert date_field.input_string == 'date'
        assert date_field.is_primitive is True
    
    def test_schema_timestamp(self):
        from utils.aws.glue.schema import DataType
        
        self.init_default_parameter()

        timestamp_field = self.schema.timestamp()
        assert isinstance(timestamp_field, DataType) is True
        assert timestamp_field.input_string == 'timestamp'
        assert timestamp_field.is_primitive is True
    
    def test_schema_string(self):
        from utils.aws.glue.schema import DataType
        
        self.init_default_parameter()

        string_field = self.schema.string()
        assert isinstance(string_field, DataType) is True
        assert string_field.input_string == 'string'
        assert string_field.is_primitive is True
    
    def test_schema_decimal(self):
        from utils.aws.glue.schema import DataType
        
        self.init_default_parameter()

        decimal_field = self.schema.decimal()
        assert isinstance(decimal_field, DataType) is True
        assert decimal_field.input_string == 'decimal(38, 0)'
        assert decimal_field.is_primitive is True
    
        decimal_field = self.schema.decimal(precision=24, scale=2)
        assert isinstance(decimal_field, DataType) is True
        assert decimal_field.input_string == 'decimal(24, 2)'
        assert decimal_field.is_primitive is True
    
    def test_schema_char(self):
        from utils.aws.glue.schema import DataType
        
        self.init_default_parameter()

        char_field = self.schema.char(length=200)
        assert isinstance(char_field, DataType) is True
        assert char_field.input_string == 'char(200)'
        assert char_field.is_primitive is True
        
        with pytest.raises(ValueError) as exception_info:
            self.schema.char(length=0)
        assert exception_info.value.args[0] == 'char length must be (inclusively) between 1 and 255, but was 0.'
            
        with pytest.raises(ValueError) as exception_info:
            self.schema.char(length=256)
        assert exception_info.value.args[0] == 'char length must be (inclusively) between 1 and 255, but was 256.'
    
        with pytest.raises(Exception) as exception_info:
            self.schema.char(length=10.2) # type: ignore
        assert exception_info.value.args[0] == 'char length must be a positive integer, was 10.2.'
    
    def test_schema_varchar(self):
        from utils.aws.glue.schema import DataType
        
        self.init_default_parameter()

        varchar_field = self.schema.varchar(length=200)
        assert isinstance(varchar_field, DataType) is True
        assert varchar_field.input_string == 'varchar(200)'
        assert varchar_field.is_primitive is True       
        
        with pytest.raises(ValueError) as exception_info:
            self.schema.varchar(length=0)
        assert exception_info.value.args[0] == 'char length must be (inclusively) between 1 and 65535, but was 0.'
            
        with pytest.raises(ValueError) as exception_info:
            self.schema.varchar(length=65536)
        assert exception_info.value.args[0] == 'char length must be (inclusively) between 1 and 65535, but was 65536.'
    
        with pytest.raises(Exception) as exception_info:
            self.schema.varchar(length=10.2) # type: ignore
        assert exception_info.value.args[0] == 'char length must be a positive integer, was 10.2.'
    
    def test_schema_array(self):
        from utils.aws.glue.schema import DataType
        
        self.init_default_parameter()

        array_field = self.schema.array(self.schema.string())
        assert isinstance(array_field, DataType) is True
        assert array_field.input_string == 'array<string>'
        assert array_field.is_primitive is False
        
        array_field = self.schema.array(self.schema.array(self.schema.string()))
        assert isinstance(array_field, DataType) is True
        assert array_field.input_string == 'array<array<string>>'
        assert array_field.is_primitive is False
        
        array_field = self.schema.array(self.schema.struct([{'name': 'host', 'type':self.schema.string()}]))
        assert isinstance(array_field, DataType) is True
        assert array_field.input_string == 'array<struct<host:string>>'
        assert array_field.is_primitive is False
        
        array_field = self.schema.array(self.schema.map(key_type=self.schema.string(), value_type=self.schema.integer()))
        assert isinstance(array_field, DataType) is True
        assert array_field.input_string == 'array<map<string,int>>'
        assert array_field.is_primitive is False
        
        with pytest.raises(TypeError):
            self.schema.array(self.schema.map(key_type=self.schema.struct([{'name': 'host', 'type': self.schema.string()}]), value_type=self.schema.integer()))
    
    def test_schema_map(self):
        from utils.aws.glue.schema import DataType
        
        self.init_default_parameter()

        array_field = self.schema.array(self.schema.map(key_type=self.schema.string(), value_type=self.schema.integer()))
        map_field = self.schema.map(key_type=self.schema.string(), value_type=self.schema.integer())
        assert isinstance(array_field, DataType) is True
        assert map_field.input_string == 'map<string,int>'
        assert map_field.is_primitive is False
        
        struct_field = self.schema.struct([{'name': 'headers', 'type': self.schema.array(self.schema.struct([{'name': 'host', 'type': self.schema.string()}, {'name': 'clientIp', 'type': self.schema.string()}]))}, {'name': 'server', 'type': self.schema.string()}])
        assert isinstance(struct_field, DataType) is True
        assert struct_field.input_string == 'struct<headers:array<struct<host:string,clientIp:string>>,server:string>'
        assert struct_field.is_primitive is False


class TestTableMetaData:
    
    def test_cloudfront(self,):
        from utils.aws.glue.table import TableMetaData
        from utils.aws.glue.dataformat import Tsv, Parquet
        from utils.logschema.services import CLOUDFRONT_RAW_SCHEMA, CLOUDFRONT_PARQUET_SCHEMA, CLOUDFRONT_METRICS_SCHEMA
        
        CLOUDFRONT_RAW = TableMetaData(data_format=Tsv, schema=CLOUDFRONT_RAW_SCHEMA, table_properties={'skip.header.line.count': '2'}, serialization_properties={'field.delim': '\t', 'line.delim': '\n'}, ignore_partition=True)
        assert CLOUDFRONT_RAW.columns == [
            {'Name': 'date', 'Type': 'date'}, 
            {'Name': 'time', 'Type': 'string'}, 
            {'Name': 'x-edge-location', 'Type': 'string'}, 
            {'Name': 'sc-bytes', 'Type': 'bigint'}, 
            {'Name': 'c-ip', 'Type': 'string'}, 
            {'Name': 'cs-method', 'Type': 'string'}, 
            {'Name': 'cs-host', 'Type': 'string'}, 
            {'Name': 'cs-uri-stem', 'Type': 'string'}, 
            {'Name': 'sc-status', 'Type': 'int'}, 
            {'Name': 'cs-referer', 'Type': 'string'}, 
            {'Name': 'cs-user-agent', 'Type': 'string'}, 
            {'Name': 'cs-uri-query', 'Type': 'string'}, 
            {'Name': 'cs-cookie', 'Type': 'string'}, 
            {'Name': 'x-edge-result-type', 'Type': 'string'}, 
            {'Name': 'x-edge-request-id', 'Type': 'string'}, 
            {'Name': 'x-host-header', 'Type': 'string'}, 
            {'Name': 'cs-protocol', 'Type': 'string'}, 
            {'Name': 'cs-bytes', 'Type': 'bigint'}, 
            {'Name': 'time-taken', 'Type': 'double'}, 
            {'Name': 'x-forwarded-for', 'Type': 'string'}, 
            {'Name': 'ssl-protocol', 'Type': 'string'}, 
            {'Name': 'ssl-cipher', 'Type': 'string'}, 
            {'Name': 'x-edge-response-result-type', 'Type': 'string'}, 
            {'Name': 'cs-protocol-version', 'Type': 'string'}, 
            {'Name': 'fle-status', 'Type': 'string'}, 
            {'Name': 'fle-encrypted-fields', 'Type': 'int'}, 
            {'Name': 'c-port', 'Type': 'int'}, 
            {'Name': 'time-to-first-byte', 'Type': 'double'}, 
            {'Name': 'x-edge-detailed-result-type', 'Type': 'string'}, 
            {'Name': 'sc-content-type', 'Type': 'string'}, 
            {'Name': 'sc-content-len', 'Type': 'bigint'}, 
            {'Name': 'sc-range-start', 'Type': 'bigint'}, 
            {'Name': 'sc-range-end', 'Type': 'bigint'},
            {'Name': 'enrichment', 'Type': 'string'}
        ]
        assert CLOUDFRONT_RAW.partition_keys == []
        assert CLOUDFRONT_RAW.partition_indexes == []
        assert CLOUDFRONT_RAW.partition_info == {}
        assert json.dumps(CLOUDFRONT_RAW.statements.create) == json.dumps("""CREATE EXTERNAL TABLE IF NOT EXISTS `{database}`.`{table_name}` (`date` date, `time` string, `x-edge-location` string, `sc-bytes` bigint, `c-ip` string, `cs-method` string, `cs-host` string, `cs-uri-stem` string, `sc-status` int, `cs-referer` string, `cs-user-agent` string, `cs-uri-query` string, `cs-cookie` string, `x-edge-result-type` string, `x-edge-request-id` string, `x-host-header` string, `cs-protocol` string, `cs-bytes` bigint, `time-taken` double, `x-forwarded-for` string, `ssl-protocol` string, `ssl-cipher` string, `x-edge-response-result-type` string, `cs-protocol-version` string, `fle-status` string, `fle-encrypted-fields` int, `c-port` int, `time-to-first-byte` double, `x-edge-detailed-result-type` string, `sc-content-type` string, `sc-content-len` bigint, `sc-range-start` bigint, `sc-range-end` bigint, `enrichment` string)  ROW FORMAT SERDE 'org.apache.hadoop.hive.serde2.lazy.LazySimpleSerDe' WITH SERDEPROPERTIES ('field.delim'='\t', 'line.delim'='\n') STORED AS INPUTFORMAT 'org.apache.hadoop.mapred.TextInputFormat' OUTPUTFORMAT 'org.apache.hadoop.hive.ql.io.HiveIgnoreKeyTextOutputFormat' LOCATION '{location}' TBLPROPERTIES ('skip.header.line.count'='2');""")
        assert json.dumps(CLOUDFRONT_RAW.statements.insert) == json.dumps("""INSERT INTO \"{destination_database}\".\"{destination_table}\" (\"date\", \"time\", \"x-edge-location\", \"sc-bytes\", \"c-ip\", \"cs-method\", \"cs-host\", \"cs-uri-stem\", \"sc-status\", \"cs-referer\", \"cs-user-agent\", \"cs-uri-query\", \"cs-cookie\", \"x-edge-result-type\", \"x-edge-request-id\", \"x-host-header\", \"cs-protocol\", \"cs-bytes\", \"time-taken\", \"x-forwarded-for\", \"ssl-protocol\", \"ssl-cipher\", \"x-edge-response-result-type\", \"cs-protocol-version\", \"fle-status\", \"fle-encrypted-fields\", \"c-port\", \"time-to-first-byte\", \"x-edge-detailed-result-type\", \"sc-content-type\", \"sc-content-len\", \"sc-range-start\", \"sc-range-end\", \"enrichment\") SELECT \"date\", \"time\", \"x-edge-location\", \"sc-bytes\", \"c-ip\", \"cs-method\", \"cs-host\", \"cs-uri-stem\", \"sc-status\", \"cs-referer\", \"cs-user-agent\", \"cs-uri-query\", \"cs-cookie\", \"x-edge-result-type\", \"x-edge-request-id\", \"x-host-header\", \"cs-protocol\", \"cs-bytes\", \"time-taken\", \"x-forwarded-for\", \"ssl-protocol\", \"ssl-cipher\", \"x-edge-response-result-type\", \"cs-protocol-version\", \"fle-status\", \"fle-encrypted-fields\", \"c-port\", \"time-to-first-byte\", \"x-edge-detailed-result-type\", \"sc-content-type\", \"sc-content-len\", \"sc-range-start\", \"sc-range-end\", \"enrichment\" FROM \"{source_database}\".\"{source_table}\";""")
        assert json.dumps(CLOUDFRONT_RAW.statements.drop) == json.dumps("""DROP TABLE IF EXISTS `{database}`.`{table_name}`""")
        assert json.dumps(CLOUDFRONT_RAW.statements.aggregate) == json.dumps("""INSERT INTO \"{destination_database}\".\"{destination_table}\" (\"date\", \"time\", \"x-edge-location\", \"sc-bytes\", \"c-ip\", \"cs-method\", \"cs-host\", \"cs-uri-stem\", \"sc-status\", \"cs-referer\", \"cs-user-agent\", \"cs-uri-query\", \"cs-cookie\", \"x-edge-result-type\", \"x-edge-request-id\", \"x-host-header\", \"cs-protocol\", \"cs-bytes\", \"time-taken\", \"x-forwarded-for\", \"ssl-protocol\", \"ssl-cipher\", \"x-edge-response-result-type\", \"cs-protocol-version\", \"fle-status\", \"fle-encrypted-fields\", \"c-port\", \"time-to-first-byte\", \"x-edge-detailed-result-type\", \"sc-content-type\", \"sc-content-len\", \"sc-range-start\", \"sc-range-end\", \"enrichment\") SELECT \"date\", \"time\", \"x-edge-location\", \"sc-bytes\", \"c-ip\", \"cs-method\", \"cs-host\", \"cs-uri-stem\", \"sc-status\", \"cs-referer\", \"cs-user-agent\", \"cs-uri-query\", \"cs-cookie\", \"x-edge-result-type\", \"x-edge-request-id\", \"x-host-header\", \"cs-protocol\", \"cs-bytes\", \"time-taken\", \"x-forwarded-for\", \"ssl-protocol\", \"ssl-cipher\", \"x-edge-response-result-type\", \"cs-protocol-version\", \"fle-status\", \"fle-encrypted-fields\", \"c-port\", \"time-to-first-byte\", \"x-edge-detailed-result-type\", \"sc-content-type\", \"sc-content-len\", \"sc-range-start\", \"sc-range-end\", \"enrichment\" FROM \"{source_database}\".\"{source_table}\" WHERE __execution_name__ = '{execution_name}' GROUP BY \"date\", \"time\", \"x-edge-location\", \"sc-bytes\", \"c-ip\", \"cs-method\", \"cs-host\", \"cs-uri-stem\", \"sc-status\", \"cs-referer\", \"cs-user-agent\", \"cs-uri-query\", \"cs-cookie\", \"x-edge-result-type\", \"x-edge-request-id\", \"x-host-header\", \"cs-protocol\", \"cs-bytes\", \"time-taken\", \"x-forwarded-for\", \"ssl-protocol\", \"ssl-cipher\", \"x-edge-response-result-type\", \"cs-protocol-version\", \"fle-status\", \"fle-encrypted-fields\", \"c-port\", \"time-to-first-byte\", \"x-edge-detailed-result-type\", \"sc-content-type\", \"sc-content-len\", \"sc-range-start\", \"sc-range-end\", \"enrichment\";""")
        
        CLOUDFRONT_PARQUET = TableMetaData(data_format=Parquet, schema=CLOUDFRONT_PARQUET_SCHEMA, ignore_partition=False)
        assert CLOUDFRONT_PARQUET.columns == [
            {'Name': 'time', 'Type': 'bigint'}, 
            {'Name': 'timestamp', 'Type': 'timestamp'}, 
            {'Name': 'x-edge-location', 'Type': 'string'}, 
            {'Name': 'sc-bytes', 'Type': 'bigint'}, 
            {'Name': 'c-ip', 'Type': 'string'}, 
            {'Name': 'cs-method', 'Type': 'string'}, 
            {'Name': 'cs-uri-stem', 'Type': 'string'}, 
            {'Name': 'sc-status-group', 'Type': 'string'}, 
            {'Name': 'sc-status', 'Type': 'int'}, 
            {'Name': 'cs-referer', 'Type': 'string'}, 
            {'Name': 'cs-user-agent', 'Type': 'string'}, 
            {'Name': 'cs-uri-query', 'Type': 'string'}, 
            {'Name': 'cs-cookie', 'Type': 'string'}, 
            {'Name': 'x-edge-result-type', 'Type': 'string'}, 
            {'Name': 'x-edge-request-id', 'Type': 'string'}, 
            {'Name': 'x-host-header', 'Type': 'string'}, 
            {'Name': 'cs-protocol', 'Type': 'string'}, 
            {'Name': 'cs-bytes', 'Type': 'bigint'}, 
            {'Name': 'time-taken-in-second', 'Type': 'int'}, 
            {'Name': 'time-taken', 'Type': 'double'}, 
            {'Name': 'x-forwarded-for', 'Type': 'string'}, 
            {'Name': 'ssl-protocol', 'Type': 'string'},
            {'Name': 'ssl-cipher', 'Type': 'string'}, 
            {'Name': 'x-edge-response-result-type', 'Type': 'string'}, 
            {'Name': 'cs-protocol-version', 'Type': 'string'}, 
            {'Name': 'fle-status', 'Type': 'string'}, 
            {'Name': 'fle-encrypted-fields', 'Type': 'int'}, 
            {'Name': 'c-port', 'Type': 'int'}, 
            {'Name': 'time-to-first-byte', 'Type': 'double'}, 
            {'Name': 'x-edge-detailed-result-type', 'Type': 'string'}, 
            {'Name': 'sc-content-type', 'Type': 'string'}, 
            {'Name': 'sc-content-len', 'Type': 'bigint'}, 
            {'Name': 'sc-range-start', 'Type': 'bigint'}, 
            {'Name': 'sc-range-end', 'Type': 'bigint'}, 
            {'Name': 'hit-cache', 'Type': 'boolean'}, 
            {'Name': 'back-to-origin', 'Type': 'boolean'},
            {'Name': 'enrichment', 'Type': 'struct<geo_iso_code:string,geo_country:string,geo_city:string,geo_location:string,ua_browser:string,ua_browser_version:string,ua_os:string,ua_os_version:string,ua_device:string,ua_category:string>'}
        ]
        assert CLOUDFRONT_PARQUET.partition_keys == [
            {'Name': 'event_hour', 'Type': 'string'}, 
            {'Name': 'cs-host', 'Type': 'string'}, 
            {'Name': '__execution_name__', 'Type': 'string'}
        ]
        assert CLOUDFRONT_PARQUET.partition_indexes == [
            {'IndexName': 'IDX_EXECUTION_NAME', 'Keys': ['__execution_name__']}, 
            {'IndexName': 'IDX_PARTITIONS', 'Keys': ['event_hour', 'cs-host']}
        ]
        assert CLOUDFRONT_PARQUET.partition_info == collections.OrderedDict([('event_hour', {'type': 'time', 'from': '%Y%m%d%H', 'to': '%Y%m%d00'}), ('cs-host', {'type': 'retain'}), ('__execution_name__', {'type': 'default', 'value': '00000000-0000-0000-0000-000000000000'})])
        assert json.dumps(CLOUDFRONT_PARQUET.statements.create) == json.dumps("""CREATE EXTERNAL TABLE IF NOT EXISTS `{database}`.`{table_name}` (`time` bigint, `timestamp` timestamp, `x-edge-location` string, `sc-bytes` bigint, `c-ip` string, `cs-method` string, `cs-host` string, `cs-uri-stem` string, `sc-status-group` string, `sc-status` int, `cs-referer` string, `cs-user-agent` string, `cs-uri-query` string, `cs-cookie` string, `x-edge-result-type` string, `x-edge-request-id` string, `x-host-header` string, `cs-protocol` string, `cs-bytes` bigint, `time-taken-in-second` int, `time-taken` double, `x-forwarded-for` string, `ssl-protocol` string, `ssl-cipher` string, `x-edge-response-result-type` string, `cs-protocol-version` string, `fle-status` string, `fle-encrypted-fields` int, `c-port` int, `time-to-first-byte` double, `x-edge-detailed-result-type` string, `sc-content-type` string, `sc-content-len` bigint, `sc-range-start` bigint, `sc-range-end` bigint, `hit-cache` boolean, `back-to-origin` boolean, `enrichment` struct<`geo_iso_code`:string,`geo_country`:string,`geo_city`:string,`geo_location`:string,`ua_browser`:string,`ua_browser_version`:string,`ua_os`:string,`ua_os_version`:string,`ua_device`:string,`ua_category`:string>, `event_hour` string, `__execution_name__` string) PARTITIONED BY (`event_hour` string, `cs-host` string, `__execution_name__` string) ROW FORMAT SERDE 'org.apache.hadoop.hive.ql.io.parquet.serde.ParquetHiveSerDe'  STORED AS INPUTFORMAT 'org.apache.hadoop.hive.ql.io.parquet.MapredParquetInputFormat' OUTPUTFORMAT 'org.apache.hadoop.hive.ql.io.parquet.MapredParquetOutputFormat' LOCATION '{location}' ;""")        
        assert json.dumps(CLOUDFRONT_PARQUET.statements.insert) == json.dumps("""INSERT INTO \"{destination_database}\".\"{destination_table}\" (\"time\", \"timestamp\", \"x-edge-location\", \"sc-bytes\", \"c-ip\", \"cs-method\", \"cs-host\", \"cs-uri-stem\", \"sc-status-group\", \"sc-status\", \"cs-referer\", \"cs-user-agent\", \"cs-uri-query\", \"cs-cookie\", \"x-edge-result-type\", \"x-edge-request-id\", \"x-host-header\", \"cs-protocol\", \"cs-bytes\", \"time-taken-in-second\", \"time-taken\", \"x-forwarded-for\", \"ssl-protocol\", \"ssl-cipher\", \"x-edge-response-result-type\", \"cs-protocol-version\", \"fle-status\", \"fle-encrypted-fields\", \"c-port\", \"time-to-first-byte\", \"x-edge-detailed-result-type\", \"sc-content-type\", \"sc-content-len\", \"sc-range-start\", \"sc-range-end\", \"hit-cache\", \"back-to-origin\", \"enrichment\", \"event_hour\", \"__execution_name__\") SELECT CAST(to_unixtime(from_iso8601_timestamp(concat(CAST(date AS varchar), 'T', \"time\", 'Z'))) * 1000 AS bigint), from_iso8601_timestamp(concat(CAST(\"date\" AS varchar), 'T', \"time\", 'Z')), \"x-edge-location\", \"sc-bytes\", \"c-ip\", \"cs-method\", \"cs-host\", \"cs-uri-stem\", CASE WHEN \"sc-status\" BETWEEN 100 AND 199 THEN '1xx' WHEN \"sc-status\" BETWEEN 200 AND 299 THEN '2xx' WHEN \"sc-status\" BETWEEN 300 AND 399 THEN '3xx' WHEN \"sc-status\" BETWEEN 400 AND 499 THEN '4xx' WHEN \"sc-status\" BETWEEN 500 AND 599 THEN '5xx' ELSE '-' END, \"sc-status\", \"cs-referer\", url_decode(\"cs-user-agent\"), \"cs-uri-query\", \"cs-cookie\", \"x-edge-result-type\", \"x-edge-request-id\", \"x-host-header\", \"cs-protocol\", \"cs-bytes\", cast(floor(\"time-taken\") as integer), \"time-taken\", \"x-forwarded-for\", \"ssl-protocol\", \"ssl-cipher\", \"x-edge-response-result-type\", \"cs-protocol-version\", \"fle-status\", \"fle-encrypted-fields\", \"c-port\", \"time-to-first-byte\", \"x-edge-detailed-result-type\", \"sc-content-type\", \"sc-content-len\", \"sc-range-start\", \"sc-range-end\", CASE WHEN \"x-edge-result-type\" like '%Hit' THEN true ELSE false END, CASE WHEN (\"x-edge-detailed-result-type\" = 'Miss' OR (\"x-edge-detailed-result-type\" like '%Origin%' AND \"x-edge-detailed-result-type\" <> 'OriginShieldHit')) THEN true ELSE false END, CAST(ROW(json_extract_scalar(\"enrichment\", '$.geo_iso_code'), json_extract_scalar(\"enrichment\", '$.geo_country'), json_extract_scalar(\"enrichment\", '$.geo_city'), json_extract_scalar(\"enrichment\", '$.geo_location'), json_extract_scalar(\"enrichment\", '$.ua_browser'), json_extract_scalar(\"enrichment\", '$.ua_browser_version'), json_extract_scalar(\"enrichment\", '$.ua_os'), json_extract_scalar(\"enrichment\", '$.ua_os_version'), json_extract_scalar(\"enrichment\", '$.ua_device'), json_extract_scalar(\"enrichment\", '$.ua_category')) AS ROW(geo_iso_code varchar, geo_country varchar, geo_city varchar, geo_location varchar, ua_browser varchar, ua_browser_version varchar, ua_os varchar, ua_os_version varchar, ua_device varchar, ua_category varchar)), date_format(from_iso8601_timestamp(concat(CAST(\"date\" AS varchar), 'T', \"time\", 'Z')), '%Y%m%d%H'), '{{}}' FROM \"{source_database}\".\"{source_table}\";""")
        assert json.dumps(CLOUDFRONT_PARQUET.statements.drop) == json.dumps("""DROP TABLE IF EXISTS `{database}`.`{table_name}`""")
        assert json.dumps(CLOUDFRONT_PARQUET.statements.aggregate) == json.dumps("""INSERT INTO \"{destination_database}\".\"{destination_table}\" (\"time\", \"timestamp\", \"x-edge-location\", \"sc-bytes\", \"c-ip\", \"cs-method\", \"cs-host\", \"cs-uri-stem\", \"sc-status-group\", \"sc-status\", \"cs-referer\", \"cs-user-agent\", \"cs-uri-query\", \"cs-cookie\", \"x-edge-result-type\", \"x-edge-request-id\", \"x-host-header\", \"cs-protocol\", \"cs-bytes\", \"time-taken-in-second\", \"time-taken\", \"x-forwarded-for\", \"ssl-protocol\", \"ssl-cipher\", \"x-edge-response-result-type\", \"cs-protocol-version\", \"fle-status\", \"fle-encrypted-fields\", \"c-port\", \"time-to-first-byte\", \"x-edge-detailed-result-type\", \"sc-content-type\", \"sc-content-len\", \"sc-range-start\", \"sc-range-end\", \"hit-cache\", \"back-to-origin\", \"enrichment\", \"event_hour\", \"__execution_name__\") SELECT CAST(to_unixtime(from_iso8601_timestamp(concat(CAST(date AS varchar), 'T', \"time\", 'Z'))) * 1000 AS bigint), from_iso8601_timestamp(concat(CAST(\"date\" AS varchar), 'T', \"time\", 'Z')), \"x-edge-location\", \"sc-bytes\", \"c-ip\", \"cs-method\", \"cs-host\", \"cs-uri-stem\", CASE WHEN \"sc-status\" BETWEEN 100 AND 199 THEN '1xx' WHEN \"sc-status\" BETWEEN 200 AND 299 THEN '2xx' WHEN \"sc-status\" BETWEEN 300 AND 399 THEN '3xx' WHEN \"sc-status\" BETWEEN 400 AND 499 THEN '4xx' WHEN \"sc-status\" BETWEEN 500 AND 599 THEN '5xx' ELSE '-' END, \"sc-status\", \"cs-referer\", url_decode(\"cs-user-agent\"), \"cs-uri-query\", \"cs-cookie\", \"x-edge-result-type\", \"x-edge-request-id\", \"x-host-header\", \"cs-protocol\", \"cs-bytes\", cast(floor(\"time-taken\") as integer), \"time-taken\", \"x-forwarded-for\", \"ssl-protocol\", \"ssl-cipher\", \"x-edge-response-result-type\", \"cs-protocol-version\", \"fle-status\", \"fle-encrypted-fields\", \"c-port\", \"time-to-first-byte\", \"x-edge-detailed-result-type\", \"sc-content-type\", \"sc-content-len\", \"sc-range-start\", \"sc-range-end\", CASE WHEN \"x-edge-result-type\" like '%Hit' THEN true ELSE false END, CASE WHEN (\"x-edge-detailed-result-type\" = 'Miss' OR (\"x-edge-detailed-result-type\" like '%Origin%' AND \"x-edge-detailed-result-type\" <> 'OriginShieldHit')) THEN true ELSE false END, CAST(ROW(json_extract_scalar(\"enrichment\", '$.geo_iso_code'), json_extract_scalar(\"enrichment\", '$.geo_country'), json_extract_scalar(\"enrichment\", '$.geo_city'), json_extract_scalar(\"enrichment\", '$.geo_location'), json_extract_scalar(\"enrichment\", '$.ua_browser'), json_extract_scalar(\"enrichment\", '$.ua_browser_version'), json_extract_scalar(\"enrichment\", '$.ua_os'), json_extract_scalar(\"enrichment\", '$.ua_os_version'), json_extract_scalar(\"enrichment\", '$.ua_device'), json_extract_scalar(\"enrichment\", '$.ua_category')) AS ROW(geo_iso_code varchar, geo_country varchar, geo_city varchar, geo_location varchar, ua_browser varchar, ua_browser_version varchar, ua_os varchar, ua_os_version varchar, ua_device varchar, ua_category varchar)), date_format(from_iso8601_timestamp(concat(CAST(\"date\" AS varchar), 'T', \"time\", 'Z')), '%Y%m%d%H'), '{{}}' FROM \"{source_database}\".\"{source_table}\" WHERE __execution_name__ = '{execution_name}' GROUP BY CAST(to_unixtime(from_iso8601_timestamp(concat(CAST(date AS varchar), 'T', \"time\", 'Z'))) * 1000 AS bigint), from_iso8601_timestamp(concat(CAST(\"date\" AS varchar), 'T', \"time\", 'Z')), \"x-edge-location\", \"sc-bytes\", \"c-ip\", \"cs-method\", \"cs-host\", \"cs-uri-stem\", CASE WHEN \"sc-status\" BETWEEN 100 AND 199 THEN '1xx' WHEN \"sc-status\" BETWEEN 200 AND 299 THEN '2xx' WHEN \"sc-status\" BETWEEN 300 AND 399 THEN '3xx' WHEN \"sc-status\" BETWEEN 400 AND 499 THEN '4xx' WHEN \"sc-status\" BETWEEN 500 AND 599 THEN '5xx' ELSE '-' END, \"sc-status\", \"cs-referer\", url_decode(\"cs-user-agent\"), \"cs-uri-query\", \"cs-cookie\", \"x-edge-result-type\", \"x-edge-request-id\", \"x-host-header\", \"cs-protocol\", \"cs-bytes\", cast(floor(\"time-taken\") as integer), \"time-taken\", \"x-forwarded-for\", \"ssl-protocol\", \"ssl-cipher\", \"x-edge-response-result-type\", \"cs-protocol-version\", \"fle-status\", \"fle-encrypted-fields\", \"c-port\", \"time-to-first-byte\", \"x-edge-detailed-result-type\", \"sc-content-type\", \"sc-content-len\", \"sc-range-start\", \"sc-range-end\", CASE WHEN \"x-edge-result-type\" like '%Hit' THEN true ELSE false END, CASE WHEN (\"x-edge-detailed-result-type\" = 'Miss' OR (\"x-edge-detailed-result-type\" like '%Origin%' AND \"x-edge-detailed-result-type\" <> 'OriginShieldHit')) THEN true ELSE false END, CAST(ROW(json_extract_scalar(\"enrichment\", '$.geo_iso_code'), json_extract_scalar(\"enrichment\", '$.geo_country'), json_extract_scalar(\"enrichment\", '$.geo_city'), json_extract_scalar(\"enrichment\", '$.geo_location'), json_extract_scalar(\"enrichment\", '$.ua_browser'), json_extract_scalar(\"enrichment\", '$.ua_browser_version'), json_extract_scalar(\"enrichment\", '$.ua_os'), json_extract_scalar(\"enrichment\", '$.ua_os_version'), json_extract_scalar(\"enrichment\", '$.ua_device'), json_extract_scalar(\"enrichment\", '$.ua_category')) AS ROW(geo_iso_code varchar, geo_country varchar, geo_city varchar, geo_location varchar, ua_browser varchar, ua_browser_version varchar, ua_os varchar, ua_os_version varchar, ua_device varchar, ua_category varchar)), date_format(from_iso8601_timestamp(concat(CAST(\"date\" AS varchar), 'T', \"time\", 'Z')), '%Y%m%d%H'), '{{}}';""")
        
        CLOUDFRONT_METRICS = TableMetaData(data_format=Parquet, schema=CLOUDFRONT_METRICS_SCHEMA, ignore_partition=False)
        assert CLOUDFRONT_METRICS.columns == [
            {'Name': 'time', 'Type': 'bigint'}, 
            {'Name': 'timestamp', 'Type': 'timestamp'}, 
            {'Name': 'c-ip', 'Type': 'string'}, 
            {'Name': 'cs-method', 'Type': 'string'}, 
            {'Name': 'cs-protocol-version', 'Type': 'string'}, 
            {'Name': 'cs-uri-stem', 'Type': 'string'}, 
            {'Name': 'sc-status-group', 'Type': 'string'}, 
            {'Name': 'sc-status', 'Type': 'int'}, 
            {'Name': 'cs-protocol', 'Type': 'string'}, 
            {'Name': 'time-taken-in-second', 'Type': 'int'},
            {'Name': 'ssl-protocol', 'Type': 'string'}, 
            {'Name': 'x-edge-location', 'Type': 'string'}, 
            {'Name': 'x-edge-result-type', 'Type': 'string'}, 
            {'Name': 'x-edge-response-result-type', 'Type': 'string'}, 
            {'Name': 'x-edge-detailed-result-type', 'Type': 'string'}, 
            {'Name': 'hit-cache', 'Type': 'boolean'}, 
            {'Name': 'back-to-origin', 'Type': 'boolean'}, 
            {'Name': 'ua_os', 'Type': 'string'},
            {'Name': 'ua_device', 'Type': 'string'},
            {'Name': 'ua_browser', 'Type': 'string'},
            {'Name': 'ua_category','Type': 'string'},
            {'Name': 'geo_iso_code', 'Type': 'string'},
            {'Name': 'geo_country', 'Type': 'string'},
            {'Name': 'geo_city', 'Type': 'string'},
            {'Name': 'time-taken', 'Type': 'double'}, 
            {'Name': 'time-to-first-byte', 'Type': 'double'}, 
            {'Name': 'cs-bytes', 'Type': 'double'}, 
            {'Name': 'sc-bytes', 'Type': 'double'}, 
            {'Name': 'requests', 'Type': 'bigint'}
        ]
        assert CLOUDFRONT_METRICS.partition_keys == [
            {'Name': 'event_hour', 'Type': 'string'}, 
            {'Name': 'cs-host', 'Type': 'string'}, 
            {'Name': '__execution_name__', 'Type': 'string'}
        ]
        assert CLOUDFRONT_METRICS.partition_indexes == [
            {'IndexName': 'IDX_EXECUTION_NAME', 'Keys': ['__execution_name__']}, 
            {'IndexName': 'IDX_PARTITIONS', 'Keys': ['event_hour', 'cs-host']}
        ]
        assert CLOUDFRONT_METRICS.partition_info == collections.OrderedDict([('event_hour', {'type': 'time', 'from': '%Y%m%d%H', 'to': '%Y%m%d00'}), ('cs-host', {'type': 'retain'}), ('__execution_name__', {'type': 'default', 'value': '00000000-0000-0000-0000-000000000000'})])
        assert json.dumps(CLOUDFRONT_METRICS.statements.create) == json.dumps("""CREATE EXTERNAL TABLE IF NOT EXISTS `{database}`.`{table_name}` (`time` bigint, `timestamp` timestamp, `c-ip` string, `cs-method` string, `cs-host` string, `cs-protocol-version` string, `cs-uri-stem` string, `sc-status-group` string, `sc-status` int, `cs-protocol` string, `time-taken-in-second` int, `ssl-protocol` string, `x-edge-location` string, `x-edge-result-type` string, `x-edge-response-result-type` string, `x-edge-detailed-result-type` string, `hit-cache` boolean, `back-to-origin` boolean, `ua_os` string, `ua_device` string, `ua_browser` string, `ua_category` string, `geo_iso_code` string, `geo_country` string, `geo_city` string, `time-taken` double, `time-to-first-byte` double, `cs-bytes` double, `sc-bytes` double, `requests` bigint, `event_hour` string, `__execution_name__` string) PARTITIONED BY (`event_hour` string, `cs-host` string, `__execution_name__` string) ROW FORMAT SERDE 'org.apache.hadoop.hive.ql.io.parquet.serde.ParquetHiveSerDe'  STORED AS INPUTFORMAT 'org.apache.hadoop.hive.ql.io.parquet.MapredParquetInputFormat' OUTPUTFORMAT 'org.apache.hadoop.hive.ql.io.parquet.MapredParquetOutputFormat' LOCATION '{location}' ;""")        
        assert json.dumps(CLOUDFRONT_METRICS.statements.insert) == json.dumps("""INSERT INTO \"{destination_database}\".\"{destination_table}\" (\"time\", \"timestamp\", \"c-ip\", \"cs-method\", \"cs-host\", \"cs-protocol-version\", \"cs-uri-stem\", \"sc-status-group\", \"sc-status\", \"cs-protocol\", \"time-taken-in-second\", \"ssl-protocol\", \"x-edge-location\", \"x-edge-result-type\", \"x-edge-response-result-type\", \"x-edge-detailed-result-type\", \"hit-cache\", \"back-to-origin\", \"ua_os\", \"ua_device\", \"ua_browser\", \"ua_category\", \"geo_iso_code\", \"geo_country\", \"geo_city\", \"time-taken\", \"time-to-first-byte\", \"cs-bytes\", \"sc-bytes\", \"requests\", \"event_hour\", \"__execution_name__\") SELECT FLOOR(\"time\" / 60000) * 60000, DATE_TRUNC('minute', \"timestamp\"), \"c-ip\", \"cs-method\", \"cs-host\", \"cs-protocol-version\", \"cs-uri-stem\", \"sc-status-group\", \"sc-status\", \"cs-protocol\", \"time-taken-in-second\", \"ssl-protocol\", \"x-edge-location\", \"x-edge-result-type\", \"x-edge-response-result-type\", \"x-edge-detailed-result-type\", \"hit-cache\", \"back-to-origin\", \"enrichment\".\"ua_os\", \"enrichment\".\"ua_device\", \"enrichment\".\"ua_browser\", \"enrichment\".\"ua_category\", \"enrichment\".\"geo_iso_code\", \"enrichment\".\"geo_country\", \"enrichment\".\"geo_city\", cast(sum(\"time-taken\") as double), cast(sum(\"time-to-first-byte\") as double), cast(sum(\"cs-bytes\") as double), cast(sum(\"sc-bytes\") as double), cast(count(1) as bigint), \"event_hour\", \"__execution_name__\" FROM \"{source_database}\".\"{source_table}\";""")
        assert json.dumps(CLOUDFRONT_METRICS.statements.drop) == json.dumps("""DROP TABLE IF EXISTS `{database}`.`{table_name}`""")
        assert json.dumps(CLOUDFRONT_METRICS.statements.aggregate) == json.dumps("""INSERT INTO \"{destination_database}\".\"{destination_table}\" (\"time\", \"timestamp\", \"c-ip\", \"cs-method\", \"cs-host\", \"cs-protocol-version\", \"cs-uri-stem\", \"sc-status-group\", \"sc-status\", \"cs-protocol\", \"time-taken-in-second\", \"ssl-protocol\", \"x-edge-location\", \"x-edge-result-type\", \"x-edge-response-result-type\", \"x-edge-detailed-result-type\", \"hit-cache\", \"back-to-origin\", \"ua_os\", \"ua_device\", \"ua_browser\", \"ua_category\", \"geo_iso_code\", \"geo_country\", \"geo_city\", \"time-taken\", \"time-to-first-byte\", \"cs-bytes\", \"sc-bytes\", \"requests\", \"event_hour\", \"__execution_name__\") SELECT FLOOR(\"time\" / 60000) * 60000, DATE_TRUNC('minute', \"timestamp\"), \"c-ip\", \"cs-method\", \"cs-host\", \"cs-protocol-version\", \"cs-uri-stem\", \"sc-status-group\", \"sc-status\", \"cs-protocol\", \"time-taken-in-second\", \"ssl-protocol\", \"x-edge-location\", \"x-edge-result-type\", \"x-edge-response-result-type\", \"x-edge-detailed-result-type\", \"hit-cache\", \"back-to-origin\", \"enrichment\".\"ua_os\", \"enrichment\".\"ua_device\", \"enrichment\".\"ua_browser\", \"enrichment\".\"ua_category\", \"enrichment\".\"geo_iso_code\", \"enrichment\".\"geo_country\", \"enrichment\".\"geo_city\", cast(sum(\"time-taken\") as double), cast(sum(\"time-to-first-byte\") as double), cast(sum(\"cs-bytes\") as double), cast(sum(\"sc-bytes\") as double), cast(count(1) as bigint), \"event_hour\", \"__execution_name__\" FROM \"{source_database}\".\"{source_table}\" WHERE __execution_name__ = '{execution_name}' GROUP BY FLOOR(\"time\" / 60000) * 60000, DATE_TRUNC('minute', \"timestamp\"), \"c-ip\", \"cs-method\", \"cs-host\", \"cs-protocol-version\", \"cs-uri-stem\", \"sc-status-group\", \"sc-status\", \"cs-protocol\", \"time-taken-in-second\", \"ssl-protocol\", \"x-edge-location\", \"x-edge-result-type\", \"x-edge-response-result-type\", \"x-edge-detailed-result-type\", \"hit-cache\", \"back-to-origin\", \"enrichment\".\"ua_os\", \"enrichment\".\"ua_device\", \"enrichment\".\"ua_browser\", \"enrichment\".\"ua_category\", \"enrichment\".\"geo_iso_code\", \"enrichment\".\"geo_country\", \"enrichment\".\"geo_city\", \"event_hour\", \"__execution_name__\";""")
    
    def test_alb(self,):
        from utils.aws.glue.table import TableMetaData
        from utils.aws.glue.dataformat import Regex, Parquet, Json
        from utils.logschema.services import ALB_RAW_SCHEMA, ALB_PARQUET_SCHEMA, ALB_METRICS_SCHEMA
        
        ALB_RAW = TableMetaData(data_format=Regex, schema=ALB_RAW_SCHEMA, serialization_properties={'input.regex': '([^ ]*) ([^ ]*) ([^ ]*) ([^ ]*):([0-9]*) ([^ ]*)[:-]([0-9]*) ([-.0-9]*) ([-.0-9]*) ([-.0-9]*) (|[-0-9]*) (-|[-0-9]*) ([-0-9]*) ([-0-9]*) "([^ ]*) (.*) (- |[^ ]*)" "([^"]*)" ([A-Z0-9-_]+) ([A-Za-z0-9.-]*) ([^ ]*) "([^"]*)" "([^"]*)" "([^"]*)" ([-.0-9]*) ([^ ]*) "([^"]*)" "([^"]*)" "([^ ]*)" "([^s]+?)" "([^s]+)" "([^ ]*)" "([^ ]*)" ?(.*)'}, ignore_partition=True)
        assert ALB_RAW.columns == [
            {'Name': 'type', 'Type': 'string'}, 
            {'Name': 'time', 'Type': 'string'}, 
            {'Name': 'elb', 'Type': 'string'}, 
            {'Name': 'client_ip', 'Type': 'string'}, 
            {'Name': 'client_port', 'Type': 'int'}, 
            {'Name': 'target_ip', 'Type': 'string'}, 
            {'Name': 'target_port', 'Type': 'int'}, 
            {'Name': 'request_processing_time', 'Type': 'double'}, 
            {'Name': 'target_processing_time', 'Type': 'double'},
            {'Name': 'response_processing_time', 'Type': 'double'}, 
            {'Name': 'elb_status_code', 'Type': 'int'}, 
            {'Name': 'target_status_code', 'Type': 'string'}, 
            {'Name': 'received_bytes', 'Type': 'double'}, 
            {'Name': 'sent_bytes', 'Type': 'double'}, 
            {'Name': 'request_verb', 'Type': 'string'}, 
            {'Name': 'request_url', 'Type': 'string'}, 
            {'Name': 'request_proto', 'Type': 'string'}, 
            {'Name': 'user_agent', 'Type': 'string'}, 
            {'Name': 'ssl_cipher', 'Type': 'string'}, 
            {'Name': 'ssl_protocol', 'Type': 'string'}, 
            {'Name': 'target_group_arn', 'Type': 'string'}, 
            {'Name': 'trace_id', 'Type': 'string'}, 
            {'Name': 'domain_name', 'Type': 'string'}, 
            {'Name': 'chosen_cert_arn', 'Type': 'string'}, 
            {'Name': 'matched_rule_priority', 'Type': 'string'}, 
            {'Name': 'request_creation_time', 'Type': 'string'}, 
            {'Name': 'actions_executed', 'Type': 'string'}, 
            {'Name': 'redirect_url', 'Type': 'string'}, 
            {'Name': 'lambda_error_reason', 'Type': 'string'}, 
            {'Name': 'target_port_list', 'Type': 'string'}, 
            {'Name': 'target_status_code_list', 'Type': 'string'}, 
            {'Name': 'classification', 'Type': 'string'}, 
            {'Name': 'classification_reason', 'Type': 'string'},
            {'Name': 'enrichment', 'Type': 'string'},
        ]
        assert ALB_RAW.partition_keys == []
        assert ALB_RAW.partition_indexes == []
        assert ALB_RAW.partition_info == {}
        assert json.dumps(ALB_RAW.statements.create) == json.dumps("""CREATE EXTERNAL TABLE IF NOT EXISTS `{database}`.`{table_name}` (`type` string, `time` string, `elb` string, `client_ip` string, `client_port` int, `target_ip` string, `target_port` int, `request_processing_time` double, `target_processing_time` double, `response_processing_time` double, `elb_status_code` int, `target_status_code` string, `received_bytes` double, `sent_bytes` double, `request_verb` string, `request_url` string, `request_proto` string, `user_agent` string, `ssl_cipher` string, `ssl_protocol` string, `target_group_arn` string, `trace_id` string, `domain_name` string, `chosen_cert_arn` string, `matched_rule_priority` string, `request_creation_time` string, `actions_executed` string, `redirect_url` string, `lambda_error_reason` string, `target_port_list` string, `target_status_code_list` string, `classification` string, `classification_reason` string, `enrichment` string)  ROW FORMAT SERDE 'org.apache.hadoop.hive.serde2.RegexSerDe' WITH SERDEPROPERTIES ('input.regex'='([^ ]*) ([^ ]*) ([^ ]*) ([^ ]*):([0-9]*) ([^ ]*)[:-]([0-9]*) ([-.0-9]*) ([-.0-9]*) ([-.0-9]*) (|[-0-9]*) (-|[-0-9]*) ([-0-9]*) ([-0-9]*) \"([^ ]*) (.*) (- |[^ ]*)\" \"([^\"]*)\" ([A-Z0-9-_]+) ([A-Za-z0-9.-]*) ([^ ]*) \"([^\"]*)\" \"([^\"]*)\" \"([^\"]*)\" ([-.0-9]*) ([^ ]*) \"([^\"]*)\" \"([^\"]*)\" \"([^ ]*)\" \"([^s]+?)\" \"([^s]+)\" \"([^ ]*)\" \"([^ ]*)\" ?(.*)') STORED AS INPUTFORMAT 'org.apache.hadoop.mapred.TextInputFormat' OUTPUTFORMAT 'org.apache.hadoop.hive.ql.io.HiveIgnoreKeyTextOutputFormat' LOCATION '{location}' ;""")        
        assert json.dumps(ALB_RAW.statements.insert) == json.dumps("""INSERT INTO \"{destination_database}\".\"{destination_table}\" (\"type\", \"time\", \"elb\", \"client_ip\", \"client_port\", \"target_ip\", \"target_port\", \"request_processing_time\", \"target_processing_time\", \"response_processing_time\", \"elb_status_code\", \"target_status_code\", \"received_bytes\", \"sent_bytes\", \"request_verb\", \"request_url\", \"request_proto\", \"user_agent\", \"ssl_cipher\", \"ssl_protocol\", \"target_group_arn\", \"trace_id\", \"domain_name\", \"chosen_cert_arn\", \"matched_rule_priority\", \"request_creation_time\", \"actions_executed\", \"redirect_url\", \"lambda_error_reason\", \"target_port_list\", \"target_status_code_list\", \"classification\", \"classification_reason\", \"enrichment\") SELECT \"type\", \"time\", \"elb\", \"client_ip\", \"client_port\", \"target_ip\", \"target_port\", \"request_processing_time\", \"target_processing_time\", \"response_processing_time\", \"elb_status_code\", \"target_status_code\", \"received_bytes\", \"sent_bytes\", \"request_verb\", \"request_url\", \"request_proto\", \"user_agent\", \"ssl_cipher\", \"ssl_protocol\", \"target_group_arn\", \"trace_id\", \"domain_name\", \"chosen_cert_arn\", \"matched_rule_priority\", \"request_creation_time\", \"actions_executed\", \"redirect_url\", \"lambda_error_reason\", \"target_port_list\", \"target_status_code_list\", \"classification\", \"classification_reason\", \"enrichment\" FROM \"{source_database}\".\"{source_table}\";""")
        assert json.dumps(ALB_RAW.statements.drop) == json.dumps("""DROP TABLE IF EXISTS `{database}`.`{table_name}`""")
        assert json.dumps(ALB_RAW.statements.aggregate) == json.dumps("""INSERT INTO \"{destination_database}\".\"{destination_table}\" (\"type\", \"time\", \"elb\", \"client_ip\", \"client_port\", \"target_ip\", \"target_port\", \"request_processing_time\", \"target_processing_time\", \"response_processing_time\", \"elb_status_code\", \"target_status_code\", \"received_bytes\", \"sent_bytes\", \"request_verb\", \"request_url\", \"request_proto\", \"user_agent\", \"ssl_cipher\", \"ssl_protocol\", \"target_group_arn\", \"trace_id\", \"domain_name\", \"chosen_cert_arn\", \"matched_rule_priority\", \"request_creation_time\", \"actions_executed\", \"redirect_url\", \"lambda_error_reason\", \"target_port_list\", \"target_status_code_list\", \"classification\", \"classification_reason\", \"enrichment\") SELECT \"type\", \"time\", \"elb\", \"client_ip\", \"client_port\", \"target_ip\", \"target_port\", \"request_processing_time\", \"target_processing_time\", \"response_processing_time\", \"elb_status_code\", \"target_status_code\", \"received_bytes\", \"sent_bytes\", \"request_verb\", \"request_url\", \"request_proto\", \"user_agent\", \"ssl_cipher\", \"ssl_protocol\", \"target_group_arn\", \"trace_id\", \"domain_name\", \"chosen_cert_arn\", \"matched_rule_priority\", \"request_creation_time\", \"actions_executed\", \"redirect_url\", \"lambda_error_reason\", \"target_port_list\", \"target_status_code_list\", \"classification\", \"classification_reason\", \"enrichment\" FROM \"{source_database}\".\"{source_table}\" WHERE __execution_name__ = '{execution_name}' GROUP BY \"type\", \"time\", \"elb\", \"client_ip\", \"client_port\", \"target_ip\", \"target_port\", \"request_processing_time\", \"target_processing_time\", \"response_processing_time\", \"elb_status_code\", \"target_status_code\", \"received_bytes\", \"sent_bytes\", \"request_verb\", \"request_url\", \"request_proto\", \"user_agent\", \"ssl_cipher\", \"ssl_protocol\", \"target_group_arn\", \"trace_id\", \"domain_name\", \"chosen_cert_arn\", \"matched_rule_priority\", \"request_creation_time\", \"actions_executed\", \"redirect_url\", \"lambda_error_reason\", \"target_port_list\", \"target_status_code_list\", \"classification\", \"classification_reason\", \"enrichment\";""")
        
        ALB_PARQUET = TableMetaData(data_format=Parquet, schema=ALB_PARQUET_SCHEMA, ignore_partition=False)
        assert ALB_PARQUET.columns == [
            {'Name': 'time', 'Type': 'bigint'}, 
            {'Name': 'timestamp', 'Type': 'timestamp'}, 
            {'Name': 'type', 'Type': 'string'}, 
            {'Name': 'client_ip', 'Type': 'string'}, 
            {'Name': 'client_port', 'Type': 'int'}, 
            {'Name': 'target_ip', 'Type': 'string'}, 
            {'Name': 'target_port', 'Type': 'int'}, 
            {'Name': 'request_processing_time', 'Type': 'double'}, 
            {'Name': 'target_processing_time', 'Type': 'double'}, 
            {'Name': 'response_processing_time', 'Type': 'double'}, 
            {'Name': 'elb_status_code_group', 'Type': 'string'}, 
            {'Name': 'elb_status_code', 'Type': 'int'}, 
            {'Name': 'target_status_code', 'Type': 'string'}, 
            {'Name': 'received_bytes', 'Type': 'double'}, 
            {'Name': 'sent_bytes', 'Type': 'double'}, 
            {'Name': 'request_verb', 'Type': 'string'}, 
            {'Name': 'request_url', 'Type': 'string'}, 
            {'Name': 'request_host', 'Type': 'string'}, 
            {'Name': 'request_path', 'Type': 'string'}, 
            {'Name': 'request_proto', 'Type': 'string'}, 
            {'Name': 'user_agent', 'Type': 'string'}, 
            {'Name': 'ssl_cipher', 'Type': 'string'}, 
            {'Name': 'ssl_protocol', 'Type': 'string'}, 
            {'Name': 'target_group_arn', 'Type': 'string'}, 
            {'Name': 'trace_id', 'Type': 'string'}, 
            {'Name': 'domain_name', 'Type': 'string'}, 
            {'Name': 'chosen_cert_arn', 'Type': 'string'}, 
            {'Name': 'matched_rule_priority', 'Type': 'string'}, 
            {'Name': 'request_creation_time', 'Type': 'string'}, 
            {'Name': 'actions_executed', 'Type': 'string'}, 
            {'Name': 'redirect_url', 'Type': 'string'}, 
            {'Name': 'lambda_error_reason', 'Type': 'string'}, 
            {'Name': 'target_port_list', 'Type': 'string'}, 
            {'Name': 'target_status_code_list', 'Type': 'string'}, 
            {'Name': 'classification', 'Type': 'string'}, 
            {'Name': 'classification_reason', 'Type': 'string'},
            {'Name': 'enrichment', 'Type': 'struct<geo_iso_code:string,geo_country:string,geo_city:string,geo_location:string,ua_browser:string,ua_browser_version:string,ua_os:string,ua_os_version:string,ua_device:string,ua_category:string>'},
        ]
        
        assert ALB_PARQUET.partition_keys == [
            {'Name': 'event_hour', 'Type': 'string'}, 
            {'Name': 'elb', 'Type': 'string'}, 
            {'Name': '__execution_name__', 'Type': 'string'}
        ]
        assert ALB_PARQUET.partition_indexes == [
            {'IndexName': 'IDX_EXECUTION_NAME', 'Keys': ['__execution_name__']}, 
            {'IndexName': 'IDX_PARTITIONS', 'Keys': ['event_hour', 'elb']}
        ]
        assert ALB_PARQUET.partition_info == collections.OrderedDict([('event_hour', {'type': 'time', 'from': '%Y%m%d%H', 'to': '%Y%m%d00'}), ('elb', {'type': 'retain'}), ('__execution_name__', {'type': 'default', 'value': '00000000-0000-0000-0000-000000000000'})])
        assert json.dumps(ALB_PARQUET.statements.create) == json.dumps("""CREATE EXTERNAL TABLE IF NOT EXISTS `{database}`.`{table_name}` (`time` bigint, `timestamp` timestamp, `type` string, `elb` string, `client_ip` string, `client_port` int, `target_ip` string, `target_port` int, `request_processing_time` double, `target_processing_time` double, `response_processing_time` double, `elb_status_code_group` string, `elb_status_code` int, `target_status_code` string, `received_bytes` double, `sent_bytes` double, `request_verb` string, `request_url` string, `request_host` string, `request_path` string, `request_proto` string, `user_agent` string, `ssl_cipher` string, `ssl_protocol` string, `target_group_arn` string, `trace_id` string, `domain_name` string, `chosen_cert_arn` string, `matched_rule_priority` string, `request_creation_time` string, `actions_executed` string, `redirect_url` string, `lambda_error_reason` string, `target_port_list` string, `target_status_code_list` string, `classification` string, `classification_reason` string, `enrichment` struct<`geo_iso_code`:string,`geo_country`:string,`geo_city`:string,`geo_location`:string,`ua_browser`:string,`ua_browser_version`:string,`ua_os`:string,`ua_os_version`:string,`ua_device`:string,`ua_category`:string>, `event_hour` string, `__execution_name__` string) PARTITIONED BY (`event_hour` string, `elb` string, `__execution_name__` string) ROW FORMAT SERDE 'org.apache.hadoop.hive.ql.io.parquet.serde.ParquetHiveSerDe'  STORED AS INPUTFORMAT 'org.apache.hadoop.hive.ql.io.parquet.MapredParquetInputFormat' OUTPUTFORMAT 'org.apache.hadoop.hive.ql.io.parquet.MapredParquetOutputFormat' LOCATION '{location}' ;""")        
        assert json.dumps(ALB_PARQUET.statements.insert) == json.dumps("""INSERT INTO \"{destination_database}\".\"{destination_table}\" (\"time\", \"timestamp\", \"type\", \"elb\", \"client_ip\", \"client_port\", \"target_ip\", \"target_port\", \"request_processing_time\", \"target_processing_time\", \"response_processing_time\", \"elb_status_code_group\", \"elb_status_code\", \"target_status_code\", \"received_bytes\", \"sent_bytes\", \"request_verb\", \"request_url\", \"request_host\", \"request_path\", \"request_proto\", \"user_agent\", \"ssl_cipher\", \"ssl_protocol\", \"target_group_arn\", \"trace_id\", \"domain_name\", \"chosen_cert_arn\", \"matched_rule_priority\", \"request_creation_time\", \"actions_executed\", \"redirect_url\", \"lambda_error_reason\", \"target_port_list\", \"target_status_code_list\", \"classification\", \"classification_reason\", \"enrichment\", \"event_hour\", \"__execution_name__\") SELECT CAST(to_unixtime(from_iso8601_timestamp(\"time\")) * 1000 AS bigint), from_iso8601_timestamp(\"time\"), \"type\", \"elb\", \"client_ip\", \"client_port\", \"target_ip\", \"target_port\", \"request_processing_time\", \"target_processing_time\", \"response_processing_time\", CASE WHEN elb_status_code BETWEEN 100 AND 199 THEN '1xx' WHEN elb_status_code BETWEEN 200 AND 299 THEN '2xx' WHEN elb_status_code BETWEEN 300 AND 399 THEN '3xx' WHEN elb_status_code BETWEEN 400 AND 499 THEN '4xx' WHEN elb_status_code BETWEEN 500 AND 599 THEN '5xx' ELSE '-' END, \"elb_status_code\", \"target_status_code\", \"received_bytes\", \"sent_bytes\", \"request_verb\", \"request_url\", url_extract_host(\"request_url\"), url_extract_path(\"request_url\"), \"request_proto\", \"user_agent\", \"ssl_cipher\", \"ssl_protocol\", \"target_group_arn\", \"trace_id\", \"domain_name\", \"chosen_cert_arn\", \"matched_rule_priority\", \"request_creation_time\", \"actions_executed\", \"redirect_url\", \"lambda_error_reason\", \"target_port_list\", \"target_status_code_list\", \"classification\", \"classification_reason\", CAST(ROW(json_extract_scalar(\"enrichment\", '$.geo_iso_code'), json_extract_scalar(\"enrichment\", '$.geo_country'), json_extract_scalar(\"enrichment\", '$.geo_city'), json_extract_scalar(\"enrichment\", '$.geo_location'), json_extract_scalar(\"enrichment\", '$.ua_browser'), json_extract_scalar(\"enrichment\", '$.ua_browser_version'), json_extract_scalar(\"enrichment\", '$.ua_os'), json_extract_scalar(\"enrichment\", '$.ua_os_version'), json_extract_scalar(\"enrichment\", '$.ua_device'), json_extract_scalar(\"enrichment\", '$.ua_category')) AS ROW(geo_iso_code varchar, geo_country varchar, geo_city varchar, geo_location varchar, ua_browser varchar, ua_browser_version varchar, ua_os varchar, ua_os_version varchar, ua_device varchar, ua_category varchar)), date_format(from_iso8601_timestamp(\"time\"), '%Y%m%d%H'), '{{}}' FROM \"{source_database}\".\"{source_table}\";""")
        assert json.dumps(ALB_PARQUET.statements.drop) == json.dumps("""DROP TABLE IF EXISTS `{database}`.`{table_name}`""")
        assert json.dumps(ALB_PARQUET.statements.aggregate) == json.dumps("""INSERT INTO \"{destination_database}\".\"{destination_table}\" (\"time\", \"timestamp\", \"type\", \"elb\", \"client_ip\", \"client_port\", \"target_ip\", \"target_port\", \"request_processing_time\", \"target_processing_time\", \"response_processing_time\", \"elb_status_code_group\", \"elb_status_code\", \"target_status_code\", \"received_bytes\", \"sent_bytes\", \"request_verb\", \"request_url\", \"request_host\", \"request_path\", \"request_proto\", \"user_agent\", \"ssl_cipher\", \"ssl_protocol\", \"target_group_arn\", \"trace_id\", \"domain_name\", \"chosen_cert_arn\", \"matched_rule_priority\", \"request_creation_time\", \"actions_executed\", \"redirect_url\", \"lambda_error_reason\", \"target_port_list\", \"target_status_code_list\", \"classification\", \"classification_reason\", \"enrichment\", \"event_hour\", \"__execution_name__\") SELECT CAST(to_unixtime(from_iso8601_timestamp(\"time\")) * 1000 AS bigint), from_iso8601_timestamp(\"time\"), \"type\", \"elb\", \"client_ip\", \"client_port\", \"target_ip\", \"target_port\", \"request_processing_time\", \"target_processing_time\", \"response_processing_time\", CASE WHEN elb_status_code BETWEEN 100 AND 199 THEN '1xx' WHEN elb_status_code BETWEEN 200 AND 299 THEN '2xx' WHEN elb_status_code BETWEEN 300 AND 399 THEN '3xx' WHEN elb_status_code BETWEEN 400 AND 499 THEN '4xx' WHEN elb_status_code BETWEEN 500 AND 599 THEN '5xx' ELSE '-' END, \"elb_status_code\", \"target_status_code\", \"received_bytes\", \"sent_bytes\", \"request_verb\", \"request_url\", url_extract_host(\"request_url\"), url_extract_path(\"request_url\"), \"request_proto\", \"user_agent\", \"ssl_cipher\", \"ssl_protocol\", \"target_group_arn\", \"trace_id\", \"domain_name\", \"chosen_cert_arn\", \"matched_rule_priority\", \"request_creation_time\", \"actions_executed\", \"redirect_url\", \"lambda_error_reason\", \"target_port_list\", \"target_status_code_list\", \"classification\", \"classification_reason\", CAST(ROW(json_extract_scalar(\"enrichment\", '$.geo_iso_code'), json_extract_scalar(\"enrichment\", '$.geo_country'), json_extract_scalar(\"enrichment\", '$.geo_city'), json_extract_scalar(\"enrichment\", '$.geo_location'), json_extract_scalar(\"enrichment\", '$.ua_browser'), json_extract_scalar(\"enrichment\", '$.ua_browser_version'), json_extract_scalar(\"enrichment\", '$.ua_os'), json_extract_scalar(\"enrichment\", '$.ua_os_version'), json_extract_scalar(\"enrichment\", '$.ua_device'), json_extract_scalar(\"enrichment\", '$.ua_category')) AS ROW(geo_iso_code varchar, geo_country varchar, geo_city varchar, geo_location varchar, ua_browser varchar, ua_browser_version varchar, ua_os varchar, ua_os_version varchar, ua_device varchar, ua_category varchar)), date_format(from_iso8601_timestamp(\"time\"), '%Y%m%d%H'), '{{}}' FROM \"{source_database}\".\"{source_table}\" WHERE __execution_name__ = '{execution_name}' GROUP BY CAST(to_unixtime(from_iso8601_timestamp(\"time\")) * 1000 AS bigint), from_iso8601_timestamp(\"time\"), \"type\", \"elb\", \"client_ip\", \"client_port\", \"target_ip\", \"target_port\", \"request_processing_time\", \"target_processing_time\", \"response_processing_time\", CASE WHEN elb_status_code BETWEEN 100 AND 199 THEN '1xx' WHEN elb_status_code BETWEEN 200 AND 299 THEN '2xx' WHEN elb_status_code BETWEEN 300 AND 399 THEN '3xx' WHEN elb_status_code BETWEEN 400 AND 499 THEN '4xx' WHEN elb_status_code BETWEEN 500 AND 599 THEN '5xx' ELSE '-' END, \"elb_status_code\", \"target_status_code\", \"received_bytes\", \"sent_bytes\", \"request_verb\", \"request_url\", url_extract_host(\"request_url\"), url_extract_path(\"request_url\"), \"request_proto\", \"user_agent\", \"ssl_cipher\", \"ssl_protocol\", \"target_group_arn\", \"trace_id\", \"domain_name\", \"chosen_cert_arn\", \"matched_rule_priority\", \"request_creation_time\", \"actions_executed\", \"redirect_url\", \"lambda_error_reason\", \"target_port_list\", \"target_status_code_list\", \"classification\", \"classification_reason\", CAST(ROW(json_extract_scalar(\"enrichment\", '$.geo_iso_code'), json_extract_scalar(\"enrichment\", '$.geo_country'), json_extract_scalar(\"enrichment\", '$.geo_city'), json_extract_scalar(\"enrichment\", '$.geo_location'), json_extract_scalar(\"enrichment\", '$.ua_browser'), json_extract_scalar(\"enrichment\", '$.ua_browser_version'), json_extract_scalar(\"enrichment\", '$.ua_os'), json_extract_scalar(\"enrichment\", '$.ua_os_version'), json_extract_scalar(\"enrichment\", '$.ua_device'), json_extract_scalar(\"enrichment\", '$.ua_category')) AS ROW(geo_iso_code varchar, geo_country varchar, geo_city varchar, geo_location varchar, ua_browser varchar, ua_browser_version varchar, ua_os varchar, ua_os_version varchar, ua_device varchar, ua_category varchar)), date_format(from_iso8601_timestamp(\"time\"), '%Y%m%d%H'), '{{}}';""")
        
        ALB_METRICS = TableMetaData(data_format=Parquet, schema=ALB_METRICS_SCHEMA, ignore_partition=False)
        assert ALB_METRICS.columns == [
            {'Name': 'time', 'Type': 'bigint'}, 
            {'Name': 'timestamp', 'Type': 'timestamp'}, 
            {'Name': 'type', 'Type': 'string'}, 
            {'Name': 'client_ip', 'Type': 'string'}, 
            {'Name': 'target_group_arn', 'Type': 'string'},
            {'Name': 'target_ip', 'Type': 'string'}, 
            {'Name': 'elb_status_code_group', 'Type': 'string'}, 
            {'Name': 'elb_status_code', 'Type': 'int'}, 
            {'Name': 'request_verb', 'Type': 'string'}, 
            {'Name': 'request_host', 'Type': 'string'},
            {'Name': 'request_path', 'Type': 'string'}, 
            {'Name': 'ssl_protocol', 'Type': 'string'}, 
            {'Name': 'user_agent', 'Type': 'string'}, 
            {'Name': 'ua_os', 'Type': 'string'},
            {'Name': 'ua_device', 'Type': 'string'},
            {'Name': 'ua_browser', 'Type': 'string'},
            {'Name': 'ua_category', 'Type': 'string'},
            {'Name': 'geo_iso_code', 'Type': 'string'},
            {'Name': 'geo_country', 'Type': 'string'},
            {'Name': 'geo_city', 'Type': 'string'},
            {'Name': 'received_bytes', 'Type': 'double'},
            {'Name': 'sent_bytes', 'Type': 'double'}, 
            {'Name': 'request_processing_time', 'Type': 'double'}, 
            {'Name': 'target_processing_time', 'Type': 'double'}, 
            {'Name': 'response_processing_time', 'Type': 'double'}, 
            {'Name': 'requests', 'Type': 'bigint'}
        ]
        assert ALB_METRICS.partition_keys == [
            {'Name': 'event_hour', 'Type': 'string'}, 
            {'Name': 'elb', 'Type': 'string'}, 
            {'Name': '__execution_name__', 'Type': 'string'}
        ]
        assert ALB_METRICS.partition_indexes == [
            {'IndexName': 'IDX_EXECUTION_NAME', 'Keys': ['__execution_name__']}, 
            {'IndexName': 'IDX_PARTITIONS', 'Keys': ['event_hour', 'elb']}
        ]
        assert ALB_METRICS.partition_info == collections.OrderedDict([('event_hour', {'type': 'time', 'from': '%Y%m%d%H', 'to': '%Y%m%d00'}), ('elb', {'type': 'retain'}), ('__execution_name__', {'type': 'default', 'value': '00000000-0000-0000-0000-000000000000'})])
        assert json.dumps(ALB_METRICS.statements.create) == json.dumps("""CREATE EXTERNAL TABLE IF NOT EXISTS `{database}`.`{table_name}` (`time` bigint, `timestamp` timestamp, `type` string, `elb` string, `client_ip` string, `target_group_arn` string, `target_ip` string, `elb_status_code_group` string, `elb_status_code` int, `request_verb` string, `request_host` string, `request_path` string, `ssl_protocol` string, `user_agent` string, `ua_os` string, `ua_device` string, `ua_browser` string, `ua_category` string, `geo_iso_code` string, `geo_country` string, `geo_city` string, `received_bytes` double, `sent_bytes` double, `request_processing_time` double, `target_processing_time` double, `response_processing_time` double, `requests` bigint, `event_hour` string, `__execution_name__` string) PARTITIONED BY (`event_hour` string, `elb` string, `__execution_name__` string) ROW FORMAT SERDE 'org.apache.hadoop.hive.ql.io.parquet.serde.ParquetHiveSerDe'  STORED AS INPUTFORMAT 'org.apache.hadoop.hive.ql.io.parquet.MapredParquetInputFormat' OUTPUTFORMAT 'org.apache.hadoop.hive.ql.io.parquet.MapredParquetOutputFormat' LOCATION '{location}' ;""")        
        assert json.dumps(ALB_METRICS.statements.insert) == json.dumps("""INSERT INTO \"{destination_database}\".\"{destination_table}\" (\"time\", \"timestamp\", \"type\", \"elb\", \"client_ip\", \"target_group_arn\", \"target_ip\", \"elb_status_code_group\", \"elb_status_code\", \"request_verb\", \"request_host\", \"request_path\", \"ssl_protocol\", \"user_agent\", \"ua_os\", \"ua_device\", \"ua_browser\", \"ua_category\", \"geo_iso_code\", \"geo_country\", \"geo_city\", \"received_bytes\", \"sent_bytes\", \"request_processing_time\", \"target_processing_time\", \"response_processing_time\", \"requests\", \"event_hour\", \"__execution_name__\") SELECT FLOOR(\"time\" / 60000) * 60000, DATE_TRUNC('minute', \"timestamp\"), \"type\", \"elb\", \"client_ip\", \"target_group_arn\", \"target_ip\", \"elb_status_code_group\", \"elb_status_code\", \"request_verb\", url_extract_host(\"request_url\"), url_extract_path(\"request_url\"), \"ssl_protocol\", \"user_agent\", \"enrichment\".\"ua_os\", \"enrichment\".\"ua_device\", \"enrichment\".\"ua_browser\", \"enrichment\".\"ua_category\", \"enrichment\".\"geo_iso_code\", \"enrichment\".\"geo_country\", \"enrichment\".\"geo_city\", CAST(SUM(\"received_bytes\") AS DOUBLE), CAST(SUM(\"sent_bytes\") AS DOUBLE), CAST(SUM(\"request_processing_time\") AS DOUBLE), CAST(SUM(\"target_processing_time\") AS DOUBLE), CAST(SUM(\"response_processing_time\") AS DOUBLE), CAST(COUNT(1) AS bigint), \"event_hour\", \"__execution_name__\" FROM \"{source_database}\".\"{source_table}\";""")
        assert json.dumps(ALB_METRICS.statements.drop) == json.dumps("""DROP TABLE IF EXISTS `{database}`.`{table_name}`""")
        assert json.dumps(ALB_METRICS.statements.aggregate) == json.dumps("""INSERT INTO \"{destination_database}\".\"{destination_table}\" (\"time\", \"timestamp\", \"type\", \"elb\", \"client_ip\", \"target_group_arn\", \"target_ip\", \"elb_status_code_group\", \"elb_status_code\", \"request_verb\", \"request_host\", \"request_path\", \"ssl_protocol\", \"user_agent\", \"ua_os\", \"ua_device\", \"ua_browser\", \"ua_category\", \"geo_iso_code\", \"geo_country\", \"geo_city\", \"received_bytes\", \"sent_bytes\", \"request_processing_time\", \"target_processing_time\", \"response_processing_time\", \"requests\", \"event_hour\", \"__execution_name__\") SELECT FLOOR(\"time\" / 60000) * 60000, DATE_TRUNC('minute', \"timestamp\"), \"type\", \"elb\", \"client_ip\", \"target_group_arn\", \"target_ip\", \"elb_status_code_group\", \"elb_status_code\", \"request_verb\", url_extract_host(\"request_url\"), url_extract_path(\"request_url\"), \"ssl_protocol\", \"user_agent\", \"enrichment\".\"ua_os\", \"enrichment\".\"ua_device\", \"enrichment\".\"ua_browser\", \"enrichment\".\"ua_category\", \"enrichment\".\"geo_iso_code\", \"enrichment\".\"geo_country\", \"enrichment\".\"geo_city\", CAST(SUM(\"received_bytes\") AS DOUBLE), CAST(SUM(\"sent_bytes\") AS DOUBLE), CAST(SUM(\"request_processing_time\") AS DOUBLE), CAST(SUM(\"target_processing_time\") AS DOUBLE), CAST(SUM(\"response_processing_time\") AS DOUBLE), CAST(COUNT(1) AS bigint), \"event_hour\", \"__execution_name__\" FROM \"{source_database}\".\"{source_table}\" WHERE __execution_name__ = '{execution_name}' GROUP BY FLOOR(\"time\" / 60000) * 60000, DATE_TRUNC('minute', \"timestamp\"), \"type\", \"elb\", \"client_ip\", \"target_group_arn\", \"target_ip\", \"elb_status_code_group\", \"elb_status_code\", \"request_verb\", url_extract_host(\"request_url\"), url_extract_path(\"request_url\"), \"ssl_protocol\", \"user_agent\", \"enrichment\".\"ua_os\", \"enrichment\".\"ua_device\", \"enrichment\".\"ua_browser\", \"enrichment\".\"ua_category\", \"enrichment\".\"geo_iso_code\", \"enrichment\".\"geo_country\", \"enrichment\".\"geo_city\", \"event_hour\", \"__execution_name__\";""")
    
    def test_waf(self,):
        from utils.aws.glue.table import TableMetaData
        from utils.aws.glue.dataformat import Parquet, Json
        from utils.logschema.services import WAF_RAW_SCHEMA, WAF_PARQUET_SCHEMA, WAF_METRICS_SCHEMA
        
        WAF_RAW = TableMetaData(data_format=Json, schema=WAF_RAW_SCHEMA, ignore_partition=True)
        assert WAF_RAW.columns == [
            {'Name': 'timestamp', 'Type': 'bigint'}, 
            {'Name': 'formatversion', 'Type': 'int'}, 
            {'Name': 'webaclid', 'Type': 'string'},
            {'Name': 'terminatingruleid', 'Type': 'string'}, 
            {'Name': 'terminatingruletype', 'Type': 'string'}, 
            {'Name': 'action', 'Type': 'string'}, 
            {'Name': 'terminatingrulematchdetails', 'Type': 'array<struct<conditiontype:string,sensitivitylevel:string,location:string,matcheddata:array<string>>>'}, 
            {'Name': 'httpsourcename', 'Type': 'string'}, 
            {'Name': 'httpsourceid', 'Type': 'string'}, 
            {'Name': 'rulegrouplist', 'Type': 'array<struct<rulegroupid:string,terminatingrule:struct<ruleid:string,action:string,rulematchdetails:array<struct<conditiontype:string,sensitivitylevel:string,location:string,matcheddata:array<string>>>>,nonterminatingmatchingrules:array<struct<ruleid:string,action:string,rulematchdetails:array<struct<conditiontype:string,sensitivitylevel:string,location:string,matcheddata:array<string>>>>>,excludedrules:string>>'}, 
            {'Name': 'ratebasedrulelist', 'Type': 'array<struct<ratebasedruleid:string,limitkey:string,maxrateallowed:int>>'}, 
            {'Name': 'nonterminatingmatchingrules', 'Type': 'array<struct<ruleid:string,action:string,rulematchdetails:array<struct<conditiontype:string,sensitivitylevel:string,location:string,matcheddata:array<string>>>,captcharesponse:struct<responsecode:string,solvetimestamp:string>>>'}, 
            {'Name': 'requestheadersinserted', 'Type': 'array<struct<name:string,value:string>>'}, 
            {'Name': 'responsecodesent', 'Type': 'string'}, 
            {'Name': 'httprequest', 'Type': 'struct<clientip:string,country:string,headers:array<struct<name:string,value:string>>,uri:string,args:string,httpversion:string,httpmethod:string,requestid:string>'}, 
            {'Name': 'labels', 'Type': 'array<struct<name:string>>'},
            {'Name': 'captcharesponse', 'Type': 'struct<responsecode:string,solvetimestamp:string,failureReason:string>'}
        ]
        assert WAF_RAW.partition_keys == []
        assert WAF_RAW.partition_indexes == []
        assert WAF_RAW.partition_info == {}
        assert json.dumps(WAF_RAW.statements.create) == json.dumps("""CREATE EXTERNAL TABLE IF NOT EXISTS `{database}`.`{table_name}` (`timestamp` bigint, `formatversion` int, `webaclid` string, `terminatingruleid` string, `terminatingruletype` string, `action` string, `terminatingrulematchdetails` array<struct<`conditiontype`:string,`sensitivitylevel`:string,`location`:string,`matcheddata`:array<string>>>, `httpsourcename` string, `httpsourceid` string, `rulegrouplist` array<struct<`rulegroupid`:string,`terminatingrule`:struct<`ruleid`:string,`action`:string,`rulematchdetails`:array<struct<`conditiontype`:string,`sensitivitylevel`:string,`location`:string,`matcheddata`:array<string>>>>,`nonterminatingmatchingrules`:array<struct<`ruleid`:string,`action`:string,`rulematchdetails`:array<struct<`conditiontype`:string,`sensitivitylevel`:string,`location`:string,`matcheddata`:array<string>>>>>,`excludedrules`:string>>, `ratebasedrulelist` array<struct<`ratebasedruleid`:string,`limitkey`:string,`maxrateallowed`:int>>, `nonterminatingmatchingrules` array<struct<`ruleid`:string,`action`:string,`rulematchdetails`:array<struct<`conditiontype`:string,`sensitivitylevel`:string,`location`:string,`matcheddata`:array<string>>>,`captcharesponse`:struct<`responsecode`:string,`solvetimestamp`:string>>>, `requestheadersinserted` array<struct<`name`:string,`value`:string>>, `responsecodesent` string, `httprequest` struct<`clientip`:string,`country`:string,`headers`:array<struct<`name`:string,`value`:string>>,`uri`:string,`args`:string,`httpversion`:string,`httpmethod`:string,`requestid`:string>, `labels` array<struct<`name`:string>>, `captcharesponse` struct<`responsecode`:string,`solvetimestamp`:string,`failureReason`:string>)  ROW FORMAT SERDE 'org.openx.data.jsonserde.JsonSerDe'  STORED AS INPUTFORMAT 'org.apache.hadoop.mapred.TextInputFormat' OUTPUTFORMAT 'org.apache.hadoop.hive.ql.io.HiveIgnoreKeyTextOutputFormat' LOCATION '{location}' ;""")        
        assert json.dumps(WAF_RAW.statements.insert) == json.dumps("""INSERT INTO \"{destination_database}\".\"{destination_table}\" (\"timestamp\", \"formatversion\", \"webaclid\", \"terminatingruleid\", \"terminatingruletype\", \"action\", \"terminatingrulematchdetails\", \"httpsourcename\", \"httpsourceid\", \"rulegrouplist\", \"ratebasedrulelist\", \"nonterminatingmatchingrules\", \"requestheadersinserted\", \"responsecodesent\", \"httprequest\", \"labels\", \"captcharesponse\") SELECT \"timestamp\", \"formatversion\", \"webaclid\", \"terminatingruleid\", \"terminatingruletype\", \"action\", \"terminatingrulematchdetails\", \"httpsourcename\", \"httpsourceid\", \"rulegrouplist\", \"ratebasedrulelist\", \"nonterminatingmatchingrules\", \"requestheadersinserted\", \"responsecodesent\", \"httprequest\", \"labels\", \"captcharesponse\" FROM \"{source_database}\".\"{source_table}\";""")
        assert json.dumps(WAF_RAW.statements.drop) == json.dumps("""DROP TABLE IF EXISTS `{database}`.`{table_name}`""")
        assert json.dumps(WAF_RAW.statements.aggregate) == json.dumps("""INSERT INTO \"{destination_database}\".\"{destination_table}\" (\"timestamp\", \"formatversion\", \"webaclid\", \"terminatingruleid\", \"terminatingruletype\", \"action\", \"terminatingrulematchdetails\", \"httpsourcename\", \"httpsourceid\", \"rulegrouplist\", \"ratebasedrulelist\", \"nonterminatingmatchingrules\", \"requestheadersinserted\", \"responsecodesent\", \"httprequest\", \"labels\", \"captcharesponse\") SELECT \"timestamp\", \"formatversion\", \"webaclid\", \"terminatingruleid\", \"terminatingruletype\", \"action\", \"terminatingrulematchdetails\", \"httpsourcename\", \"httpsourceid\", \"rulegrouplist\", \"ratebasedrulelist\", \"nonterminatingmatchingrules\", \"requestheadersinserted\", \"responsecodesent\", \"httprequest\", \"labels\", \"captcharesponse\" FROM \"{source_database}\".\"{source_table}\" WHERE __execution_name__ = '{execution_name}' GROUP BY \"timestamp\", \"formatversion\", \"webaclid\", \"terminatingruleid\", \"terminatingruletype\", \"action\", \"terminatingrulematchdetails\", \"httpsourcename\", \"httpsourceid\", \"rulegrouplist\", \"ratebasedrulelist\", \"nonterminatingmatchingrules\", \"requestheadersinserted\", \"responsecodesent\", \"httprequest\", \"labels\", \"captcharesponse\";""")
        
        WAF_PARQUET = TableMetaData(data_format=Parquet, schema=WAF_PARQUET_SCHEMA, ignore_partition=False)
        assert WAF_PARQUET.columns == [
            {'Name': 'time', 'Type': 'bigint'}, 
            {'Name': 'timestamp', 'Type': 'timestamp'}, 
            {'Name': 'formatversion', 'Type': 'int'}, 
            {'Name': 'webaclid', 'Type': 'string'}, 
            {'Name': 'webaclname', 'Type': 'string'}, 
            {'Name': 'terminatingruleid', 'Type': 'string'}, 
            {'Name': 'terminatingruletype', 'Type': 'string'}, 
            {'Name': 'action', 'Type': 'string'}, 
            {'Name': 'terminatingrulematchdetails', 'Type': 'array<struct<conditiontype:string,sensitivitylevel:string,location:string,matcheddata:array<string>>>'}, 
            {'Name': 'httpsourcename', 'Type': 'string'}, 
            {'Name': 'httpsourceid', 'Type': 'string'}, 
            {'Name': 'rulegrouplist', 'Type': 'array<struct<rulegroupid:string,terminatingrule:struct<ruleid:string,action:string,rulematchdetails:array<struct<conditiontype:string,sensitivitylevel:string,location:string,matcheddata:array<string>>>>,nonterminatingmatchingrules:array<struct<ruleid:string,action:string,rulematchdetails:array<struct<conditiontype:string,sensitivitylevel:string,location:string,matcheddata:array<string>>>>>,excludedrules:string>>'}, 
            {'Name': 'ratebasedrulelist', 'Type': 'array<struct<ratebasedruleid:string,limitkey:string,maxrateallowed:int>>'}, 
            {'Name': 'nonterminatingmatchingrules', 'Type': 'array<struct<ruleid:string,action:string,rulematchdetails:array<struct<conditiontype:string,sensitivitylevel:string,location:string,matcheddata:array<string>>>,captcharesponse:struct<responsecode:string,solvetimestamp:string>>>'}, 
            {'Name': 'requestheadersinserted', 'Type': 'array<struct<name:string,value:string>>'}, 
            {'Name': 'responsecodesent', 'Type': 'string'}, 
            {'Name': 'httprequest', 'Type': 'struct<clientip:string,country:string,headers:array<struct<name:string,value:string>>,uri:string,args:string,httpversion:string,httpmethod:string,requestid:string>'}, 
            {'Name': 'labels', 'Type': 'array<struct<name:string>>'}, 
            {'Name': 'captcharesponse', 'Type': 'struct<responsecode:string,solvetimestamp:string,failureReason:string>'}]
        assert WAF_PARQUET.partition_keys == [
            {'Name': 'event_hour', 'Type': 'string'}, 
            {'Name': 'account_id', 'Type': 'string'}, 
            {'Name': 'region', 'Type': 'string'}, 
            {'Name': '__execution_name__', 'Type': 'string'}
        ]
        assert WAF_PARQUET.partition_indexes == [
            {'IndexName': 'IDX_EXECUTION_NAME', 'Keys': ['__execution_name__']}, 
            {'IndexName': 'IDX_PARTITIONS', 'Keys': ['event_hour', 'account_id', 'region']}
        ]
        assert WAF_PARQUET.partition_info == collections.OrderedDict([('event_hour', {'type': 'time', 'from': '%Y%m%d%H', 'to': '%Y%m%d00'}), ('account_id', {'type': 'retain'}), ('region', {'type': 'retain'}), ('__execution_name__', {'type': 'default', 'value': '00000000-0000-0000-0000-000000000000'})])
        assert json.dumps(WAF_PARQUET.statements.create) == json.dumps("""CREATE EXTERNAL TABLE IF NOT EXISTS `{database}`.`{table_name}` (`time` bigint, `timestamp` timestamp, `formatversion` int, `webaclid` string, `webaclname` string, `terminatingruleid` string, `terminatingruletype` string, `action` string, `terminatingrulematchdetails` array<struct<`conditiontype`:string,`sensitivitylevel`:string,`location`:string,`matcheddata`:array<string>>>, `httpsourcename` string, `httpsourceid` string, `rulegrouplist` array<struct<`rulegroupid`:string,`terminatingrule`:struct<`ruleid`:string,`action`:string,`rulematchdetails`:array<struct<`conditiontype`:string,`sensitivitylevel`:string,`location`:string,`matcheddata`:array<string>>>>,`nonterminatingmatchingrules`:array<struct<`ruleid`:string,`action`:string,`rulematchdetails`:array<struct<`conditiontype`:string,`sensitivitylevel`:string,`location`:string,`matcheddata`:array<string>>>>>,`excludedrules`:string>>, `ratebasedrulelist` array<struct<`ratebasedruleid`:string,`limitkey`:string,`maxrateallowed`:int>>, `nonterminatingmatchingrules` array<struct<`ruleid`:string,`action`:string,`rulematchdetails`:array<struct<`conditiontype`:string,`sensitivitylevel`:string,`location`:string,`matcheddata`:array<string>>>,`captcharesponse`:struct<`responsecode`:string,`solvetimestamp`:string>>>, `requestheadersinserted` array<struct<`name`:string,`value`:string>>, `responsecodesent` string, `httprequest` struct<`clientip`:string,`country`:string,`headers`:array<struct<`name`:string,`value`:string>>,`uri`:string,`args`:string,`httpversion`:string,`httpmethod`:string,`requestid`:string>, `labels` array<struct<`name`:string>>, `captcharesponse` struct<`responsecode`:string,`solvetimestamp`:string,`failureReason`:string>, `account_id` string, `region` string, `event_hour` string, `__execution_name__` string) PARTITIONED BY (`event_hour` string, `account_id` string, `region` string, `__execution_name__` string) ROW FORMAT SERDE 'org.apache.hadoop.hive.ql.io.parquet.serde.ParquetHiveSerDe'  STORED AS INPUTFORMAT 'org.apache.hadoop.hive.ql.io.parquet.MapredParquetInputFormat' OUTPUTFORMAT 'org.apache.hadoop.hive.ql.io.parquet.MapredParquetOutputFormat' LOCATION '{location}' ;""")        
        assert json.dumps(WAF_PARQUET.statements.insert) == json.dumps("""INSERT INTO \"{destination_database}\".\"{destination_table}\" (\"time\", \"timestamp\", \"formatversion\", \"webaclid\", \"webaclname\", \"terminatingruleid\", \"terminatingruletype\", \"action\", \"terminatingrulematchdetails\", \"httpsourcename\", \"httpsourceid\", \"rulegrouplist\", \"ratebasedrulelist\", \"nonterminatingmatchingrules\", \"requestheadersinserted\", \"responsecodesent\", \"httprequest\", \"labels\", \"captcharesponse\", \"account_id\", \"region\", \"event_hour\", \"__execution_name__\") SELECT \"timestamp\", CAST(FROM_UNIXTIME(\"timestamp\" / 1000) AS timestamp), \"formatversion\", \"webaclid\", SPLIT(\"webaclid\", '/')[3], \"terminatingruleid\", \"terminatingruletype\", \"action\", \"terminatingrulematchdetails\", \"httpsourcename\", \"httpsourceid\", \"rulegrouplist\", \"ratebasedrulelist\", \"nonterminatingmatchingrules\", \"requestheadersinserted\", \"responsecodesent\", \"httprequest\", \"labels\", \"captcharesponse\", SPLIT(\"webaclid\", ':')[5], SPLIT(\"webaclid\", ':')[4], DATE_FORMAT(CAST(FROM_UNIXTIME(\"timestamp\" / 1000) AS timestamp), '%Y%m%d%H'), '{{}}' FROM \"{source_database}\".\"{source_table}\";""")
        assert json.dumps(WAF_PARQUET.statements.drop) == json.dumps("""DROP TABLE IF EXISTS `{database}`.`{table_name}`""")
        assert json.dumps(WAF_PARQUET.statements.aggregate) == json.dumps("""INSERT INTO \"{destination_database}\".\"{destination_table}\" (\"time\", \"timestamp\", \"formatversion\", \"webaclid\", \"webaclname\", \"terminatingruleid\", \"terminatingruletype\", \"action\", \"terminatingrulematchdetails\", \"httpsourcename\", \"httpsourceid\", \"rulegrouplist\", \"ratebasedrulelist\", \"nonterminatingmatchingrules\", \"requestheadersinserted\", \"responsecodesent\", \"httprequest\", \"labels\", \"captcharesponse\", \"account_id\", \"region\", \"event_hour\", \"__execution_name__\") SELECT \"timestamp\", CAST(FROM_UNIXTIME(\"timestamp\" / 1000) AS timestamp), \"formatversion\", \"webaclid\", SPLIT(\"webaclid\", '/')[3], \"terminatingruleid\", \"terminatingruletype\", \"action\", \"terminatingrulematchdetails\", \"httpsourcename\", \"httpsourceid\", \"rulegrouplist\", \"ratebasedrulelist\", \"nonterminatingmatchingrules\", \"requestheadersinserted\", \"responsecodesent\", \"httprequest\", \"labels\", \"captcharesponse\", SPLIT(\"webaclid\", ':')[5], SPLIT(\"webaclid\", ':')[4], DATE_FORMAT(CAST(FROM_UNIXTIME(\"timestamp\" / 1000) AS timestamp), '%Y%m%d%H'), '{{}}' FROM \"{source_database}\".\"{source_table}\" WHERE __execution_name__ = '{execution_name}' GROUP BY \"timestamp\", CAST(FROM_UNIXTIME(\"timestamp\" / 1000) AS timestamp), \"formatversion\", \"webaclid\", SPLIT(\"webaclid\", '/')[3], \"terminatingruleid\", \"terminatingruletype\", \"action\", \"terminatingrulematchdetails\", \"httpsourcename\", \"httpsourceid\", \"rulegrouplist\", \"ratebasedrulelist\", \"nonterminatingmatchingrules\", \"requestheadersinserted\", \"responsecodesent\", \"httprequest\", \"labels\", \"captcharesponse\", SPLIT(\"webaclid\", ':')[5], SPLIT(\"webaclid\", ':')[4], DATE_FORMAT(CAST(FROM_UNIXTIME(\"timestamp\" / 1000) AS timestamp), '%Y%m%d%H'), '{{}}';""")
        
        WAF_METRICS = TableMetaData(data_format=Parquet, schema=WAF_METRICS_SCHEMA, ignore_partition=False)
        assert WAF_METRICS.columns == [
            {'Name': 'time', 'Type': 'bigint'}, 
            {'Name': 'timestamp', 'Type': 'timestamp'}, 
            {'Name': 'action', 'Type': 'string'}, 
            {'Name': 'webaclid', 'Type': 'string'}, 
            {'Name': 'webaclname', 'Type': 'string'}, 
            {'Name': 'terminatingruleid', 'Type': 'string'}, 
            {'Name': 'terminatingruletype', 'Type': 'string'}, 
            {'Name': 'httpsourceid', 'Type': 'string'}, 
            {'Name': 'httpmethod', 'Type': 'string'}, 
            {'Name': 'country', 'Type': 'string'}, 
            {'Name': 'clientip', 'Type': 'string'}, 
            {'Name': 'uri', 'Type': 'string'}, 
            {'Name': 'first_label', 'Type': 'string'}, 
            {'Name': 'requests', 'Type': 'bigint'}
        ]
        assert WAF_METRICS.partition_keys == [
            {'Name': 'event_hour', 'Type': 'string'}, 
            {'Name': 'account_id', 'Type': 'string'}, 
            {'Name': 'region', 'Type': 'string'}, 
            {'Name': '__execution_name__', 'Type': 'string'}
        ]
        assert WAF_METRICS.partition_indexes == [
            {'IndexName': 'IDX_EXECUTION_NAME', 'Keys': ['__execution_name__']}, 
            {'IndexName': 'IDX_PARTITIONS', 'Keys': ['event_hour', 'account_id', 'region']}
        ]
        assert WAF_METRICS.partition_info == collections.OrderedDict([('event_hour', {'type': 'time', 'from': '%Y%m%d%H', 'to': '%Y%m%d00'}), ('account_id', {'type': 'retain'}), ('region', {'type': 'retain'}), ('__execution_name__', {'type': 'default', 'value': '00000000-0000-0000-0000-000000000000'})])
        assert json.dumps(WAF_METRICS.statements.create) == json.dumps("""CREATE EXTERNAL TABLE IF NOT EXISTS `{database}`.`{table_name}` (`time` bigint, `timestamp` timestamp, `action` string, `webaclid` string, `webaclname` string, `terminatingruleid` string, `terminatingruletype` string, `httpsourceid` string, `httpmethod` string, `country` string, `clientip` string, `uri` string, `first_label` string, `requests` bigint, `account_id` string, `region` string, `event_hour` string, `__execution_name__` string) PARTITIONED BY (`event_hour` string, `account_id` string, `region` string, `__execution_name__` string) ROW FORMAT SERDE 'org.apache.hadoop.hive.ql.io.parquet.serde.ParquetHiveSerDe'  STORED AS INPUTFORMAT 'org.apache.hadoop.hive.ql.io.parquet.MapredParquetInputFormat' OUTPUTFORMAT 'org.apache.hadoop.hive.ql.io.parquet.MapredParquetOutputFormat' LOCATION '{location}' ;""")        
        assert json.dumps(WAF_METRICS.statements.insert) == json.dumps("""INSERT INTO \"{destination_database}\".\"{destination_table}\" (\"time\", \"timestamp\", \"action\", \"webaclid\", \"webaclname\", \"terminatingruleid\", \"terminatingruletype\", \"httpsourceid\", \"httpmethod\", \"country\", \"clientip\", \"uri\", \"first_label\", \"requests\", \"account_id\", \"region\", \"event_hour\", \"__execution_name__\") SELECT FLOOR(\"time\" / 60000) * 60000, DATE_TRUNC('minute', \"timestamp\"), \"action\", \"webaclid\", \"webaclname\", \"terminatingruleid\", \"terminatingruletype\", \"httpsourceid\", \"httprequest\".\"httpmethod\", \"httprequest\".\"country\", \"httprequest\".\"clientip\", \"httprequest\".\"uri\", CASE WHEN labels = ARRAY[] THEN '' ELSE labels[1].name END, CAST(COUNT(1) AS bigint), \"account_id\", \"region\", \"event_hour\", \"__execution_name__\" FROM \"{source_database}\".\"{source_table}\";""")
        assert json.dumps(WAF_METRICS.statements.drop) == json.dumps("""DROP TABLE IF EXISTS `{database}`.`{table_name}`""")
        assert json.dumps(WAF_METRICS.statements.aggregate) == json.dumps("""INSERT INTO \"{destination_database}\".\"{destination_table}\" (\"time\", \"timestamp\", \"action\", \"webaclid\", \"webaclname\", \"terminatingruleid\", \"terminatingruletype\", \"httpsourceid\", \"httpmethod\", \"country\", \"clientip\", \"uri\", \"first_label\", \"requests\", \"account_id\", \"region\", \"event_hour\", \"__execution_name__\") SELECT FLOOR(\"time\" / 60000) * 60000, DATE_TRUNC('minute', \"timestamp\"), \"action\", \"webaclid\", \"webaclname\", \"terminatingruleid\", \"terminatingruletype\", \"httpsourceid\", \"httprequest\".\"httpmethod\", \"httprequest\".\"country\", \"httprequest\".\"clientip\", \"httprequest\".\"uri\", CASE WHEN labels = ARRAY[] THEN '' ELSE labels[1].name END, CAST(COUNT(1) AS bigint), \"account_id\", \"region\", \"event_hour\", \"__execution_name__\" FROM \"{source_database}\".\"{source_table}\" WHERE __execution_name__ = '{execution_name}' GROUP BY FLOOR(\"time\" / 60000) * 60000, DATE_TRUNC('minute', \"timestamp\"), \"action\", \"webaclid\", \"webaclname\", \"terminatingruleid\", \"terminatingruletype\", \"httpsourceid\", \"httprequest\".\"httpmethod\", \"httprequest\".\"country\", \"httprequest\".\"clientip\", \"httprequest\".\"uri\", CASE WHEN labels = ARRAY[] THEN '' ELSE labels[1].name END, \"account_id\", \"region\", \"event_hour\", \"__execution_name__\";""")
    
    # def test_application_avro(self,):
    #     pass
    
    # def test_application_cloudtrail_logs(self,):
    #     pass
    
    # def test_application_csv(self,):
    #     pass
    
    # def test_application_json(self,):
    #     pass
    
    # def test_application_orc(self,):
    #     pass
    
    # def test_application_parquet(self,):
    #     pass
    
    # def test_application_tsv(self,):
    #     pass
    
    # def test_application_regex(self,):
    #     pass
