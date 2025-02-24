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

import { CfnParameter, Fn, StackProps, aws_iam as iam } from 'aws-cdk-lib';
import { SecurityGroup, Vpc } from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';
import {
  OpenSearchInitProps,
  OpenSearchInitStack,
} from '../common/opensearch-init-stack';
import { SolutionStack } from '../common/solution-stack';
import {
  CWtoFirehosetoS3Props,
  CWtoFirehosetoS3Stack,
} from './cw-to-firehose-to-s3-stack';
import { RDSLogsToS3 } from './rds-logs-to-s3';
import { S3toOpenSearchStackProps } from './s3-to-opensearch-common-stack';
import {
  S3toOpenSearchOSIStack,
  S3toOpenSearchOSIStackProps,
} from './s3-to-opensearch-osi-stack';
import { S3toOpenSearchStack } from './s3-to-opensearch-stack';
import { WAFSampledStack } from './waf-sampled-stack';

const { VERSION } = process.env;

export interface PipelineStackProps extends StackProps {
  readonly logType: string;
  readonly tag?: string;
  readonly solutionName?: string;
  readonly solutionDesc?: string;
  readonly solutionId?: string;
  readonly enableOSIProcessor?: string;
}

export class ServiceLogPipelineStack extends SolutionStack {
  constructor(scope: Construct, id: string, props: PipelineStackProps) {
    super(scope, id, props);

    const stackPrefix = 'CL';
    let solutionDesc =
      props.solutionDesc || 'Centralized Logging with OpenSearch';
    let solutionId = props.solutionId || 'SO8025';

    const tag = props.tag ? props.tag : props.logType.toLowerCase();
    this.templateOptions.description = `(${solutionId}-${tag}) - ${solutionDesc} - ${props.logType} Log Analysis Pipeline Template - Version ${VERSION}`;

    const engineType = new CfnParameter(this, 'engineType', {
      description:
        'The engine type of the OpenSearch. Select OpenSearch or Elasticsearch.',
      type: 'String',
      default: 'OpenSearch',
      allowedValues: ['OpenSearch'],
    });
    this.addToParamLabels('Engine Type', engineType.logicalId);

    const endpoint = new CfnParameter(this, 'endpoint', {
      description:
        'The OpenSearch endpoint URL. e.g. vpc-your_opensearch_domain_name-xcvgw6uu2o6zafsiefxubwuohe.us-east-1.es.amazonaws.com',
      default: '',
      type: 'String',
    });
    this.addToParamLabels('OpenSearch Endpoint', endpoint.logicalId);

    const domainName = new CfnParameter(this, 'domainName', {
      description: 'The domain name of the Amazon OpenSearch cluster.',
      default: '',
      type: 'String',
    });
    this.addToParamLabels('OpenSearch Domain Name', domainName.logicalId);

    const vpcId = new CfnParameter(this, 'vpcId', {
      description:
        'Select a VPC which has access to the OpenSearch domain. The log processing Lambda will be resides in the selected VPC.',
      type: 'AWS::EC2::VPC::Id',
    });
    this.addToParamLabels('VPC ID', vpcId.logicalId);

    const subnetIds = new CfnParameter(this, 'subnetIds', {
      description:
        'Select at least two subnets which has access to the OpenSearch domain and Amazon S3 service.',
      type: 'List<AWS::EC2::Subnet::Id>',
    });
    this.addToParamLabels('Subnet IDs', subnetIds.logicalId);

    const securityGroupId = new CfnParameter(this, 'securityGroupId', {
      description:
        'Select a Security Group which will be associated to the log processing Lambda. Please make sure the Security Group has access to the OpenSearch domain.',
      type: 'AWS::EC2::SecurityGroup::Id',
    });
    this.addToParamLabels('Security Group ID', securityGroupId.logicalId);

    const indexPrefix = new CfnParameter(this, 'indexPrefix', {
      description: `The common prefix of OpenSearch index for the log. The index name will be <Index Prefix>-${props.logType.toLowerCase()}-<YYYY-MM-DD>.`,
      default: '',
      type: 'String',
    });
    this.addToParamLabels('Index Prefix', indexPrefix.logicalId);

    const indexSuffix = new CfnParameter(this, 'indexSuffix', {
      description: `The common suffix format of OpenSearch index for the log(Example: yyyy-MM-dd, yyyy-MM-dd-HH). The index name will be <Index Prefix>-${props.logType.toLowerCase()}-<Index Suffix>-000001.`,
      default: 'yyyy-MM-dd',
      type: 'String',
      allowedValues: ['yyyy-MM-dd', 'yyyy-MM-dd-HH', 'yyyy-MM', 'yyyy'],
    });
    this.addToParamLabels('Index Suffix', indexSuffix.logicalId);

    const createDashboard = new CfnParameter(this, 'createDashboard', {
      description: 'Whether to create a sample OpenSearch dashboard.',
      type: 'String',
      default: 'Yes',
      allowedValues: ['Yes', 'No'],
    });
    this.addToParamLabels('Create Sample Dashboard', createDashboard.logicalId);

    const warmAge = new CfnParameter(this, 'warmAge', {
      description:
        'The age required to move the index into warm storage (e.g. 7d). Index age is the time between its creation and the present. Supported units are d (days) and h (hours). This is only effecitve when warm storage is enabled in OpenSearch',
      default: '',
      type: 'String',
    });
    this.addToParamLabels('Age to Warm Storage', warmAge.logicalId);

    const coldAge = new CfnParameter(this, 'coldAge', {
      description:
        'The age required to move the index into cold storage (e.g. 30d). Index age is the time between its creation and the present. Supported units are d (days) and h (hours). This is only effecitve when cold storage is enabled in OpenSearch.',
      default: '',
      type: 'String',
    });
    this.addToParamLabels('Age to Cold Storage', coldAge.logicalId);

    const retainAge = new CfnParameter(this, 'retainAge', {
      description:
        'The age to retain the index (e.g. 180d). Index age is the time between its creation and the present. Supported units are d (days) and h (hours). If value is "", the index will not be deleted.',
      default: '',
      type: 'String',
    });
    this.addToParamLabels('Age to Retain', retainAge.logicalId);

    const rolloverSize = new CfnParameter(this, 'rolloverSize', {
      description:
        'The minimum size of the shard storage required to roll over the index (e.g. 30GB)',
      default: '',
      type: 'String',
    });
    this.addToParamLabels('Rollover Index Size', rolloverSize.logicalId);

    const codec = new CfnParameter(this, 'codec', {
      description:
        'The compression type to use to compress stored data. Available values are best_compression and default.',
      default: 'best_compression',
      type: 'String',
      allowedValues: ['default', 'best_compression'],
    });
    this.addToParamLabels('Compression Type', codec.logicalId);

    const refreshInterval = new CfnParameter(this, 'refreshInterval', {
      description:
        'How often the index should refresh, which publishes its most recent changes and makes them available for searching. Can be set to -1 to disable refreshing. Default is 1s.',
      default: '1s',
      type: 'String',
    });
    this.addToParamLabels('Refresh Interval', refreshInterval.logicalId);

    const shardNumbers = new CfnParameter(this, 'shardNumbers', {
      description:
        'Number of shards to distribute the index evenly across all data nodes, keep the size of each shard between 10–50 GiB',
      default: 5,
      type: 'Number',
    });
    this.addToParamLabels('Number Of Shards', shardNumbers.logicalId);

    const replicaNumbers = new CfnParameter(this, 'replicaNumbers', {
      description:
        'Number of replicas for OpenSearch Index. Each replica is a full copy of an index.',
      default: 1,
      type: 'Number',
    });
    this.addToParamLabels('Number of Replicas', replicaNumbers.logicalId);

    let pluginList = '';
    let plugins: CfnParameter | undefined = undefined;

    const logSourceAccountId = new CfnParameter(this, 'logSourceAccountId', {
      description: `Account ID of the S3 bucket which stores the ${props.logType} logs. If the source is in the current account, please leave it blank.`,
      type: 'String',
    });
    this.addToParamLabels(
      'Log Source Account ID',
      logSourceAccountId.logicalId
    );

    const logSourceRegion = new CfnParameter(this, 'logSourceRegion', {
      description: `Region code of the S3 bucket which stores the ${props.logType} logs, e.g. us-east-1`,
      type: 'String',
    });
    this.addToParamLabels('Log Source Region', logSourceRegion.logicalId);

    const logSourceAccountAssumeRole = new CfnParameter(
      this,
      'logSourceAccountAssumeRole',
      {
        description: `the Cross Account Role which is in the log agent cloudformation output. If the source is in the current account, please leave it blank.`,
        type: 'String',
      }
    );
    this.addToParamLabels(
      'Log Source Account Assume Role',
      logSourceAccountAssumeRole.logicalId
    );

    const logProcessorConcurrency = new CfnParameter(
      this,
      'logProcessorConcurrency',
      {
        description: 'Reserve concurrency for log processor lambda',
        default: 0,
        type: 'Number',
      }
    );
    this.addToParamLabels(
      'Number Of Reserve Concurrency',
      logProcessorConcurrency.logicalId
    );

    if (['ELB', 'CloudFront'].includes(props.logType)) {
      plugins = new CfnParameter(this, 'plugins', {
        description:
          'List of plugins delimited by comma, leave blank if no available plugins to use.',
        default: '',
        type: 'String',
      });
      this.addToParamLabels('Plugins', plugins.logicalId);
      pluginList = plugins.valueAsString;
    }

    // Get the VPC where OpenSearch deploy
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

    if (
      [
        'S3',
        'CloudTrail',
        'ELB',
        'CloudFront',
        'WAF',
        'RDS',
        'VPCFlow',
        'Config',
        'Lambda',
        'WAFSampled',
      ].includes(props.logType)
    ) {
      const backupBucketName = new CfnParameter(this, 'backupBucketName', {
        description:
          'The S3 backup bucket name to store the failed ingestion logs.',
        type: 'String',
        allowedPattern: '.+',
        constraintDescription:
          'Failed ingestion log S3 Bucket must not be empty',
      });
      this.addToParamLabels('S3 Backup Bucket', backupBucketName.logicalId);

      const logBucketName = new CfnParameter(this, 'logBucketName', {
        description: `The S3 bucket name which stores the ${props.logType} logs.`,
        type: 'String',
        allowedPattern: '.+',
        constraintDescription: 'Log S3 Bucket must not be empty',
      });
      this.addToParamLabels('Log Bucket Name', logBucketName.logicalId);

      const logBucketPrefix = new CfnParameter(this, 'logBucketPrefix', {
        description: `The S3 bucket path prefix which stores the ${props.logType} logs.`,
        default: '',
        type: 'String',
      });
      this.addToParamLabels('Log Bucket Prefix', logBucketPrefix.logicalId);

      const defaultCmkArnParam = new CfnParameter(this, 'defaultCmkArnParam', {
        type: 'String',
        description:
          'The KMS-CMK Arn for SQS encryption. Leave empty to create a new KMS CMK.',
      });
      this.addToParamLabels('KMS-CMK ARN', defaultCmkArnParam.logicalId);

      const pipelineTableArn = new CfnParameter(this, 'pipelineTableArn', {
        type: 'String',
        default: '',
        description:
          'Ingestion table Arn. Leave empty if you do not use OSI as Processor.',
      });
      this.addToParamLabels(
        'Enable OpenSearch Ingestion as processor',
        pipelineTableArn.logicalId
      );

      this.addToParamGroups(
        'Source Information',
        logBucketName.logicalId,
        logBucketPrefix.logicalId,
        logSourceAccountId.logicalId,
        logSourceRegion.logicalId,
        logSourceAccountAssumeRole.logicalId,
        defaultCmkArnParam.logicalId,
        pipelineTableArn.logicalId
      );
      const baseProps = {
        version: VERSION,
        solutionId: solutionId,
        logType: props.logType,
        logSourceAccountId: logSourceAccountId.valueAsString,
        logSourceRegion: logSourceRegion.valueAsString,
        logBucketName: logBucketName.valueAsString,
        logSourceAccountAssumeRole: logSourceAccountAssumeRole.valueAsString,
      };
      if (['RDS', 'WAFSampled'].includes(props.logType)) {
        baseProps.logSourceAccountAssumeRole = '';
      }

      // Create S3 to OpenSearch Stack
      const osProps: OpenSearchInitProps = {
        ...baseProps,
        engineType: engineType.valueAsString,
        vpc: processVpc,
        securityGroup: processSg,
        endpoint: endpoint.valueAsString,
        domainName: domainName.valueAsString,
        indexPrefix: indexPrefix.valueAsString,
        createDashboard: createDashboard.valueAsString,
        backupBucketName: backupBucketName.valueAsString,
        plugins: pluginList,
        shardNumbers: shardNumbers.valueAsString,
        replicaNumbers: replicaNumbers.valueAsString,
        warmAge: warmAge.valueAsString,
        coldAge: coldAge.valueAsString,
        retainAge: retainAge.valueAsString,
        rolloverSize: rolloverSize.valueAsString,
        indexSuffix: indexSuffix.valueAsString,
        codec: codec.valueAsString,
        refreshInterval: refreshInterval.valueAsString,
        source: 'EVENT_BRIDGE',
        subCategory: 'S3',
        logProcessorConcurrency: logProcessorConcurrency.valueAsNumber,
      };

      if (props.enableOSIProcessor == 'true') {
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
          ...osProps,
          noBufferAccessRoleArn: osiProcessorRole.roleArn,
          writeIdxData: 'False',
        };
        const osInitStack = new OpenSearchInitStack(
          this,
          'OpenSearchInit',
          osPropsForOSI
        );

        const pipelineProps: S3toOpenSearchOSIStackProps = {
          ...baseProps,
          backupBucketName: backupBucketName.valueAsString,
          defaultCmkArn: defaultCmkArnParam.valueAsString,
          logBucketPrefix: logBucketPrefix.valueAsString,
          logProcessorFn: osInitStack.logProcessorFn,
          solutionId: solutionId,
          stackPrefix: stackPrefix,
          enableConfigJsonParam: false,
          domainName: domainName.valueAsString,
          osiProcessorRole: osiProcessorRole,
          osiPipelineName: osiPipelineName.valueAsString,
          pipelineTableArn: pipelineTableArn.valueAsString,
          minCapacity: minCapacity.valueAsString,
          maxCapacity: maxCapacity.valueAsString,
          endpoint: endpoint.valueAsString,
          indexPrefix: indexPrefix.valueAsString,
        };

        const s3BufferStack = new S3toOpenSearchOSIStack( // NOSONAR
          this,
          `S3Buffer`,
          pipelineProps
        );

        this.cfnOutput(
          'ProcessorLogGroupName',
          s3BufferStack.logProcessorLogGroupName
        );
        this.cfnOutput('LogEventQueueArn', s3BufferStack.logEventQueueArn);
        this.cfnOutput('LogEventQueueName', s3BufferStack.logEventQueueName);
      } else {
        const openSearchInitStack = new OpenSearchInitStack(
          this,
          'InitStack',
          osProps
        );

        // Create S3 to OpenSearch Stack for service log pipeline
        const pipelineProps: S3toOpenSearchStackProps = {
          ...baseProps,
          logProcessorFn: openSearchInitStack.logProcessorFn,
          defaultCmkArn: defaultCmkArnParam.valueAsString,
          logBucketPrefix: logBucketPrefix.valueAsString,
          stackPrefix: stackPrefix,
        };

        const pipelineStack = new S3toOpenSearchStack(
          this,
          `LogPipeline`,
          pipelineProps
        );
        this.cfnOutput(
          'ProcessorLogGroupName',
          pipelineStack.logProcessorLogGroupName
        );
        this.cfnOutput('LogEventQueueArn', pipelineStack.logEventQueueArn);
        this.cfnOutput('LogEventQueueName', pipelineStack.logEventQueueName);
      }

      this.createRdsToS3Logs(
        props,
        logSourceAccountAssumeRole,
        logBucketName,
        logBucketPrefix
      );

      if (['WAFSampled'].includes(props.logType)) {
        const webACLNames = new CfnParameter(this, 'webACLNames', {
          description: `The list of WebACL names delimited by comma`,
          type: 'String',
        });
        this.addToParamLabels('WebACL Names', webACLNames.logicalId);

        const webACLScope = new CfnParameter(this, 'webACLScope', {
          description: `Resource type. Choose CLOUDFRONT for Amazon CloudFront distributions or REGIONAL for other regional resources such as Application Load Balancers etc.`,
          type: 'String',
          default: 'REGIONAL',
          allowedValues: ['CLOUDFRONT', 'REGIONAL'],
        });
        this.addToParamLabels('Resource type', webACLScope.logicalId);

        const interval = new CfnParameter(this, 'interval', {
          description: `The Default Interval (in minutes) to get sampled logs, default is 2 minutes. This value must large than or equal 2 and less than 180.`,
          type: 'Number',
          default: '2',
        });
        this.addToParamLabels('Interval', interval.logicalId);

        this.addToParamGroups(
          'Source Information',
          webACLNames.logicalId,
          interval.logicalId
        );

        /* NOSONAR */ new WAFSampledStack(this, `WAFSampledLogs2S3`, {
          interval: interval,
          logSourceAccountAssumeRole: logSourceAccountAssumeRole.valueAsString,
          webAclNames: webACLNames.valueAsString,
          scope: webACLScope.valueAsString,
          bucketName: logBucketName.valueAsString,
          bucketPrefix: logBucketPrefix.valueAsString,
          solutionId: solutionId,
          stackPrefix: stackPrefix,
        });
      }

      if (['Lambda'].includes(props.logType)) {
        const logGroupNames = new CfnParameter(this, 'logGroupNames', {
          description:
            'The names of the CloudWatch Log groups, separated by comma',
          type: 'String',
          allowedPattern: '.+',
          constraintDescription: 'CloudWatch Log Group Names must not be empty',
        });
        this.addToParamLabels('Log Group Names', logGroupNames.logicalId);

        this.addToParamGroups('Source Information', logGroupNames.logicalId);

        // Start CloudWatch Log to Firehose to S3
        const cwtoFirehosetoS3StackProps: CWtoFirehosetoS3Props = {
          logType: props.logType,
          logGroupNames: logGroupNames.valueAsString,
          logBucketName: logBucketName.valueAsString,
          logBucketPrefix: logBucketPrefix.valueAsString,
          logSourceRegion: logSourceRegion.valueAsString,
          logSourceAccountId: logSourceAccountId.valueAsString,
          logSourceAccountAssumeRole: logSourceAccountAssumeRole.valueAsString,
          solutionId: solutionId,
        };
        const cwtoFirehosetoS3Stack = new CWtoFirehosetoS3Stack(
          this,
          `CWtoFirehosetoS3Stack`,
          cwtoFirehosetoS3StackProps
        );
        this.cfnOutput(
          'DeliveryStreamArn',
          cwtoFirehosetoS3Stack.deliveryStreamArn
        );
        this.cfnOutput(
          'DeliveryStreamName',
          cwtoFirehosetoS3Stack.deliveryStreamName
        );
      }
      this.addToParamGroups('Backup Settings', backupBucketName.logicalId);
    }

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

