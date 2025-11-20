# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import pytest
import os
import boto3
from moto import mock_logs
from moto import mock_dynamodb
from commonlib import APIException

svc_pipeline_info_1 = {
    "id": "ee776174-5492-4d36-97b7-589845388012",
    "createdAt": "2023-04-03T09:02:36Z",
    "destinationType": "S3",
    "error": "",
    "helperLogGroupName": "/aws/lambda/CL-pipe-ee776174-OpenSearchHelperFn-CQZg6RqIGSIc",
    "parameters": [
        {"parameterKey": "engineType", "parameterValue": "OpenSearch"},
        {
            "parameterKey": "logBucketName",
            "parameterValue": "amzn-s3-demo-logging-bucket",
        },
        {
            "parameterKey": "logBucketPrefix",
            "parameterValue": "AWSLogs/111111111111/WAFLogs/us-west-2/solution-dev-us-west-2-01/",
        },
        {
            "parameterKey": "endpoint",
            "parameterValue": "vpc-solution-os-yhb4z4uzd544pna27wlqqumk2y.us-west-2.es.amazonaws.com",
        },
        {"parameterKey": "domainName", "parameterValue": "solution-os"},
        {"parameterKey": "indexPrefix", "parameterValue": "solution-dev-us-west-2-01"},
        {"parameterKey": "createDashboard", "parameterValue": "Yes"},
        {"parameterKey": "vpcId", "parameterValue": "vpc-0737368a3ba456453"},
        {
            "parameterKey": "subnetIds",
            "parameterValue": "subnet-0b99add032f87385b,subnet-0194f25ad3526e8b5",
        },
        {"parameterKey": "securityGroupId", "parameterValue": "sg-0a8deb49daed73ecf"},
        {"parameterKey": "shardNumbers", "parameterValue": "1"},
        {"parameterKey": "replicaNumbers", "parameterValue": "1"},
        {"parameterKey": "warmAge", "parameterValue": ""},
        {"parameterKey": "coldAge", "parameterValue": ""},
        {"parameterKey": "retainAge", "parameterValue": "3d"},
        {"parameterKey": "rolloverSize", "parameterValue": "30gb"},
        {"parameterKey": "indexSuffix", "parameterValue": "yyyy-MM-dd"},
        {"parameterKey": "codec", "parameterValue": "best_compression"},
        {"parameterKey": "refreshInterval", "parameterValue": "1s"},
        {
            "parameterKey": "backupBucketName",
            "parameterValue": "amzn-s3-demo-logging-bucket",
        },
        {
            "parameterKey": "defaultCmkArnParam",
            "parameterValue": "arn:aws:kms:us-west-2:111111111111:key/dbf10ef9-adc5-45fe-90b7-c7cda74130c9",
        },
        {"parameterKey": "logSourceAccountId", "parameterValue": "111111111111"},
        {"parameterKey": "logSourceRegion", "parameterValue": "us-west-2"},
        {"parameterKey": "logSourceAccountAssumeRole", "parameterValue": ""},
    ],
    "processorLogGroupName": "/aws/lambda/CL-pipe-ee776174-LogProcessorFn",
    "source": "solution-dev-us-west-2-01",
    "stackId": "arn:aws:cloudformation:us-west-2:111111111111:stack/CL-pipe-ee776174/47d47e00-d1fe-11ed-87a3-0274021fa06b",
    "stackName": "CL-pipe-ee776174",
    "status": "ACTIVE",
    "tags": [],
    "target": "solution-os",
    "type": "WAF",
}

