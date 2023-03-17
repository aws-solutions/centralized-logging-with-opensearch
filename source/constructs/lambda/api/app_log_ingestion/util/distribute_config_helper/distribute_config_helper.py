# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import logging
import os

import boto3
from botocore import config

logger = logging.getLogger()
logger.setLevel(logging.INFO)
solution_version = os.environ.get("SOLUTION_VERSION", "v1.0.0")
solution_id = os.environ.get("SOLUTION_ID", "SO8025")
user_agent_config = {
    "user_agent_extra": f"AwsSolution/{solution_id}/{solution_version}"
}
default_config = config.Config(**user_agent_config)
default_region = os.environ.get('AWS_REGION')


class DistributeConfigHelper:
    """
    This class will handle the agent config distribution.
    """

    def __init__(
        self,
        bucket_name="",
    ):
        self.__s3 = boto3.resource("s3",
                                   region_name=default_region,
                                   config=default_config)

    def fwrite(self, file_path, file_name, content):
        """
        Help function to write a content to a temp file.
        """
        if not os.path.exists(file_path):
            os.makedirs(file_path)
        updated_config_path = file_path + file_name
        tmp_file = open(updated_config_path, "w", encoding="utf-8")
        tmp_file.write(content)
        tmp_file.close()

    def upload_folder_to_s3(self, input_dir, s3_bucket_name, s3_path):
        """
        Upload a folder to s3, and keep the folder structure
        """
        logger.info("Uploading results to s3 initiated...")
        s3_bucket = self.__s3.Bucket(s3_bucket_name)
        try:
            for path, _, files in os.walk(input_dir):
                for file in files:
                    dest_path = path.replace(input_dir, "")
                    s3file = os.path.normpath(s3_path + "/" + dest_path + "/" +
                                              file)
                    local_file = os.path.join(path, file)
                    logger.info("Upload : %s  to Target: %s" %
                                (local_file, s3_bucket_name + "/" + s3file))
                    s3_bucket.upload_file(local_file, s3file)
        except Exception as err:
            logger.error(" Upload config file to S3 failed!")
            logger.error(err)
            raise err
