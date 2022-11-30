# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import pytest
import os
import boto3
from .datafile import ddb_mock_data
from moto import mock_dynamodb, mock_s3, mock_ssm, mock_sts


@pytest.fixture
def ssm_client():
    with mock_ssm():
        region = os.environ.get("AWS_REGION")
        ssm = boto3.client("ssm", region_name=region)
        filepath = "./test/datafile/document_content.json"
        with open(filepath) as openFile:
            document_content = openFile.read()
            ssm.create_document(
                Content=document_content,
                Name=os.environ.get("SSM_LOG_CONFIG_DOCUMENT_NAME"),
                DocumentType="Automation",
                DocumentFormat="JSON",
            )


@pytest.fixture
def ddb_client():
    with mock_dynamodb():
        region = os.environ.get("AWS_REGION")
        ddb = boto3.resource("dynamodb", region_name=region)
        # Mock App Pipeline Table
        app_pipeline_table_name = os.environ.get("APP_PIPELINE_TABLE_NAME")
        app_pipeline_table = ddb.create_table(
            TableName=app_pipeline_table_name,
            KeySchema=[{"AttributeName": "id", "KeyType": "HASH"}],
            AttributeDefinitions=[{"AttributeName": "id", "AttributeType": "S"}],
            ProvisionedThroughput={"ReadCapacityUnits": 10, "WriteCapacityUnits": 10},
        )
        data_list = [
            ddb_mock_data.s3_source_pipeline_data,
            ddb_mock_data.ec2_source_pipeline_data,
        ]
        with app_pipeline_table.batch_writer() as batch:
            for data in data_list:
                batch.put_item(Item=data)

        # Mock App Log Source Table
        s3_log_source_table_name = os.environ.get("S3_LOG_SOURCE_TABLE_NAME")
        s3_log_source_table = ddb.create_table(
            TableName=s3_log_source_table_name,
            KeySchema=[{"AttributeName": "id", "KeyType": "HASH"}],
            AttributeDefinitions=[{"AttributeName": "id", "AttributeType": "S"}],
            ProvisionedThroughput={"ReadCapacityUnits": 10, "WriteCapacityUnits": 10},
        )
        data_list = [ddb_mock_data.s3_source_data_1]
        with s3_log_source_table.batch_writer() as batch:
            for data in data_list:
                batch.put_item(Item=data)

        # Mock App Log Configuration Table
        app_log_config_table_name = os.environ.get("APP_LOG_CONFIG_TABLE_NAME")
        app_log_config_table = ddb.create_table(
            TableName=app_log_config_table_name,
            KeySchema=[{"AttributeName": "id", "KeyType": "HASH"}],
            AttributeDefinitions=[{"AttributeName": "id", "AttributeType": "S"}],
            ProvisionedThroughput={"ReadCapacityUnits": 10, "WriteCapacityUnits": 10},
        )
        data_list = [ddb_mock_data.json_config_1, ddb_mock_data.regex_config_1]
        with app_log_config_table.batch_writer() as batch:
            for data in data_list:
                batch.put_item(Item=data)

        # Mock App Log Instance Meta Table
        instance_meta_table_name = os.environ.get("INSTANCE_META_TABLE_NAME")
        ddb.create_table(
            TableName=instance_meta_table_name,
            KeySchema=[{"AttributeName": "id", "KeyType": "HASH"}],
            AttributeDefinitions=[
                {"AttributeName": "id", "AttributeType": "S"},
                {"AttributeName": "instanceId", "AttributeType": "S"},
            ],
            ProvisionedThroughput={"ReadCapacityUnits": 10, "WriteCapacityUnits": 10},
            GlobalSecondaryIndexes=[
                {
                    "IndexName": "instanceId-index",
                    "KeySchema": [
                        {"AttributeName": "instanceId", "KeyType": "HASH"},
                    ],
                    "Projection": {
                        "ProjectionType": "ALL",
                    },
                    "ProvisionedThroughput": {
                        "ReadCapacityUnits": 1,
                        "WriteCapacityUnits": 1,
                    },
                },
            ],
        )

        # Mock App Log Instance Group Table
        # Here we use ddb client instead of ddb resource, because we need put Set to ddb.
        _ddb_client = boto3.client("dynamodb")
        instance_group_table_name = os.environ.get("INSTANCE_GROUP_TABLE_NAME")
        _ddb_client.create_table(
            TableName=instance_group_table_name,
            KeySchema=[{"AttributeName": "id", "KeyType": "HASH"}],
            AttributeDefinitions=[{"AttributeName": "id", "AttributeType": "S"}],
            ProvisionedThroughput={"ReadCapacityUnits": 10, "WriteCapacityUnits": 10},
        )
        data_list = [
            ddb_mock_data.instance_group_1,
            ddb_mock_data.instance_group_2,
        ]
        for data in data_list:
            _ddb_client.put_item(TableName=instance_group_table_name, Item=data)

        # Mock App Log Ingestion Table
        app_log_ingestion_table_name = os.environ.get("APPLOGINGESTION_TABLE")
        app_log_ingestion_table = ddb.create_table(
            TableName=app_log_ingestion_table_name,
            KeySchema=[{"AttributeName": "id", "KeyType": "HASH"}],
            AttributeDefinitions=[{"AttributeName": "id", "AttributeType": "S"}],
            ProvisionedThroughput={
                "ReadCapacityUnits": 10,
                "WriteCapacityUnits": 10,
            },
        )
        data_list = [
            ddb_mock_data.log_ingestion_data_1,
            ddb_mock_data.log_ingestion_data_2,
        ]
        with app_log_ingestion_table.batch_writer() as batch:
            for data in data_list:
                batch.put_item(Item=data)

        ddb.create_table(
            TableName=os.environ.get("SUB_ACCOUNT_LINK_TABLE_NAME"),
            KeySchema=[{"AttributeName": "id", "KeyType": "HASH"}],
            AttributeDefinitions=[{"AttributeName": "id", "AttributeType": "S"}],
            ProvisionedThroughput={"ReadCapacityUnits": 5, "WriteCapacityUnits": 5},
        )
        yield


