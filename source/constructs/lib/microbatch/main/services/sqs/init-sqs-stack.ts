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

import { Construct } from "constructs";
import { Duration, aws_sqs as sqs, aws_iam as iam } from "aws-cdk-lib";
import { NagSuppressions } from "cdk-nag";
import { InitKMSStack } from "../kms/init-kms-stack";

export interface  InitSQSProps {
  readonly solutionId: string;
  readonly microBatchKMSStack: InitKMSStack;
}

export class InitSQSStack extends Construct {
    readonly S3ObjectMigrationDLQ: sqs.Queue;
    readonly S3ObjectMigrationQ: sqs.Queue;
    readonly S3ObjectMergeDLQ: sqs.Queue;
    readonly S3ObjectMergeQ: sqs.Queue;
    
    constructor(scope: Construct, id: string, props: InitSQSProps) {
      super(scope, id);

      let microBatchKMSStack = props.microBatchKMSStack;

      // Create a Dead-letter queue for S3 Object Migration
      this.S3ObjectMigrationDLQ = new sqs.Queue(this, "S3ObjectMigrationDLQ", {
        visibilityTimeout: Duration.minutes(15),
        retentionPeriod: Duration.days(7),
        encryption: sqs.QueueEncryption.KMS,
        encryptionMasterKey: microBatchKMSStack.encryptionKey,
      });

      // Override the logical ID
      const cfnS3ObjectMigrationDLQ = this.S3ObjectMigrationDLQ.node.defaultChild as sqs.CfnQueue;
      cfnS3ObjectMigrationDLQ.overrideLogicalId("S3ObjectMigrationDLQ");

      const S3ObjectMigrationDLQPolicy = new sqs.CfnQueuePolicy(this, "S3ObjectMigrationDLQPolicy", {
        queues: [ this.S3ObjectMigrationDLQ.queueName ],
        policyDocument: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              actions: ["SQS:*"],
              effect: iam.Effect.DENY,
              resources: [this.S3ObjectMigrationDLQ.queueArn],
              conditions: {
                ["Bool"]: {
                  "aws:SecureTransport": "false",
                },
              },
              principals: [new iam.AnyPrincipal()],
            }),
          ],
        }),
      });

      S3ObjectMigrationDLQPolicy.overrideLogicalId("S3ObjectMigrationDLQPolicy");

      NagSuppressions.addResourceSuppressions(this.S3ObjectMigrationDLQ, [
        {
          id: "AwsSolutions-SQS3",
          reason: "SQS: S3ObjectMigrationDLQ is a DLQ.",
        },
      ]);

      // Create a SQS for S3 Object Migration
      this.S3ObjectMigrationQ = new sqs.Queue(this, "S3ObjectMigrationQ", {
        visibilityTimeout: Duration.minutes(15),
        retentionPeriod: Duration.days(7),
        deadLetterQueue: {
          queue: this.S3ObjectMigrationDLQ,
          maxReceiveCount: 3,
        },
        encryption: sqs.QueueEncryption.KMS,
        encryptionMasterKey: microBatchKMSStack.encryptionKey,
      });

      // Override the logical ID
      const cfnS3ObjectMigrationQ = this.S3ObjectMigrationQ.node.defaultChild as sqs.CfnQueue;
      cfnS3ObjectMigrationQ.overrideLogicalId("S3ObjectMigrationQ");

      const S3ObjectMigrationQPolicy = new sqs.CfnQueuePolicy(this, "S3ObjectMigrationQPolicy", {
        queues: [ this.S3ObjectMigrationQ.queueName ],
        policyDocument: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              actions: ["SQS:*"],
              effect: iam.Effect.DENY,
              resources: [this.S3ObjectMigrationQ.queueArn],
              conditions: {
                ["Bool"]: {
                  "aws:SecureTransport": "false",
                },
              },
              principals: [new iam.AnyPrincipal()],
            }),
          ],
        }),
      });

      S3ObjectMigrationQPolicy.overrideLogicalId("S3ObjectMigrationQPolicy");

      // Create a Dead-letter queue for S3 Object Merge
      this.S3ObjectMergeDLQ = new sqs.Queue(this, "S3ObjectMergeDLQ", {
        visibilityTimeout: Duration.minutes(15),
        retentionPeriod: Duration.days(7),
        encryption: sqs.QueueEncryption.KMS,
        encryptionMasterKey: microBatchKMSStack.encryptionKey,
      });

      // Override the logical ID
      const cfnS3ObjectMergeDLQ = this.S3ObjectMergeDLQ.node.defaultChild as sqs.CfnQueue;
      cfnS3ObjectMergeDLQ.overrideLogicalId("S3ObjectMergeDLQ");

      const S3ObjectMergeDLQPolicy = new sqs.CfnQueuePolicy(this, "S3ObjectMergeDLQPolicy", {
        queues: [ this.S3ObjectMergeDLQ.queueName ],
        policyDocument: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              actions: ["SQS:*"],
              effect: iam.Effect.DENY,
              resources: [this.S3ObjectMergeDLQ.queueArn],
              conditions: {
                ["Bool"]: {
                  "aws:SecureTransport": "false",
                },
              },
              principals: [new iam.AnyPrincipal()],
            }),
          ],
        }),
      });

      S3ObjectMergeDLQPolicy.overrideLogicalId("S3ObjectMergeDLQPolicy");

      NagSuppressions.addResourceSuppressions(this.S3ObjectMergeDLQ, [
        {
          id: "AwsSolutions-SQS3",
          reason: "SQS: S3ObjectMigrationDLQ is a DLQ.",
        },
      ]);

      // Create a SQS for S3 Object Merge
      this.S3ObjectMergeQ = new sqs.Queue(this, "S3ObjectMergeQ", {
        visibilityTimeout: Duration.minutes(15),
        retentionPeriod: Duration.days(7),
        deadLetterQueue: {
          queue: this.S3ObjectMigrationDLQ,
          maxReceiveCount: 3,
        },
        encryption: sqs.QueueEncryption.KMS,
        encryptionMasterKey: microBatchKMSStack.encryptionKey,
      });

      // Override the logical ID
      const cfnS3ObjectMergeQ = this.S3ObjectMergeQ.node.defaultChild as sqs.CfnQueue;
      cfnS3ObjectMergeQ.overrideLogicalId("S3ObjectMergeQ");

      const S3ObjectMergeQPolicy = new sqs.CfnQueuePolicy(this, "S3ObjectMergeQPolicy", {
        queues: [ this.S3ObjectMergeQ.queueName ],
        policyDocument: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              actions: ["SQS:*"],
              effect: iam.Effect.DENY,
              resources: [this.S3ObjectMergeQ.queueArn],
              conditions: {
                ["Bool"]: {
                  "aws:SecureTransport": "false",
                },
              },
              principals: [new iam.AnyPrincipal()],
            }),
          ],
        }),
      });

      S3ObjectMergeQPolicy.overrideLogicalId("S3ObjectMergeQPolicy");

    }
}