# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import json
import logging
import os
import uuid
from datetime import datetime

import boto3
from boto3.dynamodb.conditions import Attr
from botocore import config

logger = logging.getLogger()
logger.setLevel(logging.INFO)

DEFAULT_TIME_FORMAT = "%Y-%m-%dT%H:%M:%SZ"
SUB_ACCOUNT_NOT_FOUND_MSG = "Sub Account Link Not Found"

solution_version = os.environ.get("SOLUTION_VERSION", "v1.0.0")
solution_id = os.environ.get("SOLUTION_ID", "SO8025")
base_resource_arn = os.environ.get("BASE_RESOURCE_ARN")
user_agent_config = {
    "user_agent_extra": f"AwsSolution/{solution_id}/{solution_version}"
}
default_config = config.Config(**user_agent_config)

# Get DDB resource.
dynamodb = boto3.resource("dynamodb", config=default_config)
table_name = os.environ.get("SUB_ACCOUNT_LINK_TABLE_NAME")
sub_account_link_table = dynamodb.Table(table_name)
default_region = os.environ.get("AWS_REGION")

# Get iam resource
iam = boto3.client("iam", config=default_config)
central_assume_role_policy_arn = os.environ.get("CENTRAL_ASSUME_ROLE_POLICY_ARN")


class ErrorCode:
    ACCOUNT_NOT_FOUND = "AccountNotFound"


class APIException(Exception):
    def __init__(self, message, code: str = None):
        if code:
            super().__init__("[{}] {}".format(code, message))
        else:
            super().__init__(message)


def handle_error(func):
    """Decorator for exception handling"""

    def wrapper(*args, **kwargs):
        try:
            return func(*args, **kwargs)
        except APIException as e:
            logger.error(e)
            raise e
        except Exception as e:
            logger.error(e)
            raise RuntimeError(
                "Unknown exception, please check Lambda log for more details"
            )

    return wrapper


@handle_error
def lambda_handler(event, context):
    # logger.info("Received event: " + json.dumps(event, indent=2))

    action = event["info"]["fieldName"]
    args = event["arguments"]

    if action == "createSubAccountLink":
        return create_sub_account_link(**args)
    elif action == "deleteSubAccountLink":
        return delete_sub_account_link(**args)
    elif action == "listSubAccountLinks":
        return list_sub_account_links(**args)
    elif action == "updateSubAccountLink":
        return update_sub_account_link(**args)
    elif action == "updateSubAccountDeafultVpcSubnets":
        return update_sub_account_default_vpc_subnets(**args)
    elif action == "getSubAccountLinkByAccountIdRegion":
        return get_sub_account_link_by_accountid_region(**args)
    else:
        logger.info("Event received: " + json.dumps(event, indent=2))
        raise RuntimeError(f"Unknown action {action}")


def create_sub_account_link(**args):
    """Create a sub account link"""
    logger.info("create sub account link")

    sub_account_id = args["subAccountId"]
    sub_account_name = args["subAccountName"]
    sub_account_role_arn = args["subAccountRoleArn"]
    agent_install_doc = args["agentInstallDoc"]
    agent_conf_doc = args["agentConfDoc"]
    sub_account_bucket_name = args["subAccountBucketName"]
    sub_account_stack_id = args["subAccountStackId"]
    sub_account_kmskey_arn = args["subAccountKMSKeyArn"]
    region = args.get("region") or default_region
    sub_account_vpc_id = args.get("subAccountVpcId", "")
    sub_account_public_subnet_ids = args.get("subAccountPublicSubnetIds", "")
    conditions = Attr("status").ne("INACTIVE")
    resp = sub_account_link_table.scan(FilterExpression=conditions)
    policy_resource = []
    for item in resp["Items"]:
        """Check if the subAccountId exists"""
        if sub_account_id == item["subAccountId"] and region == item.get(
            "region", default_region
        ):
            raise APIException("Sub account id already exists.")
        """Check if the subAccountName exists """
        if sub_account_name == item["subAccountName"]:
            raise APIException(
                "Sub account name already exists, please use a new name."
            )
        policy_resource.append(item["subAccountRoleArn"])

    # Add the policy to central policy
    # Add new linked account arn
    policy_resource.append(sub_account_role_arn)
    generate_central_policy(policy_resource)

    link_id = str(uuid.uuid4())

    sub_account_link_table.put_item(
        Item={
            "id": link_id,
            "subAccountId": sub_account_id,
            "subAccountName": sub_account_name,
            "subAccountRoleArn": sub_account_role_arn,
            "agentInstallDoc": agent_install_doc,
            "agentConfDoc": agent_conf_doc,
            "subAccountBucketName": sub_account_bucket_name,
            "subAccountStackId": sub_account_stack_id,
            "subAccountVpcId": sub_account_vpc_id,
            "subAccountPublicSubnetIds": sub_account_public_subnet_ids,
            "subAccountKMSKeyArn": sub_account_kmskey_arn,
            "createdDt": datetime.utcnow().strftime(DEFAULT_TIME_FORMAT),
            "status": "ACTIVE",
            "region": region,
        }
    )

    return link_id


