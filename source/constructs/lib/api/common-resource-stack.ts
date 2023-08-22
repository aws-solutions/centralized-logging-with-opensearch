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
import * as path from 'path';
import * as appsync from '@aws-cdk/aws-appsync-alpha';
import {
    Aws,
    Duration,
    aws_dynamodb as ddb,
    aws_iam as iam,
    aws_lambda as lambda,
} from 'aws-cdk-lib';
import { Construct } from 'constructs';

import { SharedPythonLayer } from '../layer/layer';
import { addCfnNagSuppressRules } from '../main-stack';

export interface CommonResourceStackProps {
    /**
     * Default Appsync GraphQL API for OpenSearch REST API Handler
     *
     * @default - None.
     */
    readonly graphqlApi: appsync.GraphqlApi;

    readonly centralAssumeRolePolicy: iam.ManagedPolicy;
    readonly defaultLoggingBucketName: string;

    readonly subAccountLinkTable: ddb.Table;

    readonly solutionId: string;
    readonly stackPrefix: string;
}
export class CommonResourceStack extends Construct {
    constructor(scope: Construct, id: string, props: CommonResourceStackProps) {
        super(scope, id);

        // Create a lambda to handle all AWS resource related APIs.
        const resourceHandler = new lambda.Function(this, 'ResourceHandler', {
            code: lambda.AssetCode.fromAsset(
                path.join(__dirname, '../../lambda/api/resource')
            ),
            runtime: lambda.Runtime.PYTHON_3_9,
            handler: 'lambda_function.lambda_handler',
            timeout: Duration.seconds(60),
            memorySize: 1024,
            layers: [SharedPythonLayer.getInstance(this)],
            environment: {
                DEFAULT_LOGGING_BUCKET: props.defaultLoggingBucketName,
                SOLUTION_VERSION: process.env.VERSION || 'v1.0.0',
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
            'ResourceHandlerPolicy',
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
                            'iam:GetRole',
                            'iam:CreateRole',
                            'iam:PassRole',
                            'iam:PutRolePolicy',
                        ],
                    }),
                    new iam.PolicyStatement({
                        effect: iam.Effect.ALLOW,
                        resources: [
                            `arn:${Aws.PARTITION}:iam::${Aws.ACCOUNT_ID}:role/aws-service-role/wafv2.amazonaws.com/AWSServiceRoleForWAFV2Logging`,
                        ],
                        actions: ['iam:CreateServiceLinkedRole'],
                    }),
                    new iam.PolicyStatement({
                        effect: iam.Effect.ALLOW,
                        resources: ['*'],
                        actions: [
                            'firehose:CreateDeliveryStream',
                            'firehose:DescribeDeliveryStream',
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
                            's3:PutBucketAcl',
                            's3:PutBucketOwnershipControls',
                            's3:GetAccessPointPolicy',
                            's3:GetAccessPointPolicyForObjectLambda',
                            's3:GetAccessPointPolicyStatus',
                            's3:GetAccessPointPolicyStatusForObjectLambda',
                            's3:GetAccountPublicAccessBlock',
                            's3:GetBucketPolicy',
                            's3:GetBucketPolicyStatus',
                            's3:GetMultiRegionAccessPointPolicy',
                            's3:GetMultiRegionAccessPointPolicyStatus',
                            'ec2:CreateTags',
                            'ec2:DescribeTags',
                            'ec2:CreateFlowLogs',
                            'ec2:DescribeFlowLogs',
                            'ec2:DescribeVpcs',
                            'ec2:DescribeSubnets',
                            'ec2:DescribeSecurityGroups',
                            'ec2:DescribeKeyPairs',
                            'acm:ListCertificates',
                            'acm:DescribeCertificate',
                            'cloudtrail:ListTrails',
                            'cloudtrail:GetTrail',
                            'cloudtrail:UpdateTrail',
                            'cloudfront:ListDistributions',
                            'cloudfront:GetDistributionConfig',
                            'cloudfront:UpdateDistribution',
                            'cloudfront:GetDistributionConfig',
                            'cloudfront:GetRealtimeLogConfig',
                            'lambda:ListFunctions',
                            'rds:DescribeDBInstances',
                            'rds:DescribeDBClusters',
                            'elasticloadbalancing:DescribeLoadBalancers',
                            'elasticloadbalancing:DescribeLoadBalancerAttributes',
                            'elasticloadbalancing:ModifyLoadBalancerAttributes',
                            'wafv2:GetLoggingConfiguration',
                            'wafv2:ListWebACLs',
                            'wafv2:PutLoggingConfiguration',
                            'wafv2:GetWebACL',
                            'config:DescribeDeliveryChannels',
                            'logs:GetLogEvents',
                            'logs:PutLogEvents',
                            'logs:CreateLogDelivery',
                            'logs:PutResourcePolicy',
                            'logs:DescribeResourcePolicies',
                            'eks:ListClusters',
                            'autoscaling:DescribeAutoScalingGroups',
                            'sns:ListTopics',
                        ],
                    }),
                ],
            }
        );

        resourceHandler.role!.attachInlinePolicy(resourceHandlerPolicy);
        props.centralAssumeRolePolicy.attachToRole(resourceHandler.role!);
        addCfnNagSuppressRules(
            resourceHandlerPolicy.node.defaultChild as iam.CfnPolicy,
            [
                {
                    id: 'W12',
                    reason: 'This policy needs to be able to execute step functions flow',
                },
            ]
        );

        // Add resource lambda as a Datasource
        const resourceLambdaDS = props.graphqlApi.addLambdaDataSource(
            'ResourceLambdaDS',
            resourceHandler,
            {
                description: 'Lambda Resolver Datasource',
            }
        );

        // Set resolver for releted resource API methods
        resourceLambdaDS.createResolver('listResources', {
            typeName: 'Query',
            fieldName: 'listResources',
            requestMappingTemplate: appsync.MappingTemplate.fromFile(
                path.join(__dirname, '../../graphql/vtl/resource/ListResources.vtl')
            ),
            responseMappingTemplate: appsync.MappingTemplate.lambdaResult(),
        });

        resourceLambdaDS.createResolver('getResourceLoggingBucket', {
            typeName: 'Query',
            fieldName: 'getResourceLoggingBucket',
            requestMappingTemplate: appsync.MappingTemplate.fromFile(
                path.join(
                    __dirname,
                    '../../graphql/vtl/resource/GetResourceLoggingBucket.vtl'
                )
            ),
            responseMappingTemplate: appsync.MappingTemplate.lambdaResult(),
        });

        resourceLambdaDS.createResolver('putResourceLoggingBucket', {
            typeName: 'Mutation',
            fieldName: 'putResourceLoggingBucket',
            requestMappingTemplate: appsync.MappingTemplate.fromFile(
                path.join(
                    __dirname,
                    '../../graphql/vtl/resource/PutResourceLoggingBucket.vtl'
                )
            ),
            responseMappingTemplate: appsync.MappingTemplate.lambdaResult(),
        });

        resourceLambdaDS.createResolver('getResourceLogConfigs', {
            typeName: 'Query',
            fieldName: 'getResourceLogConfigs',
            requestMappingTemplate: appsync.MappingTemplate.fromFile(
                path.join(
                    __dirname,
                    '../../graphql/vtl/resource/GetResourceLogConfig.vtl'
                )
            ),
            responseMappingTemplate: appsync.MappingTemplate.lambdaResult(),
        });

        resourceLambdaDS.createResolver('putResourceLogConfig', {
            typeName: 'Mutation',
            fieldName: 'putResourceLogConfig',
            requestMappingTemplate: appsync.MappingTemplate.fromFile(
                path.join(
                    __dirname,
                    '../../graphql/vtl/resource/PutResourceLogConfig.vtl'
                )
            ),
            responseMappingTemplate: appsync.MappingTemplate.lambdaResult(),
        });
    }
}
