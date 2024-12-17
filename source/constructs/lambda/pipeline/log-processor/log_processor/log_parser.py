# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import datetime
import json
from commonlib.logging import get_logger
import re
import sys
import threading
import urllib.parse
import os
import io
import csv
from typing import Dict, List, Sequence

from abc import ABC, abstractmethod
from copy import deepcopy
from itertools import islice
from typing import Iterable

from log_processor.protocol import get_protocal_code

logger = get_logger(__name__)
log_format = os.environ.get("LOG_FORMAT")


class LogType(ABC):
    """An abstract class represents one type of Logs.

    Each AWS service has its own log format.
    Create a class for each service with an implementation of `parse(line)` to parse its service logs
    """

    _fields = []  # list of fields
    _format = "text"  # log file format, such as json, text, etc.

    @abstractmethod
    def parse(self, line: str):
        """Parse the original raw log record, and return processed json record(s).

        This should be implemented in each service class.
        """
        pass

    @property
    def fields(self):
        return self._fields

    @property
    def format(self):
        return self._format

    def _set_time(self, log: dict):
        self._time_format = self._time_format.replace("%L", "%f")
        self._timestamp = datetime.datetime.strptime(
            log[self._time_key], self._time_format
        )

        if self._time_offset:
            offset = int(self._time_offset)
            tz_hours = int(offset / 100)
            tz_minutes = (offset % 100) if offset > 0 else -(-offset % 100)
            tz = datetime.timezone(
                datetime.timedelta(hours=tz_hours, minutes=tz_minutes)
            )
            self._timestamp = self._timestamp.replace(tzinfo=tz)
            log[self._timestamp] = self._timestamp

        self._time_key = self._time_key or "time"
        log[self.time_key] = self.timestamp.isoformat()
        return log


class CloudFrontWithRT(LogType):
    def parse(self, line: str) -> Dict:
        if not os.environ.get("FIELD_NAMES", ""):
            raise ValueError("Field names not defined")
        field_names = self.comma_delimited_list_string(
            os.environ.get("FIELD_NAMES", "")
        )
        rows = self.fillna(self.tsv2json(line, fieldnames=field_names))
        if len(rows) != 1:
            raise ValueError(f"The tsv data({line}) contains more than one line")
        ret = rows[0]
        if ret.get(None):
            raise ValueError(
                f"The field names({field_names}) doesn't match the tsv data({line})"
            )
        return ret

    def comma_delimited_list_string(self, s: str):
        return list(map(lambda each: each.strip(), s.split(",")))

    def tsv2json(self, line: str, fieldnames: Sequence[str]) -> List[Dict]:
        """
        Convert a tab-separated-values string to a list of dictionaries.
        """

        return list(
            csv.DictReader(io.StringIO(line), fieldnames=fieldnames, delimiter="\t")
        )

    def fillna(self, lst: List[Dict], val=None) -> List[Dict]:
        """
        Fill missing values in a list of dictionaries.
        """
        for each in lst:
            for k, v in each.items():
                if v == "-":
                    if isinstance(val, dict):
                        each[k] = val[k]
                    else:
                        each[k] = val

        return lst


