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

import { Construct } from "constructs";
import {
  Duration,
  RemovalPolicy,
  aws_dynamodb as ddb,
  aws_iam as iam,
  aws_lambda as lambda,
} from "aws-cdk-lib";
import * as appsync from "@aws-cdk/aws-appsync-alpha";
import * as path from "path";
import * as events from "aws-cdk-lib/aws-events";
import { addCfnNagSuppressRules } from "../main-stack";
import { IQueue } from "aws-cdk-lib/aws-sqs";

export interface InstanceGroupStackProps {
  /**
   * Default Appsync GraphQL API for OpenSearch REST API Handler
   *
   * @default - None.
   */
  readonly graphqlApi: appsync.GraphqlApi;
  readonly eventBridgeRule: events.Rule;
  readonly centralAssumeRolePolicy: iam.ManagedPolicy;
  readonly groupModificationEventQueue: IQueue;
  readonly appLogIngestionTable: ddb.Table;
  readonly subAccountLinkTable: ddb.Table;
}
export class InstanceGroupStack extends Construct {
  instanceGroupTable: ddb.Table;

  constructor(scope: Construct, id: string, props: InstanceGroupStackProps) {
    super(scope, id);

    const solution_id = "SO8025";

    // Create a table to store logging instanceGroup info
    this.instanceGroupTable = new ddb.Table(this, "InstanceGroupTable", {
      partitionKey: {
        name: "id",
        type: ddb.AttributeType.STRING,
      },
      billingMode: ddb.BillingMode.PROVISIONED,
      removalPolicy: RemovalPolicy.DESTROY,
      encryption: ddb.TableEncryption.DEFAULT,
      pointInTimeRecovery: true,
    });

    const cfnInstanceGroupTable = this.instanceGroupTable.node
      .defaultChild as ddb.CfnTable;
    cfnInstanceGroupTable.overrideLogicalId("InstanceGroupTable");
    addCfnNagSuppressRules(cfnInstanceGroupTable, [
      {
        id: "W73",
        reason: "This table has billing mode as PROVISIONED",
      },
      {
        id: "W74",
        reason:
          "This table is set to use DEFAULT encryption, the key is owned by DDB.",
      },
    ]);

    // Create a lambda to handle all instanceGroup related APIs.
    const instanceGroupHandler = new lambda.Function(
      this,
      "InstanceGroupHandler",
      {
        code: lambda.AssetCode.fromAsset(
          path.join(__dirname, "../../lambda/api/instance_group")
        ),
        runtime: lambda.Runtime.PYTHON_3_9,
        handler: "lambda_function.lambda_handler",
        timeout: Duration.seconds(60),
        memorySize: 1024,
        environment: {
          INSTRANCEGROUP_TABLE: this.instanceGroupTable.tableName,
          EVENTBRIDGE_RULE: props.eventBridgeRule.ruleName,
          INSTANCE_GROUP_MODIFICATION_EVENT_QUEUE_NAME: props.groupModificationEventQueue.queueName,
          APPLOGINGESTION_TABLE: props.appLogIngestionTable.tableName,
          SUB_ACCOUNT_LINK_TABLE_NAME: props.subAccountLinkTable.tableName,
          SOLUTION_ID: solution_id,
          SOLUTION_VERSION: process.env.VERSION
            ? process.env.VERSION
            : "v1.0.0",
        },
        description: "Log Hub - InstanceGroup APIs Resolver",
      }
    );

    instanceGroupHandler.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["autoscaling:DescribeAutoScalingGroups"],
        effect: iam.Effect.ALLOW,
        resources: ["*"],
      })
    );

    // Grant permissions to the instanceGroup lambda
    this.instanceGroupTable.grantReadWriteData(instanceGroupHandler);
    props.appLogIngestionTable.grantReadWriteData(instanceGroupHandler)
    props.groupModificationEventQueue.grantSendMessages(instanceGroupHandler)
    props.subAccountLinkTable.grantReadData(instanceGroupHandler);

    // Grant Event Bridge Policy to the instanceGroup lambda
    const eventBridgePolicy = new iam.PolicyStatement({
      actions: [
        "events:DescribeRule",
        "events:EnableRule",
        "events:DisableRule",
      ],
      effect: iam.Effect.ALLOW,
      resources: [props.eventBridgeRule.ruleArn],
    });
    instanceGroupHandler.addToRolePolicy(eventBridgePolicy);
    props.centralAssumeRolePolicy.attachToRole(instanceGroupHandler.role!);

    // Add instanceGroup table as a Datasource
    const instanceGroupDynamoDS = props.graphqlApi.addDynamoDbDataSource(
      "InstanceGroupDynamoDS",
      this.instanceGroupTable,
      {
        description: "DynamoDB Resolver Datasource",
      }
    );

    instanceGroupDynamoDS.createResolver({
      typeName: "Query",
      fieldName: "getInstanceGroup",
      requestMappingTemplate: appsync.MappingTemplate.dynamoDbGetItem(
        "id",
        "id"
      ),
      responseMappingTemplate: appsync.MappingTemplate.fromFile(
        path.join(
          __dirname,
          "../../graphql/vtl/instance_group/GetInstanceGroupResp.vtl"
        )
      ),
    });

    // Add instanceGroup lambda as a Datasource
    const instanceGroupLambdaDS = props.graphqlApi.addLambdaDataSource(
      "InstanceGroupLambdaDS",
      instanceGroupHandler,
      {
        description: "Lambda Resolver Datasource",
      }
    );

    // Set resolver for releted instanceGroup API methods
    instanceGroupLambdaDS.createResolver({
      typeName: "Query",
      fieldName: "listInstanceGroups",
      requestMappingTemplate: appsync.MappingTemplate.lambdaRequest(),
      responseMappingTemplate: appsync.MappingTemplate.fromFile(
        path.join(
          __dirname,
          "../../graphql/vtl/instance_group/ListInstanceGroupsResp.vtl"
        )
      ),
    });

    instanceGroupLambdaDS.createResolver({
      typeName: "Query",
      fieldName: "listAutoScalingGroups",
      requestMappingTemplate: appsync.MappingTemplate.lambdaRequest(),
      responseMappingTemplate: appsync.MappingTemplate.fromFile(
        path.join(
          __dirname,
          "../../graphql/vtl/instance_group/ListAutoScalingGroupsResp.vtl"
        )
      ),
    });

    instanceGroupLambdaDS.createResolver({
      typeName: "Mutation",
      fieldName: "createInstanceGroup",
      requestMappingTemplate: appsync.MappingTemplate.fromFile(
        path.join(
          __dirname,
          "../../graphql/vtl/instance_group/CreateInstanceGroup.vtl"
        )
      ),
      responseMappingTemplate: appsync.MappingTemplate.lambdaResult(),
    });

    instanceGroupLambdaDS.createResolver({
      typeName: "Mutation",
      fieldName: "createInstanceGroupBaseOnASG",
      requestMappingTemplate: appsync.MappingTemplate.fromFile(
        path.join(
          __dirname,
          "../../graphql/vtl/instance_group/CreateInstanceGroupBaseOnASG.vtl"
        )
      ),
      responseMappingTemplate: appsync.MappingTemplate.lambdaResult(),
    });

    instanceGroupLambdaDS.createResolver({
      typeName: "Mutation",
      fieldName: "deleteInstanceGroup",
      requestMappingTemplate: appsync.MappingTemplate.lambdaRequest(),
      responseMappingTemplate: appsync.MappingTemplate.lambdaResult(),
    });

    instanceGroupLambdaDS.createResolver({
      typeName: "Mutation",
      fieldName: "addInstancesToInstanceGroup",
      requestMappingTemplate: appsync.MappingTemplate.fromFile(
        path.join(
          __dirname,
          "../../graphql/vtl/instance_group/AddInstancesToInstanceGroup.vtl"
        )
      ),
      responseMappingTemplate: appsync.MappingTemplate.lambdaResult(),
    });

    instanceGroupLambdaDS.createResolver({
      typeName: "Mutation",
      fieldName: "deleteInstancesFromInstanceGroup",
      requestMappingTemplate: appsync.MappingTemplate.fromFile(
        path.join(
          __dirname,
          "../../graphql/vtl/instance_group/DeleteInstancesFromInstanceGroup.vtl"
        )
      ),
      responseMappingTemplate: appsync.MappingTemplate.lambdaResult(),
    });
  }
}
