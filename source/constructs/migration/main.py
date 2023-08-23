import json
import boto3
import operator
import logging

from boto3.dynamodb.conditions import Attr, ConditionBase
from typing import Callable, Optional, Union
from utils import (
    Arn,
    CfnStack,
    find_by_parameter_key,
    find_by_key,
    first,
    rename_dict_key,
    sqs_url_to_arn,
)

logging.getLogger().setLevel(logging.INFO)


def scan_table_items(
    table_name: str,
    filter_expression: Optional[ConditionBase] = None,
    limit: int = -1,
):
    dynamodb = boto3.resource("dynamodb")
    table = dynamodb.Table(table_name)

    kwargs = {}
    if filter_expression:
        kwargs["FilterExpression"] = filter_expression
    if limit > 0:
        kwargs["Limit"] = limit

    response = table.scan(**kwargs)
    for item in response["Items"]:
        yield item

    while "LastEvaluatedKey" in response:
        response = table.scan(ExclusiveStartKey=response["LastEvaluatedKey"], **kwargs)
        for item in response["Items"]:
            yield item


def get_table_item(table_name: str, key: dict):
    dynamodb = boto3.resource("dynamodb")
    table = dynamodb.Table(table_name)

    return table.get_item(Key=key).get("Item")


def copy_objects(source_bucket: str, target_bucket: str, prefix: Optional[str] = ""):
    s3 = boto3.resource("s3")

    source = s3.Bucket(source_bucket)
    target = s3.Bucket(target_bucket)

    for obj in source.objects.filter(Prefix=prefix):
        logging.info(
            "Copying s3://%s to s3://%s",
            source_bucket + "/" + obj.key,
            target_bucket + "/" + obj.key,
        )
        target.copy({"Bucket": source_bucket, "Key": obj.key}, obj.key)


def copy_table(
    src_table_name: str,
    dest_table_name: str,
    transform_fn: Optional[Callable[[dict], Union[dict, None]]] = None,
    use_batch: bool = True,
):
    dynamodb = boto3.resource("dynamodb")
    destination_table = dynamodb.Table(dest_table_name)

    def _write(table):
        for item in scan_table_items(src_table_name):
            if callable(transform_fn):
                item = transform_fn(item)
            if item:
                table.put_item(Item=item)

    if use_batch:
        with destination_table.batch_writer() as batch:
            _write(batch)
    else:
        _write(destination_table)


def copy_policy(src_policy_arn: str, dest_policy_arn: str):
    logging.debug("copying policy from %s to %s", src_policy_arn, dest_policy_arn)

    iam = boto3.resource("iam")
    src_policy = iam.Policy(src_policy_arn)
    dest_policy = iam.Policy(dest_policy_arn)

    policy_doc = dest_policy.default_version.document
    policy_doc["Statement"] = (
        src_policy.default_version.document["Statement"]
        + dest_policy.default_version.document["Statement"]
    )
    policy_versions = sorted(
        iam.Policy(dest_policy_arn).versions.all(),
        key=operator.attrgetter("create_date"),
        reverse=True,
    )
    if len(policy_versions) >= 5:
        ver = policy_versions.pop()
        logging.debug("Delete the oldest policy version %s", ver)
        ver.delete()

    policy_version = dest_policy.create_version(
        PolicyDocument=json.dumps(policy_doc), SetAsDefault=True
    )

    logging.debug(
        "Created policy version %s for policy %s.",
        policy_version.version_id,
        policy_version.arn,
    )


def opensearch_domain_transform(item: dict) -> dict:
    item["status"] = "ACTIVE"
    return item


