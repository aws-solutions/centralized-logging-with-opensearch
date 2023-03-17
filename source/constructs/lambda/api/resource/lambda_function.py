# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import logging
import os
import re
import sys
import time
import json
import uuid
import boto3


from concurrent.futures import ThreadPoolExecutor, as_completed
from functools import partial, wraps
from botocore import config
from datetime import datetime
from aws_svc_mgr import SvcManager, Boto3API
from botocore.exceptions import ClientError

logger = logging.getLogger()
logger.setLevel(logging.INFO)

UNABLE_TO_ENABLE_LOGGING_ERROR = (
    "Unable to add logging to service, please try it manually"
)

solution_version = os.environ.get("SOLUTION_VERSION", "v1.0.0")
solution_id = os.environ.get("SOLUTION_ID", "SO8025")
user_agent_config = {
    "user_agent_extra": f"AwsSolution/{solution_id}/{solution_version}"
}
default_config = config.Config(**user_agent_config)
stack_prefix = os.environ.get("STACK_PREFIX", "CL")

default_region = os.environ.get("AWS_REGION")
default_logging_bucket = os.environ.get("DEFAULT_LOGGING_BUCKET")

sts = boto3.client("sts", config=default_config)
default_account_id = sts.get_caller_identity()["Account"]


def lambda_handler(event, _):
    """
    This lambda handles request such as listing resources or getting logging bucket for resource

    Each resource must extend the basic Resource class,
    and the class name must be same as the resource type.

    For example, if you need to add a new type Abc.

    Create a new  `class Abc(Resource)`, and implement `list()` and `get_logging_bucket(resource_name)` accordingly.

    Note that the new type should also exist in the GraphQL Schema
    """

    try:
        action = event["info"]["fieldName"]
        args = event["arguments"]
        resource_type = args["type"]
        region = args.get("region") or default_region
        account_id = args.get("accountId") or default_account_id

        resource = getattr(sys.modules[__name__], resource_type, None)
        if not resource:
            raise RuntimeError(f"Unsupported Resource Type {resource_type}")

        if action == "listResources":
            parent_id = args.get("parentId", "")
            return resource(account_id, region).list(parent_id)
        elif action == "getResourceLoggingBucket":
            resource_name = args["resourceName"]
            return resource(account_id, region).get_logging_bucket(resource_name)
        elif action == "putResourceLoggingBucket":
            resource_name = args["resourceName"]
            return resource(account_id, region).put_logging_bucket(resource_name)
        elif action == "getResourceLogConfigs":
            resource_name = args["resourceName"]
            return resource(account_id, region).get_resource_log_config(resource_name)
        elif action == "putResourceLogConfig":
            resource_name = args["resourceName"]
            dest_type = args["destinationType"]
            dest_name = args["destinationName"]
            log_format = args.get("LogFormat", "")

            return resource(account_id, region).put_resource_log_config(
                resource_name, dest_type, dest_name, log_format
            )
        else:
            raise RuntimeError(f"Unsupported Action {action}")
    except Exception as e:
        logger.error(e, exc_info=True)
        raise e


def retry(func=None, exception=Exception, n_tries=4, delay=5, backoff=2, logger=logger):
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
    logger : logging.logger, optional
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


def is_arn(s: str, svc: str):
    return re.match(rf"^arn:aws.*:{svc}", s, re.MULTILINE)


class Resource:
    """Basic Class represents a type of AWS resource"""

    def __init__(self, account_id=default_account_id, region=default_region):
        super().__init__()
        self._account_id = account_id
        self._region = region
        self._partition = get_partition(region)

    def list(self, parent_id=""):
        """returned all resources filtered by parent id if any"""

        logger.info("parent_id is %s", parent_id)

        raise NotImplementedError

    def get_logging_bucket(self, resource_name):
        """returned the logging bucket for the resource

        The resource_name could be a name or an ID.
        """
        self._log_resource_name(resource_name)
        raise NotImplementedError

    def put_logging_bucket(self, resource_name):
        """Set Logging bucket

        The resource_name could be a name or an ID.
        """
        self._log_resource_name(resource_name)
        raise NotImplementedError

    def get_resource_log_config(self, resource_name):
        """returned the logging config for the resource

        The resource_name could be a name or an ID.
        """
        self._log_resource_name(resource_name)
        raise NotImplementedError

    def put_resource_log_config(self, resource_name, dest_type, dest_name, log_format):
        """Add (Enable) logging configuration for the resource

        The resource_name could be a name or an ID.
        """
        self._log_resource_name(resource_name)
        logger.info("dest_type is %s", dest_type)
        logger.info("dest_name is %s", dest_name)
        logger.info("log_format is %s", log_format)
        raise NotImplementedError

    def _log_resource_name(self, resource_name):
        logger.info("resource_name is %s", resource_name)


