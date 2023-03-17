# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0


class ErrorCode:
    DUPLICATED_INDEX_PREFIX = "DuplicatedIndexPrefix"
    DUPLICATED_WITH_INACTIVE_INDEX_PREFIX = "DuplicatedWithInactiveIndexPrefix"
    OVERLAP_INDEX_PREFIX = "OverlapIndexPrefix"
    OVERLAP_WITH_INACTIVE_INDEX_PREFIX = "OverlapWithInactiveIndexPrefix"
    INVALID_INDEX_MAPPING = "InvalidIndexMapping"


class APIException(Exception):
    def __init__(self, message, code: str = None):
        if code:
            super().__init__("[{}] {}".format(code, message))
        else:
            super().__init__(message)
