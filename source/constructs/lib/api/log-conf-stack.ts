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
  aws_appsync as appsync,
  aws_dynamodb as ddb,
  aws_lambda as lambda,
} from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { SharedPythonLayer } from '../layer/layer';

export interface LogConfStackProps {
  /**
   * Default Appsync GraphQL API for OpenSearch REST API Handler
   *
   * @default - None.
   */
  readonly graphqlApi: appsync.GraphqlApi;

  readonly solutionId: string;

  readonly logConfTable: ddb.Table;
}
export class LogConfStack extends Construct {
  constructor(scope: Construct, id: string, props: LogConfStackProps) {
    super(scope, id);

    // Create a lambda to handle all LogConf related APIs.
    const logConfHandler = new lambda.Function(this, 'LogConfHandler', {
      code: lambda.AssetCode.fromAsset(
        path.join(__dirname, '../../lambda/api/log_conf')
      ),
      runtime: lambda.Runtime.PYTHON_3_11,
      handler: 'lambda_function.lambda_handler',
      layers: [SharedPythonLayer.getInstance(this)],
      timeout: Duration.seconds(60),
      memorySize: 1024,
      environment: {
        LOGCONFIG_TABLE: props.logConfTable.tableName,
        SOLUTION_VERSION: process.env.VERSION || 'v1.0.0',
        SOLUTION_ID: props.solutionId,
      },
      description: `${Aws.STACK_NAME} - LogConf APIs Resolver`,
    });

    // Add logConf lambda  as a Datasource
    const LogConfLambdaDS = props.graphqlApi.addLambdaDataSource(
      'LogConfLambdaDS',
      logConfHandler,
      {
        description: 'LogConf Lambda  Resolver Datasource',
      }
    );

    // Grant permissions to the logConf lambda
    props.logConfTable.grantReadWriteData(logConfHandler);

    // Set resolver for releted logConf API methods
    LogConfLambdaDS.createResolver('createLogConfig', {
      typeName: 'Mutation',
      fieldName: 'createLogConfig',
      requestMappingTemplate: appsync.MappingTemplate.fromFile(
        path.join(__dirname, '../../graphql/vtl/log_conf/CreateLogConfig.vtl')
      ),
      responseMappingTemplate: appsync.MappingTemplate.lambdaResult(),
    });

    LogConfLambdaDS.createResolver('updateLogConfig', {
      typeName: 'Mutation',
      fieldName: 'updateLogConfig',
      requestMappingTemplate: appsync.MappingTemplate.fromFile(
        path.join(__dirname, '../../graphql/vtl/log_conf/UpdateLogConfig.vtl')
      ),
      responseMappingTemplate: appsync.MappingTemplate.lambdaResult(),
    });

    LogConfLambdaDS.createResolver('deleteLogConfig', {
      typeName: 'Mutation',
      fieldName: 'deleteLogConfig',
      requestMappingTemplate: appsync.MappingTemplate.lambdaRequest(),
      responseMappingTemplate: appsync.MappingTemplate.lambdaResult(),
    });

    LogConfLambdaDS.createResolver('getLogConfig', {
      typeName: 'Query',
      fieldName: 'getLogConfig',
      requestMappingTemplate: appsync.MappingTemplate.lambdaRequest(),
      responseMappingTemplate: appsync.MappingTemplate.fromFile(
        path.join(__dirname, '../../graphql/vtl/log_conf/GetLogConfigResp.vtl')
      ),
    });

    LogConfLambdaDS.createResolver('listLogConfigVersions', {
      typeName: 'Query',
      fieldName: 'listLogConfigVersions',
      requestMappingTemplate: appsync.MappingTemplate.fromFile(
        path.join(
          __dirname,
          '../../graphql/vtl/log_conf/ListLogConfigVersions.vtl'
        )
      ),
      responseMappingTemplate: appsync.MappingTemplate.lambdaResult(),
    });

    LogConfLambdaDS.createResolver('listLogConfigs', {
      typeName: 'Query',
      fieldName: 'listLogConfigs',
      requestMappingTemplate: appsync.MappingTemplate.fromFile(
        path.join(__dirname, '../../graphql/vtl/log_conf/ListLogConfigs.vtl')
      ),
      responseMappingTemplate: appsync.MappingTemplate.fromFile(
        path.join(
          __dirname,
          '../../graphql/vtl/log_conf/ListLogConfigsResp.vtl'
        )
      ),
    });

    LogConfLambdaDS.createResolver('checkTimeFormat', {
      typeName: 'Query',
      fieldName: 'checkTimeFormat',
      requestMappingTemplate: appsync.MappingTemplate.lambdaRequest(),
      responseMappingTemplate: appsync.MappingTemplate.lambdaResult(),
    });
  }
}
