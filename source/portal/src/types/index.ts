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
import { AUTH_TYPE } from "aws-appsync-auth-link";
export enum YesNo {
  Yes = "Yes",
  No = "No",
}

export enum CreationMethod {
  New = "New",
  Exists = "Exists",
}

export enum SupportPlugin {
  Geo = "geo_ip",
  UserAgent = "user_agent",
}

export enum AppSyncAuthType {
  OPEN_ID = AUTH_TYPE.OPENID_CONNECT,
  AMAZON_COGNITO_USER_POOLS = AUTH_TYPE.AMAZON_COGNITO_USER_POOLS,
}
export interface AmplifyConfigType {
  aws_project_region: string;
  aws_appsync_graphqlEndpoint: string;
  aws_appsync_region: string;
  aws_appsync_authenticationType: AppSyncAuthType;
  aws_cognito_region: string;
  aws_user_pools_id: string;
  aws_user_pools_web_client_id: string;
  default_logging_bucket: string;
  aws_oidc_provider: string;
  aws_oidc_client_id: string;
  aws_oidc_customer_domain: string;
  aws_cloudfront_url: string;
  loghub_version: string;
  default_cmk_arn: string;
}
