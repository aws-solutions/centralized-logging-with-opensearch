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


import { addCfnNagSuppressRules } from "../main-stack";

export interface LogSourceStackProps {

    /**
     * Default Appsync GraphQL API for OpenSearch REST API Handler
     *
     * @default - None.
     */
    readonly graphqlApi: appsync.GraphqlApi

}
export class LogSourceStack extends Construct {
    ec2LogSourceTable: ddb.Table;
    s3LogSourceTable: ddb.Table;
    eksClusterLogSourceTable: ddb.Table;

    constructor(scope: Construct, id: string, props: LogSourceStackProps) {
        super(scope, id);

        const solution_id = 'SO8025'

        // Create a table to store ec2 logging logSource info
        this.ec2LogSourceTable = new ddb.Table(this, 'EC2LogSourceTable', {
            partitionKey: {
                name: 'id',
                type: ddb.AttributeType.STRING
            },
            billingMode: ddb.BillingMode.PROVISIONED,
            removalPolicy: RemovalPolicy.DESTROY,
            encryption: ddb.TableEncryption.DEFAULT,
            pointInTimeRecovery: true,
        })

        const cfnEC2LogSourceTable = this.ec2LogSourceTable.node.defaultChild as ddb.CfnTable;
        cfnEC2LogSourceTable.overrideLogicalId('EC2LogSourceTable')
        addCfnNagSuppressRules(cfnEC2LogSourceTable, [
            {
                id: 'W73',
                reason: 'This table has billing mode as PROVISIONED'
            },
            {
                id: 'W74',
                reason: 'This table is set to use DEFAULT encryption, the key is owned by DDB.'
            },
        ])

        // Create a table to store s3 logging logSource info
        this.s3LogSourceTable = new ddb.Table(this, 'S3LogSourceTable', {
            partitionKey: {
                name: 'id',
                type: ddb.AttributeType.STRING
            },
            billingMode: ddb.BillingMode.PROVISIONED,
            removalPolicy: RemovalPolicy.DESTROY,
            encryption: ddb.TableEncryption.DEFAULT,
            pointInTimeRecovery: true,
        })

        const cfnS3LogSourceTable = this.s3LogSourceTable.node.defaultChild as ddb.CfnTable;
        cfnS3LogSourceTable.overrideLogicalId('S3LogSourceTable')
        addCfnNagSuppressRules(cfnS3LogSourceTable, [
            {
                id: 'W73',
                reason: 'This table has billing mode as PROVISIONED'
            },
            {
                id: 'W74',
                reason: 'This table is set to use DEFAULT encryption, the key is owned by DDB.'
            },
        ])

        // Create a table to store ekscluster logging logSource info
        this.eksClusterLogSourceTable = new ddb.Table(this, 'EKSClusterLogSourceTable', {
            partitionKey: {
                name: 'id',
                type: ddb.AttributeType.STRING
            },
            billingMode: ddb.BillingMode.PROVISIONED,
            removalPolicy: RemovalPolicy.DESTROY,
            encryption: ddb.TableEncryption.DEFAULT,
            pointInTimeRecovery: true,
        })

        const cfnEKSClusterLogSourceTable = this.eksClusterLogSourceTable.node.defaultChild as ddb.CfnTable;
        cfnEKSClusterLogSourceTable.overrideLogicalId('EKSClusterLogSourceTable')
        addCfnNagSuppressRules(cfnEKSClusterLogSourceTable, [
            {
                id: 'W73',
                reason: 'This table has billing mode as PROVISIONED'
            },
            {
                id: 'W74',
                reason: 'This table is set to use DEFAULT encryption, the key is owned by DDB.'
            },
        ])



        // Create a lambda to handle all logSource related APIs.
        const logSourceHandler = new lambda.Function(this, 'LogSourceHandler', {
            code: lambda.AssetCode.fromAsset(path.join(__dirname, '../../lambda/api/log_source')),
            runtime: lambda.Runtime.PYTHON_3_9,
            handler: 'lambda_function.lambda_handler',
            timeout: Duration.seconds(60),
            memorySize: 1024,
            environment: {
                //  TODO: using EC2_LOG_SOURCE_TABLE to store ec2 log path
                EC2_LOG_SOURCE_TABLE_NAME: this.ec2LogSourceTable.tableName,
                S3_LOG_SOURCE_TABLE_NAME: this.s3LogSourceTable.tableName,
                EKS_CLUSTER_SOURCE_TABLE_NAME: this.eksClusterLogSourceTable.tableName,
                SOLUTION_ID: solution_id,
                SOLUTION_VERSION: process.env.VERSION ? process.env.VERSION : 'v1.0.0',
            },
            description: 'Log Hub - LogSource APIs Resolver',
        })

        // Grant permissions to the logSource lambda
        this.ec2LogSourceTable.grantReadWriteData(logSourceHandler)
        this.s3LogSourceTable.grantReadWriteData(logSourceHandler)
        this.eksClusterLogSourceTable.grantReadWriteData(logSourceHandler)

        // Add logSource lambda as a Datasource
        const LogSourceLambdaDS = props.graphqlApi.addLambdaDataSource('LogSourceLambdaDS', logSourceHandler, {
            description: 'Lambda Resolver Datasource'
        });

        // Set resolver for releted logSource API methods
        LogSourceLambdaDS.createResolver({
            typeName: 'Query',
            fieldName: 'getLogSource',
            requestMappingTemplate: appsync.MappingTemplate.lambdaRequest(),
            responseMappingTemplate: appsync.MappingTemplate.lambdaResult()
        })


        LogSourceLambdaDS.createResolver({
            typeName: 'Query',
            fieldName: 'listLogSources',
            requestMappingTemplate: appsync.MappingTemplate.lambdaRequest(),
            responseMappingTemplate: appsync.MappingTemplate.lambdaResult()
        })

        LogSourceLambdaDS.createResolver({
            typeName: 'Mutation',
            fieldName: 'createLogSource',
            requestMappingTemplate: appsync.MappingTemplate.lambdaRequest(),
            responseMappingTemplate: appsync.MappingTemplate.lambdaResult()
        })

        LogSourceLambdaDS.createResolver({
            typeName: 'Mutation',
            fieldName: 'deleteLogSource',
            requestMappingTemplate: appsync.MappingTemplate.lambdaRequest(),
            responseMappingTemplate: appsync.MappingTemplate.lambdaResult()
        })

        LogSourceLambdaDS.createResolver({
            typeName: 'Mutation',
            fieldName: 'updateLogSource',
            requestMappingTemplate: appsync.MappingTemplate.lambdaRequest(),
            responseMappingTemplate: appsync.MappingTemplate.lambdaResult()
        })

    }
}

