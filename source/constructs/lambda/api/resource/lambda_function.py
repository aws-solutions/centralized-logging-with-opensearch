# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import logging
import os
import re
import sys
import time
import json
import hashlib
import boto3

from concurrent.futures import ThreadPoolExecutor, as_completed
from functools import partial, wraps
from botocore import config
from datetime import datetime
from aws_svc_mgr import SvcManager, Boto3API

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
        region = args.get("region") or default_region
        accountId = args.get("accountId") or account_id

        resource = getattr(sys.modules[__name__], resource_type, None)
        if not resource:
            raise RuntimeError(f"Unsupported Resource Type {resource_type}")

        if action == "listResources":
            parent_id = args.get("parentId", "")
            return resource(accountId, region).list(parent_id)
        elif action == "getResourceLoggingBucket":
            resource_name = args["resourceName"]
            return resource(accountId,
                            region).get_logging_bucket(resource_name)
        elif action == "putResourceLoggingBucket":
            resource_name = args["resourceName"]
            return resource(accountId,
                            region).put_logging_bucket(resource_name)
        else:
            raise RuntimeError(f"Unsupported Action {action}")

    except Exception as e:
        logger.error(e, exc_info=True)
        return {}


def retry(func=None,
          exception=Exception,
          n_tries=4,
          delay=5,
          backoff=2,
          logger=False):
    """Retry decorator with exponential backoff.

    Parameters
    ----------
    func : typing.Callable, optional
        Callable on which the decorator is applied, by default None
    exception : Exception or tuple of Exceptions, optional
        Exception(s) that invoke retry, by default Exception
    n_tries : int, optional
        Number of tries before giving up, by default 4
    delay : int, optional
        Initial delay between retries in seconds, by default 5
    backoff : int, optional
        Backoff multiplier e.g. value of 2 will double the delay, by default 2
    logger : bool, optional
        Option to log or print, by default False

    Returns
    -------
    typing.Callable
        Decorated callable that calls itself when exception(s) occur.

    Examples
    --------
    >>> import random
    >>> @retry(exception=Exception, n_tries=4)
    ... def test_random(text):
    ...    x = random.random()
    ...    if x < 0.5:
    ...        raise Exception("Fail")
    ...    else:
    ...        print("Success: ", text)
    >>> test_random("It works!")
    """

    if func is None:
        return partial(
            retry,
            exception=exception,
            n_tries=n_tries,
            delay=delay,
            backoff=backoff,
            logger=logger,
        )

    @wraps(func)
    def wrapper(*args, **kwargs):
        ntries, ndelay = n_tries, delay

        while ntries > 1:
            try:
                return func(*args, **kwargs)
            except exception as e:
                msg = f"{str(e)}, Retrying in {ndelay} seconds..."
                if logger:
                    logging.warning(msg)
                else:
                    logger.info(msg)
                time.sleep(ndelay)
                ntries -= 1
                ndelay *= backoff

        return func(*args, **kwargs)

    return wrapper


def sha1(s):
    return hashlib.sha1(bytes(s, 'utf-8')).hexdigest()


def is_arn(s: str, svc: str):
    return re.match(rf'^arn:aws.*:{svc}', s, re.MULTILINE)


class Resource:
    """Basic Class represents a type of AWS resource"""

    def __init__(self, accountId=account_id, region=default_region):
        super().__init__()
        self._account_id = accountId
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

    def __init__(self, accountId=account_id, region=default_region):
        super().__init__(accountId, region)
        # s3 = boto3.client('s3', region_name=self._region)
        svcMgr = SvcManager()
        self._s3 = svcMgr.get_client(sub_account_id=accountId,
                                     region=region,
                                     service_name='s3',
                                     type=Boto3API.CLIENT)
        link_acct = svcMgr.get_link_account(accountId, region)
        if link_acct:
            self._default_logging_bucket = link_acct['subAccountBucketName']
        else:
            self._default_logging_bucket = default_logging_bucket

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
                        result.append({
                            "id": name,
                            "name": name,
                        })
                except Exception as e:
                    logger.error(e)

        return result

    def _default_prefix(self, bucket_name):
        return f"AWSLogs/{self._account_id}/S3/{bucket_name}/"

    def get_logging_bucket(self, bucket_name):
        try:
            response = self._s3.get_bucket_logging(Bucket=bucket_name, )

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
            "bucket": self._default_logging_bucket,
            "prefix": self._default_prefix(bucket_name),
        }

    def _get_bucket_location(self, bucket_name: str):
        resp = self._s3.get_bucket_location(Bucket=bucket_name, )
        loc = resp["LocationConstraint"]
        # For us-east-1, the location is None
        return "us-east-1" if loc is None else loc

    def put_logging_bucket(self, bucket_name: str):

        default_prefix = self._default_prefix(bucket_name)
        try:
            self._s3.put_bucket_logging(Bucket=bucket_name,
                                        BucketLoggingStatus={
                                            "LoggingEnabled": {
                                                "TargetBucket":
                                                self._default_logging_bucket,
                                                "TargetPrefix": default_prefix,
                                            }
                                        },
                                        ExpectedBucketOwner=self._account_id)
        except Exception as e:
            logger.error(e)
            raise RuntimeError(
                "Unable to put logging bucket, please try it manually")

        return {
            "enabled": True,
            "bucket": self._default_logging_bucket,
            "prefix": default_prefix,
        }


