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
import AlarmStatus from "../AlarmStatus";
import { PipelineType } from "API";
import { appSyncRequestQuery } from "assets/js/request";
import { MemoryRouter } from "react-router-dom";
import { renderWithProviders } from "test-utils";

jest.mock("assets/js/request", () => ({
  appSyncRequestQuery: jest.fn(),
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

beforeEach(() => {
  jest.spyOn(console, "error").mockImplementation(jest.fn());
});

describe("AlarmStatus", () => {
  it("renders without error", async () => {
    await (appSyncRequestQuery as any).mockResolvedValue({
      data: {
        getPipelineAlarm: {
          alarms: [
            {
              name: "OLDEST_MESSAGE_AGE_ALARM",
              status: "INSUFFICIENT_DATA",
              resourceId: "xx-e068-4f24-xx-xxx",
              __typename: "AlarmMetricDetail",
            },
          ],
          __typename: "PipelineAlarm",
        },
      },
    });
    const props = {
      pipelineId: "pipeline-id",
      type: PipelineType.APP,
      alarmName: "alarm-name",
      refreshCount: 0,
    };
    renderWithProviders(
      <MemoryRouter>
        <AlarmStatus {...props} />
      </MemoryRouter>
    );
  });

  it("renders without data", async () => {
    await (appSyncRequestQuery as any).mockResolvedValue({
      data: {
        getPipelineAlarm: {
          alarms: [],
          __typename: "PipelineAlarm",
        },
      },
    });
    const props = {
      pipelineId: "pipeline-id",
      type: PipelineType.APP,
      alarmName: "alarm-name",
      refreshCount: 0,
    };
    renderWithProviders(
      <MemoryRouter>
        <AlarmStatus {...props} />
      </MemoryRouter>
    );
  });
});
