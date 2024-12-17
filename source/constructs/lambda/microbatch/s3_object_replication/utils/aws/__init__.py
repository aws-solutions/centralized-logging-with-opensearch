# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

from .athena import AthenaClient
from .dynamodb import DynamoDBUtil
from .glue import GlueClient
from .iam import IAMClient
from .s3 import S3Client
from .scheduler import SchedulerClient
from .ses import SESClient
from .sns import SNSClient
from .sqs import SQSClient
from .stepfunction import SFNClient
from .events import EventsClient
from .rds import RDSClient
from .lambda_function import LambdaClient
from .wafv2 import WAFV2Client


__all__ = [
    "AthenaClient",
    "DynamoDBUtil",
    "GlueClient",
    "IAMClient",
    "S3Client",
    "SchedulerClient",
    "SESClient",
    "SNSClient",
    "SQSClient",
    "SFNClient",
    "EventsClient",
    "RDSClient",
    "LambdaClient",
    "WAFV2Client",
]
