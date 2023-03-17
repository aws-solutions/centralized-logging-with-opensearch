# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import pytest

from util.protocol import get_protocal_code


@pytest.mark.parametrize(
    "protocol,expected",
    [
        ("6", "TCP"),
        ("17", "UDP"),
        ("27", "RDP"),
    ],
)
def test_get_protocal_code(protocol, expected):
    assert get_protocal_code(protocol) == expected
