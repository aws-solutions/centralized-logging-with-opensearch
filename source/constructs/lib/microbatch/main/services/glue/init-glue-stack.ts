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
import { RemovalPolicy, aws_ssm as ssm } from "aws-cdk-lib";
import { Database } from "@aws-cdk/aws-glue-alpha";

export interface  InitGlueProps {
  readonly solutionId: string;
  readonly solutionName: string;
  readonly stackPrefix: string;
}

export class InitGlueStack extends Construct {
    readonly microBatchCentralizedDatabase: Database;
    readonly microBatchTmpDatabase: Database;
    readonly microBatchCentralizedCatalog: string;
    
    constructor(scope: Construct, id: string, props: InitGlueProps) {
      super(scope, id);

      let centralizedDatabaseName = 'amazon_' + props.stackPrefix.toLowerCase() +'_centralized';
      let tmpDatabaseName = 'amazon_' + props.stackPrefix.toLowerCase() + '_tmp';
      this.microBatchCentralizedCatalog = 'AwsDataCatalog';

      this.microBatchCentralizedDatabase = new Database(this, 'CentralizedDatabase', {
        databaseName: centralizedDatabaseName,
      });

      this.microBatchCentralizedDatabase.applyRemovalPolicy(RemovalPolicy.DESTROY);

      this.microBatchTmpDatabase = new Database(this, 'TmpDatabase', {
        databaseName: tmpDatabaseName,
      });

      this.microBatchTmpDatabase.applyRemovalPolicy(RemovalPolicy.DESTROY);

      const SSMCentralizedDatabaseArn = new ssm.StringParameter(this, 'SSMCentralizedDatabaseArn', {
        parameterName: '/MicroBatch/CentralizedDatabaseArn',
        stringValue: this.microBatchCentralizedDatabase.databaseArn,
      });

      // Override the logical ID
      const cfnSSMCentralizedDatabaseArn = SSMCentralizedDatabaseArn.node.defaultChild as ssm.CfnParameter;
      cfnSSMCentralizedDatabaseArn.overrideLogicalId("SSMCentralizedDatabaseArn");

    }
}

