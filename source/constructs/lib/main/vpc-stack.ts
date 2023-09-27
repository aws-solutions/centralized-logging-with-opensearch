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
import { CfnOutput, RemovalPolicy } from 'aws-cdk-lib';
import {
  Peer,
  Port,
  SecurityGroup,
  CfnSecurityGroup,
  FlowLogDestination,
  FlowLogTrafficType,
  SubnetType,
  CfnSubnet,
  Vpc,
  IVpc,
  IpAddresses,
  GatewayVpcEndpointAwsService,
} from 'aws-cdk-lib/aws-ec2';
import { LogGroup, RetentionDays, CfnLogGroup } from 'aws-cdk-lib/aws-logs';
import { NagSuppressions } from 'cdk-nag';
import { Construct } from 'constructs';
import { addCfnNagSuppressRules } from '../main-stack';

export interface VpcProps {
  /**
   * cidr to create the VPC
   *
   * @default - 10.255.0.0/16.
   */
  // cidr?: string

  /**
   * if a VPC is not provided, create a new VPC
   *
   * @default - None.
   */
  vpc?: IVpc;
}

/**
 * Stack to provision a default VPC and security group.
 */
export class VpcStack extends Construct {
  readonly vpc: IVpc;
  readonly subnetIds: string[];
  readonly proxySg: SecurityGroup;
  readonly searchSg: SecurityGroup;
  readonly processSg: SecurityGroup;

