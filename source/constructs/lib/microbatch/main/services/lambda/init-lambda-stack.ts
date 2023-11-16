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
import { InitDynamoDBStack } from "../dynamodb/init-dynamodb-stack";
import { InitSQSStack } from "../sqs/init-sqs-stack";
import { InitLambdaLayerStack } from "./init-lambda-layer";
import { InitLambdaS3ObjectScanningStack } from "./init-s3-object-scanning-stack";
import { InitLambdaS3ObjectMigrationStack } from "./init-s3-object-migration-stack";
import { InitLambdaBatchUpdatePartitionStack } from "./init-etl-batch-update-partition-stack";
import { InitLambdaETLDateTransformStack } from "./init-etl-date-transform";
import { InitLambdaETLHelperStack } from "./init-etl-helper";
import { InitLambdaSendTemplateEmailStack } from "./init-ses-send-email";
import { InitLambdaPipelineResourcesBuilderStack } from "./init-pipeline-resources-builder-stack";
import { InitLambdaMetadataWriterStack } from "./init-metadata-writer";
import { InitIAMStack } from "../iam/init-iam-stack";
import { InitVPCStack } from "../vpc/init-vpc-stack";
import { InitSNSStack } from "../sns/init-sns-stack";

export interface  InitLambdaProps {
  readonly solutionId: string;
  readonly solutionName: string;
  readonly emailAddress: string;
  readonly SESState: string;
  readonly SESEmailTemplate: string;
  readonly microBatchSQSStack: InitSQSStack;
  readonly microBatchDDBStack: InitDynamoDBStack;
  readonly microBatchIAMStack: InitIAMStack;
  readonly microBatchVPCStack: InitVPCStack;
  readonly microBatchSNSStack: InitSNSStack;
}

export class InitLambdaStack extends Construct {
    readonly LambdaLayerStack: InitLambdaLayerStack;
    readonly S3ObjectScanningStack: InitLambdaS3ObjectScanningStack;
    readonly S3ObjectMigrationStack: InitLambdaS3ObjectMigrationStack;
    readonly BatchUpdatePartitionStack: InitLambdaBatchUpdatePartitionStack;
    readonly ETLDateTransformStack: InitLambdaETLDateTransformStack;
    readonly ETLHelperStack: InitLambdaETLHelperStack;
    readonly SendTemplateEmailStack: InitLambdaSendTemplateEmailStack;
    readonly PipelineResourcesBuilderStack: InitLambdaPipelineResourcesBuilderStack;
    readonly MetadataWriterStack: InitLambdaMetadataWriterStack;

    constructor(scope: Construct, id: string, props: InitLambdaProps) {
      super(scope, id);

      let solutionId = props.solutionId;
      let solutionName = props.solutionName;
      let emailAddress = props.emailAddress;
      let SESState = props.SESState;
      let SESEmailTemplate = props.SESEmailTemplate;
      let microBatchSQSStack = props.microBatchSQSStack;
      let microBatchDDBStack = props.microBatchDDBStack;
      let microBatchIAMStack = props.microBatchIAMStack;
      let microBatchVPCStack = props.microBatchVPCStack;
      let microBatchSNSStack = props.microBatchSNSStack;

      this.LambdaLayerStack = new InitLambdaLayerStack(this, 'LambdaLayerStack', props);
      this.S3ObjectScanningStack = new InitLambdaS3ObjectScanningStack(this, 'LambdaS3ObjectScanningStack', {
        solutionId: solutionId,
        microBatchSQSStack: microBatchSQSStack,
        microBatchDDBStack: microBatchDDBStack,
        microBatchIAMStack: microBatchIAMStack,
        microBatchVPCStack: microBatchVPCStack,
        microBatchLambdaLayerStack: this.LambdaLayerStack,
      });
      this.S3ObjectMigrationStack = new InitLambdaS3ObjectMigrationStack(this, 'LambdaS3ObjectMigrationStack', {
        solutionId: solutionId,
        microBatchSQSStack: microBatchSQSStack,
        microBatchDDBStack: microBatchDDBStack,
        microBatchIAMStack: microBatchIAMStack,
        microBatchVPCStack: microBatchVPCStack,
        microBatchLambdaLayerStack: this.LambdaLayerStack,
      });
      this.BatchUpdatePartitionStack = new InitLambdaBatchUpdatePartitionStack(this, 'LambdaBatchUpdatePartitionStack', {
        solutionId: solutionId,
        microBatchDDBStack: microBatchDDBStack,
        microBatchIAMStack: microBatchIAMStack,
        microBatchVPCStack: microBatchVPCStack,
        microBatchLambdaLayerStack: this.LambdaLayerStack,
      });
      this.ETLDateTransformStack = new InitLambdaETLDateTransformStack(this, 'LambdaETLDateTransformStack', props);
      this.ETLHelperStack = new InitLambdaETLHelperStack(this, 'LambdaETLHelperStack', {
        solutionId: solutionId,
        microBatchDDBStack: microBatchDDBStack,
        microBatchVPCStack: microBatchVPCStack,
        microBatchLambdaLayerStack: this.LambdaLayerStack,
        microBatchIAMStack: microBatchIAMStack,
      });
      this.SendTemplateEmailStack = new InitLambdaSendTemplateEmailStack(this, 'LambdaSendTemplateEmailStack', {
        solutionId: solutionId,
        emailAddress: emailAddress,
        SESState: SESState,
        SESEmailTemplate: SESEmailTemplate,
        microBatchDDBStack: microBatchDDBStack,
        microBatchIAMStack: microBatchIAMStack,
        microBatchVPCStack: microBatchVPCStack,
        microBatchLambdaLayerStack: this.LambdaLayerStack,
        microBatchSNSStack: microBatchSNSStack,
      });
      this.PipelineResourcesBuilderStack = new InitLambdaPipelineResourcesBuilderStack(this, 'LambdaPipelineResourcesBuilderStack', {
        solutionId: solutionId,
        solutionName: solutionName,
        microBatchDDBStack: microBatchDDBStack,
        microBatchIAMStack: microBatchIAMStack,
        microBatchVPCStack: microBatchVPCStack,
        microBatchLambdaLayerStack: this.LambdaLayerStack,
      });
      this.MetadataWriterStack = new InitLambdaMetadataWriterStack(this, 'LambdaMetadataWriterStack', {
        solutionId: solutionId,
        pipelineResourcesBuilderStack: this.PipelineResourcesBuilderStack,
        microBatchDDBStack: microBatchDDBStack,
        microBatchIAMStack: microBatchIAMStack,
        microBatchVPCStack: microBatchVPCStack,
        microBatchLambdaLayerStack: this.LambdaLayerStack,
      });
    }
}