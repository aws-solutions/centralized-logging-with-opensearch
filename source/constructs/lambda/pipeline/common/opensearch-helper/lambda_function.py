# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import os
import time
import json
import logging
import gzip
import base64

from commonlib.opensearch import OpenSearchUtil, Engine
from commonlib import AWSConnection

TOTAL_RETRIES = 5
SLEEP_INTERVAL = 10

logger = logging.getLogger()
logger.setLevel(logging.INFO)

conn = AWSConnection()

index_prefix = os.environ.get("INDEX_PREFIX")
endpoint = os.environ.get("ENDPOINT")
default_region = os.environ.get("AWS_REGION")
log_type = os.environ.get("LOG_TYPE", "").lower()
engine_type = os.environ.get("ENGINE", "OpenSearch")

warm_age = os.environ.get("WARM_AGE", "")
cold_age = os.environ.get("COLD_AGE", "")
retain_age = os.environ.get("RETAIN_AGE", "")
index_suffix = os.environ.get("INDEX_SUFFIX", "yyyy-MM-dd")

rollover_size = os.environ.get("ROLLOVER_SIZE", "")

number_of_shards = int(os.environ.get("NUMBER_OF_SHARDS", "5"))
number_of_replicas = int(os.environ.get("NUMBER_OF_REPLICAS", "1"))
codec = os.environ.get("CODEC", "best_compression")
refresh_interval = os.environ.get("REFRESH_INTERVAL", "1s")

current_role_arn = os.environ.get("ROLE_ARN", "")
log_processor_role_arn = os.environ.get("LOG_PROCESSOR_ROLE_ARN", "")

domain_name = os.environ.get("DOMAIN_NAME")
create_dashboard = os.environ.get("CREATE_DASHBOARD", "No")

INDEX_TEMPLATE_GZIP_BASE64 = os.environ.get("INDEX_TEMPLATE_GZIP_BASE64", "")
IS_APP_PIPELINE = ("apppipe" in current_role_arn.lower()) or (
    "apppipe" in log_processor_role_arn.lower()
)
IS_SVC_PIPELINE = not IS_APP_PIPELINE


aos = OpenSearchUtil(
    region=default_region,
    endpoint=endpoint,
    index_prefix=index_prefix,
    engine=Engine(engine_type),
    log_type=log_type,
)
aos.index_name_has_log_type_suffix(IS_SVC_PIPELINE)
es = conn.get_client("es")


def lambda_handler(event, _):
    event = event or {}
    logger.info("Received event: " + json.dumps(event, indent=2))
    handle_other_actions()
    return "OK"

def handle_other_actions():
    advanced_security_enabled_flag = advanced_security_enabled()
    if advanced_security_enabled_flag:
        handle_advanced_security()

    create_ism()

    index_template = get_index_template()
    create_index_template(index_template)

    if log_type and log_type != "json":
        import_saved_objects()

    if not aos.exist_index_alias():
        create_index()

    if advanced_security_enabled_flag and log_processor_role_arn:
        add_master_role(log_processor_role_arn)


def handle_advanced_security():
    logger.info("OpenSearch domain has Advanced Security enabled")
    add_master_role(current_role_arn)
    time.sleep(25)


def get_index_template():
    if INDEX_TEMPLATE_GZIP_BASE64:
        logger.info("Using INDEX_TEMPLATE_GZIP_BASE64")
        return decode_gzip_base64_json_safe(INDEX_TEMPLATE_GZIP_BASE64)
    else:
        logger.info("Using default index template")
        return aos.default_index_template(
            number_of_shards, number_of_replicas, codec, refresh_interval
        )


def advanced_security_enabled() -> bool:
    """Check if OpenSearch Domain has Fine-grained access control enabled.

    Returns:
        bool: True if enabled.
    """
    logger.info(
        "Check if OpenSearch has Advanced Security enabled for domain %s", domain_name
    )
    result = False
    try:
        resp = es.describe_elasticsearch_domain_config(
            DomainName=domain_name,
        )
        print(resp)
        result = resp["DomainConfig"]["AdvancedSecurityOptions"]["Options"]["Enabled"]

    except Exception as e:
        logger.error("Unable to access and get OpenSearch config")
        logger.exception(e)
        logger.error(
            "Please ensure the subnet for this lambda is private with NAT enabled"
        )
        logger.info("You may need to manually add access to OpenSearch for Lambda")
    return result


def add_master_role(role_arn: str):
    logger.info("Add backend role %s to domain %s", role_arn, domain_name)
    try:
        resp = es.update_elasticsearch_domain_config(
            DomainName=domain_name,
            AdvancedSecurityOptions={
                "MasterUserOptions": {
                    "MasterUserARN": role_arn,
                },
            },
        )
        logger.info("Response status: %d", resp["ResponseMetadata"]["HTTPStatusCode"])
    except Exception as e:
        logger.error("Unable to automatically add backend role")
        logger.error(e)
        logger.info("Please manually add backend role for %s", role_arn)


def create_index_template(index_template):
    # no need to check whether log type is qualified
    logger.info(
        "Create index template for type %s with prefix %s", log_type, index_prefix
    )

    kwargs = {"index_template": index_template}
    run_func_with_retry(aos.create_index_template, "Create index template", **kwargs)


def import_saved_objects():
    if create_dashboard.lower() == "yes" or (
        log_type in ["cloudfront", "cloudtrail", "s3", "elb", "nginx", "apache"]
    ):
        logger.info(
            "Import saved objects for type %s with prefix %s", log_type, index_prefix
        )
        run_func_with_retry(aos.import_saved_objects, "Import saved objects")
    else:
        # Do nothing,
        # this is used when no dashboards or index patterns need to be created.
        logger.info("No need to load saved objects")


def get_rollover_age_by_format(format: str = "yyyy-MM-dd") -> str:
    if format == "yyyy-MM":
        return "30d"
    elif format == "yyyy-MM-dd-HH":
        return "1h"
    elif format == "yyyy":
        return "365d"
    else:
        return "24h"


def create_ism():
    if warm_age == "" and cold_age == "" and retain_age == "" and rollover_size == "":
        logger.info("No need to create ISM policy")
    else:
        rollover_age = get_rollover_age_by_format(index_suffix)
        kwargs = {
            "warm_age": warm_age,
            "cold_age": cold_age,
            "retain_age": retain_age,
            "rollover_age": rollover_age,
            "rollover_size": rollover_size,
        }
        run_func_with_retry(aos.create_ism_policy, "Create ISM", **kwargs)


def create_index():
    logger.info("Create index with prefix %s", index_prefix)

    kwargs = {"format": index_suffix}
    run_func_with_retry(aos.create_index, "Create index ", **kwargs)


def run_func_with_retry(func, func_name, **kwargs):
    """Run a function and retry a number of times if failed"""
    retry = 1
    while True:
        response = func(**kwargs)
        if response.status_code < 300:
            logger.info("%s runs successfully", func_name)
            break

        if response.status_code == 403:
            logger.info(
                "Please add access to OpenSearch for this Lambda and rerun this"
            )
            break

        if retry >= TOTAL_RETRIES:
            logger.info(
                "%s failed after %d retries, please manually create it",
                func_name,
                retry,
            )
            break

        logger.error("%s failed: %s", func_name, response.text)
        logger.info("Sleep 10 seconds and retry...")
        retry += 1
        time.sleep(SLEEP_INTERVAL)


def decode_gzip_base64_json_safe(s: str):
    if not s:
        return None

    try:
        return json.loads(gzip.decompress(base64.b64decode(s)))
    except Exception as e:
        logging.warn("Error decoding gzip base64 json string: %s", e)

    return None
