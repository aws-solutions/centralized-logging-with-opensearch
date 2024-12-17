# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import os
import sys
import json
import pytest
import collections
from test.mock import (
    mock_s3_context,
    mock_iam_context,
    mock_sqs_context,
    mock_ddb_context,
    mock_athena_context,
    mock_scheduler_context,
    mock_events_context,
    default_environment_variables,
)


sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


class TestDataFormat:

    def test_input_format(
        self,
    ):
        from utils.aws.glue.dataformat import InputFormat

        assert (
            InputFormat.AVRO
            == "org.apache.hadoop.hive.ql.io.avro.AvroContainerInputFormat"
        )
        assert (
            InputFormat.CLOUDTRAIL == "com.amazon.emr.cloudtrail.CloudTrailInputFormat"
        )
        assert InputFormat.ORC == "org.apache.hadoop.hive.ql.io.orc.OrcInputFormat"
        assert (
            InputFormat.PARQUET
            == "org.apache.hadoop.hive.ql.io.parquet.MapredParquetInputFormat"
        )
        assert InputFormat.TEXT == "org.apache.hadoop.mapred.TextInputFormat"

    def test_output_format(
        self,
    ):
        from utils.aws.glue.dataformat import OutputFormat

        assert (
            OutputFormat.AVRO
            == "org.apache.hadoop.hive.ql.io.avro.AvroContainerOutputFormat"
        )
        assert OutputFormat.ORC == "org.apache.hadoop.hive.ql.io.orc.OrcOutputFormat"
        assert (
            OutputFormat.HIVE_IGNORE_KEY_TEXT
            == "org.apache.hadoop.hive.ql.io.HiveIgnoreKeyTextOutputFormat"
        )
        assert (
            OutputFormat.PARQUET
            == "org.apache.hadoop.hive.ql.io.parquet.MapredParquetOutputFormat"
        )

    def test_serialization_library(
        self,
    ):
        from utils.aws.glue.dataformat import SerializationLibrary

        assert (
            SerializationLibrary.AVRO == "org.apache.hadoop.hive.serde2.avro.AvroSerDe"
        )
        assert SerializationLibrary.CLOUDTRAIL == "org.openx.data.jsonserde.JsonSerDe"
        assert (
            SerializationLibrary.LAZY_SIMPLE
            == "org.apache.hadoop.hive.serde2.lazy.LazySimpleSerDe"
        )
        assert (
            SerializationLibrary.OPEN_CSV
            == "org.apache.hadoop.hive.serde2.OpenCSVSerde"
        )
        assert SerializationLibrary.OPENX_JSON == "org.openx.data.jsonserde.JsonSerDe"
        assert SerializationLibrary.ORC == "org.apache.hadoop.hive.ql.io.orc.OrcSerde"
        assert (
            SerializationLibrary.PARQUET
            == "org.apache.hadoop.hive.ql.io.parquet.serde.ParquetHiveSerDe"
        )
        assert SerializationLibrary.REGEXP == "org.apache.hadoop.hive.serde2.RegexSerDe"

    def test_classification_string(
        self,
    ):
        from utils.aws.glue.dataformat import ClassificationString

        assert ClassificationString.AVRO == "avro"
        assert ClassificationString.CSV == "csv"
        assert ClassificationString.JSON == "json"
        assert ClassificationString.ORC == "orc"
        assert ClassificationString.PARQUET == "parquet"
        assert ClassificationString.NONE == ""

    def test_avro(
        self,
    ):
        from utils.aws.glue.dataformat import DataFormat, Avro

        assert isinstance(Avro, DataFormat) is True
        assert (
            Avro.INPUT_FORMAT
            == "org.apache.hadoop.hive.ql.io.avro.AvroContainerInputFormat"
        )
        assert (
            Avro.OUTPUT_FORMAT
            == "org.apache.hadoop.hive.ql.io.avro.AvroContainerOutputFormat"
        )
        assert (
            Avro.SERIALIZATION_LIBRARY == "org.apache.hadoop.hive.serde2.avro.AvroSerDe"
        )
        assert Avro.CLASSIFICATION_STRING == "avro"

    def test_cloudtrail_logs(
        self,
    ):
        from utils.aws.glue.dataformat import DataFormat, CloudTrailLogs

        assert isinstance(CloudTrailLogs, DataFormat) is True
        assert (
            CloudTrailLogs.INPUT_FORMAT
            == "com.amazon.emr.cloudtrail.CloudTrailInputFormat"
        )
        assert (
            CloudTrailLogs.OUTPUT_FORMAT
            == "org.apache.hadoop.hive.ql.io.HiveIgnoreKeyTextOutputFormat"
        )
        assert (
            CloudTrailLogs.SERIALIZATION_LIBRARY == "org.openx.data.jsonserde.JsonSerDe"
        )
        assert CloudTrailLogs.CLASSIFICATION_STRING == ""

    def test_csv(
        self,
    ):
        from utils.aws.glue.dataformat import DataFormat, Csv

        assert isinstance(Csv, DataFormat) is True
        assert Csv.INPUT_FORMAT == "org.apache.hadoop.mapred.TextInputFormat"
        assert (
            Csv.OUTPUT_FORMAT
            == "org.apache.hadoop.hive.ql.io.HiveIgnoreKeyTextOutputFormat"
        )
        assert Csv.SERIALIZATION_LIBRARY == "org.apache.hadoop.hive.serde2.OpenCSVSerde"
        assert Csv.CLASSIFICATION_STRING == "csv"

    def test_json(
        self,
    ):
        from utils.aws.glue.dataformat import DataFormat, Json

        assert isinstance(Json, DataFormat) is True
        assert Json.INPUT_FORMAT == "org.apache.hadoop.mapred.TextInputFormat"
        assert (
            Json.OUTPUT_FORMAT
            == "org.apache.hadoop.hive.ql.io.HiveIgnoreKeyTextOutputFormat"
        )
        assert Json.SERIALIZATION_LIBRARY == "org.openx.data.jsonserde.JsonSerDe"
        assert Json.CLASSIFICATION_STRING == "json"

    def test_orc(
        self,
    ):
        from utils.aws.glue.dataformat import DataFormat, Orc

        assert isinstance(Orc, DataFormat) is True
        assert Orc.INPUT_FORMAT == "org.apache.hadoop.hive.ql.io.orc.OrcInputFormat"
        assert Orc.OUTPUT_FORMAT == "org.apache.hadoop.hive.ql.io.orc.OrcOutputFormat"
        assert Orc.SERIALIZATION_LIBRARY == "org.apache.hadoop.hive.ql.io.orc.OrcSerde"
        assert Orc.CLASSIFICATION_STRING == "orc"

    def test_parquet(
        self,
    ):
        from utils.aws.glue.dataformat import DataFormat, Parquet

        assert isinstance(Parquet, DataFormat) is True
        assert (
            Parquet.INPUT_FORMAT
            == "org.apache.hadoop.hive.ql.io.parquet.MapredParquetInputFormat"
        )
        assert (
            Parquet.OUTPUT_FORMAT
            == "org.apache.hadoop.hive.ql.io.parquet.MapredParquetOutputFormat"
        )
        assert (
            Parquet.SERIALIZATION_LIBRARY
            == "org.apache.hadoop.hive.ql.io.parquet.serde.ParquetHiveSerDe"
        )
        assert Parquet.CLASSIFICATION_STRING == "parquet"

    def test_tsv(
        self,
    ):
        from utils.aws.glue.dataformat import DataFormat, Tsv

        assert isinstance(Tsv, DataFormat) is True
        assert Tsv.INPUT_FORMAT == "org.apache.hadoop.mapred.TextInputFormat"
        assert (
            Tsv.OUTPUT_FORMAT
            == "org.apache.hadoop.hive.ql.io.HiveIgnoreKeyTextOutputFormat"
        )
        assert (
            Tsv.SERIALIZATION_LIBRARY
            == "org.apache.hadoop.hive.serde2.lazy.LazySimpleSerDe"
        )
        assert Tsv.CLASSIFICATION_STRING == ""

    def test_regex(
        self,
    ):
        from utils.aws.glue.dataformat import DataFormat, Regex

        assert isinstance(Regex, DataFormat) is True
        assert Regex.INPUT_FORMAT == "org.apache.hadoop.mapred.TextInputFormat"
        assert (
            Regex.OUTPUT_FORMAT
            == "org.apache.hadoop.hive.ql.io.HiveIgnoreKeyTextOutputFormat"
        )
        assert Regex.SERIALIZATION_LIBRARY == "org.apache.hadoop.hive.serde2.RegexSerDe"
        assert Regex.CLASSIFICATION_STRING == ""

    def test_data_format(
        self,
    ):
        from utils.aws.glue.dataformat import (
            DataFormat,
            InputFormat,
            OutputFormat,
            SerializationLibrary,
            ClassificationString,
        )

        regex = DataFormat
        regex.INPUT_FORMAT = InputFormat.TEXT
        regex.OUTPUT_FORMAT = OutputFormat.HIVE_IGNORE_KEY_TEXT
        regex.SERIALIZATION_LIBRARY = SerializationLibrary.REGEXP
        regex.CLASSIFICATION_STRING = ClassificationString.NONE

        assert regex.INPUT_FORMAT == "org.apache.hadoop.mapred.TextInputFormat"
        assert (
            regex.OUTPUT_FORMAT
            == "org.apache.hadoop.hive.ql.io.HiveIgnoreKeyTextOutputFormat"
        )
        assert regex.SERIALIZATION_LIBRARY == "org.apache.hadoop.hive.serde2.RegexSerDe"
        assert regex.CLASSIFICATION_STRING == ""

    def test_data_format_mapping(self):
        from utils.aws.glue.dataformat import (
            DATA_FORMAT_MAPPING,
            Avro,
            CloudTrailLogs,
            Csv,
            Json,
            Orc,
            Parquet,
            Tsv,
            Regex,
        )

        assert DATA_FORMAT_MAPPING["avro"] is Avro
        assert DATA_FORMAT_MAPPING["cloudtraillogs"] is CloudTrailLogs
        assert DATA_FORMAT_MAPPING["csv"] is Csv
        assert DATA_FORMAT_MAPPING["json"] is Json
        assert DATA_FORMAT_MAPPING["orc"] is Orc
        assert DATA_FORMAT_MAPPING["parquet"] is Parquet
        assert DATA_FORMAT_MAPPING["tsv"] is Tsv
        assert DATA_FORMAT_MAPPING["regex"] is Regex


