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

import { Aws, Fn, RemovalPolicy, CfnOutput, aws_ssm as ssm } from 'aws-cdk-lib';
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
} from 'aws-cdk-lib/aws-ec2';
import { LogGroup, RetentionDays } from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';

export interface InitVPCProps {
  vpc?: string;
  privateSubnets?: Array<string>;
}

export class InitVPCStack extends Construct {
  readonly vpc: IVpc;
  readonly privateSubnets: string;
  readonly publicSecurityGroup: SecurityGroup;
  readonly privateSecurityGroup: SecurityGroup;

  constructor(scope: Construct, id: string, props: InitVPCProps) {
    super(scope, id);

    if (props?.vpc) {
      this.vpc = Vpc.fromVpcAttributes(this, 'ExistingVPC', {
        vpcId: props.vpc,
        availabilityZones: Fn.getAzs(),
        privateSubnetIds: props.privateSubnets,
      });
    } else {
      // Create new VPC
      const vpcLogGroup = new LogGroup(this, 'VPCLogGroup', {
        retention: RetentionDays.TWO_WEEKS,
        removalPolicy: RemovalPolicy.RETAIN,
      });

      // Create a new VPC
      this.vpc = new Vpc(this, 'DefaultVPC', {
        ipAddresses: IpAddresses.cidr('10.255.0.0/16'), //NOSONAR
        enableDnsHostnames: true,
        enableDnsSupport: true,
        subnetConfiguration: [
          {
            name: 'public',
            subnetType: SubnetType.PUBLIC,
            cidrMask: 24,
            mapPublicIpOnLaunch: false,
          },
          {
            name: 'private',
            subnetType: SubnetType.PRIVATE_WITH_EGRESS,
            cidrMask: 24,
          },
        ],
        maxAzs: 3,
        flowLogs: {
          ['DefaultVPCFlowLog']: {
            destination: FlowLogDestination.toCloudWatchLogs(vpcLogGroup),
            trafficType: FlowLogTrafficType.REJECT,
          },
        },
      });

      this.vpc.addGatewayEndpoint('S3Endpoint', {
        service: GatewayVpcEndpointAwsService.S3,
      });
      this.vpc.addGatewayEndpoint('DynamoDBEndpoint', {
        service: GatewayVpcEndpointAwsService.DYNAMODB,
      });
    }

    // Create a Default Security Group to allow outbound https & http traffic only
    this.privateSecurityGroup = new SecurityGroup(
      this,
      'PrivateSecurityGroup',
      {
        vpc: this.vpc,
        description: 'Default Private Security Group.',
        allowAllOutbound: true,
      }
    );

    const cfnPrivateSecurityGroup = this.privateSecurityGroup.node
      .defaultChild as CfnSecurityGroup;
    cfnPrivateSecurityGroup.overrideLogicalId('PrivateSecurityGroup');

    cfnPrivateSecurityGroup.addMetadata('cfn_nag', {
      rules_to_suppress: [
        {
          id: 'W5',
          reason: 'This Security Group need to open to world on egress.',
        },
      ],
    });

    this.privateSubnets = Fn.join(
      ',',
      this.vpc.privateSubnets.map((subnet) => subnet.subnetId)
    );

    const SSMVpcId = new ssm.StringParameter(this, 'SSMVpcId', {
      parameterName: '/MicroBatch/VpcId',
      stringValue: this.vpc.vpcId,
    });

    // Override the logical ID
    const cfnSSMVpcId = SSMVpcId.node.defaultChild as ssm.CfnParameter;
    cfnSSMVpcId.overrideLogicalId('SSMVpcId');

    new CfnOutput(this, 'VpcId', {
      description: 'Vpc Id',
      value: this.vpc.vpcId,
    }).overrideLogicalId('VpcId');

    const SSMPrivateSubnetIds = new ssm.StringParameter(
      this,
      'SSMPrivateSubnetIds',
      {
        parameterName: '/MicroBatch/PrivateSubnetIds',
        stringValue: Fn.join(
          ',',
          this.vpc.privateSubnets.map((subnet) => subnet.subnetId)
        ),
      }
    );

    // Override the logical ID
    const cfnSSMPrivateSubnetIds = SSMPrivateSubnetIds.node
      .defaultChild as ssm.CfnParameter;
    cfnSSMPrivateSubnetIds.overrideLogicalId('SSMPrivateSubnetIds');

    new CfnOutput(this, 'PrivateSubnetIds', {
      description: 'Private Subnet Ids',
      value: this.privateSubnets,
    }).overrideLogicalId('PrivateSubnetIds');

    new CfnOutput(this, 'PrivateSecurityGroupId', {
      description: 'Private Security Group Id',
      value: this.privateSecurityGroup.securityGroupId,
      exportName: `${Aws.STACK_NAME}::PrivateSecurityGroupId`,
    }).overrideLogicalId('PrivateSecurityGroupId');
  }
}
