# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import os
import json
from typing import List, Optional, Union, Iterator
from boto3.dynamodb.conditions import ConditionBase, Attr, Key
from utils.aws import DynamoDBUtil


class ETLLogModel:
    __table_name__ = os.environ['ETL_LOG_TABLE_NAME']
    partition_key = 'executionName'
    sort_key = 'taskId'
    api = 'API'
    data = 'data'
    parent_task_id = 'parentTaskId'
    state_machine_name = 'stateMachineName'
    state_name = 'stateName'
    function_name = 'functionName'
    pipeline_id = 'pipelineId'
    start_time = 'startTime'
    end_time = 'endTime'
    status = 'status'


class ETLLogTable:
    model = ETLLogModel()
    ddb_client = DynamoDBUtil(table=model.__table_name__)
    
    def put(self, execution_name: str, task_id: str, item: dict) -> None:
        item[self.model.partition_key] = execution_name
        item[self.model.sort_key] = task_id
        return self.ddb_client.put_item(item)

    def delete(self, execution_name, task_id) -> None:
        return self.ddb_client.delete_item(key={self.model.partition_key: execution_name, self.model.sort_key: task_id})
    
    def batch_delete(self, execution_name) -> None:
        for item in self.query_item(execution_name=execution_name):
            self.delete(execution_name=item[self.model.partition_key], task_id=item[self.model.sort_key])

    def update(self, execution_name: str, task_id: str, item: dict) -> None:
        for key in (self.model.partition_key, self.model.sort_key):
            if key in item.keys():
                item.pop(key)
        return self.ddb_client.update_item(key={self.model.partition_key: execution_name, self.model.sort_key: task_id}, item=item)

    def get(self, execution_name: str, task_id: str, raise_if_not_found: bool = False) -> dict:
        return self.ddb_client.get_item(key={self.model.partition_key: execution_name, self.model.sort_key: task_id},
                             raise_if_not_found=raise_if_not_found)

    def query_item(self, execution_name: str, filter: Union[Optional[ConditionBase], str] = None, consistent: bool = True) -> Iterator[dict]:
        for page_iterator in self.ddb_client.query(key_condition=Key(self.model.partition_key).eq(execution_name),
                                    filter=filter,
                                    select='ALL_ATTRIBUTES',
                                    consistent=consistent):
            for item in page_iterator.get('Items', []):
                yield item

    
    def query_count(self, execution_name: str, filter: Union[Optional[ConditionBase], str] = None, consistent: bool = True) -> int:
        count = 0
        for page_iterator in self.ddb_client.query(key_condition=Key(self.model.partition_key).eq(execution_name),
                                    filter=filter,
                                    select='COUNT',
                                    consistent=consistent):
            count += page_iterator['Count']
        return count

    def query_subtasks(self, execution_name: str, parent_task_id, consistent: bool = True) -> Iterator[dict]:
        conditions = Attr(self.model.parent_task_id).eq(parent_task_id)
        for item in self.query_item(execution_name=execution_name, filter=conditions, consistent=consistent):
            yield item

    def get_subtask_status_count(self, execution_name: str, parent_task_id: str, status: str = 'Succeeded',
                                 consistent: bool = True) -> dict:
        conditions = Attr(self.model.parent_task_id).eq(parent_task_id).__and__(Attr(self.model.status).eq(status))
        subtask_status_count = self.query_count(execution_name=execution_name, filter=conditions, consistent=consistent)
        parent_task_info = self.get(execution_name=execution_name, task_id=parent_task_id)
        total_subtasks = 0
        if parent_task_info is not None:
            total_subtasks = json.loads(parent_task_info[self.model.data]).get('totalSubTask')

        return {self.model.partition_key: execution_name, self.model.parent_task_id: parent_task_id, self.model.status: status,
                'taskCount': subtask_status_count, 'totalSubTask': total_subtasks}


