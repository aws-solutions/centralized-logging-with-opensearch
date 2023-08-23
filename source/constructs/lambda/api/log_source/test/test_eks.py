# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0
import os
import boto3
import pytest

from copy import deepcopy
from moto import mock_eks, mock_sts, mock_iam
from .test_eks_constants import ClusterInputs, REGION


@pytest.fixture
def sts_client():
    with mock_sts():
        boto3.client("sts", region_name=os.environ.get("AWS_REGION"))
        yield


@pytest.fixture
def iam_client():
    with mock_iam():
        region = os.environ.get("AWS_REGION")
        iam = boto3.client("iam", region_name=region)
        iam.create_open_id_connect_provider(
            Url="https://example.com",
            # even it is required to provide at least one thumbprint, AWS accepts an empty list
            ThumbprintList=["9e99a48a9960b14926bb7f3b02e22da2b0ab7280"],
        )
        yield


@pytest.fixture
def eks_client():
    with mock_eks():
        region = os.environ.get("AWS_REGION")
        eks = boto3.client("eks", region_name=region)

        values = deepcopy(ClusterInputs.REQUIRED)
        values.extend(deepcopy(ClusterInputs.OPTIONAL))
        kwargs = dict(values)

        eks.create_cluster(name="eks-demo", **kwargs)
        yield


class TestEksClusterManager:
    @mock_sts
    def test_eks(self, eks_client, iam_client):
        from util.eks import EksClusterUtil

        eks = EksClusterUtil()
        result = eks.describe_cluster("eks-demo")
        print(result)
        assert result["eksClusterArn"] is not None

        oidc_arn = result["oidcArn"]
        oidc_issuer = result["oidcIssuer"]
        result = eks._get_eks_oidc_thumbprint(oidc_issuer)
        assert result is not None
        result = eks._create_role_name()
        assert result is not None

        result = eks._generate_oidc_provider(oidc_arn, oidc_issuer)
        print(result)
        assert result is not None
