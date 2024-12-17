# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import os
import sys
import json
import pytest
from pytest_httpserver import HTTPServer


sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


class TestAthenaConnection:

    def test_init(
        self,
    ):
        from utils.grafana import AthenaConnection

        athena_connection = AthenaConnection(
            database="centralized",
            account_id="123456789012",
            region="us-east-1",
            work_group="Primary",
            assume_role_arn="arn:aws:iam::123456789012:role/AthenaPublicAccessRole",
            output_location="s3://stagingbucket/athena-results/",
        )

        assert athena_connection.uid == ""
        assert athena_connection.name == "Athena-clo-123456789012-us-east-1"
        assert athena_connection.account_id == "123456789012"
        assert athena_connection.region == "us-east-1"
        assert athena_connection.database == "centralized"
        assert athena_connection.work_group == "Primary"
        assert athena_connection.output_location == "s3://stagingbucket/athena-results/"
        assert (
            athena_connection.assume_role_arn
            == "arn:aws:iam::123456789012:role/AthenaPublicAccessRole"
        )
        assert athena_connection.catalog == "AwsDataCatalog"
        assert athena_connection.table == ""
        assert athena_connection.reuse is True
        assert athena_connection.reuse_age == 5

        athena_connection = AthenaConnection(
            database="centralized",
            account_id="123456789012",
            region="us-east-1",
            work_group="Primary",
            assume_role_arn="arn:aws:iam::123456789012:role/AthenaPublicAccessRole",
            output_location="s3://stagingbucket/athena-results/",
            catalog="DataCatalog",
            uid="1234567890",
            name="test_connection",
            table="test",
            reuse=False,
            reuse_age=10,
        )
        assert athena_connection.uid == "1234567890"
        assert athena_connection.name == "test_connection"
        assert athena_connection.account_id == "123456789012"
        assert athena_connection.region == "us-east-1"
        assert athena_connection.database == "centralized"
        assert athena_connection.work_group == "Primary"
        assert athena_connection.output_location == "s3://stagingbucket/athena-results/"
        assert (
            athena_connection.assume_role_arn
            == "arn:aws:iam::123456789012:role/AthenaPublicAccessRole"
        )
        assert athena_connection.catalog == "DataCatalog"
        assert athena_connection.table == "test"
        assert athena_connection.reuse is False
        assert athena_connection.reuse_age == 10


