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

import { SharedPythonLayer } from '../layer/layer';
import { addCfnNagSuppressRules } from '../main-stack';

export interface PipelineAlarmStackProps {
  /**
   * Default Appsync GraphQL API for CloudWatch API Handler
   *
   * @default - None.
   */
  readonly graphqlApi: appsync.GraphqlApi;
  readonly centralAssumeRolePolicy: iam.ManagedPolicy;

  readonly solutionId: string;
  readonly stackPrefix: string;
  readonly svcPipelineTableArn: string;
  readonly appPipelineTableArn: string;
  readonly appLogIngestionTableArn: string;
}
export class PipelineAlarmStack extends Construct {
  constructor(scope: Construct, id: string, props: PipelineAlarmStackProps) {
    super(scope, id);

    const svcPipelineTable = ddb.Table.fromTableArn(
      this,
      'svcPipeline',
      props.svcPipelineTableArn
    );
    const appPipelineTable = ddb.Table.fromTableArn(
      this,
      'appPipeline',
      props.appPipelineTableArn
    );
    const appLogIngestionTable = ddb.Table.fromTableArn(
      this,
      'appLogIngestion',
      props.appLogIngestionTableArn
    );

    // Create a lambda to handle all Alarm System Request.
    const centralAlarmHandler = new lambda.Function(
      this,
      'CentralAlarmHandler',
      {
        code: lambda.AssetCode.fromAsset(
          path.join(__dirname, '../../lambda/api/alarm')
        ),
        runtime: lambda.Runtime.PYTHON_3_9,
        handler: 'lambda_function.lambda_handler',
        timeout: Duration.seconds(60),
        memorySize: 1024,
        layers: [SharedPythonLayer.getInstance(this)],
        environment: {
          SOLUTION_VERSION: process.env.VERSION || 'v1.0.0',
          SOLUTION_ID: props.solutionId,
          STACK_PREFIX: props.stackPrefix,
          APP_PIPELINE_TABLE_NAME: appPipelineTable.tableName,
          PIPELINE_TABLE_NAME: svcPipelineTable.tableName,
          APP_LOG_INGESTION_TABLE_NAME: appLogIngestionTable.tableName,
        },
        description: `${Aws.STACK_NAME} - Central Alarm System APIs Resolver`,
      }
    );
    appPipelineTable.grantReadWriteData(centralAlarmHandler);
    svcPipelineTable.grantReadWriteData(centralAlarmHandler);
    appLogIngestionTable.grantReadData(centralAlarmHandler);

    const centralAlarmHandlerPolicy = new iam.Policy(
      this,
      'CentralAlarmHandlerPolicy',
      {
        statements: [
          new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            resources: ['*'],
            actions: [
              'sns:ListTopics',
              'sns:CreateTopic',
              'sns:Subscribe',
              'sns:Unsubscribe',
              'sns:ListSubscriptionsByTopic',
            ],
          }),
          new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            resources: ['*'],
            actions: [
              'cloudwatch:PutMetricAlarm',
              'cloudwatch:DeleteAlarms',
              'cloudwatch:DescribeAlarms',
            ],
          }),
        ],
      }
    );

    centralAlarmHandler.role!.attachInlinePolicy(centralAlarmHandlerPolicy);
    addCfnNagSuppressRules(
      centralAlarmHandlerPolicy.node.defaultChild as iam.CfnPolicy,
      [
        {
          id: 'W12',
          reason:
            'This policy needs to be able to control un-predicable sns topics',
        },
      ]
    );

    // Add resource lambda as a Datasource
    const centralAlarmLambdaDS = props.graphqlApi.addLambdaDataSource(
      'CentralAlarmLambdaDS',
      centralAlarmHandler,
      {
        description: 'Central Alarm Lambda Resolver Datasource',
      }
    );

    centralAlarmLambdaDS.createResolver('GetPipelineAlarmDataResolver', {
      typeName: 'Query',
      fieldName: 'getPipelineAlarm',
      requestMappingTemplate: appsync.MappingTemplate.lambdaRequest(),
      responseMappingTemplate: appsync.MappingTemplate.lambdaResult(),
    });

    centralAlarmLambdaDS.createResolver('CreatePipelineAlarmResolver', {
      typeName: 'Mutation',
      fieldName: 'createPipelineAlarm',
      requestMappingTemplate: appsync.MappingTemplate.lambdaRequest(),
      responseMappingTemplate: appsync.MappingTemplate.lambdaResult(),
    });

    centralAlarmLambdaDS.createResolver('UpdatePipelineAlarmResolver', {
      typeName: 'Mutation',
      fieldName: 'updatePipelineAlarm',
      requestMappingTemplate: appsync.MappingTemplate.lambdaRequest(),
      responseMappingTemplate: appsync.MappingTemplate.lambdaResult(),
    });

    centralAlarmLambdaDS.createResolver('DeletePipelineAlarmResolver', {
      typeName: 'Mutation',
      fieldName: 'deletePipelineAlarm',
      requestMappingTemplate: appsync.MappingTemplate.lambdaRequest(),
      responseMappingTemplate: appsync.MappingTemplate.lambdaResult(),
    });
  }
}
