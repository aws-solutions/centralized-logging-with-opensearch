# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import json
import os

import boto3
import pytest
from moto import mock_sts, mock_wafv2


@pytest.fixture
def sts_client():
    with mock_sts():
        sts_client=boto3.client("sts", region_name="us-east-1")
        yield sts_client


@pytest.fixture
def wafv2_cf_client():
    with mock_wafv2():
        wafv2_client_cf = boto3.client("wafv2", region_name="us-east-1")
        wafv2_client_cf.create_web_acl(
            Name='mock-wafv2',
            Scope='CLOUDFRONT',
            DefaultAction={
                'Allow': {
                    'CustomRequestHandling': {
                        'InsertHeaders': [
                            {
                                'Name': 'mock-req',
                                'Value': '100'
                            },
                        ]
                    }
                }
            },

            Rules=[
                {
                    'Name': 'rule-1',
                    'Priority': 10,
                    'Statement': {
                        'ByteMatchStatement': {
                            'SearchString': 'bytes',
                            'FieldToMatch': {
                                'SingleHeader': {
                                    'Name': 'string'
                                },
                                'SingleQueryArgument': {
                                    'Name': 'string'
                                },
                                'AllQueryArguments': {}
                                ,
                                'UriPath': {}
                                ,
                                'QueryString': {}
                                ,
                                'Body': {
                                    'OversizeHandling': 'CONTINUE'
                                },
                                'Method': {}
                                ,
                                'JsonBody': {
                                    'MatchPattern': {
                                        'All': {}
                                        ,
                                        'IncludedPaths': [
                                            'string',
                                        ]
                                    },
                                    'MatchScope': 'ALL',
                                    'InvalidFallbackBehavior': 'MATCH',
                                    'OversizeHandling': 'CONTINUE'
                                },
                                'Headers': {
                                    'MatchPattern': {
                                        'All': {}
                                        ,
                                        'IncludedHeaders': [
                                            'string',
                                        ],
                                        'ExcludedHeaders': [
                                            'string',
                                        ]
                                    },
                                    'MatchScope': 'ALL',
                                    'OversizeHandling':  'NO_MATCH'
                                },
                                'Cookies': {
                                    'MatchPattern': {
                                        'All': {}
                                        ,
                                        'IncludedCookies': [
                                            'string',
                                        ],
                                        'ExcludedCookies': [
                                            'string',
                                        ]
                                    },
                                    'MatchScope': 'ALL' ,
                                    'OversizeHandling': 'CONTINUE'
                                }
                            },
                            'TextTransformations': [
                                {
                                    'Priority': 200,
                                    'Type': 'NONE'
                                },
                            ],
                            'PositionalConstraint': 'EXACTLY'
                        },


                        'LabelMatchStatement': {
                            'Scope': 'LABEL',
                            'Key': 'string'
                        },
                        'RegexMatchStatement': {
                            'RegexString': 'string',
                            'FieldToMatch': {
                                'SingleHeader': {
                                    'Name': 'string'
                                },
                                'SingleQueryArgument': {
                                    'Name': 'string'
                                },
                                'AllQueryArguments': {}
                                ,
                                'UriPath': {}
                                ,
                                'QueryString': {}
                                ,
                                'Body': {
                                    'OversizeHandling': 'CONTINUE'
                                },
                                'Method': {}
                                ,
                                'JsonBody': {
                                    'MatchPattern': {
                                        'All': {}
                                        ,
                                        'IncludedPaths': [
                                            'string',
                                        ]
                                    },
                                    'MatchScope': 'ALL',
                                    'InvalidFallbackBehavior': 'MATCH',
                                    'OversizeHandling': 'CONTINUE'
                                },
                                'Headers': {
                                    'MatchPattern': {
                                        'All': {}
                                        ,
                                        'IncludedHeaders': [
                                            'string',
                                        ],
                                        'ExcludedHeaders': [
                                            'string',
                                        ]
                                    },
                                    'MatchScope': 'ALL',
                                    'OversizeHandling': 'NO_MATCH'
                                },
                                'Cookies': {
                                    'MatchPattern': {
                                        'All': {}
                                        ,
                                        'IncludedCookies': [
                                            'string',
                                        ],
                                        'ExcludedCookies': [
                                            'string',
                                        ]
                                    },
                                    'MatchScope': 'ALL',
                                    'OversizeHandling': 'NO_MATCH'
                                }
                            },
                            'TextTransformations': [
                                {
                                    'Priority': 200,
                                    'Type': 'NONE'
                                },
                            ]
                        }
                    },
                    'Action': {
                        'Block': {
                            'CustomResponse': {
                                'ResponseCode': 200,
                                'CustomResponseBodyKey': 'string',
                                'ResponseHeaders': [
                                    {
                                        'Name': 'string',
                                        'Value': 'string'
                                    },
                                ]
                            }
                        },
                        'Allow': {
                            'CustomRequestHandling': {
                                'InsertHeaders': [
                                    {
                                        'Name': 'string',
                                        'Value': 'string'
                                    },
                                ]
                            }
                        },
                        'Count': {
                            'CustomRequestHandling': {
                                'InsertHeaders': [
                                    {
                                        'Name': 'string',
                                        'Value': 'string'
                                    },
                                ]
                            }
                        },
                        'Captcha': {
                            'CustomRequestHandling': {
                                'InsertHeaders': [
                                    {
                                        'Name': 'string',
                                        'Value': 'string'
                                    },
                                ]
                            }
                        }
                    },
                    'OverrideAction': {
                        'Count': {
                            'CustomRequestHandling': {
                                'InsertHeaders': [
                                    {
                                        'Name': 'string',
                                        'Value': 'string'
                                    },
                                ]
                            }
                        },
                        'None': {}

                    },
                    'RuleLabels': [
                        {
                            'Name': 'string'
                        },
                    ],
                    'VisibilityConfig': {
                        'SampledRequestsEnabled': True,
                        'CloudWatchMetricsEnabled': False,
                        'MetricName': 'All'
                    },
                    'CaptchaConfig': {
                        'ImmunityTimeProperty': {
                            'ImmunityTime': 60
                        }
                    }
                },
            ],
            VisibilityConfig={
                'SampledRequestsEnabled': True,
                'CloudWatchMetricsEnabled': False,
                'MetricName': 'All'

            },
        )

        yield  wafv2_client_cf

