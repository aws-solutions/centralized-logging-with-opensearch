## Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
## SPDX-License-Identifier: Apache-2.0

import pytest
from unittest.mock import patch
from moto import mock_aws
import boto3
import json
from aws_lambda_powertools import Metrics
import os

os.environ['CONFIG_JSON'] = json.dumps({
    "parser": "regex",
    "regex": "(?<timestamp>\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z)\s+(?<level>\w+)\s+(?<message>.+)",
    "time_key": "",
    "time_format": "",
    "time_offset": "",
    "is_gzip": False
})
os.environ['LOG_TYPE'] = "SingleLineText"

from event.event_parser import EventBridge


@pytest.fixture
def eventbridge_parser():
    parser = EventBridge("EVENT_BRIDGE")
    parser.set_metrics(Metrics(namespace="Solution/CL"))
    yield parser
    parser._metrics.clear_metrics()

@pytest.fixture
def sample_eventbridge_event():
    return {
        "version": "0",
        "id": "12345678-1234-1234-1234-123456789012",
        "detail-type": "Object Created",
        "source": "aws.s3",
        "time": "2023-01-01T00:00:00Z",
        "region": "us-east-1",
        "detail": {
            "bucket": {
                "name": "test-bucket"
            },
            "object": {
                "key": "test-key"
            }
        }
    }

@pytest.fixture
def setup_s3_bucket():
    """Fixture to setup S3 bucket with test objects."""
    with mock_aws():
        s3 = boto3.client('s3', region_name='us-east-1')
        s3.create_bucket(Bucket='test-bucket')
        log_content =  "\n".join([
            '2024-01-13T10:00:00Z INFO User login successful',
            '2024-01-13T10:01:00Z ERROR Test error log',
            '2024-01-13T10:02:00Z INFO Test log',
            '2024-01-13T10:02:00Z INFO Test log'
        ])
        s3.put_object(
            Bucket='test-bucket',
            Key='test-key',
            Body=log_content
        )
        yield s3

class TestEventBridgeParser:

    def test_process_event_with_valid_event(self, eventbridge_parser, sample_eventbridge_event, setup_s3_bucket):
        with patch('event.event_parser.idx_svc.bulk_load_idx_records') as mock_bulk_load:
            mock_bulk_load.return_value = ([1, 2, 3], [])
            eventbridge_parser.process_event(sample_eventbridge_event)
            
            mock_bulk_load.assert_called_once()
            metrics = eventbridge_parser._metrics
            metrics_data = metrics.serialize_metric_set()

            assert metrics_data['TotalLogs'][0] == 4
            assert metrics_data['LoadedLogs'][0] == 4
            assert metrics_data['FailedLogs'][0] == 0

    def test_process_event_with_large_records(self, eventbridge_parser, sample_eventbridge_event, setup_s3_bucket):
        with patch('event.event_parser.idx_svc.calculate_record_size') as mock_calc_size, \
            patch('event.event_parser.idx_svc.bulk_load_idx_records') as mock_bulk_load, \
            patch('event.event_parser.MAX_PAYLOAD_SIZE', 10):
            
            mock_calc_size.return_value = 4 * 1024 * 1024
            
            mock_bulk_load.return_value = ([], [])
            
            eventbridge_parser.process_event(sample_eventbridge_event)
            
            assert mock_bulk_load.call_count == 2
            
            for call in mock_bulk_load.call_args_list:
                args, _ = call
                assert len(args[0]) < 3
            
            metrics = eventbridge_parser._metrics
            metrics_data = metrics.serialize_metric_set()

            assert metrics_data['TotalLogs'][0] == 4
            assert metrics_data['LoadedLogs'][0] == 4
            assert metrics_data['FailedLogs'][0] == 0

    def test_process_event_with_large_records_and_failures(self, eventbridge_parser, sample_eventbridge_event, setup_s3_bucket):
        with patch('event.event_parser.idx_svc.calculate_record_size') as mock_calc_size, \
            patch('event.event_parser.idx_svc.bulk_load_idx_records') as mock_bulk_load, \
            patch('event.event_parser.MAX_PAYLOAD_SIZE', 10), \
            patch('event.event_parser.restorer.export_failed_records') as mock_export_failed:
            
            mock_calc_size.return_value = 4 * 1024 * 1024
            
            mock_bulk_load.side_effect = [
                ([1], [1]),
                ([1], [1]) 
            ]
            
            eventbridge_parser.process_event(sample_eventbridge_event)
            
            assert mock_bulk_load.call_count == 2
            assert mock_export_failed.call_count == 2
            
            metrics = eventbridge_parser._metrics
            metrics_data = metrics.serialize_metric_set()

            assert metrics_data['TotalLogs'][0] == 4
            assert metrics_data['LoadedLogs'][0] == 2
            assert metrics_data['FailedLogs'][0] == 2                   

    def test_process_event_with_missing_detail(self, eventbridge_parser):
        # Test event without detail field
        invalid_event = {
            "version": "0",
            "id": "12345678-1234-1234-1234-123456789012",
            "source": "aws.s3",
            "account": "123456789012"
        }
        
        with patch.object(eventbridge_parser, 'process_s3_log_file') as mock_process_s3:
            eventbridge_parser.process_event(invalid_event)
            mock_process_s3.assert_not_called()

    def test_process_event_with_malformed_bucket_name(self, eventbridge_parser):
        invalid_event = {
            "version": "0",
            "id": "12345678-1234-1234-1234-123456789012",
            "detail": {
                "bucket": {
                    "wrong_field": "test-bucket"  # wrong field name
                },
                "object": {
                    "key": "test-key"
                }
            }
        }
        with pytest.raises(KeyError):
            eventbridge_parser.process_event(invalid_event)

    def test_process_event_with_malformed_object_key(self, eventbridge_parser):
        invalid_event = {
            "version": "0",
            "id": "12345678-1234-1234-1234-123456789012",
            "detail": {
                "bucket": {
                    "name": "test-bucket"
                },
                "object": {
                    "wrong_field": "test-key"
                }
            }
        }
        
        with pytest.raises(KeyError):
            eventbridge_parser.process_event(invalid_event)
