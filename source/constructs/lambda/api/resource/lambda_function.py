# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import logging
import os
import re
import sys
from concurrent.futures import ThreadPoolExecutor, as_completed

import boto3
from botocore import config

from datetime import datetime

logger = logging.getLogger()
logger.setLevel(logging.INFO)

solution_version = os.environ.get("SOLUTION_VERSION", "v1.0.0")
solution_id = os.environ.get("SOLUTION_ID", "SO8025")
user_agent_config = {
    "user_agent_extra": f"AwsSolution/{solution_id}/{solution_version}"
}
default_config = config.Config(**user_agent_config)

default_region = os.environ.get("AWS_REGION")
default_logging_bucket = os.environ.get("DEFAULT_LOGGING_BUCKET")

sts = boto3.client("sts", config=default_config)
account_id = sts.get_caller_identity()["Account"]


def lambda_handler(event, context):
    """
    This lambda handles request such as listing resources or getting logging bucket for resource

    Each resource must extend the basic Resource class,
    and the class name must be same as the resource type.

    For example, if you need to add a new type Abc.

    Create a new  `class Abc(Resource)`, and implement `list()` and `get_logging_bucket(resource_name)` accordingly.

    Note that the new type should also exists in the GraphQL Schema
    """

    try:
        action = event["info"]["fieldName"]
        args = event["arguments"]
        resource_type = args["type"]
        region = args.get("region", default_region)
        # in case region is passed as None
        if region is None:
            region = default_region
        resource = getattr(sys.modules[__name__], resource_type, None)
        if not resource:
            raise RuntimeError(f"Unsupported Resource Type {resource_type}")

        if action == "listResources":
            parent_id = args.get("parentId", "")
            return resource(region).list(parent_id)
        elif action == "getResourceLoggingBucket":
            resource_name = args["resourceName"]
            return resource(region).get_logging_bucket(resource_name)
        elif action == "putResourceLoggingBucket":
            resource_name = args["resourceName"]
            return resource(region).put_logging_bucket(resource_name)
        else:
            raise RuntimeError(f"Unsupported Action {action}")

    except Exception as e:
        logger.error(e)
        return {}


class Resource:
    """Basic Class represents a type of AWS resource"""

    def __init__(self, region=default_region):
        super().__init__()
        self._region = region

    def list(self, parent_id=""):
        """returned all resources filtered by parent id if any"""
        return []

    def get_logging_bucket(self, resource_name):
        """returned the logging bucket for the resource

        The resource_name could be a name or an ID.
        """
        return {}

    def put_logging_bucket(self, resource_name):
        """Set Logging bucket

        Args:
            resource_name: The resource_name could be a name or an ID.
        """
        return {}


class S3Bucket(Resource):
    def __init__(self, region=default_region):
        super().__init__(region=region)
        # s3 = boto3.client('s3', region_name=self._region)
        self._s3 = boto3.client("s3", config=default_config)

    def list(self, parent_id=""):
        # Only return buckets in one region
        result = []
        response = self._s3.list_buckets()
        buckets = []
        for b in response["Buckets"]:
            buckets.append(b["Name"])

        # Concurrently get the bucket locations
        with ThreadPoolExecutor(max_workers=10) as executor:
            get_loc_futures = {
                executor.submit(self._get_bucket_location, name): name
                for name in buckets
            }

            for future in as_completed(get_loc_futures):
                try:
                    data = future.result()
                    if data == self._region:
                        name = get_loc_futures[future]
                        result.append(
                            {
                                "id": name,
                                "name": name,
                            }
                        )
                except Exception as e:
                    logger.error(e)

        return result

    def _default_prefix(self, bucket_name):
        return f"AWSLogs/{account_id}/S3/{bucket_name}/"

    def get_logging_bucket(self, bucket_name):
        try:
            response = self._s3.get_bucket_logging(
                Bucket=bucket_name,
            )

            if "LoggingEnabled" in response:
                log_info = response["LoggingEnabled"]
                return {
                    "enabled": True,
                    "bucket": log_info["TargetBucket"],
                    "prefix": log_info["TargetPrefix"],
                }
        except Exception as e:
            logger.error(e)
        return {
            "enabled": False,
            "bucket": default_logging_bucket,
            "prefix": self._default_prefix(bucket_name),
        }

    def _get_bucket_location(self, bucket_name: str):
        resp = self._s3.get_bucket_location(
            Bucket=bucket_name,
        )
        loc = resp["LocationConstraint"]
        # For us-east-1, the location is None
        return "us-east-1" if loc is None else loc

    def put_logging_bucket(self, bucket_name: str):

        default_prefix = self._default_prefix(bucket_name)
        try:
            self._s3.put_bucket_logging(
                Bucket=bucket_name,
                BucketLoggingStatus={
                    "LoggingEnabled": {
                        "TargetBucket": default_logging_bucket,
                        "TargetPrefix": default_prefix,
                    }
                },
            )
        except Exception as e:
            logger.error(e)
            raise RuntimeError("Unable to put logging bucket, please try it manually")

        return {
            "enabled": True,
            "bucket": default_logging_bucket,
            "prefix": default_prefix,
        }


