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
import Alarm from "../Alarm";
import { renderWithProviders } from "test-utils";
import { MemoryRouter } from "react-router-dom";
import { PipelineAlarmStatus, PipelineType } from "API";
import { AppStoreMockData } from "test/store.mock";
import { appSyncRequestMutation, appSyncRequestQuery } from "assets/js/request";
import { MockAppLogDetailData, MockCreateAlarmData } from "test/applog.mock";
import { fireEvent, screen } from "@testing-library/react";
import { mockS3ServicePipelineData } from "test/servicelog.mock";

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
  refineErrorMessage: jest.fn(),
  appSyncRequestQuery: jest.fn(),
  appSyncRequestMutation: jest.fn(),
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

beforeEach(() => {
  jest.spyOn(console, "error").mockImplementation(jest.fn());
});

describe("Alarm", () => {
  beforeEach(async () => {
    await (appSyncRequestQuery as any).mockResolvedValue({
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
        getAppPipeline: { ...MockAppLogDetailData },
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

  it("renders without errors for create app pipeline", async () => {
    renderWithProviders(
      <MemoryRouter>
        <Alarm
          pageType={"create"}
          type={PipelineType.APP}
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

  it("renders without errors for create service pipeline", async () => {
    renderWithProviders(
      <MemoryRouter>
        <Alarm
          pageType={"detail"}
          type={PipelineType.SERVICE}
          pipelineInfo={{ ...mockS3ServicePipelineData }}
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

  it("renders without errors for create service pipeline", async () => {
    const { container } = renderWithProviders(
      <MemoryRouter>
        <Alarm
          pageType={"create"}
          type={PipelineType.SERVICE}
          servicePipeline={{ ...mockS3ServicePipelineData }}
        />
      </MemoryRouter>,
      {
        preloadedState: {
          app: {
            ...AppStoreMockData,
          },
          createAlarm: { ...MockCreateAlarmData },
        },
      }
    );

    const checkbox = container.querySelector(".react-switch-checkbox");
    expect(checkbox).toBeInTheDocument();
    if (checkbox) {
      fireEvent.click(checkbox);
    }
  });

  it("renders without errors for detail app pipeline", async () => {
    const { container } = renderWithProviders(
      <MemoryRouter>
        <Alarm
          pageType={"detail"}
          type={PipelineType.APP}
          pipelineInfo={{
            ...MockAppLogDetailData,
            monitor: {
              ...MockAppLogDetailData.monitor,
              pipelineAlarmStatus: PipelineAlarmStatus.DISABLED,
            },
          }}
        />
      </MemoryRouter>,
      {
        preloadedState: {
          app: {
            ...AppStoreMockData,
          },
          createAlarm: { ...MockCreateAlarmData },
        },
      }
    );

    const checkbox = container.querySelector(".react-switch-checkbox");
    expect(checkbox).toBeInTheDocument();

    const radioCreateTopic = screen.getByLabelText(/common:alarm.createTopic/i);
    expect(radioCreateTopic).toBeInTheDocument();
    fireEvent.click(radioCreateTopic);

    const topicInput = screen.getByPlaceholderText("MyTopic");
    await fireEvent.change(topicInput, { target: { value: "NewTopicName" } });

    const emailInput = screen.getByPlaceholderText("ops@example.com");
    await fireEvent.change(emailInput, {
      target: { value: "test@example.com" },
    });

    expect(screen.getByTestId("create-button")).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("create-button"));
  });

  it("renders without errors for detail app pipeline", async () => {
    renderWithProviders(
      <MemoryRouter>
        <Alarm
          pageType={"detail"}
          type={PipelineType.APP}
          pipelineInfo={{
            ...MockAppLogDetailData,
          }}
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

    expect(screen.getByTestId("edit-button")).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("edit-button"));

    expect(screen.getByTestId("save-button")).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("save-button"));
  });

  it("renders without errors for detail service pipeline", async () => {
    renderWithProviders(
      <MemoryRouter>
        <Alarm
          pageType={"detail"}
          type={PipelineType.SERVICE}
          servicePipeline={{
            ...mockS3ServicePipelineData,
          }}
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

  it("renders without errors for detail service pipeline disabled", async () => {
    renderWithProviders(
      <MemoryRouter>
        <Alarm
          pageType={"detail"}
          type={PipelineType.APP}
          pipelineInfo={{
            ...MockAppLogDetailData,
            status: PipelineAlarmStatus.DISABLED,
          }}
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

  it("renders without errors for detail app pipeline disabled", async () => {
    renderWithProviders(
      <MemoryRouter>
        <Alarm
          pageType={"detail"}
          type={PipelineType.SERVICE}
          servicePipeline={{
            ...mockS3ServicePipelineData,
            status: PipelineAlarmStatus.DISABLED,
          }}
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
