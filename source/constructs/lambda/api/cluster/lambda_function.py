# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import hashlib
import json
import os
import uuid
from datetime import datetime

from boto3.dynamodb.conditions import Attr
from botocore.exceptions import ClientError
from commonlib.logging import get_logger
from commonlib.decorator import retry
from commonlib import AWSConnection, handle_error
from commonlib.utils import create_stack_name
from commonlib.exception import APIException, ErrorCode
from commonlib.model import (
    DomainStatus,
    DomainStatusCheckItem,
    DomainImportType,
    DomainStatusCheckType,
)

from cluster_auto_import_mgr import ClusterAutoImportManager
from util.metric import get_metric_data
import util.cluster_status_check_helper as cluster_status_checker

logger = get_logger(__name__)

DOMAIN_NOT_FOUND_ERROR = "OpenSearch Domain Not Found"
OPENSEARCH_MASTER_ROLE_ARN = os.environ["OPENSEARCH_MASTER_ROLE_ARN"]

partition = os.environ.get("PARTITION")
stateMachineArn = os.environ.get("STATE_MACHINE_ARN")
cluster_table_name = os.environ.get("CLUSTER_TABLE")
app_pipeline_table_name = os.environ.get("APP_PIPELINE_TABLE_NAME")
svc_pipeline_table_name = os.environ.get("SVC_PIPELINE_TABLE")

default_region = os.environ.get("AWS_REGION")

solution_vpc_id = os.environ.get("DEFAULT_VPC_ID")
solution_sg_id = os.environ.get("DEFAULT_SG_ID")
# the format example is "sunet_id1,subnet_id2"
solution_private_subnet_ids_str = os.environ.get("DEFAULT_PRIVATE_SUBNET_IDS")

conn = AWSConnection()

dynamodb = conn.get_client("dynamodb", client_type="resource")
sfn = conn.get_client("stepfunctions")
sts = conn.get_client("sts")
ec2 = conn.get_client("ec2")
aos = conn.get_client("opensearch")

cluster_table = dynamodb.Table(cluster_table_name)
app_pipeline_table = dynamodb.Table(app_pipeline_table_name)
svc_pipeline_table = dynamodb.Table(svc_pipeline_table_name)
account_id = sts.get_caller_identity()["Account"]
default_logging_bucket = os.environ.get("DEFAULT_LOGGING_BUCKET")

alarm_list = {
    "CLUSTER_RED": {"name": "clusterStatusRed", "default": "No"},
    "CLUSTER_YELLOW": {"name": "clusterStatusYellow", "default": "No"},
    "FREE_STORAGE_SPACE": {"name": "freeStorageSpace", "default": "0"},
    "WRITE_BLOCKED": {"name": "clusterIndexWritesBlocked", "default": "0"},
    "NODE_UNREACHABLE": {"name": "unreachableNodeNumber", "default": "0"},
    "SNAPSHOT_FAILED": {"name": "automatedSnapshotFailure", "default": "No"},
    "CPU_UTILIZATION": {"name": "cpuUtilization", "default": "No"},
    "JVM_MEMORY_PRESSURE": {"name": "jvmMemoryPressure", "default": "No"},
    "KMS_KEY_DISABLED": {"name": "kmsKeyError", "default": "No"},
    "KMS_KEY_INACCESSIBLE": {"name": "kmsKeyInaccessible", "default": "No"},
    "MASTER_CPU_UTILIZATION": {"name": "masterCPUUtilization", "default": "No"},
    "MASTER_JVM_MEMORY_PRESSURE": {"name": "masterJVMMemoryPressure", "default": "No"},
}


def get_or_default(d: dict, key: str, default=None):
    return d.get(key) or default


@retry(retries=5, delays=3, backoff=2)
def set_master_user_arn(aos_client, domain_name, master_role_arn: str):
    resp = aos_client.update_domain_config(
        DomainName=domain_name,
        AdvancedSecurityOptions={
            "MasterUserOptions": {
                "MasterUserARN": master_role_arn,
            },
        },
    )
    status_code = resp["ResponseMetadata"]["HTTPStatusCode"]
    if status_code >= 300:
        raise APIException(
            ErrorCode.UNKNOWN_ERROR,
            "Failed to add backend role {role_arn} to domain {domain_name}, status: {status_code}",
        )


@handle_error
def lambda_handler(event, _):
    # logger.info("Received event: " + json.dumps(event["arguments"], indent=2))

    action = event["info"]["fieldName"]
    args = event["arguments"]

    if "Alarm" in action:
        args["stack_type"] = "Alarm"

    func = {
        "listDomainNames": list_domain_names,
        "listImportedDomains": list_imported_domains,
        "getDomainVpc": get_domain_vpc,
        "getDomainDetails": get_domain_details,
        "importDomain": import_domain,
        "removeDomain": remove_domain,
        "createProxyForOpenSearch": start_sub_stack,
        "deleteProxyForOpenSearch": delete_sub_stack,
        "createAlarmForOpenSearch": start_sub_stack,
        "deleteAlarmForOpenSearch": delete_sub_stack,
        "validateVpcCidr": validate_vpc_cidr,
        "domainStatusCheck": domain_status_check,
    }

    if action in func:
        # call related functions
        return func[action](**args)
    else:
        logger.info("Event received: " + json.dumps(event["arguments"], indent=2))
        raise APIException(ErrorCode.UNKNOWN_ERROR)


