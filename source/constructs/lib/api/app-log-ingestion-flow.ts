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
    Aws,
    Fn,
    Duration,
    aws_stepfunctions_tasks as tasks,
    aws_stepfunctions as sfn,
    aws_logs as logs,
    aws_iam as iam,
    aws_lambda as lambda,
} from 'aws-cdk-lib';
import {
    Table,
} from 'aws-cdk-lib/aws-dynamodb';
import { SharedPythonLayer } from "../layer/layer";
import { MicroBatchStack } from '../microbatch/main/services/amazon-services-stack';

import * as path from "path";

export interface PipelineFlowProps {

    /**
     * Step Functions State Machine ARN for CloudFormation deployment Flow
     *
     * @default - None.
     */
    readonly cfnFlowSMArn: string

    /**
     * Ingestion Table ARN
     *
     * @default - None.
     */
    readonly ingestionTableArn: string

    /**
     * Log Source Table ARN
     *
     * @default - None.
     */
    readonly logSourceTableArn: string

    readonly microBatchStack: MicroBatchStack;
}

/**
 * Stack to provision a Step Functions State Machine to orchestrate pipeline flow
 * This flow will call CloudFormation Deployment Flow (Child Flow)
 */
export class AppIngestionFlowStack extends Construct {

    readonly stateMachineArn: string

