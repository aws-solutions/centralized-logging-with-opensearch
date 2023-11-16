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

import { Construct } from "constructs";
import { Stack, StackProps } from "aws-cdk-lib";
import { InitLogPipelineCfnParameters } from "./init-pipeline-parameters";
import { InitLogPipelineResourcesStack } from "./init-pipeline-resource";

const { VERSION } = process.env;

export interface MicroBatchApplicationS3PipelineProps extends StackProps {
  readonly solutionId: string;
  readonly solutionName: string;
  readonly solutionDesc: string;
}

export class MicroBatchApplicationS3PipelineStack extends Stack {
  constructor(
    scope: Construct,
    id: string,
    props: MicroBatchApplicationS3PipelineProps
  ) {
    super(scope, id);

    let solutionId = props.solutionId;
    let solutionDesc = props.solutionDesc;
    this.templateOptions.description = `(${solutionId}-a3a) - ${solutionDesc} - Application Logs ingestion from S3 for Light Engine - Version ${VERSION}`;

    const sourceType = "s3";

    const parameters = new InitLogPipelineCfnParameters(
      this,
      "PipelineParameter",
      {
        sourceType: sourceType,
        templateOptions: this.templateOptions,
      }
    );

    new InitLogPipelineResourcesStack(this, "PipelineResource", { // NOSONAR
      ...props,
      ...parameters,
    });
  }
}
