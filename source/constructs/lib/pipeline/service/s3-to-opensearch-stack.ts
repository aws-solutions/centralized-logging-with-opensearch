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


import { Aws, CfnResource, Construct, Duration, RemovalPolicy, CfnCondition, Fn, IConstruct, Aspects, IAspect } from '@aws-cdk/core';

import * as ec2 from '@aws-cdk/aws-ec2';
import { ISecurityGroup, IVpc } from '@aws-cdk/aws-ec2';
import * as iam from '@aws-cdk/aws-iam';
import * as s3 from '@aws-cdk/aws-s3';
import * as s3n from '@aws-cdk/aws-s3-notifications';
import * as lambda from '@aws-cdk/aws-lambda';
import * as sqs from '@aws-cdk/aws-sqs';
import * as eventsources from '@aws-cdk/aws-lambda-event-sources';
import * as kms from '@aws-cdk/aws-kms'

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

export interface S3toOpenSearchStackProps {

    /**
     * Default VPC for OpenSearch REST API Handler
     *
     * @default - None.
     */
    readonly vpc: IVpc

    /**
     * Default Security Group for OpenSearch REST API Handler
     *
     * @default - None.
     */
    readonly securityGroup: ISecurityGroup

    /**
     * OpenSearch Endpoint Url
     *
     * @default - None.
     */
    readonly endpoint: string

    /**
     * OpenSearch or Elasticsearch
     *
     * @default - OpenSearch.
     */
    readonly engineType: string

    /**
     * Log Type
     *
     * @default - None.
     */
    readonly logType: string

    /**
     * Index Prefix
     *
     * @default - None.
     */
    readonly indexPrefix: string

    /**
     * A list of plugins
     *
     * @default - None.
     */
    readonly plugins: string

    readonly logBucketName: string,
    readonly logBucketPrefix: string,
    readonly backupBucketName: string,

    /**
     * Default KMS-CMK Arn
     *
     * @default - None.
     */
    readonly defaultCmkArn?: string,
}

export class S3toOpenSearchStack extends Construct {

    readonly logProcessorRoleArn: string

    private newKMSKey = new kms.Key(this, `SQS-CMK`, {
        removalPolicy: RemovalPolicy.DESTROY,
        pendingWindow: Duration.days(7),
        description: 'KMS-CMK for encrypting the objects in Log Hub SQS',
        enableKeyRotation: true,
        policy: new iam.PolicyDocument({
            statements: [
                new iam.PolicyStatement({
                    actions: [
                        "kms:Create*",
                        "kms:Describe*",
                        "kms:Enable*",
                        "kms:List*",
                        "kms:Put*",
                        "kms:Update*",
                        "kms:Revoke*",
                        "kms:Get*",
                        "kms:ScheduleKeyDeletion",
                        "kms:GenerateDataKey",
                        "kms:TagResource",
                        "kms:UntagResource",
                        "kms:Decrypt",
                        "kms:Encrypt"
                    ],
                    resources: ["*"],
                    effect: iam.Effect.ALLOW,
                    principals: [
                        new iam.AccountRootPrincipal
                    ],
                }),
                new iam.PolicyStatement({
                    actions: [
                        "kms:GenerateDataKey*",
                        "kms:Decrypt",
                        "kms:Encrypt",
                    ],
                    resources: ['*'], // support app log from s3 by not limiting the resource
                    principals: [
                        new iam.ServicePrincipal('s3.amazonaws.com'),
                        new iam.ServicePrincipal('lambda.amazonaws.com'),
                        new iam.ServicePrincipal('ec2.amazonaws.com'),
                        new iam.ServicePrincipal('sqs.amazonaws.com'),
                        new iam.ServicePrincipal('cloudwatch.amazonaws.com'),
                    ],
                }),
            ],
        }),
    })

