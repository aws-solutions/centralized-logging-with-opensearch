# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import os
import re
import json
import copy
import collections
from commonlib.model import (
    LogConfig,
    LogTypeEnum,
    EngineType,
    LogStructure,
    IISLogParserEnum,
)


__CURRENT_PATH__ = os.path.dirname(os.path.abspath(__file__))

DEFAULT_JSON_SCHEMA = {"type": "object", "properties": collections.OrderedDict()}

NGINX_MAPPING_PROPS = {
    "@timestamp": {"type": "alias", "path": "time_local"},  # NOSONAR
    "file_name": {"type": "text"},
    "remote_addr": {"type": "ip"},
    "remote_user": {"type": "text"},
    "request_time": {"type": "float"},
    "time_local": {
        "type": "date",
        "format": "dd/MMM/yyyy:HH:mm:ss||dd/MMM/yyyy:HH:mm:ss XXXX||epoch_millis",
    },
    "host": {"type": "text"},
    "request_method": {"type": "keyword"},
    "request_uri": {
        "type": "text",
        "fields": {"keyword": {"type": "keyword", "ignore_above": 256}},
    },
    "status": {"type": "keyword"},
    "body_bytes_sent": {"type": "long"},
    "bytes_sent": {"type": "long"},
    "connection": {"type": "long"},
    "connection_requests": {"type": "long"},
    "msec": {"type": "double"},
    "pipe": {"type": "keyword"},
    "request_length": {"type": "long"},
    "time_iso8601": {
        "type": "date",
        "format": "yyyy-MM-dd'T'HH:mm:ssXXX||epoch_millis",
    },
    "http_referer": {
        "type": "text",
        "fields": {"keyword": {"type": "keyword", "ignore_above": 256}},
    },
    "http_user_agent": {
        "type": "text",
        "fields": {"keyword": {"type": "keyword", "ignore_above": 256}},
    },
    "http_x_forwarded_for": {
        "type": "text",
        "fields": {"keyword": {"type": "keyword", "ignore_above": 256}},
    },
}
APACHE_MAPPING_PROPS = {
    "@timestamp": {"type": "alias", "path": "time_local"},
    "time_local": {"type": "date", "format": "dd/MMM/yyyy:HH:mm:ss Z||epoch_millis"},
    "file_name": {"type": "text"},
    "remote_ident": {"type": "text"},
    "remote_addr": {"type": "ip"},
    "request_protocol": {"type": "text"},
    "remote_user": {"type": "text"},
    "request_method": {"type": "keyword"},
    "request_uri": {
        "type": "text",
        "fields": {"keyword": {"type": "keyword", "ignore_above": 256}},
    },
    "status": {"type": "keyword"},
    "response_size_bytes": {"type": "long"},
}

DATA_TYPE_TO_ES_TYPE_MAPPING = {
    "string": "text",
}


def convert_data_type_to_es_type(t: str):
    return DATA_TYPE_TO_ES_TYPE_MAPPING.get(t, t)


def json_schema_to_es_mapping(json_schema: dict, parent_key: str = ""):  # NOSONAR
    es_mapping = {}

    if json_schema.get("type") == "object":
        properties = json_schema.get("properties", {})
        es_mapping["properties"] = {}

        for key, value in properties.items():
            pk = parent_key + "." + key if parent_key else key
            if value.get("timeKey"):
                es_mapping["properties"][key] = {"type": "date"}
                if pk != "@timestamp":
                    es_mapping["properties"]["@timestamp"] = {
                        "type": "alias",
                        "path": pk,
                    }
            else:
                es_mapping["properties"][key] = json_schema_to_es_mapping(value, pk)

    elif json_schema.get("type") == "array":
        items = json_schema.get("items", {})
        es_mapping.update(json_schema_to_es_mapping(items, parent_key))

    else:
        the_type = es_mapping["type"] = convert_data_type_to_es_type(
            json_schema.get("type", "")
        )
        transform_es_mapping(the_type, es_mapping, json_schema)
    return es_mapping


