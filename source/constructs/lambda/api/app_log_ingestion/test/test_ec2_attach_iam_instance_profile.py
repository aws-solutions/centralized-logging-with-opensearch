# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import os
import sys
import json
import copy
import boto3
import pytest
from moto import mock_ec2, mock_iam, mock_dynamodb, mock_sts


sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


@pytest.fixture(autouse=True)
def default_environment_variables():
    """Mocked AWS evivronment variables such as AWS credentials and region"""
    os.environ["AWS_ACCESS_KEY_ID"] = "mocked-aws-access-key-id"
    os.environ["AWS_SECRET_ACCESS_KEY"] = "mocked-aws-secret-access-key"
    os.environ["AWS_SESSION_TOKEN"] = "mocked-aws-session-token"
    os.environ["AWS_REGION"] = "us-east-1"
    os.environ["AWS_DEFAULT_REGION"] = "us-east-1"
    os.environ["ACCOUNT_ID"] = "123456789012"
    os.environ["SUB_ACCOUNT_ID"] = '111111111111'


@pytest.fixture
def mock_iam_context():
    with mock_iam():
        iam_client = boto3.client('iam')
        assume_role_policy_document = {
            "Version": "2012-10-17",
            "Statement": [
                {
                    "Effect": "Allow",
                    "Principal": {
                        "Service": "lambda.amazonaws.com"
                    },
                    "Action": "sts:AssumeRole"
                    }
                ]
            }
        
        policy_document = {
            'Version': '2012-10-17',
            'Statement': [
                {
                    'Effect': 'Allow',
                    'Action': [
                        "s3:ListBucket",
                        "s3:ListBucketMultipartUploads",
                        "s3:ListMultipartUploadParts",
                        "s3:GetObject",
                        "s3:GetBucketLocation",
                        "s3:AbortMultipartUpload",
                        "s3:CreateBucket",
                        "s3:PutObject",
                        "s3:DeleteObject",
                        ],
                    'Resource': [
                        'arn:aws:s3:::logging-bucket',
                        'arn:aws:s3:::logging-bucket/*',
                        ],
                    }
                ]
            }
        response = iam_client.create_role(RoleName='CUSTOMER_IAM_INSTANCE_PROFILE_ROLE',
                                          AssumeRolePolicyDocument=json.dumps(assume_role_policy_document))
        customer_role_name = response['Role']['RoleName']
        iam_client.put_role_policy(RoleName=customer_role_name, 
                                   PolicyName='CUSTOMER_IAM_INSTANCE_PROFILE_POLICY',
                                   PolicyDocument=json.dumps(policy_document))
        response = iam_client.create_instance_profile(InstanceProfileName='CUSTOMER_IAM_INSTANCE_PROFILE_NAME')
        customer_instance_profile_arn = response['InstanceProfile']['Arn']
        customer_instance_profile_name = response['InstanceProfile']['InstanceProfileName']
        iam_client.add_role_to_instance_profile(InstanceProfileName=customer_instance_profile_name,
                                                RoleName=customer_role_name)
        
        default_ec2_policy = {
            "Version": "2012-10-17",
            "Statement": [
                {
                    "Sid": "VisualEditor0",
                    "Effect": "Allow",
                    "Action": "s3:GetObject",
                    "Resource": [
                        "arn:aws:s3:::logging-bucket",
                        "arn:aws:s3:::logging-bucket/*"
                    ]
                },
                {
                    "Sid": "VisualEditor1",
                    "Effect": "Allow",
                    "Action": "sts:AssumeRole",
                    "Resource": "arn:aws:iam::123456789012:role/CL-AppPipe-*-BufferAccessRole*"
                },

                {
                    "Effect": "Allow",
                    "Action": [
                        "ssm:DescribeInstanceProperties",
                        "ssm:UpdateInstanceInformation"
                    ],
                    "Resource": "*"
                },
                {
                    "Effect": "Allow",
                    "Action": [
                        "ec2messages:GetEndpoint",
                        "ec2messages:AcknowledgeMessage",
                        "ec2messages:SendReply",
                        "ec2messages:GetMessages"
                    ],
                    "Resource": "*"
                }
            ]
        }
        response = iam_client.create_policy(
            PolicyName='CLO-Ec2IamInstanceProfilePolicy-UBvJXK9fmnad',
            PolicyDocument=json.dumps(default_ec2_policy),
            )
        policy_arn = response['Policy']['Arn']
        response = iam_client.create_role(RoleName='EC2_IAM_INSTANCE_PROFILE_ROLE',
                                          AssumeRolePolicyDocument=json.dumps(assume_role_policy_document))
        role_arn = response['Role']['Arn']
        role_name = response['Role']['RoleName']
        iam_client.attach_role_policy(RoleName=role_name, PolicyArn=policy_arn)
        response = iam_client.create_instance_profile(InstanceProfileName='EC2_IAM_INSTANCE_PROFILE_NAME')
        ec2_instance_profile_arn = response['InstanceProfile']['Arn']
        ec2_instance_profile_name = response['InstanceProfile']['InstanceProfileName']
        iam_client.add_role_to_instance_profile(InstanceProfileName=ec2_instance_profile_name,
                                                RoleName=role_name)
        
        
        os.environ['CUSTOMER_IAM_INSTANCE_PROFILE_ARN'] = customer_instance_profile_arn
        os.environ['CUSTOMER_IAM_INSTANCE_PROFILE_NAME'] = customer_instance_profile_name
        
        os.environ['EC2_IAM_INSTANCE_PROFILE_ARN'] =  ec2_instance_profile_arn
        os.environ['EC2_IAM_INSTANCE_PROFILE_ROLE_ARN'] = role_arn
        os.environ['EC2_IAM_INSTANCE_PROFILE_POLICY_ARN'] = policy_arn
        yield


