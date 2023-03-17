# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

from abc import ABC, abstractmethod


class ISM:
    """Index State Management State Machine"""

    def __init__(
        self,
        age='',
        size='',
    ):
        # start from hot
        self._state = HotState(self, age, size)
        self._status = {}
        self._is_end = False

    def transit(self, state):
        self._status = {
            "name": self._state.name,
            "actions": self._state.actions
        }

        # move to new state
        self._state = state
        if state is None:
            self._is_end = True
        else:
            self._status["transitions"] = [{
                "state_name": self._state.name,
                "conditions": {
                    "min_index_age": f"{self._state.age}"
                },
            }]

    def run(self, warm_age='', cold_age='', retain_age=''):
        return self._state.run(warm_age, cold_age, retain_age)

    def get_status(self):
        return self._status

    def has_next(self):
        return not self._is_end


class State(ABC):
    """Base State class"""

    name = ""

    def __init__(self, ism: ISM, age, size):
        self._ism = ism
        self.age = age
        self.size = size
        self.actions = []

    @abstractmethod
    def run(self, warm_age, cold_age, retain_age):
        """main execution logic"""
        pass


class HotState(State):
    name = "hot"

    def __init__(self, ism: ISM, age, size):
        super().__init__(ism, age, size)
        action = {
            "rollover": {},
            "timeout": "24h",
            "retry": {
                "count": 5,
                "delay": "1h"
            },
        }
        if size:
            action["rollover"]["min_primary_shard_size"] = f"{size}"
        if age:
            action["rollover"]["min_index_age"] = f"{age}"
        self.actions = [action]

    def run(self, warm_age, cold_age, retain_age):
        # can only be hot-to-warm or hot-to-delete
        if warm_age:
            self._ism.transit(WarmState(self._ism, warm_age))
        elif retain_age:
            self._ism.transit(DeleteState(self._ism, retain_age))
        else:
            self._ism.transit(None)


class WarmState(State):
    name = "warm"

    def __init__(self, ism: ISM, age):
        super().__init__(ism, age, '')
        self.actions = [{
            "warm_migration": {},
            "timeout": "24h",
            "retry": {
                "count": 5,
                "delay": "1h"
            },
        }]

    def run(self, warm_age, cold_age, retain_age):
        # can only be warm-to-cold or warm-to-delete
        if cold_age:
            self._ism.transit(ColdState(self._ism, cold_age))
        elif retain_age:
            self._ism.transit(DeleteState(self._ism, retain_age))
        else:
            self._ism.transit(None)


class ColdState(State):
    name = "cold"

    def __init__(self, ism: ISM, age):
        super().__init__(ism, age, '')
        self.actions = [{"cold_migration": {"timestamp_field": "@timestamp"}}]

    def run(self, warm_age, cold_age, retain_age):
        # can only be cold-to-delete
        # the default delete action needs to be changed to cold_delete
        if retain_age:
            delete_state = DeleteState(self._ism, retain_age)
            delete_state.actions = [{"cold_delete": {}}]
            self._ism.transit(delete_state)
        else:
            self._ism.transit(None)


class DeleteState(State):
    name = "delete"

    def __init__(self, ism: ISM, age):
        super().__init__(ism, age, '')
        self.actions = [{"delete": {}}]

    def run(self, warm_age, cold_age, retain_age):
        self._ism.transit(None)


# if __name__ == "__main__":
#     # Test code.
#     test_ism = ISM()
#     while test_ism.has_next():
#         test_ism.run(1, 0, 10)
#         print(test_ism.get_status())
