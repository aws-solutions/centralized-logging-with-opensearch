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

import { Construct, IConstruct } from "constructs";
import {
  Aws,
  Duration,
  CfnCondition,
  Fn,
  Aspects,
  IAspect,
  CfnResource,
  aws_iam as iam,
  aws_lambda as lambda,
  custom_resources as cr,
} from "aws-cdk-lib";
import { ISecurityGroup, IVpc, SubnetType } from "aws-cdk-lib/aws-ec2";
import * as path from "path";
import { NagSuppressions } from "cdk-nag";

import { SharedPythonLayer } from '../../layer/layer';

export interface OpenSearchInitProps {
  /**
   * Default VPC for lambda to call OpenSearch REST API
   *
   * @default - None.
   */
  readonly vpc: IVpc;

  /**
   * Default Security Group for lambda to call OpenSearch REST API
   *
   * @default - None.
   */
  readonly securityGroup: ISecurityGroup;

  /**
   * OpenSearch Endpoint Url
   *
   * @default - None.
   */
  readonly endpoint: string;

  /**
   * OpenSearch Domain Name
   *
   * @default - None.
   */
  readonly domainName: string;

  /**
   * OpenSearch or Elasticsearch
   *
   * @default - OpenSearch.
   */
  readonly engineType?: string;

  /**
   * Log Type
   *
   * @default - None.
   */
  readonly logType?: string;

  /**
   * Index Prefix
   *
   * @default - None.
   */
  readonly indexPrefix: string;

  /**
   * Wheather to create Sample Dashboard
   *
   * @default - Yes.
   */
  readonly createDashboard?: string;

  /**
   * Log proceersor lambda role arn if any
   *
   * @default - None.
   */
  readonly logProcessorRoleArn?: string;

  readonly warmAge?: string;
  readonly coldAge?: string;
  readonly retainAge?: string;
  readonly rolloverSize?: string;
  readonly indexSuffix?: string;
  readonly refreshInterval?: string;
  readonly codec?: string;
  readonly shardNumbers?: string;
  readonly replicaNumbers?: string;

  readonly solutionId: string;

  /**
   * A gzip base64 encoded string of OpenSearch index template.
   */
  readonly indexTemplateGzipBase64?: string;
}

/**
 * Stack to handle OpenSearch related ops such as import dashboard, create index template and policy etc when stack started.
 */
export class OpenSearchInitStack extends Construct {
  public helperFn: lambda.Function;

  constructor(scope: Construct, id: string, props: OpenSearchInitProps) {
    super(scope, id);

    // If in China Region, disable install latest aws-sdk
    const isCN = new CfnCondition(this, "isCN", {
      expression: Fn.conditionEquals(Aws.PARTITION, "aws-cn"),
    });
    const isInstallLatestAwsSdk = Fn.conditionIf(
      isCN.logicalId,
      "false",
      "true"
    ).toString();

    Aspects.of(this).add(
      new InjectCustomerResourceConfig(isInstallLatestAwsSdk)
    );

    // Create the policy and role for helper Lambda
    const osHelperPolicy = new iam.Policy(this, "OpenSearchHelperPolicy", {
      policyName: `${Aws.STACK_NAME}-osHelperPolicy`,
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
        new iam.PolicyStatement({
          actions: [
            "ec2:CreateNetworkInterface",
            "ec2:DeleteNetworkInterface",
            "ec2:DescribeNetworkInterfaces",
          ],
          resources: [`*`],
        }),
        new iam.PolicyStatement({
          actions: [
            "es:ESHttpGet",
            "es:ESHttpDelete",
            "es:ESHttpPatch",
            "es:ESHttpPost",
            "es:ESHttpPut",
            "es:ESHttpHead",
            "es:DescribeElasticsearchDomainConfig",
            "es:UpdateElasticsearchDomainConfig",
          ],
          resources: [
            `arn:${Aws.PARTITION}:es:${Aws.REGION}:${Aws.ACCOUNT_ID}:*`,
          ],
        }),
      ],
    });
    NagSuppressions.addResourceSuppressions(osHelperPolicy, [
      {
        id: "AwsSolutions-IAM5",
        reason: "The managed policy needs to use any resources.",
      },
    ]);
    // Create a role for lambda
    const osHelperRole = new iam.Role(this, "OpenSearchHelperRole", {
      assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
    });
    osHelperPolicy.attachToRole(osHelperRole);

