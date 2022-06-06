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

import { Construct, CfnOutput, Duration, RemovalPolicy, Aws } from '@aws-cdk/core';
import { CloudFrontToS3 } from '@aws-solutions-constructs/aws-cloudfront-s3';
import * as s3 from '@aws-cdk/aws-s3';
import * as cloudfront from '@aws-cdk/aws-cloudfront';
import * as s3d from '@aws-cdk/aws-s3-deployment';
import * as lambda from '@aws-cdk/aws-lambda';
import * as iam from '@aws-cdk/aws-iam'
import * as cr from "@aws-cdk/custom-resources";
import * as path from 'path'


export interface PortalProps {

    /**
     * Backend GraphQL API Endpoint
     *
     * @default - None.
     */
    readonly apiEndpoint: string

    /**
    * Cognito User Pool ID
    *
    * @default - None.
    */
    readonly userPoolId: string

    /**
     * Cognito User Pool Client ID
     *
     * @default - None.
     */
    readonly userPoolClientId: string

    /**
     * Default Logging Bucket Name
     *
     * @default - None.
     */
    readonly defaultLoggingBucket: string

    /**
     * Default KMS-CMK Arn
     *
     * @default - None.
     */
    readonly cmkKeyArn: string

    /**
     * Default Logging Bucket Name
     *
     * @default - None.
     */
    readonly authenticationType: string

    /**
     * OIDC Customer Domain
     *
     */
    readonly oidcCustomerDomain: string

    /**
     * OIDC Provider
     *
     */
    readonly oidcProvider: string

    /**
     * OIDC Client Id
     *
     */
    readonly oidcClientId: string

    /**
     * IAM Certificate ID
     *
     */
    readonly iamCertificateId: string
}

export const enum AuthType {
    COGNITO = "AMAZON_COGNITO_USER_POOLS",
    OIDC = "OPENID_CONNECT"
}

/**
 * Stack to provision Portal assets and CloudFront Distribution
 */
export class PortalStack extends Construct {

    private full_domain = "";