class Certificate(Resource):

    def __init__(self, accountId=account_id, region=default_region):
        super().__init__(accountId, region)

        svcMgr = SvcManager()
        self._acm = svcMgr.get_client(sub_account_id=accountId,
                                      region=region,
                                      service_name='acm',
                                      type=Boto3API.CLIENT)

    def describe_expiration_time(self, cert_arn=""):
        response = self._acm.describe_certificate(CertificateArn=cert_arn)
        expire_time = response['Certificate']['NotAfter']
        return expire_time

    def list(self, parent_id=""):
        result = []
        response = self._acm.list_certificates(CertificateStatuses=[
            "ISSUED",
        ], )
        # print(response)

        for cert in response["CertificateSummaryList"]:
            # Verify if certificate is expired or not
            expiration_time = self.describe_expiration_time(
                cert_arn=cert["CertificateArn"])
            expiration_time = expiration_time.replace(tzinfo=None)
            now = datetime.now()
            datetime_subtraction = expiration_time - now
            if datetime_subtraction.days > 0:
                result.append({
                    "id": cert["CertificateArn"],
                    "name": cert["DomainName"],
                })
        return result


class VPC(Resource):

    def __init__(self, accountId=account_id, region=default_region):
        super().__init__(accountId, region)

        svcMgr = SvcManager()
        self._ec2 = svcMgr.get_client(sub_account_id=accountId,
                                      region=region,
                                      service_name='ec2',
                                      type=Boto3API.CLIENT)
        self._s3 = svcMgr.get_client(sub_account_id=accountId,
                                     service_name='s3',
                                     type=Boto3API.CLIENT)
        link_acct = svcMgr.get_link_account(accountId, region)
        if link_acct:
            self._default_logging_bucket = link_acct['subAccountBucketName']
        else:
            self._default_logging_bucket = default_logging_bucket

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

            result.append({
                "id": vpc["VpcId"],
                "name": name,
            })
        return result

    def get_logging_bucket(self, vpc_id):
        # Get VPC Flow Logs' bucket
        try:
            response = self._ec2.describe_flow_logs(
                Filters=[{
                    "Name": "resource-id",
                    "Values": [
                        vpc_id,
                    ]
                }, {
                    "Name": "log-destination-type",
                    "Values": [
                        "s3",
                    ]
                }, {
                    "Name": "deliver-log-status",
                    "Values": [
                        "SUCCESS",
                    ]
                }])
            buckets = []
            # Concurrently get the bucket locations
            with ThreadPoolExecutor(max_workers=10) as executor:
                get_loc_futures = {
                    executor.submit(self._filter_bucket, flow_log): flow_log
                    for flow_log in response["FlowLogs"]
                }

                for future in as_completed(get_loc_futures):
                    try:
                        name = future.result()
                        if name is not None:
                            buckets.append(name)
                    except Exception as e:
                        logger.error(e)

            bucket_full_path = buckets[0].split("/", 1)
            bucket_name = bucket_full_path[0]
            bucket_prefix = (bucket_full_path[1] if bucket_full_path[1].endswith("/") else bucket_full_path[1] + "/") \
                if len(bucket_full_path) > 1 else ""
            return {
                "enabled":
                True,
                "bucket":
                bucket_name,
                "prefix":
                bucket_prefix +
                f"AWSLogs/{self._account_id}/vpcflowlogs/{self._region}",
            }
        except Exception as e:
            logger.error(e)
        return {
            "enabled": False,
            "bucket": self._default_logging_bucket,
            "prefix": f"VPCLogs/{vpc_id}/{self._default_prefix()}",
        }

    def put_logging_bucket(self, vpc_id):
        partition = self._get_partition()
        try:
            self._ec2.create_flow_logs(
                ResourceIds=[vpc_id],
                ResourceType="VPC",
                TrafficType="ALL",
                LogDestinationType="s3",
                LogDestination=
                f"arn:{partition}:s3:::{self._default_logging_bucket}/VPCLogs/{vpc_id}/"
            )
            return {
                "enabled": True,
                "bucket": self._default_logging_bucket,
                "prefix": f"VPCLogs/{vpc_id}/{self._default_prefix()}",
            }
        except Exception as e:
            logger.error(e)
            raise RuntimeError(
                "Unable to put logging bucket, please try it manually")

    def _get_partition(self):
        if self._region in ["cn-north-1", "cn-northwest-1"]:
            return "aws-cn"
        else:
            return "aws"

    def _default_prefix(self):
        return f"AWSLogs/{self._account_id}/vpcflowlogs/{self._region}"

    def _filter_bucket(self, flow_log):
        if "LogDestination" in flow_log and flow_log["LogDestination"]:
            bucket_full_name = flow_log["LogDestination"].rsplit(":", 1)[1]
            loc = self._get_bucket_location(bucket_full_name)
            return bucket_full_name if loc == self._region else None
        return None

    def _get_bucket_location(self, bucket_full_name):
        bucket_name = bucket_full_name.split("/", 1)[0]
        resp = self._s3.get_bucket_location(Bucket=bucket_name, )
        loc = resp["LocationConstraint"]
        # For us-east-1, the location is None
        return "us-east-1" if loc is None else loc


