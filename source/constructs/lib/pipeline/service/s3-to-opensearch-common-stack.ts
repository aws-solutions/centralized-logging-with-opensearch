// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
import { aws_lambda as lambda } from 'aws-cdk-lib';
import { MetricSourceType } from '../common/cwl-metric-stack';
export interface S3toOpenSearchStackProps {
  /**
   * Log Type
   *
   * @default - None.
   */
  readonly logType: string;
  readonly logBucketName: string;
  readonly logBucketPrefix: string;
  readonly logBucketSuffix?: string;

  /**
   * The Account Id of log source
   * @default - None.
   */
  readonly logSourceAccountId: string;
  /**
   * The region of log source
   * @default - None.
   */
  readonly logSourceRegion: string;
  /**
   * The assume role of log source account
   * @default - None.
   */
  readonly logSourceAccountAssumeRole: string;
  /**
   * Default KMS-CMK Arn
   *
   * @default - None.
   */
  readonly defaultCmkArn?: string;

  readonly solutionId: string;
  readonly stackPrefix: string;
  readonly metricSourceType?: MetricSourceType;
  readonly enableConfigJsonParam?: boolean;
  readonly logProcessorFn: lambda.Function;
}
