# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

from commonlib.logging import get_logger

from botocore.exceptions import ClientError

from commonlib import AWSConnection, handle_error, AppSyncRouter
from commonlib.exception import APIException, ErrorCode
from commonlib.utils import paginate

from util.cwl_metric_data_helper import MetricDataHelper

logger = get_logger(__name__)

conn = AWSConnection()
router = AppSyncRouter()

logs_client = conn.get_client("logs")


@handle_error
def lambda_handler(event, _):
    return router.resolve(event)


@router.route(field_name="listLogStreams")
def list_log_streams(**args):
    """List all log streams by log group name"""
    page = args.get("page", 1)
    count = args.get("count", 20)
    log_group_name = args.get("logGroupName")
    log_stream_name_prefix = args.get("logStreamNamePrefix")
    logger.info(
        f"List log streams of {log_group_name} in page {page} with {count} of records"
    )

    try:
        if log_stream_name_prefix == "" or log_stream_name_prefix is None:
            response = logs_client.describe_log_streams(
                logGroupName=log_group_name,
                orderBy="LastEventTime",
                descending=True,
                limit=50,
            )
            log_streams = response.get("logStreams")
            while "NextToken" in response:
                response = logs_client.describe_log_streams(
                    logGroupName=log_group_name,
                    orderBy="LastEventTime",
                    descending=True,
                    nextToken=response["nextToken"],
                    limit=50,
                )
                log_streams.extend(response["Accounts"])
        else:
            # Cannot order by LastEventTime with a logStreamNamePrefix.
            response = logs_client.describe_log_streams(
                logGroupName=log_group_name,
                logStreamNamePrefix=log_stream_name_prefix,
                descending=True,
                limit=50,
            )
            log_streams = response.get("logStreams")
            while "NextToken" in response:
                response = logs_client.describe_log_streams(
                    logGroupName=log_group_name,
                    logStreamNamePrefix=log_stream_name_prefix,
                    descending=True,
                    nextToken=response["nextToken"],
                    limit=50,
                )
                log_streams.extend(response["Accounts"])
    except ClientError as err:
        if err.response["Error"]["Code"] == "ResourceNotFoundException":
            raise APIException(ErrorCode.ITEM_NOT_FOUND, "Log Group Not Found")
        elif err.response["Error"]["Code"] == "InvalidParameterException":
            raise APIException(
                ErrorCode.INVALID_ITEM,
                f"Invalid Parameter: stream name prefix {log_stream_name_prefix}",
            )

    total, pipelines = paginate(log_streams, page, count, sort_by="creationTime")
    return {
        "total": total,
        "logStreams": pipelines,
    }


def filter_log_events(
    log_group_name,
    log_stream_name,
    start_time,
    end_time,
    filter_pattern,
    next_token,
    limit,
):
    return logs_client.filter_log_events(
        logGroupName=log_group_name,
        logStreamNames=[log_stream_name],
        # Transfer to milliseconds
        **{"startTime": int(start_time) * 1000} if start_time else {},
        **{"endTime": int(end_time) * 1000} if end_time else {},
        **{"filterPattern": filter_pattern} if filter_pattern else {},
        **{"nextToken": next_token} if next_token else {},
        limit=limit,
    )


@router.route(field_name="getLogEvents")
def get_log_events(**args):
    """List all log events by log group name and log stream name"""
    limit = args.get("limit", 100)
    log_group_name = args.get("logGroupName")
    log_stream_name = args.get("logStreamName")
    start_time = args.get("startTime")
    end_time = args.get("endTime")
    filter_pattern = args.get("filterPattern")
    next_token = args.get("nextToken")

    try:
        if start_time or filter_pattern or end_time:
            response = filter_log_events(
                log_group_name,
                log_stream_name,
                start_time,
                end_time,
                filter_pattern,
                next_token,
                limit,
            )
        else:
            response = logs_client.get_log_events(
                logGroupName=log_group_name,
                logStreamName=log_stream_name,
                **{"nextToken": next_token} if next_token else {},
                limit=limit,
            )
    except ClientError as err:
        if err.response["Error"]["Code"] == "ResourceNotFoundException":
            raise APIException(
                ErrorCode.ITEM_NOT_FOUND,
                f"Log Group {log_group_name} with Log Stream {log_stream_name} Not Found",
            )
        elif err.response["Error"]["Code"] == "InvalidParameterException":
            raise APIException(
                ErrorCode.INVALID_ITEM,
                f'Invalid Parameter! Current nextToken: {next_token} with limit: {limit}. Please make sure there are no special characters such as ":" or "&" in the filter pattern.',
            )

    return {
        "logEvents": response.get("events"),
        "nextForwardToken": response.get("nextForwardToken", response.get("nextToken")),
        "nextBackwardToken": response.get("nextBackwardToken"),
    }


@router.route(field_name="getMetricHistoryData")
def get_metric_history_data(**args):
    """Get CWL metric history data"""
    pipeline_id = args.get("pipelineId")
    pipeline_type = args.get("pipelineType")
    metric_names = args.get("metricNames")
    start_time = args.get("startTime")
    end_time = args.get("endTime")

    metric_data_helper = MetricDataHelper(pipeline_id, pipeline_type, metric_names)
    result = metric_data_helper.get_data(start_time, end_time)

    return result
