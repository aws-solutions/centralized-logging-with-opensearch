/*
Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

import { Construct } from "constructs";
import {
  Aws,
  Fn,
  Duration,
  aws_stepfunctions_tasks as tasks,
  aws_stepfunctions as sfn,
  aws_logs as logs,
  aws_iam as iam,
  aws_lambda as lambda,
  aws_dynamodb as ddb,
  SymlinkFollowMode,
} from "aws-cdk-lib";
import * as path from "path";
import { addCfnNagSuppressRules } from "../main-stack";

export interface CfnFlowProps {
  /**
   * Common prefix for cloudformation stack names by this solution.
   *
   * @default - None.
   */
  stackPrefix: string;

  /**
   * A table to store cross account info.
   *
   * @default - None.
   */
  subAccountLinkTable: ddb.Table;
}

/**
 * Stack to provision a common State Machine to orchestrate CloudFromation Deployment Flow.
 * This flow is used as a Child flow and will notify result at the end to parent flow.
 * Therefore the input must contains a token.
 */
export class CfnFlowStack extends Construct {
  readonly stateMachineArn: string;

  constructor(scope: Construct, id: string, props: CfnFlowProps) {
    super(scope, id);

    const solution_id = "SO8025";

    const stackArn = `arn:${Aws.PARTITION}:cloudformation:${Aws.REGION}:${Aws.ACCOUNT_ID}:stack/${props.stackPrefix}*`;

    // Create a Lambda to handle all the cloudformation releted tasks.
    const cfnHandler = new lambda.Function(this, "CfnHelper", {
      code: lambda.AssetCode.fromAsset(
        path.join(__dirname, "../../lambda/main/cfnHelper"),
        { followSymlinks: SymlinkFollowMode.ALWAYS },
      ),
      runtime: lambda.Runtime.PYTHON_3_9,
      handler: "lambda_function.lambda_handler",
      timeout: Duration.seconds(60),
      memorySize: 128,
      environment: {
        DIST_OUTPUT_BUCKET: process.env.DIST_OUTPUT_BUCKET
          ? process.env.DIST_OUTPUT_BUCKET
          : "aws-gcr-solutions",
        SOLUTION_ID: solution_id,
        SUB_ACCOUNT_LINK_TABLE_NAME: props.subAccountLinkTable.tableName,
        SOLUTION_VERSION: process.env.VERSION ? process.env.VERSION : "v1.0.0",
      },
      description:
        "Log Hub - Helper function to handle CloudFormation deployment",
    });

    // Grant permissions to the lambda
    const cfnHandlerPolicy = new iam.Policy(this, "CfnHandlerPolicy", {
      statements: [
        new iam.PolicyStatement({
          actions: [
            "cloudformation:Create*",
            "cloudformation:Update*",
            "cloudformation:Delete*",
          ],
          resources: [
            // ${logHubArnPrefix},
            "*",
          ],
        }),
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          resources: [stackArn],
          actions: ["cloudformation:DescribeStacks"],
        }),

        // TODO: Restrict permissions
        // This list of actions is to ensure the sub-stack cloudformation template can be launched successfully.
        new iam.PolicyStatement({
          actions: [
            "sns:*",
            "lambda:*",
            "cloudwatch:*",
            "logs:*",
            "kinesis:*",
            "firehose:*",
            "s3:*",
            "sqs:*",
            "es:*",
            "elasticloadbalancing:*",
            "ec2:*",
            "autoscaling:*",
            "events:*",
            "ssm:*",
            "apigateway:*",
            "application-autoscaling:*",
            "execute-api:Invoke",
            "kms:EnableKeyRotation",
            "kms:PutKeyPolicy",
            "kms:DescribeKey",
            "kms:CreateKey",
            "dynamodb:*",
            "sts:AssumeRole",
          ],
          resources: ["*"],
        }),
        new iam.PolicyStatement({
          actions: [
            "iam:CreateInstanceProfile",
            "iam:CreateRole",
            "iam:PutRolePolicy",
            "iam:PassRole",
            "iam:AttachRolePolicy",
            "iam:AddRoleToInstanceProfile",
            "iam:RemoveRoleFromInstanceProfile",
            "iam:DeleteInstanceProfile",
            "iam:GetRole",
            "iam:GetPolicy",
            "iam:GetRolePolicy",
            "iam:ListRoles",
            "iam:ListPolicies",
            "iam:ListRolePolicies",
            "iam:DeleteRole",
            "iam:DeleteRolePolicy",
            "iam:DetachRolePolicy",
            "iam:CreateServiceLinkedRole",
          ],
          resources: [
            `arn:${Aws.PARTITION}:iam::${Aws.ACCOUNT_ID}:role/${props.stackPrefix}*`,
            `arn:${Aws.PARTITION}:iam::${Aws.ACCOUNT_ID}:role/aws-service-role/custom-resource.application-autoscaling.amazonaws.com/*`,
            `arn:${Aws.PARTITION}:iam::${Aws.ACCOUNT_ID}:policy/${props.stackPrefix}*`,
            `arn:${Aws.PARTITION}:iam::${Aws.ACCOUNT_ID}:instance-profile/${props.stackPrefix}*`,
            `arn:${Aws.PARTITION}:iam::${Aws.ACCOUNT_ID}:role/aws-service-role/autoscaling.amazonaws.com/AWSServiceRoleForAutoScaling`,
            `arn:${Aws.PARTITION}:iam::${Aws.ACCOUNT_ID}:role/aws-service-role/elasticloadbalancing.amazonaws.com/AWSServiceRoleForElasticLoadBalancing`,
          ],
        }),
      ],
    });

    cfnHandler.role!.attachInlinePolicy(cfnHandlerPolicy);
    addCfnNagSuppressRules(
      cfnHandlerPolicy.node.defaultChild as iam.CfnPolicy,
      [
        {
          id: "F4",
          reason:
            "This policy requires releted actions in order to start/delete sub cloudformation stacks with many other services",
        },
        {
          id: "W76",
          reason:
            "This policy needs to be able to start/delete other complex cloudformation stacks",
        },
        {
          id: "W12",
          reason:
            "This policy needs to be able to start/delete other cloudformation stacks of the plugin with unknown resources names",
        },
      ]
    );

    const sfnHandler = new lambda.Function(this, "SfnHelper", {
      code: lambda.AssetCode.fromAsset(
        path.join(__dirname, "../../lambda/main/sfnHelper")
      ),
      runtime: lambda.Runtime.PYTHON_3_9,
      handler: "lambda_function.lambda_handler",
      timeout: Duration.seconds(30),
      memorySize: 128,
      environment: {
        SOLUTION_ID: solution_id,
        SOLUTION_VERSION: process.env.VERSION ? process.env.VERSION : "v1.0.0",
      },
      description: "Log Hub - Helper function to handle Step Functions",
    });

    const sfnHandlerPolicy = new iam.Policy(this, "SfnHandlerPolicy", {
      statements: [
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          resources: ["*"],
          actions: ["states:SendTaskSuccess", "states:SendTaskFailure"],
        }),
      ],
    });
    sfnHandler.role!.attachInlinePolicy(sfnHandlerPolicy);
    addCfnNagSuppressRules(
      sfnHandlerPolicy.node.defaultChild as iam.CfnPolicy,
      [
        {
          id: "W12",
          reason: "These actions can only support all resources",
        },
      ]
    );

    // Step Functions Tasks
    const cfnTask = new tasks.LambdaInvoke(this, "Start or Stop Stack", {
      lambdaFunction: cfnHandler,
      outputPath: "$.Payload",
      inputPath: "$.input",
    });

    const cfnQueryTask = new tasks.LambdaInvoke(this, "Query Stack Status", {
      lambdaFunction: cfnHandler,
      outputPath: "$.Payload",
    });

    const sfnNotifyTask = new tasks.LambdaInvoke(this, "Notify result", {
      lambdaFunction: sfnHandler,
      payload: sfn.TaskInput.fromObject({
        token: sfn.JsonPath.stringAt("$$.Execution.Input.token"),
        result: sfn.JsonPath.stringAt("$.result"),
        args: sfn.JsonPath.stringAt("$.args"),
      }),
      outputPath: "$.Payload",
    });

    const wait = new sfn.Wait(this, "Wait for 15 seconds", {
      time: sfn.WaitTime.duration(Duration.seconds(15)),
    });

    const stackCompleted = new sfn.Choice(this, "In progress?")
      .when(
        sfn.Condition.stringMatches("$.result.stackStatus", "*_IN_PROGRESS"),
        wait
      )
      .otherwise(sfnNotifyTask);

    const stackFailed = new sfn.Choice(this, "Failed?")
      .when(
        sfn.Condition.stringMatches("$.result.stackStatus", "*_IN_PROGRESS"),
        wait.next(cfnQueryTask.next(stackCompleted))
      )
      .otherwise(sfnNotifyTask);

    // const chain = cfnTask.next(wait.next(cfnQueryTask.next(stackCompleted)))
    const chain = cfnTask.next(stackFailed);

    // State machine log group for error logs
    const logGroup = new logs.LogGroup(this, "ErrorLogGroup", {
      logGroupName: `/aws/vendedlogs/states/${Fn.select(
        6,
        Fn.split(":", sfnHandler.functionArn)
      )}-SM-cfn-error`,
    });

    // Role for state machine
    const LogHubCfnFlowSMRole = new iam.Role(this, "SMRole", {
      assumedBy: new iam.ServicePrincipal("states.amazonaws.com"),
    });
    // Least Privilage to enable logging for state machine
    LogHubCfnFlowSMRole.addToPolicy(
      new iam.PolicyStatement({
        actions: [
          "logs:PutResourcePolicy",
          "logs:DescribeLogGroups",
          "logs:UpdateLogDelivery",
          "logs:AssociateKmsKey",
          "logs:GetLogGroupFields",
          "logs:PutRetentionPolicy",
          "logs:CreateLogGroup",
          "logs:PutDestination",
          "logs:DescribeResourcePolicies",
          "logs:GetLogDelivery",
          "logs:ListLogDeliveries",
        ],
        effect: iam.Effect.ALLOW,
        resources: [logGroup.logGroupArn],
      })
    );

    // Create the state machine
    const cfnFlowSM = new sfn.StateMachine(this, "SM", {
      definition: chain,
      role: LogHubCfnFlowSMRole,
      logs: {
        destination: logGroup,
        level: sfn.LogLevel.ERROR,
      },
      timeout: Duration.minutes(120),
    });

    this.stateMachineArn = cfnFlowSM.stateMachineArn;
  }
}