class ELBWithS3(LogType):
    """An implementation of LogType for ELB Logs"""

    _fields = [
        "type",
        "timestamp",
        "elb",
        "client_ip",
        "client_port",
        "target_ip",
        "target_port",
        "request_processing_time",
        "target_processing_time",
        "response_processing_time",
        "elb_status_code",
        "target_status_code",
        "received_bytes",
        "sent_bytes",
        "request_verb",
        "request_url",
        "request_proto",
        "user_agent",
        "ssl_cipher",
        "ssl_protocol",
        "target_group_arn",
        "trace_id",
        "domain_name",
        "chosen_cert_arn",
        "matched_rule_priority",
        "request_creation_time",
        "actions_executed",
        "redirect_url",
        "error_reason",
        "target_port_list",
        "target_status_code_list",
        "classification",
        "classification_reason",
    ]

    def parse(self, lines: Iterable[str]) -> dict:
        for line in lines:
            json_record = {}
            pattern = (
                "([^ ]*) ([^ ]*) ([^ ]*) ([^ ]*):([0-9]*) ([^ ]*)[:-]([0-9]*) ([-.0-9]*) "
                '([-.0-9]*) ([-.0-9]*) (|[-0-9]*) (-|[-0-9]*) ([-0-9]*) ([-0-9]*) "([^ ]*) ([^ ]*) '
                '(- |[^ ]*)" "([^"]*)" ([\w-]+) ([A-Za-z0-9.-]*) ([^ ]*) "([^"]*)" "([^"]*)" '
                '"([^"]*)" ([-.0-9]*) ([^ ]*) "([^"]*)" "([^"]*)" "([^ ]*)" "([^ ]+?)" '
                '"([^ ]+)" "([^ ]*)" "([^ ]*)"'
            )
            result = re.match(pattern, line)
            if result:
                for i, attr in enumerate(self._fields):
                    json_record[attr] = result.group(i + 1)

            yield json_record


class CloudTrail(LogType):
    """An implementation of LogType for CloudTrail Logs"""

    _format = "json"

    def _convert_event(self, cloudtrail_event: dict):
        """Unify all cloudtrail event format for different resources.

        There are different cloudtrail event format in different resources.
        Below logic is trying to unify the format
        In order to load as much as possible
        Otherwise, different format may be rejected with mapper_parsing_exception
        """

        # convert requestParameters.parameters from text to dict
        if "requestParameters" in cloudtrail_event and isinstance(
            cloudtrail_event["requestParameters"], dict
        ):
            cloudtrail_event["requestParameters"] = json.dumps(
                cloudtrail_event["requestParameters"]
            )
        # convert requestParameters.parameters from text to dict
        if "responseElements" in cloudtrail_event and isinstance(
            cloudtrail_event["responseElements"], dict
        ):
            cloudtrail_event["responseElements"] = json.dumps(
                cloudtrail_event["responseElements"]
            )
        return cloudtrail_event

    @abstractmethod
    def parse(self, line: str):
        pass


class CloudTrailWithS3(CloudTrail):
    """An implementation of LogType for CloudTrail Logs"""

    _format = "json"

    def parse(self, lines: Iterable[str]):
        for line in lines:
            try:
                result = json.loads(line)["Records"]
            except Exception:
                logger.info(f"this log is not imported: {line}")
                continue
            for cloudtrail_event in result:
                yield self._convert_event(cloudtrail_event)


class CloudTrailWithCWL(CloudTrail):
    """An implementation of LogType for CloudTrail Logs"""

    _format = "json"

    def parse(self, line: str):
        result = []
        log_events = json.loads(line)["logEvents"]
        for log_event in log_events:
            message = log_event["message"]
            try:
                value = json.loads(message)
            except Exception:
                logger.info(f"this log is not imported: {message}")
                continue
            result.append(self._convert_event(value))
        return result