class S3Bucket(Resource):
    def __init__(self, account_id=default_account_id, region=default_region):
        super().__init__(account_id, region)
        svc_mgr = SvcManager()
        self._s3 = svc_mgr.get_client(
            sub_account_id=account_id,
            region=region,
            service_name="s3",
            type=Boto3API.CLIENT,
        )
        link_acct = svc_mgr.get_link_account(account_id, region)
        if link_acct:
            self._default_logging_bucket = link_acct["subAccountBucketName"]
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
                executor.submit(get_bucket_location, self._s3, name): name
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
        return f"AWSLogs/{self._account_id}/S3/{bucket_name}/"

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
            "bucket": self._default_logging_bucket,
            "prefix": self._default_prefix(bucket_name),
        }

    def put_logging_bucket(self, bucket_name: str):

        default_prefix = self._default_prefix(bucket_name)
        try:
            self._s3.put_bucket_logging(
                Bucket=bucket_name,
                BucketLoggingStatus={
                    "LoggingEnabled": {
                        "TargetBucket": self._default_logging_bucket,
                        "TargetPrefix": default_prefix,
                    }
                },
                ExpectedBucketOwner=self._account_id,
            )
        except Exception as e:
            logger.error(e)
            raise RuntimeError(UNABLE_TO_ENABLE_LOGGING_ERROR)

        return {
            "enabled": True,
            "bucket": self._default_logging_bucket,
            "prefix": default_prefix,
        }


class Certificate(Resource):
    def __init__(self, account_id=default_account_id, region=default_region):
        super().__init__(account_id, region)

        svc_mgr = SvcManager()
        self._acm = svc_mgr.get_client(
            sub_account_id=account_id,
            region=region,
            service_name="acm",
            type=Boto3API.CLIENT,
        )

    def describe_expiration_time(self, cert_arn=""):
        response = self._acm.describe_certificate(CertificateArn=cert_arn)
        expire_time = response["Certificate"]["NotAfter"]
        return expire_time

    def list(self, parent_id=""):
        result = []
        response = self._acm.list_certificates(
            CertificateStatuses=[
                "ISSUED",
            ],
            Includes={
                "keyTypes": [
                    "RSA_1024",
                    "RSA_2048",
                    "RSA_3072",
                    "RSA_4096",
                    "EC_prime256v1",
                    "EC_secp384r1",
                    "EC_secp521r1",
                ]
            },
        )
        # print(response)

        for cert in response["CertificateSummaryList"]:
            # Verify if certificate is expired or not
            expiration_time = self.describe_expiration_time(
                cert_arn=cert["CertificateArn"]
            )
            expiration_time = expiration_time.replace(tzinfo=None)
            now = datetime.now()
            datetime_subtraction = expiration_time - now
            if datetime_subtraction.days > 0:
                result.append(
                    {
                        "id": cert["CertificateArn"],
                        "name": cert.get("DomainName", "-"),
                    }
                )
        return result


