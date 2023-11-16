# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import os
import json
from utils.aws.glue.dataformat import Parquet, Tsv, Regex, Json, CloudTrailLogs
from utils.aws.glue.table import TableMetaData


__all__ = ['CLOUDFRONT_RAW', 'CLOUDFRONT_PARQUET', 'CLOUDFRONT_METRICS', 'ALB_RAW', 
           'ALB_PARQUET', 'ALB_METRICS', 'WAF_RAW', 'WAF_PARQUET', 'WAF_METRICS', 
           'CLOUDTRAIL_RAW_SCHEMA', 'CLOUDTRAIL_PARQUET_SCHEMA', 'VPCFLOW_RAW_SCHEMA', 
           'VPCFLOW_PARQUET_SCHEMA']


__CURRENT_PATH__ = os.path.dirname(os.path.abspath(__file__))

CLOUDFRONT_RAW_SCHEMA = json.load(open(f'{__CURRENT_PATH__}/cloudfront/raw.json', 'r'))
CLOUDFRONT_PARQUET_SCHEMA = json.load(open(f'{__CURRENT_PATH__}/cloudfront/parquet.json', 'r'))
CLOUDFRONT_METRICS_SCHEMA = json.load(open(f'{__CURRENT_PATH__}/cloudfront/metrics.json', 'r'))

ALB_RAW_SCHEMA = json.load(open(f'{__CURRENT_PATH__}/alb/raw.json', 'r'))
ALB_PARQUET_SCHEMA = json.load(open(f'{__CURRENT_PATH__}/alb/parquet.json', 'r'))
ALB_METRICS_SCHEMA = json.load(open(f'{__CURRENT_PATH__}/alb/metrics.json', 'r'))

WAF_RAW_SCHEMA = json.load(open(f'{__CURRENT_PATH__}/waf/raw.json', 'r'))
WAF_PARQUET_SCHEMA = json.load(open(f'{__CURRENT_PATH__}/waf/parquet.json', 'r'))
WAF_METRICS_SCHEMA = json.load(open(f'{__CURRENT_PATH__}/waf/metrics.json', 'r'))

CLOUDTRAIL_RAW_SCHEMA = json.load(open(f'{__CURRENT_PATH__}/cloudtrail/raw.json', 'r'))
CLOUDTRAIL_PARQUET_SCHEMA = json.load(open(f'{__CURRENT_PATH__}/cloudtrail/parquet.json', 'r'))
CLOUDTRAIL_METRICS_SCHEMA = json.load(open(f'{__CURRENT_PATH__}/cloudtrail/metrics.json', 'r'))

VPCFLOW_RAW_SCHEMA = json.load(open(f'{__CURRENT_PATH__}/vpcflow/raw.json', 'r'))
VPCFLOW_PARQUET_SCHEMA = json.load(open(f'{__CURRENT_PATH__}/vpcflow/parquet.json', 'r'))

CLOUDFRONT_RAW = TableMetaData(data_format=Tsv, schema=CLOUDFRONT_RAW_SCHEMA, table_properties={'skip.header.line.count': '2'}, serialization_properties={'field.delim': '\t', 'line.delim': '\n'}, ignore_partition=True)
CLOUDFRONT_PARQUET = TableMetaData(data_format=Parquet, schema=CLOUDFRONT_PARQUET_SCHEMA, ignore_partition=False)
CLOUDFRONT_METRICS = TableMetaData(data_format=Parquet, schema=CLOUDFRONT_METRICS_SCHEMA, ignore_partition=False)

ALB_RAW = TableMetaData(data_format=Regex, schema=ALB_RAW_SCHEMA, serialization_properties={'input.regex': '([^ ]*) ([^ ]*) ([^ ]*) ([^ ]*):([0-9]*) ([^ ]*)[:-]([0-9]*) ([-.0-9]*) ([-.0-9]*) ([-.0-9]*) (|[-0-9]*) (-|[-0-9]*) ([-0-9]*) ([-0-9]*) "([^ ]*) (.*) (- |[^ ]*)" "([^"]*)" ([A-Z0-9-_]+) ([A-Za-z0-9.-]*) ([^ ]*) "([^"]*)" "([^"]*)" "([^"]*)" ([-.0-9]*) ([^ ]*) "([^"]*)" "([^"]*)" "([^ ]*)" "([^s]+?)" "([^s]+)" "([^ ]*)" "([^ ]*)" ?(.*)'}, ignore_partition=True)
ALB_PARQUET = TableMetaData(data_format=Parquet, schema=ALB_PARQUET_SCHEMA, ignore_partition=False)
ALB_METRICS = TableMetaData(data_format=Parquet, schema=ALB_METRICS_SCHEMA, ignore_partition=False)

WAF_RAW = TableMetaData(data_format=Json, schema=WAF_RAW_SCHEMA, ignore_partition=True)
WAF_PARQUET = TableMetaData(data_format=Parquet, schema=WAF_PARQUET_SCHEMA, ignore_partition=False)
WAF_METRICS = TableMetaData(data_format=Parquet, schema=WAF_METRICS_SCHEMA, ignore_partition=False)

CLOUDTRAIL_RAW = TableMetaData(data_format=CloudTrailLogs, schema=CLOUDTRAIL_RAW_SCHEMA, ignore_partition=True)
CLOUDTRAIL_PARQUET = TableMetaData(data_format=Parquet, schema=CLOUDTRAIL_PARQUET_SCHEMA, ignore_partition=False)
CLOUDTRAIL_METRICS = TableMetaData(data_format=Parquet, schema=CLOUDTRAIL_METRICS_SCHEMA, ignore_partition=False)

VPCFLOW_RAW = TableMetaData(data_format=Tsv, schema=VPCFLOW_RAW_SCHEMA, table_properties={'skip.header.line.count': '1'}, serialization_properties={'field.delim': ' ', 'line.delim': '\n'}, ignore_partition=True)
VPCFLOW_PARQUET = TableMetaData(data_format=Parquet, schema=VPCFLOW_PARQUET_SCHEMA, ignore_partition=False)

