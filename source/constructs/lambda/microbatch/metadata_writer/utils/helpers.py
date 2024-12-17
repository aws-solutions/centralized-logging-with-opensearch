# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import os
import uuid
import gzip
import json
import boto3
import types
import shutil
import logging
import urllib.parse
from enum import Enum
from pathlib import Path
from datetime import datetime, UTC
from botocore import config
from urllib.parse import urlparse
from typing import Union, TextIO, Callable
from binaryornot.check import is_binary
from aws_lambda_powertools import Logger
from aws_lambda_powertools.logging.formatter import LambdaPowertoolsFormatter
from utils import fleep


__all__ = [
    "logger",
    "CommonEnum",
    "parse_bytes",
    "file_reader",
    "file_writer",
    "delete_local_file",
    "make_local_work_dir",
    "clean_local_download_dir",
    "detect_file_extension_by_header",
    "enrichment",
    "iso8601_strftime",
    "get_bucket_object",
    "sqs_events_parser",
    "event_bridge_event_parser",
    "events_parser",
]


class CommonEnum(str, Enum):
    def __str__(
        self,
    ):
        return self.value


class SolutionFormatter(LambdaPowertoolsFormatter):
    def __init__(self) -> None:
        super().__init__(
            use_rfc3339=True,
            log_record_order=["dateTime", "epochTime", "level", "levelS", "message"],
        )
        self.remove_keys(["timestamp"])

    def format(self, record: logging.LogRecord) -> str:  # noqa: A003
        log = self._strip_none_records(
            {
                **self._extract_log_keys(record),
                "dateTime": self.formatTime(record),
                "epochTime": record.created,
                "level": record.levelno,
                "levelS": record.levelname,
                "message": self._extract_log_message(record),
                "solutionId": os.getenv("SOLUTION_ID"),
                "traceId": self._get_latest_trace_id(),
                "stack_trace": self._serialize_stacktrace(record),
            }
        )
        return self.serialize(log)


logger = Logger(service=__name__, logger_formatter=SolutionFormatter())


class ValidateParameters:
    """This class is used to parse ,validate and store all incoming parameters.

    !!!Case sensitive!!!
    """

    def __init__(self, parameters: dict) -> None:
        if not isinstance(parameters, dict):
            raise ValueError(f"The parameters is not a dict, parameters: {parameters}.")
        self._required_parameter_check(parameters)
        self._optional_parameter_check(parameters)

    def _child_parameter_lookup_check(
        self,
        parameters: Union[dict, list[dict]],
        keys: tuple,
        path: Union[str, None] = None,
    ) -> None:
        path = f"{path}." if path else ""

        if isinstance(parameters, dict):
            for required_param in keys:
                if not parameters.get(required_param):
                    raise ValueError(f"Missing value for {path}{required_param}.")
        elif isinstance(parameters, list):
            for parameter in parameters:
                self._child_parameter_lookup_check(parameter, keys=keys, path=path)
        else:
            raise TypeError("The parameter is not a dict or list.")

    def _required_parameter_check(self, parameters) -> None:
        """Reserved method to handle required parameters."""
        pass

    def _optional_parameter_check(self, parameters) -> None:
        """Reserved method for handling optional parameters."""
        pass

    @staticmethod
    def _init_name_space(kwargs: dict = {}) -> types.SimpleNamespace:
        return types.SimpleNamespace(**kwargs)

    @staticmethod
    def _get_bucket_name(url: str) -> str:
        """Parse the bucket name.

        :param url: bucket url, such as s3://stagingbucket/AWSLogs/123456789012
        :return: prefix, such as stagingbucket
        """
        return urlparse(url).netloc

    @staticmethod
    def _get_bucket_prefix(url: str) -> str:
        """Parse the prefix, remove the / at the end.

        :param url: bucket url, such as s3://stagingbucket/AWSLogs/123456789012
        :return: prefix, such as AWSLogs/123456789012
        """
        prefix = urlparse(url).path[1:]
        return prefix if prefix[-1] != "/" else prefix[:-1]

    def _get_bucket_object_from_uri(self, url: str) -> types.SimpleNamespace:
        """Generate the object of bucket url, you can access bucket_name through object.bucket, and access prefix through object.prefix.

        :param url: bucket url, such as s3://stagingbucket/AWSLogs/123456789012
        :return: object
        """
        ns = self._init_name_space()
        ns.bucket = self._get_bucket_name(url)
        ns.prefix = self._get_bucket_prefix(url)
        return ns

    @staticmethod
    def _get_parameter_value(
        value: Union[bool, dict, list, str, int],
        class_info: Union[type, tuple[type, ...]],
        default,
    ) -> Union[bool, dict, list, str, int]:
        """Check whether the input value type is legal, if not, return the default value."""
        if isinstance(value, class_info) is True:
            return value
        else:
            return default


