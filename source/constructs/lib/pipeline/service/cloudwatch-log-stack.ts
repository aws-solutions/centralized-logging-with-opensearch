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
import { Construct } from "constructs";
import { SolutionStack } from "../common/solution-stack";
import { SecurityGroup, Vpc } from "aws-cdk-lib/aws-ec2";
import { KDSStack, KDSStackProps } from "../../kinesis/kds-stack";
import {
  Aws,
  Fn,
  aws_iam as iam,
  aws_lambda as lambda,
  StackProps,
  CustomResource,
  Duration,
  CfnCondition,
} from "aws-cdk-lib";
import * as cr from "aws-cdk-lib/custom-resources";
import * as path from "path";
import { NagSuppressions } from "cdk-nag";

const { VERSION } = process.env;

export interface PipelineStackProps extends StackProps {
  readonly enableAutoScaling?: boolean;
  readonly solutionId?: string;
  readonly solutionDesc?: string;
}

export class CloudWatchLogStack extends SolutionStack {
  constructor(scope: Construct, id: string, props: PipelineStackProps) {
    super(scope, id, props);

    let solutionDesc =
      props.solutionDesc || "Centralized Logging with OpenSearch";
    let solutionId = props.solutionId || "SO8025";
    const stackPrefix = "CL";

    this.setDescription(
      `(${solutionId}-cwl) - ${solutionDesc} - CloudWatchLogs Through KDS Analysis Pipeline Template - Version ${VERSION}`
    );

    const logType = this.newParam("logType", {
      type: "String",
      description: "Type of log,  CloudTrail or VPC Flow Logs.",
      default: "CloudTrail",
      allowedValues: ["CloudTrail", "VPCFlow"],
    });
    this.addToParamLabels("Log Type", logType.logicalId);

    const logSource = this.newParam("logSource", {
      type: "String",
      description:
        "Additional source information, for CloudWatch logs, this is CloudWatch Log Group Name.",
      default: "",
    });
    this.addToParamLabels("Log Source", logSource.logicalId);

    const logFormat = this.newParam("logFormat", {
      type: "String",
      description:
        "The customized log format with a list of field names delimited by comma",
      default: "",
    });
    this.addToParamLabels("Log Format", logFormat.logicalId);

    const engineType = this.newParam("engineType", {
      type: "String",
      description:
        "The engine type of the OpenSearch. Select OpenSearch or Elasticsearch.",
      default: "OpenSearch",
      allowedValues: ["OpenSearch", "Elasticsearch"],
    });
    this.addToParamLabels("Engine Type", engineType.logicalId);

    const endpoint = this.newParam("endpoint", {
      type: "String",
      description:
        "The OpenSearch endpoint URL. e.g. vpc-your_opensearch_domain_name-xcvgw6uu2o6zafsiefxubwuohe.us-east-1.es.amazonaws.com",
      default: "",
    });
    this.addToParamLabels("OpenSearch Endpoint", endpoint.logicalId);

    const domainName = this.newParam("domainName", {
      type: "String",
      description: "OpenSearch domain",
      default: "",
    });
    this.addToParamLabels("OpenSearch Domain Name", domainName.logicalId);

    const createDashboard = this.newParam("createDashboard", {
      type: "String",
      description: "Yes, if you want to create a sample OpenSearch dashboard.",
      default: "No",
      allowedValues: ["Yes", "No"],
    });
    this.addToParamLabels("Create Sample Dashboard", createDashboard.logicalId);

    const shardNumbers = this.newParam("shardNumbers", {
      type: "Number",
      description:
        "Number of shards to distribute the index evenly across all data nodes, keep the size of each shard between 10–50 GiB",
      default: 5,
    });
    this.addToParamLabels("Number Of Shards", shardNumbers.logicalId);

    const replicaNumbers = this.newParam("replicaNumbers", {
      type: "Number",
      description:
        "Number of replicas for OpenSearch Index. Each replica is a full copy of an index",
      default: 1,
    });
    this.addToParamLabels("Number of Replicas", replicaNumbers.logicalId);

    const warmAge = this.newParam("warmAge", {
      type: "String",
      description:
        "The age required to move the index into warm storage( Index age is the time between its creation and the present. Supported units are d (days), h (hours), m (minutes), s (seconds), ms (milliseconds), and micros (microseconds) ), this is only effecitve when the value is >0 and warm storage is enabled in OpenSearch",
      default: "",
    });
    this.addToParamLabels("Days to Warm Storage", warmAge.logicalId);

    const coldAge = this.newParam("coldAge", {
      type: "String",
      description:
        "The number of days required to move the index into cold storage(Example: 1d), this is only effecitve when cold storage is enabled in OpenSearch.",
      default: "",
    });
    this.addToParamLabels("Days to Cold Storage", coldAge.logicalId);

    const retainAge = this.newParam("retainAge", {
      type: "String",
      description:
        'The total number of days to retain the index(Example: 7d). If value is "", the index will not be deleted',
      default: "",
    });
    this.addToParamLabels("Days to Retain", retainAge.logicalId);

    const rolloverSize = this.newParam("rolloverSize", {
      type: "String",
      description:
        "The minimum size of the total primary shard storage (not counting replicas) required to roll over the index. For example, if you set min_size to 100 GiB and your index has 5 primary shards and 5 replica shards of 20 GiB each, the total size of all primary shards is 100 GiB, so the rollover occurs.",
      default: "",
    });
    this.addToParamLabels("Days to Retain", rolloverSize.logicalId);

    const indexSuffix = this.newParam("indexSuffix", {
      type: "String",
      description:
        "The common suffix format of OpenSearch index for the log(Example: yyyy-MM-dd, yyyy-MM-dd-HH).  The index name will be <Index Prefix>-<Index Suffix Format>-000001.",
      default: "yyyy-MM-dd",
      allowedValues: ["yyyy-MM-dd", "yyyy-MM-dd-HH", "yyyy-MM", "yyyy"],
    });
    this.addToParamLabels("Index suffix Format", indexSuffix.logicalId);

    const codec = this.newParam("codec", {
      type: "String",
      description:
        "The compression type to use to compress stored data. Available values are best_compression and default.",
      default: "best_compression",
      allowedValues: ["default", "best_compression"],
    });
    this.addToParamLabels("Index codec", codec.logicalId);

    const refreshInterval = this.newParam("refreshInterval", {
      type: "String",
      description:
        "How often the index should refresh, which publishes its most recent changes and makes them available for searching. Can be set to -1 to disable refreshing. Default is 1s.",
      default: "1s",
    });
    this.addToParamLabels("Index Prefix Format", refreshInterval.logicalId);

    const indexPrefix = this.newParam("indexPrefix", {
      type: "String",
      description: `The common prefix of OpenSearch index for the log.`,
      default: "",
    });
    this.addToParamLabels("Index Prefix", indexPrefix.logicalId);

    const vpcId = this.newParam("vpcId", {
      type: "AWS::EC2::VPC::Id",
      description:
        "Select a VPC which has access to the OpenSearch domain. The log processing Lambda will be resides in the selected VPC.",
      default: "",
    });
    this.addToParamLabels("VPC ID", vpcId.logicalId);

    const subnetIds = this.newParam("subnetIds", {
      type: "List<AWS::EC2::Subnet::Id>",
      description:
        "Select at least two subnets which has access to the OpenSearch domain. The log processing Lambda will resides in the subnets. Please make sure the subnets has access to the Amazon S3 service.",
    });
    this.addToParamLabels("Subnet IDs", subnetIds.logicalId);

    const securityGroupId = this.newParam("securityGroupId", {
      type: "AWS::EC2::SecurityGroup::Id",
      description:
        "Select a Security Group which will be associated to the log processing Lambda. Please make sure the Security Group has access to the OpenSearch domain.",
      default: "",
    });
    this.addToParamLabels("Security Group ID", securityGroupId.logicalId);

    const logSourceAccountId = this.newParam("logSourceAccountId", {
      description: `Account ID of the CloudFront. If the source is in the current account, please leave it blank.`,
      type: "String",
    });
    this.addToParamLabels(
      "Log Source Account ID",
      logSourceAccountId.logicalId
    );
    const logSourceRegion = this.newParam("logSourceRegion", {
      description: `Region code of the S3 bucket which stores the ${logType} logs, e.g. us-east-1`,
      type: "String",
    });
    this.addToParamLabels("Log Source Region", logSourceRegion.logicalId);
    const logSourceAccountAssumeRole = this.newParam(
      "logSourceAccountAssumeRole",
      {
        description: `the Cross Account Role which is in the log agent cloudformation output. If the source is in the current account, please leave it blank.`,
        type: "String",
      }
    );
    this.addToParamLabels(
      "Log Source Account Assume Role",
      logSourceAccountAssumeRole.logicalId
    );

    const processVpc = Vpc.fromVpcAttributes(this, "ProcessVpc", {
      vpcId: vpcId.valueAsString,
      availabilityZones: Fn.getAzs(),
      privateSubnetIds: subnetIds.valueAsList,
    });

    const processSg = SecurityGroup.fromSecurityGroupId(
      this,
      "ProcessSG",
      securityGroupId.valueAsString
    );

    const baseProps = {
      vpc: processVpc,
      securityGroup: processSg,
      endpoint: endpoint.valueAsString,
      indexPrefix: indexPrefix.valueAsString,
      engineType: engineType.valueAsString,
    };

    const shardCount = this.newParam("shardCount", {
      type: "Number",
      description: "Number of initial kinesis shards",
      default: "2",
    });

    const maxCapacity = this.newParam("maxCapacity", {
      type: "Number",
      description: "Max capacity",
      default: "50",
    });

    const minCapacity = this.newParam("minCapacity", {
      type: "Number",
      description: "Min capacity",
      default: "1",
    });

    const backupBucketName = this.newParam("backupBucketName", {
      description:
        "The S3 backup bucket name to store the failed ingestion logs.",
      type: "String",
      allowedPattern: "[a-z-0-9]+",
      constraintDescription: "Please use a valid S3 bucket name",
    });

    this.addToParamGroups(
      "KDS Buffer Information",
      shardCount.logicalId,
      maxCapacity.logicalId,
      minCapacity.logicalId,
      backupBucketName.logicalId
    );

    const osProps = {
      ...baseProps,
      domainName: domainName.valueAsString,
      createDashboard: createDashboard.valueAsString,
      shardNumbers: shardNumbers.valueAsString,
      replicaNumbers: replicaNumbers.valueAsString,
      warmAge: warmAge.valueAsString,
      coldAge: coldAge.valueAsString,
      retainAge: retainAge.valueAsString,
      rolloverSize: rolloverSize.valueAsString,
      indexSuffix: indexSuffix.valueAsString,
      codec: codec.valueAsString,
      refreshInterval: refreshInterval.valueAsString,
      logType: logType.valueAsString,
      solutionId: solutionId,
    };

    const pipelineProps: KDSStackProps = {
      ...osProps,
      backupBucketName: backupBucketName.valueAsString,
      shardCount: shardCount.valueAsNumber,
      maxCapacity: maxCapacity.valueAsNumber,
      minCapacity: minCapacity.valueAsNumber,
      enableAutoScaling: props.enableAutoScaling!,
      subCategory: "CWL",
      env: {
        LOG_FORMAT: logFormat.valueAsString,
      },
      logType: logType.valueAsString,
      stackPrefix: stackPrefix
    };

    const kdsBufferStack = new KDSStack(this, "KDSBuffer", pipelineProps);

    const logProcessorLogGroupName = kdsBufferStack.logProcessorLogGroupName

    const bufferAccessPolicy = new iam.Policy(this, "BufferAccessPolicy", {
      statements: [
        new iam.PolicyStatement({
          actions: ["kinesis:PutRecord", "kinesis:PutRecords"],
          effect: iam.Effect.ALLOW,
          resources: [`${kdsBufferStack.kinesisStreamArn}`],
        }),
      ],
    });

    this.cfnOutput("BufferResourceArn", kdsBufferStack.kinesisStreamArn);
    this.cfnOutput("BufferResourceName", kdsBufferStack.kinesisStreamName);
    this.cfnOutput("ProcessorLogGroupName", logProcessorLogGroupName);

    const bufferAccessRole = new iam.Role(this, "BufferAccessRole", {
      assumedBy: new iam.CompositePrincipal(
        new iam.AccountPrincipal(Aws.ACCOUNT_ID)
      ),
      description: "Using this role to send log data to buffering layer",
    });
    bufferAccessRole.assumeRolePolicy!.addStatements(
      new iam.PolicyStatement({
        actions: ["sts:AssumeRole"],
        effect: iam.Effect.ALLOW,
        principals: [new iam.AccountPrincipal(Aws.ACCOUNT_ID)],
      })
    );

    bufferAccessRole.attachInlinePolicy(bufferAccessPolicy);

    this.cfnOutput("BufferAccessRoleArn", bufferAccessRole.roleArn);
    this.cfnOutput("BufferAccessRoleName", bufferAccessRole.roleName);

    this.addToParamGroups(
      "Source Information",
      logType.logicalId,
      logSource.logicalId,
      logFormat.logicalId
    );

    this.addToParamGroups(
      "Destination Information",
      engineType.logicalId,
      domainName.logicalId,
      endpoint.logicalId,
      indexPrefix.logicalId,
      createDashboard.logicalId
    );
    this.addToParamGroups(
      "Network Information",
      vpcId.logicalId,
      subnetIds.logicalId,
      securityGroupId.logicalId
    );

    this.addToParamGroups(
      "Advanced Options",
      shardNumbers.logicalId,
      replicaNumbers.logicalId,
      warmAge.logicalId,
      coldAge.logicalId,
      retainAge.logicalId,
      rolloverSize.logicalId,
      indexSuffix.logicalId,
      codec.logicalId,
      refreshInterval.logicalId
    );

    const cwSubFilterRole = new iam.Role(this, "CWSubFilterRole", {
      assumedBy: new iam.ServicePrincipal("logs.amazonaws.com"),
    });

    const isCrossAccount = new CfnCondition(this, "IsCrossAccount", {
      expression: Fn.conditionAnd(
        Fn.conditionNot(
          Fn.conditionEquals(logSourceAccountId.valueAsString, "")
        ),
        Fn.conditionNot(
          Fn.conditionEquals(logSourceAccountId.valueAsString, Aws.ACCOUNT_ID)
        )
      ),
    });

    const assumeBy = {
      Version: "2012-10-17",
      Statement: [
        {
          Effect: "Allow",
          Condition: {
            StringLike: {
              "aws:SourceArn": [
                `arn:${Aws.PARTITION}:logs:${Aws.REGION}:${Aws.ACCOUNT_ID}:*`,
                Fn.conditionIf(
                  isCrossAccount.logicalId,
                  `arn:${Aws.PARTITION}:logs:${logSourceRegion.valueAsString}:${logSourceAccountId.valueAsString}:*`,
                  Aws.NO_VALUE
                ).toString(),
              ],
            },
          },
          Principal: {
            Service: "logs.amazonaws.com",
          },
          Action: "sts:AssumeRole",
        },
      ],
    };
    (cwSubFilterRole.node.defaultChild as iam.CfnRole).addOverride(
      "Properties.AssumeRolePolicyDocument",
      assumeBy
    );

    const cwDestPolicy = new iam.Policy(this, "CWDestPolicy", {
      roles: [cwSubFilterRole],
      statements: [
        new iam.PolicyStatement({
          actions: ["kinesis:PutRecord", "kinesis:PutRecords"],
          resources: [`${kdsBufferStack.kinesisStreamArn}`],
        }),
      ],
    });

    const cwSubFilterLambdaPolicy = new iam.Policy(
      this,
      "cwSubFilterLambdaPolicy",
      {
        policyName: `${Aws.STACK_NAME}-cwSubFilterLambdaPolicy`,
        statements: [
          new iam.PolicyStatement({
            actions: [
              "logs:CreateLogGroup",
              "logs:CreateLogStream",
              "logs:PutLogEvents",
              "logs:PutSubscriptionFilter",
              "logs:putDestination",
              "logs:putDestinationPolicy",
              "logs:DeleteSubscriptionFilter",
              "logs:DescribeLogGroups",
            ],
            resources: [
              `arn:${Aws.PARTITION}:logs:${Aws.REGION}:${Aws.ACCOUNT_ID}:*`,
            ],
          }),
          new iam.PolicyStatement({
            actions: ["iam:PassRole"],
            resources: [cwSubFilterRole.roleArn],
          }),
        ],
      }
    );
    const cwSubFilterLambdaRole = new iam.Role(this, "cwSubFilterLambdaRole", {
      assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
    });
    cwSubFilterLambdaPolicy.attachToRole(cwSubFilterLambdaRole);
    NagSuppressions.addResourceSuppressions(cwSubFilterLambdaPolicy, [
      {
        id: "AwsSolutions-IAM5",
        reason: "The managed policy needs to use any resources.",
        appliesTo: [
          "Resource::arn:<AWS::Partition>:logs:<AWS::Region>:<AWS::AccountId>:*",
        ],
      },
    ]);

    // Lambda to create CloudWatch Log Group Subscription Filter
    const cwSubFilterFn = new lambda.Function(this, "cwSubFilterFn", {
      description: `${Aws.STACK_NAME} - Create CloudWatch Log Group Subscription Filter`,
      runtime: lambda.Runtime.PYTHON_3_11,
      handler: "cw_subscription_filter.lambda_handler",
      code: lambda.Code.fromAsset(
        path.join(__dirname, "../../../lambda/pipeline/common/custom-resource/")
      ),
      memorySize: 256,
      timeout: Duration.seconds(60),
      role: cwSubFilterLambdaRole,
      environment: {
        LOGGROUP_NAMES: logSource.valueAsString,
        DESTINATION_NAME: kdsBufferStack.kinesisStreamName,
        DESTINATION_ARN: kdsBufferStack.kinesisStreamArn,
        ROLE_NAME: cwSubFilterRole.roleName,
        ROLE_ARN: cwSubFilterRole.roleArn,
        STACK_NAME: Aws.STACK_NAME,
        SOLUTION_VERSION: VERSION || "v1.0.0",
        SOLUTION_ID: solutionId,
        LOG_SOURCE_ACCOUNT_ID: logSourceAccountId.valueAsString,
        LOG_SOURCE_REGION: logSourceRegion.valueAsString,
        LOG_SOURCE_ACCOUNT_ASSUME_ROLE:
          logSourceAccountAssumeRole.valueAsString,
      },
    });

    cwSubFilterFn.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["sts:AssumeRole"],
        effect: iam.Effect.ALLOW,
        resources: [
          `arn:${Aws.PARTITION}:logs:${Aws.REGION}:${Aws.ACCOUNT_ID}:*`,
          Fn.conditionIf(
            isCrossAccount.logicalId,
            `${logSourceAccountAssumeRole.valueAsString}`,
            Aws.NO_VALUE
          ).toString(),
        ],
      })
    );

    cwSubFilterFn.node.addDependency(
      cwSubFilterLambdaRole,
      cwSubFilterLambdaPolicy,
      cwSubFilterRole,
      cwDestPolicy,
      kdsBufferStack
    );

    const cwSubFilterProvider = new cr.Provider(this, "cwSubFilterProvider", {
      onEventHandler: cwSubFilterFn,
    });
    NagSuppressions.addResourceSuppressions(cwSubFilterProvider, [
      {
        id: "AwsSolutions-L1",
        reason: "the lambda 3.9 runtime we use is the latest version",
      },
    ]);
    NagSuppressions.addResourceSuppressions(
      cwSubFilterProvider,
      [
        {
          id: "AwsSolutions-IAM5",
          reason: "The managed policy needs to use any resources.",
        },
      ],
      true
    );
    NagSuppressions.addResourceSuppressions(
      cwSubFilterLambdaRole,
      [
        {
          id: "AwsSolutions-IAM5",
          reason: "The managed policy needs to use any resources.",
          appliesTo: [
            "Resource::arn:<AWS::Partition>:logs:<AWS::Region>:<AWS::AccountId>:*",
          ],
        },
      ],
      true
    );

    cwSubFilterProvider.node.addDependency(cwSubFilterFn);

    const cwSubFilterlambdaTrigger = new CustomResource(
      this,
      "cwSubFilterlambdaTrigger",
      {
        serviceToken: cwSubFilterProvider.serviceToken,
      }
    );

    cwSubFilterlambdaTrigger.node.addDependency(cwSubFilterProvider);
    this.setMetadata();
  }
}
