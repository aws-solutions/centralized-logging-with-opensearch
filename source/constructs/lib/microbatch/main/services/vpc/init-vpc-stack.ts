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
import { Fn, CfnOutput, RemovalPolicy } from "aws-cdk-lib";
import {
  SecurityGroup,
  CfnSecurityGroup,
  FlowLogDestination,
  FlowLogTrafficType,
  SubnetType,
  IpAddresses,
  Vpc,
  IVpc,
  GatewayVpcEndpointAwsService,
} from "aws-cdk-lib/aws-ec2";
import { LogGroup, RetentionDays } from "aws-cdk-lib/aws-logs";

export interface InitVPCProps {
  vpc?: string;
  privateSubnets?: Array<string>;
}

export class InitVPCStack extends Construct {
  readonly vpc: IVpc;
  readonly publicSecurityGroup: SecurityGroup;
  readonly privateSecurityGroup: SecurityGroup;

  constructor(scope: Construct, id: string, props: InitVPCProps) {
    super(scope, id);

    if (props?.vpc) {
      this.vpc = Vpc.fromVpcAttributes(this, "ExistingVPC", {
        vpcId: props.vpc,
        availabilityZones: Fn.getAzs(),
        privateSubnetIds: props.privateSubnets,
      });
    } else {
      // Create new VPC
      const vpcLogGroup = new LogGroup(this, "VPCLogGroup", {
        retention: RetentionDays.TWO_WEEKS,
        removalPolicy: RemovalPolicy.RETAIN,
      });

      // Create a new VPC
      this.vpc = new Vpc(this, "DefaultVPC", {
        ipAddresses: IpAddresses.cidr("10.255.0.0/16"),
        enableDnsHostnames: true,
        enableDnsSupport: true,
        subnetConfiguration: [
          {
            name: "public",
            subnetType: SubnetType.PUBLIC,
            cidrMask: 24,
            mapPublicIpOnLaunch: false,
          },
          {
            name: "private",
            subnetType: SubnetType.PRIVATE_WITH_EGRESS,
            cidrMask: 24,
          },
        ],
        maxAzs: 3,
        flowLogs: {
          ["DefaultVPCFlowLog"]: {
            destination: FlowLogDestination.toCloudWatchLogs(vpcLogGroup),
            trafficType: FlowLogTrafficType.REJECT,
          },
        },
      });

      this.vpc.addGatewayEndpoint("S3Endpoint", {
        service: GatewayVpcEndpointAwsService.S3,
      });
      this.vpc.addGatewayEndpoint("DynamoDBEndpoint", {
        service: GatewayVpcEndpointAwsService.DYNAMODB,
      });

      new CfnOutput(this, "PrivateSubnets", {
        description: "Private subnets",
        value: this.vpc.privateSubnets
          .map((subnet) => subnet.subnetId)
          .join(","),
      }).overrideLogicalId("PrivateSubnets");
    }

    // Create a Default Security Group to allow outbound https & http traffic only
    this.privateSecurityGroup = new SecurityGroup(
      this,
      "PrivateSecurityGroup",
      {
        vpc: this.vpc,
        description: "Default Private Security Group.",
        allowAllOutbound: true,
      }
    );

    const cfnPrivateSecurityGroup = this.privateSecurityGroup.node
      .defaultChild as CfnSecurityGroup;
    cfnPrivateSecurityGroup.overrideLogicalId("PrivateSecurityGroup");

    cfnPrivateSecurityGroup.addMetadata("cfn_nag", {
      rules_to_suppress: [
        {
          id: "W5",
          reason: "This Security Group need to open to world on egress.",
        },
      ],
    });

    new CfnOutput(this, "VPCId", {
      description: "Default VPC ID",
      value: this.vpc.vpcId,
    }).overrideLogicalId("VPCId");

    new CfnOutput(this, "PrivateSecurityGroupId", {
      description: "Private Security Group",
      value: this.privateSecurityGroup.securityGroupId,
    }).overrideLogicalId("PrivateSecurityGroupId");
  }
}
