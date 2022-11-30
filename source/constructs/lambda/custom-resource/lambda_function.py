# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import json
import logging
import os

import boto3
from botocore import config
from boto3.dynamodb.conditions import Attr

logger = logging.getLogger()
logger.setLevel(logging.INFO)

solution_version = os.environ.get("SOLUTION_VERSION", "v1.0.0")
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


def lambda_handler(event, context):
    logger.info(event)

    config_str = get_config_str()
    write_to_s3(config_str)

    upgrade_data()

    return "OK"


def upgrade_data():
    """Perform actions on updating backend data during upgrade"""
    upgrade_eks_kind_table()
    upgrade_app_pipeline_table()


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
                item["aosParams"] = item.pop("aosParas")
                if "kdsParas" in item and item.get("kdsParas"):
                    kds_params = item.pop("kdsParas")
                    item["bufferType"] = "KDS"
                    item["bufferParams"] = [
                        {
                            "paramKey": "enableAutoScaling",
                            "paramValue": str(
                                kds_params.get("enableAutoScaling", "false")
                            ),
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
        "loghub_version": solution_version,
    }

    return json.dumps(export_json)


def write_to_s3(config_str):
    logger.info("Put config file to S3")
    key_name = "aws-exports.json"
    s3.Bucket(bucket_name).put_object(Key=key_name, Body=config_str)
    logger.info("Put config file to S3 completed.")
