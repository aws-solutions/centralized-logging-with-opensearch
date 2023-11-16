# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import json
import boto3
import pytest
import os
from moto import mock_sns, mock_sts


@pytest.fixture
def sns_cli():
    with mock_sns():
        sns_client = boto3.client("sns")
        resp = sns_client.create_topic(
            Name="james-test-FlbUploadingEventSubscriptionTopic"
        )
        os.environ["TOPIC_ARN"] = resp["TopicArn"]
        yield


@pytest.fixture
def link_acct_ddb_streaming_add_event():
    with open("./test/event/link_acct_ddb_streaming_add_event.json", "r") as f:
        add_event_dict = json.load(f)
        add_event_dict["Records"][0]["dynamodb"]["NewImage"][
            "subAccountFlbConfUploadingEventTopicArn"
        ]["S"] = os.environ["TOPIC_ARN"]
        return add_event_dict


@pytest.fixture
def link_acct_ddb_streaming_delete_event():
    with open("./test/event/link_acct_ddb_streaming_delete_event.json", "r") as f:
        delete_event_dict = json.load(f)
        delete_event_dict["Records"][0]["dynamodb"]["OldImage"][
            "subAccountFlbConfUploadingEventTopicArn"
        ]["S"] = os.environ["TOPIC_ARN"]
        return delete_event_dict


@mock_sts
def test_lambda_handle(
    sns_cli,
    link_acct_ddb_streaming_add_event,
    link_acct_ddb_streaming_delete_event,
):
    from member_account.lambda_function import lambda_handler

    lambda_handler(link_acct_ddb_streaming_add_event, None)
    lambda_handler(link_acct_ddb_streaming_delete_event, None)
