# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

from user_agents import parse

SUPPORTED_LOG_TYPES = ["cloudfront", "elb", "nginx", "apache"]


def _get_user_agent_field(log_type: str):
    if log_type.lower() == "cloudfront":
        return "cs-user-agent"
    else:
        # Default to user_agent
        return "user_agent"


class Plugin:
    """User Agent Plugin to parse user agent field"""

    def __init__(self, log_type: str):
        if log_type.lower() in SUPPORTED_LOG_TYPES:
            self._user_agent_field = _get_user_agent_field(log_type)

    def process(self, records):
        """Enrich with extra user agent information based on user agent field"""

        if self._user_agent_field:
            for record in records:
                user_agent_field = record.get(self._user_agent_field)
                if not user_agent_field:
                    continue
                ua = parse(user_agent_field)

                record["ua_browser"] = ua.browser.family
                record["ua_browser_version"] = ua.browser.version_string
                record["ua_os"] = ua.os.family
                record["ua_os_version"] = ua.os.version_string
                record["ua_device"] = ua.device.family

                if ua.is_pc:
                    record["ua_category"] = "PC"
                elif ua.is_tablet:
                    record["ua_category"] = "Tablet"
                elif ua.is_mobile:
                    record["ua_category"] = "Mobile"
                elif ua.is_bot:
                    record["ua_category"] = "Bot"
                else:
                    record["ua_category"] = "Other"

        return records

    def get_mapping(self):
        """Returns an extra index mappings for logs"""
        return {
            "ua_browser": {"type": "keyword"},
            "ua_browser_version": {"type": "keyword"},
            "ua_os": {"type": "keyword"},
            "ua_os_version": {"type": "keyword"},
            "ua_device": {"type": "keyword"},
            "ua_category": {"type": "keyword"},
        }
