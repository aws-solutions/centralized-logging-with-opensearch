# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import os
import json
from utils.aws.glue.dataformat import Parquet, Tsv, Regex, Json, CloudTrailLogs
from utils.aws.glue.table import TableMetaData


__all__ = ['SOURCE_TYPE_RESOURCES',
           'CLOUDFRONT_RAW', 'CLOUDFRONT_PARQUET', 'CLOUDFRONT_METRICS', 'CLOUDFRONT_GRAFANA_DASHBOARD', 'CLOUDFRONT_GRAFANA_DETAILS',
           'ALB_RAW', 'ALB_PARQUET', 'ALB_METRICS', 'ALB_GRAFANA_DASHBOARD', 'ALB_GRAFANA_DETAILS',
           'WAF_RAW', 'WAF_PARQUET', 'WAF_METRICS', 'WAF_GRAFANA_DASHBOARD', 'WAF_GRAFANA_DETAILS',
           'CLOUDTRAIL_RAW', 'CLOUDTRAIL_PARQUET', 'CLOUDTRAIL_METRICS', 'CLOUDTRAIL_GRAFANA_DASHBOARD', 'CLOUDTRAIL_GRAFANA_DETAILS',
           'VPCFLOW_RAW', 'VPCFLOW_PARQUET', 'VPCFLOW_METRICS', 'VPCFLOW_GRAFANA_DASHBOARD', 'VPCFLOW_GRAFANA_DETAILS',
           'RDS_RAW', 'RDS_PARQUET', 'RDS_METRICS', 'RDS_GRAFANA_DASHBOARD', 'RDS_GRAFANA_DETAILS',
           'S3_RAW', 'S3_PARQUET', 'S3_METRICS', 'S3_GRAFANA_DASHBOARD', 'S3_GRAFANA_DETAILS',
           ]


__CURRENT_PATH__ = os.path.dirname(os.path.abspath(__file__))

# Application
APPLICATION_GRAFANA_DETAILS = json.load(open(f'{__CURRENT_PATH__}/application/details.json', 'r'))

# CloudFront
CLOUDFRONT_RAW_SCHEMA = json.load(open(f'{__CURRENT_PATH__}/cloudfront/raw.json', 'r'))
CLOUDFRONT_PARQUET_SCHEMA = json.load(open(f'{__CURRENT_PATH__}/cloudfront/parquet.json', 'r'))
CLOUDFRONT_METRICS_SCHEMA = json.load(open(f'{__CURRENT_PATH__}/cloudfront/metrics.json', 'r'))
CLOUDFRONT_GRAFANA_DASHBOARD = json.load(open(f'{__CURRENT_PATH__}/cloudfront/dashboards.json', 'r'))
CLOUDFRONT_GRAFANA_DETAILS = json.load(open(f'{__CURRENT_PATH__}/cloudfront/details.json', 'r'))

CLOUDFRONT_RAW = TableMetaData(data_format=Tsv, schema=CLOUDFRONT_RAW_SCHEMA, table_properties={'skip.header.line.count': '2'}, serialization_properties={'field.delim': '\t', 'line.delim': '\n'}, ignore_partition=True)
CLOUDFRONT_PARQUET = TableMetaData(data_format=Parquet, schema=CLOUDFRONT_PARQUET_SCHEMA, ignore_partition=False)
CLOUDFRONT_METRICS = TableMetaData(data_format=Parquet, schema=CLOUDFRONT_METRICS_SCHEMA, ignore_partition=False)

# Alb
ALB_RAW_SCHEMA = json.load(open(f'{__CURRENT_PATH__}/alb/raw.json', 'r'))
ALB_PARQUET_SCHEMA = json.load(open(f'{__CURRENT_PATH__}/alb/parquet.json', 'r'))
ALB_METRICS_SCHEMA = json.load(open(f'{__CURRENT_PATH__}/alb/metrics.json', 'r'))
ALB_GRAFANA_DASHBOARD = json.load(open(f'{__CURRENT_PATH__}/alb/dashboards.json', 'r'))
ALB_GRAFANA_DETAILS = json.load(open(f'{__CURRENT_PATH__}/alb/details.json', 'r'))

ALB_RAW = TableMetaData(data_format=Regex, schema=ALB_RAW_SCHEMA, serialization_properties={'input.regex': '^([^ ]*) ([^ ]*) ([^ ]*) ([^ ]*):([0-9]*) ([^ ]*)[:-]([0-9]*) ([-.0-9]*) ([-.0-9]*) ([-.0-9]*) (|[-0-9]*) (-|[-0-9]*) ([-0-9]*) ([-0-9]*) "([^ ]*) (.*) (- |[^ ]*)" "([^"]*)" ([A-Z0-9-_]+) ([A-Za-z0-9.-]*) ([^ ]*) "([^"]*)" "([^"]*)" "([^"]*)" ([-.0-9]*) ([^ ]*) "([^"]*)" "([^"]*)" "([^ ]*)" "([^ ]+?)" "([^ ]+)" "([^ ]*)" "([^ ]*)" ?(TID_[A-Za-z0-9.-]+)? ?(?:[^\\u007B]+?)? ?(\\u007B.*\\u007D)?$'}, ignore_partition=True)
ALB_PARQUET = TableMetaData(data_format=Parquet, schema=ALB_PARQUET_SCHEMA, ignore_partition=False)
ALB_METRICS = TableMetaData(data_format=Parquet, schema=ALB_METRICS_SCHEMA, ignore_partition=False)

