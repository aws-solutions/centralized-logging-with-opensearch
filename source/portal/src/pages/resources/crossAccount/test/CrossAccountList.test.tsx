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
import { MemoryRouter } from "react-router-dom";
import CrossAccountList from "../CrossAccountList";
import { screen, act, waitFor, fireEvent } from "@testing-library/react";
import { appSyncRequestMutation, appSyncRequestQuery } from "assets/js/request";
import { MockMemberAccountData } from "test/store.mock";

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

describe("CrossAccountList", () => {
  it("renders without errors", async () => {
    await act(async () => {
      renderWithProviders(
        <MemoryRouter>
          <CrossAccountList />
        </MemoryRouter>
      );
    });

    expect(
      screen.getByText(/resource:crossAccount.list.accountName/i)
    ).toBeInTheDocument();
  });

  it("renders with list data", async () => {
    (appSyncRequestQuery as any).mockResolvedValue({
      data: {
        listSubAccountLinks: {
          subAccountLinks: [{ ...MockMemberAccountData }],
          total: 1,
        },
      },
    });
    await act(async () => {
      renderWithProviders(
        <MemoryRouter>
          <CrossAccountList />
        </MemoryRouter>
      );
    });
  });

  it("should click refresh and remove button", async () => {
    (appSyncRequestQuery as any).mockResolvedValue({
      data: {
        listSubAccountLinks: {
          subAccountLinks: [{ ...MockMemberAccountData }],
          total: 1,
        },
      },
    });

    (appSyncRequestMutation as any).mockResolvedValue({
      data: { deleteSubAccountLink: "OK" },
    });
    await act(async () => {
      renderWithProviders(
        <MemoryRouter>
          <CrossAccountList />
        </MemoryRouter>
      );
    });

    await waitFor(() => {
      expect(screen.queryByText("gsui-loading")).not.toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId("refresh-button"));
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId("link-button"));
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId("table-item-test"));
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId("remove-button"));
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId("confirm-remove-button"));
    });
  });
});
