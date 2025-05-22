// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
import * as path from 'path';
import {
  Aws,
  Duration,
  CfnCondition,
  IAspect,
  CfnResource,
  Aspects,
  aws_iam as iam,
  aws_lambda as lambda,
  aws_ssm as ssm,
  aws_kinesis as kinesis,
  aws_apigateway as apigateway,
  aws_cloudwatch as cloudwatch,
  aws_cloudwatch_actions as cwa,
  aws_applicationautoscaling as appscaling,
  aws_logs as logs,
  CfnParameter,
  Fn,
  Stack,
} from 'aws-cdk-lib';
import { ISecurityGroup, IVpc } from 'aws-cdk-lib/aws-ec2';
import { KinesisEventSource } from 'aws-cdk-lib/aws-lambda-event-sources';
import { NagSuppressions } from 'cdk-nag';
import { Construct, IConstruct } from 'constructs';

import { AppLogProcessor } from '../pipeline/application/app-log-processor';
import { constructFactory } from '../util/stack-helper';
import { CfnGuardSuppressResourceList } from '../util/add-cfn-guard-suppression';

export interface KDSStackProps {
  /**
   * Default VPC for OpenSearch REST API Handler
   *
   * @default - None.
   */
  readonly vpc: IVpc;

  /**
   * Default Security Group for OpenSearch REST API Handler
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
   * OpenSearch or Elasticsearch
   *
   * @default - OpenSearch.
   */
  readonly engineType: string;

  /**
   * Index Prefix
   */
  readonly indexPrefix: string;

  /**
   * OpenSearch Domain Name
   *
   * @default - None.
   */
  readonly domainName: string;

  /**
   * Wheather to create Sample Dashboard
   *
   * @default - Yes.
   */
  readonly createDashboard?: string;

  /**
   * S3 bucket name for failed logs
   */
  readonly backupBucketName: string;

  readonly shardCount: number;
  readonly minCapacity: number;
  readonly maxCapacity: number;

  readonly enableAutoScaling: boolean;

  /**
   * Stack Prefix
   */
  readonly stackPrefix: string;

  readonly env?: { [key: string]: string };

  readonly logType: string;

  /**
   * A list of plugins
   *
   * @default - None.
   */
  readonly plugins?: string;

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
  readonly subCategory: 'RT' | 'S3' | 'FLB' | 'CWL';
  readonly indexTemplateGzipBase64?: string;
  /**
   * A gzip base64 encoded string of OpenSearch index template.
   */
}

export class KDSStack extends Construct {
  readonly kinesisStreamArn: string;
  readonly kinesisStreamName: string;
  // readonly kdsRoleName: string;
  // readonly kdsRoleArn: string;

