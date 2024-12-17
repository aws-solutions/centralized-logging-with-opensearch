# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import os
import re
import json
from typing import Union
from prettytable import PrettyTable
from utils.aws import SNSClient, SESClient
from utils.helpers import logger, ValidateParameters
from utils.models.etllog import ETLLogTable
from utils.models.meta import MetaTable


AWS_DDB_META = MetaTable()
AWS_DDB_ETL_LOG = ETLLogTable()


class Parameters(ValidateParameters):
    """This class is used to parse ,validate and store all incoming parameters.

    !!!Case sensitive!!!
    """

    email_regex = (
        r"^[a-zA-Z0-9_-]+(\.[a-zA-Z0-9_-]+){0,4}@[a-zA-Z0-9_-]+(\.[a-zA-Z0-9_-]+){0,4}$"
    )
    sns_arn_regex = r"^arn:([^:\n]*):sns:([^:\n]*):(\d{12}):(.*)$"

    def _required_parameter_check_for_ses(self, parameters) -> None:
        self._child_parameter_lookup_check(parameters, keys=("source", "emailTemplate"))

        self.source = parameters["source"]
        if not re.match(self.email_regex, self.source):
            raise ValueError(f"Source {self.source} is a invalid email address.")

        if not isinstance(parameters["notification"]["recipients"], list):
            raise ValueError("The parameters notification is not a list.")

        recipients = []
        for address in self.notification["recipients"]:
            if re.match(self.email_regex, address):
                recipients.append(address)

        self.recipients = recipients
        self.ses_email_template = parameters["emailTemplate"]

    def _required_parameter_check_for_sns(self, parameters) -> None:
        if re.match(self.sns_arn_regex, parameters["notification"]["recipients"]):
            self.topic_arn = parameters["notification"]["recipients"]
        else:
            self.topic_arn = ""

    def _required_parameter_check(self, parameters) -> None:
        """Required parameter verification, when the parameter does not exist, an exception message will be returned."""
        self._child_parameter_lookup_check(
            parameters,
            keys=(
                "stateMachineId",
                "stateMachineName",
                "stateName",
                "pipelineId",
                "tableName",
                "scheduleType",
                "sourceType",
                "executionId",
                "notification",
                "archivePath",
                "executionName",
                "status",
            ),
        )

        self.notification = parameters["notification"]
        if not isinstance(self.notification, dict):
            raise TypeError("The parameters notification is not a dict.")

        for required_param in ("service", "recipients"):
            if required_param not in self.notification.keys():
                raise ValueError(
                    f"Missing required key: {required_param} in notification."
                )

        self.notification_service = self.notification["service"].upper()
        self.state_machine_id = parameters["stateMachineId"]
        self.state_machine_name = parameters["stateMachineName"]
        self.state_name = parameters["stateName"]
        self.execution_id = parameters["executionId"]
        self.execution_name = parameters["executionName"]
        self.table_name = parameters["tableName"]
        self.schedule_type = parameters["scheduleType"]
        self.pipeline_id = parameters["pipelineId"]
        self.source_type = parameters["sourceType"]
        self.status = parameters["status"]

        if self.notification_service == "SES":
            self._required_parameter_check_for_ses(parameters=parameters)
        elif self.notification_service == "SNS":
            self._required_parameter_check_for_sns(parameters=parameters)

        self.archive_path = parameters["archivePath"]
        self.logs = []

    def _optional_parameter_check(self, parameters) -> None:
        """Optional parameter verification, when the parameter does not exist or is illegal, supplement the default value."""
        self.api = self._get_parameter_value(parameters.get("API"), str, "SNS: Publish")
        self.metadata = self._get_parameter_value(parameters.get("metadata"), dict, {})
        self.state_machine_url = self.get_state_machine_url(self.state_machine_id)
        self.execution_url = self.get_execution_url(self.execution_id)

    def get_state_machine_url(self, state_machine_id):
        state_machine_region = state_machine_id.split(":")[3]
        state_machine_url = (
            f"{AWS_DDB_META.aws_console_url}/states/home?"
            f"region={state_machine_region}#/statemachines/view/{state_machine_id}"
        )
        return state_machine_url

    def get_execution_url(self, execution_id):
        execution_region = execution_id.split(":")[3]
        execution_url = (
            f"{AWS_DDB_META.aws_console_url}/states/home?"
            f"region={execution_region}#/v2/executions/details/{execution_id}"
        )
        return execution_url


