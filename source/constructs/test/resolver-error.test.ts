// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import * as fs from 'node:fs';
import * as path from 'node:path';
import { App } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import {
  RESOLVER_ERROR_HANDLER,
  lambdaRequestWithErrorHandling,
  lambdaResultWithErrorHandling,
  responseTemplateWithErrorHandling,
} from '../lib/api/resolver-error';
import { MainStack } from '../lib/main-stack';

interface ResolverProperties {
  readonly FieldName: string;
  readonly TypeName: string;
  readonly DataSourceName?: string;
  readonly RequestMappingTemplate?: string;
  readonly ResponseMappingTemplate?: string;
}

describe('Resolver error handling', () => {
  test('lambda request template uses the version that passes errors to the response template', () => {
    const template = JSON.parse(
      lambdaRequestWithErrorHandling()
        .renderTemplate()
        .replace('$util.toJson($ctx)', '{}')
    );

    expect(template).toEqual({
      version: '2018-05-29',
      operation: 'Invoke',
      payload: {},
    });
  });

  test('every VTL request template uses version 2018-05-29', () => {
    const vtlRoot = path.join(__dirname, '../graphql/vtl');
    const files = fs
      .readdirSync(vtlRoot, { recursive: true, encoding: 'utf8' })
      .filter((file) => file.endsWith('.vtl'))
      .map((file) => fs.readFileSync(path.join(vtlRoot, file), 'utf8'))
      .filter((content) => content.includes('"operation"'));

    expect(files.length).toBeGreaterThan(0);
    for (const content of files) {
      expect(content).toMatch(/"version"\s*:\s*"2018-05-29"/);
    }
  });

  test('error handler reports a handled error with a typed errorType', () => {
    expect(RESOLVER_ERROR_HANDLER).toContain('#if($ctx.error)');
    expect(RESOLVER_ERROR_HANDLER).toContain(
      '#set($errorType = "InternalFailure")'
    );
    expect(RESOLVER_ERROR_HANDLER).toContain(
      '$util.error($errorMessage, $errorType)'
    );
  });

  test('lambda result template handles errors before rendering the result', () => {
    const template = lambdaResultWithErrorHandling().renderTemplate();

    expect(template.startsWith(RESOLVER_ERROR_HANDLER)).toBe(true);
    expect(template.endsWith('$util.toJson($ctx.result)')).toBe(true);
  });

  test('file template keeps the original response template after the error handler', () => {
    const templatePath = path.join(
      __dirname,
      '../graphql/vtl/log_conf/GetLogConfigResp.vtl'
    );

    const template =
      responseTemplateWithErrorHandling(templatePath).renderTemplate();

    expect(template).toBe(
      `${RESOLVER_ERROR_HANDLER}${fs.readFileSync(templatePath, 'utf8')}`
    );
  });

  test('every Lambda resolver in the synthesized API handles errors', () => {
    // Skipping asset bundling keeps the synth free of Docker. Bundling does not
    // affect the resolver mapping templates.
    const app = new App({ context: { 'aws:cdk:bundling-stacks': [] } });
    const stack = new MainStack(app, 'ResolverErrorTestStack', {
      solutionId: 'SOXXXX',
      solutionName: 'CentralizedLoggingWithOpenSearch',
    });
    const template = Template.fromStack(stack);

    const lambdaDataSourceNames = new Set(
      Object.values(
        template.findResources('AWS::AppSync::DataSource', {
          Properties: { Type: 'AWS_LAMBDA' },
        })
      ).map((resource): string => resource.Properties.Name)
    );
    const lambdaResolvers = Object.values(
      template.findResources('AWS::AppSync::Resolver')
    )
      .map((resource): ResolverProperties => resource.Properties)
      .filter(
        (resolver) =>
          resolver.DataSourceName !== undefined &&
          lambdaDataSourceNames.has(resolver.DataSourceName)
      );

    expect(lambdaResolvers.length).toBeGreaterThan(0);
    for (const resolver of lambdaResolvers) {
      const field = `${resolver.TypeName}.${resolver.FieldName}`;
      expect({
        field,
        version: resolver.RequestMappingTemplate?.match(
          /"version"\s*:\s*"([^"]+)"/
        )?.[1],
        handlesErrors:
          resolver.ResponseMappingTemplate?.startsWith(RESOLVER_ERROR_HANDLER),
      }).toEqual({ field, version: '2018-05-29', handlesErrors: true });
    }
  });
});
