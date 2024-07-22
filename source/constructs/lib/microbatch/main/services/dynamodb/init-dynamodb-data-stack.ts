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
import { Fn, CfnCondition, Aws, aws_s3 as s3, CfnCustomResource, CustomResource, custom_resources as cr } from "aws-cdk-lib";
import { InitDynamoDBStack } from "./init-dynamodb-stack";
import { InitSQSStack } from "../sqs/init-sqs-stack";
import { InitLambdaStack } from "../lambda/init-lambda-stack";
import { InitStepFunctionStack } from "../stepfunction/init-sfn-stack";
import { InitSNSStack } from "../sns/init-sns-stack";
import { InitAthenaStack } from "../athena/init-athena-stack";
import { InitIAMStack } from "../iam/init-iam-stack";
import { InitKMSStack } from "../kms/init-kms-stack";
import { InitGlueStack } from "../glue/init-glue-stack";

export interface  InitDynamoDBDataProps {
  readonly solutionId: string;
  readonly solutionName: string;
  readonly emailAddress: string;
  readonly SESState: string;
  readonly stagingBucket: s3.Bucket;
  readonly microBatchSQSStack: InitSQSStack;
  readonly microBatchDDBStack: InitDynamoDBStack;
  readonly microBatchIAMStack: InitIAMStack;
  readonly microBatchLambdaStack: InitLambdaStack;
  readonly microBatchAthenaStack: InitAthenaStack;
  readonly microBatchSFNStack: InitStepFunctionStack;
  readonly microBatchKMSStack: InitKMSStack;
  readonly microBatchGlueStack: InitGlueStack;
  readonly microBatchSNSStack: InitSNSStack;
}

export class InitDynamoDBDataStack extends Construct {

