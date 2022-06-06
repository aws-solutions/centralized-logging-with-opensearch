# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import logging
import os
import maxminddb

logger = logging.getLogger()

SUPPORTED_LOG_TYPES = ["cloudfront", "elb", "nginx", "apache"]


def get_database_path():
    env = os.environ.get("ENV", "LAMBDA")
    if env == "LAMBDA":
        return "/opt/python/assets/GeoLite2-City.mmdb"
    return "./assets/GeoLite2-City.mmdb"


def _get_ip_field(log_type):
    if log_type.lower() == "cloudfront":
        return "c-ip"
    else:
        # Default to client_ip
        return "client_ip"


class Plugin:
    """Geo IP Plugin based on MaxMind GeoLite2 Free Geolocation Data

    This plugin is used only for demo purpose.

    This product includes GeoLite2 data created by MaxMind, available from
    https://www.maxmind.com.
    """

    def __init__(self, log_type: str):
        db_path = get_database_path()
        self._reader = maxminddb.open_database(db_path)
        if log_type.lower() in SUPPORTED_LOG_TYPES:
            self._ip_field = _get_ip_field(log_type)
        else:
            self._ip_field = ""

    def process(self, records):
        """Enrich with geo information based on ip field"""

        if self._ip_field:
            for record in records:
                ip_field = record.get(self._ip_field)
                if ip_field:
                    try:
                        # if address not found, AddressNotFoundError will be raised.
                        geo = self._reader.get(ip_field)
                        if geo:
                            if "country" in geo:
                                record["geo_iso_code"] = geo["country"]["iso_code"]
                                record["geo_country"] = geo["country"]["names"]["en"]
                                if "city" in geo:
                                    record["geo_city"] = geo["city"]["names"]["en"]
                            if "location" in geo:
                                record[
                                    "geo_location"
                                ] = f'{geo["location"]["latitude"]},{geo["location"]["longitude"]}'
                    except Exception as e:
                        # Do nothing
                        logger.error(e)

        return records

    def get_mapping(self):
        """Returns an extra index mappings for logs"""
        return {
            "geo_iso_code": {"type": "keyword"},
            "geo_location": {"type": "geo_point"},
            "geo_country": {"type": "keyword"},
            "geo_city": {"type": "keyword"},
        }
