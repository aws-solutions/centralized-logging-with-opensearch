/*
Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.

Licensed under the Apache License, Version 2.0 (the "License").
You may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

import * as path from 'path';
import {
  Aws,
  Fn,
  Duration,
  aws_stepfunctions_tasks as tasks,
  aws_stepfunctions as sfn,
  aws_logs as logs,
  aws_iam as iam,
  aws_lambda as lambda,
  aws_dynamodb as ddb,
} from 'aws-cdk-lib';
import { NagSuppressions } from 'cdk-nag';
import { Construct } from 'constructs';
import { SharedPythonLayer } from '../layer/layer';
import { addCfnNagSuppressRules } from '../main-stack';
import { MicroBatchStack } from '../../lib/microbatch/main/services/amazon-services-stack';

export interface CfnFlowProps {
  /**
   * Common prefix for cloudformation stack names by this solution.
   *
   * @default - None.
   */
  readonly stackPrefix: string;

  /**
   * A table to store cross account info.
   *
   * @default - None.
   */
  readonly subAccountLinkTable: ddb.Table;

  readonly solutionId: string;

  readonly microBatchStack: MicroBatchStack;
}

/**
 * Stack to provision a common State Machine to orchestrate CloudFromation Deployment Flow.
 * This flow is used as a Child flow and will notify result at the end to parent flow.
 * Therefore, the input must contains a token.
 */
export class CfnFlowStack extends Construct {
  readonly stateMachineArn: string;