def svc_pipeline_transform(item: dict) -> dict:
    rename_dict_key(item, "createdDt", "createdAt")
    param = find_by_parameter_key(item["parameters"], "logBucketName")
    item["monitor"] = {
        "backupBucketName": param["parameterValue"] if param else "",
        "emails": "",
        "errorLogPrefix": "",
        "pipelineAlarmStatus": "DISABLED",
        "snsTopicArn": "",
        "snsTopicName": "",
        "status": "ENABLED",
    }
    if stack_id := item["stackId"]:
        stack = CfnStack(stack_id)

        # os helper lambda
        res = first(
            stack.find_resources(
                "OpenSearchHelperFn", resource_type="AWS::Lambda::Function"
            )
        )
        if res:
            item["helperLogGroupName"] = "/aws/lambda/" + res["PhysicalResourceId"]

        # processor lambda
        res = first(
            stack.find_resources(
                "LogProcessorFn", resource_type="AWS::Lambda::Function"
            )
        )
        if res:
            item["processorLogGroupName"] = "/aws/lambda/" + res["PhysicalResourceId"]

        # sqs
        res = first(
            stack.find_resources("LogEventQueue", resource_type="AWS::SQS::Queue")
        )
        if res:
            arn = sqs_url_to_arn(res["PhysicalResourceId"])
            item["logEventQueueArn"] = str(arn)
            item["logEventQueueName"] = arn.resource

        # kdf
        res = first(
            stack.find_resources(
                "S3StackDeliveryStream",
                resource_type="AWS::KinesisFirehose::DeliveryStream",
            )
        )
        if res:
            arn = Arn.from_str(stack_id)
            arn.service = "firehose"
            arn.resource = "deliverystream/" + res["PhysicalResourceId"]

            item["deliveryStreamName"] = res["PhysicalResourceId"]
            item["deliveryStreamArn"] = str(arn)

    return item


def log_config_transform(item: dict) -> dict:
    rename_dict_key(item, "confName", "name")
    rename_dict_key(item, "createdDt", "createdAt")
    rename_dict_key(item, "updatedDt", "updatedAt")
    rename_dict_key(item, "processorFilterRegex", "filterConfigMap")
    if not item["filterConfigMap"]:
        item["filterConfigMap"] = {"enabled": False, "filters": []}
    rename_dict_key(item["filterConfigMap"], "enable", "enabled")
    rename_dict_key(item, "regularExpression", "regex")
    rename_dict_key(item, "regularSpecs", "regexFieldSpecs")
    rename_dict_key(item, "timeRegularExpression", "timeKeyRegex")
    item["version"] = 1
    item["timeKey"] = item["timeKey"] or ""
    item["timeOffset"] = item["timeOffset"] or ""
    return item


def eks_log_src_transform(item: dict) -> dict:
    rename_dict_key(item, "id", "sourceId")
    rename_dict_key(item, "createdDt", "createdAt")
    rename_dict_key(item, "updatedDt", "updatedAt")
    del item["aosDomainId"]
    item["type"] = "EKSCluster"
    item["eks"] = {
        "cri": item["cri"],
        "deploymentKind": item["deploymentKind"],
        "eksClusterArn": item["eksClusterArn"],
        "eksClusterName": item["eksClusterName"],
        "eksClusterSGId": item["eksClusterSGId"],
        "endpoint": item["endpoint"],
        "logAgentRoleArn": item["logAgentRoleArn"],
        "oidcIssuer": item["oidcIssuer"],
        "subnetIds": item["subnetIds"],
        "vpcId": item["vpcId"],
    }

    return item


def log_src_transform(item: dict) -> dict:
    rename_dict_key(item, "id", "sourceId")
    rename_dict_key(item, "createdDt", "createdAt")
    rename_dict_key(item, "updatedDt", "updatedAt")
    rename_dict_key(item, "sourceType", "type")
    if item["type"].lower() == "syslog":
        protocol = find_by_key(item["sourceInfo"], "syslogProtocol")
        port = find_by_key(item["sourceInfo"], "syslogPort")
        nlbArn = find_by_key(item["sourceInfo"], "syslogNlbArn")
        nlbDNSName = find_by_key(item["sourceInfo"], "syslogNlbDNSName")

        if not protocol:
            raise ValueError("Can not find syslogProtocol")
        if not port:
            raise ValueError("Can not find syslogPort")
        if not nlbArn:
            raise ValueError("Can not find syslogNlbArn")
        if not nlbDNSName:
            raise ValueError("Can not find syslogNlbDNSName")

        item["syslog"] = {
            "protocol": protocol["value"],
            "port": int(port["value"]),
            "nlbArn": nlbArn["value"],
            "nlbDNSName": nlbDNSName["value"],
        }

        del item["sourceInfo"]
    return item


