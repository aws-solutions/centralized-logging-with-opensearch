# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import re
import os
import sys
import boto3
import types
import uuid
import copy
import json
import shutil
import pytest
import signal
import datetime
from pathlib import Path
from boto3.dynamodb.conditions import Attr, Key
from test.mock import (
    mock_s3_context,
    mock_iam_context,
    mock_sqs_context,
    mock_ddb_context,
    mock_athena_context,
    mock_scheduler_context,
    mock_events_context,
    mock_glue_context,
    mock_sfn_context,
    mock_sns_context,
    mock_ses_context,
    mock_sts_context,
    mock_rds_context,
    mock_lambda_context,
    mock_wafv2_context,
    default_environment_variables,
)


sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


class TestValidateParameters:
    def test_parameter(
        self, mock_sqs_context, mock_iam_context, mock_ddb_context, mock_s3_context
    ):
        from utils.helpers import ValidateParameters

        s3_object_scanning_event = json.loads(os.environ["S3_OBJECT_SCANNING_EVENT"])
        function_name = os.environ["S3_OBJECTS_SCANNING_FUNCTION_NAME"]

        event = s3_object_scanning_event.copy()
        event["functionName"] = function_name
        event["taskId"] = "0b40a554-7004-48fd-8998-742853bfa620"

        param = ValidateParameters(event)

        assert param._required_parameter_check(event) is None
        assert param._optional_parameter_check(event) is None

        assert (
            param._get_bucket_name("s3://stagingbucket/AWSLogs/123456789012/test/")
            == "stagingbucket"
        )
        assert (
            param._get_bucket_prefix("s3://stagingbucket/AWSLogs/123456789012/test/")
            == "AWSLogs/123456789012/test"
        )
        assert (
            param._get_bucket_prefix("s3://stagingbucket/AWSLogs/123456789012/test")
            == "AWSLogs/123456789012/test"
        )

        namespace = param._get_bucket_object_from_uri(
            "s3://stagingbucket/AWSLogs/123456789012/test/"
        )
        assert namespace.bucket == "stagingbucket"
        assert namespace.prefix == "AWSLogs/123456789012/test"

        namespace = param._get_bucket_object_from_uri(
            "s3://stagingbucket/AWSLogs/123456789012/test"
        )
        assert namespace.bucket == "stagingbucket"
        assert namespace.prefix == "AWSLogs/123456789012/test"

        assert param._get_parameter_value(True, (bool, str), False) is True
        assert param._get_parameter_value(True, int, 2) is True
        assert param._get_parameter_value(False, int, 2) is False
        assert param._get_parameter_value(True, str, 2) == 2
        assert param._get_parameter_value(2, bool, True) is True
        assert param._get_parameter_value(1, bool, True) is True
        assert param._get_parameter_value(0, bool, True) is True
        assert param._get_parameter_value("1", bool, True) is True
        assert param._get_parameter_value("0", bool, False) is False

        with pytest.raises(Exception) as exception_info:
            ValidateParameters([1, 2, 3])  # type: ignore
        assert (
            exception_info.value.args[0]
            == "The parameters is not a dict, parameters: [1, 2, 3]."
        )

        with pytest.raises(Exception) as exception_info:
            ValidateParameters(123456)  # type: ignore
        assert (
            exception_info.value.args[0]
            == "The parameters is not a dict, parameters: 123456."
        )

        assert (
            param._child_parameter_lookup_check(
                event, keys=("executionName", "srcPath", "dstPath"), path=""
            )
            is None
        )
        with pytest.raises(Exception) as exception_info:
            param._child_parameter_lookup_check(
                event, keys=("executionName", "srcPath", "no-exists-key"), path=""
            )
        assert exception_info.value.args[0] == "Missing value for no-exists-key."

        with pytest.raises(Exception) as exception_info:
            param._child_parameter_lookup_check(
                event,
                keys=("executionName", "srcPath", "no-exists-key"),
                path="metadata",
            )
        assert (
            exception_info.value.args[0] == "Missing value for metadata.no-exists-key."
        )

        with pytest.raises(Exception) as exception_info:
            param._child_parameter_lookup_check(
                event,
                keys=("executionName", "srcPath", "no-exists-key"),
                path="metadata.test",
            )
        assert (
            exception_info.value.args[0]
            == "Missing value for metadata.test.no-exists-key."
        )

        parameters_list = [{"key": "value"}]
        assert (
            param._child_parameter_lookup_check(parameters_list, keys=("key",), path="")
            is None
        )
        with pytest.raises(Exception) as exception_info:
            param._child_parameter_lookup_check(
                parameters_list,
                keys=(
                    "key",
                    "executionName",
                ),
                path="",
            )
        assert exception_info.value.args[0] == "Missing value for executionName."

        parameters_list = ["hello", "world"]
        with pytest.raises(Exception) as exception_info:
            param._child_parameter_lookup_check(
                parameters_list,  # type: ignore
                keys=(
                    "key",
                    "executionName",
                ),
                path="",
            )  # type: ignore
        assert exception_info.value.args[0] == "The parameter is not a dict or list."


class TestDynamoDBUtil:
    def test_init(self, mock_sqs_context, mock_iam_context, mock_ddb_context):
        from utils.aws import DynamoDBUtil

        etl_log_table_name = os.environ["ETL_LOG_TABLE_NAME"]
        aws_ddb_etl_log = DynamoDBUtil(etl_log_table_name)

        assert aws_ddb_etl_log._table_name == etl_log_table_name

    def test_put_item(self, mock_sqs_context, mock_iam_context, mock_ddb_context):
        from utils.aws import DynamoDBUtil

        etl_log_table_name = os.environ["ETL_LOG_TABLE_NAME"]
        AWS_DDB_ETL_LOG = DynamoDBUtil(etl_log_table_name)

        execution_name = "908c04d6-eaa6-4f9b-90ab-c48f965a327e"
        task_id = "00000000-0000-0000-0000-000000000000"
        start_time = datetime.datetime.now(datetime.UTC).isoformat()
        item = {
            "executionName": execution_name,
            "taskId": task_id,
            "API": "Step Functions: StartExecution",
            "parentTaskId": "",
            "pipelineId": "5bc25cc5-e49b-4f0a-ad7c-072a126bfb3d",
            "startTime": start_time,
            "stateMachineName": "LogProcessor-HBTz7GoOjZoz",
            "stateName": "Put task info of Step Function to DynamoDB",
            "status": "Running",
        }

        AWS_DDB_ETL_LOG.put_item(item=item)
        response = AWS_DDB_ETL_LOG.get_item(
            key={"executionName": execution_name, "taskId": task_id}
        )
        assert response["pipelineId"] == "5bc25cc5-e49b-4f0a-ad7c-072a126bfb3d"
        assert response["startTime"] == start_time
        assert response["parentTaskId"] == ""

    def test_get_item(self, mock_sqs_context, mock_iam_context, mock_ddb_context):
        from utils.aws import DynamoDBUtil

        etl_log_table_name = os.environ["ETL_LOG_TABLE_NAME"]
        AWS_DDB_ETL_LOG = DynamoDBUtil(etl_log_table_name)

        execution_name = "1ebf165b-f846-4813-8cab-305be5c8ca7e"
        task_id = "00000000-0000-0000-0000-000000000000"

        response = AWS_DDB_ETL_LOG.get_item(
            key={"executionName": execution_name, "taskId": task_id}
        )
        assert response["pipelineId"] == "189f73eb-1808-47e4-a9db-ee9c35100abe"
        assert response["parentTaskId"] == ""

        non_execution_name = "6014ac9f-bc52-4e6c-9dbb-b46ff19c1721"

        key = {"executionName": non_execution_name, "taskId": task_id}
        with pytest.raises(Exception) as exception_info:
            AWS_DDB_ETL_LOG.get_item(key=key, raise_if_not_found=True)
        assert exception_info.value.args[0] == f"[Item is not found] Key: {key}"

        response = AWS_DDB_ETL_LOG.get_item(key=key, raise_if_not_found=False)
        assert response is None

    def test_list_items(self, mock_sqs_context, mock_iam_context, mock_ddb_context):
        from utils.aws import DynamoDBUtil

        etl_log_table_name = os.environ["ETL_LOG_TABLE_NAME"]
        AWS_DDB_ETL_LOG = DynamoDBUtil(etl_log_table_name)

        execution_name = "1ebf165b-f846-4813-8cab-305be5c8ca7e"
        parent_task_id = "6b10286b-c4b3-44ed-b4e8-c251a04b6a59"
        non_conditions = Attr("nonColumn").eq(parent_task_id)
        conditions = Attr("parentTaskId").eq(parent_task_id)
        projection_attribute_names = ["executionName", "taskId", "pipelineId", "status"]
        non_projection_attribute_names = [
            "executionName",
            "taskId",
            "nonColumn",
            "status",
        ]

        response = AWS_DDB_ETL_LOG.list_items()
        assert response[0]["taskId"] == "00000000-0000-0000-0000-000000000000"
        assert response[1]["taskId"] == "6b10286b-c4b3-44ed-b4e8-c251a04b6a59"
        assert response[2]["taskId"] == "9d512f44-7626-49e2-a465-f450e93f6388"
        assert response[3]["taskId"] == "bc73c25b-49c1-4d9f-a005-d0853809260d"
        with pytest.raises(IndexError):
            assert response[4]

        response = AWS_DDB_ETL_LOG.list_items(filter=conditions)
        assert response[0]["taskId"] == "9d512f44-7626-49e2-a465-f450e93f6388"
        assert response[1]["taskId"] == "bc73c25b-49c1-4d9f-a005-d0853809260d"
        with pytest.raises(IndexError):
            assert response[2]

        response = AWS_DDB_ETL_LOG.scan(filter=non_conditions)
        items = next(response)
        assert items["Items"] == []

        response = AWS_DDB_ETL_LOG.scan(
            filter=conditions, projection_attribute_names=projection_attribute_names
        )
        items = next(response)
        assert items["Items"][0].get("API") is None
        assert items["Items"][1].get("API") is None
        assert (
            items["Items"][0].get("executionName")
            == "1ebf165b-f846-4813-8cab-305be5c8ca7e"
        )
        assert (
            items["Items"][1].get("executionName")
            == "1ebf165b-f846-4813-8cab-305be5c8ca7e"
        )
        with pytest.raises(IndexError):
            assert items["Items"][2]

        response = AWS_DDB_ETL_LOG.scan(
            filter=conditions, projection_attribute_names=non_projection_attribute_names
        )
        items = next(response)
        assert items["Items"][0].get("nonColumn") is None
        assert (
            items["Items"][0].get("executionName")
            == "1ebf165b-f846-4813-8cab-305be5c8ca7e"
        )

        response = AWS_DDB_ETL_LOG.scan(
            filter=non_conditions, projection_attribute_names=projection_attribute_names
        )
        items = next(response)
        assert items["Items"] == []

        response = AWS_DDB_ETL_LOG.scan(
            filter=non_conditions,
            projection_attribute_names=non_projection_attribute_names,
        )
        items = next(response)
        assert items["Items"] == []

    def test_scan(self, mock_sqs_context, mock_iam_context, mock_ddb_context):
        from utils.aws import DynamoDBUtil

        etl_log_table_name = os.environ["ETL_LOG_TABLE_NAME"]
        AWS_DDB_ETL_LOG = DynamoDBUtil(etl_log_table_name)

        execution_name = "1ebf165b-f846-4813-8cab-305be5c8ca7e"
        parent_task_id = "6b10286b-c4b3-44ed-b4e8-c251a04b6a59"
        non_conditions = Attr("nonColumn").eq(parent_task_id)
        conditions = Attr("parentTaskId").eq(parent_task_id)
        projection_attribute_names = ["executionName", "taskId", "pipelineId", "status"]
        non_projection_attribute_names = [
            "executionName",
            "taskId",
            "nonColumn",
            "status",
        ]

        response = AWS_DDB_ETL_LOG.scan(filter=conditions)
        items = next(response)
        assert items["Items"][0]["taskId"] == "9d512f44-7626-49e2-a465-f450e93f6388"
        assert items["Items"][1]["taskId"] == "bc73c25b-49c1-4d9f-a005-d0853809260d"
        with pytest.raises(IndexError):
            assert items["Items"][2]

        response = AWS_DDB_ETL_LOG.scan(filter=non_conditions)
        items = next(response)
        assert items["Items"] == []

        response = AWS_DDB_ETL_LOG.scan(filter=conditions, select="COUNT")
        item = next(response)
        assert item["Count"] == 2

        response = AWS_DDB_ETL_LOG.scan(filter=non_conditions, select="COUNT")
        item = next(response)
        assert item["Count"] == 0

        response = AWS_DDB_ETL_LOG.scan(
            filter=conditions, projection_attribute_names=projection_attribute_names
        )
        items = next(response)
        assert items["Items"][0].get("API") is None
        assert items["Items"][1].get("API") is None
        assert (
            items["Items"][0].get("executionName")
            == "1ebf165b-f846-4813-8cab-305be5c8ca7e"
        )
        assert (
            items["Items"][1].get("executionName")
            == "1ebf165b-f846-4813-8cab-305be5c8ca7e"
        )
        with pytest.raises(IndexError):
            assert items["Items"][2]

        response = AWS_DDB_ETL_LOG.scan(
            filter=conditions, projection_attribute_names=non_projection_attribute_names
        )
        assert items["Items"][0].get("nonColumn") is None
        assert items["Items"][1].get("nonColumn") is None
        assert (
            items["Items"][0].get("executionName")
            == "1ebf165b-f846-4813-8cab-305be5c8ca7e"
        )
        assert (
            items["Items"][1].get("executionName")
            == "1ebf165b-f846-4813-8cab-305be5c8ca7e"
        )

        response = AWS_DDB_ETL_LOG.scan(
            filter=non_conditions, projection_attribute_names=projection_attribute_names
        )
        items = next(response)
        assert items["Items"] == []

        response = AWS_DDB_ETL_LOG.scan(
            filter=non_conditions,
            projection_attribute_names=non_projection_attribute_names,
        )
        items = next(response)
        assert items["Items"] == []

    def test_query(self, mock_sqs_context, mock_iam_context, mock_ddb_context):
        from utils.aws import DynamoDBUtil

        etl_log_table_name = os.environ["ETL_LOG_TABLE_NAME"]
        AWS_DDB_ETL_LOG = DynamoDBUtil(etl_log_table_name)

        execution_name = "1ebf165b-f846-4813-8cab-305be5c8ca7e"
        task_id = "00000000-0000-0000-0000-000000000000"

        response = AWS_DDB_ETL_LOG.query(
            key_condition=Key("executionName").eq(execution_name)
        )
        items = next(response)
        assert items["Items"][0]["taskId"] == "00000000-0000-0000-0000-000000000000"
        assert items["Items"][1]["taskId"] == "6b10286b-c4b3-44ed-b4e8-c251a04b6a59"
        assert items["Items"][2]["taskId"] == "9d512f44-7626-49e2-a465-f450e93f6388"
        assert items["Items"][3]["taskId"] == "bc73c25b-49c1-4d9f-a005-d0853809260d"
        with pytest.raises(IndexError):
            assert items["Items"][4]

        non_conditions = Attr("nonColumn").eq(task_id)

        response = AWS_DDB_ETL_LOG.query(
            key_condition=Key("executionName").eq(execution_name), filter=non_conditions
        )
        items = next(response)
        assert items["Items"] == []

        response = AWS_DDB_ETL_LOG.query(
            key_condition=Key("executionName").eq(execution_name), select="COUNT"
        )
        items = next(response)
        assert items["Count"] == 4

        execution_name = "1ebf165b-f846-4813-8cab-305be5c8ca7e"
        parent_task_id = "6b10286b-c4b3-44ed-b4e8-c251a04b6a59"
        conditions = Attr("parentTaskId").eq(parent_task_id)

        response = AWS_DDB_ETL_LOG.query(
            key_condition=Key("executionName").eq(execution_name), filter=conditions
        )
        items = next(response)
        assert items["Items"][0]["taskId"] == "9d512f44-7626-49e2-a465-f450e93f6388"
        assert items["Items"][1]["taskId"] == "bc73c25b-49c1-4d9f-a005-d0853809260d"
        with pytest.raises(IndexError):
            assert items["Items"][2]

        response = AWS_DDB_ETL_LOG.query(
            key_condition=Key("executionName").eq(execution_name),
            filter=conditions,
            select="COUNT",
        )
        items = next(response)
        assert items["Count"] == 2

        non_conditions = Attr("nonColumn").eq(parent_task_id)

        response = AWS_DDB_ETL_LOG.query(
            key_condition=Key("executionName").eq(execution_name),
            filter=non_conditions,
            select="COUNT",
        )
        items = next(response)
        assert items["Count"] == 0

    def test_update_item(self, mock_sqs_context, mock_iam_context, mock_ddb_context):
        from utils.aws import DynamoDBUtil

        etl_log_table_name = os.environ["ETL_LOG_TABLE_NAME"]
        AWS_DDB_ETL_LOG = DynamoDBUtil(etl_log_table_name)

        execution_name = "1ebf165b-f846-4813-8cab-305be5c8ca7e"
        task_id = "00000000-0000-0000-0000-000000000000"
        end_time = datetime.datetime.now(datetime.UTC).isoformat()
        key = {"executionName": execution_name, "taskId": task_id}

        AWS_DDB_ETL_LOG.update_item(
            key=key, item={"status": "COMPLETED", "endTime": end_time}
        )
        response = AWS_DDB_ETL_LOG.get_item(key=key)
        assert response["taskId"] == task_id
        assert response["status"] == "COMPLETED"
        assert response["endTime"] == end_time

        execution_name = "1ebf165b-f846-4813-8cab-305be5c8ca7e"
        task_id = "00000000-0000-0000-0000-000000000000"
        end_time = datetime.datetime.now(datetime.UTC).isoformat()
        key = {"executionName": execution_name, "taskId": task_id}
        item = {"status": "COMPLETED", "endTime": end_time, "exists.dot": "dot.test"}
        with pytest.raises(ValueError) as exception_info:
            AWS_DDB_ETL_LOG.update_item(key=key, item=item)
        # assert exception_info.value.args[
        #            0] == "An error occurred (404) when calling the HeadObject operation: Not Found"

    def test_delete_item(self, mock_sqs_context, mock_iam_context, mock_ddb_context):
        from utils.aws import DynamoDBUtil

        etl_log_table_name = os.environ["ETL_LOG_TABLE_NAME"]
        AWS_DDB_ETL_LOG = DynamoDBUtil(etl_log_table_name)

        execution_name = "1ebf165b-f846-4813-8cab-305be5c8ca7e"
        task_id = "00000000-0000-0000-0000-000000000000"
        end_time = datetime.datetime.now(datetime.UTC).isoformat()
        key = {"executionName": execution_name, "taskId": task_id}

        response = AWS_DDB_ETL_LOG.get_item(key=key)
        assert response["taskId"] == task_id
        assert response["status"] == "Running"
        assert response["endTime"] == ""

        AWS_DDB_ETL_LOG.delete_item(key=key)
        response = AWS_DDB_ETL_LOG.get_item(key=key, raise_if_not_found=False)
        assert response is None


