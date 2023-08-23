/*
Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/
import * as path from 'path';
import * as appsync from '@aws-cdk/aws-appsync-alpha';
import {
  Aws,
  Duration,
  aws_dynamodb as ddb,
  aws_iam as iam,
  aws_lambda as lambda,
} from 'aws-cdk-lib';
import { Construct } from 'constructs';

import { AppPipelineFlowStack } from './app-pipeline-flow';
import { SharedPythonLayer } from '../layer/layer';

export interface AppPipelineStackProps {
  /**
   * Step Functions State Machine ARN for CloudFormation deployment Flow
   *
   * @default - None.
   */
  readonly cfnFlowSMArn: string;

  /**
   * Default Appsync GraphQL API for OpenSearch REST API Handler
   *
   * @default - None.
   */
  readonly graphqlApi: appsync.GraphqlApi;

  readonly centralAssumeRolePolicy: iam.ManagedPolicy;

  readonly solutionId: string;
  readonly stackPrefix: string;

  readonly logConfigTable: ddb.Table;
  readonly appPipelineTable: ddb.Table;
  readonly appLogIngestionTable: ddb.Table;
}
export class AppPipelineStack extends Construct {
  constructor(scope: Construct, id: string, props: AppPipelineStackProps) {
    super(scope, id);

    // Create a Step Functions to orchestrate pipeline flow
    const pipeFlow = new AppPipelineFlowStack(this, 'PipelineFlowSM', {
      tableArn: props.appPipelineTable.tableArn,
      tableName: props.appPipelineTable.tableName,
      ingestionTableArn: props.appLogIngestionTable.tableArn,
      ingestionTableName: props.appLogIngestionTable.tableName,
      cfnFlowSMArn: props.cfnFlowSMArn,
    });

    // Create a lambda to handle all appPipeline related APIs.
    const appPipelineHandler = new lambda.Function(this, 'AppPipelineHandler', {
      code: lambda.AssetCode.fromAsset(
        path.join(__dirname, '../../lambda/api/app_pipeline/')
      ),
      runtime: lambda.Runtime.PYTHON_3_9,
      handler: 'lambda_function.lambda_handler',
      timeout: Duration.seconds(60),
      memorySize: 1024,
      layers: [SharedPythonLayer.getInstance(this)],
      environment: {
        STATE_MACHINE_ARN: pipeFlow.stateMachineArn,
        APPPIPELINE_TABLE: props.appPipelineTable.tableName,
        APPLOGINGESTION_TABLE: props.appLogIngestionTable.tableName,
        LOG_CONFIG_TABLE: props.logConfigTable.tableName,
        SOLUTION_VERSION: process.env.VERSION || 'v1.0.0',
        SOLUTION_ID: props.solutionId,
        STACK_PREFIX: props.stackPrefix,
      },
      description: `${Aws.STACK_NAME} - AppPipeline APIs Resolver`,
    });
    props.centralAssumeRolePolicy.attachToRole(appPipelineHandler.role!);

    // Grant permissions to the appPipeline lambda
    props.appPipelineTable.grantReadWriteData(appPipelineHandler);
    props.appLogIngestionTable.grantReadWriteData(appPipelineHandler);
    props.logConfigTable.grantReadData(appPipelineHandler);
    appPipelineHandler.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        resources: [pipeFlow.stateMachineArn],
        actions: ['states:StartExecution'],
      })
    );
    // Grant kinesis permissions to the appPipeline lambda
    appPipelineHandler.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        resources: ['*'],
        actions: ['kinesis:DescribeStreamSummary'],
      })
    );
    // Grant es permissions to the appPipeline lambda
    appPipelineHandler.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        resources: ['*'],
        actions: ['es:DescribeElasticsearchDomain', 'es:DescribeDomain'],
      })
    );

    appPipelineHandler.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        resources: [`arn:${Aws.PARTITION}:iam::*:role/CL-*`],
        actions: [
          'iam:CreateRole',
          'iam:DeleteRole',
          'iam:ListRolePolicies',
          'iam:DeleteRolePolicy',
        ],
      })
    );

    // Add appPipeline lambda as a Datasource
    const appPipeLambdaDS = props.graphqlApi.addLambdaDataSource(
      'AppPipelineLambdaDS',
      appPipelineHandler,
      {
        description: 'Lambda Resolver Datasource',
      }
    );

    // Set resolver for related appPipeline API methods
    appPipeLambdaDS.createResolver('listAppPipelines', {
      typeName: 'Query',
      fieldName: 'listAppPipelines',
      requestMappingTemplate: appsync.MappingTemplate.fromFile(
        path.join(
          __dirname,
          '../../graphql/vtl/app_log_pipeline/ListAppPipelines.vtl'
        )
      ),
      responseMappingTemplate: appsync.MappingTemplate.fromFile(
        path.join(
          __dirname,
          '../../graphql/vtl/app_log_pipeline/ListAppPipelinesResp.vtl'
        )
      ),
    });

    appPipeLambdaDS.createResolver('createAppPipeline', {
      typeName: 'Mutation',
      fieldName: 'createAppPipeline',
      requestMappingTemplate: appsync.MappingTemplate.lambdaRequest(),
      responseMappingTemplate: appsync.MappingTemplate.lambdaResult(),
    });

    appPipeLambdaDS.createResolver('deleteAppPipeline', {
      typeName: 'Mutation',
      fieldName: 'deleteAppPipeline',
      requestMappingTemplate: appsync.MappingTemplate.lambdaRequest(),
      responseMappingTemplate: appsync.MappingTemplate.lambdaResult(),
    });

    appPipeLambdaDS.createResolver('getAppPipeline', {
      typeName: 'Query',
      fieldName: 'getAppPipeline',
      requestMappingTemplate: appsync.MappingTemplate.lambdaRequest(),
      responseMappingTemplate: appsync.MappingTemplate.fromFile(
        path.join(
          __dirname,
          '../../graphql/vtl/app_log_pipeline/GetAppPipelineResp.vtl'
        )
      ),
    });
  }
}
