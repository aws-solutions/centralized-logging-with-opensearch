# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import os
import boto3
from enum import Enum
from botocore import config
from typing import Any
from utils.logger import logger

class ErrorCode(Enum):
    DUPLICATED_INDEX_PREFIX = "Duplicated Index Prefix"
    OVERLAP_INDEX_PREFIX = "Overlapped Index prefix"
    ITEM_NOT_FOUND = "Item is not found"
    ACCOUNT_NOT_FOUND = "Account is not found"
    OPENSEARCH_DOMAIN_NOT_FOUND = "OpenSearch domain is not found"
    INVALID_OPENSEARCH_DOMAIN_STATUS = "OpenSearch domain is in an invalid status"
    INVALID_INDEX_MAPPING = "Invalid index mapping"
    INVALID_ITEM = "Invalid item specified for the action"
    UNSUPPORTED_ACTION = "Unsupported action specified"
    UNKNOWN_ERROR = "Unknown exception occurred"


class APIException(Exception):
    def __init__(self, code: ErrorCode, message: str = ""):
        self.type = code.name
        self.message = message if message else code.value

    def __str__(self) -> str:
        return f"[{self.type}] {self.message}"
    
    
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
            retries={"max_attempts": 1},
            user_agent_extra=user_agent_extra,
        )
        self._default_region = os.environ.get("AWS_REGION")

    def get_client(
        self, service_name: str, region_name="", sts_role_arn="", client_type="client"
    ):
        """Create a boto3 client/resource session

        Args:
            service_name (str): AWS service name, e.g. s3
            region_name (str, optional): AWS region. If not provided, current region will be defaulted.
            sts_role_arn (str, optional): STS assumed role arn. If not provided, default profile wil be used.
            client_type (str, optional): either "client" or "resource". Defaults to "client".

        Returns:
            boto3 service client/resource
        """
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


