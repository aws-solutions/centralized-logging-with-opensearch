# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import copy
import  types
from typing import Union
from functools import cached_property
from utils.logschema import JsonSchemaToGlueSchema
from .dataformat import DataFormat, Parquet


class TableMetaData:

    def __init__(self, schema: dict, data_format: DataFormat = Parquet, compression: bool = True, table_properties: Union[dict, None] = None, serialization_properties: Union[dict, None] = None, ignore_partition: bool = False):
        self._schema_transformer = JsonSchemaToGlueSchema()
        
        self.data_format = data_format
        self.schema = self._schema_transformer.add_path(schema)
        self.compression = compression
        self.table_properties = {} if table_properties is None else table_properties
        self.serialization_properties = {} if serialization_properties is None else serialization_properties
        self.ignore_partition = ignore_partition
    
    @cached_property
    def columns(self,) -> list[dict]:
        if self.ignore_partition is True:
            return self._schema_transformer.to_glue_schema(json_schema=self.schema)
        else:
            schema = copy.deepcopy(self.schema)
            schema = self._schema_transformer.remove_partition(json_schema=schema)
            return self._schema_transformer.to_glue_schema(json_schema=schema)
    
    @cached_property
    def partition_keys(self) -> list[dict]:
        return [] if self.ignore_partition is True else self._schema_transformer.to_glue_schema(json_schema=self._schema_transformer.extract_partition_keys(json_schema=self.schema))
    
    @cached_property
    def partition_indexes(self) -> list[dict]:
        return [] if self.ignore_partition is True else self._schema_transformer.extract_partition_indexes(json_schema=self.schema)

    @cached_property
    def partition_info(self) -> dict:
        return {} if self.ignore_partition is True else self._schema_transformer.extract_partition_info(json_schema=self.schema)
    
    @cached_property
    def statements(self) -> types.SimpleNamespace:
        statements = types.SimpleNamespace()
        statements.create = self._generate_create_statement()
        statements.insert = self._generate_insert_statement()
        statements.drop = self._generate_drop_statement()
        statements.aggregate = self._generate_aggregate_statement()
        return statements
    
    def _generate_create_statement(self) -> str:
        add_backquote_json_schema = self._schema_transformer.add_backquote_into_key_name(json_schema=self.schema)
        
        column_infos = self._schema_transformer.to_glue_schema(json_schema=add_backquote_json_schema)
        columns = ', '.join([f"{x['Name']} {x['Type']}" for x in column_infos])
        
        partitions = ''
        if self.partition_keys:
            partitions = ', '.join([f"`{x['Name']}` {x['Type']}" for x in self.partition_keys])
            partitions = f'PARTITIONED BY ({partitions})'
        
        serialization_properties = ''
        if self.serialization_properties:
            properties = ', '.join([f"""'{key.replace("'", f"{chr(92)}'")}'='{value.replace("'", f"{chr(92)}'")}'""" for key, value in self.serialization_properties.items()])
            serialization_properties = f'WITH SERDEPROPERTIES ({properties})'
            
        table_properties = ''
        if self.table_properties:
            properties = ', '.join([f"{repr(key)}={repr(value)}" for key, value in self.table_properties.items()])
            table_properties = f'TBLPROPERTIES ({properties})'
        
        return (f"""CREATE EXTERNAL TABLE IF NOT EXISTS `{{database}}`.`{{table_name}}` ({columns}) {partitions} """
                f"""ROW FORMAT SERDE '{self.data_format.SERIALIZATION_LIBRARY}' """
                f"""{serialization_properties} """
                f"""STORED AS INPUTFORMAT '{self.data_format.INPUT_FORMAT}' OUTPUTFORMAT '{self.data_format.OUTPUT_FORMAT}' """
                f"""LOCATION '{{location}}' """
                f"""{table_properties};""")
    
    def _generate_insert_statement(self) -> str:
        destination_cols = ', '.join([f'"{x}"' for x in self.schema['properties'].keys()]) 
        select_expression = ', '.join([f"{x.get('expression', x.get('path'))}" for x in self.schema['properties'].values()]) 
        
        return f'''INSERT INTO "{{destination_database}}"."{{destination_table}}" ({destination_cols}) SELECT {select_expression} FROM "{{source_database}}"."{{source_table}}";'''
    
    def _generate_aggregate_statement(self) -> str:
        destination_cols = ', '.join([f'"{x}"' for x in self.schema['properties'].keys()]) 
        select_expression = ', '.join([f"{x.get('expression', x.get('path'))}" for x in self.schema['properties'].values()]) 
        group_by = ', '.join([f"{x.get('expression', x.get('path'))}" for x in self.schema['properties'].values() if x.get('measure', False) is False]) 
        return f'''INSERT INTO "{{destination_database}}"."{{destination_table}}" ({destination_cols}) SELECT {select_expression} FROM "{{source_database}}"."{{source_table}}" WHERE __execution_name__ = '{{execution_name}}' GROUP BY {group_by};'''

    def _generate_drop_statement(self) -> str:
        return "DROP TABLE IF EXISTS `{database}`.`{table_name}`"

