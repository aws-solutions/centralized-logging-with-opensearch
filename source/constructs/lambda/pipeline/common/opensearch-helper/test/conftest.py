# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import os
import pytest


@pytest.fixture(autouse=True)
def default_environment_variables():
    """Mocked AWS evivronment variables such as AWS credentials and region"""
    os.environ["AWS_ACCESS_KEY_ID"] = "mocked-aws-access-key-id"
    os.environ["AWS_SECRET_ACCESS_KEY"] = "mocked-aws-secret-access-key"
    os.environ["AWS_SESSION_TOKEN"] = "mocked-aws-session-token"
    os.environ["AWS_REGION"] = "us-east-1"
    os.environ["SOLUTION_VERSION"] = "v1.0.0"
    os.environ["SOLUTION_ID"] = "SO8025"

    os.environ["INDEX_PREFIX"] = "hello"
    os.environ["ENDPOINT"] = "vpc-dev-abc.us-east-1.es.amazonaws.com"
    os.environ["LOG_TYPE"] = "ELB"
    os.environ["DOMAIN_NAME"] = "dev"

    os.environ["WARM_AGE"] = "10"
    os.environ["COLD_AGE"] = "10"
    os.environ["RETAIN_AGE"] = "180"
    os.environ["ROLLOVER_SIZE"] = "30g"
    os.environ["INDEX_SUFFIX"] = "yyyy-MM-dd"
    
    # os.environ["DAYS_TO_RETAIN"] = "180"
    # os.environ["NUMBER_OF_SHARDS"] = "10"
    # os.environ["NUMBER_OF_REPLICAS"] = "10"