def describe_es_domain(es, domain_name):
    try:
        return es.describe_elasticsearch_domain(DomainName=domain_name)
    except ClientError as err:
        if err.response["Error"]["Code"] == "ResourceNotFoundException":
            raise APIException(ErrorCode.DOMAIN_NOT_FOUND_ERROR)
        else:
            raise err


def list_domain_names(region=default_region):
    """Use SDK to list all OpenSearch domain names in a region

    It will return the status of a specific domain, like IMPORTED, IN_PROGRESS, ACTIVE, ERROR

    Args:
        region (str): AWS region Name, optional

    Returns:
        dict: a list of domain names in a format of
        {
            'domainNames': [
                {domainName: "project1", status: "ACTIVE"},
                {domainName: "project2", status: "IMPORTED"},
            ]
        }
    """

    # in some case, the region is passed as None
    if not region:
        region = default_region

    resp = cluster_table.scan(
        ProjectionExpression="domainName, #status",
        FilterExpression=Attr("region").eq(region) & Attr("status").ne("INACTIVE"),
        ExpressionAttributeNames={
            "#status": "status",
        },
    )

    items = resp["Items"]

    imported_domains = {
        item["domainName"]: DomainStatus.FAILED
        if item.get("status") == "FAILED"
        else (get_or_default(item, "status", DomainStatus.IMPORTED))
        for item in items
    }

    es = conn.get_client("es", region_name=region)
    resp = es.list_domain_names()
    result = []
    for name in resp["DomainNames"]:
        describe_resp = describe_es_domain(es, name.get("DomainName"))
        # Get Domain Status
        if name.get("DomainName") in imported_domains:
            result.append(
                {
                    "domainName": name.get("DomainName"),
                    "status": imported_domains[name.get("DomainName")],
                }
            )

        elif (
            describe_resp["DomainStatus"]["Processing"]
            or describe_resp["DomainStatus"].get("Endpoints") == ""
        ):
            result.append(
                {
                    "domainName": name.get("DomainName"),
                    "status": DomainStatus.IN_PROGRESS,
                }
            )

        elif describe_resp["DomainStatus"]["Created"]:
            result.append(
                {"domainName": name.get("DomainName"), "status": DomainStatus.ACTIVE}
            )

        elif describe_resp["DomainStatus"]["Deleted"]:
            result.append(
                {"domainName": name.get("DomainName"), "status": DomainStatus.INACTIVE}
            )

        else:
            result.append(
                {"domainName": name.get("DomainName"), "status": DomainStatus.UNKNOWN}
            )

    return {"domainNames": result}


