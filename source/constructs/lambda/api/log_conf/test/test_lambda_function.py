# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import os

import boto3
import pytest
from moto import mock_dynamodb

json_config_1 = {
    "id": "e4c579eb-fcf2-4ddb-8226-796f4bc8a690",
    "confName": "s3-source-config-01",
    "createdDt": "2022-04-24T02:11:25Z",
    "logType": "JSON",
    "multilineLogParser": None,
    "regularExpression": "",
    "regularSpecs": [
        {"format": "%d/%b/%Y:%H:%M:%S %z", "key": "time", "type": "date"},
        {"key": "host", "type": "text"},
        {"key": "user-identifier", "type": "text"},
        {"key": "method", "type": "text"},
        {"key": "request", "type": "text"},
        {"key": "protocol", "type": "text"},
        {"key": "status", "type": "integer"},
        {"key": "bytes", "type": "integer"},
        {"key": "referer", "type": "text"},
    ],
    "status": "ACTIVE",
    "userLogFormat": "",
    "processorFilterRegex": {
        "enable": True,
        "filters": [
            {"key": "status", "condition": "Include", "value": "400|401|404|405"},
            {"key": "request", "condition": "Include", "value": "/user/log*"},
        ],
    },
}

regex_config_1 = {
    "id": "339039e1-9812-43f8-9962-165e3adbc805",
    "confName": "regex-nginx-config",
    "createdDt": "2022-03-17T07:51:18Z",
    "logType": "Nginx",
    "multilineLogParser": None,
    "regularExpression": '(?<remote_addr>\\S+)\\s+-\\s+(?<remote_user>\\S+)\\s+\\[(?<time_local>\\d+/\\S+/\\d+:\\d+:\\d+:\\d+)\\s+\\S+\\]\\s+"(?<request_method>\\S+)\\s+(?<request_uri>\\S+)\\s+\\S+"\\s+(?<status>\\S+)\\s+(?<body_bytes_sent>\\S+)\\s+"(?<http_referer>[^"]*)"\\s+"(?<http_user_agent>[^"]*)"\\s+"(?<http_x_forwarded_for>[^"]*)".*',
    "regularSpecs": [],
    "source": "ec2",
    "status": "ACTIVE",
    "userLogFormat": 'log_format  main  \'$remote_addr - $remote_user [$time_local] "$request" \'\n\'$status $body_bytes_sent "$http_referer" \'\n\'"$http_user_agent" "$http_x_forwarded_for"\';',
    "processorFilterRegex": {
        "enable": True,
        "filters": [
            {"key": "status", "condition": "Include", "value": "400|401|404|405"},
            {"key": "request", "condition": "Include", "value": "/user/log*"},
        ],
    },
}


@pytest.fixture
def ddb_client():
    with mock_dynamodb():
        region = os.environ.get("AWS_REGION")
        ddb = boto3.resource("dynamodb", region_name=region)
        # Mock App Log Configuration Table
        app_log_config_table_name = os.environ.get("LOGCONF_TABLE")
        app_log_config_table = ddb.create_table(
            TableName=app_log_config_table_name,
            KeySchema=[{"AttributeName": "id", "KeyType": "HASH"}],
            AttributeDefinitions=[{"AttributeName": "id", "AttributeType": "S"}],
            ProvisionedThroughput={"ReadCapacityUnits": 10, "WriteCapacityUnits": 10},
        )
        data_list = [json_config_1, regex_config_1]
        with app_log_config_table.batch_writer() as batch:
            for data in data_list:
                batch.put_item(Item=data)
        yield


