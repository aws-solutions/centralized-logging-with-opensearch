# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0


import os
import gzip
import time
import json
import uuid
import shutil
import random
from pathlib import Path
from typing import Union, Iterator, Callable, TextIO
from binaryornot.check import is_binary
from utils import fleep
from utils.aws.commonlib import AWSConnection
from utils.logger import logger


class S3Client:
    """S3 Client, used to interact with S3"""

    def __init__(self, sts_role_arn=''):
        self.conn = AWSConnection()
        self._s3_client = self.conn.get_client("s3", sts_role_arn=sts_role_arn)

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

    def batch_copy_objects(self, tasks: list[dict], delete_on_success: bool = False, enrich_func: Union[Callable, None] = None, enrich_plugins: set = set()) -> None:
        """Batch copy S3 files to another Bucket or prefix. When replication fails, there is no need to retry,
           just retry the next batch.

        :param tasks: Copy the task list, e.g. [{'source': {'bucket': 'stagingbucket', 'key': 'AWSLogs/apigateway1.gz'},
            'destination': {'bucket': 'stagingbucket', 'key': 'archive/centralized/aws_apigateway_logs_gz/apigateway1.gz'}}]
        :param delete_on_success: When the value is True, the source file will be deleted after the copy is completed;
            when the value is False, the source file will not be deleted after the copy is completed.
        :return: None
        """
        logger.info(f'Batch copy tasks are received, and the number of tasks is {len(tasks)}.')
        succeed_task_count = 0
        failed_task_count = 0
        local_work_path = self._make_local_work_dir()
        for task in tasks:
            local_file_uid = str(uuid.uuid4())
            local_download_filename = local_work_path / 'download' / local_file_uid
            local_output_filename = local_download_filename
            try:
                source = task['source']
                destination = task['destination']
                logger.debug(f'Copying object, src: {json.dumps(source)}, dst: {json.dumps(destination)}.')
                
                s3_source_client = self.conn.get_client("s3", sts_role_arn=source.get('role', ''))
                s3_source_client.download_file(Bucket=source['bucket'], Key=source['key'], Filename=local_download_filename.as_posix())
                if enrich_func is not None:
                    local_output_filename = self._enrichment(input_file_path=local_download_filename, 
                                                             output_file_path=local_work_path / 'output' / local_file_uid, 
                                                             enrich_func=enrich_func,
                                                             enrich_plugins=enrich_plugins)
                self._s3_client.upload_file(Filename=local_output_filename.as_posix(), Bucket=destination['bucket'], Key=destination['key'])

                succeed_task_count += 1
                if delete_on_success is True:
                    self.delete_object(bucket=source['bucket'], key=source['key'])
            except Exception as e:
                logger.error(f'{e}, the task is {task}.')
                failed_task_count += 1
            
            self._delete_local_file(path=local_download_filename)
            self._delete_local_file(path=local_output_filename)

        self._clean_local_download_dir(path=local_work_path)
        logger.info(f'Batch copy task completed, Succeed: {succeed_task_count}, Failed: {failed_task_count}.')

    def batch_download_files(self, tasks: list[dict], local_download_dir: Path) -> Path:
        """Download S3 files in batches to the local directory. When the download fails, there is no need to retry,
           and the next batch can be retried.

        :param tasks: Download the task list, e.g. [{'source': {'bucket': 'stagingbucket', 'key': 'AWSLogs/apigateway1.gz'}, 
            'destination': {'bucket': 'stagingbucket', 'key': 'archive/centralized/aws_apigateway_logs_gz/apigateway1.gz'}}]
        :param local_download_dir: Local directory, all S3 files of the same batch will be downloaded to this directory.
        :return: The last file path downloaded to the local, used to determine the file format later.
        """
        logger.info(f'Batch download tasks are received, and the number of tasks is {len(tasks)}.')
        succeed_task_count = 0
        failed_task_count = 0

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
        logger.info(f'Batch download task completed, Succeed: {succeed_task_count}, Failed: {failed_task_count}.')
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
    
    @staticmethod
    def _file_reader(path, extension: str = 'text') -> Union[gzip.GzipFile, TextIO]:
        if extension == 'gz':
            return gzip.open(path, 'rt')
        else:
            return open(path, 'r')
        
    @staticmethod
    def _file_writer(path, extension: str = 'text') -> Union[gzip.GzipFile, TextIO]:
        if extension == 'gz':
            return gzip.open(path, 'wt')
        else:
            return open(path, 'w')
        
    def _enrichment(self, input_file_path: Path, output_file_path: Path, enrich_func: Callable, enrich_plugins: set = set()) -> Path:
        """Enrich data.

        :param input_file_path: The File input path.
        :param output_file_path: The file output path.
        :param enrich_func: A callable function for data enrichment.
        :param enrich_plugins: A tuple of enrich plugins.
        
        :return: output_file_path
        """

        if input_file_path.exists() is False:
            logger.warning(f'The file: {input_file_path} is not exists, continuing.')
            return input_file_path
        
        extension = self._detect_file_extension_by_header(input_file_path)
        if extension not in ('gz', 'text'):
            logger.error('Unsupported file extension, only gz, text is supported.')
            return input_file_path
        
        output_file_object = self._file_writer(output_file_path, extension=extension) 
        for record in self._file_reader(input_file_path.as_posix(), extension=extension):
            output_file_object.write(enrich_func(record=record, enrich_plugins=enrich_plugins))
        output_file_object.close()
        
        if os.path.exists(output_file_path) and os.path.getsize(output_file_path) > 0:
            return output_file_path
        else:
            return input_file_path
            
    @staticmethod
    def _delete_local_file(path: Path) -> None:
        """Delete a local file.

        :param path: The file path.
        """

        if os.path.exists(path.as_posix()):
            os.remove(path.as_posix())

    @staticmethod
    def _make_local_work_dir(path: Path = Path('/tmp')) -> Path:
        """Create a local working directory for the file merging operation, randomly generate a unique directory
           through uuid, create a download directory in it to download the original files that need to be merged,
           and create an output directory to store the merged files.

        :param path: The parent directory of the working directory, the default is /tmp.
        :return: return a unique working directory, e.g. /tmp/{uuid}.
        """

        local_work_path = path / str(uuid.uuid4())
        local_work_path.mkdir(parents=True, exist_ok=True)
        local_download_dir = local_work_path / 'download'
        local_download_dir.mkdir(parents=True, exist_ok=True)
        local_output_path = local_work_path / 'output'
        local_output_path.mkdir(parents=True, exist_ok=True)
        return local_work_path

    @staticmethod
    def _clean_local_download_dir(path: Path) -> None:
        """Clean up all files in the local directory.

        :param path: directory to clean
        :return: None
        """
        shutil.rmtree(path.as_posix())
        logger.info(f'The local directory {path} is cleaned up')

    @staticmethod
    def _detect_file_extension_by_header(file_path: Path) -> str:
        """Detect file extension, If the file is a binary file, check the file header to determine the file extension,
           otherwise return the text file extension.

        :param file_path: local file path.
        :return: file extension, such parquet, gz or text.
        """
        if is_binary(file_path.as_posix()) is True:
            logger.debug(f'The file object {file_path} is a Binary file. parse file type through file head.')
            with file_path.open('rb') as fd:
                file_info = fleep.get(fd.read(128))
            extension = file_info.extension[0]
            logger.info(f'The file object {file_path} is a {extension} file.')
            return extension
        else:
            logger.info(f'The file object {file_path} is a Text file.')
            return 'text'

    @staticmethod
    def _extension_to_merge_func(extension) -> Callable: 
        """A function that maps files to file merging through file extensions. Currently, only parquet, gzip,
           and text are supported, and exceptions are returned for unsupported types.

        :return: returns a merge function
        """
        from utils.filemerge import merge_parquets, merge_text, merge_gzip
        
        if extension not in ('parquet', 'gz', 'text'):
            raise ValueError('Unsupported file extension, only parquet, gz, text is supported.')
        extension_merge_function_mapping = {
            "parquet": merge_parquets,
            "gz": merge_gzip,
            "text": merge_text
        }
        return extension_merge_function_mapping[extension]

    def merge_objects(self, tasks: list[dict], delete_on_success: bool = False, max_size: int = 2 ** 10) -> None:
        """S3 object merge function, download all S3 files to the local, detect the file type and merge 
           into one file, currently only supports text, gzip, parquet file types.

        :param tasks (list[dict]): The list of files that need to be merged, e.g. [{'source': {'bucket': 'stagingbucket', 'key': 'AWSLogs/123456789012/alb1.log'}} ...]
            When merging files, take the first source.key in the list as the key for uploading back to s3.
        :param delete_on_success (bool, optional): Whether to delete the original objects after the file merge is completed. Defaults to False.
            When delete_on_success is True, delete the original object only if the file merge is successful.
            When delete_on_success is False, do not delete original object.
        """
        if tasks:
            if len(tasks) == 1:
                logger.info('Only one task in data, degenerates into a s3 copy operation.')
                return self.batch_copy_objects(tasks, delete_on_success)
            destination = tasks[0]['destination']
            logger.info(
                f'Get the first task\' destination as the merge file\' s3 path, the destination is {destination}.')
        else:
            logger.info('No task in data, do not need to start subtasks.')
            return

        local_work_path = self._make_local_work_dir()
        local_download_dir = local_work_path / 'download'
        local_merged_path =  local_work_path / f"output/{os.path.basename(destination['key'])}"

        last_file_name = self.batch_download_files(tasks, local_download_dir)

        merge_is_succeeded = False
        try:
            extension = self._detect_file_extension_by_header(last_file_name)
            merge_function = self._extension_to_merge_func(extension)

            logger.info(
                f'Starting merge all of {extension} files in {local_download_dir}, output to {local_merged_path}.')
            merge_function(local_download_dir, local_merged_path, max_size=max_size)
            logger.info(f'Merge task is completed, uploading {local_merged_path} to s3 {destination}.')
            self._s3_client.upload_file(local_merged_path.as_posix(), Bucket=destination['bucket'], Key=destination['key']) 
            logger.info('S3 file uploaded successfully.')
            merge_is_succeeded = True
            if merge_is_succeeded is True and delete_on_success is True:
                self.batch_delete_objects(tasks)
        except Exception as e:
            logger.error(e)
        finally:
            self._clean_local_download_dir(local_work_path)

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
        alb_logging_account_mapping = {
            None: 'arn:aws:iam::127311923021:root',
            'us-east-1': 'arn:aws:iam::127311923021:root',
            'us-east-2': 'arn:aws:iam::033677994240:root',
            'us-west-1': 'arn:aws:iam::027434742980:root',
            'us-west-2': 'arn:aws:iam::797873946194:root',
            'af-south-1': 'arn:aws:iam::098369216593:root',
            'ca-central-1': 'arn:aws:iam::985666609251:root',
            'eu-central-1': 'arn:aws:iam::054676820928:root',
            'eu-west-1': 'arn:aws:iam::156460612806:root',
            'eu-west-2': 'arn:aws:iam::652711504416:root',
            'eu-south-1': 'arn:aws:iam::635631232127:root',
            'eu-west-3': 'arn:aws:iam::009996457667:root',
            'eu-north-1': 'arn:aws:iam::897822967062:root',
            'ap-east-1': 'arn:aws:iam::754344448648:root',
            'ap-northeast-1': 'arn:aws:iam::582318560864:root',
            'ap-northeast-2': 'arn:aws:iam::600734575887:root',
            'ap-northeast-3': 'arn:aws:iam::383597477331:root',
            'ap-southeast-1': 'arn:aws:iam::114774131450:root',
            'ap-southeast-2': 'arn:aws:iam::783225319266:root',
            'ap-southeast-3': 'arn:aws:iam::589379963580:root',
            'ap-south-1': 'arn:aws:iam::718504428378:root',
            'me-south-1': 'arn:aws:iam::076674570225:root',
            'sa-east-1': 'arn:aws:iam::507241528517:root',
            'cn-north-1': 'arn:aws-cn:iam::638102146993:root',
            'cn-northwest-1': 'arn:aws-cn:iam::037604701340:root'
        }
        bucket_location = self.get_bucket_location(bucket=bucket)
        bucket_arn = self.get_bucket_arn_from_name(bucket=bucket)
        elb_account_arn = alb_logging_account_mapping[bucket_location]
        policy_document = {
            'Effect': 'Allow',
            'Principal': {
                'AWS': elb_account_arn
            },
            'Action': [
                's3:PutObject',
                's3:PutObjectTagging',
            ],
            'Resource': f'{bucket_arn}/{prefix}*'
            }
        return self.update_bucket_policy(bucket=bucket, sid=sid, policy_document=policy_document)
