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
import { KDSStack } from "../lib/kinesis/kds-stack";
import { S3toKDSStack } from "../lib/pipeline/application/s3-to-kds-stack";
import { CrossAccount } from "../lib/subaccount/cross-account-stack";
import { OpenSearchAdminStack } from "../lib/pipeline/common/opensearch-stack";
import { AwsSolutionsChecks, NagPackSuppression, NagSuppressions } from 'cdk-nag';
const app = new App();

function stackSuppressions(stacks: Stack[], suppressions: NagPackSuppression[]) {
  stacks.forEach(s => NagSuppressions.addStackSuppressions(s, suppressions, true));
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
  { id: 'AwsSolutions-IAM5', reason: 'will diable wildcard permissions in future' },
  { id: 'AwsSolutions-IAM4', reason: 'will disable AWS managed policies in future' },
  { id: 'AwsSolutions-SF2', reason: 'will enable x-ray trace in future' },
  { id: 'AwsSolutions-SF1', reason: 'will log ALL events to CloudWatch logs in future' },
  { id: 'AwsSolutions-S1', reason: 'will enable s3 server access log in future' },
  { id: 'AwsSolutions-S10', reason: 'will enforce s3 bucket require requests to use SSL in future' },
  { id: 'AwsSolutions-L1', reason: 'not applicable to use the latest lambda runtime version' },
  { id: 'AwsSolutions-EC23', reason: 'will disallow for 0.0.0.0/0 or ::/0 inbound access in future' },
  { id: 'AwsSolutions-COG1', reason: 'will enforce strict password policy in future' },
  { id: 'AwsSolutions-CFR4', reason: 'will allows for SSLv3 or TLSv1 for HTTPS viewer connections in future' },
]);

stackSuppressions([
  new ServiceLogPipelineStack(app, "S3AccessLog", { logType: "S3" }),
  new ServiceLogPipelineStack(app, "CloudTrailLog", { logType: "CloudTrail" }),
  new ServiceLogPipelineStack(app, "CloudFrontLog", { logType: "CloudFront" }),
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
], [
  { id: 'AwsSolutions-IAM5', reason: 'will diable wildcard permissions in future' },
  { id: 'AwsSolutions-IAM4', reason: 'will disable AWS managed policies in future' },
  { id: 'AwsSolutions-L1', reason: 'not applicable to use the latest lambda runtime version' },
  { id: 'AwsSolutions-SQS4', reason: 'will require requests to use SSL for SQS in future' },
  { id: 'AwsSolutions-SQS3', reason: 'will enable DLQ in future' },
]);

stackSuppressions([
  new NginxForOpenSearchStack(app, "NginxForOpenSearch"),
], [
  { id: 'AwsSolutions-IAM4', reason: 'will disable AWS managed policies in future' },
  { id: 'AwsSolutions-ELB2', reason: 'will enable ELB access logs in the future' },
  { id: 'AwsSolutions-EC23', reason: 'will replace 0.0.0.0/0 or ::/0 for inbound access in future' },
  { id: 'AwsSolutions-AS3', reason: 'will enable ASG notifications configured for all scaling events.' },
]);

stackSuppressions([
  new S3toKDSStack(app, "S3toKDSStack"),
], [
  { id: 'AwsSolutions-IAM5', reason: 'will diable wildcard permissions in future' },
  { id: 'AwsSolutions-IAM4', reason: 'will disable AWS managed policies in future' },
  { id: 'AwsSolutions-ELB2', reason: 'will enable ELB access logs in the future' },
  { id: 'AwsSolutions-EC23', reason: 'will replace 0.0.0.0/0 or ::/0 for inbound access in future' },
  { id: 'AwsSolutions-AS3', reason: 'will enable ASG notifications configured for all scaling events.' },
  { id: 'AwsSolutions-SQS4', reason: 'will require requests to use SSL for SQS in future' },
  { id: 'AwsSolutions-SQS3', reason: 'will enable DLQ in future' },
]);

new AlarmForOpenSearchStack(app, "AlarmForOpenSearch");

stackSuppressions([
  new KDSStack(app, "KDSStack", { enableAutoScaling: true }),
  new KDSStack(app, "KDSStackNoAutoScaling", { enableAutoScaling: false }),
], [
  { id: 'AwsSolutions-IAM5', reason: 'will diable wildcard permissions in future' },
  { id: 'AwsSolutions-IAM4', reason: 'will disable AWS managed policies in future' },
  { id: 'AwsSolutions-L1', reason: 'not applicable to use the latest lambda runtime version' },
  { id: 'AwsSolutions-KDS3', reason: 'will specify server-side encryption and use the "aws/kinesis" key in future' },
  { id: 'AwsSolutions-APIG6', reason: 'will enable CloudWatch logging for all methods in future' },
  { id: 'AwsSolutions-APIG3', reason: 'will associate with AWS WAFv2 web ACL in future' },
  { id: 'AwsSolutions-APIG2', reason: 'will enable request validation in future' },
  { id: 'AwsSolutions-APIG1', reason: 'will enable access logging for APIs in future' },
]);

stackSuppressions([
  new CrossAccount(app, "CrossAccount"),
], [
  { id: 'AwsSolutions-IAM5', reason: 'will diable wildcard permissions in future' },
  { id: 'AwsSolutions-S10', reason: 'will require requests to use SSL for S3 in future' },
  { id: 'AwsSolutions-S1', reason: 'will enable server access logs for S3 in future' },
]);

stackSuppressions([
  new OpenSearchAdminStack(app, "OpenSearchAdminStack"),
], [
  { id: 'AwsSolutions-IAM5', reason: 'will diable wildcard permissions in future' },
  { id: 'AwsSolutions-IAM4', reason: 'will disable AWS managed policies in future' },
  { id: 'AwsSolutions-L1', reason: 'not applicable to use the latest lambda runtime version' },
]);

Aspects.of(app).add(new AwsSolutionsChecks());