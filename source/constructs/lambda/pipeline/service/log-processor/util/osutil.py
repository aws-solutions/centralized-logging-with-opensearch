# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import logging

import boto3
import requests
from requests_aws4auth import AWS4Auth
from util.state import ISM

logger = logging.getLogger()

DEFAULT_TENANT = "global"


class OpenSearch:
    """OpenSearch Utility"""

    def __init__(
        self,
        region: str,
        endpoint: str,
        index_prefix: str,
        engine="OpenSearch",
        log_type="",
    ):
        # service = 'opensearchservice'
        service = "es"
        credentials = boto3.Session().get_credentials()
        self.awsauth = AWS4Auth(
            credentials.access_key,
            credentials.secret_key,
            region,
            service,
            session_token=credentials.token,
        )

        self.endpoint = endpoint
        self.engine = engine
        self._log_type = log_type.lower()
        self._index_prefix = index_prefix.lower()

        # Assumption: Log type can be reset, but the alias remains the same
        self._index_alias = (
            f"{self._index_prefix}-{self._log_type}"
            if self._log_type and not (self._log_type.lower() == "json")
            else self._index_prefix
        )

    @property
    def log_type(self):
        return self._log_type

    @log_type.setter
    def log_type(self, log_type):
        self._log_type = log_type.lower()

    def create_ism_policy(
        self, warm_age, cold_age, retain_age, rollover_age, rollover_size
    ) -> requests.Response:
        """Create index state management policy

        Args:
            warm_age (int, optional): Number of days to move to warm storage. Defaults to 0.
            cold_age (int, optional): Number of days to move to cold storage. Defaults to 0.
            retain_age (int, optional): Number of days to retain the index. Defaults to 0.

        Returns:
            requests.Response: request response object
        """
        logger.info("Use OpenSearch API to create policy")

        policy_id = self._create_policy_id()
        policy_doc = self._create_policy_doc(
            warm_age, cold_age, retain_age, rollover_age, rollover_size
        )
        logger.info("policy_doc is %s", policy_doc)
        if self.engine == "OpenSearch":
            url_prefix = "_plugins"
        else:
            url_prefix = "_opendistro"

        path = f"{url_prefix}/_ism/policies/{policy_id}"
        url = f"https://{self.endpoint}/{path}"
        logger.info("PUT %s", path)

        response = requests.put(url, auth=self.awsauth, json=policy_doc, timeout=30)

        logger.info("--> create_ism_policy response code %d", response.status_code)
        return response

    def _create_policy_doc(
        self, warm_age, cold_age, retain_age, rollover_age, rollover_size
    ):
        """Create hot-warm-cold-delete index state management policy

        Args:
            warm_age (str, optional): Number of days or hours or m to move to warm storage. Example: 5d, 7h, 1s(seconds), 2m(minutes).
            cold_age (str, optional): Number of days to move to cold storage.
            retain_age (str, optional): Number of days to retain the index.

        Returns:
            dict: ISM Policy Doc (Json)
        """
        states = []

        ism = ISM(rollover_age, rollover_size)
        while ism.has_next():
            ism.run(warm_age, cold_age, retain_age)
            states.append(ism.get_status())

        policy_doc = {
            "policy": {
                "description": f"Index State Management Policy for index {self._index_alias}",
                "default_state": "hot",
                "schema_version": 1,
                "states": states,
                "ism_template": {
                    "index_patterns": [self._index_alias + "-*"],
                    "priority": 100,
                },
            }
        }
        return policy_doc

    def _create_policy_id(self):
        return f"{self._index_alias}-ism-policy"

    def bulk_load(self, data: str, index_name: str) -> requests.Response:
        """Use OpenSearch bulk load api to load the data

        The data must be in a format of
        {index: {}}
        {...}
        {index: {}}
        {...}

        Returns:
            requests.Response: request response object
        """
        path = f"{index_name}/_bulk"
        url = f"https://{self.endpoint}/{path}"
        logger.info("PUT %s", path)
        headers = {"Content-type": "application/json"}
        response = requests.put(url, auth=self.awsauth, headers=headers, data=data)

        logger.info("--> bulk_load response code %d", response.status_code)
        return response

    def exist_index_template(self) -> bool:
        """Check if an index template exists or not

        Returns:
            bool: True if index template exists, else False
        """

        path = f"_index_template/{self._index_alias}-template"
        url = f"https://{self.endpoint}/{path}"
        logger.info("HEAD %s", path)
        headers = {"Content-type": "application/json"}

        response = requests.head(url, auth=self.awsauth, headers=headers, timeout=30)

        logger.info("--> exist_index_template response code %d", response.status_code)
        if response.status_code == 200:
            return True
        return False

    def default_index_name(self) -> str:
        return self._index_alias
