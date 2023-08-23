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

import * as path from 'path';
import {
  StackProps,
  aws_sqs as sqs,
  aws_iam as iam,
  aws_s3 as s3,
  aws_ec2 as ec2,
  aws_ecs as ecs,
  aws_s3_notifications as s3n,
  custom_resources as cr,
  aws_lambda as lambda,
  Aws,
  Aspects,
  IAspect,
  Duration,
  CustomResource,
  CfnResource,
  CfnCondition,
  Fn,
} from 'aws-cdk-lib';
import * as logs from 'aws-cdk-lib/aws-logs';
import { Construct, IConstruct } from 'constructs';
import { SolutionStack } from '../pipeline/common/solution-stack';

const { VERSION } = process.env;
export interface MigrationStackProps extends StackProps {
  readonly tag?: string;
  readonly solutionId?: string;
  readonly solutionDesc?: string;
}

export class MigrationStack extends SolutionStack {
  public srcStackNameParam = this.newParam('SourceStackName', {
    type: 'String',
    allowedPattern: '^.+$',
  });
  public destStackNameParam = this.newParam('DestinationStackName', {
    type: 'String',
    allowedPattern: '^.+$',
  });

  constructor(scope: Construct, id: string, props: MigrationStackProps) {
    super(scope, id, props);

    // If in China Region, disable install latest aws-sdk
    const isCN = new CfnCondition(this, 'isCN', {
      expression: Fn.conditionEquals(Aws.PARTITION, 'aws-cn'),
    });
    const isInstallLatestAwsSdk = Fn.conditionIf(
      isCN.logicalId,
      'false',
      'true'
    ).toString();

    Aspects.of(this).add(
      new InjectCustomerResourceConfig(isInstallLatestAwsSdk)
    );

    let solutionDesc =
      props.solutionDesc || 'Centralized Logging with OpenSearch';
    let solutionId = props.solutionId || 'SO8025';

    this.setDescription(
      `(${solutionId}-${props.tag}) - ${solutionDesc} - Migration from v1 to v2 Stack Template - Version ${VERSION}`
    );

    new CustomResource(this, 'MigrationCR', {
      serviceToken: new Migration(
        this,
        'Migration',
        this.srcStackNameParam.valueAsString,
        this.destStackNameParam.valueAsString
      ).provider.serviceToken,
      resourceType: 'Custom::Migration',
      properties: {
        SourceStackName: this.srcStackNameParam.valueAsString,
        DestinationStackName: this.destStackNameParam.valueAsString,
        BuildTime: Date.now(),
      },
    });
  }

  protected enable(param: { construct: IConstruct; if: CfnCondition }) {
    Aspects.of(param.construct).add(new InjectCondition(param.if));
  }
}

class InjectCondition implements IAspect {
  public constructor(private condition: CfnCondition) {}

  public visit(node: IConstruct): void {
    if (node instanceof CfnResource) {
      node.cfnOptions.condition = this.condition;
    }
  }
}

class Migration extends Construct {
  public readonly provider: cr.Provider;

  constructor(
    scope: Construct,
    id: string,
    srcStackName: string,
    destStackName: string
  ) {
    super(scope, id);

    this.provider = new cr.Provider(this, 'MigrationProvider', {
      onEventHandler: new lambda.Function(this, 'MigrationOnEvent', {
        code: lambda.Code.fromAsset(path.join(__dirname, '../../migration')),
        runtime: lambda.Runtime.PYTHON_3_9,
        timeout: Duration.minutes(5),
        logRetention: logs.RetentionDays.ONE_MONTH,
        handler: 'main.on_event',
        environment: {},
        initialPolicy: [
          new iam.PolicyStatement({
            actions: ['cloudformation:List*'],
            resources: [
              `arn:${Aws.PARTITION}:cloudformation:*:${Aws.ACCOUNT_ID}:stack/${srcStackName}/*`,
              `arn:${Aws.PARTITION}:cloudformation:*:${Aws.ACCOUNT_ID}:stack/${destStackName}/*`,
              `arn:${Aws.PARTITION}:cloudformation:*:${Aws.ACCOUNT_ID}:stack/CL*/*`,
            ],
          }),
          new iam.PolicyStatement({
            actions: [
              'dynamodb:Scan*',
              'dynamodb:BatchWriteItem',
              'dynamodb:GetItem',
              'dynamodb:PutItem',
            ],
            resources: [
              `arn:${Aws.PARTITION}:dynamodb:*:${Aws.ACCOUNT_ID}:*-*-*`,
            ],
          }),
          new iam.PolicyStatement({
            actions: [
              'iam:GetPolicy',
              'iam:GetPolicyVersion',
              'iam:SetDefaultPolicyVersion',
              'iam:ListPolicyVersions',
              'iam:DeletePolicyVersion',
              'iam:CreatePolicyVersion',
            ],
            resources: [
              `arn:${Aws.PARTITION}:iam::${Aws.ACCOUNT_ID}:policy/*-*-*`,
            ],
          }),
          new iam.PolicyStatement({
            actions: ['s3:ListBucket', 's3:Get*', 's3:Put*'],
            resources: [
              `arn:${Aws.PARTITION}:s3:::*-*-*`,
              `arn:${Aws.PARTITION}:s3:::*-*-*/*`,
            ],
          }),
        ],
      }),
    });
  }
}

class InjectCustomerResourceConfig implements IAspect {
  public constructor(private isInstallLatestAwsSdk: string) {}

  public visit(node: IConstruct): void {
    if (node instanceof CfnResource && node.cfnResourceType === 'Custom::AWS') {
      node.addPropertyOverride(
        'InstallLatestAwsSdk',
        this.isInstallLatestAwsSdk
      );
    }
  }
}
