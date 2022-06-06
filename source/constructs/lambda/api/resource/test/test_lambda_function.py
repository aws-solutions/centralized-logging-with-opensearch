# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import json
import pytest
import os
import boto3

# import io
# import zipfile

from moto import (
    mock_sts,
    mock_s3,
    mock_ec2,
    mock_rds,
    mock_elbv2,
    # mock_lambda,
    # mock_iam,
    mock_acm,
    mock_cloudtrail,
    mock_cloudfront,
)


bucket_names = ["test-bucket1", "test-bucket2", "log-hub-bucket"]

test_data = [
    ("S3Bucket", "listResources", None),
    ("S3Bucket", "getResourceLoggingBucket", bucket_names[0]),
    ("S3Bucket", "putResourceLoggingBucket", bucket_names[0]),
    ("S3Bucket", "unknown", None),
    ("unknown", "listResources", None),
]


@pytest.fixture(params=test_data)
def test_event(request):
    with open("./test/event/test_event.json", "r") as f:
        event = json.load(f)

        type, action, resource_name = request.param
        event["arguments"]["type"] = type
        if resource_name:
            event["arguments"]["resourceName"] = resource_name
        event["info"]["fieldName"] = action
        print(event)
        return event


@pytest.fixture
def s3_client():

    with mock_s3():
        region = os.environ.get("AWS_REGION")

        s3 = boto3.resource("s3", region_name=region)
        # Create the buckets
        for bucket_name in bucket_names:
            s3.create_bucket(Bucket=bucket_name)

        default_bucket = os.environ.get("DEFAULT_LOGGING_BUCKET")
        assert default_bucket in bucket_names

        bucket_acl = s3.BucketAcl(default_bucket)
        bucket_acl.put(
            AccessControlPolicy={
                "Grants": [
                    {
                        "Grantee": {
                            "Type": "Group",
                            "URI": "http://acs.amazonaws.com/groups/s3/LogDelivery",
                        },
                        "Permission": "READ_ACP",
                    },
                    {
                        "Grantee": {
                            "Type": "Group",
                            "URI": "http://acs.amazonaws.com/groups/s3/LogDelivery",
                        },
                        "Permission": "WRITE",
                    },
                ],
                "Owner": {"ID": "aaa"},
            },
        )
        yield


@mock_sts
def test_lambda_handler(test_event, s3_client):
    import lambda_function

    print(">>>>>>>>>")
    print(test_event)

    # assert function excute with a result.
    result = lambda_function.lambda_handler(test_event, None)
    assert result is not None


class TestS3Bucket:
    def setup(self):
        from lambda_function import S3Bucket

        self._s3 = S3Bucket()

    def test_list(self, s3_client):
        result = self._s3.list()
        assert len(result) == 3

    def test_logging_bucket(self, s3_client):
        default_bucket = os.environ.get("DEFAULT_LOGGING_BUCKET")
        result = self._s3.get_logging_bucket(bucket_names[0])

        assert not result["enabled"]
        assert result["bucket"] == default_bucket

        result = self._s3.put_logging_bucket(bucket_names[0])
        assert result["enabled"]
        assert result["bucket"] == default_bucket


# @pytest.fixture
# def test_vpc():
#     with mock_ec2():
#         # region = os.environ.get("AWS_REGION")
#         # ec2 = boto3.resource("ec2", region_name=region)
#         # ec2.create_vpc(CidrBlock="10.0.0.0/16")
#         yield


class TestVPC:
    def setup(self):
        from lambda_function import VPC

        self._vpc = VPC()

    @mock_ec2
    def test_list(self):
        result = self._vpc.list()
        print(result)
        assert len(result) == 1


class TestSubnet:
    def setup(self):
        from lambda_function import Subnet

        self._subnet = Subnet()

    @mock_ec2
    def test_list(self):
        result = self._subnet.list()
        print(result)
        assert len(result) == 6


class TestSecurityGroup:
    def setup(self):
        from lambda_function import SecurityGroup

        self._sg = SecurityGroup()

    @mock_ec2
    def test_list(self):
        result = self._sg.list()
        print(result)
        assert len(result) == 1


class TestCertificate:
    def setup(self):
        from lambda_function import Certificate

        self._acm = Certificate()

    @mock_acm
    def test_list(self):
        result = self._acm.list()
        print(result)
        assert len(result) == 0


class TestKeyPair:
    mock_ec2 = mock_ec2()

    def _create_key(self):
        region = os.environ.get("AWS_REGION")
        ec2 = boto3.client("ec2", region_name=region)
        ec2.create_key_pair(KeyName="testkey")

    def setup(self):
        self.mock_ec2.start()
        from lambda_function import KeyPair

        self._kp = KeyPair()

    def tearDown(self):
        self.mock_ec2.stop()

    def test_list(self):
        result = self._kp.list()
        print(result)
        assert len(result) == 0


class TestDistribution:
    mock_cloudfront = mock_cloudfront()

    def _create_distribution(self):
        pass

    def setup(self):

        self.mock_cloudfront.start()

        from lambda_function import Distribution

        self._cf = Distribution()

    def tearDown(self):
        self.mock_cloudfront.stop()

    def test_list(self):

        result = self._cf.list()
        print(result)
        assert len(result) == 0


