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
import {
  Aws,
  Stack,
  Fn,
  Aspects,
  CfnParameter,
  CfnCustomResource,
  CustomResource,
  custom_resources as cr,
  aws_lambda as lambda,
  aws_ssm as ssm,
} from "aws-cdk-lib";
import { UpdateSSMStringParameterMetadata } from "./init-pipeline-resource";

const { VERSION } = process.env;

export interface MicroBatchLogIngestionProps {
  readonly solutionId: string;
  readonly solutionName: string;
  readonly solutionDesc: string;
}

export class MicroBatchLogIngestionStack extends Stack {
  private paramGroups: any[] = [];
  private paramLabels: any = {};

  constructor(
    scope: Construct,
    id: string,
    props: MicroBatchLogIngestionProps
  ) {
    super(scope, id);

    let solutionId = props.solutionId;
    let solutionDesc = props.solutionDesc;
    this.templateOptions.description = `(${solutionId}-iga) - ${solutionDesc} - Ingestion for Light Engine - Version ${VERSION}`;

    const pipelineIdParameter = new CfnParameter(this, "pipelineId", {
      type: "String",
      description: "A unique identifier for the pipeline.",
    });

    pipelineIdParameter.overrideLogicalId("pipelineId");
    this.paramLabels[pipelineIdParameter.logicalId] = {
      default: "Pipeline Id",
    };

    const ingestionIdParameter = new CfnParameter(this, "ingestionId", {
      type: "String",
      description: "A unique identifier for the ingestion.",
    });

    ingestionIdParameter.overrideLogicalId("ingestionId");
    this.paramLabels[ingestionIdParameter.logicalId] = {
      default: "Ingestion Id",
    };

    this.paramGroups.push({
      Label: { default: "Pipeline settings" },
      Parameters: [
        pipelineIdParameter.logicalId,
        ingestionIdParameter.logicalId,
      ],
    });

    const sourceBucketNameParameter = new CfnParameter(
      this,
      "sourceBucketName",
      {
        type: "String",
        description: "The name of bucket used to store raw logs.",
      }
    );

    sourceBucketNameParameter.overrideLogicalId("sourceBucketName");
    this.paramLabels[sourceBucketNameParameter.logicalId] = {
      default: "Source Bucket Name",
    };

    const sourceBucketPrefixParameter = new CfnParameter(
      this,
      "sourceBucketPrefix",
      {
        type: "String",
        description:
          "You can specify a custom prefix that raw logs delivers to Amazon S3 Bucket, e.g. AWSLogs/123456789012/us-east-1/.",
      }
    );

    sourceBucketPrefixParameter.overrideLogicalId("sourceBucketPrefix");
    this.paramLabels[sourceBucketPrefixParameter.logicalId] = {
      default: "Source Bucket Prefix",
    };

    const memberAccountRoleArnParameter = new CfnParameter(
      this,
      "memberAccountRoleArn",
      {
        type: "String",
        description:
          "The Role arn of the member account, if the current account is used, no configuration is required.",
      }
    );

    memberAccountRoleArnParameter.overrideLogicalId("memberAccountRoleArn");
    this.paramLabels[memberAccountRoleArnParameter.logicalId] = {
      default: "Member Account Role Arn",
    };

    this.paramGroups.push({
      Label: { default: "Source settings" },
      Parameters: [
        sourceBucketNameParameter.logicalId,
        sourceBucketPrefixParameter.logicalId,
        memberAccountRoleArnParameter.logicalId,
      ],
    });

    this.templateOptions.metadata = {
      "AWS::CloudFormation::Interface": {
        ParameterGroups: this.paramGroups,
        ParameterLabels: this.paramLabels,
      },
    };

    const pipelineId = pipelineIdParameter.valueAsString;
    const ingestionId = ingestionIdParameter.valueAsString;
    const sourceBucketName = sourceBucketNameParameter.valueAsString;
    const sourceBucketPrefix = sourceBucketPrefixParameter.valueAsString;
    const memberAccountRoleArn = memberAccountRoleArnParameter.valueAsString;

    const pipelineResourcesBuilderArn =
      ssm.StringParameter.fromStringParameterName(
        this,
        "SSMPipelineResourcesBuilderArn",
        "/MicroBatch/PipelineResourcesBuilderArn"
      ).stringValue;
    const pipelineResourcesBuilderFunctionName = Fn.select(
      6,
      Fn.split(":", pipelineResourcesBuilderArn)
    );

    const pipelineResourcesBuilder = lambda.Function.fromFunctionName(
      this,
      "PipelineResourcesBuilder",
      pipelineResourcesBuilderFunctionName
    );

    Aspects.of(this).add(
      new UpdateSSMStringParameterMetadata(
        this.paramGroups,
        "Parameter Store settings"
      )
    );

    const pipelineResourcesBuilderProvider = new cr.Provider(this, "Provider", {
      onEventHandler: pipelineResourcesBuilder,
      providerFunctionName: `${Aws.STACK_NAME}-Provider`,
    });

    const ingestionCustomResource = new CustomResource(this, "CustomResource", {
      serviceToken: pipelineResourcesBuilderProvider.serviceToken,
      properties: {
        Id: ingestionId,
        Resource: "ingestion",
        Item: {
          metaName: ingestionId,
          type: "Ingestion",
          data: {
            role: {
              sts: memberAccountRoleArn,
            },
            source: {
              bucket: sourceBucketName,
              prefix: sourceBucketPrefix,
            },
          },
          pipelineId: pipelineId,
        },
      },
    });

    // Override the logical ID
    const cfnIngestionCustomResource = ingestionCustomResource.node
      .defaultChild as CfnCustomResource;
    cfnIngestionCustomResource.overrideLogicalId("CustomResource");
  }
}
