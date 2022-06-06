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


import { CfnResource, Construct, Aws, Duration, Size, CustomResource } from '@aws-cdk/core';

import * as iam from '@aws-cdk/aws-iam';
import * as s3 from '@aws-cdk/aws-s3';
import * as lambda from '@aws-cdk/aws-lambda';
import * as cr from '@aws-cdk/custom-resources';
import * as destinations from '@aws-cdk/aws-kinesisfirehose-destinations';
import * as firehose from '@aws-cdk/aws-kinesisfirehose';

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


export interface CWtoFirehosetoS3Props {


    /**
     * Log Type
     *
     * @default - None.
     */
    readonly logType?: string

    readonly logGroupNames: string,
    readonly logBucketName: string,
    readonly logBucketPrefix: string,

}

export class CWtoFirehosetoS3Stack extends Construct {

    constructor(scope: Construct, id: string, props: CWtoFirehosetoS3Props) {
        super(scope, id);

        // Get the logBucket
        const logBucket = s3.Bucket.fromBucketName(this, 'logBucket', props.logBucketName);

        // Create the Kinesis Firehose
        const destination = new destinations.S3Bucket(logBucket, {
            dataOutputPrefix: props.logBucketPrefix,
            errorOutputPrefix: 'error/' + props.logBucketPrefix,
            bufferingInterval: Duration.minutes(1),
            bufferingSize: Size.mebibytes(1),
        });
        const logFirehose = new firehose.DeliveryStream(this, 'Delivery Stream', {
            encryption: firehose.StreamEncryption.AWS_OWNED,
            destinations: [destination],
        });

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
                    actions: [
                        "firehose:PutRecord",
                        "firehose:PutRecordBatch"
                    ],
                    resources: [`${logFirehose.deliveryStreamArn}`],
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
                        cwDestinationRole.roleArn,
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
                DESTINATION_ARN: logFirehose.deliveryStreamArn,
                ROLE_ARN: cwDestinationRole.roleArn,
                STACK_NAME: Aws.STACK_NAME,
                VERSION: process.env.VERSION || 'v1.0.0',
            }
        })
        cwSubFilterFn.node.addDependency(cwSubFilterLambdaRole, cwSubFilterLambdaPolicy, cwDestinationRole, cwDestPolicy, logFirehose);

        const cwSubFilterProvider = new cr.Provider(this, 'cwSubFilterProvider', {
            onEventHandler: cwSubFilterFn,
        });

        cwSubFilterProvider.node.addDependency(cwSubFilterFn)

        const cwSubFilterlambdaTrigger = new CustomResource(this, 'cwSubFilterlambdaTrigger', {
            serviceToken: cwSubFilterProvider.serviceToken,
        });

        cwSubFilterlambdaTrigger.node.addDependency(cwSubFilterProvider)

    }
}
