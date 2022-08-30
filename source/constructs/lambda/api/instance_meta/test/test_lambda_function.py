# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import json
import pytest
import os
import boto3

from moto import (
    mock_dynamodb,
    mock_sts,
    mock_ec2,
    mock_ssm,
)
from .conftest import init_ddb

test_events = [
    ({"maxResults": 10}, "listInstances"),
]


test_ssm_instances_info_list = [
    {"InstanceId": "1", "PlatformName": "test", "IPAddress": "", "ComputerName": "test-1"}
]


@pytest.fixture(params=test_events)
def test_event(request):
    with open("./test/event/test_event.json", "r") as f:
        event = json.load(f)

        arg, action = request.param
        event["arguments"] = arg
        event["info"]["fieldName"] = action
        print(event)
        return event


@pytest.fixture
def ddb_client():
    with mock_dynamodb():
        init_ddb({
            os.environ.get("INSTANCEMETA_TABLE"): [
                {
                    "id": "5e9d32ca-2e2c-4f15-9f25-5047f972177f",
                    "appPipelineId": "42fb0147-c2fe-4ea9-ba55-0b5aab86703a",
                    "confId": "d03ca90c-5c14-4816-a4f0-c3b13eb7a588",
                    "createdDt": "2022-07-17T08:29:29Z",
                    "groupId": "656a5ec9-6c72-47fb-9d12-af132b470777",
                    "instanceId": "i-01dfa6dc7c3fa3416",
                    "logIngestionId": "cd23aed6-5421-446b-85ba-2b17236806f6",
                    "status": "ACTIVE"
                },
            ],
        })
        init_ddb({
            os.environ.get("AGENTSTATUS_TABLE"): [
                {
                    "instanceId": "i-01dfa6dc7c3fa3416",
                    "createDt": "2022-07-10T08:42:26Z",
                    "id": "f571cf40-c674-4c37-b48b-cb0ad6de2d31",
                    "status": "Online",
                    "updatedDt": "2022-07-18T09:05:16Z"
                },
                {
                    "instanceId": "i-0c3fdfaaeefe50b5f",
                    "createDt": "2022-07-10T08:42:13Z",
                    "id": "Empty_Command_Id",
                    "status": "Not_Installed",
                    "updatedDt": "2022-07-10T08:42:13Z"
                }
            ]
        }, primary_key='instanceId')
        yield


@pytest.fixture
def sts_client():
    with mock_sts():
        boto3.client("sts", region_name=os.environ.get("AWS_REGION"))
        yield


def assert_list_instance_result(result):
    print("Assert listInstance API response")
    assert len(result["instances"]) == 1
    assert result["instances"][0]["name"] == "-"
    assert result["nextToken"] == ""