def test_lambda_handler(ddb_client):
    # Can only import here, as the environment variables need to be set first.
    import lambda_function

    lambda_function.lambda_handler(
        {
            "arguments": {
                "confName": "nginx-dev-01",
                "logType": "Nginx",
                "multilineLogParser": None,
                "userSampleLog": "test",
                "userLogFormat": 'log_format  main  \'$remote_addr - $remote_user [$time_local] "$request" \'\n\'$status $body_bytes_sent "$http_referer" \'\n\'"$http_user_agent" "$http_x_forwarded_for"\';',
                "regularExpression": '(?<remote_addr>\\S+)\\s+-\\s+(?<remote_user>\\S+)\\s+\\[(?<time_local>\\d+/\\S+/\\d+:\\d+:\\d+:\\d+)\\s+\\S+\\]\\s+"(?<request_method>\\S+)\\s+(?<request_uri>\\S+)\\s+\\S+"\\s+(?<status>\\S+)\\s+(?<body_bytes_sent>\\S+)\\s+"(?<http_referer>[^"]*)"\\s+"(?<http_user_agent>[^"]*)"\\s+"(?<http_x_forwarded_for>[^"]*)".*',
                "timeRegularExpression": "\\d+/\\S+/\\d+:\\d+:\\d+:\\d+)\\s+\\S+\\]\\s",
                "regularSpecs": [],
                "processorFilterRegex": {
                    "enable": True,
                    "filters": [
                        {
                            "key": "status",
                            "condition": "Include",
                            "value": "400|401|404|405",
                        },
                        {
                            "key": "request",
                            "condition": "Include",
                            "value": "/user/log*",
                        },
                    ],
                },
            },
            "info": {
                "fieldName": "createLogConf",
                "parentTypeName": "Mutation",
                "variables": {
                    "confName": "nginx-dev-01",
                    "logType": "Nginx",
                    "userLogFormat": 'log_format  main  \'$remote_addr - $remote_user [$time_local] "$request" \'\n\'$status $body_bytes_sent "$http_referer" \'\n\'"$http_user_agent" "$http_x_forwarded_for"\';',
                    "regularExpression": '(?<remote_addr>\\S+)\\s+-\\s+(?<remote_user>\\S+)\\s+\\[(?<time_local>\\d+/\\S+/\\d+:\\d+:\\d+:\\d+)\\s+\\S+\\]\\s+"(?<request_method>\\S+)\\s+(?<request_uri>\\S+)\\s+\\S+"\\s+(?<status>\\S+)\\s+(?<body_bytes_sent>\\S+)\\s+"(?<http_referer>[^"]*)"\\s+"(?<http_user_agent>[^"]*)"\\s+"(?<http_x_forwarded_for>[^"]*)".*',
                    "regularSpecs": [],
                },
            },
        },
        None,
    )

    # Test Listing the log configs
    get_response = lambda_function.lambda_handler(
        {
            "arguments": {"page": 1, "count": 10},
            "info": {
                "fieldName": "listLogConfs",
                "parentTypeName": "Query",
                "variables": {"page": 1, "count": 10},
            },
        },
        None,
    )
    assert get_response["total"] == 3
    assert {
        "id": "e4c579eb-fcf2-4ddb-8226-796f4bc8a690",
        "confName": "s3-source-config-01",
        "createdDt": "2022-04-24T02:11:25Z",
        "logType": "JSON",
        "status": "ACTIVE",
    } in get_response["logConfs"]

    # Test Listing the log configs by log type
    get_response = lambda_function.lambda_handler(
        {
            "arguments": {"page": 1, "count": 10, "logType": "JSON"},
            "info": {
                "fieldName": "listLogConfs",
                "parentTypeName": "Query",
                "variables": {"page": 1, "count": 10},
            },
        },
        None,
    )
    assert get_response["total"] == 1

    # Test to create a log config with duplicate name
    with pytest.raises(lambda_function.APIException):
        lambda_function.lambda_handler(
            {
                "arguments": {
                    "confName": "nginx-dev-01",
                    "logType": "Nginx",
                    "multilineLogParser": None,
                    "userSampleLog": "test",
                    "userLogFormat": 'log_format  main  \'$remote_addr - $remote_user [$time_local] "$request" \'\n\'$status $body_bytes_sent "$http_referer" \'\n\'"$http_user_agent" "$http_x_forwarded_for"\';',
                    "regularExpression": '(?<remote_addr>\\S+)\\s+-\\s+(?<remote_user>\\S+)\\s+\\[(?<time_local>\\d+/\\S+/\\d+:\\d+:\\d+:\\d+)\\s+\\S+\\]\\s+"(?<request_method>\\S+)\\s+(?<request_uri>\\S+)\\s+\\S+"\\s+(?<status>\\S+)\\s+(?<body_bytes_sent>\\S+)\\s+"(?<http_referer>[^"]*)"\\s+"(?<http_user_agent>[^"]*)"\\s+"(?<http_x_forwarded_for>[^"]*)".*',
                    "timeRegularExpression": "\\d+/\\S+/\\d+:\\d+:\\d+:\\d+)\\s+\\S+\\]\\s",
                    "regularSpecs": [],
                    "processorFilterRegex": {
                        "enable": True,
                        "filters": [
                            {
                                "key": "status",
                                "condition": "Include",
                                "value": "400|401|404|405",
                            },
                            {
                                "key": "request",
                                "condition": "Include",
                                "value": "/user/log*",
                            },
                        ],
                    },
                },
                "info": {
                    "fieldName": "createLogConf",
                    "parentTypeName": "Mutation",
                    "variables": {
                        "confName": "nginx-dev-01",
                        "logType": "Nginx",
                        "userLogFormat": 'log_format  main  \'$remote_addr - $remote_user [$time_local] "$request" \'\n\'$status $body_bytes_sent "$http_referer" \'\n\'"$http_user_agent" "$http_x_forwarded_for"\';',
                        "regularExpression": '(?<remote_addr>\\S+)\\s+-\\s+(?<remote_user>\\S+)\\s+\\[(?<time_local>\\d+/\\S+/\\d+:\\d+:\\d+:\\d+)\\s+\\S+\\]\\s+"(?<request_method>\\S+)\\s+(?<request_uri>\\S+)\\s+\\S+"\\s+(?<status>\\S+)\\s+(?<body_bytes_sent>\\S+)\\s+"(?<http_referer>[^"]*)"\\s+"(?<http_user_agent>[^"]*)"\\s+"(?<http_x_forwarded_for>[^"]*)".*',
                        "regularSpecs": [],
                    },
                },
            },
            None,
        )

    get_resp = lambda_function.list_log_confs(confName="nginx-dev-01")
    log_conf_info = lambda_function.log_conf_table.get_item(
        Key={"id": get_resp["logConfs"][0]["id"]}
    )
    assert log_conf_info["Item"]["processorFilterRegex"] == {
        "enable": True,
        "filters": [
            {"condition": "Include", "key": "status", "value": "400|401|404|405"},
            {"condition": "Include", "key": "request", "value": "/user/log*"},
        ],
    }

    # Test to update a log config with duplicate name
    with pytest.raises(lambda_function.APIException):
        lambda_function.lambda_handler(
            {
                "arguments": {
                    "id": "e4c579eb-fcf2-4ddb-8226-796f4bc8a690",
                    "confName": "regex-nginx-config",
                    "logType": "Nginx",
                    "multilineLogParser": None,
                    "userSampleLog": "test",
                    "syslogParser": None,
                    "userLogFormat": 'log_format  main  \'$remote_addr - $remote_user [$time_local] "$request" \'\n\'$status $body_bytes_sent "$http_referer" \'\n\'"$http_user_agent" "$http_x_forwarded_for"\';',
                    "regularExpression": '(?<remote_addr>\\S+)\\s+-\\s+(?<remote_user>\\S+)\\s+\\[(?<time_local>\\d+/\\S+/\\d+:\\d+:\\d+:\\d+)\\s+\\S+\\]\\s+"(?<request_method>\\S+)\\s+(?<request_uri>\\S+)\\s+\\S+"\\s+(?<status>\\S+)\\s+(?<body_bytes_sent>\\S+)\\s+"(?<http_referer>[^"]*)"\\s+"(?<http_user_agent>[^"]*)"\\s+"(?<http_x_forwarded_for>[^"]*)".*',
                    "timeRegularExpression": "\\d+/\\S+/\\d+:\\d+:\\d+:\\d+)\\s+\\S+\\]\\s",
                    "regularSpecs": [],
                    "processorFilterRegex": {
                        "enable": True,
                        "filters": [
                            {
                                "key": "status",
                                "condition": "Include",
                                "value": "400|401|404|405",
                            },
                            {
                                "key": "request",
                                "condition": "Exclude",
                                "value": "/user/log*",
                            },
                        ],
                    },
                    "timeKey": "MyTimeKey",
                    "timeOffset": "UTC+0800",
                },
                "info": {
                    "fieldName": "updateLogConf",
                    "parentTypeName": "Mutation",
                    "variables": {
                        "id": "e4c579eb-fcf2-4ddb-8226-796f4bc8a690",
                        "confName": "regex-nginx-config",
                        "logType": "Nginx",
                        "multilineLogParser": None,
                        "userLogFormat": 'log_format  main  \'$remote_addr - $remote_user [$time_local] "$request" \'\n\'$status $body_bytes_sent "$http_referer" \'\n\'"$http_user_agent" "$http_x_forwarded_for"\';',
                        "regularExpression": '(?<remote_addr>\\S+)\\s+-\\s+(?<remote_user>\\S+)\\s+\\[(?<time_local>\\d+/\\S+/\\d+:\\d+:\\d+:\\d+)\\s+\\S+\\]\\s+"(?<request_method>\\S+)\\s+(?<request_uri>\\S+)\\s+\\S+"\\s+(?<status>\\S+)\\s+(?<body_bytes_sent>\\S+)\\s+"(?<http_referer>[^"]*)"\\s+"(?<http_user_agent>[^"]*)"\\s+"(?<http_x_forwarded_for>[^"]*)".*',
                        "regularSpecs": [],
                        "timeKey": "MyTimeKey",
                        "timeOffset": "UTC+0800",
                    },
                },
            },
            None,
        )

        log_conf_info = lambda_function.log_conf_table.get_item(
            Key={"id": "e4c579eb-fcf2-4ddb-8226-796f4bc8a690"}
        )
        assert log_conf_info["Item"]["processorFilterRegex"] == {
            "enable": True,
            "filters": [
                {"condition": "Include", "key": "status", "value": "400|401|404|405"},
                {"condition": "Exclude", "key": "request", "value": "/user/log*"},
            ],
        }

    # Test update the log config
    lambda_function.lambda_handler(
        {
            "arguments": {
                "id": "e4c579eb-fcf2-4ddb-8226-796f4bc8a690",
                "confName": "nginx-dev-02",
                "logType": "Nginx",
                "multilineLogParser": None,
                "userSampleLog": "test",
                "syslogParser": None,
                "userLogFormat": 'log_format  main  \'$remote_addr - $remote_user [$time_local] "$request" \'\n\'$status $body_bytes_sent "$http_referer" \'\n\'"$http_user_agent" "$http_x_forwarded_for"\';',
                "regularExpression": '(?<remote_addr>\\S+)\\s+-\\s+(?<remote_user>\\S+)\\s+\\[(?<time_local>\\d+/\\S+/\\d+:\\d+:\\d+:\\d+)\\s+\\S+\\]\\s+"(?<request_method>\\S+)\\s+(?<request_uri>\\S+)\\s+\\S+"\\s+(?<status>\\S+)\\s+(?<body_bytes_sent>\\S+)\\s+"(?<http_referer>[^"]*)"\\s+"(?<http_user_agent>[^"]*)"\\s+"(?<http_x_forwarded_for>[^"]*)".*',
                "timeRegularExpression": "\\d+/\\S+/\\d+:\\d+:\\d+:\\d+)\\s+\\S+\\]\\s",
                "regularSpecs": [],
                "processorFilterRegex": {
                    "enable": True,
                    "filters": [
                        {
                            "key": "status",
                            "condition": "Include",
                            "value": "400|401|404|405",
                        },
                        {
                            "key": "request",
                            "condition": "Exclude",
                            "value": "^/user/log*",
                        },
                    ],
                },
                "timeKey": "MyTimeKey",
                "timeOffset": "UTC+0800",
            },
            "info": {
                "fieldName": "updateLogConf",
                "parentTypeName": "Mutation",
                "variables": {
                    "id": "e4c579eb-fcf2-4ddb-8226-796f4bc8a690",
                    "confName": "nginx-dev-02",
                    "logType": "Nginx",
                    "multilineLogParser": None,
                    "userLogFormat": 'log_format  main  \'$remote_addr - $remote_user [$time_local] "$request" \'\n\'$status $body_bytes_sent "$http_referer" \'\n\'"$http_user_agent" "$http_x_forwarded_for"\';',
                    "regularExpression": '(?<remote_addr>\\S+)\\s+-\\s+(?<remote_user>\\S+)\\s+\\[(?<time_local>\\d+/\\S+/\\d+:\\d+:\\d+:\\d+)\\s+\\S+\\]\\s+"(?<request_method>\\S+)\\s+(?<request_uri>\\S+)\\s+\\S+"\\s+(?<status>\\S+)\\s+(?<body_bytes_sent>\\S+)\\s+"(?<http_referer>[^"]*)"\\s+"(?<http_user_agent>[^"]*)"\\s+"(?<http_x_forwarded_for>[^"]*)".*',
                    "regularSpecs": [],
                },
            },
        },
        None,
    )

    log_conf_info = lambda_function.log_conf_table.get_item(
        Key={"id": "e4c579eb-fcf2-4ddb-8226-796f4bc8a690"}
    )
    assert log_conf_info["Item"]["processorFilterRegex"] == {
        "enable": True,
        "filters": [
            {"condition": "Include", "key": "status", "value": "400|401|404|405"},
            {"condition": "Exclude", "key": "request", "value": "^/user/log*"},
        ],
    }

    # Test create a log config when processorFilterRegex is None
    lambda_function.lambda_handler(
        {
            "arguments": {
                "confName": "json-01",
                "logType": "JSON",
                "multilineLogParser": None,
                "syslogParser": None,
                "userLogFormat": "",
                "regularExpression": "",
                "regularSpecs": [],
                "processorFilterRegex": None,
            },
            "info": {
                "fieldName": "createLogConf",
                "parentTypeName": "Mutation",
            },
        },
        None,
    )

    get_resp = lambda_function.list_log_confs(confName="json-01")
    log_conf_info = lambda_function.log_conf_table.get_item(
        Key={"id": get_resp["logConfs"][0]["id"]}
    )
    assert log_conf_info["Item"]["processorFilterRegex"] == None
    lambda_function.log_conf_table.delete_item(
        Key={"id": get_resp["logConfs"][0]["id"]}
    )

    # Test update a log config when processorFilterRegex is None
    lambda_function.lambda_handler(
        {
            "arguments": {
                "id": "e4c579eb-fcf2-4ddb-8226-796f4bc8a690",
                "confName": "nginx-dev-02",
                "logType": "Nginx",
                "multilineLogParser": None,
                "syslogParser": None,
                "userSampleLog": "test",
                "userLogFormat": 'log_format  main  \'$remote_addr - $remote_user [$time_local] "$request" \'\n\'$status $body_bytes_sent "$http_referer" \'\n\'"$http_user_agent" "$http_x_forwarded_for"\';',
                "regularExpression": '(?<remote_addr>\\S+)\\s+-\\s+(?<remote_user>\\S+)\\s+\\[(?<time_local>\\d+/\\S+/\\d+:\\d+:\\d+:\\d+)\\s+\\S+\\]\\s+"(?<request_method>\\S+)\\s+(?<request_uri>\\S+)\\s+\\S+"\\s+(?<status>\\S+)\\s+(?<body_bytes_sent>\\S+)\\s+"(?<http_referer>[^"]*)"\\s+"(?<http_user_agent>[^"]*)"\\s+"(?<http_x_forwarded_for>[^"]*)".*',
                "timeRegularExpression": "\\d+/\\S+/\\d+:\\d+:\\d+:\\d+)\\s+\\S+\\]\\s",
                "regularSpecs": [],
                "processorFilterRegex": None,
                "timeKey": "MyTimeKey",
                "timeOffset": "UTC+0800",
            },
            "info": {
                "fieldName": "updateLogConf",
                "parentTypeName": "Mutation",
                "variables": {
                    "id": "e4c579eb-fcf2-4ddb-8226-796f4bc8a690",
                    "confName": "nginx-dev-02",
                    "logType": "Nginx",
                    "multilineLogParser": None,
                    "userLogFormat": 'log_format  main  \'$remote_addr - $remote_user [$time_local] "$request" \'\n\'$status $body_bytes_sent "$http_referer" \'\n\'"$http_user_agent" "$http_x_forwarded_for"\';',
                    "regularExpression": '(?<remote_addr>\\S+)\\s+-\\s+(?<remote_user>\\S+)\\s+\\[(?<time_local>\\d+/\\S+/\\d+:\\d+:\\d+:\\d+)\\s+\\S+\\]\\s+"(?<request_method>\\S+)\\s+(?<request_uri>\\S+)\\s+\\S+"\\s+(?<status>\\S+)\\s+(?<body_bytes_sent>\\S+)\\s+"(?<http_referer>[^"]*)"\\s+"(?<http_user_agent>[^"]*)"\\s+"(?<http_x_forwarded_for>[^"]*)".*',
                    "regularSpecs": [],
                },
            },
        },
        None,
    )

    log_conf_info = lambda_function.log_conf_table.get_item(
        Key={"id": "e4c579eb-fcf2-4ddb-8226-796f4bc8a690"}
    )
    assert log_conf_info["Item"]["processorFilterRegex"] == None

    # Test update the log config when processorFilterRegex.enable is False
    lambda_function.lambda_handler(
        {
            "arguments": {
                "id": "e4c579eb-fcf2-4ddb-8226-796f4bc8a690",
                "confName": "nginx-dev-02",
                "logType": "Nginx",
                "multilineLogParser": None,
                "syslogParser": None,
                "userSampleLog": "test",
                "userLogFormat": 'log_format  main  \'$remote_addr - $remote_user [$time_local] "$request" \'\n\'$status $body_bytes_sent "$http_referer" \'\n\'"$http_user_agent" "$http_x_forwarded_for"\';',
                "regularExpression": '(?<remote_addr>\\S+)\\s+-\\s+(?<remote_user>\\S+)\\s+\\[(?<time_local>\\d+/\\S+/\\d+:\\d+:\\d+:\\d+)\\s+\\S+\\]\\s+"(?<request_method>\\S+)\\s+(?<request_uri>\\S+)\\s+\\S+"\\s+(?<status>\\S+)\\s+(?<body_bytes_sent>\\S+)\\s+"(?<http_referer>[^"]*)"\\s+"(?<http_user_agent>[^"]*)"\\s+"(?<http_x_forwarded_for>[^"]*)".*',
                "timeRegularExpression": "\\d+/\\S+/\\d+:\\d+:\\d+:\\d+)\\s+\\S+\\]\\s",
                "regularSpecs": [],
                "processorFilterRegex": {
                    "enable": False,
                    "filters": [
                        {
                            "key": "status",
                            "condition": "Include",
                            "value": "400|401|404|405",
                        },
                        {
                            "key": "request",
                            "condition": "Exclude",
                            "value": "^/user/log*",
                        },
                    ],
                },
                "timeKey": "MyTimeKey",
                "timeOffset": "UTC+0800",
            },
            "info": {
                "fieldName": "updateLogConf",
                "parentTypeName": "Mutation",
                "variables": {
                    "id": "e4c579eb-fcf2-4ddb-8226-796f4bc8a690",
                    "confName": "nginx-dev-02",
                    "logType": "Nginx",
                    "multilineLogParser": None,
                    "userLogFormat": 'log_format  main  \'$remote_addr - $remote_user [$time_local] "$request" \'\n\'$status $body_bytes_sent "$http_referer" \'\n\'"$http_user_agent" "$http_x_forwarded_for"\';',
                    "regularExpression": '(?<remote_addr>\\S+)\\s+-\\s+(?<remote_user>\\S+)\\s+\\[(?<time_local>\\d+/\\S+/\\d+:\\d+:\\d+:\\d+)\\s+\\S+\\]\\s+"(?<request_method>\\S+)\\s+(?<request_uri>\\S+)\\s+\\S+"\\s+(?<status>\\S+)\\s+(?<body_bytes_sent>\\S+)\\s+"(?<http_referer>[^"]*)"\\s+"(?<http_user_agent>[^"]*)"\\s+"(?<http_x_forwarded_for>[^"]*)".*',
                    "regularSpecs": [],
                },
            },
        },
        None,
    )

    log_conf_info = lambda_function.log_conf_table.get_item(
        Key={"id": "e4c579eb-fcf2-4ddb-8226-796f4bc8a690"}
    )
    assert log_conf_info["Item"]["processorFilterRegex"] == {
        "enable": False,
        "filters": [
            {"condition": "Include", "key": "status", "value": "400|401|404|405"},
            {"condition": "Exclude", "key": "request", "value": "^/user/log*"},
        ],
    }


