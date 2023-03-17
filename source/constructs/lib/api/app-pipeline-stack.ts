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
import { Construct } from "constructs";
import {
  Aws,
  Duration,
  RemovalPolicy,
  aws_dynamodb as ddb,
  aws_iam as iam,
  aws_lambda as lambda,
  SymlinkFollowMode,
} from "aws-cdk-lib";
import * as appsync from "@aws-cdk/aws-appsync-alpha";
import * as path from "path";

import { addCfnNagSuppressRules } from "../main-stack";
import { AppPipelineFlowStack } from "./app-pipeline-flow";

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
  readonly appPipelineTable: ddb.Table;
  readonly centralAssumeRolePolicy: iam.ManagedPolicy;

  readonly solutionId: string;
  readonly stackPrefix: string;
}
export class AppPipelineStack extends Construct {
  //readonly appPipelineTable: ddb.Table;
  readonly appLogIngestionTable: ddb.Table;
  constructor(scope: Construct, id: string, props: AppPipelineStackProps) {
    super(scope, id);

    // Create a table to store logging appLogIngestion info
    this.appLogIngestionTable = new ddb.Table(this, "AppLogIngestionTable", {
      partitionKey: {
        name: "id",
        type: ddb.AttributeType.STRING,
      },
      billingMode: ddb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY,
      encryption: ddb.TableEncryption.DEFAULT,
      pointInTimeRecovery: true,
    });

    const cfnAppLogIngestionTable = this.appLogIngestionTable.node
      .defaultChild as ddb.CfnTable;
    cfnAppLogIngestionTable.overrideLogicalId("AppLogIngestionTable");
    addCfnNagSuppressRules(cfnAppLogIngestionTable, [
      {
        id: "W73",
        reason: "This table has billing mode as PROVISIONED",
      },
      {
        id: "W74",
        reason:
          "This table is set to use DEFAULT encryption, the key is owned by DDB.",
      },
    ]);

    // Create a Step Functions to orchestrate pipeline flow
    const pipeFlow = new AppPipelineFlowStack(this, "PipelineFlowSM", {
      tableArn: props.appPipelineTable.tableArn,
      tableName: props.appPipelineTable.tableName,
      cfnFlowSMArn: props.cfnFlowSMArn,
    });

    // Create a lambda to handle all appPipeline related APIs.
    const appPipelineHandler = new lambda.Function(this, "AppPipelineHandler", {
      code: lambda.AssetCode.fromAsset(
        path.join(__dirname, "../../lambda/api/app_pipeline"),
        { followSymlinks: SymlinkFollowMode.ALWAYS }
      ),
      runtime: lambda.Runtime.PYTHON_3_9,
      handler: "lambda_function.lambda_handler",
      timeout: Duration.seconds(60),
      memorySize: 1024,
      environment: {
        STATE_MACHINE_ARN: pipeFlow.stateMachineArn,
        APPPIPELINE_TABLE: props.appPipelineTable.tableName,
        APPLOGINGESTION_TABLE: this.appLogIngestionTable.tableName,
        SOLUTION_VERSION: process.env.VERSION || "v1.0.0",
        SOLUTION_ID: props.solutionId,
        STACK_PREFIX: props.stackPrefix,
      },
      description: `${Aws.STACK_NAME} - AppPipeline APIs Resolver`,
    });
    props.centralAssumeRolePolicy.attachToRole(appPipelineHandler.role!);

    // Grant permissions to the appPipeline lambda
    props.appPipelineTable.grantReadWriteData(appPipelineHandler);
    this.appLogIngestionTable.grantReadWriteData(appPipelineHandler);
    appPipelineHandler.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        resources: [pipeFlow.stateMachineArn],
        actions: ["states:StartExecution"],
      })
    );
    // Grant kinesis permissions to the appPipeline lambda
    appPipelineHandler.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        resources: ["*"],
        actions: ["kinesis:DescribeStreamSummary"],
      })
    );
    // Grant es permissions to the appPipeline lambda
    appPipelineHandler.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        resources: ["*"],
        actions: ["es:DescribeElasticsearchDomain", "es:DescribeDomain"],
      })
    );

    // Add appPipeline lambda as a Datasource
    const appPipeLambdaDS = props.graphqlApi.addLambdaDataSource(
      "AppPipelineLambdaDS",
      appPipelineHandler,
      {
        description: "Lambda Resolver Datasource",
      }
    );

    // Set resolver for releted appPipeline API methods
    appPipeLambdaDS.createResolver('listAppPipelines', {
      typeName: "Query",
      fieldName: "listAppPipelines",
      requestMappingTemplate: appsync.MappingTemplate.fromFile(
        path.join(
          __dirname,
          "../../graphql/vtl/app_log_pipeline/ListAppPipelines.vtl"
        )
      ),
      responseMappingTemplate: appsync.MappingTemplate.fromFile(
        path.join(
          __dirname,
          "../../graphql/vtl/app_log_pipeline/ListAppPipelinesResp.vtl"
        )
      ),
    });

    appPipeLambdaDS.createResolver('createAppPipeline', {
      typeName: "Mutation",
      fieldName: "createAppPipeline",
      requestMappingTemplate: appsync.MappingTemplate.fromFile(
        path.join(
          __dirname,
          "../../graphql/vtl/app_log_pipeline/CreateAppPipeline.vtl"
        )
      ),
      responseMappingTemplate: appsync.MappingTemplate.lambdaResult(),
    });

    appPipeLambdaDS.createResolver('deleteAppPipeline', {
      typeName: "Mutation",
      fieldName: "deleteAppPipeline",
      requestMappingTemplate: appsync.MappingTemplate.lambdaRequest(),
      responseMappingTemplate: appsync.MappingTemplate.lambdaResult(),
    });

    appPipeLambdaDS.createResolver('getAppPipeline', {
      typeName: "Query",
      fieldName: "getAppPipeline",
      requestMappingTemplate: appsync.MappingTemplate.lambdaRequest(),
      responseMappingTemplate: appsync.MappingTemplate.fromFile(
        path.join(
          __dirname,
          "../../graphql/vtl/app_log_pipeline/GetAppPipelineResp.vtl"
        )
      ),
    });

  }
}
