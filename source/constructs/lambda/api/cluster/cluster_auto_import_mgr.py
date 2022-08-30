# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0
import logging
import os
import time

import boto3
import ipaddr
from botocore import config
from botocore.exceptions import ClientError
from util.exception import APIException

logger = logging.getLogger()
logger.setLevel(logging.INFO)

solution_version = os.environ.get('SOLUTION_VERSION', 'v1.0.0')
solution_id = os.environ.get('SOLUTION_ID', 'SO8025')
user_agent_config = {
    'user_agent_extra': f'AwsSolution/{solution_id}/{solution_version}'
}
default_config = config.Config(**user_agent_config)

default_region = os.environ.get('AWS_REGION')

loghub_vpc_id = os.environ.get('DEFAULT_VPC_ID')
loghub_sg_id = os.environ.get('DEFAULT_SG_ID')
loghub_private_subnet_ids_str = os.environ.get('DEFAULT_PRIVATE_SUBNET_IDS')
ec2 = boto3.client('ec2', config=default_config)


def handle_error(func):
    """ Decorator for exception handling """

    def wrapper(*args, **kwargs):
        try:
            return func(*args, **kwargs)
        except APIException as e:
            logger.error(e)
            raise e
        except Exception as e:
            logger.error(e)
            raise RuntimeError(
                'Unknown exception, please check Lambda log for more details')

    return wrapper