class TestTrail:
    mock_cloudtrail = mock_cloudtrail()
    mock_s3 = mock_s3()
    trail_name = "mytrail"
    bucket_name = "trail-bucket"

    def _create_trail(self):
        region = os.environ.get("AWS_REGION")

        s3 = boto3.resource("s3", region_name=region)
        # Create the bucket
        s3.create_bucket(Bucket=self.bucket_name)

        client = boto3.client("cloudtrail", region_name=region)
        client.create_trail(Name=self.trail_name, S3BucketName=self.bucket_name)

    def setup(self):
        # start mock
        self.mock_cloudtrail.start()
        self.mock_s3.start()
        # create test data
        self._create_trail()
        # init resource
        from lambda_function import Trail

        self._trail = Trail()

    def tearDown(self):
        self.mock_cloudtrail.stop()
        self.mock_s3.stop()

    def test_list(self):

        result = self._trail.list()
        print(result)
        assert len(result) == 1

    def test_logging_bucket(self):
        result = self._trail.get_logging_bucket(self.trail_name)

        assert result["enabled"]
        assert result["bucket"] == self.bucket_name


class TestRDS:

    mock_rds = mock_rds()

    def _create_rds(self):
        region = os.environ.get("AWS_REGION")
        client = boto3.client("rds", region_name=region)
        client.create_db_instance(
            DBInstanceIdentifier="db-master-1",
            AllocatedStorage=10,
            Engine="mysql",
            DBName="test",
            DBInstanceClass="db.m1.small",
            MasterUsername="admin",
            MasterUserPassword="admin",
            Port=3206,
            DBSecurityGroups=["my_sg"],
            VpcSecurityGroupIds=["sg-123456"],
        )

    def setup(self):
        self.mock_rds.start()
        self._create_rds()

        from lambda_function import RDS

        self._rds = RDS()

    def tearDown(self):
        self.mock_rds.stop()

    def test_list(self):
        result = self._rds.list()
        print(result)
        assert len(result) == 1


# class TestLambda:

#     mock_lambda = mock_lambda()
#     mock_iam = mock_iam()

#     def _get_zip(self):

#         zip_output = io.BytesIO()
#         zip_file = zipfile.ZipFile(zip_output, "w", zipfile.ZIP_DEFLATED)
#         zip_file.writestr("lambda_function.py", "print('hello')")
#         zip_file.close()
#         zip_output.seek(0)
#         return zip_output.read()

#     def _create_role(self, region):
#         iam = boto3.client("iam", region_name=region)
#         resp = iam.create_role(
#             RoleName="lambda-role",
#             AssumeRolePolicyDocument="some policy",
#             # Path="/my-path/",
#         )
#         return resp["Role"]["Arn"]

#     def _create_lambda(self):
#         region = os.environ.get("AWS_REGION")
#         role_arn = self._create_role(region)

#         client = boto3.client("lambda", region_name=region)
#         client.create_function(
#             FunctionName="test",
#             Runtime="python3.7",
#             Role=role_arn,
#             Handler="lambda_function.lambda_handler",
#             Code={"ZipFile": self._get_zip()},
#         )

#     def setup(self):
#         # start mock
#         self.mock_lambda.start()
#         self.mock_iam.start()
#         # Create test data
#         self._create_lambda()
#         # Init resource
#         from lambda_function import Lambda

#         self._lambda = Lambda()

#     def tearDown(self):
#         self.mock_lambda.stop()

#     def test_list(self):
#         result = self._lambda.list()
#         print(result)
#         assert len(result) == 1


class TestELB:
    mock_ec2 = mock_ec2()
    mock_elb = mock_elbv2()

    def _create_elb(self):
        region = os.environ.get("AWS_REGION")
        elb = boto3.client("elbv2", region_name=region)
        ec2 = boto3.resource("ec2", region_name=region)

        sg = ec2.create_security_group(
            GroupName="test-sg", Description="Test Security Group"
        )
        vpc = ec2.create_vpc(CidrBlock="172.28.7.0/24", InstanceTenancy="default")
        subnet1 = ec2.create_subnet(
            VpcId=vpc.id, CidrBlock="172.28.7.0/26", AvailabilityZone=region + "a"
        )
        subnet2 = ec2.create_subnet(
            VpcId=vpc.id, CidrBlock="172.28.7.192/26", AvailabilityZone=region + "b"
        )

        elb.create_load_balancer(
            Name="test-lb",
            SubnetMappings=[{"SubnetId": subnet1.id}, {"SubnetId": subnet2.id}],
            SecurityGroups=[sg.id],
            Scheme="internal",
        )

    def setup(self):
        # start mock
        self.mock_ec2.start()
        self.mock_elb.start()
        # create test data
        self._create_elb()
        # init resource
        from lambda_function import ELB

        self._elb = ELB()

    def test_list(self):

        result = self._elb.list()
        print(result)
        assert len(result) == 1


# class TestWAF:

#     mock_waf = mock_wafv2()
#     mock_s3 = mock_s3()

#     def setup(self):
#         self.mock_waf.start()
#         self.mock_s3.start()
#         # region = os.environ.get("AWS_REGION")
#         # conn = boto3.client("wafv2", region_name=region)
#         # conn.create_web_acl(
#         #     Scope="CLOUDFRONT",
#         #     Name="TEST",
#         #     DefaultAction={"Allow": {}},
#         #     VisibilityConfig={
#         #         "SampledRequestsEnabled": False,
#         #         "CloudWatchMetricsEnabled": False,
#         #         "MetricName": "test",
#         #     },
#         # )
#         from lambda_function import WAF

#         self._waf = WAF()

#     def test_list(self):
#         result = self._waf.list()
#         print(result)
#         assert len(result) == 0