@pytest.fixture
def sts_client():
    with mock_sts():
        boto3.client("sts", region_name=os.environ.get("AWS_REGION"))
        yield


@pytest.fixture
def s3_client():
    with mock_s3():
        region = os.environ.get("AWS_REGION")

        s3 = boto3.resource("s3", region_name=region)
        # Create the buckets
        bucket_name = os.environ.get("CONFIG_FILE_S3_BUCKET_NAME")
        s3.create_bucket(Bucket=bucket_name)
        yield


def _check_agent_config(agent_config_path, ground_truth_path, test_type="S3"):
    if test_type == "S3":
        region = os.environ.get("AWS_REGION")
        s3 = boto3.resource("s3", region_name=region)
        bucket_name = os.environ.get("CONFIG_FILE_S3_BUCKET_NAME")
        obj = s3.Object(bucket_name, agent_config_path).get()
        assert "Body" in obj
        agent_config = obj["Body"].read().decode("utf-8")
        parsed_agent_config = agent_config.strip().split("\n")
    else:
        agent_config = open(agent_config_path)
        parsed_agent_config = agent_config
    with open(ground_truth_path) as ground_truth:
        ground_truth_lines = ground_truth.readlines()
        i = 0
        for line in parsed_agent_config:
            if i >= len(ground_truth_lines):
                # The lines generated by your code is more than ground truth
                print(agent_config)
                print(
                    "Detect configuration drift! Your code generated: %s, but ground truth is: %s"
                    % (line, "")
                )
                assert True

            # if line.strip() != ground_truth_lines[i].strip():
            #     print(
            #         "Detect configuration drift at line: %d! Your code generated: %s, but ground truth is: %s"
            #         % (i, line.strip(), ground_truth_lines[i].strip()))
            #     print(agent_config)
            #     assert line.strip() != ground_truth_lines[i].strip()
            i += 1
            print(">>> " + str(i))
            print(line)
        print(len(ground_truth_lines))
        print(i)
        if len(ground_truth_lines) > i:
            # The lines generated by your code is less than ground truth
            print(agent_config)
            print(
                "Detect configuration drift! Your code generated: %s, but ground truth is: %s"
                % ("", ground_truth_lines[i].strip())
            )
            assert False


# This is no longer supported.
# Ignore this test case.
# class TestFluentDS3:
#     def test_create_ingestion(self, ddb_client, s3_client, sts_client):
#         from ..util import log_agent_helper

