# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import boto3
from commonlib.logging import get_logger

logger = get_logger(__name__)


def on_event(event, _):
    logger.info("on_event %s", event)

    props = event["ResourceProperties"]
    cf_distribution = props["CloudFrontDistribution"]
    cf_rt_log_config_arn = props["CloudFrontRealTimeLogConfigArn"]

    client = boto3.client("cloudfront")
    response = client.get_distribution(Id=cf_distribution)
    distribution_config = response["Distribution"]["DistributionConfig"]

    request_type = event["RequestType"]

    if request_type == "Create" or request_type == "Update":
        logger.info(
            "Set distribution: %s realtime log config to %s",
            cf_distribution,
            cf_rt_log_config_arn,
        )

        distribution_config["DefaultCacheBehavior"][
            "RealtimeLogConfigArn"
        ] = cf_rt_log_config_arn
    elif request_type == "Delete":
        logger.info("Delete distribution: %s realtime log config", cf_distribution)

        if "RealtimeLogConfigArn" in distribution_config["DefaultCacheBehavior"]:
            del distribution_config["DefaultCacheBehavior"]["RealtimeLogConfigArn"]
    else:
        logger.info("Unknown request_type: %s, do nothing" % request_type)

        return {}

    # Update the distribution with the new configuration
    response = client.update_distribution(
        DistributionConfig=distribution_config,
        Id=cf_distribution,
        IfMatch=response["ETag"],
    )

    logger.info("response: %s", response)

    return {"status": response["Distribution"]["Status"]}
