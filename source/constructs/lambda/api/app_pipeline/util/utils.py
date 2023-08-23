# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0
from string import Template
from commonlib.model import (
    LogConfig,
    LogTypeEnum,
)


class StrftimeTemplate(Template):
    delimiter = "%"


def convert_strftime_to_java_date_format(s: str) -> str:
    mapping = {
        "Y": "yyyy",
        "y": "yy",
        "m": "MM",
        "d": "dd",
        "H": "HH",
        "M": "mm",
        "S": "ss",
        "L": "SSSSSS",
        "f": "SSSSSS",
        "A": "EEE",
        "z": "XXXX",
    }
    return StrftimeTemplate(s).substitute(**mapping)


NGINX_MAPPING_PROPS = {
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


def make_index_template(
    log_config: LogConfig,
    index_alias: str = "",
    number_of_shards: int = 5,
    number_of_replicas: int = 1,
    codec: str = "best_compression",
    refresh_interval: str = "1s",
) -> dict:
    properties = {}
    if log_config.logType == LogTypeEnum.NGINX:
        properties = NGINX_MAPPING_PROPS
    elif log_config.logType == LogTypeEnum.APACHE:
        properties = APACHE_MAPPING_PROPS
    else:
        for spec in log_config.regexFieldSpecs:
            key = spec.key
            val = {"type": spec.type}
            # NOTICE: We don't put format into index template.
            # Because the format in log config is strptime style("%Y-%m-%d %H:%M:%S"),
            # which is different from OpenSearch java style format(yyyy-MM-dd HH:mm:ss).
            # To make sure OpenSearch can handle datetime format currently. We will ensure
            # FluentBit marshal time key into iso8601 standard format before sending into OpenSearch.
            properties[key] = val

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
            "mappings": {"properties": properties},
        },
    }

    return template
