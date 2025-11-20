# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import io
import os
import sys
import uuid
import gzip
import shutil
import pytest
from pathlib import Path
from test.mock import (
    mock_sts_context,
    mock_iam_context,
    mock_sqs_context,
    mock_ddb_context,
    mock_s3_context,
    default_environment_variables,
)


sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


def test_parser_bytes():
    from utils import parse_bytes

    with pytest.raises(ValueError):
        parse_bytes("test")
    assert parse_bytes("10B") == 10
    assert parse_bytes("10kB") == 10000
    assert parse_bytes("10MB") == 10000000
    assert parse_bytes("10GB") == 10000000000
    assert parse_bytes("10TB") == 10000000000000
    assert parse_bytes("10PB") == 10000000000000000
    assert parse_bytes("10kiB") == 10240
    assert parse_bytes("10MiB") == 10485760
    assert parse_bytes("10GiB") == 10737418240
    assert parse_bytes("10TiB") == 10995116277760
    assert parse_bytes("10PiB") == 11258999068426240
    assert parse_bytes(10000) == 10000
    assert parse_bytes("10000") == 10000
    assert parse_bytes(10000.001) == 10000
    assert parse_bytes("10 B") == 10
    assert parse_bytes("10 kB") == 10000
    assert parse_bytes("10 MB") == 10000000
    assert parse_bytes("10 GB") == 10000000000
    assert parse_bytes("10 TB") == 10000000000000
    assert parse_bytes("10 PB") == 10000000000000000
    assert parse_bytes("10 kiB") == 10240
    assert parse_bytes("10 MiB") == 10485760
    assert parse_bytes("10 GiB") == 10737418240
    assert parse_bytes("10 TiB") == 10995116277760
    assert parse_bytes("10 PiB") == 11258999068426240
    with pytest.raises(ValueError):
        assert parse_bytes("f0100")


def test_fleep():
    from utils import fleep

    current_dir = Path(os.path.dirname(os.path.abspath(__file__)))

    supported_extensions = fleep.supported_types()
    supported_types = fleep.supported_types()
    assert "archive" in supported_types
    assert "database" in supported_types
    supported_extensions = fleep.supported_extensions()
    assert "gz" in supported_extensions
    assert "parquet" in supported_extensions
    supported_mimes = fleep.supported_mimes()
    assert "application/gzip" in supported_mimes
    assert "application/parquet" in supported_mimes

    with pytest.raises(TypeError):
        fleep.get("1234567890abcdefg")

    info = fleep.Info("archive", "gz", "application/gzip")
    assert info.type_matches("archive")
    assert info.extension_matches("gz")
    assert info.mime_matches("application/gzip")

    info = fleep.Info("database", "parquet", "application/parquet")
    assert info.type_matches("database")
    assert info.extension_matches("parquet")
    assert info.mime_matches("application/parquet")

    file_path = current_dir / "data/apigateway1.gz"
    with file_path.open("rb") as fd:
        file_info = fleep.get(fd.read(128))
    assert file_info.type[0] == "archive"
    assert file_info.extension[0] == "gz"
    assert file_info.mime[0] == "application/gzip"

    file_path = current_dir / "data/apigateway1.parquet"
    with file_path.open("rb") as fd:
        file_info = fleep.get(fd.read(128))
    assert file_info.type[0] == "database"
    assert file_info.extension[0] == "parquet"
    assert file_info.mime[0] == "application/parquet"


def test_file_reader():
    from utils.helpers import file_reader

    current_path = os.path.dirname(os.path.abspath(__file__))

    assert (
        isinstance(
            file_reader(path=f"{current_path}/data/apigateway1.log"), io.TextIOWrapper
        )
        is True
    )
    assert (
        isinstance(
            file_reader(path=f"{current_path}/data/apigateway1.log", extension="text"),
            io.TextIOWrapper,
        )
        is True
    )
    assert (
        isinstance(
            file_reader(path=f"{current_path}/data/alb.log.gz", extension="gz"),
            io.TextIOWrapper,
        )
        is True
    )