# Waf
WAF_RAW_SCHEMA = json.load(open(f'{__CURRENT_PATH__}/waf/raw.json', 'r'))
WAF_PARQUET_SCHEMA = json.load(open(f'{__CURRENT_PATH__}/waf/parquet.json', 'r'))
WAF_METRICS_SCHEMA = json.load(open(f'{__CURRENT_PATH__}/waf/metrics.json', 'r'))
WAF_GRAFANA_DASHBOARD =json.load(open(f'{__CURRENT_PATH__}/waf/dashboards.json', 'r'))
WAF_GRAFANA_DETAILS = json.load(open(f'{__CURRENT_PATH__}/waf/details.json', 'r'))

WAF_RAW = TableMetaData(data_format=Json, schema=WAF_RAW_SCHEMA, ignore_partition=True)
WAF_PARQUET = TableMetaData(data_format=Parquet, schema=WAF_PARQUET_SCHEMA, ignore_partition=False)
WAF_METRICS = TableMetaData(data_format=Parquet, schema=WAF_METRICS_SCHEMA, ignore_partition=False)

# CloudTrail
CLOUDTRAIL_RAW_SCHEMA = json.load(open(f'{__CURRENT_PATH__}/cloudtrail/raw.json', 'r'))
CLOUDTRAIL_PARQUET_SCHEMA = json.load(open(f'{__CURRENT_PATH__}/cloudtrail/parquet.json', 'r'))
CLOUDTRAIL_METRICS_SCHEMA = json.load(open(f'{__CURRENT_PATH__}/cloudtrail/metrics.json', 'r'))
CLOUDTRAIL_GRAFANA_DASHBOARD = json.load(open(f'{__CURRENT_PATH__}/cloudtrail/dashboards.json', 'r'))
CLOUDTRAIL_GRAFANA_DETAILS = json.load(open(f'{__CURRENT_PATH__}/cloudtrail/details.json', 'r'))

CLOUDTRAIL_RAW = TableMetaData(data_format=CloudTrailLogs, schema=CLOUDTRAIL_RAW_SCHEMA, ignore_partition=True)
CLOUDTRAIL_PARQUET = TableMetaData(data_format=Parquet, schema=CLOUDTRAIL_PARQUET_SCHEMA, ignore_partition=False)
CLOUDTRAIL_METRICS = TableMetaData(data_format=Parquet, schema=CLOUDTRAIL_METRICS_SCHEMA, ignore_partition=False)

# VPC Flow
VPCFLOW_RAW_SCHEMA = json.load(open(f'{__CURRENT_PATH__}/vpcflow/raw.json', 'r'))
VPCFLOW_PARQUET_SCHEMA = json.load(open(f'{__CURRENT_PATH__}/vpcflow/parquet.json', 'r'))
VPCFLOW_METRICS_SCHEMA = json.load(open(f'{__CURRENT_PATH__}/vpcflow/metrics.json', 'r'))
VPCFLOW_GRAFANA_DASHBOARD = json.load(open(f'{__CURRENT_PATH__}/vpcflow/dashboards.json', 'r'))
VPCFLOW_GRAFANA_DETAILS = json.load(open(f'{__CURRENT_PATH__}/vpcflow/details.json', 'r'))

VPCFLOW_RAW = TableMetaData(data_format=Tsv, schema=VPCFLOW_RAW_SCHEMA, table_properties={'skip.header.line.count': '1'}, serialization_properties={'field.delim': ' ', 'line.delim': '\n'}, ignore_partition=True)
VPCFLOW_PARQUET = TableMetaData(data_format=Parquet, schema=VPCFLOW_PARQUET_SCHEMA, ignore_partition=False)
VPCFLOW_METRICS = TableMetaData(data_format=Parquet, schema=VPCFLOW_METRICS_SCHEMA, ignore_partition=False)

# RDS
RDS_RAW_SCHEMA = json.load(open(f'{__CURRENT_PATH__}/rds/raw.json', 'r'))
RDS_PARQUET_SCHEMA = json.load(open(f'{__CURRENT_PATH__}/rds/parquet.json', 'r'))
RDS_METRICS_SCHEMA = json.load(open(f'{__CURRENT_PATH__}/rds/metrics.json', 'r'))
RDS_GRAFANA_DASHBOARD = json.load(open(f'{__CURRENT_PATH__}/rds/dashboards.json', 'r'))
RDS_GRAFANA_DETAILS = json.load(open(f'{__CURRENT_PATH__}/rds/details.json', 'r'))

RDS_RAW =  TableMetaData(data_format=Json, schema=RDS_RAW_SCHEMA, ignore_partition=True)
RDS_PARQUET = TableMetaData(data_format=Parquet, schema=RDS_PARQUET_SCHEMA, ignore_partition=False)
RDS_METRICS = TableMetaData(data_format=Parquet, schema=RDS_METRICS_SCHEMA, ignore_partition=False)

