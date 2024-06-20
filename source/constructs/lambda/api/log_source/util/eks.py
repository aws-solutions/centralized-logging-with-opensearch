# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0


import os
import json
from commonlib.logging import get_logger
import uuid

import socket
import certifi

from OpenSSL import SSL
from botocore.exceptions import ClientError

from commonlib import AWSConnection
from commonlib.exception import APIException, ErrorCode

logger = get_logger(__name__)

stack_prefix = os.environ.get("STACK_PREFIX", "CL")
eks_oidc_client_id = os.environ.get("EKS_OIDC_CLIENT_ID", "sts.amazonaws.com")


class EksClusterUtil:
    def __init__(self, sts_role_arn="") -> None:
        conn = AWSConnection()
        self._eks_client = conn.get_client("eks", sts_role_arn=sts_role_arn)
        self._iam_client = conn.get_client("iam", sts_role_arn=sts_role_arn)

    def describe_cluster(self, eks_cluster_name) -> dict:
        """Get extra info of eks cluster"""
        try:
            resp = self._eks_client.describe_cluster(name=eks_cluster_name)
        except ClientError as e:
            if e.response["Error"]["Code"] == "ResourceNotFoundException":
                raise APIException(ErrorCode.ITEM_NOT_FOUND, "EKS cluster is not found")
            else:
                raise e

        cluster = resp["cluster"]
        logger.info(f'Describe eks cluster "{eks_cluster_name}" reponse: {cluster}')
        # Check domain status. domain creating in progress (if any) should be ignored.
        if resp["cluster"]["status"] != "ACTIVE":
            raise APIException(
                ErrorCode.UNSUPPORTED_ACTION,
                "Cannot import EKS cluster when status is active",
            )

        cluster_info = {}
        cluster_info["eksClusterArn"] = cluster["arn"]
        eks_vpc = cluster["resourcesVpcConfig"]
        cluster_info["subnetIds"] = eks_vpc["subnetIds"]
        cluster_info["vpcId"] = eks_vpc.get("vpcId")
        cluster_info["eksClusterSGId"] = eks_vpc.get("clusterSecurityGroupId")
        cluster_info["oidcIssuer"] = cluster["identity"]["oidc"]["issuer"]
        eks_cluster_arn_split = cluster_info["eksClusterArn"].split(':')
        cluster_info["oidcArn"] = f'arn:{eks_cluster_arn_split[1]}:iam::{eks_cluster_arn_split[4]}:oidc-provider/{cluster_info["oidcIssuer"].replace("https://", "")}'
        cluster_info["endpoint"] = cluster["endpoint"]
        return cluster_info

    def create_agent_role(self, oidc_provider_arn: str, oidc_provider_url: str) -> str:
        """Generate a log agent role for eks cluster"""

        eks_log_agent_role = self._create_role_name()
        self._oidc_provider_url = oidc_provider_url
        self._generate_oidc_provider(oidc_provider_arn=oidc_provider_arn, oidc_provider_url=oidc_provider_url)
        policy_document = self._get_role_policy_doc(oidc_provider_arn)
        response = self._iam_client.create_role(
            RoleName=eks_log_agent_role,
            AssumeRolePolicyDocument=policy_document,
            Description="Using this role to associate EKS svc account",
        )
        return response["Role"]["Arn"]

    def _create_role_name(self):
        # random surfix
        surfix = str(uuid.uuid4())[:8]
        return f"{stack_prefix}-EKS-LogAgent-Role-{surfix}"

    def _get_role_policy_doc(self, oidc_provider_arn: str):
        default_svc_account = "system:serviceaccount:*:fluent-bit"
        return json.dumps(
            {
                "Version": "2012-10-17",
                "Statement": [
                    {
                        "Effect": "Allow",
                        "Principal": {"Federated": oidc_provider_arn},
                        "Action": "sts:AssumeRoleWithWebIdentity",
                        "Condition": {
                            "StringEquals": {
                                f"{self._oidc_provider_url.replace('https://', '')}:aud": eks_oidc_client_id
                            },
                            "StringLike": {
                                f"{self._oidc_provider_url.replace('https://', '')}:sub": default_svc_account
                            },
                        },
                    }
                ],
            }
        )

    def _generate_oidc_provider(self, oidc_provider_arn: str, oidc_provider_url: str) -> str:
        # Example oidc_provider_url: arn:aws:iam::1234567890:oidc-provider/oidc.eks.region.amazonaws.com/id/oidc_issuer
        need_create_open_id_connect_provider = False
        try:
            oidc_response = self._iam_client.get_open_id_connect_provider(
                OpenIDConnectProviderArn=oidc_provider_arn
            )
            # logger.info(f'query oidc_response is {oidc_response}')
            if eks_oidc_client_id not in oidc_response["ClientIDList"]:
                need_create_open_id_connect_provider = True

        except ClientError as e:
            if e.response["Error"]["Code"] == "NoSuchEntity":
                need_create_open_id_connect_provider = True
            else:
                raise e
        if need_create_open_id_connect_provider:
            thumbprint = self._get_eks_oidc_thumbprint(oidc_provider_url)
            response = self._iam_client.create_open_id_connect_provider(
                Url=oidc_provider_url,
                ClientIDList=[
                    eks_oidc_client_id,
                ],
                ThumbprintList=[thumbprint],
            )
            logger.info(f"created oidc_response is {response}")

        return oidc_provider_arn

    def _get_eks_oidc_thumbprint(self, eks_cluster_issuer: str) -> str:
        """
        To obtain the thumbprint for an OIDC IdP
        """
        issuer = eks_cluster_issuer.replace("https://", "").split("/id/")
        hostname = issuer[0]
        port = 443
        context = SSL.Context(method=SSL.TLS_METHOD)
        context.load_verify_locations(cafile=certifi.where())
        conn = SSL.Connection(
            context, socket=socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        )
        try:
            conn.settimeout(5)
            conn.connect((hostname, port))
            conn.setblocking(1)
            conn.do_handshake()
            conn.set_tlsext_host_name(hostname.encode())

            thumbprint = conn.get_peer_cert_chain()[-1].digest("sha1")
            obj = {"thumbprint": thumbprint.decode("utf-8").replace(":", "").lower()}
            return obj["thumbprint"]
        except Exception as e:
            logger.error(e)
            raise e
        finally:
            conn.close()