class ConfigWithS3(LogType):
    """An implementation of LogType for Config Logs"""

    _format = "json"

    def _convert_cfg(self, cfg: dict):
        """Unify all configuration format for different resources.

        There are different configuration format in different resources.
        Below logic is trying to unify the format
        In order to load as much as possible
        Otherwise, different format may be rejected with mapper_parsing_exception
        """
        # convert state from text to dict
        if isinstance(cfg.get("state", "-"), dict):
            cfg["state"] = cfg["state"].get("code", str(cfg["state"]))

        # convert state from status to dict
        if isinstance(cfg.get("status", "-"), dict):
            cfg["status"] = cfg["status"].get("code", str(cfg["status"]))

        # convert endpoint from text to dict
        if isinstance(cfg.get("endpoint", None), str):
            cfg["endpoint"]["address"] = cfg["endpoint"]

        self._check_az(cfg)
        self._check_sg(cfg)

    def _check_az(self, cfg):
        # convert zone from text to dict
        if "availabilityZones" in cfg and isinstance(cfg["availabilityZones"], list):
            azs = cfg["availabilityZones"]
            if len(azs) > 0 and isinstance(cfg["availabilityZones"][0], str):
                cfg["availabilityZones"] = [
                    {"zoneName": az} for az in cfg["availabilityZones"]
                ]
            else:
                cfg["availabilityZones"] = []
        else:
            cfg["availabilityZones"] = []

    def _check_sg(self, cfg):
        # convert securitygroup from text to dict
        if "securityGroups" in cfg and isinstance(cfg["securityGroups"], list):
            security_groups = cfg["securityGroups"]
            if len(security_groups) > 0 and isinstance(cfg["securityGroups"][0], str):
                cfg["securityGroups"] = [
                    {"groupId": sg} for sg in cfg["securityGroups"]
                ]
            else:
                cfg["securityGroups"] = []
        else:
            cfg["securityGroups"] = []

    def parse(self, lines: Iterable[str]):
        for line in lines:
            try:
                data = json.loads(line)
            except json.JSONDecodeError as e:
                logger.error(e)
                yield {}
                continue
            if "configSnapshotId" in data:
                # Ignore Snapshots
                yield {}
                continue
            if "configurationItems" in data:
                json_records = data["configurationItems"]
                for rec in json_records:
                    if "configuration" in rec:
                        self._convert_cfg(rec["configuration"])
                    yield rec


class WAFWithS3(LogType):
    """An implementation of LogType for WAF Logs"""

    _format = "json"

    def parse(self, lines: Iterable[str]):
        for line in lines:
            json_record = json.loads(line)

            # Extract web acl name, host and user agent
            json_record["webaclName"] = re.search(
                "[^/]/webacl/([^/]*)", json_record["webaclId"]
            ).group(1)
            headers = json_record["httpRequest"]["headers"]
            for header in headers:
                if header["name"].lower() == "host":
                    json_record["host"] = header["value"]
                elif header["name"].lower() == "user-agent":
                    json_record["userAgent"] = header["value"]
                else:
                    continue
            yield json_record


class S3WithS3(LogType):
    """An implementation of LogType for S3 Access Logs"""

    _fields = [
        "bucket_owner",
        "bucket",
        "timestamp",
        "remote_ip",
        "requester",
        "request_id",
        "operation",
        "key",
        "request_uri",
        "http_status",
        "error_code",
        "bytes_sent",
        "object_size",
        "total_time",
        "turn_around_time",
        "referrer",
        "user_agent",
        "version_id",
        "host_id",
        "signature_version",
        "cipher_suite",
        "authentication_type",
        "host_header",
        "tls_version",
        "access_point_arn",
        "acl_required",
    ]

    def parse(self, lines: Iterable[str]) -> dict:
        for line in lines:
            json_record = {}
            pattern = (
                '^([^ ]*) ([^ ]*) \\[(.*?)\\] ([^ ]*) ([^ ]*) ([^ ]*) ([^ ]*) ([^ ]*) ("[^"]*"|-) '
                '(-|[0-9]*) ([^ ]*) ([^ ]*) ([^ ]*) ([^ ]*) ([^ ]*) ([^ ]*) ("[^"]*"|-) ([^ ]*)'
                "(?: ([^ ]*) ([^ ]*) ([^ ]*) ([^ ]*) ([^ ]*) ([^ ]*) ([^ ]*) (-|Yes))?.*$"
            )
            result = re.match(pattern, line)
            if result:
                for i, attr in enumerate(self._fields):
                    # print(f'{attr} = {result.group(i+1)}')
                    json_record[attr] = result.group(i + 1).strip('"')

                for key in [
                    "bytes_sent",
                    "object_size",
                    "turn_around_time",
                    "total_time",
                ]:
                    if json_record[key] == "-":
                        json_record[key] = "0"

            yield json_record