@pytest.fixture
def wafv2_regional_client():
    with mock_wafv2():
        wafv2_client_regional = boto3.client("wafv2", region_name="us-west-2")
        wafv2_client_regional.create_web_acl(
            Name='mock-wafv2',
            Scope='REGIONAL',
            DefaultAction={
                'Allow': {
                    'CustomRequestHandling': {
                        'InsertHeaders': [
                            {
                                'Name': 'mock-req',
                                'Value': '100'
                            },
                        ]
                    }
                }
            },

            Rules=[
                {
                    'Name': 'rule-1',
                    'Priority': 10,
                    'Statement': {
                        'ByteMatchStatement': {
                            'SearchString': 'bytes',
                            'FieldToMatch': {
                                'SingleHeader': {
                                    'Name': 'string'
                                },
                                'SingleQueryArgument': {
                                    'Name': 'string'
                                },
                                'AllQueryArguments': {}
                                ,
                                'UriPath': {}
                                ,
                                'QueryString': {}
                                ,
                                'Body': {
                                    'OversizeHandling': 'CONTINUE'
                                },
                                'Method': {}
                                ,
                                'JsonBody': {
                                    'MatchPattern': {
                                        'All': {}
                                        ,
                                        'IncludedPaths': [
                                            'string',
                                        ]
                                    },
                                    'MatchScope': 'ALL',
                                    'InvalidFallbackBehavior': 'MATCH',
                                    'OversizeHandling': 'CONTINUE'
                                },
                                'Headers': {
                                    'MatchPattern': {
                                        'All': {}
                                        ,
                                        'IncludedHeaders': [
                                            'string',
                                        ],
                                        'ExcludedHeaders': [
                                            'string',
                                        ]
                                    },
                                    'MatchScope': 'ALL',
                                    'OversizeHandling':  'NO_MATCH'
                                },
                                'Cookies': {
                                    'MatchPattern': {
                                        'All': {}
                                        ,
                                        'IncludedCookies': [
                                            'string',
                                        ],
                                        'ExcludedCookies': [
                                            'string',
                                        ]
                                    },
                                    'MatchScope': 'ALL' ,
                                    'OversizeHandling': 'CONTINUE'
                                }
                            },
                            'TextTransformations': [
                                {
                                    'Priority': 200,
                                    'Type': 'NONE'
                                },
                            ],
                            'PositionalConstraint': 'EXACTLY'
                        },


                        'LabelMatchStatement': {
                            'Scope': 'LABEL',
                            'Key': 'string'
                        },
                        'RegexMatchStatement': {
                            'RegexString': 'string',
                            'FieldToMatch': {
                                'SingleHeader': {
                                    'Name': 'string'
                                },
                                'SingleQueryArgument': {
                                    'Name': 'string'
                                },
                                'AllQueryArguments': {}
                                ,
                                'UriPath': {}
                                ,
                                'QueryString': {}
                                ,
                                'Body': {
                                    'OversizeHandling': 'CONTINUE'
                                },
                                'Method': {}
                                ,
                                'JsonBody': {
                                    'MatchPattern': {
                                        'All': {}
                                        ,
                                        'IncludedPaths': [
                                            'string',
                                        ]
                                    },
                                    'MatchScope': 'ALL',
                                    'InvalidFallbackBehavior': 'MATCH',
                                    'OversizeHandling': 'CONTINUE'
                                },
                                'Headers': {
                                    'MatchPattern': {
                                        'All': {}
                                        ,
                                        'IncludedHeaders': [
                                            'string',
                                        ],
                                        'ExcludedHeaders': [
                                            'string',
                                        ]
                                    },
                                    'MatchScope': 'ALL',
                                    'OversizeHandling': 'NO_MATCH'
                                },
                                'Cookies': {
                                    'MatchPattern': {
                                        'All': {}
                                        ,
                                        'IncludedCookies': [
                                            'string',
                                        ],
                                        'ExcludedCookies': [
                                            'string',
                                        ]
                                    },
                                    'MatchScope': 'ALL',
                                    'OversizeHandling': 'NO_MATCH'
                                }
                            },
                            'TextTransformations': [
                                {
                                    'Priority': 200,
                                    'Type': 'NONE'
                                },
                            ]
                        }
                    },
                    'Action': {
                        'Block': {
                            'CustomResponse': {
                                'ResponseCode': 200,
                                'CustomResponseBodyKey': 'string',
                                'ResponseHeaders': [
                                    {
                                        'Name': 'string',
                                        'Value': 'string'
                                    },
                                ]
                            }
                        },
                        'Allow': {
                            'CustomRequestHandling': {
                                'InsertHeaders': [
                                    {
                                        'Name': 'string',
                                        'Value': 'string'
                                    },
                                ]
                            }
                        },
                        'Count': {
                            'CustomRequestHandling': {
                                'InsertHeaders': [
                                    {
                                        'Name': 'string',
                                        'Value': 'string'
                                    },
                                ]
                            }
                        },
                        'Captcha': {
                            'CustomRequestHandling': {
                                'InsertHeaders': [
                                    {
                                        'Name': 'string',
                                        'Value': 'string'
                                    },
                                ]
                            }
                        }
                    },
                    'OverrideAction': {
                        'Count': {
                            'CustomRequestHandling': {
                                'InsertHeaders': [
                                    {
                                        'Name': 'string',
                                        'Value': 'string'
                                    },
                                ]
                            }
                        },
                        'None': {}

                    },
                    'RuleLabels': [
                        {
                            'Name': 'string'
                        },
                    ],
                    'VisibilityConfig': {
                        'SampledRequestsEnabled': True,
                        'CloudWatchMetricsEnabled': False,
                        'MetricName': 'All'
                    },
                    'CaptchaConfig': {
                        'ImmunityTimeProperty': {
                            'ImmunityTime': 60
                        }
                    }
                },
            ],
            VisibilityConfig={
                'SampledRequestsEnabled': True,
                'CloudWatchMetricsEnabled': False,
                'MetricName': 'All'

            },
        )

        yield wafv2_client_regional

