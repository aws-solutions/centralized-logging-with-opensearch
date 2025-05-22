// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import {
  Aspects,
  Aws,
  CfnCondition,
  CfnParameter,
  CfnResource,
  Duration,
  Fn,
  aws_iam as iam,
  IAspect,
  aws_lambda as lambda,
  Lazy,
  aws_sqs as sqs,
} from 'aws-cdk-lib';
import { ISecurityGroup, IVpc, SubnetType } from 'aws-cdk-lib/aws-ec2';
import { NagSuppressions } from 'cdk-nag';
import { Construct, IConstruct } from 'constructs';
import * as path from 'path';

import { SharedPythonLayer } from '../../layer/layer';
import { CfnGuardSuppressResourceList } from '../../util/add-cfn-guard-suppression';

export interface OpenSearchInitProps {
  /**
   * Default VPC for lambda to call OpenSearch REST API
   *
   * @default - None.
   */
  readonly vpc: IVpc;

  /**
   * Default Security Group for lambda to call OpenSearch REST API
   *
   * @default - None.
   */
  readonly securityGroup: ISecurityGroup;

  /**
   * OpenSearch Endpoint Url
   *
   * @default - None.
   */
  readonly endpoint: string;

  /**
   * OpenSearch Domain Name
   *
   * @default - None.
   */
  readonly domainName: string;

  /**
   * OpenSearch or Elasticsearch
   *
   * @default - OpenSearch.
   */
  readonly engineType?: string;

  /**
   * Log Type
   *
   * @default - None.
   */
  readonly logType?: string;

  /**
   * Index Prefix
   *
   * @default - None.
   */
  readonly indexPrefix: string;

  /**
   * Wheather to create Sample Dashboard
   *
   * @default - Yes.
   */
  readonly createDashboard?: string;

  /**
   * Log proceersor lambda role arn if any
   *
   * @default - None.
   */
  // readonly logProcessorRoleArn?: string;

  /**
   * Log proceersor lambda reserve concurrency
   *
   * @default - 0.
   */
  readonly logProcessorConcurrency: number;

  readonly warmAge?: string;
  readonly coldAge?: string;
  readonly retainAge?: string;
  readonly rolloverSize?: string;
  readonly indexSuffix?: string;
  readonly refreshInterval?: string;
  readonly codec?: string;
  readonly shardNumbers?: string;
  readonly replicaNumbers?: string;

  readonly solutionId: string;

  /**
   * A list of plugins
   *
   * @default - None.
   */
  readonly plugins?: string;

  readonly logBucketName?: string;
  readonly backupBucketName?: string;
  readonly webACLNames?: string;
  readonly webACLScope?: string;
  readonly interval?: CfnParameter;

  /**
   * The Account Id of log source
   * @default - None.
   */
  readonly logSourceAccountId: string;
  /**
   * The region of log source
   * @default - None.
   */
  readonly logSourceRegion: string;
  /**
   * The assume role of log source account
   * @default - None.
   */
  readonly logSourceAccountAssumeRole: string;

  /**
   * A gzip base64 encoded string of OpenSearch index template.
   */
  readonly indexTemplateGzipBase64?: string;
  readonly enableConfigJsonParam?: boolean;
  readonly source: 'MSK' | 'KDS' | 'SQS' | 'EVENT_BRIDGE';
  readonly env?: { [key: string]: string };
  readonly subCategory?: 'RT' | 'S3' | 'FLB' | 'CWL';
  readonly writeIdxData?: string;
  readonly noBufferAccessRoleArn?: string;
}

/**
 * Stack to handle OpenSearch related ops such as import dashboard, create index template and policy etc when stack started.
 */
export class OpenSearchInitStack extends Construct {
  //NOSONAR
  // public helperFn: lambda.Function;
  public logProcessorFn: lambda.Function;

