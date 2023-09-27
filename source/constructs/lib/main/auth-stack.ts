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
import { Construct } from "constructs";
import {
  Stack,
  RemovalPolicy,
  Duration,
  aws_cognito as cognito,
} from "aws-cdk-lib";
import { constructFactory } from "../util/stack-helper";
export interface AuthProps {
  /**
   * Username to create an initial Admin user in Cognito User Pool
   *
   * @default - None.
   */
  readonly username: string;
  readonly solutionName?: string;
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

    const stackPrefix = 'CL';

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
        requireLowercase: true,
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
      accessTokenValidity: Duration.minutes(15),
      idTokenValidity: Duration.minutes(15),
      preventUserExistenceErrors: true,
    });

    // Create an Admin User
    constructFactory(cognito.CfnUserPoolUser)(this, "AdminUser", {
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
        domainPrefix: `${stackPrefix.toLowerCase()}-portal-${Stack.of(this).account}`,
      },
    });

    this.userPoolId = userPool.userPoolId;
    this.userPoolClientId = userPoolClient.userPoolClientId;
    this.userPoolDomain = userPoolDomain.cloudFrontDomainName;
  }
}
