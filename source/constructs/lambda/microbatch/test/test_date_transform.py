# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import os
import sys
import pytest


sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


def test_lambda_function():
    from date_transform.lambda_function import lambda_handler
    
    with pytest.raises(Exception) as exception_info:
        lambda_handler('not-a-dict', {})
    assert exception_info.value.args[0] == 'The event is not a dict.'
    
    assert lambda_handler({'intervalDays': -3, 'date': '2023-01-01', 'format': '%Y-%m-%d'}, {}) == {'date': '20221229'}
    assert lambda_handler({'date': '2023-01-01', 'format': '%Y-%m-%d'}, {}) == {'date': '20221202'}

    with pytest.raises(Exception) as exception_info:
        lambda_handler({'intervalDays': -3, 'format': '%Y-%m-%d-%H'}, {})
    assert exception_info.value.args[0] == 'The parameter date dose not exists.'

    with pytest.raises(Exception) as exception_info:
        lambda_handler({'intervalDays': -3, 'date': '2023-01-01'}, {})
    assert exception_info.value.args[0] == 'The parameter format dose not exists.'

    with pytest.raises(ValueError):
        lambda_handler({'intervalDays': -3, 'date': '2023-01-01', 'format': '%Y-%m-%d-%H'}, {})
