# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import json
import logging
import re
import sys
import urllib.parse
from abc import ABC, abstractmethod
from copy import deepcopy

from util.protocol import get_protocal_code

logger = logging.getLogger()


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


class ELB(LogType):
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

    def parse(self, line: str) -> dict:
        json_record = {}
        pattern = (
            "([^ ]*) ([^ ]*) ([^ ]*) ([^ ]*):([0-9]*) ([^ ]*)[:-]([0-9]*) ([-.0-9]*) "
            '([-.0-9]*) ([-.0-9]*) (|[-0-9]*) (-|[-0-9]*) ([-0-9]*) ([-0-9]*) "([^ ]*) ([^ ]*) '
            '(- |[^ ]*)" "([^"]*)" ([A-Z0-9-]+) ([A-Za-z0-9.-]*) ([^ ]*) "([^"]*)" "([^"]*)" '
            '"([^"]*)" ([-.0-9]*) ([^ ]*) "([^"]*)" "([^"]*)" "([^ ]*)" "([^ ]+?)" '
            '"([^ ]+)" "([^ ]*)" "([^ ]*)"'
        )
        result = re.match(pattern, line)
        if result:
            for i, attr in enumerate(self._fields):
                # print(f'{attr} = {result.group(i+1)}')
                json_record[attr] = result.group(i + 1)

        return json_record


class CloudTrail(LogType):
    """An implementation of LogType for CloudTrail Logs"""

    _format = "json"

    def parse(self, line: str):
        try:
            result = json.loads(line)["Records"]
            return result
        except Exception as e:
            return []