class TestS3Client:

    def mock_s3_api_call(self, operation_name, kwarg):
        from botocore.exceptions import ClientError

        if operation_name == "DeleteBucketPolicy":
            if kwarg["Bucket"] == "test-delete-bucket-policy-return-exception":
                raise ClientError(
                    error_response={
                        "Error": {"Code": "400", "Message": "Invalid Token"}
                    },
                    operation_name=operation_name,
                )
            else:
                return {"ResponseMetadata": {"RequestId": "Qtu", "HTTPStatusCode": 200}}
        if operation_name == "PutBucketPolicy":
            if kwarg["Bucket"] == "test-update-bucket-policy-return-exception":
                raise ClientError(
                    error_response={
                        "Error": {"Code": "400", "Message": "Invalid Token"}
                    },
                    operation_name=operation_name,
                )
            else:
                return {"ResponseMetadata": {"RequestId": "Qtu", "HTTPStatusCode": 200}}
        elif operation_name == "GetBucketPolicy":
            if kwarg["Bucket"] == "test-delete-policy-bucket":
                return {
                    "Policy": '{"Version": "2012-10-17", "Statement": [{"Sid": "test", "Effect": "Allow"}]}'
                }
            elif kwarg["Bucket"] in (
                "test-update-policy-bucket",
                "test-update-bucket-policy-return-exception",
            ):
                return {"Policy": '{"Version": "2012-10-17", "Statement": []}'}
            elif kwarg["Bucket"] in ("test-delete-bucket-policy-return-exception"):
                return {
                    "Policy": '{"Version": "2012-10-17", "Statement": [{"Sid": "test"}]}'
                }
        elif operation_name == "GetBucketNotificationConfiguration":
            if kwarg["Bucket"] == "test-delete-notification-bucket":
                return {
                    "QueueConfigurations": [{"Id": "test", "QueueArn": "test"}],
                    "ResponseMetadata": {},
                }
            elif kwarg["Bucket"] in (
                "test-update-notification-bucket",
                "test-update-notification-bucket-return-exception",
            ):
                return {"QueueConfigurations": [], "ResponseMetadata": {}}
            elif kwarg["Bucket"] in (
                "test-delete-notification-bucket-return-exception"
            ):
                return {
                    "QueueConfigurations": [{"Id": "test", "QueueArn": "test"}],
                    "ResponseMetadata": {},
                }
        elif operation_name == "PutBucketNotificationConfiguration":
            if kwarg["Bucket"] in (
                "test-update-notification-bucket-return-exception",
                "test-delete-notification-bucket-return-exception",
            ):
                raise ClientError(
                    error_response={
                        "Error": {"Code": "400", "Message": "Invalid Token"}
                    },
                    operation_name=operation_name,
                )
            else:
                return {
                    "ResponseMetadata": {"RequestId": "Qtu", "HTTPStatusCode": 200},
                    "ResponseMetadata": {},
                }

    def test_list_all_objects(self, mock_s3_context):
        from utils.aws import S3Client

        staging_bucket_name = os.environ["STAGING_BUCKET_NAME"]
        account_id = os.environ.get("ACCOUNT_ID")

        s3_client = S3Client()

        contents = s3_client.list_all_objects(
            bucket=staging_bucket_name,
            prefix=f"AWSLogs/{account_id}/elasticloadbalancing/alb",
        )
        assert contents == [
            {"Key": "AWSLogs/123456789012/elasticloadbalancing/alb1.log", "Size": 8},
            {"Key": "AWSLogs/123456789012/elasticloadbalancing/alb2.log", "Size": 8},
            {"Key": "AWSLogs/123456789012/elasticloadbalancing/alb3.log", "Size": 8},
        ]

        contents = s3_client.list_all_objects(
            bucket=staging_bucket_name,
            prefix=f"AWSLogs/{account_id}/elasticloadbalancing/alb",
            max_records=2,
        )
        assert len(contents) == 2

        contents = s3_client.list_all_objects(
            bucket=staging_bucket_name, prefix=f"do-not-exits-prefix"
        )
        assert contents == []

        s3_client._s3_client.put_object(
            Bucket=staging_bucket_name,
            Key=f"AWSLogs/{account_id}/test_list_all_objects/empty-folder",
        )
        contents = s3_client.list_all_objects(
            bucket=staging_bucket_name,
            prefix=f"AWSLogs/{account_id}/test_list_all_objects",
        )
        assert contents == []

    def test_list_objects(self, mock_s3_context):
        from utils.aws import S3Client

        current_dir = os.path.dirname(os.path.abspath(__file__))
        staging_bucket_name = os.environ["STAGING_BUCKET_NAME"]
        account_id = os.environ.get("ACCOUNT_ID")

        s3_client = S3Client()

        contents = s3_client.list_objects(
            bucket=staging_bucket_name,
            prefix=f"AWSLogs/{account_id}/elasticloadbalancing/alb",
        )

        assert (
            next(contents)["Key"]
            == f"AWSLogs/{account_id}/elasticloadbalancing/alb1.log"
        )
        assert (
            next(contents)["Key"]
            == f"AWSLogs/{account_id}/elasticloadbalancing/alb2.log"
        )
        assert (
            next(contents)["Key"]
            == f"AWSLogs/{account_id}/elasticloadbalancing/alb3.log"
        )

        contents = s3_client.list_objects(
            bucket=staging_bucket_name,
            prefix=f"non-AWSLogs/{account_id}/elasticloadbalancing/alb",
        )
        object = [x for x in contents]
        assert object == []

    def test_download_file(self, mock_s3_context):
        from utils.aws import S3Client

        current_dir = os.path.dirname(os.path.abspath(__file__))
        staging_bucket_name = os.environ["STAGING_BUCKET_NAME"]
        account_id = os.environ.get("ACCOUNT_ID")

        s3_client = S3Client()

        key = f"test/S3Client/upload_file/apigateway1.gz"
        s3_client.upload_file(
            f"{current_dir}/data/apigateway1.gz", bucket=staging_bucket_name, key=key
        )

        tmp_path = f"/tmp/{str(uuid.uuid4())}"
        os.makedirs(name=tmp_path, exist_ok=True)
        local_filename = f"{tmp_path}/apigateway1.gz"
        s3_client.download_file(
            bucket=staging_bucket_name, key=key, filename=local_filename
        )
        assert os.path.exists(local_filename) is True
        os.remove(local_filename)

        tmp_path = f"/tmp/{str(uuid.uuid4())}"
        os.makedirs(name=tmp_path, exist_ok=True)
        local_filename = f"{tmp_path}/apigateway1.gz"
        s3_client.download_file(
            bucket=staging_bucket_name, key="do-not-exists", filename=local_filename
        )
        assert os.path.exists(local_filename) is False

        tmp_path = f"/tmp/{str(uuid.uuid4())}"
        os.makedirs(name=tmp_path, exist_ok=True)
        local_filename = f"{tmp_path}/apigateway1.gz"
        s3_client.download_file(
            bucket="do-not-exists", key="do-not-exists", filename=local_filename
        )
        assert os.path.exists(local_filename) is False

        local_filename = f"/tmp/{str(uuid.uuid4())}/do-not-exists"
        s3_client.download_file(
            bucket=staging_bucket_name, key=key, filename=local_filename
        )
        assert os.path.exists(local_filename) is False

    def test_upload_file(self, mock_s3_context):
        from utils.aws import S3Client

        current_dir = os.path.dirname(os.path.abspath(__file__))
        staging_bucket_name = os.environ["STAGING_BUCKET_NAME"]
        account_id = os.environ.get("ACCOUNT_ID")

        s3_client = S3Client()

        s3_client.upload_file(
            f"{current_dir}/data/apigateway1.gz",
            bucket=staging_bucket_name,
            key=f"test/S3Client/upload_file/apigateway1.gz",
        )
        contents = s3_client.list_objects(
            bucket=staging_bucket_name,
            prefix=f"test/S3Client/upload_file/apigateway1.gz",
        )
        assert next(contents)["Key"] == "test/S3Client/upload_file/apigateway1.gz"

        with pytest.raises(Exception) as exception_info:
            s3_client.upload_file(
                f"{current_dir}/data/apigateway.gz",
                bucket=staging_bucket_name,
                key=f"test/S3Client/upload_file/apigateway.gz",
            )
        assert exception_info.value.args[0] == 2

    def test_batch_copy_objects(
        self,
        mock_s3_context,
        mock_sqs_context,
        mock_iam_context,
        mock_ddb_context,
        mock_sts_context,
    ):
        from utils.aws import S3Client
        from utils.aws.s3 import Status

        current_dir = os.path.dirname(os.path.abspath(__file__))
        staging_bucket_name = os.environ["STAGING_BUCKET_NAME"]
        account_id = os.environ.get("ACCOUNT_ID")
        s3_objects_replication_role_arn = os.environ["S3_OBJECTS_REPLICATION_ROLE_ARN"]

        s3_client = S3Client()

        tasks = [
            {
                "source": {
                    "bucket": staging_bucket_name,
                    "key": f"AWSLogs/{account_id}/elasticloadbalancing/alb1.log",
                },
                "destination": {
                    "bucket": staging_bucket_name,
                    "key": f"test/batch_copy_objects/AWSLogs/{account_id}/elasticloadbalancing/alb1.log",
                },
            },
            {
                "source": {
                    "bucket": staging_bucket_name,
                    "key": f"AWSLogs/{account_id}/elasticloadbalancing/alb2.log",
                },
                "destination": {
                    "bucket": staging_bucket_name,
                    "key": f"test/batch_copy_objects/AWSLogs/{account_id}/elasticloadbalancing/alb2.log",
                },
            },
            {
                "source": {
                    "bucket": staging_bucket_name,
                    "key": f"AWSLogs/{account_id}/elasticloadbalancing/alb4.log",
                },
                "destination": {
                    "bucket": staging_bucket_name,
                    "key": f"test/batch_copy_objects/AWSLogs/{account_id}/elasticloadbalancing/alb4.log",
                },
            },
        ]
        assert (
            s3_client.batch_copy_objects(tasks, delete_on_success=False)
            is Status.FAILED
        )
        assert (
            s3_client.head_object(
                bucket=staging_bucket_name, key=tasks[0]["source"]["key"]
            )["ContentLength"]
            == 8
        )
        assert (
            s3_client.head_object(
                bucket=staging_bucket_name, key=tasks[1]["source"]["key"]
            )["ContentLength"]
            == 8
        )
        with pytest.raises(Exception) as exception_info:
            s3_client.head_object(
                bucket=staging_bucket_name, key=tasks[2]["source"]["key"]
            )
        assert (
            exception_info.value.args[0]
            == "An error occurred (404) when calling the HeadObject operation: Not Found"
        )
        assert (
            s3_client.head_object(
                bucket=staging_bucket_name, key=tasks[0]["destination"]["key"]
            )["ContentLength"]
            == 8
        )
        assert (
            s3_client.head_object(
                bucket=staging_bucket_name, key=tasks[1]["destination"]["key"]
            )["ContentLength"]
            == 8
        )
        with pytest.raises(Exception) as exception_info:
            s3_client.head_object(
                bucket=staging_bucket_name, key=tasks[2]["destination"]["key"]
            )
        assert (
            exception_info.value.args[0]
            == "An error occurred (404) when calling the HeadObject operation: Not Found"
        )

        # test enrichment
        def enrichment(record, enrich_plugins):
            return f"{record}\n"

        assert (
            s3_client.batch_copy_objects(
                tasks,
                delete_on_success=False,
                enrich_func=enrichment,
                enrich_plugins=set(),
            )
            is Status.FAILED
        )

        assert (
            s3_client.head_object(
                bucket=staging_bucket_name, key=tasks[0]["destination"]["key"]
            )["ContentLength"]
            == 9
        )
        assert (
            s3_client.head_object(
                bucket=staging_bucket_name, key=tasks[1]["destination"]["key"]
            )["ContentLength"]
            == 9
        )
        with pytest.raises(Exception) as exception_info:
            s3_client.head_object(
                bucket=staging_bucket_name, key=tasks[2]["source"]["key"]
            )

        test_has_role_tasks = [
            {
                "source": {
                    "role": s3_objects_replication_role_arn,
                    "bucket": staging_bucket_name,
                    "key": f"AWSLogs/{account_id}/elasticloadbalancing/alb1.log",
                },
                "destination": {
                    "bucket": staging_bucket_name,
                    "key": f"test/batch_copy_objects/AWSLogs/{account_id}/elasticloadbalancing/alb1.log",
                },
            }
        ]
        assert (
            s3_client.batch_copy_objects(test_has_role_tasks, delete_on_success=False)
            is Status.SUCCEEDED
        )
        assert (
            s3_client.head_object(
                bucket=staging_bucket_name, key=tasks[0]["destination"]["key"]
            )["ContentLength"]
            == 8
        )

        # test delete source object
        assert (
            s3_client.batch_copy_objects(tasks, delete_on_success=True) is Status.FAILED
        )
        with pytest.raises(Exception) as exception_info:
            s3_client.head_object(
                bucket=staging_bucket_name, key=tasks[0]["source"]["key"]
            )
        assert (
            exception_info.value.args[0]
            == "An error occurred (404) when calling the HeadObject operation: Not Found"
        )
        with pytest.raises(Exception) as exception_info:
            s3_client.head_object(
                bucket=staging_bucket_name, key=tasks[1]["source"]["key"]
            )
        assert (
            exception_info.value.args[0]
            == "An error occurred (404) when calling the HeadObject operation: Not Found"
        )
        with pytest.raises(Exception) as exception_info:
            s3_client.head_object(
                bucket=staging_bucket_name, key=tasks[2]["source"]["key"]
            )
        assert (
            exception_info.value.args[0]
            == "An error occurred (404) when calling the HeadObject operation: Not Found"
        )

    def test_batch_download_files(self, mock_s3_context):
        from utils.aws import S3Client

        current_dir = os.path.dirname(os.path.abspath(__file__))
        staging_bucket_name = os.environ.get("STAGING_BUCKET_NAME")
        account_id = os.environ.get("ACCOUNT_ID")

        s3_client = S3Client()

        tasks = [
            {
                "source": {
                    "bucket": staging_bucket_name,
                    "key": f"AWSLogs/{account_id}/elasticloadbalancing/alb1.log",
                },
                "destination": {
                    "bucket": staging_bucket_name,
                    "key": f"test/batch_download_files/AWSLogs/{account_id}/elasticloadbalancing/alb1.log",
                },
            },
            {
                "source": {
                    "bucket": staging_bucket_name,
                    "key": f"AWSLogs/{account_id}/elasticloadbalancing/alb2.log",
                },
                "destination": {
                    "bucket": staging_bucket_name,
                    "key": f"test/batch_download_files/AWSLogs/{account_id}/elasticloadbalancing/alb2.log",
                },
            },
            {
                "source": {
                    "bucket": staging_bucket_name,
                    "key": f"AWSLogs/{account_id}/elasticloadbalancing/alb4.log",
                },
                "destination": {
                    "bucket": staging_bucket_name,
                    "key": f"test/batch_download_files/AWSLogs/{account_id}/elasticloadbalancing/alb4.log",
                },
            },
        ]

        local_download_dir = Path(f"/tmp/{str(uuid.uuid4())}")
        os.makedirs(local_download_dir)
        file_path = s3_client.batch_download_files(tasks, local_download_dir)

        assert file_path == Path(f"{local_download_dir}/alb2.log")
        assert (
            local_download_dir / f"{os.path.basename(tasks[0]['source']['key'])}"
        ).exists() is True
        assert (
            local_download_dir / f"{os.path.basename(tasks[1]['source']['key'])}"
        ).exists() is True
        assert (
            local_download_dir / f"{os.path.basename(tasks[2]['source']['key'])}"
        ).exists() is False

        shutil.rmtree(local_download_dir)

        tasks = [
            {
                "source": {
                    "bucket": staging_bucket_name,
                    "key": f"AWSLogs/{account_id}/elasticloadbalancing/do-not-exists.log",
                },
                "destination": {
                    "bucket": staging_bucket_name,
                    "key": f"test/batch_download_files/AWSLogs/{account_id}/elasticloadbalancing/alb1.log",
                },
            }
        ]

        local_download_dir = Path(f"/tmp/{str(uuid.uuid4())}")
        os.makedirs(local_download_dir)
        file_path = s3_client.batch_download_files(
            tasks, local_download_dir, raise_if_fails=False
        )

        assert file_path == Path("")
        assert (
            local_download_dir / f"{os.path.basename(tasks[0]['source']['key'])}"
        ).exists() is False

        with pytest.raises(Exception) as exception_info:
            s3_client.batch_download_files(
                tasks, local_download_dir, raise_if_fails=True
            )
        assert (
            exception_info.value.args[0]
            == "An error occurred (404) when calling the HeadObject operation: Not Found"
        )

        shutil.rmtree(local_download_dir)

    def test_batch_delete_objects(self, mock_s3_context):
        from utils.aws import S3Client

        current_dir = os.path.dirname(os.path.abspath(__file__))
        staging_bucket_name = os.environ["STAGING_BUCKET_NAME"]
        account_id = os.environ.get("ACCOUNT_ID")

        s3_client = S3Client()

        tasks = []
        for i in range(2000):
            tasks.append(
                {
                    "source": {
                        "bucket": staging_bucket_name,
                        "key": f"AWSLogs/{account_id}/elasticloadbalancing/elb{str(i)}.log",
                    },
                    "destination": {
                        "bucket": staging_bucket_name,
                        "key": f"test/batch_delete_objects/AWSLogs/{account_id}/elasticloadbalancing/elb{str(i)}.log",
                    },
                }
            )
        tasks.append(
            {
                "source": {
                    "bucket": staging_bucket_name,
                    "key": f"AWSLogs/{account_id}/elasticloadbalancing/alb4.log",
                },
                "destination": {
                    "bucket": staging_bucket_name,
                    "key": f"test/batch_delete_objects/AWSLogs/{account_id}/elasticloadbalancing/alb4.log",
                },
            }
        )

        s3_client.batch_delete_objects(tasks)
        contents = s3_client.list_objects(
            bucket=staging_bucket_name,
            prefix=f"AWSLogs/{account_id}/elasticloadbalancing/elb",
        )
        with pytest.raises(StopIteration):
            next(contents)

    def test_merge_objects(self, mock_s3_context):
        from utils.aws import S3Client
        from utils.aws.s3 import Status

        current_dir = os.path.dirname(os.path.abspath(__file__))
        staging_bucket_name = os.environ["STAGING_BUCKET_NAME"]
        account_id = os.environ["ACCOUNT_ID"]
        aws_region = os.environ["AWS_REGION"]

        s3_client = S3Client()

        no_task = []
        assert (
            s3_client.merge_objects(no_task, delete_on_success=False)
            is Status.SUCCEEDED
        )

        not_exist_source_bucket_task = [
            {
                "source": {
                    "bucket": "not-exists-bucket",
                    "key": f"AWSLogs/{account_id}/elasticloadbalancing/elb1.log",
                },
                "destination": {
                    "bucket": staging_bucket_name,
                    "key": f"test/merge_objects/AWSLogs/{account_id}/elasticloadbalancing/elb1.log",
                },
            }
        ]
        assert (
            s3_client.merge_objects(
                not_exist_source_bucket_task, delete_on_success=False
            )
            is Status.FAILED
        )
        with pytest.raises(Exception) as exception_info:
            s3_client.head_object(
                bucket=staging_bucket_name,
                key=not_exist_source_bucket_task[0]["destination"]["key"],
            )
        assert (
            exception_info.value.args[0]
            == "An error occurred (404) when calling the HeadObject operation: Not Found"
        )

        not_exist_destination_bucket_task = [
            {
                "source": {
                    "bucket": staging_bucket_name,
                    "key": f"AWSLogs/{account_id}/elasticloadbalancing/elb1.log",
                },
                "destination": {
                    "bucket": "not-exists-bucket",
                    "key": f"test/merge_objects/AWSLogs/{account_id}/elasticloadbalancing/elb1.log",
                },
            }
        ]

        assert (
            s3_client.merge_objects(
                not_exist_destination_bucket_task, delete_on_success=False
            )
            is Status.FAILED
        )

        only_one_task = [
            {
                "source": {
                    "bucket": staging_bucket_name,
                    "key": f"AWSLogs/{account_id}/elasticloadbalancing/elb1.log",
                },
                "destination": {
                    "bucket": staging_bucket_name,
                    "key": f"test/merge_objects/AWSLogs/{account_id}/elasticloadbalancing/elb1.log",
                },
            }
        ]
        assert (
            s3_client.merge_objects(only_one_task, delete_on_success=False)
            is Status.SUCCEEDED
        )
        assert (
            s3_client.head_object(
                bucket=staging_bucket_name, key=only_one_task[0]["source"]["key"]
            )["ContentLength"]
            == 8
        )
        assert (
            s3_client.head_object(
                bucket=staging_bucket_name, key=only_one_task[0]["destination"]["key"]
            )["ContentLength"]
            == 8
        )

        assert (
            s3_client.merge_objects(only_one_task, delete_on_success=True)
            is Status.SUCCEEDED
        )
        with pytest.raises(Exception) as exception_info:
            s3_client.head_object(
                bucket=staging_bucket_name, key=only_one_task[0]["source"]["key"]
            )
        assert (
            exception_info.value.args[0]
            == "An error occurred (404) when calling the HeadObject operation: Not Found"
        )
        assert (
            s3_client.head_object(
                bucket=staging_bucket_name, key=only_one_task[0]["destination"]["key"]
            )["ContentLength"]
            == 8
        )

        file_not_exists_task = [
            {
                "source": {
                    "bucket": staging_bucket_name,
                    "key": f"AWSLogs/{account_id}/elasticloadbalancing/alb.log",
                },
                "destination": {
                    "bucket": staging_bucket_name,
                    "key": f"test/merge_objects/AWSLogs/{account_id}/elasticloadbalancing/alb.log",
                },
            }
        ]
        assert (
            s3_client.merge_objects(only_one_task, delete_on_success=False)
            is Status.FAILED
        )
        with pytest.raises(Exception) as exception_info:
            s3_client.head_object(
                bucket=staging_bucket_name, key=file_not_exists_task[0]["source"]["key"]
            )
        assert (
            exception_info.value.args[0]
            == "An error occurred (404) when calling the HeadObject operation: Not Found"
        )
        with pytest.raises(Exception) as exception_info:
            s3_client.head_object(
                bucket=staging_bucket_name,
                key=file_not_exists_task[0]["destination"]["key"],
            )
        assert (
            exception_info.value.args[0]
            == "An error occurred (404) when calling the HeadObject operation: Not Found"
        )

        merge_text_tasks = [
            {
                "source": {
                    "bucket": staging_bucket_name,
                    "key": f"AWSLogs/{account_id}/elasticloadbalancing/alb1.log",
                },
                "destination": {
                    "bucket": staging_bucket_name,
                    "key": f"test/merge_objects_text/AWSLogs/{account_id}/elasticloadbalancing/alb1.log",
                },
            },
            {
                "source": {
                    "bucket": staging_bucket_name,
                    "key": f"AWSLogs/{account_id}/elasticloadbalancing/alb2.log",
                },
                "destination": {
                    "bucket": staging_bucket_name,
                    "key": f"test/merge_objects_text/AWSLogs/{account_id}/elasticloadbalancing/alb2.log",
                },
            },
            {
                "source": {
                    "bucket": staging_bucket_name,
                    "key": f"AWSLogs/{account_id}/elasticloadbalancing/alb3.log",
                },
                "destination": {
                    "bucket": staging_bucket_name,
                    "key": f"test/merge_objects_text/AWSLogs/{account_id}/elasticloadbalancing/alb3.log",
                },
            },
        ]

        assert (
            s3_client.merge_objects(
                merge_text_tasks, delete_on_success=False, max_size=16
            )
            is Status.SUCCEEDED
        )
        assert (
            s3_client.head_object(
                bucket=staging_bucket_name,
                key=merge_text_tasks[0]["destination"]["key"],
            )["ContentLength"]
            == 24
        )
        with pytest.raises(Exception) as exception_info:
            s3_client.head_object(
                bucket=staging_bucket_name,
                key=merge_text_tasks[1]["destination"]["key"],
            )
        assert (
            exception_info.value.args[0]
            == "An error occurred (404) when calling the HeadObject operation: Not Found"
        )
        with pytest.raises(Exception) as exception_info:
            s3_client.head_object(
                bucket=staging_bucket_name,
                key=merge_text_tasks[2]["destination"]["key"],
            )
        assert (
            exception_info.value.args[0]
            == "An error occurred (404) when calling the HeadObject operation: Not Found"
        )

        assert (
            s3_client.head_object(
                bucket=staging_bucket_name, key=merge_text_tasks[0]["source"]["key"]
            )["ContentLength"]
            == 8
        )
        assert (
            s3_client.head_object(
                bucket=staging_bucket_name, key=merge_text_tasks[1]["source"]["key"]
            )["ContentLength"]
            == 8
        )
        assert (
            s3_client.head_object(
                bucket=staging_bucket_name, key=merge_text_tasks[2]["source"]["key"]
            )["ContentLength"]
            == 8
        )

        assert (
            s3_client.merge_objects(merge_text_tasks, delete_on_success=True)
            is Status.SUCCEEDED
        )
        assert (
            s3_client.head_object(
                bucket=staging_bucket_name,
                key=merge_text_tasks[0]["destination"]["key"],
            )["ContentLength"]
            == 24
        )
        with pytest.raises(Exception) as exception_info:
            s3_client.head_object(
                bucket=staging_bucket_name,
                key=merge_text_tasks[1]["destination"]["key"],
            )
        assert (
            exception_info.value.args[0]
            == "An error occurred (404) when calling the HeadObject operation: Not Found"
        )
        with pytest.raises(Exception) as exception_info:
            s3_client.head_object(
                bucket=staging_bucket_name,
                key=merge_text_tasks[2]["destination"]["key"],
            )
        assert (
            exception_info.value.args[0]
            == "An error occurred (404) when calling the HeadObject operation: Not Found"
        )

        with pytest.raises(Exception) as exception_info:
            s3_client.head_object(
                bucket=staging_bucket_name, key=merge_text_tasks[0]["source"]["key"]
            )
        assert (
            exception_info.value.args[0]
            == "An error occurred (404) when calling the HeadObject operation: Not Found"
        )
        with pytest.raises(Exception) as exception_info:
            s3_client.head_object(
                bucket=staging_bucket_name, key=merge_text_tasks[1]["source"]["key"]
            )
        assert (
            exception_info.value.args[0]
            == "An error occurred (404) when calling the HeadObject operation: Not Found"
        )
        with pytest.raises(Exception) as exception_info:
            s3_client.head_object(
                bucket=staging_bucket_name, key=merge_text_tasks[2]["source"]["key"]
            )
        assert (
            exception_info.value.args[0]
            == "An error occurred (404) when calling the HeadObject operation: Not Found"
        )

        merge_gzip_tasks = [
            {
                "source": {
                    "bucket": staging_bucket_name,
                    "key": f"AWSLogs/{account_id}/centralized/aws_apigateway_logs_gz/__ds__=2023-03-11-20-01/region={aws_region}/__execution_name__=b49a793b-38d2-40c0-af22-cfacf494732e/apigateway1.gz",
                },
                "destination": {
                    "bucket": staging_bucket_name,
                    "key": f"test/merge_objects_gzip/AWSLogs/{account_id}/centralized/aws_apigateway_logs_gz/__ds__=2023-03-11-20-01/region={aws_region}/__execution_name__=b49a793b-38d2-40c0-af22-cfacf494732e/apigateway1.gz",
                },
            },
            {
                "source": {
                    "bucket": staging_bucket_name,
                    "key": f"AWSLogs/{account_id}/centralized/aws_apigateway_logs_gz/__ds__=2023-03-11-20-01/region={aws_region}/__execution_name__=b49a793b-38d2-40c0-af22-cfacf494732e/apigateway2.gz",
                },
                "destination": {
                    "bucket": staging_bucket_name,
                    "key": f"test/merge_objects_gzip/AWSLogs/{account_id}/centralized/aws_apigateway_logs_gz/__ds__=2023-03-11-20-01/region={aws_region}/__execution_name__=b49a793b-38d2-40c0-af22-cfacf494732e/apigateway2.gz",
                },
            },
            {
                "source": {
                    "bucket": staging_bucket_name,
                    "key": f"AWSLogs/{account_id}/centralized/aws_apigateway_logs_gz/__ds__=2023-03-11-20-01/region={aws_region}/__execution_name__=b49a793b-38d2-40c0-af22-cfacf494732e/apigateway3.gz",
                },
                "destination": {
                    "bucket": staging_bucket_name,
                    "key": f"test/merge_objects_gzip/AWSLogs/{account_id}/centralized/aws_apigateway_logs_gz/__ds__=2023-03-11-20-01/region={aws_region}/__execution_name__=b49a793b-38d2-40c0-af22-cfacf494732e/apigateway3.gz",
                },
            },
        ]

        assert (
            s3_client.merge_objects(
                merge_gzip_tasks, delete_on_success=False, max_size=16
            )
            is Status.SUCCEEDED
        )
        assert (
            s3_client.head_object(
                bucket=staging_bucket_name,
                key=merge_gzip_tasks[0]["destination"]["key"],
            )["ContentLength"]
            > 2478
        )
        # s3_client.batch_download_files([{'source': {'bucket': staging_bucket_name, 'key': merge_gzip_tasks[0]['destination']['key']}}], '/tmp/')
        with pytest.raises(Exception) as exception_info:
            s3_client.head_object(
                bucket=staging_bucket_name,
                key=merge_gzip_tasks[1]["destination"]["key"],
            )
        assert (
            exception_info.value.args[0]
            == "An error occurred (404) when calling the HeadObject operation: Not Found"
        )
        with pytest.raises(Exception) as exception_info:
            s3_client.head_object(
                bucket=staging_bucket_name,
                key=merge_gzip_tasks[2]["destination"]["key"],
            )
        assert (
            exception_info.value.args[0]
            == "An error occurred (404) when calling the HeadObject operation: Not Found"
        )

        assert (
            s3_client.head_object(
                bucket=staging_bucket_name, key=merge_gzip_tasks[0]["source"]["key"]
            )["ContentLength"]
            == 2705
        )
        assert (
            s3_client.head_object(
                bucket=staging_bucket_name, key=merge_gzip_tasks[1]["source"]["key"]
            )["ContentLength"]
            == 2478
        )
        assert (
            s3_client.head_object(
                bucket=staging_bucket_name, key=merge_gzip_tasks[2]["source"]["key"]
            )["ContentLength"]
            == 2467
        )

        assert (
            s3_client.merge_objects(merge_gzip_tasks, delete_on_success=True)
            is Status.SUCCEEDED
        )
        assert (
            s3_client.head_object(
                bucket=staging_bucket_name,
                key=merge_gzip_tasks[0]["destination"]["key"],
            )["ContentLength"]
            > 2478
        )
        with pytest.raises(Exception) as exception_info:
            s3_client.head_object(
                bucket=staging_bucket_name,
                key=merge_gzip_tasks[1]["destination"]["key"],
            )
        assert (
            exception_info.value.args[0]
            == "An error occurred (404) when calling the HeadObject operation: Not Found"
        )
        with pytest.raises(Exception) as exception_info:
            s3_client.head_object(
                bucket=staging_bucket_name,
                key=merge_gzip_tasks[2]["destination"]["key"],
            )
        assert (
            exception_info.value.args[0]
            == "An error occurred (404) when calling the HeadObject operation: Not Found"
        )

        with pytest.raises(Exception) as exception_info:
            s3_client.head_object(
                bucket=staging_bucket_name, key=merge_gzip_tasks[0]["source"]["key"]
            )
        assert (
            exception_info.value.args[0]
            == "An error occurred (404) when calling the HeadObject operation: Not Found"
        )
        with pytest.raises(Exception) as exception_info:
            s3_client.head_object(
                bucket=staging_bucket_name, key=merge_gzip_tasks[1]["source"]["key"]
            )
        assert (
            exception_info.value.args[0]
            == "An error occurred (404) when calling the HeadObject operation: Not Found"
        )
        with pytest.raises(Exception) as exception_info:
            s3_client.head_object(
                bucket=staging_bucket_name, key=merge_gzip_tasks[2]["source"]["key"]
            )
        assert (
            exception_info.value.args[0]
            == "An error occurred (404) when calling the HeadObject operation: Not Found"
        )

        merge_parquet_tasks = [
            {
                "source": {
                    "bucket": staging_bucket_name,
                    "key": f"AWSLogs/{account_id}/centralized/aws_apigateway_logs_parquet/__ds__=2023-03-11-20-01/region={aws_region}/__execution_name__=b49a793b-38d2-40c0-af22-cfacf494732e/apigateway1.parquet",
                },
                "destination": {
                    "bucket": staging_bucket_name,
                    "key": f"test/merge_objects_parquet/AWSLogs/{account_id}/centralized/aws_apigateway_logs_parquet/__ds__=2023-03-11-20-01/region={aws_region}/__execution_name__=b49a793b-38d2-40c0-af22-cfacf494732e/apigateway1.parquet",
                },
            },
            {
                "source": {
                    "bucket": staging_bucket_name,
                    "key": f"AWSLogs/{account_id}/centralized/aws_apigateway_logs_parquet/__ds__=2023-03-11-18-01/region={aws_region}/__execution_name__=b49a793b-38d2-40c0-af22-cfacf494732e/apigateway2.parquet",
                },
                "destination": {
                    "bucket": staging_bucket_name,
                    "key": f"test/merge_objects_parquet/AWSLogs/{account_id}/centralized/aws_apigateway_logs_parquet/__ds__=2023-03-11-18-01/region={aws_region}/__execution_name__=b49a793b-38d2-40c0-af22-cfacf494732e/apigateway2.parquet",
                },
            },
            {
                "source": {
                    "bucket": staging_bucket_name,
                    "key": f"AWSLogs/{account_id}/centralized/aws_apigateway_logs_parquet/__ds__=2023-03-11-18-01/region={aws_region}/__execution_name__=b49a793b-38d2-40c0-af22-cfacf494732e/apigateway3.parquet",
                },
                "destination": {
                    "bucket": staging_bucket_name,
                    "key": f"test/merge_objects_parquet/AWSLogs/{account_id}/centralized/aws_apigateway_logs_parquet/__ds__=2023-03-11-18-01/region={aws_region}/__execution_name__=b49a793b-38d2-40c0-af22-cfacf494732e/apigateway3.parquet",
                },
            },
        ]

        assert (
            s3_client.merge_objects(
                merge_parquet_tasks, delete_on_success=False, max_size=1024
            )
            is Status.SUCCEEDED
        )
        assert (
            s3_client.head_object(
                bucket=staging_bucket_name,
                key=merge_parquet_tasks[0]["destination"]["key"],
            )["ContentLength"]
            > 36347
        )
        # s3_client.batch_download_files([{'source': {'bucket': staging_bucket_name, 'key': merge_gzip_tasks[0]['destination']['key']}}], '/tmp/')
        with pytest.raises(Exception) as exception_info:
            s3_client.head_object(
                bucket=staging_bucket_name,
                key=merge_parquet_tasks[1]["destination"]["key"],
            )
        assert (
            exception_info.value.args[0]
            == "An error occurred (404) when calling the HeadObject operation: Not Found"
        )
        with pytest.raises(Exception) as exception_info:
            s3_client.head_object(
                bucket=staging_bucket_name,
                key=merge_parquet_tasks[2]["destination"]["key"],
            )
        assert (
            exception_info.value.args[0]
            == "An error occurred (404) when calling the HeadObject operation: Not Found"
        )

        assert (
            s3_client.head_object(
                bucket=staging_bucket_name, key=merge_parquet_tasks[0]["source"]["key"]
            )["ContentLength"]
            == 36347
        )
        assert (
            s3_client.head_object(
                bucket=staging_bucket_name, key=merge_parquet_tasks[1]["source"]["key"]
            )["ContentLength"]
            == 36332
        )
        assert (
            s3_client.head_object(
                bucket=staging_bucket_name, key=merge_parquet_tasks[2]["source"]["key"]
            )["ContentLength"]
            == 36329
        )

        assert (
            s3_client.merge_objects(merge_parquet_tasks, delete_on_success=True)
            is Status.SUCCEEDED
        )
        assert (
            s3_client.head_object(
                bucket=staging_bucket_name,
                key=merge_parquet_tasks[0]["destination"]["key"],
            )["ContentLength"]
            > 36347
        )
        with pytest.raises(Exception) as exception_info:
            s3_client.head_object(
                bucket=staging_bucket_name,
                key=merge_parquet_tasks[1]["destination"]["key"],
            )
        assert (
            exception_info.value.args[0]
            == "An error occurred (404) when calling the HeadObject operation: Not Found"
        )
        with pytest.raises(Exception) as exception_info:
            s3_client.head_object(
                bucket=staging_bucket_name,
                key=merge_parquet_tasks[2]["destination"]["key"],
            )
        assert (
            exception_info.value.args[0]
            == "An error occurred (404) when calling the HeadObject operation: Not Found"
        )

        with pytest.raises(Exception) as exception_info:
            s3_client.head_object(
                bucket=staging_bucket_name, key=merge_parquet_tasks[0]["source"]["key"]
            )
        assert (
            exception_info.value.args[0]
            == "An error occurred (404) when calling the HeadObject operation: Not Found"
        )
        with pytest.raises(Exception) as exception_info:
            s3_client.head_object(
                bucket=staging_bucket_name, key=merge_parquet_tasks[1]["source"]["key"]
            )
        assert (
            exception_info.value.args[0]
            == "An error occurred (404) when calling the HeadObject operation: Not Found"
        )
        with pytest.raises(Exception) as exception_info:
            s3_client.head_object(
                bucket=staging_bucket_name, key=merge_parquet_tasks[2]["source"]["key"]
            )
        assert (
            exception_info.value.args[0]
            == "An error occurred (404) when calling the HeadObject operation: Not Found"
        )

        s3_client.delete_object(
            bucket=staging_bucket_name,
            key=f"test/merge_objects_parquet/AWSLogs/{account_id}/centralized/aws_apigateway_logs_parquet/__ds__=2023-03-11-20-01/region={aws_region}/__execution_name__=b49a793b-38d2-40c0-af22-cfacf494732e/apigateway1.parquet",
        )
        s3_client.delete_object(
            bucket=staging_bucket_name,
            key=f"test/merge_objects_parquet/AWSLogs/{account_id}/centralized/aws_apigateway_logs_parquet/__ds__=2023-03-11-20-01/region={aws_region}/__execution_name__=b49a793b-38d2-40c0-af22-cfacf494732e/apigateway2.parquet",
        )
        s3_client.delete_object(
            bucket=staging_bucket_name,
            key=f"test/merge_objects_parquet/AWSLogs/{account_id}/centralized/aws_apigateway_logs_gz/__ds__=2023-03-11-20-01/region={aws_region}/__execution_name__=b49a793b-38d2-40c0-af22-cfacf494732e/apigateway3.gz",
        )

        s3_client.upload_file(
            f"{current_dir}/data/apigateway1.parquet",
            bucket=staging_bucket_name,
            key=f"AWSLogs/{account_id}/centralized/aws_apigateway_logs_parquet/__ds__=2023-03-11-20-01/region={aws_region}/__execution_name__=b49a793b-38d2-40c0-af22-cfacf494732e/apigateway1.parquet",
        )
        s3_client.upload_file(
            f"{current_dir}/data/apigateway2.parquet",
            bucket=staging_bucket_name,
            key=f"AWSLogs/{account_id}/centralized/aws_apigateway_logs_parquet/__ds__=2023-03-11-18-01/region={aws_region}/__execution_name__=b49a793b-38d2-40c0-af22-cfacf494732e/apigateway2.parquet",
        )
        s3_client.upload_file(
            f"{current_dir}/data/apigateway3.gz",
            bucket=staging_bucket_name,
            key=f"AWSLogs/{account_id}/centralized/aws_apigateway_logs_gz/__ds__=2023-03-11-20-01/region={aws_region}/__execution_name__=b49a793b-38d2-40c0-af22-cfacf494732e/apigateway3.gz",
        )

        merge_multi_type_tasks = [
            {
                "source": {
                    "bucket": staging_bucket_name,
                    "key": f"AWSLogs/{account_id}/centralized/aws_apigateway_logs_parquet/__ds__=2023-03-11-20-01/region={aws_region}/__execution_name__=b49a793b-38d2-40c0-af22-cfacf494732e/apigateway1.parquet",
                },
                "destination": {
                    "bucket": staging_bucket_name,
                    "key": f"test/merge_objects_parquet/AWSLogs/{account_id}/centralized/aws_apigateway_logs_parquet/__ds__=2023-03-11-20-01/region={aws_region}/__execution_name__=b49a793b-38d2-40c0-af22-cfacf494732e/apigateway1.parquet",
                },
            },
            {
                "source": {
                    "bucket": staging_bucket_name,
                    "key": f"AWSLogs/{account_id}/centralized/aws_apigateway_logs_parquet/__ds__=2023-03-11-18-01/region={aws_region}/__execution_name__=b49a793b-38d2-40c0-af22-cfacf494732e/apigateway2.parquet",
                },
                "destination": {
                    "bucket": staging_bucket_name,
                    "key": f"test/merge_objects_parquet/AWSLogs/{account_id}/centralized/aws_apigateway_logs_parquet/__ds__=2023-03-11-18-01/region={aws_region}/__execution_name__=b49a793b-38d2-40c0-af22-cfacf494732e/apigateway2.parquet",
                },
            },
            {
                "source": {
                    "bucket": staging_bucket_name,
                    "key": f"AWSLogs/{account_id}/centralized/aws_apigateway_logs_gz/__ds__=2023-03-11-20-01/region={aws_region}/__execution_name__=b49a793b-38d2-40c0-af22-cfacf494732e/apigateway3.gz",
                },
                "destination": {
                    "bucket": staging_bucket_name,
                    "key": f"test/merge_objects_parquet/AWSLogs/{account_id}/centralized/aws_apigateway_logs_gz/__ds__=2023-03-11-20-01/region={aws_region}/__execution_name__=b49a793b-38d2-40c0-af22-cfacf494732e/apigateway3.gz",
                },
            },
        ]

        assert (
            s3_client.merge_objects(merge_multi_type_tasks, delete_on_success=True)
            is Status.FAILED
        )
        assert (
            s3_client.head_object(
                bucket=staging_bucket_name,
                key=merge_multi_type_tasks[0]["source"]["key"],
            )["ContentLength"]
            == 36347
        )
        with pytest.raises(Exception) as exception_info:
            s3_client.head_object(
                bucket=staging_bucket_name,
                key=merge_multi_type_tasks[0]["destination"]["key"],
            )
        assert (
            exception_info.value.args[0]
            == "An error occurred (404) when calling the HeadObject operation: Not Found"
        )
        with pytest.raises(Exception) as exception_info:
            s3_client.head_object(
                bucket=staging_bucket_name,
                key=merge_multi_type_tasks[1]["destination"]["key"],
            )
        assert (
            exception_info.value.args[0]
            == "An error occurred (404) when calling the HeadObject operation: Not Found"
        )
        with pytest.raises(Exception) as exception_info:
            s3_client.head_object(
                bucket=staging_bucket_name,
                key=merge_multi_type_tasks[2]["destination"]["key"],
            )
        assert (
            exception_info.value.args[0]
            == "An error occurred (404) when calling the HeadObject operation: Not Found"
        )

    def test_delete_object(self, mock_s3_context):
        from utils.aws import S3Client

        current_dir = os.path.dirname(os.path.abspath(__file__))
        staging_bucket_name = os.environ["STAGING_BUCKET_NAME"]
        account_id = os.environ["ACCOUNT_ID"]
        aws_region = os.environ["AWS_REGION"]

        s3_client = S3Client()

        s3_client.delete_object(
            bucket=staging_bucket_name,
            key=f"AWSLogs/{account_id}/elasticloadbalancing/alb1.log",
        )
        with pytest.raises(Exception) as exception_info:
            assert s3_client.head_object(
                bucket=staging_bucket_name,
                key=f"AWSLogs/{account_id}/elasticloadbalancing/alb1.log",
            )
        assert (
            exception_info.value.args[0]
            == "An error occurred (404) when calling the HeadObject operation: Not Found"
        )

    def test_is_exists_buckett(self, mock_s3_context):
        from utils.aws import S3Client

        current_dir = os.path.dirname(os.path.abspath(__file__))
        staging_bucket_name = os.environ["STAGING_BUCKET_NAME"]
        account_id = os.environ["ACCOUNT_ID"]
        aws_region = os.environ["AWS_REGION"]

        s3_client = S3Client()

        assert (
            s3_client.is_exists_bucket(bucket=staging_bucket_name)["ResponseMetadata"][
                "HTTPStatusCode"
            ]
            == 200
        )
        with pytest.raises(Exception) as exception_info:
            assert s3_client.is_exists_bucket(bucket="nonbucket")
        assert (
            exception_info.value.args[0]
            == "An error occurred (404) when calling the HeadBucket operation: Not Found"
        )

    def test_get_bucket_arn_from_name(self, mock_s3_context):
        from utils.aws import S3Client

        staging_bucket_name = os.environ["STAGING_BUCKET_NAME"]

        s3_client = S3Client()
        assert (
            s3_client.get_bucket_arn_from_name(bucket=staging_bucket_name)
            == f"arn:aws:s3:::{staging_bucket_name}"
        )

    def test_get_bucket_notification(self, mock_s3_context, mock_sqs_context):
        from utils.aws import S3Client

        staging_bucket_name = os.environ["STAGING_BUCKET_NAME"]
        s3_objects_scanning_function_arn = os.environ[
            "S3_OBJECTS_SCANNING_FUNCTION_ARN"
        ]
        migration_sqs_arn = os.environ["MIGRATION_SQS_ARN"]

        boto3_s3_client = boto3.client("s3")

        s3_client = S3Client()
        response = s3_client.get_bucket_notification(bucket=staging_bucket_name)
        assert response == {}

        lambda_notification_id = str(uuid.uuid4())
        lambda_notification = {
            "Id": lambda_notification_id,
            "LambdaFunctionArn": s3_objects_scanning_function_arn,
            "Events": [
                "s3:ObjectCreated:*",
            ],
            "Filter": {
                "Key": {
                    "FilterRules": [
                        {"Name": "prefix", "Value": "AWSLogs/123456789012"},
                    ]
                }
            },
        }
        existing_queue_notification = {
            "Id": "test",
            "QueueArn": migration_sqs_arn,
            "Events": ["s3:ObjectCreated:*"],
            "Filter": {
                "Key": {
                    "FilterRules": [{"Name": "prefix", "Value": "AWSLogs/987654321021"}]
                }
            },
        }
        boto3_s3_client.put_bucket_notification_configuration(
            Bucket=staging_bucket_name,
            NotificationConfiguration={
                "LambdaFunctionConfigurations": [lambda_notification],
                "EventBridgeConfiguration": {},
            },
        )
        response = s3_client.get_bucket_notification(bucket=staging_bucket_name)
        with pytest.raises(KeyError):
            response["TopicConfigurations"]
        with pytest.raises(KeyError):
            response["QueueConfigurations"]
        assert response["LambdaFunctionConfigurations"] == [lambda_notification]
        # assert response['EventBridgeConfiguration'] == {}

        boto3_s3_client.put_bucket_notification_configuration(
            Bucket=staging_bucket_name,
            NotificationConfiguration={
                "LambdaFunctionConfigurations": [lambda_notification]
            },
        )
        response = s3_client.get_bucket_notification(
            bucket=staging_bucket_name, exclusive={}
        )
        with pytest.raises(KeyError):
            response["TopicConfigurations"]
        with pytest.raises(KeyError):
            response["QueueConfigurations"]
        assert response["LambdaFunctionConfigurations"] == [lambda_notification]
        with pytest.raises(KeyError):
            response["EventBridgeConfiguration"]

        boto3_s3_client.put_bucket_notification_configuration(
            Bucket=staging_bucket_name,
            NotificationConfiguration={
                "LambdaFunctionConfigurations": [lambda_notification],
                "QueueConfigurations": [existing_queue_notification],
            },
        )
        filter = {
            "LambdaFunctionConfigurations": [lambda_notification_id],
            "EventBridgeConfiguration": ["test"],
            "QueueConfigurations": ["test"],
        }
        response = s3_client.get_bucket_notification(
            bucket=staging_bucket_name, exclusive=filter
        )
        with pytest.raises(KeyError):
            response["TopicConfigurations"]
        assert response["QueueConfigurations"] == []
        assert response["LambdaFunctionConfigurations"] == []
        with pytest.raises(KeyError):
            response["EventBridgeConfiguration"]

    def test_update_bucket_notification(self, mock_s3_context, mock_sqs_context):
        from utils.aws import S3Client
        from unittest.mock import patch
        from botocore.exceptions import ClientError

        staging_bucket_name = os.environ["STAGING_BUCKET_NAME"]
        s3_objects_scanning_function_arn = os.environ[
            "S3_OBJECTS_SCANNING_FUNCTION_ARN"
        ]
        migration_sqs_arn = os.environ["MIGRATION_SQS_ARN"]

        boto3_s3_client = boto3.client("s3")

        s3_client = S3Client()
        s3_client.update_bucket_notification(
            bucket=staging_bucket_name,
            prefix="AWSLogs/123456789012",
            notification_id="test",
            queue_arn=migration_sqs_arn,
        )

        queue_notification = {
            "Id": "test",
            "QueueArn": migration_sqs_arn,
            "Events": ["s3:ObjectCreated:*"],
            "Filter": {
                "Key": {
                    "FilterRules": [{"Name": "prefix", "Value": "AWSLogs/123456789012"}]
                }
            },
        }

        response = s3_client.get_bucket_notification(bucket=staging_bucket_name)
        assert response["QueueConfigurations"] == [queue_notification]

        # repeat create
        s3_client.update_bucket_notification(
            bucket=staging_bucket_name,
            prefix="AWSLogs/123456789012",
            notification_id="test",
            queue_arn=migration_sqs_arn,
        )
        response = s3_client.get_bucket_notification(bucket=staging_bucket_name)
        assert response["QueueConfigurations"] == [queue_notification]

        # update existing configuration
        lambda_notification = {
            "Id": str(uuid.uuid4()),
            "LambdaFunctionArn": s3_objects_scanning_function_arn,
            "Events": [
                "s3:ObjectCreated:*",
            ],
            "Filter": {
                "Key": {
                    "FilterRules": [
                        {"Name": "prefix", "Value": "AWSLogs/123456789012"},
                    ]
                }
            },
        }
        existing_queue_notification = {
            "Id": "test",
            "QueueArn": migration_sqs_arn,
            "Events": ["s3:ObjectCreated:*"],
            "Filter": {
                "Key": {
                    "FilterRules": [{"Name": "prefix", "Value": "AWSLogs/987654321021"}]
                }
            },
        }
        boto3_s3_client.put_bucket_notification_configuration(
            Bucket=staging_bucket_name,
            NotificationConfiguration={
                "LambdaFunctionConfigurations": [lambda_notification],
                "QueueConfigurations": [existing_queue_notification],
            },
        )
        s3_client.update_bucket_notification(
            bucket=staging_bucket_name,
            prefix="AWSLogs/123456789012",
            notification_id="test",
            queue_arn=migration_sqs_arn,
        )
        response = s3_client.get_bucket_notification(bucket=staging_bucket_name)
        assert response["LambdaFunctionConfigurations"] == [lambda_notification]
        assert response["QueueConfigurations"] == [queue_notification]

        # create a new queue configuration
        lambda_notification = {
            "Id": str(uuid.uuid4()),
            "LambdaFunctionArn": s3_objects_scanning_function_arn,
            "Events": [
                "s3:ObjectCreated:*",
            ],
            "Filter": {
                "Key": {
                    "FilterRules": [
                        {"Name": "prefix", "Value": "AWSLogs/123456789012"},
                    ]
                }
            },
        }
        existing_queue_notification["Id"] = "no-exist-id"
        boto3_s3_client.put_bucket_notification_configuration(
            Bucket=staging_bucket_name,
            NotificationConfiguration={
                "LambdaFunctionConfigurations": [lambda_notification],
                "QueueConfigurations": [existing_queue_notification],
            },
        )
        s3_client.update_bucket_notification(
            bucket=staging_bucket_name,
            prefix="AWSLogs/123456789012",
            notification_id="test",
            queue_arn=migration_sqs_arn,
        )
        response = s3_client.get_bucket_notification(bucket=staging_bucket_name)
        assert response["LambdaFunctionConfigurations"] == [lambda_notification]
        assert response["QueueConfigurations"] == [
            existing_queue_notification,
            queue_notification,
        ]

        # mock a update notification is not success.
        with patch(
            "botocore.client.BaseClient._make_api_call", new=self.mock_s3_api_call
        ):
            response = s3_client.update_bucket_notification(
                bucket="test-update-notification-bucket",
                prefix="AWSLogs/123456789012",
                notification_id="test",
                queue_arn=migration_sqs_arn,
                tries=1,
            )
            assert response == {"QueueConfigurations": []}

        # mock a update notification return exception
        with patch(
            "botocore.client.BaseClient._make_api_call", new=self.mock_s3_api_call
        ):
            with pytest.raises(ClientError):
                s3_client.update_bucket_notification(
                    bucket="test-update-notification-bucket-return-exception",
                    prefix="AWSLogs/123456789012",
                    notification_id="test",
                    queue_arn=migration_sqs_arn,
                    tries=1,
                )

    def test_delete_bucket_notification(self, mock_s3_context, mock_sqs_context):
        from utils.aws import S3Client
        from unittest.mock import patch
        from botocore.exceptions import ClientError

        staging_bucket_name = os.environ["STAGING_BUCKET_NAME"]
        s3_objects_scanning_function_arn = os.environ[
            "S3_OBJECTS_SCANNING_FUNCTION_ARN"
        ]
        migration_sqs_arn = os.environ["MIGRATION_SQS_ARN"]
        queue_notification = {
            "Id": "test",
            "QueueArn": migration_sqs_arn,
            "Events": ["s3:ObjectCreated:*"],
            "Filter": {
                "Key": {
                    "FilterRules": [{"Name": "prefix", "Value": "AWSLogs/123456789012"}]
                }
            },
        }

        boto3_s3_client = boto3.client("s3")

        s3_client = S3Client()

        response = s3_client.delete_bucket_notification(
            bucket=staging_bucket_name, notification_id="no-exists-id"
        )
        assert response == {}
        response = s3_client.get_bucket_notification(bucket=staging_bucket_name)
        assert response == {}

        s3_client.update_bucket_notification(
            bucket=staging_bucket_name,
            prefix="AWSLogs/123456789012",
            notification_id="test",
            queue_arn=migration_sqs_arn,
        )
        response = s3_client.get_bucket_notification(bucket=staging_bucket_name)
        assert response["QueueConfigurations"] == [queue_notification]
        s3_client.delete_bucket_notification(
            bucket=staging_bucket_name, notification_id="no-exists-id"
        )
        response = s3_client.get_bucket_notification(bucket=staging_bucket_name)
        assert response.get("QueueConfigurations") == [queue_notification]

        queue_notification["Id"] = "no-exists-id"
        s3_client.update_bucket_notification(
            bucket=staging_bucket_name,
            prefix="AWSLogs/123456789012",
            notification_id="test",
            queue_arn=migration_sqs_arn,
        )
        s3_client.update_bucket_notification(
            bucket=staging_bucket_name,
            prefix="AWSLogs/123456789012",
            notification_id=queue_notification["Id"],
            queue_arn=migration_sqs_arn,
        )
        s3_client.delete_bucket_notification(
            bucket=staging_bucket_name, notification_id="test"
        )
        response = s3_client.get_bucket_notification(bucket=staging_bucket_name)
        assert response.get("QueueConfigurations") == [queue_notification]

        # mock a delete notification is not success.
        with patch(
            "botocore.client.BaseClient._make_api_call", new=self.mock_s3_api_call
        ):
            response = s3_client.delete_bucket_notification(
                bucket="test-delete-notification-bucket",
                notification_id="test",
                tries=1,
            )
            assert response == {
                "QueueConfigurations": [{"Id": "test", "QueueArn": "test"}]
            }

        # mock a delete notification return exception
        with patch(
            "botocore.client.BaseClient._make_api_call", new=self.mock_s3_api_call
        ):
            with pytest.raises(ClientError):
                s3_client.delete_bucket_notification(
                    bucket="test-delete-notification-bucket-return-exception",
                    notification_id="test",
                )

    def test_enable_event_bridge_notification(self, mock_s3_context, mock_sqs_context):
        from utils.aws import S3Client

        staging_bucket_name = os.environ["STAGING_BUCKET_NAME"]
        s3_client = S3Client()
        s3_client.enable_event_bridge_notification(bucket=staging_bucket_name)

    def test_get_bucket_policy(self, mock_s3_context, mock_sqs_context):
        from utils.aws import S3Client

        staging_bucket_name = os.environ["STAGING_BUCKET_NAME"]
        s3_objects_scanning_role_arn = os.environ["S3_OBJECTS_SCANNING_ROLE_ARN"]
        migration_sqs_arn = os.environ["MIGRATION_SQS_ARN"]
        sid = "test"
        policy_document = {
            "Sid": sid,
            "Effect": "Allow",
            "Action": "s3:GetObject",
            "Principal": {"AWS": s3_objects_scanning_role_arn},
            "Resource": [f"s3://{staging_bucket_name}/AWSLogs/123456789012*"],
        }

        s3_client = S3Client()
        response = s3_client.get_bucket_policy(bucket=staging_bucket_name)
        assert response == {"Statement": [], "Version": "2012-10-17"}

        s3_client.update_bucket_policy(
            bucket=staging_bucket_name, sid=sid, policy_document=policy_document
        )
        response = s3_client.get_bucket_policy(bucket=staging_bucket_name)
        assert response == {"Statement": [policy_document], "Version": "2012-10-17"}

        # repeat update policy
        s3_client.update_bucket_policy(
            bucket=staging_bucket_name, sid=sid, policy_document=policy_document
        )
        response = s3_client.get_bucket_policy(bucket=staging_bucket_name)
        assert response == {"Statement": [policy_document], "Version": "2012-10-17"}

        no_exists_policy_document = copy.deepcopy(policy_document)
        no_exists_policy_document["Sid"] = "noexistsid"
        s3_client.update_bucket_policy(
            bucket=staging_bucket_name,
            sid=no_exists_policy_document["Sid"],
            policy_document=no_exists_policy_document,
        )
        response = s3_client.get_bucket_policy(bucket=staging_bucket_name)
        assert sorted(response["Statement"], key=lambda x: x["Sid"]) == sorted(
            [policy_document, no_exists_policy_document], key=lambda x: x["Sid"]
        )

        response = s3_client.get_bucket_policy(
            bucket=staging_bucket_name, exclusive=[sid]
        )
        assert response == {
            "Statement": [no_exists_policy_document],
            "Version": "2012-10-17",
        }

    def test_update_bucket_policy(self, mock_s3_context, mock_sqs_context):
        from utils.aws import S3Client
        from unittest.mock import patch
        from botocore.exceptions import ClientError

        staging_bucket_name = os.environ["STAGING_BUCKET_NAME"]
        s3_objects_scanning_role_arn = os.environ["S3_OBJECTS_SCANNING_ROLE_ARN"]
        migration_sqs_arn = os.environ["MIGRATION_SQS_ARN"]
        sid = "test"
        policy_document = {
            "Sid": sid,
            "Effect": "Allow",
            "Action": "s3:GetObject",
            "Principal": {"AWS": s3_objects_scanning_role_arn},
            "Resource": [f"s3://{staging_bucket_name}/AWSLogs/123456789012*"],
        }

        s3_client = S3Client()

        response = s3_client.get_bucket_policy(bucket=staging_bucket_name)
        assert response == {"Statement": [], "Version": "2012-10-17"}

        s3_client.update_bucket_policy(
            bucket=staging_bucket_name, sid=sid, policy_document=policy_document
        )
        response = s3_client.get_bucket_policy(bucket=staging_bucket_name)
        assert response == {"Statement": [policy_document], "Version": "2012-10-17"}

        # repeat update policy
        s3_client.update_bucket_policy(
            bucket=staging_bucket_name, sid=sid, policy_document=policy_document
        )
        response = s3_client.get_bucket_policy(bucket=staging_bucket_name)
        assert response == {"Statement": [policy_document], "Version": "2012-10-17"}

        no_exists_policy_document = copy.deepcopy(policy_document)
        no_exists_policy_document["Sid"] = "noexistsid"
        s3_client.update_bucket_policy(
            bucket=staging_bucket_name,
            sid=no_exists_policy_document["Sid"],
            policy_document=no_exists_policy_document,
        )
        response = s3_client.get_bucket_policy(bucket=staging_bucket_name)
        assert sorted(response["Statement"], key=lambda x: x["Sid"]) == sorted(
            [policy_document, no_exists_policy_document], key=lambda x: x["Sid"]
        )

        response = s3_client.get_bucket_policy(
            bucket=staging_bucket_name, exclusive=[sid]
        )
        assert response == {
            "Statement": [no_exists_policy_document],
            "Version": "2012-10-17",
        }

        # mock a update bucket policy is not success.
        with patch(
            "botocore.client.BaseClient._make_api_call", new=self.mock_s3_api_call
        ):
            response = s3_client.update_bucket_policy(
                bucket="test-update-policy-bucket",
                sid=sid,
                policy_document=no_exists_policy_document,
                tries=1,
            )
            assert response == {"Version": "2012-10-17", "Statement": []}

        # mock a update bucket policy return exception
        with patch(
            "botocore.client.BaseClient._make_api_call", new=self.mock_s3_api_call
        ):
            with pytest.raises(ClientError):
                s3_client.update_bucket_policy(
                    bucket="test-update-bucket-policy-return-exception",
                    sid=sid,
                    policy_document=no_exists_policy_document,
                    tries=1,
                )

    def test_delete_bucket_policy(self, mock_s3_context, mock_sqs_context):
        from utils.aws import S3Client
        from unittest.mock import patch
        from botocore.exceptions import ClientError

        staging_bucket_name = os.environ["STAGING_BUCKET_NAME"]
        s3_objects_scanning_role_arn = os.environ["S3_OBJECTS_SCANNING_ROLE_ARN"]
        migration_sqs_arn = os.environ["MIGRATION_SQS_ARN"]
        sid = "test"
        policy_document = {
            "Sid": sid,
            "Effect": "Allow",
            "Action": "s3:GetObject",
            "Principal": {"AWS": s3_objects_scanning_role_arn},
            "Resource": [f"s3://{staging_bucket_name}/AWSLogs/123456789012*"],
        }

        s3_client = S3Client()

        response = s3_client.delete_bucket_policy(bucket=staging_bucket_name, sid=sid)
        assert response == {"Version": "2012-10-17", "Statement": []}

        s3_client.update_bucket_policy(
            bucket=staging_bucket_name, sid=sid, policy_document=policy_document
        )
        response = s3_client.get_bucket_policy(bucket=staging_bucket_name)
        assert response == {"Statement": [policy_document], "Version": "2012-10-17"}

        s3_client.delete_bucket_policy(bucket=staging_bucket_name, sid=sid)
        response = s3_client.get_bucket_policy(bucket=staging_bucket_name)
        assert response == {"Statement": [], "Version": "2012-10-17"}

        no_exists_policy_document = copy.deepcopy(policy_document)
        no_exists_policy_document["Sid"] = "noexistsid"
        s3_client.update_bucket_policy(
            bucket=staging_bucket_name,
            sid=no_exists_policy_document["Sid"],
            policy_document=policy_document,
        )
        s3_client.delete_bucket_policy(bucket=staging_bucket_name, sid=sid)
        response = s3_client.get_bucket_policy(bucket=staging_bucket_name)
        assert response == {
            "Statement": [no_exists_policy_document],
            "Version": "2012-10-17",
        }

        # mock a delete bucket policy is not success.
        with patch(
            "botocore.client.BaseClient._make_api_call", new=self.mock_s3_api_call
        ):
            response = s3_client.delete_bucket_policy(
                bucket="test-delete-policy-bucket", sid=sid, tries=1
            )
            assert response == {
                "Version": "2012-10-17",
                "Statement": [{"Sid": "test", "Effect": "Allow"}],
            }

        # mock a delete bucket policy return exception
        with patch(
            "botocore.client.BaseClient._make_api_call", new=self.mock_s3_api_call
        ):
            with pytest.raises(ClientError):
                s3_client.delete_bucket_policy(
                    bucket="test-delete-bucket-policy-return-exception",
                    sid=sid,
                    tries=1,
                )

    def test_put_bucket_policy_for_alb(self, mock_s3_context, mock_sqs_context):
        from utils.aws import S3Client

        staging_bucket_name = os.environ["STAGING_BUCKET_NAME"]

        s3_client = S3Client()

        s3_client._s3_client.create_bucket(
            Bucket="alb-logging-bucket",
            CreateBucketConfiguration={"LocationConstraint": "us-east-2"},
        )

        response = s3_client.put_bucket_policy_for_alb(
            bucket="alb-logging-bucket", prefix="test", sid="albPolicy"
        )
        assert response == {
            "Version": "2012-10-17",
            "Statement": [
                {
                    "Effect": "Allow",
                    "Principal": {"AWS": "arn:aws:iam::033677994240:root"},
                    "Action": [
                        "s3:PutObject",
                        "s3:PutObjectTagging",
                    ],
                    "Resource": "arn:aws:s3:::alb-logging-bucket/test*",
                    "Sid": "albPolicy",
                }
            ],
        }
        response = s3_client.get_bucket_policy(
            bucket="alb-logging-bucket", sid="albPolicy"
        )
        assert response == {
            "Version": "2012-10-17",
            "Statement": [
                {
                    "Effect": "Allow",
                    "Principal": {"AWS": "arn:aws:iam::033677994240:root"},
                    "Action": [
                        "s3:PutObject",
                        "s3:PutObjectTagging",
                    ],
                    "Resource": "arn:aws:s3:::alb-logging-bucket/test*",
                    "Sid": "albPolicy",
                }
            ],
        }

        response = s3_client.put_bucket_policy_for_alb(
            bucket=staging_bucket_name, prefix="test", sid="albPolicy"
        )
        assert response == {
            "Version": "2012-10-17",
            "Statement": [
                {
                    "Effect": "Allow",
                    "Principal": {"AWS": "arn:aws:iam::127311923021:root"},
                    "Action": [
                        "s3:PutObject",
                        "s3:PutObjectTagging",
                    ],
                    "Resource": f"arn:aws:s3:::{staging_bucket_name}/test*",
                    "Sid": "albPolicy",
                }
            ],
        }

        response = s3_client.get_bucket_policy(
            bucket=staging_bucket_name, sid="albPolicy"
        )
        assert response == {
            "Version": "2012-10-17",
            "Statement": [
                {
                    "Effect": "Allow",
                    "Principal": {"AWS": "arn:aws:iam::127311923021:root"},
                    "Action": [
                        "s3:PutObject",
                        "s3:PutObjectTagging",
                    ],
                    "Resource": f"arn:aws:s3:::{staging_bucket_name}/test*",
                    "Sid": "albPolicy",
                }
            ],
        }

        log_delivery_regions = (
            "ap-south-2",
            "ap-southeast-4",
            "ca-west-1",
            "eu-south-2",
            "eu-central-2",
            "il-central-1",
            "me-central-1",
        )
        for region in log_delivery_regions:
            s3_client._s3_client.create_bucket(
                Bucket=f"alb-logging-bucket-{region}",
                CreateBucketConfiguration={"LocationConstraint": region},
            )

            response = s3_client.put_bucket_policy_for_alb(
                bucket=f"alb-logging-bucket-{region}", prefix="test", sid="albPolicy"
            )
            assert response == {
                "Version": "2012-10-17",
                "Statement": [
                    {
                        "Effect": "Allow",
                        "Principal": {
                            "Service": "logdelivery.elasticloadbalancing.amazonaws.com"
                        },
                        "Action": [
                            "s3:PutObject",
                            "s3:PutObjectTagging",
                        ],
                        "Resource": f"arn:aws:s3:::alb-logging-bucket-{region}/test*",
                        "Sid": "albPolicy",
                    }
                ],
            }


