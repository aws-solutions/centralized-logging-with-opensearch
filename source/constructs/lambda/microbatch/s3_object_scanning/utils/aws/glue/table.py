# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import re
import copy
import types
import collections
from typing import Union
from functools import cached_property
from .dataformat import DataFormat, Parquet
from .schema import Schema, DataType


class TableMetaData:
    def __init__(
        self,
        schema: dict,
        data_format: DataFormat = Parquet,
        compression: bool = True,
        table_properties: Union[dict, None] = None,
        serialization_properties: Union[dict, None] = None,
        ignore_partition: bool = False,
    ):
        self._schema_transformer = JsonSchemaToGlueSchema()

        self.data_format = data_format
        self.schema = self._schema_transformer.add_path(schema)
        self.compression = compression
        self.table_properties = {} if table_properties is None else table_properties
        self.serialization_properties = (
            {} if serialization_properties is None else serialization_properties
        )
        self.ignore_partition = ignore_partition

    @cached_property
    def columns(
        self,
    ) -> list[dict]:
        if self.ignore_partition is True:
            return self._schema_transformer.to_glue_schema(json_schema=self.schema)
        else:
            schema = copy.deepcopy(self.schema)
            schema = self._schema_transformer.remove_partition(json_schema=schema)
            return self._schema_transformer.to_glue_schema(json_schema=schema)

    @cached_property
    def partition_keys(self) -> list[dict]:
        return (
            []
            if self.ignore_partition is True
            else self._schema_transformer.to_glue_schema(
                json_schema=self._schema_transformer.extract_partition_keys(
                    json_schema=self.schema
                )
            )
        )

    @cached_property
    def partition_indexes(self) -> list[dict]:
        return (
            []
            if self.ignore_partition is True
            else self._schema_transformer.extract_partition_indexes(
                json_schema=self.schema
            )
        )

    @cached_property
    def partition_info(self) -> dict:
        return (
            {}
            if self.ignore_partition is True
            else self._schema_transformer.extract_partition_info(
                json_schema=self.schema
            )
        )

    @cached_property
    def statements(self) -> types.SimpleNamespace:
        statements = types.SimpleNamespace()
        statements.create = self._generate_create_statement()
        statements.insert = self._generate_insert_statement()
        statements.drop = self._generate_drop_statement()
        statements.aggregate = self._generate_aggregate_statement()
        return statements

    def _generate_create_statement(self) -> str:
        if self.schema.get("statements", {}).get("create"):
            return self.schema["statements"]["create"]

        add_backquote_json_schema = (
            self._schema_transformer.add_backquote_into_key_name(
                json_schema=self.schema
            )
        )

        column_infos = self._schema_transformer.to_glue_schema(
            json_schema=add_backquote_json_schema
        )
        columns = ", ".join([f"{x['Name']} {x['Type']}" for x in column_infos])

        partitions = ""
        if self.partition_keys:
            partitions = ", ".join(
                [f"`{x['Name']}` {x['Type']}" for x in self.partition_keys]
            )
            partitions = f"PARTITIONED BY ({partitions})"

        serialization_properties = ""
        if self.serialization_properties:
            properties = []
            for key, value in self.serialization_properties.items():
                if key == "input.regex":
                    value = re.sub(r"\?<\w+?>", "", value).replace("\\", "\\\\")
                    value = re.sub(r"\{([^}]+)\}", r"{{\1}}", value)
                properties.append(
                    f"""'{key.replace("'", f"{chr(92)}'")}'='{value.replace("'", f"{chr(92)}'")}'"""
                )
            serialization_properties = f'WITH SERDEPROPERTIES ({", ".join(properties)})'

        table_properties = ""
        if self.table_properties:
            properties = ", ".join(
                [
                    f"{repr(key)}={repr(value)}"
                    for key, value in self.table_properties.items()
                ]
            )
            table_properties = f"TBLPROPERTIES ({properties})"

        return (
            f"""CREATE EXTERNAL TABLE IF NOT EXISTS `{{database}}`.`{{table_name}}` ({columns}) {partitions} """
            f"""ROW FORMAT SERDE '{self.data_format.SERIALIZATION_LIBRARY}' """
            f"""{serialization_properties} """
            f"""STORED AS INPUTFORMAT '{self.data_format.INPUT_FORMAT}' OUTPUTFORMAT '{self.data_format.OUTPUT_FORMAT}' """
            f"""LOCATION '{{location}}' """
            f"""{table_properties};"""
        )

    def _generate_insert_statement(self) -> str:
        if self.schema.get("statements", {}).get("insert"):
            return self.schema["statements"]["insert"]

        destination_cols = ", ".join(
            [f'"{x}"' for x in self.schema["properties"].keys()]
        )
        select_expression = ", ".join(
            [
                f"{x.get('expression', x.get('path'))}"
                for x in self.schema["properties"].values()
            ]
        )
        where_clause = ""
        if self.schema.get("expression", {}).get("where"):
            where_clause = f"WHERE {self.schema['expression']['where']}"

        return f"""INSERT INTO "{{destination_database}}"."{{destination_table}}" ({destination_cols}) SELECT {select_expression} FROM "{{source_database}}"."{{source_table}}" {where_clause};"""

    def _generate_aggregate_statement(self) -> str:
        if self.schema.get("statements", {}).get("aggregate"):
            return self.schema["statements"]["aggregate"]

        destination_cols = ", ".join(
            [f'"{x}"' for x in self.schema["properties"].keys()]
        )
        select_expression = ", ".join(
            [
                f"{x.get('expression', x.get('path'))}"
                for x in self.schema["properties"].values()
            ]
        )
        group_by = ", ".join(
            [
                f"{x.get('expression', x.get('path'))}"
                for x in self.schema["properties"].values()
                if x.get("measure", False) is False
            ]
        )
        where_clause = "WHERE __execution_name__ = '{execution_name}'"
        if self.schema.get("expression", {}).get("where"):
            where_clause = f"{where_clause} AND {self.schema['expression']['where']}"
        return f"""INSERT INTO "{{destination_database}}"."{{destination_table}}" ({destination_cols}) SELECT {select_expression} FROM "{{source_database}}"."{{source_table}}" {where_clause} GROUP BY {group_by};"""

    def _generate_drop_statement(self) -> str:
        if self.schema.get("statements", {}).get("drop"):
            return self.schema["statements"]["drop"]
        return "DROP TABLE IF EXISTS `{database}`.`{table_name}`"


