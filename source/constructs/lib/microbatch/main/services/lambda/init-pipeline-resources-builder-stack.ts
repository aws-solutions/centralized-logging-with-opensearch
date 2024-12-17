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
  Duration,
  SymlinkFollowMode,
  CfnOutput,
  aws_iam as iam,
  aws_lambda as lambda,
  aws_ec2 as ec2,
} from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { InitLambdaLayerStack } from './init-lambda-layer';
import { InitDynamoDBStack } from '../dynamodb/init-dynamodb-stack';
import { InitIAMStack } from '../iam/init-iam-stack';
import { InitVPCStack } from '../vpc/init-vpc-stack';

export interface InitLambdaPipelineResourcesBuilderProps {
  readonly solutionId: string;
  readonly solutionName: string;
  readonly microBatchDDBStack: InitDynamoDBStack;
  readonly microBatchIAMStack: InitIAMStack;
  readonly microBatchVPCStack: InitVPCStack;
  readonly microBatchLambdaLayerStack: InitLambdaLayerStack;
}

export class InitLambdaPipelineResourcesBuilderStack extends Construct {
  readonly PipelineResourcesBuilder: lambda.Function;
  readonly PipelineResourcesBuilderRole: iam.Role;
  readonly PipelineResourcesBuilderSchedulePolicy: iam.ManagedPolicy;