class TestGrafanaClient:

    def init_default_parameters(self, httpserver: HTTPServer):
        from utils.grafana import AthenaConnection, GrafanaClient

        self.grafana_url = httpserver.url_for("")
        self.grafana_token = "glsa_123456789012"
        self.athena_connection = AthenaConnection(
            database="centralized",
            account_id="123456789012",
            region="us-east-1",
            work_group="Primary",
            assume_role_arn="arn:aws:iam::123456789012:role/AthenaPublicAccessRole",
            output_location="s3://stagingbucket/athena-results/",
        )

        httpserver.expect_request(uri="/", method="GET").respond_with_data(status=200)
        httpserver.expect_request(
            uri="/api/plugins/grafana-athena-datasource/settings", method="GET"
        ).respond_with_data(
            response_data=json.dumps(
                {
                    "name": "Amazon Athena",
                    "type": "datasource",
                    "id": "grafana-athena-datasource",
                    "enabled": False,
                    "pinned": False,
                }
            )
        )
        httpserver.expect_request(
            uri="/api/datasources/name/Athena-clo-123456789012-us-east-1", method="GET"
        ).respond_with_data(
            response_data=json.dumps(
                {
                    "id": 96,
                    "name": "Athena-clo-123456789012-us-east-1",
                    "uid": "g5Aeh9_Vk",
                    "type": "grafana-athena-datasource",
                }
            )
        )
        httpserver.expect_request(
            uri="/api/datasources/uid/g5Aeh9_Vk", method="PUT"
        ).respond_with_data(
            response_data=json.dumps(
                {
                    "datasource": {
                        "id": 96,
                        "uid": "g5Aeh9_Vk",
                        "name": "Athena-clo-123456789012-us-east-1",
                        "type": "grafana-athena-datasource",
                    },
                    "id": 96,
                    "message": "Datasource updated",
                    "name": "Athena-clo-123456789012-us-east-1",
                }
            )
        )
        httpserver.expect_request(
            uri="/api/datasources/name/Athena-clo-123456789012-us-east-1-test",
            method="GET",
        ).respond_with_data(
            response_data=json.dumps({"message": "Data source not found"}), status=404
        )
        httpserver.expect_request(
            uri="/api/user/preferences", method="GET"
        ).respond_with_data(response_data=json.dumps({}))
        httpserver.expect_request(
            uri="/api/datasources/name/TestCreateAthenaDatasource", method="GET"
        ).respond_with_data(
            response_data=json.dumps({"message": "Data source not found"}), status=404
        )
        httpserver.expect_request(
            uri="/api/datasources", method="POST"
        ).respond_with_data(
            response_data=json.dumps(
                {
                    "datasource": {
                        "id": 98,
                        "uid": "BasXA4g_ar",
                        "name": "Athena",
                        "type": "grafana-athena-datasource",
                    },
                    "id": 98,
                    "message": "Datasource added",
                    "name": "TestCreateAthenaDatasource",
                }
            )
        )
        httpserver.expect_request(
            uri="/api/datasources/uid/BasXA4g_ar", method="DELETE"
        ).respond_with_data(status=200)
        httpserver.expect_request(uri="/api/folders", method="GET").respond_with_data(
            response_data=json.dumps([])
        )
        httpserver.expect_request(uri="/api/folders", method="POST").respond_with_data(
            response_data=json.dumps(
                {
                    "id": 19,
                    "uid": "zypaSkX4k",
                    "title": "clo",
                    "url": "/dashboards/f/zypaSkX4k/clo",
                    "hasAcl": False,
                    "canSave": True,
                    "canEdit": True,
                    "canAdmin": True,
                    "canDelete": True,
                    "createdBy": "Anonymous",
                    "updatedBy": "Anonymous",
                    "version": 1,
                }
            )
        )
        httpserver.expect_request(
            uri="/api/folders/zypaSkX4k", method="DELETE"
        ).respond_with_data(status=200)
        httpserver.expect_request(
            uri="/api/dashboards/db", method="POST"
        ).respond_with_data(
            response_data=json.dumps(
                {
                    "id": 17,
                    "slug": "TestDashboardsPermission",
                    "status": "success",
                    "uid": "0HklGl_Vz",
                    "url": "/d/0HklGl_Vz/TestDashboardsPermission",
                    "version": 58,
                }
            )
        )
        httpserver.expect_request(
            uri="/api/dashboards/uid/0HklGl_Vz", method="DELETE"
        ).respond_with_data(
            response_data=json.dumps(
                {
                    "id": 17,
                    "message": "Dashboard Production Overview deleted",
                    "title": "Production Overview",
                }
            )
        )

        self.grafana_client = GrafanaClient(
            url=self.grafana_url, token=self.grafana_token, verify=False
        )

    def test_dashboard(self, httpserver: HTTPServer):
        from utils.grafana import Dashboard

        self.init_default_parameters(httpserver=httpserver)

        assert isinstance(self.grafana_client.dashboard, Dashboard) is True

    def test_datasource(self, httpserver: HTTPServer):
        from utils.grafana import DataSource

        self.init_default_parameters(httpserver=httpserver)

        assert isinstance(self.grafana_client.datasource, DataSource) is True

    def test_folder(self, httpserver: HTTPServer):
        from utils.grafana import Folder

        self.init_default_parameters(httpserver=httpserver)

        assert isinstance(self.grafana_client.folder, Folder) is True

    def test_plugin(self, httpserver: HTTPServer):
        from utils.grafana import Plugin

        self.init_default_parameters(httpserver=httpserver)

        assert isinstance(self.grafana_client.plugin, Plugin) is True

    def test_user(self, httpserver: HTTPServer):
        from utils.grafana import User

        self.init_default_parameters(httpserver=httpserver)

        assert isinstance(self.grafana_client.user, User) is True

    def test_check_url_connectivity(self, httpserver: HTTPServer):
        from utils.grafana import AthenaConnection, GrafanaClient

        self.init_default_parameters(httpserver=httpserver)

        assert self.grafana_client.check_url_connectivity() is True

        assert self.grafana_client.check_url_connectivity(timeout=3) is True

        self.grafana_client.url = "http://localhost"
        assert self.grafana_client.check_url_connectivity() is False

        self.grafana_client.url = "http://localhost"
        assert self.grafana_client.check_url_connectivity(timeout=3) is False

    def test_check_token_validity(self, httpserver: HTTPServer):
        self.init_default_parameters(httpserver=httpserver)
        httpserver.clear()

        httpserver.expect_oneshot_request(
            uri="/api/user/preferences", method="GET"
        ).respond_with_data(status=200)
        assert self.grafana_client.check_token_validity() is True

        httpserver.expect_oneshot_request(
            uri="/api/user/preferences", method="GET"
        ).respond_with_data(status=401)
        assert self.grafana_client.check_token_validity() is False

    def test_has_installed_athena_plugin(self, httpserver: HTTPServer):
        self.init_default_parameters(httpserver=httpserver)

        httpserver.clear()
        httpserver.expect_request(
            uri="/api/plugins/grafana-athena-datasource/settings", method="GET"
        ).respond_with_data(
            response_data=json.dumps(
                {
                    "name": "Amazon Athena",
                    "type": "datasource",
                    "id": "grafana-athena-datasource",
                    "enabled": False,
                    "pinned": False,
                }
            )
        )
        assert self.grafana_client.has_installed_athena_plugin() is True

        httpserver.clear()
        httpserver.expect_request(
            uri="/api/plugins/grafana-athena-datasource/settings", method="GET"
        ).respond_with_data(
            response_data=json.dumps(
                {"message": "Plugin not found, no installed plugin with that id"}
            ),
            status=404,
        )

        assert self.grafana_client.has_installed_athena_plugin() is False

    def test_check_data_source_permission(self, httpserver: HTTPServer):
        self.init_default_parameters(httpserver=httpserver)

        httpserver.clear()
        httpserver.expect_oneshot_request(
            uri="/api/datasources/name/TestCreateAthenaDatasource", method="GET"
        ).respond_with_data(
            response_data=json.dumps({"message": "Data source not found"}), status=404
        )
        httpserver.expect_oneshot_request(
            uri="/api/datasources", method="POST"
        ).respond_with_data(
            response_data=json.dumps(
                {
                    "datasource": {
                        "id": 98,
                        "uid": "BasXA4g_ar",
                        "name": "Athena",
                        "type": "grafana-athena-datasource",
                    },
                    "id": 98,
                    "message": "Datasource added",
                    "name": "TestCreateAthenaDatasource",
                }
            )
        )
        httpserver.expect_oneshot_request(
            uri="/api/datasources/uid/BasXA4g_ar", method="DELETE"
        ).respond_with_data(status=200)

        response = self.grafana_client.check_data_source_permission()
        assert response is True

        httpserver.expect_request(
            uri="/api/datasources/name/TestCreateAthenaDatasource", method="GET"
        ).respond_with_data(
            response_data=json.dumps({"message": "Data source not found"}), status=404
        )
        httpserver.expect_request(
            uri="/api/datasources", method="POST"
        ).respond_with_data(status=403)

        response = self.grafana_client.check_data_source_permission()
        assert response is False

    def test_check_folder_permission(self, httpserver: HTTPServer):
        self.init_default_parameters(httpserver=httpserver)

        httpserver.clear()
        httpserver.expect_oneshot_request(
            uri="/api/folders", method="GET"
        ).respond_with_data(response_data=json.dumps([]))
        httpserver.expect_oneshot_request(
            uri="/api/folders", method="POST"
        ).respond_with_data(
            response_data=json.dumps(
                {
                    "id": 19,
                    "uid": "test-folder-permission",
                    "title": "clo",
                    "url": "/dashboards/f/zypaSkX4k/clo",
                    "hasAcl": False,
                    "canSave": True,
                    "canEdit": True,
                    "canAdmin": True,
                    "canDelete": True,
                    "createdBy": "Anonymous",
                    "updatedBy": "Anonymous",
                    "version": 1,
                }
            )
        )
        httpserver.expect_oneshot_request(
            uri="/api/folders/test-folder-permission", method="GET"
        ).respond_with_data(
            response_data=json.dumps(
                {
                    "id": 19,
                    "uid": "test-folder-permission",
                    "title": "clo",
                    "url": "/dashboards/f/test-folder-permission/clo",
                    "hasAcl": False,
                    "canSave": True,
                    "canEdit": True,
                    "canAdmin": True,
                    "canDelete": True,
                    "createdBy": "Anonymous",
                    "updatedBy": "Anonymous",
                    "version": 1,
                }
            )
        )
        httpserver.expect_oneshot_request(
            uri="/api/folders/test-folder-permission", method="DELETE"
        ).respond_with_data(status=200)

        assert self.grafana_client.check_folder_permission() is True

        httpserver.expect_oneshot_request(
            uri="/api/folders", method="GET"
        ).respond_with_data(status=401)
        httpserver.expect_oneshot_request(
            uri="/api/folders", method="POST"
        ).respond_with_data(status=401)

        assert self.grafana_client.check_folder_permission() is False

    def test_check_dashboards_permission(self, httpserver: HTTPServer):
        self.init_default_parameters(httpserver=httpserver)

        httpserver.clear()
        httpserver.expect_oneshot_request(
            uri="/api/dashboards/db", method="POST"
        ).respond_with_data(
            response_data=json.dumps(
                {
                    "id": 17,
                    "slug": "TestDashboardsPermission",
                    "status": "success",
                    "uid": "0HklGl_Vz",
                    "url": "/d/0HklGl_Vz/TestDashboardsPermission",
                    "version": 58,
                }
            )
        )
        httpserver.expect_oneshot_request(
            uri="/api/dashboards/uid/0HklGl_Vz", method="DELETE"
        ).respond_with_data(
            response_data=json.dumps(
                {
                    "id": 17,
                    "message": "Dashboard Production Overview deleted",
                    "title": "Production Overview",
                }
            )
        )
        assert self.grafana_client.check_dashboards_permission() is True

        httpserver.expect_oneshot_request(
            uri="/api/dashboards/db", method="POST"
        ).respond_with_data(status=401)
        assert self.grafana_client.check_dashboards_permission() is False

    def test_check_permission(self, httpserver: HTTPServer):
        self.init_default_parameters(httpserver=httpserver)

        httpserver.clear()
        self.grafana_client.url = "http://localhost"
        with pytest.raises(Exception) as exception_info:
            self.grafana_client.check_permission()
        assert (
            exception_info.value.args[0]
            == "Failed to check url connectivity, grafana address: http://localhost cannot be accessed."
        )
        self.grafana_client.url = httpserver.url_for("")

        httpserver.expect_oneshot_request(
            uri="/api/user/preferences", method="GET"
        ).respond_with_data(status=401)
        with pytest.raises(Exception) as exception_info:
            self.grafana_client.check_permission()
        assert (
            exception_info.value.args[0]
            == f"Invalid service account token: {self.grafana_token}"
        )
        httpserver.expect_request(
            uri="/api/user/preferences", method="GET"
        ).respond_with_data(response_data=json.dumps({}))

        httpserver.expect_oneshot_request(
            uri="/api/plugins/grafana-athena-datasource/settings", method="GET"
        ).respond_with_data(
            response_data=json.dumps(
                {"message": "Plugin not found, no installed plugin with that id"}
            ),
            status=404,
        )
        with pytest.raises(Exception) as exception_info:
            self.grafana_client.check_permission()
        assert exception_info.value.args[0] == "No Athena plugin installed."
        httpserver.expect_request(
            uri="/api/plugins/grafana-athena-datasource/settings", method="GET"
        ).respond_with_data(
            response_data=json.dumps(
                {
                    "name": "Amazon Athena",
                    "type": "datasource",
                    "id": "grafana-athena-datasource",
                    "enabled": False,
                    "pinned": False,
                }
            )
        )

        httpserver.expect_oneshot_request(
            uri="/api/datasources/name/TestCreateAthenaDatasource", method="GET"
        ).respond_with_data(
            response_data=json.dumps({"message": "Data source not found"}), status=404
        )
        httpserver.expect_oneshot_request(
            uri="/api/datasources", method="POST"
        ).respond_with_data(status=403)
        with pytest.raises(Exception) as exception_info:
            self.grafana_client.check_permission()
        assert (
            exception_info.value.args[0] == "Missing data source creation permission."
        )
        httpserver.expect_request(
            uri="/api/datasources/name/TestCreateAthenaDatasource", method="GET"
        ).respond_with_data(
            response_data=json.dumps({"message": "Data source not found"}), status=404
        )
        httpserver.expect_request(
            uri="/api/datasources", method="POST"
        ).respond_with_data(
            response_data=json.dumps(
                {
                    "datasource": {
                        "id": 98,
                        "uid": "BasXA4g_ar",
                        "name": "Athena",
                        "type": "grafana-athena-datasource",
                    },
                    "id": 98,
                    "message": "Datasource added",
                    "name": "TestCreateAthenaDatasource",
                }
            )
        )
        httpserver.expect_request(
            uri="/api/datasources/uid/BasXA4g_ar", method="DELETE"
        ).respond_with_data(status=200)

        httpserver.expect_oneshot_request(
            uri="/api/folders", method="GET"
        ).respond_with_data(status=401)
        httpserver.expect_oneshot_request(
            uri="/api/folders", method="POST"
        ).respond_with_data(status=401)
        with pytest.raises(Exception) as exception_info:
            self.grafana_client.check_permission()
        assert exception_info.value.args[0] == "Missing folder creation permission."
        httpserver.expect_request(uri="/api/folders", method="GET").respond_with_data(
            response_data=json.dumps([])
        )
        httpserver.expect_request(uri="/api/folders", method="POST").respond_with_data(
            response_data=json.dumps(
                {
                    "id": 19,
                    "uid": "zypaSkX4k",
                    "title": "clo",
                    "url": "/dashboards/f/zypaSkX4k/clo",
                    "hasAcl": False,
                    "canSave": True,
                    "canEdit": True,
                    "canAdmin": True,
                    "canDelete": True,
                    "createdBy": "Anonymous",
                    "updatedBy": "Anonymous",
                    "version": 1,
                }
            )
        )
        httpserver.expect_request(
            uri="/api/folders/zypaSkX4k", method="DELETE"
        ).respond_with_data(status=200)

        httpserver.expect_oneshot_request(
            uri="/api/folders/test-folder-permission", method="GET"
        ).respond_with_data(
            response_data=json.dumps(
                {
                    "id": 19,
                    "uid": "test-folder-permission",
                    "title": "clo",
                    "url": "/dashboards/f/test-folder-permission/clo",
                    "hasAcl": False,
                    "canSave": True,
                    "canEdit": True,
                    "canAdmin": True,
                    "canDelete": True,
                    "createdBy": "Anonymous",
                    "updatedBy": "Anonymous",
                    "version": 1,
                }
            )
        )
        httpserver.expect_oneshot_request(
            uri="/api/folders/test-folder-permission", method="DELETE"
        ).respond_with_data(status=200)
        httpserver.expect_oneshot_request(
            uri="/api/dashboards/db", method="POST"
        ).respond_with_data(status=401)
        with pytest.raises(Exception) as exception_info:
            self.grafana_client.check_permission()
        assert exception_info.value.args[0] == "Missing update dashboards permission."
        httpserver.expect_request(
            uri="/api/dashboards/db", method="POST"
        ).respond_with_data(
            response_data=json.dumps(
                {
                    "id": 17,
                    "slug": "TestDashboardsPermission",
                    "status": "success",
                    "uid": "0HklGl_Vz",
                    "url": "/d/0HklGl_Vz/TestDashboardsPermission",
                    "version": 58,
                }
            )
        )
        httpserver.expect_request(
            uri="/api/dashboards/uid/0HklGl_Vz", method="DELETE"
        ).respond_with_data(
            response_data=json.dumps(
                {
                    "id": 17,
                    "message": "Dashboard Production Overview deleted",
                    "title": "Production Overview",
                }
            )
        )

    def test_get_folder_by_title(self, httpserver: HTTPServer):
        self.init_default_parameters(httpserver=httpserver)

        httpserver.expect_oneshot_request(
            uri="/api/folders", method="GET"
        ).respond_with_data(response_data=json.dumps([]))

        response = self.grafana_client.get_folder_by_title(title="clo")
        assert response == {"status": 404, "content": {"message": "Folder not found."}}

        httpserver.expect_oneshot_request(
            uri="/api/folders", method="GET"
        ).respond_with_data(
            response_data=json.dumps(
                [
                    {"id": 1, "uid": "q_XODzX4z", "title": "General"},
                    {"id": 19, "uid": "zypaSkX4k", "title": "clo"},
                ]
            )
        )

        response = self.grafana_client.get_folder_by_title(title="test")
        assert response == {"status": 404, "content": {"message": "Folder not found."}}

        httpserver.expect_oneshot_request(
            uri="/api/folders", method="GET"
        ).respond_with_data(
            response_data=json.dumps(
                [
                    {"id": 1, "uid": "q_XODzX4z", "title": "General"},
                    {"id": 19, "uid": "zypaSkX4k", "title": "clo"},
                ]
            )
        )

        response = self.grafana_client.get_folder_by_title(title="clo")
        assert response == {
            "status": 200,
            "content": {"id": 19, "uid": "zypaSkX4k", "title": "clo"},
        }

    def test_create_folder(self, httpserver: HTTPServer):
        self.init_default_parameters(httpserver=httpserver)

        httpserver.expect_oneshot_request(
            uri="/api/folders", method="GET"
        ).respond_with_data(response_data=json.dumps([]))
        httpserver.expect_oneshot_request(
            uri="/api/folders", method="POST"
        ).respond_with_data(
            response_data=json.dumps(
                {
                    "id": 19,
                    "uid": "zypaSkX4k",
                    "title": "clo",
                    "url": "/dashboards/f/zypaSkX4k/clo",
                    "hasAcl": False,
                    "canSave": True,
                    "canEdit": True,
                    "canAdmin": True,
                    "canDelete": True,
                    "createdBy": "Anonymous",
                    "updatedBy": "Anonymous",
                    "version": 1,
                }
            )
        )

        response = self.grafana_client.create_folder(title="clo")
        assert response == {
            "status": 200,
            "content": {
                "id": 19,
                "uid": "zypaSkX4k",
                "title": "clo",
                "url": "/dashboards/f/zypaSkX4k/clo",
                "hasAcl": False,
                "canSave": True,
                "canEdit": True,
                "canAdmin": True,
                "canDelete": True,
                "createdBy": "Anonymous",
                "updatedBy": "Anonymous",
                "version": 1,
            },
        }

        httpserver.expect_oneshot_request(
            uri="/api/folders", method="GET"
        ).respond_with_data(
            response_data=json.dumps(
                [
                    {"id": 1, "uid": "q_XODzX4z", "title": "General"},
                    {"id": 19, "uid": "zypaSkX4k", "title": "clo"},
                ]
            )
        )
        httpserver.expect_request(
            uri="/api/folders/zypaSkX4k", method="GET"
        ).respond_with_data(
            response_data=json.dumps(
                {
                    "id": 19,
                    "uid": "zypaSkX4k",
                    "title": "clo",
                    "url": "/dashboards/f/zypaSkX4k/clo",
                    "hasAcl": False,
                    "canSave": True,
                    "canEdit": True,
                    "canAdmin": True,
                    "canDelete": True,
                    "version": 1,
                }
            )
        )

        response = self.grafana_client.create_folder(title="clo")
        assert response == {
            "status": 200,
            "content": {
                "id": 19,
                "uid": "zypaSkX4k",
                "title": "clo",
                "url": "/dashboards/f/zypaSkX4k/clo",
                "hasAcl": False,
                "canSave": True,
                "canEdit": True,
                "canAdmin": True,
                "canDelete": True,
                "version": 1,
            },
        }

    def test_update_datasource_by_name(self, httpserver: HTTPServer):
        self.init_default_parameters(httpserver=httpserver)

        datasource = {
            "type": "grafana-athena-datasource",
            "access": "proxy",
            "isDefault": False,
            "jsonData": {
                "authType": "default",
                "catalog": "AwsDataCatalog",
                "database": "centralized",
                "defaultRegion": "us-east-1",
                "workgroup": "Primary",
                "assumeRoleArn": "arn:aws:iam::123456789012:role/AthenaPublicAccessRole",
                "outputLocation": "s3://stagingbucket/athena-results/",
            },
        }

        response = self.grafana_client.update_datasource_by_name(
            datasource_name="Athena-clo-123456789012-us-east-1", datasource=datasource
        )
        assert response["status"] == 200
        assert response["content"]["message"] == "Datasource updated"

        httpserver.expect_request(
            uri="/api/datasources", method="POST"
        ).respond_with_data(
            response_data=json.dumps(
                {
                    "datasource": {
                        "id": 97,
                        "uid": "AxpRJ3l_4k",
                        "name": "Athena-clo-123456789012-us-east-1-test",
                        "type": "grafana-athena-datasource",
                    },
                    "id": 97,
                    "message": "Datasource added",
                    "name": "Athena-clo-123456789012-us-east-1-test",
                }
            )
        )

        response = self.grafana_client.update_datasource_by_name(
            datasource_name="Athena-clo-123456789012-us-east-1-test",
            datasource=datasource,
        )
        assert response["status"] == 200
        assert response["content"]["message"] == "Datasource added"

        httpserver.clear()
        httpserver.expect_request(
            uri="/api/datasources/name/Athena-clo-123456789012-us-east-1-test",
            method="GET",
        ).respond_with_data(
            response_data=json.dumps({"message": "Data source not found"}), status=404
        )
        httpserver.expect_request(
            uri="/api/datasources", method="POST"
        ).respond_with_data(status=400)

        response = self.grafana_client.update_datasource_by_name(
            datasource_name="Athena-clo-123456789012-us-east-1-test",
            datasource=datasource,
        )
        assert response["status"] == 400

    def test_update_athena_connection_uid(self, httpserver: HTTPServer):
        self.init_default_parameters(httpserver=httpserver)

        athena_connection = self.grafana_client.update_athena_connection_uid(
            athena_connection=self.athena_connection
        )

        assert athena_connection.uid == "g5Aeh9_Vk"
        assert athena_connection.account_id == "123456789012"
        assert athena_connection.name == "Athena-clo-123456789012-us-east-1"
        assert athena_connection.region == "us-east-1"
        assert athena_connection.database == "centralized"
        assert athena_connection.work_group == "Primary"
        assert athena_connection.output_location == "s3://stagingbucket/athena-results/"
        assert (
            athena_connection.assume_role_arn
            == "arn:aws:iam::123456789012:role/AthenaPublicAccessRole"
        )
        assert athena_connection.catalog == "AwsDataCatalog"

    def test_create_athena_datasource(self, httpserver: HTTPServer):
        from utils.grafana import AthenaConnection

        self.init_default_parameters(httpserver=httpserver)

        httpserver.expect_oneshot_request(
            uri="/api/datasources/name/Athena", method="GET"
        ).respond_with_data(
            response_data=json.dumps({"message": "Data source not found"}), status=404
        )
        httpserver.expect_oneshot_request(
            uri="/api/datasources", method="POST"
        ).respond_with_data(
            response_data=json.dumps(
                {
                    "datasource": {
                        "id": 98,
                        "uid": "BasXA4g_ar",
                        "name": "Athena",
                        "type": "grafana-athena-datasource",
                    },
                    "id": 98,
                    "message": "Datasource added",
                    "name": "Athena",
                }
            )
        )

        athena_connection = AthenaConnection(
            name="Athena",
            database="centralized",
            account_id="123456789012",
            region="us-east-1",
            work_group="Primary",
            assume_role_arn="arn:aws:iam::123456789012:role/AthenaPublicAccessRole",
            output_location="s3://stagingbucket/athena-results/",
        )
        response = self.grafana_client.create_athena_datasource(
            athena_connection=athena_connection
        )
        assert response["status"] == 200
        assert response["content"]["uid"] == "BasXA4g_ar"
        assert response["content"]["message"] == "Datasource added"

        httpserver.expect_oneshot_request(
            uri="/api/datasources", method="POST"
        ).respond_with_data(
            response_data=json.dumps(
                {
                    "datasource": {
                        "id": 96,
                        "uid": "g5Aeh9_Vk",
                        "name": "Athena-clo-123456789012-us-east-1",
                        "type": "grafana-athena-datasource",
                    },
                    "id": 96,
                    "message": "Datasource updated",
                    "name": "Athena-clo-123456789012-us-east-1",
                }
            )
        )

        athena_connection = AthenaConnection(
            name="Athena",
            database="centralized",
            account_id="123456789012",
            region="us-east-1",
            work_group="Primary",
            assume_role_arn="arn:aws:iam::123456789012:role/AthenaPublicAccessRole",
            output_location="s3://stagingbucket/athena-results/",
        )
        response = self.grafana_client.create_athena_datasource(
            athena_connection=athena_connection
        )
        assert response["status"] == 200
        assert response["content"]["uid"] == "g5Aeh9_Vk"
        assert response["content"]["message"] == "Datasource updated"

    def test_replace_athena_connection_args_in_templates(self, httpserver: HTTPServer):
        from utils.grafana import AthenaConnection

        self.init_default_parameters(httpserver=httpserver)

        dashboard = {"templating": {}}
        athena_connection_args = dict(
            Details=AthenaConnection(
                uid="test",
                catalog="AwsDataCatalog",
                database="test_database",
                account_id="123456789012",
                region="us-east-1",
                table="test_table",
                work_group="Primary",
                assume_role_arn="arn:aws:iam::123456789012:role/AthenaPublicAccessRole",
                output_location="s3://stagingbucket/athena-results/",
                reuse=True,
                reuse_age=30,
            )
        )
        new_dashboard = self.grafana_client.replace_athena_connection_args_in_templates(
            dashboard=dashboard, athena_connection_args=athena_connection_args
        )
        assert new_dashboard == {"templating": {}}

        dashboard = {}
        athena_connection_args = dict(
            Details=AthenaConnection(
                uid="test",
                catalog="AwsDataCatalog",
                database="test_database",
                account_id="123456789012",
                region="us-east-1",
                table="test_table",
                work_group="Primary",
                assume_role_arn="arn:aws:iam::123456789012:role/AthenaPublicAccessRole",
                output_location="s3://stagingbucket/athena-results/",
                reuse=True,
                reuse_age=30,
            )
        )
        new_dashboard = self.grafana_client.replace_athena_connection_args_in_templates(
            dashboard=dashboard, athena_connection_args=athena_connection_args
        )
        assert new_dashboard == {}

        dashboard = {
            "templating": {
                "list": [
                    {
                        "allValue": "SQL Statement",
                        "current": {},
                        "datasource": {
                            "type": "grafana-athena-datasource",
                            "uid": "DS_AMAZON_ATHENA",
                        },
                        "query": {
                            "connectionArgs": {
                                "catalog": "AwsDataCatalog",
                                "database": "amazon_cl_centralized",
                                "region": "__default",
                                "resultReuseEnabled": True,
                                "resultReuseMaxAgeInMinutes": 5,
                            },
                            "format": 1,
                            "rawSQL": "SQL Statement",
                            "refId": "Metrics",
                            "table": "waf_metrics",
                        },
                    },
                    {
                        "allValue": "SQL Statement",
                        "current": {},
                        "datasource": {
                            "type": "grafana-athena-datasource",
                            "uid": "DS_AMAZON_ATHENA",
                        },
                        "query": {
                            "connectionArgs": {
                                "catalog": "AwsDataCatalog",
                                "database": "amazon_cl_centralized",
                                "region": "__default",
                                "resultReuseEnabled": True,
                                "resultReuseMaxAgeInMinutes": 5,
                            },
                            "format": 1,
                            "rawSQL": "SQL Statement",
                            "refId": "A",
                            "table": "waf_metrics",
                        },
                    },
                    {
                        "allValue": "SQL Statement",
                        "current": {},
                        "datasource": {
                            "type": "grafana-athena-datasource",
                            "uid": "DS_AMAZON_ATHENA",
                        },
                        "query": {
                            "connectionArgs": {
                                "catalog": "AwsDataCatalog",
                                "database": "amazon_cl_centralized",
                                "region": "__default",
                                "resultReuseEnabled": True,
                                "resultReuseMaxAgeInMinutes": 5,
                            },
                            "format": 1,
                            "rawSQL": "SQL Statement",
                            "table": "waf_metrics",
                        },
                    },
                    {
                        "allValue": "SQL Statement",
                        "datasource": {
                            "type": "grafana-bigquery-datasource",
                            "uid": "DS_GOOGLE_BIGQUERY",
                        },
                        "query": {
                            "connectionArgs": {
                                "database": "centralized",
                                "region": "US",
                            },
                            "format": 1,
                            "rawSQL": "SQL Statement",
                            "table": "bigquery",
                        },
                    },
                ]
            }
        }
        athena_connection_args = dict(
            Metrics=AthenaConnection(
                uid="test",
                catalog="AwsDataCatalog",
                database="test_database",
                account_id="123456789012",
                region="us-east-1",
                table="test_table",
                work_group="Primary",
                assume_role_arn="arn:aws:iam::123456789012:role/AthenaPublicAccessRole",
                output_location="s3://stagingbucket/athena-results/",
                reuse=True,
                reuse_age=30,
            )
        )
        new_dashboard = self.grafana_client.replace_athena_connection_args_in_templates(
            dashboard=dashboard, athena_connection_args=athena_connection_args
        )

        assert new_dashboard["templating"]["list"][0] == {
            "allValue": "SQL Statement",
            "current": {},
            "datasource": {"type": "grafana-athena-datasource", "uid": "test"},
            "query": {
                "connectionArgs": {
                    "catalog": "AwsDataCatalog",
                    "database": "test_database",
                    "region": "us-east-1",
                    "resultReuseEnabled": True,
                    "resultReuseMaxAgeInMinutes": 30,
                },
                "format": 1,
                "rawSQL": "SQL Statement",
                "refId": "Metrics",
                "table": "test_table",
            },
        }
        assert new_dashboard["templating"]["list"][1] == {
            "allValue": "SQL Statement",
            "current": {},
            "datasource": {
                "type": "grafana-athena-datasource",
                "uid": "DS_AMAZON_ATHENA",
            },
            "query": {
                "connectionArgs": {
                    "catalog": "AwsDataCatalog",
                    "database": "amazon_cl_centralized",
                    "region": "__default",
                    "resultReuseEnabled": True,
                    "resultReuseMaxAgeInMinutes": 5,
                },
                "format": 1,
                "rawSQL": "SQL Statement",
                "refId": "A",
                "table": "waf_metrics",
            },
        }
        assert new_dashboard["templating"]["list"][2] == {
            "allValue": "SQL Statement",
            "current": {},
            "datasource": {
                "type": "grafana-athena-datasource",
                "uid": "DS_AMAZON_ATHENA",
            },
            "query": {
                "connectionArgs": {
                    "catalog": "AwsDataCatalog",
                    "database": "amazon_cl_centralized",
                    "region": "__default",
                    "resultReuseEnabled": True,
                    "resultReuseMaxAgeInMinutes": 5,
                },
                "format": 1,
                "rawSQL": "SQL Statement",
                "table": "waf_metrics",
            },
        }
        assert new_dashboard["templating"]["list"][3] == {
            "allValue": "SQL Statement",
            "datasource": {
                "type": "grafana-bigquery-datasource",
                "uid": "DS_GOOGLE_BIGQUERY",
            },
            "query": {
                "connectionArgs": {
                    "database": "centralized",
                    "region": "US",
                },
                "format": 1,
                "rawSQL": "SQL Statement",
                "table": "bigquery",
            },
        }

        dashboard = {
            "templating": {
                "list": [
                    {
                        "allValue": "SQL Statement",
                        "current": {},
                        "datasource": {
                            "type": "grafana-athena-datasource",
                            "uid": "DS_AMAZON_ATHENA",
                        },
                        "query": {
                            "connectionArgs": {
                                "catalog": "AwsDataCatalog",
                                "database": "amazon_cl_centralized",
                                "region": "__default",
                                "resultReuseEnabled": False,
                                "resultReuseMaxAgeInMinutes": 10,
                            },
                            "format": 1,
                            "rawSQL": "SQL Statement",
                            "refId": "Metrics",
                            "table": "waf_metrics",
                        },
                    },
                    {
                        "allValue": "SQL Statement",
                        "current": {},
                        "datasource": {
                            "type": "grafana-athena-datasource",
                            "uid": "DS_AMAZON_ATHENA",
                        },
                        "query": {
                            "connectionArgs": {
                                "catalog": "AwsDataCatalog",
                                "database": "amazon_cl_centralized",
                                "region": "__default",
                                "resultReuseEnabled": False,
                                "resultReuseMaxAgeInMinutes": 10,
                            },
                            "format": 1,
                            "rawSQL": "SQL Statement",
                            "refId": "A",
                            "table": "waf_metrics",
                        },
                    },
                    {
                        "allValue": "SQL Statement",
                        "current": {},
                        "datasource": {
                            "type": "grafana-athena-datasource",
                            "uid": "DS_AMAZON_ATHENA",
                        },
                        "query": {
                            "connectionArgs": {
                                "catalog": "AwsDataCatalog",
                                "database": "amazon_cl_centralized",
                                "region": "__default",
                                "resultReuseEnabled": False,
                                "resultReuseMaxAgeInMinutes": 10,
                            },
                            "format": 1,
                            "rawSQL": "SQL Statement",
                            "table": "waf_metrics",
                        },
                    },
                    {
                        "allValue": "SQL Statement",
                        "datasource": {
                            "type": "grafana-bigquery-datasource",
                            "uid": "DS_GOOGLE_BIGQUERY",
                        },
                        "query": {
                            "connectionArgs": {
                                "database": "centralized",
                                "region": "US",
                            },
                            "format": 1,
                            "rawSQL": "SQL Statement",
                            "table": "bigquery",
                        },
                    },
                ]
            }
        }
        athena_connection_args = dict(
            Metrics=AthenaConnection(
                uid="test",
                catalog="AwsDataCatalog",
                database="test_database",
                account_id="123456789012",
                region="us-east-1",
                table="test_table",
                work_group="Primary",
                assume_role_arn="arn:aws:iam::123456789012:role/AthenaPublicAccessRole",
                output_location="s3://stagingbucket/athena-results/",
                reuse=True,
                reuse_age=30,
            )
        )
        new_dashboard = self.grafana_client.replace_athena_connection_args_in_templates(
            dashboard=dashboard, athena_connection_args=athena_connection_args
        )

        assert new_dashboard["templating"]["list"][0] == {
            "allValue": "SQL Statement",
            "current": {},
            "datasource": {"type": "grafana-athena-datasource", "uid": "test"},
            "query": {
                "connectionArgs": {
                    "catalog": "AwsDataCatalog",
                    "database": "test_database",
                    "region": "us-east-1",
                    "resultReuseEnabled": True,
                    "resultReuseMaxAgeInMinutes": 30,
                },
                "format": 1,
                "rawSQL": "SQL Statement",
                "refId": "Metrics",
                "table": "test_table",
            },
        }
        assert new_dashboard["templating"]["list"][1] == {
            "allValue": "SQL Statement",
            "current": {},
            "datasource": {
                "type": "grafana-athena-datasource",
                "uid": "DS_AMAZON_ATHENA",
            },
            "query": {
                "connectionArgs": {
                    "catalog": "AwsDataCatalog",
                    "database": "amazon_cl_centralized",
                    "region": "__default",
                    "resultReuseEnabled": False,
                    "resultReuseMaxAgeInMinutes": 10,
                },
                "format": 1,
                "rawSQL": "SQL Statement",
                "refId": "A",
                "table": "waf_metrics",
            },
        }
        assert new_dashboard["templating"]["list"][2] == {
            "allValue": "SQL Statement",
            "current": {},
            "datasource": {
                "type": "grafana-athena-datasource",
                "uid": "DS_AMAZON_ATHENA",
            },
            "query": {
                "connectionArgs": {
                    "catalog": "AwsDataCatalog",
                    "database": "amazon_cl_centralized",
                    "region": "__default",
                    "resultReuseEnabled": False,
                    "resultReuseMaxAgeInMinutes": 10,
                },
                "format": 1,
                "rawSQL": "SQL Statement",
                "table": "waf_metrics",
            },
        }
        assert new_dashboard["templating"]["list"][3] == {
            "allValue": "SQL Statement",
            "datasource": {
                "type": "grafana-bigquery-datasource",
                "uid": "DS_GOOGLE_BIGQUERY",
            },
            "query": {
                "connectionArgs": {
                    "database": "centralized",
                    "region": "US",
                },
                "format": 1,
                "rawSQL": "SQL Statement",
                "table": "bigquery",
            },
        }

        dashboard = {
            "templating": {
                "list": [
                    {
                        "allValue": "SQL Statement",
                        "current": {},
                        "datasource": {
                            "type": "grafana-athena-datasource",
                            "uid": "DS_AMAZON_ATHENA",
                        },
                        "query": {
                            "format": 1,
                            "rawSQL": "SQL Statement",
                            "refId": "Metrics",
                            "table": "waf_metrics",
                        },
                    },
                    {
                        "allValue": "SQL Statement",
                        "datasource": {
                            "type": "grafana-bigquery-datasource",
                            "uid": "DS_GOOGLE_BIGQUERY",
                        },
                        "query": {
                            "connectionArgs": {
                                "database": "centralized",
                                "region": "US",
                            },
                            "format": 1,
                            "rawSQL": "SQL Statement",
                            "table": "bigquery",
                        },
                    },
                ]
            }
        }
        athena_connection_args = dict(
            Metrics=AthenaConnection(
                uid="test",
                catalog="AwsDataCatalog",
                database="test_database",
                account_id="123456789012",
                region="us-east-1",
                table="test_table",
                work_group="Primary",
                assume_role_arn="arn:aws:iam::123456789012:role/AthenaPublicAccessRole",
                output_location="s3://stagingbucket/athena-results/",
                reuse=True,
                reuse_age=30,
            )
        )
        new_dashboard = self.grafana_client.replace_athena_connection_args_in_templates(
            dashboard=dashboard, athena_connection_args=athena_connection_args
        )
        assert new_dashboard["templating"]["list"][0] == {
            "allValue": "SQL Statement",
            "current": {},
            "datasource": {"type": "grafana-athena-datasource", "uid": "test"},
            "query": {
                "format": 1,
                "rawSQL": "SQL Statement",
                "refId": "Metrics",
                "table": "test_table",
            },
        }
        assert new_dashboard["templating"]["list"][1] == {
            "allValue": "SQL Statement",
            "datasource": {
                "type": "grafana-bigquery-datasource",
                "uid": "DS_GOOGLE_BIGQUERY",
            },
            "query": {
                "connectionArgs": {
                    "database": "centralized",
                    "region": "US",
                },
                "format": 1,
                "rawSQL": "SQL Statement",
                "table": "bigquery",
            },
        }

    def test_replace_athena_connection_args_in_panels(self, httpserver: HTTPServer):
        from utils.grafana import AthenaConnection

        self.init_default_parameters(httpserver=httpserver)

        dashboard = {}
        athena_connection_args = dict(
            Details=AthenaConnection(
                uid="test",
                catalog="AwsDataCatalog",
                database="test_database",
                account_id="123456789012",
                region="us-east-1",
                table="test_table",
                work_group="Primary",
                assume_role_arn="arn:aws:iam::123456789012:role/AthenaPublicAccessRole",
                output_location="s3://stagingbucket/athena-results/",
                reuse=True,
                reuse_age=30,
            )
        )

        new_dashboard = self.grafana_client.replace_athena_connection_args_in_panels(
            dashboard=dashboard, athena_connection_args=athena_connection_args
        )
        assert new_dashboard == {}

        dashboard = {"panels": []}
        athena_connection_args = dict(
            Details=AthenaConnection(
                uid="test",
                catalog="AwsDataCatalog",
                database="test_database",
                account_id="123456789012",
                region="us-east-1",
                table="test_table",
                work_group="Primary",
                assume_role_arn="arn:aws:iam::123456789012:role/AthenaPublicAccessRole",
                output_location="s3://stagingbucket/athena-results/",
                reuse=True,
                reuse_age=30,
            )
        )

        new_dashboard = self.grafana_client.replace_athena_connection_args_in_panels(
            dashboard=dashboard, athena_connection_args=athena_connection_args
        )
        assert new_dashboard == {"panels": []}

        dashboard = {
            "panels": [
                {
                    "datasource": {
                        "type": "grafana-athena-datasource",
                        "uid": "DS_AMAZON_ATHENA",
                    },
                    "targets": [
                        {
                            "connectionArgs": {
                                "catalog": "AwsDataCatalog",
                                "database": "amazon_cl_centralized",
                                "region": "__default",
                                "resultReuseEnabled": True,
                                "resultReuseMaxAgeInMinutes": 5,
                            },
                            "datasource": {
                                "type": "grafana-athena-datasource",
                                "uid": "DS_AMAZON_ATHENA",
                            },
                            "format": 1,
                            "rawSQL": "SQL Statement",
                            "refId": "Metrics",
                            "table": "waf_metrics",
                        },
                        {
                            "connectionArgs": {
                                "catalog": "AwsDataCatalog",
                                "database": "amazon_cl_centralized",
                                "region": "__default",
                                "resultReuseEnabled": True,
                                "resultReuseMaxAgeInMinutes": 5,
                            },
                            "datasource": {
                                "type": "grafana-athena-datasource",
                                "uid": "DS_AMAZON_ATHENA",
                            },
                            "format": 1,
                            "rawSQL": "SQL Statement",
                            "refId": "A",
                            "table": "waf_metrics",
                        },
                        {
                            "connectionArgs": {
                                "catalog": "AwsDataCatalog",
                                "database": "amazon_cl_centralized",
                                "region": "__default",
                                "resultReuseEnabled": True,
                                "resultReuseMaxAgeInMinutes": 5,
                            },
                            "datasource": {
                                "type": "grafana-athena-datasource",
                                "uid": "DS_AMAZON_ATHENA",
                            },
                            "format": 1,
                            "rawSQL": "SQL Statement",
                            "table": "waf_metrics",
                        },
                        {
                            "datasource": {
                                "type": "grafana-athena-datasource",
                                "uid": "DS_AMAZON_ATHENA",
                            },
                            "format": 1,
                            "rawSQL": "SQL Statement",
                            "refId": "A",
                            "table": "waf_metrics",
                        },
                        {
                            "datasource": {
                                "type": "grafana-athena-datasource",
                                "uid": "DS_AMAZON_ATHENA",
                            },
                            "format": 1,
                            "rawSQL": "SQL Statement",
                            "table": "waf_metrics",
                        },
                    ],
                    "title": "Total Requests",
                },
                {
                    "datasource": {"type": "datasource", "uid": "-- Dashboard --"},
                    "targets": [
                        {
                            "datasource": {
                                "type": "grafana-athena-datasource",
                                "uid": "DS_AMAZON_ATHENA",
                            },
                            "panelId": 1,
                            "refId": "Metrics",
                            "withTransforms": True,
                        },
                        {
                            "datasource": {
                                "type": "datasource",
                                "uid": "-- Dashboard --",
                            },
                            "panelId": 2,
                            "refId": "A",
                            "withTransforms": True,
                        },
                        {
                            "datasource": {
                                "type": "datasource",
                                "uid": "-- Dashboard --",
                            },
                            "panelId": 3,
                            "withTransforms": True,
                        },
                    ],
                    "title": "Requests History",
                    "type": "barchart",
                },
            ]
        }

        athena_connection_args = dict(
            Metrics=AthenaConnection(
                uid="test",
                catalog="AwsDataCatalog",
                database="test_database",
                region="us-east-1",
                table="test_table",
                account_id="123456789012",
                work_group="Primary",
                assume_role_arn="arn:aws:iam::123456789012:role/AthenaPublicAccessRole",
                output_location="s3://stagingbucket/athena-results/",
                reuse=True,
                reuse_age=30,
            )
        )
        new_dashboard = self.grafana_client.replace_athena_connection_args_in_panels(
            dashboard=dashboard, athena_connection_args=athena_connection_args
        )
        assert new_dashboard["panels"][0] == {
            "datasource": {"type": "grafana-athena-datasource", "uid": "test"},
            "targets": [
                {
                    "connectionArgs": {
                        "catalog": "AwsDataCatalog",
                        "database": "test_database",
                        "region": "us-east-1",
                        "resultReuseEnabled": True,
                        "resultReuseMaxAgeInMinutes": 30,
                    },
                    "datasource": {"type": "grafana-athena-datasource", "uid": "test"},
                    "format": 1,
                    "rawSQL": "SQL Statement",
                    "refId": "Metrics",
                    "table": "test_table",
                },
                {
                    "connectionArgs": {
                        "catalog": "AwsDataCatalog",
                        "database": "amazon_cl_centralized",
                        "region": "__default",
                        "resultReuseEnabled": True,
                        "resultReuseMaxAgeInMinutes": 5,
                    },
                    "datasource": {
                        "type": "grafana-athena-datasource",
                        "uid": "DS_AMAZON_ATHENA",
                    },
                    "format": 1,
                    "rawSQL": "SQL Statement",
                    "refId": "A",
                    "table": "waf_metrics",
                },
                {
                    "connectionArgs": {
                        "catalog": "AwsDataCatalog",
                        "database": "amazon_cl_centralized",
                        "region": "__default",
                        "resultReuseEnabled": True,
                        "resultReuseMaxAgeInMinutes": 5,
                    },
                    "datasource": {
                        "type": "grafana-athena-datasource",
                        "uid": "DS_AMAZON_ATHENA",
                    },
                    "format": 1,
                    "rawSQL": "SQL Statement",
                    "table": "waf_metrics",
                },
                {
                    "datasource": {
                        "type": "grafana-athena-datasource",
                        "uid": "DS_AMAZON_ATHENA",
                    },
                    "format": 1,
                    "rawSQL": "SQL Statement",
                    "refId": "A",
                    "table": "waf_metrics",
                },
                {
                    "datasource": {
                        "type": "grafana-athena-datasource",
                        "uid": "DS_AMAZON_ATHENA",
                    },
                    "format": 1,
                    "rawSQL": "SQL Statement",
                    "table": "waf_metrics",
                },
            ],
            "title": "Total Requests",
        }
        assert new_dashboard["panels"][1] == {
            "datasource": {"type": "datasource", "uid": "-- Dashboard --"},
            "targets": [
                {
                    "datasource": {"type": "grafana-athena-datasource", "uid": "test"},
                    "panelId": 1,
                    "refId": "Metrics",
                    "withTransforms": True,
                    "table": "test_table",
                },
                {
                    "datasource": {"type": "datasource", "uid": "-- Dashboard --"},
                    "panelId": 2,
                    "refId": "A",
                    "withTransforms": True,
                },
                {
                    "datasource": {"type": "datasource", "uid": "-- Dashboard --"},
                    "panelId": 3,
                    "withTransforms": True,
                },
            ],
            "title": "Requests History",
            "type": "barchart",
        }

        dashboard = {
            "panels": [
                {
                    "datasource": {
                        "type": "grafana-athena-datasource",
                        "uid": "DS_AMAZON_ATHENA",
                    },
                    "targets": [
                        {
                            "connectionArgs": {
                                "catalog": "AwsDataCatalog",
                                "database": "amazon_cl_centralized",
                                "region": "__default",
                                "resultReuseEnabled": False,
                                "resultReuseMaxAgeInMinutes": 10,
                            },
                            "datasource": {
                                "type": "grafana-athena-datasource",
                                "uid": "DS_AMAZON_ATHENA",
                            },
                            "format": 1,
                            "rawSQL": "SQL Statement",
                            "refId": "Metrics",
                            "table": "waf_metrics",
                        },
                        {
                            "connectionArgs": {
                                "catalog": "AwsDataCatalog",
                                "database": "amazon_cl_centralized",
                                "region": "__default",
                                "resultReuseEnabled": False,
                                "resultReuseMaxAgeInMinutes": 10,
                            },
                            "datasource": {
                                "type": "grafana-athena-datasource",
                                "uid": "DS_AMAZON_ATHENA",
                            },
                            "format": 1,
                            "rawSQL": "SQL Statement",
                            "refId": "A",
                            "table": "waf_metrics",
                        },
                        {
                            "connectionArgs": {
                                "catalog": "AwsDataCatalog",
                                "database": "amazon_cl_centralized",
                                "region": "__default",
                                "resultReuseEnabled": False,
                                "resultReuseMaxAgeInMinutes": 10,
                            },
                            "datasource": {
                                "type": "grafana-athena-datasource",
                                "uid": "DS_AMAZON_ATHENA",
                            },
                            "format": 1,
                            "rawSQL": "SQL Statement",
                            "table": "waf_metrics",
                        },
                        {
                            "datasource": {
                                "type": "grafana-athena-datasource",
                                "uid": "DS_AMAZON_ATHENA",
                            },
                            "format": 1,
                            "rawSQL": "SQL Statement",
                            "refId": "A",
                            "table": "waf_metrics",
                        },
                    ],
                    "title": "Total Requests",
                },
                {
                    "datasource": {"type": "datasource", "uid": "-- Dashboard --"},
                    "targets": [
                        {
                            "datasource": {
                                "type": "grafana-athena-datasource",
                                "uid": "DS_AMAZON_ATHENA",
                            },
                            "panelId": 1,
                            "refId": "Metrics",
                            "withTransforms": True,
                        },
                        {
                            "datasource": {
                                "type": "datasource",
                                "uid": "-- Dashboard --",
                            },
                            "panelId": 2,
                            "refId": "A",
                            "withTransforms": True,
                        },
                        {
                            "datasource": {
                                "type": "datasource",
                                "uid": "-- Dashboard --",
                            },
                            "panelId": 3,
                            "withTransforms": True,
                        },
                    ],
                    "title": "Requests History",
                    "type": "barchart",
                },
            ]
        }

        athena_connection_args = dict(
            Metrics=AthenaConnection(
                uid="test",
                catalog="AwsDataCatalog",
                database="test_database",
                region="us-east-1",
                table="test_table",
                account_id="123456789012",
                work_group="Primary",
                assume_role_arn="arn:aws:iam::123456789012:role/AthenaPublicAccessRole",
                output_location="s3://stagingbucket/athena-results/",
                reuse=True,
                reuse_age=30,
            )
        )
        new_dashboard = self.grafana_client.replace_athena_connection_args_in_panels(
            dashboard=dashboard, athena_connection_args=athena_connection_args
        )
        assert new_dashboard["panels"][0] == {
            "datasource": {"type": "grafana-athena-datasource", "uid": "test"},
            "targets": [
                {
                    "connectionArgs": {
                        "catalog": "AwsDataCatalog",
                        "database": "test_database",
                        "region": "us-east-1",
                        "resultReuseEnabled": True,
                        "resultReuseMaxAgeInMinutes": 30,
                    },
                    "datasource": {"type": "grafana-athena-datasource", "uid": "test"},
                    "format": 1,
                    "rawSQL": "SQL Statement",
                    "refId": "Metrics",
                    "table": "test_table",
                },
                {
                    "connectionArgs": {
                        "catalog": "AwsDataCatalog",
                        "database": "amazon_cl_centralized",
                        "region": "__default",
                        "resultReuseEnabled": False,
                        "resultReuseMaxAgeInMinutes": 10,
                    },
                    "datasource": {
                        "type": "grafana-athena-datasource",
                        "uid": "DS_AMAZON_ATHENA",
                    },
                    "format": 1,
                    "rawSQL": "SQL Statement",
                    "refId": "A",
                    "table": "waf_metrics",
                },
                {
                    "connectionArgs": {
                        "catalog": "AwsDataCatalog",
                        "database": "amazon_cl_centralized",
                        "region": "__default",
                        "resultReuseEnabled": False,
                        "resultReuseMaxAgeInMinutes": 10,
                    },
                    "datasource": {
                        "type": "grafana-athena-datasource",
                        "uid": "DS_AMAZON_ATHENA",
                    },
                    "format": 1,
                    "rawSQL": "SQL Statement",
                    "table": "waf_metrics",
                },
                {
                    "datasource": {
                        "type": "grafana-athena-datasource",
                        "uid": "DS_AMAZON_ATHENA",
                    },
                    "format": 1,
                    "rawSQL": "SQL Statement",
                    "refId": "A",
                    "table": "waf_metrics",
                },
            ],
            "title": "Total Requests",
        }
        assert new_dashboard["panels"][1] == {
            "datasource": {"type": "datasource", "uid": "-- Dashboard --"},
            "targets": [
                {
                    "datasource": {"type": "grafana-athena-datasource", "uid": "test"},
                    "panelId": 1,
                    "withTransforms": True,
                    "refId": "Metrics",
                    "table": "test_table",
                },
                {
                    "datasource": {"type": "datasource", "uid": "-- Dashboard --"},
                    "panelId": 2,
                    "refId": "A",
                    "withTransforms": True,
                },
                {
                    "datasource": {"type": "datasource", "uid": "-- Dashboard --"},
                    "panelId": 3,
                    "withTransforms": True,
                },
            ],
            "title": "Requests History",
            "type": "barchart",
        }

    def test_import_dashboard(self, httpserver: HTTPServer):
        from utils.grafana import AthenaConnection

        self.init_default_parameters(httpserver=httpserver)

        dashboard = {
            "id": 1,
            "uid": "w0x1c_Y4k5",
            "title": "Dashboards",
            "panels": [
                {
                    "datasource": {
                        "type": "grafana-athena-datasource",
                        "uid": "DS_AMAZON_ATHENA",
                    },
                    "targets": [
                        {
                            "connectionArgs": {
                                "catalog": "AwsDataCatalog",
                                "database": "amazon_cl_centralized",
                                "region": "__default",
                                "resultReuseEnabled": False,
                                "resultReuseMaxAgeInMinutes": 10,
                            },
                            "datasource": {
                                "type": "grafana-athena-datasource",
                                "uid": "DS_AMAZON_ATHENA",
                            },
                            "format": 1,
                            "rawSQL": "SQL Statement",
                            "refId": "Metrics",
                            "table": "waf_metrics",
                        },
                    ],
                    "title": "Total Requests",
                }
            ],
            "templating": {
                "list": [
                    {
                        "allValue": "SQL Statement",
                        "current": {},
                        "datasource": {
                            "type": "grafana-athena-datasource",
                            "uid": "DS_AMAZON_ATHENA",
                        },
                        "query": {
                            "connectionArgs": {
                                "catalog": "AwsDataCatalog",
                                "database": "amazon_cl_centralized",
                                "region": "__default",
                                "resultReuseEnabled": True,
                                "resultReuseMaxAgeInMinutes": 5,
                            },
                            "format": 1,
                            "rawSQL": "SQL Statement",
                            "refId": "Metrics",
                            "table": "waf_metrics",
                        },
                    }
                ]
            },
        }

        httpserver.expect_oneshot_request(
            uri="/api/dashboards/uid/w0x1c_Y4k5", method="GET"
        ).respond_with_data(
            response_data=json.dumps({"message": "Dashboard not found", "traceID": ""}),
            status=404,
        )
        httpserver.expect_oneshot_request(
            uri="/api/dashboards/db", method="POST"
        ).respond_with_data(
            response_data=json.dumps(
                {"id": 7, "status": "success", "uid": "w0x1c_Y4k5", "version": 1}
            )
        )

        athena_connection_args = dict(
            Metrics=AthenaConnection(
                uid="test",
                catalog="AwsDataCatalog",
                database="test_database",
                region="us-east-1",
                table="test_table",
                account_id="123456789012",
                work_group="Primary",
                assume_role_arn="arn:aws:iam::123456789012:role/AthenaPublicAccessRole",
                output_location="s3://stagingbucket/athena-results/",
                reuse=True,
                reuse_age=30,
            )
        )
        response = self.grafana_client.import_dashboard(
            dashboard=dashboard,
            athena_connection_args=athena_connection_args,
            overwrite=False,
        )
        assert response == {
            "status": 200,
            "content": {
                "id": 7,
                "status": "success",
                "uid": "w0x1c_Y4k5",
                "version": 1,
            },
        }

        httpserver.expect_oneshot_request(
            uri="/api/dashboards/uid/w0x1c_Y4k5", method="GET"
        ).respond_with_data(
            response_data=json.dumps({"message": "Dashboard not found", "traceID": ""}),
            status=404,
        )
        httpserver.expect_oneshot_request(
            uri="/api/dashboards/db", method="POST"
        ).respond_with_data(
            response_data=json.dumps(
                {"id": 7, "status": "success", "uid": "w0x1c_Y4k5", "version": 1}
            )
        )

        athena_connection_args = dict(
            Metrics=AthenaConnection(
                uid="test",
                catalog="AwsDataCatalog",
                database="test_database",
                region="us-east-1",
                table="test_table",
                account_id="123456789012",
                work_group="Primary",
                assume_role_arn="arn:aws:iam::123456789012:role/AthenaPublicAccessRole",
                output_location="s3://stagingbucket/athena-results/",
                reuse=True,
                reuse_age=30,
            )
        )
        response = self.grafana_client.import_dashboard(
            dashboard=dashboard,
            athena_connection_args=athena_connection_args,
            overwrite=True,
        )
        assert response == {
            "status": 200,
            "content": {
                "id": 7,
                "status": "success",
                "uid": "w0x1c_Y4k5",
                "version": 1,
            },
        }

        httpserver.expect_oneshot_request(
            uri="/api/dashboards/uid/w0x1c_Y4k5", method="GET"
        ).respond_with_data(
            response_data=json.dumps({"message": "Dashboard not found", "traceID": ""}),
            status=404,
        )
        httpserver.expect_oneshot_request(
            uri="/api/dashboards/db", method="POST"
        ).respond_with_data(
            response_data=json.dumps(
                {"id": 7, "status": "success", "uid": "w0x1c_Y4k5", "version": 1}
            )
        )

        athena_connection_args = dict(
            Metrics=AthenaConnection(
                uid="test",
                catalog="AwsDataCatalog",
                database="test_database",
                region="us-east-1",
                table="test_table",
                account_id="123456789012",
                work_group="Primary",
                assume_role_arn="arn:aws:iam::123456789012:role/AthenaPublicAccessRole",
                output_location="s3://stagingbucket/athena-results/",
                reuse=True,
                reuse_age=30,
            )
        )
        response = self.grafana_client.import_dashboard(
            dashboard=dashboard, athena_connection_args=athena_connection_args
        )
        assert response == {
            "status": 200,
            "content": {
                "id": 7,
                "status": "success",
                "uid": "w0x1c_Y4k5",
                "version": 1,
            },
        }

        httpserver.expect_oneshot_request(
            uri="/api/dashboards/uid/w0x1c_Y4k5", method="GET"
        ).respond_with_data(
            response_data=json.dumps({"message": "Dashboard not found", "traceID": ""}),
            status=404,
        )
        httpserver.expect_oneshot_request(
            uri="/api/dashboards/db", method="POST"
        ).respond_with_data(
            response_data=json.dumps(
                {"id": 7, "status": "success", "uid": "w0x1c_Y4k5", "version": 1}
            )
        )
        httpserver.expect_oneshot_request(
            uri="/api/folders", method="GET"
        ).respond_with_data(
            response_data=json.dumps(
                [
                    {"id": 1, "uid": "q_XODzX4z", "title": "General"},
                    {"id": 19, "uid": "zypaSkX4k", "title": "clo"},
                ]
            )
        )
        httpserver.expect_oneshot_request(
            uri="/api/folders/zypaSkX4k", method="GET"
        ).respond_with_data(
            response_data=json.dumps(
                {
                    "id": 19,
                    "uid": "zypaSkX4k",
                    "title": "clo",
                    "url": "/dashboards/f/zypaSkX4k/clo",
                    "hasAcl": False,
                    "canSave": True,
                    "canEdit": True,
                    "canAdmin": True,
                    "canDelete": True,
                    "version": 1,
                }
            )
        )

        athena_connection_args = dict(
            Metrics=AthenaConnection(
                uid="test",
                catalog="AwsDataCatalog",
                database="test_database",
                region="us-east-1",
                table="test_table",
                account_id="123456789012",
                work_group="Primary",
                assume_role_arn="arn:aws:iam::123456789012:role/AthenaPublicAccessRole",
                output_location="s3://stagingbucket/athena-results/",
                reuse=True,
                reuse_age=30,
            )
        )
        response = self.grafana_client.import_dashboard(
            dashboard=dashboard,
            athena_connection_args=athena_connection_args,
            folder_title="clo",
        )
        assert response == {
            "status": 200,
            "content": {
                "id": 7,
                "status": "success",
                "uid": "w0x1c_Y4k5",
                "version": 1,
            },
        }

        httpserver.expect_oneshot_request(
            uri="/api/dashboards/uid/w0x1c_Y4k5", method="GET"
        ).respond_with_data(
            response_data=json.dumps(
                {
                    "meta": {
                        "type": "db",
                        "title": "Dashboards",
                        "uid": "w0x1c_Y4k5",
                        "version": 4,
                    }
                }
            )
        )
        httpserver.expect_oneshot_request(
            uri="/api/dashboards/db", method="POST"
        ).respond_with_data(
            response_data=json.dumps(
                {"id": 7, "status": "success", "uid": "w0x1c_Y4k5", "version": 1}
            )
        )

        athena_connection_args = dict(
            Metrics=AthenaConnection(
                uid="test",
                catalog="AwsDataCatalog",
                database="test_database",
                region="us-east-1",
                table="test_table",
                account_id="123456789012",
                work_group="Primary",
                assume_role_arn="arn:aws:iam::123456789012:role/AthenaPublicAccessRole",
                output_location="s3://stagingbucket/athena-results/",
                reuse=True,
                reuse_age=30,
            )
        )
        response = self.grafana_client.import_dashboard(
            dashboard=dashboard,
            athena_connection_args=athena_connection_args,
            overwrite=False,
        )
        assert response == {
            "status": 200,
            "content": {"message": "Dashboard is exist and overwrite is false."},
        }

        httpserver.expect_oneshot_request(
            uri="/api/dashboards/uid/w0x1c_Y4k5", method="GET"
        ).respond_with_data(
            response_data=json.dumps(
                {
                    "meta": {
                        "type": "db",
                        "title": "Dashboards",
                        "uid": "w0x1c_Y4k5",
                        "version": 4,
                    }
                }
            )
        )
        httpserver.expect_oneshot_request(
            uri="/api/dashboards/db", method="POST"
        ).respond_with_data(
            response_data=json.dumps(
                {"id": 7, "status": "success", "uid": "w0x1c_Y4k5", "version": 1}
            )
        )

        athena_connection_args = dict(
            Metrics=AthenaConnection(
                uid="test",
                catalog="AwsDataCatalog",
                database="test_database",
                region="us-east-1",
                table="test_table",
                account_id="123456789012",
                work_group="Primary",
                assume_role_arn="arn:aws:iam::123456789012:role/AthenaPublicAccessRole",
                output_location="s3://stagingbucket/athena-results/",
                reuse=True,
                reuse_age=30,
            )
        )
        response = self.grafana_client.import_dashboard(
            dashboard=dashboard,
            athena_connection_args=athena_connection_args,
            overwrite=True,
        )
        assert response == {
            "status": 200,
            "content": {
                "id": 7,
                "status": "success",
                "uid": "w0x1c_Y4k5",
                "version": 1,
            },
        }

        httpserver.expect_oneshot_request(
            uri="/api/dashboards/uid/w0x1c_Y4k5", method="GET"
        ).respond_with_data(
            response_data=json.dumps(
                {
                    "meta": {
                        "type": "db",
                        "title": "Dashboards",
                        "uid": "w0x1c_Y4k5",
                        "version": 4,
                    }
                }
            )
        )
        httpserver.expect_oneshot_request(
            uri="/api/dashboards/db", method="POST"
        ).respond_with_data(
            response_data=json.dumps(
                {"id": 7, "status": "success", "uid": "w0x1c_Y4k5", "version": 1}
            )
        )

        athena_connection_args = dict(
            Metrics=AthenaConnection(
                uid="test",
                catalog="AwsDataCatalog",
                database="test_database",
                region="us-east-1",
                table="test_table",
                account_id="123456789012",
                work_group="Primary",
                assume_role_arn="arn:aws:iam::123456789012:role/AthenaPublicAccessRole",
                output_location="s3://stagingbucket/athena-results/",
                reuse=True,
                reuse_age=30,
            )
        )
        response = self.grafana_client.import_dashboard(
            dashboard=dashboard, athena_connection_args=athena_connection_args
        )
        assert response == {
            "status": 200,
            "content": {
                "id": 7,
                "status": "success",
                "uid": "w0x1c_Y4k5",
                "version": 1,
            },
        }

        httpserver.expect_oneshot_request(
            uri="/api/dashboards/uid/w0x1c_Y4k5", method="GET"
        ).respond_with_data(
            response_data=json.dumps(
                {
                    "meta": {
                        "type": "db",
                        "title": "Dashboards",
                        "uid": "w0x1c_Y4k5",
                        "version": 4,
                    }
                }
            )
        )
        httpserver.expect_oneshot_request(
            uri="/api/dashboards/db", method="POST"
        ).respond_with_data(
            response_data=json.dumps(
                {"id": 7, "status": "success", "uid": "w0x1c_Y4k5", "version": 1}
            )
        )
        httpserver.expect_oneshot_request(
            uri="/api/folders", method="GET"
        ).respond_with_data(
            response_data=json.dumps(
                [
                    {"id": 1, "uid": "q_XODzX4z", "title": "General"},
                    {"id": 19, "uid": "zypaSkX4k", "title": "clo"},
                ]
            )
        )
        httpserver.expect_oneshot_request(
            uri="/api/folders/zypaSkX4k", method="GET"
        ).respond_with_data(
            response_data=json.dumps(
                {
                    "id": 19,
                    "uid": "zypaSkX4k",
                    "title": "clo",
                    "url": "/dashboards/f/zypaSkX4k/clo",
                    "hasAcl": False,
                    "canSave": True,
                    "canEdit": True,
                    "canAdmin": True,
                    "canDelete": True,
                    "version": 1,
                }
            )
        )

        athena_connection_args = dict(
            Metrics=AthenaConnection(
                uid="test",
                catalog="AwsDataCatalog",
                database="test_database",
                region="us-east-1",
                table="test_table",
                account_id="123456789012",
                work_group="Primary",
                assume_role_arn="arn:aws:iam::123456789012:role/AthenaPublicAccessRole",
                output_location="s3://stagingbucket/athena-results/",
                reuse=True,
                reuse_age=30,
            )
        )
        response = self.grafana_client.import_dashboard(
            dashboard=dashboard,
            athena_connection_args=athena_connection_args,
            folder_title="clo",
        )
        assert response == {
            "status": 200,
            "content": {
                "id": 7,
                "status": "success",
                "uid": "w0x1c_Y4k5",
                "version": 1,
            },
        }


