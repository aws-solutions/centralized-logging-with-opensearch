# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import json
import pytest

import os
import boto3
from moto import mock_sts
from commonlib.model import LogConfig


@pytest.fixture
def create_event():
    with open("./test/event/test_event.json", "r") as f:
        event = json.load(f)
        # please replace event["arguments"]
        event["arguments"] = {
            "name": "spring-boot-conf-1",
            "logType": "JSON",
            "syslogParser": "RFC5424",
            "multilineLogParser": "JAVA_SPRING_BOOT",
            "filterConfigMap": {"enabled": False, "filters": []},
            "regex": "(?<time>\\d{4}-\\d{2}-\\d{2} \\d{2}:\\d{2}:\\d{2}.\\d{3}) (?<level>\\s*[\\S]+\\s*) \\[(?<thread>\\S+)?\\] (?<logger>.+) : (?<message>[\\s\\S]+)",
            "regexFieldSpecs": [
                {
                    "format": "%Y-%m-%d %H:%M:%S.%L",
                    "key": "time",
                    "type": "date",
                },
                {"key": "level", "type": "keyword"},
                {"key": "thread", "type": "text"},
                {"key": "logger", "type": "text"},
                {"key": "message", "type": "text"},
            ],
            "timeKey": "time",
            "timeOffset": "-0600",
            "timeKeyRegex": "\\d{4}-\\d{2}-\\d{2} \\d{2}:\\d{2}:\\d{2}.\\d{3}",
            "userLogFormat": "%d{yyyy-MM-dd HH:mm:ss.SSS} %-5level [%thread] %logger : %msg%n",
            "userSampleLog": "2022-02-18 10:32:26.400 ERROR [http-nio-8080-exec-1] org.apache.catalina.core.ContainerBase.[Tomcat].[localhost].[/].[dispatcherServlet] : Servlet.service() for servlet [dispatcherServlet] in context with path [] threw exception [Request processing failed; nested exception is java.lang.ArithmeticException: / by zero] with root cause\njava.lang.ArithmeticException: / by zero\n   at com.springexamples.demo.web.LoggerController.logs(LoggerController.java:22)\n   at java.base/jdk.internal.reflect.NativeMethodAccessorImpl.invoke0(Native Method)\n   at java.base/jdk.internal.reflect.NativeMethodAccessorImpl.invoke",
            "status": "ACTIVE",
        }
        event["info"]["fieldName"] = "createLogConfig"

        print(event)
        return event


@pytest.fixture
def list_event():
    with open("./test/event/test_event.json", "r") as f:
        event = json.load(f)
        event["arguments"] = {"page": 1, "count": 30}
        event["info"]["fieldName"] = "listLogConfigs"
        print(event)
        return event


@pytest.fixture
def delete_event():
    with open("./test/event/test_event.json", "r") as f:
        event = json.load(f)
        event["arguments"] = {"id": "12345678"}
        event["info"]["fieldName"] = "deleteLogConfig"
        print(event)
        return event


@pytest.fixture
def get_event():
    with open("./test/event/test_event.json", "r") as f:
        event = json.load(f)
        event["arguments"] = {"id": "12345678"}
        event["info"]["fieldName"] = "getLogConfig"
        print(event)
        return event


@pytest.fixture
def update_event():
    with open("./test/event/test_event.json", "r") as f:
        event = json.load(f)
        event["arguments"] = {
            "id": "12345678",
            "version": 2,
            "name": "spring-boot-conf-1",
            "logType": "JSON",
            "syslogParser": "RFC5424",
            "multilineLogParser": "JAVA_SPRING_BOOT",
            "filterConfigMap": {"enabled": False, "filters": []},
            "regex": "(?<time>\\d{4}-\\d{2}-\\d{2} \\d{2}:\\d{2}:\\d{2}.\\d{3}) (?<level>\\s*[\\S]+\\s*) \\[(?<thread>\\S+)?\\] (?<logger>.+) : (?<message>[\\s\\S]+)",
            "regexFieldSpecs": [
                {
                    "format": "%Y-%m-%d %H:%M:%S.%L",
                    "key": "time",
                    "type": "date",
                },
                {"key": "level", "type": "keyword"},
                {"key": "thread", "type": "text"},
                {"key": "logger", "type": "text"},
                {"key": "message", "type": "text"},
            ],
            "timeKey": "time",
            "timeOffset": "-0600",
            "timeKeyRegex": "\\d{4}-\\d{2}-\\d{2} \\d{2}:\\d{2}:\\d{2}.\\d{3}",
            "userLogFormat": "%d{yyyy-MM-dd HH:mm:ss.SSS} %-5level [%thread] %logger : %msg%n",
            "userSampleLog": "2022-02-18 10:32:26.400 ERROR [http-nio-8080-exec-1] org.apache.catalina.core.ContainerBase.[Tomcat].[localhost].[/].[dispatcherServlet] : Servlet.service() for servlet [dispatcherServlet] in context with path [] threw exception [Request processing failed; nested exception is java.lang.ArithmeticException: / by zero] with root cause\njava.lang.ArithmeticException: / by zero\n   at com.springexamples.demo.web.LoggerController.logs(LoggerController.java:22)\n   at java.base/jdk.internal.reflect.NativeMethodAccessorImpl.invoke0(Native Method)\n   at java.base/jdk.internal.reflect.NativeMethodAccessorImpl.invoke",
            "status": "ACTIVE",
        }
        event["info"]["fieldName"] = "updateLogConfig"
        print(event)
        return event


@pytest.fixture
def sts_client():
    with mock_sts():
        boto3.client("sts", region_name=os.environ.get("AWS_REGION"))
        yield


def test_lambda_function(
    sts_client,
    create_event,
    list_event,
    delete_event,
    update_event,
    get_event,
    mocker,
):
    mocker.patch("commonlib.dao.LogConfigDao")
    import lambda_function

    # start with empty list
    mock_value = list()
    mocker.patch("lambda_function.dao.list_log_configs", return_value=mock_value)
    result = lambda_function.lambda_handler(list_event, None)
    assert result["total"] == 0

    # create a logConfig
    mocker.patch("lambda_function.dao.save", return_value="12345678")
    id = lambda_function.lambda_handler(create_event, None)
    # Expect Execute successfully.
    assert id == "12345678"

    # update a logConfig
    mock_value = update_event["arguments"]
    mocker.patch("lambda_function.dao.save", return_value=mock_value)
    result = lambda_function.lambda_handler(update_event, None)
    assert id == "12345678"

    # delete a logConfig
    mocker.patch("lambda_function.dao.delete_log_config", return_value=None)
    result = lambda_function.lambda_handler(delete_event, None)
    assert result == "OK"

    # get a logConfig.
    mocker.patch(
        "lambda_function.dao.get_log_config",
        return_value=LogConfig(**update_event["arguments"]),
    )
    result = lambda_function.lambda_handler(get_event, None)
    assert result["version"] == 2

    args = {"timeStr": "5/Apr/2022:06:28:03 +0000", "formatStr": "%d/%b/%Y:%H:%M:%S %z"}
    result = lambda_function.check_time_format(**args)
    assert result["isMatch"]

    args = {"timeStr": "5/Apr/2022:06:28:03 +0000", "formatStr": "%d/%b/%Y:%H:%M:%S"}
    result = lambda_function.check_time_format(**args)
    assert not result["isMatch"]
