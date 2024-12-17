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

import {
  Aws,
  RemovalPolicy,
  aws_s3 as s3,
  aws_lambda as lambda,
  aws_logs as logs,
} from 'aws-cdk-lib';
import { ISecurityGroup, IVpc } from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';
import { constructFactory } from '../../util/stack-helper';
import { CWLMetricStack, MetricSourceType } from '../common/cwl-metric-stack';
import {
  OpenSearchInitStack,
  OpenSearchInitProps,
} from '../common/opensearch-init-stack';
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
   * OpenSearch Domain Name
   *
   * @default - None.
   */
  readonly domainName: string;
  /**
   * OpenSearch or Elasticsearch
   *
   * @default - OpenSearch.
   */
  readonly engineType: string;

  readonly indexPrefix: string;
  /**
   * Wheather to create Sample Dashboard
   *
   * @default - Yes.
   */
  readonly createDashboard?: string;

  /**
   * A list of plugins
   *
   * @default - None.
   */
  readonly plugins?: string;

  /**
   * Log proceersor lambda reserve concurrency
   *
   * @default - 0.
   */
  readonly logProcessorConcurrency: number;

  readonly logBucketName?: string;
  readonly backupBucketName: string;
  readonly stackPrefix: string;

  readonly source: 'MSK' | 'KDS' | 'SQS' | 'EVENT_BRIDGE';
  readonly subCategory: 'RT' | 'S3' | 'FLB' | 'CWL';
  readonly env?: { [key: string]: string };

  readonly logType: string;
  readonly warmAge?: string;
  readonly coldAge?: string;
  readonly retainAge?: string;
  readonly rolloverSize?: string;
  readonly indexSuffix?: string;
  readonly refreshInterval?: string;
  readonly codec?: string;
  readonly shardNumbers?: string;
  readonly replicaNumbers?: string;
  readonly solutionId: string;

  /**
   * A gzip base64 encoded string of OpenSearch index template.
   */
  readonly indexTemplateGzipBase64?: string;
  readonly enableConfigJsonParam?: boolean;
}

export class AppLogProcessor extends Construct {
  // public logProcessorRoleArn: string;
  public logProcessorFn: lambda.Function;

  constructor(scope: Construct, id: string, props: LogProcessorProps) {
    super(scope, id);

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

    const osProps: OpenSearchInitProps = {
      vpc: props.vpc,
      securityGroup: props.securityGroup,
      endpoint: props.endpoint,
      indexPrefix: props.indexPrefix,
      engineType: props.engineType,
      domainName: props.domainName,
      createDashboard: props.createDashboard,
      backupBucketName: props.backupBucketName,
      logSourceAccountId: '',
      logSourceRegion: Aws.REGION,
      logSourceAccountAssumeRole: '',
      source: props.source,
      subCategory: props.subCategory,
      shardNumbers: props.shardNumbers,
      replicaNumbers: props.replicaNumbers,
      warmAge: props.warmAge,
      coldAge: props.coldAge,
      retainAge: props.retainAge,
      rolloverSize: props.rolloverSize,
      indexSuffix: props.indexSuffix,
      codec: props.codec,
      refreshInterval: props.refreshInterval,
      solutionId: props.solutionId,
      indexTemplateGzipBase64: props.indexTemplateGzipBase64,
      logType: props.logType,
      env: props.env,
      enableConfigJsonParam: props.enableConfigJsonParam,
      logProcessorConcurrency: props.logProcessorConcurrency,
    };

    const osInitStack = new OpenSearchInitStack(
      this,
      'OpenSearchInit',
      osProps
    );
    this.logProcessorFn = osInitStack.logProcessorFn;

    const backupBucket = s3.Bucket.fromBucketName(
      this,
      'backupBucket',
      props.backupBucketName
    );
    backupBucket.grantWrite(this.logProcessorFn);
  }
}
