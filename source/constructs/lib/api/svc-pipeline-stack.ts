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
import * as path from 'path';
import * as appsync from '@aws-cdk/aws-appsync-alpha';
import {
    Aws,
    Duration,
    RemovalPolicy,
    aws_dynamodb as ddb,
    aws_iam as iam,
    aws_lambda as lambda,
} from 'aws-cdk-lib';
import { Construct } from 'constructs';

import { SharedPythonLayer } from '../layer/layer';
import { addCfnNagSuppressRules } from '../main-stack';
import { SvcPipelineFlowStack } from './svc-pipeline-flow';

export interface SvcPipelineStackProps {
    /**
     * Step Functions State Machine ARN for CloudFormation deployment Flow
     *
     * @default - None.
     */
    readonly cfnFlowSMArn: string;

    /**
     * Default Appsync GraphQL API for OpenSearch REST API Handler
     *
     * @default - None.
     */
    readonly graphqlApi: appsync.GraphqlApi;

    readonly centralAssumeRolePolicy: iam.ManagedPolicy;
    readonly subAccountLinkTable: ddb.Table;

    readonly solutionId: string;
    readonly stackPrefix: string;
}
export class SvcPipelineStack extends Construct {
    readonly svcPipelineTable: ddb.Table;

    constructor(scope: Construct, id: string, props: SvcPipelineStackProps) {
        super(scope, id);

        // Create a table to store logging pipeline info
        this.svcPipelineTable = new ddb.Table(this, 'SvcPipeline', {
            partitionKey: {
                name: 'id',
                type: ddb.AttributeType.STRING,
            },
            billingMode: ddb.BillingMode.PAY_PER_REQUEST,
            removalPolicy: RemovalPolicy.DESTROY,
            encryption: ddb.TableEncryption.DEFAULT,
            pointInTimeRecovery: true,
        });

        const cfnPipelineTable = this.svcPipelineTable.node
            .defaultChild as ddb.CfnTable;
        cfnPipelineTable.overrideLogicalId('SvcPipeline');
        addCfnNagSuppressRules(cfnPipelineTable, [
            {
                id: 'W73',
                reason: 'This table has billing mode as PROVISIONED',
            },
            {
                id: 'W74',
                reason:
                    'This table is set to use DEFAULT encryption, the key is owned by DDB.',
            },
        ]);

        // Create a Step Functions to orchestrate pipeline flow
        const pipeFlow = new SvcPipelineFlowStack(this, 'PipelineFlowSM', {
            tableArn: this.svcPipelineTable.tableArn,
            tableName: this.svcPipelineTable.tableName,
            cfnFlowSMArn: props.cfnFlowSMArn,
        });

        // Create a lambda to handle all pipeline related APIs.
        const pipelineHandler = new lambda.Function(this, 'PipelineHandler', {
            code: lambda.AssetCode.fromAsset(
                path.join(__dirname, '../../lambda/api/pipeline')
            ),
            runtime: lambda.Runtime.PYTHON_3_9,
            handler: 'lambda_function.lambda_handler',
            timeout: Duration.seconds(60),
            memorySize: 1024,
            layers: [SharedPythonLayer.getInstance(this)],
            environment: {
                STATE_MACHINE_ARN: pipeFlow.stateMachineArn,
                PIPELINE_TABLE: this.svcPipelineTable.tableName,
                STACK_PREFIX: props.stackPrefix,
                SOLUTION_VERSION: process.env.VERSION || 'v1.0.0',
                SOLUTION_ID: props.solutionId,
                SUB_ACCOUNT_LINK_TABLE_NAME: props.subAccountLinkTable.tableName,
            },
            description: `${Aws.STACK_NAME} - Pipeline APIs Resolver`,
        });

        // Grant permissions to the pipeline lambda
        this.svcPipelineTable.grantReadWriteData(pipelineHandler);
        props.subAccountLinkTable.grantReadData(pipelineHandler);
        pipelineHandler.addToRolePolicy(
            new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                resources: [pipeFlow.stateMachineArn],
                actions: ['states:StartExecution'],
            })
        );
        pipelineHandler.addToRolePolicy(
            new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                resources: ['*'],
                actions: ['es:DescribeElasticsearchDomain', 'es:DescribeDomain'],
            })
        );

        props.centralAssumeRolePolicy.attachToRole(pipelineHandler.role!);

        // Add pipeline lambda as a Datasource
        const pipeLambdaDS = props.graphqlApi.addLambdaDataSource(
            'PipelineLambdaDS',
            pipelineHandler,
            {
                description: 'Lambda Resolver Datasource',
            }
        );

        // Set resolver for releted cluster API methods
        pipeLambdaDS.createResolver('listServicePipelines', {
            typeName: 'Query',
            fieldName: 'listServicePipelines',
            requestMappingTemplate: appsync.MappingTemplate.fromFile(
                path.join(
                    __dirname,
                    '../../graphql/vtl/pipeline/ListServicePipelines.vtl'
                )
            ),
            responseMappingTemplate: appsync.MappingTemplate.fromFile(
                path.join(
                    __dirname,
                    '../../graphql/vtl/pipeline/ListServicePipelinesResp.vtl'
                )
            ),
        });

        pipeLambdaDS.createResolver('getServicePipeline', {
            typeName: 'Query',
            fieldName: 'getServicePipeline',
            requestMappingTemplate: appsync.MappingTemplate.lambdaRequest(),
            responseMappingTemplate: appsync.MappingTemplate.fromFile(
                path.join(
                    __dirname,
                    '../../graphql/vtl/pipeline/GetServicePipelineResp.vtl'
                )
            ),
        });

        pipeLambdaDS.createResolver('createServicePipeline', {
            typeName: 'Mutation',
            fieldName: 'createServicePipeline',
            requestMappingTemplate: appsync.MappingTemplate.fromFile(
                path.join(
                    __dirname,
                    '../../graphql/vtl/pipeline/CreateServicePipeline.vtl'
                )
            ),
            responseMappingTemplate: appsync.MappingTemplate.lambdaResult(),
        });

        pipeLambdaDS.createResolver('deleteServicePipeline', {
            typeName: 'Mutation',
            fieldName: 'deleteServicePipeline',
            requestMappingTemplate: appsync.MappingTemplate.lambdaRequest(),
            responseMappingTemplate: appsync.MappingTemplate.lambdaResult(),
        });
    }
}
