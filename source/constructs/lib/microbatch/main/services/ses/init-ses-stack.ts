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
import { Fn, CfnCondition, aws_ses as ses } from "aws-cdk-lib";

export interface  InitSESProps {
  readonly solutionId: string;
  readonly emailAddress: string;
  readonly SESEmailTemplate: string;
  readonly state: string;
}

export class InitSESStack extends Construct {
    readonly microBatchSendEmailTemplate: ses.CfnTemplate;
    readonly microBatchSESIdentity: ses.EmailIdentity;
    
    constructor(scope: Construct, id: string, props: InitSESProps) {
      super(scope, id);

      let emailAddress = props.emailAddress;
      let SESEmailTemplate = props.SESEmailTemplate;
      let state = props.state;
      const fs = require('fs');

      const SESStateCondition = new CfnCondition(this, 'SESStateCondition', {
        expression: Fn.conditionEquals(state, 'ENABLED'),
      });

      this.microBatchSendEmailTemplate = new ses.CfnTemplate(this, 'SendEmailTemplate', {
        template: {
          subjectPart: "[Notification] {{stateMachine.name}} task {{stateMachine.status}} to execute.",
          htmlPart: fs.readFileSync(__dirname + '/templates/sendemail.template', 'utf8'),
          templateName: SESEmailTemplate,
          textPart: 'Best regards',
        },
      });

      this.microBatchSendEmailTemplate.overrideLogicalId("SendEmailTemplate");

      this.microBatchSendEmailTemplate.cfnOptions.condition = SESStateCondition;

      this.microBatchSESIdentity = new ses.EmailIdentity(this, 'SimpleEmailServiceIdentity', {
        identity: ses.Identity.email(emailAddress),
      });

      // Override the logical ID
      const cfnMicroBatchSESIdentity= this.microBatchSESIdentity.node.defaultChild as ses.CfnEmailIdentity;
      cfnMicroBatchSESIdentity.overrideLogicalId("SimpleEmailServiceIdentity");

      (this.microBatchSESIdentity.node.defaultChild as ses.CfnEmailIdentity).cfnOptions.condition = SESStateCondition;

    }
}

