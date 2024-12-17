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
  SymlinkFollowMode,
  aws_appsync as appsync,
  aws_ec2 as ec2,
  aws_dynamodb as ddb,
  aws_lambda as lambda,
  aws_kms as kms,
} from 'aws-cdk-lib';
import { Secret } from 'aws-cdk-lib/aws-secretsmanager';
import { NagSuppressions } from 'cdk-nag';
import { Construct } from 'constructs';
import { SharedPythonLayer } from '../layer/layer';
import { MicroBatchStack } from '../microbatch/main/services/amazon-services-stack';
import { constructWithFixedLogicalId } from '../util/stack-helper';

export interface GrafanaStackProps {
  /**
   * Default Appsync GraphQL API for Grafana REST API Handler
   *
   * @default - None.
   */
  readonly graphqlApi: appsync.GraphqlApi;

  readonly solutionId: string;
  readonly stackPrefix: string;
  readonly microBatchStack: MicroBatchStack;
  readonly encryptionKey: kms.IKey;
}

export class GrafanaStack extends Construct {
  readonly grafanaTable: ddb.Table;
  readonly grafanaSecret: Secret;
  constructor(
    scope: Construct,
    id: string,
    {
      graphqlApi,
      solutionId,
      stackPrefix,
      microBatchStack,
      encryptionKey,
    }: GrafanaStackProps
  ) {
    super(scope, id);
    this.grafanaSecret = new Secret(this, `grafana-secret`, {
      encryptionKey: encryptionKey,
      secretName: `grafana-secret`,
      secretObjectValue: {},
    });
    NagSuppressions.addResourceSuppressions(
      this.grafanaSecret,
      [
        {
          id: 'AwsSolutions-SMG4',
          reason:
            'This secret does not need to have automatic rotation scheduled in that it is used to store grafana token',
        },
      ],
      true
    );

    this.grafanaTable = constructWithFixedLogicalId(ddb.Table)(
      this,
      'Grafana',
      {
        partitionKey: {
          name: 'id',
          type: ddb.AttributeType.STRING,
        },
        billingMode: ddb.BillingMode.PAY_PER_REQUEST,
        removalPolicy: RemovalPolicy.DESTROY,
        encryption: ddb.TableEncryption.DEFAULT,
        pointInTimeRecovery: true,
      }
    );

    // Create a lambda to handle all grafana related APIs.
    const grafanaHandler = new lambda.Function(this, 'GrafanaHandler', {
      code: lambda.AssetCode.fromAsset(
        path.join(__dirname, '../../lambda/api/grafana'),
        { followSymlinks: SymlinkFollowMode.ALWAYS }
      ),
      runtime: lambda.Runtime.PYTHON_3_11,
      handler: 'lambda_function.lambda_handler',
      timeout: Duration.seconds(60),
      memorySize: 1024,
      layers: [SharedPythonLayer.getInstance(this)],
      environment: {
        GRAFANA_TABLE: this.grafanaTable.tableName,
        GRAFANA_SECRET_ARN: this.grafanaSecret.secretArn,
        STACK_PREFIX: stackPrefix,
        SOLUTION_VERSION: process.env.VERSION || 'v1.0.0',
        SOLUTION_ID: solutionId,
      },
      description: `${Aws.STACK_NAME} - Grafana APIs Resolver`,
      vpc: microBatchStack.microBatchVPCStack.vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      securityGroups: [microBatchStack.microBatchVPCStack.privateSecurityGroup],
    });
    this.grafanaSecret.grantRead(grafanaHandler);
    this.grafanaSecret.grantWrite(grafanaHandler);
    // Grant permissions to the grafana lambda
    this.grafanaTable.grantReadWriteData(grafanaHandler);

    // Add grafana lambda as a Datasource
    const grafanaLambdaDS = graphqlApi.addLambdaDataSource(
      'GrafanaLambdaDS',
      grafanaHandler,
      {
        description: 'Lambda Resolver Datasource',
      }
    );

    grafanaLambdaDS.createResolver('createGrafana', {
      typeName: 'Mutation',
      fieldName: 'createGrafana',
      requestMappingTemplate: appsync.MappingTemplate.fromFile(
        path.join(__dirname, '../../graphql/vtl/grafana/CreateGrafana.vtl')
      ),
      responseMappingTemplate: appsync.MappingTemplate.lambdaResult(),
    });

    grafanaLambdaDS.createResolver('listGrafanas', {
      typeName: 'Query',
      fieldName: 'listGrafanas',
      requestMappingTemplate: appsync.MappingTemplate.fromFile(
        path.join(__dirname, '../../graphql/vtl/grafana/ListGrafanas.vtl')
      ),
      responseMappingTemplate: appsync.MappingTemplate.fromFile(
        path.join(__dirname, '../../graphql/vtl/grafana/ListGrafanaResp.vtl')
      ),
    });

    grafanaLambdaDS.createResolver('getGrafana', {
      typeName: 'Query',
      fieldName: 'getGrafana',
      requestMappingTemplate: appsync.MappingTemplate.lambdaRequest(),
      responseMappingTemplate: appsync.MappingTemplate.fromFile(
        path.join(__dirname, '../../graphql/vtl/grafana/GetGrafanaResp.vtl')
      ),
    });

    grafanaLambdaDS.createResolver('deleteGrafana', {
      typeName: 'Mutation',
      fieldName: 'deleteGrafana',
      requestMappingTemplate: appsync.MappingTemplate.lambdaRequest(),
      responseMappingTemplate: appsync.MappingTemplate.lambdaResult(),
    });

    grafanaLambdaDS.createResolver('updateGrafana', {
      typeName: 'Mutation',
      fieldName: 'updateGrafana',
      requestMappingTemplate: appsync.MappingTemplate.fromFile(
        path.join(__dirname, '../../graphql/vtl/grafana/UpdateGrafana.vtl')
      ),
      responseMappingTemplate: appsync.MappingTemplate.lambdaResult(),
    });

    grafanaLambdaDS.createResolver('checkGrafana', {
      typeName: 'Query',
      fieldName: 'checkGrafana',
      requestMappingTemplate: appsync.MappingTemplate.lambdaRequest(),
      responseMappingTemplate: appsync.MappingTemplate.lambdaResult(),
    });
  }
}