class Certificate(Resource):
    def __init__(self, region=default_region):
        super().__init__(region=region)
        self._acm = boto3.client("acm", config=default_config)
        
    def describe_expiration_time(self, cert_arn=""):
        response = self._acm.describe_certificate(CertificateArn=cert_arn)
        expire_time = response['Certificate']['NotAfter']
        return expire_time
        
    def list(self, parent_id=""):
        result = []
        response = self._acm.list_certificates(
            CertificateStatuses=[
                "ISSUED",
            ],
        )
        # print(response)

        for cert in response["CertificateSummaryList"]:
            # Verify if certificate is expired or not 
            expiration_time = self.describe_expiration_time(cert_arn=cert["CertificateArn"])
            expiration_time = expiration_time.replace(tzinfo=None)
            now = datetime.now()
            datetime_subtraction = expiration_time - now
            if  datetime_subtraction.days > 0:
                result.append(
                    {
                        "id": cert["CertificateArn"],
                        "name": cert["DomainName"],
                    }
                )
        return result


class VPC(Resource):
    def __init__(self, region=default_region):
        super().__init__(region=region)
        self._ec2 = boto3.client("ec2", region_name=region, config=default_config)

    def list(self, parent_id=""):
        result = []
        response = self._ec2.describe_vpcs(
            Filters=[
                {
                    "Name": "state",
                    "Values": [
                        "available",
                    ],
                },
            ],
            MaxResults=1000,
        )
        # print(response)

        for vpc in response["Vpcs"]:
            name = "-"
            if "Tags" in vpc:
                for tag in vpc["Tags"]:
                    if tag["Key"] == "Name":
                        name = tag["Value"]
                        break

            result.append(
                {
                    "id": vpc["VpcId"],
                    "name": name,
                }
            )
        return result

    def get_logging_bucket(self, vpc_id):
        # Get VPC Flow Logs' bucket
        return super().get_logging_bucket(vpc_id)


class Subnet(Resource):
    def __init__(self, region=default_region):
        super().__init__(region=region)
        self._ec2 = boto3.client("ec2", region_name=region, config=default_config)

    def list(self, parent_id=""):
        result = []

        filters = [
            {
                "Name": "state",
                "Values": [
                    "available",
                ],
            }
        ]

        if parent_id:
            filters.append(
                {
                    "Name": "vpc-id",
                    "Values": [
                        parent_id,
                    ],
                }
            )

        # Ignore paging, assume maximum of 1000 results
        response = self._ec2.describe_subnets(
            Filters=filters,
            MaxResults=1000,
        )
        # print(response)

        for subnet in response["Subnets"]:
            name = "-"
            if "Tags" in subnet:
                for tag in subnet["Tags"]:
                    if tag["Key"] == "Name":
                        name = tag["Value"]
                        break
            result.append(
                {
                    "id": subnet["SubnetId"],
                    "name": name,
                    "parentId": subnet["VpcId"],
                    "description": subnet["AvailabilityZone"],
                }
            )
        return result


