# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import os


def comma_delimited_list_string(s: str):
    return list(map(lambda each: each.strip(), s.split(",")))


FIELD_NAMES = comma_delimited_list_string(os.environ.get("FIELD_NAMES", ""))
