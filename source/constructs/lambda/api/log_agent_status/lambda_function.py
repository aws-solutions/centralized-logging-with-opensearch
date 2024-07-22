# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import os
import concurrent.futures
import time
import boto3
import requests
import json

from functools import partial
from enum import Enum
from commonlib.logging import get_logger
from requests_aws4auth import AWS4Auth
from commonlib import AWSConnection, handle_error, AppSyncRouter, LinkAccountHelper
from commonlib.exception import APIException, ErrorCode
from commonlib.utils import random_delay

logger = get_logger(__name__)

default_region = os.environ.get("AWS_REGION")

conn = AWSConnection()
router = AppSyncRouter()

sts = conn.get_client("sts")
dynamodb = conn.get_client("dynamodb")
account_id = sts.get_caller_identity()["Account"]

sub_account_link_table_name = os.environ.get("SUB_ACCOUNT_LINK_TABLE_NAME")
account_helper = LinkAccountHelper(sub_account_link_table_name)
flb_download_s3_addr = os.environ.get("FLB_DOWNLOAD_S3_ADDR")


class DocumentType(Enum):
    AGENT_INSTALL = "agentInstallDoc"
    WINDOWS_AGENT_INSTALL = "windowsAgentInstallDoc"
    AGENT_CONFIGURATION = "agentConfDoc"
    WINDOWS_AGENT_CONFIGURATION = "windowsAgentConfDoc"


@handle_error
def lambda_handler(event, _):
    logger.info(f"The requests is {json.dumps(event)}")
    return router.resolve(event)


@router.route(field_name="getInstanceAgentStatus")
def get_instance_agent_status(**args):
    logger.info(args)
    instance_list = args.get("instanceIds", list())
    sub_account_id = args.get("accountId") or account_id
    region = args.get("region") or default_region

    if instance_list:
        try:
            response = send_status_check_command(
                instance_list, sub_account_id=sub_account_id, region=region
            )
            response = get_status_check_command_invocation(
                response["commandId"], sub_account_id=sub_account_id, region=region
            )
        except Exception as e:
            logger.error(e)
            response = {
                "commandId": "",
                "instanceAgentStatusList": [
                    {
                        "instanceId": id_,
                        "status": "Unknown",
                        "invocationOutput": str(e),
                        "curlOutput": "",
                    }
                    for id_ in instance_list
                ],
            }
    else:
        response = {
            "commandId": "",
            "instanceAgentStatusList": [],
        }

    return response


def ssm_req_client(api: str, payload: dict, sts_role_arn=None):
    svc = "ssm"
    if sts_role_arn:
        sts_client = boto3.client("sts")
        response = sts_client.assume_role(
            RoleArn=sts_role_arn, RoleSessionName="AssumedRoleSession"
        )
        # Get temporary credentials
        credentials = response["Credentials"]

        # Create a boto3 session using the temporary credentials
        session = boto3.Session(
            aws_access_key_id=credentials["AccessKeyId"],
            aws_secret_access_key=credentials["SecretAccessKey"],
            aws_session_token=credentials["SessionToken"],
        )
    else:
        session = boto3.Session()

    region_name = str(session.region_name)
    aws_auth = AWS4Auth(
        refreshable_credentials=session.get_credentials(),
        region=region_name,
        service=svc,
    )
    if "cn-" in region_name:
        api_endpoint = f"https://{svc}.{session.region_name}.amazonaws.com.cn/"
    else:
        api_endpoint = f"https://{svc}.{session.region_name}.amazonaws.com/"

    headers = {
        "X-Amz-Target": api,
        "Content-Type": "application/x-amz-json-1.1",
    }
    # Make HTTP POST request with AWS authentication and headers
    return requests.post(api_endpoint, auth=aws_auth, json=payload, headers=headers)


