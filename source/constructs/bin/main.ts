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

import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { MainStack } from '../lib/main-stack';
import { ServiceLogPipelineStack } from '../lib/pipeline/service/service-log-pipeline-stack'
import { NginxForOpenSearchStack } from '../lib/opensearch/nginx-for-opensearch-stack';
import { AlarmForOpenSearchStack } from '../lib/opensearch/alarm-for-opensearch-stack';
import { KDSStack } from '../lib/kinesis/kds-stack'
import { S3toKDSStack } from '../lib/pipeline/application/s3-to-kds-stack'

const app = new cdk.App();
new MainStack(app, 'LogHub');
new MainStack(app, 'LogHubFromExistingVPC', { existingVpc: true });
new MainStack(app, 'LogHubWithOIDC', { authType: 'OPENID_CONNECT' });
new MainStack(app, 'LogHubFromExistingVPCWithOIDC', { authType: 'OPENID_CONNECT', existingVpc: true });

new ServiceLogPipelineStack(app, 'S3AccessLog', { logType: 'S3' });
new ServiceLogPipelineStack(app, 'CloudTrailLog', { logType: 'CloudTrail' });
new ServiceLogPipelineStack(app, 'CloudFrontLog', { logType: 'CloudFront' });
new ServiceLogPipelineStack(app, 'RDSLog', { logType: 'RDS' });
new ServiceLogPipelineStack(app, 'LambdaLog', { logType: 'Lambda' });
new ServiceLogPipelineStack(app, 'ELBLog', { logType: 'ELB' });
new ServiceLogPipelineStack(app, 'WAFLog', { logType: 'WAF' });

new NginxForOpenSearchStack(app, 'NginxForOpenSearch');
new AlarmForOpenSearchStack(app, 'AlarmForOpenSearch');
new KDSStack(app, 'KDSStack', { enableAutoScaling: true });
new KDSStack(app, 'KDSStackNoAutoScaling', { enableAutoScaling: false });

new S3toKDSStack(app, 'S3toKDSStack');
