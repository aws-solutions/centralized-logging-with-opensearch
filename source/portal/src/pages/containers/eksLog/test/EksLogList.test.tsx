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
import EksLogList from "../EksLogList";
import { renderWithProviders } from "test-utils";
import { MemoryRouter } from "react-router-dom";
import { appSyncRequestMutation, appSyncRequestQuery } from "assets/js/request";
import { screen, act, fireEvent } from "@testing-library/react";
import { MockEKSData } from "test/applog.mock";

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

describe("EksLogList", () => {
  it("renders without errors", async () => {
    (appSyncRequestQuery as any).mockResolvedValue({
      data: {
        listLogSources: {
          logSources: [MockEKSData],
          total: 1,
        },
      },
    });
    (appSyncRequestMutation as any).mockResolvedValue({
      data: {
        deleteLogSource: "OK",
      },
    });
    await act(async () => {
      renderWithProviders(
        <MemoryRouter initialEntries={["/resources/log-config"]}>
          <EksLogList />
        </MemoryRouter>
      );
    });

    // click import button
    await act(async () => {
      const importButton = screen.getByTestId("import-button");
      fireEvent.click(importButton);
    });

    // select item
    await act(async () => {
      fireEvent.click(screen.getByTestId("table-item-xxxx"));
    });

    // click remove button
    await act(async () => {
      const removeButton = screen.getByTestId("remove-button");
      fireEvent.click(removeButton);
    });

    // click confirm remove button
    await act(async () => {
      const confirmRemoveButton = screen.getByTestId("confirm-delete-button");
      fireEvent.click(confirmRemoveButton);
    });

    // click cancel remove button
    await act(async () => {
      const cancelRemoveButton = screen.getByTestId("cancel-delete-button");
      fireEvent.click(cancelRemoveButton);
    });

    // click refresh button
    await act(async () => {
      const refreshButton = screen.getByTestId("refresh-button");
      fireEvent.click(refreshButton);
    });
  });
});
