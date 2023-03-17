# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import json
import logging
import os
from uuid import uuid4

import boto3
from botocore import config
from boto3.dynamodb.conditions import Attr

logger = logging.getLogger()
logger.setLevel(logging.INFO)

solution_version = os.environ.get("SOLUTION_VERSION")
solution_name = os.environ.get("SOLUTION_NAME")
template_bucket = os.environ.get("TEMPLATE_OUTPUT_BUCKET")

solution_id = os.environ.get("SOLUTION_ID", "SO8025")
user_agent_config = {
    "user_agent_extra": f"AwsSolution/{solution_id}/{solution_version}"
}
default_config = config.Config(**user_agent_config)
default_region = os.environ.get("AWS_REGION")

s3 = boto3.resource("s3", region_name=default_region, config=default_config)
ddb = boto3.resource("dynamodb", region_name=default_region, config=default_config)

bucket_name = os.environ.get("WEB_BUCKET_NAME")
api_endpoint = os.environ.get("API_ENDPOINT")
user_pool_id = os.environ.get("USER_POOL_ID")
user_pool_client_id = os.environ.get("USER_POOL_CLIENT_ID")
oidc_provider = os.environ.get("OIDC_PROVIDER")
client_id = os.environ.get("OIDC_CLIENT_ID")
authentication_type = os.environ.get("AUTHENTICATION_TYPE")
custom_domain = os.environ.get("OIDC_CUSTOMER_DOMAIN", "")
if custom_domain and not custom_domain.startswith("https://"):
    custom_domain = "https://" + custom_domain
cloudfront_url = os.environ.get("CLOUDFRONT_URL")
region = os.environ.get("AWS_REGION")
default_logging_bucket = os.environ.get("DEFAULT_LOGGING_BUCKET")
default_cmk_arn = os.environ.get("DEFAULT_CMK_ARN")

CLOUDFRONT_DISTRIBUTION_ID = os.environ.get("CLOUDFRONT_DISTRIBUTION_ID")

cloudfront = boto3.client("cloudfront")
iam = boto3.client('iam')


def lambda_handler(event, context):
    logger.info(event)

    config_str = get_config_str()
    write_to_s3(config_str)

    upgrade_data()

    cloudfront_invalidate(CLOUDFRONT_DISTRIBUTION_ID, ["/*"])

    return "OK"


def upgrade_data():
    """Perform actions on updating backend data during upgrade"""
    upgrade_eks_kind_table()
    upgrade_app_pipeline_table()
    upgrade_pipeline_table()
    upgrade_central_assume_role_policy()


def upgrade_eks_kind_table():
    """Required for Upgrade from v1.0.x or v1.1.x to v1.2+

    The upgrade is to move the data in LogAgentEKSDeploymentKindTable
    to table EKSClusterLogSourceTable

    This action should not be required since version v1.4.0+
    """
    logger.info("Try to upgrade eks deployment kind table")

    eks_deploy_kind_table_name = os.environ.get("EKS_DEPLOY_KIND_TABLE", "")
    eks_source_table_name = os.environ.get("EKS_LOG_SOURCE_TABLE", "")

    if eks_deploy_kind_table_name and eks_source_table_name:
        try:
            eks_deploy_kind_table = ddb.Table(eks_deploy_kind_table_name)
            eks_source_table = ddb.Table(eks_source_table_name)
            logger.info(
                "merge data from %s into %s",
                eks_deploy_kind_table_name,
                eks_source_table_name,
            )

            response = eks_deploy_kind_table.scan(
                ProjectionExpression="id, deploymentKind, eksClusterId"
            )
            items = response["Items"]

            for item in items:
                # batch writer doesn't support update_item
                # don't want to have another call of get_item first
                # So, perform update and delete one by one
                eks_source_table.update_item(
                    Key={"id": item["eksClusterId"]},
                    UpdateExpression="SET deploymentKind = :k",
                    ExpressionAttributeValues={
                        ":k": item["deploymentKind"],
                    },
                )
                eks_deploy_kind_table.delete_item(
                    Key={"id": item["id"]},
                )

            logger.info("Upgrade eks deployment kind table completed")

        except Exception as e:
            logger.error("Unable to perform upgrade on eks deployment kind table")
            logger.error(e)

    else:
        logger.info("Can not identify the eks source or eks deploy kind table")
        logger.info("Upgrade of eks deployment kind table skipped")


