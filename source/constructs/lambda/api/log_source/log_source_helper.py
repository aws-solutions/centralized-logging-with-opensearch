# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import logging
import os

from commonlib import AWSConnection
from commonlib.model import AppLogIngestion

from boto3.dynamodb.conditions import Attr

logger = logging.getLogger(__name__)

app_ingestion_table_name = os.getenv("APP_LOG_INGESTION_TABLE_NAME")
conn = AWSConnection()
ddb = conn.get_client("dynamodb", client_type="resource")


class SyslogHelper:
    """Syslog Helper class"""

    def __init__(self):
        self.app_ingestion_table = ddb.Table(app_ingestion_table_name)
        self._type = "Syslog"
        self._min_port_num = 500
        self._max_port_num = 20000
        self._in_used_port_set = set()

    def check_custom_port(self, port: int) -> dict:
        """
        This function is used to validate the input custom port and generate recommended port.
        If the port param is none, this function will return a recommended port.

        This is based on old logic, may needs to be changed.

        :return: {
            "isAllowedPort": "True"/"OutofRange"/"Conflict"/"NoMoreUsable",
            "recommendedPort": Int
        }
        """
        # We have to check the Ingestion Table to get the in used ports
        # If we just get the ports from log source table by item status, it will cause port dangling
        conditions = Attr("status").is_in(["ACTIVE", "CREATING", "DELETING", "ERROR"])
        conditions = conditions.__and__(Attr("sourceType").eq(self._type))

        response = self.app_ingestion_table.scan(
            FilterExpression=conditions,
            ProjectionExpression="id, #input, #status, #type ",
            ExpressionAttributeNames={
                "#input": "input",
                "#status": "status",
                "#type": "type",
            },
        )

        # Get all the in used ports
        # If there are historical syslog port, add to the in_used_port_set
        if len(response["Items"]) != 0:
            for item in response["Items"]:
                self._in_used_port_set.add(self._get_syslog_port_in_input(item))

        recommend_port = self._generate_recommend_port()
        user_defined_port = port
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

    def _get_syslog_port_in_input(self, input_data: AppLogIngestion) -> int:
        """
        This function will get the syslog port from input data
        Input: AppLogIngestion
        Output: syslog port number

        {
            "input": {
                "name": "syslog",
                "params": [
                {
                    "paramKey": "protocolType",
                    "paramValue": "TCP"
                },
                {
                    "paramKey": "port",
                    "paramValue": "506"
                },
                {
                    "paramKey": "listen",
                    "paramValue": "0.0.0.0"
                }
                ]
            }
        }
        """
        syslog_port = -1
        params = input_data["input"].get("params", [])
        for param in params:
            if param["paramKey"] == "port":
                syslog_port = param["paramValue"]
                break
        return int(syslog_port)
