# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import uuid
import logging
import sys
import os
import boto3

from boto3.dynamodb.conditions import Attr
from botocore import config

from datetime import datetime
from abc import ABC, abstractmethod

logger = logging.getLogger()
logger.setLevel(logging.INFO)

solution_version = os.environ.get("SOLUTION_VERSION", "v1.0.0")
solution_id = os.environ.get("SOLUTION_ID", "SO8025")
user_agent_config = {
    "user_agent_extra": f"AwsSolution/{solution_id}/{solution_version}"
}
default_config = config.Config(**user_agent_config)
awslambda = boto3.client("lambda", config=default_config)
sts = boto3.client("sts", config=default_config)
account_id = sts.get_caller_identity()["Account"]
default_region = os.environ.get("AWS_REGION")

log_agent_vpc_id = os.environ.get("LOG_AGENT_VPC_ID")
log_agent_subnet_ids = os.environ.get("LOG_AGENT_SUBNETS_IDS")
async_lambda_arn = os.environ.get("ASYNC_CROSS_ACCOUNT_LAMBDA_ARN")


class APIException(Exception):
    def __init__(self, message):
        self.message = message


class AppLogSourceType(ABC):
    """An abstract class represents one type of Log Source.

    Create a class for each Log source with implementations of
     `create_log_source`, `delete_log_source`, `list_log_sources` and `update_log_source`.
    """

    @abstractmethod
    def create_log_source(self):
        """Create a Log Source"""
        pass

    @abstractmethod
    def get_log_source(self):
        """Get a Log Source"""
        pass


class Syslog(AppLogSourceType):
    """An implementation of AppLogSourceType for Syslog"""

    def __init__(self, args, log_source_table):
        self.args = args
        self.log_source_table = log_source_table
        self._log_type = "Syslog"
        self._min_port_num = 500
        self._max_port_num = 20000
        self._in_used_port_set = set()

    def create_log_source(self):
        logger.info("Create a log source")

        source_id = str(uuid.uuid4())
        # Status will be change to ACTIVE in create ingestion action.
        self.log_source_table.put_item(
            Item={
                "id": source_id,
                "sourceType": "Syslog",
                "accountId": self.args.get("accountId", account_id),
                "region": self.args.get("region", default_region),
                "sourceInfo": self.args.get("sourceInfo", []),
                "createdDt": datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
                "tags": self.args.get("tags", []),
                "status": "REGISTERED",
            }
        )

        return source_id

    def get_log_source(self):
        response = self.log_source_table.get_item(Key={"id": self.args["id"]})
        if "Item" not in response:
            raise APIException("App Source record Not Found")
        response["Item"]["sourceId"] = self.args["id"]
        result = response["Item"]
        return result

    def check_custom_port(self):
        """
        This function is used to validate the input custom port and generate recommended port.
        If the syslogPort param is none, this function will return a recommended port.

        :return: {
            "isAllowedPort": "True"/"OutofRange"/"Conflict"/"NoMoreUsable",
            "recommendedPort": Int
        }
        """
        conditions = Attr("status").eq("ACTIVE")
        conditions = conditions.__and__(Attr("sourceType").eq(self._log_type))

        response = self.log_source_table.scan(
            FilterExpression=conditions,
            ProjectionExpression="id, sourceInfo, #status, #sourceType ",
            ExpressionAttributeNames={
                "#status": "status",
                "#sourceType": "sourceType",
            },
        )

        # Get all the in used ports
        # If there are historical syslog port, add to the in_used_port_set
        if len(response["Items"]) != 0:
            for items in response["Items"]:
                for info in items["sourceInfo"]:
                    if info["key"] == "syslogPort":
                        self._in_used_port_set.add(int(info["value"]))

        recommend_port = self._generate_recommend_port()
        user_defined_port = int(self.args.get("syslogPort"))
        if user_defined_port == -1:
            # Customer does not enter custom port.Front-end will pass user_defined_port as -1.
            if recommend_port != -1:
                return {
                    "isAllowedPort": True,
                    "msg": "",
                    "recommendedPort": recommend_port,
                }
            else:
                return {
                    "isAllowedPort": False,
                    "msg": "NoMoreUsable",
                    "recommendedPort": recommend_port,
                }
        else:
            # Customer provide a custom port
            if user_defined_port in self._in_used_port_set:
                return {
                    "isAllowedPort": False,
                    "msg": "Conflict",
                    "recommendedPort": recommend_port,
                }
            elif (
                user_defined_port > self._max_port_num
                or user_defined_port < self._min_port_num
            ):
                return {
                    "isAllowedPort": False,
                    "msg": "OutofRange",
                    "recommendedPort": recommend_port,
                }
            else:
                return {
                    "isAllowedPort": True,
                    "msg": "",
                    "recommendedPort": user_defined_port,
                }

    def _generate_recommend_port(self):
        """
        This function will generate a recommended port number according to current in used ports
        Input: current_syslog_source_data
        Output: recommend port number, if no more port can use, return -1.
        """
        port_pool = set(range(self._min_port_num, self._max_port_num))

        usable_port_pool = port_pool.difference(self._in_used_port_set)
        if len(usable_port_pool) == 0:
            # If there is no more usable port, return -1
            return -1
        else:
            return next(iter(usable_port_pool))


class LogSourceHelper:
    """A wrapper class that handles all types of App Log Source"""

    def __init__(self, source_type: str, args, log_source_table) -> None:
        # try to find a mapping class
        if source := getattr(sys.modules[__name__], source_type, None):
            self._source = source(args, log_source_table)
        else:
            raise RuntimeError(f"Unknown Type {source_type}")

    def create_log_source(self):
        return self._source.create_log_source()

    def get_log_source(self):
        return self._source.get_log_source()

    def check_custom_port(self):
        return self._source.check_custom_port()
