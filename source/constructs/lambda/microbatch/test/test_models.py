# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import os
import sys
import uuid
import pytest
from decimal import Decimal
from boto3.dynamodb.conditions import Attr
from datetime import datetime, timezone
from test.mock import mock_iam_context, mock_sqs_context, mock_ddb_context, default_environment_variables


sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


class TestETLLogTable:
    
    def test_put(self, mock_iam_context, mock_sqs_context, mock_ddb_context):
        from utils.models.etllog import ETLLogTable
        
        AWS_DDB_ETL_LOG = ETLLogTable()
        
        execution_name = '84997646-56ba-44ac-bab9-5acc9820d007'
        task_id = '00000000-0000-0000-0000-000000000000'
        start_time = datetime.now(timezone.utc).isoformat()
        item = {'API': 'Step Functions: StartExecution',
                'parentTaskId': '',
                'pipelineId': '189f73eb-1808-47e4-a9db-ee9c35100abe',
                'startTime': start_time,
                'stateMachineName': 'LogProcessor-HBTz7GoOjZoz',
                'stateName': 'Put task info of Step Function to DynamoDB',
                'status': 'Running'
                }
        
        AWS_DDB_ETL_LOG.put(execution_name, task_id, item)
        response = AWS_DDB_ETL_LOG.get(execution_name, task_id)
        assert response['executionName'] == execution_name
        assert response['taskId'] == task_id
        
        AWS_DDB_ETL_LOG.delete(execution_name, task_id)
        response = AWS_DDB_ETL_LOG.get(execution_name, task_id)
        assert response is None
        
        new_task_id = str(uuid.uuid4())
        new_execution_name = str(uuid.uuid4())
        
        item['executionName'] = new_execution_name
        item['taskId'] = new_task_id
        
        AWS_DDB_ETL_LOG.put(execution_name, task_id, item)
        response = AWS_DDB_ETL_LOG.get(execution_name, task_id)
        assert response['executionName'] == execution_name
        assert response['taskId'] == task_id
    
    def test_delete(self, mock_iam_context, mock_sqs_context, mock_ddb_context):
        from utils.models.etllog import ETLLogTable
        
        AWS_DDB_ETL_LOG = ETLLogTable()
        
        execution_name = '1ebf165b-f846-4813-8cab-305be5c8ca7e'
        task_id = '00000000-0000-0000-0000-000000000000'
        
        AWS_DDB_ETL_LOG.delete(execution_name, task_id)
        response = AWS_DDB_ETL_LOG.get(execution_name, task_id)
        assert response is None
    
    def test_batch_delete(self, mock_iam_context, mock_sqs_context, mock_ddb_context):
        from utils.models.etllog import ETLLogTable
        
        AWS_DDB_ETL_LOG = ETLLogTable()
        
        execution_name = '1ebf165b-f846-4813-8cab-305be5c8ca7e'
        task_id = '00000000-0000-0000-0000-000000000000'
        
        AWS_DDB_ETL_LOG.batch_delete(execution_name)
        assert AWS_DDB_ETL_LOG.query_count(execution_name) == 0
    
    def test_get(self, mock_iam_context, mock_sqs_context, mock_ddb_context):
        from utils.models.etllog import ETLLogTable
        
        AWS_DDB_ETL_LOG = ETLLogTable()
        
        execution_name = '1ebf165b-f846-4813-8cab-305be5c8ca7e'
        task_id = '00000000-0000-0000-0000-000000000000'
        
        response = AWS_DDB_ETL_LOG.get(execution_name, task_id)
        assert response['status'] == 'Running'
        
        response = AWS_DDB_ETL_LOG.get(execution_name, task_id, raise_if_not_found=True)
        assert response['status'] == 'Running'
        
        no_exists_task_id = '01bca8b2-603f-49c1-bfd4-462871dcd25f'
        key = {'executionName': execution_name, 'taskId': no_exists_task_id}
        response = AWS_DDB_ETL_LOG.get(execution_name, no_exists_task_id)
        assert response is None
        
        with pytest.raises(Exception) as exception_info:
            AWS_DDB_ETL_LOG.get(execution_name, no_exists_task_id, raise_if_not_found=True)
        assert exception_info.value.args[1] == f"Key: {key}"

    def test_update(self, mock_iam_context, mock_sqs_context, mock_ddb_context):
        from utils.models.etllog import ETLLogTable
        
        AWS_DDB_ETL_LOG = ETLLogTable()
        
        execution_name = '1ebf165b-f846-4813-8cab-305be5c8ca7e'
        task_id = '00000000-0000-0000-0000-000000000000'
        end_time = datetime.now(timezone.utc).isoformat()
        
        response = AWS_DDB_ETL_LOG.get(execution_name, task_id)
        assert response['status'] == 'Running'
        assert response['endTime'] == ''
        
        AWS_DDB_ETL_LOG.update(execution_name, task_id, {'status': 'Succeeded', 'endTime': end_time})
        response = AWS_DDB_ETL_LOG.get(execution_name, task_id) 
        assert response['status'] == 'Succeeded'
        assert response['endTime'] == end_time
        
        AWS_DDB_ETL_LOG.update(execution_name, task_id, {'executionName': execution_name, 'status': 'Succeeded', 'endTime': end_time})
        response = AWS_DDB_ETL_LOG.get(execution_name, task_id) 
        assert response['status'] == 'Succeeded'
        assert response['endTime'] == end_time

    def test_query_item(self, mock_iam_context, mock_sqs_context, mock_ddb_context):
        from utils.models.etllog import ETLLogTable
        
        AWS_DDB_ETL_LOG = ETLLogTable()
        
        subtasks_count = AWS_DDB_ETL_LOG.query_count(execution_name='1ebf165b-f846-4813-8cab-305be5c8ca7e')
        assert subtasks_count == 4
        
        item_iterator = AWS_DDB_ETL_LOG.query_item(execution_name='1ebf165b-f846-4813-8cab-305be5c8ca7e')
        assert next(item_iterator)['taskId'] == '00000000-0000-0000-0000-000000000000'
        assert next(item_iterator)['taskId'] == '6b10286b-c4b3-44ed-b4e8-c251a04b6a59'
        assert next(item_iterator)['taskId'] == '9d512f44-7626-49e2-a465-f450e93f6388'
        assert next(item_iterator)['taskId'] == 'bc73c25b-49c1-4d9f-a005-d0853809260d'
        with pytest.raises(StopIteration):
            next(item_iterator)
        
    def test_query_count(self, mock_iam_context, mock_sqs_context, mock_ddb_context):
        from utils.models.etllog import ETLLogTable
        
        AWS_DDB_ETL_LOG = ETLLogTable()
        
        subtasks_count = AWS_DDB_ETL_LOG.query_count(execution_name='1ebf165b-f846-4813-8cab-305be5c8ca7e')
        assert subtasks_count == 4
    
    def test_query_subtasks(self, mock_iam_context, mock_sqs_context, mock_ddb_context):
        from utils.models.etllog import ETLLogTable
        
        AWS_DDB_ETL_LOG = ETLLogTable()
        
        execution_name = '1ebf165b-f846-4813-8cab-305be5c8ca7e'
        parent_task_id = '6b10286b-c4b3-44ed-b4e8-c251a04b6a59'
        
        subtasks = AWS_DDB_ETL_LOG.query_subtasks(execution_name=execution_name, parent_task_id=parent_task_id)
        assert next(subtasks)['taskId'] == '9d512f44-7626-49e2-a465-f450e93f6388'
        assert next(subtasks)['taskId'] == 'bc73c25b-49c1-4d9f-a005-d0853809260d'
        with pytest.raises(StopIteration):
            next(subtasks)
    
    def test_get_subtask_status_count(self, mock_iam_context, mock_sqs_context, mock_ddb_context):
        from utils.models.etllog import ETLLogTable
        
        AWS_DDB_ETL_LOG = ETLLogTable()
        
        execution_name = '1ebf165b-f846-4813-8cab-305be5c8ca7e'
        parent_task_id = '6b10286b-c4b3-44ed-b4e8-c251a04b6a59'
        subtask1_task_id = '9d512f44-7626-49e2-a465-f450e93f6388'
        subtask2_task_id = 'bc73c25b-49c1-4d9f-a005-d0853809260d'
        end_time = datetime.now(timezone.utc).isoformat()
        
        response = AWS_DDB_ETL_LOG.get_subtask_status_count(execution_name=execution_name, parent_task_id=parent_task_id, status='Running')
        assert response['taskCount'] == 2
        assert response['taskCount'] == 2
        assert response['totalSubTask'] == 2
        
        AWS_DDB_ETL_LOG.update(execution_name, subtask1_task_id, {'status': 'Succeeded', 'endTime': end_time})
        response = AWS_DDB_ETL_LOG.get_subtask_status_count(execution_name=execution_name, parent_task_id=parent_task_id, status='Succeeded')
        assert response['taskCount'] == 1
        assert response['totalSubTask'] == 2
        
        AWS_DDB_ETL_LOG.update(execution_name, subtask2_task_id, {'status': 'Succeeded', 'endTime': end_time})
        response = AWS_DDB_ETL_LOG.get_subtask_status_count(execution_name=execution_name, parent_task_id=parent_task_id, status='Succeeded')
        assert response['taskCount'] == 2
        assert response['totalSubTask'] == 2


