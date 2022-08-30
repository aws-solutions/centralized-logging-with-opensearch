# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import csv
import gzip
import importlib
import json
import logging
import os
import time
import urllib.parse
from datetime import datetime
from io import StringIO
from pathlib import Path
from typing import Tuple
from botocore.client import Config

from boto3_client import get_resource
from util.log_parser import LogParser
from util.osutil import OpenSearch

logger = logging.getLogger()
logger.setLevel(logging.INFO)

TOTAL_RETRIES = 3
SLEEP_INTERVAL = 10
DEFAULT_BULK_BATCH_SIZE = "10000"
BULK_ACTION = "index"

solution_version = os.environ.get("SOLUTION_VERSION", "v1.0.0")
solution_id = os.environ.get("SOLUTION_ID", "SO8025")
user_agent_extra = f"AwsSolution/{solution_id}/{solution_version}"
# Add user agent.
default_config = Config(user_agent_extra=user_agent_extra)

# batch size can be overwritten via Env. var.
batch_size = int(os.environ.get("BULK_BATCH_SIZE", DEFAULT_BULK_BATCH_SIZE))
bucket_name = os.environ.get("LOG_BUCKET_NAME")
backup_bucket_name = os.environ.get("BACKUP_BUCKET_NAME")
index_prefix = os.environ.get("INDEX_PREFIX").lower()
endpoint = os.environ.get("ENDPOINT")
default_region = os.environ.get("AWS_REGION")
log_type = os.environ.get("LOG_TYPE")
engine = os.environ.get("ENGINE")

aos = OpenSearch(
    region=default_region,
    endpoint=endpoint.strip("https://"),
    index_prefix=index_prefix,
    engine=engine,
    log_type=log_type,
)

plugins = os.environ.get("PLUGINS", "")
if plugins:
    plugin_modules = [
        importlib.import_module(plugin).Plugin(log_type)
        for plugin in plugins.split(",")
    ]
else:
    plugin_modules = []

is_local_session = log_type in ["RDS", "Lambda"]
s3 = get_resource('s3', is_local_session)


def lambda_handler(event, context):
    # print(event)
    # logger.info("Received event: " + json.dumps(event, indent=2))

    total, processed, failed_number = 0, 0, 0

    # Parse event message and get log file names
    keys = get_object_key(event)
    if len(keys):
        # check if index template is already created.
        check_index_template()

        parser = LogParser(log_type)
        # Define index name
        # Default to <index-prefix>-<type>-YYYY-MM-DD
        index_name = aos.default_index_name()
        logger.info("index name: %s", index_name)

        export_format = parser.export_format()

        for key in keys:
            logger.info("Log File: %s", key)

            export_prefix = get_export_prefix(key)

            # Start processing log file
            for part, (batch_total, batch_processed,
                       failed_records) in enumerate(
                           process_log_file(parser, key, index_name)):
                total, processed, failed_number = (
                    total + batch_total,
                    processed + batch_processed,
                    failed_number + len(failed_records),
                )
                if failed_records:
                    export_key = f"{export_prefix}.{part}.{export_format}"
                    status_code = export_failed_records(
                        failed_records, backup_bucket_name, export_key)
                    logger.info("Export status: %d", status_code)

    logger.info(
        "--> Total: %d Excluded: %d Loaded: %d Failed: %d",
        total,
        total - processed,
        processed - failed_number,
        failed_number,
    )
    return total, failed_number


def write_to_csv(json_records: list) -> str:
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
    logger.info("Export failed records to %s/%s", bucket, key)

    export_obj = s3.Object(bucket, key)
    if key.endswith(".json"):
        body = json.dumps(failed_records)
    else:
        body = write_to_csv(failed_records)

    resp = export_obj.put(ACL="bucket-owner-full-control", Body=body)
    # logger.info(resp)
    return resp["ResponseMetadata"]["HTTPStatusCode"]


