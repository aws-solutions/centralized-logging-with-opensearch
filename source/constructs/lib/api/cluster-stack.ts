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
import * as appsync from '@aws-cdk/aws-appsync-alpha';
import {
  Aws,
  Fn,
  Duration,
  RemovalPolicy,
  aws_dynamodb as ddb,
  aws_iam as iam,
  aws_lambda as lambda,
} from 'aws-cdk-lib';
import { IVpc } from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';

import { SharedPythonLayer } from '../layer/layer';
import { addCfnNagSuppressRules } from '../main-stack';
import { ClusterFlowStack } from './cluster-flow';

export interface ClusterStackProps {
  /**
   * Step Functions State Machine ARN for CloudFormation deployment Flow
   *
   * @default - None.
   */
  readonly cfnFlowSMArn: string;

  /**
   * VPC
   *
   */
  readonly vpc: IVpc;

  /**
   * Default Subnet Ids (Private)
   *
   */
  readonly subnetIds: string[];

  /**
   * Processing SecurityGroup ID
   *
   */
  readonly processSgId: string;

  /**
   * Default Logging Bucket Name
   *
   * @default - None.
   */
  readonly defaultLoggingBucket: string;

  /**
   * Default Appsync GraphQL API for OpenSearch REST API Handler
   *
   * @default - None.
   */
  readonly graphqlApi: appsync.GraphqlApi;

  readonly centralAssumeRolePolicy: iam.ManagedPolicy;

  readonly appPipelineTable: ddb.Table;
  readonly svcPipelineTable: ddb.Table;

  readonly solutionId: string;
  readonly stackPrefix: string;
  readonly aosMasterRole: iam.Role;
}
export class ClusterStack extends Construct {
  readonly clusterTable: ddb.Table;

