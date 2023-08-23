# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import json
import logging
import os
import time
from datetime import datetime, timedelta, date

from commonlib.opensearch import OpenSearchUtil, Engine
from commonlib import AWSConnection
from util import helper

TOTAL_RETRIES = 3
SLEEP_INTERVAL = 10
DEFAULT_BULK_BATCH_SIZE = "10000"
BULK_ACTION = "index"

logger = logging.getLogger()
logger.setLevel(logging.INFO)

conn = AWSConnection()

default_region = os.environ.get("AWS_REGION")
log_source_region = os.environ.get("LOG_SOURCE_REGION", default_region)

interval = int(os.environ.get("INTERVAL", "1"))

web_acl_names = os.environ.get("WEB_ACL_NAMES")
web_acl_list = web_acl_names.split(",")

scope = os.environ.get("SCOPE", "REGIONAL")
assume_role = os.environ.get("LOG_SOURCE_ACCOUNT_ASSUME_ROLE", "")
waf_region = log_source_region if scope == "REGIONAL" else "us-east-1"
waf = conn.get_client("wafv2", sts_role_arn=assume_role, region_name=waf_region)

# batch size can be overwritten via Env. var.
batch_size = int(os.environ.get("BULK_BATCH_SIZE", DEFAULT_BULK_BATCH_SIZE))
backup_bucket_name = os.environ.get("BACKUP_BUCKET_NAME")
index_prefix = os.environ.get("INDEX_PREFIX").lower()
endpoint = os.environ.get("ENDPOINT")

log_type = os.environ.get("LOG_TYPE")
engine_type = os.environ.get("ENGINE")
stack_name = os.environ.get("STACK_NAME")

aos = OpenSearchUtil(
    region=default_region,
    endpoint=endpoint,
    index_prefix=index_prefix,
    engine=Engine(engine_type),
    log_type=log_type,
)


def json_serial(obj):
    """JSON serializer for objects not serializable by default json code"""

    if isinstance(obj, (datetime, date)):
        return obj.isoformat()
    raise TypeError("Type %s not serializable" % type(obj))


def lambda_handler(event, _):
    web_acls_resp = waf.list_web_acls(Scope=scope, Limit=100)
    return process_log(event, web_acls_resp)


def process_log(event, web_acls_resp):
    if "WebACLs" not in web_acls_resp:
        logger.error("Unable to find any WebACLs in current region")
        return 0, 0
    try:
        now = get_event_time(event)
        records = []
        for acl in web_acls_resp["WebACLs"]:
            if acl["Name"] not in web_acl_list:
                continue
            records.extend(get_records_for_acl(acl, now))

        if len(records) == 0:
            logger.info(
                f"scope is {scope}, web_acl_list is {web_acl_list}, No requests found, quit the process"
            )
            return 0, 0

        index_name = aos.default_index_name()
        failed_records = bulk_load_records(records, index_name)
        failed_number = 0
        if failed_records:
            failed_number = len(failed_records)
            data_time = datetime.now().strftime("%Y-%m-%d-%H-%M-%S")
            helper.export_failed_records(
                failed_records,
                backup_bucket_name,
                f"error/AWSLogs/{log_type}/index-prefix={index_prefix}/date={data_time}.csv",
                plugin_modules=[]
            )
        logger.info(
            "---> StackName: %s Total: %d Loaded: %d Failed: %d Scope: %s",
            stack_name,
            len(records),
            len(records) - failed_number,
            failed_number,
            scope,
        )
        return len(records), failed_number

    except Exception as err:
        logger.error(err)

    return 0, 0


def get_event_time(event):
    if dt := event.get("time", ""):
        return datetime.strptime(dt, "%Y-%m-%dT%H:%M:%SZ")
    else:
        logger.info("Unknown event time, use current datetime")
        return datetime.now()


def get_records_for_acl(acl, now):
    response = waf.get_web_acl(
        Name=acl["Name"],
        Scope=scope,
        Id=acl["Id"],
    )

    rules = [response["WebACL"]]
    rules.extend(response["WebACL"]["Rules"])
    if len(rules) == 0:
        logger.info("No metrics found for %s", acl["Name"])
        return []

    records = []
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
    return records


def _create_bulk_records(records: list) -> str:
    """Helper function to create payload for bulk load"""
    bulk_body = []
    for record in records:
        bulk_body.append(json.dumps({BULK_ACTION: {}}) + "\n")
        bulk_body.append(json.dumps(record, default=json_serial) + "\n")

    data = "".join(bulk_body)
    return data


def bulk_load_records(records: list, index_name: str) -> list:
    """Call AOS bulk load API to load data

    Args:
        records (list): A list of json records
        index_name (str): index name in OpenSearch

    Raises:
        RuntimeError: if bulk load api failed

    Returns:
        list: A list of failed records
    """
    bulk_records = _create_bulk_records(records)
    failed_records = []
    retry = 1
    while True:
        # Call bulk load
        response = aos.bulk_load(bulk_records, index_name)

        # Retry if status code is >= 300
        if response.status_code < 300:
            resp_json = response.json()
            for idx, item in enumerate(resp_json["items"]):
                # Check and store failed records with error message
                if item[BULK_ACTION]["status"] >= 300:
                    records[idx]["error_type"] = item[BULK_ACTION]["error"]["type"]
                    records[idx]["error_reason"] = item[BULK_ACTION]["error"]["reason"]
                    failed_records.append(records[idx])

            break

        if retry >= TOTAL_RETRIES:
            raise RuntimeError(f"Unable to bulk load the records after {retry} retries")

        logger.error("Bulk load failed: %s", response.text)
        logger.info("Sleep 10 seconds and retry...")
        retry += 1
        time.sleep(SLEEP_INTERVAL)

    return failed_records


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