class TestSFNClient:

    def mock_stepfunction_api_call(self, operation_name, kwarg):
        from botocore.exceptions import ClientError

        if operation_name in (
            "SendTaskHeartbeat",
            "SendTaskSuccess",
            "SendTaskFailure",
        ):
            if kwarg["taskToken"] == "do-not-exists":
                raise ClientError(
                    error_response={
                        "Error": {"Code": "400", "Message": "Invalid Token"}
                    },
                    operation_name=operation_name,
                )
            return {}

    def test_send_callback(self, mock_sqs_context, mock_sfn_context):
        from utils.aws import SFNClient
        from unittest.mock import patch

        sfn_client = SFNClient()
        task_token = "AQCEAAAAKgAAAAMAAAAA"

        with patch(
            "botocore.client.BaseClient._make_api_call",
            new=self.mock_stepfunction_api_call,
        ):
            assert (
                sfn_client.send_callback(
                    task_token=task_token,
                    output="",
                    error="",
                    cause="",
                    function="send_task_success",
                )
                is True
            )
            assert (
                sfn_client.send_callback(
                    task_token=task_token,
                    output="",
                    error="",
                    cause="",
                    function="send_task_failure",
                )
                is True
            )
            assert (
                sfn_client.send_callback(
                    task_token="do-not-exists",
                    output="",
                    error="",
                    cause="",
                    function="send_task_heartbeat",
                )
                is False
            )