class TestGrafanaApi:

    def init_default_parameters(self, httpserver: HTTPServer):
        from utils.grafana import GrafanaApi

        self.grafana_url = httpserver.url_for("")
        self.grafana_token = "glsa_123456789012"

        httpserver.expect_request(
            uri="/api/datasources/name/Athena-clo-123456789012-us-east-1", method="GET"
        ).respond_with_data(
            response_data=json.dumps(
                {
                    "id": 96,
                    "name": "Athena-clo-123456789012-us-east-1",
                    "uid": "g5Aeh9_Vk",
                    "type": "grafana-athena-datasource",
                }
            )
        )
        httpserver.expect_request(
            uri="/api/dashboards/db", method="POST"
        ).respond_with_data(
            response_data=json.dumps(
                {"id": 7, "status": "success", "uid": "w0x1c_Y4k5", "version": 1}
            )
        )
        httpserver.expect_request(
            uri="/api/datasources/uid/g5Aeh9_Vk", method="PUT"
        ).respond_with_data(
            response_data=json.dumps(
                {
                    "datasource": {
                        "id": 96,
                        "uid": "g5Aeh9_Vk",
                        "name": "Athena-clo-123456789012-us-east-1",
                        "type": "grafana-athena-datasource",
                    },
                    "id": 96,
                    "message": "Datasource updated",
                    "name": "Athena-clo-123456789012-us-east-1",
                }
            )
        )
        httpserver.expect_request(
            uri="/api/dashboards/uid/w0x1c_Y4k5", method="DELETE"
        ).respond_with_data(
            response_data=json.dumps(
                {"id": 7, "message": "Dashboard deleted", "title": "Dashboard"}
            )
        )

        self.grafana_api = GrafanaApi(
            url=self.grafana_url, token=self.grafana_token, verify=False
        )

    def test_init(self, httpserver: HTTPServer):
        from utils.grafana import GrafanaApi

        self.init_default_parameters(httpserver=httpserver)

        grafana_api = GrafanaApi(url=self.grafana_url, token=self.grafana_token)
        assert grafana_api.url == f"{self.grafana_url}/api"
        assert grafana_api.token == self.grafana_token
        assert grafana_api.verify is False
        assert grafana_api.timeout == 5
        assert grafana_api.api.headers["Content-Type"] == "application/json"
        assert grafana_api.api.headers["Accept"] == "application/json"
        assert (
            grafana_api.api.headers["Authorization"] == f"Bearer {self.grafana_token}"
        )

        grafana_api = GrafanaApi(
            url=self.grafana_url, token=self.grafana_token, verify=True, timeout=10
        )
        assert grafana_api.url == f"{self.grafana_url}/api"
        assert grafana_api.token == self.grafana_token
        assert grafana_api.verify is True
        assert grafana_api.timeout == 10

    def test_get(self, httpserver: HTTPServer):
        self.init_default_parameters(httpserver=httpserver)

        response = self.grafana_api.get(
            "/datasources/name/Athena-clo-123456789012-us-east-1"
        )
        assert response == {
            "status": 200,
            "content": {
                "id": 96,
                "name": "Athena-clo-123456789012-us-east-1",
                "uid": "g5Aeh9_Vk",
                "type": "grafana-athena-datasource",
            },
        }

    def test_post(self, httpserver: HTTPServer):
        self.init_default_parameters(httpserver=httpserver)

        response = self.grafana_api.post("/dashboards/db", json=None)
        assert response == {
            "status": 200,
            "content": {
                "id": 7,
                "status": "success",
                "uid": "w0x1c_Y4k5",
                "version": 1,
            },
        }

    def test_put(self, httpserver: HTTPServer):
        self.init_default_parameters(httpserver=httpserver)

        response = self.grafana_api.put("/datasources/uid/g5Aeh9_Vk")
        assert response == {
            "status": 200,
            "content": {
                "datasource": {
                    "id": 96,
                    "uid": "g5Aeh9_Vk",
                    "name": "Athena-clo-123456789012-us-east-1",
                    "type": "grafana-athena-datasource",
                },
                "id": 96,
                "message": "Datasource updated",
                "name": "Athena-clo-123456789012-us-east-1",
            },
        }

    def test_delete(self, httpserver: HTTPServer):
        self.init_default_parameters(httpserver=httpserver)

        response = self.grafana_api.delete("/dashboards/uid/w0x1c_Y4k5")
        assert response == {
            "status": 200,
            "content": {"id": 7, "message": "Dashboard deleted", "title": "Dashboard"},
        }

    def test_request(self, httpserver: HTTPServer):
        self.init_default_parameters(httpserver=httpserver)

        response = self.grafana_api._request(
            path="/datasources/name/Athena-clo-123456789012-us-east-1", method="GET"
        )
        assert response == {
            "status": 200,
            "content": {
                "id": 96,
                "name": "Athena-clo-123456789012-us-east-1",
                "uid": "g5Aeh9_Vk",
                "type": "grafana-athena-datasource",
            },
        }

        response = self.grafana_api._request(
            path="/dashboards/db", method="POST", json=None
        )
        assert response == {
            "status": 200,
            "content": {
                "id": 7,
                "status": "success",
                "uid": "w0x1c_Y4k5",
                "version": 1,
            },
        }

        response = self.grafana_api._request(
            path="/datasources/uid/g5Aeh9_Vk", method="PUT", json=None
        )
        assert response == {
            "status": 200,
            "content": {
                "datasource": {
                    "id": 96,
                    "uid": "g5Aeh9_Vk",
                    "name": "Athena-clo-123456789012-us-east-1",
                    "type": "grafana-athena-datasource",
                },
                "id": 96,
                "message": "Datasource updated",
                "name": "Athena-clo-123456789012-us-east-1",
            },
        }

        response = self.grafana_api._request(
            path="/dashboards/uid/w0x1c_Y4k5", method="DELETE", json=None
        )
        assert response == {
            "status": 200,
            "content": {"id": 7, "message": "Dashboard deleted", "title": "Dashboard"},
        }

        httpserver.expect_oneshot_request(
            uri="/invalid/request", method="GET"
        ).respond_with_data(response_data="")
        response = self.grafana_api._request(
            path="/invalid/request", method="GET", json=None
        )
        assert response == {"status": 400}

        httpserver.expect_oneshot_request(
            uri="/invalid/request", method="GET"
        ).respond_with_data(response_data="<html></html>")
        response = self.grafana_api._request(path="/invalid/request", method="GET")
        assert response == {"status": 400}