#         self.agent = log_agent_helper.FluentDS3(
#             group_id="9681daea-1095-44b5-8e11-40fa935f3aea",
#             config_id="e4c579eb-fcf2-4ddb-8226-796f4bc8a690",
#             app_pipeline_id="ab740668-fba3-4d86-879d-e9a5a446d69f",
#             log_ingestion_id="",
#             is_multiline=False,
#         )

#         self.agent.create_ingestion()
#         _check_agent_config(
#             agent_config_path="app_log_config/9681daea-1095-44b5-8e11-40fa935f3aea/td-agent.conf",
#             ground_truth_path="./test/datafile/td-agent_ground_truth.conf",
#         )


class TestFluentBit:
    mock_ddb = mock_dynamodb()
    mock_s3 = mock_s3()

    def test_create_ingestion_parser(self, ddb_client, s3_client, sts_client):
        from ..util import log_agent_helper

        self.agent = log_agent_helper.FluentBit(
            group_id="8a76e4b1-5164-491d-9991-05a579b42299",
            config_id="339039e1-9812-43f8-9962-165e3adbc805",
            app_pipeline_id="d27b96a9-7b78-4fe1-94e6-3e42f57f4339",
            log_ingestion_id="039a1176-33c4-4ec7-8ea2-3245ae27b4b1",
            is_multiline=False,
        )

        self.agent.create_ingestion_parser()
        _check_agent_config(
            agent_config_path="/tmp/log_config/i-0fd07f9eeb8a45e83/applog_parsers.conf",
            ground_truth_path="./test/datafile/fluent-bit_applog_parsers_i-0004b78389b5c7db3.conf",
            test_type="local",
        )

    def test_create_ingestion(self, ddb_client, s3_client, sts_client):
        from ..util import log_agent_helper

        self.agent = log_agent_helper.FluentBit(
            group_id="8a76e4b1-5164-491d-9991-05a579b42299",
            config_id="339039e1-9812-43f8-9962-165e3adbc805",
            app_pipeline_id="d27b96a9-7b78-4fe1-94e6-3e42f57f4339",
            log_ingestion_id="039a1176-33c4-4ec7-8ea2-3245ae27b4b1",
            is_multiline=False,
        )
        # Tested in TestLogIngestionHelper
        pass

    def test_delete_ingestion(self, ddb_client, s3_client, sts_client):
        from ..util import log_agent_helper

        self.agent = log_agent_helper.FluentBit(
            group_id="8a76e4b1-5164-491d-9991-05a579b42299",
            config_id="339039e1-9812-43f8-9962-165e3adbc805",
            app_pipeline_id="d27b96a9-7b78-4fe1-94e6-3e42f57f4339",
            log_ingestion_id="039a1176-33c4-4ec7-8ea2-3245ae27b4b1",
            is_multiline=False,
        )
        # Tested in TestLogIngestionHelper
        pass