class VPC(Resource):
    def __init__(self, account_id=default_account_id, region=default_region):
        super().__init__(account_id, region)

        svc_mgr = SvcManager()
        self._ec2 = svc_mgr.get_client(
            sub_account_id=account_id,
            region=region,
            service_name="ec2",
            type=Boto3API.CLIENT,
        )
        self._s3 = svc_mgr.get_client(
            sub_account_id=account_id, service_name="s3", type=Boto3API.CLIENT
        )

        self._iam_client = svc_mgr.get_client(
            sub_account_id=account_id,
            region=region,
            service_name="iam",
            type=Boto3API.CLIENT,
        )

        self._cwl = svc_mgr.get_client(
            sub_account_id=account_id,
            region=region,
            service_name="logs",
            type=Boto3API.CLIENT,
        )

        link_acct = svc_mgr.get_link_account(account_id, region)
        if link_acct:
            self._default_logging_bucket = link_acct["subAccountBucketName"]
        else:
            self._default_logging_bucket = default_logging_bucket

        self._default_prefix = (
            f"/AWSLogs/{self._account_id}/vpcflowlogs/{self._region}/"
        )

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

    def get_resource_log_config(self, vpc_id):
        """returned the logging bucket for the resource

        The resource_name could be a name or an ID.
        """
        log_confs = []

        # Get VPC Flow Logs details
        try:
            response = self._ec2.describe_flow_logs(
                Filters=[
                    {
                        "Name": "resource-id",
                        "Values": [
                            vpc_id,
                        ],
                    },
                    {
                        "Name": "deliver-log-status",
                        "Values": [
                            "SUCCESS",
                        ],
                    },
                ]
            )
            for flow in response["FlowLogs"]:
                dest_type = flow["LogDestinationType"]
                if dest_type not in ["s3", "cloud-watch-logs"]:
                    logger.info(
                        f"Destination type {dest_type} are not supported and ignored"
                    )
                    continue

                # Get flow log name from Tags
                name = get_name_from_tags(flow.get("Tags", []))

                formatted_name = f'{flow["FlowLogId"]} ({name})'

                # Use comma delimited log format
                log_format = (
                    flow["LogFormat"]
                    .replace("${", "")
                    .replace("}", "")
                    .replace(" ", ",")
                )

                if dest_type == "s3":
                    dest_name = (
                        flow["LogDestination"]
                        .replace(f"arn:{self._partition}:s3:::", "s3://")
                        .rstrip("/")
                        + self._default_prefix
                    )

                    bucket_name = dest_name[5:].split("/", 1)[0]
                    bucket_loc = get_bucket_location(self._s3, bucket_name)

                    log_confs.append(
                        {
                            "destinationType": "S3",
                            "destinationName": dest_name,
                            "logFormat": log_format,
                            "name": formatted_name,
                            "region": bucket_loc,
                        }
                    )
                else:
                    # dest_type == "cloud-watch-logs":
                    log_confs.append(
                        {
                            "destinationType": "CloudWatch",
                            "destinationName": flow["LogGroupName"],
                            "logFormat": log_format,
                            "name": formatted_name,
                            "region": self._region,
                        }
                    )

        except Exception as e:
            logger.error(e)

        return log_confs

    def put_resource_log_config(self, vpc_id, dest_type, dest_name, log_format):
        """Add Flow Logs configurations to VPC"""
        # Log format is not used by VPC Flow Logs.

        default_log_format = (
            "version,account-id,interface-id,srcaddr,dstaddr,srcport,"
            "dstport,protocol,packets,bytes,start,end,action,log-status"
        )
        if dest_type == "S3":
            # If destination name is empty,
            # Use default logging bucket
            dest = dest_name if dest_name else f"s3://{self._default_logging_bucket}"
            default_name = f"{stack_prefix}-flowlogs-s3"
            resp = self._ec2.create_flow_logs(
                ResourceIds=[vpc_id],
                ResourceType="VPC",
                TrafficType="ALL",
                LogDestinationType="s3",
                LogDestination=dest.replace("s3://", f"arn:{self._partition}:s3:::"),
                TagSpecifications=[
                    {
                        "ResourceType": "vpc-flow-log",
                        "Tags": [
                            {
                                "Key": "Name",
                                "Value": default_name,
                            },
                        ],
                    },
                ],
            )
            if resp.get("Unsuccessful", []):
                logger.error(resp["Unsuccessful"])
                raise RuntimeError(resp["Unsuccessful"][0]["Error"]["Message"])
            else:

                return {
                    "destinationType": "S3",
                    "destinationName": dest.rstrip("/") + self._default_prefix,
                    "logFormat": default_log_format,
                    "name": default_name,
                    "region": self._region,
                }
        elif dest_type == "CloudWatch":

            log_group_name = dest_name
            log_group_arn = self._create_log_group(log_group_name)

            # create role with random name
            suffix = str(uuid.uuid4())[:8]
            role_name = f"{stack_prefix}-VPCFlowRoleForCWL-{suffix}"
            role_arn = self._create_iam_role(role_name, log_group_arn)

            default_name = f"{stack_prefix}-flowlogs-cwl"

            # The role can't be used immediately after created.
            # There is a delay of using the role
            resp = retry(func=self._ec2.create_flow_logs)(
                ResourceIds=[vpc_id],
                ResourceType="VPC",
                TrafficType="ALL",
                LogDestinationType="cloud-watch-logs",
                DeliverLogsPermissionArn=role_arn,
                LogGroupName=log_group_name,
                TagSpecifications=[
                    {
                        "ResourceType": "vpc-flow-log",
                        "Tags": [
                            {
                                "Key": "Name",
                                "Value": default_name,
                            },
                        ],
                    },
                ],
            )
            if resp.get("Unsuccessful", []):
                logger.error(resp["Unsuccessful"])
                raise RuntimeError(resp["Unsuccessful"][0]["Error"]["Message"])
            else:
                return {
                    "destinationType": "CloudWatch",
                    "destinationName": log_group_name,
                    "logFormat": default_log_format,
                    "name": default_name,
                    "region": self._region,
                }

        else:
            raise RuntimeError(
                f"Unsupported destination type {dest_type} for VPC Flow Logs"
            )

    def _create_log_group(self, log_group_name):
        try:
            self._cwl.create_log_group(logGroupName=log_group_name)
        except self._cwl.exceptions.ResourceAlreadyExistsException:
            logger.info("Log Group already exists, do nothing.")
        except Exception as e2:
            logger.error(e2)
            raise RuntimeError("Unable to create log group")

        return f"arn:{self._partition}:logs:{self._region}:{self._account_id}:log-group:{log_group_name}:*"

    def _create_iam_role(self, role_name, log_group_arn):
        try:
            principal = "vpc-flow-logs.amazonaws.com"
            role = create_service_role(self._iam_client, role_name, principal)
            self._iam_client.put_role_policy(
                RoleName=role_name,
                PolicyName=role_name + "-policy",
                PolicyDocument=default_logging_policy(log_group_arn),
            )

        except Exception as e:
            logger.error(e)
            raise RuntimeError(
                "Unable to create role for CloudTrail to access CloudWatch Logs"
            )
        return role["Role"]["Arn"]


