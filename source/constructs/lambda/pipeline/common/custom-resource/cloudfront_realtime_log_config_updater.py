# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import boto3
import logging

logging.getLogger().setLevel(logging.INFO)


def on_event(event, _):
    logging.info("on_event %s", event)

    props = event["ResourceProperties"]
    cf_distribution = props["CloudFrontDistribution"]
    cf_rt_log_config_arn = props["CloudFrontRealTimeLogConfigArn"]

    client = boto3.client("cloudfront")
    response = client.get_distribution(Id=cf_distribution)
    distribution_config = response["Distribution"]["DistributionConfig"]

    request_type = event["RequestType"]

    if request_type == "Create" or request_type == "Update":
        logging.info(
            "Set distribution: %s realtime log config to %s",
            cf_distribution,
            cf_rt_log_config_arn,
        )

        distribution_config["DefaultCacheBehavior"][
            "RealtimeLogConfigArn"
        ] = cf_rt_log_config_arn
    elif request_type == "Delete":
        logging.info("Delete distribution: %s realtime log config", cf_distribution)

        if "RealtimeLogConfigArn" in distribution_config["DefaultCacheBehavior"]:
            del distribution_config["DefaultCacheBehavior"]["RealtimeLogConfigArn"]
    else:
        logging.info("Unknown request_type: %s, do nothing" % request_type)

        return {}

    # Update the distribution with the new configuration
    response = client.update_distribution(
        DistributionConfig=distribution_config,
        Id=cf_distribution,
        IfMatch=response["ETag"],
    )

    logging.info("response: %s", response)

    return {"status": response["Distribution"]["Status"]}
