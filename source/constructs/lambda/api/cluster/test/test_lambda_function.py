# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import os
import sys
import json
import boto3
import pytest
from moto import (
    mock_dynamodb,
    mock_stepfunctions,
    mock_es,
    mock_ec2,
    mock_cloudwatch,
    mock_sts,
)
from .conftest import init_ddb, make_graphql_lambda_event

from commonlib.model import DomainStatusCheckItem, DomainStatusCheckType
from commonlib.exception import ErrorCode


sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


@pytest.fixture
def sfn_client():
    with mock_stepfunctions():
        sfn = boto3.client("stepfunctions", region_name=os.environ.get("AWS_REGION"))
        response = sfn.create_state_machine(
            name="SolutionAOSProxy",
            definition=json.dumps(
                {
                    "Comment": "A Hello World example of the Amazon States Language using Pass states",
                    "StartAt": "Hello",
                    "States": {
                        "Hello": {"Type": "Pass", "Result": "World", "End": True}
                    },
                }
            ),
            roleArn="arn:aws:iam::123456789012:role/Solution-SolutionAPIClusterFlowSMSMRole",
        )
        os.environ["STATE_MACHINE_ARN"] = response["stateMachineArn"]

        yield


@pytest.fixture
def sts_client():
    with mock_sts():
        boto3.client("sts", region_name=os.environ.get("AWS_REGION"))
        yield


@pytest.fixture
def cw_client():
    with mock_cloudwatch():
        boto3.client("cloudwatch", region_name=os.environ.get("AWS_REGION"))
        yield


@pytest.fixture()
def ec2_client():
    with mock_ec2():
        ec2 = boto3.client("ec2", region_name=os.environ.get("AWS_REGION"))

        # Mock the solution vpc
        vpc = ec2.create_vpc(CidrBlock="18.0.0.0/16")
        vpc_id = vpc["Vpc"]["VpcId"]
        os.environ["SOLUTION_VPC_ID"] = vpc_id
        print(os.environ["SOLUTION_VPC_ID"])

        subnet_resp = ec2.create_subnet(
            CidrBlock="18.0.128.0/20", VpcId=vpc_id, AvailabilityZone="us-west-2a"
        )
        subnet_id = subnet_resp["Subnet"]["SubnetId"]
        os.environ["SOLUTION_SUBNET_IDS"] = subnet_id
        print(subnet_id)

        sg_resp = ec2.create_security_group(
            Description="Test security group", GroupName="es-sg", VpcId=vpc_id
        )
        sg_id = sg_resp["GroupId"]
        os.environ["SOLUTION_SG_ID"] = sg_id
        print(sg_id)

        yield


@pytest.fixture
def ddb_client(ec2_client):
    with mock_dynamodb():
        yield init_ddb(
            {
                os.environ["CLUSTER_TABLE"]: [
                    {
                        "id": "40485c141648f8d0acbbec6eda19a4a7",
                        "accountId": "123456789012",
                        "alarmStatus": "DISABLED",
                        "domainInfo": {
                            "DomainStatus": {
                                "VPCOptions": {
                                    "AvailabilityZones": ["us-west-2a"],
                                    "SecurityGroupIds": ["sg-0376256bac9c37758"],
                                    "SubnetIds": ["subnet-03222ad333be76361"],
                                    "VPCId": os.environ["SOLUTION_VPC_ID"],
                                }
                            }
                        },
                        "domainArn": "arn:aws:es:us-west-2:123456789012:domain/solution-aos",
                        "domainName": "solution-aos",
                        "endpoint": "vpc-solution-aos-rckjrxo5icri37ro3eq2tac4di.us-west-2.es.amazonaws.com",
                        "engine": "OpenSearch",
                        "importedDt": "2022-07-14T12:54:17Z",
                        "proxyStatus": "DISABLED",
                        "region": "us-west-2",
                        "tags": [],
                        "version": "1.2",
                        "status": "ACTIVE",
                        "vpc": {
                            "privateSubnetIds": os.environ["SOLUTION_SUBNET_IDS"],
                            "securityGroupId": os.environ["SOLUTION_SG_ID"],
                            "vpcId": os.environ["SOLUTION_VPC_ID"],
                        },
                    },
                    {
                        "id": "251a869fd6db1da8326f95d9c22372e1",
                        "accountId": "123456789012",
                        "alarmStatus": "DISABLED",
                        "domainArn": "arn:aws:es:us-west-2:123456789012:domain/aos-inactive",
                        "domainName": "aos-inactive",
                        "endpoint": "vpc-aos-inactive-rckjrxo5icri37ro3eq2tac4di.us-west-2.es.amazonaws.com",
                        "engine": "OpenSearch",
                        "importedDt": "2022-05-14T10:34:27Z",
                        "proxyStatus": "DISABLED",
                        "region": "us-west-2",
                        "tags": [],
                        "version": "1.2",
                        "status": "INACTIVE",
                        "vpc": {
                            "privateSubnetIds": os.environ["SOLUTION_SUBNET_IDS"],
                            "securityGroupId": os.environ["SOLUTION_SG_ID"],
                            "vpcId": os.environ["SOLUTION_VPC_ID"],
                        },
                    },
                ],
                os.environ["APP_PIPELINE_TABLE_NAME"]: [],
                os.environ["SVC_PIPELINE_TABLE"]: [],
                os.environ["EKS_CLUSTER_SOURCE_TABLE_NAME"]: [],
            }
        )


