# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import re
from commonlib.logging import get_logger
import json
import tempfile
import boto3
import requests
import os
from commonlib import AWSConnection

from enum import Enum
from abc import ABC, abstractmethod
from urllib.parse import quote

from requests_aws4auth import AWS4Auth
from commonlib.exception import APIException, ErrorCode
from commonlib import AWSConnection

logger = get_logger(__name__)

DEFAULT_TENANT = "global"

default_region = os.environ.get("AWS_REGION")
conn = AWSConnection()
aos_cli = conn.get_client("opensearch", default_region)
domain_name = os.environ.get("DOMAIN_NAME")


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
        self._default_header = {"Content-type": "application/json"}
        self._index_alias = self._index_prefix

    @property
    def index_alias(self):
        return self._index_alias

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

        path = f"_plugins/_ism/policies/{policy_id}"
        url = f"https://{self.endpoint}/{path}"
        response = self.get_ism_policy(url)
        status_code = response.status_code
        if status_code == 404:
            response = requests.put(
                url, auth=self._awsauth, json=policy_doc, timeout=30
            )
            status_code = response.status_code
            logger.info("--> create ism policy response code %d", status_code)
            if status_code == 200 or status_code == 201:
                return response

        if status_code == 200 or status_code == 201:
            resp_content = json.loads(response.content.decode("utf-8"))
            seq_no = resp_content.get("_seq_no")
            primary_term = resp_content.get("_primary_term")
            url = f"{url}?if_seq_no={seq_no}&if_primary_term={primary_term}"
            response = requests.put(
                url, auth=self._awsauth, json=policy_doc, timeout=30
            )
            logger.info("--> update ism policy response code %d", response.status_code)
            return response
        logger.error(
            "the last response code is %d, the last response content is %s",
            response.status_code,
            response.content,
        )
        return response

    def get_ism_policy(self, url) -> requests.Response:
        logger.info("GET %s", url)
        response = requests.get(url, auth=self._awsauth, timeout=30)
        logger.info("--> get_ism_policy response code %d", response.status_code)
        logger.info("--> get_ism_policy response content %s", response.content)
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
        elif action == "GET":
            do = requests.get
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

    def exist_index_alias(
        self,
    ) -> bool:
        """Check if an index alias exists or not

        Returns:
            bool: True if index alias exists, else False
        """

        path = self._index_alias
        response = self._request(path, "exist_index_alias", action="HEAD", timeout=30)
        if response.status_code == 200 or response.status_code == 201:
            return True
        elif response.status_code == 404:
            return False
        else:
            raise APIException(ErrorCode.UNKNOWN_ERROR, "error in exist_index_alias")

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

        headers = {"osd-xsrf": "true", "securitytenant": DEFAULT_TENANT}

        path = "_dashboards/api/saved_objects/_import?overwrite=true"

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

    def put_index_pattern(self) -> requests.Response:
        """Create or Update index pattern into OpenSearch

        Returns:
            requests.Response: request response object
        """

        headers = {"osd-xsrf": "true", "securitytenant": DEFAULT_TENANT}
        path = f"_dashboards/api/saved_objects/index-pattern/{self._index_alias}"
        payload = {
            "attributes": {
                "title": f"{self._index_alias}-*",
                "timeFieldName": "@timestamp",
            }
        }

        action = "POST"
        response = self._request(
            path, "get_index_pattern", action="GET", headers=headers, timeout=90
        )
        if response.status_code == 200:
            payload["version"] = response.json()["version"]
            action = "PUT"

        fields = self._request(
            f"_dashboards/api/index_patterns/_fields_for_wildcard",
            "fields_for_wildcard",
            action="GET",
            headers=headers,
            timeout=90,
            params=[
                ("pattern", f"{self._index_alias}-*"),
                ("meta_fields", "_source"),
                ("meta_fields", "_id"),
                ("meta_fields", "_type"),
                ("meta_fields", "_index"),
                ("meta_fields", "_score"),
            ],
        ).json()

        for field in fields["fields"]:
            field["count"] = 0
            field["scripted"] = False

        payload["attributes"]["fields"] = json.dumps(fields["fields"])

        response = self._request(
            path,
            "put_index_pattern",
            action=action,
            headers=headers,
            timeout=90,
            json=payload,
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
            "number_of_shards": f"{number_of_shards}",
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

    def check_advanced_security_enabled(self) -> bool:
        """Check if OpenSearch Domain has Fine-grained access control enabled.
        Returns:
            bool: True if enabled.
        """
        logger.info(
            "Check if OpenSearch has Advanced Security enabled for domain %s",
            domain_name,
        )
        result = False
        try:
            resp = aos_cli.describe_domain_config(
                DomainName=domain_name,
            )
            # True if fine-grained access control is enabled.
            result = resp["DomainConfig"]["AdvancedSecurityOptions"]["Options"][
                "Enabled"
            ]

        except Exception as e:
            logger.error("Unable to access and get OpenSearch config")
            logger.exception(e)
            logger.error(
                "Please ensure the subnet for this lambda is private with NAT enabled"
            )
            raise e
        return result

    def add_master_role(self, role_arn: str):
        if role_arn:
            logger.info("Add backend role %s to domain %s", role_arn, domain_name)
            try:
                resp = aos_cli.update_domain_config(
                    DomainName=domain_name,
                    AdvancedSecurityOptions={
                        "MasterUserOptions": {
                            "MasterUserARN": role_arn,
                        },
                    },
                )
                status_code = resp["ResponseMetadata"]["HTTPStatusCode"]
                logger.info("Response status: %d", status_code)
                if status_code not in (200, 201):
                    logger.error("Response status: %d", status_code)
                    raise APIException(
                        ErrorCode.UNKNOWN_ERROR,
                        "Failed to add backend role {role_arn} to domain {domain_name}",
                    )

            except Exception as e:
                logger.error("Unable to automatically add backend role")
                logger.error(e)
                logger.info("Please manually add backend role for %s", role_arn)
                raise e

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
        elif response.status_code == 404:
            return False
        else:
            raise APIException(ErrorCode.UNKNOWN_ERROR, "error in exist_index_template")

    def create_index_template(self, index_template: dict) -> requests.Response:
        """Create an index template in OpenSearch

        Args:
            index_template (dict): An index template document in json

        Returns:
            dict: A predefined index template in json
        """

        url = f"https://{self.endpoint}/_index_template/{self._index_alias}-template"
        logger.info("create index template: %s, template is %s", url, index_template)
        return requests.post(url, auth=self._awsauth, json=index_template, timeout=30)

    def create_index(self, format: str = "yyyy-MM-dd") -> requests.Response:
        # PUT <${index_prefix_name}-{now{yyyy-MM-dd}}-000001>
        path = quote(f"<{self._index_alias}" + "-{now{" + format + "}}-000001>")
        data = {"aliases": {f"{self._index_alias}": {"is_write_index": True}}}

        return self._request(path, "create_index", json=data)

    def request_index_rollover(self) -> requests.Response:

        path = quote(f"{self._index_alias}/_rollover")
        return self._request(path, "request_index_rollover", action="POST", timeout=30)


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
