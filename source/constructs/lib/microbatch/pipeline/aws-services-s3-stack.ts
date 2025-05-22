// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { InitLogPipelineCfnParameters } from './init-pipeline-parameters';
import { InitLogPipelineResourcesStack } from './init-pipeline-resource';

const { VERSION } = process.env;

export interface MicroBatchAwsServicesS3PipelineProps extends StackProps {
  readonly solutionId: string;
  readonly solutionName: string;
  readonly solutionDesc: string;
}

export class MicroBatchAwsServicesS3PipelineStack extends Stack {
  constructor(
    scope: Construct,
    id: string,
    props: MicroBatchAwsServicesS3PipelineProps
  ) {
    super(scope, id);

    let solutionId = props.solutionId;
    let solutionDesc = props.solutionDesc;
    this.templateOptions.description = `(${solutionId}-s3a) - ${solutionDesc} - S3 Access Logs pipeline for Light Engine - Version ${VERSION}`;

    const sourceType = 's3a';

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
