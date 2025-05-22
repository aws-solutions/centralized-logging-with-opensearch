// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
import * as path from 'path';
import {
  Aws,
  Fn,
  Duration,
  aws_stepfunctions_tasks as tasks,
  aws_stepfunctions as sfn,
  aws_logs as logs,
  aws_lambda as lambda,
  aws_iam as iam,
  aws_dynamodb as ddb,
} from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { CloudWatchAlarmManagerSingleton } from './lambda-construct';
import { SharedPythonLayer } from '../layer/layer';
import { addCfnNagSuppressRules } from '../main-stack';
import { MicroBatchStack } from '../microbatch/main/services/amazon-services-stack';

export interface PipelineFlowProps {
  /**
   * Step Functions State Machine ARN for CloudFormation deployment Flow
   *
   * @default - None.
   */
  readonly cfnFlowSMArn: string;

  readonly table: ddb.Table;
  readonly ingestionTable: ddb.Table;

  readonly microBatchStack: MicroBatchStack;
  readonly sendAnonymizedUsageData: string;
  readonly solutionUuid: string;
}

/**
 * Stack to provision a Step Functions State Machine to orchestrate pipeline flow
 * This flow will call CloudFormation Deployment Flow (Child Flow)
 */
export class AppPipelineFlowStack extends Construct {
  readonly stateMachineArn: string;