class Subnet(Resource):
    def __init__(self, account_id=default_account_id, region=default_region):
        super().__init__(account_id, region)

        svc_mgr = SvcManager()
        self._ec2 = svc_mgr.get_client(
            sub_account_id=account_id,
            region=region,
            service_name="ec2",
            type=Boto3API.CLIENT,
        )

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
    def __init__(self, account_id=default_account_id, region=default_region):
        super().__init__(account_id, region)

        svc_mgr = SvcManager()
        self._ec2 = svc_mgr.get_client(
            sub_account_id=account_id,
            region=region,
            service_name="ec2",
            type=Boto3API.CLIENT,
        )

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
    def __init__(self, account_id=default_account_id, region=default_region):
        super().__init__(account_id, region)

        svc_mgr = SvcManager()
        self._cloudtrail = svc_mgr.get_client(
            sub_account_id=account_id,
            region=region,
            service_name="cloudtrail",
            type=Boto3API.CLIENT,
        )
        self._s3 = svc_mgr.get_client(
            sub_account_id=account_id, service_name="s3", type=Boto3API.CLIENT
        )

        self._iam_client = svc_mgr.get_client(
            sub_account_id=account_id,
            region=region,
            service_name="iam",
            type=Boto3API.CLIENT,
        )

        self._cwl = svc_mgr.get_client(
            sub_account_id=account_id,
            region=region,
            service_name="logs",
            type=Boto3API.CLIENT,
        )

    def list(self, parent_id=""):
        result = []

        # Ignore paging, assume maximum of 1000 results
        response = self._cloudtrail.list_trails()

        for trail in response["Trails"]:
            # Check home region, only current region will be included.
            home_region = trail["HomeRegion"]
            if home_region == self._region:
                result.append(
                    {
                        "id": trail["TrailARN"],
                        "name": trail["Name"],
                        "description": f"{trail['Name']} ({trail['HomeRegion']})",
                    }
                )

        return result

    def get_resource_log_config(self, trail_name):
        """returned the logging bucket for the resource

        The resource_name could be a name or an ID.
        """
        log_confs = []

        try:
            response = self._cloudtrail.get_trail(Name=trail_name)

            trail = response["Trail"]
            bucket = trail["S3BucketName"]
            prefix = ""
            if "S3KeyPrefix" in trail and trail["S3KeyPrefix"]:
                prefix = trail["S3KeyPrefix"] + "/"

            bucket_loc = get_bucket_location(self._s3, bucket)

            log_confs.append(
                {
                    "destinationType": "S3",
                    "destinationName": f"s3://{bucket}/{prefix}",
                    "logFormat": "",
                    "name": "S3",
                    "region": bucket_loc,
                }
            )

            log_group_arn = trail.get("CloudWatchLogsLogGroupArn", "")
            if log_group_arn:
                log_group_name = log_group_arn[log_group_arn[:-2].rindex(":") + 1 : -2]
                log_confs.append(
                    {
                        "destinationType": "CloudWatch",
                        "destinationName": log_group_name,
                        "logFormat": "",
                        "name": "CloudWatch",
                        "region": self._region,
                    }
                )

        except Exception as e:
            logger.error(e)
            raise RuntimeError("Unable to detect the logging bucket for this trail")

        return log_confs

    def put_resource_log_config(self, trail_name, dest_type, dest_name, log_format):
        """returned the logging bucket for the resource

        The resource_name could be a name or an ID.
        """
        if dest_type != "CloudWatch":
            raise RuntimeError(
                f"Unsupported destination type {dest_type} for CloudTrail Logs"
            )

        log_group_name = dest_name
        log_group_arn = self._create_log_group(log_group_name)

        # create role with random name
        suffix = str(uuid.uuid4())[:8]
        role_name = f"{stack_prefix}-CloudTrailRoleForCWL-{suffix}"
        role_arn = self._create_iam_role(role_name, log_group_arn)

        # The role can't be used immediately after created.
        # There is a delay of using the role
        resp = retry(func=self._cloudtrail.update_trail)(
            Name=trail_name,
            CloudWatchLogsLogGroupArn=log_group_arn,
            CloudWatchLogsRoleArn=role_arn,
        )
        if "CloudWatchLogsLogGroupArn" in resp:
            return {
                "destinationType": "CloudWatch",
                "destinationName": log_group_name,
                "logFormat": "",
                "name": "CloudWatch",
                "region": self._region,
            }
        else:
            raise RuntimeError("Unable to enable the CloudWatch logging for this trail")

    def _create_log_group(self, log_group_name):
        try:
            self._cwl.create_log_group(logGroupName=log_group_name)
        except self._cwl.exceptions.ResourceAlreadyExistsException:
            logger.info("Log Group already exists, do nothing.")
        except Exception as e2:
            logger.error(e2)
            raise RuntimeError("Unable to create log group")

        return f"arn:{self._partition}:logs:{self._region}:{self._account_id}:log-group:{log_group_name}:*"

    def _create_iam_role(self, role_name, log_group_arn):
        try:
            principal = "cloudtrail.amazonaws.com"
            resp = create_service_role(self._iam_client, role_name, principal)

            self._iam_client.put_role_policy(
                RoleName=role_name,
                PolicyName=role_name + "-policy",
                PolicyDocument=default_logging_policy(log_group_arn),
            )

        except Exception as e:
            logger.error(e)
            raise RuntimeError(
                "Unable to create role for CloudTrail to access CloudWatch Logs"
            )
        return resp["Role"]["Arn"]


