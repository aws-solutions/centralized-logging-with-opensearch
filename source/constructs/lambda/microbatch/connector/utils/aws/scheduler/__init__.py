# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import json
import types
from typing import Union
from utils.helpers import logger, AWSConnection



class SchedulerClient:
    """Amazon EvenBridge Scheduler Client, used to interact with Amazon EventBridge Scheduler."""

    def __init__(self):
        conn = AWSConnection()
        self._scheduler_client = conn.get_client("scheduler")
        
    def get_schedule_group(self, name: str) -> dict:
        """Retrieves the specified schedule group.
        
        :param name (str): The name of the schedule group that you are creating.
        
        Returns:
            dict: response
        """
        try:
            return self._scheduler_client.get_schedule_group(Name=name)
        except Exception as e:
            logger.warning(e)
            return {}
    
    def create_schedule_group(self, name: str, tags: list[dict] = []) -> dict:
        """Creates the specified schedule group.
        
        :param name (str): The name of the schedule group that you are creating.
        :param tags (list[dict], optional): Tags are key and value pairs that act as metadata for organizing your AWS resources. Defaults to [].
       
        Returns:
            dict: response
        """
        response = self.get_schedule_group(name=name)
        if response:
            return response
        else:
            self._scheduler_client.create_schedule_group(Name=name, Tags=tags)
            
        return self.get_schedule_group(name=name)

    def delete_schedule_group(self, name: str) -> None:
        """Delete a specified schedule group.
        
        :param name (str): The name of the schedule group that you are creating.
        
        Returns:
            dict: response
        """
        try:
            self._scheduler_client.delete_schedule_group(Name=name)
        except Exception as e:
            logger.error(e)
    
    def get_schedule(self, name: str, group_name: str = 'default') -> dict:
        """Retrieves the specified schedule.
        
        :param name (str): The name of the schedule group that you are creating.
        
        Returns:
            dict: response
        """
        try:
            response = self._scheduler_client.get_schedule(Name=name, GroupName=group_name)
            return response
        except Exception as e:
            logger.warning(e)
            return {}

    def create_schedule(self, name: str, input: dict, target_arn: str, target_role_arn: str, group_name: str = 'default', 
                        schedule: str = 'rate(5 minutes)', flexible_time_windows: dict = {'Mode': 'OFF'}) -> dict:
        """Create a specified schedule.
        
        :param name (str): The name of the schedule group that you are creating.
        :param input (str): The text, or well-formed JSON, passed to the target.
        :param target_arn (str): The Amazon Resource Name (ARN) of the IAM role that EventBridge Scheduler will use for this target when the schedule is invoked.
        :param target_role_arn (str): The Amazon Resource Name (ARN) of the target.
        :param group_name (str, optional): The name of the schedule group to associate with this schedule.
        :param schedule (str, optional): The expression that defines when the schedule runs.
        :param flexible_time_windows (str, optional): Allows you to configure a time window during which EventBridge Scheduler invokes the schedule.
        
        Returns:
            dict: response
        """

        if self.get_schedule(name=name, group_name=group_name):
            self._scheduler_client.update_schedule(FlexibleTimeWindow=flexible_time_windows, GroupName=group_name,
                                               Name=name, ScheduleExpression=schedule,
                                               State='ENABLED', Target={
                                                   'Arn': target_arn,
                                                   'Input': json.dumps(input, indent=4),
                                                   'RoleArn': target_role_arn})
        else:
            self._scheduler_client.create_schedule(FlexibleTimeWindow=flexible_time_windows, GroupName=group_name,
                                                Name=name, ScheduleExpression=schedule,
                                                State='ENABLED', Target={
                                                    'Arn': target_arn,
                                                    'Input': json.dumps(input, indent=4),
                                                    'RoleArn': target_role_arn})
        return self.get_schedule(name=name, group_name=group_name)
    
    def delete_schedule(self, name: str, group_name: str = 'default') -> None:
        """Delete a specified schedule.
        
        :param name (str): The name of the schedule group that you are creating.
        :param group_name (str, optional): The name of the schedule group to associate with this schedule.

        Returns:
            dict: response
        """
        try:
            self._scheduler_client.delete_schedule(Name=name, GroupName=group_name)
        except Exception as e:
            logger.error(e)
    
    def create_processor_schedule(self, pipeline_id: str, source_type: str, table_name: str,  # NOSONAR
                                  staging_location: str, archive_location: str, statements: types.SimpleNamespace,
                                  service: str, recipients: Union[str, list], sfn_arn: str, role_arn: str, name: str = 'LogProcessor', 
                                  enrichment_plugins: list = [], group_name: str = 'default', schedule: str = 'rate(5 minutes)') -> dict:
        """Create a Log Processor schedule.

        Returns:
            dict: response
        """
        constant = {
            "metadata": {
                "pipelineId": pipeline_id,
                "sourceType": source_type,
                "scheduleType": name,
                "enrichmentPlugins": enrichment_plugins,
                "s3": {
                    "srcPath": staging_location,
                    "archivePath": archive_location,
                    },
                "athena": {
                    "tableName": table_name,
                    "statements": {
                        "create": statements.create,
                        "drop": statements.drop,
                        "insert": statements.insert,
                        "aggregate": statements.aggregate,
                        }
                    },
                "notification": {
                    "service": service,
                    "recipients": recipients
                    }
                }
            }
        
        return self.create_schedule(name=name, input=constant, target_arn=sfn_arn, target_role_arn=role_arn, group_name=group_name, 
                        schedule=schedule, flexible_time_windows={'Mode': 'OFF'})
    
    def create_merger_schedule(self, pipeline_id: str, source_type: str, table_name: str, 
                                table_location: str, archive_location: str, partition_info: dict,
                                database: str, service: str, recipients: Union[str, list], sfn_arn: str, 
                                role_arn: str, **kwargs) -> dict:
        """Create a Log Merger schedule.

        Returns:
            dict: response
        """
        age = 7 if 'age' not in kwargs else kwargs['age']
        name = 'LogMerger' if 'name' not in kwargs else kwargs['name']
        group_name = 'default' if 'group_name' not in kwargs else kwargs['group_name']
        schedule = 'cron(0 1 * * ? *)' if 'schedule' not in kwargs else kwargs['schedule']
            
        constant = {
            "metadata": {
                "pipelineId": pipeline_id,
                "sourceType": source_type,
                "scheduleType": name,
                "s3": {
                    "srcPath": table_location,
                    "archivePath": archive_location,
                    },
                "athena": {
                    "firstPartitionKey": "event_hour",
                    "partitionInfo": partition_info,
                    "intervalDays": int(-age),
                    "database": database,
                    "tableName": table_name
                    },
                "notification": {
                    "service": service,
                    "recipients": recipients
                    }
                }
            }
        
        return self.create_schedule(name=name, input=constant, target_arn=sfn_arn, target_role_arn=role_arn, group_name=group_name, 
                        schedule=schedule, flexible_time_windows={'Mode': 'FLEXIBLE', 'MaximumWindowInMinutes': 30})
    
    def create_archive_schedule(self, pipeline_id: str, source_type: str, table_name: str,
                                  table_location: str, archive_location: str, 
                                  database: str, service: str, recipients: Union[str, list], sfn_arn: str, 
                                  role_arn: str, **kwargs) -> dict:
        """Create a Log Archive schedule.

        Returns:
            dict: response
        """
        age = 30 if 'age' not in kwargs else kwargs['age']
        name = 'LogArchive' if 'name' not in kwargs else kwargs['name']
        group_name = 'default' if 'group_name' not in kwargs else kwargs['group_name']
        schedule = 'cron(0 2 * * ? *)' if 'schedule' not in kwargs else kwargs['schedule']

        constant = {
            "metadata": {
                "pipelineId": pipeline_id,
                "sourceType": source_type,
                "scheduleType": name,
                "s3": {
                    "srcPath": table_location,
                    "archivePath": archive_location,
                    },
                "athena": {
                    "firstPartitionKey": "event_hour",
                    "intervalDays": int(-age),
                    "database": database,
                    "tableName": table_name
                    },
                "notification": {
                    "service": service,
                    "recipients": recipients
                    }
                }
            }
        
        return self.create_schedule(name=name, input=constant, target_arn=sfn_arn, target_role_arn=role_arn, group_name=group_name, 
                        schedule=schedule, flexible_time_windows={'Mode': 'FLEXIBLE', 'MaximumWindowInMinutes': 30})