def transform_es_mapping(type: str, es_mapping: dict, json_schema: dict):
    if type == "date":
        joda_format = strptime_to_joda(json_schema.get("format"))
        es_mapping["format"] = " || ".join(
            [
                joda_format.replace("SSSSSS", "SSS"),
                joda_format,
                joda_format.replace("SSSSSS", "SSSSSSSSS"),
            ]
        )
    elif type == "text":
        es_mapping["fields"] = {"keyword": {"type": "keyword", "ignore_above": 256}}
    elif type == "epoch_second":
        es_mapping["format"] = "epoch_second"
        es_mapping["type"] = "date"
    elif type == "epoch_millis":
        es_mapping["format"] = "epoch_millis"
        es_mapping["type"] = "date"


def make_index_template(  # NOSONAR
    log_config: LogConfig,
    index_alias: str = "",
    number_of_shards: int = 5,
    number_of_replicas: int = 1,
    codec: str = "best_compression",
    refresh_interval: str = "1s",
) -> dict:
    mappings = {}
    if log_config.logType == LogTypeEnum.NGINX:
        mappings = {"properties": NGINX_MAPPING_PROPS}
    elif log_config.logType == LogTypeEnum.APACHE:
        mappings = {"properties": APACHE_MAPPING_PROPS}
    elif log_config.logType == LogTypeEnum.JSON and log_config.jsonSchema:
        mappings = json_schema_to_es_mapping(log_config.jsonSchema)
    else:
        properties = {}
        for spec in log_config.regexFieldSpecs:
            key = spec.key
            if spec.type == "epoch_millis":
                val = {"type": "date", "format": "epoch_millis"}
            elif spec.type == "epoch_second":
                val = {"type": "date", "format": "epoch_second"}
            else:
                val = {"type": spec.type}
            if log_config.timeKey == key and key != "@timestamp":
                properties["@timestamp"] = {"type": "alias", "path": key}

            if (
                spec.format
                and key == "time"
                and (
                    log_config.iisLogParser == IISLogParserEnum.W3C
                    or log_config.iisLogParser == IISLogParserEnum.IIS
                )
            ):
                val = {"type": spec.type, "format": "hour_minute_second"}
            # NOTICE: We don't put format into index template.
            # Because the format in log config is strptime style("%Y-%m-%d %H:%M:%S"),
            # which is different from OpenSearch java style format(yyyy-MM-dd HH:mm:ss).
            # To make sure OpenSearch can handle datetime format currently. We will ensure
            # FluentBit marshal time key into iso8601 standard format before sending into OpenSearch.
            properties[key] = val
        properties = build_iis_field_format(properties, log_config.iisLogParser)

        mappings = {"properties": properties}

    template = {
        "index_patterns": [f"{index_alias}-*"],
        "template": {
            "settings": {
                "index": {
                    "number_of_shards": number_of_shards,
                    "number_of_replicas": number_of_replicas,
                    "codec": codec,
                    "refresh_interval": str(refresh_interval),
                    "plugins": {
                        "index_state_management": {"rollover_alias": index_alias}
                    },
                }
            },
            "mappings": mappings,
        },
    }

    return template


def build_iis_field_format(properties, iis_log_parser: IISLogParserEnum):
    prop = properties
    if iis_log_parser == IISLogParserEnum.W3C:
        prop["geo_location"] = {"type": "geo_point"}
        prop["geo_iso_code"] = {"type": "keyword"}
        prop["geo_country"] = {"type": "keyword"}
        prop["geo_city"] = {"type": "keyword"}
        prop["ua_browser"] = {"type": "keyword"}
        prop["ua_browser_version"] = {"type": "keyword"}
        prop["ua_os"] = {"type": "keyword"}
        prop["ua_os_version"] = {"type": "keyword"}
        prop["ua_device"] = {"type": "keyword"}
        prop["ua_category"] = {"type": "keyword"}
        prop["url"] = {"type": "keyword"}
    if iis_log_parser == IISLogParserEnum.IIS:
        prop["date"] = {"type": "keyword"}
    return prop


