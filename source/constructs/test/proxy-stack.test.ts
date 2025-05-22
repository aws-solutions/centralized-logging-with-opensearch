// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { App } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import * as ngx from '../lib/opensearch/nginx-for-opensearch-stack';

describe('NginxForOpenSearchStack', () => {
  test('Test Nginx Proxy stack', () => {
    const app = new App();
    // WHEN

    const stack = new ngx.NginxForOpenSearchStack(app, 'MyNginxStack', {});
    // Prepare the stack for assertions.
    const template = Template.fromStack(stack);

    // THEN
    template.hasResourceProperties('AWS::AutoScaling::AutoScalingGroup', {
      MaxSize: '4',
      MinSize: '0',
      HealthCheckType: 'ELB',
    });

    template.hasResourceProperties(
      'AWS::ElasticLoadBalancingV2::LoadBalancer',
      {
        Type: 'application',
        Scheme: 'internet-facing',
      }
    );
  });
});