class AWSConnection:
    """Common Utility to deal with AWS services.

    Usage:
    ```
    # initialize an instance
    conn = AWSConnection()

    # to create client
    s3 = conn.get_client("s3")

    # to create a resource
    s3 = conn.get_client("s3", type="resource")

    # to create a client with sts
    s3 = conn.get_client("s3", sts_role_arn="xxx")
    ```
    """

    role_session_name = "CentralizedLogging"

    def __init__(self) -> None:
        solution_version = os.environ.get("SOLUTION_VERSION", "v1.0.0")
        solution_id = os.environ.get("SOLUTION_ID", "SO8025")
        user_agent_extra = f"AwsSolution/{solution_id}/{solution_version}"

        self._default_config = config.Config(
            connect_timeout=30,
            user_agent_extra=user_agent_extra,
        )
        self._default_region = os.environ.get("AWS_REGION")

    def get_client(
        self,
        service_name: str,
        region_name="",
        sts_role_arn="",
        client_type="client",
        max_attempts: int = 3,
    ) -> Union[boto3.session.Session.resource, boto3.session.Session.client]:  # type: ignore
        """Create a boto3 client/resource session

        Args:
            service_name (str): AWS service name, e.g. s3
            region_name (str, optional): AWS region. If not provided, current region will be defaulted.
            sts_role_arn (str, optional): STS assumed role arn. If not provided, default profile wil be used.
            client_type (str, optional): either "client" or "resource". Defaults to "client".

        Returns:
            boto3 service client/resource
        """
        self._default_config = self._default_config.merge(
            config.Config(retries={"max_attempts": max_attempts, "mode": "adaptive"})
        )
        args = {
            "service_name": service_name,
            "region_name": self._default_region,
            "config": self._default_config,
        }
        if region_name:
            args["region_name"] = region_name

        if sts_role_arn:
            sts = boto3.client("sts", config=self._default_config)

            # Any exception handling for ConnectTimeoutError?
            resp = sts.assume_role(
                RoleArn=sts_role_arn,
                RoleSessionName=self.role_session_name,
            )
            cred = resp["Credentials"]
            args["aws_access_key_id"] = cred["AccessKeyId"]
            args["aws_secret_access_key"] = cred["SecretAccessKey"]
            args["aws_session_token"] = cred["SessionToken"]

        if client_type.lower() == "resource":
            return boto3.resource(**args)
        return boto3.client(**args)

    def get_partition_from_region(self, region_name: str) -> str:
        return boto3.Session().get_partition_for_region(region_name)

    def get_available_services(self) -> list:
        return boto3.Session().get_available_services()


def parse_bytes(s):
    """Parse byte string to numbers

    # >>> parse_bytes('100')
    # 100
    # >>> parse_bytes('100 MB')
    # 100000000
    # >>> parse_bytes('100M')
    # 100000000
    # >>> parse_bytes('5kB')
    # 5000
    # >>> parse_bytes('5.4 kB')
    # 5400
    # >>> parse_bytes('1kiB')
    # 1024
    # >>> parse_bytes('1e6')
    # 1000000
    # >>> parse_bytes('1e6 kB')
    # 1000000000
    # >>> parse_bytes('MB')
    # 1000000
    # >>> parse_bytes(123)
    # 123
    # >>> parse_bytes('5 foos')
    Traceback (most recent call last):
        ...
    ValueError: Could not interpret 'foos' as a byte unit
    """
    byte_sizes = {
        "kB": 10**3,
        "MB": 10**6,
        "GB": 10**9,
        "TB": 10**12,
        "PB": 10**15,
        "KiB": 2**10,
        "MiB": 2**20,
        "GiB": 2**30,
        "TiB": 2**40,
        "PiB": 2**50,
        "B": 1,
        "": 1,
    }
    byte_sizes = {k.lower(): v for k, v in byte_sizes.items()}
    byte_sizes.update({k[0]: v for k, v in byte_sizes.items() if k and "i" not in k})
    byte_sizes.update({k[:-1]: v for k, v in byte_sizes.items() if k and "i" in k})

    if isinstance(s, (int, float)):
        return int(s)
    s = s.replace(" ", "")
    if not any(char.isdigit() for char in s):
        s = "1" + s

    i = 0
    for i in range(len(s) - 1, -1, -1):
        if not s[i].isalpha():
            break
    index = i + 1

    prefix = s[:index]
    suffix = s[index:]

    try:
        n = float(prefix)
    except ValueError as e:
        raise ValueError("Could not interpret '%s' as a number" % prefix) from e

    try:
        multiplier = byte_sizes[suffix.lower()]
    except KeyError as e:
        raise ValueError("Could not interpret '%s' as a byte unit" % suffix) from e

    result = n * multiplier
    return int(result)


def file_reader(path, extension: str = "text") -> Union[gzip.GzipFile, TextIO]:
    if extension == "gz":
        return gzip.open(path, "rt")
    else:
        return open(path, "r")


def file_writer(path, extension: str = "text") -> Union[gzip.GzipFile, TextIO]:
    if extension == "gz":
        return gzip.open(path, "wt")
    else:
        return open(path, "w")


def delete_local_file(path: Path) -> None:
    """Delete a local file.

    :param path: The file path.
    """

    if os.path.exists(path.as_posix()):
        os.remove(path.as_posix())