class JsonSchemaToGlueSchema:

    def __init__(self):
        self._schema = Schema()
        self._type_to_func_mapping = {
            "boolean": self.default,
            "binary": self.default,
            "big_int": self.default,
            "double": self.default,
            "number": self.default,
            "float": self.default,
            "integer": self.default,
            "small_int": self.default,
            "tiny_int": self.default,
            "date": self.default,
            "timestamp": self.default,
            "string": self.default,
            "array": self.array,
            "map": self.map,
            "object": self.object,
        }

    def transform_json_to_glue_schema(self, name: str, property: dict) -> dict:
        if property.get("type") is None:
            property["type"] = "string"

        if property["type"] not in self._type_to_func_mapping:
            raise KeyError(
                f'Do not supported data type: {property["type"]}, supported data type: {self._type_to_func_mapping.keys()}'
            )

        return {
            "name": name,
            "type": self._type_to_func_mapping[property["type"]](property=property),
        }

    def properties(self, properties: dict) -> list:
        objects = []
        for name, property in properties.items():
            objects.append(self.transform_json_to_glue_schema(name, property))
        return objects

    def object(self, property: dict) -> DataType:
        return self._schema.struct(self.properties(properties=property["properties"]))

    def default(self, property: dict) -> DataType:
        return getattr(self._schema, property["type"])()

    def map(self, property: dict) -> DataType:
        return self._schema.map(
            DataType(input_string=property["properties"]["key"]["type"]),
            DataType(input_string=property["properties"]["value"]["type"]),
        )

    def array(self, property: dict) -> DataType:
        return self._schema.array(
            self._type_to_func_mapping[property["items"]["type"]](
                property=property["items"]
            )
        )

    def remove_partition(self, json_schema: dict) -> dict:
        partition_keys = []
        for name, property in json_schema["properties"].items():
            if property.get("partition") is True:
                partition_keys.append(name)

        for partition_key in partition_keys:
            json_schema["properties"].pop(partition_key)
        return json_schema

    def _sorted_partition_key(self, partitions: dict):
        sorted_properties = collections.OrderedDict()
        pk_event_hour = None
        pk_execution_name = None
        if "event_hour" in partitions:
            pk_event_hour = partitions["event_hour"]
            partitions.pop("event_hour")

        if "__execution_name__" in partitions:
            pk_execution_name = partitions["__execution_name__"]
            partitions.pop("__execution_name__")

        if pk_event_hour:
            sorted_properties["event_hour"] = pk_event_hour

        for key, value in partitions.items():
            sorted_properties[key] = value

        if pk_execution_name:
            sorted_properties["__execution_name__"] = pk_execution_name

        return sorted_properties

    def _find_partition_key(self, json_schema: dict) -> dict:
        """Find partition key in Json Schema, search down the partition key field layer by layer,
           and then search the sub-level after the current layer is searched,
           and return all partition key is found.

        Args:
            json_schema (dict): JSON Schema is a structure of JSON data

        Returns:
            dict: Properties of the partition key field.
        """
        partition_keys = collections.OrderedDict()
        object_type_schema = []

        for name, property in json_schema["properties"].items():
            if property.get("partition") is True:
                partition_keys[name] = property
            elif property["type"] == "object":
                object_type_schema.append(property)

        for schema in object_type_schema:
            child_partition_key = self._find_partition_key(json_schema=schema)
            partition_keys.update(child_partition_key)

        partition_keys = self._sorted_partition_key(partitions=partition_keys)

        return partition_keys

    def add_path(self, json_schema: dict) -> dict:
        parent_path = json_schema.get("path")

        for name, property in json_schema["properties"].items():
            if "path" in property:
                continue

            property["path"] = f'{parent_path}."{name}"' if parent_path else f'"{name}"'
            if property["type"] == "object":
                json_schema["properties"][name] = self.add_path(json_schema=property)
        return json_schema

    def convert_time_type_to_string(self, json_schema: dict) -> dict:
        new_json_schema = copy.deepcopy(json_schema)

        if json_schema["type"] == "object":
            for name, property in json_schema["properties"].items():
                if not property.get("type"):
                    property["type"] = "string"

                if property["type"] in ("object", "map", "array"):
                    new_json_schema["properties"][name] = (
                        self.convert_time_type_to_string(
                            json_schema=new_json_schema["properties"][name]
                        )
                    )
                elif property["type"] == "timestamp":
                    new_json_schema["properties"][name]["type"] = "string"
        elif json_schema["type"] == "array":
            new_json_schema["items"] = self.convert_time_type_to_string(
                json_schema=new_json_schema["items"]
            )

        return new_json_schema

    def add_backquote_into_key_name(self, json_schema: dict) -> dict:
        new_json_schema = copy.deepcopy(json_schema)

        if json_schema["type"] == "object":
            for name, property in json_schema["properties"].items():
                if not property.get("type"):
                    property["type"] = "string"

                if property["type"] in ("object", "map", "array"):
                    new_json_schema["properties"][f"`{name}`"] = (
                        self.add_backquote_into_key_name(
                            json_schema=new_json_schema["properties"][name]
                        )
                    )
                else:
                    new_json_schema["properties"][f"`{name}`"] = new_json_schema[
                        "properties"
                    ][name]
                new_json_schema["properties"].pop(name)
        elif json_schema["type"] == "array":
            new_json_schema["items"] = self.add_backquote_into_key_name(
                json_schema=new_json_schema["items"]
            )

        return new_json_schema

    def extract_partition_keys(self, json_schema: dict) -> dict:
        return {
            "type": "object",
            "properties": self._find_partition_key(json_schema=json_schema),
        }

    def extract_partition_indexes(self, json_schema: dict) -> list[dict]:
        partition_indexes = []
        default_partition_keys = []
        for key, value in self._find_partition_key(json_schema=json_schema).items():
            if key == "__execution_name__":
                partition_indexes.append(
                    {"IndexName": "IDX_EXECUTION_NAME", "Keys": ["__execution_name__"]}
                )
                continue
            if len(default_partition_keys) <= 2:
                default_partition_keys.append(key)
        if default_partition_keys:
            partition_indexes.append(
                {"IndexName": "IDX_PARTITIONS", "Keys": default_partition_keys}
            )

        return partition_indexes

    def extract_partition_info(self, json_schema: dict) -> dict:
        partition_info = collections.OrderedDict()
        partitions = self._find_partition_key(json_schema=json_schema)

        for key in partitions.keys():
            if key == "event_hour":
                partition_info[key] = {
                    "type": "time",
                    "from": "%Y%m%d%H",
                    "to": "%Y%m%d00",
                }
            elif key == "__execution_name__":
                partition_info[key] = {
                    "type": "default",
                    "value": "00000000-0000-0000-0000-000000000000",
                }
            else:
                partition_info[key] = {"type": "retain"}
        return partition_info

    def to_glue_schema(self, json_schema: dict) -> list[dict]:
        structure = []
        for info in self.properties(properties=json_schema["properties"]):
            structure.append(
                {
                    "Name": info["name"],
                    "Type": info["type"].input_string,
                }
            )
        return structure
