# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0
import os
import json
import boto3
import pytest

from copy import deepcopy
from moto import mock_dynamodb, mock_eks, mock_sts, mock_iam
from .test_eks_constants import (
    ClusterInputs,
)


@pytest.fixture
def import_eks_cluster_event():
    with open("test/event/test_event.json", "r") as f:
        event = json.load(f)
        event["arguments"] = {
            "aosDomainId": "fcb4130d5f23c9958c31e356d183d29d",
            "deploymentKind": "Sidecar",
            "eksClusterName": "eks-demo",

        }
        event["info"]["fieldName"] = "importEKSCluster"
        # print(event)
        return event


@pytest.fixture
def list_eks_cluster_names_event():
    with open("test/event/test_event.json", "r") as f:
        event = json.load(f)
        event["arguments"] = {"nextToken": "", "isListAll": True}
        event["info"]["fieldName"] = "listEKSClusterNames"
        # print(event)
        return event


@pytest.fixture
def list_imported_eks_clusters_event():
    with open("test/event/test_event.json", "r") as f:
        event = json.load(f)
        event["arguments"] = {"page": 1, "count": 10}
        event["info"]["fieldName"] = "listImportedEKSClusters"
        # print(event)
        return event


@pytest.fixture
def remove_eks_cluster_event():
    with open("test/event/test_event.json", "r") as f:
        event = json.load(f)
        event["arguments"] = {"id": "not-exist"}
        event["info"]["fieldName"] = "removeEKSCluster"
        # print(event)
        return event


@pytest.fixture
def ddb_client():
    with mock_dynamodb():
        region = 'us-west-2'
        eks_cluster_log_source_table_name = "LogHub-EKSClusterLogSourceTable"
        log_agent_eks_deployment_kind_table_name = "LogHub-LogAgentEKSDeploymentKindTable"
        app_log_pipeline_table_name = "LogHub-AppPipelineTable"
        aos_domain_table_name = "LogHub-ClusterTable"
        app_log_ingestion_table = 'APP_LOG_INGESTION_TABLE'

        os.environ["AWS_REGION"] = region
        os.environ["EKS_CLUSTER_LOG_SOURCE_TABLE"] = eks_cluster_log_source_table_name
        os.environ["LOG_AGENT_EKS_DEPLOYMENT_KIND_TABLE"] = log_agent_eks_deployment_kind_table_name
        os.environ["APP_LOG_PIPELINE_TABLE"] = app_log_pipeline_table_name
        os.environ["AOS_DOMAIN_TABLE"] = aos_domain_table_name
        os.environ["APP_LOG_INGESTION_TABLE"] = app_log_ingestion_table

        ddb = boto3.resource("dynamodb", region_name=region)
        # eks cluster log source table
        ddb.create_table(
            TableName=eks_cluster_log_source_table_name,
            KeySchema=[{"AttributeName": "id", "KeyType": "HASH"}],
            AttributeDefinitions=[{"AttributeName": "id", "AttributeType": "S"}],
            ProvisionedThroughput={"ReadCapacityUnits": 5, "WriteCapacityUnits": 5},
        )

        # log agent eks deployment kind table
        ddb.create_table(
            TableName=log_agent_eks_deployment_kind_table_name,
            KeySchema=[{"AttributeName": "id", "KeyType": "HASH"}],
            AttributeDefinitions=[{"AttributeName": "id", "AttributeType": "S"}],
            ProvisionedThroughput={"ReadCapacityUnits": 5, "WriteCapacityUnits": 5},
        )

        # app log pipeline table
        ddb.create_table(
            TableName=app_log_pipeline_table_name,
            KeySchema=[{"AttributeName": "id", "KeyType": "HASH"}],
            AttributeDefinitions=[{"AttributeName": "id", "AttributeType": "S"}],
            ProvisionedThroughput={"ReadCapacityUnits": 5, "WriteCapacityUnits": 5},
        )

        # app log ingestion
        ddb.create_table(
            TableName=app_log_ingestion_table,
            KeySchema=[{"AttributeName": "id", "KeyType": "HASH"}],
            AttributeDefinitions=[{"AttributeName": "id", "AttributeType": "S"}],
            ProvisionedThroughput={"ReadCapacityUnits": 5, "WriteCapacityUnits": 5},
        )

        # AOS Domain table
        ddb.create_table(
            TableName=aos_domain_table_name,
            KeySchema=[{"AttributeName": "id", "KeyType": "HASH"}],
            AttributeDefinitions=[{"AttributeName": "id", "AttributeType": "S"}],
            ProvisionedThroughput={"ReadCapacityUnits": 5, "WriteCapacityUnits": 5},
        )
        table = ddb.Table(aos_domain_table_name)
        table.put_item(Item={
            "id": "fcb4130d5f23c9958c31e356d183d29d",
            "accountId": "1234567890AB",
            "alarmStatus": "DISABLED",
            "domainArn": "arn:aws:es:us-west-2:1234567890AB:domain/wch-private",
            "domainName": "wch-private",
            "endpoint": "vpc-private-hbgb2ktamqnb5cedzrty3blelu.us-west-2.es.amazonaws.com",
            "engine": "OpenSearch",
            "importedDt": "2022-01-21T06:43:08Z",
            "proxyStatus": "DISABLED",
            "region": "us-west-2",
            "tags": [],
            "version": "1.1",
            "vpc": {
                "privateSubnetIds": "subnet-01f09e14e5b70c11f,subnet-06843d01e3da35b7d",
                "publicSubnetIds": "",
                "securityGroupId": "sg-0ec6c9b448792d1e6",
                "vpcId": "vpc-05a90814226d2c713"
            }
        })

        ddb.create_table(
            TableName=os.environ.get("SUB_ACCOUNT_LINK_TABLE_NAME"),
            KeySchema=[{"AttributeName": "id", "KeyType": "HASH"}],
            AttributeDefinitions=[{"AttributeName": "id", "AttributeType": "S"}],
            ProvisionedThroughput={"ReadCapacityUnits": 5, "WriteCapacityUnits": 5},
        )

        yield


