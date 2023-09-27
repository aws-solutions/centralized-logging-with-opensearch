# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import base64
import csv
import json
import logging
import os
import time
import gzip
from datetime import datetime
from io import StringIO

import boto3

from typing import Dict
from commonlib.opensearch import OpenSearchUtil, Engine
from util.helper import tsv2json, fillna
from util import log_parser
from config import FIELD_NAMES

logger = logging.getLogger()
logger.setLevel(logging.INFO)

TOTAL_RETRIES = 3
SLEEP_INTERVAL = 10

DEFAULT_BULK_BATCH_SIZE = 20000
BULK_ACTION = "index"

ERROR_UNABLE_TO_PARSE_LOG_RECORDS = "Unable to parse log records: %s"

batch_size = int(os.environ.get("BULK_BATCH_SIZE", DEFAULT_BULK_BATCH_SIZE))
backup_bucket_name = os.environ.get("BACKUP_BUCKET_NAME")

index_prefix = os.environ.get("INDEX_PREFIX")
endpoint = os.environ.get("ENDPOINT")
default_region = os.environ.get("AWS_REGION")
log_type = os.environ.get("LOG_TYPE", "")
log_format = os.environ.get("LOG_FORMAT")
engine = os.environ.get("ENGINE", "OpenSearch")
source = os.environ.get("SOURCE", "KDS")
stack_name = os.environ.get("STACK_NAME", "")

IS_APP_PIPELINE = "apppipe" in stack_name.lower()
IS_SVC_PIPELINE = not IS_APP_PIPELINE

s3 = boto3.resource("s3", region_name=default_region)
lambda_client = boto3.client("lambda", region_name=default_region)
function_name = os.environ.get("FUNCTION_NAME")
aos = OpenSearchUtil(
    region=default_region,
    endpoint=endpoint.strip("https://"),
    index_prefix=index_prefix,
    engine=Engine(engine),
    log_type=log_type,
)
aos.index_name_has_log_type_suffix(IS_SVC_PIPELINE)


def process_msk_event(event):
    if "eventSource" not in event or event["eventSource"] != "aws:kafka":
        logger.error("Unknown event source, expected event source is Kafka")
        return

    records = []

    for k, v in event["records"].items():
        # logger.info("Key is %s", k)
        if not isinstance(v, list):
            logger.error("The messages must be a list")
            return []

        # logger.info("Message size is %d", len(v))
        for msg in v:
            try:
                value = json.loads(
                    base64.b64decode(msg.get("value", "")).decode(
                        "utf-8", errors="replace"
                    )
                )
                # logger.info(value)
                records.append(value)
            except Exception as e:
                logger.error(e)
                logger.error(ERROR_UNABLE_TO_PARSE_LOG_RECORDS, msg.get("value", ""))

    return records


def process_kds_event(event, parse_func):
    records = []
    for record in event["Records"]:
        try:
            value = parse_func(
                base64.b64decode(record["kinesis"]["data"]).decode(
                    "utf-8", errors="replace"
                )
            )
            records.append(value)
        except Exception:
            logger.error(ERROR_UNABLE_TO_PARSE_LOG_RECORDS, record)

    return records


def process_gzip_kds_event(event, parse_func):
    result = []
    for record in event["Records"]:
        try:
            values = parse_func(
                gzip.decompress(base64.b64decode(record["kinesis"]["data"])).decode(
                    "utf-8", errors="replace"
                )
            )
            for value in values:
                result.append(value)
        except Exception:
            logger.error(ERROR_UNABLE_TO_PARSE_LOG_RECORDS, record)
    return result


def parse_sinle_tsv_line(s: str) -> Dict:
    rows = fillna(tsv2json(s, fieldnames=FIELD_NAMES))
    if len(rows) != 1:
        raise ValueError(f"The tsv data({s}) contains more than one line")
    ret = rows[0]
    if ret.get(None):
        raise ValueError(
            f"The field names({FIELD_NAMES}) doesn't match the tsv data({s})"
        )
    return ret


