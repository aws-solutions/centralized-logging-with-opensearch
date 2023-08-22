# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import logging
import sys
import os
import math
import re

from datetime import datetime

from commonlib import AWSConnection
from commonlib.dao import AppLogIngestionDao, AppPipelineDao, LogSourceDao
from commonlib.model import LogSourceTypeEnum

from boto3.dynamodb.conditions import Attr

logger = logging.getLogger()
logger.setLevel(logging.INFO)

conn = AWSConnection()

cwl_client = conn.get_client("cloudwatch")
dynamodb = conn.get_client("dynamodb", client_type="resource")

svc_pipeline_table_name = os.environ.get("SVC_PIPELINE_TABLE_NAME")
svc_pipeline_table = dynamodb.Table(svc_pipeline_table_name)
app_pipeline_table_name = os.environ.get("APP_PIPELINE_TABLE_NAME")
log_source_table_name = os.environ.get("LOG_SOURCE_TABLE_NAME")
app_log_ingestion_table_name = os.environ.get("APP_LOG_INGESTION_TABLE_NAME")
stack_prefix = os.environ.get("STACK_PREFIX", "CL")

ingestion_dao = AppLogIngestionDao(table_name=app_log_ingestion_table_name)
app_pipeline_dao = AppPipelineDao(table_name=app_pipeline_table_name)
log_source_dao = LogSourceDao(table_name=log_source_table_name)


class MetricDataHelper:
    """Metric Data Helper class"""

    def __init__(self, pipeline_id: str, pipeline_type: str, metric_names) -> None:
        # try to find a mapping class
        if helper := getattr(sys.modules[__name__], pipeline_type, None):
            self._helper = helper(pipeline_id, metric_names)
        else:
            raise RuntimeError(f"Unknown PipeLine Type: {pipeline_type}")

    def get_data(self, start_time, end_time):
        return self._helper.get_data(start_time, end_time)


