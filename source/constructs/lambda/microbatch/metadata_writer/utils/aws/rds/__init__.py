# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

from typing import Union
from datetime import datetime
from utils.helpers import logger, AWSConnection


class RDSClient:
    """Amazon RDS Client, used to interact with Amazon RDS."""

    def __init__(self, sts_role_arn=''):
        self.conn = AWSConnection()
        self._rds_client = self.conn.get_client("rds", sts_role_arn=sts_role_arn)
    
    def describe_db_cluster(self, db_cluster_identifier: str) -> dict:
        """Using this API, you can describes existing Amazon Aurora DB clusters and Multi-AZ DB clusters. This API supports pagination.
        
        @see https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/rds/client/describe_db_clusters.html

        :param db_cluster_identifier (str): The user-supplied DB cluster identifier or the Amazon Resource Name (ARN) of the DB cluster.

        Returns:
            dict: Contains the result of a successful invocation of the DescribeDBClusters action.
        """
        response = dict()
        try:
            db_cluster_info = self._rds_client.describe_db_clusters(DBClusterIdentifier=db_cluster_identifier)
            if db_cluster_info['DBClusters']:
                response = db_cluster_info['DBClusters'][0]
        except Exception as e:
            logger.warning(f'Error while describe DB Clusters: {e}')
        return response
    
    def describe_db_instance(self, db_instance_identifier: str) -> dict:
        """Using this API, you can describes existing Amazon Aurora DB Instance. 
        
        @see https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/rds/client/describe_db_instances.html

        :param db_instance_identifier (str): The user-supplied instance identifier or the Amazon Resource Name (ARN) of the DB instance.

        Returns:
            dict: Contains the result of a successful invocation of the DescribeDBInstances action.
        """
        response = dict()
        try:
            db_instance_info = self._rds_client.describe_db_instances(DBInstanceIdentifier=db_instance_identifier)
            if db_instance_info['DBInstances']:
                response = db_instance_info['DBInstances'][0]
        except Exception as e:
            logger.warning(f'Error while describe DB Instance: {e}')
        return response
    
    def describe_db_log_files(self, db_instance_identifier: str, filename_contains: str = '', file_last_written: int = int((datetime.now().timestamp() - 300) * 1000)) -> dict:
        """Using this API, you can get a list of DB log files for the DB instance.
        
        @see https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/rds/client/describe_db_log_files.html

        :param db_instance_identifier (str): The customer-assigned name of the DB instance that contains the log files you want to list.
        :param filename_contains (str, optional): Filters the available log files for log file names that contain the specified string.
        :param file_last_written (int, optional): Filters the available log files for files written since the specified date, in POSIX timestamp format with milliseconds. Defaults to 5 minutes ago.

        Returns:
            dict: The response from a call to DescribeDBLogFiles.
        """
        kwargs = dict(
            DBInstanceIdentifier=db_instance_identifier,
            FileLastWritten=file_last_written,
        )
        if filename_contains:
            kwargs['FilenameContains'] = filename_contains
        
        response = dict(Marker='', DescribeDBLogFiles=[])
        try:
            paginator = self._rds_client.get_paginator("describe_db_log_files")
            for page_iterator in paginator.paginate(**kwargs):
                response['Marker'] = page_iterator.get('Marker', '')
                response['DescribeDBLogFiles'].extend(page_iterator['DescribeDBLogFiles']) # type: ignore
        except Exception as e:
            logger.warning(f'Error while describe DB Log Files: {e}')
        return response
    
    def download_db_log_file_portion(self, db_instance_identifier: str, log_file_name: str, marker: Union[str, None] = None) -> dict:
        """Using this API, you can downloads all or a portion of the specified log file, up to 1 MB in size..
        
        @see https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/rds/client/download_db_log_file_portion.html

        :param db_instance_identifier (str): The customer-assigned name of the DB instance that contains the log files you want to list.
        :param log_file_name (str): The name of the log file to be downloaded.
        :param marker (str, optional): The pagination token provided in the previous request or “0”. If the Marker parameter is specified the response includes only records beyond the marker until the end of the file or up to NumberOfLines.

        Returns:
            dict: This data type is used as a response element to DownloadDBLogFilePortion
        """
        kwargs = dict(
            DBInstanceIdentifier=db_instance_identifier,
            LogFileName=log_file_name,
        )
        if marker:
            kwargs['Marker'] = marker
        
        response = dict(Marker='', LogFileData='', AdditionalDataPending=False)
        try:
            paginator = self._rds_client.get_paginator("download_db_log_file_portion")
            for page_iterator in paginator.paginate(**kwargs):
                response['Marker'] = page_iterator.get('Marker', '')
                response['LogFileData'] += page_iterator['LogFileData']
                response['AdditionalDataPending'] = page_iterator.get('AdditionalDataPending', False)
        except Exception as e:
            logger.warning(f'Error while download DB Log File Portion: {e}')
        return response
    
    def describe_db_instance_log_files(self, db_instance_identifier: str, filename_contains_set: set = set(), file_last_written: int = int((datetime.now().timestamp() - 300) * 1000)) -> dict:
        """Using this API, you can get a list of DB log files for the DB Instance.
        
        :param db_instance_identifier (str): The user-supplied DB instance identifier or the Amazon Resource Name (ARN) of the DB instance.
        :param filename_contains_set (set): Filters the available log files for log file names that contain the specified string, default: set().
        :param file_last_written (int, optional): Filters the available log files for files written since the specified date, in POSIX timestamp format with milliseconds. Defaults to 5 minutes ago.

        Returns:
            dict: The response from a call to DescribeDBLogFiles.
        """
        db_instance_log_files = dict()
        
        if filename_contains_set:
            for filename_contains in filename_contains_set:
                log_files = self.describe_db_log_files(db_instance_identifier=db_instance_identifier, filename_contains=filename_contains, file_last_written=file_last_written)
                for log_file in log_files['DescribeDBLogFiles']:
                    db_instance_log_files[log_file['LogFileName']] = log_file
        else:
            log_files = self.describe_db_log_files(db_instance_identifier=db_instance_identifier, file_last_written=file_last_written)
            for log_file in log_files['DescribeDBLogFiles']:
                db_instance_log_files[log_file['LogFileName']] = log_file
        
        return db_instance_log_files