def send_status_check_command(
    instance_list,
    sub_account_id=account_id,
    region=default_region,
):
    command_id = []

    if len(instance_list) == 0:
        return ",".join(command_id)

    link_account = account_helper.get_link_account(sub_account_id, region)
    ssm = conn.get_client(
        service_name="ssm",
        region_name=region,
        sts_role_arn=link_account.get("subAccountRoleArn"),
    )

    def _do_send_command(instance_ids):
        response = ssm.send_command(
            InstanceIds=instance_ids,
            TimeoutSeconds=30,
            MaxErrors="200",
            MaxConcurrency="100%",
            DocumentName=link_account.get(
                "agentStatusCheckDoc", os.environ.get("AGENT_STATUS_CHECK_DOCUMENT")
            ),
            Parameters={
                "executionTimeout": ["3"],
                "winCommandLine": [
                    'Invoke-WebRequest -URi "http://127.0.0.1:2022/api/v1/health"-UseBasicParsing|Select -ExpandProperty Content',
                ],
                "linuxCommandLine": [
                    'if ! curl -s http://127.0.0.1:2022/api/v1/health > /dev/null; then echo "Error: Failed to access health endpoint"; if [ -x "/opt/fluent-bit/bin/fluent-bit" ]; then if /opt/fluent-bit/bin/fluent-bit --version 2>&1 >/dev/null; then if systemctl is-active --quiet fluent-bit; then echo "Reason: fluent-bit config error"; else echo "Reason: fluent-bit service is not running"; fi; else echo "Reason: fluent-bit can not start"; fi; else echo "Reason: fluent-bit not installed"; fi; exit 1; fi'
                ],
            },
        )
        return response["Command"]["CommandId"]

    # Send the status query command by SSM
    num = 10  # This is batch size has the best performance
    batches = [instance_list[i : i + num] for i in range(0, len(instance_list), num)]
    with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
        # Use executor.map to submit tasks and collect results
        command_id = list(executor.map(_do_send_command, batches))

    return {
        "commandId": ",".join(command_id),
        "instanceAgentStatusList": [],
    }


def list_command_invocations(ssm_client, command_id, details=True, maxResults=50):
    response = ssm_client.list_command_invocations(
        CommandId=command_id,
        Details=details,
        MaxResults=maxResults,
    )
    for each in response["CommandInvocations"]:
        yield each
    while "NextToken" in response:
        response = ssm_client.list_command_invocations(
            CommandId=command_id,
            NextToken=response["NextToken"],
            Details=details,
            MaxResults=maxResults,
        )
        for each in response["CommandInvocations"]:
            yield each


def handle_command_invocations(
    ssm_client, command_id, max_retries=10, retry_delay=0.25
):
    """
    Handles the list of command invocations for the specified AWS Systems Manager command.
    If any of the invocations are in progress, it will retry the command until all invocations are completed or the maximum number of retries is reached.

    Args:
        ssm_client (boto3.client): An AWS Systems Manager client.
        command_id (str): The ID of the command to handle.
        max_retries (int, optional): The maximum number of times to retry the command. Defaults to 5.
        retry_delay (float, optional): The number of seconds to wait between retries. Defaults to 0.5.

    Returns:
        list: The list of command invocations.
    """
    for _ in range(max_retries):
        command_invocations = list(list_command_invocations(ssm_client, command_id))
        in_progress_count = len(
            list(
                filter(lambda each: each["Status"] == "InProgress", command_invocations)
            )
        )
        if len(command_invocations) and in_progress_count == 0:
            return command_invocations

        logger.info(
            f"Retrying command {command_id} ({in_progress_count}/{len(command_invocations)} invocations in progress)"
        )
        time.sleep(retry_delay)
        retry_delay *= 2  # Exponential backoff

    raise TimeoutError(
        f"Command {command_id} did not complete within {sum(2 ** i * retry_delay for i in range(max_retries))} seconds."
    )


def get_status_check_command_invocation(
    command_id, sub_account_id=account_id, region=default_region
):

    link_account = account_helper.get_link_account(sub_account_id, region)
    ssm = conn.get_client(
        service_name="ssm",
        region_name=region,
        sts_role_arn=link_account.get("subAccountRoleArn"),
    )

    if not command_id:
        return {
            "commandId": "",
            "instanceAgentStatusList": [],
        }

    cmd_ids = command_id.split(",")

    def _cmd_plugins_output(invocation):
        outputs = [
            p["Output"]
            for p in invocation["CommandPlugins"]
            if "skip" not in p["Output"]
        ]
        if outputs:
            return outputs[0].split("----------ERROR-------")[0].strip()
        else:
            return ""

    def _get_agent_status(ssm, cmd_id):
        status_map = {
            "Success": "Online",
            "Failed": "Offline",
        }
        return list(
            map(
                lambda each: {
                    "instanceId": each["InstanceId"],
                    "status": status_map.get(each["Status"], "Offline"),
                    "invocationOutput": _cmd_plugins_output(each),
                    "curlOutput": "",
                },
                handle_command_invocations(ssm, cmd_id),
            )
        )

    # Delay the function call to avoid ListCommandInvocations rate exceeded concurrently.
    partial_handle_command = random_delay(max_delay=0.1)(
        partial(_get_agent_status, ssm)
    )

    time.sleep(0.4)

    # Create a ThreadPoolExecutor with 5 worker threads
    with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
        # Use executor.map to submit tasks and collect results
        status_list = []
        for result in executor.map(partial_handle_command, cmd_ids):
            status_list.extend(result)

    return {
        "commandId": command_id,
        "instanceAgentStatusList": status_list,
    }


