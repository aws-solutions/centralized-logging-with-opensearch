# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

from utils.aws import S3Client, AthenaClient, SFNClient, GlueClient, LambdaClient
from utils.models.etllog import ETLLogTable
from utils.models.meta import MetaTable


AWS_DDB_META = MetaTable()
AWS_DDB_ETL_LOG = ETLLogTable()
AWS_S3 = S3Client()
AWS_GLUE = GlueClient()
AWS_ATHENA = AthenaClient()
AWS_SFN = SFNClient()
AWS_LAMBDA = LambdaClient()
