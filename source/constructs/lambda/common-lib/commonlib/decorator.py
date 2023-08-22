# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0


import logging
import time
from functools import partial, wraps
from commonlib.exception import APIException, ErrorCode

logger = logging.getLogger(__name__)


def handle_error(func):
    """Decorator for exception handling"""

    @wraps(func)
    def wrapper(*args, **kwargs):
        try:
            return func(*args, **kwargs)
        except APIException as e:
            logger.error(e, exc_info=True)
            raise e
        except Exception as e:
            logger.error(e, exc_info=True)
            raise RuntimeError(
                "Unknown exception, please check Lambda log for more details"
            )

    return wrapper


def retry(func=None, retries=3, delays=5, backoff=2):
    """Retry decorator."""

    if func is None:
        return partial(retry, retries=retries, delays=delays, backoff=backoff)

    @wraps(func)
    def wrapper(*args, **kwargs):
        retry, delay = retries, delays

        while retry > 0:
            try:
                return func(*args, **kwargs)
            except Exception as e:
                logger.error(
                    "Error Occured: %s, Sleep %d seconds and retry...", str(e), delay
                )
                time.sleep(delay)
                retry -= 1
                delay *= backoff

        return func(*args, **kwargs)

    return wrapper


class AppSyncRouter:
    """
    This is to link a function to a AppSync event
    Inspired by Flask

    Usage:

    router = AppSyncRouter()

    @router.route(field_name="getXXX")
    def get_xxx():
        ...


    @router.route(field_name="createXXX")
    def create_xxx():
        ...


    def lambda_handler(event, _):
        return router.resolve(event)

    """

    def __init__(self) -> None:
        self.fields = {}

    def route(self, field_name):
        def wraper(func):
            self.fields[field_name] = func
            return func

        return wraper

    def resolve(self, event):
        # AppSync event
        try:
            field_name = event["info"]["fieldName"]
            args = event["arguments"]
        except KeyError:
            raise APIException(ErrorCode.UNKNOWN_ERROR, "Unknown Event Message")

        if field_name in self.fields.keys():
            return self.fields[field_name](**args)
        else:
            raise APIException(ErrorCode.UNSUPPORTED_ACTION)


def singleton(cls):
    """Singleton decoractor for Classes

    Usage:
    ```
    @singleton
    class MyClass:
        pass
    ```
    """
    instances = {}

    def getinstance(*args, **kwargs):
        if cls not in instances:
            instances[cls] = cls(*args, **kwargs)
        return instances[cls]

    return getinstance
