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


import { CfnResource, Construct, Fn, Aws, Duration, CustomResource } from '@aws-cdk/core';
import { StreamEncryption, Stream } from "@aws-cdk/aws-kinesis";
import { KinesisEventSource } from "@aws-cdk/aws-lambda-event-sources";

import * as ec2 from '@aws-cdk/aws-ec2';
import * as iam from '@aws-cdk/aws-iam';
import * as s3 from '@aws-cdk/aws-s3';
import * as lambda from '@aws-cdk/aws-lambda';
import * as cr from '@aws-cdk/custom-resources';

import fs = require('fs');
import * as path from 'path';

/**
 * cfn-nag suppression rule interface
 */
interface CfnNagSuppressRule {
    readonly id: string;
    readonly reason: string;
}

export function addCfnNagSuppressRules(resource: CfnResource, rules: CfnNagSuppressRule[]) {
    resource.addMetadata('cfn_nag', {
        rules_to_suppress: rules
    });
}

export interface CWtoOpenSearchStackProps {
    readonly vpcId: string,
    readonly subnetIds: string[],
    readonly securityGroupId: string,
    readonly endpoint: string,
    readonly domainName: string,
    readonly logType: string,
    readonly failedLogBucket: string,
    readonly createDashboard: string,
    readonly indexPrefix: string,
    readonly engineType: string,
    readonly kdsShardNumber: number,
    readonly kdsRetentionHours: number,
    readonly logGroupNames: string,
}

export class CWtoOpenSearchStack extends Construct {

    constructor(scope: Construct, id: string, props: CWtoOpenSearchStackProps) {
        super(scope, id);

        // Get the VPC where ElasticSearch deploy
        const esVpc = ec2.Vpc.fromVpcAttributes(this, 'ESVpc', {
            vpcId: props.vpcId,
            availabilityZones: Fn.getAzs(),
            privateSubnetIds: props.subnetIds
        });

        const securityGroup = ec2.SecurityGroup.fromSecurityGroupId(this, "OpenSearchAccessSG", props.securityGroupId);

        // Create the Kinesis Data Stream
        const cwDataStream = new Stream(this, "cwDataStream", {
            shardCount: props.kdsShardNumber,
            retentionPeriod: Duration.hours(props.kdsRetentionHours),
            encryption: StreamEncryption.MANAGED,
        });

        // Create the policy and role for helper Lambda
        const helperLambdaPolicy = new iam.Policy(this, 'HelperLambdaPolicy', {
            policyName: `${Aws.STACK_NAME}-helperLambdaPolicy`,
            statements: [
                new iam.PolicyStatement({
                    actions: [
                        "logs:CreateLogGroup",
                        "logs:CreateLogStream",
                        "logs:PutLogEvents",
                    ],
                    resources: [
                        `arn:${Aws.PARTITION}:logs:${Aws.REGION}:${Aws.ACCOUNT_ID}:*`,
                    ]
                }),
                new iam.PolicyStatement({
                    actions: [
                        "ec2:CreateNetworkInterface",
                        "ec2:DescribeNetworkInterfaces",
                        "ec2:DeleteNetworkInterface",
                        "ec2:AssignPrivateIpAddresses",
                        "ec2:UnassignPrivateIpAddresses",
                    ],
                    resources: [
                        "*",
                    ]
                }),
                new iam.PolicyStatement({
                    actions: [
                        "es:ESHttpGet",
                        "es:ESHttpDelete",
                        "es:ESHttpPut",
                        "es:ESHttpPost",
                        "es:ESHttpHead",
                        "es:ESHttpPatch",
                        "es:UpdateElasticsearchDomainConfig"
                    ],
                    resources: [
                        `arn:${Aws.PARTITION}:es:${Aws.REGION}:${Aws.ACCOUNT_ID}:*`,
                    ]
                }),
            ]
        });
        const cfnhelperLambdaPolicy = helperLambdaPolicy.node.defaultChild as iam.CfnPolicy
        addCfnNagSuppressRules(cfnhelperLambdaPolicy, [
            {
                id: "W12",
                reason: "wildcard resource is used for accessment of the ENI in that VPC",
            },
        ])
        const helperLambdaRole = new iam.Role(this, 'AESControllerLambdaRole', {
            assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
        });
        helperLambdaPolicy.attachToRole(helperLambdaRole);

        // Create the policy and role for transform Lambda
        const senderLambdaPolicy = new iam.Policy(this, 'SenderLambdaPolicy', {
            policyName: `${Aws.STACK_NAME}-senderLambdaPolicy`,
            statements: [
                new iam.PolicyStatement({
                    actions: [
                        "logs:CreateLogGroup",
                        "logs:CreateLogStream",
                        "logs:PutLogEvents",
                    ],
                    resources: [
                        `arn:${Aws.PARTITION}:logs:${Aws.REGION}:${Aws.ACCOUNT_ID}:*`,
                    ]
                }),
                // If this Lambda function is going to access resoures in a
                // VPC, then it needs privileges to access an ENI in that VPC
                new iam.PolicyStatement({
                    actions: [
                        "ec2:CreateNetworkInterface",
                        "ec2:DescribeNetworkInterfaces",
                        "ec2:DeleteNetworkInterface",
                        "ec2:AssignPrivateIpAddresses",
                        "ec2:UnassignPrivateIpAddresses",
                    ],
                    resources: [
                        "*",
                    ]
                }),
                new iam.PolicyStatement({
                    actions: [
                        "es:ESHttpGet",
                        "es:ESHttpDelete",
                        "es:ESHttpPut",
                        "es:ESHttpPost",
                        "es:ESHttpHead",
                        "es:ESHttpPatch"
                    ],
                    resources: [
                        `arn:${Aws.PARTITION}:es:${Aws.REGION}:${Aws.ACCOUNT_ID}:*`,
                    ]
                }),
            ]
        });
        const cfnSenderLambdaPolicy = senderLambdaPolicy.node.defaultChild as iam.CfnPolicy
        addCfnNagSuppressRules(cfnSenderLambdaPolicy, [
            {
                id: "W12",
                reason: "wildcard resource is used for accessment of the ENI in that VPC",
            },
        ])
        const senderLambdaRole = new iam.Role(this, 'SenderLambdaRole', {
            assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
        });
        senderLambdaPolicy.attachToRole(senderLambdaRole);

        // Create the Backendrole Insert Lambda
        const layerVersion = new lambda.LayerVersion(this, "LayerVersion", {
            code: lambda.Code.fromAsset(path.join(__dirname, '../../../lambda/pipeline/common/openSearchHelper/layer/'), {
                bundling: {
                    image: lambda.Runtime.PYTHON_3_9.bundlingImage,
                    command: ['bash', '-c', `pip install -r requirements.txt -t /asset-output/python && cp -au . /asset-output/python`],
                }

            }),
        });

        const openSearchHelperFn = new lambda.Function(this, 'OpenSearchHelperFn', {
            description: `${Aws.STACK_NAME} - Helper function for OpenSearch`,
            handler: 'insertBackendRole.lambda_handler',
            runtime: lambda.Runtime.PYTHON_3_9,
            layers: [layerVersion],
            code: lambda.Code.fromAsset(path.join(__dirname, '../../../lambda/pipeline/common/openSearchHelper/')),
            memorySize: 256,
            timeout: Duration.seconds(60),
            vpc: esVpc,
            vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_NAT },
            role: helperLambdaRole,
            securityGroups: [securityGroup],
            environment: {
                ENDPOINT: props.endpoint,
                DOMAIN_NAME: props.domainName,
                ROLE_ARN: helperLambdaRole.roleArn,
                SENDER_ROLE_ARN: senderLambdaRole.roleArn,
                CREATE_DASHBOARD: props.createDashboard,
                LOG_TYPE: props.logType,
                INDEX_PREFIX: props.indexPrefix,
                ENGINE_TYPE: props.engineType,
                VERSION: process.env.VERSION || 'v1.0.0',
            }
        });
        openSearchHelperFn.node.addDependency(helperLambdaRole, helperLambdaPolicy, senderLambdaRole, securityGroup);

