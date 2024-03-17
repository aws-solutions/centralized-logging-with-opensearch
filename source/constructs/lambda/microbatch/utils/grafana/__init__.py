# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import urllib3
import requests
from typing import Union
from functools import cached_property
from .dashboard import Dashboard
from .datasource import DataSource
from .folder import Folder
from .plugin import Plugin
from .user import User

try:
    from utils import logger # type: ignore
except ImportError:
    import logging
    logger = logging.getLogger()
    logger.setLevel(logging.INFO)


urllib3.disable_warnings()


__all__ = ['GrafanaClient', 'AthenaConnection']


class AthenaConnection:
    
    uid = ''
    name = ''
    account_id = ''
    region = ''
    database = ''
    work_group = ''
    output_location = ''
    assume_role_arn = ''
    catalog = 'AwsDataCatalog'
    
    def __init__(self, account_id: str, region: str, database: str, work_group: str, output_location: str, assume_role_arn: str, catalog: str = 'AwsDataCatalog'):
        self.account_id = account_id
        self.region = region
        self.database = database
        self.work_group = work_group
        self.output_location = output_location
        self.assume_role_arn = assume_role_arn
        self.catalog = catalog
        self.name = f'Athena-clo-{self.account_id}-{self.region}'


class GrafanaClient:
    """Grafana Client, used to interact with Grafana."""
    
    def __init__(self, url: str, token: str, verify=True, timeout=30.0):
        self.url = url.strip().strip('/')
        self.token = token
        self.verify = verify
        self.timeout = timeout
        self.api = GrafanaApi(url=self.url, token=self.token, verify=self.verify, timeout=self.timeout)

    @cached_property
    def dashboard(self) -> Dashboard:
        return Dashboard(self.api)
    
    @cached_property
    def datasource(self) -> DataSource:
        return DataSource(self.api)
    
    @cached_property
    def folder(self) -> Folder:
        return Folder(self.api)

    @cached_property
    def plugin(self) -> Plugin:
        return Plugin(self.api)
    
    @cached_property
    def user(self) -> User:
        return User(self.api)
    
    def check_url_connectivity(self, timeout: int = 5) -> bool:
        try:
            requests.get(url=self.url, verify=self.verify, timeout=timeout)
            return True
        except Exception as e:
            logger.warning(e)
            return False
    
    def check_token_validity(self) -> bool:
        response = self.user.preferences()
        if response['status'] == 200:
            return True
        return False
    
    def has_installed_athena_plugin(self) -> bool:
        if self.plugin.get_plugin_settings(plugin_id='grafana-athena-datasource')['status'] == 200:
            return True
        return False
    
    def check_data_source_permission(self) -> bool:
        response = self.create_athena_datasource(datasource_name='TestCreateAthenaDatasource',
                                                 database='',
                                                 region='',
                                                 work_group='',
                                                 assume_role_arn='',
                                                 output_location='',
                                                 catalog='')
        if response['status'] == 200:
            self.datasource.delete_datasource(datasource_uid=response['content']['uid'])
            return True
        return False
    
    def check_folder_permission(self):
        test_folder_uid = 'test-folder-permission'
        self.folder.create_folder(title='TestFolderPermission', folder_uid=test_folder_uid)
        if self.folder.get_folder(folder_uid=test_folder_uid)['status'] == 200:
            self.folder.delete_folder(folder_uid=test_folder_uid)
            return True
        return False
    
    def check_dashboards_permission(self):
        """_summary_

        Returns:
            _type_: _description_
        """
        json = {
            "dashboard": {
                "title": "TestDashboardsPermission",
                "tags": [ "templated" ],
                "timezone": "browser",
                "schemaVersion": 16,
                "version": 0,
                "refresh": "25s"
                },
            "overwrite": True
            }
        response = self.dashboard.update_dashboard(json=json)
        if response['status'] == 200:
            self.dashboard.delete_dashboard(dashboard_uid=response['content']['uid'])
            return True
        return False
    
    def check_permission(self) -> None:
        """ Check Grafana permission.
        """
        if self.check_url_connectivity() is False:
            raise ConnectionError(f'Failed to check url connectivity, grafana address: {self.url} cannot be accessed.')
        
        if self.check_token_validity() is False:
            raise PermissionError(f'Invalid service account token: {self.token}')
        
        if self.has_installed_athena_plugin() is False:
            raise ModuleNotFoundError('No Athena plugin installed.')
        
        if self.check_data_source_permission() is False:
            raise PermissionError('Missing data source creation permission.')
        
        if self.check_folder_permission() is False:
            raise PermissionError('Missing folder creation permission.')
        
        if self.check_dashboards_permission() is False:
            raise PermissionError('Missing update dashboards permission.')
    
    def get_folder_by_title(self, title: str):
        response = {'status': 404, 'content': {'message': 'Folder not found.'}}
        
        folders = self.folder.list_folder().get('content', [])
        for folder in folders:
            if folder['title'] == title:
                response['content'] = folder
                response['status'] = 200
                break
        
        return response
    
    def create_folder(self, title: str) -> dict:
        response = self.get_folder_by_title(title=title)
        if response['status'] == 200:
            return self.folder.get_folder(folder_uid=response['content']['uid'])
        else:
            return self.folder.create_folder(title=title)
    
    def update_datasource_by_name(self, datasource_name: str, datasource: dict):
        """

        :param datasource_name:
        :param datasource:
        :return:
        """
        datasource['name'] = datasource_name
        datasource_info = self.datasource.get_datasource_by_name(datasource_name=datasource_name)

        if datasource_info['status'] == 200:
            response = self.datasource.update_datasource(datasource_uid=datasource_info['content']['uid'], datasource=datasource)
        else:
            response = self.datasource.create_datasource(datasource=datasource)
        
        if response['status'] == 200:
            response['content'].update(response['content'].get('datasource', {})) 
            response['content'].pop('datasource', None)
        return response
    
    def update_athena_connection_uid(self, athena_connection: AthenaConnection) -> AthenaConnection:
        """Update the uid of the athena data source.

        Returns:
            str: _description_
        """
        datasource_info = self.create_athena_datasource(datasource_name=athena_connection.name,
                                                        database=athena_connection.database,
                                                        region=athena_connection.region,
                                                        work_group=athena_connection.work_group,
                                                        assume_role_arn=athena_connection.assume_role_arn,
                                                        output_location=athena_connection.output_location,
                                                        catalog=athena_connection.catalog)
        athena_connection.uid = datasource_info['content']['uid']
        return athena_connection
    
    def create_athena_datasource(self, datasource_name: str, database: str, region: str, work_group: str, assume_role_arn: str, output_location: str, catalog: str = 'AwsDataCatalog') -> dict:
        """Create an Athena data source in Grafana.

        Args:
            datasource_name (str): Name of data source.
            database (str): Name of the database within the catalog.
            region (str): Region in which the cluster is deployed.
            work_group (str): Workgroup to use.
            assume_role_arn (str): Specify the ARN of the role to assume.
            output_location (str): AWS S3 bucket to store execution outputs.
            catalog (str, optional): Athena catalog. Defaults to 'AwsDataCatalog'.

        Returns:
            dict: _description_
        """
        datasource = {
            "type": "grafana-athena-datasource",
            "access": "proxy",
            "isDefault": False,
            "jsonData": {
                "authType": "default",
                "catalog": catalog,
                "database": database,
                "defaultRegion": region,
                "workgroup": work_group,
                "assumeRoleArn": assume_role_arn,
                "outputLocation": output_location,
            }
        }
        
        return self.update_datasource_by_name(datasource_name=datasource_name, datasource=datasource)
        
    @staticmethod
    def replace_athena_connection_args_in_templates(datasource_uid: str, catalog: str, 
                                                    database: str, region: str, table: str, 
                                                    dashboard: dict, reuse: bool = True, 
                                                    reuse_age: int = 5) -> dict:
        
        """Replace Athena's connection parameter information in templates.
        
           1. traverse templating.list.
           2. replace datasource.uid in templating.list.
           3. replace query.connectionArgs.database in templating.list.
           4. replace query.connectionArgs.region in templating.list.
           5. replace query.connectionArgs.resultReuseEnabled in templating.list.
           6. replace query.connectionArgs.resultReuseMaxAgeInMinutes in templating.list.
           7. replace datasource.uid in templating.list.
           8. replace table in templating.list.

        Args:
            datasource_id (str): 
            catalog (str): The ID of the Data Catalog. e.g.g AwsDataCatalog.
            database (str): The database name.
            region (str): Region in which the Athena is deployed.
            table (str): The table name.
            data (dict): A Grafana JSON structure that contains layout, variables, styles, data sources, queries, and so on. For more information, you can see https://grafana.com/docs/grafana/latest/dashboards/manage-dashboards/#export-a-dashboard.
            reuse (bool, optional): Query result reuse is a feature that allows Athena to reuse query results from previous queries. Defaults to True.
            reuse_age (int, optional): You can specify a maximum age for reusing query results in minutes. Defaults to 5.

        Returns:
            dict: A new Grafana Json structure.
        """
        for template in dashboard.get('templating', {}).get('list', []):
            if template.get('datasource', {}).get('type') == 'grafana-athena-datasource':
                template['datasource']['uid'] = datasource_uid
                template['query']['table'] = table
                if not template['query'].get('connectionArgs'):
                    continue
                template['query']['connectionArgs']['catalog'] = catalog
                template['query']['connectionArgs']['database'] = database
                template['query']['connectionArgs']['region'] = region
                template['query']['connectionArgs']['resultReuseEnabled'] = reuse
                template['query']['connectionArgs']['resultReuseMaxAgeInMinutes'] = reuse_age
        return dashboard
    
    @staticmethod
    def replace_athena_connection_args_in_panels(datasource_uid: str, catalog: str, 
                                                 database: str, region: str, table: str, 
                                                 dashboard: dict, reuse: bool = True, 
                                                 reuse_age: int = 5) -> dict:
        """Replace Athena's connection parameter information in panels.
        
           1. replace panels.datasource.uid
           2. replace panels.targets
               2.1. replace connectionArgs.catalog in panels.targets.
               2.2. replace connectionArgs.database in panels.targets.
               2.3. replace connectionArgs.region in panels.targets.
               2.4. replace connectionArgs.resultReuseEnabled in panels.targets.
               2.5. replace connectionArgs.resultReuseMaxAgeInMinutes in panels.targets.
               2.6. replace datasource.uid in panels.targets.
               2.7. replace table in panels.targets.

        Args:
            datasource_id (str): 
            catalog (str): The ID of the Data Catalog. e.g.g AwsDataCatalog.
            database (str): The database name.
            region (str): Region in which the Athena is deployed.
            table (str): The table name.
            data (dict): A Grafana JSON structure that contains layout, variables, styles, data sources, queries, and so on. For more information, you can see https://grafana.com/docs/grafana/latest/dashboards/manage-dashboards/#export-a-dashboard.
            reuse (bool, optional): Query result reuse is a feature that allows Athena to reuse query results from previous queries. Defaults to True.
            reuse_age (int, optional): You can specify a maximum age for reusing query results in minutes. Defaults to 5.

        Returns:
            dict: A new Grafana Json structure.
        """
        for panel in dashboard.get('panels', []):
            if panel.get('datasource') and panel['datasource'].get('type') == 'grafana-athena-datasource':
                panel['datasource']['uid'] = datasource_uid

            for target in panel.get('targets', []):
                if target.get('datasource', {}).get('type') == 'grafana-athena-datasource':
                    target['datasource']['uid'] = datasource_uid
                    target['table'] = table
                    if not target.get('connectionArgs'):
                        continue
                    target['connectionArgs']['catalog'] = catalog
                    target['connectionArgs']['database'] = database
                    target['connectionArgs']['region'] = region
                    target['connectionArgs']['resultReuseEnabled'] = reuse
                    target['connectionArgs']['resultReuseMaxAgeInMinutes'] = reuse_age
        return dashboard
    
    def import_dashboard(self, dashboard: dict, overwrite: bool = True, folder_title: str = '') -> dict:
        """ Import the dashboard json file exported by the Grafana console.
            
            Rules:
                1. Create a new dashboard if dashboard.uid is not exists in grafana.
                2. Update dashboard if dashboard.uid is not exists and overwrite is True.
                3. Do nothing if dashboard.uid is not exists and overwrite is False.

        :param dashboard (dict): The complete dashboard model. For more information, you can see https://grafana.com/docs/grafana/latest/dashboards/manage-dashboards/#export-a-dashboard.
               overwrite (bool): Set to true if you want to overwrite existing dashboard with newer version, same dashboard title in folder or same dashboard uid.
        :return:
        """
        dashboard.pop('id', None)
        payload = {'dashboard': dashboard, 'overwrite': overwrite}
        
        if folder_title:
            folder_response = self.create_folder(title=folder_title)
            payload['folderUid'] = folder_response['content']['uid']
        
        if self.dashboard.get_dashboard(dashboard_uid=dashboard['uid'])['status'] != 200 or overwrite is True:
            return self.dashboard.update_dashboard(json=payload)
        
        return {'status': 200, 'content': {'message': 'Dashboard is exist and overwrite is false.'}}
    
    def import_dashboard_for_services(self, table: str, dashboard: dict, athena_connection: AthenaConnection, overwrite: bool = False, folder_title: str = '') -> dict:
        """ Import the Dashboard, using the dashboard json file exported from grafana for the Services log.

        Args:
            dashboard_name (str): The dashboard name, unique name in the directory.
            database (str): The database name.
            table (str): The table name.
            dashboard (dict): The complete dashboard model. For more information, you can see https://grafana.com/docs/grafana/latest/dashboards/manage-dashboards/#export-a-dashboard.
            overwrite (bool): Set to true if you want to overwrite existing dashboard with newer version, same dashboard title in folder or same dashboard uid.

        Returns:
            dict: _description_
        """
        athena_connection = self.update_athena_connection_uid(athena_connection=athena_connection)
        
        dashboard = self.replace_athena_connection_args_in_panels(datasource_uid=athena_connection.uid,
                                                                  catalog=athena_connection.catalog,
                                                                  database=athena_connection.database,
                                                                  region=athena_connection.region,
                                                                  table=table,
                                                                  dashboard=dashboard)
        dashboard = self.replace_athena_connection_args_in_templates(datasource_uid=athena_connection.uid,
                                                                     catalog=athena_connection.catalog,
                                                                     database=athena_connection.database,
                                                                     region=athena_connection.region,
                                                                     table=table,
                                                                     dashboard=dashboard)
        
        return self.import_dashboard(dashboard=dashboard, overwrite=overwrite, folder_title=folder_title)
    
    def import_details_for_services(self, table: str, metrics_table: str, dashboard: dict, athena_connection: AthenaConnection, overwrite: bool = False, folder_title: str = '') -> dict:
        """Import detailed data to query the Dashboard, using the dashboard json file exported from grafana for the Services log.
        
        Args:
            dashboard_name (str): The dashboard name, unique name in the directory.
            database (str): The database name.
            table (str): The table name.
            metrics_table (str): The metrics table name.
            dashboard (dict): The complete dashboard model. For more information, you can see https://grafana.com/docs/grafana/latest/dashboards/manage-dashboards/#export-a-dashboard.
            overwrite (bool): Set to true if you want to overwrite existing dashboard with newer version, same dashboard title in folder or same dashboard uid.

        Returns:
            dict: _description_
        """
        athena_connection = self.update_athena_connection_uid(athena_connection=athena_connection)
        
        dashboard = self.replace_athena_connection_args_in_panels(datasource_uid=athena_connection.uid,
                                                                  catalog=athena_connection.catalog,
                                                                  database=athena_connection.database,
                                                                  region=athena_connection.region,
                                                                  table=table,
                                                                  dashboard=dashboard)
        dashboard = self.replace_athena_connection_args_in_templates(datasource_uid=athena_connection.uid,
                                                                     catalog=athena_connection.catalog,
                                                                     database=athena_connection.database,
                                                                     region=athena_connection.region,
                                                                     table=metrics_table,
                                                                     dashboard=dashboard)
        for template in dashboard.get('templating', {}).get('list', []):
            if template.get('datasource', {}).get('type') == 'grafana-athena-datasource' and template.get('name') == 'page_no':
                template['query']['table'] = table
                
        return self.import_dashboard(dashboard=dashboard, overwrite=overwrite, folder_title=folder_title)

    def import_details_for_application(self, table: str, dashboard: dict, athena_connection: AthenaConnection, overwrite: bool = False, folder_title: str = '') -> dict:
        """Import detailed data to query the Dashboard, using the dashboard json file exported from grafana for the Application log.
        
        Args:
            dashboard_name (str): The dashboard name, unique name in the directory.
            database (str): The database name.
            table (str): The table name.
            dashboard (dict): The complete dashboard model. For more information, you can see https://grafana.com/docs/grafana/latest/dashboards/manage-dashboards/#export-a-dashboard.
            overwrite (bool): Set to true if you want to overwrite existing dashboard with newer version, same dashboard title in folder or same dashboard uid.

        Returns:
            dict: _description_
        """
        athena_connection = self.update_athena_connection_uid(athena_connection=athena_connection)
        
        dashboard = self.replace_athena_connection_args_in_panels(datasource_uid=athena_connection.uid,
                                                                  catalog=athena_connection.catalog,
                                                                  database=athena_connection.database,
                                                                  region=athena_connection.region,
                                                                  table=table,
                                                                  dashboard=dashboard)
        dashboard = self.replace_athena_connection_args_in_templates(datasource_uid=athena_connection.uid,
                                                                     catalog=athena_connection.catalog,
                                                                     database=athena_connection.database,
                                                                     region=athena_connection.region,
                                                                     table=table,
                                                                     dashboard=dashboard)

        return self.import_dashboard(dashboard=dashboard, overwrite=overwrite, folder_title=folder_title)