    // Before General Available, plugin is only applicable to limited types
    let advancedOptions = [
      shardNumbers.logicalId,
      replicaNumbers.logicalId,
      warmAge.logicalId,
      coldAge.logicalId,
      retainAge.logicalId,
      rolloverSize.logicalId,
      indexSuffix.logicalId,
      codec.logicalId,
      refreshInterval.logicalId,
    ];
    if (plugins != undefined) {
      advancedOptions.push(plugins.logicalId);
    }
    this.addToParamGroups('Advanced Options', ...advancedOptions);

    this.setMetadata();
  }

  private createRdsToS3Logs(
    props: PipelineStackProps,
    logSourceAccountAssumeRole: CfnParameter,
    logBucketName: CfnParameter,
    logBucketPrefix: CfnParameter
  ) {
    if (['RDS'].includes(props.logType)) {
      const dbIdentifier = new CfnParameter(this, 'dbIdentifier', {
        description: 'The identifier of the database.',
        type: 'String',
      });

        /* NOSONAR */ new RDSLogsToS3(this, 'RDSLogs2S3', {
        dbIdentifier: dbIdentifier.valueAsString,
        dbRoleArn: logSourceAccountAssumeRole.valueAsString,
        bucketName: logBucketName.valueAsString,
        bucketPrefix: logBucketPrefix.valueAsString,
      });
    }
  }
}