class Subnet(Resource):

    def __init__(self, accountId=account_id, region=default_region):
        super().__init__(accountId, region)

        svcMgr = SvcManager()
        self._ec2 = svcMgr.get_client(sub_account_id=accountId,
                                      region=region,
                                      service_name='ec2',
                                      type=Boto3API.CLIENT)

    def list(self, parent_id=""):
        result = []

        filters = [{
            "Name": "state",
            "Values": [
                "available",
            ],
        }]

        if parent_id:
            filters.append({
                "Name": "vpc-id",
                "Values": [
                    parent_id,
                ],
            })

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
            result.append({
                "id": subnet["SubnetId"],
                "name": name,
                "parentId": subnet["VpcId"],
                "description": subnet["AvailabilityZone"],
            })
        return result


class SecurityGroup(Resource):

    def __init__(self, accountId=account_id, region=default_region):
        super().__init__(accountId, region)

        svcMgr = SvcManager()
        self._ec2 = svcMgr.get_client(sub_account_id=accountId,
                                      region=region,
                                      service_name='ec2',
                                      type=Boto3API.CLIENT)

    def list(self, parent_id=""):
        result = []
        filters = []
        if parent_id:
            filters.append({
                "Name": "vpc-id",
                "Values": [
                    parent_id,
                ],
            })

        # Ignore paging, assume maximum of 1000 results
        response = self._ec2.describe_security_groups(Filters=filters,
                                                      MaxResults=1000)
        # print(response)

        for sg in response["SecurityGroups"]:
            result.append({
                "id": sg["GroupId"],
                "name": sg["GroupName"],
                "parentId": sg["VpcId"],
            })
        return result


class Trail(Resource):

    def __init__(self, accountId=account_id, region=default_region):
        super().__init__(accountId, region)

        svcMgr = SvcManager()
        self._cloudtrail = svcMgr.get_client(sub_account_id=accountId,
                                             region=region,
                                             service_name='cloudtrail',
                                             type=Boto3API.CLIENT)
        self._s3 = svcMgr.get_client(sub_account_id=accountId,
                                     service_name='s3',
                                     type=Boto3API.CLIENT)

    def list(self, parent_id=""):
        result = []

        # Ignore paging, assume maximum of 1000 results
        response = self._cloudtrail.list_trails()
        # print(response)

        # Concurrently get the bucket locations
        with ThreadPoolExecutor(max_workers=10) as executor:
            get_loc_futures = {
                executor.submit(self._get_log_bucket_location, trail["Name"]):
                trail
                for trail in response["Trails"]
            }

            for future in as_completed(get_loc_futures):
                try:
                    data = future.result()
                    if data == self._region:
                        trail = get_loc_futures[future]
                        result.append({
                            "id":
                            trail["TrailARN"],
                            "name":
                            trail["Name"],
                            "description":
                            f"{trail['Name']} ({trail['HomeRegion']})",
                        })
                except Exception as e:
                    logger.error(e)
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
                "prefix": f"{prefix}AWSLogs/{self._account_id}/CloudTrail/",
            }
        except Exception as e:
            logger.error(e)
            raise RuntimeError(
                "Unable to detect the logging bucket for this trail")

    def _get_log_bucket_location(self, trail_name: str):
        log_bucket_info = self.get_logging_bucket(trail_name=trail_name)
        resp = self._s3.get_bucket_location(Bucket=log_bucket_info["bucket"], )
        loc = resp["LocationConstraint"]
        # For us-east-1, the location is None
        return "us-east-1" if loc is None else loc


