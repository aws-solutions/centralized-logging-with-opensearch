// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { InitLogPipelineCfnParameters } from './init-pipeline-parameters';
import { InitLogPipelineResourcesStack } from './init-pipeline-resource';

const { VERSION } = process.env;

export interface MicroBatchAwsServicesCloudFrontPipelineProps
  extends StackProps {
  readonly solutionId: string;
  readonly solutionName: string;
  readonly solutionDesc: string;
}

export class MicroBatchAwsServicesCloudFrontPipelineStack extends Stack {
  constructor(
    scope: Construct,
    id: string,
    props: MicroBatchAwsServicesCloudFrontPipelineProps
  ) {
    super(scope, id);

    let solutionId = props.solutionId;
    let solutionDesc = props.solutionDesc;
    this.templateOptions.description = `(${solutionId}-cfa) - ${solutionDesc} - CloudFront Standard Logs pipeline for Light Engine - Version ${VERSION}`;

    const sourceType = 'cloudfront';

    const parameters = new InitLogPipelineCfnParameters(
      this,
      'PipelineParameter',
      {
        sourceType: sourceType,
        templateOptions: this.templateOptions,
        addEnrichmentPlugins: true,
      }
    );

    /* NOSONAR */ new InitLogPipelineResourcesStack(this, 'PipelineResource', {
      ...props,
      ...parameters,
    });
  }
}