def list_sub_account_links(page=1, count=20, **args):
    """List sub account links"""
    logger.info(
        f"List Sub Account Link from DynamoDB in page {page} with {count} of records"
    )
    conditions = Attr("status").eq("ACTIVE")

    if "subAccountId" in args and args["subAccountId"]:
        conditions = conditions.__and__(Attr("subAccountId").eq(args["subAccountId"]))

    if "subAccountName" in args and args["subAccountName"]:
        conditions = conditions.__and__(
            Attr("subAccountName").eq(args["subAccountName"])
        )

    response = sub_account_link_table.scan(
        FilterExpression=conditions,
        ProjectionExpression="id, subAccountId, subAccountName, #s, subAccountRoleArn, agentInstallDoc, "
        "agentConfDoc, subAccountBucketName, subAccountStackId, subAccountVpcId, subAccountPublicSubnetIds, "
        "subAccountKMSKeyArn, createdDt ",
        ExpressionAttributeNames={
            "#s": "status",
        },
    )

    # Assume all items are returned in the scan request
    items = response["Items"]
    # logger.info(items)
    # build pagination
    total = len(items)
    start = (page - 1) * count
    end = page * count

    if start > total:
        start, end = 0, count
    logger.info(f"Return result from {start} to {end} in total of {total}")

    items.sort(key=lambda x: x["createdDt"], reverse=True)
    return {
        "total": len(items),
        "subAccountLinks": items[start:end],
    }


def get_sub_account_link_by_accountid_region(**args):
    """Get sub account link by account id and region"""
    sub_accoount_id = args["accountId"]
    sub_region = args.get("region", default_region)

    logger.info(
        f"Get Sub Account Link from DynamoDB which account id is {sub_accoount_id} and region is {sub_region}"
    )

    conditions = Attr("status").eq("ACTIVE")
    conditions = conditions.__and__(Attr("subAccountId").eq(sub_accoount_id))
    conditions = conditions.__and__(Attr("region").eq(sub_region))

    response = sub_account_link_table.scan(
        FilterExpression=conditions,
        ProjectionExpression="id, subAccountId, #region, subAccountName, #s, subAccountRoleArn, agentInstallDoc, "
        "agentConfDoc, subAccountBucketName, subAccountStackId, subAccountVpcId, subAccountPublicSubnetIds, "
        "subAccountKMSKeyArn, createdDt ",
        ExpressionAttributeNames={
            "#region": "region",
            "#s": "status",
        },
    )
    items = response["Items"]

    if len(items) == 0:
        raise APIException(SUB_ACCOUNT_NOT_FOUND_MSG, ErrorCode.ACCOUNT_NOT_FOUND)

    item = items[0]
    result = {}
    result["id"] = item["id"]
    result["subAccountId"] = item["subAccountId"]
    result["region"] = item.get("region", default_region)
    result["subAccountName"] = item["subAccountName"]
    result["subAccountRoleArn"] = item["subAccountRoleArn"]
    result["agentInstallDoc"] = item["agentInstallDoc"]
    result["agentConfDoc"] = item["agentConfDoc"]
    result["subAccountBucketName"] = item["subAccountBucketName"]
    result["subAccountStackId"] = item["subAccountStackId"]
    result["subAccountVpcId"] = item.get("subAccountVpcId", "")
    result["subAccountPublicSubnetIds"] = item.get("subAccountPublicSubnetIds", "")
    result["subAccountKMSKeyArn"] = item.get("subAccountKMSKeyArn", "")
    result["status"] = item["status"]
    result["createdDt"] = item["createdDt"]

    return result


