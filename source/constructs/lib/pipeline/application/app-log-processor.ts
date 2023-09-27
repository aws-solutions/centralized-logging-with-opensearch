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
import * as path from 'path';
import {
  Aws,
  Duration,
  RemovalPolicy,
  aws_iam as iam,
  aws_s3 as s3,
  aws_lambda as lambda,
  aws_ec2 as ec2,
  aws_logs as logs,
} from 'aws-cdk-lib';
import { ISecurityGroup, IVpc } from 'aws-cdk-lib/aws-ec2';
import { NagSuppressions } from 'cdk-nag';
import { Construct } from 'constructs';
import { SharedPythonLayer } from '../../layer/layer';
import { constructFactory } from '../../util/stack-helper';
import { CWLMetricStack, MetricSourceType } from '../common/cwl-metric-stack';

export interface LogProcessorProps {
  /**
   * Default VPC for OpenSearch REST API Handler
   *
   * @default - None.
   */
  readonly vpc: IVpc;

  /**
   * Default Security Group for OpenSearch REST API Handler
   *
   * @default - None.
   */
  readonly securityGroup: ISecurityGroup;

  /**
   * OpenSearch Endpoint Url
   *
   * @default - None.
   */
  readonly endpoint: string;

  /**
   * OpenSearch or Elasticsearch
   *
   * @default - OpenSearch.
   */
  readonly engineType: string;

  readonly indexPrefix: string;

  readonly backupBucketName: string;
  readonly stackPrefix: string;

  readonly source: 'MSK' | 'KDS';
  readonly env?: { [key: string]: string };

  readonly logType: string;
}

export class AppLogProcessor extends Construct {
  // public logProcessorRoleArn: string;
  public logProcessorFn: lambda.Function;

  constructor(scope: Construct, id: string, props: LogProcessorProps) {
    super(scope, id);

    // Create a lambda layer with required python packages.
    const osLayer = new lambda.LayerVersion(this, 'OpenSearchLayer', {
      code: lambda.Code.fromAsset(
        path.join(__dirname, '../../../lambda/pipeline/common/layer'),
        {
          bundling: {
            image: lambda.Runtime.PYTHON_3_9.bundlingImage,
            command: [
              'bash',
              '-c',
              'pip install -r requirements.txt -t /asset-output/python',
            ],
          },
        }
      ),
      compatibleRuntimes: [lambda.Runtime.PYTHON_3_9],
      description: `${Aws.STACK_NAME} - Lambda layer for OpenSearch`,
    });

    // Create the Log Group for the Lambda function
    const logGroup = new logs.LogGroup(this, 'LogProcessorFnLogGroup', {
      logGroupName: `/aws/lambda/${Aws.STACK_NAME}-LogProcessorFn`,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    constructFactory(CWLMetricStack)(this, 'cwlMetricStack', {
      metricSourceType: MetricSourceType.LOG_PROCESSOR_APP,
      logGroup: logGroup,
      stackPrefix: props.stackPrefix,
    });

    // Create the Log Sender Lambda
    this.logProcessorFn = new lambda.Function(this, 'LogProcessorFn', {
      description: `${Aws.STACK_NAME} - Function to process and load ${props.logType} logs through ${props.source} into OpenSearch`,
      functionName: `${Aws.STACK_NAME}-LogProcessorFn`,
      runtime: lambda.Runtime.PYTHON_3_9,
      handler: 'lambda_function.lambda_handler',
      code: lambda.Code.fromAsset(
        path.join(__dirname, '../../../lambda/pipeline/app/log-processor')
      ),
      memorySize: 1024,
      timeout: Duration.seconds(300),
      vpc: props.vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      securityGroups: [props.securityGroup],
      environment: Object.assign(
        {
          STACK_NAME: Aws.STACK_NAME,
          SOURCE: props.source,
          ENDPOINT: props.endpoint,
          ENGINE: props.engineType ?? 'OpenSearch',
          INDEX_PREFIX: props.indexPrefix,
          BACKUP_BUCKET_NAME: props.backupBucketName,
          SOLUTION_VERSION: process.env.VERSION || 'v1.0.0',
          LOG_TYPE: props.logType,
          BULK_BATCH_SIZE: '20000',
          FUNCTION_NAME: `${Aws.STACK_NAME}-LogProcessorFn`,
        },
        props.env
      ),
      layers: [SharedPythonLayer.getInstance(this), osLayer],
    });
    this.logProcessorFn.addToRolePolicy(
      new iam.PolicyStatement({
        actions: [
          'lambda:UpdateFunctionConfiguration',
          'lambda:GetFunctionConfiguration',
        ],
        resources: [
          `arn:${Aws.PARTITION}:lambda:${Aws.REGION}:${Aws.ACCOUNT_ID}:function:${Aws.STACK_NAME}-LogProcessorFn`,
        ],
      })
    );

    this.logProcessorFn.addToRolePolicy(
      new iam.PolicyStatement({
        actions: [
          'ec2:CreateNetworkInterface',
          'ec2:DeleteNetworkInterface',
          'ec2:DescribeNetworkInterfaces',
        ],
        resources: [`*`],
      })
    );
    this.logProcessorFn.addToRolePolicy(
      new iam.PolicyStatement({
        actions: [
          'es:ESHttpGet',
          'es:ESHttpDelete',
          'es:ESHttpPut',
          'es:ESHttpPost',
          'es:ESHttpHead',
          'es:ESHttpPatch',
        ],
        resources: [
          `arn:${Aws.PARTITION}:es:${Aws.REGION}:${Aws.ACCOUNT_ID}:*`,
        ],
      })
    );
    NagSuppressions.addResourceSuppressions(this.logProcessorFn, [
      {
        id: 'AwsSolutions-IAM5',
        reason: 'The managed policy needs to use any resources.',
      },
    ]);

    const backupBucket = s3.Bucket.fromBucketName(
      this,
      'backupBucket',
      props.backupBucketName
    );
    backupBucket.grantWrite(this.logProcessorFn);
  }
}