class GrafanaApi:
    
    def __init__(self, url: str, token: str, verify=False, timeout=5.0):
        self.url = f'{url}/api'
        self.verify = verify
        self.timeout = timeout
        self.token = token
        
        self.api = requests.Session()
        self.api.headers.update({"Content-Type": "application/json", "Accept": "application/json", "Authorization": f"Bearer {token}"})
    
    def get(self, path: str):
        return self._request(path=path, method='GET')
    
    def post(self, path: str, json: Union[str, None] = None):
        return self._request(path=path, method='POST', json=json)
    
    def put(self, path: str, json: Union[str, None] = None):
        return self._request(path=path, method='PUT', json=json)
    
    def delete(self, path: str):
        return self._request(path=path, method='DELETE')
    
    def _request(self, path: str, method, json: Union[str, None] = None) -> dict:
        url = f'{self.url}{path}'
        response = self.api.request(method=method, url=url, json=json, verify=self.verify, timeout=self.timeout)
        r = {'status': response.status_code}
        
        if not response.text:
            return r

        try:
            r['content'] = response.json()
        except requests.exceptions.JSONDecodeError:
            logger.error(f'Grafana request failed, the response is {response.text}, not a json object.')
            r['status'] = 400
        except Exception as e:
            logger.error((f'Grafana request failed, the response is {response.text}, error message is {e}.'))
            r['status'] = 400
        
        return r

