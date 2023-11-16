# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0


from typing import Union


class Folder:
    def __init__(self, api):
        self.api = api
        
    def list_folder(self) -> dict:
        """

        :return:
        """
        path = "/folders"
        return self.api.get(path=path)

    def get_folder(self, folder_uid: str) -> dict:
        """

        :param uid:
        :return:
        """
        path = f"/folders/{folder_uid}"
        return self.api.get(path=path)

    def create_folder(self, title: str, folder_uid: Union[str, None] = None) -> dict:
        """

        :param title:
        :param uid:
        :return:
        """
        json_data = dict(title=title)
        if folder_uid is not None:
            json_data["uid"] = folder_uid
        return self.api.post(path="/folders", json=json_data)

    def delete_folder(self, folder_uid: str) -> dict:
        """

        :param uid:
        :return:
        """
        path = f"/folders/{folder_uid}"
        return self.api.delete(path=path)