# OSI pipeline as log processor
svc_pipeline_info_2 = {
    "id": "ee776174-5492-4d36-97b7-589845388002",
    "createdAt": "2023-04-03T09:02:36Z",
    "destinationType": "S3",
    "error": "",
    "helperLogGroupName": "/aws/lambda/CL-pipe-ee776174-OpenSearchHelperFn-CQZg6RqIGSIc",
    "parameters": [
        {"parameterKey": "engineType", "parameterValue": "OpenSearch"},
        {
            "parameterKey": "logBucketName",
            "parameterValue": "amzn-s3-demo-logging-bucket",
        },
        {
            "parameterKey": "logBucketPrefix",
            "parameterValue": "AWSLogs/111111111111/WAFLogs/us-west-2/solution-dev-us-west-2-01/",
        },
        {
            "parameterKey": "endpoint",
            "parameterValue": "vpc-solution-os-yhb4z4uzd544pna27wlqqumk2y.us-west-2.es.amazonaws.com",
        },
        {"parameterKey": "domainName", "parameterValue": "solution-os"},
        {"parameterKey": "indexPrefix", "parameterValue": "solution-dev-us-west-2-01"},
        {"parameterKey": "createDashboard", "parameterValue": "Yes"},
        {"parameterKey": "vpcId", "parameterValue": "vpc-0737368a3ba456453"},
        {
            "parameterKey": "subnetIds",
            "parameterValue": "subnet-0b99add032f87385b,subnet-0194f25ad3526e8b5",
        },
        {"parameterKey": "securityGroupId", "parameterValue": "sg-0a8deb49daed73ecf"},
        {"parameterKey": "shardNumbers", "parameterValue": "1"},
        {"parameterKey": "replicaNumbers", "parameterValue": "1"},
        {"parameterKey": "warmAge", "parameterValue": ""},
        {"parameterKey": "coldAge", "parameterValue": ""},
        {"parameterKey": "retainAge", "parameterValue": "3d"},
        {"parameterKey": "rolloverSize", "parameterValue": "30gb"},
        {"parameterKey": "indexSuffix", "parameterValue": "yyyy-MM-dd"},
        {"parameterKey": "codec", "parameterValue": "best_compression"},
        {"parameterKey": "refreshInterval", "parameterValue": "1s"},
        {
            "parameterKey": "backupBucketName",
            "parameterValue": "amzn-s3-demo-logging-bucket",
        },
        {
            "parameterKey": "defaultCmkArnParam",
            "parameterValue": "arn:aws:kms:us-west-2:111111111111:key/dbf10ef9-adc5-45fe-90b7-c7cda74130c9",
        },
        {"parameterKey": "logSourceAccountId", "parameterValue": "111111111111"},
        {"parameterKey": "logSourceRegion", "parameterValue": "us-west-2"},
        {"parameterKey": "logSourceAccountAssumeRole", "parameterValue": ""},
    ],
    "processorLogGroupName": "/aws/lambda/CL-pipe-ee776174-LogProcessorFn",
    "osiPipelineName": "mocK_osi_pipeline",
    "source": "solution-dev-us-west-2-01",
    "stackId": "arn:aws:cloudformation:us-west-2:111111111111:stack/CL-pipe-ee776174/47d47e00-d1fe-11ed-87a3-0274021fa06b",
    "stackName": "CL-pipe-ee776174",
    "status": "ACTIVE",
    "tags": [],
    "target": "solution-os",
    "type": "WAF",
}


