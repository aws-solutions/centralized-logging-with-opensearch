# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import os
import sys
import json
import uuid
import copy
import pytest
from test.mock import (
    mock_ses_context,
    mock_iam_context,
    mock_sqs_context,
    mock_ddb_context,
    mock_sns_context,
    default_environment_variables,
)


sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


class TestParameter:
    def test_required_parameter_check_for_ses(
        self, mock_iam_context, mock_sqs_context, mock_ddb_context, mock_sns_context
    ):
        from send_email.lambda_function import Parameters

        send_email_event = json.loads(os.environ["SEND_EMAIL_EVENT"])
        source = os.environ["SOURCE"]
        ses_email_template = os.environ["SES_EMAIL_TEMPLATE"]

        for required_param in ("source", "emailTemplate"):
            event = copy.deepcopy(send_email_event)
            record = json.loads(event["Records"][0]["Sns"]["Message"])
            record["source"] = source
            record["emailTemplate"] = ses_email_template
            record.pop(required_param, None)
            with pytest.raises(Exception) as exception_info:
                param = Parameters(record)
            assert (
                exception_info.value.args[0] == f"Missing value for {required_param}."
            )

        event = copy.deepcopy(send_email_event)
        record = json.loads(event["Records"][0]["Sns"]["Message"])
        record["source"] = "email#domain.com"
        record["emailTemplate"] = ses_email_template
        with pytest.raises(Exception) as exception_info:
            param = Parameters(record)
        assert (
            exception_info.value.args[0]
            == f"Source {record['source']} is a invalid email address."
        )

        event = copy.deepcopy(send_email_event)
        record = json.loads(event["Records"][0]["Sns"]["Message"])
        record["source"] = source
        record["emailTemplate"] = ses_email_template
        record["notification"] = {"recipients": "test", "service": "SES"}
        with pytest.raises(Exception) as exception_info:
            param = Parameters(record)
        assert (
            exception_info.value.args[0] == "The parameters notification is not a list."
        )

        record["notification"] = {"recipients": [], "service": "SES"}
        param = Parameters(record)
        param._required_parameter_check_for_ses(parameters=record)
        assert param.source == source
        assert param.recipients == []
        assert param.ses_email_template == ses_email_template

        record["notification"] = {
            "recipients": ["email#domain.com", "alejandro_rosalez@example.com"],
            "service": "SES",
        }
        param = Parameters(record)
        param._required_parameter_check_for_ses(parameters=record)
        assert param.source == source
        assert param.recipients == ["alejandro_rosalez@example.com"]
        assert param.ses_email_template == ses_email_template

        event = copy.deepcopy(send_email_event)
        record = json.loads(event["Records"][0]["Sns"]["Message"])
        record["source"] = source
        record["emailTemplate"] = ses_email_template
        param = Parameters(record)
        assert (
            param.state_machine_id
            == "arn:aws:states:us-east-1:123456789012:stateMachine:LogProcessor-HBTz7GoOjZoz"
        )
        assert param.state_machine_name == "LogProcessor-HBTz7GoOjZoz"
        assert param.state_name == "Send Failure Notification"
        assert (
            param.execution_id
            == "arn:aws:states:us-east-1:123456789012:execution:LogProcessor-HBTz7GoOjZoz:1ebf165b-f846-4813-8cab-305be5c8ca7e"
        )
        assert param.execution_name == "1ebf165b-f846-4813-8cab-305be5c8ca7e"
        assert param.pipeline_id == "189f73eb-1808-47e4-a9db-ee9c35100abe"
        assert param.table_name == "aws_alb_logs"
        assert param.schedule_type == "LogProcessor"
        assert param.source_type == "ALB"
        assert param.notification == {
            "service": "SES",
            "recipients": ["alejandro_rosalez@example.com"],
        }
        assert (
            param.archive_path
            == "s3://stagingbucket/archive/aws_alb_logs/elasticloadbalancing/deba876a-6f13-4ac1-bd12-252254b7cd06"
        )
        assert param.status == "Failed"
        assert param.metadata is not None
        assert param.notification_service == "SES"
        assert param.recipients == ["alejandro_rosalez@example.com"]
        assert param.source == source
        assert param.ses_email_template == ses_email_template

    def test_required_parameter_check_for_sns(
        self, mock_iam_context, mock_sqs_context, mock_ddb_context, mock_sns_context
    ):
        from send_email.lambda_function import Parameters

        send_email_event = json.loads(os.environ["SEND_EMAIL_EVENT"])
        receive_failed_topic_arn = os.environ["RECEIVE_STATES_FAILED_TOPIC_ARN"]

        event = copy.deepcopy(send_email_event)
        record = json.loads(event["Records"][0]["Sns"]["Message"])
        record["notification"]["service"] = "sns"
        record["notification"]["recipients"] = "not-an-arn"
        param = Parameters(record)
        assert param.topic_arn == ""

        event = copy.deepcopy(send_email_event)
        record = json.loads(event["Records"][0]["Sns"]["Message"])
        record["notification"]["service"] = "sns"
        record["notification"]["recipients"] = receive_failed_topic_arn
        param = Parameters(record)
        assert param.topic_arn == receive_failed_topic_arn

    def test_required_parameter_check(
        self, mock_iam_context, mock_sqs_context, mock_ddb_context, mock_sns_context
    ):
        from send_email.lambda_function import Parameters

        send_email_event = json.loads(os.environ["SEND_EMAIL_EVENT"])
        source = os.environ["SOURCE"]
        ses_email_template = os.environ["SES_EMAIL_TEMPLATE"]
        receive_failed_topic_arn = os.environ["RECEIVE_STATES_FAILED_TOPIC_ARN"]

        for required_param in (
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
        ):
            event = copy.deepcopy(send_email_event)
            record = json.loads(event["Records"][0]["Sns"]["Message"])
            record.pop(required_param, None)
            with pytest.raises(Exception) as exception_info:
                Parameters(record)
            assert (
                exception_info.value.args[0] == f"Missing value for {required_param}."
            )

        event = copy.deepcopy(send_email_event)
        record = json.loads(event["Records"][0]["Sns"]["Message"])
        record["notification"] = "not-a-dict"
        with pytest.raises(Exception) as exception_info:
            Parameters(record)
        assert (
            exception_info.value.args[0] == "The parameters notification is not a dict."
        )

        event = copy.deepcopy(send_email_event)
        record = json.loads(event["Records"][0]["Sns"]["Message"])
        record["notification"] = {"recipients": ""}
        with pytest.raises(Exception) as exception_info:
            Parameters(record)
        assert (
            exception_info.value.args[0]
            == "Missing required key: service in notification."
        )

        event = copy.deepcopy(send_email_event)
        record = json.loads(event["Records"][0]["Sns"]["Message"])
        record["notification"] = {"service": ""}
        with pytest.raises(Exception) as exception_info:
            Parameters(record)
        assert (
            exception_info.value.args[0]
            == "Missing required key: recipients in notification."
        )

        event = copy.deepcopy(send_email_event)
        record = json.loads(event["Records"][0]["Sns"]["Message"])
        record["notification"] = {
            "service": "SES",
            "recipients": ["alejandro_rosalez@example.com"],
        }
        record["source"] = source
        record["emailTemplate"] = ses_email_template
        param = Parameters(record)
        assert (
            param.state_machine_id
            == "arn:aws:states:us-east-1:123456789012:stateMachine:LogProcessor-HBTz7GoOjZoz"
        )
        assert param.state_machine_name == "LogProcessor-HBTz7GoOjZoz"
        assert param.state_name == "Send Failure Notification"
        assert (
            param.execution_id
            == "arn:aws:states:us-east-1:123456789012:execution:LogProcessor-HBTz7GoOjZoz:1ebf165b-f846-4813-8cab-305be5c8ca7e"
        )
        assert param.execution_name == "1ebf165b-f846-4813-8cab-305be5c8ca7e"
        assert param.pipeline_id == "189f73eb-1808-47e4-a9db-ee9c35100abe"
        assert param.table_name == "aws_alb_logs"
        assert param.schedule_type == "LogProcessor"
        assert param.source_type == "ALB"
        assert param.notification == {
            "service": "SES",
            "recipients": ["alejandro_rosalez@example.com"],
        }
        assert (
            param.archive_path
            == "s3://stagingbucket/archive/aws_alb_logs/elasticloadbalancing/deba876a-6f13-4ac1-bd12-252254b7cd06"
        )
        assert param.status == "Failed"
        assert param.metadata is not None
        assert param.notification_service == "SES"
        assert param.recipients == ["alejandro_rosalez@example.com"]
        assert param.source == source
        assert param.ses_email_template == ses_email_template

        event = copy.deepcopy(send_email_event)
        record = json.loads(event["Records"][0]["Sns"]["Message"])
        record["notification"] = {
            "service": "SNS",
            "recipients": receive_failed_topic_arn,
        }
        param = Parameters(record)
        assert (
            param.state_machine_id
            == "arn:aws:states:us-east-1:123456789012:stateMachine:LogProcessor-HBTz7GoOjZoz"
        )
        assert param.state_machine_name == "LogProcessor-HBTz7GoOjZoz"
        assert param.state_name == "Send Failure Notification"
        assert (
            param.execution_id
            == "arn:aws:states:us-east-1:123456789012:execution:LogProcessor-HBTz7GoOjZoz:1ebf165b-f846-4813-8cab-305be5c8ca7e"
        )
        assert param.execution_name == "1ebf165b-f846-4813-8cab-305be5c8ca7e"
        assert param.pipeline_id == "189f73eb-1808-47e4-a9db-ee9c35100abe"
        assert param.table_name == "aws_alb_logs"
        assert param.schedule_type == "LogProcessor"
        assert param.source_type == "ALB"
        assert param.notification == {
            "service": "SNS",
            "recipients": receive_failed_topic_arn,
        }
        assert (
            param.archive_path
            == "s3://stagingbucket/archive/aws_alb_logs/elasticloadbalancing/deba876a-6f13-4ac1-bd12-252254b7cd06"
        )
        assert param.status == "Failed"
        assert param.metadata is not None
        assert param.notification_service == "SNS"
        assert param.topic_arn == receive_failed_topic_arn

    def test_optional_parameter_check(
        self, mock_iam_context, mock_sqs_context, mock_ddb_context, mock_sns_context
    ):
        from send_email.lambda_function import Parameters

        aws_region = os.environ["AWS_REGION"]
        account_id = os.environ["ACCOUNT_ID"]
        send_email_event = json.loads(os.environ["SEND_EMAIL_EVENT"])
        source = os.environ["SOURCE"]
        ses_email_template = os.environ["SES_EMAIL_TEMPLATE"]

        event = copy.deepcopy(send_email_event)
        record = json.loads(event["Records"][0]["Sns"]["Message"])
        record["source"] = source
        record["emailTemplate"] = ses_email_template

        param = Parameters(record)
        param._optional_parameter_check(parameters=record)
        assert param.api == "SNS: Publish"
        assert param.metadata is not None
        assert (
            param.state_machine_url
            == f"https://{aws_region}.console.com/states/home?region={aws_region}#/statemachines/view/arn:aws:states:{aws_region}:{account_id}:stateMachine:LogProcessor-HBTz7GoOjZoz"
        )
        assert (
            param.execution_url
            == f"https://{aws_region}.console.com/states/home?region={aws_region}#/v2/executions/details/arn:aws:states:{aws_region}:{account_id}:execution:LogProcessor-HBTz7GoOjZoz:1ebf165b-f846-4813-8cab-305be5c8ca7e"
        )

        event = copy.deepcopy(send_email_event)
        record = json.loads(event["Records"][0]["Sns"]["Message"])
        record["source"] = source
        record["emailTemplate"] = ses_email_template
        record.pop("API", None)
        record.pop("metadata", None)

        param = Parameters(record)
        param._optional_parameter_check(parameters=record)
        assert param.api == "SNS: Publish"
        assert param.metadata == {}
        assert (
            param.state_machine_url
            == f"https://{aws_region}.console.com/states/home?region={aws_region}#/statemachines/view/arn:aws:states:{aws_region}:{account_id}:stateMachine:LogProcessor-HBTz7GoOjZoz"
        )
        assert (
            param.execution_url
            == f"https://{aws_region}.console.com/states/home?region={aws_region}#/v2/executions/details/arn:aws:states:{aws_region}:{account_id}:execution:LogProcessor-HBTz7GoOjZoz:1ebf165b-f846-4813-8cab-305be5c8ca7e"
        )

    def test_get_state_machine_url(
        self, mock_iam_context, mock_sqs_context, mock_ddb_context, mock_sns_context
    ):
        from send_email.lambda_function import Parameters

        aws_region = os.environ["AWS_REGION"]
        account_id = os.environ["ACCOUNT_ID"]
        send_email_event = json.loads(os.environ["SEND_EMAIL_EVENT"])
        source = os.environ["SOURCE"]
        ses_email_template = os.environ["SES_EMAIL_TEMPLATE"]

        event = copy.deepcopy(send_email_event)
        record = json.loads(event["Records"][0]["Sns"]["Message"])
        record["source"] = source
        record["emailTemplate"] = ses_email_template

        param = Parameters(record)
        state_machine_url = param.get_state_machine_url(
            state_machine_id=f"arn:aws:states:{aws_region}:{account_id}:stateMachine:LogProcessor"
        )
        assert (
            state_machine_url
            == f"https://{aws_region}.console.com/states/home?region={aws_region}#/statemachines/view/arn:aws:states:{aws_region}:{account_id}:stateMachine:LogProcessor"
        )

    def test_get_execution_url(
        self, mock_iam_context, mock_sqs_context, mock_ddb_context, mock_sns_context
    ):
        from send_email.lambda_function import Parameters

        aws_region = os.environ["AWS_REGION"]
        account_id = os.environ["ACCOUNT_ID"]
        send_email_event = json.loads(os.environ["SEND_EMAIL_EVENT"])
        source = os.environ["SOURCE"]
        ses_email_template = os.environ["SES_EMAIL_TEMPLATE"]

        event = copy.deepcopy(send_email_event)
        record = json.loads(event["Records"][0]["Sns"]["Message"])
        record["source"] = source
        record["emailTemplate"] = ses_email_template

        param = Parameters(record)
        execution_url = param.get_execution_url(
            execution_id=f"arn:aws:states:{aws_region}:{account_id}:stateMachine:LogProcessor:1234567890"
        )
        assert (
            execution_url
            == f"https://{aws_region}.console.com/states/home?region={aws_region}#/v2/executions/details/arn:aws:states:{aws_region}:{account_id}:stateMachine:LogProcessor:1234567890"
        )


