// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { aws_iam as iam, aws_s3 as s3 } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { InitSFNAthenaWorkflowStack } from './init-sfn-athena-workflow-stack';
import { InitStepFunctionLogArchiveStack } from './init-sfn-logarchive-stack';
import { InitStepFunctionLogMergerStack } from './init-sfn-logmerger-stack';
import { InitStepFunctionLogProcessorStack } from './init-sfn-logprocessor-stack';
import { InitAthenaStack } from '../athena/init-athena-stack';
import { InitDynamoDBStack } from '../dynamodb/init-dynamodb-stack';
import { InitIAMStack } from '../iam/init-iam-stack';
import { InitKMSStack } from '../kms/init-kms-stack';
import { InitLambdaStack } from '../lambda/init-lambda-stack';
import { InitSNSStack } from '../sns/init-sns-stack';
import { InitSQSStack } from '../sqs/init-sqs-stack';

export interface InitStepFunctionProps {
  readonly solutionId: string;
  readonly solutionName: string;
  readonly stagingBucket: s3.Bucket;
  readonly microBatchLambdaStack: InitLambdaStack;
  readonly microBatchIAMStack: InitIAMStack;
  readonly microBatchDDBStack: InitDynamoDBStack;
  readonly microBatchAthenaStack: InitAthenaStack;
  readonly microBatchSNSStack: InitSNSStack;
  readonly microBatchKMSStack: InitKMSStack;
  readonly microBatchSQSStack: InitSQSStack;
}

export class InitStepFunctionStack extends Construct {
  readonly AthenaWorkflowStack: InitSFNAthenaWorkflowStack;
  readonly LogProcessorStack: InitStepFunctionLogProcessorStack;
  readonly LogMergerStack: InitStepFunctionLogMergerStack;
  readonly LogArchiveStack: InitStepFunctionLogArchiveStack;

