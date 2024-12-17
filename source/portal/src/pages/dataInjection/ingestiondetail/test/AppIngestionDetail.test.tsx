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
import { MemoryRouter, useParams } from "react-router-dom";
import AppIngestionDetail from "../AppIngestionDetail";
import { appSyncRequestQuery } from "assets/js/request";
import { MockAppLogDetailData } from "test/applog.mock";
import { instanceGroupMockData } from "test/instance.mock";

// Mock the useParams hook before importing the component
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"), // preserve other exports
  useParams: jest.fn(), // mock useParams
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

jest.mock("assets/js/request", () => ({
  appSyncRequestQuery: jest.fn(),
  appSyncRequestMutation: jest.fn(),
}));

beforeEach(() => {
  const mockParams = { id: "xxxxx", version: "1" };
  // Make useParams return the mock parameters
  (useParams as any).mockReturnValue(mockParams);
  jest.spyOn(console, "error").mockImplementation(jest.fn());
});

describe("AppIngestionDetail", () => {
  it("renders without errors", () => {
    (appSyncRequestQuery as any).mockResolvedValue({
      data: {
        getAppPipeline: { ...MockAppLogDetailData },
        getLogSource: instanceGroupMockData,
        getAppLogIngestion: {
          id: "xxxxxx",
          stackId: null,
          stackName: null,
          appPipelineId: "xxxxxxx",
          logPath: "%2Fvar%2Flog%2Fcontainers%2Fsolax.log",
          sourceId: "b3dbe785-376b-44f1-b085-c0ba187d6edf",
          sourceType: "EC2",
          createdAt: "2024-03-26T09:32:34Z",
          status: "ACTIVE",
          tags: [],
          accountId: "123456789012",
          region: "us-west-2",
          __typename: "AppLogIngestion",
        },
      },
    });
    const { getByTestId } = renderWithProviders(
      <MemoryRouter>
        <AppIngestionDetail />
      </MemoryRouter>,
      {
        preloadedState: {
          app: {
            ...AppStoreMockData,
          },
        },
      }
    );
    expect(getByTestId("gsui-loading")).toBeInTheDocument();
  });
});