class TestSchema:
    def init_default_parameter(self):
        from utils.aws.glue.schema import Schema

        self.schema = Schema()

    def test_data_type(self):
        from utils.aws.glue.schema import DataType

        big_int = DataType(input_string="bigint")
        assert big_int.input_string == "bigint"
        assert big_int.is_primitive is True

        map_field = DataType(input_string="map", is_primitive=False)
        assert map_field.input_string == "map"
        assert map_field.is_primitive is False

    def test_schema_boolean(self):
        from utils.aws.glue.schema import DataType

        self.init_default_parameter()

        boolean_field = self.schema.boolean()
        assert isinstance(boolean_field, DataType) is True
        assert boolean_field.input_string == "boolean"
        assert boolean_field.is_primitive is True

    def test_schema_binary(self):
        from utils.aws.glue.schema import DataType

        self.init_default_parameter()

        binary_field = self.schema.binary()
        assert isinstance(binary_field, DataType) is True
        assert binary_field.input_string == "binary"
        assert binary_field.is_primitive is True

    def test_schema_big_int(self):
        from utils.aws.glue.schema import DataType

        self.init_default_parameter()

        big_int_field = self.schema.big_int()
        assert isinstance(big_int_field, DataType) is True
        assert big_int_field.input_string == "bigint"
        assert big_int_field.is_primitive is True

    def test_schema_double(self):
        from utils.aws.glue.schema import DataType

        self.init_default_parameter()
        double_field = self.schema.double()

        assert isinstance(double_field, DataType) is True
        assert double_field.input_string == "double"
        assert double_field.is_primitive is True

    def test_schema_number(self):
        from utils.aws.glue.schema import DataType

        self.init_default_parameter()

        number_field = self.schema.number()
        assert isinstance(number_field, DataType) is True
        assert number_field.input_string == "double"
        assert number_field.is_primitive is True

    def test_schema_float(self):
        from utils.aws.glue.schema import DataType

        self.init_default_parameter()

        float_field = self.schema.float()
        assert isinstance(float_field, DataType) is True
        assert float_field.input_string == "float"
        assert float_field.is_primitive is True

    def test_schema_integer(self):
        from utils.aws.glue.schema import DataType

        self.init_default_parameter()

        integer_field = self.schema.integer()
        assert isinstance(integer_field, DataType) is True
        assert integer_field.input_string == "int"
        assert integer_field.is_primitive is True

    def test_schema_small_int(self):
        from utils.aws.glue.schema import DataType

        self.init_default_parameter()

        small_int_field = self.schema.small_int()
        assert isinstance(small_int_field, DataType) is True
        assert small_int_field.input_string == "smallint"
        assert small_int_field.is_primitive is True

    def test_schema_tiny_int(self):
        from utils.aws.glue.schema import DataType

        self.init_default_parameter()

        tiny_int_field = self.schema.tiny_int()
        assert isinstance(tiny_int_field, DataType) is True
        assert tiny_int_field.input_string == "tinyint"
        assert tiny_int_field.is_primitive is True

    def test_schema_date(self):
        from utils.aws.glue.schema import DataType

        self.init_default_parameter()

        date_field = self.schema.date()
        assert isinstance(date_field, DataType) is True
        assert date_field.input_string == "date"
        assert date_field.is_primitive is True

    def test_schema_timestamp(self):
        from utils.aws.glue.schema import DataType

        self.init_default_parameter()

        timestamp_field = self.schema.timestamp()
        assert isinstance(timestamp_field, DataType) is True
        assert timestamp_field.input_string == "timestamp"
        assert timestamp_field.is_primitive is True

    def test_schema_string(self):
        from utils.aws.glue.schema import DataType

        self.init_default_parameter()

        string_field = self.schema.string()
        assert isinstance(string_field, DataType) is True
        assert string_field.input_string == "string"
        assert string_field.is_primitive is True

    def test_schema_decimal(self):
        from utils.aws.glue.schema import DataType

        self.init_default_parameter()

        decimal_field = self.schema.decimal()
        assert isinstance(decimal_field, DataType) is True
        assert decimal_field.input_string == "decimal(38, 0)"
        assert decimal_field.is_primitive is True

        decimal_field = self.schema.decimal(precision=24, scale=2)
        assert isinstance(decimal_field, DataType) is True
        assert decimal_field.input_string == "decimal(24, 2)"
        assert decimal_field.is_primitive is True

    def test_schema_char(self):
        from utils.aws.glue.schema import DataType

        self.init_default_parameter()

        char_field = self.schema.char(length=200)
        assert isinstance(char_field, DataType) is True
        assert char_field.input_string == "char(200)"
        assert char_field.is_primitive is True

        with pytest.raises(ValueError) as exception_info:
            self.schema.char(length=0)
        assert (
            exception_info.value.args[0]
            == "char length must be (inclusively) between 1 and 255, but was 0."
        )

        with pytest.raises(ValueError) as exception_info:
            self.schema.char(length=256)
        assert (
            exception_info.value.args[0]
            == "char length must be (inclusively) between 1 and 255, but was 256."
        )

        with pytest.raises(Exception) as exception_info:
            self.schema.char(length=10.2)  # type: ignore
        assert (
            exception_info.value.args[0]
            == "char length must be a positive integer, was 10.2."
        )

    def test_schema_varchar(self):
        from utils.aws.glue.schema import DataType

        self.init_default_parameter()

        varchar_field = self.schema.varchar(length=200)
        assert isinstance(varchar_field, DataType) is True
        assert varchar_field.input_string == "varchar(200)"
        assert varchar_field.is_primitive is True

        with pytest.raises(ValueError) as exception_info:
            self.schema.varchar(length=0)
        assert (
            exception_info.value.args[0]
            == "char length must be (inclusively) between 1 and 65535, but was 0."
        )

        with pytest.raises(ValueError) as exception_info:
            self.schema.varchar(length=65536)
        assert (
            exception_info.value.args[0]
            == "char length must be (inclusively) between 1 and 65535, but was 65536."
        )

        with pytest.raises(Exception) as exception_info:
            self.schema.varchar(length=10.2)  # type: ignore
        assert (
            exception_info.value.args[0]
            == "char length must be a positive integer, was 10.2."
        )

    def test_schema_array(self):
        from utils.aws.glue.schema import DataType

        self.init_default_parameter()

        array_field = self.schema.array(self.schema.string())
        assert isinstance(array_field, DataType) is True
        assert array_field.input_string == "array<string>"
        assert array_field.is_primitive is False

        array_field = self.schema.array(self.schema.array(self.schema.string()))
        assert isinstance(array_field, DataType) is True
        assert array_field.input_string == "array<array<string>>"
        assert array_field.is_primitive is False

        array_field = self.schema.array(
            self.schema.struct([{"name": "host", "type": self.schema.string()}])
        )
        assert isinstance(array_field, DataType) is True
        assert array_field.input_string == "array<struct<host:string>>"
        assert array_field.is_primitive is False

        array_field = self.schema.array(
            self.schema.map(
                key_type=self.schema.string(), value_type=self.schema.integer()
            )
        )
        assert isinstance(array_field, DataType) is True
        assert array_field.input_string == "array<map<string,int>>"
        assert array_field.is_primitive is False

        with pytest.raises(TypeError):
            self.schema.array(
                self.schema.map(
                    key_type=self.schema.struct(
                        [{"name": "host", "type": self.schema.string()}]
                    ),
                    value_type=self.schema.integer(),
                )
            )

    def test_schema_map(self):
        from utils.aws.glue.schema import DataType

        self.init_default_parameter()

        map_field = self.schema.map(
            key_type=self.schema.string(),
            value_type=self.schema.struct(
                [
                    {"name": "year", "type": self.schema.string()},
                    {"name": "month", "type": self.schema.integer()},
                ]
            ),
        )
        assert map_field.input_string == "map<string,struct<year:string,month:int>>"
        assert map_field.is_primitive is False

        array_field = self.schema.array(
            self.schema.map(
                key_type=self.schema.string(), value_type=self.schema.integer()
            )
        )
        map_field = self.schema.map(
            key_type=self.schema.string(), value_type=self.schema.integer()
        )
        assert isinstance(array_field, DataType) is True
        assert map_field.input_string == "map<string,int>"
        assert map_field.is_primitive is False

        struct_field = self.schema.struct(
            [
                {
                    "name": "headers",
                    "type": self.schema.array(
                        self.schema.struct(
                            [
                                {"name": "host", "type": self.schema.string()},
                                {"name": "clientIp", "type": self.schema.string()},
                            ]
                        )
                    ),
                },
                {"name": "server", "type": self.schema.string()},
            ]
        )
        assert isinstance(struct_field, DataType) is True
        assert (
            struct_field.input_string
            == "struct<headers:array<struct<host:string,clientIp:string>>,server:string>"
        )
        assert struct_field.is_primitive is False


