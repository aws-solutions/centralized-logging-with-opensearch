# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import pytest
from unittest.mock import Mock, patch
from commonlib.exception import APIException
from idx.idx_svc import AosIdxService

class MockResponse:
    def __init__(self, status_code, text="", content=""):
        self.status_code = status_code
        self.text = text
        self.content = content

@pytest.fixture
def aos_service():
    return AosIdxService()

@pytest.fixture
def mock_opensearch_util():
    with patch('idx.idx_svc.opensearch_util') as mock:
        yield mock

def test_run_func_with_retry_successful_first_attempt(aos_service, mock_opensearch_util):
    """Test run_func_with_retry successful execution on first attempt"""
    mock_func = Mock(return_value=MockResponse(200))
    
    aos_service.run_func_with_retry(
        mock_func,
        "Test Function",
        total_retry=2,
        sleep_interval=0
    )
    assert mock_func.call_count == 1

@patch('time.sleep')  # Mock sleep to speed up tests
def test_run_func_with_retry_403_error_with_retry(mock_sleep, aos_service, mock_opensearch_util):
    """Test run_func_with_retry handling of 403 error with retry"""
    mock_func = Mock(side_effect=[
        MockResponse(403, "Permission denied"),
        MockResponse(200)
    ])
    aos_service.run_func_with_retry(
        mock_func,
        "Test Function",
        total_retry=2,
        sleep_interval=0
    )
    assert mock_func.call_count == 2

@patch('time.sleep')
def test_run_func_with_retry_403_error_max_retries(mock_sleep, aos_service, mock_opensearch_util):
    """Test run_func_with_retry 403 error reaching max retries"""
    mock_func = Mock(return_value=MockResponse(403, "Permission denied"))
    aos_service.map_backend_role = Mock()
    
    with pytest.raises(APIException) as exc_info:
        aos_service.run_func_with_retry(
            mock_func,
            "Test Function",
            total_retry=2,
            sleep_interval=0
        )
    assert mock_func.call_count == 2
    assert aos_service.map_backend_role.call_count == 1
    assert "Lambda failed with permission error" in str(exc_info.value)

def test_run_func_with_retry_409_error_immediate_raise(aos_service, mock_opensearch_util):
    """Test run_func_with_retry immediate raise on 409 error"""
    mock_func = Mock(return_value=MockResponse(409, "Conflict error"))
    
    with pytest.raises(APIException) as exc_info:
        aos_service.run_func_with_retry(
            mock_func,
            "Test Function",
            total_retry=2,
            sleep_interval=0
        )
    assert mock_func.call_count == 1
    assert "Conflict error in OpenSearch" in str(exc_info.value)

@patch('time.sleep')
def test_run_func_with_retry_other_error_with_retry(mock_sleep, aos_service, mock_opensearch_util):
    """Test handling of other errors with retry"""
    mock_func = Mock(side_effect=[
        MockResponse(500, "Server error"),
        MockResponse(200)
    ])
    aos_service.run_func_with_retry(
        mock_func,
        "Test Function",
        total_retry=2,
        sleep_interval=0
    )
    assert mock_func.call_count == 2

@patch('time.sleep')
def test_run_func_with_retry_other_error_max_retries(mock_sleep, aos_service, mock_opensearch_util):
    """Test other error reaching max retries"""
    mock_func = Mock(return_value=MockResponse(500, "Server error"))
    
    with pytest.raises(APIException) as exc_info:
        aos_service.run_func_with_retry(
            mock_func,
            "Test Function",
            total_retry=2,
            sleep_interval=0
        )
    assert mock_func.call_count == 2

@patch('time.sleep')
def test_ism_policy_creation(mock_sleep, aos_service, mock_opensearch_util):
    """Test specific ISM policy creation scenario"""
    mock_opensearch_util.create_ism_policy.side_effect = [
        MockResponse(403, "Permission denied"),
        MockResponse(200)
    ]
    aos_service.run_func_with_retry(
        mock_opensearch_util.create_ism_policy,
        "Create ISM",
        2,
        sleep_interval=0,
        policy_name="test_policy"
    )
    assert mock_opensearch_util.create_ism_policy.call_count == 2