class CloudFrontWithS3(LogType):
    """An implementation of LogType for CloudFront Logs"""

    _fields = [
        "timestamp",
        "x-edge-location",
        "sc-bytes",
        "c-ip",
        "cs-method",
        "cs-host",
        "cs-uri-stem",
        "sc-status",
        "cs-referer",
        "cs-user-agent",
        "cs-uri-query",
        "cs-cookie",
        "x-edge-result-type",
        "x-edge-request-id",
        "x-host-header",
        "cs-protocol",
        "cs-bytes",
        "time-taken",
        "x-forwarded-for",
        "ssl-protocol",
        "ssl-cipher",
        "x-edge-response-result-type",
        "cs-protocol-version",
        "fle-status",
        "fle-encrypted-fields",
        "c-port",
        "time-to-first-byte",
        "x-edge-detailed-result-type",
        "sc-content-type",
        "sc-content-len",
        "sc-range-start",
        "sc-range-end",
    ]

    def parse(self, lines: Iterable[str]) -> dict:
        for line in lines:
            if line.startswith("#Version") or line.startswith("#Fields"):
                logger.info("Skipping line: %s", line)
                continue

            json_record = {}
            result = line.strip("\n").split("\t")

            if len(result) != 33:
                # cloudfront standard log must have 33 fields.
                # otherwise, this log line is considered as invalid elb log.
                continue
            json_record["timestamp"] = f"{result[0]} {result[1]}"

            for i, attr in enumerate(self._fields[1:]):
                json_record[attr] = result[i + 2]

            json_record["cs-user-agent"] = urllib.parse.unquote_plus(
                json_record.get("cs-user-agent")
            )

            for key in ["sc-content-len", "sc-range-start", "sc-range-end"]:
                if json_record[key] == "-":
                    json_record[key] = "0"
            yield json_record


class VPCFlowWithCWL(LogType):
    def parse(self, line: str):
        try:
            records = []
            keys = log_format.split(",")
            for event in json.loads(line)["logEvents"]:
                record = {}
                message = event["message"]
                values = message.split(" ")
                if len(values) != len(keys):
                    # logger.info("unequal length")
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


class VPCFlowWithS3(LogType):
    """An implementation of LogType for VPC Flow Logs"""

    def parse(self, lines: Iterable[str]) -> dict:
        for line in lines:
            data = line.strip("\n").split()
            if "start" in data:
                # header row
                self._fields = data
            else:
                if "start" in self._fields:
                    yield self._parse_record(data)
            yield {}

    def _parse_record(self, data):
        json_record = {}

        # start is a must for timestamp
        for key, value in zip(self._fields, data):
            json_record[key] = value

        src = json_record.get("srcaddr", "-")
        dst = json_record.get("dstaddr", "-")
        if src == "-" and dst == "-":
            # if both src and dst are missing, ignore the record.
            return {}

        for key in ["packets", "bytes"]:
            if key in json_record and json_record[key] == "-":
                json_record[key] = "0"
        if "protocol" in json_record:
            json_record["protocol-code"] = get_protocal_code(json_record["protocol"])
        return json_record


