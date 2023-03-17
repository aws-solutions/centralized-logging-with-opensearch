# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0
import pytest
from util.state import ISM


@pytest.fixture()
def hot_only_policy():
    return {
        "name":
        "hot",
        "actions": [{
            "rollover": {},
            "timeout": "24h",
            "retry": {
                "count": 5,
                "delay": "1h"
            },
        }]
    }


@pytest.fixture()
def delete_policy():
    return {"name": "delete", "actions": [{"delete": {}}]}


@pytest.fixture()
def cold_delete_policy():
    return {"name": "delete", "actions": [{"cold_delete": {}}]}


@pytest.fixture()
def hot_to_warm_policy():
    return {
        "name":
        "hot",
        "actions": [{
            "rollover": {},
            "timeout": "24h",
            "retry": {
                "count": 5,
                "delay": "1h"
            },
        }],
        "transitions": [{
            "state_name": "warm",
            "conditions": {
                "min_index_age": "1d"
            }
        }],
    }


@pytest.fixture()
def rollover_policy():
    return {
        "name":
        "hot",
        "actions": [{
            "rollover": {
                "min_primary_shard_size": "300gb",
                "min_index_age": "12h",
            },
            "timeout": "24h",
            "retry": {
                "count": 5,
                "delay": "1h"
            },
        }],
        "transitions": [{
            "state_name": "warm",
            "conditions": {
                "min_index_age": "1s"
            }
        }],
    }


class TestISM:

    def test_rollover(self, rollover_policy):
        ism = ISM('12h', '300gb')
        states = []
        while ism.has_next():
            ism.run('1s', '', '')
            states.append(ism.get_status())

        assert len(states) == 2
        assert states[0] == rollover_policy

    def test_hot_warm_delete(self, hot_to_warm_policy, cold_delete_policy):
        ism = ISM()
        states = []
        while ism.has_next():
            ism.run('1d', '2d', '3d')
            states.append(ism.get_status())

        assert len(states) == 4
        assert states[0] == hot_to_warm_policy
        assert states[3] == cold_delete_policy

    def test_hot_only(self, hot_only_policy):
        ism = ISM()
        states = []
        while ism.has_next():
            ism.run()
            states.append(ism.get_status())

        assert len(states) == 1
        assert states[0] == hot_only_policy

    def test_retain_only(self, delete_policy):
        ism = ISM()
        states = []
        while ism.has_next():
            ism.run(retain_age='3d')
            states.append(ism.get_status())

        assert len(states) == 2
        assert states[-1] == delete_policy

    def test_hot_warm(self, hot_to_warm_policy):
        ism = ISM()
        states = []
        while ism.has_next():
            ism.run(warm_age='1d')
            states.append(ism.get_status())

        assert len(states) == 2
        assert states[0] == hot_to_warm_policy

    def test_hot_delete(self, hot_to_warm_policy, delete_policy):
        ism = ISM()
        states = []
        while ism.has_next():
            ism.run(warm_age='1d', retain_age='3h')
            states.append(ism.get_status())

        assert len(states) == 3
        assert states[0] == hot_to_warm_policy
        assert states[-1] == delete_policy

    def test_no_delete(self, hot_to_warm_policy):
        ism = ISM()
        states = []
        while ism.has_next():
            ism.run(warm_age='1d', cold_age='36h')
            states.append(ism.get_status())

        assert len(states) == 3
        assert states[0] == hot_to_warm_policy
