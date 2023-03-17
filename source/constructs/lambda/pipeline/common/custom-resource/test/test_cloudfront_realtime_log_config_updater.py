# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import pytest
import os
import boto3

from moto import mock_cloudfront


@pytest.fixture
def cloudfront_distribution_id():
    with mock_cloudfront():
        region = os.environ.get("AWS_REGION")

        cloudfront = boto3.client("cloudfront", region_name=region)

        response = cloudfront.create_distribution(
            DistributionConfig={
                "CallerReference": "ref",
                "Aliases": {"Quantity": 1, "Items": ["mydomain.com"]},
                "Origins": {
                    "Quantity": 1,
                    "Items": [
                        {
                            "Id": "origin1",
                            "DomainName": "asdf.s3.us-east-1.amazonaws.com",
                            "OriginPath": "/example",
                            "S3OriginConfig": {
                                "OriginAccessIdentity": "origin-access-identity/cloudfront/123456789012000001"
                            },
                        }
                    ],
                },
                "DefaultCacheBehavior": {
                    "TargetOriginId": "origin1",
                    "ViewerProtocolPolicy": "allow-all",
                    "MinTTL": 10,
                    "ForwardedValues": {
                        "QueryString": False,
                        "Cookies": {"Forward": "none"},
                    },
                },
                "Comment": "an optional comment that's not actually optional",
                "Enabled": False,
            }
        )

        yield response["Distribution"]["Id"]


def test_cloudfront_realtime_log_config_updater_on_event(cloudfront_distribution_id):
    from cloudfront_realtime_log_config_updater import on_event

    region = os.environ["AWS_REGION"]

    response = on_event(
        {
            "RequestType": "Create",
            "ServiceToken": f"arn:aws:lambda:{region}:123456789012:function:CL-Pipe-040d890a-comamazonawscdkcustomresourcescfr-aGnwZY0HXqVS",
            "ResponseURL": f"https://cloudformation-custom-resource-response-uswest2.s3-{region}.amazonaws.com/****",
            "StackId": f"arn:aws:cloudformation:{region}:123456789012:stack/CL-Pipe-040d890a/f3a7c1b0-a760-11ed-97a5-028254183d2b",
            "RequestId": "9d87ee45-0e31-4cbf-9559-b335d00ec0e9",
            "LogicalResourceId": "CloudFrontRealTimeLogBCAD0945",
            "ResourceType": "Custom::CFRTLogConfigUpdater",
            "ResourceProperties": {
                "ServiceToken": "arn:aws:lambda::123456789012:function:CL-Pipe-040d890a-comamazonawscdkcustomresourcescfr-aGnwZY0HXqVS",
                "CloudFrontDistribution": cloudfront_distribution_id,
                "CloudFrontRealTimeLogConfigArn": f"arn:aws:cloudfront::123456789012:realtime-log-config/{cloudfront_distribution_id}",
            },
        },
        None,
    )

    assert response == {"status": "Deployed"}
