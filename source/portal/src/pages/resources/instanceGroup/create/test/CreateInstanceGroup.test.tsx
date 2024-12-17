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
import { act, fireEvent, screen, waitFor } from "@testing-library/react";
import CreateInstanceGroup from "../CreateInstanceGroup";
import { renderWithProviders } from "test-utils";
import { MemoryRouter } from "react-router-dom";
import { AppStoreMockData, MockMemberAccountData } from "test/store.mock";
import { appSyncRequestMutation, appSyncRequestQuery } from "assets/js/request";
import { MockGetAgentStatus, MockListInstances } from "test/instance.mock";

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

jest.mock("apollo-link", () => {
  return {
    ApolloLink: {
      from: jest.fn(),
    },
  };
});

jest.mock("aws-appsync-auth-link", () => {
  return {
    AUTH_TYPE: {
      OPENID_CONNECT: "OPENID_CONNECT",
      AMAZON_COGNITO_USER_POOLS: "AMAZON_COGNITO_USER_POOLS",
    },
    createAuthLink: jest.fn(),
  };
});

jest.mock("assets/js/request", () => ({
  appSyncRequestQuery: jest.fn(),
  appSyncRequestMutation: jest.fn(),
}));

beforeEach(() => {
  jest.spyOn(console, "error").mockImplementation(jest.fn());
});

describe("CreateInstanceGroup", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (appSyncRequestQuery as any).mockResolvedValue({
      data: {
        listInstances: MockListInstances,
        getInstanceAgentStatus: MockGetAgentStatus,
        listSubAccountLinks: {
          subAccountLinks: [{ ...MockMemberAccountData }],
          total: 1,
        },
      },
    });
  });

  it("renders without  errors and create asg no instance", async () => {
    await act(async () => {
      renderWithProviders(
        <MemoryRouter>
          <CreateInstanceGroup />
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

    // click create instance group button
    const createInstanceGroupButton = screen.getByTestId(
      "create-instance-group-button"
    );
    expect(createInstanceGroupButton).toBeInTheDocument();
    fireEvent.click(createInstanceGroupButton);
  });

  it("renders without errors and create ec2 instance group", async () => {
    (appSyncRequestQuery as any).mockResolvedValue({
      data: {
        listInstances: MockListInstances,
        getInstanceAgentStatus: {
          commandId: "xxxx",
          instanceAgentStatusList: [
            {
              instanceId: "i-xxx1",
              status: "Online",
            },
          ],
        },
        listSubAccountLinks: {
          subAccountLinks: [{ ...MockMemberAccountData }],
          total: 1,
        },
      },
    });

    (appSyncRequestMutation as any).mockResolvedValue({
      data: {
        createLogSource: {
          success: true,
        },
      },
    });
    await act(async () => {
      renderWithProviders(
        <MemoryRouter>
          <CreateInstanceGroup />
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

    await waitFor(
      () => {
        const loadings = screen.queryAllByTestId("gsui-loading");
        expect(loadings).toHaveLength(0);
      },
      { timeout: 3000 }
    );

    // select instance item
    await waitFor(() => {
      const instanceItem = screen.getByTestId("table-item-i-xxx1");
      expect(instanceItem).toBeInTheDocument();
      fireEvent.click(instanceItem);
    });

    // click install agent button
    const installAgentButton = screen.getByTestId("install-agent-button");
    expect(installAgentButton).toBeInTheDocument();
    fireEvent.click(installAgentButton);

    // input instance group name
    const groupNameInput = screen.getByPlaceholderText("log-example-group");
    expect(groupNameInput).toBeInTheDocument();
    fireEvent.change(groupNameInput, { target: { value: "Test Group" } });

    // click create instance group button
    const createInstanceGroupButton = screen.getByTestId(
      "create-instance-group-button"
    );
    expect(createInstanceGroupButton).toBeInTheDocument();
    fireEvent.click(createInstanceGroupButton);

    // click cancel button
    const cancelButton = screen.getByTestId(
      "cancel-create-instance-group-button"
    );
    expect(cancelButton).toBeInTheDocument();
    await act(async () => {
      fireEvent.click(cancelButton);
    });
  });

  it("renders without  errors and create asg instance group", async () => {
    (appSyncRequestQuery as any).mockResolvedValue({
      data: {
        listInstances: MockListInstances,
        getInstanceAgentStatus: {
          commandId: "xxxx",
          instanceAgentStatusList: [
            {
              instanceId: "i-xxx1",
              status: "Online",
            },
          ],
        },
        listLogSources: [
          {
            id: "xxxx",
            name: "asg-1",
            description: "asg description",
            parentId: null,
          },
        ],
        listSubAccountLinks: {
          subAccountLinks: [{ ...MockMemberAccountData }],
          total: 1,
        },
      },
    });

    (appSyncRequestMutation as any).mockResolvedValue({
      data: {
        createLogSource: {
          success: true,
        },
      },
    });
    await act(async () => {
      renderWithProviders(
        <MemoryRouter>
          <CreateInstanceGroup />
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

    // input instance group name
    const groupNameInput = screen.getByPlaceholderText("log-example-group");
    expect(groupNameInput).toBeInTheDocument();
    fireEvent.change(groupNameInput, { target: { value: "Test Group" } });

    // click create instance group button
    const createInstanceGroupButton = screen.getByTestId(
      "create-instance-group-button"
    );
    expect(createInstanceGroupButton).toBeInTheDocument();
    fireEvent.click(createInstanceGroupButton);
  });
});