def test_file_writer():
    from utils.helpers import file_writer

    tmp_path = f"/tmp/{str(uuid.uuid4())}"
    os.makedirs(tmp_path)

    assert (
        isinstance(file_writer(path=f"{tmp_path}/alb1.log"), io.TextIOWrapper) is True
    )
    assert (
        isinstance(
            file_writer(path=f"{tmp_path}/alb2.log", extension="text"), io.TextIOWrapper
        )
        is True
    )
    assert (
        isinstance(
            file_writer(path=f"{tmp_path}/alb.log.gz", extension="gz"), io.TextIOWrapper
        )
        is True
    )

    shutil.rmtree(tmp_path)


def test_delete_local_file():
    from utils.helpers import delete_local_file

    not_exists_file_path = f"/tmp/{uuid.uuid4()}"
    delete_local_file(path=Path(not_exists_file_path))
    assert os.path.exists(not_exists_file_path) is False

    exists_file_path = f"/tmp/{uuid.uuid4()}"
    Path(exists_file_path).touch()
    delete_local_file(path=Path(exists_file_path))
    assert os.path.exists(exists_file_path) is False


def test_make_local_work_dir():
    from utils.helpers import make_local_work_dir

    local_work_path = make_local_work_dir()
    assert local_work_path.exists() is True
    assert (local_work_path / "download").exists() is True
    assert (local_work_path / "output").exists() is True
    shutil.rmtree(local_work_path)

    local_work_path = make_local_work_dir(Path("/tmp/test"))
    assert local_work_path.exists() is True
    assert (local_work_path / "download").exists() is True
    assert (local_work_path / "output").exists() is True
    shutil.rmtree(local_work_path)


def test_clean_local_download_dir():
    from utils.helpers import make_local_work_dir, clean_local_download_dir

    local_work_path = make_local_work_dir()
    clean_local_download_dir(local_work_path)
    assert local_work_path.exists() is False


def test_detect_file_extension_by_header():
    from utils.helpers import detect_file_extension_by_header

    current_dir = Path(os.path.dirname(os.path.abspath(__file__)))

    assert (
        detect_file_extension_by_header(current_dir / "data/apigateway1.log") == "text"
    )
    assert detect_file_extension_by_header(current_dir / "data/apigateway1.gz") == "gz"
    assert (
        detect_file_extension_by_header(current_dir / "data/apigateway1.parquet")
        == "parquet"
    )


def test_extension_to_merge_func():
    from utils.filemerge.helpers import extension_to_merge_func
    from utils.aws import S3Client
    from utils.filemerge import merge_parquets, merge_text, merge_gzip

    assert extension_to_merge_func("text") == merge_text
    assert extension_to_merge_func("gz") == merge_gzip
    assert extension_to_merge_func("parquet") == merge_parquets
    with pytest.raises(Exception) as exception_info:
        extension_to_merge_func("zip")
    assert (
        exception_info.value.args[0]
        == "Unsupported file extension, only parquet, gz, text is supported."
    )


