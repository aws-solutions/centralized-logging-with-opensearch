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
import * as appsync from '@aws-cdk/aws-appsync-alpha';
import {
  Aws,
  Fn,
  CfnCondition,
  Duration,
  SymlinkFollowMode,
  aws_dynamodb as ddb,
  aws_iam as iam,
  aws_lambda as lambda,
} from 'aws-cdk-lib';
import { Construct } from 'constructs';

import { AppPipelineFlowStack } from './app-pipeline-flow';
import { SharedPythonLayer } from '../layer/layer';
import { MicroBatchStack } from '../microbatch/main/services/amazon-services-stack';

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

  readonly microBatchStack: MicroBatchStack;

  readonly centralAssumeRolePolicy: iam.ManagedPolicy;

  readonly solutionId: string;
  readonly stackPrefix: string;

  readonly logConfigTable: ddb.Table;
  readonly appPipelineTable: ddb.Table;
  readonly appLogIngestionTable: ddb.Table;
  readonly grafanaTable: ddb.Table;
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
      microBatchStack: props.microBatchStack,
    });

    // Create a lambda to handle all appPipeline related APIs.
    const appPipelineHandler = new lambda.Function(this, 'AppPipelineHandler', {
      code: lambda.AssetCode.fromAsset(
        path.join(__dirname, '../../lambda/api/app_pipeline/'),
        { followSymlinks: SymlinkFollowMode.ALWAYS },
      ),
      runtime: lambda.Runtime.PYTHON_3_11,
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
        GRAFANA_TABLE: props.grafanaTable.tableName,
        METADATA_TABLE: props.microBatchStack.microBatchDDBStack.MetaTable.tableName,
        ETLLOG_TABLE: props.microBatchStack.microBatchDDBStack.ETLLogTable.tableName,
        ACCOUNT_ID: Aws.ACCOUNT_ID,
        REGION: Aws.REGION,
        PARTITION: Aws.PARTITION,
      },
      description: `${Aws.STACK_NAME} - AppPipeline APIs Resolver`,
    });
    props.centralAssumeRolePolicy.attachToRole(appPipelineHandler.role!);
    props.grafanaTable.grantReadData(appPipelineHandler);
    // Grant permissions to the appPipeline lambda
    props.appPipelineTable.grantReadWriteData(appPipelineHandler);
    props.appLogIngestionTable.grantReadWriteData(appPipelineHandler);
    props.logConfigTable.grantReadData(appPipelineHandler);
    props.microBatchStack.microBatchDDBStack.ETLLogTable.grantReadData(appPipelineHandler);

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
          'iam:ListAttachedRolePolicies',
          'iam:DetachRolePolicy',
          'iam:DeleteRolePolicy',
          'iam:PutRolePolicy',
        ],
      })
    );

    appPipelineHandler.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        resources: [`arn:${Aws.PARTITION}:iam::${Aws.ACCOUNT_ID}:role/aws-service-role/osis.amazonaws.com/AWSServiceRoleForAmazonOpenSearchIngestionService`],
        actions: [
          'iam:GetRole',
        ],
      })
    );

    appPipelineHandler.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        resources: [props.microBatchStack.microBatchDDBStack.MetaTable.tableArn],
        actions: [
          "dynamodb:GetItem",
          "dynamodb:UpdateItem",
        ],
      })
    );

    appPipelineHandler.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        resources: [props.microBatchStack.microBatchKMSStack.encryptionKey.keyArn],
        actions: [
          "kms:GenerateDataKey*",
          "kms:Decrypt",
          "kms:Encrypt"
        ],
      })
    );

    appPipelineHandler.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        resources: [
          props.microBatchStack.microBatchGlueStack.microBatchCentralizedDatabase.databaseArn,
          `arn:${Aws.PARTITION}:glue:${Aws.REGION}:${Aws.ACCOUNT_ID}:table/${props.microBatchStack.microBatchGlueStack.microBatchCentralizedDatabase.databaseName}/*`,
          `arn:${Aws.PARTITION}:glue:${Aws.REGION}:${Aws.ACCOUNT_ID}:catalog`,
        ],
        actions: [
          "glue:GetTable"
        ],
      })
    );

    const isCNRegion = new CfnCondition(this, 'isCNRegion', {
      expression: Fn.conditionEquals(Aws.PARTITION, 'aws-cn'),
    });

    appPipelineHandler.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        resources: [
          Fn.conditionIf(isCNRegion.logicalId,
            `arn:${Aws.PARTITION}:events:${Aws.REGION}:${Aws.ACCOUNT_ID}:rule/*`,
            `arn:${Aws.PARTITION}:scheduler:${Aws.REGION}:${Aws.ACCOUNT_ID}:schedule/*`
          ).toString()
        ],
        actions: [
          Fn.conditionIf(isCNRegion.logicalId, "events:DescribeRule", "scheduler:GetSchedule").toString()
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

    appPipeLambdaDS.createResolver('createLightEngineAppPipeline', {
      typeName: 'Mutation',
      fieldName: 'createLightEngineAppPipeline',
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

    appPipeLambdaDS.createResolver('getLightEngineAppPipelineDetail', {
      typeName: 'Query',
      fieldName: 'getLightEngineAppPipelineDetail',
      requestMappingTemplate: appsync.MappingTemplate.fromFile(
        path.join(
          __dirname,
          '../../graphql/vtl/app_log_pipeline/GetLightEngineAppPipelineDetail.vtl'
        )
      ),
      responseMappingTemplate: appsync.MappingTemplate.lambdaResult(),
    });

    appPipeLambdaDS.createResolver('getLightEngineAppPipelineExecutionLogs', {
      typeName: 'Query',
      fieldName: 'getLightEngineAppPipelineExecutionLogs',
      requestMappingTemplate: appsync.MappingTemplate.fromFile(
        path.join(
          __dirname,
          '../../graphql/vtl/app_log_pipeline/GetLightEngineAppPipelineExecutionLogs.vtl'
        )
      ),
      responseMappingTemplate: appsync.MappingTemplate.lambdaResult(),
    });

    appPipeLambdaDS.createResolver('checkOSIAvailability', {
      typeName: 'Query',
      fieldName: 'checkOSIAvailability',
      requestMappingTemplate: appsync.MappingTemplate.lambdaRequest(),
      responseMappingTemplate: appsync.MappingTemplate.lambdaResult(),
    });

  }
}
