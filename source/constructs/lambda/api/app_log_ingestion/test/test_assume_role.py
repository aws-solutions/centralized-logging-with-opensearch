# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import os


def test_generate_assume_role_policy():

    account_id = "111"
    statement_list = list()
    os.environ["AWS_REGION"] = 'us-west-1'
    from ..util import assume_role
    policy = assume_role.generate_assume_role_policy_document(statement_list)

    os.environ["AWS_REGION"] = 'cn-northwest-1'
    policy = assume_role.generate_assume_role_policy_document(statement_list)

    statement = assume_role.generate_assume_role_statement_document(account_id)
    assert account_id in statement
