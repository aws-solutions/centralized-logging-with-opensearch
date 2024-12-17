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
  RemovalPolicy,
  aws_dynamodb as ddb,
  aws_kms as kms,
} from 'aws-cdk-lib';
import { Construct } from 'constructs';

export class AppTableProps {
  readonly encryptionKey: kms.IKey;
}

export class AppTableStack extends Construct {
  readonly logConfTable: ddb.Table;
  readonly instanceTable: ddb.Table;
  readonly logSourceTable: ddb.Table;
  readonly appPipelineTable: ddb.Table;
  readonly appLogIngestionTable: ddb.Table;
  readonly instanceIngestionDetailTable: ddb.Table;

  constructor(scope: Construct, id: string, props: AppTableProps) {
    super(scope, id);

    // Create a table to store logging logConf info
    this.logConfTable = new ddb.Table(this, 'LogConf', {
      partitionKey: {
        name: 'id',
        type: ddb.AttributeType.STRING,
      },
      sortKey: {
        name: 'version',
        type: ddb.AttributeType.NUMBER,
      },
      billingMode: ddb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY,
      encryption: ddb.TableEncryption.CUSTOMER_MANAGED,
      encryptionKey: props.encryptionKey,
      pointInTimeRecovery: true,
    });

    const cfnLogConfTable = this.logConfTable.node.defaultChild as ddb.CfnTable;
    cfnLogConfTable.overrideLogicalId('LogConf');

    // New Instance Table to replace LogAgentStatusTable
    this.instanceTable = new ddb.Table(this, 'Instance', {
      partitionKey: {
        name: 'id',
        type: ddb.AttributeType.STRING,
      },
      sortKey: {
        name: 'sourceId',
        type: ddb.AttributeType.STRING,
      },
      billingMode: ddb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY,
      encryption: ddb.TableEncryption.CUSTOMER_MANAGED,
      encryptionKey: props.encryptionKey,
      pointInTimeRecovery: true,
      stream: ddb.StreamViewType.NEW_IMAGE,
    });

    this.instanceTable.addGlobalSecondaryIndex({
      indexName: 'SourceToInstanceIndex',
      partitionKey: { name: 'sourceId', type: ddb.AttributeType.STRING },
      projectionType: ddb.ProjectionType.ALL,
    });

    const cfnInstanceTable = this.instanceTable.node
      .defaultChild as ddb.CfnTable;
    cfnInstanceTable.overrideLogicalId('Instance');

    // Create a table to store all logging logSource info: like Syslog, S3 bucket
    this.logSourceTable = new ddb.Table(this, 'LogSource', {
      partitionKey: {
        name: 'sourceId',
        type: ddb.AttributeType.STRING,
      },
      billingMode: ddb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY,
      encryption: ddb.TableEncryption.CUSTOMER_MANAGED,
      encryptionKey: props.encryptionKey,
      pointInTimeRecovery: true,
    });
    const cfnLogSourceTable = this.logSourceTable.node
      .defaultChild as ddb.CfnTable;
    cfnLogSourceTable.overrideLogicalId('LogSource');

    // Create a table to store logging appPipeline info
    this.appPipelineTable = new ddb.Table(this, 'AppPipeline', {
      partitionKey: {
        name: 'pipelineId',
        type: ddb.AttributeType.STRING,
      },
      billingMode: ddb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY,
      encryption: ddb.TableEncryption.CUSTOMER_MANAGED,
      encryptionKey: props.encryptionKey,
      pointInTimeRecovery: true,
    });

    const cfnAppPipelineTable = this.appPipelineTable.node
      .defaultChild as ddb.CfnTable;
    cfnAppPipelineTable.overrideLogicalId('AppPipeline');

    // Create a table to store logging appLogIngestion info
    this.appLogIngestionTable = new ddb.Table(this, 'AppLogIngestion', {
      partitionKey: {
        name: 'id',
        type: ddb.AttributeType.STRING,
      },
      billingMode: ddb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY,
      encryption: ddb.TableEncryption.CUSTOMER_MANAGED,
      encryptionKey: props.encryptionKey,
      pointInTimeRecovery: true,
    });

    this.appLogIngestionTable.addGlobalSecondaryIndex({
      indexName: 'SourceToIngestionIndex',
      partitionKey: { name: 'sourceId', type: ddb.AttributeType.STRING },
      projectionType: ddb.ProjectionType.ALL,
    });

    const cfnAppLogIngestionTable = this.appLogIngestionTable.node
      .defaultChild as ddb.CfnTable;
    cfnAppLogIngestionTable.overrideLogicalId('AppLogIngestion');

    // Create a table to store logging instanceIngestionDetail info
    this.instanceIngestionDetailTable = new ddb.Table(
      this,
      'InstanceIngestionDetail',
      {
        partitionKey: {
          name: 'id',
          type: ddb.AttributeType.STRING,
        },
        billingMode: ddb.BillingMode.PAY_PER_REQUEST,
        removalPolicy: RemovalPolicy.DESTROY,
        encryption: ddb.TableEncryption.CUSTOMER_MANAGED,
        encryptionKey: props.encryptionKey,
        pointInTimeRecovery: true,
      }
    );

    const cfnInstanceIngestionDetailTable = this.instanceIngestionDetailTable
      .node.defaultChild as ddb.CfnTable;
    cfnInstanceIngestionDetailTable.overrideLogicalId(
      'InstanceIngestionDetail'
    );
  }
}