app_pipeline_info_1 = {
    "pipelineId": "d619185d-2626-4cd5-8b23-58127008a2d0",
    "aosParams": {
        "codec": "best_compression",
        "coldLogTransition": "",
        "domainName": "solution-os",
        "engine": "OpenSearch",
        "failedLogBucket": "amzn-s3-demo-logging-bucket",
        "indexPrefix": "monitor-dev-002",
        "indexSuffix": "yyyy_MM_dd",
        "logRetention": "7d",
        "opensearchArn": "arn:aws:es:us-west-2:111111111111:domain/solution-os",
        "opensearchEndpoint": "vpc-solution-os-yhb4z4uzd544pna27wlqqumk2y.us-west-2.es.amazonaws.com",
        "refreshInterval": "1s",
        "replicaNumbers": 1,
        "rolloverSize": "",
        "shardNumbers": 1,
        "vpc": {
            "privateSubnetIds": "subnet-0b99add032f87385b,subnet-0194f25ad3526e8b5",
            "publicSubnetIds": "",
            "securityGroupId": "sg-0a8deb49daed73ecf",
            "vpcId": "vpc-0737368a3ba456453",
        },
        "warmLogTransition": "",
    },
    "bufferAccessRoleArn": "arn:aws:iam::111111111111:role/CL-AppPipe-4c6123bb-BufferAccessRoleDF53FD85-B1YEXIR0482N",
    "bufferAccessRoleName": "CL-AppPipe-4c6123bb-BufferAccessRoleDF53FD85-B1YEXIR0482N",
    "bufferParams": [
        {"paramKey": "enableAutoScaling", "paramValue": "false"},
        {"paramKey": "shardCount", "paramValue": "1"},
        {"paramKey": "minCapacity", "paramValue": "1"},
        {"paramKey": "maxCapacity", "paramValue": "1"},
    ],
    "bufferResourceArn": "arn:aws:kinesis:us-west-2:111111111111:stream/CL-AppPipe-4c6123bb-KDSBufferStream21B531A6-f2yOn829XBEg",
    "bufferResourceName": "CL-AppPipe-4c6123bb-KDSBufferStream21B531A6-f2yOn829XBEg",
    "bufferType": "KDS",
    "createdAt": "2023-04-11T05:58:03Z",
    "error": "",
    "helperLogGroupName": "/aws/lambda/CL-AppPipe-4c6123bb-OpenSearchHelperFn-ahz05AtOKXWd",
    "indexPrefix": "monitor-dev-002",
    "logConfigId": "c7b9eb78-a657-46e1-a24e-cef4acfe8a79",
    "logConfigVersionNumber": 0,
    "monitor": {
        "backupBucketName": "amzn-s3-demo-logging-bucket",
        "status": "ENABLED",
    },
    "osHelperFnArn": "arn:aws:lambda:us-west-2:111111111111:function:CL-AppPipe-4c6123bb-OpenSearchHelperFn-ahz05AtOKXWd",
    "processorLogGroupName": "/aws/lambda/CL-AppPipe-4c6123bb-LogProcessorFn",
    "stackId": "arn:aws:cloudformation:us-west-2:111111111111:stack/CL-AppPipe-4c6123bb/d371c550-d82d-11ed-a700-0a18a9214a19",
    "status": "ACTIVE",
    "tags": [{"key": "a", "value": "a"}],
    "updatedAt": "2023-04-11T05:58:03Z",
}

app_log_ingestion_info_1 = {
    "id": "8d45ca36-f36c-4174-b2a1-a1125c3e166e",
    "accountId": "",
    "appPipelineId": "d619185d-2626-4cd5-8b23-58127008a2d0",
    "confId": "16537c47-a728-4efa-8075-1f9aa6055c3e",
    "createdAt": "2023-04-03T16:00:38Z",
    "logPath": "none",
    "region": "",
    "sourceId": "307eca96-1ffb-4bab-9722-d681cb6452a5",
    "sourceType": "Syslog",
    "stackId": "arn:aws:cloudformation:us-west-2:111111111111:stack/CL-AppIngestion-Syslog-8d45ca36/b02500d0-d238-11ed-b782-025c86e3358b",
    "stackName": "",
    "status": "ACTIVE",
    "tags": [],
    "updatedAt": "2023-04-08T03:55:36Z",
}

app_log_ingestion_info_2 = {
    "id": "0045ca36-f36c-4174-b2a1-a1125c3e1662",
    "accountId": "",
    "appPipelineId": "d619185d-2626-4cd5-8b23-58127008a2d0",
    "confId": "16537c47-a728-4efa-8075-1f9aa6055c3e",
    "createdAt": "2023-04-03T16:00:38Z",
    "logPath": "none",
    "region": "",
    "sourceId": "307eca96-1ffb-4bab-9722-d681cb6452a5",
    "sourceType": "Syslog",
    "stackId": "arn:aws:cloudformation:us-west-2:111111111111:stack/CL-AppIngestion-Syslog-8d45ca36/b02500d0-d238-11ed-b782-025c86e3358b",
    "stackName": "",
    "status": "INACTIVE",
    "tags": [],
    "updatedAt": "2023-04-08T03:55:36Z",
}

app_log_ingestion_info_3 = {
    "id": "0045ca36-f36c-4174-b2a1-a1125c3e1663",
    "accountId": "",
    "appPipelineId": "d619185d-2626-4cd5-8b23-58127008a2d0",
    "confId": "16537c47-a728-4efa-8075-1f9aa6055c3e",
    "createdAt": "2023-04-03T16:00:38Z",
    "logPath": "none",
    "region": "",
    "sourceId": "307eca96-1ffb-4bab-9722-d681cb6452a5",
    "sourceType": "EC2",
    "stackId": "arn:aws:cloudformation:us-west-2:111111111111:stack/CL-AppIngestion-Syslog-8d45ca36/b02500d0-d238-11ed-b782-025c86e3358b",
    "stackName": "",
    "status": "ACTIVE",
    "tags": [],
    "updatedAt": "2023-04-08T03:55:36Z",
}


