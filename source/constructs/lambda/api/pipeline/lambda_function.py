# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import json
import logging
import os
import uuid
from datetime import datetime

from boto3.dynamodb.conditions import Attr

from commonlib import AWSConnection, handle_error, AppSyncRouter
from commonlib import DynamoDBUtil, LinkAccountHelper
from commonlib.dao import SvcPipelineDao, ETLLogDao
from commonlib.model import PipelineMonitorStatus, PipelineAlarmStatus, EngineType, SvcPipeline, LightEngineParams, BufferTypeEnum, MonitorDetail
from commonlib.exception import APIException, ErrorCode
from commonlib.utils import paginate, create_stack_name


logger = logging.getLogger()
logger.setLevel(logging.INFO)

conn = AWSConnection()
router = AppSyncRouter()

pipeline_table_name = os.environ.get("PIPELINE_TABLE")
pipeline_table_arn = os.environ.get("PIPELINR_TABLE_ARN")
ddb_util = DynamoDBUtil(pipeline_table_name)

etl_log_table_name = os.environ['ETLLOG_TABLE']

grafana_table_name = os.environ.get("GRAFANA_TABLE")
grafana_ddb_util = DynamoDBUtil(grafana_table_name)

meta_table_name = os.environ.get("META_TABLE")
meta_ddb_util = DynamoDBUtil(meta_table_name)

stateMachineArn = os.environ.get("STATE_MACHINE_ARN")
sfn = conn.get_client("stepfunctions")
glue = conn.get_client("glue")

link_account_table_name = os.environ.get("SUB_ACCOUNT_LINK_TABLE_NAME")
account_helper = LinkAccountHelper(link_account_table_name)

current_account_id = os.environ.get("ACCOUNT_ID")
current_region = os.environ.get("REGION")
current_partition = os.environ.get("PARTITION")


@handle_error
def lambda_handler(event, _):
    return router.resolve(event)


def get_value_through_parameter_key(key: str, parameters: list) -> str:
    for param in parameters:
        if param['parameterKey'] == key:
            return param['parameterValue']
    return ""


def get_glue_table_info(service_pipeline: SvcPipeline) -> dict:
    glue_table_info = {}
    
    import_dashboards = service_pipeline.lightEngineParams.importDashboards.lower()
    if import_dashboards == 'true':
        grafana_info = grafana_ddb_util.get_item(key={'id':service_pipeline.lightEngineParams.grafanaId})
    
    centralized_database_name = meta_ddb_util.get_item(key={'metaName':'CentralizedDatabase'})['name']
    centralized_table_name = service_pipeline.lightEngineParams.centralizedTableName
    
    table_and_dashboard_four_tuple = (
        ('table', centralized_table_name, f'{service_pipeline.id}-00', f'{centralized_table_name}-details'),
        ('metric', f'{centralized_table_name}_metrics', f'{service_pipeline.id}-01', f'{centralized_table_name}-dashboard')
    )
    
    for key, table_name, dashboard_uid, dashboard_name in table_and_dashboard_four_tuple:
        try:
            if not table_name:
                continue
            response = glue.get_table(
                DatabaseName=centralized_database_name,
                Name=table_name,
            )
            glue_table_info[key] = {
                "databaseName": centralized_database_name,
                "tableName": table_name,
                "location": response['Table']['StorageDescriptor']['Location'],
                "classification": response['Table']['Parameters'].get('classification', 'parquet')
            }
            if import_dashboards == 'true':
                glue_table_info[key]['dashboardName'] = dashboard_name
                glue_table_info[key]['dashboardLink'] = f"{grafana_info['url'].rstrip('/')}/d/{dashboard_uid}"
        except Exception as e:
            logger.warning(e)
    
    return glue_table_info


def get_scheduler_expression(name: str, group: str, client) -> str:
    try:
        if client._service_model._service_name == 'events':
            return client.describe_rule(Name=name, EventBusName=group)['ScheduleExpression']
        elif client._service_model._service_name == 'scheduler':
            return client.get_schedule(GroupName=group, Name=name)['ScheduleExpression']
    except Exception as e:
        logger.warning(e)
    return ''


