# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import os
import json
from commonlib.logging import get_logger
from commonlib import AWSConnection
from io import StringIO
import csv

from datetime import datetime


logger = get_logger(__name__)

default_region = os.environ.get("AWS_REGION")
failed_log_bucket_name = os.environ.get("BACKUP_BUCKET_NAME")
conn = AWSConnection()
s3_local = conn.get_client("s3", client_type="resource")

index_prefix = os.environ.get("INDEX_PREFIX").lower()


stack_name = os.environ.get("STACK_NAME", "")
IS_APP_PIPELINE = "apppipe" in stack_name.lower()
IS_SVC_PIPELINE = not IS_APP_PIPELINE

scope = os.environ.get("SCOPE", "REGIONAL")

CONFIG_JSON = os.environ.get("CONFIG_JSON", "")
source = str(os.environ.get("SOURCE", "KDS"))
log_type = os.environ.get("LOG_TYPE")


class DateTimeEncoder(json.JSONEncoder):
    """Encode datetime object to string
    In waf sample log pipeline, the error log may contain datetime object,
    which will cause json.dumps() to fail.
    """

    def default(self, o):
        if isinstance(o, datetime):
            return o.isoformat()
        return super().default(o)


class Restorer:
    def export_failed_records(
        self,
        plugin_modules,
        failed_records: list,
        key: str,
        bucket: str = failed_log_bucket_name,
    ) -> str:
        """Export the failed records in a csv and put the csv into S3 backup bucket

        Args:
            failed_records (list): A list of failed records in json format
            key (str): export key
            bucket (str): export bucket


        """

        if len(failed_records) > 0 and key:
            logger.info("Export failed records to %s/%s", bucket, key)
            export_obj = s3_local.Object(bucket, key)
            if key.endswith(".json"):
                body = json.dumps(failed_records, cls=DateTimeEncoder)
            else:
                body = self.write_to_csv(failed_records, plugin_modules)

            resp = export_obj.put(ACL="bucket-owner-full-control", Body=body)
            logger.info(resp)

    def write_to_csv(self, json_records: list, plugin_modules: list = []) -> str:
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

    def _get_export_prefix(
        self, idx=0, log_source_bucket_name=None, object_key=None
    ) -> str:
        """Generate export key prefix.
        This is based on original key and current date and without extension
        """
        now = datetime.now()
        date = now.strftime("%Y-%m-%d")

        if source == "EVENT_BRIDGE":
            # it's for WAFSampled
            filename: str = f"{now.strftime('%H-%M-%S')}.csv"
            return f"error/AWSLogs/{log_type}/index-prefix={index_prefix}/date={date}/{filename}"

        if source == "SQS":
            if CONFIG_JSON:
                # S3 as source
                object_key = f"error/APPLogs/index-prefix={index_prefix}/date={date}/{log_source_bucket_name}/{object_key}/{idx}.csv"
            else:
                # Using S3 as data buffer
                if IS_SVC_PIPELINE:
                    object_key = f"error/AWSLogs/{self._log_type_mapping(log_type)}/index-prefix={index_prefix}/date={date}/{idx}.json"
                else:
                    object_key = f"error/APPLogs/index-prefix={index_prefix}/date={date}/{log_source_bucket_name}/{object_key}/{idx}.json"
            return object_key

        if source in ["KDS", "MSK"]:
            filename: str = f"{now.strftime('%H-%M-%S')}.json"
            if IS_SVC_PIPELINE:
                return f"error/AWSLogs/{self._log_type_mapping(log_type)}/index-prefix={index_prefix}/date={date}/{filename}"
            else:
                return f"error/APPLogs/index-prefix={index_prefix}/date={now.strftime('%Y-%m-%d-%H-%M-%S')}/{filename}"
        return ""

    def _log_type_mapping(self, the_type: str) -> str:
        if the_type == "VPCFlow":
            return "VPC"
        return the_type
