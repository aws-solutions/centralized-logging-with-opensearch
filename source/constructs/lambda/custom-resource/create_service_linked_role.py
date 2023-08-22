# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import boto3
import logging
import time

iam = boto3.client("iam")

logger = logging.getLogger()
logger.setLevel(logging.INFO)


def lambda_handler(event, _):
    request_type = event["RequestType"]
    if request_type == "Create" or request_type == "Update":
        try:
            iam.get_role(
                RoleName="AWSServiceRoleForAppSync",
            )
            logger.info("AWSServiceRoleForAppSync already exists.")

        except Exception as e:
            logger.error(e)
            logger.info("Create service linked role AWSServiceRoleForAppSync.")
            resp = iam.create_service_linked_role(
                AWSServiceName="appsync.amazonaws.com"
            )
            if "Role" in resp and "Arn" in resp["Role"]:
                logger.info("Create AWSServiceRoleForAppSync completed.")
            # After created, it can't be used immediately.
            time.sleep(5)

    return "OK"
