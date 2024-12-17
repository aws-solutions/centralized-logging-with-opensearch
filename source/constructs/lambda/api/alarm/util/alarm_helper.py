# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import os

from commonlib import AWSConnection
from commonlib.dao import PipelineAlarmDao, DynamoDBUtil
from commonlib.model import (
    PipelineType,
    BufferTypeEnum,
    PipelineAlarmType,
    PipelineAlarmStatus,
    LogSourceTypeEnum,
    EngineType,
)
from commonlib.logging import get_logger

from boto3.dynamodb.conditions import Attr

logger = get_logger("alarm.util")

conn = AWSConnection()

dynamodb = conn.get_client("dynamodb", client_type="resource")

stack_prefix = os.environ.get("STACK_PREFIX", "CL")
app_pipeline_table_name = os.environ.get("APP_PIPELINE_TABLE_NAME")
svc_pipeline_table_name = os.environ.get("PIPELINE_TABLE_NAME")
app_log_ingestion_table_name = os.environ.get("APP_LOG_INGESTION_TABLE_NAME")
metadata_table_name = os.environ["METADATA_TABLE_NAME"]

THROTTLE_LAMBDA_ARN = os.environ.get("THROTTLE_LAMBDA_ARN", "")

EVT_DEAD_LETTER_INVOCATIONS_THRESHOLD = 1
EVT_DEAD_LETTER_INVOCATIONS_PERIOD = 60 * 5

PROCESSOR_ERROR_INVOCATION_THRESHOLD_COUNT = 10
PROCESSOR_ERROR_INVOCATION_PERIOD = 60

PROCESSOR_ERROR_RECORD_THRESHOLD_COUNT = 1
PROCESSOR_ERROR_RECORD_PERIOD = 300

PROCESSOR_DURATION_THRESHOLD_MILLISECONDS = 60000
PROCESSOR_ERROR_RECORD_PERIOD = 300

KDS_PUT_THROTTLED_THRESHOLD_PERCENT = 10
KDS_PUT_THROTTLED_PERIOD = 60

FLB_OUTPUT_RETRY_THRESHOLD_COUNT = 100
FLB_OUTPUT_RETRY_PERIOD = 300
NAME_SPACE_PREFIX = "Solution/"