def ec2_instance_grp_transform(item: dict, account_id: str) -> dict:
    rename_dict_key(item, "id", "sourceId")
    rename_dict_key(item, "createdDt", "createdAt")
    rename_dict_key(item, "updatedDt", "updatedAt")
    item["type"] = "EC2"
    if item["groupType"] == "EC2":
        item["ec2"] = {
            "groupName": item["groupName"],
            "groupType": item["groupType"],
            "groupPlatform": "Linux",
            "instances": list(map(lambda x: {"instanceId": x}, item["instanceSet"])),
        }
    elif item["groupType"] == "ASG":
        item["ec2"] = {
            "groupName": item["groupName"],
            "groupType": item["groupType"],
            "groupPlatform": "Linux",
            "asgName": item["instanceSet"].pop(),
        }
    item["region"] = item["region"] or ""
    item["accountId"] = item.get("accountId") or account_id
    del item["instanceSet"]
    return item


def app_pipeline_transform(
    item: dict, src_app_log_ingestion_table: str
) -> Union[dict, None]:
    app_pipe_id = item["id"]
    ingestion = list(
        scan_table_items(
            src_app_log_ingestion_table, Attr("appPipelineId").eq(item["id"]), 1
        )
    )
    if not ingestion:
        logging.warn(
            "The app pipeline %s does not contain any ingestions, skipping", app_pipe_id
        )
        return None

    rename_dict_key(item, "id", "pipelineId")
    rename_dict_key(item, "createdDt", "createdAt")
    rename_dict_key(item, "updatedDt", "updatedAt")
    param = find_by_key(item["bufferParams"], "logBucketName", key_name="paramKey")
    item["indexPrefix"] = item["aosParams"]["indexPrefix"]
    item["logConfigId"] = ingestion[0]["confId"]
    item["logConfigVersionNumber"] = 1
    item["monitor"] = {
        "backupBucketName": param["paramValue"] if param else "",
        "emails": "",
        "errorLogPrefix": "",
        "pipelineAlarmStatus": "DISABLED",
        "snsTopicArn": "",
        "snsTopicName": "",
        "status": "ENABLED",
    }
    if stack_id := item["stackId"]:
        stack = CfnStack(stack_id)

        # os helper lambda
        res = first(
            stack.find_resources(
                "OpenSearchHelperFn", resource_type="AWS::Lambda::Function"
            )
        )
        if res:
            item["helperLogGroupName"] = "/aws/lambda/" + res["PhysicalResourceId"]

        # processor lambda
        res = first(
            stack.find_resources(
                "LogProcessorFn", resource_type="AWS::Lambda::Function"
            )
        )
        if res:
            item["processorLogGroupName"] = "/aws/lambda/" + res["PhysicalResourceId"]

        # sqs
        res = first(
            stack.find_resources("LogEventQueue", resource_type="AWS::SQS::Queue")
        )
        if res:
            arn = sqs_url_to_arn(res["PhysicalResourceId"])
            item["logEventQueueArn"] = str(arn)
            item["logEventQueueName"] = arn.resource

        res = first(
            stack.find_resources("LogProcessorFn", resource_type="AWS::IAM::Role")
        )
        if res:
            arn = Arn.from_str(stack_id)
            arn.service = "iam"
            arn.region = ""
            arn.resource = "role/" + res["PhysicalResourceId"]
            item["logProcessorRoleArn"] = str(arn)
    return item


