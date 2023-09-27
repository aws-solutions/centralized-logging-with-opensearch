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
}

export class KDSStack extends Construct {
  readonly kinesisStreamArn: string;
  readonly kinesisStreamName: string;
  // readonly kdsRoleName: string;
  // readonly kdsRoleArn: string;

  readonly logProcessorRoleArn: string;
  readonly logProcessorLogGroupName: string;

  constructor(scope: Construct, id: string, props: KDSStackProps) {
    super(scope, id);

    const streamName = new CfnParameter(this, 'StreamName', {
      type: 'String',
      default: '',
    });
    streamName.overrideLogicalId('StreamName');

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
    });

    this.kinesisStreamArn = kinesisStream.streamArn;
    this.kinesisStreamName = kinesisStream.streamName;

    const logProcessor = new AppLogProcessor(this, 'LogProcessor', {
      source: 'KDS',
      indexPrefix: props.indexPrefix,
      vpc: props.vpc,
      securityGroup: props.securityGroup,
      endpoint: props.endpoint,
      engineType: props.engineType,
      backupBucketName: props.backupBucketName,
      env: props.env,
      stackPrefix: props.stackPrefix,
      logType: props.logType,
    });
    NagSuppressions.addResourceSuppressions(logProcessor, [
      {
        id: 'AwsSolutions-IAM4',
        reason: 'Code of CDK custom resource, can not be modified',
      },
    ]);

    logProcessor.logProcessorFn.addEventSource(
      new KinesisEventSource(kinesisStream, {
        batchSize: 10000, // default
        maxBatchingWindow: Duration.seconds(3),
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
        runtime: lambda.Runtime.PYTHON_3_9,
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
      const cfnKinesisScaleOut = kinesisScaleOut.node.defaultChild as appscaling.CfnScalingPolicy;
      cfnKinesisScaleOut.overrideLogicalId("KinesisScaleOut");

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
      const cfnKinesisScaleIn = kinesisScaleIn.node.defaultChild as appscaling.CfnScalingPolicy;
      cfnKinesisScaleIn.overrideLogicalId("KinesisScaleIn");

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
    // else {
    //   this.cfnOutput("MyApiEndpoint869ABE96", "https://DummyEndpoint");
    // }
  }

  /* istanbul ignore next */
  protected enable(param: { construct: IConstruct; if: CfnCondition }) {
    Aspects.of(param.construct).add(new InjectCondition(param.if));
  }
}

// /* istanbul ignore next */
class InjectCondition implements IAspect {
  public constructor(private condition: CfnCondition) { }

  public visit(node: IConstruct): void {
    if (node instanceof CfnResource) {
      node.cfnOptions.condition = this.condition;
    }
  }
}