class Config(Resource):

    def __init__(self, accountId=account_id, region=default_region):
        super().__init__(accountId, region)

        svcMgr = SvcManager()
        self._config = svcMgr.get_client(sub_account_id=accountId,
                                         region=region,
                                         service_name='config',
                                         type=Boto3API.CLIENT)
        self._s3 = svcMgr.get_client(sub_account_id=accountId,
                                     service_name='s3',
                                     type=Boto3API.CLIENT)

    def get_logging_bucket(self, resource_name):
        try:
            response = self._config.describe_delivery_channels()
            if "DeliveryChannels" in response and response["DeliveryChannels"]:
                channel = response["DeliveryChannels"][0]
                bucket = channel["s3BucketName"]
                prefix = ""
                if "s3KeyPrefix" in channel and channel["s3KeyPrefix"]:
                    prefix = channel["s3KeyPrefix"] + "/"
                if self._get_log_bucket_location(bucket) == self._region:
                    return {
                        "enabled":
                        True,
                        "bucket":
                        bucket,
                        "prefix":
                        prefix +
                        f"AWSLogs/{self._account_id}/Config/{self._region}",
                    }
            return {
                "enabled": False,
                "bucket": "",
                "prefix": "",
            }
        except Exception as e:
            logger.error(e)
            raise RuntimeError(
                "Unable to find the logging bucket for the aws config, or aws config is not enabled"
            )

    def _get_log_bucket_location(self, bucket_name: str):
        resp = self._s3.get_bucket_location(Bucket=bucket_name, )
        loc = resp["LocationConstraint"]
        # For us-east-1, the location is None
        return "us-east-1" if loc is None else loc


class KeyPair(Resource):

    def __init__(self, accountId=account_id, region=default_region):
        super().__init__(accountId, region)

        svcMgr = SvcManager()
        self._ec2 = svcMgr.get_client(sub_account_id=accountId,
                                      region=region,
                                      service_name='ec2',
                                      type=Boto3API.CLIENT)

    def list(self, parent_id=""):
        result = []

        # Ignore paging, assume maximum of 1000 results
        response = self._ec2.describe_key_pairs()
        # print(response)

        for key in response["KeyPairs"]:
            result.append({
                "id": key["KeyPairId"],
                "name": key["KeyName"],
            })
        return result


class Distribution(Resource):
    """For Cloudfront Distribution"""

    def __init__(self, accountId=account_id, region=default_region):
        super().__init__(accountId, region)

        svcMgr = SvcManager()
        self._cf = svcMgr.get_client(sub_account_id=accountId,
                                     region=region,
                                     service_name='cloudfront',
                                     type=Boto3API.CLIENT)
        self._s3 = svcMgr.get_client(sub_account_id=accountId,
                                     service_name='s3',
                                     type=Boto3API.CLIENT)
        link_acct = svcMgr.get_link_account(accountId, region)
        if link_acct:
            self._default_logging_bucket = link_acct['subAccountBucketName']
        else:
            self._default_logging_bucket = default_logging_bucket

    def list(self, parent_id=""):
        result = []
        response = self._cf.list_distributions(MaxItems="1000")

        # print(response)
        # Concurrently get the bucket locations
        if "Items" in response["DistributionList"]:
            with ThreadPoolExecutor(max_workers=10) as executor:
                get_loc_futures = {
                    executor.submit(self._get_log_bucket_location, dist["Id"]):
                    dist
                    for dist in response["DistributionList"]["Items"]
                }

                for future in as_completed(get_loc_futures):
                    try:
                        data = future.result()
                        if data == self._region:
                            dist = get_loc_futures[future]
                            result.append({
                                "id": dist["Id"],
                                "name": dist["DomainName"],
                                "description": dist["Comment"],
                            })
                    except Exception as e:
                        logger.error(e)
        return result

    def _default_prefix(self, distribution_id):
        return f"AWSLogs/{self._account_id}/CloudFront/{distribution_id}/"

    def get_logging_bucket(self, distribution_id):
        try:
            response = self._cf.get_distribution_config(Id=distribution_id)
            # print(response)

            log_info = response["DistributionConfig"]["Logging"]
            if log_info["Enabled"]:
                return {
                    "enabled":
                    True,
                    "bucket":
                    re.sub(
                        ".s3(.[a-z]{2}-[a-z]{4,20}-\\d)?.amazonaws.com(.cn)?$",
                        "",
                        log_info["Bucket"],
                        1,
                    ),
                    "prefix":
                    log_info["Prefix"],
                }

        except Exception as e:
            logger.error(e)
        return {
            "enabled": False,
            "bucket": self._default_logging_bucket,
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
                    "enabled":
                    True,
                    "bucket":
                    re.sub(
                        ".s3(.[a-z]{2}-[a-z]{4,20}-\\d)?.amazonaws.com(.cn)?$",
                        "",
                        log_info["Bucket"],
                        1,
                    ),
                    "prefix":
                    log_info["Prefix"],
                }
            else:
                # TODO: Support China regions
                dist_config["Logging"] = {
                    "Enabled": True,
                    "IncludeCookies": False,
                    "Bucket":
                    f"{self._default_logging_bucket}.s3.amazonaws.com",
                    "Prefix": default_prefix,
                }
                self._cf.update_distribution(
                    DistributionConfig=dist_config,
                    Id=distribution_id,
                    IfMatch=etag,
                )
        except Exception as e:
            logger.error(e)
            raise RuntimeError(
                "Unable to put logging bucket, please try it manually")
        return {
            "enabled": True,
            "bucket": self._default_logging_bucket,
            "prefix": default_prefix,
        }

    def _get_log_bucket_location(self, distribution_id: str):
        log_bucket_info = self.get_logging_bucket(
            distribution_id=distribution_id)
        resp = self._s3.get_bucket_location(Bucket=log_bucket_info["bucket"], )
        loc = resp["LocationConstraint"]
        # For us-east-1, the location is None
        return "us-east-1" if loc is None else loc


