# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import pytest
from commonlib.exception import APIException, ErrorCode, IssueCode


def func():
    raise APIException(ErrorCode.ACCOUNT_NOT_FOUND)


def test_exception():
    with pytest.raises(APIException, match="Account is not found") as excinfo:
        func()

    e = excinfo.value
    assert e.message == "Account is not found"
    assert e.type == "ACCOUNT_NOT_FOUND"
    assert str(e) == "[ACCOUNT_NOT_FOUND] Account is not found"


def test_issue_code():
    assert IssueCode.YAML_SYNTAX_ERROR.CODE == "YAML_SYNTAX_ERROR"
    assert IssueCode.INVALID_ELEMENT.CODE == "INVALID_ELEMENT"
    assert IssueCode.INVALID_RESOURCE.CODE == "INVALID_RESOURCE"
    assert IssueCode.INVALID_RESOURCE_STATUS.CODE == "INVALID_RESOURCE_STATUS"
    assert IssueCode.INVALID_BUCKET.CODE == "INVALID_BUCKET"
    assert IssueCode.BUCKET_NOTIFICATION_OVERLAP.CODE == "BUCKET_NOTIFICATION_OVERLAP"
    assert IssueCode.INVALID_VALUE.CODE == "INVALID_VALUE"
    assert IssueCode.MISSING_ELEMENT.CODE == "MISSING_ELEMENT"
    assert IssueCode.MISMATCH_DATA_TYPE.CODE == "MISMATCH_DATA_TYPE"
    assert IssueCode.MISSING_VERSION.CODE == "MISSING_VERSION"
    assert IssueCode.INVALID_ENUM.CODE == "INVALID_ENUM"
    assert IssueCode.HTTP_REQUEST_ERROR.CODE == "HTTP_REQUEST_ERROR"
    assert IssueCode.UNSUPPORTED_LOG_SOURCE.CODE == "UNSUPPORTED_LOG_SOURCE"
