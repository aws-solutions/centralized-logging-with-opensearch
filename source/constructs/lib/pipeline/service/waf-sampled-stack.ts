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
  CfnCondition,
  Fn,
  Duration,
  Aws,
  aws_iam as iam,
  aws_lambda as lambda,
  CfnParameter,
  SymlinkFollowMode,
  aws_ec2 as ec2,
  CfnOutput,
  aws_events_targets as targets,
} from "aws-cdk-lib";
import { ISecurityGroup, IVpc } from "aws-cdk-lib/aws-ec2";
import { Rule, Schedule } from "aws-cdk-lib/aws-events";
import * as path from "path";



export interface WAFSampledStackProps {
  /**
   * Default VPC for OpenSearch REST API Handler
   *
   * @default - None.
   */
  readonly vpc: IVpc;

  /**
   * Default Security Group for OpenSearch REST API Handler
   *
   * @default - None.
   */
  readonly securityGroup: ISecurityGroup;

  /**
   * OpenSearch Endpoint Url
   *
   * @default - None.
   */
  readonly endpoint: string;

  /**
   * OpenSearch or Elasticsearch
   *
   * @default - OpenSearch.
   */
  readonly engineType: string;

  /**
   * Log Type
   */
  readonly logType: string;

  /**
   * Index Prefix
   *
   * @default - None.
   */
  readonly indexPrefix: string;

  /**
   * A list of plugins
   *
   * @default - None.
   */
  readonly plugins: string;

  /**
   * version number
   *
   * @default - v1.0.0.
   */
  readonly version?: string;

  readonly interval: CfnParameter;
  /**
   * The Account Id of log source
   * @default - None.
   */
  readonly logSourceAccountId: string;
  /**
   * The region of log source
   * @default - None.
   */
  readonly logSourceRegion: string;
  /**
   * The assume role of log source account
   * @default - None.
   */
  readonly logSourceAccountAssumeRole: string;

  /**
   * The name list of WAF ACL
   * @default - None.
   */
  readonly webACLNames: string;

  readonly solutionId: string;
}

export class WAFSampledStack extends Construct {
  readonly logProcessorRoleArn: string;

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
              "es:ESHttpGet",
              "es:ESHttpDelete",
              "es:ESHttpPatch",
              "es:ESHttpPost",
              "es:ESHttpPut",
              "es:ESHttpHead",
            ],
            resources: ["*"],
          }),
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

    // Create a lambda layer with required python packages.
    // This layer also includes standard plugins.
    const pipeLayer = new lambda.LayerVersion(this, "LogHubPipeLayer", {
      code: lambda.Code.fromAsset(
        path.join(__dirname, "../../../lambda/plugin/standard"),
        {
          bundling: {
            image: lambda.Runtime.PYTHON_3_9.bundlingImage,
            command: [
              "bash",
              "-c",
              "pip install -r requirements.txt -t /asset-output/python && cp . -r /asset-output/python/",
            ],
          },
        }
      ),
      compatibleRuntimes: [lambda.Runtime.PYTHON_3_9],
      description: "Default Lambda layer for Log Pipeline",
    });

    // Create the Log Processor Lambda
    const wafSampledLogProcessorFn = new lambda.Function(
      this,
      "WAFSampledLogProcessorFn",
      {
        description: `${Aws.STACK_NAME} - Function to process and load ${props.logType} logs into OpenSearch`,
        runtime: lambda.Runtime.PYTHON_3_9,
        handler: "waf_sampled_lambda_function.lambda_handler",
        code: lambda.Code.fromAsset(
          path.join(
            __dirname,
            "../../../lambda/pipeline/service/log-processor"
          ),
          { followSymlinks: SymlinkFollowMode.ALWAYS }
        ),
        memorySize: 1024,
        timeout: Duration.seconds(120),
        vpc: props.vpc,
        vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
        securityGroups: [props.securityGroup],
        environment: {
          ENDPOINT: props.endpoint,
          ENGINE: props.engineType,
          LOG_TYPE: props.logType,
          INDEX_PREFIX: props.indexPrefix,
          SOLUTION_VERSION: process.env.VERSION || "v1.0.0",
          SOLUTION_ID: props.solutionId,
          INTERVAL: props.interval.valueAsString,
          LOG_SOURCE_ACCOUNT_ID: props.logSourceAccountId,
          LOG_SOURCE_REGION: props.logSourceRegion,
          LOG_SOURCE_ACCOUNT_ASSUME_ROLE: props.logSourceAccountAssumeRole,
          WEB_ACL_NAMES: props.webACLNames,
        },
        layers: [pipeLayer],
      }
    );
    wafSampledLogProcessorFn.role!.attachInlinePolicy(
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
    wafSampledLogProcessorFn.addToRolePolicy(
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

    this.logProcessorRoleArn = wafSampledLogProcessorFn.role!.roleArn;

    // Setup Event Bridge
    const rule = new Rule(this, "ScheduleRule", {
      schedule: Schedule.rate(Duration.minutes(props.interval.valueAsNumber)),
    });
    rule.addTarget(
      new targets.LambdaFunction(wafSampledLogProcessorFn, {
        retryAttempts: 3, // Optional: set the max number of retry attempts
      })
    );

    new CfnOutput(this, "WAFSampledLogProcessorFnArn", {
      description: "WAF Sampled Log Processor Lambda ARN ",
      value: wafSampledLogProcessorFn.functionArn,
    }).overrideLogicalId("WAFSampledLogProcessorFnArn");
  }
}
