# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import random

import logging
import os
import math

logger = logging.getLogger()

SUPPORTED_LOG_TYPES = ["waf"]


class Plugin:
    """Plugin to provide sampled requests for logs

    Use `SIMPLED_RATE` to control the percentage of sampled requests

    e.g. if SAMPLED_RATE is 0.01,
    for 100,000 total records, only 1000 of them will return
    """

    def __init__(self, log_type: str):
        self.log_type = log_type.lower()
        self.sampled_rate = float(os.environ.get("SAMPLED_RATE", "0.01"))

    def process(self, records):
        """Enrich with geo information based on ip field"""
        if self.log_type not in SUPPORTED_LOG_TYPES:
            return records

        total = len(records)
        sample = math.ceil(total * self.sampled_rate)
        # logger.info(f"---> Filter in {sample} of {total} records")
        return random.sample(records, sample)

    def get_mapping(self):
        """Returns an extra index mappings for logs"""
        return {}
