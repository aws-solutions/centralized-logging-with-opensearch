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
  aws_ec2 as ec2,
  aws_sqs as sqs,
  aws_kms as kms,
  aws_lambda_event_sources as eventsources,
  aws_s3_notifications as s3n,
  CustomResource,
  custom_resources as cr,
  aws_logs as logs,
  CfnParameter,
  Stack,
} from 'aws-cdk-lib';
import { ISecurityGroup, IVpc } from 'aws-cdk-lib/aws-ec2';
import { CfnRole } from 'aws-cdk-lib/aws-iam';
import { CfnQueue } from 'aws-cdk-lib/aws-sqs';
import { NagSuppressions } from 'cdk-nag';
import { Construct, IConstruct } from 'constructs';
import { SharedPythonLayer } from '../../layer/layer';
import { CWLMetricStack, MetricSourceType } from '../common/cwl-metric-stack';
import { constructFactory } from '../../util/stack-helper';

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

export interface S3toOpenSearchStackProps {
  /**
   * Default VPC for OpenSearch REST API Handler
   *
   * @default - None.
   */
  readonly vpc: IVpc;

  /**
   * Default Security Group for OpenSearch REST API Handler
   *
   * @default - None.
   */
  readonly securityGroup: ISecurityGroup;

  /**
   * OpenSearch Endpoint Url
   *
   * @default - None.
   */
  readonly endpoint: string;

  /**
   * OpenSearch or Elasticsearch
   *
   * @default - OpenSearch.
   */
  readonly engineType: string;

  /**
   * Log Type
   *
   * @default - None.
   */
  readonly logType: string;

  /**
   * Index Prefix
   *
   * @default - None.
   */
  readonly indexPrefix: string;

  /**
   * A list of plugins
   *
   * @default - None.
   */
  readonly plugins: string;

  readonly logBucketName: string;
  readonly logBucketPrefix: string;
  readonly logBucketSuffix?: string;
  readonly backupBucketName: string;
  /**
   * The Account Id of log source
   * @default - None.
   */
  readonly logSourceAccountId: string;
  /**
   * The region of log source
   * @default - None.
   */
  readonly logSourceRegion: string;
  /**
   * The assume role of log source account
   * @default - None.
   */
  readonly logSourceAccountAssumeRole: string;
  /**
   * Default KMS-CMK Arn
   *
   * @default - None.
   */
  readonly defaultCmkArn?: string;

  readonly solutionId: string;
  readonly stackPrefix: string;
  readonly metricSourceType?: MetricSourceType;
  readonly enableConfigJsonParam?: boolean;
}

export class S3toOpenSearchStack extends Construct {
  readonly logProcessorRoleArn: string;
  readonly logProcessorLogGroupName: string;
  readonly logEventQueueArn: string;
  readonly logEventQueueName: string;

  private newKMSKey = new kms.Key(this, `SQS-CMK`, {
    removalPolicy: RemovalPolicy.DESTROY,
    pendingWindow: Duration.days(7),
    description: 'KMS-CMK for encrypting the objects in SQS',
    enableKeyRotation: true,
    policy: new iam.PolicyDocument({
      statements: [
        new iam.PolicyStatement({
          actions: [
            'kms:CreateKey',
            'kms:CreateAlias',
            'kms:CreateCustomKeyStore',
            'kms:DescribeKey',
            'kms:DescribeCustomKeyStores',
            'kms:EnableKey',
            'kms:EnableKeyRotation',
            'kms:ListAliases',
            'kms:ListKeys',
            'kms:ListGrants',
            'kms:ListKeyPolicies',
            'kms:ListResourceTags',
            'kms:PutKeyPolicy',
            'kms:UpdateAlias',
            'kms:UpdateCustomKeyStore',
            'kms:UpdateKeyDescription',
            'kms:UpdatePrimaryRegion',
            'kms:RevokeGrant',
            'kms:GetKeyPolicy',
            'kms:GetParametersForImport',
            'kms:GetKeyRotationStatus',
            'kms:GetPublicKey',
            'kms:ScheduleKeyDeletion',
            'kms:GenerateDataKey',
            'kms:TagResource',
            'kms:UntagResource',
            'kms:Decrypt',
            'kms:Encrypt',
          ],
          resources: ['*'],
          effect: iam.Effect.ALLOW,
          principals: [new iam.AccountRootPrincipal()],
        }),
        new iam.PolicyStatement({
          actions: ['kms:GenerateDataKey*', 'kms:Decrypt', 'kms:Encrypt'],
          resources: ['*'], // support app log from s3 by not limiting the resource
          principals: [
            new iam.ServicePrincipal('s3.amazonaws.com'),
            new iam.ServicePrincipal('lambda.amazonaws.com'),
            new iam.ServicePrincipal('ec2.amazonaws.com'),
            new iam.ServicePrincipal('sqs.amazonaws.com'),
            new iam.ServicePrincipal('cloudwatch.amazonaws.com'),
          ],
        }),
      ],
    }),
  });

