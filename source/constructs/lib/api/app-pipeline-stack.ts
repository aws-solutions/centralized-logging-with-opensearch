// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
import {
  Aspects,
  Aws,
  CfnCondition,
  Duration,
  Fn,
  SymlinkFollowMode,
  aws_appsync as appsync,
  aws_dynamodb as ddb,
  aws_iam as iam,
  aws_lambda as lambda,
} from 'aws-cdk-lib';
import { IVpc, SecurityGroup, SubnetType } from 'aws-cdk-lib/aws-ec2';
import { Secret } from 'aws-cdk-lib/aws-secretsmanager';
import { NagSuppressions } from 'cdk-nag';
import { Construct } from 'constructs';
import * as path from 'path';

import { SharedPythonLayer } from '../layer/layer';
import { MicroBatchStack } from '../microbatch/main/services/amazon-services-stack';
import { AppPipelineFlowStack } from './app-pipeline-flow';
import { CfnGuardSuppressResourceList } from '../util/add-cfn-guard-suppression';
export interface AppPipelineStackProps {
  readonly vpc: IVpc;

  /**
   * Default Subnet Ids (Private)
   *
   */
  readonly subnetIds: string[];

  readonly processSg: SecurityGroup;
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
  readonly svcPipelineTable: ddb.Table;
  readonly appLogIngestionTable: ddb.Table;
  readonly clusterTable: ddb.Table;
  readonly grafanaTable: ddb.Table;
  readonly grafanaSecret: Secret;
  readonly logSourceTable: ddb.Table;

  readonly aosMasterRole: iam.Role;

