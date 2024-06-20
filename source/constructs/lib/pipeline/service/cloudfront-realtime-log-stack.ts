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
  aws_cloudfront as cloudfront,
  Stack,
  StackProps,
  CustomResource,
  Duration,
} from "aws-cdk-lib";
import * as logs from "aws-cdk-lib/aws-logs";
import * as cr from "aws-cdk-lib/custom-resources";
import * as path from "path";
import { constructFactory } from "../../util/stack-helper";
import { SharedPythonLayer } from "../../layer/layer";

const { VERSION } = process.env;

export interface PipelineStackProps extends StackProps {
  readonly enableAutoScaling?: boolean;
  readonly solutionId?: string;
  readonly solutionDesc?: string;
}

export class CloudFrontRealtimeLogStack extends SolutionStack {
  constructor(scope: Construct, id: string, props: PipelineStackProps) {
    super(scope, id, props);

    let solutionDesc =
      props.solutionDesc || "Centralized Logging with OpenSearch";
    let solutionId = props.solutionId || "SO8025";
    const stackPrefix = "CL";

    this.setDescription(
      `(${solutionId}-cfr) - ${solutionDesc} - CloudFront Realtime Logs Through KDS Analysis Pipeline Template - Version ${VERSION}`
    );

    const cloudFrontDistributionId = this.newParam("cloudFrontDistributionId", {
      type: "String",
      description: "CloudFront distribution ID",
      default: "",
    });
    this.addToParamLabels(
      "CloudFront distribution name",
      cloudFrontDistributionId.logicalId
    );

    const samplingRate = this.newParam("samplingRate", {
      type: "Number",
      description:
        "The percentage (%) of log records delivered, from 1% to 100%",
      minValue: 1,
      maxValue: 100,
      default: 100,
    });
    this.addToParamLabels("Sampling rate", samplingRate.logicalId);

    const fieldNames = this.newParam("fieldNames", {
      type: "CommaDelimitedList",
      description:
        "A comma separated list of CloudFront realtime log field names",
    });
    this.addToParamLabels(
      "CloudFront realtime log field names",
      fieldNames.logicalId
    );

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

    const logProcessorConcurrency = this.newParam("logProcessorConcurrency", {
      description: "Reserve concurrency for log processor lambda",
      default: 0,
      type: "Number",
    });
    this.addToParamLabels(
      "Number Of Reserve Concurrency",
      logProcessorConcurrency.logicalId
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
      logType: "CloudFront-RT",
      solutionId: solutionId,
    };

    const pipelineProps: KDSStackProps = {
      ...osProps,
      backupBucketName: backupBucketName.valueAsString,
      shardCount: shardCount.valueAsNumber,
      maxCapacity: maxCapacity.valueAsNumber,
      minCapacity: minCapacity.valueAsNumber,
      enableAutoScaling: props.enableAutoScaling!,
      subCategory: 'RT',
      env: {
        FIELD_NAMES: Fn.join(",", fieldNames.valueAsList),
      },
      stackPrefix: stackPrefix,
      logProcessorConcurrency: logProcessorConcurrency.valueAsNumber,
    };

    const kdsBufferStack = new KDSStack(this, "KDSBuffer", pipelineProps);


    const logProcessorLogGroupName = kdsBufferStack.logProcessorLogGroupName;

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

    

    constructFactory(CloudFrontRealTimeLog)(this, "CloudFrontRealTimeLog", {
      samplingRate: samplingRate.valueAsNumber,
      streamArn: kdsBufferStack.kinesisStreamArn,
      fields: fieldNames.valueAsList,
      distribution: cloudFrontDistributionId.valueAsString,
    });

    this.addToParamGroups(
      "Source Information",
      cloudFrontDistributionId.logicalId,
      samplingRate.logicalId,
      fieldNames.logicalId
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

    this.setMetadata();
  }
}

export interface CloudFrontRealTimeLogProps {
  readonly fields: string[];
  readonly samplingRate: number;
  readonly distribution: string;
  readonly streamArn: string;
}

export class CloudFrontRealTimeLog extends Construct {
  constructor(scope: Construct, id: string, props: CloudFrontRealTimeLogProps) {
    super(scope, id);

    const role = new iam.Role(this, "RoleCFRTLogConfig", {
      assumedBy: new iam.ServicePrincipal("cloudfront.amazonaws.com"),
    });
    role.attachInlinePolicy(
      new iam.Policy(this, "Policy", {
        statements: [
          new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
              "kinesis:DescribeStreamSummary",
              "kinesis:DescribeStream",
              "kinesis:ListStreams",
              "kinesis:PutRecord",
              "kinesis:PutRecords",
            ],
            resources: [props.streamArn],
          }),
          new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: ["kms:GenerateDataKey"],
            resources: [
              `arn:${Aws.PARTITION}:kms:${Aws.REGION}:${Aws.ACCOUNT_ID}:key/alias/aws/kinesis`,
            ],
          }),
        ],
      })
    );

    const cfnRealtimeLogConfig = new cloudfront.CfnRealtimeLogConfig(
      this,
      "CFRTLogConfig",
      {
        endPoints: [
          {
            kinesisStreamConfig: {
              roleArn: role.roleArn,
              streamArn: props.streamArn,
            },
            streamType: "Kinesis",
          },
        ],
        fields: props.fields,
        name: props.distribution + Aws.STACK_NAME,
        samplingRate: props.samplingRate,
      }
    );

    constructFactory(CustomResource)(this, "Resource", {
      serviceToken: CloudFrontRealTimeLogConfigUpdater.getOrCreate(this),
      resourceType: "Custom::CFRTLogConfigUpdater",
      properties: {
        CloudFrontDistribution: props.distribution,
        CloudFrontRealTimeLogConfigArn: cfnRealtimeLogConfig.attrArn,
      },
    });
  }
}

class CloudFrontRealTimeLogConfigUpdater extends Construct {
  /**
   * Returns the singleton provider.
   */
  public static getOrCreate(scope: Construct) {
    const stack = Stack.of(scope);
    const id = "com.amazonaws.cdk.custom-resources.cf-rt-log-config-updater";
    const x =
      (stack.node.tryFindChild(id) as CloudFrontRealTimeLogConfigUpdater) ||
      new CloudFrontRealTimeLogConfigUpdater(stack, id);
    return x.provider.serviceToken;
  }

  private readonly provider: cr.Provider;

  constructor(scope: Construct, id: string) {
    super(scope, id);

    this.provider = new cr.Provider(this, "cf-rt-log-config-updater-provider", {
      onEventHandler: new lambda.Function(
        this,
        "cf-rt-log-config-updater-on-event",
        {
          code: lambda.Code.fromAsset(
            path.join(
              __dirname,
              "../../../lambda/pipeline/common/custom-resource"
            )
          ),
          runtime: lambda.Runtime.PYTHON_3_11,
          timeout: Duration.seconds(60),
          logRetention: logs.RetentionDays.ONE_MONTH,
          handler: "cloudfront_realtime_log_config_updater.on_event",
          layers: [SharedPythonLayer.getInstance(this)],
          initialPolicy: [
            new iam.PolicyStatement({
              resources: ["*"],
              actions: [
                "cloudfront:GetDistribution",
                "cloudfront:UpdateDistribution",
                "cloudfront:GetDistributionConfig",
                "cloudfront:GetRealtimeLogConfig",
              ],
            }),
          ],
        }
      ),
    });
  }
}
