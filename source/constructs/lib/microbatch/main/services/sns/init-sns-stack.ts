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
  Aws,
  CfnOutput,
  aws_sns as sns,
  aws_sns_subscriptions as subscriptions,
} from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { InitKMSStack } from '../kms/init-kms-stack';

export interface InitSNSProps {
  readonly solutionId: string;
  readonly emailAddress: string;
  readonly microBatchKMSStack: InitKMSStack;
}

export class InitSNSStack extends Construct {
  readonly SNSReceiveStatesFailedTopic: sns.Topic;
  readonly SNSSendEmailTopic: sns.Topic;

  constructor(scope: Construct, id: string, props: InitSNSProps) {
    super(scope, id);

    let emailAddress = props.emailAddress;
    let microBatchKMSStack = props.microBatchKMSStack;

    this.SNSReceiveStatesFailedTopic = new sns.Topic(
      this,
      'ReceiveStatesFailedTopic',
      {
        topicName: `${Aws.STACK_NAME.substring(0, 30)}-ReceiveStatesFailedTopic`,
        masterKey: microBatchKMSStack.encryptionKey,
      }
    );

    // Override the logical ID
    const cfnSNSReceiveStatesFailedTopic = this.SNSReceiveStatesFailedTopic.node
      .defaultChild as sns.CfnTopic;
    cfnSNSReceiveStatesFailedTopic.overrideLogicalId(
      'ReceiveStatesFailedTopic'
    );

    this.SNSSendEmailTopic = new sns.Topic(this, 'SendEmailTopic', {
      topicName: `${Aws.STACK_NAME.substring(0, 30)}-SendEmailTopic`,
      masterKey: microBatchKMSStack.encryptionKey,
    });

    // Override the logical ID
    const cfnSNSSendEmailTopic = this.SNSSendEmailTopic.node
      .defaultChild as sns.CfnTopic;
    cfnSNSSendEmailTopic.overrideLogicalId('SendEmailTopic');

    this.SNSSendEmailTopic.addSubscription(
      new subscriptions.EmailSubscription(emailAddress)
    );

    new CfnOutput(this, 'SendEmailTopicArn', {
      description: 'Send Email Topic Arn',
      value: this.SNSSendEmailTopic.topicArn,
      exportName: `${Aws.STACK_NAME}::SendEmailTopicArn`,
    }).overrideLogicalId('SendEmailTopicArn');
  }
}