  readonly defaultLoggingBucket: string;
  readonly defaultCmkArn: string;
  readonly sendAnonymizedUsageData: string;
  readonly solutionUuid: string;
}
export class AppPipelineStack extends Construct {
  constructor(scope: Construct, id: string, props: AppPipelineStackProps) {
    super(scope, id);

    // Create a Step Functions to orchestrate pipeline flow
    const pipeFlow = new AppPipelineFlowStack(this, 'PipelineFlowSM', {
      table: props.appPipelineTable,
      ingestionTable: props.appLogIngestionTable,
      cfnFlowSMArn: props.cfnFlowSMArn,
      microBatchStack: props.microBatchStack,
      solutionUuid: props.solutionUuid,
      sendAnonymizedUsageData: props.sendAnonymizedUsageData,
    });

    // Create a lambda layer with required python packages.
    const appPipelineLayer = new lambda.LayerVersion(this, 'AppPipelineLayer', {
      code: lambda.Code.fromAsset(
        path.join(__dirname, '../../lambda/api/app_pipeline'),
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
      //compatibleArchitectures: [lambda.Architecture.X86_64, lambda.Architecture.ARM_64],
      description: 'Default Lambda layer for AppPipeline',
    });

    // Create a lambda to handle all appPipeline related APIs.
    const appPipelineHandler = new lambda.Function(this, 'AppPipelineHandler', {
      code: lambda.AssetCode.fromAsset(
        path.join(__dirname, '../../lambda/api/app_pipeline/'),
        { followSymlinks: SymlinkFollowMode.ALWAYS }
      ),
      vpc: props.vpc,
      vpcSubnets: { subnetType: SubnetType.PRIVATE_WITH_EGRESS },
      securityGroups: [props.processSg],
      runtime: lambda.Runtime.PYTHON_3_11,
      handler: 'lambda_function.lambda_handler',
      timeout: Duration.seconds(60),
      memorySize: 1024,
      layers: [SharedPythonLayer.getInstance(this), appPipelineLayer],
      environment: {
        STATE_MACHINE_ARN: pipeFlow.stateMachineArn,
        SVC_PIPELINE_TABLE_NAME: props.svcPipelineTable.tableName,
        APPPIPELINE_TABLE: props.appPipelineTable.tableName,
        APPPIPELINE_TABLE_ARN: props.appPipelineTable.tableArn,
        APPLOGINGESTION_TABLE: props.appLogIngestionTable.tableName,
        OPENSEARCH_MASTER_ROLE_ARN: props.aosMasterRole.roleArn,
        LOG_CONFIG_TABLE: props.logConfigTable.tableName,
        CLUSTER_TABLE: props.clusterTable.tableName,
        SOLUTION_VERSION: process.env.VERSION || 'v1.0.0',
        SOLUTION_ID: props.solutionId,
        STACK_PREFIX: props.stackPrefix,
        GRAFANA_TABLE: props.grafanaTable.tableName,
        METADATA_TABLE:
          props.microBatchStack.microBatchDDBStack.MetaTable.tableName,
        ETLLOG_TABLE:
          props.microBatchStack.microBatchDDBStack.ETLLogTable.tableName,
        LOG_SOURCE_TABLE_NAME: props.logSourceTable.tableName,
        ACCOUNT_ID: Aws.ACCOUNT_ID,
        REGION: Aws.REGION,
        PARTITION: Aws.PARTITION,
        DEFAULT_LOGGING_BUCKET: props.defaultLoggingBucket,
        DEFAULT_CMK_ARN: props.defaultCmkArn,
        GRAFANA_SECRET_ARN: props.grafanaSecret.secretArn,
      },
      description: `${Aws.STACK_NAME} - AppPipeline APIs Resolver`,
    });
    props.grafanaSecret.grantRead(appPipelineHandler);
    props.grafanaSecret.grantWrite(appPipelineHandler);
    props.centralAssumeRolePolicy.attachToRole(appPipelineHandler.role!);
    props.grafanaTable.grantReadData(appPipelineHandler);
    // Grant permissions to the appPipeline lambda
    props.appPipelineTable.grantReadWriteData(appPipelineHandler);
    props.appLogIngestionTable.grantReadWriteData(appPipelineHandler);
    props.logConfigTable.grantReadData(appPipelineHandler);
    props.logSourceTable.grantReadData(appPipelineHandler);
    props.clusterTable.grantReadData(appPipelineHandler);
    props.svcPipelineTable.grantReadWriteData(appPipelineHandler);
    props.microBatchStack.microBatchDDBStack.ETLLogTable.grantReadData(
      appPipelineHandler
    );
    props.aosMasterRole.grantAssumeRole(appPipelineHandler.role!);

    appPipelineHandler.addToRolePolicy(
      new iam.PolicyStatement({
        actions: [
          'lambda:PutFunctionConcurrency',
          'lambda:GetFunctionConcurrency',
          'lambda:DeleteFunctionConcurrency',
        ],
        resources: [
          `arn:${Aws.PARTITION}:lambda:${Aws.REGION}:${Aws.ACCOUNT_ID}:function:CL-*`,
        ],
      })
    );
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
    // Grant lambda permissions to the appPipeline lambda
    appPipelineHandler.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        resources: ['*'],
        actions: ['lambda:GetAccountSettings'],
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
        resources: [
          `arn:${Aws.PARTITION}:iam::${Aws.ACCOUNT_ID}:role/aws-service-role/osis.amazonaws.com/AWSServiceRoleForAmazonOpenSearchIngestionService`,
        ],
        actions: ['iam:GetRole'],
      })
    );

    appPipelineHandler.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        resources: [
          props.microBatchStack.microBatchDDBStack.MetaTable.tableArn,
        ],
        actions: ['dynamodb:GetItem', 'dynamodb:UpdateItem'],
      })
    );
    appPipelineHandler.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['s3:GetBucketNotification', 's3:GetBucketLocation'],
        effect: iam.Effect.ALLOW,
        resources: [`arn:${Aws.PARTITION}:s3:::*`],
      })
    );
    appPipelineHandler.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['sns:GetTopicAttributes'],
        effect: iam.Effect.ALLOW,
        resources: [
          `arn:${Aws.PARTITION}:sns:${Aws.REGION}:${Aws.ACCOUNT_ID}:*`,
        ],
      })
    );
    appPipelineHandler.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['sns:GetTopicAttributes'],
        effect: iam.Effect.ALLOW,
        resources: [
          `arn:${Aws.PARTITION}:sns:${Aws.REGION}:${Aws.ACCOUNT_ID}:*`,
        ],
      })
    );
    NagSuppressions.addResourceSuppressions(appPipelineHandler, [
      {
        id: 'AwsSolutions-IAM5',
        reason: 'The managed policy needs to use any resources.',
      },
    ]);

    Aspects.of(this).add(new CfnGuardSuppressResourceList({
      "AWS::IAM::Role": ["CFN_NO_EXPLICIT_RESOURCE_NAMES"], // Explicit role names required for cross account assumption
    }));

    appPipelineHandler.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        resources: [
          props.microBatchStack.microBatchKMSStack.encryptionKey.keyArn,
        ],
        actions: ['kms:GenerateDataKey*', 'kms:Decrypt', 'kms:Encrypt'],
      })
    );

    appPipelineHandler.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        resources: [
          `arn:${Aws.PARTITION}:glue:${Aws.REGION}:${Aws.ACCOUNT_ID}:database/${props.microBatchStack.microBatchGlueStack.microBatchCentralizedDatabaseName}`,
          `arn:${Aws.PARTITION}:glue:${Aws.REGION}:${Aws.ACCOUNT_ID}:table/${props.microBatchStack.microBatchGlueStack.microBatchCentralizedDatabaseName}/*`,
          `arn:${Aws.PARTITION}:glue:${Aws.REGION}:${Aws.ACCOUNT_ID}:catalog`,
        ],
        actions: ['glue:GetTable'],
      })
    );

    const isCNRegion = new CfnCondition(this, 'isCNRegion', {
      expression: Fn.conditionEquals(Aws.PARTITION, 'aws-cn'),
    });

    appPipelineHandler.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        resources: [
          Fn.conditionIf(
            isCNRegion.logicalId,
            `arn:${Aws.PARTITION}:events:${Aws.REGION}:${Aws.ACCOUNT_ID}:rule/*`,
            `arn:${Aws.PARTITION}:scheduler:${Aws.REGION}:${Aws.ACCOUNT_ID}:schedule/*`
          ).toString(),
        ],
        actions: [
          Fn.conditionIf(
            isCNRegion.logicalId,
            'events:DescribeRule',
            'scheduler:GetSchedule'
          ).toString(),
        ],
      })
    );

    appPipelineHandler.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        resources: [
          `arn:${Aws.PARTITION}:s3:::${props.defaultLoggingBucket}`,
          `arn:${Aws.PARTITION}:s3:::${props.defaultLoggingBucket}/*`,
        ],
        actions: [
          's3:PutObject',
          's3:PutObjectAcl',
          's3:PutObjectTagging',
          's3:GetObject',
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

    appPipeLambdaDS.createResolver('resumePipeline', {
      typeName: 'Mutation',
      fieldName: 'resumePipeline',
      requestMappingTemplate: appsync.MappingTemplate.fromFile(
        path.join(
          __dirname,
          '../../graphql/vtl/app_log_pipeline/ResumePipeline.vtl'
        )
      ),
      responseMappingTemplate: appsync.MappingTemplate.lambdaResult(),
    });

    appPipeLambdaDS.createResolver('updateAppPipeline', {
      typeName: 'Mutation',
      fieldName: 'updateAppPipeline',
      requestMappingTemplate: appsync.MappingTemplate.fromFile(
        path.join(
          __dirname,
          '../../graphql/vtl/app_log_pipeline/UpdateAppPipeline.vtl'
        )
      ),
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

    appPipeLambdaDS.createResolver('getAccountUnreservedConurrency', {
      typeName: 'Query',
      fieldName: 'getAccountUnreservedConurrency',
      requestMappingTemplate: appsync.MappingTemplate.lambdaRequest(),
      responseMappingTemplate: appsync.MappingTemplate.lambdaResult(),
    });

    appPipeLambdaDS.createResolver('batchExportAppPipelines', {
      typeName: 'Query',
      fieldName: 'batchExportAppPipelines',
      requestMappingTemplate: appsync.MappingTemplate.fromFile(
        path.join(
          __dirname,
          '../../graphql/vtl/app_log_pipeline/BatchExportAppPipelines.vtl'
        )
      ),
      responseMappingTemplate: appsync.MappingTemplate.lambdaResult(),
    });

    appPipeLambdaDS.createResolver('batchImportAppPipelinesAnalyzer', {
      typeName: 'Query',
      fieldName: 'batchImportAppPipelinesAnalyzer',
      requestMappingTemplate: appsync.MappingTemplate.fromFile(
        path.join(
          __dirname,
          '../../graphql/vtl/app_log_pipeline/BatchImportAppPipelinesAnalyzer.vtl'
        )
      ),
      responseMappingTemplate: appsync.MappingTemplate.lambdaResult(),
    });
  }
}