@pytest.fixture
def sts_client():
    with mock_sts():
        boto3.client("sts", region_name=os.environ.get("AWS_REGION"))
        yield


@pytest.fixture
def eks_client():
    with mock_eks():
        region = os.environ.get("AWS_REGION")
        eks = boto3.client('eks', region_name=region)

        values = deepcopy(ClusterInputs.REQUIRED)
        values.extend(deepcopy(ClusterInputs.OPTIONAL))
        kwargs = dict(values)

        eks.create_cluster(
            name='eks-demo', **kwargs
        )
        yield


@pytest.fixture
def iam_client():
    with mock_iam():
        region = os.environ.get("AWS_REGION")
        iam = boto3.client('iam', region_name=region)
        iam.create_open_id_connect_provider(
            Url="https://example.com",
            # even it is required to provide at least one thumbprint, AWS accepts an empty list
            ThumbprintList=['9e99a48a9960b14926bb7f3b02e22da2b0ab7280'],
        )
        yield


def teardown_module():
    if os.environ.get('AWS_REGION'):
        del os.environ['AWS_REGION']


class TestEksClusterManager():

    @mock_sts
    def test_lambda_function(
        self, eks_client, ddb_client, iam_client, remove_eks_cluster_event, list_eks_cluster_names_event,
        list_imported_eks_clusters_event, import_eks_cluster_event

    ):
        import lambda_function
        result = lambda_function.lambda_handler(list_eks_cluster_names_event, None)
        assert 'clusters' in result

        # start with empty list
        result = lambda_function.lambda_handler(list_imported_eks_clusters_event, None)
        assert result["total"] == 0

        # import a eks cluster
        eks_id = lambda_function.lambda_handler(import_eks_cluster_event, None)
        # Expect Execute successfully.
        assert eks_id != ''

        data = {
            "arguments": {
                "eksClusterId": eks_id
            },
            "info": {
                "fieldName": "getEKSClusterDetails",
            }
        }
        result = lambda_function.lambda_handler(data, None)
        assert "deploymentKind" in result

        # list again
        result = lambda_function.lambda_handler(list_imported_eks_clusters_event, None)
        assert result["total"] == 1
        eksClusterLogSourceList = result["eksClusterLogSourceList"]
        assert len(eksClusterLogSourceList) == 1
        assert "deploymentKind" in eksClusterLogSourceList[0]
        assert "engine" in eksClusterLogSourceList[0]['aosDomain']

        # delete an non-existing one
        with pytest.raises(lambda_function.APIException):
            lambda_function.lambda_handler(remove_eks_cluster_event, None)

        # delete a real one
        remove_eks_cluster_event["arguments"]["id"] = eks_id
        result = lambda_function.lambda_handler(remove_eks_cluster_event, None)
        assert result == "OK"

        # list again.
        result = lambda_function.lambda_handler(list_imported_eks_clusters_event, None)
        assert result["total"] == 0