class Boto3Mocker:
    def __init__(self, tags=[]):
        self._tags = tags

    def describe_instance_information(self, **args):
        return {
            "InstanceInformationList": test_ssm_instances_info_list,
            "NextToken": ""
        }

    def get_command_invocation(self, **args):
        return {
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
            "StandardOutputContent": "Updating amazon-ssm-agent from 2.3.842.0 to latest\nSuccessfully downloaded https://s3.us-east-2.amazonaws.com/amazon-ssm-us-east-2/ssm-agent-manifest.json\namazon-ssm-agent 2.3.842.0 has already been installed, update skipped\n",
            "StandardOutputUrl": "",
            "StandardErrorContent": "",
            "StandardErrorUrl": "",
            "CloudWatchOutputConfig": {
                "CloudWatchLogGroupName": "",
                "CloudWatchOutputEnabled": False
            }
        }

    def describe_instances(self, **args):
        return {
            "Reservations": [
                {
                    "Groups": [],
                    "Instances": [
                        {
                            "AmiLaunchIndex": 0,
                            "ImageId": "ami-00db75007d6c5c578",
                            "InstanceId": "i-06efded16952a190b",
                            "InstanceType": "t3.micro",
                            "LaunchTime": "2022-04-25T03:09:51+00:00",
                            "Monitoring": {
                                "State": "disabled"
                            },
                            "Placement": {
                                "AvailabilityZone": "us-east-1a",
                                "GroupName": "",
                                "Tenancy": "default"
                            },
                            "PrivateDnsName": "ip-10-0-1-12.ec2.internal",
                            "PrivateIpAddress": "10.0.1.12",
                            "ProductCodes": [],
                            "PublicDnsName": "ec2-123-123-123-123.compute-1.amazonaws.com",
                            "PublicIpAddress": "123.123.123.123",
                            "State": {
                                "Code": 16,
                                "Name": "running"
                            },
                            "StateTransitionReason": "",
                            "SubnetId": "subnet-00a1bfc79552f0331",
                            "VpcId": "vpc-07447ae9f5c8f2669",
                            "Architecture": "x86_64",
                            "BlockDeviceMappings": [
                                {
                                    "DeviceName": "/dev/xvda",
                                    "Ebs": {
                                        "AttachTime": "2022-04-25T03:09:51+00:00",
                                        "DeleteOnTermination": True,
                                        "Status": "attached",
                                        "VolumeId": "vol-0131d481b6c943d20"
                                    }
                                }
                            ],
                            "ClientToken": "centr-WebSe-1F3DT7B4WEEF9",
                            "EbsOptimized": False,
                            "EnaSupport": True,
                            "Hypervisor": "xen",
                            "IamInstanceProfile": {
                                "Arn": "arn:aws:iam::1234567890:instance-profile/centralizedlogging-CLDemoStackNestedStackCLDemoStackNestedStackResource3DB-WebServerDemoEC2InstanceProfileFA4B59C6-Y98C10HIAISU",
                                "Id": "AIPAZJF44VX4SXECWEM5K"
                            },
                            "NetworkInterfaces": [
                                {
                                    "Association": {
                                        "IpOwnerId": "amazon",
                                        "PublicDnsName": "ec2-123-123-123-123.compute-1.amazonaws.com",
                                        "PublicIp": "123.123.123.123"
                                    },
                                    "Attachment": {
                                        "AttachTime": "2022-04-25T03:09:51+00:00",
                                        "AttachmentId": "eni-attach-0dc0733c48d72e361",
                                        "DeleteOnTermination": True,
                                        "DeviceIndex": 0,
                                        "Status": "attached",
                                        "NetworkCardIndex": 0
                                    },
                                    "Description": "",
                                    "Groups": [
                                        {
                                            "GroupName": "centralizedlogging-CLDemoStackNestedStackCLDemoStackNestedStackResource3DB21482-WTTNPSEKDMUK-WebServerDemoSGABCFDBC1-BXPGCVF4DG9A",
                                            "GroupId": "sg-06125e48b2242b1dc"
                                        }
                                    ],
                                    "Ipv6Addresses": [],
                                    "MacAddress": "0a:62:b6:e0:d5:cb",
                                    "NetworkInterfaceId": "eni-0766dda4220e32714",
                                    "OwnerId": "1234567890",
                                    "PrivateDnsName": "ip-10-0-1-12.ec2.internal",
                                    "PrivateIpAddress": "10.0.1.12",
                                    "PrivateIpAddresses": [
                                        {
                                            "Association": {
                                                "IpOwnerId": "amazon",
                                                "PublicDnsName": "ec2-123-123-123-123.compute-1.amazonaws.com",
                                                "PublicIp": "123.123.123.123"
                                            },
                                            "Primary": True,
                                            "PrivateDnsName": "ip-10-0-1-12.ec2.internal",
                                            "PrivateIpAddress": "10.0.1.12"
                                        }
                                    ],
                                    "SourceDestCheck": True,
                                    "Status": "in-use",
                                    "SubnetId": "subnet-00a1bfc79552f0331",
                                    "VpcId": "vpc-07447ae9f5c8f2669",
                                    "InterfaceType": "interface"
                                }
                            ],
                            "RootDeviceName": "/dev/xvda",
                            "RootDeviceType": "ebs",
                            "SecurityGroups": [
                                {
                                    "GroupName": "centralizedlogging-CLDemoStackNestedStackCLDemoStackNestedStackResource3DB21482-WTTNPSEKDMUK-WebServerDemoSGABCFDBC1-BXPGCVF4DG9A",
                                    "GroupId": "sg-06125e48b2242b1dc"
                                }
                            ],
                            "SourceDestCheck": True,
                            "Tags": [
                                {
                                    "Key": "Name",
                                    "Value": "CL-PrimaryStack/CL-DemoStack/WebServer/DemoEC2"
                                },
                                {
                                    "Key": "Patch Group",
                                    "Value": "DEV"
                                },
                                {
                                    "Key": "aws:cloudformation:stack-name",
                                    "Value": "centralizedlogging-CLDemoStackNestedStackCLDemoStackNestedStackResource3DB21482-WTTNPSEKDMUK"
                                },
                                {
                                    "Key": "aws:cloudformation:stack-id",
                                    "Value": "arn:aws:cloudformation:us-east-1:1234567890:stack/centralizedlogging-CLDemoStackNestedStackCLDemoStackNestedStackResource3DB21482-WTTNPSEKDMUK/ced52c60-c444-11ec-83aa-0a83f24026d3"
                                },
                                {
                                    "Key": "aws:cloudformation:logical-id",
                                    "Value": "WebServerDemoEC2F5BEF58E"
                                }
                            ],
                            "VirtualizationType": "hvm",
                            "CpuOptions": {
                                "CoreCount": 1,
                                "ThreadsPerCore": 2
                            },
                            "CapacityReservationSpecification": {
                                "CapacityReservationPreference": "open"
                            },
                            "HibernationOptions": {
                                "Configured": False
                            },
                            "MetadataOptions": {
                                "State": "applied",
                                "HttpTokens": "optional",
                                "HttpPutResponseHopLimit": 1,
                                "HttpEndpoint": "enabled",
                                "HttpProtocolIpv6": "disabled",
                                "InstanceMetadataTags": "disabled"
                            },
                            "EnclaveOptions": {
                                "Enabled": False
                            },
                            "PlatformDetails": "Linux/UNIX",
                            "UsageOperation": "RunInstances",
                            "UsageOperationUpdateTime": "2022-04-25T03:09:51+00:00",
                            "PrivateDnsNameOptions": {
                                "HostnameType": "ip-name",
                                "EnableResourceNameDnsARecord": False,
                                "EnableResourceNameDnsAAAARecord": False
                            },
                            "MaintenanceOptions": {
                                "AutoRecovery": "default"
                            }
                        }
                    ],
                    "OwnerId": "1234567890",
                    "RequesterId": "043234062703",
                    "ReservationId": "r-05ec0255e520df0c8"
                }
            ]
        }

    def send_command(self, **args):
        return {
            'Command': {
                'CommandId': 'string',
                'DocumentName': 'string',
                'DocumentVersion': 'string',
                'Comment': 'string',
                'Parameters': {
                    'string': [
                        'string',
                    ]
                },
                'InstanceIds': [
                    'string',
                ],
                'Targets': [
                    {
                        'Key': 'string',
                        'Values': [
                            'string',
                        ]
                    },
                ],
                'Status': 'Success',
                'StatusDetails': 'string',
                'OutputS3Region': 'string',
                'OutputS3BucketName': 'string',
                'OutputS3KeyPrefix': 'string',
                'MaxConcurrency': 'string',
                'MaxErrors': 'string',
                'TargetCount': 123,
                'CompletedCount': 123,
                'ErrorCount': 123,
                'DeliveryTimedOutCount': 123,
                'ServiceRole': 'string',
                'CloudWatchOutputConfig': {
                    'CloudWatchLogGroupName': 'string',
                    'CloudWatchOutputEnabled': True
                },
                'TimeoutSeconds': 123
            }
        }

    def describe_tags(self, **args):
        return {
            'Tags': self._tags
        }

    def describe_tags_noempty(self, **args):
        return {
            'Tags': [
                {'Key': 'Name', 'Value': 'test'},
            ]
        }