class TestSQSClient:

    def mock_sqs_api_call(self, operation_name, kwarg):
        from botocore.exceptions import ClientError

        if operation_name == "SetQueueAttributes":
            if kwarg["QueueUrl"] in (
                "https://sqs.amazonaws.com/test-update-policy-queue-return-exception",
                "https://sqs.amazonaws.com/test-delete-policy-queue-return-exception",
            ):
                raise ClientError(
                    error_response={
                        "Error": {"Code": "400", "Message": "Invalid Token"}
                    },
                    operation_name=operation_name,
                )
            else:
                return {"ResponseMetadata": {"RequestId": "Qtu", "HTTPStatusCode": 200}}
        elif operation_name == "GetQueueAttributes":
            if kwarg["QueueUrl"] in (
                "https://sqs.amazonaws.com/test-update-policy-queue",
                "https://sqs.amazonaws.com/test-update-policy-queue-return-exception",
            ):
                return {
                    "Attributes": {
                        "Policy": '{"Version": "2012-10-17", "Statement": []}'
                    }
                }
            elif (
                kwarg["QueueUrl"]
                == "https://sqs.amazonaws.com/test-delete-policy-queue"
            ):
                return {
                    "Attributes": {
                        "Policy": '{"Version": "2012-10-17", "Statement": [{"Sid": "test", "Effect": "Allow"}]}'
                    }
                }
            elif kwarg["QueueUrl"] in (
                "https://sqs.amazonaws.com/test-delete-policy-queue-return-exception"
            ):
                return {
                    "Attributes": {
                        "Policy": '{"Version": "2012-10-17", "Statement": [{"Sid": "test", "Effect": "Allow"}]}'
                    }
                }
        elif operation_name == "GetQueueUrl":
            if kwarg["QueueName"] == "test-delete-policy-queue":
                return {
                    "QueueUrl": "https://sqs.amazonaws.com/test-delete-policy-queue"
                }
            elif kwarg["QueueName"] == "test-update-policy-queue":
                return {
                    "QueueUrl": "https://sqs.amazonaws.com/test-update-policy-queue"
                }
            elif kwarg["QueueName"] == "test-update-policy-queue-return-exception":
                return {
                    "QueueUrl": "https://sqs.amazonaws.com/test-update-policy-queue-return-exception"
                }
            elif kwarg["QueueName"] == "test-delete-policy-queue-return-exception":
                return {
                    "QueueUrl": "https://sqs.amazonaws.com/test-delete-policy-queue-return-exception"
                }

    def test_send_message(self, mock_sqs_context):
        from utils.aws import SQSClient

        migration_sqs_name = os.environ["MIGRATION_SQS_NAME"]
        sqs_client = SQSClient()
        sqs_url = sqs_client.get_queue_url(migration_sqs_name)

        sqs_client.send_message(url=sqs_url)
        response = sqs_client.receive_message(url=sqs_url)
        assert next(response) == {}

        msg = {
            "executionName": "82d765dd-9b97-4354-b2c0-15047abbc6e4",
            "status": "Running",
        }
        sqs_client.send_message(url=sqs_url, msg=msg)
        response = sqs_client.receive_message(url=sqs_url)
        assert next(response) == msg

        msg_1 = {
            "executionName": "82d765dd-9b97-4354-b2c0-15047abbc6e4",
            "status": "Running",
        }
        msg_2 = {
            "executionName": "82d765dd-9b97-4354-b2c0-15047abbc6e4",
            "status": "Succeeded",
        }
        msg_3 = {
            "executionName": "cedfa489-7782-46f3-8eb6-5f76f6f6ef54",
            "status": "Succeeded",
        }
        sqs_client.send_message(url=sqs_url, msg=msg_1)
        sqs_client.send_message(url=sqs_url, msg=msg_2)
        sqs_client.send_message(url=sqs_url, msg=msg_3)
        response = []
        for message in sqs_client.receive_message(url=sqs_url):
            response.append(message)
        assert msg_1 in response
        assert msg_2 in response
        assert msg_3 in response

        msg_1 = {
            "executionName": "82d765dd-9b97-4354-b2c0-15047abbc6e4",
            "status": "Running",
        }
        msg_2 = {
            "executionName": "82d765dd-9b97-4354-b2c0-15047abbc6e4",
            "status": "Succeeded",
        }
        msg_3 = {
            "executionName": "cedfa489-7782-46f3-8eb6-5f76f6f6ef54",
            "status": "Succeeded",
        }
        sqs_client.send_message(url=sqs_url, msg=msg_1)
        sqs_client.send_message(url=sqs_url, msg=msg_2)
        sqs_client.send_message(url=sqs_url, msg=msg_3)
        response = []
        for message in sqs_client.receive_message(url=sqs_url, max_num=2):
            response.append(message)
        assert msg_1 in response
        assert msg_2 in response

    def test_get_queue_policy(self, mock_s3_context, mock_sqs_context):
        from utils.aws import SQSClient

        s3_objects_scanning_role_arn = os.environ["S3_OBJECTS_SCANNING_ROLE_ARN"]
        migration_sqs_arn = os.environ["MIGRATION_SQS_ARN"]
        migration_sqs_url = os.environ["MIGRATION_SQS_URL"]
        sid = "test"
        policy_document = {
            "Sid": sid,
            "Effect": "Allow",
            "Principal": {"Service": "s3.amazonaws.com"},
            "Action": ["sqs:SendMessage"],
            "Resource": migration_sqs_arn,
            "Condition": {"ArnLike": {"aws:SourceArn": s3_objects_scanning_role_arn}},
        }

        sqs_client = SQSClient()
        response = sqs_client.get_queue_policy(url=migration_sqs_url)
        assert response == {"Statement": [], "Version": "2012-10-17"}

        sqs_client.update_queue_policy(
            arn=migration_sqs_arn, sid=sid, policy_document=policy_document
        )
        response = sqs_client.get_queue_policy(url=migration_sqs_url)
        assert response == {"Statement": [policy_document], "Version": "2012-10-17"}

        response = sqs_client.get_queue_policy(url=migration_sqs_url, sid=sid)
        assert response == {"Statement": [policy_document], "Version": "2012-10-17"}

        # repeat update policy
        sqs_client.update_queue_policy(
            arn=migration_sqs_arn, sid=sid, policy_document=policy_document
        )
        response = sqs_client.get_queue_policy(url=migration_sqs_url)
        assert response == {"Statement": [policy_document], "Version": "2012-10-17"}

        no_exists_policy_document = copy.deepcopy(policy_document)
        no_exists_policy_document["Sid"] = "noexistsid"
        sqs_client.update_queue_policy(
            arn=migration_sqs_arn,
            sid=no_exists_policy_document["Sid"],
            policy_document=no_exists_policy_document,
        )
        response = sqs_client.get_queue_policy(url=migration_sqs_url)
        assert sorted(response["Statement"], key=lambda x: x["Sid"]) == sorted(
            [policy_document, no_exists_policy_document], key=lambda x: x["Sid"]
        )

        response = sqs_client.get_queue_policy(url=migration_sqs_url, exclusive=[sid])
        assert response == {
            "Statement": [no_exists_policy_document],
            "Version": "2012-10-17",
        }

        response = sqs_client.get_queue_policy(
            url=migration_sqs_url, sid=sid, exclusive=[sid]
        )
        assert response == {"Statement": [policy_document], "Version": "2012-10-17"}

    def test_update_queue_policy(self, mock_s3_context, mock_sqs_context):
        from utils.aws import SQSClient
        from unittest.mock import patch
        from botocore.exceptions import ClientError

        s3_objects_scanning_role_arn = os.environ["S3_OBJECTS_SCANNING_ROLE_ARN"]
        migration_sqs_arn = os.environ["MIGRATION_SQS_ARN"]
        migration_sqs_url = os.environ["MIGRATION_SQS_URL"]
        sid = "test"
        policy_document = {
            "Sid": sid,
            "Effect": "Allow",
            "Principal": {"Service": "s3.amazonaws.com"},
            "Action": ["sqs:SendMessage"],
            "Resource": migration_sqs_arn,
            "Condition": {"ArnLike": {"aws:SourceArn": s3_objects_scanning_role_arn}},
        }

        sqs_client = SQSClient()

        response = sqs_client.get_queue_policy(url=migration_sqs_url)
        assert response == {"Statement": [], "Version": "2012-10-17"}

        sqs_client.update_queue_policy(
            arn=migration_sqs_arn, sid=sid, policy_document=policy_document
        )
        response = sqs_client.get_queue_policy(url=migration_sqs_url)
        assert response == {"Statement": [policy_document], "Version": "2012-10-17"}

        # repeat update policy
        sqs_client.update_queue_policy(
            arn=migration_sqs_arn, sid=sid, policy_document=policy_document
        )
        response = sqs_client.get_queue_policy(url=migration_sqs_url)
        assert response == {"Statement": [policy_document], "Version": "2012-10-17"}

        no_exists_policy_document = copy.deepcopy(policy_document)
        no_exists_policy_document["Sid"] = "noexistsid"
        sqs_client.update_queue_policy(
            arn=migration_sqs_arn,
            sid=no_exists_policy_document["Sid"],
            policy_document=no_exists_policy_document,
        )
        response = sqs_client.get_queue_policy(url=migration_sqs_url)
        assert sorted(response["Statement"], key=lambda x: x["Sid"]) == sorted(
            [policy_document, no_exists_policy_document], key=lambda x: x["Sid"]
        )

        response = sqs_client.get_queue_policy(url=migration_sqs_url, exclusive=[sid])
        assert response == {
            "Statement": [no_exists_policy_document],
            "Version": "2012-10-17",
        }

        # mock a update queue policy is not success.
        with patch(
            "botocore.client.BaseClient._make_api_call", new=self.mock_sqs_api_call
        ):
            response = sqs_client.update_queue_policy(
                arn="arn:aws:sqs:us-east-1:123456789012:test-update-policy-queue",
                sid=sid,
                policy_document=policy_document,
                tries=1,
            )
            assert response == {"Version": "2012-10-17", "Statement": []}

        # mock a update queue policy return exception
        with patch(
            "botocore.client.BaseClient._make_api_call", new=self.mock_sqs_api_call
        ):
            with pytest.raises(ClientError):
                sqs_client.update_queue_policy(
                    arn="arn:aws:sqs:us-east-1:123456789012:test-update-policy-queue-return-exception",
                    sid=sid,
                    policy_document=policy_document,
                    tries=1,
                )

    def test_delete_queue_policy(self, mock_s3_context, mock_sqs_context):
        from utils.aws import SQSClient
        from unittest.mock import patch
        from botocore.exceptions import ClientError

        s3_objects_scanning_role_arn = os.environ["S3_OBJECTS_SCANNING_ROLE_ARN"]
        migration_sqs_arn = os.environ["MIGRATION_SQS_ARN"]
        migration_sqs_url = os.environ["MIGRATION_SQS_URL"]
        sid = "test"
        policy_document = {
            "Sid": sid,
            "Effect": "Allow",
            "Principal": {"Service": "s3.amazonaws.com"},
            "Action": ["sqs:SendMessage"],
            "Resource": migration_sqs_arn,
            "Condition": {"ArnLike": {"aws:SourceArn": s3_objects_scanning_role_arn}},
        }

        sqs_client = SQSClient()

        response = sqs_client.delete_queue_policy(arn=migration_sqs_arn, sid=sid)
        assert response == {"Version": "2012-10-17", "Statement": []}

        sqs_client.update_queue_policy(
            arn=migration_sqs_arn, sid=sid, policy_document=policy_document
        )
        response = sqs_client.get_queue_policy(url=migration_sqs_url)
        assert response == {"Statement": [policy_document], "Version": "2012-10-17"}

        sqs_client.delete_queue_policy(arn=migration_sqs_arn, sid=sid)
        response = sqs_client.get_queue_policy(url=migration_sqs_url)

        assert response == {"Statement": [], "Version": "2012-10-17"}

        no_exists_policy_document = copy.deepcopy(policy_document)
        no_exists_policy_document["Sid"] = "noexistsid"
        sqs_client.update_queue_policy(
            arn=migration_sqs_arn,
            sid=no_exists_policy_document["Sid"],
            policy_document=policy_document,
        )
        sqs_client.delete_queue_policy(arn=migration_sqs_arn, sid=sid)
        response = sqs_client.get_queue_policy(url=migration_sqs_url)
        assert response == {
            "Statement": [no_exists_policy_document],
            "Version": "2012-10-17",
        }

        # mock a delete queue policy is not success.
        with patch(
            "botocore.client.BaseClient._make_api_call", new=self.mock_sqs_api_call
        ):
            response = sqs_client.delete_queue_policy(
                arn="arn:aws:sqs:us-east-1:123456789012:test-delete-policy-queue",
                sid="test",
                tries=1,
            )
            assert response == {
                "Version": "2012-10-17",
                "Statement": [{"Sid": "test", "Effect": "Allow"}],
            }

        # mock a delete queue policy return exception
        with patch(
            "botocore.client.BaseClient._make_api_call", new=self.mock_sqs_api_call
        ):
            with pytest.raises(ClientError):
                sqs_client.delete_queue_policy(
                    arn="arn:aws:sqs:us-east-1:123456789012:test-delete-policy-queue-return-exception",
                    sid="test",
                    tries=1,
                )


class TestAthenaClient:

    def mock_athena_api_call(self, operation_name, kwarg):
        from botocore.exceptions import ClientError

        if operation_name == "StartQueryExecution":
            if kwarg["QueryString"] == "Not a SQL":
                raise ClientError(
                    error_response={
                        "Error": {"Code": "400", "Message": "Error Query String."}
                    },
                    operation_name=operation_name,
                )
            elif kwarg["QueryString"] == "SELECT * FROM table limit 10;":
                return {"QueryExecutionId": "000000"}
        elif operation_name == "GetQueryExecution":
            if kwarg["QueryExecutionId"] == "000000":
                return {
                    "QueryExecution": {
                        "QueryExecutionId": "000000",
                        "Query": "SELECT * FROM table limit 10;",
                        "StatementType": "DDL",
                        "Status": {
                            "State": "RUNNING",
                        },
                    }
                }
            elif kwarg["QueryExecutionId"] == "get-execution-return-exception":
                raise ClientError(
                    error_response={
                        "Error": {"Code": "400", "Message": "Error Query String."}
                    },
                    operation_name=operation_name,
                )
        elif operation_name == "CreateNamedQuery":
            if kwarg["name"] == "create_named_query_return_exception":
                raise ClientError(
                    error_response={
                        "Error": {"Code": "400", "Message": "Error Query String."}
                    },
                    operation_name=operation_name,
                )
        elif operation_name == "GetNamedQuery":
            if kwarg["NamedQueryId"] == "ce0760d7-cf5d-4416-9d1f-5a29a7a19744":
                return {
                    "NamedQuery": {
                        "Name": "test-filter",
                        "Description": "string",
                        "Database": "centralized",
                        "QueryString": "SELECT 1;",
                        "NamedQueryId": "ce0760d7-cf5d-4416-9d1f-5a29a7a19744",
                        "WorkGroup": "Primary",
                    }
                }
            elif kwarg["NamedQueryId"] == "2aa6fcea-2294-4764-b090-9727c36f08ff":
                return {
                    "NamedQuery": {
                        "Name": "test-update-return-exception",
                        "Description": "string",
                        "Database": "centralized",
                        "QueryString": "SELECT 2;",
                        "NamedQueryId": "2aa6fcea-2294-4764-b090-9727c36f08ff",
                        "WorkGroup": "Primary",
                    }
                }
        elif operation_name == "UpdateNamedQuery":
            if kwarg["NamedQueryId"] == "ce0760d7-cf5d-4416-9d1f-5a29a7a19744":
                return {}
            elif kwarg["NamedQueryId"] == "2aa6fcea-2294-4764-b090-9727c36f08ff":
                raise ClientError(
                    error_response={
                        "Error": {"Code": "400", "Message": "Error Query String."}
                    },
                    operation_name=operation_name,
                )
        elif operation_name == "DeleteNamedQuery":
            if kwarg["NamedQueryId"] == "test-delete-named-query-return-exception":
                raise ClientError(
                    error_response={
                        "Error": {"Code": "400", "Message": "Error Query String."}
                    },
                    operation_name=operation_name,
                )
            else:
                return {}
        elif operation_name == "ListNamedQueries":
            return {
                "NamedQueryIds": [
                    "ce0760d7-cf5d-4416-9d1f-5a29a7a19744",
                    "2aa6fcea-2294-4764-b090-9727c36f08ff",
                ]
            }

    def test_get_query_execution(self, mock_athena_context):
        from utils.aws import AthenaClient
        from unittest.mock import patch

        ddl_create_database_execution_id = os.environ[
            "DDL_CREATE_DATABASE_EXECUTION_ID"
        ]
        ddl_create_table_execution_id = os.environ["DDL_CREATE_TABLE_EXECUTION_ID"]
        dml_insert_execution_id = os.environ["DML_SELECT_EXECUTION_ID"]

        athena_client = AthenaClient()

        response = athena_client.get_query_execution(ddl_create_database_execution_id)
        assert "QueryExecution" in response.keys()
        assert (
            response["QueryExecution"]["QueryExecutionId"]
            == ddl_create_database_execution_id
        )
        assert (
            response["QueryExecution"]["Query"]
            == "CREATE DATABASE IF NOT EXISTS centralized;"
        )
        assert response["QueryExecution"]["ResultConfiguration"] == {
            "OutputLocation": "s3://staging-bucket/athena-results/"
        }
        assert response["QueryExecution"]["WorkGroup"] == "Primary"
        assert response["QueryExecution"]["Status"]["State"] in (
            "QUEUED",
            "RUNNING",
            "SUCCEEDED",
            "FAILED",
            "CANCELLED",
        )

        response = athena_client.get_query_execution(dml_insert_execution_id)
        assert "QueryExecution" in response.keys()
        assert response["QueryExecution"]["QueryExecutionId"] == dml_insert_execution_id
        assert (
            response["QueryExecution"]["Query"]
            == "SELECT * FROM centralized.aws_apigateway_logs_parquet limit 10;"
        )
        assert response["QueryExecution"]["ResultConfiguration"] == {
            "OutputLocation": "s3://staging-bucket/athena-results/"
        }
        assert response["QueryExecution"]["WorkGroup"] == "Primary"
        assert response["QueryExecution"]["Status"]["State"] in (
            "QUEUED",
            "RUNNING",
            "SUCCEEDED",
            "FAILED",
            "CANCELLED",
        )

        # mock a start query execution return exception.
        with patch(
            "botocore.client.BaseClient._make_api_call", new=self.mock_athena_api_call
        ):
            response = athena_client.get_query_execution(
                query_execution_id="get-execution-return-exception"
            )
            assert response == {"QueryExecution": {"QueryExecutionId": ""}}

    def test_get_query_execution_status(self, mock_athena_context):
        from utils.aws import AthenaClient

        dml_insert_execution_id = os.environ["DML_SELECT_EXECUTION_ID"]
        iso8601_time_pattern = r"\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z"

        athena_client = AthenaClient()
        query_execution_info = athena_client.get_query_execution(
            dml_insert_execution_id
        )
        query_execution_status = athena_client.get_query_execution_status(
            query_execution_info
        )
        query_execution_status_state = query_execution_status["state"]
        assert (
            re.match(iso8601_time_pattern, query_execution_status["submissionDateTime"])
            is not None
        )
        assert (
            re.match(iso8601_time_pattern, query_execution_status["completionDateTime"])
            is not None
        )
        query_execution_status.pop("state")
        query_execution_status.pop("submissionDateTime")
        query_execution_status.pop("completionDateTime")
        assert query_execution_status == {
            "queryExecutionId": dml_insert_execution_id,
            "query": "SELECT * FROM centralized.aws_apigateway_logs_parquet limit 10;",
        }
        assert query_execution_status_state in (
            "QUEUED",
            "RUNNING",
            "SUCCEEDED",
            "FAILED",
            "CANCELLED",
        )

        query_execution_info = athena_client.get_query_execution(
            dml_insert_execution_id
        )
        completion_date_time = datetime.datetime.now(datetime.UTC)
        query_execution_info["QueryExecution"]["Status"][
            "CompletionDateTime"
        ] = completion_date_time
        query_execution_status = athena_client.get_query_execution_status(
            query_execution_info
        )
        query_execution_status_state = query_execution_status["state"]
        assert (
            re.match(iso8601_time_pattern, query_execution_status["submissionDateTime"])
            is not None
        )
        assert (
            re.match(iso8601_time_pattern, query_execution_status["completionDateTime"])
            is not None
        )
        query_execution_status.pop("state")
        query_execution_status.pop("submissionDateTime")
        query_execution_status.pop("completionDateTime")
        assert query_execution_status == {
            "queryExecutionId": dml_insert_execution_id,
            "query": "SELECT * FROM centralized.aws_apigateway_logs_parquet limit 10;",
        }
        assert query_execution_status_state in (
            "QUEUED",
            "RUNNING",
            "SUCCEEDED",
            "FAILED",
            "CANCELLED",
        )

    def test_start_query_execution(self, mock_athena_context):
        from utils.aws import AthenaClient
        from unittest.mock import patch

        athena_database = os.environ["CENTRALIZED_DATABASE"]
        athena_table_name = os.environ["ATHENA_TABLE_NAME"]
        staging_bucket_name = os.environ.get("STAGING_BUCKET_NAME")
        dml_insert_execution_id = os.environ["DML_SELECT_EXECUTION_ID"]
        output_location = os.environ["ATHENA_OUTPUT_LOCATION"]
        work_group = os.environ["ATHENA_WORK_GROUP"]

        athena_client = AthenaClient()

        DML_SELECT = f"SELECT * FROM {athena_database}.{athena_table_name} limit 10;"

        response = athena_client.start_query_execution(
            query_string=DML_SELECT,
            work_group=work_group,
            output_location=output_location,
            asynchronous=True,
        )
        assert "QueryExecutionId" in response["QueryExecution"].keys()

        response = athena_client.start_query_execution(
            query_string=DML_SELECT,
            work_group=work_group,
            output_location=output_location,
        )
        assert response["QueryExecution"]["Query"] == DML_SELECT
        assert response["QueryExecution"]["ResultConfiguration"] == {
            "OutputLocation": "s3://staging-bucket/athena-results"
        }
        assert response["QueryExecution"]["WorkGroup"] == "Primary"
        assert response["QueryExecution"]["Status"]["State"] in (
            "QUEUED",
            "RUNNING",
            "SUCCEEDED",
            "FAILED",
            "CANCELLED",
        )

        # moto can not return a FAILED execution
        FAILED_DML_SELECT = "Not a SQL"

        # mock a start query execution return exception.
        class TimeoutError(Exception):
            pass

        def timeout_handler(signum, frame):
            raise TimeoutError("Function timed out.")

        def run_with_timeout(func, kwargs, timeout):
            signal.signal(signal.SIGALRM, timeout_handler)
            signal.alarm(timeout)
            try:
                result = func(**kwargs)
                signal.alarm(0)
                return result
            except TimeoutError:
                return None

        with patch(
            "botocore.client.BaseClient._make_api_call", new=self.mock_athena_api_call
        ):
            response = athena_client.start_query_execution(
                query_string=FAILED_DML_SELECT,
                work_group=work_group,
                output_location=output_location,
                asynchronous=True,
            )
            assert response["QueryExecution"]["Query"] == FAILED_DML_SELECT
            assert response["QueryExecution"]["QueryExecutionId"] == ""
            assert response["QueryExecution"]["Status"]["State"] == "FAILED"
            with pytest.raises(Exception) as exception_info:
                run_with_timeout(
                    athena_client.start_query_execution,
                    {
                        "query_string": "SELECT * FROM table limit 10;",
                        "work_group": work_group,
                        "output_location": output_location,
                        "asynchronous": False,
                    },
                    timeout=2,
                )
                assert exception_info.value.args[0] == "Function timed out."

        response = athena_client.start_query_execution(
            query_string=FAILED_DML_SELECT,
            work_group=work_group,
            output_location=output_location,
            asynchronous=True,
        )
        assert "QueryExecutionId" in response["QueryExecution"].keys()

        response = athena_client.start_query_execution(
            query_string=FAILED_DML_SELECT,
            work_group=work_group,
            output_location=output_location,
        )
        assert response["QueryExecution"]["Query"] == FAILED_DML_SELECT
        assert response["QueryExecution"]["ResultConfiguration"] == {
            "OutputLocation": "s3://staging-bucket/athena-results"
        }
        assert response["QueryExecution"]["WorkGroup"] == "Primary"
        assert response["QueryExecution"]["Status"]["State"] in (
            "QUEUED",
            "RUNNING",
            "SUCCEEDED",
            "FAILED",
            "CANCELLED",
        )

    def test_get_named_query(self, mock_athena_context):
        from utils.aws import AthenaClient

        athena_database = os.environ["CENTRALIZED_DATABASE"]
        work_group = os.environ["ATHENA_WORK_GROUP"]
        query_string = "SELECT 1;"

        athena_client = AthenaClient()
        response = athena_client.get_named_query(
            named_query_id="do-not-exists-named-query"
        )
        assert response["NamedQuery"] == {}

        response = athena_client.create_named_query(
            name="test",
            database=athena_database,
            query_string=query_string,
            work_group=work_group,
        )
        named_query_id = response["NamedQuery"]["NamedQueryId"]
        response = athena_client.get_named_query(named_query_id=named_query_id)
        assert response["NamedQuery"]["QueryString"] == query_string

    def test_list_named_queries(self, mock_athena_context):
        from utils.aws import AthenaClient
        from unittest.mock import patch

        athena_client = AthenaClient()

        # mock ListNamedQueries API
        with patch(
            "botocore.client.BaseClient._make_api_call", new=self.mock_athena_api_call
        ):
            response = athena_client.list_named_queries(name="test-filter")
            assert response["NamedQueryIds"] == ["ce0760d7-cf5d-4416-9d1f-5a29a7a19744"]
            response = athena_client.list_named_queries()
            assert response["NamedQueryIds"] == [
                "ce0760d7-cf5d-4416-9d1f-5a29a7a19744",
                "2aa6fcea-2294-4764-b090-9727c36f08ff",
            ]

    def test_create_named_query(self, mock_athena_context):
        from utils.aws import AthenaClient
        from unittest.mock import patch

        athena_database = os.environ["CENTRALIZED_DATABASE"]
        work_group = os.environ["ATHENA_WORK_GROUP"]
        query_string = "SELECT 1;"

        athena_client = AthenaClient()
        response = athena_client.create_named_query(
            name="test",
            database=athena_database,
            query_string=query_string,
            work_group=work_group,
        )
        named_query_id = response["NamedQuery"]["NamedQueryId"]
        response = athena_client.get_named_query(named_query_id=named_query_id)
        assert response["NamedQuery"]["QueryString"] == query_string

        # mock CreateNamedQuery return exception
        with patch(
            "botocore.client.BaseClient._make_api_call", new=self.mock_athena_api_call
        ):
            response = athena_client.create_named_query(
                name="create_named_query_return_exception",
                database=athena_database,
                query_string=query_string,
                work_group=work_group,
            )
            assert response["NamedQuery"] == {}

    def test_update_named_query(self, mock_athena_context):
        from utils.aws import AthenaClient
        from unittest.mock import patch

        athena_database = os.environ["CENTRALIZED_DATABASE"]
        work_group = os.environ["ATHENA_WORK_GROUP"]
        query_string = "SELECT 1;"

        athena_client = AthenaClient()

        # mock UpdateNamedQuery
        with patch(
            "botocore.client.BaseClient._make_api_call", new=self.mock_athena_api_call
        ):
            response = athena_client.update_named_query(
                name="test-update-return-exception",
                database=athena_database,
                query_string=query_string,
                work_group=work_group,
            )
            assert response["NamedQuery"] == {}

            response = athena_client.update_named_query(
                name="test-filter",
                database=athena_database,
                query_string=query_string,
                work_group=work_group,
            )
            assert response["NamedQuery"] == {}

    def test_delete_named_query(self, mock_athena_context):
        from utils.aws import AthenaClient
        from unittest.mock import patch

        athena_database = os.environ["CENTRALIZED_DATABASE"]
        work_group = os.environ["ATHENA_WORK_GROUP"]
        query_string = "SELECT 1;"

        athena_client = AthenaClient()

        response = athena_client.create_named_query(
            name="test",
            database=athena_database,
            query_string=query_string,
            work_group=work_group,
        )
        named_query_id = response["NamedQuery"]["NamedQueryId"]
        response = athena_client.delete_named_query(named_query_id=named_query_id)
        assert response == {}

        # mock DeleteNamedQuery
        with patch(
            "botocore.client.BaseClient._make_api_call", new=self.mock_athena_api_call
        ):
            response = athena_client.delete_named_query(
                named_query_id="test-delete-named-query-return-exception"
            )
            assert response == {}