def import_domain(**args):
    """
    If domain is not imported before,
    add a record in Cluster Table in DynamoDB with basic details

    Args:
        args (dict): args is in a format of
        {
            'domainName': 'xxx',
            'region': 'xx-xxx-1',
            'vpc': {
                'vpcId': 'vpc-xxx',
                'privateSubnetIds': 'subnet-xxx,subnet-xxx',
                'publicSubnetIds': 'subnet-xxx,subnet-xxx',
                'securityGroupId': 'sg-xxx',
            },
            'tags': [
                {'key': 'xxx', 'value': 'xxx'},
                ...
            ]
        }
        region is optional

    Raises:
        APIException: if Domain is already imported
        APIException: if OpenSearch Domain Not Found
        APIException: if OpenSearch Domain is with public network
        APIException: if OpenSearch Domain is not active (deleted)
        ClientError: SDK client error

    Returns:
        {
            "id": cluster_id,
            "resource": related_resources,
        }
    """
    region_name = args.get("region") or default_region
    domain_name = args["domainName"]

    # Note this vpc is not same as OpenSearch vpc
    # they could be the same, but not a must
    vpc = None
    if "vpc" in args:
        vpc = args["vpc"]
    logger.info(f"Trying to import domain {domain_name} in region {region_name}")

    # Check if domain exists in dynamoDB table
    if exist_domain(domain_name, region_name):
        raise APIException(ErrorCode.DOMAIN_ALREADY_IMPORTED)

    # Get AES domain details
    es = conn.get_client("es", region_name=region_name)
    try:
        resp = es.describe_elasticsearch_domain(DomainName=domain_name)
    except ClientError as err:
        if err.response["Error"]["Code"] == "ResourceNotFoundException":
            raise APIException(ErrorCode.DOMAIN_NOT_FOUND_ERROR)
        else:
            raise err

    # Check domain status. Inactive domain (if any) should be ignored.
    if "Deleted" in resp["DomainStatus"] and resp["DomainStatus"]["Deleted"]:
        raise APIException(
            ErrorCode.DOMAIN_NOT_ACTIVE, "The domain to be imported must be active"
        )

    # Check domain status. domain creating in progress (if any) should be ignored.
    if not resp["DomainStatus"]["Created"]:
        raise APIException(
            ErrorCode.DOMAIN_UNDER_PROCESSING,
            "Cannot import domain when creation is still in progress",
        )

    # Check network type
    try:
        resp["DomainStatus"]["VPCOptions"]["VPCId"]
    except KeyError:
        raise APIException(ErrorCode.AOS_NOT_IN_VPC)

    logger.info("Store the basic domain info in DynamoDB")

    # DynamoDB partition key is ID which is Domain Arn
    domain = resp["DomainStatus"]
    engine, version = "Elasticsearch", domain["ElasticsearchVersion"]
    domain_info = {"DomainStatus": {"VPCOptions": resp["DomainStatus"]["VPCOptions"]}}
    if "OpenSearch" in domain["ElasticsearchVersion"]:
        engine, version = "OpenSearch", version.removeprefix("OpenSearch_")

    arn = domain["ARN"]
    related_resources = []

    # create vpc peering, sg rule, nacl_entry, solution_route, aos_route
    import_method = DomainImportType.MANUAL
    if not vpc:
        ec2 = conn.get_client("ec2")
        cluster_auto_import_mgr = ClusterAutoImportManager(
            tags=args.get("tags", []),
            ec2=ec2,
            es_resp=resp,
            solution_vpc_id=solution_vpc_id,
            solution_sg_id=solution_sg_id,
            solution_private_subnet_ids_str=solution_private_subnet_ids_str,
        )
        cluster_auto_import_mgr.check_all_aos_cidr_overlaps(list_imported_domains())
        cluster_auto_import_mgr.check_all()
        related_resources = cluster_auto_import_mgr.get_related_resources()
        vpc = {
            "vpcId": solution_vpc_id,
            "securityGroupId": solution_sg_id,
            "privateSubnetIds": solution_private_subnet_ids_str,
        }
        import_method = DomainImportType.AUTOMATIC

    # generate a unique id
    cluster_id = unique_id(arn)

    logger.info(f"Set master user arn {OPENSEARCH_MASTER_ROLE_ARN} to {domain_name}")
    set_master_user_arn(aos, domain_name, OPENSEARCH_MASTER_ROLE_ARN)

    cluster_table.put_item(
        Item={
            "id": cluster_id,
            "domainArn": arn,
            "domainName": domain["DomainName"],
            "engine": engine,
            "version": version,
            "endpoint": domain["Endpoints"]["vpc"],
            "region": region_name,
            "accountId": account_id,
            "masterRoleArn": OPENSEARCH_MASTER_ROLE_ARN,
            "vpc": vpc,
            "resources": related_resources,
            "domainInfo": domain_info,
            "proxyStatus": "DISABLED",
            "alarmStatus": "DISABLED",
            "importMethod": import_method,
            "status": DomainStatus.IMPORTED,
            "tags": args.get("tags", []),
            "importedDt": datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
        }
    )

    return {
        "id": cluster_id,
        "resources": related_resources,
    }


def remove_domain(id, **args) -> dict:
    """Remove the record from cluster table in DynamoDB
    And reverse resource changes introduced by Import Domain according to customer needs

    Args:
        id (str): a unique id represent an imported domain in Cluster table
        isReverseConf (bool): determine reverse the resource changes or not

    Returns:
        {
            errorCode: str | null,
            error: str
            resources: [
                {name: "VPC peering", values: ["xxxxxxx"], status: DELETED},
                {name: "route table", values: ["xxxxxxx", "xxxxxxx"], status: REVERSED},
                {name: "Security Group", values: ["xxxxxxx"], status: REVERSED},
            ]
        }
    """
    is_reverse_conf = args.get("isReverseConf") or False
    logger.info(f"Trying to remove domain {id}")

    aos_domain = get_domain_by_id(id)
    if aos_domain.get("proxyStatus") in ["CREATING", "DELETING"] or aos_domain.get(
        "alarmStatus"
    ) in ["CREATING", "DELETING"]:
        raise APIException(ErrorCode.ASSOCIATED_STACK_UNDER_PROCESSING)

    domain_name = aos_domain["domainName"]

    # check service pipeline
    conditions = Attr("status").eq("ACTIVE")
    conditions = conditions.__and__(Attr("target").eq(domain_name))
    svc_pipeline_resp = svc_pipeline_table.scan(
        FilterExpression=conditions,
        ProjectionExpression="id, #parameters, #s",
        ExpressionAttributeNames={
            "#parameters": "parameters",
            "#s": "status",
        },
    )
    logger.info(f"svc_pipeline_resp is {svc_pipeline_resp}")
    if "Items" in svc_pipeline_resp and len(svc_pipeline_resp["Items"]) > 0:
        raise APIException(ErrorCode.SVC_PIPELINE_NOT_CLEANED)

    # check app pipeline
    conditions = Attr("status").eq("ACTIVE")
    conditions = conditions.__and__(Attr("aosParas.domainName").eq(domain_name))
    app_pipeline_resp = app_pipeline_table.scan(
        FilterExpression=conditions,
        ProjectionExpression="id, #aosParams,#s",
        ExpressionAttributeNames={
            "#aosParams": "aosParams",
            "#s": "status",
        },
    )
    if "Items" in app_pipeline_resp and len(app_pipeline_resp["Items"]) > 0:
        raise APIException(ErrorCode.APP_PIPELINE_NOT_CLEANED)

    # Domain information must be obtained from ddb, not through OpenSearch api.
    # Because in case before that, the domain has been deleted
    domain_info = get_domain_info(id)

    # For handling v1.x solution, in these versions, domain info is not stored in ddb.
    if not domain_info:
        es = conn.get_client("es", region_name=default_region)
        try:
            domain_info = es.describe_elasticsearch_domain(DomainName=domain_name)
        except ClientError as err:
            if err.response["Error"]["Code"] == "ResourceNotFoundException":
                raise APIException(ErrorCode.ITEM_NOT_FOUND, "The Domain Not Found")

    cluster_auto_import_mgr = ClusterAutoImportManager(
        tags=[],
        ec2=ec2,
        es_resp=domain_info,
        solution_vpc_id=solution_vpc_id,
        solution_sg_id=solution_sg_id,
        solution_private_subnet_ids_str=solution_private_subnet_ids_str,
    )
    (
        error_code,
        error_message,
        resources,
    ) = cluster_auto_import_mgr.reverse_domain_related_resources(
        id, is_reverse_conf, cluster_table
    )

    return {
        "errorCode": error_code,
        "error": error_message,
        "resources": resources,
    }


