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
                "invokeIdentityArn": "arn:aws:iam::123456:role/Solution-AppPipe-42fb0-LogProcessorLogProcessorFnSer-12R3WZ9O7QDWC",
                "awsRegion": "ap-northeast-1",
                "eventSourceARN": "arn:aws:kinesis:ap-northeast-1:123456:stream/Solution-AppPipe-42fb0-Stream790BDEE4-ByiPt1XoNpow",
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

    mocker.patch("commonlib.opensearch.OpenSearchUtil.exist_index_template", return_value=True)
    mocker.patch("commonlib.opensearch.OpenSearchUtil.bulk_load", return_value=LOAD_SUCCESS_RESP)

    lambda_function.lambda_handler(kds_event, None)

    os.environ.pop("SOURCE")


@mock_s3
def test_lambda_handler_kds_failed(mocker, kds_event):
    os.environ["SOURCE"] = "KDS"
    bucket_name = os.environ.get("BACKUP_BUCKET_NAME")
    s3 = boto3.resource("s3", region_name="us-east-1")
    s3.create_bucket(Bucket=bucket_name)

    import lambda_function

    mocker.patch("commonlib.opensearch.OpenSearchUtil.exist_index_template", return_value=True)
    mocker.patch("commonlib.opensearch.OpenSearchUtil.bulk_load", return_value=LOAD_FAILED_RESP)

    lambda_function.lambda_handler(kds_event, None)