    constructor(scope: Construct, id: string, props: S3toOpenSearchStackProps) {
        super(scope, id);

        // Get the logBucket
        const logBucket = s3.Bucket.fromBucketName(this, 'logBucket', props.logBucketName);

        const isCreateNewKMS = new CfnCondition(this, "isCreateNew", {
            expression: Fn.conditionEquals(props.defaultCmkArn, ""),
        });
        this.enable({ construct: this.newKMSKey, if: isCreateNewKMS });

        // Create the policy and role for processor Lambda
        const logProcessorPolicy = new iam.Policy(this, 'logProcessorPolicy', {
            statements: [
                new iam.PolicyStatement({
                    actions: [
                        "es:ESHttp*"
                    ],
                    resources: [
                        '*',
                    ]
                }),
                new iam.PolicyStatement({
                    effect: iam.Effect.ALLOW,
                    resources: [
                        Fn.conditionIf(isCreateNewKMS.logicalId, this.newKMSKey.keyArn, props.defaultCmkArn!).toString()
                    ],
                    actions: [
                        "kms:Decrypt",
                        "kms:Encrypt",
                        "kms:ReEncrypt*",
                        "kms:GenerateDataKey*",
                        "kms:DescribeKey"
                    ],
                }),
            ]
        });

        // Create a lambda layer with required python packages.
        // This layer also includes standard log hub plugins.
        const pipeLayer = new lambda.LayerVersion(this, 'LogHubPipeLayer', {
            code: lambda.Code.fromAsset(path.join(__dirname, '../../../lambda/plugin/standard'), {
                bundling: {
                    image: lambda.Runtime.PYTHON_3_9.bundlingImage,
                    command: [
                        'bash', '-c',
                        'pip install -r requirements.txt -t /asset-output/python && cp . -r /asset-output/python/'
                    ],
                },
            }),
            compatibleRuntimes: [lambda.Runtime.PYTHON_3_9],
            description: 'Log Hub Default Lambda layer for Log Pipeline',
        });

        // Create the Log Processor Lambda
        const logProcessorFn = new lambda.Function(this, 'LogProcessorFn', {
            description: `${Aws.STACK_NAME} - Function to process and load ${props.logType} logs into OpenSearch`,
            runtime: lambda.Runtime.PYTHON_3_9,
            handler: 'lambda_function.lambda_handler',
            code: lambda.Code.fromAsset(path.join(__dirname, '../../../lambda/pipeline/service/log-processor')),
            memorySize: 1024,
            timeout: Duration.seconds(900),
            vpc: props.vpc,
            vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_NAT },
            securityGroups: [props.securityGroup],
            environment: {
                ENDPOINT: props.endpoint,
                ENGINE: props.engineType,
                LOG_TYPE: props.logType,
                INDEX_PREFIX: props.indexPrefix,
                LOG_BUCKET_NAME: props.logBucketName,
                BACKUP_BUCKET_NAME: props.backupBucketName,
                SOLUTION_VERSION: process.env.VERSION || 'v1.0.0',
                PLUGINS: props.plugins,
            },
            layers: [pipeLayer]
        });
        logBucket.grantRead(logProcessorFn);
        logProcessorFn.role!.attachInlinePolicy(logProcessorPolicy)

        this.logProcessorRoleArn = logProcessorFn.role!.roleArn


        // Setup SQS and DLQ
        const logEventDLQ = new sqs.Queue(this, 'LogEventDLQ', {
            visibilityTimeout: Duration.minutes(15),
            retentionPeriod: Duration.days(7),
            encryption: sqs.QueueEncryption.KMS_MANAGED,
        })

        const cfnLogEventDLQ = logEventDLQ.node.defaultChild as sqs.CfnQueue;
        cfnLogEventDLQ.overrideLogicalId('LogEventDLQ')

        // Generate the sqsKMSKey from the new generated KMS Key or the default KMS Key
        const sqsKMSKeyArn = Fn.conditionIf(isCreateNewKMS.logicalId, this.newKMSKey.keyArn, props.defaultCmkArn!).toString()
        const sqsKMSKey = kms.Key.fromKeyArn(this, `Final-SQS-CMK-${id}`, sqsKMSKeyArn);

        const logEventQueue = new sqs.Queue(this, 'LogEventQueue', {
            visibilityTimeout: Duration.seconds(910),
            retentionPeriod: Duration.days(14),
            deadLetterQueue: {
                queue: logEventDLQ,
                maxReceiveCount: 30,
            },
            encryption: sqs.QueueEncryption.KMS,
            dataKeyReuse: Duration.minutes(5),
            encryptionMasterKey: sqsKMSKey,
        })

        const cfnLogEventQueue = logEventQueue.node.defaultChild as sqs.CfnQueue;
        cfnLogEventQueue.overrideLogicalId('LogEventQueue')
        addCfnNagSuppressRules(cfnLogEventQueue, [
            {
                id: 'W48',
                reason: 'No need to use encryption'
            }
        ]);

        logProcessorFn.addEventSource(new eventsources.SqsEventSource(logEventQueue, {
            batchSize: 1
        }));

        // Add the S3 event on the log bucket with the target is sqs queue
        logBucket.addEventNotification(s3.EventType.OBJECT_CREATED, new s3n.SqsDestination(logEventQueue), {
            prefix: props.logBucketPrefix
        })

        // Grant access to log processor lambda
        const backupBucket = s3.Bucket.fromBucketName(this, 'backupBucket', props.backupBucketName);
        backupBucket.grantWrite(logProcessorFn)

    }

    protected enable(param: { construct: IConstruct; if: CfnCondition }) {
        Aspects.of(param.construct).add(new InjectCondition(param.if));
      }
}

class InjectCondition implements IAspect {
    public constructor(private condition: CfnCondition) { }
  
    public visit(node: IConstruct): void {
      if (node instanceof CfnResource) {
        node.cfnOptions.condition = this.condition;
      }
    }
  }
  