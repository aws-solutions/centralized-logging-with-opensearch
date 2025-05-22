// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { App } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import * as cfr from '../lib/pipeline/service/cloudfront-realtime-log-stack';
import * as cwl from '../lib/pipeline/service/cloudwatch-log-stack';
import * as svc from '../lib/pipeline/service/service-log-pipeline-stack';

beforeEach(() => {
  jest.resetModules();
  process.env = {};
});

describe('Service Log Stack', () => {
  test('Test service log', () => {
    const app = new App();
    // WHEN
    const stack = new svc.ServiceLogPipelineStack(app, 'MyTestStack', {
      logType: 'WAF',
    });
    // Prepare the stack for assertions.
    const template = Template.fromStack(stack);

    // THEN
    template.hasResourceProperties('AWS::Lambda::Function', {
      Environment: {
        Variables: {
          LOG_TYPE: 'WAF',
          SOLUTION_VERSION: 'v1.0.0',
        },
      },
      MemorySize: 1024,
      Runtime: 'python3.11',
      Timeout: 900,
    });

    template.hasResourceProperties('AWS::Lambda::LayerVersion', {
      CompatibleRuntimes: ['python3.11'],
    });
  });

  test('Test service log with env', () => {
    const app = new App();
    process.env.VERSION = 'vX.Y.Z';

    // WHEN
    const stack = new svc.ServiceLogPipelineStack(app, 'MyTestStack', {
      logType: 'WAF',
    });
    // Prepare the stack for assertions.
    const template = Template.fromStack(stack);

    // THEN
    template.hasResourceProperties('AWS::Lambda::Function', {
      Environment: {
        Variables: {
          LOG_TYPE: 'WAF',
          SOLUTION_VERSION: 'vX.Y.Z',
        },
      },
    });
  });

  test('Test waf log stack with osi', () => {
    const app = new App();
    // WHEN
    const stack = new svc.ServiceLogPipelineStack(app, 'MyTestStack', {
      logType: 'WAF',
      enableOSIProcessor: 'true',
    });
    // Prepare the stack for assertions.
    const template = Template.fromStack(stack);

    // THEN
    template.hasResourceProperties('AWS::Lambda::Function', {
      Environment: {
        Variables: {
          LOG_TYPE: 'WAF',
        },
      },
      MemorySize: 128,
      Runtime: 'python3.11',
      Timeout: 60,
    });
  });

  test('Test s3 access logs stack', () => {
    const app = new App();
    // WHEN
    const stack = new svc.ServiceLogPipelineStack(app, 'MyTestStack', {
      logType: 'S3',
    });
    // Prepare the stack for assertions.
    const template = Template.fromStack(stack);

    // THEN
    template.hasResourceProperties('AWS::Lambda::Function', {
      Environment: {
        Variables: {
          LOG_TYPE: 'S3',
        },
      },
    });
  });

  test('Test cloudtrail logs stack', () => {
    const app = new App();
    // WHEN
    const stack = new svc.ServiceLogPipelineStack(app, 'MyTestStack', {
      logType: 'CloudTrail',
    });
    // Prepare the stack for assertions.
    const template = Template.fromStack(stack);

    // THEN
    template.hasResourceProperties('AWS::Lambda::Function', {
      Environment: {
        Variables: {
          LOG_TYPE: 'CloudTrail',
        },
      },
    });
  });

  test('Test cloudfront logs stack', () => {
    const app = new App();
    // WHEN
    const stack = new svc.ServiceLogPipelineStack(app, 'MyTestStack', {
      logType: 'CloudFront',
    });
    // Prepare the stack for assertions.
    const template = Template.fromStack(stack);

    // THEN
    template.hasResourceProperties('AWS::Lambda::Function', {
      Environment: {
        Variables: {
          LOG_TYPE: 'CloudFront',
        },
      },
    });
  });
  test('Test elb logs stack', () => {
    const app = new App();
    // WHEN
    const stack = new svc.ServiceLogPipelineStack(app, 'MyTestStack', {
      logType: 'ELB',
    });
    // Prepare the stack for assertions.
    const template = Template.fromStack(stack);

    // THEN
    template.hasResourceProperties('AWS::Lambda::Function', {
      Environment: {
        Variables: {
          LOG_TYPE: 'ELB',
        },
      },
    });
  });
  test('Test rds logs stack', () => {
    const app = new App();
    // WHEN
    const stack = new svc.ServiceLogPipelineStack(app, 'MyTestStack', {
      logType: 'RDS',
    });
    // Prepare the stack for assertions.
    const template = Template.fromStack(stack);

    // THEN
    template.hasResourceProperties('AWS::Lambda::Function', {
      Environment: {
        Variables: {
          LOG_TYPE: 'RDS',
        },
      },
    });
  });

  test('Test lambda logs stack', () => {
    const app = new App();
    // WHEN
    const stack = new svc.ServiceLogPipelineStack(app, 'MyTestStack', {
      logType: 'Lambda',
    });
    // Prepare the stack for assertions.
    const template = Template.fromStack(stack);

    // THEN
    template.hasResourceProperties('AWS::Lambda::Function', {
      Environment: {
        Variables: {
          LOG_TYPE: 'Lambda',
        },
      },
    });
  });

  test('Test waf sampled logs stack', () => {
    const app = new App();

    // WHEN
    const stack = new svc.ServiceLogPipelineStack(app, 'MyTestStack', {
      logType: 'WAFSampled',
    });
    // Prepare the stack for assertions.
    const template = Template.fromStack(stack);

    // THEN
    template.hasResourceProperties('AWS::Lambda::Function', {
      Environment: {
        Variables: {
          LOG_TYPE: 'WAFSampled',
        },
      },
    });
  });

  test('Test cloudfront real-time logs with KDS no autoscaling', () => {
    const app = new App();
    // WHEN
    const stack = new cfr.CloudFrontRealtimeLogStack(app, 'MyTestStack', {
      enableAutoScaling: false,
    });
    // Prepare the stack for assertions.
    const template = Template.fromStack(stack);

    // THEN
    template.hasResourceProperties('AWS::Kinesis::Stream', {
      RetentionPeriodHours: 24,
    });
  });

  test('Test cloudwatch logs with KDS no autoscaling', () => {
    const app = new App();
    // WHEN
    const stack = new cwl.CloudWatchLogStack(app, 'MyTestStack', {
      enableAutoScaling: false,
    });
    // Prepare the stack for assertions.
    const template = Template.fromStack(stack);

    // THEN
    template.hasResourceProperties('AWS::Kinesis::Stream', {
      RetentionPeriodHours: 24,
    });
  });
});