def upgrade_app_pipeline_table():
    """Required for Upgrade from v1.0.x or v1.1.x to v1.2+

    The upgrade is to change the data structure of existing data
    in table AppPipelineTable

    This action should not be required since version v1.4.0+
    """
    logger.info("Try to upgrade app pipeline table")
    app_pipeline_table_name = os.environ.get("APP_PIPELINE_TABLE", "")
    if app_pipeline_table_name:
        try:
            app_pipeline_table = ddb.Table(app_pipeline_table_name)

            # perform update only to old items that exist aosParas column
            response = app_pipeline_table.scan(
                FilterExpression=Attr("aosParas").exists(),
            )
            items = response["Items"]

            for item in items:
                _update_app_pipeline_item(item)

            with app_pipeline_table.batch_writer() as batch:
                # Overwrite all updated items
                for item in items:
                    batch.put_item(Item=item)
            logger.info("Upgrade app pipeline table completed")
        except Exception as e:
            logger.error("Unable to perform upgrade on app pipeline table")
            logger.error(e)

    else:
        logger.info("Can not identify the eks source or eks deploy kind table")
        logger.info("Upgrade of app pipeline table skipped")


def _update_app_pipeline_item(item):
    item["aosParams"] = item.pop("aosParas")
    if "kdsParas" in item and item.get("kdsParas"):
        kds_params = item.pop("kdsParas")
        item["bufferType"] = "KDS"
        item["bufferParams"] = [
            {
                "paramKey": "enableAutoScaling",
                "paramValue": str(kds_params.get("enableAutoScaling", "false")),
            },
            {
                "paramKey": "shardCount",
                "paramValue": str(kds_params.get("startShardNumber")),
            },
            {
                "paramKey": "minCapacity",
                "paramValue": str(kds_params.get("startShardNumber")),
            },
            {
                "paramKey": "maxCapacity",
                "paramValue": str(kds_params.get("maxShardNumber")),
            },
        ]
        item["bufferAccessRoleArn"] = item.pop("kdsRoleArn", "")
        item["bufferAccessRoleName"] = item.pop("kdsRoleName", "")
        item["bufferResourceName"] = kds_params.get("streamName", "")
        item["bufferResourceArn"] = kds_params.get("kdsArn", "")
        if "osHelperFnArn" not in item:
            item["osHelperFnArn"] = kds_params.get("osHelperFnArn", "")

    else:
        item["bufferType"] = "None"
        item["bufferParams"] = []
        item["bufferAccessRoleArn"] = item.pop("ec2RoleArn", "")
        item["bufferAccessRoleName"] = item.pop("ec2RoleName", "")


def upgrade_pipeline_table():
    """Required for Upgrade from v1.2.1 or v1.1.x to v5.0+

    The upgrade is to change the data structure of existing data
    in table pipelineTable

    This action should not be required since version v1.4.0+
    """
    logger.info("Try to upgrade pipeline table")
    pipeline_table_name = os.environ.get("PIPELINE_TABLE", "")
    if pipeline_table_name:
        try:
            pipeline_table = ddb.Table(pipeline_table_name)

            # perform update only to old items that exist parameters column
            response = pipeline_table.scan(
                FilterExpression=Attr("parameters").exists(),
            )
            items = response["Items"]

            for item in items:
                _update_pipeline_item(item)

            with pipeline_table.batch_writer() as batch:
                # Overwrite all updated items
                for item in items:
                    batch.put_item(Item=item)
            logger.info("Upgrade pipeline table completed")
        except Exception as e:
            logger.error("Unable to perform upgrade on pipeline table")
            logger.error(e)

    else:
        logger.info("Upgrade of pipeline table skipped")


def _update_pipeline_item(item):
    params = []
    flag = False
    ddb_params = item.pop("parameters")
    for p in ddb_params:
        if p["parameterKey"] == "daysToWarm":
            flag = True
            params.append(
                {
                    "parameterKey": "warmAge",
                    "parameterValue": p["parameterValue"],
                }
            )
        elif p["parameterKey"] == "daysToCold":
            params.append(
                {
                    "parameterKey": "coldAge",
                    "parameterValue": p["parameterValue"],
                }
            )
        elif p["parameterKey"] == "daysToRetain":
            params.append(
                {
                    "parameterKey": "retainAge",
                    "parameterValue": p["parameterValue"],
                }
            )

        else:
            params.append(
                {
                    "parameterKey": p["parameterKey"],
                    "parameterValue": p["parameterValue"],
                }
            )
    if flag:
        params.append(
            {
                "parameterKey": "codec",
                "parameterValue": "default",
            }
        )
        params.append(
            {
                "parameterKey": "refreshInterval",
                "parameterValue": "1s",
            }
        )
        params.append(
            {
                "parameterKey": "indexSuffix",
                "parameterValue": "yyyy-MM-dd",
            }
        )
        params.append(
            {
                "parameterKey": "rolloverSize",
                "parameterValue": "",
            }
        )
    item["parameters"] = params