def get_schedules_info(service_pipeline: SvcPipeline) -> list:    
    schedules_info = [] 
    available_services = meta_ddb_util.get_item(key={'metaName':'AvailableServices'})['value']

    if 'scheduler' in available_services:
        scheduler_type = 'EventBridgeScheduler'
        scheduler = conn.get_client('scheduler')
    else:
        scheduler_type = 'EventBridgeEvents'
        scheduler = conn.get_client('events')
        
    for meta_name, schedule_name in (('LogProcessor', 'LogProcessor'), 
                                     ('LogMerger', 'LogMerger'), 
                                     ('LogMerger', 'LogMergerForMetrics'), 
                                     ('LogArchive', 'LogArchive'), 
                                     ('LogArchive', 'LogArchiveForMetrics')):
        meta_schedule = meta_ddb_util.get_item(key={'metaName':meta_name})
        if scheduler_type == 'EventBridgeScheduler':
            name = schedule_name
            group = service_pipeline.id
        else:
            name = f'{schedule_name}-{service_pipeline.lightEngineParams.centralizedTableName}'
            group = 'default'
        schedule_expression = get_scheduler_expression(name=name, group=group, client=scheduler)
        schedule = {
            "type": schedule_name,
            "stateMachine": {
                "arn": meta_schedule['arn'],
                "name": meta_schedule['name']
            },
            "scheduler": {
                "type": scheduler_type,
                "group": group,
                "name": name,
                "expression": schedule_expression
            }
        }
        if meta_name == 'LogMerger':
            schedule['scheduler']['age'] = service_pipeline.lightEngineParams.logMergerAge
        elif meta_name == 'LogArchive':
            schedule['scheduler']['age'] = service_pipeline.lightEngineParams.logArchiveAge
            
        if schedule_expression != '':
            schedules_info.append(schedule)
    return schedules_info


@router.route(field_name="getLightEngineServicePipelineExecutionLogs")
def get_light_engine_service_pipeline_logs(**args):
    pipeline_id = args["pipelineId"]
    state_machine_name = args["stateMachineName"]
    schedule_type = args["type"]
    pipeline_index_key = f'{pipeline_id}:{schedule_type}:00000000-0000-0000-0000-000000000000'
    
    etl_log_dao = ETLLogDao(etl_log_table_name)
    response = etl_log_dao.query_execution_logs(pipeline_index_key=pipeline_index_key, 
                                                start_time=args.get('startTime'),
                                                end_time=args.get('endTime'),
                                                status=args.get('status'),
                                                limit=args.get('limit', 10),
                                                last_evaluated_key=args.get('lastEvaluatedKey'))
    
    execution_tasks = {}
    execution_tasks['items'] = response['Items']
    if response.get('LastEvaluatedKey'):
        execution_tasks['lastEvaluatedKey'] = response['LastEvaluatedKey']
        
    for item in execution_tasks['items']:
        item['executionArn'] = f'arn:{current_partition}:states:{current_region}:{current_account_id}:execution:{state_machine_name}:{item["executionName"]}'
        item.pop('pipelineIndexKey', None)
    
    return execution_tasks

@router.route(field_name="getLightEngineServicePipelineDetail")
def get_light_engine_service_pipeline_detail(**args):
    service_pipeline_detail = {
        "analyticsEngine": {
            "engineType": EngineType.LIGHT_ENGINE,
        },
        "schedules": []
    }
    
    pipeline_id = args.get("pipelineId")
    if not pipeline_id:
        raise KeyError(f'Missing required parameter: pipelineId.')
    
    svc_pipeline_dao = SvcPipelineDao(pipeline_table_name)
    svc_pipeline = svc_pipeline_dao.get_svc_pipeline(id=pipeline_id)
    
    service_pipeline_detail['analyticsEngine'].update(get_glue_table_info(service_pipeline=svc_pipeline))
    service_pipeline_detail['schedules'] = get_schedules_info(service_pipeline=svc_pipeline)
    
    return service_pipeline_detail


