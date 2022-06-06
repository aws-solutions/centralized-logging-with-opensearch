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


import * as cdk from '@aws-cdk/core';
import { Match, Template } from "@aws-cdk/assertions";
import * as init from '../lib/pipeline/common/opensearch-init-stack';
import * as ec2 from '@aws-cdk/aws-ec2';

import '@aws-cdk/assert/jest';

beforeEach(() => {
    jest.resetModules()
    process.env = {}
});

describe("Common OpenSearch Init Stack", () => {

    test('Test init stack', () => {
        const app = new cdk.App();
        // WHEN
        const stack = new cdk.Stack(app, "TestStack");

        const vpc = new ec2.Vpc(stack, 'VPC');
        const sg = new ec2.SecurityGroup(stack, 'SecurityGroup', {
            vpc,
            description: 'Test Security Group',
            allowAllOutbound: true
        });

        // Prepare the stack for assertions.
        new init.OpenSearchInitStack(stack, "OpenSearchInitStack", {
            vpc: vpc,
            securityGroup: sg,
            endpoint: "abc",
            domainName: "dev",
            // engineType: "Elasticsearch",
            indexPrefix: "test",
        })
        const template = Template.fromStack(stack);

        // THEN
        template.hasResourceProperties("AWS::Lambda::Function", {
            Environment: {
                "Variables": {
                    "LOG_TYPE": "",
                    "SOLUTION_VERSION": "v1.0.0",
                    "ENGINE": "OpenSearch",
                }
            },
            MemorySize: 1024,
            Runtime: "python3.9",
            Timeout: 300
        });

        template.hasResourceProperties("AWS::Lambda::LayerVersion", {
            CompatibleRuntimes: [
                "python3.9"
            ],
            Description: "Log Hub Default Lambda layer for Log Pipeline"
        });

    });

    test('Test init stack with env', () => {
        const app = new cdk.App();
        process.env["VERSION"] = "vX.Y.Z"

        // WHEN
        const stack = new cdk.Stack(app, "TestStack");

        const vpc = new ec2.Vpc(stack, 'VPC');
        const sg = new ec2.SecurityGroup(stack, 'SecurityGroup', {
            vpc,
            description: 'Test Security Group',
            allowAllOutbound: true
        });

        // Prepare the stack for assertions.
        new init.OpenSearchInitStack(stack, "OpenSearchInitStack", {
            vpc: vpc,
            securityGroup: sg,
            endpoint: "abc.com",
            domainName: "dev",
            engineType: "Elasticsearch",
            logType: "WAF",
            indexPrefix: "test",
            logProcessorRoleArn: "xxx:xxx",
            createDashboard: "No",

        })
        const template = Template.fromStack(stack);

        // THEN
        template.hasResourceProperties("AWS::Lambda::Function", {
            Environment: {
                "Variables": {
                    "LOG_TYPE": "WAF",
                    "SOLUTION_VERSION": "vX.Y.Z",
                    "ENGINE": "Elasticsearch",
                }
            },
            MemorySize: 1024,
            Runtime: "python3.9",
            Timeout: 300
        });

        template.hasResourceProperties("AWS::Lambda::LayerVersion", {
            CompatibleRuntimes: [
                "python3.9"
            ],
            Description: "Log Hub Default Lambda layer for Log Pipeline"
        });

    });



});