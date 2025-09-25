// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import {
  Aspects,
  Aws,
  CfnCondition,
  CfnMapping,
  CfnOutput,
  CfnParameter,
  CfnResource,
  aws_cognito as cognito,
  Duration,
  aws_ec2 as ec2,
  Fn,
  aws_iam as iam,
  IAspect,
  aws_kms as kms,
  RemovalPolicy,
  aws_s3 as s3,
  aws_sqs as sqs,
  Stack,
  StackProps,
} from 'aws-cdk-lib';
import { Vpc } from 'aws-cdk-lib/aws-ec2';
import { NagSuppressions } from 'cdk-nag';
import { Construct, IConstruct } from 'constructs';
import { APIStack } from './api/api-stack';
import { AuthStack } from './main/auth-stack';

import { CustomResourceStack } from './main/cr-stack';
import { EcsClusterStack } from './main/ecs-cluster-stack';
import { PortalStack } from './main/portal-stack';
import { VpcStack } from './main/vpc-stack';
import { MicroBatchStack } from './microbatch/main/services/amazon-services-stack';
import { SolutionMetrics } from './solution-metrics/solution-metrics-construct';
import {
  EnforceUnmanagedS3BucketNotificationsAspects,
  UseS3BucketNotificationsWithRetryAspects,
} from './util/stack-helper';
import { CfnGuardSuppressResourceList } from '../lib/util/add-cfn-guard-suppression';

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

export interface MainProps extends StackProps {
  solutionName: string;
  solutionDesc?: string;
  solutionId: string;

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
  COGNITO = 'AMAZON_COGNITO_USER_POOLS',
  OIDC = 'OPENID_CONNECT',
}

/**
 * Main Stack
 */
export class MainStack extends Stack {
  private paramGroups: any[] = [];
  private paramLabels: any = {};

  //Default value for authType - cognito
  private authType = 'AMAZON_COGNITO_USER_POOLS';
  private userPoolId = '';
  private userPoolClientId = '';
  private oidcProvider = '';
  private oidcClientId = '';
  private oidcCustomerDomain = '';
  private iamCertificateId = '';
  private acmCertificateArn = '';

