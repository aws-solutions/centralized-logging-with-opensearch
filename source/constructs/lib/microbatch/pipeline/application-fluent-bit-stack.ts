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
