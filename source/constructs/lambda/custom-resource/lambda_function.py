# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import os
import json
from commonlib.decorator import retry
from commonlib.exception import APIException, ErrorCode
from commonlib.logging import get_logger
from commonlib.aws import AWSConnection
from commonlib.dao import OpenSearchDomainDao
from uuid import uuid4

logger = get_logger(__name__)

solution_version = os.environ.get("SOLUTION_VERSION")
solution_name = os.environ.get("SOLUTION_NAME")
template_bucket = os.environ.get("TEMPLATE_OUTPUT_BUCKET")
template_base_url = os.environ.get("TEMPLATE_BASE_URL")
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
staging_bucket = os.environ.get("STAGING_BUCKET")
access_logging_bucket = os.environ.get("ACCESS_LOGGING_BUCKET")
SNS_EMAIL_TOPIC_ARN = os.environ.get("SNS_EMAIL_TOPIC_ARN")

default_cmk_arn = os.environ.get("DEFAULT_CMK_ARN")

CLOUDFRONT_DISTRIBUTION_ID = os.environ.get("CLOUDFRONT_DISTRIBUTION_ID")
OPENSEARCH_MASTER_ROLE_ARN = os.environ["OPENSEARCH_MASTER_ROLE_ARN"]
OPENSEARCH_DOMAIN_TABLE = os.environ["OPENSEARCH_DOMAIN_TABLE"]

conn = AWSConnection()
s3 = conn.get_client("s3", client_type="resource")
ddb = conn.get_client("dynamodb", client_type="resource")
cloudfront = conn.get_client("cloudfront")
iam = conn.get_client("iam")
aos = conn.get_client("opensearch")


def is_advanced_security_enabled_safe(aos_client, domain_name: str) -> bool:
    try:
        resp = aos_client.describe_domain_config(DomainName=domain_name)
        return resp["DomainConfig"]["AdvancedSecurityOptions"]["Options"]["Enabled"]
    except Exception as e:
        logger.exception(e)
    return False


@retry(retries=5, delays=3, backoff=2)
def set_master_user_arn(aos_client, domain_name, master_role_arn: str):
    resp = aos_client.update_domain_config(
        DomainName=domain_name,
        AdvancedSecurityOptions={
            "MasterUserOptions": {
                "MasterUserARN": master_role_arn,
            },
        },
    )
    status_code = resp["ResponseMetadata"]["HTTPStatusCode"]
    if status_code >= 300:
        raise APIException(
            ErrorCode.UNKNOWN_ERROR,
            "Failed to add backend role {role_arn} to domain {domain_name}, status: {status_code}",
        )


def lambda_handler(event, _):
    logger.info(event)

    config_str = get_config_str()
    write_to_s3(config_str)

    set_master_user_arn_for_aos_domains()

    cloudfront_invalidate(CLOUDFRONT_DISTRIBUTION_ID, ["/*"])

    enable_s3_bucket_access_logging()
    return "OK"


def set_master_user_arn_for_aos_domains():
    aos_dao = OpenSearchDomainDao(OPENSEARCH_DOMAIN_TABLE)
    for domain in aos_dao.list_domains():
        if not domain.masterRoleArn and is_advanced_security_enabled_safe(
            aos, domain.domainName
        ):
            logger.info(
                f"Set master user arn {OPENSEARCH_MASTER_ROLE_ARN} to {domain.domainName}"
            )
            set_master_user_arn(aos, domain.domainName, OPENSEARCH_MASTER_ROLE_ARN)

            logger.info(f"Recording master role for domain: {domain.id}")
            aos_dao.set_master_role_arn(domain.id, OPENSEARCH_MASTER_ROLE_ARN)


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
        "sns_email_topic_arn": SNS_EMAIL_TOPIC_ARN,
        "template_bucket": template_bucket,
        "template_base_url": template_base_url,
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


def enable_s3_bucket_access_logging():
    s3_client = conn.get_client("s3")
    logger.info("Enabling server access logging")
    logging_config = {
        "LoggingEnabled": {
            "TargetBucket": access_logging_bucket,
            "TargetPrefix": f"{default_logging_bucket}/",
        }
    }
    s3_client.put_bucket_logging(
        Bucket=default_logging_bucket, BucketLoggingStatus=logging_config
    )
    logger.info("Enabled server access logging for default logging bucket.")

    logging_config = {
        "LoggingEnabled": {
            "TargetBucket": access_logging_bucket,
            "TargetPrefix": f"{staging_bucket}/",
        }
    }
    s3_client.put_bucket_logging(
        Bucket=staging_bucket, BucketLoggingStatus=logging_config
    )
    logger.info("Enabled server access logging for staging bucket.")
