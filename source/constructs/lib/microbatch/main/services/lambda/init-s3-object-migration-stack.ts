// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import * as path from 'path';
import {
  Aws,
  Duration,
  SymlinkFollowMode,
  Size,
  aws_iam as iam,
  aws_lambda as lambda,
  aws_ec2 as ec2,
} from 'aws-cdk-lib';
import { SqsEventSource } from 'aws-cdk-lib/aws-lambda-event-sources';
import { Construct } from 'constructs';
import { InitLambdaLayerStack } from './init-lambda-layer';
import { InitDynamoDBStack } from '../dynamodb/init-dynamodb-stack';
import { InitIAMStack } from '../iam/init-iam-stack';
import { InitSQSStack } from '../sqs/init-sqs-stack';
import { InitVPCStack } from '../vpc/init-vpc-stack';

export interface InitLambdaS3ObjectMigrationProps {
  readonly solutionId: string;
  readonly microBatchSQSStack: InitSQSStack;
  readonly microBatchDDBStack: InitDynamoDBStack;
  readonly microBatchIAMStack: InitIAMStack;
  readonly microBatchVPCStack: InitVPCStack;
  readonly microBatchLambdaLayerStack: InitLambdaLayerStack;
}

export class InitLambdaS3ObjectMigrationStack extends Construct {
  readonly S3ObjectMigration: lambda.Function;
  readonly S3ObjectMerge: lambda.Function;
  readonly S3ObjectMigrationRole: iam.Role;

  constructor(
    scope: Construct,
    id: string,
    props: InitLambdaS3ObjectMigrationProps
  ) {
    super(scope, id);

    let solutionId = props.solutionId;
    let microBatchDDBStack = props.microBatchDDBStack;
    let microBatchSQSStack = props.microBatchSQSStack;
    let microBatchIAMStack = props.microBatchIAMStack;
    let microBatchVPCStack = props.microBatchVPCStack;
    let microBatchLambdaLayerStack = props.microBatchLambdaLayerStack;

    // Create a Role for Lambda:S3ObjectMigration
    this.S3ObjectMigrationRole = new iam.Role(this, 'S3ObjectMigrationRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
    });

    // Override the logical ID
    const cfnS3ObjectMigrationRole = this.S3ObjectMigrationRole.node
      .defaultChild as iam.CfnRole;
    cfnS3ObjectMigrationRole.overrideLogicalId('S3ObjectMigrationRole');

