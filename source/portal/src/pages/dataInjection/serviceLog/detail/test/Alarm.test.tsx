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
import { act } from "@testing-library/react";
import Alarm from "../Alarm";
import { renderWithProviders } from "test-utils";
import { MemoryRouter } from "react-router-dom";
import { mockS3ServicePipelineData } from "test/servicelog.mock";
import { AppStoreMockData } from "test/store.mock";
import { appSyncRequestMutation, appSyncRequestQuery } from "assets/js/request";

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

describe("Alarm", () => {
  const mockChangePipelineMonitor = jest.fn();

  beforeEach(async () => {
    (appSyncRequestQuery as any).mockResolvedValue({
      data: {
        listResources: [
          {
            id: "arn:aws:sns:us-example-2:111111111111:xxxx",
            name: "AppDevOps_8fe9f402",
            parentId: null,
            description: null,
            __typename: "Resource",
          },
        ],
        getServicePipeline: { ...mockS3ServicePipelineData },
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
    await (appSyncRequestMutation as any).mockResolvedValue({
      data: {
        createPipelineAlarm: "OK",
        deletePipelineAlarm: "OK",
        updatePipelineAlarm: "OK",
      },
    });
  });

  it("renders without crashing", async () => {
    await act(async () => {
      renderWithProviders(
        <MemoryRouter>
          <Alarm
            pipelineInfo={mockS3ServicePipelineData}
            changePipelineMonitor={mockChangePipelineMonitor}
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
