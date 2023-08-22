# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import pytest
from commonlib.exception import APIException, ErrorCode


def func():
    raise APIException(ErrorCode.ACCOUNT_NOT_FOUND)


def test_exception():
    with pytest.raises(APIException, match="Account is not found") as excinfo:
        func()

    e = excinfo.value
    assert e.message == "Account is not found"
    assert e.type == "ACCOUNT_NOT_FOUND"
    assert str(e) == "[ACCOUNT_NOT_FOUND] Account is not found"
