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

import { Construct, Duration, RemovalPolicy } from '@aws-cdk/core';
import * as appsync from '@aws-cdk/aws-appsync';
import * as lambda from '@aws-cdk/aws-lambda';
import * as path from 'path';
import * as ddb from '@aws-cdk/aws-dynamodb';
import * as iam from '@aws-cdk/aws-iam';


import { addCfnNagSuppressRules } from "../main-stack";
import { AppPipelineFlowStack } from './app-pipeline-flow';

export interface AppPipelineStackProps {

    /**
     * Step Functions State Machine ARN for CloudFormation deployment Flow
     *
     * @default - None.
     */
    readonly cfnFlowSMArn: string

    /**
     * Default Appsync GraphQL API for OpenSearch REST API Handler
     *
     * @default - None.
     */
    readonly graphqlApi: appsync.GraphqlApi

}
export class AppPipelineStack extends Construct {
    readonly appPipelineTable: ddb.Table;
    readonly appLogIngestionTable: ddb.Table;
    constructor(scope: Construct, id: string, props: AppPipelineStackProps) {
        super(scope, id);

        const solution_id = 'SO8025'

        // Create a table to store logging appPipeline info
        this.appPipelineTable = new ddb.Table(this, 'AppPipelineTable', {
            partitionKey: {
                name: 'id',
                type: ddb.AttributeType.STRING
            },
            billingMode: ddb.BillingMode.PROVISIONED,
            removalPolicy: RemovalPolicy.DESTROY,
            encryption: ddb.TableEncryption.DEFAULT,
            pointInTimeRecovery: true,
        })

        const cfnAppPipelineTable = this.appPipelineTable.node.defaultChild as ddb.CfnTable;
        cfnAppPipelineTable.overrideLogicalId('AppPipelineTable')
        addCfnNagSuppressRules(cfnAppPipelineTable, [
            {
                id: 'W73',
                reason: 'This table has billing mode as PROVISIONED'
            },
            {
                id: 'W74',
                reason: 'This table is set to use DEFAULT encryption, the key is owned by DDB.'
            },
        ])

        // Create a table to store logging appLogIngestion info
        this.appLogIngestionTable = new ddb.Table(this, 'AppLogIngestionTable', {
            partitionKey: {
                name: 'id',
                type: ddb.AttributeType.STRING
            },
            billingMode: ddb.BillingMode.PROVISIONED,
            removalPolicy: RemovalPolicy.DESTROY,
            encryption: ddb.TableEncryption.DEFAULT,
            pointInTimeRecovery: true,
        })

        const cfnAppLogIngestionTable = this.appLogIngestionTable.node.defaultChild as ddb.CfnTable;
        cfnAppLogIngestionTable.overrideLogicalId('AppLogIngestionTable')
        addCfnNagSuppressRules(cfnAppLogIngestionTable, [
            {
                id: 'W73',
                reason: 'This table has billing mode as PROVISIONED'
            },
            {
                id: 'W74',
                reason: 'This table is set to use DEFAULT encryption, the key is owned by DDB.'
            },
        ])


        // Create a Step Functions to orchestrate pipeline flow
        const pipeFlow = new AppPipelineFlowStack(this, 'PipelineFlowSM', {
            tableArn: this.appPipelineTable.tableArn,
            cfnFlowSMArn: props.cfnFlowSMArn,
        })

        // Create a lambda to handle all appPipeline related APIs.
        const appPipelineHandler = new lambda.Function(this, 'AppPipelineHandler', {
            code: lambda.AssetCode.fromAsset(path.join(__dirname, '../../lambda/api/app_pipeline')),
            runtime: lambda.Runtime.PYTHON_3_9,
            handler: 'lambda_function.lambda_handler',
            timeout: Duration.seconds(60),
            memorySize: 1024,
            environment: {
                STATE_MACHINE_ARN: pipeFlow.stateMachineArn,
                APPPIPELINE_TABLE: this.appPipelineTable.tableName,
                APPLOGINGESTION_TABLE: this.appLogIngestionTable.tableName,
                SOLUTION_ID: solution_id,
                SOLUTION_VERSION: process.env.VERSION ? process.env.VERSION : 'v1.0.0',
            },
            description: 'Log Hub - AppPipeline APIs Resolver',
        })

        // Grant permissions to the appPipeline lambda
        this.appPipelineTable.grantReadWriteData(appPipelineHandler)
        this.appLogIngestionTable.grantReadWriteData(appPipelineHandler)
        appPipelineHandler.addToRolePolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            resources: [pipeFlow.stateMachineArn],
            actions: [
                'states:StartExecution'
            ]
        }))
        // Grant kinesis permissions to the appPipeline lambda
        appPipelineHandler.addToRolePolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            resources: ["*"],
            actions: [
                'kinesis:DescribeStreamSummary'
            ]
        }))


        // Add appPipeline table as a Datasource
        // const pipeDynamoDS = props.graphqlApi.addDynamoDbDataSource('AppPipelineDynamoDS', this.appPipelineTable, {
        //     description: 'DynamoDB Resolver Datasource'
        // })

        // pipeDynamoDS.createResolver({
        //     typeName: 'Query',
        //     fieldName: 'getAppPipeline',
        //     requestMappingTemplate: appsync.MappingTemplate.dynamoDbGetItem('id', 'id'),
        //     responseMappingTemplate: appsync.MappingTemplate.dynamoDbResultItem()
        // })

        // Add appPipeline lambda as a Datasource
        const appPipeLambdaDS = props.graphqlApi.addLambdaDataSource('AppPipelineLambdaDS', appPipelineHandler, {
            description: 'Lambda Resolver Datasource'
        });

        // Set resolver for releted appPipeline API methods
        appPipeLambdaDS.createResolver({
            typeName: 'Query',
            fieldName: 'listAppPipelines',
            requestMappingTemplate: appsync.MappingTemplate.lambdaRequest(),
            responseMappingTemplate: appsync.MappingTemplate.lambdaResult()
        })

        appPipeLambdaDS.createResolver({
            typeName: 'Mutation',
            fieldName: 'createAppPipeline',
            requestMappingTemplate: appsync.MappingTemplate.lambdaRequest(),
            responseMappingTemplate: appsync.MappingTemplate.lambdaResult()
        })

        appPipeLambdaDS.createResolver({
            typeName: 'Mutation',
            fieldName: 'deleteAppPipeline',
            requestMappingTemplate: appsync.MappingTemplate.lambdaRequest(),
            responseMappingTemplate: appsync.MappingTemplate.lambdaResult()
        })

        appPipeLambdaDS.createResolver({
            typeName: 'Query',
            fieldName: 'getAppPipeline',
            requestMappingTemplate: appsync.MappingTemplate.lambdaRequest(),
            responseMappingTemplate: appsync.MappingTemplate.lambdaResult()
        })

    }
}

