# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0
import os
import json
from commonlib.logging import get_logger
from datetime import datetime
from commonlib.dao import (
    AppPipelineDao,
    StatusEnum,
)

from commonlib import AWSConnection, AppSyncRouter

logger = get_logger(__name__)

log_type = os.environ.get("LOG_TYPE")
log_processor_name = os.environ["LOG_PROCESSOR_NAME"]
osi_pipeline_id = os.environ.get("OSI_PIPELINE_NAME")
svc_pipeline_table_name = os.environ.get("PIPELINE_TABLE_NAME")
app_pipeline_table_name = os.environ.get("PIPELINE_TABLE_NAME")

conn = AWSConnection()
router = AppSyncRouter()

dynamodb = conn.get_client("dynamodb", client_type="resource")
fn = conn.get_client("lambda")

app_pipeline_dao = AppPipelineDao(table_name=app_pipeline_table_name)

data_format = "%Y-%m-%dT%H:%M:%SZ"
update_expression = "SET #s = :status, #createdAt= :uDt"
created_at = "#createdAt"
status = ":status"

lambda_payload = {"action": "CHECK"}


def lambda_handler(event, _):
    if (
        log_type == "ELB"
        or log_type == "WAF"
        or log_type == "CloudTrail"
        or log_type == "VPCFlow"
    ):
        svc_pipeline_table = dynamodb.Table(svc_pipeline_table_name)
        svc_pipeline_table.update_item(
            Key={"id": osi_pipeline_id},
            UpdateExpression=update_expression,
            ExpressionAttributeNames={
                "#s": "status",
                created_at: "createdAt",
            },
            ExpressionAttributeValues={
                status: "CREATING",
                ":uDt": datetime.utcnow().strftime(data_format),
            },
        )
    else:
        app_pipeline_dao.update_app_pipeline(
            osi_pipeline_id, status=StatusEnum.CREATING
        )
    response = fn.invoke(
        FunctionName=log_processor_name,
        InvocationType="RequestResponse",
        LogType="Tail",
        Payload=json.dumps(lambda_payload),
    )
    payload = response["Payload"].read()
    logger.info(f"response payload is {payload}")
    if payload == b'"Ok"':
        return {"result": "OK", "action": "START"}
    else:
        if "retryTime" in event:
            retry_time = int(event["retryTime"]) + 1
        else:
            retry_time = 1
        return {
            "action": "UPDATE",
            "result": "LogProcessorFn failed to create resources in AOS",
            "retryTime": str(retry_time),
        }