    // Create a lambda to handle all opensearch domain related APIs.
    const osHelperFn = new lambda.Function(this, "OpenSearchHelperFn", {
      code: lambda.AssetCode.fromAsset(
        path.join(
          __dirname,
          "../../../lambda/pipeline/common/opensearch-helper"
        )
      ),
      runtime: lambda.Runtime.PYTHON_3_9,
      handler: "lambda_function.lambda_handler",
      role: osHelperRole,
      timeout: Duration.seconds(300),
      memorySize: 1024,
      vpc: props.vpc,
      vpcSubnets: { subnetType: SubnetType.PRIVATE_WITH_EGRESS },
      securityGroups: [props.securityGroup],
      layers: [SharedPythonLayer.getInstance(this)],
      description: `${Aws.STACK_NAME} - Function to create index template (${props.logType}), policy and import saved objects in OpenSearch`,
      environment: {
        ENDPOINT: props.endpoint,
        ENGINE: props.engineType || "OpenSearch",
        DOMAIN_NAME: props.domainName,
        CREATE_DASHBOARD: props.createDashboard || "Yes",
        ROLE_ARN: osHelperRole.roleArn,
        LOG_PROCESSOR_ROLE_ARN: props.logProcessorRoleArn || "",
        LOG_TYPE: props.logType || "",
        INDEX_PREFIX: props.indexPrefix,
        WARM_AGE: props.warmAge || "",
        COLD_AGE: props.coldAge || "",
        RETAIN_AGE: props.retainAge || "",
        ROLLOVER_SIZE: props.rolloverSize || "",
        INDEX_SUFFIX: props.indexSuffix || "yyyy-MM-dd",
        CODEC: props.codec || "best_compression",
        REFRESH_INTERVAL: props.refreshInterval || "1s",
        NUMBER_OF_SHARDS: props.shardNumbers || "0",
        NUMBER_OF_REPLICAS: props.replicaNumbers || "0",
        SOLUTION_VERSION: process.env.VERSION || "v1.0.0",
        SOLUTION_ID: props.solutionId,
        INDEX_TEMPLATE_GZIP_BASE64: props.indexTemplateGzipBase64 || '',
      },
    });
    osHelperFn.node.addDependency(osHelperRole, osHelperPolicy);

    this.helperFn = osHelperFn;

    const cfnHelperFn = osHelperFn.node.defaultChild as lambda.CfnFunction;
    cfnHelperFn.overrideLogicalId("OpenSearchHelperFn");

    const crLambda = new cr.AwsCustomResource(this, "CRLambda", {
      policy: cr.AwsCustomResourcePolicy.fromStatements([
        new iam.PolicyStatement({
          actions: ["lambda:InvokeFunction"],
          effect: iam.Effect.ALLOW,
          resources: [osHelperFn.functionArn],
        }),
      ]),
      timeout: Duration.minutes(15),
      onCreate: {
        service: "Lambda",
        action: "invoke",
        parameters: {
          FunctionName: osHelperFn.functionName,
          InvocationType: "Event",
        },
        physicalResourceId: cr.PhysicalResourceId.of("osHelperFn"),
      },
    });
    crLambda.node.addDependency(osHelperFn, osHelperRole, osHelperPolicy);
  }
}

class InjectCustomerResourceConfig implements IAspect {
  public constructor(private isInstallLatestAwsSdk: string) { }

  public visit(node: IConstruct): void {
    if (node instanceof CfnResource && node.cfnResourceType === "Custom::AWS") {
      node.addPropertyOverride(
        "InstallLatestAwsSdk",
        this.isInstallLatestAwsSdk
      );
    }
  }
}
