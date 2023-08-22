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
    os.environ["AWS_DEFAULT_REGION"] = "us-east-1"
    os.environ["SOLUTION_VERSION"] = "v1.0.0"
    os.environ["SOLUTION_ID"] = "SO8025"

    os.environ["LOG_BUCKET_NAME"] = "solution-bucket"
    os.environ["BACKUP_BUCKET_NAME"] = "solution-bucket"
    os.environ["INDEX_PREFIX"] = "hello"
    os.environ["ENDPOINT"] = "vpc-dev-abc.us-east-1.es.amazonaws.com"
    os.environ["ENGINE"] = "OpenSearch"
    os.environ["LOG_TYPE"] = "ELB"
    os.environ["BULK_BATCH_SIZE"] = "10"
    os.environ[
        "FIELD_NAMES"
    ] = "timestamp,c-ip,time-to-first-byte,sc-status,sc-bytes,cs-method,cs-protocol,cs-host,cs-uri-stem,cs-bytes,x-edge-location,x-edge-request-id,x-host-header,time-taken,cs-protocol-version,c-ip-version,cs-user-agent,cs-referer,cs-cookie,cs-uri-query,x-edge-response-result-type,x-forwarded-for,ssl-protocol,ssl-cipher,x-edge-result-type,fle-encrypted-fields,fle-status,sc-content-type,sc-content-len,sc-range-start,sc-range-end,c-port,x-edge-detailed-result-type,c-country,cs-accept-encoding,cs-accept,cache-behavior-path-pattern,cs-headers,cs-header-names,cs-headers-count,primary-distribution-id,primary-distribution-dns-name,origin-fbl,origin-lbl,asn"
