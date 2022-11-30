# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import os
import json
import base64
import boto3
import pytest

from moto import mock_s3


@pytest.fixture
def kds_event():
    data = json.dumps({"msg": "hello world"})
    return {
        "Records": [
            {
                "kinesis": {
                    "kinesisSchemaVersion": "1.0",
                    "partitionKey": "eQRnj7LHcO9256584",
                    "sequenceNumber": "49631468190676687901272308564704240562978646622126211730",
                    "data": base64.b64encode(bytes(data, "utf-8")),
                    "approximateArrivalTimestamp": 1658047150.32,
                },
                "eventSource": "aws:kinesis",
                "eventVersion": "1.0",
                "eventID": "shardId-000000000041:49631468190676687901272308564704240562978646622126211730",
                "eventName": "aws:kinesis:record",
                "invokeIdentityArn": "arn:aws:iam::123456:role/LogHub-AppPipe-42fb0-LogProcessorLogProcessorFnSer-12R3WZ9O7QDWC",
                "awsRegion": "ap-northeast-1",
                "eventSourceARN": "arn:aws:kinesis:ap-northeast-1:123456:stream/LogHub-AppPipe-42fb0-Stream790BDEE4-ByiPt1XoNpow",
            },
        ]
    }


@pytest.fixture
def msk_event():
    data = json.dumps({"msg": "hello world"})
    return {
        "eventSource": "aws:kafka",
        "eventSourceArn": "arn:aws:kafka:sa-east-1:123456789012:cluster/vpc-2priv-2pub/751d2973-a626-431c-9d4e-d7975eb44dd7-2",
        "bootstrapServers": "b-2.demo-cluster-1.a1bcde.c1.kafka.us-east-1.amazonaws.com:9092,b-1.demo-cluster-1.a1bcde.c1.kafka.us-east-1.amazonaws.com:9092",
        "records": {
            "mytopic-0": [
                {
                    "topic": "mytopic",
                    "partition": 0,
                    "offset": 15,
                    "timestamp": 1545084650987,
                    "timestampType": "CREATE_TIME",
                    "key": "abcDEFghiJKLmnoPQRstuVWXyz1234==",
                    "value": base64.b64encode(bytes(data, "utf-8")),
                    "headers": [],
                }
            ]
        },
    }


@pytest.fixture
def s3_client():
    bucket_name = os.environ.get("BACKUP_BUCKET_NAME")
    with mock_s3():
        s3 = boto3.resource("s3", region_name="us-east-1")
        s3.create_bucket(Bucket=bucket_name)
        yield


class Response:
    def __init__(self, status_code, text=""):
        self.status_code = status_code
        self.text = text

    def json(self):
        return json.loads(self.text)


LOAD_SUCCESS_RESP = Response(
    201,
    json.dumps(
        {
            "took": 196,
            "errors": False,
            "items": [
                {
                    "index": {
                        "_index": "hello-elb-2022-03-31",
                        "_type": "_doc",
                        "_id": "hzE-338BYaSJE47C8kGt",
                        "_version": 1,
                        "result": "created",
                        "_shards": {"total": 2, "successful": 1, "failed": 0},
                        "_seq_no": 0,
                        "_primary_term": 1,
                        "status": 201,
                    }
                },
                {
                    "index": {
                        "_index": "hello-elb-2022-03-31",
                        "_type": "_doc",
                        "_id": "iDE-338BYaSJE47C8kGt",
                        "_version": 1,
                        "result": "created",
                        "_shards": {"total": 2, "successful": 1, "failed": 0},
                        "_seq_no": 1,
                        "_primary_term": 1,
                        "status": 201,
                    }
                },
            ],
        }
    ),
)
LOAD_FAILED_RESP = Response(
    201,
    json.dumps(
        {
            "took": 1,
            "errors": True,
            "items": [
                {
                    "index": {
                        "_index": "hello-elb-2022-03-31",
                        "_type": "_doc",
                        "_id": None,
                        "status": 400,
                        "error": {
                            "type": "illegal_argument_exception",
                            "reason": "Validation Failed",
                        },
                    }
                },
            ],
        }
    ),
)


def test_lambda_handler_kds_success(mocker, kds_event):
    os.environ["SOURCE"] = "KDS"
    import lambda_function

    mocker.patch("util.osutil.OpenSearch.exist_index_template", return_value=True)
    mocker.patch("util.osutil.OpenSearch.bulk_load", return_value=LOAD_SUCCESS_RESP)

    lambda_function.lambda_handler(kds_event, None)

    os.environ.pop("SOURCE")


@mock_s3
def test_lambda_handler_kds_failed(mocker, kds_event):
    os.environ["SOURCE"] = "KDS"
    bucket_name = os.environ.get("BACKUP_BUCKET_NAME")
    s3 = boto3.resource("s3", region_name="us-east-1")
    s3.create_bucket(Bucket=bucket_name)

    import lambda_function

    mocker.patch("util.osutil.OpenSearch.exist_index_template", return_value=True)
    mocker.patch("util.osutil.OpenSearch.bulk_load", return_value=LOAD_FAILED_RESP)

    lambda_function.lambda_handler(kds_event, None)