class RDSWithS3(LogType):
    """An implementation of LogType for RDS Logs"""

    _fields = [
        "time",
        "db-identifier",
        "sq-user",
        "sq-db-name",
        "sq-host-name",
        "sq-ip",
        "sq-id",
        "sq-duration",
        "sq-lock-wait",
        "sq-rows-sent",
        "sq-rows-examined",
        "sq-table-name",
        "sq-timestamp",
        "sq-query",
        "err-thread",
        "err-label",
        "err-code",
        "err-sub-system",
        "err-detail",
        "general-id",
        "general-action",
        "general-query",
        "audit-ip",
        "audit-user",
        "audit-host-name",
        "audit-connection-id",
        "audit-query-id",
        "audit-operation",
        "audit-db-name",
        "audit-query",
        "audit-retcode",
        "deadlock-thread-id-1",
        "deadlock-os-thread-handle-1",
        "deadlock-query-id-1",
        "deadlock-ip-1",
        "deadlock-user-1",
        "deadlock-action-1",
        "deadlock-query-1",
        "deadlock-thread-id-2",
        "deadlock-os-thread-handle-2",
        "deadlock-query-id-2",
        "deadlock-ip-2",
        "deadlock-user-2",
        "deadlock-action-2",
        "deadlock-query-2",
        "log-detail",
    ]

    _slow_query_pattern = (
        r"^# Time: (\d+-\d+-\d+T\d+:\d+:\d+.\d+Z) # User@Host: (\w+)\[(\w+)\] @ ([\w\d\.-]*)\s? \[(.*?)\]"
        r"  Id:\s*(\d*) # Query_time: ([\d.]*)  Lock_time: ([\d.]*) Rows_sent: ([\d]*)"
        r"  Rows_examined: ([\d]*) (?:use )?([\w]*)?;? ?SET timestamp=(\d*);(.*);$"
    )
    _slow_query_fields = [
        "time",
        "sq-user",
        "sq-db-name",
        "sq-host-name",
        "sq-ip",
        "sq-id",
        "sq-duration",
        "sq-lock-wait",
        "sq-rows-sent",
        "sq-rows-examined",
        "sq-table-name",
        "sq-timestamp",
        "sq-query",
    ]

    _deadlock_log_pattern = r"MySQL thread\sid\s(\d+),\sOS\sthread\shandle\s(\w+),\squery\sid\s(\d+)\s(.*?)\s(\w+)\s(\w+)\s(.*)"

    _deadlock_fields = [
        "deadlock-thread-id",
        "deadlock-os-thread-handle",
        "deadlock-query-id",
        "deadlock-ip",
        "deadlock-user",
        "deadlock-action",
        "deadlock-query",
    ]

    _error_pattern = r"(\d+-\d+-\d+T\d+:\d+:\d+.\d+Z)\s(\d+)\s(\[\w+\])\s(\[.*?\])?\s?(\[.*?\])?\s?(.*)"

    _error_fields = [
        "time",
        "err-thread",
        "err-label",
        "err-code",
        "err-sub-system",
        "err-detail",
    ]
    _general_pattern = r"(\d+-\d+-\d+T\d+:\d+:\d+.\d+Z)\s*(\d*)\s(\w*)\s*(.*)$"

    _general_fields = [
        "time",
        "general-id",
        "general-action",
        "general-query",
    ]

    _audit_fields = [
        "time",
        "audit-ip",
        "audit-user",
        "audit-host-name",
        "audit-connection-id",
        "audit-query-id",
        "audit-operation",
        "audit-db-name",
        "audit-query",
        "audit-retcode",
    ]

    def _parse_rds_log_singel_line(
        self,
        log_sub_type,
        log_message,
        log_pattern,
        log_fields,
        timestamp,
        db_identifier,
    ) -> dict:
        json_record = {}
        result = re.match(log_pattern, log_message)

        if result:
            json_record = self.handle_match_result(
                json_record, result, log_fields, log_sub_type, db_identifier, timestamp
            )
        else:
            json_record = self.handle_no_match_result(
                json_record, log_message, db_identifier, timestamp
            )

        return json_record

    def handle_match_result(
        self, json_record, result, log_fields, log_sub_type, db_identifier, timestamp
    ):
        for i, attr in enumerate(log_fields):
            if result.group(i + 1) is None:
                continue
            json_record[attr] = result.group(i + 1).strip('"')

        json_record["db-identifier"] = db_identifier
        json_record["time"] = timestamp

        if log_sub_type == "error":
            json_record = self.clean_error_fields(json_record)

        return json_record

    def handle_no_match_result(
        self, json_record, log_message, db_identifier, timestamp
    ):
        json_record["db-identifier"] = db_identifier
        json_record["time"] = timestamp
        json_record["log-detail"] = log_message

        return json_record

    def clean_error_fields(self, json_record):
        for key in ["err-label", "err-code", "err-sub-system"]:
            if key in json_record:
                json_record[key] = json_record[key].strip("[").strip("]")

        return json_record

    def _parse_rds_log_multi_lines(
        self,
        log_sub_type,
        log_message,
        log_pattern,
        log_fields,
        timestamp,
        db_identifier,
    ) -> dict:
        results = re.finditer(log_pattern, log_message, re.MULTILINE)

        _json_records = []
        _json_record = {}
        json_record = {}
        if results:
            for _, result in enumerate(results, start=1):
                for i, attr in enumerate(log_fields):
                    if result.group(i + 1) is None:
                        continue
                    _json_record[attr] = result.group(i + 1).strip('"')

                _json_records.append(deepcopy(_json_record))
            try:
                json_record["deadlock-thread-id-1"] = _json_records[0][
                    "deadlock-thread-id"
                ]
                json_record["deadlock-os-thread-handle-1"] = _json_records[0][
                    "deadlock-os-thread-handle"
                ]
                json_record["deadlock-query-id-1"] = _json_records[0][
                    "deadlock-query-id"
                ]
                json_record["deadlock-ip-1"] = _json_records[0]["deadlock-ip"]
                json_record["deadlock-user-1"] = _json_records[0]["deadlock-user"]
                json_record["deadlock-action-1"] = _json_records[0]["deadlock-action"]
                json_record["deadlock-query-1"] = _json_records[0]["deadlock-query"]
                json_record["deadlock-thread-id-2"] = _json_records[1][
                    "deadlock-thread-id"
                ]
                json_record["deadlock-os-thread-handle-2"] = _json_records[1][
                    "deadlock-os-thread-handle"
                ]
                json_record["deadlock-query-id-2"] = _json_records[1][
                    "deadlock-query-id"
                ]
                json_record["deadlock-ip-2"] = _json_records[1]["deadlock-ip"]
                json_record["deadlock-user-2"] = _json_records[1]["deadlock-user"]
                json_record["deadlock-action-2"] = _json_records[1]["deadlock-action"]
                json_record["deadlock-query-2"] = _json_records[1]["deadlock-query"]
            except IndexError:
                logger.error(f"Failed to resolve {log_sub_type} Log")

            json_record["db-identifier"] = db_identifier
            json_record["time"] = timestamp
            json_record["log-detail"] = log_message
        return json_record

    def _parse_rds_audit_log(
        self,
        log_message,
        log_fields,
        timestamp,
        db_identifier,
    ) -> dict:
        json_record = {}
        result = log_message.split(",")
        json_record["db-identifier"] = db_identifier
        json_record["time"] = timestamp
        for i, attr in enumerate(log_fields[1:]):
            json_record[attr] = result[i + 1]
            for key in ["audit-ip"]:
                if key in json_record:
                    json_record[key] = json_record[key].strip("ip-").replace("-", ".")
        return json_record

    # def parse(self, line) -> list:
    def parse(self, lines: Iterable[str]) -> dict:
        for line in lines:
            data_str = "[{}]".format(line.replace("}{", "},{"))
            try:
                data_json = json.loads(data_str)
            except json.JSONDecodeError as e:
                logger.error(e)
                return {}

            for i in range(len(data_json)):
                if data_json[i]["messageType"] != "DATA_MESSAGE":
                    # logger.info("Skipping Kinesis Firehose Test Message.")
                    continue
                for each in self.parse_log_event(data_json[i]):
                    yield each

    def parse_log_event(self, log_event) -> dict:
        log_group = log_event.get("logGroup")
        db_identifier = log_event.get("logStream")

        for log in log_event.get("logEvents"):
            timestamp = log["timestamp"]
            log_message = log["message"].replace("\n", " ").replace("\r", " ")

            if "/slowquery" in log_group:
                yield self._parse_rds_log_singel_line(
                    "slowquery",
                    log_message,
                    self._slow_query_pattern,
                    self._slow_query_fields,
                    timestamp,
                    db_identifier,
                )
            elif "/error" in log_group:
                yield self.parse_error_log(log, log_message, timestamp, db_identifier)
            elif "/general" in log_group:
                yield self._parse_rds_log_singel_line(
                    "general",
                    log_message,
                    self._general_pattern,
                    self._general_fields,
                    timestamp,
                    db_identifier,
                )
            elif "/audit" in log_group:
                yield self._parse_rds_audit_log(
                    log_message,
                    self._audit_fields,
                    timestamp,
                    db_identifier,
                )

    def parse_error_log(self, log, log_message, timestamp, db_identifier):
        record = {}
        if "message" in log:
            if "TRANSACTION" in log["message"] and "MySQL thread" in log["message"]:
                # logger.info("Get deadlock error log!")
                record = self._parse_rds_log_multi_lines(
                    "deadlock",
                    log["message"],
                    self._deadlock_log_pattern,
                    self._deadlock_fields,
                    timestamp,
                    db_identifier,
                )

            elif "transactions deadlock detected" not in log["message"]:
                record = self._parse_rds_log_singel_line(
                    "error",
                    log_message,
                    self._error_pattern,
                    self._error_fields,
                    timestamp,
                    db_identifier,
                )
        return record


