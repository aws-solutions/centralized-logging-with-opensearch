# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0
import os
import pytest
import sampled


class TestPlugin:
    @pytest.mark.parametrize(
        "total,rate,expected",
        [(100, 0.01, 1), (100, 0.1, 10), (100, 1, 100), (1, 0.1, 1), (5, 0.3, 2)],
    )
    def test_process_waf(self, total, rate, expected):
        os.environ["SAMPLED_RATE"] = str(rate)
        records = [{"x": i} for i in range(total)]
        plugin = sampled.Plugin("WAF")
        result = plugin.process(records)
        assert len(result) == expected

    def test_process_others(self):
        records = [{"x": i} for i in range(100)]
        plugin = sampled.Plugin("ELB")
        result = plugin.process(records)
        print(result)
        assert result == records

    def test_get_mapping(self):
        plugin = sampled.Plugin("Unknown")
        assert plugin.get_mapping() == {}
