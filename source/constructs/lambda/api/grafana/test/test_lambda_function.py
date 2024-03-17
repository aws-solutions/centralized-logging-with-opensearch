# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import json
import pytest
from moto import mock_dynamodb
import os
import boto3
from pytest_httpserver import HTTPServer

mocked_url = "https://test-grafana.com"
updated_url = "https://test-grafana2.com"


@pytest.fixture
def ddb_client():
    with mock_dynamodb():
        region = os.environ.get("AWS_REGION")

        ddb = boto3.resource("dynamodb", region_name=region)
        ddb.create_table(
            TableName=os.environ.get("GRAFANA_TABLE"),
            KeySchema=[{"AttributeName": "id", "KeyType": "HASH"}],
            AttributeDefinitions=[{"AttributeName": "id", "AttributeType": "S"}],
            ProvisionedThroughput={"ReadCapacityUnits": 5, "WriteCapacityUnits": 5},
        )

        yield


@pytest.fixture
def create_event():
    with open("./test/event/test_event.json", "r") as f:
        event = json.load(f)
        event["arguments"] = {
            "name": "test-grafana",
            "url": mocked_url,
            "token": "test-access-token",
            "tags": [],
        }
        event["info"]["fieldName"] = "createGrafana"

        print(event)
        return event


@pytest.fixture
def update_event():
    with open("./test/event/test_event.json", "r") as f:
        event = json.load(f)
        event["arguments"] = {
            "id": "dummyId",
            "url": updated_url,
        }
        event["info"]["fieldName"] = "updateGrafana"

        print(event)
        return event


@pytest.fixture
def delete_event():
    with open("./test/event/test_event.json", "r") as f:
        event = json.load(f)
        event["arguments"] = {"id": "dummyId"}
        event["info"]["fieldName"] = "deleteGrafana"

        print(event)
        return event


@pytest.fixture
def list_event():
    with open("./test/event/test_event.json", "r") as f:
        event = json.load(f)
        event["arguments"] = {"page": 1, "count": 20}
        event["info"]["fieldName"] = "listGrafanas"

        print(event)
        return event


@pytest.fixture
def get_event():
    with open("./test/event/test_event.json", "r") as f:
        event = json.load(f)
        event["info"]["fieldName"] = "getGrafana"
        event["arguments"] = {"id": "dummyId"}
        print(event)
        return event


@pytest.fixture
def check_grafana_event():
    with open("./test/event/test_event.json", "r") as f:
        event = json.load(f)
        event["info"]["fieldName"] = "checkGrafana"
        event["arguments"] = {"url": "dummyUrl", "token": "dummyToken", "id": ""}
        print(event)
        return event


def test_lambda_function(
    ddb_client,
    create_event,
    list_event,
    update_event,
    delete_event,
    get_event,
):
    import lambda_function

    # start with empty list
    result = lambda_function.lambda_handler(list_event, None)
    assert result["total"] == 0

    # create a pipeline
    id = lambda_function.lambda_handler(create_event, None)
    # Expect Execute successfully.
    assert id is not None

    # list again
    result = lambda_function.lambda_handler(list_event, None)
    assert result["total"] == 1
    assert result["grafanas"][0]["url"] == mocked_url

    # get grafana
    get_event["arguments"]["id"] = id
    get_result = lambda_function.lambda_handler(get_event, None)
    assert get_result is not None

    # update a real one
    update_event["arguments"]["id"] = id
    lambda_function.lambda_handler(update_event, None)
    # list updated records
    updated_result = lambda_function.lambda_handler(list_event, None)
    # Url changed
    assert updated_result["grafanas"][0]["url"] == updated_url
    # token unchanged
    assert updated_result["grafanas"][0]["token"] == result["grafanas"][0]["token"]

    # delete a real one
    delete_event["arguments"]["id"] = id
    lambda_function.lambda_handler(delete_event, None)

    # No records in list
    result = lambda_function.lambda_handler(list_event, None)
    assert result["total"] == 0