def test_lambda_handler(
    mock_ses_context,
    mock_iam_context,
    mock_sqs_context,
    mock_ddb_context,
    mock_sns_context,
):
    from send_email.lambda_function import lambda_handler, AWS_DDB_META

    application_pipeline_id = os.environ["APPLICATION_PIPELINE_ID"]
    send_email_event = json.loads(os.environ["SEND_EMAIL_EVENT"])
    receive_failed_topic_arn = os.environ["RECEIVE_STATES_FAILED_TOPIC_ARN"]

    # Test NOTIFICATION_PRIORITY is Message
    os.environ["NOTIFICATION_PRIORITY"] = "Message"

    with pytest.raises(Exception) as exception_info:
        lambda_handler("not-a-dict", {})
    assert exception_info.value.args[0] == "The event is not a dict."

    event = copy.deepcopy(send_email_event)
    assert lambda_handler(event, None)["ResponseMetadata"]["HTTPStatusCode"] == 200  # type: ignore

    event = copy.deepcopy(send_email_event)
    record = json.loads(event["Records"][0]["Sns"]["Message"])
    record["notification"] = {"service": "SNS", "recipients": receive_failed_topic_arn}
    event["Records"][0]["Sns"]["Message"] = json.dumps(record)
    assert lambda_handler(event, None)["ResponseMetadata"]["HTTPStatusCode"] == 200  # type: ignore

    event = copy.deepcopy(send_email_event)
    record = json.loads(event["Records"][0]["Sns"]["Message"])
    record["notification"] = {
        "service": "DO-NOT-SUPPORT-NOTIFICATION",
        "recipients": receive_failed_topic_arn,
    }
    event["Records"][0]["Sns"]["Message"] = json.dumps(record)
    assert lambda_handler(event, None) is None

    # Test NOTIFICATION_PRIORITY is Pipeline
    os.environ["NOTIFICATION_PRIORITY"] = "Pipeline"

    pipeline_id = str(uuid.uuid4())
    pipeline_info = AWS_DDB_META.get(meta_name=application_pipeline_id)
    pipeline_info["data"]["notification"] = {"service": "", "recipients": ""}
    AWS_DDB_META.put(meta_name=pipeline_id, item=pipeline_info)

    event = copy.deepcopy(send_email_event)
    failed_message = json.loads(event["Records"][0]["Sns"]["Message"])
    failed_message["pipelineId"] = pipeline_id
    failed_message["notification"] = {
        "service": "SES",
        "recipients": ["alejandro_rosalez@example.com"],
    }
    event["Records"][0]["Sns"]["Message"] = json.dumps(failed_message)

    assert lambda_handler(event, None) is None

    pipeline_id = str(uuid.uuid4())
    pipeline_info = AWS_DDB_META.get(meta_name=application_pipeline_id)
    pipeline_info["data"]["notification"] = {
        "service": "SES",
        "recipients": "alejandro_rosalez@example.com,alejandro_rosalez@example.org",
    }
    AWS_DDB_META.put(meta_name=pipeline_id, item=pipeline_info)

    event = copy.deepcopy(send_email_event)
    failed_message = json.loads(event["Records"][0]["Sns"]["Message"])
    failed_message["pipelineId"] = pipeline_id
    failed_message["notification"] = {
        "service": "SES",
        "recipients": ["alejandro_rosalez@example.com"],
    }
    event["Records"][0]["Sns"]["Message"] = json.dumps(failed_message)

    assert lambda_handler(event, None)["ResponseMetadata"]["HTTPStatusCode"] == 200  # type: ignore

    pipeline_id = str(uuid.uuid4())
    pipeline_info = AWS_DDB_META.get(meta_name=application_pipeline_id)
    pipeline_info["data"]["notification"] = {"service": "", "recipients": ""}
    AWS_DDB_META.put(meta_name=pipeline_id, item=pipeline_info)

    event = copy.deepcopy(send_email_event)
    failed_message = json.loads(event["Records"][0]["Sns"]["Message"])
    failed_message["pipelineId"] = pipeline_id
    failed_message["notification"] = {
        "service": "SNS",
        "recipients": receive_failed_topic_arn,
    }
    event["Records"][0]["Sns"]["Message"] = json.dumps(failed_message)

    assert lambda_handler(event, None) is None

    pipeline_id = str(uuid.uuid4())
    pipeline_info = AWS_DDB_META.get(meta_name=application_pipeline_id)
    pipeline_info["data"]["notification"] = {
        "service": "SNS",
        "recipients": receive_failed_topic_arn,
    }
    AWS_DDB_META.put(meta_name=pipeline_id, item=pipeline_info)

    event = copy.deepcopy(send_email_event)
    failed_message = json.loads(event["Records"][0]["Sns"]["Message"])
    failed_message["pipelineId"] = pipeline_id
    failed_message["notification"] = {
        "service": "SES",
        "recipients": ["alejandro_rosalez@example.com"],
    }
    event["Records"][0]["Sns"]["Message"] = json.dumps(failed_message)

    assert lambda_handler(event, None)["ResponseMetadata"]["HTTPStatusCode"] == 200  # type: ignore