@pytest.fixture
def ddb_client():
    with mock_dynamodb():
        region = os.environ.get("AWS_REGION")
        ddb = boto3.resource("dynamodb", region_name=region)

        # Create SVC Pipeline table
        svc_table_name = os.environ.get("SVC_PIPELINE_TABLE_NAME")
        svc_table = ddb.create_table(
            TableName=svc_table_name,
            KeySchema=[{"AttributeName": "id", "KeyType": "HASH"}],
            AttributeDefinitions=[{"AttributeName": "id", "AttributeType": "S"}],
            ProvisionedThroughput={"ReadCapacityUnits": 10, "WriteCapacityUnits": 10},
        )
        data_list = [svc_pipeline_info_1, svc_pipeline_info_2]
        with svc_table.batch_writer() as batch:
            for data in data_list:
                batch.put_item(Item=data)

        # Create App Pipeline table
        app_pipeline_table_name = os.environ.get("APP_PIPELINE_TABLE_NAME")
        app_pipeline_table = ddb.create_table(
            TableName=app_pipeline_table_name,
            KeySchema=[{"AttributeName": "pipelineId", "KeyType": "HASH"}],
            AttributeDefinitions=[
                {"AttributeName": "pipelineId", "AttributeType": "S"}
            ],
            ProvisionedThroughput={"ReadCapacityUnits": 10, "WriteCapacityUnits": 10},
        )
        data_list = [app_pipeline_info_1]
        with app_pipeline_table.batch_writer() as batch:
            for data in data_list:
                batch.put_item(Item=data)

        # Create log source table
        log_source_table_name = os.environ.get("LOG_SOURCE_TABLE_NAME")
        log_source_table = ddb.create_table(
            TableName=log_source_table_name,
            KeySchema=[{"AttributeName": "id", "KeyType": "HASH"}],
            AttributeDefinitions=[{"AttributeName": "id", "AttributeType": "S"}],
            ProvisionedThroughput={"ReadCapacityUnits": 10, "WriteCapacityUnits": 10},
        )

        # Create log ingestion table
        app_log_ingestion_table_name = os.environ.get("APP_LOG_INGESTION_TABLE_NAME")
        app_log_ingestion_table = ddb.create_table(
            TableName=app_log_ingestion_table_name,
            KeySchema=[{"AttributeName": "id", "KeyType": "HASH"}],
            AttributeDefinitions=[
                {"AttributeName": "id", "AttributeType": "S"},
            ],
            ProvisionedThroughput={"ReadCapacityUnits": 10, "WriteCapacityUnits": 10},
        )
        data_list = [
            app_log_ingestion_info_1,
            app_log_ingestion_info_2,
            app_log_ingestion_info_3,
        ]
        with app_log_ingestion_table.batch_writer() as batch:
            for data in data_list:
                batch.put_item(Item=data)
        yield


@pytest.fixture
def logs_client():
    with mock_logs():
        region = os.environ.get("AWS_REGION")
        client = boto3.client("logs", region_name=region)

        log_group_name = os.environ.get("MOCK_LOG_GROUP_NAME")
        client.create_log_group(
            logGroupName=log_group_name,
        )

        for i in range(10):
            log_stream_name = "mock_log_stream_name" + str(i)
            client.create_log_stream(
                logGroupName=log_group_name, logStreamName=log_stream_name
            )
            for j in range(100):
                client.put_log_events(
                    logGroupName=log_group_name,
                    logStreamName=log_stream_name,
                    logEvents=[
                        {"timestamp": 123, "message": f"hello world id: {j}"},
                    ],
                )
        yield


