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
import { InitLambdaLayerStack } from "./init-lambda-layer";
import { InitDynamoDBStack } from "../dynamodb/init-dynamodb-stack";
import { InitVPCStack } from "../vpc/init-vpc-stack";
import { InitIAMStack } from "../iam/init-iam-stack";

export interface InitLambdaETLHelperProps {
  readonly solutionId: string;
  readonly microBatchDDBStack: InitDynamoDBStack;
  readonly microBatchVPCStack: InitVPCStack;
  readonly microBatchLambdaLayerStack: InitLambdaLayerStack;
  readonly microBatchIAMStack: InitIAMStack;
}

export class InitLambdaETLHelperStack extends Construct {
  readonly ETLHelper: lambda.Function;
  readonly ETLHelperRole: iam.Role;

  constructor(scope: Construct, id: string, props: InitLambdaETLHelperProps) {
    super(scope, id);

    let solutionId = props.solutionId;
    let microBatchDDBStack = props.microBatchDDBStack;
    let microBatchVPCStack = props.microBatchVPCStack;
    let microBatchIAMStack = props.microBatchIAMStack;
    let microBatchLambdaLayerStack = props.microBatchLambdaLayerStack;

    // Create a Role for Lambda:ETLDateTransform 
    this.ETLHelperRole = new iam.Role(this, "ETLHelperRole", {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
    });

    // Override the logical ID
    const cfnETLHelperRole = this.ETLHelperRole.node.defaultChild as iam.CfnRole;
    cfnETLHelperRole.overrideLogicalId("ETLHelperRole");

    const ETLHelperRWDDBPolicy = new iam.Policy(this, "ETLHelperRWDDBPolicy", {
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
    const cfnETLHelperRWDDBPolicy = ETLHelperRWDDBPolicy.node.defaultChild as iam.CfnPolicy;
    cfnETLHelperRWDDBPolicy.overrideLogicalId("ETLHelperRWDDBPolicy");

    this.ETLHelperRole.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName("service-role/AWSLambdaBasicExecutionRole"));
    this.ETLHelperRole.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName("service-role/AWSLambdaVPCAccessExecutionRole"));
    this.ETLHelperRole.addManagedPolicy(microBatchIAMStack.KMSPublicAccessPolicy);
    this.ETLHelperRole.addManagedPolicy(microBatchIAMStack.AthenaPublicAccessPolicy);
    this.ETLHelperRole.addManagedPolicy(microBatchIAMStack.GluePublicAccessPolicy);
    this.ETLHelperRole.addManagedPolicy(microBatchIAMStack.S3PublicAccessPolicy);
    this.ETLHelperRole.attachInlinePolicy(ETLHelperRWDDBPolicy);

    // Create a lambda to handle all cluster related APIs.
    this.ETLHelper = new lambda.Function(this, "ETLDateTransform", {
      code: lambda.AssetCode.fromAsset(
        path.join(__dirname, "../../../../../lambda/microbatch/etl_helper"),
        { followSymlinks: SymlinkFollowMode.ALWAYS },
      ),
      runtime: lambda.Runtime.PYTHON_3_11,
      handler: "lambda_function.lambda_handler",
      timeout: Duration.minutes(5),
      memorySize: 128,
      role: this.ETLHelperRole.withoutPolicyUpdates(),
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
      description: `${Aws.STACK_NAME} - Lambda function to write ETL logs to DDB Table.`,
    });

    // Override the logical ID
    const cfnETLHelper = this.ETLHelper.node.defaultChild as lambda.CfnFunction;
    cfnETLHelper.overrideLogicalId("ETLHelper");

  }
}