def test_get_notification_from_pipeline(
    mock_ses_context,
    mock_iam_context,
    mock_sqs_context,
    mock_ddb_context,
    mock_sns_context,
):
    from send_email.lambda_function import get_notification_from_pipeline, AWS_DDB_META

    application_pipeline_id = os.environ["APPLICATION_PIPELINE_ID"]
    receive_failed_topic_arn = os.environ["RECEIVE_STATES_FAILED_TOPIC_ARN"]

    pipeline_id = str(uuid.uuid4())
    pipeline_info = AWS_DDB_META.get(meta_name=application_pipeline_id)
    pipeline_info["data"]["notification"] = {"service": "", "recipients": ""}
    AWS_DDB_META.put(meta_name=pipeline_id, item=pipeline_info)

    notification = get_notification_from_pipeline(pipeline_id=pipeline_id)
    assert notification == {"recipients": "", "service": ""}

    pipeline_id = str(uuid.uuid4())
    pipeline_info = AWS_DDB_META.get(meta_name=application_pipeline_id)
    pipeline_info["data"]["notification"] = {
        "service": "SES",
        "recipients": "alejandro_rosalez@example.com,alejandro_rosalez@example.org",
    }
    AWS_DDB_META.put(meta_name=pipeline_id, item=pipeline_info)

    notification = get_notification_from_pipeline(pipeline_id=pipeline_id)
    assert notification == {
        "recipients": [
            "alejandro_rosalez@example.com",
            "alejandro_rosalez@example.org",
        ],
        "service": "SES",
    }

    pipeline_id = str(uuid.uuid4())
    pipeline_info = AWS_DDB_META.get(meta_name=application_pipeline_id)
    pipeline_info["data"]["notification"] = {
        "service": "SNS",
        "recipients": receive_failed_topic_arn,
    }
    AWS_DDB_META.put(meta_name=pipeline_id, item=pipeline_info)

    notification = get_notification_from_pipeline(pipeline_id=pipeline_id)
    assert notification == {"recipients": receive_failed_topic_arn, "service": "SNS"}

    pipeline_id = str(uuid.uuid4())
    notification = get_notification_from_pipeline(pipeline_id=pipeline_id)
    assert notification == {"recipients": [], "service": "SES"}