def test_lambda_handler_kds_cloudfront():
    event = {
        "Records": [
            {
                "kinesis": {
                    "kinesisSchemaVersion": "1.0",
                    "partitionKey": "8bc2091b-cbed-43f4-9a01-d20a7854d38c",
                    "sequenceNumber": "49635675801952128003396914033285311334825079587865624578",
                    "data": "MTY3MTAwNTM1MS4xNDgJMjcuMC4zLjE1NgkwLjAwMQkyMDAJMjIxMglHRVQJaHR0cHMJZDJvbXN2bnJ4Mnl1NGkuY2xvdWRmcm9udC5uZXQJL2xvY2FsZXMvZW4vY29tbW9uLmpzb24/dj12MS4yLjAJNTAJTlJUNTctQzEJY0dYOUp4N0tGWDdVd1k4S3dSRlM1RnZGcmRVSkJwU0JxTWdhSFdpM3l1SEo3bWJscmh6VDVBPT0JZDJvbXN2bnJ4Mnl1NGkuY2xvdWRmcm9udC5uZXQJMC4wMDEJSFRUUC8yLjAJSVB2NAlNb3ppbGxhLzUuMCUyMChNYWNpbnRvc2g7JTIwSW50ZWwlMjBNYWMlMjBPUyUyMFglMjAxMF8xNV83KSUyMEFwcGxlV2ViS2l0LzUzNy4zNiUyMChLSFRNTCwlMjBsaWtlJTIwR2Vja28pJTIwQ2hyb21lLzEwOC4wLjAuMCUyMFNhZmFyaS81MzcuMzYJLQktCXY9djEuMi4wCUhpdAktCVRMU3YxLjMJVExTX0FFU18xMjhfR0NNX1NIQTI1NglIaXQJLQktCWFwcGxpY2F0aW9uL2pzb24JLQktCS0JMTc5MjkJSGl0CUpQCWd6aXAsJTIwZGVmbGF0ZSwlMjBicgkqLyoJKglob3N0OmQyb21zdm5yeDJ5dTRpLmNsb3VkZnJvbnQubmV0JTBBcHJhZ21hOm5vLWNhY2hlJTBBY2FjaGUtY29udHJvbDpuby1jYWNoZSUwQXNlYy1jaC11YTolMjJOb3Q/QV9CcmFuZCUyMjt2PSUyMjglMjIsJTIwJTIyQ2hyb21pdW0lMjI7dj0lMjIxMDglMjIsJTIwJTIyR29vZ2xlJTIwQ2hyb21lJTIyO3Y9JTIyMTA4JTIyJTBBc2VjLWNoLXVhLW1vYmlsZTo/MCUwQXVzZXItYWdlbnQ6TW96aWxsYS81LjAlMjAoTWFjaW50b3NoOyUyMEludGVsJTIwTWFjJTIwT1MlMjBYJTIwMTBfMTVfNyklMjBBcHBsZVdlYktpdC81MzcuMzYlMjAoS0hUTUwsJTIwbGlrZSUyMEdlY2tvKSUyMENocm9tZS8xMDguMC4wLjAlMjBTYWZhcmkvNTM3LjM2JTBBc2VjLWNoLXVhLXBsYXRmb3JtOiUyMm1hY09TJTIyJTBBYWNjZXB0OiovKiUwQXNlYy1mZXRjaC1zaXRlOnNhbWUtb3JpZ2luJTBBc2VjLWZldGNoLW1vZGU6Y29ycyUwQXNlYy1mZXRjaC1kZXN0OmVtcHR5JTBBYWNjZXB0LWVuY29kaW5nOmd6aXAsJTIwZGVmbGF0ZSwlMjBiciUwQWFjY2VwdC1sYW5ndWFnZTplbix6aC1DTjtxPTAuOSx6aDtxPTAuOCUwQQlob3N0JTBBcHJhZ21hJTBBY2FjaGUtY29udHJvbCUwQXNlYy1jaC11YSUwQXNlYy1jaC11YS1tb2JpbGUlMEF1c2VyLWFnZW50JTBBc2VjLWNoLXVhLXBsYXRmb3JtJTBBYWNjZXB0JTBBc2VjLWZldGNoLXNpdGUlMEFzZWMtZmV0Y2gtbW9kZSUwQXNlYy1mZXRjaC1kZXN0JTBBYWNjZXB0LWVuY29kaW5nJTBBYWNjZXB0LWxhbmd1YWdlJTBBCTEzCUUzMlFKUTM5NEJXQkVJCWQyb21zdm5yeDJ5dTRpLmNsb3VkZnJvbnQubmV0CS0JLQkxNjUwOQo=",
                    "approximateArrivalTimestamp": 1671005356.48,
                },
                "eventSource": "aws:kinesis",
                "eventVersion": "1.0",
                "eventID": "shardId-000000000000:49635675801952128003396914033285311334825079587865624578",
                "eventName": "aws:kinesis:record",
                "invokeIdentityArn": "arn:aws:iam::0000000000:role/service-role/KinesisTester-role-2gt0xp91",
                "awsRegion": "us-east-2",
                "eventSourceARN": "arn:aws:kinesis:us-east-2:0000000000:stream/Solution-AppPipe-43ed3-KDSBufferStream21B531A6-h4zaMOJOBl51",
            }
        ]
    }

    from lambda_function import process_kds_event, parse_sinle_tsv_line

    assert process_kds_event(event, parse_func=parse_sinle_tsv_line) == [
        {
            "timestamp": "1671005351.148",
            "c-ip": "27.0.3.156",
            "time-to-first-byte": "0.001",
            "sc-status": "200",
            "sc-bytes": "2212",
            "cs-method": "GET",
            "cs-protocol": "https",
            "cs-host": "d2omsvnrx2yu4i.cloudfront.net",
            "cs-uri-stem": "/locales/en/common.json?v=v1.2.0",
            "cs-bytes": "50",
            "x-edge-location": "NRT57-C1",
            "x-edge-request-id": "cGX9Jx7KFX7UwY8KwRFS5FvFrdUJBpSBqMgaHWi3yuHJ7mblrhzT5A==",
            "x-host-header": "d2omsvnrx2yu4i.cloudfront.net",
            "time-taken": "0.001",
            "cs-protocol-version": "HTTP/2.0",
            "c-ip-version": "IPv4",
            "cs-user-agent": "Mozilla/5.0%20(Macintosh;%20Intel%20Mac%20OS%20X%2010_15_7)%20AppleWebKit/537.36%20(KHTML,%20like%20Gecko)%20Chrome/108.0.0.0%20Safari/537.36",
            "cs-referer": None,
            "cs-cookie": None,
            "cs-uri-query": "v=v1.2.0",
            "x-edge-response-result-type": "Hit",
            "x-forwarded-for": None,
            "ssl-protocol": "TLSv1.3",
            "ssl-cipher": "TLS_AES_128_GCM_SHA256",
            "x-edge-result-type": "Hit",
            "fle-encrypted-fields": None,
            "fle-status": None,
            "sc-content-type": "application/json",
            "sc-content-len": None,
            "sc-range-start": None,
            "sc-range-end": None,
            "c-port": "17929",
            "x-edge-detailed-result-type": "Hit",
            "c-country": "JP",
            "cs-accept-encoding": "gzip,%20deflate,%20br",
            "cs-accept": "*/*",
            "cache-behavior-path-pattern": "*",
            "cs-headers": "host:d2omsvnrx2yu4i.cloudfront.net%0Apragma:no-cache%0Acache-control:no-cache%0Asec-ch-ua:%22Not?A_Brand%22;v=%228%22,%20%22Chromium%22;v=%22108%22,%20%22Google%20Chrome%22;v=%22108%22%0Asec-ch-ua-mobile:?0%0Auser-agent:Mozilla/5.0%20(Macintosh;%20Intel%20Mac%20OS%20X%2010_15_7)%20AppleWebKit/537.36%20(KHTML,%20like%20Gecko)%20Chrome/108.0.0.0%20Safari/537.36%0Asec-ch-ua-platform:%22macOS%22%0Aaccept:*/*%0Asec-fetch-site:same-origin%0Asec-fetch-mode:cors%0Asec-fetch-dest:empty%0Aaccept-encoding:gzip,%20deflate,%20br%0Aaccept-language:en,zh-CN;q=0.9,zh;q=0.8%0A",
            "cs-header-names": "host%0Apragma%0Acache-control%0Asec-ch-ua%0Asec-ch-ua-mobile%0Auser-agent%0Asec-ch-ua-platform%0Aaccept%0Asec-fetch-site%0Asec-fetch-mode%0Asec-fetch-dest%0Aaccept-encoding%0Aaccept-language%0A",
            "cs-headers-count": "13",
            "primary-distribution-id": "E32QJQ394BWBEI",
            "primary-distribution-dns-name": "d2omsvnrx2yu4i.cloudfront.net",
            "origin-fbl": None,
            "origin-lbl": None,
            "asn": "16509",
        }
    ]