def test_list_log_streams(logs_client):
    import lambda_function

    result = lambda_function.lambda_handler(
        {
            "arguments": {
                "page": 1,
                "count": 10,
                "logGroupName": os.environ.get("MOCK_LOG_GROUP_NAME"),
            },
            "info": {
                "fieldName": "listLogStreams",
                "parentTypeName": "Query",
                "variables": {
                    "page": 1,
                    "count": 10,
                    "logGroupName": os.environ.get("MOCK_LOG_GROUP_NAME"),
                },
            },
        },
        None,
    )
    # Expect Execute successfully.
    assert result["total"] == 10

    result = lambda_function.lambda_handler(
        {
            "arguments": {
                "page": 1,
                "count": 10,
                "logGroupName": os.environ.get("MOCK_LOG_GROUP_NAME"),
                "logStreamNamePrefix": "mock_log_stream_name1",
            },
            "info": {
                "fieldName": "listLogStreams",
                "parentTypeName": "Query",
                "variables": {
                    "page": 1,
                    "count": 10,
                    "logGroupName": os.environ.get("MOCK_LOG_GROUP_NAME"),
                    "logStreamNamePrefix": "mock_log_stream_name1",
                },
            },
        },
        None,
    )
    # Expect Execute successfully.
    assert result["total"] == 1

    with pytest.raises(APIException):
        lambda_function.lambda_handler(
            {
                "arguments": {
                    "page": 1,
                    "count": 10,
                    "logGroupName": "NoExist",
                    "logStreamNamePrefix": "mock_log_stream_name1",
                },
                "info": {
                    "fieldName": "listLogStreams",
                    "parentTypeName": "Query",
                },
            },
            None,
        )


def test_args_error(logs_client):
    import lambda_function

    with pytest.raises(APIException):
        lambda_function.lambda_handler(
            {
                "arguments": {"id": "773cb34e-59de-4a6e-9e87-0e0e9e0ff2a0"},
                "info": {
                    "fieldName": "no_exist",
                    "parentTypeName": "Query",
                },
            },
            None,
        )


def test_get_metric_history_data(logs_client, ddb_client):
    import lambda_function

    result = lambda_function.lambda_handler(
        {
            "arguments": {
                "pipelineId": "ee776174-5492-4d36-97b7-589845388012",
                "pipelineType": "SERVICE",
                "metricNames": ["TotalLogs"],
                "startTime": 1614843400,
                "endTime": 1614850000,
            },
            "info": {
                "fieldName": "getMetricHistoryData",
                "parentTypeName": "Query",
            },
        },
        None,
    )
    assert result == {
        "series": [{"name": "TotalLogs", "data": []}],
        "xaxis": {"categories": []},
    }


def test_set_period_time(ddb_client):
    from util.cwl_metric_data_helper import MetricData

    metricData = MetricData("ee776174-5492-4d36-97b7-589845388012", ["TotalLogs"])
    assert metricData._set_period_time(1614843400, 1614850000) == 3600


def test_get_sorted_merged_xaxis(ddb_client):
    from util.cwl_metric_data_helper import MetricData

    metricData = MetricData("ee776174-5492-4d36-97b7-589845388012", ["TotalLogs"])

    xaxis_array = [[1, 2, 3, 4, 5], [3, 4, 5], [6, 5, 7]]
    merged_xaxis = metricData._get_sorted_merged_xaxis(xaxis_array)
    assert merged_xaxis == [1, 2, 3, 4, 5, 6, 7]


def test_apex_chart_data_adaptor(ddb_client):
    """
    This function will test the _apex_chart_data_adaptor function
    """
    from util.cwl_metric_data_helper import MetricData

    metricData = MetricData("ee776174-5492-4d36-97b7-589845388012", ["TotalLogs"])

    merged_xaxis = ["time1", "time2", "time3", "time4"]
    data_points_dict_array = [
        {
            "name": "serie_1",
            "datapoints": {
                "time1": 22.0,
                "time2": 23.0,
                "time4": 31.0,
            },
        },
        {
            "name": "serie_2",
            "datapoints": {
                "time3": 27.0,
            },
        },
    ]
    result = metricData._apex_chart_data_adaptor(merged_xaxis, data_points_dict_array)

    assert result == {
        "series": [
            {"name": "serie_1", "data": [22.0, 23.0, -1, 31.0]},
            {"name": "serie_2", "data": [-1, -1, 27.0, -1]},
        ],
        "xaxis": {"categories": ["time1", "time2", "time3", "time4"]},
    }


