# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import json
import logging
import csv
from io import StringIO
from datetime import datetime

from commonlib import AWSConnection

logger = logging.getLogger()
logger.setLevel(logging.INFO)


conn = AWSConnection()
s3_local = conn.get_client("s3", client_type="resource")


class DateTimeEncoder(json.JSONEncoder):
    """Encode datetime object to string
    In waf sample log pipeline, the error log may contain datetime object,
    which will cause json.dumps() to fail.
    """
    def default(self, o):
        if isinstance(o, datetime):
            return o.isoformat()
        return super().default(o)


def export_failed_records(failed_records: list, bucket: str, key: str, plugin_modules: list = []) -> str:
    """Export the failed records in a csv and put the csv into S3 backup bucket

    Args:
        failed_records (list): A list of failed records in json format
        bucket (str): export bucket
        key (str): export key
        plugin_modules (list): A list of plugin modules
    """
    logger.info("Export failed records to %s/%s", bucket, key)

    export_obj = s3_local.Object(bucket, key)
    if key.endswith(".json"):
        body = json.dumps(failed_records, cls=DateTimeEncoder)
    else:
        body = write_to_csv(failed_records, plugin_modules)

    resp = export_obj.put(ACL="bucket-owner-full-control", Body=body)
    # logger.info(resp)
    return resp["ResponseMetadata"]["HTTPStatusCode"]


def write_to_csv(json_records: list, plugin_modules: list = []) -> str:
    """Convert json format to csv format.

    Args:
        json_records (list): A list of json records

    Returns:
        str: csv file body
    """
    f = StringIO()
    fieldnames = json_records[0].keys()

    if plugin_modules:
        for p in plugin_modules:
            fieldnames = json_records[0].keys() | p.get_mapping().keys()

    writer = csv.DictWriter(f, fieldnames=fieldnames)
    writer.writeheader()
    for record in json_records:
        writer.writerow(record)

    f.seek(0)
    return f.read()