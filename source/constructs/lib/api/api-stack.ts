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
import { CfnOutput, Aws, aws_s3 as s3, aws_ecs as ecs } from 'aws-cdk-lib';
import { IVpc } from 'aws-cdk-lib/aws-ec2';
import { NagSuppressions } from 'cdk-nag';
import { Construct } from 'constructs';

import { AppLogIngestionStack } from './app-log-ingestion-stack';
import { AppPipelineStack } from './app-pipeline-stack';
import { AppTableStack } from './app-table-stack';
import { AppSyncStack } from './appsync-stack';

import { ClusterStack } from './cluster-stack';
import { CommonResourceStack } from './common-resource-stack';
import { CrossAccountStack } from './cross-account-stack';

import { CloudWatchStack } from './cwl-stack';
import { Ec2IamInstanceProfileStack } from './ec2-iam-instance-profile';
import { InstanceStack } from './instance-stack';
import { LogConfStack } from './log-conf-stack';
import { LogSourceStack } from './log-source-stack';

import { PipelineAlarmStack } from './pipeline-alarm-stack';
import { SvcPipelineStack } from './svc-pipeline-stack';
import { CfnFlowStack } from '../main/cfn-flow-stack';

export interface APIProps {
  /**
   * Cognito User Pool for Authentication of APIs
   *
   * @default - None.
   */
  readonly userPoolId: string;

  /**
   * Cognito User Pool Client for Authentication of APIs
   *
   * @default - None.
   */
  readonly userPoolClientId: string;

  /**
   * VPC
   *
   */
  readonly vpc: IVpc;

  /**
   * Default Subnet Ids (Private)
   *
   */
  readonly subnetIds: string[];

  /**
   * Processing SecurityGroup Id
   *
   */
  readonly processSgId: string;

  /**
   * Authentication Type
   *
   */
  readonly authType: string;

  /**
   * OIDC Provider
   *
   */
  readonly oidcProvider: string;

  /**
   * OIDC Client Id
   *
   */
  readonly oidcClientId: string;

  readonly defaultLoggingBucket: s3.Bucket;

  readonly ecsCluster: ecs.Cluster;

  readonly cmkKeyArn: string;

  readonly solutionId: string;

  readonly stackPrefix: string;
}

/**
 * Entrance for All backend APIs related resources.
 */
export class APIStack extends Construct {
  readonly apiEndpoint: string;
  // readonly graphqlApi: appsync.GraphqlApi;