  constructor(scope: Construct, id: string, props: MainProps) {
    super(scope, id, props);

    if (props?.authType === AuthType.OIDC) {
      this.authType = props.authType;
    }

    let solutionName = props.solutionName || 'CentralizedLoggingWithOpenSearch';
    let solutionDesc =
      props.solutionDesc || 'Centralized Logging with OpenSearch';
    let solutionId = props.solutionId || 'SO8025';
    const stackPrefix = 'CL';

    this.templateOptions.description = `(${solutionId}) - ${solutionDesc} Solution. Template version ${VERSION}`;

    let oidcProvider: CfnParameter | null = null;
    let oidcClientId: CfnParameter | null = null;
    let oidcCustomerDomain: CfnParameter | null = null;
    let iamCertificateId: CfnParameter | null = null;
    let microBatchStack: MicroBatchStack;

    const username = new CfnParameter(this, 'adminEmail', {
      type: 'String',
      description: 'The email address of Admin user',
      allowedPattern:
        '\\w[-\\w.+]*@([A-Za-z0-9][-A-Za-z0-9]+\\.)+[A-Za-z]{2,14}',
    });
    this.addToParamLabels('Admin User Email', username.logicalId);
    this.addToParamGroups('Authentication', username.logicalId);

    const metricsMapping = new CfnMapping(this, 'AnonymousData', {
      mapping: {
        SendAnonymizedUsageData: {
          Data: 'Yes',
        },
      },
    });

    const metricsConstruct = new SolutionMetrics(this, 'SolutionMetrics', {
      solutionId: solutionId,
      solutionVersion: VERSION!,
      template: this.stackName,
      sendMetrics: metricsMapping.findInMap('SendAnonymizedUsageData', 'Data'),
    });

    const solutionUuid = Fn.conditionIf(
      new CfnCondition(this, 'AnonymousDatatoAWS', {
        expression: Fn.conditionEquals(
          metricsMapping.findInMap('SendAnonymizedUsageData', 'Data'),
          'Yes'
        ),
      }).logicalId,
      metricsConstruct.uuidCustomResource.getAtt('UUID'),
      ''
    );

    // Create China partition condition and resolve template URLs
    const isChinaCondition = new CfnCondition(this, 'IsChinaPartition', {
      expression: Fn.conditionEquals(Aws.PARTITION, 'aws-cn'),
    });

    const templateBucketBase =
      process.env.TEMPLATE_OUTPUT_BUCKET || 'aws-gcr-solutions';
    const globalTemplateBucket = templateBucketBase;
    const chinaTemplateBucket = `${templateBucketBase}-cn`;

    const templateBaseUrl = Fn.conditionIf(
      isChinaCondition.logicalId,
      `https://${chinaTemplateBucket}.s3.cn-north-1.amazonaws.com.cn`,
      `https://${globalTemplateBucket}.s3.amazonaws.com`
    ).toString();

    const s3Endpoint = Fn.conditionIf(
      isChinaCondition.logicalId,
      'https://s3.cn-north-1.amazonaws.com.cn',
      'https://s3.amazonaws.com'
    ).toString();

    const templateBucketName = Fn.conditionIf(
      isChinaCondition.logicalId,
      chinaTemplateBucket,
      globalTemplateBucket
    ).toString();

    if (this.authType === AuthType.OIDC) {
      oidcProvider = new CfnParameter(this, 'OidcProvider', {
        type: 'String',
        description: 'Open Id Connector Provider Issuer',
        allowedPattern:
          '(https):\\/\\/[\\w\\-_]+(\\.[\\w\\-_]+)+([\\w\\-\\.,@?^=%&:/~\\+#]*[\\w\\-\\@?^=%&/~\\+#])?',
      });
      this.addToParamLabels('OidcProvider', oidcProvider.logicalId);
      this.oidcProvider = oidcProvider.valueAsString;

      oidcClientId = new CfnParameter(this, 'OidcClientId', {
        type: 'String',
        description: 'OpenID Connector Client Id',
        allowedPattern: '^[^ ]+$',
      });
      this.addToParamLabels('OidcClientId', oidcClientId.logicalId);
      this.oidcClientId = oidcClientId.valueAsString;

      oidcCustomerDomain = new CfnParameter(this, 'Domain', {
        type: 'String',
        description:
          'The domain to access the console. Optional for AWS standard regions, and required for AWS China regions.',
        allowedPattern:
          '^(?=^.{3,255}$)[a-zA-Z0-9][-a-zA-Z0-9]{0,62}(.[a-zA-Z0-9][-a-zA-Z0-9]{0,62}).*|$',
        default: '',
      });
      this.addToParamLabels('Domain', oidcCustomerDomain.logicalId);
      this.oidcCustomerDomain = oidcCustomerDomain.valueAsString;

      iamCertificateId = new CfnParameter(this, 'IamCertificateID', {
        type: 'String',
        description:
          'IAM Certificate ID Number. Required for AWS China regions.',
        allowedPattern: '^[A-Z0-9]*$',
        default: '',
      });
      this.addToParamLabels('IamCertificateID', iamCertificateId.logicalId);
      this.iamCertificateId = iamCertificateId.valueAsString;

      const acmCertificateArn = new CfnParameter(this, 'AcmCertificateArn', {
        type: 'String',
        description:
          'ACM Certificate Arn. The certificate must be in the US East (N. Virginia) Region (us-east-1). Required for AWS standard regions, if you specify a custom domain.',
        allowedPattern: '^arn:aws.*:acm:us-east-1:.*|$',
        default: '',
      });
      this.addToParamLabels('AcmCertificateArn', acmCertificateArn.logicalId);
      this.acmCertificateArn = acmCertificateArn.valueAsString;

      this.addToParamGroups(
        'OpenID Connect (OIDC) Settings',
        oidcClientId.logicalId,
        oidcProvider.logicalId
      );
      this.addToParamGroups(
        'Console Settings',
        oidcCustomerDomain.logicalId,
        iamCertificateId.logicalId,
        acmCertificateArn.logicalId
      );
    } else {
      // Create an Auth Stack (Default Cognito)
      const authStack = new AuthStack(this, `${stackPrefix}Auth`, {
        username: username.valueAsString,
        solutionName: solutionName,
      });
      this.userPoolId = authStack.userPoolId;
      this.userPoolClientId = authStack.userPoolClientId;
      NagSuppressions.addResourceSuppressions(
        authStack,
        [
          {
            id: 'AwsSolutions-IAM5',
            reason: 'Cognito User Pool need this wildcard permission',
          },
          {
            id: 'AwsSolutions-IAM4',
            reason: 'these policy is used by CDK Customer Resource lambda',
          },
          {
            id: 'AwsSolutions-COG2',
            reason:
              'customer can enable MFA by their own, we do not need to enable it',
          },
        ],
        true
      );
    }

    let vpc = undefined;

    if (props?.existingVpc) {
      const vpcId = new CfnParameter(this, 'vpcId', {
        description: 'Select a VPC ID. e.g. vpc-bef13dc7',
        default: '',
        type: 'AWS::EC2::VPC::Id',
      });
      vpcId.overrideLogicalId('vpcId');
      this.addToParamLabels('VPC Id', vpcId.logicalId);

      const publicSubnetIds = new CfnParameter(this, 'publicSubnets', {
        description:
          'Public Subnet IDs in the selected VPC. Please provide two subnets at least delimited by comma, e.g. subnet-97bfc4cd,subnet-7ad7de32. The subnets must have routes point to an Internet Gateway.',
        type: 'List<AWS::EC2::Subnet::Id>',
      });
      publicSubnetIds.overrideLogicalId('publicSubnets');
      this.addToParamLabels('Public Subnet IDs', publicSubnetIds.logicalId);

      const privateSubnetIds = new CfnParameter(this, 'privateSubnets', {
        description:
          'Private Subnet IDs in the selected VPC. Please provide two subnets at least delimited by comma, e.g. subnet-97bfc4cd,subnet-7ad7de32. The subnets must have routes to an NAT gateway.',
        type: 'List<AWS::EC2::Subnet::Id>',
      });
      privateSubnetIds.overrideLogicalId('privateSubnets');
      this.addToParamLabels('Private Subnet IDs', privateSubnetIds.logicalId);
      this.addToParamGroups(
        'Existing VPC Info',
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
    }

    const vpcStack = new VpcStack(this, `${stackPrefix}Vpc`, {
      vpc: vpc,
    });

    // Create a CMK for SQS encryption
    const cmkKey = new kms.Key(this, 'KMSCMK', {
      removalPolicy: RemovalPolicy.DESTROY,
      pendingWindow: Duration.days(7),
      description: 'KMS-CMK for encrypting the objects in the SQS',
      enableKeyRotation: true,
      policy: new iam.PolicyDocument({
        statements: [
          new iam.PolicyStatement({
            actions: [
              'kms:Create*',
              'kms:Describe*',
              'kms:Enable*',
              'kms:List*',
              'kms:Put*',
              'kms:Update*',
              'kms:Revoke*',
              'kms:Get*',
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
              new iam.ServicePrincipal('sqs.amazonaws.com'),
              new iam.ServicePrincipal('sns.amazonaws.com'),
              new iam.ServicePrincipal('ec2.amazonaws.com'),
              new iam.ServicePrincipal('athena.amazonaws.com'),
              new iam.ServicePrincipal('dynamodb.amazonaws.com'),
              new iam.ServicePrincipal('cloudwatch.amazonaws.com'),
              new iam.ServicePrincipal('glue.amazonaws.com'),
              new iam.ServicePrincipal('delivery.logs.amazonaws.com'),
            ],
          }),
        ],
      }),
    });

    // Create the ECS Stack
    const ecsClusterStack = new EcsClusterStack(this, 'ECSClusterStack', {
      vpc: vpcStack.vpc,
    });

    // Setup Fluent Bit uploading event SQS and DLQ
    const flbConfUploadingEventDLQ = new sqs.Queue(
      this,
      `${stackPrefix}-FlbConfUploadingEventDLQ`,
      {
        visibilityTimeout: Duration.minutes(15),
        retentionPeriod: Duration.days(7),
        encryption: sqs.QueueEncryption.KMS_MANAGED,
      }
    );
    flbConfUploadingEventDLQ.addToResourcePolicy(
      new iam.PolicyStatement({
        actions: ['sqs:*'],
        effect: iam.Effect.DENY,
        resources: [flbConfUploadingEventDLQ.queueArn],
        conditions: {
          ['Bool']: {
            'aws:SecureTransport': 'false',
          },
        },
        principals: [new iam.AnyPrincipal()],
      })
    );
    NagSuppressions.addResourceSuppressions(flbConfUploadingEventDLQ, [
      { id: 'AwsSolutions-SQS3', reason: 'it is a DLQ' },
    ]);

    // Create a default logging bucket
    const loggingBucket = new s3.Bucket(this, `${stackPrefix}LoggingBucket`, {
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      accessControl: s3.BucketAccessControl.LOG_DELIVERY_WRITE,
      objectOwnership: s3.ObjectOwnership.OBJECT_WRITER,
      versioned: true,
      enforceSSL: true,
      notificationsHandlerRole: new iam.Role(this, 'NotiRole', {
        assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
        description: 'A role for s3 bucket notification lambda',
        managedPolicies: [
          iam.ManagedPolicy.fromAwsManagedPolicyName(
            'service-role/AWSLambdaBasicExecutionRole'
          ),
        ],
        inlinePolicies: {
          BucketNotification: iam.PolicyDocument.fromJson({
            Version: '2012-10-17',
            Statement: [
              {
                Effect: 'Allow',
                Action: [
                  's3:PutBucketNotification',
                  's3:GetBucketNotification',
                ],
                Resource: '*',
              },
            ],
          }),
        },
      }),
      eventBridgeEnabled: true,
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
          'me-central-1': {
            elbRootAccountArn: 'arn:aws:iam::127311923021:root',
          },
          'ap-south-2': {
            elbRootAccountArn: 'arn:aws:iam::127311923021:root',
          },
          'ap-southeast-4': {
            elbRootAccountArn: 'arn:aws:iam::127311923021:root',
          },
          'il-central-1': {
            elbRootAccountArn: 'arn:aws:iam::127311923021:root',
          },
          'ca-west-1': {
            elbRootAccountArn: 'arn:aws:iam::127311923021:root',
          },
          'eu-south-2': {
            elbRootAccountArn: 'arn:aws:iam::127311923021:root',
          },
          'eu-central-2': {
            elbRootAccountArn: 'arn:aws:iam::127311923021:root',
          },
        },
      }
    );

    const isNewRegion = new CfnCondition(this, 'IsNewRegion', {
      expression: Fn.conditionOr(
        Fn.conditionEquals(Aws.REGION, 'me-central-1'),
        Fn.conditionEquals(Aws.REGION, 'ap-south-2'),
        Fn.conditionEquals(Aws.REGION, 'ap-southeast-4'),
        Fn.conditionEquals(Aws.REGION, 'il-central-1'),
        Fn.conditionEquals(Aws.REGION, 'ca-west-1'),
        Fn.conditionEquals(Aws.REGION, 'eu-south-2'),
        Fn.conditionEquals(Aws.REGION, 'eu-central-2')
      ),
    });
    loggingBucket.addToResourcePolicy(
      iam.PolicyStatement.fromJson({
        Action: 's3:PutObject',
        Effect: 'Allow',
        Principal: {
          'Fn::If': [
            isNewRegion.logicalId,
            {
              Service: 'logdelivery.elasticloadbalancing.amazonaws.com',
            },
            {
              AWS: {
                'Fn::FindInMap': [
                  elbRootAccountArnTable.logicalId,
                  {
                    Ref: 'AWS::Region',
                  },
                  'elbRootAccountArn',
                ],
              },
            },
          ],
        },
        Resource: [
          `arn:${Aws.PARTITION}:s3:::${loggingBucket.bucketName}/*`,
          `arn:${Aws.PARTITION}:s3:::${loggingBucket.bucketName}`,
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

    const cfnLoggingBucket = loggingBucket.node.defaultChild as s3.CfnBucket;
    addCfnNagSuppressRules(cfnLoggingBucket, [
      {
        id: 'W35',
        reason: 'this is a logging bucket hence no access logging required',
      },
      {
        id: 'W51',
        reason: 'Already have bucket policy for log delivery',
      },
    ]);

    if (loggingBucket.policy) {
      Aspects.of(this).add(
        new AddS3BucketNotificationsDependency(
          loggingBucket.policy.node.defaultChild as CfnResource
        )
      );
    }

    const notificationHandler = Stack.of(this).node.tryFindChild(
      'BucketNotificationsHandler050a0587b7544547bf325f094a3db834'
    );
    if (notificationHandler) {
      Aspects.of(notificationHandler).add(
        new UseS3BucketNotificationsWithRetryAspects()
      );
    }
    Aspects.of(this).add(new EnforceUnmanagedS3BucketNotificationsAspects());

    // init MicroBatch Stack
    microBatchStack = new MicroBatchStack(this, 'MicroBatchStack', {
      solutionId: solutionId,
      solutionName: solutionName,
      stackPrefix: stackPrefix,
      emailAddress: username.valueAsString,
      vpc: vpcStack.vpc.vpcId,
      privateSubnets: vpcStack.vpc.privateSubnets.map((value) => {
        return value.subnetId;
      }),
      CMKArn: cmkKey.keyArn,
      SESState: 'DISABLED',
    });

    microBatchStack.microBatchLambdaStack.MetadataWriterStack.MetadataWriter.node.addDependency(
      vpcStack.vpc.selectSubnets({
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
      }).internetConnectivityEstablished
    );

    const openSearchMasterRole = new iam.Role(this, 'OpenSearchMasterRole', {
      assumedBy: new iam.AccountPrincipal(Aws.ACCOUNT_ID),
    });

    // Create the Appsync API stack
    const apiStack = new APIStack(this, 'API', {
      aosMasterRole: openSearchMasterRole,
      oidcClientId: this.oidcClientId,
      oidcProvider: this.oidcProvider,
      userPoolId: this.userPoolId,
      userPoolClientId: this.userPoolClientId,
      vpc: vpcStack.vpc,
      subnetIds: vpcStack.vpc.privateSubnets.map((subnet) => subnet.subnetId),
      processSg: vpcStack.processSg,
      processSgId: vpcStack.processSg.securityGroupId,
      authType: this.authType,
      defaultLoggingBucket: loggingBucket,
      ecsCluster: ecsClusterStack.ecsCluster,
      cmkKeyArn: cmkKey.keyArn,
      encryptionKey: cmkKey,
      solutionId: solutionId,
      stackPrefix: stackPrefix,
      microBatchStack: microBatchStack,
      snsEmailTopic: microBatchStack.microBatchSNSStack.SNSSendEmailTopic,
      solutionUuid: solutionUuid.toString(),
      sendAnonymizedUsageData: metricsMapping.findInMap(
        'SendAnonymizedUsageData',
        'Data'
      ),
      s3Endpoint: s3Endpoint,
      templateBucketName: templateBucketName,
      templateBaseUrl: templateBaseUrl,
    });
    NagSuppressions.addResourceSuppressions(
      apiStack,
      [
        {
          id: 'AwsSolutions-IAM5',
          reason: 'Lambda need get dynamic resources',
        },
      ],
      true
    );

    // Create a Portal Stack (Default Cognito)
    const portalStack = new PortalStack(this, 'WebConsole', {
      apiEndpoint: apiStack.apiEndpoint,
      customDomainName: this.oidcCustomerDomain,
      iamCertificateId: this.iamCertificateId,
      acmCertificateArn: this.acmCertificateArn,
      authenticationType: this.authType,
    });
    portalStack.node.addDependency(cmkKey);

    portalStack.webUILoggingBucket.addToResourcePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        principals: [new iam.ServicePrincipal('logging.s3.amazonaws.com')],
        actions: ['s3:PutObject'],
        resources: [
          `arn:${Aws.PARTITION}:s3:::${portalStack.webUILoggingBucket.bucketName}/*`,
        ],
        conditions: {
          StringEquals: {
            'aws:SourceAccount': `${Aws.ACCOUNT_ID}`,
          },
          ArnLike: {
            'aws:SourceArn': loggingBucket.bucketArn,
          },
        },
      })
    );
    if (this.userPoolId != '') {
      new cognito.CfnLogDeliveryConfiguration( // NOSONAR CDK construct initialization
        this,
        'CognitoLogDeliveryConfiguration',
        {
          userPoolId: this.userPoolId,
          logConfigurations: [
            {
              s3Configuration: {
                bucketArn: loggingBucket.bucketArn,
              },
              eventSource: 'userAuthEvents',
              logLevel: 'INFO',
            },
          ],
        }
      );
    }
    // Perform actions during solution deployment or update
    const crStack = new CustomResourceStack(this, 'CR', {
      apiStack: apiStack,
      openSearchMasterRoleArn: openSearchMasterRole.roleArn,
      oidcProvider: this.oidcProvider,
      oidcClientId: this.oidcClientId,
      portalBucketName: portalStack.portalBucket.bucketName,
      portalUrl: portalStack.portalUrl,
      cloudFrontDistributionId: portalStack.cloudFrontDistributionId,
      oidcCustomerDomain: this.oidcCustomerDomain,
      userPoolId: this.userPoolId,
      userPoolClientId: this.userPoolClientId,
      defaultLoggingBucket: loggingBucket.bucketName,
      stagingBucket: microBatchStack.microBatchS3Stack.StagingBucket.bucketName,
      cmkKeyArn: cmkKey.keyArn,
      authenticationType: this.authType,
      webUILoggingBucket: portalStack.webUILoggingBucket.bucketName,
      snsEmailTopic: microBatchStack.microBatchSNSStack.SNSSendEmailTopic,
      templateBucketName: templateBucketName,
      templateBaseUrl: templateBaseUrl,
    });

    // Allow init config function to put aws-exports.json to portal bucket
    portalStack.portalBucket.grantPut(crStack.initConfigFn);

    this.templateOptions.metadata = {
      'AWS::CloudFormation::Interface': {
        ParameterGroups: this.paramGroups,
        ParameterLabels: this.paramLabels,
      },
    };

    new CfnOutput(this, 'DefaultLoggingBucket', {
      description: 'Default S3 Buckets to store logs',
      value: loggingBucket.bucketName,
    }).overrideLogicalId('DefaultLoggingBucket');

    // Output portal Url
    new CfnOutput(this, 'WebConsoleUrl', {
      description: 'Web Console URL (front-end)',
      value: portalStack.portalUrl,
    }).overrideLogicalId('WebConsoleUrl');

    Aspects.of(this).add(
      new CfnGuardSuppressResourceList({
        'AWS::IAM::Role': [
          'IAM_NO_INLINE_POLICY_CHECK',
          'IAM_POLICYDOCUMENT_NO_WILDCARD_RESOURCE',
          'CFN_NO_EXPLICIT_RESOURCE_NAMES',
        ], // Explicit role names required for cross account assumption
        'AWS::Logs::LogGroup': ['CLOUDWATCH_LOG_GROUP_ENCRYPTED'], // Using service default encryption https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/data-protection.html
      })
    );
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

class AddS3BucketNotificationsDependency implements IAspect {
  public constructor(private deps: CfnResource) {}

  public visit(node: IConstruct): void {
    if (
      node instanceof CfnResource &&
      node.cfnResourceType === 'Custom::S3BucketNotifications'
    ) {
      node.addDependency(this.deps);
    }
  }
}
