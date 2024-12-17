# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import sys
import copy
import json
import pytest

import os
import boto3
from moto import mock_sts, mock_dynamodb
from commonlib.model import LogConfig


sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


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
            "version": 1,
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


os.environ["AWS_REGION"] = "us-east-1"
os.environ["LOGCONFIG_TABLE"] = "LogConfig"


@pytest.fixture
def sts_client():
    with mock_sts():
        boto3.client("sts", region_name=os.environ.get("AWS_REGION"))
        yield


@pytest.fixture
def ddb_client():
    with mock_dynamodb():
        dynamodb = boto3.resource("dynamodb", region_name=os.environ.get("AWS_REGION"))

        dynamodb.create_table(  # type: ignore
            TableName=os.environ["LOGCONFIG_TABLE"],
            KeySchema=[{"AttributeName": "id", "KeyType": "HASH"},
                       {"AttributeName": "version", "KeyType": "RANGE"}],
            AttributeDefinitions=[{"AttributeName": "id", "AttributeType": "S"},
                                  {"AttributeName": "version", "AttributeType": "N"}],
            BillingMode='PAY_PER_REQUEST'
        )

        yield


def test_update_log_config(sts_client, ddb_client):
    # update a logConfig
    from lambda_function import update_log_config, create_log_config, get_log_config

    create_event = {
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
            {"key": "archive", "type": "text"},
        ],
        "timeKey": "time",
        "timeOffset": "-0600",
        "timeKeyRegex": "\\d{4}-\\d{2}-\\d{2} \\d{2}:\\d{2}:\\d{2}.\\d{3}",
        "userLogFormat": "%d{yyyy-MM-dd HH:mm:ss.SSS} %-5level [%thread] %logger : %msg%n",
        "userSampleLog": "2022-02-18 10:32:26.400 ERROR [http-nio-8080-exec-1] org.apache.catalina.core.ContainerBase.[Tomcat].[localhost].[/].[dispatcherServlet] : Servlet.service() for servlet [dispatcherServlet] in context with path [] threw exception [Request processing failed; nested exception is java.lang.ArithmeticException: / by zero] with root cause\njava.lang.ArithmeticException: / by zero\n   at com.springexamples.demo.web.LoggerController.logs(LoggerController.java:22)\n   at java.base/jdk.internal.reflect.NativeMethodAccessorImpl.invoke0(Native Method)\n   at java.base/jdk.internal.reflect.NativeMethodAccessorImpl.invoke",
        "status": "ACTIVE",
    }
    log_config_id = create_log_config(**create_event)
    update_event = copy.deepcopy(create_event)
    update_event['id'] = log_config_id
    update_event['version'] = 1
    update_event["regexFieldSpecs"] = [
        {
            "format": "%Y-%m-%d %H:%M:%S.%L",
            "key": "time",
            "type": "date",
        },
        {"key": "level", "type": "integer"},
        # {"key": "thread", "type": "text"},
        {"key": "logger", "type": "text"},
        {"key": "message", "type": "text"},
        {"key": "newField", "type": "text"},
        {"key": "archive", "type": "integer"},
    ]
    update_log_config(**update_event)
    new_log_config = get_log_config(id=log_config_id)
    assert new_log_config['regexFieldSpecs'] == [
        {'key': 'time', 'type': 'date', 'format': '%Y-%m-%d %H:%M:%S.%L'}, 
        {'key': 'level', 'type': 'integer'}, 
        {'key': 'logger', 'type': 'text'}, 
        {'key': 'message', 'type': 'text'}, 
        {'key': 'newField', 'type': 'text'}, 
        {'key': 'archive', 'type': 'integer'}, 
        ]

