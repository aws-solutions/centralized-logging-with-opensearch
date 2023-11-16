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
import { Aws, aws_iam as iam, aws_s3 as s3, aws_ssm as ssm } from "aws-cdk-lib";
import { InitKMSStack } from "../kms/init-kms-stack";
import { InitGlueStack } from "../glue/init-glue-stack";
import { InitAthenaStack } from "../athena/init-athena-stack";

export interface  InitIAMProps {
  readonly solutionId: string;
  readonly solutionName: string;
  readonly stagingBucket: s3.Bucket;
  readonly microBatchKMSStack: InitKMSStack;
  readonly microBatchGlueStack: InitGlueStack;
  readonly microBatchAthenaStack: InitAthenaStack;
}

export class InitIAMStack extends Construct {
    readonly AthenaPublicAccessRole: iam.Role;
    readonly S3PublicAccessPolicy: iam.ManagedPolicy;
    readonly GluePublicAccessPolicy: iam.ManagedPolicy;
    readonly AthenaPublicAccessPolicy: iam.ManagedPolicy;
    readonly KMSPublicAccessPolicy: iam.ManagedPolicy;
    readonly SendTemplateEmailSNSPublicPolicy: iam.ManagedPolicy;

    constructor(scope: Construct, id: string, props: InitIAMProps) {
      super(scope, id);

      let stagingBucket = props.stagingBucket;
      let microBatchKMSStack = props.microBatchKMSStack;
      let microBatchGlueStack = props.microBatchGlueStack;
      let microBatchAthenaStack = props.microBatchAthenaStack;

      this.S3PublicAccessPolicy = new iam.ManagedPolicy(this, "S3PublicAccessPolicy", {
        statements: [
          new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
              "s3:ListBucket",
              "s3:ListBucketMultipartUploads",
              "s3:ListMultipartUploadParts",
              "s3:GetObject",
              "s3:GetBucketLocation",
              "s3:AbortMultipartUpload",
              "s3:CreateBucket",
              "s3:PutObject",
              "s3:DeleteObject",
              "s3:PutObjectTagging",
              "s3:GetObjectTagging",
            ], 
            resources: [
              `${stagingBucket.bucketArn}`,
              `${stagingBucket.bucketArn}/*`,
            ],
          }),
        ],
      });

      // Override the logical ID
      const cfnS3PublicAccessPolicyPolicy = this.S3PublicAccessPolicy.node.defaultChild as iam.CfnPolicy;
      cfnS3PublicAccessPolicyPolicy.overrideLogicalId("S3PublicAccessPolicy");

      this.GluePublicAccessPolicy = new iam.ManagedPolicy(this, "GluePublicAccessPolicy", {
        statements: [
          new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
              "glue:BatchGetPartition",
              "glue:GetPartitions",
              "glue:GetPartition",
              "glue:GetTables",
              "glue:GetTable",
              "glue:GetDatabases",
              "glue:GetDatabase",
              "glue:BatchCreatePartition",
              "glue:CreatePartition",
              "glue:DeleteTable",
              "glue:DeletePartition",
              "glue:CreateTable",
              "glue:UpdatePartition",
              "glue:BatchUpdatePartition",
              "glue:BatchDeletePartition",
              "glue:UpdateTable",
            ], 
            resources: [
              microBatchGlueStack.microBatchCentralizedDatabase.databaseArn,
              microBatchGlueStack.microBatchTmpDatabase.databaseArn,
              `arn:${Aws.PARTITION}:glue:${Aws.REGION}:${Aws.ACCOUNT_ID}:table/${microBatchGlueStack.microBatchCentralizedDatabase.databaseName}/*`,
              `arn:${Aws.PARTITION}:glue:${Aws.REGION}:${Aws.ACCOUNT_ID}:table/${microBatchGlueStack.microBatchTmpDatabase.databaseName}/*`,
              `arn:${Aws.PARTITION}:glue:${Aws.REGION}:${Aws.ACCOUNT_ID}:catalog`,
            ],
          }),
        ],
      });

      // Override the logical ID
      const cfnGluePublicAccessPolicy = this.GluePublicAccessPolicy.node.defaultChild as iam.CfnPolicy;
      cfnGluePublicAccessPolicy.overrideLogicalId("GluePublicAccessPolicy");

      this.AthenaPublicAccessPolicy = new iam.ManagedPolicy(this, "AthenaPublicAccessPolicy", {
        statements: [
          new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
              "athena:ListDatabases",
              "athena:ListDataCatalogs",
              "athena:ListWorkGroups",
              "athena:GetDatabase",
              "athena:GetDataCatalog",
              "athena:GetQueryExecution",
              "athena:GetQueryResults",
              "athena:GetTableMetadata",
              "athena:GetWorkGroup",
              "athena:ListTableMetadata",
              "athena:StartQueryExecution",
              "athena:StopQueryExecution",
            ], 
            resources: [
              `arn:${Aws.PARTITION}:athena:${Aws.REGION}:${Aws.ACCOUNT_ID}:datacatalog/*`,
              `arn:${Aws.PARTITION}:athena:${Aws.REGION}:${Aws.ACCOUNT_ID}:workgroup/${microBatchAthenaStack.microBatchAthenaWorkGroup.name}`,
            ],
          }),
          new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
              "athena:ListDataCatalogs",
              "athena:ListWorkGroups",
            ], 
            resources: ["*"],
          }),
        ],
      });

      // Override the logical ID
      const cfnAthenaPublicAccessPolicy = this.AthenaPublicAccessPolicy.node.defaultChild as iam.CfnPolicy;
      cfnAthenaPublicAccessPolicy.overrideLogicalId("AthenaPublicAccessPolicy");

      cfnAthenaPublicAccessPolicy.addMetadata('cfn_nag', {
        rules_to_suppress: [
          {
            id: 'W13',
            reason: 'This Policy need to list all of workgroup and data catalogs.',
          },
        ],
      });

      this.KMSPublicAccessPolicy = new iam.ManagedPolicy(this, "KMSPublicAccessPolicy", {
        statements: [
          new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
              "kms:GenerateDataKey*", 
              "kms:Decrypt", 
              "kms:Encrypt"
            ], 
            resources: [microBatchKMSStack.encryptionKey.keyArn],
          }),
        ],
      });

      // Override the logical ID
      const cfnKMSPublicAccessPolicy = this.KMSPublicAccessPolicy.node.defaultChild as iam.CfnPolicy;
      cfnKMSPublicAccessPolicy.overrideLogicalId("KMSPublicAccessPolicy");
      
      // Create a Public Access Role for Athena 
      // It can be used to other service to access data in centralized via athena, such as Grafana.
      this.AthenaPublicAccessRole = new iam.Role(this, "AthenaPublicAccessRole", {
        assumedBy: new iam.ServicePrincipal('states.amazonaws.com'),
      });
      this.AthenaPublicAccessRole.grantAssumeRole(new iam.AccountRootPrincipal());
      
      this.AthenaPublicAccessRole.addManagedPolicy(this.S3PublicAccessPolicy);
      this.AthenaPublicAccessRole.addManagedPolicy(this.GluePublicAccessPolicy);
      this.AthenaPublicAccessRole.addManagedPolicy(this.AthenaPublicAccessPolicy);
      this.AthenaPublicAccessRole.addManagedPolicy(this.KMSPublicAccessPolicy);

      // Override the logical ID
      const cfnAthenaPublicAccessRole = this.AthenaPublicAccessRole.node.defaultChild as iam.CfnRole;
      cfnAthenaPublicAccessRole.overrideLogicalId("AthenaPublicAccessRole");

      this.SendTemplateEmailSNSPublicPolicy = new iam.ManagedPolicy(this, "SendTemplateEmailSNSPublicPolicy", {
        statements: [
          new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
              "sns:ListTopics",
              "sns:Publish"
            ], 
            resources: [`arn:${Aws.PARTITION}:sns:${Aws.REGION}:${Aws.ACCOUNT_ID}:*`,],
          }),
        ],
      });

      // Override the logical ID
      const cfnSendTemplateEmailSNSPublicPolicy = this.SendTemplateEmailSNSPublicPolicy.node.defaultChild as iam.CfnPolicy;
      cfnSendTemplateEmailSNSPublicPolicy.overrideLogicalId("SendTemplateEmailSNSPublicPolicy");

      const SSMKMSPublicAccessPolicyArn = new ssm.StringParameter(this, 'SSMKMSPublicAccessPolicyArn', {
        parameterName: '/MicroBatch/KMSPublicAccessPolicyArn',
        stringValue: this.KMSPublicAccessPolicy.managedPolicyArn,
      });

      // Override the logical ID
      const cfnSSMKMSPublicAccessPolicyArn = SSMKMSPublicAccessPolicyArn.node.defaultChild as ssm.CfnParameter;
      cfnSSMKMSPublicAccessPolicyArn.overrideLogicalId("KMSPublicAccessPolicyArn");

    }
}