def test_delete_log_config(ddb_client):
    import lambda_function

    # Test Delete the Log Config
    lambda_function.lambda_handler(
        {
            "arguments": {"id": "e4c579eb-fcf2-4ddb-8226-796f4bc8a690"},
            "info": {
                "fieldName": "deleteLogConf",
                "parentTypeName": "Mutation",
                "variables": {"id": "e4c579eb-fcf2-4ddb-8226-796f4bc8a690"},
            },
        },
        None,
    )


def test_id_not_found(ddb_client):
    import lambda_function

    with pytest.raises(lambda_function.APIException):
        lambda_function.lambda_handler(
            {
                "arguments": {"id": "not_exist"},
                "info": {
                    "fieldName": "deleteLogConf",
                    "parentTypeName": "Mutation",
                    "variables": {"id": "not_exist"},
                },
            },
            None,
        )


def test_args_error(ddb_client):
    import lambda_function

    with pytest.raises(RuntimeError):
        lambda_function.lambda_handler(
            {
                "arguments": {"id": "773cb34e-59de-4a6e-9e87-0e0e9e0ff2a0"},
                "info": {
                    "fieldName": "no_exist",
                    "parentTypeName": "Mutation",
                    "variables": {"id": "773cb34e-59de-4a6e-9e87-0e0e9e0ff2a0"},
                },
            },
            None,
        )


