// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import {
  aws_certificatemanager as acm,
  Aspects,
  aws_autoscaling as au,
  CfnCondition,
  CfnOutput,
  CfnParameter,
  CfnResource,
  Duration,
  aws_ec2 as ec2,
  aws_elasticloadbalancingv2 as elbv2,
  Fn,
  aws_iam as iam,
  IAspect,
  Stack,
  StackProps,
} from 'aws-cdk-lib';
import { NagSuppressions } from 'cdk-nag';
import { Construct, IConstruct } from 'constructs';
import * as path from 'path';
import { constructFactory } from '../util/stack-helper';
import { CfnGuardSuppressResourceList } from '../util/add-cfn-guard-suppression';

const { VERSION } = process.env;

export interface NginxProps extends StackProps {
  solutionName?: string;
  solutionDesc?: string;
  solutionId?: string;
}

export class NginxForOpenSearchStack extends Stack {
  private paramGroups: any[] = [];
  private paramLabels: any = {};
  private openSearchEndPoint = '';
  private cognitoEndpoint = '';
  private customEndpointValue = '';
  private engineURL = '';
  private enableInternal = 'internal;';
  constructor(scope: Construct, id: string, props: NginxProps) {
    super(scope, id, props);

    let solutionDesc =
      props.solutionDesc || 'Centralized Logging with OpenSearch';
    let solutionId = props.solutionId || 'SO8025';
    this.templateOptions.description = `(${solutionId}-proxy) - ${solutionDesc} nginx-for-opensearch-stack Template. Template version ${VERSION}`;

    this.templateOptions.metadata = {
      'AWS::CloudFormation::Interface': {
        ParameterGroups: this.paramGroups,
        ParameterLabels: this.paramLabels,
      },
    };

    const vpcId = new CfnParameter(this, 'vpcId', {
      description:
        'The VPC to deploy the Nginx proxy resource. e.g. vpc-bef13dc7',
      default: '',
      type: 'AWS::EC2::VPC::Id',
    });
    this.addToParamLabels('VPCId', vpcId.logicalId);

    const publicSubnetIds = new CfnParameter(this, 'publicSubnetIds', {
      description:
        'The public subnets where ELB are deployed. Please select at least two public subnets. e.g. subnet-12345abc, subnet-54321cba',
      default: '',
      type: 'List<AWS::EC2::Subnet::Id>',
    });
    this.addToParamLabels('PublicSubnetIds', publicSubnetIds.logicalId);

    const privateSubnetIds = new CfnParameter(this, 'privateSubnetIds', {
      description:
        'The private subnets where Nginx instances are deployed. Please select at least two private subnets. e.g. subnet-12345abc, subnet-54321cba',
      default: '',
      type: 'List<AWS::EC2::Subnet::Id>',
    });
    this.addToParamLabels('PrivtaeSubnetIds', privateSubnetIds.logicalId);

    const nginxSecurityGroupId = new CfnParameter(
      this,
      'nginxSecurityGroupId',
      {
        description:
          'The Security group associated with the Nginx instances. The scurity group must allow access from ELB security group',
        default: '',
        type: 'AWS::EC2::SecurityGroup::Id',
      }
    );
    this.addToParamLabels(
      'NginxSecurityGroupId',
      nginxSecurityGroupId.logicalId
    );

    const elbSecurityGroupId = new CfnParameter(this, 'elbSecurityGroupId', {
      description:
        'The Security group being associated with the ELB. e.g. sg-123456',
      default: '',
      type: 'AWS::EC2::SecurityGroup::Id',
    });
    this.addToParamLabels('ELBSecurityGroupId', elbSecurityGroupId.logicalId);

    const keyName = new CfnParameter(this, 'keyName', {
      description: 'The PEM key name of the Nginx instances',
      type: 'AWS::EC2::KeyPair::KeyName',
      default: '',
    });
    this.addToParamLabels('KeyName', keyName.logicalId);

    const endpoint = new CfnParameter(this, 'endpoint', {
      description:
        'The OpenSearch endpoint. e.g. vpc-your_opensearch_domain_name-xcvgw6uu2o6zafsiefxubwuohe.us-east-1.es.amazonaws.com',
      default: '',
      type: 'String',
    });
    this.addToParamLabels('Endpoint', endpoint.logicalId);

    const cognitoEndpoint = new CfnParameter(this, 'cognitoEndpoint', {
      description:
        'The Cognito User Pool endpoint URL of the OpenSearch domain. e.g. mydomain.auth.us-east-1.amazoncognito.com',
      default: '',
      type: 'String',
    });
    this.addToParamLabels('CognitoEndpoint', cognitoEndpoint.logicalId);

    const elbDomainCertificateArn = new CfnParameter(
      this,
      'elbDomainCertificateArn',
      {
        description:
          'The SSL certificate ARN which associated with the ELBDomain. The certificate must be created from Amazon Certificate Manager (ACM)',
        type: 'String',
        default: '',
      }
    );
    this.addToParamLabels(
      'ELBDomainCertificateArn',
      elbDomainCertificateArn.logicalId
    );

    const elbDomain = new CfnParameter(this, 'elbDomain', {
      description:
        'The custom domain name of the ELB. e.g. dashboard.example.com',
      type: 'String',
      default: '',
    });
    this.addToParamLabels('ELBDomain', elbDomain.logicalId);

    const elbAccessLogBucketName = new CfnParameter(
      this,
      'elbAccessLogBucketName',
      {
        description: 'The Access Log Bucket Name for Proxy ELB',
        type: 'String',
        default: '',
      }
    );
    this.addToParamLabels(
      'ELBAccessLogBucketName',
      elbAccessLogBucketName.logicalId
    );

    const engineType = new CfnParameter(this, 'engineType', {
      description:
        'The engine type of the OpenSearch. Select OpenSearch or Elasticsearch',
      default: 'OpenSearch',
      allowedValues: ['OpenSearch', 'Elasticsearch'],
      type: 'String',
    });
    this.addToParamLabels('EngineType', engineType.logicalId);

    // Set proxy instance type
    const proxyInstanceType = new CfnParameter(this, 'proxyInstanceType', {
      description: 'OpenSearch proxy instance type. e.g. t3.micro',
      type: 'String',
      allowedValues: ['t3.nano', 't3.micro', 't3.small', 't3.large'],
      default: 't3.large',
    });
    this.addToParamLabels('ProxyInstanceType', proxyInstanceType.logicalId);

    // Set proxy instance number (can be 1 ~ 4)
    const proxyInstanceNumber = new CfnParameter(this, 'proxyInstanceNumber', {
      description: 'OpenSearch proxy instance number. e.g. 1 to 4',
      type: 'Number',
      default: 2,
    });
    this.addToParamLabels('ProxyInstanceNumber', proxyInstanceNumber.logicalId);

    this.addToParamGroups(
      'EC2 Information',
      vpcId.logicalId,
      publicSubnetIds.logicalId,
      privateSubnetIds.logicalId,
      keyName.logicalId,
      nginxSecurityGroupId.logicalId,
      proxyInstanceType.logicalId,
      proxyInstanceNumber.logicalId
    );
    this.addToParamGroups(
      'OpenSearch Information',
      endpoint.logicalId,
      engineType.logicalId,
      cognitoEndpoint.logicalId
    );
    this.addToParamGroups(
      'ELB Information',
      elbSecurityGroupId.logicalId,
      elbDomain.logicalId,
      elbDomainCertificateArn.logicalId,
      elbAccessLogBucketName.logicalId
    );

    // Get the VPC where Nginx EC2 needs to be deployed
    const nginxVpc = ec2.Vpc.fromVpcAttributes(this, 'ESVpc', {
      vpcId: vpcId.valueAsString,
      availabilityZones: Fn.getAzs(),
      privateSubnetIds: privateSubnetIds.valueAsList,
      publicSubnetIds: publicSubnetIds.valueAsList,
    });

    //SG for Nginx proxy
    const ec2SecurityGroup = ec2.SecurityGroup.fromSecurityGroupId(
      this,
      'NginxEC2SecurityGroup',
      nginxSecurityGroupId.valueAsString
    );
    NagSuppressions.addResourceSuppressions(ec2SecurityGroup, [
      {
        id: 'AwsSolutions-EC23',
        reason:
          'This security group is open to allow public https access, e.g. for ELB',
      },
    ]);

    const lbSecurityGroup = ec2.SecurityGroup.fromSecurityGroupId(
      this,
      'LoadBalancerSecurityGroup',
      elbSecurityGroupId.valueAsString
    );
    NagSuppressions.addResourceSuppressions(lbSecurityGroup, [
      {
        id: 'AwsSolutions-IAM4',
        reason: 'For PVRE compliance',
      },
      {
        id: 'AwsSolutions-EC23',
        reason:
          'This security group is open to allow public https access, e.g. for ELB',
      },
    ]);

    //user data for Nginx proxy
    const ud_ec2 = ec2.UserData.forLinux();

    //create ec2 role
    const ec2Role = new iam.Role(this, 'ec2Role', {
      assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
    });
    ec2Role.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMManagedInstanceCore')
    );
    NagSuppressions.addResourceSuppressions(ec2Role, [
      {
        id: 'AwsSolutions-IAM4',
        reason: 'For PVRE compliance',
      },
    ]);

