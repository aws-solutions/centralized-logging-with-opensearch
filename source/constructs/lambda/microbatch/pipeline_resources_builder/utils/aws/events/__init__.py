# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import re
import json
import types
from typing import Union
from utils.aws.commonlib import AWSConnection


class EventsClient:
    """Amazon EvenBridge Client, used to interact with Amazon EventBridge."""

    def __init__(self):
        conn = AWSConnection()
        self._events_client = conn.get_client("events")
    
    def _schedule_expression_formatter(self, schedule: str) -> str:
        rate_expression_pattern = r'rate\((?P<value>\d+) (?P<unit>\w+)\)'
        rate_expression_match = re.match(rate_expression_pattern, schedule)
        
        if rate_expression_match:
            value = int(rate_expression_match['value'])
            unit = rate_expression_match['unit']
            if value == 1 and unit in ('minutes', 'hours', 'days'):
                return f"rate({value} {unit[:-1]})"
            elif value > 1 and unit in ('minute', 'hour', 'day'):
                return f"rate({value} {unit}s)"
        return schedule

    def put_rule(self, name: str, schedule: str = 'rate(5 minutes)', state: str = 'ENABLED', 
                 event_bus_name: str = 'default') -> dict:
        """Create a specified rule.
        
        :param name (str): The name of the rule that you are creating or updating.
        :param schedule (str): The scheduling expression. For example, "cron(0 20 * * ? *)" or "rate(5 minutes)".
        :param state (str): Indicates whether the rule is enabled or disabled.
        :param event_bus_name (str): The name or ARN of the event bus to associate with this rule. If you omit this, the default event bus is used.
        
        Returns:
            dict: response
        """
        return self._events_client.put_rule(Name=name, ScheduleExpression=self._schedule_expression_formatter(schedule),
                                            State=state, EventBusName=event_bus_name)
    
    def delete_rule(self, name: str, event_bus_name: str = 'default', force: bool = True) -> None:
        """Delete a specified rule.
        
        :param name (str): The name of the rule.
        :param event_bus_name (str, optional): The name or ARN of the event bus associated with the rule. If you omit this, the default event bus is used.
        :param force (str, optional): If this is a managed rule, created by an Amazon Web Services service on your behalf, you must specify Force as True to delete the rule. This parameter is ignored for rules that are not managed rules. You can check whether a rule is a managed rule by using DescribeRule or ListRules and checking the ManagedBy field of the response.

        Returns:
            dict: response
        """
        rules = self._events_client.list_rules(NamePrefix=name, EventBusName=event_bus_name)['Rules']
        if not rules:
            return
        
        for rule in rules:
            if rule['Name'] != name:
                continue
            
            for target in self._events_client.list_targets_by_rule(Rule=name, EventBusName=event_bus_name)['Targets']:
                self._events_client.remove_targets(Rule=name, EventBusName=event_bus_name, Ids=[target['Id']], Force=force)
            
            self._events_client.delete_rule(Name=name, EventBusName=event_bus_name, Force=force)
    
    def put_targets(self, id: str, rule_name: str, role_arn: str, input: dict, sfn_arn: str, event_bus_name: str = 'default') -> dict:
        """Creates or updates the specified rule. Rules are enabled by default, or based on value of the state.
        
        :param id (str): The ID of the target within the specified rule. Use this ID to reference the target when updating the rule. We recommend using a memorable and unique string.
        :param rule_name (str): The name of the rule.
        :param role_arn (str): The Amazon Resource Name (ARN) of the IAM role associated with the rule.
        :param input (str): Valid JSON text passed to the target. In this case, nothing from the event itself is passed to the target. For more information, see https://www.rfc-editor.org/rfc/rfc7159.txt.
        :param sfn_arn (str): Indicates whether the rule is enabled or disabled.
        :param event_bus_name (str): The name or ARN of the event bus to associate with this rule. If you omit this, the default event bus is used.
        
        Returns:
            dict: response
        """
        return self._events_client.put_targets(Rule=rule_name, EventBusName=event_bus_name,
                                               Targets=[
                                                   {
                                                       'Id': id,
                                                       'Arn': sfn_arn,
                                                       'Input': json.dumps(input, indent=4),
                                                       'RoleArn': role_arn,
                                                   }
                                               ])
    
    def create_processor_rule(self, pipeline_id: str, source_type: str, table_name: str,  # NOSONAR
                                  staging_location: str, archive_location: str, statements: types.SimpleNamespace,
                                  service: str, recipients: Union[str, list], sfn_arn: str, role_arn: str, 
                                  enrichment_plugins: list = [], name: str = 'LogProcessor', schedule: str = 'rate(5 minutes)', 
                                  event_bus_name: str = 'default') -> dict:
        """Create a Log Processor schedule.

        Returns:
            dict: response
        """
        constant = {
            "metadata": {
                "pipelineId": pipeline_id,
                "sourceType": source_type,
                "scheduleType": "LogProcessor",
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
        
        self.put_rule(name=name, schedule=schedule, state='ENABLED', event_bus_name=event_bus_name)
        return self.put_targets(id=pipeline_id, rule_name=name, role_arn=role_arn, input=constant, sfn_arn=sfn_arn, event_bus_name=event_bus_name)
    
    def create_merger_rule(self, pipeline_id: str, source_type: str, table_name: str, schedule_type: str,
                           table_location: str, archive_location: str, partition_info: dict,
                           database: str, service: str, recipients: Union[str, list], sfn_arn: str, 
                           role_arn: str, **kwargs) -> dict:
        """Create a Log Merger schedule.

        Returns:
            dict: response
        """
        age = 7 if 'age' not in kwargs else kwargs['age']
        name = 'LogMerger' if 'name' not in kwargs else kwargs['name']
        event_bus_name = 'default' if 'event_bus_name' not in kwargs else kwargs['event_bus_name']
        schedule = 'cron(0 1 * * ? *)' if 'schedule' not in kwargs else kwargs['schedule']
        
        constant = {
            "metadata": {
                "pipelineId": pipeline_id,
                "sourceType": source_type,
                "scheduleType": schedule_type,
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
        
        self.put_rule(name=name, schedule=schedule, state='ENABLED', event_bus_name=event_bus_name)
        return self.put_targets(id=pipeline_id, rule_name=name, role_arn=role_arn, input=constant, sfn_arn=sfn_arn, event_bus_name=event_bus_name)
    
    def create_archive_rule(self, pipeline_id: str, source_type: str, table_name: str, schedule_type: str,
                                  table_location: str, archive_location: str, 
                                  database: str, service: str, recipients: Union[str, list], sfn_arn: str, 
                                  role_arn: str, **kwargs) -> dict:
        """Create a Log Archive schedule.

        Returns:
            dict: response
        """
        age = 30 if 'age' not in kwargs else kwargs['age']
        name = 'LogArchive' if 'name' not in kwargs else kwargs['name']
        event_bus_name = 'default' if 'event_bus_name' not in kwargs else kwargs['event_bus_name']
        schedule = 'cron(0 2 * * ? *)' if 'schedule' not in kwargs else kwargs['schedule']
        
        constant = {
            "metadata": {
                "pipelineId": pipeline_id,
                "sourceType": source_type,
                "scheduleType": schedule_type,
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
        
        self.put_rule(name=name, schedule=schedule, state='ENABLED', event_bus_name=event_bus_name)
        return self.put_targets(id=pipeline_id, rule_name=name, role_arn=role_arn, input=constant, sfn_arn=sfn_arn, event_bus_name=event_bus_name)
    