def strptime_to_joda(strptime_pattern):  # NOSONAR
    conversion = {
        r"%a": "E",
        r"%A": "E",
        r"%b": "MMM",
        r"%B": "MMM",
        r"%c": "E MMM dd HH:mm:ss yyyy",
        r"%C": "CC",
        r"%d": "dd",
        r"%D": "MM/dd/yy",
        r"%e": "dd",
        # r'%E': '',
        r"%f": "SSSSSSSSS",
        r"%F": "yyyy-MM-dd",
        r"%G": "yyyy",
        r"%g": "yy",
        r"%h": "MMM",
        r"%H": "HH",
        r"%I": "hh",
        r"%j": "DDD",
        # r'%k': '',
        r"%L": "SSSSSS",
        r"%m": "MM",
        r"%M": "mm",
        r"%n": "\n",
        r"%O": "",
        r"%p": "a",
        # r'%P': '',
        r"%r": "hh:mm:ss aa",
        r"%R": "HH:mm",
        # r'%s': '',
        r"%S": "ss",
        r"%t": "\t",
        r"%T": "HH:mm:ss",
        r"%u": "e",
        r"%U": "w",
        r"%V": "w",
        r"%w": "e",
        r"%W": "ww",
        r"%x": "MM/dd/yy",
        r"%X": "HH:mm:ss",
        r"%y": "yy",
        r"%Y": "yyyy",
        r"%z": "Z",
        r"%Z": "z",
        r"%+": "E MMM dd HH:mm:ss yyyy",
        r"%%": "%",
    }

    joda_pattern = ""
    i = 0
    n = len(strptime_pattern)

    while i < n:
        if strptime_pattern[i] == "%":
            if i + 1 < n and strptime_pattern[i : i + 2] in conversion:
                joda_pattern += conversion[strptime_pattern[i : i + 2]]
                i += 2
            else:
                joda_pattern += strptime_pattern[i]
                i += 1
        else:
            literal_start = i
            while i < n and strptime_pattern[i] not in (
                "%",
                "-",
                ":",
                " ",
                ".",
                "/",
                "+",
            ):
                i += 1
            if i > literal_start:
                joda_pattern += f"'{strptime_pattern[literal_start:i]}'"
            if i < n and strptime_pattern[i] in ("-", ":", " ", ".", "/", "+"):
                joda_pattern += strptime_pattern[i]
                i += 1

    return joda_pattern


def convert_time_key_format(fmt: str, log_structure: LogStructure) -> str:
    if log_structure == LogStructure.FLUENT_BIT_PARSED_JSON:
        return "yyyy-MM-dd''T''HH:mm:ss.SSSSSSSSSZ"
    else:
        return strptime_to_joda(strptime_pattern=fmt).replace("'", "''")


def covert_data_type_from_aos_to_athena(aos_type: str) -> str:
    data_type_mapping = json.load(
        open(f"{__CURRENT_PATH__}/mapping/opensearch_to_athena_mapping.json", "r")
    )
    return data_type_mapping.get(aos_type, "string")


def pop_invalid_key(json_schema: dict):
    if "format" in json_schema.keys() and not json_schema["format"]:
        json_schema.pop("format", None)
    return json_schema


def convert_json_schema_data_type_for_light_engine(
    json_schema: dict, log_structure: LogStructure
) -> dict:
    """Find time key in Json Schema, search down the time key field layer by layer (ignore array and map type),
        and then search the sub-level after the current layer is searched,  and return if the first time key field is found.

    Args:
        schema (dict): JSON Schema is a structure of JSON data
        source_type (str): Log source type.

    Returns:
        dict: Property of the time key field.
    """
    json_schema = pop_invalid_key(json_schema=json_schema)

    for name, properties in json_schema["properties"].items():
        properties = pop_invalid_key(json_schema=properties)

        if properties["type"] in ("object", "map"):
            json_schema["properties"][name] = (
                convert_json_schema_data_type_for_light_engine(
                    json_schema=properties, log_structure=log_structure
                )
            )
        elif properties["type"] == "array":
            if properties["items"]["type"] in ("object", "map"):
                properties["items"] = convert_json_schema_data_type_for_light_engine(
                    json_schema=properties["items"], log_structure=log_structure
                )
                continue
            properties["items"]["type"] = covert_data_type_from_aos_to_athena(
                aos_type=properties["items"]["type"]
            )
        else:
            original_type = properties["type"]
            properties["type"] = covert_data_type_from_aos_to_athena(
                aos_type=properties["type"]
            )
            if properties.get("timeKey") is True and properties["type"] == "big_int":
                properties["format"] = original_type
            elif properties.get("timeKey") is True:
                properties["format"] = convert_time_key_format(
                    fmt=properties["format"], log_structure=log_structure
                )
            elif properties["type"] == "timestamp" and properties.get("format"):
                properties["format"] = convert_time_key_format(
                    fmt=properties["format"], log_structure=LogStructure.RAW
                )

    return json_schema


