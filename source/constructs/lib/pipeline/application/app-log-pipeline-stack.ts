// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import {
  Aws,
  Fn,
  aws_iam as iam,
  CfnParameter,
  StackProps,
  Duration,
  aws_events_targets as targets,
} from 'aws-cdk-lib';
import { SecurityGroup, Vpc } from 'aws-cdk-lib/aws-ec2';
import { Rule, Schedule } from 'aws-cdk-lib/aws-events';
import { Construct } from 'constructs';
import { MSKStack, MSKStackProps } from './msk-stack';
import { KDSStack, KDSStackProps } from '../../kinesis/kds-stack';
import { MetricSourceType } from '../common/cwl-metric-stack';
import {
  OpenSearchInitStack,
  OpenSearchInitProps,
} from '../common/opensearch-init-stack';
import { SolutionStack } from '../common/solution-stack';
import { S3toOpenSearchStackProps } from '../service/s3-to-opensearch-common-stack';
import {
  S3toOpenSearchOSIStack,
  S3toOpenSearchOSIStackProps,
} from '../service/s3-to-opensearch-osi-stack';
import { S3toOpenSearchStack } from '../service/s3-to-opensearch-stack';
const { VERSION } = process.env;

export interface PipelineStackProps extends StackProps {
  buffer: 'MSK' | 'KDS' | 'S3' | 'None';
  tag?: string;
  enableAutoScaling?: boolean;
  solutionName?: string;
  solutionDesc?: string;
  solutionId?: string;
  enableOSIProcessor?: string;
}

/**
 * All In One App Pipeline Stack
 */
