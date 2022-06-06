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

import { Construct, CfnOutput, Duration, Aws, RemovalPolicy, CustomResource, Fn } from '@aws-cdk/core';
import { ISubnet, IVpc } from "@aws-cdk/aws-ec2";
import * as cognito from '@aws-cdk/aws-cognito';
import * as appsync from '@aws-cdk/aws-appsync';
import * as lambda from '@aws-cdk/aws-lambda';
import * as path from 'path';
import * as iam from '@aws-cdk/aws-iam';
import * as ddb from '@aws-cdk/aws-dynamodb';
import * as cr from "@aws-cdk/custom-resources";

import { AuthType, addCfnNagSuppressRules } from "../main-stack";
import { PipelineFlowStack } from "./pipeline-flow";
import { ClusterFlowStack } from "./cluster-flow";


export interface APIProps {
    /**
     * Step Functions State Machine ARN for CloudFormation deployment Flow
     *
     * @default - None.
     */
    readonly cfnFlowSMArn: string


    /**
     * Cognito User Pool for Authentication of APIs
     *
     * @default - None.
     */
    readonly userPoolId: string,


    /**
     * Cognito User Pool Client for Authentication of APIs
     *
     * @default - None.
     */
    readonly userPoolClientId: string


    /**
     * Default Logging Bucket Name
     *
     * @default - None.
     */
    readonly defaultLoggingBucket: string

    /**
     * VPC
     * 
     */
    vpc: IVpc

    /**
     * Default Subnet Ids (Private)
     * 
     */
    readonly subnetIds: string[]

    /**
     * Processing SecurityGroup Id
     * 
     */
    readonly processSgId: string

    /**
     * Authentication Type
     * 
     */
    readonly authType: string

    /**
     * OIDC Provider
     *
     */
    readonly oidcProvider: string

    /**
     * OIDC Client Id
     *
     */
    readonly oidcClientId: string

}

/**
 * Stack to provision Appsync GraphQL APIs and releted resources.
 */
export class APIStack extends Construct {

