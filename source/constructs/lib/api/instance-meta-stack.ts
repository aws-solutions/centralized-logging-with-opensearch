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
    Aws, CfnCondition, Fn,
    Duration,
    RemovalPolicy,
    aws_dynamodb as ddb,
    aws_iam as iam,
    aws_lambda as lambda,
    aws_events as events,
    aws_events_targets as targets,
    SymlinkFollowMode,
} from 'aws-cdk-lib';
import * as appsync from "@aws-cdk/aws-appsync-alpha";
import * as path from 'path';
import { CfnDocument } from 'aws-cdk-lib/aws-ssm';
import { addCfnNagSuppressRules } from "../main-stack";

export interface InstanceStackProps {

    /**
     * Default Appsync GraphQL API for OpenSearch REST API Handler
     *
     * @default - None.
     */
    readonly graphqlApi: appsync.GraphqlApi
    readonly subAccountLinkTable: ddb.Table
    readonly centralAssumeRolePolicy: iam.ManagedPolicy;

    readonly solutionId: string;
}
export class InstanceMetaStack extends Construct {
    instanceMetaTable: ddb.Table;
    logAgentStatusTable: ddb.Table;
    installLogAgentDocument: CfnDocument;
    readonly eventBridgeRule: events.Rule;

    constructor(scope: Construct, id: string, props: InstanceStackProps) {
        super(scope, id);

        // Create a table to store logging instanceGroup info
        this.instanceMetaTable = new ddb.Table(this, 'InstanceMetaTable', {
            partitionKey: {
                name: 'id',
                type: ddb.AttributeType.STRING
            },
            billingMode: ddb.BillingMode.PAY_PER_REQUEST,
            removalPolicy: RemovalPolicy.DESTROY,
            encryption: ddb.TableEncryption.DEFAULT,
            pointInTimeRecovery: true,
        })

        this.instanceMetaTable.addGlobalSecondaryIndex({
            indexName: 'instanceId-index',
            partitionKey: { name: 'instanceId', type: ddb.AttributeType.STRING },
            projectionType: ddb.ProjectionType.ALL,
        })

        this.logAgentStatusTable = new ddb.Table(this, 'LogAgentStatusTable', {
            partitionKey: {
                name: 'instanceId',
                type: ddb.AttributeType.STRING
            },
            billingMode: ddb.BillingMode.PAY_PER_REQUEST,
            removalPolicy: RemovalPolicy.DESTROY,
            encryption: ddb.TableEncryption.DEFAULT,
            pointInTimeRecovery: true,
        })

        const cfnInstanceMetaTable = this.instanceMetaTable.node.defaultChild as ddb.CfnTable;
        cfnInstanceMetaTable.overrideLogicalId('InstanceMetaTable')
        addCfnNagSuppressRules(cfnInstanceMetaTable, [
            {
                id: 'W73',
                reason: 'This table has billing mode as PROVISIONED'
            },
            {
                id: 'W74',
                reason: 'This table is set to use DEFAULT encryption, the key is owned by DDB.'
            },
        ])

        const cfnLogAgentStatusTable = this.logAgentStatusTable.node.defaultChild as ddb.CfnTable;
        cfnLogAgentStatusTable.overrideLogicalId('LogAgentStatusTable')
        addCfnNagSuppressRules(cfnLogAgentStatusTable, [
            {
                id: 'W73',
                reason: 'This table has billing mode as PROVISIONED'
            },
            {
                id: 'W74',
                reason: 'This table is set to use DEFAULT encryption, the key is owned by DDB.'
            },
        ])

        // Download agent from CN if deployed in CN
        const isCN = new CfnCondition(this, "isCN", {
            expression: Fn.conditionEquals(Aws.PARTITION, "aws-cn"),
        });
        const s3Address = Fn.conditionIf(isCN.logicalId, 'aws-solutions-assets.s3.cn-north-1.amazonaws.com.cn', "aws-gcr-solutions-assets.s3.amazonaws.com").toString();

        this.installLogAgentDocument = new CfnDocument(
            this,
            "Fluent-BitDocumentInstallation",
            {
                content: {
                    schemaVersion: "2.2",
                    description: "Install Fluent-Bit and the AWS output plugins via AWS Systems Manager",
                    parameters: {
                        ARCHITECTURE: {
                            type: "String",
                            default: "",
                            description: "(Required) Machine Architecture"
                        },
                        SYSTEMDPATH: {
                            type: "String",
                            default: "/usr/lib",
                            description: "(Required) systemd path for current OS"
                        }
                    },
                    mainSteps: [
                        {
                            action: "aws:downloadContent",
                            name: "downloadFluentBit",
                            inputs: {
                                sourceType: "S3",
                                sourceInfo: `{\"path\":\"https://${s3Address}/aws-for-fluent-bit%3A2.28.4/fluent-bit{{ARCHITECTURE}}.tar.gz\"}`,
                                destinationPath: "/opt"
                            }
                        },
                        {
                            action: "aws:runShellScript",
                            name: "installFluentBit",
                            inputs: {
                                runCommand: [
                                    "cd /opt",
                                    "sudo tar zxvf fluent-bit{{ARCHITECTURE}}.tar.gz"
                                ]
                            }
                        },
                        {
                            action: "aws:runShellScript",
                            name: "startFluentBit",
                            inputs: {
                                runCommand: [
                                    "cat << EOF | sudo tee {{SYSTEMDPATH}}/systemd/system/fluent-bit.service",
                                    "[Unit]",
                                    "Description=Fluent Bit",
                                    "Requires=network.target",
                                    "After=network.target",
                                    "",
                                    "[Service]",
                                    "Type=simple",
                                    "ExecStart=/opt/fluent-bit/bin/fluent-bit -c /opt/fluent-bit/etc/fluent-bit.conf",
                                    "Type=simple",
                                    "Restart=always",
                                    "",
                                    "[Install]",
                                    "WantedBy=multi-user.target",
                                    "",
                                    "EOF",
                                    "sudo systemctl daemon-reload",
                                    "sudo service fluent-bit restart"
                                ]
                            }
                        }
                    ]
                },
                documentFormat: 'JSON',
                documentType: 'Command',
            }
        )

        // Create a lambda to handle all instanceGroup related APIs.
        const instanceMetaHandler = new lambda.Function(this, 'InstanceHandler', {
            code: lambda.AssetCode.fromAsset(path.join(__dirname, '../../lambda/api/instance_meta'),
                { followSymlinks: SymlinkFollowMode.ALWAYS },),
            runtime: lambda.Runtime.PYTHON_3_9,
            handler: 'lambda_function.lambda_handler',
            timeout: Duration.seconds(600),
            memorySize: 1024,
            environment: {
                AGENT_INSTALLATION_DOCUMENT: this.installLogAgentDocument.ref,
                INSTANCEMETA_TABLE: this.instanceMetaTable.tableName,
                AGENTSTATUS_TABLE: this.logAgentStatusTable.tableName,
                SUB_ACCOUNT_LINK_TABLE_NAME: props.subAccountLinkTable.tableName,
                SOLUTION_VERSION: process.env.VERSION || "v1.0.0",
                SOLUTION_ID: props.solutionId,
            },
            description: `${Aws.STACK_NAME} - Instance APIs Resolver`,
        })
        instanceMetaHandler.node.addDependency(this.installLogAgentDocument)

        // Grant permissions to the InstanceMeta lambda
        this.instanceMetaTable.grantReadWriteData(instanceMetaHandler)
        this.logAgentStatusTable.grantReadWriteData(instanceMetaHandler)
        props.subAccountLinkTable.grantReadData(instanceMetaHandler)

        // Grant SSM Policy to the InstanceMeta lambda, and Owen will add more
        const ssmPolicy = new iam.PolicyStatement({
            actions: [
                "ssm:DescribeInstanceInformation",
                "ssm:SendCommand",
                "ec2:DescribeInstances",
                "ec2:DescribeTags",
                "ssm:GetCommandInvocation",
                "ssm:DescribeInstanceProperties"
            ],
            effect: iam.Effect.ALLOW,
            resources: ['*']
        })
        instanceMetaHandler.addToRolePolicy(ssmPolicy)
        props.centralAssumeRolePolicy.attachToRole(instanceMetaHandler.role!)

        // Create a lambda to query instance app log agent status.
        const instanceAgentStatusHandler = new lambda.Function(this, 'InstanceAgentStatusHandler', {
            code: lambda.AssetCode.fromAsset(path.join(__dirname, '../../lambda/api/log_agent_status'),
                { followSymlinks: SymlinkFollowMode.ALWAYS },),
            runtime: lambda.Runtime.PYTHON_3_9,
            handler: 'lambda_function.lambda_handler',
            timeout: Duration.minutes(5),
            memorySize: 1024,
            environment: {
                AGENTSTATUS_TABLE: this.logAgentStatusTable.tableName,
                SUB_ACCOUNT_LINK_TABLE_NAME: props.subAccountLinkTable.tableName,
                SOLUTION_VERSION: process.env.VERSION || "v1.0.0",
                SOLUTION_ID: props.solutionId,
            },
            description: `${Aws.STACK_NAME} - Instance Agent Status Query Resolver`,
        })
        this.logAgentStatusTable.grantReadWriteData(instanceAgentStatusHandler)
        props.subAccountLinkTable.grantReadData(instanceAgentStatusHandler)
        instanceAgentStatusHandler.node.addDependency(this.logAgentStatusTable)

        // Grant SSM Policy to the InstanceMeta lambda
        const agentStatusSsmPolicy = new iam.PolicyStatement({
            actions: [
                "ssm:DescribeInstanceInformation",
                "ssm:SendCommand",
                "ec2:DescribeInstances",
                "ec2:DescribeTags",
                "ssm:GetCommandInvocation"
            ],
            effect: iam.Effect.ALLOW,
            resources: ['*']
        })
        instanceAgentStatusHandler.addToRolePolicy(agentStatusSsmPolicy)
        props.centralAssumeRolePolicy.attachToRole(instanceAgentStatusHandler.role!)

        // Schedule CRON event to trigger agent status query job per minute
        // Trigger is enabled by default, since health check and install has been decoupled
        const trigger = new events.Rule(this, "AgentStatusQuerySchedule", {
            schedule: events.Schedule.rate(Duration.minutes(1)),
            enabled: true,
        })
        trigger.addTarget(new targets.LambdaFunction(instanceAgentStatusHandler))
        this.eventBridgeRule = trigger

        // Add InstanceMeta lambda as a Datasource
        const instanceMetaLambdaDS = props.graphqlApi.addLambdaDataSource('InstanceMetaLambdaDS', instanceMetaHandler, {
            description: 'Lambda Resolver Datasource'
        });

        // Set resolver for releted InstanceMeta API methods
        instanceMetaLambdaDS.createResolver('listInstances', {
            typeName: 'Query',
            fieldName: 'listInstances',
            requestMappingTemplate: appsync.MappingTemplate.fromFile(
                path.join(
                    __dirname,
                    "../../graphql/vtl/instance_meta/ListInstances.vtl"
                )
            ),
            responseMappingTemplate: appsync.MappingTemplate.lambdaResult()
        })

        instanceMetaLambdaDS.createResolver('requestInstallLogAgent', {
            typeName: 'Mutation',
            fieldName: 'requestInstallLogAgent',
            requestMappingTemplate: appsync.MappingTemplate.fromFile(path.join(__dirname, '../../graphql/vtl/instance_meta/RequestInstallLogAgent.vtl')),
            responseMappingTemplate: appsync.MappingTemplate.lambdaResult()
        })

        instanceMetaLambdaDS.createResolver('getLogAgentStatus', {
            typeName: 'Query',
            fieldName: 'getLogAgentStatus',
            requestMappingTemplate: appsync.MappingTemplate.fromFile(path.join(__dirname, '../../graphql/vtl/instance_meta/GetLogAgentStatus.vtl')),
            responseMappingTemplate: appsync.MappingTemplate.lambdaResult()
        })



    }
}

