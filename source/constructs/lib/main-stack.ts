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
  CfnParameter,
  CfnResource,
  CfnOutput,
  Duration,
  Fn,
  CfnMapping,
  RemovalPolicy,
  Stack,
  StackProps,
  aws_kms as kms,
  aws_iam as iam,
  aws_s3 as s3,
  aws_dynamodb as ddb,
} from "aws-cdk-lib";
import { Vpc } from "aws-cdk-lib/aws-ec2";
import { NagSuppressions } from "cdk-nag";
import { Construct } from "constructs";
import { APIStack } from "./api/api-stack";
import { AppLogIngestionStack } from "./api/app-log-ingestion-stack";
import { AppPipelineStack } from "./api/app-pipeline-stack";
import { EKSClusterStack } from "./api/eks-cluster-stack";
import { InstanceGroupStack } from "./api/instance-group-stack";
import { InstanceMetaStack } from "./api/instance-meta-stack";
import { LogConfStack } from "./api/log-conf-stack";
import { LogSourceStack } from "./api/log-source-stack";
import { AuthStack } from "./main/auth-stack";
import { CfnFlowStack } from "./main/cfn-flow-stack";
import { CustomResourceStack } from "./main/cr-stack";
import { EcsClusterStack } from "./main/ecs-cluster-stack";
import { PortalStack } from "./main/portal-stack";
import { VpcStack } from "./main/vpc-stack";

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

export interface MainProps extends StackProps {
  solutionName?: string;
  solutionDesc?: string;
  solutionId?: string;

  /**
   * Indicate whether to create a new VPC or use existing VPC for this Solution
   *
   * @default - false.
   */
  existingVpc?: boolean;
  /**
   * Indicate the auth type in which main stack uses
   */
  authType?: string;
}

export const enum AuthType {
  COGNITO = "AMAZON_COGNITO_USER_POOLS",
  OIDC = "OPENID_CONNECT",
}

/**
 * Main Stack
 */
export class MainStack extends Stack {
  private paramGroups: any[] = [];
  private paramLabels: any = {};

  //Default value for authType - cognito
  private authType = "AMAZON_COGNITO_USER_POOLS";
  private userPoolId = "";
  private userPoolClientId = "";
  private oidcProvider = "";
  private oidcClientId = "";
  private oidcCustomerDomain = "";
  private iamCertificateId = "";
  private acmCertificateArn = "";

