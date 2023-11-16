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
import { Aws, Fn, CfnCondition, Duration, SymlinkFollowMode, aws_iam as iam, aws_lambda as lambda, aws_ec2 as ec2, aws_sns_subscriptions as subscriptions } from "aws-cdk-lib";
import { InitLambdaLayerStack } from "./init-lambda-layer";
import { InitDynamoDBStack } from "../dynamodb/init-dynamodb-stack";
import { InitVPCStack } from "../vpc/init-vpc-stack";
import { InitIAMStack } from "../iam/init-iam-stack";
import { InitSNSStack } from "../sns/init-sns-stack";

export interface InitLambdaSendTemplateEmailProps {
  readonly solutionId: string;
  readonly emailAddress: string;
  readonly SESState: string;
  readonly SESEmailTemplate: string;
  readonly microBatchDDBStack: InitDynamoDBStack;
  readonly microBatchVPCStack: InitVPCStack;
  readonly microBatchLambdaLayerStack: InitLambdaLayerStack;
  readonly microBatchIAMStack: InitIAMStack;
  readonly microBatchSNSStack: InitSNSStack;

}

enum NotificationPriority {
  PIPELINE = "Pipeline",
  MESSAGE = "Message",
}

export class InitLambdaSendTemplateEmailStack extends Construct {
  readonly SendTemplateEmail: lambda.Function;
  readonly SendTemplateEmailRole: iam.Role;

  constructor(scope: Construct, id: string, props: InitLambdaSendTemplateEmailProps) {
    super(scope, id);

    let solutionId = props.solutionId;
    let emailAddress = props.emailAddress;
    let SESState = props.SESState;
    let SESEmailTemplate = props.SESEmailTemplate;
    let microBatchDDBStack = props.microBatchDDBStack;
    let microBatchVPCStack = props.microBatchVPCStack;
    let microBatchIAMStack = props.microBatchIAMStack;
    let microBatchLambdaLayerStack = props.microBatchLambdaLayerStack;
    let microBatchSNSStack = props.microBatchSNSStack;

    // Create a Role for Lambda:SendTemplateEmail 
    this.SendTemplateEmailRole = new iam.Role(this, "SendTemplateEmailRole", {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
    });

    // Override the logical ID
    const cfnSendTemplateEmailRole = this.SendTemplateEmailRole.node.defaultChild as iam.CfnRole;
    cfnSendTemplateEmailRole.overrideLogicalId("SendTemplateEmailRole");

    const SendTemplateEmailRWDDBPolicy = new iam.Policy(this, "SendTemplateEmailRWDDBPolicy", {
      statements: [
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: [
            "dynamodb:GetItem",
            "dynamodb:Query",
            "dynamodb:Scan",
          ],
          resources: [`${microBatchDDBStack.ETLLogTable.tableArn}`],
        }),
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: [
            "dynamodb:GetItem",
          ],
          resources: [`${microBatchDDBStack.MetaTable.tableArn}`],
        }),
      ],
    });

    // Override the logical ID
    const cfnSendTemplateEmailRWDDBPolicy = SendTemplateEmailRWDDBPolicy.node.defaultChild as iam.CfnPolicy;
    cfnSendTemplateEmailRWDDBPolicy.overrideLogicalId("SendTemplateEmailRWDDBPolicy");

    this.SendTemplateEmailRole.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName("service-role/AWSLambdaBasicExecutionRole"));
    this.SendTemplateEmailRole.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName("service-role/AWSLambdaVPCAccessExecutionRole"));
    this.SendTemplateEmailRole.addManagedPolicy(microBatchIAMStack.KMSPublicAccessPolicy);
    this.SendTemplateEmailRole.addManagedPolicy(microBatchIAMStack.SendTemplateEmailSNSPublicPolicy);
    this.SendTemplateEmailRole.attachInlinePolicy(SendTemplateEmailRWDDBPolicy);

    const SESStateCondition = new CfnCondition(this, 'SESStateCondition', {
      expression: Fn.conditionEquals(SESState, 'ENABLED'),
    });

    const SendTemplateEmailPolicy = new iam.Policy(this, "SendTemplateEmailPolicy", {
      statements: [
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: [
            "ses:SendTemplatedEmail",
          ],
          resources: [
            `arn:${Aws.PARTITION}:ses:${Aws.REGION}:${Aws.ACCOUNT_ID}:template/*`,
            `arn:${Aws.PARTITION}:ses:${Aws.REGION}:${Aws.ACCOUNT_ID}:configuration-set/*`,
            `arn:${Aws.PARTITION}:ses:${Aws.REGION}:${Aws.ACCOUNT_ID}:identity/*`,
          ],
        }),
      ],
    });

    // Override the logical ID
    const cfnSendTemplateEmailPolicy = SendTemplateEmailPolicy.node.defaultChild as iam.CfnPolicy;
    cfnSendTemplateEmailPolicy.overrideLogicalId("SendTemplateEmailPolicy");

    cfnSendTemplateEmailPolicy.cfnOptions.condition = SESStateCondition;

    this.SendTemplateEmailRole.attachInlinePolicy(SendTemplateEmailPolicy);

    // Create a lambda to handle all cluster related APIs.
    this.SendTemplateEmail = new lambda.Function(this, "SendTemplateEmail", {
      code: lambda.AssetCode.fromAsset(
        path.join(__dirname, "../../../../../lambda/microbatch/send_email"),
        { followSymlinks: SymlinkFollowMode.ALWAYS },
      ),
      runtime: lambda.Runtime.PYTHON_3_11,
      handler: "lambda_function.lambda_handler",
      timeout: Duration.minutes(1),
      memorySize: 128,
      role: this.SendTemplateEmailRole.withoutPolicyUpdates(),
      layers: [microBatchLambdaLayerStack.microBatchLambdaUtilsLayer],
      environment: {
        SOLUTION_VERSION: process.env.VERSION || "v1.0.0",
        SOLUTION_ID: solutionId,
        ETL_LOG_TABLE_NAME: microBatchDDBStack.ETLLogTable.tableName,
        META_TABLE_NAME: microBatchDDBStack.MetaTable.tableName,
        SOURCE: emailAddress,
        NOTIFICATION_PRIORITY: NotificationPriority.PIPELINE,
        SES_EMAIL_TEMPLATE: SESEmailTemplate,
      },
      vpc: microBatchVPCStack.vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      securityGroups: [microBatchVPCStack.privateSecurityGroup],
      description: `${Aws.STACK_NAME} - Lambda function to send email notification to customer via SES or SNS.`,
    });

    // Override the logical ID
    const cfnSendTemplateEmail = this.SendTemplateEmail.node.defaultChild as lambda.CfnFunction;
    cfnSendTemplateEmail.overrideLogicalId("SendTemplateEmail");

    microBatchSNSStack.SNSReceiveStatesFailedTopic.addSubscription(new subscriptions.LambdaSubscription(this.SendTemplateEmail));

  }
}