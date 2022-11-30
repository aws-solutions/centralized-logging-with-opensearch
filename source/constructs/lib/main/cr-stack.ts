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

import { Construct, IConstruct } from "constructs";
import {
    Aws,
    Duration,
    CfnCondition,
    Fn,
    Aspects,
    IAspect,
    CfnResource,
    aws_iam as iam,
    aws_lambda as lambda,
    custom_resources as cr,
} from "aws-cdk-lib";

import * as path from "path";

export interface CRProps {
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


    readonly appPipelineTableName: string;
    readonly eksDeployKindTableName: string;
    readonly eksLogSourceTableName: string;

}

/**
 * Stack to perform neccessary actions during solution deployment or update
 */
export class CustomResourceStack extends Construct {

    readonly initConfigFn: lambda.Function;

    constructor(scope: Construct, id: string, props: CRProps) {
        super(scope, id);

        // If in China Region, disable install latest aws-sdk
        const isCN = new CfnCondition(this, "isCN", {
            expression: Fn.conditionEquals(Aws.PARTITION, "aws-cn"),
        });

        const installLatestAwsSdk = Fn.conditionIf(isCN.logicalId, "false", "true").toString();

        Aspects.of(this).add(new InjectCustomerResourceConfig(installLatestAwsSdk));

        // This Lambda is to perform neccessary actions during stack creation or update
        // Including export a aws-exports.json to web portal bucket etc.
        this.initConfigFn = new lambda.Function(this, "InitConfig", {
            runtime: lambda.Runtime.PYTHON_3_9,
            code: lambda.Code.fromAsset(
                path.join(__dirname, "../../lambda/custom-resource")
            ),
            handler: "lambda_function.lambda_handler",
            timeout: Duration.seconds(60),
            memorySize: 128,
            environment: {
                WEB_BUCKET_NAME: props.portalBucketName,
                API_ENDPOINT: props.apiEndpoint,
                OIDC_PROVIDER: props.oidcProvider,
                OIDC_CLIENT_ID: props.oidcClientId,
                OIDC_CUSTOMER_DOMAIN: props.oidcCustomerDomain,
                CLOUDFRONT_URL: props.portalUrl,
                AUTHENTICATION_TYPE: props.authenticationType,
                USER_POOL_ID: props.userPoolId,
                USER_POOL_CLIENT_ID: props.userPoolClientId,
                DEFAULT_LOGGING_BUCKET: props.defaultLoggingBucket,
                DEFAULT_CMK_ARN: props.cmkKeyArn,
                SOLUTION_VERSION: process.env.VERSION || "v1.0.0",
                EKS_DEPLOY_KIND_TABLE: props.eksDeployKindTableName,
                EKS_LOG_SOURCE_TABLE: props.eksLogSourceTableName,
                APP_PIPELINE_TABLE: props.appPipelineTableName,
            },
            description: "Log Hub - Init Config Handler",
        });

        const crLambda = new cr.AwsCustomResource(this, "CRLambda", {
            policy: cr.AwsCustomResourcePolicy.fromStatements([
                new iam.PolicyStatement({
                    actions: ["lambda:InvokeFunction"],
                    effect: iam.Effect.ALLOW,
                    resources: [this.initConfigFn.functionArn],
                }),
            ]),
            timeout: Duration.minutes(15),
            onUpdate: {
                service: "Lambda",
                action: "invoke",
                parameters: {
                    FunctionName: this.initConfigFn.functionName,
                    InvocationType: "Event",
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
        if (
            node instanceof CfnResource &&
            node.cfnResourceType === "Custom::AWS"
        ) {
            node.addPropertyOverride("InstallLatestAwsSdk", this.installLatestAwsSdk);
        }
    }
}