// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import * as path from 'path';
import {
  Aws,
  CfnResource,
  Duration,
  RemovalPolicy,
  CfnCondition,
  Fn,
  Aspects,
  IAspect,
  aws_iam as iam,
  aws_s3 as s3,
  aws_lambda as lambda,
  aws_sqs as sqs,
  CustomResource,
  custom_resources as cr,
  aws_logs as logs,
  CfnParameter,
  Stack,
} from 'aws-cdk-lib';
import { Rule } from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import { CfnRole } from 'aws-cdk-lib/aws-iam';
import { CfnQueue } from 'aws-cdk-lib/aws-sqs';
import { NagSuppressions } from 'cdk-nag';
import { Construct, IConstruct } from 'constructs';
import { S3toOpenSearchStackProps } from './s3-to-opensearch-common-stack';
import { SharedPythonLayer } from '../../layer/layer';
import { constructFactory } from '../../util/stack-helper';
import { CWLMetricStack, MetricSourceType } from '../common/cwl-metric-stack';
import { CfnGuardSuppressResourceList } from '../../util/add-cfn-guard-suppression';

/**
 * cfn-nag suppression rule interface
 */
interface CfnNagSuppressRule {
  readonly id: string;
  readonly reason: string;
}

export function addCfnNagSuppressRules(
  resource: CfnResource,
  rules: CfnNagSuppressRule[]
) {
  resource.addMetadata('cfn_nag', {
    rules_to_suppress: rules,
  });
}

export class S3toOpenSearchStack extends Construct {
  // readonly logProcessorRoleArn: string;
  readonly logProcessorLogGroupName: string;
  readonly logEventQueueArn: string = '';
  readonly logEventQueueName: string = '';

