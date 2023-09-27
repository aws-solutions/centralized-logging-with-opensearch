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
import {
    Construct,
} from 'constructs';
import {
    Fn,
    Aws,
    Duration,
    aws_stepfunctions_tasks as tasks,
    aws_stepfunctions as sfn,
    aws_iam as iam,
    aws_logs as logs,
    aws_lambda as lambda,
} from 'aws-cdk-lib';

import { Table } from 'aws-cdk-lib/aws-dynamodb';
import { SharedPythonLayer } from '../layer/layer';
import { addCfnNagSuppressRules } from "../main-stack";

import * as path from "path";

export interface SvcPipelineFlowProps {

    /**
     * Step Functions State Machine ARN for CloudFormation deployment Flow
     *
     * @default - None.
     */
    readonly cfnFlowSMArn: string

    /**
     * Pipeline Table ARN
     *
     * @default - None.
     */
    readonly tableArn: string

    /**
     * Pipeline Table Name
     *
     * @default - None.
     */
    readonly tableName: string

}

/**
 * Stack to provision a Step Functions State Machine to orchestrate pipeline flow
 * This flow will call CloudFormation Deployment Flow (Child Flow)
 */
export class SvcPipelineFlowStack extends Construct {

    readonly stateMachineArn: string

    constructor(scope: Construct, id: string, props: SvcPipelineFlowProps) {
        super(scope, id);

        const solution_id = "SO8025";
        const stackPrefix = "CL";

        // Step Functions Tasks
        const table = Table.fromTableArn(this, 'Table', props.tableArn);

        // Create a Lambda to handle the status update to backend table.
        const servicePipeFlowFn = new lambda.Function(this, "SvcPipeFlowFn", {
            code: lambda.AssetCode.fromAsset(
                path.join(__dirname, "../../lambda/api/pipeline_ingestion_flow")
            ),
            runtime: lambda.Runtime.PYTHON_3_9,
            handler: "svc_pipe_flow.lambda_handler",
            timeout: Duration.seconds(60),
            memorySize: 128,
            layers: [SharedPythonLayer.getInstance(this)],
            environment: {
                SOLUTION_ID: solution_id,
                PIPELINE_TABLE_NAME: props.tableName,
                SOLUTION_VERSION: process.env.VERSION ? process.env.VERSION : "v1.0.0",
            },
            description: `${Aws.STACK_NAME} - Helper function to update pipeline status`,
        });
        table.grantReadWriteData(servicePipeFlowFn);

        servicePipeFlowFn.addToRolePolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            resources: [`arn:${Aws.PARTITION}:cloudformation:${Aws.REGION}:${Aws.ACCOUNT_ID}:stack/*`],
            actions: [
              'cloudformation:DescribeStacks',
              'cloudformation:DescribeStackEvents'
            ]
        }))

        const servicePipeFlowFnTask = new tasks.LambdaInvoke(this, "Update Status", {
            lambdaFunction: servicePipeFlowFn,
            outputPath: "$.Payload",
            inputPath: "$",
        });

        const child = sfn.StateMachine.fromStateMachineArn(this, 'ChildSM', props.cfnFlowSMArn)

        // Include the state machine in a Task state with callback pattern
        const cfnTask = new tasks.StepFunctionsStartExecution(this, 'CloudFormation Flow', {
            stateMachine: child,
            integrationPattern: sfn.IntegrationPattern.WAIT_FOR_TASK_TOKEN,
            input: sfn.TaskInput.fromObject({
                token: sfn.JsonPath.taskToken,
                input: sfn.JsonPath.entirePayload,
            }),
            resultPath: '$.result',
        });

        // State machine log group for error logs
        const logGroup = new logs.LogGroup(this, 'ErrorLogGroup', {
            logGroupName: `/aws/vendedlogs/states/${Fn.select(6, Fn.split(":", props.cfnFlowSMArn))}-SM-pipeline-error`
        });

        // Role for state machine
        const pipelineFlowSMRole = new iam.Role(this, 'SMRole', {
            assumedBy: new iam.ServicePrincipal('states.amazonaws.com'),
        })
        // Least Privilage to enable logging for state machine
        pipelineFlowSMRole.addToPolicy(
            new iam.PolicyStatement({
                actions: [
                    "logs:PutResourcePolicy",
                    "logs:DescribeLogGroups",
                    "logs:UpdateLogDelivery",
                    "logs:AssociateKmsKey",
                    "logs:GetLogGroupFields",
                    "logs:PutRetentionPolicy",
                    "logs:CreateLogGroup",
                    "logs:PutDestination",
                    "logs:DescribeResourcePolicies",
                    "logs:GetLogDelivery",
                    "logs:ListLogDeliveries"
                ],
                effect: iam.Effect.ALLOW,
                resources: [logGroup.logGroupArn],
            }),
        )

        // Create a Lambda to handle the automated alarm creation and deletion.
        // This Lambda will only be triggered by the Step Functions Task.
        const svcFlowAlarmFn = new lambda.Function(this, "SvcFlowAlarmFn", {
            code: lambda.AssetCode.fromAsset(
                path.join(__dirname, "../../lambda/api/alarm")
            ),
            runtime: lambda.Runtime.PYTHON_3_9,
            handler: "lambda_function.lambda_handler",
            timeout: Duration.seconds(60),
            memorySize: 128,
            layers: [SharedPythonLayer.getInstance(this)],
            environment: {
                SOLUTION_ID: solution_id,
                STACK_PREFIX: stackPrefix,
                SOLUTION_VERSION: process.env.VERSION ? process.env.VERSION : "v1.0.0",
                APP_PIPELINE_TABLE_NAME: "",
                PIPELINE_TABLE_NAME: table.tableName,
                APP_LOG_INGESTION_TABLE_NAME: "",
            },
            description: `${Aws.STACK_NAME} - Helper function to automated create and delete svc pipeline alarm`,
        });
        table.grantReadWriteData(svcFlowAlarmFn);

        const svcFlowAlarmFnPolicy = new iam.Policy(
            this,
            "SvcFlowAlarmFnPolicy",
            {
              statements: [
                new iam.PolicyStatement({
                  effect: iam.Effect.ALLOW,
                  resources: ["*"],
                  actions: [
                    "sns:ListTopics",
                    "sns:CreateTopic",
                    "sns:Subscribe",
                    "sns:Unsubscribe",
                    "sns:ListSubscriptionsByTopic"
                  ]
                }),
                new iam.PolicyStatement({
                  effect: iam.Effect.ALLOW,
                  resources: ["*"],
                  actions: [
                    "cloudwatch:PutMetricAlarm",
                    "cloudwatch:DeleteAlarms",
                  ]
                }),
              ]
            }
          );
      
          svcFlowAlarmFn.role!.attachInlinePolicy(svcFlowAlarmFnPolicy);
          addCfnNagSuppressRules(
            svcFlowAlarmFnPolicy.node.defaultChild as iam.CfnPolicy,
            [
              {
                id: "W12",
                reason:
                  "This policy needs to be able to control un-predicable sns topics"
              }
            ]
          );

        const pipelineAlarmTask = new tasks.LambdaInvoke(this, 'SVC Pipeline Alarm Task', {
            lambdaFunction: svcFlowAlarmFn,
            outputPath: '$.Payload',
            inputPath: "$",
        })

        const svcPipelineFlowComplete = new sfn.Succeed(this, 'SVC Pipeline Flow Complete')
        pipelineAlarmTask.next(svcPipelineFlowComplete)

        const enableAlarmChoice = new sfn.Choice(this, 'Enable Alarm or not?')
            .when(sfn.Condition.stringEquals('$.alarmAction', 'createPipelineAlarm'), pipelineAlarmTask)
            .when(sfn.Condition.stringEquals('$.alarmAction', 'deletePipelineAlarm'), pipelineAlarmTask)
            .otherwise(svcPipelineFlowComplete)

        const pipeSM = new sfn.StateMachine(this, 'PipelineFlowSM', {
            definitionBody: sfn.DefinitionBody.fromChainable(cfnTask.next(servicePipeFlowFnTask).next(enableAlarmChoice)),
            role: pipelineFlowSMRole,
            logs: {
                destination: logGroup,
                level: sfn.LogLevel.ALL,
            },
        });

        const cfnPipeFlow = pipeSM.node.defaultChild as sfn.CfnStateMachine;
        cfnPipeFlow.overrideLogicalId('ServicePipelineFlowSM')

        this.stateMachineArn = pipeSM.stateMachineArn


    }

}