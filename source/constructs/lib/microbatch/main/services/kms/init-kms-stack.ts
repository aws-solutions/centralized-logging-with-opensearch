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
  Duration,
  CfnOutput,
  aws_kms as kms,
  RemovalPolicy,
  aws_iam as iam,
  aws_ssm as ssm,
} from 'aws-cdk-lib';
import { Construct } from 'constructs';

export interface InitKMSProps {
  readonly solutionId: string;
  readonly solutionName: string;
  readonly CMKArn?: string;
}

export class InitKMSStack extends Construct {
  readonly encryptionKey: kms.IKey;

  constructor(scope: Construct, id: string, props: InitKMSProps) {
    super(scope, id);

    let solutionName = props.solutionName;

    if (props?.CMKArn) {
      this.encryptionKey = kms.Key.fromKeyArn(
        this,
        'importedCMK',
        props.CMKArn
      );
    } else {
      this.encryptionKey = new kms.Key(this, 'CMK', {
        enabled: true,
        enableKeyRotation: true,
        pendingWindow: Duration.days(7),
        description: `KMS-CMK for ${solutionName}`,
        keySpec: kms.KeySpec.SYMMETRIC_DEFAULT,
        keyUsage: kms.KeyUsage.ENCRYPT_DECRYPT,
        removalPolicy: RemovalPolicy.DESTROY,
        alias: `${solutionName}`,
        policy: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              actions: [
                'kms:CreateGrant',
                'kms:CreateAlias',
                'kms:TagResource',
                'kms:DescribeKey',
                'kms:List*',
                'kms:Get*',
                'kms:PutKeyPolicy',
                'kms:DeleteAlias',
                'kms:EnableKeyRotation',
                'kms:ScheduleKeyDeletion',
                'kms:Decrypt',
                'kms:Encrypt',
                'kms:GenerateDataKey*',
              ],
              resources: ['*'],
              effect: iam.Effect.ALLOW,
              principals: [new iam.AccountRootPrincipal()],
            }),
            new iam.PolicyStatement({
              actions: [
                'kms:GenerateDataKey*',
                'kms:Decrypt',
                'kms:Encrypt',
                'kms:CreateGrant',
                'kms:DescribeKey',
              ],
              resources: ['*'],
              principals: [
                new iam.ServicePrincipal('s3.amazonaws.com'),
                new iam.ServicePrincipal('lambda.amazonaws.com'),
                new iam.ServicePrincipal('sqs.amazonaws.com'),
                new iam.ServicePrincipal('sns.amazonaws.com'),
                new iam.ServicePrincipal('ec2.amazonaws.com'),
                new iam.ServicePrincipal('athena.amazonaws.com'),
                new iam.ServicePrincipal('dynamodb.amazonaws.com'),
                new iam.ServicePrincipal('cloudwatch.amazonaws.com'),
                new iam.ServicePrincipal('glue.amazonaws.com'),
              ],
            }),
          ],
        }),
      });
    }

    const SSMCMKeyArn = new ssm.StringParameter(this, 'SSMCMKeyArn', {
      parameterName: '/MicroBatch/CMKeyArn',
      stringValue: this.encryptionKey.keyArn,
    });

    // Override the logical ID
    const cfnSSMCMKeyArn = SSMCMKeyArn.node.defaultChild as ssm.CfnParameter;
    cfnSSMCMKeyArn.overrideLogicalId('SSMCMKeyArn');

    new CfnOutput(this, 'CMKeyArn', {
      description: 'CMKey Arn',
      value: this.encryptionKey.keyArn,
    }).overrideLogicalId('CMKeyArn');
  }
}
