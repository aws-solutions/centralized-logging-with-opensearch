# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import os
import sys
import copy
import pytest
from commonlib.dao import LogConfig
from util.utils import build_iis_field_format
from commonlib.model import (
    LogConfig,
    LogTypeEnum,
    RegularSpec,
    EngineType,
    LogStructure,
    IISLogParserEnum,
)


sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


REGEX = "(?<time>\\d{4}-\\d{2}-\\d{2}\\s*\\d{2}:\\d{2}:\\d{2}.\\d{3})\\s*(?<level>\\S+)\\s*\\[(?<thread>\\S+)\\]\\s*(?<logger>\\S+)\\s*:\\s*(?<message>[\\s\\S]+)"
TIME_FORMAT = "%Y-%m-%d %H:%M:%S.%L"
TEST_JSON_SCHEMA = {
    "type": "object",
    "format": "",
    "properties": {
        "processInfo": {
            "type": "object",
            "format": "",
            "properties": {
                "hostname": {"type": "text", "format": ""},
                "groupName": {"type": "text", "format": ""},
                "groupId": {"type": "text", "format": ""},
                "serviceId": {"type": "text", "format": ""},
                "serviceName": {"type": "text", "format": ""},
                "version": {"type": "text", "format": ""},
                "domainId": {"type": "text", "format": ""},
            },
        },
        "correlationId": {"type": "text", "format": ""},
        "transactionSummary": {
            "type": "object",
            "format": "",
            "properties": {
                "path": {"type": "text", "format": ""},
                "protocol": {"type": "text", "format": ""},
                "serviceContexts": {
                    "type": "array",
                    "format": "",
                    "items": {
                        "type": "object",
                        "format": "",
                        "properties": {
                            "app": {"type": "text", "format": ""},
                            "duration": {"type": "integer", "format": ""},
                            "method": {"type": "text", "format": ""},
                            "org": {"type": "text", "format": ""},
                            "service": {"type": "text", "format": ""},
                            "client": {"type": "text", "format": ""},
                            "monitor": {"type": "boolean", "format": ""},
                            "status": {"type": "text", "format": ""},
                        },
                    },
                },
                "protocolSrc": {"type": "text", "format": ""},
                "status": {"type": "text", "format": ""},
            },
        },
        "timestamp": {
            "type": "date",
            "format": "%Y-%m-%dT%H:%M:%SZ",
            "timeKey": True,
        },
        "timestamp2": {
            "type": "date",
            "format": "%Y-%m-%dT%H:%M:%S.%LZ",
            "timeKey": False,
        },
    },
}

TEST_ES_MAPPING = {
    "properties": {
        "processInfo": {
            "properties": {
                "hostname": {
                    "type": "text",
                    "fields": {"keyword": {"type": "keyword", "ignore_above": 256}},
                },
                "groupName": {
                    "type": "text",
                    "fields": {"keyword": {"type": "keyword", "ignore_above": 256}},
                },
                "groupId": {
                    "type": "text",
                    "fields": {"keyword": {"type": "keyword", "ignore_above": 256}},
                },
                "serviceId": {
                    "type": "text",
                    "fields": {"keyword": {"type": "keyword", "ignore_above": 256}},
                },
                "serviceName": {
                    "type": "text",
                    "fields": {"keyword": {"type": "keyword", "ignore_above": 256}},
                },
                "version": {
                    "type": "text",
                    "fields": {"keyword": {"type": "keyword", "ignore_above": 256}},
                },
                "domainId": {
                    "type": "text",
                    "fields": {"keyword": {"type": "keyword", "ignore_above": 256}},
                },
            }
        },
        "correlationId": {
            "type": "text",
            "fields": {"keyword": {"type": "keyword", "ignore_above": 256}},
        },
        "transactionSummary": {
            "properties": {
                "path": {
                    "type": "text",
                    "fields": {"keyword": {"type": "keyword", "ignore_above": 256}},
                },
                "protocol": {
                    "type": "text",
                    "fields": {"keyword": {"type": "keyword", "ignore_above": 256}},
                },
                "serviceContexts": {
                    "properties": {
                        "app": {
                            "type": "text",
                            "fields": {
                                "keyword": {"type": "keyword", "ignore_above": 256}
                            },
                        },
                        "duration": {"type": "integer"},
                        "method": {
                            "type": "text",
                            "fields": {
                                "keyword": {"type": "keyword", "ignore_above": 256}
                            },
                        },
                        "org": {
                            "type": "text",
                            "fields": {
                                "keyword": {"type": "keyword", "ignore_above": 256}
                            },
                        },
                        "service": {
                            "type": "text",
                            "fields": {
                                "keyword": {"type": "keyword", "ignore_above": 256}
                            },
                        },
                        "client": {
                            "type": "text",
                            "fields": {
                                "keyword": {"type": "keyword", "ignore_above": 256}
                            },
                        },
                        "monitor": {"type": "boolean"},
                        "status": {
                            "type": "text",
                            "fields": {
                                "keyword": {"type": "keyword", "ignore_above": 256}
                            },
                        },
                    }
                },
                "protocolSrc": {
                    "type": "text",
                    "fields": {"keyword": {"type": "keyword", "ignore_above": 256}},
                },
                "status": {
                    "type": "text",
                    "fields": {"keyword": {"type": "keyword", "ignore_above": 256}},
                },
            }
        },
        "@timestamp": {"type": "alias", "path": "timestamp"},
        "timestamp": {"type": "date"},
        "timestamp2": {
            "type": "date",
            "format": "yyyy-MM-dd'T'HH:mm:ss.SSS'Z' || yyyy-MM-dd'T'HH:mm:ss.SSSSSS'Z' || yyyy-MM-dd'T'HH:mm:ss.SSSSSSSSS'Z'",
        },
    }
}


def test_make_index_template_contains_at_timestamp():
    from util.utils import make_index_template

    config = LogConfig(
        version=0,
        name="test-config",
        logType=LogTypeEnum.JSON,
        jsonSchema={
            "type": "object",
            "format": "",
            "properties": {
                "@timestamp": {
                    "type": "date",
                    "format": "%Y-%m-%dT%H:%M:%SZ",
                    "timeKey": True,
                },
            },
        },
        regexFieldSpecs=[],
    )

    assert {
        "index_patterns": ["test-json-*"],
        "template": {
            "settings": {
                "index": {
                    "number_of_shards": 5,
                    "number_of_replicas": 1,
                    "codec": "best_compression",
                    "refresh_interval": "1s",
                    "plugins": {
                        "index_state_management": {"rollover_alias": "test-json"}
                    },
                }
            },
            "mappings": {"properties": {"@timestamp": {"type": "date"}}},
        },
    } == make_index_template(config, index_alias="test-json")

    config = LogConfig(
        version=0,
        name="test-config",
        logType=LogTypeEnum.JSON,
        jsonSchema={
            "type": "object",
            "format": "",
            "properties": {
                "@timestamp": {
                    "type": "date",
                    "format": "%Y-%m-%dT%H:%M:%SZ",
                    "timeKey": False,
                },
            },
        },
        regexFieldSpecs=[],
    )

    assert {
        "index_patterns": ["test-json-*"],
        "template": {
            "settings": {
                "index": {
                    "number_of_shards": 5,
                    "number_of_replicas": 1,
                    "codec": "best_compression",
                    "refresh_interval": "1s",
                    "plugins": {
                        "index_state_management": {"rollover_alias": "test-json"}
                    },
                }
            },
            "mappings": {
                "properties": {
                    "@timestamp": {
                        "type": "date",
                        "format": "yyyy-MM-dd'T'HH:mm:ss'Z' || yyyy-MM-dd'T'HH:mm:ss'Z' || yyyy-MM-dd'T'HH:mm:ss'Z'",
                    }
                }
            },
        },
    } == make_index_template(config, index_alias="test-json")


