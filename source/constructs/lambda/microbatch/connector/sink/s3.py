# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import string
import random
from datetime import datetime
from utils import S3Client
from utils.helpers import logger, make_local_work_dir, clean_local_download_dir, file_writer
from source.base import AbstractSource
from sink.base import Status, AbstractSink


class S3Sink(AbstractSink):
    
    def __init__(self, context: dict) -> None:
        """_summary_

        Args:
            context (dict): _description_
        """
        self.s3_client = S3Client(sts_role_arn=context.get('role', ''))
        self.bucket = context['bucket']
        self.prefix = f"{context['prefix'].strip('/')}/year={datetime.now().strftime('%Y')}/month={datetime.now().strftime('%m')}/day={datetime.now().strftime('%d')}"
        self.extension = 'gz'
    
    def process(self, source: AbstractSource) -> Status:
        """_summary_

        Yields:
            Iterator[dict]: _description_
        """
        status = Status.RUNNING
        local_work_path = make_local_work_dir()
        
        try:
            s3_object_name = f'{datetime.now().strftime("%Y-%m-%d-%H-%M-%S")}-{"".join(random.choices(string.ascii_letters + string.digits, k=8))}.gz' # NOSONAR
            output_file_path=local_work_path / s3_object_name
            
            output_file_object = file_writer(output_file_path, extension=self.extension)
            
            has_record = False
            for record in source.process():
                output_file_object.write(record) # type: ignore
                has_record = True
            output_file_object.close()
            
            if has_record is True:
                self.s3_client.upload_file(filename=output_file_path.as_posix(), bucket=self.bucket, key=f'{self.prefix}/{s3_object_name}')
                logger.info(f'Successfully uploaded object {self.bucket}/{self.prefix}/{s3_object_name}.')
            status = Status.SUCCEEDED
        except Exception as e:
            status = Status.FAILED
            logger.error(f'Failed to upload file to S3: {e}')
            
        clean_local_download_dir(local_work_path)
        return status

    @property
    def context(self) -> dict:
        """_summary_

        Returns:
            dict: _description_
        """
        return {}
