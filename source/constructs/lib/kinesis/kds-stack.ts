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

import * as path from 'path';
import * as s3 from '@aws-cdk/aws-s3';
import * as iam from '@aws-cdk/aws-iam';
import * as ssm from '@aws-cdk/aws-ssm';
import * as lambda from '@aws-cdk/aws-lambda';
import * as kinesis from '@aws-cdk/aws-kinesis';
import * as apigateway from '@aws-cdk/aws-apigateway';
import * as cloudwatch from '@aws-cdk/aws-cloudwatch';
import * as cwa from '@aws-cdk/aws-cloudwatch-actions';
import * as appscaling from '@aws-cdk/aws-applicationautoscaling';
import { KinesisEventSource } from '@aws-cdk/aws-lambda-event-sources';
import * as cdk from '@aws-cdk/core';
import * as ec2 from '@aws-cdk/aws-ec2';
import { Stack, StackProps, Construct, CfnParameter, CfnParameterProps, CfnResource, Duration, CfnOutput, Fn, TagType, Aws, Aspects } from '@aws-cdk/core';
import { OpenSearchInitStack } from '../pipeline/common/opensearch-init-stack';
import { ISecurityGroup, IVpc, SecurityGroup, Vpc } from '@aws-cdk/aws-ec2';

const { VERSION } = process.env;


export class SolutionStack extends Stack {
  private _paramGroup: { [grpname: string]: CfnParameter[] } = {}

  protected setDescription(description: string) { this.templateOptions.description = description; }
  protected newParam(id: string, props?: CfnParameterProps): CfnParameter { return new CfnParameter(this, id, props); }
  protected addGroupParam(props: { [key: string]: CfnParameter[] }): void {
    for (const key of Object.keys(props)) {
      const params = props[key];
      this._paramGroup[key] = params.concat(this._paramGroup[key] ?? []);
    }
    this._setParamGroups();
  }
  private _setParamGroups(): void {
    if (!this.templateOptions.metadata) { this.templateOptions.metadata = {}; }
    const mkgrp = (label: string, params: CfnParameter[]) => {
      return {
        Label: { default: label },
        Parameters: params.map(p => {
          return p ? p.logicalId : '';
        }).filter(id => id),
      };
    };
    this.templateOptions.metadata['AWS::CloudFormation::Interface'] = {
      ParameterGroups: Object.keys(this._paramGroup).map(key => mkgrp(key, this._paramGroup[key])),
    };
  }

  protected cfnOutput(id: string, value: string, description?: string): CfnOutput {
    const o = new CfnOutput(this, id, { value, description });
    o.overrideLogicalId(id);
    return o;
  }
}

export interface KDSStackProps extends StackProps {
  enableAutoScaling: boolean
}