  constructor(scope: Construct, id: string, props: MainProps) {
    super(scope, id, props);

    if (props?.authType === AuthType.OIDC) {
      this.authType = props.authType;
    }

    let solutionName = props.solutionName || "CentralizedLoggingWithOpenSearch";
    let solutionDesc =
      props.solutionDesc || "Centralized Logging with OpenSearch";
    let solutionId = props.solutionId || "SO8025";
    const stackPrefix = "CL";
    const oldSolutionName = "LogHub";

    this.templateOptions.description = `(${solutionId}) - ${solutionDesc} Solution. Template version ${VERSION}`;

    let oidcProvider: CfnParameter | null = null;
    let oidcClientId: CfnParameter | null = null;
    let oidcCustomerDomain: CfnParameter | null = null;
    let iamCertificateId: CfnParameter | null = null;

    if (this.authType === AuthType.OIDC) {
      oidcProvider = new CfnParameter(this, "OidcProvider", {
        type: "String",
        description: "Open Id Connector Provider Issuer",
        allowedPattern:
          "(https):\\/\\/[\\w\\-_]+(\\.[\\w\\-_]+)+([\\w\\-\\.,@?^=%&:/~\\+#]*[\\w\\-\\@?^=%&/~\\+#])?",
      });
      this.addToParamLabels("OidcProvider", oidcProvider.logicalId);
      this.oidcProvider = oidcProvider.valueAsString;

      oidcClientId = new CfnParameter(this, "OidcClientId", {
        type: "String",
        description: "OpenID Connector Client Id",
        allowedPattern: "^[^ ]+$",
      });
      this.addToParamLabels("OidcClientId", oidcClientId.logicalId);
      this.oidcClientId = oidcClientId.valueAsString;

      oidcCustomerDomain = new CfnParameter(this, "Domain", {
        type: "String",
        description:
          "The domain to access the console. Optional for AWS standard regions, and required for AWS China regions.",
        allowedPattern:
          "^(?=^.{3,255}$)[a-zA-Z0-9][-a-zA-Z0-9]{0,62}(.[a-zA-Z0-9][-a-zA-Z0-9]{0,62}).*|$",
        default: "",
      });
      this.addToParamLabels("Domain", oidcCustomerDomain.logicalId);
      this.oidcCustomerDomain = oidcCustomerDomain.valueAsString;

      iamCertificateId = new CfnParameter(this, "IamCertificateID", {
        type: "String",
        description: "IAM Certificate ID Number. Required for AWS China regions.",
        allowedPattern: "^[A-Z0-9]*$",
        default: "",
      });
      this.addToParamLabels("IamCertificateID", iamCertificateId.logicalId);
      this.iamCertificateId = iamCertificateId.valueAsString;

      const acmCertificateArn = new CfnParameter(this, "AcmCertificateArn", {
        type: "String",
        description:
          "ACM Certificate Arn. The certificate must be in the US East (N. Virginia) Region (us-east-1). Required for AWS standard regions, if you specify a custom domain.",
        allowedPattern: "^arn:aws.*:acm:us-east-1:.*|$",
        default: "",
      });
      this.addToParamLabels("AcmCertificateArn", acmCertificateArn.logicalId);
      this.acmCertificateArn = acmCertificateArn.valueAsString;

      this.addToParamGroups(
        "OpenID Connect (OIDC) Settings",
        oidcClientId.logicalId,
        oidcProvider.logicalId
      );
      this.addToParamGroups(
        "Console Settings",
        oidcCustomerDomain.logicalId,
        iamCertificateId.logicalId,
        acmCertificateArn.logicalId
      );
    } else {
      const username = new CfnParameter(this, "adminEmail", {
        type: "String",
        description: "The email address of Admin user",
        allowedPattern:
          "\\w[-\\w.+]*@([A-Za-z0-9][-A-Za-z0-9]+\\.)+[A-Za-z]{2,14}",
      });
      this.addToParamLabels("Admin User Email", username.logicalId);
      this.addToParamGroups("Authentication", username.logicalId);

      // Create an Auth Stack (Default Cognito)
      const authStack = new AuthStack(this, `LogHubAuth`, {
        username: username.valueAsString,
        solutionName: solutionName,
      });
      this.userPoolId = authStack.userPoolId;
      this.userPoolClientId = authStack.userPoolClientId;
      NagSuppressions.addResourceSuppressions(
        authStack,
        [
          {
            id: "AwsSolutions-IAM5",
            reason: "Cognito User Pool need this wildcard permission",
          },
          {
            id: "AwsSolutions-IAM4",
            reason: "these policy is used by CDK Customer Resource lambda",
          },
          {
            id: "AwsSolutions-COG2",
            reason:
              "customer can enable MFA by their own, we do not need to enable it",
          },
        ],
        true
      );
    }

    let vpc = undefined;
    let subnetIds = undefined;

    if (props?.existingVpc) {
      const vpcId = new CfnParameter(this, "vpcId", {
        description: "Select a VPC ID. e.g. vpc-bef13dc7",
        default: "",
        type: "AWS::EC2::VPC::Id",
      });
      vpcId.overrideLogicalId("vpcId");
      this.addToParamLabels("VPC Id", vpcId.logicalId);

      const publicSubnetIds = new CfnParameter(this, "publicSubnets", {
        description:
          "Public Subnet IDs in the selected VPC. Please provide two subnets at least delimited by comma, e.g. subnet-97bfc4cd,subnet-7ad7de32. The subnets must have routes point to an Internet Gateway.",
        type: "List<AWS::EC2::Subnet::Id>",
      });
      publicSubnetIds.overrideLogicalId("publicSubnets");
      this.addToParamLabels("Public Subnet IDs", publicSubnetIds.logicalId);

      const privateSubnetIds = new CfnParameter(this, "privateSubnets", {
        description:
          "Private Subnet IDs in the selected VPC. Please provide two subnets at least delimited by comma, e.g. subnet-97bfc4cd,subnet-7ad7de32. The subnets must have routes to an NAT gateway.",
        type: "List<AWS::EC2::Subnet::Id>",
      });
      privateSubnetIds.overrideLogicalId("privateSubnets");
      this.addToParamLabels("Private Subnet IDs", privateSubnetIds.logicalId);
      this.addToParamGroups(
        "Existing VPC Info",
        vpcId.logicalId,
        publicSubnetIds.logicalId,
        privateSubnetIds.logicalId
      );

      // Import VPC
      vpc = Vpc.fromVpcAttributes(this, `DefaultVPC`, {
        vpcId: vpcId.valueAsString,
        availabilityZones: Fn.getAzs(),
        publicSubnetIds: publicSubnetIds.valueAsList,
        privateSubnetIds: privateSubnetIds.valueAsList,
      });

      subnetIds = privateSubnetIds.valueAsList;
    }

    const vpcStack = new VpcStack(this, `${oldSolutionName}Vpc`, {
      vpc: vpc,
    });

    // Create a CMK for SQS encryption
    const sqsCMKKey = new kms.Key(this, "KMSCMK", {
      removalPolicy: RemovalPolicy.DESTROY,
      pendingWindow: Duration.days(7),
      description: "KMS-CMK for encrypting the objects in the SQS",
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

    // Create a table to store cross account info
    const subAccountLinkTable = new ddb.Table(this, "SubAccountLinkTable", {
      partitionKey: {
        name: "id",
        type: ddb.AttributeType.STRING,
      },
      billingMode: ddb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY,
      encryption: ddb.TableEncryption.DEFAULT,
      pointInTimeRecovery: true,
    });

    const cfnSubAccountLinkTable = subAccountLinkTable.node
      .defaultChild as ddb.CfnTable;
    cfnSubAccountLinkTable.overrideLogicalId("SubAccountLinkTable");
    addCfnNagSuppressRules(cfnSubAccountLinkTable, [
      {
        id: "W73",
        reason: "This table has billing mode as PROVISIONED",
      },
      {
        id: "W74",
        reason:
          "This table is set to use DEFAULT encryption, the key is owned by DDB.",
      },
    ]);

    // Create a common orchestration flow for CloudFormation deployment
    const cfnFlow = new CfnFlowStack(this, 'CfnFlow', {
      stackPrefix: stackPrefix,
      subAccountLinkTable: subAccountLinkTable,
      solutionId: solutionId,
    });
    NagSuppressions.addResourceSuppressions(
      cfnFlow,
      [
        {
          id: "AwsSolutions-IAM5",
          reason: "Lambda need get dynamic resources",
        },
      ],
      true
    );

    // Create a default logging bucket
    const loggingBucket = new s3.Bucket(
      this,
      `${oldSolutionName}LoggingBucket`,
      {
        encryption: s3.BucketEncryption.S3_MANAGED,
        blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
        accessControl: s3.BucketAccessControl.LOG_DELIVERY_WRITE,
        versioned: true,
        enforceSSL: true,
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
      }
    );
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

    const cfnLoggingBucket = loggingBucket.node.defaultChild as s3.CfnBucket;
    addCfnNagSuppressRules(cfnLoggingBucket, [
      {
        id: "W35",
        reason: "this is a logging bucket hence no access logging required",
      },
      {
        id: "W51",
        reason: "Already have bucket policy for log delivery",
      },
    ]);

    // Create the Appsync API stack
    const apiStack = new APIStack(this, 'API', {
      cfnFlowSMArn: cfnFlow.stateMachineArn,
      oidcClientId: this.oidcClientId,
      oidcProvider: this.oidcProvider,
      userPoolId: this.userPoolId,
      userPoolClientId: this.userPoolClientId,
      defaultLoggingBucket: loggingBucket.bucketName,
      vpc: vpcStack.vpc,
      subnetIds: subnetIds ? subnetIds : vpcStack.subnetIds,
      processSgId: vpcStack.processSg.securityGroupId,
      authType: this.authType,
      subAccountLinkTable: subAccountLinkTable,
      solutionId: solutionId,
      stackPrefix: stackPrefix,
    });
    NagSuppressions.addResourceSuppressions(
      apiStack,
      [
        {
          id: "AwsSolutions-IAM5",
          reason: "Lambda need get dynamic resources",
        },
      ],
      true
    );
    // Create the Instance Meta Appsync API stack
    const instanceMetaStack = new InstanceMetaStack(
      this,
      'InstanceMetaAPI',
      {
        graphqlApi: apiStack.graphqlApi,
        subAccountLinkTable: subAccountLinkTable,
        centralAssumeRolePolicy: apiStack.centralAssumeRolePolicy,
        solutionId: solutionId,
      }
    );
    NagSuppressions.addResourceSuppressions(
      instanceMetaStack,
      [
        {
          id: "AwsSolutions-IAM5",
          reason: "Lambda need get dynamic resources",
        },
      ],
      true
    );

    // Create the App Pipeline Appsync API stack
    const appPipelineStack = new AppPipelineStack(
      this,
      'AppPipelineAPI',
      {
        graphqlApi: apiStack.graphqlApi,
        cfnFlowSMArn: cfnFlow.stateMachineArn,
        appPipelineTable: apiStack.appPipelineTable,
        centralAssumeRolePolicy: apiStack.centralAssumeRolePolicy,
        solutionId: solutionId,
        stackPrefix: stackPrefix,
      }
    );
    NagSuppressions.addResourceSuppressions(
      appPipelineStack,
      [
        {
          id: "AwsSolutions-IAM5",
          reason: "Lambda need get dynamic resources",
        },
      ],
      true
    );

    // Create the Instance Group Appsync API stack
    const instanceGroupStack = new InstanceGroupStack(
      this,
      'InstanceGroupAPI',
      {
        graphqlApi: apiStack.graphqlApi,
        eventBridgeRule: instanceMetaStack.eventBridgeRule,
        centralAssumeRolePolicy: apiStack.centralAssumeRolePolicy,
        appLogIngestionTable: appPipelineStack.appLogIngestionTable,
        groupModificationEventQueue: apiStack.groupModificationEventQueue,
        subAccountLinkTable: subAccountLinkTable,
        solutionId: solutionId,
      }
    );
    instanceGroupStack.node.addDependency(instanceMetaStack);
    NagSuppressions.addResourceSuppressions(
      instanceGroupStack,
      [
        {
          id: "AwsSolutions-IAM5",
          reason: "Lambda need get dynamic resources",
        },
      ],
      true
    );

    // Create the Logging Conf Appsync API stack
    const logConfStack = new LogConfStack(this, 'LogConfAPI', {
      graphqlApi: apiStack.graphqlApi,
      solutionId: solutionId,
    });

    // Create the Logging Source Appsync API stack
    const logSourceStack = new LogSourceStack(
      this,
      'LogSourceAPI',
      {
        graphqlApi: apiStack.graphqlApi,
        eksClusterLogSourceTable: apiStack.eksClusterLogSourceTable,
        centralAssumeRolePolicy: apiStack.centralAssumeRolePolicy,
        defaultVPC: vpcStack.vpc.vpcId,
        defaultPublicSubnets: subnetIds ? subnetIds : vpcStack.subnetIds,
        asyncCrossAccountHandler: apiStack.asyncCrossAccountHandler,
      }
    );
    NagSuppressions.addResourceSuppressions(
      logSourceStack,
      [
        {
          id: "AwsSolutions-IAM5",
          reason: "Lambda need get dynamic resources",
        },
      ],
      true
    );

    // Create the EKS related Appsync API stack
    const eksClusterStack = new EKSClusterStack(
      this,
      'EKSClusterStack',
      {
        graphqlApi: apiStack.graphqlApi,
        appLogIngestionTable: appPipelineStack.appLogIngestionTable,
        aosDomainTable: apiStack.clusterTable,
        eksClusterLogSourceTable: apiStack.eksClusterLogSourceTable,
        centralAssumeRolePolicy: apiStack.centralAssumeRolePolicy,
        subAccountLinkTable: subAccountLinkTable,
        solutionId: solutionId,
        stackPrefix: stackPrefix,
      }
    );
    NagSuppressions.addResourceSuppressions(
      eksClusterStack,
      [
        {
          id: "AwsSolutions-IAM5",
          reason: "Lambda need get dynamic resources",
        },
      ],
      true
    );

    // Create the ECS Stack
    const ecsClusterStack = new EcsClusterStack(
      this,
      'ECSClusterStack',
      {
        vpc: vpcStack.vpc,
      }
    );

    // Create the Logging Ingestion Appsync API stack
    const appLogIngestionStack = new AppLogIngestionStack(
      this,
      'AppLogIngestionAPI',
      {
        cfnFlowSMArn: cfnFlow.stateMachineArn,
        graphqlApi: apiStack.graphqlApi,
        defaultVPC: vpcStack.vpc.vpcId,
        defaultPublicSubnets: subnetIds ? subnetIds : vpcStack.subnetIds,
        cmkKeyArn: sqsCMKKey.keyArn,
        instanceGroupTable: instanceGroupStack.instanceGroupTable,
        instanceMetaTable: instanceMetaStack.instanceMetaTable,
        logConfTable: logConfStack.logConfTable,
        appPipelineTable: apiStack.appPipelineTable,
        appLogIngestionTable: appPipelineStack.appLogIngestionTable,
        ec2LogSourceTable: logSourceStack.ec2LogSourceTable,
        s3LogSourceTable: logSourceStack.s3LogSourceTable,
        logSourceTable: logSourceStack.logSourceTable,
        eksClusterLogSourceTable: apiStack.eksClusterLogSourceTable,
        sqsEventTable: apiStack.sqsEventTable,
        configFileBucket: loggingBucket,
        subAccountLinkTable: subAccountLinkTable,
        centralAssumeRolePolicy: apiStack.centralAssumeRolePolicy,
        ecsCluster: ecsClusterStack.ecsCluster,
        groupModificationEventQueue: apiStack.groupModificationEventQueue,
        solutionId: solutionId,
        stackPrefix: stackPrefix,
      }
    );
    appLogIngestionStack.node.addDependency(
      sqsCMKKey,
      instanceGroupStack,
      instanceMetaStack,
      logConfStack,
      appPipelineStack,
      ecsClusterStack
    );
    NagSuppressions.addResourceSuppressions(
      appLogIngestionStack,
      [
        {
          id: "AwsSolutions-IAM5",
          reason: "Lambda need get dynamic resources",
        },
      ],
      true
    );

    // Create a Portal Stack (Default Cognito)
    const portalStack = new PortalStack(this, "WebConsole", {
      apiEndpoint: apiStack.apiEndpoint,
      customDomainName: this.oidcCustomerDomain,
      iamCertificateId: this.iamCertificateId,
      acmCertificateArn: this.acmCertificateArn,
      authenticationType: this.authType,
    });
    portalStack.node.addDependency(sqsCMKKey);

    // Perform actions during solution deployment or update
    const crStack = new CustomResourceStack(this, "CR", {
      apiEndpoint: apiStack.apiEndpoint,
      oidcProvider: this.oidcProvider,
      oidcClientId: this.oidcClientId,
      portalBucketName: portalStack.portalBucket.bucketName,
      portalUrl: portalStack.portalUrl,
      cloudFrontDistributionId: portalStack.cloudFrontDistributionId,
      oidcCustomerDomain: this.oidcCustomerDomain,
      userPoolId: this.userPoolId,
      userPoolClientId: this.userPoolClientId,
      defaultLoggingBucket: loggingBucket.bucketName,
      cmkKeyArn: sqsCMKKey.keyArn,
      authenticationType: this.authType,
      eksDeployKindTableName: eksClusterStack.eksDeploymentKindTable.tableName,
      eksLogSourceTableName: apiStack.eksClusterLogSourceTable.tableName,
      appPipelineTableName: apiStack.appPipelineTable.tableName,
      pipelineTableName: apiStack.pipelineTable.tableName,
      centralAssumeRolePolicy: apiStack.centralAssumeRolePolicy,
      subAccountLinkTableName: subAccountLinkTable.tableName
    });

    // Allow init config function to put aws-exports.json to portal bucket
    portalStack.portalBucket.grantPut(crStack.initConfigFn);
    apiStack.eksClusterLogSourceTable.grantReadWriteData(crStack.initConfigFn);
    eksClusterStack.eksDeploymentKindTable.grantReadWriteData(
      crStack.initConfigFn
    );
    apiStack.appPipelineTable.grantReadWriteData(crStack.initConfigFn);
    apiStack.pipelineTable.grantReadWriteData(crStack.initConfigFn);
    subAccountLinkTable.grantReadWriteData(crStack.initConfigFn)

    this.templateOptions.metadata = {
      "AWS::CloudFormation::Interface": {
        ParameterGroups: this.paramGroups,
        ParameterLabels: this.paramLabels,
      },
    };

    new CfnOutput(this, "DefaultLoggingBucket", {
      description: "Default S3 Buckets to store logs",
      value: loggingBucket.bucketName,
    }).overrideLogicalId("DefaultLoggingBucket");

    // Output portal Url
    new CfnOutput(this, "WebConsoleUrl", {
      description: "Web Console URL (front-end)",
      value: portalStack.portalUrl,
    }).overrideLogicalId("WebConsoleUrl");
  }

  private addToParamGroups(label: string, ...param: string[]) {
    this.paramGroups.push({
      Label: { default: label },
      Parameters: param,
    });
  }

  private addToParamLabels(label: string, param: string) {
    this.paramLabels[param] = {
      default: label,
    };
  }
}
