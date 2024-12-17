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
import * as ap from '../lib/pipeline/application/app-log-pipeline-stack';

import * as s3source from '../lib/pipeline/application/s3-source-stack';
import * as syslog from '../lib/pipeline/application/syslog-to-ecs-stack';

describe('Application Log Stack', () => {
  test('Test kds stack with auto-scaling', () => {
    const app = new App();
    // WHEN
    const stack = new ap.AppPipelineStack(app, 'MyTestStack', {
      buffer: 'KDS',
      enableAutoScaling: true,
    });
    // Prepare the stack for assertions.
    const template = Template.fromStack(stack);

    // THEN
    template.hasResourceProperties(
      'AWS::ApplicationAutoScaling::ScalingPolicy',
      {
        PolicyType: 'StepScaling',
        StepScalingPolicyConfiguration: {
          AdjustmentType: 'ChangeInCapacity',
          Cooldown: 600,
          MetricAggregationType: 'Average',
          StepAdjustments: [
            {
              MetricIntervalLowerBound: 0,
              ScalingAdjustment: 1,
            },
          ],
        },
      }
    );

    template.resourceCountIs('AWS::ApiGateway::RestApi', 1);
  });

  test('Test kds stack without auto-scaling', () => {
    const app = new App();
    // WHEN
    const stack = new ap.AppPipelineStack(app, 'MyTestStack', {
      buffer: 'KDS',
      enableAutoScaling: true,
    });
    // Prepare the stack for assertions.
    const template = Template.fromStack(stack);

    // THEN
    template.hasResourceProperties('AWS::Kinesis::Stream', {
      RetentionPeriodHours: 24,
    });
  });

  test('Test kds stack without auto-scaling', () => {
    const app = new App();
    // WHEN
    const stack = new ap.AppPipelineStack(app, 'MyTestStack', {
      buffer: 'KDS',
      enableAutoScaling: true,
    });
    // Prepare the stack for assertions.
    const template = Template.fromStack(stack);

    // THEN
    template.hasResourceProperties('AWS::Kinesis::Stream', {
      RetentionPeriodHours: 24,
    });
  });

  test('Test S3 as buffer pipeline', () => {
    const app = new App();
    // WHEN
    const stack = new ap.AppPipelineStack(app, 'MyTestStack', {
      buffer: 'S3',
    });
    // Prepare the stack for assertions.
    const template = Template.fromStack(stack);

    // THEN
    template.hasResourceProperties('AWS::Lambda::Function', {});
  });

  test('Test MSK as buffer pipeline', () => {
    const app = new App();
    // WHEN
    const stack = new ap.AppPipelineStack(app, 'MyTestStack', {
      buffer: 'MSK',
    });
    // Prepare the stack for assertions.
    const template = Template.fromStack(stack);

    // THEN
    template.hasResourceProperties('AWS::Lambda::Function', {
      Environment: {
        Variables: {
          SOURCE: 'MSK',
        },
      },
    });
  });

  test('Test syslogs stack', () => {
    const app = new App();
    // WHEN
    const stack = new syslog.SyslogtoECSStack(app, 'MyTestStack', {});
    // Prepare the stack for assertions.
    const template = Template.fromStack(stack);

    // THEN
    template.resourceCountIs('AWS::ECS::TaskDefinition', 1);
  });

  test('Test app s3 source stack', () => {
    const app = new App();
    // WHEN
    const stack = new s3source.S3SourceStack(app, 'MyTestStack', {});
    // Prepare the stack for assertions.
    const template = Template.fromStack(stack);

    // THEN
    template.resourceCountIs('AWS::ECS::TaskDefinition', 1);
  });
});
