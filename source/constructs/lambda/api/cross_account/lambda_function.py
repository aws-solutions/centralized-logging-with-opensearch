# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0


import json
import logging
import os

from commonlib import AWSConnection, LinkAccountHelper, AppSyncRouter, handle_error

logger = logging.getLogger()
logger.setLevel(logging.INFO)

conn = AWSConnection()
router = AppSyncRouter()

table_name = os.environ.get("SUB_ACCOUNT_LINK_TABLE_NAME")
acc_helper = LinkAccountHelper(table_name)

# Get iam resource
iam = conn.get_client("iam")
base_resource_arn = os.environ.get("BASE_RESOURCE_ARN")
central_assume_role_policy_arn = os.environ.get("CENTRAL_ASSUME_ROLE_POLICY_ARN")


@handle_error
def lambda_handler(event, _):
    return router.resolve(event)


@router.route(field_name="createSubAccountLink")
def create_sub_account_link(**args):
    """Create a sub account link

    When creating a sub account link,
    the central policy needs to be updated.
    """

    account_id = args.pop("subAccountId", "")
    region = args.pop("region", "")

    # Add the policy to central policy
    # Add new linked account arn
    sub_account_role_arn = args.get("subAccountRoleArn")
    if sub_account_role_arn:
        policy_resource = [sub_account_role_arn]
        _, accounts = acc_helper.list_sub_account_links(1, 1000)
        for account in accounts:
            policy_resource.append(account["subAccountRoleArn"])

        generate_central_policy(policy_resource)

    return acc_helper.create_sub_account_link(account_id, region, **args)


@router.route(field_name="updateSubAccountLink")
def update_sub_account_link(**args):
    """update a sub account link"""

    account_id = args.pop("subAccountId", "")
    region = args.pop("region", "")
    uploading_event_topic_arn = args.pop("subAccountFlbConfUploadingEventTopicArn")
    return acc_helper.update_link_account(account_id, region, uploading_event_topic_arn)


@router.route(field_name="listSubAccountLinks")
def list_sub_account_links(page=1, count=20):
    """List sub account links"""
    total, accounts = acc_helper.list_sub_account_links(page, count)
    return {
        "total": total,
        "subAccountLinks": accounts,
    }


@router.route(field_name="getSubAccountLink")
def get_sub_account_link(**args):
    """Get sub account link by account id and region"""
    account_id = args.get("subAccountId")
    region = args.get("region")

    account = acc_helper.get_link_account(account_id, region)
    return account


@router.route(field_name="deleteSubAccountLink")
def delete_sub_account_link(**args) -> str:
    """Delete sub account link by account id and region

    When deleting a sub account link,
    the central policy needs to be updated.
    """
    account_id = args.get("subAccountId")
    region = args.get("region")
    acc_helper.delete_sub_account_link(account_id, region)

    # Update policy
    _, accounts = acc_helper.list_sub_account_links(1, 1000)
    policy_resource = []
    for account in accounts:
        policy_resource.append(account["subAccountRoleArn"])

    generate_central_policy(policy_resource)

    return "OK"


def generate_central_policy(policy_resource):
    if policy_resource == []:
        # If user remove all the sub account, we need add a base lambda policy to the central policy
        central_assume_role_policy_content = {
            "Version": "2012-10-17",
            "Statement": [
                {
                    "Effect": "Allow",
                    "Action": [
                        "logs:CreateLogGroup",
                        "logs:CreateLogStream",
                        "logs:PutLogEvents",
                    ],
                    "Resource": base_resource_arn,
                }
            ],
        }
    else:
        central_assume_role_policy_content = {
            "Version": "2012-10-17",
            "Statement": [
                {
                    "Effect": "Allow",
                    "Action": "sts:AssumeRole",
                    "Resource": policy_resource,
                }
            ],
        }
    # An IAM policy can only have 5 versions, we need to remove the oldest version before add a new one
    version_list = iam.list_policy_versions(
        PolicyArn=central_assume_role_policy_arn, MaxItems=100
    )
    if len(version_list["Versions"]) >= 5:
        oldest_version_id = version_list["Versions"][-1]["VersionId"]
        logger.info("Remove the oldest version: %s" % oldest_version_id)
        iam.delete_policy_version(
            PolicyArn=central_assume_role_policy_arn, VersionId=oldest_version_id
        )
    response = iam.create_policy_version(
        PolicyArn=central_assume_role_policy_arn,
        PolicyDocument=json.dumps(central_assume_role_policy_content),
        SetAsDefault=True,
    )
    logger.info(
        "Update the policy: " + json.dumps(central_assume_role_policy_content, indent=2)
    )

    logger.info(response)
