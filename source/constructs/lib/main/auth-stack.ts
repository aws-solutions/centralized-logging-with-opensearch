// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
import {
  Duration,
  RemovalPolicy,
  Stack,
  aws_cognito as cognito,
} from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { constructFactory } from '../util/stack-helper';
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
    const userPool = new cognito.UserPool(this, 'UserPool', {
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
      userInvitation: {
        emailSubject: 'Welcome to Centralized Logging with OpenSearch',
        emailBody: `Hello,<br><br>Welcome to Centralized Logging with OpenSearch <br><br>Your username is {username}<br>Your temporary password is {####}`,
      },
    });

    const cfnUserPool = userPool.node.defaultChild as cognito.CfnUserPool;
    cfnUserPool.userPoolAddOns = {
      advancedSecurityMode: 'ENFORCED',
    };

    // Create User Pool Client
    const userPoolClient = new cognito.UserPoolClient(this, 'APIClient', {
      userPool: userPool,
      accessTokenValidity: Duration.minutes(15),
      idTokenValidity: Duration.minutes(15),
      preventUserExistenceErrors: true,
      refreshTokenValidity: Duration.days(1),
    });

    // Create an Admin User
    constructFactory(cognito.CfnUserPoolUser)(this, 'AdminUser', {
      userPoolId: userPool.userPoolId,
      username: props.username,
      userAttributes: [
        {
          name: 'email',
          value: props.username,
        },
      ],
    });

    // Create an unique cognito domain
    const userPoolDomain = new cognito.UserPoolDomain(this, 'UserPoolDomain', {
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
