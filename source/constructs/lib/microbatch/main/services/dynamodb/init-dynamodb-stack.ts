// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import {
  Aws,
  RemovalPolicy,
  CfnOutput,
  aws_dynamodb as ddb,
} from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { InitKMSStack } from '../kms/init-kms-stack';

export interface InitDynamoDBProps {
  readonly solutionId: string;
  readonly microBatchKMSStack: InitKMSStack;
}

export class InitDynamoDBStack extends Construct {
  readonly ETLLogTable: ddb.Table;
  readonly MetaTable: ddb.Table;

  constructor(scope: Construct, id: string, props: InitDynamoDBProps) {
    super(scope, id);

    let microBatchKMSStack = props.microBatchKMSStack;

    // Create a table to store etl log
    this.ETLLogTable = new ddb.Table(this, 'ETLLog', {
      partitionKey: {
        name: 'executionName',
        type: ddb.AttributeType.STRING,
      },
      sortKey: {
        name: 'taskId',
        type: ddb.AttributeType.STRING,
      },
      billingMode: ddb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY,
      encryption: ddb.TableEncryption.CUSTOMER_MANAGED,
      encryptionKey: microBatchKMSStack.encryptionKey,
      timeToLiveAttribute: 'expirationTime',
      pointInTimeRecovery: true,
    });

    // Override the logical ID
    const cfnETLLogTable = this.ETLLogTable.node.defaultChild as ddb.CfnTable;
    cfnETLLogTable.overrideLogicalId('ETLLog');

    // Add Global Secondary Index For EtlLog
    this.ETLLogTable.addGlobalSecondaryIndex({
      indexName: 'IDX_PIPELINE',
      partitionKey: {
        name: 'pipelineIndexKey',
        type: ddb.AttributeType.STRING,
      },
      sortKey: { name: 'startTime', type: ddb.AttributeType.STRING },
      projectionType: ddb.ProjectionType.INCLUDE,
      nonKeyAttributes: ['endTime', 'status'],
    });

    // Create a table to store metadata
    this.MetaTable = new ddb.Table(this, 'Metadata', {
      partitionKey: {
        name: 'metaName',
        type: ddb.AttributeType.STRING,
      },
      billingMode: ddb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY,
      encryption: ddb.TableEncryption.CUSTOMER_MANAGED,
      encryptionKey: microBatchKMSStack.encryptionKey,
      pointInTimeRecovery: true,
    });

    // Override the logical ID
    const cfnMetadataTable = this.MetaTable.node.defaultChild as ddb.CfnTable;
    cfnMetadataTable.overrideLogicalId('Metadata');

    new CfnOutput(this, 'MetadataTableArn', {
      description: 'Metadata Table Arn',
      value: this.MetaTable.tableArn,
      exportName: `${Aws.STACK_NAME}::MetadataTableArn`,
    }).overrideLogicalId('MetadataTableArn');
  }
}
