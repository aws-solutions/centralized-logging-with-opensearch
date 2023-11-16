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

import * as path from "path";
import {
  CfnCondition,
  Fn,
  Duration,
  Aws,
  aws_iam as iam,
  aws_lambda as lambda,
  CfnParameter,
  aws_logs as logs,
  CfnOutput,
  RemovalPolicy,
  aws_events_targets as targets,
} from "aws-cdk-lib";
import { Rule, Schedule } from "aws-cdk-lib/aws-events";
import { Construct } from "constructs";
import { CWLMetricStack, MetricSourceType } from "../common/cwl-metric-stack";
import { constructFactory } from "../../util/stack-helper";

export interface WAFSampledStackProps {


  readonly interval: CfnParameter;


  /**
   * The Account Id of log source
   * @default - None.
   */
  readonly logSourceAccountId: string;

  /**
   * The assume role of log source account
   * @default - None.
   */
  readonly logSourceAccountAssumeRole: string;

  /**
   * The name list of WAF ACL
   * @default - None.
   */

  readonly solutionId: string;
  readonly stackPrefix: string;
  readonly logProcessorFn: lambda.Function;
}

export class WAFSampledStack extends Construct {
  readonly logProcessorRoleArn: string;
  readonly logProcessorLogGroupName: string;

  constructor(scope: Construct, id: string, props: WAFSampledStackProps) {
    super(scope, id);

    // Create the policy and role for processor Lambda
    const wafSampledlogProcessorPolicy = new iam.Policy(
      this,
      "wafSampledlogProcessorPolicy",
      {
        statements: [
          new iam.PolicyStatement({
            actions: [
              "wafv2:ListWebACLs",
              "wafv2:GetSampledRequests",
              "wafv2:GetWebACL",
            ],
            resources: ["*"],
          }),
        ],
      }
    );

    // Create the Log Group for the Lambda function
    const logGroup = new logs.LogGroup(this, "LogProcessorFnLogGroup", {
      logGroupName: `/aws/lambda/${Aws.STACK_NAME}-LogProcessorFn`,
      removalPolicy: RemovalPolicy.DESTROY,
    });
    this.logProcessorLogGroupName = logGroup.logGroupName;

    constructFactory(CWLMetricStack)(this, "cwlMetricStack", {
      metricSourceType: MetricSourceType.LOG_PROCESSOR_WAF_SAMPLE,
      logGroup: logGroup,
      stackPrefix: props.stackPrefix,
    });

    props.logProcessorFn.role!.attachInlinePolicy(
      wafSampledlogProcessorPolicy
    );

    // Create the policy and role for the Lambda to create and delete CloudWatch Log Group Subscription Filter with cross-account scenario
    const isCrossAccount = new CfnCondition(this, "IsCrossAccount", {
      expression: Fn.conditionAnd(
        Fn.conditionNot(Fn.conditionEquals(props.logSourceAccountId, "")),
        Fn.conditionNot(
          Fn.conditionEquals(props.logSourceAccountId, Aws.ACCOUNT_ID)
        )
      ),
    });
    props.logProcessorFn.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["sts:AssumeRole"],
        effect: iam.Effect.ALLOW,
        resources: [
          `arn:${Aws.PARTITION}:logs:${Aws.REGION}:${Aws.ACCOUNT_ID}:*`,
          Fn.conditionIf(
            isCrossAccount.logicalId,
            `${props.logSourceAccountAssumeRole}`,
            Aws.NO_VALUE
          ).toString(),
        ],
      })
    );

    this.logProcessorRoleArn = props.logProcessorFn.role!.roleArn;

    // Setup Event Bridge
    const rule = new Rule(this, "ScheduleRule", {
      schedule: Schedule.rate(Duration.minutes(props.interval.valueAsNumber)),
    });
    rule.addTarget(
      new targets.LambdaFunction(props.logProcessorFn, {
        retryAttempts: 3, // Optional: set the max number of retry attempts
      })
    );

    constructFactory(CfnOutput)(this, "WAFSampledLogProcessorFnArn", {
      description: "WAF Sampled Log Processor Lambda ARN ",
      value: props.logProcessorFn.functionArn,
    }).overrideLogicalId("WAFSampledLogProcessorFnArn");
  }
}
