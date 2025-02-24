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
  Duration,
  aws_appsync as appsync,
  aws_dynamodb as ddb,
  aws_iam as iam,
  aws_lambda as lambda,
} from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as path from 'path';
import { SharedPythonLayer } from '../layer/layer';

export interface LogSourceStackProps {
  /**
   * Default Appsync GraphQL API for OpenSearch REST API Handler
   *
   * @default - None.
   */
  readonly graphqlApi: appsync.GraphqlApi;

  readonly logSourceTable: ddb.Table;
  readonly instanceTable: ddb.Table;
  readonly appLogIngestionTable: ddb.Table;
  readonly subAccountLinkTable: ddb.Table;

  readonly centralAssumeRolePolicy: iam.ManagedPolicy;

  readonly solutionId: string;
  readonly stackPrefix: string;
}
export class LogSourceStack extends Construct {
  constructor(scope: Construct, id: string, props: LogSourceStackProps) {
    super(scope, id);

    // Create a lambda layer with required python packages.
    const eksLayer = new lambda.LayerVersion(this, 'EKSClusterLayer', {
      code: lambda.Code.fromAsset(
        path.join(__dirname, '../../lambda/api/log_source/'),
        {
          bundling: {
            image: lambda.Runtime.PYTHON_3_11.bundlingImage,
            platform: 'linux/amd64',
            command: [
              'bash',
              '-c',
              'pip install -r requirements.txt -t /asset-output/python && cp . -r /asset-output/python/',
            ],
          },
        }
      ),
      compatibleRuntimes: [lambda.Runtime.PYTHON_3_11],
      compatibleArchitectures: [lambda.Architecture.X86_64],
      description: 'Default Lambda layer for EKS Cluster',
    });

    // Create a log source handler function
    const logSourceHandler = new lambda.Function(this, 'LogSourceHandler', {
      code: lambda.AssetCode.fromAsset(
        path.join(__dirname, '../../lambda/api/log_source/')
      ),
      runtime: lambda.Runtime.PYTHON_3_11,
      handler: 'lambda_function.lambda_handler',
      timeout: Duration.seconds(60),
      layers: [SharedPythonLayer.getInstance(this), eksLayer],
      memorySize: 1024,
      environment: {
        LOG_SOURCE_TABLE_NAME: props.logSourceTable.tableName,
        INSTANCE_TABLE_NAME: props.instanceTable.tableName,
        APP_LOG_INGESTION_TABLE_NAME: props.appLogIngestionTable.tableName,
        SUB_ACCOUNT_LINK_TABLE_NAME: props.subAccountLinkTable.tableName,
        STACK_PREFIX: props.stackPrefix,
        EKS_OIDC_CLIENT_ID: 'sts.amazonaws.com',
        SOLUTION_ID: props.solutionId,
        SOLUTION_VERSION: process.env.VERSION || 'v1.0.0',
      },
      description: `${Aws.STACK_NAME} - LogSource APIs Resolver`,
    });
    props.logSourceTable.grantReadWriteData(logSourceHandler);
    props.instanceTable.grantReadWriteData(logSourceHandler);
    props.appLogIngestionTable.grantReadData(logSourceHandler);
    props.subAccountLinkTable.grantReadData(logSourceHandler);
    props.centralAssumeRolePolicy.attachToRole(logSourceHandler.role!);

    // add eks policy documents
    logSourceHandler.addToRolePolicy(
      new iam.PolicyStatement({
        sid: 'eks',
        actions: [
          'eks:DescribeCluster',
          'eks:ListIdentityProviderConfigs',
          'eks:UpdateClusterConfig',
          'eks:ListClusters',
        ],
        effect: iam.Effect.ALLOW,
        resources: [`arn:${Aws.PARTITION}:eks:*:${Aws.ACCOUNT_ID}:cluster/*`],
      })
    );

    logSourceHandler.addToRolePolicy(
      new iam.PolicyStatement({
        sid: 'IamOidc',
        actions: [
          'iam:GetServerCertificate',
          'iam:GetOpenIDConnectProvider',
          'iam:TagOpenIDConnectProvider',
          'iam:CreateOpenIDConnectProvider',
        ],
        effect: iam.Effect.ALLOW,
        resources: [
          `arn:${Aws.PARTITION}:iam::${Aws.ACCOUNT_ID}:oidc-provider/*`,
          `arn:${Aws.PARTITION}:iam::${Aws.ACCOUNT_ID}:server-certificate/*`,
        ],
      })
    );
    logSourceHandler.addToRolePolicy(
      new iam.PolicyStatement({
        sid: 'iam',
        actions: ['iam:TagRole', 'iam:CreateRole'],
        effect: iam.Effect.ALLOW,
        resources: [
          `arn:${Aws.PARTITION}:iam::${Aws.ACCOUNT_ID}:role/*-EKS-LogAgent-Role-*`,
        ],
      })
    );

    // Add logSource lambda as a Datasource
    const LogSourceLambdaDS = props.graphqlApi.addLambdaDataSource(
      'LogSourceLambdaDS',
      logSourceHandler,
      {
        description: 'Lambda Resolver Datasource',
      }
    );

    LogSourceLambdaDS.createResolver('createLogSource', {
      typeName: 'Mutation',
      fieldName: 'createLogSource',
      requestMappingTemplate: appsync.MappingTemplate.lambdaRequest(),
      responseMappingTemplate: appsync.MappingTemplate.lambdaResult(),
    });

    LogSourceLambdaDS.createResolver('updateLogSource', {
      typeName: 'Mutation',
      fieldName: 'updateLogSource',
      requestMappingTemplate: appsync.MappingTemplate.lambdaRequest(),
      responseMappingTemplate: appsync.MappingTemplate.lambdaResult(),
    });

    LogSourceLambdaDS.createResolver('getLogSource', {
      typeName: 'Query',
      fieldName: 'getLogSource',
      requestMappingTemplate: appsync.MappingTemplate.lambdaRequest(),
      responseMappingTemplate: appsync.MappingTemplate.lambdaResult(),
    });

    LogSourceLambdaDS.createResolver('listLogSources', {
      typeName: 'Query',
      fieldName: 'listLogSources',
      requestMappingTemplate: appsync.MappingTemplate.lambdaRequest(),
      responseMappingTemplate: appsync.MappingTemplate.lambdaResult(),
    });

    LogSourceLambdaDS.createResolver('deleteLogSource', {
      typeName: 'Mutation',
      fieldName: 'deleteLogSource',
      requestMappingTemplate: appsync.MappingTemplate.lambdaRequest(),
      responseMappingTemplate: appsync.MappingTemplate.lambdaResult(),
    });

    LogSourceLambdaDS.createResolver('checkCustomPort', {
      typeName: 'Query',
      fieldName: 'checkCustomPort',
      requestMappingTemplate: appsync.MappingTemplate.lambdaRequest(),
      responseMappingTemplate: appsync.MappingTemplate.lambdaResult(),
    });
  }
}
