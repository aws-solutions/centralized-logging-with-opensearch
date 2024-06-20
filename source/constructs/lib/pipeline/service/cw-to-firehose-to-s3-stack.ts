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

import {
  Aws,
  CfnResource,
  CfnCondition,
  Fn,
  Size,
  CustomResource,
  Duration,
  custom_resources as cr,
  aws_iam as iam,
  aws_s3 as s3,
  aws_lambda as lambda,
  CfnOutput,
} from "aws-cdk-lib";

import { S3Bucket } from "@aws-cdk/aws-kinesisfirehose-destinations-alpha";
import * as firehose from "@aws-cdk/aws-kinesisfirehose-alpha";
import * as path from "path";
import { NagSuppressions } from "cdk-nag";
import { SharedPythonLayer } from "../../layer/layer";
/**
 * cfn-nag suppression rule interface
 */
interface CfnNagSuppressRule {
  readonly id: string;
  readonly reason: string;
}

export function addCfnNagSuppressRules(
  resource: CfnResource,
  rules: CfnNagSuppressRule[]
) {
  resource.addMetadata("cfn_nag", {
    rules_to_suppress: rules,
  });
}

export interface CWtoFirehosetoS3Props {
  /**
   * Log Type
   *
   * @default - None.
   */
  readonly logType?: string;

  readonly logGroupNames: string;
  readonly logBucketName: string;
  readonly logBucketPrefix: string;
  readonly logSourceAccountId: string;
  readonly logSourceRegion: string;
  readonly logSourceAccountAssumeRole: string;

  readonly solutionId: string;
}

export class CWtoFirehosetoS3Stack extends Construct {
  readonly deliveryStreamArn: string;
  readonly deliveryStreamName: string;

