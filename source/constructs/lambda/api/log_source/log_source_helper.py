# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import uuid
import logging
import sys
import os
import json
import boto3
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
    def delete_log_source(self):
        """Delete a Log Source"""
        pass

    @abstractmethod
    def list_log_sources(self):
        """List Log Sources"""
        pass

    @abstractmethod
    def update_log_source(self):
        """Update a Log Source"""
        pass

    @abstractmethod
    def get_log_source(self):
        """Get a Log Source"""
        pass


class EC2(AppLogSourceType):
    """An implementation of AppLogSourceType for EC2"""

    def __init__(self, args, log_source_table):
        self.args = args
        self.log_source_table = log_source_table

    def create_log_source(self):
        # TODO: Add this implementation
        pass

    def delete_log_source(self):
        # TODO: Add this implementation
        pass

    def list_log_sources(self):
        # TODO: Add this implementation
        pass

    def update_log_source(self):
        # TODO: Add this implementation
        pass

    def get_log_source(self):
        # TODO: Add this implementation
        pass


class S3(AppLogSourceType):
    """An implementation of AppLogSourceType for S3"""

    def __init__(self, args, log_source_table):
        self.args = args
        self.log_source_table = log_source_table

    def create_log_source(self):
        logger.info("Create a logSource")

        id = str(uuid.uuid4())
        self.log_source_table.put_item(
            Item={
                "id": id,
                "s3Name": self.args["s3Name"],
                "s3Prefix": self.args["s3Prefix"],
                "defaultVpcId": self.args.get("subAccountVpcId", log_agent_vpc_id),
                "defaultSubnetIds": self.args.get("subAccountPublicSubnetIds", log_agent_subnet_ids),
                "createdDt": datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
                "accountId": self.args.get("accountId", account_id),
                "sourceType": "S3",
                "region": self.args.get("region", default_region),
                "archiveFormat": self.args["archiveFormat"],
                "tags": self.args.get("tags", []),
                "status": "ACTIVE",
            }
        )
        # Handle cross account scenario
        if self.args.get("accountId", "") != "" and self.args.get("accountId", "") != account_id:
            # Update the default VpcId and subnetIds in cross account table.
            self._update_default_vpcid_and_subnetids()

        return id

    def delete_log_source(self):
        logger.info("Delete Log Source Status in DynamoDB")
        resp = self.log_source_table.get_item(Key={"id": self.args["id"]})
        if "Item" not in resp:
            raise APIException("Log Source Not Found")

        self.log_source_table.update_item(
            Key={"id": self.args["id"]},
            UpdateExpression="SET #status = :s, #updatedDt= :uDt",
            ExpressionAttributeNames={"#status": "status", "#updatedDt": "updatedDt"},
            ExpressionAttributeValues={
                ":s": "INACTIVE",
                ":uDt": datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
            },
        )

    def list_log_sources(self):
        # TODO: Add this implementation
        pass

    def update_log_source(self):
        # TODO: Add this implementation
        pass

    def get_log_source(self):
        response = self.log_source_table.get_item(Key={"id": self.args["id"]})
        if "Item" not in response:
            raise APIException("App Source record Not Found")
        result = response["Item"]
        result["s3Source"] = {
            "s3Name": response["Item"]["s3Name"],
            "s3Prefix": response["Item"]["s3Prefix"],
            "archiveFormat": response["Item"]["archiveFormat"],
            "defaultVpcId": response["Item"].get("defaultVpcId", log_agent_vpc_id),
            "defaultSubnetIds": response["Item"].get("defaultSubnetIds", log_agent_subnet_ids),
        }
        return result

    def _update_default_vpcid_and_subnetids(self):
        logger.info("Update the cross account link table by async lambda job")
        payload = {
            "arguments": {
                "id": self.args["subAccountLinkId"],
                "subAccountVpcId": self.args.get("subAccountVpcId", ""),
                "subAccountPublicSubnetIds": self.args.get("subAccountPublicSubnetIds", ""),
            },
            "info": {
                "fieldName": "updateSubAccountDeafultVpcSubnets",
            },
        }
        async_resp = awslambda.invoke(
            FunctionName=async_lambda_arn,
            InvocationType="Event",
            Payload=json.dumps(payload),
        )

        logger.info(f'Remote resp {async_resp["Payload"].read()}')
        if async_resp["StatusCode"] > 300:
            raise APIException("Error call async Lambda")


class EKSCluster(AppLogSourceType):
    """An implementation of AppLogSourceType for EKSCluster"""

    def __init__(self, args, log_source_table):
        self.args = args
        self.log_source_table = log_source_table

    def create_log_source(self):
        # TODO: Add this implementation
        pass

    def delete_log_source(self):
        # TODO: Add this implementation
        pass

    def list_log_sources(self):
        # TODO: Add this implementation
        pass

    def update_log_source(self):
        # TODO: Add this implementation
        pass

    def get_log_source(self):
        # TODO: Add this implementation
        pass


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

    def delete_log_source(self):
        return self._source.delete_log_source()

    def list_log_sources(self):
        return self._source.list_log_sources()

    def update_log_source(self):
        return self._source.update_log_source()

    def get_log_source(self):
        return self._source.get_log_source()
