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
import { VpcStack } from "./main/vpc-stack";
import { AuthStack } from "./main/auth-stack";
import { PortalStack } from "./main/portal-stack";
import { APIStack } from "./api/api-stack";
import { CfnFlowStack } from "./main/cfn-flow-stack";
import { LogConfStack } from "./api/log-conf-stack";
import { LogSourceStack } from "./api/log-source-stack";
import { InstanceGroupStack } from "./api/instance-group-stack";
import { InstanceMetaStack } from "./api/instance-meta-stack";
import { AppPipelineStack } from "./api/app-pipeline-stack";
import { AppLogIngestionStack } from "./api/app-log-ingestion-stack";
import { EKSClusterStack } from "./api/eks-cluster-stack";

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

  //Default value for authType - cognito
  private authType = "AMAZON_COGNITO_USER_POOLS";
  private userPoolId = "";
  private userPoolClientId = "";
  private oidcProvider = "";
  private oidcClientId = "";
  private oidcCustomerDomain = "";
  private iamCertificateId = "";

  constructor(scope: Construct, id: string, props?: MainProps) {
    super(scope, id, props);

    const solutionName = "LogHub";
    const solutionDesc = "Log Hub";

    if (props?.authType === AuthType.OIDC) {
      this.authType = props.authType;
    }

    this.templateOptions.description = `(SO8025) - ${solutionDesc} Solution. Template version ${VERSION}`;

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
        description: "OpenId Connector Client Id",
        allowedPattern: "^[^ ]+$",
      });
      this.addToParamLabels("OidcClientId", oidcClientId.logicalId);
      this.oidcClientId = oidcClientId.valueAsString;

      oidcCustomerDomain = new CfnParameter(this, "Domain", {
        type: "String",
        description: "The domain to access Log Hub console",
        allowedPattern: "^(?=^.{3,255}$)[a-zA-Z0-9][-a-zA-Z0-9]{0,62}(\.[a-zA-Z0-9][-a-zA-Z0-9]{0,62})+$",
      });
      this.addToParamLabels("Domain", oidcCustomerDomain.logicalId);
      this.oidcCustomerDomain = oidcCustomerDomain.valueAsString;

      iamCertificateId = new CfnParameter(this, "IamCertificateID", {
        type: "String",
        description: "IAM Certificate ID Number",
        allowedPattern: "^[A-Z0-9]+$",
      });
      this.addToParamLabels("IamCertificateID", iamCertificateId.logicalId);
      this.iamCertificateId = iamCertificateId.valueAsString;

      this.addToParamGroups(
        "OIDC Settings",
        oidcClientId.logicalId,
        oidcProvider.logicalId
      );
      this.addToParamGroups(
        "Log Hub Console Settings",
        oidcCustomerDomain.logicalId,
        iamCertificateId.logicalId
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
      const authStack = new AuthStack(this, `${solutionName}Auth`, {
        username: username.valueAsString,
      });
      this.userPoolId = authStack.userPoolId;
      this.userPoolClientId = authStack.userPoolClientId;
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
          "Public Subnet IDs in seleted VPC. Please provide two subnets at least delimited by comma, e.g. subnet-97bfc4cd,subnet-7ad7de32",
        type: "List<AWS::EC2::Subnet::Id>",
      });
      publicSubnetIds.overrideLogicalId("publicSubnets");
      this.addToParamLabels("Public Subnet IDs", publicSubnetIds.logicalId);

      const privateSubnetIds = new CfnParameter(this, "privateSubnets", {
        description:
          "Private Subnet IDs in seleted VPC. Please provide two subnets at least delimited by comma, e.g. subnet-97bfc4cd,subnet-7ad7de32",
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

    const vpcStack = new VpcStack(this, `${solutionName}Vpc`, {
      vpc: vpc,
    });

    // Create a CMK for SQS encryption
    const sqsCMKKey = new kms.Key(this, "KMSCMK", {
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

    // Create a table to store cross account info
    const subAccountLinkTable = new ddb.Table(this, 'SubAccountLinkTable', {
      partitionKey: {
        name: 'id',
        type: ddb.AttributeType.STRING
      },
      billingMode: ddb.BillingMode.PROVISIONED,
      removalPolicy: RemovalPolicy.DESTROY,
      encryption: ddb.TableEncryption.DEFAULT,
      pointInTimeRecovery: true,
    })

    const cfnSubAccountLinkTable = subAccountLinkTable.node.defaultChild as ddb.CfnTable;
    cfnSubAccountLinkTable.overrideLogicalId('SubAccountLinkTable')
    addCfnNagSuppressRules(cfnSubAccountLinkTable, [
      {
        id: 'W73',
        reason: 'This table has billing mode as PROVISIONED'
      },
      {
        id: 'W74',
        reason: 'This table is set to use DEFAULT encryption, the key is owned by DDB.'
      },
    ])

    // Create a common orchestration flow for CloudFormation deployment
    const cfnFlow = new CfnFlowStack(this, `${solutionName}CfnFlow`, {
      stackPrefix: solutionName,
      subAccountLinkTable: subAccountLinkTable,
    });

    // Create a default logging bucket
    const loggingBucket = new s3.Bucket(this, `${solutionName}LoggingBucket`, {
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      accessControl: s3.BucketAccessControl.LOG_DELIVERY_WRITE,
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
    const apiStack = new APIStack(this, `${solutionName}API`, {
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
    });

    // Create the Instance Meta Appsync API stack
    const instanceMetaStack = new InstanceMetaStack(
      this,
      `${solutionName}InstanceMetaAPI`,
      {
        graphqlApi: apiStack.graphqlApi,
        subAccountLinkTable: subAccountLinkTable,
        centralAssumeRolePolicy: apiStack.centralAssumeRolePolicy,
      }
    );

    // Create the Instance Group Appsync API stack
    const instanceGroupStack = new InstanceGroupStack(
      this,
      `${solutionName}InstanceGroupAPI`,
      {
        graphqlApi: apiStack.graphqlApi,
        eventBridgeRule: instanceMetaStack.eventBridgeRule,
        centralAssumeRolePolicy: apiStack.centralAssumeRolePolicy,
      }
    );
    instanceGroupStack.node.addDependency(instanceMetaStack);

    // Create the Logging Conf Appsync API stack
    const logConfStack = new LogConfStack(this, `${solutionName}LogConfAPI`, {
      graphqlApi: apiStack.graphqlApi,
    });

    // Create the Logging Source Appsync API stack
    const logSourceStack = new LogSourceStack(
      this,
      `${solutionName}LogSourceAPI`,
      {
        graphqlApi: apiStack.graphqlApi,
        eksClusterLogSourceTable: apiStack.eksClusterLogSourceTable,
        centralAssumeRolePolicy: apiStack.centralAssumeRolePolicy,
        defaultVPC: vpcStack.vpc.vpcId,
        defaultPublicSubnets: subnetIds ? subnetIds : vpcStack.subnetIds,
        asyncCrossAccountHandler: apiStack.asyncCrossAccountHandler
      }
    );

    // Create the App Pipeline Appsync API stack
    const appPipelineStack = new AppPipelineStack(
      this,
      `${solutionName}AppPipelineAPI`,
      {
        graphqlApi: apiStack.graphqlApi,
        cfnFlowSMArn: cfnFlow.stateMachineArn,
        appPipelineTable: apiStack.appPipelineTable,
        centralAssumeRolePolicy: apiStack.centralAssumeRolePolicy,
      }
    );

    // Create the Logging Conf Appsync API stack
    const eksClusterStack = new EKSClusterStack(
      this,
      `${solutionName}EKSClusterStack`,
      {
        graphqlApi: apiStack.graphqlApi,
        appLogIngestionTable: appPipelineStack.appLogIngestionTable,
        aosDomainTable: apiStack.clusterTable,
        eksClusterLogSourceTable: apiStack.eksClusterLogSourceTable,
        centralAssumeRolePolicy: apiStack.centralAssumeRolePolicy,
        subAccountLinkTable: subAccountLinkTable,
      }
    );

    // Create the Logging Ingestion Appsync API stack
    const appLogIngestionStack = new AppLogIngestionStack(
      this,
      `${solutionName}AppLogIngestionAPI`,
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
        eksClusterLogSourceTable: apiStack.eksClusterLogSourceTable,
        configFileBucket: loggingBucket,
        logAgentEKSDeploymentKindTable:
          eksClusterStack.logAgentEKSDeploymentKindTable,
        subAccountLinkTable: subAccountLinkTable,
        centralAssumeRolePolicy: apiStack.centralAssumeRolePolicy,
      }
    );
    appLogIngestionStack.node.addDependency(
      sqsCMKKey,
      instanceGroupStack,
      instanceMetaStack,
      logConfStack,
      appPipelineStack
    );

    // Create a Portal Stack (Default Cognito)
    const portalStack = new PortalStack(this, "WebConsole", {
      apiEndpoint: apiStack.apiEndpoint,
      oidcProvider: this.oidcProvider,
      oidcClientId: this.oidcClientId,
      oidcCustomerDomain: this.oidcCustomerDomain,
      userPoolId: this.userPoolId,
      userPoolClientId: this.userPoolClientId,
      iamCertificateId: this.iamCertificateId,
      defaultLoggingBucket: loggingBucket.bucketName,
      cmkKeyArn: sqsCMKKey.keyArn,
      authenticationType: this.authType,
    });
    portalStack.node.addDependency(sqsCMKKey);

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
  }
}
