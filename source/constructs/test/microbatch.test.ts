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

import { App } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { MicroBatchMainStack } from '../lib/microbatch/main/microbatch-main-stack';
import { MicroBatchApplicationFluentBitPipelineStack } from '../lib/microbatch/pipeline/application-fluent-bit-stack';
import { MicroBatchApplicationS3PipelineStack } from '../lib/microbatch/pipeline/application-s3-stack';
import { MicroBatchAwsServicesAlbPipelineStack } from '../lib/microbatch/pipeline/aws-services-alb-stack';
import { MicroBatchAwsServicesCloudFrontPipelineStack } from '../lib/microbatch/pipeline/aws-services-cloudfront-stack';
import { MicroBatchAwsServicesCloudTrailPipelineStack } from '../lib/microbatch/pipeline/aws-services-cloudtrail-stack';
import { MicroBatchAwsServicesVpcFlowPipelineStack } from '../lib/microbatch/pipeline/aws-services-vpcflow-stack';
import { MicroBatchAwsServicesWafPipelineStack } from '../lib/microbatch/pipeline/aws-services-waf-stack';
import { MicroBatchLogIngestionStack } from '../lib/microbatch/pipeline/init-log-ingestion';

describe('MicroBatchMainStack', () => {
  test('Test MicroBatchMainStack', () => {
    const app = new App();

    // Test MicroBatch main stack with default setting
    const stack = new MicroBatchMainStack(app, 'MicroBatchMainStack', {
      stackPrefix: 'CL',
      solutionName: 'CentralizedLoggingWithOpenSearch',
      solutionDesc: 'Centralized Logging with OpenSearch',
      solutionId: 'SO8025',
    });
    const template = Template.fromStack(stack);

    template.hasResourceProperties('AWS::EC2::Subnet', {
      CidrBlock: '10.255.1.0/24',
    });
    template.findResources('AWS::StepFunctions::StateMachine');
    template.hasResourceProperties('AWS::DynamoDB::Table', {});
  });

  test('Test MicroBatchMainStackWithNewVPC', () => {
    const app = new App();

    // Test MicroBatch main stack with new vpc
    const stack = new MicroBatchMainStack(
      app,
      'MicroBatchMainStackWithNewVPC',
      {
        stackPrefix: 'CL',
        existingVPC: false,
        solutionName: 'CentralizedLoggingWithOpenSearch',
        solutionDesc: 'Centralized Logging with OpenSearch',
        solutionId: 'SO8025',
      }
    );
    const template = Template.fromStack(stack);

    template.hasResourceProperties('AWS::EC2::Subnet', {
      CidrBlock: '10.255.1.0/24',
    });
    template.findResources('AWS::StepFunctions::StateMachine');
    template.hasResourceProperties('AWS::DynamoDB::Table', {});
  });

  test('Test MicroBatchFromExistingVPC', () => {
    const app = new App();

    // Test MicroBatch main stack from existing vpc
    const stack = new MicroBatchMainStack(app, 'MicroBatchMainStack', {
      stackPrefix: 'CL',
      existingVPC: true,
      solutionName: 'CentralizedLoggingWithOpenSearch',
      solutionDesc: 'Centralized Logging with OpenSearch',
      solutionId: 'SO8025',
    });
    const template = Template.fromStack(stack);

    template.findResources('AWS::StepFunctions::StateMachine');
    template.hasResourceProperties('AWS::DynamoDB::Table', {});
  });
});

