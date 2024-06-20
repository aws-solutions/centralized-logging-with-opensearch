# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import os
import json
import urllib.parse
from enrichment import EnrichProcessor, SOURCE_PARSER_MAPPING
from utils.aws import S3Client
from utils.helpers import logger
from utils.models.meta import MetaTable


AWS_S3 = S3Client()
AWS_DDB_META = MetaTable()

STAGING_BUCKET = os.environ['STAGING_BUCKET_NAME']
STAGING_BUCKET_PREFIX = os.environ['STAGING_BUCKET_PREFIX']
SOURCE_TYPE = os.environ['SOURCE_TYPE'].lower()
ENRICHMENT_PLUGINS = [ x for x in os.environ['ENRICHMENT_PLUGINS'].split(',') if x ]


def events_parser(event) -> list[dict]:
    s3_create_object_events = []
    for record in event["Records"]:
        if 'body' in record:
            body = json.loads(record["body"])
            if 'Event' in body and body['Event'] == "s3:TestEvent":
                logger.info("Test Message, do nothing...")
                continue
            
            s3_create_object_events += body.get('Records', [])
        else:
            s3_create_object_events.append(record)
    
    valid_events = []
    for record in s3_create_object_events:
        if record.get('eventName') is None:
            logger.info(f'eventName is None, ignore record, record is {record}.')
            continue
        
        if record.get('eventName')[:13] != 'ObjectCreated':
            logger.info(f'eventName is {record.get("eventName")}, ignore record, record is {record}.')
            continue
        
        if "s3" not in record.keys():
            logger.info(f's3 is not in record, ignore record, record is {record}.')
            continue
        
        valid_events.append(record)
        
    return valid_events


def lambda_handler(event, _):
    logger.info(f'Received request: {json.dumps(event)}')
    if not isinstance(event, dict):
        raise ValueError('The event is not a dict.')
    
    tasks = []
    for record in events_parser(event=event):
        source_bucket = record["s3"]["bucket"]["name"]
        source_key = urllib.parse.unquote_plus(record["s3"]["object"]["key"], encoding="utf-8")
        source = {'bucket': source_bucket, 'key': source_key}
        
        destination_bucket = STAGING_BUCKET
        destination_key = os.path.join(STAGING_BUCKET_PREFIX, source_key)
        destination_key = os.path.normpath(destination_key)
        destination_key = destination_key if destination_key[0] != '/' else destination_key[1:]
        destination = {'bucket': destination_bucket, 'key': destination_key}
            
        tasks.append({'source': source, 'destination': destination})
        
        ingestion_info = AWS_DDB_META.get(meta_name=record["s3"]["configurationId"])
        if ingestion_info:
            source['role'] = ingestion_info.get('data', {}).get('role', {}).get('sts', '')
    
    enrichment_processor = None   
    if ENRICHMENT_PLUGINS and SOURCE_TYPE in SOURCE_PARSER_MAPPING.keys():
        enrichment_processor = EnrichProcessor(source_type=SOURCE_TYPE).process
    AWS_S3.batch_copy_objects(tasks, delete_on_success=False, 
                              enrich_func=enrichment_processor, 
                              enrich_plugins=set(ENRICHMENT_PLUGINS))

