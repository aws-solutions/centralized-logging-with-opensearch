# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import os
import json
import base64

import boto3
import pytest

from moto import mock_s3


def mk_kds_evt(data):
    return {
        "Records": [
            {
                "kinesis": {
                    "kinesisSchemaVersion": "1.0",
                    "partitionKey": "eQRnj7LHcO9256584",
                    "sequenceNumber": "49631468190676687901272308564704240562978646622126211730",
                    "data": base64.b64encode(bytes(data, 'utf-8')),
                    "approximateArrivalTimestamp": 1658047150.32
                },
                "eventSource": "aws:kinesis",
                "eventVersion": "1.0",
                "eventID": "shardId-000000000041:49631468190676687901272308564704240562978646622126211730",
                "eventName": "aws:kinesis:record",
                "invokeIdentityArn": "arn:aws:iam::123456:role/LogHub-AppPipe-42fb0-LogProcessorLogProcessorFnSer-12R3WZ9O7QDWC",
                "awsRegion": "ap-northeast-1",
                "eventSourceARN": "arn:aws:kinesis:ap-northeast-1:123456:stream/LogHub-AppPipe-42fb0-Stream790BDEE4-ByiPt1XoNpow"
            },
        ]
    }


@pytest.fixture
def s3_client():
    with mock_s3():
        s3 = boto3.resource("s3")
        s3.create_bucket(Bucket=os.environ.get("FAILED_LOG_BUCKET_NAME"))

        yield


class Response:
    def __init__(self, status_code, text=""):
        self.status_code = status_code
        self.text = text

    def json(self):
        return json.loads(self.text)


LOAD_SUCCESS_RESP = Response(201, json.dumps({
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
}))
LOAD_FAILED_RESP = Response(201, json.dumps({
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
}))


def test_lambda_handler_success(mocker):
    import lambda_function

    mocker.patch("util.osutil.OpenSearch.exist_index_template", return_value=True)
    mocker.patch("util.osutil.OpenSearch.bulk_load", return_value=LOAD_SUCCESS_RESP)

    evt = mk_kds_evt(json.dumps({'msg': 'hello world'}))

    lambda_function.lambda_handler(evt, None)


@mock_s3
def test_lambda_handler_failed(mocker):
    s3 = boto3.resource("s3")
    s3.create_bucket(Bucket=os.environ.get("FAILED_LOG_BUCKET_NAME"))

    import lambda_function

    mocker.patch("util.osutil.OpenSearch.exist_index_template", return_value=True)
    mocker.patch("util.osutil.OpenSearch.bulk_load", return_value=LOAD_FAILED_RESP)

    evt = mk_kds_evt(json.dumps({'msg': 'hello world'}))

    lambda_function.lambda_handler(evt, None)


def test_record2log():
    from lambda_function import record2log

    evt = mk_kds_evt(json.dumps({'msg': 'hello world'}))

    assert {'msg': 'hello world'} == record2log(evt['Records'][0])
