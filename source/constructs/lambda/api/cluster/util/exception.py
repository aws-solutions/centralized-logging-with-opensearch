# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0


class APIException(Exception):
    def __init__(self, message):
        self.message = message