class TestJsonSchemaToGlueSchema:
    def test_transform_json_to_glue_schema(self):
        from utils.aws.glue.table import JsonSchemaToGlueSchema

        schema_transformer = JsonSchemaToGlueSchema()

        name = "data_type_is_null"
        property = {}
        glue_schema = schema_transformer.transform_json_to_glue_schema(
            name=name, property=property
        )
        assert glue_schema["name"] == name
        assert glue_schema["type"].input_string == "string"

        name = "data_type_is_number"
        property = {"type": "number"}
        glue_schema = schema_transformer.transform_json_to_glue_schema(
            name=name, property=property
        )
        assert glue_schema["name"] == name
        assert glue_schema["type"].input_string == "double"

        name = "data_type_is_bigint"
        property = {"type": "big_int"}
        glue_schema = schema_transformer.transform_json_to_glue_schema(
            name=name, property=property
        )
        assert glue_schema["name"] == name
        assert glue_schema["type"].input_string == "bigint"

        name = "data_type_is_smallint"
        property = {"type": "small_int"}
        glue_schema = schema_transformer.transform_json_to_glue_schema(
            name=name, property=property
        )
        assert glue_schema["name"] == name
        assert glue_schema["type"].input_string == "smallint"

        name = "data_type_is_tinyint"
        property = {"type": "tiny_int"}
        glue_schema = schema_transformer.transform_json_to_glue_schema(
            name=name, property=property
        )
        assert glue_schema["name"] == name
        assert glue_schema["type"].input_string == "tinyint"

        name = "data_type_is_integer"
        property = {"type": "integer"}
        glue_schema = schema_transformer.transform_json_to_glue_schema(
            name=name, property=property
        )
        assert glue_schema["name"] == name
        assert glue_schema["type"].input_string == "int"

        for data_type in (
            "boolean",
            "binary",
            "double",
            "float",
            "date",
            "timestamp",
            "string",
        ):
            name = f"data_type_is_{data_type}"
            property = {"type": data_type}
            glue_schema = schema_transformer.transform_json_to_glue_schema(
                name=name, property=property
            )
            assert glue_schema["name"] == name
            assert glue_schema["type"].input_string == data_type

        name = "do_not_supported_data_type"
        property = {"type": "decimal"}
        with pytest.raises(KeyError):
            glue_schema = schema_transformer.transform_json_to_glue_schema(
                name=name, property=property
            )

        name = "map"
        property = {
            "type": "map",
            "properties": {"key": {"type": "string"}, "value": {"type": "integer"}},
        }
        glue_schema = schema_transformer.transform_json_to_glue_schema(
            name=name, property=property
        )
        assert glue_schema["name"] == name
        assert glue_schema["type"].input_string == "map<string,integer>"

        name = "object"
        property = {
            "type": "object",
            "properties": {"host": {"type": "string"}, "clientIp": {"type": "string"}},
        }
        glue_schema = schema_transformer.transform_json_to_glue_schema(
            name=name, property=property
        )
        assert glue_schema["name"] == name
        assert glue_schema["type"].input_string == "struct<host:string,clientIp:string>"

        name = "array"
        property = {"type": "array", "items": {"type": "string"}}
        glue_schema = schema_transformer.transform_json_to_glue_schema(
            name=name, property=property
        )
        assert glue_schema["name"] == name
        assert glue_schema["type"].input_string == "array<string>"

        name = "object_in_array"
        property = {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "host": {"type": "string"},
                    "clientIp": {"type": "string"},
                },
            },
        }
        glue_schema = schema_transformer.transform_json_to_glue_schema(
            name=name, property=property
        )
        assert glue_schema["name"] == name
        assert (
            glue_schema["type"].input_string
            == "array<struct<host:string,clientIp:string>>"
        )

        name = "map_in_array"
        property = {
            "type": "array",
            "items": {
                "type": "map",
                "properties": {"key": {"type": "string"}, "value": {"type": "string"}},
            },
        }
        glue_schema = schema_transformer.transform_json_to_glue_schema(
            name=name, property=property
        )
        assert glue_schema["name"] == name
        assert glue_schema["type"].input_string == "array<map<string,string>>"

        name = "multi_dimension_array_2"
        property = {
            "type": "array",
            "items": {"type": "array", "items": {"type": "string"}},
        }
        glue_schema = schema_transformer.transform_json_to_glue_schema(
            name=name, property=property
        )
        assert glue_schema["name"] == name
        assert glue_schema["type"].input_string == "array<array<string>>"

        name = "multi_dimension_array_3"
        property = {
            "type": "array",
            "items": {
                "type": "array",
                "items": {"type": "array", "items": {"type": "string"}},
            },
        }
        glue_schema = schema_transformer.transform_json_to_glue_schema(
            name=name, property=property
        )
        assert glue_schema["name"] == name
        assert glue_schema["type"].input_string == "array<array<array<string>>>"

    def test_properties(
        self,
    ):
        from utils.aws.glue.table import JsonSchemaToGlueSchema

        schema_transformer = JsonSchemaToGlueSchema()

        properties = {}
        glue_schema = schema_transformer.properties(properties=properties)
        assert glue_schema == []

        properties = collections.OrderedDict()
        properties["host"] = {"type": "string"}
        properties["clientIp"] = {"type": "string"}
        glue_schema = schema_transformer.properties(properties=properties)
        assert len(properties) == 2
        assert glue_schema[0]["name"] == "host"
        assert glue_schema[0]["type"].input_string == "string"
        assert glue_schema[1]["name"] == "clientIp"
        assert glue_schema[1]["type"].input_string == "string"

    def test_object(
        self,
    ):
        from utils.aws.glue.schema import DataType
        from utils.aws.glue.table import JsonSchemaToGlueSchema

        schema_transformer = JsonSchemaToGlueSchema()

        property = {
            "type": "object",
            "properties": {"host": {"type": "string"}, "clientIp": {"type": "string"}},
        }
        glue_schema = schema_transformer.object(property=property)
        assert isinstance(glue_schema, DataType) == True
        assert glue_schema.input_string == "struct<host:string,clientIp:string>"

        property = {
            "type": "object",
            "properties": {
                "host": {"type": "string"},
                "header": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "Host": {"type": "string"},
                            "Content-Type": {"type": "string"},
                        },
                    },
                },
            },
        }
        glue_schema = schema_transformer.object(property=property)
        assert isinstance(glue_schema, DataType) == True
        assert (
            glue_schema.input_string
            == "struct<host:string,header:array<struct<Host:string,Content-Type:string>>>"
        )

    def test_default(
        self,
    ):
        from utils.aws.glue.schema import DataType
        from utils.aws.glue.table import JsonSchemaToGlueSchema

        schema_transformer = JsonSchemaToGlueSchema()

        name = "data_type_is_number"
        property = {"type": "number"}
        glue_schema = schema_transformer.default(property=property)
        assert isinstance(glue_schema, DataType) == True
        assert glue_schema.input_string == "double"

        name = "data_type_is_bigint"
        property = {"type": "big_int"}
        glue_schema = schema_transformer.default(property=property)
        assert isinstance(glue_schema, DataType) == True
        assert glue_schema.input_string == "bigint"

        name = "data_type_is_smallint"
        property = {"type": "small_int"}
        glue_schema = schema_transformer.default(property=property)
        assert isinstance(glue_schema, DataType) == True
        assert glue_schema.input_string == "smallint"

        name = "data_type_is_tinyint"
        property = {"type": "tiny_int"}
        glue_schema = schema_transformer.default(property=property)
        assert isinstance(glue_schema, DataType) == True
        assert glue_schema.input_string == "tinyint"

        name = "data_type_is_integer"
        property = {"type": "integer"}
        glue_schema = schema_transformer.default(property=property)
        assert isinstance(glue_schema, DataType) == True
        assert glue_schema.input_string == "int"

        for data_type in (
            "boolean",
            "binary",
            "double",
            "float",
            "date",
            "timestamp",
            "string",
        ):
            name = f"data_type_is_{data_type}"
            property = {"type": data_type}
            glue_schema = schema_transformer.default(property=property)
            assert isinstance(glue_schema, DataType) == True
            assert glue_schema.input_string == data_type

    def test_map(
        self,
    ):
        from utils.aws.glue.schema import DataType
        from utils.aws.glue.table import JsonSchemaToGlueSchema

        schema_transformer = JsonSchemaToGlueSchema()

        property = {
            "type": "map",
            "properties": {"key": {"type": "string"}, "value": {"type": "integer"}},
        }
        glue_schema = schema_transformer.map(property=property)
        assert isinstance(glue_schema, DataType) == True
        assert glue_schema.input_string == "map<string,integer>"

    def test_array(
        self,
    ):
        from utils.aws.glue.schema import DataType
        from utils.aws.glue.table import JsonSchemaToGlueSchema

        schema_transformer = JsonSchemaToGlueSchema()

        # array
        property = {"type": "array", "items": {"type": "string"}}
        glue_schema = schema_transformer.array(property=property)
        assert isinstance(glue_schema, DataType) == True
        assert glue_schema.input_string == "array<string>"

        # object in array
        property = {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "host": {"type": "string"},
                    "clientIp": {"type": "string"},
                },
            },
        }
        glue_schema = schema_transformer.array(property=property)
        assert isinstance(glue_schema, DataType) == True
        assert glue_schema.input_string == "array<struct<host:string,clientIp:string>>"

        # map in array
        property = {
            "type": "array",
            "items": {
                "type": "map",
                "properties": {"key": {"type": "string"}, "value": {"type": "string"}},
            },
        }
        glue_schema = schema_transformer.array(property=property)
        assert isinstance(glue_schema, DataType) == True
        assert glue_schema.input_string == "array<map<string,string>>"

        # multi dimension array
        property = {
            "type": "array",
            "items": {"type": "array", "items": {"type": "string"}},
        }
        glue_schema = schema_transformer.array(property=property)
        assert isinstance(glue_schema, DataType) == True
        assert glue_schema.input_string == "array<array<string>>"

        # multi dimension array
        property = {
            "type": "array",
            "items": {
                "type": "array",
                "items": {"type": "array", "items": {"type": "string"}},
            },
        }
        glue_schema = schema_transformer.array(property=property)
        assert isinstance(glue_schema, DataType) == True
        assert glue_schema.input_string == "array<array<array<string>>>"

    def test_remove_partition(
        self,
    ):
        from utils.aws.glue.table import JsonSchemaToGlueSchema

        schema_transformer = JsonSchemaToGlueSchema()

        # no partition key in json schema
        json_schema = {"type": "object", "properties": collections.OrderedDict()}
        json_schema["properties"]["time"] = {
            "type": "timestamp",
            "timeKey": True,
            "format": "%Y-%m-%dT%H:%M:%SZ",
        }
        json_schema["properties"]["host"] = {"type": "string"}
        new_json_schema = schema_transformer.remove_partition(json_schema=json_schema)
        assert new_json_schema == {
            "type": "object",
            "properties": collections.OrderedDict(
                [
                    (
                        "time",
                        {
                            "type": "timestamp",
                            "timeKey": True,
                            "format": "%Y-%m-%dT%H:%M:%SZ",
                        },
                    ),
                    ("host", {"type": "string"}),
                ]
            ),
        }

        json_schema = {"type": "object", "properties": collections.OrderedDict()}
        json_schema["properties"]["time"] = {
            "type": "timestamp",
            "timeKey": True,
            "format": "%Y-%m-%dT%H:%M:%SZ",
        }
        json_schema["properties"]["host"] = {"type": "string", "partition": True}
        new_json_schema = schema_transformer.remove_partition(json_schema=json_schema)
        assert new_json_schema == {
            "type": "object",
            "properties": collections.OrderedDict(
                [
                    (
                        "time",
                        {
                            "type": "timestamp",
                            "timeKey": True,
                            "format": "%Y-%m-%dT%H:%M:%SZ",
                        },
                    )
                ]
            ),
        }

        json_schema = {"type": "object", "properties": collections.OrderedDict()}
        json_schema["properties"]["time"] = {
            "type": "timestamp",
            "timeKey": True,
            "format": "%Y-%m-%dT%H:%M:%SZ",
        }
        json_schema["properties"]["host"] = {"type": "string", "partition": True}
        json_schema["properties"]["context"] = {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "host": {"type": "string", "partition": True},
                    "processTime": {
                        "type": "timestamp",
                        "timeKey": True,
                        "format": "%Y-%m-%dT%H:%M:%SZ",
                    },
                },
            },
        }
        json_schema["properties"]["processInfo"] = {
            "type": "object",
            "properties": {
                "hostname": {"type": "string", "partition": True},
                "processTime": {
                    "type": "timestamp",
                    "timeKey": True,
                    "format": "%Y-%m-%d %H:%M:%S",
                },
            },
        }
        new_json_schema = schema_transformer.remove_partition(json_schema=json_schema)
        assert new_json_schema == {
            "type": "object",
            "properties": collections.OrderedDict(
                [
                    (
                        "time",
                        {
                            "type": "timestamp",
                            "timeKey": True,
                            "format": "%Y-%m-%dT%H:%M:%SZ",
                        },
                    ),
                    (
                        "context",
                        {
                            "type": "array",
                            "items": {
                                "type": "object",
                                "properties": {
                                    "host": {"type": "string", "partition": True},
                                    "processTime": {
                                        "type": "timestamp",
                                        "timeKey": True,
                                        "format": "%Y-%m-%dT%H:%M:%SZ",
                                    },
                                },
                            },
                        },
                    ),
                    (
                        "processInfo",
                        {
                            "type": "object",
                            "properties": {
                                "hostname": {"type": "string", "partition": True},
                                "processTime": {
                                    "type": "timestamp",
                                    "timeKey": True,
                                    "format": "%Y-%m-%d %H:%M:%S",
                                },
                            },
                        },
                    ),
                ]
            ),
        }

    def test_sorted_partition_key(
        self,
    ):
        from utils.aws.glue.table import JsonSchemaToGlueSchema

        schema_transformer = JsonSchemaToGlueSchema()

        partitions = {}
        sorted_partitions = schema_transformer._sorted_partition_key(
            partitions=partitions
        )
        assert sorted_partitions == {}

        partitions = {
            "host": {"type": "string"},
            "__execution_name__": {"type": "string"},
            "event_hour": {"type": "string"},
        }
        sorted_partitions = schema_transformer._sorted_partition_key(
            partitions=partitions
        )
        assert sorted_partitions == collections.OrderedDict(
            [
                ("event_hour", {"type": "string"}),
                ("host", {"type": "string"}),
                ("__execution_name__", {"type": "string"}),
            ]
        )

        partitions = {"host": {"type": "string"}}
        sorted_partitions = schema_transformer._sorted_partition_key(
            partitions=partitions
        )
        assert sorted_partitions == collections.OrderedDict(
            [("host", {"type": "string"})]
        )

        partitions = {"host": {"type": "string"}, "event_hour": {"type": "string"}}
        sorted_partitions = schema_transformer._sorted_partition_key(
            partitions=partitions
        )
        assert sorted_partitions == collections.OrderedDict(
            [("event_hour", {"type": "string"}), ("host", {"type": "string"})]
        )

        partitions = {
            "__execution_name__": {"type": "string"},
            "host": {"type": "string"},
        }
        sorted_partitions = schema_transformer._sorted_partition_key(
            partitions=partitions
        )
        assert sorted_partitions == collections.OrderedDict(
            [("host", {"type": "string"}), ("__execution_name__", {"type": "string"})]
        )

        partitions = {
            "host": {"type": "string"},
            "__execution_name__": {"type": "string"},
            "groupId": {"type": "string"},
            "event_hour": {"type": "string"},
        }
        sorted_partitions = schema_transformer._sorted_partition_key(
            partitions=partitions
        )
        assert sorted_partitions == collections.OrderedDict(
            [
                ("event_hour", {"type": "string"}),
                ("host", {"type": "string"}),
                ("groupId", {"type": "string"}),
                ("__execution_name__", {"type": "string"}),
            ]
        )

    def test_find_partition_key(
        self,
    ):
        from utils.aws.glue.table import JsonSchemaToGlueSchema

        schema_transformer = JsonSchemaToGlueSchema()

        # no partition key in json schema
        json_schema = {"type": "object", "properties": collections.OrderedDict()}
        json_schema["properties"]["time"] = {
            "type": "timestamp",
            "timeKey": True,
            "format": "%Y-%m-%dT%H:%M:%SZ",
        }
        json_schema["properties"]["host"] = {"type": "string"}
        new_json_schema = schema_transformer.add_path(json_schema=json_schema)
        new_json_schema = schema_transformer._find_partition_key(
            json_schema=json_schema
        )
        assert new_json_schema == {}

        json_schema = {"type": "object", "properties": collections.OrderedDict()}
        json_schema["properties"]["time"] = {
            "type": "timestamp",
            "timeKey": True,
            "format": "%Y-%m-%dT%H:%M:%SZ",
        }
        json_schema["properties"]["host"] = {"type": "string", "partition": True}
        new_json_schema = schema_transformer.add_path(json_schema=json_schema)
        new_json_schema = schema_transformer._find_partition_key(
            json_schema=json_schema
        )
        assert new_json_schema == {
            "host": {"type": "string", "partition": True, "path": '"host"'}
        }

        json_schema = {"type": "object", "properties": collections.OrderedDict()}
        json_schema["properties"]["time"] = {
            "type": "timestamp",
            "timeKey": True,
            "format": "%Y-%m-%dT%H:%M:%SZ",
        }
        json_schema["properties"]["host"] = {"type": "string", "partition": True}
        json_schema["properties"]["context"] = {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "service": {"type": "string", "partition": True},
                    "processTime": {
                        "type": "timestamp",
                        "timeKey": True,
                        "format": "%Y-%m-%dT%H:%M:%SZ",
                    },
                },
            },
        }
        json_schema["properties"]["processInfo"] = {
            "type": "object",
            "properties": {
                "hostname": {"type": "string", "partition": True},
                "processTime": {
                    "type": "timestamp",
                    "timeKey": True,
                    "format": "%Y-%m-%d %H:%M:%S",
                },
            },
        }
        new_json_schema = schema_transformer.add_path(json_schema=json_schema)
        new_json_schema = schema_transformer._find_partition_key(
            json_schema=json_schema
        )
        assert new_json_schema == {
            "hostname": {
                "type": "string",
                "partition": True,
                "path": '"processInfo"."hostname"',
            },
            "host": {"type": "string", "partition": True, "path": '"host"'},
        }

    def test_add_path(
        self,
    ):
        from utils.aws.glue.table import JsonSchemaToGlueSchema

        schema_transformer = JsonSchemaToGlueSchema()

        json_schema = {"type": "object", "properties": {}}
        json_schema["properties"]["host"] = {"type": "string", "partition": True}
        json_schema["properties"]["context"] = {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "host": {"type": "string", "partition": True},
                    "processTime": {
                        "type": "timestamp",
                        "timeKey": True,
                        "format": "%Y-%m-%dT%H:%M:%SZ",
                    },
                },
            },
        }
        json_schema["properties"]["processInfo"] = {
            "type": "object",
            "properties": {
                "hostname": {
                    "type": "string",
                    "partition": True,
                    "path": '"test"."hostname"',
                },
                "processTime": {
                    "type": "timestamp",
                    "timeKey": True,
                    "format": "%Y-%m-%d %H:%M:%S",
                },
                "integration": {
                    "type": "object",
                    "properties": {
                        "duration": {"type": "double"},
                        "status": {"type": "integer"},
                    },
                },
            },
        }
        new_json_schema = schema_transformer.add_path(json_schema=json_schema)
        assert new_json_schema == {
            "type": "object",
            "properties": {
                "host": {"type": "string", "partition": True, "path": '"host"'},
                "context": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "host": {"type": "string", "partition": True},
                            "processTime": {
                                "type": "timestamp",
                                "timeKey": True,
                                "format": "%Y-%m-%dT%H:%M:%SZ",
                            },
                        },
                    },
                    "path": '"context"',
                },
                "processInfo": {
                    "type": "object",
                    "properties": {
                        "hostname": {
                            "type": "string",
                            "partition": True,
                            "path": '"test"."hostname"',
                        },
                        "processTime": {
                            "type": "timestamp",
                            "timeKey": True,
                            "format": "%Y-%m-%d %H:%M:%S",
                            "path": '"processInfo"."processTime"',
                        },
                        "integration": {
                            "type": "object",
                            "properties": {
                                "duration": {
                                    "type": "double",
                                    "path": '"processInfo"."integration"."duration"',
                                },
                                "status": {
                                    "type": "integer",
                                    "path": '"processInfo"."integration"."status"',
                                },
                            },
                            "path": '"processInfo"."integration"',
                        },
                    },
                    "path": '"processInfo"',
                },
            },
        }

    def test_convert_time_type_to_string(
        self,
    ):
        from utils.aws.glue.table import JsonSchemaToGlueSchema

        schema_transformer = JsonSchemaToGlueSchema()
        json_schema = {"type": "object", "properties": {}}
        json_schema["properties"]["host"] = {"type": "string", "partition": True}
        json_schema["properties"]["context"] = {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "host": {"type": "string", "partition": True},
                    "processTime": {
                        "type": "timestamp",
                        "timeKey": True,
                        "format": "%Y-%m-%dT%H:%M:%SZ",
                    },
                },
            },
        }
        json_schema["properties"]["processInfo"] = {
            "type": "object",
            "properties": {
                "hostname": {
                    "type": "string",
                    "partition": True,
                    "path": '"test"."hostname"',
                },
                "processTime": {
                    "type": "timestamp",
                    "timeKey": True,
                    "format": "%Y-%m-%d %H:%M:%S",
                },
                "integration": {
                    "type": "object",
                    "properties": {
                        "duration": {"type": "double"},
                        "status": {"type": "integer"},
                    },
                },
            },
        }
        new_json_schema = schema_transformer.convert_time_type_to_string(
            json_schema=json_schema
        )
        assert json_schema == {
            "type": "object",
            "properties": {
                "host": {"type": "string", "partition": True},
                "context": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "host": {"type": "string", "partition": True},
                            "processTime": {
                                "type": "timestamp",
                                "timeKey": True,
                                "format": "%Y-%m-%dT%H:%M:%SZ",
                            },
                        },
                    },
                },
                "processInfo": {
                    "type": "object",
                    "properties": {
                        "hostname": {
                            "type": "string",
                            "partition": True,
                            "path": '"test"."hostname"',
                        },
                        "processTime": {
                            "type": "timestamp",
                            "timeKey": True,
                            "format": "%Y-%m-%d %H:%M:%S",
                        },
                        "integration": {
                            "type": "object",
                            "properties": {
                                "duration": {"type": "double"},
                                "status": {"type": "integer"},
                            },
                        },
                    },
                },
            },
        }
        assert new_json_schema == {
            "type": "object",
            "properties": {
                "host": {"type": "string", "partition": True},
                "context": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "host": {"type": "string", "partition": True},
                            "processTime": {
                                "type": "string",
                                "timeKey": True,
                                "format": "%Y-%m-%dT%H:%M:%SZ",
                            },
                        },
                    },
                },
                "processInfo": {
                    "type": "object",
                    "properties": {
                        "hostname": {
                            "type": "string",
                            "partition": True,
                            "path": '"test"."hostname"',
                        },
                        "processTime": {
                            "type": "string",
                            "timeKey": True,
                            "format": "%Y-%m-%d %H:%M:%S",
                        },
                        "integration": {
                            "type": "object",
                            "properties": {
                                "duration": {"type": "double"},
                                "status": {"type": "integer"},
                            },
                        },
                    },
                },
            },
        }

    def test_add_backquote_into_key_name(
        self,
    ):
        from utils.aws.glue.table import JsonSchemaToGlueSchema

        schema_transformer = JsonSchemaToGlueSchema()
        json_schema = {"type": "object", "properties": {}}
        json_schema["properties"]["host"] = {"type": "string", "partition": True}
        json_schema["properties"]["context"] = {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "host": {"type": "string", "partition": True},
                    "processTime": {
                        "type": "timestamp",
                        "timeKey": True,
                        "format": "%Y-%m-%dT%H:%M:%SZ",
                    },
                },
            },
        }
        json_schema["properties"]["processInfo"] = {
            "type": "object",
            "properties": {
                "hostname": {
                    "type": "string",
                    "partition": True,
                    "path": '"test"."hostname"',
                },
                "processTime": {
                    "type": "timestamp",
                    "timeKey": True,
                    "format": "%Y-%m-%d %H:%M:%S",
                },
                "integration": {
                    "type": "object",
                    "properties": {
                        "duration": {"type": "double"},
                        "status": {"type": "integer"},
                    },
                },
            },
        }
        new_json_schema = schema_transformer.add_backquote_into_key_name(
            json_schema=json_schema
        )
        assert json_schema == {
            "type": "object",
            "properties": {
                "host": {"type": "string", "partition": True},
                "context": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "host": {"type": "string", "partition": True},
                            "processTime": {
                                "type": "timestamp",
                                "timeKey": True,
                                "format": "%Y-%m-%dT%H:%M:%SZ",
                            },
                        },
                    },
                },
                "processInfo": {
                    "type": "object",
                    "properties": {
                        "hostname": {
                            "type": "string",
                            "partition": True,
                            "path": '"test"."hostname"',
                        },
                        "processTime": {
                            "type": "timestamp",
                            "timeKey": True,
                            "format": "%Y-%m-%d %H:%M:%S",
                        },
                        "integration": {
                            "type": "object",
                            "properties": {
                                "duration": {"type": "double"},
                                "status": {"type": "integer"},
                            },
                        },
                    },
                },
            },
        }
        assert new_json_schema == {
            "type": "object",
            "properties": {
                "`host`": {"type": "string", "partition": True},
                "`context`": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "`host`": {"type": "string", "partition": True},
                            "`processTime`": {
                                "type": "timestamp",
                                "timeKey": True,
                                "format": "%Y-%m-%dT%H:%M:%SZ",
                            },
                        },
                    },
                },
                "`processInfo`": {
                    "type": "object",
                    "properties": {
                        "`hostname`": {
                            "type": "string",
                            "partition": True,
                            "path": '"test"."hostname"',
                        },
                        "`processTime`": {
                            "type": "timestamp",
                            "timeKey": True,
                            "format": "%Y-%m-%d %H:%M:%S",
                        },
                        "`integration`": {
                            "type": "object",
                            "properties": {
                                "`duration`": {"type": "double"},
                                "`status`": {"type": "integer"},
                            },
                        },
                    },
                },
            },
        }

    def test_extract_partition_keys(
        self,
    ):
        from utils.aws.glue.table import JsonSchemaToGlueSchema

        schema_transformer = JsonSchemaToGlueSchema()

        json_schema = {"type": "object", "properties": {}}
        json_schema["properties"]["timestamp"] = {
            "type": "timestamp",
            "timeKey": True,
            "format": "%Y-%m-%dT%H:%M:%SZ",
        }
        json_schema["properties"]["host"] = {"type": "string", "partition": True}
        json_schema["properties"]["context"] = {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "service": {"type": "string", "partition": True},
                    "processTime": {
                        "type": "timestamp",
                        "timeKey": True,
                        "format": "%Y-%m-%dT%H:%M:%SZ",
                    },
                },
            },
        }
        json_schema["properties"]["processInfo"] = {
            "type": "object",
            "properties": {
                "hostname": {"type": "string", "partition": True},
                "processTime": {
                    "type": "timestamp",
                    "timeKey": True,
                    "format": "%Y-%m-%d %H:%M:%S",
                },
                "integration": {
                    "type": "object",
                    "properties": {
                        "duration": {"type": "double"},
                        "status": {"type": "integer"},
                    },
                },
            },
        }
        new_json_schema = schema_transformer.extract_partition_keys(
            json_schema=json_schema
        )
        assert new_json_schema == {
            "type": "object",
            "properties": collections.OrderedDict(
                [
                    ("host", {"type": "string", "partition": True}),
                    ("hostname", {"type": "string", "partition": True}),
                ]
            ),
        }

        json_schema = {"type": "object", "properties": {}}
        json_schema["properties"]["context"] = {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "host": {"type": "string", "partition": True},
                    "processTime": {
                        "type": "timestamp",
                        "timeKey": True,
                        "format": "%Y-%m-%dT%H:%M:%SZ",
                    },
                },
            },
        }
        json_schema["properties"]["processInfo"] = {
            "type": "object",
            "properties": {
                "hostname": {"type": "string", "partition": True},
                "processTime": {
                    "type": "timestamp",
                    "timeKey": True,
                    "format": "%Y-%m-%d %H:%M:%S",
                },
                "integration": {
                    "type": "object",
                    "properties": {
                        "duration": {"type": "double"},
                        "status": {"type": "integer"},
                    },
                },
            },
        }
        new_json_schema = schema_transformer.extract_partition_keys(
            json_schema=json_schema
        )
        assert new_json_schema == {
            "type": "object",
            "properties": collections.OrderedDict(
                [("hostname", {"type": "string", "partition": True})]
            ),
        }

    def test_extract_partition_indexes(
        self,
    ):
        from utils.aws.glue.table import JsonSchemaToGlueSchema

        schema_transformer = JsonSchemaToGlueSchema()

        json_schema = {"type": "object", "properties": {}}
        json_schema["properties"]["context"] = {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "host": {"type": "string", "partition": True},
                    "processTime": {
                        "type": "timestamp",
                        "timeKey": True,
                        "format": "%Y-%m-%dT%H:%M:%SZ",
                    },
                },
            },
        }
        json_schema["properties"]["processInfo"] = {
            "type": "object",
            "properties": {
                "hostname": {"type": "string", "partition": True},
                "groupId": {"type": "string", "partition": True},
                "processTime": {
                    "type": "timestamp",
                    "timeKey": True,
                    "format": "%Y-%m-%d %H:%M:%S",
                },
                "integration": {
                    "type": "object",
                    "properties": {
                        "duration": {"type": "double"},
                        "status": {"type": "integer"},
                    },
                },
            },
        }
        json_schema["properties"]["targetGroup"] = {"type": "string", "partition": True}
        json_schema["properties"]["elb"] = {"type": "string", "partition": True}
        json_schema["properties"]["event_hour"] = {"type": "string", "partition": True}
        json_schema["properties"]["__execution_name__"] = {
            "type": "string",
            "partition": True,
        }
        partition_indexes = schema_transformer.extract_partition_indexes(
            json_schema=json_schema
        )
        assert partition_indexes == [
            {"IndexName": "IDX_EXECUTION_NAME", "Keys": ["__execution_name__"]},
            {
                "IndexName": "IDX_PARTITIONS",
                "Keys": ["event_hour", "targetGroup", "elb"],
            },
        ]

        json_schema = {"type": "object", "properties": {}}
        json_schema["properties"]["context"] = {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "host": {"type": "string", "partition": True},
                    "processTime": {
                        "type": "timestamp",
                        "timeKey": True,
                        "format": "%Y-%m-%dT%H:%M:%SZ",
                    },
                },
            },
        }
        json_schema["properties"]["event_hour"] = {"type": "string", "partition": True}
        json_schema["properties"]["__execution_name__"] = {
            "type": "string",
            "partition": True,
        }
        partition_indexes = schema_transformer.extract_partition_indexes(
            json_schema=json_schema
        )
        assert partition_indexes == [
            {"IndexName": "IDX_EXECUTION_NAME", "Keys": ["__execution_name__"]},
            {"IndexName": "IDX_PARTITIONS", "Keys": ["event_hour"]},
        ]

    def test_extract_partition_info(self):
        from utils.aws.glue.table import JsonSchemaToGlueSchema

        schema_transformer = JsonSchemaToGlueSchema()

        json_schema = {"type": "object", "properties": {}}
        json_schema["properties"]["context"] = {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "host": {"type": "string", "partition": True},
                    "processTime": {
                        "type": "timestamp",
                        "timeKey": True,
                        "format": "%Y-%m-%dT%H:%M:%SZ",
                    },
                },
            },
        }
        json_schema["properties"]["processInfo"] = {
            "type": "object",
            "properties": {
                "hostname": {"type": "string", "partition": True},
                "groupId": {"type": "string", "partition": True},
                "processTime": {
                    "type": "timestamp",
                    "timeKey": True,
                    "format": "%Y-%m-%d %H:%M:%S",
                },
                "integration": {
                    "type": "object",
                    "properties": {
                        "duration": {"type": "double"},
                        "status": {"type": "integer"},
                    },
                },
            },
        }
        json_schema["properties"]["targetGroup"] = {"type": "string", "partition": True}
        json_schema["properties"]["elb"] = {"type": "string", "partition": True}
        json_schema["properties"]["event_hour"] = {"type": "string", "partition": True}
        json_schema["properties"]["__execution_name__"] = {
            "type": "string",
            "partition": True,
        }
        partition_info = schema_transformer.extract_partition_info(
            json_schema=json_schema
        )
        assert partition_info == collections.OrderedDict(
            [
                ("event_hour", {"type": "time", "from": "%Y%m%d%H", "to": "%Y%m%d00"}),
                ("targetGroup", {"type": "retain"}),
                ("elb", {"type": "retain"}),
                ("hostname", {"type": "retain"}),
                ("groupId", {"type": "retain"}),
                (
                    "__execution_name__",
                    {
                        "type": "default",
                        "value": "00000000-0000-0000-0000-000000000000",
                    },
                ),
            ]
        )

        json_schema = {"type": "object", "properties": {}}
        json_schema["properties"]["context"] = {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "host": {"type": "string", "partition": True},
                    "processTime": {
                        "type": "timestamp",
                        "timeKey": True,
                        "format": "%Y-%m-%dT%H:%M:%SZ",
                    },
                },
            },
        }
        json_schema["properties"]["event_hour"] = {"type": "string", "partition": True}
        json_schema["properties"]["__execution_name__"] = {
            "type": "string",
            "partition": True,
        }
        partition_info = schema_transformer.extract_partition_info(
            json_schema=json_schema
        )
        assert partition_info == collections.OrderedDict(
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

    def test_to_glue_schema(
        self,
    ):
        from utils.aws.glue.table import JsonSchemaToGlueSchema

        schema_transformer = JsonSchemaToGlueSchema()

        json_schema = {"type": "object", "properties": {}}
        json_schema["properties"]["timestamp"] = {
            "type": "timestamp",
            "timeKey": True,
            "format": "%Y-%m-%dT%H:%M:%SZ",
        }
        json_schema["properties"]["host"] = {"type": "string", "partition": True}
        json_schema["properties"]["context"] = {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "host": {"type": "string", "partition": True},
                    "processTime": {
                        "type": "timestamp",
                        "timeKey": True,
                        "format": "%Y-%m-%dT%H:%M:%SZ",
                    },
                },
            },
        }
        json_schema["properties"]["processInfo"] = {
            "type": "object",
            "properties": {
                "hostname": {"type": "string", "partition": True},
                "processTime": {
                    "type": "timestamp",
                    "timeKey": True,
                    "format": "%Y-%m-%d %H:%M:%S",
                },
                "integration": {
                    "type": "object",
                    "properties": {
                        "duration": {"type": "double"},
                        "status": {"type": "integer"},
                    },
                },
            },
        }
        json_schema = schema_transformer.add_path(json_schema=json_schema)
        partition_schema = schema_transformer.extract_partition_keys(
            json_schema=json_schema
        )

        json_schema = schema_transformer.remove_partition(json_schema=json_schema)

        for key, value in partition_schema["properties"].items():
            json_schema["properties"].pop(key, None)
            json_schema["properties"][key] = value

        glue_schema = schema_transformer.to_glue_schema(json_schema=json_schema)
        assert glue_schema[0]["Name"] == "timestamp"
        assert glue_schema[0]["Type"] == "timestamp"
        assert glue_schema[1]["Name"] == "context"
        assert (
            glue_schema[1]["Type"] == "array<struct<host:string,processTime:timestamp>>"
        )
        assert glue_schema[2]["Name"] == "processInfo"
        assert (
            glue_schema[2]["Type"]
            == "struct<hostname:string,processTime:timestamp,integration:struct<duration:double,status:int>>"
        )
        assert glue_schema[3]["Name"] == "host"
        assert glue_schema[3]["Type"] == "string"
        assert glue_schema[4]["Name"] == "hostname"
        assert glue_schema[4]["Type"] == "string"

        json_schema = {"type": "object", "properties": {}}
        json_schema["properties"]["context"] = {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "host": {"type": "string", "partition": True},
                    "processTime": {
                        "type": "timestamp",
                        "timeKey": True,
                        "format": "%Y-%m-%dT%H:%M:%SZ",
                    },
                },
            },
        }
        json_schema["properties"]["processInfo"] = {
            "type": "object",
            "properties": {
                "hostname": {"type": "string", "partition": True},
                "processTime": {
                    "type": "timestamp",
                    "timeKey": True,
                    "format": "%Y-%m-%d %H:%M:%S",
                },
                "integration": {
                    "type": "object",
                    "properties": {
                        "duration": {"type": "double"},
                        "status": {"type": "integer"},
                    },
                },
            },
        }
        json_schema = schema_transformer.add_path(json_schema=json_schema)
        partition_schema = schema_transformer.extract_partition_keys(
            json_schema=json_schema
        )

        json_schema = schema_transformer.remove_partition(json_schema=json_schema)

        for key, value in partition_schema["properties"].items():
            json_schema["properties"].pop(key, None)
            json_schema["properties"][key] = value

        glue_schema = schema_transformer.to_glue_schema(json_schema=json_schema)
        assert glue_schema[0]["Name"] == "context"
        assert (
            glue_schema[0]["Type"] == "array<struct<host:string,processTime:timestamp>>"
        )
        assert glue_schema[1]["Name"] == "processInfo"
        assert (
            glue_schema[1]["Type"]
            == "struct<hostname:string,processTime:timestamp,integration:struct<duration:double,status:int>>"
        )
        assert glue_schema[2]["Name"] == "hostname"
        assert glue_schema[2]["Type"] == "string"


