# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import json
import os

import boto3
import pytest
from moto import mock_s3, mock_sts, mock_dynamodb


@pytest.fixture
def s3_client():
    bucket_name = os.environ.get("LOG_BUCKET_NAME")
    with mock_s3():
        key = (
            "AWSLogs/123456789012/elasticloadbalancing/us-east-1/2022/03/31/elb.log.gz"
        )
        s3 = boto3.resource("s3", region_name="us-east-1")
        # Create the bucket
        s3.create_bucket(Bucket=bucket_name)

        # Upload a test file.
        data = open("./test/datafile/elb.log.gz", "rb")
        s3.Bucket(bucket_name).put_object(Key=key, Body=data)
        yield


@pytest.fixture
def sts_client():
    with mock_sts():
        boto3.client("sts", region_name="us-east-1")
        yield


@pytest.fixture
def s3_event():
    with open("./test/event/s3_event.json", "r") as f:
        return json.load(f)


@pytest.fixture
def s3_multi_events():
    with open("./test/event/s3_multi_events.json", "r") as f:
        return json.load(f)


@pytest.fixture
def test_event():
    with open("./test/event/test_event.json", "r") as f:
        return json.load(f)


@pytest.fixture
def put_event():
    with open("./test/event/put_event.json", "r") as f:
        return json.load(f)


LOAD_ERR = {
    "took": 2,
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

LOAD_SUCCESS = {
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


class Response:
    def __init__(self, status_code, text=""):
        self.status_code = status_code
        self.text = text

    def json(self):
        return json.loads(self.text)


load_success_resp = Response(201, json.dumps(LOAD_SUCCESS))
load_failed_resp = Response(201, json.dumps(LOAD_ERR))


@pytest.mark.parametrize(
    "resp,expected_total,expected_failed",
    [
        (load_success_resp, 2, 0),
        (load_failed_resp, 2, 2),
    ],
)
def test_lambda_handler(
    mocker, s3_client, sts_client, s3_event, resp, expected_total, expected_failed
):
    # Can only import here, as the environment variables need to be set first.
    import lambda_function

    mocker.patch("util.osutil.OpenSearch.exist_index_template", return_value=True)
    mocker.patch("util.osutil.OpenSearch.bulk_load", return_value=resp)

    total, failed = lambda_function.lambda_handler(s3_event, None)
    assert total == expected_total
    assert failed == expected_failed


@pytest.mark.parametrize(
    "resp,expected_total,expected_failed",
    [
        (load_success_resp, 4, 0),
        (load_failed_resp, 4, 4),
    ],
)
def test_lambda_handler_multi_events(
    mocker, s3_client, sts_client, s3_multi_events, resp, expected_total, expected_failed
):
    # Can only import here, as the environment variables need to be set first.
    import lambda_function

    mocker.patch("util.osutil.OpenSearch.exist_index_template", return_value=True)
    mocker.patch("util.osutil.OpenSearch.bulk_load", return_value=resp)

    total, failed = lambda_function.lambda_handler(s3_multi_events, None)
    assert total == expected_total
    assert failed == expected_failed


def test_lambda_handler_direct_put_events(mocker, s3_client, sts_client, put_event):
    # Can only import here, as the environment variables need to be set first.
    import lambda_function

    mocker.patch("util.osutil.OpenSearch.exist_index_template", return_value=True)
    mocker.patch("util.osutil.OpenSearch.bulk_load", return_value=load_success_resp)

    total, failed = lambda_function.lambda_handler(put_event, None)
    assert total == 2
    assert failed == 0


def test_lambda_handler_test_event(test_event):
    import lambda_function

    total, failed = lambda_function.lambda_handler(test_event, None)
    assert total == 0
    assert failed == 0


def test_lambda_handler_unknown_sqs_event():
    import lambda_function

    unknown_event = {"hello": "world"}
    with pytest.raises(RuntimeError):
        lambda_function.lambda_handler(unknown_event, None)


def test_key_not_found(mocker, s3_event):
    import lambda_function

    mocker.patch("util.osutil.OpenSearch.exist_index_template", return_value=True)
    mocker.patch("lambda_function.get_object_key", return_value="unknown_file")
    with pytest.raises(RuntimeError):
        lambda_function.lambda_handler(s3_event, None)


# def test_aos_error(mocker, s3_event, s3_client):
#     import lambda_function

#     mocker.patch("util.osutil.OpenSearch.exist_index_template", return_value=True)
#     mocker.patch(
#         "util.osutil.OpenSearch.bulk_load",
#         return_value=Response(503),
#     )

#     with pytest.raises(RuntimeError):
#         lambda_function.lambda_handler(s3_event, None)


# def test_index_template_not_exist(mocker, s3_event):
#     import lambda_function

#     mocker.patch("util.osutil.OpenSearch.exist_index_template", return_value=False)
#     with pytest.raises(RuntimeError):
#         lambda_function.lambda_handler(s3_event, None)
