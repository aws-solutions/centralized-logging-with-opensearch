# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

from typing import List
from commonlib.dao import OpenSearchDomainDao
from commonlib.logging import get_logger
import os
import time
from datetime import datetime

import boto3
import ipaddr
from botocore.exceptions import ClientError

from commonlib.model import DomainImportStatusEnum, Resource, ResourceStatus
from commonlib import AWSConnection
from commonlib.exception import APIException, ErrorCode
from commonlib.model import DomainRelatedResourceEnum

logger = get_logger(__name__)

conn = AWSConnection()

default_region = os.environ.get("AWS_REGION")

solution_vpc_id = os.environ.get("DEFAULT_VPC_ID")
solution_sg_id = os.environ.get("DEFAULT_SG_ID")
solution_private_subnet_ids_str = os.environ.get("DEFAULT_PRIVATE_SUBNET_IDS")
ec2 = conn.get_client("ec2")

stack_prefix = os.environ.get("STACK_PREFIX", "CL")
description = stack_prefix + " Processing Rule"
data_format = "%Y-%m-%dT%H:%M:%SZ"


ASSOCIATION_SUBNET_ID = "association.subnet-id"


class ClusterAutoImportManager:
    """
    Currently do not consider processing ipv6 scenarios
    """

    anywhere_ipv4 = "0.0.0.0/0"

    def __init__(
        self,
        tags: None,
        ec2: boto3.Session.client,
        es_resp,
        solution_vpc_id: str,
        solution_sg_id: str,
        solution_private_subnet_ids_str: str,
    ):
        self.set_tags(tags)
        self.ec2 = ec2
        self.set_vpc_details(es_resp)
        self.solution_vpc_id = solution_vpc_id
        self.solution_sg_id = solution_sg_id
        self.set_solution_subnet_ids(solution_private_subnet_ids_str)
        self.is_same_vpc = True
        self.set_vpc_peering_and_related_resources()

        if self.aos_vpc_id != self.solution_vpc_id:
            self.process_different_vpcs()
        else:
            self.process_same_vpcs()

        # obtain aos_vpc_subnet_ids from 'ec2.describe_subnets' API
        self.aos_vpc_subnet_ids = self.get_vpc_subnets(vpc_id=self.aos_vpc_id)

    def set_tags(self, tags):
        self.tags = [
            {
                "Key": tag["key"],
                "Value": tag["value"],
            }
            for tag in tags or []
        ]

    def set_vpc_details(self, es_resp):
        es_vpc = es_resp["DomainStatus"]["VPCOptions"]
        self.aos_vpc_id = es_vpc["VPCId"]
        self.aos_subnet_ids = es_vpc["SubnetIds"]
        self.aos_sg_ids = es_vpc["SecurityGroupIds"]
        self.aos_network_acl_id = (
            None  # will be set value when calling 'validate_nacl()'
        )

    def set_solution_subnet_ids(self, solution_private_subnet_ids_str):
        self.solution_private_subnet_ids_str = solution_private_subnet_ids_str
        self.solution_private_subnet_ids = self.solution_private_subnet_ids_str.split(
            ","
        )

    def set_vpc_peering_and_related_resources(self):
        self.vpc_peering_connection_id = None
        self.domain_related_resources = []

    def process_different_vpcs(self):
        self.is_same_vpc = False
        self.vpc_peering_connection_status = None
        self.solution_vpc_subnet_ids = self.get_vpc_subnets(vpc_id=self.solution_vpc_id)
        self.set_cidr_block_for_diff_vpcs()
        self.vpc_peering_retry = 0

    def process_same_vpcs(self):
        self.set_cidr_block_for_same_vpc()

    def set_cidr_block_for_diff_vpcs(self):
        vpc_ids = [self.aos_vpc_id, self.solution_vpc_id]
        for vpc_id in vpc_ids:
            response = self.get_vpc_response(vpc_id)
            cidr_block = response["Vpcs"][0]["CidrBlock"]
            if vpc_id == self.aos_vpc_id:
                self.aos_cidr_block = cidr_block
            else:
                self.solution_cidr_block = cidr_block
        if not self.check_cidr_overlaps(self.aos_cidr_block, self.solution_cidr_block):
            raise APIException(
                ErrorCode.IMPORT_OPENSEARCH_DOMAIN_FAILED,
                "VPC CIDR is conflict with AOS VPC!",
            )

    def set_cidr_block_for_same_vpc(self):
        response = self.get_vpc_response(self.aos_vpc_id)
        self.aos_cidr_block = response["Vpcs"][0]["CidrBlock"]
        self.solution_cidr_block = self.aos_cidr_block

    def get_vpc_response(self, vpc_id):
        try:
            response = self.ec2.describe_vpcs(VpcIds=[vpc_id], DryRun=False)
        except ClientError as e:
            logger.error(e)
            raise e
        if "Vpcs" not in response or not response["Vpcs"]:
            raise APIException(
                ErrorCode.ITEM_NOT_FOUND,
                f"the VPC is Not Found, id is {vpc_id}",
            )
        return response

    def check_cidr_overlaps(self, aos_cidr: str, solution_cidr: str):
        """
        Using ipaddr lib to check: True is Pass
        """
        aos_network = ipaddr.IPNetwork(aos_cidr)
        solution_network = ipaddr.IPNetwork(solution_cidr)
        if not aos_network.overlaps(solution_network) and not solution_network.overlaps(
            aos_network
        ):
            return True
        else:
            return False

    def validate_same_vpc(self):
        """
        Check if it is the same vpc, return True if the same
        """
        return self.is_same_vpc

    def is_valid_rule(self, sg_rule):
        return (
            sg_rule["IsEgress"] is False
            and (sg_rule["IpProtocol"] == "tcp" or sg_rule["IpProtocol"] == "-1")
            and (sg_rule["FromPort"] <= 443)
            and (sg_rule["ToPort"] >= 443)
        )

    def is_same_vpc_rule(self, sg_rule):
        if "ReferencedGroupInfo" in sg_rule:
            return sg_rule["ReferencedGroupInfo"]["GroupId"] == self.solution_sg_id
        elif "CidrIpv4" in sg_rule:
            return sg_rule["CidrIpv4"] == ClusterAutoImportManager.anywhere_ipv4
        return False

    def is_different_vpc_rule(self, sg_rule):
        return "CidrIpv4" in sg_rule and (
            sg_rule["CidrIpv4"] == self.solution_cidr_block
            or sg_rule["CidrIpv4"] == ClusterAutoImportManager.anywhere_ipv4
        )

    def validate_sg(self):
        response = self.ec2.describe_security_group_rules(
            Filters=[
                {
                    "Name": "group-id",
                    "Values": self.aos_sg_ids,
                }
            ],
            DryRun=False,
        )
        if "SecurityGroupRules" not in response:
            return False

        sg_rules = response["SecurityGroupRules"]
        same_vpc = self.validate_same_vpc()

        for sg_rule in sg_rules:
            if not self.is_valid_rule(sg_rule):
                continue
            if (same_vpc and self.is_same_vpc_rule(sg_rule)) or (
                not same_vpc and self.is_different_vpc_rule(sg_rule)
            ):
                return True
        return False

    def is_valid_port_range(self, entry):
        return (
            "PortRange" in entry
            and entry["PortRange"]["From"] <= 443
            and entry["PortRange"]["To"] >= 443
        )

    def is_valid_egress(self, entry):
        return entry["Egress"] is False

    def is_valid_cidrblock(self, entry):
        return (
            entry["CidrBlock"] == ClusterAutoImportManager.anywhere_ipv4
            or entry["CidrBlock"] == self.solution_cidr_block
        )

    def is_valid_protocol(self, entry):
        return entry["Protocol"] == "-1" or entry["Protocol"] == "6"

    def is_allowed_action(self, entry):
        return entry["RuleAction"] == "allow"

    def validate_nacl(self):
        response = self.ec2.describe_network_acls(
            Filters=[
                {"Name": ASSOCIATION_SUBNET_ID, "Values": self.aos_vpc_subnet_ids},
                {"Name": "vpc-id", "Values": [self.aos_vpc_id]},
            ],
            DryRun=False,
        )

        if "NetworkAcls" not in response:
            return False

        for nacl in response["NetworkAcls"]:
            self.update_acl_id(nacl)
            if self.validate_entries(nacl):
                return True

        return False

    def update_acl_id(self, nacl):
        if "NetworkAclId" in nacl:
            self.aos_network_acl_id = nacl["NetworkAclId"]

    def validate_entries(self, nacl):
        if "Entries" in nacl:
            for entry in nacl["Entries"]:
                if self.is_entry_valid(entry):
                    return True
        return False

    def is_entry_valid(self, entry):
        return (
            self.is_valid_egress(entry)
            and self.is_valid_cidrblock(entry)
            and self.is_valid_protocol(entry)
            and self.is_allowed_action(entry)
            and (self.is_valid_port_range(entry) or entry["Protocol"] == "-1")
        )

    def validate_aos_vpc_routing(self):
        return self.validate_routing(
            self.aos_vpc_id, self.aos_subnet_ids, self.solution_cidr_block
        )

    def validate_solution_vpc_routing(self):
        return self.validate_routing(
            self.solution_vpc_id, self.solution_private_subnet_ids, self.aos_cidr_block
        )

    def validate_routing(self, vpc_id, vpc_subnet_ids, cidr_block):
        """
        Check if routing table contains vpc_peering_connection_id.
        1.No need to check in the same vpc scenario, it returns True.
        2.Calling 'get_vpc_peering_connections' API to vpc_peering_connection_id.
        3.Using 'ec2.describe_route_tables' API to check, if it returns True, the verification passes.
        4.In different VPC scenarios, you not only need to call 'validate_aos_vpc_routing()'
        to verify the routing table of aos vpc, but also call 'validate_solution_vpc_routing()'
        to verify the routing table of the vpc of solution.
        """
        if (
            self.validate_same_vpc()
            or self.has_peering_connection()
            and self.validate_route_tables(vpc_id, vpc_subnet_ids, cidr_block)
        ):
            return True
        return False

    def has_peering_connection(self):
        """
        Check if the VPC has peering connections
        """
        return self.get_vpc_peering_connections() is not None

    def validate_route_tables(self, vpc_id, vpc_subnet_ids, cidr_block):
        """
        Validate each route table
        """
        for vpc_subnet_id in vpc_subnet_ids:
            if not self.validate_route_table(vpc_id, vpc_subnet_id, cidr_block):
                return False
        return True

    def validate_route_table(self, vpc_id, vpc_subnet_id, cidr_block):
        """
        Validate a single route table
        """
        response = self.describe_route_table(vpc_id, vpc_subnet_id, cidr_block)
        if self.has_active_route(response):
            return True

        # consider the scenario where the subnet use the main route table but not associate it
        main_route_response = self.describe_main_route_table(vpc_id, cidr_block)
        if self.has_active_route(main_route_response):
            return True

        return False

    def has_active_route(self, response):
        """
        Check if the response has an active route
        """
        if "RouteTables" not in response or len(response["RouteTables"]) == 0:
            return False

        for route_table in response["RouteTables"]:
            if "Routes" in route_table:
                for route in route_table["Routes"]:
                    if self.is_active_route(route):
                        return True
        return False

    def describe_route_table(self, vpc_id, vpc_subnet_id, cidr_block):
        """
        Call 'ec2.describe_route_tables' API
        """
        return self.ec2.describe_route_tables(
            Filters=[
                {"Name": "vpc-id", "Values": [vpc_id]},
                {
                    "Name": ASSOCIATION_SUBNET_ID,
                    "Values": [vpc_subnet_id],
                },
                {
                    "Name": "route.vpc-peering-connection-id",
                    "Values": [self.vpc_peering_connection_id],
                },
                {
                    "Name": "route.destination-cidr-block",
                    "Values": [cidr_block],
                },
            ],
            DryRun=False,
        )

    def describe_main_route_table(self, vpc_id, cidr_block):
        """
        Call 'ec2.describe_route_tables' API
        """
        return self.ec2.describe_route_tables(
            Filters=[
                {"Name": "vpc-id", "Values": [vpc_id]},
                {
                    "Name": "association.main",
                    "Values": ["true"],
                },
                {
                    "Name": "route.destination-cidr-block",
                    "Values": [cidr_block],
                },
            ],
            DryRun=False,
        )

    def is_active_route(self, route):
        """
        Check if a route is active and has the specified vpc peering connection id
        """
        return (
            "VpcPeeringConnectionId" in route
            and "State" in route
            and route["VpcPeeringConnectionId"] == self.vpc_peering_connection_id
            and route["State"] == "active"
        )

    def get_vpc_subnets(self, vpc_id: str):
        """
        Obtain the subnet_ids of vpc from "ec2.describe_subnets" API.
        """
        filters = [
            {
                "Name": "vpc-id",
                "Values": [
                    vpc_id,
                ],
            },
        ]
        response = self.ec2.describe_subnets(Filters=filters, DryRun=False)
        subnet_ids = []
        if "Subnets" in response:
            subnets = response["Subnets"]
            for subnet in subnets:
                subnet_ids.append(subnet["SubnetId"])
        else:
            raise APIException(
                ErrorCode.IMPORT_OPENSEARCH_DOMAIN_FAILED,
                f"Please check the subnets of vpc, vpc id is {vpc_id}",
            )
        return subnet_ids

    def get_vpc_peering_connections(self):
        """
        Obtain the vpc_peering_connection_id from "ec2.describe_vpc_peering_connections" API by aos_vpc_id
        and solution_vpc_id
        """
        if not self.validate_same_vpc():
            response = self.ec2.describe_vpc_peering_connections(
                Filters=[
                    {
                        "Name": "requester-vpc-info.vpc-id",
                        "Values": [
                            self.solution_vpc_id,
                        ],
                    },
                    {
                        "Name": "accepter-vpc-info.vpc-id",
                        "Values": [
                            self.aos_vpc_id,
                        ],
                    },
                    {
                        "Name": "status-code",
                        "Values": ["active", "provisioning", "pending-acceptance"],
                    },
                ],
                DryRun=False,
            )
            if (
                "VpcPeeringConnections" in response
                and response["VpcPeeringConnections"]
            ):
                self.vpc_peering_connection_id = response["VpcPeeringConnections"][0][
                    "VpcPeeringConnectionId"
                ]
                self.vpc_peering_connection_status = response["VpcPeeringConnections"][
                    0
                ]["Status"]
        return self.vpc_peering_connection_id

    def create_sg_rule(self):
        """
        add sg ingress rule to allow members in the solution processing security group to access port 443
        1.same vpc: allow solution_sg_id
        2.not the same vpc:  allow solution_cidr_block
        """
        if self.validate_same_vpc():
            ip_permissions = [
                {
                    "FromPort": 443,
                    "IpProtocol": "tcp",
                    "UserIdGroupPairs": [
                        {
                            "Description": description,
                            "GroupId": self.solution_sg_id,
                            "VpcId": self.aos_vpc_id,
                        },
                    ],
                    "ToPort": 443,
                },
            ]
        else:
            ip_permissions = [
                {
                    "FromPort": 443,
                    "IpProtocol": "tcp",
                    "IpRanges": [
                        {
                            "CidrIp": self.solution_cidr_block,
                            "Description": description,
                        },
                    ],
                    "ToPort": 443,
                },
            ]
        response = self.ec2.authorize_security_group_ingress(
            GroupId=self.aos_sg_ids[0],
            IpPermissions=ip_permissions,
            DryRun=False,
        )

        if "Return" in response and response["Return"] is True:
            return True
        else:
            return False

    def delete_sg_rule(self) -> bool:
        """
        delete sg ingress rule to allow members in the solution processing security group to access port 443
        1.same vpc: allow solution_sg_id
        2.not the same vpc:  allow solution_cidr_block
        """
        if self.validate_same_vpc():
            ip_permissions = [
                {
                    "FromPort": 443,
                    "IpProtocol": "tcp",
                    "UserIdGroupPairs": [
                        {
                            "Description": description,
                            "GroupId": self.solution_sg_id,
                            "VpcId": self.aos_vpc_id,
                        },
                    ],
                    "ToPort": 443,
                },
            ]
        else:
            ip_permissions = [
                {
                    "FromPort": 443,
                    "IpProtocol": "tcp",
                    "IpRanges": [
                        {
                            "CidrIp": self.solution_cidr_block,
                            "Description": description,
                        },
                    ],
                    "ToPort": 443,
                },
            ]
        try:
            response = self.ec2.revoke_security_group_ingress(
                GroupId=self.aos_sg_ids[0],
                IpPermissions=ip_permissions,
                DryRun=False,
            )

            return response["Return"] if "Return" in response else False
        except ClientError as ex:
            if ex.response["Error"]["Code"] == "InvalidPermission.NotFound":
                return True
            else:
                raise ex

    def create_nacl_entry(self):
        """
        Add an inbound rule to NACL to allow Solution CIDR to allow access to port 443.
        This method only needs to be called when the vpc of solution is different from that of aos
        """
        self.ec2.create_network_acl_entry(
            CidrBlock=self.solution_cidr_block,
            DryRun=False,
            Egress=False,
            NetworkAclId=self.aos_network_acl_id,
            PortRange={"From": 443, "To": 443},
            Protocol="6",
            RuleAction="allow",
            RuleNumber=666,
        )

    def delete_nacl_entry(self, aos_network_acl_id):
        """
        Delete an inbound rule to NACL to allow Solution CIDR to allow access to port 443.
        This method only needs to be called when the vpc of solution is different from that of aos
        """
        try:
            self.ec2.delete_network_acl_entry(
                DryRun=False,
                Egress=False,
                NetworkAclId=aos_network_acl_id,
                RuleNumber=666,
            )
        except ClientError as ex:
            if ex.response["Error"]["Code"] == "InvalidNetworkAclEntry.NotFound":
                return True
            else:
                raise ex

    def create_vpc_peering_connection(self):
        """
        Create vpc peering between Solution vpc and aos vpc.
        This method only needs to be called when the vpc of solution is different from that of AOS.
        """
        if not self.validate_same_vpc():
            tag_specifications = []
            if self.tags:
                tag_specifications.append(
                    {
                        "ResourceType": "vpc-peering-connection",
                        "Tags": self.tags,
                    }
                )
            response = self.ec2.create_vpc_peering_connection(
                DryRun=False,
                PeerVpcId=self.aos_vpc_id,
                VpcId=self.solution_vpc_id,
                TagSpecifications=tag_specifications,
            )
            if "VpcPeeringConnection" in response:
                vpc_peering_connection_id = response["VpcPeeringConnection"][
                    "VpcPeeringConnectionId"
                ]
                self.accept_vpc_peering_connection(vpc_peering_connection_id)
                self.vpc_peering_connection_id = vpc_peering_connection_id

    def delete_vpc_peering_connection(self, vpc_peering_connection_id) -> bool:
        """
        Delete vpc peering between Solution vpc and aos vpc.
        This method only needs to be called when the vpc of solution is different from that of AOS.
        """
        if not self.validate_same_vpc():
            response = self.ec2.delete_vpc_peering_connection(
                DryRun=False, VpcPeeringConnectionId=vpc_peering_connection_id
            )
            return response["Return"] if "Return" in response else False

    def accept_vpc_peering_connection(self, vpc_peering_connection_id: str):
        try:
            response = self.ec2.accept_vpc_peering_connection(
                DryRun=False, VpcPeeringConnectionId=vpc_peering_connection_id
            )
            if "VpcPeeringConnection" in response:
                status = response["VpcPeeringConnection"]["Status"]
                logger.info(
                    f"accept vpc peering, status is {status},VpcPeeringConnectionId is {vpc_peering_connection_id}"
                )
        except ClientError as ex:
            if ex.response["Error"]["Code"] == "InvalidVpcPeeringConnectionID.NotFound":
                time.sleep(1)
                self.vpc_peering_retry = self.vpc_peering_retry + 1
                if self.vpc_peering_retry == 4:
                    raise ex
                return self.accept_vpc_peering_connection(vpc_peering_connection_id)
            else:
                raise ex

    def create_aos_route(self):
        """
        Create route in the ids of aos.
        """
        aos_route_table_ids = self.get_route_table_ids(
            self.aos_vpc_id, self.aos_subnet_ids
        )
        for aos_route_table_id in aos_route_table_ids:
            self.create_route(self.solution_cidr_block, aos_route_table_id)

    def delete_aos_route(self) -> bool:
        """
        Delete route in the ids of aos.
        """
        aos_route_table_ids = self.get_route_table_ids(
            self.aos_vpc_id, self.aos_subnet_ids
        )
        for aos_route_table_id in aos_route_table_ids:
            self.delete_route(self.solution_cidr_block, aos_route_table_id)

    def create_solution_route(self):
        """
        Create route in the vpc of solution
        """
        solution_route_table_ids = self.get_route_table_ids(
            self.solution_vpc_id, self.solution_private_subnet_ids
        )
        for solution_route_table_id in solution_route_table_ids:
            self.create_route(self.aos_cidr_block, solution_route_table_id)

    def delete_solution_route(self) -> bool:
        """
        Delete route in the vpc of solution
        """
        solution_route_table_ids = self.get_route_table_ids(
            self.solution_vpc_id, self.solution_private_subnet_ids
        )
        for solution_route_table_id in solution_route_table_ids:
            self.delete_route(self.aos_cidr_block, solution_route_table_id)

    def create_route(self, cidr_block, route_table_id):
        """
        create a route in the route table for vpc peering connection
        """

        try:
            response = self.ec2.create_route(
                DestinationCidrBlock=cidr_block,
                DryRun=False,
                RouteTableId=route_table_id,
                VpcPeeringConnectionId=self.vpc_peering_connection_id,
            )
            if response and "Return" in response and response["Return"] is True:
                return True
            else:
                return False
        except ClientError as ex:
            if ex.response["Error"]["Code"] == "RouteAlreadyExists":
                return True
            else:
                raise ex

    def delete_route(self, cidr_block, route_table_id) -> bool:
        """
        delete a route in the route table for removing vpc peering connection
        """
        try:
            response = self.ec2.delete_route(
                DestinationCidrBlock=cidr_block,
                DryRun=False,
                RouteTableId=route_table_id,
            )
            if response and "Return" in response and response["Return"] is True:
                return True
            else:
                return False
        except ClientError as ex:
            if ex.response["Error"]["Code"] == "InvalidRoute.NotFound":
                return True
            else:
                raise ex

    def get_route_table_ids(self, vpc_id: str, subnet_ids: list):
        """
        Obtain the route table id from calling 'describe_route_tables' API by vpc_id, subnet_ids
        """ ""
        response = self.ec2.describe_route_tables(
            Filters=[
                {"Name": "vpc-id", "Values": [vpc_id]},
                {
                    "Name": ASSOCIATION_SUBNET_ID,
                    "Values": subnet_ids,
                },
            ],
            DryRun=False,
        )
        route_table_ids = []
        if "RouteTables" in response:
            route_tables = response["RouteTables"]
            for route_table in route_tables:
                if "Associations" in route_table:
                    associations = route_table["Associations"]
                    for association in associations:
                        route_table_ids.append(association["RouteTableId"])

        if not route_table_ids:
            return self.get_main_route_table_id(vpc_id)
        return route_table_ids

    def get_main_route_table_id(self, vpc_id: str):
        """
        Obtain the route table id from calling 'describe_route_tables' API by vpc_id, subnet_ids
        """ ""
        response = self.ec2.describe_route_tables(
            Filters=[
                {"Name": "vpc-id", "Values": [vpc_id]},
                {
                    "Name": "association.main",
                    "Values": ["true"],
                },
            ],
            DryRun=False,
        )
        route_table_ids = []
        if "RouteTables" in response:
            route_tables = response["RouteTables"]
            for route_table in route_tables:
                if "Associations" in route_table:
                    associations = route_table["Associations"]
                    for association in associations:
                        route_table_ids.append(association["RouteTableId"])

        if not route_table_ids:
            raise APIException(
                ErrorCode.IMPORT_OPENSEARCH_DOMAIN_FAILED,
                f"Failed to import the AOS, please check the main route table of VPC, we can't do peering. VPC id is {vpc_id}",
            )
        return route_table_ids

    def check_all(self):
        if not self.validate_sg():
            self.create_sg_rule()
            self.record_updated_resource(DomainRelatedResourceEnum.AOS_SECURITY_GROUP)
        if not self.validate_nacl():
            self.create_nacl_entry()
            self.record_updated_resource(DomainRelatedResourceEnum.AOS_NACL)
        if not self.get_vpc_peering_connections():
            self.create_vpc_peering_connection()
            self.record_updated_resource(DomainRelatedResourceEnum.VPC_PEERING)
        elif self.vpc_peering_connection_status == "pending-acceptance":
            self.accept_vpc_peering_connection(self.vpc_peering_connection_id)
            self.record_updated_resource(DomainRelatedResourceEnum.VPC_PEERING)
        if not self.validate_aos_vpc_routing():
            self.create_aos_route()
            self.record_updated_resource(DomainRelatedResourceEnum.AOS_ROUTES)
        if not self.validate_solution_vpc_routing():
            self.create_solution_route()
            self.record_updated_resource(DomainRelatedResourceEnum.SOLUTION_ROUTES)

    def check_all_aos_cidr_overlaps(
        self, region=default_region, existed_aos_list=list()
    ) -> bool:
        """
        Using ipaddr lib to check: True is Pass
        """
        if self.aos_vpc_id == self.solution_vpc_id or not existed_aos_list:
            return True

        es = conn.get_client("es", region_name=region)
        vpc_ids = self.get_vpc_ids_from_aos_list(es, existed_aos_list, region)

        if self.aos_vpc_id in vpc_ids:
            return True

        return self.check_vpc_cidr_conflicts(vpc_ids)

    def get_vpc_ids_from_aos_list(self, es, existed_aos_list, region):
        vpc_ids = []
        for aos in existed_aos_list:
            if "metrics" in aos and aos.get("metrics").get("health") == "UNKNOWN":
                continue
            domain_name = aos["domainName"]
            existed_aos_region = aos["region"]
            if region != existed_aos_region:
                region = existed_aos_region
                es = conn.get_client("es", region_name=region)
            es_resp = es.describe_elasticsearch_domain(DomainName=domain_name)
            es_vpc = es_resp["DomainStatus"]["VPCOptions"]
            vpc_ids.append(es_vpc["VPCId"])
        return vpc_ids

    def check_vpc_cidr_conflicts(self, vpc_ids):
        response = self.get_vpcs_response(vpc_ids)
        vpcs = response["Vpcs"]
        for vpc in vpcs:
            existed_aos_cidr_block = vpc["CidrBlock"]
            if not self.check_cidr_overlaps(
                self.aos_cidr_block, existed_aos_cidr_block
            ):
                raise APIException(
                    ErrorCode.IMPORT_OPENSEARCH_DOMAIN_FAILED,
                    "We can't import AOS, its CIDR conflicts with imported AOS!",
                )
        return True

    def get_vpcs_response(self, vpc_ids):
        try:
            response = self.ec2.describe_vpcs(VpcIds=vpc_ids, DryRun=False)
        except ClientError as ex:
            logger.error(ex)
            raise ex
        if "Vpcs" not in response or not response["Vpcs"]:
            raise APIException(
                ErrorCode.ITEM_NOT_FOUND,
                f"the VPC is Not Found, id list is {vpc_ids}",
            )
        return response

    def get_related_resources(self):
        """
        Get OpenSearch related resources
        """
        logger.info(self.domain_related_resources)
        return self.domain_related_resources

    def get_domain_related_resources(self, id, cluster_table):
        """Get the related resources from ddb"""
        item = cluster_table.get_item(Key={"id": id})
        if "Item" not in item:
            raise APIException(
                ErrorCode.ITEM_NOT_FOUND, "Cannot find domain in the imported list"
            )
        return item["Item"].get("resources", [])

    def reverse_domain_related_resources(
        self, id, is_reverse, aos_domain_dao: OpenSearchDomainDao
    ):
        """
        Reverse domain related resources
        Args:
            id: str
            is_reverse: bool
            aos_domain_dao: OpenSearchDomainDao
        Returns:
            error_code: str | null,
            error_message: str | null,
            resources: [
                {name: "VPC peering", values: ["xxxxxxx"], status: DELETED},
                {name: "route table", values: ["xxxxxxx", "xxxxxxx"], status: REVERSED},
                {name: "Security Group", values: ["xxxxxxx"], status: REVERSED},
            ]
        """
        # Get all the domain related resources from ddb
        aos_domain = aos_domain_dao.get_domain_by_id(id)
        resources = aos_domain.resources

        # Set all resources status to UNCHANGED first,
        # it will be changed in the following steps
        for resource in resources:
            resource.status = ResourceStatus.UNCHANGED

        if not is_reverse:
            aos_domain_dao.update_status(id, DomainImportStatusEnum.INACTIVE)

            logger.info(resources)
            return None, "", resources
        else:
            error_occur_flag = 0
            error_message = ""
            reversed_resources: List[Resource] = []
            for resource in resources:
                try:
                    reverse_status = self.reverse_resource(resource)
                    resource.status = str(reverse_status)
                    reversed_resources.append(resource)
                except Exception as err:
                    error_occur_flag += 1
                    error_message += str(err) + " \n"
                    resource.status = ResourceStatus.ERROR
                    reversed_resources.append(resource)

            if error_occur_flag == 0:
                aos_domain_dao.update_status(id, DomainImportStatusEnum.INACTIVE)
                return None, "", [each.dict() for each in reversed_resources]
            else:
                aos_domain_dao.update_resources_status(
                    id,
                    DomainImportStatusEnum.FAILED,
                    reversed_resources,
                    str(error_message),
                )
                return (
                    ErrorCode.REMOVE_OPENSEARCH_DOMAIN_FAILED.name,
                    error_message,
                    [each.dict() for each in reversed_resources],
                )

    def reverse_resource(self, resource: Resource):
        """Reverse the specific resource
        Args:
            resource: {
                name: str,
                values: [str],
                status: str
            }
        Returns:
            resource_status: str
        """
        if resource.name == DomainRelatedResourceEnum.VPC_PEERING:
            self.delete_vpc_peering_connection(resource.values[0])
            return ResourceStatus.DELETED
        elif resource.name == DomainRelatedResourceEnum.AOS_ROUTES:
            self.delete_aos_route()
            return ResourceStatus.REVERSED
        elif resource.name == DomainRelatedResourceEnum.SOLUTION_ROUTES:
            self.delete_solution_route()
            return ResourceStatus.REVERSED
        elif resource.name == DomainRelatedResourceEnum.AOS_SECURITY_GROUP:
            self.delete_sg_rule()
            return ResourceStatus.REVERSED
        elif resource.name == DomainRelatedResourceEnum.AOS_NACL:
            self.delete_nacl_entry(resource.values[0])
            return ResourceStatus.REVERSED

    def record_updated_resource(self, resource_type):
        """Record the updated resource"""
        if resource_type == DomainRelatedResourceEnum.VPC_PEERING:
            self.domain_related_resources.append(
                {
                    "name": resource_type,
                    "values": [self.vpc_peering_connection_id],
                    "status": ResourceStatus.CREATED,
                }
            )
        elif resource_type == DomainRelatedResourceEnum.AOS_NACL:
            self.domain_related_resources.append(
                {
                    "name": resource_type,
                    "values": [self.aos_network_acl_id],
                    "status": ResourceStatus.UPDATED,
                }
            )
        elif resource_type == DomainRelatedResourceEnum.AOS_ROUTES:
            self.domain_related_resources.append(
                {
                    "name": resource_type,
                    "values": self.get_route_table_ids(
                        self.aos_vpc_id, self.aos_subnet_ids
                    ),
                    "status": ResourceStatus.UPDATED,
                }
            )
        elif resource_type == DomainRelatedResourceEnum.AOS_SECURITY_GROUP:
            self.domain_related_resources.append(
                {
                    "name": resource_type,
                    "values": self.aos_sg_ids,
                    "status": ResourceStatus.UPDATED,
                }
            )
        elif resource_type == DomainRelatedResourceEnum.SOLUTION_ROUTES:
            self.domain_related_resources.append(
                {
                    "name": resource_type,
                    "values": self.get_route_table_ids(
                        self.solution_vpc_id, self.solution_private_subnet_ids
                    ),
                    "status": ResourceStatus.UPDATED,
                }
            )
        else:
            logger.error(f"Unknown resource type {resource_type}")