export class AppPipelineStack extends SolutionStack {
  constructor(scope: Construct, id: string, props: PipelineStackProps) {
    super(scope, id, props);

    let solutionDesc =
      props.solutionDesc || 'Centralized Logging with OpenSearch';
    let solutionId = props.solutionId || 'SO8025';
    const stackPrefix = 'CL';

    const tag = props.tag ? props.tag : props.buffer.toLowerCase();

    this.setDescription(
      `(${solutionId}-${tag}) - ${solutionDesc} - Application Log Analysis Pipeline (${props.buffer} as Buffer) Template - Version ${VERSION}`
    );

    const engineType = this.newParam('engineType', {
      type: 'String',
      description:
        'The engine type of the OpenSearch. Select OpenSearch or Elasticsearch.',
      default: 'OpenSearch',
      allowedValues: ['OpenSearch', 'Elasticsearch'],
    });
    this.addToParamLabels('Engine Type', engineType.logicalId);

    const endpoint = this.newParam('endpoint', {
      type: 'String',
      description:
        'The OpenSearch endpoint URL. e.g. vpc-your_opensearch_domain_name-xcvgw6uu2o6zafsiefxubwuohe.us-east-1.es.amazonaws.com',
      default: '',
    });
    this.addToParamLabels('OpenSearch Endpoint', endpoint.logicalId);

    const domainName = this.newParam('domainName', {
      type: 'String',
      description: 'OpenSearch domain',
      default: '',
    });
    this.addToParamLabels('OpenSearch Domain Name', domainName.logicalId);

    const createDashboard = this.newParam('createDashboard', {
      type: 'String',
      description: 'Yes, if you want to create a sample OpenSearch dashboard.',
      default: 'No',
      allowedValues: ['Yes', 'No'],
    });
    this.addToParamLabels('Create Sample Dashboard', createDashboard.logicalId);

    const shardNumbers = this.newParam('shardNumbers', {
      type: 'Number',
      description:
        'Number of shards to distribute the index evenly across all data nodes, keep the size of each shard between 10–50 GiB',
      default: 5,
    });
    this.addToParamLabels('Number Of Shards', shardNumbers.logicalId);

    const replicaNumbers = this.newParam('replicaNumbers', {
      type: 'Number',
      description:
        'Number of replicas for OpenSearch Index. Each replica is a full copy of an index',
      default: 1,
    });
    this.addToParamLabels('Number of Replicas', replicaNumbers.logicalId);

    const warmAge = this.newParam('warmAge', {
      type: 'String',
      description:
        'The age required to move the index into warm storage( Index age is the time between its creation and the present. Supported units are d (days), h (hours), m (minutes), s (seconds), ms (milliseconds), and micros (microseconds) ), this is only effecitve when the value is >0 and warm storage is enabled in OpenSearch',
      default: '',
    });
    this.addToParamLabels('Days to Warm Storage', warmAge.logicalId);

    const coldAge = this.newParam('coldAge', {
      type: 'String',
      description:
        'The number of days required to move the index into cold storage(Example: 1d), this is only effective when cold storage is enabled in OpenSearch.',
      default: '',
    });
    this.addToParamLabels('Days to Cold Storage', coldAge.logicalId);

    const retainAge = this.newParam('retainAge', {
      type: 'String',
      description:
        'The total number of days to retain the index(Example: 7d). If value is "", the index will not be deleted',
      default: '',
    });
    this.addToParamLabels('Days to Warm Storage', retainAge.logicalId);

    const rolloverSize = this.newParam('rolloverSize', {
      type: 'String',
      description:
        'The minimum size of the total primary shard storage (not counting replicas) required to roll over the index. For example, if you set min_size to 100 GiB and your index has 5 primary shards and 5 replica shards of 20 GiB each, the total size of all primary shards is 100 GiB, so the rollover occurs.',
      default: '',
    });
    this.addToParamLabels('Days to Retain', rolloverSize.logicalId);

    const indexSuffix = this.newParam('indexSuffix', {
      type: 'String',
      description:
        'The common suffix format of OpenSearch index for the log(Example: yyyy-MM-dd, yyyy-MM-dd-HH).  The index name will be <Index Prefix>-<Index Suffix Format>-000001.',
      default: 'yyyy-MM-dd',
      allowedValues: ['yyyy-MM-dd', 'yyyy-MM-dd-HH', 'yyyy-MM', 'yyyy'],
    });
    this.addToParamLabels('Index suffix Format', indexSuffix.logicalId);

    const codec = this.newParam('codec', {
      type: 'String',
      description:
        'The compression type to use to compress stored data. Available values are best_compression and default.',
      default: 'best_compression',
      allowedValues: ['default', 'best_compression'],
    });
    this.addToParamLabels('Index codec', codec.logicalId);

    const refreshInterval = this.newParam('refreshInterval', {
      type: 'String',
      description:
        'How often the index should refresh, which publishes its most recent changes and makes them available for searching. Can be set to -1 to disable refreshing. Default is 1s.',
      default: '1s',
    });
    this.addToParamLabels('Index Prefix Format', refreshInterval.logicalId);

    const indexPrefix = this.newParam('indexPrefix', {
      type: 'String',
      description: `The common prefix of OpenSearch index for the log.`,
      default: '',
    });
    this.addToParamLabels('Index Prefix', indexPrefix.logicalId);

    const vpcId = this.newParam('vpcId', {
      type: 'AWS::EC2::VPC::Id',
      description:
        'Select a VPC which has access to the OpenSearch domain. The log processing Lambda will be resides in the selected VPC.',
      default: '',
    });
    this.addToParamLabels('VPC ID', vpcId.logicalId);

    const subnetIds = this.newParam('subnetIds', {
      type: 'List<AWS::EC2::Subnet::Id>',
      description:
        'Select at least two subnets which has access to the OpenSearch domain. The log processing Lambda will resides in the subnets. Please make sure the subnets has access to the Amazon S3 service.',
    });
    this.addToParamLabels('Subnet IDs', subnetIds.logicalId);

    const securityGroupId = this.newParam('securityGroupId', {
      type: 'AWS::EC2::SecurityGroup::Id',
      description:
        'Select a Security Group which will be associated to the log processing Lambda. Please make sure the Security Group has access to the OpenSearch domain.',
      default: '',
    });
    this.addToParamLabels('Security Group ID', securityGroupId.logicalId);

    const indexTemplateGzipBase64 = this.newParam('indexTemplateGzipBase64', {
      type: 'String',
      description: 'A gzip base64 encoded string of OpenSearch index template.',
      default: '',
    });
    this.addToParamLabels(
      'Gzip base64 encoded string of OpenSearch index template',
      indexTemplateGzipBase64.logicalId
    );

    const bufferAccessRoleArn = this.newParam('bufferAccessRoleArn', {
      type: 'String',
      description: 'Buffer access role arn.',
      default: '',
    });
    this.addToParamLabels(
      'Buffer access role arn',
      bufferAccessRoleArn.logicalId
    );

    const logProcessorConcurrency = this.newParam('logProcessorConcurrency', {
      description: 'Reserve concurrency for log processor lambda',
      default: 0,
      type: 'Number',
    });
    this.addToParamLabels(
      'Number Of Reserve Concurrency',
      logProcessorConcurrency.logicalId
    );

    const logType = this.newParam('logType', {
      type: 'String',
      description: 'The log type of the pipeline',
      default: '',
    });

    let pluginList = '';

    const plugins = new CfnParameter(this, 'enrichmentPlugins', {
      description:
        'List of plugins delimited by comma, leave blank if no available plugins to use.',
      default: '',
      type: 'String',
    });
    this.addToParamLabels('Plugins', plugins.logicalId);
    pluginList = plugins.valueAsString;

    const processVpc = Vpc.fromVpcAttributes(this, 'ProcessVpc', {
      vpcId: vpcId.valueAsString,
      availabilityZones: Fn.getAzs(),
      privateSubnetIds: subnetIds.valueAsList,
    });

    const processSg = SecurityGroup.fromSecurityGroupId(
      this,
      'ProcessSG',
      securityGroupId.valueAsString
    );

    let logProcessorLogGroupName = '';
    let processorRoleArn: string = '';

    let bufferAccessPolicy: iam.Policy;

    const baseProps = {
      vpc: processVpc,
      securityGroup: processSg,
      endpoint: endpoint.valueAsString,
      indexPrefix: indexPrefix.valueAsString,
      engineType: engineType.valueAsString,
    };

    if (props.buffer == 'S3') {
      const backupBucketName = this.newParam('backupBucketName', {
        description:
          'The S3 backup bucket name to store the failed ingestion logs.',
        type: 'String',
        allowedPattern: '[a-z-0-9]+',
        constraintDescription: 'Please use a valid S3 bucket name',
      });
      this.addToParamLabels('S3 Backup Bucket', backupBucketName.logicalId);

      const logBucketName = this.newParam('logBucketName', {
        description: `The S3 bucket name which stores the application logs.`,
        type: 'String',
        allowedPattern: '[a-z-0-9]+',
        constraintDescription: 'Please use a valid S3 bucket name',
      });
      this.addToParamLabels('Log Bucket Name', logBucketName.logicalId);

      const logBucketPrefix = this.newParam('logBucketPrefix', {
        description: `The S3 bucket path prefix which stores the application logs.`,
        default: '',
        type: 'String',
      });
      this.addToParamLabels('Log Bucket Prefix', logBucketPrefix.logicalId);

      const logBucketSuffix = this.newParam('logBucketSuffix', {
        description: `The S3 bucket path suffix which stores the application logs.`,
        default: '',
        type: 'String',
      });
      this.addToParamLabels('Log Bucket Suffix', logBucketSuffix.logicalId);

      const defaultCmkArn = new CfnParameter(this, 'defaultCmkArn', {
        type: 'String',
        default: '',
        description:
          'The KMS Customer Managed Key (CMK) Arn for encryption. Leave empty to create a new key.',
      });
      this.addToParamLabels('KMS-CMK Key Arn', defaultCmkArn.logicalId);

      this.addToParamGroups(
        'S3 Buffer Information',
        logBucketName.logicalId,
        logBucketPrefix.logicalId,
        defaultCmkArn.logicalId,
        backupBucketName.logicalId
      );

      const s3OSProps: OpenSearchInitProps = {
        ...baseProps,
        domainName: domainName.valueAsString,
        createDashboard: createDashboard.valueAsString,
        logBucketName: logBucketName.valueAsString,
        backupBucketName: backupBucketName.valueAsString,
        logSourceAccountId: '',
        logSourceRegion: Aws.REGION,
        logSourceAccountAssumeRole: '',
        source: 'EVENT_BRIDGE',
        shardNumbers: shardNumbers.valueAsString,
        replicaNumbers: replicaNumbers.valueAsString,
        warmAge: warmAge.valueAsString,
        coldAge: coldAge.valueAsString,
        retainAge: retainAge.valueAsString,
        rolloverSize: rolloverSize.valueAsString,
        indexSuffix: indexSuffix.valueAsString,
        codec: codec.valueAsString,
        refreshInterval: refreshInterval.valueAsString,
        solutionId: solutionId,
        indexTemplateGzipBase64: indexTemplateGzipBase64.valueAsString,
        logType: logType.valueAsString,
        subCategory: 'FLB',
        enableConfigJsonParam: true,
        logProcessorConcurrency: logProcessorConcurrency.valueAsNumber,
        plugins: pluginList,
      };

      if (props.enableOSIProcessor == 'true') {
        const pipelineTableArn = this.newParam('pipelineTableArn', {
          type: 'String',
          default: '',
          description: 'Pipeline table Arn.',
        });

        const osiPipelineName = this.newParam('osiPipelineName', {
          type: 'String',
          default: '',
          description: 'OSI Pipeline Name.',
        });

        const minCapacity = this.newParam('minCapacity', {
          type: 'String',
          default: '1',
          description: 'Minimum OCU capacity for OSI pipeline.',
        });

        const maxCapacity = this.newParam('maxCapacity', {
          type: 'String',
          default: '4',
          description: 'Maximum OCU capacity for OSI pipeline.',
        });

        this.addToParamGroups(
          'OSI Processor Information',
          osiPipelineName.logicalId,
          pipelineTableArn.logicalId,
          minCapacity.logicalId,
          maxCapacity.logicalId
        );

        // Role for osi pipeline processor
        const osiProcessorRole = new iam.Role(this, 'OSIProcessorRole', {
          assumedBy: new iam.ServicePrincipal('osis-pipelines.amazonaws.com'),
        });

        const osPropsForOSI = {
          ...s3OSProps,
          noBufferAccessRoleArn: osiProcessorRole.roleArn,
          writeIdxData: 'False',
        };
        const osInitStack = new OpenSearchInitStack(
          this,
          'OpenSearchInit',
          osPropsForOSI
        );
        processorRoleArn = osInitStack.logProcessorFn.role!.roleArn;
        const pipelineProps: S3toOpenSearchOSIStackProps = {
          ...baseProps,
          defaultCmkArn: defaultCmkArn.valueAsString,
          backupBucketName: backupBucketName.valueAsString,
          logBucketName: logBucketName.valueAsString,
          logBucketPrefix: logBucketPrefix.valueAsString,
          logBucketSuffix: logBucketSuffix.valueAsString,
          logProcessorFn: osInitStack.logProcessorFn,
          logType: logType.valueAsString,
          logSourceAccountId: Aws.ACCOUNT_ID,
          logSourceRegion: Aws.REGION,
          logSourceAccountAssumeRole: '',
          solutionId: solutionId,
          stackPrefix: stackPrefix,
          metricSourceType: MetricSourceType.LOG_PROCESSOR_APP,
          enableConfigJsonParam: false,
          domainName: domainName.valueAsString,
          osiProcessorRole: osiProcessorRole,
          osiPipelineName: osiPipelineName.valueAsString,
          pipelineTableArn: pipelineTableArn.valueAsString,
          minCapacity: minCapacity.valueAsString,
          maxCapacity: maxCapacity.valueAsString,
        };

        const s3BufferStack = new S3toOpenSearchOSIStack( // NOSONAR
          this,
          `S3Buffer`,
          pipelineProps
        );

        // No need to support cross account s3 buffer
        bufferAccessPolicy = new iam.Policy(this, 'BufferAccessPolicy', {
          statements: [
            new iam.PolicyStatement({
              actions: ['s3:PutObject'],
              effect: iam.Effect.ALLOW,
              resources: [
                `arn:${Aws.PARTITION}:s3:::${logBucketName.valueAsString}/*`,
              ],
            }),
            new iam.PolicyStatement({
              actions: ['kms:GenerateDataKey*', 'kms:Decrypt', 'kms:Encrypt'],
              effect: iam.Effect.ALLOW,
              resources: [
                `arn:${Aws.PARTITION}:kms:${Aws.REGION}:${Aws.ACCOUNT_ID}:key/*`,
              ],
            }),
          ],
        });

        this.cfnOutput(
          'ProcessorLogGroupName',
          s3BufferStack.logProcessorLogGroupName
        );
        this.cfnOutput('LogEventQueueName', s3BufferStack.logEventQueueName);
        this.cfnOutput('QueueArn', s3BufferStack.logEventQueueArn);
        this.cfnOutput(
          'BufferResourceArn',
          `arn:${Aws.PARTITION}:s3:::${logBucketName.valueAsString}`
        );
        this.cfnOutput('BufferResourceName', logBucketName.valueAsString);
      } else {
        const osInitStack = new OpenSearchInitStack(
          this,
          'OpenSearchInit',
          s3OSProps
        );
        processorRoleArn = osInitStack.logProcessorFn.role!.roleArn;
        // Cross Account S3 buffering is not required.
        const pipelineProps: S3toOpenSearchStackProps = {
          logProcessorFn: osInitStack.logProcessorFn,
          defaultCmkArn: defaultCmkArn.valueAsString,
          logBucketName: logBucketName.valueAsString,
          logBucketPrefix: logBucketPrefix.valueAsString,
          logBucketSuffix: logBucketSuffix.valueAsString,

          logType: logType.valueAsString,

          logSourceAccountId: '',
          logSourceRegion: Aws.REGION,
          logSourceAccountAssumeRole: '',
          solutionId: solutionId,
          stackPrefix: stackPrefix,
          metricSourceType: MetricSourceType.LOG_PROCESSOR_APP,
        };

        const s3BufferStack = new S3toOpenSearchStack(
          this,
          `S3Buffer`,
          pipelineProps
        );

        logProcessorLogGroupName = s3BufferStack.logProcessorLogGroupName;

        // No need to support cross account s3 buffer
        bufferAccessPolicy = new iam.Policy(this, 'BufferAccessPolicy', {
          statements: [
            new iam.PolicyStatement({
              actions: ['s3:PutObject'],
              effect: iam.Effect.ALLOW,
              resources: [
                `arn:${Aws.PARTITION}:s3:::${logBucketName.valueAsString}/*`,
              ],
            }),
          ],
        });

        this.cfnOutput(
          'BufferResourceArn',
          `arn:${Aws.PARTITION}:s3:::${logBucketName.valueAsString}`
        );
        this.cfnOutput('BufferResourceName', logBucketName.valueAsString);
        this.cfnOutput('ProcessorLogGroupName', logProcessorLogGroupName);
        this.cfnOutput('QueueArn', s3BufferStack.logEventQueueArn);
        this.cfnOutput('LogEventQueueName', s3BufferStack.logEventQueueName);
      }
    } else if (props.buffer == 'KDS') {
      const shardCount = this.newParam('shardCount', {
        type: 'Number',
        description: 'Number of initial kinesis shards',
        default: '2',
      });

      const maxCapacity = this.newParam('maxCapacity', {
        type: 'Number',
        description: 'Max capacity',
        default: '50',
      });

      const minCapacity = this.newParam('minCapacity', {
        type: 'Number',
        description: 'Min capacity',
        default: '1',
      });

      const backupBucketName = this.newParam('backupBucketName', {
        description:
          'The S3 backup bucket name to store the failed ingestion logs.',
        type: 'String',
        allowedPattern: '[a-z-0-9]+',
        constraintDescription: 'Please use a valid S3 bucket name',
      });

      this.addToParamGroups(
        'KDS Buffer Information',
        shardCount.logicalId,
        maxCapacity.logicalId,
        minCapacity.logicalId,
        backupBucketName.logicalId
      );
      const kdsOSProps = {
        ...baseProps,
        domainName: domainName.valueAsString,
        createDashboard: createDashboard.valueAsString,
        backupBucketName: backupBucketName.valueAsString,
        shardNumbers: shardNumbers.valueAsString,
        replicaNumbers: replicaNumbers.valueAsString,
        warmAge: warmAge.valueAsString,
        coldAge: coldAge.valueAsString,
        retainAge: retainAge.valueAsString,
        rolloverSize: rolloverSize.valueAsString,
        indexSuffix: indexSuffix.valueAsString,
        codec: codec.valueAsString,
        refreshInterval: refreshInterval.valueAsString,
        solutionId: solutionId,
        logType: logType.valueAsString,
        indexTemplateGzipBase64: indexTemplateGzipBase64.valueAsString,
        plugins: pluginList,
      };

      const pipelineProps: KDSStackProps = {
        ...kdsOSProps,
        shardCount: shardCount.valueAsNumber,
        maxCapacity: maxCapacity.valueAsNumber,
        minCapacity: minCapacity.valueAsNumber,
        enableAutoScaling: props.enableAutoScaling!,
        stackPrefix: stackPrefix,
        subCategory: 'FLB',
        logProcessorConcurrency: logProcessorConcurrency.valueAsNumber,
      };

      const kdsBufferStack = new KDSStack(this, 'KDSBuffer', pipelineProps);

      logProcessorLogGroupName = kdsBufferStack.logProcessorLogGroupName;

      bufferAccessPolicy = new iam.Policy(this, 'BufferAccessPolicy', {
        statements: [
          new iam.PolicyStatement({
            actions: ['kinesis:PutRecord', 'kinesis:PutRecords'],
            effect: iam.Effect.ALLOW,
            resources: [`${kdsBufferStack.kinesisStreamArn}`],
          }),
        ],
      });
      processorRoleArn = kdsBufferStack.logProcessorRoleArn;
      this.cfnOutput('BufferResourceArn', kdsBufferStack.kinesisStreamArn);
      this.cfnOutput('BufferResourceName', kdsBufferStack.kinesisStreamName);
      this.cfnOutput('ProcessorLogGroupName', logProcessorLogGroupName);
    } else if (props.buffer == 'MSK') {
      const backupBucketName = this.newParam('backupBucketName', {
        description:
          'The S3 backup bucket name to store the failed ingestion logs.',
        type: 'String',
        allowedPattern: '[a-z-0-9]+',
        constraintDescription: 'Please use a valid S3 bucket name',
      });

      const mskClusterName = this.newParam('mskClusterName', {
        description: `MSK cluster Name`,
        default: '',
        type: 'String',
      });
      this.addToParamLabels('MSK Cluster Name', mskClusterName.logicalId);

      const mskClusterArn = this.newParam('mskClusterArn', {
        description: `MSK cluster Arn`,
        default: '',
        type: 'String',
      });
      this.addToParamLabels('MSK Cluster ARN', mskClusterArn.logicalId);

      const topic = this.newParam('topic', {
        description: `MSK Topic Name`,
        default: '',
        type: 'String',
      });
      this.addToParamLabels(
        'Name of a MSK topic to consume (topic must already exist before the stack is launched)',
        topic.logicalId
      );

      this.addToParamGroups(
        'MSK Buffer Information',
        mskClusterArn.logicalId,
        topic.logicalId,
        backupBucketName.logicalId
      );

      const mskOSProps = {
        ...baseProps,
        domainName: domainName.valueAsString,
        createDashboard: createDashboard.valueAsString,
        backupBucketName: backupBucketName.valueAsString,
        shardNumbers: shardNumbers.valueAsString,
        replicaNumbers: replicaNumbers.valueAsString,
        warmAge: warmAge.valueAsString,
        coldAge: coldAge.valueAsString,
        retainAge: retainAge.valueAsString,
        rolloverSize: rolloverSize.valueAsString,
        indexSuffix: indexSuffix.valueAsString,
        codec: codec.valueAsString,
        refreshInterval: refreshInterval.valueAsString,
        solutionId: solutionId,
        logType: logType.valueAsString,
        indexTemplateGzipBase64: indexTemplateGzipBase64.valueAsString,
        subCategory: 'FLB',
      };

      const pipelineProps: MSKStackProps = {
        ...mskOSProps,
        backupBucketName: backupBucketName.valueAsString,
        mskClusterArn: mskClusterArn.valueAsString,
        topic: topic.valueAsString,
        stackPrefix: stackPrefix,
        logType: 'Application',
        logProcessorConcurrency: logProcessorConcurrency.valueAsNumber,
      };

      const mskBufferStack = new MSKStack(this, 'MSKBuffer', pipelineProps);

      logProcessorLogGroupName = mskBufferStack.logProcessorLogGroupName;
      processorRoleArn = mskBufferStack.logProcessorRoleArn;
      this.cfnOutput('BufferResourceArn', mskClusterArn.valueAsString);
      this.cfnOutput('BufferResourceName', mskClusterName.valueAsString);
      this.cfnOutput('ProcessorLogGroupName', logProcessorLogGroupName);
    } else {
      // For no buffers
      bufferAccessPolicy = new iam.Policy(this, 'BufferAccessPolicy', {
        statements: [
          new iam.PolicyStatement({
            actions: [
              'es:ESHttpGet',
              'es:ESHttpDelete',
              'es:ESHttpPut',
              'es:ESHttpPost',
              'es:ESHttpHead',
              'es:ESHttpPatch',
            ],
            effect: iam.Effect.ALLOW,
            resources: [
              `arn:${Aws.PARTITION}:es:${Aws.REGION}:${Aws.ACCOUNT_ID}:domain/${domainName.valueAsString}`,
            ],
          }),
        ],
      });
      // Add buffer access role to output.
      // MSK doesn't require a buffer role, only for FluentBit
      let noBufferAccessRole: iam.IRole = iam.Role.fromRoleArn(
        this,
        'OpenSearchAccessRole',
        bufferAccessRoleArn.valueAsString
      );
      noBufferAccessRole.attachInlinePolicy(bufferAccessPolicy!);

      const noBufferOSProps: OpenSearchInitProps = {
        ...baseProps,
        domainName: domainName.valueAsString,
        createDashboard: createDashboard.valueAsString,
        logSourceAccountId: '',
        logSourceRegion: Aws.REGION,
        logSourceAccountAssumeRole: '',
        source: 'EVENT_BRIDGE',
        shardNumbers: shardNumbers.valueAsString,
        replicaNumbers: replicaNumbers.valueAsString,
        warmAge: warmAge.valueAsString,
        coldAge: coldAge.valueAsString,
        retainAge: retainAge.valueAsString,
        rolloverSize: rolloverSize.valueAsString,
        indexSuffix: indexSuffix.valueAsString,
        codec: codec.valueAsString,
        refreshInterval: refreshInterval.valueAsString,
        solutionId: solutionId,
        indexTemplateGzipBase64: indexTemplateGzipBase64.valueAsString,
        logType: logType.valueAsString,
        subCategory: 'FLB',
        enableConfigJsonParam: false,
        writeIdxData: 'False',
        noBufferAccessRoleArn: noBufferAccessRole.roleArn,
        logProcessorConcurrency: logProcessorConcurrency.valueAsNumber,
      };
      const noBufferOpenSearchInitStack = new OpenSearchInitStack(
        this,
        'OpenSearchInit',
        noBufferOSProps
      );
      // Setup Event Bridge
      const scheduler_rule = new Rule(this, 'ScheduleRule', {
        schedule: Schedule.rate(Duration.minutes(1)),
      });
      scheduler_rule.addTarget(
        new targets.LambdaFunction(noBufferOpenSearchInitStack.logProcessorFn, {
          retryAttempts: 3, // Optional: set the max number of retry attempts
        })
      );
      const eventBridgePolicy = new iam.Policy(this, 'eventBridgePolicy', {
        statements: [
          new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            resources: [`${scheduler_rule.ruleArn}`],
            actions: ['events:DeleteRule', 'events:DisableRule'],
          }),
        ],
      });

