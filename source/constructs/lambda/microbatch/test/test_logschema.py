# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import os
import sys
import json
import collections
import pytest
from test.mock import mock_s3_context, mock_ddb_context, mock_glue_context, mock_sqs_context, mock_iam_context, mock_scheduler_context, default_environment_variables


sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


class TestJsonSchemaToGlueSchema:
    def test_transform_json_to_glue_schema(self):
        from utils.logschema import JsonSchemaToGlueSchema
        
        schema_transformer = JsonSchemaToGlueSchema()
        
        name = 'data_type_is_null'
        property = {}
        glue_schema = schema_transformer.transform_json_to_glue_schema(name=name, property=property)
        assert glue_schema['name'] == name
        assert glue_schema['type'].input_string == 'string'
        
        name = 'data_type_is_number'
        property = {'type': 'number'}
        glue_schema = schema_transformer.transform_json_to_glue_schema(name=name, property=property)
        assert glue_schema['name'] == name
        assert glue_schema['type'].input_string == 'double'
        
        name = 'data_type_is_bigint'
        property = {'type': 'big_int'}
        glue_schema = schema_transformer.transform_json_to_glue_schema(name=name, property=property)
        assert glue_schema['name'] == name
        assert glue_schema['type'].input_string == 'bigint'
        
        name = 'data_type_is_smallint'
        property = {'type': 'small_int'}
        glue_schema = schema_transformer.transform_json_to_glue_schema(name=name, property=property)
        assert glue_schema['name'] == name
        assert glue_schema['type'].input_string == 'smallint'
        
        name = 'data_type_is_tinyint'
        property = {'type': 'tiny_int'}
        glue_schema = schema_transformer.transform_json_to_glue_schema(name=name, property=property)
        assert glue_schema['name'] == name
        assert glue_schema['type'].input_string == 'tinyint'
        
        name = 'data_type_is_integer'
        property = {'type': 'integer'}
        glue_schema = schema_transformer.transform_json_to_glue_schema(name=name, property=property)
        assert glue_schema['name'] == name
        assert glue_schema['type'].input_string == 'int'
        
        for data_type in ('boolean', 'binary', 'double', 'float', 'date', 'timestamp', 'string'):
            name = f'data_type_is_{data_type}'
            property = {'type': data_type}
            glue_schema = schema_transformer.transform_json_to_glue_schema(name=name, property=property)
            assert glue_schema['name'] == name
            assert glue_schema['type'].input_string == data_type
        
        name = 'do_not_supported_data_type'
        property = {'type': 'decimal'}
        with pytest.raises(KeyError):
            glue_schema = schema_transformer.transform_json_to_glue_schema(name=name, property=property)
        
        name = 'map'
        property = {'type': 'map', 'properties': {'key': {'type': 'string'}, 'value': {'type': 'integer'}}}
        glue_schema = schema_transformer.transform_json_to_glue_schema(name=name, property=property)
        assert glue_schema['name'] == name
        assert glue_schema['type'].input_string == "map<string,integer>"
        
        name = 'object'
        property = {'type': 'object', 'properties': {'host': {'type': 'string'}, 'clientIp': {'type': 'string'}}}
        glue_schema = schema_transformer.transform_json_to_glue_schema(name=name, property=property)
        assert glue_schema['name'] == name
        assert glue_schema['type'].input_string == "struct<host:string,clientIp:string>"
        
        name = 'array'
        property = {'type': 'array', 'items': {'type': 'string'}}
        glue_schema = schema_transformer.transform_json_to_glue_schema(name=name, property=property)
        assert glue_schema['name'] == name
        assert glue_schema['type'].input_string == 'array<string>'
        
        name = 'object_in_array'
        property = {'type': 'array', 'items': {'type': 'object', 'properties': {'host': {'type': 'string'}, 'clientIp': {'type': 'string'}}}}
        glue_schema = schema_transformer.transform_json_to_glue_schema(name=name, property=property)
        assert glue_schema['name'] == name
        assert glue_schema['type'].input_string == 'array<struct<host:string,clientIp:string>>'

        name = 'map_in_array'
        property = {'type': 'array', 'items': {'type': 'map', 'properties': {'key': {'type': 'string'}, 'value': {'type': 'string'}}}}
        glue_schema = schema_transformer.transform_json_to_glue_schema(name=name, property=property)
        assert glue_schema['name'] == name
        assert glue_schema['type'].input_string == "array<map<string,string>>"
    
        name = 'multi_dimension_array_2'
        property = {'type': 'array', 'items': {'type': 'array', 'items': {'type': 'string'}}}
        glue_schema = schema_transformer.transform_json_to_glue_schema(name=name, property=property)
        assert glue_schema['name'] == name
        assert glue_schema['type'].input_string == "array<array<string>>"
        
        name = 'multi_dimension_array_3'
        property = {'type': 'array', 'items': {'type': 'array', 'items': {'type': 'array', 'items': {'type': 'string'}}}}
        glue_schema = schema_transformer.transform_json_to_glue_schema(name=name, property=property)
        assert glue_schema['name'] == name
        assert glue_schema['type'].input_string == "array<array<array<string>>>"
    
    def test_properties(self,):
        from utils.logschema import JsonSchemaToGlueSchema
        
        schema_transformer = JsonSchemaToGlueSchema()
        
        properties = {}
        glue_schema = schema_transformer.properties(properties=properties)
        assert glue_schema == []
        
        properties = collections.OrderedDict()
        properties['host'] = {'type': 'string'}
        properties['clientIp'] = {'type': 'string'}
        glue_schema = schema_transformer.properties(properties=properties)
        assert len(properties) == 2
        assert glue_schema[0]['name'] == 'host'
        assert glue_schema[0]['type'].input_string == 'string'
        assert glue_schema[1]['name'] == 'clientIp'
        assert glue_schema[1]['type'].input_string == 'string'
    
    def test_object(self,):
        from utils.aws.glue.schema import DataType
        from utils.logschema import JsonSchemaToGlueSchema
        
        schema_transformer = JsonSchemaToGlueSchema()
        
        property = {'type': 'object', 'properties': {'host': {'type': 'string'}, 'clientIp': {'type': 'string'}}}
        glue_schema = schema_transformer.object(property=property)
        assert isinstance(glue_schema, DataType) == True
        assert glue_schema.input_string == "struct<host:string,clientIp:string>"
        
        property = {'type': 'object', 'properties': {'host': {'type': 'string'}, 'header': {'type': 'array', 'items': {'type': 'object', 'properties': {'Host': {'type': 'string'}, 'Content-Type': {'type': 'string'}}}}}}
        glue_schema = schema_transformer.object(property=property)
        assert isinstance(glue_schema, DataType) == True
        assert glue_schema.input_string == "struct<host:string,header:array<struct<Host:string,Content-Type:string>>>"
    
    def test_default(self,):
        from utils.aws.glue.schema import DataType
        from utils.logschema import JsonSchemaToGlueSchema
        
        schema_transformer = JsonSchemaToGlueSchema()
        
        name = 'data_type_is_number'
        property = {'type': 'number'}
        glue_schema = schema_transformer.default(property=property)
        assert isinstance(glue_schema, DataType) == True
        assert glue_schema.input_string == 'double'
        
        name = 'data_type_is_bigint'
        property = {'type': 'big_int'}
        glue_schema = schema_transformer.default(property=property)
        assert isinstance(glue_schema, DataType) == True
        assert glue_schema.input_string == 'bigint'
        
        name = 'data_type_is_smallint'
        property = {'type': 'small_int'}
        glue_schema = schema_transformer.default(property=property)
        assert isinstance(glue_schema, DataType) == True
        assert glue_schema.input_string == 'smallint'
        
        name = 'data_type_is_tinyint'
        property = {'type': 'tiny_int'}
        glue_schema = schema_transformer.default(property=property)
        assert isinstance(glue_schema, DataType) == True
        assert glue_schema.input_string == 'tinyint'
        
        name = 'data_type_is_integer'
        property = {'type': 'integer'}
        glue_schema = schema_transformer.default(property=property)
        assert isinstance(glue_schema, DataType) == True
        assert glue_schema.input_string == 'int'
        
        for data_type in ('boolean', 'binary', 'double', 'float', 'date', 'timestamp', 'string'):
            name = f'data_type_is_{data_type}'
            property = {'type': data_type}
            glue_schema = schema_transformer.default(property=property)
            assert isinstance(glue_schema, DataType) == True
            assert glue_schema.input_string == data_type
    
    def test_map(self,):
        from utils.aws.glue.schema import DataType
        from utils.logschema import JsonSchemaToGlueSchema
        
        schema_transformer = JsonSchemaToGlueSchema()
        
        property = {'type': 'map', 'properties': {'key': {'type': 'string'}, 'value': {'type': 'integer'}}}
        glue_schema = schema_transformer.map(property=property)
        assert isinstance(glue_schema, DataType) == True
        assert glue_schema.input_string == "map<string,integer>"
    
    def test_array(self,):
        from utils.aws.glue.schema import DataType
        from utils.logschema import JsonSchemaToGlueSchema
        
        schema_transformer = JsonSchemaToGlueSchema()
        
        # array
        property = {'type': 'array', 'items': {'type': 'string'}}
        glue_schema = schema_transformer.array(property=property)
        assert isinstance(glue_schema, DataType) == True
        assert glue_schema.input_string == 'array<string>'
        
        # object in array
        property = {'type': 'array', 'items': {'type': 'object', 'properties': {'host': {'type': 'string'}, 'clientIp': {'type': 'string'}}}}
        glue_schema = schema_transformer.array(property=property)
        assert isinstance(glue_schema, DataType) == True
        assert glue_schema.input_string == 'array<struct<host:string,clientIp:string>>'

        # map in array
        property = {'type': 'array', 'items': {'type': 'map', 'properties': {'key': {'type': 'string'}, 'value': {'type': 'string'}}}}
        glue_schema = schema_transformer.array(property=property)
        assert isinstance(glue_schema, DataType) == True
        assert glue_schema.input_string == "array<map<string,string>>"
    
        # multi dimension array
        property = {'type': 'array', 'items': {'type': 'array', 'items': {'type': 'string'}}}
        glue_schema = schema_transformer.array(property=property)
        assert isinstance(glue_schema, DataType) == True
        assert glue_schema.input_string == "array<array<string>>"
        
        # multi dimension array
        property = {'type': 'array', 'items': {'type': 'array', 'items': {'type': 'array', 'items': {'type': 'string'}}}}
        glue_schema = schema_transformer.array(property=property)
        assert isinstance(glue_schema, DataType) == True
        assert glue_schema.input_string == "array<array<array<string>>>"
    
    def test_remove_partition(self,):
        from utils.logschema import JsonSchemaToGlueSchema
        
        schema_transformer = JsonSchemaToGlueSchema()
        
        # no partition key in json schema
        json_schema = {'type': 'object', 'properties': collections.OrderedDict()}
        json_schema['properties']['time'] = {'type': 'timestamp', 'timeKey': True, 'format': '%Y-%m-%dT%H:%M:%SZ'}
        json_schema['properties']['host'] = {'type': 'string'}
        new_json_schema = schema_transformer.remove_partition(json_schema=json_schema)
        assert new_json_schema == {'type': 'object', 'properties': collections.OrderedDict([('time', {'type': 'timestamp', 'timeKey': True, 'format': '%Y-%m-%dT%H:%M:%SZ'}), ('host', {'type': 'string'})])}
        
        json_schema = {'type': 'object', 'properties': collections.OrderedDict()}
        json_schema['properties']['time'] = {'type': 'timestamp', 'timeKey': True, 'format': '%Y-%m-%dT%H:%M:%SZ'}
        json_schema['properties']['host'] = {'type': 'string', 'partition': True}
        new_json_schema = schema_transformer.remove_partition(json_schema=json_schema)
        assert new_json_schema == {'type': 'object', 'properties': collections.OrderedDict([('time', {'type': 'timestamp', 'timeKey': True, 'format': '%Y-%m-%dT%H:%M:%SZ'})])}
        
        json_schema = {'type': 'object', 'properties': collections.OrderedDict()}
        json_schema['properties']['time'] = {'type': 'timestamp', 'timeKey': True, 'format': '%Y-%m-%dT%H:%M:%SZ'}
        json_schema['properties']['host'] = {'type': 'string', 'partition': True}
        json_schema['properties']['context'] = {'type': 'array', 'items': {
            'type': 'object',
            'properties': {
                'host': {'type': 'string', 'partition': True}, 
                'processTime': {'type': 'timestamp', 'timeKey': True, 'format': '%Y-%m-%dT%H:%M:%SZ'}
                }
            }
        }
        json_schema['properties']['processInfo'] = {'type': 'object', 'properties': {
            'hostname': {'type': 'string', 'partition': True}, 
            'processTime': {'type': 'timestamp', 'timeKey': True, 'format': '%Y-%m-%d %H:%M:%S'}
            }
        }
        new_json_schema = schema_transformer.remove_partition(json_schema=json_schema)
        assert new_json_schema == {'type': 'object', 'properties': collections.OrderedDict([('time', {'type': 'timestamp', 'timeKey': True, 'format': '%Y-%m-%dT%H:%M:%SZ'}), ('context', {'type': 'array', 'items': {'type': 'object', 'properties': {'host': {'type': 'string', 'partition': True}, 'processTime': {'type': 'timestamp', 'timeKey': True, 'format': '%Y-%m-%dT%H:%M:%SZ'}}}}), ('processInfo', {'type': 'object', 'properties': {'hostname': {'type': 'string', 'partition': True}, 'processTime': {'type': 'timestamp', 'timeKey': True, 'format': '%Y-%m-%d %H:%M:%S'}}})])}
    
    def test_sorted_partition_key(self,):
        from utils.logschema import JsonSchemaToGlueSchema
        
        schema_transformer = JsonSchemaToGlueSchema()
        
        partitions = {}
        sorted_partitions = schema_transformer._sorted_partition_key(partitions=partitions)
        assert sorted_partitions == {}
        
        partitions = {'host': {'type': 'string'}, '__execution_name__': {'type': 'string'}, 'event_hour': {'type': 'string'}}
        sorted_partitions = schema_transformer._sorted_partition_key(partitions=partitions)
        assert sorted_partitions == collections.OrderedDict([('event_hour', {'type': 'string'}), ('host', {'type': 'string'}), ('__execution_name__', {'type': 'string'})])
        
        partitions = {'host': {'type': 'string'}}
        sorted_partitions = schema_transformer._sorted_partition_key(partitions=partitions)
        assert sorted_partitions == collections.OrderedDict([('host', {'type': 'string'})])
        
        partitions = {'host': {'type': 'string'}, 'event_hour': {'type': 'string'}}
        sorted_partitions = schema_transformer._sorted_partition_key(partitions=partitions)
        assert sorted_partitions == collections.OrderedDict([('event_hour', {'type': 'string'}), ('host', {'type': 'string'})])
        
        partitions = {'__execution_name__': {'type': 'string'}, 'host': {'type': 'string'}}
        sorted_partitions = schema_transformer._sorted_partition_key(partitions=partitions)
        assert sorted_partitions == collections.OrderedDict([('host', {'type': 'string'}), ('__execution_name__', {'type': 'string'})])
        
        partitions = {'host': {'type': 'string'}, '__execution_name__': {'type': 'string'}, 'groupId': {'type': 'string'}, 'event_hour': {'type': 'string'}}
        sorted_partitions = schema_transformer._sorted_partition_key(partitions=partitions)
        assert sorted_partitions == collections.OrderedDict([('event_hour', {'type': 'string'}), ('host', {'type': 'string'}), ('groupId', {'type': 'string'}), ('__execution_name__', {'type': 'string'})])
        
    def test_find_partition_key(self,):
        from utils.logschema import JsonSchemaToGlueSchema
        
        schema_transformer = JsonSchemaToGlueSchema()
        
        # no partition key in json schema
        json_schema = {'type': 'object', 'properties': collections.OrderedDict()}
        json_schema['properties']['time'] = {'type': 'timestamp', 'timeKey': True, 'format': '%Y-%m-%dT%H:%M:%SZ'}
        json_schema['properties']['host'] = {'type': 'string'}
        new_json_schema = schema_transformer.add_path(json_schema=json_schema)
        new_json_schema = schema_transformer._find_partition_key(json_schema=json_schema)
        assert new_json_schema =={}
        
        json_schema = {'type': 'object','properties': collections.OrderedDict()}
        json_schema['properties']['time'] = {'type': 'timestamp', 'timeKey': True, 'format': '%Y-%m-%dT%H:%M:%SZ'}
        json_schema['properties']['host'] = {'type': 'string', 'partition': True}
        new_json_schema = schema_transformer.add_path(json_schema=json_schema)
        new_json_schema = schema_transformer._find_partition_key(json_schema=json_schema)
        assert new_json_schema == {'host': {'type': 'string', 'partition': True, 'path': '"host"'}}
        
        json_schema = {'type': 'object',  'properties': collections.OrderedDict()}
        json_schema['properties']['time'] = {'type': 'timestamp', 'timeKey': True, 'format': '%Y-%m-%dT%H:%M:%SZ'}
        json_schema['properties']['host'] = {'type': 'string', 'partition': True}
        json_schema['properties']['context'] = {'type': 'array', 'items': {
            'type': 'object',
            'properties': {
                'service': {'type': 'string', 'partition': True}, 
                'processTime': {'type': 'timestamp', 'timeKey': True, 'format': '%Y-%m-%dT%H:%M:%SZ'}
                }
            }
        }
        json_schema['properties']['processInfo'] = {'type': 'object', 'properties': {
            'hostname': {'type': 'string', 'partition': True}, 
            'processTime': {'type': 'timestamp', 'timeKey': True, 'format': '%Y-%m-%d %H:%M:%S'}
            }
        }
        new_json_schema = schema_transformer.add_path(json_schema=json_schema)
        new_json_schema = schema_transformer._find_partition_key(json_schema=json_schema)
        assert new_json_schema == {'hostname': {'type': 'string', 'partition': True, 'path': '"processInfo"."hostname"'}, 'host': {'type': 'string', 'partition': True, 'path': '"host"'}}
        
    def test_add_path(self,):
        from utils.logschema import JsonSchemaToGlueSchema
        
        schema_transformer = JsonSchemaToGlueSchema()
        
        json_schema = {'type': 'object', 'properties': {}}
        json_schema['properties']['host'] = {'type': 'string', 'partition': True}
        json_schema['properties']['context'] = {'type': 'array', 'items': {
            'type': 'object',
            'properties': {
                'host': {'type': 'string', 'partition': True}, 
                'processTime': {'type': 'timestamp', 'timeKey': True, 'format': '%Y-%m-%dT%H:%M:%SZ'}
                }
            }
        }
        json_schema['properties']['processInfo'] = {'type': 'object', 'properties': {
            'hostname': {'type': 'string', 'partition': True, 'path': '"test"."hostname"'}, 
            'processTime': {'type': 'timestamp', 'timeKey': True, 'format': '%Y-%m-%d %H:%M:%S'},
            'integration': {'type': 'object', 'properties': {'duration': {'type': 'double'}, 'status': {'type': 'integer'}}}
            }
        }
        new_json_schema = schema_transformer.add_path(json_schema=json_schema)
        assert new_json_schema == {'type': 'object', 'properties': {'host': {'type': 'string', 'partition': True, 'path': '"host"'}, 'context': {'type': 'array', 'items': {'type': 'object', 'properties': {'host': {'type': 'string', 'partition': True}, 'processTime': {'type': 'timestamp', 'timeKey': True, 'format': '%Y-%m-%dT%H:%M:%SZ'}}}, 'path': '"context"'}, 'processInfo': {'type': 'object', 'properties': {'hostname': {'type': 'string', 'partition': True, 'path': '"test"."hostname"'}, 'processTime': {'type': 'timestamp', 'timeKey': True, 'format': '%Y-%m-%d %H:%M:%S', 'path': '"processInfo"."processTime"'}, 'integration': {'type': 'object', 'properties': {'duration': {'type': 'double', 'path': '"processInfo"."integration"."duration"'}, 'status': {'type': 'integer', 'path': '"processInfo"."integration"."status"'}}, 'path': '"processInfo"."integration"'}}, 'path': '"processInfo"'}}}
    
    def test_convert_time_type_to_string(self,):
        from utils.logschema import JsonSchemaToGlueSchema
        
        schema_transformer = JsonSchemaToGlueSchema()
        json_schema = {'type': 'object', 'properties': {}}
        json_schema['properties']['host'] = {'type': 'string', 'partition': True}
        json_schema['properties']['context'] = {'type': 'array', 'items': {
            'type': 'object',
            'properties': {
                'host': {'type': 'string', 'partition': True}, 
                'processTime': {'type': 'timestamp', 'timeKey': True, 'format': '%Y-%m-%dT%H:%M:%SZ'}
                }
            }
        }
        json_schema['properties']['processInfo'] = {'type': 'object', 'properties': {
            'hostname': {'type': 'string', 'partition': True, 'path': '"test"."hostname"'}, 
            'processTime': {'type': 'timestamp', 'timeKey': True, 'format': '%Y-%m-%d %H:%M:%S'},
            'integration': {'type': 'object', 'properties': {'duration': {'type': 'double'}, 'status': {'type': 'integer'}}}
            }
        }
        new_json_schema = schema_transformer.convert_time_type_to_string(json_schema=json_schema)
        assert json_schema == {
            'type': 'object', 
            'properties': {
                'host': {
                    'type': 'string', 
                    'partition': True
                },
                'context': {
                    'type': 'array', 
                    'items': {
                        'type': 'object', 
                        'properties': {
                            'host': {
                                'type': 'string', 
                                'partition': True
                            }, 
                            'processTime': {
                                'type': 'timestamp', 
                                'timeKey': True, 
                                'format': '%Y-%m-%dT%H:%M:%SZ'
                            }
                        }
                    }
                }, 
                'processInfo': {
                    'type': 'object', 
                    'properties': {
                        'hostname': {
                            'type': 'string', 
                            'partition': True, 
                            'path': '"test"."hostname"'
                        }, 
                        'processTime': {
                            'type': 'timestamp', 
                            'timeKey': True, 
                            'format': '%Y-%m-%d %H:%M:%S'
                        }, 
                        'integration': {
                            'type': 'object', 
                            'properties': {
                                'duration': {'type': 'double'}, 
                                'status': {'type': 'integer'}
                            }
                        }
                    }
                }
            }
        }
        assert new_json_schema == {'type': 'object', 'properties': {'host': {'type': 'string', 'partition': True}, 'context': {'type': 'array', 'items': {'type': 'object', 'properties': {'host': {'type': 'string', 'partition': True}, 'processTime': {'type': 'string', 'timeKey': True, 'format': '%Y-%m-%dT%H:%M:%SZ'}}}}, 'processInfo': {'type': 'object', 'properties': {'hostname': {'type': 'string', 'partition': True, 'path': '"test"."hostname"'}, 'processTime': {'type': 'string', 'timeKey': True, 'format': '%Y-%m-%d %H:%M:%S'}, 'integration': {'type': 'object', 'properties': {'duration': {'type': 'double'}, 'status': {'type': 'integer'}}}}}}}
    
    def test_add_backquote_into_key_name(self,):
        from utils.logschema import JsonSchemaToGlueSchema
        
        schema_transformer = JsonSchemaToGlueSchema()
        json_schema = {'type': 'object', 'properties': {}}
        json_schema['properties']['host'] = {'type': 'string', 'partition': True}
        json_schema['properties']['context'] = {'type': 'array', 'items': {
            'type': 'object',
            'properties': {
                'host': {'type': 'string', 'partition': True}, 
                'processTime': {'type': 'timestamp', 'timeKey': True, 'format': '%Y-%m-%dT%H:%M:%SZ'}
                }
            }
        }
        json_schema['properties']['processInfo'] = {'type': 'object', 'properties': {
            'hostname': {'type': 'string', 'partition': True, 'path': '"test"."hostname"'}, 
            'processTime': {'type': 'timestamp', 'timeKey': True, 'format': '%Y-%m-%d %H:%M:%S'},
            'integration': {'type': 'object', 'properties': {'duration': {'type': 'double'}, 'status': {'type': 'integer'}}}
            }
        }
        new_json_schema = schema_transformer.add_backquote_into_key_name(json_schema=json_schema)
        assert json_schema == {'type': 'object', 'properties': {'host': {'type': 'string', 'partition': True}, 'context': {'type': 'array', 'items': {'type': 'object', 'properties': {'host': {'type': 'string', 'partition': True}, 'processTime': {'type': 'timestamp', 'timeKey': True, 'format': '%Y-%m-%dT%H:%M:%SZ'}}}}, 'processInfo': {'type': 'object', 'properties': {'hostname': {'type': 'string', 'partition': True, 'path': '"test"."hostname"'}, 'processTime': {'type': 'timestamp', 'timeKey': True, 'format': '%Y-%m-%d %H:%M:%S'}, 'integration': {'type': 'object', 'properties': {'duration': {'type': 'double'}, 'status': {'type': 'integer'}}}}}}}
        assert new_json_schema == {'type': 'object', 'properties': {'`host`': {'type': 'string', 'partition': True}, '`context`': {'type': 'array', 'items': {'type': 'object', 'properties': {'`host`': {'type': 'string', 'partition': True}, '`processTime`': {'type': 'timestamp', 'timeKey': True, 'format': '%Y-%m-%dT%H:%M:%SZ'}}}}, '`processInfo`': {'type': 'object', 'properties': {'`hostname`': {'type': 'string', 'partition': True, 'path': '"test"."hostname"'}, '`processTime`': {'type': 'timestamp', 'timeKey': True, 'format': '%Y-%m-%d %H:%M:%S'}, '`integration`': {'type': 'object', 'properties': {'`duration`': {'type': 'double'}, '`status`': {'type': 'integer'}}}}}}}
        
    def test_extract_partition_keys(self,):
        from utils.logschema import JsonSchemaToGlueSchema
        
        schema_transformer = JsonSchemaToGlueSchema()
        
        json_schema = {'type': 'object', 'properties': {}}
        json_schema['properties']['timestamp'] = {'type': 'timestamp', 'timeKey': True, 'format': '%Y-%m-%dT%H:%M:%SZ'}
        json_schema['properties']['host'] = {'type': 'string', 'partition': True}
        json_schema['properties']['context'] = {'type': 'array', 'items': {
            'type': 'object',
            'properties': {
                'service': {'type': 'string', 'partition': True}, 
                'processTime': {'type': 'timestamp', 'timeKey': True, 'format': '%Y-%m-%dT%H:%M:%SZ'}
                }
            }
        }
        json_schema['properties']['processInfo'] = {'type': 'object', 'properties': {
            'hostname': {'type': 'string', 'partition': True}, 
            'processTime': {'type': 'timestamp', 'timeKey': True, 'format': '%Y-%m-%d %H:%M:%S'},
            'integration': {'type': 'object', 'properties': {'duration': {'type': 'double'}, 'status': {'type': 'integer'}}}
            }
        }
        new_json_schema = schema_transformer.extract_partition_keys(json_schema=json_schema)
        assert new_json_schema == {'type': 'object', 'properties': collections.OrderedDict([('host', {'type': 'string', 'partition': True}), ('hostname', {'type': 'string', 'partition': True})])}
        
        json_schema = {'type': 'object', 'properties': {}}
        json_schema['properties']['context'] = {'type': 'array', 'items': {
            'type': 'object',
            'properties': {
                'host': {'type': 'string', 'partition': True}, 
                'processTime': {'type': 'timestamp', 'timeKey': True, 'format': '%Y-%m-%dT%H:%M:%SZ'}
                }
            }
        }
        json_schema['properties']['processInfo'] = {'type': 'object', 'properties': {
            'hostname': {'type': 'string', 'partition': True}, 
            'processTime': {'type': 'timestamp', 'timeKey': True, 'format': '%Y-%m-%d %H:%M:%S'},
            'integration': {'type': 'object', 'properties': {'duration': {'type': 'double'}, 'status': {'type': 'integer'}}}
            }
        }
        new_json_schema = schema_transformer.extract_partition_keys(json_schema=json_schema)
        assert new_json_schema == {'type': 'object', 'properties': collections.OrderedDict([('hostname', {'type': 'string', 'partition': True})])}
    
    def test_extract_partition_indexes(self,):
        from utils.logschema import JsonSchemaToGlueSchema
        
        schema_transformer = JsonSchemaToGlueSchema()
        
        json_schema = {'type': 'object', 'properties': {}}
        json_schema['properties']['context'] = {'type': 'array', 'items': {
            'type': 'object',
            'properties': {
                'host': {'type': 'string', 'partition': True}, 
                'processTime': {'type': 'timestamp', 'timeKey': True, 'format': '%Y-%m-%dT%H:%M:%SZ'}
                }
            }
        }
        json_schema['properties']['processInfo'] = {'type': 'object', 'properties': {
            'hostname': {'type': 'string', 'partition': True}, 
            'groupId': {'type': 'string', 'partition': True}, 
            'processTime': {'type': 'timestamp', 'timeKey': True, 'format': '%Y-%m-%d %H:%M:%S'},
            'integration': {'type': 'object', 'properties': {'duration': {'type': 'double'}, 'status': {'type': 'integer'}}}
            }
        }
        json_schema['properties']['targetGroup'] = {'type': 'string', 'partition': True}
        json_schema['properties']['elb'] = {'type': 'string', 'partition': True}
        json_schema['properties']['event_hour'] = {'type': 'string', 'partition': True}
        json_schema['properties']['__execution_name__'] = {'type': 'string', 'partition': True}
        partition_indexes = schema_transformer.extract_partition_indexes(json_schema=json_schema)
        assert partition_indexes == [{'IndexName': 'IDX_EXECUTION_NAME', 'Keys': ['__execution_name__']}, {'IndexName': 'IDX_PARTITIONS', 'Keys': ['event_hour', 'targetGroup', 'elb']}]
        
        json_schema = {'type': 'object', 'properties': {}}
        json_schema['properties']['context'] = {'type': 'array', 'items': {
            'type': 'object',
            'properties': {
                'host': {'type': 'string', 'partition': True}, 
                'processTime': {'type': 'timestamp', 'timeKey': True, 'format': '%Y-%m-%dT%H:%M:%SZ'}
                }
            }
        }
        json_schema['properties']['event_hour'] = {'type': 'string', 'partition': True}
        json_schema['properties']['__execution_name__'] = {'type': 'string', 'partition': True}
        partition_indexes = schema_transformer.extract_partition_indexes(json_schema=json_schema)
        assert partition_indexes == [{'IndexName': 'IDX_EXECUTION_NAME', 'Keys': ['__execution_name__']}, {'IndexName': 'IDX_PARTITIONS', 'Keys': ['event_hour']}]
    
    def test_extract_partition_info(self):
        from utils.logschema import JsonSchemaToGlueSchema
        
        schema_transformer = JsonSchemaToGlueSchema()
        
        json_schema = {'type': 'object', 'properties': {}}
        json_schema['properties']['context'] = {'type': 'array', 'items': {
            'type': 'object',
            'properties': {
                'host': {'type': 'string', 'partition': True}, 
                'processTime': {'type': 'timestamp', 'timeKey': True, 'format': '%Y-%m-%dT%H:%M:%SZ'}
                }
            }
        }
        json_schema['properties']['processInfo'] = {'type': 'object', 'properties': {
            'hostname': {'type': 'string', 'partition': True}, 
            'groupId': {'type': 'string', 'partition': True}, 
            'processTime': {'type': 'timestamp', 'timeKey': True, 'format': '%Y-%m-%d %H:%M:%S'},
            'integration': {'type': 'object', 'properties': {'duration': {'type': 'double'}, 'status': {'type': 'integer'}}}
            }
        }
        json_schema['properties']['targetGroup'] = {'type': 'string', 'partition': True}
        json_schema['properties']['elb'] = {'type': 'string', 'partition': True}
        json_schema['properties']['event_hour'] = {'type': 'string', 'partition': True}
        json_schema['properties']['__execution_name__'] = {'type': 'string', 'partition': True}
        partition_info = schema_transformer.extract_partition_info(json_schema=json_schema)
        assert partition_info == collections.OrderedDict([('event_hour', {'type': 'time', 'from': '%Y%m%d%H', 'to': '%Y%m%d00'}), ('targetGroup', {'type': 'retain'}), ('elb', {'type': 'retain'}), ('hostname', {'type': 'retain'}), ('groupId', {'type': 'retain'}), ('__execution_name__', {'type': 'default', 'value': '00000000-0000-0000-0000-000000000000'})])
        
        json_schema = {'type': 'object', 'properties': {}}
        json_schema['properties']['context'] = {'type': 'array', 'items': {
            'type': 'object',
            'properties': {
                'host': {'type': 'string', 'partition': True}, 
                'processTime': {'type': 'timestamp', 'timeKey': True, 'format': '%Y-%m-%dT%H:%M:%SZ'}
                }
            }
        }
        json_schema['properties']['event_hour'] = {'type': 'string', 'partition': True}
        json_schema['properties']['__execution_name__'] = {'type': 'string', 'partition': True}
        partition_info = schema_transformer.extract_partition_info(json_schema=json_schema)
        assert partition_info == collections.OrderedDict([('event_hour', {'type': 'time', 'from': '%Y%m%d%H', 'to': '%Y%m%d00'}), ('__execution_name__', {'type': 'default', 'value': '00000000-0000-0000-0000-000000000000'})])
    
    def test_to_glue_schema(self,):
        from utils.logschema import JsonSchemaToGlueSchema
        
        schema_transformer = JsonSchemaToGlueSchema()
        
        json_schema = {'type': 'object', 'properties': {}}
        json_schema['properties']['timestamp'] = {'type': 'timestamp', 'timeKey': True, 'format': '%Y-%m-%dT%H:%M:%SZ'}
        json_schema['properties']['host'] = {'type': 'string', 'partition': True}
        json_schema['properties']['context'] = {'type': 'array', 'items': {
            'type': 'object',
            'properties': {
                'host': {'type': 'string', 'partition': True}, 
                'processTime': {'type': 'timestamp', 'timeKey': True, 'format': '%Y-%m-%dT%H:%M:%SZ'}
                }
            }
        }
        json_schema['properties']['processInfo'] = {'type': 'object', 'properties': {
            'hostname': {'type': 'string', 'partition': True}, 
            'processTime': {'type': 'timestamp', 'timeKey': True, 'format': '%Y-%m-%d %H:%M:%S'},
            'integration': {'type': 'object', 'properties': {'duration': {'type': 'double'}, 'status': {'type': 'integer'}}}
            }
        }
        json_schema = schema_transformer.add_path(json_schema=json_schema)
        partition_schema = schema_transformer.extract_partition_keys(json_schema=json_schema)
        
        json_schema = schema_transformer.remove_partition(json_schema=json_schema)
        
        for key, value in partition_schema['properties'].items():
            json_schema['properties'].pop(key, None)
            json_schema['properties'][key] = value

        glue_schema = schema_transformer.to_glue_schema(json_schema=json_schema)
        assert glue_schema[0]['Name'] == 'timestamp'
        assert glue_schema[0]['Type'] == 'timestamp'
        assert glue_schema[1]['Name'] == 'context'
        assert glue_schema[1]['Type'] == 'array<struct<host:string,processTime:timestamp>>'
        assert glue_schema[2]['Name'] == 'processInfo'
        assert glue_schema[2]['Type'] == 'struct<hostname:string,processTime:timestamp,integration:struct<duration:double,status:int>>'
        assert glue_schema[3]['Name'] == 'host'
        assert glue_schema[3]['Type'] == 'string'
        assert glue_schema[4]['Name'] == 'hostname'
        assert glue_schema[4]['Type'] == 'string'

        json_schema = {'type': 'object', 'properties': {}}
        json_schema['properties']['context'] = {'type': 'array', 'items': {
            'type': 'object',
            'properties': {
                'host': {'type': 'string', 'partition': True}, 
                'processTime': {'type': 'timestamp', 'timeKey': True, 'format': '%Y-%m-%dT%H:%M:%SZ'}
                }
            }
        }
        json_schema['properties']['processInfo'] = {'type': 'object', 'properties': {
            'hostname': {'type': 'string', 'partition': True}, 
            'processTime': {'type': 'timestamp', 'timeKey': True, 'format': '%Y-%m-%d %H:%M:%S'},
            'integration': {'type': 'object', 'properties': {'duration': {'type': 'double'}, 'status': {'type': 'integer'}}}
            }
        }
        json_schema = schema_transformer.add_path(json_schema=json_schema)
        partition_schema = schema_transformer.extract_partition_keys(json_schema=json_schema)
        
        json_schema = schema_transformer.remove_partition(json_schema=json_schema)
        
        for key, value in partition_schema['properties'].items():
            json_schema['properties'].pop(key, None)
            json_schema['properties'][key] = value
            
        glue_schema = schema_transformer.to_glue_schema(json_schema=json_schema)
        assert glue_schema[0]['Name'] == 'context'
        assert glue_schema[0]['Type'] == 'array<struct<host:string,processTime:timestamp>>'
        assert glue_schema[1]['Name'] == 'processInfo'
        assert glue_schema[1]['Type'] == 'struct<hostname:string,processTime:timestamp,integration:struct<duration:double,status:int>>'
        assert glue_schema[2]['Name'] == 'hostname'
        assert glue_schema[2]['Type'] == 'string'