def get_domain_by_id(id):
    """Helper function to query domain by id in Cluster table"""
    logger.info("Query domain by id in cluster table in DynamoDB")
    response = cluster_table.get_item(
        Key={
            "id": id,
        }
    )
    # logger.info(response)
    if "Item" not in response:
        raise APIException(
            ErrorCode.ITEM_NOT_FOUND, "Cannot find domain in the imported list"
        )
    return response["Item"]


def exist_domain(domain_name, region_name):
    """Helper function to check if a domain already exists in cluster table,
    A record exists means the domain has been imported.

    """
    arn = f"arn:{partition}:es:{region_name}:{account_id}:domain/{domain_name}"
    # Get the id
    cluster_id = unique_id(arn)
    response = cluster_table.get_item(
        Key={
            "id": cluster_id,
        }
    )
    if "Item" in response and response["Item"]["status"] != "INACTIVE":
        return True
    return False


def automatic_imported_domain(domain_name, region_name):
    """Helper function to check if a domain is automatically imported."""
    arn = f"arn:{partition}:es:{region_name}:{account_id}:domain/{domain_name}"
    # Get the id
    cluster_id = unique_id(arn)
    response = cluster_table.get_item(
        Key={
            "id": cluster_id,
        }
    )
    if (
        "Item" in response
        and response["Item"]["status"] != "INACTIVE"
        and response["Item"].get("importMethod") == DomainImportType.AUTOMATIC
    ):
        return True
    return False


def query_domains(include_failed):
    default_conditions = Attr("status").ne("INACTIVE")

    if include_failed:
        resp = cluster_table.scan(
            FilterExpression=default_conditions,
            ProjectionExpression="id, domainName, engine, #region, version, endpoint, #status",
            ExpressionAttributeNames={
                "#region": "region",
                "#status": "status",
            },
        )
    else:
        conditions = Attr("status").ne("FAILED")
        resp = cluster_table.scan(
            FilterExpression=default_conditions & conditions,
            ProjectionExpression="id, domainName, engine, #region, version, endpoint",
            ExpressionAttributeNames={
                "#region": "region",
            },
        )

    return resp["Items"]


def set_domain_engine_and_version(result):
    for item in result:
        domain_name = item["domainName"]
        region_name = item["region"]
        es = conn.get_client("es", region_name=region_name)
        try:
            resp = es.describe_elasticsearch_domain(DomainName=domain_name)
        except ClientError as err:
            if err.response["Error"]["Code"] == "ResourceNotFoundException":
                resp = {
                    "DomainStatus": {
                        "DomainName": domain_name,
                        "IsDeleted": True,
                    }
                }
            else:
                raise err

        domain = resp["DomainStatus"]
        get_domain_engine_and_version_dynamically(domain, item)


def get_and_set_metrics(result, domain_list):
    default_metric = {
        "freeStorageSpace": 0,
        "searchableDocs": 0,
        "health": "UNKNOWN",
    }

    if domain_list:
        logger.info("Query domain metric data from CloudWatch")
        cw = conn.get_client("cloudwatch")
        metric_data = get_metric_data(cw, domain_list, account_id)
        for item in result:
            metrics = metric_data.get(item["domainName"])
            item["metrics"] = metrics if metrics else default_metric
            if item.get("status") == "FAILED":
                item["metrics"]["health"] = "ERROR"


def list_imported_domains(**args):
    metrics: bool = args.get("metrics") or False
    include_failed: bool = args.get("includeFailed") or False
    logger.info("List all domains in cluster table in DynamoDB")

    result = query_domains(include_failed)
    set_domain_engine_and_version(result)

    domain_list = [item.get("domainName") for item in result]
    if metrics:
        get_and_set_metrics(result, domain_list)

    return result


