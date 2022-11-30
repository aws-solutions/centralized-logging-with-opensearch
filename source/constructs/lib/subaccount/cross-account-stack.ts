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
import { Construct } from "constructs";
import {
  Aws,
  CfnResource,
  Stack,
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
} from "aws-cdk-lib";
import { CfnDocument } from "aws-cdk-lib/aws-ssm";
import { NagSuppressions } from "cdk-nag";
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
  resource.addMetadata("cfn_nag", {
    rules_to_suppress: rules,
  });
}

export class CrossAccount extends Stack {
  private addToParamLabels(label: string, param: string) {
    this.paramLabels[param] = {
      default: label,
    };
  }

  private paramGroups: any[] = [];
  private paramLabels: any = {};

  constructor(scope: Construct, id: string) {
    super(scope, id);

    const solutionName = "LogHub";

    this.templateOptions.description = `(SO8025-sub) - Log Hub - Sub Account Template - Version ${VERSION}`;

    this.templateOptions.metadata = {
      "AWS::CloudFormation::Interface": {
        ParameterGroups: this.paramGroups,
        ParameterLabels: this.paramLabels,
      },
    };

    const parentAccountId = new CfnParameter(this, "parentAccountId", {
      description: "The Account ID of account where Log Hub is deployed.",
      type: "String",
      allowedPattern: "^\\d{12}$",
      constraintDescription: "Log Hub Parent Account Id must be 12 digits",
    });
    this.addToParamLabels(
      "Log Hub Parent Account Id",
      parentAccountId.logicalId
    );

    // Create a default logging bucket
    const loggingBucket = new s3.Bucket(this, `${solutionName}LoggingBucket`, {
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      accessControl: s3.BucketAccessControl.LOG_DELIVERY_WRITE,
      objectOwnership: s3.ObjectOwnership.BUCKET_OWNER_PREFERRED,
    });
    const elbRootAccountArnTable = new CfnMapping(
      this,
      "ELBRootAccountArnTable",
      {
        mapping: {
          "us-east-1": { elbRootAccountArn: "arn:aws:iam::127311923021:root" },
          "us-east-2": { elbRootAccountArn: "arn:aws:iam::033677994240:root" },
          "us-west-1": { elbRootAccountArn: "arn:aws:iam::027434742980:root" },
          "us-west-2": { elbRootAccountArn: "arn:aws:iam::797873946194:root" },
          "af-south-1": { elbRootAccountArn: "arn:aws:iam::098369216593:root" },
          "ca-central-1": {
            elbRootAccountArn: "arn:aws:iam::985666609251:root",
          },
          "eu-central-1": {
            elbRootAccountArn: "arn:aws:iam::054676820928:root",
          },
          "eu-west-1": { elbRootAccountArn: "arn:aws:iam::156460612806:root" },
          "eu-west-2": { elbRootAccountArn: "arn:aws:iam::652711504416:root" },
          "eu-south-1": { elbRootAccountArn: "arn:aws:iam::635631232127:root" },
          "eu-west-3": { elbRootAccountArn: "arn:aws:iam::009996457667:root" },
          "eu-north-1": { elbRootAccountArn: "arn:aws:iam::897822967062:root" },
          "ap-east-1": { elbRootAccountArn: "arn:aws:iam::754344448648:root" },
          "ap-northeast-1": {
            elbRootAccountArn: "arn:aws:iam::582318560864:root",
          },
          "ap-northeast-2": {
            elbRootAccountArn: "arn:aws:iam::600734575887:root",
          },
          "ap-northeast-3": {
            elbRootAccountArn: "arn:aws:iam::383597477331:root",
          },
          "ap-southeast-1": {
            elbRootAccountArn: "arn:aws:iam::114774131450:root",
          },
          "ap-southeast-2": {
            elbRootAccountArn: "arn:aws:iam::783225319266:root",
          },
          "ap-southeast-3": {
            elbRootAccountArn: "arn:aws:iam::589379963580:root",
          },
          "ap-south-1": { elbRootAccountArn: "arn:aws:iam::718504428378:root" },
          "me-south-1": { elbRootAccountArn: "arn:aws:iam::076674570225:root" },
          "sa-east-1": { elbRootAccountArn: "arn:aws:iam::507241528517:root" },
          "cn-north-1": {
            elbRootAccountArn: "arn:aws-cn:iam::638102146993:root",
          },
          "cn-northwest-1": {
            elbRootAccountArn: "arn:aws-cn:iam::037604701340:root",
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
        actions: ["s3:PutObject"],
        principals: [
          new iam.ArnPrincipal(
            elbRootAccountArnTable.findInMap(Aws.REGION, "elbRootAccountArn")
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
        actions: ["s3:PutObject"],
        principals: [new iam.ServicePrincipal("delivery.logs.amazonaws.com")],
        conditions: {
          StringEquals: {
            "s3:x-amz-acl": "bucket-owner-full-control",
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
        actions: ["s3:GetBucketAcl"],
        principals: [new iam.ServicePrincipal("delivery.logs.amazonaws.com")],
      })
    );
    loggingBucket.addToResourcePolicy(
      new iam.PolicyStatement({
        resources: [
          `arn:${Aws.PARTITION}:s3:::${loggingBucket.bucketName}/*`,
          `arn:${Aws.PARTITION}:s3:::${loggingBucket.bucketName}`,
        ],
        actions: [
          "s3:PutBucketNotification",
          "s3:GetObjectVersionTagging",
          "s3:GetObjectAcl",
          "s3:GetBucketObjectLockConfiguration",
          "s3:GetObjectVersionAcl",
          "s3:GetBucketPolicyStatus",
          "s3:GetObjectRetention",
          "s3:GetBucketWebsite",
          "s3:GetObjectAttributes",
          "s3:GetObjectLegalHold",
          "s3:GetBucketNotification",
          "s3:GetReplicationConfiguration",
          "s3:GetObject",
          "s3:GetAnalyticsConfiguration",
          "s3:GetObjectVersionForReplication",
          "s3:GetBucketTagging",
          "s3:GetBucketLogging",
          "s3:GetAccelerateConfiguration",
          "s3:GetObjectVersionAttributes",
          "s3:GetBucketPolicy",
          "s3:GetEncryptionConfiguration",
          "s3:GetObjectVersionTorrent",
          "s3:GetBucketRequestPayment",
          "s3:GetObjectTagging",
        ],
        effect: iam.Effect.ALLOW,
        principals: [new iam.AccountPrincipal(parentAccountId.valueAsString)],
      })
    );

    loggingBucket.addToResourcePolicy(
      new iam.PolicyStatement({
        actions: ["s3:*"],
        effect: iam.Effect.DENY,
        resources: [
          `arn:${Aws.PARTITION}:s3:::${loggingBucket.bucketName}/*`,
          `arn:${Aws.PARTITION}:s3:::${loggingBucket.bucketName}`,
        ],
        conditions: {
          ["Bool"]: {
            "aws:SecureTransport": "false",
          },
        },
        principals: [new iam.AnyPrincipal()],
      })
    );
    NagSuppressions.addResourceSuppressions(loggingBucket, [
      {
        id: "AwsSolutions-S1",
        reason: "this is a logging bucket hence no access logging required",
      },
    ]);

    const cfnLoggingBucket = loggingBucket.node.defaultChild as s3.CfnBucket;
    addCfnNagSuppressRules(cfnLoggingBucket, [
      {
        id: "W35",
        reason: "this is a logging bucket hence no access logging required",
      },
      {
        id: "W51",
        reason: "THis Bucket doesn't need policy",
      },
    ]);

    // Create an IAM role for Log Hub Main stack assuming
    const crossAccountRole = new iam.Role(this, "CrossAccountRole", {
      assumedBy: new iam.CompositePrincipal(
        new iam.ServicePrincipal("lambda.amazonaws.com"),
        new iam.AccountPrincipal(parentAccountId.valueAsString)
      ),
    });

    const crossAccountPolicy = new iam.Policy(this, "CrossAccountPolicy", {
      statements: [
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          resources: ["*"],
          actions: [
            "iam:GetRole",
            "iam:CreateRole",
            "iam:PutRolePolicy",
            "iam:CreateServiceLinkedRole",
            "firehose:CreateDeliveryStream",
            "firehose:DescribeDeliveryStream",
            "firehose:DeleteDeliveryStream",
          ],
        }),
        // Read Data from Sub Account bucket created by Log Hub
        new iam.PolicyStatement({
          actions: [
            "s3:GetObjectVersionTagging",
            "s3:GetObjectAcl",
            "s3:GetBucketObjectLockConfiguration",
            "s3:GetObjectVersionAcl",
            "s3:GetBucketPolicyStatus",
            "s3:GetObjectRetention",
            "s3:GetBucketWebsite",
            "s3:GetObjectAttributes",
            "s3:GetObjectLegalHold",
            "s3:GetBucketNotification",
            "s3:GetReplicationConfiguration",
            "s3:GetObject",
            "s3:GetAnalyticsConfiguration",
            "s3:GetObjectVersionForReplication",
            "s3:GetStorageLensDashboard",
            "s3:GetLifecycleConfiguration",
            "s3:GetInventoryConfiguration",
            "s3:GetBucketTagging",
            "s3:GetBucketLogging",
            "s3:GetAccelerateConfiguration",
            "s3:GetObjectVersionAttributes",
            "s3:GetBucketPolicy",
            "s3:GetEncryptionConfiguration",
            "s3:GetObjectVersionTorrent",
            "s3:GetBucketRequestPayment",
            "s3:GetObjectTagging",
            "s3:GetMetricsConfiguration",
            "s3:GetBucketOwnershipControls",
            "s3:GetBucketPublicAccessBlock",
            "s3:GetMultiRegionAccessPointPolicyStatus",
            "s3:GetMultiRegionAccessPointPolicy",
            "s3:GetBucketVersioning",
            "s3:GetBucketAcl",
            "s3:GetObjectTorrent",
            "s3:GetStorageLensConfiguration",
            "s3:GetAccountPublicAccessBlock",
            "s3:GetBucketCORS",
            "s3:GetBucketLocation",
            "s3:GetObjectVersion",
            "s3:ListBucketMultipartUploads",
            "s3:ListAllMyBuckets",
            "s3:ListJobs",
            "s3:ListMultipartUploadParts",
            "s3:ListBucketVersions",
            "s3:ListBucket",
            "s3-object-lambda:GetObject",
            "s3-object-lambda:ListBucket",
            "s3-object-lambda:GetObjectVersionTagging",
            "s3-object-lambda:GetObjectAcl",
            "s3-object-lambda:ListBucketMultipartUploads",
            "s3-object-lambda:GetObjectVersion",
            "s3-object-lambda:ListBucketVersions",
            "s3-object-lambda:ListMultipartUploadParts",
            "s3-object-lambda:GetObjectRetention",
            "s3-object-lambda:GetObjectVersionAcl",
            "s3-object-lambda:GetObjectTagging",
          ],
          resources: [
            `arn:${Aws.PARTITION}:s3:::${loggingBucket.bucketName}/*`,
            `arn:${Aws.PARTITION}:s3:::${loggingBucket.bucketName}`,
          ],
        }),
        // Control other sub account's bucket
        new iam.PolicyStatement({
          actions: [
            "s3:ListAllMyBuckets",
            "s3:ListBucket",
            "s3:PutBucketLogging",
            "s3:GetObjectVersionTagging",
            "s3:GetObjectAcl",
            "s3:GetBucketObjectLockConfiguration",
            "s3:GetObjectVersionAcl",
            "s3:GetBucketPolicyStatus",
            "s3:GetObjectRetention",
            "s3:GetBucketWebsite",
            "s3:GetObjectAttributes",
            "s3:GetObjectLegalHold",
            "s3:GetBucketNotification",
            "s3:GetReplicationConfiguration",
            "s3:GetObject",
            "s3:GetAnalyticsConfiguration",
            "s3:GetObjectVersionForReplication",
            "s3:GetStorageLensDashboard",
            "s3:GetLifecycleConfiguration",
            "s3:GetInventoryConfiguration",
            "s3:GetBucketTagging",
            "s3:GetBucketLogging",
            "s3:GetAccelerateConfiguration",
            "s3:GetObjectVersionAttributes",
            "s3:GetBucketPolicy",
            "s3:GetEncryptionConfiguration",
            "s3:GetObjectVersionTorrent",
            "s3:GetBucketRequestPayment",
            "s3:GetObjectTagging",
            "s3:GetBucketOwnershipControls",
            "s3:GetBucketPublicAccessBlock",
            "s3:GetMultiRegionAccessPointPolicyStatus",
            "s3:GetMultiRegionAccessPointPolicy",
            "s3:GetBucketVersioning",
            "s3:GetBucketAcl",
            "s3:GetObjectTorrent",
            "s3:GetStorageLensConfiguration",
            "s3:GetAccountPublicAccessBlock",
            "s3:GetBucketCORS",
            "s3:GetBucketLocation",
            "s3:GetObjectVersion",
            "s3:CreateBucket",
            "s3:PutObject",
            "s3:DeleteAccessPointPolicy",
            "s3:DeleteAccessPointPolicyForObjectLambda",
            "s3:DeleteBucketPolicy",
            "s3:PutAccessPointPolicy",
            "s3:PutAccessPointPolicyForObjectLambda",
            "s3:PutBucketNotification",
            "s3:PutBucketPolicy",
            "s3:PutMultiRegionAccessPointPolicy",
            "s3:PutBucketOwnershipControls",
            "s3:PutBucketAcl",
            "s3:PutBucketOwnershipControls",
          ],
          resources: ["*"],
        }),
        new iam.PolicyStatement({
          actions: ["kms:Decrypt"],
          resources: ["*"],
          effect: iam.Effect.ALLOW,
        }),
        // SSM control and Agent Status check
        new iam.PolicyStatement({
          actions: [
            "ssm:DescribeInstanceInformation",
            "ssm:SendCommand",
            "ssm:GetCommandInvocation",
            "ssm:GetParameters",
            "ssm:DescribeInstanceProperties",
            "ec2:DescribeInstances",
            "ec2:DescribeTags",
            "ec2:DescribeImages",
          ],
          resources: ["*"],
        }),
        // EC2 Status Check Event Rule
        new iam.PolicyStatement({
          actions: [
            "events:DescribeRule",
            "events:EnableRule",
            "events:DisableRule",
          ],
          effect: iam.Effect.ALLOW,
          resources: ["*"],
        }),
        // CloudWatch Source Pipeline Policy
        new iam.PolicyStatement({
          actions: [
            "logs:CreateLogGroup",
            "logs:CreateLogStream",
            "logs:PutLogEvents",
            "logs:PutSubscriptionFilter",
            "logs:DeleteSubscriptionFilter",
            "logs:DescribeLogGroups",
            "logs:GetLogEvents",
            "logs:PutResourcePolicy",
            "logs:DescribeResourcePolicies",
          ],
          resources: [
            `arn:${Aws.PARTITION}:logs:${Aws.REGION}:${Aws.ACCOUNT_ID}:*`,
          ],
        }),
        new iam.PolicyStatement({
          actions: ["logs:CreateLogDelivery"],
          resources: ["*"],
        }),
        // Add eks policy documents
        new iam.PolicyStatement({
          actions: [
            "eks:DescribeCluster",
            "eks:ListIdentityProviderConfigs",
            "eks:UpdateClusterConfig",
            "eks:ListClusters",
          ],
          effect: iam.Effect.ALLOW,
          resources: [`arn:${Aws.PARTITION}:eks:*:${Aws.ACCOUNT_ID}:cluster/*`],
        }),
        new iam.PolicyStatement({
          actions: [
            "iam:GetServerCertificate",
            "iam:DetachRolePolicy",
            "iam:GetPolicy",
            "iam:TagRole",
            "iam:CreateRole",
            "iam:AttachRolePolicy",
            "iam:TagPolicy",
            "iam:GetOpenIDConnectProvider",
            "iam:TagOpenIDConnectProvider",
            "iam:CreateOpenIDConnectProvider",
            "iam:DeleteRole",
            // S3 as source
            "iam:PutRolePolicy",
            "iam:DeleteRolePolicy",
            "iam:RemoveRoleFromInstanceProfile",
            "iam:DeleteInstanceProfile",
            "iam:CreateInstanceProfile",
            "iam:AddRoleToInstanceProfile",
            "iam:PassRole",
            "iam:GetRole",
            "iam:GetRolePolicy",
          ],
          effect: iam.Effect.ALLOW,
          resources: [
            `arn:${Aws.PARTITION}:iam::${Aws.ACCOUNT_ID}:oidc-provider/*`,
            `arn:${Aws.PARTITION}:iam::${Aws.ACCOUNT_ID}:role/*`,
            `arn:${Aws.PARTITION}:iam::${Aws.ACCOUNT_ID}:server-certificate/*`,
            `arn:${Aws.PARTITION}:iam::${Aws.ACCOUNT_ID}:policy/*`,
            `arn:${Aws.PARTITION}:iam::${Aws.ACCOUNT_ID}:instance-profile/*`,
          ],
        }),
        // sts policy
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          resources: [
            `arn:${Aws.PARTITION}:iam::${parentAccountId.valueAsString}:role/*BufferAccessRole*`,
            `arn:${Aws.PARTITION}:iam::${parentAccountId.valueAsString}:role/AOS-Agent*`,
          ],
          actions: ["sts:AssumeRole"],
        }),
        // Resource handler policy
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          resources: ["*"],
          actions: ["cloudtrail:ListTrails", "cloudtrail:GetTrail"],
        }),
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          resources: ["*"],
          actions: [
            "cloudfront:ListDistributions",
            "cloudfront:GetDistributionConfig",
            "cloudfront:UpdateDistribution",
          ],
        }),
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          resources: ["*"],
          actions: ["lambda:ListFunctions"],
        }),
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          resources: ["*"],
          actions: ["rds:DescribeDBInstances", "rds:DescribeDBClusters"],
        }),
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          resources: ["*"],
          actions: [
            "elasticloadbalancing:DescribeLoadBalancers",
            "elasticloadbalancing:DescribeLoadBalancerAttributes",
            "elasticloadbalancing:ModifyLoadBalancerAttributes",
          ],
        }),
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          resources: ["*"],
          actions: [
            "wafv2:GetLoggingConfiguration",
            "wafv2:ListWebACLs",
            "wafv2:PutLoggingConfiguration",
            "wafv2:GetWebACL",
            "wafv2:GetSampledRequests",
          ],
        }),
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          resources: ["*"],
          actions: [
            "ec2:CreateFlowLogs",
            "ec2:DescribeFlowLogs",
            "ec2:DescribeVpcs",
            "ec2:DescribeSubnets",
            "ec2:DescribeSecurityGroups",
          ],
        }),
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          resources: ["*"],
          actions: ["config:DescribeDeliveryChannels"],
        }),
        // Give the main stack the policy to update the sub stack
        new iam.PolicyStatement({
          actions: [
            "cloudformation:CreateChangeSet",
            "cloudformation:CreateStack",
            "cloudformation:CreateStackInstances",
            "cloudformation:CreateStackSet",
            "cloudformation:CreateUploadBucket",
            "cloudformation:UpdateStack",
            "cloudformation:UpdateStackInstances",
            "cloudformation:UpdateStackSet",
            "cloudformation:UpdateTerminationProtection",
            "cloudformation:DeleteStack",
            "cloudformation:DeleteStackInstances",
            "cloudformation:DeleteStackSet",
            "cloudformation:DeleteChangeSet",
            "cloudformation:DescribeStacks",
          ],
          resources: ["*"],
        }),
        new iam.PolicyStatement({
          actions: [
            "sqs:DeleteMessage",
            "sqs:GetQueueUrl",
            "sqs:ListQueues",
            "sqs:ChangeMessageVisibility",
            "sqs:UntagQueue",
            "sqs:ReceiveMessage",
            "sqs:SendMessage",
            "sqs:GetQueueAttributes",
            "sqs:ListQueueTags",
            "sqs:TagQueue",
            "sqs:RemovePermission",
            "sqs:ListDeadLetterSourceQueues",
            "sqs:AddPermission",
            "sqs:PurgeQueue",
            "sqs:DeleteQueue",
            "sqs:CreateQueue",
            "sqs:SetQueueAttributes",
          ],
          resources: [
            `arn:${Aws.PARTITION}:sqs:${Aws.REGION}:${Aws.ACCOUNT_ID}:*`,
          ],
        }),
        new iam.PolicyStatement({
          actions: [
            "lambda:CreateFunction",
            "lambda:TagResource",
            "lambda:GetFunctionConfiguration",
            "lambda:ListProvisionedConcurrencyConfigs",
            "lambda:ListLayers",
            "lambda:ListLayerVersions",
            "lambda:DeleteFunction",
            "lambda:GetAlias",
            "lambda:ListCodeSigningConfigs",
            "lambda:UpdateFunctionEventInvokeConfig",
            "lambda:DeleteFunctionCodeSigningConfig",
            "lambda:ListFunctions",
            "lambda:GetEventSourceMapping",
            "lambda:InvokeFunction",
            "lambda:ListAliases",
            "lambda:GetFunctionUrlConfig",
            "lambda:AddLayerVersionPermission",
            "lambda:GetFunctionCodeSigningConfig",
            "lambda:UpdateAlias",
            "lambda:UpdateFunctionCode",
            "lambda:ListFunctionEventInvokeConfigs",
            "lambda:ListFunctionsByCodeSigningConfig",
            "lambda:ListEventSourceMappings",
            "lambda:PublishVersion",
            "lambda:DeleteEventSourceMapping",
            "lambda:CreateAlias",
            "lambda:ListVersionsByFunction",
            "lambda:GetLayerVersion",
            "lambda:PublishLayerVersion",
            "lambda:InvokeAsync",
            "lambda:GetAccountSettings",
            "lambda:CreateEventSourceMapping",
            "lambda:GetLayerVersionPolicy",
            "lambda:UntagResource",
            "lambda:RemoveLayerVersionPermission",
            "lambda:DeleteCodeSigningConfig",
            "lambda:ListTags",
            "lambda:DeleteLayerVersion",
            "lambda:PutFunctionEventInvokeConfig",
            "lambda:DeleteFunctionEventInvokeConfig",
            "lambda:CreateCodeSigningConfig",
            "lambda:PutFunctionCodeSigningConfig",
            "lambda:UpdateEventSourceMapping",
            "lambda:UpdateFunctionCodeSigningConfig",
            "lambda:GetFunction",
            "lambda:UpdateFunctionConfiguration",
            "lambda:ListFunctionUrlConfigs",
            "lambda:UpdateCodeSigningConfig",
            "lambda:AddPermission",
            "lambda:GetFunctionEventInvokeConfig",
            "lambda:DeleteAlias",
            "lambda:GetCodeSigningConfig",
            "lambda:DeleteFunctionUrlConfig",
            "lambda:RemovePermission",
            "lambda:GetPolicy",
          ],
          resources: [
            `arn:${Aws.PARTITION}:lambda:${Aws.REGION}:${Aws.ACCOUNT_ID}:*`,
          ],
        }),
        new iam.PolicyStatement({
          actions: [
            "ec2:createTags",
            "ec2:DescribeImages",
            "ec2:DescribeVpcs",
            "ec2:DescribeInstances",
            "ec2:DescribeSubnets",
            "ec2:DescribeVolumes",
            "ec2:DescribeTags",
            "ec2:CreateSecurityGroup",
            "ec2:DeleteSecurityGroup",
            "ec2:DescribeSecurityGroups",
            "ec2:RevokeSecurityGroupEgress",
            "ec2:AuthorizeSecurityGroupEgress",
          ],
          resources: [
            `arn:${Aws.PARTITION}:ec2:${Aws.REGION}:${Aws.ACCOUNT_ID}:*`,
          ],
        }),
        new iam.PolicyStatement({
          actions: [
            "autoscaling:CreateLaunchConfiguration",
            "autoscaling:CreateAutoScalingGroup",
            "autoscaling:DeleteAutoScalingGroup",
            "autoscaling:DeleteLaunchConfiguration",
            "autoscaling:UpdateAutoScalingGroup",
            "autoscaling:DescribeAutoScalingGroups",
            "autoscaling:DescribeAutoScalingInstances",
            "autoscaling:DescribeLaunchConfigurations",
            "autoscaling:EnableMetricsCollection",
            "autoscaling:DescribeScalingActivities",
            "autoscaling:PutScalingPolicy",
            "autoscaling:DeletePolicy",
          ],
          resources: ["*"],
        }),
      ],
    });
    crossAccountRole.attachInlinePolicy(crossAccountPolicy);
    NagSuppressions.addResourceSuppressions(crossAccountPolicy, [
      {
        id: "AwsSolutions-IAM5",
        reason: "The managed policy needs to use any resources in ssm",
      },
    ]);

    const cfnCrossAccountPolicy = crossAccountPolicy.node
      .defaultChild as iam.CfnPolicy;
    addCfnNagSuppressRules(cfnCrossAccountPolicy, [
      {
        id: "W12",
        reason: "The managed policy needs to use any resources in ssm",
      },
    ]);

    const newKMSKey = new kms.Key(this, `SQS-CMK`, {
      removalPolicy: RemovalPolicy.DESTROY,
      pendingWindow: Duration.days(7),
      description: "KMS-CMK for encrypting the objects in Log Hub SQS",
      enableKeyRotation: true,
      policy: new iam.PolicyDocument({
        statements: [
          new iam.PolicyStatement({
            actions: [
              "kms:CreateKey",
              "kms:CreateAlias",
              "kms:CreateCustomKeyStore",
              "kms:DescribeKey",
              "kms:DescribeCustomKeyStores",
              "kms:EnableKey",
              "kms:EnableKeyRotation",
              "kms:ListAliases",
              "kms:ListKeys",
              "kms:ListGrants",
              "kms:ListKeyPolicies",
              "kms:ListResourceTags",
              "kms:PutKeyPolicy",
              "kms:UpdateAlias",
              "kms:UpdateCustomKeyStore",
              "kms:UpdateKeyDescription",
              "kms:UpdatePrimaryRegion",
              "kms:RevokeGrant",
              "kms:GetKeyPolicy",
              "kms:GetParametersForImport",
              "kms:GetKeyRotationStatus",
              "kms:GetPublicKey",
              "kms:ScheduleKeyDeletion",
              "kms:GenerateDataKey",
              "kms:TagResource",
              "kms:UntagResource",
              "kms:Decrypt",
              "kms:Encrypt",
            ],
            resources: ["*"],
            effect: iam.Effect.ALLOW,
            principals: [new iam.AccountRootPrincipal()],
          }),
          new iam.PolicyStatement({
            actions: ["kms:GenerateDataKey*", "kms:Decrypt", "kms:Encrypt"],
            resources: ["*"], // support app log from s3 by not limiting the resource
            principals: [
              new iam.ServicePrincipal("s3.amazonaws.com"),
              new iam.ServicePrincipal("lambda.amazonaws.com"),
              new iam.ServicePrincipal("ec2.amazonaws.com"),
              new iam.ServicePrincipal("sqs.amazonaws.com"),
              new iam.ServicePrincipal("cloudwatch.amazonaws.com"),
            ],
          }),
        ],
      }),
    });

    // Download agent from CN if deployed in CN
    const isCN = new CfnCondition(this, "isCN", {
      expression: Fn.conditionEquals(Aws.PARTITION, "aws-cn"),
    });
    const s3Address = Fn.conditionIf(
      isCN.logicalId,
      "aws-solutions-assets.s3.cn-north-1.amazonaws.com.cn",
      "aws-gcr-solutions-assets.s3.amazonaws.com"
    ).toString();

    const installLogAgentDocument = new CfnDocument(
      this,
      "Fluent-BitDocumentInstallation",
      {
        content: {
          schemaVersion: "2.2",
          description:
            "Install Fluent-Bit and the AWS output plugins via AWS Systems Manager",
          parameters: {
            ARCHITECTURE: {
              type: "String",
              default: "",
              description: "(Required) Machine Architecture",
            },
            SYSTEMDPATH: {
              type: "String",
              default: "/usr/lib",
              description: "(Required) systemd path for current OS",
            },
          },
          mainSteps: [
            {
              action: "aws:downloadContent",
              name: "downloadFluentBit",
              inputs: {
                sourceType: "S3",
                sourceInfo: `{\"path\":\"https://${s3Address}/aws-for-fluent-bit%3A2.28.4/fluent-bit{{ARCHITECTURE}}.tar.gz\"}`,
                destinationPath: "/opt",
              },
            },
            {
              action: "aws:runShellScript",
              name: "installFluentBit",
              inputs: {
                runCommand: [
                  "cd /opt",
                  "sudo tar zxvf fluent-bit{{ARCHITECTURE}}.tar.gz",
                ],
              },
            },
            {
              action: "aws:runShellScript",
              name: "startFluentBit",
              inputs: {
                runCommand: [
                  "cat << EOF | sudo tee {{SYSTEMDPATH}}/systemd/system/fluent-bit.service",
                  "[Unit]",
                  "Description=Fluent Bit",
                  "Requires=network.target",
                  "After=network.target",
                  "",
                  "[Service]",
                  "Type=simple",
                  "ExecStart=/opt/fluent-bit/bin/fluent-bit -c /opt/fluent-bit/etc/fluent-bit.conf",
                  "Type=simple",
                  "Restart=always",
                  "",
                  "[Install]",
                  "WantedBy=multi-user.target",
                  "",
                  "EOF",
                  "sudo systemctl daemon-reload",
                  "sudo service fluent-bit restart",
                ],
              },
            },
          ],
        },
        documentFormat: "JSON",
        documentType: "Command",
        updateMethod: "NewVersion",
      }
    );

    const downloadLogConfigDocument = new CfnDocument(
      this,
      "Fluent-BitConfigDownloading",
      {
        content: {
          schemaVersion: "2.2",
          description:
            "Download Fluent-Bit config file and reboot the Fluent-Bit",
          parameters: {
            INSTANCEID: {
              type: "String",
              default: "",
              description: "(Required) Instance Id",
            },
          },
          mainSteps: [
            {
              action: "aws:runShellScript",
              name: "stopFluentBit",
              inputs: {
                runCommand: ["sudo service fluent-bit stop"],
              },
            },
            {
              action: "aws:downloadContent",
              name: "downloadFluentBitParserConfig",
              inputs: {
                sourceType: "S3",
                sourceInfo: `{\"path\":\"https://${loggingBucket.bucketRegionalDomainName}/app_log_config/{{INSTANCEID}}/applog_parsers.conf\"}`,
                destinationPath: "/opt/fluent-bit/etc",
              },
            },
            {
              action: "aws:downloadContent",
              name: "downloadFluentBitConfig",
              inputs: {
                sourceType: "S3",
                sourceInfo: `{\"path\":\"https://${loggingBucket.bucketRegionalDomainName}/app_log_config/{{INSTANCEID}}/fluent-bit.conf\"}`,
                destinationPath: "/opt/fluent-bit/etc",
              },
            },
            {
              action: "aws:downloadContent",
              name: "downloadUniformTimeFormatLua",
              inputs: {
                sourceType: "S3",
                sourceInfo: `{\"path\":\"https://${loggingBucket.bucketRegionalDomainName}/app_log_config/{{INSTANCEID}}/uniform-time-format.lua\"}`,
                destinationPath: "/opt/fluent-bit/etc",
              },
            },
            {
              action: "aws:runShellScript",
              name: "startFluentBit",
              inputs: {
                runCommand: [
                  "sudo systemctl enable fluent-bit.service",
                  "sudo service fluent-bit start",
                ],
              },
            },
          ],
        },
        documentFormat: "JSON",
        documentType: "Command",
        updateMethod: "NewVersion",
      }
    );

    new CfnOutput(this, "CrossAccountRoleARN", {
      description: "Cross Account Role ARN",
      value: crossAccountRole.roleArn,
    }).overrideLogicalId("CrossAccountRoleARN");

    new CfnOutput(this, "AgentInstallDocument", {
      description: "FluentBit Agent Installation Document",
      value: installLogAgentDocument.ref,
    }).overrideLogicalId("AgentInstallDocument");

    new CfnOutput(this, "AgentConfigDocument", {
      description: "FluentBit Agent Configuration Document",
      value: downloadLogConfigDocument.ref,
    }).overrideLogicalId("AgentConfigDocument");

    new CfnOutput(this, "CrossAccountS3Bucket", {
      description: "Cross Account S3 Bucket",
      value: loggingBucket.bucketName,
    }).overrideLogicalId("CrossAccountS3Bucket");

    new CfnOutput(this, "CrossAccountStackId", {
      description: "Cross Account CloudFormation Stack Id",
      value: this.stackId,
    }).overrideLogicalId("CrossAccountStackId");

    new CfnOutput(this, "CrossAccountKMSKeyARN", {
      description: "Cross Account KMS Key ARN",
      value: newKMSKey.keyArn,
    }).overrideLogicalId("CrossAccountKMSKeyARN");
  }
}
