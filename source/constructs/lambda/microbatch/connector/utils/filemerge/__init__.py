# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

__author__ = 'albertxu'
__version__ = '0.1.0'


from .parquet import merge_parquets
from .text import merge_text
from .gz import merge_gzip


__all__ = ['merge_parquets', 'merge_text', 'merge_gzip']