    const customEndpointNotProvided = new CfnCondition(
      this,
      'customEndpointProvided',
      {
        expression: Fn.conditionEquals('', elbDomain),
      }
    );

    const proxyLaunchTemplate = new ec2.LaunchTemplate(
      this,
      'NginxProxyEC2LaunchTemplate',
      {
        instanceType: new ec2.InstanceType(proxyInstanceType.valueAsString),
        machineImage: new ec2.AmazonLinuxImage({
          generation: ec2.AmazonLinuxGeneration.AMAZON_LINUX_2,
        }),
        userData: ud_ec2,
        role: ec2Role,
        keyName: keyName.valueAsString,
        requireImdsv2: true,
        securityGroup: ec2SecurityGroup,
        blockDevices: [
          {
            deviceName: '/dev/xvda',
            volume: ec2.BlockDeviceVolume.ebs(8, {
              deleteOnTermination: true,
              encrypted: true,
              volumeType: ec2.EbsDeviceVolumeType.GP2,
            }),
          },
        ],
      }
    );

    // ASG for Nginx proxy, one per az for HA
    const nginx_asg = new au.AutoScalingGroup(this, 'NginxProxyEC2', {
      vpc: nginxVpc,
      maxCapacity: 4,
      minCapacity: 0,
      desiredCapacity: proxyInstanceNumber.valueAsNumber,
      signals: au.Signals.waitForMinCapacity(),
      launchTemplate: proxyLaunchTemplate,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
        onePerAz: true,
      },
      healthChecks: au.HealthChecks.withAdditionalChecks({
        gracePeriod: Duration.seconds(300),
        additionalTypes: [au.AdditionalHealthCheckType.ELB],
      }),
    });

    NagSuppressions.addResourceSuppressions(nginx_asg, [
      {
        id: 'AwsSolutions-AS3',
        reason:
          'will enable ASG notifications configured for all scaling events.',
      },
    ]);

    //ACM certifacates
    const cert = acm.Certificate.fromCertificateArn(
      this,
      'Certificate',
      elbDomainCertificateArn.valueAsString
    );

    // Create the load balancer in a VPC
    const lb = new elbv2.ApplicationLoadBalancer(this, 'Load Balancer', {
      vpc: nginxVpc,
      internetFacing: true,
      securityGroup: lbSecurityGroup,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PUBLIC,
      },
    });
    NagSuppressions.addResourceSuppressions(lb, [
      {
        id: 'AwsSolutions-ELB2',
        reason: 'config log enabled for ELB',
      },
    ]);

    // enable proxy stack ELB access log
    lb.setAttribute('access_logs.s3.enabled', 'true');
    lb.setAttribute(
      'access_logs.s3.bucket',
      elbAccessLogBucketName.valueAsString
    );
    lb.setAttribute('access_logs.s3.prefix', `ELBLogs/opensearchproxy`);

    // lb listener, 443
    const listener = lb.addListener('Listener', {
      port: 443,
      // 'open: true' is the default, you can leave it out if you want. Set it
      // to 'false' and use `listener.connections` if you want to be selective
      // about who can access the load balancer.
      certificates: [cert],
      open: true,
      sslPolicy: elbv2.SslPolicy.TLS12,
    });

    //listener target group && health check
    listener.addTargets('ApplicationFleet', {
      port: 443,
      healthCheck: {
        enabled: true,
        path: '/',
        port: '443',
        protocol: elbv2.Protocol.HTTPS,
        healthyHttpCodes: '302',
      },
      targets: [nginx_asg],
    });

    this.openSearchEndPoint = endpoint.valueAsString;
    // Flag to determine whether cogito is enabled or not
    const cognitoNotEnabled = new CfnCondition(this, 'cognitoNotEnabled', {
      expression: Fn.conditionEquals('', cognitoEndpoint.valueAsString),
    });
    // Configuration value that is a different string based on cognitoNotEnabled
    this.cognitoEndpoint = Fn.conditionIf(
      cognitoNotEnabled.logicalId,
      this.openSearchEndPoint,
      cognitoEndpoint.valueAsString
    ).toString();

    this.enableInternal = Fn.conditionIf(
      cognitoNotEnabled.logicalId,
      this.enableInternal,
      ''
    ).toString();
    this.customEndpointValue = Fn.conditionIf(
      customEndpointNotProvided.logicalId,
      lb.loadBalancerDnsName,
      elbDomain.valueAsString
    ).toString();

    //check whether OpenSearch is selected or otherwise Elasticsearch is selected
    const openSearchEngineUsed = new CfnCondition(
      this,
      'openSearchEngineUsed',
      {
        expression: Fn.conditionEquals('OpenSearch', engineType.valueAsString),
      }
    );
    // Configuration value that is a different string based on flag
    this.engineURL = Fn.conditionIf(
      openSearchEngineUsed.logicalId,
      '_dashboards',
      '_plugin\\/kibana'
    ).toString();

    nginx_asg.applyCloudFormationInit(
      ec2.CloudFormationInit.fromElements(
        ec2.InitFile.fromFileInline(
          '/etc/nginx/conf.d/default.conf',
          path.join(__dirname, '../opensearch/config/default.conf')
        ),
        ec2.InitFile.fromFileInline(
          '/etc/nginx/openssl.cnf',
          path.join(__dirname, '../opensearch/config/openssl.cnf')
        ),
        ec2.InitFile.fromFileInline(
          '/etc/init.d/nginx',
          path.join(__dirname, '../opensearch/config/nginx')
        )
      )
    );
    //proxy user data
    ud_ec2.addCommands(
      `amazon-linux-extras install -y nginx1`,
      `openssl genrsa -out /etc/nginx/cert.key 2048`,
      `openssl req -config /etc/nginx/openssl.cnf -new -key /etc/nginx/cert.key -out /etc/nginx/cert.csr`,
      `openssl x509 -req -days 2048 -in /etc/nginx/cert.csr -signkey /etc/nginx/cert.key -out /etc/nginx/cert.crt`,
      'TOKEN=`curl -X PUT -H "X-aws-ec2-metadata-token-ttl-seconds: 21600" "http://169.254.169.254/latest/api/token"`',
      'ACCESS_TOKEN=`curl -H "X-aws-ec2-metadata-token: $TOKEN" -X PUT -H "X-aws-ec2-metadata-token-ttl-seconds: 21600" "http://169.254.169.254/latest/api/token"`',
      'mac_address=`curl -H "X-aws-ec2-metadata-token: $ACCESS_TOKEN" -v http://169.254.169.254/latest/meta-data/mac`',
      'cider_block=`curl -H "X-aws-ec2-metadata-token: $ACCESS_TOKEN" -v http://169.254.169.254/latest/meta-data/network/interfaces/macs/$mac_address/vpc-ipv4-cidr-block`',
      'cider_ip=`echo ${cider_block%/*}`',
      'front_three=`echo ${cider_ip%.*}`',
      'last_value=`echo ${cider_ip##*.}`',
      'value_add_two=`expr $last_value + 2`',
      'dns_address=$front_three.$value_add_two',
      `sed -i 's/$DNS_ADDRESS/'$dns_address'/' /etc/nginx/conf.d/default.conf`,
      `sed -i 's/$ES_endpoint/${this.openSearchEndPoint}/' /etc/nginx/conf.d/default.conf`,
      `sed -i 's/$cognito_host/${this.cognitoEndpoint}/' /etc/nginx/conf.d/default.conf`,
      `sed -i 's/$SERVER_NAME/${this.customEndpointValue}/' /etc/nginx/conf.d/default.conf`,
      `sed -i 's/$ENGINE_URL/${this.engineURL}/' /etc/nginx/conf.d/default.conf`,
      `sed -i 's/$enable_internal/${this.enableInternal}/' /etc/nginx/conf.d/default.conf`,
      `sed -i 's#/bin.*#service nginx reload >/dev/null 2>\&1#' /etc/logrotate.d/nginx`,
      `chmod a+x /etc/init.d/nginx`,
      `chkconfig --add /etc/init.d/nginx`,
      `chkconfig nginx on`,
      `/etc/init.d/nginx start`
    );

    const ec2LaunchTemplateNetworkInterfaceSetting = [
      {
        DeviceIndex: 0,
        AssociatePublicIpAddress: 'false',
        Groups: [nginxSecurityGroupId.valueAsString],
      },
    ];

    Aspects.of(this).add(
      new InjectEC2LaunchTemplateNetWorkInterfaceSetting(
        ec2LaunchTemplateNetworkInterfaceSetting
      )
    );

    constructFactory(CfnOutput)(this, 'ALB CNAME', {
      value: `${lb.loadBalancerDnsName}`,
      description: 'CNAME for ALB',
    });

    Aspects.of(this).add(new CfnGuardSuppressResourceList({
      "AWS::EC2::SecurityGroupIngress": ["EC2_SECURITY_GROUP_INGRESS_OPEN_TO_WORLD_RULE", "SECURITY_GROUP_INGRESS_CIDR_NON_32_RULE"]
    }))
  }

  private addToParamGroups(label: string, ...param: string[]) {
    this.paramGroups.push({
      Label: { default: label },
      Parameters: param,
    });
  }

  private addToParamLabels(label: string, param: string) {
    this.paramLabels[param] = {
      default: label,
    };
  }
}

class InjectEC2LaunchTemplateNetWorkInterfaceSetting implements IAspect {
  public constructor(private ec2LaunchTemplateNetworkInterfaceSetting: any) {}

  public visit(node: IConstruct): void {
    if (
      node instanceof CfnResource &&
      node.cfnResourceType === 'AWS::EC2::LaunchTemplate'
    ) {
      node.addOverride(
        'Properties.LaunchTemplateData.NetworkInterfaces',
        this.ec2LaunchTemplateNetworkInterfaceSetting
      );
      node.addDeletionOverride(
        'Properties.LaunchTemplateData.SecurityGroupIds'
      );
    }
  }
}
