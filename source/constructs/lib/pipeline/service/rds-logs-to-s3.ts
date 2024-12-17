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

import * as path from 'path';
import {
  Aws,
  CfnCondition,
  Fn,
  Duration,
  aws_iam as iam,
  aws_s3 as s3,
  aws_lambda as lambda,
  SymlinkFollowMode,
  aws_ssm as ssm,
  aws_dynamodb as ddb,
} from 'aws-cdk-lib';
import { Rule, Schedule, RuleTargetInput } from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import { Construct } from 'constructs';
import { DEFAULTS } from '../../util/stack-helper';

export interface Props {
  dbRoleArn: string;
  dbIdentifier: string;
  bucketName: string;
  bucketPrefix: string;
}

export class RDSLogsToS3 extends Construct {
  constructor(scope: Construct, id: string, props: Props) {
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
        effect: iam.Effect.ALLOW,
        actions: [
          'rds:DownloadDBLogFilePortion',
          'rds:DescribeDBInstances',
          'rds:DescribeDBLogFiles',
          'rds:DescribeDBClusters',
        ],
        resources: [
          `arn:${Aws.PARTITION}:rds:${Aws.REGION}:${Aws.ACCOUNT_ID}:cluster:*`,
          `arn:${Aws.PARTITION}:rds:${Aws.REGION}:${Aws.ACCOUNT_ID}:db:*`,
        ],
      })
    );

    const isCrossAccount = new CfnCondition(this, 'IsCrossAccount', {
      expression: Fn.conditionNot(Fn.conditionEquals(props.dbRoleArn, '')),
    });
    const policy = new iam.CfnPolicy(this, 'AssumeRole', {
      policyName: `${Aws.STACK_NAME}-AssumeRole`,
      policyDocument: {
        Version: '2012-10-17',
        Statement: [
          {
            Effect: 'Allow',
            Action: ['sts:AssumeRole'],
            Resource: [props.dbRoleArn],
          },
        ],
      },
      roles: [connector.role!.roleName],
    });
    policy.cfnOptions.condition = isCrossAccount;

    const rule = new Rule(this, 'ScheduleRule', {
      schedule: Schedule.expression('rate(1 minute)'),
    });

    const bucket = s3.Bucket.fromBucketName(this, 'Bucket', props.bucketName);
    bucket.grantWrite(connector);

    rule.addTarget(
      new targets.LambdaFunction(connector, {
        event: RuleTargetInput.fromObject({
          metaName: Aws.STACK_ID,
          source: {
            type: 'rds',
            context: {
              DBIdentifiers: props.dbIdentifier,
              role: props.dbRoleArn,
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
