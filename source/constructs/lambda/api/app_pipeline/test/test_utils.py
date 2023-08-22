# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0
from commonlib.model import (
    LogConfig,
    LogTypeEnum,
    RegularSpec,
)


def test_make_index_template():
    from util.utils import make_index_template

    config = LogConfig(
        version=0,
        name="test-config",
        logType=LogTypeEnum.SINGLELINE_TEXT,
        regex="(?<log>.*)",
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


def test_convert_strftime_to_java_date_format():
    from util.utils import convert_strftime_to_java_date_format as fmt

    assert "yyyy-MM-dd HH:mm:ss" == fmt("%Y-%m-%d %H:%M:%S")
    assert "yyyy-MM-dd HH:mm:ss.SSSSSS XXXX" == fmt("%Y-%m-%d %H:%M:%S.%f %z")