class TestMetaTable:
    
    def test_put(self, mock_iam_context, mock_sqs_context, mock_ddb_context):
        from utils.models.meta import MetaTable
        
        account_id = os.environ['ACCOUNT_ID']
        aws_region = os.environ['AWS_REGION']
        
        log_merger_name = os.environ["LOG_MERGER_NAME"]
        
        AWS_DDB_META = MetaTable()
        
        log_merger = {
            'metaName': 'LogMerger',
            'arn': f'arn:aws:states:{aws_region}:{account_id}:stateMachine:{log_merger_name}',
            'name': log_merger_name,
            'service': 'StepFunction',
            'url': f'https://{aws_region}.console.aws.amazon.com/states/home?region={aws_region}#/statemachines/view/arn:aws:states:{aws_region}:{account_id}:stateMachine:{log_merger_name}',
        }
        
        assert AWS_DDB_META.get(meta_name=log_merger['metaName']) == log_merger
        AWS_DDB_META.delete(meta_name=log_merger['metaName'])
        assert AWS_DDB_META.get(meta_name=log_merger['metaName']) is None
        AWS_DDB_META.put(meta_name=log_merger['metaName'], item=log_merger)
        assert AWS_DDB_META.get(meta_name=log_merger['metaName']) == log_merger
        
    def test_delete(self, mock_iam_context, mock_sqs_context, mock_ddb_context):
        from utils.models.meta import MetaTable
        
        account_id = os.environ['ACCOUNT_ID']
        aws_region = os.environ['AWS_REGION']
        log_processor_name = os.environ["LOG_PROCESSOR_NAME"]
        
        AWS_DDB_META = MetaTable()

        assert AWS_DDB_META.get(meta_name='LogProcessor') == {
            'metaName': 'LogProcessor',
            'arn': f'arn:aws:states:{aws_region}:{account_id}:stateMachine:{log_processor_name}',
            'name': log_processor_name,
            'service': 'StepFunction',
            'url': f'https://{aws_region}.console.aws.amazon.com/states/home?region={aws_region}#/statemachines/view/arn:aws:states:{aws_region}:{account_id}:stateMachine:{log_processor_name}',
        }
        AWS_DDB_META.delete(meta_name=log_processor_name)
        assert AWS_DDB_META.get(meta_name=log_processor_name) is None
    
    def test_batch_delete(self, mock_iam_context, mock_sqs_context, mock_ddb_context):
        from utils.models.meta import MetaTable
        
        AWS_DDB_META = MetaTable()
        
        account_id = os.environ['ACCOUNT_ID']
        aws_region = os.environ['AWS_REGION']
        log_processor_name = os.environ["LOG_PROCESSOR_NAME"]
        s3_public_access_policy_name = os.environ["S3_PUBLIC_ACCESS_POLICY"] 
        
        assert AWS_DDB_META.get(meta_name='LogProcessor') == {
            'metaName': 'LogProcessor',
            'arn': f'arn:aws:states:us-east-1:123456789012:stateMachine:{log_processor_name}',
            'name': log_processor_name,
            'service': 'StepFunction',
            'url': f'https://{aws_region}.console.aws.amazon.com/states/home?region={aws_region}#/statemachines/view/arn:aws:states:{aws_region}:{account_id}:stateMachine:{log_processor_name}',
        }
        assert AWS_DDB_META.get(meta_name='S3PublicAccessPolicy') == {
            'metaName': 'S3PublicAccessPolicy',
            'arn': f'arn:aws:iam::{account_id}:policy/{s3_public_access_policy_name}',
            'name': s3_public_access_policy_name,
            'service': 'IAM',
            'url': '',
        
        }
        AWS_DDB_META.batch_delete(meta_names=[log_processor_name, s3_public_access_policy_name])
        assert AWS_DDB_META.get(meta_name=log_processor_name) is None
        assert AWS_DDB_META.get(meta_name=s3_public_access_policy_name) is None
        
    def test_update(self, mock_iam_context, mock_sqs_context, mock_ddb_context):
        from utils.models.meta import MetaTable
        
        AWS_DDB_META = MetaTable()
        
        account_id = os.environ['ACCOUNT_ID']
        aws_region = os.environ['AWS_REGION']
        log_processor_name = os.environ["LOG_PROCESSOR_NAME"]
        
        assert AWS_DDB_META.get(meta_name='LogProcessor') == {
            'metaName': 'LogProcessor',
            'arn': f'arn:aws:states:us-east-1:123456789012:stateMachine:{log_processor_name}',
            'name': log_processor_name,
            'service': 'StepFunction',
            'url': f'https://{aws_region}.console.aws.amazon.com/states/home?region={aws_region}#/statemachines/view/arn:aws:states:{aws_region}:{account_id}:stateMachine:{log_processor_name}',
        }
        AWS_DDB_META.update(meta_name='LogProcessor', item={'url': '', 'metaName': 'Log', 'name': 'LogProcessor'})
        assert AWS_DDB_META.get(meta_name='LogProcessor') == {
            'metaName': 'LogProcessor',
            'arn': f'arn:aws:states:us-east-1:123456789012:stateMachine:{log_processor_name}',
            'name': 'LogProcessor',
            'service': 'StepFunction',
            'url': '',
        }
    
    def test_get(self, mock_iam_context, mock_sqs_context, mock_ddb_context):
        from utils.models.meta import MetaTable
        
        AWS_DDB_META = MetaTable()
        
        account_id = os.environ['ACCOUNT_ID']
        aws_region = os.environ['AWS_REGION']
        log_processor_name = os.environ["LOG_PROCESSOR_NAME"]
        
        assert AWS_DDB_META.get(meta_name='LogProcessor') == {
            'metaName': 'LogProcessor',
            'arn': f'arn:aws:states:us-east-1:123456789012:stateMachine:{log_processor_name}',
            'name': log_processor_name,
            'service': 'StepFunction',
            'url': f'https://{aws_region}.console.aws.amazon.com/states/home?region={aws_region}#/statemachines/view/arn:aws:states:{aws_region}:{account_id}:stateMachine:{log_processor_name}',
        }
        
        assert AWS_DDB_META.get(meta_name='not-exists-meta-name') is None
        
    def test_scan_item(self, mock_iam_context, mock_sqs_context, mock_ddb_context):
        from utils.models.meta import MetaTable
        
        account_id = os.environ['ACCOUNT_ID']
        aws_region = os.environ['AWS_REGION']
        log_processor_name = os.environ["LOG_PROCESSOR_NAME"]
        
        AWS_DDB_META = MetaTable()
        
        assert list(AWS_DDB_META.scan_item()) == [
            {'metaName': 'AvailableServices', 'service': 'AWS', 'type': 'AvailableServices', 'value': ['scheduler', 'events']},
            {'metaName': 'AccountId', 'service': 'AWS', 'type': 'Account', 'arn': '', 'name': 'Account', 'value': '123456789012'},
            {'metaName': 'Region', 'service': 'AWS', 'type': 'Region', 'arn': '', 'name': 'Region', 'value': 'us-east-1'}, 
            {'metaName': 'Partition', 'service': 'AWS', 'type': 'Partition', 'arn': '', 'name': 'Partition', 'value': 'aws'},
            {'metaName': 'AwsConsoleUrl', 'service': 'AWS', 'type': 'Url', 'arn': '', 'name': 'AwsConsoleUrl', 'value': f'https://{aws_region}.console.com'},
            {'metaName': 'ETLLogTimeToLiveSecs', 'service': 'Solution', 'type': 'Parameter', 'arn': '', 'name': 'ETLLogTimeToLiveSecs', 'value': '2592000'}, 
            {'metaName': 'CentralizedCatalog', 'arn': '', 'name': 'AwsDataCatalog', 'service': 'GLUE'}, 
            {'metaName': 'CentralizedDatabase', 'arn': 'arn:aws:glue:us-east-1:123456789012:database/centralized', 'name': 'centralized', 'service': 'GLUE'}, 
            {'metaName': 'AthenaWorkGroup', 'arn': '', 'name': 'Primary', 'service': 'Athena'}, 
            {'metaName': 'AthenaOutputLocation', 'arn': '', 'name': 's3://staging-bucket/athena-results', 'service': 'Athena'}, 
            {'metaName': 'AthenaPublicAccessRole', 'arn': 'arn:aws:iam::123456789012:role/AthenaPublicAccessRole', 'name': 'AthenaPublicAccessRole', 'service': 'Athena'}, 
            {'metaName': 'TmpDatabase', 'arn': 'arn:aws:glue:us-east-1:123456789012:database/tmp', 'name': 'tmp', 'service': 'GLUE'}, 
            {'metaName': 'LogProcessor', 'arn': 'arn:aws:states:us-east-1:123456789012:stateMachine:LogProcessor-jwEfndaqF0Yf', 'name': 'LogProcessor-jwEfndaqF0Yf', 'service': 'StepFunction', 'url': 'https://us-east-1.console.aws.amazon.com/states/home?region=us-east-1#/statemachines/view/arn:aws:states:us-east-1:123456789012:stateMachine:LogProcessor-jwEfndaqF0Yf'}, 
            {'metaName': 'LogMerger', 'arn': 'arn:aws:states:us-east-1:123456789012:stateMachine:LogMerger-RseVgZbWTVYQ', 'name': 'LogMerger-RseVgZbWTVYQ', 'service': 'StepFunction', 'url': 'https://us-east-1.console.aws.amazon.com/states/home?region=us-east-1#/statemachines/view/arn:aws:states:us-east-1:123456789012:stateMachine:LogMerger-RseVgZbWTVYQ'}, 
            {'metaName': 'LogArchive', 'arn': 'arn:aws:states:us-east-1:123456789012:stateMachine:LogArchive-HjIal34TEnuK', 'name': 'LogArchive-HjIal34TEnuK', 'service': 'StepFunction', 'url': 'https://us-east-1.console.aws.amazon.com/states/home?region=us-east-1#/statemachines/view/arn:aws:states:us-east-1:123456789012:stateMachine:LogArchive-HjIal34TEnuK'}, 
            {'metaName': 'LogProcessorStartExecutionRole', 'arn': 'arn:aws:iam::123456789012:role/LogProcessor-jwEfndaqF0Yf', 'name': 'LogProcessor-jwEfndaqF0Yf', 'service': 'StepFunction', 'url': 'https://us-east-1.console.aws.amazon.com/iamv2/home?region=us-east-1#/roles/details/LogProcessor-jwEfndaqF0Yf'}, 
            {'metaName': 'LogMergerStartExecutionRole', 'arn': 'arn:aws:iam::123456789012:role/LogMerger-RseVgZbWTVYQ', 'name': 'LogMerger-RseVgZbWTVYQ', 'service': 'IAM', 'url': 'https://us-east-1.console.aws.amazon.com/iamv2/home?region=us-east-1#/roles/details/LogMerger-RseVgZbWTVYQ'}, 
            {'metaName': 'LogArchiveStartExecutionRole', 'arn': 'arn:aws:iam::123456789012:role/LogArchive-HjIal34TEnuK', 'name': 'LogArchive-HjIal34TEnuK', 'service': 'IAM', 'url': 'https://us-east-1.console.aws.amazon.com/iamv2/home?region=us-east-1#/roles/details/LogArchive-HjIal34TEnuK'}, 
            {'metaName': 'S3PublicAccessPolicy', 'arn': 'arn:aws:iam::123456789012:policy/S3PublicAccessPolicy-SJR01YRWEDSP', 'name': 'S3PublicAccessPolicy-SJR01YRWEDSP', 'service': 'IAM', 'url': ''}, 
            {'metaName': 'SendTemplateEmailSNSPublicPolicy', 'arn': 'arn:aws:iam::123456789012:policy/SendTemplateEmailSNSPublicPolicy', 'name': 'SendTemplateEmailSNSPublicPolicy', 'service': 'IAM', 'url': ''}, 
            {'metaName': 'EmailAddress', 'service': 'CloudFormation', 'type': 'Parameter', 'arn': '', 'name': 'EmailAddress', 'value': 'alejandro_rosalez@example.com'},
            {'metaName': 'StagingBucket', 'arn': 'arn:aws:s3:::staging-bucket', 'name': 'staging-bucket', 'service': 'S3', 'url': ''}, 
            {'metaName': '949cc17d-38da-42d0-a030-4f0508a181b2', 'data': {'source': {'type': 'WAF', 'table': {'schema': '{}', 'dataFormat': '', 'tableProperties': '{}', 'serializationProperties': '{}'}}, 'destination': {'location': {'bucket': 'centralized-bucket', 'prefix': 'datalake'}, 'database': {'name': 'centralized'}, 'table': {'name': 'waf', 'schema': '{}'}, 'metrics': {'name': '', 'schema': '{}'}}, 'notification': {'service': 'SES', 'recipients': 'alejandro_rosalez@example.com,alejandro_rosalez@example.org'}, 'grafana': {'importDashboards': 'false', 'url': '', 'token': ''}, 'scheduler': {'service': 'scheduler', 'LogProcessor': {'schedule': 'rate(5 minutes)'}, 'LogMerger': {'schedule': 'cron(0 1 * * ? *)', 'age': Decimal('3')}, 'LogArchive': {'schedule': 'cron(0 2 * * ? *)', 'age': Decimal('7')}}, 'staging': {'prefix': 'AWSLogs/WAFLogs'}}, 'stack': {'lambda': {'replicate': 'arn:aws:lambda:us-east-1:123456789012:function:S3ObjectReplication-ZaIMYAiOjVzz'}, 'queue': {'logEventQueue': 'arn:aws:sqs:us-east-1:123456789012:LogEventQueue-Zvj0MU8DLnTp', 'logEventDLQ': 'arn:aws:sqs:us-east-1:123456789012:LogEventDLQ-PYjliv5vefCc'}, 'role': {'replicate': 'arn:aws:iam::123456789012:role/S3ObjectReplication-ZaIMYAiOjVzz'}}}, 
            {'metaName': 'dddc2d66-ac99-48a5-834d-dc2d5b75069b', 'data': {'role': {'sts': ''}, 'source': {'bucket': 'logging-bucket', 'prefix': 'AWSLogs/123456789012/us-east-1/WAFLogs/'}}, 'pipelineId': '949cc17d-38da-42d0-a030-4f0508a181b2'}, 
            {'metaName': '0616c38e-b31f-401e-a642-677849226c5b', 'data': {'source': {'type': 'fluent-bit', 'table': {'schema': '{"type":"object","properties":{"timestamp":{"type":"string","timeKey":true,"format":"YYYY-MM-dd\'\'T\'\'HH:mm:ss.SSSSSSSSSZ"},"correlationId":{"type":"string"},"processInfo":{"type":"object","properties":{"hostname":{"type":"string"},"domainId":{"type":"string"},"groupId":{"type":"string"},"groupName":{"type":"string"},"serviceId":{"type":"string","partition":true},"serviceName":{"type":"string"},"version":{"type":"string"}}},"transactionSummary":{"type":"object","properties":{"path":{"type":"string"},"protocol":{"type":"string"},"protocolSrc":{"type":"string"},"status":{"type":"string"},"serviceContexts":{"type":"array","items":{"type":"object","properties":{"service":{"type":"string"},"monitor":{"type":"boolean"},"client":{"type":"string"},"org":{},"app":{},"method":{"type":"string"},"status":{"type":"string"},"duration":{"type":"number"}}}}}}}}', 'dataFormat': 'json', 'tableProperties': '{}', 'serializationProperties': '{}'}}, 'destination': {'location': {'bucket': 'centralized-bucket', 'prefix': 'datalake'}, 'database': {'name': 'centralized'}, 'table': {'name': 'application', 'schema': '{}'}, 'metrics': {'name': '', 'schema': '{}'}}, 'notification': {'service': 'SES', 'recipients': 'alejandro_rosalez@example.com,alejandro_rosalez@example.org'}, 'grafana': {'importDashboards': 'false', 'url': '', 'token': ''}, 'scheduler': {'service': 'scheduler', 'LogProcessor': {'schedule': 'rate(5 minutes)'}, 'LogMerger': {'schedule': 'cron(0 1 * * ? *)', 'age': Decimal('3')}, 'LogArchive': {'schedule': 'cron(0 2 * * ? *)', 'age': Decimal('7')}}, 'staging': {'prefix': 'APPLogs/ServicesLogs'}}, 'stack': {'lambda': {'replicate': 'arn:aws:lambda:us-east-1:123456789012:function:S3ObjectReplication-ZaIMYAiOjVzz'}, 'queue': {'logEventQueue': 'arn:aws:sqs:us-east-1:123456789012:LogEventQueue-Zvj0MU8DLnTp', 'logEventDLQ': 'arn:aws:sqs:us-east-1:123456789012:LogEventDLQ-PYjliv5vefCc'}, 'role': {'replicate': 'arn:aws:iam::123456789012:role/S3ObjectReplication-ZaIMYAiOjVzz'}}}, 
            {'metaName': '29df4748-3a26-4ccb-ab68-f62629a57cb5', 'data': {'role': {'sts': ''}, 'source': {'bucket': 'logging-bucket', 'prefix': 'AWSLogs/123456789012/us-east-1/WAFLogs/'}}, 'pipelineId': '0616c38e-b31f-401e-a642-677849226c5b'},
            {'metaName': 'PipelineResourcesBuilderRole', 'arn': 'arn:aws:iam::123456789012:role/PipelineResourcesBuilderRole', 'name': 'PipelineResourcesBuilderRole', 'service': 'IAM', 'url': ''}, 
            {'metaName': 'PipelineResourcesBuilderSchedulePolicy', 'arn': 'arn:aws:iam::123456789012:policy/PipelineResourcesBuilderSchedulePolicy', 'name': 'PipelineResourcesBuilderSchedulePolicy', 'service': 'IAM', 'url': ''},
            ]
        conditions = Attr('name').eq(log_processor_name)
        assert list(AWS_DDB_META.scan_item(filter=conditions)) == [{'metaName': 'LogProcessor', 'arn': 'arn:aws:states:us-east-1:123456789012:stateMachine:LogProcessor-jwEfndaqF0Yf', 'name': 'LogProcessor-jwEfndaqF0Yf', 'service': 'StepFunction', 'url': 'https://us-east-1.console.aws.amazon.com/states/home?region=us-east-1#/statemachines/view/arn:aws:states:us-east-1:123456789012:stateMachine:LogProcessor-jwEfndaqF0Yf'}, {'metaName': 'LogProcessorStartExecutionRole', 'arn': 'arn:aws:iam::123456789012:role/LogProcessor-jwEfndaqF0Yf', 'name': 'LogProcessor-jwEfndaqF0Yf', 'service': 'StepFunction', 'url': 'https://us-east-1.console.aws.amazon.com/iamv2/home?region=us-east-1#/roles/details/LogProcessor-jwEfndaqF0Yf'}]
        
    def test_scan_count(self, mock_iam_context, mock_sqs_context, mock_ddb_context):
        from utils.models.meta import MetaTable
        
        account_id = os.environ['ACCOUNT_ID']
        aws_region = os.environ['AWS_REGION']
        log_processor_name = os.environ["LOG_PROCESSOR_NAME"]
        log_merger_name = os.environ["LOG_MERGER_NAME"]
        
        AWS_DDB_META = MetaTable()
        assert AWS_DDB_META.scan_count() == 28
        conditions = Attr('name').eq(log_processor_name)
        assert AWS_DDB_META.scan_count(filter=conditions) == 2
        
        log_merger = {
            'metaName': 'LogMerger',
            'arn': f'arn:aws:states:{aws_region}:{account_id}:stateMachine:{log_merger_name}',
            'name': log_merger_name,
            'service': 'StepFunction',
            'url': f'https://{aws_region}.console.aws.amazon.com/states/home?region={aws_region}#/statemachines/view/arn:aws:states:{aws_region}:{account_id}:stateMachine:{log_merger_name}',
        }
        AWS_DDB_META.put(meta_name=log_merger['metaName'], item=log_merger)
        assert AWS_DDB_META.scan_count() == 28
  
    def test_etl_log_ttl_secs(self, mock_iam_context, mock_sqs_context, mock_ddb_context):
        from utils.models.meta import MetaTable
        
        AWS_DDB_META = MetaTable()
        
        assert AWS_DDB_META.etl_log_ttl_secs == 2592000
        
        AWS_DDB_META.delete('ETLLogTimeToLiveSecs')
        assert AWS_DDB_META.etl_log_ttl_secs == 2592000
        AWS_DDB_META = MetaTable()
        assert AWS_DDB_META.etl_log_ttl_secs == 2592000
        
        AWS_DDB_META.update(meta_name='ETLLogTimeToLiveSecs', item={'value': '3000'})
        assert AWS_DDB_META.etl_log_ttl_secs == 2592000
        AWS_DDB_META = MetaTable()
        assert AWS_DDB_META.etl_log_ttl_secs == 3000
    
    def test_aws_console_url(self, mock_iam_context, mock_sqs_context, mock_ddb_context):
        from utils.models.meta import MetaTable
        
        aws_region = os.environ['AWS_REGION']
        AWS_DDB_META = MetaTable()
        
        assert AWS_DDB_META.aws_console_url == f'https://{aws_region}.console.com'
        
        AWS_DDB_META.delete('AwsConsoleUrl')
        assert AWS_DDB_META.aws_console_url == f'https://{aws_region}.console.com'
        