// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

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
