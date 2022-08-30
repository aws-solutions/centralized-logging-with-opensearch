# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import json
import pytest
import os
import boto3

import io
import zipfile


from moto import (
    mock_sts,
    mock_s3,
    mock_ec2,
    mock_rds,
    mock_elbv2,
    mock_lambda,
    mock_iam,
    mock_acm,
    mock_cloudtrail,
    mock_cloudfront,
    mock_config,
    mock_dynamodb,
    mock_wafv2,
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


@pytest.fixture
def sts_client():
    with mock_sts():
        boto3.client("sts", region_name=os.environ.get("AWS_REGION"))
        yield


@pytest.fixture
def ddb_client():
    with mock_dynamodb():
        ddb = boto3.resource("dynamodb", region_name=os.environ.get("AWS_REGION"))
        ddb.create_table(
            TableName=os.environ.get("SUB_ACCOUNT_LINK_TABLE_NAME"),
            KeySchema=[{"AttributeName": "id", "KeyType": "HASH"}],
            AttributeDefinitions=[{"AttributeName": "id", "AttributeType": "S"}],
            ProvisionedThroughput={"ReadCapacityUnits": 5, "WriteCapacityUnits": 5},
        )
        yield


@mock_sts
def test_lambda_handler(test_event, s3_client, sts_client):
    import lambda_function

    print(">>>>>>>>>")
    print(test_event)

    # assert function excute with a result.
    result = lambda_function.lambda_handler(test_event, None)
    assert result is not None


class TestS3Bucket:
    def test_list(self, s3_client, sts_client, ddb_client):
        from lambda_function import S3Bucket

        sts = boto3.client("sts", region_name=os.environ.get("AWS_REGION"))
        account_id = sts.get_caller_identity()["Account"]
        self._s3 = S3Bucket(accountId=account_id, region=os.environ.get("AWS_REGION"))
        result = self._s3.list()
        assert len(result) == 3

    def test_logging_bucket(self, s3_client, sts_client, ddb_client):
        from lambda_function import S3Bucket

        sts = boto3.client("sts", region_name=os.environ.get("AWS_REGION"))
        account_id = sts.get_caller_identity()["Account"]
        self._s3 = S3Bucket(accountId=account_id, region=os.environ.get("AWS_REGION"))

        default_bucket = os.environ.get("DEFAULT_LOGGING_BUCKET")
        result = self._s3.get_logging_bucket(bucket_names[0])

        assert not result["enabled"]
        assert result["bucket"] == default_bucket

        result = self._s3.put_logging_bucket(bucket_names[0])
        assert result["enabled"]
        assert result["bucket"] == default_bucket


class TestVPC:
    @mock_ec2
    def test_list(self, sts_client, ddb_client):
        from lambda_function import VPC

        sts = boto3.client("sts", region_name=os.environ.get("AWS_REGION"))
        account_id = sts.get_caller_identity()["Account"]
        self._vpc = VPC(accountId=account_id, region=os.environ.get("AWS_REGION"))

        vpc_id = self._create_vpc()
        result = self._vpc.list()
        print(result)
        assert len(result) == 2

    @mock_ec2
    def test_get_logging_bucket(self, s3_client, sts_client, ddb_client):
        from lambda_function import VPC

        sts = boto3.client("sts", region_name=os.environ.get("AWS_REGION"))
        account_id = sts.get_caller_identity()["Account"]
        self._vpc = VPC(accountId=account_id, region=os.environ.get("AWS_REGION"))

        default_logging_bucket = os.environ.get("DEFAULT_LOGGING_BUCKET")
        vpc_id = self._create_vpc()
        log_not_enabled_vpc = self._vpc.get_logging_bucket(vpc_id)
        assert not log_not_enabled_vpc["enabled"]
        assert log_not_enabled_vpc["bucket"] == default_logging_bucket

        ec2 = boto3.client("ec2", region_name=os.environ.get("AWS_REGION"))
        ec2.create_flow_logs(
            ResourceIds=[vpc_id],
            ResourceType="VPC",
            TrafficType="ALL",
            LogDestinationType="s3",
            LogDestination=f"arn:aws:s3:::{default_logging_bucket}",
        )
        log_enabled_vpc = self._vpc.get_logging_bucket(vpc_id)
        assert log_enabled_vpc["enabled"]

    @mock_ec2
    def test_put_logging_bucket(self, sts_client, ddb_client):
        from lambda_function import VPC

        sts = boto3.client("sts", region_name=os.environ.get("AWS_REGION"))
        account_id = sts.get_caller_identity()["Account"]
        self._vpc = VPC(accountId=account_id, region=os.environ.get("AWS_REGION"))

        vpc_id = self._create_vpc()
        res = self._vpc.put_logging_bucket(vpc_id)
        assert res["enabled"]

    def _create_vpc(self):
        ec2 = boto3.client("ec2", region_name=os.environ.get("AWS_REGION"))
        # Create the vpc
        res = ec2.create_vpc(
            CidrBlock="0.0.0.0/16",
            TagSpecifications=[
                {
                    "ResourceType": "VPC",
                    "Tags": [
                        {"Key": "Name", "Value": "Test"},
                    ],
                },
            ],
        )
        return res["Vpc"]["VpcId"]


class TestSubnet:
    @mock_ec2
    def test_list(self, sts_client, ddb_client):
        from lambda_function import Subnet

        sts = boto3.client("sts", region_name=os.environ.get("AWS_REGION"))
        account_id = sts.get_caller_identity()["Account"]
        self._subnet = Subnet(accountId=account_id, region=os.environ.get("AWS_REGION"))

        result = self._subnet.list()
        print(result)
        assert len(result) == 6


class TestSecurityGroup:
    @mock_ec2
    def test_list(self, sts_client, ddb_client):
        from lambda_function import SecurityGroup

        sts = boto3.client("sts", region_name=os.environ.get("AWS_REGION"))
        account_id = sts.get_caller_identity()["Account"]
        self._sg = SecurityGroup(
            accountId=account_id, region=os.environ.get("AWS_REGION")
        )

        result = self._sg.list()
        print(result)
        assert len(result) == 1


class TestCertificate:
    @mock_acm
    def test_list(self, sts_client, ddb_client):
        from lambda_function import Certificate

        sts = boto3.client("sts", region_name=os.environ.get("AWS_REGION"))
        account_id = sts.get_caller_identity()["Account"]
        self._acm = Certificate(
            accountId=account_id, region=os.environ.get("AWS_REGION")
        )

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

    def tearDown(self):
        self.mock_ec2.stop()

    def test_list(self, sts_client, ddb_client):
        from lambda_function import KeyPair

        sts = boto3.client("sts", region_name=os.environ.get("AWS_REGION"))
        account_id = sts.get_caller_identity()["Account"]
        self._kp = KeyPair(accountId=account_id, region=os.environ.get("AWS_REGION"))

        result = self._kp.list()
        print(result)
        assert len(result) == 0


class TestDistribution:
    mock_cloudfront = mock_cloudfront()

    def _create_distribution(self):
        region = os.environ.get("AWS_REGION")
        cloudfront_client = boto3.client("cloudfront", region_name=region)
        resp = cloudfront_client.create_distribution(
            DistributionConfig=dict(
                CallerReference="firstOne",
                Aliases=dict(Quantity=1, Items=["mydomain.com"]),
                DefaultRootObject="index.html",
                Comment="Test distribution",
                Enabled=True,
                Origins=dict(
                    Quantity=1,
                    Items=[
                        dict(
                            Id="1",
                            DomainName="mydomain.com.s3.amazonaws.com",
                            S3OriginConfig=dict(OriginAccessIdentity=""),
                        )
                    ],
                ),
                DefaultCacheBehavior=dict(
                    TargetOriginId="1",
                    ViewerProtocolPolicy="redirect-to-https",
                    TrustedSigners=dict(Quantity=0, Enabled=False),
                    ForwardedValues=dict(
                        Cookies={"Forward": "all"},
                        Headers=dict(Quantity=0),
                        QueryString=False,
                        QueryStringCacheKeys=dict(Quantity=0),
                    ),
                    MinTTL=1000,
                ),
            )
        )
        return resp

    def setup(self):

        self.mock_cloudfront.start()
        resp = self._create_distribution()
        self._distribution_id = resp["Distribution"]["Id"]

    def tearDown(self):
        self.mock_cloudfront.stop()

    def test_list(self, sts_client, ddb_client):
        from lambda_function import Distribution

        sts = boto3.client("sts", region_name=os.environ.get("AWS_REGION"))
        account_id = sts.get_caller_identity()["Account"]
        self._cf = Distribution(
            accountId=account_id, region=os.environ.get("AWS_REGION")
        )

        result = self._cf.list()
        print(result)
        assert len(result) == 0
    
    def test_put_logging_bucket(self, sts_client, ddb_client):
        from lambda_function import Distribution

        sts = boto3.client("sts", region_name=os.environ.get("AWS_REGION"))
        account_id = sts.get_caller_identity()["Account"]
        self._cf = Distribution(
            accountId=account_id, region=os.environ.get("AWS_REGION")
        )
        with pytest.raises(RuntimeError):
            self._cf.put_logging_bucket(self._distribution_id)


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

        # Create a CloudTrail with bucket in another region, this trail will not be listed
        s3.create_bucket(
            Bucket="bucket-us-west-2",
            CreateBucketConfiguration={"LocationConstraint": "us-west-2"},
        )
        client.create_trail(Name="trail-us-west-2", S3BucketName="bucket-us-west-2")

    def setup(self):
        # start mock
        self.mock_cloudtrail.start()
        self.mock_s3.start()
        # create test data
        self._create_trail()

    def tearDown(self):
        self.mock_cloudtrail.stop()
        self.mock_s3.stop()

    def test_list(self, sts_client, ddb_client):
        from lambda_function import Trail

        sts = boto3.client("sts", region_name=os.environ.get("AWS_REGION"))
        account_id = sts.get_caller_identity()["Account"]
        self._trail = Trail(accountId=account_id, region=os.environ.get("AWS_REGION"))

        result = self._trail.list()
        print(result)
        assert len(result) == 1

    def test_logging_bucket(self, sts_client, ddb_client):
        from lambda_function import Trail

        sts = boto3.client("sts", region_name=os.environ.get("AWS_REGION"))
        account_id = sts.get_caller_identity()["Account"]
        self._trail = Trail(accountId=account_id, region=os.environ.get("AWS_REGION"))

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

    def tearDown(self):
        self.mock_rds.stop()

    def test_list(self, sts_client, ddb_client):
        from lambda_function import RDS

        sts = boto3.client("sts", region_name=os.environ.get("AWS_REGION"))
        account_id = sts.get_caller_identity()["Account"]
        self._rds = RDS(accountId=account_id, region=os.environ.get("AWS_REGION"))

        result = self._rds.list()
        print(result)
        assert len(result) == 1


class TestLambda:

    mock_lambda = mock_lambda()
    mock_iam = mock_iam()

    def _get_zip(self):

        zip_output = io.BytesIO()
        zip_file = zipfile.ZipFile(zip_output, "w", zipfile.ZIP_DEFLATED)
        zip_file.writestr("lambda_function.py", "print('hello')")
        zip_file.close()
        zip_output.seek(0)
        return zip_output.read()

    def _create_role(self, region):
        iam = boto3.client("iam", region_name=region)
        resp = iam.create_role(
            RoleName="lambda-role",
            AssumeRolePolicyDocument="some policy",
            # Path="/my-path/",
        )
        return resp["Role"]["Arn"]

    def _create_lambda(self):
        region = os.environ.get("AWS_REGION")
        role_arn = self._create_role(region)

        client = boto3.client("lambda", region_name=region)
        client.create_function(
            FunctionName="test",
            Runtime="python3.7",
            Role=role_arn,
            Handler="lambda_function.lambda_handler",
            Code={"ZipFile": self._get_zip()},
        )

    def setup(self):
        # start mock
        self.mock_lambda.start()
        self.mock_iam.start()
        # Create test data
        self._create_lambda()
        # Init resource
        from lambda_function import Lambda

        self._lambda = Lambda()

    def tearDown(self):
        self.mock_lambda.stop()

    def test_list(self, sts_client):
        result = self._lambda.list()
        print(result)
        assert len(result) == 1


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

        resp = elb.create_load_balancer(
            Name="test-lb",
            SubnetMappings=[{"SubnetId": subnet1.id}, {"SubnetId": subnet2.id}],
            SecurityGroups=[sg.id],
            Scheme="internal",
        )
        return resp["LoadBalancers"][0]["LoadBalancerArn"]

    def setup(self):
        # start mock
        self.mock_ec2.start()
        self.mock_elb.start()
        # create test data
        self.elb_arn = self._create_elb()

    def test_list(self, sts_client, ddb_client):
        from lambda_function import ELB

        sts = boto3.client("sts", region_name=os.environ.get("AWS_REGION"))
        account_id = sts.get_caller_identity()["Account"]
        self._elb = ELB(accountId=account_id, region=os.environ.get("AWS_REGION"))

        result = self._elb.list()
        print(result)
        assert len(result) == 1

    def test_put_logging_bucket(self, sts_client, ddb_client):
        from lambda_function import ELB

        sts = boto3.client("sts", region_name=os.environ.get("AWS_REGION"))
        account_id = sts.get_caller_identity()["Account"]
        self._elb = ELB(accountId=account_id, region=os.environ.get("AWS_REGION"))

        result = self._elb.put_logging_bucket(self.elb_arn)
        print(result)


class TestWAF:

    mock_waf = mock_wafv2()
    mock_s3 = mock_s3()

    def setup(self):
        self.mock_waf.start()
        self.mock_s3.start()
        region = os.environ.get("AWS_REGION")
        conn = boto3.client("wafv2", region_name=region)
        resp = conn.create_web_acl(
            Scope="CLOUDFRONT",
            Name="TEST",
            DefaultAction={"Allow": {}},
            VisibilityConfig={
                "SampledRequestsEnabled": False,
                "CloudWatchMetricsEnabled": False,
                "MetricName": "test",
            },
        )

        from lambda_function import WAF

        self._waf = WAF()
        self._arn = resp["Summary"]["ARN"]

    def test_get_logging_bucket(self, sts_client):
        result = self._waf.get_logging_bucket(self._arn)
        print(result)

    def test_put_logging_bucket(self, sts_client):
        with pytest.raises(RuntimeError):
            self._waf.put_logging_bucket(self._arn)
    
    def test_list(self):
        result = self._waf.list()


class TestConfig:
    @mock_config
    def test_get_logging_bucket_not_enabled(self, sts_client, ddb_client):
        from lambda_function import Config

        sts = boto3.client("sts", region_name=os.environ.get("AWS_REGION"))
        account_id = sts.get_caller_identity()["Account"]
        self._config = Config(accountId=account_id, region=os.environ.get("AWS_REGION"))

        # Given no config enabled should not have logging a bucket
        not_enabled_config = self._config.get_logging_bucket("")
        assert not not_enabled_config["enabled"]

    @mock_config
    def test_get_logging_bucket_enabled(self, s3_client, sts_client, ddb_client):
        from lambda_function import Config

        sts = boto3.client("sts", region_name=os.environ.get("AWS_REGION"))
        account_id = sts.get_caller_identity()["Account"]
        self._config = Config(accountId=account_id, region=os.environ.get("AWS_REGION"))

        # Given config enabled should return logging a bucket
        prefix = "test"
        expected_bucket = os.environ.get("DEFAULT_LOGGING_BUCKET")
        client = boto3.client("config", region_name=os.environ.get("AWS_REGION"))
        client.put_configuration_recorder(
            ConfigurationRecorder={
                "name": "default",
                "roleARN": "string",
                "recordingGroup": {
                    "allSupported": False,
                    "includeGlobalResourceTypes": False,
                    "resourceTypes": ["AWS::S3::Bucket"],
                },
            }
        )
        client.put_delivery_channel(
            DeliveryChannel={
                "name": "default",
                "s3BucketName": expected_bucket,
                "s3KeyPrefix": prefix,
            }
        )
        enabled_config = self._config.get_logging_bucket("")
        assert enabled_config["enabled"]
        assert enabled_config["bucket"] == expected_bucket
        assert enabled_config["prefix"] == f"{prefix}/AWSLogs/123456789012/Config/{os.environ.get('AWS_REGION')}"
