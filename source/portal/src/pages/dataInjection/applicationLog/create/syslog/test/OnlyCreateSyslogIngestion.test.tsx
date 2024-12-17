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
import { MemoryRouter, useParams } from "react-router-dom";
import OnlyCreateSyslogIngestion from "../OnlyCreateSyslogIngestion";
import { screen, act, within, fireEvent } from "@testing-library/react";
import { mockConfigListResource } from "test/config.mock";
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

jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useParams: jest.fn(),
}));

jest.mock("assets/js/request", () => ({
  appSyncRequestQuery: jest.fn(),
  appSyncRequestMutation: jest.fn(),
  refineErrorMessage: jest
    .fn()
    .mockReturnValue({ errorCode: "mockCode", message: "mockMessage" }),
}));

beforeEach(() => {
  const mockParams = { id: "test", appPipelineId: "test" };
  (useParams as any).mockReturnValue(mockParams);
  jest.spyOn(console, "error").mockImplementation(jest.fn());
});

describe("OnlyCreateSyslogIngestion", () => {
  it("renders without errors", async () => {
    (appSyncRequestQuery as any).mockResolvedValue({
      data: {
        checkCustomPort: {
          isAllowedPort: true,
          msg: "",
          recommendedPort: 509,
          __typename: "checkCustomPortResponse",
        },
        listLogConfigs: { logConfigs: mockConfigListResource, total: 1 },
      },
    });

    (appSyncRequestMutation as any).mockResolvedValue({
      data: {
        checkCustomPort: {
          isAllowedPort: true,
          msg: "",
          recommendedPort: 509,
          __typename: "checkCustomPortResponse",
        },
        createLogSource: "xxxxxx",
        createAppLogIngestion: "OK",
        createLightEngineAppPipeline: "OK",
      },
    });

    await act(async () => {
      renderWithProviders(
        <MemoryRouter>
          <OnlyCreateSyslogIngestion />
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

    // select protocol
    const protocol = screen.getByRole("button", {
      name: "applog:ingestion.syslog.chooseProtocol",
    });
    fireEvent.mouseDown(protocol);

    // select UDP
    const listProtocol = within(document.body).getByRole("listbox");
    const udpItem = await within(listProtocol).findByText(/UDP/i);
    await act(async () => {
      fireEvent.click(udpItem);
    });

    // click edit button
    await act(async () => {
      fireEvent.click(screen.getByTestId("syslog-port-edit"));
    });

    // input syslog port
    const syslogPort = screen.getByPlaceholderText("500 ~ 20000");
    fireEvent.change(syslogPort, { target: { value: "514" } });

    // click syslog create button
    await act(async () => {
      fireEvent.click(screen.getByTestId("syslog-create-button"));
    });
  });
});