class SecurityGroup(Resource):
    def __init__(self, region=default_region):
        super().__init__(region=region)
        self._ec2 = boto3.client("ec2", region_name=region, config=default_config)

    def list(self, parent_id=""):
        result = []
        filters = []
        if parent_id:
            filters.append(
                {
                    "Name": "vpc-id",
                    "Values": [
                        parent_id,
                    ],
                }
            )

        # Ignore paging, assume maximum of 1000 results
        response = self._ec2.describe_security_groups(Filters=filters, MaxResults=1000)
        # print(response)

        for sg in response["SecurityGroups"]:
            result.append(
                {
                    "id": sg["GroupId"],
                    "name": sg["GroupName"],
                    "parentId": sg["VpcId"],
                }
            )
        return result


class Trail(Resource):
    def __init__(self, region=default_region):
        super().__init__(region=region)
        self._cloudtrail = boto3.client(
            "cloudtrail", region_name=self._region, config=default_config
        )

    def list(self, parent_id=""):
        result = []

        # Ignore paging, assume maximum of 1000 results
        response = self._cloudtrail.list_trails()
        # print(response)

        for trail in response["Trails"]:
            result.append(
                {
                    "id": trail["TrailARN"],
                    "name": trail["Name"],
                    "description": f"{trail['Name']} ({trail['HomeRegion']})",
                }
            )
        return result

    def get_logging_bucket(self, trail_name):
        try:
            response = self._cloudtrail.get_trail(Name=trail_name)

            trail = response["Trail"]
            if "S3KeyPrefix" in trail and trail["S3KeyPrefix"]:
                prefix = trail["S3KeyPrefix"] + "/"
            else:
                prefix = ""
            return {
                "enabled": True,
                "bucket": trail["S3BucketName"],
                "prefix": f"{prefix}AWSLogs/{account_id}/CloudTrail/",
            }
        except Exception as e:
            logger.error(e)
            raise RuntimeError("Unable to detect the logging bucket for this trail")


class KeyPair(Resource):
    def __init__(self, region=default_region):
        super().__init__(region=region)
        self._ec2 = boto3.client("ec2", region_name=region, config=default_config)

    def list(self, parent_id=""):
        result = []

        # Ignore paging, assume maximum of 1000 results
        response = self._ec2.describe_key_pairs()
        # print(response)

        for key in response["KeyPairs"]:
            result.append(
                {
                    "id": key["KeyPairId"],
                    "name": key["KeyName"],
                }
            )
        return result


class Distribution(Resource):
    """For Cloudfront Distribution"""

    def __init__(self, region=default_region):
        super().__init__(region=region)
        self._cf = boto3.client("cloudfront", region_name=region, config=default_config)

    def list(self, parent_id=""):
        result = []
        response = self._cf.list_distributions(MaxItems="1000")

        # print(response)
        if "Items" in response["DistributionList"]:
            for dist in response["DistributionList"]["Items"]:
                result.append(
                    {
                        "id": dist["Id"],
                        "name": dist["DomainName"],
                        "description": dist["Comment"],
                    }
                )
        return result

    def _default_prefix(self, distribution_id):
        return f"AWSLogs/{account_id}/CloudFront/{distribution_id}/"

    def get_logging_bucket(self, distribution_id):
        try:
            response = self._cf.get_distribution_config(Id=distribution_id)
            # print(response)

            log_info = response["DistributionConfig"]["Logging"]
            if log_info["Enabled"]:
                return {
                    "enabled": True,
                    "bucket": re.sub(
                        ".s3(.[a-z]{2}-[a-z]{4,20}-\\d)?.amazonaws.com(.cn)?$",
                        "",
                        log_info["Bucket"],
                        1,
                    ),
                    "prefix": log_info["Prefix"],
                }

        except Exception as e:
            logger.error(e)
        return {
            "enabled": False,
            "bucket": default_logging_bucket,
            "prefix": self._default_prefix(distribution_id),
        }

    def put_logging_bucket(self, distribution_id):
        """Add standard Logging to cloudfront distribution"""
        default_prefix = self._default_prefix(distribution_id)
        try:
            resp = self._cf.get_distribution_config(Id=distribution_id)

            dist_config = resp["DistributionConfig"]
            etag = resp["ETag"]
            log_info = dist_config["Logging"]
            if log_info["Enabled"]:
                return {
                    "enabled": True,
                    "bucket": re.sub(
                        ".s3(.[a-z]{2}-[a-z]{4,20}-\\d)?.amazonaws.com(.cn)?$",
                        "",
                        log_info["Bucket"],
                        1,
                    ),
                    "prefix": log_info["Prefix"],
                }
            else:
                # TODO: Support China regions
                dist_config["Logging"] = {
                    "Enabled": True,
                    "IncludeCookies": False,
                    "Bucket": f"{default_logging_bucket}.s3.amazonaws.com",
                    "Prefix": default_prefix,
                }
                self._cf.update_distribution(
                    DistributionConfig=dist_config,
                    Id=distribution_id,
                    IfMatch=etag,
                )
        except Exception as e:
            logger.error(e)
            raise RuntimeError("Unable to put logging bucket, please try it manually")
        return {
            "enabled": True,
            "bucket": default_logging_bucket,
            "prefix": default_prefix,
        }


