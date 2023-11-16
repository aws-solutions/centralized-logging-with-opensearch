# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0


import pytest
import os
import json
import boto3
from moto import mock_sts, mock_ssm, mock_ec2
import botocore.session
from botocore.stub import Stubber


@pytest.fixture
def commandId_event():
    with open("./test/event/test_event.json", "r") as f:
        return json.load(f)


@pytest.fixture
def no_commandId_event():
    with open("./test/event/test_event2.json", "r") as f:
        return json.load(f)

class Boto3Mocker:
    def __init__(self, tags=[]):
        self._tags = tags

    def send_command(self, **args):
        return {
            "Command": {
                "CommandId": "ef7fdfd8-9b57-4151-a15c-db9a12345678",
            }
        }

    def list_command_invocations(self, **args):
        return {
            "CommandInvocations": [{
                "CommandId": "ef7fdfd8-9b57-4151-a15c-db9a12345678",
                "InstanceId": "i-1234567890abcdef0",
                "Comment": "b48291dd-ba76-43e0-b9df-13e11ddaac26:6960febb-2907-4b59-8e1a-d6ce8EXAMPLE",
                "DocumentName": "AWS-UpdateSSMAgent",
                "DocumentVersion": "",
                "PluginName": "aws:updateSsmAgent",
                "ResponseCode": 0,
                "ExecutionStartDateTime": "2020-02-19T18:18:03.419Z",
                "ExecutionElapsedTime": "PT0.091S",
                "ExecutionEndDateTime": "2020-02-19T18:18:03.419Z",
                "Status": "Success",
                "StatusDetails": "Success",
                "CommandPlugins": [
                    {"Output": "fluent-bit"}
                ],
                "StandardOutputUrl": "",
                "StandardErrorContent": "",
                "StandardErrorUrl": "",
                "CloudWatchOutputConfig": {
                    "CloudWatchLogGroupName": "",
                    "CloudWatchOutputEnabled": False,
                },
            },
                {
                "CommandId": "ef7fdfd8-9b57-4151-a15c-db9a12345678",
                "InstanceId": "i-1234567890abcdef1",
                "Comment": "b48291dd-ba76-43e0-b9df-13e11ddaac26:6960febb-2907-4b59-8e1a-d6ce8EXAMPLE",
                "DocumentName": "AWS-UpdateSSMAgent",
                "DocumentVersion": "",
                "PluginName": "aws:updateSsmAgent",
                "ResponseCode": 0,
                "ExecutionStartDateTime": "2020-02-19T18:18:03.419Z",
                "ExecutionElapsedTime": "PT0.091S",
                "ExecutionEndDateTime": "2020-02-19T18:18:03.419Z",
                "Status": "Success",
                "StatusDetails": "Success",
                "CommandPlugins": [
                    {"Output": ""}
                ],
                "StandardOutputUrl": "",
                "StandardErrorContent": "",
                "StandardErrorUrl": "",
                "CloudWatchOutputConfig": {
                    "CloudWatchLogGroupName": "",
                    "CloudWatchOutputEnabled": False,
                },
            }]
        }


@pytest.fixture
def sts_client():
    with mock_sts():
        boto3.client("sts", region_name=os.environ.get("AWS_REGION"))
        yield


@pytest.fixture
def ssm_client():
    with mock_ssm():
        boto3.client("ssm", region_name=os.environ.get("AWS_REGION"))
        yield


@pytest.fixture
def ec2_client():
    with mock_ec2():
        ec2_client = boto3.client('ec2')
        
        amis = ec2_client.describe_images()
        image_id = amis['Images'][0]['ImageId']
        
        response= ec2_client.run_instances(InstanceType='m6g.medium',
                                        MinCount=1,
                                        MaxCount=1,
                                        ImageId=image_id)
        instance_id = response['Instances'][0]['InstanceId']
        os.environ["INSTANCE_ID"] = instance_id
        yield


def test_lambda_handler_without_accountId(mocker, no_commandId_event, sts_client, ssm_client):
    import lambda_function

    lambda_function.lambda_handler(no_commandId_event, None)