  // readonly logProcessorRoleArn: string;
  readonly logProcessorLogGroupName: string;
  public logProcessorFn: lambda.Function;
  public logProcessorRoleArn: string;
  constructor(scope: Construct, id: string, props: KDSStackProps) {
    super(scope, id);

    const streamName = new CfnParameter(this, 'streamName', {
      type: 'String',
      default: '',
    });
    streamName.overrideLogicalId('streamName');

    const hasStreamName = new CfnCondition(this, 'hasStreamName', {
      expression: Fn.conditionNot(
        Fn.conditionEquals(streamName.valueAsString, '')
      ),
    });

    const kinesisStream = new kinesis.Stream(this, 'Stream', {
      shardCount: props.shardCount,
      streamName: Stack.of(this).resolve(
        Fn.conditionIf(
          hasStreamName.logicalId,
          streamName.valueAsString,
          Aws.NO_VALUE
        )
      ),
      encryption: kinesis.StreamEncryption.MANAGED,
    });

    this.kinesisStreamArn = kinesisStream.streamArn;
    this.kinesisStreamName = kinesisStream.streamName;

    const logProcessor = new AppLogProcessor(this, 'LogProcessor', {
      vpc: props.vpc,
      securityGroup: props.securityGroup,
      endpoint: props.endpoint,
      indexPrefix: props.indexPrefix,
      engineType: props.engineType,
      domainName: props.domainName,
      createDashboard: props.createDashboard,
      backupBucketName: props.backupBucketName,
      source: 'KDS',
      subCategory: props.subCategory,
      shardNumbers: props.shardNumbers,
      replicaNumbers: props.replicaNumbers,
      warmAge: props.warmAge,
      coldAge: props.coldAge,
      retainAge: props.retainAge,
      rolloverSize: props.rolloverSize,
      indexSuffix: props.indexSuffix,
      codec: props.codec,
      refreshInterval: props.refreshInterval,
      solutionId: props.solutionId,
      logType: props.logType,
      env: props.env,
      stackPrefix: props.stackPrefix,
      enableConfigJsonParam: false,
      indexTemplateGzipBase64: props.indexTemplateGzipBase64,
      logProcessorConcurrency: props.logProcessorConcurrency,
    });
    NagSuppressions.addResourceSuppressions(logProcessor, [
      {
        id: 'AwsSolutions-IAM4',
        reason: 'Code of CDK custom resource, can not be modified',
      },
    ]);
    // this.logProcessorFn = logProcessor.logProcessorFn
    logProcessor.logProcessorFn.addEventSource(
      new KinesisEventSource(kinesisStream, {
        batchSize: 10000, // default
        maxBatchingWindow: Duration.seconds(10),
        startingPosition: lambda.StartingPosition.TRIM_HORIZON,
      })
    );

    this.logProcessorRoleArn = logProcessor.logProcessorFn.role!.roleArn;
    this.logProcessorLogGroupName =
      logProcessor.logProcessorFn.logGroup.logGroupName;

    if (props?.enableAutoScaling) {
      const cwAlarmOutName = `${Aws.STACK_NAME}-cwAlarmOut`;
      const alarmOut = new cloudwatch.Alarm(this, 'CWAlarmOut', {
        alarmDescription: 'incomingRecord exceeds threshold',
        alarmName: cwAlarmOutName,
        evaluationPeriods: 1,
        threshold: 1000,
        comparisonOperator:
          cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
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
      const kdcp = new ssm.StringParameter(
        this,
        'KinesisDesiredCapacityParameter',
        {
          allowedPattern: '[0-9]+',
          description: 'Store DesiredCapacity in Parameter Store',
          stringValue: props.shardCount.toString(),
        }
      );

      // Lambda
      const scalerFnName = `${Aws.STACK_NAME}-LambdaScaler`;
      const scaler = new lambda.Function(this, 'LambdaScaler', {
        code: lambda.Code.fromAsset(path.join(__dirname, 'lambda')),
        handler: 'index.lambda_handler',
        runtime: lambda.Runtime.PYTHON_3_11,
        functionName: scalerFnName,
        environment: {
          CloudWatchAlarmNameIn: cwAlarmInName,
          CloudWatchAlarmNameOut: cwAlarmOutName,
          ParameterStore: kdcp.parameterName,
        },
      });
      NagSuppressions.addResourceSuppressions(scaler, [
        {
          id: 'AwsSolutions-IAM5',
          reason: 'The managed policy needs to use any resources.',
        },
      ]);
      
      // CWL LogGroup for APIGateway
      const apiAccessLogGroup = new logs.LogGroup(
        this,
        'APIGatewayAccessLogGroup'
      );


      // Rest API GW
      const api = new apigateway.SpecRestApi(this, 'MyApi', {
        endpointTypes: [apigateway.EndpointType.REGIONAL],
        parameters: {
          endpointConfigurationTypes: 'REGIONAL',
        },
        cloudWatchRole: true,
        deployOptions: {
          loggingLevel: apigateway.MethodLoggingLevel.INFO,
          dataTraceEnabled: true,
          accessLogDestination: new apigateway.LogGroupLogDestination(
            apiAccessLogGroup
          ),
          accessLogFormat: apigateway.AccessLogFormat.jsonWithStandardFields(),
          cacheDataEncrypted: true,
          cachingEnabled: true
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
                security: [
                  {
                    sigv4: [],
                  },
                ],
                'x-amazon-apigateway-integration': {
                  httpMethod: 'POST',
                  type: 'aws_proxy',
                  uri: `arn:${Aws.PARTITION}:apigateway:${Aws.REGION}:lambda:path/2015-03-31/functions/${scaler.functionArn}/invocations`,
                },
                responses: {},
                'x-amazon-apigateway-any-method': {
                  consumes: ['application/json'],
                  produces: ['application/json'],
                },
              },
              patch: {
                security: [
                  {
                    sigv4: [],
                  },
                ],
                'x-amazon-apigateway-integration': {
                  httpMethod: 'POST',
                  type: 'aws_proxy',
                  uri: `arn:${Aws.PARTITION}:apigateway:${Aws.REGION}:lambda:path/2015-03-31/functions/${scaler.functionArn}/invocations`,
                },
                responses: {},
                'x-amazon-apigateway-any-method': {
                  security: [
                    {
                      sigv4: [],
                    },
                  ],
                  consumes: ['application/json'],
                  produces: ['application/json'],
                },
              },
            },
          },
          swagger: 2,
          securityDefinitions: {
            sigv4: {
              in: 'header',
              type: 'apiKey',
              name: 'Authorization',
              'x-amazon-apigateway-authtype': 'awsSigv4',
            },
          },
        }),
        // endpointTypes: [apigateway.EndpointType.PRIVATE]
      });