def convert_json_schema_data_type(
    json_schema: dict,
    engine_type: EngineType = EngineType.LIGHT_ENGINE,
    log_structure: LogStructure = LogStructure.FLUENT_BIT_PARSED_JSON,
) -> dict:
    """_summary_

    Args:
        json_schema (dict): _description_
        source_type (str, optional): _description_. Defaults to 'fluent-bit'.
    """
    new_json_schema = copy.deepcopy(json_schema)
    if engine_type == EngineType.LIGHT_ENGINE:
        new_json_schema = convert_json_schema_data_type_for_light_engine(
            json_schema=new_json_schema, log_structure=log_structure
        )

    return new_json_schema


def generate_json_schema_based_on_regex_field_specs(
    regex_field_specs: list, time_key: str
) -> dict:
    json_schema = copy.deepcopy(DEFAULT_JSON_SCHEMA)

    for field in regex_field_specs:
        json_schema["properties"][field.key] = {
            "type": field.type,
        }
        if field.key == time_key:
            json_schema["properties"][field.key]["timeKey"] = True
            json_schema["properties"][field.key]["format"] = field.format
    return json_schema


def generate_json_schema_for_apache(user_log_format: str) -> dict:
    json_schema = copy.deepcopy(DEFAULT_JSON_SCHEMA)

    apache_format_string_mapping = json.load(
        open(f"{__CURRENT_PATH__}/mapping/apache_format_string_mapping.json", "r")
    )
    match = re.match(r'LogFormat\s+"([^"].+)"[^"]+', user_log_format)
    if match is None:
        raise ValueError(f"Incorrect user log format: {user_log_format}")

    for field_name in re.findall(r"%(?:\{[^}]+\})?[\w>]+", user_log_format):
        if field_name in apache_format_string_mapping.keys():
            json_schema["properties"].update(apache_format_string_mapping[field_name])

    return json_schema


def generate_json_schema_for_nginx(user_log_format: str) -> dict:
    json_schema = copy.deepcopy(DEFAULT_JSON_SCHEMA)
    nginx_format_string_mapping = json.load(
        open(f"{__CURRENT_PATH__}/mapping/nginx_format_string_mapping.json", "r")
    )

    for field_name in re.findall(r"\$(\w+)[\W]", user_log_format):
        if field_name in nginx_format_string_mapping.keys():
            json_schema["properties"].update(nginx_format_string_mapping[field_name])
        else:
            json_schema["properties"][field_name] = {"type": "text"}

    return json_schema


def get_json_schema(
    log_conf: LogConfig,
    engine_type: EngineType = EngineType.LIGHT_ENGINE,
    log_structure: LogStructure = LogStructure.FLUENT_BIT_PARSED_JSON,
) -> dict:
    json_schema = copy.deepcopy(DEFAULT_JSON_SCHEMA)

    if log_conf.jsonSchema:
        json_schema = log_conf.jsonSchema
    elif log_conf.regexFieldSpecs:
        json_schema = generate_json_schema_based_on_regex_field_specs(
            regex_field_specs=log_conf.regexFieldSpecs, time_key=log_conf.timeKey
        )
    elif log_conf.logType == "Nginx":
        json_schema = generate_json_schema_for_nginx(
            user_log_format=log_conf.userLogFormat
        )
        return convert_json_schema_data_type(
            json_schema=json_schema,
            engine_type=engine_type,
            log_structure=LogStructure.RAW,
        )
    elif log_conf.logType == "Apache":
        json_schema = generate_json_schema_for_apache(
            user_log_format=log_conf.userLogFormat
        )
        return convert_json_schema_data_type(
            json_schema=json_schema,
            engine_type=engine_type,
            log_structure=LogStructure.RAW,
        )

    if log_conf.logType == LogTypeEnum.WINDOWS_EVENT:
        log_structure = LogStructure.RAW

    return convert_json_schema_data_type(
        json_schema=json_schema, engine_type=engine_type, log_structure=log_structure
    )