def test_make_index_template_json_schema():
    from util.utils import make_index_template

    config = LogConfig(
        version=0,
        name="test-config",
        logType=LogTypeEnum.JSON,
        jsonSchema=TEST_JSON_SCHEMA,
        regexFieldSpecs=[],
    )

    assert {
        "index_patterns": ["app-singleline-*"],
        "template": {
            "settings": {
                "index": {
                    "number_of_shards": 5,
                    "number_of_replicas": 1,
                    "codec": "best_compression",
                    "refresh_interval": "1s",
                    "plugins": {
                        "index_state_management": {"rollover_alias": "app-singleline"}
                    },
                }
            },
            "mappings": TEST_ES_MAPPING,
        },
    } == make_index_template(config, index_alias="app-singleline")


def test_make_index_template():
    from util.utils import make_index_template

    config = LogConfig(
        version=0,
        name="test-config",
        logType=LogTypeEnum.SINGLELINE_TEXT,
        regex="(?<log>.*)",
        timeKey="@timestamp",
        regexFieldSpecs=[
            RegularSpec(key="name", type="string"),
            RegularSpec(key="@timestamp", type="date", format="yyyy-MM-dd"),
        ],
    )

    assert {
        "index_patterns": ["app-singleline-*"],
        "template": {
            "settings": {
                "index": {
                    "number_of_shards": 5,
                    "number_of_replicas": 1,
                    "codec": "best_compression",
                    "refresh_interval": "1s",
                    "plugins": {
                        "index_state_management": {"rollover_alias": "app-singleline"}
                    },
                }
            },
            "mappings": {
                "properties": {
                    "name": {"type": "string"},
                    "@timestamp": {"type": "date"},
                }
            },
        },
    } == make_index_template(config, index_alias="app-singleline")

    config = LogConfig(
        version=0,
        name="test-config",
        logType=LogTypeEnum.SINGLELINE_TEXT,
        regex="(?<log>.*)",
        regexFieldSpecs=[
            RegularSpec(key="name", type="string"),
        ],
    )
    assert {
        "index_patterns": ["app-singleline-*"],
        "template": {
            "settings": {
                "index": {
                    "number_of_shards": 5,
                    "number_of_replicas": 1,
                    "codec": "best_compression",
                    "refresh_interval": "1s",
                    "plugins": {
                        "index_state_management": {"rollover_alias": "app-singleline"}
                    },
                }
            },
            "mappings": {"properties": {"name": {"type": "string"}}},
        },
    } == make_index_template(config, index_alias="app-singleline")

    config = LogConfig(
        version=0,
        name="test-config",
        logType=LogTypeEnum.SINGLELINE_TEXT,
        regex="(?<log>.*)",
        timeKey="time",
        regexFieldSpecs=[
            RegularSpec(key="name", type="string"),
            RegularSpec(key="time", type="date", format="yyyy-MM-dd"),
        ],
    )
    assert {
        "index_patterns": ["app-singleline-*"],
        "template": {
            "settings": {
                "index": {
                    "number_of_shards": 5,
                    "number_of_replicas": 1,
                    "codec": "best_compression",
                    "refresh_interval": "1s",
                    "plugins": {
                        "index_state_management": {"rollover_alias": "app-singleline"}
                    },
                }
            },
            "mappings": {
                "properties": {
                    "name": {"type": "string"},
                    "time": {"type": "date"},
                    "@timestamp": {"type": "alias", "path": "time"},
                }
            },
        },
    } == make_index_template(config, index_alias="app-singleline")

    assert {
        "index_patterns": ["app-singleline-*"],
        "template": {
            "settings": {
                "index": {
                    "number_of_shards": 2,
                    "number_of_replicas": 3,
                    "codec": "default",
                    "refresh_interval": "10s",
                    "plugins": {
                        "index_state_management": {"rollover_alias": "app-singleline"}
                    },
                }
            },
            "mappings": {
                "properties": {
                    "name": {"type": "string"},
                    "time": {"type": "date"},
                    "@timestamp": {"type": "alias", "path": "time"},
                }
            },
        },
    } == make_index_template(
        config,
        index_alias="app-singleline",
        number_of_replicas=3,
        number_of_shards=2,
        codec="default",
        refresh_interval="10s",
    )

    config = LogConfig(
        version=0,
        name="test-config",
        logType=LogTypeEnum.NGINX,
        regex="(?<log>.*)",
        regexFieldSpecs=[],
    )

    assert {
        "index_patterns": ["app-nginx-*"],
        "template": {
            "settings": {
                "index": {
                    "number_of_shards": 2,
                    "number_of_replicas": 3,
                    "codec": "default",
                    "refresh_interval": "10s",
                    "plugins": {
                        "index_state_management": {"rollover_alias": "app-nginx"}
                    },
                }
            },
            "mappings": {
                "properties": {
                    "@timestamp": {"type": "alias", "path": "time_local"},
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
            },
        },
    } == make_index_template(
        config,
        index_alias="app-nginx",
        number_of_shards=2,
        number_of_replicas=3,
        codec="default",
        refresh_interval="10s",
    )

    config = LogConfig(
        version=0,
        name="test-config",
        logType=LogTypeEnum.APACHE,
        regex="(?<log>.*)",
        regexFieldSpecs=[],
    )

    assert {
        "index_patterns": ["app-apache-*"],
        "template": {
            "settings": {
                "index": {
                    "number_of_shards": 2,
                    "number_of_replicas": 3,
                    "codec": "default",
                    "refresh_interval": "10s",
                    "plugins": {
                        "index_state_management": {"rollover_alias": "app-apache"}
                    },
                }
            },
            "mappings": {
                "properties": {
                    "@timestamp": {"type": "alias", "path": "time_local"},
                    "time_local": {
                        "type": "date",
                        "format": "dd/MMM/yyyy:HH:mm:ss Z||epoch_millis",
                    },
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
            },
        },
    } == make_index_template(
        config,
        index_alias="app-apache",
        number_of_shards=2,
        number_of_replicas=3,
        codec="default",
        refresh_interval="10s",
    )

    config = LogConfig(
        version=0,
        name="test-nginx-config",
        logType=LogTypeEnum.NGINX,
        jsonSchema={
            "type": "object",
            "properties": {
                "remote_addr": {"type": "ip"},
                "remote_user": {"type": "text"},
                "time_local": {
                    "type": "date",
                    "timeKey": True,
                    "format": "%d/%b/%Y:%H:%M:%S %z",
                },
                "request_method": {"type": "keyword"},
                "request_uri": {"type": "text"},
                "status": {"type": "integer"},
                "body_bytes_sent": {"type": "long"},
            },
        },
        regex='(?<remote_addr>\S+)\s+-\s+(?<remote_user>\S+)\s+\[(?<time_local>\d+/\S+/\d+:\d+:\d+:\d+\s+\S+)\]\s+"(?<request_method>\S+)\s+(?<request_uri>\S+)\s+\S+"\s+(?<status>\S+)\s+(?<body_bytes_sent>\S+).*',
        regexFieldSpecs=[
            RegularSpec(key="remote_addr", type="ip"),
            RegularSpec(key="remote_user", type="text"),
            RegularSpec(key="time_local", type="date", format="%d/%b/%Y:%H:%M:%S %z"),
            RegularSpec(key="request_method", type="keyword"),
            RegularSpec(key="request_uri", type="text"),
            RegularSpec(key="status", type="integer"),
            RegularSpec(key="body_bytes_sent", type="long"),
        ],
        timeKey="time_local",
    )
    assert {
        "index_patterns": ["app-nginx-json-schema-*"],
        "template": {
            "settings": {
                "index": {
                    "number_of_shards": 5,
                    "number_of_replicas": 1,
                    "codec": "best_compression",
                    "refresh_interval": "1s",
                    "plugins": {
                        "index_state_management": {
                            "rollover_alias": "app-nginx-json-schema"
                        }
                    },
                }
            },
            "mappings": {
                "properties": {
                    "@timestamp": {"type": "alias", "path": "time_local"},
                    "remote_addr": {"type": "ip"},
                    "remote_user": {"type": "text"},
                    "time_local": {
                        "type": "date",
                    },
                    "request_method": {
                        "type": "keyword",
                    },
                    "request_uri": {"type": "text"},
                    "status": {"type": "integer"},
                    "body_bytes_sent": {"type": "long"},
                },
            },
        },
    } == make_index_template(config, index_alias="app-nginx-json-schema")


def test_strptime_to_joda():
    from util.utils import strptime_to_joda

    assert strptime_to_joda("%Y-%m-%d") == "yyyy-MM-dd"
    assert (
        strptime_to_joda("azs%Y-%m-%dTz%H:%M:%S%zzz%")
        == "'azs'yyyy-MM-dd'Tz'HH:mm:ssZ'zz'%"
    )
    assert strptime_to_joda("") == ""
    assert strptime_to_joda("abc%Ydef") == "'abc'yyyy'def'"
    assert (
        strptime_to_joda("%Y-%m-%d : %H-%M-%S.%f") == "yyyy-MM-dd : HH-mm-ss.SSSSSSSSS"
    )
    assert strptime_to_joda("%Y-%m-%dT%H:%M:%S%z") == "yyyy-MM-dd'T'HH:mm:ssZ"
    assert strptime_to_joda("abcde") == "'abcde'"
    assert strptime_to_joda("%Y-%G") == "yyyy-yyyy"
    assert strptime_to_joda("%Y-%i") == "yyyy-%'i'"
    assert strptime_to_joda("") == ""


def test_convert_time_key_format():
    from util.utils import convert_time_key_format

    time_key_format = convert_time_key_format(
        fmt="%Y-%m-%d", log_structure=LogStructure.FLUENT_BIT_PARSED_JSON
    )
    assert time_key_format == "yyyy-MM-dd''T''HH:mm:ss.SSSSSSSSSZ"

    time_key_format = convert_time_key_format(
        fmt="%Y-%m-%d %H:%M:%S", log_structure=LogStructure.RAW
    )
    assert time_key_format == "yyyy-MM-dd HH:mm:ss"

    time_key_format = convert_time_key_format(
        fmt="%Y-%m-%dT%H:%M:%S.%f %z", log_structure=LogStructure.RAW
    )
    assert time_key_format == "yyyy-MM-dd''T''HH:mm:ss.SSSSSSSSS Z"


def test_covert_data_type_from_aos_to_athena():
    from util.utils import covert_data_type_from_aos_to_athena

    assert covert_data_type_from_aos_to_athena(aos_type="boolean") == "boolean"
    assert covert_data_type_from_aos_to_athena(aos_type="byte") == "tiny_int"
    assert covert_data_type_from_aos_to_athena(aos_type="short") == "small_int"
    assert covert_data_type_from_aos_to_athena(aos_type="integer") == "integer"
    assert covert_data_type_from_aos_to_athena(aos_type="long") == "big_int"
    assert covert_data_type_from_aos_to_athena(aos_type="float") == "float"
    assert covert_data_type_from_aos_to_athena(aos_type="half_float") == "float"
    assert covert_data_type_from_aos_to_athena(aos_type="scaled_float") == "double"
    assert covert_data_type_from_aos_to_athena(aos_type="double") == "double"
    assert covert_data_type_from_aos_to_athena(aos_type="keyword") == "string"
    assert covert_data_type_from_aos_to_athena(aos_type="text") == "string"
    assert covert_data_type_from_aos_to_athena(aos_type="date") == "timestamp"
    assert covert_data_type_from_aos_to_athena(aos_type="ip") == "string"
    assert covert_data_type_from_aos_to_athena(aos_type="binary") == "binary"
    assert covert_data_type_from_aos_to_athena(aos_type="map") == "map"
    assert covert_data_type_from_aos_to_athena(aos_type="object") == "object"
    assert covert_data_type_from_aos_to_athena(aos_type="array") == "array"
    assert covert_data_type_from_aos_to_athena(aos_type="do-not-supported") == "string"


def test_pop_invalid_key():
    from util.utils import pop_invalid_key

    assert pop_invalid_key(json_schema={"format": ""}) == {}
    assert pop_invalid_key(json_schema={"format": None}) == {}


def test_convert_json_schema_for_light_engine():
    from util.utils import convert_json_schema_data_type_for_light_engine

    json_schema = {
        "type": "object",
        "format": "",
        "properties": {
            "startTime": {
                "type": "date",
                "timeKey": True,
                "format": "%Y-%m-%dT%H:%M:%S%z",
            },
            "endTime": {"type": "date", "format": "%Y-%m-%dT%H:%M:%S"},
            "log": {
                "type": "map",
                "format": "",
                "properties": {
                    "key": {"type": "text", "format": ""},
                    "value": {"type": "text"},
                },
            },
            "processInfo": {
                "type": "object",
                "properties": {
                    "host": {"type": "keyword"},
                    "service": {"type": "keyword"},
                },
            },
            "serviceContext": {"type": "array", "items": {"type": "integer"}},
            "method": {
                "type": "text",
            },
        },
    }

    new_json_schema = convert_json_schema_data_type_for_light_engine(
        json_schema=copy.deepcopy(json_schema),
        log_structure=LogStructure.FLUENT_BIT_PARSED_JSON,
    )
    assert new_json_schema == {
        "type": "object",
        "properties": {
            "startTime": {
                "type": "timestamp",
                "timeKey": True,
                "format": "yyyy-MM-dd''T''HH:mm:ss.SSSSSSSSSZ",
            },
            "endTime": {"type": "timestamp", "format": "yyyy-MM-dd''T''HH:mm:ss"},
            "log": {
                "type": "map",
                "properties": {
                    "key": {
                        "type": "string",
                    },
                    "value": {"type": "string"},
                },
            },
            "processInfo": {
                "type": "object",
                "properties": {
                    "host": {"type": "string"},
                    "service": {"type": "string"},
                },
            },
            "serviceContext": {"type": "array", "items": {"type": "integer"}},
            "method": {
                "type": "string",
            },
        },
    }

    new_json_schema = convert_json_schema_data_type_for_light_engine(
        json_schema=copy.deepcopy(json_schema), log_structure=LogStructure.RAW
    )
    assert new_json_schema == {
        "type": "object",
        "properties": {
            "startTime": {
                "type": "timestamp",
                "timeKey": True,
                "format": "yyyy-MM-dd''T''HH:mm:ssZ",
            },
            "endTime": {"type": "timestamp", "format": "yyyy-MM-dd''T''HH:mm:ss"},
            "log": {
                "type": "map",
                "properties": {
                    "key": {
                        "type": "string",
                    },
                    "value": {"type": "string"},
                },
            },
            "processInfo": {
                "type": "object",
                "properties": {
                    "host": {"type": "string"},
                    "service": {"type": "string"},
                },
            },
            "serviceContext": {"type": "array", "items": {"type": "integer"}},
            "method": {
                "type": "string",
            },
        },
    }

    json_schema = {
        "type": "object",
        "format": "",
        "properties": {
            "startTime": {"type": "date", "timeKey": True, "format": "epoch_millis"},
            "method": {
                "type": "text",
            },
        },
    }

    new_json_schema = convert_json_schema_data_type_for_light_engine(
        json_schema=copy.deepcopy(json_schema),
        log_structure=LogStructure.FLUENT_BIT_PARSED_JSON,
    )
    assert new_json_schema == {
        "type": "object",
        "properties": {
            "startTime": {
                "type": "timestamp",
                "timeKey": True,
                "format": "yyyy-MM-dd''T''HH:mm:ss.SSSSSSSSSZ",
            },
            "method": {"type": "string"},
        },
    }


def test_convert_json_schema():
    from util.utils import convert_json_schema_data_type

    json_schema = {
        "type": "object",
        "format": "",
        "properties": {
            "startTime": {
                "type": "date",
                "timeKey": True,
                "format": "%Y-%m-%dT%H:%M:%S%z",
            },
            "log": {
                "type": "map",
                "format": "",
                "properties": {
                    "key": {"type": "text", "format": ""},
                    "value": {"type": "text"},
                },
            },
            "processInfo": {
                "type": "object",
                "properties": {
                    "host": {"type": "keyword"},
                    "service": {"type": "keyword"},
                },
            },
            "serviceContext": {"type": "array", "items": {"type": "integer"}},
            "method": {
                "type": "text",
            },
        },
    }

    new_json_schema = convert_json_schema_data_type(
        json_schema=copy.deepcopy(json_schema),
        log_structure=LogStructure.FLUENT_BIT_PARSED_JSON,
        engine_type=EngineType.LIGHT_ENGINE,
    )
    assert new_json_schema == {
        "type": "object",
        "properties": {
            "startTime": {
                "type": "timestamp",
                "timeKey": True,
                "format": "yyyy-MM-dd''T''HH:mm:ss.SSSSSSSSSZ",
            },
            "log": {
                "type": "map",
                "properties": {
                    "key": {
                        "type": "string",
                    },
                    "value": {"type": "string"},
                },
            },
            "processInfo": {
                "type": "object",
                "properties": {
                    "host": {"type": "string"},
                    "service": {"type": "string"},
                },
            },
            "serviceContext": {"type": "array", "items": {"type": "integer"}},
            "method": {
                "type": "string",
            },
        },
    }

    new_json_schema = convert_json_schema_data_type(
        json_schema=copy.deepcopy(json_schema),
        log_structure=LogStructure.RAW,
        engine_type=EngineType.LIGHT_ENGINE,
    )
    assert new_json_schema == {
        "type": "object",
        "properties": {
            "startTime": {
                "type": "timestamp",
                "timeKey": True,
                "format": "yyyy-MM-dd''T''HH:mm:ssZ",
            },
            "log": {
                "type": "map",
                "properties": {
                    "key": {
                        "type": "string",
                    },
                    "value": {"type": "string"},
                },
            },
            "processInfo": {
                "type": "object",
                "properties": {
                    "host": {"type": "string"},
                    "service": {"type": "string"},
                },
            },
            "serviceContext": {"type": "array", "items": {"type": "integer"}},
            "method": {
                "type": "string",
            },
        },
    }

    new_json_schema = convert_json_schema_data_type(
        json_schema=copy.deepcopy(json_schema),
        log_structure=LogStructure.FLUENT_BIT_PARSED_JSON,
        engine_type=EngineType.OPEN_SEARCH,
    )
    assert new_json_schema == json_schema

    new_json_schema = convert_json_schema_data_type(
        json_schema=copy.deepcopy(json_schema),
        log_structure=LogStructure.RAW,
        engine_type=EngineType.OPEN_SEARCH,
    )
    assert new_json_schema == json_schema

    json_schema = {
        "type": "object",
        "format": "",
        "properties": {
            "startTime": {"type": "date", "timeKey": True, "format": "epoch_millis"},
            "method": {
                "type": "text",
            },
        },
    }
    new_json_schema = convert_json_schema_data_type(
        json_schema=copy.deepcopy(json_schema),
        log_structure=LogStructure.FLUENT_BIT_PARSED_JSON,
        engine_type=EngineType.OPEN_SEARCH,
    )
    assert new_json_schema == json_schema

    new_json_schema = convert_json_schema_data_type(
        json_schema=copy.deepcopy(json_schema),
        log_structure=LogStructure.RAW,
        engine_type=EngineType.OPEN_SEARCH,
    )
    assert new_json_schema == json_schema

    new_json_schema = convert_json_schema_data_type(
        json_schema=copy.deepcopy(json_schema),
        log_structure=LogStructure.FLUENT_BIT_PARSED_JSON,
        engine_type=EngineType.LIGHT_ENGINE,
    )
    assert new_json_schema == {
        "type": "object",
        "properties": {
            "startTime": {
                "type": "timestamp",
                "timeKey": True,
                "format": "yyyy-MM-dd''T''HH:mm:ss.SSSSSSSSSZ",
            },
            "method": {"type": "string"},
        },
    }

    new_json_schema = convert_json_schema_data_type(
        json_schema=copy.deepcopy(json_schema),
        log_structure=LogStructure.RAW,
        engine_type=EngineType.LIGHT_ENGINE,
    )
    assert new_json_schema == {
        "type": "object",
        "properties": {
            "startTime": {
                "type": "timestamp",
                "timeKey": True,
                "format": "''epoch_millis''",
            },
            "method": {"type": "string"},
        },
    }

    json_schema = {
        "type": "object",
        "format": "",
        "properties": {
            "startTime": {
                "type": "epoch_millis",
                "timeKey": True,
            },
            "method": {
                "type": "text",
            },
        },
    }
    new_json_schema = convert_json_schema_data_type(
        json_schema=copy.deepcopy(json_schema),
        log_structure=LogStructure.FLUENT_BIT_PARSED_JSON,
        engine_type=EngineType.LIGHT_ENGINE,
    )
    assert new_json_schema == {
        "type": "object",
        "properties": {
            "startTime": {"type": "big_int", "timeKey": True, "format": "epoch_millis"},
            "method": {"type": "string"},
        },
    }

    json_schema = {
        "type": "object",
        "format": "",
        "properties": {
            "startTime": {
                "type": "epoch_second",
                "timeKey": True,
            },
            "method": {
                "type": "text",
            },
        },
    }
    new_json_schema = convert_json_schema_data_type(
        json_schema=copy.deepcopy(json_schema),
        log_structure=LogStructure.FLUENT_BIT_PARSED_JSON,
        engine_type=EngineType.LIGHT_ENGINE,
    )
    assert new_json_schema == {
        "type": "object",
        "properties": {
            "startTime": {"type": "big_int", "timeKey": True, "format": "epoch_second"},
            "method": {"type": "string"},
        },
    }


def test_generate_json_schema_based_on_regex_field_specs():
    from util.utils import generate_json_schema_based_on_regex_field_specs

    regex_field_specs = [
        RegularSpec(key="timestamp", type="date", format="%Y-%m-%d %H:%M:%S,%L"),
        RegularSpec(key="level", type="text", format=None),
        RegularSpec(key="by", type="text", format=None),
        RegularSpec(key="function", type="text", format=None),
        RegularSpec(key="line", type="text", format=None),
        RegularSpec(key="message", type="text", format=None),
    ]

    json_schema = generate_json_schema_based_on_regex_field_specs(
        regex_field_specs=regex_field_specs, time_key="timestamp"
    )
    assert json_schema == {
        "type": "object",
        "properties": {
            "timestamp": {
                "type": "date",
                "timeKey": True,
                "format": "%Y-%m-%d %H:%M:%S,%L",
            },
            "level": {"type": "text"},
            "by": {"type": "text"},
            "function": {"type": "text"},
            "line": {"type": "text"},
            "message": {"type": "text"},
        },
    }


def test_generate_json_schema_for_apache():
    from util.utils import generate_json_schema_for_apache

    user_log_format = r"not a LogFormat"
    with pytest.raises(Exception) as exception_info:
        generate_json_schema_for_apache(user_log_format=user_log_format)
    assert exception_info.value.args[0] == "Incorrect user log format: not a LogFormat"

    user_log_format = r'LogFormat "%h %l %u %t \"%r\" %>s %b" combined'
    assert generate_json_schema_for_apache(user_log_format=user_log_format) == {
        "type": "object",
        "properties": {
            "response_size_bytes": {"type": "long"},
            "remote_addr": {"type": "ip"},
            "remote_ident": {"type": "text"},
            "request_method": {"type": "keyword"},
            "request_uri": {"type": "text"},
            "request_protocol": {"type": "text"},
            "status": {"type": "integer"},
            "time_local": {
                "type": "date",
                "timeKey": True,
                "format": "%d/%b/%Y:%H:%M:%S %z",
            },
            "remote_user": {"type": "text"},
        },
    }

    user_log_format = r'LogFormat   "%h  %l  %u  %t  \"%r\"  %>s  %b    "   combined  '
    assert generate_json_schema_for_apache(user_log_format=user_log_format) == {
        "type": "object",
        "properties": {
            "response_size_bytes": {"type": "long"},
            "remote_addr": {"type": "ip"},
            "remote_ident": {"type": "text"},
            "request_method": {"type": "keyword"},
            "request_uri": {"type": "text"},
            "request_protocol": {"type": "text"},
            "status": {"type": "integer"},
            "time_local": {
                "type": "date",
                "timeKey": True,
                "format": "%d/%b/%Y:%H:%M:%S %z",
            },
            "remote_user": {"type": "text"},
        },
    }

    user_log_format = r'LogFormat "%a %{c}a %A %B %b %D %f %h %H %k %l %L %m %p %P %q \"%r\" %R %s %>s %t %T %u %U %v %V %X %I %O %S %{User-Agent}i %{Referer}i" combined'
    assert generate_json_schema_for_apache(user_log_format=user_log_format) == {
        "type": "object",
        "properties": {
            "client_addr": {"type": "text"},
            "connect_addr": {"type": "text"},
            "local_addr": {"type": "text"},
            "response_bytes": {"type": "integer"},
            "response_size_bytes": {"type": "long"},
            "request_time_msec": {"type": "integer"},
            "filename": {"type": "text"},
            "remote_addr": {"type": "ip"},
            "request_protocol_supple": {"type": "text"},
            "keep_alive": {"type": "integer"},
            "remote_ident": {"type": "text"},
            "error_log": {"type": "integer"},
            "request_method_supple": {"type": "text"},
            "remote_port": {"type": "integer"},
            "child_process": {"type": "integer"},
            "request_query": {"type": "text"},
            "request_method": {"type": "keyword"},
            "request_uri": {"type": "text"},
            "request_protocol": {"type": "text"},
            "response_handler": {"type": "text"},
            "status": {"type": "integer"},
            "time_local": {
                "type": "date",
                "timeKey": True,
                "format": "%d/%b/%Y:%H:%M:%S %z",
            },
            "request_time_sec": {"type": "double"},
            "remote_user": {"type": "text"},
            "request_uri_supple": {"type": "text"},
            "server_name": {"type": "text"},
            "server_name_canonical": {"type": "text"},
            "status_completed": {"type": "text"},
            "bytes_received": {"type": "integer"},
            "bytes_sent": {"type": "integer"},
            "bytes_combination": {"type": "text"},
            "http_user_agent": {"type": "text"},
            "http_referer": {"type": "text"},
        },
    }


def test_generate_json_schema_for_nginx():
    from util.utils import generate_json_schema_for_nginx

    user_log_format = "log_format main  "
    assert generate_json_schema_for_nginx(user_log_format=user_log_format) == {
        "type": "object",
        "properties": {},
    }

    user_log_format = "log_format main  '$remote_addr - $remote_user [$time_local] \"$request\" '   $status $body_bytes_sent $bytes_sent $connection $connection_requests $http_referer $http_user_agent $http_x_forwarded_for $host $msec $pipe $request_method $request_uri $request_length $request_time $status $time_iso8601 $time_local $do_not_exists;"
    assert generate_json_schema_for_nginx(user_log_format=user_log_format) == {
        "type": "object",
        "properties": {
            "remote_addr": {"type": "text"},
            "remote_user": {"type": "text"},
            "time_local": {
                "type": "date",
                "timeKey": True,
                "format": "%d/%b/%Y:%H:%M:%S %z",
            },
            "status": {"type": "integer"},
            "bytes_sent": {"type": "long"},
            "body_bytes_sent": {"type": "long"},
            "connection": {"type": "long"},
            "connection_requests": {"type": "long"},
            "http_referer": {"type": "text"},
            "http_user_agent": {"type": "text"},
            "http_x_forwarded_for": {"type": "text"},
            "host": {"type": "text"},
            "msec": {"type": "double"},
            "pipe": {"type": "text"},
            "request_method": {"type": "keyword"},
            "request_uri": {"type": "text"},
            "request_length": {"type": "long"},
            "request_time": {"type": "float"},
            "time_iso8601": {
                "type": "date",
                "timeKey": True,
                "format": "%Y-%m-%dT%H:%M:%S%z",
            },
            "do_not_exists": {"type": "text"},
        },
    }


def test_get_json_schema():
    from util.utils import get_json_schema

    # test json
    json_log_conf = LogConfig(
        version=1,
        name="json",
        logType=LogTypeEnum.JSON,
        regexFieldSpecs=[],
        jsonSchema=TEST_JSON_SCHEMA,
        userLogFormat="",
        timeKey="",
    )
    assert get_json_schema(
        log_conf=json_log_conf,
        log_structure=LogStructure.FLUENT_BIT_PARSED_JSON,
        engine_type=EngineType.LIGHT_ENGINE,
    ) == {
        "type": "object",
        "properties": {
            "processInfo": {
                "type": "object",
                "properties": {
                    "hostname": {"type": "string"},
                    "groupName": {"type": "string"},
                    "groupId": {"type": "string"},
                    "serviceId": {"type": "string"},
                    "serviceName": {"type": "string"},
                    "version": {"type": "string"},
                    "domainId": {"type": "string"},
                },
            },
            "correlationId": {"type": "string"},
            "transactionSummary": {
                "type": "object",
                "properties": {
                    "path": {"type": "string"},
                    "protocol": {"type": "string"},
                    "serviceContexts": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "app": {"type": "string"},
                                "duration": {"type": "integer"},
                                "method": {"type": "string"},
                                "org": {"type": "string"},
                                "service": {"type": "string"},
                                "client": {"type": "string"},
                                "monitor": {"type": "boolean"},
                                "status": {"type": "string"},
                            },
                        },
                    },
                    "protocolSrc": {"type": "string"},
                    "status": {"type": "string"},
                },
            },
            "timestamp": {
                "type": "timestamp",
                "format": "yyyy-MM-dd''T''HH:mm:ss.SSSSSSSSSZ",
                "timeKey": True,
            },
            "timestamp2": {
                "type": "timestamp",
                "format": "yyyy-MM-dd''T''HH:mm:ss.SSSSSS''Z''",
                "timeKey": False,
            },
        },
    }

    assert get_json_schema(
        log_conf=json_log_conf,
        log_structure=LogStructure.RAW,
        engine_type=EngineType.LIGHT_ENGINE,
    ) == {
        "type": "object",
        "properties": {
            "processInfo": {
                "type": "object",
                "properties": {
                    "hostname": {"type": "string"},
                    "groupName": {"type": "string"},
                    "groupId": {"type": "string"},
                    "serviceId": {"type": "string"},
                    "serviceName": {"type": "string"},
                    "version": {"type": "string"},
                    "domainId": {"type": "string"},
                },
            },
            "correlationId": {"type": "string"},
            "transactionSummary": {
                "type": "object",
                "properties": {
                    "path": {"type": "string"},
                    "protocol": {"type": "string"},
                    "serviceContexts": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "app": {"type": "string"},
                                "duration": {"type": "integer"},
                                "method": {"type": "string"},
                                "org": {"type": "string"},
                                "service": {"type": "string"},
                                "client": {"type": "string"},
                                "monitor": {"type": "boolean"},
                                "status": {"type": "string"},
                            },
                        },
                    },
                    "protocolSrc": {"type": "string"},
                    "status": {"type": "string"},
                },
            },
            "timestamp": {
                "type": "timestamp",
                "format": "yyyy-MM-dd''T''HH:mm:ss''Z''",
                "timeKey": True,
            },
            "timestamp2": {
                "type": "timestamp",
                "format": "yyyy-MM-dd''T''HH:mm:ss.SSSSSS''Z''",
                "timeKey": False,
            },
        },
    }

    assert (
        get_json_schema(
            log_conf=json_log_conf,
            log_structure=LogStructure.FLUENT_BIT_PARSED_JSON,
            engine_type=EngineType.OPEN_SEARCH,
        )
        == json_log_conf.jsonSchema
    )

    assert get_json_schema(
        log_conf=json_log_conf,
        log_structure=LogStructure.RAW,
        engine_type=EngineType.OPEN_SEARCH,
    ) == {
        "type": "object",
        "format": "",
        "properties": {
            "processInfo": {
                "type": "object",
                "format": "",
                "properties": {
                    "hostname": {"type": "text", "format": ""},
                    "groupName": {"type": "text", "format": ""},
                    "groupId": {"type": "text", "format": ""},
                    "serviceId": {"type": "text", "format": ""},
                    "serviceName": {"type": "text", "format": ""},
                    "version": {"type": "text", "format": ""},
                    "domainId": {"type": "text", "format": ""},
                },
            },
            "correlationId": {"type": "text", "format": ""},
            "transactionSummary": {
                "type": "object",
                "format": "",
                "properties": {
                    "path": {"type": "text", "format": ""},
                    "protocol": {"type": "text", "format": ""},
                    "serviceContexts": {
                        "type": "array",
                        "format": "",
                        "items": {
                            "type": "object",
                            "format": "",
                            "properties": {
                                "app": {"type": "text", "format": ""},
                                "duration": {"type": "integer", "format": ""},
                                "method": {"type": "text", "format": ""},
                                "org": {"type": "text", "format": ""},
                                "service": {"type": "text", "format": ""},
                                "client": {"type": "text", "format": ""},
                                "monitor": {"type": "boolean", "format": ""},
                                "status": {"type": "text", "format": ""},
                            },
                        },
                    },
                    "protocolSrc": {"type": "text", "format": ""},
                    "status": {"type": "text", "format": ""},
                },
            },
            "timestamp": {
                "type": "date",
                "format": "%Y-%m-%dT%H:%M:%SZ",
                "timeKey": True,
            },
            "timestamp2": {
                "type": "date",
                "format": "%Y-%m-%dT%H:%M:%S.%LZ",
                "timeKey": False,
            },
        },
    }

    # test apache
    apache_log_conf = LogConfig(
        version=1,
        name="apache",
        logType=LogTypeEnum.APACHE,
        regexFieldSpecs=[],
        jsonSchema={},
        userLogFormat='LogFormat "%h %l %u %t "%r" %>s %b" combined',
        timeKey="",
    )

    assert get_json_schema(
        log_conf=apache_log_conf,
        log_structure=LogStructure.FLUENT_BIT_PARSED_JSON,
        engine_type=EngineType.LIGHT_ENGINE,
    ) == {
        "type": "object",
        "properties": {
            "response_size_bytes": {"type": "big_int"},
            "remote_addr": {"type": "string"},
            "remote_ident": {"type": "string"},
            "request_method": {"type": "string"},
            "request_uri": {"type": "string"},
            "request_protocol": {"type": "string"},
            "status": {"type": "integer"},
            "time_local": {
                "type": "timestamp",
                "timeKey": True,
                "format": "dd/MMM/yyyy:HH:mm:ss Z",
            },
            "remote_user": {"type": "string"},
        },
    }

    assert get_json_schema(
        log_conf=apache_log_conf,
        log_structure=LogStructure.RAW,
        engine_type=EngineType.LIGHT_ENGINE,
    ) == {
        "type": "object",
        "properties": {
            "response_size_bytes": {"type": "big_int"},
            "remote_addr": {"type": "string"},
            "remote_ident": {"type": "string"},
            "request_method": {"type": "string"},
            "request_uri": {"type": "string"},
            "request_protocol": {"type": "string"},
            "status": {"type": "integer"},
            "time_local": {
                "type": "timestamp",
                "timeKey": True,
                "format": "dd/MMM/yyyy:HH:mm:ss Z",
            },
            "remote_user": {"type": "string"},
        },
    }

    assert get_json_schema(
        log_conf=apache_log_conf,
        log_structure=LogStructure.FLUENT_BIT_PARSED_JSON,
        engine_type=EngineType.OPEN_SEARCH,
    ) == {
        "type": "object",
        "properties": {
            "response_size_bytes": {"type": "long"},
            "remote_addr": {"type": "ip"},
            "remote_ident": {"type": "text"},
            "request_method": {"type": "keyword"},
            "request_uri": {"type": "text"},
            "request_protocol": {"type": "text"},
            "status": {"type": "integer"},
            "time_local": {
                "type": "date",
                "timeKey": True,
                "format": "%d/%b/%Y:%H:%M:%S %z",
            },
            "remote_user": {"type": "text"},
        },
    }

    # test nginx
    nginx_log_conf = LogConfig(
        version=1,
        name="nginx",
        logType=LogTypeEnum.NGINX,
        regexFieldSpecs=[],
        jsonSchema={},
        userLogFormat="log_format main  '$remote_addr - $remote_user [$time_local] \"$request\" '   '$status $body_bytes_sent';",
        timeKey="",
    )
    assert get_json_schema(
        log_conf=nginx_log_conf,
        log_structure=LogStructure.FLUENT_BIT_PARSED_JSON,
        engine_type=EngineType.LIGHT_ENGINE,
    ) == {
        "type": "object",
        "properties": {
            "remote_addr": {"type": "string"},
            "remote_user": {"type": "string"},
            "time_local": {
                "type": "timestamp",
                "timeKey": True,
                "format": "dd/MMM/yyyy:HH:mm:ss Z",
            },
            "request_method": {"type": "string"},
            "request_uri": {"type": "string"},
            "status": {"type": "integer"},
            "body_bytes_sent": {"type": "big_int"},
        },
    }

    assert get_json_schema(
        log_conf=nginx_log_conf,
        log_structure=LogStructure.RAW,
        engine_type=EngineType.LIGHT_ENGINE,
    ) == {
        "type": "object",
        "properties": {
            "remote_addr": {"type": "string"},
            "remote_user": {"type": "string"},
            "time_local": {
                "type": "timestamp",
                "timeKey": True,
                "format": "dd/MMM/yyyy:HH:mm:ss Z",
            },
            "request_method": {"type": "string"},
            "request_uri": {"type": "string"},
            "status": {"type": "integer"},
            "body_bytes_sent": {"type": "big_int"},
        },
    }

    assert get_json_schema(
        log_conf=nginx_log_conf,
        log_structure=LogStructure.FLUENT_BIT_PARSED_JSON,
        engine_type=EngineType.OPEN_SEARCH,
    ) == {
        "type": "object",
        "properties": {
            "remote_addr": {"type": "text"},
            "remote_user": {"type": "text"},
            "time_local": {
                "type": "date",
                "timeKey": True,
                "format": "%d/%b/%Y:%H:%M:%S %z",
            },
            "request_method": {"type": "keyword"},
            "request_uri": {"type": "text"},
            "status": {"type": "integer"},
            "body_bytes_sent": {"type": "long"},
        },
    }

    assert get_json_schema(
        log_conf=nginx_log_conf,
        log_structure=LogStructure.RAW,
        engine_type=EngineType.OPEN_SEARCH,
    ) == {
        "type": "object",
        "properties": {
            "remote_addr": {"type": "text"},
            "remote_user": {"type": "text"},
            "time_local": {
                "type": "date",
                "timeKey": True,
                "format": "%d/%b/%Y:%H:%M:%S %z",
            },
            "request_method": {"type": "keyword"},
            "request_uri": {"type": "text"},
            "status": {"type": "integer"},
            "body_bytes_sent": {"type": "long"},
        },
    }

    # test regex field specs
    regex_field_specs_log_conf = LogConfig(
        version=1,
        name="single-line",
        logType=LogTypeEnum.SINGLELINE_TEXT,
        regexFieldSpecs=[
            RegularSpec(key="remote_addr", type="text", format=None),
            RegularSpec(key="remote_user", type="text", format=None),
            RegularSpec(key="time_local", type="date", format="%d/%b/%Y:%H:%M:%S"),
            RegularSpec(key="request_method", type="text", format=None),
            RegularSpec(key="request_uri", type="text", format=None),
            RegularSpec(key="status", type="text", format=None),
            RegularSpec(key="body_bytes_sent", type="text", format=None),
        ],
        jsonSchema={},
        userLogFormat=r'(?<remote_addr>\S+)\s+-\s+(?<remote_user>\S+)\s+\[(?<time_local>\d+\S+\d+:\d+:\d+:\d+)\s+\S+\]\s+"(?<request_method>\S+)\s+(?<request_uri>\S+)\s+\S+"\s+(?<status>\S+)\s+(?<body_bytes_sent>\S+)',
        timeKey="time_local",
    )

    assert get_json_schema(
        log_conf=regex_field_specs_log_conf,
        log_structure=LogStructure.FLUENT_BIT_PARSED_JSON,
        engine_type=EngineType.LIGHT_ENGINE,
    ) == {
        "type": "object",
        "properties": {
            "remote_addr": {"type": "string"},
            "remote_user": {"type": "string"},
            "time_local": {
                "type": "timestamp",
                "timeKey": True,
                "format": "yyyy-MM-dd''T''HH:mm:ss.SSSSSSSSSZ",
            },
            "request_method": {"type": "string"},
            "request_uri": {"type": "string"},
            "status": {"type": "string"},
            "body_bytes_sent": {"type": "string"},
        },
    }

    assert get_json_schema(
        log_conf=regex_field_specs_log_conf,
        log_structure=LogStructure.RAW,
        engine_type=EngineType.LIGHT_ENGINE,
    ) == {
        "type": "object",
        "properties": {
            "remote_addr": {"type": "string"},
            "remote_user": {"type": "string"},
            "time_local": {
                "type": "timestamp",
                "timeKey": True,
                "format": "dd/MMM/yyyy:HH:mm:ss",
            },
            "request_method": {"type": "string"},
            "request_uri": {"type": "string"},
            "status": {"type": "string"},
            "body_bytes_sent": {"type": "string"},
        },
    }

    assert get_json_schema(
        log_conf=regex_field_specs_log_conf,
        log_structure=LogStructure.FLUENT_BIT_PARSED_JSON,
        engine_type=EngineType.LIGHT_ENGINE,
    ) == {
        "type": "object",
        "properties": {
            "remote_addr": {"type": "string"},
            "remote_user": {"type": "string"},
            "time_local": {
                "type": "timestamp",
                "timeKey": True,
                "format": "yyyy-MM-dd''T''HH:mm:ss.SSSSSSSSSZ",
            },
            "request_method": {"type": "string"},
            "request_uri": {"type": "string"},
            "status": {"type": "string"},
            "body_bytes_sent": {"type": "string"},
        },
    }

    assert get_json_schema(
        log_conf=regex_field_specs_log_conf,
        log_structure=LogStructure.RAW,
        engine_type=EngineType.LIGHT_ENGINE,
    ) == {
        "type": "object",
        "properties": {
            "remote_addr": {"type": "string"},
            "remote_user": {"type": "string"},
            "time_local": {
                "type": "timestamp",
                "timeKey": True,
                "format": "dd/MMM/yyyy:HH:mm:ss",
            },
            "request_method": {"type": "string"},
            "request_uri": {"type": "string"},
            "status": {"type": "string"},
            "body_bytes_sent": {"type": "string"},
        },
    }

    assert get_json_schema(
        log_conf=regex_field_specs_log_conf,
        log_structure=LogStructure.FLUENT_BIT_PARSED_JSON,
        engine_type=EngineType.OPEN_SEARCH,
    ) == {
        "type": "object",
        "properties": {
            "remote_addr": {"type": "text"},
            "remote_user": {"type": "text"},
            "time_local": {
                "type": "date",
                "timeKey": True,
                "format": "%d/%b/%Y:%H:%M:%S",
            },
            "request_method": {"type": "text"},
            "request_uri": {"type": "text"},
            "status": {"type": "text"},
            "body_bytes_sent": {"type": "text"},
        },
    }

    assert get_json_schema(
        log_conf=regex_field_specs_log_conf,
        log_structure=LogStructure.RAW,
        engine_type=EngineType.OPEN_SEARCH,
    ) == {
        "type": "object",
        "properties": {
            "remote_addr": {"type": "text"},
            "remote_user": {"type": "text"},
            "time_local": {
                "type": "date",
                "timeKey": True,
                "format": "%d/%b/%Y:%H:%M:%S",
            },
            "request_method": {"type": "text"},
            "request_uri": {"type": "text"},
            "status": {"type": "text"},
            "body_bytes_sent": {"type": "text"},
        },
    }


