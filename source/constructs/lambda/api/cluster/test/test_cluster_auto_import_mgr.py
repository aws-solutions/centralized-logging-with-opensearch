# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0


import boto3
from moto import mock_ec2, mock_dynamodb
import os
import pytest
from cluster_auto_import_mgr import ClusterAutoImportManager
from commonlib.model import DomainRelatedResourceEnum
from .conftest import init_ddb


@pytest.fixture
def ddb_client():
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
                                    "VPCId": "test-vpc",
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
                            "privateSubnetIds": "",
                            "securityGroupId": "",
                            "vpcId": "test-vpc",
                        },
                    }
                ],
                os.environ["APP_PIPELINE_TABLE_NAME"]: [],
                os.environ["SVC_PIPELINE_TABLE"]: [],
                os.environ["EKS_CLUSTER_SOURCE_TABLE_NAME"]: [],
            }
        )


def test_check_all_aos_cidr_overlaps(mocker, ddb_client):
    tag = {"key": "testenv", "value": "testval"}
    tags = [tag]
    with mock_ec2():
        ec2 = boto3.client("ec2", region_name="us-west-1")
        # ec2=boto3.resource("ec2", region_name="us-west-1")
        aos_vpc = ec2.create_vpc(CidrBlock="10.0.0.0/16")
        # aos_vpc.Vpc.VpcId
        aos_vpc_id = aos_vpc["Vpc"]["VpcId"]
        aos_subnet_response = ec2.create_subnet(
            VpcId=aos_vpc_id, CidrBlock="10.0.16.0/20", AvailabilityZone="us-west-1a"
        )
        aos_subnets = aos_subnet_response["Subnet"]["SubnetId"]
        aos_subnet_response = ec2.create_subnet(
            VpcId=aos_vpc_id, CidrBlock="10.0.32.0/20", AvailabilityZone="us-west-1b"
        )
        aos_subnets = aos_subnets + "," + aos_subnet_response["Subnet"]["SubnetId"]

        # client = boto3.Session.client('ec2')
        ec2.create_security_group(
            VpcId=aos_vpc_id, GroupName="aos_sg", Description="aos_sg"
        )

        clo_vpc = ec2.create_vpc(CidrBlock="133.0.0.0/16")
        clo_vpc_id = clo_vpc["Vpc"]["VpcId"]
        clo_subnet_response = ec2.create_subnet(
            VpcId=clo_vpc_id, CidrBlock="133.0.16.0/24", AvailabilityZone="us-west-1a"
        )
        clo_subnet1_id = clo_subnet_response["Subnet"]["SubnetId"]
        clo_subnets = clo_subnet1_id

        clo_subnet_response = ec2.create_subnet(
            VpcId=clo_vpc_id, CidrBlock="133.0.32.0/24", AvailabilityZone="us-west-1b"
        )
        clo_subnet2_id = clo_subnet_response["Subnet"]["SubnetId"]
        clo_subnets = clo_subnets + "," + clo_subnet2_id

        ec2.create_security_group(
            VpcId=clo_vpc_id, GroupName="clo_sg", Description="clo_sg"
        )
        es_resp = {
            "DomainStatus": {
                "VPCOptions": {
                    "VPCId": aos_vpc_id,
                    "SubnetIds": aos_subnets,
                    "SecurityGroupIds": ["aos_sg"],
                }
            }
        }
        ip_permissions = [
            {
                "FromPort": 443,
                "IpProtocol": "tcp",
                "IpRanges": [
                    {
                        "CidrIp": "133.0.0.0/16",
                        "Description": "test rule",
                    },
                ],
                "ToPort": 443,
            },
        ]
        response = ec2.authorize_security_group_ingress(
            GroupId="aos_sg",
            IpPermissions=ip_permissions,
            DryRun=False,
        )
        cluster_auto_import_mgr = ClusterAutoImportManager(
            tags, ec2, es_resp, clo_vpc_id, "clo_sg", clo_subnets
        )

        for resource_type in DomainRelatedResourceEnum:
            if resource_type != DomainRelatedResourceEnum.AOS_ROUTES:
                cluster_auto_import_mgr.record_updated_resource(resource_type)
        cluster_auto_import_mgr.validate_nacl()
        cluster_auto_import_mgr.validate_aos_vpc_routing()
        cluster_auto_import_mgr.validate_solution_vpc_routing()
        cluster_auto_import_mgr.get_vpc_peering_connections()
        cluster_auto_import_mgr.create_sg_rule()
        cluster_auto_import_mgr.delete_sg_rule()
        cluster_auto_import_mgr.get_route_table_ids(aos_vpc_id, aos_subnets.split(","))
        cluster_auto_import_mgr.create_vpc_peering_connection()
        cluster_auto_import_mgr.delete_vpc_peering_connection(
            cluster_auto_import_mgr.vpc_peering_connection_id
        )
        cluster_auto_import_mgr.delete_solution_route()
        cluster_auto_import_mgr.delete_sg_rule()
        cluster_table = boto3.resource("dynamodb").Table(os.environ["CLUSTER_TABLE"])
        cluster_auto_import_mgr.get_domain_related_resources(
            "40485c141648f8d0acbbec6eda19a4a7", cluster_table
        )
        cluster_auto_import_mgr.reverse_domain_related_resources(
            "40485c141648f8d0acbbec6eda19a4a7", False, cluster_table
        )
        cluster_auto_import_mgr.reverse_domain_related_resources(
            "40485c141648f8d0acbbec6eda19a4a7", True, cluster_table
        )


