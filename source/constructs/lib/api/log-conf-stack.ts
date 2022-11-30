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
    Duration,  
    RemovalPolicy,
    aws_dynamodb as ddb,
    aws_lambda as lambda,
    
 } from 'aws-cdk-lib';  
import * as appsync from "@aws-cdk/aws-appsync-alpha";
import * as path from 'path';
import { addCfnNagSuppressRules } from "../main-stack";

export interface LogConfStackProps {

    /**
     * Default Appsync GraphQL API for OpenSearch REST API Handler
     *
     * @default - None.
     */
    readonly graphqlApi: appsync.GraphqlApi

}
export class LogConfStack extends Construct {
    logConfTable: ddb.Table;
    
    constructor(scope: Construct, id: string, props: LogConfStackProps) {
        super(scope, id);

        const solution_id = 'SO8025'

        // Create a table to store logging logConf info
        this.logConfTable = new ddb.Table(this, 'LogConfTable', {
            partitionKey: {
                name: 'id',
                type: ddb.AttributeType.STRING
            },
            billingMode: ddb.BillingMode.PROVISIONED,
            removalPolicy: RemovalPolicy.DESTROY,
            encryption: ddb.TableEncryption.DEFAULT,
            pointInTimeRecovery: true,
        })

        const cfnLogConfTable = this.logConfTable.node.defaultChild as ddb.CfnTable;
        cfnLogConfTable.overrideLogicalId('LogConfTable')
        addCfnNagSuppressRules(cfnLogConfTable, [
            {
                id: 'W73',
                reason: 'This table has billing mode as PROVISIONED'
            },
            {
                id: 'W74',
                reason: 'This table is set to use DEFAULT encryption, the key is owned by DDB.'
            },
        ])



        // Create a lambda to handle all logConf related APIs.
        const logConfHandler = new lambda.Function(this, 'LogConfHandler', {
            code: lambda.AssetCode.fromAsset(path.join(__dirname, '../../lambda/api/log_conf')),
            runtime: lambda.Runtime.PYTHON_3_9,
            handler: 'lambda_function.lambda_handler',
            timeout: Duration.seconds(60),
            memorySize: 1024,
            environment: {

                LOGCONF_TABLE: this.logConfTable.tableName,
                SOLUTION_ID: solution_id,
                SOLUTION_VERSION: process.env.VERSION ? process.env.VERSION : 'v1.0.0',
            },
            description: 'Log Hub - LogConf APIs Resolver',
        })

        // Grant permissions to the logConf lambda
        this.logConfTable.grantReadWriteData(logConfHandler)


        // Add logConf table as a Datasource
        const logConfDynamoDS = props.graphqlApi.addDynamoDbDataSource('LogConfDynamoDS', this.logConfTable, {
            description: 'DynamoDB Resolver Datasource'
        })

        logConfDynamoDS.createResolver({
            typeName: 'Query',
            fieldName: 'getLogConf',
            requestMappingTemplate: appsync.MappingTemplate.dynamoDbGetItem('id', 'id'),
            responseMappingTemplate: appsync.MappingTemplate.fromFile(path.join(__dirname, '../../graphql/vtl/log_conf/GetLogConfResp.vtl')),
        })

        // Add logConf lambda as a Datasource
        const LogConfLambdaDS = props.graphqlApi.addLambdaDataSource('LogConfLambdaDS', logConfHandler, {
            description: 'Lambda Resolver Datasource'
        });

        // Set resolver for releted logConf API methods
        LogConfLambdaDS.createResolver({
            typeName: 'Query',
            fieldName: 'listLogConfs',
            requestMappingTemplate: appsync.MappingTemplate.lambdaRequest(),
            responseMappingTemplate: appsync.MappingTemplate.fromFile(path.join(__dirname, '../../graphql/vtl/log_conf/ListLogConfsResp.vtl')),
        })

        LogConfLambdaDS.createResolver({
            typeName: 'Query',
            fieldName: 'checkTimeFormat',
            requestMappingTemplate: appsync.MappingTemplate.lambdaRequest(),
            responseMappingTemplate: appsync.MappingTemplate.lambdaResult()
        })

        LogConfLambdaDS.createResolver({
            typeName: 'Mutation',
            fieldName: 'createLogConf',
            requestMappingTemplate: appsync.MappingTemplate.fromFile(path.join(__dirname, '../../graphql/vtl/log_conf/CreateLogConf.vtl')),
            responseMappingTemplate: appsync.MappingTemplate.lambdaResult()
        })

        LogConfLambdaDS.createResolver({
            typeName: 'Mutation',
            fieldName: 'deleteLogConf',
            requestMappingTemplate: appsync.MappingTemplate.lambdaRequest(),
            responseMappingTemplate: appsync.MappingTemplate.lambdaResult()
        })

        LogConfLambdaDS.createResolver({
            typeName: 'Mutation',
            fieldName: 'updateLogConf',
            requestMappingTemplate: appsync.MappingTemplate.fromFile(path.join(__dirname, '../../graphql/vtl/log_conf/UpdateLogConf.vtl')),
            responseMappingTemplate: appsync.MappingTemplate.lambdaResult()
        })

    }
}