class Lambda(Resource):
    def __init__(self, region=default_region):
        super().__init__(region=region)
        self._client = boto3.client("lambda", region_name=region, config=default_config)

    def list(self, parent_id=""):
        result = []

        marker = ""
        # Default maximum items is 50
        kwargs = {"MaxItems": 50}
        while True:
            if marker:
                kwargs["Marker"] = marker
            resp = self._client.list_functions(**kwargs)
            for fc in resp["Functions"]:
                result.append(
                    {
                        "id": fc["FunctionName"],
                        "name": f"{fc['FunctionName']}-{fc['Version']}",
                        "description": fc["Description"],
                    }
                )
            if "NextMarker" in resp:
                marker = resp["NextMarker"]
            else:
                break
        return result


class RDS(Resource):
    def __init__(self, region=default_region):
        super().__init__(region=region)
        self._client = boto3.client("rds", region_name=region, config=default_config)

    def _get_db_instances(self):
        result = []
        marker = ""
        engines = ["mysql"]
        # Default maximum items is 100
        # Only supports mysql
        kwargs = {
            "MaxRecords": 100,
            "Filters": [{"Name": "engine", "Values": engines}],
        }
        while True:
            if marker:
                kwargs["Marker"] = marker
            resp = self._client.describe_db_instances(**kwargs)
            for db in resp["DBInstances"]:
                desc = f"/aws/rds/instance/{db['DBInstanceIdentifier']}"
                result.append(
                    {
                        "id": db["DBInstanceIdentifier"],
                        "name": f"{self._get_engine_desc(db['Engine'])} - {db['DBInstanceIdentifier']}",
                        "description": desc,
                    }
                )
            if "Marker" in resp:
                marker = resp["Marker"]
            else:
                break
        return result

    def _get_db_clusters(self):
        result = []
        marker = ""
        engines = ["aurora-mysql"]
        # Default maximum items is 100
        # Only supports aurora (mysql)
        kwargs = {
            "MaxRecords": 100,
            "Filters": [{"Name": "engine", "Values": engines}],
        }
        while True:
            if marker:
                kwargs["Marker"] = marker
            resp = self._client.describe_db_clusters(**kwargs)
            for db in resp["DBClusters"]:
                desc = f"/aws/rds/cluster/{db['DBClusterIdentifier']}"
                result.append(
                    {
                        "id": db["DBClusterIdentifier"],
                        "name": f"{self._get_engine_desc(db['Engine'])} - {db['DBClusterIdentifier']}",
                        "description": desc,
                    }
                )
            if "Marker" in resp:
                marker = resp["Marker"]
            else:
                break
        return result

    def list(self, parent_id=""):
        db_instances = self._get_db_instances()
        db_clusters = self._get_db_clusters()
        return db_instances + db_clusters

    def _default_prefix(self, id):
        return f"AWSLogs/{account_id}/RDS/{self._region}/{id}/"

    def get_logging_bucket(self, id):
        return {
            "enabled": True,
            "bucket": default_logging_bucket,
            "prefix": self._default_prefix(id),
        }

    @staticmethod
    def _get_engine_desc(engine):
        engine_list = {"mysql": "MySQL", "aurora-mysql": "Aurora MySQL"}
        return engine_list.get(engine)