class SvcManagerMocker:
    def __init__(self, tags=[]):
        self._tags = tags

    def get_client(self, **args):
        return Boto3Mocker(self._tags)

    def get_document_name(self, **args):
        pass


def mock_list_instance(lambda_function, mocker):
    print("Setup listInstance API mocks")
    svc_manager_mock = mocker.MagicMock()
    svc_manager_mock.return_value = SvcManagerMocker()

    mocker.patch.multiple(lambda_function, SvcManager=svc_manager_mock)


test_handler = {
    "listInstances": (
        mock_list_instance,
        assert_list_instance_result
    )
}


def test_lambda_handler(mocker, test_event, sts_client):
    import lambda_function

    # Given API call send to lambda as event
    # And aws service been mocked
    setup_mocks, assertion = test_handler[test_event["info"]["fieldName"]]
    setup_mocks(lambda_function, mocker)

    # When calling lambda_handler to handler API call
    result = lambda_function.lambda_handler(test_event, None)

    # Then API response should be as expected
    assertion(result)


def test_createInstanceMeta(ddb_client):
    import lambda_function

    lambda_function.lambda_handler({
        "arguments": {
            "maxResults": 10,
            "logAgent": "logAgent",
            "instanceId": "instanceId",
            "appPipelineId": "appPipelineId",
            "confId": "confId",
            "groupId": "groupId"
        },
        "identity": {
        },
        "source": None,
        "request": {
        },
        "prev": None,
        "info": {
            "fieldName": "createInstanceMeta",
            "variables": {}
        },
        "stash": {}
    }, None)


