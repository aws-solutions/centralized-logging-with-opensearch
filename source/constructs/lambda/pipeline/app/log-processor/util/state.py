# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

from abc import ABC, abstractmethod


class ISM:

    def __init__(self):
        # start from hot
        self._state = HotState(self)
        self._status = {}
        self._is_end = False

    def transit(self, state):
        self._status = {
            'name': self._state.name,
            'actions': self._state.actions
        }

        # move to new state
        self._state = state
        if state is None:
            self._is_end = True
        else:
            self._status['transitions'] = [
                {
                    "state_name": self._state.name,
                    "conditions": {
                        "min_index_age": f"{self._state.age}d"
                    }
                }
            ]

    def run(self, days_to_warm, days_to_cold, days_to_retain):
        return self._state.run(days_to_warm, days_to_cold, days_to_retain)

    def get_status(self):
        return self._status

    def has_next(self):
        return not self._is_end


class State(ABC):
    """ Base State class """

    name = ''

    def __init__(self, ism: ISM, age: int = 0):
        self._ism = ism
        self.age = age
        self.actions = []

    @abstractmethod
    def run(self, days_to_warm, days_to_cold, days_to_retain):
        """ main execution logic """
        pass


class HotState(State):
    name = "hot"

    def run(self, days_to_warm, days_to_cold, days_to_retain):
        # can only be hot-to-warm or hot-to-delete
        if days_to_warm:
            self._ism.transit(WarmState(self._ism, days_to_warm))
        elif days_to_retain:
            self._ism.transit(DeleteState(self._ism, days_to_retain))
        else:
            self._ism.transit(None)


class WarmState(State):
    name = "warm"

    def __init__(self, ism: ISM, age: int = 0):
        super().__init__(ism, age)
        self.actions = [{
            "warm_migration": {},
            "timeout": "24h",
            "retry": {
                "count": 5,
                "delay": "1h"
            }
        }]

    def run(self, days_to_warm, days_to_cold, days_to_retain):
        # can only be warm-to-cold or warm-to-delete
        if days_to_cold:
            self._ism.transit(ColdState(self._ism, days_to_cold))
        elif days_to_retain:
            self._ism.transit(DeleteState(self._ism, days_to_retain))
        else:
            self._ism.transit(None)


class ColdState(State):
    name = "cold"

    def __init__(self, ism: ISM, age: int = 0):
        super().__init__(ism, age)
        self.actions = [{
            "cold_migration": {
                "timestamp_field": "@timestamp"
            }
        }]

    def run(self, days_to_warm, days_to_cold, days_to_retain):
        # can only be cold-to-delete
        # the default delete action needs to be changed to cold_delete
        if days_to_retain:
            delete_state = DeleteState(self._ism, days_to_retain)
            delete_state.actions = [{"cold_delete": {}}]
            self._ism.transit(delete_state)
        else:
            self._ism.transit(None)


class DeleteState(State):
    name = "delete"

    def __init__(self, ism: ISM, age: int = 0):
        super().__init__(ism, age)
        self.actions = [{"delete": {}}]

    def run(self, days_to_warm, days_to_cold, days_to_retain):
        self._ism.transit(None)

# if __name__ == "__main__":
#     # Test code.
#     test_ism = ISM()
#     while test_ism.has_next():
#         test_ism.run(1, 0, 10)
#         print(test_ism.get_status())