    constructor(scope: Construct, id: string, props: InitDynamoDBDataProps) {
      super(scope, id);

      let solutionName = props.solutionName;
      let stagingBucket = props.stagingBucket;
      let emailAddress = props.emailAddress;
      let SESState = props.SESState;
      let microBatchSQSStack = props.microBatchSQSStack;
      let microBatchDDBStack = props.microBatchDDBStack;
      let microBatchIAMStack = props.microBatchIAMStack;
      let microBatchLambdaStack = props.microBatchLambdaStack;
      let microBatchSFNStack = props.microBatchSFNStack;
      let microBatchKMSStack = props.microBatchKMSStack;
      let microBatchGlueStack = props.microBatchGlueStack;
      let microBatchSNSStack = props.microBatchSNSStack;

      const metadataWriterProvider = new cr.Provider(this, 'MetadataWriterProvider', {
        onEventHandler: microBatchLambdaStack.MetadataWriterStack.MetadataWriter,
        providerFunctionName: `${Aws.STACK_NAME.substring(0, 30)}-MetadataWriterProvider`,
      });

      const metadata: any[] = [];

      metadata.push({
        metaName: 'EmailAddress',
        service: 'CloudFormation',
        type: 'Parameter',
        arn: '',
        name: 'EmailAddress',
        value: emailAddress,
      });
      metadata.push({
        metaName: 'SimpleEmailServiceState',
        service: 'CloudFormation',
        type: 'Parameter',
        arn: '',
        name: 'SimpleEmailServiceState',
        value: SESState,
      });
      metadata.push({
        metaName: 'SimpleEmailServiceTemplate',
        service: 'SES',
        type: 'Template',
        arn: '',
        name: 'SimpleEmailServiceTemplate',
        value: `${Aws.STACK_NAME.substring(0, 30)}-SESEmailTemplate`,
      });
      metadata.push({
        metaName: 'AccountId',
        service: 'AWS',
        type: 'Account',
        arn: '',
        name: 'Account',
        value: Aws.ACCOUNT_ID,
      });
      metadata.push({
        metaName: 'Region',
        service: 'AWS',
        type: 'Region',
        arn: '',
        name: 'Region',
        value: Aws.REGION,
      });
      metadata.push({
        metaName: 'Partition',
        service: 'AWS',
        type: 'Partition',
        arn: '',
        name: 'Partition',
        value: Aws.PARTITION,
      });
      metadata.push({
        metaName: 'ETLLogTimeToLiveSecs',
        service: 'Solution',
        type: 'Parameter',
        arn: '',
        name: 'ETLLogTimeToLiveSecs',
        value: 2592000,
      });
      metadata.push({
        metaName: 'StagingBucket',
        service: 'S3',
        arn: stagingBucket.bucketArn,
        name: stagingBucket.bucketName,
      });
      metadata.push({
        metaName: 'SendTemplateEmailSNSPublicPolicy',
        service: 'IAM',
        type: 'Policy',
        arn: microBatchIAMStack.SendTemplateEmailSNSPublicPolicy.managedPolicyArn,
        name: microBatchIAMStack.SendTemplateEmailSNSPublicPolicy.managedPolicyName,
      });
      metadata.push({
        metaName: 'S3PublicAccessPolicy',
        service: 'IAM',
        type: 'Policy',
        arn: microBatchIAMStack.S3PublicAccessPolicy.managedPolicyArn,
        name: microBatchIAMStack.S3PublicAccessPolicy.managedPolicyName,
      });
      metadata.push({
        metaName: 'GluePublicAccessPolicy',
        service: 'IAM',
        type: 'Policy',
        arn: microBatchIAMStack.GluePublicAccessPolicy.managedPolicyArn,
        name: microBatchIAMStack.GluePublicAccessPolicy.managedPolicyName,
      });
      metadata.push({
        metaName: 'LogProcessorStartExecutionRole',
        service: 'IAM',
        type: 'Role',
        arn: microBatchSFNStack.LogProcessorStack.LogProcessorStartExecutionRole.roleArn,
        name: microBatchSFNStack.LogProcessorStack.LogProcessorStartExecutionRole.roleName,
        url: `https://${Aws.REGION}.console.aws.amazon.com/iamv2/home?region=${Aws.REGION}#/roles/details/${microBatchSFNStack.LogProcessorStack.LogProcessorStartExecutionRole.roleName}`
      });
      metadata.push({
        metaName: 'LogMergerStartExecutionRole',
        service: 'IAM',
        type: 'Role',
        arn: microBatchSFNStack.LogMergerStack.LogMergerStartExecutionRole.roleArn,
        name: microBatchSFNStack.LogMergerStack.LogMergerStartExecutionRole.roleName,
        url: `https://${Aws.REGION}.console.aws.amazon.com/iamv2/home?region=${Aws.REGION}#/roles/details/${microBatchSFNStack.LogMergerStack.LogMergerStartExecutionRole.roleName}`
      });
      metadata.push({
        metaName: 'LogArchiveStartExecutionRole',
        service: 'IAM',
        type: 'Role',
        arn: microBatchSFNStack.LogArchiveStack.LogArchiveStartExecutionRole.roleArn,
        name: microBatchSFNStack.LogArchiveStack.LogArchiveStartExecutionRole.roleName,
        url: `https://${Aws.REGION}.console.aws.amazon.com/iamv2/home?region=${Aws.REGION}#/roles/details/${microBatchSFNStack.LogArchiveStack.LogArchiveStartExecutionRole.roleName}`
      });
      metadata.push({
        metaName: 'ETLHelperRole',
        service: 'IAM' ,
        type: 'Role',
        arn: microBatchLambdaStack.ETLHelperStack.ETLHelperRole.roleArn,
        name: microBatchLambdaStack.ETLHelperStack.ETLHelperRole.roleName,
        url: `https://${Aws.REGION}.console.aws.amazon.com/iamv2/home?region=${Aws.REGION}#/roles/details/${microBatchLambdaStack.ETLHelperStack.ETLHelperRole.roleName}`
      });
      metadata.push({
        metaName: 'PipelineResourcesBuilderRole',
        service: 'IAM',
        type: 'Role',
        arn:  microBatchLambdaStack.PipelineResourcesBuilderStack.PipelineResourcesBuilderRole.roleArn,
        name: microBatchLambdaStack.PipelineResourcesBuilderStack.PipelineResourcesBuilderRole.roleName,
        url: `https://${Aws.REGION}.console.aws.amazon.com/iamv2/home?region=${Aws.REGION}#/roles/details/${microBatchLambdaStack.PipelineResourcesBuilderStack.PipelineResourcesBuilderRole.roleName}`
      });
      metadata.push({
        metaName: 'PipelineResourcesBuilderSchedulePolicy',
        service: 'IAM',
        type: 'Policy',
        arn:  microBatchLambdaStack.PipelineResourcesBuilderStack.PipelineResourcesBuilderSchedulePolicy.managedPolicyArn,
        name: microBatchLambdaStack.PipelineResourcesBuilderStack.PipelineResourcesBuilderSchedulePolicy.managedPolicyName,
      });
      metadata.push({
        metaName: 'S3ObjectScanningRole',
        service: 'IAM',
        type: 'Role',
        arn:  microBatchLambdaStack.S3ObjectScanningStack.S3ObjectScanningRole.roleArn,
        name: microBatchLambdaStack.S3ObjectScanningStack.S3ObjectScanningRole.roleName,
        url: `https://${Aws.REGION}.console.aws.amazon.com/iamv2/home?region=${Aws.REGION}#/roles/details/${microBatchLambdaStack.S3ObjectScanningStack.S3ObjectScanningRole.roleName}`
      });
      metadata.push({
        metaName: 'S3ObjectMigrationRole',
        service: 'IAM',
        type: 'Role',
        arn: microBatchLambdaStack.S3ObjectMigrationStack.S3ObjectMigrationRole.roleArn,
        name: microBatchLambdaStack.S3ObjectMigrationStack.S3ObjectMigrationRole.roleName,
        url: `https://${Aws.REGION}.console.aws.amazon.com/iamv2/home?region=${Aws.REGION}#/roles/details/${microBatchLambdaStack.S3ObjectMigrationStack.S3ObjectMigrationRole.roleName}`
      });
      metadata.push({
        metaName: 'AthenaPublicAccessRole',
        service: 'IAM',
        type: 'Role',
        arn: microBatchIAMStack.AthenaPublicAccessRole.roleArn ,
        name: microBatchIAMStack.AthenaPublicAccessRole.roleName,
        url: `https://${Aws.REGION}.console.aws.amazon.com/iamv2/home?region=${Aws.REGION}#/roles/details/${microBatchIAMStack.AthenaPublicAccessRole.roleName}`
    });
      metadata.push({
        metaName: 'LogProcessor',
        service: 'StepFunction',
        arn: microBatchSFNStack.LogProcessorStack.LogProcessor.stateMachineArn,
        name: microBatchSFNStack.LogProcessorStack.LogProcessor.stateMachineName,
        url: `https://${Aws.REGION}.console.aws.amazon.com/states/home?region=${Aws.REGION}#/statemachines/view/${microBatchSFNStack.LogProcessorStack.LogProcessor.stateMachineArn}`,
      });
      metadata.push({
        metaName: 'LogMerger',
        service: 'StepFunction',
        arn: microBatchSFNStack.LogMergerStack.LogMerger.stateMachineArn,
        name: microBatchSFNStack.LogMergerStack.LogMerger.stateMachineName,
      });
      metadata.push({
        metaName: 'LogArchive',
        service: 'StepFunction',
        arn: microBatchSFNStack.LogArchiveStack.LogArchive.stateMachineArn,
        name: microBatchSFNStack.LogArchiveStack.LogArchive.stateMachineName,
      });
      metadata.push({
        metaName: 'S3ObjectMigrationQueue',
        service: 'SQS',
        arn: microBatchSQSStack.S3ObjectMigrationQ.queueArn,
        name: microBatchSQSStack.S3ObjectMigrationQ.queueName,
        url: microBatchSQSStack.S3ObjectMigrationQ.queueUrl,
      });
      metadata.push({
        metaName: 'S3ObjectMergeQueue',
        service: 'SQS',
        arn: microBatchSQSStack.S3ObjectMergeQ.queueArn,
        name: microBatchSQSStack.S3ObjectMergeQ.queueName,
        url: microBatchSQSStack.S3ObjectMergeQ.queueUrl,
      });
      metadata.push({
        metaName: 'AthenaWorkGroup',
        service: 'Athena',
        arn: '' ,
        name: solutionName,
      });
      metadata.push({
        metaName: 'AthenaOutputLocation',
        service: 'Athena',
        arn: '',
        name: `s3://${stagingBucket.bucketName}/athena-results/`,
      });
      metadata.push({
        metaName: 'CustomerManagedKey',
        service: 'KMS',
        arn: microBatchKMSStack.encryptionKey.keyArn,
        name: microBatchKMSStack.encryptionKey.keyId,
      });
      metadata.push({
        metaName: 'CentralizedCatalog',
        service: 'GLUE',
        arn: '',
        name: microBatchGlueStack.microBatchCentralizedCatalog,
      });
      metadata.push({
        metaName: 'CentralizedDatabase',
        service: 'GLUE',
        arn: microBatchGlueStack.microBatchCentralizedDatabase.databaseArn,
        name: microBatchGlueStack.microBatchCentralizedDatabase.databaseName,
      });
      metadata.push({
        metaName: 'TmpDatabase',
        service: 'GLUE',
        arn: microBatchGlueStack.microBatchTmpDatabase.databaseArn,
        name: microBatchGlueStack.microBatchTmpDatabase.databaseName,
      });
      metadata.push({
        metaName: 'ReceiveStatesFailedTopic',
        service: 'SNS',
        arn: microBatchSNSStack.SNSReceiveStatesFailedTopic.topicArn,
        name:  microBatchSNSStack.SNSReceiveStatesFailedTopic.topicName,
      });
      metadata.push({
        metaName: 'SendEmailTopic',
        service: 'SNS',
        arn: microBatchSNSStack.SNSSendEmailTopic.topicArn,
        name:  microBatchSNSStack.SNSSendEmailTopic.topicName,
      });

      const isCNRegion = new CfnCondition(this, 'isCNRegion', {
        expression: Fn.conditionEquals(Aws.PARTITION, 'aws-cn'),
      });
      const awsConsoleUrl = Fn.conditionIf(
        isCNRegion.logicalId,
        `https://${Aws.REGION}.console.amazonaws.cn`,
        `https://${Aws.REGION}.console.aws.amazon.com`
      ).toString();

      metadata.push({
        metaName: 'AwsConsoleUrl',
        service: 'AWS',
        type: 'Url',
        arn: '',
        name: 'AwsConsoleUrl',
        value: awsConsoleUrl,
      });

      const metadataWriterCustomResource = new CustomResource(this, 'MetadataWriterCustomResource', {
        serviceToken: metadataWriterProvider.serviceToken,
        properties: {
          Items: metadata
        }
      });

      // Override the logical ID
      const cfnMetadataWriterCustomResource = metadataWriterCustomResource.node.defaultChild as CfnCustomResource;
      cfnMetadataWriterCustomResource.overrideLogicalId("MetadataWriterCustomResource");

      metadataWriterCustomResource.node.addDependency(microBatchDDBStack.MetaTable);

    };
}