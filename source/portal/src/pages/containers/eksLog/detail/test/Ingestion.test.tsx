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
import Ingestions from "../Ingestions";
import { renderWithProviders } from "test-utils";
import { MemoryRouter } from "react-router-dom";
import { AppStoreMockData } from "test/store.mock";
import { LogSource } from "API";
import { appSyncRequestQuery } from "assets/js/request";
import { MockAppLogDetailData, MockEKSData } from "test/applog.mock";
import { screen, act, fireEvent } from "@testing-library/react";

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
  jest.spyOn(console, "error").mockImplementation(jest.fn());
});

describe("Ingestions", () => {
  it("renders without errors", async () => {
    (appSyncRequestQuery as any).mockResolvedValue({
      data: {
        listAppLogIngestions: {
          appLogIngestions: [
            {
              id: "xxxx",
              stackId: null,
              stackName: null,
              appPipelineId: "xxxxx",
              logPath: "%2Fvar%2Flog%2Fcontainers%2F*_nested-json-*.log",
              sourceId: "xxxx",
              sourceType: "EKSCluster",
              createdAt: "2023-11-14T02:29:16Z",
              status: "ACTIVE",
              tags: [],
              accountId: "123456789012",
              region: "us-west-2",
              __typename: "AppLogIngestion",
            },
          ],
          total: 1,
        },
        getAppPipeline: { ...MockAppLogDetailData },
      },
    });

    await act(async () => {
      renderWithProviders(
        <MemoryRouter>
          <Ingestions eksLogSourceInfo={MockEKSData as LogSource} />
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

    // select on ingestion
    await act(async () => {
      fireEvent.click(screen.getByTestId("table-item-xxxx"));
    });

    // click delete button
    await act(async () => {
      fireEvent.click(screen.getByTestId("eks-ingestion-delete-button"));
    });

    // click confirm delete button
    await act(async () => {
      fireEvent.click(
        screen.getByTestId("eks-ingestion-confirm-delete-button")
      );
    });

    // click create source button
    await act(async () => {
      fireEvent.click(screen.getByTestId("eks-ingestion-create-button"));
    });

    // click create refresh button
    await act(async () => {
      fireEvent.click(screen.getByTestId("eks-ingestion-refresh-button"));
    });
  });
});