class TestTableMetaData:

    def test_application_parquet(
        self,
    ):
        from utils.aws.glue.table import TableMetaData
        from utils.aws.glue.dataformat import Parquet

        schema = {
            "type": "object",
            "properties": {
                "remote_addr": {"type": "string"},
                "remote_user": {"type": "string"},
                "time_local": {
                    "type": "string",
                    "timeKey": True,
                    "format": "dd/MMM/YYYY:HH:mm:ss",
                },
                "request_method": {"type": "string"},
                "request_uri": {"type": "string"},
                "status": {"type": "string"},
                "body_bytes_sent": {"type": "string"},
            },
        }

        APPLICATION_PARQUET = TableMetaData(
            data_format=Parquet, schema=schema, ignore_partition=False
        )
        assert APPLICATION_PARQUET.columns == [
            {"Name": "remote_addr", "Type": "string"},
            {"Name": "remote_user", "Type": "string"},
            {"Name": "time_local", "Type": "string"},
            {"Name": "request_method", "Type": "string"},
            {"Name": "request_uri", "Type": "string"},
            {"Name": "status", "Type": "string"},
            {"Name": "body_bytes_sent", "Type": "string"},
        ]
        assert APPLICATION_PARQUET.partition_keys == []
        assert APPLICATION_PARQUET.partition_indexes == []
        assert APPLICATION_PARQUET.partition_info == collections.OrderedDict()
        assert json.dumps(APPLICATION_PARQUET.statements.create) == json.dumps(
            """CREATE EXTERNAL TABLE IF NOT EXISTS `{database}`.`{table_name}` (`remote_addr` string, `remote_user` string, `time_local` string, `request_method` string, `request_uri` string, `status` string, `body_bytes_sent` string)  ROW FORMAT SERDE 'org.apache.hadoop.hive.ql.io.parquet.serde.ParquetHiveSerDe'  STORED AS INPUTFORMAT 'org.apache.hadoop.hive.ql.io.parquet.MapredParquetInputFormat' OUTPUTFORMAT 'org.apache.hadoop.hive.ql.io.parquet.MapredParquetOutputFormat' LOCATION '{location}' ;"""
        )
        assert json.dumps(APPLICATION_PARQUET.statements.insert) == json.dumps(
            """INSERT INTO \"{destination_database}\".\"{destination_table}\" (\"remote_addr\", \"remote_user\", \"time_local\", \"request_method\", \"request_uri\", \"status\", \"body_bytes_sent\") SELECT \"remote_addr\", \"remote_user\", \"time_local\", \"request_method\", \"request_uri\", \"status\", \"body_bytes_sent\" FROM \"{source_database}\".\"{source_table}\" ;"""
        )
        assert json.dumps(APPLICATION_PARQUET.statements.drop) == json.dumps(
            """DROP TABLE IF EXISTS `{database}`.`{table_name}`"""
        )
        assert json.dumps(APPLICATION_PARQUET.statements.aggregate) == json.dumps(
            """INSERT INTO \"{destination_database}\".\"{destination_table}\" (\"remote_addr\", \"remote_user\", \"time_local\", \"request_method\", \"request_uri\", \"status\", \"body_bytes_sent\") SELECT \"remote_addr\", \"remote_user\", \"time_local\", \"request_method\", \"request_uri\", \"status\", \"body_bytes_sent\" FROM \"{source_database}\".\"{source_table}\" WHERE __execution_name__ = '{execution_name}' GROUP BY \"remote_addr\", \"remote_user\", \"time_local\", \"request_method\", \"request_uri\", \"status\", \"body_bytes_sent\";"""
        )

    # def test_application_tsv(self,):
    #     pass

    def test_application_regex(
        self,
    ):
        from utils.aws.glue.table import TableMetaData
        from utils.aws.glue.dataformat import Regex

        schema = {
            "type": "object",
            "properties": {
                "remote_addr": {"type": "string"},
                "remote_user": {"type": "string"},
                "time_local": {
                    "type": "string",
                    "timeKey": True,
                    "format": "dd/MMM/YYYY:HH:mm:ss",
                },
                "request_method": {"type": "string"},
                "request_uri": {"type": "string"},
                "status": {"type": "string"},
                "body_bytes_sent": {"type": "string"},
            },
        }
        APPLICATION_RAW = TableMetaData(
            data_format=Regex,
            schema=schema,
            serialization_properties={
                "input.regex": "(?<remote_addr>\\S+)\\s+-\\s+(?<remote_user>\\S+)\\s+\\[(?<time_local>\\d+\\S+\\d+:\\d+:\\d+:\\d+)\\s+\\S+\\]\\s+'(?<request_method>\\S+)\\s+(?<request_uri>\\S+)\\s+\\S+'\\s+(?<status>\\S+)\\s+(?<body_bytes_sent>\\d{1, 3})"
            },
            ignore_partition=True,
        )
        assert APPLICATION_RAW.columns == [
            {"Name": "remote_addr", "Type": "string"},
            {"Name": "remote_user", "Type": "string"},
            {"Name": "time_local", "Type": "string"},
            {"Name": "request_method", "Type": "string"},
            {"Name": "request_uri", "Type": "string"},
            {"Name": "status", "Type": "string"},
            {"Name": "body_bytes_sent", "Type": "string"},
        ]
        assert APPLICATION_RAW.partition_keys == []
        assert APPLICATION_RAW.partition_indexes == []
        assert APPLICATION_RAW.partition_info == {}
        assert json.dumps(APPLICATION_RAW.statements.create) == json.dumps(
            """CREATE EXTERNAL TABLE IF NOT EXISTS `{database}`.`{table_name}` (`remote_addr` string, `remote_user` string, `time_local` string, `request_method` string, `request_uri` string, `status` string, `body_bytes_sent` string)  ROW FORMAT SERDE 'org.apache.hadoop.hive.serde2.RegexSerDe' WITH SERDEPROPERTIES ('input.regex'='(\\\\S+)\\\\s+-\\\\s+(\\\\S+)\\\\s+\\\\[(\\\\d+\\\\S+\\\\d+:\\\\d+:\\\\d+:\\\\d+)\\\\s+\\\\S+\\\\]\\\\s+\\'(\\\\S+)\\\\s+(\\\\S+)\\\\s+\\\\S+\\'\\\\s+(\\\\S+)\\\\s+(\\\\d{{1, 3}})') STORED AS INPUTFORMAT 'org.apache.hadoop.mapred.TextInputFormat' OUTPUTFORMAT 'org.apache.hadoop.hive.ql.io.HiveIgnoreKeyTextOutputFormat' LOCATION '{location}' ;"""
        )
        assert json.dumps(APPLICATION_RAW.statements.insert) == json.dumps(
            """INSERT INTO \"{destination_database}\".\"{destination_table}\" (\"remote_addr\", \"remote_user\", \"time_local\", \"request_method\", \"request_uri\", \"status\", \"body_bytes_sent\") SELECT \"remote_addr\", \"remote_user\", \"time_local\", \"request_method\", \"request_uri\", \"status\", \"body_bytes_sent\" FROM \"{source_database}\".\"{source_table}\" ;"""
        )
        assert json.dumps(APPLICATION_RAW.statements.drop) == json.dumps(
            """DROP TABLE IF EXISTS `{database}`.`{table_name}`"""
        )
        assert json.dumps(APPLICATION_RAW.statements.aggregate) == json.dumps(
            """INSERT INTO \"{destination_database}\".\"{destination_table}\" (\"remote_addr\", \"remote_user\", \"time_local\", \"request_method\", \"request_uri\", \"status\", \"body_bytes_sent\") SELECT \"remote_addr\", \"remote_user\", \"time_local\", \"request_method\", \"request_uri\", \"status\", \"body_bytes_sent\" FROM \"{source_database}\".\"{source_table}\" WHERE __execution_name__ = '{execution_name}' GROUP BY \"remote_addr\", \"remote_user\", \"time_local\", \"request_method\", \"request_uri\", \"status\", \"body_bytes_sent\";"""
        )

        schema["expression"] = {"where": "status = '200'"}
        APPLICATION_RAW = TableMetaData(
            data_format=Regex,
            schema=schema,
            serialization_properties={
                "input.regex": "(?<remote_addr>\\S+)\\s+-\\s+(?<remote_user>\\S+)\\s+\\[(?<time_local>\\d+\\S+\\d+:\\d+:\\d+:\\d+)\\s+\\S+\\]\\s+'(?<request_method>\\S+)\\s+(?<request_uri>\\S+)\\s+\\S+'\\s+(?<status>\\S+)\\s+(?<body_bytes_sent>\\d{1, 3})"
            },
            ignore_partition=True,
        )
        assert json.dumps(APPLICATION_RAW.statements.create) == json.dumps(
            """CREATE EXTERNAL TABLE IF NOT EXISTS `{database}`.`{table_name}` (`remote_addr` string, `remote_user` string, `time_local` string, `request_method` string, `request_uri` string, `status` string, `body_bytes_sent` string)  ROW FORMAT SERDE 'org.apache.hadoop.hive.serde2.RegexSerDe' WITH SERDEPROPERTIES ('input.regex'='(\\\\S+)\\\\s+-\\\\s+(\\\\S+)\\\\s+\\\\[(\\\\d+\\\\S+\\\\d+:\\\\d+:\\\\d+:\\\\d+)\\\\s+\\\\S+\\\\]\\\\s+\\'(\\\\S+)\\\\s+(\\\\S+)\\\\s+\\\\S+\\'\\\\s+(\\\\S+)\\\\s+(\\\\d{{1, 3}})') STORED AS INPUTFORMAT 'org.apache.hadoop.mapred.TextInputFormat' OUTPUTFORMAT 'org.apache.hadoop.hive.ql.io.HiveIgnoreKeyTextOutputFormat' LOCATION '{location}' ;"""
        )
        assert json.dumps(APPLICATION_RAW.statements.insert) == json.dumps(
            """INSERT INTO \"{destination_database}\".\"{destination_table}\" (\"remote_addr\", \"remote_user\", \"time_local\", \"request_method\", \"request_uri\", \"status\", \"body_bytes_sent\") SELECT \"remote_addr\", \"remote_user\", \"time_local\", \"request_method\", \"request_uri\", \"status\", \"body_bytes_sent\" FROM \"{source_database}\".\"{source_table}\" WHERE status = '200';"""
        )
        assert json.dumps(APPLICATION_RAW.statements.drop) == json.dumps(
            """DROP TABLE IF EXISTS `{database}`.`{table_name}`"""
        )
        assert json.dumps(APPLICATION_RAW.statements.aggregate) == json.dumps(
            """INSERT INTO \"{destination_database}\".\"{destination_table}\" (\"remote_addr\", \"remote_user\", \"time_local\", \"request_method\", \"request_uri\", \"status\", \"body_bytes_sent\") SELECT \"remote_addr\", \"remote_user\", \"time_local\", \"request_method\", \"request_uri\", \"status\", \"body_bytes_sent\" FROM \"{source_database}\".\"{source_table}\" WHERE __execution_name__ = '{execution_name}' AND status = '200' GROUP BY \"remote_addr\", \"remote_user\", \"time_local\", \"request_method\", \"request_uri\", \"status\", \"body_bytes_sent\";"""
        )

    def test_application_customize_statements(
        self,
    ):
        from utils.aws.glue.table import TableMetaData
        from utils.aws.glue.dataformat import Regex

        schema = {
            "type": "object",
            "properties": {
                "remote_addr": {"type": "string"},
                "remote_user": {"type": "string"},
                "time_local": {
                    "type": "string",
                    "timeKey": True,
                    "format": "dd/MMM/YYYY:HH:mm:ss",
                },
                "request_method": {"type": "string"},
                "request_uri": {"type": "string"},
                "status": {"type": "string"},
                "body_bytes_sent": {"type": "string"},
            },
            "statements": {
                "create": "CREATE TABLE IF NOT EXISTS test;",
                "insert": "INSERT INTO test;",
                "drop": "DROP TABLE test;",
                "aggregate": "INSERT INTO test GROUP BY;",
            },
        }
        APPLICATION_RAW = TableMetaData(
            data_format=Regex,
            schema=schema,
            serialization_properties={
                "input.regex": "(?<remote_addr>\\S+)\\s+-\\s+(?<remote_user>\\S+)\\s+\\[(?<time_local>\\d+\\S+\\d+:\\d+:\\d+:\\d+)\\s+\\S+\\]\\s+'(?<request_method>\\S+)\\s+(?<request_uri>\\S+)\\s+\\S+'\\s+(?<status>\\S+)\\s+(?<body_bytes_sent>\\d{1, 3})"
            },
            ignore_partition=True,
        )
        assert APPLICATION_RAW.columns == [
            {"Name": "remote_addr", "Type": "string"},
            {"Name": "remote_user", "Type": "string"},
            {"Name": "time_local", "Type": "string"},
            {"Name": "request_method", "Type": "string"},
            {"Name": "request_uri", "Type": "string"},
            {"Name": "status", "Type": "string"},
            {"Name": "body_bytes_sent", "Type": "string"},
        ]
        assert APPLICATION_RAW.partition_keys == []
        assert APPLICATION_RAW.partition_indexes == []
        assert APPLICATION_RAW.partition_info == {}
        assert json.dumps(APPLICATION_RAW.statements.create) == json.dumps(
            "CREATE TABLE IF NOT EXISTS test;"
        )
        assert json.dumps(APPLICATION_RAW.statements.insert) == json.dumps(
            "INSERT INTO test;"
        )
        assert json.dumps(APPLICATION_RAW.statements.drop) == json.dumps(
            "DROP TABLE test;"
        )
        assert json.dumps(APPLICATION_RAW.statements.aggregate) == json.dumps(
            "INSERT INTO test GROUP BY;"
        )

        schema["expression"] = {"where": "status = '200'"}
        APPLICATION_RAW = TableMetaData(
            data_format=Regex,
            schema=schema,
            serialization_properties={
                "input.regex": "(?<remote_addr>\\S+)\\s+-\\s+(?<remote_user>\\S+)\\s+\\[(?<time_local>\\d+\\S+\\d+:\\d+:\\d+:\\d+)\\s+\\S+\\]\\s+'(?<request_method>\\S+)\\s+(?<request_uri>\\S+)\\s+\\S+'\\s+(?<status>\\S+)\\s+(?<body_bytes_sent>\\d{1, 3})"
            },
            ignore_partition=True,
        )
        assert json.dumps(APPLICATION_RAW.statements.create) == json.dumps(
            "CREATE TABLE IF NOT EXISTS test;"
        )
        assert json.dumps(APPLICATION_RAW.statements.insert) == json.dumps(
            "INSERT INTO test;"
        )
        assert json.dumps(APPLICATION_RAW.statements.drop) == json.dumps(
            "DROP TABLE test;"
        )
        assert json.dumps(APPLICATION_RAW.statements.aggregate) == json.dumps(
            "INSERT INTO test GROUP BY;"
        )