@router.route(field_name="createServicePipeline")
def create_service_pipeline(**args):
    """Create a service pipeline deployment"""
    logger.info("Create Service Pipeline")

    pipeline_id = str(uuid.uuid4())

    stack_name = create_stack_name("SvcPipe", pipeline_id)
    service_type = args["type"]
    source = args["source"]
    target = args["target"]
    monitor = args.get("monitor") or {"status": PipelineMonitorStatus.ENABLED}
    osi_params = args.get("osiParams")
    destination_type = args["destinationType"]

    params = []
    account_id = args.get("logSourceAccountId") or account_helper.default_account_id
    region = args.get("logSourceRegion") or account_helper.default_region

    account = account_helper.get_link_account(account_id, region)
    log_source_account_assume_role = account.get("subAccountRoleArn", "")

    args["parameters"].append(
        {
            "parameterKey": "logSourceAccountId",
            "parameterValue": account_id,
        }
    )

    if destination_type != "KDS":
        args["parameters"].append(
            {
                "parameterKey": "logSourceRegion",
                "parameterValue": region,
            }
        )
    else:
        args["parameters"].append(
            {
                "parameterKey": "cloudFrontDistributionId",
                "parameterValue": source,
            }
        )

    args["parameters"].append(
        {
            "parameterKey": "logSourceAccountAssumeRole",
            "parameterValue": log_source_account_assume_role,
        }
    )

    enable_autoscaling = "no"
    for p in args["parameters"]:
        if p["parameterKey"] == "enableAutoScaling":
            enable_autoscaling = p["parameterValue"]
            continue
        params.append(
            {
                "ParameterKey": p["parameterKey"],
                "ParameterValue": p["parameterValue"],
            }
        )

    if osi_params != None: 
        if (osi_params["maxCapacity"] != 0 and osi_params["minCapacity"] != 0):
            params.append(
                {
                    "ParameterKey": "maxCapacity",
                    "ParameterValue": str(osi_params["maxCapacity"]),
                }
            )
            params.append(
                {
                    "ParameterKey": "minCapacity",
                    "ParameterValue": str(osi_params["minCapacity"]),
                }
            )
            params.append(
                {
                    "ParameterKey": "pipelineTableArn",
                    "ParameterValue": pipeline_table_arn,
                }
            )
            params.append({
                    "ParameterKey": "osiPipelineName",
                    "ParameterValue": pipeline_id,
                }
            )

    pattern = _get_pattern_by_buffer(service_type, destination_type, enable_autoscaling, osi_params)

    sfn_args = {
        "stackName": stack_name,
        "pattern": pattern,
        "parameters": params,
        "engineType": EngineType.OPEN_SEARCH,
    }

    # Start the pipeline flow
    exec_sfn_flow(id=pipeline_id, action="START", args=sfn_args)

    item = {
        "id": pipeline_id,
        "type": service_type,
        "source": source,
        "target": target,
        "destinationType": destination_type,
        "parameters": args["parameters"],
        "tags": args.get("tags", []),
        "createdAt": datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
        "stackName": stack_name,
        "monitor": monitor,
        "osiParams": osi_params,
        "osiPipelineName": f"cl-{pipeline_id[:23]}",
        "engineType": EngineType.OPEN_SEARCH,
        "status": "CREATING",
    }
    ddb_util.put_item(item)
    return pipeline_id