def test_enrichment():
    from utils.helpers import enrichment

    def enrich_func(record, enrich_plugins):
        return f"{record}\n"

    current_path = os.path.dirname(os.path.abspath(__file__))
    tmp_path = f"/tmp/{str(uuid.uuid4())}"
    os.makedirs(tmp_path, exist_ok=True)

    input_filename = f"{current_path}/data/not-exists.log.gz"
    output_filename = f"{tmp_path}/not-exists.log.gz"
    assert (
        enrichment(
            input_file_path=Path(input_filename),
            output_file_path=Path(output_filename),
            enrich_func=enrich_func,
            enrich_plugins=set(),
        ).as_posix()
        == input_filename
    )

    input_filename = f"{current_path}/data/apigateway1.parquet"
    output_filename = f"{tmp_path}/apigateway1.parquet"
    assert (
        enrichment(
            input_file_path=Path(input_filename),
            output_file_path=Path(output_filename),
            enrich_func=enrich_func,
            enrich_plugins=set(),
        ).as_posix()
        == input_filename
    )

    input_filename = f"{tmp_path}/no-data-src.log"
    output_filename = f"{tmp_path}/no-data-dst.log"
    Path(input_filename).touch()
    assert (
        enrichment(
            input_file_path=Path(input_filename),
            output_file_path=Path(output_filename),
            enrich_func=enrich_func,
            enrich_plugins=set(),
        ).as_posix()
        == input_filename
    )

    input_filename = f"{current_path}/data/alb.log.gz"
    output_filename = f"{tmp_path}/alb.log.gz"

    enrichment(
        input_file_path=Path(input_filename),
        output_file_path=Path(output_filename),
        enrich_func=enrich_func,
        enrich_plugins=set(),
    )

    with gzip.open(output_filename, "rt") as reader:
        assert (
            next(reader)
            == 'https 2023-07-04T13:28:28.138531Z app/ALB/nwpiqzrqc67zsbwq 185.249.140.9:1231 10.2.2.174:443 1.5414835421835185 1.8228018060637856 1.1708408317685808 200 200 1525 59997 "GET http://alb.us-east-1.elb.amazonaws.com/Book-10.png HTTP/1.1" "Mozilla/5.0 (Macintosh; PPC Mac OS X 10_9_4) AppleWebKit/536.2 (KHTML, like Gecko) Chrome/35.0.847.0 Safari/536.2" TLS_AES_128_GCM_SHA256 TLSv1.2 arn:aws:elasticloadbalancing:us-east-1:123456789012:targetgroup/app/e240e6889123qdqw "Root=1-5034982-7f2d2ae7a15148ff825e84b9f59a0c68" "alb.us-east-1.elb.amazonaws.com" "session-reused" 0 2023-07-04T13:28:28.138531Z "forward" "-" "-" "10.2.2.176:443" "200" "-" "-"\n'
        )
        assert next(reader) == "\n"
        assert (
            next(reader)
            == 'https 2023-07-04T13:28:26.138531Z app/ALB/6cv0xw490oh8nq7n 185.176.232.11:15364 10.2.2.175:443 1.9537748743523755 1.9607717664807693 1.3631916131229302 200 200 1521 50675 "GET https://alb.us-east-1.elb.amazonaws.com/Javascript-Master.png HTTP/2.0" "Mozilla/5.0 (iPod; U; CPU iPhone OS 3_0 like Mac OS X; yi-US) AppleWebKit/531.9.3 (KHTML, like Gecko) Version/3.0.5 Mobile/8B117 Safari/6531.9.3" TLS_CHACHA20_POLY1305_SHA256 TLSv1.2 arn:aws:elasticloadbalancing:us-east-1:123456789012:targetgroup/gateway/06409f87b3bad113 "Root=1-8187477-b5b5cdfa33534d589247a5c61de9fe0e" "alb.us-east-1.elb.amazonaws.com" "session-reused" 0 2023-07-04T13:28:26.138531Z "forward" "-" "-" "10.2.2.174:80" "200" "-" "-"\n'
        )

    input_filename = f"{current_path}/data/alb.log.gz"
    text_input_filename = f"{tmp_path}/alb.log"
    text_output_filename = f"{tmp_path}/alb-enrichment.log"

    with open(text_input_filename, "w") as writer:
        with gzip.open(input_filename, "rt") as reader:
            writer.write("".join(reader.readlines()))

    enrichment(
        input_file_path=Path(text_input_filename),
        output_file_path=Path(text_output_filename),
        enrich_func=enrich_func,
    )

    with open(text_output_filename, "r") as reader:
        assert (
            next(reader)
            == 'https 2023-07-04T13:28:28.138531Z app/ALB/nwpiqzrqc67zsbwq 185.249.140.9:1231 10.2.2.174:443 1.5414835421835185 1.8228018060637856 1.1708408317685808 200 200 1525 59997 "GET http://alb.us-east-1.elb.amazonaws.com/Book-10.png HTTP/1.1" "Mozilla/5.0 (Macintosh; PPC Mac OS X 10_9_4) AppleWebKit/536.2 (KHTML, like Gecko) Chrome/35.0.847.0 Safari/536.2" TLS_AES_128_GCM_SHA256 TLSv1.2 arn:aws:elasticloadbalancing:us-east-1:123456789012:targetgroup/app/e240e6889123qdqw "Root=1-5034982-7f2d2ae7a15148ff825e84b9f59a0c68" "alb.us-east-1.elb.amazonaws.com" "session-reused" 0 2023-07-04T13:28:28.138531Z "forward" "-" "-" "10.2.2.176:443" "200" "-" "-"\n'
        )
        assert next(reader) == "\n"
        assert (
            next(reader)
            == 'https 2023-07-04T13:28:26.138531Z app/ALB/6cv0xw490oh8nq7n 185.176.232.11:15364 10.2.2.175:443 1.9537748743523755 1.9607717664807693 1.3631916131229302 200 200 1521 50675 "GET https://alb.us-east-1.elb.amazonaws.com/Javascript-Master.png HTTP/2.0" "Mozilla/5.0 (iPod; U; CPU iPhone OS 3_0 like Mac OS X; yi-US) AppleWebKit/531.9.3 (KHTML, like Gecko) Version/3.0.5 Mobile/8B117 Safari/6531.9.3" TLS_CHACHA20_POLY1305_SHA256 TLSv1.2 arn:aws:elasticloadbalancing:us-east-1:123456789012:targetgroup/gateway/06409f87b3bad113 "Root=1-8187477-b5b5cdfa33534d589247a5c61de9fe0e" "alb.us-east-1.elb.amazonaws.com" "session-reused" 0 2023-07-04T13:28:26.138531Z "forward" "-" "-" "10.2.2.174:80" "200" "-" "-"\n'
        )

    shutil.rmtree(tmp_path)


