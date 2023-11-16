# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0
import os
import json
import logging
from datetime import datetime
from abc import ABC, abstractmethod
from commonlib.dao import (
    AppPipelineDao,
    StatusEnum,
)

from commonlib import AWSConnection
from jinja2 import FileSystemLoader, Environment

conn = AWSConnection()

logger = logging.getLogger()
logger.setLevel(logging.INFO)

default_region = os.environ.get("AWS_REGION")

dynamodb = conn.get_client("dynamodb", client_type="resource")

solution_version = os.environ.get("SOLUTION_VERSION", "v1.0.0")
solution_id = os.environ.get("SOLUTION_ID", "SO8025")
backup_bucket_name = os.environ.get("BACKUP_BUCKET_NAME")
log_source_account_id = os.environ.get("LOG_SOURCE_ACCOUNT_ID")
log_source_region = os.environ.get("LOG_SOURCE_REGION")
log_source_account_assume_role = os.environ.get("LOG_SOURCE_ACCOUNT_ASSUME_ROLE")
log_processor_group_name = os.environ.get("LOG_PROCESSOR_GROUP_NAME")
osi_pipeline_id = os.environ.get("OSI_PIPELINE_NAME")
osi_pipeline_name = f"cl-{osi_pipeline_id[:23]}"
svc_pipeline_table_name = os.environ.get("PIPELINE_TABLE_NAME")
app_pipeline_table_name = os.environ.get("PIPELINE_TABLE_NAME")
max_capacity = os.environ.get("MAX_CAPACITY")
min_capacity = os.environ.get("MIN_CAPACITY")
queue_url = os.environ.get("SQS_QUEUE_URL")
pipeline_role_name = os.environ.get("OSI_PROCESSOR_ROLE_NAME")
aos_endpoint = os.environ.get("AOS_ENDPOINT")
aos_index_prefix = os.environ.get("AOS_INDEX")
log_type = os.environ.get("LOG_TYPE")

data_format = "%Y-%m-%dT%H:%M:%SZ"
update_expression = "SET #s = :status, #createdAt= :uDt"
created_at = "#createdAt"
status = ":status"

app_pipeline_dao = AppPipelineDao(table_name=app_pipeline_table_name)

osis = conn.get_client("osis")

template_loader = FileSystemLoader(
    searchpath="./util", encoding="utf-8"
)

template_env = Environment(
    loader=template_loader,
    autoescape=True,
    trim_blocks=True,
    lstrip_blocks=True,
)

class Context:
    def __init__(self, action, result):
        if action == "START":
            self._state = StartState(self, result)
        elif action == "STOP":
            self._state = StopState(self, result)
        elif action == "UPDATE":
            self._state = UpdateState(self, result)
        else:
            self._state = QueryState(self, result)


    def transit(self, state):
        self._state = state

    def run(self):
        return self._state.run()

    def get_state(self):
        return self._state.get_state()


class State(ABC):
    """Base State class"""

    _action = ""

    def __init__(self, context, result):
        self._context = context
        self._result = result

    @abstractmethod
    def run(self):
        """main execution logic

        Returns: A dict contains OSI pipeline status, and error message
        """
        return {
            "osiPipelineStatus": "",
            "error": "",
        }

    def get_state(self):
        return {
            "action": self._action,
            "result": self._result,
        }


class StartState(State):
    _action = "START"

    def run(self):
        status = "CREATE_IN_PROGRESS"
        error = ""
        try:
            create_osi_pipeline()

            # Move to query after start
            self._context.transit(QueryState(self._context, self._result))
        except Exception as e:
            status = "CREATE_FAILED"
            error = str(e)
            # Move to update after failed
            self._context.transit(UpdateState(self._context, self._result))
        return {
            "osiPipelineStatus": status,
            "error": error,
        }


class StopState(State):
    _action = "STOP"

    def run(self):
        status = "DELETE_IN_PROGRESS"
        error = ""

        try:
            delete_osi_pipeline()
            # Move to query after stop
            self._context.transit(QueryState(self._context, self._result))
        except Exception as e:
            status = "DELETE_FAILED"
            error = str(e)
        return {
            "osiPipelineStatus": status,
            "error": error,
        }


class QueryState(State):
    _action = "QUERY"

    def run(self):
        status = "CREATE_IN_PROGRESS"
        error = ""
        status_reason = "UNKNOWN"
        try:
            status, status_reason = get_osi_pipeline_status()
            if status == "ACTIVE":
                # Move to update after failed
                self._context.transit(UpdateState(self._context, self._result))
        except Exception as e:
            status = "QUERY_FAILED"
            error = str(e)
        return {
            "osiPipelineStatus": status,
            "error": error,
            "statusReason": status_reason,
        }
    
class UpdateState(State):
    _action = "UPDATE"

    def run(self):
        status = "UPDATE_SUCCEEDED"
        error = ""
        try:
            update_osi_pipeline_status(self._result)
        except Exception as e:
            status = "UPDATE_FAILED"
            error = str(e)
        return {
            "pipelineStatus": status,
            "error": error
        }