class TestPlugin:

    def init_default_parameters(self, httpserver: HTTPServer):
        from utils.grafana import GrafanaApi

        self.grafana_url = httpserver.url_for("")
        self.grafana_token = "glsa_123456789012"

        httpserver.expect_request(
            uri="/api/plugins/grafana-athena-datasource/settings", method="GET"
        ).respond_with_data(
            response_data=json.dumps(
                {
                    "name": "Amazon Athena",
                    "type": "datasource",
                    "id": "grafana-athena-datasource",
                    "enabled": False,
                    "pinned": False,
                }
            )
        )
        httpserver.expect_request(
            uri="/api/datasources/name/Athena-clo-123456789012-us-east-1", method="GET"
        ).respond_with_data(
            response_data=json.dumps(
                {
                    "id": 96,
                    "name": "Athena-clo-123456789012-us-east-1",
                    "uid": "g5Aeh9_Vk",
                    "type": "grafana-athena-datasource",
                }
            )
        )
        httpserver.expect_request(
            uri="/api/datasources/uid/g5Aeh9_Vk", method="PUT"
        ).respond_with_data(
            response_data=json.dumps(
                {
                    "datasource": {
                        "id": 96,
                        "uid": "g5Aeh9_Vk",
                        "name": "Athena-clo-123456789012-us-east-1",
                        "type": "grafana-athena-datasource",
                    },
                    "id": 96,
                    "message": "Datasource updated",
                    "name": "Athena-clo-123456789012-us-east-1",
                }
            )
        )
        httpserver.expect_request(
            uri="/api/datasources/name/Athena-clo-123456789012-us-east-1-test",
            method="GET",
        ).respond_with_data(
            response_data=json.dumps({"message": "Data source not found"}), status=404
        )

        self.grafana_api = GrafanaApi(
            url=self.grafana_url, token=self.grafana_token, verify=False
        )

    def test_get_plugin_settings(self, httpserver: HTTPServer):
        from utils.grafana import Plugin

        self.init_default_parameters(httpserver=httpserver)

        plugin_api = Plugin(api=self.grafana_api)

        response = plugin_api.get_plugin_settings(plugin_id="grafana-athena-datasource")
        assert response == {
            "status": 200,
            "content": {
                "name": "Amazon Athena",
                "type": "datasource",
                "id": "grafana-athena-datasource",
                "enabled": False,
                "pinned": False,
            },
        }

    # def test_list_plugin(self, httpserver: HTTPServer):
    #     pass

    # def test_install_plugin(self, httpserver: HTTPServer):
    #     pass

    # def test_uninstall_plugin(self, httpserver: HTTPServer):
    #     pass

    # def test_update_plugin(self, httpserver: HTTPServer):
    #     pass