class TestAWSConnection:

    def test_get_client(
        self,
        mock_iam_context,
        mock_sqs_context,
        mock_ddb_context,
        mock_s3_context,
        mock_sts_context,
    ):
        from utils.helpers import AWSConnection

        region = os.environ["AWS_REGION"]
        staging_bucket = os.environ["STAGING_BUCKET_NAME"]
        s3_object_replication_role_arn = os.environ["S3_OBJECTS_REPLICATION_ROLE_ARN"]

        conn = AWSConnection()

        # should be able to use the get_client same as boto3.client()
        s3 = conn.get_client("s3")
        response = s3.list_buckets()

        buckets = response["Buckets"]
        assert len(buckets) == 3

        # should be able to use the get_client same as boto3.resource()
        s3_resource = conn.get_client("s3", client_type="resource")
        bucket = s3_resource.Bucket(staging_bucket)
        assert bucket.creation_date

        # should be able to use the get_client same as boto3.resource()
        s3_resource = conn.get_client("s3", region_name=region, client_type="resource")
        bucket = s3_resource.Bucket(staging_bucket)
        assert bucket.creation_date

        s3_resource = conn.get_client(
            "s3",
            region_name=region,
            sts_role_arn=s3_object_replication_role_arn,
            client_type="resource",
        )
        bucket = s3_resource.Bucket(staging_bucket)
        assert bucket.creation_date

    def test_get_partition_from_region(
        self, mock_iam_context, mock_sqs_context, mock_ddb_context, mock_s3_context
    ):
        from utils.helpers import AWSConnection

        region = os.environ["AWS_REGION"]
        conn = AWSConnection()

        response = conn.get_partition_from_region(region_name=region)
        assert response == "aws"

        response = conn.get_partition_from_region(region_name="cn-north-1")
        assert response == "aws-cn"

    def test_get_available_services(
        self, mock_iam_context, mock_sqs_context, mock_ddb_context, mock_s3_context
    ):
        from utils.helpers import AWSConnection

        conn = AWSConnection()

        response = conn.get_available_services()
        assert len(response) > 0


