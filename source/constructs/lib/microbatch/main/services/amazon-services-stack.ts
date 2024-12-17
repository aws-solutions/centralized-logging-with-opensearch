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

import { Aws, aws_ssm as ssm } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { InitAthenaStack } from './athena/init-athena-stack';
import { InitDynamoDBDataStack } from './dynamodb/init-dynamodb-data-stack';
import { InitDynamoDBStack } from './dynamodb/init-dynamodb-stack';
import { InitGlueStack } from './glue/init-glue-stack';
import { InitIAMStack } from './iam/init-iam-stack';
import { InitKMSStack } from './kms/init-kms-stack';
import { InitLambdaStack } from './lambda/init-lambda-stack';
import { InitS3Stack } from './s3/init-s3-stack';
import { InitSNSStack } from './sns/init-sns-stack';
import { InitSQSStack } from './sqs/init-sqs-stack';
import { InitStepFunctionStack } from './stepfunction/init-sfn-stack';
import { InitVPCStack } from './vpc/init-vpc-stack';

export interface MicroBatchProps {
  readonly solutionId: string;
  readonly solutionName: string;
  readonly stackPrefix: string;
  readonly emailAddress: string;
  readonly SESState: string;
  CMKArn?: string;
  vpc?: string;
  privateSubnets?: Array<string>;
}

export class MicroBatchStack extends Construct {
  readonly microBatchVPCStack: InitVPCStack;
  readonly microBatchS3Stack: InitS3Stack;
  readonly microBatchIAMStack: InitIAMStack;
  readonly microBatchDDBStack: InitDynamoDBStack;
  readonly microBatchSQSStack: InitSQSStack;
  readonly microBatchLambdaStack: InitLambdaStack;
  readonly microBatchSFNStack: InitStepFunctionStack;
  readonly microBatchGlueStack: InitGlueStack;
  readonly microBatchAthenaStack: InitAthenaStack;
  readonly microBatchDynamoDBDataStack: InitDynamoDBDataStack;
  readonly microBatchSNSStack: InitSNSStack;
  readonly microBatchKMSStack: InitKMSStack;

  constructor(scope: Construct, id: string, props: MicroBatchProps) {
    super(scope, id);

    let solutionId = props.solutionId;
    let solutionName = props.solutionName;
    let stackPrefix = props.stackPrefix;
    let emailAddress = props.emailAddress;
    let SESState = props.SESState;

    // !!! Do not modify the execution order !!!

    // Create a default VPC
    this.microBatchVPCStack = new InitVPCStack(this, 'VPC', props);

    // Create a default KMS
    this.microBatchKMSStack = new InitKMSStack(this, 'KMS', props);

    // Create a default logging bucket
    this.microBatchS3Stack = new InitS3Stack(this, 'S3', {
      solutionId: solutionId,
      microBatchKMSStack: this.microBatchKMSStack,
    });

    // Init Glue
    this.microBatchGlueStack = new InitGlueStack(this, 'Glue', {
      solutionId: solutionId,
      solutionName: solutionName,
      stackPrefix: stackPrefix,
    });

    // Init Athena
    this.microBatchAthenaStack = new InitAthenaStack(this, 'Athena', {
      solutionId: solutionId,
      solutionName: solutionName,
      stagingBucket: this.microBatchS3Stack.StagingBucket,
      microBatchKMSStack: this.microBatchKMSStack,
    });

    // Init IAM
    this.microBatchIAMStack = new InitIAMStack(this, 'IAM', {
      solutionId: solutionId,
      solutionName: solutionName,
      stagingBucket: this.microBatchS3Stack.StagingBucket,
      microBatchKMSStack: this.microBatchKMSStack,
      microBatchGlueStack: this.microBatchGlueStack,
      microBatchAthenaStack: this.microBatchAthenaStack,
    });

    // Init DynamoDB
    this.microBatchDDBStack = new InitDynamoDBStack(this, 'DynamoDB', {
      solutionId: solutionId,
      microBatchKMSStack: this.microBatchKMSStack,
    });

    // Init SQS
    this.microBatchSQSStack = new InitSQSStack(this, 'SQS', {
      solutionId: solutionId,
      microBatchKMSStack: this.microBatchKMSStack,
    });

    // Init SNS
    this.microBatchSNSStack = new InitSNSStack(this, 'SNS', {
      solutionId: solutionId,
      emailAddress: emailAddress,
      microBatchKMSStack: this.microBatchKMSStack,
    });

    // Init Lambda
    this.microBatchLambdaStack = new InitLambdaStack(this, 'Lambda', {
      solutionId: solutionId,
      solutionName: solutionName,
      emailAddress: emailAddress,
      SESState: SESState,
      microBatchDDBStack: this.microBatchDDBStack,
      microBatchSQSStack: this.microBatchSQSStack,
      microBatchIAMStack: this.microBatchIAMStack,
      microBatchVPCStack: this.microBatchVPCStack,
      microBatchSNSStack: this.microBatchSNSStack,
    });

    // Init Step Function
    this.microBatchSFNStack = new InitStepFunctionStack(this, 'StepFunction', {
      solutionId: solutionId,
      solutionName: solutionName,
      stagingBucket: this.microBatchS3Stack.StagingBucket,
      microBatchLambdaStack: this.microBatchLambdaStack,
      microBatchIAMStack: this.microBatchIAMStack,
      microBatchDDBStack: this.microBatchDDBStack,
      microBatchAthenaStack: this.microBatchAthenaStack,
      microBatchSNSStack: this.microBatchSNSStack,
      microBatchKMSStack: this.microBatchKMSStack,
      microBatchSQSStack: this.microBatchSQSStack,
    });

    // Init Meta Data into DynamoDB
    this.microBatchDynamoDBDataStack = new InitDynamoDBDataStack(
      this,
      'DynamoDBData',
      {
        solutionId: solutionId,
        solutionName: solutionName,
        emailAddress: emailAddress,
        SESState: SESState,
        stagingBucket: this.microBatchS3Stack.StagingBucket,
        microBatchSQSStack: this.microBatchSQSStack,
        microBatchDDBStack: this.microBatchDDBStack,
        microBatchIAMStack: this.microBatchIAMStack,
        microBatchLambdaStack: this.microBatchLambdaStack,
        microBatchAthenaStack: this.microBatchAthenaStack,
        microBatchSFNStack: this.microBatchSFNStack,
        microBatchKMSStack: this.microBatchKMSStack,
        microBatchGlueStack: this.microBatchGlueStack,
        microBatchSNSStack: this.microBatchSNSStack,
      }
    );

    const MicroBatchStackName = new ssm.StringParameter(
      this,
      'MicroBatchStackName',
      {
        parameterName: '/MicroBatch/StackName',
        stringValue: Aws.STACK_NAME,
      }
    );

    // Override the logical ID
    const cfnMicroBatchStackName = MicroBatchStackName.node
      .defaultChild as ssm.CfnParameter;
    cfnMicroBatchStackName.overrideLogicalId('MicroBatchStackName');
  }
}