def make_local_work_dir(path: Path = Path("/tmp")) -> Path:  # NOSONAR
    """Create a local working directory for the file merging operation, randomly generate a unique directory
        through uuid, create a download directory in it to download the original files that need to be merged,
        and create an output directory to store the merged files.

    :param path: The parent directory of the working directory, the default is /tmp.
    :return: return a unique working directory, e.g. /tmp/{uuid}.
    """

    local_work_path = path / str(uuid.uuid4())
    local_work_path.mkdir(parents=True, exist_ok=True)
    local_download_dir = local_work_path / "download"
    local_download_dir.mkdir(parents=True, exist_ok=True)
    local_output_path = local_work_path / "output"
    local_output_path.mkdir(parents=True, exist_ok=True)
    return local_work_path


def clean_local_download_dir(path: Path) -> None:
    """Clean up all files in the local directory.

    :param path: directory to clean
    :return: None
    """
    shutil.rmtree(path.as_posix())  # type: ignore
    logger.debug(f"The local directory {path} is cleaned up")


def detect_file_extension_by_header(file_path: Path) -> str:
    """Detect file extension, If the file is a binary file, check the file header to determine the file extension,
        otherwise return the text file extension.

    :param file_path: local file path.
    :return: file extension, such parquet, gz or text.
    """
    if is_binary(file_path.as_posix()) is True:
        logger.debug(
            f"The file object {file_path} is a Binary file. parse file type through file head."
        )
        with file_path.open("rb") as fd:
            file_info = fleep.get(fd.read(128))
        extension = file_info.extension[0]
        logger.debug(f"The file object {file_path} is a {extension} file.")
        return extension
    else:
        logger.debug(f"The file object {file_path} is a Text file.")
        return "text"


def enrichment(
    input_file_path: Path,
    output_file_path: Path,
    enrich_func: Callable,
    enrich_plugins: set = set(),
) -> Path:
    """Enrich data.

    :param input_file_path: The File input path.
    :param output_file_path: The file output path.
    :param enrich_func: A callable function for data enrichment.
    :param enrich_plugins: A tuple of enrich plugins.

    :return: output_file_path
    """

    if input_file_path.exists() is False:
        logger.warning(f"The file: {input_file_path} is not exists, continuing.")
        return input_file_path

    extension = detect_file_extension_by_header(input_file_path)
    if extension not in ("gz", "text"):
        logger.error("Unsupported file extension, only gz, text is supported.")
        return input_file_path

    output_file_object = file_writer(output_file_path, extension=extension)
    for record in file_reader(input_file_path.as_posix(), extension=extension):
        output_file_object.write(
            enrich_func(record=record, enrich_plugins=enrich_plugins)
        )
    output_file_object.close()

    if os.path.exists(output_file_path) and os.path.getsize(output_file_path) > 0:
        return output_file_path
    else:
        return input_file_path


def iso8601_strftime(datetime: datetime = datetime.now(UTC), precision: int = 3):
    return (
        datetime.strftime("%Y-%m-%dT%H:%M:%S.")
        + datetime.strftime("%f")[:precision]
        + "Z"
    )


def get_bucket_object(bucket: str, prefix: str) -> types.SimpleNamespace:
    ns = types.SimpleNamespace()
    ns.bucket = bucket
    prefix = "/" if prefix == "" else os.path.normpath(prefix)
    ns.prefix = prefix if prefix[0] != "/" else prefix[1:]
    ns.uri = f"s3://{ns.bucket}/{ns.prefix}"

    return ns


def sqs_events_parser(event) -> list[dict]:
    s3_create_object_events = []
    for record in event["Records"]:
        if "body" in record:
            body = json.loads(record["body"])
            if "Event" in body and body["Event"] == "s3:TestEvent":
                logger.info("Test Message, do nothing...")
                continue

            s3_create_object_events += body.get("Records", [])
        else:
            s3_create_object_events.append(record)

    valid_events = []
    for record in s3_create_object_events:
        if record.get("eventName") is None:
            logger.info(f"eventName is None, ignore record, record is {record}.")
            continue

        if not record.get("eventName", "").startswith("ObjectCreated"):
            logger.info(
                f'eventName is {record.get("eventName")}, ignore record, record is {record}.'
            )
            continue

        if "s3" not in record.keys():
            logger.info(f"s3 is not in record, ignore record, record is {record}.")
            continue

        valid_events.append(
            dict(
                bucket=record["s3"]["bucket"]["name"],
                key=urllib.parse.unquote_plus(
                    record["s3"]["object"]["key"], encoding="utf-8"
                ),
            )
        )

    return valid_events


def event_bridge_event_parser(event) -> list[dict]:
    return [
        dict(
            bucket=event["detail"]["bucket"]["name"],
            key=event["detail"]["object"]["key"],
        )
    ]


def events_parser(event) -> list[dict]:
    if "Records" in event:
        return sqs_events_parser(event=event)
    elif "detail" in event:
        return event_bridge_event_parser(event=event)
    else:
        return []
