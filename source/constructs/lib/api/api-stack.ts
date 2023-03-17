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
  CfnOutput,
  Duration,
  Aws,
  RemovalPolicy,
  CustomResource,
  custom_resources as cr,
  Fn,
  aws_iam as iam,
  aws_lambda as lambda,
  aws_cognito as cognito,
  aws_dynamodb as ddb,
  aws_sqs as sqs,
  SymlinkFollowMode,
} from "aws-cdk-lib";
import * as appsync from "@aws-cdk/aws-appsync-alpha";
import { IVpc } from "aws-cdk-lib/aws-ec2";
import * as path from "path";
import { AuthType, addCfnNagSuppressRules } from "../main-stack";
import { PipelineFlowStack } from "./pipeline-flow";
import { ClusterFlowStack } from "./cluster-flow";
import { CrossAccountStack } from "./cross-account-stack";
import { NagSuppressions } from "cdk-nag";
import { IQueue } from "aws-cdk-lib/aws-sqs";

export interface APIProps {
  /**
   * Step Functions State Machine ARN for CloudFormation deployment Flow
   *
   * @default - None.
   */
  readonly cfnFlowSMArn: string;

  /**
   * Cognito User Pool for Authentication of APIs
   *
   * @default - None.
   */
  readonly userPoolId: string;

  /**
   * Cognito User Pool Client for Authentication of APIs
   *
   * @default - None.
   */
  readonly userPoolClientId: string;

  /**
   * Default Logging Bucket Name
   *
   * @default - None.
   */
  readonly defaultLoggingBucket: string;

  /**
   * VPC
   *
   */
  vpc: IVpc;

  /**
   * Default Subnet Ids (Private)
   *
   */
  readonly subnetIds: string[];

  /**
   * Processing SecurityGroup Id
   *
   */
  readonly processSgId: string;

  /**
   * Authentication Type
   *
   */
  readonly authType: string;

  /**
   * OIDC Provider
   *
   */
  readonly oidcProvider: string;

  /**
   * OIDC Client Id
   *
   */
  readonly oidcClientId: string;

  /**
   * A table to store cross account info.
   *
   * @default - None.
   */
  readonly subAccountLinkTable: ddb.Table;

  readonly solutionId: string;
  readonly stackPrefix: string;
}

/**
 * Stack to provision Appsync GraphQL APIs and releted resources.
 */
