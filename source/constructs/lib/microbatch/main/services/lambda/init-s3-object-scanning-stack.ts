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

import { Construct } from "constructs";
import * as path from "path";
import { Aws, Duration, SymlinkFollowMode, aws_iam as iam, aws_lambda as lambda, aws_ec2 as ec2 } from "aws-cdk-lib";
import { InitDynamoDBStack } from "../dynamodb/init-dynamodb-stack";
import { InitLambdaLayerStack } from "./init-lambda-layer";
import { InitSQSStack } from "../sqs/init-sqs-stack";
import { InitIAMStack } from "../iam/init-iam-stack";
import { InitVPCStack } from "../vpc/init-vpc-stack";

export interface InitLambdaS3ObjectScanningProps {
  readonly solutionId: string;
  readonly microBatchSQSStack: InitSQSStack;
  readonly microBatchDDBStack: InitDynamoDBStack;
  readonly microBatchIAMStack: InitIAMStack;
  readonly microBatchVPCStack: InitVPCStack;
  readonly microBatchLambdaLayerStack: InitLambdaLayerStack;
}

export class InitLambdaS3ObjectScanningStack extends Construct {
  readonly S3ObjectScanning: lambda.Function;
  readonly S3ObjectScanningRole: iam.Role;

  constructor(scope: Construct, id: string, props: InitLambdaS3ObjectScanningProps) {
    super(scope, id);

    let solutionId = props.solutionId;
    let microBatchDDBStack = props.microBatchDDBStack;
    let microBatchSQSStack = props.microBatchSQSStack;
    let microBatchIAMStack = props.microBatchIAMStack;
    let microBatchVPCStack = props.microBatchVPCStack;
    let microBatchLambdaLayerStack = props.microBatchLambdaLayerStack;

    // Create a Role for Lambda:S3ObjectScanning 
    this.S3ObjectScanningRole = new iam.Role(this, "S3ObjectScanningRole", {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
    });

    // Override the logical ID
    const cfnS3ObjectScanningRole = this.S3ObjectScanningRole.node.defaultChild as iam.CfnRole;
    cfnS3ObjectScanningRole.overrideLogicalId("S3ObjectScanningRole");

    const S3ObjectScanningRWDDBPolicy = new iam.Policy(this, "S3ObjectScanningRWDDBPolicy", {
      statements: [
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: [
            "dynamodb:PutItem",
            "dynamodb:UpdateItem",
          ],
          resources: [microBatchDDBStack.ETLLogTable.tableArn],
        }),
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: [
            "dynamodb:GetItem",
          ],
          resources: [microBatchDDBStack.MetaTable.tableArn],
        }),
      ],
    });

    // Override the logical ID
    const cfnS3ObjectScanningRWDDBPolicy = S3ObjectScanningRWDDBPolicy.node.defaultChild as iam.CfnPolicy;
    cfnS3ObjectScanningRWDDBPolicy.overrideLogicalId("S3ObjectScanningRWDDBPolicy");

    const S3ObjectScanningRWSQSPolicy = new iam.Policy(this, "S3ObjectScanningRWSQSPolicy", {
      statements: [
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: [
            "sqs:ChangeMessageVisibility",
            "sqs:SendMessage",
            "sqs:GetQueueUrl",
          ],
          resources: [
            `${microBatchSQSStack.S3ObjectMigrationDLQ.queueArn}`,
            `${microBatchSQSStack.S3ObjectMigrationQ.queueArn}`,
            `${microBatchSQSStack.S3ObjectMergeDLQ.queueArn}`,
            `${microBatchSQSStack.S3ObjectMergeQ.queueArn}`,
          ],
        }),
      ],
    });

    // Override the logical ID
    const cfnS3ObjectScanningRWSQSPolicy = S3ObjectScanningRWSQSPolicy.node.defaultChild as iam.CfnPolicy;
    cfnS3ObjectScanningRWSQSPolicy.overrideLogicalId("S3ObjectScanningRWSQSPolicy");

    this.S3ObjectScanningRole.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName("service-role/AWSLambdaBasicExecutionRole"));
    this.S3ObjectScanningRole.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName("service-role/AWSLambdaVPCAccessExecutionRole"));
    this.S3ObjectScanningRole.addManagedPolicy(microBatchIAMStack.KMSPublicAccessPolicy);
    this.S3ObjectScanningRole.addManagedPolicy(microBatchIAMStack.S3PublicAccessPolicy);
    this.S3ObjectScanningRole.attachInlinePolicy(S3ObjectScanningRWDDBPolicy);
    this.S3ObjectScanningRole.attachInlinePolicy(S3ObjectScanningRWSQSPolicy);

    // Create a lambda to handle all cluster related APIs.
    this.S3ObjectScanning = new lambda.Function(this, "S3ObjectScanning", {
      code: lambda.AssetCode.fromAsset(
        path.join(__dirname, "../../../../../lambda/microbatch/s3_object_scanning"),
        {
          followSymlinks: SymlinkFollowMode.ALWAYS,
        }
      ),
      runtime: lambda.Runtime.PYTHON_3_11,
      handler: "lambda_function.lambda_handler",
      timeout: Duration.minutes(15),
      memorySize: 256,
      role: this.S3ObjectScanningRole.withoutPolicyUpdates(),
      layers: [microBatchLambdaLayerStack.microBatchLambdaUtilsLayer],
      environment: {
        SOLUTION_VERSION: process.env.VERSION || "v1.0.0",
        SOLUTION_ID: solutionId,
        ETL_LOG_TABLE_NAME: microBatchDDBStack.ETLLogTable.tableName,
        META_TABLE_NAME: microBatchDDBStack.MetaTable.tableName,
      },
      vpc: microBatchVPCStack.vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      securityGroups: [microBatchVPCStack.privateSecurityGroup],
      description: `${Aws.STACK_NAME} - Lambda function to scan objects on S3.`,
    });

    // Override the logical ID
    const cfnS3ObjectScanning = this.S3ObjectScanning.node.defaultChild as lambda.CfnFunction;
    cfnS3ObjectScanning.overrideLogicalId("S3ObjectScanning");

  }
}