class TestDataSource:

    def init_default_parameters(self, httpserver: HTTPServer):
        from utils.grafana import GrafanaApi, DataSource

        self.grafana_url = httpserver.url_for("")
        self.grafana_token = "glsa_123456789012"

        httpserver.expect_request(
            uri="/api/plugins/grafana-athena-datasource/settings", method="GET"
        ).respond_with_data(
            response_data=json.dumps(
                {
                    "name": "Amazon Athena",
                    "type": "datasource",
                    "id": "grafana-athena-datasource",
                    "enabled": False,
                    "pinned": False,
                }
            )
        )
        httpserver.expect_request(
            uri="/api/datasources/name/Athena-clo-123456789012-us-east-1", method="GET"
        ).respond_with_data(
            response_data=json.dumps(
                {
                    "id": 96,
                    "name": "Athena-clo-123456789012-us-east-1",
                    "uid": "g5Aeh9_Vk",
                    "type": "grafana-athena-datasource",
                }
            )
        )
        httpserver.expect_request(
            uri="/api/datasources/uid/g5Aeh9_Vk", method="PUT"
        ).respond_with_data(
            response_data=json.dumps(
                {
                    "datasource": {
                        "id": 96,
                        "uid": "g5Aeh9_Vk",
                        "name": "Athena-clo-123456789012-us-east-1",
                        "type": "grafana-athena-datasource",
                    },
                    "id": 96,
                    "message": "Datasource updated",
                    "name": "Athena-clo-123456789012-us-east-1",
                }
            )
        )
        httpserver.expect_request(
            uri="/api/datasources/uid/g5Aeh9_Vk", method="GET"
        ).respond_with_data(
            response_data=json.dumps(
                {
                    "id": 98,
                    "uid": "g5Aeh9_Vk",
                    "name": "Athena-clo-123456789012-us-east-1",
                    "type": "grafana-athena-datasource",
                }
            )
        )
        httpserver.expect_request(
            uri="/api/datasources/uid/g5Aeh9_Vk", method="DELETE"
        ).respond_with_data(
            response_data=json.dumps({"id": 98, "message": "Data source deleted"})
        )

        self.grafana_api = GrafanaApi(
            url=self.grafana_url, token=self.grafana_token, verify=False
        )
        self.datasource_api = DataSource(api=self.grafana_api)

    def test_get_datasource(self, httpserver: HTTPServer):
        self.init_default_parameters(httpserver=httpserver)

        response = self.datasource_api.get_datasource(datasource_uid="g5Aeh9_Vk")
        assert response == {
            "status": 200,
            "content": {
                "id": 98,
                "uid": "g5Aeh9_Vk",
                "name": "Athena-clo-123456789012-us-east-1",
                "type": "grafana-athena-datasource",
            },
        }

    def test_get_datasource_by_name(self, httpserver: HTTPServer):
        self.init_default_parameters(httpserver=httpserver)

        response = self.datasource_api.get_datasource_by_name(
            datasource_name="Athena-clo-123456789012-us-east-1"
        )
        assert response == {
            "status": 200,
            "content": {
                "id": 96,
                "name": "Athena-clo-123456789012-us-east-1",
                "uid": "g5Aeh9_Vk",
                "type": "grafana-athena-datasource",
            },
        }

    def test_create_datasource(self, httpserver: HTTPServer):
        self.init_default_parameters(httpserver=httpserver)

        httpserver.expect_oneshot_request(
            uri="/api/datasources", method="POST"
        ).respond_with_data(
            response_data=json.dumps(
                {
                    "datasource": {
                        "id": 101,
                        "uid": "l5y8izu4z",
                        "name": "Athena-clo-942636716027-us-east-1",
                        "type": "grafana-athena-datasource",
                    }
                }
            )
        )
        datasource = {
            "type": "grafana-athena-datasource",
            "access": "proxy",
            "isDefault": False,
            "jsonData": {
                "authType": "default",
                "catalog": "AwsDataCatalog",
                "database": "test_database",
                "defaultRegion": "us-east-1",
                "workgroup": "Primary",
                "assumeRoleArn": "arn:aws:iam::123456789012:role/AthenaPublicAccessRole",
                "outputLocation": "s3://stagingbucket/athena-results/",
            },
        }
        response = self.datasource_api.create_datasource(datasource=datasource)
        assert response == {
            "status": 200,
            "content": {
                "datasource": {
                    "id": 101,
                    "uid": "l5y8izu4z",
                    "name": "Athena-clo-942636716027-us-east-1",
                    "type": "grafana-athena-datasource",
                }
            },
        }

    def test_update_datasource(self, httpserver: HTTPServer):
        self.init_default_parameters(httpserver=httpserver)

        datasource = {
            "type": "grafana-athena-datasource",
            "access": "proxy",
            "isDefault": False,
            "jsonData": {
                "authType": "default",
                "catalog": "AwsDataCatalog",
                "database": "test_database",
                "defaultRegion": "us-east-1",
                "workgroup": "Primary",
                "assumeRoleArn": "arn:aws:iam::123456789012:role/AthenaPublicAccessRole",
                "outputLocation": "s3://stagingbucket/athena-results/",
            },
        }
        response = self.datasource_api.update_datasource(
            datasource_uid="g5Aeh9_Vk", datasource=datasource
        )
        assert response == {
            "status": 200,
            "content": {
                "datasource": {
                    "id": 96,
                    "uid": "g5Aeh9_Vk",
                    "name": "Athena-clo-123456789012-us-east-1",
                    "type": "grafana-athena-datasource",
                },
                "id": 96,
                "message": "Datasource updated",
                "name": "Athena-clo-123456789012-us-east-1",
            },
        }

    def test_delete_datasource(self, httpserver: HTTPServer):
        self.init_default_parameters(httpserver=httpserver)

        response = self.datasource_api.delete_datasource(datasource_uid="g5Aeh9_Vk")
        assert response == {
            "status": 200,
            "content": {"id": 98, "message": "Data source deleted"},
        }


