# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

from commonlib.logging import get_logger
from commonlib import AWSConnection
import os
import time
import json
import gzip
import base64
from datetime import datetime, date
from botocore.exceptions import ClientError
from idx.opensearch_client import OpenSearchUtil
from commonlib.exception import APIException, ErrorCode


logger = get_logger(__name__)

default_region = os.environ.get("AWS_REGION")
conn = AWSConnection()

TOTAL_RETRIES = 2
SLEEP_INTERVAL = 10
DEFAULT_BULK_BATCH_SIZE = "10000"
batch_size = int(os.environ.get("BULK_BATCH_SIZE", DEFAULT_BULK_BATCH_SIZE))
BULK_ACTION = "index"

log_type = os.environ.get("LOG_TYPE", "").lower()
warm_age = os.environ.get("WARM_AGE", "")
cold_age = os.environ.get("COLD_AGE", "")
retain_age = os.environ.get("RETAIN_AGE", "")
index_suffix = os.environ.get("INDEX_SUFFIX", "yyyy-MM-dd")

rollover_size = os.environ.get("ROLLOVER_SIZE", "30GiB")

number_of_shards = int(os.environ.get("NUMBER_OF_SHARDS", "5"))
number_of_replicas = int(os.environ.get("NUMBER_OF_REPLICAS", "1"))
codec = os.environ.get("CODEC", "best_compression")
refresh_interval = os.environ.get("REFRESH_INTERVAL", "30s")

current_role_arn = os.environ.get("ROLE_ARN", "")

engine_type = os.environ.get("ENGINE", "OpenSearch")
index_prefix = os.environ.get("INDEX_PREFIX")
endpoint = os.environ.get("ENDPOINT")

create_dashboard = os.environ.get("CREATE_DASHBOARD", "No")
INDEX_TEMPLATE_GZIP_BASE64 = os.environ.get("INDEX_TEMPLATE_GZIP_BASE64", "")

lambda_client = conn.get_client("lambda", default_region)
function_name = os.environ.get("FUNCTION_NAME")

init_master_role_job = int(os.environ.get("INIT_MASTER_ROLE_JOB", "0"))
init_ism_job = int(os.environ.get("INIT_ISM_JOB", "0"))
init_template_job = int(os.environ.get("INIT_TEMPLATE_JOB", "0"))
init_dashboard_job = int(os.environ.get("INIT_DASHBOARD_JOB", "0"))
init_alias_job = int(os.environ.get("INIT_ALIAS_JOB", "0"))
init_index_pattern_job = int(os.environ.get("INIT_INDEX_PATTERN_JOB", "0"))
rollover_index_job = int(os.environ.get("ROLLOVER_INDEX_JOB", "1"))
stack_name = os.environ.get("STACK_NAME", "")

CONFIG_JSON = os.environ.get("CONFIG_JSON", "")
sub_category = str(os.environ.get("SUB_CATEGORY", ""))

no_buffer_access_role_arn = str(os.environ.get("NO_BUFFER_ACCESS_ROLE_ARN", ""))

IS_APP_PIPELINE = "apppipe" in stack_name.lower() or CONFIG_JSON
IS_SVC_PIPELINE = not IS_APP_PIPELINE

opensearch_util = OpenSearchUtil(
    region=default_region,
    endpoint=endpoint,
    index_prefix=index_prefix,
    log_type=log_type,
)


