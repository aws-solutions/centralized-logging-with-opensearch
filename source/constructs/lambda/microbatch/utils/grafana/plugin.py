# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0


class Plugin:

    def __init__(self, api):
        self.api = api
        
    def get_plugin_settings(self, plugin_id: str) -> dict:
        """  
        
        :param plugin_id:
        :return:
        """
        get_plugin_settings_path = f'/plugins/{plugin_id}/settings'
        return self.api.get(path=get_plugin_settings_path)
    
