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

import * as path from 'path';
import { Database } from '@aws-cdk/aws-glue-alpha';
import {
  Aws,
  SymlinkFollowMode,
  StackProps,
  Fn,
  Aspects,
  IAspect,
  CfnParameter,
  Duration,
  CfnOutput,
  CustomResource,
  CfnCustomResource,
  custom_resources as cr,
  aws_ec2 as ec2,
  aws_s3 as s3,
  aws_iam as iam,
  aws_dynamodb as ddb,
  aws_lambda as lambda,
  aws_kms as kms,
  aws_sqs as sqs,
  aws_ssm as ssm,
} from 'aws-cdk-lib';
import { CfnPolicy } from 'aws-cdk-lib/aws-iam';
import { SqsEventSource } from 'aws-cdk-lib/aws-lambda-event-sources';
import { NagSuppressions } from 'cdk-nag';
import { Construct, IConstruct } from 'constructs';

export interface InitLogPipelineResourcesProps extends StackProps {
  readonly solutionId: string;
  readonly solutionName: string;
  readonly solutionDesc: string;

  readonly paramGroups: any[];
  readonly sourceType: string;
  readonly pipelineId: string;
  readonly stagingBucketPrefix: string;
  readonly centralizedBucketName: string;
  readonly centralizedBucketPrefix: string;
  readonly centralizedTableName: string;
  readonly centralizedTableSchema: string;
  readonly centralizedMetricsTableName: string;
  readonly centralizedMetricsTableSchema: string;

  readonly logProcessorSchedule: string;
  readonly logMergerSchedule: string;
  readonly logArchiveSchedule: string;
  readonly logMergerAge: number;
  readonly logArchiveAge: number;

  readonly notificationService: string;
  readonly recipients: string;

  readonly sourceSchema: string;
  readonly sourceDataFormat: string;
  readonly sourceTableProperties: string;
  readonly sourceSerializationProperties: string;

  readonly importDashboards: string;
  readonly grafanaUrl: string;
  readonly grafanaToken: string;

  readonly enrichmentPlugins: string;
}

