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
  aws_sqs as sqs,
  aws_lambda as lambda,
  aws_kms as kms,
  aws_s3_notifications as s3n,
  aws_stepfunctions_tasks as tasks,
  aws_stepfunctions as sfn,
  custom_resources as cr,
  aws_logs as logs,
  CfnParameter,
  Stack,
} from 'aws-cdk-lib';
import { Table } from 'aws-cdk-lib/aws-dynamodb';
import { CfnRole } from 'aws-cdk-lib/aws-iam';
import { NagSuppressions } from 'cdk-nag';
import { Construct, IConstruct } from 'constructs';
import { SharedPythonLayer } from '../../layer/layer';
import { UseS3BucketNotificationsWithRetryAspects } from '../../util/stack-helper';
import { S3toOpenSearchStackProps } from '../service/s3-to-opensearch-common-stack';

export interface S3toOpenSearchOSIStackProps extends S3toOpenSearchStackProps {
  /**
   * App Ingestion Table ARN
   *
   * @default - None.
   */
  readonly pipelineTableArn?: string;
  /**
   * OSI Pipeline Name.
   *
   * @default - None.
   */
  readonly osiPipelineName?: string;

  /**
   * OSI Processor Role.
   *
   * @default - None.
   */
  readonly osiProcessorRole: iam.Role;

  readonly domainName?: string;
  /**
   * OpenSearch Endpoint Url
   *
   * @default - None.
   */
  readonly endpoint?: string;

  /**
   * Index Prefix
   *
   * @default - None.
   */
  readonly indexPrefix?: string;

  /**
   * Backup bucket name
   *
   * @default - None.
   */
  readonly backupBucketName?: string;

  readonly minCapacity?: string;
  readonly maxCapacity?: string;
}

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