def test_sqs_events_parser(mock_sqs_context):
    from utils.helpers import sqs_events_parser

    aws_region = os.environ["AWS_REGION"]
    s3_replication_sqs_arn = os.environ["REPLICATION_SQS_ARN"]

    events = {
        "Records": [
            {
                "messageId": "00000000-0000-0000-0000-000000000000",
                "receiptHandle": "AQEBmsBcK",
                "body": '{"Records":[{"eventVersion":"2.1","eventSource":"aws:s3","awsRegion":"us-east-1","eventTime":"2021-07-18T01:50:10.495Z","eventName":"ObjectCreated:Put","userIdentity":{"principalId":"AWS:123456789012"},"s3":{"s3SchemaVersion":"1.0","configurationId":"fdaec0a9-2f11-4fab-aee8-298179ce1c3b","bucket":{"name":"amzn-s3-demo-bucket1","ownerIdentity":{"principalId":"A3ADQQCISURLUH"},"arn":"arn:aws:s3:::amzn-s3-demo-bucket1"},"object":{"key":"AWSLogs/123456789012/alb/alb.log.gz"}}}]}',
                "eventSource": "aws:sqs",
                "eventSourceARN": s3_replication_sqs_arn,
                "awsRegion": aws_region,
            },
            {
                "messageId": "00000000-0000-0000-0000-000000000001",
                "receiptHandle": "AQEBRkBP",
                "body": '{"Service":"Amazon S3","Event":"s3:TestEvent","Time":"2021-07-18T02:08:39.023Z","Bucket":"amzn-s3-demo-bucket1"}',
                "eventSource": "aws:sqs",
                "eventSourceARN": s3_replication_sqs_arn,
                "awsRegion": aws_region,
            },
            {
                "eventVersion": "2.1",
                "eventSource": "aws:s3",
                "awsRegion": "us-east-1",
                "eventTime": "2021-07-18T02:09:10.495Z",
                "eventName": "ObjectCreated:Put",
                "s3": {
                    "s3SchemaVersion": "1.0",
                    "bucket": {
                        "name": "amzn-s3-demo-bucket1",
                        "arn": "arn:aws:s3:::amzn-s3-demo-bucket1",
                    },
                    "object": {"key": "AWSLogs/123456789012/alb/alb-1.log.gz"},
                },
            },
            {
                "eventVersion": "2.1",
                "eventSource": "aws:s3",
                "awsRegion": "us-east-1",
                "eventTime": "2021-07-18T02:09:10.495Z",
                "eventName": "s3:ObjectRemoved:Delete",
                "s3": {
                    "s3SchemaVersion": "1.0",
                    "bucket": {
                        "name": "amzn-s3-demo-bucket1",
                        "arn": "arn:aws:s3:::amzn-s3-demo-bucket1",
                    },
                    "object": {"key": "AWSLogs/123456789012/alb/alb-deleted.log.gz"},
                },
            },
            {
                "eventVersion": "2.1",
                "eventSource": "aws:s3",
                "awsRegion": "us-east-1",
                "eventTime": "2021-07-18T02:09:15.495Z",
                "s3": {
                    "s3SchemaVersion": "1.0",
                    "bucket": {
                        "name": "amzn-s3-demo-bucket1",
                        "arn": "arn:aws:s3:::amzn-s3-demo-bucket1",
                    },
                    "object": {
                        "key": "AWSLogs/123456789012/alb/alb-event-name-is-none.log.gz"
                    },
                },
            },
            {
                "eventVersion": "2.1",
                "eventSource": "aws:s3",
                "awsRegion": "us-east-1",
                "eventTime": "2021-07-18T02:09:10.495Z",
                "eventName": "ObjectCreated:Put",
            },
        ]
    }

    assert sqs_events_parser(events) == [
        {"bucket": "amzn-s3-demo-bucket1", "key": "AWSLogs/123456789012/alb/alb.log.gz"},
        {"bucket": "amzn-s3-demo-bucket1", "key": "AWSLogs/123456789012/alb/alb-1.log.gz"},
    ]


