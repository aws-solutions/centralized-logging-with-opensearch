# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import os
import time
import json
import logging

import boto3
from botocore.client import Config

from util.osutil import OpenSearch

TOTAL_RETRIES = 5
SLEEP_INTERVAL = 10

logger = logging.getLogger()
logger.setLevel(logging.INFO)

index_prefix = os.environ.get("INDEX_PREFIX")
endpoint = os.environ.get("ENDPOINT")
default_region = os.environ.get("AWS_REGION")
log_type = os.environ.get("LOG_TYPE", "")
engine = os.environ.get("ENGINE", "OpenSearch")

aos = OpenSearch(
    region=default_region,
    endpoint=endpoint.strip("https://"),
    index_prefix=index_prefix,
    engine=engine,
    log_type=log_type,
)

warm_age = os.environ.get("WARM_AGE", "")
cold_age = os.environ.get("COLD_AGE", "")
retain_age = os.environ.get("RETAIN_AGE", "")
index_suffix = os.environ.get("INDEX_SUFFIX", "yyyy-MM-dd")
rollover_age = aos.get_rollover_age_by_format(index_suffix)
rollover_size = os.environ.get("ROLLOVER_SIZE", "")

number_of_shards = int(os.environ.get("NUMBER_OF_SHARDS", "5"))
number_of_replicas = int(os.environ.get("NUMBER_OF_REPLICAS", "1"))
codec = os.environ.get("CODEC", "best_compression")
refresh_interval = os.environ.get("REFRESH_INTERVAL", "1s")

current_role_arn = os.environ.get("ROLE_ARN")
log_processor_role_arn = os.environ.get("LOG_PROCESSOR_ROLE_ARN")

domain_name = os.environ.get("DOMAIN_NAME")
create_dashboard = os.environ.get("CREATE_DASHBOARD", "No")

solution_version = os.environ.get("SOLUTION_VERSION", "v1.0.0")
solution_id = os.environ.get("SOLUTION_ID", "SO8025")
user_agent_extra = f"AwsSolution/{solution_id}/{solution_version}"

default_config = Config(connect_timeout=30,
                        retries={"max_attempts": 3},
                        user_agent_extra=user_agent_extra)
es = boto3.client("es", region_name=default_region, config=default_config)


def lambda_handler(event, context):
    """
    Sample event
    {
        "action": "CreateIndexTemplate",
        "props": {
            "log_type": "nignx|apache|regex|json",
            "mappings": {},
        }
    }
    """
    event = event or {}
    logger.info("Received event: " + json.dumps(event, indent=2))

    action = event.get("action")
    props = event.get("props", {})
    if action == "CreateIndexTemplate":
        action_create_index_template(props)
        if aos.exist_index() is False:
            create_index()
    else:
        advanced_security_enabled_flag = advanced_security_enabled()
        if advanced_security_enabled_flag:
            logger.info("OpenSearch domain has Advanced Security enabled")
            # First add helper lambda role to OpenSearch all access
            add_master_role(current_role_arn)
            # Wait for some seconds for the role to be effective.
            time.sleep(25)

        # Check and create index state management policy
        create_ism()
        if log_type and log_type != "Json":
            index_template = aos.default_index_template(
                number_of_shards, number_of_replicas, codec, refresh_interval)

            # Check and Create index template
            put_index_template(index_template)

            # Check and Import dashboards or index patterns.
            import_saved_objects()
            create_index()

        # Finally, add log processor lambda role to OpenSearch all access if needed.
        # This role must be inserted after the previous steps such as put_index_template and create_index are completed.
        if advanced_security_enabled_flag:
            if log_processor_role_arn:
                add_master_role(log_processor_role_arn)
    return "OK"


