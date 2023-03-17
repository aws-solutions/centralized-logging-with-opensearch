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
    Aws,
    Duration,
    RemovalPolicy,
    aws_dynamodb as ddb,
    aws_lambda as lambda,
    aws_iam as iam,
    Fn
} from 'aws-cdk-lib';
import * as appsync from "@aws-cdk/aws-appsync-alpha";
import * as path from 'path';
import { addCfnNagSuppressRules } from "../main-stack";
export interface LogSourceStackProps {

    /**
     * Default Appsync GraphQL API for OpenSearch REST API Handler
     *
     * @default - None.
     */
    readonly graphqlApi: appsync.GraphqlApi
    readonly eksClusterLogSourceTable: ddb.Table
    readonly centralAssumeRolePolicy: iam.ManagedPolicy;

    /**
     * Default VPC ID for Log Agent
     *
     * @default - None.
     */
    readonly defaultVPC: string;

    /**
     * Default Subnets ID for Log Agent
     *
     * @default - None.
     */
    readonly defaultPublicSubnets: string[];

    readonly asyncCrossAccountHandler: lambda.Function

}
export class LogSourceStack extends Construct {
    logSourceTable: ddb.Table;
    ec2LogSourceTable: ddb.Table;
    s3LogSourceTable: ddb.Table;

    constructor(scope: Construct, id: string, props: LogSourceStackProps) {
        super(scope, id);

        const solution_id = 'SO8025'

        // Create a table to store all logging logSource info: like Syslog, S3 bucket
        this.logSourceTable = new ddb.Table(this, 'LogSourceTable', {
            partitionKey: {
                name: 'id',
                type: ddb.AttributeType.STRING
            },
            billingMode: ddb.BillingMode.PAY_PER_REQUEST,
            removalPolicy: RemovalPolicy.DESTROY,
            encryption: ddb.TableEncryption.DEFAULT,
            pointInTimeRecovery: true,
        })
        const cfnLogSourceTable = this.logSourceTable.node.defaultChild as ddb.CfnTable;
        cfnLogSourceTable.overrideLogicalId('LogSourceTable')
        addCfnNagSuppressRules(cfnLogSourceTable, [
            {
                id: 'W73',
                reason: 'This table has billing mode as PROVISIONED'
            },
            {
                id: 'W74',
                reason: 'This table is set to use DEFAULT encryption, the key is owned by DDB.'
            },
        ])

        // Create a table to store ec2 logging logSource info
        this.ec2LogSourceTable = new ddb.Table(this, 'EC2LogSourceTable', {
            partitionKey: {
                name: 'id',
                type: ddb.AttributeType.STRING
            },
            billingMode: ddb.BillingMode.PAY_PER_REQUEST,
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
            billingMode: ddb.BillingMode.PAY_PER_REQUEST,
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

        // Create a lambda to handle all logSource related APIs.
        const logSourceHandler = new lambda.Function(this, 'LogSourceHandler', {
            code: lambda.AssetCode.fromAsset(path.join(__dirname, '../../lambda/api/log_source')),
            runtime: lambda.Runtime.PYTHON_3_9,
            handler: 'lambda_function.lambda_handler',
            timeout: Duration.seconds(60),
            memorySize: 1024,
            environment: {
                LOG_SOURCE_TABLE_NAME: this.logSourceTable.tableName,
                EC2_LOG_SOURCE_TABLE_NAME: this.ec2LogSourceTable.tableName,
                S3_LOG_SOURCE_TABLE_NAME: this.s3LogSourceTable.tableName,
                EKS_CLUSTER_SOURCE_TABLE_NAME: props.eksClusterLogSourceTable.tableName,
                LOG_AGENT_VPC_ID: props.defaultVPC,
                LOG_AGENT_SUBNETS_IDS: Fn.join(",", props.defaultPublicSubnets),
                ASYNC_CROSS_ACCOUNT_LAMBDA_ARN: props.asyncCrossAccountHandler.functionArn,
                SOLUTION_ID: solution_id,
                SOLUTION_VERSION: process.env.VERSION ? process.env.VERSION : 'v1.0.0',
            },
            description: `${Aws.STACK_NAME} - LogSource APIs Resolver`,
        })

        // Grant permissions to the logSource lambda
        this.logSourceTable.grantReadWriteData(logSourceHandler)
        this.ec2LogSourceTable.grantReadWriteData(logSourceHandler)
        this.s3LogSourceTable.grantReadWriteData(logSourceHandler)
        props.eksClusterLogSourceTable.grantReadWriteData(logSourceHandler)
        props.centralAssumeRolePolicy.attachToRole(logSourceHandler.role!)
        logSourceHandler.addToRolePolicy(
            new iam.PolicyStatement({
                actions: ["lambda:InvokeFunction", "lambda:InvokeAsync"],
                effect: iam.Effect.ALLOW,
                resources: ["*"],
            })
        );

        // Add logSource lambda as a Datasource
        const LogSourceLambdaDS = props.graphqlApi.addLambdaDataSource('LogSourceLambdaDS', logSourceHandler, {
            description: 'Lambda Resolver Datasource'
        });

        // Set resolver for releted logSource API methods
        LogSourceLambdaDS.createResolver('getLogSource', {
            typeName: 'Query',
            fieldName: 'getLogSource',
            requestMappingTemplate: appsync.MappingTemplate.lambdaRequest(),
            responseMappingTemplate: appsync.MappingTemplate.fromFile(path.join(__dirname, '../../graphql/vtl/log_source/GetLogSourceResp.vtl')),
        })


        LogSourceLambdaDS.createResolver('createLogSource', {
            typeName: 'Mutation',
            fieldName: 'createLogSource',
            requestMappingTemplate: appsync.MappingTemplate.fromFile(path.join(__dirname, '../../graphql/vtl/log_source/CreateLogSource.vtl')),
            responseMappingTemplate: appsync.MappingTemplate.lambdaResult()
        })


        LogSourceLambdaDS.createResolver('checkCustomPort', {
            typeName: 'Query',
            fieldName: 'checkCustomPort',
            requestMappingTemplate: appsync.MappingTemplate.lambdaRequest(),
            responseMappingTemplate: appsync.MappingTemplate.lambdaResult()
        })

    }
}