class TestIamClient:

    def mock_iam_api_call(self, operation_name, kwarg):
        from botocore.exceptions import ClientError

        if operation_name == "GetPolicy":
            if kwarg["PolicyArn"] in (
                "arn:aws:iam::123456789012:policy/TestPolicy",
                "arn:aws:iam::123456789012:policy/test-create-policy-version-return-exception",
            ):
                return {
                    "Policy": {
                        "PolicyName": "TestPolicy",
                        "Arn": "arn:aws:iam::123456789012:policy/TestPolicy",
                        "DefaultVersionId": "1",
                    }
                }
            elif kwarg["PolicyArn"] in (
                "arn:aws:iam::123456789012:policy/TestDeletePolicyVersionException"
            ):
                return {
                    "Policy": {
                        "PolicyName": "TestDeletePolicyVersionException",
                        "Arn": "arn:aws:iam::123456789012:policy/TestDeletePolicyVersionException",
                        "DefaultVersionId": "2",
                    }
                }
        elif operation_name == "GetPolicyVersion":
            if (
                kwarg["PolicyArn"] == "arn:aws:iam::123456789012:policy/TestPolicy"
                and kwarg["VersionId"] == "1"
            ):
                return {
                    "PolicyVersion": {
                        "Document": {
                            "Statement": [
                                {
                                    "Sid": "test",
                                }
                            ]
                        },
                        "VersionId": "1",
                        "IsDefaultVersion": True,
                    }
                }
            elif kwarg["PolicyArn"] in (
                "arn:aws:iam::123456789012:policy/test-create-policy-version-return-exception"
            ):
                return {
                    "PolicyVersion": {
                        "Document": {"Statement": []},
                        "VersionId": "1",
                        "IsDefaultVersion": True,
                    }
                }
            elif kwarg["PolicyArn"] in (
                "arn:aws:iam::123456789012:policy/TestDeletePolicyVersionException"
            ):
                return {
                    "PolicyVersion": {
                        "Document": {"Statement": [{"Sid": "test"}]},
                        "VersionId": "2",
                        "IsDefaultVersion": True,
                    }
                }
        elif operation_name == "CreatePolicyVersion":
            if kwarg["PolicyArn"] == "arn:aws:iam::123456789012:policy/TestPolicy":
                return {
                    "PolicyVersion": {
                        "Document": "{}",
                        "VersionId": "2",
                        "IsDefaultVersion": True,
                    }
                }
            elif (
                kwarg["PolicyArn"]
                == "arn:aws:iam::123456789012:policy/test-create-policy-version-return-exception"
            ):
                raise ClientError(
                    error_response={
                        "Error": {"Code": "400", "Message": "Invalid Token"}
                    },
                    operation_name=operation_name,
                )
            elif (
                kwarg["PolicyArn"]
                == "arn:aws:iam::123456789012:policy/TestDeletePolicyVersionException"
            ):
                raise ClientError(
                    error_response={
                        "Error": {"Code": "400", "Message": "Invalid Token"}
                    },
                    operation_name=operation_name,
                )
        elif operation_name == "ListPolicyVersions":
            if kwarg["PolicyArn"] in (
                "arn:aws:iam::123456789012:policy/TestPolicy",
                "arn:aws:iam::123456789012:policy/TestDeletePolicyVersionException",
            ):
                return {
                    "Versions": [
                        {
                            "Document": {
                                "Statement": [],
                                "Resource": [],
                                "Effect": "Allow",
                            },
                            "VersionId": "v1",
                            "IsDefaultVersion": False,
                        },
                        {
                            "Document": {
                                "Statement": [],
                                "Resource": [],
                                "Effect": "Allow",
                            },
                            "VersionId": "v2",
                            "IsDefaultVersion": True,
                        },
                    ]
                }
            elif (
                kwarg["PolicyArn"]
                == "arn:aws:iam::123456789012:policy/test-create-policy-version-return-exception"
            ):
                return {
                    "Versions": [
                        {
                            "Document": {
                                "Statement": [],
                                "Resource": [],
                                "Effect": "Allow",
                            },
                            "VersionId": "v1",
                            "IsDefaultVersion": True,
                        }
                    ]
                }
        elif operation_name == "DeletePolicyVersion":
            if (
                kwarg["PolicyArn"]
                == "arn:aws:iam::123456789012:policy/TestDeletePolicyVersionException"
            ):
                raise ClientError(
                    error_response={
                        "Error": {"Code": "400", "Message": "Invalid Token"}
                    },
                    operation_name=operation_name,
                )

    def test_get_policy_document(self, mock_iam_context):
        from utils.aws import IAMClient

        staging_bucket_name = os.environ["STAGING_BUCKET_NAME"]
        logging_bucket_name = os.environ["LOGGING_BUCKET_NAME"]
        s3_public_access_policy_arn = os.environ["S3_PUBLIC_ACCESS_POLICY_ARN"]

        iam_client = IAMClient()

        response = iam_client.get_policy_document(arn=s3_public_access_policy_arn)
        assert response["Document"]["Statement"] == [
            {
                "Action": [
                    "s3:ListBucket",
                    "s3:ListBucketMultipartUploads",
                    "s3:ListMultipartUploadParts",
                    "s3:GetObject",
                    "s3:GetBucketLocation",
                    "s3:AbortMultipartUpload",
                    "s3:CreateBucket",
                    "s3:PutObject",
                    "s3:DeleteObject",
                ],
                "Resource": [
                    f"arn:aws:s3:::{staging_bucket_name}",
                    f"arn:aws:s3:::{staging_bucket_name}/*",
                ],
                "Effect": "Allow",
            },
            {
                "Sid": "S3AccessPolicyForDestination",
                "Action": [
                    "s3:ListBucket",
                    "s3:ListBucketMultipartUploads",
                    "s3:ListMultipartUploadParts",
                    "s3:GetObject",
                    "s3:GetBucketLocation",
                    "s3:AbortMultipartUpload",
                    "s3:CreateBucket",
                    "s3:PutObject",
                    "s3:DeleteObject",
                ],
                "Resource": [
                    f"arn:aws:s3:::{logging_bucket_name}",
                    f"arn:aws:s3:::{logging_bucket_name}/*",
                ],
                "Effect": "Allow",
            },
        ]

        response = iam_client.get_policy_document(
            arn=s3_public_access_policy_arn, sid="do-not-exists"
        )
        assert response["Document"]["Statement"] == []

        response = iam_client.get_policy_document(
            arn=s3_public_access_policy_arn, sid="S3AccessPolicyForDestination"
        )
        assert response["Document"]["Statement"] == [
            {
                "Sid": "S3AccessPolicyForDestination",
                "Action": [
                    "s3:ListBucket",
                    "s3:ListBucketMultipartUploads",
                    "s3:ListMultipartUploadParts",
                    "s3:GetObject",
                    "s3:GetBucketLocation",
                    "s3:AbortMultipartUpload",
                    "s3:CreateBucket",
                    "s3:PutObject",
                    "s3:DeleteObject",
                ],
                "Resource": [
                    f"arn:aws:s3:::{logging_bucket_name}",
                    f"arn:aws:s3:::{logging_bucket_name}/*",
                ],
                "Effect": "Allow",
            },
        ]

        response = iam_client.get_policy_document(
            arn=s3_public_access_policy_arn,
            sid="S3AccessPolicyForDestination",
            exclusive=["S3AccessPolicyForDestination"],
        )
        assert response["Document"]["Statement"] == [
            {
                "Sid": "S3AccessPolicyForDestination",
                "Action": [
                    "s3:ListBucket",
                    "s3:ListBucketMultipartUploads",
                    "s3:ListMultipartUploadParts",
                    "s3:GetObject",
                    "s3:GetBucketLocation",
                    "s3:AbortMultipartUpload",
                    "s3:CreateBucket",
                    "s3:PutObject",
                    "s3:DeleteObject",
                ],
                "Resource": [
                    f"arn:aws:s3:::{logging_bucket_name}",
                    f"arn:aws:s3:::{logging_bucket_name}/*",
                ],
                "Effect": "Allow",
            }
        ]

        response = iam_client.get_policy_document(
            arn=s3_public_access_policy_arn, exclusive=["S3AccessPolicyForDestination"]
        )
        assert response["Document"]["Statement"] == [
            {
                "Action": [
                    "s3:ListBucket",
                    "s3:ListBucketMultipartUploads",
                    "s3:ListMultipartUploadParts",
                    "s3:GetObject",
                    "s3:GetBucketLocation",
                    "s3:AbortMultipartUpload",
                    "s3:CreateBucket",
                    "s3:PutObject",
                    "s3:DeleteObject",
                ],
                "Resource": [
                    f"arn:aws:s3:::{staging_bucket_name}",
                    f"arn:aws:s3:::{staging_bucket_name}/*",
                ],
                "Effect": "Allow",
            }
        ]

        response = iam_client.get_policy_document(
            arn=s3_public_access_policy_arn, exclusive=["do-not-exists"]
        )
        assert response["Document"]["Statement"] == [
            {
                "Action": [
                    "s3:ListBucket",
                    "s3:ListBucketMultipartUploads",
                    "s3:ListMultipartUploadParts",
                    "s3:GetObject",
                    "s3:GetBucketLocation",
                    "s3:AbortMultipartUpload",
                    "s3:CreateBucket",
                    "s3:PutObject",
                    "s3:DeleteObject",
                ],
                "Resource": [
                    f"arn:aws:s3:::{staging_bucket_name}",
                    f"arn:aws:s3:::{staging_bucket_name}/*",
                ],
                "Effect": "Allow",
            },
            {
                "Sid": "S3AccessPolicyForDestination",
                "Action": [
                    "s3:ListBucket",
                    "s3:ListBucketMultipartUploads",
                    "s3:ListMultipartUploadParts",
                    "s3:GetObject",
                    "s3:GetBucketLocation",
                    "s3:AbortMultipartUpload",
                    "s3:CreateBucket",
                    "s3:PutObject",
                    "s3:DeleteObject",
                ],
                "Resource": [
                    f"arn:aws:s3:::{logging_bucket_name}",
                    f"arn:aws:s3:::{logging_bucket_name}/*",
                ],
                "Effect": "Allow",
            },
        ]

    def test_update_policy_document(self, mock_iam_context):
        from utils.aws import IAMClient
        from unittest.mock import patch
        from botocore.exceptions import ClientError

        staging_bucket_name = os.environ["STAGING_BUCKET_NAME"]
        logging_bucket_name = os.environ["LOGGING_BUCKET_NAME"]
        s3_public_access_policy_arn = os.environ["S3_PUBLIC_ACCESS_POLICY_ARN"]

        policy_document = {
            "Action": [
                "s3:GetObject",
            ],
            "Resource": [f"arn:aws:s3:::staging-bucket/*"],
            "Effect": "Allow",
        }

        iam_client = IAMClient()

        iam_client.update_policy_document(
            arn=s3_public_access_policy_arn,
            sid="TestPolicy",
            policy_document=policy_document,
        )

        response = iam_client.get_policy_document(
            arn=s3_public_access_policy_arn, sid="TestPolicy"
        )
        assert response["Document"]["Statement"] == [
            {
                "Sid": "TestPolicy",
                "Action": [
                    "s3:GetObject",
                ],
                "Resource": [f"arn:aws:s3:::staging-bucket/*"],
                "Effect": "Allow",
            }
        ]

        response = iam_client.get_policy_document(arn=s3_public_access_policy_arn)
        assert response["Document"]["Statement"] == [
            {
                "Action": [
                    "s3:ListBucket",
                    "s3:ListBucketMultipartUploads",
                    "s3:ListMultipartUploadParts",
                    "s3:GetObject",
                    "s3:GetBucketLocation",
                    "s3:AbortMultipartUpload",
                    "s3:CreateBucket",
                    "s3:PutObject",
                    "s3:DeleteObject",
                ],
                "Resource": [
                    f"arn:aws:s3:::{staging_bucket_name}",
                    f"arn:aws:s3:::{staging_bucket_name}/*",
                ],
                "Effect": "Allow",
            },
            {
                "Sid": "S3AccessPolicyForDestination",
                "Action": [
                    "s3:ListBucket",
                    "s3:ListBucketMultipartUploads",
                    "s3:ListMultipartUploadParts",
                    "s3:GetObject",
                    "s3:GetBucketLocation",
                    "s3:AbortMultipartUpload",
                    "s3:CreateBucket",
                    "s3:PutObject",
                    "s3:DeleteObject",
                ],
                "Resource": [
                    f"arn:aws:s3:::{logging_bucket_name}",
                    f"arn:aws:s3:::{logging_bucket_name}/*",
                ],
                "Effect": "Allow",
            },
            {
                "Sid": "TestPolicy",
                "Action": [
                    "s3:GetObject",
                ],
                "Resource": [f"arn:aws:s3:::staging-bucket/*"],
                "Effect": "Allow",
            },
        ]

        # mock a update policy version is not success.
        with patch(
            "botocore.client.BaseClient._make_api_call", new=self.mock_iam_api_call
        ):
            response = iam_client.update_policy_document(
                arn="arn:aws:iam::123456789012:policy/TestPolicy",
                sid="TestPolicy",
                policy_document=policy_document,
                tries=1,
            )
            assert response == {
                "Document": {"Statement": [{"Sid": "test"}]},
                "VersionId": "1",
                "IsDefaultVersion": True,
            }

        # mock a update policy version return exception.
        with patch(
            "botocore.client.BaseClient._make_api_call", new=self.mock_iam_api_call
        ):
            with pytest.raises(ClientError):
                iam_client.update_policy_document(
                    arn="arn:aws:iam::123456789012:policy/test-create-policy-version-return-exception",
                    sid="TestPolicy",
                    policy_document=policy_document,
                    tries=1,
                )

    def test_delete_oldest_policy_version(self, mock_iam_context):
        from utils.aws import IAMClient
        from unittest.mock import patch
        from botocore.exceptions import ClientError

        staging_bucket_name = os.environ["STAGING_BUCKET_NAME"]
        logging_bucket_name = os.environ["LOGGING_BUCKET_NAME"]
        s3_public_access_policy_arn = os.environ["S3_PUBLIC_ACCESS_POLICY_ARN"]
        s3_public_access_policy_document = {
            "Version": "2012-10-17",
            "Statement": [
                {
                    "Action": [
                        "s3:ListBucket",
                        "s3:ListBucketMultipartUploads",
                        "s3:ListMultipartUploadParts",
                        "s3:GetObject",
                        "s3:GetBucketLocation",
                        "s3:AbortMultipartUpload",
                        "s3:CreateBucket",
                        "s3:PutObject",
                        "s3:DeleteObject",
                    ],
                    "Resource": [
                        f"arn:aws:s3:::{staging_bucket_name}",
                        f"arn:aws:s3:::{staging_bucket_name}/*",
                    ],
                    "Effect": "Allow",
                },
                {
                    "Sid": "S3AccessPolicyForDestination",
                    "Action": [
                        "s3:ListBucket",
                        "s3:ListBucketMultipartUploads",
                        "s3:ListMultipartUploadParts",
                        "s3:GetObject",
                        "s3:GetBucketLocation",
                        "s3:AbortMultipartUpload",
                        "s3:CreateBucket",
                        "s3:PutObject",
                        "s3:DeleteObject",
                    ],
                    "Resource": [
                        f"arn:aws:s3:::{logging_bucket_name}",
                        f"arn:aws:s3:::{logging_bucket_name}/*",
                    ],
                    "Effect": "Allow",
                },
            ],
        }

        iam_client = IAMClient()

        iam_client.delete_oldest_policy_version(arn=s3_public_access_policy_arn)
        response = iam_client.get_policy_document(arn=s3_public_access_policy_arn)
        assert response["Document"] == s3_public_access_policy_document

        new_policy_document = {
            "Sid": "S3AccessPolicyForDestination",
            "Action": [
                "s3:ListBucket",
            ],
            "Resource": [
                f"arn:aws:s3:::{logging_bucket_name}",
                f"arn:aws:s3:::{logging_bucket_name}/*",
            ],
            "Effect": "Allow",
        }
        iam_client.update_policy_document(
            arn=s3_public_access_policy_arn,
            sid="S3AccessPolicyForDestination",
            policy_document=new_policy_document,
        )
        response = iam_client._iam_client.list_policy_versions(
            PolicyArn=s3_public_access_policy_arn
        )
        policy_versions_num = len(response["Versions"])
        assert policy_versions_num == 2
        iam_client.delete_oldest_policy_version(arn=s3_public_access_policy_arn)
        response = iam_client.get_policy_document(arn=s3_public_access_policy_arn)
        assert response["Document"] == {
            "Version": "2012-10-17",
            "Statement": [
                s3_public_access_policy_document["Statement"][0],
                new_policy_document,
            ],
        }

        # mock a delete policy version return exception.
        with patch(
            "botocore.client.BaseClient._make_api_call", new=self.mock_iam_api_call
        ):
            iam_client.delete_oldest_policy_version(
                arn="arn:aws:iam::123456789012:policy/TestDeletePolicyVersionException"
            )

    def test_delete_policy_document(self, mock_iam_context):
        from utils.aws import IAMClient
        from unittest.mock import patch
        from botocore.exceptions import ClientError

        staging_bucket_name = os.environ["STAGING_BUCKET_NAME"]
        logging_bucket_name = os.environ["LOGGING_BUCKET_NAME"]
        s3_public_access_policy_arn = os.environ["S3_PUBLIC_ACCESS_POLICY_ARN"]

        iam_client = IAMClient()

        response = iam_client.get_policy_document(arn=s3_public_access_policy_arn)
        assert response["Document"]["Statement"] == [
            {
                "Action": [
                    "s3:ListBucket",
                    "s3:ListBucketMultipartUploads",
                    "s3:ListMultipartUploadParts",
                    "s3:GetObject",
                    "s3:GetBucketLocation",
                    "s3:AbortMultipartUpload",
                    "s3:CreateBucket",
                    "s3:PutObject",
                    "s3:DeleteObject",
                ],
                "Resource": [
                    f"arn:aws:s3:::{staging_bucket_name}",
                    f"arn:aws:s3:::{staging_bucket_name}/*",
                ],
                "Effect": "Allow",
            },
            {
                "Sid": "S3AccessPolicyForDestination",
                "Action": [
                    "s3:ListBucket",
                    "s3:ListBucketMultipartUploads",
                    "s3:ListMultipartUploadParts",
                    "s3:GetObject",
                    "s3:GetBucketLocation",
                    "s3:AbortMultipartUpload",
                    "s3:CreateBucket",
                    "s3:PutObject",
                    "s3:DeleteObject",
                ],
                "Resource": [
                    f"arn:aws:s3:::{logging_bucket_name}",
                    f"arn:aws:s3:::{logging_bucket_name}/*",
                ],
                "Effect": "Allow",
            },
        ]

        policy_document = {
            "Action": [
                "s3:GetObject",
            ],
            "Resource": [f"arn:aws:s3:::staging-bucket/*"],
            "Effect": "Allow",
        }
        iam_client.update_policy_document(
            arn=s3_public_access_policy_arn,
            sid="TestPolicy",
            policy_document=policy_document,
        )
        response = iam_client.delete_policy_document(
            arn=s3_public_access_policy_arn, sid="S3AccessPolicyForDestination"
        )
        assert response["Document"]["Statement"] == [
            {
                "Action": [
                    "s3:ListBucket",
                    "s3:ListBucketMultipartUploads",
                    "s3:ListMultipartUploadParts",
                    "s3:GetObject",
                    "s3:GetBucketLocation",
                    "s3:AbortMultipartUpload",
                    "s3:CreateBucket",
                    "s3:PutObject",
                    "s3:DeleteObject",
                ],
                "Resource": [
                    f"arn:aws:s3:::{staging_bucket_name}",
                    f"arn:aws:s3:::{staging_bucket_name}/*",
                ],
                "Effect": "Allow",
            },
            {
                "Sid": "TestPolicy",
                "Action": [
                    "s3:GetObject",
                ],
                "Resource": [f"arn:aws:s3:::staging-bucket/*"],
                "Effect": "Allow",
            },
        ]

        # mock a delete queue policy is not success.
        with patch(
            "botocore.client.BaseClient._make_api_call", new=self.mock_iam_api_call
        ):
            response = iam_client.delete_policy_document(
                arn="arn:aws:iam::123456789012:policy/TestPolicy", sid="test", tries=1
            )
            assert response == {
                "Document": {
                    "Statement": [
                        {
                            "Sid": "test",
                        }
                    ]
                },
                "VersionId": "1",
                "IsDefaultVersion": True,
            }

        # mock a delete policy version return exception.
        with patch(
            "botocore.client.BaseClient._make_api_call", new=self.mock_iam_api_call
        ):
            with pytest.raises(ClientError):
                iam_client.delete_policy_document(
                    arn="arn:aws:iam::123456789012:policy/TestDeletePolicyVersionException",
                    sid="test",
                    tries=1,
                )

    def test_get_role_policy(self, mock_iam_context):
        from utils.aws import IAMClient

        staging_bucket_name = os.environ["STAGING_BUCKET_NAME"]
        logging_bucket_name = os.environ["LOGGING_BUCKET_NAME"]
        s3_object_replication_role_arn = os.environ["S3_OBJECTS_REPLICATION_ROLE_ARN"]
        s3_object_replication_role_name = s3_object_replication_role_arn.split("/")[-1]

        iam_client = IAMClient()

        response = iam_client.get_role_policy(
            role_name=s3_object_replication_role_name,
            policy_name="S3ObjectsReplicationPolicy",
        )
        assert response["RoleName"] == s3_object_replication_role_name
        assert response["PolicyName"] == "S3ObjectsReplicationPolicy"
        assert response["PolicyDocument"] == {
            "Version": "2012-10-17",
            "Statement": [
                {
                    "Action": [
                        "s3:ListBucket",
                        "s3:ListBucketMultipartUploads",
                        "s3:ListMultipartUploadParts",
                        "s3:GetObject",
                        "s3:GetBucketLocation",
                        "s3:AbortMultipartUpload",
                        "s3:CreateBucket",
                        "s3:PutObject",
                        "s3:DeleteObject",
                    ],
                    "Resource": [
                        f"arn:aws:s3:::{staging_bucket_name}",
                        f"arn:aws:s3:::{staging_bucket_name}/*",
                    ],
                    "Effect": "Allow",
                },
                {
                    "Sid": "S3AccessPolicyForDestination",
                    "Action": [
                        "s3:ListBucket",
                        "s3:ListBucketMultipartUploads",
                        "s3:ListMultipartUploadParts",
                        "s3:GetObject",
                        "s3:GetBucketLocation",
                        "s3:AbortMultipartUpload",
                        "s3:CreateBucket",
                        "s3:PutObject",
                        "s3:DeleteObject",
                    ],
                    "Resource": [
                        f"arn:aws:s3:::{logging_bucket_name}",
                        f"arn:aws:s3:::{logging_bucket_name}/*",
                    ],
                    "Effect": "Allow",
                },
            ],
        }

        response = iam_client.get_role_policy(
            role_name=s3_object_replication_role_name, policy_name="do-not-exists"
        )
        assert response == {}

    def test_put_role_policy(self, mock_iam_context):
        from utils.aws import IAMClient

        s3_object_replication_role_arn = os.environ["S3_OBJECTS_REPLICATION_ROLE_ARN"]
        s3_object_replication_role_name = s3_object_replication_role_arn.split("/")[-1]

        iam_client = IAMClient()

        policy_document = {
            "Version": "2012-10-17",
            "Statement": [
                {
                    "Action": [
                        "s3:GetObject",
                    ],
                    "Resource": [
                        f"arn:aws:s3:::staging-bucket",
                    ],
                    "Effect": "Allow",
                }
            ],
        }

        response = iam_client.put_role_policy(
            role_name=s3_object_replication_role_name,
            policy_name="S3ObjectsReplicationPolicy",
            policy_document=policy_document,
        )

        response = iam_client.get_role_policy(
            role_name=s3_object_replication_role_name,
            policy_name="S3ObjectsReplicationPolicy",
        )
        assert response["RoleName"] == s3_object_replication_role_name
        assert response["PolicyName"] == "S3ObjectsReplicationPolicy"
        assert response["PolicyDocument"] == policy_document

        response = iam_client.put_role_policy(
            role_name=s3_object_replication_role_name,
            policy_name="do-not-exists",
            policy_document=policy_document,
        )

        response = iam_client.get_role_policy(
            role_name=s3_object_replication_role_name, policy_name="do-not-exists"
        )
        assert response["RoleName"] == s3_object_replication_role_name
        assert response["PolicyName"] == "do-not-exists"
        assert response["PolicyDocument"] == policy_document
        response = iam_client.get_role_policy(
            role_name=s3_object_replication_role_name,
            policy_name="S3ObjectsReplicationPolicy",
        )
        assert response["RoleName"] == s3_object_replication_role_name
        assert response["PolicyName"] == "S3ObjectsReplicationPolicy"
        assert response["PolicyDocument"] == policy_document

    def test_delete_role_policy(self, mock_iam_context):
        from utils.aws import IAMClient

        s3_object_replication_role_arn = os.environ["S3_OBJECTS_REPLICATION_ROLE_ARN"]
        s3_object_replication_role_name = s3_object_replication_role_arn.split("/")[-1]

        iam_client = IAMClient()

        policy_document = {
            "Version": "2012-10-17",
            "Statement": [
                {
                    "Action": [
                        "s3:GetObject",
                    ],
                    "Resource": [
                        f"arn:aws:s3:::staging-bucket",
                    ],
                    "Effect": "Allow",
                }
            ],
        }

        iam_client.put_role_policy(
            role_name=s3_object_replication_role_name,
            policy_name="S3ObjectsReplicationPolicy",
            policy_document=policy_document,
        )
        response = iam_client.get_role_policy(
            role_name=s3_object_replication_role_name,
            policy_name="S3ObjectsReplicationPolicy",
        )
        assert response["RoleName"] == s3_object_replication_role_name
        assert response["PolicyName"] == "S3ObjectsReplicationPolicy"
        assert response["PolicyDocument"] == policy_document
        response = iam_client.delete_role_policy(
            role_name=s3_object_replication_role_name,
            policy_name="S3ObjectsReplicationPolicy",
        )
        assert response["ResponseMetadata"]["HTTPStatusCode"] == 200

        response = iam_client.delete_role_policy(
            role_name=s3_object_replication_role_name,
            policy_name="S3ObjectsReplicationPolicy",
        )
        assert response == {}

    def test_get_role(self, mock_iam_context):
        from utils.aws import IAMClient

        s3_object_replication_role_arn = os.environ["S3_OBJECTS_REPLICATION_ROLE_ARN"]
        s3_object_replication_role_name = s3_object_replication_role_arn.split("/")[-1]

        iam_client = IAMClient()

        response = iam_client.get_role(role_name=s3_object_replication_role_name)
        assert response["Role"]["RoleName"] == s3_object_replication_role_name
        assert response["Role"]["Arn"] == s3_object_replication_role_arn
        assert response["Role"]["AssumeRolePolicyDocument"] == {
            "Version": "2012-10-17",
            "Statement": [
                {
                    "Effect": "Allow",
                    "Principal": {"Service": ["lambda.amazonaws.com"]},
                    "Action": ["sts:AssumeRole"],
                }
            ],
        }

        with pytest.raises(Exception) as exception_info:
            iam_client.get_role(role_name="do-not-exists-role")
        assert (
            exception_info.value.args[0]
            == "An error occurred (NoSuchEntity) when calling the GetRole operation: Role do-not-exists-role not found"
        )

    def test_update_assume_role_policy(self, mock_iam_context):
        from utils.aws import IAMClient

        s3_object_replication_role_arn = os.environ["S3_OBJECTS_REPLICATION_ROLE_ARN"]
        s3_object_replication_role_name = s3_object_replication_role_arn.split("/")[-1]

        iam_client = IAMClient()

        response = iam_client.get_role(role_name=s3_object_replication_role_name)
        assume_role_policy_document = response["Role"]["AssumeRolePolicyDocument"]

        assume_role_policy_document["Statement"][0]["Principal"]["Service"].append(
            "scheduler.amazonaws.com"
        )

        iam_client.update_assume_role_policy(
            role_name=s3_object_replication_role_name,
            policy_document=assume_role_policy_document,
        )
        response = iam_client.get_role(role_name=s3_object_replication_role_name)
        assert response["Role"]["RoleName"] == s3_object_replication_role_name
        assert response["Role"]["Arn"] == s3_object_replication_role_arn
        assert response["Role"]["AssumeRolePolicyDocument"] == {
            "Version": "2012-10-17",
            "Statement": [
                {
                    "Effect": "Allow",
                    "Principal": {
                        "Service": ["lambda.amazonaws.com", "scheduler.amazonaws.com"]
                    },
                    "Action": ["sts:AssumeRole"],
                }
            ],
        }

    def test_add_service_principal_to_assume_role_policy(self, mock_iam_context):
        from utils.aws import IAMClient

        s3_object_replication_role_arn = os.environ["S3_OBJECTS_REPLICATION_ROLE_ARN"]
        s3_object_replication_role_name = s3_object_replication_role_arn.split("/")[-1]

        iam_client = IAMClient()

        iam_client.add_service_principal_to_assume_role_policy(
            role_name=s3_object_replication_role_name,
            service_principal="scheduler.amazonaws.com",
        )
        response = iam_client.get_role(role_name=s3_object_replication_role_name)
        assert response["Role"]["RoleName"] == s3_object_replication_role_name
        assert response["Role"]["Arn"] == s3_object_replication_role_arn
        assert response["Role"]["AssumeRolePolicyDocument"] == {
            "Version": "2012-10-17",
            "Statement": [
                {
                    "Effect": "Allow",
                    "Principal": {
                        "Service": [
                            "lambda.amazonaws.com",
                        ]
                    },
                    "Action": ["sts:AssumeRole"],
                },
                {
                    "Effect": "Allow",
                    "Principal": {"Service": "scheduler.amazonaws.com"},
                    "Action": "sts:AssumeRole",
                },
            ],
        }
        # repeat to add
        iam_client.add_service_principal_to_assume_role_policy(
            role_name=s3_object_replication_role_name,
            service_principal="scheduler.amazonaws.com",
        )
        response = iam_client.get_role(role_name=s3_object_replication_role_name)
        assert response["Role"]["RoleName"] == s3_object_replication_role_name
        assert response["Role"]["Arn"] == s3_object_replication_role_arn
        assert response["Role"]["AssumeRolePolicyDocument"] == {
            "Version": "2012-10-17",
            "Statement": [
                {
                    "Effect": "Allow",
                    "Principal": {
                        "Service": [
                            "lambda.amazonaws.com",
                        ]
                    },
                    "Action": ["sts:AssumeRole"],
                },
                {
                    "Effect": "Allow",
                    "Principal": {"Service": "scheduler.amazonaws.com"},
                    "Action": "sts:AssumeRole",
                },
            ],
        }

        # test for return exception
        with pytest.raises(Exception) as exception_info:
            iam_client.add_service_principal_to_assume_role_policy(
                role_name="do-not-exists-role",
                service_principal="do-not-exists.amazonaws.com",
                tries=1,
            )
        assert (
            exception_info.value.args[0]
            == "An error occurred (NoSuchEntity) when calling the GetRole operation: Role do-not-exists-role not found"
        )


class TestLambdaClient:

    def test_invoke(self, mock_iam_context, mock_lambda_context):
        from utils.aws import LambdaClient

        pipeline_resources_builder = os.environ[
            "PIPELINE_RESOURCES_BUILDER_FUNCTION_NAME"
        ]

        lambda_client = LambdaClient()

        assert (
            lambda_client.invoke(function_name=pipeline_resources_builder, payload={})[
                "StatusCode"
            ]
            == 200
        )