# S3
S3_RAW_SCHEMA = json.load(open(f'{__CURRENT_PATH__}/s3/raw.json', 'r'))
S3_PARQUET_SCHEMA = json.load(open(f'{__CURRENT_PATH__}/s3/parquet.json', 'r'))
S3_METRICS_SCHEMA = json.load(open(f'{__CURRENT_PATH__}/s3/metrics.json', 'r'))
S3_GRAFANA_DASHBOARD = json.load(open(f'{__CURRENT_PATH__}/s3/dashboards.json', 'r'))
S3_GRAFANA_DETAILS = json.load(open(f'{__CURRENT_PATH__}/s3/details.json', 'r'))

S3_RAW = TableMetaData(data_format=Regex, schema=S3_RAW_SCHEMA, serialization_properties={'input.regex': '^([^ ]*) ([^ ]*) \\[(.*?)\\] ([^ ]*) ([^ ]*) ([^ ]*) ([^ ]*) ([^ ]*) ("[^"]*"|-) (-|[0-9]*) ([^ ]*) ([^ ]*) ([^ ]*) ([^ ]*) ([^ ]*) ([^ ]*) ("[^"]*"|-) ([^ ]*)(?: ([^ ]*) ([^ ]*) ([^ ]*) ([^ ]*) ([^ ]*) ([^ ]*) ([^ ]*) (-|Yes))?.*$'}, ignore_partition=True)
S3_PARQUET = TableMetaData(data_format=Parquet, schema=S3_PARQUET_SCHEMA, ignore_partition=False)
S3_METRICS = TableMetaData(data_format=Parquet, schema=S3_METRICS_SCHEMA, ignore_partition=False)

# SES
SES_RAW_SCHEMA = json.load(open(f'{__CURRENT_PATH__}/ses/raw.json', 'r'))
SES_PARQUET_SCHEMA = json.load(open(f'{__CURRENT_PATH__}/ses/parquet.json', 'r'))
SES_METRICS_SCHEMA = json.load(open(f'{__CURRENT_PATH__}/ses/metrics.json', 'r'))
SES_GRAFANA_DASHBOARD = json.load(open(f'{__CURRENT_PATH__}/ses/dashboards.json', 'r'))
SES_GRAFANA_DETAILS = json.load(open(f'{__CURRENT_PATH__}/ses/details.json', 'r'))

SES_RAW = TableMetaData(data_format=Json, schema=SES_RAW_SCHEMA, ignore_partition=True)
SES_PARQUET = TableMetaData(data_format=Parquet, schema=SES_PARQUET_SCHEMA, ignore_partition=False)
SES_METRICS = TableMetaData(data_format=Parquet, schema=SES_METRICS_SCHEMA, ignore_partition=False)


SOURCE_TYPE_RESOURCES = {
    "alb": {
        "schema": (ALB_RAW, ALB_PARQUET, ALB_METRICS),
        "dashboards": (ALB_GRAFANA_DETAILS, ALB_GRAFANA_DASHBOARD)
    },
    "cloudfront": {
        "schema": (CLOUDFRONT_RAW, CLOUDFRONT_PARQUET, CLOUDFRONT_METRICS),
        "dashboards": (CLOUDFRONT_GRAFANA_DETAILS, CLOUDFRONT_GRAFANA_DASHBOARD)
    },
    "waf": {
        "schema": (WAF_RAW, WAF_PARQUET, WAF_METRICS),
        "dashboards": (WAF_GRAFANA_DETAILS, WAF_GRAFANA_DASHBOARD)
    },
    "cloudtrail": {
        "schema": (CLOUDTRAIL_RAW, CLOUDTRAIL_PARQUET, CLOUDTRAIL_METRICS),
        "dashboards": (CLOUDTRAIL_GRAFANA_DETAILS, CLOUDTRAIL_GRAFANA_DASHBOARD)
    },
    "vpcflow": {
        "schema": (VPCFLOW_RAW, VPCFLOW_PARQUET, VPCFLOW_METRICS),
        "dashboards": (VPCFLOW_GRAFANA_DETAILS, VPCFLOW_GRAFANA_DASHBOARD)
    },
    "rds": {
        "schema": (RDS_RAW, RDS_PARQUET, RDS_METRICS),
        "dashboards": (RDS_GRAFANA_DETAILS, RDS_GRAFANA_DASHBOARD)
    },
    "s3a": {
        "schema": (S3_RAW, S3_PARQUET, S3_METRICS),
        "dashboards": (S3_GRAFANA_DETAILS, S3_GRAFANA_DASHBOARD)
    },
    "ses": {
        "schema": (SES_RAW, SES_PARQUET, SES_METRICS),
        "dashboards": (SES_GRAFANA_DETAILS, SES_GRAFANA_DASHBOARD)
    },
    "fluent-bit": {
        "dashboards": (APPLICATION_GRAFANA_DETAILS, None)
    },
    "s3": {
        "dashboards": (APPLICATION_GRAFANA_DETAILS, None)
    },
}
