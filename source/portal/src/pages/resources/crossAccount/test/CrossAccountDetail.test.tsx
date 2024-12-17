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
import { MemoryRouter, useParams } from "react-router-dom";
import CrossAccountDetail from "../CrossAccountDetail";
import { screen, act, fireEvent } from "@testing-library/react";
import { appSyncRequestMutation, appSyncRequestQuery } from "assets/js/request";
import { MockMemberAccountData } from "test/store.mock";

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
  const mockParams = { id: "test" };
  // Make useParams return the mock parameters
  (useParams as any).mockReturnValue(mockParams);
  jest.spyOn(console, "error").mockImplementation(jest.fn());
});

describe("CrossAccountDetail", () => {
  it("renders without errors", async () => {
    await act(async () => {
      renderWithProviders(
        <MemoryRouter>
          <CrossAccountDetail />
        </MemoryRouter>
      );
    });
    expect(screen.getByText(/resource:crossAccount.name/i)).toBeInTheDocument();
  });

  it("renders with data", async () => {
    (appSyncRequestQuery as any).mockResolvedValue({
      data: {
        getSubAccountLink: MockMemberAccountData,
      },
    });

    await act(async () => {
      renderWithProviders(
        <MemoryRouter>
          <CrossAccountDetail />
        </MemoryRouter>
      );
    });
  });

  it("should click the cancel button", async () => {
    await act(async () => {
      renderWithProviders(
        <MemoryRouter>
          <CrossAccountDetail />
        </MemoryRouter>
      );
    });
    const cancelButton = screen.getByTestId("cancel-button");
    expect(cancelButton).toBeInTheDocument();
    cancelButton.click();
  });

  it("should click the update button when data valid", async () => {
    (appSyncRequestQuery as any).mockResolvedValue({
      data: {
        getSubAccountLink: MockMemberAccountData,
      },
    });

    (appSyncRequestMutation as any).mockResolvedValue({
      data: { updateSubAccountLink: "OK" },
    });

    await act(async () => {
      renderWithProviders(
        <MemoryRouter>
          <CrossAccountDetail />
        </MemoryRouter>
      );
    });

    const saveButton = screen.getByTestId("save-button");
    expect(saveButton).toBeInTheDocument();
    fireEvent.click(saveButton);
  });

  it("should click the update button when data bucket invalid", async () => {
    (appSyncRequestQuery as any).mockResolvedValue({
      data: {
        getSubAccountLink: {
          ...MockMemberAccountData,
          subAccountBucketName: "Invalid Bucket Name",
        },
      },
    });

    (appSyncRequestMutation as any).mockResolvedValue({
      data: { updateSubAccountLink: "OK" },
    });

    await act(async () => {
      renderWithProviders(
        <MemoryRouter>
          <CrossAccountDetail />
        </MemoryRouter>
      );
    });

    const saveButton = screen.getByTestId("save-button");
    expect(saveButton).toBeInTheDocument();
    fireEvent.click(saveButton);
  });

  it("should click the update button when data account id invalid", async () => {
    (appSyncRequestQuery as any).mockResolvedValue({
      data: {
        getSubAccountLink: {
          ...MockMemberAccountData,
          subAccountId: "invalid-account-id",
        },
      },
    });

    (appSyncRequestMutation as any).mockResolvedValue({
      data: { updateSubAccountLink: "OK" },
    });

    await act(async () => {
      renderWithProviders(
        <MemoryRouter>
          <CrossAccountDetail />
        </MemoryRouter>
      );
    });

    const saveButton = screen.getByTestId("save-button");
    expect(saveButton).toBeInTheDocument();
    fireEvent.click(saveButton);
  });
});