      constructFactory(apigateway.RequestValidator)(
        this,
        'MyRequestValidator',
        {
          restApi: api,
          requestValidatorName: 'requestValidatorName',
          validateRequestBody: true,
          validateRequestParameters: true,
        }
      );

      const target = new appscaling.ScalableTarget(this, 'ScalableTarget', {
        serviceNamespace: appscaling.ServiceNamespace.CUSTOM_RESOURCE,
        maxCapacity: props.maxCapacity,
        minCapacity: props.minCapacity,
        resourceId: api.deploymentStage.urlForPath(
          `/scalableTargetDimensions/${kinesisStream.streamName}`
        ),
        scalableDimension: 'custom-resource:ResourceType:Property',
      });
      NagSuppressions.addResourceSuppressions(target, [
        {
          id: 'AwsSolutions-IAM5',
          reason: 'The managed policy needs to use any resources.',
        },
      ]);
      target.addToRolePolicy(
        new iam.PolicyStatement({
          actions: ['cloudwatch:DescribeAlarms'],
          resources: ['*'],
          effect: iam.Effect.ALLOW,
        })
      );
      target.addToRolePolicy(
        new iam.PolicyStatement({
          actions: ['cloudwatch:PutMetricAlarm', 'cloudwatch:DeleteAlarms'],
          resources: [
            `arn:${Aws.PARTITION}:cloudwatch:${Aws.REGION}:${Aws.ACCOUNT_ID}:alarm:${cwAlarmOutName}`,
            `arn:${Aws.PARTITION}:cloudwatch:${Aws.REGION}:${Aws.ACCOUNT_ID}:alarm:${cwAlarmInName}`,
          ],
          effect: iam.Effect.ALLOW,
        })
      );
      target.addToRolePolicy(
        new iam.PolicyStatement({
          actions: ['execute-api:Invoke'],
          resources: [
            api.arnForExecuteApi(undefined, '/scalableTargetDimensions/*'),
          ],
          effect: iam.Effect.ALLOW,
        })
      );

      target.node.addDependency(logProcessor);

      // Scale out
      const kinesisScaleOut = new appscaling.StepScalingAction(
        this,
        'KinesisScaleOut',
        {
          scalingTarget: target,
          cooldown: Duration.seconds(600),
          metricAggregationType: appscaling.MetricAggregationType.AVERAGE,
          adjustmentType: appscaling.AdjustmentType.CHANGE_IN_CAPACITY,
        }
      );
      kinesisScaleOut.addAdjustment({
        adjustment: +1,
        lowerBound: 0,
      });
      alarmOut.addAlarmAction(
        new cwa.ApplicationScalingAction(kinesisScaleOut)
      );

      // Override the logical ID
      const cfnKinesisScaleOut = kinesisScaleOut.node
        .defaultChild as appscaling.CfnScalingPolicy;
      cfnKinesisScaleOut.overrideLogicalId('KinesisScaleOut');