        // Create the customer resource to invoke the openSearchHelperFn lambda when create and update
        const lambdaTrigger = new cr.AwsCustomResource(this, 'LambdaTrigger', {
            policy: cr.AwsCustomResourcePolicy.fromStatements([new iam.PolicyStatement({
                actions: ['lambda:InvokeFunction'],
                effect: iam.Effect.ALLOW,
                resources: [openSearchHelperFn.functionArn]
            })]),
            timeout: Duration.minutes(15),
            onCreate: {
                service: 'Lambda',
                action: 'invoke',
                parameters: {
                    FunctionName: openSearchHelperFn.functionName,
                    InvocationType: 'Event'
                },
                physicalResourceId: cr.PhysicalResourceId.of('lambdaTriggerPhysicalId')
            },
            onUpdate: {
                service: 'Lambda',
                action: 'invoke',
                parameters: {
                    FunctionName: openSearchHelperFn.functionName,
                    InvocationType: 'Event'
                },
                physicalResourceId: cr.PhysicalResourceId.of('lambdaTriggerPhysicalId')
            }
        })
        lambdaTrigger.node.addDependency(openSearchHelperFn)

        // Create the IAM role for CloudWatch Logs destination
        const cwDestinationRole = new iam.Role(this, "CWDestinationRole", {
            assumedBy: new iam.ServicePrincipal("logs.amazonaws.com"),
        });
        const assumeBy = {
            Version: "2012-10-17",
            Statement: [
                {
                    Effect: "Allow",
                    Principal: {
                        Service: "logs.amazonaws.com",
                    },
                    Action: "sts:AssumeRole",
                },
            ],
        };
        (cwDestinationRole.node.defaultChild as iam.CfnRole).addOverride(
            "Properties.AssumeRolePolicyDocument",
            assumeBy
        );

