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
  aws_appsync as appsync,
  aws_dynamodb as ddb,
  aws_iam as iam,
  aws_lambda as lambda,
  aws_logs as logs,
} from 'aws-cdk-lib';
import { Construct } from 'constructs';

import { SharedPythonLayer } from '../layer/layer';
import { addCfnNagSuppressRules } from '../main-stack';
import {
  CWLMetricStack,
  MetricSourceType,
} from '../pipeline/common/cwl-metric-stack';
import { constructFactory } from '../util/stack-helper';

export interface CloudWatchStackProps {
  /**
   * Default Appsync GraphQL API for CloudWatch API Handler
   *
   * @default - None.
   */
  readonly graphqlApi: appsync.GraphqlApi;
  readonly centralAssumeRolePolicy: iam.ManagedPolicy;

  readonly solutionId: string;
  readonly stackPrefix: string;
  readonly svcPipelineTable: ddb.Table;
  readonly appPipelineTable: ddb.Table;
  readonly appLogIngestionTable: ddb.Table;
  readonly logSourceTable: ddb.Table;
}
export class CloudWatchStack extends Construct {
  public fluentBitLogGroup: string;

  constructor(scope: Construct, id: string, props: CloudWatchStackProps) {
    super(scope, id);

    const svcPipelineTable = props.svcPipelineTable;
    const appPipelineTable = props.appPipelineTable;
    const appLogIngestionTable = props.appLogIngestionTable;
    const logSourceTable = props.logSourceTable;

    // Create the central cloudwatch metric for Fluent-bit agent
    const logGroup = new logs.LogGroup(this, 'FluentBitLogGroup', {
      logGroupName: `${props.stackPrefix}-flb-internal-group-${Aws.STACK_NAME}`,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    this.fluentBitLogGroup = logGroup.logGroupName;

    constructFactory(CWLMetricStack)(this, 'cwlFluentBitMetricStack', {
      metricSourceType: MetricSourceType.FLUENT_BIT,
      logGroup: logGroup,
      stackPrefix: props.stackPrefix,
    });

    // Create a lambda to handle all CloudWatch related APIs.
    const cwlHandlerFn = new lambda.Function(this, 'CloudWatchHandler', {
      code: lambda.AssetCode.fromAsset(
        path.join(__dirname, '../../lambda/api/cwl')
      ),
      runtime: lambda.Runtime.PYTHON_3_11,
      handler: 'lambda_function.lambda_handler',
      timeout: Duration.seconds(60),
      memorySize: 1024,
      layers: [SharedPythonLayer.getInstance(this)],
      environment: {
        SOLUTION_VERSION: process.env.VERSION || 'v1.0.0',
        SOLUTION_ID: props.solutionId,
        STACK_PREFIX: props.stackPrefix,
        SVC_PIPELINE_TABLE_NAME: svcPipelineTable.tableName,
        APP_PIPELINE_TABLE_NAME: appPipelineTable.tableName,
        APP_LOG_INGESTION_TABLE_NAME: appLogIngestionTable.tableName,
        LOG_SOURCE_TABLE_NAME: logSourceTable.tableName,
      },
      description: `${Aws.STACK_NAME} - CloudWatch APIs Resolver`,
    });
    props.centralAssumeRolePolicy.attachToRole(cwlHandlerFn.role!);

    cwlHandlerFn.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        resources: ['*'],
        actions: [
          'logs:GetLogDelivery',
          'logs:ListLogDeliveries',
          'logs:DescribeLogStreams',
          'logs:GetLogEvents',
          'logs:FilterLogEvents',
          'cloudwatch:GetMetricStatistics',
          'cloudwatch:GetMetricData',
          'logs:CreateLogGroup',
          'logs:CreateLogStream',
          'logs:PutLogEvents',
        ],
      })
    );
    svcPipelineTable.grantReadData(cwlHandlerFn);
    appPipelineTable.grantReadData(cwlHandlerFn);
    appLogIngestionTable.grantReadData(cwlHandlerFn);
    logSourceTable.grantReadData(cwlHandlerFn);

    const cfnCwlHandlerFn = cwlHandlerFn.node
      .defaultChild as lambda.CfnFunction;
    addCfnNagSuppressRules(cfnCwlHandlerFn, [
      {
        id: 'W12',
        reason: 'Lambda function requires to query logs and streams',
      },
    ]);

    // Set resolver for releted appPipeline API methods
    const cwlLambdaDS = props.graphqlApi.addLambdaDataSource(
      'cwlLambdaDS',
      cwlHandlerFn,
      {
        description: 'Lambda Resolver Data Source',
      }
    );

    cwlLambdaDS.createResolver('QueryListLogStreamsResolver', {
      typeName: 'Query',
      fieldName: 'listLogStreams',
      requestMappingTemplate: appsync.MappingTemplate.lambdaRequest(),
      responseMappingTemplate: appsync.MappingTemplate.lambdaResult(),
    });

    cwlLambdaDS.createResolver('QueryGetLogEventsResolver', {
      typeName: 'Query',
      fieldName: 'getLogEvents',
      requestMappingTemplate: appsync.MappingTemplate.lambdaRequest(),
      responseMappingTemplate: appsync.MappingTemplate.lambdaResult(),
    });

    cwlLambdaDS.createResolver('QueryGetMetricHistoryDataResolver', {
      typeName: 'Query',
      fieldName: 'getMetricHistoryData',
      requestMappingTemplate: appsync.MappingTemplate.lambdaRequest(),
      responseMappingTemplate: appsync.MappingTemplate.lambdaResult(),
    });
  }
}
