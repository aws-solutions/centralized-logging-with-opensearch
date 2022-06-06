# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import os
import geo_ip


def test_get_database_path():
    path = geo_ip.get_database_path()
    assert "/opt/python" in path


class TestPlugin:
    def setup(self):
        os.environ["ENV"] = "LOCAL"

    def test_process_cloudfront(self):
        records = [{"c-ip": "70.44.82.114"}]
        plugin = geo_ip.Plugin("CloudFront")
        result = plugin.process(records)
        assert len(result) == 1
        assert result[0]["geo_iso_code"] == "US"
        assert result[0]["geo_country"] == "United States"
        assert result[0]["geo_city"] == "Bangor"

    def test_process_elb(self):
        records = [{"client_ip": "70.44.82.114"}]
        plugin = geo_ip.Plugin("ELB")
        result = plugin.process(records)
        print(result)
        assert len(result) == 1

    def test_process_unknown_type(self):
        records = [{"client_ip": "70.44.82.114"}]
        plugin = geo_ip.Plugin("Unknown")
        result = plugin.process(records)
        assert len(result) == 1
        assert result == records

    def test_process_unknown_ip(self):
        records = [{"client_ip": "127.0.0.1"}]
        plugin = geo_ip.Plugin("ELB")
        result = plugin.process(records)
        assert len(result) == 1
        assert result == records

    def test_process_invalid_ip(self):
        records = [{"client_ip": "1"}]
        plugin = geo_ip.Plugin("ELB")
        result = plugin.process(records)
        assert len(result) == 1
        assert result == records

    def test_process_unknown_city(self):
        records = [{"client_ip": "174.202.161.71"}]
        plugin = geo_ip.Plugin("ELB")
        result = plugin.process(records)
        assert "geo_iso_code" in result[0]
        assert "geo_city" not in result[0]

    def test_process_no_ip(self):
        records = [{"hello": "world"}]
        plugin = geo_ip.Plugin("CloudFront")
        result = plugin.process(records)
        assert len(result) == 1
        assert result == records

    def test_get_mapping(self):
        plugin = geo_ip.Plugin("Unknown")
        mapping = plugin.get_mapping()
        assert len(mapping) == 4
        assert "geo_iso_code" in mapping
        assert mapping["geo_iso_code"] == {"type": "keyword"}
