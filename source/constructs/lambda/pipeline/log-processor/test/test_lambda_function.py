# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import os
import pytest
from unittest.mock import patch

# from conftest import load_environment_variables
# load_environment_variables()
from lambda_function import (
    lambda_handler,
    parse_kds_event,
    parse_msk_event,
    parse_event_bridge_event,
    change_sqs_message_visibility,
    disable_event_bride_rule,
    handle_sqs_retries,
    logger,
)


class TestLambdaHandler:

    @patch("lambda_function.idx_svc")
    @patch("lambda_function.disable_event_bride_rule")
    def test_handler(self, mock_disable, mock_idx):
        event = {"foo": "bar"}
        lambda_handler(event, None)
        mock_idx.init_idx_env.assert_called()
        mock_disable.assert_called_with(event)


class TestParseEvents:
    @patch("lambda_function.KDS")
    def test_parse_kds_event(self, kds_mock):
        os.environ["SOURCE"] = "KDS"
        event = {"records": [1, 2, 3]}
        parse_kds_event(event)

        kds_mock.assert_called_with("KDS")
        kds_mock.return_value.process_event.assert_called_with(event)

    @patch("lambda_function.MSK")
    @patch("lambda_function.source", "Nginx")
    def test_parse_msk_event(self, msk_mock):
        event = {"records": [1, 2, 3]}
        parse_msk_event(event)
        msk_mock.assert_called_with("Nginx")
        msk_mock.return_value.process_event.assert_called_with(event)

    @patch("lambda_function.WAFSampled")
    @patch("lambda_function.log_type", "WAFSampled")
    def test_parse_waf_event(self, waf_mock):
        event = {"records": [1, 2, 3]}
        parse_event_bridge_event(event)
        waf_mock.assert_called_with()
        waf_mock.return_value.process_event.assert_called_with(event)


@pytest.fixture
def sqs_event():
    return {"records": [{"eventSource": "aws:sqs", "receiptHandle": "mocked_receipt"}]}


def test_change_visibility(sqs_event):
    record = sqs_event["records"][0]
    with patch("lambda_function.sqs_client") as mock:
        change_sqs_message_visibility(record)
        mock.change_message_visibility.assert_called_with(
            QueueUrl="url", ReceiptHandle=record["receiptHandle"], VisibilityTimeout=300
        )


@pytest.fixture
def schedule_event():
    return {"detail-type": "Scheduled Event", "resources": ["arn:rule/mocked_rule"]}


@patch("lambda_function.write_idx_data", "False")
def test_disable_event_bride_rule(schedule_event):
    with patch("lambda_function.event_bridge_client") as mock:
        disable_event_bride_rule(schedule_event)
        mock.disable_rule.assert_called_with(Name="mocked_rule")


def test_approximate_receive_count_less_than_3_raises_exception():
    record = {"attributes": {"ApproximateReceiveCount": "2"}}
    with pytest.raises(Exception) as exc_info:
        handle_sqs_retries(record)
    assert "Error processing SQS message" in str(exc_info.value)


def test_approximate_receive_count_greater_than_2_logs_correctly(mocker):
    mocker.patch.object(logger, "info")
    mocker.patch.object(logger, "error")
    record = {"attributes": {"ApproximateReceiveCount": "3"}}
    handle_sqs_retries(record)
    logger.info.assert_called_once_with(f"record is {record}")
    logger.error.assert_called_once_with(
        "Error: %s",
        "This message has exceeded the maximum number of retries, verify that you can connect to OpenSearch or that the data type does not match the field type defined for the index",
    )
