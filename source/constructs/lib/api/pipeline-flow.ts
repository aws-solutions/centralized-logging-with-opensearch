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

import { Construct, Fn } from '@aws-cdk/core';
import * as sfn from '@aws-cdk/aws-stepfunctions'
import * as tasks from '@aws-cdk/aws-stepfunctions-tasks'
import { Table, ITable } from '@aws-cdk/aws-dynamodb';
import { IFunction } from '@aws-cdk/aws-lambda';
import * as logs from '@aws-cdk/aws-logs';
import * as iam from '@aws-cdk/aws-iam';

export interface PipelineFlowProps {

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

}

/**
 * Stack to provision a Step Functions State Machine to orchestrate pipeline flow
 * This flow will call CloudFormation Deployment Flow (Child Flow)
 */
export class PipelineFlowStack extends Construct {

    readonly stateMachineArn: string

    private updateStatus(table: ITable, status: string) {
        return new tasks.DynamoUpdateItem(this, `Set ${status} Status`, {
            key: {
                id: tasks.DynamoAttributeValue.fromString(sfn.JsonPath.stringAt('$.id'))
            },
            table: table,
            expressionAttributeNames: {
                '#status': 'status',
                '#sid': 'stackId',
                '#error': 'error',
            },
            expressionAttributeValues: {
                ':status': tasks.DynamoAttributeValue.fromString(status),
                ':id': tasks.DynamoAttributeValue.fromString(sfn.JsonPath.stringAt('$.result.stackId')),
                ':error': tasks.DynamoAttributeValue.fromString(sfn.JsonPath.stringAt('$.result.error')),
            },
            updateExpression: 'SET #status = :status, #sid = :id, #error = :error',
            resultPath: sfn.JsonPath.DISCARD,
        })
    };

    constructor(scope: Construct, id: string, props: PipelineFlowProps) {
        super(scope, id);

        // Step Functions Tasks
        const table = Table.fromTableArn(this, 'Table', props.tableArn);


        const activeStatus = this.updateStatus(table, 'ACTIVE')
        const errorStatus = this.updateStatus(table, 'ERROR')
        const inactiveStatus = this.updateStatus(table, 'INACTIVE')

        const checkStatus = new sfn.Choice(this, 'Check Stack Status')
            .when(
                sfn.Condition.stringEquals('$.result.stackStatus', 'DELETE_COMPLETE'), inactiveStatus)
            .when(
                sfn.Condition.stringEquals('$.result.stackStatus', 'CREATE_COMPLETE'), activeStatus)
            .otherwise(errorStatus)


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
        const LogHubAPIPipelineFlowSMRole = new iam.Role(this, 'SMRole', {
            assumedBy: new iam.ServicePrincipal('states.amazonaws.com'),
        })
        // Least Privilage to enable logging for state machine
        LogHubAPIPipelineFlowSMRole.addToPolicy(
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

        const pipeSM = new sfn.StateMachine(this, 'PipelineFlowSM', {
            definition: cfnTask.next(checkStatus),
            role: LogHubAPIPipelineFlowSMRole,
            logs: {
                destination: logGroup,
                level: sfn.LogLevel.ERROR,
            },
        });

        // const cfnPipeFlow = pipeSM.node.defaultChild as sfn.CfnStateMachine;
        // cfnPipeFlow.overrideLogicalId('LogHubPipelineFlowSM')

        this.stateMachineArn = pipeSM.stateMachineArn


    }

}