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
import ConfigDetail from "../ConfigDetail";
import { screen, act, fireEvent } from "@testing-library/react";
import { appSyncRequestMutation, appSyncRequestQuery } from "assets/js/request";
import { mockConfigData } from "test/config.mock";

jest.mock("assets/js/request", () => ({
  appSyncRequestQuery: jest.fn(),
  appSyncRequestMutation: jest.fn(),
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

beforeEach(() => {
  // Make useParams return the mock parameters
  jest.spyOn(console, "error").mockImplementation(jest.fn());
});

describe("ConfigDetail", () => {
  it("renders without errors", async () => {
    await act(async () => {
      renderWithProviders(
        <MemoryRouter initialEntries={["/resources/instance-group"]}>
          <ConfigDetail />
        </MemoryRouter>
      );
    });
  });

  it("renders with config data", async () => {
    (appSyncRequestQuery as any).mockResolvedValue({
      data: {
        getLogConfig: mockConfigData,
      },
    });

    await act(async () => {
      renderWithProviders(
        <MemoryRouter initialEntries={["/resources/instance-group"]}>
          <ConfigDetail />
        </MemoryRouter>
      );
    });
  });

  it("renders without config id", async () => {
    (appSyncRequestQuery as any).mockResolvedValue({
      data: {
        getLogConfig: { ...mockConfigData, id: "" },
      },
    });

    await act(async () => {
      renderWithProviders(
        <MemoryRouter initialEntries={["/resources/instance-group"]}>
          <ConfigDetail />
        </MemoryRouter>
      );
    });
  });

  it("renders without version", async () => {
    jest.mock("react-router-dom", () => ({
      ...jest.requireActual("react-router-dom"),
      useParams: () => ({
        id: "mockedId",
        version: "",
      }),
      useNavigate: () => jest.fn(),
    }));
    (appSyncRequestQuery as any).mockResolvedValue({
      data: {
        getLogConfig: { ...mockConfigData, id: "" },
      },
    });

    await act(async () => {
      renderWithProviders(
        <MemoryRouter initialEntries={["/resources/instance-group"]}>
          <ConfigDetail />
        </MemoryRouter>
      );
    });
  });

  it("renders delete log config", async () => {
    (appSyncRequestQuery as any).mockResolvedValue({
      data: {
        getLogConfig: mockConfigData,
      },
    });
    (appSyncRequestMutation as any).mockResolvedValue({
      data: { deleteLogConfig: "OK" },
    });

    await act(async () => {
      renderWithProviders(
        <MemoryRouter initialEntries={["/resources/instance-group"]}>
          <ConfigDetail />
        </MemoryRouter>
      );
    });

    // Click delete button
    const deleteButton = screen.getByTestId("delete-button");
    expect(deleteButton).toBeInTheDocument();
    fireEvent.click(deleteButton);

    // Click confirm button
    const confirmButton = screen.getByTestId("confirm-delete-button");
    expect(confirmButton).toBeInTheDocument();
    fireEvent.click(confirmButton);

    // Click cancel button
    const cancelButton = screen.getByTestId("cancel-delete-button");
    expect(cancelButton).toBeInTheDocument();
    fireEvent.click(cancelButton);
  });
});
