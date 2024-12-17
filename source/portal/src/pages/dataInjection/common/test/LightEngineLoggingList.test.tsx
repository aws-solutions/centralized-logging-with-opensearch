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
import { LightEngineLoggingList } from "../LightEngineLoggingList";
import { SchedulerType, ScheduleType } from "API";
import { appSyncRequestQuery } from "assets/js/request";
import { act } from "@testing-library/react";

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

describe("LightEngineLoggingList", () => {
  it("renders without errors with metric", async () => {
    (appSyncRequestQuery as any).mockResolvedValue({
      data: {
        getLightEngineServicePipelineExecutionLogs: {
          items: [
            {
              executionName: "xxx-101c-xxx-xxx-xxx",
              executionArn: "arn",
              taskId: "00000000-0000-0000-0000-000000000000",
              startTime: "2024-04-29T01:04:35.084Z",
              endTime: "2024-04-29T01:10:13.387Z",
              status: "Succeeded",
              __typename: "LightEnginePipelineExecutionLog",
            },
          ],
          lastEvaluatedKey: null,
          __typename: "LightEnginePipelineExecutionLogsResponse",
        },
        checkOSIAvailability: true,
        getAccountUnreservedConurrency: 1000,
      },
    });
    await act(async () => {
      renderWithProviders(
        <MemoryRouter>
          <LightEngineLoggingList
            schedules={[
              {
                __typename: "Schedule",
                type: ScheduleType.LogProcessor,
                stateMachine: {
                  __typename: "StateMachine",
                  arn: "",
                  name: "",
                },
                scheduler: {
                  __typename: "Scheduler",
                  type: SchedulerType.EventBridgeEvents,
                  group: "",
                  name: "",
                  expression: "",
                  age: undefined,
                },
              },
            ]}
            pipelineId={"xx"}
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
  });
});
