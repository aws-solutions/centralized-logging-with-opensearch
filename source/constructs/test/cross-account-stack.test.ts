// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { App } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import * as crossaccount from '../lib/subaccount/cross-account-stack';

describe('Application Log Stack', () => {
  test('Cross account sub stack', () => {
    const app = new App();
    // WHEN
    const stack = new crossaccount.CrossAccount(app, 'MyTestStack', {});
    // Prepare the stack for assertions.
    const template = Template.fromStack(stack);

    // THEN
    template.hasResourceProperties('AWS::KMS::Key', {
      EnableKeyRotation: true,
      PendingWindowInDays: 7,
    });
  });
});