class TestSchedulerClient:

    def test_get_schedule_group(self, mock_scheduler_context):
        from utils.aws import SchedulerClient

        application_pipeline_id = os.environ["APPLICATION_PIPELINE_ID"]

        scheduler_client = SchedulerClient()

        response = scheduler_client.get_schedule_group(name=application_pipeline_id)
        assert (
            response["Arn"]
            == f"arn:aws:scheduler:us-east-1:123456789012:schedule-group/{application_pipeline_id}"
        )
        assert response["Name"] == application_pipeline_id

        response = scheduler_client.get_schedule_group(
            name="do-not-exists-schedule-group"
        )
        assert response == {}

    def test_create_schedule_group(self, mock_scheduler_context):
        from utils.aws import SchedulerClient

        scheduler_client = SchedulerClient()

        response = scheduler_client.create_schedule_group(name="test")
        assert (
            response["Arn"]
            == "arn:aws:scheduler:us-east-1:123456789012:schedule-group/test"
        )
        assert response["Name"] == "test"

        response = scheduler_client.create_schedule_group(name="test")
        assert (
            response["Arn"]
            == "arn:aws:scheduler:us-east-1:123456789012:schedule-group/test"
        )
        assert response["Name"] == "test"

        response = scheduler_client.create_schedule_group(
            name="do-not-exists-schedule-group"
        )
        assert (
            response["Arn"]
            == "arn:aws:scheduler:us-east-1:123456789012:schedule-group/do-not-exists-schedule-group"
        )
        assert response["Name"] == "do-not-exists-schedule-group"

    def test_delete_schedule_group(self, mock_scheduler_context):
        from utils.aws import SchedulerClient

        application_pipeline_id = os.environ["APPLICATION_PIPELINE_ID"]

        scheduler_client = SchedulerClient()

        response = scheduler_client.delete_schedule_group(
            name="do-not-exists-schedule-group"
        )
        assert response is None

        response = scheduler_client.get_schedule_group(name=application_pipeline_id)
        assert (
            response["Arn"]
            == f"arn:aws:scheduler:us-east-1:123456789012:schedule-group/{application_pipeline_id}"
        )

        response = scheduler_client.delete_schedule_group(name=application_pipeline_id)
        assert response is None
        response = scheduler_client.get_schedule_group(name=application_pipeline_id)
        assert response == {}

    def test_get_schedule(self, mock_scheduler_context):
        from utils.aws import SchedulerClient

        application_pipeline_id = os.environ["APPLICATION_PIPELINE_ID"]

        scheduler_client = SchedulerClient()

        response = scheduler_client.get_schedule(name="LogProcessor")
        assert response == {}

        response = scheduler_client.get_schedule(
            name="LogProcessor", group_name=application_pipeline_id
        )
        assert (
            response["Arn"]
            == f"arn:aws:scheduler:us-east-1:123456789012:schedule/{application_pipeline_id}/LogProcessor"
        )

        response = scheduler_client.get_schedule(
            name="do-not-exists-schedule", group_name=application_pipeline_id
        )
        assert response == {}

    def test_create_schedule(self, mock_scheduler_context):
        from utils.aws import SchedulerClient

        application_pipeline_id = os.environ["APPLICATION_PIPELINE_ID"]
        s3_objects_scanning_function_arn = os.environ[
            "S3_OBJECTS_SCANNING_FUNCTION_ARN"
        ]
        s3_objects_scanning_role_arn = os.environ["S3_OBJECTS_SCANNING_ROLE_ARN"]

        scheduler_client = SchedulerClient()

        response = scheduler_client.create_schedule(
            name="do-not-exists-schedule",
            input={"meta": {}},
            target_arn=s3_objects_scanning_function_arn,
            target_role_arn=s3_objects_scanning_role_arn,
            group_name=application_pipeline_id,
        )
        assert (
            response["Arn"]
            == f"arn:aws:scheduler:us-east-1:123456789012:schedule/{application_pipeline_id}/do-not-exists-schedule"
        )
        assert response["FlexibleTimeWindow"] == {"Mode": "OFF"}
        assert response["GroupName"] == application_pipeline_id
        assert response["Name"] == "do-not-exists-schedule"
        assert response["ScheduleExpression"] == "rate(5 minutes)"
        assert response["State"] == "ENABLED"
        assert response["Target"]["Arn"] == s3_objects_scanning_function_arn
        assert response["Target"]["Input"] == '{\n    "meta": {}\n}'
        assert response["Target"]["RoleArn"] == s3_objects_scanning_role_arn

        response = scheduler_client.create_schedule(
            name="LogMerger",
            input={"meta": {}},
            target_arn=s3_objects_scanning_function_arn,
            target_role_arn=s3_objects_scanning_role_arn,
            schedule="rate(10 minutes)",
            flexible_time_windows={"Mode": "ON"},
        )
        assert (
            response["Arn"]
            == "arn:aws:scheduler:us-east-1:123456789012:schedule/default/LogMerger"
        )
        assert response["FlexibleTimeWindow"] == {"Mode": "ON"}
        assert response["GroupName"] == "default"
        assert response["Name"] == "LogMerger"
        assert response["ScheduleExpression"] == "rate(10 minutes)"
        assert response["State"] == "ENABLED"
        assert response["Target"]["Arn"] == s3_objects_scanning_function_arn
        assert response["Target"]["Input"] == '{\n    "meta": {}\n}'
        assert response["Target"]["RoleArn"] == s3_objects_scanning_role_arn

        response = scheduler_client.create_schedule(
            name="LogMerger",
            input={"meta": {"athena": {}}},
            target_arn=s3_objects_scanning_function_arn,
            target_role_arn=s3_objects_scanning_role_arn,
        )
        assert (
            response["Arn"]
            == "arn:aws:scheduler:us-east-1:123456789012:schedule/default/LogMerger"
        )
        assert response["FlexibleTimeWindow"] == {"Mode": "OFF"}
        assert response["GroupName"] == "default"
        assert response["Name"] == "LogMerger"
        assert response["ScheduleExpression"] == "rate(5 minutes)"
        assert response["State"] == "ENABLED"
        assert response["Target"]["Arn"] == s3_objects_scanning_function_arn
        assert (
            response["Target"]["Input"]
            == '{\n    "meta": {\n        "athena": {}\n    }\n}'
        )
        assert response["Target"]["RoleArn"] == s3_objects_scanning_role_arn

    def test_delete_schedule(self, mock_scheduler_context):
        from utils.aws import SchedulerClient

        application_pipeline_id = os.environ["APPLICATION_PIPELINE_ID"]

        scheduler_client = SchedulerClient()

        response = scheduler_client.delete_schedule(name="do-not-exists-schedule")
        assert response is None

        response = scheduler_client.get_schedule(
            name="LogProcessor", group_name=application_pipeline_id
        )
        assert (
            response["Arn"]
            == f"arn:aws:scheduler:us-east-1:123456789012:schedule/{application_pipeline_id}/LogProcessor"
        )

        response = scheduler_client.delete_schedule(
            name="LogProcessor", group_name=application_pipeline_id
        )
        assert response is None
        response = scheduler_client.get_schedule(
            name="LogProcessor", group_name=application_pipeline_id
        )
        assert response == {}

    def test_create_processor_schedule(self, mock_scheduler_context):
        import types
        from utils.aws import SchedulerClient

        s3_objects_scanning_function_arn = os.environ[
            "S3_OBJECTS_SCANNING_FUNCTION_ARN"
        ]
        s3_objects_scanning_role_arn = os.environ["S3_OBJECTS_SCANNING_ROLE_ARN"]

        scheduler_client = SchedulerClient()

        statements = types.SimpleNamespace()
        statements.create = "create"
        statements.drop = "drop"
        statements.insert = "insert"
        statements.aggregate = ["aggregate"]
        response = scheduler_client.create_processor_schedule(
            pipeline_id="test",
            source_type="WAF",
            table_name="tableName",
            staging_location="s3://staging-bucket/WAFLogs",
            archive_location="s3:/staging-bucket/archive/WAFLogs",
            statements=statements,
            service="SES",
            recipients=["alejandro_rosalez@example.com"],
            sfn_arn=s3_objects_scanning_function_arn,
            role_arn=s3_objects_scanning_role_arn,
        )
        assert (
            response["Arn"]
            == "arn:aws:scheduler:us-east-1:123456789012:schedule/default/LogProcessor"
        )
        assert response["FlexibleTimeWindow"] == {"Mode": "OFF"}
        assert response["GroupName"] == "default"
        assert response["Name"] == "LogProcessor"
        assert response["ScheduleExpression"] == "rate(5 minutes)"
        assert response["State"] == "ENABLED"
        assert response["Target"]["Arn"] == s3_objects_scanning_function_arn
        assert (
            response["Target"]["Input"]
            == '{\n    "metadata": {\n        "pipelineId": "test",\n        "sourceType": "WAF",\n        "scheduleType": "LogProcessor",\n        "enrichmentPlugins": [],\n        "s3": {\n            "srcPath": "s3://staging-bucket/WAFLogs",\n            "archivePath": "s3:/staging-bucket/archive/WAFLogs"\n        },\n        "athena": {\n            "tableName": "tableName",\n            "statements": {\n                "create": "create",\n                "drop": "drop",\n                "insert": "insert",\n                "aggregate": [\n                    "aggregate"\n                ]\n            }\n        },\n        "notification": {\n            "service": "SES",\n            "recipients": [\n                "alejandro_rosalez@example.com"\n            ]\n        }\n    }\n}'
        )
        assert response["Target"]["RoleArn"] == s3_objects_scanning_role_arn

    def test_create_merger_schedule(self, mock_scheduler_context):
        from utils.aws import SchedulerClient

        s3_objects_scanning_function_arn = os.environ[
            "S3_OBJECTS_SCANNING_FUNCTION_ARN"
        ]
        s3_objects_scanning_role_arn = os.environ["S3_OBJECTS_SCANNING_ROLE_ARN"]

        scheduler_client = SchedulerClient()
        statements = types.SimpleNamespace()
        statements.create = ""
        statements.drop = ""
        statements.insert = ""
        statements.aggregate = []
        response = scheduler_client.create_merger_schedule(
            pipeline_id="test",
            source_type="WAF",
            table_name="tableName",
            schedule_type="LogMerger",
            table_location="s3://centralized-bucket/centralized/waf",
            partition_info={},
            age=10,
            database="centralized",
            archive_location="s3:/staging-bucket/archive/WAFLogs",
            service="SES",
            recipients=["alejandro_rosalez@example.com"],
            sfn_arn=s3_objects_scanning_function_arn,
            role_arn=s3_objects_scanning_role_arn,
        )
        assert (
            response["Arn"]
            == "arn:aws:scheduler:us-east-1:123456789012:schedule/default/LogMerger"
        )
        assert response["FlexibleTimeWindow"] == {
            "MaximumWindowInMinutes": 30,
            "Mode": "FLEXIBLE",
        }
        assert response["GroupName"] == "default"
        assert response["Name"] == "LogMerger"
        assert response["ScheduleExpression"] == "cron(0 1 * * ? *)"
        assert response["State"] == "ENABLED"
        assert response["Target"]["Arn"] == s3_objects_scanning_function_arn
        assert (
            response["Target"]["Input"]
            == '{\n    "metadata": {\n        "pipelineId": "test",\n        "sourceType": "WAF",\n        "scheduleType": "LogMerger",\n        "s3": {\n            "srcPath": "s3://centralized-bucket/centralized/waf",\n            "archivePath": "s3:/staging-bucket/archive/WAFLogs"\n        },\n        "athena": {\n            "firstPartitionKey": "event_hour",\n            "partitionInfo": {},\n            "intervalDays": -10,\n            "database": "centralized",\n            "tableName": "tableName"\n        },\n        "notification": {\n            "service": "SES",\n            "recipients": [\n                "alejandro_rosalez@example.com"\n            ]\n        }\n    }\n}'
        )
        assert response["Target"]["RoleArn"] == s3_objects_scanning_role_arn

    def test_create_archive_schedule(self, mock_scheduler_context):
        import types
        from utils.aws import SchedulerClient

        s3_objects_scanning_function_arn = os.environ[
            "S3_OBJECTS_SCANNING_FUNCTION_ARN"
        ]
        s3_objects_scanning_role_arn = os.environ["S3_OBJECTS_SCANNING_ROLE_ARN"]

        scheduler_client = SchedulerClient()
        statements = types.SimpleNamespace()
        statements.create = ""
        statements.drop = ""
        statements.insert = ""
        statements.aggregate = []
        response = scheduler_client.create_archive_schedule(
            pipeline_id="test",
            source_type="WAF",
            table_name="tableName",
            schedule_type="LogArchive",
            table_location="s3://centralized-bucket/centralized/waf",
            age=10,
            database="centralized",
            archive_location="s3:/staging-bucket/archive/WAFLogs",
            service="SES",
            recipients=["alejandro_rosalez@example.com"],
            sfn_arn=s3_objects_scanning_function_arn,
            role_arn=s3_objects_scanning_role_arn,
        )
        assert (
            response["Arn"]
            == "arn:aws:scheduler:us-east-1:123456789012:schedule/default/LogArchive"
        )
        assert response["FlexibleTimeWindow"] == {
            "MaximumWindowInMinutes": 30,
            "Mode": "FLEXIBLE",
        }
        assert response["GroupName"] == "default"
        assert response["Name"] == "LogArchive"
        assert response["ScheduleExpression"] == "cron(0 2 * * ? *)"
        assert response["State"] == "ENABLED"
        assert response["Target"]["Arn"] == s3_objects_scanning_function_arn
        assert (
            response["Target"]["Input"]
            == '{\n    "metadata": {\n        "pipelineId": "test",\n        "sourceType": "WAF",\n        "scheduleType": "LogArchive",\n        "s3": {\n            "srcPath": "s3://centralized-bucket/centralized/waf",\n            "archivePath": "s3:/staging-bucket/archive/WAFLogs"\n        },\n        "athena": {\n            "firstPartitionKey": "event_hour",\n            "intervalDays": -10,\n            "database": "centralized",\n            "tableName": "tableName"\n        },\n        "notification": {\n            "service": "SES",\n            "recipients": [\n                "alejandro_rosalez@example.com"\n            ]\n        }\n    }\n}'
        )
        assert response["Target"]["RoleArn"] == s3_objects_scanning_role_arn


class TestEventsClient:

    def test_schedule_expression_formatter(self, mock_events_context):
        from utils.aws import EventsClient

        events_client = EventsClient()

        for unit in ("minutes", "hours", "days"):
            rate_expression = f"rate(1 {unit})"
            expression = events_client._schedule_expression_formatter(
                schedule=rate_expression
            )
            assert expression == f"rate(1 {unit[:-1]})"

        for unit in ("minute", "hour", "day"):
            rate_expression = f"rate(1 {unit})"
            expression = events_client._schedule_expression_formatter(
                schedule=rate_expression
            )
            assert expression == f"rate(1 {unit})"

        for unit in ("minutes", "hours", "days"):
            rate_expression = f"rate(2 {unit})"
            expression = events_client._schedule_expression_formatter(
                schedule=rate_expression
            )
            assert expression == f"rate(2 {unit})"

        for unit in ("minute", "hour", "day"):
            rate_expression = f"rate(2 {unit})"
            expression = events_client._schedule_expression_formatter(
                schedule=rate_expression
            )
            assert expression == f"rate(2 {unit}s)"

        cron_expression = "cron(0 20 * * ? *)"
        expression = events_client._schedule_expression_formatter(
            schedule=cron_expression
        )
        assert expression == cron_expression

    def test_put_rule(self, mock_events_context):
        from utils.aws import EventsClient

        events_client = EventsClient()

        response = events_client.put_rule(
            name="LogProcessor",
            schedule="rate(5 minutes)",
            state="ENABLED",
            event_bus_name="default",
        )
        assert (
            response["RuleArn"]
            == "arn:aws:events:us-east-1:123456789012:rule/LogProcessor"
        )

        response = events_client.put_rule(
            name="LogProcessor",
            schedule="rate(10 minutes)",
            state="DISABLED",
            event_bus_name="default",
        )
        assert (
            response["RuleArn"]
            == "arn:aws:events:us-east-1:123456789012:rule/LogProcessor"
        )

    def test_delete_rule(self, mock_events_context):
        from utils.aws import EventsClient

        events_client = EventsClient()

        response = events_client._events_client.list_rules(
            NamePrefix="do-not-exists-rule", EventBusName="default"
        )
        assert response["Rules"] == []

        response = events_client.delete_rule(
            name="do-not-exists-rule", event_bus_name="default"
        )
        assert response is None

        response = events_client._events_client.list_rules(
            NamePrefix="LogProcessor", EventBusName="default"
        )
        assert response["Rules"][0] == {
            "Name": "LogProcessor",
            "Arn": "arn:aws:events:us-east-1:123456789012:rule/LogProcessor",
            "State": "ENABLED",
            "ScheduleExpression": "rate(5 minutes)",
            "EventBusName": "default",
        }

        response = events_client.delete_rule(name="LogProcessor")
        assert response is None

        response = events_client._events_client.list_rules(NamePrefix="LogProcessor")
        assert response["Rules"] == []

        events_client.put_rule(
            name="LogProcessorForTestSamePrefix",
            schedule="rate(5 minutes)",
            state="ENABLED",
            event_bus_name="default",
        )
        response = events_client.delete_rule(name="LogProcessor")
        assert response is None
        response = events_client._events_client.list_rules(NamePrefix="LogProcessor")
        assert response["Rules"] == [
            {
                "Name": "LogProcessorForTestSamePrefix",
                "Arn": "arn:aws:events:us-east-1:123456789012:rule/LogProcessorForTestSamePrefix",
                "State": "ENABLED",
                "ScheduleExpression": "rate(5 minutes)",
                "EventBusName": "default",
            }
        ]

    def test_put_targets(self, mock_events_context):
        from utils.aws import EventsClient

        application_pipeline_id = os.environ["APPLICATION_PIPELINE_ID"]
        s3_objects_scanning_function_arn = os.environ[
            "S3_OBJECTS_SCANNING_FUNCTION_ARN"
        ]
        s3_objects_scanning_role_arn = os.environ["S3_OBJECTS_SCANNING_ROLE_ARN"]

        events_client = EventsClient()

        response = events_client.put_targets(
            id=application_pipeline_id,
            rule_name="LogProcessor",
            target_role_arn=s3_objects_scanning_role_arn,
            input={"meta": {}},
            target_arn=s3_objects_scanning_function_arn,
            event_bus_name="default",
        )
        assert response["ResponseMetadata"]["HTTPStatusCode"] == 200
        response = events_client._events_client.list_targets_by_rule(
            Rule="LogProcessor", EventBusName="default"
        )
        assert response["Targets"] == [
            {
                "Id": "1234567890",
                "Arn": "arn:aws:states:us-east-1:123456789012:stateMachine:LogProcessor-jwEfndaqF0Yf",
                "RoleArn": "arn:aws:iam::123456789012:role/LogProcessor-jwEfndaqF0Yf",
                "Input": '{\n    "metadata": {}\n}',
            },
            {
                "Id": application_pipeline_id,
                "Arn": s3_objects_scanning_function_arn,
                "RoleArn": s3_objects_scanning_role_arn,
                "Input": '{\n    "meta": {}\n}',
            },
        ]

        # repeat to put target
        response = events_client.put_targets(
            id=application_pipeline_id,
            rule_name="LogProcessor",
            target_role_arn=s3_objects_scanning_role_arn,
            input={"meta": {}},
            target_arn=s3_objects_scanning_function_arn,
            event_bus_name="default",
        )
        assert response["ResponseMetadata"]["HTTPStatusCode"] == 200
        response = events_client._events_client.list_targets_by_rule(
            Rule="LogProcessor", EventBusName="default"
        )
        assert response["Targets"] == [
            {
                "Id": "1234567890",
                "Arn": "arn:aws:states:us-east-1:123456789012:stateMachine:LogProcessor-jwEfndaqF0Yf",
                "RoleArn": "arn:aws:iam::123456789012:role/LogProcessor-jwEfndaqF0Yf",
                "Input": '{\n    "metadata": {}\n}',
            },
            {
                "Id": application_pipeline_id,
                "Arn": s3_objects_scanning_function_arn,
                "RoleArn": s3_objects_scanning_role_arn,
                "Input": '{\n    "meta": {}\n}',
            },
        ]

        response = events_client.put_targets(
            id=application_pipeline_id,
            rule_name="LogProcessor",
            input={"meta": {}},
            target_arn=s3_objects_scanning_function_arn,
            event_bus_name="default",
        )
        assert response["ResponseMetadata"]["HTTPStatusCode"] == 200
        response = events_client._events_client.list_targets_by_rule(
            Rule="LogProcessor", EventBusName="default"
        )
        assert response["Targets"] == [
            {
                "Id": "1234567890",
                "Arn": "arn:aws:states:us-east-1:123456789012:stateMachine:LogProcessor-jwEfndaqF0Yf",
                "RoleArn": "arn:aws:iam::123456789012:role/LogProcessor-jwEfndaqF0Yf",
                "Input": '{\n    "metadata": {}\n}',
            },
            {
                "Id": application_pipeline_id,
                "Arn": s3_objects_scanning_function_arn,
                "Input": '{\n    "meta": {}\n}',
            },
        ]

    def test_create_processor_rule(self, mock_events_context):
        from utils.aws import EventsClient

        application_pipeline_id = os.environ["APPLICATION_PIPELINE_ID"]
        s3_objects_scanning_function_arn = os.environ[
            "S3_OBJECTS_SCANNING_FUNCTION_ARN"
        ]
        s3_objects_scanning_role_arn = os.environ["S3_OBJECTS_SCANNING_ROLE_ARN"]

        events_client = EventsClient()

        statements = types.SimpleNamespace()
        statements.create = "create"
        statements.drop = "drop"
        statements.insert = "insert"
        statements.aggregate = ["aggregate"]

        response = events_client.create_processor_rule(
            pipeline_id="test",
            name="NewLogProcessor",
            source_type="WAF",
            table_name="tableName",
            staging_location="s3://staging-bucket/WAFLogs",
            archive_location="s3:/staging-bucket/archive/WAFLogs",
            statements=statements,
            service="SES",
            recipients=["alejandro_rosalez@example.com"],
            sfn_arn=s3_objects_scanning_function_arn,
            role_arn=s3_objects_scanning_role_arn,
            schedule="rate(5 minutes)",
            event_bus_name="default",
        )
        assert response["ResponseMetadata"]["HTTPStatusCode"] == 200

        response = events_client._events_client.list_rules(
            NamePrefix="NewLogProcessor", EventBusName="default"
        )
        assert response["Rules"][0] == {
            "Name": "NewLogProcessor",
            "Arn": "arn:aws:events:us-east-1:123456789012:rule/NewLogProcessor",
            "State": "ENABLED",
            "ScheduleExpression": "rate(5 minutes)",
            "EventBusName": "default",
        }

        response = events_client._events_client.list_targets_by_rule(
            Rule="NewLogProcessor", EventBusName="default"
        )
        assert response["Targets"] == [
            {
                "Id": "test",
                "Arn": s3_objects_scanning_function_arn,
                "RoleArn": s3_objects_scanning_role_arn,
                "Input": '{\n    "metadata": {\n        "pipelineId": "test",\n        "sourceType": "WAF",\n        "scheduleType": "LogProcessor",\n        "enrichmentPlugins": [],\n        "s3": {\n            "srcPath": "s3://staging-bucket/WAFLogs",\n            "archivePath": "s3:/staging-bucket/archive/WAFLogs"\n        },\n        "athena": {\n            "tableName": "tableName",\n            "statements": {\n                "create": "create",\n                "drop": "drop",\n                "insert": "insert",\n                "aggregate": [\n                    "aggregate"\n                ]\n            }\n        },\n        "notification": {\n            "service": "SES",\n            "recipients": [\n                "alejandro_rosalez@example.com"\n            ]\n        }\n    }\n}',
            }
        ]

    def test_create_merger_rule(self, mock_events_context):
        from utils.aws import EventsClient

        application_pipeline_id = os.environ["APPLICATION_PIPELINE_ID"]
        s3_objects_scanning_function_arn = os.environ[
            "S3_OBJECTS_SCANNING_FUNCTION_ARN"
        ]
        s3_objects_scanning_role_arn = os.environ["S3_OBJECTS_SCANNING_ROLE_ARN"]

        events_client = EventsClient()

        statements = types.SimpleNamespace()
        statements.create = "create"
        statements.drop = "drop"
        statements.insert = "insert"
        statements.aggregate = ["aggregate"]

        response = events_client.create_merger_rule(
            pipeline_id="test",
            name="LogMerger",
            source_type="WAF",
            index_name="waf",
            table_name="tableName",
            schedule_type="LogMerger",
            table_location="s3://centralized-bucket/centralized/waf",
            partition_info={},
            age=10,
            database="centralized",
            archive_location="s3:/staging-bucket/archive/WAFLogs",
            service="SES",
            recipients=["alejandro_rosalez@example.com"],
            sfn_arn=s3_objects_scanning_function_arn,
            role_arn=s3_objects_scanning_role_arn,
            schedule="cron(0 1 * * ? *)",
            event_bus_name="default",
        )
        assert response["ResponseMetadata"]["HTTPStatusCode"] == 200

        response = events_client._events_client.list_rules(
            NamePrefix="LogMerger", EventBusName="default"
        )
        assert response["Rules"][0] == {
            "Name": "LogMerger",
            "Arn": "arn:aws:events:us-east-1:123456789012:rule/LogMerger",
            "State": "ENABLED",
            "ScheduleExpression": "cron(0 1 * * ? *)",
            "EventBusName": "default",
        }

        response = events_client._events_client.list_targets_by_rule(
            Rule="LogMerger", EventBusName="default"
        )
        assert response["Targets"] == [
            {
                "Id": "test",
                "Arn": s3_objects_scanning_function_arn,
                "RoleArn": s3_objects_scanning_role_arn,
                "Input": '{\n    "metadata": {\n        "pipelineId": "test",\n        "sourceType": "WAF",\n        "scheduleType": "LogMerger",\n        "s3": {\n            "srcPath": "s3://centralized-bucket/centralized/waf",\n            "archivePath": "s3:/staging-bucket/archive/WAFLogs"\n        },\n        "athena": {\n            "firstPartitionKey": "event_hour",\n            "partitionInfo": {},\n            "intervalDays": -10,\n            "database": "centralized",\n            "tableName": "tableName"\n        },\n        "notification": {\n            "service": "SES",\n            "recipients": [\n                "alejandro_rosalez@example.com"\n            ]\n        }\n    }\n}',
            }
        ]

    def test_create_archive_rule(self, mock_events_context):
        from utils.aws import EventsClient

        application_pipeline_id = os.environ["APPLICATION_PIPELINE_ID"]
        s3_objects_scanning_function_arn = os.environ[
            "S3_OBJECTS_SCANNING_FUNCTION_ARN"
        ]
        s3_objects_scanning_role_arn = os.environ["S3_OBJECTS_SCANNING_ROLE_ARN"]

        events_client = EventsClient()

        statements = types.SimpleNamespace()
        statements.create = "create"
        statements.drop = "drop"
        statements.insert = "insert"
        statements.aggregate = ["aggregate"]

        response = events_client.create_archive_rule(
            pipeline_id="test",
            name="LogArchive",
            source_type="WAF",
            table_name="tableName",
            schedule_type="LogArchive",
            table_location="s3://centralized-bucket/centralized/waf",
            age=10,
            database="centralized",
            archive_location="s3:/staging-bucket/archive/WAFLogs",
            service="SES",
            recipients=["alejandro_rosalez@example.com"],
            sfn_arn=s3_objects_scanning_function_arn,
            role_arn=s3_objects_scanning_role_arn,
            schedule="cron(0 2 * * ? *)",
            event_bus_name="default",
        )
        assert response["ResponseMetadata"]["HTTPStatusCode"] == 200

        response = events_client._events_client.list_rules(
            NamePrefix="LogArchive", EventBusName="default"
        )
        assert response["Rules"][0] == {
            "Name": "LogArchive",
            "Arn": "arn:aws:events:us-east-1:123456789012:rule/LogArchive",
            "State": "ENABLED",
            "ScheduleExpression": "cron(0 2 * * ? *)",
            "EventBusName": "default",
        }

        response = events_client._events_client.list_targets_by_rule(
            Rule="LogArchive", EventBusName="default"
        )
        assert response["Targets"] == [
            {
                "Id": "test",
                "Arn": s3_objects_scanning_function_arn,
                "RoleArn": s3_objects_scanning_role_arn,
                "Input": '{\n    "metadata": {\n        "pipelineId": "test",\n        "sourceType": "WAF",\n        "scheduleType": "LogArchive",\n        "s3": {\n            "srcPath": "s3://centralized-bucket/centralized/waf",\n            "archivePath": "s3:/staging-bucket/archive/WAFLogs"\n        },\n        "athena": {\n            "firstPartitionKey": "event_hour",\n            "intervalDays": -10,\n            "database": "centralized",\n            "tableName": "tableName"\n        },\n        "notification": {\n            "service": "SES",\n            "recipients": [\n                "alejandro_rosalez@example.com"\n            ]\n        }\n    }\n}',
            }
        ]

    def test_create_connector_rule(self, mock_events_context):
        from utils.aws import EventsClient

        aws_region = os.environ["AWS_REGION"]
        account_id = os.environ["ACCOUNT_ID"]
        s3_objects_replication_function_arn = os.environ[
            "S3_OBJECTS_REPLICATION_FUNCTION_ARN"
        ]

        events_client = EventsClient()

        rule_id = str(uuid.uuid4())
        events_client.create_connector_rule(
            id=rule_id, input={"a": 1}, lambda_arn=s3_objects_replication_function_arn
        )

        response = events_client._events_client.list_rules(
            NamePrefix=f"Connector-{rule_id}", EventBusName="default"
        )
        assert response["Rules"][0] == {
            "Name": f"Connector-{rule_id}",
            "Arn": f"arn:aws:events:{aws_region}:{account_id}:rule/Connector-{rule_id}",
            "State": "ENABLED",
            "ScheduleExpression": "rate(5 minutes)",
            "EventBusName": "default",
        }
        response = events_client._events_client.list_targets_by_rule(
            Rule=f"Connector-{rule_id}", EventBusName="default"
        )
        assert response["Targets"][0]["Id"] == rule_id
        assert response["Targets"][0]["Arn"] == s3_objects_replication_function_arn
        assert "RoleArn" not in response["Targets"][0]
        assert json.loads(response["Targets"][0]["Input"]) == {"a": 1}

        rule_id = str(uuid.uuid4())
        events_client.create_connector_rule(
            id=rule_id,
            input={"a": 1},
            lambda_arn=s3_objects_replication_function_arn,
            rule_name=rule_id,
        )

        response = events_client._events_client.list_rules(
            NamePrefix=rule_id, EventBusName="default"
        )
        assert response["Rules"][0] == {
            "Name": rule_id,
            "Arn": f"arn:aws:events:{aws_region}:{account_id}:rule/{rule_id}",
            "State": "ENABLED",
            "ScheduleExpression": "rate(5 minutes)",
            "EventBusName": "default",
        }

    def test_s3_event_driver_rule(self, mock_events_context):
        from utils.aws import EventsClient

        aws_region = os.environ["AWS_REGION"]
        account_id = os.environ["ACCOUNT_ID"]
        staging_bucket_name = os.environ["STAGING_BUCKET_NAME"]
        s3_objects_replication_function_arn = os.environ[
            "S3_OBJECTS_REPLICATION_FUNCTION_ARN"
        ]

        events_client = EventsClient()

        rule_id = str(uuid.uuid4())
        staging_bucket_prefix = "AWSLogs/123456789012"
        events_client.create_s3_event_driver_rule(
            id=rule_id,
            bucket=staging_bucket_name,
            prefix=staging_bucket_prefix,
            lambda_arn=s3_objects_replication_function_arn,
        )

        response = events_client._events_client.list_rules(
            NamePrefix=f"S3EventDriver-{rule_id}", EventBusName="default"
        )
        assert response["Rules"][0] == {
            "Name": f"S3EventDriver-{rule_id}",
            "Arn": f"arn:aws:events:{aws_region}:{account_id}:rule/S3EventDriver-{rule_id}",
            "State": "ENABLED",
            "EventPattern": '{"detail-type": ["Object Created"], "source": ["aws.s3", "clo.aws.s3"], "detail": {"bucket": {"name": ["staging-bucket"]}, "object": {"key": [{"prefix": "AWSLogs/123456789012"}]}}}',
            "EventBusName": "default",
        }
        response = events_client._events_client.list_targets_by_rule(
            Rule=f"S3EventDriver-{rule_id}", EventBusName="default"
        )
        assert response["Targets"][0]["Id"] == rule_id
        assert response["Targets"][0]["Arn"] == s3_objects_replication_function_arn
        assert "RoleArn" not in response["Targets"][0]
        assert response["Targets"][0].get("Input") is None

        rule_id = str(uuid.uuid4())
        staging_bucket_prefix = "AWSLogs/123456789012"
        events_client.create_s3_event_driver_rule(
            id=rule_id,
            rule_name=rule_id,
            bucket=staging_bucket_name,
            prefix=staging_bucket_prefix,
            lambda_arn=s3_objects_replication_function_arn,
        )

        response = events_client._events_client.list_rules(
            NamePrefix=rule_id, EventBusName="default"
        )
        assert response["Rules"][0] == {
            "Name": rule_id,
            "Arn": f"arn:aws:events:{aws_region}:{account_id}:rule/{rule_id}",
            "State": "ENABLED",
            "EventPattern": '{"detail-type": ["Object Created"], "source": ["aws.s3", "clo.aws.s3"], "detail": {"bucket": {"name": ["staging-bucket"]}, "object": {"key": [{"prefix": "AWSLogs/123456789012"}]}}}',
            "EventBusName": "default",
        }


