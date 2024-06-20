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
import { Construct, IConstruct } from "constructs";
import {
    Duration,
    Aws,
    Aspects,
    IAspect,
    custom_resources as cr,
    CustomResource,
    aws_iam as iam,
    aws_lambda as lambda,
    aws_cognito as cognito,
    CfnResource,
    CfnCondition,
    Fn,
} from "aws-cdk-lib";

import * as appsync from "@aws-cdk/aws-appsync-alpha";
import * as path from "path";
import { AuthType, addCfnNagSuppressRules } from "../main-stack";
import { SharedPythonLayer } from "../layer/layer";

export interface AppPipelineStackProps {

    /**
     * Cognito User Pool for Authentication of APIs
     *
     * @default - None.
     */
    readonly userPoolId: string;

    /**
     * Cognito User Pool Client for Authentication of APIs
     *
     * @default - None.
     */
    readonly userPoolClientId: string;

    /**
     * Authentication Type
     *
     */
    readonly authType: string;

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



}


/**
 * Stack to provision Appsync GraphQL APIs and releted resources.
 */
export class AppSyncStack extends Construct {

    readonly graphqlApi: appsync.GraphqlApi;

    constructor(scope: Construct, id: string, props: AppPipelineStackProps) {
        super(scope, id);

        let authDefaultConfig;

        // If in China Region, disable install latest aws-sdk
        const isCN = new CfnCondition(this, "isCN", {
            expression: Fn.conditionEquals(Aws.PARTITION, "aws-cn"),
        });
        const isInstallLatestAwsSdk = Fn.conditionIf(
            isCN.logicalId,
            "false",
            "true"
        ).toString();

        Aspects.of(this).add(
            new InjectCustomerResourceConfig(isInstallLatestAwsSdk)
        );

        // AWSAppSyncPushToCloudWatchLogs managed policy is not available in China regions.
        // Create the policy manually
        const apiLogRole = new iam.Role(this, "ApiLogRole", {
            assumedBy: new iam.ServicePrincipal("appsync.amazonaws.com"),
        });

        const apiLogPolicy = new iam.Policy(this, "ApiLogPolicy", {
            statements: [
                new iam.PolicyStatement({
                    actions: [
                        "logs:CreateLogGroup",
                        "logs:CreateLogStream",
                        "logs:PutLogEvents",
                    ],
                    resources: ["*"],
                }),
            ],
        });
        apiLogRole.attachInlinePolicy(apiLogPolicy);

        const cfnApiLogRoley = apiLogPolicy.node.defaultChild as iam.CfnPolicy;
        addCfnNagSuppressRules(cfnApiLogRoley, [
            {
                id: "W12",
                reason:
                    "The managed policy AWSAppSyncPushToCloudWatchLogs needs to use any resources",
            },
        ]);

        // Create a table to store logging pipeline info
        if (props.authType === AuthType.OIDC) {
            // OpenID Auth Config
            authDefaultConfig = {
                authorizationType: appsync.AuthorizationType.OIDC,
                openIdConnectConfig: {
                    oidcProvider: props.oidcProvider,
                    clientId: props.oidcClientId,
                },
            };


        } else {
            const userPool = cognito.UserPool.fromUserPoolId(
                this,
                "apiUserPool",
                props.userPoolId
            );

            authDefaultConfig = {
                authorizationType: appsync.AuthorizationType.USER_POOL,
                userPoolConfig: {
                    userPool: userPool,
                    appIdClientRegex: props.userPoolClientId,
                    defaultAction: appsync.UserPoolDefaultAction.ALLOW,
                },
            };
        }

        this.graphqlApi = new appsync.GraphqlApi(this, "API", {
            name: `${Aws.STACK_NAME} - GraphQL APIs`,
            schema: appsync.SchemaFile.fromAsset(
                path.join(__dirname, "../../graphql/schema.graphql")
            ),
            authorizationConfig: {
                defaultAuthorization: authDefaultConfig,
                additionalAuthorizationModes: [
                    {
                        authorizationType: appsync.AuthorizationType.IAM,
                    },
                ],
            },
            logConfig: {
                fieldLogLevel: appsync.FieldLogLevel.ERROR,
                role: apiLogRole,
            },
            xrayEnabled: true,
        });


        // This Lambda is to create the AppSync Service Linked Role
        const appSyncServiceLinkRoleFn = new lambda.Function(
            this,
            "AppSyncServiceLinkRoleFn",
            {
                runtime: lambda.Runtime.PYTHON_3_11,
                code: lambda.Code.fromAsset(
                    path.join(__dirname, "../../lambda/custom-resource")
                ),
                handler: "create_service_linked_role.lambda_handler",
                timeout: Duration.seconds(60),
                memorySize: 128,
                description: `${Aws.STACK_NAME} - Service Linked Role Create Handler`,
                layers: [SharedPythonLayer.getInstance(this)]
            }
        );

        // Grant IAM Policy to the appSyncServiceLinkRoleFn lambda
        const iamPolicy = new iam.PolicyStatement({
            actions: ["iam:GetRole", "iam:CreateServiceLinkedRole"],
            effect: iam.Effect.ALLOW,
            resources: ["*"],
        });
        appSyncServiceLinkRoleFn.addToRolePolicy(iamPolicy);

        const appSyncServiceLinkRoleFnProvider = new cr.Provider(this, "AppSyncServiceLinkRoleProvider", {
            onEventHandler: appSyncServiceLinkRoleFn,
        });
      
        const appSyncServiceLinkRoleFnCR = new CustomResource(this, "AppSyncServiceLinkRoleFnCR", {
            serviceToken: appSyncServiceLinkRoleFnProvider.serviceToken,
            properties: {
                service: "Lambda",
                action: "invoke",
                parameters: {
                    FunctionName: appSyncServiceLinkRoleFn.functionName,
                    InvocationType: "Event",
                },
                physicalResourceId: cr.PhysicalResourceId.of(Date.now().toString()),
            },
        });
      
        appSyncServiceLinkRoleFnCR.node.addDependency(appSyncServiceLinkRoleFn);

        this.graphqlApi.node.addDependency(appSyncServiceLinkRoleFnCR);

    }
}

class InjectCustomerResourceConfig implements IAspect {
    public constructor(private isInstallLatestAwsSdk: string) { }

    public visit(node: IConstruct): void {
        if (node instanceof CfnResource && node.cfnResourceType === "Custom::AWS") {
            node.addPropertyOverride(
                "InstallLatestAwsSdk",
                this.isInstallLatestAwsSdk
            );
        }
    }
}