      // Scale in
      const kinesisScaleIn = new appscaling.StepScalingAction(
        this,
        'KinesisScaleIn',
        {
          scalingTarget: target,
          cooldown: Duration.seconds(600),
          metricAggregationType: appscaling.MetricAggregationType.AVERAGE,
          adjustmentType: appscaling.AdjustmentType.CHANGE_IN_CAPACITY,
        }
      );
      kinesisScaleIn.addAdjustment({
        adjustment: -1,
        upperBound: 0,
      });
      alarmIn.addAlarmAction(new cwa.ApplicationScalingAction(kinesisScaleIn));

      // Override the logical ID
      const cfnKinesisScaleIn = kinesisScaleIn.node
        .defaultChild as appscaling.CfnScalingPolicy;
      cfnKinesisScaleIn.overrideLogicalId('KinesisScaleIn');

      scaler.addToRolePolicy(
        new iam.PolicyStatement({
          actions: [
            'kinesis:DescribeStreamSummary',
            'kinesis:DescribeStreamConsumer',
            'kinesis:DescribeStream',
            'kinesis:DescribeLimits',
            'kinesis:UpdateShardCount',
          ],
          resources: [kinesisStream.streamArn],
          effect: iam.Effect.ALLOW,
        })
      );
      scaler.addToRolePolicy(
        new iam.PolicyStatement({
          actions: ['cloudformation:DescribeStackResources'],
          resources: ['*'],
          effect: iam.Effect.ALLOW,
        })
      );
      scaler.addToRolePolicy(
        new iam.PolicyStatement({
          actions: [
            'ssm:GetParameterHistory',
            'ssm:GetParametersByPath',
            'ssm:GetParameters',
            'ssm:GetParameter',
            'ssm:PutParameter',
          ],
          resources: [kdcp.parameterArn],
          effect: iam.Effect.ALLOW,
        })
      );
      scaler.addToRolePolicy(
        new iam.PolicyStatement({
          actions: ['lambda:updateFunctionConfiguration', 'lambda:ListTags'],
          resources: [
            `arn:${Aws.PARTITION}:lambda:${Aws.REGION}:${Aws.ACCOUNT_ID}:function:${scalerFnName}`,
          ],
          effect: iam.Effect.ALLOW,
        })
      );
      scaler.addToRolePolicy(
        new iam.PolicyStatement({
          actions: ['cloudwatch:PutMetricAlarm', 'cloudwatch:DeleteAlarms'],
          resources: [
            `arn:${Aws.PARTITION}:cloudwatch:${Aws.REGION}:${Aws.ACCOUNT_ID}:alarm:${cwAlarmOutName}`,
            `arn:${Aws.PARTITION}:cloudwatch:${Aws.REGION}:${Aws.ACCOUNT_ID}:alarm:${cwAlarmInName}`,
          ],
          effect: iam.Effect.ALLOW,
        })
      );

      scaler.addPermission('GetScaler', {
        principal: new iam.ServicePrincipal('apigateway.amazonaws.com'),
        sourceArn: api.arnForExecuteApi('GET', '/scalableTargetDimensions/*'),
      });
      scaler.addPermission('PatchScaler', {
        principal: new iam.ServicePrincipal('apigateway.amazonaws.com'),
        sourceArn: api.arnForExecuteApi('PATCH', '/scalableTargetDimensions/*'),
      });
    }

    Aspects.of(this).add(new CfnGuardSuppressResourceList({
      "AWS::Logs::LogGroup": ["CLOUDWATCH_LOG_GROUP_ENCRYPTED"] // Using service default encryption https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/data-protection.html
    }));
  }

  /* istanbul ignore next */
  protected enable(param: { construct: IConstruct; if: CfnCondition }) {
    Aspects.of(param.construct).add(new InjectCondition(param.if));
  }
}

// /* istanbul ignore next */
class InjectCondition implements IAspect {
  public constructor(private condition: CfnCondition) {}

  public visit(node: IConstruct): void {
    if (node instanceof CfnResource) {
      node.cfnOptions.condition = this.condition;
    }
  }
}
