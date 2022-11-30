from moto import mock_sts
import os


@mock_sts
def test_get_client():
    os.environ[
        "LOG_SOURCE_ACCOUNT_ASSUME_ROLE"
    ] = "arn:aws:iam::123456789012:role/test-role"
    from boto3_client import get_client

    assert get_client("s3", False)
    assert get_client("s3", True)

    os.environ.pop("LOG_SOURCE_ACCOUNT_ASSUME_ROLE")


@mock_sts
def test_get_resource():
    os.environ[
        "LOG_SOURCE_ACCOUNT_ASSUME_ROLE"
    ] = "arn:aws:iam::123456789012:role/test-role"
    from boto3_client import get_resource

    assert get_resource("s3", False)
    assert get_resource("s3", True)

    os.environ.pop("LOG_SOURCE_ACCOUNT_ASSUME_ROLE")
