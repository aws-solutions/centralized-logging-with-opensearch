# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import os
import pytest
from boto3.dynamodb.conditions import Attr
from test.mock import mock_s3_context, mock_sqs_context, mock_iam_context, mock_ddb_context, mock_sts_context, default_environment_variables


class TestAWSConnection:

    def test_get_client(self, mock_iam_context, mock_sqs_context, mock_ddb_context, mock_s3_context, mock_sts_context):
        from utils.aws.commonlib import AWSConnection
        
        region = os.environ["AWS_REGION"]
        staging_bucket = os.environ["STAGING_BUCKET_NAME"]
        s3_object_replication_role_arn = os.environ["S3_OBJECTS_REPLICATION_ROLE_ARN"]
        
        conn =  AWSConnection()
        
        # should be able to use the get_client same as boto3.client()
        s3 = conn.get_client("s3")
        response = s3.list_buckets()

        buckets = response["Buckets"]
        assert len(buckets) == 3

        # should be able to use the get_client same as boto3.resource()
        s3_resource = conn.get_client("s3", client_type="resource")
        bucket = s3_resource.Bucket(staging_bucket)
        assert bucket.creation_date
        
        # should be able to use the get_client same as boto3.resource()
        s3_resource = conn.get_client("s3", region_name=region, client_type="resource")
        bucket = s3_resource.Bucket(staging_bucket)
        assert bucket.creation_date
        
        s3_resource = conn.get_client("s3", region_name=region, sts_role_arn=s3_object_replication_role_arn, client_type="resource")
        bucket = s3_resource.Bucket(staging_bucket)
        assert bucket.creation_date
    
    def test_get_partition_from_region(self, mock_iam_context, mock_sqs_context, mock_ddb_context, mock_s3_context):
        from utils.aws.commonlib import AWSConnection
        
        region = os.environ["AWS_REGION"]
        conn =  AWSConnection()
        
        response = conn.get_partition_from_region(region_name=region)
        assert response == 'aws'
        
        response = conn.get_partition_from_region(region_name='cn-north-1')
        assert response == 'aws-cn'
    
    def test_get_available_services(self, mock_iam_context, mock_sqs_context, mock_ddb_context, mock_s3_context):
        from utils.aws.commonlib import AWSConnection
        
        conn =  AWSConnection()
        
        response = conn.get_available_services()
        assert len(response) > 0
        

def test_exception(mock_s3_context, mock_iam_context, mock_sqs_context, mock_ddb_context):
    from utils.aws.commonlib import APIException, ErrorCode
    def func():
        raise APIException(ErrorCode.ACCOUNT_NOT_FOUND)

    with pytest.raises(APIException, match="Account is not found") as excinfo:
        func()

    e = excinfo.value
    assert e.message == "Account is not found"
    assert e.type == "ACCOUNT_NOT_FOUND"
    assert str(e) == "[ACCOUNT_NOT_FOUND] Account is not found"