export class InitLogPipelineResourcesStack extends Construct {
  constructor(
    scope: Construct,
    id: string,
    props: InitLogPipelineResourcesProps
  ) {
    super(scope, id);

    const solutionId = props.solutionId;
    const paramGroups = props.paramGroups;
    const sourceType = props.sourceType;
    const pipelineId = props.pipelineId;
    const stagingBucketPrefix = props.stagingBucketPrefix;
    const centralizedBucketName = props.centralizedBucketName;
    const centralizedBucketPrefix = props.centralizedBucketPrefix;
    const centralizedTableName = props.centralizedTableName;
    const centralizedTableSchema = props.centralizedTableSchema;
    const centralizedMetricsTableName = props.centralizedMetricsTableName;
    const centralizedMetricsTableSchema = props.centralizedMetricsTableSchema;
    const logMergerAge = props.logMergerAge;
    const logArchiveAge = props.logArchiveAge;
    const logProcessorSchedule = props.logProcessorSchedule;
    const logMergerSchedule = props.logMergerSchedule;
    const logArchiveSchedule = props.logArchiveSchedule;

    const notificationService = props.notificationService;
    const recipients = props.recipients;

    const sourceSchema = props.sourceSchema;
    const sourceDataFormat = props.sourceDataFormat;
    const sourceTableProperties = props.sourceTableProperties;
    const sourceSerializationProperties = props.sourceSerializationProperties;
    const importDashboards = props.importDashboards;
    const grafanaUrl = props.grafanaUrl;
    const grafanaToken = props.grafanaToken;

    const enrichmentPlugins = props.enrichmentPlugins;

    const microBatchStackName = ssm.StringParameter.fromStringParameterName(
      this,
      'MicroBatchStackName',
      '/MicroBatch/StackName'
    ).stringValue;

    const StagingBucketName = Fn.importValue(
      `${microBatchStackName}::StagingBucketName`
    );
    const stagingBucket = s3.Bucket.fromBucketName(
      this,
      'StagingBucket',
      StagingBucketName
    );

    const centralizedDatabaseArn = ssm.StringParameter.fromStringParameterName(
      this,
      'SSMCentralizedDatabaseArn',
      '/MicroBatch/CentralizedDatabaseArn'
    ).stringValue;
    const centralizedDatabase = Database.fromDatabaseArn(
      this,
      'CentralizedDatabase',
      centralizedDatabaseArn
    );

    const microBatchKeyArn = ssm.StringParameter.fromStringParameterName(
      this,
      'SSMCMKeyArn',
      '/MicroBatch/CMKeyArn'
    ).stringValue;
    const microBatchKey = kms.Key.fromKeyArn(
      this,
      'MicroBatchKey',
      microBatchKeyArn
    );

    const KMSPublicAccessPolicyArn = Fn.importValue(
      `${microBatchStackName}::KMSPublicAccessPolicyArn`
    );
    const KMSPublicAccessPolicy = iam.ManagedPolicy.fromManagedPolicyArn(
      this,
      'KMSPublicAccessPolicy',
      KMSPublicAccessPolicyArn
    );

    const microBatchLambdaUtilsLayerArn =
      ssm.StringParameter.fromStringParameterName(
        this,
        'SSMLambdaUtilsLayerArn',
        '/MicroBatch/LambdaUtilsLayerArn'
      ).stringValue;
    const microBatchLambdaUtilsLayer = lambda.LayerVersion.fromLayerVersionArn(
      this,
      'LambdaUtilsLayer',
      microBatchLambdaUtilsLayerArn
    );

    const microBatchLambdaEnrichmentLayerArn =
      ssm.StringParameter.fromStringParameterName(
        this,
        'SSMLambdaEnrichmentLayerArn',
        '/MicroBatch/LambdaEnrichmentLayerArn'
      ).stringValue;
    const microBatchLambdaEnrichmentLayer =
      lambda.LayerVersion.fromLayerVersionArn(
        this,
        'LambdaEnrichmentLayer',
        microBatchLambdaEnrichmentLayerArn
      );

    const pipelineResourcesBuilderArn = Fn.importValue(
      `${microBatchStackName}::PipelineResourcesBuilderArn`
    );
    const pipelineResourcesBuilderFunctionName = Fn.select(
      6,
      Fn.split(':', pipelineResourcesBuilderArn)
    );
    const pipelineResourcesBuilder = lambda.Function.fromFunctionName(
      this,
      'PipelineResourcesBuilder',
      pipelineResourcesBuilderFunctionName
    );

    const pipelineResourcesBuilderRoleArn = Fn.importValue(
      `${microBatchStackName}::PipelineResourcesBuilderRoleArn`
    );
    const pipelineResourcesBuilderRole = iam.Role.fromRoleArn(
      this,
      'PipelineResourcesBuilderRole',
      pipelineResourcesBuilderRoleArn
    );

    const metadataTableArn = Fn.importValue(
      `${microBatchStackName}::MetadataTableArn`
    );
    const metadataTable = ddb.Table.fromTableArn(
      this,
      'MetadataTable',
      metadataTableArn
    );

    const virtualPrivateCloud = ssm.StringParameter.fromStringParameterName(
      this,
      'SSMVpcId',
      '/MicroBatch/VpcId'
    ).stringValue;
    const privateSubnetIds = ssm.StringParameter.fromStringParameterName(
      this,
      'SSMPrivateSubnetIds',
      '/MicroBatch/PrivateSubnetIds'
    ).stringValue;

    const vpc = ec2.Vpc.fromVpcAttributes(this, 'vpc', {
      vpcId: virtualPrivateCloud,
      availabilityZones: Fn.getAzs(),
      privateSubnetIds: Fn.split(',', privateSubnetIds),
    });

    const securityGroupId = Fn.importValue(
      `${microBatchStackName}::PrivateSecurityGroupId`
    );
    const securityGroup = ec2.SecurityGroup.fromSecurityGroupId(
      this,
      'securityGroup',
      securityGroupId
    );

    Aspects.of(this).add(
      new UpdateSSMStringParameterMetadata(
        paramGroups,
        'Parameter Store settings'
      )
    );

    // Create a Dead-letter queue for S3 Object Migration
    const LogEventDLQ = new sqs.Queue(this, 'LogEventDLQ', {
      visibilityTimeout: Duration.minutes(15),
      retentionPeriod: Duration.days(7),
      encryption: sqs.QueueEncryption.KMS,
      encryptionMasterKey: microBatchKey,
    });

    // Override the logical ID
    const cfnLogEventDLQ = LogEventDLQ.node.defaultChild as sqs.CfnQueue;
    cfnLogEventDLQ.overrideLogicalId('LogEventDLQ');

    const LogEventDLQPolicy = new sqs.CfnQueuePolicy(
      this,
      'LogEventDLQPolicy',
      {
        queues: [LogEventDLQ.queueName],
        policyDocument: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              sid: '__owner_statement',
              actions: ['SQS:SendMessage'],
              effect: iam.Effect.ALLOW,
              resources: [LogEventDLQ.queueArn],
              principals: [new iam.AccountRootPrincipal()],
            }),
          ],
        }),
      }
    );

    LogEventDLQPolicy.overrideLogicalId('LogEventDLQPolicy');

    NagSuppressions.addResourceSuppressions(LogEventDLQ, [
      {
        id: 'AwsSolutions-SQS3',
        reason: 'SQS: LogEventDLQ is a DLQ.',
      },
      {
        id: 'AwsSolutions-SQS4',
        reason: 'SQS: The SQS queue does not require requests to use SSL.',
      },
    ]);

    // Create a SQS for S3 Object Migration
    const LogEventQueue = new sqs.Queue(this, 'LogEventQueue', {
      visibilityTimeout: Duration.minutes(15),
      retentionPeriod: Duration.days(7),
      deadLetterQueue: {
        queue: LogEventDLQ,
        maxReceiveCount: 3,
      },
      encryption: sqs.QueueEncryption.KMS,
      encryptionMasterKey: microBatchKey,
    });

    // Override the logical ID
    const cfnLogEventQueue = LogEventQueue.node.defaultChild as sqs.CfnQueue;
    cfnLogEventQueue.overrideLogicalId('LogEventQueue');

    new CfnOutput(this, 'LogEventQueueName', {
      value: LogEventQueue.queueName,
    }).overrideLogicalId('LogEventQueueName');

    const LogEventQueuePolicy = new sqs.CfnQueuePolicy(
      this,
      'LogEventQueuePolicy',
      {
        queues: [LogEventQueue.queueName],
        policyDocument: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              sid: '__owner_statement',
              actions: ['SQS:SendMessage'],
              effect: iam.Effect.ALLOW,
              resources: [LogEventQueue.queueArn],
              principals: [new iam.AccountRootPrincipal()],
            }),
          ],
        }),
      }
    );

    LogEventQueuePolicy.overrideLogicalId('LogEventQueuePolicy');

    NagSuppressions.addResourceSuppressions(LogEventQueue, [
      {
        id: 'AwsSolutions-SQS4',
        reason: 'SQS: The SQS queue does not require requests to use SSL.',
      },
    ]);

    const S3ObjectsReplicationPolicy = new iam.Policy(
      this,
      'S3ObjectsReplicationPolicy',
      {
        statements: [
          new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: ['dynamodb:GetItem', 'dynamodb:Scan'],
            resources: [metadataTable.tableArn],
          }),
          new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: ['s3:PutObject', 's3:PutObjectTagging'],
            resources: [
              `${stagingBucket.bucketArn}`,
              `${stagingBucket.bucketArn}/*`,
            ],
          }),
          new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
              'sqs:ReceiveMessage',
              'sqs:DeleteMessage',
              'sqs:GetQueueAttributes',
              'sqs:ChangeMessageVisibility',
              'sqs:GetQueueUrl',
            ],
            resources: [`${LogEventQueue.queueArn}`, `${LogEventDLQ.queueArn}`],
          }),
        ],
      }
    );

    // Override the logical ID
    const cfnS3ObjectsReplicationPolicy = S3ObjectsReplicationPolicy.node
      .defaultChild as iam.CfnPolicy;
    cfnS3ObjectsReplicationPolicy.overrideLogicalId(
      'S3ObjectsReplicationPolicy'
    );

    const S3ObjectReplicationRole = new iam.Role(
      this,
      'S3ObjectReplicationRole',
      {
        assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      }
    );

    // Override the logical ID
    const cfnS3ObjectReplicationRole = S3ObjectReplicationRole.node
      .defaultChild as iam.CfnRole;
    cfnS3ObjectReplicationRole.overrideLogicalId('S3ObjectReplicationRole');

    S3ObjectReplicationRole.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName(
        'service-role/AWSLambdaBasicExecutionRole'
      )
    );
    S3ObjectReplicationRole.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName(
        'service-role/AWSLambdaVPCAccessExecutionRole'
      )
    );
    S3ObjectReplicationRole.addManagedPolicy(KMSPublicAccessPolicy);
    S3ObjectReplicationRole.attachInlinePolicy(S3ObjectsReplicationPolicy);

    const inlinePolicyForPipeline = new iam.Policy(
      this,
      'InlinePolicyForPipeline',
      {
        policyName: `InlinePolicyForPipeline-${Aws.STACK_NAME}`,
        statements: [
          new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
              'iam:DeleteRolePolicy',
              'iam:PutRolePolicy',
              'iam:GetRolePolicy',
            ],
            resources: [S3ObjectReplicationRole.roleArn],
          }),
        ],
      }
    );

    // Override the logical ID
    const cfnInlinePolicyForPipeline = inlinePolicyForPipeline.node
      .defaultChild as CfnPolicy;
    cfnInlinePolicyForPipeline.overrideLogicalId('InlinePolicyForPipeline');

    pipelineResourcesBuilderRole.attachInlinePolicy(inlinePolicyForPipeline);

    const S3ObjectReplication = new lambda.Function(
      this,
      'S3ObjectReplication',
      {
        code: lambda.AssetCode.fromAsset(
          path.join(
            __dirname,
            '../../../lambda/microbatch/s3_object_replication'
          ),
          { followSymlinks: SymlinkFollowMode.ALWAYS }
        ),
        runtime: lambda.Runtime.PYTHON_3_11,
        handler: 'lambda_function.lambda_handler',
        timeout: Duration.minutes(15),
        memorySize: 128,
        architecture: lambda.Architecture.X86_64,
        role: S3ObjectReplicationRole,
        layers: [microBatchLambdaUtilsLayer, microBatchLambdaEnrichmentLayer],
        vpc: vpc,
        vpcSubnets: {
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
        },
        securityGroups: [securityGroup],
        environment: {
          SOLUTION_VERSION: process.env.VERSION || 'v1.0.0',
          SOLUTION_ID: solutionId,
          PIPELINE_ID: pipelineId,
          STAGING_BUCKET_NAME: stagingBucket.bucketName,
          STAGING_BUCKET_PREFIX: stagingBucketPrefix,
          ENRICHMENT_PLUGINS: enrichmentPlugins,
          SOURCE_TYPE: sourceType,
          META_TABLE_NAME: metadataTable.tableName,
        },
        description: `${Aws.STACK_NAME} - Lambda function to copy objects from source bucket to staging bucket.`,
      }
    );

    // Override the logical ID
    const cfnS3ObjectReplication = S3ObjectReplication.node
      .defaultChild as lambda.CfnFunction;
    cfnS3ObjectReplication.overrideLogicalId('S3ObjectReplication');

    S3ObjectReplication.node.addDependency(inlinePolicyForPipeline);
    S3ObjectReplication.node.addDependency(S3ObjectsReplicationPolicy);

    const S3ObjectReplicationEventSource = new SqsEventSource(LogEventQueue, {
      batchSize: 10,
    });
    S3ObjectReplication.addEventSource(S3ObjectReplicationEventSource);

    S3ObjectReplication.addPermission('EventsResourceBasedPolicy', {
      action: 'lambda:InvokeFunction',
      principal: new iam.ServicePrincipal('events.amazonaws.com'),
      sourceArn: `arn:${Aws.PARTITION}:events:${Aws.REGION}:${Aws.ACCOUNT_ID}:rule/S3EventDriver-*`,
    });

    new CfnOutput(this, 'ProcessorLogGroupName', {
      value: S3ObjectReplication.logGroup.logGroupName,
    }).overrideLogicalId('ProcessorLogGroupName');

    let connector = undefined;
    let connectorRole = undefined;
    let invokeConnectorRole = undefined;

    if ('rds'.includes(sourceType)) {
      const connectorPolicy = new iam.Policy(this, 'ConnectorPolicy', {
        statements: [
          new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: ['dynamodb:GetItem', 'dynamodb:UpdateItem'],
            resources: [metadataTable.tableArn],
          }),
          new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: ['kms:GenerateDataKey*', 'kms:Decrypt', 'kms:Encrypt'],
            resources: [
              `arn:${Aws.PARTITION}:kms:${Aws.REGION}:${Aws.ACCOUNT_ID}:key/*`,
            ],
          }),
        ],
      });

      // Override the logical ID
      const cfnConnectorPolicy = connectorPolicy.node
        .defaultChild as iam.CfnPolicy;
      cfnConnectorPolicy.overrideLogicalId('ConnectorPolicy');

      connectorRole = new iam.Role(this, 'ConnectorRole', {
        assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      });

      // Override the logical ID
      const cfnConnectorRole = connectorRole.node.defaultChild as iam.CfnRole;
      cfnConnectorRole.overrideLogicalId('ConnectorRole');

      connectorRole.addManagedPolicy(
        iam.ManagedPolicy.fromAwsManagedPolicyName(
          'service-role/AWSLambdaBasicExecutionRole'
        )
      );
      connectorRole.addManagedPolicy(
        iam.ManagedPolicy.fromAwsManagedPolicyName(
          'service-role/AWSLambdaVPCAccessExecutionRole'
        )
      );
      connectorRole.addManagedPolicy(
        iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonS3FullAccess')
      );
      connectorRole.addManagedPolicy(KMSPublicAccessPolicy);
      connectorRole.attachInlinePolicy(connectorPolicy);

      connector = new lambda.Function(this, 'Connector', {
        code: lambda.AssetCode.fromAsset(
          path.join(__dirname, '../../../lambda/microbatch/connector'),
          { followSymlinks: SymlinkFollowMode.ALWAYS }
        ),
        runtime: lambda.Runtime.PYTHON_3_11,
        handler: 'lambda_function.lambda_handler',
        timeout: Duration.minutes(15),
        memorySize: 128,
        architecture: lambda.Architecture.X86_64,
        role: connectorRole,
        layers: [microBatchLambdaUtilsLayer, microBatchLambdaEnrichmentLayer],
        vpc: vpc,
        vpcSubnets: {
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
        },
        securityGroups: [securityGroup],
        environment: {
          SOLUTION_VERSION: process.env.VERSION || 'v1.0.0',
          SOLUTION_ID: solutionId,
          META_TABLE_NAME: metadataTable.tableName,
        },
        description: `${Aws.STACK_NAME} - Lambda function to collect ${sourceType} logs to logging bucket.`,
      });

      // Override the logical ID
      const cfnConnector = connector.node.defaultChild as lambda.CfnFunction;
      cfnConnector.overrideLogicalId('Connector');

      connector.addPermission('EventsResourceBasedPolicy', {
        action: 'lambda:InvokeFunction',
        principal: new iam.ServicePrincipal('events.amazonaws.com'),
        sourceArn: `arn:${Aws.PARTITION}:events:${Aws.REGION}:${Aws.ACCOUNT_ID}:rule/Connector-*`,
      });

      invokeConnectorRole = new iam.Role(this, 'InvokeConnectorRole', {
        assumedBy: new iam.ServicePrincipal('events.amazonaws.com'),
      });

      // Override the logical ID
      const cfnInvokeConnectorRole = invokeConnectorRole.node
        .defaultChild as iam.CfnRole;
      cfnInvokeConnectorRole.overrideLogicalId('InvokeConnectorRole');

      const invokeConnectorPolicy = new iam.Policy(
        this,
        'InvokeConnectorPolicy',
        {
          statements: [
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: ['lambda:InvokeFunction'],
              resources: [connector.functionArn, `${connector.functionArn}:*`],
            }),
          ],
        }
      );

      // Override the logical ID
      const cfnInvokeConnectorPolicy = invokeConnectorPolicy.node
        .defaultChild as iam.CfnPolicy;
      cfnInvokeConnectorPolicy.overrideLogicalId('InvokeConnectorPolicy');

      invokeConnectorRole.attachInlinePolicy(invokeConnectorPolicy);

      inlinePolicyForPipeline.addStatements(
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: [
            'iam:GetRole',
            'iam:PassRole',
            'iam:UpdateAssumeRolePolicy',
          ],
          resources: [invokeConnectorRole.roleArn],
        })
      );

      inlinePolicyForPipeline.addStatements(
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: [
            'iam:DeleteRolePolicy',
            'iam:PutRolePolicy',
            'iam:GetRolePolicy',
          ],
          resources: [connectorRole.roleArn],
        })
      );

      switch (sourceType) {
        case 'rds': {
          connectorPolicy.addStatements(
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                'rds:DownloadDBLogFilePortion',
                'rds:DescribeDBInstances',
                'rds:DescribeDBLogFiles',
                'rds:DescribeDBClusters',
              ],
              resources: [
                `arn:${Aws.PARTITION}:rds:${Aws.REGION}:${Aws.ACCOUNT_ID}:cluster:*`,
                `arn:${Aws.PARTITION}:rds:${Aws.REGION}:${Aws.ACCOUNT_ID}:db:*`,
              ],
            })
          );
          break;
        }
      }
    }

    const pipelineResourcesBuilderProvider = new cr.Provider(this, 'Provider', {
      onEventHandler: pipelineResourcesBuilder,
      providerFunctionName: `${Aws.STACK_NAME.substring(0, 40)}-Provider`,
    });

    const pipelineCustomResource = new CustomResource(this, 'CustomResource', {
      serviceToken: pipelineResourcesBuilderProvider.serviceToken,
      properties: {
        Id: pipelineId,
        Resource: 'pipeline',
        Item: {
          metaName: pipelineId,
          type: 'Pipeline',
          data: {
            source: {
              type: sourceType,
              table: {
                schema: sourceSchema,
                dataFormat: sourceDataFormat,
                tableProperties: sourceTableProperties,
                serializationProperties: sourceSerializationProperties,
              },
            },
            staging: {
              prefix: stagingBucketPrefix,
            },
            destination: {
              location: {
                bucket: centralizedBucketName,
                prefix: centralizedBucketPrefix,
              },
              database: {
                name: centralizedDatabase.databaseName,
              },
              table: {
                name: centralizedTableName,
                schema: centralizedTableSchema,
              },
              metrics: {
                name: centralizedMetricsTableName,
                schema: centralizedMetricsTableSchema,
              },
              enrichmentPlugins: enrichmentPlugins,
            },
            scheduler: {
              service: 'scheduler',
              LogProcessor: {
                schedule: logProcessorSchedule,
              },
              LogMerger: {
                schedule: logMergerSchedule,
                age: logMergerAge,
              },
              LogArchive: {
                schedule: logArchiveSchedule,
                age: logArchiveAge,
              },
            },
            notification: {
              service: notificationService,
              recipients: recipients,
            },
            grafana: {
              importDashboards: importDashboards,
              url: grafanaUrl,
              token: grafanaToken,
            },
          },
          stack: {
            role: {
              replicate: S3ObjectReplicationRole.roleArn,
              connector:
                typeof connectorRole !== 'undefined'
                  ? connectorRole.roleArn
                  : '',
              invokeConnector:
                typeof invokeConnectorRole !== 'undefined'
                  ? invokeConnectorRole.roleArn
                  : '',
            },
            queue: {
              logEventDLQ: LogEventDLQ.queueArn,
              logEventQueue: LogEventQueue.queueArn,
            },
            lambda: {
              replicate: S3ObjectReplication.functionArn,
              connector:
                typeof connector !== 'undefined' ? connector.functionArn : '',
            },
            stackId: `${Aws.STACK_ID}`,
          },
        },
      },
    });

    // Override the logical ID
    const cfnPipelineCustomResource = pipelineCustomResource.node
      .defaultChild as CfnCustomResource;
    cfnPipelineCustomResource.overrideLogicalId('CustomResource');

    cfnPipelineCustomResource.addDependency(LogEventDLQPolicy);
    cfnPipelineCustomResource.addDependency(LogEventQueuePolicy);
    cfnPipelineCustomResource.addDependency(cfnLogEventQueue);
    cfnPipelineCustomResource.addDependency(cfnLogEventDLQ);
    cfnPipelineCustomResource.addDependency(cfnS3ObjectReplication);
  }
}