def test_updateInstanceMeta(ddb_client):
    import lambda_function

    lambda_function.lambda_handler({
        "arguments": {
            "id": "5e9d32ca-2e2c-4f15-9f25-5047f972177f",
            "confIdset": ["1", "1", "2"],
            "groupIdset": ["1", "1", "2"],
        },
        "identity": {
        },
        "source": None,
        "request": {
        },
        "prev": None,
        "info": {
            "fieldName": "updateInstanceMeta",
            "variables": {}
        },
        "stash": {}
    }, None)

    dynamodb = boto3.resource('dynamodb')

    table = dynamodb.Table(os.environ.get("INSTANCEMETA_TABLE"))

    response = table.get_item(Key={
        "id": "5e9d32ca-2e2c-4f15-9f25-5047f972177f",
    })

    assert response['Item']['confIdset'] == set(('1', '2'))
    assert response['Item']['groupIdset'] == set(('1', '2'))


def test_getLogAgentStatus(ddb_client):
    import lambda_function

    lambda_function.lambda_handler({
        "arguments": {
            "instanceId": "i-01dfa6dc7c3fa3416",
            "accountId": '123456789012',
            "region": 'us-east-1',
        },
        "identity": {
        },
        "source": None,
        "request": {
        },
        "prev": None,
        "info": {
            "fieldName": "getLogAgentStatus",
            "variables": {}
        },
        "stash": {}
    }, None)


def test_requestInstallLogAgent_where_instance_is_already_online(ddb_client):
    import lambda_function

    lambda_function.lambda_handler({
        "arguments": {
            "instanceIdSet": ["i-01dfa6dc7c3fa3416"],
            "accountId": '123456789012',
            "region": 'us-east-1',
        },
        "identity": {
        },
        "source": None,
        "request": {
        },
        "prev": None,
        "info": {
            "fieldName": "requestInstallLogAgent",
            "variables": {}
        },
        "stash": {}
    }, None)