@router.route(field_name="requestInstallLogAgent")
def request_install_log_agent(**args):
    """Use SSM SendCommand API to install logging agent"""

    instance_set = args.get("instanceIdSet", set())
    sub_account_id = args.get("accountId", account_id)
    region = args.get("region", default_region)
    logger.info("Run documentation")

    logger.info(instance_set)
    unsuccess_instances = set()
    if len(instance_set) == 0:
        logger.info("Empty instance set input received!")
        return unsuccess_instances
    with concurrent.futures.ThreadPoolExecutor(
        max_workers=len(instance_set)
    ) as executor:
        futures = [
            executor.submit(
                single_agent_installation,
                instance_id,
                account_id=sub_account_id,
                region=region,
            )
            for instance_id in instance_set
        ]
        concurrent.futures.wait(futures)


def single_agent_installation(
    instance_id,
    account_id: str,
    region=default_region,
):
    link_account = account_helper.get_link_account(account_id, default_region)
    ssm = conn.get_client(
        service_name="ssm",
        region_name=region,
        sts_role_arn=link_account.get("subAccountRoleArn"),
    )
    ec2 = conn.get_client(
        service_name="ec2",
        region_name=region,
        sts_role_arn=link_account.get("subAccountRoleArn"),
    )
    # Get EC2 resource
    describe_instance_response = ec2.describe_instances(InstanceIds=[instance_id])
    reservations = describe_instance_response["Reservations"][0]
    instances = reservations["Instances"][0]
    architecture = instances["Architecture"]
    filter_instance_ids = {"Key": "InstanceIds", "Values": [instance_id]}

    # Get SSM resource
    logger.info("ready for installation")
    describe_instance_info_response = ssm.describe_instance_information(
        Filters=[filter_instance_ids],
    )
    instance_information_list = describe_instance_info_response[
        "InstanceInformationList"
    ]
    platform_name = instance_information_list[0]["PlatformName"]
    platform_type = instance_information_list[0]["PlatformType"]
    systemd_location = "/usr/lib"
    arch_append = ""
    if architecture == "arm64":
        arch_append = "-arm64"
    if platform_name == "Ubuntu":
        systemd_location = "/etc"

    document_name = get_install_document_name(
        sub_account_id=account_id,
        type=DocumentType.AGENT_INSTALL,
        region=region,
        platform_type=platform_type,
    )
    logger.info(f"document_name is {document_name}")
    flb_download_addr = (
        "https://packages.fluentbit.io/windows/fluent-bit-3.0.4-win64.zip"
    )
    if "aws-solutions-assets.s3.cn-north-1.amazonaws.com.cn" in flb_download_s3_addr:
        flb_download_addr = (
            flb_download_s3_addr + "aws-for-fluent-bit/fluent-bit-3.0.4-win64.zip"
        )

    if platform_type == "Linux":
        parameters = {
            "ARCHITECTURE": [arch_append],
            "SYSTEMDPATH": [systemd_location],
        }
    else:
        # windows instance
        parameters = {
            "workingDirectory": ["C:/"],
            "source": [f"{flb_download_addr}"],
            "sourceHash": [
                "241F542BC4D7FFAFA662E6F8EAF4AA947807F388F1859D9B0503D4E85F7EC5A3"
            ],
            "commands": [
                f"curl -o C:/fluent-bit-3.0.4-win64.zip {flb_download_addr}",
                "Expand-Archive -Path C:/fluent-bit-3.0.4-win64.zip -Force -DestinationPath C:/",
                'New-Item -ItemType Directory -Path "C:/fluent-bit-3.0.4-win64/etc"',
                '(Get-Content C:/fluent-bit-3.0.4-win64/conf/fluent-bit.conf) -replace "http_server  Off","http_server  On"|Set-Content C:/fluent-bit-3.0.4-win64/conf/fluent-bit.conf -Force',
                '(Get-Content C:/fluent-bit-3.0.4-win64/conf/fluent-bit.conf) -replace "http_port    2020","http_port    2022"|Set-Content C:/fluent-bit-3.0.4-win64/conf/fluent-bit.conf -Force',
                "Copy-Item -Path C:/fluent-bit-3.0.4-win64/conf/* -Force -Destination C:/fluent-bit-3.0.4-win64/etc -Recurse",
                "Copy-Item -Path C:/fluent-bit/etc/* -Force -Destination C:/fluent-bit-3.0.4-win64/etc -Recurse",
                "Stop-Service fluent-bit",
                "xcopy C:\\fluent-bit-3.0.4-win64 C:\\fluent-bit\\ /s /e /y",
                'New-Service fluent-bit -BinaryPathName "C:/fluent-bit/bin/fluent-bit.exe -c C:/fluent-bit/etc/fluent-bit.conf" -StartupType Automatic',
                "Start-Service fluent-bit",
            ],
        }
    ssm.send_command(
        InstanceIds=[instance_id],
        DocumentName=document_name,
        Parameters=parameters,
    )
    logger.info("Successfully triggered installation")


