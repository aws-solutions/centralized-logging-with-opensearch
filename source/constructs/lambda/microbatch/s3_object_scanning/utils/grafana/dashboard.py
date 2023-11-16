# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0


class Dashboard:

    def __init__(self, api):
        self.api = api

    def get_dashboard(self, dashboard_uid: str) -> dict:
        """

        :param dashboard_uid:
        :return:
        """
        get_dashboard_path = f"/dashboards/uid/{dashboard_uid}"
        return self.api.get(path=get_dashboard_path)

    def update_dashboard(self, json: dict) -> dict:
        """ 

        :param dashboard:
        :return:
        """
        put_dashboard_path = "/dashboards/db"
        return self.api.post(path=put_dashboard_path, json=json)

    def delete_dashboard(self, dashboard_uid: str) -> dict:
        """

        :param dashboard_uid:
        :return:
        """
        delete_dashboard_path = f"/dashboards/uid/{dashboard_uid}"
        return self.api.delete(path=delete_dashboard_path)