    constructor(scope: Construct, id: string, props: PipelineFlowProps) {
        super(scope, id);
        const solution_id = "SO8025";

        // Step Functions Tasks
        const ingestionTable = Table.fromTableArn(this, 'Table', props.ingestionTableArn);
        const logSourceTable = Table.fromTableArn(this, "LogSourceTable", props.logSourceTableArn);

        // Create a Lambda to handle the status update to backend table.
        const appIngestionFlowFn = new lambda.Function(this, "AppIngestionFlowFn", {
            code: lambda.AssetCode.fromAsset(
                path.join(__dirname, "../../lambda/api/pipeline_ingestion_flow")
            ),
            runtime: lambda.Runtime.PYTHON_3_11,
            handler: "app_ingestion_flow.lambda_handler",
            timeout: Duration.seconds(60),
            memorySize: 128,
            layers: [SharedPythonLayer.getInstance(this)],
            environment: {
                SOLUTION_ID: solution_id,
                INGESTION_TABLE: ingestionTable.tableName,
                LOG_SOURCE_TABLE: logSourceTable.tableName,
                SOLUTION_VERSION: process.env.VERSION ? process.env.VERSION : "v1.0.0"
            },
            description: `${Aws.STACK_NAME} - Helper function to update Ingestion status for S3 Source and Syslog Ingestion`
        });

        ingestionTable.grantReadWriteData(appIngestionFlowFn);
        logSourceTable.grantReadWriteData(appIngestionFlowFn);
        appIngestionFlowFn.addToRolePolicy(
            new iam.PolicyStatement({
                actions: ['cloudformation:DescribeStackEvents'],
                effect: iam.Effect.ALLOW,
                resources: [`arn:${Aws.PARTITION}:cloudformation:${Aws.REGION}:${Aws.ACCOUNT_ID}:stack/*`],
            })
        );

        const appIngestionFlowFnTask = new tasks.LambdaInvoke(this, "Update Status", {
            lambdaFunction: appIngestionFlowFn,
            outputPath: "$.Payload",
            inputPath: "$",
            payload: sfn.TaskInput.fromObject({
                "id.$": "$$.Execution.Input.id",
                "engineType.$": "$$.Execution.Input.args.engineType",
                "pattern.$": "$$.Execution.Input.args.pattern",
                "action.$": "$$.Execution.Input.action",
                "result.$": "$.result",
              }),
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

        const createS3SourceIngestion = new tasks.LambdaInvoke(this, "Create S3 as Source ingestion for Light Engine.", {
            lambdaFunction: props.microBatchStack.microBatchLambdaStack.PipelineResourcesBuilderStack.PipelineResourcesBuilder,
            payload: sfn.TaskInput.fromObject({
                "RequestType": "Create",
                "ResourceProperties": {
                  "Resource": "ingestion",
                  "Id.$": "$$.Execution.Input.id",
                  "Item": {
                    "metaName.$": "$$.Execution.Input.id",
                    "data": {
                      "role": {
                        "sts.$": "$$.Execution.Input.args.role"
                      },
                      "source": {
                        "bucket.$": "$$.Execution.Input.args.bucket",
                        "prefix.$": "$$.Execution.Input.args.prefix"
                      }
                    },
                    "pipelineId.$": "$$.Execution.Input.args.pipelineId"
                  }
                }
              }),
            integrationPattern: sfn.IntegrationPattern.REQUEST_RESPONSE,
            resultPath: "$.result",
        });

        createS3SourceIngestion.addRetry({
            interval: Duration.seconds(60),
            maxAttempts: 5,
            maxDelay: Duration.seconds(120),
            backoffRate: 2,
            jitterStrategy: sfn.JitterType.FULL,
          });
        
        const deleteS3SourceIngestionWhenFailed = new tasks.LambdaInvoke(this, "Delete ingestion when failed.", {
            lambdaFunction: props.microBatchStack.microBatchLambdaStack.PipelineResourcesBuilderStack.PipelineResourcesBuilder,
            payload: sfn.TaskInput.fromObject({
                "RequestType": "Delete",
                "ResourceProperties": {
                  "Resource": "ingestion",
                  "Id.$": "$$.Execution.Input.id"
                }
              }),
            retryOnServiceExceptions: true,
            integrationPattern: sfn.IntegrationPattern.REQUEST_RESPONSE,
            resultPath: sfn.JsonPath.DISCARD,
        });

        const deleteS3SourceIngestion = new tasks.LambdaInvoke(this, "Delete S3 as Source ingestion for Light Engine.", {
            lambdaFunction: props.microBatchStack.microBatchLambdaStack.PipelineResourcesBuilderStack.PipelineResourcesBuilder,
            payload: sfn.TaskInput.fromObject({
                "RequestType": "Delete",
                "ResourceProperties": {
                  "Resource": "ingestion",
                  "Id.$": "$$.Execution.Input.id"
                }
              }),
            retryOnServiceExceptions: false,
            integrationPattern: sfn.IntegrationPattern.REQUEST_RESPONSE,
            resultPath: "$.result",
        });

        const choice = new sfn.Choice(this, 'Choice')
            .when(sfn.Condition.and(
                sfn.Condition.stringEquals("$$.Execution.Input.args.engineType", "LightEngine"), 
                sfn.Condition.stringEquals("$$.Execution.Input.action", "START"),
                sfn.Condition.stringEquals("$$.Execution.Input.args.pattern", "S3SourceStack")), createS3SourceIngestion)
            .when(sfn.Condition.and(
                sfn.Condition.stringEquals("$$.Execution.Input.args.engineType", "LightEngine"), 
                sfn.Condition.stringEquals("$$.Execution.Input.action", "STOP"),
                sfn.Condition.stringEquals("$$.Execution.Input.args.pattern", "S3SourceStack")), deleteS3SourceIngestion)
            .otherwise(cfnTask);
        
        cfnTask.next(appIngestionFlowFnTask);
        createS3SourceIngestion.next(appIngestionFlowFnTask);
        createS3SourceIngestion.addCatch(deleteS3SourceIngestionWhenFailed, {resultPath: "$.result"});
        deleteS3SourceIngestionWhenFailed.next(appIngestionFlowFnTask);
        deleteS3SourceIngestionWhenFailed.addCatch(appIngestionFlowFnTask, {resultPath: sfn.JsonPath.DISCARD});
        deleteS3SourceIngestion.next(appIngestionFlowFnTask);
        deleteS3SourceIngestion.addCatch(appIngestionFlowFnTask, {resultPath: "$.result"});

        // State machine log group for error logs
        const logGroup = new logs.LogGroup(this, 'ErrorLogGroup', {
            logGroupName: `/aws/vendedlogs/states/${Fn.select(6, Fn.split(":", props.cfnFlowSMArn))}-SM-app-ingestion-error`
        });

        // Role for state machine
        const appLogIngestionFlowSMRole = new iam.Role(this, 'SMRole', {
            assumedBy: new iam.ServicePrincipal('states.amazonaws.com'),
        })
        // Least Privilege to enable logging for state machine
        appLogIngestionFlowSMRole.addToPolicy(
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

        appLogIngestionFlowSMRole.addToPolicy(
            new iam.PolicyStatement({
                actions: [
                    "lambda:InvokeFunction"
                ],
                effect: iam.Effect.ALLOW,
                resources: [
                  props.microBatchStack.microBatchLambdaStack.PipelineResourcesBuilderStack.PipelineResourcesBuilder.functionArn,
                    `${props.microBatchStack.microBatchLambdaStack.PipelineResourcesBuilderStack.PipelineResourcesBuilder.functionArn}:*`
                ],
            }),
        );

        const pipeSM = new sfn.StateMachine(this, 'PipelineFlowSM', {
            definitionBody: sfn.DefinitionBody.fromChainable(choice),
            role: appLogIngestionFlowSMRole,
            logs: {
                destination: logGroup,
                level: sfn.LogLevel.ALL,
            },
        });

        const cfnAppPipelineSM = pipeSM.node.defaultChild as sfn.CfnStateMachine;
        cfnAppPipelineSM.overrideLogicalId('AppIngestionFlowSM')

        this.stateMachineArn = pipeSM.stateMachineArn


    }

}