class AlarmHelper:
    """Basic Alarm Service Class"""

    def __init__(
        self,
        pipeline_id: str,
        sns_topic_arn: str = "",
        emails: str = "",
        pipeline_type: str = PipelineType.SERVICE,
    ) -> None:
        super().__init__()
        self._name_space = NAME_SPACE_PREFIX + stack_prefix
        self._pipeline_id = pipeline_id
        self._pipeline_type = pipeline_type
        self._sns_topic_arn = sns_topic_arn
        self._emails = emails
        self._alarm_names = []
        self._cwl_client = conn.get_client("cloudwatch")
        self._sns_client = conn.get_client("sns")
        self._pipeline_table_name = (
            app_pipeline_table_name
            if self._pipeline_type == PipelineType.APP
            else svc_pipeline_table_name
        )
        self._id_key = (
            "id" if self._pipeline_type == PipelineType.SERVICE else "pipelineId"
        )
        self._alarm_dao = PipelineAlarmDao(self._pipeline_table_name)
        self._alarm_info = self._alarm_dao.get_alarm_metric_info_by_pipeline_id(
            pipeline_id, id_key=self._id_key
        )
        self._metadata_table = DynamoDBUtil(table_name=metadata_table_name)

    def _get_sns_topic_arn(self, custom_sns_topic_name: str = ""):
        """This function will determine to generate a new sns topic or use existed one.
        If the input sns_topic_arn is not null, return this sns_topic_arn and sns name directly,
        if the input emails is not null, create a new sns topic and send this sns topic to these emails,
        if emails == null and sns_topic_arn == null, this only will happen in the case that there already
        has an existed sns topic, do nothing only find and return sns name and arn directly

        Return: sns_name, sns_arn
        """
        # If user has chosen an existed sns_topic_arn, then directly return this arn
        if self._sns_topic_arn:
            topic_name = self._sns_topic_arn.split(":")[-1]
            return topic_name, self._sns_topic_arn

        # Determine if need to create a new sns topic or update an existed sns topic
        if custom_sns_topic_name:
            topic_name = custom_sns_topic_name + "_" + self._pipeline_id[:8]
        else:
            topic_name = stack_prefix + "_" + self._pipeline_id[:8]

        # Check if there already has a sns topic for this pipeline
        response = self._sns_client.list_topics()
        topics = response["Topics"]
        topic_arn = None
        for topic in topics:
            if topic["TopicArn"].split(":")[-1] == topic_name:
                topic_arn = topic["TopicArn"]
                break
        # Update the existed sns topic
        if topic_arn:
            logger.info("Find out the existed sns topic %s" % topic_arn)
            if self._emails == "":
                topic_name = topic_arn.split(":")[-1]
                return topic_name, topic_arn
            # Remove all the existed subscriptions first
            self._unsubscribe_sns_topic(topic_arn)
            # Add new emails
            for email in self._emails.split(","):
                self._sns_client.subscribe(
                    TopicArn=topic_arn,
                    Protocol="email",
                    Endpoint=email,
                )
        # Create a new sns topic
        else:
            logger.info("Can not find the existed sns topic, create a new one")
            response = self._sns_client.create_topic(Name=topic_name)
            topic_arn = response["TopicArn"]
            for email in self._emails.split(","):
                self._sns_client.subscribe(
                    TopicArn=topic_arn,
                    Protocol="email",
                    Endpoint=email,
                )

        # Get the topic name from topic arn
        topic_name = topic_arn.split(":")[-1]
        return topic_name, topic_arn

    def _unsubscribe_sns_topic(self, sns_topic_arn) -> None:
        """Unsubscribe all the subscriptions for this sns topic"""
        response = self._sns_client.list_subscriptions_by_topic(TopicArn=sns_topic_arn)
        subscriptions = response["Subscriptions"]
        for subscription in subscriptions:
            if subscription["SubscriptionArn"] == "PendingConfirmation":
                continue
            self._sns_client.unsubscribe(
                SubscriptionArn=subscription["SubscriptionArn"]
            )

    def create_single_alarm(
        self,
        alarm_name: str,
        namespace: str,
        metric_name: str,
        statistic: any,
        dimensions: any,
        period: int,
        unit: str,
        evaluation_periods: int,
        threshold: any,
        comparison_operator: str,
    ):
        """Create a cloudwatch alarm"""
        logger.info(
            "Create cloudwatch alarm %s for pipeline: %s"
            % (alarm_name, self._pipeline_id)
        )
        self._cwl_client.put_metric_alarm(
            AlarmName=alarm_name,
            AlarmDescription=str(stack_prefix + "_" + alarm_name),
            ActionsEnabled=True,
            OKActions=[],
            AlarmActions=[self._sns_topic_arn],
            MetricName=metric_name,
            Namespace=namespace,
            Statistic=statistic,
            Dimensions=dimensions,
            Period=period,
            **{"Unit": unit} if unit else {},
            EvaluationPeriods=evaluation_periods,
            Threshold=threshold,
            ComparisonOperator=comparison_operator,
        )

    def _create_lambda_error_rate_alarm(
        self,
        lambda_function_name,
        alarm_name,
        period=60,  # Default to 5 minutes
        evaluation_periods=5,
        threshold=0.5,  # Default to 50% error rate
        alarm_actions=None,
    ):
        """
        Creates a CloudWatch alarm for monitoring the error rate of a Lambda function.

        This function sets up a CloudWatch alarm that triggers when the error rate of the specified Lambda function exceeds the given threshold over the specified evaluation period.

        Args:
            self (object): The instance of the class.
            lambda_function_name (str): The name of the Lambda function to monitor.
            alarm_name (str): The name of the CloudWatch alarm.
            period (int, optional): The time in seconds over which the specified statistic is applied. Defaults to 60 seconds (1 minute).
            evaluation_periods (int, optional): The number of periods over which data is compared to the specified threshold. Defaults to 5.
            threshold (float, optional): The error rate threshold, expressed as a decimal value, at which the alarm will trigger. Defaults to 0.5 (50% error rate).
            alarm_actions (list, optional): A list of AWS Resource Names (ARNs) for the actions to perform when the alarm is triggered. Defaults to an empty list.

        Returns:
            dict: The response from the `put_metric_alarm` operation, which includes details about the created CloudWatch alarm.
        """
        if alarm_actions is None:
            alarm_actions = []

        # Calculate the alarm description
        threshold_percentage = threshold * 100
        period_minutes = period * evaluation_periods / 60
        alarm_description = f"Alarm when Lambda error rate exceeds {threshold_percentage}% in {period_minutes} minutes"

        # Create the CloudWatch alarm
        response = self._cwl_client.put_metric_alarm(
            AlarmName=alarm_name,
            AlarmDescription=alarm_description,
            ActionsEnabled=True,
            AlarmActions=alarm_actions,
            EvaluationPeriods=evaluation_periods,
            DatapointsToAlarm=evaluation_periods,
            Threshold=threshold,
            ComparisonOperator="GreaterThanOrEqualToThreshold",
            TreatMissingData="notBreaching",
            Metrics=[
                {
                    "Id": "errors",
                    "MetricStat": {
                        "Metric": {
                            "Namespace": "AWS/Lambda",  # NOSONAR
                            "MetricName": "Errors",
                            "Dimensions": [
                                {"Name": "FunctionName", "Value": lambda_function_name}
                            ],
                        },
                        "Period": period,
                        "Stat": "Sum",
                    },
                    "ReturnData": False,
                },
                {
                    "Id": "invocations",
                    "MetricStat": {
                        "Metric": {
                            "Namespace": "AWS/Lambda",  # NOSONAR
                            "MetricName": "Invocations",
                            "Dimensions": [
                                {"Name": "FunctionName", "Value": lambda_function_name}
                            ],
                        },
                        "Period": period,
                        "Stat": "Sum",
                    },
                    "ReturnData": False,
                },
                {
                    "Id": "errorRate",
                    "Expression": "errors / invocations",
                    "Label": "ErrorRate",
                    "ReturnData": True,
                },
            ],
        )

        return response

    def create_alarms(self, custom_sns_topic_name: str = "") -> None:
        """Create all alarms for a specific pipeline"""
        # First to get the sns topic arn

        sns_topic_name, self._sns_topic_arn = self._get_sns_topic_arn(
            custom_sns_topic_name
        )

        if "processorLogGroupName" in self._alarm_info:
            self._create_lambda_error_rate_alarm(
                alarm_name=self.generate_alarm_name(
                    PipelineAlarmType.PROCESSOR_ERROR_RATE_ALARM
                ),
                lambda_function_name=self._alarm_info["processorFnName"],
                alarm_actions=[THROTTLE_LAMBDA_ARN],
            )

        alarm_configs = self.generate_alarm_configs()
        for alarm_config in alarm_configs:
            self.create_single_alarm(
                alarm_config["alarm_name"],
                alarm_config["namespace"],
                alarm_config["metric_name"],
                alarm_config["statistic"],
                alarm_config["dimensions"],
                alarm_config["period"],
                alarm_config["unit"],
                alarm_config["evaluation_periods"],
                alarm_config["threshold"],
                alarm_config["comparison_operator"],
            )
        # Update the alarm status in pipeline table
        self._alarm_dao.update_pipeline_alarm_status(
            self._pipeline_id,
            PipelineAlarmStatus.ENABLED,
            sns_topic_name,
            self._sns_topic_arn,
            self._emails,
            id_key=self._id_key,
        )

        self.update_light_engine_notification(
            recipients=self._sns_topic_arn, service="SNS"
        )

    def delete_alarms(self) -> None:
        """Delete all alarms"""
        self.generate_alarm_configs()
        self._cwl_client.delete_alarms(
            AlarmNames=(
                [
                    self.generate_alarm_name(
                        PipelineAlarmType.PROCESSOR_ERROR_RATE_ALARM
                    ),
                    self.generate_alarm_name(
                        PipelineAlarmType.OLDEST_MESSAGE_AGE_ALARM
                    ),
                ]
                + self._alarm_names
            )
        )

        # Update the alarm status in pipeline table
        self._alarm_dao.update_pipeline_alarm_status(
            self._pipeline_id,
            status=PipelineAlarmStatus.DISABLED,
            id_key=self._id_key,
        )

        self.update_light_engine_notification(
            recipients=self._sns_topic_arn, service="SNS"
        )

    def update_alarms(self) -> None:
        """Update alarms
        Currently only support to update the sns destination
        """

        # For this case, self._sns_topic_arn can not be empty
        sns_topic_name, sns_topic_arn = self._get_sns_topic_arn()
        current_sns_topic_arn = self._alarm_dao.get_pipeline_alarm_status(
            self._pipeline_id,
            id_key=self._id_key,
        ).get("snsTopicArn")
        if current_sns_topic_arn == sns_topic_arn:
            logger.info("No need to update the sns topic arn")
            return

        alarm_configs = self.generate_alarm_configs()
        for alarm_config in alarm_configs:
            # Get current alarm config
            response = self._cwl_client.describe_alarms(
                AlarmNames=[alarm_config["alarm_name"]]
            )
            current_alarm_config = response["MetricAlarms"][0]

            updated_alarm_config = current_alarm_config.copy()
            updated_alarm_config["AlarmActions"] = [sns_topic_arn]

            # Update the alarm config
            self._cwl_client.put_metric_alarm(
                AlarmName=alarm_config["alarm_name"],
                AlarmActions=[sns_topic_arn],
                ActionsEnabled=True,
                MetricName=current_alarm_config["MetricName"],
                Namespace=current_alarm_config["Namespace"],
                Statistic=current_alarm_config["Statistic"],
                Dimensions=current_alarm_config["Dimensions"],
                Period=current_alarm_config["Period"],
                EvaluationPeriods=current_alarm_config["EvaluationPeriods"],
                ComparisonOperator=current_alarm_config["ComparisonOperator"],
                Threshold=current_alarm_config["Threshold"],
                OKActions=current_alarm_config.get("OKActions", []),
                **(
                    {"Unit": current_alarm_config.get("Unit")}
                    if current_alarm_config.get("Unit")
                    else {}
                ),
            )

        # Update the alarm status in pipeline ddb table
        self._alarm_dao.update_pipeline_alarm_status(
            self._pipeline_id,
            PipelineAlarmStatus.ENABLED,
            sns_topic_name,
            sns_topic_arn,
            self._emails,
            id_key=self._id_key,
        )

        self.update_light_engine_notification(
            recipients=self._sns_topic_arn, service="SNS"
        )

    def get_alarms(self, alarm_name: str) -> dict:
        """Get all alarms for a specific pipeline"""
        alarm_metric_details = []

        # Handle ingestion level alarms
        if alarm_name in [PipelineAlarmType.FLUENTBIT_OUTPUT_RETRIED_RECORDS_ALARM]:
            ingestion_ids = self.get_ingestion_ids(self._pipeline_id)
            for ingestion_id in ingestion_ids:
                _alarm_name = self.generate_alarm_name(
                    PipelineAlarmType.FLUENTBIT_OUTPUT_RETRIED_RECORDS_ALARM,
                    ingestion_id[:5],
                )

                response = self._cwl_client.describe_alarms(AlarmNames=[_alarm_name])
                if response["MetricAlarms"]:
                    alarm_status = response["MetricAlarms"][0]["StateValue"]
                    alarm_metric_details.append(
                        {
                            "resourceId": ingestion_id,
                            "name": alarm_name,
                            "status": alarm_status,
                        }
                    )
        else:
            # Handle pipeline level alarms
            _alarm_name = self.generate_alarm_name(alarm_name)

            response = self._cwl_client.describe_alarms(AlarmNames=[_alarm_name])

            if response["MetricAlarms"]:
                alarm_status = response["MetricAlarms"][0]["StateValue"]
                alarm_metric_details.append(
                    {
                        "resourceId": self._pipeline_id,
                        "name": alarm_name,
                        "status": alarm_status,
                    }
                )
        return {"alarms": alarm_metric_details}

    def generate_alarm_configs(self) -> list:
        """Generate alarm config for service pipeline"""
        alarm_configs = []

        # If pipeline has a sqs queue, then create a SQS Oldest Message Age alarm
        # SQS Oldest Message Age alarm > 30 mins(if have)
        if "logEventQueueName" in self._alarm_info:
            log_event_queue_name = self._alarm_info["logEventQueueName"]
            alarm_config = {
                "alarm_name": self.generate_alarm_name(
                    PipelineAlarmType.DEAD_LETTER_INVOCATIONS
                ),
                "namespace": "AWS/Events",
                "metric_name": "DeadLetterInvocations",
                "statistic": "Sum",
                "dimensions": [
                    {
                        "Name": "QueueName",
                        "Value": log_event_queue_name,
                    },
                ],
                "period": EVT_DEAD_LETTER_INVOCATIONS_PERIOD,
                "evaluation_periods": 1,
                "threshold": EVT_DEAD_LETTER_INVOCATIONS_THRESHOLD,
                "unit": "",
                "comparison_operator": "GreaterThanOrEqualToThreshold",
            }
            alarm_configs.append(alarm_config)
            self._alarm_names.append(alarm_config["alarm_name"])

        # If pipeline has a processor lambda, then create processor related alarms
        if "processorLogGroupName" in self._alarm_info:
            # Processor error record alarm, 1 error recorded in last 5 minutes
            alarm_config = {
                "alarm_name": self.generate_alarm_name(
                    PipelineAlarmType.PROCESSOR_ERROR_RECORD_ALARM
                ),
                "namespace": NAME_SPACE_PREFIX + stack_prefix,
                "metric_name": "FailedLogs",
                "statistic": "Sum",
                "dimensions": [
                    {
                        "Name": "StackName",
                        "Value": self._alarm_info["stackName"],
                    },
                ],
                "period": PROCESSOR_ERROR_RECORD_PERIOD,
                "evaluation_periods": 1,
                "threshold": PROCESSOR_ERROR_RECORD_THRESHOLD_COUNT,
                "unit": "",  # unit must match the metric's unit
                "comparison_operator": "GreaterThanOrEqualToThreshold",
            }
            alarm_configs.append(alarm_config)
            self._alarm_names.append(alarm_config["alarm_name"])

            # Average execution duration alarm, average execution duration in last 5 minutes >= 60000 milliseconds
            alarm_config = {
                "alarm_name": self.generate_alarm_name(
                    PipelineAlarmType.PROCESSOR_DURATION_ALARM
                ),
                "namespace": "AWS/Lambda",  # NOSONAR
                "metric_name": "Duration",
                "statistic": "Average",
                "dimensions": [
                    {
                        "Name": "FunctionName",
                        "Value": self._alarm_info["processorFnName"],
                    },
                ],
                "period": PROCESSOR_ERROR_RECORD_PERIOD,
                "evaluation_periods": 1,
                "threshold": PROCESSOR_DURATION_THRESHOLD_MILLISECONDS,
                "unit": "Milliseconds",
                "comparison_operator": "GreaterThanOrEqualToThreshold",
            }
            alarm_configs.append(alarm_config)
            self._alarm_names.append(alarm_config["alarm_name"])

        # If pipeline has a KDS buffer, then create KDS related alarms
        # KDS PutRecord throttled alarm, average 10% in last 1 minute (if have)
        if (
            self._pipeline_type == PipelineType.SERVICE
            or (
                self._pipeline_type == PipelineType.APP
                and self._alarm_info.get("bufferType") == BufferTypeEnum.KDS
            )
        ) and ("bufferResourceName" in self._alarm_info):
            alarm_config = {
                "alarm_name": self.generate_alarm_name(
                    PipelineAlarmType.KDS_THROTTLED_RECORDS_ALARM
                ),
                "namespace": "AWS/Kinesis",
                "metric_name": "PutRecords.ThrottledRecords",
                "statistic": "Average",
                "dimensions": [
                    {
                        "Name": "StreamName",
                        "Value": self._alarm_info["bufferResourceName"],
                    },
                ],
                "period": KDS_PUT_THROTTLED_PERIOD,
                "evaluation_periods": 1,
                "threshold": KDS_PUT_THROTTLED_THRESHOLD_PERCENT,
                "unit": "Percent",
                "comparison_operator": "GreaterThanOrEqualToThreshold",
            }
            alarm_configs.append(alarm_config)
            self._alarm_names.append(alarm_config["alarm_name"])

        # If pipeline has Fluent-bit agent, then create Fluent-bit related alarms
        # here we create fluent-bit alarm for all app pipeline, including S3 source.
        # Fluent-bit output retried records alarm, count FLB_OUTPUT_RETRY_THRESHOLD in last 5 minutes (if have)
        if self._pipeline_type == PipelineType.APP:
            # Fluent-bit alarm is in ingestion level
            ingestion_ids = self.get_ingestion_ids(self._pipeline_id)
            for ingestion_id in ingestion_ids:
                alarm_config = {
                    "alarm_name": self.generate_alarm_name(
                        PipelineAlarmType.FLUENTBIT_OUTPUT_RETRIED_RECORDS_ALARM,
                        ingestion_id[:5],
                    ),
                    "namespace": NAME_SPACE_PREFIX + stack_prefix + "/FluentBit",
                    "metric_name": "OutputRetriedRecords",
                    "statistic": "Sum",
                    "dimensions": [
                        {
                            "Name": "IngestionId",
                            "Value": ingestion_id + "_output",
                        },
                    ],
                    "period": 300,
                    "evaluation_periods": 1,
                    "threshold": FLB_OUTPUT_RETRY_THRESHOLD_COUNT,
                    "unit": "",
                    "comparison_operator": "GreaterThanOrEqualToThreshold",
                }
                alarm_configs.append(alarm_config)
                self._alarm_names.append(alarm_config["alarm_name"])

        return alarm_configs

    def get_ingestion_ids(self, pipeline_id: str):
        """
        This function will get the ingestion ids from app pipeline table
        """
        ingestion_ids = []

        conditions = Attr("status").is_in(["ACTIVE", "CREATING"])
        conditions = conditions.__and__(Attr("appPipelineId").eq(pipeline_id))

        app_log_ingestion_table = dynamodb.Table(app_log_ingestion_table_name)

        response = app_log_ingestion_table.scan(
            FilterExpression=conditions,
            ProjectionExpression="#id, appPipelineId, sourceType, #s",
            ExpressionAttributeNames={
                "#id": "id",
                "#s": "status",
            },
        )

        for item in response["Items"]:
            if item.get("sourceType") in [
                LogSourceTypeEnum.EC2,
                LogSourceTypeEnum.EKSCluster,
            ]:
                ingestion_ids.append(item["id"])

        return ingestion_ids

    def generate_alarm_name(self, alarm_type: str, name_suffix: str = "") -> str:
        """
        This function will generate alarm name
        """
        suffix = "" if name_suffix == "" else "-" + name_suffix
        return (
            stack_prefix + "-pipe-" + self._pipeline_id[:8] + "-" + alarm_type + suffix
        )

    def update_light_engine_notification(self, recipients: str, service: str = "SNS"):
        if self._alarm_info["engineType"] == EngineType.OPEN_SEARCH:
            return

        pipeline_info = self._metadata_table.get_item(
            key={"metaName": self._pipeline_id}
        )
        if pipeline_info:
            data = pipeline_info.get("data", {})
            if data:
                data["notification"] = {"recipients": recipients, "service": service}
                self._metadata_table.update_item(
                    key={"metaName": self._pipeline_id}, attributes_map={"data": data}
                )