def test_compute_delta(ddb_client):
    """
    This function will test the _compute_delta function
    """
    from util.cwl_metric_data_helper import MetricData

    metricData = MetricData("ee776174-5492-4d36-97b7-589845388012", ["TotalLogs"])

    data = {
        "series": [
            {
                "name": "FluentBitOutputProcRecords_adc4a",
                "data": [2292.0, 2300.0, 2308.0, 2316.0, 2324.0, 6.0, 14.0, 22.0],
            },
            {
                "name": "FluentBitOutputProcRecords_ccccc",
                "data": [1.0, 3.0, 6.0, 10.0, 20.0, 6.0, 17.0, 21.0],
            },
        ],
        "xaxis": {
            "categories": [
                "1688396640",
                "1688396700",
                "1688396760",
                "1688396820",
                "1688396880",
                "1688428980",
                "1688429040",
                "1688429100",
            ]
        },
    }

    delta_data = metricData._compute_delta(data=data)
    assert delta_data == {
        "series": [
            {
                "name": "FluentBitOutputProcRecords_adc4a",
                "data": [8.0, 8.0, 8.0, 8.0, 0.0, 8.0, 8.0],
            },
            {
                "name": "FluentBitOutputProcRecords_ccccc",
                "data": [2.0, 3.0, 4.0, 10.0, 0.0, 11.0, 4.0],
            },
        ],
        "xaxis": {
            "categories": [
                "1688396700",
                "1688396760",
                "1688396820",
                "1688396880",
                "1688428980",
                "1688429040",
                "1688429100",
            ]
        },
    }


def test_single_metric_helper(ddb_client):
    from util.cwl_metric_data_helper import MetricDataHelper

    metric_data_helper = MetricDataHelper(
        "ee776174-5492-4d36-97b7-589845388012", "SERVICE", ["TotalLogs"]
    )
    result = metric_data_helper.get_data(1614843400, 1614850000)
    assert result == {
        "series": [{"name": "TotalLogs", "data": []}],
        "xaxis": {"categories": []},
    }


def test_multi_metrics_helper(ddb_client):
    from util.cwl_metric_data_helper import MetricDataHelper

    metric_data_helper = MetricDataHelper(
        "ee776174-5492-4d36-97b7-589845388012",
        "SERVICE",
        ["TotalLogs", "FailedLogs", "ExcludedLogs"],
    )

    result = metric_data_helper.get_data(1614843400, 1614850000)
    assert result == {
        "series": [
            {"data": [], "name": "TotalLogs"},
            {"data": [], "name": "FailedLogs"},
            {"data": [], "name": "ExcludedLogs"},
        ],
        "xaxis": {"categories": []},
    }


def test_app_single_metric_helper(ddb_client):
    from util.cwl_metric_data_helper import MetricDataHelper

    metric_data_helper = MetricDataHelper(
        "d619185d-2626-4cd5-8b23-58127008a2d0", "APP", ["TotalLogs"]
    )
    result = metric_data_helper.get_data(1614843400, 1614850000)
    assert result == {
        "series": [{"name": "TotalLogs", "data": []}],
        "xaxis": {"categories": []},
    }


def test_none_exist_graph_helper(ddb_client):
    from util.cwl_metric_data_helper import MetricDataHelper

    with pytest.raises(RuntimeError):
        MetricDataHelper(
            "ee776174-5492-4d36-97b7-589845388012", "NoExistType", ["NoExist"]
        )


def test_get_ingestion_ids(ddb_client):
    from util.cwl_metric_data_helper import APP

    metric_data_helper = APP("d619185d-2626-4cd5-8b23-58127008a2d0", ["TotalLogs"])
    result = metric_data_helper.get_ingestion_ids()
    assert len(result) == 1


def test_osi_pipeline_metrics(ddb_client):
    from util.cwl_metric_data_helper import MetricDataHelper

    metric_data_helper = MetricDataHelper(
        "ee776174-5492-4d36-97b7-589845388002",
        "SERVICE",
        ["OSICPUUsage"],
    )

    result = metric_data_helper.get_data(1614843400, 1614850000)
    assert result == {
        "series": [
            {"data": [], "name": "OSICPUUsage"},
        ],
        "xaxis": {"categories": []},
    }

    metric_data_helper = MetricDataHelper(
        "ee776174-5492-4d36-97b7-589845388002",
        "SERVICE",
        ["OSIDocumentsRetriedWrite"],
    )

    result = metric_data_helper.get_data(1614843400, 1614850000)
    assert result == {
        "series": [
            {"data": [], "name": "OSIDocumentsRetriedWrite"},
        ],
        "xaxis": {"categories": []},
    }