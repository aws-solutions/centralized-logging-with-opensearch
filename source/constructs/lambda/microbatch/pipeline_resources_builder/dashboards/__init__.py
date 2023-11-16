# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import os
import json


__all__ = ['APPLICATION_GRAFANA_DETAILS', 
           'WAF_GRAFANA_DASHBOARD', 'WAF_GRAFANA_DETAILS', 
           'ALB_GRAFANA_DASHBOARD', 'ALB_GRAFANA_DETAILS', 
           'CLOUDFRONT_GRAFANA_DASHBOARD', 'CLOUDFRONT_GRAFANA_DETAILS',
           'CLOUDTRAIL_GRAFANA_DASHBOARD', 'CLOUDTRAIL_GRAFANA_DETAILS',
           ]


__CURRENT_PATH__ = os.path.dirname(os.path.abspath(__file__))


APPLICATION_GRAFANA_DETAILS = json.load(open(f'{__CURRENT_PATH__}/templates/application_details.json', 'r'))

WAF_GRAFANA_DASHBOARD =json.load(open(f'{__CURRENT_PATH__}/templates/waf_dashboards.json', 'r'))
WAF_GRAFANA_DETAILS = json.load(open(f'{__CURRENT_PATH__}/templates/waf_details.json', 'r'))

ALB_GRAFANA_DASHBOARD = json.load(open(f'{__CURRENT_PATH__}/templates/alb_dashboards.json', 'r'))
ALB_GRAFANA_DETAILS = json.load(open(f'{__CURRENT_PATH__}/templates/alb_details.json', 'r'))

CLOUDFRONT_GRAFANA_DASHBOARD = json.load(open(f'{__CURRENT_PATH__}/templates/cloudfront_dashboards.json', 'r'))
CLOUDFRONT_GRAFANA_DETAILS = json.load(open(f'{__CURRENT_PATH__}/templates/cloudfront_details.json', 'r'))

CLOUDTRAIL_GRAFANA_DASHBOARD = json.load(open(f'{__CURRENT_PATH__}/templates/cloudtrail_dashboards.json', 'r'))
CLOUDTRAIL_GRAFANA_DETAILS = json.load(open(f'{__CURRENT_PATH__}/templates/cloudtrail_details.json', 'r'))
