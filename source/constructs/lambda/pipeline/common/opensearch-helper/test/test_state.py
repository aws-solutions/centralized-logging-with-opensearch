# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0
import pytest
from util.state import ISM


@pytest.fixture()
def hot_only_policy():
    return {"name": "hot", "actions": []}


@pytest.fixture()
def delete_policy():
    return {"name": "delete", "actions": [{"delete": {}}]}


@pytest.fixture()
def cold_delete_policy():
    return {"name": "delete", "actions": [{"cold_delete": {}}]}


@pytest.fixture()
def hot_to_warm_policy():
    return {
        "name": "hot",
        "actions": [],
        "transitions": [{"state_name": "warm", "conditions": {"min_index_age": "1d"}}],
    }


class TestISM:
    def test_hot_warm_delete(self, hot_to_warm_policy, cold_delete_policy):
        ism = ISM()
        states = []
        while ism.has_next():
            ism.run(1, 2, 3)
            states.append(ism.get_status())

        assert len(states) == 4
        assert states[0] == hot_to_warm_policy
        assert states[3] == cold_delete_policy

    def test_hot_only(self, hot_only_policy):
        ism = ISM()
        states = []
        while ism.has_next():
            ism.run(0, 0, 0)
            states.append(ism.get_status())

        assert len(states) == 1
        assert states[0] == hot_only_policy

    def test_retain_only(self, delete_policy):
        ism = ISM()
        states = []
        while ism.has_next():
            ism.run(0, 0, 3)
            states.append(ism.get_status())

        assert len(states) == 2
        assert states[-1] == delete_policy

    def test_hot_warm(self, hot_to_warm_policy):
        ism = ISM()
        states = []
        while ism.has_next():
            ism.run(1, 0, 0)
            states.append(ism.get_status())

        assert len(states) == 2
        assert states[0] == hot_to_warm_policy

    def test_hot_delete(self, hot_to_warm_policy, delete_policy):
        ism = ISM()
        states = []
        while ism.has_next():
            ism.run(1, 0, 3)
            states.append(ism.get_status())

        assert len(states) == 3
        assert states[0] == hot_to_warm_policy
        assert states[-1] == delete_policy

    def test_no_delete(self, hot_to_warm_policy):
        ism = ISM()
        states = []
        while ism.has_next():
            ism.run(1, 2, 0)
            states.append(ism.get_status())

        assert len(states) == 3
        assert states[0] == hot_to_warm_policy
