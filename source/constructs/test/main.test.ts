// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { App, Stack } from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import * as main from '../lib/main-stack';
import * as vs from '../lib/main/vpc-stack';

beforeEach(() => {
  jest.resetModules();
  process.env = {};
});

describe('MainStack', () => {
  test('Test main stack with default setting', () => {
    const app = new App();

    // WHEN
    const stack = new main.MainStack(app, 'MyTestStack', {
      solutionId: 'SOXXXX',
      solutionName: 'CentralizedLoggingWithOpenSearch',
    });
    const template = Template.fromStack(stack);

    // THEN
    template.hasResourceProperties('AWS::AppSync::GraphQLApi', {
      AuthenticationType: 'AMAZON_COGNITO_USER_POOLS',
    });

    template.hasResourceProperties('AWS::DynamoDB::Table', {});

    // Cluster API Handler
    template.hasResourceProperties('AWS::Lambda::Function', {
      Environment: {
        Variables: {
          SOLUTION_VERSION: 'v1.0.0',
        },
      },
      MemorySize: 1024,
      Runtime: 'python3.11',
      Timeout: 60,
    });

    // Resource API
    template.hasResourceProperties('AWS::Lambda::Function', {
      Environment: {
        Variables: {
          DEFAULT_LOGGING_BUCKET: Match.anyValue(),
          SOLUTION_ID: 'SOXXXX',
          SOLUTION_VERSION: 'v1.0.0',
        },
      },
      MemorySize: 1024,
      Runtime: 'python3.11',
      Timeout: 60,
    });

    // CfnHelper Lambda
    template.hasResourceProperties('AWS::Lambda::Function', {
      Environment: {
        Variables: {
          TEMPLATE_BASE_URL: {
            'Fn::If': [
              'IsChinaPartition',
              'https://aws-gcr-solutions-cn.s3.cn-north-1.amazonaws.com.cn',
              'https://aws-gcr-solutions.s3.amazonaws.com',
            ],
          },
          SOLUTION_ID: 'SOXXXX',
          SOLUTION_VERSION: 'v1.0.0',
        },
      },
      MemorySize: 128,
      Runtime: 'python3.11',
      Timeout: 60,
    });

    // GraphQL API Lambda Data Source
    template.hasResourceProperties('AWS::AppSync::DataSource', {
      Type: 'AWS_LAMBDA',
    });

    // Cognito User Pool
    template.hasResourceProperties('AWS::Cognito::UserPool', {
      AdminCreateUserConfig: {
        AllowAdminCreateUserOnly: true,
      },
      UsernameAttributes: ['email'],
    });

    template.resourceCountIs('AWS::Cognito::UserPoolClient', 1);
  });

  test('Test main stack with oidc', () => {
    const app = new App();

    // WHEN
    const stack = new main.MainStack(app, 'MyTestStack', {
      solutionId: 'SOXXXX',
      solutionName: 'CentralizedLoggingWithOpenSearch',
      authType: 'OPENID_CONNECT',
    });
    const template = Template.fromStack(stack);

    // THEN
    template.hasResourceProperties('AWS::AppSync::GraphQLApi', {
      AuthenticationType: 'OPENID_CONNECT',
    });
  });

  test('Test main stack with existing vpc', () => {
    const app = new App();

    // WHEN
    const stack = new main.MainStack(app, 'MyTestStack', {
      solutionId: 'SOXXXX',
      solutionName: 'CentralizedLoggingWithOpenSearch',
      existingVpc: true,
    });
    const template = Template.fromStack(stack);

    // THEN
    template.resourceCountIs('AWS::EC2::SecurityGroup', 4);
  });

  test('Test main stack with env', () => {
    const app = new App();
    process.env.VERSION = 'vX.Y.Z';
    process.env.TEMPLATE_OUTPUT_BUCKET = 'test-bucket';

    // WHEN
    const stack = new main.MainStack(app, 'MyTestStack', {
      solutionId: 'SOXXXX',
      solutionName: 'CentralizedLoggingWithOpenSearch',
    });
    const template = Template.fromStack(stack);

    // THEN
    // CfnHelper Lambda
    template.hasResourceProperties('AWS::Lambda::Function', {
      Environment: {
        Variables: {
          TEMPLATE_BASE_URL: {
            'Fn::If': [
              'IsChinaPartition',
              'https://test-bucket-cn.s3.cn-north-1.amazonaws.com.cn',
              'https://test-bucket.s3.amazonaws.com',
            ],
          },
          SOLUTION_ID: 'SOXXXX',
          SOLUTION_VERSION: 'vX.Y.Z',
        },
      },
      MemorySize: 128,
      Runtime: 'python3.11',
      Timeout: 60,
    });
  });

  test('Test vpc stack', () => {
    const app = new App();

    // WHEN
    const stack = new Stack(app, 'TestStack');

    // Prepare the stack for assertions.
    new vs.VpcStack(stack, 'VpcStack');
    const template = Template.fromStack(stack);

    // THEN
    template.resourceCountIs('AWS::EC2::SecurityGroup', 3);
  });
});