def lambda_handler(event, _) -> Union[dict, None]:
    logger.info(f"Received request: {json.dumps(event)}")
    if not isinstance(event, dict):
        raise ValueError("The event is not a dict.")

    source = os.environ.get("SOURCE")
    ses_email_template = AWS_DDB_META.get(meta_name="SimpleEmailServiceTemplate")[
        "value"
    ]
    notification_priority = os.environ.get("NOTIFICATION_PRIORITY", "Pipeline")

    for record in event.get("Records", []):
        data = json.loads(record["Sns"]["Message"])

        data["source"] = source
        data["emailTemplate"] = ses_email_template

        notification_in_pipeline = get_notification_from_pipeline(
            pipeline_id=data.get("pipelineId", "")
        )
        if notification_priority == "Pipeline":
            data["notification"] = notification_in_pipeline

        param = Parameters(data)
        logger.info(
            f"The parameters: stateMachineId: {param.state_machine_id}, stateMachineName: {param.state_machine_name}, "
            f"stateName: {param.state_name}, executionId: {param.execution_id}, executionName: {param.execution_name}, pipelineId: {param.pipeline_id}, "
            f"sourceType: {param.source_type}, archivePath: {param.archive_path}, API: {param.api}, metadata: {param.metadata}."
        )
        logger.info(f"The state machine url is {param.state_machine_url}.")
        logger.info(f"The execution url is {param.execution_url}.")

        logger.info(
            f"Query etl logs in DynamoDB, executionName: {param.execution_name}."
        )
        param.logs = sorted(
            list(
                AWS_DDB_ETL_LOG.query_subtasks(
                    execution_name=param.execution_name,
                    parent_task_id="00000000-0000-0000-0000-000000000000",
                )
            ),
            key=lambda key: key["startTime"],
        )
        logger.debug(param.logs)

        if param.notification_service == "SES":
            return send_email_via_ses(parameters=param)
        elif param.notification_service == "SNS":
            return send_email_via_sns(parameters=param)
        else:
            logger.info(
                f"Unsupported notification service: {param.notification_service}, nothing to do."
            )


def get_notification_from_pipeline(pipeline_id: str) -> dict:
    default_notification = {"service": "SES", "recipients": []}

    pipeline_info = AWS_DDB_META.get(meta_name=pipeline_id)
    if pipeline_info:
        notification = pipeline_info.get("data", {}).get(
            "notification", default_notification
        )

        if notification["service"] == "SES":
            notification["recipients"] = notification["recipients"].split(",")
        return notification
    return default_notification


def send_email_via_sns(parameters: Parameters) -> Union[dict, None]:
    if not parameters.topic_arn:
        logger.info(f"Topic arn is empty, do nothing.")
        return

    sns_client = SNSClient()

    contents = [
        "Hello",
        f"You are receiving this follow-up notification because you have one or more {parameters.state_machine_name} tasks {parameters.status} to execute.",
        "",
        f"- App Pipeline Id: {parameters.pipeline_id}",
        f"- Table Name: {parameters.table_name}",
        f"- Schedule Type: {parameters.schedule_type}",
        f"- State Machines URL: {parameters.state_machine_url}",
        f"- Execution URL: {parameters.execution_url}",
        "",
    ]

    if parameters.logs:
        logs_table = PrettyTable(
            field_names=["stateName", "API", "startTime", "endTime", "status"], hrules=1
        )
        for log in parameters.logs:
            logs_table.add_row(
                [
                    log["stateName"],
                    log["API"],
                    log["startTime"],
                    log["endTime"],
                    log["status"],
                ]
            )

        contents.append(logs_table.get_string())

    if parameters.archive_path:
        contents.append("")
        contents.append(
            "Objects will be deleted after a few days, so please check these logs as soon as possible, you can find them in the following buckets."
        )
        contents.append(f"S3 Bucket URL: {parameters.archive_path}")

    response = sns_client.publish(
        arn=parameters.topic_arn,
        message="\n".join(contents),
        subject=f"[Notification] {parameters.state_machine_name} task FAILED to execute.",
    )
    logger.info(f"SNS Response: {response}")
    return response


def send_email_via_ses(parameters: Parameters) -> Union[dict, None]:
    if not parameters.recipients:
        logger.info(f"Recipients is empty, do nothing.")
        return

    ses_client = SESClient()

    msg = {
        "stateMachine": {
            "id": parameters.state_machine_id,
            "name": parameters.state_machine_name,
            "status": parameters.status,
            "url": parameters.state_machine_url,
        },
        "execution": {
            "id": parameters.execution_id,
            "name": parameters.execution_name,
            "url": parameters.execution_url,
        },
        "pipeline": {
            "id": parameters.pipeline_id,
            "tableName": parameters.table_name,
            "scheduleType": parameters.schedule_type,
            "type": parameters.source_type,
        },
        "archivePath": parameters.archive_path,
        "logs": parameters.logs,
    }

    logger.info(
        f"Sending template email via SES, from: {parameters.source}, to: {parameters.recipients}, "
        f"template: {parameters.ses_email_template}."
    )

    response = ses_client.send_templated_email(
        source=parameters.source,
        to=parameters.recipients,
        template=parameters.ses_email_template,
        data=msg,
    )
    logger.info(f"SES Response: {response}")
    return response