@pytest.fixture
def mock_ec2_context():
    with mock_ec2():
        customer_iam_instance_profile_arn = os.environ['CUSTOMER_IAM_INSTANCE_PROFILE_ARN']
        customer_iam_instance_profile_name = os.environ['CUSTOMER_IAM_INSTANCE_PROFILE_NAME']

        ec2_client = boto3.client('ec2')
        
        amis = ec2_client.describe_images()
        image_id = amis['Images'][0]['ImageId']
        
        associate_instance_profile_instance_id = []
        for i in range(2):
            response= ec2_client.run_instances(InstanceType='m6g.medium',
                                            MinCount=1,
                                            MaxCount=1,
                                            ImageId=image_id)
            
            instance_id = response['Instances'][0]['InstanceId']
            ec2_client.associate_iam_instance_profile(
                IamInstanceProfile={
                    'Arn': customer_iam_instance_profile_arn,
                    'Name': customer_iam_instance_profile_name
                    },
                InstanceId=instance_id
                )
            associate_instance_profile_instance_id.append(instance_id)
    
        not_associate_instance_profile_instance_id = []
        for i in range(2):
            response= ec2_client.run_instances(InstanceType='m6g.medium',
                                            MinCount=1,
                                            MaxCount=1,
                                            ImageId=image_id)
            
            instance_id = response['Instances'][0]['InstanceId']
            not_associate_instance_profile_instance_id.append(instance_id)

        os.environ['ASSOCIATE_INSTANCE_PROFILE_INSTANCE_ID'] = json.dumps(associate_instance_profile_instance_id)
        os.environ['NOT_ASSOCIATE_INSTANCE_PROFILE_INSTANCE_ID'] = json.dumps(not_associate_instance_profile_instance_id)
        yield


