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
import LogConfig from "../LogConfig";
import { appSyncRequestQuery } from "assets/js/request";
import { screen, act, waitFor, fireEvent } from "@testing-library/react";
import { mockConfigListResource } from "test/config.mock";

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

describe("LogConfig", () => {
  it("renders without errors", () => {
    const { getByText } = renderWithProviders(
      <MemoryRouter initialEntries={["/resources/log-config"]}>
        <LogConfig />
      </MemoryRouter>,
      {
        preloadedState: {
          app: {
            ...AppStoreMockData,
          },
        },
      }
    );
    expect(getByText(/button.createLogConfig/i)).toBeInTheDocument();
  });

  it("renders with data", async () => {
    (appSyncRequestQuery as any).mockResolvedValue({
      data: {
        listLogConfigs: { logConfigs: mockConfigListResource, total: 1 },
      },
    });
    await act(async () => {
      renderWithProviders(
        <MemoryRouter initialEntries={["/resources/log-config"]}>
          <LogConfig />
        </MemoryRouter>
      );
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId("refresh-button"));
    });
  });

  it("should test confirm remove log config", async () => {
    (appSyncRequestQuery as any).mockResolvedValue({
      data: {
        listLogConfigs: { logConfigs: mockConfigListResource, total: 1 },
      },
    });
    await act(async () => {
      renderWithProviders(
        <MemoryRouter initialEntries={["/resources/log-config"]}>
          <LogConfig />
        </MemoryRouter>
      );
    });

    await waitFor(() => {
      expect(screen.queryByText("gsui-loading")).not.toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId("table-item-xxxx"));
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId("delete-button"));
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId("create-button"));
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId("confirm-delete-button"));
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId("cancel-delete-button"));
    });
  });
});