class Config(LogType):
    """An implementation of LogType for Config Logs"""

    _format = "json"

    def _convert_cfg(self, cfg: dict):
        """Unfiy all configuration format for different resources.

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

        # convert zone from text to dict
        if "availabilityZones" in cfg and isinstance(cfg["availabilityZones"], list):
            if isinstance(cfg["availabilityZones"][0], str):
                for az in cfg["availabilityZones"]:
                    az["zoneName"] = az
        else:
            cfg["availabilityZones"] = []

        # convert securitygroup from text to dict
        if "securityGroups" in cfg and isinstance(cfg["securityGroups"], list):
            if isinstance(cfg["securityGroups"][0], str):
                for sg in cfg["securityGroups"]:
                    sg["groupId"] = sg
        else:
            cfg["securityGroups"] = []

    def parse(self, line: str):
        json_records = []
        try:
            data = json.loads(line)
        except json.JSONDecodeError as e:
            return json_records
        if "configSnapshotId" in data:
            # Ignore Snapshots
            return []
        if "configurationItems" in data:
            json_records = data["configurationItems"]
            for rec in json_records:
                if "configuration" in rec:
                    self._convert_cfg(rec["configuration"])

        return json_records


class WAF(LogType):
    """An implementation of LogType for WAF Logs"""

    _format = "json"

    def parse(self, line: str):
        try:
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
            return json_record
        except Exception as e:
            return {}


class S3(LogType):
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
    ]

    def parse(self, line) -> dict:

        json_record = {}
        pattern = (
            '([^ ]*) ([^ ]*) \\[(.*?)\\] ([^ ]*) ([^ ]*) ([^ ]*) ([^ ]*) ([^ ]*) ("[^"]*"|-) '
            '(-|[0-9]*) ([^ ]*) ([^ ]*) ([^ ]*) ([^ ]*) ([^ ]*) ([^ ]*) ("[^"]*"|-) ([^ ]*)(?: ([^ ]*) '
            "([^ ]*) ([^ ]*) ([^ ]*) ([^ ]*) ([^ ]*))?.*$"
        )
        result = re.match(pattern, line)
        if result:
            for i, attr in enumerate(self._fields):
                # print(f'{attr} = {result.group(i+1)}')
                json_record[attr] = result.group(i + 1).strip('"')

            for key in ["bytes_sent", "object_size", "turn_around_time", "total_time"]:
                if json_record[key] == "-":
                    json_record[key] = "0"

        return json_record


class CloudFront(LogType):
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

    def parse(self, line) -> dict:
        if line.startswith("#Version") or line.startswith("#Fields"):
            # logger.info("Skipping line: %s", line)
            return {}

        json_record = {}
        result = line.strip("\n").split("\t")

        if not len(result) == 33:
            # cloudfront standard log must have 33 fields.
            # otherwise, this log line is considered as invalid elb log.
            return {}

        json_record["timestamp"] = f"{result[0]} {result[1]}"

        for i, attr in enumerate(self._fields[1:]):
            # print(f'{attr} = {result[i+2]}')
            json_record[attr] = result[i + 2]

        json_record["cs-user-agent"] = urllib.parse.unquote_plus(
            json_record.get("cs-user-agent")
        )

        for key in ["sc-content-len", "sc-range-start", "sc-range-end"]:

            if json_record[key] == "-":
                json_record[key] = "0"
        # print(json_record)
        return json_record


class VPCFlow(LogType):
    """An implementation of LogType for VPC Flow Logs"""

    def parse(self, line) -> dict:
        json_record = {}
        data = line.strip("\n").split()
        if "start" in data:
            # header row
            self._fields = data
        else:
            if "start" in self._fields:
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
                    json_record["protocol-code"] = get_protocal_code(
                        json_record["protocol"]
                    )
        return json_record


class RDS(LogType):
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

    _audit_pattern = r"(\d+ \d+:\d+:\d+),ip-(\d+-\d+-\d+-\d+),(\w+),(\w+),(\w+),(\w+),(\w+),(\w*),\'(.*)\',(\w+)"

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
            for i, attr in enumerate(log_fields):
                # print(f'{attr} = {result.group(i+1)}')
                if result.group(i + 1) is None:
                    continue
                json_record[attr] = result.group(i + 1).strip('"')
                json_record["db-identifier"] = db_identifier
                json_record["time"] = timestamp

                if log_sub_type == "error":
                    for key in ["err-label", "err-code", "err-sub-system"]:
                        if key in json_record:
                            json_record[key] = json_record[key].strip("[").strip("]")
                if log_sub_type == "audit":
                    for key in ["audit-ip"]:
                        if key in json_record:
                            json_record[key] = json_record[key].replace("-", ".")
        else:
            json_record["db-identifier"] = db_identifier
            json_record["time"] = timestamp
            json_record["log-detail"] = log_message
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
            for match_num, result in enumerate(results, start=1):
                for i, attr in enumerate(log_fields):
                    # print(f'{attr} = {result.group(i + 1)}')
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
                logger.error("Failed to resolve Deadlock Log")

            json_record["db-identifier"] = db_identifier
            json_record["time"] = timestamp
            json_record["log-detail"] = log_message
        return json_record

    def parse(self, line) -> list:

        json_records = []
        data_str = "[{}]".format(line.replace("}{", "},{"))
        try:
            data_json = json.loads(data_str)
        except json.JSONDecodeError as e:
            return json_records

        for i in range(len(data_json)):
            if data_json[i]["messageType"] != "DATA_MESSAGE":
                logger.info("Skipping Kinesis Firehose Test Message.")
                continue
            log_group = data_json[i].get("logGroup")
            db_identifier = data_json[i].get("logStream")
            for log_event in data_json[i].get("logEvents"):
                timestamp = log_event["timestamp"]
                log_message = log_event["message"].replace("\n", " ").replace("\r", " ")
                if "/slowquery" in log_group:
                    json_records.append(
                        self._parse_rds_log_singel_line(
                            "slowquery",
                            log_message,
                            self._slow_query_pattern,
                            self._slow_query_fields,
                            timestamp,
                            db_identifier,
                        )
                    )
                elif "/error" in log_group:
                    if (
                        "TRANSACTION" in log_event["message"]
                        and "MySQL thread" in log_event["message"]
                    ):
                        logger.info("Get deadlock error log!")
                        json_records.append(
                            self._parse_rds_log_multi_lines(
                                "deadlock",
                                log_event["message"],
                                self._deadlock_log_pattern,
                                self._deadlock_fields,
                                timestamp,
                                db_identifier,
                            )
                        )
                    elif "transactions deadlock detected" in log_event["message"]:
                        continue
                    else:
                        json_records.append(
                            self._parse_rds_log_singel_line(
                                "error",
                                log_message,
                                self._error_pattern,
                                self._error_fields,
                                timestamp,
                                db_identifier,
                            )
                        )
                elif "/general" in log_group:
                    json_records.append(
                        self._parse_rds_log_singel_line(
                            "general",
                            log_message,
                            self._general_pattern,
                            self._general_fields,
                            timestamp,
                            db_identifier,
                        )
                    )
                elif "/audit" in log_group:
                    json_records.append(
                        self._parse_rds_log_singel_line(
                            "audit",
                            log_message,
                            self._audit_pattern,
                            self._audit_fields,
                            timestamp,
                            db_identifier,
                        )
                    )
                # else:
                #     logger.info("Skipping unknown RDS log types.")

        # print(json_records)

        return json_records


class Lambda(LogType):
    """An implementation of LogType for Lambda Function Logs"""

    _fields = [
        "time",
        "log_group",
        "log_stream",
        "owner",
        "log-detail",
    ]

    def parse(self, line) -> list:

        json_records = []
        data_str = "[{}]".format(line.replace("}{", "},{"))
        try:
            data_json = json.loads(data_str)
        except json.JSONDecodeError as e:
            return json_records

        for i in range(len(data_json)):
            if data_json[i]["messageType"] != "DATA_MESSAGE":
                # logger.info("Skipping Kinesis Firehose Test Message.")
                continue
            log_group = data_json[i].get("logGroup")
            log_stream = data_json[i].get("logStream")
            owner = data_json[i].get("owner")
            for log_event in data_json[i].get("logEvents"):
                json_record = {}
                timestamp = log_event["timestamp"]
                log_message = log_event.get("message")
                json_record["log_group"] = log_group
                json_record["log_stream"] = log_stream
                json_record["owner"] = owner
                json_record["log-detail"] = log_message
                json_record["time"] = timestamp
                json_records.append(json_record)

        return json_records


class LogParser:
    """A wrapper class that handles all types of service logs"""

    def __init__(self, log_type: str) -> None:
        # try to find a mapping class
        if service := getattr(sys.modules[__name__], log_type, None):
            self._service = service()
        else:
            raise RuntimeError(f"Unknown Type {log_type}")

    def parse(self, record):
        return self._service.parse(record)

    def export_format(self):
        return "json" if self._service.format == "json" else "csv"
