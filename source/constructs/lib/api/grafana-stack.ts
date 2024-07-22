/*
Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.

Licensed under the Apache License, Version 2.0 (the "License").
You may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/
import { GraphqlApi, MappingTemplate } from "@aws-cdk/aws-appsync-alpha";
import {
  Aws,
  Duration,
  RemovalPolicy,
  SymlinkFollowMode,
  aws_ec2 as ec2,
  aws_dynamodb as ddb,
  aws_lambda as lambda,
} from "aws-cdk-lib";
import { Construct } from "constructs";
import path = require("path");
import { SharedPythonLayer } from "../layer/layer";
import { constructWithFixedLogicalId } from "../util/stack-helper";
import { MicroBatchStack } from '../microbatch/main/services/amazon-services-stack';

export interface GrafanaStackProps {
  /**
   * Default Appsync GraphQL API for Grafana REST API Handler
   *
   * @default - None.
   */
  readonly graphqlApi: GraphqlApi;

  readonly solutionId: string;
  readonly stackPrefix: string;
  readonly microBatchStack: MicroBatchStack;
}

export class GrafanaStack extends Construct {
  readonly grafanaTable: ddb.Table;

  constructor(
    scope: Construct,
    id: string,
    { graphqlApi, solutionId, stackPrefix, microBatchStack }: GrafanaStackProps
  ) {
    super(scope, id);

    this.grafanaTable = constructWithFixedLogicalId(ddb.Table)(
      this,
      "Grafana",
      {
        partitionKey: {
          name: "id",
          type: ddb.AttributeType.STRING,
        },
        billingMode: ddb.BillingMode.PAY_PER_REQUEST,
        removalPolicy: RemovalPolicy.DESTROY,
        encryption: ddb.TableEncryption.DEFAULT,
        pointInTimeRecovery: true,
      }
    );

    // Create a lambda to handle all grafana related APIs.
    const grafanaHandler = new lambda.Function(this, "GrafanaHandler", {
      code: lambda.AssetCode.fromAsset(
        path.join(__dirname, "../../lambda/api/grafana"),
        { followSymlinks: SymlinkFollowMode.ALWAYS }
      ),
      runtime: lambda.Runtime.PYTHON_3_11,
      handler: "lambda_function.lambda_handler",
      timeout: Duration.seconds(60),
      memorySize: 1024,
      layers: [SharedPythonLayer.getInstance(this)],
      environment: {
        GRAFANA_TABLE: this.grafanaTable.tableName,
        STACK_PREFIX: stackPrefix,
        SOLUTION_VERSION: process.env.VERSION || "v1.0.0",
        SOLUTION_ID: solutionId,
      },
      description: `${Aws.STACK_NAME} - Grafana APIs Resolver`,
      vpc: microBatchStack.microBatchVPCStack.vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      securityGroups: [microBatchStack.microBatchVPCStack.privateSecurityGroup],
    });

    // Grant permissions to the grafana lambda
    this.grafanaTable.grantReadWriteData(grafanaHandler);

    // Add grafana lambda as a Datasource
    const grafanaLambdaDS = graphqlApi.addLambdaDataSource(
      "GrafanaLambdaDS",
      grafanaHandler,
      {
        description: "Lambda Resolver Datasource",
      }
    );

    grafanaLambdaDS.createResolver("createGrafana", {
      typeName: "Mutation",
      fieldName: "createGrafana",
      requestMappingTemplate: MappingTemplate.fromFile(
        path.join(__dirname, "../../graphql/vtl/grafana/CreateGrafana.vtl")
      ),
      responseMappingTemplate: MappingTemplate.lambdaResult(),
    });

    grafanaLambdaDS.createResolver("listGrafanas", {
      typeName: "Query",
      fieldName: "listGrafanas",
      requestMappingTemplate: MappingTemplate.fromFile(
        path.join(__dirname, "../../graphql/vtl/grafana/ListGrafanas.vtl")
      ),
      responseMappingTemplate: MappingTemplate.fromFile(
        path.join(__dirname, "../../graphql/vtl/grafana/ListGrafanaResp.vtl")
      ),
    });

    grafanaLambdaDS.createResolver("getGrafana", {
      typeName: "Query",
      fieldName: "getGrafana",
      requestMappingTemplate: MappingTemplate.lambdaRequest(),
      responseMappingTemplate: MappingTemplate.fromFile(
        path.join(__dirname, "../../graphql/vtl/grafana/GetGrafanaResp.vtl")
      ),
    });

    grafanaLambdaDS.createResolver("deleteGrafana", {
      typeName: "Mutation",
      fieldName: "deleteGrafana",
      requestMappingTemplate: MappingTemplate.lambdaRequest(),
      responseMappingTemplate: MappingTemplate.lambdaResult(),
    });

    grafanaLambdaDS.createResolver("updateGrafana", {
      typeName: "Mutation",
      fieldName: "updateGrafana",
      requestMappingTemplate: MappingTemplate.fromFile(
        path.join(__dirname, "../../graphql/vtl/grafana/UpdateGrafana.vtl")
      ),
      responseMappingTemplate: MappingTemplate.lambdaResult(),
    });

    grafanaLambdaDS.createResolver("checkGrafana", {
      typeName: "Query",
      fieldName: "checkGrafana",
      requestMappingTemplate: MappingTemplate.lambdaRequest(),
      responseMappingTemplate: MappingTemplate.lambdaResult(),
    });
  }
}