  /* NOSONAR */ constructor(
    scope: Construct,
    id: string,
    props: OpenSearchInitProps
  ) {
    super(scope, id);

    const rolloverIdx = new CfnParameter(this, 'rolloverIdx', {
      description:
        'Whether or not to trigger a job with a rollover index. 0: this job will be trigger 1: this job has already been done.',
      type: 'String',
      default: '1',
      allowedValues: ['0', '1'],
    });
    rolloverIdx.overrideLogicalId('rolloverIdx');

    // If in China Region, disable install latest aws-sdk
    const isCN = new CfnCondition(this, 'isCN', {
      expression: Fn.conditionEquals(Aws.PARTITION, 'aws-cn'),
    });
    const isInstallLatestAwsSdk = Fn.conditionIf(
      isCN.logicalId,
      'false',
      'true'
    ).toString();

    Aspects.of(this).add(
      new InjectCustomerResourceConfig(isInstallLatestAwsSdk)
    );

    // Create the OpenSearch Policy for LogProcessor Lambda
    const osLogProcessPolicy = new iam.Policy(
      this,
      'OpenSearchLogProcessPolicy',
      {
        policyName: `${Aws.STACK_NAME}-osLogProcessPolicy`,
        statements: [
          new iam.PolicyStatement({
            actions: [
              'ec2:CreateNetworkInterface',
              'ec2:DeleteNetworkInterface',
              'ec2:DescribeNetworkInterfaces',
            ],
            resources: [`*`],
          }),
          new iam.PolicyStatement({
            actions: [
              'es:ESHttpGet',
              'es:ESHttpDelete',
              'es:ESHttpPatch',
              'es:ESHttpPost',
              'es:ESHttpPut',
              'es:ESHttpHead',
              'es:DescribeElasticsearchDomainConfig',
              'es:UpdateElasticsearchDomainConfig',
            ],
            resources: [
              `arn:${Aws.PARTITION}:es:${Aws.REGION}:${Aws.ACCOUNT_ID}:*`,
            ],
          }),
        ],
      }
    );
    NagSuppressions.addResourceSuppressions(osLogProcessPolicy, [
      {
        id: 'AwsSolutions-IAM5',
        reason: 'The managed policy needs to use any resources.',
      },
    ]);

    // Create a lambda layer with required python packages.
    // This layer also includes standard plugins.
    const pipeLayer = new lambda.LayerVersion(this, 'LogProcessorLayer', {
      code: lambda.Code.fromAsset(
        path.join(__dirname, '../../../lambda/plugin/standard'),
        {
          bundling: {
            image: lambda.Runtime.PYTHON_3_11.bundlingImage,
            platform: 'linux/amd64',
            command: [
              'bash',
              '-c',
              'pip install -r requirements.txt -t /asset-output/python && cp . -r /asset-output/python/',
            ],
          },
        }
      ),
      compatibleRuntimes: [lambda.Runtime.PYTHON_3_11],
      description: 'Default Lambda layer for Log Pipeline',
    });
    // Create the Log Processor Lambda

    const dlq = new sqs.Queue(this, 'DLQ', {
      visibilityTimeout: Duration.minutes(15),
      retentionPeriod: Duration.days(7),
      encryption: sqs.QueueEncryption.KMS_MANAGED,
    });
    dlq.addToResourcePolicy(
      new iam.PolicyStatement({
        actions: ['sqs:*'],
        effect: iam.Effect.DENY,
        resources: [dlq.queueArn],
        conditions: {
          ['Bool']: {
            'aws:SecureTransport': 'false',
          },
        },
        principals: [new iam.AnyPrincipal()],
      })
    );
    NagSuppressions.addResourceSuppressions(dlq, [
      { id: 'AwsSolutions-SQS3', reason: 'it is a DLQ' },
    ]);

    this.logProcessorFn = new lambda.Function(this, 'LogProcessorFn', {
      description: `${Aws.STACK_NAME} - Function to process and load ${props.logType} logs into OpenSearch`,
      functionName: `${Aws.STACK_NAME}-LogProcessorFn`,
      runtime: lambda.Runtime.PYTHON_3_11,
      handler: 'lambda_function.lambda_handler',
      code: lambda.Code.fromAsset(
        path.join(__dirname, '../../../lambda/pipeline/log-processor')
      ),
      memorySize: 1024,
      timeout: Duration.seconds(900),
      deadLetterQueue: dlq,
      vpc: props.vpc,
      vpcSubnets: { subnetType: SubnetType.PRIVATE_WITH_EGRESS },
      securityGroups: [props.securityGroup],
      environment: Object.assign(
        {
          ENDPOINT: props.endpoint,
          ENGINE: props.engineType || 'OpenSearch',
          DOMAIN_NAME: props.domainName,
          CREATE_DASHBOARD: props.createDashboard || 'Yes',
          ROLE_ARN: Lazy.string({
            produce: () => {
              return this.logProcessorFn.role?.roleArn;
            },
          }),
          STACK_PREFIX: process.env.STACK_PREFIX,
          LOG_TYPE: props.logType || '',
          INDEX_PREFIX: props.indexPrefix,
          WARM_AGE: props.warmAge || '',
          COLD_AGE: props.coldAge || '',
          RETAIN_AGE: props.retainAge || '',
          ROLLOVER_SIZE: props.rolloverSize || '',
          INDEX_SUFFIX: props.indexSuffix || 'yyyy-MM-dd',
          CODEC: props.codec || 'best_compression',
          REFRESH_INTERVAL: props.refreshInterval || '1s',
          NUMBER_OF_SHARDS: props.shardNumbers || '0',
          NUMBER_OF_REPLICAS: props.replicaNumbers || '0',
          SOLUTION_VERSION: process.env.VERSION || 'v1.0.0',
          SOLUTION_ID: props.solutionId,
          INDEX_TEMPLATE_GZIP_BASE64: props.indexTemplateGzipBase64 || '',
          STACK_NAME: Aws.STACK_NAME,
          LOG_BUCKET_NAME: props.logBucketName || '',
          BACKUP_BUCKET_NAME: props.backupBucketName,
          PLUGINS: props.plugins || '',
          LOG_SOURCE_ACCOUNT_ID: props.logSourceAccountId,
          LOG_SOURCE_REGION: props.logSourceRegion,
          LOG_SOURCE_ACCOUNT_ASSUME_ROLE: props.logSourceAccountAssumeRole,
          INTERVAL: props.interval?.valueAsString,
          INIT_MASTER_ROLE_JOB: '0',
          INIT_ISM_JOB: '0',
          INIT_TEMPLATE_JOB: '0',
          INIT_DASHBOARD_JOB: '0',
          INIT_ALIAS_JOB: '0',
          INIT_INDEX_PATTERN_JOB: '0',
          ROLLOVER_INDEX_JOB: rolloverIdx.valueAsString,
          WEB_ACL_NAMES: props.webACLNames,
          SCOPE: props.webACLScope,
          CONFIG_JSON: (() => {
            if (props.enableConfigJsonParam) {
              const configJSON = new CfnParameter(this, 'configJSON', {
                type: 'String',
                default: '',
                description:
                  'A string in JSON format that controls how to parse the logs in the S3 bucket. (Optional)',
              });
              configJSON.overrideLogicalId('configJSON');
              return configJSON.valueAsString;
            }
            return '';
          })(),
          SUB_CATEGORY: props.subCategory || '',
          BULK_BATCH_SIZE: '10000',
          FUNCTION_NAME: `${Aws.STACK_NAME}-LogProcessorFn`,
          SOURCE: props.source,
          WRITE_IDX_DATA: props.writeIdxData || 'True',
          NO_BUFFER_ACCESS_ROLE_ARN: props.noBufferAccessRoleArn || '',
          POWERTOOLS_LOG_LEVEL: 'ERROR',
        },
        props.env
      ),
      layers: [SharedPythonLayer.getInstance(this), pipeLayer],
    });

    const isLogProcessorConcurrencyZero = new CfnCondition(
      this,
      'isLogProcessorConcurrencyZero',
      {
        expression: Fn.conditionEquals(props.logProcessorConcurrency, 0),
      }
    );
    if (props.logProcessorConcurrency !== 0) {
      const logProcessorFn = this.logProcessorFn.node
        .defaultChild as lambda.CfnFunction;

      logProcessorFn.addPropertyOverride(
        'ReservedConcurrentExecutions',
        Fn.conditionIf(
          isLogProcessorConcurrencyZero.logicalId,
          Aws.NO_VALUE,
          props.logProcessorConcurrency
        )
      );
    }

    this.logProcessorFn.addToRolePolicy(
      new iam.PolicyStatement({
        actions: [
          'lambda:UpdateFunctionConfiguration',
          'lambda:GetFunctionConfiguration',
        ],
        resources: [
          `arn:${Aws.PARTITION}:lambda:${Aws.REGION}:${Aws.ACCOUNT_ID}:function:${Aws.STACK_NAME}-LogProcessorFn`,
        ],
      })
    );
    this.logProcessorFn.addToRolePolicy(
      new iam.PolicyStatement({
        actions: [
          'kms:DescribeCustomKeyStores',
          'kms:Decrypt',
          'kms:DescribeKey',
        ],
        resources: [
          `arn:${Aws.PARTITION}:kms:${Aws.REGION}:${Aws.ACCOUNT_ID}:key/*`,
        ],
      })
    );
    this.logProcessorFn.role!.attachInlinePolicy(osLogProcessPolicy);
    NagSuppressions.addResourceSuppressions(this.logProcessorFn, [
      {
        id: 'AwsSolutions-IAM5',
        reason: 'The managed policy needs to use any resources.',
      },
    ]);

    // Grant access to log processor lambda
    const hasBackupBucket = new CfnCondition(this, 'hasBackupBucket', {
      expression: Fn.conditionNot(
        Fn.conditionEquals(props.backupBucketName || '', '')
      ),
    });
    this.logProcessorFn.addToRolePolicy(
      new iam.PolicyStatement({
        actions: [
          's3:DeleteObject*',
          's3:PutObject',
          's3:PutObjectLegalHold',
          's3:PutObjectRetention',
          's3:PutObjectTagging',
          's3:PutObjectVersionTagging',
          's3:Abort*',
        ],
        effect: iam.Effect.ALLOW,
        resources: [
          `arn:${Aws.PARTITION}:s3:::fake-cl-bucket`,
          Fn.conditionIf(
            hasBackupBucket.logicalId,
            `arn:${Aws.PARTITION}:s3:::${props.backupBucketName}`,
            Aws.NO_VALUE
          ).toString(),
          Fn.conditionIf(
            hasBackupBucket.logicalId,
            `arn:${Aws.PARTITION}:s3:::${props.backupBucketName}/*`,
            Aws.NO_VALUE
          ).toString(),
        ],
      })
    );

    Aspects.of(this).add(new CfnGuardSuppressResourceList({
      "AWS::Logs::LogGroup": ["CLOUDWATCH_LOG_GROUP_ENCRYPTED"], // Using service default encryption https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/data-protection.html
      "AWS::IAM::Role": ["CFN_NO_EXPLICIT_RESOURCE_NAMES"]
    }));
  }
}

class InjectCustomerResourceConfig implements IAspect {
  public constructor(private isInstallLatestAwsSdk: string) { }

  public visit(node: IConstruct): void {
    if (node instanceof CfnResource && node.cfnResourceType === 'Custom::AWS') {
      node.addPropertyOverride(
        'InstallLatestAwsSdk',
        this.isInstallLatestAwsSdk
      );
    }
  }
}
