# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0
import os
import json
from commonlib.logging import get_logger

from commonlib import AWSConnection
from commonlib.model import PipelineAlarmStatus, PipelineType, PipelineMonitorStatus
from util.pipeline_helper import StackErrorHelper
from commonlib.solution_metrics import send_metrics

logger = get_logger(__name__)

conn = AWSConnection()

dynamodb = conn.get_client("dynamodb", client_type="resource")
pipeline_table_name = os.environ.get("PIPELINE_TABLE_NAME")
pipeline_table = dynamodb.Table(pipeline_table_name)


def lambda_handler(event, _):
    # logger.info("Received event: " + json.dumps(event["event"], indent=2))
    try:
        args = event["args"]
        result = event["result"]
        pipeline_id = event["id"]

        resp = pipeline_table.get_item(
            Key={
                "id": pipeline_id,
            }
        )
        logger.info(resp)
        if "Item" not in resp:
            raise RuntimeError("Pipeline Not Found")
        item = resp["Item"]

        update_status(pipeline_id, args, result, item)

        send_anonymous_metrics(pipeline_id, result, item)

        if "monitor" in item:
            if (
                item["monitor"].get("pipelineAlarmStatus")
                == PipelineAlarmStatus.ENABLED
                and result["stackStatus"] == "CREATE_COMPLETE"
            ):
                logger.info("Triggering Create Pipeline Alarm")
                # Flow to alarm creation step in cfn-flow sfn
                return {
                    "alarmAction": "createPipelineAlarm",
                    "info": {"fieldName": "createPipelineAlarm"},
                    "arguments": {
                        "pipelineId": pipeline_id,
                        "pipelineType": PipelineType.SERVICE,
                        "snsTopicArn": item["monitor"].get("snsTopicArn"),
                        "snsTopicName": item["monitor"].get("snsTopicName"),
                        "emails": item["monitor"].get("emails"),
                    },
                }
            elif (
                item["monitor"].get("pipelineAlarmStatus")
                == PipelineAlarmStatus.ENABLED
                and result["stackStatus"] == "DELETE_COMPLETE"
            ):
                logger.info("Triggering Delete Pipeline Alarm")
                # Flow to alarm deletion step in cfn-flow sfn
                return {
                    "alarmAction": "deletePipelineAlarm",
                    "info": {"fieldName": "deletePipelineAlarm"},
                    "arguments": {
                        "pipelineId": pipeline_id,
                        "pipelineType": PipelineType.SERVICE,
                        "snsTopicArn": item["monitor"].get("snsTopicArn"),
                        "emails": item["monitor"].get("emails"),
                    },
                }

    except Exception as err:
        logger.error(err)
        logger.error("Invalid Request received: " + json.dumps(event, indent=2))
        raise RuntimeError("Unable to update service pipeline")

    return {
        "alarmAction": "",
    }