@pytest.fixture
def es_client():
    with mock_es():
        es_client = boto3.client("es", region_name=os.environ.get("AWS_REGION"))
        es = es_client.create_elasticsearch_domain(
            DomainName="solution-aos",
            ElasticsearchVersion="1.2",
            ElasticsearchClusterConfig={
                "InstanceType": "r6g.xlarge.search",
                "InstanceCount": 1,
                "DedicatedMasterEnabled": False,
                "ZoneAwarenessEnabled": False,
                "ZoneAwarenessConfig": {"AvailabilityZoneCount": 1},
                "WarmEnabled": False,
                "ColdStorageOptions": {"Enabled": False},
            },
            EBSOptions={
                "EBSEnabled": True,
                "VolumeType": "standard",
                "VolumeSize": 10,
            },
            AccessPolicies="string",
            VPCOptions={
                "SubnetIds": [os.environ["SOLUTION_SUBNET_IDS"]],
                "SecurityGroupIds": [os.environ["SOLUTION_SG_ID"]],
            },
            CognitoOptions={
                "Enabled": True,
            },
            EncryptionAtRestOptions={"Enabled": False},
            NodeToNodeEncryptionOptions={"Enabled": False},
            DomainEndpointOptions={
                "EnforceHTTPS": True,
                "TLSSecurityPolicy": "Policy-Min-TLS-1-2-2019-07",
                "CustomEndpointEnabled": False,
            },
        )
        VPCOptions = es["DomainStatus"]["VPCOptions"]
        VPCOptions["VPCId"] = (os.environ["SOLUTION_VPC_ID"],)
        es["DomainStatus"]["VPCOptions"] = VPCOptions
        yield es


def test_list_domain_names(sts_client, ddb_client, sfn_client, es_client):
    from lambda_function import lambda_handler, DomainStatus

    res = lambda_handler(
        make_graphql_lambda_event("listDomainNames", {"region": "us-west-2"}), None
    )
    assert res["domainNames"] == [
        {"domainName": "solution-aos", "status": DomainStatus.ACTIVE}
    ]


def test_list_imported_domains(
    sts_client, ddb_client, cw_client, sfn_client, es_client
):
    import lambda_function

    res = lambda_function.lambda_handler(
        make_graphql_lambda_event("listImportedDomains", {"metrics": True}), None
    )
    assert res[0]["id"] == "40485c141648f8d0acbbec6eda19a4a7"


def test_get_domain_vpc(sts_client, ddb_client, sfn_client, es_client):
    import lambda_function
    from unittest.mock import patch

    with patch("boto3.client"):
        with patch("boto3.client.describe_elasticsearch_domain"):
            res = lambda_function.lambda_handler(
                make_graphql_lambda_event(
                    "getDomainVpc", {"region": "us-west-2", "domainName": "solution-aos"}
                ),
                None,
            )
            assert res["vpcId"]


def test_get_domain_details(sts_client, ddb_client, sfn_client, es_client):
    import lambda_function
    from unittest.mock import patch

    with patch("boto3.client"):
        with patch("boto3.client.describe_elasticsearch_domain"):
            res = lambda_function.lambda_handler(
                make_graphql_lambda_event(
                    "getDomainDetails", {"id": "40485c141648f8d0acbbec6eda19a4a7"}
                ),
                None,
            )
            assert res["id"] == "40485c141648f8d0acbbec6eda19a4a7"

# Due to the complexity of the mock environment, we will not perform unit tests for the removedomain function.
# def test_remove_domain(sts_client, sfn_client, ddb_client):
#     import lambda_function
#     from unittest.mock import patch