def test_json_schema_to_es_mapping():
    from util.utils import json_schema_to_es_mapping

    # json contains array
    assert {
        "properties": {
            "data": {
                "properties": {
                    "arrays": {
                        "properties": {
                            "name": {
                                "type": "text",
                                "fields": {
                                    "keyword": {"type": "keyword", "ignore_above": 256}
                                },
                            }
                        }
                    }
                }
            }
        }
    } == json_schema_to_es_mapping(
        {
            "$schema": "https://json-schema.org/draft-07/schema#",
            "title": "Generated schema for Root",
            "type": "object",
            "properties": {
                "data": {
                    "type": "object",
                    "properties": {
                        "arrays": {
                            "type": "array",
                            "items": {
                                "type": "object",
                                "properties": {"name": {"type": "string"}},
                            },
                        }
                    },
                }
            },
        }
    )

    # json contains array
    assert {
        "properties": {
            "data": {
                "properties": {"arrays": {"type": "number"}},
            }
        }
    } == json_schema_to_es_mapping(
        {
            "$schema": "https://json-schema.org/draft-07/schema#",
            "title": "Generated schema for Root",
            "type": "object",
            "properties": {
                "data": {
                    "type": "object",
                    "properties": {
                        "arrays": {"type": "array", "items": {"type": "number"}}
                    },
                }
            },
        }
    )

    assert TEST_ES_MAPPING == json_schema_to_es_mapping(TEST_JSON_SCHEMA)

    # nested timestamp schema
    assert {
        "properties": {
            "payload": {
                "properties": {
                    "time_local": {"type": "date"},
                    "@timestamp": {"type": "alias", "path": "payload.time_local"},
                }
            }
        }
    } == json_schema_to_es_mapping(
        {
            "$schema": "https://json-schema.org/draft-07/schema#",
            "title": "Generated schema for Root",
            "type": "object",
            "properties": {
                "payload": {
                    "type": "object",
                    "properties": {
                        "time_local": {
                            "type": "timestamp",
                            "timeKey": True,
                            "format": "yyyy-MM-dd''T''HH:mm:ss.SSSSSSSSSZ",
                        },
                    },
                },
            },
        }
    )

    # unix second time
    assert {
        "properties": {
            "log": {
                "type": "text",
                "fields": {"keyword": {"type": "keyword", "ignore_above": 256}},
            },
            "timestamp": {"type": "date", "format": "epoch_second"},
        }
    } == json_schema_to_es_mapping(
        {
            "$schema": "https://json-schema.org/draft-07/schema#",
            "title": "Generated schema for Root",
            "type": "object",
            "properties": {
                "log": {"format": "", "type": "string"},
                "timestamp": {"format": "", "timeKey": False, "type": "epoch_second"},
            },
        }
    )

    # unix millisecond time
    assert {
        "properties": {
            "log": {
                "type": "text",
                "fields": {"keyword": {"type": "keyword", "ignore_above": 256}},
            },
            "timestamp": {"type": "date", "format": "epoch_millis"},
        }
    } == json_schema_to_es_mapping(
        {
            "$schema": "https://json-schema.org/draft-07/schema#",
            "title": "Generated schema for Root",
            "type": "object",
            "properties": {
                "log": {"format": "", "type": "string"},
                "timestamp": {"format": "", "timeKey": False, "type": "epoch_millis"},
            },
        }
    )


@pytest.fixture
def properties():
    return {}


def test_w3c(properties):
    result = build_iis_field_format(properties, IISLogParserEnum.W3C)
    assert result["geo_location"] == {"type": "geo_point"}
    assert result["geo_iso_code"] == {"type": "keyword"}
    assert result["geo_country"] == {"type": "keyword"}
    assert result["geo_city"] == {"type": "keyword"}
    assert result["ua_browser"] == {"type": "keyword"}
    assert result["ua_browser_version"] == {"type": "keyword"}
    assert result["ua_os"] == {"type": "keyword"}
    assert result["ua_os_version"] == {"type": "keyword"}
    assert result["ua_device"] == {"type": "keyword"}
    assert result["ua_category"] == {"type": "keyword"}
    assert result["url"] == {"type": "keyword"}


def test_iis(properties):
    result = build_iis_field_format(properties, IISLogParserEnum.IIS)
    assert result["date"] == {"type": "keyword"}
