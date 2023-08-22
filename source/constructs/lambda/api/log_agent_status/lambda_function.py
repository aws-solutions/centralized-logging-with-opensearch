# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

from enum import Enum
import logging
import os
import concurrent.futures
import time

from commonlib import AWSConnection, handle_error, AppSyncRouter, LinkAccountHelper
from commonlib.exception import APIException, ErrorCode

logger = logging.getLogger()
logger.setLevel(logging.INFO)

solution_version = os.environ.get("SOLUTION_VERSION", "v1.0.0")
solution_id = os.environ.get("SOLUTION_ID", "SO8025")
user_agent_config = {
    "user_agent_extra": f"AwsSolution/{solution_id}/{solution_version}"
}
default_region = os.environ.get("AWS_REGION")

conn = AWSConnection()
router = AppSyncRouter()

sts = conn.get_client("sts")
dynamodb = conn.get_client("dynamodb")
account_id = sts.get_caller_identity()["Account"]

sub_account_link_table_name = os.environ.get("SUB_ACCOUNT_LINK_TABLE_NAME")
account_helper = LinkAccountHelper(sub_account_link_table_name)


class DocumentType(Enum):
    AGENT_INSTALL = "agentInstallDoc"
    AGENT_CONFIGURATION = "agentConfDoc"


@handle_error
def lambda_handler(event, _):
    return router.resolve(event)


@router.route(field_name="getInstanceAgentStatus")
def get_instance_agent_status(**args):
    logger.info(args)
    instance_list = args.get("instanceIds", list())
    command_id = args.get("commandId")
    sub_account_id = args.get("accountId") or account_id
    region = args.get("region") or default_region

    # If command_id is empty, send Curl command
    # Else, get command invocation output
    if command_id == None or command_id == "":
        logger.info("Start instance status check")
        response = send_status_check_command(
            instance_list, sub_account_id=sub_account_id, region=region
        )
        logger.info("response: %s" % response)
    else:
        logger.info("Start status invocation check")
        response = get_status_check_command_invocation(
            command_id, sub_account_id=sub_account_id, region=region
        )
        logger.info("response: %s" % response)

    return response


def send_status_check_command(
    instance_list, sub_account_id=account_id, region=default_region
):
    command_id = ""

    if len(instance_list) == 0:
        return command_id

    # Send the status query command by SSM
    try:
        link_account = account_helper.get_link_account(sub_account_id, region)
        ssm = conn.get_client(
            service_name="ssm",
            region_name=region,
            sts_role_arn=link_account.get("subAccountRoleArn"),
        )
        response = ssm.send_command(
            InstanceIds=instance_list,
            MaxErrors="200",
            DocumentName="AWS-RunShellScript",
            Parameters={"commands": ["curl -s http://127.0.0.1:2022/api/v1/health"]},
        )
        command_id = response["Command"]["CommandId"]
    except Exception as e:
        logger.error(e)
        instance_agent_status_response = {
            "commandId": "",
            "instanceAgentStatusList": [
                {
                    "instanceId": str(instance_list[0]),
                    "status": "Unknown",
                    "invocationOutput": "EC2 not reachable!",
                    "curlOutput": ""
                }
            ],
        }
        return instance_agent_status_response
    instance_agent_status_response = {
        "commandId": command_id,
        "instanceAgentStatusList": [],
    }
    return instance_agent_status_response


