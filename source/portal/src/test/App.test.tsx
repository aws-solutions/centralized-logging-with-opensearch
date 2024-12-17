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

import { renderWithProviders } from "test-utils";
import { AppStoreMockData } from "test/store.mock";
import { MemoryRouter } from "react-router-dom";
import App from "../App";
import axios from "axios";
import { act } from "@testing-library/react";
import { AppSyncAuthType } from "types";

jest.mock("axios", () => ({
  get: jest.fn(),
}));

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

beforeAll(() => {
  if (!global.performance) {
    global.performance = window.performance;
  }

  (global.performance as any).getEntriesByType = jest.fn((type) => {
    if (type === "navigation") {
      return [{ type: "reload" }];
    }
    return [];
  });
});

beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
  jest.spyOn(console, "error").mockImplementation(jest.fn());
});

describe("App component tests with open id", () => {
  it("should display loading initially", async () => {
    await act(async () => {
      const configData = {
        aws_appsync_authenticationType: AppSyncAuthType.OPEN_ID,
        aws_oidc_provider: "https://example.com",
        aws_oidc_client_id: "client123",
        aws_cloudfront_url: "cloudfront.net",
        aws_oidc_customer_domain: "www.example.com",
      };
      (axios.get as any).mockImplementation(() =>
        Promise.resolve({ data: configData })
      );
      renderWithProviders(
        <MemoryRouter initialEntries={["/"]}>
          <App />
        </MemoryRouter>,
        {
          preloadedState: {
            app: {
              ...AppStoreMockData,
            },
          },
        }
      );
    });
  });
});

describe("App component tests with cognito", () => {
  it("should display loading initially", async () => {
    await act(async () => {
      const configData = {
        aws_appsync_authenticationType:
          AppSyncAuthType.AMAZON_COGNITO_USER_POOLS,
        aws_oidc_provider: "https://example.com",
        aws_oidc_client_id: "client123",
        aws_cloudfront_url: "cloudfront.net",
        aws_oidc_customer_domain: "www.example.com",
      };
      (axios.get as any).mockImplementation(() =>
        Promise.resolve({ data: configData })
      );
      renderWithProviders(
        <MemoryRouter initialEntries={["/"]}>
          <App />
        </MemoryRouter>,
        {
          preloadedState: {
            app: {
              ...AppStoreMockData,
            },
          },
        }
      );
    });
  });
});
