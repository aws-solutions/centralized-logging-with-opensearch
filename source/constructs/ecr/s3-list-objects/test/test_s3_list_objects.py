# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import os
import boto3
import pytest

from moto import mock_s3, mock_sqs


@pytest.fixture
def s3_client():
    bucket_name = os.environ.get("BUCKET_NAME")
    with mock_s3():
        s3 = boto3.resource("s3", region_name=os.environ["AWS_REGION"])
        s3.create_bucket(Bucket=bucket_name)
        for index in range(100):
            s3.Bucket(bucket_name).put_object(
                Key=f"AWSLogs/123456789012/elasticloadbalancing/us-east-1/{index}.log",
                Body="data".encode(),
            )
        yield


@pytest.fixture
def sqs_client():
    with mock_sqs():
        sqs = boto3.client("sqs", region_name=os.environ.get("AWS_REGION"))
        q = sqs.create_queue(QueueName=os.environ["QUEUE_NAME"])
        yield q


def test_list_objects(s3_client):
    from s3_list_objects import list_objects

    it = list_objects(os.environ.get("BUCKET_NAME"), "")
    assert len(list(it)) == 100

    it = list_objects(os.environ.get("BUCKET_NAME"), "/unknown")
    assert len(list(it)) == 0


def test_limit_iter(s3_client):
    from s3_list_objects import limit_iter

    lst = list(limit_iter(range(100), limit=1))
    assert len(lst) == 1

    lst = list(limit_iter(range(100), limit=10))
    assert len(lst) == 10

    lst = list(limit_iter(range(100), limit=0))
    assert len(lst) == 0

    lst = list(limit_iter(range(100), limit=-1))
    assert len(lst) == 0

    lst = list(limit_iter(range(100), limit=1000))
    assert len(lst) == 100


def test_batch_iter(s3_client):
    from s3_list_objects import batch_iter

    lst = list(batch_iter(range(5), batch_size=1))
    assert lst == [[0], [1], [2], [3], [4]]

    lst = list(batch_iter(range(5), batch_size=100))
    assert lst == [[0, 1, 2, 3, 4]]

    lst = list(batch_iter(range(5), batch_size=0))
    assert lst == []


def test_send_message_batch(sqs_client):
    from s3_list_objects import send_message_batch

    send_message_batch(range(10), sqs_client["QueueUrl"])

    sqs = boto3.client("sqs", region_name=os.environ.get("AWS_REGION"))
    res = sqs.get_queue_attributes(
        QueueUrl=sqs_client["QueueUrl"], AttributeNames=["ApproximateNumberOfMessages"]
    )
    size = int(res["Attributes"]["ApproximateNumberOfMessages"])
    assert size == 10


def test_convert_to_s3_event_iter():
    from s3_list_objects import convert_to_s3_event_iter

    lst = list(convert_to_s3_event_iter([dict(Key="Key", Size="Size")]))

    assert lst[0]["Records"][0]["s3"]["object"] == dict(key="Key", size="Size")


def test_ticker():
    from s3_list_objects import Ticker, Counter

    n = Counter()
    t = Ticker(3, lambda: n.increment())

    t.stop()
    t.start()
    t.join()

    assert n.value == 1


def test_counter():
    from s3_list_objects import Counter

    c = Counter()

    c.increment()
    assert c.value == 1

    c.decrement()
    assert c.value == 0

    c.set_value(100)
    assert c.value == 100


def test_retry_with_backoff():
    from s3_list_objects import retry_with_backoff, Counter

    c = Counter()

    @retry_with_backoff(Exception, retries=1)
    def raise_exception():
        c.increment()
        raise ValueError("Value error")

    with pytest.raises(ValueError):
        raise_exception()

    assert c.value == 2
