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
import {
  Aws,
  aws_iam as iam,
  aws_s3 as s3,
  Aspects,
} from 'aws-cdk-lib';
import { NagSuppressions } from 'cdk-nag';
import { Construct } from 'constructs';
import { AddCfnNagSuppressRules } from "../pipeline/common/solution-stack";


export interface Ec2IamInstanceProfileProps {
  readonly loggingBucket: s3.IBucket;
  readonly accountId: string;
  readonly stackPrefix: string;
}

/**
 * Entrance for All EC2 IAM instance profile related resources.
 */
export class Ec2IamInstanceProfileStack extends Construct {
  readonly cfnEc2IamInstanceProfile: iam.CfnInstanceProfile;
  readonly Ec2IamInstanceProfileRole: iam.Role;
  readonly Ec2IamInstanceProfilePolicy: iam.ManagedPolicy;

  constructor(scope: Construct, id: string, props: Ec2IamInstanceProfileProps) {
    super(scope, id);

    const loggingBucket = props.loggingBucket;
    const accountId = props.accountId;
    const stackPrefix = props.stackPrefix;

    // Create an EC2 IAM instance profile
    this.Ec2IamInstanceProfilePolicy = new iam.ManagedPolicy(this, 'Ec2IamInstanceProfilePolicy', {
      statements: [
        new iam.PolicyStatement({
          sid: "AccessLoggingBucket",
          effect: iam.Effect.ALLOW,
          actions: [
            "s3:GetObject",
          ],
          resources: [`${loggingBucket.bucketArn}/*`],
        }),
        new iam.PolicyStatement({
          sid: "AssumeRoleInMainAccount",
          effect: iam.Effect.ALLOW,
          actions: [
            "sts:AssumeRole",
          ],
          resources: [`arn:${Aws.PARTITION}:iam::${accountId}:role/${stackPrefix}-buffer-access*`],
        }),
        new iam.PolicyStatement({
          sid: "AssumeRoleInMainAccountCWL",
          effect: iam.Effect.ALLOW,
          actions: [
            "sts:AssumeRole",
          ],
          resources: [`arn:${Aws.PARTITION}:iam::${accountId}:role/${stackPrefix}-cloudwatch-access*`],
        }),
        new iam.PolicyStatement({
          sid: "SSM",
          effect: iam.Effect.ALLOW,
          actions: [
            "ssm:DescribeInstanceProperties",
            "ssm:UpdateInstanceInformation",
          ],
          resources: ["*"],
        }),
        new iam.PolicyStatement({
          sid: "EC2Messages",
          effect: iam.Effect.ALLOW,
          actions: [
            "ec2messages:GetEndpoint",
            "ec2messages:AcknowledgeMessage",
            "ec2messages:SendReply",
            "ec2messages:GetMessages"
          ],
          resources: ["*"],
        }),
      ]
    });

    // Override the logical ID
    const cfnEc2IamInstanceProfilePolicy = this.Ec2IamInstanceProfilePolicy.node.defaultChild as iam.CfnManagedPolicy;
    cfnEc2IamInstanceProfilePolicy.overrideLogicalId("Ec2IamInstanceProfilePolicy");

    NagSuppressions.addResourceSuppressions(this.Ec2IamInstanceProfilePolicy, [
      {
        id: "AwsSolutions-IAM5",
        reason: "The managed policy needs to use any resources.",
      },
    ]);

    Aspects.of(this.Ec2IamInstanceProfilePolicy).add(
      new AddCfnNagSuppressRules([
        {
          id: 'W13',
          reason: "The managed policy needs to use any resources.",
        },
      ])
    );

    this.Ec2IamInstanceProfileRole = new iam.Role(this, 'Ec2IamInstanceProfileRole', {
      assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
    });

    this.Ec2IamInstanceProfileRole.addManagedPolicy(this.Ec2IamInstanceProfilePolicy);

    const cfnEc2IamInstanceProfileRole = this.Ec2IamInstanceProfileRole.node.defaultChild as iam.CfnRole;
    cfnEc2IamInstanceProfileRole.overrideLogicalId("Ec2IamInstanceProfileRole");

    this.cfnEc2IamInstanceProfile = new iam.CfnInstanceProfile(this, 'Ec2IamInstanceProfile', {
      roles: [this.Ec2IamInstanceProfileRole.roleName],
    });
    this.cfnEc2IamInstanceProfile.overrideLogicalId('Ec2IamInstanceProfile');

  }
}
