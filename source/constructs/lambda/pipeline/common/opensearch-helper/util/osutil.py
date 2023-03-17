# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import json
import logging
import tempfile

import boto3
import requests
from requests_aws4auth import AWS4Auth
from util.state import ISM
from urllib.parse import quote

logger = logging.getLogger()

DEFAULT_TENANT = "global"

JSON_CONTENT_TYPE = "application/json"


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
            f"{self._index_prefix}-{self._log_type.lower()}"
            if self._log_type
            else self._index_prefix
        )

    @property
    def log_type(self):
        return self._log_type

    @log_type.setter
    def log_type(self, log_type):
        self._log_type = log_type.lower()

    def get_rollover_age_by_format(self, format: str = "yyyy-MM-dd") -> str:
        if format == "yyyy-MM":
            return "30d"
        elif format == "yyyy-MM-dd-HH":
            return "1h"
        elif format == "yyyy":
            return "365d"
        else:
            return "24h"

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
        headers = {"Content-type": JSON_CONTENT_TYPE}
        response = requests.put(url, auth=self.awsauth, headers=headers, data=data)

        logger.info("--> bulk_load response code %d", response.status_code)
        return response

    def exist_index(self) -> bool:
        """Check if an index template exists or not

        Returns:
            bool: True if index template exists, else False
        """

        path = f"{self._index_alias}"
        url = f"https://{self.endpoint}/{path}"
        logger.info("HEAD %s", path)
        headers = {"Content-type": JSON_CONTENT_TYPE}

        response = requests.head(url, auth=self.awsauth, headers=headers, timeout=30)

        logger.info("--> exist_index response code %d", response.status_code)
        if response.status_code == 200:
            return True
        return False

    def exist_index_template(self) -> bool:
        """Check if an index template exists or not

        Returns:
            bool: True if index template exists, else False
        """

        path = f"_index_template/{self._index_alias}-template"
        url = f"https://{self.endpoint}/{path}"
        logger.info("HEAD %s", path)
        headers = {"Content-type": JSON_CONTENT_TYPE}

        response = requests.head(url, auth=self.awsauth, headers=headers, timeout=30)

        logger.info("--> exist_index_template response code %d", response.status_code)
        if response.status_code == 200:
            return True
        return False

    def import_saved_objects(self) -> requests.Response:
        """Import saved objects into OpenSearch

        Returns:
            requests.Response: request response object
        """

        if not self._log_type:
            raise RuntimeError("Unable to import save objects for unknown log type")
        file_name = self._log_type + ".ndjson"

        with open(f"./assets/saved_objects/{file_name}", encoding="utf-8") as f:
            data = f.read()

        data = data.replace("%%INDEX%%", self._index_alias, -1)

        if self.engine == "OpenSearch":
            url_prefix = "_dashboards"
            xsrf = "osd-xsrf"
        else:
            url_prefix = "_plugin/kibana"
            xsrf = "kbn-xsrf"
        headers = {xsrf: "true", "securitytenant": DEFAULT_TENANT}

        path = f"{url_prefix}/api/saved_objects/_import?createNewCopies=true"
        url = f"https://{self.endpoint}/{path}"
        logger.info("POST %s", path)

        with tempfile.NamedTemporaryFile("w+t") as f:
            f.name = file_name
            f.write(data)
            f.seek(0)

            response = requests.post(
                url, auth=self.awsauth, headers=headers, timeout=90, files={"file": f}
            )

        logger.info("--> import_saved_object response code %d", response.status_code)
        return response

    def default_index_template(
        self,
        number_of_shards=5,
        number_of_replicas=1,
        codec: str = "best_compression",
        refresh_interval: str = "1s",
    ) -> dict:
        """Create an index template with default settings and mappings

        Args:
            number_of_shards (int, optional): Number of shards for index. Defaults to 5.
            number_of_replicas (int, optional): Number of replicas for index. Defaults to 1.

        Returns:
            dict: A predefined index template in json
        """

        template_file_name = self._log_type if self._log_type else "default"
        template_file_path = f"./assets/index_template/{template_file_name}.json"

        with open(template_file_path, encoding="utf-8") as f:
            template = json.load(f)
        index = {
            "number_of_shards": f"{ number_of_shards}",
            "number_of_replicas": f"{number_of_replicas}",
            "codec": f"{codec}",
            "refresh_interval": f"{refresh_interval}",
            "plugins": {
                "index_state_management": {"rollover_alias": f"{self._index_alias}"}
            },
        }
        template["settings"]["index"] = index
        index_template = {
            "index_patterns": [self._index_alias + "-*"],
            "template": template,
        }
        return index_template

    def put_index_template(self, index_template: dict) -> requests.Response:
        """Create an index template in OpenSearch

        Args:
            index_template (dict): An index template document in json

        Returns:
            dict: A predefined index template in json
        """
        path = f"_index_template/{self._index_alias}-template"
        response = requests.put(
            f"https://{self.endpoint}/{path}",
            timeout=30,
            auth=self.awsauth,
            headers={"Content-type": JSON_CONTENT_TYPE},
            json=index_template,
        )

        logger.info("PUT %s", path)
        logger.info("--> put_index_template response code %d", response.status_code)

        return response

    def default_index_name(self) -> str:
        return self._index_alias

    def import_saved_object(self, log_type: str = "") -> requests.Response:
        self._log_type = log_type.lower()
        return self.import_saved_objects()

    def create_predefined_index_template(self, name: str, **props) -> requests.Response:
        self._log_type = name.lower()
        index_template = self.default_index_template(**props)
        return self.put_index_template(index_template)

    def create_index(self, format: str = "yyyy-MM-dd") -> requests.Response:
        # PUT <${index_prefix_name}-{now{yyyy-MM-dd}}-000001>
        path = f"<{self._index_alias}" + "-{now{" + format + "}}-000001>"
        encode_path = quote(path)
        # path is f"%3C{self._index_alias}" + "-%7Bnow%7B" + format + "%7d%7d-000001%3E"
        url = f"https://{self.endpoint}/{encode_path}"
        logger.info("PUT %s", url)
        data = {"aliases": {f"{self._index_alias}": {"is_write_index": True}}}
        response = requests.put(
            url,
            timeout=30,
            auth=self.awsauth,
            headers={"Content-type": JSON_CONTENT_TYPE},
            json=data,
        )
        return response