class Lambda(Resource):

    def __init__(self, accountId=account_id, region=default_region):
        super().__init__(accountId, region)

        svcMgr = SvcManager()
        self._client = svcMgr.get_client(sub_account_id=accountId,
                                         region=region,
                                         service_name='lambda',
                                         type=Boto3API.CLIENT)
        self._default_logging_bucket = default_logging_bucket

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
                result.append({
                    "id": fc["FunctionName"],
                    "name": f"{fc['FunctionName']}-{fc['Version']}",
                    "description": fc["Description"],
                })
            if "NextMarker" in resp:
                marker = resp["NextMarker"]
            else:
                break
        return result

    def _default_prefix(self, id):
        return f"AWSLogs/{self._account_id}/Lambda/{self._region}/{id}/"

    def get_logging_bucket(self, function_name):
        return {
            "enabled": True,
            "bucket": self._default_logging_bucket,
            "prefix": self._default_prefix(function_name),
        }


class RDS(Resource):

    def __init__(self, accountId=account_id, region=default_region):
        super().__init__(accountId, region)

        svcMgr = SvcManager()
        self._client = svcMgr.get_client(sub_account_id=accountId,
                                         region=region,
                                         service_name='rds',
                                         type=Boto3API.CLIENT)

        self._default_logging_bucket = default_logging_bucket

    def _get_db_instances(self):
        result = []
        marker = ""
        engines = ["mysql"]
        # Default maximum items is 100
        # Only supports mysql
        kwargs = {
            "MaxRecords": 100,
            "Filters": [{
                "Name": "engine",
                "Values": engines
            }],
        }
        while True:
            if marker:
                kwargs["Marker"] = marker
            resp = self._client.describe_db_instances(**kwargs)
            for db in resp["DBInstances"]:
                desc = f"/aws/rds/instance/{db['DBInstanceIdentifier']}"
                result.append({
                    "id": db["DBInstanceIdentifier"],
                    "name":
                    f"{self._get_engine_desc(db['Engine'])} - {db['DBInstanceIdentifier']}",
                    "description": desc,
                })
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
            "Filters": [{
                "Name": "engine",
                "Values": engines
            }],
        }
        while True:
            if marker:
                kwargs["Marker"] = marker
            resp = self._client.describe_db_clusters(**kwargs)
            for db in resp["DBClusters"]:
                desc = f"/aws/rds/cluster/{db['DBClusterIdentifier']}"
                result.append({
                    "id": db["DBClusterIdentifier"],
                    "name":
                    f"{self._get_engine_desc(db['Engine'])} - {db['DBClusterIdentifier']}",
                    "description": desc,
                })
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
        return f"AWSLogs/{self._account_id}/RDS/{self._region}/{id}/"

    def get_logging_bucket(self, id):
        return {
            "enabled": True,
            "bucket": self._default_logging_bucket,
            "prefix": self._default_prefix(id),
        }

    @staticmethod
    def _get_engine_desc(engine):
        engine_list = {"mysql": "MySQL", "aurora-mysql": "Aurora MySQL"}
        return engine_list.get(engine)


class ELB(Resource):

    def __init__(self, accountId=account_id, region=default_region):
        super().__init__(accountId, region)

        svcMgr = SvcManager()
        self._client = svcMgr.get_client(sub_account_id=accountId,
                                         region=region,
                                         service_name='elbv2',
                                         type=Boto3API.CLIENT)
        link_acct = svcMgr.get_link_account(accountId, region)
        if link_acct:
            self._default_logging_bucket = link_acct['subAccountBucketName']
        else:
            self._default_logging_bucket = default_logging_bucket

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
                    result.append({
                        "id": alb["LoadBalancerArn"],
                        "name": alb["LoadBalancerName"],
                    })
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
        return f"AWSLogs/{self._account_id}/elasticloadbalancing/{self._region}"

    def get_logging_bucket(self, load_balancer_arn):
        default_prefix = self._default_prefix()
        try:
            resp_attributes = self._client.describe_load_balancer_attributes(
                LoadBalancerArn=load_balancer_arn)["Attributes"]
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
            "bucket": self._default_logging_bucket,
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
                            "Value": self._default_logging_bucket,
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
                    "bucket": self._default_logging_bucket,
                    "prefix": f"ELBLogs/{load_balancer_name}/{default_prefix}",
                }
        except Exception as e:
            logger.error(e)
            raise RuntimeError(
                "Unable to put logging bucket, please try it manually")


