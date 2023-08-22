# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import json
import pytest
import os
import boto3


from moto import mock_sts

from commonlib.model import AppLogIngestion


@pytest.fixture
def create_event():
    with open("./test/event/test_event.json", "r") as f:
        event = json.load(f)
        # please replace event["arguments"]
        event["arguments"] = {
            "appPipelineId": "appPipelineId1",
            "sourceId": "sourceId1",
        }
        event["info"]["fieldName"] = "createAppLogIngestion"

        print(event)
        return event


@pytest.fixture
def list_event():
    with open("./test/event/test_event.json", "r") as f:
        event = json.load(f)
        event["arguments"] = {"page": 1, "count": 30}
        event["info"]["fieldName"] = "listAppLogIngestions"
        print(event)
        return event


@pytest.fixture
def delete_event():
    with open("./test/event/test_event.json", "r") as f:
        event = json.load(f)
        event["arguments"] = {"ids": ["12345678"]}
        event["info"]["fieldName"] = "deleteAppLogIngestion"
        print(event)
        return event


@pytest.fixture
def get_event():
    with open("./test/event/test_event.json", "r") as f:
        event = json.load(f)
        event["arguments"] = {"id": 12345678}
        event["info"]["fieldName"] = "getAppLogIngestion"
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
    get_event,
    mocker,
):
    mocker.patch("commonlib.dao.AppLogIngestionDao")
    import lambda_function

    # start with empty list
    mock_value = list()
    mocker.patch("lambda_function.dao.list_app_log_ingestions", return_value=mock_value)
    result = lambda_function.lambda_handler(list_event, None)
    assert result["total"] == 0

    # create a appLogIngestion
    mocker.patch(
        "lambda_function.ingestion_svc.create_app_log_ingestion", return_value=12345678
    )
    id = lambda_function.lambda_handler(create_event, None)
    # Expect Execute successfully.
    assert id == 12345678

    # delete a appLogIngestion
    mocker.patch(
        "lambda_function.ingestion_svc.delete_app_log_ingestion", return_value=None
    )
    result = lambda_function.lambda_handler(delete_event, None)
    assert result == "OK"

    # get a appLogIngestion.
    mocker.patch(
        "lambda_function.dao.get_app_log_ingestion",
        return_value=AppLogIngestion(
            **{"appPipelineId": "appPipelineId1", "sourceId": "sourceId1"}
        ),
    )
    result = lambda_function.lambda_handler(get_event, None)
    from commonlib.model import StatusEnum

    assert result["status"] == StatusEnum.CREATING
