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
import ApplicationLog from "../ApplicationLog";
import { appSyncRequestMutation, appSyncRequestQuery } from "assets/js/request";
import { screen, act, fireEvent } from "@testing-library/react";
import { MockAppLogDetailData } from "test/applog.mock";

jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useParams: jest.fn(),
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
  jest.spyOn(console, "error").mockImplementation(jest.fn());
});

describe("ApplicationLog", () => {
  it("renders without errors", async () => {
    (appSyncRequestQuery as any).mockResolvedValue({
      data: {
        listAppPipelines: {
          appPipelines: [{ ...MockAppLogDetailData }],
          total: 1,
        },
      },
    });

    (appSyncRequestMutation as any).mockResolvedValue({
      data: {
        deleteAppPipeline: "OK",
      },
    });

    await act(async () => {
      renderWithProviders(
        <MemoryRouter>
          <ApplicationLog />
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

    // select pipeline item
    await act(async () => {
      fireEvent.click(screen.getByTestId("table-item-test"));
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId("app-log-actions"));
    });

    // click delete button
    await act(async () => {
      fireEvent.click(screen.getByTestId("delete-button"));
    });

    // confirm delete button
    await act(async () => {
      fireEvent.click(screen.getByTestId("confirm-delete-button"));
    });

    // click cancel button
    await act(async () => {
      fireEvent.click(screen.getByTestId("cancel-delete-button"));
    });

    // click view detail button
    await act(async () => {
      fireEvent.click(screen.getByTestId("app-log-actions"));
    });

    // click create button
    await act(async () => {
      fireEvent.click(screen.getByTestId("create-button"));
    });

    // click refresh button
    await act(async () => {
      fireEvent.click(screen.getByTestId("refresh-button"));
    });
  });
});