      eventBridgePolicy.node.addDependency(scheduler_rule);
      noBufferOpenSearchInitStack.logProcessorFn.role!.attachInlinePolicy(
        eventBridgePolicy
      );
      this.cfnOutput('BufferAccessRoleArn', noBufferAccessRole.roleArn);
      this.cfnOutput('BufferAccessRoleName', noBufferAccessRole.roleName);
    }

    if (props.buffer == 'KDS' || props.buffer == 'S3') {
      let bufferAccessRole: iam.IRole;
      bufferAccessRole = iam.Role.fromRoleArn(
        this,
        'BufferAccessRole',
        bufferAccessRoleArn.valueAsString
      );

      bufferAccessRole.attachInlinePolicy(bufferAccessPolicy!);

      this.cfnOutput('BufferAccessRoleArn', bufferAccessRole.roleArn);
      this.cfnOutput('BufferAccessRoleName', bufferAccessRole.roleName);
    }
    this.cfnOutput('LogProcessorRoleArn', processorRoleArn);
    this.addToParamGroups(
      'Destination Information',
      engineType.logicalId,
      domainName.logicalId,
      endpoint.logicalId,
      indexPrefix.logicalId,
      createDashboard.logicalId
    );
    this.addToParamGroups(
      'Network Information',
      vpcId.logicalId,
      subnetIds.logicalId,
      securityGroupId.logicalId
    );

    this.addToParamGroups(
      'Advanced Options',
      shardNumbers.logicalId,
      replicaNumbers.logicalId,
      warmAge.logicalId,
      coldAge.logicalId,
      retainAge.logicalId,
      rolloverSize.logicalId,
      indexSuffix.logicalId,
      codec.logicalId,
      refreshInterval.logicalId
    );

    this.setMetadata();
  }
}