class AosIdxService:
    def run_func_with_retry(
        self,
        func,
        func_name: str,
        total_retry=TOTAL_RETRIES,
        sleep_interval=SLEEP_INTERVAL,
        **kwargs,
    ):
        """Run a function and retry a number of times if failed"""
        retry = 1
        while True:
            response = func(**kwargs)
            if response.status_code < 300:
                logger.info("%s runs successfully", func_name)
                break
            logger.error("%s failed: %s", func_name, response.text)
            if response.status_code == 403 or response.status_code == 409:
                logger.info("Please add access to OpenSearch for this Lambda")
                if response.status_code == 403:
                    logger.error(
                        "the last response code is %d, the last response content is %s",
                        response.status_code,
                        response.content,
                    )
                    self.map_backend_role()
                raise APIException(
                    ErrorCode.UNKNOWN_ERROR,
                    "Lambda does not have permission to call AOS, the message will be re-consumed and then retried. ",
                )

            if retry >= total_retry:
                logger.info(
                    "%s failed after %d retries, please manually create it",
                    func_name,
                    retry,
                )
                logger.error(
                    "the last response code is %d, the last response content is %s",
                    response.status_code,
                    response.content,
                )
                raise APIException(
                    ErrorCode.UNKNOWN_ERROR,
                    f"Lambda has called AOS {total_retry} times, the message will be re-consumed and then retried. ",
                )

            logger.info(f"Sleep {sleep_interval} seconds and retry...")
            retry += 1
            time.sleep(sleep_interval)

    def init_idx_env(self):
        self._init_master_role()
        self._init_ism()
        self._init_dashboard()
        self._init_template()
        self._init_alias()
        self._rollover_index()
        if CONFIG_JSON and sub_category == "FLB":
            self.adjust_lambda_env_var(env_name="SUB_CATEGORY", val="S3")

    def _init_master_role(self):
        global init_master_role_job
        if init_master_role_job == 0:
            self.map_backend_role()
            init_master_role_job = 1
            self.adjust_lambda_env_var(env_name="INIT_MASTER_ROLE_JOB", val=1)

        else:
            if int(os.environ.get("INIT_MASTER_ROLE_JOB", "0")) == 0:
                self.adjust_lambda_env_var(env_name="INIT_MASTER_ROLE_JOB", val=1)

    def map_backend_role(self):
        advanced_security_enabled_flag = (
            opensearch_util.check_advanced_security_enabled()
        )
        if advanced_security_enabled_flag:
            logger.info("OpenSearch domain has Advanced Security enabled")
            opensearch_util.add_master_role(current_role_arn)
            opensearch_util.add_master_role(no_buffer_access_role_arn)

    def _get_rollover_age_by_format(self, format: str = "yyyy-MM-dd") -> str:
        if format == "yyyy-MM":
            return "30d"
        if format == "yyyy-MM-dd-HH":
            return "1h"
        return "yyyy" if format == "365d" else "24h"

    def _init_ism(self):
        global init_ism_job
        if init_ism_job == 0:
            if (
                warm_age == ""
                and cold_age == ""
                and retain_age == ""
                and rollover_size == ""
            ):
                logger.info("No need to create ISM policy")
                return None

            rollover_age = self._get_rollover_age_by_format(index_suffix)
            kwargs = {
                "warm_age": warm_age,
                "cold_age": cold_age,
                "retain_age": retain_age,
                "rollover_age": rollover_age,
                "rollover_size": rollover_size,
            }
            self.run_func_with_retry(
                opensearch_util.create_ism_policy,
                "Create ISM",
                2,
                sleep_interval=5,
                **kwargs,
            )
            init_ism_job = 1
            self.adjust_lambda_env_var(env_name="INIT_ISM_JOB", val=1)
        else:
            if int(os.environ.get("INIT_ISM_JOB", "0")) == 0:
                self.adjust_lambda_env_var(env_name="INIT_ISM_JOB", val=1)

    def _decode_gzip_base64_json_safe(self, s: str):
        if not s:
            return None
        try:
            return json.loads(gzip.decompress(base64.b64decode(s)))
        except Exception as e:
            logger.warning("Error decoding gzip base64 json string: %s", e)
            return None

    def _get_index_template(self):
        if INDEX_TEMPLATE_GZIP_BASE64:
            logger.info("Using INDEX_TEMPLATE_GZIP_BASE64")
            return self._decode_gzip_base64_json_safe(INDEX_TEMPLATE_GZIP_BASE64)
        else:
            logger.info("Using default index template")
            return opensearch_util.default_index_template(
                number_of_shards, number_of_replicas, codec, refresh_interval
            )

    def _create_index_template(self, index_template):
        # no need to check whether log type is qualified
        logger.info(
            "Create index template for type %s with prefix %s", log_type, index_prefix
        )

        kwargs = {"index_template": index_template}
        self.run_func_with_retry(
            opensearch_util.create_index_template, "Create index template", **kwargs
        )

    def _init_template(self):
        global init_template_job
        if init_template_job == 0:
            index_template = self._get_index_template()
            self._create_index_template(index_template)
            init_template_job = 1
            self.adjust_lambda_env_var(env_name="INIT_TEMPLATE_JOB", val=1)
        else:
            if int(os.environ.get("INIT_TEMPLATE_JOB", "0")) == 0:
                self.adjust_lambda_env_var(env_name="INIT_TEMPLATE_JOB", val=1)

    def _import_saved_objects(self):
        if create_dashboard.lower() == "yes" or (
            log_type
            in ["cloudfront", "cloudtrail", "s3", "elb", "nginx", "apache", "iis"]
        ):
            logger.info(
                "Import saved objects for type %s with prefix %s",
                log_type,
                index_prefix,
            )
            self.run_func_with_retry(
                opensearch_util.import_saved_objects, "Import saved objects"
            )
        else:
            # Do nothing,
            # this is used when no dashboards or index patterns need to be created.
            logger.info("No need to load saved objects")

    def _init_dashboard(self):
        global init_dashboard_job
        if init_dashboard_job == 0:
            if log_type and log_type != "json":
                self._import_saved_objects()
            init_dashboard_job = 1
            self.adjust_lambda_env_var(env_name="INIT_DASHBOARD_JOB", val=1)
        else:
            if int(os.environ.get("INIT_DASHBOARD_JOB", "0")) == 0:
                self.adjust_lambda_env_var(env_name="INIT_DASHBOARD_JOB", val=1)

    def _create_alias(self):
        logger.info("Create index with prefix %s", index_prefix)

        kwargs = {"format": index_suffix}
        self.run_func_with_retry(
            opensearch_util.create_index, "Create index ", **kwargs
        )

    def _init_alias(self):
        global init_alias_job
        if init_alias_job == 0:
            if not opensearch_util.exist_index_alias():
                self._create_alias()
            init_alias_job = 1
            self.adjust_lambda_env_var(env_name="INIT_ALIAS_JOB", val=1)
        else:
            if int(os.environ.get("INIT_ALIAS_JOB", "0")) == 0:
                self.adjust_lambda_env_var(env_name="INIT_ALIAS_JOB", val=1)

    def put_index_pattern(self):
        global init_index_pattern_job
        try:
            if init_index_pattern_job == 0:
                opensearch_util.put_index_pattern()
                init_index_pattern_job = 1
                self.adjust_lambda_env_var(env_name="INIT_INDEX_PATTERN_JOB", val=1)
            else:
                if int(os.environ.get("INIT_INDEX_PATTERN_JOB", "0")) == 0:
                    self.adjust_lambda_env_var(env_name="INIT_INDEX_PATTERN_JOB", val=1)
        except Exception as e:
            logger.warning(e)

    def _rollover_index(self):
        logger.info("Rollover index with prefix %s", index_prefix)
        global rollover_index_job
        if rollover_index_job == 0 and init_alias_job == 1:
            kwargs = {}
            self.run_func_with_retry(
                opensearch_util.request_index_rollover, "Rollover index ", **kwargs
            )
            rollover_index_job = 1
            self.adjust_lambda_env_var(env_name="ROLLOVER_INDEX_JOB", val=1)

        else:
            if int(os.environ.get("ROLLOVER_INDEX_JOB", "0")) == 0:
                self.adjust_lambda_env_var(env_name="ROLLOVER_INDEX_JOB", val=1)

    def _create_bulk_records(self, records: list, need_json_serial=False) -> str:
        """Helper function to create payload for bulk load"""
        bulk_body = []
        for record in records:
            bulk_body.append(json.dumps({BULK_ACTION: {}}) + "\n")
            if need_json_serial:
                bulk_body.append(json.dumps(record, default=self.json_serial) + "\n")
            else:
                bulk_body.append(json.dumps(record) + "\n")
        data = "".join(bulk_body)
        return data
    
    def calculate_record_size(self, record):
        """
        Calculate size of a single record including bulk format overhead
        
        Args:
            record (dict): The record to be indexed
            
        Returns:
            int: Size in bytes of the record including bulk format
        """
        try:
            action_size = len(json.dumps({BULK_ACTION: {}}).encode('utf-8')) + 1
            
            record_size = len(json.dumps(record).encode('utf-8')) + 1
            total_size = action_size + record_size
            return total_size
        except Exception as e:
            logger.error(f"Error calculating record size: {str(e)}")
            # Return a large number to force a new batch in case of error
            return 1024 * 1024 # Returning 1 MB as record size

    def json_serial(self, obj):
        """JSON serializer for objects not serializable by default json code"""

        if isinstance(obj, (datetime, date)):
            return obj.isoformat()
        raise TypeError("Type %s not serializable" % type(obj))

    def bulk_load_idx_records(
        self,
        records: list,
        need_json_serial=False,
        index_name: str = opensearch_util.index_alias,
    ):
        """Call AOS bulk load API to load data

        Args:
            records (list): A list of json records
            index_name (str): index name in OpenSearch

        Raises:
            RuntimeError: if bulk load api failed

        Returns:
            list: A list of failed records
        """

        if len(records) == 0:
            return []
        failed_records = []
        bulk_records = self._create_bulk_records(records, need_json_serial)

        retry = 1
        while True:
            # Call bulk load
            response = opensearch_util.bulk_load(bulk_records, index_name)
            # Retry if status code is >= 300
            if response.status_code < 300:
                resp_json = response.json()
                for idx, item in enumerate(resp_json["items"]):
                    # Check and store failed records with error message
                    if item[BULK_ACTION]["status"] >= 300:
                        records[idx]["index_name"] = index_name
                        records[idx]["error_type"] = item[BULK_ACTION]["error"]["type"]
                        records[idx]["error_reason"] = item[BULK_ACTION]["error"][
                            "reason"
                        ]
                        failed_records.append(records[idx])

                break
            elif response.status_code == 413:
                self.adjust_bulk_batch_size()
                raise RuntimeError(
                    "Due to status code 413, unable to bulk load the records, we will retry."
                )

            if retry >= TOTAL_RETRIES:
                raise RuntimeError(
                    f"Unable to bulk load the records after {retry} retries"
                )

            logger.error("Bulk load failed: %s", response.text)
            logger.info("Sleep 10 seconds and retry...")
            retry += 1
            time.sleep(SLEEP_INTERVAL)

        return records, failed_records

    def adjust_bulk_batch_size(self, func_name=function_name):
        global batch_size
        if batch_size >= 4000:
            batch_size = batch_size - 2000
        response = lambda_client.get_function_configuration(FunctionName=func_name)
        variables = response["Environment"]["Variables"]

        updated = False

        if (
            variables.get("BULK_BATCH_SIZE")
            and int(variables["BULK_BATCH_SIZE"]) >= 4000
        ):
            variables["BULK_BATCH_SIZE"] = str(int(variables["BULK_BATCH_SIZE"]) - 2000)
            updated = True
        if variables.get("MAX_HTTP_PAYLOAD_SIZE_IN_MB"):
            current_payload_size = int(variables["MAX_HTTP_PAYLOAD_SIZE_IN_MB"])
            if current_payload_size > 10:
                variables["MAX_HTTP_PAYLOAD_SIZE_IN_MB"] = "10"
                updated = True
        else:
            variables["MAX_HTTP_PAYLOAD_SIZE_IN_MB"] = "10"
            updated = True
        if updated:
            lambda_client.update_function_configuration(
                FunctionName=func_name, 
                Environment={"Variables": variables}
            )           

    def adjust_lambda_env_var(self, env_name: str, val, func_name=function_name):
        response = lambda_client.get_function_configuration(FunctionName=function_name)
        variables = response["Environment"]["Variables"]

        if (
            not variables.get(env_name)
            or variables.get(env_name) == "0"
            or variables.get(env_name) == "FLB"
        ):
            variables[env_name] = str(val)
            try:
                lambda_client.update_function_configuration(
                    FunctionName=func_name, Environment={"Variables": variables}
                )
            except lambda_client.exceptions.ResourceConflictException:
                logger.info("updating lambda environment variable: %s", env_name)
            except ClientError as e:
                logger.error("Unexpected error: %s" % e)