  constructor(
    scope: Construct,
    id: string,
    props: InitLambdaPipelineResourcesBuilderProps
  ) {
    super(scope, id);

    let solutionId = props.solutionId;
    let solutionName = props.solutionName;
    let microBatchDDBStack = props.microBatchDDBStack;
    let microBatchIAMStack = props.microBatchIAMStack;
    let microBatchVPCStack = props.microBatchVPCStack;
    let microBatchLambdaLayerStack = props.microBatchLambdaLayerStack;

    const PipelineResourcesBuilderPolicy = new iam.Policy(
      this,
      'PipelineResourcesBuilderPolicy',
      {
        statements: [
          new iam.PolicyStatement({
            sid: 'S3PutBucketNotification',
            effect: iam.Effect.ALLOW,
            actions: [
              's3:PutBucketNotification',
              's3:GetBucketNotification',
              's3:GetBucketPolicy',
              's3:PutBucketPolicy',
              's3:DeleteBucketPolicy',
              's3:GetBucketLocation',
            ],
            resources: [`arn:${Aws.PARTITION}:s3:::*`],
          }),
          new iam.PolicyStatement({
            sid: 'SetSQSPolicy',
            effect: iam.Effect.ALLOW,
            actions: [
              'sqs:GetQueueUrl',
              'sqs:GetQueueAttributes',
              'sqs:SetQueueAttributes',
            ],
            resources: [
              `arn:${Aws.PARTITION}:sqs:${Aws.REGION}:${Aws.ACCOUNT_ID}:*LogEventQueue*`,
              `arn:${Aws.PARTITION}:sqs:${Aws.REGION}:${Aws.ACCOUNT_ID}:*LogEventDLQ*`,
            ],
          }),
          new iam.PolicyStatement({
            sid: 'DynamoDB',
            effect: iam.Effect.ALLOW,
            actions: [
              'dynamodb:GetItem',
              'dynamodb:PutItem',
              'dynamodb:UpdateItem',
              'dynamodb:DeleteItem',
              'dynamodb:Scan',
            ],
            resources: [`${microBatchDDBStack.MetaTable.tableArn}`],
          }),
          new iam.PolicyStatement({
            sid: 'UpdatePublicPolicy',
            effect: iam.Effect.ALLOW,
            actions: [
              'iam:GetPolicyVersion',
              'iam:GetPolicy',
              'iam:CreatePolicyVersion',
              'iam:DeletePolicyVersion',
              'iam:ListPolicyVersions',
            ],
            resources: [
              microBatchIAMStack.S3PublicAccessPolicy.managedPolicyArn,
              microBatchIAMStack.SendTemplateEmailSNSPublicPolicy
                .managedPolicyArn,
            ],
          }),
        ],
      }
    );

    // Override the logical ID
    const cfnPipelineResourcesBuilderPolicy = PipelineResourcesBuilderPolicy
      .node.defaultChild as iam.CfnPolicy;
    cfnPipelineResourcesBuilderPolicy.overrideLogicalId(
      'PipelineResourcesBuilderPolicy'
    );

    this.PipelineResourcesBuilderSchedulePolicy = new iam.ManagedPolicy(
      this,
      'PipelineResourcesBuilderSchedulePolicy',
      {
        statements: [
          new iam.PolicyStatement({
            sid: 'EventBridge',
            effect: iam.Effect.ALLOW,
            actions: [
              'events:PutRule',
              'events:DeleteRule',
              'events:PutTargets',
              'events:ListRules',
              'events:ListTargetsByRule',
              'events:RemoveTargets',
            ],
            resources: [
              `arn:${Aws.PARTITION}:events:${Aws.REGION}:${Aws.ACCOUNT_ID}:rule/*/*`,
              `arn:${Aws.PARTITION}:events:${Aws.REGION}:${Aws.ACCOUNT_ID}:rule/*`,
            ],
          }),
        ],
      }
    );

    // Override the logical ID
    const cfnPipelineResourcesBuilderSchedulePolicy = this
      .PipelineResourcesBuilderSchedulePolicy.node
      .defaultChild as iam.CfnManagedPolicy;
    cfnPipelineResourcesBuilderSchedulePolicy.overrideLogicalId(
      'PipelineResourcesBuilderSchedulePolicy'
    );

    this.PipelineResourcesBuilderRole = new iam.Role(
      this,
      'PipelineResourcesBuilderRole',
      {
        assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      }
    );

    // Override the logical ID
    const cfnPipelineResourcesBuilderRole = this.PipelineResourcesBuilderRole
      .node.defaultChild as iam.CfnRole;
    cfnPipelineResourcesBuilderRole.overrideLogicalId(
      'PipelineResourcesBuilderRole'
    );

    this.PipelineResourcesBuilderRole.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName(
        'service-role/AWSLambdaBasicExecutionRole'
      )
    );
    this.PipelineResourcesBuilderRole.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName(
        'service-role/AWSLambdaVPCAccessExecutionRole'
      )
    );
    this.PipelineResourcesBuilderRole.addManagedPolicy(
      microBatchIAMStack.GluePublicAccessPolicy
    );
    this.PipelineResourcesBuilderRole.addManagedPolicy(
      microBatchIAMStack.KMSPublicAccessPolicy
    );
    this.PipelineResourcesBuilderRole.addManagedPolicy(
      this.PipelineResourcesBuilderSchedulePolicy
    );
    this.PipelineResourcesBuilderRole.attachInlinePolicy(
      PipelineResourcesBuilderPolicy
    );

    // Create a lambda to handle all pipeline resources.
    this.PipelineResourcesBuilder = new lambda.Function(
      this,
      'PipelineResourcesBuilder',
      {
        code: lambda.AssetCode.fromAsset(
          path.join(
            __dirname,
            '../../../../../lambda/microbatch/pipeline_resources_builder'
          ),
          { followSymlinks: SymlinkFollowMode.ALWAYS }
        ),
        runtime: lambda.Runtime.PYTHON_3_11,
        handler: 'lambda_function.lambda_handler',
        timeout: Duration.minutes(15),
        memorySize: 128,
        role: this.PipelineResourcesBuilderRole.withoutPolicyUpdates(),
        layers: [
          microBatchLambdaLayerStack.microBatchLambdaUtilsLayer,
          microBatchLambdaLayerStack.microBatchLambdaBoto3Layer,
        ],
        environment: {
          SOLUTION_VERSION: process.env.VERSION || 'v1.0.0',
          SOLUTION_ID: solutionId,
          META_TABLE_NAME: microBatchDDBStack.MetaTable.tableName,
          TAGS: `[{"Key": "Application", "Value": "${solutionName}"}]`,
        },
        vpc: microBatchVPCStack.vpc,
        vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
        securityGroups: [microBatchVPCStack.privateSecurityGroup],
        description: `${Aws.STACK_NAME} - Lambda function to alter table to manage all pipeline resources.`,
      }
    );

    // Override the logical ID
    const cfnPipelineResourcesBuilder = this.PipelineResourcesBuilder.node
      .defaultChild as lambda.CfnFunction;
    cfnPipelineResourcesBuilder.overrideLogicalId('PipelineResourcesBuilder');

    new CfnOutput(this, 'PipelineResourcesBuilderRoleArn', {
      description: 'Pipeline Resources Builder Role Arn',
      value: this.PipelineResourcesBuilderRole.roleArn,
      exportName: `${Aws.STACK_NAME}::PipelineResourcesBuilderRoleArn`,
    }).overrideLogicalId('PipelineResourcesBuilderRoleArn');

    new CfnOutput(this, 'PipelineResourcesBuilderArn', {
      description: 'Pipeline Resources Builder Arn',
      value: this.PipelineResourcesBuilder.functionArn,
      exportName: `${Aws.STACK_NAME}::PipelineResourcesBuilderArn`,
    }).overrideLogicalId('PipelineResourcesBuilderArn');
  }
}