class TestDashboard:

    def init_default_parameters(self, httpserver: HTTPServer):
        from utils.grafana import GrafanaApi, Dashboard

        self.grafana_url = httpserver.url_for("")
        self.grafana_token = "glsa_123456789012"

        httpserver.expect_request(
            uri="/api/dashboards/uid/0HklGl_Vz", method="GET"
        ).respond_with_data(
            response_data=json.dumps(
                {
                    "meta": {
                        "type": "db",
                        "canSave": True,
                        "canEdit": True,
                        "canAdmin": True,
                        "canStar": True,
                        "canDelete": True,
                        "slug": "production-overview",
                        "url": "/d/0HklGl_Vz/production-overview",
                        "expires": "0001-01-01T00:00:00Z",
                        "created": "2023-06-12T08:46:20Z",
                        "updated": "2023-06-12T08:46:20Z",
                        "updatedBy": "Anonymous",
                        "createdBy": "Anonymous",
                        "version": 1,
                        "hasAcl": False,
                        "isFolder": False,
                        "folderId": 0,
                        "folderUid": "",
                        "folderTitle": "General",
                        "folderUrl": "",
                        "provisioned": False,
                        "provisionedExternalId": "",
                        "annotationsPermissions": {
                            "dashboard": {
                                "canAdd": True,
                                "canEdit": True,
                                "canDelete": True,
                            },
                            "organization": {
                                "canAdd": True,
                                "canEdit": True,
                                "canDelete": True,
                            },
                        },
                        "publicDashboardAccessToken": "",
                        "publicDashboardUid": "",
                        "publicDashboardEnabled": False,
                    },
                    "dashboard": {
                        "id": 14,
                        "refresh": "25s",
                        "schemaVersion": 16,
                        "tags": ["templated"],
                        "timezone": "browser",
                        "title": "Production Overview",
                        "uid": "0HklGl_Vz",
                        "version": 1,
                    },
                }
            )
        )
        httpserver.expect_request(
            uri="/api/dashboards/db", method="POST"
        ).respond_with_data(
            response_data=json.dumps(
                {
                    "id": 17,
                    "slug": "production-overview",
                    "status": "success",
                    "uid": "4b122cbc-1d26-4e63-b05a-0d2fdd69c2ff-00",
                    "url": "/d/4b122cbc-1d26-4e63-b05a-0d2fdd69c2ff-00/production-overview",
                    "version": 58,
                }
            )
        )
        httpserver.expect_request(
            uri="/api/dashboards/uid/0HklGl_Vz", method="DELETE"
        ).respond_with_data(
            response_data=json.dumps(
                {
                    "id": 17,
                    "message": "Dashboard Production Overview deleted",
                    "title": "Production Overview",
                }
            )
        )

        self.grafana_api = GrafanaApi(
            url=self.grafana_url, token=self.grafana_token, verify=False
        )
        self.dashboard_api = Dashboard(api=self.grafana_api)

    def test_get_dashboard(self, httpserver: HTTPServer):
        self.init_default_parameters(httpserver=httpserver)

        response = self.dashboard_api.get_dashboard(dashboard_uid="0HklGl_Vz")
        assert response == {
            "status": 200,
            "content": {
                "meta": {
                    "type": "db",
                    "canSave": True,
                    "canEdit": True,
                    "canAdmin": True,
                    "canStar": True,
                    "canDelete": True,
                    "slug": "production-overview",
                    "url": "/d/0HklGl_Vz/production-overview",
                    "expires": "0001-01-01T00:00:00Z",
                    "created": "2023-06-12T08:46:20Z",
                    "updated": "2023-06-12T08:46:20Z",
                    "updatedBy": "Anonymous",
                    "createdBy": "Anonymous",
                    "version": 1,
                    "hasAcl": False,
                    "isFolder": False,
                    "folderId": 0,
                    "folderUid": "",
                    "folderTitle": "General",
                    "folderUrl": "",
                    "provisioned": False,
                    "provisionedExternalId": "",
                    "annotationsPermissions": {
                        "dashboard": {
                            "canAdd": True,
                            "canEdit": True,
                            "canDelete": True,
                        },
                        "organization": {
                            "canAdd": True,
                            "canEdit": True,
                            "canDelete": True,
                        },
                    },
                    "publicDashboardAccessToken": "",
                    "publicDashboardUid": "",
                    "publicDashboardEnabled": False,
                },
                "dashboard": {
                    "id": 14,
                    "refresh": "25s",
                    "schemaVersion": 16,
                    "tags": ["templated"],
                    "timezone": "browser",
                    "title": "Production Overview",
                    "uid": "0HklGl_Vz",
                    "version": 1,
                },
            },
        }

    def test_update_dashboard(self, httpserver: HTTPServer):
        self.init_default_parameters(httpserver=httpserver)

        json = {
            "dashboard": {
                "id": None,
                "uid": "4b122cbc-1d26-4e63-b05a-0d2fdd69c2ff-00",
                "title": "Production Overview",
                "tags": ["templated"],
                "timezone": "browser",
                "version": 6,
                "refresh": "25s",
            },
            "message": "Made changes to xyz",
            "overwrite": True,
        }
        response = self.dashboard_api.update_dashboard(json=json)
        assert response == {
            "status": 200,
            "content": {
                "id": 17,
                "slug": "production-overview",
                "status": "success",
                "uid": "4b122cbc-1d26-4e63-b05a-0d2fdd69c2ff-00",
                "url": "/d/4b122cbc-1d26-4e63-b05a-0d2fdd69c2ff-00/production-overview",
                "version": 58,
            },
        }

    def test_delete_dashboard(self, httpserver: HTTPServer):
        self.init_default_parameters(httpserver=httpserver)

        response = self.dashboard_api.delete_dashboard(dashboard_uid="0HklGl_Vz")
        assert response == {
            "status": 200,
            "content": {
                "id": 17,
                "message": "Dashboard Production Overview deleted",
                "title": "Production Overview",
            },
        }