def lambda_handler(event, _):
    """
    It's expected that the event (input) must be in a format of
    {
        'action':  START | STOP | QUERY | UPDATE,

    }
    """
    output = {}
    try:
        action = event["action"]
        result = event["result"] if "result" in event else ""
        ctx = Context(action, result)
        result = ctx.run()
        output = ctx.get_state()
        output["result"] = result

    except Exception as e:
        logger.error(e)
        logger.error("Invalid Request received: " + json.dumps(event, indent=2))

    return output


def create_osi_pipeline():
    logger.info("Start OSI Pipeline Creation")
    template_file = f"./s3_app_osi_pipeline_config_template.conf"
    match log_type:
        case "S3":
            template_file = f"./s3_app_osi_pipeline_config_template.conf"
        case "ELB":
            template_file = f"./elb_osi_pipeline_config_template.conf"
        case "WAF":
            template_file = f"./waf_osi_pipeline_config_template.conf"
        case "CloudTrail":
            template_file = f"./cloudtrail_osi_pipeline_config_template.conf"
        case "VPCFlow":
            template_file = f"./vpc_osi_pipeline_config_template.conf"
        case _:
            template_file = f"./s3_app_osi_pipeline_config_template.conf"
    s3_template = template_env.get_template(template_file)
    params = dict()
    params["pipeline_id"] = osi_pipeline_name
    params["queue_url"] = queue_url
    # Support current account only
    params["pipeline_role_arn"] = f"arn:aws:iam::{log_source_account_id}:role/{pipeline_role_name}"
    params["endpoint"] = "https://" + aos_endpoint
    # SVC index contains logtype but APP does not
    if log_type == "ELB" or log_type == "WAF" or log_type == "CloudTrail" or log_type == "VPCFlow":
        params["index"] = aos_index_prefix + "-" + log_type.lower()
    else:
        params["index"] = aos_index_prefix
    params["region"] = log_source_region
    params["backup_bucket_name"] = backup_bucket_name
    content = s3_template.render(params)
    response = osis.create_pipeline(
        PipelineName=osi_pipeline_name,
        MinUnits=int(min_capacity),
        MaxUnits=int(max_capacity),
        PipelineConfigurationBody=content,
        LogPublishingOptions={
            'IsLoggingEnabled': True,
            'CloudWatchLogDestination': {
                'LogGroup': log_processor_group_name
            }
        }
    )

    if log_type == "ELB" or log_type == "WAF" or log_type == "CloudTrail" or log_type == "VPCFlow":
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
        app_pipeline_dao.update_app_pipeline(osi_pipeline_id, status=StatusEnum.CREATING)

    pipeline = response["Pipeline"]
    if pipeline != None:
        pipeline_name = pipeline["PipelineName"]
    return pipeline_name


def delete_osi_pipeline():
    logger.info("Delete OSI Pipeline")
    osis.delete_pipeline(
        PipelineName=osi_pipeline_name
    )


def get_osi_pipeline_status():
    logger.info("Get OSI pipeline status")
    response = osis.get_pipeline(
        PipelineName=osi_pipeline_name
    )

    pipeline = response["Pipeline"]
    if pipeline != None:
        pipeline_status = pipeline["Status"]
    if pipeline != None:
        status_reason = pipeline["StatusReason"]
        status_reason_description = status_reason["Description"]
    if pipeline_status == "CREATING":
        return "CREATE_IN_PROGRESS", status_reason_description
    return pipeline_status, status_reason_description


def update_osi_pipeline_status(result):
    logger.info("Update OSI pipeline status")
    if "osiPipelineStatus" in result and result["osiPipelineStatus"] == "ACTIVE":
        if log_type == "ELB" or log_type == "WAF" or log_type == "CloudTrail" or log_type == "VPCFlow":
            svc_pipeline_table = dynamodb.Table(svc_pipeline_table_name)
            svc_pipeline_table.update_item(
                Key={"id": osi_pipeline_id},
                UpdateExpression=update_expression,
                ExpressionAttributeNames={
                    "#s": "status",
                    created_at: "createdAt",
                },
                ExpressionAttributeValues={
                    status: "ACTIVE",
                    ":uDt": datetime.utcnow().strftime(data_format),
                },
            )
        else:
            app_pipeline_dao.update_app_pipeline(osi_pipeline_id, status=StatusEnum.ACTIVE)
    else:
        if log_type == "ELB" or log_type == "WAF" or log_type == "CloudTrail" or log_type == "VPCFlow":
            svc_pipeline_table = dynamodb.Table(svc_pipeline_table_name)
            svc_pipeline_table.update_item(
                Key={"id": osi_pipeline_id},
                UpdateExpression="SET #s = :status, #error = :err",
                ExpressionAttributeNames={
                    "#s": "status",
                    "#error": "error",
                },
                ExpressionAttributeValues={
                    status: "ERROR",
                    ":err": result
                },
            )
        else:
            app_pipeline_dao.update_app_pipeline(osi_pipeline_id, error=result, status=StatusEnum.ERROR)