def get_domain_vpc(**args):
    """Get OpenSearch domain VPC info

    Args:
        args (dict): args should contains domainName

    Returns:
        dict: OpenSearch VPC info
    """

    logger.info("Get domain VPC info via describe API")
    domain_name = args["domainName"]
    region = args.get("region", default_region)
    es = conn.get_client("es", region_name=region)
    resp = es.describe_elasticsearch_domain(DomainName=domain_name)
    # logger.info(resp)

    # Check network type
    try:
        es_vpc = resp["DomainStatus"]["VPCOptions"]
    except KeyError:
        raise APIException(
            ErrorCode.AOS_NOT_IN_VPC,
            "Public network type is not supported, only OpenSearch domain within VPC can be imported",
        )

    return {
        "vpcId": es_vpc["VPCId"],
        "subnetIds": es_vpc["SubnetIds"],
        "availabilityZones": es_vpc["AvailabilityZones"],
        "securityGroupIds": es_vpc["SecurityGroupIds"],
    }


def get_domain_details(id: str, metrics: bool = False):
    """Get details of an imported domain.

    Domain details include two parts:
    - domain information such as nodes are retrieved via OpenSearch SDK
    - other solution related information such as tags are retrieved from cluster table in DynamoDB.

    Args:
        id (str): a unique id represent an imported domain in Cluster table
        metrics (bool, optional): Whether to include metrics. Defaults to False.

    Returns:
        dict: domain details with info such as domain name, endpoint etc.
    """
    logger.info(f"Get domain details for id {id}")

    item = get_domain_by_id(id)
    domain_name = item["domainName"]
    region_name = item["region"]

    es = conn.get_client("es", region_name=region_name)
    detail = item

    try:
        resp = es.describe_elasticsearch_domain(DomainName=domain_name)
    except ClientError as err:
        if err.response["Error"]["Code"] == "ResourceNotFoundException":
            # We need to handle the situation where the user deletes the domain in advance
            detail["storageType"] = "Instance"
            return detail
        else:
            raise err

    domain = resp["DomainStatus"]
    node = domain["ElasticsearchClusterConfig"]
    es_vpc = domain["VPCOptions"]
    cognito = domain["CognitoOptions"]

    get_domain_engine_and_version_dynamically(domain, item)

    node = domain["ElasticsearchClusterConfig"]
    es_vpc = domain["VPCOptions"]
    cognito = domain["CognitoOptions"]

    # other info like nodes, cognito etc. comes from describe api outputs
    detail["esVpc"] = {
        "vpcId": es_vpc["VPCId"],
        "subnetIds": es_vpc["SubnetIds"],
        "availabilityZones": es_vpc["AvailabilityZones"],
        "securityGroupIds": es_vpc["SecurityGroupIds"],
    }
    detail["nodes"] = {
        "instanceType": node["InstanceType"],
        "instanceCount": node["InstanceCount"],
        "dedicatedMasterEnabled": node["DedicatedMasterEnabled"],
        "zoneAwarenessEnabled": node["ZoneAwarenessEnabled"],
        "dedicatedMasterType": node.get("DedicatedMasterType", "N/A"),
        "dedicatedMasterCount": node.get("DedicatedMasterCount", 0),
        "warmEnabled": node["WarmEnabled"],
        "warmType": node.get("WarmType", "N/A"),
        "warmCount": node.get("WarmCount", 0),
        "coldEnabled": node["ColdStorageOptions"]["Enabled"]
        if "ColdStorageOptions" in node
        else False,
    }
    detail["cognito"] = {
        "enabled": cognito["Enabled"],
        "userPoolId": cognito.get("UserPoolId", "N/A"),
        "domain": get_cognito_domain(cognito.get("UserPoolId", None), region_name),
        "identityPoolId": cognito.get("IdentityPoolId", "N/A"),
        "roleArn": cognito.get("RoleArn", "N/A"),
    }

    if resp["DomainStatus"]["EBSOptions"]["EBSEnabled"]:
        detail["storageType"] = "EBS"
        detail["volume"] = {
            "type": resp["DomainStatus"]["EBSOptions"]["VolumeType"],
            "size": resp["DomainStatus"]["EBSOptions"]["VolumeSize"],
        }
    else:
        detail["storageType"] = "Instance"

    if metrics:
        logger.info("Query domain metric data from CloudWatch")
        domain_list = [domain_name]
        cw = conn.get_client("cloudwatch")
        metric_data = get_metric_data(cw, domain_list, account_id)
        detail["metrics"] = metric_data[domain_name]

    return detail


def robust_describe_elasticsearch_domain(domain_name, region):
    """Robust describe_elasticsearch_domain function
    Args:
        domain_name (str): domain name
        region (str): region name
    Returns:
        dict: domain status
    """
    es = conn.get_client("es", region_name=region)
    try:
        resp = es.describe_elasticsearch_domain(DomainName=domain_name)
    except ClientError as err:
        if err.response["Error"]["Code"] == "ResourceNotFoundException":
            # We need to handle the situation where the user deletes the domain in advance
            return {
                "status": DomainStatusCheckType.FAILED,
                "details": [],
                "multiAZWithStandbyEnabled": False,
            }
        else:
            raise err
    return resp


