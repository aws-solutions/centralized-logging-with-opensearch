// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import * as path from 'path';
import {
  CfnCondition,
  Fn,
  Duration,
  Aws,
  aws_s3 as s3,
  aws_iam as iam,
  aws_ssm as ssm,
  aws_lambda as lambda,
  aws_dynamodb as ddb,
  CfnParameter,
  SymlinkFollowMode,
  aws_events_targets as targets,
} from 'aws-cdk-lib';
import { Rule, Schedule, RuleTargetInput } from 'aws-cdk-lib/aws-events';
import { Construct } from 'constructs';
import { DEFAULTS } from '../../util/stack-helper';

export interface WAFSampledStackProps {
  readonly interval: CfnParameter;

  /**
   * The assume role of log source account
   * @default - None.
   */
  readonly logSourceAccountAssumeRole: string;

  /**
   * The name list of WAF ACL
   * @default - None.
   */

  webAclNames: string;
  scope: string;
  bucketName: string;
  bucketPrefix: string;

  readonly solutionId: string;
  readonly stackPrefix: string;
}

export class WAFSampledStack extends Construct {
  constructor(scope: Construct, id: string, props: WAFSampledStackProps) {
    super(scope, id);

    const microBatchStackName = ssm.StringParameter.fromStringParameterName(
      this,
      'MicroBatchStackName',
      '/MicroBatch/StackName'
    ).stringValue;

    const metadataTableArn = Fn.importValue(
      `${microBatchStackName}::MetadataTableArn`
    );

    const metadataTable = ddb.Table.fromTableArn(
      this,
      'MetadataTable',
      metadataTableArn
    );

    const microBatchLambdaUtilsLayerArn =
      ssm.StringParameter.fromStringParameterName(
        this,
        'SSMLambdaUtilsLayerArn',
        '/MicroBatch/LambdaUtilsLayerArn'
      ).stringValue;
    const microBatchLambdaUtilsLayer = lambda.LayerVersion.fromLayerVersionArn(
      this,
      'LambdaUtilsLayer',
      microBatchLambdaUtilsLayerArn
    );

    const connector = new lambda.Function(this, 'Connector', {
      code: lambda.AssetCode.fromAsset(
        path.join(__dirname, '../../../lambda/microbatch/connector'),
        { followSymlinks: SymlinkFollowMode.ALWAYS }
      ),
      runtime: lambda.Runtime.PYTHON_3_11,
      handler: 'lambda_function.lambda_handler',
      timeout: Duration.minutes(15),
      memorySize: 128,
      architecture: lambda.Architecture.X86_64,
      layers: [microBatchLambdaUtilsLayer],
      environment: {
        SOLUTION_VERSION: DEFAULTS.VERSION,
        SOLUTION_ID: DEFAULTS.SOLUTION_ID,
        META_TABLE_NAME: metadataTable.tableName,
      },
      description: `${Aws.STACK_NAME} - Lambda function to collect rds logs to logging s3 bucket.`,
    });

    connector.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['dynamodb:GetItem', 'dynamodb:UpdateItem'],
        resources: [metadataTable.tableArn],
      })
    );
    connector.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['kms:GenerateDataKey*', 'kms:Decrypt', 'kms:Encrypt'],
        resources: [
          `arn:${Aws.PARTITION}:kms:${Aws.REGION}:${Aws.ACCOUNT_ID}:key/*`,
        ],
      })
    );

    connector.addToRolePolicy(
      new iam.PolicyStatement({
        actions: [
          'wafv2:ListWebACLs',
          'wafv2:GetSampledRequests',
          'wafv2:GetWebACL',
        ],
        resources: ['*'],
      })
    );

    // Create the policy and role for the Lambda to create and delete CloudWatch Log Group Subscription Filter with cross-account scenario
    const isCrossAccount = new CfnCondition(this, 'IsCrossAccount', {
      expression: Fn.conditionNot(
        Fn.conditionEquals(props.logSourceAccountAssumeRole, '')
      ),
    });

    const policy = new iam.CfnPolicy(this, 'AssumeRole', {
      policyName: `${Aws.STACK_NAME}-AssumeRole`,
      policyDocument: {
        Version: '2012-10-17',
        Statement: [
          {
            Effect: 'Allow',
            Action: ['sts:AssumeRole'],
            Resource: [props.logSourceAccountAssumeRole],
          },
        ],
      },
      roles: [connector.role!.roleName],
    });
    policy.cfnOptions.condition = isCrossAccount;

    const rule = new Rule(this, 'ScheduleRule', {
      schedule: Schedule.rate(Duration.minutes(props.interval.valueAsNumber)),
    });

    const bucket = s3.Bucket.fromBucketName(this, 'Bucket', props.bucketName);
    bucket.grantWrite(connector);

    rule.addTarget(
      new targets.LambdaFunction(connector, {
        event: RuleTargetInput.fromObject({
          metaName: Aws.STACK_ID,
          source: {
            type: 'wafsampled',
            context: {
              webAclNames: props.webAclNames,
              scope: props.scope,
              interval: props.interval.valueAsNumber,
              role: props.logSourceAccountAssumeRole,
            },
          },
          sink: {
            type: 's3',
            context: {
              bucket: props.bucketName,
              prefix: props.bucketPrefix,
            },
          },
        }),
      })
    );
  }
}
