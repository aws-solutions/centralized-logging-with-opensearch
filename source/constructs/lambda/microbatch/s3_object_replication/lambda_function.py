# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import os
import json
from cachetools import cached, TTLCache
from boto3.dynamodb.conditions import Attr
from enrichment import EnrichProcessor, SOURCE_PARSER_MAPPING
from utils.aws import S3Client
from utils.helpers import logger, get_bucket_object, events_parser
from utils.models.meta import MetaTable


AWS_S3 = S3Client()
AWS_DDB_META = MetaTable()

PIPELINE_ID = os.environ["PIPELINE_ID"]
STAGING_BUCKET = os.environ["STAGING_BUCKET_NAME"]
STAGING_BUCKET_PREFIX = os.environ["STAGING_BUCKET_PREFIX"]
SOURCE_TYPE = os.environ["SOURCE_TYPE"].lower()
ENRICHMENT_PLUGINS = [x for x in os.environ["ENRICHMENT_PLUGINS"].split(",") if x]
TTL_CACHE = TTLCache(maxsize=1024, ttl=900)


@cached(cache=TTL_CACHE)
def get_ingestion_sts_role(pipeline_id: str) -> dict:
    response = {}
    conditions = (
        Attr("type").eq("Ingestion").__and__(Attr("pipelineId").eq(pipeline_id))
    )
    for ingestion_info in AWS_DDB_META.scan_item(filter=conditions, consistent=False):
        ns = get_bucket_object(
            bucket=ingestion_info.get("data", {}).get("source", {}).get("bucket"),
            prefix=ingestion_info.get("data", {}).get("source", {}).get("prefix"),
        )
        response[f"{ns.bucket}/{ns.prefix}"] = (
            ingestion_info.get("data", {}).get("role", {}).get("sts")
        )

    return response


def get_sts_role_by_object(
    bucket: str, key: str, pipeline_id: str = PIPELINE_ID
) -> str:
    sts_role_mapping = get_ingestion_sts_role(pipeline_id=pipeline_id)
    for prefix in sts_role_mapping.keys():
        if f"{bucket}/{key}".startswith(prefix):
            return sts_role_mapping[prefix]
    return ""


def lambda_handler(event, _):
    logger.info(f"Received request: {json.dumps(event)}")
    if not isinstance(event, dict):
        raise ValueError("The event is not a dict.")

    tasks = []
    for record in events_parser(event=event):
        source = {"bucket": record["bucket"], "key": record["key"]}

        destination_bucket = STAGING_BUCKET
        destination_key = os.path.join(STAGING_BUCKET_PREFIX, record["key"])
        destination_key = os.path.normpath(destination_key)
        destination_key = (
            destination_key if destination_key[0] != "/" else destination_key[1:]
        )
        destination = {"bucket": destination_bucket, "key": destination_key}

        tasks.append({"source": source, "destination": destination})

        source["role"] = get_sts_role_by_object(
            bucket=record["bucket"], key=record["key"]
        )

    enrichment_processor = None
    if ENRICHMENT_PLUGINS and SOURCE_TYPE in SOURCE_PARSER_MAPPING.keys():
        enrichment_processor = EnrichProcessor(source_type=SOURCE_TYPE).process
    AWS_S3.batch_copy_objects(
        tasks,
        delete_on_success=False,
        enrich_func=enrichment_processor,
        enrich_plugins=set(ENRICHMENT_PLUGINS),
    )