describe('MicroBatchPipelineStack', () => {
  test('Test MicroBatchApplicationFluentBitPipelineStack', () => {
    const app = new App();

    // Test MicroBatchApplicationFluentBitPipelineStack
    const stack = new MicroBatchApplicationFluentBitPipelineStack(
      app,
      'MicroBatchApplicationFluentBitPipelineStack',
      {
        solutionName: 'CentralizedLoggingWithOpenSearch',
        solutionDesc: 'Centralized Logging with OpenSearch',
        solutionId: 'SO8025',
      }
    );
    const template = Template.fromStack(stack);

    template.findResources('CloudFormation::CustomResource');
    template.findResources('AWS::SQS::Queue');
    template.findResources('AWS::Lambda::Function');
  });

  test('Test MicroBatchApplicationS3PipelineStack', () => {
    const app = new App();

    // Test MicroBatchApplicationS3PipelineStack
    const stack = new MicroBatchApplicationS3PipelineStack(
      app,
      'MicroBatchApplicationS3PipelineStack',
      {
        solutionName: 'CentralizedLoggingWithOpenSearch',
        solutionDesc: 'Centralized Logging with OpenSearch',
        solutionId: 'SO8025',
      }
    );
    const template = Template.fromStack(stack);

    template.findResources('CloudFormation::CustomResource');
    template.findResources('AWS::SQS::Queue');
    template.findResources('AWS::Lambda::Function');
  });

  test('Test MicroBatchAwsServicesAlbPipelineStack', () => {
    const app = new App();

    // Test MicroBatchAwsServicesAlbPipelineStack
    const stack = new MicroBatchAwsServicesAlbPipelineStack(
      app,
      'MicroBatchAwsServicesAlbPipelineStack',
      {
        solutionName: 'CentralizedLoggingWithOpenSearch',
        solutionDesc: 'Centralized Logging with OpenSearch',
        solutionId: 'SO8025',
      }
    );
    const template = Template.fromStack(stack);

    template.findResources('CloudFormation::CustomResource');
    template.findResources('AWS::SQS::Queue');
    template.findResources('AWS::Lambda::Function');
  });

  test('Test MicroBatchAwsServicesCloudFrontPipelineStack', () => {
    const app = new App();

    // Test MicroBatchAwsServicesCloudFrontPipelineStack
    const stack = new MicroBatchAwsServicesCloudFrontPipelineStack(
      app,
      'MicroBatchAwsServicesCloudFrontPipelineStack',
      {
        solutionName: 'CentralizedLoggingWithOpenSearch',
        solutionDesc: 'Centralized Logging with OpenSearch',
        solutionId: 'SO8025',
      }
    );
    const template = Template.fromStack(stack);

    template.findResources('CloudFormation::CustomResource');
    template.findResources('AWS::SQS::Queue');
    template.findResources('AWS::Lambda::Function');
  });

  test('Test MicroBatchAwsServicesCloudTrailPipelineStack', () => {
    const app = new App();

    // Test MicroBatchAwsServicesCloudTrailPipelineStack
    const stack = new MicroBatchAwsServicesCloudTrailPipelineStack(
      app,
      'MicroBatchAwsServicesCloudTrailPipelineStack',
      {
        solutionName: 'CentralizedLoggingWithOpenSearch',
        solutionDesc: 'Centralized Logging with OpenSearch',
        solutionId: 'SO8025',
      }
    );
    const template = Template.fromStack(stack);

    template.findResources('CloudFormation::CustomResource');
    template.findResources('AWS::SQS::Queue');
    template.findResources('AWS::Lambda::Function');
  });

  test('Test MicroBatchAwsServicesVpcFlowPipelineStack', () => {
    const app = new App();

    // Test MicroBatchAwsServicesVpcFlowPipelineStack
    const stack = new MicroBatchAwsServicesVpcFlowPipelineStack(
      app,
      'MicroBatchAwsServicesVpcFlowPipelineStack',
      {
        solutionName: 'CentralizedLoggingWithOpenSearch',
        solutionDesc: 'Centralized Logging with OpenSearch',
        solutionId: 'SO8025',
      }
    );
    const template = Template.fromStack(stack);

    template.findResources('CloudFormation::CustomResource');
    template.findResources('AWS::SQS::Queue');
    template.findResources('AWS::Lambda::Function');
  });

  test('Test MicroBatchAwsServicesWafPipelineStack', () => {
    const app = new App();

    // Test MicroBatchAwsServicesWafPipelineStack
    const stack = new MicroBatchAwsServicesWafPipelineStack(
      app,
      'MicroBatchAwsServicesWafPipelineStack',
      {
        solutionName: 'CentralizedLoggingWithOpenSearch',
        solutionDesc: 'Centralized Logging with OpenSearch',
        solutionId: 'SO8025',
      }
    );
    const template = Template.fromStack(stack);

    template.findResources('CloudFormation::CustomResource');
    template.findResources('AWS::SQS::Queue');
    template.findResources('AWS::Lambda::Function');
  });

  test('Test MicroBatchLogIngestionStack', () => {
    const app = new App();

    // Test MicroBatchLogIngestionStack
    const stack = new MicroBatchLogIngestionStack(
      app,
      'MicroBatchLogIngestionStack',
      {
        solutionName: 'CentralizedLoggingWithOpenSearch',
        solutionDesc: 'Centralized Logging with OpenSearch',
        solutionId: 'SO8025',
      }
    );
    const template = Template.fromStack(stack);

    template.findResources('CloudFormation::CustomResource');
    template.findResources('AWS::Lambda::Function');
  });
});
