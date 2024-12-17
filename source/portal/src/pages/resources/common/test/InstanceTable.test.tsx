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
import InstanceTable from "../InstanceTable";
import { renderWithProviders } from "test-utils";
import { MemoryRouter } from "react-router-dom";
import { EC2GroupPlatform } from "API";
import { AppStoreMockData } from "test/store.mock";
import { appSyncRequestQuery } from "assets/js/request";
import { MockGetAgentStatus, MockListInstances } from "test/instance.mock";

jest.useFakeTimers();

jest.mock("assets/js/request", () => {
  return {
    appSyncRequestQuery: jest.fn(),
    refineErrorMessage: jest.fn(),
  };
});

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

beforeEach(async () => {
  jest.spyOn(console, "error").mockImplementation(jest.fn());
  jest.advanceTimersByTime(2000);
  await (appSyncRequestQuery as any).mockResolvedValue({
    data: {
      listInstances: MockListInstances,
      getInstanceAgentStatus: MockGetAgentStatus,
    },
  });
  jest.advanceTimersByTime(2000);
  await (appSyncRequestQuery as any).mockResolvedValue({
    data: {
      listInstances: MockListInstances,
      getInstanceAgentStatus: MockGetAgentStatus,
    },
  });

  jest.advanceTimersByTime(2000);
  await (appSyncRequestQuery as any).mockResolvedValue({
    data: {
      listInstances: MockListInstances,
      getInstanceAgentStatus: MockGetAgentStatus,
    },
  });
});

afterEach(() => {
  jest.clearAllMocks();
});

describe("InstanceTable", () => {
  it("renders without errors", async () => {
    await (appSyncRequestQuery as any).mockResolvedValue({
      data: {
        listInstances: MockListInstances,
        getInstanceAgentStatus: MockGetAgentStatus,
      },
    });

    renderWithProviders(
      <MemoryRouter>
        <InstanceTable platform={EC2GroupPlatform.Windows} accountId={""} />
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

  it("renders with data", async () => {
    await renderWithProviders(
      <MemoryRouter>
        <InstanceTable platform={EC2GroupPlatform.Linux} accountId={""} />
      </MemoryRouter>,
      {
        preloadedState: {
          app: {
            ...AppStoreMockData,
          },
        },
      }
    );

    // await waitFor(() => {
    //   expect(screen.getAllByTestId("gsui-loading")).not.toBeInTheDocument();
    // });
  });
});