def update_sub_account_link(**args):
    """update confName in LogConf table"""
    logger.info("Update Sub Account Link in DynamoDB")
    resp = sub_account_link_table.get_item(Key={"id": args["id"]})
    if "Item" not in resp:
        raise APIException(SUB_ACCOUNT_NOT_FOUND_MSG)
    resp = list_sub_account_links(subAccountName=args["subAccountName"])
    total = resp["total"]
    sub_accounts = resp["subAccountLinks"]
    """Check if the sub account name exists """
    if total > 0 and sub_accounts[0]["id"] != args["id"]:
        raise APIException("Sub Account Name already exists")

    sub_account_link_table.update_item(
        Key={"id": args["id"]},
        UpdateExpression="SET subAccountName = :accountname, agentInstallDoc = :installdoc, agentConfDoc= :confdoc, "
        "#subAccountBucketName= :bucketname, #subAccountStackId= :stackid, updatedDt= :uDt, #subAccountVpcId= "
        ":vpcid, #subAccountKMSKeyArn= :kmskeyarn, #subAccountPublicSubnetIds= :subnetids",
        ExpressionAttributeNames={
            "#subAccountName": "subAccountName",
            "#agentInstallDoc": "agentInstallDoc",
            "#agentConfDoc": "agentConfDoc",
            "#subAccountBucketName": "subAccountBucketName",
            "#subAccountStackId": "subAccountStackId",
            "#subAccountVpcId": "subAccountVpcId",
            "#subAccountPublicSubnetIds": "subAccountPublicSubnetIds",
            "#subAccountKMSKeyArn": "subAccountKMSKeyArn",
            "#updatedDt": "updatedDt",
        },
        ExpressionAttributeValues={
            ":accountname": args.get("subAccountName"),
            ":installdoc": args.get("agentInstallDoc"),
            ":confdoc": args.get("agentConfDoc"),
            ":bucketname": args.get("subAccountBucketName"),
            ":stackid": args.get("subAccountStackId"),
            ":vpcid": args.get("subAccountVpcId"),
            ":subnetids": args.get("subAccountPublicSubnetIds"),
            ":kmskeyarn": args.get("subAccountKMSKeyArn"),
            ":uDt": datetime.utcnow().strftime(DEFAULT_TIME_FORMAT),
        },
    )


def update_sub_account_default_vpc_subnets(**args):
    """update default vpc and subnets in LogConf table"""
    logger.info("Update Sub Account Link in DynamoDB")
    resp = sub_account_link_table.get_item(Key={"id": args["id"]})
    if "Item" not in resp:
        raise APIException(SUB_ACCOUNT_NOT_FOUND_MSG)

    sub_account_link_table.update_item(
        Key={"id": args["id"]},
        UpdateExpression="SET  #updatedDt= :uDt, #subAccountVpcId= :vpcid, #subAccountPublicSubnetIds= :subnetids",
        ExpressionAttributeNames={
            "#subAccountVpcId": "subAccountVpcId",
            "#subAccountPublicSubnetIds": "subAccountPublicSubnetIds",
            "#updatedDt": "updatedDt",
        },
        ExpressionAttributeValues={
            ":vpcid": args.get("subAccountVpcId"),
            ":subnetids": args.get("subAccountPublicSubnetIds"),
            ":uDt": datetime.utcnow().strftime(DEFAULT_TIME_FORMAT),
        },
    )


def delete_sub_account_link(id: str) -> str:
    """set status to INACTIVE in Sub Account Link table"""
    logger.info("Update Sub Account Link Status in DynamoDB")
    resp = sub_account_link_table.get_item(Key={"id": id})
    if "Item" not in resp:
        raise APIException(SUB_ACCOUNT_NOT_FOUND_MSG)

    conditions = Attr("status").ne("INACTIVE")
    resp = sub_account_link_table.scan(FilterExpression=conditions)
    policy_resource = []
    for item in resp["Items"]:
        # Remove the specific sub account
        if item["id"] != id:
            policy_resource.append(item["subAccountRoleArn"])

    # Update the policy to central policy
    generate_central_policy(policy_resource)

    sub_account_link_table.update_item(
        Key={"id": id},
        UpdateExpression="SET #s = :s, updatedDt= :uDt",
        ExpressionAttributeNames={"#s": "status"},
        ExpressionAttributeValues={
            ":s": "INACTIVE",
            ":uDt": datetime.utcnow().strftime(DEFAULT_TIME_FORMAT),
        },
    )


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