class TestServicesLogSchema:
    
    def test_cloudfront(self,):
        from utils.aws.glue.table import TableMetaData
        from utils.logschema.services import CLOUDFRONT_RAW, CLOUDFRONT_PARQUET, CLOUDFRONT_METRICS
        
        assert isinstance(CLOUDFRONT_RAW, TableMetaData) is True
        assert isinstance(CLOUDFRONT_PARQUET, TableMetaData) is True
        assert isinstance(CLOUDFRONT_METRICS, TableMetaData) is True
        
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
            {'Name': 'ua_category', 'Type': 'string'},
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
        from utils.logschema.services import ALB_RAW, ALB_PARQUET, ALB_METRICS
        
        assert isinstance(ALB_RAW, TableMetaData) is True
        assert isinstance(ALB_PARQUET, TableMetaData) is True
        assert isinstance(ALB_METRICS, TableMetaData) is True
        
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
            {'Name': 'enrichment', 'Type': 'struct<geo_iso_code:string,geo_country:string,geo_city:string,geo_location:string,ua_browser:string,ua_browser_version:string,ua_os:string,ua_os_version:string,ua_device:string,ua_category:string>'}
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
        from utils.logschema.services import WAF_RAW, WAF_PARQUET, WAF_METRICS
        
        assert isinstance(WAF_RAW, TableMetaData) is True
        assert isinstance(WAF_PARQUET, TableMetaData) is True
        assert isinstance(WAF_METRICS, TableMetaData) is True
        
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
    
    def test_cloudtrail(self,):
        from utils.aws.glue.table import TableMetaData
        from utils.logschema.services import CLOUDTRAIL_RAW, CLOUDTRAIL_PARQUET, CLOUDTRAIL_METRICS
        
        assert isinstance(CLOUDTRAIL_RAW, TableMetaData) is True
        assert isinstance(CLOUDTRAIL_PARQUET, TableMetaData) is True
        assert isinstance(CLOUDTRAIL_METRICS, TableMetaData) is True
        
        assert CLOUDTRAIL_RAW.columns == [
            {'Name': 'eventversion', 'Type': 'string'}, 
            {'Name': 'useridentity', 'Type': 'struct<type:string,principalid:string,arn:string,accountid:string,invokedby:string,accesskeyid:string,userName:string,sessioncontext:struct<attributes:struct<mfaauthenticated:string,creationdate:string>,sessionissuer:struct<type:string,principalId:string,arn:string,accountId:string,userName:string>,ec2RoleDelivery:string,webIdFederationData:map<string,string>>>'}, 
            {'Name': 'eventtime', 'Type': 'string'}, 
            {'Name': 'eventsource', 'Type': 'string'}, 
            {'Name': 'eventname', 'Type': 'string'}, 
            {'Name': 'awsregion', 'Type': 'string'}, 
            {'Name': 'sourceipaddress', 'Type': 'string'}, 
            {'Name': 'useragent', 'Type': 'string'}, 
            {'Name': 'errorcode', 'Type': 'string'}, 
            {'Name': 'errormessage', 'Type': 'string'}, 
            {'Name': 'requestparameters', 'Type': 'string'}, 
            {'Name': 'responseelements', 'Type': 'string'}, 
            {'Name': 'additionaleventdata', 'Type': 'string'}, 
            {'Name': 'requestid', 'Type': 'string'}, 
            {'Name': 'eventid', 'Type': 'string'}, 
            {'Name': 'resources', 'Type': 'array<struct<arn:string,accountid:string,type:string>>'}, 
            {'Name': 'eventtype', 'Type': 'string'}, 
            {'Name': 'apiversion', 'Type': 'string'}, 
            {'Name': 'readonly', 'Type': 'string'}, 
            {'Name': 'recipientaccountid', 'Type': 'string'}, 
            {'Name': 'serviceeventdetails', 'Type': 'string'}, 
            {'Name': 'sharedeventid', 'Type': 'string'}, 
            {'Name': 'vpcendpointid', 'Type': 'string'}, 
            {'Name': 'tlsDetails', 'Type': 'struct<tlsVersion:string,cipherSuite:string,clientProvidedHostHeader:string>'}
        ]
        assert CLOUDTRAIL_RAW.partition_keys == []
        assert CLOUDTRAIL_RAW.partition_indexes == []
        assert CLOUDTRAIL_RAW.partition_info == {}
        assert json.dumps(CLOUDTRAIL_RAW.statements.create) == json.dumps("""CREATE EXTERNAL TABLE IF NOT EXISTS `{database}`.`{table_name}` (`eventversion` string, `useridentity` struct<`type`:string,`principalid`:string,`arn`:string,`accountid`:string,`invokedby`:string,`accesskeyid`:string,`userName`:string,`sessioncontext`:struct<`attributes`:struct<`mfaauthenticated`:string,`creationdate`:string>,`sessionissuer`:struct<`type`:string,`principalId`:string,`arn`:string,`accountId`:string,`userName`:string>,`ec2RoleDelivery`:string,`webIdFederationData`:map<string,string>>>, `eventtime` string, `eventsource` string, `eventname` string, `awsregion` string, `sourceipaddress` string, `useragent` string, `errorcode` string, `errormessage` string, `requestparameters` string, `responseelements` string, `additionaleventdata` string, `requestid` string, `eventid` string, `resources` array<struct<`arn`:string,`accountid`:string,`type`:string>>, `eventtype` string, `apiversion` string, `readonly` string, `recipientaccountid` string, `serviceeventdetails` string, `sharedeventid` string, `vpcendpointid` string, `tlsDetails` struct<`tlsVersion`:string,`cipherSuite`:string,`clientProvidedHostHeader`:string>)  ROW FORMAT SERDE 'org.openx.data.jsonserde.JsonSerDe'  STORED AS INPUTFORMAT 'com.amazon.emr.cloudtrail.CloudTrailInputFormat' OUTPUTFORMAT 'org.apache.hadoop.hive.ql.io.HiveIgnoreKeyTextOutputFormat' LOCATION '{location}' ;""")        
        assert json.dumps(CLOUDTRAIL_RAW.statements.insert) == json.dumps("""INSERT INTO "{destination_database}"."{destination_table}" ("eventversion", "useridentity", "eventtime", "eventsource", "eventname", "awsregion", "sourceipaddress", "useragent", "errorcode", "errormessage", "requestparameters", "responseelements", "additionaleventdata", "requestid", "eventid", "resources", "eventtype", "apiversion", "readonly", "recipientaccountid", "serviceeventdetails", "sharedeventid", "vpcendpointid", "tlsDetails") SELECT "eventversion", "useridentity", "eventtime", "eventsource", "eventname", "awsregion", "sourceipaddress", "useragent", "errorcode", "errormessage", "requestparameters", "responseelements", "additionaleventdata", "requestid", "eventid", "resources", "eventtype", "apiversion", "readonly", "recipientaccountid", "serviceeventdetails", "sharedeventid", "vpcendpointid", "tlsDetails" FROM "{source_database}"."{source_table}";""")
        assert json.dumps(CLOUDTRAIL_RAW.statements.drop) == json.dumps("""DROP TABLE IF EXISTS `{database}`.`{table_name}`""")
        assert json.dumps(CLOUDTRAIL_RAW.statements.aggregate) == json.dumps("""INSERT INTO "{destination_database}"."{destination_table}" ("eventversion", "useridentity", "eventtime", "eventsource", "eventname", "awsregion", "sourceipaddress", "useragent", "errorcode", "errormessage", "requestparameters", "responseelements", "additionaleventdata", "requestid", "eventid", "resources", "eventtype", "apiversion", "readonly", "recipientaccountid", "serviceeventdetails", "sharedeventid", "vpcendpointid", "tlsDetails") SELECT "eventversion", "useridentity", "eventtime", "eventsource", "eventname", "awsregion", "sourceipaddress", "useragent", "errorcode", "errormessage", "requestparameters", "responseelements", "additionaleventdata", "requestid", "eventid", "resources", "eventtype", "apiversion", "readonly", "recipientaccountid", "serviceeventdetails", "sharedeventid", "vpcendpointid", "tlsDetails" FROM "{source_database}"."{source_table}" WHERE __execution_name__ = '{execution_name}' GROUP BY "eventversion", "useridentity", "eventtime", "eventsource", "eventname", "awsregion", "sourceipaddress", "useragent", "errorcode", "errormessage", "requestparameters", "responseelements", "additionaleventdata", "requestid", "eventid", "resources", "eventtype", "apiversion", "readonly", "recipientaccountid", "serviceeventdetails", "sharedeventid", "vpcendpointid", "tlsDetails";""")
        
        assert CLOUDTRAIL_PARQUET.columns == [
            {'Name': 'time', 'Type': 'bigint'}, 
            {'Name': 'timestamp', 'Type': 'timestamp'}, 
            {'Name': 'eventversion', 'Type': 'string'}, 
            {'Name': 'useridentity', 'Type': 'struct<type:string,principalid:string,arn:string,accountid:string,invokedby:string,accesskeyid:string,userName:string,sessioncontext:struct<attributes:struct<mfaauthenticated:string,creationdate:string>,sessionissuer:struct<type:string,principalId:string,arn:string,accountId:string,userName:string>,ec2RoleDelivery:string,webIdFederationData:map<string,string>>>'}, 
            {'Name': 'eventtime', 'Type': 'string'}, 
            {'Name': 'eventsource', 'Type': 'string'}, 
            {'Name': 'eventname', 'Type': 'string'}, 
            {'Name': 'awsregion', 'Type': 'string'}, 
            {'Name': 'sourceipaddress', 'Type': 'string'}, 
            {'Name': 'useragent', 'Type': 'string'}, 
            {'Name': 'errorcode', 'Type': 'string'}, 
            {'Name': 'errormessage', 'Type': 'string'}, 
            {'Name': 'requestparameters', 'Type': 'string'},
            {'Name': 'responseelements', 'Type': 'string'}, 
            {'Name': 'additionaleventdata', 'Type': 'string'}, 
            {'Name': 'requestid', 'Type': 'string'}, 
            {'Name': 'eventid', 'Type': 'string'}, 
            {'Name': 'resources', 'Type': 'array<struct<arn:string,accountid:string,type:string>>'}, 
            {'Name': 'eventtype', 'Type': 'string'}, 
            {'Name': 'apiversion', 'Type': 'string'}, 
            {'Name': 'readonly', 'Type': 'string'}, 
            {'Name': 'recipientaccountid', 'Type': 'string'}, 
            {'Name': 'serviceeventdetails', 'Type': 'string'}, 
            {'Name': 'sharedeventid', 'Type': 'string'}, 
            {'Name': 'vpcendpointid', 'Type': 'string'}, 
            {'Name': 'tlsDetails', 'Type': 'struct<tlsVersion:string,cipherSuite:string,clientProvidedHostHeader:string>'}
        ]
        assert CLOUDTRAIL_PARQUET.partition_keys == [
            {'Name': 'event_hour', 'Type': 'string'}, 
            {'Name': 'account_id', 'Type': 'string'}, 
            {'Name': 'region', 'Type': 'string'}, 
            {'Name': '__execution_name__', 'Type': 'string'}
        ]
        assert CLOUDTRAIL_PARQUET.partition_indexes == [
            {'IndexName': 'IDX_EXECUTION_NAME', 'Keys': ['__execution_name__']}, 
            {'IndexName': 'IDX_PARTITIONS', 'Keys': ['event_hour', 'account_id', 'region']}
        ]
        assert CLOUDTRAIL_PARQUET.partition_info == collections.OrderedDict([('event_hour', {'type': 'time', 'from': '%Y%m%d%H', 'to': '%Y%m%d00'}), ('account_id', {'type': 'retain'}), ('region', {'type': 'retain'}), ('__execution_name__', {'type': 'default', 'value': '00000000-0000-0000-0000-000000000000'})])
        assert json.dumps(CLOUDTRAIL_PARQUET.statements.create) == json.dumps("""CREATE EXTERNAL TABLE IF NOT EXISTS `{database}`.`{table_name}` (`time` bigint, `timestamp` timestamp, `eventversion` string, `useridentity` struct<`type`:string,`principalid`:string,`arn`:string,`accountid`:string,`invokedby`:string,`accesskeyid`:string,`userName`:string,`sessioncontext`:struct<`attributes`:struct<`mfaauthenticated`:string,`creationdate`:string>,`sessionissuer`:struct<`type`:string,`principalId`:string,`arn`:string,`accountId`:string,`userName`:string>,`ec2RoleDelivery`:string,`webIdFederationData`:map<string,string>>>, `eventtime` string, `eventsource` string, `eventname` string, `awsregion` string, `sourceipaddress` string, `useragent` string, `errorcode` string, `errormessage` string, `requestparameters` string, `responseelements` string, `additionaleventdata` string, `requestid` string, `eventid` string, `resources` array<struct<`arn`:string,`accountid`:string,`type`:string>>, `eventtype` string, `apiversion` string, `readonly` string, `recipientaccountid` string, `serviceeventdetails` string, `sharedeventid` string, `vpcendpointid` string, `tlsDetails` struct<`tlsVersion`:string,`cipherSuite`:string,`clientProvidedHostHeader`:string>, `account_id` string, `region` string, `event_hour` string, `__execution_name__` string) PARTITIONED BY (`event_hour` string, `account_id` string, `region` string, `__execution_name__` string) ROW FORMAT SERDE 'org.apache.hadoop.hive.ql.io.parquet.serde.ParquetHiveSerDe'  STORED AS INPUTFORMAT 'org.apache.hadoop.hive.ql.io.parquet.MapredParquetInputFormat' OUTPUTFORMAT 'org.apache.hadoop.hive.ql.io.parquet.MapredParquetOutputFormat' LOCATION '{location}' ;""")
        assert json.dumps(CLOUDTRAIL_PARQUET.statements.insert) == json.dumps("""INSERT INTO "{destination_database}"."{destination_table}" ("time", "timestamp", "eventversion", "useridentity", "eventtime", "eventsource", "eventname", "awsregion", "sourceipaddress", "useragent", "errorcode", "errormessage", "requestparameters", "responseelements", "additionaleventdata", "requestid", "eventid", "resources", "eventtype", "apiversion", "readonly", "recipientaccountid", "serviceeventdetails", "sharedeventid", "vpcendpointid", "tlsDetails", "account_id", "region", "event_hour", "__execution_name__") SELECT CAST(to_unixtime(from_iso8601_timestamp("eventtime")) * 1000 AS bigint), from_iso8601_timestamp("eventtime"), "eventversion", "useridentity", "eventtime", "eventsource", "eventname", "awsregion", "sourceipaddress", "useragent", "errorcode", "errormessage", "requestparameters", "responseelements", "additionaleventdata", "requestid", "eventid", "resources", "eventtype", "apiversion", "readonly", "recipientaccountid", "serviceeventdetails", "sharedeventid", "vpcendpointid", "tlsDetails", "recipientaccountid", "awsregion", date_format(from_iso8601_timestamp("eventtime"), '%Y%m%d%H'), '{{}}' FROM "{source_database}"."{source_table}";""")
        assert json.dumps(CLOUDTRAIL_PARQUET.statements.drop) == json.dumps("""DROP TABLE IF EXISTS `{database}`.`{table_name}`""")
        assert json.dumps(CLOUDTRAIL_PARQUET.statements.aggregate) == json.dumps("""INSERT INTO \"{destination_database}\".\"{destination_table}\" (\"time\", \"timestamp\", \"eventversion\", \"useridentity\", \"eventtime\", \"eventsource\", \"eventname\", \"awsregion\", \"sourceipaddress\", \"useragent\", \"errorcode\", \"errormessage\", \"requestparameters\", \"responseelements\", \"additionaleventdata\", \"requestid\", \"eventid\", \"resources\", \"eventtype\", \"apiversion\", \"readonly\", \"recipientaccountid\", \"serviceeventdetails\", \"sharedeventid\", \"vpcendpointid\", \"tlsDetails\", \"account_id\", \"region\", \"event_hour\", \"__execution_name__\") SELECT CAST(to_unixtime(from_iso8601_timestamp(\"eventtime\")) * 1000 AS bigint), from_iso8601_timestamp(\"eventtime\"), \"eventversion\", \"useridentity\", \"eventtime\", \"eventsource\", \"eventname\", \"awsregion\", \"sourceipaddress\", \"useragent\", \"errorcode\", \"errormessage\", \"requestparameters\", \"responseelements\", \"additionaleventdata\", \"requestid\", \"eventid\", \"resources\", \"eventtype\", \"apiversion\", \"readonly\", \"recipientaccountid\", \"serviceeventdetails\", \"sharedeventid\", \"vpcendpointid\", \"tlsDetails\", \"recipientaccountid\", \"awsregion\", date_format(from_iso8601_timestamp(\"eventtime\"), '%Y%m%d%H'), '{{}}' FROM \"{source_database}\".\"{source_table}\" WHERE __execution_name__ = '{execution_name}' GROUP BY CAST(to_unixtime(from_iso8601_timestamp(\"eventtime\")) * 1000 AS bigint), from_iso8601_timestamp(\"eventtime\"), \"eventversion\", \"useridentity\", \"eventtime\", \"eventsource\", \"eventname\", \"awsregion\", \"sourceipaddress\", \"useragent\", \"errorcode\", \"errormessage\", \"requestparameters\", \"responseelements\", \"additionaleventdata\", \"requestid\", \"eventid\", \"resources\", \"eventtype\", \"apiversion\", \"readonly\", \"recipientaccountid\", \"serviceeventdetails\", \"sharedeventid\", \"vpcendpointid\", \"tlsDetails\", \"recipientaccountid\", \"awsregion\", date_format(from_iso8601_timestamp(\"eventtime\"), '%Y%m%d%H'), '{{}}';""")
        
        assert CLOUDTRAIL_METRICS.columns == [
            {'Name': 'time', 'Type': 'bigint'}, 
            {'Name': 'timestamp', 'Type': 'timestamp'}, 
            {'Name': 'useridentitytype', 'Type': 'string'}, 
            {'Name': 'accountid', 'Type': 'string'}, 
            {'Name': 'username', 'Type': 'string'}, 
            {'Name': 'eventtype', 'Type': 'string'}, 
            {'Name': 'eventsource', 'Type': 'string'}, 
            {'Name': 'eventname', 'Type': 'string'}, 
            {'Name': 'sourceipaddress', 'Type': 'string'}, 
            {'Name': 'errorCode', 'Type': 'string'}, 
            {'Name': 'requests', 'Type': 'bigint'}]
        assert CLOUDTRAIL_METRICS.partition_keys == [
            {'Name': 'event_hour', 'Type': 'string'}, 
            {'Name': 'account_id', 'Type': 'string'}, 
            {'Name': 'region', 'Type': 'string'}, 
            {'Name': '__execution_name__', 'Type': 'string'}
        ]
        assert CLOUDTRAIL_METRICS.partition_indexes == [
            {'IndexName': 'IDX_EXECUTION_NAME', 'Keys': ['__execution_name__']}, 
            {'IndexName': 'IDX_PARTITIONS', 'Keys': ['event_hour', 'account_id', 'region']}
        ]
        assert CLOUDTRAIL_METRICS.partition_info == collections.OrderedDict([('event_hour', {'type': 'time', 'from': '%Y%m%d%H', 'to': '%Y%m%d00'}), ('account_id', {'type': 'retain'}), ('region', {'type': 'retain'}), ('__execution_name__', {'type': 'default', 'value': '00000000-0000-0000-0000-000000000000'})])
        assert json.dumps(CLOUDTRAIL_METRICS.statements.create) == json.dumps("""CREATE EXTERNAL TABLE IF NOT EXISTS `{database}`.`{table_name}` (`time` bigint, `timestamp` timestamp, `useridentitytype` string, `accountid` string, `username` string, `eventtype` string, `eventsource` string, `eventname` string, `sourceipaddress` string, `errorCode` string, `requests` bigint, `event_hour` string, `account_id` string, `region` string, `__execution_name__` string) PARTITIONED BY (`event_hour` string, `account_id` string, `region` string, `__execution_name__` string) ROW FORMAT SERDE 'org.apache.hadoop.hive.ql.io.parquet.serde.ParquetHiveSerDe'  STORED AS INPUTFORMAT 'org.apache.hadoop.hive.ql.io.parquet.MapredParquetInputFormat' OUTPUTFORMAT 'org.apache.hadoop.hive.ql.io.parquet.MapredParquetOutputFormat' LOCATION '{location}' ;""")        
        assert json.dumps(CLOUDTRAIL_METRICS.statements.insert) == json.dumps("""INSERT INTO "{destination_database}"."{destination_table}" ("time", "timestamp", "useridentitytype", "accountid", "username", "eventtype", "eventsource", "eventname", "sourceipaddress", "errorCode", "requests", "event_hour", "account_id", "region", "__execution_name__") SELECT FLOOR("time" / 60000) * 60000, DATE_TRUNC('minute', "timestamp"), useridentity.type, COALESCE(useridentity.accountid, useridentity.sessioncontext.sessionissuer.accountid), COALESCE(useridentity.username, useridentity.sessioncontext.sessionissuer.username), "eventtype", "eventsource", "eventname", "sourceipaddress", "errorCode", CAST(COUNT(1) AS bigint), "event_hour", "account_id", "region", "__execution_name__" FROM "{source_database}"."{source_table}";""")
        assert json.dumps(CLOUDTRAIL_METRICS.statements.drop) == json.dumps("""DROP TABLE IF EXISTS `{database}`.`{table_name}`""")
        assert json.dumps(CLOUDTRAIL_METRICS.statements.aggregate) == json.dumps("""INSERT INTO "{destination_database}"."{destination_table}" ("time", "timestamp", "useridentitytype", "accountid", "username", "eventtype", "eventsource", "eventname", "sourceipaddress", "errorCode", "requests", "event_hour", "account_id", "region", "__execution_name__") SELECT FLOOR("time" / 60000) * 60000, DATE_TRUNC('minute', "timestamp"), useridentity.type, COALESCE(useridentity.accountid, useridentity.sessioncontext.sessionissuer.accountid), COALESCE(useridentity.username, useridentity.sessioncontext.sessionissuer.username), "eventtype", "eventsource", "eventname", "sourceipaddress", "errorCode", CAST(COUNT(1) AS bigint), "event_hour", "account_id", "region", "__execution_name__" FROM "{source_database}"."{source_table}" WHERE __execution_name__ = '{execution_name}' GROUP BY FLOOR("time" / 60000) * 60000, DATE_TRUNC('minute', "timestamp"), useridentity.type, COALESCE(useridentity.accountid, useridentity.sessioncontext.sessionissuer.accountid), COALESCE(useridentity.username, useridentity.sessioncontext.sessionissuer.username), "eventtype", "eventsource", "eventname", "sourceipaddress", "errorCode", "event_hour", "account_id", "region", "__execution_name__";""")
    
    def test_vpcflow(self,):
        from utils.aws.glue.table import TableMetaData
        from utils.logschema.services import VPCFLOW_RAW, VPCFLOW_PARQUET
        
        assert isinstance(VPCFLOW_RAW, TableMetaData) is True
        assert isinstance(VPCFLOW_RAW, TableMetaData) is True
        # assert isinstance(CLOUDTRAIL_METRICS, TableMetaData) is True
        
        assert VPCFLOW_RAW.columns == [
            {'Name': 'account-id', 'Type': 'string'}, 
            {'Name': 'action', 'Type': 'string'}, 
            {'Name': 'az-id', 'Type': 'string'}, 
            {'Name': 'bytes', 'Type': 'bigint'}, 
            {'Name': 'dstaddr', 'Type': 'string'}, 
            {'Name': 'dstport', 'Type': 'int'},
            {'Name': 'end', 'Type': 'bigint'}, 
            {'Name': 'flow-direction', 'Type': 'string'}, 
            {'Name': 'instance-id', 'Type': 'string'}, 
            {'Name': 'interface-id', 'Type': 'string'}, 
            {'Name': 'log-status', 'Type': 'string'}, 
            {'Name': 'packets', 'Type': 'bigint'}, 
            {'Name': 'pkt-dst-aws-service', 'Type': 'string'}, 
            {'Name': 'pkt-dstaddr', 'Type': 'string'}, 
            {'Name': 'pkt-src-aws-service', 'Type': 'string'}, 
            {'Name': 'pkt-srcaddr', 'Type': 'string'}, 
            {'Name': 'protocol', 'Type': 'bigint'},
            {'Name': 'region', 'Type': 'string'}, 
            {'Name': 'srcaddr', 'Type': 'string'}, 
            {'Name': 'srcport', 'Type': 'int'}, 
            {'Name': 'start', 'Type': 'bigint'}, 
            {'Name': 'sublocation-id', 'Type': 'string'}, 
            {'Name': 'sublocation-type', 'Type': 'string'}, 
            {'Name': 'subnet-id', 'Type': 'string'}, 
            {'Name': 'tcp-flags', 'Type': 'int'}, 
            {'Name': 'traffic-path', 'Type': 'int'}, 
            {'Name': 'type', 'Type': 'string'}, 
            {'Name': 'version', 'Type': 'int'}, 
            {'Name': 'vpc-id', 'Type': 'string'}
        ]
        assert VPCFLOW_RAW.partition_keys == []
        assert VPCFLOW_RAW.partition_indexes == []
        assert VPCFLOW_RAW.partition_info == {}
        assert json.dumps(VPCFLOW_RAW.statements.create) == json.dumps("""CREATE EXTERNAL TABLE IF NOT EXISTS `{database}`.`{table_name}` (`account-id` string, `action` string, `az-id` string, `bytes` bigint, `dstaddr` string, `dstport` int, `end` bigint, `flow-direction` string, `instance-id` string, `interface-id` string, `log-status` string, `packets` bigint, `pkt-dst-aws-service` string, `pkt-dstaddr` string, `pkt-src-aws-service` string, `pkt-srcaddr` string, `protocol` bigint, `region` string, `srcaddr` string, `srcport` int, `start` bigint, `sublocation-id` string, `sublocation-type` string, `subnet-id` string, `tcp-flags` int, `traffic-path` int, `type` string, `version` int, `vpc-id` string)  ROW FORMAT SERDE 'org.apache.hadoop.hive.serde2.lazy.LazySimpleSerDe' WITH SERDEPROPERTIES ('field.delim'=' ', 'line.delim'='\n') STORED AS INPUTFORMAT 'org.apache.hadoop.mapred.TextInputFormat' OUTPUTFORMAT 'org.apache.hadoop.hive.ql.io.HiveIgnoreKeyTextOutputFormat' LOCATION '{location}' TBLPROPERTIES ('skip.header.line.count'='1');""")        
        assert json.dumps(VPCFLOW_RAW.statements.insert) == json.dumps("""INSERT INTO \"{destination_database}\".\"{destination_table}\" (\"account-id\", \"action\", \"az-id\", \"bytes\", \"dstaddr\", \"dstport\", \"end\", \"flow-direction\", \"instance-id\", \"interface-id\", \"log-status\", \"packets\", \"pkt-dst-aws-service\", \"pkt-dstaddr\", \"pkt-src-aws-service\", \"pkt-srcaddr\", \"protocol\", \"region\", \"srcaddr\", \"srcport\", \"start\", \"sublocation-id\", \"sublocation-type\", \"subnet-id\", \"tcp-flags\", \"traffic-path\", \"type\", \"version\", \"vpc-id\") SELECT \"account-id\", \"action\", \"az-id\", \"bytes\", \"dstaddr\", \"dstport\", \"end\", \"flow-direction\", \"instance-id\", \"interface-id\", \"log-status\", \"packets\", \"pkt-dst-aws-service\", \"pkt-dstaddr\", \"pkt-src-aws-service\", \"pkt-srcaddr\", \"protocol\", \"region\", \"srcaddr\", \"srcport\", \"start\", \"sublocation-id\", \"sublocation-type\", \"subnet-id\", \"tcp-flags\", \"traffic-path\", \"type\", \"version\", \"vpc-id\" FROM \"{source_database}\".\"{source_table}\";""")
        assert json.dumps(VPCFLOW_RAW.statements.drop) == json.dumps("""DROP TABLE IF EXISTS `{database}`.`{table_name}`""")
        assert json.dumps(VPCFLOW_RAW.statements.aggregate) == json.dumps("""INSERT INTO \"{destination_database}\".\"{destination_table}\" (\"account-id\", \"action\", \"az-id\", \"bytes\", \"dstaddr\", \"dstport\", \"end\", \"flow-direction\", \"instance-id\", \"interface-id\", \"log-status\", \"packets\", \"pkt-dst-aws-service\", \"pkt-dstaddr\", \"pkt-src-aws-service\", \"pkt-srcaddr\", \"protocol\", \"region\", \"srcaddr\", \"srcport\", \"start\", \"sublocation-id\", \"sublocation-type\", \"subnet-id\", \"tcp-flags\", \"traffic-path\", \"type\", \"version\", \"vpc-id\") SELECT \"account-id\", \"action\", \"az-id\", \"bytes\", \"dstaddr\", \"dstport\", \"end\", \"flow-direction\", \"instance-id\", \"interface-id\", \"log-status\", \"packets\", \"pkt-dst-aws-service\", \"pkt-dstaddr\", \"pkt-src-aws-service\", \"pkt-srcaddr\", \"protocol\", \"region\", \"srcaddr\", \"srcport\", \"start\", \"sublocation-id\", \"sublocation-type\", \"subnet-id\", \"tcp-flags\", \"traffic-path\", \"type\", \"version\", \"vpc-id\" FROM \"{source_database}\".\"{source_table}\" WHERE __execution_name__ = '{execution_name}' GROUP BY \"account-id\", \"action\", \"az-id\", \"bytes\", \"dstaddr\", \"dstport\", \"end\", \"flow-direction\", \"instance-id\", \"interface-id\", \"log-status\", \"packets\", \"pkt-dst-aws-service\", \"pkt-dstaddr\", \"pkt-src-aws-service\", \"pkt-srcaddr\", \"protocol\", \"region\", \"srcaddr\", \"srcport\", \"start\", \"sublocation-id\", \"sublocation-type\", \"subnet-id\", \"tcp-flags\", \"traffic-path\", \"type\", \"version\", \"vpc-id\";""")
        
        assert VPCFLOW_PARQUET.columns == [
            {'Name': 'time', 'Type': 'bigint'}, 
            {'Name': 'timestamp', 'Type': 'timestamp'}, 
            {'Name': 'version', 'Type': 'int'}, 
            {'Name': 'account-id', 'Type': 'string'}, 
            {'Name': 'interface-id', 'Type': 'string'}, 
            {'Name': 'srcaddr', 'Type': 'string'}, 
            {'Name': 'dstaddr', 'Type': 'string'}, 
            {'Name': 'srcport', 'Type': 'int'}, 
            {'Name': 'dstport', 'Type': 'int'},
            {'Name': 'protocol', 'Type': 'bigint'}, 
            {'Name': 'packets', 'Type': 'bigint'}, 
            {'Name': 'bytes', 'Type': 'bigint'}, 
            {'Name': 'start', 'Type': 'bigint'}, 
            {'Name': 'end', 'Type': 'bigint'}, 
            {'Name': 'action', 'Type': 'string'}, 
            {'Name': 'log-status', 'Type': 'string'}, 
            {'Name': 'vpc-id', 'Type': 'string'}, 
            {'Name': 'subnet-id', 'Type': 'string'}, 
            {'Name': 'instance-id', 'Type': 'string'}, 
            {'Name': 'tcp-flags', 'Type': 'int'}, 
            {'Name': 'type', 'Type': 'string'}, 
            {'Name': 'pkt-srcaddr', 'Type': 'string'}, 
            {'Name': 'pkt-dstaddr', 'Type': 'string'}, 
            {'Name': 'az-id', 'Type': 'string'}, 
            {'Name': 'sublocation-type', 'Type': 'string'}, 
            {'Name': 'sublocation-id', 'Type': 'string'}, 
            {'Name': 'pkt-src-aws-service', 'Type': 'string'}, 
            {'Name': 'pkt-dst-aws-service', 'Type': 'string'}, 
            {'Name': 'flow-direction', 'Type': 'string'}, 
            {'Name': 'traffic-path', 'Type': 'int'}
        ]
        assert VPCFLOW_PARQUET.partition_keys == [
            {'Name': 'event_hour', 'Type': 'string'}, 
            {'Name': 'account_id', 'Type': 'string'}, 
            {'Name': 'region', 'Type': 'string'}, 
            {'Name': '__execution_name__', 'Type': 'string'}
        ]
        assert VPCFLOW_PARQUET.partition_indexes == [
            {'IndexName': 'IDX_EXECUTION_NAME', 'Keys': ['__execution_name__']}, 
            {'IndexName': 'IDX_PARTITIONS', 'Keys': ['event_hour', 'account_id', 'region']}
        ]
        assert VPCFLOW_PARQUET.partition_info == collections.OrderedDict([('event_hour', {'type': 'time', 'from': '%Y%m%d%H', 'to': '%Y%m%d00'}), ('account_id', {'type': 'retain'}), ('region', {'type': 'retain'}), ('__execution_name__', {'type': 'default', 'value': '00000000-0000-0000-0000-000000000000'})])
        assert json.dumps(VPCFLOW_PARQUET.statements.create) == json.dumps("""CREATE EXTERNAL TABLE IF NOT EXISTS `{database}`.`{table_name}` (`time` bigint, `timestamp` timestamp, `version` int, `account-id` string, `interface-id` string, `srcaddr` string, `dstaddr` string, `srcport` int, `dstport` int, `protocol` bigint, `packets` bigint, `bytes` bigint, `start` bigint, `end` bigint, `action` string, `log-status` string, `vpc-id` string, `subnet-id` string, `instance-id` string, `tcp-flags` int, `type` string, `pkt-srcaddr` string, `pkt-dstaddr` string, `az-id` string, `sublocation-type` string, `sublocation-id` string, `pkt-src-aws-service` string, `pkt-dst-aws-service` string, `flow-direction` string, `traffic-path` int, `account_id` string, `region` string, `event_hour` string, `__execution_name__` string) PARTITIONED BY (`event_hour` string, `account_id` string, `region` string, `__execution_name__` string) ROW FORMAT SERDE 'org.apache.hadoop.hive.ql.io.parquet.serde.ParquetHiveSerDe'  STORED AS INPUTFORMAT 'org.apache.hadoop.hive.ql.io.parquet.MapredParquetInputFormat' OUTPUTFORMAT 'org.apache.hadoop.hive.ql.io.parquet.MapredParquetOutputFormat' LOCATION '{location}' ;""")
        assert json.dumps(VPCFLOW_PARQUET.statements.insert) == json.dumps("""INSERT INTO \"{destination_database}\".\"{destination_table}\" (\"time\", \"timestamp\", \"version\", \"account-id\", \"interface-id\", \"srcaddr\", \"dstaddr\", \"srcport\", \"dstport\", \"protocol\", \"packets\", \"bytes\", \"start\", \"end\", \"action\", \"log-status\", \"vpc-id\", \"subnet-id\", \"instance-id\", \"tcp-flags\", \"type\", \"pkt-srcaddr\", \"pkt-dstaddr\", \"az-id\", \"sublocation-type\", \"sublocation-id\", \"pkt-src-aws-service\", \"pkt-dst-aws-service\", \"flow-direction\", \"traffic-path\", \"account_id\", \"region\", \"event_hour\", \"__execution_name__\") SELECT CAST(\"start\" * 1000 AS bigint), from_unixtime(\"start\"), \"version\", \"account-id\", \"interface-id\", \"srcaddr\", \"dstaddr\", \"srcport\", \"dstport\", \"protocol\", \"packets\", \"bytes\", \"start\", \"end\", \"action\", \"log-status\", \"vpc-id\", \"subnet-id\", \"instance-id\", \"tcp-flags\", \"type\", \"pkt-srcaddr\", \"pkt-dstaddr\", \"az-id\", \"sublocation-type\", \"sublocation-id\", \"pkt-src-aws-service\", \"pkt-dst-aws-service\", \"flow-direction\", \"traffic-path\", \"account-id\", \"region\", date_format(from_unixtime(\"start\"), '%Y%m%d%H'), '{{}}' FROM \"{source_database}\".\"{source_table}\";""")
        assert json.dumps(VPCFLOW_PARQUET.statements.drop) == json.dumps("""DROP TABLE IF EXISTS `{database}`.`{table_name}`""")
        assert json.dumps(VPCFLOW_PARQUET.statements.aggregate) == json.dumps("""INSERT INTO \"{destination_database}\".\"{destination_table}\" (\"time\", \"timestamp\", \"version\", \"account-id\", \"interface-id\", \"srcaddr\", \"dstaddr\", \"srcport\", \"dstport\", \"protocol\", \"packets\", \"bytes\", \"start\", \"end\", \"action\", \"log-status\", \"vpc-id\", \"subnet-id\", \"instance-id\", \"tcp-flags\", \"type\", \"pkt-srcaddr\", \"pkt-dstaddr\", \"az-id\", \"sublocation-type\", \"sublocation-id\", \"pkt-src-aws-service\", \"pkt-dst-aws-service\", \"flow-direction\", \"traffic-path\", \"account_id\", \"region\", \"event_hour\", \"__execution_name__\") SELECT CAST(\"start\" * 1000 AS bigint), from_unixtime(\"start\"), \"version\", \"account-id\", \"interface-id\", \"srcaddr\", \"dstaddr\", \"srcport\", \"dstport\", \"protocol\", \"packets\", \"bytes\", \"start\", \"end\", \"action\", \"log-status\", \"vpc-id\", \"subnet-id\", \"instance-id\", \"tcp-flags\", \"type\", \"pkt-srcaddr\", \"pkt-dstaddr\", \"az-id\", \"sublocation-type\", \"sublocation-id\", \"pkt-src-aws-service\", \"pkt-dst-aws-service\", \"flow-direction\", \"traffic-path\", \"account-id\", \"region\", date_format(from_unixtime(\"start\"), '%Y%m%d%H'), '{{}}' FROM \"{source_database}\".\"{source_table}\" WHERE __execution_name__ = '{execution_name}' GROUP BY CAST(\"start\" * 1000 AS bigint), from_unixtime(\"start\"), \"version\", \"account-id\", \"interface-id\", \"srcaddr\", \"dstaddr\", \"srcport\", \"dstport\", \"protocol\", \"packets\", \"bytes\", \"start\", \"end\", \"action\", \"log-status\", \"vpc-id\", \"subnet-id\", \"instance-id\", \"tcp-flags\", \"type\", \"pkt-srcaddr\", \"pkt-dstaddr\", \"az-id\", \"sublocation-type\", \"sublocation-id\", \"pkt-src-aws-service\", \"pkt-dst-aws-service\", \"flow-direction\", \"traffic-path\", \"account-id\", \"region\", date_format(from_unixtime(\"start\"), '%Y%m%d%H'), '{{}}';""")
        
        # assert CLOUDFRONT_PARQUET.columns == [
        #     {'Name': 'time', 'Type': 'bigint'}, 
        #     {'Name': 'timestamp', 'Type': 'timestamp'}, 
        #     {'Name': 'action', 'Type': 'string'}, 
        #     {'Name': 'webaclid', 'Type': 'string'}, 
        #     {'Name': 'webaclname', 'Type': 'string'}, 
        #     {'Name': 'terminatingruleid', 'Type': 'string'}, 
        #     {'Name': 'terminatingruletype', 'Type': 'string'}, 
        #     {'Name': 'httpsourceid', 'Type': 'string'}, 
        #     {'Name': 'httpmethod', 'Type': 'string'}, 
        #     {'Name': 'country', 'Type': 'string'}, 
        #     {'Name': 'clientip', 'Type': 'string'}, 
        #     {'Name': 'uri', 'Type': 'string'}, 
        #     {'Name': 'first_label', 'Type': 'string'}, 
        #     {'Name': 'requests', 'Type': 'bigint'}
        # ]
        # assert CLOUDFRONT_PARQUET.partition_keys == [
        #     {'Name': 'event_hour', 'Type': 'string'}, 
        #     {'Name': 'account_id', 'Type': 'string'}, 
        #     {'Name': 'region', 'Type': 'string'}, 
        #     {'Name': '__execution_name__', 'Type': 'string'}
        # ]
        # assert CLOUDFRONT_PARQUET.partition_indexes == [
        #     {'IndexName': 'IDX_EXECUTION_NAME', 'Keys': ['__execution_name__']}, 
        #     {'IndexName': 'IDX_PARTITIONS', 'Keys': ['event_hour', 'account_id', 'region']}
        # ]
        # assert CLOUDFRONT_PARQUET.partition_info == collections.OrderedDict([('event_hour', {'type': 'time', 'from': '%Y%m%d%H', 'to': '%Y%m%d00'}), ('account_id', {'type': 'retain'}), ('region', {'type': 'retain'}), ('__execution_name__', {'type': 'default', 'value': '00000000-0000-0000-0000-000000000000'})])
        # assert json.dumps(CLOUDFRONT_PARQUET.statements.create) == json.dumps("""CREATE EXTERNAL TABLE IF NOT EXISTS `{database}`.`{table_name}` (`time` bigint, `timestamp` timestamp, `action` string, `webaclid` string, `webaclname` string, `terminatingruleid` string, `terminatingruletype` string, `httpsourceid` string, `httpmethod` string, `country` string, `clientip` string, `uri` string, `first_label` string, `requests` bigint, `account_id` string, `region` string, `event_hour` string, `__execution_name__` string) PARTITIONED BY (`event_hour` string, `account_id` string, `region` string, `__execution_name__` string) ROW FORMAT SERDE 'org.apache.hadoop.hive.ql.io.parquet.serde.ParquetHiveSerDe'  STORED AS INPUTFORMAT 'org.apache.hadoop.hive.ql.io.parquet.MapredParquetInputFormat' OUTPUTFORMAT 'org.apache.hadoop.hive.ql.io.parquet.MapredParquetOutputFormat' LOCATION '{location}' ;""")        
        # assert json.dumps(CLOUDFRONT_PARQUET.statements.insert) == json.dumps("""INSERT INTO \"{destination_database}\".\"{destination_table}\" (\"time\", \"timestamp\", \"action\", \"webaclid\", \"webaclname\", \"terminatingruleid\", \"terminatingruletype\", \"httpsourceid\", \"httpmethod\", \"country\", \"clientip\", \"uri\", \"first_label\", \"requests\", \"account_id\", \"region\", \"event_hour\", \"__execution_name__\") SELECT FLOOR(\"time\" / 60000) * 60000, DATE_TRUNC('minute', \"timestamp\"), \"action\", \"webaclid\", \"webaclname\", \"terminatingruleid\", \"terminatingruletype\", \"httpsourceid\", \"httprequest\".\"httpmethod\", \"httprequest\".\"country\", \"httprequest\".\"clientip\", \"httprequest\".\"uri\", CASE WHEN labels = ARRAY[] THEN '' ELSE labels[1].name END, CAST(COUNT(1) AS bigint), \"account_id\", \"region\", \"event_hour\", \"__execution_name__\" FROM \"{source_database}\".\"{source_table}\";""")
        # assert json.dumps(CLOUDFRONT_PARQUET.statements.drop) == json.dumps("""DROP TABLE IF EXISTS `{database}`.`{table_name}`""")
        # assert json.dumps(CLOUDFRONT_PARQUET.statements.aggregate) == json.dumps("""INSERT INTO \"{destination_database}\".\"{destination_table}\" (\"time\", \"timestamp\", \"action\", \"webaclid\", \"webaclname\", \"terminatingruleid\", \"terminatingruletype\", \"httpsourceid\", \"httpmethod\", \"country\", \"clientip\", \"uri\", \"first_label\", \"requests\", \"account_id\", \"region\", \"event_hour\", \"__execution_name__\") SELECT FLOOR(\"time\" / 60000) * 60000, DATE_TRUNC('minute', \"timestamp\"), \"action\", \"webaclid\", \"webaclname\", \"terminatingruleid\", \"terminatingruletype\", \"httpsourceid\", \"httprequest\".\"httpmethod\", \"httprequest\".\"country\", \"httprequest\".\"clientip\", \"httprequest\".\"uri\", CASE WHEN labels = ARRAY[] THEN '' ELSE labels[1].name END, CAST(COUNT(1) AS bigint), \"account_id\", \"region\", \"event_hour\", \"__execution_name__\" FROM \"{source_database}\".\"{source_table}\" WHERE __execution_name__ = '{execution_name}' GROUP BY FLOOR(\"time\" / 60000) * 60000, DATE_TRUNC('minute', \"timestamp\"), \"action\", \"webaclid\", \"webaclname\", \"terminatingruleid\", \"terminatingruletype\", \"httpsourceid\", \"httprequest\".\"httpmethod\", \"httprequest\".\"country\", \"httprequest\".\"clientip\", \"httprequest\".\"uri\", CASE WHEN labels = ARRAY[] THEN '' ELSE labels[1].name END, \"account_id\", \"region\", \"event_hour\", \"__execution_name__\";""")
    
    