@pytest.fixture
def mock_ddb_context():
    with mock_dynamodb():
        sub_account_table_name = 'SubAccountLinkTable'
        sub_account_id = os.environ["SUB_ACCOUNT_ID"]
        region = os.environ["AWS_REGION"]
        ec2_instance_profile_arn = os.environ['EC2_IAM_INSTANCE_PROFILE_ARN']
        
        ddb_client = boto3.client('dynamodb')
        ddb_client.create_table(
            TableName=sub_account_table_name,
            KeySchema=[
                {
                    'AttributeName': 'subAccountId',
                    'KeyType': 'HASH'
                },
                {
                    'AttributeName': 'region',
                    'KeyType': 'RANGE'
                }
            ],
            AttributeDefinitions=[
                {
                    'AttributeName': 'subAccountId',
                    'AttributeType': 'S'
                },
                {
                    'AttributeName': 'region',
                    'AttributeType': 'S'
                },
            ],
            ProvisionedThroughput={
                'ReadCapacityUnits': 5,
                'WriteCapacityUnits': 5
            }
        )
        
        ddb_client.put_item(
            TableName=sub_account_table_name,
            Item={
                'subAccountId': { 'S': sub_account_id },
                'region': { 'S': region },
                'subAccountName': { 'S': "sub-account-01" },
                'subAccountRoleArn': { 'S': "arn:aws:iam::xxx:role/CrossAccount-CrossAccountRoleFACE29D1" },
                'agentInstallDoc': { 'S': "CrossAccount-FluentBitDocumentInstallation-FgTWXJU7Jj0P" },
                'agentConfDoc': { 'S': "CrossAccount-FluentBitConfigDownloading-6MPXkhKrK4II" },
                'subAccountBucketName': { 'S': "amzn-s3-demo-logging-bucket" },
                'subAccountStackId': { 'S': "arn:aws:cloudformation:us-east-1:xxx:stack/CrossAccount/ff21" },
                'subAccountKMSKeyArn': { 'S': "arn:aws:kms:us-east-1:xxx:key/16ae67ab-0991-4ddb-a65b-1dd91cec52dd" },
                'subAccountIamInstanceProfileArn': { 'S': ec2_instance_profile_arn },
                'createdAt': { 'S': "2022-06-20T08:20:45Z" },
                'status': { 'S': "ACTIVE" },
            })
        
        os.environ['SUB_ACCOUNT_LINK_TABLE_NAME'] = sub_account_table_name
        yield
                

def test_get_add_role_arn_from_instance_profile(mock_iam_context, mock_ec2_context):
    from svc.ec2_attach_iam_instance_profile import get_add_role_arn_from_instance_profile, conn
    
    ec2_iam_instance_profile_arn = os.environ['EC2_IAM_INSTANCE_PROFILE_ARN']
    ec2_iam_instance_profile_role_arn = os.environ['EC2_IAM_INSTANCE_PROFILE_ROLE_ARN']
    ec2_iam_instance_profile_name = ec2_iam_instance_profile_arn.split('/')[-1]
    ec2_iam_instance_profile_role_name = ec2_iam_instance_profile_role_arn.split('/')[-1]
    
    iam_client = conn.get_client('iam')
    
    response = get_add_role_arn_from_instance_profile(iam_client=iam_client, associate_instance_profile_arn=ec2_iam_instance_profile_arn)
    assert response == ec2_iam_instance_profile_role_arn
    
    iam_client.remove_role_from_instance_profile(InstanceProfileName=ec2_iam_instance_profile_name, RoleName=ec2_iam_instance_profile_role_name)
    with pytest.raises(ValueError):
        get_add_role_arn_from_instance_profile(iam_client=iam_client, associate_instance_profile_arn=ec2_iam_instance_profile_arn)


@pytest.fixture
def mock_sts_context():
    with mock_sts():
        yield
        
        
def test_get_attach_policy_arn_from_role(mock_iam_context, mock_ec2_context):
    from svc.ec2_attach_iam_instance_profile import get_attach_policy_arn_from_role, conn
    
    ec2_iam_instance_profile_role_arn = os.environ['EC2_IAM_INSTANCE_PROFILE_ROLE_ARN']
    ec2_iam_instance_profile_policy_arn = os.environ['EC2_IAM_INSTANCE_PROFILE_POLICY_ARN']
    ec2_iam_instance_profile_role_name = ec2_iam_instance_profile_role_arn.split('/')[-1]
    
    iam_client = conn.get_client('iam')
    
    response = get_attach_policy_arn_from_role(iam_client=iam_client, role_arn=ec2_iam_instance_profile_role_arn)
    assert response == ec2_iam_instance_profile_policy_arn
    
    iam_client.detach_role_policy(RoleName=ec2_iam_instance_profile_role_name, PolicyArn=ec2_iam_instance_profile_policy_arn)
    with pytest.raises(ValueError):
        get_attach_policy_arn_from_role(iam_client=iam_client, role_arn=ec2_iam_instance_profile_role_arn)


