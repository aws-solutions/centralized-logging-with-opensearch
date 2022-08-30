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


import { 
    App,
  } from "aws-cdk-lib";
import {Template } from "aws-cdk-lib/assertions";
import * as svc from '../lib/pipeline/service/service-log-pipeline-stack';

beforeEach(() => {
    jest.resetModules()
    process.env = {}
});

describe("Service Log Stack", () => {

    test('Test service log', () => {
        const app = new App();
        // WHEN
        const stack = new svc.ServiceLogPipelineStack(app, 'MyTestStack', {
            logType: "WAF"
        });
        // Prepare the stack for assertions.
        const template = Template.fromStack(stack);

        // THEN
        template.hasResourceProperties("AWS::Lambda::Function", {
            Environment: {
                "Variables": {
                    "LOG_TYPE": "WAF",
                    "SOLUTION_VERSION": "v1.0.0",
                }
            },
            MemorySize: 1024,
            Runtime: "python3.9",
            Timeout: 900
        });

        template.hasResourceProperties("AWS::Lambda::LayerVersion", {
            CompatibleRuntimes: [
                "python3.9"
            ],
            Description: "Log Hub Default Lambda layer for Log Pipeline"
        });

    });

    test('Test service log with env', () => {
        const app = new App();
        process.env["VERSION"] = "vX.Y.Z"

        // WHEN
        const stack = new svc.ServiceLogPipelineStack(app, 'MyTestStack', {
            logType: "WAF"
        });
        // Prepare the stack for assertions.
        const template = Template.fromStack(stack);

        // THEN
        template.hasResourceProperties("AWS::Lambda::Function", {
            Environment: {
                "Variables": {
                    "LOG_TYPE": "WAF",
                    "SOLUTION_VERSION": "vX.Y.Z",
                }
            }

        });

    });

    test('Test s3 access logs stack', () => {
        const app = new App();
        // WHEN
        const stack = new svc.ServiceLogPipelineStack(app, 'MyTestStack', {
            logType: "S3"
        });
        // Prepare the stack for assertions.
        const template = Template.fromStack(stack);

        // THEN
        template.hasResourceProperties("AWS::Lambda::Function", {
            Environment: {
                "Variables": {
                    "LOG_TYPE": "S3",
                }
            }

        });

    });

    test('Test waf logs stack', () => {
        const app = new App();
        // WHEN
        const stack = new svc.ServiceLogPipelineStack(app, 'MyTestStack', {
            logType: "WAF"
        });
        // Prepare the stack for assertions.
        const template = Template.fromStack(stack);

        // THEN
        template.hasResourceProperties("AWS::Lambda::Function", {
            Environment: {
                "Variables": {
                    "LOG_TYPE": "WAF",
                }
            }

        });
    });



    test('Test cloudtrail logs stack', () => {
        const app = new App();
        // WHEN
        const stack = new svc.ServiceLogPipelineStack(app, 'MyTestStack', {
            logType: "CloudTrail"
        });
        // Prepare the stack for assertions.
        const template = Template.fromStack(stack);

        // THEN
        template.hasResourceProperties("AWS::Lambda::Function", {
            Environment: {
                "Variables": {
                    "LOG_TYPE": "CloudTrail",
                }
            }

        });

    });


    test('Test cloudfront logs stack', () => {
        const app = new App();
        // WHEN
        const stack = new svc.ServiceLogPipelineStack(app, 'MyTestStack', {
            logType: "CloudFront"
        });
        // Prepare the stack for assertions.
        const template = Template.fromStack(stack);

        // THEN
        template.hasResourceProperties("AWS::Lambda::Function", {
            Environment: {
                "Variables": {
                    "LOG_TYPE": "CloudFront",
                }
            }

        });

    });



    test('Test elb logs stack', () => {
        const app = new App();
        // WHEN
        const stack = new svc.ServiceLogPipelineStack(app, 'MyTestStack', {
            logType: "ELB"
        });
        // Prepare the stack for assertions.
        const template = Template.fromStack(stack);

        // THEN
        template.hasResourceProperties("AWS::Lambda::Function", {
            Environment: {
                "Variables": {
                    "LOG_TYPE": "ELB",
                }
            }

        });
    });



    test('Test rds logs stack', () => {
        const app = new App();
        // WHEN
        const stack = new svc.ServiceLogPipelineStack(app, 'MyTestStack', {
            logType: "RDS"
        });
        // Prepare the stack for assertions.
        const template = Template.fromStack(stack);

        // THEN
        template.hasResourceProperties("AWS::Lambda::Function", {
            Environment: {
                "Variables": {
                    "LOG_TYPE": "RDS",
                }
            }

        });

    });


    test('Test lambda logs stack', () => {
        const app = new App();
        // WHEN
        const stack = new svc.ServiceLogPipelineStack(app, 'MyTestStack', {
            logType: "Lambda"
        });
        // Prepare the stack for assertions.
        const template = Template.fromStack(stack);

        // THEN
        template.hasResourceProperties("AWS::Lambda::Function", {
            Environment: {
                "Variables": {
                    "LOG_TYPE": "Lambda",
                }
            }

        });

    });


});