        // Create the IAM Policy for CloudWatch to put record on kinesis data stream
        const cwDestPolicy = new iam.Policy(this, "CWDestPolicy", {
            roles: [cwDestinationRole],
            statements: [
                new iam.PolicyStatement({
                    actions: ["kinesis:PutRecord"],
                    resources: [`${cwDataStream.streamArn}`],
                }),
            ],
        });

        // Create the policy and role for the Lambda to create and delete CloudWatch Log Group Subscription Filter 
        const cwSubFilterLambdaPolicy = new iam.Policy(this, 'cwSubFilterLambdaPolicy', {
            policyName: `${Aws.STACK_NAME}-cwSubFilterLambdaPolicy`,
            statements: [
                new iam.PolicyStatement({
                    actions: [
                        "logs:CreateLogGroup",
                        "logs:CreateLogStream",
                        "logs:PutLogEvents",
                        "logs:PutSubscriptionFilter",
                        "logs:DeleteSubscriptionFilter",
                        "logs:DescribeLogGroups",
                    ],
                    resources: [
                        `arn:${Aws.PARTITION}:logs:${Aws.REGION}:${Aws.ACCOUNT_ID}:*`,
                    ]
                }),
                new iam.PolicyStatement({
                    actions: [
                        "iam:PassRole",
                    ],
                    resources: [
                        `arn:${Aws.PARTITION}:iam::${Aws.ACCOUNT_ID}:role/*`,
                    ]
                }),
            ]
        });
        const cwSubFilterLambdaRole = new iam.Role(this, 'cwSubFilterLambdaRole', {
            assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
        });
        cwSubFilterLambdaPolicy.attachToRole(cwSubFilterLambdaRole);

        // Lambda to create CloudWatch Log Group Subscription Filter 
        const cwSubFilterFn = new lambda.Function(this, 'cwSubFilterFn', {
            description: `${Aws.STACK_NAME} - Create CloudWatch Log Group Subscription Filter`,
            runtime: lambda.Runtime.PYTHON_3_9,
            handler: 'cw_subscription_filter.lambda_handler',
            code: lambda.Code.fromAsset(path.join(__dirname, '../../../lambda/pipeline/common/custom-resource/')),
            memorySize: 256,
            timeout: Duration.seconds(60),
            role: cwSubFilterLambdaRole,
            environment: {
                LOGGROUP_NAMES: props.logGroupNames,
                DESTINATION_ARN: cwDataStream.streamArn,
                ROLE_ARN: cwDestinationRole.roleArn,
                STACK_NAME: Aws.STACK_NAME,
                VERSION: process.env.VERSION || 'v1.0.0',
            }
        })
        cwSubFilterFn.node.addDependency(cwSubFilterLambdaRole, cwSubFilterLambdaPolicy, cwDestinationRole, cwDestPolicy, cwDataStream);

        const cwSubFilterProvider = new cr.Provider(this, 'cwSubFilterProvider', {
            onEventHandler: cwSubFilterFn,
        });

        cwSubFilterProvider.node.addDependency(cwSubFilterFn)

        const cwSubFilterlambdaTrigger = new CustomResource(this, 'cwSubFilterlambdaTrigger', {
            serviceToken: cwSubFilterProvider.serviceToken,
        });

        cwSubFilterlambdaTrigger.node.addDependency(cwSubFilterProvider)

        // Create the Log Sender Lambda
        const logSenderFn = new lambda.Function(this, 'logSenderFn', {
            description: `${Aws.STACK_NAME} - Send Logs to OpenSearch`,
            runtime: lambda.Runtime.NODEJS_14_X,
            handler: 'cwlToOpenSearch/senderSelector/index.handler',
            code: lambda.Code.fromAsset(path.join(__dirname, '../../../lambda/pipeline/')),
            memorySize: 256,
            timeout: Duration.seconds(60),
            vpc: esVpc,
            vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_NAT },
            role: senderLambdaRole,
            securityGroups: [securityGroup],
            environment: {
                ENDPOINT: props.endpoint,
                LOG_TYPE: props.logType,
                LOG_GROUP_NAME: props.logGroupNames,
                INDEX_PREFIX: props.indexPrefix,
                DOMAIN_NAME: props.domainName,
                FAILED_LOG_BUCKET_NAME: props.failedLogBucket,
                VERSION: process.env.VERSION || 'v1.0.0',
            }
        });
        logSenderFn.node.addDependency(senderLambdaRole, cwDataStream, securityGroup, lambdaTrigger, cwSubFilterlambdaTrigger);
        cwDataStream.grantRead(logSenderFn)

        // Add event source for kinesis data stream
        logSenderFn.addEventSource(
            new KinesisEventSource(cwDataStream, {
                batchSize: 100, // default
                startingPosition: lambda.StartingPosition.TRIM_HORIZON,
            })
        );

        // Import the Log Fail Bucket for sqsFailLogHelper Lambda
        const failedLogBucket = s3.Bucket.fromBucketName(this, 'failedLogBucket', props.failedLogBucket);
        failedLogBucket.grantWrite(logSenderFn)

    }
}