  constructor(scope: Construct, id: string, props: PipelineFlowProps) {
    super(scope, id);

    const solution_id = 'SO8025';

    // Step Functions Tasks
    const table = props.table;
    const ingestionTable = props.ingestionTable;

    // Create a Lambda to handle the status update to backend table.
    const appPipeFlowFn = new lambda.Function(this, 'AppPipeFlowFn', {
      code: lambda.AssetCode.fromAsset(
        path.join(__dirname, '../../lambda/api/pipeline_ingestion_flow')
      ),
      runtime: lambda.Runtime.PYTHON_3_11,
      handler: 'app_pipe_flow.lambda_handler',
      timeout: Duration.seconds(60),
      memorySize: 128,
      layers: [SharedPythonLayer.getInstance(this)],
      environment: {
        SOLUTION_ID: solution_id,
        PIPELINE_TABLE: props.table.tableName,
        SOLUTION_VERSION: process.env.VERSION ? process.env.VERSION : 'v1.0.0',
        DEPLOYMENT_UUID: props.solutionUuid,
        SEND_ANONYMIZED_USAGE_DATA: props.sendAnonymizedUsageData,
      },
      description: `${Aws.STACK_NAME} - Helper function to update app pipeline status`,
    });

    table.grantReadWriteData(appPipeFlowFn);
    appPipeFlowFn.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['ssm:GetParameter'],
        resources: [
          `arn:${Aws.PARTITION}:ssm:${Aws.REGION}:${Aws.ACCOUNT_ID}:parameter/CLO/anonymous_metrics_uuid`,
        ],
      })
    );
    const child = sfn.StateMachine.fromStateMachineArn(
      this,
      'ChildSM',
      props.cfnFlowSMArn
    );

    // Create a Lambda to handle the automated alarm creation and deletion.
    // This Lambda will only be triggered by the Step Functions Task.
    const appFlowAlarmFn = new CloudWatchAlarmManagerSingleton(
      this,
      'AppFlowAlarmFn',
      {
        APP_PIPELINE_TABLE_NAME: props.table.tableName,
        APP_LOG_INGESTION_TABLE_NAME: props.ingestionTable.tableName,
        METADATA_TABLE_NAME:
          props.microBatchStack.microBatchDDBStack.MetaTable.tableName,
      }
    ).handlerFunc;

    table.grantReadWriteData(appFlowAlarmFn);
    ingestionTable.grantReadWriteData(appFlowAlarmFn);
    props.microBatchStack.microBatchDDBStack.MetaTable.grantReadWriteData(
      appFlowAlarmFn
    );
    props.microBatchStack.microBatchKMSStack.encryptionKey.grantDecrypt(
      appFlowAlarmFn
    );

    const appFlowAlarmFnPolicy = new iam.Policy(this, 'AppFlowAlarmFnPolicy', {
      statements: [
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          resources: ['*'],
          actions: [
            'sns:ListTopics',
            'sns:CreateTopic',
            'sns:Subscribe',
            'sns:Unsubscribe',
            'sns:ListSubscriptionsByTopic',
          ],
        }),
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          resources: ['*'],
          actions: ['cloudwatch:PutMetricAlarm', 'cloudwatch:DeleteAlarms'],
        }),
      ],
    });

    appFlowAlarmFn.role!.attachInlinePolicy(appFlowAlarmFnPolicy);
    addCfnNagSuppressRules(
      appFlowAlarmFnPolicy.node.defaultChild as iam.CfnPolicy,
      [
        {
          id: 'W12',
          reason:
            'This policy needs to be able to control un-predicable sns topics',
        },
      ]
    );

    const pipelineAlarmTask = new tasks.LambdaInvoke(
      this,
      'APP Pipeline Alarm Task',
      {
        lambdaFunction: appFlowAlarmFn,
        outputPath: '$.Payload',
        inputPath: '$',
      }
    );

    const pipelineResourcesBuilderTask = new tasks.LambdaInvoke(
      this,
      'SVC Pipeline ingestion Task',
      {
        lambdaFunction:
          props.microBatchStack.microBatchLambdaStack
            .PipelineResourcesBuilderStack.PipelineResourcesBuilder,
        outputPath: '$.Payload',
        payload: sfn.TaskInput.fromObject({
          RequestType: 'Create',
          ResourceProperties: {
            Resource: 'ingestion',
            Id: sfn.JsonPath.stringAt('$$.Execution.Input.args.ingestion.id'),
            Item: {
              metaName: sfn.JsonPath.stringAt(
                '$$.Execution.Input.args.ingestion.id'
              ),
              data: {
                role: {
                  sts: sfn.JsonPath.stringAt(
                    '$$.Execution.Input.args.ingestion.role'
                  ),
                },
                source: {
                  bucket: sfn.JsonPath.stringAt(
                    '$$.Execution.Input.args.ingestion.bucket'
                  ),
                  prefix: sfn.JsonPath.stringAt(
                    '$$.Execution.Input.args.ingestion.prefix'
                  ),
                  context: sfn.JsonPath.stringAt(
                    '$$.Execution.Input.args.ingestion.context'
                  ),
                },
                services: sfn.JsonPath.stringAt(
                  '$$.Execution.Input.args.ingestion.services'
                ),
              },
              pipelineId: sfn.JsonPath.stringAt(
                '$$.Execution.Input.args.ingestion.pipelineId'
              ),
            },
          },
        }),
      }
    );

    const appPipelineFlowComplete = new sfn.Succeed(
      this,
      'APP Pipeline Flow Complete'
    );

    const createIngestionChoice = new sfn.Choice(
      this,
      'Engine type is LightEngine or not?'
    )
      .when(
        sfn.Condition.and(
          sfn.Condition.stringEquals('$$.Execution.Input.action', 'START'),
          sfn.Condition.stringEquals(
            '$$.Execution.Input.args.engineType',
            'LightEngine'
          ),
          sfn.Condition.isPresent('$$.Execution.Input.args.ingestion')
        ),
        pipelineResourcesBuilderTask
      )
      .otherwise(appPipelineFlowComplete);

    pipelineAlarmTask.next(createIngestionChoice);

    const enableAlarmChoice = new sfn.Choice(this, 'Enable Alarm or not?')
      .when(
        sfn.Condition.stringEquals('$.alarmAction', 'createPipelineAlarm'),
        pipelineAlarmTask
      )
      .when(
        sfn.Condition.stringEquals('$.alarmAction', 'deletePipelineAlarm'),
        pipelineAlarmTask
      )
      .otherwise(createIngestionChoice);

    // Include the state machine in a Task state with callback pattern
    const cfnTask = new tasks.StepFunctionsStartExecution(
      this,
      'CloudFormation Flow',
      {
        stateMachine: child,
        integrationPattern: sfn.IntegrationPattern.WAIT_FOR_TASK_TOKEN,
        input: sfn.TaskInput.fromObject({
          token: sfn.JsonPath.taskToken,
          input: sfn.JsonPath.entirePayload,
        }),
        resultPath: '$.result',
      }
    );

    // State machine log group for error logs
    const logGroup = new logs.LogGroup(this, 'ErrorLogGroup', {
      logGroupName: `/aws/vendedlogs/states/${Fn.select(
        6,
        Fn.split(':', props.cfnFlowSMArn)
      )}-SM-app-pipe-error`,
    });

    // Role for state machine
    const pipelineFlowSMRole = new iam.Role(this, 'SMRole', {
      assumedBy: new iam.ServicePrincipal('states.amazonaws.com'),
    });
    // Least privilege to enable logging for state machine
    pipelineFlowSMRole.addToPolicy(
      new iam.PolicyStatement({
        actions: [
          'logs:PutResourcePolicy',
          'logs:DescribeLogGroups',
          'logs:UpdateLogDelivery',
          'logs:AssociateKmsKey',
          'logs:GetLogGroupFields',
          'logs:PutRetentionPolicy',
          'logs:CreateLogGroup',
          'logs:PutDestination',
          'logs:DescribeResourcePolicies',
          'logs:GetLogDelivery',
          'logs:ListLogDeliveries',
        ],
        effect: iam.Effect.ALLOW,
        resources: [logGroup.logGroupArn],
      })
    );

    pipelineFlowSMRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ['lambda:InvokeFunction'],
        effect: iam.Effect.ALLOW,
        resources: [
          props.microBatchStack.microBatchLambdaStack
            .PipelineResourcesBuilderStack.PipelineResourcesBuilder.functionArn,
          `${props.microBatchStack.microBatchLambdaStack.PipelineResourcesBuilderStack.PipelineResourcesBuilder.functionArn}:*`,
        ],
      })
    );

    appPipeFlowFn.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        resources: [
          `arn:${Aws.PARTITION}:cloudformation:${Aws.REGION}:${Aws.ACCOUNT_ID}:stack/*`,
        ],
        actions: [
          'cloudformation:DescribeStacks',
          'cloudformation:DescribeStackEvents',
        ],
      })
    );

    const appPipeFlowFnTask = new tasks.LambdaInvoke(this, 'Update Status', {
      lambdaFunction: appPipeFlowFn,
      outputPath: '$.Payload',
      inputPath: '$',
    });

    const pipeSM = new sfn.StateMachine(this, 'AppPipelineFlowSM', {
      definitionBody: sfn.DefinitionBody.fromChainable(
        cfnTask.next(appPipeFlowFnTask).next(enableAlarmChoice)
      ),
      role: pipelineFlowSMRole,
      logs: {
        destination: logGroup,
        level: sfn.LogLevel.ALL,
      },
    });

    const cfnAppPipelineSM = pipeSM.node.defaultChild as sfn.CfnStateMachine;
    cfnAppPipelineSM.overrideLogicalId('AppPipelineFlowSM');

    this.stateMachineArn = pipeSM.stateMachineArn;
  }
}