def parse_vpc_logs_cwl(line: str):
    try:
        records = []
        keys = log_format.split(",")
        for event in json.loads(line)["logEvents"]:
            record = {}
            message = event["message"]
            values = message.split(" ")
            if len(values) != len(keys):
                logger.info("unequal length")
                continue
            no_data = False
            for i in range(len(keys)):
                if keys[i] == "log-status" and (
                    values[i] == "NODATA" or values[i] == "SKIPDATA"
                ):
                    no_data = True
                    break
                record[keys[i]] = values[i]
            if not no_data:
                records.append(record)
        return records
    except Exception as e:
        logger.error("unable to parse log line, error: %s", e)
        return []


def lambda_handler(event, _):
    logs = []
    logger.info(f"source is {source}")
    if source == "KDS":
        if log_type == "cloudfront-rt":
            logs = process_kds_event(event, parse_func=parse_sinle_tsv_line)
        elif log_type == "CloudTrail":
            cloud_trail = log_parser.CloudTrailCWL()
            logs = process_gzip_kds_event(event, parse_func=cloud_trail.parse)
        elif log_type == "VPCFlow":
            logs = process_gzip_kds_event(event, parse_func=parse_vpc_logs_cwl)
        else:
            logs = process_kds_event(event, parse_func=json.loads)
    elif source == "MSK":
        logs = process_msk_event(event)
    else:
        logger.error(
            "Unknown Source, expected either KDS or MSK, please check environment variables"
        )
        return ""

    total = len(logs)
    logger.info("%d lines of logs received", total)

    failed_logs = batch_bulk_load(logs, aos.default_index_name())

    logger.info(
        "--> StackName: %s Total: %d Excluded: 0 Loaded: %d Failed: %d",
        stack_name,
        total,
        total - len(failed_logs),
        len(failed_logs),
    )

    key = get_export_key()

    if failed_logs:
        status_code = export_failed_records(failed_logs, backup_bucket_name, key)
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


def log_type_mapping(the_type: str) -> str:
    if the_type == "VPCFlow":
        return "VPC"
    return the_type


def get_export_key() -> str:
    """Generate export key prefix."""
    now = datetime.now()
    date = now.strftime("%Y-%m-%d")
    filename = now.strftime("%H-%M-%S") + ".json"
    if IS_SVC_PIPELINE:
        return f"error/AWSLogs/{log_type_mapping(log_type)}/index-prefix={index_prefix}/date={date}/{filename}"
    else:
        return f"error/APPLogs/index-prefix={index_prefix}/date={date}/{filename}"


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
    end = 2000
    if batch_size > 2000:
        end = batch_size
    start = 0
    while start < total:
        batch_failed_records = bulk_load_records(
            records[start : start + end], index_name
        )
        if batch_failed_records:
            failed_records.extend(batch_failed_records)
        start += end

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
        elif response.status_code == 413:
            adjust_bulk_batch_size()
            raise RuntimeError("Due to status code 413, unable to bulk load the records, we will retry.")
            
        if retry >= TOTAL_RETRIES:
            raise RuntimeError(f"Unable to bulk load the records after {retry} retries")
        else:
            logger.error(f"Bulk load failed: {response.text}")
            logger.info("Sleep 10 seconds and retry...")
            retry += 1
            time.sleep(SLEEP_INTERVAL)

    return failed_records


def adjust_bulk_batch_size():
    global batch_size
    if batch_size >= 4000:
        batch_size = batch_size - 2000
    logger.info(f"batch_size: {batch_size}")
    response = lambda_client.get_function_configuration(
        FunctionName=function_name
    )
    variables = response["Environment"]["Variables"]
    
    if variables.get("BULK_BATCH_SIZE") and int(variables["BULK_BATCH_SIZE"]) >= 4000:
        variables["BULK_BATCH_SIZE"] = str(int(variables["BULK_BATCH_SIZE"]) - 2000)
        lambda_client.update_function_configuration(FunctionName=function_name, Environment={"Variables": variables})
