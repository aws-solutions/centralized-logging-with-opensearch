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