  constructor(scope: Construct, id: string, props?: VpcProps) {
    super(scope, id);

    if (props?.vpc) {
      this.vpc = props.vpc;
      this.subnetIds = [];
    } else {
      // Create new VPC
      // const vpcStack = new VpcStack(this, `${solutionName}VPC`);
      // this.vpc = vpcStack.vpc
      const vpcLogGroup = new LogGroup(this, 'VPCLogGroup', {
        retention: RetentionDays.TWO_WEEKS,
        removalPolicy: RemovalPolicy.RETAIN,
      });

      const cfnVpcLG = vpcLogGroup.node.defaultChild as CfnLogGroup;
      addCfnNagSuppressRules(cfnVpcLG, [
        {
          id: 'W84',
          reason: 'log group is encrypted with the default master key',
        },
      ]);

      // Create a new VPC
      this.vpc = new Vpc(this, 'DefaultVPC', {
        ipAddresses: IpAddresses.cidr('10.255.0.0/16'),
        enableDnsHostnames: true,
        enableDnsSupport: true,
        subnetConfiguration: [
          {
            name: 'public',
            subnetType: SubnetType.PUBLIC,
            cidrMask: 24,
          },
          {
            name: 'private',
            subnetType: SubnetType.PRIVATE_WITH_EGRESS,
            cidrMask: 24,
          },
          {
            name: 'isolated',
            subnetType: SubnetType.PRIVATE_ISOLATED,
            cidrMask: 24,
          },
        ],
        maxAzs: 3,
        natGateways: 1,
        flowLogs: {
          ['DefaultVPCFlowLog']: {
            destination: FlowLogDestination.toCloudWatchLogs(vpcLogGroup),
            trafficType: FlowLogTrafficType.REJECT,
          },
        },
      });

      this.subnetIds = this.vpc.privateSubnets.map((subnet) => subnet.subnetId);

      this.vpc.addGatewayEndpoint('S3Endpoint', {
        service: GatewayVpcEndpointAwsService.S3,
      });

      this.vpc.publicSubnets.forEach((subnet) => {
        const cfnSubnet = subnet.node.defaultChild as CfnSubnet;
        addCfnNagSuppressRules(cfnSubnet, [
          {
            id: 'W33',
            reason: 'Default for public subnets',
          },
        ]);
      });
      new CfnOutput(this, 'PublicSubnets', {
        description: 'Public subnets',
        value: this.vpc.publicSubnets
          .map((subnet) => subnet.subnetId)
          .join(','),
      }).overrideLogicalId('PublicSubnets');

      new CfnOutput(this, 'PrivateSubnets', {
        description: 'Private subnets',
        value: this.vpc.privateSubnets
          .map((subnet) => subnet.subnetId)
          .join(','),
      }).overrideLogicalId('PrivateSubnets');

      new CfnOutput(this, 'IsolatedSubnets', {
        description: 'Isolated Subnets',
        value: this.vpc.isolatedSubnets
          .map((subnet) => subnet.subnetId)
          .join(','),
      }).overrideLogicalId('IsolatedSubnets');
    }

    // Create a default Security Group for creating Public Proxy
    this.proxySg = new SecurityGroup(this, 'ProxySecurityGroup', {
      vpc: this.vpc,
      description: 'Default Public Proxy Security group',
      allowAllOutbound: false,
    });
    this.proxySg.addIngressRule(
      Peer.anyIpv4(),
      Port.tcp(443),
      'Allow inbound https traffic'
    );
    this.proxySg.addEgressRule(
      Peer.anyIpv4(),
      Port.tcp(443),
      'Allow outbound https traffic'
    );
    const cfnProxySg = this.proxySg.node.defaultChild as CfnSecurityGroup;
    cfnProxySg.overrideLogicalId('ProxySecurityGroup');
    addCfnNagSuppressRules(cfnProxySg, [
      {
        id: 'W9',
        reason:
          'This security group is open to allow public https access, e.g. for ELB',
      },
      {
        id: 'W2',
        reason:
          'This security group is open to allow public https access, e.g. for ELB',
      },
      {
        id: 'W5',
        reason: 'This security group is restricted to https egress only',
      },
    ]);

    NagSuppressions.addResourceSuppressions(this.proxySg, [
      {
        id: 'AwsSolutions-EC23',
        reason:
          'This security group is open to allow public https access, e.g. for ELB',
      },
    ]);

    // Create a default Security Group to allow outbound https traffic only
    this.processSg = new SecurityGroup(this, 'ProcessSecurityGroup', {
      vpc: this.vpc,
      description: 'Default Log Processing Layer Security Group.',
      allowAllOutbound: false,
    });
    this.processSg.addIngressRule(
      this.proxySg,
      Port.tcp(443),
      'Allow inbound https traffic from Proxy SG only'
    );
    this.processSg.addEgressRule(
      Peer.anyIpv4(),
      Port.tcp(443),
      'Allow outbound https traffic'
    );
    this.processSg.addEgressRule(
      Peer.anyIpv4(),
      Port.tcp(80),
      'Allow outbound http traffic'
    );
    const cfnProcessSg = this.processSg.node.defaultChild as CfnSecurityGroup;
    cfnProcessSg.overrideLogicalId('ProcessSecurityGroup');
    addCfnNagSuppressRules(cfnProcessSg, [
      {
        id: 'W5',
        reason: 'This security group is restricted to https egress only',
      },
    ]);

    // Create a default Security Group for OpenSearch Cluster
    this.searchSg = new SecurityGroup(this, 'OpenSearchSecurityGroup', {
      vpc: this.vpc,
      description: 'Default OpenSearch cluster Security Group',
      allowAllOutbound: false,
    });
    this.searchSg.addIngressRule(
      this.processSg,
      Port.tcp(443),
      'Allow inbound https traffic from processing SG only'
    );
    this.searchSg.addEgressRule(
      Peer.anyIpv4(),
      Port.tcp(443),
      'Allow outbound https traffic'
    );
    const cfnSearchSg = this.searchSg.node.defaultChild as CfnSecurityGroup;
    cfnSearchSg.overrideLogicalId('OpenSearchSecurityGroup');
    addCfnNagSuppressRules(cfnSearchSg, [
      {
        id: 'W5',
        reason: 'This security group is restricted to https egress only',
      },
    ]);

    new CfnOutput(this, 'DefaultVpcId', {
      description: 'Default VPC ID',
      value: this.vpc.vpcId,
    }).overrideLogicalId('DefaultVpcId');

    new CfnOutput(this, 'ProxySGId', {
      description: 'Public Proxy Security Group',
      value: this.proxySg.securityGroupId,
    }).overrideLogicalId('ProxySecurityGroupId');

    new CfnOutput(this, 'ProcessSGId', {
      description: 'Log Processing Security Group',
      value: this.processSg.securityGroupId,
    }).overrideLogicalId('ProcessSecurityGroupId');

    new CfnOutput(this, 'OpenSearchSGId', {
      description: 'OpenSearch Security Group',
      value: this.searchSg.securityGroupId,
    }).overrideLogicalId('OpenSearchSecurityGroupId');
  }
}
