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


import { App } from "aws-cdk-lib";
import {Template } from "aws-cdk-lib/assertions";
import * as s3kdspipe from '../lib/pipeline/application/s3-to-kds-stack';


describe("Application Log Stack", () => {
    test('Test app ingestion s3 as source stack', () => {
        const app = new App();
        // WHEN
        const stack = new s3kdspipe.S3toKDSStack(app, 'MyTestStack');
        // Prepare the stack for assertions.
        const template = Template.fromStack(stack);

        // THEN
        template.hasResourceProperties("AWS::AutoScaling::AutoScalingGroup", {
            MaxSize: "1",
            MinSize: "1",
        });

    });

});