export class KDSStack extends SolutionStack {
  constructor(scope: Construct, id: string, props?: KDSStackProps) {
    super(scope, id, props);

    this.setDescription(`(SO8025-app-pipeline) - Log Hub - Kinesis Data Stream Template - Version ${VERSION}`);

    const shardCountParam = this.newParam('ShardCountParam', {
      type: 'Number',
      description: 'Number of initial kinesis shards',
      default: '2',
    });

    const maxCapacityParam = this.newParam('MaxCapacityParam', {
      type: 'Number',
      description: 'Max capacity',
      default: '50',
    });

    const minCapacityParam = this.newParam('MinCapacityParam', {
      type: 'Number',
      description: 'Min capacity',
      default: '1',
    });

    const opensearchDomainParam = this.newParam('OpenSearchDomainParam', {
      type: 'String',
      description: 'OpenSearch domain',
      default: '1',
    });

    const createDashboardParam = this.newParam('CreateDashboardParam', {
      type: 'String',
      description: 'Yes, if you want to create a sample OpenSearch dashboard.',
      default: 'No',
      allowedValues: ['Yes', 'No'],
    });

    const opensearchShardNumbersParam = this.newParam('OpenSearchShardNumbersParam', {
      type: 'Number',
      description: 'Number of shards to distribute the index evenly across all data nodes, keep the size of each shard between 10–50 GiB',
      default: 5,
    });

    const opensearchReplicaNumbersParam = this.newParam('OpenSearchReplicaNumbersParam', {
      type: 'Number',
      description: 'Number of replicas for OpenSearch Index. Each replica is a full copy of an index',
      default: 1,
    });

    const opensearchDaysToWarmParam = this.newParam('OpenSearchDaysToWarmParam', {
      type: 'Number',
      description: 'The number of days required to move the index into warm storage, this is only effecitve when the value is >0 and warm storage is enabled in OpenSearch',
      default: 0,
    });

    const opensearchDaysToColdParam = this.newParam('OpenSearchDaysToColdParam', {
      type: 'Number',
      description: 'The number of days required to move the index into cold storage, this is only effecitve when the value is >0 and cold storage is enabled in OpenSearch',
      default: 0,
    });

    const opensearchDaysToRetain = this.newParam('OpenSearchDaysToRetain', {
      type: 'Number',
      description: 'The total number of days to retain the index, if value is 0, the index will not be deleted',
      default: 0,
    });

    const engineTypeParam = this.newParam('EngineTypeParam', {
      type: 'String',
      description: 'The engine type of the OpenSearch. Select OpenSearch or Elasticsearch.',
      default: 'OpenSearch',
      allowedValues: ['OpenSearch', 'Elasticsearch'],
    });

    const failedLogBucketParam = this.newParam('FailedLogBucketParam', {
      type: 'String',
      description: 'The s3 bucket to store failed logs.',
      default: 'failed-log-bucket',
      allowedPattern: '.+',
    });

    const opensearchEndpointParam = this.newParam('OpenSearchEndpointParam', {
      type: 'String',
      description: 'The OpenSearch endpoint URL. e.g. vpc-your_opensearch_domain_name-xcvgw6uu2o6zafsiefxubwuohe.us-east-1.es.amazonaws.com',
      allowedPattern: '^(?!https:\\/\\/).*',
      constraintDescription: 'Please do not inclued https://',
      default: '',
    });

    const opensearchIndexPrefix = this.newParam('OpenSearchIndexPrefix', {
      type: 'String',
      description: `The common prefix of OpenSearch index for the log.`,
      default: '',
    });

    const vpcIdParam = this.newParam('VpcIdParam', {
      type: 'AWS::EC2::VPC::Id',
      description: 'Select a VPC which has access to the OpenSearch domain. The log processing Lambda will be resides in the selected VPC.',
      default: '',
    });

    const subnetIdsParam = new CfnParameter(this, 'SubnetIdsParam', {
      type: 'List<AWS::EC2::Subnet::Id>',
      description: 'Select at least two subnets which has access to the OpenSearch domain. The log processing Lambda will resides in the subnets. Please make sure the subnets has access to the Amazon S3 service.',
      default: '',
    });

    const securityGroupIdParam = new CfnParameter(this, 'SecurityGroupIdParam', {
      type: 'AWS::EC2::SecurityGroup::Id',
      description: 'Select a Security Group which will be associated to the log processing Lambda. Please make sure the Security Group has access to the OpenSearch domain.',
      default: '',
    });

    const processVpc = Vpc.fromVpcAttributes(this, 'ProcessVpc', {
      vpcId: vpcIdParam.valueAsString,
      availabilityZones: Fn.getAzs(),
      privateSubnetIds: subnetIdsParam.valueAsList,
    });

    const processSg = SecurityGroup.fromSecurityGroupId(this, 'ProcessSG', securityGroupIdParam.valueAsString);

    const kinesisStream = new kinesis.Stream(this, 'Stream', {
      shardCount: shardCountParam.valueAsNumber,
    });

    this.cfnOutput('KinesisStreamArn', kinesisStream.streamArn);
    this.cfnOutput('KinesisStreamName', kinesisStream.streamName);
    this.cfnOutput('KinesisStreamRegion', Aws.REGION);

    const logProcessor = new LogProcessor(this, 'LogProcessor', {
      stream: kinesisStream,
      indexPrefix: opensearchIndexPrefix.valueAsString,
      vpc: processVpc,
      securityGroup: processSg,
      endpoint: opensearchEndpointParam.valueAsString,
      engineType: engineTypeParam.valueAsString,
      logType: '',
      failedLogBucket: failedLogBucketParam.valueAsString,
    });

    const osInitStack = new OpenSearchInitStack(this, 'OpenSearchInit', {
      vpc: processVpc,
      securityGroup: processSg,
      endpoint: opensearchEndpointParam.valueAsString,
      logType: '',
      indexPrefix: opensearchIndexPrefix.valueAsString,
      engineType: engineTypeParam.valueAsString,
      domainName: opensearchDomainParam.valueAsString,
      createDashboard: createDashboardParam.valueAsString,
      logProcessorRoleArn: logProcessor.logProcessorRoleArn,
      shardNumbers: opensearchShardNumbersParam.valueAsString,
      replicaNumbers: opensearchReplicaNumbersParam.valueAsString,
      daysToWarm: opensearchDaysToWarmParam.valueAsString,
      daysToCold: opensearchDaysToColdParam.valueAsString,
      daysToRetain: opensearchDaysToRetain.valueAsString,
    });

    this.cfnOutput('OSInitHelperFn', osInitStack.helperFn.functionArn);

    if (props?.enableAutoScaling) {
      const cwAlarmOutName = `${Aws.STACK_NAME}-cwAlarmOut`;
      const alarmOut = new cloudwatch.Alarm(this, 'CWAlarmOut', {
        alarmDescription: 'incomingRecord exceeds threshold',
        alarmName: cwAlarmOutName,
        evaluationPeriods: 1,
        threshold: 1000,
        comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
        metric: new cloudwatch.Metric({
          metricName: 'IncomingRecords',
          namespace: 'AWS/Kinesis',
          dimensionsMap: { StreamName: kinesisStream.streamName },
        }).with({
          statistic: 'Sum',
          period: Duration.seconds(60),
        }),
      });

      const cwAlarmInName = `${Aws.STACK_NAME}-cwAlarmIn`;
      const alarmIn = new cloudwatch.Alarm(this, 'CWAlarmIn', {
        alarmDescription: 'incomingRecord below threshold',
        alarmName: cwAlarmInName,
        evaluationPeriods: 3,
        threshold: 700,
        comparisonOperator: cloudwatch.ComparisonOperator.LESS_THAN_THRESHOLD,
        metric: new cloudwatch.Metric({
          metricName: 'IncomingRecords',
          namespace: 'AWS/Kinesis',
          dimensionsMap: { StreamName: kinesisStream.streamName },
        }).with({
          statistic: 'Sum',
          period: Duration.seconds(300),
        }),
      });

      // Parameter
      const kdcp = new ssm.StringParameter(this, 'KinesisDesiredCapacityParameter', {
        allowedPattern: '[0-9]+',
        description: 'Store DesiredCapacity in Parameter Store',
        stringValue: shardCountParam.valueAsString,
      });

      // Lambda
      const scalerFnName = `${Aws.STACK_NAME}-LambdaScaler`;
      const scaler = new lambda.Function(this, 'LambdaScaler', {
        code: lambda.Code.fromAsset(path.join(__dirname, 'lambda')),
        handler: 'index.lambda_handler',
        runtime: lambda.Runtime.PYTHON_3_6,
        functionName: scalerFnName,
        environment: {
          CloudWatchAlarmNameIn: cwAlarmInName,
          CloudWatchAlarmNameOut: cwAlarmOutName,
          ParameterStore: kdcp.parameterName,
        },
      });

      // Rest API GW
      const api = new apigateway.SpecRestApi(this, 'MyApi', {
        endpointTypes: [apigateway.EndpointType.REGIONAL],
        parameters: {
          endpointConfigurationTypes: 'REGIONAL',
        },
        apiDefinition: apigateway.ApiDefinition.fromInline({
          info: {
            title: {
              Ref: 'AWS::StackName',
            },
          },
          paths: {
            '/scalableTargetDimensions/{scalableTargetDimensionId}': {
              get: {
                'security': [
                  {
                    sigv4: [],
                  },
                ],
                'x-amazon-apigateway-integration': {
                  httpMethod: 'POST',
                  type: 'aws_proxy',
                  uri: `arn:${Aws.PARTITION}:apigateway:${Aws.REGION}:lambda:path/2015-03-31/functions/${scaler.functionArn}/invocations`,
                },
                'responses': {},
                'x-amazon-apigateway-any-method': {
                  consumes: [
                    'application/json',
                  ],
                  produces: [
                    'application/json',
                  ],
                },
              },
              patch: {
                'security': [
                  {
                    sigv4: [],
                  },
                ],
                'x-amazon-apigateway-integration': {
                  httpMethod: 'POST',
                  type: 'aws_proxy',
                  uri: `arn:${Aws.PARTITION}:apigateway:${Aws.REGION}:lambda:path/2015-03-31/functions/${scaler.functionArn}/invocations`,
                },
                'responses': {},
                'x-amazon-apigateway-any-method': {
                  security: [
                    {
                      sigv4: [],
                    },
                  ],
                  consumes: [
                    'application/json',
                  ],
                  produces: [
                    'application/json',
                  ],
                },
              },
            },
          },
          swagger: 2,
          securityDefinitions: {
            sigv4: {
              'in': 'header',
              'type': 'apiKey',
              'name': 'Authorization',
              'x-amazon-apigateway-authtype': 'awsSigv4',
            },
          },
        }),
        // endpointTypes: [apigateway.EndpointType.PRIVATE]
      });

      const target = new appscaling.ScalableTarget(this, 'ScalableTarget', {
        serviceNamespace: appscaling.ServiceNamespace.CUSTOM_RESOURCE,
        maxCapacity: maxCapacityParam.valueAsNumber,
        minCapacity: minCapacityParam.valueAsNumber,
        resourceId: api.deploymentStage.urlForPath(`/scalableTargetDimensions/${kinesisStream.streamName}`),
        scalableDimension: 'custom-resource:ResourceType:Property',
      });
      target.addToRolePolicy(new iam.PolicyStatement({
        actions: [
          'cloudwatch:DescribeAlarms',
        ],
        resources: [
          '*',
        ],
        effect: iam.Effect.ALLOW,
      }));
      target.addToRolePolicy(new iam.PolicyStatement({
        actions: [
          'cloudwatch:PutMetricAlarm',
          'cloudwatch:DeleteAlarms',
        ],
        resources: [
          `arn:${Aws.PARTITION}:cloudwatch:${Aws.REGION}:${Aws.ACCOUNT_ID}:alarm:${cwAlarmOutName}`,
          `arn:${Aws.PARTITION}:cloudwatch:${Aws.REGION}:${Aws.ACCOUNT_ID}:alarm:${cwAlarmInName}`,
        ],
        effect: iam.Effect.ALLOW,
      }));
      target.addToRolePolicy(new iam.PolicyStatement({
        actions: [
          'execute-api:Invoke*',
        ],
        resources: [
          api.arnForExecuteApi(undefined, '/scalableTargetDimensions/*'),
        ],
        effect: iam.Effect.ALLOW,
      }));

      target.node.addDependency(logProcessor, osInitStack);

      // Scale out
      const kinesisScaleOut = new appscaling.StepScalingAction(this, 'KinesisScaleOut', {
        scalingTarget: target,
        cooldown: Duration.seconds(600),
        metricAggregationType: appscaling.MetricAggregationType.AVERAGE,
        adjustmentType: appscaling.AdjustmentType.CHANGE_IN_CAPACITY,
      });
      kinesisScaleOut.addAdjustment({
        adjustment: +1,
        lowerBound: 0,
      });
      alarmOut.addAlarmAction(new cwa.ApplicationScalingAction(kinesisScaleOut));

      // Scale in
      const kinesisScaleIn = new appscaling.StepScalingAction(this, 'KinesisScaleIn', {
        scalingTarget: target,
        cooldown: Duration.seconds(600),
        metricAggregationType: appscaling.MetricAggregationType.AVERAGE,
        adjustmentType: appscaling.AdjustmentType.CHANGE_IN_CAPACITY,
      });
      kinesisScaleIn.addAdjustment({
        adjustment: -1,
        upperBound: 0,
      });
      alarmIn.addAlarmAction(new cwa.ApplicationScalingAction(kinesisScaleIn));


      scaler.addToRolePolicy(new iam.PolicyStatement({
        actions: [
          'kinesis:Describe*',
          'kinesis:UpdateShardCount',
        ],
        resources: [
          kinesisStream.streamArn,
        ],
        effect: iam.Effect.ALLOW,
      }));
      scaler.addToRolePolicy(new iam.PolicyStatement({
        actions: [
          'cloudformation:DescribeStackResources',
        ],
        resources: [
          '*',
        ],
        effect: iam.Effect.ALLOW,
      }));
      scaler.addToRolePolicy(new iam.PolicyStatement({
        actions: [
          'ssm:GetParameter*',
          'ssm:PutParameter',
        ],
        resources: [
          kdcp.parameterArn
        ],
        effect: iam.Effect.ALLOW,
      }));
      scaler.addToRolePolicy(new iam.PolicyStatement({
        actions: [
          'lambda:updateFunctionConfiguration',
          'lambda:ListTags',
        ],
        resources: [
          `arn:${Aws.PARTITION}:lambda:${Aws.REGION}:${Aws.ACCOUNT_ID}:function:${scalerFnName}`,
        ],
        effect: iam.Effect.ALLOW,
      }));
      scaler.addToRolePolicy(new iam.PolicyStatement({
        actions: [
          'cloudwatch:PutMetricAlarm',
          'cloudwatch:DeleteAlarms',
        ],
        resources: [
          `arn:${Aws.PARTITION}:cloudwatch:${Aws.REGION}:${Aws.ACCOUNT_ID}:alarm:${cwAlarmOutName}`,
          `arn:${Aws.PARTITION}:cloudwatch:${Aws.REGION}:${Aws.ACCOUNT_ID}:alarm:${cwAlarmOutName}`,
        ],
        effect: iam.Effect.ALLOW,
      }));

      scaler.addPermission('GetScaler', {
        principal: new iam.ServicePrincipal('apigateway.amazonaws.com'),
        sourceArn: api.arnForExecuteApi('GET', '/scalableTargetDimensions/*')
      });
      scaler.addPermission('PatchScaler', {
        principal: new iam.ServicePrincipal('apigateway.amazonaws.com'),
        sourceArn: api.arnForExecuteApi('PATCH', '/scalableTargetDimensions/*')
      });
    } else {
      this.cfnOutput('MyApiEndpoint869ABE96', 'https://DummyEndpoint');
    }

  }

