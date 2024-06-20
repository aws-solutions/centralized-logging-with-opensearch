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
import InstanceGroupDetail from "../InstanceGroupDetail";
import { renderWithProviders } from "test-utils";
import { AppStoreMockData } from "test/store.mock";
import { appSyncRequestQuery } from "assets/js/request";
import { instanceGroupMockData } from "test/instance.mock";
import { MemoryRouter, useParams } from "react-router-dom";
import { EC2GroupType } from "API";

// Mock the useParams hook before importing the component
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"), // preserve other exports
  useParams: jest.fn(), // mock useParams
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

jest.mock("assets/js/request", () => {
  return {
    appSyncRequestQuery: jest.fn(),
    refineErrorMessage: jest.fn(),
  };
});

beforeEach(() => {
  const mockParams = { id: "i-xxxxxxxx" };
  // Make useParams return the mock parameters
  (useParams as any).mockReturnValue(mockParams);
  jest.spyOn(console, "error").mockImplementation(jest.fn());
});

describe("instanceGroupDetail", () => {
  it("renders without errors", () => {
    (appSyncRequestQuery as any).mockResolvedValue({
      data: {
        getLogSource: instanceGroupMockData,
      },
    });
    const { getByText } = renderWithProviders(
      <MemoryRouter initialEntries={["/resources/instance-group/detail"]}>
        <InstanceGroupDetail />
      </MemoryRouter>,
      {
        preloadedState: {
          app: {
            ...AppStoreMockData,
          },
        },
      }
    );
    expect(getByText(/resource:group.name/i)).toBeInTheDocument();
  });

  it("renders without crashing with inactive status", () => {
    (appSyncRequestQuery as any).mockResolvedValue({
      data: {
        getLogSource: { ...instanceGroupMockData, status: "INACTIVE" },
      },
    });
    const { getByText } = renderWithProviders(
      <MemoryRouter initialEntries={["/resources/instance-group"]}>
        <InstanceGroupDetail />
      </MemoryRouter>,
      {
        preloadedState: {
          app: {
            ...AppStoreMockData,
          },
        },
      }
    );
    expect(getByText(/resource:group.name/i)).toBeInTheDocument();
  });

  it("renders without errors asg type", () => {
    (appSyncRequestQuery as any).mockResolvedValue({
      data: {
        getLogSource: {
          ...instanceGroupMockData,
          ec2: {
            ...instanceGroupMockData.ec2,
            groupType: EC2GroupType.ASG,
          },
        },
      },
    });
    const { getByText } = renderWithProviders(
      <MemoryRouter initialEntries={["/resources/instance-group"]}>
        <InstanceGroupDetail />
      </MemoryRouter>,
      {
        preloadedState: {
          app: {
            ...AppStoreMockData,
          },
        },
      }
    );
    expect(getByText(/resource:group.name/i)).toBeInTheDocument();
  });

  it("renders query failed", async () => {
    await (appSyncRequestQuery as any).mockRejectedValue(
      new Error("Request failed")
    );
    const { getByText } = renderWithProviders(
      <MemoryRouter initialEntries={["/resources/instance-group"]}>
        <InstanceGroupDetail />
      </MemoryRouter>,
      {
        preloadedState: {
          app: {
            ...AppStoreMockData,
          },
        },
      }
    );
    expect(getByText(/resource:group.name/i)).toBeInTheDocument();
  });
});