def test_event_bridge_event_parser(mock_sqs_context):
    from utils.helpers import event_bridge_event_parser

    aws_region = os.environ["AWS_REGION"]
    account_id = os.environ["ACCOUNT_ID"]

    event = {
        "version": "0",
        "id": "90a4ac95-dcf0-b2a1-e81a-2c0431b582d1",
        "detail-type": "Object Created",
        "source": "aws.s3",
        "account": account_id,
        "time": "2024-07-26T07:32:19Z",
        "region": aws_region,
        "resources": ["arn:aws:s3:::amzn-s3-demo-bucket1"],
        "detail": {
            "version": "0",
            "bucket": {"name": "amzn-s3-demo-bucket1"},
            "object": {
                "key": "AWSLogs/123456789012/alb/alb-1.log.gz",
                "size": 87447,
            },
        },
    }
    assert event_bridge_event_parser(event=event) == [
        {
            "bucket": "amzn-s3-demo-bucket1",
            "key": "AWSLogs/123456789012/alb/alb-1.log.gz",
        }
    ]


def test_events_parser(mock_sqs_context):
    from utils.helpers import events_parser

    aws_region = os.environ["AWS_REGION"]
    account_id = os.environ["ACCOUNT_ID"]
    s3_replication_sqs_arn = os.environ["REPLICATION_SQS_ARN"]

    events = {
        "Records": [
            {
                "messageId": "00000000-0000-0000-0000-000000000000",
                "receiptHandle": "AQEBmsBcK",
                "body": '{"Records":[{"eventVersion":"2.1","eventSource":"aws:s3","awsRegion":"us-east-1","eventTime":"2021-07-18T01:50:10.495Z","eventName":"ObjectCreated:Put","userIdentity":{"principalId":"AWS:123456789012"},"s3":{"s3SchemaVersion":"1.0","configurationId":"fdaec0a9-2f11-4fab-aee8-298179ce1c3b","bucket":{"name":"amzn-s3-demo-bucket1","ownerIdentity":{"principalId":"A3ADQQCISURLUH"},"arn":"arn:aws:s3:::amzn-s3-demo-bucket1"},"object":{"key":"AWSLogs/123456789012/alb/alb.log.gz"}}}]}',
                "eventSource": "aws:sqs",
                "eventSourceARN": s3_replication_sqs_arn,
                "awsRegion": aws_region,
            }
        ]
    }

    assert events_parser(events) == [
        {
            "bucket": "amzn-s3-demo-bucket1",
            "key": "AWSLogs/123456789012/alb/alb.log.gz",
        }
    ]

    event = {
        "version": "0",
        "id": "90a4ac95-dcf0-b2a1-e81a-2c0431b582d1",
        "detail-type": "Object Created",
        "source": "aws.s3",
        "account": account_id,
        "time": "2024-07-26T07:32:19Z",
        "region": aws_region,
        "resources": ["arn:aws:s3:::amzn-s3-demo-bucket1"],
        "detail": {
            "version": "0",
            "bucket": {"name": "amzn-s3-demo-bucket1"},
            "object": {
                "key": "AWSLogs/123456789012/alb/alb-1.log.gz",
                "size": 87447,
            },
        },
    }
    assert events_parser(event=event) == [
        {
            "bucket": "amzn-s3-demo-bucket1",
            "key": "AWSLogs/123456789012/alb/alb-1.log.gz",
        }
    ]
