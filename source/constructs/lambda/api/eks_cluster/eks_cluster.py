# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import logging
import os
from datetime import datetime
import uuid

import boto3
from botocore import config
from botocore.exceptions import ClientError
from boto3.dynamodb.conditions import Attr
from exception import APIException
import socket
from OpenSSL import SSL
import certifi
from enum import Enum
from aws_svc_mgr import SvcManager, Boto3API

logger = logging.getLogger()
logger.setLevel(logging.INFO)

solution_version = os.environ.get("SOLUTION_VERSION", "v1.0.0")
solution_id = os.environ.get("SOLUTION_ID", "SO8025")

user_agent_config = {
    "user_agent_extra": f"AwsSolution/{solution_id}/{solution_version}"
}

default_config = config.Config(**user_agent_config)
default_region = os.environ.get("AWS_REGION")
if default_region in ["cn-north-1", "cn-northwest-1"]:
    partition = "aws-cn"
else:
    partition = "aws"

eks_cluster_log_source_table_name = os.environ.get(
    "EKS_CLUSTER_LOG_SOURCE_TABLE")
app_log_ingestion_table_name = os.environ.get("APP_LOG_INGESTION_TABLE")
aos_domain_table_name = os.environ.get("AOS_DOMAIN_TABLE")
sub_account_link_table_name = os.environ.get("SUB_ACCOUNT_LINK_TABLE_NAME")

dynamodb = boto3.resource("dynamodb", config=default_config)

eks_cluster_log_source_table = dynamodb.Table(
    eks_cluster_log_source_table_name)

sts = boto3.client("sts", config=default_config)
account_id = sts.get_caller_identity()["Account"]

eks_oidc_client_id = os.environ.get("EKS_OIDC_CLIENT_ID", "sts.amazonaws.com")
eks_oidc_provider_arn_prefix = os.environ.get(
    "EKS_OIDC_PROVIDER_ARN_PREFIX",
    f"arn:{partition}:iam::{account_id}:oidc-provider/")
daemonset_svc_account = os.environ.get(
    "SVC_ACCOUNT", "system:serviceaccount:logging:fluent-bit")
sidecar_svc_account = os.environ.get("SVC_ACCOUNT",
                                     "system:serviceaccount:*:fluent-bit")


def get_partition() -> str:
    if default_region in ["cn-north-1", "cn-northwest-1"]:
        return "aws-cn"
    return "aws"


class SOURCETYPE(Enum):
    EKS_CLUSTER = "EKSCluster"


class CRI(Enum):
    CONTAINERD = "containerd"
    DOCKER = "docker"


class DEPLOYMENTKIND(Enum):
    DAEMONSET = "DaemonSet"
    SIDECAR = "Sidecar"


