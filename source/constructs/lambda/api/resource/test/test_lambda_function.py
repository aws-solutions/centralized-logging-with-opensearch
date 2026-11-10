# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import json
import pytest
import os
import boto3

import io
import zipfile

from botocore.exceptions import ClientError


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
    mock_logs,
)

bucket_names = ["test-bucket1", "test-bucket2", "log-bucket"]

test_data = [
    ("S3Bucket", "listResources", None),
    ("S3Bucket", "getResourceLoggingBucket", bucket_names[0]),
    ("S3Bucket", "putResourceLoggingBucket", bucket_names[0]),
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
        return event


@pytest.fixture
def test_invalid_event(request):
    with open("./test/event/test_event.json", "r") as f:
        event = json.load(f)
        event["arguments"]["type"] = "Unknown"
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
def ddb_client():
    with mock_dynamodb():
        ddb = boto3.resource("dynamodb", region_name=os.environ.get("AWS_REGION"))
        ddb.create_table(
            TableName=os.environ.get("SUB_ACCOUNT_LINK_TABLE_NAME"),
            KeySchema=[
                {"AttributeName": "subAccountId", "KeyType": "HASH"},
                {"AttributeName": "region", "KeyType": "RANGE"},
            ],
            AttributeDefinitions=[
                {"AttributeName": "subAccountId", "AttributeType": "S"},
                {"AttributeName": "region", "AttributeType": "S"},
            ],
            ProvisionedThroughput={"ReadCapacityUnits": 5, "WriteCapacityUnits": 5},
        )
        yield


@mock_sts
def test_lambda_handler(test_event, s3_client, ddb_client):
    import lambda_function

    # assert function excute with a result.
    result = lambda_function.lambda_handler(test_event, None)
    assert result is not None


@mock_sts
def test_lambda_handler_with_exception(test_invalid_event, s3_client):
    import lambda_function
    from commonlib.exception import APIException

    with pytest.raises(APIException) as exc_info:
        lambda_function.lambda_handler(test_invalid_event, None)

    assert str(exc_info.value) == "[UNSUPPORTED_ACTION] Unsupported resource type"
    assert "Unknown" not in str(exc_info.value)


@mock_sts
def test_lambda_handler_hides_unexpected_error_details(
    test_invalid_event, s3_client, monkeypatch
):
    import lambda_function

    def fail(*_args, **_kwargs):
        raise ClientError(
            {
                "Error": {
                    "Code": "AccessDenied",
                    "Message": "arn:aws:iam::123456789012:role/internal is not authorized",
                }
            },
            "GetBucketLogging",
        )

    monkeypatch.setattr(lambda_function.S3Bucket, "get_logging_bucket", fail)
    test_invalid_event["arguments"]["type"] = "S3Bucket"
    test_invalid_event["arguments"]["resourceName"] = "test-bucket1"
    test_invalid_event["info"]["fieldName"] = "getResourceLoggingBucket"

    with pytest.raises(RuntimeError) as exc_info:
        lambda_function.lambda_handler(test_invalid_event, None)

    assert (
        str(exc_info.value)
        == "Unknown exception, please check Lambda log for more details"
    )


@mock_sts
def test_lambda_handler_unsupported_destination_does_not_echo_input(
    test_invalid_event, s3_client
):
    import lambda_function
    from commonlib.exception import APIException

    test_invalid_event["arguments"].update(
        {
            "type": "WAF",
            "resourceName": "arn:aws:wafv2:us-east-1:123456789012:regional/webacl/a/b",
            "destinationType": "<script>alert(1)</script>",
            "destinationName": "test",
        }
    )
    test_invalid_event["info"]["fieldName"] = "putResourceLogConfig"

    with pytest.raises(APIException) as exc_info:
        lambda_function.lambda_handler(test_invalid_event, None)

    assert (
        str(exc_info.value)
        == "[UNSUPPORTED_ACTION] Unsupported destination type for WAF Logs"
    )


class TestS3Bucket:
    @mock_sts
    def test_list(self, s3_client, ddb_client):
        from lambda_function import S3Bucket

        sts = boto3.client("sts", region_name=os.environ.get("AWS_REGION"))
        account_id = sts.get_caller_identity()["Account"]
        self._s3 = S3Bucket(account_id=account_id, region=os.environ.get("AWS_REGION"))
        result = self._s3.list()
        assert len(result) == 3

    @mock_sts
    def test_logging_bucket(self, s3_client, ddb_client):
        from lambda_function import S3Bucket

        sts = boto3.client("sts", region_name=os.environ.get("AWS_REGION"))
        account_id = sts.get_caller_identity()["Account"]
        self._s3 = S3Bucket(account_id=account_id, region=os.environ.get("AWS_REGION"))

        default_bucket = os.environ.get("DEFAULT_LOGGING_BUCKET")
        result = self._s3.get_logging_bucket(bucket_names[0])

        assert not result["enabled"]
        assert result["bucket"] == default_bucket

        result = self._s3.put_logging_bucket(bucket_names[0])
        assert result["enabled"]
        assert result["bucket"] == default_bucket


class TestVPC:
    @mock_ec2
    @mock_sts
    def test_list(self, ddb_client):
        from lambda_function import VPC

        resource = VPC()

        self._create_vpc()
        result = resource.list()
        assert len(result) == 2

    @mock_ec2
    @mock_sts
    def test_logging_config_s3(self, ddb_client, s3_client):
        from lambda_function import VPC

        default_region = os.environ.get("AWS_REGION")
        vpc_id = self._create_vpc()
        resource = VPC()
        resp = resource.get_resource_log_config(vpc_id)
        assert len(resp) == 0

        resp2 = resource.put_resource_log_config(
            vpc_id, dest_type="S3", dest_name="s3://log-bucket", log_format=""
        )
        print(resp2)
        assert resp2["destinationType"] == "S3"
        # destination name is not empty
        assert resp2["destinationName"]
        # log format is not empty
        assert resp2["logFormat"]
        assert resp2["region"] == default_region

        resp3 = resource.get_resource_log_config(vpc_id)
        print(resp3)
        dest = resp3[0]
        assert len(resp3) == 1
        assert dest["destinationType"] == "S3"
        # destination name is not empty
        assert dest["destinationName"]
        # log format is not empty
        assert dest["logFormat"]
        assert dest["region"] == default_region

    @mock_logs
    @mock_iam
    @mock_ec2
    @mock_sts
    def test_logging_config_cwl(self, ddb_client):
        from lambda_function import VPC

        default_region = os.environ.get("AWS_REGION")

        vpc_id = self._create_vpc()
        resource = VPC()
        resp = resource.get_resource_log_config(vpc_id)
        assert len(resp) == 0

        resp2 = resource.put_resource_log_config(
            vpc_id, dest_type="CloudWatch", dest_name="a/b/c", log_format=""
        )
        print(resp2)
        assert resp2["destinationType"] == "CloudWatch"
        # destination name is not empty
        assert resp2["destinationName"] == "a/b/c"
        # log format is not empty
        assert resp2["logFormat"]
        assert resp2["region"] == default_region

        resp3 = resource.get_resource_log_config(vpc_id)
        print(resp3)
        assert len(resp3) == 1
        dest = resp3[0]
        assert dest["destinationType"] == "CloudWatch"
        # destination name is not empty
        assert dest["destinationName"] == "a/b/c"
        # log format is not empty
        assert dest["logFormat"]
        assert dest["region"] == default_region

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
    @mock_sts
    def test_list(self, ddb_client):
        from lambda_function import Subnet

        sts = boto3.client("sts", region_name=os.environ.get("AWS_REGION"))
        account_id = sts.get_caller_identity()["Account"]
        self._subnet = Subnet(
            account_id=account_id, region=os.environ.get("AWS_REGION")
        )

        result = self._subnet.list()
        print(result)
        assert len(result) == 6


class TestSecurityGroup:
    @mock_ec2
    @mock_sts
    def test_list(self, ddb_client):
        from lambda_function import SecurityGroup

        sts = boto3.client("sts", region_name=os.environ.get("AWS_REGION"))
        account_id = sts.get_caller_identity()["Account"]
        self._sg = SecurityGroup(
            account_id=account_id, region=os.environ.get("AWS_REGION")
        )

        result = self._sg.list()
        print(result)
        assert len(result) == 1


class TestCertificate:
    @mock_acm
    @mock_sts
    def test_list(self, ddb_client):
        from lambda_function import Certificate

        sts = boto3.client("sts", region_name=os.environ.get("AWS_REGION"))
        account_id = sts.get_caller_identity()["Account"]
        self._acm = Certificate(
            account_id=account_id, region=os.environ.get("AWS_REGION")
        )

        result = self._acm.list()
        print(result)
        assert len(result) == 0


class TestKeyPair:
    mock_ec2 = mock_ec2()
    mock_sts = mock_sts()

    def _create_key(self):
        region = os.environ.get("AWS_REGION")
        ec2 = boto3.client("ec2", region_name=region)
        ec2.create_key_pair(KeyName="testkey")

    def setup_method(self):
        self.mock_ec2.start()
        self.mock_sts.start()

    def teardown_method(self):
        self.mock_ec2.stop()
        self.mock_sts.stop()

    def test_list(self, ddb_client):
        from lambda_function import KeyPair

        sts = boto3.client("sts", region_name=os.environ.get("AWS_REGION"))
        account_id = sts.get_caller_identity()["Account"]
        self._kp = KeyPair(account_id=account_id, region=os.environ.get("AWS_REGION"))

        result = self._kp.list()
        print(result)
        assert len(result) == 0


class TestDistribution:
    mock_cloudfront = mock_cloudfront()
    mock_sts = mock_sts()

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

    def setup_method(self):
        self.mock_cloudfront.start()
        self.mock_sts.start()
        resp = self._create_distribution()
        self._distribution_id = resp["Distribution"]["Id"]

    def teardown_method(self):
        self.mock_cloudfront.stop()
        self.mock_sts.stop()

    def test_list(self, ddb_client):
        from lambda_function import Distribution

        sts = boto3.client("sts", region_name=os.environ.get("AWS_REGION"))
        account_id = sts.get_caller_identity()["Account"]
        self._cf = Distribution(
            account_id=account_id, region=os.environ.get("AWS_REGION")
        )

        result = self._cf.list()
        print(result)
        assert len(result) == 1

    def test_get_resource_log_config(self):
        from lambda_function import Distribution

        sts = boto3.client("sts", region_name=os.environ.get("AWS_REGION"))
        account_id = sts.get_caller_identity()["Account"]
        self._cf = Distribution(
            account_id=account_id, region=os.environ.get("AWS_REGION")
        )
        result = self._cf._get_logging_bucket(self._distribution_id)
        assert result == {}


class TestTrail:
    mock_cloudtrail = mock_cloudtrail()
    mock_s3 = mock_s3()
    mock_sts = mock_sts()
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

    def setup_method(self):
        # start mock
        self.mock_cloudtrail.start()
        self.mock_s3.start()
        self.mock_sts.start()
        # create test data
        self._create_trail()

    def teardown_method(self):
        self.mock_cloudtrail.stop()
        self.mock_s3.stop()
        self.mock_sts.stop()

    def test_list(self, ddb_client):
        from lambda_function import Trail

        sts = boto3.client("sts", region_name=os.environ.get("AWS_REGION"))
        account_id = sts.get_caller_identity()["Account"]
        self._trail = Trail(account_id=account_id, region=os.environ.get("AWS_REGION"))

        result = self._trail.list()
        print(result)
        assert len(result) == 2

    def test_logging_config_s3(self, ddb_client):
        from lambda_function import Trail

        default_region = os.environ.get("AWS_REGION")
        resource = Trail()
        resp = resource.get_resource_log_config(self.trail_name)
        assert len(resp) == 1

        dest = resp[0]

        assert dest["destinationType"] == "S3"
        # destination name is not empty
        assert dest["destinationName"]
        assert dest["region"] == default_region

    def test_logging_config_s3_another_region(self, ddb_client):
        from lambda_function import Trail

        resource = Trail()
        resp = resource.get_resource_log_config("trail-us-west-2")
        assert len(resp) == 1

        dest = resp[0]

        assert dest["destinationType"] == "S3"
        # destination name is not empty
        assert dest["destinationName"]
        assert dest["region"] == "us-west-2"

    @mock_logs
    @mock_iam
    def test_logging_config_cwl(self, ddb_client):
        from lambda_function import Trail

        default_region = os.environ.get("AWS_REGION")

        resource = Trail()
        resp = resource.get_resource_log_config(self.trail_name)
        assert len(resp) == 1

        resp2 = resource.put_resource_log_config(
            self.trail_name, dest_type="CloudWatch", dest_name="a/b/c", log_format=""
        )
        print(resp2)
        assert resp2["destinationType"] == "CloudWatch"
        # destination name is not empty
        assert resp2["destinationName"] == "a/b/c"
        assert resp2["region"] == default_region

        resp3 = resource.get_resource_log_config(self.trail_name)
        print(resp3)
        assert len(resp3) == 2


class TestRDS:
    mock_rds = mock_rds()
    mock_sts = mock_sts()

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

    def setup_method(self):
        self.mock_rds.start()
        self.mock_sts.start()
        self._create_rds()

    def teardown_method(self):
        self.mock_rds.stop()
        self.mock_sts.stop()

    def test_list(self, ddb_client):
        from lambda_function import RDS

        sts = boto3.client("sts", region_name=os.environ.get("AWS_REGION"))
        account_id = sts.get_caller_identity()["Account"]
        self._rds = RDS(account_id=account_id, region=os.environ.get("AWS_REGION"))

        result = self._rds.list()
        print(result)
        assert len(result) == 1


class TestLambda:
    mock_lambda = mock_lambda()
    mock_iam = mock_iam()
    mock_sts = mock_sts()

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

    def setup_method(self):
        # start mock
        self.mock_lambda.start()
        self.mock_iam.start()
        self.mock_sts.start()
        # Create test data
        self._create_lambda()
        # Init resource
        from lambda_function import Lambda

        self._lambda = Lambda()

    def teardown_method(self):
        self.mock_lambda.stop()
        self.mock_sts.stop()
        self.mock_iam.stop()

    def test_list(self):
        result = self._lambda.list()
        print(result)
        assert len(result) == 1


class TestELB:
    mock_ec2 = mock_ec2()
    mock_elb = mock_elbv2()
    mock_sts = mock_sts()

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

    def setup_method(self):
        # start mock
        self.mock_ec2.start()
        self.mock_elb.start()
        self.mock_sts.start()
        # create test data
        self.elb_arn = self._create_elb()

    def teardown_method(self):
        self.mock_ec2.stop()
        self.mock_elb.stop()
        self.mock_sts.stop()

    def test_list(self, ddb_client):
        from lambda_function import ELB

        sts = boto3.client("sts", region_name=os.environ.get("AWS_REGION"))
        account_id = sts.get_caller_identity()["Account"]
        self._elb = ELB(account_id=account_id, region=os.environ.get("AWS_REGION"))

        result = self._elb.list()
        print(result)
        assert len(result) == 1

    def test_put_logging_bucket(self, ddb_client):
        from lambda_function import ELB

        sts = boto3.client("sts", region_name=os.environ.get("AWS_REGION"))
        account_id = sts.get_caller_identity()["Account"]
        self._elb = ELB(account_id=account_id, region=os.environ.get("AWS_REGION"))

        result = self._elb.put_logging_bucket(self.elb_arn)
        print(result)


class TestWAF:
    mock_waf = mock_wafv2()
    mock_s3 = mock_s3()
    mock_sts = mock_sts()

    def setup_method(self):
        self.mock_waf.start()
        self.mock_s3.start()
        self.mock_sts.start()
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

    def teardown_method(self):
        self.mock_waf.stop()
        self.mock_s3.stop()
        self.mock_sts.stop()

    # def test_get_logging_bucket(self):
    #     result = self._waf.get_logging_bucket(self._arn)
    #     print(result)

    # def test_put_logging_bucket(self):
    #     with pytest.raises(RuntimeError):
    #         self._waf.put_logging_bucket(self._arn)

    def test_list(self):
        result = self._waf.list()
        assert len(result) == 1


class TestConfig:
    @mock_sts
    @mock_config
    def test_get_logging_bucket_not_enabled(self, s3_client, ddb_client):
        from lambda_function import Config

        sts = boto3.client("sts", region_name=os.environ.get("AWS_REGION"))
        account_id = sts.get_caller_identity()["Account"]
        self._config = Config(
            account_id=account_id, region=os.environ.get("AWS_REGION")
        )

        # Given no config enabled should not have logging a bucket
        not_enabled_config = self._config.get_logging_bucket("")
        assert not not_enabled_config["enabled"]

    @mock_config
    @mock_sts
    def test_get_logging_bucket_enabled(self, s3_client, ddb_client):
        from lambda_function import Config

        sts = boto3.client("sts", region_name=os.environ.get("AWS_REGION"))
        account_id = sts.get_caller_identity()["Account"]
        self._config = Config(
            account_id=account_id, region=os.environ.get("AWS_REGION")
        )

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
        assert (
            enabled_config["prefix"]
            == f"{prefix}/AWSLogs/123456789012/Config/{os.environ.get('AWS_REGION')}"
        )


class TestWAFSampled:
    mock_waf = mock_wafv2()
    mock_s3 = mock_s3()
    mock_sts = mock_sts()

    def setup_method(self):
        self.mock_waf.start()
        self.mock_s3.start()
        self.mock_sts.start()
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

        from lambda_function import WAFSampled

        self._waf = WAFSampled()
        self._arn = resp["Summary"]["ARN"]

    def teardown_method(self):
        self.mock_waf.stop()
        self.mock_s3.stop()
        self.mock_sts.stop()

    def test_get_resource_log_config(self, s3_client):
        result = self._waf.get_resource_log_config(self._arn)
        assert len(result) == 1


def _fail(*_args, **_kwargs):
    raise ClientError(
        {"Error": {"Code": "AccessDenied", "Message": "denied"}}, "Operation"
    )


class _FakeClient:
    """Stands in for a boto3 client, with each named method returning or raising."""

    def __init__(self, **methods):
        self.__dict__.update(methods)


def _unsuccessful_flow_logs(**_kwargs):
    return {"Unsuccessful": [{"Error": {"Message": "arn:aws:ec2:internal detail"}}]}


class TestErrorMessages:
    """Each error branch raises a coded APIException with a fixed message."""

    @staticmethod
    def _raises(func, *args):
        from commonlib.exception import APIException

        with pytest.raises(APIException) as exc_info:
            func(*args)
        return str(exc_info.value)

    @mock_sts
    def test_unsupported_action(self, test_invalid_event, ddb_client):
        import lambda_function

        test_invalid_event["arguments"]["type"] = "S3Bucket"
        test_invalid_event["info"]["fieldName"] = "unknownAction"

        assert (
            self._raises(lambda_function.lambda_handler, test_invalid_event, None)
            == "[UNSUPPORTED_ACTION] Unsupported action specified"
        )

    @mock_sts
    def test_get_resource_log_config_not_implemented(
        self, test_invalid_event, ddb_client
    ):
        import lambda_function

        test_invalid_event["arguments"].update(
            {"type": "S3Bucket", "resourceName": "test-bucket1"}
        )
        test_invalid_event["info"]["fieldName"] = "getResourceLogConfigs"

        with pytest.raises(RuntimeError) as exc_info:
            lambda_function.lambda_handler(test_invalid_event, None)
        assert (
            str(exc_info.value)
            == "Unknown exception, please check Lambda log for more details"
        )

    @mock_sts
    def test_s3_put_logging_bucket_failure(self, ddb_client):
        from lambda_function import S3Bucket

        bucket = S3Bucket()
        bucket._s3 = _FakeClient(put_bucket_logging=_fail)

        assert self._raises(bucket.put_logging_bucket, "test-bucket1") == (
            "[RESOURCE_LOGGING_FAILED] Unable to add logging to service, please try it manually"
        )

    @mock_sts
    def test_vpc_s3_flow_logs_unsuccessful(self, ddb_client):
        from lambda_function import VPC

        vpc = VPC()
        vpc._ec2 = _FakeClient(create_flow_logs=_unsuccessful_flow_logs)

        assert self._raises(
            vpc.put_resource_log_config, "vpc-1", "S3", "s3://bucket/", ""
        ) == ("[RESOURCE_LOGGING_FAILED] Unable to create the VPC Flow Logs")

    @mock_sts
    def test_vpc_cloudwatch_flow_logs_unsuccessful(self, ddb_client, monkeypatch):
        import lambda_function

        monkeypatch.setattr(lambda_function, "create_log_group", lambda *_: None)
        vpc = lambda_function.VPC()
        vpc._create_iam_role = lambda *_: "arn:aws:iam::123456789012:role/test"
        vpc._create_flow_logs = lambda *_: _unsuccessful_flow_logs()

        assert self._raises(
            vpc.put_resource_log_config, "vpc-1", "CloudWatch", "group", ""
        ) == ("[RESOURCE_LOGGING_FAILED] Unable to create the VPC Flow Logs")

    @mock_sts
    def test_vpc_unsupported_destination(self, ddb_client):
        from lambda_function import VPC

        assert self._raises(
            VPC().put_resource_log_config, "vpc-1", "KDS", "stream", ""
        ) == ("[UNSUPPORTED_ACTION] Unsupported destination type for VPC Flow Logs")

    @mock_sts
    def test_vpc_create_iam_role_failure(self, ddb_client, monkeypatch):
        import lambda_function

        monkeypatch.setattr(lambda_function, "create_service_role", _fail)

        assert self._raises(
            lambda_function.VPC()._create_iam_role, "role", "arn"
        ) == (
            "[RESOURCE_LOGGING_FAILED] Unable to create role for CloudTrail to access CloudWatch Logs"
        )

    @mock_sts
    def test_trail_get_resource_log_config_failure(self, ddb_client):
        from lambda_function import Trail

        trail = Trail()
        trail._cloudtrail = _FakeClient(get_trail=_fail)

        assert self._raises(trail.get_resource_log_config, "trail") == (
            "[RESOURCE_LOGGING_FAILED] Unable to detect the logging bucket for this trail"
        )

    @mock_sts
    def test_trail_unsupported_destination(self, ddb_client):
        from lambda_function import Trail

        assert self._raises(
            Trail().put_resource_log_config, "trail", "S3", "bucket", ""
        ) == ("[UNSUPPORTED_ACTION] Unsupported destination type for CloudTrail Logs")

    @mock_sts
    def test_trail_cloudwatch_not_enabled(self, ddb_client, monkeypatch):
        import lambda_function

        monkeypatch.setattr(lambda_function, "create_log_group", lambda *_: None)
        trail = lambda_function.Trail()
        trail._create_iam_role = lambda *_: "arn:aws:iam::123456789012:role/test"
        trail._cloudtrail = _FakeClient(update_trail=lambda **_: {})

        assert self._raises(
            trail.put_resource_log_config, "trail", "CloudWatch", "group", ""
        ) == (
            "[RESOURCE_LOGGING_FAILED] Unable to enable the CloudWatch logging for this trail"
        )

    @mock_sts
    def test_trail_create_iam_role_failure(self, ddb_client, monkeypatch):
        import lambda_function

        monkeypatch.setattr(lambda_function, "create_service_role", _fail)

        assert self._raises(
            lambda_function.Trail()._create_iam_role, "role", "arn"
        ) == (
            "[RESOURCE_LOGGING_FAILED] Unable to create role for CloudTrail to access CloudWatch Logs"
        )

    @mock_sts
    def test_config_get_logging_bucket_failure(self, ddb_client):
        from lambda_function import Config

        config = Config()
        config._config = _FakeClient(describe_delivery_channels=_fail)

        assert self._raises(config.get_logging_bucket, "") == (
            "[RESOURCE_LOGGING_FAILED] Unable to find the logging bucket for the aws config, "
            "or aws config is not enabled"
        )

    @mock_sts
    def test_elb_invalid_load_balancer_arn(self, ddb_client):
        from lambda_function import ELB

        assert self._raises(ELB()._get_load_balancer_name, "no-slash") == (
            "[RESOURCE_LOGGING_FAILED] Unable to get load balancer name"
        )

    @mock_sts
    def test_elb_put_logging_bucket_failure(self, ddb_client):
        from lambda_function import ELB

        elb = ELB()
        elb.get_logging_bucket = _fail
        arn = "arn:aws:elasticloadbalancing:us-east-1:123456789012:loadbalancer/app/test/1"

        assert self._raises(elb.put_logging_bucket, arn) == (
            "[RESOURCE_LOGGING_FAILED] Unable to add logging to service, please try it manually"
        )
