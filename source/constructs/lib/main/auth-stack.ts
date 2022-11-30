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
import { Stack, RemovalPolicy, aws_cognito as cognito } from "aws-cdk-lib";
export interface AuthProps {
  /**
   * Username to create an initial Admin user in Cognito User Pool
   *
   * @default - None.
   */
  readonly username: string;
}

/**
 * Stack to provision Cognito User Pool.
 */
export class AuthStack extends Construct {
  readonly userPoolId: string;
  readonly userPoolClientId: string;
  readonly userPoolDomain: string;

  constructor(scope: Construct, id: string, props: AuthProps) {
    super(scope, id);

    // Create Cognito User Pool
    const userPool = new cognito.UserPool(this, "UserPool", {
      selfSignUpEnabled: false,
      signInCaseSensitive: false,
      signInAliases: {
        email: true,
      },
      removalPolicy: RemovalPolicy.DESTROY,
      passwordPolicy: {
        minLength: 8,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: true,
      },
    });

    const cfnUserPool = userPool.node.defaultChild as cognito.CfnUserPool;
    cfnUserPool.userPoolAddOns = {
      advancedSecurityMode: "ENFORCED",
    };

    // Create User Pool Client
    const userPoolClient = new cognito.UserPoolClient(this, "APIClient", {
      userPool: userPool,
      preventUserExistenceErrors: true,
    });

    // Create an Admin User
    new cognito.CfnUserPoolUser(this, "AdminUser", {
      userPoolId: userPool.userPoolId,
      username: props.username,
      userAttributes: [
        {
          name: "email",
          value: props.username,
        },
      ],
    });

    // Create an unique cognito domain
    const userPoolDomain = new cognito.UserPoolDomain(this, "UserPoolDomain", {
      userPool: userPool,
      cognitoDomain: {
        domainPrefix: `loghub-portal-${Stack.of(this).account}`,
      },
    });

    this.userPoolId = userPool.userPoolId;
    this.userPoolClientId = userPoolClient.userPoolClientId;
    this.userPoolDomain = userPoolDomain.cloudFrontDomainName;
  }
}
