# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import json
import os

import boto3

s3 = boto3.resource("s3")

bucket_name = os.environ.get('WEB_BUCKET_NAME')
api_endpoint = os.environ.get('API_ENDPOINT')
user_pool_id = os.environ.get('USER_POOL_ID')
user_pool_client_id = os.environ.get('USER_POOL_CLIENT_ID')
oidc_provider = os.environ.get('OIDC_PROVIDER')
client_id = os.environ.get('OIDC_CLIENT_ID')
authentication_type = os.environ.get('AUTHENTICATION_TYPE')
customer_domain = os.environ.get('OIDC_CUSTOMER_DOMAIN')
cloudfront_url = os.environ.get('CLOUDFRONT_URL')
region = os.environ.get('AWS_REGION')
default_logging_bucket = os.environ.get('DEFAULT_LOGGING_BUCKET')
default_cmk_arn = os.environ.get('DEFAULT_CMK_ARN')
loghub_version = os.environ.get('VERSION')


def lambda_handler(event, context):
    # print(event)
    print('Put config file to S3')
    config_str = get_config_str()
    write_to_s3(config_str)
    print('Put config file to S3 completed.')
    return 'OK'


def get_config_str():
    export_json = {
        "aws_project_region": region,
        "aws_appsync_graphqlEndpoint": api_endpoint,
        "aws_appsync_region": region,
        "aws_appsync_authenticationType": authentication_type,
        "aws_oidc_provider": oidc_provider,
        "aws_oidc_client_id": client_id,
        "aws_oidc_customer_domain": customer_domain,
        "aws_cloudfront_url": cloudfront_url,
        "aws_cognito_region": region,
        "aws_user_pools_id": user_pool_id,
        "aws_user_pools_web_client_id": user_pool_client_id,
        "default_logging_bucket": default_logging_bucket,
        "default_cmk_arn": default_cmk_arn,
        "loghub_version": loghub_version,
    }

    return json.dumps(export_json)


def write_to_s3(config_str):
    key_name = 'aws-exports.json'
    s3.Bucket(bucket_name).put_object(
        Key=key_name, Body=config_str)
