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

import { CfnOutput, Aws, aws_s3 as s3, aws_ecs as ecs, aws_sqs as sqs, aws_iam as iam } from 'aws-cdk-lib';
import * as appsync from '@aws-cdk/aws-appsync-alpha';
import { IVpc, SecurityGroup } from 'aws-cdk-lib/aws-ec2';
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
import { FluentBitConfigStack } from './fluent-bit-config-stack';
import { InstanceStack } from './instance-stack';
import { LogConfStack } from './log-conf-stack';
import { LogSourceStack } from './log-source-stack';

import { PipelineAlarmStack } from './pipeline-alarm-stack';
import { GrafanaStack } from './grafana-stack';

import { MicroBatchStack } from '../../lib/microbatch/main/services/amazon-services-stack';
import { SvcPipelineStack } from './svc-pipeline-stack';
import { CfnFlowStack } from '../main/cfn-flow-stack';

const TEMPLATE_OUTPUT_BUCKET = process.env.TEMPLATE_OUTPUT_BUCKET || 'solutions-features-reference';

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


  readonly processSg: SecurityGroup;

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

  readonly microBatchStack: MicroBatchStack;

  readonly flbConfUploadingEventQueue: sqs.Queue;

  readonly aosMasterRole: iam.Role;
}

/**
 * Entrance for All backend APIs related resources.
 */
export class APIStack extends Construct {
  readonly apiEndpoint: string;
  readonly clusterStack: ClusterStack;
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

    apiStack.graphqlApi
      .addHttpDataSource('LatestVersionDS', "https://s3.amazonaws.com")
      .createResolver("LatestVersionResolver", {
        typeName: 'Query',
        fieldName: 'latestVersion',
        requestMappingTemplate: appsync.MappingTemplate.fromString(JSON.stringify({
          "version": "2018-05-29",
          "method": "GET",
          "resourcePath": `/${TEMPLATE_OUTPUT_BUCKET}/centralized-logging-with-opensearch/latest/version`,
          "params": {
            "headers": {
              "Content-Type": "application/json"
            }
          },
        })),
        responseMappingTemplate: appsync.MappingTemplate.fromString(
          `#if($ctx.error)
  {"version": "unknown", "reason": $util.toJson($ctx.error)}
#else
  #if($ctx.result.statusCode == 200)
      $ctx.result.body
  #else
      {"version": "unknown"}
  #end
#end`),
      });

    // Create the Cross Account API stack
    const crossAccountStack = new CrossAccountStack(this, `CrossAccountStack`, {
      graphqlApi: apiStack.graphqlApi,
      solutionId: props.solutionId,
    });

    crossAccountStack.centralAssumeRolePolicy.attachToRole(props.microBatchStack.microBatchLambdaStack.PipelineResourcesBuilderStack.PipelineResourcesBuilderRole);

    // Create a common orchestration flow for CloudFormation deployment
    const cfnFlow = new CfnFlowStack(this, 'CfnFlow', {
      subAccountLinkTable: crossAccountStack.subAccountLinkTable,
      stackPrefix: props.stackPrefix,
      solutionId: props.solutionId,
      microBatchStack: props.microBatchStack,
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

    // Create grafana stack
    const grafanaStack = new GrafanaStack(this, 'GrafanaAPI', {
      graphqlApi: apiStack.graphqlApi,
      solutionId: props.solutionId,
      stackPrefix: props.stackPrefix,
      microBatchStack: props.microBatchStack,
    });

    // Create the Service Pipeline APIs stack
    const svcPipelineStack = new SvcPipelineStack(this, 'SvcPipelineAPI', {
      graphqlApi: apiStack.graphqlApi,
      cfnFlowSMArn: cfnFlowSMArn,
      subAccountLinkTable: crossAccountStack.subAccountLinkTable,
      grafanaTable: grafanaStack.grafanaTable,
      centralAssumeRolePolicy: crossAccountStack.centralAssumeRolePolicy,
      solutionId: props.solutionId,
      stackPrefix: props.stackPrefix,
      microBatchStack: props.microBatchStack
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
      aosMasterRole: props.aosMasterRole,
      graphqlApi: apiStack.graphqlApi,
      cfnFlowSMArn: cfnFlowSMArn,
      vpc: props.vpc,
      subnetIds: props.subnetIds,
      processSg: props.processSg,
      centralAssumeRolePolicy: crossAccountStack.centralAssumeRolePolicy,
      solutionId: props.solutionId,
      stackPrefix: props.stackPrefix,
      logConfigTable: appTableStack.logConfTable,
      appPipelineTable: appTableStack.appPipelineTable,
      appLogIngestionTable: appTableStack.appLogIngestionTable,
      grafanaTable: grafanaStack.grafanaTable,
      microBatchStack: props.microBatchStack,
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
    const clusterStack = this.clusterStack = new ClusterStack(this, 'ClusterAPI', {
      graphqlApi: apiStack.graphqlApi,
      aosMasterRole: props.aosMasterRole,
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

    Ec2IamInstanceProfile.Ec2IamInstanceProfilePolicy.addStatements(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          "sts:AssumeRole",
        ],
        resources: [
          props.microBatchStack.microBatchIAMStack.AthenaPublicAccessRole.roleArn
        ],
      }),);

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
        instanceIngestionDetailTable: appTableStack.instanceIngestionDetailTable,
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
        flbConfUploadingEventQueue: props.flbConfUploadingEventQueue,
        microBatchStack: props.microBatchStack,
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
        microBatchStack: props.microBatchStack,
      }
    );
    //Create the FluentBit Configuration stack
    /* NOSONAR */ new FluentBitConfigStack(this, 'FluentBitConfigAPI', {
      stackPrefix: props.stackPrefix,
    });
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
