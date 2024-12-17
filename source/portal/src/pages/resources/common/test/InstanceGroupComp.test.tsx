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
import InstanceGroupComp from "../InstanceGroupComp";
import { renderWithProviders } from "test-utils";
import { MemoryRouter } from "react-router-dom";
import { EC2GroupPlatform, EC2GroupType, LogSourceType } from "API";
import { screen, act, fireEvent, waitFor } from "@testing-library/react";
import { appSyncRequestQuery } from "assets/js/request";
import { MockMemberAccountData } from "test/store.mock";
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

const mockFun = jest.fn();

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

describe("InstanceGroupComp", () => {
  it("renders with data with linux", async () => {
    (appSyncRequestQuery as any).mockResolvedValue({
      data: {
        getSubAccountLink: { subAccountId: "111111111111" },
        listSubAccountLinks: {
          subAccountLinks: [{ ...MockMemberAccountData }],
        },
        listInstances: MockListInstances,
        getInstanceAgentStatus: MockGetAgentStatus,
      },
    });
    await act(async () => {
      renderWithProviders(
        <MemoryRouter>
          <InstanceGroupComp
            accountId={"111111111111"}
            instanceGroup={{
              groupName: "test",
              groupType: LogSourceType.EC2,
              asgObj: {
                name: "test",
                value: "test",
              },
              instanceSet: ["i-xxxxxx"],
            }}
            changeGroupName={mockFun}
            changeGroupType={mockFun}
            changeInstanceSet={mockFun}
            showNameEmptyError={false}
            setCreateDisabled={mockFun}
            changeCurAccount={mockFun}
            changeASG={mockFun}
            platform={EC2GroupPlatform.Linux}
          />
        </MemoryRouter>
      );
    });
  });

  it("renders with data with windows", async () => {
    (appSyncRequestQuery as any).mockResolvedValue({
      data: {
        getSubAccountLink: { subAccountId: "111111111111" },
        listSubAccountLinks: {
          subAccountLinks: [{ ...MockMemberAccountData }],
        },
        listInstances: MockListInstances,
        getInstanceAgentStatus: MockGetAgentStatus,
      },
    });
    await act(async () => {
      renderWithProviders(
        <MemoryRouter>
          <InstanceGroupComp
            accountId={"111111111111"}
            instanceGroup={{
              groupName: "test",
              groupType: EC2GroupType.ASG,
              asgObj: {
                name: "test",
                value: "test",
              },
              instanceSet: ["i-xxxxxx"],
            }}
            changeGroupName={mockFun}
            changeGroupType={mockFun}
            changeInstanceSet={mockFun}
            showNameEmptyError={false}
            setCreateDisabled={mockFun}
            changeCurAccount={mockFun}
            changeASG={mockFun}
            platform={EC2GroupPlatform.Windows}
          />
        </MemoryRouter>
      );
    });

    await waitFor(() => {
      expect(screen.queryByText("gsui-loading")).not.toBeInTheDocument();
    });
  });

  it("renders with data with show name error", async () => {
    (appSyncRequestQuery as any).mockResolvedValue({
      data: {
        getSubAccountLink: { subAccountId: "111111111111" },
        listSubAccountLinks: {
          subAccountLinks: [{ ...MockMemberAccountData }],
        },
        listLogSources: [
          {
            id: "xxxx",
            name: "asg-1",
            description: "asg description",
            parentId: null,
          },
        ],
        listInstances: MockListInstances,
        getInstanceAgentStatus: MockGetAgentStatus,
      },
    });
    await act(async () => {
      renderWithProviders(
        <MemoryRouter>
          <InstanceGroupComp
            accountId={""}
            instanceGroup={{
              groupName: "test",
              groupType: EC2GroupType.EC2,
              asgObj: {
                name: "test",
                value: "test",
              },
              instanceSet: ["i-xxxxxx"],
            }}
            changeGroupName={mockFun}
            changeGroupType={mockFun}
            changeInstanceSet={mockFun}
            showNameEmptyError={true}
            setCreateDisabled={mockFun}
            changeCurAccount={mockFun}
            changeASG={mockFun}
            platform={EC2GroupPlatform.Windows}
          />
        </MemoryRouter>
      );
    });

    // input group name
    fireEvent.change(screen.getByPlaceholderText("log-example-group"), {
      target: { value: "group name" },
    });
  });
});