def test_requestInstallLogAgent(mocker, sts_client, ssm_client):
    import lambda_function

    lambda_function.lambda_handler(
        {
            "arguments": {
                "instanceIdSet": ["i-01dfa6dc7c3fa3416"],
                "accountId": "123456789012",
                "region": "us-east-1",
            },
            "identity": {},
            "source": None,
            "request": {},
            "prev": None,
            "info": {"fieldName": "requestInstallLogAgent", "variables": {}},
            "stash": {},
        },
        None,
    )

@mock_ec2
@mock_ssm
def test_single_agent_installation(mocker, sts_client, ssm_client, ec2_client):
    import lambda_function

    ssm = botocore.session.get_session().create_client('ssm')
    stubber_ssm = Stubber(ssm)

    ec2 = botocore.session.get_session().create_client('ec2', 'us-east-1')
    stubber_ec2 = Stubber(ec2)

    mock_des_instance_info_resp = dict()
    mock_des_instance_info_resp["InstanceInformationList"] = [
        {
            'InstanceId': 'i-edb56c3b8a5ba11f7',
            'PingStatus': 'Online',
            'LastPingDateTime': 12345,
            'AgentVersion': '1',
            'IsLatestVersion': True,
            'PlatformType': 'Linux',
            'PlatformName': 'Linux',
            'PlatformVersion': '123',
            'ActivationId': '1',
            'IamRole': '1',
            'RegistrationDate': 12345,
            'ResourceType': 'EC2Instance',
            'Name': 'name',
            'IPAddress': "100.100.100.100",
            'ComputerName': 'string',
            'AssociationStatus': 'string',
            'LastAssociationExecutionDate': 12345,
            'LastSuccessfulAssociationExecutionDate': 1234,
            'AssociationOverview': {
                'DetailedStatus': 'string',
                'InstanceAssociationStatusAggregatedCount': {
                    'string': 123
                }
            },
            'SourceId': 'string',
            'SourceType': 'AWS::EC2::Instance'
        }
    ]
    mock_des_instances_resp = dict()
    mock_des_instances_resp['Reservations'] = [
        {
            'Groups': [
                {
                    'GroupName': 'string',
                    'GroupId': 'string'
                },
            ],
            'Instances': [
                {
                    'AmiLaunchIndex': 123,
                    'ImageId': 'string',
                    'InstanceId': 'i-edb56c3b8a5ba11f7',
                    'InstanceType': 't3.medium',
                    'KernelId': 'string',
                    'KeyName': 'string',
                    'Monitoring': {
                        'State': 'disabled'
                    },
                    'Placement': {
                        'AvailabilityZone': 'string',
                        'Affinity': 'string',
                        'GroupName': 'string',
                        'PartitionNumber': 123,
                        'HostId': 'string',
                        'Tenancy': 'default',
                        'SpreadDomain': 'string',
                        'HostResourceGroupArn': 'string',
                        'GroupId': 'string'
                    },
                    'Platform': 'Windows',
                    'PrivateDnsName': 'string',
                    'PrivateIpAddress': 'string',
                    'ProductCodes': [
                        {
                            'ProductCodeId': 'string',
                            'ProductCodeType': 'devpay'
                        },
                    ],
                    'PublicDnsName': 'string',
                    'PublicIpAddress': 'string',
                    'RamdiskId': 'string',
                    'State': {
                        'Code': 123,
                        'Name': 'running',
                    },
                    'StateTransitionReason': 'string',
                    'SubnetId': 'string',
                    'VpcId': 'string',
                    'Architecture': 'x86_64',
                    'BlockDeviceMappings': [
                        {
                            'DeviceName': 'string',
                            'Ebs': {
                                'DeleteOnTermination': True,
                                'Status': 'attaching',
                                'VolumeId': 'string'
                            }
                        },
                    ],
                    'ClientToken': 'string',
                    'EbsOptimized': True,
                    'EnaSupport': True,
                    'IamInstanceProfile': {
                        'Arn': 'string',
                        'Id': 'string'
                    },
                    'InstanceLifecycle': 'scheduled',
                    'ElasticGpuAssociations': [
                        {
                            'ElasticGpuId': 'string',
                            'ElasticGpuAssociationId': 'string',
                            'ElasticGpuAssociationState': 'string',
                            'ElasticGpuAssociationTime': 'string'
                        },
                    ],
                    'ElasticInferenceAcceleratorAssociations': [
                        {
                            'ElasticInferenceAcceleratorArn': 'string',
                            'ElasticInferenceAcceleratorAssociationId': 'string',
                            'ElasticInferenceAcceleratorAssociationState': 'string',
                        },
                    ],
                    'NetworkInterfaces': [
                        {
                            'Association': {
                                'CarrierIp': 'string',
                                'CustomerOwnedIp': 'string',
                                'IpOwnerId': 'string',
                                'PublicDnsName': 'string',
                                'PublicIp': 'string'
                            },
                            'Attachment': {
                                'AttachmentId': 'string',
                                'DeleteOnTermination': True,
                                'DeviceIndex': 123,
                                'Status': 'attached',
                                'NetworkCardIndex': 123
                            },
                            'Description': 'string',
                            'Groups': [
                                {
                                    'GroupName': 'string',
                                    'GroupId': 'string'
                                },
                            ],
                            'Ipv6Addresses': [
                                {
                                    'Ipv6Address': 'string'
                                },
                            ],
                            'MacAddress': 'string',
                            'NetworkInterfaceId': 'string',
                            'OwnerId': 'string',
                            'PrivateDnsName': 'string',
                            'PrivateIpAddress': 'string',
                            'PrivateIpAddresses': [
                                {
                                    'Association': {
                                        'CarrierIp': 'string',
                                        'CustomerOwnedIp': 'string',
                                        'IpOwnerId': 'string',
                                        'PublicDnsName': 'string',
                                        'PublicIp': 'string'
                                    },
                                    'Primary': True,
                                    'PrivateDnsName': 'string',
                                    'PrivateIpAddress': 'string'
                                },
                            ],
                            'SourceDestCheck': True,
                            'Status': 'available',
                            'SubnetId': 'string',
                            'VpcId': 'string',
                            'InterfaceType': 'string',
                            'Ipv4Prefixes': [
                                {
                                    'Ipv4Prefix': 'string'
                                },
                            ],
                            'Ipv6Prefixes': [
                                {
                                    'Ipv6Prefix': 'string'
                                },
                            ]
                        },
                    ],
                    'OutpostArn': 'string',
                    'RootDeviceName': 'string',
                    'RootDeviceType': 'ebs',
                    'SecurityGroups': [
                        {
                            'GroupName': 'string',
                            'GroupId': 'string'
                        },
                    ],
                    'SourceDestCheck': True,
                    'SpotInstanceRequestId': 'string',
                    'SriovNetSupport': 'string',
                    'StateReason': {
                        'Code': 'string',
                        'Message': 'string'
                    },
                    'Tags': [
                        {
                            'Key': 'string',
                            'Value': 'string'
                        },
                    ],
                    'VirtualizationType': 'hvm',
                    'CpuOptions': {
                        'CoreCount': 123,
                        'ThreadsPerCore': 123,
                    },
                    'CapacityReservationId': 'string',
                    'CapacityReservationSpecification': {
                        'CapacityReservationPreference': 'open',
                        'CapacityReservationTarget': {
                            'CapacityReservationId': 'string',
                            'CapacityReservationResourceGroupArn': 'string'
                        }
                    },
                    'HibernationOptions': {
                        'Configured': True
                    },
                    'Licenses': [
                        {
                            'LicenseConfigurationArn': 'string'
                        },
                    ],
                    'EnclaveOptions': {
                        'Enabled': True
                    },
                    'Ipv6Address': 'string',
                    'TpmSupport': 'string',
                    'MaintenanceOptions': {
                        'AutoRecovery': 'disabled'
                    },
                    'CurrentInstanceBootMode': 'legacy-bios'
                },
            ],
            'OwnerId': 'string',
            'RequesterId': 'string',
            'ReservationId': 'string'
        },
    ]
    stubber_ssm.add_response('describe_instance_information', mock_des_instance_info_resp, {})
    stubber_ssm.activate()

    ec2_expected_params = {'instance_id':'i-edb56c3b8a5ba11f7', 'account_id':"123456789012", 'region':"us-east-1"}
    stubber_ec2.add_response('describe_instances', mock_des_instances_resp, ec2_expected_params)
    stubber_ec2.activate()