#     with patch("boto3.client"):
#         with patch("boto3.client.describe_elasticsearch_domain"):
#             res = lambda_function.lambda_handler(
#                 make_graphql_lambda_event(
#                     "removeDomain",
#                     {"id": "40485c141648f8d0acbbec6eda19a4a7", "isReverseConf": False},
#                 ),
#                 None,
#             )
#             assert res == "OK"
#             domain_info = lambda_function.get_domain_by_id(
#                 "40485c141648f8d0acbbec6eda19a4a7"
#             )
#             assert domain_info["status"] == "INACTIVE"


def test_delete_proxy_for_opensearch(sts_client, sfn_client, ddb_client):
    import lambda_function

    res = lambda_function.lambda_handler(
        make_graphql_lambda_event(
            "deleteProxyForOpenSearch", {"id": "40485c141648f8d0acbbec6eda19a4a7"}
        ),
        None,
    )
    assert res == "OK"


def test_create_proxy_for_opensearch(sts_client, sfn_client, ddb_client):
    input = {
        "customEndpoint": "sfsdf.com",
        "cognitoEndpoint": "",
        "vpc": {
            "securityGroupId": "sg-0f258ab8072eda13b",
            "publicSubnetIds": "subnet-09410bb997e4670e1,subnet-000aacaafe251a70c",
            "privateSubnetIds": "subnet-04f5c7724b23a0458,subnet-02d8be2eeaa198079",
            "vpcId": "vpc-0d4784f4acdc470ff",
        },
        "certificateArn": "arn:aws:acm:us-west-2:123456789012:certificate/525ca843-4f47-45c2-9e57-38979df03339",
        "keyName": "oregon",
        "proxyInstanceType": "t2.micro",
        "proxyInstanceNumber": "1",
    }

    import lambda_function

    res = lambda_function.lambda_handler(
        make_graphql_lambda_event(
            "createProxyForOpenSearch",
            {
                "id": "40485c141648f8d0acbbec6eda19a4a7",
                "input": input,
                "stack_type": "Proxy",
            },
        ),
        None,
    )
    assert res == "OK"


def test_delete_alarm_for_opensearch(sts_client, sfn_client, ddb_client):
    import lambda_function

    res = lambda_function.lambda_handler(
        make_graphql_lambda_event(
            "deleteAlarmForOpenSearch",
            {"id": "40485c141648f8d0acbbec6eda19a4a7", "stack_type": "Alarm"},
        ),
        None,
    )
    assert res == "OK"


def test_create_alarm_for_opensearch(sts_client, sfn_client, ddb_client):
    input = {
        "email": "test@example.com",
        "phone": "",
        "alarms": [{"type": "CLUSTER_RED", "value": "true"}],
    }

    import lambda_function

    res = lambda_function.lambda_handler(
        make_graphql_lambda_event(
            "createAlarmForOpenSearch",
            {
                "id": "40485c141648f8d0acbbec6eda19a4a7",
                "input": input,
                "stack_type": "Alarm",
            },
        ),
        None,
    )
    assert res == "OK"


def test_domain_network_connection(sts_client, sfn_client, ddb_client):
    import util.cluster_status_check_helper as cluster_check_helper

    # Check the clean_check_result function
    details = []

    # mock for in the same vpc, so there is not peering
    cluster_check_helper.record_check_detail(
        details,
        True,
        DomainStatusCheckItem.VPC_PEERING,
        None,
        ErrorCode.VPC_PEERING_CHECK_FAILED.name,
    )

    cluster_check_helper.record_check_detail(
        details,
        False,
        DomainStatusCheckItem.DOMAIN_ENGINE,
        "ElasticSearch",
        ErrorCode.UNSUPPORTED_DOMAIN_ENGINE.name,
    )

    cluster_check_helper.record_check_detail(
        details,
        True,
        DomainStatusCheckItem.DOMAIN_VERSION,
        "v2.3.0",
        ErrorCode.OLD_DOMAIN_VERSION.name,
    )

    status, cleaned_detail = cluster_check_helper.clean_check_result(details)
    print(cleaned_detail)
    assert status == DomainStatusCheckType.FAILED
    assert cleaned_detail == [
        {
            "name": "OpenSearchDomainEngine",
            "values": ["ElasticSearch"],
            "errorCode": "UNSUPPORTED_DOMAIN_ENGINE",
            "status": "FAILED",
        },
        {
            "name": "OpenSearchDomainVersion",
            "values": ["v2.3.0"],
            "errorCode": None,
            "status": "PASSED",
        },
    ]

    check_result = cluster_check_helper.validate_domain_version("2.5")
    assert check_result

    check_result = cluster_check_helper.validate_domain_version("1.2")
    assert check_result is False

    check_result = cluster_check_helper.validate_domain_engine("Elasticsearch")
    assert check_result is False

    check_result = cluster_check_helper.validate_domain_engine("OpenSearch")
    assert check_result
