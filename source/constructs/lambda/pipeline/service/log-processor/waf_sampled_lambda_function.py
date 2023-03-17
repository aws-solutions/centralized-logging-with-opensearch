# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import boto3
import json
import logging
import os
import time
from datetime import datetime, timedelta, date

from botocore.client import Config

from util.osutil import OpenSearch
from enum import Enum
from boto3_client import get_client

logger = logging.getLogger()
logger.setLevel(logging.INFO)

TOTAL_RETRIES = 3
SLEEP_INTERVAL = 10
DEFAULT_BULK_BATCH_SIZE = "10000"
BULK_ACTION = "index"

solution_version = os.environ.get("VERSION", "v1.0.0")
solution_id = os.environ.get("SOLUTION_ID", "SO8025")
user_agent_extra = f"AwsSolution/{solution_id}/{solution_version}"
# Add user agent.
default_config = Config(user_agent_extra=user_agent_extra)
default_region = os.environ.get("AWS_REGION")

sts = boto3.client("sts", config=default_config)
account_id = sts.get_caller_identity()["Account"]

log_source_region = os.environ.get("LOG_SOURCE_REGION", default_region)

interval = int(os.environ.get("INTERVAL", "1"))

waf = get_client("wafv2")
web_acl_names = os.environ.get("WEB_ACL_NAMES")
web_acl_list = web_acl_names.split(",")

# batch size can be overwritten via Env. var.
batch_size = int(os.environ.get("BULK_BATCH_SIZE", DEFAULT_BULK_BATCH_SIZE))

index_prefix = os.environ.get("INDEX_PREFIX").lower()
endpoint = os.environ.get("ENDPOINT")

log_type = os.environ.get("LOG_TYPE")
engine = os.environ.get("ENGINE")

aos = OpenSearch(
    region=default_region,
    endpoint=endpoint.strip("https://"),
    index_prefix=index_prefix,
    engine=engine,
    log_type=log_type,
)


class WAFScope(Enum):
    CLOUDFRONT = "CLOUDFRONT"
    REGIONAL = "REGIONAL"


def json_serial(obj):
    """JSON serializer for objects not serializable by default json code"""

    if isinstance(obj, (datetime, date)):
        return obj.isoformat()
    raise TypeError("Type %s not serializable" % type(obj))


def lambda_handler(event, _):

    if log_source_region != "us-east-1":
        regional_web_acls_resp = waf.list_web_acls(
            Scope=WAFScope.REGIONAL.value, Limit=100
        )
        return process_log(event, WAFScope.REGIONAL.value, regional_web_acls_resp)
    else:
        cf_web_acls_resp = waf.list_web_acls(Scope=WAFScope.CLOUDFRONT.value, Limit=100)
        result = process_log(event, WAFScope.CLOUDFRONT.value, cf_web_acls_resp)
        if result[0] == 0 and result[1] == 0:
            regional_web_acls_resp = waf.list_web_acls(
                Scope=WAFScope.REGIONAL.value, Limit=100
            )
            result = process_log(event, WAFScope.REGIONAL.value, regional_web_acls_resp)
        return result


def process_log(event, scope: str, web_acls_resp):
    if "WebACLs" not in web_acls_resp:
        logger.error("Unable to find any WebACLs in current region")
        return 0, 0
    try:
        if dt := event.get("time", ""):
            now = datetime.strptime(dt, "%Y-%m-%dT%H:%M:%SZ")
        else:
            logger.info("Unknown event time, use current datetime")
            now = datetime.now()
        records = []
        for acl in web_acls_resp["WebACLs"]:
            if acl["Name"] not in web_acl_list:
                continue

            response = waf.get_web_acl(
                Name=acl["Name"],
                Scope=scope,
                Id=acl["Id"],
            )

            rules = [response["WebACL"]]
            rules.extend(response["WebACL"]["Rules"])
            if len(rules) == 0:
                logger.info("No metrics found for %s", acl["Name"])
                break

            for rule in rules:
                cfg = rule["VisibilityConfig"]
                if cfg["SampledRequestsEnabled"]:
                    metric_name = cfg["MetricName"]

                    # Delay for 5 minute + interval
                    response = waf.get_sampled_requests(
                        WebAclArn=acl["ARN"],
                        RuleMetricName=metric_name,
                        Scope=scope,
                        TimeWindow={
                            "StartTime": now - timedelta(minutes=5 + interval),
                            "EndTime": now - timedelta(minutes=5),
                        },
                        MaxItems=500,
                    )

                    for req in response["SampledRequests"]:
                        req["WebaclName"] = acl["Name"]
                        records.append(req)

        if len(records) == 0:
            logger.info(
                f"scope is {scope}, web_acl_list is {web_acl_list}, No requests found, quit the process"
            )
            return 0, 0

        index_name = aos.default_index_name()
        failed_number = bulk_load_records(records, index_name)
        logger.info(
            "---> Total: %d, Failed: %d, Scope: %s", len(records), failed_number, scope
        )
        return len(records), failed_number

    except Exception as e:
        logger.error(e)

    return 0, 0


def _create_bulk_records(records: list) -> list:
    """Helper function to create payload for bulk load"""
    bulk_body = []
    for record in records:
        bulk_body.append(json.dumps({BULK_ACTION: {}}) + "\n")
        bulk_body.append(json.dumps(record, default=json_serial) + "\n")

    data = "".join(bulk_body)
    return data


def bulk_load_records(records: list, index_name: str) -> int:
    """Call AOS bulk load API to load data

    Args:
        records (list): A list of json records
        index_name (str): index name in OpenSearch

    Raises:
        RuntimeError: if bulk load api failed

    Returns:
        int: number of failed records
    """
    bulk_records = _create_bulk_records(records)
    failed_number = 0
    retry = 1
    while True:
        # Call bulk load
        response = aos.bulk_load(bulk_records, index_name)

        # Retry if status code is >= 300
        if response.status_code < 300:
            resp_json = response.json()
            for _, item in enumerate(resp_json["items"]):
                if item[BULK_ACTION]["status"] >= 300:
                    failed_number += 1
            break

        if retry >= TOTAL_RETRIES:
            raise RuntimeError(f"Unable to bulk load the records after {retry} retries")

        logger.error("Bulk load failed: %s", response.text)
        logger.info("Sleep 10 seconds and retry...")
        retry += 1
        time.sleep(SLEEP_INTERVAL)

    return failed_number


def check_index_template():
    """Check if an index template already exists or not

    Index template contains index mapping,
    and must exist before loading data
    otherwise, the mapping can't be updated once data is loaded
    """
    retry = 1
    while True:
        result = aos.exist_index_template()
        if result:
            break
        if retry >= TOTAL_RETRIES:
            raise RuntimeError(f"Unable to check index template after {retry} retries")

        logger.info("Sleep 10 seconds and retry...")
        retry += 1
        time.sleep(SLEEP_INTERVAL)