LOAD_ERR = {
    "took": 2,
    "errors": True,
    "items": [
        {
            "index": {
                "_index": "hello-elb-2022-03-31",
                "_type": "_doc",
                "_id": None,
                "status": 400,
                "error": {
                    "type": "illegal_argument_exception",
                    "reason": "Validation Failed",
                },
            }
        },
        {
            "index": {
                "_index": "hello-elb-2022-03-31",
                "_type": "_doc",
                "_id": None,
                "status": 400,
                "error": {
                    "type": "illegal_argument_exception",
                    "reason": "Validation Failed",
                },
            }
        },
    ],
}

LOAD_SUCCESS = {
    "took": 196,
    "errors": False,
    "items": [
        {
            "index": {
                "_index": "hello-elb-2022-03-31",
                "_type": "_doc",
                "_id": "hzE-338BYaSJE47C8kGt",
                "_version": 1,
                "result": "created",
                "_shards": {"total": 2, "successful": 1, "failed": 0},
                "_seq_no": 0,
                "_primary_term": 1,
                "status": 201,
            }
        },
        {
            "index": {
                "_index": "hello-elb-2022-03-31",
                "_type": "_doc",
                "_id": "iDE-338BYaSJE47C8kGt",
                "_version": 1,
                "result": "created",
                "_shards": {"total": 2, "successful": 1, "failed": 0},
                "_seq_no": 1,
                "_primary_term": 1,
                "status": 201,
            }
        },
    ],
}

