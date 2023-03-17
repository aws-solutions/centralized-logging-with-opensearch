# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import os
import re

from util.osutil import OpenSearch


class TestOpenSearch:

    def setup(self):
        self.index_prefix = os.environ.get("INDEX_PREFIX").lower()
        endpoint = os.environ.get("ENDPOINT")
        self.endpoint = re.sub(r"https?://", "", endpoint)
        print(self.endpoint)
        default_region = os.environ.get("AWS_REGION")
        self.log_type = os.environ.get("LOG_TYPE")

        self.aos = OpenSearch(
            region=default_region,
            endpoint=self.endpoint,
            index_prefix=self.index_prefix,
            engine="OpenSearch",
            log_type=self.log_type,
        )

    def test_bulk_load(self, requests_mock):
        index_name = self.aos.default_index_name()
        url = f"https://{self.endpoint}/{index_name}/_bulk"
        print(url)
        requests_mock.put(url, text="resp", status_code=201)
        resp = self.aos.bulk_load("a", index_name)
        assert resp.status_code == 201

    def test_log_type(self):
        assert self.aos.log_type == self.log_type.lower()

    def test_set_log_type(self):
        self.aos.log_type = "WAF"
        assert self.aos.log_type == "waf"

    def test_create_ism_policy(self, requests_mock):
        url = (
            f"https://{self.endpoint}/_plugins/_ism/"
            f"policies/{self.index_prefix}-{self.log_type.lower()}-ism-policy")
        requests_mock.put(url, text="resp", status_code=201)
        resp = self.aos.create_ism_policy("1d", "2d", "3d", "12h", "200gb")
        assert resp.status_code == 201

    def test_exist_index_template(self, requests_mock):
        url = f"https://{self.endpoint}/_index_template/{self.index_prefix}-{self.log_type.lower()}-template"
        requests_mock.head(url, text="", status_code=200)
        assert self.aos.exist_index_template()

        requests_mock.head(url, text="", status_code=404)
        assert not self.aos.exist_index_template()

    # Can't test this as the assets doesn't exists
    # Temporary removed this as the method is not used here.
    # def test_import_saved_objects(self, requests_mock):
    #     url = f"https://{self.endpoint}/_dashboards/api/saved_objects/_import?createNewCopies=true"
    #     print(url)
    #     requests_mock.put(url, text="resp", status_code=201)
    #     resp = self.aos.import_saved_objects()
    #     assert resp.status_code == 201


class TestElasticsearch:

    def setup(self):
        self.index_prefix = os.environ.get("INDEX_PREFIX").lower()
        endpoint = os.environ.get("ENDPOINT")
        self.endpoint = re.sub(r"https?://", "", endpoint)
        print(self.endpoint)
        default_region = os.environ.get("AWS_REGION")
        self.log_type = os.environ.get("LOG_TYPE")

        self.aos = OpenSearch(
            region=default_region,
            endpoint=self.endpoint,
            index_prefix=self.index_prefix,
            engine="Elasticsearch",
            log_type=self.log_type,
        )

    def test_create_ism_policy(self, requests_mock):
        url = f"https://{self.endpoint}/_opendistro/_ism/policies/{self.index_prefix}-{self.log_type.lower()}-ism-policy"
        print(url)
        requests_mock.put(url, text="resp", status_code=201)
        resp = self.aos.create_ism_policy("1d", "2d", "3d", "12h", "200gb")
        assert resp.status_code == 201
