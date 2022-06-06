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
import * as logs from '@aws-cdk/aws-logs';
import * as iam from '@aws-cdk/aws-iam';

export interface ClusterFlowProps {

    /**
     * Step Functions State Machine ARN for CloudFormation deployment Flow
     *
     * @default - None.
     */
    readonly cfnFlowSMArn: string

    /**
     * cluster Table ARN
     *
     * @default - None.
     */
    readonly tableArn: string
}

/**
 * Stack to provision a Step Functions State Machine to orchestrate cluster proxy/alarm flow
 * This flow will call CloudFormation Deployment Flow (Child Flow)
 */
export class ClusterFlowStack extends Construct {

    readonly stateMachineArn: string

    private updateProxyStatus(table: ITable, status: string, url: string) {
        return new tasks.DynamoUpdateItem(this, `Proxy ${status} Status`, {
            key: {
                id: tasks.DynamoAttributeValue.fromString(sfn.JsonPath.stringAt('$.id'))
            },
            table: table,
            expressionAttributeNames: {
                '#status': 'proxyStatus',
                '#sid': 'proxyStackId',
                '#url': 'proxyALB',
                '#error': 'proxyError',
            },
            expressionAttributeValues: {
                ':status': tasks.DynamoAttributeValue.fromString(status),
                ':sid': tasks.DynamoAttributeValue.fromString(sfn.JsonPath.stringAt('$.result.stackId')),
                ':url': tasks.DynamoAttributeValue.fromString(url),
                ':error': tasks.DynamoAttributeValue.fromString(sfn.JsonPath.stringAt('$.result.error')),
            },
            updateExpression: 'SET #status = :status, #sid = :sid, #url = :url, #error = :error',
        })
    };

    private updateAlarmStatus(table: ITable, status: string, url: string) {
        return new tasks.DynamoUpdateItem(this, `Alarm ${status} Status`, {
            key: {
                id: tasks.DynamoAttributeValue.fromString(sfn.JsonPath.stringAt('$.id'))
            },
            table: table,
            expressionAttributeNames: {
                '#status': 'alarmStatus',
                '#sid': 'alarmStackId',
                '#error': 'alarmError',
            },
            expressionAttributeValues: {
                ':status': tasks.DynamoAttributeValue.fromString(status),
                ':sid': tasks.DynamoAttributeValue.fromString(sfn.JsonPath.stringAt('$.result.stackId')),
                ':error': tasks.DynamoAttributeValue.fromString(sfn.JsonPath.stringAt('$.result.error')),
            },
            updateExpression: 'SET #status = :status, #sid = :sid, #error = :error',
        })
    };

    private createCfnTask(type: string, child: sfn.IStateMachine) {
        return new tasks.StepFunctionsStartExecution(this, `${type} Stack Flow`, {
            stateMachine: child,
            integrationPattern: sfn.IntegrationPattern.WAIT_FOR_TASK_TOKEN,
            input: sfn.TaskInput.fromObject({
                token: sfn.JsonPath.taskToken,
                input: sfn.JsonPath.entirePayload,
            }),
            resultPath: '$.result',
        });
    };


    constructor(scope: Construct, id: string, props: ClusterFlowProps) {
        super(scope, id);

        const table = Table.fromTableArn(this, 'Table', props.tableArn);

        const proxyEnableStatus = this.updateProxyStatus(table, 'ENABLED', sfn.JsonPath.stringAt('$.result.outputs[0].OutputValue'))
        const proxyDisableStatus = this.updateProxyStatus(table, 'DISABLED', '')
        const proxyErrorStatus = this.updateProxyStatus(table, 'ERROR', '')

        const alarmEnableStatus = this.updateAlarmStatus(table, 'ENABLED', sfn.JsonPath.stringAt('$.result.outputs[0].OutputValue'))
        const alarmDisableStatus = this.updateAlarmStatus(table, 'DISABLED', '')
        const alarmErrorStatus = this.updateAlarmStatus(table, 'ERROR', '')

        const checkProxyStatus = new sfn.Choice(this, 'Check Proxy Status')
            .when(
                sfn.Condition.stringEquals('$.result.stackStatus', 'CREATE_COMPLETE'), proxyEnableStatus)
            .when(
                sfn.Condition.stringEquals('$.result.stackStatus', 'DELETE_COMPLETE'), proxyDisableStatus)
            .otherwise(proxyErrorStatus)

        const checkAlarmStatus = new sfn.Choice(this, 'Check Alarm Status')
            .when(
                sfn.Condition.stringEquals('$.result.stackStatus', 'CREATE_COMPLETE'), alarmEnableStatus)
            .when(
                sfn.Condition.stringEquals('$.result.stackStatus', 'DELETE_COMPLETE'), alarmDisableStatus)
            .otherwise(alarmErrorStatus)




        const child = sfn.StateMachine.fromStateMachineArn(this, 'ChildSM', props.cfnFlowSMArn)

        // // Include the state machine in a Task state with callback pattern
        const cfnProxyTask = this.createCfnTask('Proxy', child)
        const cfnAlarmTask = this.createCfnTask('Alarm', child)

        cfnProxyTask.next(checkProxyStatus)
        cfnAlarmTask.next(checkAlarmStatus)

        const checkType = new sfn.Choice(this, 'Check Stack Type')
            .when(
                sfn.Condition.stringEquals('$.type', 'Proxy'), cfnProxyTask)
            .otherwise(cfnAlarmTask)

        // State machine log group for error logs
        const logGroup = new logs.LogGroup(this, 'ErrorLogGroup', {
            logGroupName: `/aws/vendedlogs/states/${Fn.select(6, Fn.split(":", props.cfnFlowSMArn))}-SM-cluster-error`
        });

        // Role for state machine
        const LogHubAPIClusterFlowSMRole = new iam.Role(this, 'SMRole', {
            assumedBy: new iam.ServicePrincipal('states.amazonaws.com'),
        })
        // Least Privilage to enable logging for state machine
        LogHubAPIClusterFlowSMRole.addToPolicy(
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

        const clusterSM = new sfn.StateMachine(this, 'ClusterFlowSM', {
            definition: checkType,
            role: LogHubAPIClusterFlowSMRole,
            logs: {
                destination: logGroup,
                level: sfn.LogLevel.ERROR,
            },
        });

        this.stateMachineArn = clusterSM.stateMachineArn


    }

}