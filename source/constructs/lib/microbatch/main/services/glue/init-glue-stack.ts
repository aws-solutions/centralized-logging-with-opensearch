// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { Aws, CfnOutput, aws_ssm as ssm } from 'aws-cdk-lib';
import { Construct } from 'constructs';

export interface InitGlueProps {
  readonly solutionId: string;
  readonly solutionName: string;
  readonly stackPrefix: string;
}

export class InitGlueStack extends Construct {
  readonly microBatchCentralizedDatabaseName: string;
  readonly microBatchTmpDatabaseName: string;
  readonly microBatchCentralizedCatalog: string;

  constructor(scope: Construct, id: string, props: InitGlueProps) {
    super(scope, id);

    this.microBatchCentralizedDatabaseName =
      'amazon_' + props.stackPrefix.toLowerCase() + '_centralized';
    this.microBatchTmpDatabaseName =
      'amazon_' + props.stackPrefix.toLowerCase() + '_tmp';
    this.microBatchCentralizedCatalog = 'AwsDataCatalog';

    const SSMCentralizedDatabaseArn = new ssm.StringParameter(
      this,
      'SSMCentralizedDatabaseArn',
      {
        parameterName: '/MicroBatch/CentralizedDatabaseArn',
        stringValue: `arn:${Aws.PARTITION}:glue:${Aws.REGION}:${Aws.ACCOUNT_ID}:database/${this.microBatchCentralizedDatabaseName}`,
      }
    );

    // Override the logical ID
    const cfnSSMCentralizedDatabaseArn = SSMCentralizedDatabaseArn.node
      .defaultChild as ssm.CfnParameter;
    cfnSSMCentralizedDatabaseArn.overrideLogicalId('SSMCentralizedDatabaseArn');

    new CfnOutput(this, 'CentralizedDatabaseArn', {
      description: 'Centralized Database Arn',
      value: `arn:${Aws.PARTITION}:glue:${Aws.REGION}:${Aws.ACCOUNT_ID}:database/${this.microBatchCentralizedDatabaseName}`,
    }).overrideLogicalId('CentralizedDatabaseArn');
  }
}