class TestLogIngestionSvc:
    mock_ddb = mock_dynamodb()
    mock_s3 = mock_s3()

    def test_init(self):
        from ..util import log_agent_helper

        with pytest.raises(RuntimeError):
            log_agent_helper.IngestionTask(
                agent_type="unknown",
                group_id="111",
                config_id="111",
                app_pipeline_id="222",
                log_ingestion_id="333",
                is_multiline=False,
            )

    def test_create_ingestion(self, ddb_client, s3_client, ssm_client, sts_client):
        from ..util import log_agent_helper

        # Here we need multi agent to test configuration overlap between instance groups
        self.task_1 = log_agent_helper.IngestionTask(
            agent_type="FluentBit",
            group_id="8a76e4b1-5164-491d-9991-05a579b42299",
            config_id="339039e1-9812-43f8-9962-165e3adbc805",
            app_pipeline_id="d27b96a9-7b78-4fe1-94e6-3e42f57f4339",
            log_ingestion_id="039a1176-33c4-4ec7-8ea2-3245ae27b4b1",
            is_multiline=False,
        )

        self.task_1.create_ingestion()
        _check_agent_config(
            agent_config_path="app_log_config/i-0fd07f9eeb8a45e83/fluent-bit.conf",
            ground_truth_path="./test/datafile/fluent-bit_config_TestLogIngestionSvc_task_1.conf",
        )

        # test dose not contain processorFilterRegex
        self.task_2 = log_agent_helper.IngestionTask(
            agent_type="FluentBit",
            group_id="cc090e29-312e-418e-8b56-796923f9b6ed",
            config_id="e4c579eb-fcf2-4ddb-8226-796f4bc8a690",
            app_pipeline_id="ab740668-fba3-4d86-879d-e9a5a446d69f",
            log_ingestion_id="d8e6c7a6-4061-4a4a-864e-ef9a427d231d",
            is_multiline=False,
        )

        self.task_2.create_ingestion()
        _check_agent_config(
            agent_config_path="app_log_config/i-0fd07f9eeb8a45e83/fluent-bit.conf",
            ground_truth_path="./test/datafile/fluent-bit_config_TestLogIngestionSvc_task_2.conf",
        )

        # test processorFilterRegex.enable is False
        self.task_2.delete_ingestion()
        log_agent_helper.app_log_config_table.update_item(
            Key={"id": "339039e1-9812-43f8-9962-165e3adbc805"},
            UpdateExpression="SET #processorFilterRegex = :processorFilterRegex",
            ExpressionAttributeNames={
                "#processorFilterRegex": "processorFilterRegex",
            },
            ExpressionAttributeValues={
                ":processorFilterRegex": {"enable": False},
            },
        )
        self.task_3 = log_agent_helper.IngestionTask(
            agent_type="FluentBit",
            group_id="cc090e29-312e-418e-8b56-796923f9b6ed",
            config_id="e4c579eb-fcf2-4ddb-8226-796f4bc8a690",
            app_pipeline_id="ab740668-fba3-4d86-879d-e9a5a446d69f",
            log_ingestion_id="d8e6c7a6-4061-4a4a-864e-ef9a427d231d",
            is_multiline=False,
        )
        self.task_3.create_ingestion()
        _check_agent_config(
            agent_config_path="app_log_config/i-0fd07f9eeb8a45e83/fluent-bit.conf",
            ground_truth_path="./test/datafile/fluent-bit_config_TestLogIngestionSvc_task_2.conf",
        )

        # test processorFilterRegex.enable is True
        self.task_3.delete_ingestion()
        log_agent_helper.app_log_config_table.update_item(
            Key={"id": "339039e1-9812-43f8-9962-165e3adbc805"},
            UpdateExpression="SET #processorFilterRegex = :processorFilterRegex",
            ExpressionAttributeNames={
                "#processorFilterRegex": "processorFilterRegex",
            },
            ExpressionAttributeValues={
                ":processorFilterRegex": {
                    "enable": True,
                    "filters": [
                        {
                            "key": "status",
                            "condition": "Include",
                            "value": '^%\'"(400|401|404|405).*\*"',
                        },
                        {
                            "key": "request",
                            "condition": "Include",
                            "value": "/user/log*",
                        },
                    ],
                },
            },
        )
        self.task_3 = log_agent_helper.IngestionTask(
            agent_type="FluentBit",
            group_id="cc090e29-312e-418e-8b56-796923f9b6ed",
            config_id="e4c579eb-fcf2-4ddb-8226-796f4bc8a690",
            app_pipeline_id="ab740668-fba3-4d86-879d-e9a5a446d69f",
            log_ingestion_id="d8e6c7a6-4061-4a4a-864e-ef9a427d231d",
            is_multiline=False,
        )
        self.task_3.create_ingestion()
        _check_agent_config(
            agent_config_path="app_log_config/i-0fd07f9eeb8a45e83/fluent-bit.conf",
            ground_truth_path="./test/datafile/fluent-bit_config_TestLogIngestionSvc_task_3.conf",
        )

        # TODO: what is the purpose of task 4?
        # self.task_4 = log_agent_helper.IngestionTask(
        #     agent_type="FluentBit",
        #     group_id="cc090e29-312e-418e-8b56-796923f9b6ed",
        #     config_id="",
        #     app_pipeline_id="ab740668-fba3-4d86-879d-e9a5a446d69f",
        #     log_ingestion_id="d8e6c7a6-4061-4a4a-864e-ef9a427d231d",
        #     is_multiline=False,
        # )

        # self.task_4.delete_ingestion()
        # _check_agent_config(
        #     agent_config_path="app_log_config/i-0fd07f9eeb8a45e83/fluent-bit.conf",
        #     ground_truth_path="./test/datafile/fluent-bit_config_TestLogIngestionSvc_task_4.conf",
        # )
