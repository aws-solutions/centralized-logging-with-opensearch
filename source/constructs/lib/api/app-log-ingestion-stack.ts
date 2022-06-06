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

import {
  Construct,
  Duration,
  RemovalPolicy,
  Fn,
  Aws,
  CfnCondition,
} from "@aws-cdk/core";
import * as appsync from "@aws-cdk/aws-appsync";
import * as lambda from "@aws-cdk/aws-lambda";
import * as path from "path";
import * as s3 from "@aws-cdk/aws-s3";
import * as ddb from "@aws-cdk/aws-dynamodb";
import * as iam from "@aws-cdk/aws-iam";
import { CfnDocument } from "@aws-cdk/aws-ssm";

import { appIngestionFlowStack } from "../api/app-log-ingestion-flow";

import { EKSClusterPodLogPipelineFlowStack } from "./eks-cluster-pod-log-pipeline-flow";
export interface AppLogIngestionStackProps {
  /**
   * Default Appsync GraphQL API for OpenSearch REST API Handler
   *
   * @default - None.
   */
  readonly graphqlApi: appsync.GraphqlApi;

  /**
   * Step Functions State Machine ARN for CloudFormation deployment Flow
   *
   * @default - None.
   */
  readonly cfnFlowSMArn: string;

  /**
   * Default VPC ID for Log Agent
   *
   * @default - None.
   */
  readonly defaultVPC: string;

  /**
   * Default Subnets ID for Log Agent
   *
   * @default - None.
   */
  readonly defaultPublicSubnets: string[];

  /**
   * Default KMS-CMK Arn
   *
   * @default - None.
   */
  readonly cmkKeyArn: string