class WAF(Resource):

    def __init__(self, accountId=account_id, region=default_region):
        super().__init__(accountId, region)

        svcMgr = SvcManager()
        self._client = svcMgr.get_client(sub_account_id=accountId,
                                         region=region,
                                         service_name='wafv2',
                                         type=Boto3API.CLIENT)

        self._cf_client = svcMgr.get_client(sub_account_id=accountId,
                                            region='us-east-1',
                                            service_name='wafv2',
                                            type=Boto3API.CLIENT)

        self._s3_client = svcMgr.get_client(sub_account_id=accountId,
                                            region=region,
                                            service_name='s3',
                                            type=Boto3API.CLIENT)

        self._iam_client = svcMgr.get_client(sub_account_id=accountId,
                                             region=region,
                                             service_name='iam',
                                             type=Boto3API.CLIENT)

        self._firehose_client = svcMgr.get_client(sub_account_id=accountId,
                                                  region=region,
                                                  service_name='firehose',
                                                  type=Boto3API.CLIENT)

        self._firehose_us_east_1_client = svcMgr.get_client(
            sub_account_id=accountId,
            region='us-east-1',
            service_name='firehose',
            type=Boto3API.CLIENT)

    def _wafv2(self, is_global=True):
        if is_global:
            logging.info('using global(us-east-1) wafv2 client')
            return self._cf_client
        else:
            logging.info(f'using regional({self._region}) wafv2 client')
            return self._client

    def _firehose(self, is_global=True):
        if is_global:
            logging.info('using global(us-east-1) firehose client')
            return self._firehose_us_east_1_client
        else:
            logging.info(f'using regional({self._region}) firehose client')
            return self._firehose_client

    def create_s3_delivery_stream(self,
                                  bucket_arn,
                                  s3_prefix,
                                  delivery_stream_name,
                                  firehose_client=None):
        ownner_account_id = self._account_id
        region = self._region
        partition = self._get_partition()

        role_name = f'kf-{delivery_stream_name}'[:64]
        policy_name = f'{role_name}-policy'[:64]

        if not firehose_client:
            firehose_client = self._firehose_client

        logging.info(
            'create_s3_delivery_stream bucket_arn=%s s3_prefix=%s delivery_stream=%s firehose_client=%s',
            bucket_arn, s3_prefix, delivery_stream_name, firehose_client)

        try:
            role = self._iam_client.get_role(RoleName=role_name)

            logging.info('role: %s already exists', role_name)
        except self._iam_client.exceptions.NoSuchEntityException:
            logging.info('role: %s not found, try creating a new one',
                         role_name)

            role = self._iam_client.create_role(
                RoleName=role_name,
                Path='/service-role/',
                AssumeRolePolicyDocument=json.dumps({
                    'Version':
                    '2012-10-17',
                    'Statement': [{
                        'Effect': 'Allow',
                        'Principal': {
                            'Service': 'firehose.amazonaws.com'
                        },
                        'Action': 'sts:AssumeRole'
                    }]
                }),
            )

        self._iam_client.put_role_policy(
            RoleName=role_name,
            PolicyName=policy_name,
            PolicyDocument=json.dumps({
                'Version':
                '2012-10-17',
                'Statement': [{
                    'Sid':
                    '',
                    'Effect':
                    'Allow',
                    'Action': [
                        'glue:GetTable', 'glue:GetTableVersion',
                        'glue:GetTableVersions'
                    ],
                    'Resource': [
                        f'arn:{partition}:glue:{region}:{ownner_account_id}:catalog',
                        f'arn:{partition}:glue:{region}:{ownner_account_id}:database/%FIREHOSE_POLICY_TEMPLATE_PLACEHOLDER%',
                        f'arn:{partition}:glue:{region}:{ownner_account_id}:table/%FIREHOSE_POLICY_TEMPLATE_PLACEHOLDER%/%FIREHOSE_POLICY_TEMPLATE_PLACEHOLDER%'
                    ]
                }, {
                    'Sid':
                    '',
                    'Effect':
                    'Allow',
                    'Action': [
                        's3:AbortMultipartUpload', 's3:GetBucketLocation',
                        's3:GetObject', 's3:ListBucket',
                        's3:ListBucketMultipartUploads', 's3:PutObject'
                    ],
                    'Resource': [f'{bucket_arn}', f'{bucket_arn}/*']
                }, {
                    'Sid':
                    '',
                    'Effect':
                    'Allow',
                    'Action': [
                        'lambda:InvokeFunction',
                        'lambda:GetFunctionConfiguration'
                    ],
                    'Resource':
                    f'arn:{partition}:lambda:{region}:{ownner_account_id}:function:%FIREHOSE_POLICY_TEMPLATE_PLACEHOLDER%'
                }, {
                    'Effect':
                    'Allow',
                    'Action': ['kms:GenerateDataKey', 'kms:Decrypt'],
                    'Resource': [
                        f'arn:{partition}:kms:{region}:{ownner_account_id}:key/%FIREHOSE_POLICY_TEMPLATE_PLACEHOLDER%'
                    ],
                    'Condition': {
                        'StringEquals': {
                            'kms:ViaService': f's3.{region}.amazonaws.com'
                        },
                        'StringLike': {
                            f'kms:EncryptionContext:{partition}:s3:arn': [
                                f'arn:{partition}:s3:::%FIREHOSE_POLICY_TEMPLATE_PLACEHOLDER%/*',
                                f'arn:{partition}:s3:::%FIREHOSE_POLICY_TEMPLATE_PLACEHOLDER%'
                            ]
                        }
                    }
                }, {
                    'Sid':
                    '',
                    'Effect':
                    'Allow',
                    'Action': ['logs:PutLogEvents'],
                    'Resource': [
                        f'arn:{partition}:logs:{region}:{ownner_account_id}:log-group:/aws/kinesisfirehose/*:log-stream:*',
                        f'arn:{partition}:logs:{region}:{ownner_account_id}:log-group:%FIREHOSE_POLICY_TEMPLATE_PLACEHOLDER%:log-stream:*'
                    ]
                }, {
                    'Sid':
                    '',
                    'Effect':
                    'Allow',
                    'Action': [
                        'kinesis:DescribeStream', 'kinesis:GetShardIterator',
                        'kinesis:GetRecords', 'kinesis:ListShards'
                    ],
                    'Resource':
                    f'arn:{partition}:kinesis:{region}:{ownner_account_id}:stream/%FIREHOSE_POLICY_TEMPLATE_PLACEHOLDER%'
                }, {
                    'Effect':
                    'Allow',
                    'Action': ['kms:Decrypt'],
                    'Resource': [
                        f'arn:{partition}:kms:{region}:{ownner_account_id}:key/%FIREHOSE_POLICY_TEMPLATE_PLACEHOLDER%'
                    ],
                    'Condition': {
                        'StringEquals': {
                            'kms:ViaService': f'kinesis.{region}.amazonaws.com'
                        },
                        'StringLike': {
                            f'kms:EncryptionContext:{partition}:kinesis:arn':
                            f'arn:{partition}:kinesis:{region}:{ownner_account_id}:stream/%FIREHOSE_POLICY_TEMPLATE_PLACEHOLDER%'
                        }
                    }
                }]
            }),
        )

        role_arn = role['Role']['Arn']

        ds = retry(func=firehose_client.create_delivery_stream)(
            DeliveryStreamName=delivery_stream_name,
            DeliveryStreamType='DirectPut',
            ExtendedS3DestinationConfiguration=dict(
                RoleARN=role_arn,
                BucketARN=bucket_arn,
                Prefix=s3_prefix,
                CompressionFormat='GZIP',
                ErrorOutputPrefix=f'{s3_prefix}error',
                CloudWatchLoggingOptions=dict(Enabled=False),
            ))

        return ds['DeliveryStreamARN']

    def _get_waf_acl(self, scope):
        if scope == "CLOUDFRONT":
            if self._get_partition() == 'aws':
                client = self._cf_client
            else:
                return []
        else:
            client = self._client
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
            resp = client.list_web_acls(**kwargs)

            for acl in resp["WebACLs"]:
                result.append({
                    "id": acl["ARN"],
                    "name": acl["Name"],
                    "description": scope,
                })

            if "NextMarker" in resp:
                if resp["NextMarker"] == "Not Implemented":
                    break
                next_marker = resp["NextMarker"]
            else:
                break
        return result

    def _parse_web_acl_name(self, acl_arn):
        # TODO: Use regex
        end_pos = acl_arn.rfind("/") - 1
        start_pos = acl_arn.rfind("/", 0, end_pos)
        web_acl_name = acl_arn[start_pos + 1:end_pos + 1]
        return web_acl_name

    def _generate_default_prefix(self, acl_arn, scope):
        web_acl_name = self._parse_web_acl_name(acl_arn)
        if scope == "CLOUDFRONT":
            default_prefix = f"AWSLogs/{self._account_id}/WAFLogs/cloudfront/{web_acl_name}/"
        else:
            default_prefix = (
                f"AWSLogs/{self._account_id}/WAFLogs/{self._region}/{web_acl_name}/"
            )
        return default_prefix

    def _get_partition(self):
        if self._region in ["cn-north-1", "cn-northwest-1"]:
            return "aws-cn"
        else:
            return "aws"

    def _default_logging_bucket(self, region=None):
        if not region:
            region = self._region

        return f"aws-waf-logs-loghub-{self._account_id}-{region}"

    def _get_logging_bucket(self, acl_arn, scope):
        region = 'us-east-1' if scope == 'CLOUDFRONT' else self._region

        logging_bucket = self._default_logging_bucket(region=region)
        default_prefix = self._generate_default_prefix(acl_arn, scope)
        is_global = (scope == 'CLOUDFRONT' and self._get_partition() == 'aws')

        try:
            wafv2 = self._wafv2(is_global=is_global)
            resp = wafv2.get_logging_configuration(ResourceArn=acl_arn)
            log_dest_arn = resp["LoggingConfiguration"][
                "LogDestinationConfigs"][0]

            if is_arn(s=log_dest_arn, svc='s3'):
                # Determine if the target is S3
                logging_bucket = log_dest_arn[log_dest_arn.rindex(":") + 1:]

                return {
                    'enabled': True,
                    'bucket': logging_bucket,
                    'prefix': default_prefix,
                    'source': 'WAF',
                }

            elif is_arn(s=log_dest_arn, svc='firehose'):
                delivery_stream_name = log_dest_arn.split('/')[-1]
                firehose = self._firehose(is_global=is_global)
                ds = firehose.describe_delivery_stream(
                    DeliveryStreamName=delivery_stream_name,
                    Limit=1,
                )
                s3_dest_desc = ds['DeliveryStreamDescription']['Destinations'][
                    0]['ExtendedS3DestinationDescription']
                bucket_arn = s3_dest_desc['BucketARN']
                bucker_name = bucket_arn[bucket_arn.rindex(":") + 1:]

                return {
                    'enabled': True,
                    'bucket': bucker_name,
                    'prefix': default_prefix,
                    'source': 'KinesisDataFirehoseForWAF',
                }

        except Exception as e:
            logger.error(e, exc_info=True)
            logger.info(f"{acl_arn} doesn't have logging Enabled.")

        return {
            "enabled": False,
            "bucket": logging_bucket,
            "prefix": default_prefix,
        }

    def _create_logging_bucket(self, bucket_name):
        # check if bucket already exists.
        try:
            self._s3_client.head_bucket(Bucket=bucket_name, )
            logger.info("Bucket %s already exists", bucket_name)
            return bucket_name
        except Exception as e:
            # such as bucket not exists
            logger.info(e)

        logger.info("Trying to create logging bucket %s", bucket_name)
        kwargs = {
            "ACL": "private",
            "Bucket": bucket_name,
            "ObjectOwnership": "BucketOwnerEnforced",
        }
        if self._region != "us-east-1":
            kwargs["CreateBucketConfiguration"] = {
                "LocationConstraint": self._region
            }
        try:
            self._s3_client.create_bucket(**kwargs)
            logger.info(
                f"Created {bucket_name} in {self._account_id}-{self._region}")
        except Exception as e:
            logger.error(e)
            raise RuntimeError(
                "Unable to create logging bucket, please try it manually")
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
        bucket_arn = f"arn:{partition}:s3:::{bucket_name}"
        try:
            uniq = sha1(default_prefix)[:5]
            is_global = (':global/' in acl_arn
                         and self._get_partition() == 'aws')
            delivery_stream_name = f'{bucket_name}-{uniq}'
            firehose = self._firehose(is_global=is_global)
            wafv2 = self._wafv2(is_global=is_global)
            delivery_stream_arn = self.create_s3_delivery_stream(
                bucket_arn=bucket_arn,
                s3_prefix=default_prefix,
                delivery_stream_name=delivery_stream_name,
                firehose_client=firehose)

            wafv2.put_logging_configuration(
                LoggingConfiguration={
                    "ResourceArn": acl_arn,
                    "LogDestinationConfigs": [delivery_stream_arn],
                })
            return {
                "enabled": True,
                "bucket": bucket_name,
                "prefix": default_prefix,
                'source': 'KinesisDataFirehoseForWAF',
            }
        except Exception as e:
            logger.error(e, exc_info=True)
            raise RuntimeError(
                "Unable to put logging bucket, please try it manually")

    def list(self, parent_id=""):
        acls = self._get_waf_acl("CLOUDFRONT") + self._get_waf_acl("REGIONAL")
        return acls

    def get_logging_bucket(self, acl_arn):
        if ":regional/" in acl_arn:
            result = self._get_logging_bucket(acl_arn, "REGIONAL")
        else:
            result = self._get_logging_bucket(acl_arn, "CLOUDFRONT")
        return result