def update_status(pipeline_id: str, args, result, item):
    logger.info("Update Pipeline Status in DynamoDB")

    # Extract information from result dictionary
    stack_status = result["stackStatus"]
    stack_id = result["stackId"]
    outputs = result["outputs"]

    # Get parameters or an empty list
    parameters = args.get("parameters", [])

    # Initialize monitor dictionary
    monitor = item.get("monitor", {})
    monitor["status"] = PipelineMonitorStatus.ENABLED

    # Define key-value mappings for parameters and outputs
    parameters_mapping = {"backupBucketName": ""}
    outputs_mapping = {
        "ProcessorLogGroupName": "",
        "LogEventQueueName": "",
        "LogEventQueueArn": "",
        "BufferResourceName": "",
        "BufferResourceArn": "",
        "DeliveryStreamName": "",
        "DeliveryStreamArn": "",
    }

    # Helper function to update values from parameters or outputs
    def update_values(data, mapping):
        for item in data:
            key = (
                item.get("ParameterKey", "")
                if "ParameterKey" in item
                else item.get("OutputKey", "")
            )
            if key in mapping:
                mapping[key] = (
                    item.get("ParameterValue", "")
                    if "ParameterValue" in item
                    else item.get("OutputValue", "")
                )
        return mapping

    # Update values from parameters and outputs
    parameters_mapping = update_values(parameters, parameters_mapping)
    outputs_mapping = update_values(outputs, outputs_mapping)

    # Update monitor
    monitor["backupBucketName"] = parameters_mapping["backupBucketName"]

    # Define status mapping
    status_mapping = {
        "CREATE_COMPLETE": "ACTIVE",
        "DELETE_COMPLETE": "INACTIVE",
    }

    # Update status and error based on stack_status
    status = status_mapping.get(stack_status, "ERROR")
    error = get_earliest_error_event(stack_id) if status == "ERROR" else ""

    # Construct update expression and attribute values
    update_expr, attr_values = construct_update_expr_attr_values(
        outputs_mapping, monitor, stack_id, status, error
    )

    # Update item in pipeline table
    pipeline_table.update_item(
        Key={"id": pipeline_id},
        UpdateExpression=update_expr,
        ExpressionAttributeNames={
            "#status": "status",
            "#error": "error",
        },
        ExpressionAttributeValues=attr_values,
    )


# Helper function to construct update expression and attribute values
def construct_update_expr_attr_values(
    outputs_mapping, monitor, stack_id, status, error
):
    update_expr = (
        "SET #status = :s, stackId = :sid, #error = :err, monitor = :m"
        ", processorLogGroupName = :processorGroup"
        ", logEventQueueName = :logEventQueueName, logEventQueueArn = :logEventQueueArn"
        ", bufferResourceName = :bufferResourceName, bufferResourceArn = :bufferResourceArn"
        ", deliveryStreamName = :deliveryStreamName, deliveryStreamArn = :deliveryStreamArn"
    )

    attr_values = {
        ":s": status,
        ":sid": stack_id,
        ":err": error,
        ":m": monitor,
        ":processorGroup": outputs_mapping["ProcessorLogGroupName"],
        ":logEventQueueName": outputs_mapping["LogEventQueueName"],
        ":logEventQueueArn": outputs_mapping["LogEventQueueArn"],
        ":bufferResourceName": outputs_mapping["BufferResourceName"],
        ":bufferResourceArn": outputs_mapping["BufferResourceArn"],
        ":deliveryStreamName": outputs_mapping["DeliveryStreamName"],
        ":deliveryStreamArn": outputs_mapping["DeliveryStreamArn"],
    }

    return update_expr, attr_values


def get_earliest_error_event(stack_id: str):
    """
    Input:
        stack_id: string
    Output:
        error_message: "xxxxx"
    """
    stack_error_helper = StackErrorHelper(stack_id)
    return stack_error_helper.get_cfn_stack_earliest_error_event()

def send_anonymous_metrics(pipeline_id: str, result, item):
    metrics_data = {}
    metrics_data["metricType"] = "PIPELINE_MANAGEMENT"
    metrics_data["pipelineType"] = "Service"
    metrics_data["status"] = result.get("stackStatus", "")
    metrics_data["region"] = os.environ.get("AWS_REGION")
    metrics_data["pipelineId"] = pipeline_id
    
    metrics_data["sourceType"] = item.get("type", "")
    metrics_data["engineType"] = item.get("engineType", "")
    metrics_data["logSourceType"]= item.get("destinationType", "")
    if item.get("osiParams", {}).get("minCapacity", 0) > 0:
        metrics_data["logProcessorType"] = "OpenSearch Ingestion Service"
    else:
        metrics_data["logProcessorType"] = "AWS Lambda"
    log_source_account_id = next((param['parameterValue'] 
                            for param in item.get("parameters", []) 
                            if param['parameterKey'] == 'logSourceAccountId'), None)        
    is_cross_account_ingestion = log_source_account_id is not None and log_source_account_id != os.environ.get("ACCOUNT_ID")
    metrics_data["isCrossAccountIngestion"] = is_cross_account_ingestion
    send_metrics(metrics_data)
