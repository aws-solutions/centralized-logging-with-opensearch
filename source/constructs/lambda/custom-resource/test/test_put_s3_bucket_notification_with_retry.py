# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import os
import boto3
import pytest
from moto import mock_s3


@pytest.fixture
def s3_client():
    with mock_s3():
        region = os.environ.get("AWS_REGION")

        s3 = boto3.resource("s3", region_name=region)
        # Create the buckets
        default_bucket = os.environ.get("WEB_BUCKET_NAME")
        s3.create_bucket(Bucket=default_bucket)
        s3.create_bucket(Bucket=os.environ["DEFAULT_LOGGING_BUCKET"])
        s3.create_bucket(Bucket=os.environ["ACCESS_LOGGING_BUCKET"])
        yield


def test_find_notification_by_id(s3_client):
    from put_s3_bucket_notification_with_retry import find_notification_by_id
    
    notification_configuration = {
        'TopicConfigurations': [
            {
                'Id': 'topic-1',
                'TopicArn': 'string',
                'Events': [
                    's3:ObjectCreated:*',
                ],
                'Filter': {
                    'Key': {
                        'FilterRules': [
                            {
                                'Name': 'prefix',
                                'Value': 'string'
                            },
                        ]
                    }
                }
            },
        ],
        'QueueConfigurations': [
            {
                'Id': 'queue-2',
                'QueueArn': 'string',
                'Events': [
                    's3:ObjectCreated:*',
                ],
                'Filter': {
                    'Key': {
                        'FilterRules': [
                            {
                                'Name': 'prefix',
                                'Value': 'string'
                            },
                        ]
                    }
                }
            },
        ],
        'LambdaFunctionConfigurations': [
            {
                'Id': 'lambda-2',
                'LambdaFunctionArn': 'string',
                'Events': [
                    's3:ObjectCreated:*',
                ],
                'Filter': {
                    'Key': {
                        'FilterRules': [
                            {
                                'Name': 'prefix',
                                'Value': 'string'
                            },
                        ]
                    }
                }
            },
        ],
        'EventBridgeConfiguration': {}
    }
    
    assert find_notification_by_id(id='queue-2', notification_configuration=notification_configuration) == {
        'TopicConfigurations': [],
        'QueueConfigurations': [
            {
                'Id': 'queue-2',
                'QueueArn': 'string',
                'Events': [
                    's3:ObjectCreated:*',
                ],
                'Filter': {
                    'Key': {
                        'FilterRules': [
                            {
                                'Name': 'prefix',
                                'Value': 'string'
                            },
                        ]
                    }
                }
            },
            ],
        'LambdaFunctionConfigurations': [],
        'EventBridgeConfiguration': {}
    }
    
    assert find_notification_by_id(id='topic', notification_configuration=notification_configuration) == {
        'TopicConfigurations': [
            {
                'Id': 'topic-1',
                'TopicArn': 'string',
                'Events': [
                    's3:ObjectCreated:*',
                ],
                'Filter': {
                    'Key': {
                        'FilterRules': [
                            {
                                'Name': 'prefix',
                                'Value': 'string'
                            },
                        ]
                    }
                }
            },
        ],
        'QueueConfigurations': [],
        'LambdaFunctionConfigurations': [],
        'EventBridgeConfiguration': {}
    }
    
    assert find_notification_by_id(id='topic-1-2', notification_configuration=notification_configuration) == {
        'TopicConfigurations': [],
        'QueueConfigurations': [],
        'LambdaFunctionConfigurations': [],
        'EventBridgeConfiguration': {}
    }


def test_put_bucket_notification_configuration(s3_client):
    from put_s3_bucket_notification_with_retry import put_bucket_notification_configuration
    
    notification_configuration = {
        'TopicConfigurations': [
            {
                'Id': 'topic-1',
                'TopicArn': 'string',
                'Events': [
                    's3:ObjectCreated:*',
                ],
                'Filter': {
                    'Key': {
                        'FilterRules': [
                            {
                                'Name': 'prefix',
                                'Value': 'string'
                            },
                        ]
                    }
                }
            },
        ],
        'QueueConfigurations': [
            {
                'Id': 'queue-2',
                'QueueArn': 'string',
                'Events': [
                    's3:ObjectCreated:*',
                ],
                'Filter': {
                    'Key': {
                        'FilterRules': [
                            {
                                'Name': 'prefix',
                                'Value': 'string'
                            },
                        ]
                    }
                }
            },
        ],
        'LambdaFunctionConfigurations': [
            {
                'Id': 'lambda-2',
                'LambdaFunctionArn': 'string',
                'Events': [
                    's3:ObjectCreated:*',
                ],
                'Filter': {
                    'Key': {
                        'FilterRules': [
                            {
                                'Name': 'prefix',
                                'Value': 'string'
                            },
                        ]
                    }
                }
            },
        ],
        'EventBridgeConfiguration': {}
    }