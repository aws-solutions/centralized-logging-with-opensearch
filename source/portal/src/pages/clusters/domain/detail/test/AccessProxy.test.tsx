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
import AccessProxy from "../AccessProxy";
import { renderWithProviders } from "test-utils";
import { MemoryRouter } from "react-router-dom";
import { domainMockData } from "test/domain.mock";
import { AppStoreMockData } from "test/store.mock";
import { screen, act, waitFor, fireEvent } from "@testing-library/react";
import { appSyncRequestMutation } from "assets/js/request";
import { StackStatus } from "API";

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
  appSyncRequestMutation: jest.fn(),
}));

beforeEach(() => {
  jest.spyOn(console, "error").mockImplementation(jest.fn());
});

afterEach(() => {
  jest.restoreAllMocks();
  jest.clearAllMocks();
});

describe("AccessProxy", () => {
  const mockReloadDetailInfo = jest.fn();
  it("renders without errors", () => {
    renderWithProviders(
      <MemoryRouter>
        <AccessProxy
          domainInfo={{
            ...domainMockData,
          }}
          reloadDetailInfo={mockReloadDetailInfo}
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
  });

  it("renders without proxy error status", () => {
    renderWithProviders(
      <MemoryRouter>
        <AccessProxy
          domainInfo={{
            ...domainMockData,
            proxyStatus: StackStatus.ERROR,
          }}
          reloadDetailInfo={mockReloadDetailInfo}
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
  });

  it("renders without vpc", () => {
    renderWithProviders(
      <MemoryRouter>
        <AccessProxy
          domainInfo={{
            ...domainMockData,
            proxyInput: {
              ...domainMockData.proxyInput,
              vpc: undefined,
            } as any,
          }}
          reloadDetailInfo={mockReloadDetailInfo}
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
  });

  it("renders without subnetIds", () => {
    renderWithProviders(
      <MemoryRouter>
        <AccessProxy
          domainInfo={{
            ...domainMockData,
            proxyInput: {
              ...domainMockData.proxyInput,
              vpc: {
                ...domainMockData.proxyInput?.vpc,
                publicSubnetIds: "",
              },
            } as any,
          }}
          reloadDetailInfo={mockReloadDetailInfo}
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
  });

  it("should render data and delete proxy", async () => {
    (appSyncRequestMutation as any).mockResolvedValue({
      data: {
        deleteProxyForOpenSearch: { id: "xx" },
      },
    });
    await act(async () => {
      renderWithProviders(
        <MemoryRouter>
          <AccessProxy
            domainInfo={{
              ...domainMockData,
            }}
            reloadDetailInfo={mockReloadDetailInfo}
          />
        </MemoryRouter>
      );
    });

    const deleteButton = screen.getByTestId("delete-proxy-button");
    await waitFor(() => {
      expect(deleteButton).toBeInTheDocument();
      fireEvent.click(deleteButton);
    });

    const confirmDeleteButton = screen.getByTestId("confirm-delete-button");
    await waitFor(() => {
      expect(confirmDeleteButton).toBeInTheDocument();
      fireEvent.click(confirmDeleteButton);
    });
  });

  it("should render data and cancel delete proxy", async () => {
    await act(async () => {
      renderWithProviders(
        <MemoryRouter>
          <AccessProxy
            domainInfo={{
              ...domainMockData,
            }}
            reloadDetailInfo={mockReloadDetailInfo}
          />
        </MemoryRouter>
      );
    });

    const deleteButton = screen.getByTestId("delete-proxy-button");
    await waitFor(() => {
      expect(deleteButton).toBeInTheDocument();
      fireEvent.click(deleteButton);
    });

    const cancelDeleteButton = screen.getByTestId("cancel-delete-button");
    await waitFor(() => {
      expect(cancelDeleteButton).toBeInTheDocument();
      fireEvent.click(cancelDeleteButton);
    });
  });

  it("should render data and delete proxy with error", async () => {
    (appSyncRequestMutation as any).mockResolvedValue(() =>
      Promise.reject(new Error("Failed to fetch"))
    );
    await act(async () => {
      renderWithProviders(
        <MemoryRouter>
          <AccessProxy
            domainInfo={{
              ...domainMockData,
            }}
            reloadDetailInfo={mockReloadDetailInfo}
          />
        </MemoryRouter>
      );
    });

    const deleteButton = screen.getByTestId("delete-proxy-button");
    await waitFor(() => {
      expect(deleteButton).toBeInTheDocument();
      fireEvent.click(deleteButton);
    });

    const confirmDeleteButton = screen.getByTestId("confirm-delete-button");
    await waitFor(() => {
      expect(confirmDeleteButton).toBeInTheDocument();
      fireEvent.click(confirmDeleteButton);
    });
  });
});