class LambdaWithS3(LogType):
    """An implementation of LogType for Lambda Function Logs"""

    _fields = [
        "time",
        "log_group",
        "log_stream",
        "owner",
        "log-detail",
    ]

    # def parse(self, line) -> list:
    def parse(self, lines: Iterable[str]) -> dict:
        for line in lines:
            data_str = "[{}]".format(line.replace("}{", "},{"))
            data_json = json.loads(data_str)
            for i in range(len(data_json)):
                if data_json[i]["messageType"] != "DATA_MESSAGE":
                    # logger.info("Skipping Kinesis Firehose Test Message.")
                    continue
                log_group = data_json[i].get("logGroup")
                log_stream = data_json[i].get("logStream")
                owner = data_json[i].get("owner")
                for log_event in data_json[i].get("logEvents"):
                    timestamp = log_event["timestamp"]
                    log_message = log_event.get("message")
                    json_record = {
                        "log_group": log_group,
                        "log_stream": log_stream,
                        "owner": owner,
                        "log-detail": log_message,
                        "time": timestamp,
                    }
                    yield json_record


class LogParser:
    """A wrapper class that handles all types of service logs"""

    def __init__(self, parser_name: str) -> None:
        # try to find a mapping class
        if parser_name == "CloudFront-RTWithRT":
            parser_name = "CloudFrontWithRT"
        if service := getattr(sys.modules[__name__], parser_name, None):
            self._service = service()
        else:
            raise RuntimeError(f"Unknown Type {parser_name}")

    def parse(self, records):
        return self._service.parse(records)

    def parse_single_line(self, record):
        return self._service.parse_single_line(record)

    def set_time(self, time_key: str, time_format: str, time_offset: str):
        return self._service.set_time(time_key, time_format, time_offset)

    def parse_for_s3_event(
        self,
        lines: Iterable[str],
        pattern: str,
        time_key: str = "",
        time_format: str = "",
        time_offset: str = "",
    ):
        return self._service.parse_for_s3_event(
            lines,
            pattern,
            time_key,
            time_format,
            time_offset,
        )

    def export_format(self):
        return "json" if self._service.format == "json" else "csv"