@pytest.fixture()
def ec2_client():
    with mock_ec2():
        boto3.client("ec2", region_name=os.environ.get("AWS_REGION"))

        yield


def test_validate_route_table_with_active_route_in_subnet(ec2_client):
    ec2 = boto3.client("ec2", region_name="us-west-1")
    aos_vpc = ec2.create_vpc(CidrBlock="10.0.0.0/16")
    # aos_vpc.Vpc.VpcId
    aos_vpc_id = aos_vpc["Vpc"]["VpcId"]
    aos_subnet_response = ec2.create_subnet(
        VpcId=aos_vpc_id, CidrBlock="10.0.16.0/20", AvailabilityZone="us-west-1a"
    )
    aos_subnets = aos_subnet_response["Subnet"]["SubnetId"]
    aos_subnet_response = ec2.create_subnet(
        VpcId=aos_vpc_id, CidrBlock="10.0.32.0/20", AvailabilityZone="us-west-1b"
    )
    aos_subnets = aos_subnets + "," + aos_subnet_response["Subnet"]["SubnetId"]

    ec2.create_security_group(
        VpcId=aos_vpc_id, GroupName="aos_sg", Description="aos_sg"
    )

    clo_vpc = ec2.create_vpc(CidrBlock="133.0.0.0/16")
    clo_vpc_id = clo_vpc["Vpc"]["VpcId"]
    clo_subnet_response = ec2.create_subnet(
        VpcId=clo_vpc_id, CidrBlock="133.0.16.0/24", AvailabilityZone="us-west-1a"
    )
    clo_subnet1_id = clo_subnet_response["Subnet"]["SubnetId"]
    clo_subnets = clo_subnet1_id
    response = ec2.create_vpc_peering_connection(
        VpcId=aos_vpc_id, PeerVpcId=clo_vpc_id, PeerRegion="us-west-1"
    )

    clo_subnet_response = ec2.create_subnet(
        VpcId=clo_vpc_id, CidrBlock="133.0.32.0/24", AvailabilityZone="us-west-1b"
    )
    clo_subnet2_id = clo_subnet_response["Subnet"]["SubnetId"]
    clo_subnets = clo_subnets + "," + clo_subnet2_id

    ec2.create_security_group(
        VpcId=clo_vpc_id, GroupName="clo_sg", Description="clo_sg"
    )
    es_resp = {
        "DomainStatus": {
            "VPCOptions": {
                "VPCId": aos_vpc_id,
                "SubnetIds": aos_subnets,
                "SecurityGroupIds": ["aos_sg"],
            }
        }
    }
    ip_permissions = [
        {
            "FromPort": 443,
            "IpProtocol": "tcp",
            "IpRanges": [
                {
                    "CidrIp": "133.0.0.0/16",
                    "Description": "test rule",
                },
            ],
            "ToPort": 443,
        },
    ]
    ec2.authorize_security_group_ingress(
        GroupId="aos_sg",
        IpPermissions=ip_permissions,
        DryRun=False,
    )
    tag = {"key": "testenv", "value": "testval"}
    tags = [tag]
    cluster_auto_import_mgr = ClusterAutoImportManager(
        tags, ec2, es_resp, clo_vpc_id, "clo_sg", clo_subnets
    )
    route_table_ids = cluster_auto_import_mgr.get_main_route_table_id(aos_vpc_id)
    for route_table_id in route_table_ids:
        ec2.create_route(
            RouteTableId=route_table_id,
            VpcPeeringConnectionId=response["VpcPeeringConnection"][
                "VpcPeeringConnectionId"
            ],
            DestinationCidrBlock="0.0.0.0/0",
        )

    aos_vpc_response = cluster_auto_import_mgr.get_vpc_response(aos_vpc_id)
    cluster_auto_import_mgr.vpc_peering_connection_id = response[
        "VpcPeeringConnection"
    ]["VpcPeeringConnectionId"]
    result = cluster_auto_import_mgr.validate_route_tables(
        aos_vpc_id,
        [aos_subnet_response["Subnet"]["SubnetId"]],
        aos_vpc_response["Vpcs"][0]["CidrBlock"],
    )
    assert result == True
