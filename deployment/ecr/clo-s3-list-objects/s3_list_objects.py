#!/usr/bin/env python3
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import os
import json
import time
import logging
import datetime
import threading

from itertools import islice
from commonlib import AWSConnection
from botocore.exceptions import ClientError

logging.getLogger().setLevel(logging.INFO)


AWS_REGION = os.environ["AWS_REGION"]
BUCKET_NAME = os.environ["BUCKET_NAME"]
KEY_PREFIX = os.environ.get("KEY_PREFIX", "")
KEY_SUFFIX = os.environ.get("KEY_SUFFIX", "")
DRY_RUN = os.environ.get("DRY_RUN")

BATCH_SIZE = 10
AWS_PARTITION = "aws-cn" if AWS_REGION.startswith("cn-") else "aws"
LOG_STATS_INTERVAL = int(os.environ.get("LOG_STATS_INTERVAL", "5"))


conn = AWSConnection()
s3 = conn.get_client("s3")
events = conn.get_client("events")


class Counter:
    def __init__(self):
        self._value = 0
        self._lock = threading.Lock()

    @property
    def value(self):
        return self._value

    def set_value(self, value):
        with self._lock:
            self._value = value

    def increment(self):
        with self._lock:
            self._value += 1

    def decrement(self):
        with self._lock:
            self._value -= 1


SCAN_COUNTER = Counter()
LAST_SCAN_COUNTER = Counter()
SENT_BATCH_COUNTER = Counter()
FAILED_COUNTER = Counter()


class Ticker(threading.Thread):
    def __init__(self, interval, function):
        super(Ticker, self).__init__()
        self._finished = threading.Event()
        self._interval = interval
        self._function = function

    def stop(self):
        self._finished.set()

    def run(self):
        while not self._finished.is_set():
            self._function()
            time.sleep(self._interval)
        self._finished.set()
        self._function()


def expo_backoff(start):
    yield start
    while True:
        start *= 2
        yield start


def retry_with_backoff(exception_type, exception_handler=None, retries=5):
    def decorator(func):
        def wrapper(*args, **kwargs):
            backoff_gen = expo_backoff(3)
            count = 0
            while True:
                try:
                    return func(*args, **kwargs)
                except exception_type as e:
                    if callable(exception_handler):
                        exception_handler(e)
                    count += 1
                    if count > retries:
                        raise e
                    else:
                        backoff_time = next(backoff_gen)
                        logging.info(f"Retry {count} after {backoff_time} seconds")
                        time.sleep(backoff_time)

        return wrapper

    return decorator


def list_objects(bucket_name, prefix):
    res = s3.list_objects_v2(
        Bucket=bucket_name,
        Prefix=prefix,
    )

    for each in res.get("Contents", []):
        yield each

    while "NextContinuationToken" in res:
        res = s3.list_objects_v2(
            Bucket=bucket_name,
            Prefix=prefix,
            ContinuationToken=res["NextContinuationToken"],
        )

        for each in res.get("Contents", []):
            yield each


def limit_iter(iterable, limit=10):
    for index, each in enumerate(iterable):
        if index < limit:
            yield each
        else:
            break


def batch_iter(iterable, batch_size=10):
    iterator = iter(iterable)
    while b := list(islice(iterator, batch_size)):
        SENT_BATCH_COUNTER.increment()
        yield b


@retry_with_backoff(ClientError, retries=5)
def send_message_batch(iterable):
    res = events.put_events(Entries=list(iterable))
    if res.get("FailedEntryCount", 0) > 0:
        for failed in res["Entries"]:
            FAILED_COUNTER.increment()
            logging.error(
                f"Failed to send message: {failed['ErrorMessage']}, error code: {failed['ErrorCode']}"
            )


def send_message_batch_dry_run(iterable):
    for each in iterable:
        logging.info("Dry run sending messages: %s", each)


def convert_to_s3_event_iter(iterable):
    for each in iterable:
        now = datetime.datetime.now()
        yield {
            "Time": now,
            "Source": "clo.aws.s3",
            "Resources": [f"arn:{AWS_PARTITION}:s3:::{BUCKET_NAME}"],
            "DetailType": "Object Created",
            "Detail": json.dumps(
                {
                    "client": "clo-s3-list-objects",
                    "bucket": {"name": BUCKET_NAME},
                    "object": {
                        "key": each["Key"],
                        "size": each["Size"],
                    },
                    "reason": "PutObject",
                }
            ),
        }


def counter_iter(iterable):
    for each in iterable:
        SCAN_COUNTER.increment()
        yield each


def log_stats():
    logging.info(
        "Statistics: scanned %d, scanning speed %0.1f/sec, sent batch %d, failed %d",
        SCAN_COUNTER.value,
        (SCAN_COUNTER.value - LAST_SCAN_COUNTER.value) / LOG_STATS_INTERVAL,
        SENT_BATCH_COUNTER.value,
        FAILED_COUNTER.value,
    )
    LAST_SCAN_COUNTER.set_value(SCAN_COUNTER.value)


if __name__ == "__main__":
    logging.info(
        'Scanning bucket name: "%s", key prefix: "%s", key suffix: "%s"',
        BUCKET_NAME,
        KEY_PREFIX,
        KEY_SUFFIX,
    )

    t = Ticker(LOG_STATS_INTERVAL, log_stats)
    t.start()

    it = list_objects(BUCKET_NAME, KEY_PREFIX)
    it = filter(lambda each: each["Key"].endswith(KEY_SUFFIX), it)
    it = convert_to_s3_event_iter(it)
    it = counter_iter(it)

    try:
        for batch in batch_iter(it, batch_size=BATCH_SIZE):
            if DRY_RUN:
                send_message_batch_dry_run(batch)
            else:
                send_message_batch(batch)
    finally:
        t.stop()
        t.join(30)

        logging.info("Finished.")