def get_aos_network_acl_id(describe_nacl_response):
    """Get the network ACL ID of the OpenSearch domain
    Args:
        describe_nacl_response (dict): describe network ACL response
    Returns:
        str: network ACL ID
    """
    aos_network_acl_id = ""
    if "NetworkAcls" in describe_nacl_response:
        nacls = describe_nacl_response["NetworkAcls"]
        for nacl in nacls:
            if "NetworkAclId" in nacl:
                aos_network_acl_id = nacl["NetworkAclId"]
    return aos_network_acl_id


def domain_status_check(**args):
    """Check the OpenSearch domain status
    Args:
        id (str): a unique id represent an imported domain in Cluster table
        region (str): OpenSearch region name
    Returns:
        status (str): FAILED | PASSED
        details (list): [
            {
                name (str): "Engine version"
                value (str): "v1.2.0"
                errorCode (str): "OLD_AOS_VERSION"
                status (str): "FAILED"
            }
        ]
    """
    domain_name = args["domainName"]
    region = get_or_default(args, "region", default_region)
    logger.info("Checking the status and connection of domain %s", domain_name)

    details = []

    resp = robust_describe_elasticsearch_domain(domain_name, region)
    if resp.get("status") and resp.get("status") == DomainStatusCheckType.FAILED:
        return resp
    domain = resp["DomainStatus"]
    engine, version = "Elasticsearch", domain["ElasticsearchVersion"]
    if "OpenSearch" in domain["ElasticsearchVersion"]:
        engine, version = "OpenSearch", version.removeprefix("OpenSearch_")
    network_type = "private" if domain.get("VPCOptions") else "public"

    # Check the OpenSearch Domain engine
    check_result = cluster_status_checker.validate_domain_engine(engine)
    cluster_status_checker.record_check_detail(
        details,
        check_result,
        DomainStatusCheckItem.DOMAIN_ENGINE,
        engine,
        ErrorCode.UNSUPPORTED_DOMAIN_ENGINE.name,
    )

    # Check the OpenSearch Domain version
    check_result = cluster_status_checker.validate_domain_version(version)
    cluster_status_checker.record_check_detail(
        details,
        check_result,
        DomainStatusCheckItem.DOMAIN_VERSION,
        version,
        ErrorCode.OLD_DOMAIN_VERSION.name,
    )

    # Check the OpenSearch Domain network type
    check_result = cluster_status_checker.validate_domain_network_type(network_type)
    cluster_status_checker.record_check_detail(
        details,
        check_result,
        DomainStatusCheckItem.DOMAIN_NETWORK_TYPE,
        network_type,
        ErrorCode.DOMAIN_NETWORK_TYPE_NOT_PRIVATE.name,
    )

    # Check the NAT
    check_result = cluster_status_checker.validate_solution_subnet_nat_status(
        solution_private_subnet_ids_str
    )
    cluster_status_checker.record_check_detail(
        details,
        check_result,
        DomainStatusCheckItem.NAT,
        solution_private_subnet_ids_str,
        ErrorCode.SUBNET_WITHOUT_NAT.name,
        return_warning_on_error=True,
    )

    # Check if domain exists in dynamoDB table
    # If it is a imported domain, exec network connection check
    if automatic_imported_domain(domain_name, region):
        ec2 = conn.get_client("ec2")
        cluster_auto_import_mgr = ClusterAutoImportManager(
            tags=[],
            ec2=ec2,
            es_resp=resp,
            solution_vpc_id=solution_vpc_id,
            solution_sg_id=solution_sg_id,
            solution_private_subnet_ids_str=solution_private_subnet_ids_str,
        )

        # Check the security group
        check_result = cluster_auto_import_mgr.validate_sg()
        es_vpc = resp["DomainStatus"]["VPCOptions"]
        cluster_status_checker.record_check_detail(
            details,
            check_result,
            DomainStatusCheckItem.SECURITY_GROUP,
            es_vpc["SecurityGroupIds"],
            ErrorCode.AOS_SECURITY_GROUP_CHECK_FAILED.name,
        )

        # Check the n-acl
        check_result = cluster_auto_import_mgr.validate_nacl()
        response = ec2.describe_network_acls(
            Filters=[
                {
                    "Name": "association.subnet-id",
                    "Values": es_vpc["SubnetIds"],
                },
                {
                    "Name": "vpc-id",
                    "Values": [
                        es_vpc["VPCId"],
                    ],
                },
            ],
            DryRun=False,
        )

        aos_network_acl_id = get_aos_network_acl_id(response)
        cluster_status_checker.record_check_detail(
            details,
            check_result,
            DomainStatusCheckItem.NETWORK_ACL,
            aos_network_acl_id,
            ErrorCode.NETWORK_ACL_CHECK_FAILED.name,
        )

        # Check the vpc peering connection
        if not cluster_auto_import_mgr.is_same_vpc:
            vpc_peering_id = cluster_auto_import_mgr.get_vpc_peering_connections()
            check_result = vpc_peering_id is not None
            cluster_status_checker.record_check_detail(
                details,
                check_result,
                DomainStatusCheckItem.VPC_PEERING,
                vpc_peering_id,
                ErrorCode.VPC_PEERING_CHECK_FAILED.name,
            )

        # Check the aos vpc routing
        # here we only return the subnet ids, because we do not know the specific
        # route table if the subnet has related multi tables
        check_result = cluster_auto_import_mgr.validate_aos_vpc_routing()
        cluster_status_checker.record_check_detail(
            details,
            check_result,
            DomainStatusCheckItem.AOS_VPC_ROUTING,
            es_vpc["SubnetIds"],
            ErrorCode.AOS_VPC_ROUTING_CHECK_FAILED.name,
        )

        # Check the solution vpc routing
        # here we only return the subnet ids, because we do not know the specific
        # route table if the subnet has related multi tables
        check_result = cluster_auto_import_mgr.validate_solution_vpc_routing()
        cluster_status_checker.record_check_detail(
            details,
            check_result,
            DomainStatusCheckItem.SOLUTION_VPC_ROUTING,
            solution_private_subnet_ids_str,
            ErrorCode.SOLUTION_VPC_ROUTING_CHECK_FAILED.name,
        )
    status, cleaned_detail = cluster_status_checker.clean_check_result(details)

    # Get AOS domain config
    multi_az_with_standby_enabled = False
    try:
        opensearch = conn.get_client("opensearch", region_name=region)
        resp = opensearch.describe_domain_config(DomainName=domain_name)
        multi_az_with_standby_enabled = resp["DomainConfig"]["ClusterConfig"][
            "Options"
        ]["MultiAZWithStandbyEnabled"]
    except Exception as e:
        logger.error("Unable to call describe_domain_config")
        logger.error(e)
    return {
        "status": status,
        "details": cleaned_detail,
        "multiAZWithStandbyEnabled": multi_az_with_standby_enabled,
    }


