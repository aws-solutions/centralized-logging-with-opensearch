# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import gzip
import importlib
import json
import logging
import os
import time
import urllib.parse
from datetime import datetime
from pathlib import Path
from util import helper

from util.log_parser import (
    LogParser,
    Counter,
    counter_iter,
    parse_by_regex,
    parse_by_json,
    batch_iter,
)

from commonlib.opensearch import OpenSearchUtil, Engine
from commonlib import AWSConnection

TOTAL_RETRIES = 3
SLEEP_INTERVAL = 10
DEFAULT_BULK_BATCH_SIZE = "10000"
BULK_ACTION = "index"

logger = logging.getLogger()
logger.setLevel(logging.INFO)

conn = AWSConnection()

# batch size can be overwritten via Env. var.
batch_size = int(os.environ.get("BULK_BATCH_SIZE", DEFAULT_BULK_BATCH_SIZE))
bucket_name = os.environ.get("LOG_BUCKET_NAME")
backup_bucket_name = os.environ.get("BACKUP_BUCKET_NAME")
index_prefix = os.environ.get("INDEX_PREFIX").lower()
endpoint = os.environ.get("ENDPOINT")
default_region = os.environ.get("AWS_REGION")
log_type = os.environ.get("LOG_TYPE")
engine_type = os.environ.get("ENGINE")
stack_name = os.environ.get("STACK_NAME", "")

CONFIG_JSON = os.environ.get("CONFIG_JSON", "")
IS_APP_PIPELINE = "apppipe" in stack_name.lower()
IS_SVC_PIPELINE = not IS_APP_PIPELINE


aos = OpenSearchUtil(
    region=default_region,
    endpoint=endpoint,
    index_prefix=index_prefix,
    engine=Engine(engine_type),
    log_type=log_type,
)
aos.index_name_has_log_type_suffix(IS_SVC_PIPELINE)

plugins = os.environ.get("PLUGINS", "")
if plugins:
    plugin_modules = [
        importlib.import_module(plugin).Plugin(log_type)
        for plugin in plugins.split(",")
    ]
else:
    plugin_modules = []

assume_role = os.environ.get("LOG_SOURCE_ACCOUNT_ASSUME_ROLE", "")

if log_type in ["RDS", "Lambda"]:
    assume_role = ""


def process_event(event):
    """
    config = {
        "parser": "regex",
        "regex": "(?P<remote_addr>\S+)\s+-\s+(?P<remote_user>\S+)\s+\[(?P<time_local>\d+/\S+/\d+:\d+:\d+:\d+\s+\S+)\]\s+\"(?P<request_method>\S+)\s+(?P<request_uri>\S+)\s+\S+\"\s+(?P<status>\S+)\s+(?P<body_bytes_sent>\S+)",
        "time_key": "time_local",
        "time_format": "%d/%b/%Y:%H:%M:%S %z",
        "time_offset": "",
        "is_gzip": False,
    }
    """
    config = json.loads(CONFIG_JSON)
    is_gzip = config["is_gzip"]
    parser = config["parser"]
    time_key = config["time_key"]
    time_format = config["time_format"]
    time_offset = config.get("time_offset") or ""

    failed_records_count = 0
    total_logs_counter = Counter()

    check_index_template()
    for bucket, key in get_bucket_and_keys(event):
        s3 = conn.get_client("s3", sts_role_arn=assume_role, client_type="resource")
        lines = s3_read_object_by_lines(s3, bucket, key, is_gzip)

        if parser == "regex":
            regex = config["regex"]
            regex = regex.replace("?<", "?P<")
            logs = parse_by_regex(
                lines,
                regex,
                time_key,
                time_format,
                time_offset,
            )
        elif parser == "json":
            logs = parse_by_json(lines, time_key, time_format, time_offset)
        else:
            raise ValueError(f"Unknown parser specified {parser}")

        logs = counter_iter((log.dict(time_key) for log in logs), total_logs_counter)
        batches = batch_iter(logs, batch_size)
        for idx, batch in enumerate(batches):
            failed_records = bulk_load_records(batch, aos.default_index_name())
            if failed_records:
                failed_records_count += len(failed_records)
                now = datetime.now()
                ymd = now.strftime("%Y-%m-%d")

                helper.export_failed_records(
                    failed_records,
                    backup_bucket_name,
                    f"error/APPLogs/index-prefix={index_prefix}/date={ymd}/{bucket}/{key}/{idx}.csv",
                    plugin_modules
                )

        logging.info(
            "--> StackName: %s Total: %d Excluded: 0 Loaded: %d Failed: %d",
            stack_name,
            total_logs_counter.value,
            total_logs_counter.value - failed_records_count,
            failed_records_count,
        )


def lambda_handler(event, _):
    if CONFIG_JSON:
        return process_event(event)

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
            for part, (batch_total, batch_processed, failed_records) in enumerate(
                process_log_file(parser, key, index_name)
            ):
                total, processed, failed_number = (
                    total + batch_total,
                    processed + batch_processed,
                    failed_number + len(failed_records),
                )
                if failed_records:
                    export_key = f"{export_prefix}.{part}.{export_format}"
                    status_code = helper.export_failed_records(
                        failed_records, backup_bucket_name, export_key, plugin_modules
                    )
                    logger.info("Export status: %d", status_code)

    logger.info(
        "--> StackName: %s Total: %d Excluded: %d Loaded: %d Failed: %d",
        stack_name,
        total,
        total - processed,
        processed - failed_number,
        failed_number,
    )
    return total, failed_number


def _create_bulk_records(records: list) -> str:
    """Helper function to create payload for bulk load"""
    bulk_body = []
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
    # logger.info('Check if index template already exists or not...')
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


def get_object_key(event) -> list[str]:
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
            if "s3" in event_record:
                # s3 event message
                key = urllib.parse.unquote_plus(
                    event_record["s3"]["object"]["key"], encoding="utf-8"
                )
                keys.append(key)

        return keys
    except Exception as e:
        # unknown format
        logger.error(e)
        raise RuntimeError(f"Unknown Event {event}")


def get_bucket_and_keys(event):
    """Get log file path from event message"""
    try:
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
            if "s3" in event_record:
                # s3 event message
                bucket = event_record["s3"]["bucket"]["name"]
                key = urllib.parse.unquote_plus(
                    event_record["s3"]["object"]["key"], encoding="utf-8"
                )
                yield (bucket, key)
    except Exception:
        raise RuntimeError(f"Unknown Event {event}")


def s3_read_object_by_lines(s3_client, bucket_name, object_key, is_gzip=False):
    obj = s3_client.Object(bucket_name, object_key)
    body = obj.get()["Body"]
    if is_gzip:
        with gzip.GzipFile(fileobj=body) as f:
            while line := f.readline():
                yield line.decode("utf-8", errors="replace")
    else:
        for line in body.iter_lines(keepends=True):
            yield line.decode("utf-8", errors="replace")


def read_file(s3, key: str):
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


def process_log_file(parser: LogParser, key: str, index_name: str):
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
    s3 = conn.get_client("s3", sts_role_arn=assume_role, client_type="resource")

    records = []
    failed_records, processed_records = [], []
    count, total, processed, skipped_lines = 0, 0, 0, 0

    for line in read_file(s3, key):
        # First step is to parse line by line
        # one line can contain multiple log records
        line = line.decode("utf-8", errors="replace")
        result = parser.parse(line)

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
            failed_records.extend(bulk_load_records(processed_records, index_name))
            processed, processed_records = processed + len(processed_records), []

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