  constructor(scope: Construct, id: string, props: CWtoFirehosetoS3Props) {
    super(scope, id);

    // Get the logBucket
    const logBucket = s3.Bucket.fromBucketName(
      this,
      "logBucket",
      props.logBucketName
    );

    // Create the Kinesis Firehose
    const destination = new S3Bucket(logBucket, {
      dataOutputPrefix: props.logBucketPrefix,
      errorOutputPrefix: "error/" + props.logBucketPrefix,
      bufferingInterval: Duration.minutes(1),
      bufferingSize: Size.mebibytes(1),
    });
    const logFirehose = new firehose.DeliveryStream(this, "Delivery Stream", {
      encryption: firehose.StreamEncryption.AWS_OWNED,
      destinations: [destination],
    });
    NagSuppressions.addResourceSuppressions(
      logFirehose,
      [
        {
          id: "AwsSolutions-IAM5",
          reason: "The managed policy needs to use any resources.",
        },
      ],
      true
    );
    this.deliveryStreamArn = logFirehose.deliveryStreamArn;
    this.deliveryStreamName = logFirehose.deliveryStreamName;

    // Create the IAM role for CloudWatch Logs destination
    const cwDestinationRole = new iam.Role(this, "CWDestinationRole", {
      assumedBy: new iam.ServicePrincipal("logs.amazonaws.com"),
    });

    const isCrossAccount = new CfnCondition(this, "IsCrossAccount", {
      expression: Fn.conditionAnd(
        Fn.conditionNot(Fn.conditionEquals(props.logSourceAccountId, "")),
        Fn.conditionNot(
          Fn.conditionEquals(props.logSourceAccountId, Aws.ACCOUNT_ID)
        )
      ),
    });

    const assumeBy = {
      Version: "2012-10-17",
      Statement: [
        {
          Effect: "Allow",
          Condition: {
            StringLike: {
              "aws:SourceArn": [
                `arn:${Aws.PARTITION}:logs:${Aws.REGION}:${Aws.ACCOUNT_ID}:*`,
                Fn.conditionIf(
                  isCrossAccount.logicalId,
                  `arn:${Aws.PARTITION}:logs:${props.logSourceRegion}:${props.logSourceAccountId}:*`,
                  Aws.NO_VALUE
                ).toString(),
              ],
            },
          },
          Principal: {
            Service: "logs.amazonaws.com",
          },
          Action: "sts:AssumeRole",
        },
      ],
    };
    (cwDestinationRole.node.defaultChild as iam.CfnRole).addOverride(
      "Properties.AssumeRolePolicyDocument",
      assumeBy
    );

    // Create the IAM Policy for CloudWatch to put record on kinesis
    const cwDestPolicy = new iam.Policy(this, "CWDestPolicy", {
      roles: [cwDestinationRole],
      statements: [
        new iam.PolicyStatement({
          actions: ["firehose:PutRecord", "firehose:PutRecordBatch"],
          resources: [`${logFirehose.deliveryStreamArn}`],
        }),
      ],
    });

    // Create the policy and role for the Lambda to create and delete CloudWatch Log Group Subscription Filter
    const cwSubFilterLambdaPolicy = new iam.Policy(
      this,
      "cwSubFilterLambdaPolicy",
      {
        policyName: `${Aws.STACK_NAME}-cwSubFilterLambdaPolicy`,
        statements: [
          new iam.PolicyStatement({
            actions: [
              "logs:CreateLogGroup",
              "logs:CreateLogStream",
              "logs:PutLogEvents",
              "logs:PutSubscriptionFilter",
              "logs:putDestination",
              "logs:putDestinationPolicy",
              "logs:DeleteSubscriptionFilter",
              "logs:DescribeLogGroups",
            ],
            resources: [
              `arn:${Aws.PARTITION}:logs:${Aws.REGION}:${Aws.ACCOUNT_ID}:*`,
            ],
          }),
          new iam.PolicyStatement({
            actions: ["iam:PassRole"],
            resources: [cwDestinationRole.roleArn],
          }),
        ],
      }
    );
    const cwSubFilterLambdaRole = new iam.Role(this, "cwSubFilterLambdaRole", {
      assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
    });
    cwSubFilterLambdaPolicy.attachToRole(cwSubFilterLambdaRole);
    NagSuppressions.addResourceSuppressions(cwSubFilterLambdaPolicy, [
      {
        id: "AwsSolutions-IAM5",
        reason: "The managed policy needs to use any resources.",
        appliesTo: [
          "Resource::arn:<AWS::Partition>:logs:<AWS::Region>:<AWS::AccountId>:*",
        ],
      },
    ]);

    // Lambda to create CloudWatch Log Group Subscription Filter
    const cwSubFilterFn = new lambda.Function(this, "cwSubFilterFn", {
      description: `${Aws.STACK_NAME} - Create CloudWatch Log Group Subscription Filter`,
      runtime: lambda.Runtime.PYTHON_3_11,
      handler: "cw_subscription_filter.lambda_handler",
      code: lambda.Code.fromAsset(
        path.join(__dirname, "../../../lambda/pipeline/common/custom-resource/")
      ),
      memorySize: 256,
      timeout: Duration.seconds(60),
      role: cwSubFilterLambdaRole,
      layers: [SharedPythonLayer.getInstance(this)],
      environment: {
        LOGGROUP_NAMES: props.logGroupNames,
        DESTINATION_NAME: logFirehose.deliveryStreamName,
        DESTINATION_ARN: logFirehose.deliveryStreamArn,
        ROLE_NAME: cwDestinationRole.roleName,
        ROLE_ARN: cwDestinationRole.roleArn,
        STACK_NAME: Aws.STACK_NAME,
        SOLUTION_VERSION: process.env.VERSION || "v1.0.0",
        SOLUTION_ID: props.solutionId,
        LOG_SOURCE_ACCOUNT_ID: props.logSourceAccountId,
        LOG_SOURCE_REGION: props.logSourceRegion,
        LOG_SOURCE_ACCOUNT_ASSUME_ROLE: props.logSourceAccountAssumeRole,
      },
    });

    // Create the policy and role for the Lambda to create and delete CloudWatch Log Group Subscription Filter with cross-account scenario
    cwSubFilterFn.addToRolePolicy(
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

    cwSubFilterFn.node.addDependency(
      cwSubFilterLambdaRole,
      cwSubFilterLambdaPolicy,
      cwDestinationRole,
      cwDestPolicy,
      logFirehose
    );

    const cwSubFilterProvider = new cr.Provider(this, "cwSubFilterProvider", {
      onEventHandler: cwSubFilterFn,
    });

    NagSuppressions.addResourceSuppressions(cwSubFilterProvider, [
      {
        id: "AwsSolutions-L1",
        reason: "the lambda 3.9 runtime we use is the latest version",
      },
    ]);
    NagSuppressions.addResourceSuppressions(
      cwSubFilterProvider,
      [
        {
          id: "AwsSolutions-IAM5",
          reason: "The managed policy needs to use any resources.",
        },
      ],
      true
    );
    NagSuppressions.addResourceSuppressions(
      cwSubFilterLambdaRole,
      [
        {
          id: "AwsSolutions-IAM5",
          reason: "The managed policy needs to use any resources.",
          appliesTo: [
            "Resource::arn:<AWS::Partition>:logs:<AWS::Region>:<AWS::AccountId>:*",
          ],
        },
      ],
      true
    );

    cwSubFilterProvider.node.addDependency(cwSubFilterFn);

    const cwSubFilterlambdaTrigger = new CustomResource(
      this,
      "cwSubFilterlambdaTrigger",
      {
        serviceToken: cwSubFilterProvider.serviceToken,
      }
    );

    cwSubFilterlambdaTrigger.node.addDependency(cwSubFilterProvider);

    new CfnOutput(this, "KinesisDeliveryStreamARN", {
      description: "kinesis Delivery Stream ARN",
      value: logFirehose.deliveryStreamArn,
    }).overrideLogicalId("KinesisDeliveryStreamARN");

    new CfnOutput(this, "CloudWatchLogsDestinationARN ", {
      description: "CloudWatch Logs Destination ARN",
      value: `arn:${Aws.PARTITION}:logs:${Aws.REGION}:${Aws.ACCOUNT_ID}:destination:${Aws.STACK_NAME}-${logFirehose.deliveryStreamName}`,
    }).overrideLogicalId("CloudWatchLogsDestinationARN");
  }
}
