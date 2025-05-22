// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import * as path from 'path';
import {
  Aws,
  Duration,
  CfnCondition,
  Fn,
  Aspects,
  IAspect,
  CfnResource,
  CustomResource,
  aws_iam as iam,
  aws_lambda as lambda,
  custom_resources as cr,
  aws_sns as sns,
} from 'aws-cdk-lib';
import { Construct, IConstruct } from 'constructs';

import { APIStack } from '../api/api-stack';
import { SharedPythonLayer } from '../layer/layer';

export interface CRProps {
  /**
   * Authentication Type (Cognito or OIDC)
   *
   * @default - None.
   */
  readonly authenticationType: string;

  /**
   * Cognito User Pool ID
   *
   * @default - None.
   */
  readonly userPoolId: string;

  /**
   * Cognito User Pool Client ID
   *
   * @default - None.
   */
  readonly userPoolClientId: string;

  /**
   * Default Logging Bucket Name
   *
   * @default - None.
   */
  readonly defaultLoggingBucket: string;

  /**
   * staging Bucket Name
   *
   * @default - None.
   */
  readonly stagingBucket: string;

  /**
   * Default KMS-CMK Arn
   *
   * @default - None.
   */
  readonly cmkKeyArn: string;

  /**
   * Bucket Name for Web UI Assets
   *
   * @default - None.
   */
  readonly portalBucketName: string;

  /**
   * Web Console Url
   *
   * @default - None.
   */
  readonly portalUrl: string;

  /**
   * CloudFront distribution id
   */
  readonly cloudFrontDistributionId: string;

  /**
   * OIDC Customer Domain
   *
   */
  readonly oidcCustomerDomain: string;

  /**
   * OIDC Provider
   *
   */
  readonly oidcProvider: string;

  /**
   * OIDC Client Id
   *
   */
  readonly oidcClientId: string;

  readonly openSearchMasterRoleArn: string;

  readonly apiStack: APIStack;
  readonly webUILoggingBucket: string;
  readonly snsEmailTopic: sns.Topic;
}

/**
 * Stack to perform neccessary actions during solution deployment or update
 */
export class CustomResourceStack extends Construct {
  readonly initConfigFn: lambda.Function;

  constructor(scope: Construct, id: string, props: CRProps) {
    super(scope, id);

    const templateBucket =
      process.env.TEMPLATE_OUTPUT_BUCKET || 'aws-gcr-solutions';
    const solutionName = process.env.SOLUTION_TRADEMARKEDNAME || 'log-hub'; // Old name

    // If in China Region, disable install latest aws-sdk
    const isCN = new CfnCondition(this, 'isCN', {
      expression: Fn.conditionEquals(Aws.PARTITION, 'aws-cn'),
    });

    const installLatestAwsSdk = Fn.conditionIf(
      isCN.logicalId,
      'false',
      'true'
    ).toString();

    Aspects.of(this).add(new InjectCustomerResourceConfig(installLatestAwsSdk));

    // This Lambda is to perform necessary actions during stack creation or update
    // Including export the aws-exports.json to web portal bucket etc.
    this.initConfigFn = new lambda.Function(this, 'InitConfig', {
      runtime: lambda.Runtime.PYTHON_3_11,
      code: lambda.Code.fromAsset(
        path.join(__dirname, '../../lambda/custom-resource')
      ),
      handler: 'lambda_function.lambda_handler',
      layers: [SharedPythonLayer.getInstance(this)],
      timeout: Duration.minutes(5),
      memorySize: 128,
      environment: {
        WEB_BUCKET_NAME: props.portalBucketName,
        OPENSEARCH_MASTER_ROLE_ARN: props.openSearchMasterRoleArn,
        OPENSEARCH_DOMAIN_TABLE:
          props.apiStack.clusterStack.clusterTable.tableName,
        API_ENDPOINT: props.apiStack.apiEndpoint,
        OIDC_PROVIDER: props.oidcProvider,
        OIDC_CLIENT_ID: props.oidcClientId,
        OIDC_CUSTOMER_DOMAIN: props.oidcCustomerDomain,
        CLOUDFRONT_URL: props.portalUrl,
        CLOUDFRONT_DISTRIBUTION_ID: props.cloudFrontDistributionId,
        AUTHENTICATION_TYPE: props.authenticationType,
        USER_POOL_ID: props.userPoolId,
        USER_POOL_CLIENT_ID: props.userPoolClientId,
        DEFAULT_LOGGING_BUCKET: props.defaultLoggingBucket,
        STAGING_BUCKET: props.stagingBucket,
        DEFAULT_CMK_ARN: props.cmkKeyArn,
        SOLUTION_VERSION: process.env.VERSION || 'v1.0.0',
        TEMPLATE_OUTPUT_BUCKET: templateBucket,
        SOLUTION_NAME: solutionName,
        ACCESS_LOGGING_BUCKET: props.webUILoggingBucket,
        SNS_EMAIL_TOPIC_ARN: props.snsEmailTopic.topicArn,
      },
      description: `${Aws.STACK_NAME} - Init Config Handler`,
    });

    this.initConfigFn.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'cloudfront:GetInvalidation',
          'cloudfront:CreateInvalidation',
        ],
        resources: [
          `arn:${Aws.PARTITION}:cloudfront::${Aws.ACCOUNT_ID}:distribution/${props.cloudFrontDistributionId}`,
        ],
      })
    );
    this.initConfigFn.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['s3:PutBucketLogging', 's3:GetBucketLogging'],
        resources: [
          `arn:${Aws.PARTITION}:s3:::${props.defaultLoggingBucket}`,
          `arn:${Aws.PARTITION}:s3:::${props.stagingBucket}`,
        ],
      })
    );
    this.initConfigFn.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['es:DescribeDomainConfig', 'es:UpdateDomainConfig'],
        resources: ['*'],
      })
    );
    this.initConfigFn.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'kms:DescribeCustomKeyStores',
          'kms:DescribeKey',
        ],
        resources: ['*'],
      })
    );
    props.apiStack.clusterStack.clusterTable.grantReadWriteData(
      this.initConfigFn
    );

    const CRLambdaProvider = new cr.Provider(this, 'CRLambdaProvider', {
      onEventHandler: this.initConfigFn,
    });

    const crLambda = new CustomResource(this, 'CRLambda', {
      serviceToken: CRLambdaProvider.serviceToken,
      properties: {
        service: 'Lambda',
        action: 'invoke',
        parameters: {
          FunctionName: this.initConfigFn.functionName,
          InvocationType: 'Event',
        },
        physicalResourceId: cr.PhysicalResourceId.of(Date.now().toString()),
      },
    });

    crLambda.node.addDependency(this.initConfigFn);
  }
}

class InjectCustomerResourceConfig implements IAspect {
  public constructor(private installLatestAwsSdk: string) { }

  public visit(node: IConstruct): void {
    if (node instanceof CfnResource && node.cfnResourceType === 'Custom::AWS') {
      node.addPropertyOverride('InstallLatestAwsSdk', this.installLatestAwsSdk);
    }
  }
}