def upgrade_central_assume_role_policy():
    """Required for Upgrade from v1.1.x or v1.2.x to v5.0+

    The upgrade is to restore the central assume role iam policy, 
    which will be override due to solution name changing.

    This action should not be required since version v5.1.0+
    """
    logger.info("Try to upgrade central assume role iam policy")

    central_assume_role_policy_arn = os.environ.get("CENTRAL_ASSUME_ROLE_POLICY_ARN")
    table_name = os.environ.get("SUB_ACCOUNT_LINK_TABLE")
    sub_account_link_table = ddb.Table(table_name)

    policy = iam.get_policy(
        PolicyArn=central_assume_role_policy_arn
    )
    policy_version = iam.get_policy_version(
        PolicyArn=central_assume_role_policy_arn,
        VersionId=policy['Policy']['DefaultVersionId']
    )
    policy_statement = policy_version['PolicyVersion']['Document']['Statement']

    # Check if there is an active sub account link
    conditions = Attr("status").ne("INACTIVE")
    resp = sub_account_link_table.scan(FilterExpression=conditions)
    policy_resource = []
    for item in resp["Items"]:
        policy_resource.append(item["subAccountRoleArn"])

    if policy_resource and (not isinstance(policy_statement[0]["Action"], str)):
        # policy will be override by:
        #     [{
        #         "Action": [
        #             "logs:CreateLogGroup",
        #             "logs:CreateLogStream",
        #             "logs:PutLogEvents"
        #         ],
        #         "Resource": "arn:aws:logs:us-east-1:123456789012:*",
        #         "Effect": "Allow"
        #     }]
        # but it should be:
        #     [{
        #         "Effect": "Allow",
        #         "Action": "sts:AssumeRole",
        #         "Resource": [
        #             "arn:aws-cn:iam::111111111111:role/xxxxxxxxxxx",
        #             "arn:aws-cn:iam::222222222222:role/xxxxxxxxxxx"
        #         ]
        #     }]
        generate_central_policy(policy_resource, central_assume_role_policy_arn)
        logger.info("Upgrade central assume role iam policy completed")
    else:
        logger.info("Upgrade of central assume role iam policy skipped")


def get_config_str():
    export_json = {
        "aws_project_region": region,
        "aws_appsync_graphqlEndpoint": api_endpoint,
        "aws_appsync_region": region,
        "aws_appsync_authenticationType": authentication_type,
        "aws_oidc_provider": oidc_provider,
        "aws_oidc_client_id": client_id,
        "aws_oidc_customer_domain": custom_domain,
        "aws_cloudfront_url": cloudfront_url,
        "aws_cognito_region": region,
        "aws_user_pools_id": user_pool_id,
        "aws_user_pools_web_client_id": user_pool_client_id,
        "default_logging_bucket": default_logging_bucket,
        "default_cmk_arn": default_cmk_arn,
        "solution_version": solution_version,
        "solution_name": solution_name,
        "template_bucket": template_bucket,
    }

    return json.dumps(export_json)


def write_to_s3(config_str):
    logger.info("Put config file to S3")
    key_name = "aws-exports.json"
    s3.Bucket(bucket_name).put_object(Key=key_name, Body=config_str)
    logger.info("Put config file to S3 completed.")


def cloudfront_invalidate(distribution_id, distribution_paths):
    invalidation_resp = cloudfront.create_invalidation(
        DistributionId=distribution_id,
        InvalidationBatch={
            "Paths": {"Quantity": len(distribution_paths), "Items": distribution_paths},
            "CallerReference": str(uuid4()),
        },
    )

    return invalidation_resp["Invalidation"]["Id"]


def generate_central_policy(policy_resource, policy_arn):
    """Helper function for generate central iam policy"""
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
        PolicyArn=policy_arn, MaxItems=100
    )
    if len(version_list["Versions"]) >= 5:
        oldest_version_id = version_list["Versions"][-1]["VersionId"]
        logger.info("Remove the oldest version: %s" % oldest_version_id)
        iam.delete_policy_version(
            PolicyArn=policy_arn, VersionId=oldest_version_id
        )
    response = iam.create_policy_version(
        PolicyArn=policy_arn,
        PolicyDocument=json.dumps(central_assume_role_policy_content),
        SetAsDefault=True,
    )
    logger.info(
        "Update the policy: " + json.dumps(central_assume_role_policy_content, indent=2)
    )
    logger.info(response)