  constructor(scope: Construct, id: string, props: S3toOpenSearchStackProps) {
    super(scope, id);

    // Get the logBucket
    const logBucket = s3.Bucket.fromBucketName(
      this,
      'logBucket',
      props.logBucketName
    );

    const isCreateNewKMS = new CfnCondition(this, 'isCreateNew', {
      expression: Fn.conditionEquals(props.defaultCmkArn, ''),
    });
    this.enable({ construct: this.newKMSKey, if: isCreateNewKMS });

    // Create the policy and role for processor Lambda
    const logProcessorPolicy = new iam.Policy(this, 'logProcessorPolicy', {
      statements: [
        new iam.PolicyStatement({
          actions: [
            'es:ESHttpGet',
            'es:ESHttpDelete',
            'es:ESHttpPatch',
            'es:ESHttpPost',
            'es:ESHttpPut',
            'es:ESHttpHead',
          ],
          resources: ['*'],
        }),
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          resources: [
            Fn.conditionIf(
              isCreateNewKMS.logicalId,
              this.newKMSKey.keyArn,
              props.defaultCmkArn!
            ).toString(),
          ],
          actions: [
            'kms:Decrypt',
            'kms:Encrypt',
            'kms:ReEncrypt*',
            'kms:GenerateDataKey*',
            'kms:DescribeKey',
          ],
        }),
      ],
    });
    NagSuppressions.addResourceSuppressions(logProcessorPolicy, [
      {
        id: 'AwsSolutions-IAM5',
        reason: 'The managed policy needs to use any resources.',
      },
    ]);

    // Create the Log Group for the Lambda function
    const logGroup = new logs.LogGroup(this, 'LogProcessorFnLogGroup', {
      logGroupName: `/aws/lambda/${Aws.STACK_NAME}-LogProcessorFn`,
      removalPolicy: RemovalPolicy.DESTROY,
    });
    this.logProcessorLogGroupName = logGroup.logGroupName;

    constructFactory(CWLMetricStack)(this, 'cwlMetricStack', {
      metricSourceType: props.metricSourceType || MetricSourceType.LOG_PROCESSOR_SVC,
      logGroup: logGroup,
      stackPrefix: props.stackPrefix,
    });



    const logProcessorRoleName = new CfnParameter(
      this,
      'LogProcessorRoleName',
      {
        type: 'String',
        default: '',
        description: 'Specify a role name for the log processor. The name should NOT duplicate an existing role name. If no name is specified, a random name is generated. (Optional)',
      }
    );
    logProcessorRoleName.overrideLogicalId('LogProcessorRoleName');

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
      'EnableS3Notification',
      {
        type: 'String',
        default: 'True',
        allowedValues: ['True', 'False'],
        description: 'A binary option is available to enable or disable notifications for Amazon S3 buckets. The default option is recommended for most cases.',
      }
    );
    enableS3NotificationParam.overrideLogicalId('EnableS3Notification');

    const shouldEnableS3Notification = new CfnCondition(
      this,
      'shouldEnableS3Notification',
      {
        expression: Fn.conditionEquals(enableS3NotificationParam, 'True'),
      }
    );

    // Create a lambda layer with required python packages.
    // This layer also includes standard plugins.
    const pipeLayer = new lambda.LayerVersion(this, "LogProcessorLayer", {
      code: lambda.Code.fromAsset(
        path.join(__dirname, "../../../lambda/plugin/standard"),
        {
          bundling: {
            image: lambda.Runtime.PYTHON_3_9.bundlingImage,
            command: [
              "bash",
              "-c",
              "pip install -r requirements.txt -t /asset-output/python && cp . -r /asset-output/python/",
            ],
          },
        }
      ),
      compatibleRuntimes: [lambda.Runtime.PYTHON_3_9],
      description: "Default Lambda layer for Log Pipeline",
    });

    // Create the Log Processor Lambda
    const logProcessorFn = new lambda.Function(this, 'LogProcessorFn', {
      description: `${Aws.STACK_NAME} - Function to process and load ${props.logType} logs into OpenSearch`,
      functionName: `${Aws.STACK_NAME}-LogProcessorFn`,
      runtime: lambda.Runtime.PYTHON_3_9,
      handler: 'lambda_function.lambda_handler',
      code: lambda.Code.fromAsset(
        path.join(__dirname, '../../../lambda/pipeline/service/log-processor')
      ),
      memorySize: 1024,
      timeout: Duration.seconds(900),
      vpc: props.vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      securityGroups: [props.securityGroup],
      environment: {
        STACK_NAME: Aws.STACK_NAME,
        ENDPOINT: props.endpoint,
        ENGINE: props.engineType,
        LOG_TYPE: props.logType,
        INDEX_PREFIX: props.indexPrefix,
        LOG_BUCKET_NAME: props.logBucketName,
        BACKUP_BUCKET_NAME: props.backupBucketName,
        SOLUTION_VERSION: process.env.VERSION || 'v1.0.0',
        SOLUTION_ID: props.solutionId,
        PLUGINS: props.plugins,
        LOG_SOURCE_ACCOUNT_ID: props.logSourceAccountId,
        LOG_SOURCE_REGION: props.logSourceRegion,
        LOG_SOURCE_ACCOUNT_ASSUME_ROLE: props.logSourceAccountAssumeRole,
        CONFIG_JSON: (() => {
          if (props.enableConfigJsonParam) {
            const configJSON = new CfnParameter(this, 'ConfigJSON', {
              type: 'String',
              default: '',
              description: 'A string in JSON format that controls how to parse the logs in the S3 bucket. (Optional)',
            });
            configJSON.overrideLogicalId('ConfigJSON');
            return configJSON.valueAsString;
          }
          return '';
        })(),
        BULK_BATCH_SIZE: '10000',
        FUNCTION_NAME: `${Aws.STACK_NAME}-LogProcessorFn`,
      },
      layers: [SharedPythonLayer.getInstance(this), pipeLayer],
    });
    logProcessorFn.addToRolePolicy(
      new iam.PolicyStatement({
        actions: [
          'lambda:UpdateFunctionConfiguration',
          'lambda:GetFunctionConfiguration',
        ],
        resources: [`arn:${Aws.PARTITION}:lambda:${Aws.REGION}:${Aws.ACCOUNT_ID}:function:${Aws.STACK_NAME}-LogProcessorFn`,],
      })
    );

    // No cross-account distinction is made here
    logBucket.grantRead(logProcessorFn);

    logProcessorFn.role!.attachInlinePolicy(logProcessorPolicy);

    Aspects.of(logProcessorFn.role!).add(
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
      expression: Fn.conditionAnd(
        Fn.conditionNot(Fn.conditionEquals(props.logSourceAccountId, '')),
        Fn.conditionNot(
          Fn.conditionEquals(props.logSourceAccountId.trim(), Aws.ACCOUNT_ID)
        )
      ),
    });
    const isCurrentAccount = new CfnCondition(this, 'IsCurrentAccount', {
      expression: Fn.conditionNot(
        Fn.conditionAnd(
          Fn.conditionNot(Fn.conditionEquals(props.logSourceAccountId, '')),
          Fn.conditionNot(
            Fn.conditionEquals(props.logSourceAccountId.trim(), Aws.ACCOUNT_ID)
          )
        )
      ),
    });

    const isEnableS3Notification = new CfnCondition(
      this,
      'isEnableS3Notification',
      {
        expression: Fn.conditionAnd(
          shouldEnableS3Notification,
          Fn.conditionOr(
            isCurrentAccount,
            Fn.conditionAnd(
              isCrossAccount,
              Fn.conditionOr(
                Fn.conditionEquals(props.logType.trim(), 'Lambda'),
                Fn.conditionEquals(props.logType.trim(), 'RDS')
              )
            )
          )
        ),
      }
    );

    logProcessorFn.addToRolePolicy(
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
      logProcessorFn,
      [
        {
          id: 'AwsSolutions-IAM5',
          reason: 'The managed policy needs to use any resources.',
        },
      ],
      true
    );

    this.logProcessorRoleArn = logProcessorFn.role!.roleArn;

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

    const cfnLogEventDLQ = logEventDLQ.node.defaultChild as sqs.CfnQueue;
    cfnLogEventDLQ.overrideLogicalId('LogEventDLQ');

    // Generate the sqsKMSKey from the new generated KMS Key or the default KMS Key
    const sqsKMSKeyArn = Fn.conditionIf(
      isCreateNewKMS.logicalId,
      this.newKMSKey.keyArn,
      props.defaultCmkArn!
    ).toString();
    const sqsKMSKey = kms.Key.fromKeyArn(
      this,
      `Final-SQS-CMK-${id}`,
      sqsKMSKeyArn
    );

    const queueName = new CfnParameter(this, 'QueueName', {
      type: 'String',
      default: '',
      description: 'Specify a queue name for a SQS. The name should NOT duplicate an existing role name. If no name is given, a random name will be generated. (Optional)',
    });
    queueName.overrideLogicalId('QueueName');

    const hasQueueName = new CfnCondition(this, 'HasQueueName', {
      expression: Fn.conditionNot(
        Fn.conditionEquals(queueName.valueAsString, '')
      ),
    });

    const logEventQueue = new sqs.Queue(this, 'LogEventQueue', {
      visibilityTimeout: Duration.seconds(910),
      retentionPeriod: Duration.days(14),
      deadLetterQueue: {
        queue: logEventDLQ,
        maxReceiveCount: 30,
      },
      encryption: sqs.QueueEncryption.KMS,
      dataKeyReuse: Duration.minutes(5),
      encryptionMasterKey: sqsKMSKey,
    });
    this.logEventQueueArn = logEventQueue.queueArn;
    this.logEventQueueName = logEventQueue.queueName;

    Aspects.of(logEventQueue).add(
      new SetSQSQueueName(
        Stack.of(this).resolve(
          Fn.conditionIf(
            hasQueueName.logicalId,
            queueName.valueAsString,
            Aws.NO_VALUE
          )
        )
      )
    );

    const cfnLogEventQueue = logEventQueue.node.defaultChild as sqs.CfnQueue;
    cfnLogEventQueue.overrideLogicalId('LogEventQueue');
    addCfnNagSuppressRules(cfnLogEventQueue, [
      {
        id: 'W48',
        reason: 'No need to use encryption',
      },
    ]);

    logProcessorFn.addEventSource(
      new eventsources.SqsEventSource(logEventQueue, {
        batchSize: 1,
      })
    );

    // Add the S3 event on the log bucket with the target is sqs queue
    logBucket.addEventNotification(
      s3.EventType.OBJECT_CREATED,
      new s3n.SqsDestination(logEventQueue),
      {
        prefix: props.logBucketPrefix,
        suffix: props.logBucketSuffix,
      }
    );
    // Only enable it in these scenarios
    //1.when deploy in current account
    //2.log_type is the Lambda or the RDS in cross account
    Aspects.of(this).add(
      new InjectS3NotificationCondition(isEnableS3Notification)
    );

    // Grant access to log processor lambda
    const backupBucket = s3.Bucket.fromBucketName(
      this,
      'backupBucket',
      props.backupBucketName
    );
    backupBucket.grantWrite(logProcessorFn);

    logEventQueue.addToResourcePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        conditions: {
          ArnLike: {
            'aws:SourceArn': logBucket.bucketArn,
          },
        },
        principals: [new iam.ServicePrincipal('s3.amazonaws.com')],
        resources: [logEventQueue.queueArn],
        actions: [
          'sqs:SendMessage',
          'sqs:GetQueueAttributes',
          'sqs:GetQueueUrl',
        ],
      })
    );

    logEventQueue.addToResourcePolicy(
      new iam.PolicyStatement({
        actions: ['sqs:*'],
        effect: iam.Effect.DENY,
        resources: [logEventQueue.queueArn],
        conditions: {
          ['Bool']: {
            'aws:SecureTransport': 'false',
          },
        },
        principals: [new iam.AnyPrincipal()],
      })
    );

    // Lambda to enable bucket notification of log source account.
    const logSourceS3NotificationFn = new lambda.Function(
      this,
      'logSourceS3NotificationFn',
      {
        description: `${Aws.STACK_NAME} - Create Log Source S3 Notification Processor`,
        runtime: lambda.Runtime.PYTHON_3_9,
        handler: 'log_source_s3_bucket_policy_processor.lambda_handler',
        code: lambda.Code.fromAsset(
          path.join(
            __dirname,
            '../../../lambda/pipeline/common/custom-resource/'
          )
        ),
        memorySize: 256,
        timeout: Duration.seconds(60),
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
          LOG_EVENT_QUEUE_NAME: logEventQueue.queueName,
          LOG_EVENT_QUEUE_URL: logEventQueue.queueUrl,
          LOG_EVENT_QUEUE_ARN: logEventQueue.queueArn,
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
    this.enable({ construct: logSourceS3NotificationFn, if: isCrossAccount });
    this.enable({
      construct: logSourceS3NotificationProvider,
      if: isCrossAccount,
    });
    this.enable({
      construct: logSourceS3NotificationlambdaTrigger,
      if: isCrossAccount,
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
