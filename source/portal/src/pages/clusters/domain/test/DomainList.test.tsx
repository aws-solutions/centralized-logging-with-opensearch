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
import DomainList from "../DomainList";
import { renderWithProviders } from "test-utils";
import { MemoryRouter } from "react-router-dom";
import { AppStoreMockData } from "test/store.mock";
import { appSyncRequestMutation, appSyncRequestQuery } from "assets/js/request";
import { domainMockData, mockImportedDomainList } from "test/domain.mock";
import { screen, act, waitFor, fireEvent } from "@testing-library/react";

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

afterEach(() => {
  jest.clearAllMocks();
});

describe("DomainList Success", () => {
  beforeEach(() => {
    jest.spyOn(console, "error").mockImplementation(jest.fn());
    (appSyncRequestQuery as any).mockResolvedValue({
      data: {
        listImportedDomains: mockImportedDomainList,
        getDomainDetails: domainMockData,
      },
    });
    (appSyncRequestMutation as any).mockResolvedValue({
      data: {
        removeDomain: {
          resources: [{ name: "", values: [], status: "" }],
        },
      },
    });
  });

  it("renders without errors", () => {
    renderWithProviders(
      <MemoryRouter>
        <DomainList />
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

  it("should render the alarm list after get data", async () => {
    await act(async () => {
      renderWithProviders(
        <MemoryRouter>
          <DomainList />
        </MemoryRouter>
      );
    });

    await waitFor(() => {
      expect(screen.queryByText("loading")).not.toBeInTheDocument();
    });

    expect(screen.getByText(/button.importDomain/i)).toBeInTheDocument();
  });

  it("should test refresh button", async () => {
    await act(async () => {
      renderWithProviders(
        <MemoryRouter>
          <DomainList />
        </MemoryRouter>
      );
    });
    await waitFor(() => {
      expect(screen.queryByText("gsui-loading")).not.toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId("refresh-button"));
    });
  });

  it("should test confirm remove domain button", async () => {
    await act(async () => {
      renderWithProviders(
        <MemoryRouter>
          <DomainList />
        </MemoryRouter>
      );
    });

    await waitFor(() => {
      expect(screen.queryByText("gsui-loading")).not.toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId("table-item-xxxxx"));
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId("remove-button"));
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId("confirm-remove-button"));
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId("import-button"));
    });
  });

  it("should test cancel button", async () => {
    await act(async () => {
      renderWithProviders(
        <MemoryRouter>
          <DomainList />
        </MemoryRouter>
      );
    });

    await waitFor(() => {
      expect(screen.queryByText("gsui-loading")).not.toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId("table-item-xxxxx"));
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId("remove-button"));
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId("cancel-remove-button"));
    });
  });
});

describe("DomainList Failed", () => {
  it("renders without errors when get data failed", () => {
    jest.spyOn(console, "error").mockImplementation(jest.fn());
    (appSyncRequestQuery as any).mockResolvedValue(() =>
      Promise.reject(new Error("Failed to fetch"))
    );
    renderWithProviders(
      <MemoryRouter>
        <DomainList />
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