export class S3toOpenSearchOSIStack extends Construct {
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
            new iam.ServicePrincipal('osis-pipelines.amazonaws.com'),
          ],
        }),
      ],
    }),
  });

  constructor(
    scope: Construct,
    id: string,
    props: S3toOpenSearchOSIStackProps
  ) {
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

    const pipelineTable = Table.fromTableArn(
      this,
      'IngestionTable',
      props.pipelineTableArn!
    );

    // Grant permissions to the lambda
    const osiProcessorFlowFnPolicy = new iam.Policy(
      this,
      'OSIProcessorFlowFnPolicy',
      {
        statements: [
          new iam.PolicyStatement({
            actions: ['dynamodb:UpdateItem'],
            resources: [pipelineTable.tableArn],
          }),
          new iam.PolicyStatement({
            actions: [
              'osis:StartPipeline',
              'osis:CreatePipeline',
              'osis:DeletePipeline',
              'osis:GetPipeline',
              'osis:ListPipelines',
              'osis:ListPipelineBlueprints',
              'osis:ValidatePipeline',
              'osis:GetPipelineBlueprint',
              'osis:StopPipeline',
              'osis:GetPipelineChangeProgress',
              'osis:ListTagsForResource',
              'osis:UpdatePipeline',
              'osis:TagResource',
            ],
            resources: ['*'],
          }),
          new iam.PolicyStatement({
            actions: [
              'logs:GetLogEvents',
              'logs:PutLogEvents',
              'logs:CreateLogDelivery',
              'logs:PutResourcePolicy',
              'logs:DescribeResourcePolicies',
              'logs:GetLogDelivery',
              'logs:ListLogDeliveries',
              'logs:UpdateLogDelivery',
              'logs:DeleteLogDelivery',
            ],
            resources: ['*'],
          }),
        ],
      }
    );

    NagSuppressions.addResourceSuppressions(osiProcessorFlowFnPolicy, [
      {
        id: 'AwsSolutions-IAM5',
        reason:
          'This policy needs to be able to start/delete other cloudformation stacks of the plugin with unknown resources names',
      },
    ]);

    // Create the Log Group for the Lambda function
    const logGroup = new logs.LogGroup(this, 'LogProcessorFnLogGroup', {
      logGroupName: `/aws/vendedlogs/OSI/${props.osiPipelineName}/audit-logs`,
      removalPolicy: RemovalPolicy.DESTROY,
    });
    this.logProcessorLogGroupName = logGroup.logGroupName;

    const logProcessorRoleName = new CfnParameter(
      this,
      'LogProcessorRoleName',
      {
        type: 'String',
        default: '',
        description:
          'Specify a role name for the log processor. The name should NOT duplicate an existing role name. If no name is specified, a random name is generated. (Optional)',
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

    // No cross-account distinction is made here
    logBucket.grantRead(props.logProcessorFn);

    props.logProcessorFn.role!.attachInlinePolicy(logProcessorPolicy);

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

    const logEventQueue = new sqs.Queue(this, 'LogEventQueue', {
      visibilityTimeout: Duration.seconds(910),
      retentionPeriod: Duration.days(14),
      deadLetterQueue: {
        queue: logEventDLQ,
        maxReceiveCount: 3,
      },
      encryption: sqs.QueueEncryption.KMS,
      dataKeyReuse: Duration.minutes(5),
      encryptionMasterKey: sqsKMSKey,
    });
    this.logEventQueueArn = logEventQueue.queueArn;
    this.logEventQueueName = logEventQueue.queueName;

    const cfnLogEventQueue = logEventQueue.node.defaultChild as sqs.CfnQueue;
    cfnLogEventQueue.overrideLogicalId('LogEventQueue');
    addCfnNagSuppressRules(cfnLogEventQueue, [
      {
        id: 'W48',
        reason: 'No need to use encryption',
      },
    ]);

    // Role for state machine
    const osiProcessorRole = props.osiProcessorRole;

    //osi pipeline es role policy
    osiProcessorRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ['es:DescribeDomain'],
        effect: iam.Effect.ALLOW,
        resources: [
          `arn:${Aws.PARTITION}:es:${Aws.REGION}:${Aws.ACCOUNT_ID}:domain/${props.domainName}`,
        ],
      })
    );

    //osi pipeline s3 role policy
    osiProcessorRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ['s3:GetObject'],
        effect: iam.Effect.ALLOW,
        resources: [`arn:aws:s3:::${logBucket.bucketName}/*`],
      })
    );

    //osi pipeline s3 dlq role policy
    osiProcessorRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ['s3:PutObject'],
        effect: iam.Effect.ALLOW,
        resources: [`arn:aws:s3:::${props.backupBucketName}/*`],
      })
    );

    //osi pipeline sqs role policy
    osiProcessorRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ['sqs:DeleteMessage', 'sqs:ReceiveMessage'],
        effect: iam.Effect.ALLOW,
        resources: [
          `arn:aws:sqs:${Aws.REGION}:${Aws.ACCOUNT_ID}:${logEventQueue.queueName}`,
          `arn:aws:sqs:${Aws.REGION}:${Aws.ACCOUNT_ID}:${logEventDLQ.queueName}`,
        ],
      })
    );
    osiProcessorRole.addToPolicy(
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
      })
    );

    // Create a lambda layer with required python packages.
    const osiProcessorFlowFnLayer = new lambda.LayerVersion(
      this,
      'osiProcessorFlowFnLayer',
      {
        code: lambda.Code.fromAsset(
          path.join(__dirname, '../../../lambda/api/pipeline_ingestion_flow'),
          {
            bundling: {
              platform: 'linux/amd64',
              image: lambda.Runtime.PYTHON_3_11.bundlingImage,
              command: [
                'bash',
                '-c',
                'pip install -r requirements.txt -t /asset-output/python && cp . -r /asset-output/python/',
              ],
            },
          }
        ),
        compatibleRuntimes: [lambda.Runtime.PYTHON_3_11],
        description: 'Default Lambda layer for OSIProcessorIngestionFlowFn',
      }
    );

    // Create a Lambda to handle the status update to backend table.
    const osiProcessorFlowFn = new lambda.Function(this, 'OSIProcessorFlowFn', {
      code: lambda.AssetCode.fromAsset(
        path.join(__dirname, '../../../lambda/api/pipeline_ingestion_flow')
      ),
      runtime: lambda.Runtime.PYTHON_3_11,
      handler: 'osi_processor_flow.lambda_handler',
      timeout: Duration.seconds(60),
      memorySize: 128,
      layers: [SharedPythonLayer.getInstance(this), osiProcessorFlowFnLayer],
      environment: {
        SOLUTION_ID: props.solutionId,
        LOG_TYPE: props.logType,
        LOG_SOURCE_ACCOUNT_ID: props.logSourceAccountId,
        LOG_SOURCE_REGION: props.logSourceRegion,
        LOG_SOURCE_ACCOUNT_ASSUME_ROLE: props.logSourceAccountAssumeRole,
        BACKUP_BUCKET_NAME: props.backupBucketName || '',
        PIPELINE_TABLE_NAME: pipelineTable.tableName,
        MAX_CAPACITY: props.maxCapacity || '4',
        MIN_CAPACITY: props.minCapacity || '1',
        SOLUTION_VERSION: process.env.VERSION || 'v1.0.0',
        LOG_PROCESSOR_GROUP_NAME: this.logProcessorLogGroupName,
        OSI_PIPELINE_NAME: props.osiPipelineName || 'default_pipeline_name',
        SQS_QUEUE_URL: logEventQueue.queueUrl,
        OSI_PROCESSOR_ROLE_NAME: osiProcessorRole.roleName,
        AOS_ENDPOINT: props.endpoint || '',
        AOS_INDEX: props.indexPrefix || '',
      },
      description: `${Aws.STACK_NAME} - Helper function to update pipeline status and create & delete OSI pipeline`,
    });

    osiProcessorFlowFn.role!.attachInlinePolicy(osiProcessorFlowFnPolicy);

    // Grant permissions to the lambda
    const passRolePolicy = new iam.Policy(
      this,
      'OSIProcessorFlowPassRolePolicy',
      {
        statements: [
          new iam.PolicyStatement({
            actions: ['iam:PassRole'],
            resources: [osiProcessorRole.roleArn],
          }),
        ],
      }
    );
    osiProcessorFlowFn.role!.attachInlinePolicy(passRolePolicy);

    pipelineTable.grantReadWriteData(osiProcessorFlowFn);

    // Add the S3 event on the log bucket with the target is sqs queue
    logBucket.addEventNotification(
      s3.EventType.OBJECT_CREATED,
      new s3n.SqsDestination(logEventQueue),
      {
        prefix: props.logBucketPrefix,
        suffix: props.logBucketSuffix,
      }
    );

    // Workaround since cdk>=v2.116.0 builtin custom resource lambda has an issue that will lead to remove all existing s3 bucket notifications. Remove this once the cdk issue is fixed.
    const notificationHandler = Stack.of(this).node.tryFindChild(
      'BucketNotificationsHandler050a0587b7544547bf325f094a3db834'
    );
    if (notificationHandler) {
      Aspects.of(notificationHandler).add(
        new UseS3BucketNotificationsWithRetryAspects()
      );
    }

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

    // Role for state machine
    const pipelineFlowSMRole = new iam.Role(this, 'SMRole', {
      assumedBy: new iam.ServicePrincipal('states.amazonaws.com'),
    });
    // Least Privilage to enable logging for state machine
    pipelineFlowSMRole.addToPolicy(
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
    pipelineFlowSMRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ['lambda:InvokeFunction'],
        effect: iam.Effect.ALLOW,
        resources: [
          osiProcessorFlowFn.functionArn,
          `${osiProcessorFlowFn.functionArn}:*`,
        ],
      })
    );

    const wait = new sfn.Wait(this, 'Wait for 15 seconds', {
      time: sfn.WaitTime.duration(Duration.seconds(15)),
    });

    const osiStatusQueryFnTask = new tasks.LambdaInvoke(
      this,
      'Query Pipeline Status',
      {
        lambdaFunction: osiProcessorFlowFn,
        outputPath: '$.Payload',
        inputPath: '$',
      }
    );

    const osiStatusUpdateFnTask = new tasks.LambdaInvoke(
      this,
      'Update Pipeline Status',
      {
        lambdaFunction: osiProcessorFlowFn,
        outputPath: '$.Payload',
        inputPath: '$',
      }
    );

    const pipelineCompleted = new sfn.Choice(this, 'In progress?')
      .when(
        sfn.Condition.stringMatches(
          '$.result.osiPipelineStatus',
          '*_IN_PROGRESS'
        ),
        wait
      )
      .otherwise(osiStatusUpdateFnTask);

    const pipelineCreationFailed = new sfn.Choice(this, 'Failed?')
      .when(
        sfn.Condition.stringMatches(
          '$.result.osiPipelineStatus',
          '*_IN_PROGRESS'
        ),
        wait.next(osiStatusQueryFnTask.next(pipelineCompleted))
      )
      .otherwise(osiStatusUpdateFnTask);

    const osiCreationFnTask = new tasks.LambdaInvoke(
      this,
      'Create or Delete OSI Pipeline',
      {
        lambdaFunction: osiProcessorFlowFn,
        outputPath: '$.Payload',
        inputPath: '$',
      }
    );
    osiCreationFnTask.next(pipelineCreationFailed);

    const waitCheck = new sfn.Wait(this, 'Wait for 30 seconds', {
      time: sfn.WaitTime.duration(Duration.seconds(30)),
    });

    // This Lambda is to call logProcessorFn
    const logProcessorHelperFn = new lambda.Function(
      this,
      'LogProcessorHelperFn',
      {
        runtime: lambda.Runtime.PYTHON_3_11,
        code: lambda.Code.fromAsset(
          path.join(__dirname, '../../../lambda/api/pipeline_ingestion_flow')
        ),
        layers: [SharedPythonLayer.getInstance(this)],
        handler: 'osi_log_processor_helper.lambda_handler',
        timeout: Duration.seconds(60),
        memorySize: 128,
        environment: {
          LOG_TYPE: props.logType,
          LOG_PROCESSOR_NAME: props.logProcessorFn.functionName,
          PIPELINE_TABLE_NAME: pipelineTable.tableName,
          OSI_PIPELINE_NAME: props.osiPipelineName || 'default_pipeline_name',
        },
        description: `${Aws.STACK_NAME} - Call logProcessorHelperFn inside state machine`,
      }
    );

    pipelineTable.grantReadWriteData(logProcessorHelperFn);

    const logProcessorHelperFnPolicy = new iam.Policy(
      this,
      'logProcessorHelperFnPolicy',
      {
        statements: [
          new iam.PolicyStatement({
            actions: ['lambda:InvokeFunction'],
            resources: [
              props.logProcessorFn.functionArn,
              `${props.logProcessorFn.functionArn}:*`,
            ],
          }),
        ],
      }
    );

    logProcessorHelperFn.role?.attachInlinePolicy(logProcessorHelperFnPolicy);

    pipelineFlowSMRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ['lambda:InvokeFunction'],
        effect: iam.Effect.ALLOW,
        resources: [
          logProcessorHelperFn.functionArn,
          `${logProcessorHelperFn.functionArn}:*`,
        ],
      })
    );

    const checkProcessorDone = new tasks.LambdaInvoke(
      this,
      'Trigger processsor',
      {
        lambdaFunction: logProcessorHelperFn,
        outputPath: '$.Payload',
        inputPath: '$',
      }
    );

    const isProcessorDone = new sfn.Choice(this, 'Is processor done?')
      .when(sfn.Condition.stringMatches('$.result', 'OK'), osiCreationFnTask)
      .when(
        sfn.Condition.stringMatches('$.retryTime', '10'),
        osiStatusUpdateFnTask
      )
      .otherwise(waitCheck.next(checkProcessorDone));

    checkProcessorDone.next(isProcessorDone);

    const startOrDeleteOrCheck = new sfn.Choice(
      this,
      'START or DELETE or CHECK?'
    )
      .when(
        sfn.Condition.stringMatches('$.action', 'CHECK'),
        checkProcessorDone
      )
      .otherwise(osiCreationFnTask);

    const chain = startOrDeleteOrCheck;

    const pipeSM = new sfn.StateMachine(this, 'osiPipelineFlowSM', {
      // NOSONAR
      definitionBody: sfn.DefinitionBody.fromChainable(chain),
      role: pipelineFlowSMRole,
      logs: {
        destination: logGroup,
        level: sfn.LogLevel.ALL,
      },
      tracingEnabled: true,
    });

    // This Lambda is to perform necessary actions during stack creation or update
    const initOSIPipeSMFn = new lambda.Function(this, 'InitOSIPipeSMFn', {
      runtime: lambda.Runtime.PYTHON_3_11,
      code: lambda.Code.fromAsset(
        path.join(__dirname, '../../../lambda/pipeline/common/custom-resource')
      ),
      layers: [SharedPythonLayer.getInstance(this)],
      handler: 'osi_init_sub_stack_sfn.lambda_handler',
      timeout: Duration.seconds(60),
      memorySize: 128,
      environment: {
        STATE_MACHINE_ARN: pipeSM.stateMachineArn,
      },
      description: `${Aws.STACK_NAME} - Init SFN Handler`,
    });

    initOSIPipeSMFn.node.addDependency(pipeSM);

    initOSIPipeSMFn.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['states:StartExecution'],
        resources: [pipeSM.stateMachineArn],
      })
    );

    const crInitLambda = new cr.AwsCustomResource(this, 'CRInitLambda', {
      policy: cr.AwsCustomResourcePolicy.fromStatements([
        new iam.PolicyStatement({
          actions: ['lambda:InvokeFunction'],
          effect: iam.Effect.ALLOW,
          resources: [initOSIPipeSMFn.functionArn],
        }),
      ]),
      timeout: Duration.minutes(15),
      onCreate: {
        service: 'Lambda',
        action: 'invoke',
        parameters: {
          FunctionName: initOSIPipeSMFn.functionName,
          InvocationType: 'Event',
        },
        physicalResourceId: cr.PhysicalResourceId.of(Date.now().toString()),
      },
    });
    crInitLambda.node.addDependency(initOSIPipeSMFn);

    // This Lambda is to perform necessary actions during stack deletion
    const deleteOSIPipeSMFn = new lambda.Function(this, 'DeleteOSIPipeSMFn', {
      runtime: lambda.Runtime.PYTHON_3_11,
      code: lambda.Code.fromAsset(
        path.join(__dirname, '../../../lambda/pipeline/common/custom-resource')
      ),
      layers: [SharedPythonLayer.getInstance(this)],
      handler: 'osi_delete_sub_stack_sfn.lambda_handler',
      timeout: Duration.seconds(60),
      memorySize: 128,
      environment: {
        STATE_MACHINE_ARN: pipeSM.stateMachineArn,
      },
      description: `${Aws.STACK_NAME} - Auto-delete OSI pipeline`,
    });

    deleteOSIPipeSMFn.node.addDependency(pipeSM);

    deleteOSIPipeSMFn.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['states:StartExecution'],
        resources: [pipeSM.stateMachineArn],
      })
    );

    const crDeleteLambda = new cr.AwsCustomResource(this, 'CRDeleteLambda', {
      policy: cr.AwsCustomResourcePolicy.fromStatements([
        new iam.PolicyStatement({
          actions: ['lambda:InvokeFunction'],
          effect: iam.Effect.ALLOW,
          resources: [deleteOSIPipeSMFn.functionArn],
        }),
      ]),
      timeout: Duration.minutes(15),
      onDelete: {
        service: 'Lambda',
        action: 'invoke',
        parameters: {
          FunctionName: deleteOSIPipeSMFn.functionName,
          InvocationType: 'Event',
        },
        physicalResourceId: cr.PhysicalResourceId.of(Date.now().toString()),
      },
    });
    crDeleteLambda.node.addDependency(pipeSM);
    crDeleteLambda.node.addDependency(deleteOSIPipeSMFn);
    crDeleteLambda.node.addDependency(osiProcessorFlowFn);
    crDeleteLambda.node.addDependency(pipelineFlowSMRole);
    crDeleteLambda.node.addDependency(osiProcessorFlowFnPolicy);
    crDeleteLambda.node.addDependency(osiProcessorFlowFn.role!);
  }

  protected enable(param: { construct: IConstruct; if: CfnCondition }) {
    Aspects.of(param.construct).add(new InjectCondition(param.if));
  }
}

class InjectCondition implements IAspect {
  public constructor(private condition: CfnCondition) {}

  public visit(node: IConstruct): void {
    if (node instanceof CfnResource) {
      node.cfnOptions.condition = this.condition;
    }
  }
}

class SetRoleName implements IAspect {
  public constructor(private roleName: string) {}

  public visit(node: IConstruct): void {
    if (node instanceof CfnRole) {
      node.roleName = this.roleName;
    }
  }
}