  constructor(scope: Construct, id: string, props: ClusterStackProps) {
    super(scope, id);

    // Create a table to store imported domain
    this.clusterTable = new ddb.Table(this, 'OpenSearchDomain', {
      partitionKey: {
        name: 'id',
        type: ddb.AttributeType.STRING,
      },
      billingMode: ddb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY,
      encryption: ddb.TableEncryption.DEFAULT,
      pointInTimeRecovery: true,
    });

    const cfnClusterTable = this.clusterTable.node.defaultChild as ddb.CfnTable;
    cfnClusterTable.overrideLogicalId('OpenSearchDomain');
    addCfnNagSuppressRules(cfnClusterTable, [
      {
        id: 'W73',
        reason: 'This table has billing mode as PROVISIONED',
      },
      {
        id: 'W74',
        reason:
          'This table is set to use DEFAULT encryption, the key is owned by DDB.',
      },
    ]);

    // Create a Step Functions to orchestrate cluster flow
    const clusterFlow = new ClusterFlowStack(this, 'ClusterFlowSM', {
      tableArn: this.clusterTable.tableArn,
      cfnFlowSMArn: props.cfnFlowSMArn,
    });

    // Create a lambda layer with required python packages.
    const clusterLayer = new lambda.LayerVersion(this, 'ClusterLayer', {
      code: lambda.Code.fromAsset(
        path.join(__dirname, '../../lambda/api/cluster'),
        {
          bundling: {
            image: lambda.Runtime.PYTHON_3_11.bundlingImage,
            platform: "linux/amd64",
            command: [
              'bash',
              '-c',
              'pip install -r requirements.txt -t /asset-output/python',
            ],
          },
        }
      ),
      compatibleRuntimes: [lambda.Runtime.PYTHON_3_11],
      description: `${Aws.STACK_NAME} - Lambda layer for OpenSearch Cluster`,
    });

    // Create a lambda to handle all cluster related APIs.
    const clusterHandler = new lambda.Function(this, 'ClusterHandler', {
      code: lambda.AssetCode.fromAsset(
        path.join(__dirname, '../../lambda/api/cluster')
      ),
      runtime: lambda.Runtime.PYTHON_3_11,
      handler: 'lambda_function.lambda_handler',
      timeout: Duration.minutes(3),
      memorySize: 1024,
      layers: [clusterLayer, SharedPythonLayer.getInstance(this)],
      environment: {
        PARTITION: Aws.PARTITION,
        OPENSEARCH_MASTER_ROLE_ARN: props.aosMasterRole.roleArn,
        CLUSTER_TABLE: this.clusterTable.tableName,
        APP_PIPELINE_TABLE_NAME: props.appPipelineTable.tableName,
        SVC_PIPELINE_TABLE: props.svcPipelineTable.tableName,
        STATE_MACHINE_ARN: clusterFlow.stateMachineArn,
        SOLUTION_VERSION: process.env.VERSION || 'v1.0.0',
        SOLUTION_ID: props.solutionId,
        STACK_PREFIX: props.stackPrefix,
        DEFAULT_VPC_ID: props.vpc.vpcId,
        DEFAULT_SG_ID: props.processSgId,
        DEFAULT_PRIVATE_SUBNET_IDS: Fn.join(',', props.subnetIds),
        DEFAULT_LOGGING_BUCKET: props.defaultLoggingBucket,
      },
      description: `${Aws.STACK_NAME} - Cluster APIs Resolver`,
    });

    // Grant permissions to the cluster lambda
    this.clusterTable.grantReadWriteData(clusterHandler);
    props.appPipelineTable.grantReadData(clusterHandler);
    props.svcPipelineTable.grantReadData(clusterHandler);

    const clusterHandlerPolicy = new iam.Policy(this, 'ClusterHandlerPolicy', {
      statements: [
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          resources: ['*'],
          actions: [
            'es:ListDomainNames',
            'es:DescribeElasticsearchDomain',
            'es:UpdateElasticsearchDomainConfig',
            'es:DescribeDomainConfig',
            'es:UpdateDomainConfig',
          ],
        }),
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          resources: ['*'],
          actions: ['cloudwatch:GetMetricData'],
        }),
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          resources: ['*'],
          actions: ['cognito-idp:DescribeUserPool'],
        }),
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          resources: [clusterFlow.stateMachineArn],
          actions: ['states:StartExecution'],
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
            'ec2:AuthorizeSecurityGroupIngress',
            'ec2:AcceptVpcPeeringConnection',
            'ec2:CreateRoute',
            'ec2:CreateVpcPeeringConnection',
            'ec2:CreateNetworkAclEntry',
            'ec2:CreateTags',
            'ec2:DeleteVpcPeeringConnection',
            'ec2:DeleteRoute',
            'ec2:DeleteNetworkAclEntry',
            'ec2:RevokeSecurityGroupIngress',
          ],
        }),
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          resources: ['*'],
          actions: [
            'ec2:DescribeSecurityGroupRules',
            'ec2:DescribeVpcs',
            'ec2:DescribeVpcPeeringConnections',
            'ec2:DescribeSubnets',
            'ec2:DescribeNetworkAcls',
            'ec2:DescribeRouteTables',
          ],
        }),
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          resources: ['*'],
          actions: [
            'kms:DescribeCustomKeyStores',
            'kms:DescribeKey',
          ],
        }),
      ],
    });
    props.centralAssumeRolePolicy.attachToRole(clusterHandler.role!);

    // Create a lambda to handle all cluster related APIs.
    clusterHandler.role!.attachInlinePolicy(clusterHandlerPolicy);
    addCfnNagSuppressRules(
      clusterHandlerPolicy.node.defaultChild as iam.CfnPolicy,
      [
        {
          id: 'W12',
          reason:
            'This policy needs to be able to have access to all resources',
        },
      ]
    );

    // Add cluster lambda as a Datasource
    const clusterLambdaDS = props.graphqlApi.addLambdaDataSource(
      'ClusterAPILambdaDS',
      clusterHandler,
      {
        description: 'Lambda Resolver Datasource',
      }
    );

    // Set resolver for related cluster API methods
    clusterLambdaDS.createResolver('listDomainNames', {
      typeName: 'Query',
      fieldName: 'listDomainNames',
      requestMappingTemplate: appsync.MappingTemplate.fromFile(
        path.join(__dirname, '../../graphql/vtl/cluster/ListDomainNames.vtl')
      ),
      responseMappingTemplate: appsync.MappingTemplate.lambdaResult(),
    });

    clusterLambdaDS.createResolver('listImportedDomains', {
      typeName: 'Query',
      fieldName: 'listImportedDomains',
      requestMappingTemplate: appsync.MappingTemplate.lambdaRequest(),
      responseMappingTemplate: appsync.MappingTemplate.lambdaResult(),
    });

    clusterLambdaDS.createResolver('getDomainDetails', {
      typeName: 'Query',
      fieldName: 'getDomainDetails',
      requestMappingTemplate: appsync.MappingTemplate.fromFile(
        path.join(__dirname, '../../graphql/vtl/cluster/GetDomainDetails.vtl')
      ),
      responseMappingTemplate: appsync.MappingTemplate.fromFile(
        path.join(
          __dirname,
          '../../graphql/vtl/cluster/GetDomainDetailsResp.vtl'
        )
      ),
    });

    clusterLambdaDS.createResolver('getDomainVpc', {
      typeName: 'Query',
      fieldName: 'getDomainVpc',
      requestMappingTemplate: appsync.MappingTemplate.fromFile(
        path.join(__dirname, '../../graphql/vtl/cluster/GetDomainVpc.vtl')
      ),
      responseMappingTemplate: appsync.MappingTemplate.lambdaResult(),
    });

    clusterLambdaDS.createResolver('importDomain', {
      typeName: 'Mutation',
      fieldName: 'importDomain',
      requestMappingTemplate: appsync.MappingTemplate.fromFile(
        path.join(__dirname, '../../graphql/vtl/cluster/ImportDomain.vtl')
      ),
      responseMappingTemplate: appsync.MappingTemplate.lambdaResult(),
    });

    clusterLambdaDS.createResolver('removeDomain', {
      typeName: 'Mutation',
      fieldName: 'removeDomain',
      requestMappingTemplate: appsync.MappingTemplate.fromFile(
        path.join(__dirname, '../../graphql/vtl/cluster/RemoveDomain.vtl')
      ),
      responseMappingTemplate: appsync.MappingTemplate.lambdaResult(),
    });

    clusterLambdaDS.createResolver('createProxyForOpenSearch', {
      typeName: 'Mutation',
      fieldName: 'createProxyForOpenSearch',
      requestMappingTemplate: appsync.MappingTemplate.fromFile(
        path.join(
          __dirname,
          '../../graphql/vtl/proxy/CreateProxyForOpenSearch.vtl'
        )
      ),
      responseMappingTemplate: appsync.MappingTemplate.lambdaResult(),
    });

    clusterLambdaDS.createResolver('deleteProxyForOpenSearch', {
      typeName: 'Mutation',
      fieldName: 'deleteProxyForOpenSearch',
      requestMappingTemplate: appsync.MappingTemplate.lambdaRequest(),
      responseMappingTemplate: appsync.MappingTemplate.lambdaResult(),
    });

    clusterLambdaDS.createResolver('createAlarmForOpenSearch', {
      typeName: 'Mutation',
      fieldName: 'createAlarmForOpenSearch',
      requestMappingTemplate: appsync.MappingTemplate.fromFile(
        path.join(
          __dirname,
          '../../graphql/vtl/alarm/CreateAlarmForOpenSearch.vtl'
        )
      ),
      responseMappingTemplate: appsync.MappingTemplate.lambdaResult(),
    });

    clusterLambdaDS.createResolver('deleteAlarmForOpenSearch', {
      typeName: 'Mutation',
      fieldName: 'deleteAlarmForOpenSearch',
      requestMappingTemplate: appsync.MappingTemplate.lambdaRequest(),
      responseMappingTemplate: appsync.MappingTemplate.lambdaResult(),
    });

    // Set resolver for CIDR validation API methods
    clusterLambdaDS.createResolver('validateVpcCidr', {
      typeName: 'Query',
      fieldName: 'validateVpcCidr',
      requestMappingTemplate: appsync.MappingTemplate.lambdaRequest(),
      responseMappingTemplate: appsync.MappingTemplate.lambdaResult(),
    });

    clusterLambdaDS.createResolver('domainStatusCheck', {
      typeName: 'Query',
      fieldName: 'domainStatusCheck',
      requestMappingTemplate: appsync.MappingTemplate.lambdaRequest(),
      responseMappingTemplate: appsync.MappingTemplate.lambdaResult(),
    });
  }
}
