// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

export const AppStoreMockData = {
  counter: 0,
  userEmail: "",
  domainMap: {},
  amplifyConfig: {
    aws_project_region: "us-east-2",
    aws_appsync_graphqlEndpoint:
      "https://xxxx.appsync-api.us-east-2.amazonaws.com/graphql",
    aws_appsync_region: "us-east-2",
    aws_appsync_authenticationType: "AMAZON_COGNITO_USER_POOLS",
    aws_oidc_provider: "",
    aws_oidc_client_id: "",
    aws_oidc_customer_domain: "",
    aws_cloudfront_url: "xxxx.cloudfront.net",
    aws_cognito_region: "us-east-2",
    aws_user_pools_id: "us-east-xxxx",
    aws_user_pools_web_client_id: "6eg0tub719m538pc72b8qube7r",
    default_logging_bucket: "xxxx-xxxx-xxxx",
    default_cmk_arn: "arn:aws:kms:us-east-2:xxxx:key/xxx-xxx-xxx-xxx-xxx",
    solution_version: "develop",
    solution_name: "centralized-logging-with-opensearch",
    template_bucket: "xxx-xxx-xxx",
  },
  openSideMenu: true,
  showInfoBar: false,
  infoBarType: undefined,
};

export const MockMemberAccountData = {
  id: "test",
  subAccountId: "111111111111",
  region: "us-example-1",
  subAccountName: "test-en",
  subAccountRoleArn:
    "arn:aws:iam::111111111111:role/test-CrossAccountRoleFACE29D1-xxx",
  agentInstallDoc: "test-FluentBitDocumentInstallationForLinux-xxx",
  agentConfDoc: "test-FluentBitConfigDownloading-xxx",
  windowsAgentInstallDoc:
    "test-WindowsFluentBitDocumentInstallationForWindows-xxxx",
  windowsAgentConfDoc: "test-FluentBitConfigDownloadingForWindows-xxxx",
  agentStatusCheckDoc: "test-FluentBitStatusCheckDocument-xxxx",
  subAccountBucketName: "test-xxxx-xxxx",
  subAccountStackId:
    "arn:aws:cloudformation:us-example-1:111111111111:stack/test/xxxx-xxxx-xxxx-xxxx-xxxx",
  subAccountKMSKeyArn:
    "arn:aws:kms:us-example-1:111111111111:key/xxxx-xxxx-xxxx-xxxx-xxxx",
  subAccountVpcId: "vpc-test",
  subAccountPublicSubnetIds: "subnet-1, subnet-2",
  subAccountIamInstanceProfileArn:
    "arn:aws:iam::111111111111:instance-profile/test-xxxx-xxxx",
  subAccountFlbConfUploadingEventTopicArn:
    "arn:aws:sns:us-example-1:111111111111:test-FlbUploadingEventSubscriptionTopic822D837F-xxxx",
  createdAt: "2024-02-05T02:38:03Z",
  status: "ACTIVE",
  tags: [],
  __typename: "SubAccountLink",
};

export const MockNewAccountData = [
  "test-en",
  "111111111111",
  "arn:aws:iam::111111111111:role/test-CrossAccountRoleFACE29D1-xxx",
  "test-FluentBitDocumentInstallationForLinux-xxx",
  "test-FluentBitConfigDownloading-xxx",
  "test-WindowsFluentBitDocumentInstallationForWindows-xxxx",
  "test-FluentBitConfigDownloadingForWindows-xxxx",
  "test-FluentBitStatusCheckDocument-xxxx",
  "test-xxxx-xxxx",
  "arn:aws:cloudformation:us-example-1:111111111111:stack/test/xxxx-xxxx-xxxx-xxxx-xxxx",
  "arn:aws:kms:us-example-1:111111111111:key/xxxx-xxxx-xxxx-xxxx-xxxx",
  "arn:aws:iam::111111111111:instance-profile/test-xxxx-xxxx",
  "arn:aws:sns:us-example-1:111111111111:test-FlbUploadingEventSubscriptionTopic822D837F-xxxx",
];