def test_get_ec2_iam_instance_profile(mock_iam_context, mock_ec2_context):
    from svc.ec2_attach_iam_instance_profile import get_ec2_iam_instance_profile_associate_status, conn
    
    customer_instance_profile_arn = os.environ['CUSTOMER_IAM_INSTANCE_PROFILE_ARN']
    associate_instance_profile_instance_id = json.loads(os.environ['ASSOCIATE_INSTANCE_PROFILE_INSTANCE_ID'])
    not_associate_instance_profile_instance_id = json.loads(os.environ['NOT_ASSOCIATE_INSTANCE_PROFILE_INSTANCE_ID'])
    
    instance_ids = associate_instance_profile_instance_id + not_associate_instance_profile_instance_id
    ec2_client = conn.get_client('ec2')
    
    response  = get_ec2_iam_instance_profile_associate_status(ec2_client=ec2_client, instance_ids=instance_ids)
    assert customer_instance_profile_arn in response['IamInstanceProfileArns']
    assert response['DisassociateInstanceIds'] == not_associate_instance_profile_instance_id


def test_attach_permission_to_instance(mock_iam_context, mock_ec2_context, mock_ddb_context, mock_sts_context):
    from svc.ec2_attach_iam_instance_profile import get_ec2_iam_instance_profile_associate_status, attach_permission_to_instance, conn
    
    sub_account_id = os.environ["SUB_ACCOUNT_ID"]
    region = os.environ["AWS_REGION"]
    ec2_instance_profile_arn = os.environ['EC2_IAM_INSTANCE_PROFILE_ARN']
    ec2_instance_profile_policy_arn = os.environ['EC2_IAM_INSTANCE_PROFILE_POLICY_ARN']
    ec2_instance_profile_policy_name = ec2_instance_profile_policy_arn.split('/')[-1]
    associate_instance_profile_instance_id = json.loads(os.environ['ASSOCIATE_INSTANCE_PROFILE_INSTANCE_ID'])
    not_associate_instance_profile_instance_id = json.loads(os.environ['NOT_ASSOCIATE_INSTANCE_PROFILE_INSTANCE_ID'])
    
    ec2_client = conn.get_client('ec2')
    iam_client = conn.get_client('iam')
    
    instance_ids = associate_instance_profile_instance_id + not_associate_instance_profile_instance_id
    attach_permission_to_instance(instance_ids=instance_ids, associate_instance_profile_arn=ec2_instance_profile_arn, sts_role_arn='')

    response = get_ec2_iam_instance_profile_associate_status(ec2_client=ec2_client, instance_ids=not_associate_instance_profile_instance_id)
    assert response['IamInstanceProfileArns'] == [ec2_instance_profile_arn]
    assert response['DisassociateInstanceIds'] == []
    
    response = get_ec2_iam_instance_profile_associate_status(ec2_client=ec2_client, instance_ids=associate_instance_profile_instance_id)
    instance_profile_arns = response['IamInstanceProfileArns']
    for instance_profile_arn in instance_profile_arns:
        instance_profile_name = instance_profile_arn.split('/')[-1]
        instance_profile_info = iam_client.get_instance_profile(InstanceProfileName=instance_profile_name)
        role_name = instance_profile_info['InstanceProfile']['Roles'][0]['RoleName']
        policies = iam_client.list_attached_role_policies(RoleName=role_name)
        assert {'PolicyName': ec2_instance_profile_policy_name, 'PolicyArn': ec2_instance_profile_policy_arn} in policies['AttachedPolicies']

    instance_ids = []
    attach_permission_to_instance(instance_ids=instance_ids, associate_instance_profile_arn=ec2_instance_profile_arn, sts_role_arn='')

    response = get_ec2_iam_instance_profile_associate_status(ec2_client=ec2_client, instance_ids=instance_ids)
    assert response['IamInstanceProfileArns'] == []
    assert response['DisassociateInstanceIds'] == []
    
    attach_permission_to_instance(instance_ids=instance_ids, associate_instance_profile_arn=ec2_instance_profile_arn, sts_role_arn='arn:aws:iam::xxx:role/CrossAccount-CrossAccountRoleFACE29D1')

    response = get_ec2_iam_instance_profile_associate_status(ec2_client=ec2_client, instance_ids=not_associate_instance_profile_instance_id)
    assert response['IamInstanceProfileArns'] == []
    assert response['DisassociateInstanceIds'] == []


