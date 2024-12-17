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
import * as alarm from '../lib/opensearch/alarm-for-opensearch-stack';

describe('AlarmForOpenSearchStack', () => {
  test('Test Alarm stack', () => {
    const app = new App();
    // WHEN

    const stack = new alarm.AlarmForOpenSearchStack(app, 'MyAlarmStack', {});
    // Prepare the stack for assertions.
    const template = Template.fromStack(stack);

    // THEN
    template.hasResourceProperties('AWS::SNS::Topic', {
      DisplayName: 'AWS cloudwatch alarm topic',
    });

    template.hasResourceProperties('AWS::SNS::Subscription', {
      Protocol: 'email',
    });
  });
});