class TestGlueClient:

    def init_default_parameter(self):
        from utils.aws import GlueClient
        from utils.aws.glue import TableMetaData
        from utils.aws.glue.dataformat import Parquet

        self.catalog_id = os.environ["CENTRALIZED_CATALOG"]
        self.centralized_database = os.environ["CENTRALIZED_DATABASE"]
        self.table_schema = {
            "type": "object",
            "properties": {
                "time": {
                    "type": "big_int",
                    "expression": """FLOOR("time" / 60000) * 60000""",
                },
                "timestamp": {
                    "type": "timestamp",
                    "expression": """DATE_TRUNC('minute', "timestamp")""",
                },
                "type": {"type": "string"},
                "elb": {"type": "string", "partition": True},
                "event_hour": {
                    "type": "string",
                    "partition": True,
                },
            },
        }
        self.table_metadata = TableMetaData(
            data_format=Parquet, schema=self.table_schema, ignore_partition=False
        )
        self.table_name = "tmp_table"

        self.glue_client = GlueClient()
        self.glue_client.create_table(
            database=self.centralized_database,
            name=self.table_name,
            table_metadata=self.table_metadata,
            location=f"s3://centralized-bucket/datalake/{self.table_name}",
        )

    def test_get_database(self, mock_glue_context):
        self.init_default_parameter()

        assert (
            self.glue_client.get_database(
                catalog_id=self.catalog_id, name=self.centralized_database
            )["Database"]["Name"]
            == self.centralized_database
        )
        assert (
            self.glue_client.get_database(
                catalog_id=self.catalog_id, name="do-not-exists"
            )
            == {}
        )

    def test_create_database(self, mock_glue_context):
        self.init_default_parameter()

        assert (
            self.glue_client.create_database(
                catalog_id=self.catalog_id, name=self.centralized_database
            )["Database"]["Name"]
            == self.centralized_database
        )
        assert (
            self.glue_client.create_database(
                catalog_id=self.catalog_id, name="new_database"
            )["Database"]["Name"]
            == "new_database"
        )

    def test_delete_database(self, mock_glue_context):
        self.init_default_parameter()

        self.glue_client.create_database(
            catalog_id=self.catalog_id, name=self.centralized_database
        )
        self.glue_client.delete_database(
            catalog_id=self.catalog_id, name=self.centralized_database
        )
        assert (
            self.glue_client.get_database(
                catalog_id=self.catalog_id, name=self.centralized_database
            )
            == {}
        )
        assert (
            self.glue_client.delete_database(
                catalog_id=self.catalog_id, name="do-not-exists"
            )
            is None
        )

    def test_get_table(self, mock_glue_context):
        self.init_default_parameter()

        response = self.glue_client.get_table(
            database=self.centralized_database, name="do-not-exists"
        )
        assert response == {}

        response = self.glue_client.get_table(
            database=self.centralized_database, name=self.table_name
        )
        assert response["Table"]["Name"] == self.table_name
        assert response["Table"]["DatabaseName"] == self.centralized_database
        assert response["Table"]["StorageDescriptor"]["Columns"] == [
            {"Name": "time", "Type": "bigint"},
            {"Name": "timestamp", "Type": "timestamp"},
            {"Name": "type", "Type": "string"},
        ]
        assert (
            response["Table"]["StorageDescriptor"]["Location"]
            == f"s3://centralized-bucket/datalake/{self.table_name}"
        )
        assert (
            response["Table"]["StorageDescriptor"]["InputFormat"]
            == "org.apache.hadoop.hive.ql.io.parquet.MapredParquetInputFormat"
        )
        assert (
            response["Table"]["StorageDescriptor"]["OutputFormat"]
            == "org.apache.hadoop.hive.ql.io.parquet.MapredParquetOutputFormat"
        )
        assert response["Table"]["StorageDescriptor"]["Compressed"] is True
        assert (
            response["Table"]["StorageDescriptor"]["SerdeInfo"]["SerializationLibrary"]
            == "org.apache.hadoop.hive.ql.io.parquet.serde.ParquetHiveSerDe"
        )
        assert response["Table"]["PartitionKeys"] == [
            {"Name": "event_hour", "Type": "string"},
            {"Name": "elb", "Type": "string"},
        ]
        assert response["Table"]["TableType"] == "EXTERNAL_TABLE"
        assert response["Table"]["Parameters"] == {
            "partition_filtering.enabled": "true",
            "classification": "parquet",
            "has_encrypted_data": "true",
            "parquet.compression": "ZSTD",
            "spark.sql.partitionProvider": "catalog",
            "spark.sql.sources.schema": '{"type": "struct", "fields": [{"name": "time", "type": "long", "nullable": true, "metadata": {}}, {"name": "timestamp", "type": "timestamp", "nullable": true, "metadata": {}}, {"name": "type", "type": "string", "nullable": true, "metadata": {}}, {"name": "event_hour", "type": "string", "nullable": true, "metadata": {}}, {"name": "elb", "type": "string", "nullable": true, "metadata": {}}]}',
            "spark.sql.sources.schema.numPartCols": "2",
            "spark.sql.sources.schema.partCol.0": "event_hour",
            "spark.sql.sources.schema.partCol.1": "elb",
        }

    def test_get_partition_indexes(self, mock_glue_context):
        """moto can not return partition indexes, so this test case dose not make sense."""
        self.init_default_parameter()

        response = self.glue_client.get_partition_indexes(
            database=self.centralized_database, table_name=self.table_name
        )
        assert response["PartitionIndexDescriptorList"] == []

        response = self.glue_client.get_partition_indexes(
            database=self.centralized_database, table_name="do-not-exists"
        )
        assert response["PartitionIndexDescriptorList"] == []

    def test_create_table(self, mock_glue_context):
        self.init_default_parameter()

        # create an existing table
        response = self.glue_client.create_table(
            database=self.centralized_database,
            name=self.table_name,
            table_metadata=self.table_metadata,
            location=f"s3://centralized-bucket/datalake/{self.table_name}",
        )
        assert response["Table"]["Name"] == self.table_name
        assert response["Table"]["DatabaseName"] == self.centralized_database
        assert response["Table"]["StorageDescriptor"]["Columns"] == [
            {"Name": "time", "Type": "bigint"},
            {"Name": "timestamp", "Type": "timestamp"},
            {"Name": "type", "Type": "string"},
        ]
        assert (
            response["Table"]["StorageDescriptor"]["Location"]
            == f"s3://centralized-bucket/datalake/{self.table_name}"
        )
        assert (
            response["Table"]["StorageDescriptor"]["InputFormat"]
            == "org.apache.hadoop.hive.ql.io.parquet.MapredParquetInputFormat"
        )
        assert (
            response["Table"]["StorageDescriptor"]["OutputFormat"]
            == "org.apache.hadoop.hive.ql.io.parquet.MapredParquetOutputFormat"
        )
        assert response["Table"]["StorageDescriptor"]["Compressed"] is True
        assert (
            response["Table"]["StorageDescriptor"]["SerdeInfo"]["SerializationLibrary"]
            == "org.apache.hadoop.hive.ql.io.parquet.serde.ParquetHiveSerDe"
        )
        assert response["Table"]["PartitionKeys"] == [
            {"Name": "event_hour", "Type": "string"},
            {"Name": "elb", "Type": "string"},
        ]
        assert response["Table"]["TableType"] == "EXTERNAL_TABLE"
        assert response["Table"]["Parameters"] == {
            "partition_filtering.enabled": "true",
            "classification": "parquet",
            "has_encrypted_data": "true",
            "parquet.compression": "ZSTD",
            "spark.sql.partitionProvider": "catalog",
            "spark.sql.sources.schema": '{"type": "struct", "fields": [{"name": "time", "type": "long", "nullable": true, "metadata": {}}, {"name": "timestamp", "type": "timestamp", "nullable": true, "metadata": {}}, {"name": "type", "type": "string", "nullable": true, "metadata": {}}, {"name": "event_hour", "type": "string", "nullable": true, "metadata": {}}, {"name": "elb", "type": "string", "nullable": true, "metadata": {}}]}',
            "spark.sql.sources.schema.numPartCols": "2",
            "spark.sql.sources.schema.partCol.0": "event_hour",
            "spark.sql.sources.schema.partCol.1": "elb",
        }

        # create a new table
        response = self.glue_client.create_table(
            database=self.centralized_database,
            name="new_table",
            table_metadata=self.table_metadata,
            location=f"s3://centralized-bucket/datalake/{self.table_name}",
        )
        assert response["Table"]["Name"] == "new_table"
        assert response["Table"]["DatabaseName"] == self.centralized_database
        assert response["Table"]["StorageDescriptor"]["Columns"] == [
            {"Name": "time", "Type": "bigint"},
            {"Name": "timestamp", "Type": "timestamp"},
            {"Name": "type", "Type": "string"},
        ]
        assert (
            response["Table"]["StorageDescriptor"]["Location"]
            == f"s3://centralized-bucket/datalake/{self.table_name}"
        )
        assert (
            response["Table"]["StorageDescriptor"]["InputFormat"]
            == "org.apache.hadoop.hive.ql.io.parquet.MapredParquetInputFormat"
        )
        assert (
            response["Table"]["StorageDescriptor"]["OutputFormat"]
            == "org.apache.hadoop.hive.ql.io.parquet.MapredParquetOutputFormat"
        )
        assert response["Table"]["StorageDescriptor"]["Compressed"] is True
        assert (
            response["Table"]["StorageDescriptor"]["SerdeInfo"]["SerializationLibrary"]
            == "org.apache.hadoop.hive.ql.io.parquet.serde.ParquetHiveSerDe"
        )
        assert response["Table"]["PartitionKeys"] == [
            {"Name": "event_hour", "Type": "string"},
            {"Name": "elb", "Type": "string"},
        ]
        assert response["Table"]["TableType"] == "EXTERNAL_TABLE"
        assert response["Table"]["Parameters"] == {
            "partition_filtering.enabled": "true",
            "classification": "parquet",
            "has_encrypted_data": "true",
            "parquet.compression": "ZSTD",
            "spark.sql.partitionProvider": "catalog",
            "spark.sql.sources.schema": '{"type": "struct", "fields": [{"name": "time", "type": "long", "nullable": true, "metadata": {}}, {"name": "timestamp", "type": "timestamp", "nullable": true, "metadata": {}}, {"name": "type", "type": "string", "nullable": true, "metadata": {}}, {"name": "event_hour", "type": "string", "nullable": true, "metadata": {}}, {"name": "elb", "type": "string", "nullable": true, "metadata": {}}]}',
            "spark.sql.sources.schema.numPartCols": "2",
            "spark.sql.sources.schema.partCol.0": "event_hour",
            "spark.sql.sources.schema.partCol.1": "elb",
        }

    def test_update_table(self, mock_glue_context):
        from utils.aws.glue import TableMetaData
        from utils.aws.glue.dataformat import Parquet

        self.init_default_parameter()

        # update a not exists table
        response = self.glue_client.update_table(
            database=self.centralized_database,
            name="new-table",
            table_metadata=self.table_metadata,
            location=f"s3://centralized-bucket/datalake/new-table",
        )
        assert response["Table"]["Name"] == "new-table"
        assert response["Table"]["DatabaseName"] == self.centralized_database
        assert response["Table"]["StorageDescriptor"]["Columns"] == [
            {"Name": "time", "Type": "bigint"},
            {"Name": "timestamp", "Type": "timestamp"},
            {"Name": "type", "Type": "string"},
        ]
        assert (
            response["Table"]["StorageDescriptor"]["Location"]
            == f"s3://centralized-bucket/datalake/new-table"
        )
        assert (
            response["Table"]["StorageDescriptor"]["InputFormat"]
            == "org.apache.hadoop.hive.ql.io.parquet.MapredParquetInputFormat"
        )
        assert (
            response["Table"]["StorageDescriptor"]["OutputFormat"]
            == "org.apache.hadoop.hive.ql.io.parquet.MapredParquetOutputFormat"
        )
        assert response["Table"]["StorageDescriptor"]["Compressed"] is True
        assert (
            response["Table"]["StorageDescriptor"]["SerdeInfo"]["SerializationLibrary"]
            == "org.apache.hadoop.hive.ql.io.parquet.serde.ParquetHiveSerDe"
        )
        assert response["Table"]["PartitionKeys"] == [
            {"Name": "event_hour", "Type": "string"},
            {"Name": "elb", "Type": "string"},
        ]
        assert response["Table"]["TableType"] == "EXTERNAL_TABLE"
        assert response["Table"]["Parameters"] == {
            "partition_filtering.enabled": "true",
            "classification": "parquet",
            "has_encrypted_data": "true",
            "parquet.compression": "ZSTD",
            "spark.sql.partitionProvider": "catalog",
            "spark.sql.sources.schema": '{"type": "struct", "fields": [{"name": "time", "type": "long", "nullable": true, "metadata": {}}, {"name": "timestamp", "type": "timestamp", "nullable": true, "metadata": {}}, {"name": "type", "type": "string", "nullable": true, "metadata": {}}, {"name": "event_hour", "type": "string", "nullable": true, "metadata": {}}, {"name": "elb", "type": "string", "nullable": true, "metadata": {}}]}',
            "spark.sql.sources.schema.numPartCols": "2",
            "spark.sql.sources.schema.partCol.0": "event_hour",
            "spark.sql.sources.schema.partCol.1": "elb",
        }

        # update a existing table
        response = self.glue_client.update_table(
            database=self.centralized_database,
            name=self.table_name,
            table_metadata=self.table_metadata,
            location=f"s3://centralized-bucket/datalake/{self.table_name}",
        )
        assert response["Table"]["Name"] == self.table_name
        assert response["Table"]["DatabaseName"] == self.centralized_database
        assert response["Table"]["StorageDescriptor"]["Columns"] == [
            {"Name": "time", "Type": "bigint"},
            {"Name": "timestamp", "Type": "timestamp"},
            {"Name": "type", "Type": "string"},
        ]
        assert (
            response["Table"]["StorageDescriptor"]["Location"]
            == f"s3://centralized-bucket/datalake/{self.table_name}"
        )
        assert (
            response["Table"]["StorageDescriptor"]["InputFormat"]
            == "org.apache.hadoop.hive.ql.io.parquet.MapredParquetInputFormat"
        )
        assert (
            response["Table"]["StorageDescriptor"]["OutputFormat"]
            == "org.apache.hadoop.hive.ql.io.parquet.MapredParquetOutputFormat"
        )
        assert response["Table"]["StorageDescriptor"]["Compressed"] is True
        assert (
            response["Table"]["StorageDescriptor"]["SerdeInfo"]["SerializationLibrary"]
            == "org.apache.hadoop.hive.ql.io.parquet.serde.ParquetHiveSerDe"
        )
        assert response["Table"]["PartitionKeys"] == [
            {"Name": "event_hour", "Type": "string"},
            {"Name": "elb", "Type": "string"},
        ]
        assert response["Table"]["TableType"] == "EXTERNAL_TABLE"
        assert response["Table"]["Parameters"] == {
            "partition_filtering.enabled": "true",
            "classification": "parquet",
            "has_encrypted_data": "true",
            "parquet.compression": "ZSTD",
            "spark.sql.partitionProvider": "catalog",
            "spark.sql.sources.schema": '{"type": "struct", "fields": [{"name": "time", "type": "long", "nullable": true, "metadata": {}}, {"name": "timestamp", "type": "timestamp", "nullable": true, "metadata": {}}, {"name": "type", "type": "string", "nullable": true, "metadata": {}}, {"name": "event_hour", "type": "string", "nullable": true, "metadata": {}}, {"name": "elb", "type": "string", "nullable": true, "metadata": {}}]}',
            "spark.sql.sources.schema.numPartCols": "2",
            "spark.sql.sources.schema.partCol.0": "event_hour",
            "spark.sql.sources.schema.partCol.1": "elb",
        }

        # delete a partition key
        table_schema = {
            "type": "object",
            "properties": {
                "time": {
                    "type": "big_int",
                    "expression": """FLOOR("time" / 60000) * 60000""",
                },
                "timestamp": {
                    "type": "timestamp",
                    "expression": """DATE_TRUNC('minute', "timestamp")""",
                },
                "type": {"type": "string"},
                "elb": {"type": "string", "partition": True},
            },
        }
        table_metadata = TableMetaData(
            data_format=Parquet, schema=table_schema, ignore_partition=False
        )
        response = self.glue_client.update_table(
            database=self.centralized_database,
            name=self.table_name,
            table_metadata=table_metadata,
            location=f"s3://centralized-bucket/datalake/{self.table_name}",
        )
        # mock should not return Exception when delete partition key
        # with pytest.raises(Exception):
        #     self.glue_client.update_table(database=self.centralized_database, name=self.table_name, table_metadata=table_metadata, location=f's3://centralized-bucket/datalake/{self.table_name}')

        # add a partition key
        table_schema = {
            "type": "object",
            "properties": {
                "time": {
                    "type": "big_int",
                    "expression": """FLOOR("time" / 60000) * 60000""",
                },
                "timestamp": {
                    "type": "timestamp",
                    "expression": """DATE_TRUNC('minute', "timestamp")""",
                },
                "host": {"type": "string"},
                "elb": {"type": "string", "partition": True},
                "event_hour": {
                    "type": "string",
                    "partition": True,
                },
                "__execution_name__": {
                    "type": "string",
                    "partition": True,
                },
            },
        }
        table_metadata = TableMetaData(
            data_format=Parquet, schema=table_schema, ignore_partition=False
        )
        response = self.glue_client.update_table(
            database=self.centralized_database,
            name=self.table_name,
            table_metadata=table_metadata,
            location=f"s3://centralized-bucket/datalake/{self.table_name}",
        )
        assert response["Table"]["Name"] == self.table_name
        assert response["Table"]["DatabaseName"] == self.centralized_database
        assert response["Table"]["StorageDescriptor"]["Columns"] == [
            {"Name": "time", "Type": "bigint"},
            {"Name": "timestamp", "Type": "timestamp"},
            {"Name": "host", "Type": "string"},
        ]
        assert (
            response["Table"]["StorageDescriptor"]["Location"]
            == f"s3://centralized-bucket/datalake/{self.table_name}"
        )
        assert (
            response["Table"]["StorageDescriptor"]["InputFormat"]
            == "org.apache.hadoop.hive.ql.io.parquet.MapredParquetInputFormat"
        )
        assert (
            response["Table"]["StorageDescriptor"]["OutputFormat"]
            == "org.apache.hadoop.hive.ql.io.parquet.MapredParquetOutputFormat"
        )
        assert response["Table"]["StorageDescriptor"]["Compressed"] is True
        assert (
            response["Table"]["StorageDescriptor"]["SerdeInfo"]["SerializationLibrary"]
            == "org.apache.hadoop.hive.ql.io.parquet.serde.ParquetHiveSerDe"
        )
        assert response["Table"]["PartitionKeys"] == [
            {"Name": "event_hour", "Type": "string"},
            {"Name": "elb", "Type": "string"},
            {"Name": "__execution_name__", "Type": "string"},
        ]
        assert response["Table"]["TableType"] == "EXTERNAL_TABLE"
        assert response["Table"]["Parameters"] == {
            "partition_filtering.enabled": "true",
            "classification": "parquet",
            "has_encrypted_data": "true",
            "parquet.compression": "ZSTD",
            "spark.sql.partitionProvider": "catalog",
            "spark.sql.sources.schema": '{"type": "struct", "fields": [{"name": "time", "type": "long", "nullable": true, "metadata": {}}, {"name": "timestamp", "type": "timestamp", "nullable": true, "metadata": {}}, {"name": "host", "type": "string", "nullable": true, "metadata": {}}, {"name": "event_hour", "type": "string", "nullable": true, "metadata": {}}, {"name": "elb", "type": "string", "nullable": true, "metadata": {}}, {"name": "__execution_name__", "type": "string", "nullable": true, "metadata": {}}]}',
            "spark.sql.sources.schema.numPartCols": "3",
            "spark.sql.sources.schema.partCol.0": "event_hour",
            "spark.sql.sources.schema.partCol.1": "elb",
            "spark.sql.sources.schema.partCol.2": "__execution_name__",
        }

    def test_delete_table(self, mock_glue_context):
        self.init_default_parameter()

        self.glue_client.delete_table(
            database=self.centralized_database, name=self.table_name
        )

        response = self.glue_client.get_table(
            database=self.centralized_database, name=self.table_name
        )
        assert response == {}

        self.glue_client.delete_table(
            database=self.centralized_database, name="do-not-exists"
        )

        response = self.glue_client.get_table(
            database=self.centralized_database, name="do-not-exists"
        )
        assert response == {}

    def test_convert_to_spark_sql_data_type(self, mock_glue_context):
        self.init_default_parameter()

        assert (
            self.glue_client._convert_to_spark_sql_data_type(input_string="boolean")
            == "boolean"
        )
        assert (
            self.glue_client._convert_to_spark_sql_data_type(input_string="tinyint")
            == "byte"
        )
        assert (
            self.glue_client._convert_to_spark_sql_data_type(input_string="smallint")
            == "short"
        )
        assert (
            self.glue_client._convert_to_spark_sql_data_type(input_string="int")
            == "integer"
        )
        assert (
            self.glue_client._convert_to_spark_sql_data_type(input_string="integer")
            == "integer"
        )
        assert (
            self.glue_client._convert_to_spark_sql_data_type(input_string="bigint")
            == "long"
        )
        assert (
            self.glue_client._convert_to_spark_sql_data_type(input_string="float")
            == "float"
        )
        assert (
            self.glue_client._convert_to_spark_sql_data_type(input_string="double")
            == "double"
        )
        assert (
            self.glue_client._convert_to_spark_sql_data_type(input_string="date")
            == "date"
        )
        assert (
            self.glue_client._convert_to_spark_sql_data_type(input_string="timestamp")
            == "timestamp"
        )
        assert (
            self.glue_client._convert_to_spark_sql_data_type(input_string="string")
            == "string"
        )
        assert (
            self.glue_client._convert_to_spark_sql_data_type(input_string="char")
            == "string"
        )
        assert (
            self.glue_client._convert_to_spark_sql_data_type(input_string="varchar")
            == "string"
        )
        assert (
            self.glue_client._convert_to_spark_sql_data_type(input_string="binary")
            == "binary"
        )
        assert (
            self.glue_client._convert_to_spark_sql_data_type(input_string="decimal")
            == "decimal"
        )
        assert (
            self.glue_client._convert_to_spark_sql_data_type(input_string="array")
            == "array"
        )
        assert (
            self.glue_client._convert_to_spark_sql_data_type(input_string="struct")
            == "struct"
        )
        assert (
            self.glue_client._convert_to_spark_sql_data_type(input_string="map")
            == "map"
        )

        with pytest.raises(Exception) as exception_info:
            self.glue_client._convert_to_spark_sql_data_type(input_string="unknown")
        assert exception_info.value.args[0] == "Do not supported data type: unknown."

    def test_parse_complex_input_string(self, mock_glue_context):
        self.init_default_parameter()

        assert self.glue_client._parse_complex_input_string(
            input_string="struct<objects:struct<name:string,age:int,acl:struct<name:string>,json:map<string,string>>,value:int,field:string>"
        ) == [
            "struct<objects:struct<name:string,age:int,acl:struct<name:string>,json:map<string,string>>,value:int,field:string>"
        ]
        assert self.glue_client._parse_complex_input_string(
            input_string="objects:struct<name:string,age:int,acl:struct<name:string>,json:map<string,string>>,value:int,field:string"
        ) == [
            "objects:struct<name:string,age:int,acl:struct<name:string>,json:map<string,string>>",
            "value:int",
            "field:string",
        ]
        assert self.glue_client._parse_complex_input_string(
            input_string="value:int,field:string"
        ) == ["value:int", "field:string"]
        assert self.glue_client._parse_complex_input_string(
            input_string="value:int"
        ) == ["value:int"]
        assert self.glue_client._parse_complex_input_string(input_string="") == []

    def test_generate_spark_sql_type(self, mock_glue_context):
        self.init_default_parameter()

        assert (
            self.glue_client._generate_spark_sql_type(input_string="boolean")
            == "boolean"
        )
        assert (
            self.glue_client._generate_spark_sql_type(input_string="tinyint") == "byte"
        )
        assert (
            self.glue_client._generate_spark_sql_type(input_string="smallint")
            == "short"
        )
        assert (
            self.glue_client._generate_spark_sql_type(input_string="int") == "integer"
        )
        assert (
            self.glue_client._generate_spark_sql_type(input_string="bigint") == "long"
        )
        assert (
            self.glue_client._generate_spark_sql_type(input_string="float") == "float"
        )
        assert (
            self.glue_client._generate_spark_sql_type(input_string="double") == "double"
        )
        assert self.glue_client._generate_spark_sql_type(input_string="date") == "date"
        assert (
            self.glue_client._generate_spark_sql_type(input_string="timestamp")
            == "timestamp"
        )
        assert (
            self.glue_client._generate_spark_sql_type(input_string="string") == "string"
        )
        assert (
            self.glue_client._generate_spark_sql_type(input_string="char") == "string"
        )
        assert (
            self.glue_client._generate_spark_sql_type(input_string="varchar")
            == "string"
        )
        assert (
            self.glue_client._generate_spark_sql_type(input_string="binary") == "binary"
        )
        assert (
            self.glue_client._generate_spark_sql_type(input_string="decimal")
            == "decimal"
        )
        assert self.glue_client._generate_spark_sql_type(
            input_string="array<string>"
        ) == {"type": "array", "elementType": "string", "containsNull": True}
        assert self.glue_client._generate_spark_sql_type(
            input_string="array<array<string>>"
        ) == {
            "type": "array",
            "elementType": {
                "type": "array",
                "elementType": "string",
                "containsNull": True,
            },
            "containsNull": True,
        }
        assert self.glue_client._generate_spark_sql_type(
            input_string="array<struct<name:string,age:int>>"
        ) == {
            "type": "array",
            "elementType": {
                "type": "struct",
                "fields": [
                    {
                        "name": "name",
                        "type": "string",
                        "nullable": True,
                        "metadata": {},
                    },
                    {
                        "name": "age",
                        "type": "integer",
                        "nullable": True,
                        "metadata": {},
                    },
                ],
            },
            "containsNull": True,
        }
        assert self.glue_client._generate_spark_sql_type(
            input_string="array<map<string,int>>"
        ) == {
            "type": "array",
            "elementType": {
                "type": "map",
                "keyType": "string",
                "valueType": "integer",
                "valueContainsNull": True,
            },
            "containsNull": True,
        }
        assert self.glue_client._generate_spark_sql_type(
            input_string="array<map<string,struct<name:string>>>"
        ) == {
            "type": "array",
            "elementType": {
                "type": "map",
                "keyType": "string",
                "valueType": {
                    "type": "struct",
                    "fields": [
                        {
                            "name": "name",
                            "type": "string",
                            "nullable": True,
                            "metadata": {},
                        },
                    ],
                },
                "valueContainsNull": True,
            },
            "containsNull": True,
        }
        assert self.glue_client._generate_spark_sql_type(
            input_string="struct<name:string,age:int>"
        ) == {
            "type": "struct",
            "fields": [
                {"name": "name", "type": "string", "nullable": True, "metadata": {}},
                {"name": "age", "type": "integer", "nullable": True, "metadata": {}},
            ],
        }
        assert self.glue_client._generate_spark_sql_type(
            input_string="struct<list:array<string>>"
        ) == {
            "type": "struct",
            "fields": [
                {
                    "name": "list",
                    "type": {
                        "type": "array",
                        "elementType": "string",
                        "containsNull": True,
                    },
                    "nullable": True,
                    "metadata": {},
                },
            ],
        }
        assert self.glue_client._generate_spark_sql_type(
            input_string="struct<objects:struct<name:string,age:int,acl:struct<name:string>,json:map<string,string>>,value:int,field:string>"
        ) == {
            "type": "struct",
            "fields": [
                {
                    "name": "objects",
                    "type": {
                        "type": "struct",
                        "fields": [
                            {
                                "name": "name",
                                "type": "string",
                                "nullable": True,
                                "metadata": {},
                            },
                            {
                                "name": "age",
                                "type": "integer",
                                "nullable": True,
                                "metadata": {},
                            },
                            {
                                "name": "acl",
                                "type": {
                                    "type": "struct",
                                    "fields": [
                                        {
                                            "name": "name",
                                            "type": "string",
                                            "nullable": True,
                                            "metadata": {},
                                        }
                                    ],
                                },
                                "nullable": True,
                                "metadata": {},
                            },
                            {
                                "name": "json",
                                "type": {
                                    "type": "map",
                                    "keyType": "string",
                                    "valueType": "string",
                                    "valueContainsNull": True,
                                },
                                "nullable": True,
                                "metadata": {},
                            },
                        ],
                    },
                    "nullable": True,
                    "metadata": {},
                },
                {"name": "value", "type": "integer", "nullable": True, "metadata": {}},
                {"name": "field", "type": "string", "nullable": True, "metadata": {}},
            ],
        }
        assert self.glue_client._generate_spark_sql_type(
            input_string="map<string,struct<objects:struct<name:string>,age:int,list:array<string>,field:string>>"
        ) == {
            "type": "map",
            "keyType": "string",
            "valueType": {
                "type": "struct",
                "fields": [
                    {
                        "name": "objects",
                        "type": {
                            "type": "struct",
                            "fields": [
                                {
                                    "name": "name",
                                    "type": "string",
                                    "nullable": True,
                                    "metadata": {},
                                }
                            ],
                        },
                        "nullable": True,
                        "metadata": {},
                    },
                    {
                        "name": "age",
                        "type": "integer",
                        "nullable": True,
                        "metadata": {},
                    },
                    {
                        "name": "list",
                        "type": {
                            "type": "array",
                            "elementType": "string",
                            "containsNull": True,
                        },
                        "nullable": True,
                        "metadata": {},
                    },
                    {
                        "name": "field",
                        "type": "string",
                        "nullable": True,
                        "metadata": {},
                    },
                ],
            },
            "valueContainsNull": True,
        }
        assert self.glue_client._generate_spark_sql_type(
            input_string="map<string,int>"
        ) == {
            "type": "map",
            "keyType": "string",
            "valueType": "integer",
            "valueContainsNull": True,
        }
        assert self.glue_client._generate_spark_sql_type(
            input_string="map<string,array<string>>"
        ) == {
            "type": "map",
            "keyType": "string",
            "valueType": {
                "type": "array",
                "elementType": "string",
                "containsNull": True,
            },
            "valueContainsNull": True,
        }
        assert self.glue_client._generate_spark_sql_type(
            input_string="map<string,map<string,string>>"
        ) == {
            "type": "map",
            "keyType": "string",
            "valueType": {
                "type": "map",
                "keyType": "string",
                "valueType": "string",
                "valueContainsNull": True,
            },
            "valueContainsNull": True,
        }

    def test_generate_spark_sql_schema(self, mock_glue_context):
        self.init_default_parameter()

        columns = [
            {"Name": "Boolean_type", "Type": "Boolean"},
            {"Name": "Tinyint_type", "Type": "Tinyint"},
            {"Name": "SmallInt_type", "Type": "SmallInt"},
            {"Name": "int_type", "Type": "int"},
            {"Name": "integer_type", "Type": "integer"},
            {"Name": "bigint_type", "Type": "bigint"},
            {"Name": "float_type", "Type": "float"},
            {"Name": "double_type", "Type": "double"},
            {"Name": "date_type", "Type": "date"},
            {"Name": "timestamp_type", "Type": "timestamp"},
            {"Name": "string_type", "Type": "string"},
            {"Name": "char_type", "Type": "char(255)"},
            {"Name": "varchar_type", "Type": "varchar(255)"},
            {"Name": "binary_type", "Type": "binary"},
            {"Name": "decimal_type", "Type": "decimal(10,2)"},
        ]

        assert self.glue_client._generate_spark_sql_schema(columns=columns) == {
            "type": "struct",
            "fields": [
                {
                    "name": "boolean_type",
                    "type": "boolean",
                    "nullable": True,
                    "metadata": {},
                },
                {
                    "name": "tinyint_type",
                    "type": "byte",
                    "nullable": True,
                    "metadata": {},
                },
                {
                    "name": "smallint_type",
                    "type": "short",
                    "nullable": True,
                    "metadata": {},
                },
                {
                    "name": "int_type",
                    "type": "integer",
                    "nullable": True,
                    "metadata": {},
                },
                {
                    "name": "integer_type",
                    "type": "integer",
                    "nullable": True,
                    "metadata": {},
                },
                {
                    "name": "bigint_type",
                    "type": "long",
                    "nullable": True,
                    "metadata": {},
                },
                {
                    "name": "float_type",
                    "type": "float",
                    "nullable": True,
                    "metadata": {},
                },
                {
                    "name": "double_type",
                    "type": "double",
                    "nullable": True,
                    "metadata": {},
                },
                {"name": "date_type", "type": "date", "nullable": True, "metadata": {}},
                {
                    "name": "timestamp_type",
                    "type": "timestamp",
                    "nullable": True,
                    "metadata": {},
                },
                {
                    "name": "string_type",
                    "type": "string",
                    "nullable": True,
                    "metadata": {},
                },
                {
                    "name": "char_type",
                    "type": "string",
                    "nullable": True,
                    "metadata": {"__CHAR_VARCHAR_TYPE_STRING": "char(255)"},
                },
                {
                    "name": "varchar_type",
                    "type": "string",
                    "nullable": True,
                    "metadata": {"__CHAR_VARCHAR_TYPE_STRING": "varchar(255)"},
                },
                {
                    "name": "binary_type",
                    "type": "binary",
                    "nullable": True,
                    "metadata": {},
                },
                {
                    "name": "decimal_type",
                    "type": "decimal(10,2)",
                    "nullable": True,
                    "metadata": {},
                },
            ],
        }
        columns = [
            {"Name": "string_in_array", "Type": "array<string>"},
            {"Name": "string_in_2_array", "Type": "array<array<string>>"},
            {"Name": "struct_in_array", "Type": "array<struct<name:string,age:int>>"},
            {"Name": "map_in_array", "Type": "array<map<string,int>>"},
            {
                "Name": "struct_map_in_array",
                "Type": "array<map<string,struct<name:string>>>",
            },
        ]
        assert self.glue_client._generate_spark_sql_schema(columns=columns) == {
            "type": "struct",
            "fields": [
                {
                    "name": "string_in_array",
                    "type": {
                        "type": "array",
                        "elementType": "string",
                        "containsNull": True,
                    },
                    "nullable": True,
                    "metadata": {},
                },
                {
                    "name": "string_in_2_array",
                    "type": {
                        "type": "array",
                        "elementType": {
                            "type": "array",
                            "elementType": "string",
                            "containsNull": True,
                        },
                        "containsNull": True,
                    },
                    "nullable": True,
                    "metadata": {},
                },
                {
                    "name": "struct_in_array",
                    "type": {
                        "type": "array",
                        "elementType": {
                            "type": "struct",
                            "fields": [
                                {
                                    "name": "name",
                                    "type": "string",
                                    "nullable": True,
                                    "metadata": {},
                                },
                                {
                                    "name": "age",
                                    "type": "integer",
                                    "nullable": True,
                                    "metadata": {},
                                },
                            ],
                        },
                        "containsNull": True,
                    },
                    "nullable": True,
                    "metadata": {},
                },
                {
                    "name": "map_in_array",
                    "type": {
                        "type": "array",
                        "elementType": {
                            "type": "map",
                            "keyType": "string",
                            "valueType": "integer",
                            "valueContainsNull": True,
                        },
                        "containsNull": True,
                    },
                    "nullable": True,
                    "metadata": {},
                },
                {
                    "name": "struct_map_in_array",
                    "type": {
                        "type": "array",
                        "elementType": {
                            "type": "map",
                            "keyType": "string",
                            "valueType": {
                                "type": "struct",
                                "fields": [
                                    {
                                        "name": "name",
                                        "type": "string",
                                        "nullable": True,
                                        "metadata": {},
                                    }
                                ],
                            },
                            "valueContainsNull": True,
                        },
                        "containsNull": True,
                    },
                    "nullable": True,
                    "metadata": {},
                },
            ],
        }
        columns = [
            {"Name": "string_in_struct", "Type": "struct<name:string,age:int>"},
            {"Name": "array_in_struct", "Type": "struct<list:array<string>>"},
            {
                "Name": "complex_struct",
                "Type": "struct<objects:struct<name:string,age:int,acl:struct<name:string>,json:map<string,string>>,value:int,field:string>",
            },
        ]
        assert self.glue_client._generate_spark_sql_schema(columns=columns) == {
            "type": "struct",
            "fields": [
                {
                    "name": "string_in_struct",
                    "type": {
                        "type": "struct",
                        "fields": [
                            {
                                "name": "name",
                                "type": "string",
                                "nullable": True,
                                "metadata": {},
                            },
                            {
                                "name": "age",
                                "type": "integer",
                                "nullable": True,
                                "metadata": {},
                            },
                        ],
                    },
                    "nullable": True,
                    "metadata": {},
                },
                {
                    "name": "array_in_struct",
                    "type": {
                        "type": "struct",
                        "fields": [
                            {
                                "name": "list",
                                "type": {
                                    "type": "array",
                                    "elementType": "string",
                                    "containsNull": True,
                                },
                                "nullable": True,
                                "metadata": {},
                            }
                        ],
                    },
                    "nullable": True,
                    "metadata": {},
                },
                {
                    "name": "complex_struct",
                    "type": {
                        "type": "struct",
                        "fields": [
                            {
                                "name": "objects",
                                "type": {
                                    "type": "struct",
                                    "fields": [
                                        {
                                            "name": "name",
                                            "type": "string",
                                            "nullable": True,
                                            "metadata": {},
                                        },
                                        {
                                            "name": "age",
                                            "type": "integer",
                                            "nullable": True,
                                            "metadata": {},
                                        },
                                        {
                                            "name": "acl",
                                            "type": {
                                                "type": "struct",
                                                "fields": [
                                                    {
                                                        "name": "name",
                                                        "type": "string",
                                                        "nullable": True,
                                                        "metadata": {},
                                                    }
                                                ],
                                            },
                                            "nullable": True,
                                            "metadata": {},
                                        },
                                        {
                                            "name": "json",
                                            "type": {
                                                "type": "map",
                                                "keyType": "string",
                                                "valueType": "string",
                                                "valueContainsNull": True,
                                            },
                                            "nullable": True,
                                            "metadata": {},
                                        },
                                    ],
                                },
                                "nullable": True,
                                "metadata": {},
                            },
                            {
                                "name": "value",
                                "type": "integer",
                                "nullable": True,
                                "metadata": {},
                            },
                            {
                                "name": "field",
                                "type": "string",
                                "nullable": True,
                                "metadata": {},
                            },
                        ],
                    },
                    "nullable": True,
                    "metadata": {},
                },
            ],
        }
        columns = [
            {
                "Name": "complex_map",
                "Type": "map<string,struct<objects:struct<name:string>,age:int,list:array<string>,field:string>>",
            },
            {"Name": "string_in_map", "Type": "map<string,int>"},
            {"Name": "array_in_map", "Type": "map<string,array<string>>"},
            {"Name": "map_in_map", "Type": "map<string,map<string,string>>"},
        ]
        assert self.glue_client._generate_spark_sql_schema(columns=columns) == {
            "type": "struct",
            "fields": [
                {
                    "name": "complex_map",
                    "type": {
                        "type": "map",
                        "keyType": "string",
                        "valueType": {
                            "type": "struct",
                            "fields": [
                                {
                                    "name": "objects",
                                    "type": {
                                        "type": "struct",
                                        "fields": [
                                            {
                                                "name": "name",
                                                "type": "string",
                                                "nullable": True,
                                                "metadata": {},
                                            }
                                        ],
                                    },
                                    "nullable": True,
                                    "metadata": {},
                                },
                                {
                                    "name": "age",
                                    "type": "integer",
                                    "nullable": True,
                                    "metadata": {},
                                },
                                {
                                    "name": "list",
                                    "type": {
                                        "type": "array",
                                        "elementType": "string",
                                        "containsNull": True,
                                    },
                                    "nullable": True,
                                    "metadata": {},
                                },
                                {
                                    "name": "field",
                                    "type": "string",
                                    "nullable": True,
                                    "metadata": {},
                                },
                            ],
                        },
                        "valueContainsNull": True,
                    },
                    "nullable": True,
                    "metadata": {},
                },
                {
                    "name": "string_in_map",
                    "type": {
                        "type": "map",
                        "keyType": "string",
                        "valueType": "integer",
                        "valueContainsNull": True,
                    },
                    "nullable": True,
                    "metadata": {},
                },
                {
                    "name": "array_in_map",
                    "type": {
                        "type": "map",
                        "keyType": "string",
                        "valueType": {
                            "type": "array",
                            "elementType": "string",
                            "containsNull": True,
                        },
                        "valueContainsNull": True,
                    },
                    "nullable": True,
                    "metadata": {},
                },
                {
                    "name": "map_in_map",
                    "type": {
                        "type": "map",
                        "keyType": "string",
                        "valueType": {
                            "type": "map",
                            "keyType": "string",
                            "valueType": "string",
                            "valueContainsNull": True,
                        },
                        "valueContainsNull": True,
                    },
                    "nullable": True,
                    "metadata": {},
                },
            ],
        }

        columns = [
            {
                "Name": "tags",
                "Type": "struct<ses:operation:struct<objects:struct<colon:name:string>>,ses:caller-identity:array<string>,ses:configuration-set:source-ip:array<string>,ses:tags:string>",
            }
        ]
        assert self.glue_client._generate_spark_sql_schema(columns=columns) == {
            "type": "struct",
            "fields": [
                {
                    "name": "tags",
                    "type": {
                        "type": "struct",
                        "fields": [
                            {
                                "name": "ses:operation",
                                "type": {
                                    "type": "struct",
                                    "fields": [
                                        {
                                            "name": "objects",
                                            "type": {
                                                "type": "struct",
                                                "fields": [
                                                    {
                                                        "name": "colon:name",
                                                        "type": "string",
                                                        "nullable": True,
                                                        "metadata": {},
                                                    }
                                                ],
                                            },
                                            "nullable": True,
                                            "metadata": {},
                                        }
                                    ],
                                },
                                "nullable": True,
                                "metadata": {},
                            },
                            {
                                "name": "ses:caller-identity",
                                "type": {
                                    "type": "array",
                                    "elementType": "string",
                                    "containsNull": True,
                                },
                                "nullable": True,
                                "metadata": {},
                            },
                            {
                                "name": "ses:configuration-set:source-ip",
                                "type": {
                                    "type": "array",
                                    "elementType": "string",
                                    "containsNull": True,
                                },
                                "nullable": True,
                                "metadata": {},
                            },
                            {
                                "name": "ses:tags",
                                "type": "string",
                                "nullable": True,
                                "metadata": {},
                            },
                        ],
                    },
                    "nullable": True,
                    "metadata": {},
                }
            ],
        }

    def test_generate_table_input(self, mock_glue_context):
        self.init_default_parameter()

        table_input = self.glue_client._generate_table_input(
            name="new-table",
            table_metadata=self.table_metadata,
            location=f"s3://centralized-bucket/datalake/new-table",
        )
        assert table_input["Name"] == "new-table"
        assert table_input["StorageDescriptor"]["Columns"] == [
            {"Name": "time", "Type": "bigint"},
            {"Name": "timestamp", "Type": "timestamp"},
            {"Name": "type", "Type": "string"},
        ]
        assert (
            table_input["StorageDescriptor"]["Location"]
            == f"s3://centralized-bucket/datalake/new-table"
        )
        assert (
            table_input["StorageDescriptor"]["InputFormat"]
            == "org.apache.hadoop.hive.ql.io.parquet.MapredParquetInputFormat"
        )
        assert (
            table_input["StorageDescriptor"]["OutputFormat"]
            == "org.apache.hadoop.hive.ql.io.parquet.MapredParquetOutputFormat"
        )
        assert table_input["StorageDescriptor"]["Compressed"] is True
        assert (
            table_input["StorageDescriptor"]["SerdeInfo"]["SerializationLibrary"]
            == "org.apache.hadoop.hive.ql.io.parquet.serde.ParquetHiveSerDe"
        )
        assert table_input["PartitionKeys"] == [
            {"Name": "event_hour", "Type": "string"},
            {"Name": "elb", "Type": "string"},
        ]
        assert table_input["TableType"] == "EXTERNAL_TABLE"
        assert table_input["Parameters"] == {
            "partition_filtering.enabled": "true",
            "classification": "parquet",
            "has_encrypted_data": "true",
            "parquet.compression": "ZSTD",
            "spark.sql.partitionProvider": "catalog",
            "spark.sql.sources.schema": '{"type": "struct", "fields": [{"name": "time", "type": "long", "nullable": true, "metadata": {}}, {"name": "timestamp", "type": "timestamp", "nullable": true, "metadata": {}}, {"name": "type", "type": "string", "nullable": true, "metadata": {}}, {"name": "event_hour", "type": "string", "nullable": true, "metadata": {}}, {"name": "elb", "type": "string", "nullable": true, "metadata": {}}]}',
            "spark.sql.sources.schema.numPartCols": "2",
            "spark.sql.sources.schema.partCol.0": "event_hour",
            "spark.sql.sources.schema.partCol.1": "elb",
        }

        table_metadata = copy.deepcopy(self.table_metadata)
        table_metadata.partition_keys = []
        table_input = self.glue_client._generate_table_input(
            name="new-table",
            table_metadata=table_metadata,
            location=f"s3://centralized-bucket/datalake/new-table",
        )
        assert table_input["Name"] == "new-table"
        assert table_input["StorageDescriptor"]["Columns"] == [
            {"Name": "time", "Type": "bigint"},
            {"Name": "timestamp", "Type": "timestamp"},
            {"Name": "type", "Type": "string"},
        ]
        assert (
            table_input["StorageDescriptor"]["Location"]
            == f"s3://centralized-bucket/datalake/new-table"
        )
        assert (
            table_input["StorageDescriptor"]["InputFormat"]
            == "org.apache.hadoop.hive.ql.io.parquet.MapredParquetInputFormat"
        )
        assert (
            table_input["StorageDescriptor"]["OutputFormat"]
            == "org.apache.hadoop.hive.ql.io.parquet.MapredParquetOutputFormat"
        )
        assert table_input["StorageDescriptor"]["Compressed"] is True
        assert (
            table_input["StorageDescriptor"]["SerdeInfo"]["SerializationLibrary"]
            == "org.apache.hadoop.hive.ql.io.parquet.serde.ParquetHiveSerDe"
        )
        assert table_input["PartitionKeys"] == []
        assert table_input["TableType"] == "EXTERNAL_TABLE"
        assert table_input["Parameters"] == {
            "partition_filtering.enabled": "true",
            "classification": "parquet",
            "has_encrypted_data": "true",
            "parquet.compression": "ZSTD",
            "spark.sql.partitionProvider": "catalog",
            "spark.sql.sources.schema": '{"type": "struct", "fields": [{"name": "time", "type": "long", "nullable": true, "metadata": {}}, {"name": "timestamp", "type": "timestamp", "nullable": true, "metadata": {}}, {"name": "type", "type": "string", "nullable": true, "metadata": {}}]}',
            "spark.sql.sources.schema.numPartCols": "0",
        }


