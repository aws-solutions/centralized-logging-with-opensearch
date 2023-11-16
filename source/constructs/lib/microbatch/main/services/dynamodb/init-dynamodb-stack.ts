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
import { RemovalPolicy, aws_dynamodb as ddb, aws_ssm as ssm } from "aws-cdk-lib";
import { InitKMSStack } from "../kms/init-kms-stack";

export interface  InitDynamoDBProps {
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
      this.ETLLogTable = new ddb.Table(this, "ETLLog", {
        partitionKey: {
          name: "executionName",
          type: ddb.AttributeType.STRING,
        },
        sortKey : {
          name: "taskId",
          type: ddb.AttributeType.STRING,
        },
        billingMode: ddb.BillingMode.PAY_PER_REQUEST,
        removalPolicy: RemovalPolicy.DESTROY,
        encryption: ddb.TableEncryption.CUSTOMER_MANAGED,
        encryptionKey: microBatchKMSStack.encryptionKey,
        timeToLiveAttribute: "expirationTime",
        pointInTimeRecovery: true,
      });

      // Override the logical ID
      const cfnETLLogTable = this.ETLLogTable.node.defaultChild as ddb.CfnTable;
      cfnETLLogTable.overrideLogicalId("ETLLog");

      // Add Global Secondary Index For EtlLog
      this.ETLLogTable.addGlobalSecondaryIndex({
        indexName: "IDX_PIPELINE",
        partitionKey: {name: "pipelineIndexKey", type: ddb.AttributeType.STRING},
        sortKey: {name: 'startTime', type: ddb.AttributeType.STRING},
        projectionType: ddb.ProjectionType.INCLUDE,
        nonKeyAttributes: ["endTime", "status"],
      });

      // Create a table to store metadata
      this.MetaTable = new ddb.Table(this, "Metadata", {
        partitionKey: {
          name: "metaName",
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

      const SSMMetadataTableArn = new ssm.StringParameter(this, 'SSMMetadataTableArn', {
        parameterName: '/MicroBatch/MetadataTableArn',
        stringValue: this.MetaTable.tableArn,
      });

      // Override the logical ID
      const cfnSSMMetadataTableArn = SSMMetadataTableArn.node.defaultChild as ssm.CfnParameter;
      cfnSSMMetadataTableArn.overrideLogicalId("MetadataTableArn");

    }
}