  protected enable(param: { construct: cdk.IConstruct; if: cdk.CfnCondition }) {
    Aspects.of(param.construct).add(new InjectCondition(param.if));
  }

}

interface LogProcessorProps {
  readonly indexPrefix: string;

  readonly stream: kinesis.Stream;
  // readonly logBucketName: string;
  // readonly failedLogBucket: string;
  /**
   * Default VPC for OpenSearch REST API Handler
   *
   * @default - None.
   */
  readonly vpc: IVpc

  /**
   * Default Security Group for OpenSearch REST API Handler
   *
   * @default - None.
   */
  readonly securityGroup: ISecurityGroup

  /**
   * OpenSearch Endpoint Url
   *
   * @default - None.
   */
  readonly endpoint: string

  /**
   * OpenSearch or Elasticsearch
   *
   * @default - OpenSearch.
   */
  readonly engineType?: string

  /**
   * Log Type
   *
   * @default - None.
   */
  readonly logType?: string

  readonly failedLogBucket: string
}

class LogProcessor extends Construct {
  public logProcessorRoleArn: string;

  constructor(scope: Construct, id: string, props: LogProcessorProps) {
    super(scope, id);

    // Create a lambda layer with required python packages.
    const osLayer = new lambda.LayerVersion(this, 'OpenSearchLayer', {
      code: lambda.Code.fromAsset(path.join(__dirname, '../../lambda/pipeline/common/layer'), {
        bundling: {
          image: lambda.Runtime.PYTHON_3_9.bundlingImage,
          command: [
            'bash', '-c',
            'pip install -r requirements.txt -t /asset-output/python'
          ],
        },
      }),
      compatibleRuntimes: [lambda.Runtime.PYTHON_3_9],
      description: `${Aws.STACK_NAME} - Lambda layer for OpenSearch`,
    });

    // Create the Log Sender Lambda
    const logProcessorFn = new lambda.Function(this, 'LogProcessorFn', {
      description: `${Aws.STACK_NAME} - Function to process and load kinesis logs into OpenSearch`,
      runtime: lambda.Runtime.PYTHON_3_9,
      handler: 'lambda_function.lambda_handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../lambda/pipeline/app/log-processor')),
      memorySize: 1024,
      timeout: Duration.seconds(300),
      vpc: props.vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_NAT },
      securityGroups: [props.securityGroup],
      environment: {
        ENDPOINT: props.endpoint,
        ENGINE: props.engineType ?? 'OpenSearch',
        LOG_TYPE: props.logType!,
        INDEX_PREFIX: props.indexPrefix,
        // LOG_BUCKET_NAME: props.logBucketName,
        FAILED_LOG_BUCKET_NAME: props.failedLogBucket,
        VERSION: VERSION ?? 'v1.0.0',
      },
      layers: [osLayer]
    });
    logProcessorFn.addToRolePolicy(new iam.PolicyStatement({
      actions: [
        "ec2:CreateNetworkInterface",
        "ec2:DeleteNetworkInterface",
        "ec2:DescribeNetworkInterfaces"
      ],
      resources: [
        `*`,
      ]
    }));
    logProcessorFn.addToRolePolicy(new iam.PolicyStatement({
      actions: [
        "es:ESHttpGet",
        "es:ESHttpDelete",
        "es:ESHttpPut",
        "es:ESHttpPost",
        "es:ESHttpHead",
        "es:ESHttpPatch"
      ],
      resources: [
        `arn:${Aws.PARTITION}:es:${Aws.REGION}:${Aws.ACCOUNT_ID}:*`,
      ]
    }));

    if (logProcessorFn.role) {
      this.logProcessorRoleArn = logProcessorFn.role.roleArn
    }

    logProcessorFn.addEventSource(new KinesisEventSource(props.stream, {
      batchSize: 10000, // default
      maxBatchingWindow: Duration.seconds(3),
      startingPosition: lambda.StartingPosition.TRIM_HORIZON,
    }))

    const failedLogBucket = s3.Bucket.fromBucketName(this, 'failedLogBucket', props.failedLogBucket);
    failedLogBucket.grantWrite(logProcessorFn)
  }
}

class InjectCondition implements cdk.IAspect {
  public constructor(private condition: cdk.CfnCondition) { }

  public visit(node: cdk.IConstruct): void {
    if (node instanceof cdk.CfnResource) {
      node.cfnOptions.condition = this.condition;
    }
  }
}