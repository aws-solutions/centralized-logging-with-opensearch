# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import os

import boto3
import pytest

from moto import mock_es


@pytest.fixture
def test_aes():
    with mock_es():
        region = os.environ.get("AWS_REGION")
        domain_name = os.environ.get("DOMAIN_NAME")
        client = boto3.client("es", region_name=region)
        client.create_elasticsearch_domain(
            DomainName=domain_name,
            ElasticsearchVersion="7.10",
            ElasticsearchClusterConfig={
                "InstanceType": "r6g.large.elasticsearch",
                "InstanceCount": 1,
                "DedicatedMasterEnabled": False,
                "ZoneAwarenessEnabled": False,
                "WarmEnabled": False,
                "ColdStorageOptions": {"Enabled": False},
            },
            EBSOptions={
                "EBSEnabled": True,
                "VolumeType": "gp2",
                "VolumeSize": 20,
            },
            VPCOptions={"SubnetIds": ["s1"], "SecurityGroupIds": ["sg1"]},
            CognitoOptions={"Enabled": False},
            EncryptionAtRestOptions={"Enabled": True},
            NodeToNodeEncryptionOptions={"Enabled": True},
            DomainEndpointOptions={
                "EnforceHTTPS": True,
                "CustomEndpointEnabled": False,
            },
            AdvancedSecurityOptions={"Enabled": False},
            AutoTuneOptions={"DesiredState": "ENABLED"},
        )

        yield


@pytest.fixture
def test_aos():
    with mock_es():
        region = os.environ.get("AWS_REGION")
        domain_name = os.environ.get("DOMAIN_NAME")
        client = boto3.client("es", region_name=region)
        client.create_elasticsearch_domain(
            DomainName=domain_name,
            ElasticsearchVersion="OpenSearch_1.2",
            ElasticsearchClusterConfig={
                "InstanceType": "r6g.large.elasticsearch",
                "InstanceCount": 2,
                "DedicatedMasterEnabled": True,
                "DedicatedMasterType": "m6g.large.elasticsearch",
                "DedicatedMasterCount": 3,
                "ZoneAwarenessEnabled": False,
                "WarmEnabled": False,
                "ColdStorageOptions": {"Enabled": False},
            },
            EBSOptions={
                "EBSEnabled": True,
                "VolumeType": "gp2",
                "VolumeSize": 20,
            },
            VPCOptions={"SubnetIds": ["s1"], "SecurityGroupIds": ["sg1"]},
            CognitoOptions={"Enabled": False},
            EncryptionAtRestOptions={"Enabled": True},
            NodeToNodeEncryptionOptions={"Enabled": True},
            DomainEndpointOptions={
                "EnforceHTTPS": True,
                "CustomEndpointEnabled": False,
            },
            AdvancedSecurityOptions={"Enabled": True},
            AutoTuneOptions={"DesiredState": "ENABLED"},
        )

        yield


class Response:
    def __init__(self, status_code, text=""):
        self.status_code = status_code
        self.text = text


@pytest.mark.parametrize(
    "engine,client,expected",
    [
        ("OpenSearch", test_aos, "OK"),
        ("Elasticsearch", test_aes, "OK"),
    ],
)
def test_lambda_handler(mocker, engine, client, expected):
    # Can only import here, as the environment variables need to be set first.
    import lambda_function

    mocker.patch(
        "commonlib.opensearch.OpenSearchUtil.create_index_template",
        return_value=Response(201, "OK"),
    )
    mocker.patch(
        "commonlib.opensearch.OpenSearchUtil.import_saved_objects",
        return_value=Response(201, "OK"),
    )

    mocker.patch(
        "commonlib.opensearch.OpenSearchUtil.create_ism_policy",
        return_value=Response(201, "OK"),
    )

    mocker.patch(
        "commonlib.opensearch.OpenSearchUtil.create_index",
        return_value=Response(201, "OK"),
    )

    mocker.patch(
        "commonlib.opensearch.OpenSearchUtil.exist_index_alias",
        return_value=Response(404, "NotFound"),
    )

    result = lambda_function.lambda_handler(None, None)
    assert result == expected


@pytest.mark.parametrize(
    "status,client,expected",
    [
        (403, test_aos, "OK"),
        (429, test_aos, "OK"),
    ],
)
def test_lambda_handler_with_aos_error(mocker, status, client, expected):
    # Can only import here, as the environment variables need to be set first.
    import lambda_function

    mocker.patch(
        "commonlib.opensearch.OpenSearchUtil.create_index_template",
        return_value=Response(status, "resp"),
    )
    mocker.patch(
        "commonlib.opensearch.OpenSearchUtil.import_saved_objects",
        return_value=Response(201, "OK"),
    )

    mocker.patch(
        "commonlib.opensearch.OpenSearchUtil.create_ism_policy",
        return_value=Response(201, "OK"),
    )

    mocker.patch(
        "commonlib.opensearch.OpenSearchUtil.create_index",
        return_value=Response(201, "OK"),
    )

    mocker.patch(
        "commonlib.opensearch.OpenSearchUtil.exist_index_alias",
        return_value=Response(404, "NotFound"),
    )

    mocker.patch("time.sleep")

    result = lambda_function.lambda_handler(None, None)
    assert result == expected


def test_add_master_role(test_aos):    
    import lambda_function
    role_arn = "arn:aws:lambda:us-west-2:111111111111:function:testlambda"
    lambda_function.add_master_role(role_arn)

@pytest.mark.parametrize(
    "format",
    [
        "yyyy",
        "yyyy-MM",
        "yyyy-MM-dd",
        "yyyy-MM-dd-HH",
    ],
)
def test_get_rollover_age_by_format(format):
    import lambda_function
    result = lambda_function.get_rollover_age_by_format(format)
    if format == "yyyy-MM":
        assert "30d" == result
    elif format == "yyyy-MM-dd-HH":
        assert "1h" == result
    elif format == "yyyy":
        assert "365d" == result
    else:
        assert "24h" == result

def test_decode_gzip_base64_json_safe():
    import lambda_function
    import gzip
    import base64
    import json
    d={"a":1}
    compress_str=base64.b64encode(gzip.compress(json.dumps(d).encode())).decode("utf8")
    assert d == lambda_function.decode_gzip_base64_json_safe(compress_str)
    assert None == lambda_function.decode_gzip_base64_json_safe(None)