def app_log_ingestion_transform(
    item: dict,
    dest_log_conf_table: str,
    src_app_pipeline_table: str,
    dest_log_source_table: str,
) -> dict:
    rename_dict_key(item, "createdDt", "createdAt")
    rename_dict_key(item, "updatedDt", "updatedAt")
    item["autoAddPermission"] = False

    dest_log_config = get_table_item(
        dest_log_conf_table, dict(id=item["confId"], version=1)
    )
    item["logConfig"] = dest_log_config

    src_app_pipeline = get_table_item(
        src_app_pipeline_table, dict(id=item["appPipelineId"])
    )
    dest_log_source = get_table_item(
        dest_log_source_table, dict(sourceId=item["sourceId"])
    )

    if item["sourceType"].lower() == "syslog":
        item["input"] = {
            "name": "syslog",
            "params": [
                {
                    "paramKey": "protocolType",
                    "paramValue": dest_log_source["syslog"]["protocol"],
                },
                {
                    "paramKey": "port",
                    "paramValue": dest_log_source["syslog"]["port"],
                },
                {
                    "paramKey": "listen",
                    "paramValue": f"{0}.0.0.0",
                },
            ],
        }
    else:
        item["input"] = {
            "name": "tail",
            "params": [
                {
                    "paramKey": "logPath",
                    "paramValue": item["logPath"],
                },
            ],
        }

    params = src_app_pipeline["bufferParams"]
    buffer_type = src_app_pipeline["bufferType"]
    if buffer_type == "KDS":
        params.append(
            {
                "paramKey": "streamName",
                "paramValue": src_app_pipeline["bufferResourceName"],
            }
        )
    elif buffer_type == "S3":
        params.append(
            {
                "paramKey": "logBucketName",
                "paramValue": src_app_pipeline["bufferResourceName"],
            }
        )
    elif buffer_type == "None":
        buffer_type = "AOS"
        params = [
            {
                "paramKey": "opensearchEndpoint",
                "paramValue": src_app_pipeline["aosParams"]["opensearchEndpoint"],
            },
            {
                "paramKey": "indexPrefix",
                "paramValue": src_app_pipeline["aosParams"]["indexPrefix"],
            },
        ]

    item["output"] = {
        "name": buffer_type,
        "params": params,
        "roleName": src_app_pipeline.get("bufferAccessRoleName") or "",
        "roleArn": src_app_pipeline.get("bufferAccessRoleArn") or "",
    }
    return item


def instance_transform(item: dict, dest_instance_table: str) -> Union[dict, None]:
    if item["status"] != "ACTIVE":
        return None

    instance = get_table_item(
        dest_instance_table, dict(id=item["instanceId"], sourceId=item["groupId"])
    )
    if instance:
        instance["ingestionIds"].add(item["logIngestionId"])
        return instance
    else:
        return {
            "id": item["instanceId"],
            "sourceId": item["groupId"],
            "accountId": "",
            "ingestionIds": set([item["logIngestionId"]]),
            "region": "",
        }


def find_a_resource(
    stack: CfnStack, src_logical_id_regex: str, resource_type: str = ""
):
    res = first(stack.find_resources(src_logical_id_regex, resource_type))
    if not res:
        raise ValueError(
            f"Can not find logical_id with pattern '{src_logical_id_regex}'"
        )
    return res["PhysicalResourceId"]


def find_managed_policy(stack: CfnStack, src_logical_id_regex: str):
    return find_a_resource(
        stack, src_logical_id_regex, resource_type="AWS::IAM::ManagedPolicy"
    )


def find_ddb_table_name(stack: CfnStack, src_logical_id_regex: str):
    return find_a_resource(
        stack, src_logical_id_regex, resource_type="AWS::DynamoDB::Table"
    )


def on_event(event, _):
    logging.info("On event %s", event)

    request_type = event["RequestType"]
    if request_type == "Create" or request_type == "Update":
        return on_create(event)
    if request_type == "Delete":
        logging.info("Nothing to do")


