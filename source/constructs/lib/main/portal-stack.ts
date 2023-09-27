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
import { CloudFrontToS3 } from '@aws-solutions-constructs/aws-cloudfront-s3';
import {
  Aws,
  Duration,
  RemovalPolicy,
  CfnCondition,
  Fn,
  aws_s3 as s3,
  aws_cloudfront as cloudfront,
  aws_s3_deployment as s3d,
} from 'aws-cdk-lib';
import { NagSuppressions } from 'cdk-nag';
import { Construct } from 'constructs';
import { constructFactory } from '../util/stack-helper';

export interface PortalProps {
  /**
   * Backend GraphQL API Endpoint
   *
   * @default - None.
   */
  readonly apiEndpoint: string;

  /**
   * Authentication Type (Cognito or OIDC)
   *
   * @default - None.
   */
  readonly authenticationType: string;

  /**
   * Custom Domain Name (CNAME) for CloudFront
   *
   */
  readonly customDomainName: string;

  /**
   * IAM Certificate ID for CloudFront
   *
   */
  readonly iamCertificateId: string;

  /**
   * ACM Certificate Arn for CloudFront
   */
  readonly acmCertificateArn: string;
}

export const enum AuthType {
  COGNITO = 'AMAZON_COGNITO_USER_POOLS',
  OIDC = 'OPENID_CONNECT',
}

/**
 * Stack to provision Portal assets and CloudFront Distribution
 */
export class PortalStack extends Construct {
  readonly portalBucket: s3.Bucket;
  readonly portalUrl: string;
  readonly cloudFrontDistributionId: string;

