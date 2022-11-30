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
  Fn,
  Duration,
  CfnCondition,
  aws_dynamodb as ddb,
  aws_iam as iam,
  aws_s3 as s3,
  aws_lambda as lambda,
  SymlinkFollowMode,
  aws_ecs as ecs,
} from "aws-cdk-lib";

import { CfnDocument } from "aws-cdk-lib/aws-ssm";
import * as appsync from "@aws-cdk/aws-appsync-alpha";
import * as eventsources from "aws-cdk-lib/aws-lambda-event-sources";
import * as path from "path";

import { appIngestionFlowStack } from "../api/app-log-ingestion-flow";
import { IQueue } from "aws-cdk-lib/aws-sqs";
// import { EKSAgent2AOSPipelineFlowStack } from "../api/eks-agent-to-aos-flow";

// import { EKSClusterPodLogPipelineFlowStack } from "./eks-cluster-pod-log-pipeline-flow";
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
  readonly cmkKeyArn: string;

  readonly instanceGroupTable: ddb.Table;
  readonly instanceMetaTable: ddb.Table;
  readonly logConfTable: ddb.Table;
  readonly appPipelineTable: ddb.Table;
  readonly ec2LogSourceTable: ddb.Table;
  readonly s3LogSourceTable: ddb.Table;
  readonly logSourceTable: ddb.Table;
  readonly eksClusterLogSourceTable: ddb.Table;
  readonly configFileBucket: s3.Bucket;
  readonly appLogIngestionTable: ddb.Table;
  readonly sqsEventTable: ddb.Table;
  // readonly logAgentEKSDeploymentKindTable: ddb.Table;
  readonly subAccountLinkTable: ddb.Table;
  readonly centralAssumeRolePolicy: iam.ManagedPolicy;
  readonly ecsCluster: ecs.Cluster;
  readonly groupModificationEventQueue: IQueue;
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
          path.join(__dirname, "../../lambda/api/app_log_ingestion"),
          { followSymlinks: SymlinkFollowMode.ALWAYS }
        ),
        runtime: lambda.Runtime.PYTHON_3_9,
        handler: "ec2_as_source_lambda_function.lambda_handler",
        timeout: Duration.minutes(15),
        memorySize: 1024,
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
          LOG_SOURCE_TABLE_NAME: props.logSourceTable.tableName!,
          EKS_CLUSTER_SOURCE_TABLE_NAME:
            props.eksClusterLogSourceTable.tableName!,
          SUB_ACCOUNT_LINK_TABLE_NAME: props.subAccountLinkTable.tableName,
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
    props.logSourceTable.grantReadWriteData(appLogIngestionEC2AsyncHandler);
    props.eksClusterLogSourceTable.grantReadWriteData(
      appLogIngestionEC2AsyncHandler
    );
    props.subAccountLinkTable.grantReadData(appLogIngestionEC2AsyncHandler);

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
    appLogIngestionEC2AsyncHandler.addToRolePolicy(
      new iam.PolicyStatement({
        actions: [
          "iam:PutRolePolicy",
          "iam:CreateRole",
          "iam:GetRole",
          "iam:UpdateAssumeRolePolicy",
        ],
        effect: iam.Effect.ALLOW,
        resources: ["*"],
      })
    );

    props.centralAssumeRolePolicy.attachToRole(
      appLogIngestionEC2AsyncHandler.role!
    );

    //
    const appLogIngestionModificationEventHandler = new lambda.Function(
      this,
      "AppLogIngestionEC2ModificationHandler",
      {
        code: lambda.AssetCode.fromAsset(
          path.join(__dirname, "../../lambda/api/app_log_ingestion"),
          { followSymlinks: SymlinkFollowMode.ALWAYS }
        ),
        runtime: lambda.Runtime.PYTHON_3_9,
        handler: "ingestion_modification_event_lambda_function.lambda_handler",
        timeout: Duration.minutes(15),
        memorySize: 1024,
        environment: {
          INSTANCE_GROUP_MODIFICATION_EVENT_QUEUE_NAME:
            props.groupModificationEventQueue.queueName,
          APP_LOG_INGESTION_LAMBDA_ARN:
            appLogIngestionEC2AsyncHandler.functionArn,
          SQS_EVENT_TABLE: props.sqsEventTable.tableName,
          APPLOGINGESTION_TABLE: props.appLogIngestionTable.tableName,
          SSM_LOG_CONFIG_DOCUMENT_NAME: downloadLogConfigDocument.ref,
          CONFIG_FILE_S3_BUCKET_NAME: props.configFileBucket.bucketName!,
          INSTANCE_META_TABLE_NAME: props.instanceMetaTable.tableName!,
          APP_PIPELINE_TABLE_NAME: props.appPipelineTable.tableName!,
          APP_LOG_CONFIG_TABLE_NAME: props.logConfTable.tableName!,
          INSTANCE_GROUP_TABLE_NAME: props.instanceGroupTable.tableName!,
          EC2_LOG_SOURCE_TABLE_NAME: props.ec2LogSourceTable.tableName!,
          S3_LOG_SOURCE_TABLE_NAME: props.s3LogSourceTable.tableName!,
          LOG_SOURCE_TABLE_NAME: props.logSourceTable.tableName!,
          EKS_CLUSTER_SOURCE_TABLE_NAME:
            props.eksClusterLogSourceTable.tableName!,
          SUB_ACCOUNT_LINK_TABLE_NAME: props.subAccountLinkTable.tableName,
          SOLUTION_ID: solution_id,
          SOLUTION_VERSION: process.env.VERSION
            ? process.env.VERSION
            : "v1.0.0",
        },
        description:
          "Log Hub - Async AppLogIngestion Resolver for instance ingestion adding and deleting instances event",
      }
    );
    appLogIngestionModificationEventHandler.addEventSource(
      new eventsources.SqsEventSource(props.groupModificationEventQueue)
    );
    props.sqsEventTable.grantReadWriteData(
      appLogIngestionModificationEventHandler
    );
    props.groupModificationEventQueue.grantConsumeMessages(
      appLogIngestionModificationEventHandler
    );
    props.appLogIngestionTable.grantReadWriteData(
      appLogIngestionModificationEventHandler
    );
    props.instanceMetaTable.grantReadWriteData(
      appLogIngestionModificationEventHandler
    );
    props.appPipelineTable.grantReadWriteData(
      appLogIngestionModificationEventHandler
    );
    props.logConfTable.grantReadWriteData(
      appLogIngestionModificationEventHandler
    );
    props.instanceGroupTable.grantReadWriteData(
      appLogIngestionModificationEventHandler
    );
    props.configFileBucket.grantReadWrite(
      appLogIngestionModificationEventHandler
    );
    props.ec2LogSourceTable.grantReadWriteData(
      appLogIngestionModificationEventHandler
    );
    props.s3LogSourceTable.grantReadWriteData(
      appLogIngestionModificationEventHandler
    );
    props.logSourceTable.grantReadWriteData(
      appLogIngestionModificationEventHandler
    );
    props.eksClusterLogSourceTable.grantReadWriteData(
      appLogIngestionModificationEventHandler
    );
    props.subAccountLinkTable.grantReadData(
      appLogIngestionModificationEventHandler
    );

    appLogIngestionModificationEventHandler.node.addDependency(
      downloadLogConfigDocument
    );
    appLogIngestionModificationEventHandler.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["sqs:*", "lambda:InvokeFunction", "lambda:InvokeAsync"],
        effect: iam.Effect.ALLOW,
        resources: ["*"],
      })
    );
    appLogIngestionModificationEventHandler.addToRolePolicy(
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
    props.centralAssumeRolePolicy.attachToRole(
      appLogIngestionModificationEventHandler.role!
    );

    // Create the async child lambda to handle time-consuming tasks for S3 source.
    const appLogIngestionS3AsyncHandler = new lambda.Function(
      this,
      "AppLogIngestionS3AsyncHandler",
      {
        code: lambda.AssetCode.fromAsset(
          path.join(__dirname, "../../lambda/api/app_log_ingestion"),
          { followSymlinks: SymlinkFollowMode.ALWAYS }
        ),
        runtime: lambda.Runtime.PYTHON_3_9,
        handler: "s3_as_source_lambda_function.lambda_handler",
        timeout: Duration.minutes(15),
        memorySize: 1024,
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
          LOG_SOURCE_TABLE_NAME: props.logSourceTable.tableName!,
          EKS_CLUSTER_SOURCE_TABLE_NAME:
            props.eksClusterLogSourceTable.tableName!,
          SUB_ACCOUNT_LINK_TABLE_NAME: props.subAccountLinkTable.tableName,
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
    props.logSourceTable.grantReadWriteData(appLogIngestionS3AsyncHandler);
    props.eksClusterLogSourceTable.grantReadWriteData(
      appLogIngestionS3AsyncHandler
    );
    props.subAccountLinkTable.grantReadData(appLogIngestionS3AsyncHandler);

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
    appLogIngestionS3AsyncHandler.addToRolePolicy(
      new iam.PolicyStatement({
        actions: [
          "iam:PutRolePolicy",
          "iam:CreateRole",
          "iam:GetRole",
          "iam:UpdateAssumeRolePolicy",
        ],
        effect: iam.Effect.ALLOW,
        resources: ["*"],
      })
    );
    props.centralAssumeRolePolicy.attachToRole(
      appLogIngestionS3AsyncHandler.role!
    );

    // Create the async child lambda to handle time-consuming tasks for Syslog source.
    const appLogIngestionSyslogAsyncHandler = new lambda.Function(
      this,
      "AppLogIngestionSyslogAsyncHandler",
      {
        code: lambda.AssetCode.fromAsset(
          path.join(__dirname, "../../lambda/api/app_log_ingestion"),
          { followSymlinks: SymlinkFollowMode.ALWAYS }
        ),
        runtime: lambda.Runtime.PYTHON_3_9,
        handler: "syslog_as_source_lambda_function.lambda_handler",
        timeout: Duration.minutes(15),
        memorySize: 1024,
        environment: {
          APPLOGINGESTION_TABLE: props.appLogIngestionTable.tableName,
          CONFIG_FILE_S3_BUCKET_NAME: props.configFileBucket.bucketName!,
          INSTANCE_META_TABLE_NAME: props.instanceMetaTable.tableName!,
          APP_PIPELINE_TABLE_NAME: props.appPipelineTable.tableName!,
          APP_LOG_CONFIG_TABLE_NAME: props.logConfTable.tableName!,
          INSTANCE_GROUP_TABLE_NAME: props.instanceGroupTable.tableName!,
          EC2_LOG_SOURCE_TABLE_NAME: props.ec2LogSourceTable.tableName!,
          S3_LOG_SOURCE_TABLE_NAME: props.s3LogSourceTable.tableName!,
          LOG_SOURCE_TABLE_NAME: props.logSourceTable.tableName!,
          EKS_CLUSTER_SOURCE_TABLE_NAME:
            props.eksClusterLogSourceTable.tableName!,
          SUB_ACCOUNT_LINK_TABLE_NAME: props.subAccountLinkTable.tableName,
          SOLUTION_ID: solution_id,
          SOLUTION_VERSION: process.env.VERSION
            ? process.env.VERSION
            : "v1.0.0",
        },
        description:
          "Log Hub - Async Child AppLogIngestion Resolver for Syslog Source",
      }
    );

    // Grant permissions to the appLogIngestion lambda
    props.appLogIngestionTable.grantReadWriteData(
      appLogIngestionSyslogAsyncHandler
    );
    props.appPipelineTable.grantReadWriteData(
      appLogIngestionSyslogAsyncHandler
    );
    props.logConfTable.grantReadWriteData(appLogIngestionSyslogAsyncHandler);
    props.configFileBucket.grantReadWrite(appLogIngestionSyslogAsyncHandler);
    props.logSourceTable.grantReadWriteData(appLogIngestionSyslogAsyncHandler);
    props.subAccountLinkTable.grantReadData(appLogIngestionSyslogAsyncHandler);

    appLogIngestionSyslogAsyncHandler.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["lambda:InvokeFunction", "lambda:InvokeAsync"],
        effect: iam.Effect.ALLOW,
        resources: ["*"],
      })
    );
    appLogIngestionSyslogAsyncHandler.addToRolePolicy(
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
    appLogIngestionSyslogAsyncHandler.addToRolePolicy(
      new iam.PolicyStatement({
        actions: [
          "iam:PutRolePolicy",
          "iam:CreateRole",
          "iam:GetRole",
          "iam:UpdateAssumeRolePolicy",
        ],
        effect: iam.Effect.ALLOW,
        resources: ["*"],
      })
    );
    props.centralAssumeRolePolicy.attachToRole(
      appLogIngestionSyslogAsyncHandler.role!
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
          path.join(__dirname, "../../lambda/api/app_log_ingestion"),
          { followSymlinks: SymlinkFollowMode.ALWAYS }
        ),
        runtime: lambda.Runtime.PYTHON_3_9,
        handler: "lambda_function.lambda_handler",
        timeout: Duration.seconds(60),
        memorySize: 1024,
        environment: {
          ASYNC_EC2_CHILD_LAMBDA_ARN:
            appLogIngestionEC2AsyncHandler.functionArn,
          ASYNC_S3_CHILD_LAMBDA_ARN: appLogIngestionS3AsyncHandler.functionArn,
          ASYNC_SYSLOG_CHILD_LAMBDA_ARN:
            appLogIngestionSyslogAsyncHandler.functionArn,
          APPLOGINGESTION_TABLE: props.appLogIngestionTable.tableName,
          SSM_LOG_CONFIG_DOCUMENT_NAME: downloadLogConfigDocument.ref,
          CONFIG_FILE_S3_BUCKET_NAME: props.configFileBucket.bucketName!,
          INSTANCE_META_TABLE_NAME: props.instanceMetaTable.tableName!,
          APP_PIPELINE_TABLE_NAME: props.appPipelineTable.tableName!,
          APP_LOG_CONFIG_TABLE_NAME: props.logConfTable.tableName!,
          EC2_LOG_SOURCE_TABLE_NAME: props.ec2LogSourceTable.tableName!,
          S3_LOG_SOURCE_TABLE_NAME: props.s3LogSourceTable.tableName!,
          LOG_SOURCE_TABLE_NAME: props.logSourceTable.tableName!,
          EKS_CLUSTER_SOURCE_TABLE_NAME:
            props.eksClusterLogSourceTable.tableName!,
          STATE_MACHINE_ARN: appIngestionFlow.stateMachineArn!,
          INSTANCE_GROUP_TABLE_NAME: props.instanceGroupTable.tableName!,
          SUB_ACCOUNT_LINK_TABLE_NAME: props.subAccountLinkTable.tableName,
          LOG_AGENT_VPC_ID: props.defaultVPC,
          LOG_AGENT_SUBNETS_IDS: Fn.join(",", props.defaultPublicSubnets),
          DEFAULT_CMK_ARN: props.cmkKeyArn!,
          ECS_CLUSTER_NAME: props.ecsCluster.clusterName!,
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
    props.logSourceTable.grantReadWriteData(appLogIngestionHandler);
    props.subAccountLinkTable.grantReadData(appLogIngestionHandler);
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
        actions: [
          "iam:PutRolePolicy",
          "iam:CreateRole",
          "iam:GetRole",
          "iam:UpdateAssumeRolePolicy",
        ],
      })
    );
    // Grant es permissions to the app ingestion lambda
    appLogIngestionHandler.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        resources: ["*"],
        actions: ["es:DescribeElasticsearchDomain", "es:DescribeDomain"],
      })
    );
    // Grant elb permissions to app ingestion lambda
    appLogIngestionHandler.addToRolePolicy(
      new iam.PolicyStatement({
        actions: [
          "elasticloadbalancing:CreateLoadBalancer",
          "elasticloadbalancing:DeleteLoadBalancer",
        ],
        effect: iam.Effect.ALLOW,
        resources: ["*"],
      })
    );
    props.centralAssumeRolePolicy.attachToRole(appLogIngestionHandler.role!);

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
      responseMappingTemplate: appsync.MappingTemplate.fromFile(
        path.join(
          __dirname,
          "../../graphql/vtl/app_log_ingestion/GetAppLogIngestionResp.vtl"
        )
      ),
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
      responseMappingTemplate: appsync.MappingTemplate.fromFile(
        path.join(
          __dirname,
          "../../graphql/vtl/app_log_ingestion/ListAppLogIngestionsResp.vtl"
        )
      ),
    });

    appLogIngestionLambdaDS.createResolver({
      typeName: "Mutation",
      fieldName: "createAppLogIngestion",
      requestMappingTemplate: appsync.MappingTemplate.fromFile(
        path.join(
          __dirname,
          "../../graphql/vtl/app_log_ingestion/CreateAppLogIngestion.vtl"
        )
      ),
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
          path.join(__dirname, "../../lambda/api/app_log_ingestion"),
          { followSymlinks: SymlinkFollowMode.ALWAYS }
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
          LOG_SOURCE_TABLE_NAME: props.logSourceTable.tableName!,

          EKS_CLUSTER_SOURCE_TABLE_NAME:
            props.eksClusterLogSourceTable.tableName!,
          SUB_ACCOUNT_LINK_TABLE_NAME: props.subAccountLinkTable.tableName!,
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
        actions: [
          "iam:PutRolePolicy",
          "iam:CreateRole",
          "iam:GetRole",
          "iam:UpdateAssumeRolePolicy",
        ],
        effect: iam.Effect.ALLOW,
        resources: ["*"],
      })
    );
    // Grant es permissions to the appPipeline lambda
    eksClusterPodLogPipelineStfnLambdaHandle.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        resources: ["*"],
        actions: ["es:DescribeElasticsearchDomain", "es:DescribeDomain"],
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
    props.subAccountLinkTable.grantReadData(
      eksClusterPodLogPipelineStfnLambdaHandle
    );

    props.logSourceTable.grantReadData(
      eksClusterPodLogPipelineStfnLambdaHandle
    );

    props.centralAssumeRolePolicy.attachToRole(
      eksClusterPodLogPipelineStfnLambdaHandle.role!
    );

    // Create a lambda to handle all appLogIngestion related APIs.
    const eksAgentConfigGenerateFn = new lambda.Function(
      this,
      "EKSAgentConfigGenerateFn",
      {
        code: lambda.AssetCode.fromAsset(
          path.join(__dirname, "../../lambda/api/app_log_ingestion"),
          { followSymlinks: SymlinkFollowMode.ALWAYS }
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
          LOG_SOURCE_TABLE_NAME: props.logSourceTable.tableName!,

          EKS_CLUSTER_SOURCE_TABLE_NAME:
            props.eksClusterLogSourceTable.tableName!,
          // LOG_AGENT_EKS_DEPLOYMENT_KIND_TABLE:
          //   props.logAgentEKSDeploymentKindTable.tableName!,
          SUB_ACCOUNT_LINK_TABLE_NAME: props.subAccountLinkTable.tableName!,
          DEFAULT_OPEN_EXTRA_METADATA_FLAG: "true",
          DEFAULT_OPEN_CONTAINERD_RUNTIME_FLAG: "false",
          FLUENT_BIT_IMAGE:
            "public.ecr.aws/aws-observability/aws-for-fluent-bit:2.28.4",
        },
        description:
          "Log Hub - EKS Cluster DaemonSet And Sidecar Config APIs Resolver",
      }
    );

    props.appPipelineTable.grantReadWriteData(eksAgentConfigGenerateFn);
    props.logConfTable.grantReadWriteData(eksAgentConfigGenerateFn);
    props.appLogIngestionTable.grantReadWriteData(eksAgentConfigGenerateFn);

    props.eksClusterLogSourceTable.grantReadWriteData(eksAgentConfigGenerateFn);
    props.logSourceTable.grantReadWriteData(eksAgentConfigGenerateFn);
    props.subAccountLinkTable.grantReadData(eksAgentConfigGenerateFn);

    eksAgentConfigGenerateFn.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["lambda:InvokeFunction"],
        effect: iam.Effect.ALLOW,
        resources: ["*"],
      })
    );

    // add eks policy documents
    eksAgentConfigGenerateFn.addToRolePolicy(
      new iam.PolicyStatement({
        sid: "eks",
        actions: ["eks:DescribeCluster"],
        effect: iam.Effect.ALLOW,
        resources: [`arn:${Aws.PARTITION}:eks:*:${Aws.ACCOUNT_ID}:cluster/*`],
      })
    );

    props.centralAssumeRolePolicy.attachToRole(eksAgentConfigGenerateFn.role!);

    // Add eksClusterAsSourceIngestion lambda as a Datasource
    const eksAgentConfigGeneratorDS = props.graphqlApi.addLambdaDataSource(
      "EKSAgentConfigGeneratorDS",
      eksAgentConfigGenerateFn,
      {
        description: "Lambda Resolver Datasource",
      }
    );

    eksAgentConfigGeneratorDS.createResolver({
      typeName: "Query",
      fieldName: "getEKSDaemonSetConf",
      requestMappingTemplate: appsync.MappingTemplate.fromFile(
        path.join(
          __dirname,
          "../../graphql/vtl/app_log_ingestion/GetEKSDaemonSetConf.vtl"
        )
      ),
      responseMappingTemplate: appsync.MappingTemplate.lambdaResult(),
    });
    eksAgentConfigGeneratorDS.createResolver({
      typeName: "Query",
      fieldName: "getEKSDeploymentConf",
      requestMappingTemplate: appsync.MappingTemplate.fromFile(
        path.join(
          __dirname,
          "../../graphql/vtl/app_log_ingestion/GetEKSDeploymentConf.vtl"
        )
      ),
      responseMappingTemplate: appsync.MappingTemplate.lambdaResult(),
    });

    // Create a lambda to handle ASG config generation and return
    const asgConfigGenerateFn = new lambda.Function(
      this,
      "ASGConfigGenerateFn",
      {
        code: lambda.AssetCode.fromAsset(
          path.join(__dirname, "../../lambda/api/app_log_ingestion"),
          { followSymlinks: SymlinkFollowMode.ALWAYS }
        ),
        runtime: lambda.Runtime.PYTHON_3_9,
        handler: "auto_scaling_group_config_lambda_function.lambda_handler",
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
          LOG_SOURCE_TABLE_NAME: props.logSourceTable.tableName!,
          SUB_ACCOUNT_LINK_TABLE_NAME: props.subAccountLinkTable.tableName!,
          S3_LOG_SOURCE_TABLE_NAME: props.s3LogSourceTable.tableName!,
          EKS_CLUSTER_SOURCE_TABLE_NAME:
            props.eksClusterLogSourceTable.tableName!,
          EC2_LOG_SOURCE_TABLE_NAME: props.ec2LogSourceTable.tableName!,
        },
        description: "Log Hub - EC2 Auto-Scaling Group Config APIs Resolver",
      }
    );

    props.appPipelineTable.grantReadWriteData(asgConfigGenerateFn);
    props.logConfTable.grantReadWriteData(asgConfigGenerateFn);
    props.appLogIngestionTable.grantReadWriteData(asgConfigGenerateFn);
    props.instanceGroupTable.grantReadWriteData(asgConfigGenerateFn);

    props.logSourceTable.grantReadWriteData(asgConfigGenerateFn);
    props.subAccountLinkTable.grantReadData(asgConfigGenerateFn);

    props.centralAssumeRolePolicy.attachToRole(asgConfigGenerateFn.role!);

    // Add ASG Ingestion lambda as a Datasource
    const asgConfigGeneratorDS = props.graphqlApi.addLambdaDataSource(
      "ASGConfigGeneratorDS",
      asgConfigGenerateFn,
      {
        description: "Lambda Resolver Datasource",
      }
    );

    asgConfigGeneratorDS.createResolver({
      typeName: "Query",
      fieldName: "getAutoScalingGroupConf",
      requestMappingTemplate: appsync.MappingTemplate.fromFile(
        path.join(
          __dirname,
          "../../graphql/vtl/app_log_ingestion/GetASGConf.vtl"
        )
      ),
      responseMappingTemplate: appsync.MappingTemplate.lambdaResult(),
    });
  }
}
