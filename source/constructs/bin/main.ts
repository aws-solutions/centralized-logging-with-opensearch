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

import "source-map-support/register";
import { App, Aspects, Stack } from "aws-cdk-lib";
import { MainStack } from "../lib/main-stack";
import { ServiceLogPipelineStack } from "../lib/pipeline/service/service-log-pipeline-stack";
import { NginxForOpenSearchStack } from "../lib/opensearch/nginx-for-opensearch-stack";
import { AlarmForOpenSearchStack } from "../lib/opensearch/alarm-for-opensearch-stack";
import { S3toKDSStack } from "../lib/pipeline/application/s3-to-kds-stack";
import { SyslogtoECSStack } from "../lib/pipeline/application/syslog-to-ecs-stack";
import { CrossAccount } from "../lib/subaccount/cross-account-stack";
import {
  AwsSolutionsChecks,
  NagPackSuppression,
  NagSuppressions,
} from "cdk-nag";
import { AppPipelineStack } from "../lib/pipeline/application/app-log-pipeline-stack";
const app = new App();

function stackSuppressions(
  stacks: Stack[],
  suppressions: NagPackSuppression[]
) {
  stacks.forEach((s) =>
    NagSuppressions.addStackSuppressions(s, suppressions, true)
  );
}

stackSuppressions([
  new MainStack(app, "LogHub"),
  new MainStack(app, "LogHubFromExistingVPC", { existingVpc: true }),
  new MainStack(app, "LogHubWithOIDC", { authType: "OPENID_CONNECT" }),
  new MainStack(app, "LogHubFromExistingVPCWithOIDC", {
    authType: "OPENID_CONNECT",
    existingVpc: true,
  }),
], [
  { id: 'AwsSolutions-IAM5', reason: 'some policies need to get dynamic resources' },
  { id: 'AwsSolutions-IAM4', reason: 'these policies is used by CDK Customer Resource lambda' },
  { id: 'AwsSolutions-SF2', reason: 'we do not need xray' },
  { id: 'AwsSolutions-S1', reason: 'these buckets dont need access log', },
  { id: 'AwsSolutions-S10', reason: 'these buckets dont need SSL', },
  { id: 'AwsSolutions-L1', reason: 'not applicable to use the latest lambda runtime version' },
]);

stackSuppressions(
  [
    new ServiceLogPipelineStack(app, "S3AccessLog", { logType: "S3" }),
    new ServiceLogPipelineStack(app, "CloudTrailLog", {
      logType: "CloudTrail",
    }),
    new ServiceLogPipelineStack(app, "CloudFrontLog", {
      logType: "CloudFront",
    }),
    new ServiceLogPipelineStack(app, "RDSLog", { logType: "RDS" }),
    new ServiceLogPipelineStack(app, "LambdaLog", { logType: "Lambda" }),
    new ServiceLogPipelineStack(app, "ELBLog", { logType: "ELB" }),
    new ServiceLogPipelineStack(app, "WAFLog", { logType: "WAF" }),
    new ServiceLogPipelineStack(app, "VPCFlowLog", {
      logType: "VPCFlow",
      tag: "vpc",
    }),
    new ServiceLogPipelineStack(app, "ConfigLog", {
      logType: "Config",
      tag: "cfg",
    }),
    new ServiceLogPipelineStack(app, "WAFSampledLog", {
      logType: "WAFSampled",
      tag: "wfs",
    }),
  ],
  [
    {
      id: "AwsSolutions-IAM5",
      reason: "The managed policy needs to use any resources.",
    },
    {
      id: "AwsSolutions-IAM4",
      reason:
        "The BucketNotificationsHandler lambda is an internal CDK lambda needed to apply bucket notification configurations.",
    },
    {
      id: "AwsSolutions-L1",
      reason: "the lambda 3.9 runtime we use is the latest version",
    },
  ]
);

stackSuppressions(
  [new NginxForOpenSearchStack(app, "NginxForOpenSearch")],
  [
    {
      id: "AwsSolutions-EC23",
      reason: "will replace 0.0.0.0/0 or ::/0 for inbound access in future",
    },
  ]
);

stackSuppressions(
  [new S3toKDSStack(app, "S3toKDSStack")],
  [
    {
      id: "AwsSolutions-IAM5",
      reason: "The managed policy needs to use any resources.",
    },
    {
      id: "AwsSolutions-IAM4",
      reason: "Code of CDK custom resource, can not be modified",
    },
  ]
);

new AlarmForOpenSearchStack(app, "AlarmForOpenSearch");

// stackSuppressions(
//   [
//     new KDSStack(app, "KDSStack", { enableAutoScaling: true }),
//     new KDSStack(app, "KDSStackNoAutoScaling", { enableAutoScaling: false }),
//   ],
//   [
//     {
//       id: "AwsSolutions-IAM5",
//       reason: "The managed policy needs to use any resources.",
//     },
//     {
//       id: "AwsSolutions-IAM4",
//       reason: "Code of CDK custom resource, can not be modified",
//     },
//     {
//       id: "AwsSolutions-L1",
//       reason: "the lambda 3.9 runtime we use is the latest version",
//     },
//   ]
// );


stackSuppressions(
  [
    // Note: A new tag SO8025-kds is used to replace the old SO8025-app-pipeline
    new AppPipelineStack(app, "AppLogKDSBuffer", {
      buffer: "KDS",
      enableAutoScaling: true,
    }),
    new AppPipelineStack(app, "AppLogKDSBufferNoAutoScaling", {
      buffer: "KDS",
      enableAutoScaling: false,
    }),
    new AppPipelineStack(app, "AppLogS3Buffer", {
      buffer: "S3",
      tag: "s3b"
    }),
    new AppPipelineStack(app, "AppLogMSKBuffer", {
      buffer: "MSK",
    }),

    // The existing OpenSearch Admin Stack
    new AppPipelineStack(app, "AppLog", {
      buffer: "None",
      tag: "aos"
    }),
  ],
  [
    {
      id: "AwsSolutions-IAM5",
      reason: "The managed policy needs to use any resources.",
    },
    {
      id: "AwsSolutions-IAM4",
      reason: "Code of CDK custom resource, can not be modified",
    },
    {
      id: "AwsSolutions-L1",
      reason: "the lambda 3.9 runtime we use is the latest version",
    },
  ]
);

new CrossAccount(app, "CrossAccount");


// stackSuppressions(
//   [new OpenSearchAdminStack(app, "OpenSearchAdminStack")],
//   [
//     {
//       id: "AwsSolutions-IAM4",
//       reason: "it's an AwsCustomResourcePolicy, we can't update it.",
//       appliesTo: [
//         "Policy::arn:<AWS::Partition>:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole",
//       ],
//     },
//     {
//       id: "AwsSolutions-L1",
//       reason: "the lambda 3.9 runtime we use is the latest version",
//     },
//   ]
// );

stackSuppressions(
  [
    new SyslogtoECSStack(app, "SyslogtoECSStack")
  ],
  [
    {
      id: "AwsSolutions-ECS2",
      reason: "We need to create a dynamic ECS Service",
    },
    {
      id: "AwsSolutions-IAM5",
      reason: "The managed policy needs to use any resources.",
    }
  ]
);

Aspects.of(app).add(new AwsSolutionsChecks());
