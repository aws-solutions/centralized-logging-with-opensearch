# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import base64
import csv
import json
import logging
import os
import time
from datetime import datetime
from io import StringIO

import boto3

from util.osutil import OpenSearch

logger = logging.getLogger()
logger.setLevel(logging.INFO)

TOTAL_RETRIES = 3
SLEEP_INTERVAL = 10
BULK_BATCH_SIZE = 20000
DEFAULT_BULK_BATCH_SIZE = 20000
BULK_ACTION = "index"

s3 = boto3.resource("s3")
batch_size = int(os.environ.get('BULK_BATCH_SIZE', DEFAULT_BULK_BATCH_SIZE))
bucket_name = os.environ.get("LOG_BUCKET_NAME")
failed_log_bucket_name = os.environ.get("FAILED_LOG_BUCKET_NAME")

index_prefix = os.environ.get("INDEX_PREFIX")
endpoint = os.environ.get("ENDPOINT")
default_region = os.environ.get("AWS_REGION")
log_type = os.environ.get("LOG_TYPE")
engine = os.environ.get("ENGINE")

aos = OpenSearch(
    region=default_region,
    endpoint=endpoint,
    index_prefix=index_prefix,
    engine=engine,
    log_type=log_type,
)


def record2log(record):
    return json.loads(base64.b64decode(record["kinesis"]["data"]).decode("utf-8"))


def lambda_handler(event, context):
    now = datetime.now()
    logs = list(map(record2log, event["Records"]))
    total = len(logs)

    logger.info("%d lines of logs received", total)

    index_name = f'{index_prefix}-{now.strftime("%Y%m%d")}'
    failed_logs = batch_bulk_load(logs, index_name)

    logger.info(
        "--> Total: %d Loaded: %d Failed: %d",
        total,
        total - len(failed_logs),
        len(failed_logs),
    )

    nowstr = now.strftime("%Y%m%d-%H%M%S")

    if failed_logs:
        status_code = export_failed_records(
            failed_logs, failed_log_bucket_name, f"${index_prefix}/${nowstr}.json"
        )
        logger.error(f"Export status: {status_code}")


def write_to_csv(json_records) -> str:
    """Convert json format to csv format.

    Args:
        json_records (list): A list of json records

    Returns:
        str: csv file body
    """
    f = StringIO()
    fieldnames = json_records[0].keys()
    writer = csv.DictWriter(f, fieldnames=fieldnames)
    writer.writeheader()
    for record in json_records:
        writer.writerow(record)

    f.seek(0)
    return f.read()


def export_failed_records(failed_records: list, bucket: str, key: str) -> str:
    """Export the failed records in a csv and put the csv into S3 backup bucket

    Args:
        failed_records (list): A list of failed records in json format
        bucket (str): export bucket
        key (str): export key
    """
    logger.info(f"Export failed records to {bucket}/{key}")

    export_obj = s3.Object(bucket, key)
    if key.endswith(".json"):
        body = json.dumps(failed_records)
    else:
        body = write_to_csv(failed_records)
    # print(body)
    resp = export_obj.put(ACL="bucket-owner-full-control", Body=body)
    # logger.info(resp)
    return resp["ResponseMetadata"]["HTTPStatusCode"]


def batch_bulk_load(records: list, index_name: str) -> list:
    """Run bulk load in batches

    Args:
        records (list): A list of json records
        index_name (str): index name in OpenSearch

    Returns:
        list: A list of failed records
    """

    failed_records = []
    total = len(records)

    start = 0
    while start < total:
        batch_failed_records = bulk_load_records(
            records[start: start + batch_size], index_name
        )
        if batch_failed_records:
            failed_records.extend(batch_failed_records)
        start += batch_size

    return failed_records


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
    bulk_body = []
    failed_records = []

    # TODO: doc id
    for record in records:
        bulk_body.append(json.dumps({BULK_ACTION: {}}) + "\n")
        bulk_body.append(json.dumps(record) + "\n")

    data = "".join(bulk_body)

    retry = 1
    while True:
        # Call bulk load
        response = aos.bulk_load(data, index_name)

        # Retry if status code is >= 300
        if response.status_code < 300:
            resp_json = response.json()
            for idx, item in enumerate(resp_json["items"]):
                # Check and store failed records with error message
                # print(item[BULK_ACTION]['status'])
                if item[BULK_ACTION]["status"] >= 300:
                    records[idx]["index_name"] = index_name
                    records[idx]["error_type"] = item[BULK_ACTION]["error"]["type"]
                    records[idx]["error_reason"] = item[BULK_ACTION]["error"]["reason"]
                    failed_records.append(records[idx])

            break

        if retry >= TOTAL_RETRIES:
            raise RuntimeError(f"Unable to bulk load the records after {retry} retries")
        else:
            logger.error(f"Bulk load failed: {response.text}")
            logger.info("Sleep 10 seconds and retry...")
            retry += 1
            time.sleep(SLEEP_INTERVAL)

    return failed_records
