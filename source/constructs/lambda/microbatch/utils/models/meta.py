# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import os
from functools import cached_property
from typing import List, Optional, Union, Iterator
from boto3.dynamodb.conditions import ConditionBase
from utils.aws import DynamoDBUtil


class MetaModel:
    __table_name__ = os.environ['META_TABLE_NAME']
    partition_key = 'metaName'
    arn = 'arn'
    name = 'name'
    service = 'service'
    url = 'url'


class MetaTable:
    model = MetaModel()
    ddb_client = DynamoDBUtil(model.__table_name__)
    
    def put(self, meta_name: str, item: dict) -> None:
        item[self.model.partition_key] = meta_name
        return self.ddb_client.put_item(item)

    def delete(self, meta_name) -> None:
        return self.ddb_client.delete_item(key={self.model.partition_key: meta_name})
    
    def batch_delete(self, meta_names: Union[list, tuple]) -> None:
        for meta_nam in meta_names:
            self.delete(meta_name=meta_nam)

    def update(self, meta_name: str, item: dict) -> None:
        for key in (self.model.partition_key, ):
            if key in item.keys():
                item.pop(key)
        return self.ddb_client.update_item(key={self.model.partition_key: meta_name,}, item=item)

    def get(self, meta_name: str, raise_if_not_found: bool = False) -> dict:
        return self.ddb_client.get_item(key={self.model.partition_key: meta_name},
                             raise_if_not_found=raise_if_not_found)

    def scan_item(self, filter: Union[Optional[ConditionBase], str] = None, consistent: bool = False) -> Iterator[dict]:
        for page_iterator in self.ddb_client.scan(filter=filter,
                                    select='ALL_ATTRIBUTES',
                                    consistent=consistent):
            for item in page_iterator.get('Items', []):
                yield item
    
    def scan_count(self, filter: Union[Optional[ConditionBase], str] = None, consistent: bool = False) -> int:
        count = 0
        for page_iterator in self.ddb_client.scan(filter=filter,
                                    select='COUNT',
                                    consistent=consistent):
            count += page_iterator['Count']
        return count
    
    @cached_property
    def etl_log_ttl_secs(self) -> int:
        default_ttl_secs = 2592000
        
        etl_log_ttl_secs = self.get(meta_name='ETLLogTimeToLiveSecs')
        if etl_log_ttl_secs:
            return int(etl_log_ttl_secs.get('value', default_ttl_secs))
        else:
            return default_ttl_secs
    
    @cached_property
    def aws_console_url(self) -> str:
        return self.get(meta_name='AwsConsoleUrl')['value']
    
