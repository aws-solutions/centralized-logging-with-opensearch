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
import Ingestion from "../Ingestion";
import { appSyncRequestMutation, appSyncRequestQuery } from "assets/js/request";
import { MockAppLogDetailData } from "test/applog.mock";
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

jest.mock("assets/js/request", () => ({
  appSyncRequestQuery: jest.fn(),
  appSyncRequestMutation: jest.fn(),
}));

beforeEach(() => {
  jest.spyOn(console, "error").mockImplementation(jest.fn());
});

describe("Ingestion", () => {
  it("renders without errors", async () => {
    (appSyncRequestQuery as any).mockResolvedValue({
      data: {
        listAppLogIngestions: {
          appLogIngestions: [
            {
              id: "xxxxx",
              stackId: null,
              stackName: null,
              appPipelineId: "xxxxxx",
              logPath: "%2Fvar%2Flog%2Fcontainers%2Fsolax.log",
              sourceId: "b3dbe785-376b-44f1-b085-c0ba187d6edf",
              sourceType: "EC2",
              createdAt: "2024-03-26T09:32:34Z",
              status: "ACTIVE",
              tags: [],
              accountId: "123456789012",
              region: "us-west-2",
              __typename: "AppLogIngestion",
            },
          ],
          total: 1,
        },
      },
      getLogSource: {
        sourceId: "xxxxx",
        type: "EC2",
        accountId: "123456789012",
        region: "us-west-2",
        eks: null,
        s3: null,
        ec2: {
          groupName: "albertxu-instance-group",
          groupType: "EC2",
          groupPlatform: "Linux",
          asgName: "",
          instances: [
            {
              instanceId: "i-xxx",
              __typename: "EC2Instances",
            },
          ],
          __typename: "EC2Source",
        },
        syslog: null,
        createdAt: "2023-08-02T12:37:40Z",
        updatedAt: "2023-08-02T12:37:40Z",
        status: "ACTIVE",
        tags: [],
        __typename: "LogSource",
      },
    });

    (appSyncRequestMutation as any).mockResolvedValue({
      data: {
        deleteAppLogIngestion: "OK",
      },
    });
    await act(async () => {
      renderWithProviders(
        <MemoryRouter>
          <Ingestion
            isRefreshing={false}
            pipelineInfo={{ ...MockAppLogDetailData }}
          />
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

    // select on ingestion
    await act(async () => {
      fireEvent.click(screen.getByTestId("table-item-xxxxx"));
    });

    // click delete button
    await act(async () => {
      fireEvent.click(screen.getByTestId("app-ingestion-delete-button"));
    });

    // click confirm delete button
    await act(async () => {
      fireEvent.click(
        screen.getByTestId("app-ingestion-confirm-delete-button")
      );
    });

    // click create refresh button
    await act(async () => {
      fireEvent.click(screen.getByTestId("app-ingestion-refresh-button"));
    });
  });
});
