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
import { Aws, Duration, CfnOutput, RemovalPolicy, aws_s3 as s3 } from "aws-cdk-lib";
import { InitKMSStack } from "../kms/init-kms-stack";

export interface  InitS3Props {
  readonly solutionId: string;
  readonly microBatchKMSStack: InitKMSStack;
}

export class InitS3Stack extends Construct {
    readonly StagingBucket: s3.Bucket;

    constructor(scope: Construct, id: string, props: InitS3Props) {
      super(scope, id);

      const microBatchKMSStack = props.microBatchKMSStack;

      // Create a staging bucket
      this.StagingBucket = new s3.Bucket(
        this, "stagingBucket",
        {
          removalPolicy: RemovalPolicy.RETAIN,
          encryption: s3.BucketEncryption.KMS,
          encryptionKey: microBatchKMSStack.encryptionKey,
          blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
          accessControl: s3.BucketAccessControl.BUCKET_OWNER_FULL_CONTROL,
          versioned: true,
          enforceSSL: true,
          objectOwnership: s3.ObjectOwnership.OBJECT_WRITER,
          lifecycleRules: [
            {
              id: 'Intelligent-Tiering',
              enabled: true,
              transitions: [
                {
                  storageClass: s3.StorageClass.INTELLIGENT_TIERING,
                  transitionAfter: Duration.days(0),
                },
              ],
            },
            {
              id: 'NonCurrent-Version-Expiration',
              enabled: true,
              abortIncompleteMultipartUploadAfter: Duration.days(1),
              expiredObjectDeleteMarker: true,
              noncurrentVersionExpiration: Duration.days(1),
              noncurrentVersionsToRetain: 1,
            },
            {
              id: 'archive/',
              enabled: true,
              abortIncompleteMultipartUploadAfter: Duration.days(1),
              expiration: Duration.days(7),
              noncurrentVersionExpiration: Duration.days(1),
              prefix: 'archive/',
            },
            { 
              id: 'athena-results/',
              enabled: true,
              abortIncompleteMultipartUploadAfter: Duration.days(1),
              expiration: Duration.days(1),
              noncurrentVersionExpiration: Duration.days(1),
              prefix: 'athena-results/',
            },
          ],
        }
      );

      // Override the logical ID
      const cfnStagingBucket = this.StagingBucket.node.defaultChild as s3.CfnBucket;
      cfnStagingBucket.overrideLogicalId("StagingBucket");

      cfnStagingBucket.addMetadata('cfn_nag', {
        rules_to_suppress: [
          {
            id: 'W35',
            reason: 'Staging Bucket does not need enable access logging.',
          },
        ],
      });

      new CfnOutput(this, 'StagingBucketName', {
        description: 'Staging Bucket Name',
        value: this.StagingBucket.bucketName,
        exportName: `${Aws.STACK_NAME}::StagingBucketName`,
      }).overrideLogicalId('StagingBucketName');

    };
}