def _create_bulk_records(records: list) -> list:
    """Helper function to create payload for bulk load"""
    bulk_body = []
    # TODO: doc id
    for record in records:
        bulk_body.append(json.dumps({BULK_ACTION: {}}) + "\n")
        bulk_body.append(json.dumps(record) + "\n")

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
    if len(records) == 0:
        return []
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
                # print(item[BULK_ACTION]['status'])
                if item[BULK_ACTION]["status"] >= 300:
                    # records[idx]['index_name'] = index_name
                    records[idx]["error_type"] = item[BULK_ACTION]["error"][
                        "type"]
                    records[idx]["error_reason"] = item[BULK_ACTION]["error"][
                        "reason"]
                    failed_records.append(records[idx])

            break

        if retry >= TOTAL_RETRIES:
            raise RuntimeError(
                f"Unable to bulk load the records after {retry} retries")

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
    # logger.info('Check if index template already exists or not...')
    retry = 1
    while True:
        result = aos.exist_index_template()
        if result:
            break
        if retry >= TOTAL_RETRIES:
            raise RuntimeError(
                f"Unable to check index template after {retry} retries")

        logger.info("Sleep 10 seconds and retry...")
        retry += 1
        time.sleep(SLEEP_INTERVAL)


def get_object_key(event) -> str:
    """Get log file path from event message"""
    try:
        keys = []
        events = []

        if "body" in event["Records"][0]:
            # this is a SQS event messages
            # extract the message body to get S3 events.
            for event_record in event["Records"]:
                event = json.loads(event_record["body"])
                # skip test event
                if "Event" in event and event["Event"] == "s3:TestEvent":
                    logger.info("Test Message, do nothing...")
                    continue
                events.append(event["Records"][0])
        else:
            events = event["Records"]

        for event_record in events:
            # event_record = e["Records"][0]
            if "s3" in event_record:
                # s3 event message
                key = urllib.parse.unquote_plus(
                    event_record["s3"]["object"]["key"], encoding="utf-8")
                keys.append(key)

        return keys
    except Exception as e:
        # unknown format
        logger.error(e)
        raise RuntimeError(f"Unknown Event {event}")


def read_file(key: str):
    """Read a file from S3 Line by Line"""
    obj = s3.Object(bucket_name, key)
    try:
        logger.info("Start reading file...")
        body = obj.get()["Body"]
        if key.endswith(".gz") or log_type in ["RDS", "Lambda"]:
            with gzip.GzipFile(fileobj=body) as f:
                while line := f.readline():
                    yield line
        else:
            for line in body.iter_lines():
                yield line

    except Exception as e:
        # unable to get
        logger.error(e)
        raise RuntimeError(f"Unable to process log file {key}")


def process_log_file(parser: LogParser, key: str,
                     index_name: str) -> Tuple[int, int, list]:
    """Read with log file and process the record and load into AOS

    Args:
        parser (LogParser): LogParser instance
        key (str): object key in S3 of log file
        index_name (str): index_name

    Raises:
        RuntimeError: if failed to read the log file in S3

    Yields:
        A tuple of total, processed records count and list of failed records
    """
    # Read file
    records = []
    failed_records, processed_records = [], []
    count, total, processed, skipped_lines = 0, 0, 0, 0

    for line in read_file(key):
        # First step is to parse line by line
        # one line can contain multiple log records
        line = line.decode("utf-8")
        result = parser.parse(line)

        # TODO: Can have more processing steps here.

        if result:  # valid record
            if isinstance(result, list):
                records.extend(result)
                count += len(result)
            else:
                records.append(result)
                count += 1
        else:
            skipped_lines += 1

        # To avoid consuming too much memory
        # Start processing in small batches
        if count >= batch_size:
            # processed by plugins
            processed_records.extend(_process_by_plugins(records))
            # reset
            total, count, records = (
                total + count,
                0,
                [],
            )
            # logger.info(f">>> check batch : {total}, {len(processed_records)}")

        if len(processed_records) >= batch_size:
            failed_records.extend(
                bulk_load_records(processed_records, index_name))
            processed, processed_records = processed + len(
                processed_records), []

            if len(failed_records) >= batch_size:
                yield total, processed, failed_records
                # Reset processed and failed records
                total, processed, failed_records = 0, 0, []

    # Process and Bulk load for the rest
    processed_records.extend(_process_by_plugins(records))

    failed_records.extend(bulk_load_records(processed_records, index_name))
    total, processed = total + count, processed + len(processed_records)
    logger.info("Skipped Lines: %d", skipped_lines)
    yield total, processed, failed_records


def _process_by_plugins(records):
    if plugin_modules:
        for p in plugin_modules:
            records = p.process(records)
    return records


def get_export_prefix(key: str) -> str:
    """Generate export key prefix.
    This is based on original key and current date and without extension
    """
    date = datetime.now().strftime("%Y-%m-%d")
    filename = Path(key).stem
    return (
        f"error/AWSLogs/{log_type}/index-prefix={index_prefix}/date={date}/{filename}"
    )
