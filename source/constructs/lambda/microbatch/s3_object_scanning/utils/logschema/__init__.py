# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import copy
import collections
from utils.aws.glue.schema import Schema, DataType


class JsonSchemaToGlueSchema:
    
    def __init__(self):
        self._schema = Schema()
        self._type_to_func_mapping = {
            'boolean': self.default,
            'binary': self.default,
            'big_int': self.default,
            'double': self.default,
            'number': self.default,
            'float': self.default,
            'integer': self.default,
            'small_int': self.default,
            'tiny_int': self.default,
            'date': self.default,
            'timestamp': self.default,
            'string': self.default,
            'array': self.array,
            'map': self.map,
            'object': self.object
        }
        
    def transform_json_to_glue_schema(self, name: str, property: dict) -> dict:
        if property.get('type') is None:
            property['type'] = 'string'
        
        if property['type'] not in self._type_to_func_mapping:
            raise KeyError(f'Do not supported data type: {property["type"]}, supported data type: {self._type_to_func_mapping.keys()}')

        return {'name': name, 'type': self._type_to_func_mapping[property['type']](property=property)}
    
    def properties(self, properties: dict) -> list:
        objects = []
        for name, property in properties.items():
            objects.append(self.transform_json_to_glue_schema(name, property))
        return objects
    
    def object(self, property: dict) -> DataType:
        return self._schema.struct(self.properties(properties=property['properties']))
    
    def default(self, property: dict) -> DataType:
        return getattr(self._schema, property['type'])()
    
    def map(self, property: dict) -> DataType:
        return self._schema.map(DataType(input_string=property['properties']['key']['type']), DataType(input_string=property['properties']['value']['type']))
    
    def array(self, property: dict) -> DataType:
        return self._schema.array(self._type_to_func_mapping[property['items']['type']](property=property['items']))

    def remove_partition(self, json_schema: dict) -> dict:
        partition_keys = []
        for name, property in json_schema['properties'].items():
            if property.get('partition') is True:
                partition_keys.append(name)
                
        for partition_key in partition_keys:
            json_schema['properties'].pop(partition_key)
        return json_schema
    
    def _sorted_partition_key(self, partitions: dict):
        sorted_properties = collections.OrderedDict()
        pk_event_hour = None
        pk_execution_name = None
        if 'event_hour' in partitions:
            pk_event_hour = partitions['event_hour']
            partitions.pop('event_hour')
        
        if '__execution_name__' in partitions:
            pk_execution_name = partitions['__execution_name__']
            partitions.pop('__execution_name__')
            
        if pk_event_hour:
            sorted_properties['event_hour'] = pk_event_hour
        
        for key, value in partitions.items():
            sorted_properties[key] = value
        
        if pk_execution_name:
            sorted_properties['__execution_name__'] = pk_execution_name

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
        
        for name, property in json_schema['properties'].items():
            if property.get('partition') is True:
                partition_keys[name] = property
            elif property['type'] == 'object':
                object_type_schema.append(property)
                
        for schema in object_type_schema:
            child_partition_key = self._find_partition_key(json_schema=schema)
            partition_keys.update(child_partition_key)

        partition_keys = self._sorted_partition_key(partitions=partition_keys)

        return partition_keys

    def add_path(self, json_schema: dict) -> dict:
        parent_path = json_schema.get('path')
        
        for name, property in json_schema['properties'].items():
            if 'path' in property:
                continue
            
            property['path'] = f'{parent_path}."{name}"' if parent_path else f'"{name}"'
            if property['type'] == 'object':
                json_schema['properties'][name] = self.add_path(json_schema=property)
        return json_schema
    
    def convert_time_type_to_string(self, json_schema: dict) -> dict:
        new_json_schema = copy.deepcopy(json_schema)
        
        if json_schema['type'] == 'object':
            for name, property in json_schema['properties'].items():
                if not property.get('type'):
                    property['type'] = 'string'
                    
                if property['type'] in ('object', 'map', 'array'):
                    new_json_schema['properties'][name] = self.convert_time_type_to_string(json_schema=new_json_schema['properties'][name])
                elif property['type'] == 'timestamp':
                    new_json_schema['properties'][name]['type'] = 'string'
        elif json_schema['type'] == 'array':
            new_json_schema['items'] = self.convert_time_type_to_string(json_schema=new_json_schema['items'])

        return new_json_schema
    
    def add_backquote_into_key_name(self, json_schema: dict) -> dict:
        new_json_schema = copy.deepcopy(json_schema)
        
        if json_schema['type'] == 'object':
            for name, property in json_schema['properties'].items():
                if not property.get('type'):
                    property['type'] = 'string'
                    
                if property['type'] in ('object', 'map', 'array'):
                    new_json_schema['properties'][f'`{name}`'] = self.add_backquote_into_key_name(json_schema=new_json_schema['properties'][name])
                else:
                    new_json_schema['properties'][f'`{name}`'] = new_json_schema['properties'][name]
                new_json_schema['properties'].pop(name)
        elif json_schema['type'] == 'array':
            new_json_schema['items'] = self.add_backquote_into_key_name(json_schema=new_json_schema['items'])

        return new_json_schema
    
    def extract_partition_keys(self, json_schema: dict) -> dict:
        return {'type': 'object', 'properties': self._find_partition_key(json_schema=json_schema)}

    def extract_partition_indexes(self, json_schema: dict) -> list[dict]:
        partition_indexes = []
        default_partition_keys = []
        for key, value in self._find_partition_key(json_schema=json_schema).items():
            if key == '__execution_name__':
                partition_indexes.append({'IndexName': 'IDX_EXECUTION_NAME', 'Keys': ['__execution_name__']})
                continue
            if len(default_partition_keys) <= 2:
                default_partition_keys.append(key)
        if default_partition_keys:
            partition_indexes.append({'IndexName': 'IDX_PARTITIONS', 'Keys': default_partition_keys})

        return partition_indexes
    
    def extract_partition_info(self, json_schema: dict) -> dict:
        partition_info = collections.OrderedDict()
        partitions = self._find_partition_key(json_schema=json_schema)
        
        for key, value in partitions.items():
            if key == 'event_hour':
                partition_info[key] =  {'type': 'time', 'from': '%Y%m%d%H', 'to': '%Y%m%d00'}
            elif key == '__execution_name__':
                partition_info[key] =  {'type': 'default', 'value': '00000000-0000-0000-0000-000000000000'}
            else:
                partition_info[key] = {'type': 'retain'}
        return partition_info
    
    def to_glue_schema(self, json_schema: dict) -> list[dict]:
        structure = []
        for info in self.properties(properties=json_schema['properties']):
            structure.append({"Name": info['name'], "Type": info['type'].input_string,})
        return structure