class LogEntry(dict):
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.timestamp = datetime.datetime.now()
        self._time_key = ""

    def set_time(self, time_key: str, time_format: str, time_offset: str = ""):
        if time_key not in self or (not time_format):
            return

        time_format = time_format.replace("%L", "%f")
        self._time_key = time_key
        self.timestamp = datetime.datetime.strptime(self[time_key], time_format)
        if time_offset:
            offset = int(time_offset)
            tz_hours = int(offset / 100)
            tz_minutes = (offset % 100) if offset > 0 else -(-offset % 100)
            tz = datetime.timezone(
                datetime.timedelta(hours=tz_hours, minutes=tz_minutes)
            )
            self.timestamp = self.timestamp.replace(tzinfo=tz)

    def dict(self, time_key: str = "time"):
        d = self.copy()
        if self._time_key:
            del d[self._time_key]
        time_key = time_key or "time"
        d[time_key] = self.timestamp.isoformat()
        return d


class JSONWithFLB(LogType):
    """An implementation of LogType for JSON Logs.
    This class is for fluent-bit json format input
    """

    _format = "json"

    def parse_single_line(self, record):
        # from kds buffer or msk buffer, record's type is str
        return json.loads(record)

    def parse(self, records):
        # from s3 buffer
        for line in records:
            line_dict = dict()
            try:
                line_dict = json.loads(line)
            except Exception:
                logger.info(f"this log is not imported: {line}")
                continue
            yield line_dict


