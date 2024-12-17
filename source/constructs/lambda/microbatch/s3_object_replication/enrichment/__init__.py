# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import os
import re
import json
import maxminddb
import user_agents
from functools import cached_property
from utils import logger


class Alb(object):

    def __init__(self, record: str):
        self.field_delimiter = " "
        self.line_delimiter = "\n"
        self.record = record.strip(self.line_delimiter)
        self.pattern = '([^ ]*) ([^ ]*) ([^ ]*) ([^ ]*):([0-9]*) ([^ ]*)[:-]([0-9]*) ([-.0-9]*) ([-.0-9]*) ([-.0-9]*) (|[-0-9]*) (-|[-0-9]*) ([-0-9]*) ([-0-9]*) "([^ ]*) (.*) (- |[^ ]*)" "([^"]*)" ([A-Z0-9-_]+) ([A-Za-z0-9.-]*) ([^ ]*) "([^"]*)" "([^"]*)" "([^"]*)" ([-.0-9]*) ([^ ]*) "([^"]*)" "([^"]*)" "([^ ]*)" "([^s]+?)" "([^s]+)" "([^ ]*)" "([^ ]*)"'
        self.match = re.match(pattern=self.pattern, string=self.record)

    def is_record(self) -> bool:
        if self.match is not None:
            return True
        else:
            return False

    @cached_property
    def ip_address(self) -> str:
        return self.match.group(4) if self.match else ""

    @cached_property
    def user_agent(self) -> str:
        return self.match.group(18) if self.match else ""

    def enrich_record(self, enrich_data: dict) -> str:
        return f'{self.field_delimiter.join([self.record, json.dumps(enrich_data, separators=(",", ":"))])}{self.line_delimiter}'


class CloudFront(object):

    def __init__(self, record: str):
        self.field_delimiter = "\t"
        self.line_delimiter = "\n"
        self.record = record.strip(self.line_delimiter)

    def is_record(self) -> bool:
        if self.record.startswith("#Version") or self.record.startswith("#Fields"):
            return False
        elif len(self.record.split(self.field_delimiter)) == 33:
            return True
        else:
            return False

    @cached_property
    def ip_address(self) -> str:
        return (
            self.record.split(self.field_delimiter)[4]
            if len(self.record.split(self.field_delimiter)) >= 5
            else ""
        )

    @cached_property
    def user_agent(self) -> str:
        return (
            self.record.split(self.field_delimiter)[10]
            if len(self.record.split(self.field_delimiter)) >= 11
            else ""
        )

    def enrich_record(self, enrich_data: dict) -> str:
        return f'{self.field_delimiter.join([self.record, json.dumps(enrich_data, separators=(",", ":"))])}{self.line_delimiter}'


SOURCE_PARSER_MAPPING = {
    "cloudfront": CloudFront,
    "alb": Alb,
}


class EnrichProcessor:

    def __init__(self, source_type: str):
        if source_type not in SOURCE_PARSER_MAPPING.keys():
            raise ValueError(
                f"Do not supported source type: {source_type}. Supported source type: {list(SOURCE_PARSER_MAPPING.keys())}."
            )

        self.source_type = source_type
        self.source_parser_cls = SOURCE_PARSER_MAPPING[source_type]

    def get_maxminddb_path(self) -> str:
        if os.environ.get("ENV", "LAMBDA") == "LAMBDA":
            return "/opt/python/maxminddb/GeoLite2-City.mmdb"
        return (
            f"{os.path.dirname(os.path.abspath(__file__))}/maxminddb/GeoLite2-City.mmdb"
        )

    @cached_property
    def maxminddb_reader(self) -> maxminddb.reader.Reader:
        maxminddb_path = self.get_maxminddb_path()
        return maxminddb.open_database(database=maxminddb_path)

    def geo_ip(self, cls) -> dict:
        enriched_data = {}
        try:
            # if address not found, AddressNotFoundError will be raised.
            record = self.maxminddb_reader.get(cls.ip_address)
            if record and isinstance(record, dict):
                if "country" in record:
                    enriched_data["geo_iso_code"] = record["country"].get(
                        "iso_code", ""
                    )
                    enriched_data["geo_country"] = (
                        record["country"].get("names", {}).get("en")
                    )
                    if "city" in record:
                        enriched_data["geo_city"] = (
                            record["city"].get("names", {}).get("en")
                        )
                if "location" in record:
                    enriched_data["geo_location"] = (
                        f"{record['location'].get('latitude')},{record['location'].get('longitude')}"
                    )
        except Exception as e:
            logger.error(
                f"Get the record for {cls.ip_address} from MaxMind DB failed, the error message: {e}"
            )

        return enriched_data

    def user_agent(self, cls) -> dict:
        enriched_data = {}

        ua = user_agents.parse(user_agent_string=cls.user_agent)

        enriched_data["ua_browser"] = ua.browser.family
        enriched_data["ua_browser_version"] = ua.browser.version_string
        enriched_data["ua_os"] = ua.os.family
        enriched_data["ua_os_version"] = ua.os.version_string
        enriched_data["ua_device"] = ua.device.family

        if ua.is_pc:
            enriched_data["ua_category"] = "PC"
        elif ua.is_tablet:
            enriched_data["ua_category"] = "Tablet"
        elif ua.is_mobile:
            enriched_data["ua_category"] = "Mobile"
        elif ua.is_bot:
            enriched_data["ua_category"] = "Bot"
        else:
            enriched_data["ua_category"] = "Other"

        return enriched_data

    def process(self, record: str, enrich_plugins: set = set()) -> str:
        source_parser = self.source_parser_cls(record=record)

        if enrich_plugins:
            if source_parser.is_record() is True:
                enrich_data = {}

                for plugin in sorted(enrich_plugins):
                    if hasattr(self, plugin) is False:
                        continue
                    enrich_data.update(getattr(self, plugin)(cls=source_parser))

                return source_parser.enrich_record(enrich_data=enrich_data)
            else:
                return record
        else:
            return record
