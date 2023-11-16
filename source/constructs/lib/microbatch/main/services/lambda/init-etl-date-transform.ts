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
import { Aws, Duration, aws_iam as iam, aws_lambda as lambda } from "aws-cdk-lib";

export interface InitLambdaETLDateTransformProps {
  readonly solutionId: string;
}

export class InitLambdaETLDateTransformStack extends Construct {
  readonly ETLDateTransform: lambda.Function;
  readonly ETLDateTransformRole: iam.Role;

  constructor(scope: Construct, id: string, props: InitLambdaETLDateTransformProps) {
    super(scope, id);

    let solutionId = props.solutionId;

    // Create a Role for Lambda:ETLDateTransform 
    this.ETLDateTransformRole = new iam.Role(this, "ETLDateTransformRole", {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
    });

    // Override the logical ID
    const cfnETLDateTransformRole = this.ETLDateTransformRole.node.defaultChild as iam.CfnRole;
    cfnETLDateTransformRole.overrideLogicalId("ETLDateTransformRole");


    this.ETLDateTransformRole.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName("service-role/AWSLambdaBasicExecutionRole"));

    // Create a lambda to handle all cluster related APIs.
    this.ETLDateTransform = new lambda.Function(this, "ETLDateTransform", {
      code: lambda.AssetCode.fromAsset(
        path.join(__dirname, "../../../../../lambda/microbatch/date_transform")
      ),
      runtime: lambda.Runtime.PYTHON_3_11,
      handler: "lambda_function.lambda_handler",
      timeout: Duration.seconds(10),
      memorySize: 128,
      role: this.ETLDateTransformRole.withoutPolicyUpdates(),
      environment: {
        SOLUTION_VERSION: process.env.VERSION || "v1.0.0",
        SOLUTION_ID: solutionId,
      },
      description: `${Aws.STACK_NAME} - Lambda function to convert current date to task execution date.`,
    });

    // Override the logical ID
    const cfnETLDateTransform = this.ETLDateTransform.node.defaultChild as lambda.CfnFunction;
    cfnETLDateTransform.overrideLogicalId("ETLDateTransform");

  }
}