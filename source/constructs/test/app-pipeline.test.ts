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
import * as kds from '../lib/kinesis/kds-stack';
import '@aws-cdk/assert/jest';

describe("Application Log Stack", () => {
    test('Test kds stack with auto-scaling', () => {
        const app = new cdk.App();
        // WHEN
        const stack = new kds.KDSStack(app, 'MyTestStack', {
            enableAutoScaling: true
        });
        // Prepare the stack for assertions.
        const template = Template.fromStack(stack);

        // THEN
        template.hasResourceProperties("AWS::ApplicationAutoScaling::ScalingPolicy", {
            PolicyType: "StepScaling",
            StepScalingPolicyConfiguration: {
                AdjustmentType: "ChangeInCapacity",
                Cooldown: 600,
                MetricAggregationType: "Average",
                StepAdjustments: [
                    {
                        "MetricIntervalLowerBound": 0,
                        "ScalingAdjustment": 1
                    }
                ]
            }

        });

        template.resourceCountIs("AWS::ApiGateway::RestApi", 1);

    });



    test('Test kds stack without auto-scaling', () => {
        const app = new cdk.App();
        // WHEN
        const stack = new kds.KDSStack(app, 'MyTestStack', {
            enableAutoScaling: false
        });
        // Prepare the stack for assertions.
        const template = Template.fromStack(stack);

        // THEN
        template.hasResourceProperties("AWS::Kinesis::Stream", {
            StreamModeDetails: {
                StreamMode: "PROVISIONED"
            }

        });

    });

});