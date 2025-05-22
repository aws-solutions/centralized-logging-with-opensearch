// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { InitLogPipelineCfnParameters } from './init-pipeline-parameters';
import { InitLogPipelineResourcesStack } from './init-pipeline-resource';

const { VERSION } = process.env;

export interface MicroBatchApplicationFluentBitPipelineProps
  extends StackProps {
  readonly solutionId: string;
  readonly solutionName: string;
  readonly solutionDesc: string;
}

export class MicroBatchApplicationFluentBitPipelineStack extends Stack {
  constructor(
    scope: Construct,
    id: string,
    props: MicroBatchApplicationFluentBitPipelineProps
  ) {
    super(scope, id);

    const solutionId = props.solutionId;
    const solutionDesc = props.solutionDesc;
    this.templateOptions.description = `(${solutionId}-afa) - ${solutionDesc} - Application Logs ingestion from Fluent-Bit for Light Engine - Version ${VERSION}`;

    const sourceType = 'fluent-bit';

    const parameters = new InitLogPipelineCfnParameters(
      this,
      'PipelineParameter',
      {
        sourceType: sourceType,
        templateOptions: this.templateOptions,
      }
    );

    /* NOSONAR */ new InitLogPipelineResourcesStack(this, 'PipelineResource', {
      ...props,
      ...parameters,
    });
  }
}