def test_requestInstallLogAgent_where_instance_is_offline(ddb_client):
    import lambda_function

    lambda_function.lambda_handler({
        "arguments": {
            "instanceIdSet": ["i-0c3fdfaaeefe50b5f"],
            "accountId": '123456789012',
            "region": 'us-east-1',
        },
        "identity": {
        },
        "source": None,
        "request": {
        },
        "prev": None,
        "info": {
            "fieldName": "requestInstallLogAgent",
            "variables": {}
        },
        "stash": {}
    }, None)


@mock_ec2
def test_single_agent_installation_where_instance_is_offline(mocker, ddb_client):
    import lambda_function

    ec2 = boto3.resource("ec2", region_name='us-east-1')
    res = ec2.create_instances(ImageId='123456789012', MinCount=1, MaxCount=1)
    instanceId = res[0].id

    svc_manager_mock = mocker.MagicMock()
    svc_manager_mock.return_value = SvcManagerMocker([{'Key': 'Name', 'Value': 'test'}])

    mocker.patch.multiple(lambda_function, SvcManager=svc_manager_mock)

    lambda_function.single_agent_installation(instanceId, accountId='123456789012', region='us-east-1')


@mock_ec2
def test_get_agent_health_check_output(mocker, ddb_client):
    import lambda_function

    ec2 = boto3.resource("ec2", region_name='us-east-1')
    res = ec2.create_instances(ImageId='123456789012', MinCount=1, MaxCount=1)
    instanceId = res[0].id

    svc_manager_mock = mocker.MagicMock()
    svc_manager_mock.return_value = SvcManagerMocker([{'Key': 'Name', 'Value': 'test'}])

    mocker.patch.multiple(lambda_function, SvcManager=svc_manager_mock)

    lambda_function.get_agent_health_check_output(
        'aaa18f0f-9724-4e32-ae9e-acd12af9d7f1', instanceId, accountId='123456789012', region='us-east-1')


@mock_ec2
def test_get_instance_invocation(mocker, ddb_client):
    import lambda_function

    ec2 = boto3.resource("ec2", region_name='us-east-1')
    res = ec2.create_instances(ImageId='123456789012', MinCount=1, MaxCount=1)
    instanceId = res[0].id

    svc_manager_mock = mocker.MagicMock()
    svc_manager_mock.return_value = SvcManagerMocker([{'Key': 'Name', 'Value': 'test'}])

    mocker.patch.multiple(lambda_function, SvcManager=svc_manager_mock)

    lambda_function.get_instance_invocation(instanceId, accountId='123456789012', region='us-east-1')


@mock_ec2
def test_agent_health_check(mocker, ddb_client):
    import lambda_function

    ec2 = boto3.resource("ec2", region_name='us-east-1')
    res = ec2.create_instances(ImageId='123456789012', MinCount=1, MaxCount=1)
    instanceId = res[0].id

    svc_manager_mock = mocker.MagicMock()
    svc_manager_mock.return_value = SvcManagerMocker([{'Key': 'Name', 'Value': 'test'}])

    mocker.patch.multiple(lambda_function, SvcManager=svc_manager_mock)

    lambda_function.agent_health_check(instanceId, accountId='123456789012', region='us-east-1')


def test_parse_ssm_instance_info(mocker):
    import lambda_function

    # Given a instance info returned from ssm
    ssm_instance_info = test_ssm_instances_info_list[0]

    svc_manager_mock = mocker.MagicMock()
    svc_manager_mock.return_value = SvcManagerMocker([{'Key': 'Name', 'Value': 'test'}])

    mocker.patch.multiple(lambda_function, SvcManager=svc_manager_mock)

    # When ssm instance info is parsed
    instance = lambda_function.parse_ssm_instance_info(ssm_instance_info,
                                                       "123456789012",
                                                       os.environ.get("AWS_REGION"))

    # Then parsed result as expected
    assert instance['name'] == 'test'
    assert instance['id'] == ssm_instance_info['InstanceId']
    assert instance['platformName'] == ssm_instance_info['PlatformName']
    assert instance['ipAddress'] == ssm_instance_info['IPAddress']
