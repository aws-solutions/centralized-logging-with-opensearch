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
  Fn,
  Aws,
  Duration,
  aws_dynamodb as ddb,
  aws_iam as iam,
  aws_lambda as lambda,
} from "aws-cdk-lib";

import * as appsync from "@aws-cdk/aws-appsync-alpha";
import * as path from "path";

export interface CrossAccountStackProps {
  /**
   * Default Appsync GraphQL API for OpenSearch REST API Handler
   *
   * @default - None.
   */
  readonly graphqlApi: appsync.GraphqlApi;

  subAccountLinkTable: ddb.Table;
}
export class CrossAccountStack extends Construct {
  readonly apiEndpoint: string;
  readonly centralAssumeRolePolicy: iam.ManagedPolicy;
  readonly asyncCrossAccountHandler: lambda.Function;

  constructor(scope: Construct, id: string, props: CrossAccountStackProps) {
    super(scope, id);

    const solution_id = "SO8025";
    this.centralAssumeRolePolicy = new iam.ManagedPolicy(
      this,
      "CentralAssumeRolePolicy",
      {
        statements: [
          new iam.PolicyStatement({
            actions: [
              "logs:CreateLogGroup",
              "logs:CreateLogStream",
              "logs:PutLogEvents",
            ],
            resources: [
              `arn:${Aws.PARTITION}:logs:${Aws.REGION}:${Aws.ACCOUNT_ID}:*`,
            ],
          }),
        ],
      }
    );

    // Create a lambda to handle all linkSubAccount related APIs.
    this.asyncCrossAccountHandler = new lambda.Function(
      this,
      "LinkSubAccountHandler",
      {
        code: lambda.AssetCode.fromAsset(
          path.join(__dirname, "../../lambda/api/cross_account")
        ),
        runtime: lambda.Runtime.PYTHON_3_9,
        handler: "lambda_function.lambda_handler",
        timeout: Duration.minutes(15),
        memorySize: 2048,
        environment: {
          CENTRAL_ASSUME_ROLE_POLICY_ARN:
            this.centralAssumeRolePolicy.managedPolicyArn,
          SUB_ACCOUNT_LINK_TABLE_NAME: props.subAccountLinkTable.tableName!,
          BASE_RESOURCE_ARN: `arn:${Aws.PARTITION}:logs:${Aws.REGION}:${Aws.ACCOUNT_ID}:*`,
          SOLUTION_ID: solution_id,
          SOLUTION_VERSION: process.env.VERSION
            ? process.env.VERSION
            : "v1.0.0",
        },
        description: "Log Hub - CrossAccount APIs Resolver",
      }
    );

    // Grant permissions to the linkSubAccount lambda
    props.subAccountLinkTable.grantReadWriteData(this.asyncCrossAccountHandler);

    // Grant iam Policy to the linkSubAccount lambda
    this.asyncCrossAccountHandler.addToRolePolicy(
      new iam.PolicyStatement({
        actions: [
          "iam:CreatePolicyVersion",
          "iam:SetDefaultPolicyVersion",
          "iam:ListPolicyVersions",
          "iam:DeletePolicyVersion",
        ],
        effect: iam.Effect.ALLOW,
        resources: [`arn:${Aws.PARTITION}:iam::${Aws.ACCOUNT_ID}:*`],
      })
    );

    // Add subAccountLink table as a Datasource
    const crossAccountDynamoDS = props.graphqlApi.addDynamoDbDataSource(
      "CrossAccountAccountDynamoDS",
      props.subAccountLinkTable,
      {
        description: "DynamoDB Resolver Datasource",
      }
    );
    crossAccountDynamoDS.createResolver({
      typeName: "Query",
      fieldName: "getSubAccountLink",
      requestMappingTemplate: appsync.MappingTemplate.dynamoDbGetItem(
        "id",
        "id"
      ),
      responseMappingTemplate: appsync.MappingTemplate.fromFile(
        path.join(
          __dirname,
          "../../graphql/vtl/cross_account/GetSubAccountLinkResp.vtl"
        )
      ),
    });

    // Add appLogIngestion lambda as a Datasource
    const crossAccountLambdaDS = props.graphqlApi.addLambdaDataSource(
      "CrossAccountLambdaDS",
      this.asyncCrossAccountHandler,
      {
        description: "Lambda Resolver Datasource",
      }
    );

    crossAccountLambdaDS.createResolver({
      typeName: "Query",
      fieldName: "listSubAccountLinks",
      requestMappingTemplate: appsync.MappingTemplate.lambdaRequest(),
      responseMappingTemplate: appsync.MappingTemplate.fromFile(
        path.join(
          __dirname,
          "../../graphql/vtl/cross_account/ListSubAccountLinksResp.vtl"
        )
      ),
    });

    crossAccountLambdaDS.createResolver({
      typeName: "Query",
      fieldName: "getSubAccountLinkByAccountIdRegion",
      requestMappingTemplate: appsync.MappingTemplate.lambdaRequest(),
      //responseMappingTemplate: appsync.MappingTemplate.lambdaResult(),
      responseMappingTemplate: appsync.MappingTemplate.fromFile(
        path.join(
          __dirname,
          "../../graphql/vtl/cross_account/GetSubAccountLinkResp.vtl"
        )
      ),
    });

    crossAccountLambdaDS.createResolver({
      typeName: "Mutation",
      fieldName: "createSubAccountLink",
      requestMappingTemplate: appsync.MappingTemplate.fromFile(
        path.join(
          __dirname,
          "../../graphql/vtl/cross_account/CreateSubAccountLink.vtl"
        )
      ),
      responseMappingTemplate: appsync.MappingTemplate.lambdaResult(),
    });

    crossAccountLambdaDS.createResolver({
      typeName: "Mutation",
      fieldName: "updateSubAccountLink",
      requestMappingTemplate: appsync.MappingTemplate.fromFile(
        path.join(
          __dirname,
          "../../graphql/vtl/cross_account/UpdateSubAccountLink.vtl"
        )
      ),
      responseMappingTemplate: appsync.MappingTemplate.lambdaResult(),
    });

    crossAccountLambdaDS.createResolver({
      typeName: "Mutation",
      fieldName: "deleteSubAccountLink",
      requestMappingTemplate: appsync.MappingTemplate.fromFile(
        path.join(
          __dirname,
          "../../graphql/vtl/cross_account/DeleteSubAccountLink.vtl"
        )
      ),
      responseMappingTemplate: appsync.MappingTemplate.lambdaResult(),
    });
  }
}