class IamManager:
    iam = None
    __eks_oidc_provider_arn_prefix: str

    def __init__(self, sub_acct_id: str, region: str):
        svcMgr = SvcManager()
        self.iam = svcMgr.get_client(
            sub_account_id=sub_acct_id,
            service_name="iam",
            type=Boto3API.CLIENT,
            region=region,
        )
        if region in ["cn-north-1", "cn-northwest-1"]:
            partition = "aws-cn"
        else:
            partition = "aws"

        if account_id == sub_acct_id:
            self.__eks_oidc_provider_arn_prefix = eks_oidc_provider_arn_prefix
        else:
            self.__eks_oidc_provider_arn_prefix = (
                f"arn:{partition}:iam::{sub_acct_id}:oidc-provider/")

    def convert_tag(self, tags):
        sys_tags = list()
        if tags:
            for tag in tags:
                sys_tag = {"Key": tag["key"], "Value": tag["value"]}
                sys_tags.append(sys_tag)
            return sys_tags
        else:
            return tags

    def create_iam_role(self, deployment_kind: str, oidc_provider_url: str,
                        tags) -> str:
        self._deployment_kind = deployment_kind
        sys_tags = self.convert_tag(tags)
        eks_log_agent_role = (
            f'LogHub-EKS-LogAgent-Role-{str(uuid.uuid4()).replace("-", "")}')
        oidc_provider_arn = self.generate_oidc_provider(
            oidc_provider_url, sys_tags)
        policy_document = self.generate_assume_role_policy_document(
            oidc_provider_arn)
        response = self.iam.create_role(
            RoleName=eks_log_agent_role,
            AssumeRolePolicyDocument=policy_document,
            Description="Using this role to associate EKS svc account",
            Tags=sys_tags,
        )
        return response["Role"]["Arn"]

    def generate_oidc_provider(self, oidc_provider_url: str, tags) -> str:
        """
        Standard Region: arn:aws:iam::1234567890:oidc-provider/oidc.eks.region.amazonaws.com/id/oidc_issuer
        china Region:  arn:aws-cn:iam::1234567890:oidc-provider/oidc.eks.region.amazonaws.com/id/oidc_issuer
        """

        oidc_provider_arn = f'{self.__eks_oidc_provider_arn_prefix}{oidc_provider_url.replace("https://", "")}'
        need_create_open_id_connect_provider = False
        try:
            oidc_response = self.iam.get_open_id_connect_provider(
                OpenIDConnectProviderArn=oidc_provider_arn)
            # logger.info(f'query oidc_response is {oidc_response}')
            if eks_oidc_client_id not in oidc_response["ClientIDList"]:
                need_create_open_id_connect_provider = True

        except ClientError as e:
            if e.response["Error"]["Code"] == "NoSuchEntity":
                need_create_open_id_connect_provider = True
            else:
                raise e
        if need_create_open_id_connect_provider:
            thumbprint = self.get_eks_oidc_thumbprint(oidc_provider_url)
            response = self.iam.create_open_id_connect_provider(
                Url=oidc_provider_url,
                ClientIDList=[
                    eks_oidc_client_id,
                ],
                ThumbprintList=[thumbprint],
                Tags=tags,
            )
            logger.info(f"created oidc_response is {response}")

        return oidc_provider_arn

    def get_eks_oidc_thumbprint(self, eks_cluster_issuer: str) -> str:
        """
        To obtain the thumbprint for an OIDC IdP
        """
        issuer = eks_cluster_issuer.replace("https://", "").split("/id/")
        hostname = issuer[0]
        port = 443
        context = SSL.Context(method=SSL.TLS_METHOD)
        context.load_verify_locations(cafile=certifi.where())
        conn = SSL.Connection(context,
                              socket=socket.socket(socket.AF_INET,
                                                   socket.SOCK_STREAM))
        try:
            conn.settimeout(5)
            conn.connect((hostname, port))
            conn.setblocking(1)
            conn.do_handshake()
            conn.set_tlsext_host_name(hostname.encode())

            thumbprint = conn.get_peer_cert_chain()[-1].digest("sha1")
            obj = {
                "thumbprint": thumbprint.decode("utf-8").replace(":",
                                                                 "").lower()
            }
            return obj["thumbprint"]
        except Exception as e:
            raise e
        finally:
            conn.close()

    def generate_assume_role_policy_document(self, oidc_provider_arn: str):
        """Generate the input part"""
        if self._deployment_kind == DEPLOYMENTKIND.DAEMONSET.value:
            _assume_role_policy_document_template_path = (
                "./role_template/assume_role_policy_document_daemonset.template"
            )
            svc_account = daemonset_svc_account
        else:
            _assume_role_policy_document_template_path = (
                "./role_template/assume_role_policy_document_sidecar.template")
            svc_account = sidecar_svc_account

        policy_document = ""

        provider = oidc_provider_arn.replace(
            self.__eks_oidc_provider_arn_prefix, "")

        with open(_assume_role_policy_document_template_path, "r") as openFile:
            for line in openFile:
                line = (line.replace(
                    "$OIDC_PROVIDER_ARN",
                    oidc_provider_arn).replace("$PROVIDER", provider).replace(
                        "$OIDC_CLIENT_ID",
                        eks_oidc_client_id).replace("$SVC_ACCOUNT",
                                                    svc_account))
                policy_document += line
        policy_document += "\n"

        return policy_document