  constructor(scope: Construct, id: string, props: PortalProps) {
    super(scope, id);

    const isOpsInRegion = new CfnCondition(this, 'isOpsInRegion', {
      expression: Fn.conditionOr(
        Fn.conditionEquals(Aws.REGION, 'ap-east-1'),
        Fn.conditionEquals(Aws.REGION, 'af-south-1'),
        Fn.conditionEquals(Aws.REGION, 'eu-south-1'),
        Fn.conditionEquals(Aws.REGION, 'me-south-1')
      ),
    });

    const hasAcmCertificateArn = new CfnCondition(
      this,
      'HasAcmCertificateArn',
      {
        expression: Fn.conditionNot(
          Fn.conditionEquals('', props.acmCertificateArn)
        ),
      }
    );

    const hasIamCertificateArn = new CfnCondition(
      this,
      'HasIamCertificateArn',
      {
        expression: Fn.conditionNot(
          Fn.conditionEquals('', props.iamCertificateId)
        ),
      }
    );

    const isNoCert = new CfnCondition(this, "isNoCert", {
      expression: Fn.conditionAnd(
        Fn.conditionNot(hasAcmCertificateArn),
        Fn.conditionNot(hasIamCertificateArn)
      ),
    });

    const getDefaultBehavior = () => {
      if (props.authenticationType === AuthType.COGNITO) {
        return {
          responseHeadersPolicy: new cloudfront.ResponseHeadersPolicy(
            this,
            'ResponseHeadersPolicy',
            {
              responseHeadersPolicyName: `SecHdr${Aws.REGION}${Aws.STACK_NAME}`,
              comment: 'Security Headers Policy',
              securityHeadersBehavior: {
                contentSecurityPolicy: {
                  contentSecurityPolicy: `default-src 'self'; upgrade-insecure-requests; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' ${props.apiEndpoint} https://cognito-idp.${Aws.REGION}.amazonaws.com/`,
                  override: true,
                },
                contentTypeOptions: { override: true },
                frameOptions: {
                  frameOption: cloudfront.HeadersFrameOption.DENY,
                  override: true,
                },
                referrerPolicy: {
                  referrerPolicy: cloudfront.HeadersReferrerPolicy.NO_REFERRER,
                  override: true,
                },
                strictTransportSecurity: {
                  accessControlMaxAge: Duration.seconds(600),
                  includeSubdomains: true,
                  override: true,
                },
                xssProtection: {
                  protection: true,
                  modeBlock: true,
                  override: true,
                },
              },
            }
          ),
        };
      }
      return {};
    };

    // Use cloudfrontToS3 solution contructs
    const portal = new CloudFrontToS3(this, 'UI', {
      bucketProps: {
        versioned: true,
        encryption: s3.BucketEncryption.S3_MANAGED,
        accessControl: s3.BucketAccessControl.PRIVATE,
        enforceSSL: true,
        removalPolicy: RemovalPolicy.RETAIN,
        autoDeleteObjects: false,
      },
      cloudFrontDistributionProps: {
        priceClass: cloudfront.PriceClass.PRICE_CLASS_ALL,
        minimumProtocolVersion: cloudfront.SecurityPolicyProtocol.TLS_V1_2_2019,
        enableIpv6: false,
        enableLogging: true, //Enable access logging for the distribution.
        comment: `${Aws.STACK_NAME} - Web Console Distribution (${Aws.REGION})`,
        errorResponses: [
          {
            httpStatus: 403,
            responseHttpStatus: 200,
            responsePagePath: '/index.html',
          },
        ],
        defaultBehavior: getDefaultBehavior(),
      },
      insertHttpSecurityHeaders: false,
    });
    NagSuppressions.addResourceSuppressions(portal.cloudFrontWebDistribution, [
      {
        id: 'AwsSolutions-CFR1',
        reason: 'Use case does not warrant CloudFront Geo restriction',
      },
      {
        id: 'AwsSolutions-CFR2',
        reason: 'Use case does not warrant CloudFront integration with AWS WAF',
      },
      {
        id: 'AwsSolutions-CFR4',
        reason:
          'CloudFront automatically sets the security policy to TLSv1 when the distribution uses the CloudFront domain name',
      },
    ]);
    this.portalBucket = portal.s3Bucket as s3.Bucket;
    const portalDist = portal.cloudFrontWebDistribution.node
      .defaultChild as cloudfront.CfnDistribution;

    const cfnCloudFrontWebDistribution = portal.cloudFrontWebDistribution.node
      .defaultChild as cloudfront.CfnDistribution;

    (cfnCloudFrontWebDistribution.distributionConfig as any).logging =
      Fn.conditionIf(isOpsInRegion.logicalId, Aws.NO_VALUE, {
        Bucket: portal.cloudFrontLoggingBucket!.bucketRegionalDomainName,
      });

    if (props.authenticationType === AuthType.OIDC) {
      // Currently, CachePolicy and Cloudfront Function is not available in Cloudfront in China Regions.
      // Need to override the default CachePolicy to use ForwardedValues to support both China regions and Global regions.
      // This should be updated in the future once the feature is landed in China regions.
      portalDist.addPropertyOverride(
        'DistributionConfig.DefaultCacheBehavior.CachePolicyId',
        undefined
      );
      portalDist.addPropertyOverride(
        'DistributionConfig.DefaultCacheBehavior.ForwardedValues',
        {
          Cookies: {
            Forward: 'none',
          },
          QueryString: false,
        }
      );
      if (props.customDomainName != '') {
        portalDist.addPropertyOverride('DistributionConfig.Aliases',
          Fn.conditionIf(
            isNoCert.logicalId,
            Aws.NO_VALUE,
            [
              {
                Ref: 'Domain',
              },
            ]
          )
        );
        portalDist.addPropertyOverride(
          'DistributionConfig.ViewerCertificate.MinimumProtocolVersion',
          'TLSv1'
        );
        portalDist.addPropertyOverride(
          'DistributionConfig.ViewerCertificate.SslSupportMethod',
          // 'sni-only'
          Fn.conditionIf(
            isNoCert.logicalId,
            Aws.NO_VALUE,
            'sni-only'
          )
        );
        portalDist.addPropertyOverride(
          'DistributionConfig.ViewerCertificate.CloudFrontDefaultCertificate',
          Fn.conditionIf(
            isNoCert.logicalId,
            true,
            Aws.NO_VALUE
          )
        );
        portalDist.addPropertyOverride(
          'DistributionConfig.ViewerCertificate.IamCertificateId',
          Fn.conditionIf(
            hasAcmCertificateArn.logicalId,
            Aws.NO_VALUE,
            Fn.conditionIf(
              hasIamCertificateArn.logicalId,
              props.iamCertificateId,
              Aws.NO_VALUE
            )
          )
        );
        portalDist.addPropertyOverride(
          'DistributionConfig.ViewerCertificate.AcmCertificateArn',
          Fn.conditionIf(
            hasAcmCertificateArn.logicalId,
            props.acmCertificateArn,
            Aws.NO_VALUE
          )
        );
      }
    }
    this.portalUrl = portal.cloudFrontWebDistribution.distributionDomainName;
    this.cloudFrontDistributionId =
      portal.cloudFrontWebDistribution.distributionId;

    // upload static web assets
    constructFactory(s3d.BucketDeployment)(this, 'DeployWebAssets', {
      sources: [
        s3d.Source.asset(path.join(__dirname, '../../../portal/build')),
      ],
      destinationBucket: this.portalBucket,
      prune: false,
    });
  }
}
