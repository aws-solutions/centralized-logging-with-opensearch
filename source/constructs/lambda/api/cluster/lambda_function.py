# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import hashlib
import json
import logging
import os
import uuid
from datetime import datetime

import boto3
from boto3.dynamodb.conditions import Attr
from botocore import config
from botocore.exceptions import ClientError

from cluster_auto_import_mgr import ClusterAutoImportManager
from util.metric import get_metric_data
from util.exception import APIException

logger = logging.getLogger()
logger.setLevel(logging.INFO)

SOLUTION_PREFIX = "LogHub"

solution_version = os.environ.get("SOLUTION_VERSION", "v1.0.0")
solution_id = os.environ.get("SOLUTION_ID", "SO8025")
user_agent_config = {
    "user_agent_extra": f"AwsSolution/{solution_id}/{solution_version}"
}
default_config = config.Config(**user_agent_config)

partition = os.environ.get("PARTITION")
stateMachineArn = os.environ.get("STATE_MACHINE_ARN")
table_name = os.environ.get("CLUSTER_TABLE")
default_region = os.environ.get("AWS_REGION")

loghub_vpc_id = os.environ.get("DEFAULT_VPC_ID")
loghub_sg_id = os.environ.get("DEFAULT_SG_ID")
# the format example is "sunet_id1,subnet_id2"
loghub_private_subnet_ids_str = os.environ.get("DEFAULT_PRIVATE_SUBNET_IDS")

dynamodb = boto3.resource("dynamodb", config=default_config)
sfn = boto3.client("stepfunctions", config=default_config)
sts = boto3.client("sts", config=default_config)
ec2 = boto3.client('ec2', config=default_config)

cluster_table = dynamodb.Table(table_name)
account_id = sts.get_caller_identity()["Account"]

alarm_list = {
    "CLUSTER_RED": {"name": "clusterStatusRed", "default": "No"},
    "CLUSTER_YELLOW": {"name": "clusterStatusYellow", "default": "No"},
    "FREE_STORAGE_SPACE": {"name": "freeStorageSpace", "default": "0"},
    "WRITE_BLOCKED": {"name": "clusterIndexWritesBlocked", "default": "No"},
    "NODE_UNREACHABLE": {"name": "unreachableNodeNumber", "default": "0"},
    "SNAPSHOT_FAILED": {"name": "automatedSnapshotFailure", "default": "No"},
    "CPU_UTILIZATION": {"name": "cpuUtilization", "default": "No"},
    "JVM_MEMORY_PRESSURE": {"name": "jvmMemoryPressure", "default": "No"},
    "KMS_KEY_DISABLED": {"name": "kmsKeyError", "default": "No"},
    "KMS_KEY_INACCESSIBLE": {"name": "kmsKeyInaccessible", "default": "No"},
    "MASTER_CPU_UTILIZATION": {"name": "masterCPUUtilization", "default": "No"},
    "MASTER_JVM_MEMORY_PRESSURE": {"name": "masterJVMMemoryPressure", "default": "No"},
}


def handle_error(func):
    """Decorator for exception handling"""

    def wrapper(*args, **kwargs):
        try:
            return func(*args, **kwargs)
        except APIException as e:
            logger.error(e)
            raise e
        except Exception as e:
            logger.error(e)
            raise RuntimeError(
                "Unknown exception, please check Lambda log for more details"
            )

    return wrapper


@handle_error
def lambda_handler(event, context):
    # logger.info("Received event: " + json.dumps(event, indent=2))

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
    }

    if action in func:
        # call related functions
        return func[action](**args)
    else:
        logger.info("Event received: " + json.dumps(event, indent=2))
        raise APIException(f"Unknown action {action}")


def list_domain_names(region=default_region):
    """Use SDK to list all OpenSearch domain names in a region

    If a domain is already imported or is in creating or deleting status, it will be removed from the result

    Args:
        region (str): AWS region Name, optional

    Returns:
        dict: a list of domain names in a format of
        {
            'domainNames': [
                'domainA',
                'domainB',
                ...
            ]
        }
    """

    # in some case, the region is passed as None
    if not region:
        region = default_region

    resp = cluster_table.scan(
        ProjectionExpression="domainName",
        FilterExpression=Attr("region").eq(region),
    )

    items = resp["Items"]
    imported_domains = [item["domainName"] for item in items]

    es = boto3.client("es", region_name=region, config=default_config)
    resp = es.list_domain_names()
    result = []
    for name in resp["DomainNames"]:
        try:
            describe_resp = es.describe_elasticsearch_domain(DomainName=name.get("DomainName"))
        except ClientError as e:
            if e.response["Error"]["Code"] == "ResourceNotFoundException":
                raise APIException("OpenSearch Domain Not Found")
            else:
                raise e
        # Check domain status. domain creating in progress (if any) should be ignored.
        if describe_resp["DomainStatus"]["Created"] and (not describe_resp["DomainStatus"]["Processing"])\
                and (describe_resp["DomainStatus"].get("Endpoints") != "")\
                and (name.get("DomainName") not in imported_domains):
            result.append(name.get("DomainName"))

    return {"domainNames": result}


