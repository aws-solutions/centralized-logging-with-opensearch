// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { aws_athena as athena, aws_s3 as s3 } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { InitKMSStack } from '../kms/init-kms-stack';

export interface InitAthenaProps {
  readonly solutionId: string;
  readonly solutionName: string;
  readonly stagingBucket: s3.Bucket;
  readonly microBatchKMSStack: InitKMSStack;
}

export class InitAthenaStack extends Construct {
  readonly microBatchAthenaWorkGroup: athena.CfnWorkGroup;

  constructor(scope: Construct, id: string, props: InitAthenaProps) {
    super(scope, id);

    let solutionName = props.solutionName;
    let stagingBucket = props.stagingBucket;
    let microBatchKMSStack = props.microBatchKMSStack;

    this.microBatchAthenaWorkGroup = new athena.CfnWorkGroup(
      this,
      'AthenaWorkGroup',
      {
        name: solutionName,
        description: 'This is an Athena WorkGroup for ' + solutionName,
        recursiveDeleteOption: true,
        state: 'ENABLED',
        workGroupConfiguration: {
          enforceWorkGroupConfiguration: true,
          engineVersion: {
            effectiveEngineVersion: 'effectiveEngineVersion',
            selectedEngineVersion: 'Athena engine version 3',
          },
          publishCloudWatchMetricsEnabled: true,
          requesterPaysEnabled: false,
          resultConfiguration: {
            encryptionConfiguration: {
              encryptionOption: 'SSE_KMS',
              kmsKey: microBatchKMSStack.encryptionKey.keyArn,
            },
            outputLocation: `s3://${stagingBucket.bucketName}/athena-results/`,
          },
        },
      }
    );

    this.microBatchAthenaWorkGroup.overrideLogicalId('AthenaWorkGroup');
  }
}
