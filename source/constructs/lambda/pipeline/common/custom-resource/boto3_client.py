# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import boto3
import os
from botocore import config

solution_version = os.environ.get("SOLUTION_VERSION", "v1.0.0")
solution_id = os.environ.get("SOLUTION_ID", "SO8025")
user_agent_config = {
    "user_agent_extra": f"AwsSolution/{solution_id}/{solution_version}"
}
default_config = config.Config(**user_agent_config)

default_region = os.environ.get("AWS_REGION")
sts = boto3.client("sts", config=default_config)
account_id = sts.get_caller_identity()["Account"]

scope = os.environ.get("SCOPE", "REGIONAL")
log_source_region = os.environ.get("LOG_SOURCE_REGION", default_region)

log_source_account_assume_role = os.environ.get("LOG_SOURCE_ACCOUNT_ASSUME_ROLE", "")
log_bucket_name = os.environ.get("LOG_BUCKET_NAME", "")


def get_client(service_name: str, is_local_session=False):
    """Get the boto3 client of the linked account.

    Args:
        service_name (str): aws Service name
        is_local_session (bool, optional): if True, we will use assume role to create boto3 client.

    Returns:
        boto3.client you specify
    """

    if (not is_local_session) and (log_source_account_assume_role):
        log_account = sts.assume_role(
            RoleArn=log_source_account_assume_role, RoleSessionName="LogHubAcctSvcLog"
        )
        return boto3.client(
            service_name,
            region_name=log_source_region,
            aws_access_key_id=log_account["Credentials"]["AccessKeyId"],
            aws_secret_access_key=log_account["Credentials"]["SecretAccessKey"],
            aws_session_token=log_account["Credentials"]["SessionToken"],
            config=default_config,
        )

    else:
        return boto3.client(
            service_name, region_name=default_region, config=default_config
        )


def get_resource(service_name: str, is_local_session=False):
    """Get the boto3 client of the linked account.

    Args:
        service_name (str): aws Service name
        is_local_session (bool, optional): if True, we will use assume role to create boto3 client.

    Returns:
        boto3.client you specify
    """

    if (not is_local_session) and (log_source_account_assume_role):
        log_account = sts.assume_role(
            RoleArn=log_source_account_assume_role, RoleSessionName="LogHubAcctSvcLog"
        )
        return boto3.resource(
            service_name,
            region_name=log_source_region,
            aws_access_key_id=log_account["Credentials"]["AccessKeyId"],
            aws_secret_access_key=log_account["Credentials"]["SecretAccessKey"],
            aws_session_token=log_account["Credentials"]["SessionToken"],
            config=default_config,
        )

    else:
        return boto3.resource(
            service_name, region_name=default_region, config=default_config
        )