def get_cognito_domain(user_pool_id: str, region_name: str = default_region):
    """Helper function to get cognito domain url by cognito user pool id"""
    if user_pool_id is None:
        return ""
    try:
        logger.info("Query Cognito domain url")
        client = conn.get_client("cognito-idp", region_name=region_name)

        response = client.describe_user_pool(UserPoolId=user_pool_id)
        domain = response["UserPool"]["Domain"]
        domain_url = f"{domain}.auth.{region_name}.amazoncognito.com"
        return domain_url
    except Exception as e:
        logger.error("Unable to get cognito domain url")
        logger.error(e)
        return ""


def delete_sub_stack(id: str, stack_type="Proxy"):
    """Delete a sub stack for an imported OpenSearch domain.

    Args:
        id (str): a unique id for an imported domain
        stack_type (str, optional): Can either be 'Proxy' or 'Alarm'. Defaults to 'Proxy'.

    Returns:
        str: 'OK' by default
    """
    assert stack_type in [
        "Proxy",
        "Alarm",
    ], f"Unable to start a stack for unknown Type {stack_type}"

    logger.info(
        f"Start destroying {stack_type} stack for an imported OpenSearch domain"
    )
    item = get_domain_by_id(id)
    status = "DISABLED"

    stack_id = item.get(f"{stack_type.lower()}StackId")

    if stack_id:
        status = "DELETING"
        args = {"stackId": stack_id}
        exec_sfn_flow(id, "STOP", stack_type, args)

    # Update status in DynamoDB
    _update_stack_info(id, status, {}, stack_type)

    return "OK"


def start_sub_stack(id, input, stack_type="Proxy"):
    """Deploy a sub stack (proxy/alarm) for an imported OpenSearch domain

    Args:
        id (str): a unique id represent an imported domain in Cluster table
        input (dict): input for stack
        stack_type (str, optional): Can either be 'Proxy' or 'Alarm'. Defaults to 'Proxy'.

    Returns:
        str: Default to 'OK'
    """

    assert stack_type in [
        "Proxy",
        "Alarm",
    ], f"Unable to start a stack for unknown Type {stack_type}"
    logger.info(f"Start deploying {stack_type} stack for an imported OpenSearch domain")

    stack_name = create_stack_name(stack_type, str(uuid.uuid4()))
    pattern = get_stack_pattern(stack_type)
    if stack_type == "Proxy":
        input.update({"elbAccessLogBucketName": default_logging_bucket})
        params = _get_proxy_params(id, input)
    else:
        params = _get_alarm_params(id, input)

    _update_stack_info(id, "CREATING", input, stack_type)

    logger.info(params)
    args = {
        "stackName": stack_name,
        "pattern": pattern,
        "parameters": params,
    }

    exec_sfn_flow(id, "START", stack_type, args)
    return "OK"


def exec_sfn_flow(id, action="START", stack_type="Proxy", args=None):
    """Helper function to execute a step function flow"""
    logger.info(
        f"Execute a step function flow for {stack_type} stack with action {action}"
    )

    if args is None:
        args = {}

    input_args = {
        "id": id,
        "action": action,
        "type": stack_type,
        "args": args,
    }

    sfn.start_execution(
        stateMachineArn=stateMachineArn,
        input=json.dumps(input_args),
    )


