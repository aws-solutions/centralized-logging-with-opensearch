# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

from unittest.mock import patch
import lambda_function


@patch('lambda_function.send_metrics')
@patch('lambda_function.cfnresponse')
def test_lambda_handler_create_stack(mock_cfnresponse, mock_send_metrics):
    """Test basic lambda handler functionality"""

    test_event = {
        "ResourceType": "Custom::AnonymousMetrics",
        "RequestType": "CREATE",
        "ResourceProperties": {
            "Region": "us-east-1",
            "Template": "CentralizedLogging",
            "DeploymentUuid": "test-uuid"
        }
    }
    lambda_function.handler(test_event, None)

    expected_metrics = {
        "RequestType": "CREATE",
        "Region": "us-east-1",
        "Template": "CentralizedLogging"
    }
    mock_send_metrics.assert_called_once_with(
        expected_metrics,
        "test-uuid"
    )
    mock_cfnresponse.send.assert_called_once()


@patch('lambda_function.send_metrics')
@patch('lambda_function.cfnresponse')
def test_lambda_handler_update_stack(mock_cfnresponse, mock_send_metrics):
    """Test basic lambda handler functionality"""

    test_event = {
        "ResourceType": "Custom::AnonymousMetrics",
        "RequestType": "UPDATE",
        "ResourceProperties": {
            "Region": "us-east-1",
            "Template": "CentralizedLogging",
            "DeploymentUuid": "test-uuid"
        }
    }
    lambda_function.handler(test_event, None)
    expected_metrics = {
        "RequestType": "UPDATE",
        "Region": "us-east-1",
        "Template": "CentralizedLogging"
    }

    mock_send_metrics.assert_called_once_with(
        expected_metrics,
        "test-uuid"
    )
    mock_cfnresponse.send.assert_called_once()


@patch('lambda_function.send_metrics')
@patch('lambda_function.cfnresponse')
def test_lambda_handler_delete_stack(mock_cfnresponse, mock_send_metrics):
    """Test basic lambda handler functionality"""

    test_event = {
        "ResourceType": "Custom::AnonymousMetrics",
        "RequestType": "DELETE",
        "ResourceProperties": {
            "Region": "us-east-1",
            "Template": "CentralizedLogging",
            "DeploymentUuid": "test-uuid"
        }
    }
    lambda_function.handler(test_event, None)

    expected_metrics = {
        "RequestType": "DELETE",
        "Region": "us-east-1",
        "Template": "CentralizedLogging"
    }

    mock_send_metrics.assert_called_once_with(
        expected_metrics,
        "test-uuid"
    )
    mock_cfnresponse.send.assert_called_once()

@patch('lambda_function.cfnresponse')
def test_lambda_handler_create_uuid(mock_cfnresponse):
    """Test basic lambda handler functionality"""

    test_event = {
        "ResourceType": "Custom::CreateUUID",
        "RequestType": "CREATE"
    }
    lambda_function.handler(test_event, None)
    mock_cfnresponse.send.assert_called_once()    

@patch('commonlib.solution_metrics.send_metrics')
@patch('cfnresponse.send')
def test_lambda_handler_missing_request_type(mock_cfnresponse, mock_send_metrics):
    """Test error handling when RequestType is missing"""

    invalid_event = {
        "ResourceType": "Custom::AnonymousMetrics",
        "ResourceProperties": {
            "Region": "us-east-1",
            "Template": "CentralizedLogging",
            "DeploymentUuid": "test-uuid"
        }
    }
    
    lambda_function.handler(invalid_event, None)
    
    mock_send_metrics.assert_not_called()
    mock_cfnresponse.assert_called_once_with(
        invalid_event,
        None,
        'FAILED',
        {},
        reason="'RequestType'"
    )
