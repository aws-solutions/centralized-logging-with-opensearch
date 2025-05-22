// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import {
  aws_appsync as appsync,
  aws_dynamodb as ddb,
  aws_iam as iam,
} from 'aws-cdk-lib';
import { Construct } from 'constructs';

import { CloudWatchAlarmManagerSingleton } from './lambda-construct';
import { addCfnNagSuppressRules } from '../main-stack';
import { MicroBatchStack } from '../microbatch/main/services/amazon-services-stack';

export interface PipelineAlarmStackProps {
  /**
   * Default Appsync GraphQL API for CloudWatch API Handler
   *
   * @default - None.
   */
  readonly graphqlApi: appsync.GraphqlApi;
  readonly centralAssumeRolePolicy: iam.ManagedPolicy;
  readonly microBatchStack: MicroBatchStack;

  readonly solutionId: string;
  readonly stackPrefix: string;
  readonly svcPipelineTable: ddb.Table;
  readonly appPipelineTable: ddb.Table;
  readonly appLogIngestionTable: ddb.Table;
}
export class PipelineAlarmStack extends Construct {
  constructor(scope: Construct, id: string, props: PipelineAlarmStackProps) {
    super(scope, id);

    const svcPipelineTable = props.svcPipelineTable;
    const appPipelineTable = props.appPipelineTable;
    const appLogIngestionTable = props.appLogIngestionTable;

    // Create a lambda to handle all Alarm System Request.
    const centralAlarmHandler = new CloudWatchAlarmManagerSingleton(
      this,
      'AppFlowAlarmFn',
      {
        APP_PIPELINE_TABLE_NAME: appPipelineTable.tableName,
        PIPELINE_TABLE_NAME: svcPipelineTable.tableName,
        APP_LOG_INGESTION_TABLE_NAME: appLogIngestionTable.tableName,
        METADATA_TABLE_NAME:
          props.microBatchStack.microBatchDDBStack.MetaTable.tableName,
      }
    ).handlerFunc;

    appPipelineTable.grantReadWriteData(centralAlarmHandler);
    svcPipelineTable.grantReadWriteData(centralAlarmHandler);
    appLogIngestionTable.grantReadData(centralAlarmHandler);
    props.microBatchStack.microBatchDDBStack.MetaTable.grantReadWriteData(
      centralAlarmHandler
    );
    props.microBatchStack.microBatchKMSStack.encryptionKey.grantDecrypt(
      centralAlarmHandler
    );

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
          new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            resources: [
              props.microBatchStack.microBatchKMSStack.encryptionKey.keyArn,
            ],
            actions: ['kms:GenerateDataKey*', 'kms:Decrypt', 'kms:Encrypt'],
          }),
          new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            resources: [
              props.microBatchStack.microBatchDDBStack.MetaTable.tableArn,
            ],
            actions: ['dynamodb:GetItem', 'dynamodb:UpdateItem'],
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
