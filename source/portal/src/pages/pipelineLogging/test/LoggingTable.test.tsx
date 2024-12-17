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
import { act, fireEvent, screen } from "@testing-library/react";
import LoggingTable from "../logging/LoggingTable";
import { AppStoreMockData } from "test/store.mock";
import { PipelineType } from "API";
import { MemoryRouter } from "react-router-dom";
import { renderWithProviders } from "test-utils";
import { appSyncRequestQuery } from "assets/js/request";
import { MockAppLogDetailData } from "test/applog.mock";
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

describe("LoggingTable", () => {
  it("renders without error", () => {
    const { getByTestId } = renderWithProviders(
      <MemoryRouter>
        <LoggingTable
          type={PipelineType.APP}
          pipelineInfo={{ ...MockAppLogDetailData }}
          lambdaFunName="test"
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
    expect(getByTestId("refresh-button")).toBeInTheDocument();
    fireEvent.click(getByTestId("refresh-button"));
  });

  it("displays the correct number of app log streams", async () => {
    const mockLogStreams = [
      {
        id: "1",
        __typename: "LogStream",
        logStreamName: "test",
        creationTime: "2022",
        firstEventTimestamp: "2022",
        lastEventTimestamp: "2022",
        lastIngestionTime: "2022",
        uploadSequenceToken: "2022",
        arn: "",
      },
    ];
    (appSyncRequestQuery as any).mockResolvedValue({
      data: {
        listLogStreams: { logStreams: mockLogStreams, total: 1 },
      },
    });

    await act(async () => {
      renderWithProviders(
        <MemoryRouter>
          <LoggingTable
            type={PipelineType.APP}
            pipelineInfo={{ ...MockAppLogDetailData }}
            lambdaFunName="test"
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

    expect(
      screen.getByPlaceholderText("common:logging.filterPlaceHolder")
    ).toBeInTheDocument();
    fireEvent.change(
      screen.getByPlaceholderText("common:logging.filterPlaceHolder"),
      { target: { value: "test" } }
    );
  });

  it("displays the correct number of service log streams", async () => {
    const mockLogStreams = [
      {
        id: "1",
        __typename: "LogStream",
        logStreamName: "test",
        creationTime: "2022",
        firstEventTimestamp: "2022",
        lastEventTimestamp: "2022",
        lastIngestionTime: "2022",
        uploadSequenceToken: "2022",
        arn: "",
      },
    ];
    (appSyncRequestQuery as any).mockResolvedValue({
      data: {
        listLogStreams: { logStreams: mockLogStreams, total: 1 },
      },
    });

    await act(async () => {
      renderWithProviders(
        <MemoryRouter>
          <LoggingTable
            type={PipelineType.SERVICE}
            pipelineInfo={{ ...mockS3ServicePipelineData }}
            lambdaFunName="test"
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

    expect(
      screen.getByPlaceholderText("common:logging.filterPlaceHolder")
    ).toBeInTheDocument();
    fireEvent.change(
      screen.getByPlaceholderText("common:logging.filterPlaceHolder"),
      { target: { value: "test" } }
    );
  });
});
