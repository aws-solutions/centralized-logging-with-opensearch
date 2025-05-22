// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { Stack, StackProps, CfnParameter, Aspects } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { MicroBatchStack } from './services/amazon-services-stack';
import { CfnGuardSuppressResourceList } from '../../util/add-cfn-guard-suppression';

const { VERSION } = process.env;

export interface MicroBatchMainProps extends StackProps {
  solutionName: string;
  solutionDesc: string;
  solutionId: string;
  stackPrefix: string;
  existingVPC?: boolean;
}

export class MicroBatchMainStack extends Stack {
  private paramGroups: any[] = [];
  private paramLabels: any = {};

  constructor(scope: Construct, id: string, props: MicroBatchMainProps) {
    super(scope, id, props);

    let solutionName = props.solutionName;
    let solutionDesc = props.solutionDesc;
    let solutionId = props.solutionId;
    let stackPrefix = props.stackPrefix;

    this.templateOptions.description = `(${solutionId}-cla) - ${solutionDesc} Solution. Template version ${VERSION}`;

    const emailAddressParameter = new CfnParameter(this, 'emailAddress', {
      type: 'String',
      description: 'The email address of Admin user',
      allowedPattern:
        '\\w[-\\w.+]*@([A-Za-z0-9][-A-Za-z0-9]+\\.)+[A-Za-z]{2,14}',
    });

    emailAddressParameter.overrideLogicalId('emailAddress');
    this.paramLabels[emailAddressParameter.logicalId] = {
      default: 'Email Address',
    };

    this.paramGroups.push({
      Label: { default: 'Notification' },
      Parameters: [emailAddressParameter.logicalId],
    });

    let vpc = undefined;
    let privateSubnets = undefined;
    let CMKArn = undefined;

    if (props?.existingVPC) {
      const vpcId = new CfnParameter(this, 'vpcId', {
        description: 'Select a VPC ID. e.g. vpc-bef13dc7',
        default: '',
        type: 'AWS::EC2::VPC::Id',
      });
      vpcId.overrideLogicalId('vpcId');
      this.paramLabels[vpcId.logicalId] = { default: 'VPC Id' };

      const privateSubnetIds = new CfnParameter(this, 'privateSubnets', {
        description:
          'Private Subnet IDs in the selected VPC. Please provide two subnets at least delimited by comma, e.g. subnet-97bfc4cd,subnet-7ad7de32. The subnets must have routes to an NAT gateway.',
        type: 'List<AWS::EC2::Subnet::Id>',
      });
      privateSubnetIds.overrideLogicalId('privateSubnets');
      this.paramLabels[privateSubnetIds.logicalId] = {
        default: 'Private Subnet IDs',
      };

      this.paramGroups.push({
        Label: { default: 'Existing VPC Info' },
        Parameters: [vpcId.logicalId, privateSubnetIds.logicalId],
      });

      vpc = vpcId.valueAsString;
      privateSubnets = privateSubnetIds.valueAsList;

      const customerManagedKeyArn = new CfnParameter(this, 'keyArn', {
        type: 'String',
        description: 'the ARN of an existing KMS key.',
        allowedPattern:
          '^arn:(aws|aws-cn):kms:(\\w{2}-\\w{4,9}-\\d{1}):(\\d{12}):key\\/(.*)',
      });

      customerManagedKeyArn.overrideLogicalId('keyArn');
      this.paramLabels[customerManagedKeyArn.logicalId] = {
        default: 'Customer-managed key ARN',
      };

      this.paramGroups.push({
        Label: { default: 'Security' },
        Parameters: [customerManagedKeyArn.logicalId],
      });

      CMKArn = customerManagedKeyArn.valueAsString;
    }

    const SESStateParameter = new CfnParameter(this, 'SESState', {
      type: 'String',
      description:
        'Whether to enable the Amazon Simple Email Service (SES) to send emails, make sure your region supports SES.',
      default: 'ENABLED',
      allowedValues: ['ENABLED', 'DISABLED'],
    });

    SESStateParameter.overrideLogicalId('SESState');
    this.paramLabels[SESStateParameter.logicalId] = {
      default: 'Whether to enable Amazon Simple Email Service',
    };

    this.paramGroups.push({
      Label: { default: 'Additional Services' },
      Parameters: [SESStateParameter.logicalId],
    });

    this.templateOptions.metadata = {
      'AWS::CloudFormation::Interface': {
        ParameterGroups: this.paramGroups,
        ParameterLabels: this.paramLabels,
      },
    };

    /* NOSONAR */ new MicroBatchStack(this, 'MicroBatchStack', {
      solutionId: solutionId,
      solutionName: solutionName,
      stackPrefix: stackPrefix,
      emailAddress: emailAddressParameter.valueAsString,
      vpc: vpc,
      privateSubnets: privateSubnets,
      CMKArn: CMKArn,
      SESState: SESStateParameter.valueAsString,
    });

    Aspects.of(this).add(new CfnGuardSuppressResourceList({
      "AWS::Logs::LogGroup": ["CLOUDWATCH_LOG_GROUP_ENCRYPTED"] // Using service default encryption https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/data-protection.html
    }))
  }
}