class EksClusterManager:

    def __init__(self):
        self.svcMgr = SvcManager()

    def list_eks_cluster_names(self, **args):
        """Lists the Amazon EKS clusters in your AWS account in the specified Region.

        If a cluster is already imported, it will be removed from the result

        Args:
            is_list_all(bool, optional): Indicates whether external clusters are included in the returned list.
                Use 'True' to return connected clusters, or 'False' to return only Amazon EKS clusters.

        Returns:
            dict: a list of cluster names in a format of
            {
                'clusters': [
                    'clusterA',
                    'clusterB',
                    ...
                ],
                'nextToken': nextToken
            }
        """
        accountId = args.get("accountId") or account_id
        nextToken = args.get("nextToken")
        isListAll = args.get("isListAll", False)
        region_name = args.get("region") or default_region
        # get imported eks
        conditions = Attr("status").is_in(["ACTIVE", "CREATING", "DELETING"])
        conditions = conditions.__and__(Attr("accountId").eq(accountId))
        conditions = conditions.__and__(Attr("region").eq(region_name))
        resp = eks_cluster_log_source_table.scan(
            ProjectionExpression="eksClusterName",
            FilterExpression=conditions,
        )
        items = resp["Items"]

        imported_clusters = [item["eksClusterName"] for item in items]

        eks = self.svcMgr.get_client(
            sub_account_id=accountId,
            region=region_name,
            service_name="eks",
            type=Boto3API.CLIENT,
        )

        include = []
        if isListAll:
            include = ["all"]
        resp = eks.list_clusters(include=include, nextToken=nextToken)
        logger.info(f"eks list cluster reponse is {resp}")

        if "NextToken" in resp:
            next_token = resp["NextToken"]
        else:
            next_token = ""

        result = [
            item for item in resp.get("clusters")
            if item not in imported_clusters
        ]
        return {"clusters": result, "nextToken": next_token}

    def import_eks_cluster(self, **args) -> str:

        region_name = args.get("region") or default_region
        eks_cluster_name = args.get("eksClusterName")
        eks_account_id = args.get("accountId") or account_id
        cri = args.get("cri", "")
        deployment_kind = args.get("deploymentKind")

        if not cri:
            cri = CRI.DOCKER.value

        if self.is_exist(eks_cluster_name, args.get("aosDomainId"),
                         eks_account_id, region_name):
            raise APIException(
                f'EKS Cluster "{eks_cluster_name}" has already imported')
        # Get EKS cluster details
        eks = self.svcMgr.get_client(
            sub_account_id=eks_account_id,
            region=region_name,
            service_name="eks",
            type=Boto3API.CLIENT,
        )

        try:
            eks_cluster = eks.describe_cluster(name=eks_cluster_name)
        except ClientError as e:
            if e.response["Error"]["Code"] == "ResourceNotFoundException":
                raise APIException("EKS Cluster Not Found")
            else:
                raise e
        # Check domain status. Inactive domain (if any) should be ignored.
        if ("DELETING" in eks_cluster["cluster"]["status"]) or (
                "FAILED" in eks_cluster["cluster"]["status"]):
            raise APIException("The domain to be imported must be active")

        # Check domain status. domain creating in progress (if any) should be ignored.
        if not ("ACTIVE" in eks_cluster["cluster"]["status"]):
            raise APIException(
                "Cannot import domain when creation is still in progress")
        logger.info(
            f'eks "{eks_cluster_name}" describe cluster reponse is {eks_cluster}'
        )

        arn = eks_cluster["cluster"]["arn"]
        vpc_id = eks_cluster["cluster"]["resourcesVpcConfig"].get("vpcId")
        subnet_ids = eks_cluster["cluster"]["resourcesVpcConfig"]["subnetIds"]
        cluster_security_group_id = eks_cluster["cluster"][
            "resourcesVpcConfig"].get("clusterSecurityGroupId")
        oidc_issuer = eks_cluster["cluster"]["identity"]["oidc"]["issuer"]
        endpoint = eks_cluster["cluster"]["endpoint"]
        tags = args.get("tags", [])

        agent_role_arn = self.get_eks_cluster_log_agent_role_arn_by_name(
            eks_cluster_name, eks_account_id, region_name)
        if not agent_role_arn:
            # create IAM Role
            iam_mgr = IamManager(eks_account_id, region=region_name)
            agent_role_arn = iam_mgr.create_iam_role(deployment_kind,
                                                     oidc_issuer, tags)
        # use md5 to create the id
        eks_cluster_id = str(uuid.uuid4()).replace("-", "")

        eks_cluster_log_source_table.put_item(
            Item={
                "id": eks_cluster_id,
                "aosDomainId": args.get("aosDomainId"),
                "region": region_name,
                "accountId": eks_account_id,
                "eksClusterName": eks_cluster_name,
                "eksClusterArn": arn,
                "cri": cri,
                "subnetIds": subnet_ids,
                "vpcId": vpc_id,
                "eksClusterSGId": cluster_security_group_id,
                "oidcIssuer": oidc_issuer,
                "endpoint": endpoint,
                "tags": tags,
                "logAgentRoleArn": agent_role_arn,
                "deploymentKind": deployment_kind,
                "createdDt": datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
                "updatedDt": datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
                "status": "ACTIVE",
            })
        # TODO: Check deployment kind.
        # log_agent_eks_deployment_kind_id = str(uuid.uuid4())

        # log_agent_eks_deployment_kind_table.put_item(
        #     Item={
        #         "id": log_agent_eks_deployment_kind_id,
        #         "eksClusterId": eks_cluster_id,
        #         "deploymentKind": deployment_kind,
        #         "createdDt": datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
        #         "updatedDt": datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
        #     }
        # )

        return eks_cluster_id

    def remove_eks_cluster(self, id) -> str:
        """
        set status to INACTIVE in EKSClusterLogSource table
        """
        logger.info("Deleting EKSClusterLogSource Status in DynamoDB")

        # Check if data exists in the AppLog Ingestion table
        app_log_ingestion_table = dynamodb.Table(app_log_ingestion_table_name)
        """ build filter conditions """
        conditions = Attr("status").is_in(["ACTIVE", "CREATING", "DELETING"])
        conditions = conditions.__and__(
            Attr("sourceType").eq(SOURCETYPE.EKS_CLUSTER.value))
        conditions = conditions.__and__(Attr("sourceId").eq(id))

        response = app_log_ingestion_table.scan(
            FilterExpression=conditions,
            ProjectionExpression="id,#status,#sourceType,#sourceId ",
            ExpressionAttributeNames={
                "#status": "status",
                "#sourceId": "sourceId",
                "#sourceType": "sourceType",
            },
        )
        # Assume all items are returned in the scan request
        items = response["Items"]
        # logger.info(items)
        # build pagination
        total = len(items)
        if total > 0:
            raise APIException(
                "Please delete the application log ingestion first")

        resp = eks_cluster_log_source_table.get_item(Key={"id": id})
        if "Item" not in resp:
            raise APIException("EKS Cluster Not Found")

        eks_cluster_log_source_table.update_item(
            Key={"id": id},
            UpdateExpression="SET #status = :s, #updatedDt= :uDt",
            ExpressionAttributeNames={
                "#status": "status",
                "#updatedDt": "updatedDt"
            },
            ExpressionAttributeValues={
                ":s": "INACTIVE",
                ":uDt": datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
            },
        )

        return "OK"

    def get_eks_cluster_details(self, eksClusterId) -> str:
        """
        get EKS Cluster details
        """
        resp = eks_cluster_log_source_table.get_item(Key={"id": eksClusterId})
        if "Item" not in resp or resp["Item"]["status"] == "INACTIVE":
            raise APIException("EKS Cluster Not Found")

        # get AOS domain by aosDomainId
        aos_domain_id = resp["Item"]["aosDomainId"]
        resp["Item"]["aosDomain"] = self.get_aos_imported_domain_by_id(
            aos_domain_id)

        return resp["Item"]

    def is_exist(
        self,
        eks_cluster_name: str,
        aos_domain_id: str,
        eks_account_id: str,
        region_name: str,
    ) -> bool:
        """
        check if date is exist
        """
        conditions = Attr("status").eq("ACTIVE")
        conditions = conditions.__and__(
            Attr("eksClusterName").eq(eks_cluster_name))
        conditions = conditions.__and__(Attr("aosDomainId").eq(aos_domain_id))
        conditions = conditions.__and__(Attr("accountId").eq(eks_account_id))
        conditions = conditions.__and__(Attr("region").eq(region_name))
        response = eks_cluster_log_source_table.scan(
            FilterExpression=conditions, )
        if ("Items" in response) and (len(response["Items"]) > 0):
            return True
        else:
            return False

    def get_eks_cluster_log_agent_role_arn_by_name(self, eks_cluster_name: str,
                                                   eks_account_id: str,
                                                   region_name: str) -> str:
        """
        get log agent role arn by eks cluster name
        """
        conditions = Attr("status").eq("ACTIVE")
        conditions = conditions.__and__(
            Attr("eksClusterName").eq(eks_cluster_name))
        conditions = conditions.__and__(Attr("accountId").eq(eks_account_id))
        conditions = conditions.__and__(Attr("region").eq(region_name))
        response = eks_cluster_log_source_table.scan(
            FilterExpression=conditions,
            ProjectionExpression=
            "id,aosDomainId,#region,#accountId,#eksClusterName,eksClusterArn,cri,subnetIds, vpcId, eksClusterSGId,oidcIssuer,endpoint,createdDt,logAgentRoleArn,tags,updatedDt,#status",
            ExpressionAttributeNames={
                "#region": "region",
                "#status": "status",
                "#eksClusterName": "eksClusterName",
                "#accountId": "accountId",
            },
        )
        if ("Items" in response) and (len(response["Items"]) > 0):
            log_agent_role_arn = response["Items"][0]["logAgentRoleArn"]
            return log_agent_role_arn
        else:
            return ""

    def list_imported_eks_clusters(self, page=1, count=20):
        """
        List eks clusters
        """
        logger.info(
            f"List eks cluster log source from DynamoDB in page {page} with {count} of records"
        )
        """ build filter conditions """
        conditions = Attr("status").eq("ACTIVE")
        response = eks_cluster_log_source_table.scan(
            FilterExpression=conditions,
            ProjectionExpression=
            "id,aosDomainId,#region,accountId,eksClusterName,deploymentKind,eksClusterArn,cri,subnetIds, vpcId, eksClusterSGId,oidcIssuer,endpoint,createdDt,logAgentRoleArn,tags,updatedDt,#status",
            ExpressionAttributeNames={
                "#region": "region",
                "#status": "status",
            },
        )

        # Assume all items are returned in the scan request
        items = response["Items"]
        logger.info(items)
        # build pagination
        total = len(items)
        start = (page - 1) * count
        end = page * count

        if start > total:
            start, end = 0, count
        logger.info(f"Return result from {start} to {end} in total of {total}")
        items.sort(key=lambda x: x["createdDt"], reverse=True)
        eks_clusters = items[start:end]

        for eks_cluster in eks_clusters:
            eks_cluster['aosDomain'] = self.get_aos_imported_domain_by_id(
                aos_domain_id=eks_cluster['aosDomainId'])

        return {
            "total": len(items),
            "eksClusterLogSourceList": eks_clusters,
        }

    def get_aos_imported_domain_by_id(self, aos_domain_id: str):
        """
        get AOS domain by aos domain id
        """
        aos_domain_table = dynamodb.Table(aos_domain_table_name)
        aos_domain_resp = aos_domain_table.get_item(Key={"id": aos_domain_id})
        if "Item" not in aos_domain_resp:
            raise APIException("AOS Domain Not Found")
        return aos_domain_resp["Item"]