def on_create(event):
    arn = Arn.from_str(event["StackId"])
    props = event["ResourceProperties"]
    src_stack_name = props["SourceStackName"]
    dest_stack_name = props["DestinationStackName"]

    src_stack = CfnStack(src_stack_name)
    dest_stack = CfnStack(dest_stack_name)

    def _migrate_ddb(
        src_logical_id_regex: str,
        dest_logical_id_regex: str,
        message: str,
        transform_fn: Optional[Callable[[dict], Union[dict, None]]] = None,
        use_batch: bool = True,
    ):
        logging.info(message)

        src_table = find_ddb_table_name(src_stack, src_logical_id_regex)
        dest_table = find_ddb_table_name(dest_stack, dest_logical_id_regex)

        logging.info("Migrate %s => %s", src_table, dest_table)

        copy_table(src_table, dest_table, transform_fn, use_batch)

    _migrate_ddb(
        "ClusterTable",
        "OpenSearchDomain",
        "Migrating opensearch domain",
        opensearch_domain_transform,
    )
    _migrate_ddb(
        r"^PipelineTable",
        r"^SvcPipeline",
        "Migrating service pipeline",
        svc_pipeline_transform,
    )
    _migrate_ddb(
        r"^LogConfTable", r"LogConf", "Migrating log config", log_config_transform
    )
    _migrate_ddb(
        r"^EKSClusterLogSourceTable",
        r"^LogSource",
        "Migrating EKS log source",
        eks_log_src_transform,
    )
    _migrate_ddb(
        r"^LogSourceTable",
        r"^LogSource",
        "Migrating log source",
        log_src_transform,
    )
    _migrate_ddb(
        r"^InstanceGroupTable",
        r"^LogSource",
        "Migrating ec2 instance group",
        lambda item: ec2_instance_grp_transform(item, arn.account_id),
    )

    src_app_log_ingestion = find_ddb_table_name(src_stack, r"AppLogIngestionTable")
    dest_log_source_table = find_ddb_table_name(dest_stack, r"^LogSource")
    src_app_pipeline_table = find_ddb_table_name(src_stack, r"^AppPipelineTable")
    dest_log_conf_table = find_ddb_table_name(dest_stack, r"^LogConf")
    dest_instance_table = find_ddb_table_name(dest_stack, r"^Instance")

    _migrate_ddb(
        r"^AppPipelineTable",
        r"^AppPipeline",
        "Migrating app pipeline",
        lambda item: app_pipeline_transform(item, src_app_log_ingestion),
    )

    _migrate_ddb(
        r"^AppLogIngestionTable",
        r"^AppLogIngestion",
        "Migrating app log ingestion",
        lambda item: app_log_ingestion_transform(
            item,
            dest_log_conf_table,
            src_app_pipeline_table,
            dest_log_source_table,
        ),
    )

    _migrate_ddb(
        r"^InstanceMetaTable",
        r"^Instance",
        "Migrating instance",
        lambda item: instance_transform(item, dest_instance_table),
        use_batch=False,
    )

    _migrate_ddb(
        r"^SubAccountLinkTable",
        r"^SubAccount",
        "Migrating member account",
    )

    logging.info("Migrating cross account central policy")
    src_policy_arn = find_managed_policy(
        src_stack, r"^APICrossAccountStackCentralAssumeRolePolicy"
    )
    dest_policy_arn = find_managed_policy(
        dest_stack, r"^APICrossAccountStackCentralAssumeRolePolicy"
    )
    logging.info("%s => %s", src_policy_arn, dest_policy_arn)
    copy_policy(src_policy_arn, dest_policy_arn)

    logging.info("Migrating logging bucket")
    src_bucket = find_a_resource(
        src_stack, r"^LogHubLoggingBucket", resource_type="AWS::S3::Bucket"
    )
    dest_bucket = find_a_resource(
        dest_stack, r"^CLLoggingBucket", resource_type="AWS::S3::Bucket"
    )
    logging.info("%s => %s", src_bucket, dest_bucket)
    copy_objects(src_bucket, dest_bucket, prefix="app_log_config")

    logging.info("Migration finished")