def action_create_index_template(props: dict):
    logger.info("CreateIndexTemplate props=%s", props)

    the_log_type = props.get("log_type", "").lower()
    createDashboard = props.get("createDashboard", "no").lower()
    logger.info("CreateDashboard:%s", createDashboard)

    if the_log_type in ["nginx", "apache"]:
        # {
        #     "action": "CreateIndexTemplate",
        #     "props": {
        #         "log_type": "nginx/apache",
        #         "createDashboard": "yes/no"
        #     }
        # }

        logger.info(
            f"{aos.create_predefined_index_template.__name__} of {the_log_type} : {createDashboard}"
        )

        run_func_with_retry(
            aos.create_predefined_index_template,
            aos.create_predefined_index_template.__name__,
            name=the_log_type,
            number_of_shards=number_of_shards,
            number_of_replicas=number_of_replicas,
            codec=codec,
            refresh_interval=refresh_interval,
        )

        if createDashboard.lower() == "yes":
            logger.info(
                f"{aos.import_saved_object.__name__} of {the_log_type}")

            run_func_with_retry(
                aos.import_saved_object,
                aos.import_saved_object.__name__,
                log_type=the_log_type,
            )

    elif the_log_type in [
            "regex", "multilinetext", "singlelinetext", "json", "syslog"
    ]:
        # {
        #     "action": "CreateIndexTemplate",
        #     "props": {
        #         "log_type": "regex",
        #         "mappings": {
        #             "ip": { "type": "ip" },
        #             "method": { "type": "text" },
        #             "time_local": { "type": "date", "format": "dd/MMM/yyyy:HH:mm:ss Z||epoch_millis" }
        #         }
        #     }
        # }

        mappings = props.get("mappings", {})
        index_template = aos.default_index_template(
            number_of_shards,
            number_of_replicas,
            codec=codec,
            refresh_interval=refresh_interval,
        )
        index_template["template"]["mappings"] = {"properties": mappings}

        logger.info(f"Put index template: {index_template}")

        run_func_with_retry(
            aos.put_index_template,
            aos.put_index_template.__name__,
            index_template=index_template,
        )

    else:
        logger.info(f"Unknown log type: {the_log_type}")


def advanced_security_enabled() -> bool:
    """Check if OpenSearch Domain has Fine-grained access control enabled.

    Returns:
        bool: True if enabled.
    """
    logger.info(
        "Check if OpenSearch has Advanced Security enabled for domain %s",
        domain_name)
    result = False
    try:
        resp = es.describe_elasticsearch_domain_config(
            DomainName=domain_name, )
        print(resp)
        result = resp["DomainConfig"]["AdvancedSecurityOptions"]["Options"][
            "Enabled"]

    except Exception as e:
        logger.error("Unable to access and get OpenSearch config")
        logger.exception(e)
        logger.error(
            "Please ensure the subnet for this lambda is private with NAT enabled"
        )
        logger.info(
            "You may need to manually add access to OpenSearch for Lambda")
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
        logger.info("Response status: %d",
                    resp["ResponseMetadata"]["HTTPStatusCode"])
    except Exception as e:
        logger.error("Unable to automatically add backend role")
        logger.error(e)
        logger.info("Please manually add backend role for %s", role_arn)


def put_index_template(index_template):
    # no need to check whether log type is qualified
    logger.info("Create index template for type %s with prefix %s", log_type,
                index_prefix)

    kwargs = {"index_template": index_template}
    run_func_with_retry(aos.put_index_template, "Create index template",
                        **kwargs)


def import_saved_objects():
    if create_dashboard.lower() == "yes" or (log_type in [
            "cloudfront", "cloudtrail", "s3", "elb"
    ]):
        logger.info("Import saved objects for type %s with prefix %s",
                    log_type, index_prefix)
        run_func_with_retry(aos.import_saved_objects, "Import saved objects")
    else:
        # Do nothing,
        # this is used when no dashboards or index patterns need to be created.
        logger.info("No need to load saved objects")


def create_ism():
    if (warm_age == "" and cold_age == "" and retain_age == ""
            and rollover_age == "" and rollover_size == ""):
        logger.info("No need to create ISM policy")
    else:
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
