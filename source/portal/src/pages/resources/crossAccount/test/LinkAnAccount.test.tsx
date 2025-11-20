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
import LinkAnAccount from "../LinkAnAccount";
import { screen, act, waitFor, fireEvent } from "@testing-library/react";
import { appSyncRequestMutation } from "assets/js/request";
import { AppStoreMockData, MockNewAccountData } from "test/store.mock";

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

jest.mock("assets/js/hooks/useMemberAccount", () => ({
  useMemberAccount: () => {
    return {
      data: {
        subAccountId: MockNewAccountData[1],
        region: "us-example-1",
        subAccountName: MockNewAccountData[0],
        subAccountRoleArn: MockNewAccountData[2],
        agentInstallDoc: MockNewAccountData[3],
        agentConfDoc: MockNewAccountData[4],
        windowsAgentInstallDoc: MockNewAccountData[5],
        windowsAgentConfDoc: MockNewAccountData[6],
        agentStatusCheckDoc: MockNewAccountData[7],
        subAccountBucketName: MockNewAccountData[8],
        subAccountStackId: MockNewAccountData[9],
        subAccountKMSKeyArn: MockNewAccountData[10],
        subAccountIamInstanceProfileArn: MockNewAccountData[11],
        tags: [],
      },
    };
  },
}));

jest.mock("assets/js/request", () => ({
  appSyncRequestQuery: jest.fn(),
  appSyncRequestMutation: jest.fn(),
}));

beforeEach(() => {
  jest.spyOn(console, "error").mockImplementation(jest.fn());
});

describe("LinkAnAccount", () => {
  it("renders without errors", async () => {
    await act(async () => {
      renderWithProviders(
        <MemoryRouter>
          <LinkAnAccount />
        </MemoryRouter>
      );
    });
    expect(
      screen.getByText(/resource:crossAccount.link.stepTwoTitle/i)
    ).toBeInTheDocument();
  });

  it("should click refresh and remove button", async () => {
    (appSyncRequestMutation as any).mockResolvedValue({
      data: { deleteSubAccountLink: "OK" },
    });
    await act(async () => {
      renderWithProviders(
        <MemoryRouter>
          <LinkAnAccount />
        </MemoryRouter>,
        {
          preloadedState: {
            ...AppStoreMockData,
            memberAccount: {
              data: {
                subAccountId: MockNewAccountData[1],
                region: "us-example-1",
                subAccountName: MockNewAccountData[0],
                subAccountRoleArn: MockNewAccountData[2],
                agentInstallDoc: MockNewAccountData[3],
                agentConfDoc: MockNewAccountData[4],
                windowsAgentInstallDoc: MockNewAccountData[5],
                windowsAgentConfDoc: MockNewAccountData[6],
                agentStatusCheckDoc: MockNewAccountData[7],
                subAccountBucketName: MockNewAccountData[8],
                subAccountStackId: MockNewAccountData[9],
                subAccountKMSKeyArn: MockNewAccountData[10],
                subAccountIamInstanceProfileArn: MockNewAccountData[11],
                tags: [],
              },
            } as any,
          },
        }
      );
    });

    await waitFor(() => {
      expect(screen.queryByText("gsui-loading")).not.toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId("confirm-link-button"));
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId("cancel-link-button"));
    });
  });
});