    readonly apiEndpoint: string
    readonly graphqlApi: appsync.GraphqlApi
    readonly userPool?: cognito.UserPool
    readonly authDefaultConfig: any
    readonly userPoolClientId: string
    // readonly userPoolApiClient?: cognito.UserPoolClient
    readonly clusterTable: ddb.Table;
    constructor(scope: Construct, id: string, props: APIProps) {
        super(scope, id);

        const solution_id = 'SO8025'

        if (props.authType === AuthType.OIDC) {
            // Open Id Auth Config
            this.authDefaultConfig = {
                authorizationType: appsync.AuthorizationType.OIDC,
                openIdConnectConfig: {
                    oidcProvider: props.oidcProvider,
                    clientId: props.oidcClientId
                }
            }
            // AWSAppSyncPushToCloudWatchLogs managed policy is not available in China regions.
            // Create the policy manually
            const apiLogRole = new iam.Role(this, 'ApiLogRole', {
                assumedBy: new iam.ServicePrincipal('appsync.amazonaws.com'),
            });

            const apiLogPolicy = new iam.Policy(this, 'ApiLogPolicy', {
                statements: [
                    new iam.PolicyStatement({
                        actions: [
                            'logs:CreateLogGroup',
                            'logs:CreateLogStream',
                            'logs:PutLogEvents',
                        ],
                        resources: [
                            '*'
                        ]
                    }),
                ]
            });
            apiLogRole.attachInlinePolicy(apiLogPolicy)

            const cfnApiLogRoley = apiLogPolicy.node.defaultChild as iam.CfnPolicy
            addCfnNagSuppressRules(cfnApiLogRoley, [
                {
                    id: 'W12',
                    reason: 'The managed policy AWSAppSyncPushToCloudWatchLogs needs to use any resources'
                }
            ])
            this.graphqlApi = new appsync.GraphqlApi(this, 'APIs', {

                name: `${Aws.STACK_NAME} - GraphQL APIs`,
                schema: appsync.Schema.fromAsset(path.join(__dirname, '../../graphql/schema.graphql')),
                authorizationConfig: {
                    defaultAuthorization: this.authDefaultConfig,
                    additionalAuthorizationModes: [
                        {
                            authorizationType: appsync.AuthorizationType.IAM
                        }
                    ]
                },
                logConfig: {
                    fieldLogLevel: appsync.FieldLogLevel.ERROR,
                    role: apiLogRole
                },
                xrayEnabled: true
            })
        } else {
            const userPool = cognito.UserPool.fromUserPoolId(this, 'apiUserPool', props.userPoolId)

            this.authDefaultConfig = {
                authorizationType: appsync.AuthorizationType.USER_POOL,
                userPoolConfig: {
                    userPool: userPool,
                    appIdClientRegex: this.userPoolClientId!,
                    defaultAction: appsync.UserPoolDefaultAction.ALLOW
                }
            }

            // Create an Appsync GraphQL API
            this.graphqlApi = new appsync.GraphqlApi(this, 'APIs', {

                name: `${Aws.STACK_NAME} - GraphQL APIs`,
                schema: appsync.Schema.fromAsset(path.join(__dirname, '../../graphql/schema.graphql')),
                authorizationConfig: {
                    defaultAuthorization: this.authDefaultConfig,
                    additionalAuthorizationModes: [
                        {
                            authorizationType: appsync.AuthorizationType.IAM
                        }
                    ]
                },
                logConfig: {
                    fieldLogLevel: appsync.FieldLogLevel.ERROR,
                },
                xrayEnabled: true
            })

        }

        // This Lambda is to create the AppSync Service Linked Role
        const appSyncServiceLinkRoleFn = new lambda.Function(this, 'AppSyncServiceLinkRoleFn', {
            runtime: lambda.Runtime.PYTHON_3_9,
            code: lambda.Code.fromAsset(path.join(__dirname, '../../lambda/custom-resource')),
            handler: 'crete_service_linked_role.lambda_handler',
            timeout: Duration.seconds(60),
            memorySize: 128,
            description: 'Log Hub - Service Linked Role Create Handler'
        });

        // Grant IAM Policy to the appSyncServiceLinkRoleFn lambda
        const iamPolicy = new iam.PolicyStatement({
            actions: [
                "iam:GetRole",
                "iam:CreateServiceLinkedRole"
            ],
            effect: iam.Effect.ALLOW,
            resources: ['*']
        })
        appSyncServiceLinkRoleFn.addToRolePolicy(iamPolicy)

        const appSyncServiceLinkRoleFnProvider = new cr.Provider(this, 'appSyncServiceLinkRoleFnProvider', {
            onEventHandler: appSyncServiceLinkRoleFn,
        });

        appSyncServiceLinkRoleFnProvider.node.addDependency(appSyncServiceLinkRoleFn)

        const appSyncServiceLinkRoleFnTrigger = new CustomResource(this, 'appSyncServiceLinkRoleFnTrigger', {
            serviceToken: appSyncServiceLinkRoleFnProvider.serviceToken,
        });

        appSyncServiceLinkRoleFnTrigger.node.addDependency(appSyncServiceLinkRoleFnProvider)
        this.graphqlApi.node.addDependency(appSyncServiceLinkRoleFnTrigger);

        // Create a table to store imported domain
        this.clusterTable = new ddb.Table(this, 'ClusterTable', {
            partitionKey: {
                name: 'id',
                type: ddb.AttributeType.STRING
            },
            billingMode: ddb.BillingMode.PROVISIONED,
            removalPolicy: RemovalPolicy.DESTROY,
            encryption: ddb.TableEncryption.DEFAULT,
            pointInTimeRecovery: true,
        })

        const cfnClusterTable = this.clusterTable.node.defaultChild as ddb.CfnTable;
        cfnClusterTable.overrideLogicalId('ClusterTable')
        addCfnNagSuppressRules(cfnClusterTable, [
            {
                id: 'W73',
                reason: 'This table has billing mode as PROVISIONED'
            },
            {
                id: 'W74',
                reason: 'This table is set to use DEFAULT encryption, the key is owned by DDB.'
            },
        ])

        // Create a Step Functions to orchestrate cluster flow
        const clusterFlow = new ClusterFlowStack(this, 'ClusterFlowSM', {
            tableArn: this.clusterTable.tableArn,
            cfnFlowSMArn: props.cfnFlowSMArn
        })

        // Create a lambda layer with required python packages.
        const clusterLayer = new lambda.LayerVersion(this, 'ClusterLayer', {
            code: lambda.Code.fromAsset(path.join(__dirname, '../../lambda/api/cluster'), {
                bundling: {
                    image: lambda.Runtime.PYTHON_3_9.bundlingImage,
                    command: [
                        'bash', '-c',
                        'pip install -r requirements.txt -t /asset-output/python'
                    ],
                },
            }),
            compatibleRuntimes: [lambda.Runtime.PYTHON_3_9],
            description: `${Aws.STACK_NAME} - Lambda layer for OpenSearch Cluster`,
        });

        // Create a lambda to handle all cluster related APIs.
        const clusterHandler = new lambda.Function(this, 'ClusterHandler', {
            code: lambda.AssetCode.fromAsset(path.join(__dirname, '../../lambda/api/cluster')),
            runtime: lambda.Runtime.PYTHON_3_9,
            handler: 'lambda_function.lambda_handler',
            timeout: Duration.seconds(60),
            memorySize: 1024,
            layers: [clusterLayer],
            environment: {
                PARTITION: Aws.PARTITION,
                CLUSTER_TABLE: this.clusterTable.tableName,
                STATE_MACHINE_ARN: clusterFlow.stateMachineArn,
                SOLUTION_ID: solution_id,
                SOLUTION_VERSION: process.env.VERSION ? process.env.VERSION : 'v1.0.0',
                DEFAULT_VPC_ID: props.vpc.vpcId,
                DEFAULT_SG_ID: props.processSgId,
                DEFAULT_PRIVATE_SUBNET_IDS: Fn.join(',', props.subnetIds),
            },
            description: 'Log Hub - Cluster APIs Resolver',
        })

        // Grant permissions to the cluster lambda
        this.clusterTable.grantReadWriteData(clusterHandler)
        const clusterHandlerPolicy = new iam.Policy(this, 'ClusterHandlerPolicy', {
            statements: [
                new iam.PolicyStatement({
                    effect: iam.Effect.ALLOW,
                    resources: ['*'],
                    actions: [
                        'es:ListDomainNames',
                        'es:DescribeElasticsearchDomain',
                        'es:UpdateElasticsearchDomainConfig',
                    ]
                }),
                new iam.PolicyStatement({
                    effect: iam.Effect.ALLOW,
                    resources: ['*'],
                    actions: [
                        'cloudwatch:GetMetricData',
                    ]
                }),
                new iam.PolicyStatement({
                    effect: iam.Effect.ALLOW,
                    resources: ['*'],
                    actions: [
                        'cognito-idp:DescribeUserPool',
                    ]
                }),
                new iam.PolicyStatement({
                    effect: iam.Effect.ALLOW,
                    resources: [clusterFlow.stateMachineArn],
                    actions: [
                        'states:StartExecution'
                    ]
                }),
                new iam.PolicyStatement({
                    effect: iam.Effect.ALLOW,
                    resources: [
                        `arn:${Aws.PARTITION}:ec2:*:${Aws.ACCOUNT_ID}:route-table/*`,
                        `arn:${Aws.PARTITION}:ec2:*:${Aws.ACCOUNT_ID}:network-acl/*`,
                        `arn:${Aws.PARTITION}:ec2:*:${Aws.ACCOUNT_ID}:vpc/*`,
                        `arn:${Aws.PARTITION}:ec2:*:${Aws.ACCOUNT_ID}:security-group/*`,
                        `arn:${Aws.PARTITION}:ec2:*:${Aws.ACCOUNT_ID}:vpc-peering-connection/*`
                    ],
                    actions: [
                        'ec2:AuthorizeSecurityGroupIngress',
                        'ec2:AcceptVpcPeeringConnection',
                        'ec2:CreateRoute',
                        'ec2:CreateVpcPeeringConnection',
                        'ec2:CreateNetworkAclEntry',
                        'ec2:CreateTags'
                    ]
                }),
                new iam.PolicyStatement({
                    effect: iam.Effect.ALLOW,
                    resources: [
                        '*'
                    ],
                    actions: [
                        'ec2:DescribeSecurityGroupRules',
                        'ec2:DescribeVpcs',
                        'ec2:DescribeVpcPeeringConnections',
                        'ec2:DescribeSubnets',
                        'ec2:DescribeNetworkAcls',
                        'ec2:DescribeRouteTables'
                    ]
                }),
            ]
        })

        // Create a lambda to handle all cluster related APIs.
        clusterHandler.role!.attachInlinePolicy(clusterHandlerPolicy)
        addCfnNagSuppressRules(clusterHandlerPolicy.node.defaultChild as iam.CfnPolicy, [
            {
                id: 'W12',
                reason: 'This policy needs to be able to have access to all resources'
            }
        ])



        // Add cluster lambda as a Datasource
        const clusterLambdaDS = this.graphqlApi.addLambdaDataSource('ClusterAPILambdaDS', clusterHandler, {
            description: 'Lambda Resolver Datasource'
        });

        // Set resolver for related cluster API methods
        clusterLambdaDS.createResolver({
            typeName: 'Query',
            fieldName: 'listDomainNames',
            requestMappingTemplate: appsync.MappingTemplate.lambdaRequest(),
            responseMappingTemplate: appsync.MappingTemplate.lambdaResult()
        })

        clusterLambdaDS.createResolver({
            typeName: 'Query',
            fieldName: 'listImportedDomains',
            requestMappingTemplate: appsync.MappingTemplate.lambdaRequest(),
            responseMappingTemplate: appsync.MappingTemplate.lambdaResult()
        })

        clusterLambdaDS.createResolver({
            typeName: 'Query',
            fieldName: 'getDomainDetails',
            requestMappingTemplate: appsync.MappingTemplate.lambdaRequest(),
            responseMappingTemplate: appsync.MappingTemplate.lambdaResult()
        })

        clusterLambdaDS.createResolver({
            typeName: 'Query',
            fieldName: 'getDomainVpc',
            requestMappingTemplate: appsync.MappingTemplate.lambdaRequest(),
            responseMappingTemplate: appsync.MappingTemplate.lambdaResult()
        })

        clusterLambdaDS.createResolver({
            typeName: 'Mutation',
            fieldName: 'importDomain',
            requestMappingTemplate: appsync.MappingTemplate.lambdaRequest(),
            responseMappingTemplate: appsync.MappingTemplate.lambdaResult()
        })

        clusterLambdaDS.createResolver({
            typeName: 'Mutation',
            fieldName: 'removeDomain',
            requestMappingTemplate: appsync.MappingTemplate.lambdaRequest(),
            responseMappingTemplate: appsync.MappingTemplate.lambdaResult()
        })

        clusterLambdaDS.createResolver({
            typeName: 'Mutation',
            fieldName: 'createProxyForOpenSearch',
            requestMappingTemplate: appsync.MappingTemplate.lambdaRequest(),
            responseMappingTemplate: appsync.MappingTemplate.lambdaResult()
        })

        clusterLambdaDS.createResolver({
            typeName: 'Mutation',
            fieldName: 'deleteProxyForOpenSearch',
            requestMappingTemplate: appsync.MappingTemplate.lambdaRequest(),
            responseMappingTemplate: appsync.MappingTemplate.lambdaResult()
        })

        clusterLambdaDS.createResolver({
            typeName: 'Mutation',
            fieldName: 'createAlarmForOpenSearch',
            requestMappingTemplate: appsync.MappingTemplate.lambdaRequest(),
            responseMappingTemplate: appsync.MappingTemplate.lambdaResult()
        })

        clusterLambdaDS.createResolver({
            typeName: 'Mutation',
            fieldName: 'deleteAlarmForOpenSearch',
            requestMappingTemplate: appsync.MappingTemplate.lambdaRequest(),
            responseMappingTemplate: appsync.MappingTemplate.lambdaResult()
        })

        // Set resolver for CIDR validation API methods
        clusterLambdaDS.createResolver({
            typeName: 'Query',
            fieldName: 'validateVpcCidr',
            requestMappingTemplate: appsync.MappingTemplate.lambdaRequest(),
            responseMappingTemplate: appsync.MappingTemplate.lambdaResult()
        })
        


        // Create a table to store logging pipeline info
        const pipelineTable = new ddb.Table(this, 'PipelineTable', {
            partitionKey: {
                name: 'id',
                type: ddb.AttributeType.STRING
            },
            billingMode: ddb.BillingMode.PROVISIONED,
            removalPolicy: RemovalPolicy.DESTROY,
            encryption: ddb.TableEncryption.DEFAULT,
            pointInTimeRecovery: true,
        })

        const cfnPipelineTable = pipelineTable.node.defaultChild as ddb.CfnTable;
        cfnPipelineTable.overrideLogicalId('PipelineTable')
        addCfnNagSuppressRules(cfnPipelineTable, [
            {
                id: 'W73',
                reason: 'This table has billing mode as PROVISIONED'
            },
            {
                id: 'W74',
                reason: 'This table is set to use DEFAULT encryption, the key is owned by DDB.'
            },
        ])

        // Create a Step Functions to orchestrate pipeline flow
        const pipeFlow = new PipelineFlowStack(this, 'PipelineFlowSM', {
            tableArn: pipelineTable.tableArn,
            cfnFlowSMArn: props.cfnFlowSMArn,
        })

        // Create a lambda to handle all pipeline related APIs.
        const pipelineHandler = new lambda.Function(this, 'PipelineHandler', {
            code: lambda.AssetCode.fromAsset(path.join(__dirname, '../../lambda/api/pipeline')),
            runtime: lambda.Runtime.PYTHON_3_9,
            handler: 'lambda_function.lambda_handler',
            timeout: Duration.seconds(60),
            memorySize: 1024,
            environment: {
                STATE_MACHINE_ARN: pipeFlow.stateMachineArn,
                PIPELINE_TABLE: pipelineTable.tableName,
                SOLUTION_ID: solution_id,
                SOLUTION_VERSION: process.env.VERSION ? process.env.VERSION : 'v1.0.0',
            },
            description: 'Log Hub - Pipeline APIs Resolver',
        })

        // Grant permissions to the pipeline lambda
        pipelineTable.grantReadWriteData(pipelineHandler)
        pipelineHandler.addToRolePolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            resources: [pipeFlow.stateMachineArn],
            actions: [
                'states:StartExecution'
            ]
        }))

        // Add pipeline table as a Datasource
        const pipeDynamoDS = this.graphqlApi.addDynamoDbDataSource('PipelineDynamoDS', pipelineTable, {
            description: 'DynamoDB Resolver Datasource'
        })

        // Add pipeline lambda as a Datasource
        const pipeLambdaDS = this.graphqlApi.addLambdaDataSource('PipelineLambdaDS', pipelineHandler, {
            description: 'Lambda Resolver Datasource'
        });

        // Set resolver for releted cluster API methods
        pipeLambdaDS.createResolver({
            typeName: 'Query',
            fieldName: 'listServicePipelines',
            requestMappingTemplate: appsync.MappingTemplate.lambdaRequest(),
            responseMappingTemplate: appsync.MappingTemplate.lambdaResult()
        })

        pipeDynamoDS.createResolver({
            typeName: 'Query',
            fieldName: 'getServicePipeline',
            requestMappingTemplate: appsync.MappingTemplate.dynamoDbGetItem('id', 'id'),
            responseMappingTemplate: appsync.MappingTemplate.dynamoDbResultItem()
        })


        pipeLambdaDS.createResolver({
            typeName: 'Mutation',
            fieldName: 'createServicePipeline',
            requestMappingTemplate: appsync.MappingTemplate.lambdaRequest(),
            responseMappingTemplate: appsync.MappingTemplate.lambdaResult()
        })

        pipeLambdaDS.createResolver({
            typeName: 'Mutation',
            fieldName: 'deleteServicePipeline',
            requestMappingTemplate: appsync.MappingTemplate.lambdaRequest(),
            responseMappingTemplate: appsync.MappingTemplate.lambdaResult()
        })

        // Create a lambda to handle all AWS resource related APIs.
        const resourceHandler = new lambda.Function(this, 'ResourceHandler', {
            code: lambda.AssetCode.fromAsset(path.join(__dirname, '../../lambda/api/resource')),
            runtime: lambda.Runtime.PYTHON_3_9,
            handler: 'lambda_function.lambda_handler',
            timeout: Duration.seconds(60),
            memorySize: 1024,
            environment: {
                DEFAULT_LOGGING_BUCKET: props.defaultLoggingBucket,
                SOLUTION_ID: solution_id,
                SOLUTION_VERSION: process.env.VERSION ? process.env.VERSION : 'v1.0.0',
            },
            description: 'Log Hub - Resource APIs Resolver',
        })

        // Grant permissions to the resourceHandler lambda
        const resourceHandlerPolicy = new iam.Policy(this, 'ResourceHandlerPolicy', {
            statements: [
                new iam.PolicyStatement({
                    effect: iam.Effect.ALLOW,
                    resources: ['*'],
                    actions: [
                        's3:ListAllMyBuckets',
                        's3:PutBucketLogging',
                        's3:GetBucketLogging',
                        's3:GetBucketLocation',
                        's3:CreateBucket',
                        's3:ListBucket',
                        's3:PutObject',
                        's3:DeleteAccessPointPolicy',
                        's3:DeleteAccessPointPolicyForObjectLambda',
                        's3:DeleteBucketPolicy',
                        's3:PutAccessPointPolicy',
                        's3:PutAccessPointPolicyForObjectLambda',
                        's3:PutBucketPolicy',
                        's3:PutMultiRegionAccessPointPolicy',
                        's3:GetAccessPointPolicy',
                        's3:GetAccessPointPolicyForObjectLambda',
                        's3:GetAccessPointPolicyStatus',
                        's3:GetAccessPointPolicyStatusForObjectLambda',
                        's3:GetAccountPublicAccessBlock',
                        's3:GetBucketPolicy',
                        's3:GetBucketPolicyStatus',
                        's3:GetMultiRegionAccessPointPolicy',
                        's3:GetMultiRegionAccessPointPolicyStatus',
                    ]
                }),
                new iam.PolicyStatement({
                    effect: iam.Effect.ALLOW,
                    resources: ['*'],
                    actions: [
                        'ec2:DescribeVpcs',
                        'ec2:DescribeSubnets',
                        'ec2:DescribeSecurityGroups',
                        'ec2:DescribeKeyPairs',
                    ]
                }),
                new iam.PolicyStatement({
                    effect: iam.Effect.ALLOW,
                    resources: ['*'],
                    actions: [
                        'acm:ListCertificates',
                        'acm:DescribeCertificate',
                    ]
                }),
                new iam.PolicyStatement({
                    effect: iam.Effect.ALLOW,
                    resources: ['*'],
                    actions: [
                        'cloudtrail:ListTrails',
                        'cloudtrail:GetTrail',
                    ]
                }),
                new iam.PolicyStatement({
                    effect: iam.Effect.ALLOW,
                    resources: ['*'],
                    actions: [
                        'cloudfront:ListDistributions',
                        'cloudfront:GetDistributionConfig',
                        'cloudfront:UpdateDistribution',
                    ]
                }),
                new iam.PolicyStatement({
                    effect: iam.Effect.ALLOW,
                    resources: ['*'],
                    actions: [
                        'lambda:ListFunctions',
                    ]
                }),
                new iam.PolicyStatement({
                    effect: iam.Effect.ALLOW,
                    resources: ['*'],
                    actions: [
                        'rds:DescribeDBInstances',
                        'rds:DescribeDBClusters',
                    ]
                }),
                new iam.PolicyStatement({
                    effect: iam.Effect.ALLOW,
                    resources: ['*'],
                    actions: [
                        'elasticloadbalancing:DescribeLoadBalancers',
                        'elasticloadbalancing:DescribeLoadBalancerAttributes',
                        'elasticloadbalancing:ModifyLoadBalancerAttributes',
                    ]
                }),
                new iam.PolicyStatement({
                    effect: iam.Effect.ALLOW,
                    resources: ['*'],
                    actions: [
                        'wafv2:GetLoggingConfiguration',
                        'wafv2:ListWebACLs',
                        'wafv2:PutLoggingConfiguration',
                    ]
                }),
                new iam.PolicyStatement({
                    effect: iam.Effect.ALLOW,
                    resources: ['*'],
                    actions: [
                        'logs:GetLogEvents',
                        'logs:PutLogEvents',
                        'logs:CreateLogDelivery',
                        'logs:PutResourcePolicy',
                        'logs:DescribeResourcePolicies',
                    ]
                }),
            ]
        })

        resourceHandler.role!.attachInlinePolicy(resourceHandlerPolicy)
        addCfnNagSuppressRules(resourceHandlerPolicy.node.defaultChild as iam.CfnPolicy, [
            {
                id: 'W12',
                reason: 'This policy needs to be able to execute step functions flow'
            }
        ])

        // Add pipeline lambda as a Datasource
        const resourceLambdaDS = this.graphqlApi.addLambdaDataSource('ResourceLambdaDS', resourceHandler, {
            description: 'Lambda Resolver Datasource'
        });

        // Set resolver for releted resource API methods
        resourceLambdaDS.createResolver({
            typeName: 'Query',
            fieldName: 'listResources',
            requestMappingTemplate: appsync.MappingTemplate.lambdaRequest(),
            responseMappingTemplate: appsync.MappingTemplate.lambdaResult()
        })

        resourceLambdaDS.createResolver({
            typeName: 'Query',
            fieldName: 'getResourceLoggingBucket',
            requestMappingTemplate: appsync.MappingTemplate.lambdaRequest(),
            responseMappingTemplate: appsync.MappingTemplate.lambdaResult()
        })

        resourceLambdaDS.createResolver({
            typeName: 'Mutation',
            fieldName: 'putResourceLoggingBucket',
            requestMappingTemplate: appsync.MappingTemplate.lambdaRequest(),
            responseMappingTemplate: appsync.MappingTemplate.lambdaResult()
        })

        new CfnOutput(this, "GraphQLAPIEndpoint", {
            description: "GraphQL API Endpoint (back-end)",
            value: this.graphqlApi.graphqlUrl,
        }).overrideLogicalId("GraphQLAPIEndpoint");

        this.apiEndpoint = this.graphqlApi.graphqlUrl

    }
}