class ClusterAutoImportManager:
    """
    Currently do not consider processing ipv6 scenarios
    """
    Anywhere_ipv4 = '0.0.0.0/0'

    def __init__(self, tags: None, ec2: boto3.Session.client, es_resp,
                 loghub_vpc_id: str, loghub_sg_id: str,
                 loghub_private_subnet_ids_str: str):
        self.tags = []
        if tags:
            for tag in tags:
                self.tags.append({
                    'Key': tag['key'],
                    'Value': tag['value'],
                })

        self.ec2 = ec2
        """
        obtain aos_vpc_id,aos_subnet_ids,aos_sg_ids from 'es.describe_elasticsearch_domain' API 
        """

        es_vpc = es_resp['DomainStatus']['VPCOptions']
        self.aos_vpc_id = es_vpc['VPCId']
        self.aos_subnet_ids = es_vpc['SubnetIds']
        self.aos_sg_ids = es_vpc['SecurityGroupIds']
        """
        the network_acl_id will be set value when calling 'validate_nacl()'
        """
        self.aos_network_acl_id = None

        self.loghub_vpc_id = loghub_vpc_id
        self.loghub_sg_id = loghub_sg_id

        self.loghub_private_subnet_ids_str = loghub_private_subnet_ids_str
        self.loghub_private_subnet_ids = self.loghub_private_subnet_ids_str.split(
            ',')
        """
        By default, it is assumed that the vpcs are the same. 
        Later, it will be verified whether the ids of the two vpcs are the same. 
        If they are not the same, is_same_vpc will be changed to false.
        """
        self.is_same_vpc = True
        """
        The cidr of aos vpc does not conflict with the cidr of loghub vpc by default. 
        When the ids of the two vpcs are different, the following code starts to verify whether the cidr is the same.
        """

        self.vpc_peering_connection_id = None

        vpc_ids = [self.aos_vpc_id]
        if self.aos_vpc_id != self.loghub_vpc_id:
            self.is_same_vpc = False
            self.vpc_peering_connection_status = None

            self.loghub_vpc_subnet_ids = self.get_vpc_subnets(
                vpc_id=self.loghub_vpc_id)
            vpc_ids.append(self.loghub_vpc_id)
            for vpc_id in vpc_ids:
                try:
                    response = self.ec2.describe_vpcs(VpcIds=[vpc_id],
                                                      DryRun=False)
                except ClientError as e:
                    logger.error(e)
                    raise e

                # init cidr
                if 'Vpcs' not in response or response['Vpcs'] is False:
                    raise APIException(f'the VPC is Not Found, id is {vpc_id}')
                if vpc_id == self.aos_vpc_id:
                    self.aos_cidr_block = response['Vpcs'][0]['CidrBlock']
                else:
                    self.loghub_cidr_block = response['Vpcs'][0]['CidrBlock']
            if not self.check_cidr_overlaps(self.aos_cidr_block,
                                            self.loghub_cidr_block):
                raise APIException(
                    'Log Hub VPC CIDR is conflict with AOS VPC!')
            self.vpc_peering_retry = 0
        else:

            # Obtain cidr in the same vpc scenario.
            try:
                response = self.ec2.describe_vpcs(VpcIds=[self.aos_vpc_id],
                                                  DryRun=False)
            except ClientError as e:
                logger.error(e)
                raise e
            if 'Vpcs' not in response:
                raise APIException(
                    f'the VPC is Not Found, id is {self.aos_vpc_id}')
            self.aos_cidr_block = response['Vpcs'][0]['CidrBlock']
            self.loghub_cidr_block = self.aos_cidr_block

        # obtain aos_vpc_subnet_ids from 'ec2.describe_subnets' API
        self.aos_vpc_subnet_ids = self.get_vpc_subnets(vpc_id=self.aos_vpc_id)

    def check_cidr_overlaps(self, aos_cidr: str, loghub_cidr: str):
        """
        Using ipaddr lib to check: True is Pass
        """
        aos_network = ipaddr.IPNetwork(aos_cidr)
        loghub_network = ipaddr.IPNetwork(loghub_cidr)
        if not aos_network.overlaps(
                loghub_network) and not loghub_network.overlaps(aos_network):
            return True
        else:
            return False

    def validate_same_vpc(self):
        """
        Check if it is the same vpc, return True if the same
        """
        return self.is_same_vpc

    def validate_sg(self):
        """
        Using 'ec2.describe_security_group_rules' API to check whether the rules of the aos security group
        allow access from the loghub process security group.
        Rules:
        1.sg_rule['IsEgress']: False is inbound rule
        2.sg_rule['IpProtocol']: tcp or -1 to specify all protocols
        3.sg_rule['CidrIpv4']:
          3.1. check 0.0.0.0/16 in same VPC scenarios
          3.2. check loghub_cidr_block or 0.0.0.0/16 in different VPC scenarios
        4.check sg_rule['ReferencedGroupInfo']['GroupId'] in same VPC scenarios: loghub_sg_id
        5.sg_rule['FromPort'] <= 443 and sg_rule['ToPort'] >= 443
        """
        success = False
        response = self.ec2.describe_security_group_rules(Filters=[
            {
                'Name': 'group-id',
                'Values': self.aos_sg_ids,
            },
        ],
                                                          DryRun=False)
        if 'SecurityGroupRules' in response:
            sg_rules = response['SecurityGroupRules']
            for sg_rule in sg_rules:
                if self.validate_same_vpc():
                    if sg_rule['IsEgress'] is False and (
                            sg_rule['IpProtocol'] == 'tcp' or sg_rule['IpProtocol'] == '-1') and \
                            (sg_rule['FromPort'] <= 443) and (sg_rule['ToPort'] >= 443):
                        if 'ReferencedGroupInfo' in sg_rule:
                            if sg_rule['ReferencedGroupInfo'][
                                    'GroupId'] == self.loghub_sg_id:
                                success = True
                                break
                        elif 'CidrIpv4' in sg_rule:
                            if sg_rule[
                                    'CidrIpv4'] == ClusterAutoImportManager.Anywhere_ipv4:
                                success = True
                                break
                else:
                    if 'CidrIpv4' in sg_rule:
                        if sg_rule['IsEgress'] is False and \
                                (sg_rule['CidrIpv4'] == self.loghub_cidr_block or
                                 sg_rule['CidrIpv4'] == ClusterAutoImportManager.Anywhere_ipv4) and \
                                sg_rule['IpProtocol'] == 'tcp' and \
                                sg_rule['FromPort'] <= 443 and sg_rule['ToPort'] >= 443:
                            success = True
                            break

        return success

    def validate_nacl(self):
        """
        Using 'ec2.describe_network_acls' API to check whether the rules of the aos nacl
        """
        success = False
        response = self.ec2.describe_network_acls(Filters=[{
            'Name':
            'association.subnet-id',
            'Values':
            self.aos_vpc_subnet_ids,
        }, {
            'Name':
            'vpc-id',
            'Values': [
                self.aos_vpc_id,
            ]
        }],
                                                  DryRun=False)

        if 'NetworkAcls' in response:
            nacls = response['NetworkAcls']
            for nacl in nacls:
                if 'NetworkAclId' in nacl:
                    self.aos_network_acl_id = nacl['NetworkAclId']
                if 'Entries' in nacl:
                    entries = nacl['Entries']
                    for entry in entries:
                        if entry['Egress'] is False and (
                                entry['CidrBlock'] == ClusterAutoImportManager.Anywhere_ipv4 or
                                entry['CidrBlock'] == self.loghub_cidr_block) and (
                                entry['Protocol'] == '-1' or entry['Protocol'] == '6') and \
                                entry['RuleAction'] == 'allow':
                            if 'PortRange' in entry:
                                if (entry['PortRange']['From'] <= 443) and (
                                        entry['PortRange']['To'] >= 443):
                                    success = True
                                    break
                            elif entry['Protocol'] == '-1':
                                success = True
                                break
                    if success:
                        break

        return success

    def validate_aos_vpc_routing(self):
        return self.validate_routing(self.aos_vpc_id, self.aos_subnet_ids,
                                     self.loghub_cidr_block)

    def validate_loghub_vpc_routing(self):
        return self.validate_routing(self.loghub_vpc_id,
                                     self.loghub_private_subnet_ids,
                                     self.aos_cidr_block)

    def validate_routing(self, vpc_id, vpc_subnet_ids, cidr_block):
        """
        Check if routing table contains vpc_peering_connection_id.
        1.No need to check in the same vpc scenario, it returns True.
        2.Calling 'get_vpc_peering_connections' API to vpc_peering_connection_id.
        3.Using 'ec2.describe_route_tables' API to check, if it returns True, the verification passes.
        4.In different VPC scenarios, you not only need to call 'validate_aos_vpc_routing()'
          to verify the routing table of aos vpc, but also call 'validate_loghub_vpc_routing()'
          to verify the routing table of the vpc of loghub.
        """
        success = False
        if not self.validate_same_vpc():
            if self.get_vpc_peering_connections() is None:
                return False

            response = self.ec2.describe_route_tables(Filters=[{
                'Name':
                'vpc-id',
                'Values': [vpc_id]
            }, {
                'Name':
                'association.subnet-id',
                'Values':
                vpc_subnet_ids,
            }, {
                'Name':
                'route.vpc-peering-connection-id',
                'Values': [self.vpc_peering_connection_id],
            }, {
                'Name':
                'route.destination-cidr-block',
                'Values': [cidr_block],
            }],
                                                      DryRun=False)
            count = 0
            if 'RouteTables' in response:
                route_tables = response['RouteTables']
                for route_table in route_tables:
                    if 'Routes' in route_table:
                        routes = route_table['Routes']
                        for route in routes:
                            if 'VpcPeeringConnectionId' in route and 'State' in route and \
                                    route['VpcPeeringConnectionId'] == self.vpc_peering_connection_id and \
                                    route['State'] == 'active':
                                count = count + 1
                        #         success = True
                        #         break
                        # if success:
                        #     break
                if count == len(vpc_subnet_ids):
                    success = True
        else:
            success = True
        return success

    def get_vpc_subnets(self, vpc_id: str):
        """
        Obtain the subnet_ids of vpc from "ec2.describe_subnets" API.
        """
        filters = [
            {
                'Name': 'vpc-id',
                'Values': [
                    vpc_id,
                ]
            },
        ]
        response = self.ec2.describe_subnets(Filters=filters, DryRun=False)
        subnet_ids = []
        if 'Subnets' in response:
            subnets = response['Subnets']
            for subnet in subnets:
                subnet_ids.append(subnet['SubnetId'])
        else:
            raise APIException(
                f'Please check the subnets of vpc, vpc id is {vpc_id}')
        return subnet_ids

    def get_vpc_peering_connections(self):
        """
        Obtain the vpc_peering_connection_id from "ec2.describe_vpc_peering_connections" API by aos_vpc_id
        and loghub_vpc_id
        """
        if not self.validate_same_vpc():
            response = self.ec2.describe_vpc_peering_connections(Filters=[
                {
                    'Name': 'requester-vpc-info.vpc-id',
                    'Values': [
                        self.loghub_vpc_id,
                    ]
                },
                {
                    'Name': 'accepter-vpc-info.vpc-id',
                    'Values': [
                        self.aos_vpc_id,
                    ]
                },
                {
                    'Name': 'status-code',
                    'Values': ['active', 'provisioning', 'pending-acceptance']
                },
            ],
                                                                 DryRun=False)
            if 'VpcPeeringConnections' in response and response[
                    'VpcPeeringConnections']:
                self.vpc_peering_connection_id = response[
                    'VpcPeeringConnections'][0]['VpcPeeringConnectionId']
                self.vpc_peering_connection_status = response[
                    'VpcPeeringConnections'][0]['Status']
        return self.vpc_peering_connection_id

    def create_sg_rule(self):
        """
        add sg ingress rule to allow members in the loghub processing security group to access port 443
        1.same vpc: allow loghub_sg_id
        2.not the same vpc:  allow loghub_cidr_block
        """
        if self.validate_same_vpc():
            ip_permissions = [
                {
                    'FromPort':
                    443,
                    'IpProtocol':
                    'tcp',
                    'UserIdGroupPairs': [
                        {
                            'Description': 'Loghub Processing Rule',
                            'GroupId': self.loghub_sg_id,
                            'VpcId': self.aos_vpc_id
                        },
                    ],
                    'ToPort':
                    443,
                },
            ]
        else:
            ip_permissions = [
                {
                    'FromPort':
                    443,
                    'IpProtocol':
                    'tcp',
                    'IpRanges': [
                        {
                            'CidrIp': self.loghub_cidr_block,
                            'Description': 'Loghub Processing Rule'
                        },
                    ],
                    'ToPort':
                    443,
                },
            ]
        response = self.ec2.authorize_security_group_ingress(
            GroupId=self.aos_sg_ids[0],
            IpPermissions=ip_permissions,
            DryRun=False,
        )

        if 'Return' in response and response['Return'] is True:
            return True
        else:
            return False

    def create_nacl_entry(self):
        """
        Add an inbound rule to NACL to allow Loghub CIDR to allow access to port 443.
        This method only needs to be called when the vpc of loghub is different from that of aos
        """
        self.ec2.create_network_acl_entry(CidrBlock=self.loghub_cidr_block,
                                          DryRun=False,
                                          Egress=False,
                                          NetworkAclId=self.aos_network_acl_id,
                                          PortRange={
                                              'From': 443,
                                              'To': 443
                                          },
                                          Protocol='6',
                                          RuleAction='allow',
                                          RuleNumber=666)

    def create_vpc_peering_connection(self):
        """
        Create vpc peering between Loghub vpc and aos vpc.
        This method only needs to be called when the vpc of loghub is different from that of AOS.
        """
        if not self.validate_same_vpc():
            tag_specifications = []
            if self.tags:
                tag_specifications.append({
                    'ResourceType': 'vpc-peering-connection',
                    'Tags': self.tags,
                })
            response = self.ec2.create_vpc_peering_connection(
                DryRun=False,
                PeerVpcId=self.aos_vpc_id,
                VpcId=self.loghub_vpc_id,
                TagSpecifications=tag_specifications)
            if 'VpcPeeringConnection' in response:
                vpc_peering_connection_id = response['VpcPeeringConnection'][
                    'VpcPeeringConnectionId']
                self.accept_vpc_peering_connection(vpc_peering_connection_id)

    def accept_vpc_peering_connection(self, vpc_peering_connection_id: str):
        try:
            response = self.ec2.accept_vpc_peering_connection(
                DryRun=False, VpcPeeringConnectionId=vpc_peering_connection_id)
            if 'VpcPeeringConnection' in response:
                status = response['VpcPeeringConnection']['Status']
                logger.info(
                    f'accept vpc peering, status is {status},VpcPeeringConnectionId is {vpc_peering_connection_id}'
                )
        except ClientError as ex:
            if ex.response['Error'][
                    'Code'] == 'InvalidVpcPeeringConnectionID.NotFound':
                time.sleep(1)
                self.vpc_peering_retry = self.vpc_peering_retry + 1
                if self.vpc_peering_retry == 4:
                    raise ex
                return self.accept_vpc_peering_connection(
                    vpc_peering_connection_id)
            else:
                raise ex

    def create_aos_route(self):
        """
        Create route in the ids of aos.
        """
        aos_route_table_ids = self.get_route_table_ids(self.aos_vpc_id,
                                                       self.aos_subnet_ids)
        for aos_route_table_id in aos_route_table_ids:
            self.create_route(self.loghub_cidr_block, aos_route_table_id)

    def create_loghub_route(self):
        """
        Create route in the vpc of loghub
        """
        loghub_route_table_ids = self.get_route_table_ids(
            self.loghub_vpc_id, self.loghub_private_subnet_ids)
        for loghub_route_table_id in loghub_route_table_ids:
            self.create_route(self.aos_cidr_block, loghub_route_table_id)

    def create_route(self, cidr_block, route_table_id):
        """
        create a route in the route table for vpc peering connection
        """

        try:
            response = self.ec2.create_route(
                DestinationCidrBlock=cidr_block,
                DryRun=False,
                RouteTableId=route_table_id,
                VpcPeeringConnectionId=self.vpc_peering_connection_id)
            if response and 'Return' in response and response['Return'] is True:
                return True
            else:
                return False
        except ClientError as ex:
            if ex.response['Error']['Code'] == 'RouteAlreadyExists':
                return True
            else:
                raise ex

    def get_route_table_ids(self, vpc_id: str, subnet_ids: list):
        """
        Obtain the route table id from calling 'describe_route_tables' API by vpc_id, subnet_ids
        """ ""
        response = self.ec2.describe_route_tables(Filters=[{
            'Name': 'vpc-id',
            'Values': [vpc_id]
        }, {
            'Name':
            'association.subnet-id',
            'Values':
            subnet_ids,
        }],
                                                  DryRun=False)
        route_table_ids = []
        if 'RouteTables' in response:
            route_tables = response['RouteTables']
            for route_table in route_tables:
                if 'Associations' in route_table:
                    associations = route_table['Associations']
                    for association in associations:
                        route_table_ids.append(association['RouteTableId'])

        if not route_table_ids:
            raise APIException(
                f"Failed to import the AOS, please check the route table of VPC, no routing table association, we can't do peering. VPC id is {vpc_id}"
            )
        return route_table_ids

    def check_all(self):
        if not self.validate_sg():
            self.create_sg_rule()
        if not self.validate_nacl():
            self.create_nacl_entry()
        if not self.get_vpc_peering_connections():
            self.create_vpc_peering_connection()
        elif self.vpc_peering_connection_status == 'pending-acceptance':
            self.accept_vpc_peering_connection(self.vpc_peering_connection_id)
        if not self.validate_aos_vpc_routing():
            self.create_aos_route()
        if not self.validate_loghub_vpc_routing():
            self.create_loghub_route()

    def check_all_aos_cidr_overlaps(self,
                                    region=default_region,
                                    existed_aos_list=list()) -> bool:
        """
        Using ipaddr lib to check: True is Pass
        """
        not_conflict = True
        import_in_same_vpc = False
        if self.aos_vpc_id != self.loghub_vpc_id:
            if not existed_aos_list or len(existed_aos_list) == 0:
                return True
            es = boto3.client('es', region_name=region, config=default_config)
            vpc_ids = []
            for aos in existed_aos_list:
                domain_name = aos['domainName']
                existed_aos_region = aos['region']
                try:
                    if region != existed_aos_region:
                        region = existed_aos_region
                        es = boto3.client('es',
                                          region_name=region,
                                          config=default_config)
                    es_resp = es.describe_elasticsearch_domain(
                        DomainName=domain_name)
                    es_vpc = es_resp['DomainStatus']['VPCOptions']
                    if self.aos_vpc_id == es_vpc['VPCId']:
                        import_in_same_vpc = True
                        break
                    vpc_ids.append(es_vpc['VPCId'])
                except ClientError as e:
                    if e.response['Error'][
                            'Code'] == 'ResourceNotFoundException':
                        raise APIException('OpenSearch Domain Not Found')
                    else:
                        raise e
            if not import_in_same_vpc:
                try:
                    response = self.ec2.describe_vpcs(VpcIds=vpc_ids,
                                                      DryRun=False)
                except ClientError as e:
                    logger.error(e)
                    raise e
                # init cidr
                if 'Vpcs' not in response or response['Vpcs'] is False:
                    raise APIException(
                        f'the VPC is Not Found, id list is {vpc_ids}')

                vpcs = response['Vpcs']
                for vpc in vpcs:
                    existed_aos_cidr_block = vpc['CidrBlock']
                    if not self.check_cidr_overlaps(self.aos_cidr_block,
                                                    existed_aos_cidr_block):
                        raise APIException(
                            "We can't import AOS, its CIDR conflicts with imported AOS!"
                        )

        return not_conflict
