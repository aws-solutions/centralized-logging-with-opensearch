# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0
import pytest
import user_agent


test_data = [
    {
        "category": "Mobile",
        "user_agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 5_1 like Mac OS X) "
        "AppleWebKit/534.46 (KHTML, like Gecko) Version/5.1 Mobile/9B179 Safari/7534.48.3",
    },
    {
        "category": "PC",
        "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)"
        "Chrome/97.0.4692.99 Safari/537.36 Edg/97.0.1072.69",
    },
    {
        "category": "Tablet",
        "user_agent": "Mozilla/5.0(iPad; U; CPU iPhone OS 3_2 like Mac OS X; en-us)"
        "AppleWebKit/531.21.10 (KHTML, like Gecko) Version/4.0.4 Mobile/7B314 Safari/531.21.10",
    },
    {
        "category": "Bot",
        "user_agent": "Mozilla/5.0 (compatible; bingbot/2.0;  http://www.bing.com/bingbot.htm)",
    },
    {"category": "Other", "user_agent": "curl/7.79.1"},
]


class TestPlugin:
    def test_process_cloudfront(self):
        records = [{"cs-user-agent": test_data[0]["user_agent"]}]
        plugin = user_agent.Plugin("CloudFront")
        result = plugin.process(records)
        assert len(result) == 1
        assert result[0]["ua_browser"] == "Mobile Safari"
        assert result[0]["ua_browser_version"] == "5.1"
        assert result[0]["ua_os"] == "iOS"
        assert result[0]["ua_os_version"] == "5.1"
        assert result[0]["ua_category"] == "Mobile"
        assert result[0]["ua_device"] == "iPhone"

    def test_process_elb(self):
        records = [{"user_agent": test_data[0]["user_agent"]}]
        plugin = user_agent.Plugin("ELB")
        result = plugin.process(records)
        assert len(result) == 1

    def test_process_no_user_agents(self):
        records = [{"hello": "world"}]
        plugin = user_agent.Plugin("ELB")
        result = plugin.process(records)
        assert result == records

    @pytest.mark.parametrize("test_data", test_data)
    def test_process_ua_category(self, test_data):
        records = [{"user_agent": test_data["user_agent"]}]
        plugin = user_agent.Plugin("ELB")
        result = plugin.process(records)
        assert result[0]["ua_category"] == test_data["category"]

    def test_get_mapping(self):
        plugin = user_agent.Plugin("Unknown")
        mapping = plugin.get_mapping()
        assert len(mapping) == 6
        assert "ua_browser" in mapping
        assert mapping["ua_browser"] == {"type": "keyword"}
