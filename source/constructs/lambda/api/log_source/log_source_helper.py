# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import uuid
import logging
import sys

from datetime import datetime
from abc import ABC, abstractmethod

logger = logging.getLogger()
logger.setLevel(logging.INFO)


class APIException(Exception):
    def __init__(self, message):
        self.message = message


class AppLogSourceType(ABC):
    """An abstract class represents one type of Log Source.

    Create a class for each Log source with implementations of
     `create_log_source`, `delete_log_source`, `list_log_sources` and `update_log_source`.
    """

    @abstractmethod
    def create_log_source(self):
        """Create a Log Source"""
        pass

    @abstractmethod
    def delete_log_source(self):
        """Delete a Log Source"""
        pass

    @abstractmethod
    def list_log_sources(self):
        """List Log Sources"""
        pass

    @abstractmethod
    def update_log_source(self):
        """Update a Log Source"""
        pass

    @abstractmethod
    def get_log_source(self):
        """Get a Log Source"""
        pass


class EC2(AppLogSourceType):
    """An implementation of AppLogSourceType for EC2"""

    def __init__(self, args, log_source_table):
        self.args = args
        self.log_source_table = log_source_table

    def create_log_source(self):
        # TODO: Add this implementation
        pass

    def delete_log_source(self):
        # TODO: Add this implementation
        pass

    def list_log_sources(self):
        # TODO: Add this implementation
        pass

    def update_log_source(self):
        # TODO: Add this implementation
        pass

    def get_log_source(self):
        # TODO: Add this implementation
        pass


class S3(AppLogSourceType):
    """An implementation of AppLogSourceType for S3"""

    def __init__(self, args, log_source_table):
        self.args = args
        self.log_source_table = log_source_table

    def create_log_source(self):
        logger.info('Create a logSource')

        id = str(uuid.uuid4())
        self.log_source_table.put_item(
            Item={
                'id': id,
                's3Name': self.args['s3Name'],
                's3Prefix': self.args['s3Prefix'],
                'createdDt': datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%SZ'),
                # 'accountId': self.args['accountId'],
                'sourceType': 'S3',
                'region': self.args['region'],
                'archiveFormat': self.args['archiveFormat'],
                'tags': self.args.get('tags', []),
                'status': 'ACTIVE',
            }
        )
        return id

    def delete_log_source(self):
        logger.info('Delete Log Source Status in DynamoDB')
        resp = self.log_source_table.get_item(Key={'id': self.args["id"]})
        if 'Item' not in resp:
            raise APIException('Log Source Not Found')

        self.log_source_table.update_item(
            Key={'id': self.args["id"]},
            UpdateExpression='SET #status = :s, #updatedDt= :uDt',
            ExpressionAttributeNames={
                '#status': 'status',
                '#updatedDt': 'updatedDt'
            },
            ExpressionAttributeValues={
                ':s': 'INACTIVE',
                ':uDt': datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%SZ')
            }
        )

    def list_log_sources(self):
        # TODO: Add this implementation
        pass

    def update_log_source(self):
        # TODO: Add this implementation
        pass

    def get_log_source(self):
        response = self.log_source_table.get_item(Key={'id': self.args["id"]})
        if 'Item' not in response:
            raise APIException('App Source record Not Found')
        result = response['Item']
        result['s3Source'] = {
            "s3Name": response['Item']['s3Name'],
            "s3Prefix": response['Item']['s3Prefix'],
            "archiveFormat": response['Item']['archiveFormat']
        }
        return result


class EKSCluster(AppLogSourceType):
    """An implementation of AppLogSourceType for EKSCluster"""

    def __init__(self, args, log_source_table):
        self.args = args
        self.log_source_table = log_source_table

    def create_log_source(self):
        # TODO: Add this implementation
        pass

    def delete_log_source(self):
        # TODO: Add this implementation
        pass

    def list_log_sources(self):
        # TODO: Add this implementation
        pass

    def update_log_source(self):
        # TODO: Add this implementation
        pass

    def get_log_source(self):
        # TODO: Add this implementation
        pass


class LogSourceHelper:
    """A wrapper class that handles all types of App Log Source"""

    def __init__(self, source_type: str, args, log_source_table) -> None:
        # try to find a mapping class
        if source := getattr(sys.modules[__name__], source_type, None):
            self._source = source(args, log_source_table)
        else:
            raise RuntimeError(f"Unknown Type {source_type}")

    def create_log_source(self):
        return self._source.create_log_source()

    def delete_log_source(self):
        return self._source.delete_log_source()

    def list_log_sources(self):
        return self._source.list_log_sources()

    def update_log_source(self):
        return self._source.update_log_source()

    def get_log_source(self):
        return self._source.get_log_source()
