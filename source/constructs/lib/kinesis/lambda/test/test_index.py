# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import os
import sys
import boto3
import types
import pytest
from moto import mock_kinesis, mock_ssm, mock_cloudformation, mock_lambda, mock_cloudwatch, mock_iam


sys.path.append(os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), 'lambda'))


@pytest.fixture(autouse=True)
def mock_kinesis_context():
    with mock_kinesis():
        kinesis_client = boto3.client('kinesis')
        response = kinesis_client.create_stream(
            StreamName='Stream',
            ShardCount=1,
            StreamModeDetails={
                'StreamMode': 'PROVISIONED'
            }
        )
        yield
        

@pytest.fixture(autouse=True)
def mock_ssm_context():
    with mock_ssm():
        ssm_client = boto3.client('ssm')
        response = ssm_client.put_parameter(
            Name='KinesisDesiredCapacityParameter',
            Value='1',
            Type='String',
            AllowedPattern='[0-9]+'
        )
        os.environ['ParameterStore'] = 'KinesisDesiredCapacityParameter'
        yield
        

@pytest.fixture(autouse=True)
def mock_cloudwatch_context():
    with mock_cloudwatch():
        cw_alarm_in_name = 'KDS-cwAlarmIn'
        cw_alarm_out_name = 'KDS-cwAlarmOut'
        
        os.environ['CloudWatchAlarmNameIn'] = cw_alarm_in_name
        os.environ['CloudWatchAlarmNameOut'] = cw_alarm_out_name
        
        cloudwatch_client = boto3.client('cloudwatch')
 
        cloudwatch_client.put_metric_alarm(
            AlarmName=cw_alarm_in_name,
            EvaluationPeriods=3,
            Threshold=700,
            ComparisonOperator='LessThanThreshold',
            Statistic="Sum",
            Period=300,
            Dimensions=[{"Name": "StreamName", "Value": "Stream"}],
            MetricName="IncomingRecords",
            Namespace="AWS/Kinesis",
        )
        
        cloudwatch_client.put_metric_alarm(
            AlarmName=cw_alarm_out_name,
            EvaluationPeriods=1,
            Threshold=1000,
            ComparisonOperator='GreaterThanThreshold',
            Statistic="Sum",
            Period=60,
            Dimensions=[{"Name": "StreamName", "Value": "Stream"}],
            MetricName="IncomingRecords",
            Namespace="AWS/Kinesis",
        )
        
        yield


@pytest.fixture(autouse=True)
def mock_cloudformation_context():
    with mock_cloudformation():
        stack_name = 'KDSStack'
        os.environ['STACK_NAME'] = stack_name
        
        current_path = os.path.dirname(os.path.abspath(__file__))
        fd_template = open(os.path.join(current_path, 'kds.template'), 'r')
        
        cloudformation_client = boto3.client('cloudformation')
        response = cloudformation_client.create_stack(
            StackName=stack_name,
            TemplateBody=''.join(fd_template.readlines()),
        )
        response = cloudformation_client.describe_stack_resources(
            StackName=stack_name, LogicalResourceId="KinesisScaleOut"
        )
        print(response)
        # os.environ['SCALER_FUNCTION_ARN'] = response['FunctionArn']
        yield
        
@pytest.fixture(autouse=True)
def mock_iam_context():
    with mock_iam():
        role_name = 'LambdaScaler'
        
        iam_client = boto3.client('iam')
        response = iam_client.create_role(RoleName=role_name,
                                          AssumeRolePolicyDocument='{"Version": "2012-10-17","Statement": [{"Effect": "Allow","Action": ["logs:CreateLogGroup","logs:CreateLogStream","logs:PutLogEvents"],"Resource": "*}]}')
        os.environ['SCALER_ROLE_ARN'] = response['Role']['Arn']
        yield
        
@pytest.fixture(autouse=True)
def mock_lambda_context():
    with mock_lambda():
        function_name = 'LambdaScaler'
        os.environ['SCALER_FUNCTION_NAME'] = function_name
        stack_name = os.environ['STACK_NAME']
        role_arn = os.environ['SCALER_ROLE_ARN']
        
        lambda_client = boto3.client('lambda')
        response = lambda_client.create_function(
            FunctionName=function_name,
            Handler='index.lambda_handler',
            Role=role_arn,
            Code={
                'ZipFile': b'',
            },
            Tags={
                'aws:cloudformation:stack-name': stack_name
                }
        )
        os.environ['SCALER_FUNCTION_ARN'] = response['FunctionArn']
        yield
        
        
