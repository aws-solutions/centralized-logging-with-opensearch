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
import NotificationBar from "../NotificationBar";
import { renderWithProviders } from "test-utils";
import { MemoryRouter } from "react-router-dom";
import { appSyncRequestQuery } from "assets/js/request";
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

jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useParams: () => ({
    id: "mockedId",
    name: "mockedName",
  }),
  useNavigate: () => jest.fn(),
}));

jest.mock("assets/js/request", () => ({
  appSyncRequestQuery: jest.fn(),
  appSyncRequestMutation: jest.fn(),
}));

beforeEach(() => {
  jest.spyOn(console, "error").mockImplementation(jest.fn());
});

afterEach(() => {
  jest.clearAllMocks();
});

describe("NotificationBar", () => {
  it("renders without errors", () => {
    renderWithProviders(
      <MemoryRouter>
        <NotificationBar />
      </MemoryRouter>
    );
  });

  it("renders with data without new version", async () => {
    (appSyncRequestQuery as any).mockResolvedValue({
      data: {
        latestVersion: '{"version":"unknown"}',
      },
    });
    await act(async () => {
      renderWithProviders(
        <MemoryRouter>
          <NotificationBar />
        </MemoryRouter>
      );
    });
  });

  it("renders with data with new version", async () => {
    (appSyncRequestQuery as any).mockResolvedValue({
      data: {
        latestVersion: '{"version":"v10.0"}',
      },
    });
    await act(async () => {
      renderWithProviders(
        <MemoryRouter>
          <NotificationBar />
        </MemoryRouter>
      );
    });

    // click learn more button
    await act(async () => {
      fireEvent.click(screen.getByTestId("learn-more-button"));
    });

    // click dismiss button
    await act(async () => {
      fireEvent.click(screen.getByTestId("dismiss-button"));
    });
  });
});