class Config(Resource):
    def __init__(self, account_id=default_account_id, region=default_region):
        super().__init__(account_id, region)

        svc_mgr = SvcManager()
        self._config = svc_mgr.get_client(
            sub_account_id=account_id,
            region=region,
            service_name="config",
            type=Boto3API.CLIENT,
        )
        self._s3 = svc_mgr.get_client(
            sub_account_id=account_id, service_name="s3", type=Boto3API.CLIENT
        )

    def get_logging_bucket(self, resource_name):
        try:
            response = self._config.describe_delivery_channels()
            if "DeliveryChannels" in response and response["DeliveryChannels"]:
                channel = response["DeliveryChannels"][0]
                bucket = channel["s3BucketName"]
                prefix = ""
                if "s3KeyPrefix" in channel and channel["s3KeyPrefix"]:
                    prefix = channel["s3KeyPrefix"] + "/"

                bucket_loc = get_bucket_location(self._s3, bucket)
                if bucket_loc == self._region:
                    return {
                        "enabled": True,
                        "bucket": bucket,
                        "prefix": prefix
                        + f"AWSLogs/{self._account_id}/Config/{self._region}",
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


class KeyPair(Resource):
    def __init__(self, account_id=default_account_id, region=default_region):
        super().__init__(account_id, region)

        svc_mgr = SvcManager()
        self._ec2 = svc_mgr.get_client(
            sub_account_id=account_id,
            region=region,
            service_name="ec2",
            type=Boto3API.CLIENT,
        )

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

    def __init__(self, account_id=default_account_id, region=default_region):
        super().__init__(account_id, region)

        svc_mgr = SvcManager()
        self._cf = svc_mgr.get_client(
            sub_account_id=account_id,
            region=region,
            service_name="cloudfront",
            type=Boto3API.CLIENT,
        )
        self._s3 = svc_mgr.get_client(
            sub_account_id=account_id, service_name="s3", type=Boto3API.CLIENT
        )
        link_acct = svc_mgr.get_link_account(account_id, region)
        if link_acct:
            self._default_logging_bucket = link_acct["subAccountBucketName"]
        else:
            self._default_logging_bucket = default_logging_bucket

    def list(self, parent_id=""):
        result = []
        response = self._cf.list_distributions(MaxItems="1000")

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
        return f"AWSLogs/{self._account_id}/CloudFront/{distribution_id}/"

    def get_resource_log_config(self, resource_name):
        """returned the logging bucket for the resource

        The resource_name could be a name or an ID.
        """
        log_confs = []
        rt_data = self._get_rt_log_conf(distribution_id=resource_name)
        if rt_data:
            log_confs.append(rt_data)
        s3_data = self._get_logging_bucket(distribution_id=resource_name)
        if s3_data:
            log_confs.append(s3_data)
        return log_confs

    def _get_rt_log_conf(self, distribution_id):
        try:
            # Check the real time log from distribution
            resp = self._cf.get_distribution_config(Id=distribution_id)
            default_cache = resp["DistributionConfig"]["DefaultCacheBehavior"]
            rt_cfg_arn = default_cache.get("RealtimeLogConfigArn", "")
            if rt_cfg_arn:
                resp = self._cf.get_realtime_log_config(ARN=rt_cfg_arn)

                endpoints = resp["RealtimeLogConfig"]["EndPoints"]
                kds_name = ""
                for endpoint in endpoints:
                    if endpoint["StreamType"] == "Kinesis":
                        kds_arn = endpoint["KinesisStreamConfig"]["StreamARN"]
                        kds_name = kds_arn.split(":stream/")[1]
                        break
                return {
                    "destinationType": "KDS",
                    "destinationName": kds_name,
                    "logFormat": "",
                    "name": "Realtime-Logs",
                    "region": default_region,
                }
            else:
                return {}
        except ClientError as e:
            if e.response["Error"]["Code"] != "NoSuchRealtimeLogConfig":
                logger.error(e)
                raise e
        return {}

    def _get_logging_bucket(self, distribution_id):
        try:
            response = self._cf.get_distribution_config(Id=distribution_id)
            log_info = response["DistributionConfig"]["Logging"]
            if log_info["Enabled"]:
                bucket = re.sub(
                    ".s3(.[a-z]{2}-[a-z]{4,20}-\\d)?.amazonaws.com(.cn)?$",
                    "",
                    log_info["Bucket"],
                    1,
                )
                bucket_loc = get_bucket_location(self._s3, bucket)
                return {
                    "destinationType": "S3",
                    "destinationName": f's3://{bucket}/{log_info["Prefix"]}',
                    "logFormat": "",
                    "name": "Standard-Logs",
                    "region": bucket_loc,
                }

        except Exception as e:
            logger.error(e)
        return {}


class Lambda(Resource):
    def __init__(self, account_id=default_account_id, region=default_region):
        super().__init__(account_id, region)

        svc_mgr = SvcManager()
        self._client = svc_mgr.get_client(
            sub_account_id=account_id,
            region=region,
            service_name="lambda",
            type=Boto3API.CLIENT,
        )
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

    def _default_prefix(self, id):
        return f"AWSLogs/{self._account_id}/Lambda/{self._region}/{id}/"

    def get_logging_bucket(self, function_name):
        return {
            "enabled": True,
            "bucket": self._default_logging_bucket,
            "prefix": self._default_prefix(function_name),
        }


class RDS(Resource):
    def __init__(self, account_id=default_account_id, region=default_region):
        super().__init__(account_id, region)

        svc_mgr = SvcManager()
        self._client = svc_mgr.get_client(
            sub_account_id=account_id,
            region=region,
            service_name="rds",
            type=Boto3API.CLIENT,
        )

        self._default_logging_bucket = default_logging_bucket

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
    def __init__(self, account_id=default_account_id, region=default_region):
        super().__init__(account_id, region)

        svc_mgr = SvcManager()
        self._client = svc_mgr.get_client(
            sub_account_id=account_id,
            region=region,
            service_name="elbv2",
            type=Boto3API.CLIENT,
        )
        link_acct = svc_mgr.get_link_account(account_id, region)
        if link_acct:
            self._default_logging_bucket = link_acct["subAccountBucketName"]
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
        return f"AWSLogs/{self._account_id}/elasticloadbalancing/{self._region}"

    def get_logging_bucket(self, load_balancer_arn):
        default_prefix = self._default_prefix()
        try:
            resp_attributes = self._client.describe_load_balancer_attributes(
                LoadBalancerArn=load_balancer_arn
            )["Attributes"]
            log_enabled = False
            logging_bucket, logging_prefix = "", ""
            for item in resp_attributes:
                if item["Key"] == "access_logs.s3.enabled":
                    log_enabled = item["Value"]
                if item["Key"] == "access_logs.s3.bucket":
                    logging_bucket = item["Value"]
                if item["Key"] == "access_logs.s3.prefix":
                    logging_prefix = item["Value"]
            if log_enabled == "true":
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
            raise RuntimeError(UNABLE_TO_ENABLE_LOGGING_ERROR)


class WAF(Resource):
    def __init__(self, account_id=default_account_id, region=default_region):
        super().__init__(account_id, region)

        svc_mgr = SvcManager()
        self._client = svc_mgr.get_client(
            sub_account_id=account_id,
            region=region,
            service_name="wafv2",
            type=Boto3API.CLIENT,
        )

        self._cf_client = svc_mgr.get_client(
            sub_account_id=account_id,
            region="us-east-1",
            service_name="wafv2",
            type=Boto3API.CLIENT,
        )

        self._s3_client = svc_mgr.get_client(
            sub_account_id=account_id,
            region=region,
            service_name="s3",
            type=Boto3API.CLIENT,
        )

        self._iam_client = svc_mgr.get_client(
            sub_account_id=account_id,
            region=region,
            service_name="iam",
            type=Boto3API.CLIENT,
        )

        self._firehose_client = svc_mgr.get_client(
            sub_account_id=account_id,
            region=region,
            service_name="firehose",
            type=Boto3API.CLIENT,
        )

        self._firehose_us_east_1_client = svc_mgr.get_client(
            sub_account_id=account_id,
            region="us-east-1",
            service_name="firehose",
            type=Boto3API.CLIENT,
        )

        link_acct = svc_mgr.get_link_account(account_id, region)
        if link_acct:
            self._default_logging_bucket = link_acct["subAccountBucketName"]
        else:
            self._default_logging_bucket = default_logging_bucket

    def _wafv2(self, is_global=True):
        if is_global:
            logging.info("using global(us-east-1) wafv2 client")
            return self._cf_client
        else:
            logging.info(f"using regional({self._region}) wafv2 client")
            return self._client

    def _firehose(self, is_global=True):
        if is_global:
            logging.info("using global(us-east-1) firehose client")
            return self._firehose_us_east_1_client
        else:
            logging.info(f"using regional({self._region}) firehose client")
            return self._firehose_client

    def create_s3_delivery_stream(
        self, bucket_arn, s3_prefix, delivery_stream_name, firehose_client=None
    ):

        role_name = f"{stack_prefix}-RoleForKDF-{delivery_stream_name}"[:64]

        if not firehose_client:
            firehose_client = self._firehose_client

        logging.info(
            "create_s3_delivery_stream bucket_arn=%s s3_prefix=%s delivery_stream=%s firehose_client=%s",
            bucket_arn,
            s3_prefix,
            delivery_stream_name,
            firehose_client,
        )

        role_arn = self._create_firehose_role(role_name, bucket_arn)

        ds = retry(func=firehose_client.create_delivery_stream)(
            DeliveryStreamName=delivery_stream_name,
            DeliveryStreamType="DirectPut",
            ExtendedS3DestinationConfiguration=dict(
                RoleARN=role_arn,
                BucketARN=bucket_arn,
                Prefix=s3_prefix,
                CompressionFormat="GZIP",
                ErrorOutputPrefix=f"{s3_prefix}error",
                CloudWatchLoggingOptions=dict(Enabled=False),
            ),
        )

        return ds["DeliveryStreamARN"]

    def _create_firehose_role(self, role_name, bucket_arn):
        try:
            role = self._iam_client.get_role(RoleName=role_name)

            logging.info("role: %s already exists", role_name)
        except self._iam_client.exceptions.NoSuchEntityException:
            logging.info("role: %s not found, try creating a new one", role_name)

            role = self._iam_client.create_role(
                RoleName=role_name,
                Path="/service-role/",
                AssumeRolePolicyDocument=json.dumps(
                    {
                        "Version": "2012-10-17",
                        "Statement": [
                            {
                                "Effect": "Allow",
                                "Principal": {"Service": "firehose.amazonaws.com"},
                                "Action": "sts:AssumeRole",
                            }
                        ],
                    }
                ),
            )
        policy_name = f"{role_name}-policy"[:64]
        log_group_arn = f"arn:{self._partition}:logs:{self._region}:{self._account_id}:log-group:/aws/kinesisfirehose/*"
        self._iam_client.put_role_policy(
            RoleName=role_name,
            PolicyName=policy_name,
            PolicyDocument=json.dumps(
                {
                    "Version": "2012-10-17",
                    "Statement": [
                        {
                            "Sid": "",
                            "Effect": "Allow",
                            "Action": [
                                "s3:AbortMultipartUpload",
                                "s3:GetBucketLocation",
                                "s3:GetObject",
                                "s3:ListBucket",
                                "s3:ListBucketMultipartUploads",
                                "s3:PutObject",
                            ],
                            "Resource": [f"{bucket_arn}", f"{bucket_arn}/*"],
                        },
                        {
                            "Sid": "",
                            "Effect": "Allow",
                            "Action": ["logs:PutLogEvents"],
                            "Resource": [
                                log_group_arn,
                            ],
                        },
                    ],
                }
            ),
        )

        role_arn = role["Role"]["Arn"]
        return role_arn

    def _get_waf_acl(self, scope):
        if scope == "CLOUDFRONT":
            if self._partition == "aws":
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
                result.append(
                    {
                        "id": acl["ARN"],
                        "name": acl["Name"],
                        "description": scope,
                    }
                )

            if "NextMarker" in resp:
                if resp["NextMarker"] == "Not Implemented":
                    break
                next_marker = resp["NextMarker"]
            else:
                break
        return result

    def _parse_web_acl_name(self, acl_arn):
        end_pos = acl_arn.rfind("/") - 1
        start_pos = acl_arn.rfind("/", 0, end_pos)
        web_acl_name = acl_arn[start_pos + 1 : end_pos + 1]
        return web_acl_name

    def _generate_default_prefix(self, acl_arn, scope):
        web_acl_name = self._parse_web_acl_name(acl_arn)
        if scope == "CLOUDFRONT":
            default_prefix = (
                f"AWSLogs/{self._account_id}/WAFLogs/cloudfront/{web_acl_name}/"
            )
        else:
            default_prefix = (
                f"AWSLogs/{self._account_id}/WAFLogs/{self._region}/{web_acl_name}/"
            )
        return default_prefix

    def _get_logging_bucket(self, acl_arn, scope):

        default_prefix = self._generate_default_prefix(acl_arn, scope)
        is_global = scope == "CLOUDFRONT" and self._partition == "aws"

        try:
            wafv2 = self._wafv2(is_global=is_global)
            resp = wafv2.get_logging_configuration(ResourceArn=acl_arn)
            log_dest_arn = resp["LoggingConfiguration"]["LogDestinationConfigs"][0]

            if is_arn(s=log_dest_arn, svc="s3"):
                # Determine if the target is S3
                logging_bucket = log_dest_arn[log_dest_arn.rindex(":") + 1 :]

                return {
                    "enabled": True,
                    "bucket": logging_bucket,
                    "prefix": default_prefix,
                    "source": "WAF",
                }

            elif is_arn(s=log_dest_arn, svc="firehose"):
                delivery_stream_name = log_dest_arn.split("/")[-1]

                firehose = self._firehose(is_global=is_global)
                ds = firehose.describe_delivery_stream(
                    DeliveryStreamName=delivery_stream_name,
                    Limit=1,
                )
                s3_dest_desc = ds["DeliveryStreamDescription"]["Destinations"][0][
                    "ExtendedS3DestinationDescription"
                ]
                bucket_arn = s3_dest_desc["BucketARN"]
                bucker_name = bucket_arn[bucket_arn.rindex(":") + 1 :]
                prefix = s3_dest_desc["Prefix"]
                return {
                    "enabled": True,
                    "bucket": bucker_name,
                    "prefix": prefix,
                    "source": "KinesisDataFirehoseForWAF",
                }

        except Exception as e:
            logger.error(e, exc_info=True)
            logger.info(f"{acl_arn} doesn't have logging Enabled.")

        return {
            "enabled": False,
            "bucket": self._default_logging_bucket,
            "prefix": default_prefix,
        }

    def put_logging_bucket(self, acl_arn):
        resp = self.get_logging_bucket(acl_arn)
        if resp["enabled"]:
            return resp

        bucket_name = resp["bucket"]
        default_prefix = resp["prefix"]

        bucket_arn = f"arn:{self._partition}:s3:::{bucket_name}"
        try:
            suffix = str(uuid.uuid4())[:8]
            is_global = ":global/" in acl_arn and self._partition == "aws"
            delivery_stream_name = f"aws-waf-logs-{stack_prefix}-s3-{suffix}"
            firehose = self._firehose(is_global=is_global)
            wafv2 = self._wafv2(is_global=is_global)

            delivery_stream_arn = self.create_s3_delivery_stream(
                bucket_arn=bucket_arn,
                s3_prefix=default_prefix,
                delivery_stream_name=delivery_stream_name,
                firehose_client=firehose,
            )

            wafv2.put_logging_configuration(
                LoggingConfiguration={
                    "ResourceArn": acl_arn,
                    "LogDestinationConfigs": [delivery_stream_arn],
                }
            )
            return {
                "enabled": True,
                "bucket": bucket_name,
                "prefix": default_prefix,
                "source": "KinesisDataFirehoseForWAF",
            }
        except Exception as e:
            logger.error(e, exc_info=True)
            raise RuntimeError(UNABLE_TO_ENABLE_LOGGING_ERROR)

    def list(self, parent_id=""):
        acls = self._get_waf_acl("CLOUDFRONT") + self._get_waf_acl("REGIONAL")
        return acls

    def get_logging_bucket(self, acl_arn):
        if ":regional/" in acl_arn:
            result = self._get_logging_bucket(acl_arn, "REGIONAL")
        else:
            result = self._get_logging_bucket(acl_arn, "CLOUDFRONT")
        return result


def get_partition(region_name):
    if region_name in ["cn-north-1", "cn-northwest-1"]:
        return "aws-cn"
    else:
        return "aws"


def create_service_role(iam_client, role_name, principal):
    role = iam_client.create_role(
        RoleName=role_name,
        Path="/service-role/",
        AssumeRolePolicyDocument=json.dumps(
            {
                "Version": "2012-10-17",
                "Statement": [
                    {
                        "Effect": "Allow",
                        "Principal": {"Service": principal},
                        "Action": "sts:AssumeRole",
                    }
                ],
            }
        ),
    )
    return role


def default_logging_policy(log_group_arn):
    return json.dumps(
        {
            "Version": "2012-10-17",
            "Statement": [
                {
                    "Effect": "Allow",
                    "Action": [
                        "logs:CreateLogStream",
                        "logs:PutLogEvents",
                        "logs:DescribeLogGroups",
                        "logs:DescribeLogStreams",
                    ],
                    "Resource": [
                        log_group_arn,
                    ],
                },
            ],
        }
    )


def get_bucket_location(s3_client, bucket_name):
    resp = s3_client.get_bucket_location(
        Bucket=bucket_name,
    )
    loc = resp["LocationConstraint"]
    # For us-east-1, the location is None
    return "us-east-1" if loc is None else loc


def get_name_from_tags(tags):
    for tag in tags:
        if tag["Key"] == "Name":
            return tag["Value"]
    return "-"