def test_update_shards():
    from index import update_shards
    
    assert update_shards(2, 'Stream') == 'InProgress'
    assert update_shards(2, 'Do-not-exists-Stream') == 'Failed'


def test_update_alarm_out():
    from index import update_alarm_out
    
    assert update_alarm_out(2, 'Stream') is None
    with pytest.raises(Exception):
        update_alarm_out('2', 'Stream')


def test_update_alarm_in():
    from index import update_alarm_in
    
    assert update_alarm_in(2, 'Stream') is None
    with pytest.raises(Exception):
        update_alarm_in('2', 'Stream')


def test_response_function():
    from index import response_function
    
    response = response_function(status_code=200, response_body={'message': 'ok'})
    assert response == {'statusCode': 200, 'body': '{"message": "ok"}', 'headers': {'Content-Type': 'application/json'}}
    
    response = response_function(status_code=200, response_body=None)
    assert response == {'statusCode': 200, 'body': '{}', 'headers': {'Content-Type': 'application/json'}}
    

def test_autoscaling_policy_arn():
    """No Moto CloudFormation support for AWS::ApplicationAutoScaling::ScalingPolicy
       so can not test this function.
    """
    from index import autoscaling_policy_arn
    
    stack_name = os.environ['STACK_NAME']
    function_name = os.environ['SCALER_FUNCTION_NAME']
    
    context = types.SimpleNamespace()
    context.function_name = os.environ['SCALER_FUNCTION_NAME']
    context.invoked_function_arn = os.environ['SCALER_FUNCTION_ARN']
    
    response = autoscaling_policy_arn(context)
    
    assert response['ResponseMetadata']['HTTPStatusCode'] == 200
    assert response['FunctionName'] == function_name
    assert response['Environment'] == {'Variables': {
        'AutoScalingPolicyOut': '', 
        'AutoScalingPolicyIn': '', 
        'ParameterStore': 'KinesisDesiredCapacityParameter', 
        'CloudWatchAlarmNameOut': 'KDS-cwAlarmOut', 
        'CloudWatchAlarmNameIn': 'KDS-cwAlarmIn'
        }
                                       }


def test_lambda_handler():
    import index
    # from index import lambda_handler
    
    context = types.SimpleNamespace()
    context.function_name = os.environ['SCALER_FUNCTION_NAME']
    context.invoked_function_arn = os.environ['SCALER_FUNCTION_ARN']
    kinesis_desired_capacity_parameter = os.environ['ParameterStore']
    
    event = {
        "pathParameters": {
        }
    }
    response = index.lambda_handler(event=event, context=context)
    assert response['statusCode'] == 400
    
    event = {
        "pathParameters": {
            "scalableTargetDimensionId": 'Do-not-exists-Stream'
        }
    }
    response = index.lambda_handler(event=event, context=context)
    assert response['statusCode'] == 404

    index.PARAMETER_STORE = 'Do-not-exists-parameter'
    event = {
        "pathParameters": {
            "scalableTargetDimensionId": 'Stream'
        },
        "httpMethod": "POST"
    }
    with pytest.raises(Exception):
        index.lambda_handler(event=event, context=context)
    index.PARAMETER_STORE = kinesis_desired_capacity_parameter
    
    event = {
        "pathParameters": {
            "scalableTargetDimensionId": 'Stream'
        },
        "httpMethod": "POST"
    }
    response = index.lambda_handler(event=event, context=context)
    assert response['statusCode'] == 200
    
    event = {
        "pathParameters": {
            "scalableTargetDimensionId": 'Stream'
        },
        "httpMethod": "PATCH",
        "body": '{}'
    }
    response = index.lambda_handler(event=event, context=context)
    assert response['statusCode'] == 200
    
    os.environ['AutoScalingPolicyOut'] = ''
    os.environ['AutoScalingPolicyIn'] = ''
    event = {
        "pathParameters": {
            "scalableTargetDimensionId": 'Stream'
        },
        "httpMethod": "PATCH",
        "body": '{"desiredCapacity": 3}'
    }
    response = index.lambda_handler(event=event, context=context)
    assert response['statusCode'] == 200

