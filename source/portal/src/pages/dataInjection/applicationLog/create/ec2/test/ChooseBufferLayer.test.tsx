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
import React from "react";
import { renderWithProviders } from "test-utils";
import { AppStoreMockData } from "test/store.mock";
import { MemoryRouter } from "react-router-dom";
import ChooseBufferLayer from "../ChooseBufferLayer";
import { AppSyncAuthType } from "types";
import { buildInitPipelineData } from "assets/js/init";

jest.mock("react-i18next", () => ({
  useTranslation: () => {
    return {
      t: (key: any) => key,
      i18n: {
        changeLanguage: jest.fn(),
      },
    };
  },
  initReactI18next: {
    type: "3rdParty",
    init: jest.fn(),
  },
}));

beforeEach(() => {
  jest.spyOn(console, "error").mockImplementation(jest.fn());
});

describe("ChooseBufferLayer", () => {
  it("renders without errors", () => {
    const { getByText } = renderWithProviders(
      <MemoryRouter>
        <ChooseBufferLayer
          notConfirmNetworkError={false}
          applicationLog={buildInitPipelineData({
            aws_project_region: "",
            aws_appsync_graphqlEndpoint: "",
            aws_appsync_region: "",
            aws_appsync_authenticationType:
              AppSyncAuthType.AMAZON_COGNITO_USER_POOLS,
            aws_oidc_provider: "",
            aws_oidc_client_id: "",
            aws_oidc_customer_domain: "",
            aws_cloudfront_url: "",
            aws_cognito_region: "",
            aws_user_pools_id: "",
            aws_user_pools_web_client_id: "",
            default_logging_bucket: "",
            default_cmk_arn: "",
            solution_version: "",
            solution_name: "",
            template_bucket: "",
            sns_email_topic_arn: "",
            oidc_logout_url: "",
          })}
          setApplicationLog={jest.fn()}
        />
      </MemoryRouter>,
      {
        preloadedState: {
          app: {
            ...AppStoreMockData,
          },
        },
      }
    );
    expect(
      getByText(/applog:create.ingestSetting.create/i)
    ).toBeInTheDocument();
  });
});