def get_install_document_name(
    sub_account_id: str,
    type: DocumentType,
    region=default_region,
    platform_type="Linux",
) -> str:
    """Get the ssm document name for Fluent Bit"""
    sub_account = account_helper.get_link_account(sub_account_id, region=region)
    document_name = type.value
    if platform_type == "Windows":
        document_name = DocumentType.WINDOWS_AGENT_INSTALL.value
    if sub_account and sub_account_id != account_id:
        return sub_account.get(document_name, "")
    else:
        if platform_type == "Windows":
            return os.environ.get("WINDOWS_AGENT_INSTALLATION_DOCUMENT")
        else:
            return os.environ.get("LINUX_AGENT_INSTALLATION_DOCUMENT")


@router.route(field_name="listInstances")
def list_instances(**args):
    """List instance from ssm describe_instance_information API"""
    max_results = args.get("maxResults", 10)
    next_token = args.get("nextToken", "")
    instance_set = args.get("instanceSet", set())
    platform_type = args.get("platformType", "")
    tags = args.get("tags", [])
    _account_id = args.get("accountId", account_id)
    region = args.get("region", default_region)
    if max_results > 50 or max_results < 5:
        raise APIException(
            ErrorCode.UNSUPPORTED_ACTION,
            "maxResults have to be more than 4 or less than or equal to 50",
        )

    logger.info(
        f"List Instances from Boto3 API in MaxResults {max_results} with {next_token}, the InstanceSet is {instance_set}"
    )
    filters = []
    if tags:
        filters = tags
    elif platform_type:
        filters = [
            {"Key": "PlatformTypes", "Values": [platform_type]},
        ]
    else:
        filters = [
            {"Key": "PingStatus", "Values": ["Online"]},
            {"Key": "PlatformTypes", "Values": ["Windows", "Linux"]},
        ]
        if instance_set:
            filter_instance_ids = {"Key": "InstanceIds", "Values": instance_set}
            filters.append(filter_instance_ids)

    link_account = account_helper.get_link_account(_account_id, region)
    resp = ssm_req_client(
        "AmazonSSM.DescribeInstanceProperties",
        {
            "MaxResults": 50,
            "FiltersWithOperator": filters,
            **({"NextToken": next_token} if next_token else {}),
        },
        sts_role_arn=link_account.get("subAccountRoleArn"),
    )
    body = resp.json()

    if instance_set and not resp.ok:
        return {
            "instances": [
                {
                    "id": id_,
                    "platformType": "-",
                    "platformName": "-",
                    "ipAddress": "-",
                    "computerName": "-",
                    "name": "-",
                }
                for id_ in instance_set
            ],
        }

    # Assume all items are returned in the scan request
    instances = [
        {
            "id": instance_info["InstanceId"],
            "platformType": instance_info["PlatformType"],
            "platformName": instance_info["PlatformName"],
            "ipAddress": instance_info["IPAddress"],
            "computerName": instance_info["ComputerName"],
            "name": instance_info.get("Name", "-"),
        }
        for instance_info in body.get("InstanceProperties", [])
    ]

    return {
        "nextToken": body.get("NextToken", ""),
        "instances": instances,
    }
