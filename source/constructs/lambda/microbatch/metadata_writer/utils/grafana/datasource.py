# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0


class DataSource:
    def __init__(self, api):
        self.api = api
        
    def get_datasource(self, datasource_uid) -> dict:
        """

        :param datasource_name:
        :return:
        """
        get_datasource_path = f'/datasources/uid/{datasource_uid}'
        return self.api.get(path=get_datasource_path)
    
    def get_datasource_by_name(self, datasource_name) -> dict:
        """

        :param datasource_name:
        :return:
        """
        get_datasource_path = f'/datasources/name/{datasource_name}'
        return self.api.get(path=get_datasource_path)

    def create_datasource(self, datasource):
        """

        :param datasource:
        :return:
        """
        create_datasource_path = "/datasources"
        return self.api.post(path=create_datasource_path, json=datasource)
    
    def update_datasource(self, datasource_uid, datasource):
        """

        :param datasource_id:
        :param datasource:
        :return:
        """
        update_datasource_path = f"/datasources/uid/{datasource_uid}"
        return self.api.put(update_datasource_path, json=datasource)

    def delete_datasource(self, datasource_uid):
        """

        :param datasource_uid:
        :return:
        """
        delete_datasource = f"/datasources/uid/{datasource_uid}"
        return self.api.delete(path=delete_datasource)