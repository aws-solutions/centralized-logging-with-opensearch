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

import { Construct, IConstruct } from "constructs";
import * as path from "path";
import {
  Aws,
  SymlinkFollowMode,
  Aspects,
  IAspect,
  CfnParameter,
  StackProps,
  Fn,
  Duration,
  CfnOutput,
  CustomResource,
  CfnCustomResource,
  custom_resources as cr,
  aws_s3 as s3,
  aws_iam as iam,
  aws_dynamodb as ddb,
  aws_lambda as lambda,
  aws_kms as kms,
  aws_sqs as sqs,
  aws_ssm as ssm,
} from "aws-cdk-lib";
import { SqsEventSource } from "aws-cdk-lib/aws-lambda-event-sources";
import { Database } from "@aws-cdk/aws-glue-alpha";
import { NagSuppressions } from "cdk-nag";
import { CfnPolicy } from "aws-cdk-lib/aws-iam";

const { VERSION } = process.env;

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

    const StagingBucketName = ssm.StringParameter.fromStringParameterName(
      this,
      "SSMStagingBucketName",
      "/MicroBatch/StagingBucketName"
    ).stringValue;
    const stagingBucket = s3.Bucket.fromBucketName(
      this,
      "StagingBucket",
      StagingBucketName
    );

    const centralizedDatabaseArn = ssm.StringParameter.fromStringParameterName(
      this,
      "SSMCentralizedDatabaseArn",
      "/MicroBatch/CentralizedDatabaseArn"
    ).stringValue;
    const centralizedDatabase = Database.fromDatabaseArn(
      this,
      "CentralizedDatabase",
      centralizedDatabaseArn
    );

    const microBatchKeyArn = ssm.StringParameter.fromStringParameterName(
      this,
      "SSMCMKeyArn",
      "/MicroBatch/CMKeyArn"
    ).stringValue;
    const microBatchKey = kms.Key.fromKeyArn(
      this,
      "MicroBatchKey",
      microBatchKeyArn
    );

    const KMSPublicAccessPolicyArn =
      ssm.StringParameter.fromStringParameterName(
        this,
        "SSMKMSPublicAccessPolicyArn",
        "/MicroBatch/KMSPublicAccessPolicyArn"
      ).stringValue;
    const KMSPublicAccessPolicy = iam.ManagedPolicy.fromManagedPolicyArn(
      this,
      "KMSPublicAccessPolicy",
      KMSPublicAccessPolicyArn
    );

    const microBatchLambdaUtilsLayerArn =
      ssm.StringParameter.fromStringParameterName(
        this,
        "SSMLambdaUtilsLayerArn",
        "/MicroBatch/LambdaUtilsLayerArn"
      ).stringValue;
    const microBatchLambdaUtilsLayer = lambda.LayerVersion.fromLayerVersionArn(
      this,
      "LambdaUtilsLayer",
      microBatchLambdaUtilsLayerArn
    );

    const microBatchLambdaEnrichmentLayerArn =
      ssm.StringParameter.fromStringParameterName(
        this,
        "SSMLambdaEnrichmentLayerArn",
        "/MicroBatch/LambdaEnrichmentLayerArn"
      ).stringValue;
    const microBatchLambdaEnrichmentLayer =
      lambda.LayerVersion.fromLayerVersionArn(
        this,
        "LambdaEnrichmentLayer",
        microBatchLambdaEnrichmentLayerArn
      );

    const pipelineResourcesBuilderArn =
      ssm.StringParameter.fromStringParameterName(
        this,
        "SSMPipelineResourcesBuilderArn",
        "/MicroBatch/PipelineResourcesBuilderArn"
      ).stringValue;
    const pipelineResourcesBuilderFunctionName = Fn.select(
      6,
      Fn.split(":", pipelineResourcesBuilderArn)
    );
    const pipelineResourcesBuilder = lambda.Function.fromFunctionName(
      this,
      "PipelineResourcesBuilder",
      pipelineResourcesBuilderFunctionName
    );

    const pipelineResourcesBuilderRoleArn =
      ssm.StringParameter.fromStringParameterName(
        this,
        "SSMPipelineResourcesBuilderRoleArn",
        "/MicroBatch/PipelineResourcesBuilderRoleArn"
      ).stringValue;
    const pipelineResourcesBuilderRole = iam.Role.fromRoleArn(
      this,
      "PipelineResourcesBuilderRole",
      pipelineResourcesBuilderRoleArn
    );

    const metadataTableArn =
      ssm.StringParameter.fromStringParameterName(
        this,
        "SSMMetadataTableArn",
        "/MicroBatch/MetadataTableArn"
      ).stringValue;
    const metadataTable = ddb.Table.fromTableArn(this,
      "MetadataTable",
      metadataTableArn
      );

    Aspects.of(this).add(
      new UpdateSSMStringParameterMetadata(
        paramGroups,
        "Parameter Store settings"
      )
    );

    // Create a Dead-letter queue for S3 Object Migration
    const LogEventDLQ = new sqs.Queue(this, "LogEventDLQ", {
      visibilityTimeout: Duration.minutes(15),
      retentionPeriod: Duration.days(7),
      encryption: sqs.QueueEncryption.KMS,
      encryptionMasterKey: microBatchKey,
    });

    // Override the logical ID
    const cfnLogEventDLQ = LogEventDLQ.node.defaultChild as sqs.CfnQueue;
    cfnLogEventDLQ.overrideLogicalId("LogEventDLQ");

    const LogEventDLQPolicy = new sqs.CfnQueuePolicy(
      this,
      "LogEventDLQPolicy",
      {
        queues: [LogEventDLQ.queueName],
        policyDocument: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              sid: "__owner_statement",
              actions: ["SQS:SendMessage"],
              effect: iam.Effect.ALLOW,
              resources: [LogEventDLQ.queueArn],
              principals: [new iam.AccountRootPrincipal()],
            }),
          ],
        }),
      }
    );

    LogEventDLQPolicy.overrideLogicalId("LogEventDLQPolicy");

    NagSuppressions.addResourceSuppressions(LogEventDLQ, [
      {
        id: "AwsSolutions-SQS3",
        reason: "SQS: LogEventDLQ is a DLQ.",
      },
      {
        id: "AwsSolutions-SQS4",
        reason: "SQS: The SQS queue does not require requests to use SSL.",
      },
    ]);

    // Create a SQS for S3 Object Migration
    const LogEventQueue = new sqs.Queue(this, "LogEventQueue", {
      visibilityTimeout: Duration.minutes(15),
      retentionPeriod: Duration.days(7),
      deadLetterQueue: {
        queue: LogEventDLQ,
        maxReceiveCount: 30,
      },
      encryption: sqs.QueueEncryption.KMS,
      encryptionMasterKey: microBatchKey,
    });

    // Override the logical ID
    const cfnLogEventQueue = LogEventQueue.node.defaultChild as sqs.CfnQueue;
    cfnLogEventQueue.overrideLogicalId("LogEventQueue");

    new CfnOutput(this, 'LogEventQueueName', {
      value: LogEventQueue.queueName,
    }).overrideLogicalId('LogEventQueueName');

    const LogEventQueuePolicy = new sqs.CfnQueuePolicy(
      this,
      "LogEventQueuePolicy",
      {
        queues: [LogEventQueue.queueName],
        policyDocument: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              sid: "__owner_statement",
              actions: ["SQS:SendMessage"],
              effect: iam.Effect.ALLOW,
              resources: [LogEventQueue.queueArn],
              principals: [new iam.AccountRootPrincipal()],
            }),
          ],
        }),
      }
    );

    LogEventQueuePolicy.overrideLogicalId("LogEventQueuePolicy");

    NagSuppressions.addResourceSuppressions(LogEventQueue, [
      {
        id: "AwsSolutions-SQS4",
        reason: "SQS: The SQS queue does not require requests to use SSL.",
      },
    ]);

    const S3ObjectsReplicationPolicy = new iam.Policy(
      this,
      "S3ObjectsReplicationPolicy",
      {
        statements: [
          new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
              "dynamodb:GetItem",
            ],
            resources: [
              metadataTable.tableArn
            ],
          }),
          new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
              "s3:PutObject",
              "s3:PutObjectTagging",
            ],
            resources: [
              `${stagingBucket.bucketArn}`,
              `${stagingBucket.bucketArn}/*`,
            ],
          }),
          new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
              "sqs:ReceiveMessage",
              "sqs:DeleteMessage",
              "sqs:GetQueueAttributes",
              "sqs:ChangeMessageVisibility",
              "sqs:GetQueueUrl",
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
      "S3ObjectsReplicationPolicy"
    );

    const S3ObjectReplicationRole = new iam.Role(
      this,
      "S3ObjectReplicationRole",
      {
        assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
      }
    );

    // Override the logical ID
    const cfnS3ObjectReplicationRole = S3ObjectReplicationRole.node
      .defaultChild as iam.CfnRole;
    cfnS3ObjectReplicationRole.overrideLogicalId("S3ObjectReplicationRole");

    S3ObjectReplicationRole.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName(
        "service-role/AWSLambdaBasicExecutionRole"
      )
    );
    S3ObjectReplicationRole.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName(
        "service-role/AWSLambdaVPCAccessExecutionRole"
      )
    );
    S3ObjectReplicationRole.addManagedPolicy(KMSPublicAccessPolicy);
    S3ObjectReplicationRole.attachInlinePolicy(S3ObjectsReplicationPolicy);

    const attachPolicyForS3Replicate = new iam.Policy(
      this,
      "AttachPolicyForS3Replicate",
      {
        policyName: `AttachPolicyForS3Replicate-${Aws.STACK_NAME}`,
        statements: [
          new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
              "iam:DeleteRolePolicy",
              "iam:PutRolePolicy",
              "iam:GetRolePolicy",
            ],
            resources: [S3ObjectReplicationRole.roleArn],
          }),
        ],
      }
    );

    // Override the logical ID
    const cfnAttachPolicyForS3Replicate = attachPolicyForS3Replicate.node
      .defaultChild as CfnPolicy;
    cfnAttachPolicyForS3Replicate.overrideLogicalId(
      "AttachPolicyForS3Replicate"
    );

    pipelineResourcesBuilderRole.attachInlinePolicy(attachPolicyForS3Replicate);

    const S3ObjectReplication = new lambda.Function(
      this,
      "S3ObjectReplication",
      {
        code: lambda.AssetCode.fromAsset(
          path.join(
            __dirname,
            "../../../lambda/microbatch/s3_object_replication"
          ),
          { followSymlinks: SymlinkFollowMode.ALWAYS }
        ),
        runtime: lambda.Runtime.PYTHON_3_11,
        handler: "lambda_function.lambda_handler",
        timeout: Duration.minutes(15),
        memorySize: 128,
        architecture: lambda.Architecture.X86_64,
        role: S3ObjectReplicationRole,
        layers: [microBatchLambdaUtilsLayer, microBatchLambdaEnrichmentLayer],
        environment: {
          SOLUTION_VERSION: process.env.VERSION || "v1.0.0",
          SOLUTION_ID: solutionId,
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
      .defaultChild as iam.CfnRole;
    cfnS3ObjectReplication.overrideLogicalId("S3ObjectReplication");

    S3ObjectReplication.node.addDependency(attachPolicyForS3Replicate);
    S3ObjectReplication.node.addDependency(S3ObjectsReplicationPolicy);

    const S3ObjectReplicationEventSource = new SqsEventSource(LogEventQueue, {
      batchSize: 10,
    });
    S3ObjectReplication.addEventSource(S3ObjectReplicationEventSource);

    new CfnOutput(this, 'ProcessorLogGroupName', {
      value: S3ObjectReplication.logGroup.logGroupName,
    }).overrideLogicalId('ProcessorLogGroupName');

    const pipelineResourcesBuilderProvider = new cr.Provider(this, "Provider", {
      onEventHandler: pipelineResourcesBuilder,
      providerFunctionName: `${Aws.STACK_NAME}-Provider`,
    });

    const pipelineCustomResource = new CustomResource(this, "CustomResource", {
      serviceToken: pipelineResourcesBuilderProvider.serviceToken,
      properties: {
        Id: pipelineId,
        Resource: "pipeline",
        Item: {
          metaName: pipelineId,
          type: "Pipeline",
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
              service: "scheduler",
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
            },
            queue: {
              logEventDLQ: LogEventDLQ.queueArn,
              logEventQueue: LogEventQueue.queueArn,
            },
            lambda: {
              replicate: S3ObjectReplication.functionArn,
            },
            stackId: `${Aws.STACK_ID}`,
          },
        },
      },
    });

    // Override the logical ID
    const cfnPipelineCustomResource = pipelineCustomResource.node
      .defaultChild as CfnCustomResource;
    cfnPipelineCustomResource.overrideLogicalId("CustomResource");

    cfnPipelineCustomResource.addDependency(LogEventDLQPolicy);
    cfnPipelineCustomResource.addDependency(LogEventQueuePolicy);
    cfnPipelineCustomResource.addDependency(cfnLogEventQueue);
    cfnPipelineCustomResource.addDependency(cfnLogEventDLQ);
    cfnPipelineCustomResource.addDependency(cfnS3ObjectReplication);
  }
}