  constructor(scope: Construct, id: string, props: CfnFlowProps) {
    super(scope, id);

    const stackArn = `arn:${Aws.PARTITION}:cloudformation:${Aws.REGION}:${Aws.ACCOUNT_ID}:stack/${props.stackPrefix}*`;

    const templateBucket =
      process.env.TEMPLATE_OUTPUT_BUCKET || 'aws-gcr-solutions';
    const solutionName = process.env.SOLUTION_TRADEMARKEDNAME || 'log-hub'; // Old name

    // Create a Lambda to handle all the cloudformation releted tasks.
    const cfnHandler = new lambda.Function(this, 'CfnHelper', {
      code: lambda.AssetCode.fromAsset(
        path.join(__dirname, '../../lambda/main/cfnHelper')
      ),
      runtime: lambda.Runtime.PYTHON_3_11,
      handler: 'lambda_function.lambda_handler',
      timeout: Duration.seconds(60),
      memorySize: 128,
      layers: [SharedPythonLayer.getInstance(this)],
      environment: {
        TEMPLATE_OUTPUT_BUCKET: templateBucket,
        SOLUTION_NAME: solutionName,
        SOLUTION_ID: props.solutionId,
        SUB_ACCOUNT_LINK_TABLE_NAME: props.subAccountLinkTable.tableName,
        SOLUTION_VERSION: process.env.VERSION || 'v1.0.0',
      },
      description: `${Aws.STACK_NAME} - Helper function to handle CloudFormation deployment`,
    });

    // Grant permissions to the lambda
    const cfnHandlerPolicy = new iam.Policy(this, 'CfnHandlerPolicy', {
      statements: [
        new iam.PolicyStatement({
          actions: [
            'cloudformation:CreateUploadBucket',
            'cloudformation:DeleteStackInstances',
            'cloudformation:UpdateStackInstances',
            'cloudformation:UpdateTerminationProtection',
            'cloudformation:UpdateStackSet',
            'cloudformation:CreateChangeSet',
            'cloudformation:CreateStackInstances',
            'cloudformation:DeleteChangeSet',
            'cloudformation:UpdateStack',
            'cloudformation:CreateStackSet',
            'cloudformation:DeleteStackSet',
            'cloudformation:CreateStack',
            'cloudformation:DeleteStack',
            'apigateway:DELETE',
            'apigateway:PUT',
            'apigateway:PATCH',
            'apigateway:POST',
            'apigateway:GET',
            'application-autoscaling:RegisterScalableTarget',
            'application-autoscaling:DeleteScheduledAction',
            'application-autoscaling:DescribeScalableTargets',
            'application-autoscaling:DescribeScalingActivities',
            'application-autoscaling:DescribeScalingPolicies',
            'application-autoscaling:PutScalingPolicy',
            'application-autoscaling:DescribeScheduledActions',
            'application-autoscaling:DeleteScalingPolicy',
            'application-autoscaling:PutScheduledAction',
            'application-autoscaling:DeregisterScalableTarget',
            'elasticloadbalancing:DescribeLoadBalancers',
            'elasticloadbalancing:DescribeLoadBalancerAttributes',
            'elasticloadbalancing:ModifyLoadBalancerAttributes',
            'elasticloadbalancing:ModifyListener',
            'elasticloadbalancing:RegisterTargets',
            'elasticloadbalancing:SetIpAddressType',
            'elasticloadbalancing:SetRulePriorities',
            'elasticloadbalancing:RemoveListenerCertificates',
            'elasticloadbalancing:DeleteLoadBalancer',
            'elasticloadbalancing:SetWebAcl',
            'elasticloadbalancing:RemoveTags',
            'elasticloadbalancing:CreateListener',
            'elasticloadbalancing:DescribeListeners',
            'elasticloadbalancing:CreateRule',
            'elasticloadbalancing:DescribeListenerCertificates',
            'elasticloadbalancing:AddListenerCertificates',
            'elasticloadbalancing:ModifyTargetGroupAttributes',
            'elasticloadbalancing:DeleteRule',
            'elasticloadbalancing:DescribeSSLPolicies',
            'elasticloadbalancing:CreateLoadBalancer',
            'elasticloadbalancing:DescribeTags',
            'elasticloadbalancing:CreateTargetGroup',
            'elasticloadbalancing:DeregisterTargets',
            'elasticloadbalancing:SetSubnets',
            'elasticloadbalancing:DeleteTargetGroup',
            'elasticloadbalancing:DescribeTargetGroupAttributes',
            'elasticloadbalancing:ModifyRule',
            'elasticloadbalancing:DescribeAccountLimits',
            'elasticloadbalancing:AddTags',
            'elasticloadbalancing:DescribeTargetHealth',
            'elasticloadbalancing:SetSecurityGroups',
            'elasticloadbalancing:DescribeTargetGroups',
            'elasticloadbalancing:DescribeRules',
            'elasticloadbalancing:ModifyTargetGroup',
            'elasticloadbalancing:DeleteListener',
            'firehose:CreateDeliveryStream',
            'firehose:DescribeDeliveryStream',
            'firehose:PutRecord',
            'firehose:PutRecordBatch',
            'firehose:DeleteDeliveryStream',
            'es:ListDomainNames',
            'es:DescribeElasticsearchDomain',
            'es:UpdateElasticsearchDomainConfig',
            'es:ESHttpGet',
            'es:ESHttpDelete',
            'es:ESHttpPut',
            'es:ESHttpPost',
            'es:ESHttpHead',
            'es:ESHttpPatch',
            'execute-api:Invoke',
            'kms:EnableKeyRotation',
            'kms:PutKeyPolicy',
            'kms:DescribeKey',
            'kms:CreateKey',
            'sts:AssumeRole',
            'kinesis:DescribeStreamSummary',
            'kinesis:PutRecord',
            'kinesis:PutRecords',
            'kinesis:SubscribeToShard',
            'kinesis:DescribeStreamConsumer',
            'kinesis:GetShardIterator',
            'kinesis:GetRecords',
            'kinesis:DescribeStream',
            'kinesis:DescribeLimits',
            'kinesis:ListTagsForStream',
            'kinesis:StopStreamEncryption',
            'kinesis:DeregisterStreamConsumer',
            'kinesis:EnableEnhancedMonitoring',
            'kinesis:DecreaseStreamRetentionPeriod',
            'kinesis:CreateStream',
            'kinesis:RegisterStreamConsumer',
            'kinesis:UpdateStreamMode',
            'kinesis:RemoveTagsFromStream',
            'kinesis:DeleteStream',
            'kinesis:SplitShard',
            'kinesis:MergeShards',
            'kinesis:AddTagsToStream',
            'kinesis:IncreaseStreamRetentionPeriod',
            'kinesis:UpdateShardCount',
            'kinesis:StartStreamEncryption',
            'kinesis:DisableEnhancedMonitoring',
            'lambda:InvokeFunction',
            'lambda:AddPermission',
            'lambda:CreateFunction',
            'lambda:CreateEventSourceMapping',
            'lambda:DeleteEventSourceMapping',
            'lambda:PublishLayerVersion',
            'lambda:DeleteLayerVersion',
            'lambda:DeleteFunction',
            'lambda:RemovePermission',
            'lambda:UpdateFunctionConfiguration',
            'lambda:UpdateFunctionCode',
            'lambda:PublishVersion',
            'lambda:TagResource',
            'lambda:GetLayerVersion',
            'lambda:GetAccountSettings',
            'lambda:GetFunctionConfiguration',
            'lambda:GetLayerVersionPolicy',
            'lambda:GetProvisionedConcurrencyConfig',
            'lambda:List*',
            'lambda:GetAlias',
            'lambda:GetEventSourceMapping',
            'lambda:GetFunction',
            'lambda:GetFunctionUrlConfig',
            'lambda:GetFunctionCodeSigningConfig',
            'lambda:GetFunctionConcurrency',
            'lambda:GetFunctionEventInvokeConfig',
            'lambda:GetCodeSigningConfig',
            'lambda:GetPolicy',
            'ssm:GetParameters',
            'ssm:PutParameter',
            'ssm:AddTagsToResource',
            'ssm:DeleteParameter',
            's3:PutBucketNotification',
            's3:GetBucketNotification',
            's3:GetObject',
            'cloudwatch:ListMetrics',
            'cloudwatch:GetMetricStatistics',
            'cloudwatch:DescribeInsightRules',
            'cloudwatch:DescribeAlarmHistory',
            'cloudwatch:GetInsightRuleReport',
            'cloudwatch:GetMetricData',
            'cloudwatch:DescribeAlarmsForMetric',
            'cloudwatch:DescribeAlarms',
            'cloudwatch:GetMetricStream',
            'cloudwatch:GetMetricStatistics',
            'cloudwatch:GetMetricWidgetImage',
            'cloudwatch:ListManagedInsightRules',
            'cloudwatch:DescribeAnomalyDetectors',
            'cloudwatch:PutMetricData',
            'cloudwatch:PutMetricAlarm',
            'cloudwatch:DeleteAlarms',
            'logs:CreateLogGroup',
            'logs:DeleteLogGroup',
            'logs:DeleteLogStream',
            'logs:CreateLogStream',
            'logs:PutRetentionPolicy',
            'logs:DescribeLogGroups',
            'logs:DescribeLogStreams',
            'logs:GetLogEvents',
            'logs:PutMetricFilter',
            'logs:DeleteMetricFilter',
            'logs:DescribeMetricFilters',
            'autoscaling:CreateLaunchConfiguration',
            'autoscaling:CreateAutoScalingGroup',
            'autoscaling:DeleteAutoScalingGroup',
            'autoscaling:DeleteLaunchConfiguration',
            'autoscaling:UpdateAutoScalingGroup',
            'autoscaling:DescribeAutoScalingGroups',
            'autoscaling:DescribeAutoScalingInstances',
            'autoscaling:DescribeLaunchConfigurations',
            'autoscaling:EnableMetricsCollection',
            'autoscaling:DescribeScalingActivities',
            'autoscaling:PutScalingPolicy',
            'autoscaling:DeletePolicy',
            'ec2:createTags',
            'ec2:Describe*',
            'ec2:CreateSecurityGroup',
            'ec2:DeleteSecurityGroup',
            'ec2:RevokeSecurityGroupEgress',
            'ec2:AuthorizeSecurityGroupEgress',
            'ec2:AuthorizeSecurityGroupIngress',
            'ec2:RevokeSecurityGroupIngress',
            'ec2:CreateLaunchTemplate',
            'ec2:CreateLaunchTemplateVersion',
            'ec2:GetLaunchTemplateData',
            'ec2:RunInstances',
            'ec2:TerminateInstances',
            'ec2:DeleteLaunchTemplate',
            'ec2:DeleteLaunchTemplateVersions',
            'ecs:Update*',
            'ecs:List*',
            'ecs:Describe*',
            'ecs:Create*',
            'ecs:Delete*',
            'ecs:List*',
            'ecs:PutAttributes',
            'ecs:StartTask',
            'ecs:RegisterTaskDefinition',
            'ecs:StopTask',
            'ecs:DeregisterContainerInstance',
            'ecs:TagResource',
            'ecs:SubmitTaskStateChange',
            'ecs:PutAccountSetting',
            'ecs:StartTelemetrySession',
            'ecs:ExecuteCommand',
            'ecs:RegisterContainerInstance',
            'ecs:SubmitAttachmentStateChanges',
            'ecs:DeregisterTaskDefinition',
            'ecs:RunTask',
            'ecs:SubmitContainerStateChange',
            'ecs:UntagResource',
            'ecs:PutClusterCapacityProviders',
            'ecs:DiscoverPollEndpoint',
            'ecs:PutAccountSettingDefault',
            'cloudfront:GetDistri*',
            'cloudfront:UpdateDistribution',
            'cloudfront:DeleteRealtimeLogConfig',
            'cloudfront:GetRealtimeLogConfig',
            'cloudfront:CreateRealtimeLogConfig',
            'cloudfront:ListRealtimeLogConfigs',
            'cloudfront:UpdateRealtimeLogConfig',
            'states:CreateStateMachine',
            'states:DeleteStateMachine',
            'states:DescribeStateMachine',
            'states:TagResource',
            'states:UntagResource'
          ],
          resources: [`*`],
        }),
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          resources: [stackArn],
          actions: ['cloudformation:DescribeStacks'],
        }),

        // This list of actions is to ensure the substack cloudformation template can be launched successfully.

        new iam.PolicyStatement({
          actions: [
            'sqs:SendMessage',
            'sqs:CreateQueue',
            'sqs:GetQueueAttributes',
            'sqs:SetQueueAttributes',
            'sqs:DeleteQueue',
            'sqs:TagQueue',
          ],
          resources: [
            `arn:${Aws.PARTITION}:sqs:${Aws.REGION}:${Aws.ACCOUNT_ID}:*`,
          ],
        }),
        new iam.PolicyStatement({
          actions: [
            'dynamodb:CreateTable',
            'dynamodb:DescribeTable',
            'dynamodb:DeleteTable',
            'dynamodb:UpdateItem',
            'dynamodb:DescribeContinuousBackups',
            'dynamodb:UpdateContinuousBackups',
          ],
          resources: [
            `arn:${Aws.PARTITION}:dynamodb:${Aws.REGION}:${Aws.ACCOUNT_ID}:*`,
          ],
        }),
        new iam.PolicyStatement({
          actions: [
            'sns:CreateTopic',
            'sns:GetTopicAttributes',
            'sns:DeleteTopic',
            'sns:Subscribe',
            'sns:Unsubscribe',
            'sns:TagResource',
            'sns:SetTopicAttributes',
          ],
          resources: [
            `arn:${Aws.PARTITION}:sns:${Aws.REGION}:${Aws.ACCOUNT_ID}:*`,
          ],
        }),
        new iam.PolicyStatement({
          actions: [
            'events:PutRule',
            'events:RemoveTargets',
            'events:DescribeRule',
            'events:PutTargets',
            'events:DeleteRule',
          ],
          resources: [
            `arn:${Aws.PARTITION}:events:${Aws.REGION}:${Aws.ACCOUNT_ID}:*`,
          ],
        }),
        new iam.PolicyStatement({
          actions: [
            'iam:CreateInstanceProfile',
            'iam:CreateRole',
            'iam:PutRolePolicy',
            'iam:PassRole',
            'iam:AttachRolePolicy',
            'iam:AddRoleToInstanceProfile',
            'iam:RemoveRoleFromInstanceProfile',
            'iam:DeleteInstanceProfile',
            'iam:GetRole',
            'iam:GetPolicy',
            'iam:GetRolePolicy',
            'iam:ListRoles',
            'iam:ListPolicies',
            'iam:ListRolePolicies',
            'iam:DeleteRole',
            'iam:DeleteRolePolicy',
            'iam:DetachRolePolicy',
            'iam:CreateServiceLinkedRole',
            'iam:GetInstanceProfile',
          ],
          resources: [
            `arn:${Aws.PARTITION}:iam::${Aws.ACCOUNT_ID}:role/${props.stackPrefix}*`,
            `arn:${Aws.PARTITION}:iam::${Aws.ACCOUNT_ID}:role/aws-service-role/custom-resource.application-autoscaling.amazonaws.com/*`,
            `arn:${Aws.PARTITION}:iam::${Aws.ACCOUNT_ID}:policy/${props.stackPrefix}*`,
            `arn:${Aws.PARTITION}:iam::${Aws.ACCOUNT_ID}:instance-profile/${props.stackPrefix}*`,
            `arn:${Aws.PARTITION}:iam::${Aws.ACCOUNT_ID}:role/aws-service-role/autoscaling.amazonaws.com/AWSServiceRoleForAutoScaling`,
            `arn:${Aws.PARTITION}:iam::${Aws.ACCOUNT_ID}:role/aws-service-role/elasticloadbalancing.amazonaws.com/AWSServiceRoleForElasticLoadBalancing`,
            `arn:${Aws.PARTITION}:iam::${Aws.ACCOUNT_ID}:role/aws-service-role/ecs.application-autoscaling.amazonaws.com/AWSServiceRoleForApplicationAutoScaling_ECSService`,
            props.microBatchStack.microBatchLambdaStack.PipelineResourcesBuilderStack.PipelineResourcesBuilderRole.roleArn,
          ],
        }),
      ],
    });

    NagSuppressions.addResourceSuppressions(cfnHandlerPolicy, [
      {
        id: 'AwsSolutions-IAM5',
        reason:
          'This policy needs to be able to start/delete other cloudformation stacks of the plugin with unknown resources names',
      },
    ]);

    cfnHandler.role!.attachInlinePolicy(cfnHandlerPolicy);
    addCfnNagSuppressRules(
      cfnHandlerPolicy.node.defaultChild as iam.CfnPolicy,
      [
        {
          id: 'F4',
          reason:
            'This policy requires releted actions in order to start/delete sub cloudformation stacks with many other services',
        },
        {
          id: 'W76',
          reason:
            'This policy needs to be able to start/delete other complex cloudformation stacks',
        },
        {
          id: 'W12',
          reason:
            'This policy needs to be able to start/delete other cloudformation stacks of the plugin with unknown resources names',
        },
      ]
    );

    const sfnHandler = new lambda.Function(this, 'SfnHelper', {
      code: lambda.AssetCode.fromAsset(
        path.join(__dirname, '../../lambda/main/sfnHelper')
      ),
      runtime: lambda.Runtime.PYTHON_3_11,
      handler: 'lambda_function.lambda_handler',
      timeout: Duration.seconds(30),
      memorySize: 128,
      environment: {
        SOLUTION_VERSION: process.env.VERSION || 'v1.0.0',
        SOLUTION_ID: props.solutionId,
      },
      description: `${Aws.STACK_NAME} - Helper function to handle Step Functions`,
    });

    const sfnHandlerPolicy = new iam.Policy(this, 'SfnHandlerPolicy', {
      statements: [
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          resources: ['*'],
          actions: ['states:SendTaskSuccess', 'states:SendTaskFailure'],
        }),
      ],
    });
    sfnHandler.role!.attachInlinePolicy(sfnHandlerPolicy);
    NagSuppressions.addResourceSuppressions(sfnHandlerPolicy, [
      {
        id: 'AwsSolutions-IAM5',
        reason:
          'This policy needs to be able to start/delete other complex cloudformation stacks',
      },
    ]);
    addCfnNagSuppressRules(
      sfnHandlerPolicy.node.defaultChild as iam.CfnPolicy,
      [
        {
          id: 'W12',
          reason: 'These actions can only support all resources',
        },
      ]
    );

    // Step Functions Tasks
    const cfnTask = new tasks.LambdaInvoke(this, 'Start or Stop Stack', {
      lambdaFunction: cfnHandler,
      outputPath: '$.Payload',
      inputPath: '$.input',
    });

    const cfnQueryTask = new tasks.LambdaInvoke(this, 'Query Stack Status', {
      lambdaFunction: cfnHandler,
      outputPath: '$.Payload',
    });

    const sfnNotifyTask = new tasks.LambdaInvoke(this, 'Notify result', {
      lambdaFunction: sfnHandler,
      payload: sfn.TaskInput.fromObject({
        token: sfn.JsonPath.stringAt('$$.Execution.Input.token'),
        result: sfn.JsonPath.stringAt('$.result'),
        args: sfn.JsonPath.stringAt('$.args'),
      }),
      outputPath: '$.Payload',
    });

    const wait = new sfn.Wait(this, 'Wait for 15 seconds', {
      time: sfn.WaitTime.duration(Duration.seconds(15)),
    });

    const stackCompleted = new sfn.Choice(this, 'In progress?')
      .when(
        sfn.Condition.stringMatches('$.result.stackStatus', '*_IN_PROGRESS'),
        wait
      )
      .otherwise(sfnNotifyTask);

    const stackFailed = new sfn.Choice(this, 'Failed?')
      .when(
        sfn.Condition.stringMatches('$.result.stackStatus', '*_IN_PROGRESS'),
        wait.next(cfnQueryTask.next(stackCompleted))
      )
      .otherwise(sfnNotifyTask);

    const chain = cfnTask.next(stackFailed);

    // State machine log group for error logs
    const logGroup = new logs.LogGroup(this, 'ErrorLogGroup', {
      logGroupName: `/aws/vendedlogs/states/${Fn.select(
        6,
        Fn.split(':', sfnHandler.functionArn)
      )}-SM-cfn-error`,
    });

    // Role for state machine
    const cfnFlowSMRole = new iam.Role(this, 'SMRole', {
      assumedBy: new iam.ServicePrincipal('states.amazonaws.com'),
    });
    // Least Privilage to enable logging for state machine
    cfnFlowSMRole.addToPolicy(
      new iam.PolicyStatement({
        actions: [
          'logs:PutResourcePolicy',
          'logs:DescribeLogGroups',
          'logs:UpdateLogDelivery',
          'logs:AssociateKmsKey',
          'logs:GetLogGroupFields',
          'logs:PutRetentionPolicy',
          'logs:CreateLogGroup',
          'logs:PutDestination',
          'logs:DescribeResourcePolicies',
          'logs:GetLogDelivery',
          'logs:ListLogDeliveries',
        ],
        effect: iam.Effect.ALLOW,
        resources: [logGroup.logGroupArn],
      })
    );
    NagSuppressions.addResourceSuppressions(cfnFlowSMRole, [
      {
        id: 'AwsSolutions-IAM5',
        reason: 'This role doesnot have wildcard permission',
      },
    ]);

    // Create the state machine
    const cfnFlowSM = new sfn.StateMachine(this, 'SM', {
      definitionBody: sfn.DefinitionBody.fromChainable(chain),
      role: cfnFlowSMRole,
      logs: {
        destination: logGroup,
        level: sfn.LogLevel.ALL,
      },
      timeout: Duration.minutes(120),
    });
    NagSuppressions.addResourceSuppressions(cfnFlowSMRole, [
      { id: 'AwsSolutions-SF2', reason: 'This sm does not need xray' },
    ]);

    this.stateMachineArn = cfnFlowSM.stateMachineArn;
  }
}