def _get_proxy_params(id, input):
    """Helper function to prepare parameter key-value pair for proxy template

    input is in a format of
    {
        'vpc': {
            'vpcId': 'vpc-xxx',
            'publicSubnetIds': 'subnet-xxx,subnet-xxx',
            'privateSubnetIds': 'subnet-xxx,subnet-xxx',
            'securityGroupId': 'sg-xxx',
        },
        'customEndpoint': '...',
        'cognitoEndpoint': '...',
        'certificateArn': '...',
        'keyName': '...',
    }

    """
    logger.info("Get parameters for proxy stack")

    item = get_domain_by_id(id)
    endpoint = item["endpoint"]
    engine = item["engine"]
    process_sg = item["vpc"]["securityGroupId"]

    logger.info(input)
    param_map = {
        "elbDomain": input["customEndpoint"],
        "cognitoEndpoint": input["cognitoEndpoint"],
        "elbDomainCertificateArn": input["certificateArn"],
        "endpoint": endpoint,
        "engineType": engine,
        "keyName": input["keyName"],
        "elbAccessLogBucketName": input["elbAccessLogBucketName"],
        "proxyInstanceType": input["proxyInstanceType"],
        "proxyInstanceNumber": input["proxyInstanceNumber"],
    }
    param_map |= input["vpc"]
    public_sg = param_map.pop("securityGroupId")
    param_map["nginxSecurityGroupId"] = process_sg
    param_map["elbSecurityGroupId"] = public_sg

    params = _create_stack_params(param_map)
    return params


def _get_alarm_params(id, input):
    """Helper function to prepare parameter key-value pair for alarm template

    input are in a format of
    {
        'email': 'xxx',
        'phone': 'xxx',
        'alarms': [{
                'type': 'CLUSTER_RED',
                'value': 'true'
            },
            ...
        ]
    }
    """
    logger.info("Get parameters for alarm stack")
    item = get_domain_by_id(id)

    param_map = {
        "endpoint": item["endpoint"],
        "domainName": item["domainName"],
        "email": input["email"],
    }

    # read default values from full list of alarms
    for alarm in alarm_list.values():
        param_map[alarm["name"]] = alarm["default"]

    # overwrite alarm values from inputs
    for input_alarm in input["alarms"]:
        alarm = alarm_list.get(input_alarm["type"])
        value = (
            "Yes"
            if input_alarm["value"].lower() in ["yes", "true"]
            else input_alarm["value"]
        )
        param_map[alarm["name"]] = value
    logger.info(param_map)

    params = _create_stack_params(param_map)
    return params


def _update_stack_info(id, status, input, stack_type="Proxy"):
    """Helper function to set stack status and store the stack input in cluster table"""
    cluster_table.update_item(
        Key={
            "id": id,
        },
        UpdateExpression="SET #s = :s, #input = :input",
        ExpressionAttributeNames={
            "#s": f"{stack_type.lower()}Status",
            "#input": f"{stack_type.lower()}Input",
        },
        ExpressionAttributeValues={":s": status, ":input": input},
    )


def _create_stack_params(param_map):
    """Helper function to create cfn stack parameter key-value pairs"""

    params = []
    for k, v in param_map.items():
        params.append(
            {
                "ParameterKey": k,
                "ParameterValue": v,
            }
        )

    return params


def get_stack_pattern(stack_type="Proxy"):
    return f"{stack_type}ForOpenSearch"


def validate_vpc_cidr(**args) -> str:
    # Get AES domain details
    domain_name = args.get("domainName", "")
    region = args.get("region", default_region)
    es = conn.get_client("es", region_name=region)

    try:
        resp = es.describe_elasticsearch_domain(DomainName=domain_name)
    except ClientError as e:
        if e.response["Error"]["Code"] == "ResourceNotFoundException":
            raise APIException(ErrorCode.DOMAIN_NOT_FOUND_ERROR)
        else:
            raise e
    cluster_auto_import_mgr = ClusterAutoImportManager(
        tags=[],
        ec2=ec2,
        es_resp=resp,
        solution_vpc_id=solution_vpc_id,
        solution_sg_id=solution_sg_id,
        solution_private_subnet_ids_str=solution_private_subnet_ids_str,
    )
    args = {"metrics": True}
    cluster_auto_import_mgr.check_all_aos_cidr_overlaps(
        region, list_imported_domains(**args)
    )
    return "OK"


def unique_id(s):
    # use sha256 to generate a 32 characters string
    return hashlib.sha256(s.encode("UTF-8")).hexdigest()[:32]


def get_domain_info(id):
    """Get the domain info from ddb"""
    item = cluster_table.get_item(Key={"id": id})
    if "Item" not in item:
        raise APIException(
            ErrorCode.ITEM_NOT_FOUND, "Cannot find domain in the imported list"
        )
    return item["Item"].get("domainInfo", {})


def get_domain_engine_and_version_dynamically(resp_from_api, item_from_ddb):
    # get domain engine and version dynamically
    if resp_from_api.get("IsDeleted"):
        # handle domain is deleted before removed from the solution
        item_from_ddb["engine"] = "OpenSearch"
        item_from_ddb["version"] = "Deleted"
        return
    engine, version = "Elasticsearch", resp_from_api["ElasticsearchVersion"]
    if "OpenSearch" in resp_from_api["ElasticsearchVersion"]:
        engine, version = "OpenSearch", version.removeprefix("OpenSearch_")

    item_from_ddb["version"] = version
    item_from_ddb["engine"] = engine
