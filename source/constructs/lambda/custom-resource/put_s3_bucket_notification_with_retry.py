# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import boto3  # type: ignore
import json
import logging
import urllib.request
import time
from functools import partial, wraps

s3 = boto3.client("s3")

EVENTBRIDGE_CONFIGURATION = "EventBridgeConfiguration"

CONFIGURATION_TYPES = [
    "TopicConfigurations",
    "QueueConfigurations",
    "LambdaFunctionConfigurations",
]


def retry(func=None, retries=3, delays=5, backoff=2):
    """Retry decorator."""

    if func is None:
        return partial(retry, retries=retries, delays=delays, backoff=backoff)

    @wraps(func)
    def wrapper(*args, **kwargs):
        retry, delay = retries, delays

        while retry > 0:
            try:
                return func(*args, **kwargs)
            except Exception as e:
                logging.error(
                    "Error Occured: %s, Sleep %d seconds and retry...", str(e), delay
                )
                time.sleep(delay)
                retry -= 1
                delay *= backoff

        return func(*args, **kwargs)

    return wrapper


def handler(event: dict, context):
    response_status = "SUCCESS"
    error_message = ""
    try:
        props = event["ResourceProperties"]
        bucket = props["BucketName"]
        notification_configuration = props["NotificationConfiguration"]
        request_type = event["RequestType"]
        managed = props.get("Managed", "true").lower() == "true"
        stack_id = event["StackId"]

        if managed:
            config = handle_managed(request_type, notification_configuration)
        else:
            config = handle_unmanaged(
                bucket, stack_id, request_type, notification_configuration
            )

        put_bucket_notification_configuration(bucket, config)
    except Exception as e:
        logging.exception("Failed to put bucket notification configuration")
        response_status = "FAILED"
        error_message = f"Error: {str(e)}. "
    finally:
        submit_response(event, context, response_status, error_message)


def handle_managed(request_type, notification_configuration):
    if request_type == "Delete":
        return {}
    return notification_configuration


def has_app_log_config_filter_rule(data):
    filter_rules = data.get("Filter", {}).get("Key", {}).get("FilterRules", [])
    return any(rule.get("Value") == "app_log_config/" for rule in filter_rules)


def exclude_existing_app_log_config(config):
    return not has_app_log_config_filter_rule(config)


def handle_unmanaged(bucket, stack_id, request_type, notification_configuration):
    # find external notifications
    external_notifications = find_external_notifications(bucket, stack_id)

    # if delete, that's all we need
    if request_type == "Delete":
        return external_notifications

    def with_id(notification):
        notification["Id"] = (
            f"{stack_id}-{hash(json.dumps(notification, sort_keys=True))}"
        )
        return notification

    # otherwise, merge external with incoming config and augment with id
    notifications = {}
    for t in CONFIGURATION_TYPES:
        external = external_notifications.get(t, [])
        incoming = [with_id(n) for n in notification_configuration.get(t, [])]

        external_has_app_log_config_filter_rule = any(map(has_app_log_config_filter_rule, external))
        incoming_has_app_log_config_filter_rule = any(map(has_app_log_config_filter_rule, incoming))

        if external_has_app_log_config_filter_rule and incoming_has_app_log_config_filter_rule:
            external = list(filter(exclude_existing_app_log_config, external))

        notifications[t] = external + incoming

    # EventBridge configuration is a special case because it's just an empty object if it exists
    if EVENTBRIDGE_CONFIGURATION in notification_configuration:
        notifications[EVENTBRIDGE_CONFIGURATION] = notification_configuration[
            EVENTBRIDGE_CONFIGURATION
        ]
    elif EVENTBRIDGE_CONFIGURATION in external_notifications:
        notifications[EVENTBRIDGE_CONFIGURATION] = external_notifications[
            EVENTBRIDGE_CONFIGURATION
        ]

    return notifications


def find_external_notifications(bucket, stack_id):
    existing_notifications = get_bucket_notification_configuration(bucket)
    external_notifications = {}
    for t in CONFIGURATION_TYPES:
        # if the notification was created by us, we know what id to expect
        # so we can filter by it.
        external_notifications[t] = [
            n
            for n in existing_notifications.get(t, [])
            if not n["Id"].startswith(f"{stack_id}-")
        ]

    # always treat EventBridge configuration as an external config if it already exists
    # as there is no way to determine whether it's managed by us or not
    if EVENTBRIDGE_CONFIGURATION in existing_notifications:
        external_notifications[EVENTBRIDGE_CONFIGURATION] = existing_notifications[
            EVENTBRIDGE_CONFIGURATION
        ]

    return external_notifications


def get_bucket_notification_configuration(bucket):
    return s3.get_bucket_notification_configuration(Bucket=bucket)


@retry(retries=5, delays=3, backoff=2)
def put_bucket_notification_configuration(bucket, notification_configuration):
    s3.put_bucket_notification_configuration(
        Bucket=bucket, NotificationConfiguration=notification_configuration
    )


def submit_response(event: dict, context, response_status: str, error_message: str):
    response_body = json.dumps(
        {
            "Status": response_status,
            "Reason": f"{error_message}See the details in CloudWatch Log Stream: {context.log_stream_name}",
            "PhysicalResourceId": event.get("PhysicalResourceId")
            or event["LogicalResourceId"],
            "StackId": event["StackId"],
            "RequestId": event["RequestId"],
            "LogicalResourceId": event["LogicalResourceId"],
            "NoEcho": False,
        }
    ).encode("utf-8")
    headers = {"content-type": "", "content-length": str(len(response_body))}
    try:
        req = urllib.request.Request(
            url=event["ResponseURL"], headers=headers, data=response_body, method="PUT"
        )
        with urllib.request.urlopen(req) as response:
            print(response.read().decode("utf-8"))
        print("Status code: " + response.reason)
    except Exception as e:
        print("send(..) failed executing request.urlopen(..): " + str(e))
