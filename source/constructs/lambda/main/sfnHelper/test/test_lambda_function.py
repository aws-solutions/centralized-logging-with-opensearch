# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

def test_lambda_function():
    import lambda_function

    lambda_function.lambda_handler(
    {
        'token': 'd27b96a9-7b78-4fe1-94e6-3e42f57f433',
        'args': {
            'stackId': '039a1176-33c4-4ec7-8ea2-3245ae27b4b1',
        },
        'result': {
            'stackStatus': 'CREATE_COMPLETE',
            'error': '',
        }
    }, None)