export class APIStack extends Construct {
  readonly apiEndpoint: string;
  readonly graphqlApi: appsync.GraphqlApi;
  readonly userPool?: cognito.UserPool;
  readonly authDefaultConfig: any;
  readonly userPoolClientId: string;
  // readonly userPoolApiClient?: cognito.UserPoolClient
  readonly clusterTable: ddb.Table;
  readonly appPipelineTable: ddb.Table;
  readonly pipelineTable: ddb.Table;
  readonly eksClusterLogSourceTable: ddb.Table;
  readonly sqsEventTable: ddb.Table;
  readonly centralAssumeRolePolicy: iam.ManagedPolicy;
  readonly asyncCrossAccountHandler: lambda.Function;
  readonly groupModificationEventQueue: IQueue;
  constructor(scope: Construct, id: string, props: APIProps) {
    super(scope, id);

    if (props.authType === AuthType.OIDC) {
      // Open Id Auth Config
      this.authDefaultConfig = {
        authorizationType: appsync.AuthorizationType.OIDC,
        openIdConnectConfig: {
          oidcProvider: props.oidcProvider,
          clientId: props.oidcClientId,
        },
      };
      // AWSAppSyncPushToCloudWatchLogs managed policy is not available in China regions.
      // Create the policy manually
      const apiLogRole = new iam.Role(this, "ApiLogRole", {
        assumedBy: new iam.ServicePrincipal("appsync.amazonaws.com"),
      });

      const apiLogPolicy = new iam.Policy(this, "ApiLogPolicy", {
        statements: [
          new iam.PolicyStatement({
            actions: [
              "logs:CreateLogGroup",
              "logs:CreateLogStream",
              "logs:PutLogEvents",
            ],
            resources: ["*"],
          }),
        ],
      });
      apiLogRole.attachInlinePolicy(apiLogPolicy);

      const cfnApiLogRoley = apiLogPolicy.node.defaultChild as iam.CfnPolicy;
      addCfnNagSuppressRules(cfnApiLogRoley, [
        {
          id: "W12",
          reason:
            "The managed policy AWSAppSyncPushToCloudWatchLogs needs to use any resources",
        },
      ]);
      this.graphqlApi = new appsync.GraphqlApi(this, "API", {
        name: `${Aws.STACK_NAME} - GraphQL APIs`,
        schema: appsync.SchemaFile.fromAsset(
          path.join(__dirname, "../../graphql/schema.graphql")
        ),
        authorizationConfig: {
          defaultAuthorization: this.authDefaultConfig,
          additionalAuthorizationModes: [
            {
              authorizationType: appsync.AuthorizationType.IAM,
            },
          ],
        },
        logConfig: {
          fieldLogLevel: appsync.FieldLogLevel.ERROR,
          role: apiLogRole,
        },
        xrayEnabled: true,
      });
    } else {
      const userPool = cognito.UserPool.fromUserPoolId(
        this,
        "apiUserPool",
        props.userPoolId
      );

      this.authDefaultConfig = {
        authorizationType: appsync.AuthorizationType.USER_POOL,
        userPoolConfig: {
          userPool: userPool,
          appIdClientRegex: this.userPoolClientId,
          defaultAction: appsync.UserPoolDefaultAction.ALLOW,
        },
      };

      // Create an Appsync GraphQL API
      this.graphqlApi = new appsync.GraphqlApi(this, "API", {
        name: `${Aws.STACK_NAME} - GraphQL APIs`,
        schema: appsync.SchemaFile.fromAsset(
          path.join(__dirname, "../../graphql/schema.graphql")
        ),
        authorizationConfig: {
          defaultAuthorization: this.authDefaultConfig,
          additionalAuthorizationModes: [
            {
              authorizationType: appsync.AuthorizationType.IAM,
            },
          ],
        },
        logConfig: {
          fieldLogLevel: appsync.FieldLogLevel.ERROR,
        },
        xrayEnabled: true,
      });
    }
    // This Lambda is to create the AppSync Service Linked Role
    const appSyncServiceLinkRoleFn = new lambda.Function(
      this,
      "AppSyncServiceLinkRoleFn",
      {
        runtime: lambda.Runtime.PYTHON_3_9,
        code: lambda.Code.fromAsset(
          path.join(__dirname, "../../lambda/custom-resource")
        ),
        handler: "create_service_linked_role.lambda_handler",
        timeout: Duration.seconds(60),
        memorySize: 128,
        description: `${Aws.STACK_NAME} - Service Linked Role Create Handler`,
      }
    );

    // Grant IAM Policy to the appSyncServiceLinkRoleFn lambda
    const iamPolicy = new iam.PolicyStatement({
      actions: ["iam:GetRole", "iam:CreateServiceLinkedRole"],
      effect: iam.Effect.ALLOW,
      resources: ["*"],
    });
    appSyncServiceLinkRoleFn.addToRolePolicy(iamPolicy);

    const appSyncServiceLinkRoleFnProvider = new cr.Provider(
      this,
      "appSyncServiceLinkRoleFnProvider",
      {
        onEventHandler: appSyncServiceLinkRoleFn,
      }
    );

    appSyncServiceLinkRoleFnProvider.node.addDependency(
      appSyncServiceLinkRoleFn
    );

    const appSyncServiceLinkRoleFnTrigger = new CustomResource(
      this,
      "appSyncServiceLinkRoleFnTrigger",
      {
        serviceToken: appSyncServiceLinkRoleFnProvider.serviceToken,
      }
    );

    appSyncServiceLinkRoleFnTrigger.node.addDependency(
      appSyncServiceLinkRoleFnProvider
    );
    this.graphqlApi.node.addDependency(appSyncServiceLinkRoleFnTrigger);

    // Create a table to store logging pipeline info
    this.pipelineTable = new ddb.Table(this, "PipelineTable", {
      partitionKey: {
        name: "id",
        type: ddb.AttributeType.STRING,
      },
      billingMode: ddb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY,
      encryption: ddb.TableEncryption.DEFAULT,
      pointInTimeRecovery: true,
    });

    const cfnPipelineTable = this.pipelineTable.node
      .defaultChild as ddb.CfnTable;
    cfnPipelineTable.overrideLogicalId("PipelineTable");
    addCfnNagSuppressRules(cfnPipelineTable, [
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

    // Create a table to store ekscluster logging logSource info
    this.eksClusterLogSourceTable = new ddb.Table(
      this,
      "EKSClusterLogSourceTable",
      {
        partitionKey: {
          name: "id",
          type: ddb.AttributeType.STRING,
        },
        billingMode: ddb.BillingMode.PAY_PER_REQUEST,
        removalPolicy: RemovalPolicy.DESTROY,
        encryption: ddb.TableEncryption.DEFAULT,
        pointInTimeRecovery: true,
      }
    );

    const cfnEKSClusterLogSourceTable = this.eksClusterLogSourceTable.node
      .defaultChild as ddb.CfnTable;
    cfnEKSClusterLogSourceTable.overrideLogicalId("EKSClusterLogSourceTable");
    addCfnNagSuppressRules(cfnEKSClusterLogSourceTable, [
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

    // Create the Cross Account API stack
    const crossAccountStack = new CrossAccountStack(this, `CrossAccountStack`, {
      graphqlApi: this.graphqlApi,
      subAccountLinkTable: props.subAccountLinkTable,
      solutionId: props.solutionId,
    });
    this.centralAssumeRolePolicy = crossAccountStack.centralAssumeRolePolicy;
    this.asyncCrossAccountHandler = crossAccountStack.asyncCrossAccountHandler;

    // Create a table to store logging appPipeline info
    this.appPipelineTable = new ddb.Table(this, "AppPipelineTable", {
      partitionKey: {
        name: "id",
        type: ddb.AttributeType.STRING,
      },
      billingMode: ddb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY,
      encryption: ddb.TableEncryption.DEFAULT,
      pointInTimeRecovery: true,
    });

    const cfnAppPipelineTable = this.appPipelineTable.node
      .defaultChild as ddb.CfnTable;
    cfnAppPipelineTable.overrideLogicalId("AppPipelineTable");
    addCfnNagSuppressRules(cfnAppPipelineTable, [
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

    // Create a table to store imported domain
    this.clusterTable = new ddb.Table(this, "ClusterTable", {
      partitionKey: {
        name: "id",
        type: ddb.AttributeType.STRING,
      },
      billingMode: ddb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY,
      encryption: ddb.TableEncryption.DEFAULT,
      pointInTimeRecovery: true,
    });

    const cfnClusterTable = this.clusterTable.node.defaultChild as ddb.CfnTable;
    cfnClusterTable.overrideLogicalId("ClusterTable");
    addCfnNagSuppressRules(cfnClusterTable, [
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

    // Create a table to store SQS message ID and detailed body info
    this.sqsEventTable = new ddb.Table(this, "SQSEventTable", {
      partitionKey: {
        name: "id",
        type: ddb.AttributeType.STRING,
      },
      billingMode: ddb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY,
      encryption: ddb.TableEncryption.DEFAULT,
      pointInTimeRecovery: true,
    });

    const cfnSQSEventTable = this.sqsEventTable.node
      .defaultChild as ddb.CfnTable;
    cfnSQSEventTable.overrideLogicalId("SQSEventTable");
    addCfnNagSuppressRules(cfnSQSEventTable, [
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

    // Create a Step Functions to orchestrate cluster flow
    const clusterFlow = new ClusterFlowStack(this, "ClusterFlowSM", {
      tableArn: this.clusterTable.tableArn,
      cfnFlowSMArn: props.cfnFlowSMArn,
    });

    // Create a lambda layer with required python packages.
    const clusterLayer = new lambda.LayerVersion(this, "ClusterLayer", {
      code: lambda.Code.fromAsset(
        path.join(__dirname, "../../lambda/api/cluster"),
        {
          bundling: {
            image: lambda.Runtime.PYTHON_3_9.bundlingImage,
            command: [
              "bash",
              "-c",
              "pip install -r requirements.txt -t /asset-output/python",
            ],
          },
        }
      ),
      compatibleRuntimes: [lambda.Runtime.PYTHON_3_9],
      description: `${Aws.STACK_NAME} - Lambda layer for OpenSearch Cluster`,
    });

    // Create a lambda to handle all cluster related APIs.
    const clusterHandler = new lambda.Function(this, "ClusterHandler", {
      code: lambda.AssetCode.fromAsset(
        path.join(__dirname, "../../lambda/api/cluster")
      ),
      runtime: lambda.Runtime.PYTHON_3_9,
      handler: "lambda_function.lambda_handler",
      timeout: Duration.seconds(60),
      memorySize: 1024,
      layers: [clusterLayer],
      environment: {
        PARTITION: Aws.PARTITION,
        CLUSTER_TABLE: this.clusterTable.tableName,
        APP_PIPELINE_TABLE_NAME: this.appPipelineTable.tableName,
        SVC_PIPELINE_TABLE: this.pipelineTable.tableName,
        EKS_CLUSTER_SOURCE_TABLE_NAME: this.eksClusterLogSourceTable.tableName,
        STATE_MACHINE_ARN: clusterFlow.stateMachineArn,
        SOLUTION_VERSION: process.env.VERSION || "v1.0.0",
        SOLUTION_ID: props.solutionId,
        STACK_PREFIX: props.stackPrefix,
        DEFAULT_VPC_ID: props.vpc.vpcId,
        DEFAULT_SG_ID: props.processSgId,
        DEFAULT_PRIVATE_SUBNET_IDS: Fn.join(",", props.subnetIds),
        DEFAULT_LOGGING_BUCKET: props.defaultLoggingBucket,
      },
      description: `${Aws.STACK_NAME} - Cluster APIs Resolver`,
    });

    // Grant permissions to the cluster lambda
    this.clusterTable.grantReadWriteData(clusterHandler);
    this.appPipelineTable.grantReadData(clusterHandler);
    this.pipelineTable.grantReadData(clusterHandler);
    this.eksClusterLogSourceTable.grantReadData(clusterHandler);

    const clusterHandlerPolicy = new iam.Policy(this, "ClusterHandlerPolicy", {
      statements: [
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          resources: ["*"],
          actions: [
            "es:ListDomainNames",
            "es:DescribeElasticsearchDomain",
            "es:UpdateElasticsearchDomainConfig",
          ],
        }),
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          resources: ["*"],
          actions: ["cloudwatch:GetMetricData"],
        }),
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          resources: ["*"],
          actions: ["cognito-idp:DescribeUserPool"],
        }),
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          resources: [clusterFlow.stateMachineArn],
          actions: ["states:StartExecution"],
        }),
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          resources: [
            `arn:${Aws.PARTITION}:ec2:*:${Aws.ACCOUNT_ID}:route-table/*`,
            `arn:${Aws.PARTITION}:ec2:*:${Aws.ACCOUNT_ID}:network-acl/*`,
            `arn:${Aws.PARTITION}:ec2:*:${Aws.ACCOUNT_ID}:vpc/*`,
            `arn:${Aws.PARTITION}:ec2:*:${Aws.ACCOUNT_ID}:security-group/*`,
            `arn:${Aws.PARTITION}:ec2:*:${Aws.ACCOUNT_ID}:vpc-peering-connection/*`,
          ],
          actions: [
            "ec2:AuthorizeSecurityGroupIngress",
            "ec2:AcceptVpcPeeringConnection",
            "ec2:CreateRoute",
            "ec2:CreateVpcPeeringConnection",
            "ec2:CreateNetworkAclEntry",
            "ec2:CreateTags",
          ],
        }),
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          resources: ["*"],
          actions: [
            "ec2:DescribeSecurityGroupRules",
            "ec2:DescribeVpcs",
            "ec2:DescribeVpcPeeringConnections",
            "ec2:DescribeSubnets",
            "ec2:DescribeNetworkAcls",
            "ec2:DescribeRouteTables",
          ],
        }),
      ],
    });
    this.centralAssumeRolePolicy.attachToRole(clusterHandler.role!);

    // Create a lambda to handle all cluster related APIs.
    clusterHandler.role!.attachInlinePolicy(clusterHandlerPolicy);
    addCfnNagSuppressRules(
      clusterHandlerPolicy.node.defaultChild as iam.CfnPolicy,
      [
        {
          id: "W12",
          reason:
            "This policy needs to be able to have access to all resources",
        },
      ]
    );

    // Add cluster lambda as a Datasource
    const clusterLambdaDS = this.graphqlApi.addLambdaDataSource(
      "ClusterAPILambdaDS",
      clusterHandler,
      {
        description: "Lambda Resolver Datasource",
      }
    );

    // Set resolver for related cluster API methods
    clusterLambdaDS.createResolver('listDomainNames', {
      typeName: "Query",
      fieldName: "listDomainNames",
      requestMappingTemplate: appsync.MappingTemplate.fromFile(
        path.join(__dirname, "../../graphql/vtl/cluster/ListDomainNames.vtl")
      ),
      responseMappingTemplate: appsync.MappingTemplate.lambdaResult(),
    });

    clusterLambdaDS.createResolver('listImportedDomains', {
      typeName: "Query",
      fieldName: "listImportedDomains",
      requestMappingTemplate: appsync.MappingTemplate.lambdaRequest(),
      responseMappingTemplate: appsync.MappingTemplate.lambdaResult(),
    });

    clusterLambdaDS.createResolver('getDomainDetails', {
      typeName: "Query",
      fieldName: "getDomainDetails",
      requestMappingTemplate: appsync.MappingTemplate.fromFile(
        path.join(__dirname, "../../graphql/vtl/cluster/GetDomainDetails.vtl")
      ),
      responseMappingTemplate: appsync.MappingTemplate.fromFile(
        path.join(
          __dirname,
          "../../graphql/vtl/cluster/GetDomainDetailsResp.vtl"
        )
      ),
    });

    clusterLambdaDS.createResolver('getDomainVpc', {
      typeName: "Query",
      fieldName: "getDomainVpc",
      requestMappingTemplate: appsync.MappingTemplate.fromFile(
        path.join(__dirname, "../../graphql/vtl/cluster/GetDomainVpc.vtl")
      ),
      responseMappingTemplate: appsync.MappingTemplate.lambdaResult(),
    });

    clusterLambdaDS.createResolver('importDomain', {
      typeName: "Mutation",
      fieldName: "importDomain",
      requestMappingTemplate: appsync.MappingTemplate.fromFile(
        path.join(__dirname, "../../graphql/vtl/cluster/ImportDomain.vtl")
      ),
      responseMappingTemplate: appsync.MappingTemplate.lambdaResult(),
    });

    clusterLambdaDS.createResolver('removeDomain', {
      typeName: "Mutation",
      fieldName: "removeDomain",
      requestMappingTemplate: appsync.MappingTemplate.fromFile(
        path.join(__dirname, "../../graphql/vtl/cluster/RemoveDomain.vtl")
      ),
      responseMappingTemplate: appsync.MappingTemplate.lambdaResult(),
    });

    clusterLambdaDS.createResolver('createProxyForOpenSearch', {
      typeName: "Mutation",
      fieldName: "createProxyForOpenSearch",
      requestMappingTemplate: appsync.MappingTemplate.fromFile(
        path.join(
          __dirname,
          "../../graphql/vtl/proxy/CreateProxyForOpenSearch.vtl"
        )
      ),
      responseMappingTemplate: appsync.MappingTemplate.lambdaResult(),
    });

    clusterLambdaDS.createResolver('deleteProxyForOpenSearch', {
      typeName: "Mutation",
      fieldName: "deleteProxyForOpenSearch",
      requestMappingTemplate: appsync.MappingTemplate.lambdaRequest(),
      responseMappingTemplate: appsync.MappingTemplate.lambdaResult(),
    });

    clusterLambdaDS.createResolver('createAlarmForOpenSearch', {
      typeName: "Mutation",
      fieldName: "createAlarmForOpenSearch",
      requestMappingTemplate: appsync.MappingTemplate.fromFile(
        path.join(
          __dirname,
          "../../graphql/vtl/alarm/CreateAlarmForOpenSearch.vtl"
        )
      ),
      responseMappingTemplate: appsync.MappingTemplate.lambdaResult(),
    });

    clusterLambdaDS.createResolver('deleteAlarmForOpenSearch', {
      typeName: "Mutation",
      fieldName: "deleteAlarmForOpenSearch",
      requestMappingTemplate: appsync.MappingTemplate.lambdaRequest(),
      responseMappingTemplate: appsync.MappingTemplate.lambdaResult(),
    });

    // Set resolver for CIDR validation API methods
    clusterLambdaDS.createResolver('validateVpcCidr', {
      typeName: "Query",
      fieldName: "validateVpcCidr",
      requestMappingTemplate: appsync.MappingTemplate.lambdaRequest(),
      responseMappingTemplate: appsync.MappingTemplate.lambdaResult(),
    });

    // Create a Step Functions to orchestrate pipeline flow
    const pipeFlow = new PipelineFlowStack(this, "PipelineFlowSM", {
      tableArn: this.pipelineTable.tableArn,
      cfnFlowSMArn: props.cfnFlowSMArn,
    });

    // Create a lambda to handle all pipeline related APIs.
    const pipelineHandler = new lambda.Function(this, "PipelineHandler", {
      code: lambda.AssetCode.fromAsset(
        path.join(__dirname, "../../lambda/api/pipeline"),
        { followSymlinks: SymlinkFollowMode.ALWAYS }
      ),
      runtime: lambda.Runtime.PYTHON_3_9,
      handler: "lambda_function.lambda_handler",
      timeout: Duration.seconds(60),
      memorySize: 1024,
      environment: {
        STATE_MACHINE_ARN: pipeFlow.stateMachineArn,
        PIPELINE_TABLE: this.pipelineTable.tableName,
        STACK_PREFIX: props.stackPrefix,
        SOLUTION_VERSION: process.env.VERSION || "v1.0.0",
        SOLUTION_ID: props.solutionId,
        SUB_ACCOUNT_LINK_TABLE_NAME: props.subAccountLinkTable.tableName,
      },
      description: `${Aws.STACK_NAME} - Pipeline APIs Resolver`,
    });

    // Grant permissions to the pipeline lambda
    this.pipelineTable.grantReadWriteData(pipelineHandler);
    props.subAccountLinkTable.grantReadData(pipelineHandler);
    pipelineHandler.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        resources: [pipeFlow.stateMachineArn],
        actions: ["states:StartExecution"],
      })
    );
    pipelineHandler.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        resources: ["*"],
        actions: ["es:DescribeElasticsearchDomain", "es:DescribeDomain"],
      })
    );
    this.centralAssumeRolePolicy.attachToRole(pipelineHandler.role!);

    // Add pipeline table as a Datasource
    const pipeDynamoDS = this.graphqlApi.addDynamoDbDataSource(
      "PipelineDynamoDS",
      this.pipelineTable,
      {
        description: "DynamoDB Resolver Datasource",
      }
    );

    // Add pipeline lambda as a Datasource
    const pipeLambdaDS = this.graphqlApi.addLambdaDataSource(
      "PipelineLambdaDS",
      pipelineHandler,
      {
        description: "Lambda Resolver Datasource",
      }
    );

    // Set resolver for releted cluster API methods
    pipeLambdaDS.createResolver('listServicePipelines', {
      typeName: "Query",
      fieldName: "listServicePipelines",
      requestMappingTemplate: appsync.MappingTemplate.fromFile(
        path.join(
          __dirname,
          "../../graphql/vtl/pipeline/ListServicePipelines.vtl"
        )
      ),
      responseMappingTemplate: appsync.MappingTemplate.fromFile(
        path.join(
          __dirname,
          "../../graphql/vtl/pipeline/ListServicePipelinesResp.vtl"
        )
      ),
    });

    pipeDynamoDS.createResolver('getServicePipeline', {
      typeName: "Query",
      fieldName: "getServicePipeline",
      requestMappingTemplate: appsync.MappingTemplate.dynamoDbGetItem(
        "id",
        "id"
      ),
      responseMappingTemplate: appsync.MappingTemplate.fromFile(
        path.join(
          __dirname,
          "../../graphql/vtl/pipeline/GetServicePipelineResp.vtl"
        )
      ),
    });

    pipeLambdaDS.createResolver('createServicePipeline', {
      typeName: "Mutation",
      fieldName: "createServicePipeline",
      requestMappingTemplate: appsync.MappingTemplate.fromFile(
        path.join(
          __dirname,
          "../../graphql/vtl/pipeline/CreateServicePipeline.vtl"
        )
      ),
      responseMappingTemplate: appsync.MappingTemplate.lambdaResult(),
    });

    pipeLambdaDS.createResolver('deleteServicePipeline', {
      typeName: "Mutation",
      fieldName: "deleteServicePipeline",
      requestMappingTemplate: appsync.MappingTemplate.lambdaRequest(),
      responseMappingTemplate: appsync.MappingTemplate.lambdaResult(),
    });

    // Create a lambda to handle all AWS resource related APIs.
    const resourceHandler = new lambda.Function(this, "ResourceHandler", {
      code: lambda.AssetCode.fromAsset(
        path.join(__dirname, "../../lambda/api/resource"),
        { followSymlinks: SymlinkFollowMode.ALWAYS }
      ),
      runtime: lambda.Runtime.PYTHON_3_9,
      handler: "lambda_function.lambda_handler",
      timeout: Duration.seconds(60),
      memorySize: 1024,
      environment: {
        DEFAULT_LOGGING_BUCKET: props.defaultLoggingBucket,
        SOLUTION_VERSION: process.env.VERSION || "v1.0.0",
        SOLUTION_ID: props.solutionId,
        STACK_PREFIX: props.stackPrefix,
        SUB_ACCOUNT_LINK_TABLE_NAME: props.subAccountLinkTable.tableName,

      },
      description: `${Aws.STACK_NAME} - Resource APIs Resolver`,
    });
    props.subAccountLinkTable.grantReadData(resourceHandler);

    // Grant permissions to the resourceHandler lambda
    const resourceHandlerPolicy = new iam.Policy(
      this,
      "ResourceHandlerPolicy",
      {
        statements: [
          new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            resources: [
              `arn:${Aws.PARTITION}:iam::${Aws.ACCOUNT_ID}:role/service-role/${props.stackPrefix}-*`,
              `arn:${Aws.PARTITION}:iam::${Aws.ACCOUNT_ID}:role/${props.stackPrefix}-*`,
              `arn:${Aws.PARTITION}:iam::${Aws.ACCOUNT_ID}:policy/${props.stackPrefix}-*`,
            ],
            actions: [
              "iam:GetRole",
              "iam:CreateRole",
              "iam:PassRole",
              "iam:PutRolePolicy",
            ],
          }),
          new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            resources: [
              `arn:${Aws.PARTITION}:iam::${Aws.ACCOUNT_ID}:role/aws-service-role/wafv2.amazonaws.com/AWSServiceRoleForWAFV2Logging`,
            ],
            actions: [
              "iam:CreateServiceLinkedRole",
            ],
          }),
          new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            resources: ["*"],
            actions: [
              "firehose:CreateDeliveryStream",
              "firehose:DescribeDeliveryStream",
            ],
          }),
          new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            resources: ["*"],
            actions: [
              "s3:ListAllMyBuckets",
              "s3:PutBucketLogging",
              "s3:GetBucketLogging",
              "s3:GetBucketLocation",
              "s3:CreateBucket",
              "s3:ListBucket",
              "s3:PutObject",
              "s3:DeleteAccessPointPolicy",
              "s3:DeleteAccessPointPolicyForObjectLambda",
              "s3:DeleteBucketPolicy",
              "s3:PutAccessPointPolicy",
              "s3:PutAccessPointPolicyForObjectLambda",
              "s3:PutBucketPolicy",
              "s3:PutMultiRegionAccessPointPolicy",
              "s3:PutBucketAcl",
              "s3:PutBucketOwnershipControls",
              "s3:GetAccessPointPolicy",
              "s3:GetAccessPointPolicyForObjectLambda",
              "s3:GetAccessPointPolicyStatus",
              "s3:GetAccessPointPolicyStatusForObjectLambda",
              "s3:GetAccountPublicAccessBlock",
              "s3:GetBucketPolicy",
              "s3:GetBucketPolicyStatus",
              "s3:GetMultiRegionAccessPointPolicy",
              "s3:GetMultiRegionAccessPointPolicyStatus",
            ],
          }),
          new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            resources: ["*"],
            actions: [
              "ec2:CreateTags",
              "ec2:DescribeTags",
              "ec2:CreateFlowLogs",
              "ec2:DescribeFlowLogs",
              "ec2:DescribeVpcs",
              "ec2:DescribeSubnets",
              "ec2:DescribeSecurityGroups",
              "ec2:DescribeKeyPairs",
            ],
          }),
          new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            resources: ["*"],
            actions: ["acm:ListCertificates", "acm:DescribeCertificate"],
          }),
          new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            resources: ["*"],
            actions: [
              "cloudtrail:ListTrails",
              "cloudtrail:GetTrail",
              "cloudtrail:UpdateTrail",
            ],
          }),
          new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            resources: ["*"],
            actions: [
              "cloudfront:ListDistributions",
              "cloudfront:GetDistributionConfig",
              "cloudfront:UpdateDistribution",
              "cloudfront:GetDistributionConfig",
              "cloudfront:GetRealtimeLogConfig",
            ],
          }),
          new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            resources: ["*"],
            actions: ["lambda:ListFunctions"],
          }),
          new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            resources: ["*"],
            actions: ["rds:DescribeDBInstances", "rds:DescribeDBClusters"],
          }),
          new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            resources: ["*"],
            actions: [
              "elasticloadbalancing:DescribeLoadBalancers",
              "elasticloadbalancing:DescribeLoadBalancerAttributes",
              "elasticloadbalancing:ModifyLoadBalancerAttributes",
            ],
          }),
          new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            resources: ["*"],
            actions: [
              "wafv2:GetLoggingConfiguration",
              "wafv2:ListWebACLs",
              "wafv2:PutLoggingConfiguration",
              "wafv2:GetWebACL",
            ],
          }),
          new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            resources: ["*"],
            actions: ["config:DescribeDeliveryChannels"],
          }),
          new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            resources: ["*"],
            actions: [
              "logs:GetLogEvents",
              "logs:PutLogEvents",
              "logs:CreateLogDelivery",
              "logs:PutResourcePolicy",
              "logs:DescribeResourcePolicies",
            ],
          }),
        ],
      }
    );

    resourceHandler.role!.attachInlinePolicy(resourceHandlerPolicy);
    this.centralAssumeRolePolicy.attachToRole(resourceHandler.role!);
    addCfnNagSuppressRules(
      resourceHandlerPolicy.node.defaultChild as iam.CfnPolicy,
      [
        {
          id: "W12",
          reason: "This policy needs to be able to execute step functions flow",
        },
      ]
    );

    // Add resource lambda as a Datasource
    const resourceLambdaDS = this.graphqlApi.addLambdaDataSource(
      "ResourceLambdaDS",
      resourceHandler,
      {
        description: "Lambda Resolver Datasource",
      }
    );

    // Set resolver for releted resource API methods
    resourceLambdaDS.createResolver('listResources', {
      typeName: "Query",
      fieldName: "listResources",
      requestMappingTemplate: appsync.MappingTemplate.fromFile(
        path.join(__dirname, "../../graphql/vtl/resource/ListResources.vtl")
      ),
      responseMappingTemplate: appsync.MappingTemplate.lambdaResult(),
    });

    resourceLambdaDS.createResolver('getResourceLoggingBucket', {
      typeName: "Query",
      fieldName: "getResourceLoggingBucket",
      requestMappingTemplate: appsync.MappingTemplate.fromFile(
        path.join(
          __dirname,
          "../../graphql/vtl/resource/GetResourceLoggingBucket.vtl"
        )
      ),
      responseMappingTemplate: appsync.MappingTemplate.lambdaResult(),
    });

    resourceLambdaDS.createResolver('putResourceLoggingBucket', {
      typeName: "Mutation",
      fieldName: "putResourceLoggingBucket",
      requestMappingTemplate: appsync.MappingTemplate.fromFile(
        path.join(
          __dirname,
          "../../graphql/vtl/resource/PutResourceLoggingBucket.vtl"
        )
      ),
      responseMappingTemplate: appsync.MappingTemplate.lambdaResult(),
    });

    resourceLambdaDS.createResolver('getResourceLogConfigs', {
      typeName: "Query",
      fieldName: "getResourceLogConfigs",
      requestMappingTemplate: appsync.MappingTemplate.fromFile(
        path.join(
          __dirname,
          "../../graphql/vtl/resource/GetResourceLogConfig.vtl"
        )
      ),
      responseMappingTemplate: appsync.MappingTemplate.lambdaResult(),
    });

    resourceLambdaDS.createResolver('putResourceLogConfig', {
      typeName: "Mutation",
      fieldName: "putResourceLogConfig",
      requestMappingTemplate: appsync.MappingTemplate.fromFile(
        path.join(
          __dirname,
          "../../graphql/vtl/resource/PutResourceLogConfig.vtl"
        )
      ),
      responseMappingTemplate: appsync.MappingTemplate.lambdaResult(),
    });

    // Setup DLQ
    const groupModificationEventDLQ = new sqs.Queue(this, "LogEventDLQ", {
      visibilityTimeout: Duration.minutes(15),
      retentionPeriod: Duration.days(7),
      encryption: sqs.QueueEncryption.KMS_MANAGED,
    });
    groupModificationEventDLQ.addToResourcePolicy(
      new iam.PolicyStatement({
        actions: ["sqs:*"],
        effect: iam.Effect.DENY,
        resources: [groupModificationEventDLQ.queueArn],
        conditions: {
          ["Bool"]: {
            "aws:SecureTransport": "false",
          },
        },
        principals: [new iam.AnyPrincipal()],
      })
    );
    NagSuppressions.addResourceSuppressions(groupModificationEventDLQ, [
      {
        id: "AwsSolutions-SQS3",
        reason: "it is a DLQ",
      },
    ]);

    const cfnGroupModificationEventDLQ = groupModificationEventDLQ.node
      .defaultChild as sqs.CfnQueue;
    cfnGroupModificationEventDLQ.overrideLogicalId("GroupModificationEventDLQ");

    // Setup instance group modification SQS
    const groupModificationQ = new sqs.Queue(
      this,
      "InstanceGroupModificationQueue",
      {
        visibilityTimeout: Duration.minutes(15),
        retentionPeriod: Duration.days(7),
        deadLetterQueue: {
          queue: groupModificationEventDLQ,
          maxReceiveCount: 30,
        },
        encryption: sqs.QueueEncryption.KMS_MANAGED,
      }
    );
    groupModificationQ.addToResourcePolicy(
      new iam.PolicyStatement({
        actions: ["sqs:*"],
        effect: iam.Effect.DENY,
        resources: [groupModificationQ.queueArn],
        conditions: {
          ["Bool"]: {
            "aws:SecureTransport": "false",
          },
        },
        principals: [new iam.AnyPrincipal()],
      })
    );

    this.groupModificationEventQueue = groupModificationQ;


    new CfnOutput(this, "GraphQLAPIEndpoint", {
      description: "GraphQL API Endpoint (back-end)",
      value: this.graphqlApi.graphqlUrl,
    }).overrideLogicalId("GraphQLAPIEndpoint");

    this.apiEndpoint = this.graphqlApi.graphqlUrl;
  }
}
