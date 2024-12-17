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
  CfnResource,
  Stack,
  StackProps,
  CfnMapping,
  CfnOutput,
  CfnCondition,
  CfnParameter,
  Duration,
  RemovalPolicy,
  Fn,
  aws_iam as iam,
  aws_s3 as s3,
  aws_kms as kms,
  Aspects,
  Lazy,
} from 'aws-cdk-lib';
import { Rule, EventBus } from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import { Effect } from 'aws-cdk-lib/aws-iam';
import { CfnDocument } from 'aws-cdk-lib/aws-ssm';
import { NagSuppressions } from 'cdk-nag';
import { Construct } from 'constructs';
import { Ec2IamInstanceProfileStack } from '../api/ec2-iam-instance-profile';
import { UseS3BucketNotificationsWithRetryAspects } from '../util/stack-helper';
const { VERSION } = process.env;

/**
 * cfn-nag suppression rule interface
 */
interface CfnNagSuppressRule {
  readonly id: string;
  readonly reason: string;
}

export function addCfnNagSuppressRules(
  resource: CfnResource,
  rules: CfnNagSuppressRule[]
) {
  resource.addMetadata('cfn_nag', {
    rules_to_suppress: rules,
  });
}

export interface CrossAccountProps extends StackProps {
  solutionName?: string;
  solutionDesc?: string;
  solutionId?: string;
}

export class CrossAccount extends Stack {
  private paramGroups: any[] = [];
  private paramLabels: any = {};