export class UpdateSSMStringParameterMetadata implements IAspect {
  public constructor(
    private paramGroups: Record<string, any>[],
    private label: string
  ) { }

  private mapping = {
    "SSMStagingBucketName.Parameter": {
      logicalId: "StagingBucketName",
      description:
        "The name of Staging Bucket, automatically retrieved from SSM Parameter Store. [/MicroBatch/StagingBucketName].",
    },
    "SSMCentralizedDatabaseArn.Parameter": {
      logicalId: "CentralizedDatabaseArn",
      description:
        "The database arn of centralized, automatically retrieved from SSM Parameter Store. [/MicroBatch/CentralizedDatabaseArn].",
    },
    "SSMCMKeyArn.Parameter": {
      logicalId: "CMKeyArn",
      description:
        "The key ARN for a KMS key, automatically retrieved from SSM Parameter Store. [/MicroBatch/CMKeyArn].",
    },
    "SSMKMSPublicAccessPolicyArn.Parameter": {
      logicalId: "KMSPublicAccessPolicyArn",
      description:
        "The ARN of KMSPublicAccessPolicy, automatically retrieved from SSM Parameter Store. [/MicroBatch/KMSPublicAccessPolicyArn].",
    },
    "SSMLambdaUtilsLayerArn.Parameter": {
      logicalId: "LambdaUtilsLayerArn",
      description:
        "The ARN of Lambda Layer., automatically retrieved from SSM Parameter Store. [/MicroBatch/LambdaUtilsLayerArn].",
    },
    "SSMLambdaEnrichmentLayerArn.Parameter": {
      logicalId: "LambdaEnrichmentLayerArn",
      description:
        "The ARN of Lambda Layer., automatically retrieved from SSM Parameter Store. [/MicroBatch/LambdaEnrichmentLayerArn].",
    },
    "SSMPipelineResourcesBuilderArn.Parameter": {
      logicalId: "PipelineResourcesBuilderArn",
      description:
        "The arn of the Lambda to build resources of pipeline, automatically retrieved from SSM Parameter Store. [/MicroBatch/PipelineResourcesBuilderArn].",
    },
    "SSMPipelineResourcesBuilderRoleArn.Parameter": {
      logicalId: "PipelineResourcesBuilderRoleArn",
      description:
        "The arn of the role of the Lambda to build resources of pipeline, automatically retrieved from SSM Parameter Store. [/MicroBatch/PipelineResourcesBuilderRoleArn].",
    },
    "SSMMetadataTableArn.Parameter": {
      logicalId: "MetadataTableArn",
      description:
        "The arn of Metadata Table of DynamoDB, automatically retrieved from SSM Parameter Store. [/MicroBatch/MetadataTableArn].",
    },
  };

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
