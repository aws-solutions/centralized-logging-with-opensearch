# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

from enum import Enum


class GROUPTYPE(Enum):
    EC2 = 'EC2'
    ASG = 'ASG'