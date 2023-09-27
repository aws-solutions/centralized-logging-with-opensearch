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

import {
  StackProps,
  Aws,
  Fn,
  Duration,
  IAspect,
  Aspects,
  CfnResource,
  CfnCondition,
  aws_elasticloadbalancingv2 as elbv2,
  aws_ecs as ecs,
  aws_ec2 as ec2,
  aws_logs as logs,
  aws_iam as iam,
  aws_s3 as s3,
  CfnMapping,
} from "aws-cdk-lib";
import { CfnSecurityGroup } from "aws-cdk-lib/aws-ec2";
import { NagSuppressions } from "cdk-nag";
import { SolutionStack } from "../common/solution-stack";
import {
  CfnTaskDefinition,
  ContainerDefinition,
  TaskDefinition,
} from "aws-cdk-lib/aws-ecs";
import { Construct, IConstruct } from "constructs";

const { VERSION } = process.env;
const GB = 1024;
const ECR_IMG_VERSION = "2.31.12";
const NLB_MIN_PORT = 500;
const NLB_MAX_PORT = 20000;

export interface SyslogConfigProps extends StackProps {
  solutionName?: string;
  solutionDesc?: string;
  solutionId?: string;
}

export class SyslogtoECSStack extends SolutionStack {
  constructor(scope: Construct, id: string, props: SyslogConfigProps) {
    super(scope, id, props);

    let solutionDesc =
      props.solutionDesc || "Centralized Logging with OpenSearch";
    let solutionId = props.solutionId || "SO8025";
    const stackPrefix = 'CL';

    this.setDescription(
      `(${solutionId}-sys) - ${solutionDesc} - Syslog Pipeline Template - Version ${VERSION}`
    );

    const nlbArn = this.newParam(`NlbArn`, {
      description:
        "ECS Cluster Name to run ECS task (Please make sure the cluster exists)",
      type: "String",
    });

    const ecsTaskRoleArn = this.newParam(`ECSTaskRoleArn`, {
      description:
        "ECS Task Role Arn to run ECS task (Please make sure the role exists)",
      type: "String",
    });

    const ecsClusterName = this.newParam(`ECSClusterName`, {
      description:
        "ECS Cluster Name to run ECS task (Please make sure the cluster exists)",
      type: "String",
    });

    const ecsVpcId = this.newParam("ECSVpcId", {
      description: "VPC ID to run ECS task, e.g. vpc-bef13dc7",
      default: "",
      type: "AWS::EC2::VPC::Id",
    });

    const ecsSubnets = this.newParam("ECSSubnets", {
      description:
        "Subnet IDs to run ECS task. Please provide two private subnets at least delimited by comma, e.g. subnet-97bfc4cd,subnet-7ad7de32",
      type: "List<AWS::EC2::Subnet::Id>",
    });

    const configS3BucketName = this.newParam(`ConfigS3BucketName`, {
      description:
        "S3 bucket to store agent config files (Please make sure the bucket exists)",
      type: "String",
    });
    this.addToParamGroups(
      "Base Params",
      ecsTaskRoleArn.logicalId,
      ecsClusterName.logicalId,
      ecsVpcId.logicalId,
      ecsSubnets.logicalId,
      configS3BucketName.logicalId
    );

    const portNum = this.newParam("NlbPortParam", {
      type: "Number",
      description: `The nlb port to which your syslog are sent.`,
      default: 10000,
    });

    const protocolType = this.newParam("NlbProtocolTypeParam", {
      type: "String",
      description: `The nlb protocol type to which your syslog are sent.`,
      allowedValues: ["UDP", "TCP"],
      default: "UDP",
    });

    const configS3Key = this.newParam("ServiceConfigS3KeyParam", {
      type: "String",
      description: `The S3 folder path of Agent config file, e.g. app_log_config/syslog/10009/`,
      default: "",
    });

    this.addToParamGroups(
      "NLB Port Params",
      portNum.logicalId,
      protocolType.logicalId,
      configS3Key.logicalId
    );

    // You should use lowercase in ECS task definition, but must use uppercase in ELB related definition
    const protocolTable = new CfnMapping(this, "ProtocolTable", {
      mapping: {
        TCP: {
          protocolLowerCase: "tcp",
        },
        UDP: {
          protocolLowerCase: "udp",
        },
      },
    });

    const vpc = ec2.Vpc.fromVpcAttributes(this, "EC2Vpc", {
      vpcId: ecsVpcId.valueAsString,
      availabilityZones: Fn.getAzs(),
      privateSubnetIds: ecsSubnets.valueAsList,
    });
    const taskSubnets = vpc.privateSubnets;

    const ecsCluster = ecs.Cluster.fromClusterAttributes(
      this,
      `${stackPrefix}Cluster`,
      {
        clusterName: ecsClusterName.valueAsString,
        vpc: vpc,
        securityGroups: [],
      }
    );

    const configS3Bucket = s3.Bucket.fromBucketName(
      this,
      "ConfigS3Bucket",
      configS3BucketName.valueAsString
    );

    const ecsServiceSG = new ec2.SecurityGroup(this, "ECSServiceSG", {
      vpc,
      allowAllOutbound: false,
      description: "security group for ECS Service",
    });
    ecsServiceSG.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.udpRange(NLB_MIN_PORT, NLB_MAX_PORT),
      "allow UDP syslog traffic from anywhere"
    );
    ecsServiceSG.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcpRange(NLB_MIN_PORT, NLB_MAX_PORT),
      "allow TCP syslog traffic from anywhere"
    );
    ecsServiceSG.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(2022),
      "allow HTTP traffic for Fluent-bit health check"
    );
    ecsServiceSG.addEgressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(443),
      "allow Fluent-bit to access HTTPS."
    );
    NagSuppressions.addResourceSuppressions(ecsServiceSG, [
      {
        id: "AwsSolutions-EC23",
        reason:
          "This security group is open to allow public https access, e.g. for ELB",
      },
    ]);
    const cfnecsServiceSG = ecsServiceSG.node.defaultChild as CfnSecurityGroup;
    cfnecsServiceSG.overrideLogicalId("ECSServiceSG");
    this.addCfnNagSuppressRules(cfnecsServiceSG, [
      {
        id: "W9",
        reason:
          "This security group is open to allow internal tcp/udp, e.g. for ELB",
      },
      {
        id: "W2",
        reason:
          "This security group is open to allow internal tcp/udp, e.g. for ELB",
      },
      {
        id: "W5",
        reason: "This security group is restricted to tcp/udp egress only",
      },
      {
        id: "W27",
        reason: "This security group is open to allow internal tcp/udp range",
      },
    ]);

    const syslogNlb =
      elbv2.NetworkLoadBalancer.fromNetworkLoadBalancerAttributes(
        this,
        "SyslogNLB",
        {
          loadBalancerArn: nlbArn.valueAsString,
          vpc: vpc,
        }
      );

    NagSuppressions.addResourceSuppressions(syslogNlb, [
      {
        id: "AwsSolutions-ELB2",
        reason: "config log enabled for ELB",
      },
    ]);

    const serviceTaskRole = new iam.Role(this, "ECSServiceTaskRole", {
      assumedBy: new iam.ServicePrincipal("ecs-tasks.amazonaws.com"),
    });

    // Add the role to
    serviceTaskRole.addToPrincipalPolicy(
      new iam.PolicyStatement({
        actions: ["sts:AssumeRole"],
        resources: [`*`],
      })
    );

    serviceTaskRole.addToPrincipalPolicy(
      new iam.PolicyStatement({
        actions: [
          "s3:GetObject*",
          "s3:GetBucket*",
          "s3:List*",
          "s3:PutObject*",
        ],
        resources: [
          `arn:${Aws.PARTITION}:s3:::${configS3Bucket.bucketName}/*`,
          `arn:${Aws.PARTITION}:s3:::${configS3Bucket.bucketName}`,
        ],
      })
    );

    // Create the service
    const taskDefinition = new ecs.FargateTaskDefinition(
      this,
      `ServiceTaskDef`,
      {
        cpu: 1 * GB,
        memoryLimitMiB: 2 * GB,
        taskRole: serviceTaskRole,
      }
    );

    const service = new ecs.FargateService(this, `Service`, {
      cluster: ecsCluster,
      desiredCount: 2, // This number must larger than the number of NLB AZs
      taskDefinition: taskDefinition,
      vpcSubnets: {
        subnets: taskSubnets,
      },
      securityGroups: [ecsServiceSG],
      assignPublicIp: false,
      minHealthyPercent: 100,
      maxHealthyPercent: 200,
      propagateTags: ecs.PropagatedTagSource.SERVICE,
      enableECSManagedTags: true,
      enableExecuteCommand: true,
    });

    service
      .autoScaleTaskCount({
        minCapacity: 2, // This number must larger than the number of NLB AZs
        maxCapacity: 10,
      })
      .scaleOnCpuUtilization("CpuScaling", {
        targetUtilizationPercent: 50,
        scaleOutCooldown: Duration.seconds(10),
      });

    // Create listener and targetGroup
    const listener = syslogNlb.addListener(`PublicListener`, {
      port: portNum.valueAsNumber,
    });
    const cfnListener = listener.node.defaultChild as elbv2.CfnListener;
    cfnListener.addPropertyOverride("Protocol", protocolType.valueAsString);

    const targetGroup = listener.addTargets(`ECSTargeGroup`, {
      port: portNum.valueAsNumber,
      healthCheck: {
        enabled: true,
        port: "2022",
        protocol: elbv2.Protocol.TCP,
      },
    });
    const cfnTargetGroup = targetGroup.node
      .defaultChild as elbv2.CfnTargetGroup;
    cfnTargetGroup.addPropertyOverride("Protocol", protocolType.valueAsString);

    class MyContainerDefinition extends ContainerDefinition {
      public renderContainerDefinition(
        _taskDefinition?: TaskDefinition
      ): CfnTaskDefinition.ContainerDefinitionProperty {
        return Object.assign(super.renderContainerDefinition(_taskDefinition), {
          portMappings: [
            {
              containerPort: portNum.valueAsNumber,
              protocol: protocolTable.findInMap(
                protocolType.valueAsString,
                "protocolLowerCase"
              ),
            },
          ],
        });
      }
    }

    taskDefinition.defaultContainer = new MyContainerDefinition(
      service,
      `ServiceContainer`,
      {
        taskDefinition: service.taskDefinition,
        image: ecs.ContainerImage.fromRegistry(
          `public.ecr.aws/aws-gcr-solutions/logging-syslog:${ECR_IMG_VERSION}`
        ),
        logging: ecs.LogDrivers.awsLogs({
          streamPrefix: id,
          logRetention: logs.RetentionDays.ONE_WEEK,
        }),
        environment: Object.assign(
          {
            CONFIG_S3_BUCKET: configS3BucketName.valueAsString,
            CONFIG_S3_KEY: configS3Key.valueAsString,
          },
          scope.node.tryGetContext("env")
        ),
        portMappings: [{ containerPort: portNum.valueAsNumber }],
      }
    );

    targetGroup.addTarget(service);

    this.setMetadata();

    Aspects.of(this).add(new InjectRemoveECSAlarm());
  }

  protected enable(param: { construct: IConstruct; if: CfnCondition }) {
    Aspects.of(param.construct).add(new InjectCondition(param.if));
  }
}

class InjectCondition implements IAspect {
  public constructor(private condition: CfnCondition) { }

  public visit(node: IConstruct): void {
    if (node instanceof CfnResource) {
      node.cfnOptions.condition = this.condition;
    }
  }
}

class InjectRemoveECSAlarm implements IAspect {
  public visit(node: IConstruct): void {
    if (
      node instanceof CfnResource &&
      node.cfnResourceType === "AWS::ECS::Service"
    ) {
      node.addDeletionOverride(
        "Properties.DeploymentConfiguration.Alarms"
      );
    }
  }
}