class ELB(Resource):
    def __init__(self, region=default_region):
        super().__init__(region=region)
        # 'elbv2' will list all load balancers except CLB, use 'elb' to list all CLB
        self._client = boto3.client("elbv2", region_name=region, config=default_config)

    def _get_alb(self):
        result = []
        marker = ""
        kwargs = {
            "PageSize": 400,
        }
        while True:
            if marker:
                kwargs["Marker"] = marker
            resp = self._client.describe_load_balancers(**kwargs)
            for alb in resp["LoadBalancers"]:
                if alb["Type"] == "application":
                    result.append(
                        {
                            "id": alb["LoadBalancerArn"],
                            "name": alb["LoadBalancerName"],
                        }
                    )
            if "Marker" in resp:
                marker = resp["Marker"]
            else:
                break
        return result

    def list(self, parent_id=""):
        albs = self._get_alb()
        return albs

    def _get_load_balancer_name(self, load_balancer_arn):
        pattern = "[^/]*/(?:app/|net/)?([^/]*)"
        m = re.match(pattern, load_balancer_arn)
        if m:
            return m.group(1)
        else:
            raise RuntimeError("Unable to get load balancer name")

    def _default_prefix(self):
        return f"AWSLogs/{account_id}/elasticloadbalancing/{self._region}"

    def get_logging_bucket(self, load_balancer_arn):
        default_prefix = self._default_prefix()
        try:
            resp_attributes = self._client.describe_load_balancer_attributes(
                LoadBalancerArn=load_balancer_arn
            )["Attributes"]
            for item in resp_attributes:
                if item["Key"] == "access_logs.s3.enabled":
                    is_enable_log = item["Value"]
                if item["Key"] == "access_logs.s3.bucket":
                    logging_bucket = item["Value"]
                if item["Key"] == "access_logs.s3.prefix":
                    logging_prefix = item["Value"]
            if is_enable_log == "true":
                if logging_prefix != "":
                    logging_prefix += "/"
                return {
                    "enabled": True,
                    "bucket": logging_bucket,
                    "prefix": logging_prefix + default_prefix,
                }
        except Exception as e:
            logger.error(e)
        load_balancer_name = self._get_load_balancer_name(load_balancer_arn)
        return {
            "enabled": False,
            "bucket": default_logging_bucket,
            "prefix": f"ELBLogs/{load_balancer_name}/{default_prefix}",
        }

    def put_logging_bucket(self, load_balancer_arn):
        default_prefix = self._default_prefix()
        load_balancer_name = self._get_load_balancer_name(load_balancer_arn)

        try:
            logging_bucket_resp = self.get_logging_bucket(load_balancer_arn)
            if logging_bucket_resp["enabled"]:
                return logging_bucket_resp
            else:
                self._client.modify_load_balancer_attributes(
                    Attributes=[
                        {
                            "Key": "access_logs.s3.enabled",
                            "Value": "true",
                        },
                        {
                            "Key": "access_logs.s3.bucket",
                            "Value": default_logging_bucket,
                        },
                        {
                            "Key": "access_logs.s3.prefix",
                            "Value": f"ELBLogs/{load_balancer_name}",
                        },
                    ],
                    LoadBalancerArn=load_balancer_arn,
                )
                return {
                    "enabled": True,
                    "bucket": default_logging_bucket,
                    "prefix": f"ELBLogs/{load_balancer_name}/{default_prefix}",
                }
        except Exception as e:
            logger.error(e)
            raise RuntimeError("Unable to put logging bucket, please try it manually")