def test_regular_specs_error(ddb_client):
    import lambda_function

    # Test date format is null
    with pytest.raises(lambda_function.APIException):
        lambda_function.lambda_handler(
            {
                "arguments": {
                    "confName": "json-01",
                    "logType": "JSON",
                    "multilineLogParser": None,
                    "userLogFormat": "",
                    "regularExpression": "",
                    "regularSpecs": [
                        {"key": "time", "type": "date", "format": ""},
                        {"key": "host", "type": "text"},
                        {"key": "user-identifier", "type": "text"},
                        {"key": "method", "type": "text"},
                        {"key": "request", "type": "text"},
                        {"key": "protocol", "type": "text"},
                        {"key": "status", "type": "integer"},
                        {"key": "bytes", "type": "integer"},
                        {"key": "referer", "type": "text"},
                    ],
                },
                "info": {
                    "fieldName": "createLogConf",
                    "parentTypeName": "Mutation",
                },
            },
            None,
        )

    # Test date format is null
    with pytest.raises(lambda_function.APIException):
        lambda_function.lambda_handler(
            {
                "arguments": {
                    "confName": "json-01",
                    "logType": "JSON",
                    "multilineLogParser": None,
                    "userLogFormat": "",
                    "regularExpression": "",
                    "regularSpecs": [
                        {"key": "time", "type": "date"},
                        {"key": "host", "type": "text"},
                        {"key": "user-identifier", "type": "text"},
                        {"key": "method", "type": "text"},
                        {"key": "request", "type": "text"},
                        {"key": "protocol", "type": "text"},
                        {"key": "status", "type": "integer"},
                        {"key": "bytes", "type": "integer"},
                        {"key": "referer", "type": "text"},
                    ],
                },
                "info": {
                    "fieldName": "createLogConf",
                    "parentTypeName": "Mutation",
                },
            },
            None,
        )

    # Test is not a diction
    with pytest.raises(lambda_function.APIException):
        lambda_function.lambda_handler(
            {
                "arguments": {
                    "confName": "json-01",
                    "logType": "JSON",
                    "multilineLogParser": None,
                    "userLogFormat": "",
                    "regularExpression": "",
                    "regularSpecs": [
                        {"time", "date"},
                        {"key": "host", "type": "text"},
                        {"key": "user-identifier", "type": "text"},
                        {"key": "method", "type": "text"},
                        {"key": "request", "type": "text"},
                        {"key": "protocol", "type": "text"},
                        {"key": "status", "type": "integer"},
                        {"key": "bytes", "type": "integer"},
                        {"key": "referer", "type": "text"},
                    ],
                },
                "info": {
                    "fieldName": "createLogConf",
                    "parentTypeName": "Mutation",
                },
            },
            None,
        )

    # Test no "key"
    with pytest.raises(lambda_function.APIException):
        lambda_function.lambda_handler(
            {
                "arguments": {
                    "confName": "json-01",
                    "logType": "JSON",
                    "multilineLogParser": None,
                    "userLogFormat": "",
                    "regularExpression": "",
                    "regularSpecs": [
                        {"type": "text"},
                        {"key": "user-identifier", "type": "text"},
                        {"key": "method", "type": "text"},
                        {"key": "request", "type": "text"},
                        {"key": "protocol", "type": "text"},
                        {"key": "status", "type": "integer"},
                        {"key": "bytes", "type": "integer"},
                        {"key": "referer", "type": "text"},
                    ],
                },
                "info": {
                    "fieldName": "createLogConf",
                    "parentTypeName": "Mutation",
                },
            },
            None,
        )