  constructor(scope: Construct, id: string, props: S3toOpenSearchStackProps) {
    super(scope, id);

    // Get the logBucket
    const logBucket = s3.Bucket.fromBucketName(
      this,
      'logBucket',
      props.logBucketName
    );

    // Create the Log Group for the Lambda function
    const logGroup = new logs.LogGroup(this, 'LogProcessorFnLogGroup', {
      logGroupName: `/aws/lambda/${Aws.STACK_NAME}-LogProcessorFn`,
      removalPolicy: RemovalPolicy.DESTROY,
    });
    this.logProcessorLogGroupName = logGroup.logGroupName;

    constructFactory(CWLMetricStack)(this, 'cwlMetricStack', {
      metricSourceType:
        props.metricSourceType || MetricSourceType.LOG_PROCESSOR_SVC,
      logGroup: logGroup,
      stackPrefix: props.stackPrefix,
    });

    const logProcessorRoleName = new CfnParameter(
      this,
      'logProcessorRoleName',
      {
        type: 'String',
        default: '',
        description:
          'Specify a role name for the log processor. The name should NOT duplicate an existing role name. If no name is specified, a random name is generated. (Optional)',
      }
    );
    logProcessorRoleName.overrideLogicalId('logProcessorRoleName');

    const hasLogProcessorRoleName = new CfnCondition(
      this,
      'HasLogProcessorRoleName',
      {
        expression: Fn.conditionNot(
          Fn.conditionEquals(logProcessorRoleName.valueAsString, '')
        ),
      }
    );

    const enableS3NotificationParam = new CfnParameter(
      this,
      'enableS3Notification',
      {
        type: 'String',
        default: 'True',
        allowedValues: ['True', 'False'],
        description:
          'A binary option is available to enable or disable notifications for Amazon S3 buckets. The default option is recommended for most cases.',
      }
    );
    enableS3NotificationParam.overrideLogicalId('enableS3Notification');

    const shouldEnableS3Notification = new CfnCondition(
      this,
      'shouldEnableS3Notification',
      {
        expression: Fn.conditionEquals(enableS3NotificationParam, 'True'),
      }
    );

    // No cross-account distinction is made here
    logBucket.grantRead(props.logProcessorFn);

    // props.logProcessorFn.role!.attachInlinePolicy(logProcessorPolicy);

    Aspects.of(props.logProcessorFn.role!).add(
      new SetRoleName(
        Stack.of(this).resolve(
          Fn.conditionIf(
            hasLogProcessorRoleName.logicalId,
            logProcessorRoleName.valueAsString,
            Aws.NO_VALUE
          )
        )
      )
    );

    //Handle cross-account
    const isCrossAccount = new CfnCondition(this, 'IsCrossAccount', {
      expression: Fn.conditionNot(
        Fn.conditionEquals(props.logSourceAccountAssumeRole, '')
      ),
    });

    props.logProcessorFn.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['sts:AssumeRole'],
        effect: iam.Effect.ALLOW,
        resources: [
          `arn:${Aws.PARTITION}:logs:${Aws.REGION}:${Aws.ACCOUNT_ID}:*`,
          Fn.conditionIf(
            isCrossAccount.logicalId,
            `${props.logSourceAccountAssumeRole}`,
            Aws.NO_VALUE
          ).toString(),
        ],
      })
    );
    NagSuppressions.addResourceSuppressions(
      props.logProcessorFn,
      [
        {
          id: 'AwsSolutions-IAM5',
          reason: 'The managed policy needs to use any resources.',
        },
      ],
      true
    );

    Aspects.of(this).add(new CfnGuardSuppressResourceList({
      "AWS::Logs::LogGroup": ["CLOUDWATCH_LOG_GROUP_ENCRYPTED"], // Explicit role names required for cross account assumption
    }));

    // Setup SQS and DLQ
    const logEventDLQ = new sqs.Queue(this, 'LogEventDLQ', {
      visibilityTimeout: Duration.minutes(15),
      retentionPeriod: Duration.days(7),
      encryption: sqs.QueueEncryption.KMS_MANAGED,
    });
    logEventDLQ.addToResourcePolicy(
      new iam.PolicyStatement({
        actions: ['sqs:*'],
        effect: iam.Effect.DENY,
        resources: [logEventDLQ.queueArn],
        conditions: {
          ['Bool']: {
            'aws:SecureTransport': 'false',
          },
        },
        principals: [new iam.AnyPrincipal()],
      })
    );
    NagSuppressions.addResourceSuppressions(logEventDLQ, [
      { id: 'AwsSolutions-SQS3', reason: 'it is a DLQ' },
    ]);

    const hasPrefixAndSuffix = new CfnCondition(this, 'HasPrefixAndSuffix', {
      expression: Fn.conditionAnd(
        Fn.conditionNot(Fn.conditionEquals(props.logBucketPrefix, '')),
        Fn.conditionNot(Fn.conditionEquals(props.logBucketSuffix || '', ''))
      ),
    });

    const rule = new Rule(this, 'S3EventTrigger', {
      eventPattern: {
        source: [
          Fn.conditionIf(
            shouldEnableS3Notification.logicalId,
            'aws.s3',
            Aws.NO_VALUE
          ).toString(),
          'clo.aws.s3',
        ],
        detailType: ['Object Created'],
        detail: {
          bucket: {
            name: [logBucket.bucketName],
          },
          object: {
            key: Fn.conditionIf(
              hasPrefixAndSuffix.logicalId,
              [
                {
                  wildcard: `${props.logBucketPrefix}*${props.logBucketSuffix}`,
                },
              ],
              [{ prefix: props.logBucketPrefix }]
            ),
          },
        },
      },
      targets: [
        new targets.LambdaFunction(props.logProcessorFn, {
          deadLetterQueue: logEventDLQ,
        }),
      ],
    });

    const queueName = new CfnParameter(this, 'queueName', {
      type: 'String',
      default: '',
      description:
        'Specify a queue name for a SQS. The name should NOT duplicate an existing role name. If no name is given, a random name will be generated. (Optional)',
    });
    queueName.overrideLogicalId('queueName');

    this.logEventQueueArn = rule.ruleArn;
    this.logEventQueueName = rule.ruleName;

    // Lambda to enable bucket notification of log source account.
    const logSourceS3NotificationFn = new lambda.Function(
      this,
      'logSourceS3NotificationFn',
      {
        description: `${Aws.STACK_NAME} - Create Log Source S3 Notification Processor`,
        runtime: lambda.Runtime.PYTHON_3_11,
        handler: 'log_source_s3_bucket_policy_processor.lambda_handler',
        code: lambda.Code.fromAsset(
          path.join(
            __dirname,
            '../../../lambda/pipeline/common/custom-resource/'
          )
        ),
        memorySize: 256,
        timeout: Duration.seconds(60),
        layers: [SharedPythonLayer.getInstance(this)],
        environment: {
          STACK_ID: Aws.STACK_ID,
          STACK_NAME: Aws.STACK_NAME,
          SOLUTION_VERSION: process.env.VERSION || 'v1.0.0',
          SOLUTION_ID: props.solutionId,
          LOG_TYPE: props.logType,
          LOG_SOURCE_ACCOUNT_ID: props.logSourceAccountId,
          LOG_SOURCE_REGION: props.logSourceRegion,
          LOG_SOURCE_ACCOUNT_ASSUME_ROLE: props.logSourceAccountAssumeRole,
          LOG_BUCKET_NAME: logBucket.bucketName,
          LOG_BUECKET_PREFIX: props.logBucketPrefix,
        },
      }
    );

    // Create the policy and role for the Lambda to create and delete CloudWatch Log Group Subscription Filter with cross-account scenario
    logSourceS3NotificationFn.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['sts:AssumeRole'],
        effect: iam.Effect.ALLOW,
        resources: [
          `arn:${Aws.PARTITION}:logs:${Aws.REGION}:${Aws.ACCOUNT_ID}:*`,
          Fn.conditionIf(
            isCrossAccount.logicalId,
            `${props.logSourceAccountAssumeRole}`,
            Aws.NO_VALUE
          ).toString(),
        ],
      })
    );
    logSourceS3NotificationFn.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['s3:PutBucketNotification', 's3:GetBucketNotification'],
        effect: iam.Effect.ALLOW,
        resources: [logBucket.bucketArn],
      })
    );
    NagSuppressions.addResourceSuppressions(
      logSourceS3NotificationFn,
      [
        {
          id: 'AwsSolutions-IAM5',
          reason: 'The managed policy needs to use any resources.',
        },
      ],
      true
    );

    const logSourceS3NotificationProvider = new cr.Provider(
      this,
      'logSourceS3NotificationProvider',
      {
        onEventHandler: logSourceS3NotificationFn,
      }
    );
    NagSuppressions.addResourceSuppressions(
      logSourceS3NotificationProvider,
      [
        {
          id: 'AwsSolutions-IAM5',
          reason: 'The managed policy needs to use any resources.',
        },
      ],
      true
    );

    logSourceS3NotificationProvider.node.addDependency(
      logSourceS3NotificationFn
    );

    const logSourceS3NotificationlambdaTrigger = new CustomResource(
      this,
      'logSourceS3NotificationlambdaTrigger',
      {
        serviceToken: logSourceS3NotificationProvider.serviceToken,
      }
    );

    logSourceS3NotificationlambdaTrigger.node.addDependency(
      logSourceS3NotificationProvider
    );
    // Only enable these resource when deploy in cross account
    this.enable({
      construct: logSourceS3NotificationFn,
      if: shouldEnableS3Notification,
    });
    this.enable({
      construct: logSourceS3NotificationProvider,
      if: shouldEnableS3Notification,
    });
    this.enable({
      construct: logSourceS3NotificationlambdaTrigger,
      if: shouldEnableS3Notification,
    });
  }

  protected enable(param: { construct: IConstruct; if: CfnCondition }) {
    Aspects.of(param.construct).add(new InjectCondition(param.if));
  }
}

class InjectCondition implements IAspect {
  public constructor(private condition: CfnCondition) { }

  public visit(node: IConstruct): void {
    if (node instanceof CfnResource) {
      node.cfnOptions.condition = this.condition;
    }
  }
}

class InjectS3NotificationCondition implements IAspect {
  public constructor(private condition: CfnCondition) { }

  public visit(node: IConstruct): void {
    if (
      node instanceof CfnResource &&
      node.cfnResourceType === 'Custom::S3BucketNotifications'
    ) {
      node.cfnOptions.condition = this.condition;
    }
  }
}

class SetSQSQueueName implements IAspect {
  public constructor(private queueName: string) { }

  public visit(node: IConstruct): void {
    if (node instanceof CfnQueue) {
      node.queueName = this.queueName;
    }
  }
}

class SetRoleName implements IAspect {
  public constructor(private roleName: string) { }

  public visit(node: IConstruct): void {
    if (node instanceof CfnRole) {
      node.roleName = this.roleName;
    }
  }
}