def test_list_log_config_versions(sts_client, ddb_client):
    from lambda_function import update_log_config, create_log_config, list_log_config_versions

    create_event = {
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
            {"key": "archive", "type": "text"},
        ],
        "timeKey": "time",
        "timeOffset": "-0600",
        "timeKeyRegex": "\\d{4}-\\d{2}-\\d{2} \\d{2}:\\d{2}:\\d{2}.\\d{3}",
        "userLogFormat": "%d{yyyy-MM-dd HH:mm:ss.SSS} %-5level [%thread] %logger : %msg%n",
        "userSampleLog": "2022-02-18 10:32:26.400 ERROR [http-nio-8080-exec-1] org.apache.catalina.core.ContainerBase.[Tomcat].[localhost].[/].[dispatcherServlet] : Servlet.service() for servlet [dispatcherServlet] in context with path [] threw exception [Request processing failed; nested exception is java.lang.ArithmeticException: / by zero] with root cause\njava.lang.ArithmeticException: / by zero\n   at com.springexamples.demo.web.LoggerController.logs(LoggerController.java:22)\n   at java.base/jdk.internal.reflect.NativeMethodAccessorImpl.invoke0(Native Method)\n   at java.base/jdk.internal.reflect.NativeMethodAccessorImpl.invoke",
        "status": "ACTIVE",
    }
    log_config_id = create_log_config(**create_event)
    update_event = copy.deepcopy(create_event)
    update_event['id'] = log_config_id
    update_event['version'] = 1
    update_event["regexFieldSpecs"] = [
        {
            "format": "%Y-%m-%d %H:%M:%S.%L",
            "key": "time",
            "type": "date",
        },
        {"key": "level", "type": "integer"},
        # {"key": "thread", "type": "text"},
        {"key": "logger", "type": "text"},
        {"key": "message", "type": "text"},
        {"key": "newField", "type": "text"},
        {"key": "archive", "type": "integer"},
    ]
    update_log_config(**update_event)
    log_config_version = list_log_config_versions(id=log_config_id)
    assert [x["version"] for x in log_config_version] == [2, 1]

def test_lambda_function(
    sts_client,
    ddb_client,
    create_event,
    list_event,
    delete_event,
    update_event,
    get_event,
    # mocker,
):
    # mocker.patch("commonlib.dao.LogConfigDao")
    import lambda_function

    # start with empty list
    result = lambda_function.lambda_handler(list_event, None)
    assert result["total"] == 0

    # create a logConfig
    create_event = {
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
            {"key": "archive", "type": "text"},
        ],
        "timeKey": "time",
        "timeOffset": "-0600",
        "timeKeyRegex": "\\d{4}-\\d{2}-\\d{2} \\d{2}:\\d{2}:\\d{2}.\\d{3}",
        "userLogFormat": "%d{yyyy-MM-dd HH:mm:ss.SSS} %-5level [%thread] %logger : %msg%n",
        "userSampleLog": "2022-02-18 10:32:26.400 ERROR [http-nio-8080-exec-1] org.apache.catalina.core.ContainerBase.[Tomcat].[localhost].[/].[dispatcherServlet] : Servlet.service() for servlet [dispatcherServlet] in context with path [] threw exception [Request processing failed; nested exception is java.lang.ArithmeticException: / by zero] with root cause\njava.lang.ArithmeticException: / by zero\n   at com.springexamples.demo.web.LoggerController.logs(LoggerController.java:22)\n   at java.base/jdk.internal.reflect.NativeMethodAccessorImpl.invoke0(Native Method)\n   at java.base/jdk.internal.reflect.NativeMethodAccessorImpl.invoke",
        "status": "ACTIVE",
    }
    log_config_id = lambda_function.create_log_config(**create_event)
    # Expect Execute successfully.
    assert log_config_id is not None

    # update a logConfig
    update_event['arguments']['id'] = log_config_id
    result = lambda_function.lambda_handler(update_event, None)
    assert result is None

    # get a logConfig.
    get_event['arguments']['id'] = log_config_id
    result = lambda_function.lambda_handler(get_event, None)
    assert result["version"] == 2

    args = {"timeStr": "5/Apr/2022:06:28:03 +0000", "formatStr": "%d/%b/%Y:%H:%M:%S %z"}
    result = lambda_function.check_time_format(**args)
    assert result["isMatch"]

    args = {"timeStr": "5/Apr/2022:06:28:03 +0000", "formatStr": "%d/%b/%Y:%H:%M:%S"}
    result = lambda_function.check_time_format(**args)
    assert not result["isMatch"]