def test_filter_regex_error(ddb_client):
    import lambda_function

    # Test missing enable
    with pytest.raises(lambda_function.APIException):
        lambda_function.lambda_handler(
            {
                "arguments": {
                    "confName": "json-01",
                    "logType": "JSON",
                    "multilineLogParser": None,
                    "userLogFormat": "",
                    "regularExpression": "",
                    "regularSpecs": [],
                    "processorFilterRegex": {
                        "filters": [
                            {
                                "key": "status",
                                "condition": "Include",
                                "value": "400|401|404|405",
                            },
                            {
                                "key": "request",
                                "condition": "Exclude",
                                "value": "^/user/log*",
                            },
                        ]
                    },
                },
                "info": {
                    "fieldName": "createLogConf",
                    "parentTypeName": "Mutation",
                },
            },
            None,
        )

    # Test processorFilterRegex is not a dict
    with pytest.raises(lambda_function.APIException):
        lambda_function.lambda_handler(
            {
                "arguments": {
                    "confName": "json-01",
                    "logType": "JSON",
                    "multilineLogParser": None,
                    "userLogFormat": "",
                    "regularExpression": "",
                    "regularSpecs": [],
                    "processorFilterRegex": [],
                },
                "info": {
                    "fieldName": "createLogConf",
                    "parentTypeName": "Mutation",
                },
            },
            None,
        )

    # Test missing key
    with pytest.raises(lambda_function.APIException):
        lambda_function.lambda_handler(
            {
                "arguments": {
                    "confName": "json-01",
                    "logType": "JSON",
                    "multilineLogParser": None,
                    "userLogFormat": "",
                    "regularExpression": "",
                    "regularSpecs": [],
                    "processorFilterRegex": {
                        "enable": True,
                        "filters": [
                            {
                                "key-new": "status",
                                "condition": "Include",
                                "value": "400|401|404|405",
                            },
                            {
                                "key": "request",
                                "condition": "Exclude",
                                "value": "^/user/log*",
                            },
                        ],
                    },
                },
                "info": {
                    "fieldName": "createLogConf",
                    "parentTypeName": "Mutation",
                },
            },
            None,
        )

    # Test missing condition
    with pytest.raises(lambda_function.APIException):
        lambda_function.lambda_handler(
            {
                "arguments": {
                    "confName": "json-01",
                    "logType": "JSON",
                    "multilineLogParser": None,
                    "userLogFormat": "",
                    "regularExpression": "",
                    "regularSpecs": [],
                    "processorFilterRegex": {
                        "enable": True,
                        "filters": [
                            {
                                "key": "status",
                                "condition-new": "Include",
                                "value": "400|401|404|405",
                            },
                            {
                                "key": "request",
                                "condition": "Exclude",
                                "value": "^/user/log*",
                            },
                        ],
                    },
                },
                "info": {
                    "fieldName": "createLogConf",
                    "parentTypeName": "Mutation",
                },
            },
            None,
        )

    # Test missing value
    with pytest.raises(lambda_function.APIException):
        lambda_function.lambda_handler(
            {
                "arguments": {
                    "confName": "json-01",
                    "logType": "JSON",
                    "multilineLogParser": None,
                    "userLogFormat": "",
                    "regularExpression": "",
                    "regularSpecs": [],
                    "processorFilterRegex": {
                        "enable": True,
                        "filters": [
                            {
                                "key": "status",
                                "condition": "Include",
                                "value-new": "400|401|404|405",
                            },
                            {
                                "key": "request",
                                "condition": "Exclude",
                                "value": "^/user/log*",
                            },
                        ],
                    },
                },
                "info": {
                    "fieldName": "createLogConf",
                    "parentTypeName": "Mutation",
                },
            },
            None,
        )
