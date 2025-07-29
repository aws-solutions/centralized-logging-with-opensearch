# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

from unittest.mock import patch
from commonlib.solution_metrics import send_metrics

@patch('commonlib.solution_metrics.invoke_metrics_api')
@patch('os.getenv')
def test_send_metrics_when_enabled(mock_getenv, mock_invoke_metrics):
    def mock_env_values(key, default=None):
        env_values = {
            'SEND_ANONYMIZED_USAGE_DATA': 'yes',
            'DEPLOYMENT_UUID': 'test-uuid',
            'SOLUTION_VERSION': '1.0.0'
        }
        return env_values.get(key, default)
    mock_getenv.side_effect = mock_env_values

    test_metrics = {"test": "data"}
    
    send_metrics(test_metrics)

    mock_invoke_metrics.assert_called_once()
    called_data = mock_invoke_metrics.call_args[0][0]
    
    # Assert the payload structure
    assert called_data['Solution'] == 'SO8025'
    assert called_data['UUID'] == 'test-uuid'
    assert called_data['Version'] == '1.0.0'
    assert called_data['Data'] == test_metrics
    assert 'TimeStamp' in called_data


@patch('os.getenv')
@patch('commonlib.solution_metrics.invoke_metrics_api')
def test_send_metrics_when_disabled(mock_invoke_metrics, mock_getenv):
    mock_getenv.return_value = 'no'
    send_metrics({"test": "data"})
    mock_invoke_metrics.assert_not_called()