  constructor(scope: Construct, id: string, props: APIProps) {
    super(scope, id);

    const apiStack = new AppSyncStack(this, 'AppSyncStack', {
      authType: props.authType,
      oidcProvider: props.oidcProvider,
      oidcClientId: props.oidcClientId,
      userPoolId: props.userPoolId,
      userPoolClientId: props.userPoolClientId,
    });

    // Create the Cross Account API stack
    const crossAccountStack = new CrossAccountStack(this, `CrossAccountStack`, {
      graphqlApi: apiStack.graphqlApi,
      solutionId: props.solutionId,
    });

    // Create a common orchestration flow for CloudFormation deployment
    const cfnFlow = new CfnFlowStack(this, 'CfnFlow', {
      subAccountLinkTable: crossAccountStack.subAccountLinkTable,
      stackPrefix: props.stackPrefix,
      solutionId: props.solutionId,
    });
    NagSuppressions.addResourceSuppressions(
      cfnFlow,
      [
        {
          id: 'AwsSolutions-IAM5',
          reason: 'Lambda need get dynamic resources',
        },
      ],
      true
    );

    const cfnFlowSMArn = cfnFlow.stateMachineArn;

    // Create the Common Resources (such as vpc) related APIs stack
    const resourceStack = new CommonResourceStack(this, 'ResourceAPI', {
      graphqlApi: apiStack.graphqlApi,
      defaultLoggingBucketName: props.defaultLoggingBucket.bucketName,
      centralAssumeRolePolicy: crossAccountStack.centralAssumeRolePolicy,
      subAccountLinkTable: crossAccountStack.subAccountLinkTable,
      solutionId: props.solutionId,
      stackPrefix: props.stackPrefix,
    });
    NagSuppressions.addResourceSuppressions(
      resourceStack,
      [
        {
          id: 'AwsSolutions-IAM5',
          reason: 'Lambda need get dynamic resources',
        },
      ],
      true
    );

    // Create the Service Pipeline APIs stack
    const svcPipelineStack = new SvcPipelineStack(this, 'SvcPipelineAPI', {
      graphqlApi: apiStack.graphqlApi,
      cfnFlowSMArn: cfnFlowSMArn,
      subAccountLinkTable: crossAccountStack.subAccountLinkTable,
      centralAssumeRolePolicy: crossAccountStack.centralAssumeRolePolicy,
      solutionId: props.solutionId,
      stackPrefix: props.stackPrefix,
    });
    NagSuppressions.addResourceSuppressions(
      svcPipelineStack,
      [
        {
          id: 'AwsSolutions-IAM5',
          reason: 'Lambda need get dynamic resources',
        },
      ],
      true
    );

    const appTableStack = new AppTableStack(this, 'AppTables');

    // Create the Logging Source Appsync API stack
    const logSourceStack = new LogSourceStack(this, 'LogSourceAPI', {
      graphqlApi: apiStack.graphqlApi,
      centralAssumeRolePolicy: crossAccountStack.centralAssumeRolePolicy,
      instanceTable: appTableStack.instanceTable,
      logSourceTable: appTableStack.logSourceTable,
      appLogIngestionTable: appTableStack.appLogIngestionTable,
      subAccountLinkTable: crossAccountStack.subAccountLinkTable,
      stackPrefix: props.stackPrefix,
      solutionId: props.solutionId,
    });
    NagSuppressions.addResourceSuppressions(
      logSourceStack,
      [
        {
          id: 'AwsSolutions-IAM5',
          reason: 'Lambda need get dynamic resources',
        },
      ],
      true
    );

    // Create the Logging Conf Appsync API stack
    const logConfStack = new LogConfStack(this, 'LogConfAPI', {
      graphqlApi: apiStack.graphqlApi,
      solutionId: props.solutionId,
      logConfTable: appTableStack.logConfTable,
    });

    // Create the App Pipeline APIs stack
    const appPipelineStack = new AppPipelineStack(this, 'AppPipelineAPI', {
      graphqlApi: apiStack.graphqlApi,
      cfnFlowSMArn: cfnFlowSMArn,
      centralAssumeRolePolicy: crossAccountStack.centralAssumeRolePolicy,
      solutionId: props.solutionId,
      stackPrefix: props.stackPrefix,
      logConfigTable: appTableStack.logConfTable,
      appPipelineTable: appTableStack.appPipelineTable,
      appLogIngestionTable: appTableStack.appLogIngestionTable,
    });
    NagSuppressions.addResourceSuppressions(
      appPipelineStack,
      [
        {
          id: 'AwsSolutions-IAM5',
          reason: 'Lambda need get dynamic resources',
        },
      ],
      true
    );

    const instanceStack = new InstanceStack(this, 'InstanceAPI', {
      graphqlApi: apiStack.graphqlApi,
      subAccountLinkTable: crossAccountStack.subAccountLinkTable,
      centralAssumeRolePolicy: crossAccountStack.centralAssumeRolePolicy,
      solutionId: props.solutionId,
    });
    NagSuppressions.addResourceSuppressions(
      instanceStack,
      [
        {
          id: 'AwsSolutions-IAM5',
          reason: 'Lambda need get dynamic resources',
        },
      ],
      true
    );

    // Create the OpenSearch cluster related APIs stack
    const clusterStack = new ClusterStack(this, 'ClusterAPI', {
      graphqlApi: apiStack.graphqlApi,
      cfnFlowSMArn: cfnFlowSMArn,
      vpc: props.vpc,
      subnetIds: props.subnetIds,
      processSgId: props.processSgId,
      defaultLoggingBucket: props.defaultLoggingBucket.bucketName,
      centralAssumeRolePolicy: crossAccountStack.centralAssumeRolePolicy,
      appPipelineTable: appTableStack.appPipelineTable,
      svcPipelineTable: svcPipelineStack.svcPipelineTable,
      solutionId: props.solutionId,
      stackPrefix: props.stackPrefix,
    });
    NagSuppressions.addResourceSuppressions(
      clusterStack,
      [
        {
          id: 'AwsSolutions-IAM5',
          reason: 'Lambda need get dynamic resources',
        },
      ],
      true
    );

    // Init EC2 IAM instance profile resource
    const Ec2IamInstanceProfile = new Ec2IamInstanceProfileStack(
      this,
      'Ec2IamInstanceProfile',
      {
        loggingBucket: props.defaultLoggingBucket,
        accountId: Aws.ACCOUNT_ID,
        stackPrefix: props.stackPrefix,
      }
    );

    // Create the CloudWatch API stack
    const cloudWatchStack = new CloudWatchStack(this, 'CloudWatchAPI', {
      graphqlApi: apiStack.graphqlApi,
      centralAssumeRolePolicy: crossAccountStack.centralAssumeRolePolicy,
      solutionId: props.solutionId,
      stackPrefix: props.stackPrefix,
      appPipelineTableArn: appTableStack.appPipelineTable.tableArn,
      svcPipelineTableArn: svcPipelineStack.svcPipelineTable.tableArn,
      appLogIngestionTableArn: appTableStack.appLogIngestionTable.tableArn,
      logSourceTableArn: appTableStack.logSourceTable.tableArn,
    });
    NagSuppressions.addResourceSuppressions(
      cloudWatchStack,
      [
        {
          id: 'AwsSolutions-IAM5',
          reason: 'Lambda need get dynamic resources',
        },
      ],
      true
    );

    // Create the Logging Ingestion Appsync API stack
    const appLogIngestionStack = new AppLogIngestionStack(
      this,
      'AppLogIngestionAPI',
      {
        cfnFlowSMArn: cfnFlowSMArn,
        graphqlApi: apiStack.graphqlApi,
        defaultVPC: props.vpc.vpcId,
        defaultPublicSubnets: props.subnetIds,
        cmkKeyArn: props.cmkKeyArn,
        logConfTable: appTableStack.logConfTable,
        appPipelineTable: appTableStack.appPipelineTable,
        appLogIngestionTable: appTableStack.appLogIngestionTable,
        logSourceTable: appTableStack.logSourceTable,
        instanceTable: appTableStack.instanceTable,
        configFileBucket: props.defaultLoggingBucket,
        subAccountLinkTable: crossAccountStack.subAccountLinkTable,
        centralAssumeRolePolicy: crossAccountStack.centralAssumeRolePolicy,
        ecsCluster: props.ecsCluster,
        Ec2IamInstanceProfile: Ec2IamInstanceProfile,
        solutionId: props.solutionId,
        stackPrefix: props.stackPrefix,
        cwlAccessRole: crossAccountStack.cwlAccessRole,
        fluentBitLogGroupName: cloudWatchStack.fluentBitLogGroup,
      }
    );
    appLogIngestionStack.node.addDependency(
      props.ecsCluster,
      logConfStack,
      appPipelineStack,
      appTableStack
    );
    NagSuppressions.addResourceSuppressions(
      appLogIngestionStack,
      [
        {
          id: 'AwsSolutions-IAM5',
          reason: 'Lambda need get dynamic resources',
        },
      ],
      true
    );

    // Create the Pipeline Alarm API stack
    const pipelineAlarmStack = new PipelineAlarmStack(
      this,
      'PipelineAlarmAPI',
      {
        graphqlApi: apiStack.graphqlApi,
        centralAssumeRolePolicy: crossAccountStack.centralAssumeRolePolicy,
        solutionId: props.solutionId,
        stackPrefix: props.stackPrefix,
        appPipelineTableArn: appTableStack.appPipelineTable.tableArn,
        svcPipelineTableArn: svcPipelineStack.svcPipelineTable.tableArn,
        appLogIngestionTableArn: appTableStack.appLogIngestionTable.tableArn,
      }
    );
    NagSuppressions.addResourceSuppressions(
      pipelineAlarmStack,
      [
        {
          id: 'AwsSolutions-IAM5',
          reason: 'Lambda need get dynamic resources',
        },
      ],
      true
    );
    pipelineAlarmStack.node.addDependency(cloudWatchStack);

    new CfnOutput(this, 'GraphQLAPIEndpoint', {
      description: 'GraphQL API Endpoint (back-end)',
      value: apiStack.graphqlApi.graphqlUrl,
    }).overrideLogicalId('GraphQLAPIEndpoint');

    this.apiEndpoint = apiStack.graphqlApi.graphqlUrl;
  }
}
