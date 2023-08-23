# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0


import pytest

from commonlib import retry, AppSyncRouter, handle_error, singleton
from commonlib.exception import APIException, ErrorCode


def test_retry(mocker):
    @retry(retries=2, delays=1, backoff=2)
    def my_function():
        raise ValueError("Something went wrong")

    mocker.patch("time.sleep")
    with pytest.raises(ValueError, match="Something went wrong"):
        my_function()


class TestAppSyncRouter:
    def setup(self):
        self._router = AppSyncRouter()

        @self._router.route(field_name="add")
        def _add(a, b):
            return a + b

        @self._router.route(field_name="multiply")
        def _multiply(a, b):
            return a * b

    def tearDown(self):
        pass

    def test_add(self):
        event = {
            "info": {
                "fieldName": "add",
            },
            "arguments": {
                "a": 2,
                "b": 3,
            },
        }
        assert self._router.resolve(event) == 5

    def test_multiply(self):
        event = {
            "info": {
                "fieldName": "multiply",
            },
            "arguments": {
                "a": 2,
                "b": 3,
            },
        }
        assert self._router.resolve(event) == 6

    def test_unknown_action(self):
        event = {
            "info": {
                "fieldName": "subtract",
            },
            "arguments": {
                "a": 2,
                "b": 3,
            },
        }
        with pytest.raises(APIException) as excinfo:
            self._router.resolve(event)
        e = excinfo.value
        assert e.type == "UNSUPPORTED_ACTION"

    def test_unknown_event(self):
        event = {"hello": "world"}
        with pytest.raises(APIException) as excinfo:
            self._router.resolve(event)
        e = excinfo.value
        assert e.type == "UNKNOWN_ERROR"


def test_handle_error():
    @handle_error
    def func1():
        raise APIException(ErrorCode.UNKNOWN_ERROR)

    @handle_error
    def func2():
        raise RuntimeError("Unknown Error")

    with pytest.raises(APIException):
        func1()

    with pytest.raises(RuntimeError):
        func2()


@singleton
class MyClass:
    pass


def test_singleton_instance():
    s1 = MyClass()
    s2 = MyClass()
    assert s1 is s2