@router.route(field_name="createLightEngineServicePipeline")
def create_light_engine_service_pipeline(**args):
    """Create a service pipeline deployment for light engine"""
    logger.info("Create Light Engine Service Pipeline")

    pipeline_id = str(uuid.uuid4())
    service_type = args["type"]
    parameters = args["parameters"]
    monitor = args.get("monitor", {"status": PipelineMonitorStatus.DISABLED})
    source = args["source"]
    account_id = args.get("logSourceAccountId") or account_helper.default_account_id
    region = args.get("logSourceRegion") or account_helper.default_region
    
    account = account_helper.get_link_account(account_id, region)
    log_source_account_assume_role = account.get("subAccountRoleArn", "")

    stack_name = create_stack_name("SvcPipe", pipeline_id)
    monitor_detail = MonitorDetail(**monitor)

    sns_arn = ""
    if monitor_detail.pipelineAlarmStatus == PipelineAlarmStatus.ENABLED:
        if monitor_detail.snsTopicArn:
            sns_arn = monitor_detail.snsTopicArn
        else:
            sns_arn =f"arn:{current_partition}:sns:{current_region}:{current_account_id}:{monitor_detail.snsTopicName}_{pipeline_id[:8]}"

    light_engine_params = LightEngineParams(
        stagingBucketPrefix=get_staging_bucket_prefix(service_type, stack_name),
        centralizedBucketName=get_value_through_parameter_key(key='centralizedBucketName', parameters=parameters),
        centralizedBucketPrefix=get_value_through_parameter_key(key='centralizedBucketPrefix', parameters=parameters),
        centralizedTableName=get_value_through_parameter_key(key='centralizedTableName', parameters=parameters),
        logProcessorSchedule=get_value_through_parameter_key(key='logProcessorSchedule', parameters=parameters),
        logMergerSchedule=get_value_through_parameter_key(key='logMergerSchedule', parameters=parameters),
        logArchiveSchedule=get_value_through_parameter_key(key='logArchiveSchedule', parameters=parameters),
        logMergerAge=get_value_through_parameter_key(key='logMergerAge', parameters=parameters),
        logArchiveAge=get_value_through_parameter_key(key='logArchiveAge', parameters=parameters),
        importDashboards=get_value_through_parameter_key(key='importDashboards', parameters=parameters),
        grafanaId=get_value_through_parameter_key(key='grafanaId', parameters=parameters),
        recipients=sns_arn,
    )
    if service_type.lower() in ("elb", "cloudfront"):
        light_engine_params.enrichmentPlugins = get_value_through_parameter_key(key='enrichmentPlugins', parameters=parameters)
        
    svc_pipeline_dao = SvcPipelineDao(pipeline_table_name)
    svc_pipeline = SvcPipeline(
        id=pipeline_id,
        type=service_type,
        source=source,
        destinationType=BufferTypeEnum.S3,
        parameters=parameters,
        tags=args.get("tags", []),
        stackName=stack_name,
        monitor=monitor_detail,
        engineType=EngineType.LIGHT_ENGINE,
        logSourceAccountId=account_id,
        logSourceRegion=region,
        lightEngineParams=light_engine_params,
    )

    grafana = None
    if svc_pipeline.lightEngineParams.grafanaId:
        grafana = grafana_ddb_util.get_item(
            {"id": svc_pipeline.lightEngineParams.grafanaId}
        )
    
    sfn_parameters = svc_pipeline_dao.get_light_engine_stack_parameters(
        service_pipeline=svc_pipeline, grafana=grafana
    )
    
    pattern = _get_light_engine_pattern(service_type)

    ingestion = {
            "id": str(uuid.uuid4()),
            "role": log_source_account_assume_role,
            "pipelineId": pipeline_id,
            "bucket": args["ingestion"]["bucket"],
            "prefix": args["ingestion"]["prefix"],
        }
    
    sfn_args = {
        "stackName": stack_name,
        "pattern": pattern,
        "parameters": sfn_parameters,
        "engineType": EngineType.LIGHT_ENGINE,
        "ingestion": ingestion,
    }

    # Start the pipeline flow
    exec_sfn_flow(id=pipeline_id, action="START", args=sfn_args)
    
    svc_pipeline_dao.save(svc_pipeline)
    return svc_pipeline.id


@router.route(field_name="getServicePipeline")
def get_service_pipeline(id: str):
    """Get a service pipeline detail"""

    item = ddb_util.get_item({"id": id})

    # Get the error log prefix
    error_log_prefix = get_error_export_info(item)
    item["monitor"]["errorLogPrefix"] = error_log_prefix

    return item