def test_send_email_via_sns(
    mock_ses_context,
    mock_iam_context,
    mock_sqs_context,
    mock_ddb_context,
    mock_sns_context,
):
    from send_email.lambda_function import Parameters, send_email_via_sns

    send_email_event = json.loads(os.environ["SEND_EMAIL_EVENT"])
    receive_failed_topic_arn = os.environ["RECEIVE_STATES_FAILED_TOPIC_ARN"]

    event = copy.deepcopy(send_email_event)
    record = json.loads(event["Records"][0]["Sns"]["Message"])
    record["notification"] = {"service": "SNS", "recipients": receive_failed_topic_arn}
    param = Parameters(record)
    response = send_email_via_sns(parameters=param)
    assert response["ResponseMetadata"]["HTTPStatusCode"] == 200  # type: ignore

    event = copy.deepcopy(send_email_event)
    record = json.loads(event["Records"][0]["Sns"]["Message"])
    record["notification"] = {"service": "SNS", "recipients": ""}
    param = Parameters(record)
    response = send_email_via_sns(parameters=param)
    assert response is None


def test_send_email_via_ses(
    mock_ses_context,
    mock_iam_context,
    mock_sqs_context,
    mock_ddb_context,
    mock_sns_context,
):
    from send_email.lambda_function import Parameters, send_email_via_ses

    send_email_event = json.loads(os.environ["SEND_EMAIL_EVENT"])
    source = os.environ["SOURCE"]
    ses_email_template = os.environ["SES_EMAIL_TEMPLATE"]

    event = copy.deepcopy(send_email_event)
    record = json.loads(event["Records"][0]["Sns"]["Message"])
    record["notification"] = {
        "service": "SES",
        "recipients": ["alejandro_rosalez@example.com"],
    }
    record["source"] = source
    record["emailTemplate"] = ses_email_template
    param = Parameters(record)
    response = send_email_via_ses(parameters=param)
    assert response["ResponseMetadata"]["HTTPStatusCode"] == 200  # type: ignore

    event = copy.deepcopy(send_email_event)
    record = json.loads(event["Records"][0]["Sns"]["Message"])
    record["notification"] = {"service": "SES", "recipients": []}
    record["source"] = source
    record["emailTemplate"] = ses_email_template
    param = Parameters(record)
    response = send_email_via_ses(parameters=param)
    assert response is None
