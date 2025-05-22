// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
import * as path from 'path';
import {
  Duration,
  Aws,
  RemovalPolicy,
  aws_appsync as appsync,
  aws_iam as iam,
  aws_lambda as lambda,
  aws_dynamodb as ddb,
  aws_kms as kms,
} from 'aws-cdk-lib';
import { Construct } from 'constructs';

import { SharedPythonLayer } from '../layer/layer';

export interface CrossAccountStackProps {
  readonly encryptionKey: kms.IKey;
  /**
   * Default Appsync GraphQL API for OpenSearch REST API Handler
   *
   * @default - None.
   */
  readonly graphqlApi: appsync.GraphqlApi;

  readonly solutionId: string;
}
export class CrossAccountStack extends Construct {
  readonly apiEndpoint: string;
  readonly centralAssumeRolePolicy: iam.ManagedPolicy;
  readonly subAccountLinkTable: ddb.Table;
  readonly cwlAccessRole: iam.Role;

  constructor(scope: Construct, id: string, props: CrossAccountStackProps) {
    super(scope, id);
    const stackPrefix = 'CL';

    this.centralAssumeRolePolicy = new iam.ManagedPolicy(
      this,
      'CentralAssumeRolePolicy',
      {
        statements: [
          new iam.PolicyStatement({
            actions: [
              'logs:CreateLogGroup',
              'logs:CreateLogStream',
              'logs:PutLogEvents',
            ],
            resources: [
              `arn:${Aws.PARTITION}:logs:${Aws.REGION}:${Aws.ACCOUNT_ID}:*`,
            ],
          }),
        ],
      }
    );

    this.subAccountLinkTable = new ddb.Table(this, 'SubAccount', {
      partitionKey: {
        name: 'subAccountId',
        type: ddb.AttributeType.STRING,
      },
      sortKey: {
        name: 'region',
        type: ddb.AttributeType.STRING,
      },
      billingMode: ddb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY,
      encryption: ddb.TableEncryption.CUSTOMER_MANAGED,
      encryptionKey: props.encryptionKey,
      pointInTimeRecovery: true,
      stream: ddb.StreamViewType.NEW_AND_OLD_IMAGES,
    });

    const cfnSubAccountLinkTable = this.subAccountLinkTable.node
      .defaultChild as ddb.CfnTable;
    cfnSubAccountLinkTable.overrideLogicalId('SubAccount');

    // Create a cloudwatch log access role for main account fluent-bit agent and sub account agent
    const cwlAccessPolicy = new iam.Policy(this, 'CWLAccessPolicy', {
      statements: [
        new iam.PolicyStatement({
          actions: [
            'logs:CreateLogGroup',
            'logs:CreateLogStream',
            'logs:PutLogEvents',
            'logs:DescribeLogGroups',
            'logs:DescribeLogStreams',
          ],
          effect: iam.Effect.ALLOW,
          resources: [
            `arn:${Aws.PARTITION}:logs:${Aws.REGION}:${Aws.ACCOUNT_ID}:log-group:${stackPrefix}-flb-internal-group*:*`,
          ],
        }),
      ],
    });

    this.cwlAccessRole = new iam.Role(this, 'CWLAccessRole', {
      roleName: `${stackPrefix}-cloudwatch-access-${Aws.STACK_NAME}-${Aws.REGION}`,
      assumedBy: new iam.CompositePrincipal(
        new iam.AccountPrincipal(Aws.ACCOUNT_ID)
      ),
      description:
        'Using this role to send log data to cloudwatch flb monitor log group',
    });
    this.cwlAccessRole.assumeRolePolicy?.addStatements(
      new iam.PolicyStatement({
        actions: ['sts:AssumeRole'],
        effect: iam.Effect.ALLOW,
        principals: [new iam.AccountPrincipal(Aws.ACCOUNT_ID)],
      })
    );

    this.cwlAccessRole.attachInlinePolicy(cwlAccessPolicy);

    // Create a lambda to handle all linkSubAccount related APIs.
    const crossAccountHandler = new lambda.Function(
      this,
      'LinkSubAccountHandler',
      {
        code: lambda.AssetCode.fromAsset(
          path.join(__dirname, '../../lambda/api/cross_account')
        ),
        runtime: lambda.Runtime.PYTHON_3_11,
        handler: 'lambda_function.lambda_handler',
        timeout: Duration.minutes(15),
        memorySize: 2048,
        layers: [SharedPythonLayer.getInstance(this)],
        environment: {
          CENTRAL_ASSUME_ROLE_POLICY_ARN:
            this.centralAssumeRolePolicy.managedPolicyArn,
          SUB_ACCOUNT_LINK_TABLE_NAME: this.subAccountLinkTable.tableName,
          BASE_RESOURCE_ARN: `arn:${Aws.PARTITION}:logs:${Aws.REGION}:${Aws.ACCOUNT_ID}:*`,
          CWL_MONITOR_ROLE_NAME: this.cwlAccessRole.roleName,
          CWL_MONITOR_ROLE_ARN: this.cwlAccessRole.roleArn,
          SOLUTION_VERSION: process.env.VERSION || 'v1.0.0',
          SOLUTION_ID: props.solutionId,
        },
        description: `${Aws.STACK_NAME} - CrossAccount APIs Resolver`,
      }
    );

    // Grant permissions to the linkSubAccount lambda
    this.subAccountLinkTable.grantReadWriteData(crossAccountHandler);

    // Grant iam Policy to the linkSubAccount lambda
    crossAccountHandler.addToRolePolicy(
      new iam.PolicyStatement({
        actions: [
          'iam:GetRole',
          'iam:GetInstanceProfile',
          'iam:ListAttachedRolePolicies',
          'iam:UpdateAssumeRolePolicy',
        ],
        effect: iam.Effect.ALLOW,
        resources: [`arn:${Aws.PARTITION}:iam::${Aws.ACCOUNT_ID}:*`],
      })
    );
    crossAccountHandler.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['events:RemovePermission', 'events:PutPermission'],
        effect: iam.Effect.ALLOW,
        resources: [`arn:*:events:*:${Aws.ACCOUNT_ID}:event-bus/default`],
      })
    );
    crossAccountHandler.addToRolePolicy(
      new iam.PolicyStatement({
        actions: [
          'iam:CreatePolicyVersion',
          'iam:SetDefaultPolicyVersion',
          'iam:ListPolicyVersions',
          'iam:DeletePolicyVersion',
        ],
        effect: iam.Effect.ALLOW,
        resources: [this.centralAssumeRolePolicy.managedPolicyArn],
      })
    );

    // Add appLogIngestion lambda as a Datasource
    const crossAccountLambdaDS = props.graphqlApi.addLambdaDataSource(
      'CrossAccountLambdaDS',
      crossAccountHandler,
      {
        description: 'Lambda Resolver Datasource',
      }
    );

    crossAccountLambdaDS.createResolver('listSubAccountLinks', {
      typeName: 'Query',
      fieldName: 'listSubAccountLinks',
      requestMappingTemplate: appsync.MappingTemplate.fromFile(
        path.join(
          __dirname,
          '../../graphql/vtl/cross_account/ListSubAccountLinks.vtl'
        )
      ),
      responseMappingTemplate: appsync.MappingTemplate.fromFile(
        path.join(
          __dirname,
          '../../graphql/vtl/cross_account/ListSubAccountLinksResp.vtl'
        )
      ),
    });

    crossAccountLambdaDS.createResolver('getSubAccountLink', {
      typeName: 'Query',
      fieldName: 'getSubAccountLink',
      requestMappingTemplate: appsync.MappingTemplate.fromFile(
        path.join(
          __dirname,
          '../../graphql/vtl/cross_account/GetSubAccountLink.vtl'
        )
      ),
      responseMappingTemplate: appsync.MappingTemplate.fromFile(
        path.join(
          __dirname,
          '../../graphql/vtl/cross_account/GetSubAccountLinkResp.vtl'
        )
      ),
    });

    crossAccountLambdaDS.createResolver('updateSubAccountLink', {
      typeName: 'Mutation',
      fieldName: 'updateSubAccountLink',
      requestMappingTemplate: appsync.MappingTemplate.fromFile(
        path.join(
          __dirname,
          '../../graphql/vtl/cross_account/UpdateSubAccountLink.vtl'
        )
      ),
      responseMappingTemplate: appsync.MappingTemplate.lambdaResult(),
    });

    crossAccountLambdaDS.createResolver('createSubAccountLink', {
      typeName: 'Mutation',
      fieldName: 'createSubAccountLink',
      requestMappingTemplate: appsync.MappingTemplate.fromFile(
        path.join(
          __dirname,
          '../../graphql/vtl/cross_account/CreateSubAccountLink.vtl'
        )
      ),
      responseMappingTemplate: appsync.MappingTemplate.lambdaResult(),
    });
    crossAccountLambdaDS.createResolver('deleteSubAccountLink', {
      typeName: 'Mutation',
      fieldName: 'deleteSubAccountLink',
      requestMappingTemplate: appsync.MappingTemplate.fromFile(
        path.join(
          __dirname,
          '../../graphql/vtl/cross_account/DeleteSubAccountLink.vtl'
        )
      ),
      responseMappingTemplate: appsync.MappingTemplate.lambdaResult(),
    });
  }
}
