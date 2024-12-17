# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0


class User:

    def __init__(self, api):
        self.api = api

    def preferences(self) -> dict:
        """

        :return:
        """
        preferences_path = "/user/preferences"
        return self.api.get(path=preferences_path)
