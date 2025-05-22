/**********************************************************************************************************************
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 *********************************************************************************************************************/

import {
  Aws,
  CfnCondition,
  CustomResource,
  Duration,
  Fn,
  aws_lambda as lambda
} from 'aws-cdk-lib';
import {
  PolicyDocument,
  PolicyStatement,
  Role,
  ServicePrincipal,
} from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import * as path from 'path';
import { SharedPythonLayer } from '../layer/layer';

export interface SolutionMetricsProps {
  readonly solutionId: string;
  readonly solutionVersion: string;
  readonly template: string;
  readonly sendMetrics: string;
}

export class SolutionMetrics extends Construct {
  readonly uuidCustomResource: CustomResource;

  constructor(scope: Construct, id: string, props: SolutionMetricsProps) {
    super(scope, id);

    const metricsCondition = new CfnCondition(this, 'AnonymousDatatoAWS', {
      expression: Fn.conditionEquals(props.sendMetrics, 'Yes'),
    });

    const customResourceLambdaPolicyDocument = new PolicyDocument({
      statements: [
        new PolicyStatement({
          actions: ['cloudwatch:PutMetricData'],
          resources: ['*'],
        }),
        new PolicyStatement({
          actions: [
            'logs:CreateLogGroup',
            'logs:CreateLogStream',
            'logs:PutLogEvents',
          ],
          resources: [
            `arn:${Aws.PARTITION}:logs:${Aws.REGION}:${Aws.ACCOUNT_ID}:log-group:/aws/lambda/*`,
          ],
        }),
      ],
    });

    const metricsLambdaRole = new Role(this, `${id}Role`, {
      assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
      inlinePolicies: { LambdaPolicy: customResourceLambdaPolicyDocument },
    });

    const metricsFunction = new lambda.Function(this, 'MetricsHelper', {
      runtime: lambda.Runtime.PYTHON_3_11,
      handler: 'lambda_function.handler',
      description:
        'This function generates UUID for each deployment and sends anonymous data to the AWS Solutions team',
      role: metricsLambdaRole,
      code: lambda.AssetCode.fromAsset(
        path.join(__dirname, '../../lambda/metrics')
      ),
      timeout: Duration.seconds(120),
      layers: [SharedPythonLayer.getInstance(this)],
      environment: {
        SOLUTION_ID: props.solutionId,
        SOLUTION_VERSION: props.solutionVersion,
        SEND_ANONYMIZED_USAGE_DATA: props.sendMetrics,
      },
    });

    this.uuidCustomResource = new CustomResource(this, 'CreateUniqueID', {
      serviceToken: metricsFunction.functionArn,
      properties: {
        Resource: 'UUID',
      },
      resourceType: 'Custom::CreateUUID',
    });

    (
      this.uuidCustomResource.node.defaultChild as lambda.CfnFunction
    ).cfnOptions.condition = metricsCondition;

    const sendDataFunction = new CustomResource(this, 'SendAnonymousData', {
      serviceToken: metricsFunction.functionArn,
      properties: {
        Resource: 'AnonymousMetrics',
        Version: props.solutionVersion,
        Region: Aws.REGION,
        Template: props.template,
        DeploymentUuid: this.uuidCustomResource.getAttString('UUID'),
      },
      resourceType: 'Custom::AnonymousMetrics',
    });

    // the send data custom resource to be enabled under metrics condition
    (
      sendDataFunction.node.defaultChild as lambda.CfnFunction
    ).cfnOptions.condition = metricsCondition;
  }
}