class WAF(Resource):
    def __init__(self, region=default_region):
        super().__init__(region=region)
        self._client = boto3.client("wafv2", region_name=region, config=default_config)
        self._s3_client = boto3.client("s3", region_name=region, config=default_config)

    def _get_waf_acl(self, scope):
        if scope == "CLOUDFRONT" and self._region != "us-east-1":
            return []
        result = []
        next_marker = ""
        # Default maximum items is 100
        kwargs = {
            "Scope": scope,
            "Limit": 100,
        }
        while True:
            if next_marker:
                kwargs["NextMarker"] = next_marker
            resp = self._client.list_web_acls(**kwargs)

            for acl in resp["WebACLs"]:
                result.append(
                    {
                        "id": acl["ARN"],
                        "name": acl["Name"],
                        "description": scope,
                    }
                )

            if "NextMarker" in resp:
                next_marker = resp["NextMarker"]
            else:
                break
        return result

    def _parse_web_acl_name(self, acl_arn):
        # TODO: Use regex
        end_pos = acl_arn.rfind("/") - 1
        start_pos = acl_arn.rfind("/", 0, end_pos)
        web_acl_name = acl_arn[start_pos + 1 : end_pos + 1]
        return web_acl_name

    def _generate_default_prefix(self, acl_arn, scope):
        web_acl_name = self._parse_web_acl_name(acl_arn)
        if scope == "CLOUDFRONT":
            default_prefix = f"AWSLogs/{account_id}/WAFLogs/cloudfront/{web_acl_name}/"
        else:
            default_prefix = (
                f"AWSLogs/{account_id}/WAFLogs/{self._region}/{web_acl_name}/"
            )
        return default_prefix

    def _get_partition(self):
        if self._region in ["cn-north-1", "cn-northwest-1"]:
            return "aws-cn"
        else:
            return "aws"

    def _default_logging_bucket(self):
        return f"aws-waf-logs-loghub-{account_id}-{self._region}"

    def _get_logging_bucket(self, acl_arn, scope):
        logging_bucket = self._default_logging_bucket()
        default_prefix = self._generate_default_prefix(acl_arn, scope)
        enabled = False
        try:
            resp = self._client.get_logging_configuration(ResourceArn=acl_arn)
            logging_bucket_arn = resp["LoggingConfiguration"]["LogDestinationConfigs"][
                0
            ]
            if ":s3:::" in logging_bucket_arn:
                # Determine if the target is S3
                logging_bucket = logging_bucket_arn[
                    logging_bucket_arn.rindex(":") + 1 :
                ]
                enabled = True

        except Exception as e:
            logger.error(e)
            logger.info(f"{acl_arn} doesn't have logging Enabled.")
        return {
            "enabled": enabled,
            "bucket": logging_bucket,
            "prefix": default_prefix,
        }

    def _create_logging_bucket(self, bucket_name):
        # check if bucket already exists.
        try:
            self._s3_client.head_bucket(
                Bucket=bucket_name,
            )
            logger.info("Bucket %s already exists", bucket_name)
            return bucket_name
        except Exception as e:
            # such as bucket not exists
            logger.info(e)

        logger.info("Trying to create logging bucket %s", bucket_name)
        kwargs = {
            "ACL": "private",
            "Bucket": bucket_name,
        }
        if self._region != "us-east-1":
            kwargs["CreateBucketConfiguration"] = {"LocationConstraint": self._region}
        try:
            self._s3_client.create_bucket(**kwargs)
            logger.info(f"Created {bucket_name} in {account_id}-{self._region}")
        except Exception as e:
            logger.error(e)
            raise RuntimeError(
                "Unable to create logging bucket, please try it manually"
            )
        return bucket_name

    def put_logging_bucket(self, acl_arn):
        resp = self.get_logging_bucket(acl_arn)
        if resp["enabled"]:
            return resp

        bucket_name = resp["bucket"]
        default_prefix = resp["prefix"]

        self._create_logging_bucket(bucket_name)
        partition = self._get_partition()
        # TODO: Should raise an error if logging is already enabled.
        kwargs = {
            "ResourceArn": acl_arn,
            "LogDestinationConfigs": [f"arn:{partition}:s3:::{bucket_name}"],
        }
        try:
            self._client.put_logging_configuration(LoggingConfiguration=kwargs)
            return {
                "enabled": True,
                "bucket": bucket_name,
                "prefix": default_prefix,
            }
        except Exception as e:
            logger.error(e)
            raise RuntimeError("Unable to put logging bucket, please try it manually")

    def list(self, parent_id=""):
        acls = self._get_waf_acl("CLOUDFRONT") + self._get_waf_acl("REGIONAL")
        return acls

    def get_logging_bucket(self, acl_arn):
        if ":regional/" in acl_arn:
            result = self._get_logging_bucket(acl_arn, "REGIONAL")
        else:
            result = self._get_logging_bucket(acl_arn, "CLOUDFRONT")
        return result