class TestGrafanaStatusCheck:
    def init_default_parameters(self, httpserver: HTTPServer):
        from util.grafana import AthenaConnection

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

    def test_check_grafana(self, httpserver: HTTPServer, check_grafana_event, create_event, ddb_client):
        import lambda_function
        self.init_default_parameters(httpserver=httpserver)
        
        # Test happy case
        httpserver.clear()
        httpserver.expect_oneshot_request(uri='/api/datasources/name/TestCreateAthenaDatasource', method='GET').respond_with_data(response_data=json.dumps({'message': 'Data source not found'}), status=404)
        httpserver.expect_oneshot_request(uri='/api/datasources', method='POST').respond_with_data(response_data=json.dumps({'datasource': {'id': 98, 'uid': 'BasXA4g_ar', 'name': 'Athena', 'type': 'grafana-athena-datasource'}, 'id': 98, 'message': 'Datasource added', 'name': 'TestCreateAthenaDatasource'}))
        httpserver.expect_oneshot_request(uri='/api/datasources/uid/BasXA4g_ar', method='DELETE').respond_with_data(status=200)

        httpserver.expect_oneshot_request(uri='/api/user/preferences', method='GET').respond_with_data(status=200)

        httpserver.expect_request(uri='/api/plugins/grafana-athena-datasource/settings', method='GET').respond_with_data(response_data=json.dumps({'name': 'Amazon Athena', 'type': 'datasource', 'id': 'grafana-athena-datasource', 'enabled': False, 'pinned': False}))

        httpserver.expect_oneshot_request(uri='/api/folders', method='GET').respond_with_data(response_data=json.dumps([]))
        httpserver.expect_oneshot_request(uri='/api/folders', method='POST').respond_with_data(response_data=json.dumps({'id': 19, 'uid': 'zypaSkX4k', 'title': 'clo', 'url': '/dashboards/f/zypaSkX4k/clo', 'hasAcl': False, 'canSave': True, 'canEdit': True, 'canAdmin': True, 'canDelete': True, 'createdBy': 'Anonymous', 'updatedBy': 'Anonymous','version': 1}))
        httpserver.expect_oneshot_request(uri='/api/folders/zypaSkX4k', method='DELETE').respond_with_data(status=200)

        httpserver.expect_oneshot_request(uri='/api/dashboards/db', method='POST').respond_with_data(response_data=json.dumps({'id': 17, 'slug': 'TestDashboardsPermission', 'status': 'success', 'uid': '0HklGl_Vz', 'url': '/d/0HklGl_Vz/TestDashboardsPermission', 'version': 58}))
        httpserver.expect_oneshot_request(uri='/api/dashboards/uid/0HklGl_Vz', method='DELETE').respond_with_data(response_data=json.dumps({'id': 17, 'message': 'Dashboard Production Overview deleted', 'title': 'Production Overview'}))
        
        httpserver.expect_oneshot_request(uri='/api/folders/test-folder-permission', method='GET').respond_with_data(response_data=json.dumps({'id': 19, 'uid': 'test-folder-permission', 'title': 'clo', 'url': '/dashboards/f/test-folder-permission/clo', 'hasAcl': False, 'canSave': True, 'canEdit': True, 'canAdmin': True, 'canDelete': True, 'createdBy': 'Anonymous', 'updatedBy': 'Anonymous','version': 1}))
        httpserver.expect_oneshot_request(uri='/api/folders/test-folder-permission', method='DELETE').respond_with_data(status=200)
        
        check_grafana_event["arguments"]["url"] = self.grafana_url
        check_grafana_event["arguments"]["token"] = self.grafana_token
        response = lambda_function.lambda_handler(check_grafana_event, None)
        print(response)
        assert response["status"] == "PASSED"
        assert response["details"][0]["status"] == "PASSED"
        assert "name" in response["details"][0]
        assert "values" in response["details"][0]
        assert "errorCode" in response["details"][0]

        # Test bad case - token invalid
        httpserver.clear()

        httpserver.expect_oneshot_request(uri='/api/datasources/name/TestCreateAthenaDatasource', method='GET').respond_with_data(response_data=json.dumps({'message': 'Data source not found'}), status=404)
        httpserver.expect_oneshot_request(uri='/api/datasources', method='POST').respond_with_data(response_data=json.dumps({'datasource': {'id': 98, 'uid': 'BasXA4g_ar', 'name': 'Athena', 'type': 'grafana-athena-datasource'}, 'id': 98, 'message': 'Datasource added', 'name': 'TestCreateAthenaDatasource'}))
        httpserver.expect_oneshot_request(uri='/api/datasources/uid/BasXA4g_ar', method='DELETE').respond_with_data(status=200)

        httpserver.expect_oneshot_request(uri='/api/user/preferences', method='GET').respond_with_data(status=401)  # token invalid

        httpserver.expect_request(uri='/api/plugins/grafana-athena-datasource/settings', method='GET').respond_with_data(response_data=json.dumps({'name': 'Amazon Athena', 'type': 'datasource', 'id': 'grafana-athena-datasource', 'enabled': False, 'pinned': False}))

        httpserver.expect_oneshot_request(uri='/api/folders', method='GET').respond_with_data(response_data=json.dumps([]))
        httpserver.expect_oneshot_request(uri='/api/folders', method='POST').respond_with_data(response_data=json.dumps({'id': 19, 'uid': 'zypaSkX4k', 'title': 'clo', 'url': '/dashboards/f/zypaSkX4k/clo', 'hasAcl': False, 'canSave': True, 'canEdit': True, 'canAdmin': True, 'canDelete': True, 'createdBy': 'Anonymous', 'updatedBy': 'Anonymous','version': 1}))
        httpserver.expect_oneshot_request(uri='/api/folders/zypaSkX4k', method='DELETE').respond_with_data(status=200)

        httpserver.expect_oneshot_request(uri='/api/dashboards/db', method='POST').respond_with_data(response_data=json.dumps({'id': 17, 'slug': 'TestDashboardsPermission', 'status': 'success', 'uid': '0HklGl_Vz', 'url': '/d/0HklGl_Vz/TestDashboardsPermission', 'version': 58}))
        httpserver.expect_oneshot_request(uri='/api/dashboards/uid/0HklGl_Vz', method='DELETE').respond_with_data(response_data=json.dumps({'id': 17, 'message': 'Dashboard Production Overview deleted', 'title': 'Production Overview'}))

        httpserver.expect_oneshot_request(uri='/api/folders/test-folder-permission', method='GET').respond_with_data(response_data=json.dumps({'id': 19, 'uid': 'test-folder-permission', 'title': 'clo', 'url': '/dashboards/f/test-folder-permission/clo', 'hasAcl': False, 'canSave': True, 'canEdit': True, 'canAdmin': True, 'canDelete': True, 'createdBy': 'Anonymous', 'updatedBy': 'Anonymous','version': 1}))
        httpserver.expect_oneshot_request(uri='/api/folders/test-folder-permission', method='DELETE').respond_with_data(status=200)
        
        response = lambda_function.lambda_handler(check_grafana_event, None)
        print(response)
        assert response["status"] == "FAILED"
        assert "name" in response["details"][0]
        assert "values" in response["details"][0]
        assert "errorCode" in response["details"][0]

        # Test bad case - url connect failed
        httpserver.clear()

        httpserver.expect_oneshot_request(uri='/api/datasources/name/TestCreateAthenaDatasource', method='GET').respond_with_data(response_data=json.dumps({'message': 'Data source not found'}), status=404)
        httpserver.expect_oneshot_request(uri='/api/datasources', method='POST').respond_with_data(response_data=json.dumps({'datasource': {'id': 98, 'uid': 'BasXA4g_ar', 'name': 'Athena', 'type': 'grafana-athena-datasource'}, 'id': 98, 'message': 'Datasource added', 'name': 'TestCreateAthenaDatasource'}))
        httpserver.expect_oneshot_request(uri='/api/datasources/uid/BasXA4g_ar', method='DELETE').respond_with_data(status=200)

        httpserver.expect_oneshot_request(uri='/api/user/preferences', method='GET').respond_with_data(status=200)

        httpserver.expect_request(uri='/api/plugins/grafana-athena-datasource/settings', method='GET').respond_with_data(response_data=json.dumps({'name': 'Amazon Athena', 'type': 'datasource', 'id': 'grafana-athena-datasource', 'enabled': False, 'pinned': False}))

        httpserver.expect_oneshot_request(uri='/api/folders', method='GET').respond_with_data(response_data=json.dumps([]))
        httpserver.expect_oneshot_request(uri='/api/folders', method='POST').respond_with_data(response_data=json.dumps({'id': 19, 'uid': 'zypaSkX4k', 'title': 'clo', 'url': '/dashboards/f/zypaSkX4k/clo', 'hasAcl': False, 'canSave': True, 'canEdit': True, 'canAdmin': True, 'canDelete': True, 'createdBy': 'Anonymous', 'updatedBy': 'Anonymous','version': 1}))
        httpserver.expect_oneshot_request(uri='/api/folders/zypaSkX4k', method='DELETE').respond_with_data(status=200)

        httpserver.expect_oneshot_request(uri='/api/dashboards/db', method='POST').respond_with_data(response_data=json.dumps({'id': 17, 'slug': 'TestDashboardsPermission', 'status': 'success', 'uid': '0HklGl_Vz', 'url': '/d/0HklGl_Vz/TestDashboardsPermission', 'version': 58}))
        httpserver.expect_oneshot_request(uri='/api/dashboards/uid/0HklGl_Vz', method='DELETE').respond_with_data(response_data=json.dumps({'id': 17, 'message': 'Dashboard Production Overview deleted', 'title': 'Production Overview'}))

        httpserver.expect_oneshot_request(uri='/api/folders/test-folder-permission', method='GET').respond_with_data(response_data=json.dumps({'id': 19, 'uid': 'test-folder-permission', 'title': 'clo', 'url': '/dashboards/f/test-folder-permission/clo', 'hasAcl': False, 'canSave': True, 'canEdit': True, 'canAdmin': True, 'canDelete': True, 'createdBy': 'Anonymous', 'updatedBy': 'Anonymous','version': 1}))
        httpserver.expect_oneshot_request(uri='/api/folders/test-folder-permission', method='DELETE').respond_with_data(status=200)
        
        check_grafana_event["arguments"]["url"] = "localhost:404"  # url connect failed
        check_grafana_event["arguments"]["token"] = self.grafana_token
        response = lambda_function.lambda_handler(check_grafana_event, None)
        print(response)
        assert response["status"] == "FAILED"
        assert response["details"][0]["status"] == "FAILED"
        assert "name" in response["details"][0]
        assert "values" in response["details"][0]
        assert "errorCode" in response["details"][0]

        # Test check status by grafana id - bad case (url connect failed)
        httpserver.clear()
        httpserver.expect_oneshot_request(uri='/api/datasources/name/TestCreateAthenaDatasource', method='GET').respond_with_data(response_data=json.dumps({'message': 'Data source not found'}), status=404)
        httpserver.expect_oneshot_request(uri='/api/datasources', method='POST').respond_with_data(response_data=json.dumps({'datasource': {'id': 98, 'uid': 'BasXA4g_ar', 'name': 'Athena', 'type': 'grafana-athena-datasource'}, 'id': 98, 'message': 'Datasource added', 'name': 'TestCreateAthenaDatasource'}))
        httpserver.expect_oneshot_request(uri='/api/datasources/uid/BasXA4g_ar', method='DELETE').respond_with_data(status=200)

        httpserver.expect_oneshot_request(uri='/api/user/preferences', method='GET').respond_with_data(status=200)

        httpserver.expect_request(uri='/api/plugins/grafana-athena-datasource/settings', method='GET').respond_with_data(response_data=json.dumps({'name': 'Amazon Athena', 'type': 'datasource', 'id': 'grafana-athena-datasource', 'enabled': False, 'pinned': False}))

        httpserver.expect_oneshot_request(uri='/api/folders', method='GET').respond_with_data(response_data=json.dumps([]))
        httpserver.expect_oneshot_request(uri='/api/folders', method='POST').respond_with_data(response_data=json.dumps({'id': 19, 'uid': 'zypaSkX4k', 'title': 'clo', 'url': '/dashboards/f/zypaSkX4k/clo', 'hasAcl': False, 'canSave': True, 'canEdit': True, 'canAdmin': True, 'canDelete': True, 'createdBy': 'Anonymous', 'updatedBy': 'Anonymous','version': 1}))
        httpserver.expect_oneshot_request(uri='/api/folders/zypaSkX4k', method='DELETE').respond_with_data(status=200)

        httpserver.expect_oneshot_request(uri='/api/dashboards/db', method='POST').respond_with_data(response_data=json.dumps({'id': 17, 'slug': 'TestDashboardsPermission', 'status': 'success', 'uid': '0HklGl_Vz', 'url': '/d/0HklGl_Vz/TestDashboardsPermission', 'version': 58}))
        httpserver.expect_oneshot_request(uri='/api/dashboards/uid/0HklGl_Vz', method='DELETE').respond_with_data(response_data=json.dumps({'id': 17, 'message': 'Dashboard Production Overview deleted', 'title': 'Production Overview'}))

        httpserver.expect_oneshot_request(uri='/api/folders/test-folder-permission', method='GET').respond_with_data(response_data=json.dumps({'id': 19, 'uid': 'test-folder-permission', 'title': 'clo', 'url': '/dashboards/f/test-folder-permission/clo', 'hasAcl': False, 'canSave': True, 'canEdit': True, 'canAdmin': True, 'canDelete': True, 'createdBy': 'Anonymous', 'updatedBy': 'Anonymous','version': 1}))
        httpserver.expect_oneshot_request(uri='/api/folders/test-folder-permission', method='DELETE').respond_with_data(status=200)
        
        id = lambda_function.lambda_handler(create_event, None)
        check_grafana_event["arguments"]["id"] = id
        response = lambda_function.lambda_handler(check_grafana_event, None)
        print(response)
        assert response["status"] == "FAILED"
        assert response["details"][0]["status"] == "PASSED"
        assert "name" in response["details"][0]
        assert "values" in response["details"][0]
        assert "errorCode" in response["details"][0]