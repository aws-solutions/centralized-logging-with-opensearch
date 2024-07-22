# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0


import os
import time
import json
import uuid
import random
from pathlib import Path
from typing import Union, Iterator, Callable
from utils.helpers import (
    AWSConnection, 
    logger,
    CommonEnum,
    make_local_work_dir, 
    delete_local_file, 
    clean_local_download_dir, 
    detect_file_extension_by_header,
    enrichment,
)
from .constants import ALB_LOGGING_ACCOUNT_MAPPING


class Status(CommonEnum):
    RUNNING = 'Running'
    SUCCEEDED = 'Succeeded'
    FAILED = 'Failed'


class S3Client:
    """S3 Client, used to interact with S3"""

    def __init__(self, sts_role_arn=''):
        self.conn = AWSConnection()
        self._s3_client = self.conn.get_client("s3", sts_role_arn=sts_role_arn)
    
    def list_all_objects(self, bucket: str, prefix: str = '', max_records: int = -1) -> list:
        """To retrieve all non-empty object files and return a data list.

        :param bucket (str): s3 bucket name, e.g. staging-bucket.
        :param prefix (str, optional): Amazon S3 prefix, e.g. 'AWS/123456789012', Defaults to ''.
        :param max_records (str, optional): Amazon S3 prefix, e.g. 'AWS/123456789012', Defaults to ''.

        return list[dict]: Metadata only contains Key and Size about each object returned.
        """
        contents = []
        
        for content in self.list_objects(bucket=bucket, prefix=prefix):
            if content['Size'] == 0:
                logger.debug(f"Ignore object due to content size is zero, key is {content['Key']}.")
                continue
            contents.append({'Key':content['Key'], 'Size':content['Size']})
            if len(contents) == max_records:
                break
        return contents

    def list_objects(self, bucket: str, prefix: str = '', limit: Union[int, None] = None,
                     page_size: Union[int, None] = None) -> Iterator[dict]:
        """Get all object information in the bucket, return an iterable object, use next, iter method to read data.

        :param bucket (str): s3 bucket name, e.g. staging-bucket.
        :param prefix (str, optional): Amazon S3 prefix, e.g. 'AWS/123456789012', Defaults to ''.
        :param limit (Union[int, None], optional): Sets the maximum number of keys returned in the response. 
            Defaults to None, the action return all of objects in the bucket.
        :param page_size (Union[int, None], optional): Controls the number of items returned per page of each result. Defaults to None.

        return Iterator[dict]: Metadata about each object returned.
        """
        paginator = self._s3_client.get_paginator('list_objects_v2')
        for page_iterator in paginator.paginate(Bucket=bucket, Prefix=prefix,
                                                PaginationConfig={'MaxItems': limit, 'PageSize': page_size}):
            for content in page_iterator.get('Contents', []):
                yield content

    def head_object(self, bucket: str, key: str = ''):
        return self._s3_client.head_object(Bucket=bucket, Key=key)
    
    def download_file(self, bucket: str, key: str, filename: str) -> None:
        try:
            self._s3_client.download_file(Bucket=bucket, Key=key, Filename=filename)
        except Exception as e:
            logger.error(f'S3 object file download failed with error message: {e}. The bucket: {bucket}, key: {key}')

    def upload_file(self, filename: str, bucket: str, key: str) -> None:
        return self._s3_client.upload_file(Filename=filename, Bucket=bucket, Key=key)

    def batch_copy_objects(self, tasks: list[dict], delete_on_success: bool = False, enrich_func: Union[Callable, None] = None, enrich_plugins: set = set()) -> Status:
        """Batch copy S3 files to another Bucket or prefix. When replication fails, there is no need to retry,
           just retry the next batch.

        :param tasks: Copy the task list, e.g. [{'source': {'bucket': 'stagingbucket', 'key': 'AWSLogs/apigateway1.gz'},
            'destination': {'bucket': 'stagingbucket', 'key': 'archive/centralized/aws_apigateway_logs_gz/apigateway1.gz'}}]
        :param delete_on_success: When the value is True, the source file will be deleted after the copy is completed;
            when the value is False, the source file will not be deleted after the copy is completed.
        :return: None
        """
        logger.debug(f'Batch copy tasks are received, and the number of tasks is {len(tasks)}.')
        status = Status.RUNNING
        succeed_task_count = 0
        failed_task_count = 0
        local_work_path = make_local_work_dir()
        for task in tasks:
            local_file_uid = str(uuid.uuid4())
            local_download_filename = local_work_path / 'download' / local_file_uid
            local_output_filename = local_download_filename
            try:
                source = task['source']
                destination = task['destination']
                logger.debug(f'Copying object, src: {json.dumps(source)}, dst: {json.dumps(destination)}.')
                if source.get('role') or enrich_func is not None:
                    s3_source_client = self.conn.get_client("s3", sts_role_arn=source.get('role'))
                    s3_source_client.download_file(Bucket=source['bucket'], Key=source['key'], Filename=local_download_filename.as_posix())
                    if enrich_func is not None:
                        local_output_filename = enrichment(input_file_path=local_download_filename,
                                                           output_file_path=local_work_path / 'output' / local_file_uid, 
                                                           enrich_func=enrich_func,
                                                           enrich_plugins=enrich_plugins)
                    self._s3_client.upload_file(Filename=local_output_filename.as_posix(), Bucket=destination['bucket'], Key=destination['key'])
                else:
                    self._s3_client.copy_object(Bucket=destination['bucket'], Key=destination['key'], CopySource={'Bucket': source['bucket'], 'Key': source['key']})
                    
                succeed_task_count += 1
                if delete_on_success is True:
                    self.delete_object(bucket=source['bucket'], key=source['key'])
                status = Status.SUCCEEDED
            except Exception as e:
                logger.error(f'{e}, the task is {task}.')
                failed_task_count += 1
                status = Status.FAILED
            
            delete_local_file(path=local_download_filename)
            delete_local_file(path=local_output_filename)

        clean_local_download_dir(path=local_work_path)
        logger.info(f'Batch copy task completed, Succeed: {succeed_task_count}, Failed: {failed_task_count}.')
        return status

    def batch_download_files(self, tasks: list[dict], local_download_dir: Path, raise_if_fails: bool = False) -> Path:
        """Download S3 files in batches to the local directory. When the download fails, there is no need to retry,
           and the next batch can be retried.

        :param tasks: Download the task list, e.g. [{'source': {'bucket': 'stagingbucket', 'key': 'AWSLogs/apigateway1.gz'}, 
            'destination': {'bucket': 'stagingbucket', 'key': 'archive/centralized/aws_apigateway_logs_gz/apigateway1.gz'}}]
        :param local_download_dir: Local directory, all S3 files of the same batch will be downloaded to this directory.
        :param raise_if_fails: If the download fails, return an exception.
        :return: The last file path downloaded to the local, used to determine the file format later.
        """
        logger.debug(f'Batch download tasks are received, and the number of tasks is {len(tasks)}.')
        succeed_task_count = 0
        failed_task_count = 0
        exception = None

        last_exists_file = Path('')
        for task in tasks:
            try:
                source = task['source']
                file_path = local_download_dir / f'{os.path.basename(source["key"])}'
                logger.debug(f'Downloading object, src: {json.dumps(source)}, dst: {file_path}.')
                self._s3_client.download_file(source['bucket'], source['key'], file_path.as_posix())
                succeed_task_count += 1
                last_exists_file = file_path
            except Exception as e:
                logger.error(f'{e}, the task is {task}.')
                failed_task_count += 1
                exception = e
        logger.info(f'Batch download task completed, Succeed: {succeed_task_count}, Failed: {failed_task_count}.')
        if raise_if_fails is True and exception is not None:
            raise exception
        return last_exists_file

    def batch_delete_objects(self, tasks: list[dict], batch_num: int = 100) -> None:
        """Delete S3 files in batches, only delete the source files, such as the source of the task,
           and do nothing for the destination.

        :param tasks: Delete the task list, e.g. [{'source': {'bucket': 'stagingbucket',
            'key': 'AWSLogs/apigateway1.gz'}, 'destination': {'bucket': 'stagingbucket',
            'key': 'archive/centralized/aws_apigateway_logs_gz/apigateway1.gz'}}]
        :return: None
        """
        logger.info(f'Batch delete tasks are received, and the number of tasks is {len(tasks)}.')
        succeed_task_count = 0
        failed_task_count = 0
        delete_objects = {}
        for task in tasks:
            source = task['source']
            bucket_name = source['bucket']
            key = source['key']
            if bucket_name not in delete_objects:
                delete_objects[bucket_name] = [{'Key': key}]
                continue 
            delete_objects[bucket_name].append({'Key': key})
            if len(delete_objects[bucket_name]) >= batch_num:
                logger.debug(f'Deleting objects, src: {json.dumps(source)}.')
                response = self._s3_client.delete_objects(Bucket=bucket_name,
                                                          Delete={'Objects': delete_objects[bucket_name]})
                delete_objects.pop(bucket_name)
                succeed_task_count += len(response.get('Deleted', []))
                failed_task_count += len(response.get('Errors', []))
        for bucket_name in delete_objects.keys():
            response = self._s3_client.delete_objects(Bucket=bucket_name, Delete={'Objects': delete_objects[bucket_name]})
            succeed_task_count += len(response.get('Deleted', []))
            failed_task_count += len(response.get('Errors', []))
        logger.info(f'Batch delete task completed, Succeed: {succeed_task_count}, Failed: {failed_task_count}.')

    def merge_objects(self, tasks: list[dict], delete_on_success: bool = False, max_size: int = 2 ** 10) -> Status:
        """S3 object merge function, download all S3 files to the local, detect the file type and merge 
           into one file, currently only supports text, gzip, parquet file types.

        :param tasks (list[dict]): The list of files that need to be merged, e.g. [{'source': {'bucket': 'stagingbucket', 'key': 'AWSLogs/123456789012/alb1.log'}} ...]
            When merging files, take the first source.key in the list as the key for uploading back to s3.
        :param delete_on_success (bool, optional): Whether to delete the original objects after the file merge is completed. Defaults to False.
            When delete_on_success is True, delete the original object only if the file merge is successful.
            When delete_on_success is False, do not delete original object.
        """
        from utils.filemerge.helpers import extension_to_merge_func
        
        if tasks:
            if len(tasks) == 1:
                logger.info('Only one task in data, degenerates into a s3 copy operation.')
                return self.batch_copy_objects(tasks, delete_on_success)
            destination = tasks[0]['destination']
            logger.debug(
                f'Get the first task\' destination as the merge file\' s3 path, the destination is {destination}.')
        else:
            logger.debug('No task in data, do not need to start subtasks.')
            return Status.SUCCEEDED

        local_work_path = make_local_work_dir()
        local_download_dir = local_work_path / 'download'
        local_merged_path =  local_work_path / f"output/{os.path.basename(destination['key'])}"

        merge_is_succeeded = False
        try:
            last_file_name = self.batch_download_files(tasks, local_download_dir, raise_if_fails=True)
            extension = detect_file_extension_by_header(last_file_name)
            merge_function = extension_to_merge_func(extension)

            logger.debug(
                f'Starting merge all of {extension} files in {local_download_dir}, output to {local_merged_path}.')
            merge_function(local_download_dir, local_merged_path, max_size=max_size)
            logger.info(f'Merge task is completed, uploading {local_merged_path} to s3 {destination}.')
            self._s3_client.upload_file(local_merged_path.as_posix(), Bucket=destination['bucket'], Key=destination['key']) 
            logger.debug('S3 file uploaded successfully.')
            merge_is_succeeded = True
            if merge_is_succeeded is True and delete_on_success is True:
                self.batch_delete_objects(tasks)
            status = Status.SUCCEEDED
        except Exception as e:
            logger.error(e)
            status = Status.FAILED
        finally:
            clean_local_download_dir(local_work_path)
        
        return status

    def delete_object(self, bucket, key):
        return self._s3_client.delete_object(Bucket=bucket, Key=key) 

    def is_exists_bucket(self, bucket: str):
        """The head method detects whether the bucket exists."""
        return self._s3_client.head_bucket(Bucket=bucket)
    
    def get_bucket_location(self, bucket: str) -> str:
        return self._s3_client.get_bucket_location(Bucket=bucket).get('LocationConstraint')
    
    def get_bucket_arn_from_name(self, bucket: str):
        """Obtain bucket arn by bucket name."""
        region = self.get_bucket_location(bucket=bucket)
        if not region:
            region = 'us-east-1'
        partition = self.conn.get_partition_from_region(region)
        return f'arn:{partition}:s3:::{bucket}'
    
    def get_bucket_notification(self, bucket: str, exclusive: dict = {}) -> dict:
        """If notifications are not enabled on the bucket, the action returns an empty NotificationConfiguration element.

        :param bucket (str): The name of the bucket for which to get the notification configuration.
        :param filter (dict, optional): Notification Id that needs to be filtered out, EventBridge notifications 
            are not processed. Defaults to {}.

        Returns:
            dict: The notification configuration of a bucket
        """
        notifications =self._s3_client.get_bucket_notification_configuration(Bucket=bucket)
        notifications.pop('ResponseMetadata', None)
        
        if not exclusive:
            return notifications
    
        for event_type, notification_ids in exclusive.items():
            if event_type == 'EventBridgeConfiguration':
                continue
            new_configuration = []
            for configuration in notifications.get(event_type, []):
                if configuration['Id'] not in notification_ids:
                    new_configuration.append(configuration)
            notifications[event_type] = new_configuration
        return notifications
    
    def update_bucket_notification(self, bucket: str, prefix: str, notification_id: str, queue_arn: str, tries: int = 3) -> dict:
        """Using this API, you can create or replace an existing queue's notification configuration.

        :param bucket (str): The name of the bucket for which to get the notification configuration.
        :param prefix (str): The value that the filter searches for in object key names.
        :param notification_id (str): An unique identifier for configurations in a notification configuration.
        :param queue_arn (str): The Amazon Resource Name (ARN) of the Amazon SQS queue to which Amazon S3 publishes 
            a message when it detects events of the specified type.
        :param tries (int): The maximum number of attempts. default: -1 (infinite).

        Returns:
            dict: response
        """
        tries = 1 if tries == 0 else tries
        exception = None
        
        while tries:
            notification_configuration = self.get_bucket_notification(bucket=bucket, exclusive={'QueueConfigurations': [notification_id]})
            
            new_queue_notification_configuration = {
                'Id': notification_id,
                'QueueArn': queue_arn,
                'Events': ['s3:ObjectCreated:*'],
                'Filter': {
                    'Key': {
                        'FilterRules': [{
                            'Name': 'prefix',
                            'Value': prefix
                            }]
                        }
                    }
                }
            queue_configurations = notification_configuration.get('QueueConfigurations', [])
            queue_configurations.append(new_queue_notification_configuration)
            notification_configuration['QueueConfigurations'] = queue_configurations
            
            try:
                self._s3_client.put_bucket_notification_configuration(Bucket=bucket, NotificationConfiguration=notification_configuration)
            except Exception as e:
                exception = e
                logger.warning(e)
                
            if notification_id in [ configuration['Id'] for configuration in self.get_bucket_notification(bucket=bucket).get('QueueConfigurations', [])]:
                logger.info(f'New configuration already exists in Notifications, continuing.')
                exception = None
                break
            
            delay = random.uniform(0.0, 3.0)
            logger.warning(f'New configuration does not exists in Notifications, retrying in {format(delay, ".3f")} seconds...')
            time.sleep(delay)
            tries -= 1
        
        if exception is not None:
            raise exception
            
        return self.get_bucket_notification(bucket=bucket)
    
    def delete_bucket_notification(self, bucket: str, notification_id: str, tries: int = 3) -> dict:
        """Using this API, you can delete an existing queue's notification configuration.

        :param bucket (str): The name of the bucket for which to get the notification configuration.
        :param notification_id (str): An unique identifier for configurations in a notification configuration.
        :param tries (int): The maximum number of attempts. default: -1 (infinite).

        Returns:
            dict: response
        """
        tries = 1 if tries == 0 else tries
        exception = None
        
        while tries:
            notification_configuration = self.get_bucket_notification(bucket=bucket, exclusive={'QueueConfigurations': [notification_id]})
            
            try:
                self._s3_client.put_bucket_notification_configuration(Bucket=bucket, NotificationConfiguration=notification_configuration)
            except Exception as e:
                exception = e
                logger.warning(e)
                
            if notification_id not in [ configuration['Id'] for configuration in self.get_bucket_notification(bucket=bucket).get('QueueConfigurations', [])]:
                logger.info(f'Configuration no longer exists in Notifications, continuing.')
                exception = None
                break
            
            delay = random.uniform(0.0, 3.0)
            logger.warning(f'Configuration still exists in Notifications, retrying in {format(delay, ".3f")} seconds...')
            time.sleep(delay)
            tries -= 1
        
        if exception is not None:
            raise exception
        
        return self.get_bucket_notification(bucket=bucket)
    
    def get_bucket_policy(self, bucket: str, sid: Union[str, None] = None, exclusive: list[str] = []) -> dict:
        """Using this API, you can get the policy of a specified bucket.

        :param bucket (str): The name of the bucket for which to get the notification configuration.
        :param exclusive (dict, optional): Policy Sid that needs to be filtered out. Defaults to [].

        Returns:
            dict: The policy of a bucket.
        """
        bucket_policy_resp = {'Policy': '{"Version": "2012-10-17", "Statement": []}'}
        try:
            bucket_policy_resp = self._s3_client.get_bucket_policy(Bucket=bucket)
        except Exception as e:
            logger.warning(e)

        bucket_policy = json.loads(bucket_policy_resp['Policy'])
        
        if sid is None and not exclusive:
            return bucket_policy
        
        new_statement = []

        for statement in bucket_policy['Statement']:
            if sid is not None and statement.get('Sid') == sid:
                new_statement = [statement]
                break
            elif sid is None and statement.get('Sid') not in exclusive:
                new_statement.append(statement)
        bucket_policy['Statement'] = new_statement
        return bucket_policy
    
    def update_bucket_policy(self, bucket: str, sid: str, policy_document: dict, tries: int = 3) -> dict:
        """Using this API, you can create or replace policy in a specified bucket.

        :param bucket (str): The name of the bucket for which to get the notification configuration.
        :param sid (str): An unique identifier for document in a policy.
        :param policy_document (dict): The JSON policy document that you want to use as the content for the new policy.
        :param tries (int): The maximum number of attempts. default: -1 (infinite).
        
        Returns:
            dict: response
        """
        tries = 1 if tries == 0 else tries
        exception = None
        
        policy_document['Sid'] = sid
        
        while tries:
            bucket_policy = self.get_bucket_policy(bucket=bucket, exclusive=[sid])
            bucket_policy['Statement'].append(policy_document)
            
            try:
                self._s3_client.put_bucket_policy(Bucket=bucket, Policy=json.dumps(bucket_policy))
            except Exception as e:
                exception = e
                logger.warning(e)
                
            if self.get_bucket_policy(bucket=bucket, sid=sid)['Statement']:
                logger.info(f'New Statement already exists in Bucket Policy Document, continuing.')
                exception = None
                break
            
            delay = random.uniform(0.0, 3.0)
            logger.warning(f'New Statement does not exists in Bucket Policy Document, retrying in {format(delay, ".3f")} seconds...')
            time.sleep(delay)
            tries -= 1
        
        if exception is not None:
            raise exception
        
        return self.get_bucket_policy(bucket=bucket)
    
    def delete_bucket_policy(self, bucket: str, sid: str, tries: int = 3) -> dict:
        """Using this API, you can delete a policy document in a specified bucket.
           If the statement is empty after deleting the sid, delete the entire policy, 
           if it is not empty, keep the remaining policy.

        :param bucket (str): The name of the bucket for which to get the notification configuration.
        :param sid (str): An unique identifier for document in a policy.
        :param tries (int): The maximum number of attempts. default: 3, -1 (infinite).
        
        Returns:
            dict: response
        """
        tries = 1 if tries == 0 else tries
        exception = None
        
        while tries:
            bucket_policy = self.get_bucket_policy(bucket=bucket, exclusive=[sid])
            
            try:
                if not bucket_policy['Statement']:
                    self._s3_client.delete_bucket_policy(Bucket=bucket)
                else:
                    self._s3_client.put_bucket_policy(Bucket=bucket, Policy=json.dumps(bucket_policy))
            except Exception as e:
                exception = e
                logger.warning(e)
            
            if not self.get_bucket_policy(bucket=bucket, sid=sid)['Statement']:
                logger.info(f'Statement no longer exists in Bucket Policy Document, continuing.')
                exception = None
                break
        
            delay = random.uniform(0.0, 3.0)
            logger.warning(f'Statement still exists in Bucket Policy Document, retrying in {format(delay, ".3f")} seconds...')
            time.sleep(delay)
            tries -= 1
        
        if exception is not None:
            raise exception
            
        return self.get_bucket_policy(bucket=bucket)

    def put_bucket_policy_for_alb(self, bucket: str, prefix: str, sid: str) -> dict:
        log_delivery_regions = ('ap-south-2', 'ap-southeast-4', 'ca-west-1', 'eu-south-2', 'eu-central-2', 'il-central-1', 'me-central-1')

        bucket_location = self.get_bucket_location(bucket=bucket)
        bucket_arn = self.get_bucket_arn_from_name(bucket=bucket)
        policy_document = {
            'Effect': 'Allow',
            'Principal': {},
            'Action': [
                's3:PutObject',
                's3:PutObjectTagging',
            ],
            'Resource': f'{bucket_arn}/{prefix}*'
            }
        
        if bucket_location in log_delivery_regions:
            policy_document['Principal']['Service'] = 'logdelivery.elasticloadbalancing.amazonaws.com'
        else:
            elb_account_arn = ALB_LOGGING_ACCOUNT_MAPPING.get(bucket_location) or ALB_LOGGING_ACCOUNT_MAPPING[None]
            policy_document['Principal']['AWS'] = elb_account_arn
            
        return self.update_bucket_policy(bucket=bucket, sid=sid, policy_document=policy_document)
