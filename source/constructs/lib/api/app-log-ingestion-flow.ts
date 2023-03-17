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
import {
    Construct,
} from 'constructs';
import {
    Fn,
    aws_stepfunctions_tasks as tasks,
    aws_stepfunctions as sfn,
    aws_logs as logs,
    aws_iam as iam
} from 'aws-cdk-lib';
import {
    Table,
    ITable
} from 'aws-cdk-lib/aws-dynamodb';
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
export class AppIngestionFlowStack extends Construct {

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
            },
            expressionAttributeValues: {
                ':status': tasks.DynamoAttributeValue.fromString(status),
                ':sid': tasks.DynamoAttributeValue.fromString(sfn.JsonPath.stringAt('$.result.stackId')),
            },
            updateExpression: 'SET #status = :status, #sid = :sid',
            resultPath: sfn.JsonPath.DISCARD,
        })
    }

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
            logGroupName: `/aws/vendedlogs/states/${Fn.select(6, Fn.split(":", props.cfnFlowSMArn))}-SM-app-ingestion-error`
        });

        // Role for state machine
        const appLogIngestionFlowSMRole = new iam.Role(this, 'SMRole', {
            assumedBy: new iam.ServicePrincipal('states.amazonaws.com'),
        })
        // Least Privilage to enable logging for state machine
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

        const pipeSM = new sfn.StateMachine(this, 'PipelineFlowSM', {
            definition: cfnTask.next(checkStatus),
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