class TestFolder:

    def init_default_parameters(self, httpserver: HTTPServer):
        from utils.grafana import GrafanaApi, Folder

        self.grafana_url = httpserver.url_for("")
        self.grafana_token = "glsa_123456789012"

        httpserver.expect_request(uri="/api/folders", method="GET").respond_with_data(
            response_data=json.dumps(
                [
                    {"id": 1, "uid": "q_XODzX4z", "title": "General"},
                    {"id": 19, "uid": "zypaSkX4k", "title": "clo"},
                ]
            )
        )
        httpserver.expect_request(
            uri="/api/folders/zypaSkX4k", method="GET"
        ).respond_with_data(
            response_data=json.dumps(
                {
                    "id": 19,
                    "uid": "zypaSkX4k",
                    "title": "clo",
                    "url": "/dashboards/f/zypaSkX4k/clo",
                    "hasAcl": False,
                    "canSave": True,
                    "canEdit": True,
                    "canAdmin": True,
                    "canDelete": True,
                    "version": 1,
                }
            )
        )
        httpserver.expect_request(
            uri="/api/folders/0HklGl_Vz", method="DELETE"
        ).respond_with_data(response_data="")

        self.grafana_api = GrafanaApi(
            url=self.grafana_url, token=self.grafana_token, verify=False
        )
        self.folder_api = Folder(api=self.grafana_api)

    def test_list_folder(self, httpserver: HTTPServer):
        self.init_default_parameters(httpserver=httpserver)

        response = self.folder_api.list_folder()
        assert response == {
            "status": 200,
            "content": [
                {"id": 1, "uid": "q_XODzX4z", "title": "General"},
                {"id": 19, "uid": "zypaSkX4k", "title": "clo"},
            ],
        }

    def test_get_folder(self, httpserver: HTTPServer):
        self.init_default_parameters(httpserver=httpserver)

        response = self.folder_api.get_folder(folder_uid="zypaSkX4k")
        assert response == {
            "status": 200,
            "content": {
                "id": 19,
                "uid": "zypaSkX4k",
                "title": "clo",
                "url": "/dashboards/f/zypaSkX4k/clo",
                "hasAcl": False,
                "canSave": True,
                "canEdit": True,
                "canAdmin": True,
                "canDelete": True,
                "version": 1,
            },
        }

    def test_create_folder(self, httpserver: HTTPServer):
        self.init_default_parameters(httpserver=httpserver)

        httpserver.expect_oneshot_request(
            uri="/api/folders", method="POST"
        ).respond_with_data(
            response_data=json.dumps(
                {
                    "id": 19,
                    "uid": "zypaSkX4k",
                    "title": "clo",
                    "url": "/dashboards/f/zypaSkX4k/clo",
                    "hasAcl": False,
                    "canSave": True,
                    "canEdit": True,
                    "canAdmin": True,
                    "canDelete": True,
                    "createdBy": "Anonymous",
                    "updatedBy": "Anonymous",
                    "version": 1,
                }
            )
        )

        response = self.folder_api.create_folder(title="clo")
        assert response == {
            "status": 200,
            "content": {
                "id": 19,
                "uid": "zypaSkX4k",
                "title": "clo",
                "url": "/dashboards/f/zypaSkX4k/clo",
                "hasAcl": False,
                "canSave": True,
                "canEdit": True,
                "canAdmin": True,
                "canDelete": True,
                "createdBy": "Anonymous",
                "updatedBy": "Anonymous",
                "version": 1,
            },
        }

        httpserver.expect_oneshot_request(
            uri="/api/folders", method="POST"
        ).respond_with_data(
            response_data=json.dumps(
                {
                    "id": 19,
                    "uid": "clo",
                    "title": "clo",
                    "url": "/dashboards/f/clo/clo",
                    "hasAcl": False,
                    "canSave": True,
                    "canEdit": True,
                    "canAdmin": True,
                    "canDelete": True,
                    "createdBy": "Anonymous",
                    "updatedBy": "Anonymous",
                    "version": 1,
                }
            )
        )

        response = self.folder_api.create_folder(title="clo", folder_uid="clo")
        assert response == {
            "status": 200,
            "content": {
                "id": 19,
                "uid": "clo",
                "title": "clo",
                "url": "/dashboards/f/clo/clo",
                "hasAcl": False,
                "canSave": True,
                "canEdit": True,
                "canAdmin": True,
                "canDelete": True,
                "createdBy": "Anonymous",
                "updatedBy": "Anonymous",
                "version": 1,
            },
        }

    def test_delete_folder(self, httpserver: HTTPServer):
        self.init_default_parameters(httpserver=httpserver)

        response = self.folder_api.delete_folder(folder_uid="0HklGl_Vz")
        assert response == {"status": 200}


class TestUser:

    def init_default_parameters(self, httpserver: HTTPServer):
        from utils.grafana import GrafanaApi, User

        self.grafana_url = httpserver.url_for("")
        self.grafana_token = "glsa_123456789012"

        httpserver.expect_request(
            uri="/api/user/preferences", method="GET"
        ).respond_with_data(response_data=json.dumps({}))

        self.grafana_api = GrafanaApi(
            url=self.grafana_url, token=self.grafana_token, verify=False
        )
        self.user_api = User(api=self.grafana_api)

    def test_preferences(self, httpserver: HTTPServer):
        self.init_default_parameters(httpserver=httpserver)

        httpserver.expect_oneshot_request(
            uri="/api/user/preferences", method="GET"
        ).respond_with_data(response_data=json.dumps({}), status=200)

        response = self.user_api.preferences()
        assert response == {"status": 200, "content": {}}

        httpserver.expect_oneshot_request(
            uri="/api/user/preferences", method="GET"
        ).respond_with_data(response_data=json.dumps({}), status=401)

        response = self.user_api.preferences()
        assert response == {"status": 401, "content": {}}
