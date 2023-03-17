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

export interface EksStackProps {
  /**
   * Default Appsync GraphQL API for OpenSearch REST API Handler
   *
   * @default - None.
   */
  readonly graphqlApi: appsync.GraphqlApi;
  readonly eksClusterLogSourceTable: ddb.Table;
  readonly appLogIngestionTable: ddb.Table;
  readonly aosDomainTable: ddb.Table;
  readonly subAccountLinkTable: ddb.Table;
  readonly centralAssumeRolePolicy: iam.ManagedPolicy;

  readonly solutionId: string;

  readonly stackPrefix: string;
}

export class EKSClusterStack extends Construct {
  readonly eksDeploymentKindTable: ddb.Table;

  constructor(scope: Construct, id: string, props: EksStackProps) {
    super(scope, id);

    // Create a table to store LogAgentEKSDeploymentKind info
    // This table is an old design and the data model has been changed
    // It should not be used since version v1.2.0 in any APIs
    // and will be removed in release v1.4+
    this.eksDeploymentKindTable = new ddb.Table(
      this,
      "LogAgentEKSDeploymentKindTable",
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

    const cfnLogAgentEKSDeploymentKindTable = this
      .eksDeploymentKindTable.node.defaultChild as ddb.CfnTable;
    cfnLogAgentEKSDeploymentKindTable.overrideLogicalId(
      "LogAgentEKSDeploymentKindTable"
    );
    addCfnNagSuppressRules(cfnLogAgentEKSDeploymentKindTable, [
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

    // Create a lambda layer with required python packages.
    const eksLayer = new lambda.LayerVersion(this, "LogHubEKSClusterLayer", {
      code: lambda.Code.fromAsset(
        path.join(__dirname, "../../lambda/api/eks_cluster"),
        {
          followSymlinks: SymlinkFollowMode.ALWAYS,
          bundling: {
            image: lambda.Runtime.PYTHON_3_9.bundlingImage,
            command: [
              "bash",
              "-c",
              "pip install -r requirements.txt -t /asset-output/python && cp . -r /asset-output/python/",
            ],
          },
        }
      ),
      compatibleRuntimes: [lambda.Runtime.PYTHON_3_9],
      //compatibleArchitectures: [lambda.Architecture.X86_64, lambda.Architecture.ARM_64],
      description: "Default Lambda layer for EKS Cluster",
    });

    // Create a lambda to handle all eksClusterLogSource related APIs.
    const eksClusterLogSourceHandler = new lambda.Function(
      this,
      "EKSClusterLogSourceHandler",
      {
        code: lambda.AssetCode.fromAsset(
          path.join(__dirname, "../../lambda/api/eks_cluster"),
          { followSymlinks: SymlinkFollowMode.ALWAYS }
        ),
        layers: [eksLayer],
        runtime: lambda.Runtime.PYTHON_3_9,
        handler: "lambda_function.lambda_handler",
        memorySize: 1024,
        environment: {
          EKS_CLUSTER_LOG_SOURCE_TABLE: props.eksClusterLogSourceTable.tableName,
          STACK_PREFIX: props.stackPrefix,
          AOS_DOMAIN_TABLE: props.aosDomainTable.tableName,
          APP_LOG_INGESTION_TABLE: props.appLogIngestionTable.tableName,
          SUB_ACCOUNT_LINK_TABLE_NAME: props.subAccountLinkTable.tableName,
          EKS_OIDC_PROVIDER_ARN_PREFIX: `arn:${Aws.PARTITION}:iam::${Aws.ACCOUNT_ID}:oidc-provider/`,
          EKS_OIDC_CLIENT_ID: "sts.amazonaws.com",
          SOLUTION_VERSION: process.env.VERSION || "v1.0.0",
          SOLUTION_ID: props.solutionId,
        },
        timeout: Duration.seconds(60),
        description: `${Aws.STACK_NAME} - EKS Cluster APIs Resolver`,
      }
    );

    // add eks policy documents
    eksClusterLogSourceHandler.addToRolePolicy(
      new iam.PolicyStatement({
        sid: "eks",
        actions: [
          "eks:DescribeCluster",
          "eks:ListIdentityProviderConfigs",
          "eks:UpdateClusterConfig",
          "eks:ListClusters",
        ],
        effect: iam.Effect.ALLOW,
        resources: [`arn:${Aws.PARTITION}:eks:*:${Aws.ACCOUNT_ID}:cluster/*`],
      })
    );

    eksClusterLogSourceHandler.addToRolePolicy(
      new iam.PolicyStatement({
        sid: "iam",
        actions: [
          "iam:GetServerCertificate",
          "iam:DetachRolePolicy",
          "iam:GetPolicy",
          "iam:TagRole",
          "iam:CreateRole",
          "iam:AttachRolePolicy",
          "iam:TagPolicy",
          "iam:GetOpenIDConnectProvider",
          "iam:TagOpenIDConnectProvider",
          "iam:CreateOpenIDConnectProvider",
        ],
        effect: iam.Effect.ALLOW,
        resources: [
          `arn:${Aws.PARTITION}:iam::${Aws.ACCOUNT_ID}:oidc-provider/*`,
          `arn:${Aws.PARTITION}:iam::${Aws.ACCOUNT_ID}:role/*`,
          `arn:${Aws.PARTITION}:iam::${Aws.ACCOUNT_ID}:server-certificate/*`,
          `arn:${Aws.PARTITION}:iam::${Aws.ACCOUNT_ID}:policy/*`,
        ],
      })
    );

    // Grant permissions to the eksClusterLogSource lambda
    props.eksClusterLogSourceTable.grantReadWriteData(
      eksClusterLogSourceHandler
    );
    props.aosDomainTable.grantReadData(eksClusterLogSourceHandler);
    props.appLogIngestionTable.grantReadData(eksClusterLogSourceHandler);
    props.subAccountLinkTable.grantReadData(eksClusterLogSourceHandler);
    props.centralAssumeRolePolicy.attachToRole(
      eksClusterLogSourceHandler.role!
    );

    // Add eksClusterLogSource lambda as a Datasource
    const eksClusterLogSourceLambdaDS = props.graphqlApi.addLambdaDataSource(
      "EKSClusterLogSourceLambdaDS",
      eksClusterLogSourceHandler,
      {
        description: "Lambda Resolver Datasource",
      }
    );

    eksClusterLogSourceLambdaDS.createResolver('getEKSClusterDetails', {
      typeName: "Query",
      fieldName: "getEKSClusterDetails",
      requestMappingTemplate: appsync.MappingTemplate.fromFile(
        path.join(
          __dirname,
          "../../graphql/vtl/eks_cluster/GetEKSClusterDetails.vtl"
        )
      ),
      responseMappingTemplate: appsync.MappingTemplate.fromFile(
        path.join(
          __dirname,
          "../../graphql/vtl/eks_cluster/GetEKSClusterDetailsResp.vtl"
        )
      ),
    });

    // Set resolver for releted eks cluster API methods
    eksClusterLogSourceLambdaDS.createResolver('listEKSClusterNames', {
      typeName: "Query",
      fieldName: "listEKSClusterNames",
      requestMappingTemplate: appsync.MappingTemplate.lambdaRequest(),
      responseMappingTemplate: appsync.MappingTemplate.fromFile(
        path.join(
          __dirname,
          "../../graphql/vtl/eks_cluster/ListEKSClusterNamesResp.vtl"
        )
      ),
    });

    eksClusterLogSourceLambdaDS.createResolver('listImportedEKSClusters', {
      typeName: "Query",
      fieldName: "listImportedEKSClusters",
      requestMappingTemplate: appsync.MappingTemplate.fromFile(
        path.join(
          __dirname,
          "../../graphql/vtl/eks_cluster/ListImportedEKSClusters.vtl"
        )
      ),
      responseMappingTemplate: appsync.MappingTemplate.fromFile(
        path.join(
          __dirname,
          "../../graphql/vtl/eks_cluster/ListImportedEKSClustersResp.vtl"
        )
      ),
    });

    eksClusterLogSourceLambdaDS.createResolver('importEKSCluster', {
      typeName: "Mutation",
      fieldName: "importEKSCluster",
      requestMappingTemplate: appsync.MappingTemplate.fromFile(
        path.join(
          __dirname,
          "../../graphql/vtl/eks_cluster/ImportEKSCluster.vtl"
        )
      ),
      responseMappingTemplate: appsync.MappingTemplate.lambdaResult(),
    });

    eksClusterLogSourceLambdaDS.createResolver('removeEKSCluster', {
      typeName: "Mutation",
      fieldName: "removeEKSCluster",
      requestMappingTemplate: appsync.MappingTemplate.fromFile(
        path.join(
          __dirname,
          "../../graphql/vtl/eks_cluster/RemoveEKSCluster.vtl"
        )
      ),
      responseMappingTemplate: appsync.MappingTemplate.lambdaResult(),
    });
  }
}