def test_attach_policy_to_instance_profile_role(mock_iam_context, mock_ec2_context):
    from svc.ec2_attach_iam_instance_profile import get_ec2_iam_instance_profile_associate_status, attach_policy_to_instance_profile_role, conn
    
    ec2_instance_profile_role_arn = os.environ['EC2_IAM_INSTANCE_PROFILE_ROLE_ARN']
    ec2_instance_profile_policy_arn = os.environ['EC2_IAM_INSTANCE_PROFILE_POLICY_ARN']
    ec2_instance_profile_policy_name = ec2_instance_profile_policy_arn.split('/')[-1]
    associate_instance_profile_instance_id = json.loads(os.environ['ASSOCIATE_INSTANCE_PROFILE_INSTANCE_ID'])
    
    ec2_client = conn.get_client('ec2')
    iam_client = conn.get_client('iam')
    
    response = get_ec2_iam_instance_profile_associate_status(ec2_client=ec2_client, instance_ids=associate_instance_profile_instance_id)
    instance_profile_arns = response['IamInstanceProfileArns']
    attach_policy_to_instance_profile_role(iam_client=iam_client, add_role_arn=ec2_instance_profile_role_arn,
                                           attach_policy_arn=ec2_instance_profile_policy_arn,
                                           instance_profile_arns=instance_profile_arns)
    
    for instance_profile_arn in instance_profile_arns:
        instance_profile_name = instance_profile_arn.split('/')[-1]
        instance_profile_info = iam_client.get_instance_profile(InstanceProfileName=instance_profile_name)
        role_name = instance_profile_info['InstanceProfile']['Roles'][0]['RoleName']
        policies = iam_client.list_attached_role_policies(RoleName=role_name)
        assert {'PolicyName': ec2_instance_profile_policy_name, 'PolicyArn': ec2_instance_profile_policy_arn} in policies['AttachedPolicies']
    
    attach_policy_to_instance_profile_role(iam_client=iam_client, add_role_arn=ec2_instance_profile_role_arn,
                                           attach_policy_arn=ec2_instance_profile_policy_arn,
                                           instance_profile_arns=[])

    
def test_associate_iam_instance_profile(mock_iam_context, mock_ec2_context):
    from svc.ec2_attach_iam_instance_profile import get_ec2_iam_instance_profile_associate_status, associate_iam_instance_profile, conn

    ec2_instance_profile_arn = os.environ['EC2_IAM_INSTANCE_PROFILE_ARN']
    not_associate_instance_profile_instance_id = json.loads(os.environ['NOT_ASSOCIATE_INSTANCE_PROFILE_INSTANCE_ID'])
    
    ec2_client = conn.get_client('ec2')

    instance_ids = copy.deepcopy(not_associate_instance_profile_instance_id)
    associate_iam_instance_profile(ec2_client=ec2_client, associate_instance_profile_arn=ec2_instance_profile_arn, instance_ids=instance_ids)
    response = get_ec2_iam_instance_profile_associate_status(ec2_client=ec2_client, instance_ids=instance_ids)
    print(response)
    
    assert response['IamInstanceProfileArns'] == [ec2_instance_profile_arn]
    assert response['DisassociateInstanceIds'] == []
    
    instance_ids = copy.deepcopy(not_associate_instance_profile_instance_id)
    associate_iam_instance_profile(ec2_client=ec2_client, associate_instance_profile_arn=ec2_instance_profile_arn, instance_ids=instance_ids)
    response = get_ec2_iam_instance_profile_associate_status(ec2_client=ec2_client, instance_ids=instance_ids)
    
    assert response['IamInstanceProfileArns'] == [ec2_instance_profile_arn]
    assert response['DisassociateInstanceIds'] == []
    
    instance_ids = []
    associate_iam_instance_profile(ec2_client=ec2_client, associate_instance_profile_arn=ec2_instance_profile_arn, instance_ids=instance_ids)
    response = get_ec2_iam_instance_profile_associate_status(ec2_client=ec2_client, instance_ids=instance_ids)

    assert response['IamInstanceProfileArns'] == []
    assert response['DisassociateInstanceIds'] == []

    # test attach instance profile to none exit instance
    instance_ids = ['i-12345678901234567']
    associate_iam_instance_profile(ec2_client=ec2_client, associate_instance_profile_arn=ec2_instance_profile_arn, instance_ids=instance_ids)
    response = get_ec2_iam_instance_profile_associate_status(ec2_client=ec2_client, instance_ids=instance_ids)
    print(response)
    assert response['IamInstanceProfileArns'] == []
    assert response['DisassociateInstanceIds'] == ['i-12345678901234567']


    