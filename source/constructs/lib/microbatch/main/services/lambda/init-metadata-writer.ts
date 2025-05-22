// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import * as path from 'path';
import {
  Aws,
  Duration,
  SymlinkFollowMode,
  aws_iam as iam,
  aws_lambda as lambda,
  aws_ec2 as ec2,
} from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { InitLambdaLayerStack } from './init-lambda-layer';
import { InitLambdaPipelineResourcesBuilderStack } from './init-pipeline-resources-builder-stack';
import { InitDynamoDBStack } from '../dynamodb/init-dynamodb-stack';
import { InitIAMStack } from '../iam/init-iam-stack';
import { InitVPCStack } from '../vpc/init-vpc-stack';

export interface InitLambdaMetadataWriterProps {
  readonly solutionId: string;
  readonly pipelineResourcesBuilderStack: InitLambdaPipelineResourcesBuilderStack;
  readonly microBatchDDBStack: InitDynamoDBStack;
  readonly microBatchIAMStack: InitIAMStack;
  readonly microBatchVPCStack: InitVPCStack;
  readonly microBatchLambdaLayerStack: InitLambdaLayerStack;
}

export class InitLambdaMetadataWriterStack extends Construct {
  readonly MetadataWriter: lambda.Function;
  readonly MetadataWriterRole: iam.Role;

  constructor(
    scope: Construct,
    id: string,
    props: InitLambdaMetadataWriterProps
  ) {
    super(scope, id);

    let solutionId = props.solutionId;
    let pipelineResourcesBuilderStack = props.pipelineResourcesBuilderStack;
    let microBatchDDBStack = props.microBatchDDBStack;
    let microBatchIAMStack = props.microBatchIAMStack;
    let microBatchVPCStack = props.microBatchVPCStack;
    let microBatchLambdaLayerStack = props.microBatchLambdaLayerStack;

    // Create a Role for Lambda:ETLAthenaAlterPartition
    this.MetadataWriterRole = new iam.Role(this, 'MetadataWriterRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
    });

    // Override the logical ID
    const cfnMetadataWriterRole = this.MetadataWriterRole.node
      .defaultChild as iam.CfnRole;
    cfnMetadataWriterRole.overrideLogicalId('MetadataWriterRole');

    const MetadataWriterPolicy = new iam.Policy(this, 'MetadataWriterPolicy', {
      statements: [
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: [
            'dynamodb:GetItem',
            'dynamodb:PutItem',
            'dynamodb:UpdateItem',
            'dynamodb:DeleteItem',
            'dynamodb:BatchWriteItem',
          ],
          resources: [`${microBatchDDBStack.MetaTable.tableArn}`],
        }),
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: [
            'iam:GetPolicyVersion',
            'iam:GetPolicy',
            'iam:CreatePolicyVersion',
            'iam:DeletePolicyVersion',
            'iam:ListPolicyVersions',
          ],
          resources: [
            pipelineResourcesBuilderStack.PipelineResourcesBuilderSchedulePolicy
              .managedPolicyArn,
          ],
        }),
      ],
    });

    // Override the logical ID
    const cfnMetadataWriterPolicy = MetadataWriterPolicy.node
      .defaultChild as iam.CfnPolicy;
    cfnMetadataWriterPolicy.overrideLogicalId('MetadataWriterPolicy');

    this.MetadataWriterRole.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName(
        'service-role/AWSLambdaBasicExecutionRole'
      )
    );
    this.MetadataWriterRole.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName(
        'service-role/AWSLambdaVPCAccessExecutionRole'
      )
    );
    this.MetadataWriterRole.addManagedPolicy(
      microBatchIAMStack.KMSPublicAccessPolicy
    );
    this.MetadataWriterRole.addManagedPolicy(
      microBatchIAMStack.GluePublicAccessPolicy
    );
    this.MetadataWriterRole.attachInlinePolicy(MetadataWriterPolicy);

    // Create a lambda to handle all cluster related APIs.
    this.MetadataWriter = new lambda.Function(this, 'MetadataWriter', {
      code: lambda.AssetCode.fromAsset(
        path.join(
          __dirname,
          '../../../../../lambda/microbatch/metadata_writer'
        ),
        { followSymlinks: SymlinkFollowMode.ALWAYS }
      ),
      runtime: lambda.Runtime.PYTHON_3_11,
      handler: 'lambda_function.lambda_handler',
      timeout: Duration.minutes(15),
      memorySize: 128,
      role: this.MetadataWriterRole.withoutPolicyUpdates(),
      layers: [microBatchLambdaLayerStack.microBatchLambdaUtilsLayer],
      environment: {
        SOLUTION_VERSION: process.env.VERSION || 'v1.0.0',
        SOLUTION_ID: solutionId,
        META_TABLE_NAME: microBatchDDBStack.MetaTable.tableName,
      },
      vpc: microBatchVPCStack.vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      securityGroups: [microBatchVPCStack.privateSecurityGroup],
      description: `${Aws.STACK_NAME} - Lambda function to write item to Meta Table.`,
    });

    // Override the logical ID
    const cfnMetadataWriter = this.MetadataWriter.node
      .defaultChild as lambda.CfnFunction;
    cfnMetadataWriter.overrideLogicalId('MetadataWriter');

    this.MetadataWriter.node.addDependency(
      microBatchVPCStack.vpc.selectSubnets({
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
      }).internetConnectivityEstablished
    );
  }
}
