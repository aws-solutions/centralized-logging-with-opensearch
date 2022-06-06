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
import { Function, IFunction } from '@aws-cdk/aws-lambda';
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
    readonly applogPipelineTableArn: string
    readonly applogIngestionTableArn: string

    readonly eksClusterPodLogPipelineStfnLambdaArn: string

}


interface KeyVal<T> {
    [key: string]: T
}

/**
 * Stack to provision a Step Functions State Machine to orchestrate pipeline flow
 * This flow will call CloudFormation Deployment Flow (Child Flow)
 */
export class EKSClusterPodLogPipelineFlowStack extends Construct {

    readonly stateMachineArn: string

    private updateStatus(id: string, ddbTable: ITable, status: string, extra?: KeyVal<tasks.DynamoAttributeValue>) {
        const base = {
            status: tasks.DynamoAttributeValue.fromString(status),
            stackId: tasks.DynamoAttributeValue.fromString(sfn.JsonPath.stringAt('$.result.stackId')),
            error: tasks.DynamoAttributeValue.fromString(sfn.JsonPath.stringAt('$.result.error'))
        };

        interface TmpType {
            eans: KeyVal<string>
            eavs: KeyVal<tasks.DynamoAttributeValue>
        }

        const merged = Object.assign(base, extra);
        const eanvs = Object.entries(merged).reduce((acc, [k, v]) => {
            const words = k.split('.');
            const o = words.map<TmpType>((word, index) => {
                const o: TmpType = {
                    eans: {},
                    eavs: {},
                };
                if (index === (words.length - 1)) {
                    o.eans['#' + word] = word;
                    o.eavs[':' + words.join('_')] = v;
                } else {
                    o.eans['#' + word] = word;
                };
                return o;
            });
            return acc.concat(o);
        }, [] as TmpType[]);

        const expressionAttributeNames = eanvs.reduce((acc, cur) => {
            return Object.assign(acc, cur.eans);
        }, {} as KeyVal<string>);

        const expressionAttributeValues = eanvs.reduce((acc, cur) => {
            return Object.assign(acc, cur.eavs);
        }, {} as KeyVal<tasks.DynamoAttributeValue>);

        const fields = Object.entries(merged).map(([k, _]) => {
            const words = k.split('.');
            return `#${words.join('.#')} = :${words.join('_')}`
        });

        const updateExpression = `SET ${fields.join(', ')}`;
        var keyId = sfn.JsonPath.stringAt('$.appPipelineId')
        if (id == 'ApplogIngestion')
            keyId = sfn.JsonPath.stringAt('$.appLogIngestionId')

        return new tasks.DynamoUpdateItem(this, `Set ${id} ${status} Status`, {
            key: {
                id: tasks.DynamoAttributeValue.fromString(keyId)
            },
            table: ddbTable,
            expressionAttributeNames,
            expressionAttributeValues,
            updateExpression,
            resultPath: sfn.JsonPath.DISCARD,
        })
    };

    constructor(scope: Construct, id: string, props: PipelineFlowProps) {
        super(scope, id);

        //lambda
        const eksClusterPodLogPipelineStfnLambda = Function.fromFunctionArn(this, 'EKSClusterPodLogPipelineStfnLambda', props.eksClusterPodLogPipelineStfnLambdaArn)
        const lambdaTask = new tasks.LambdaInvoke(this, `Set Ingestion Status to ACTIVE`, {
            lambdaFunction: eksClusterPodLogPipelineStfnLambda,
            outputPath: '$.Payload',

        })
        // Step Functions Tasks
        const applogPipelineTable = Table.fromTableArn(this, 'ApplogPipelineTable', props.applogPipelineTableArn);
        const applogIngestionTable = Table.fromTableArn(this, 'ApplogIngestionTable', props.applogIngestionTableArn);

        //Applog Ingestion Status        
        const appLogIngestionErrorStatus = this.updateStatus('ApplogIngestion', applogIngestionTable, 'ERROR')
        const appLogIngestionInactiveStatus = this.updateStatus('ApplogIngestion', applogIngestionTable, 'INACTIVE')
        //AppLog Pipeline Status
        const appLogPipelineActiveStatus = this.updateStatus('ApplogPipeline', applogPipelineTable, 'ACTIVE', {
            'kdsParas.osHelperFnArn': tasks.DynamoAttributeValue.fromString(sfn.JsonPath.stringAt('$.result.outputs[0].OutputValue')), // OSInitHelperFn
            'kdsParas.kdsArn': tasks.DynamoAttributeValue.fromString(sfn.JsonPath.stringAt('$.result.outputs[1].OutputValue')), // KinesisStreamArn
            'kdsParas.streamName': tasks.DynamoAttributeValue.fromString(sfn.JsonPath.stringAt('$.result.outputs[3].OutputValue')), // KinesisStreamName
            'kdsParas.regionName': tasks.DynamoAttributeValue.fromString(sfn.JsonPath.stringAt('$.result.outputs[4].OutputValue')), // KinesisStreamRegion
        })
        const appLogPipelineErrorStatus = this.updateStatus('ApplogPipeline', applogPipelineTable, 'ERROR')
        const appLogPipelineInactiveStatus = this.updateStatus('ApplogPipeline', applogPipelineTable, 'INACTIVE')

        appLogPipelineActiveStatus.next(lambdaTask)
        appLogPipelineErrorStatus.next(appLogIngestionErrorStatus)
        appLogPipelineInactiveStatus.next(appLogIngestionInactiveStatus)






        const checkStatus = new sfn.Choice(this, 'Check KDS Stack Status')
            .when(sfn.Condition.stringEquals('$.result.stackStatus', 'DELETE_COMPLETE'), appLogPipelineInactiveStatus)
            .when(sfn.Condition.stringEquals('$.result.stackStatus', 'CREATE_COMPLETE'), appLogPipelineActiveStatus)
            .otherwise(appLogPipelineErrorStatus)


        const child = sfn.StateMachine.fromStateMachineArn(this, 'EKSPodLogPipelineChildSM', props.cfnFlowSMArn)

        // Include the state machine in a Task state with callback pattern
        const cfnTask = new tasks.StepFunctionsStartExecution(this, 'KDS CloudFormation Flow', {
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
            logGroupName: `/aws/vendedlogs/states/${Fn.select(6, Fn.split(":", props.cfnFlowSMArn))}-SM-eks-cluster-error`
        });

        // Role for state machine
        const LogHubAPIEKSClusterPodLogPipelineFlowSMRole = new iam.Role(this, 'SMRole', {
            assumedBy: new iam.ServicePrincipal('states.amazonaws.com'),
        })
        // Least Privilage to enable logging for state machine
        LogHubAPIEKSClusterPodLogPipelineFlowSMRole.addToPolicy(
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

        const pipeSM = new sfn.StateMachine(this, 'EKSClusterPodLogPipelineFlowSM', {
            definition: cfnTask.next(checkStatus),
            role: LogHubAPIEKSClusterPodLogPipelineFlowSMRole,
            logs: {
                destination: logGroup,
                level: sfn.LogLevel.ERROR,
            },
        });

        this.stateMachineArn = pipeSM.stateMachineArn


    }

}