def import_domain(**args) -> str:
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
        str: Result, default to 'OK'
    """
    region_name = args.get("region", default_region)
    domain_name = args["domainName"]

    # Note this vpc is not same as OpenSearch vpc
    # they could be the same, but not a must
    # TODO: Consider use default vpc if not provided.
    vpc = None
    if "vpc" in args:
        vpc = args["vpc"]
    logger.info(f"Trying to import domain {domain_name} in region {region_name}")

    # Check if domain exists in dynamoDB table
    if exist_domain(domain_name, region_name):
        raise APIException("Domain is already imported")

    # Get AES domain details
    es = boto3.client("es", region_name=region_name, config=default_config)
    try:
        resp = es.describe_elasticsearch_domain(DomainName=domain_name)
    except ClientError as e:
        if e.response["Error"]["Code"] == "ResourceNotFoundException":
            raise APIException("OpenSearch Domain Not Found")
        else:
            raise e

    # Check domain status. Inactive domain (if any) should be ignored.
    if "Deleted" in resp["DomainStatus"] and resp["DomainStatus"]["Deleted"]:
        raise APIException("The domain to be imported must be active")

    # Check domain status. domain creating in progress (if any) should be ignored.
    if not resp["DomainStatus"]["Created"]:
        raise APIException("Cannot import domain when creation is still in progress")

    # Check network type
    try:
        resp["DomainStatus"]["VPCOptions"]["VPCId"]
    except KeyError:
        raise APIException(
            "Public network type is not supported, only OpenSearch domain within VPC can be imported"
        )

    logger.info("Store the basic domain info in DynamoDB")

    # DynamoDB partition key is ID which is Domain Arn
    # TODO: Version might be mutable (by upgrade?)
    domain = resp["DomainStatus"]
    engine, version = "Elasticsearch", domain["ElasticsearchVersion"]
    if "OpenSearch" in domain["ElasticsearchVersion"]:
        engine, version = "OpenSearch", version.removeprefix("OpenSearch_")

    arn = domain["ARN"]

    # create vpc peering, sg rule, nacl_entry, loghub_route, aos_route
    if not vpc:
        ec2 = boto3.client("ec2", config=default_config)
        cluster_auto_import_mgr = ClusterAutoImportManager(
            tags=args.get("tags", []),
            ec2=ec2,
            es_resp=resp,
            loghub_vpc_id=loghub_vpc_id,
            loghub_sg_id=loghub_sg_id,
            loghub_private_subnet_ids_str=loghub_private_subnet_ids_str,
        )
        cluster_auto_import_mgr.check_all_aos_cidr_overlaps(list_imported_domains(False)) 
        cluster_auto_import_mgr.check_all()
        vpc = {
            "vpcId": loghub_vpc_id,
            "securityGroupId": loghub_sg_id,
            "privateSubnetIds": loghub_private_subnet_ids_str,
        }
    # use md5 to create the id
    id = hashlib.md5(arn.encode("UTF-8")).hexdigest()

    cluster_table.put_item(
        Item={
            "id": id,
            "domainArn": arn,
            "domainName": domain["DomainName"],
            "engine": engine,
            "version": version,
            "endpoint": domain["Endpoints"]["vpc"],
            "region": region_name,
            "accountId": account_id,
            "vpc": vpc,
            "proxyStatus": "DISABLED",
            "alarmStatus": "DISABLED",
            "tags": args.get("tags", []),
            "importedDt": datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
        }
    )

    return "OK"


def remove_domain(id) -> str:
    """Remove the record from cluster table in DynamoDB

    Args:
        id (str): a unique id represent an imported domain in Cluster table

    Returns:
        str: Result, default to 'OK'
    """

    # TODO: Might consider use delete marker rather than deleting the record.
    logger.info(f"Trying to remove domain {id}")

    cluster_table.delete_item(
        Key={
            "id": id,
        }
    )
    return "OK"


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
        raise APIException("Cannot find domain in the imported list")
    return response["Item"]


def exist_domain(domain_name, region_name):
    """Helper function to check if a domain already exists in cluster table,
    A record exists means the domain has been imported.

    """
    arn = f"arn:{partition}:es:{region_name}:{account_id}:domain/{domain_name}"
    # use md5 to get the id
    id = hashlib.md5(arn.encode("UTF-8")).hexdigest()
    response = cluster_table.get_item(
        Key={
            "id": id,
        }
    )
    if "Item" in response:
        return True
    return False


def list_imported_domains(metrics: bool = False):
    """List all the imported domain info
    if metrics is set to True, will need to call CloudWatch API to get metric data

    Args:
        metrics (bool, optional): Whether to include metrics. Defaults to False.

    Returns:
        list: a list of imported domains in a format of
        {
            'id': 'xxx',
            'domainName': 'xxx',
            'engine': Elasticsearch | OpenSearch
            'region': 'xxx',
            'version': 'xxx',
            'endpoint': 'xxx',
            'metrics': {
                'freeStorageSpace': 111,
                'searchableDocs': 222,
                'health': GREEN,
            }
        }
    """
    logger.info("List all domains in cluster table in DynamoDB")

    default_metric = {
        "freeStorageSpace": 0,
        "searchableDocs": 0,
        "health": "UNKNOWN",
    }


    # Currently Assume the number of domains can't be large
    resp = cluster_table.scan(
        ProjectionExpression="id, domainName, engine, #region, version, endpoint",
        ExpressionAttributeNames={
            "#region": "region",
        },
    )

    result = resp["Items"]
    # logger.info(result)

    domain_list = [item["domainName"] for item in result]

    if metrics and len(domain_list) > 0:
        logger.info("Query domain metric data from CloudWatch")
        cw = boto3.client("cloudwatch", config=default_config)
        metric_data = get_metric_data(cw, domain_list, account_id)
        for item in result:
            metrics = metric_data.get(item["domainName"])
            item["metrics"] = metrics if metrics else default_metric

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
    es = boto3.client("es", region_name=region, config=default_config)
    resp = es.describe_elasticsearch_domain(DomainName=domain_name)
    # logger.info(resp)

    # Check network type
    try:
        es_vpc = resp["DomainStatus"]["VPCOptions"]
    except KeyError:
        raise APIException(
            "Public network type is not supported, only OpenSearch domain within VPC can be imported"
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

    es = boto3.client("es", region_name=region_name, config=default_config)

    try:
        resp = es.describe_elasticsearch_domain(DomainName=domain_name)
    except ClientError as e:
        if e.response["Error"]["Code"] == "ResourceNotFoundException":
            raise APIException("OpenSearch Domain Not Found")
        else:
            raise e

    node = resp["DomainStatus"]["ElasticsearchClusterConfig"]
    es_vpc = resp["DomainStatus"]["VPCOptions"]
    cognito = resp["DomainStatus"]["CognitoOptions"]

    detail = item
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
        cw = boto3.client("cloudwatch", config=default_config)
        metric_data = get_metric_data(cw, domain_list, account_id)
        detail["metrics"] = metric_data[domain_name]

    return detail


def get_cognito_domain(user_pool_id: str, region_name: str = default_region):
    """Helper function to get cognito domain url by cognito user pool id"""
    if user_pool_id is None:
        return ""
    try:
        logger.info("Query Cognito domain url")
        client = boto3.client(
            "cognito-idp", region_name=region_name, config=default_config
        )
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
    _update_stack_info(id, "CREATING", input, stack_type)

    stack_name = create_stack_name(stack_type)
    pattern = get_stack_pattern(stack_type)
    if stack_type == "Proxy":
        params = _get_proxy_params(id, input)
    else:
        params = _get_alarm_params(id, input)

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

    input = {
        "id": id,
        "action": action,
        "type": stack_type,
        "args": args,
    }

    sfn.start_execution(
        stateMachineArn=stateMachineArn,
        input=json.dumps(input),
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
        'email': 'xxx@xxx.xxx',
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
        UpdateExpression="SET #status = :status, #input = :input",
        ExpressionAttributeNames={
            "#status": f"{stack_type.lower()}Status",
            "#input": f"{stack_type.lower()}Input",
        },
        ExpressionAttributeValues={":status": status, ":input": input},
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


def create_stack_name(stack_type="Proxy"):
    # TODO: prefix might need to come from env
    uid = str(uuid.uuid4())
    return f"{SOLUTION_PREFIX}-{stack_type}-{uid[:5]}"


def get_stack_pattern(stack_type="Proxy"):
    return f"{stack_type}ForOpenSearch"

def validate_vpc_cidr(domainName: str, region=default_region)->str:
    # Get AES domain details
    es = boto3.client('es', region_name=region, config=default_config)
    try:
        resp = es.describe_elasticsearch_domain(DomainName=domainName)
    except ClientError as e:
        if e.response['Error']['Code'] == 'ResourceNotFoundException':
            raise APIException('OpenSearch Domain Not Found')
        else:
            raise e
    cluster_auto_import_mgr=ClusterAutoImportManager(tags=[], ec2=ec2, es_resp=resp,
                             loghub_vpc_id=loghub_vpc_id,
                             loghub_sg_id=loghub_sg_id,
                             loghub_private_subnet_ids_str=loghub_private_subnet_ids_str)
    cluster_auto_import_mgr.check_all_aos_cidr_overlaps(region,list_imported_domains(False))
    return 'OK'