class WAFSampledWithS3(JSONWithFLB):
    pass


class JSONWithS3(JSONWithFLB):
    """This class is for s3 source json format input"""

    _format = "json"

    def __init__(self):
        self._time_key = ""
        self._time_format = ""
        self._time_offset = ""

    def set_time(self, time_key: str, time_format: str, time_offset: str):
        self._time_key = time_key
        self._time_format = time_format
        self._time_offset = time_offset

    @property
    def time_key(self):
        return self._time_key

    @property
    def time_format(self):
        return self._time_format

    @property
    def time_offset(self):
        return self._time_offset

    def parse(self, lines: Iterable[str]) -> dict:
        for line in lines:
            log = LogEntry(**json.loads(line))
            if self._time_key:
                log.set_time(self._time_key, self._time_format, self._time_offset)
            yield log


class Regex:
    _format = "regex"

    def parse_for_s3_event(
        self,
        lines: Iterable[str],
        pattern: str,
        time_key: str = "",
        time_format: str = "",
        time_offset: str = "",
    ) -> Iterable[LogEntry]:
        log = None
        last_key = None

        def _mk_log(fields: dict, time_key: str, time_format: str, time_offset: str):
            log = LogEntry(**fields)
            if time_key:
                log.set_time(time_key, time_format, time_offset)
            return log

        for line in lines:
            match = re.match(pattern, line, re.MULTILINE)
            if match:
                if log:
                    yield log

                last_key = match.lastgroup
                log = _mk_log(match.groupdict(), time_key, time_format, time_offset)
            else:
                if log and last_key:
                    log[last_key] += line
                else:
                    yield LogEntry(log=line)

        if log:
            yield log


class ApacheWithFLB(JSONWithFLB):
    """An implementation of LogType for Apache Logs"""

    _format = "apache"


class SingleLineTextWithFLB(JSONWithFLB):
    """An implementation of LogType for SingleLineText Logs"""

    _format = "singlelinetext"


class MultiLineTextWithFLB(JSONWithFLB):
    """An implementation of LogType for MultiLineText Logs"""

    _format = "multilinetext"


class SyslogWithFLB(JSONWithFLB):
    """An implementation of LogType for Syslog Logs"""

    _format = "syslog"


class NginxWithFLB(JSONWithFLB):
    """An implementation of LogType for Nginx Logs"""

    _format = "nginx"


class IISWithFLB(JSONWithFLB):
    """An implementation of LogType for IIS Logs"""

    _format = "iis"


class WindowsEventWithFLB(JSONWithFLB):
    """An implementation of LogType for WindowEvent Logs"""

    _format = "windowsevent"


class ApacheWithS3(Regex):
    """An implementation of LogType for Apache Logs"""

    _format = "apache"


class IISWithS3(Regex):
    """An implementation of LogType for IIS Logs"""

    _format = "iis"


class SingleLineTextWithS3(Regex):
    """An implementation of LogType for SingleLineText Logs"""

    _format = "singlelinetext"


class MultiLineTextWithS3(Regex):
    """An implementation of LogType for MultiLineText Logs"""

    _format = "multilinetext"


class SyslogWithS3(Regex):
    """An implementation of LogType for Syslog Logs"""

    _format = "syslog"


class NginxWithS3(Regex):
    """An implementation of LogType for Nginx Logs"""

    _format = "nginx"


def batch_iter(iterable, batch_size=10):
    iterator = iter(iterable)
    while b := list(islice(iterator, batch_size)):
        yield b


class Counter:
    def __init__(self):
        self._value = 0
        self._lock = threading.Lock()

    @property
    def value(self):
        return self._value

    def set_value(self, value):
        with self._lock:
            self._value = value

    def increment(self):
        with self._lock:
            self._value += 1

    def decrement(self):
        with self._lock:
            self._value -= 1


def counter_iter(iterable: Iterable, counter: Counter):
    for each in iterable:
        counter.increment()
        yield each
