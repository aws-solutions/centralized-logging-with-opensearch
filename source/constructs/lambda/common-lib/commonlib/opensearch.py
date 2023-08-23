# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import re
import logging
import json
import tempfile
import boto3
import requests

from enum import Enum
from abc import ABC, abstractmethod
from urllib.parse import quote

from requests_aws4auth import AWS4Auth


logger = logging.getLogger(__name__)

DEFAULT_TENANT = "global"


class Engine(Enum):
    OPENSEARCH = "OpenSearch"
    OPENSEARCH_SERVERLESS = "OpenSearchServerless"
    ELASTICSEARCH = "Elasticsearch"


class OpenSearchUtil:
    """OpenSearch Utility"""

    def __init__(
        self,
        region: str,
        endpoint: str,
        index_prefix: str,
        engine: Engine = Engine.OPENSEARCH,
        log_type="",
    ):
        self._service = "es"

        credentials = boto3.Session().get_credentials()
        self._awsauth = AWS4Auth(
            credentials.access_key,
            credentials.secret_key,
            region,
            self._service,
            session_token=credentials.token,
        )

        self.endpoint = re.sub(r"https?://", "", endpoint)
        self.engine = engine.value
        self._log_type = log_type.lower()
        self._index_prefix = index_prefix.lower()
        self._index_alias = self._index_prefix
        self._default_header = {"Content-type": "application/json"}

        self.index_name_has_log_type_suffix(True)

    def index_name_has_log_type_suffix(self, has: bool):
        if has:
            self._index_alias = f"{self._index_prefix}-{self._log_type}"
        else:
            self._index_alias = self._index_prefix

    def create_ism_policy(
        self, warm_age, cold_age, retain_age, rollover_age, rollover_size
    ) -> requests.Response:
        """Create index state management policy

        Age and Size both must contain unit.

        Example: 5d (5 days), 7h (7 hours), 2m (2 minutes), 30gb (30 GB)

        Args:
            warm_age (str, optional): Age to move to warm storage.
            cold_age (str, optional): Age to move to cold storage.
            retain_age (str, optional): Age to retain the index.
            rollover_age (str, optional): Age to rollover the index.
            rollover_size (str, optional): Size per shard to rollover the index, e.g. 30gb

        Returns:
            requests.Response: request response object
        """
        logger.info("Use OpenSearch API to create policy")

        policy_id = self._create_policy_id()
        policy_doc = self._create_policy_doc(
            warm_age, cold_age, retain_age, rollover_age, rollover_size
        )
        logger.info("policy_doc is %s", policy_doc)
        if "OpenSearch" in self.engine:
            url_prefix = "_plugins"
        else:
            url_prefix = "_opendistro"

        path = f"{url_prefix}/_ism/policies/{policy_id}"
        url = f"https://{self.endpoint}/{path}"
        logger.info("PUT %s", path)

        response = requests.put(url, auth=self._awsauth, json=policy_doc, timeout=30)

        logger.info("--> create_ism_policy response code %d", response.status_code)
        return response

    def _create_policy_doc(
        self, warm_age, cold_age, retain_age, rollover_age, rollover_size
    ):
        """Create index state management policy in json"""
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

    def _request(
        self, path: str, function: str, action="PUT", headers=None, **kwargs
    ) -> requests.Response:
        logger.info("%s %s", action, path)
        url = f"https://{self.endpoint}/{path}"
        if not headers:
            headers = self._default_header

        if action == "POST":
            do = requests.post
        elif action == "HEAD":
            do = requests.head
        else:
            do = requests.put

        response = do(url, auth=self._awsauth, headers=headers, **kwargs)
        logger.info("--> %s response code %d", function, response.status_code)
        return response

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
        return self._request(path, "bulk_load", data=data)

    def exist_index_alias(self) -> bool:
        """Check if an index alias exists or not

        Returns:
            bool: True if index alias exists, else False
        """

        path = self._index_alias
        response = self._request(path, "exist_index_alias", action="HEAD", timeout=30)
        if response.status_code == 200:
            return True
        return False

    def exist_index_template(self) -> bool:
        """Check if an index template exists or not

        Returns:
            bool: True if index template exists, else False
        """

        path = f"_index_template/{self._index_alias}-template"
        response = self._request(
            path, "exist_index_template", action="HEAD", timeout=30
        )
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

        with tempfile.NamedTemporaryFile("w+t") as f:
            f.name = file_name
            f.write(data)
            f.seek(0)

            response = self._request(
                path,
                "import_saved_object",
                action="POST",
                headers=headers,
                timeout=90,
                files={"file": f},
            )

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
            codec (str, optional): Codec. Defaults to "best_compression".
            refresh_interval (str, optional): refresh interval. Defaults to "1s".

        Returns:
            dict: A predefined index template in json
        """

        template_file_name = self._log_type if self._log_type else "default"
        template_file_path = f"./assets/index_template/{template_file_name}.json"

        with open(template_file_path, encoding="utf-8") as f:
            template = json.load(f)

        total_fields_limit = 1000
        ignore_malformed = "false"
        if self._log_type == "cloudtrail":
            total_fields_limit = 4000
            ignore_malformed = "true"

        index = {
            "mapping.total_fields.limit": f"{total_fields_limit}",
            "mapping.ignore_malformed": f"{ignore_malformed}",
            "number_of_shards": f"{ number_of_shards}",
            "number_of_replicas": f"{number_of_replicas}",
            "codec": f"{codec}",
            "refresh_interval": f"{refresh_interval}",
        }
        if self.engine == "OpenSearch":
            index["plugins"] = {
                "index_state_management": {"rollover_alias": f"{self._index_alias}"},
            }
        else:
            index["opendistro"] = {
                "index_state_management": {"rollover_alias": f"{self._index_alias}"},
            }
        template["settings"]["index"] = index
        index_template = {
            "index_patterns": [self._index_alias + "-*"],
            "template": template,
        }
        return index_template

    def create_index_template(self, index_template: dict) -> requests.Response:
        """Create an index template in OpenSearch

        Args:
            index_template (dict): An index template document in json

        Returns:
            dict: A predefined index template in json
        """
        path = f"_index_template/{self._index_alias}-template"
        return self._request(
            path,
            "create_index_template",
            action="POST",
            timeout=30,
            json=index_template,
        )

    def default_index_name(self) -> str:
        return self._index_alias

    def create_index(self, format: str = "yyyy-MM-dd") -> requests.Response:
        # PUT <${index_prefix_name}-{now{yyyy-MM-dd}}-000001>
        path = quote(f"<{self._index_alias}" + "-{now{" + format + "}}-000001>")
        data = {"aliases": {f"{self._index_alias}": {"is_write_index": True}}}

        return self._request(path, "create_index", json=data)


class ISM:
    """Index State Management State Machine"""

    def __init__(
        self,
        rollover_age="",
        rollover_size="",
    ):
        self.rollover_age = rollover_age
        self.rollover_size = rollover_size
        # start from hot
        self._state = _HotState(self)
        self._status = {}
        self._is_end = False

    def transit(self, state):
        self._status = {"name": self._state.name, "actions": self._state.actions}

        # move to new state
        self._state = state
        if state is None:
            self._is_end = True
        else:
            self._status["transitions"] = [
                {
                    "state_name": self._state.name,
                    "conditions": {"min_index_age": f"{self._state.age}"},
                }
            ]

    def run(self, warm_age="", cold_age="", retain_age=""):
        return self._state.run(warm_age, cold_age, retain_age)

    def get_status(self):
        return self._status

    def has_next(self):
        return not self._is_end


class _State(ABC):
    """Base State class"""

    name = ""

    def __init__(self, ism: ISM, age: str = ""):
        self._ism = ism
        self.age = age
        self.actions = []

    @abstractmethod
    def run(self, warm_age, cold_age, retain_age):
        """main execution logic"""
        pass


class _HotState(_State):
    name = "hot"

    def __init__(self, ism: ISM, age: str = ""):
        super().__init__(ism, age)
        action = {
            "rollover": {},
            "timeout": "24h",
            "retry": {"count": 5, "delay": "1h"},
        }
        if self._ism.rollover_size:
            action["rollover"]["min_primary_shard_size"] = f"{self._ism.rollover_size}"
        if self._ism.rollover_age:
            action["rollover"]["min_index_age"] = f"{self._ism.rollover_age}"
        self.actions = [action]

    def run(self, warm_age, cold_age, retain_age):
        # can only be hot-to-warm or hot-to-delete
        if warm_age:
            self._ism.transit(_WarmState(self._ism, warm_age))
        elif retain_age:
            self._ism.transit(_DeleteState(self._ism, retain_age))
        else:
            self._ism.transit(None)


class _WarmState(_State):
    name = "warm"

    def __init__(self, ism: ISM, age: str = ""):
        super().__init__(ism, age)
        self.actions = [
            {
                "warm_migration": {},
                "timeout": "24h",
                "retry": {"count": 5, "delay": "1h"},
            }
        ]

    def run(self, warm_age, cold_age, retain_age):
        # can only be warm-to-cold or warm-to-delete
        if cold_age:
            self._ism.transit(_ColdState(self._ism, cold_age))
        elif retain_age:
            self._ism.transit(_DeleteState(self._ism, retain_age))
        else:
            self._ism.transit(None)


class _ColdState(_State):
    name = "cold"

    def __init__(self, ism: ISM, age: str = ""):
        super().__init__(ism, age)
        self.actions = [{"cold_migration": {"timestamp_field": "@timestamp"}}]

    def run(self, warm_age, cold_age, retain_age):
        # can only be cold-to-delete
        # the default delete action needs to be changed to cold_delete
        if retain_age:
            delete_state = _DeleteState(self._ism, retain_age)
            delete_state.actions = [{"cold_delete": {}}]
            self._ism.transit(delete_state)
        else:
            self._ism.transit(None)


class _DeleteState(_State):
    name = "delete"

    def __init__(self, ism: ISM, age: str = ""):
        super().__init__(ism, age)
        self.actions = [{"delete": {}}]

    def run(self, warm_age, cold_age, retain_age):
        self._ism.transit(None)