class MetricData:
    """Basic Class represents a type of Metric History Data"""

    def __init__(self, pipeline_id, metric_names) -> None:
        super().__init__()
        self._default_max_points = 1440
        self._name_space = "Solution/" + stack_prefix
        self._name_space_flb = "Solution/" + stack_prefix + "/FluentBit"
        self._pipeline_id = pipeline_id
        self._metric_names = metric_names
        self._data_series = []
        self._xaxis = []
        self._metric_resource_infos = {}

    def get_data(self, start_time, end_time):
        """returned the history data

        Args:
            start_time: The start time stamp, in unix format
            end_time: The end time stamp, in unix format

        Return:
            {
                series: [{
                    name: "Transferred Object",
                    data: [10, 41, 35, 51, 49, 62, 69, 91, 148]
                }, {
                    name: "Failed Object",
                    data: [10, 41, 35, 51, 49, 62, 69, 91, 148]
                }],
                xaxis: {
                    categories: ['11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00'],
                }
            }
        """
        pass

    def _compute_delta(self, data, period_in_sec: int = 60):
        """
        Calculate the difference in values for each serie over time and modify the 'xaxis' accordingly.
        If the difference between two consecutive values is negative, the original value is retained.

        To handle data loss or Fluent Bit restart scenarios, if the difference between two consecutive values is negative,
        the original value is retained as the subtracted value.

        Args:
            data (dict): A dictionary containing the data to be processed.
            period_in_sec (int): The period used to get the data point from cloudwatch in second. 
                We need to apply this parameter to eliminate the issue of difference amplification caused by the SUM operation. 

        Returns:
            dict: The modified data dictionary with the differences in values and updated 'xaxis'.

        Example:
            data = {
                'series': [
                    {'name': 'FluentBitOutputProcRecords_adc4a', 'data': [2292.0, 2300.0, 2308.0, 2316.0, 2324.0, 6.0, 14.0, 22.0]},
                    {'name': 'FluentBitOutputProcRecords_ccccc', 'data': [1.0, 3.0, 6.0, 10.0, 20.0, 6.0, 17.0, 21.0]}
                ],
                'xaxis': {'categories': ['1688396640', '1688396700', '1688396760', '1688396820', '1688396880', '1688428980', '1688429040', '1688429100']}
            }
            period_in_sec = 60

            result = calculate_difference(data, period_in_sec)
            print(result)

        Output:
            {
                'series': [
                    {'name': 'FluentBitOutputProcRecords_adc4a', 'data': [8.0, 8.0, 8.0, 8.0, 0.0, 8.0, 8.0]},
                    {'name': 'FluentBitOutputProcRecords_ccccc', 'data': [2.0, 3.0, 4.0, 10.0, 0.0, 11.0, 4.0]}
                ],
                'xaxis': {'categories': ['1688396700', '1688396760', '1688396820', '1688396880', '1688428980', '1688429040', '1688429100']}
            }
        """
        series = data["series"]
        xaxis = data["xaxis"]["categories"]
        xaxis = xaxis[1:]  # Drop the first data point
        data["xaxis"]["categories"] = xaxis

        period_in_minute = max(period_in_sec // 60, 1)

        for serie in series:
            values = serie["data"]
            diff_values = [
                int(int(values[i] - values[i - 1]) / period_in_minute)
                if values[i] - values[i - 1] >= 0
                # We must discard the first data point recovered from outliers, i.e., we cannot use int(values[i] / period_in_minute) for calculation. 
                # Because we cannot determine whether FLB restarted at this data point or it was a sporadic error in FLB's metrics
                else 0
                for i in range(1, len(values))
            ]
            serie["data"] = diff_values

        return data

    def _set_period_time(self, start_time, end_time):
        """
        The maximum number of data points returned from a single call is 1,440.
        * Start time between 3 hours and 15 days ago - Use a multiple of 60 seconds (1 minute).
        * Start time between 15 and 63 days ago - Use a multiple of 300 seconds (5 minutes).
        * Start time greater than 63 days ago - Use a multiple of 3600 seconds (1 hour).
        """
        now = datetime.utcnow()
        start = datetime.fromtimestamp(int(start_time))
        end = datetime.fromtimestamp(int(end_time))

        total_seconds_from_now = (now - start).total_seconds()
        total_seconds_between_start_and_end = (end - start).total_seconds()

        tmp_period = math.ceil(
            total_seconds_between_start_and_end / (self._default_max_points * 1.0)
        )

        # in 15 days
        period = 60

        if total_seconds_from_now < 3 * 24 * 3600:
            period = 60
        elif (total_seconds_from_now >= 3 * 24 * 3600) and (
            total_seconds_from_now < 15 * 24 * 3600
        ):
            period = max(60, math.ceil(tmp_period / 60.0) * 60)
        # between 15 and 63 days
        elif (total_seconds_from_now >= 15 * 24 * 3600) and (
            total_seconds_from_now < 63 * 24 * 3600
        ):
            period = max(300, math.ceil(tmp_period / 300.0) * 300)
        # beyond 63 days
        elif total_seconds_from_now >= 63 * 24 * 3600:
            period = max(3600, math.ceil(tmp_period / 3600.0) * 3600)

        logger.info(f"start time is {datetime.fromtimestamp(float(start_time))}")
        logger.info(f"end time is {datetime.fromtimestamp(float(end_time))}")
        logger.info(f"Set period time to {period} seconds")

        return period

    def _get_sorted_merged_xaxis(self, xaxis_array):
        """
        This function will merge two datetime array together and sort the merged array.

        Args:
            xaxis_array: [
                ['time1', 'time2', 'time3', 'time4', 'time5'],
                ['time3', 'time4', 'time5'],
                ['time5', 'time6', 'time7']
            ]

        Return:
            merged_xaxis: ['time1', 'time2', 'time3', 'time4', 'time5', 'time6', 'time7']
        """
        merged_xaxis = []
        for xaxis in xaxis_array:
            merged_xaxis += xaxis
        merged_xaxis = list(set(merged_xaxis))
        merged_xaxis.sort()
        return merged_xaxis

    def _apex_chart_data_adaptor(self, merged_xaxis, data_points_dict_array):
        """
        This funciton will generate the data for javascript apexchart.
        This function will handle the missing value.

        Args:
            merged_xaxis: ['time1', 'time2', 'time3', 'time4']
            data_points_dict_array: [
                {
                    "name": "serie_1",
                    "datapoints": {
                        "time1": 22.0,
                        "time2": 23.0,
                        "time4": 31.0,
                    }
                },
                {
                    "name": "serie_2",
                    "datapoints":{
                        "time3": 27.0,
                    }
                }
            ]

        Return:
            {
                series: [
                    {
                        name: "serie_1",
                        data: [22.0, 23.0, 0, 31.0]
                    },
                    {
                        name: "serie_2",
                        data: [0, 0, 27.0, 0]
                    }
                ],
                xaxis: {
                    categories: ['time1', 'time2', 'time3', 'time4']
                }
            }
        """
        series = []

        for data_points_dict in data_points_dict_array:
            tmp_serire_data_array = []
            data_points = data_points_dict["datapoints"]
            serie_name = data_points_dict["name"]

            for timestamp in merged_xaxis:
                value = data_points.get(timestamp, -1)
                tmp_serire_data_array.append(value)

            series.append({"name": serie_name, "data": tmp_serire_data_array})

        return {"series": series, "xaxis": {"categories": merged_xaxis}}

    def _get_cwl_metric_data(self, metric_name, start_time, end_time, ingestion_id=""):
        """
        This function will get the metric data from CloudWatch for a specific metric.
        Args:
            metric_name: Solution metric name, not CloudWatch Metric Name
            start_time: start time in unix timestamp
            end_time: end time in unix timestamp
            ingestion_id: this is only used for app pipeline.

        Return:
            tmp_data_points_map: {
                "unix_timestamp_1": value_1,
                "unix_timestamp_2": value_2,
                ...
            }
            tmp_xaixs: [unix_timestamp]
        """

        tmp_xaixs = []
        tmp_data_points_map = {}
        period = self._set_period_time(start_time, end_time)

        def get_metric_data(
            namespace, metric_name, period, start_time, end_time, statistics, dimensions
        ):
            return cwl_client.get_metric_statistics(
                Namespace=namespace,
                Period=period,
                StartTime=datetime.fromtimestamp(float(start_time)),
                EndTime=datetime.fromtimestamp(float(end_time)),
                MetricName=metric_name,
                Statistics=statistics,
                Dimensions=dimensions,
            )

        stack_name = "StackName"
        sqs_namespace = "AWS/SQS"
        lambda_namespace = "AWS/Lambda"
        kdf_namespace = "AWS/Firehose"
        kds_namespace = "AWS/Kinesis"
        elb_namespace = "AWS/NetworkELB"
        metric_info = {
            # Log Processor Custom Metrics
            "TotalLogs": {
                "cwl_metric_name": "TotalLogs",
                "namespace": self._name_space,
                "statistics": ["Sum"],
                "dimensions": [
                    {
                        "Name": stack_name,
                        "Value": self._metric_resource_infos.get("stackName"),
                    },
                ],
            },
            "FailedLogs": {
                "cwl_metric_name": "FailedLogs",
                "namespace": self._name_space,
                "statistics": ["Sum"],
                "dimensions": [
                    {
                        "Name": stack_name,
                        "Value": self._metric_resource_infos.get("stackName"),
                    },
                ],
            },
            "ExcludedLogs": {
                "cwl_metric_name": "ExcludedLogs",
                "namespace": self._name_space,
                "statistics": ["Sum"],
                "dimensions": [
                    {
                        "Name": stack_name,
                        "Value": self._metric_resource_infos.get("stackName"),
                    },
                ],
            },
            "LoadedLogs": {
                "cwl_metric_name": "LoadedLogs",
                "namespace": self._name_space,
                "statistics": ["Sum"],
                "dimensions": [
                    {
                        "Name": stack_name,
                        "Value": self._metric_resource_infos.get("stackName"),
                    },
                ],
            },
            # SQS Metrics
            "SQSNumberOfMessagesSent": {
                "cwl_metric_name": "NumberOfMessagesSent",
                "namespace": sqs_namespace,
                "statistics": ["Sum"],
                "dimensions": [
                    {
                        "Name": "QueueName",
                        "Value": self._metric_resource_infos.get("logEventQueueName"),
                    },
                ],
            },
            "SQSNumberOfMessagesDeleted": {
                "cwl_metric_name": "NumberOfMessagesDeleted",
                "namespace": sqs_namespace,
                "statistics": ["Sum"],
                "dimensions": [
                    {
                        "Name": "QueueName",
                        "Value": self._metric_resource_infos.get("logEventQueueName"),
                    },
                ],
            },
            "SQSApproximateNumberOfMessagesVisible": {
                "cwl_metric_name": "ApproximateNumberOfMessagesVisible",
                "namespace": sqs_namespace,
                "statistics": ["Sum"],
                "dimensions": [
                    {
                        "Name": "QueueName",
                        "Value": self._metric_resource_infos.get("logEventQueueName"),
                    },
                ],
            },
            "SQSApproximateAgeOfOldestMessage": {
                "cwl_metric_name": "ApproximateAgeOfOldestMessage",
                "namespace": sqs_namespace,
                "statistics": ["Maximum"],
                "dimensions": [
                    {
                        "Name": "QueueName",
                        "Value": self._metric_resource_infos.get("logEventQueueName"),
                    },
                ],
            },
            # Log Processor Function Metrics
            "ProcessorFnError": {
                "cwl_metric_name": "Errors",
                "namespace": lambda_namespace,
                "statistics": ["Sum"],
                "dimensions": [
                    {
                        "Name": "FunctionName",
                        "Value": self._metric_resource_infos.get("processorFnName"),
                    },
                ],
            },
            "ProcessorFnConcurrentExecutions": {
                "cwl_metric_name": "ConcurrentExecutions",
                "namespace": lambda_namespace,
                "statistics": ["Sum"],
                "dimensions": [
                    {
                        "Name": "FunctionName",
                        "Value": self._metric_resource_infos.get("processorFnName"),
                    },
                ],
            },
            "ProcessorFnDuration": {
                "cwl_metric_name": "Duration",
                "namespace": lambda_namespace,
                "statistics": ["Maximum"],
                "dimensions": [
                    {
                        "Name": "FunctionName",
                        "Value": self._metric_resource_infos.get("processorFnName"),
                    },
                ],
            },
            "ProcessorFnThrottles": {
                "cwl_metric_name": "Throttles",
                "namespace": lambda_namespace,
                "statistics": ["Sum"],
                "dimensions": [
                    {
                        "Name": "FunctionName",
                        "Value": self._metric_resource_infos.get("processorFnName"),
                    },
                ],
            },
            "ProcessorFnInvocations": {
                "cwl_metric_name": "Invocations",
                "namespace": lambda_namespace,
                "statistics": ["Sum"],
                "dimensions": [
                    {
                        "Name": "FunctionName",
                        "Value": self._metric_resource_infos.get("processorFnName"),
                    },
                ],
            },
            # Kinesis Firehose Metrics
            "KDFIncomingBytes": {
                "cwl_metric_name": "IncomingBytes",
                "namespace": kdf_namespace,
                "statistics": ["Sum"],
                "dimensions": [
                    {
                        "Name": "DeliveryStreamName",
                        "Value": self._metric_resource_infos.get("deliveryStreamName"),
                    },
                ],
            },
            "KDFIncomingRecords": {
                "cwl_metric_name": "IncomingRecords",
                "namespace": kdf_namespace,
                "statistics": ["Sum"],
                "dimensions": [
                    {
                        "Name": "DeliveryStreamName",
                        "Value": self._metric_resource_infos.get("deliveryStreamName"),
                    },
                ],
            },
            "KDFDeliveryToS3Bytes": {
                "cwl_metric_name": "DeliveryToS3.Bytes",
                "namespace": kdf_namespace,
                "statistics": ["Sum"],
                "dimensions": [
                    {
                        "Name": "DeliveryStreamName",
                        "Value": self._metric_resource_infos.get("deliveryStreamName"),
                    },
                ],
            },
            "KDSIncomingBytes": {
                "cwl_metric_name": "IncomingBytes",
                "namespace": kds_namespace,
                "statistics": ["Sum"],
                "dimensions": [
                    {
                        "Name": "StreamName",
                        "Value": self._metric_resource_infos.get("bufferResourceName"),
                    },
                ],
            },
            # Kinesis Data Stream Metrics
            "KDSIncomingRecords": {
                "cwl_metric_name": "IncomingRecords",
                "namespace": kds_namespace,
                "statistics": ["Sum"],
                "dimensions": [
                    {
                        "Name": "StreamName",
                        "Value": self._metric_resource_infos.get("bufferResourceName"),
                    },
                ],
            },
            "KDSPutRecordsBytes": {
                "cwl_metric_name": "PutRecords.Bytes",
                "namespace": kds_namespace,
                "statistics": ["Sum"],
                "dimensions": [
                    {
                        "Name": "StreamName",
                        "Value": self._metric_resource_infos.get("bufferResourceName"),
                    },
                ],
            },
            "KDSThrottledRecords": {
                "cwl_metric_name": "PutRecords.ThrottledRecords",
                "namespace": kds_namespace,
                "statistics": ["Sum"],
                "dimensions": [
                    {
                        "Name": "StreamName",
                        "Value": self._metric_resource_infos.get("bufferResourceName"),
                    },
                ],
            },
            "KDSWriteProvisionedThroughputExceeded": {
                "cwl_metric_name": "WriteProvisionedThroughputExceeded",
                "namespace": kds_namespace,
                "statistics": ["Sum"],
                "dimensions": [
                    {
                        "Name": "StreamName",
                        "Value": self._metric_resource_infos.get("bufferResourceName"),
                    },
                ],
            },
            # Syslog NLB Metrics
            "SyslogNLBActiveFlowCount": {
                "cwl_metric_name": "ActiveFlowCount",
                "namespace": elb_namespace,
                "statistics": ["Sum"],
                "dimensions": [
                    {
                        "Name": "LoadBalancer",
                        "Value": self._metric_resource_infos.get(
                            "loadBalancerMetricName"
                        ),
                    },
                ],
            },
            "SyslogNLBProcessedBytes": {
                "cwl_metric_name": "ProcessedBytes",
                "namespace": elb_namespace,
                "statistics": ["Sum"],
                "dimensions": [
                    {
                        "Name": "LoadBalancer",
                        "Value": self._metric_resource_infos.get(
                            "loadBalancerMetricName"
                        ),
                    },
                ],
            },
            # Fluent-bit Metrics
            "FluentBitInputBytes": {
                "cwl_metric_name": "InputBytes",
                "namespace": self._name_space_flb,
                "statistics": ["Sum"],
                "dimensions": [
                    {
                        "Name": "IngestionId",
                        "Value": ingestion_id + "_input",
                    },
                ],
            },
            "FluentBitInputRecords": {
                "cwl_metric_name": "InputRecords",
                "namespace": self._name_space_flb,
                "statistics": ["Sum"],
                "dimensions": [
                    {
                        "Name": "IngestionId",
                        "Value": ingestion_id + "_input",
                    },
                ],
            },
            "FluentBitOutputDroppedRecords": {
                "cwl_metric_name": "OutputDroppedRecords",
                "namespace": self._name_space_flb,
                "statistics": ["Sum"],
                "dimensions": [
                    {
                        "Name": "IngestionId",
                        "Value": ingestion_id + "_output",
                    },
                ],
            },
            "FluentBitOutputErrors": {
                "cwl_metric_name": "OutputErrors",
                "namespace": self._name_space_flb,
                "statistics": ["Sum"],
                "dimensions": [
                    {
                        "Name": "IngestionId",
                        "Value": ingestion_id + "_output",
                    },
                ],
            },
            "FluentBitOutputRetriedRecords": {
                "cwl_metric_name": "OutputRetriedRecords",
                "namespace": self._name_space_flb,
                "statistics": ["Sum"],
                "dimensions": [
                    {
                        "Name": "IngestionId",
                        "Value": ingestion_id + "_output",
                    },
                ],
            },
            "FluentBitOutputRetriesFailed": {
                "cwl_metric_name": "OutputRetriesFailed",
                "namespace": self._name_space_flb,
                "statistics": ["Sum"],
                "dimensions": [
                    {
                        "Name": "IngestionId",
                        "Value": ingestion_id + "_output",
                    },
                ],
            },
            "FluentBitOutputRetries": {
                "cwl_metric_name": "OutputRetries",
                "namespace": self._name_space_flb,
                "statistics": ["Sum"],
                "dimensions": [
                    {
                        "Name": "IngestionId",
                        "Value": ingestion_id + "_output",
                    },
                ],
            },
            "FluentBitOutputProcBytes": {
                "cwl_metric_name": "OutputProcBytes",
                "namespace": self._name_space_flb,
                "statistics": ["Sum"],
                "dimensions": [
                    {
                        "Name": "IngestionId",
                        "Value": ingestion_id + "_output",
                    },
                ],
            },
            "FluentBitOutputProcRecords": {
                "cwl_metric_name": "OutputProcRecords",
                "namespace": self._name_space_flb,
                "statistics": ["Sum"],
                "dimensions": [
                    {
                        "Name": "IngestionId",
                        "Value": ingestion_id + "_output",
                    },
                ],
            },
        }

        metric_data = metric_info.get(metric_name)
        if metric_data is not None:
            try:
                response = get_metric_data(
                    metric_data["namespace"],
                    metric_data["cwl_metric_name"],
                    period,
                    start_time,
                    end_time,
                    metric_data["statistics"],
                    metric_data["dimensions"],
                )

                data_points = response.get("Datapoints")
                for data_point in data_points:
                    tmp_xaixs.append(data_point.get("Timestamp").strftime("%s"))
                    tmp_data_points_map.update(
                        {
                            data_point.get("Timestamp").strftime("%s"): data_point.get(
                                metric_data["statistics"][0]
                            )
                        }
                    )
            except Exception as err:
                logger.error(err)

        return tmp_data_points_map, tmp_xaixs


class SERVICE(MetricData):
    """
    This class will get the metric data for Service Pipeline
    """

    def __init__(self, pipeline_id, metric_names):
        super().__init__(pipeline_id, metric_names)
        self._tmp_series = []
        self._metric_resource_infos = self.get_metric_resource_infos()

    def get_data(self, start_time, end_time):
        xaixs_array = []
        data_points_dict_array = []

        for metric_name in self._metric_names:
            _data_points, _xaixs = self._get_cwl_metric_data(
                metric_name, start_time, end_time
            )
            xaixs_array.append(_xaixs)
            data_points_dict_array.append(
                {"name": metric_name, "datapoints": _data_points},
            )

        self._xaxis = self._get_sorted_merged_xaxis(xaixs_array)

        result = self._apex_chart_data_adaptor(self._xaxis, data_points_dict_array)
        return result

    def get_metric_resource_infos(self):
        """
        This function will get the metric resource info
        """
        metric_resource_infos = {}

        response = svc_pipeline_table.get_item(Key={"id": self._pipeline_id})["Item"]

        metric_resource_infos["processorLogGroupName"] = response.get(
            "processorLogGroupName"
        )
        processor_fn_name = re.findall(
            r"/aws/lambda/(.*)", response.get("processorLogGroupName")
        )[0]
        metric_resource_infos["processorFnName"] = processor_fn_name

        metric_resource_infos["stackName"] = response.get("stackName")
        metric_resource_infos["helperLogGroupName"] = response.get("helperLogGroupName")
        metric_resource_infos["logEventQueueName"] = response.get("logEventQueueName")
        metric_resource_infos["bufferResourceName"] = response.get("bufferResourceName")
        metric_resource_infos["deliveryStreamName"] = response.get("deliveryStreamName")

        return metric_resource_infos


class APP(MetricData):
    """
    This class will get the metric data for App Pipeline
    """

    def __init__(self, pipeline_id, metric_names):
        super().__init__(pipeline_id, metric_names)
        self.ingestion_level_metrics = [
            "FluentBitInputBytes",
            "FluentBitInputRecords",
            "FluentBitOutputDroppedRecords",
            "FluentBitOutputErrors",
            "FluentBitOutputRetriedRecords",
            "FluentBitOutputRetriesFailed",
            "FluentBitOutputRetries",
            "FluentBitOutputProcBytes",
            "FluentBitOutputProcRecords",
        ]
        self._tmp_series = []
        self._metric_resource_infos = self.get_metric_resource_infos()
        self._ingestion_ids = self.get_ingestion_ids()

    def get_data(self, start_time, end_time):
        """
        This function will get the metric data for App Pipeline
        """
        xaixs_array = []
        data_points_dict_array = []

        for metric_name in self._metric_names:
            if metric_name in self.ingestion_level_metrics:
                # For ingestion level metrics
                for ingestion_id in self._ingestion_ids:
                    _data_points, _xaixs = self._get_cwl_metric_data(
                        metric_name, start_time, end_time, ingestion_id
                    )
                    xaixs_array.append(_xaixs)
                    data_points_dict_array.append(
                        {
                            "name": metric_name + "_" + ingestion_id[:5],
                            "datapoints": _data_points,
                        },
                    )
            else:
                # For pipeline level metrics
                _data_points, _xaixs = self._get_cwl_metric_data(
                    metric_name, start_time, end_time
                )
                xaixs_array.append(_xaixs)
                data_points_dict_array.append(
                    {"name": metric_name, "datapoints": _data_points},
                )

        self._xaxis = self._get_sorted_merged_xaxis(xaixs_array)

        result = self._apex_chart_data_adaptor(self._xaxis, data_points_dict_array)

        # handle fluent-bit metrics, here we assume that fluent-bit metrics will not mixed with other no-flb metrics
        if any(metric in self._metric_names for metric in self.ingestion_level_metrics):
            period_in_sec = self._set_period_time(start_time, end_time)
            result = self._compute_delta(result, period_in_sec)
        return result

    def get_metric_resource_infos(self):
        """
        This function will get the metric resource info
        """
        metric_resource_infos = {}

        response = app_pipeline_dao.get_app_pipeline(self._pipeline_id)
        metric_resource_infos["processorLogGroupName"] = response.processorLogGroupName
        processor_fn_names = re.findall(
            r"/aws/lambda/(.*)", response.processorLogGroupName
        )
        processor_fn_name = processor_fn_names[0] if processor_fn_names else None
        metric_resource_infos["processorFnName"] = processor_fn_name

        metric_resource_infos["stackName"] = self.get_stack_name_by_stack_id(
            response.stackId
        )
        metric_resource_infos["helperLogGroupName"] = response.helperLogGroupName
        metric_resource_infos["logEventQueueName"] = response.logEventQueueName
        metric_resource_infos["bufferResourceName"] = response.bufferResourceName
        metric_resource_infos["bufferResourceArn"] = response.bufferResourceArn

        # Get the syslog resource info
        _, syslog_nlb_metric_name = self.get_syslog_nlb_info()
        metric_resource_infos["loadBalancerMetricName"] = syslog_nlb_metric_name

        return metric_resource_infos

    def get_stack_name_by_stack_id(self, stack_id: str) -> str:
        """
        Get the stack name by stack id
        """
        split_arn = stack_id.split("/")
        stack_name = split_arn[1]
        return stack_name

    def get_syslog_nlb_info(self):
        """
        This function retrieves the arn and the metric name of an existing nlb
        If no NLB exists, the function will return None
        """
        syslog_nlb_arn = ""
        syslog_nlb_metric_name = ""
        # Scan the log source table to check the status of nlb.
        conditions = Attr("status").eq("ACTIVE")
        conditions = conditions.__and__(Attr("type").eq("Syslog"))

        response = log_source_dao.list_log_sources(conditions)
        # If there is an activate syslog log source, we assume that there must be a existed nlb.
        if response and len(response) > 0:
            syslog_nlb_arn = response[0].syslog.nlbArn
            syslog_nlb_metric_name = self.get_metric_name_from_nlb_arn(syslog_nlb_arn)

        return syslog_nlb_arn, syslog_nlb_metric_name

    def get_metric_name_from_nlb_arn(self, nlb_arn):
        """
        For example, if the arn is:
            arn:aws:elasticloadbalancing:us-west-2:123456789012:loadbalancer/net/Logging-syslog-nlb/5782b163349f1154
        the metric name is:
            net/Logging-syslog-nlb/5782b163349f1154
        """
        nlb_metric_name = ""
        pattern = r"loadbalancer\/(.*)$"
        match = re.search(pattern, nlb_arn)

        if match:
            nlb_metric_name = match.group(1)

        return nlb_metric_name

    def get_ingestion_ids(self):
        """
        This function will get the ingestion ids
        """
        ingestion_ids = []

        scan_resp = ingestion_dao.get_app_log_ingestions_by_pipeline_id(
            self._pipeline_id
        )

        for item in scan_resp:
            if item.sourceType in [
                LogSourceTypeEnum.EC2,
                LogSourceTypeEnum.EKSCluster,
            ]:
                ingestion_ids.append(item.id)

        return ingestion_ids