    constructor(scope: Construct, id: string, props: PortalProps) {
        super(scope, id);

        const https_header = "https://";

        const getDefaultBehavior = () => {
            if (props.authenticationType === AuthType.COGNITO) {
                return {
                    responseHeadersPolicy: new cloudfront.ResponseHeadersPolicy(this, 'ResponseHeadersPolicy', {
                        responseHeadersPolicyName: `SecHdr${Aws.REGION}${Aws.STACK_NAME}`,
                        comment: 'Log Hub Security Headers Policy',
                        securityHeadersBehavior: {
                            contentSecurityPolicy: { contentSecurityPolicy: `default-src 'self'; upgrade-insecure-requests; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' ${props.apiEndpoint} https://cognito-idp.${Aws.REGION}.amazonaws.com/`, override: true },
                            contentTypeOptions: { override: true },
                            frameOptions: { frameOption: cloudfront.HeadersFrameOption.DENY, override: true },
                            referrerPolicy: { referrerPolicy: cloudfront.HeadersReferrerPolicy.NO_REFERRER, override: true },
                            strictTransportSecurity: { accessControlMaxAge: Duration.seconds(600), includeSubdomains: true, override: true },
                            xssProtection: { protection: true, modeBlock: true, override: true },
                        },
                    }),
                }
            }
            return {};
        }

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
                enableLogging: true,  //Enable access logging for the distribution.
                comment: `${Aws.STACK_NAME} - Web Console Distribution (${Aws.REGION})`,
                errorResponses: [
                    {
                        httpStatus: 403,
                        responseHttpStatus: 200,
                        responsePagePath: "/index.html",
                    }
                ],
                defaultBehavior: getDefaultBehavior(),
            },
            insertHttpSecurityHeaders: false,
        });
        const portalBucket = portal.s3Bucket as s3.Bucket;
        const portalDist = portal.cloudFrontWebDistribution.node.defaultChild as cloudfront.CfnDistribution

        this.full_domain = props.oidcCustomerDomain

        if (props.authenticationType === AuthType.OIDC) {
            // Currently, CachePolicy and Cloudfront Function is not available in Cloudfront in China Regions.
            // Need to override the default CachePolicy to use ForwardedValues to support both China regions and Global regions.
            // This should be updated in the future once the feature is landed in China regions.
            portalDist.addPropertyOverride('DistributionConfig.DefaultCacheBehavior.CachePolicyId', undefined)
            portalDist.addPropertyOverride('DistributionConfig.DefaultCacheBehavior.ForwardedValues', {
                "Cookies": {
                    "Forward": "none"
                },
                "QueryString": false
            })
            if (props.oidcCustomerDomain != "") {
                portalDist.addPropertyOverride('DistributionConfig.Aliases', [{
                    "Ref": "Domain"
                }])
                portalDist.addPropertyOverride('DistributionConfig.ViewerCertificate.MinimumProtocolVersion', 'TLSv1')
                portalDist.addPropertyOverride('DistributionConfig.ViewerCertificate.SslSupportMethod', 'sni-only')
                portalDist.addPropertyOverride('DistributionConfig.ViewerCertificate.IamCertificateId', props.iamCertificateId)
                this.full_domain = https_header.concat(props.oidcCustomerDomain);
            }
        }
        const portalUrl = portal.cloudFrontWebDistribution.distributionDomainName

        // upload static web assets
        new s3d.BucketDeployment(this, 'DeployWebAssets', {
            sources: [s3d.Source.asset(path.join(__dirname, '../../../portal/build'))],
            destinationBucket: portalBucket,
            prune: false,
        })

        // This Lambda is to export a aws-exports.json to web portal bucket
        const webConfigFn = new lambda.Function(this, 'WebConfig', {
            runtime: lambda.Runtime.PYTHON_3_9,
            code: lambda.Code.fromAsset(path.join(__dirname, '../../lambda/custom-resource')),
            handler: 'lambda_function.lambda_handler',
            timeout: Duration.seconds(60),
            memorySize: 128,
            environment: {
                WEB_BUCKET_NAME: portalBucket.bucketName,
                API_ENDPOINT: props.apiEndpoint,
                OIDC_PROVIDER: props.oidcProvider,
                OIDC_CLIENT_ID: props.oidcClientId,
                OIDC_CUSTOMER_DOMAIN: this.full_domain,
                CLOUDFRONT_URL: portalUrl,
                AUTHENTICATION_TYPE: props.authenticationType,
                USER_POOL_ID: props.userPoolId,
                USER_POOL_CLIENT_ID: props.userPoolClientId,
                DEFAULT_LOGGING_BUCKET: props.defaultLoggingBucket,
                DEFAULT_CMK_ARN: props.cmkKeyArn,
                VERSION: process.env.VERSION || 'v1.0.0',
            },
            description: 'Log Hub - Web Config Handler'
        });
        portalBucket.grantPut(webConfigFn)

        const crLambda = new cr.AwsCustomResource(this, 'CRLambda', {
            policy: cr.AwsCustomResourcePolicy.fromStatements([new iam.PolicyStatement({
                actions: ['lambda:InvokeFunction'],
                effect: iam.Effect.ALLOW,
                resources: [webConfigFn.functionArn]
            })]),
            timeout: Duration.minutes(15),
            onCreate: {
                service: 'Lambda',
                action: 'invoke',
                parameters: {
                    FunctionName: webConfigFn.functionName,
                    InvocationType: 'Event'
                },
                physicalResourceId: cr.PhysicalResourceId.of('webconfig')
            },
            onUpdate: {
                service: 'Lambda',
                action: 'invoke',
                parameters: {
                    FunctionName: webConfigFn.functionName,
                    InvocationType: 'Event'
                },
                physicalResourceId: cr.PhysicalResourceId.of('webconfig')
            },

        })
        crLambda.node.addDependency(webConfigFn, portalBucket)

        // Output portal Url
        new CfnOutput(this, "WebConsoleUrl", {
            description: "Web Console URL (front-end)",
            value: portalUrl,
        }).overrideLogicalId('WebConsoleUrl');

    }
}