    const S3ObjectMigrationRWDDBPolicy = new iam.Policy(
      this,
      'S3ObjectMigrationRWDDBPolicy',
      {
        statements: [
          new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
              'dynamodb:GetItem',
              'dynamodb:Scan',
              'dynamodb:Query',
              'dynamodb:UpdateItem',
            ],
            resources: [`${microBatchDDBStack.ETLLogTable.tableArn}`],
          }),
        ],
      }
    );

    // Override the logical ID
    const cfnS3ObjectMigrationRWDDBPolicy = S3ObjectMigrationRWDDBPolicy.node
      .defaultChild as iam.CfnPolicy;
    cfnS3ObjectMigrationRWDDBPolicy.overrideLogicalId(
      'S3ObjectMigrationRWDDBPolicy'
    );

    const S3ObjectMigrationRWSQSPolicy = new iam.Policy(
      this,
      'S3ObjectMigrationRWSQSPolicy',
      {
        statements: [
          new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
              'sqs:ReceiveMessage',
              'sqs:DeleteMessage',
              'sqs:GetQueueAttributes',
              'sqs:ChangeMessageVisibility',
              'sqs:GetQueueUrl',
            ],
            resources: [
              `${microBatchSQSStack.S3ObjectMigrationQ.queueArn}`,
              `${microBatchSQSStack.S3ObjectMigrationDLQ.queueArn}`,
              `${microBatchSQSStack.S3ObjectMergeQ.queueArn}`,
              `${microBatchSQSStack.S3ObjectMergeDLQ.queueArn}`,
            ],
          }),
        ],
      }
    );

    // Override the logical ID
    const cfnS3ObjectMigrationRWSQSPolicy = S3ObjectMigrationRWSQSPolicy.node
      .defaultChild as iam.CfnPolicy;
    cfnS3ObjectMigrationRWSQSPolicy.overrideLogicalId(
      'S3ObjectMigrationRWSQSPolicy'
    );

    this.S3ObjectMigrationRole.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName(
        'service-role/AWSLambdaBasicExecutionRole'
      )
    );
    this.S3ObjectMigrationRole.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName(
        'service-role/AWSLambdaVPCAccessExecutionRole'
      )
    );
    this.S3ObjectMigrationRole.addManagedPolicy(
      microBatchIAMStack.S3PublicAccessPolicy
    );
    this.S3ObjectMigrationRole.addManagedPolicy(
      microBatchIAMStack.KMSPublicAccessPolicy
    );
    this.S3ObjectMigrationRole.attachInlinePolicy(S3ObjectMigrationRWDDBPolicy);
    this.S3ObjectMigrationRole.attachInlinePolicy(S3ObjectMigrationRWSQSPolicy);

    // Create a lambda to handle all cluster related APIs.
    this.S3ObjectMigration = new lambda.Function(this, 'S3ObjectMigration', {
      code: lambda.AssetCode.fromAsset(
        path.join(
          __dirname,
          '../../../../../lambda/microbatch/s3_object_migration'
        ),
        {
          followSymlinks: SymlinkFollowMode.ALWAYS,
        }
      ),
      runtime: lambda.Runtime.PYTHON_3_11,
      handler: 'lambda_function.lambda_handler',
      timeout: Duration.minutes(15),
      memorySize: 256,
      role: this.S3ObjectMigrationRole.withoutPolicyUpdates(),
      layers: [microBatchLambdaLayerStack.microBatchLambdaUtilsLayer],
      environment: {
        SOLUTION_VERSION: process.env.VERSION || 'v1.0.0',
        SOLUTION_ID: solutionId,
        ETL_LOG_TABLE_NAME: microBatchDDBStack.ETLLogTable.tableName,
      },
      vpc: microBatchVPCStack.vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      securityGroups: [microBatchVPCStack.privateSecurityGroup],
      description: `${Aws.STACK_NAME} - Lambda function to migration objects on S3.`,
    });

    // Override the logical ID
    const cfnS3ObjectMigration = this.S3ObjectMigration.node
      .defaultChild as lambda.CfnFunction;
    cfnS3ObjectMigration.overrideLogicalId('S3ObjectMigration');

    this.S3ObjectMigration.node.addDependency(S3ObjectMigrationRWSQSPolicy);

    const S3ObjectMigrationEventSource = new SqsEventSource(
      microBatchSQSStack.S3ObjectMigrationQ,
      {
        batchSize: 1,
      }
    );
    this.S3ObjectMigration.addEventSource(S3ObjectMigrationEventSource);

    // Create a lambda to handle all cluster related APIs.
    this.S3ObjectMerge = new lambda.Function(this, 'S3ObjectMerge', {
      code: lambda.AssetCode.fromAsset(
        path.join(
          __dirname,
          '../../../../../lambda/microbatch/s3_object_migration'
        ),
        {
          followSymlinks: SymlinkFollowMode.ALWAYS,
        }
      ),
      runtime: lambda.Runtime.PYTHON_3_11,
      handler: 'lambda_function.lambda_handler',
      timeout: Duration.minutes(15),
      memorySize: 1024,
      ephemeralStorageSize: Size.mebibytes(2048),
      role: this.S3ObjectMigrationRole.withoutPolicyUpdates(),
      layers: [
        microBatchLambdaLayerStack.microBatchLambdaUtilsLayer,
        microBatchLambdaLayerStack.microBatchLambdaPyarrowLayer,
      ],
      environment: {
        SOLUTION_VERSION: process.env.VERSION || 'v1.0.0',
        SOLUTION_ID: solutionId,
        ETL_LOG_TABLE_NAME: microBatchDDBStack.ETLLogTable.tableName,
      },
      vpc: microBatchVPCStack.vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      securityGroups: [microBatchVPCStack.privateSecurityGroup],
      description: `${Aws.STACK_NAME} - Lambda function to merge objects on S3.`,
    });

    // Override the logical ID
    const cfnS3ObjectMerge = this.S3ObjectMerge.node
      .defaultChild as lambda.CfnFunction;
    cfnS3ObjectMerge.overrideLogicalId('S3ObjectMerge');

    this.S3ObjectMerge.node.addDependency(S3ObjectMigrationRWSQSPolicy);

    const S3ObjectMergeEventSource = new SqsEventSource(
      microBatchSQSStack.S3ObjectMergeQ,
      {
        batchSize: 1,
      }
    );

    this.S3ObjectMerge.addEventSource(S3ObjectMergeEventSource);
  }
}