  constructor(scope: Construct, id: string, props: InitStepFunctionProps) {
    super(scope, id);

    let S3ObjectMigrationRole =
      props.microBatchLambdaStack.S3ObjectMigrationStack.S3ObjectMigrationRole;
    let PipelineResourcesBuilderRole =
      props.microBatchLambdaStack.PipelineResourcesBuilderStack
        .PipelineResourcesBuilderRole;
    let ETLHelperRole =
      props.microBatchLambdaStack.ETLHelperStack.ETLHelperRole;
    let mainTaskId = '00000000-0000-0000-0000-000000000000';

    this.AthenaWorkflowStack = new InitSFNAthenaWorkflowStack(
      this,
      'StepFunctionAthenaWorkflowStack',
      {
        solutionId: props.solutionId,
        stagingBucket: props.stagingBucket,
        microBatchLambdaStack: props.microBatchLambdaStack,
        microBatchIAMStack: props.microBatchIAMStack,
        microBatchKMSStack: props.microBatchKMSStack,
      }
    );

    this.LogProcessorStack = new InitStepFunctionLogProcessorStack(
      this,
      'StepFunctionLogProcessorStack',
      {
        solutionId: props.solutionId,
        stagingBucket: props.stagingBucket,
        mainTaskId: mainTaskId,
        AthenaWorkflowStack: this.AthenaWorkflowStack,
        microBatchLambdaStack: props.microBatchLambdaStack,
        microBatchIAMStack: props.microBatchIAMStack,
        microBatchDDBStack: props.microBatchDDBStack,
        microBatchAthenaStack: props.microBatchAthenaStack,
        microBatchSNSStack: props.microBatchSNSStack,
        microBatchKMSStack: props.microBatchKMSStack,
        microBatchSQSStack: props.microBatchSQSStack,
      }
    );
    this.LogMergerStack = new InitStepFunctionLogMergerStack(
      this,
      'StepFunctionLogMergerStack',
      {
        solutionId: props.solutionId,
        stagingBucket: props.stagingBucket,
        mainTaskId: mainTaskId,
        microBatchLambdaStack: props.microBatchLambdaStack,
        microBatchDDBStack: props.microBatchDDBStack,
        microBatchAthenaStack: props.microBatchAthenaStack,
        microBatchSNSStack: props.microBatchSNSStack,
        microBatchIAMStack: props.microBatchIAMStack,
        microBatchSQSStack: props.microBatchSQSStack,
      }
    );
    this.LogArchiveStack = new InitStepFunctionLogArchiveStack(
      this,
      'StepFunctionLogArchiveStack',
      {
        solutionId: props.solutionId,
        stagingBucket: props.stagingBucket,
        mainTaskId: mainTaskId,
        microBatchLambdaStack: props.microBatchLambdaStack,
        microBatchDDBStack: props.microBatchDDBStack,
        microBatchAthenaStack: props.microBatchAthenaStack,
        microBatchSNSStack: props.microBatchSNSStack,
        microBatchIAMStack: props.microBatchIAMStack,
        microBatchSQSStack: props.microBatchSQSStack,
      }
    );

    // Create a Step Funtion Callback policy
    const S3ObjectMigrationCallbackSFNPolicy = new iam.Policy(
      this,
      'S3ObjectMigrationCallbackSFN',
      {
        statements: [
          new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
              'states:SendTaskSuccess',
              'states:SendTaskFailure',
              'states:SendTaskHeartbeat',
            ],
            resources: [
              `${this.LogProcessorStack.LogProcessor.stateMachineArn}`,
              `${this.LogMergerStack.LogMerger.stateMachineArn}`,
              `${this.LogArchiveStack.LogArchive.stateMachineArn}`,
            ],
          }),
        ],
      }
    );

    // Override the logical ID
    const cfnS3ObjectMigrationCallbackSFNPolicy =
      S3ObjectMigrationCallbackSFNPolicy.node.defaultChild as iam.CfnPolicy;
    cfnS3ObjectMigrationCallbackSFNPolicy.overrideLogicalId(
      'S3ObjectMigrationCallbackSFN'
    );

    S3ObjectMigrationRole.attachInlinePolicy(
      S3ObjectMigrationCallbackSFNPolicy
    );
    ETLHelperRole.attachInlinePolicy(S3ObjectMigrationCallbackSFNPolicy);

    // Create a Step Function policy For pipeline resources builder to pass role to scheduler
    const SFNPassRolePolicy = new iam.Policy(this, 'SFNPassRolePolicy', {
      statements: [
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: ['iam:PassRole'],
          resources: [
            `${this.LogProcessorStack.LogProcessorStartExecutionRole.roleArn}`,
            `${this.LogMergerStack.LogMergerStartExecutionRole.roleArn}`,
            `${this.LogArchiveStack.LogArchiveStartExecutionRole.roleArn}`,
          ],
        }),
      ],
    });

    // Override the logical ID
    const cfnSFNPassRolePolicy = SFNPassRolePolicy.node
      .defaultChild as iam.CfnPolicy;
    cfnSFNPassRolePolicy.overrideLogicalId('SFNPassRolePolicy');

    PipelineResourcesBuilderRole.attachInlinePolicy(SFNPassRolePolicy);

    // Create a Step Function policy For metadata writer to update assume role policy
    const UpdateAssumeRolePolicy = new iam.Policy(
      this,
      'UpdateAssumeRolePolicy',
      {
        statements: [
          new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: ['iam:GetRole', 'iam:UpdateAssumeRolePolicy'],
            resources: [
              `${this.LogProcessorStack.LogProcessorStartExecutionRole.roleArn}`,
              `${this.LogMergerStack.LogMergerStartExecutionRole.roleArn}`,
              `${this.LogArchiveStack.LogArchiveStartExecutionRole.roleArn}`,
            ],
          }),
        ],
      }
    );

    // Override the logical ID
    const cfnUpdateAssumeRolePolicy = UpdateAssumeRolePolicy.node
      .defaultChild as iam.CfnPolicy;
    cfnUpdateAssumeRolePolicy.overrideLogicalId('UpdateAssumeRolePolicy');

    props.microBatchLambdaStack.MetadataWriterStack.MetadataWriterRole.attachInlinePolicy(
      UpdateAssumeRolePolicy
    );
  }
}