  constructor(scope: Construct, id: string, props: CrossAccountProps) {
    super(scope, id);

    let solutionDesc =
      props.solutionDesc || 'Centralized Logging with OpenSearch';
    let solutionId = props.solutionId || 'SO8025';

    const stackPrefix = 'CL';

    this.templateOptions.description = `(${solutionId}-sub) - ${solutionDesc} - Sub Account Template - Version ${VERSION}`;

    this.templateOptions.metadata = {
      'AWS::CloudFormation::Interface': {
        ParameterGroups: this.paramGroups,
        ParameterLabels: this.paramLabels,
      },
    };

    const parentAccountId = new CfnParameter(this, 'parentAccountId', {
      description: `The Account ID of account where ${solutionDesc} is deployed.`,
      type: 'String',
      allowedPattern: '^\\d{12}$',
      constraintDescription: 'Parent Account Id must be 12 digits',
    });
    this.addToParamLabels('Parent Account Id', parentAccountId.logicalId);

    // Create a default logging bucket
    let loggingBucket: s3.Bucket;
    loggingBucket = new s3.Bucket(this, `${stackPrefix}LoggingBucket`, {
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      accessControl: s3.BucketAccessControl.LOG_DELIVERY_WRITE,
      objectOwnership: s3.ObjectOwnership.BUCKET_OWNER_PREFERRED,
      enforceSSL: true,
      eventBridgeEnabled: true,
      notificationsHandlerRole: new iam.Role(this, 'NotificationRole', {
        assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
        inlinePolicies: {
          notification: new iam.PolicyDocument({
            statements: [
              new iam.PolicyStatement({
                effect: Effect.ALLOW,
                actions: ['s3:GetBucketNotification'],
                resources: [
                  Lazy.string({
                    produce() {
                      return loggingBucket.bucketArn;
                    },
                  }),
                ],
              }),
            ],
          }),
        },
      }),
      lifecycleRules: [
        {
          transitions: [
            {
              storageClass: s3.StorageClass.INTELLIGENT_TIERING,
              transitionAfter: Duration.days(0),
            },
          ],
        },
      ],
    });

    const parentBus = EventBus.fromEventBusArn(
      this,
      'ParentEventBus',
      `arn:${Aws.PARTITION}:events:${Aws.REGION}:${parentAccountId.valueAsString}:event-bus/default`
    );

    /* NOSONAR */ new Rule(this, 'S3EventReplicaRule', {
      eventPattern: {
        source: ['aws.s3', 'clo.aws.s3'],
        detailType: ['Object Created'],
      },
      targets: [new targets.EventBus(parentBus)],
    });

    const elbRootAccountArnTable = new CfnMapping(
      this,
      'ELBRootAccountArnTable',
      {
        mapping: {
          'us-east-1': { elbRootAccountArn: 'arn:aws:iam::127311923021:root' },
          'us-east-2': { elbRootAccountArn: 'arn:aws:iam::033677994240:root' },
          'us-west-1': { elbRootAccountArn: 'arn:aws:iam::027434742980:root' },
          'us-west-2': { elbRootAccountArn: 'arn:aws:iam::797873946194:root' },
          'af-south-1': { elbRootAccountArn: 'arn:aws:iam::098369216593:root' },
          'ca-central-1': {
            elbRootAccountArn: 'arn:aws:iam::985666609251:root',
          },
          'eu-central-1': {
            elbRootAccountArn: 'arn:aws:iam::054676820928:root',
          },
          'eu-west-1': { elbRootAccountArn: 'arn:aws:iam::156460612806:root' },
          'eu-west-2': { elbRootAccountArn: 'arn:aws:iam::652711504416:root' },
          'eu-south-1': { elbRootAccountArn: 'arn:aws:iam::635631232127:root' },
          'eu-west-3': { elbRootAccountArn: 'arn:aws:iam::009996457667:root' },
          'eu-north-1': { elbRootAccountArn: 'arn:aws:iam::897822967062:root' },
          'ap-east-1': { elbRootAccountArn: 'arn:aws:iam::754344448648:root' },
          'ap-northeast-1': {
            elbRootAccountArn: 'arn:aws:iam::582318560864:root',
          },
          'ap-northeast-2': {
            elbRootAccountArn: 'arn:aws:iam::600734575887:root',
          },
          'ap-northeast-3': {
            elbRootAccountArn: 'arn:aws:iam::383597477331:root',
          },
          'ap-southeast-1': {
            elbRootAccountArn: 'arn:aws:iam::114774131450:root',
          },
          'ap-southeast-2': {
            elbRootAccountArn: 'arn:aws:iam::783225319266:root',
          },
          'ap-southeast-3': {
            elbRootAccountArn: 'arn:aws:iam::589379963580:root',
          },
          'ap-south-1': { elbRootAccountArn: 'arn:aws:iam::718504428378:root' },
          'me-south-1': { elbRootAccountArn: 'arn:aws:iam::076674570225:root' },
          'sa-east-1': { elbRootAccountArn: 'arn:aws:iam::507241528517:root' },
          'cn-north-1': {
            elbRootAccountArn: 'arn:aws-cn:iam::638102146993:root',
          },
          'cn-northwest-1': {
            elbRootAccountArn: 'arn:aws-cn:iam::037604701340:root',
          },
        },
      }
    );
    loggingBucket.addToResourcePolicy(
      new iam.PolicyStatement({
        resources: [
          `arn:${Aws.PARTITION}:s3:::${loggingBucket.bucketName}/*`,
          `arn:${Aws.PARTITION}:s3:::${loggingBucket.bucketName}`,
        ],
        actions: ['s3:PutObject'],
        principals: [
          new iam.ArnPrincipal(
            elbRootAccountArnTable.findInMap(Aws.REGION, 'elbRootAccountArn')
          ),
        ],
      })
    );
    loggingBucket.addToResourcePolicy(
      new iam.PolicyStatement({
        resources: [
          `arn:${Aws.PARTITION}:s3:::${loggingBucket.bucketName}/*`,
          `arn:${Aws.PARTITION}:s3:::${loggingBucket.bucketName}`,
        ],
        actions: ['s3:PutObject'],
        principals: [new iam.ServicePrincipal('delivery.logs.amazonaws.com')],
        conditions: {
          StringEquals: {
            's3:x-amz-acl': 'bucket-owner-full-control',
          },
        },
      })
    );
    loggingBucket.addToResourcePolicy(
      new iam.PolicyStatement({
        resources: [
          `arn:${Aws.PARTITION}:s3:::${loggingBucket.bucketName}/*`,
          `arn:${Aws.PARTITION}:s3:::${loggingBucket.bucketName}`,
        ],
        actions: ['s3:GetBucketAcl'],
        principals: [new iam.ServicePrincipal('delivery.logs.amazonaws.com')],
      })
    );
    loggingBucket.addToResourcePolicy(
      new iam.PolicyStatement({
        resources: [
          `arn:${Aws.PARTITION}:s3:::${loggingBucket.bucketName}/*`,
          `arn:${Aws.PARTITION}:s3:::${loggingBucket.bucketName}`,
        ],
        actions: [
          's3:PutBucketNotification',
          's3:GetObjectVersionTagging',
          's3:GetObjectAcl',
          's3:GetBucketObjectLockConfiguration',
          's3:GetObjectVersionAcl',
          's3:GetBucketPolicyStatus',
          's3:GetObjectRetention',
          's3:GetBucketWebsite',
          's3:GetObjectAttributes',
          's3:GetObjectLegalHold',
          's3:GetBucketNotification',
          's3:GetReplicationConfiguration',
          's3:GetObject',
          's3:GetAnalyticsConfiguration',
          's3:GetObjectVersionForReplication',
          's3:GetBucketTagging',
          's3:GetBucketLogging',
          's3:GetAccelerateConfiguration',
          's3:GetObjectVersionAttributes',
          's3:GetBucketPolicy',
          's3:GetEncryptionConfiguration',
          's3:GetObjectVersionTorrent',
          's3:GetBucketRequestPayment',
          's3:GetObjectTagging',
        ],
        effect: iam.Effect.ALLOW,
        principals: [new iam.AccountPrincipal(parentAccountId.valueAsString)],
      })
    );

    loggingBucket.addToResourcePolicy(
      new iam.PolicyStatement({
        actions: ['s3:*'],
        effect: iam.Effect.DENY,
        resources: [
          `arn:${Aws.PARTITION}:s3:::${loggingBucket.bucketName}/*`,
          `arn:${Aws.PARTITION}:s3:::${loggingBucket.bucketName}`,
        ],
        conditions: {
          ['Bool']: {
            'aws:SecureTransport': 'false',
          },
        },
        principals: [new iam.AnyPrincipal()],
      })
    );
    NagSuppressions.addResourceSuppressions(loggingBucket, [
      {
        id: 'AwsSolutions-S1',
        reason: 'this is a logging bucket hence no access logging required',
      },
    ]);

    const cfnLoggingBucket = loggingBucket.node.defaultChild as s3.CfnBucket;
    addCfnNagSuppressRules(cfnLoggingBucket, [
      {
        id: 'W35',
        reason: 'this is a logging bucket hence no access logging required',
      },
      {
        id: 'W51',
        reason: "THis Bucket doesn't need policy",
      },
    ]);

    // Init EC2 IAM instance profile resource
    const Ec2IamInstanceProfile = new Ec2IamInstanceProfileStack(
      this,
      'Ec2IamInstanceProfile',
      {
        loggingBucket: loggingBucket,
        accountId: parentAccountId.valueAsString,
        stackPrefix: stackPrefix,
      }
    );

    // Create an IAM role for Main stack assuming
    const crossAccountRole = new iam.Role(this, 'CrossAccountRole', {
      assumedBy: new iam.AccountPrincipal(parentAccountId.valueAsString),
    });
    const trustPolicy = new iam.PolicyDocument({
      statements: [
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          principals: [
            new iam.AccountPrincipal(parentAccountId.valueAsString),
            new iam.ServicePrincipal('lambda.amazonaws.com'),
          ],
          actions: ['sts:AssumeRole'],
          conditions: {
            'ForAllValues:StringLike': {
              'aws:SourceArn': [
                `arn:${Aws.PARTITION}:iam::${parentAccountId.valueAsString}:assumed-role/*APIResource*`,
                `arn:${Aws.PARTITION}:iam::${parentAccountId.valueAsString}:assumed-role/*APIInstance*`,
                `arn:${Aws.PARTITION}:iam::${parentAccountId.valueAsString}:assumed-role/*APISvcPipeline*`,
                `arn:${Aws.PARTITION}:iam::${parentAccountId.valueAsString}:assumed-role/*APIAppPipeline*`,
                `arn:${Aws.PARTITION}:iam::${parentAccountId.valueAsString}:assumed-role/*APIAppLogIngestion*`,
              ],
            },
          },
        }),
      ],
    });

    const cfnRole = crossAccountRole.node.defaultChild as iam.CfnRole;
    cfnRole.assumeRolePolicyDocument = trustPolicy;

    const newKMSKey = new kms.Key(this, `SQS-CMK`, {
      removalPolicy: RemovalPolicy.DESTROY,
      pendingWindow: Duration.days(7),
      description: 'KMS-CMK for encrypting the objects in SQS',
      enableKeyRotation: true,
      policy: new iam.PolicyDocument({
        statements: [
          new iam.PolicyStatement({
            actions: [
              'kms:CreateKey',
              'kms:CreateAlias',
              'kms:CreateCustomKeyStore',
              'kms:DescribeKey',
              'kms:DescribeCustomKeyStores',
              'kms:EnableKey',
              'kms:EnableKeyRotation',
              'kms:ListAliases',
              'kms:ListKeys',
              'kms:ListGrants',
              'kms:ListKeyPolicies',
              'kms:ListResourceTags',
              'kms:PutKeyPolicy',
              'kms:UpdateAlias',
              'kms:UpdateCustomKeyStore',
              'kms:UpdateKeyDescription',
              'kms:UpdatePrimaryRegion',
              'kms:RevokeGrant',
              'kms:GetKeyPolicy',
              'kms:GetParametersForImport',
              'kms:GetKeyRotationStatus',
              'kms:GetPublicKey',
              'kms:ScheduleKeyDeletion',
              'kms:GenerateDataKey',
              'kms:TagResource',
              'kms:UntagResource',
              'kms:Decrypt',
              'kms:Encrypt',
            ],
            resources: ['*'],
            effect: iam.Effect.ALLOW,
            principals: [new iam.AccountRootPrincipal()],
          }),
          new iam.PolicyStatement({
            actions: ['kms:GenerateDataKey*', 'kms:Decrypt', 'kms:Encrypt'],
            resources: ['*'], // support app log from s3 by not limiting the resource
            principals: [
              new iam.ServicePrincipal('s3.amazonaws.com'),
              new iam.ServicePrincipal('lambda.amazonaws.com'),
              new iam.ServicePrincipal('ec2.amazonaws.com'),
              new iam.ServicePrincipal('sqs.amazonaws.com'),
              new iam.ServicePrincipal('sns.amazonaws.com'),
              new iam.ServicePrincipal('cloudwatch.amazonaws.com'),
            ],
          }),
        ],
      }),
    });

    const crossAccountPolicy = new iam.Policy(this, 'CrossAccountPolicy', {
      statements: [
        // Associate IAM instance profile to EC2
        new iam.PolicyStatement({
          sid: 'AssociateIAMInstanceProfileToEc2',
          effect: iam.Effect.ALLOW,
          actions: [
            'ec2:DescribeIamInstanceProfileAssociations',
            'ec2:AssociateIamInstanceProfile',
          ],
          resources: ['*'],
        }),
        // Attach Policy to Role
        new iam.PolicyStatement({
          sid: 'AttachPolicyToInstanceProfile1',
          effect: iam.Effect.ALLOW,
          actions: ['iam:AttachRolePolicy'],
          resources: [
            `arn:${Aws.PARTITION}:iam::${Aws.ACCOUNT_ID}:role/*`,
            `arn:${Aws.PARTITION}:iam::${Aws.ACCOUNT_ID}:instance-profile/*`,
          ],
          conditions: {
            StringEquals: {
              'iam:PolicyARN':
                Ec2IamInstanceProfile.Ec2IamInstanceProfilePolicy
                  .managedPolicyArn,
            },
          },
        }),
        new iam.PolicyStatement({
          sid: 'AttachPolicyToInstanceProfile2',
          effect: iam.Effect.ALLOW,
          actions: [
            'iam:AddRoleToInstanceProfile',
            'iam:GetInstanceProfile',
            'iam:ListAttachedRolePolicies',
          ],
          resources: [
            `arn:${Aws.PARTITION}:iam::${Aws.ACCOUNT_ID}:role/*`,
            `arn:${Aws.PARTITION}:iam::${Aws.ACCOUNT_ID}:instance-profile/*`,
          ],
        }),
        // PassRole For Ec2IamInstanceProfileRole
        new iam.PolicyStatement({
          sid: 'PassRoleForEc2IamInstanceProfileRole',
          effect: iam.Effect.ALLOW,
          actions: ['iam:PassRole'],
          resources: [
            Ec2IamInstanceProfile.Ec2IamInstanceProfileRole.roleArn,
            Ec2IamInstanceProfile.cfnEc2IamInstanceProfile.attrArn,
          ],
        }),
        // AWS Service Log Policy for S3 Ingestion
        new iam.PolicyStatement({
          sid: 'AWSServiceLogPolicyforS3Ingestion0',
          effect: iam.Effect.ALLOW,
          actions: [
            's3:GetObject',
            's3:PutBucketNotification',
            's3:ListAllMyBuckets',
            's3:PutBucketLogging',
            's3:GetBucketLogging',
            's3:ListBucket',
            's3:GetBucketNotification',
            's3:GetBucketLocation',
            's3:GetBucketPolicy',
            's3:PutBucketPolicy',
            's3:DeleteBucketPolicy',
          ],
          resources: [`arn:${Aws.PARTITION}:s3:::*`],
        }),
        // AWS Service Log Policy for CloudTrail Ingestion
        new iam.PolicyStatement({
          sid: 'AWSServiceLogPolicyforCloudTrailIngestion0',
          effect: iam.Effect.ALLOW,
          actions: ['cloudtrail:GetTrail', 'cloudtrail:ListTrails'],
          resources: ['*'],
        }),
        new iam.PolicyStatement({
          sid: 'AWSServiceLogPolicyforCloudTrailIngestion1',
          effect: iam.Effect.ALLOW,
          actions: ['cloudtrail:UpdateTrail'],
          resources: [
            `arn:${Aws.PARTITION}:cloudtrail:*:${Aws.ACCOUNT_ID}:trail/*`,
          ],
        }),
        // AWS Service Log Policy for RDS Ingestion
        new iam.PolicyStatement({
          sid: 'AWSServiceLogPolicyforRDSIngestion0',
          effect: iam.Effect.ALLOW,
          actions: ['rds:DescribeDBInstances', 'rds:DescribeDBClusters'],
          resources: [
            `arn:${Aws.PARTITION}:rds:*:${Aws.ACCOUNT_ID}:db:*`,
            `arn:${Aws.PARTITION}:rds:*:${Aws.ACCOUNT_ID}:cluster:*`,
          ],
        }),
        // AWS Service Log Policy for ELB Ingestion
        new iam.PolicyStatement({
          sid: 'AWSServiceLogPolicyforELBIngestion0',
          effect: iam.Effect.ALLOW,
          actions: ['elasticloadbalancing:ModifyLoadBalancerAttributes'],
          resources: [
            `arn:${Aws.PARTITION}:elasticloadbalancing:*:${Aws.ACCOUNT_ID}:loadbalancer/*`,
          ],
        }),
        new iam.PolicyStatement({
          sid: 'AWSServiceLogPolicyforELBIngestion1',
          effect: iam.Effect.ALLOW,
          actions: [
            'elasticloadbalancing:DescribeLoadBalancerAttributes',
            'elasticloadbalancing:DescribeLoadBalancers',
          ],
          resources: ['*'],
        }),
        // AWS Service Log Policy for VPCFlow Ingestion
        new iam.PolicyStatement({
          sid: 'AWSServiceLogPolicyforVPCFlowIngestion0',
          effect: iam.Effect.ALLOW,
          actions: ['ec2:DescribeVpcs', 'ec2:DescribeFlowLogs'],
          resources: ['*'],
        }),
        new iam.PolicyStatement({
          sid: 'AWSServiceLogPolicyforVPCFlowIngestion1',
          effect: iam.Effect.ALLOW,
          actions: ['ec2:CreateFlowLogs'],
          resources: [
            `arn:${Aws.PARTITION}:ec2:*:${Aws.ACCOUNT_ID}:vpc-flow-log/*`,
            `arn:${Aws.PARTITION}:ec2:*:${Aws.ACCOUNT_ID}:vpc/*`,
          ],
        }),
        new iam.PolicyStatement({
          sid: 'AWSServiceLogPolicyforVPCFlowIngestion2',
          effect: iam.Effect.ALLOW,
          actions: ['ec2:CreateTags'],
          resources: [
            `arn:${Aws.PARTITION}:ec2:*:${Aws.ACCOUNT_ID}:vpc-flow-log/*`,
          ],
        }),
        new iam.PolicyStatement({
          sid: 'AWSServiceLogPolicyforVPCFlowIngestion3',
          effect: iam.Effect.ALLOW,
          actions: ['logs:CreateLogDelivery'],
          resources: ['*'],
        }),
        // AWS Service Log Policy for Lambda Ingestion
        new iam.PolicyStatement({
          sid: 'AWSServiceLogPolicyforLambdaIngestion0',
          effect: iam.Effect.ALLOW,
          actions: ['lambda:ListFunctions'],
          resources: ['*'],
        }),
        // AWS Service Log Policy for CloudFront Ingestion
        new iam.PolicyStatement({
          sid: 'AWSServiceLogPolicyforCloudFrontIngestion0',
          effect: iam.Effect.ALLOW,
          actions: [
            'cloudfront:ListDistributions',
            'cloudfront:GetDistributionConfig',
          ],
          resources: ['*'],
        }),
        new iam.PolicyStatement({
          sid: 'AWSServiceLogPolicyforCloudFrontIngestion1',
          effect: iam.Effect.ALLOW,
          actions: ['cloudfront:UpdateDistribution'],
          resources: [
            `arn:${Aws.PARTITION}:cloudfront::${Aws.ACCOUNT_ID}:distribution/*`,
          ],
        }),
        // AWS Service Log Policy for Config Ingestion
        new iam.PolicyStatement({
          sid: 'AWSServiceLogPolicyforConfigIngestion0',
          effect: iam.Effect.ALLOW,
          actions: ['config:DescribeDeliveryChannels'],
          resources: ['*'],
        }),
        // AWS Service Log Policy for WAF Ingestion
        new iam.PolicyStatement({
          sid: 'AWSServiceLogPolicyforWAFIngestion0',
          effect: iam.Effect.ALLOW,
          actions: [
            'wafv2:PutLoggingConfiguration',
            'wafv2:GetSampledRequests',
            'wafv2:GetLoggingConfiguration',
            'wafv2:GetWebACL',
          ],
          resources: [
            `arn:${Aws.PARTITION}:wafv2:*:${Aws.ACCOUNT_ID}:*/webacl/*/*`,
          ],
        }),
        new iam.PolicyStatement({
          sid: 'AWSServiceLogPolicyforWAFIngestion1',
          effect: iam.Effect.ALLOW,
          actions: ['wafv2:ListWebACLs'],
          resources: ['*'],
        }),
        new iam.PolicyStatement({
          sid: 'AWSServiceLogPolicyforWAFIngestion2',
          effect: iam.Effect.ALLOW,
          actions: ['firehose:CreateDeliveryStream'],
          resources: [
            `arn:${Aws.PARTITION}:firehose:*:${Aws.ACCOUNT_ID}:deliverystream/aws-waf-logs-${stackPrefix}-*`,
          ],
        }),
        new iam.PolicyStatement({
          sid: 'AWSServiceLogPolicyforWAFIngestion3',
          effect: iam.Effect.ALLOW,
          actions: ['firehose:DescribeDeliveryStream'],
          resources: [
            `arn:${Aws.PARTITION}:firehose:*:${Aws.ACCOUNT_ID}:deliverystream/aws-waf-logs-*`,
          ],
        }),
        // AWS Service Log Policy for API Resources Handler
        new iam.PolicyStatement({
          sid: 'AWSServiceLogPolicyforAPIResources0',
          effect: iam.Effect.ALLOW,
          actions: [
            'iam:GetRole',
            'iam:PassRole',
            'iam:CreateRole',
            'iam:PutRolePolicy',
          ],
          resources: [
            `arn:${Aws.PARTITION}:iam::${Aws.ACCOUNT_ID}:role/service-role/${stackPrefix}-*`,
            `arn:${Aws.PARTITION}:iam::${Aws.ACCOUNT_ID}:role/policy/${stackPrefix}-*`,
            `arn:${Aws.PARTITION}:iam::${Aws.ACCOUNT_ID}:role/${stackPrefix}-*`,
          ],
        }),
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          resources: [
            `arn:${Aws.PARTITION}:iam::${Aws.ACCOUNT_ID}:role/aws-service-role/wafv2.amazonaws.com/AWSServiceRoleForWAFV2Logging`,
          ],
          actions: ['iam:CreateServiceLinkedRole'],
        }),
        new iam.PolicyStatement({
          sid: 'AWSServiceLogPolicyforAPIResources1',
          effect: iam.Effect.ALLOW,
          actions: ['logs:GetLogEvents', 'logs:PutLogEvents'],
          resources: [
            `arn:${Aws.PARTITION}:logs:*:${Aws.ACCOUNT_ID}:log-group:*:log-stream:*`,
          ],
        }),
        new iam.PolicyStatement({
          sid: 'AWSServiceLogPolicyforAPIResources2',
          effect: iam.Effect.ALLOW,
          actions: [
            'logs:CreateLogStream',
            'logs:DeleteSubscriptionFilter',
            'logs:DescribeLogGroups',
            'logs:PutSubscriptionFilter',
            'logs:CreateLogGroup',
          ],
          resources: [
            `arn:${Aws.PARTITION}:logs:*:${Aws.ACCOUNT_ID}:log-group:*`,
            `arn:${Aws.PARTITION}:logs:*:${parentAccountId.valueAsString}:destination:*`,
          ],
        }),
        new iam.PolicyStatement({
          sid: 'AWSServiceLogPolicyforAPIResources3',
          effect: iam.Effect.ALLOW,
          actions: ['logs:PutResourcePolicy', 'logs:DescribeResourcePolicies'],
          resources: [`arn:${Aws.PARTITION}:logs:*:${Aws.ACCOUNT_ID}:*`],
        }),
        // EC2 Policy for S3 Buffer
        new iam.PolicyStatement({
          sid: 'EC2PolicyforS3Buffer0',
          effect: iam.Effect.ALLOW,
          actions: ['ssm:SendCommand', 'ssm:GetParameters'],
          resources: [
            `arn:${Aws.PARTITION}:ec2:*:${Aws.ACCOUNT_ID}:instance/*`,
            `arn:${Aws.PARTITION}:ssm:*:${Aws.ACCOUNT_ID}:parameter/*`,
            `arn:${Aws.PARTITION}:ssm:*:*:document/AWS-RunShellScript`,
            `arn:${Aws.PARTITION}:ssm:*:*:document/*FluentBitDocumentInstallation*`,
            `arn:${Aws.PARTITION}:ssm:*:*:document/*FluentBitConfigDownloading*`,
            `arn:${Aws.PARTITION}:ssm:*:*:document/*FluentBitStatusCheckDocument*`,
          ],
        }),
        new iam.PolicyStatement({
          sid: 'EC2PolicyforS3Buffer1',
          effect: iam.Effect.ALLOW,
          actions: [
            'ssm:DescribeInstanceInformation',
            'ssm:GetCommandInvocation',
            'ssm:ListCommandInvocations',
            'ssm:DescribeInstanceProperties',
          ],
          resources: ['*'],
        }),
        new iam.PolicyStatement({
          sid: 'EC2PolicyforS3Buffer2',
          effect: iam.Effect.ALLOW,
          actions: ['ec2:DescribeInstances', 'ec2:DescribeTags'],
          resources: ['*'],
        }),
        // EC2 Policy for KDS
        new iam.PolicyStatement({
          sid: 'EC2PolicyforKDS0',
          effect: iam.Effect.ALLOW,
          actions: ['sts:AssumeRole'],
          resources: [
            `arn:${Aws.PARTITION}:iam::${parentAccountId.valueAsString}:role/*buffer-access*`,
            `arn:${Aws.PARTITION}:iam::${parentAccountId.valueAsString}:role/*BufferAccessRole*`,
          ],
        }),
        // EC2 Policy for AutoScaling
        new iam.PolicyStatement({
          sid: 'EC2PolicyforAutoScaling0',
          effect: iam.Effect.ALLOW,
          actions: ['autoscaling:DescribeAutoScalingGroups'],
          resources: ['*'],
        }),
        // EKS Policy
        new iam.PolicyStatement({
          sid: 'EKSPolicy0',
          effect: iam.Effect.ALLOW,
          actions: ['eks:DescribeCluster', 'eks:ListClusters'],
          resources: [`arn:${Aws.PARTITION}:eks:*:${Aws.ACCOUNT_ID}:cluster/*`],
        }),
        new iam.PolicyStatement({
          sid: 'EKSPolicy1',
          effect: iam.Effect.ALLOW,
          actions: [
            'iam:GetOpenIDConnectProvider',
            'iam:TagOpenIDConnectProvider',
            'iam:CreateOpenIDConnectProvider',
          ],
          resources: [
            `arn:${Aws.PARTITION}:iam::${Aws.ACCOUNT_ID}:oidc-provider/oidc.eks.*`,
          ],
        }),
        new iam.PolicyStatement({
          sid: 'EKSPolicy2',
          effect: iam.Effect.ALLOW,
          actions: ['iam:TagRole', 'iam:CreateRole', 'iam:PutRolePolicy'],
          resources: [
            `arn:${Aws.PARTITION}:iam::${Aws.ACCOUNT_ID}:role/${stackPrefix}-EKS-LogAgent-Role-*`,
          ],
        }),
        // Read and Write Data from Sub Account bucket created by this solution
        new iam.PolicyStatement({
          sid: 'RWDataFromSubAccountBucket',
          effect: iam.Effect.ALLOW,
          actions: ['s3:*'],
          resources: [
            `arn:${Aws.PARTITION}:s3:::${loggingBucket.bucketName}/*`,
            `arn:${Aws.PARTITION}:s3:::${loggingBucket.bucketName}`,
          ],
        }),
        new iam.PolicyStatement({
          sid: 'RDSPolicy',
          effect: iam.Effect.ALLOW,
          resources: [
            `arn:${Aws.PARTITION}:rds:${Aws.REGION}:${Aws.ACCOUNT_ID}:cluster:*`,
            `arn:${Aws.PARTITION}:rds:${Aws.REGION}:${Aws.ACCOUNT_ID}:db:*`,
          ],
          actions: [
            'rds:DownloadDBLogFilePortion',
            'rds:DescribeDBInstances',
            'rds:DescribeDBLogFiles',
            'rds:DescribeDBClusters',
          ],
        }),
      ],
    });
    crossAccountRole.attachInlinePolicy(crossAccountPolicy);
    NagSuppressions.addResourceSuppressions(crossAccountPolicy, [
      {
        id: 'AwsSolutions-IAM5',
        reason: 'The managed policy needs to use any resources in ssm',
      },
    ]);

    const cfnCrossAccountPolicy = crossAccountPolicy.node
      .defaultChild as iam.CfnPolicy;
    addCfnNagSuppressRules(cfnCrossAccountPolicy, [
      {
        id: 'W12',
        reason: 'The managed policy needs to use any resources in ssm',
      },
      {
        id: 'F4',
        reason: 'The list and describe actions need to use any resources',
      },
    ]);

    // Workaround since cdk>=v2.116.0 builtin custom resource lambda has an issue that will lead to remove all existing s3 bucket notifications. Remove this once the cdk issue is fixed.
    const notificationHandler = Stack.of(this).node.tryFindChild(
      'BucketNotificationsHandler050a0587b7544547bf325f094a3db834'
    );
    if (notificationHandler) {
      Aspects.of(notificationHandler).add(
        new UseS3BucketNotificationsWithRetryAspects()
      );
    }

    // Download agent from CN if deployed in CN
    const isCN = new CfnCondition(this, 'isCN', {
      expression: Fn.conditionEquals(Aws.PARTITION, 'aws-cn'),
    });
    const s3Address = Fn.conditionIf(
      isCN.logicalId,
      'aws-solutions-assets.s3.cn-north-1.amazonaws.com.cn',
      'aws-gcr-solutions-assets.s3.amazonaws.com'
    ).toString();

    const FluentBitVersion = 'v1.9.10';

    const installLogAgentDocumentForLinux = new CfnDocument(
      this,
      'Fluent-BitDocumentInstallationForLinux',
      {
        content: {
          schemaVersion: '2.2',
          description:
            'Install Fluent-Bit and the AWS output plugins via AWS Systems Manager',
          parameters: {
            ARCHITECTURE: {
              type: 'String',
              default: '',
              description: '(Required) Machine Architecture',
            },
            SYSTEMDPATH: {
              type: 'String',
              default: '/usr/lib',
              description: '(Required) systemd path for current OS',
            },
            FluentBitSource: {
              default: 'AWS',
              description: '(Required) The source of FluentBit',
              type: 'String',
              allowedValues: ['AWS', 'Community'],
            },
          },
          mainSteps: [
            {
              action: 'aws:downloadContent',
              name: 'downloadFluentBit',
              precondition: {
                StringEquals: ['{{FluentBitSource}}', 'AWS'],
              },
              inputs: {
                sourceType: 'S3',
                sourceInfo: `{\"path\":\"https://${s3Address}/clo/aws-for-fluent-bit%3A2.31.12/fluent-bit{{ARCHITECTURE}}.tar.gz\"}`,
                destinationPath: '/opt',
              },
            },
            {
              action: 'aws:runShellScript',
              name: 'installFluentBit',
              precondition: {
                StringEquals: ['{{FluentBitSource}}', 'AWS'],
              },
              inputs: {
                runCommand: [
                  'cd /opt',
                  'FLUENT_BIT_CONFIG=$(ls /opt/fluent-bit/etc/fluent-bit.conf | wc -l)',
                  'if [ ${FLUENT_BIT_CONFIG} = 1 ];  then tar zxvf fluent-bit{{ARCHITECTURE}}.tar.gz --exclude=fluent-bit/etc/fluent-bit.conf --exclude=fluent-bit/etc/parsers.conf ; else sudo tar zxvf fluent-bit{{ARCHITECTURE}}.tar.gz;  fi',
                ],
              },
            },
            {
              action: 'aws:runShellScript',
              name: 'installCommunityFluentBit',
              precondition: {
                StringEquals: ['{{FluentBitSource}}', 'Community'],
              },
              inputs: {
                runCommand: [
                  'set -x',
                  'export FLUENT_BIT_RELEASE_VERSION=3.0.4',
                  'curl https://raw.githubusercontent.com/fluent/fluent-bit/master/install.sh | sh',
                ],
              },
            },
            {
              action: 'aws:runShellScript',
              name: 'startFluentBit',
              inputs: {
                runCommand: [
                  'cat << EOF | sudo tee {{SYSTEMDPATH}}/systemd/system/fluent-bit.service',
                  '[Unit]',
                  'Description=Fluent Bit',
                  'Requires=network.target',
                  'After=network.target',
                  '',
                  '[Service]',
                  'Type=simple',
                  'ExecStart=/opt/fluent-bit/bin/fluent-bit -c /opt/fluent-bit/etc/fluent-bit.conf',
                  'Type=simple',
                  'Restart=always',
                  '',
                  '[Install]',
                  'WantedBy=multi-user.target',
                  '',
                  'EOF',
                  'sudo systemctl daemon-reload',
                  'sudo service fluent-bit restart',
                ],
              },
            },
          ],
        },
        documentFormat: 'JSON',
        documentType: 'Command',
        updateMethod: 'NewVersion',
      }
    );
    const installLogAgentDocumentForWindows = new CfnDocument(
      this,
      'WindowsFluent-BitDocumentInstallationForWindows',
      {
        content: {
          schemaVersion: '2.2',
          description: 'Deploy and install PowerShell modules.',
          parameters: {
            workingDirectory: {
              type: 'String',
              default: '',
              description:
                '(Optional) The path to the working directory on your instance.',
              maxChars: 4096,
            },
            source: {
              type: 'String',
              description:
                'The URL or local path on the instance to the application .zip file.',
            },
            sourceHash: {
              type: 'String',
              default: '',
              description: '(Optional) The SHA256 hash of the zip file.',
            },
            commands: {
              type: 'StringList',
              default: [],
              description:
                '(Optional) Specify PowerShell commands to run on your instance.',
              displayType: 'textarea',
            },
            executionTimeout: {
              type: 'String',
              default: '3600',
              description:
                '(Optional) The time in seconds for a command to be completed before it is considered to have failed. Default is 3600 (1 hour). Maximum is 172800 (48 hours).',
              allowedPattern:
                '([1-9][0-9]{0,4})|(1[0-6][0-9]{4})|(17[0-1][0-9]{3})|(172[0-7][0-9]{2})|(172800)',
            },
          },
          mainSteps: [
            {
              action: 'aws:runPowerShellScript',
              name: 'createDownloadFolder',
              precondition: {
                StringEquals: ['platformType', 'Windows'],
              },
              inputs: {
                runCommand: [
                  'try {',
                  '  $sku = (Get-CimInstance -ClassName Win32_OperatingSystem).OperatingSystemSKU',
                  '  if ($sku -eq 143 -or $sku -eq 144) {',
                  '    Write-Host "This document is not supported on Windows 2016 Nano Server."',
                  '    exit 40',
                  '  }',
                  "  $ssmAgentService = Get-ItemProperty 'HKLM:SYSTEM\\\\CurrentControlSet\\\\Services\\\\AmazonSSMAgent\\\\'",
                  "  if ($ssmAgentService -and [System.Version]$ssmAgentService.Version -ge [System.Version]'3.0.1031.0') {",
                  '     exit 0',
                  '  }',
                  '  $DataFolder = "Application Data"',
                  '  if ( ![string]::IsNullOrEmpty($env:ProgramData) ) {',
                  '    $DataFolder = $env:ProgramData',
                  '  } elseif ( ![string]::IsNullOrEmpty($env:AllUsersProfile) ) {',
                  '    $DataFolder = "$env:AllUsersProfile\\Application Data"',
                  '  }',
                  '  $TempFolder = "/"',
                  '  if ( $env:Temp -ne $null ) {',
                  '    $TempFolder = $env:Temp',
                  '  }',
                  "  $DataFolder = Join-Path $DataFolder 'Amazon\\SSM'",
                  "  $DownloadFolder = Join-Path $TempFolder 'Amazon\\SSM'",
                  '  if ( !( Test-Path -LiteralPath $DataFolder )) {',
                  '    $none = New-Item -ItemType directory -Path $DataFolder',
                  '  }',
                  '  $DataACL = Get-Acl $DataFolder',
                  '  if ( Test-Path -LiteralPath $DownloadFolder ) {',
                  '    $DownloadACL = Get-Acl $DownloadFolder',
                  '    $ACLDiff = Compare-Object ($DownloadACL.AccessToString) ($DataACL.AccessToString)',
                  '    if ( $ACLDiff.count -eq 0 ) {',
                  '      exit 0',
                  '    }',
                  '    Remove-Item $DownloadFolder -Recurse -Force',
                  '  }',
                  '  $none = New-Item -ItemType directory -Path $DownloadFolder',
                  '  Set-Acl $DownloadFolder -aclobject $DataACL',
                  '  $DownloadACL = Get-Acl $DownloadFolder',
                  '  $ACLDiff = Compare-Object ($DownloadACL.AccessToString) ($DataACL.AccessToString)',
                  '  if ( $ACLDiff.count -ne 0 ) {',
                  '    Write-Error "Failed to create download folder" -ErrorAction Continue',
                  '    exit 41',
                  '  }',
                  '} catch {',
                  '  Write-Host  "Failed to create download folder"',
                  '  Write-Error  $Error[0]  -ErrorAction Continue',
                  '  exit 42',
                  '}',
                ],
              },
            },
            {
              action: 'aws:psModule',
              name: 'installModule',
              inputs: {
                id: '0.aws:psModule',
                runCommand: '{{ commands }}',
                source: '{{ source }}',
                sourceHash: '{{ sourceHash }}',
                workingDirectory: '{{ workingDirectory }}',
                timeoutSeconds: '{{ executionTimeout }}',
              },
            },
          ],
        },
        documentFormat: 'JSON',
        documentType: 'Command',
        updateMethod: 'NewVersion',
      }
    );
    const agentStatusCheckDocument = new CfnDocument(
      this,
      'FluentBit-StatusCheckDocument',
      {
        content: {
          schemaVersion: '2.2',
          description:
            'Execute scripts stored in a remote location. The following remote locations are currently supported: GitHub (public and private) and Amazon S3 (S3). The following script types are currently supported: #! support on Linux and file associations on Windows.',
          parameters: {
            executionTimeout: {
              default: '3600',
              description:
                '(Optional) The time in seconds for a command to complete before it is considered to have failed. Default is 3600 (1 hour). Maximum is 28800 (8 hours).',
              type: 'String',
              allowedPattern:
                '([1-9][0-9]{0,3})|(1[0-9]{1,4})|(2[0-7][0-9]{1,3})|(28[0-7][0-9]{1,2})|(28800)',
            },
            winCommandLine: {
              default: '',
              description:
                "(Required) Specify the command line to be executed. The following formats of commands can be run: 'pythonMainFile.py argument1 argument2', 'ansible-playbook -i \"localhost,\" -c local example.yml'",
              type: 'String',
            },
            linuxCommandLine: {
              default: '',
              description:
                "(Required) Specify the command line to be executed. The following formats of commands can be run: 'pythonMainFile.py argument1 argument2', 'ansible-playbook -i \"localhost,\" -c local example.yml'",
              type: 'String',
            },
          },
          mainSteps: [
            {
              inputs: {
                timeoutSeconds: '{{ executionTimeout }}',
                runCommand: [
                  '',
                  '$directory = Convert-Path .',
                  '$env:PATH += ";$directory"',
                  ' {{ winCommandLine }}',
                  'if ($?) {',
                  '    exit $LASTEXITCODE',
                  '} else {',
                  '    exit 255',
                  '}',
                  '',
                ],
              },
              name: 'runPowerShellScript',
              action: 'aws:runPowerShellScript',
              precondition: {
                StringEquals: ['platformType', 'Windows'],
              },
            },
            {
              inputs: {
                timeoutSeconds: '{{ executionTimeout }}',
                runCommand: [
                  '',
                  'directory=$(pwd)',
                  'export PATH=$PATH:$directory',
                  ' {{ linuxCommandLine }} ',
                  '',
                ],
              },
              name: 'runShellScript',
              action: 'aws:runShellScript',
              precondition: {
                StringEquals: ['platformType', 'Linux'],
              },
            },
          ],
        },
        documentFormat: 'JSON',
        documentType: 'Command',
      }
    );

    const downloadLogConfigDocument = new CfnDocument(
      this,
      'Fluent-BitConfigDownloading',
      {
        content: {
          schemaVersion: '2.2',
          description:
            'Download Fluent-Bit config file and reboot the Fluent-Bit',
          parameters: {
            ARCHITECTURE: {
              type: 'String',
              default: '',
              description: '(Required) Machine Architecture',
            },
            INSTANCEID: {
              type: 'String',
              default: '',
              description: '(Required) Instance Id',
            },
          },
          mainSteps: [
            {
              action: 'aws:runShellScript',
              name: 'stopFluentBit',
              inputs: {
                runCommand: ['sudo service fluent-bit stop'],
              },
            },
            {
              action: 'aws:runShellScript',
              name: 'updateFluentBitVersion',
              inputs: {
                runCommand: [
                  `[ -e /opt/fluent-bit/bin/fluent-bit ] && [ -z \"$(/opt/fluent-bit/bin/fluent-bit -V | grep '${FluentBitVersion}')\" ] && curl -o /opt/fluent-bit{{ARCHITECTURE}}.tar.gz 'https://${s3Address}/clo/aws-for-fluent-bit%3A2.31.12/fluent-bit{{ARCHITECTURE}}.tar.gz' && tar xzvf /opt/fluent-bit{{ARCHITECTURE}}.tar.gz -C /opt/ --exclude=fluent-bit/etc; echo 0`,
                ],
              },
            },
            {
              action: 'aws:downloadContent',
              name: 'downloadFluentBitParserConfig',
              inputs: {
                sourceType: 'S3',
                sourceInfo: `{\"path\":\"https://${loggingBucket.bucketRegionalDomainName}/app_log_config/{{INSTANCEID}}/applog_parsers.conf\"}`,
                destinationPath: '/opt/fluent-bit/etc',
              },
            },
            {
              action: 'aws:downloadContent',
              name: 'downloadFluentBitConfig',
              inputs: {
                sourceType: 'S3',
                sourceInfo: `{\"path\":\"https://${loggingBucket.bucketRegionalDomainName}/app_log_config/{{INSTANCEID}}/fluent-bit.conf\"}`,
                destinationPath: '/opt/fluent-bit/etc',
              },
            },
            {
              action: 'aws:runShellScript',
              name: 'startFluentBit',
              inputs: {
                runCommand: [
                  'sudo systemctl enable fluent-bit.service',
                  'sudo service fluent-bit start',
                ],
              },
            },
          ],
        },
        documentFormat: 'JSON',
        documentType: 'Command',
        updateMethod: 'NewVersion',
      }
    );

    const downloadLogConfigDocumentForWindows = new CfnDocument(
      this,
      'Fluent-BitConfigDownloadingForWindows',
      {
        content: {
          schemaVersion: '2.2',
          description:
            'Execute scripts stored in a remote location. The following remote locations are currently supported: GitHub (public and private) and Amazon S3 (S3). The following script types are currently supported: #! support on Linux and file associations on Windows.',
          parameters: {
            executionTimeout: {
              default: '3600',
              description:
                '(Optional) The time in seconds for a command to complete before it is considered to have failed. Default is 3600 (1 hour). Maximum is 28800 (8 hours).',
              type: 'String',
              allowedPattern:
                '([1-9][0-9]{0,3})|(1[0-9]{1,4})|(2[0-7][0-9]{1,3})|(28[0-7][0-9]{1,2})|(28800)',
            },
            workingDirectory: {
              default: '',
              description:
                '(Optional) The path where the content will be downloaded and executed from on your instance.',
              maxChars: 4096,
              type: 'String',
            },
            INSTANCEID: {
              type: 'String',
              default: '',
              description: '(Required) Instance Id',
            },
            commandLine: {
              default: 'ReStart-Service fluent-bit',
              description:
                "(Required) Specify the command line to be executed. The following formats of commands can be run: 'pythonMainFile.py argument1 argument2', 'ansible-playbook -i \"localhost,\" -c local example.yml'",
              type: 'String',
            },
          },
          mainSteps: [
            {
              inputs: {
                sourceInfo: `{\"path\":\"https://${loggingBucket.bucketRegionalDomainName}/app_log_config/{{INSTANCEID}}/applog_parsers.conf\"}`,
                sourceType: 'S3',
                destinationPath: 'C:/fluent-bit/etc',
              },
              name: 'downloadFluentBitParserConfig',
              action: 'aws:downloadContent',
            },
            {
              inputs: {
                sourceInfo: `{\"path\":\"https://${loggingBucket.bucketRegionalDomainName}/app_log_config/{{INSTANCEID}}/fluent-bit.conf\"}`,
                sourceType: 'S3',
                destinationPath: 'C:/fluent-bit/etc',
              },
              name: 'downloadFluentBitConfig',
              action: 'aws:downloadContent',
            },
            {
              inputs: {
                workingDirectory: '{{ workingDirectory }}',
                timeoutSeconds: '{{ executionTimeout }}',
                runCommand: [
                  '',
                  '$directory = Convert-Path .',
                  '$env:PATH += ";$directory"',
                  ' {{ commandLine }}',
                  'if ($?) {',
                  '    exit $LASTEXITCODE',
                  '} else {',
                  '    exit 255',
                  '}',
                  '',
                ],
              },
              name: 'runPowerShellScript',
              action: 'aws:runPowerShellScript',
              precondition: {
                StringEquals: ['platformType', 'Windows'],
              },
            },
            {
              inputs: {
                workingDirectory: '{{ workingDirectory }}',
                timeoutSeconds: '{{ executionTimeout }}',
                runCommand: [
                  '',
                  'directory=$(pwd)',
                  'export PATH=$PATH:$directory',
                  ' {{ commandLine }} ',
                  '',
                ],
              },
              name: 'runShellScript',
              action: 'aws:runShellScript',
              precondition: {
                StringEquals: ['platformType', 'Linux'],
              },
            },
          ],
        },
        documentFormat: 'JSON',
        documentType: 'Command',
        updateMethod: 'NewVersion',
      }
    );

    new CfnOutput(this, 'MemberAccountRoleARN', {
      description: 'Member Account Role ARN',
      value: crossAccountRole.roleArn,
    }).overrideLogicalId('MemberAccountRoleARN');

    new CfnOutput(this, 'AgentInstallDocumentForLinux', {
      description: 'FluentBit Agent Installation Document for Linux',
      value: installLogAgentDocumentForLinux.ref,
    }).overrideLogicalId('AgentInstallDocument');

    new CfnOutput(this, 'AgentConfigDocumentForLinux', {
      description: 'FluentBit Agent Configuration Document for Linux',
      value: downloadLogConfigDocument.ref,
    }).overrideLogicalId('AgentConfigDocument');

    new CfnOutput(this, 'AgentInstallDocumentForWindows', {
      description: 'FluentBit Agent Installation Document for Windows',
      value: installLogAgentDocumentForWindows.ref,
    }).overrideLogicalId('AgentInstallDocumentForWindows');

    new CfnOutput(this, 'AgentConfigDocumentForWindows', {
      description: 'FluentBit Agent Configuration Document for Windows',
      value: downloadLogConfigDocumentForWindows.ref,
    }).overrideLogicalId('AgentConfigDocumentForWindows');

    new CfnOutput(this, 'AgentStatusCheckDocument', {
      description: 'Status detection of FluentBit ',
      value: agentStatusCheckDocument.ref,
    }).overrideLogicalId('AgentStatusCheckDocument');

    new CfnOutput(this, 'MemberAccountS3Bucket', {
      description: 'Member Account S3 Bucket',
      value: loggingBucket.bucketName,
    }).overrideLogicalId('MemberAccountS3Bucket');

    new CfnOutput(this, 'MemberAccountStackId', {
      description: 'Member Account CloudFormation Stack Id',
      value: this.stackId,
    }).overrideLogicalId('MemberAccountStackId');

    new CfnOutput(this, 'MemberAccountKMSKeyARN', {
      description: 'Member Account KMS Key ARN',
      value: newKMSKey.keyArn,
    }).overrideLogicalId('MemberAccountKMSKeyARN');

    new CfnOutput(this, 'MemberAccountIamInstanceProfileARN', {
      description: 'Member Account IAM instance profile ARN',
      value: Ec2IamInstanceProfile.cfnEc2IamInstanceProfile.attrArn,
    }).overrideLogicalId('MemberAccountIamInstanceProfileARN');
  }
  private addToParamLabels(label: string, param: string) {
    this.paramLabels[param] = {
      default: label,
    };
  }
}
