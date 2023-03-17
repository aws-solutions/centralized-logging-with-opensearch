# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

from moto import mock_iam


@mock_iam
def test_lambda_function():
    import create_service_linked_role

    # Create a service linked role in a brand new account
    result = create_service_linked_role.lambda_handler(
        {
            "RequestType": "Create",
        },
        None,
    )
    # Expect Execute successfully.
    assert result == "OK"
