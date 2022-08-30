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
        actions: ["s3:PutBucketNotification", "s3:Get*"],
        effect: iam.Effect.ALLOW,
        principals: [new iam.AccountPrincipal(parentAccountId.valueAsString)],
      })
    );

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
          ],
        }),
        // Read Data from Sub Account bucket created by Log Hub
        new iam.PolicyStatement({
          actions: [
            "s3:Get*",
            "s3:List*",
            "s3-object-lambda:Get*",
            "s3-object-lambda:List*",
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
            "s3:PutBucketLogging",
            "s3:Get*",
            "s3:CreateBucket",
            "s3:ListBucket",
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
            `arn:${Aws.PARTITION}:iam::${parentAccountId.valueAsString}:role/*DataBufferKDSRole*`,
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
            "cloudformation:Create*",
            "cloudformation:Update*",
            "cloudformation:Delete*",
            "cloudformation:DescribeStacks",
          ],
          resources: ["*"],
        }),
        new iam.PolicyStatement({
          actions: ["sqs:*"],
          resources: [
            `arn:${Aws.PARTITION}:sqs:${Aws.REGION}:${Aws.ACCOUNT_ID}:*`,
          ],
        }),
        new iam.PolicyStatement({
          actions: ["lambda:*"],
          resources: [
            `arn:${Aws.PARTITION}:lambda:${Aws.REGION}:${Aws.ACCOUNT_ID}:*`,
          ],
        }),
        new iam.PolicyStatement({
          actions: ["ec2:*"],
          resources: [
            `arn:${Aws.PARTITION}:ec2:${Aws.REGION}:${Aws.ACCOUNT_ID}:*`,
          ],
        }),
        new iam.PolicyStatement({
          actions: ["autoscaling:*"],
          resources: ["*"],
        }),
      ],
    });
    crossAccountRole.attachInlinePolicy(crossAccountPolicy);

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
              "kms:Create*",
              "kms:Describe*",
              "kms:Enable*",
              "kms:List*",
              "kms:Put*",
              "kms:Update*",
              "kms:Revoke*",
              "kms:Get*",
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
              description: "(Required) Machine Architucture",
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
                sourceInfo: `{\"path\":\"https://${s3Address}/aws-for-fluent-bit%3A2.21.1/fluent-bit{{ARCHITECTURE}}.tar.gz\"}`,
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
