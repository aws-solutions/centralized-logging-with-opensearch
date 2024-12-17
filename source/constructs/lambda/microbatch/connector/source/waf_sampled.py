# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import os
import json
from typing import Iterator
from utils import WAFV2Client
from source.base import AbstractSource


class WAFSampledSource(AbstractSource):

    def __init__(self, context: dict) -> None:
        self.scope = context.get("scope", "REGIONAL")
        region_name = (
            os.environ.get("AWS_REGION") if self.scope == "REGIONAL" else "us-east-1"
        )
        self.wafv2_client = WAFV2Client(
            sts_role_arn=context.get("role", ""), region_name=region_name
        )

        self.web_acl_names = context.get("webAclNames", [])
        if isinstance(context.get("webAclNames"), list):
            self.web_acl_names = list(set(context["webAclNames"]))
        elif isinstance(context.get("webAclNames"), str):
            self.web_acl_names = (
                []
                if not context["webAclNames"]
                else list(set(context["webAclNames"].split(",")))
            )
        else:
            self.web_acl_names = []
        self.scope = context.get("scope", "REGIONAL")
        self.interval = int(context.get("interval", 1)) * 60

    def process(self) -> Iterator[str]:
        for log_entry in self.wafv2_client.get_sampled_requests_by_acl_names(
            web_acl_names=self.web_acl_names, scope=self.scope, interval=self.interval
        ):
            yield f"{json.dumps(log_entry)}\n"