class TestSNSClient:

    def test_publish(
        self, mock_iam_context, mock_sqs_context, mock_ddb_context, mock_sns_context
    ):
        from utils.aws.sns import SNSClient

        receive_failed_topic_arn = os.environ["RECEIVE_STATES_FAILED_TOPIC_ARN"]

        sns_client = SNSClient()

        response = sns_client.publish(
            arn=receive_failed_topic_arn, message="test msg.", subject="title"
        )
        assert response["ResponseMetadata"]["HTTPStatusCode"] == 200


class TestSESClient:

    def test_get_template(
        self, mock_iam_context, mock_sqs_context, mock_ddb_context, mock_ses_context
    ):
        from utils.aws.ses import SESClient

        ses_email_template_name = "EmailTemplate"

        ses_client = SESClient()

        ses_client.create_template(
            template_name=ses_email_template_name,
            subject="[Notification] {{stateMachine.name}} task {{stateMachine.status}} to execute.",
            text="Best regards",
            html="",
        )

        response = ses_client.get_template(template_name=ses_email_template_name)
        assert response["Template"]["TemplateName"] == ses_email_template_name

        response = ses_client.get_template(template_name="do-not-exists")
        assert response == {}

    def test_create_template(
        self, mock_iam_context, mock_sqs_context, mock_ddb_context, mock_ses_context
    ):
        from utils.aws.ses import SESClient

        ses_email_template_name = "EmailTemplate"

        ses_client = SESClient()

        response = ses_client.create_template(
            template_name=ses_email_template_name,
            subject="[Notification] {{stateMachine.name}} task {{stateMachine.status}} to execute.",
            text="Best regards",
            html="",
        )
        assert response["ResponseMetadata"]["HTTPStatusCode"] == 200

    def test_delete_template(
        self, mock_iam_context, mock_sqs_context, mock_ddb_context, mock_ses_context
    ):
        from utils.aws.ses import SESClient

        ses_email_template_name = "EmailTemplate"

        ses_client = SESClient()

        ses_client.create_template(
            template_name=ses_email_template_name,
            subject="[Notification] {{stateMachine.name}} task {{stateMachine.status}} to execute.",
            text="Best regards",
            html="",
        )

        response = ses_client.delete_template(template_name=ses_email_template_name)
        assert response["ResponseMetadata"]["HTTPStatusCode"] == 200

        response = ses_client.delete_template(template_name="do-not-exists")
        assert response == {}

    def test_get_identity_verification_attributes(
        self, mock_iam_context, mock_sqs_context, mock_ddb_context, mock_ses_context
    ):
        from utils.aws.ses import SESClient

        ses_client = SESClient()

        ses_client.verify_email_identity(email_address="alejandro_rosalez@example.com")

        response = ses_client.get_identity_verification_attributes(
            identity="alejandro_rosalez@example.com"
        )
        assert (
            "alejandro_rosalez@example.com" in response["VerificationAttributes"].keys()
        )

        response = ses_client.get_identity_verification_attributes(
            identity="alejandro_rosalez@example.org"
        )
        assert (
            "alejandro_rosalez@example.org"
            not in response["VerificationAttributes"].keys()
        )

    def test_verify_email_identity(
        self, mock_iam_context, mock_sqs_context, mock_ddb_context, mock_ses_context
    ):
        from utils.aws.ses import SESClient

        ses_client = SESClient()

        response = ses_client.verify_email_identity(
            email_address="alejandro_rosalez@example.com"
        )
        assert response["ResponseMetadata"]["HTTPStatusCode"] == 200

    def test_delete_identity(
        self, mock_iam_context, mock_sqs_context, mock_ddb_context, mock_ses_context
    ):
        from utils.aws.ses import SESClient

        ses_client = SESClient()

        ses_client.verify_email_identity(email_address="alejandro_rosalez@example.com")
        response = ses_client.delete_identity(identity="alejandro_rosalez@example.com")
        assert response["ResponseMetadata"]["HTTPStatusCode"] == 200

        response = ses_client.delete_identity(identity="do-not-exists")
        assert response == {}

    def test_send_templated_email(
        self, mock_iam_context, mock_sqs_context, mock_ddb_context, mock_ses_context
    ):
        from utils.aws.ses import SESClient

        source = os.environ["SOURCE"]
        ses_email_template = os.environ["SES_EMAIL_TEMPLATE"]

        ses_client = SESClient()

        response = ses_client.send_templated_email(
            source=source,
            to=["alejandro_rosalez@example.com"],
            template=ses_email_template,
            data={},
        )
        assert response["ResponseMetadata"]["HTTPStatusCode"] == 200


def mock_rds_api_call(self, operation_name, kwarg):  # NOSONAR
    from test.mock import mock_rds_context, default_environment_variables
    from botocore.exceptions import ClientError

    aurora_mysql_instance_8 = os.environ["AURORA_MYSQL8_INSTANCE_IDENTIFIER"]
    postgresql_instance = os.environ["POSTGRESQL_INSTANCE_IDENTIFIER"]

    aurora_mysql_audit_logs = os.environ["MYSQL_AUDIT_LOGS"]

    if operation_name in ("DescribeDBLogFiles"):
        if kwarg["DBInstanceIdentifier"] == aurora_mysql_instance_8:
            if kwarg.get("FilenameContains") == "audit":
                return {
                    "Marker": "",
                    "DescribeDBLogFiles": [
                        {
                            "LogFileName": "audit/audit.log",
                            "LastWritten": 1704416941258,
                            "Size": 10817,
                        },
                    ],
                }
            return {
                "Marker": "",
                "DescribeDBLogFiles": [
                    {
                        "LogFileName": "audit/audit.log",
                        "LastWritten": 1704416941258,
                        "Size": 10817,
                    },
                    {
                        "LogFileName": "slowquery/slowquery.log",
                        "LastWritten": 1704416941258,
                        "Size": 10817,
                    },
                    {
                        "LogFileName": "error/mysql-error.log",
                        "LastWritten": 1704416941258,
                        "Size": 10817,
                    },
                    {
                        "LogFileName": "general/mysql-general.log",
                        "LastWritten": 1704416958038,
                        "Size": 468796,
                    },
                    {
                        "LogFileName": "test/no-parser.log",
                        "LastWritten": 1704416958038,
                        "Size": 468796,
                    },
                ],
            }
        elif kwarg["DBInstanceIdentifier"] == "do-not-exists-instance":
            return ClientError(
                error_response={
                    "Error": {"Code": "400", "Message": "Error Query String."}
                },
                operation_name=operation_name,
            )
    elif operation_name in ("DownloadDBLogFilePortion"):
        if (
            kwarg["DBInstanceIdentifier"] == aurora_mysql_instance_8
            and kwarg["LogFileName"] == "audit/audit.log"
        ):
            return {
                "Marker": "2024-01-01.2:0",
                "LogFileData": aurora_mysql_audit_logs,
                "AdditionalDataPending": False,
            }
        elif (
            kwarg["DBInstanceIdentifier"] == "do-not-exists-instance"
            and kwarg["LogFileName"] == "audit/audit.log"
        ):
            return ClientError(
                error_response={
                    "Error": {"Code": "400", "Message": "Error Query String."}
                },
                operation_name=operation_name,
            )


class TestRDSClient:
    def init_default_parameter(self):
        from utils.aws.rds import RDSClient

        self.rds_client = RDSClient()

        self.aurora_mysql_cluster_8 = os.environ["AURORA_MYSQL8_CLUSTER_IDENTIFIER"]
        self.aurora_postgresql_cluster = os.environ[
            "AURORA_POSTGRESQL_CLUSTER_IDENTIFIER"
        ]
        self.aurora_mysql_instance_8 = os.environ["AURORA_MYSQL8_INSTANCE_IDENTIFIER"]
        self.mysql_instance_8 = os.environ["MYSQL8_INSTANCE_IDENTIFIER"]
        self.postgresql_instance = os.environ["POSTGRESQL_INSTANCE_IDENTIFIER"]

        self.aurora_mysql_audit_logs = os.environ["AURORA_MYSQL_AUDIT_LOGS"]
        self.mysql_audit_logs = os.environ["MYSQL_AUDIT_LOGS"]
        self.mysql_slow_query_logs = os.environ["MYSQL_SLOW_QUERY_LOGS"]
        self.mysql_error_logs_8 = os.environ["MYSQL8_ERROR_LOGS"]
        self.mysql_general_logs = os.environ["MYSQL_GENERAL_LOGS"]
        self.postgres_query_logs = os.environ["POSTGRES_QUERY_LOGS"]

    def test_describe_db_cluster(self, mock_rds_context):
        self.init_default_parameter()

        response = self.rds_client.describe_db_cluster(
            db_cluster_identifier=self.aurora_mysql_cluster_8
        )
        assert response["DBClusterIdentifier"] == self.aurora_mysql_cluster_8
        assert response["Engine"] == "aurora-mysql"

        response = self.rds_client.describe_db_cluster(
            db_cluster_identifier=self.aurora_postgresql_cluster
        )
        assert response["DBClusterIdentifier"] == self.aurora_postgresql_cluster
        assert response["Engine"] == "aurora-postgresql"

        response = self.rds_client.describe_db_cluster(
            db_cluster_identifier="do-not-exists-cluster"
        )
        assert response == {}

    def test_describe_db_instance(self, mock_rds_context):
        self.init_default_parameter()

        response = self.rds_client.describe_db_instance(
            db_instance_identifier=self.mysql_instance_8
        )
        assert response["DBInstanceIdentifier"] == self.mysql_instance_8
        assert response["Engine"] == "mysql"

        response = self.rds_client.describe_db_instance(
            db_instance_identifier=self.postgresql_instance
        )
        assert response["DBInstanceIdentifier"] == self.postgresql_instance
        assert response["Engine"] == "postgres"

        response = self.rds_client.describe_db_instance(
            db_instance_identifier="do-not-exists-instance"
        )
        assert response == {}

    def test_describe_db_log_files(self, mock_rds_context):
        from unittest.mock import patch

        self.init_default_parameter()

        with patch("botocore.client.BaseClient._make_api_call", new=mock_rds_api_call):
            response = self.rds_client.describe_db_log_files(
                db_instance_identifier=self.aurora_mysql_instance_8
            )
            assert len(response["DescribeDBLogFiles"]) == 5

            response = self.rds_client.describe_db_log_files(
                db_instance_identifier=self.aurora_mysql_instance_8,
                filename_contains="audit",
            )
            assert len(response["DescribeDBLogFiles"]) == 1

            response = self.rds_client.describe_db_log_files(
                db_instance_identifier="do-not-exists-instance"
            )
            assert len(response["DescribeDBLogFiles"]) == 0

    def test_download_db_log_file_portion(self, mock_rds_context):
        from unittest.mock import patch

        self.init_default_parameter()

        with patch("botocore.client.BaseClient._make_api_call", new=mock_rds_api_call):
            response = self.rds_client.download_db_log_file_portion(
                db_instance_identifier=self.aurora_mysql_instance_8,
                log_file_name="audit/audit.log",
            )
            assert response["LogFileData"] == self.mysql_audit_logs

            response = self.rds_client.download_db_log_file_portion(
                db_instance_identifier=self.aurora_mysql_instance_8,
                log_file_name="audit/audit.log",
                marker="2024-01-01.2:0",
            )
            assert response["LogFileData"] == self.mysql_audit_logs

            response = self.rds_client.download_db_log_file_portion(
                db_instance_identifier="do-not-exists-instance",
                log_file_name="audit/audit.log",
            )
            assert response["LogFileData"] == ""

    def test_describe_db_instance_log_files(self, mock_rds_context):
        from unittest.mock import patch

        self.init_default_parameter()

        with patch("botocore.client.BaseClient._make_api_call", new=mock_rds_api_call):
            response = self.rds_client.describe_db_instance_log_files(
                db_instance_identifier=self.aurora_mysql_instance_8
            )
            assert len(response.keys()) == 5

            response = self.rds_client.describe_db_instance_log_files(
                db_instance_identifier=self.aurora_mysql_instance_8,
                filename_contains_set={"audit"},
            )
            assert len(response.keys()) == 1

            response = self.rds_client.describe_db_instance_log_files(
                db_instance_identifier="do-not-exists-instance"
            )
            assert len(response.keys()) == 0


class TestWAFV2Client:
    def init_default_parameter(self):
        from utils.aws.wafv2 import WAFV2Client

        self.wafv2_client = WAFV2Client()
        self.web_acl_name_01 = os.environ["WAF_WEB_ACL_NAME_01"]
        self.web_acl_name_02 = os.environ["WAF_WEB_ACL_NAME_02"]

    def test_list_web_acls(self, mock_wafv2_context):
        self.init_default_parameter()

        assert list(self.wafv2_client.list_web_acls(scope="REGIONAL")) == []

        web_acl_names = [
            x["Name"] for x in self.wafv2_client.list_web_acls(scope="CLOUDFRONT")
        ]
        assert len(web_acl_names) == 2
        assert self.web_acl_name_01 in web_acl_names
        assert self.web_acl_name_02 in web_acl_names

    def test_get_web_acls_by_name(self, mock_wafv2_context):
        self.init_default_parameter()

        assert (
            self.wafv2_client.get_web_acls_by_name(web_acl_names=[self.web_acl_name_01])
            == []
        )
        assert (
            self.wafv2_client.get_web_acls_by_name(
                web_acl_names=[self.web_acl_name_01], scope="REGIONAL"
            )
            == []
        )
        assert (
            self.wafv2_client.get_web_acls_by_name(
                web_acl_names=[self.web_acl_name_01], scope="CLOUDFRONT"
            )[0]["Name"]
            == self.web_acl_name_01
        )
        assert (
            self.wafv2_client.get_web_acls_by_name(
                web_acl_names=["do-not-exists"], scope="CLOUDFRONT"
            )
            == []
        )
