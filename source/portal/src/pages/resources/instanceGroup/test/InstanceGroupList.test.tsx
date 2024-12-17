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
import InstanceGroupList from "../InstanceGroupList";
import { screen, act, fireEvent } from "@testing-library/react";
import {
  instanceGroupMockData,
  MockInstanceLogSources,
} from "test/instance.mock";
import { appSyncRequestMutation, appSyncRequestQuery } from "assets/js/request";

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

afterEach(() => {
  jest.clearAllMocks();
});

describe("InstanceGroupList", () => {
  it("renders without errors", () => {
    const { getByText } = renderWithProviders(
      <MemoryRouter initialEntries={["/resources/instance-group"]}>
        <InstanceGroupList />
      </MemoryRouter>,
      {
        preloadedState: {
          app: {
            ...AppStoreMockData,
          },
        },
      }
    );
    expect(getByText(/resource:group.groups/i)).toBeInTheDocument();
  });

  it("renders with data", async () => {
    (appSyncRequestQuery as any).mockResolvedValue({
      data: {
        listLogSources: { logSources: MockInstanceLogSources, total: 2 },
      },
    });

    await act(async () => {
      renderWithProviders(
        <MemoryRouter>
          <InstanceGroupList />
        </MemoryRouter>
      );
    });

    // click refresh button
    await act(async () => {
      fireEvent.click(screen.getByTestId("refresh-button"));
    });
  });

  it("should test confirm remove instance group", async () => {
    (appSyncRequestQuery as any).mockResolvedValue({
      data: {
        listLogSources: {
          logSources: [{ ...instanceGroupMockData }],
          total: 2,
        },
      },
    });

    (appSyncRequestMutation as any).mockResolvedValue({
      data: { deleteLogSource: "OK" },
    });

    await act(async () => {
      renderWithProviders(
        <MemoryRouter>
          <InstanceGroupList />
        </MemoryRouter>
      );
    });

    // click instance item
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
