# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import os
import pytest
from urllib.parse import quote
from idx.opensearch_client import OpenSearchUtil, Engine, ISM

default_region = os.environ.get("AWS_REGION")


class TestOpenSearch:
    def setup_method(self):
        self.index_prefix = "mylogs"
        self.endpoint = "vpc-dev-abc.us-east-1.es.amazonaws.com"
        self.log_type = "ELB"

        self.aos = OpenSearchUtil(
            region=default_region,
            endpoint=self.endpoint,
            index_prefix=self.index_prefix,
            log_type=self.log_type,
        )

    def test_bulk_load(self, requests_mock):
        req = requests_mock
        index_name = self.aos.index_alias
        url = f"https://{self.endpoint}/{index_name}/_bulk"
        req.put(url, text="resp", status_code=201)
        resp = self.aos.bulk_load("a", index_name)
        assert resp.status_code == 201

    def test_create_ism_policy(self, requests_mock):
        req_get = requests_mock
        req_put = requests_mock
        url = (
            f"https://{self.endpoint}/_plugins/_ism/"
            f"policies/{self.index_prefix}-ism-policy"
        )
        req_get.get(url,text='resp',status_code=404)
        req_put.put(url, text="resp", status_code=201)
        resp = self.aos.create_ism_policy("1d", "2d", "3d", "12h", "200gb")
        # assert resp.status_code == 201

    def test_create_index(self, requests_mock):
        req = requests_mock
        index_alias = (
            f"{self.index_prefix.lower()}"
            if self.log_type
            else self.index_prefix.lower()
        )
        format = "yyyy-MM-dd-HH"
        path = f"<{index_alias}" + "-{now{" + format + "}}-000001>"
        encode_path = quote(path)
        url = f"https://{self.endpoint}/{encode_path}"
        req.put(url, text="resp", status_code=201)
        resp = self.aos.create_index(format)
        assert resp.status_code == 201
    
    def test_put_index_pattern(self, requests_mock):
        req = requests_mock
        
        req.get(f"https://{self.endpoint}/_dashboards/api/index_patterns/_fields_for_wildcard", text='{"fields": []}', status_code=200)
        req.get(f"https://{self.endpoint}/_dashboards/api/saved_objects/index-pattern/{self.index_prefix}", text='{"version": "1"}', status_code=200)
        req.put(f"https://{self.endpoint}/_dashboards/api/saved_objects/index-pattern/{self.index_prefix}", text='{}', status_code=200)
        
        resp = self.aos.put_index_pattern()
        assert resp.status_code == 200

    def test_exist_index_template(self, requests_mock):
        req = requests_mock
        url = (
            f"https://{self.endpoint}/_index_template"
            f"/{self.index_prefix}-template"
        )
        print(">>>>")
        print(url)
        req.head(url, text="", status_code=200)
        assert self.aos.exist_index_template()

        req.head(url, text="", status_code=404)
        assert not self.aos.exist_index_template()

    # Can't test this as the assets doesn't exists
    # Temporary removed this as the method is not used here.
    # def test_import_saved_objects(self, requests_mock):
    #     url = f"https://{self.endpoint}/_dashboards/api/saved_objects/_import?createNewCopies=true"
    #     print(url)
    #     requests_mock.put(url, text="resp", status_code=201)
    #     resp = self.aos.import_saved_objects()
    #     assert resp.status_code == 201

@pytest.fixture()
def hot_only_policy():
    return {
        "name": "hot",
        "actions": [
            {
                "rollover": {},
                "timeout": "24h",
                "retry": {"count": 5, "delay": "1h"},
            }
        ],
    }


@pytest.fixture()
def delete_policy():
    return {"name": "delete", "actions": [{"delete": {}}]}


@pytest.fixture()
def cold_delete_policy():
    return {"name": "delete", "actions": [{"cold_delete": {}}]}


@pytest.fixture()
def hot_to_warm_policy():
    return {
        "name": "hot",
        "actions": [
            {
                "rollover": {},
                "timeout": "24h",
                "retry": {"count": 5, "delay": "1h"},
            }
        ],
        "transitions": [{"state_name": "warm", "conditions": {"min_index_age": "1d"}}],
    }


@pytest.fixture()
def rollover_policy():
    return {
        "name": "hot",
        "actions": [
            {
                "rollover": {
                    "min_primary_shard_size": "300gb",
                    "min_index_age": "12h",
                },
                "timeout": "24h",
                "retry": {"count": 5, "delay": "1h"},
            }
        ],
        "transitions": [{"state_name": "warm", "conditions": {"min_index_age": "1s"}}],
    }


class TestISM:
    def test_rollover(self, rollover_policy):
        ism = ISM("12h", "300gb")
        states = []
        while ism.has_next():
            ism.run("1s", "", "")
            states.append(ism.get_status())

        assert len(states) == 2
        assert states[0] == rollover_policy

    def test_hot_warm_delete(self, hot_to_warm_policy, cold_delete_policy):
        ism = ISM()
        states = []
        while ism.has_next():
            ism.run("1d", "2d", "3d")
            states.append(ism.get_status())

        assert len(states) == 4
        assert states[0] == hot_to_warm_policy
        assert states[3] == cold_delete_policy

    def test_hot_only(self, hot_only_policy):
        ism = ISM()
        states = []
        while ism.has_next():
            ism.run()
            states.append(ism.get_status())

        assert len(states) == 1
        assert states[0] == hot_only_policy

    def test_retain_only(self, delete_policy):
        ism = ISM()
        states = []
        while ism.has_next():
            ism.run(retain_age="3d")
            states.append(ism.get_status())

        assert len(states) == 2
        assert states[-1] == delete_policy

    def test_hot_warm(self, hot_to_warm_policy):
        ism = ISM()
        states = []
        while ism.has_next():
            ism.run(warm_age="1d")
            states.append(ism.get_status())

        assert len(states) == 2
        assert states[0] == hot_to_warm_policy

    def test_hot_delete(self, hot_to_warm_policy, delete_policy):
        ism = ISM()
        states = []
        while ism.has_next():
            ism.run(warm_age="1d", retain_age="3h")
            states.append(ism.get_status())

        assert len(states) == 3
        assert states[0] == hot_to_warm_policy
        assert states[-1] == delete_policy

    def test_no_delete(self, hot_to_warm_policy):
        ism = ISM()
        states = []
        while ism.has_next():
            ism.run(warm_age="1d", cold_age="36h")
            states.append(ism.get_status())

        assert len(states) == 3
        assert states[0] == hot_to_warm_policy
