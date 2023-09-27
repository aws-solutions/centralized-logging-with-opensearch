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


import {
  App,
  Stack,
} from "aws-cdk-lib";
import { Match, Template } from "aws-cdk-lib/assertions";
import * as main from '../lib/main-stack';
import * as vs from '../lib/main/vpc-stack';

beforeEach(() => {
  jest.resetModules()
  process.env = {}
});


describe("MainStack", () => {


  test("Test main stack with default setting", () => {
    const app = new App();

    // WHEN
    const stack = new main.MainStack(app, 'MyTestStack', {
      solutionId: "SOXXXX",
    });
    const template = Template.fromStack(stack);

    // THEN
    template.hasResourceProperties("AWS::AppSync::GraphQLApi", {
      AuthenticationType: "AMAZON_COGNITO_USER_POOLS",
    });

    template.hasResourceProperties("AWS::DynamoDB::Table", {});

    // Cluster API Handler
    template.hasResourceProperties("AWS::Lambda::Function", {
      Environment: {
        Variables: {
          "SOLUTION_VERSION": "v1.0.0"
        }
      },
      MemorySize: 1024,
      Runtime: "python3.9",
      Timeout: 60
    });

    // Resource API
    template.hasResourceProperties("AWS::Lambda::Function", {
      Environment: {
        Variables: {
          "DEFAULT_LOGGING_BUCKET": Match.anyValue(),
          "SOLUTION_ID": "SOXXXX",
          "SOLUTION_VERSION": "v1.0.0"
        }
      },
      MemorySize: 1024,
      Runtime: "python3.9",
      Timeout: 60

    });

    // CfnHelper Lambda
    template.hasResourceProperties("AWS::Lambda::Function", {
      Environment: {
        Variables: {
          "TEMPLATE_OUTPUT_BUCKET": "aws-gcr-solutions",
          "SOLUTION_ID": "SOXXXX",
          "SOLUTION_VERSION": "v1.0.0",

        }
      },
      MemorySize: 128,
      Runtime: "python3.9",
      Timeout: 60
    });

    // GraphQL API Lambda Data Source
    template.hasResourceProperties("AWS::AppSync::DataSource", {
      Type: "AWS_LAMBDA",
    });

    // Cognito User Pool
    template.hasResourceProperties("AWS::Cognito::UserPool", {
      AdminCreateUserConfig: {
        AllowAdminCreateUserOnly: true
      },
      UsernameAttributes: [
        "email"
      ],
    });

    template.resourceCountIs("AWS::Cognito::UserPoolClient", 1);

  });


  test("Test main stack with oidc", () => {
    const app = new App();

    // WHEN
    const stack = new main.MainStack(app, 'MyTestStack', { authType: "OPENID_CONNECT" });
    const template = Template.fromStack(stack);

    // THEN
    template.hasResourceProperties("AWS::AppSync::GraphQLApi", {
      AuthenticationType: "OPENID_CONNECT",
    });

  });



  test("Test main stack with existing vpc", () => {
    const app = new App();

    // WHEN
    const stack = new main.MainStack(app, 'MyTestStack', { existingVpc: true });
    const template = Template.fromStack(stack);

    // THEN
    template.resourceCountIs("AWS::EC2::SecurityGroup", 3);
  });

  test("Test main stack with env", () => {
    const app = new App();
    process.env["VERSION"] = "vX.Y.Z"
    process.env["TEMPLATE_OUTPUT_BUCKET"] = "test-bucket"


    // WHEN
    const stack = new main.MainStack(app, 'MyTestStack', { solutionId: "SOXXXX", });
    const template = Template.fromStack(stack);

    // THEN
    // CfnHelper Lambda
    template.hasResourceProperties("AWS::Lambda::Function", {
      Environment: {
        Variables: {
          "TEMPLATE_OUTPUT_BUCKET": "test-bucket",
          "SOLUTION_ID": "SOXXXX",
          "SOLUTION_VERSION": "vX.Y.Z",

        }
      },
      MemorySize: 128,
      Runtime: "python3.9",
      Timeout: 60
    });
  });


  test('Test vpc stack', () => {
    const app = new App();

    // WHEN
    const stack = new Stack(app, "TestStack");

    // Prepare the stack for assertions.
    new vs.VpcStack(stack, "VpcStack")
    const template = Template.fromStack(stack);

    // THEN
    template.resourceCountIs("AWS::EC2::SecurityGroup", 3);

  });
})