export class UpdateSSMStringParameterMetadata implements IAspect {
  private mapping = {
    'MicroBatchStackName.Parameter': {
      logicalId: 'MicroBatchStackName',
      description:
        'The Name of Main Stack, automatically retrieved from SSM Parameter Store. [/MicroBatch/StackName].',
    },
    'SSMVpcId.Parameter': {
      logicalId: 'VpcId',
      description:
        'The id of Virtual Private Cloud, automatically retrieved from SSM Parameter Store. [/MicroBatch/VpcId].',
    },
    'SSMPrivateSubnetIds.Parameter': {
      logicalId: 'PrivateSubnetIds',
      description:
        'The ids of Private Subnet, automatically retrieved from SSM Parameter Store. [/MicroBatch/PrivateSubnetIds].',
    },
    'SSMCentralizedDatabaseArn.Parameter': {
      logicalId: 'CentralizedDatabaseArn',
      description:
        'The database arn of centralized, automatically retrieved from SSM Parameter Store. [/MicroBatch/CentralizedDatabaseArn].',
    },
    'SSMCMKeyArn.Parameter': {
      logicalId: 'CMKeyArn',
      description:
        'The key ARN for a KMS key, automatically retrieved from SSM Parameter Store. [/MicroBatch/CMKeyArn].',
    },
    'SSMLambdaUtilsLayerArn.Parameter': {
      logicalId: 'LambdaUtilsLayerArn',
      description:
        'The ARN of Lambda Layer., automatically retrieved from SSM Parameter Store. [/MicroBatch/LambdaUtilsLayerArn].',
    },
    'SSMLambdaEnrichmentLayerArn.Parameter': {
      logicalId: 'LambdaEnrichmentLayerArn',
      description:
        'The ARN of Lambda Layer., automatically retrieved from SSM Parameter Store. [/MicroBatch/LambdaEnrichmentLayerArn].',
    },
  };
  public constructor(
    private paramGroups: Record<string, any>[],
    private label: string
  ) {}

  public visit(node: IConstruct): void {
    let nodeLogicalId: string | undefined;

    Object.entries(this.mapping).some(([id, { logicalId, description }]) => {
      if (node instanceof CfnParameter && node.node.id == id) {
        node.overrideLogicalId(logicalId);
        node.description = description;
        nodeLogicalId = node.logicalId;
        return true;
      }
      return false;
    });

    if (!nodeLogicalId) return;

    const target = this.paramGroups.find(
      ({ Label }) => Label.default === this.label
    );
    if (!target) {
      this.paramGroups.push({
        Label: { default: this.label },
        Parameters: [nodeLogicalId],
      });
    } else {
      target.Parameters.push(nodeLogicalId);
    }
  }
}
