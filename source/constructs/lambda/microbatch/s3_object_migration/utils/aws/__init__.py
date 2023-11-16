# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import types
from urllib.parse import urlparse
from typing import Union
from .athena import AthenaClient
from .dynamodb import DynamoDBUtil
from .glue import GlueClient
from .iam import IAMClient
from .s3 import S3Client
from .scheduler import SchedulerClient
from .ses import SESClient
from .sns import SNSClient
from .sqs import SQSClient
from .stepfunction import SFNClient
from .events import EventsClient


__all__ = ['ValidateParameters', 'AthenaClient', 'DynamoDBUtil', 'GlueClient', 'IAMClient', 
           'S3Client', 'SchedulerClient', 'SESClient', 'SNSClient', 'SQSClient', 'SFNClient', 
           'EventsClient']

class ValidateParameters:
    """This class is used to parse ,validate and store all incoming parameters.
    
       !!!Case sensitive!!!
    """
    def __init__(self, parameters: dict) -> None:
        if not isinstance(parameters, dict):
            raise ValueError(f'The parameters is not a dict, parameters: {parameters}.')
        self._required_parameter_check(parameters)
        self._optional_parameter_check(parameters)
    
    def _child_parameter_lookup_check(self, parameters: Union[dict, list[dict]], keys: tuple, path: Union[str, None] = None) -> None:
        path = f'{path}.' if path else ''
        
        if isinstance(parameters, dict):
            for required_param in keys:
                if not parameters.get(required_param):
                    raise ValueError(f'Missing value for {path}{required_param}.')
        elif isinstance(parameters, list):
            for parameter in parameters:
                self._child_parameter_lookup_check(parameter, keys=keys, path=path)
        else:
            raise TypeError('The parameter is not a dict or list.')

    def _required_parameter_check(self, parameters) -> None:
        """Reserved method to handle required parameters."""
        pass
    
    def _optional_parameter_check(self, parameters) -> None:
        """Reserved method for handling optional parameters."""
        pass

    @staticmethod
    def _init_name_space(kwargs: dict = {}) -> types.SimpleNamespace:
        return types.SimpleNamespace(**kwargs)
    
    @staticmethod
    def _get_bucket_name(url: str) -> str:
        """Parse the bucket name.
        
        :param url: bucket url, such as s3://stagingbucket/AWSLogs/123456789012
        :return: prefix, such as stagingbucket
        """
        return urlparse(url).netloc

    @staticmethod
    def _get_bucket_prefix(url: str) -> str:
        """Parse the prefix, remove the / at the end.
        
        :param url: bucket url, such as s3://stagingbucket/AWSLogs/123456789012
        :return: prefix, such as AWSLogs/123456789012
        """
        prefix = urlparse(url).path[1:]
        return prefix if prefix[-1] != '/' else prefix[:-1]

    def _get_bucket_object_from_uri(self, url: str) -> types.SimpleNamespace:
        """Generate the object of bucekt url, you can access buceket_name through object.bucket, and access prefix through object.prefix.
        
        :param url: bucket url, such as s3://stagingbucket/AWSLogs/123456789012
        :return: object
        """
        ns = self._init_name_space()
        ns.bucket = self._get_bucket_name(url)
        ns.prefix = self._get_bucket_prefix(url)
        return ns
    
    @staticmethod
    def _get_parameter_value(value: Union[bool, dict, list, str, int],
                             class_info: Union[type, tuple[type, ...]], default):
        """Check whether the input value type is legal, if not, return the default value."""
        if isinstance(value, class_info) is True:
            return value
        else:
            return default
    