@router.route(field_name="deleteServicePipeline")
def delete_service_pipeline(id: str) -> str:
    """delete a service pipeline deployment"""
    logger.info("Delete Service Pipeline")

    item = ddb_util.get_item({"id": id})
    if not item:
        raise APIException(ErrorCode.ITEM_NOT_FOUND, "Pipeline is not found")

    if item.get("status") in ["INACTIVE", "DELETING"]:
        raise APIException(ErrorCode.INVALID_ITEM, "No pipeline to delete")

    status = "INACTIVE"

    if "stackId" in item and item["stackId"]:
        status = "DELETING"
        args = {"stackId": item["stackId"]}
        # Start the pipeline flow
        exec_sfn_flow(id, "STOP", args)

    update_status(id, status)
    return "OK"


def update_status(id: str, status: str):
    """Update pipeline status in pipeline table"""
    ddb_util.update_item({"id": id}, {"status": status})


def exec_sfn_flow(id: str, action="START", args=None):
    """Helper function to execute a step function flow"""
    logger.info(f"Execute Step Function Flow: {stateMachineArn}")

    if args is None:
        args = {}

    input_args = {
        "id": id,
        "action": action,
        "args": args,
    }

    sfn.start_execution(
        name=f"{id}-{action}",
        stateMachineArn=stateMachineArn,
        input=json.dumps(input_args),
    )


@router.route(field_name="listServicePipelines")
def list_pipelines(page=1, count=20):
    logger.info(f"List Pipelines from DynamoDB in page {page} with {count} of records")

    items = ddb_util.list_items(filter_expression=Attr("status").ne("INACTIVE"))
    total, pipelines = paginate(items, page, count, sort_by="createdAt")
    return {
        "total": total,
        "pipelines": pipelines,
    }


def _get_pattern_by_buffer(service_type, destination_type, enable_autoscaling="no", osi_params=None):
    if (osi_params != None and osi_params["maxCapacity"] != 0 and osi_params["minCapacity"] != 0 and destination_type == "S3"):
        match service_type:
            case "CloudTrail":
                return "CloudTrailLogOSIProcessor"
            case "VPC":
                return "VPCFlowLogOSIProcessor"
            case "ELB":
                return "ELBLogOSIProcessor"
            case "WAF":
                return "WAFLogOSIProcessor"
    if service_type == "CloudFront" and destination_type == "KDS":
        if enable_autoscaling.lower() != "no":
            return "CloudFrontRealtimeLogKDSBuffer"
        else:
            return "CloudFrontRealtimeLogKDSBufferNoAutoScaling"
    if (
        service_type == "CloudTrail" or service_type == "VPC"
    ) and destination_type == "CloudWatch":
        if enable_autoscaling.lower() != "no":
            return "CloudWatchLogKDSBuffer"
        else:
            return "CloudWatchLogKDSBufferNoAutoScaling"
    else:
        return service_type

def _get_light_engine_pattern(service_type):
    if service_type == "WAF":
        return "MicroBatchAwsServicesWafPipeline"
    if service_type == "CloudFront":
        return "MicroBatchAwsServicesCloudFrontPipeline"
    if service_type == "ELB":
        return "MicroBatchAwsServicesAlbPipeline"
    else:
        return service_type
    
def get_staging_bucket_prefix(service_type: str, stack_name: str):
    return f"AWSLogs/{service_type}Logs/{stack_name}"


def get_error_export_info(pipeline_item: dict):
    """Generate processor error log location."""
    log_type = pipeline_item.get("type")
    index_prefix = get_cfn_param(pipeline_item, "indexPrefix")
    return f"error/AWSLogs/{log_type}/index-prefix={index_prefix}/"


def get_cfn_param(item, param_description):
    """Get the task param from ddb"""
    for stack_param in item.get("parameters"):
        if stack_param.get("parameterKey") == param_description:
            return stack_param.get("parameterValue")
    return ""
