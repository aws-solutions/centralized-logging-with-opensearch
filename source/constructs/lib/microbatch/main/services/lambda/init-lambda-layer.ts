// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import {
  CfnOutput,
  aws_lambda as lambda,
  RemovalPolicy,
  aws_ssm as ssm
} from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as path from 'path';


export interface InitLambdaLayerProps {
  readonly solutionId: string;
}

export class InitLambdaLayerStack extends Construct {
  readonly microBatchLambdaUtilsLayer: lambda.LayerVersion;
  readonly microBatchLambdaBoto3Layer: lambda.LayerVersion;
  readonly microBatchLambdaPyarrowLayer: lambda.LayerVersion;
  readonly microBatchLambdaEnrichmentLayer: lambda.LayerVersion;

  constructor(scope: Construct, id: string, props: InitLambdaLayerProps) {
    super(scope, id);

    this.microBatchLambdaBoto3Layer = new lambda.LayerVersion(
      this,
      'LambdaBoto3Layer',
      {
        removalPolicy: RemovalPolicy.DESTROY,
        code: lambda.AssetCode.fromAsset(path.join(__dirname, './layer'), {
          bundling: {
            image: lambda.Runtime.PYTHON_3_11.bundlingImage,
            platform: 'linux/amd64',
            command: [
              '/bin/bash',
              '-c',
              'pip install -r requirements-boto3.txt -t /asset-output/python',
            ],
          },
        }),
        compatibleRuntimes: [lambda.Runtime.PYTHON_3_11],
      }
    );

    // Override the logical ID
    const cfnMicroBatchLambdaBoto3Layer = this.microBatchLambdaBoto3Layer.node
      .defaultChild as lambda.CfnLayerVersion;
    cfnMicroBatchLambdaBoto3Layer.overrideLogicalId('LambdaBoto3Layer');

    this.microBatchLambdaPyarrowLayer = new lambda.LayerVersion(
      this,
      'LambdaPyarrowLayer',
      {
        removalPolicy: RemovalPolicy.DESTROY,
        code: lambda.AssetCode.fromAsset(path.join(__dirname, './layer'), {
          bundling: {
            image: lambda.Runtime.PYTHON_3_11.bundlingImage,
            platform: 'linux/amd64',
            command: [
              '/bin/bash',
              '-c',
              'pip install -r requirements-pyarrow.txt -t /asset-output/python && find /asset-output/python -name __pycache__ | xargs rm -rf && find /asset-output/python -type d -name tests | xargs rm -rf',
            ],
          },
        }),
        compatibleRuntimes: [lambda.Runtime.PYTHON_3_11],
      }
    );

    // Override the logical ID
    const cfnMicroBatchLambdaPyarrowLayer = this.microBatchLambdaPyarrowLayer
      .node.defaultChild as lambda.CfnLayerVersion;
    cfnMicroBatchLambdaPyarrowLayer.overrideLogicalId('LambdaPyarrowLayer');

    // Create a lambda layer with required python packages.
    this.microBatchLambdaUtilsLayer = new lambda.LayerVersion(
      this,
      'LambdaUtilsLayer',
      {
        removalPolicy: RemovalPolicy.DESTROY,
        code: lambda.AssetCode.fromAsset(path.join(__dirname, './layer'), {
          bundling: {
            image: lambda.Runtime.PYTHON_3_11.bundlingImage,
            platform: 'linux/amd64',
            command: [
              '/bin/bash',
              '-c',
              'pip install -r requirements-utils.txt -t /asset-output/python',
            ],
          },
        }),
        compatibleRuntimes: [lambda.Runtime.PYTHON_3_11],
      }
    );

    // Override the logical ID
    const cfnMicroBatchLambdaUtilsLayer = this.microBatchLambdaUtilsLayer.node
      .defaultChild as lambda.CfnLayerVersion;
    cfnMicroBatchLambdaUtilsLayer.overrideLogicalId('LambdaUtilsLayer');

    const SSMLambdaUtilsLayerArn = new ssm.StringParameter(
      this,
      'SSMLambdaUtilsLayerArn',
      {
        parameterName: '/MicroBatch/LambdaUtilsLayerArn',
        stringValue: this.microBatchLambdaUtilsLayer.layerVersionArn,
      }
    );

    // Override the logical ID
    const cfnSSMLambdaUtilsLayerArn = SSMLambdaUtilsLayerArn.node
      .defaultChild as ssm.CfnParameter;
    cfnSSMLambdaUtilsLayerArn.overrideLogicalId('SSMLambdaUtilsLayerArn');

    new CfnOutput(this, 'LambdaUtilsLayerArn', {
      description: 'Lambda Utils Layer Arn',
      value: this.microBatchLambdaUtilsLayer.layerVersionArn,
    }).overrideLogicalId('LambdaUtilsLayerArn');

    // Create a lambda layer with required python packages.
    this.microBatchLambdaEnrichmentLayer = new lambda.LayerVersion(
      this,
      'LambdaEnrichmentLayer',
      {
        removalPolicy: RemovalPolicy.DESTROY,
        code: lambda.AssetCode.fromAsset(path.join(__dirname, './layer'), {
          bundling: {
            image: lambda.Runtime.PYTHON_3_11.bundlingImage,
            platform: 'linux/amd64',
            command: [
              '/bin/bash',
              '-c',
              'pip install -r requirements-enrichment.txt -t /asset-output/python && curl --create-dirs -o /asset-output/python/maxminddb/GeoLite2-City.mmdb https://aws-gcr-solutions-assets.s3.amazonaws.com/maxmind/GeoLite2-City.mmdb',
            ],
          },
        }),
        compatibleRuntimes: [lambda.Runtime.PYTHON_3_11],
      }
    );

    // Override the logical ID
    const cfnMicroBatchLambdaEnrichmentLayer = this
      .microBatchLambdaEnrichmentLayer.node
      .defaultChild as lambda.CfnLayerVersion;
    cfnMicroBatchLambdaEnrichmentLayer.overrideLogicalId(
      'LambdaEnrichmentLayer'
    );

    const SSMMicroBatchLambdaEnrichmentLayerArn = new ssm.StringParameter(
      this,
      'SSMLambdaEnrichmentLayerArn',
      {
        parameterName: '/MicroBatch/LambdaEnrichmentLayerArn',
        stringValue: this.microBatchLambdaEnrichmentLayer.layerVersionArn,
      }
    );

    // Override the logical ID
    const cfnSSMMicroBatchLambdaEnrichmentLayerArn =
      SSMMicroBatchLambdaEnrichmentLayerArn.node
        .defaultChild as ssm.CfnParameter;
    cfnSSMMicroBatchLambdaEnrichmentLayerArn.overrideLogicalId(
      'SSMLambdaEnrichmentLayerArn'
    );

    new CfnOutput(this, 'LambdaEnrichmentLayerArn', {
      description: 'Lambda Enrichment Layer Arn',
      value: this.microBatchLambdaEnrichmentLayer.layerVersionArn,
    }).overrideLogicalId('LambdaEnrichmentLayerArn');
  }
}