def get_status_check_command_invocation(
    command_id, sub_account_id=account_id, region=default_region
):
    res_list = []
    instance_invocation_output_mapping = {
        "commandId": command_id,
        "instanceAgentStatusList": res_list,
    }
    try:
        link_account = account_helper.get_link_account(sub_account_id, region)
        ssm = conn.get_client(
            service_name="ssm",
            region_name=region,
            sts_role_arn=link_account.get("subAccountRoleArn"),
        )
        instance_id = ""
        status = ""
        offline_instance_list = []
        response = ssm.list_command_invocations(CommandId=command_id, Details=True)
        invocation_list = response.get("CommandInvocations")
        for invocation in invocation_list:
            instance_id = invocation.get("InstanceId")
            logger.info("Get invocation from instance: %s", instance_id)
            invocation_output = invocation.get("CommandPlugins")[0].get("Output")
            if "fluent-bit" in invocation_output:
                logger.info("Instance %s is Online" % instance_id)
                status = "Online"
                invocation_output = "Fluent Bit installed and online."
                res_list.append(
                    {
                        "instanceId": instance_id,
                        "status": status,
                        "invocationOutput": invocation_output,
                        "curlOutput": "",
                    }
                )
            else:
                offline_instance_list.append(instance_id)
        response = ssm.send_command(
            InstanceIds=offline_instance_list,
            MaxErrors="200",
            DocumentName="AWS-RunShellScript",
            Parameters={"commands": ["ls /opt/fluent-bit/bin/fluent-bit  |wc -l"]},
        )
        failure_reason_command_id = response["Command"]["CommandId"]
        time.sleep(4)

        invocation_response = ssm.list_command_invocations(CommandId=failure_reason_command_id, Details=True)
        invocation_list = invocation_response.get("CommandInvocations")
        for invocation in invocation_list:
            instance_id = invocation.get("InstanceId")
            logger.info("Get invocation from instance: %s", instance_id)
            flb_status = invocation.get("CommandPlugins")[0].get("Output")
            if "1" in flb_status:
                logger.info("Instance %s has been distributed but not online" % instance_id)
                status = "Offline"
                invocation_output = "Fluent Bit installation succeeded, but unable to start!"
            else:
                logger.info("Instance %s is Offline" % instance_id)
                status = "Offline"
                invocation_output = "Fluent Bit not installed or installation failed!"
            res_list.append(
                {
                    "instanceId": instance_id,
                    "status": status,
                    "invocationOutput": invocation_output,
                    "curlOutput": "",
                }
            )
    except Exception as e:
        logger.error(e)
        raise APIException(
            ErrorCode.UNKNOWN_ERROR, "Failed to get status check commandinvocation."
        )
    return instance_invocation_output_mapping


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
        region_name=default_region,
        sts_role_arn=link_account.get("subAccountRoleArn"),
    )
    ec2 = conn.get_client(
        service_name="ec2",
        region_name=default_region,
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
    systemd_location = "/usr/lib"
    arch_append = ""
    if architecture == "arm64":
        arch_append = "-arm64"
    if platform_name == "Ubuntu":
        systemd_location = "/etc"
    document_name = get_document_name(
        sub_account_id=account_id, type=DocumentType.AGENT_INSTALL, region=region
    )
    logger.info(f"document_name is {document_name}")
    ssm.send_command(
        InstanceIds=[instance_id],
        DocumentName=document_name,
        Parameters={
            "ARCHITECTURE": [arch_append],
            "SYSTEMDPATH": [systemd_location],
        },
    )
    logger.info("Successfully triggered installation")


def get_document_name(
    sub_account_id: str, type: DocumentType, region=default_region
) -> str:
    """Get the ssm document name for Fluent Bit"""
    sub_account = account_helper.get_link_account(sub_account_id, region=region)
    if sub_account and sub_account_id != account_id:
        return sub_account.get(type.value, "")
    else:
        return os.environ.get("AGENT_INSTALLATION_DOCUMENT")


@router.route(field_name="listInstances")
def list_instances(**args):
    """List instance from ssm describe_instance_information API"""

    max_results = args.get("maxResults", 10)
    next_token = args.get("nextToken", "")
    instance_set = args.get("instanceSet", set())
    tags = args.get("tags", [])
    _account_id = args.get("accountId", account_id)
    region = args.get("region", default_region)
    if max_results > 50 or max_results < 5:
        raise APIException(
            "maxResults have to be more than 4 or less than or equal to 50"
        )

    logger.info(
        f"List Instances from Boto3 API in MaxResults {max_results} with {next_token}, the InstanceSet is {instance_set}"
    )
    filters = []
    if tags:
        filters = tags
    else:
        filters = [
            {"Key": "PingStatus", "Values": ["Online"]},
            {"Key": "PlatformTypes", "Values": ["Linux"]},
        ]
        if instance_set:
            filter_instance_ids = {"Key": "InstanceIds", "Values": instance_set}
            filters.append(filter_instance_ids)
    try:
        link_account = account_helper.get_link_account(_account_id, default_region)
        ssm = conn.get_client(
            service_name="ssm",
            region_name=default_region,
            sts_role_arn=link_account.get("subAccountRoleArn"),
        )
        # Get SSM resource
        resp = ssm.describe_instance_information(
            Filters=filters, MaxResults=max_results, NextToken=next_token
        )
    except Exception as e:
        err_message = str(e)
        trimed_message = err_message.split(":", 1)[1]
        raise APIException(trimed_message)

    # Assume all items are returned in the scan request
    instance_information_list = resp["InstanceInformationList"]
    instances = []

    with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
        futures = [
            executor.submit(
                parse_ssm_instance_info,
                instance_info,
                account_id=_account_id,
                region=region,
            )
            for instance_info in instance_information_list
        ]
        for future in concurrent.futures.as_completed(futures):
            try:
                instance = future.result()
                instances.append(instance)
            except Exception as e:
                raise APIException(e)

    if "NextToken" in resp:
        next_token = resp["NextToken"]
    else:
        next_token = ""
    return {
        "nextToken": next_token,
        "instances": instances,
    }


def parse_ssm_instance_info(instance_info, account_id, region=default_region):
    instance = {}
    instance["id"] = instance_info["InstanceId"]
    instance["platformName"] = instance_info["PlatformName"]
    instance["ipAddress"] = instance_info["IPAddress"]
    instance["computerName"] = instance_info["ComputerName"]
    instance["name"] = "-"
    # Get EC2 resource
    link_account = account_helper.get_link_account(account_id, default_region)
    ec2 = conn.get_client(
        service_name="ec2",
        region_name=default_region,
        sts_role_arn=link_account.get("subAccountRoleArn"),
    )
    instance_tags = ec2.describe_tags(
        Filters=[
            {
                "Name": "resource-id",
                "Values": [
                    instance_info["InstanceId"],
                ],
            },
        ]
    )
    for tag in instance_tags["Tags"]:
        if tag["Key"] == "Name":
            instance["name"] = tag["Value"]
            break
    return instance
