// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

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
} from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { UpdateSSMStringParameterMetadata } from './init-pipeline-resource';

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

    const pipelineIdParameter = new CfnParameter(this, 'pipelineId', {
      type: 'String',
      description: 'A unique identifier for the pipeline.',
    });

    pipelineIdParameter.overrideLogicalId('pipelineId');
    this.paramLabels[pipelineIdParameter.logicalId] = {
      default: 'Pipeline Id',
    };

    const ingestionIdParameter = new CfnParameter(this, 'ingestionId', {
      type: 'String',
      description: 'A unique identifier for the ingestion.',
    });

    ingestionIdParameter.overrideLogicalId('ingestionId');
    this.paramLabels[ingestionIdParameter.logicalId] = {
      default: 'Ingestion Id',
    };

    this.paramGroups.push({
      Label: { default: 'Pipeline settings' },
      Parameters: [
        pipelineIdParameter.logicalId,
        ingestionIdParameter.logicalId,
      ],
    });

    const sourceBucketNameParameter = new CfnParameter(
      this,
      'sourceBucketName',
      {
        type: 'String',
        description: 'The name of bucket used to store raw logs.',
      }
    );

    sourceBucketNameParameter.overrideLogicalId('sourceBucketName');
    this.paramLabels[sourceBucketNameParameter.logicalId] = {
      default: 'Source Bucket Name',
    };

    const sourceBucketPrefixParameter = new CfnParameter(
      this,
      'sourceBucketPrefix',
      {
        type: 'String',
        description:
          'You can specify a custom prefix that raw logs delivers to Amazon S3 Bucket, e.g. AWSLogs/123456789012/us-east-1/.',
      }
    );

    sourceBucketPrefixParameter.overrideLogicalId('sourceBucketPrefix');
    this.paramLabels[sourceBucketPrefixParameter.logicalId] = {
      default: 'Source Bucket Prefix',
    };

    const sourceContextParameter = new CfnParameter(this, 'sourceContext', {
      type: 'String',
      default: '{}',
      description:
        'You can specify a json string as context for connector, e.g. {"DBIdentifiers": ["aurora-mysql", "aurora-postgres"]}.',
    });

    sourceContextParameter.overrideLogicalId('context');
    this.paramLabels[sourceContextParameter.logicalId] = {
      default: 'Source Context',
    };

    const memberAccountRoleArnParameter = new CfnParameter(
      this,
      'memberAccountRoleArn',
      {
        type: 'String',
        default: '',
        description:
          'The Role arn of the member account, if the current account is used, no configuration is required.',
      }
    );

    memberAccountRoleArnParameter.overrideLogicalId('memberAccountRoleArn');
    this.paramLabels[memberAccountRoleArnParameter.logicalId] = {
      default: 'Member Account Role Arn',
    };

    const s3EventDriverServiceParameter = new CfnParameter(
      this,
      's3EventDriverService',
      {
        type: 'String',
        allowedValues: ['SQS', 'EventBridge'],
        default: 'SQS',
        description:
          'Use Amazon SQS or Amazon EventBridge to build event-driven applications at scale using S3 event notifications.',
      }
    );

    s3EventDriverServiceParameter.overrideLogicalId('s3EventDriverService');
    this.paramLabels[s3EventDriverServiceParameter.logicalId] = {
      default: 'S3 event-driven service',
    };

    this.paramGroups.push({
      Label: { default: 'Source settings' },
      Parameters: [
        sourceBucketNameParameter.logicalId,
        sourceBucketPrefixParameter.logicalId,
        sourceContextParameter.logicalId,
        memberAccountRoleArnParameter.logicalId,
        s3EventDriverServiceParameter.logicalId,
      ],
    });

    this.templateOptions.metadata = {
      'AWS::CloudFormation::Interface': {
        ParameterGroups: this.paramGroups,
        ParameterLabels: this.paramLabels,
      },
    };

    const pipelineId = pipelineIdParameter.valueAsString;
    const ingestionId = ingestionIdParameter.valueAsString;
    const sourceBucketName = sourceBucketNameParameter.valueAsString;
    const sourceBucketPrefix = sourceBucketPrefixParameter.valueAsString;
    const sourceContext = sourceContextParameter.valueAsString;
    const memberAccountRoleArn = memberAccountRoleArnParameter.valueAsString;
    const s3EventDriverService = s3EventDriverServiceParameter.valueAsString;

    const microBatchStackName = ssm.StringParameter.fromStringParameterName(
      this,
      'MicroBatchStackName',
      '/MicroBatch/StackName'
    ).stringValue;

    const pipelineResourcesBuilderArn = Fn.importValue(
      `${microBatchStackName}::PipelineResourcesBuilderArn`
    );
    const pipelineResourcesBuilderFunctionName = Fn.select(
      6,
      Fn.split(':', pipelineResourcesBuilderArn)
    );

    const pipelineResourcesBuilder = lambda.Function.fromFunctionName(
      this,
      'PipelineResourcesBuilder',
      pipelineResourcesBuilderFunctionName
    );

    Aspects.of(this).add(
      new UpdateSSMStringParameterMetadata(
        this.paramGroups,
        'Parameter Store settings'
      )
    );

    const pipelineResourcesBuilderProvider = new cr.Provider(this, 'Provider', {
      onEventHandler: pipelineResourcesBuilder,
      providerFunctionName: `${Aws.STACK_NAME.substring(0, 30)}-Provider`,
    });

    const ingestionCustomResource = new CustomResource(this, 'CustomResource', {
      serviceToken: pipelineResourcesBuilderProvider.serviceToken,
      properties: {
        Id: ingestionId,
        Resource: 'ingestion',
        Item: {
          metaName: ingestionId,
          type: 'Ingestion',
          data: {
            role: {
              sts: memberAccountRoleArn,
            },
            source: {
              bucket: sourceBucketName,
              prefix: sourceBucketPrefix,
              context: sourceContext,
            },
            services: {
              s3EventDriver: s3EventDriverService,
            },
          },
          pipelineId: pipelineId,
        },
      },
    });

    // Override the logical ID
    const cfnIngestionCustomResource = ingestionCustomResource.node
      .defaultChild as CfnCustomResource;
    cfnIngestionCustomResource.overrideLogicalId('CustomResource');
  }
}