  instanceGroupTable: ddb.Table;
  instanceMetaTable: ddb.Table;
  logConfTable: ddb.Table;
  appPipelineTable: ddb.Table;
  ec2LogSourceTable: ddb.Table;
  s3LogSourceTable: ddb.Table;
  eksClusterLogSourceTable: ddb.Table;
  configFileBucket: s3.Bucket;
  appLogIngestionTable: ddb.Table;
  logAgentEKSDeploymentKindTable:ddb.Table
}
export class AppLogIngestionStack extends Construct {
  constructor(scope: Construct, id: string, props: AppLogIngestionStackProps) {
    super(scope, id);

    const solution_id = "SO8025";

    const isCN = new CfnCondition(this, "IsChinaRegionCondition", {
      expression: Fn.conditionEquals(Aws.PARTITION, "aws-cn"),
    });

    const s3Domain = Fn.conditionIf(
      isCN.logicalId,
      "s3.cn-north-1.amazonaws.com.cn",
      "s3.amazonaws.com"
    ).toString();

    const downloadLogConfigDocument = new CfnDocument(
      this,
      "Fluent-BitConfigDownloading",
      {
        content: {
          schemaVersion: "2.2",
          description:
            "Download Fluent-Bit config file and reboot the Fluent-Bit",
          parameters: {
            INSTANCEID: {
              type: "String",
              default: "",
              description: "(Required) Instance Id",
            },
          },
          mainSteps: [
            {
              action: "aws:runShellScript",
              name: "stopFluentBit",
              inputs: {
                runCommand: ["sudo service fluent-bit stop"],
              },
            },
            {
              action: "aws:downloadContent",
              name: "downloadFluentBitParserConfig",
              inputs: {
                sourceType: "S3",
                sourceInfo: `{\"path\":\"https://${props.configFileBucket.bucketRegionalDomainName}/app_log_config/{{INSTANCEID}}/applog_parsers.conf\"}`,
                destinationPath: "/opt/fluent-bit/etc",
              },
            },
            {
              action: "aws:downloadContent",
              name: "downloadFluentBitConfig",
              inputs: {
                sourceType: "S3",
                sourceInfo: `{\"path\":\"https://${props.configFileBucket.bucketRegionalDomainName}/app_log_config/{{INSTANCEID}}/fluent-bit.conf\"}`,
                destinationPath: "/opt/fluent-bit/etc",
              },
            },
            {
              action: "aws:downloadContent",
              name: "downloadUniformTimeFormatLua",
              inputs: {
                sourceType: "S3",
                sourceInfo: `{\"path\":\"https://${props.configFileBucket.bucketRegionalDomainName}/app_log_config/{{INSTANCEID}}/uniform-time-format.lua\"}`,
                destinationPath: "/opt/fluent-bit/etc",
              },
            },
            {
              action: "aws:runShellScript",
              name: "startFluentBit",
              inputs: {
                runCommand: [
                  "sudo systemctl enable fluent-bit.service",
                  "sudo service fluent-bit start",
                ],
              },
            },
          ],
        },
        documentFormat: "JSON",
        documentType: "Command",
      }
    );

    // Create the async child lambda to handle time-consuming tasks for ec2 source.
    const appLogIngestionEC2AsyncHandler = new lambda.Function(
      this,
      "AppLogIngestionEC2AsyncHandler",
      {
        code: lambda.AssetCode.fromAsset(
          path.join(__dirname, "../../lambda/api/app_log_ingestion")
        ),
        runtime: lambda.Runtime.PYTHON_3_9,
        handler: "ec2_as_source_lambda_function.lambda_handler",
        timeout: Duration.minutes(15),
        memorySize: 2048,
        environment: {
          APPLOGINGESTION_TABLE: props.appLogIngestionTable.tableName,
          SSM_LOG_CONFIG_DOCUMENT_NAME: downloadLogConfigDocument.ref,
          CONFIG_FILE_S3_BUCKET_NAME: props.configFileBucket.bucketName!,
          INSTANCE_META_TABLE_NAME: props.instanceMetaTable.tableName!,
          APP_PIPELINE_TABLE_NAME: props.appPipelineTable.tableName!,
          APP_LOG_CONFIG_TABLE_NAME: props.logConfTable.tableName!,
          INSTANCE_GROUP_TABLE_NAME: props.instanceGroupTable.tableName!,
          EC2_LOG_SOURCE_TABLE_NAME: props.ec2LogSourceTable.tableName!,
          S3_LOG_SOURCE_TABLE_NAME: props.s3LogSourceTable.tableName!,
          EKS_CLUSTER_SOURCE_TABLE_NAME:
            props.eksClusterLogSourceTable.tableName!,
          SOLUTION_ID: solution_id,
          SOLUTION_VERSION: process.env.VERSION
            ? process.env.VERSION
            : "v1.0.0",
        },
        description:
          "Log Hub - Async Child AppLogIngestion Resolver for EC2 Source",
      }
    );
    appLogIngestionEC2AsyncHandler.node.addDependency(
      downloadLogConfigDocument
    );

    // Grant permissions to the appLogIngestion lambda
    props.appLogIngestionTable.grantReadWriteData(
      appLogIngestionEC2AsyncHandler
    );
    props.instanceMetaTable.grantReadWriteData(appLogIngestionEC2AsyncHandler);
    props.appPipelineTable.grantReadWriteData(appLogIngestionEC2AsyncHandler);
    props.logConfTable.grantReadWriteData(appLogIngestionEC2AsyncHandler);
    props.instanceGroupTable.grantReadWriteData(appLogIngestionEC2AsyncHandler);
    props.configFileBucket.grantReadWrite(appLogIngestionEC2AsyncHandler);
    props.ec2LogSourceTable.grantReadWriteData(appLogIngestionEC2AsyncHandler);
    props.s3LogSourceTable.grantReadWriteData(appLogIngestionEC2AsyncHandler);
    props.eksClusterLogSourceTable.grantReadWriteData(
      appLogIngestionEC2AsyncHandler
    );

    appLogIngestionEC2AsyncHandler.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["lambda:InvokeFunction", "lambda:InvokeAsync"],
        effect: iam.Effect.ALLOW,
        resources: ["*"],
      })
    );
    appLogIngestionEC2AsyncHandler.addToRolePolicy(
      new iam.PolicyStatement({
        actions: [
          "ssm:DescribeInstanceInformation",
          "ssm:SendCommand",
          "ssm:GetCommandInvocation",
          "ec2:DescribeInstances",
        ],
        effect: iam.Effect.ALLOW,
        resources: ["*"],
      })
    );

    // Create the async child lambda to handle time-consuming tasks for S3 source.
    const appLogIngestionS3AsyncHandler = new lambda.Function(
      this,
      "AppLogIngestionS3AsyncHandler",
      {
        code: lambda.AssetCode.fromAsset(
          path.join(__dirname, "../../lambda/api/app_log_ingestion")
        ),
        runtime: lambda.Runtime.PYTHON_3_9,
        handler: "s3_as_source_lambda_function.lambda_handler",
        timeout: Duration.minutes(15),
        memorySize: 2048,
        environment: {
          APPLOGINGESTION_TABLE: props.appLogIngestionTable.tableName,
          SSM_LOG_CONFIG_DOCUMENT_NAME: downloadLogConfigDocument.ref,
          CONFIG_FILE_S3_BUCKET_NAME: props.configFileBucket.bucketName!,
          INSTANCE_META_TABLE_NAME: props.instanceMetaTable.tableName!,
          APP_PIPELINE_TABLE_NAME: props.appPipelineTable.tableName!,
          APP_LOG_CONFIG_TABLE_NAME: props.logConfTable.tableName!,
          INSTANCE_GROUP_TABLE_NAME: props.instanceGroupTable.tableName!,
          EC2_LOG_SOURCE_TABLE_NAME: props.ec2LogSourceTable.tableName!,
          S3_LOG_SOURCE_TABLE_NAME: props.s3LogSourceTable.tableName!,
          EKS_CLUSTER_SOURCE_TABLE_NAME:
            props.eksClusterLogSourceTable.tableName!,
          SOLUTION_ID: solution_id,
          SOLUTION_VERSION: process.env.VERSION
            ? process.env.VERSION
            : "v1.0.0",
        },
        description:
          "Log Hub - Async Child AppLogIngestion Resolver for S3 Source",
      }
    );
    appLogIngestionS3AsyncHandler.node.addDependency(downloadLogConfigDocument);

    // Grant permissions to the appLogIngestion lambda
    props.appLogIngestionTable.grantReadWriteData(
      appLogIngestionS3AsyncHandler
    );
    props.instanceMetaTable.grantReadWriteData(appLogIngestionS3AsyncHandler);
    props.appPipelineTable.grantReadWriteData(appLogIngestionS3AsyncHandler);
    props.logConfTable.grantReadWriteData(appLogIngestionS3AsyncHandler);
    props.instanceGroupTable.grantReadWriteData(appLogIngestionS3AsyncHandler);
    props.configFileBucket.grantReadWrite(appLogIngestionS3AsyncHandler);
    props.ec2LogSourceTable.grantReadWriteData(appLogIngestionS3AsyncHandler);
    props.s3LogSourceTable.grantReadWriteData(appLogIngestionS3AsyncHandler);
    props.eksClusterLogSourceTable.grantReadWriteData(
      appLogIngestionS3AsyncHandler
    );

    appLogIngestionS3AsyncHandler.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["lambda:InvokeFunction", "lambda:InvokeAsync"],
        effect: iam.Effect.ALLOW,
        resources: ["*"],
      })
    );
    appLogIngestionS3AsyncHandler.addToRolePolicy(
      new iam.PolicyStatement({
        actions: [
          "ssm:DescribeInstanceInformation",
          "ssm:SendCommand",
          "ssm:GetCommandInvocation",
          "ec2:DescribeInstances",
        ],
        effect: iam.Effect.ALLOW,
        resources: ["*"],
      })
    );

    // Create a Step Functions to orchestrate pipeline flow
    const appIngestionFlow = new appIngestionFlowStack(this, "PipelineFlowSM", {
      tableArn: props.appLogIngestionTable.tableArn,
      cfnFlowSMArn: props.cfnFlowSMArn,
    });

    // Create a lambda to handle all appLogIngestion related APIs.
    const appLogIngestionHandler = new lambda.Function(
      this,
      "AppLogIngestionHandler",
      {
        code: lambda.AssetCode.fromAsset(
          path.join(__dirname, "../../lambda/api/app_log_ingestion")
        ),
        runtime: lambda.Runtime.PYTHON_3_9,
        handler: "lambda_function.lambda_handler",
        timeout: Duration.seconds(60),
        memorySize: 1024,
        environment: {
          ASYNC_EC2_CHILD_LAMBDA_ARN:
            appLogIngestionEC2AsyncHandler.functionArn,
          ASYNC_S3_CHILD_LAMBDA_ARN: appLogIngestionS3AsyncHandler.functionArn,
          APPLOGINGESTION_TABLE: props.appLogIngestionTable.tableName,
          SSM_LOG_CONFIG_DOCUMENT_NAME: downloadLogConfigDocument.ref,
          CONFIG_FILE_S3_BUCKET_NAME: props.configFileBucket.bucketName!,
          INSTANCE_META_TABLE_NAME: props.instanceMetaTable.tableName!,
          APP_PIPELINE_TABLE_NAME: props.appPipelineTable.tableName!,
          APP_LOG_CONFIG_TABLE_NAME: props.logConfTable.tableName!,
          EC2_LOG_SOURCE_TABLE_NAME: props.ec2LogSourceTable.tableName!,
          S3_LOG_SOURCE_TABLE_NAME: props.s3LogSourceTable.tableName!,
          EKS_CLUSTER_SOURCE_TABLE_NAME:
            props.eksClusterLogSourceTable.tableName!,
          STATE_MACHINE_ARN: appIngestionFlow.stateMachineArn!,
          INSTANCE_GROUP_TABLE_NAME: props.instanceGroupTable.tableName!,
          LOG_AGENT_VPC_ID: props.defaultVPC,
          LOG_AGENT_SUBNETS_IDS: Fn.join(",", props.defaultPublicSubnets),
          DEFAULT_CMK_ARN: props.cmkKeyArn!,
          SOLUTION_ID: solution_id,
          SOLUTION_VERSION: process.env.VERSION
            ? process.env.VERSION
            : "v1.0.0",
        },
        description: "Log Hub - AppLogIngestion APIs Resolver",
      }
    );
    appLogIngestionHandler.node.addDependency(
      downloadLogConfigDocument,
      appLogIngestionEC2AsyncHandler,
      appLogIngestionS3AsyncHandler
    );

    // Grant permissions to the appLogIngestion lambda
    props.appLogIngestionTable.grantReadWriteData(appLogIngestionHandler);
    props.instanceMetaTable.grantReadWriteData(appLogIngestionHandler);
    props.appPipelineTable.grantReadWriteData(appLogIngestionHandler);
    props.logConfTable.grantReadWriteData(appLogIngestionHandler);
    props.instanceGroupTable.grantReadWriteData(appLogIngestionHandler);
    props.configFileBucket.grantReadWrite(appLogIngestionHandler);
    props.s3LogSourceTable.grantReadWriteData(appLogIngestionHandler);
    props.eksClusterLogSourceTable.grantReadWriteData(appLogIngestionHandler);

    // Grant SSM Policy to the InstanceMeta lambda
    const ssmPolicy = new iam.PolicyStatement({
      actions: [
        "ssm:DescribeInstanceInformation",
        "ssm:SendCommand",
        "ssm:GetCommandInvocation",
        "ec2:DescribeInstances",
      ],
      effect: iam.Effect.ALLOW,
      resources: ["*"],
    });
    appLogIngestionHandler.addToRolePolicy(ssmPolicy);
    appLogIngestionHandler.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["lambda:InvokeFunction"],
        effect: iam.Effect.ALLOW,
        resources: ["*"],
      })
    );
    appLogIngestionHandler.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        resources: [appIngestionFlow.stateMachineArn],
        actions: ["states:StartExecution"],
      })
    );
    appLogIngestionHandler.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        resources: ["*"],
        actions: ["iam:PutRolePolicy"],
      })
    );

    // Add appLogIngestion table as a Datasource
    const appLogIngestionDynamoDS = props.graphqlApi.addDynamoDbDataSource(
      "AppLogIngestionDynamoDS",
      props.appLogIngestionTable,
      {
        description: "DynamoDB Resolver Datasource",
      }
    );
    appLogIngestionDynamoDS.createResolver({
      typeName: "Query",
      fieldName: "getAppLogIngestion",
      requestMappingTemplate: appsync.MappingTemplate.dynamoDbGetItem(
        "id",
        "id"
      ),
      responseMappingTemplate: appsync.MappingTemplate.dynamoDbResultItem(),
    });

    // Add appLogIngestion lambda as a Datasource
    const appLogIngestionLambdaDS = props.graphqlApi.addLambdaDataSource(
      "AppLogIngestionLambdaDS",
      appLogIngestionHandler,
      {
        description: "Lambda Resolver Datasource",
      }
    );

    // Set resolver for releted appLogIngestion API methods
    appLogIngestionLambdaDS.createResolver({
      typeName: "Query",
      fieldName: "listAppLogIngestions",
      requestMappingTemplate: appsync.MappingTemplate.lambdaRequest(),
      responseMappingTemplate: appsync.MappingTemplate.lambdaResult(),
    });

    appLogIngestionLambdaDS.createResolver({
      typeName: "Mutation",
      fieldName: "createAppLogIngestion",
      requestMappingTemplate: appsync.MappingTemplate.lambdaRequest(),
      responseMappingTemplate: appsync.MappingTemplate.lambdaResult(),
    });

    appLogIngestionLambdaDS.createResolver({
      typeName: "Mutation",
      fieldName: "deleteAppLogIngestion",
      requestMappingTemplate: appsync.MappingTemplate.lambdaRequest(),
      responseMappingTemplate: appsync.MappingTemplate.lambdaResult(),
    });

    // Create a Step Functions to orchestrate eks cluster pod log pipeline flow
    const eksClusterPodLogPipelineStfnLambdaHandle = new lambda.Function(
      this,
      "EKSClusterPodLogPipelineStfnLambdaHandle",
      {
        code: lambda.AssetCode.fromAsset(
          path.join(__dirname, "../../lambda/api/app_log_ingestion")
        ),
        runtime: lambda.Runtime.PYTHON_3_9,
        handler:
          "eks_cluster_pod_log_pipeline_stfn_lambda_function.lambda_handler",
        timeout: Duration.seconds(60),
        memorySize: 1024,
        environment: {
          SOLUTION_ID: solution_id,
          SOLUTION_VERSION: process.env.VERSION
            ? process.env.VERSION
            : "v1.0.0",
          CONFIG_FILE_S3_BUCKET_NAME: props.configFileBucket.bucketName!,

          INSTANCE_META_TABLE_NAME: props.instanceMetaTable.tableName!,
          APP_PIPELINE_TABLE_NAME: props.appPipelineTable.tableName!,
          APP_LOG_CONFIG_TABLE_NAME: props.logConfTable.tableName!,
          INSTANCE_GROUP_TABLE_NAME: props.instanceGroupTable.tableName!,
          APPLOGINGESTION_TABLE: props.appLogIngestionTable.tableName!,

          EC2_LOG_SOURCE_TABLE_NAME: props.ec2LogSourceTable.tableName!,
          S3_LOG_SOURCE_TABLE_NAME: props.s3LogSourceTable.tableName!,

          EKS_CLUSTER_SOURCE_TABLE_NAME:
            props.eksClusterLogSourceTable.tableName!,

        },
        description: "Log Hub - Updating EKS Cluster Pod Log Ingestion APIs",
      }
    );
    eksClusterPodLogPipelineStfnLambdaHandle.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["lambda:InvokeFunction", "lambda:InvokeAsync"],
        effect: iam.Effect.ALLOW,
        resources: ["*"],
      })
    );
    eksClusterPodLogPipelineStfnLambdaHandle.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        resources: ["*"],
        actions: ["iam:PutRolePolicy"],
      })
    );

    // Grant permissions to the eksClusterPodLogIngestionLambdaHandler lambda
    props.appPipelineTable.grantReadWriteData(
      eksClusterPodLogPipelineStfnLambdaHandle
    );
    props.logConfTable.grantReadWriteData(
      eksClusterPodLogPipelineStfnLambdaHandle
    );

    props.appLogIngestionTable.grantReadWriteData(
      eksClusterPodLogPipelineStfnLambdaHandle
    );

    props.eksClusterLogSourceTable.grantReadWriteData(
      eksClusterPodLogPipelineStfnLambdaHandle
    );

    const eksClusterPodlogPipeLineFlow = new EKSClusterPodLogPipelineFlowStack(
      this,
      "EKSClusterPodlogPipeLineFlowFlowSM",
      {
        applogPipelineTableArn: props.appPipelineTable.tableArn,
        applogIngestionTableArn: props.appLogIngestionTable.tableArn,
        cfnFlowSMArn: props.cfnFlowSMArn,
        eksClusterPodLogPipelineStfnLambdaArn:
          eksClusterPodLogPipelineStfnLambdaHandle.functionArn,
      }
    );
    // Create a lambda to handle all appLogIngestion related APIs.
    const eksClusterPodLogIngestionLambdaHandler = new lambda.Function(
      this,
      "EKSClusterPodLogIngestionLambdaHandler",
      {
        code: lambda.AssetCode.fromAsset(
          path.join(__dirname, "../../lambda/api/app_log_ingestion")
        ),
        runtime: lambda.Runtime.PYTHON_3_9,
        handler: "eks_cluster_pod_log_ingestion_lambda_function.lambda_handler",
        timeout: Duration.seconds(60),
        memorySize: 1024,
        environment: {
          SOLUTION_ID: solution_id,
          SOLUTION_VERSION: process.env.VERSION
            ? process.env.VERSION
            : "v1.0.0",
          CONFIG_FILE_S3_BUCKET_NAME: props.configFileBucket.bucketName!,

          INSTANCE_META_TABLE_NAME: props.instanceMetaTable.tableName!,
          APP_PIPELINE_TABLE_NAME: props.appPipelineTable.tableName!,
          APP_LOG_CONFIG_TABLE_NAME: props.logConfTable.tableName!,
          INSTANCE_GROUP_TABLE_NAME: props.instanceGroupTable.tableName!,
          APPLOGINGESTION_TABLE: props.appLogIngestionTable.tableName,

          EC2_LOG_SOURCE_TABLE_NAME: props.ec2LogSourceTable.tableName!,
          S3_LOG_SOURCE_TABLE_NAME: props.s3LogSourceTable.tableName!,

          EKS_CLUSTER_SOURCE_TABLE_NAME:
            props.eksClusterLogSourceTable.tableName!,
          STATE_MACHINE_ARN: eksClusterPodlogPipeLineFlow.stateMachineArn!,
        },
        description: "Log Hub - EKS Cluster Pod Log Ingestion APIs Resolver",
      }
    );

    // Grant permissions to the eksClusterPodLogIngestionLambdaHandler lambda
    props.instanceMetaTable.grantReadWriteData(
      eksClusterPodLogIngestionLambdaHandler
    );
    props.appPipelineTable.grantReadWriteData(
      eksClusterPodLogIngestionLambdaHandler
    );
    props.logConfTable.grantReadWriteData(
      eksClusterPodLogIngestionLambdaHandler
    );
    props.instanceGroupTable.grantReadWriteData(
      eksClusterPodLogIngestionLambdaHandler
    );
    props.appLogIngestionTable.grantReadWriteData(
      eksClusterPodLogIngestionLambdaHandler
    );

    props.eksClusterLogSourceTable.grantReadWriteData(
      eksClusterPodLogIngestionLambdaHandler
    );

    eksClusterPodLogIngestionLambdaHandler.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["lambda:InvokeFunction"],
        effect: iam.Effect.ALLOW,
        resources: ["*"],
      })
    );
    eksClusterPodLogIngestionLambdaHandler.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        resources: [eksClusterPodlogPipeLineFlow.stateMachineArn],
        actions: ["states:StartExecution"],
      })
    );

    // Add eksClusterAsSourceIngestion lambda as a Datasource
    const eksClusterPodLogIngestionLambdaDS =
      props.graphqlApi.addLambdaDataSource(
        "EKSClusterPodLogIngestionLambdaDS",
        eksClusterPodLogIngestionLambdaHandler,
        {
          description: "Lambda Resolver Datasource",
        }
      );
    eksClusterPodLogIngestionLambdaDS.createResolver({
      typeName: "Mutation",
      fieldName: "createEKSClusterPodLogIngestion",
      requestMappingTemplate: appsync.MappingTemplate.lambdaRequest(),
      responseMappingTemplate: appsync.MappingTemplate.lambdaResult(),
    });


    // Create a lambda to handle all appLogIngestion related APIs.
    const eksDaemonSetSidecarConfigGenerate = new lambda.Function(
      this,
      "EKSDaemonSetSidecarConfigGenerate",
      {
        code: lambda.AssetCode.fromAsset(
          path.join(__dirname, "../../lambda/api/app_log_ingestion")
        ),
        runtime: lambda.Runtime.PYTHON_3_9,
        handler: "eks_daemonset_sidecar_config_lambda_function.lambda_handler",
        timeout: Duration.seconds(60),
        memorySize: 1024,
        environment: {
          SOLUTION_ID: solution_id,
          SOLUTION_VERSION: process.env.VERSION
            ? process.env.VERSION
            : "v1.0.0",
          SSM_LOG_CONFIG_DOCUMENT_NAME: downloadLogConfigDocument.ref,  
          CONFIG_FILE_S3_BUCKET_NAME: props.configFileBucket.bucketName!,

          INSTANCE_META_TABLE_NAME: props.instanceMetaTable.tableName!,
          APP_PIPELINE_TABLE_NAME: props.appPipelineTable.tableName!,
          APP_LOG_CONFIG_TABLE_NAME: props.logConfTable.tableName!,
          INSTANCE_GROUP_TABLE_NAME: props.instanceGroupTable.tableName!,
          APPLOGINGESTION_TABLE: props.appLogIngestionTable.tableName!,

          EC2_LOG_SOURCE_TABLE_NAME: props.ec2LogSourceTable.tableName!,
          S3_LOG_SOURCE_TABLE_NAME: props.s3LogSourceTable.tableName!,

          EKS_CLUSTER_SOURCE_TABLE_NAME: props.eksClusterLogSourceTable.tableName!,
          LOG_AGENT_EKS_DEPLOYMENT_KIND_TABLE : props.logAgentEKSDeploymentKindTable.tableName!
        },
        description: "Log Hub - EKS Cluster DaemonSet And Sidecar Config APIs Resolver",
      }
    );

    props.appPipelineTable.grantReadWriteData(
      eksDaemonSetSidecarConfigGenerate
    );
    props.logConfTable.grantReadWriteData(
      eksDaemonSetSidecarConfigGenerate
    );
    props.appLogIngestionTable.grantReadWriteData(
      eksDaemonSetSidecarConfigGenerate
    );

    props.eksClusterLogSourceTable.grantReadWriteData(
      eksDaemonSetSidecarConfigGenerate
    );
    props.logAgentEKSDeploymentKindTable.grantReadWriteData(
      eksDaemonSetSidecarConfigGenerate
    );

    eksDaemonSetSidecarConfigGenerate.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["lambda:InvokeFunction"],
        effect: iam.Effect.ALLOW,
        resources: ["*"],
      })
    );

    // Add eksClusterAsSourceIngestion lambda as a Datasource
    const eksDaemonSetSidecarConfigGenerateDS =
      props.graphqlApi.addLambdaDataSource(
        "EKSDaemonSetSidecarConfigGenerateDS",
        eksDaemonSetSidecarConfigGenerate,
        {
          description: "Lambda Resolver Datasource",
        }
      );
    eksDaemonSetSidecarConfigGenerateDS.createResolver({
      typeName: "Query",
      fieldName: "getEKSDaemonSetConfig",
      requestMappingTemplate: appsync.MappingTemplate.lambdaRequest(),
      responseMappingTemplate: appsync.MappingTemplate.lambdaResult(),
    });
    eksDaemonSetSidecarConfigGenerateDS.createResolver({
      typeName: "Query",
      fieldName: "getEKSDeploymentConfig",
      requestMappingTemplate: appsync.MappingTemplate.lambdaRequest(),
      responseMappingTemplate: appsync.MappingTemplate.lambdaResult(),
    });
  }
}
