// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
import * as fs from 'node:fs';
import { aws_appsync as appsync } from 'aws-cdk-lib';

/**
 * Response mapping template fragment that turns a Lambda resolver failure into
 * a handled GraphQL error.
 *
 * AppSync reports any exception raised by a Lambda resolver with the errorType
 * `Lambda:Unhandled`. This fragment calls `$util.error` instead, so the client
 * receives a consistent errorType. The API Lambdas raise known errors as
 * `[ERROR_CODE] message`, and the error code becomes the errorType. Any other
 * failure is reported as `InternalFailure` with the Lambda's generic message,
 * which carries no internal details. The message is passed through unchanged
 * because the web console reads the error code and text from it.
 */
export const RESOLVER_ERROR_HANDLER = `#if($ctx.error)
  #set($errorMessage = $ctx.error.message)
  #set($errorType = "InternalFailure")
  #if($errorMessage && $errorMessage.startsWith("["))
    #set($closeIndex = $errorMessage.indexOf("]"))
    #if($closeIndex > 1)
      #set($errorType = $errorMessage.substring(1, $closeIndex))
    #end
  #end
  $util.error($errorMessage, $errorType)
#end
`;

/**
 * Lambda invoke request template on mapping template version 2018-05-29.
 *
 * With version 2017-02-28, AppSync adds a Lambda failure to the response as
 * `Lambda:Unhandled` and the response template cannot replace it. Version
 * 2018-05-29 passes the failure to the response template as `$ctx.error`, so
 * `RESOLVER_ERROR_HANDLER` decides the reported error. Every resolver that uses
 * this request template must handle errors in its response template, otherwise
 * failures are dropped.
 */
export function lambdaRequestWithErrorHandling(): appsync.MappingTemplate {
  return appsync.MappingTemplate.fromString(
    '{"version": "2018-05-29", "operation": "Invoke", "payload": $util.toJson($ctx)}'
  );
}

/**
 * Lambda result response template with handled errors.
 */
export function lambdaResultWithErrorHandling(): appsync.MappingTemplate {
  return appsync.MappingTemplate.fromString(
    `${RESOLVER_ERROR_HANDLER}$util.toJson($ctx.result)`
  );
}

/**
 * Response template read from a VTL file, with handled errors.
 */
export function responseTemplateWithErrorHandling(
  templatePath: string
): appsync.MappingTemplate {
  return appsync.MappingTemplate.fromString(
    `${RESOLVER_ERROR_HANDLER}${fs.readFileSync(templatePath, 'utf8')}`
  );
}