class Response:
    def __init__(self, status_code, text=""):
        self.status_code = status_code
        self.text = text

    def json(self):
        return json.loads(self.text)


load_success_resp = Response(201, json.dumps(LOAD_SUCCESS))
load_failed_resp = Response(201, json.dumps(LOAD_ERR))



@pytest.mark.parametrize(
    "resp,expected_total,expected_failed,region",
    [
        (load_success_resp, 0, 0,"us-east-1"),
        (load_failed_resp, 0, 0,"us-east-1"),
    ],
)
def test_process_log_cf(mocker,sts_client,wafv2_cf_client,resp,expected_total, expected_failed,region):
    os.environ["LOG_TYPE"] = "WAFSampled"
    os.environ["LOG_SOURCE_ACCOUNT_ID"] = "LOG_SOURCE_ACCOUNT_ID"
    os.environ["LOG_SOURCE_REGION"] = region


    from waf_sampled_lambda_function import lambda_handler
    mocker.patch("util.osutil.OpenSearch.exist_index_template", return_value=True)
    mocker.patch("util.osutil.OpenSearch.bulk_load", return_value=resp)
    total, failed = lambda_handler({}, None)
    print(f'total is {total}')
    print(f'failed is {failed}')
    assert total == expected_total
    assert failed == expected_failed

@pytest.mark.parametrize(
    "resp,expected_total,expected_failed,region",
    [
        (load_success_resp, 0, 0,"us-east-1"),
        (load_failed_resp, 0,0,"us-east-1"),
    ],
)
def test_process_log_regional(mocker,sts_client,wafv2_regional_client,resp,expected_total, expected_failed,region):
    os.environ["LOG_TYPE"] = "WAFSampled"
    os.environ["LOG_SOURCE_ACCOUNT_ID"] = "LOG_SOURCE_ACCOUNT_ID"
    os.environ["LOG_SOURCE_REGION"] = region


    from waf_sampled_lambda_function import lambda_handler
    mocker.patch("util.osutil.OpenSearch.exist_index_template", return_value=True)
    mocker.patch("util.osutil.OpenSearch.bulk_load", return_value=resp)
    total, failed = lambda_handler({}, None)
    print(f'total is {total}')
    print(f'failed is {failed}')
    assert total == expected_total
    assert failed == expected_failed