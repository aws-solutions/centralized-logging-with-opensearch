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
import CreateSyslog from "../CreateSyslog";
import { screen, act, fireEvent, within } from "@testing-library/react";
import { mockOpenSearchStateData } from "test/domain.mock";
import {
  MockGrafanaData,
  MockLightEngineData,
  MockSelectProcessorState,
} from "test/servicelog.mock";
import { appSyncRequestMutation, appSyncRequestQuery } from "assets/js/request";
import { mockConfigListResource } from "test/config.mock";

// Mock SelectLogProcessor
jest.mock("pages/comps/processor/SelectLogProcessor", () => {
  return {
    __esModule: true,
    default: () => <div>SelectLogProcessor</div>,
  };
});

jest.mock(
  "pages/dataInjection/serviceLog/create/common/ConfigLightEngine",
  () => {
    return {
      __esModule: true,
      default: () => <div>ConfigLightEngine</div>,
      covertSvcTaskToLightEngine: jest.fn(),
    };
  }
);

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
  refineErrorMessage: jest
    .fn()
    .mockReturnValue({ errorCode: "mockCode", message: "mockMessage" }),
}));

beforeEach(() => {
  jest.spyOn(console, "error").mockImplementation(jest.fn());
  jest.spyOn(console, "warn").mockImplementation(jest.fn());
});

describe("CreateSyslog", () => {
  it("renders without errors with opensearch", async () => {
    (appSyncRequestQuery as any).mockResolvedValue({
      data: {
        checkCustomPort: {
          isAllowedPort: true,
          msg: "",
          recommendedPort: 509,
          __typename: "checkCustomPortResponse",
        },
        listLogConfigs: { logConfigs: mockConfigListResource, total: 1 },
        listLogConfigVersions: mockConfigListResource,
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

    await act(async () =>
      renderWithProviders(
        <MemoryRouter>
          <CreateSyslog />
        </MemoryRouter>,
        {
          preloadedState: {
            app: {
              ...AppStoreMockData,
            },
            openSearch: {
              ...mockOpenSearchStateData,
            },
            selectProcessor: {
              ...MockSelectProcessorState,
            },
          },
        }
      )
    );

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

    // click syslog next button
    await act(async () => {
      fireEvent.click(screen.getByTestId("syslog-next-button"));
    });

    // Select log config
    const selectLogConfig = screen.getByPlaceholderText(
      "applog:logSourceDesc.s3.step2.chooseALogConfig"
    );

    const divElement = selectLogConfig.previousElementSibling;

    await act(async () => {
      divElement && fireEvent.mouseDown(divElement);
    });
    const listLogConfig = within(document.body).getByRole("listbox");
    const logConfig = await within(listLogConfig).findByText(
      /test-json-config/i
    );

    await act(async () => {
      fireEvent.click(logConfig);
    });

    const revisionSelect = screen.getByTestId("log-conf-revision-select");
    const revision = await within(revisionSelect).findByText(
      /ekslog:ingest.detail.configTab.revision 1/i
    );
    await act(async () => {
      fireEvent.click(revision);
    });

    // click syslog next button
    await act(async () => {
      fireEvent.click(screen.getByTestId("syslog-next-button"));
    });

    // input index name
    const indexName = screen.getByPlaceholderText("log-example");
    fireEvent.change(indexName, { target: { value: "app-logs" } });

    // input shard number
    const shardNum = screen.getByPlaceholderText(
      "servicelog:cluster.inputShardNum"
    );
    fireEvent.change(shardNum, { target: { value: 1 } });

    // click syslog next button
    await act(async () => {
      fireEvent.click(screen.getByTestId("syslog-next-button"));
    });

    // click syslog next button
    await act(async () => {
      fireEvent.click(screen.getByTestId("syslog-next-button"));
    });

    // click syslog next button
    await act(async () => {
      fireEvent.click(screen.getByTestId("syslog-next-button"));
    });

    // click syslog create button
    await act(async () => {
      fireEvent.click(screen.getByTestId("syslog-create-button"));
    });
  });

  it("renders without errors with light engine", async () => {
    (appSyncRequestQuery as any).mockResolvedValue({
      data: {
        checkCustomPort: {
          isAllowedPort: true,
          msg: "",
          recommendedPort: 509,
          __typename: "checkCustomPortResponse",
        },
        listLogConfigs: { logConfigs: mockConfigListResource, total: 1 },
        listLogConfigVersions: mockConfigListResource,
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
        <MemoryRouter
          initialEntries={[
            "/log-pipeline/application-log/create/syslog?engineType=LIGHT_ENGINE",
          ]}
        >
          <CreateSyslog />
        </MemoryRouter>,
        {
          preloadedState: {
            app: {
              ...AppStoreMockData,
            },
            openSearch: {
              ...mockOpenSearchStateData,
            },
            selectProcessor: {
              ...MockSelectProcessorState,
            },
            grafana: {
              ...MockGrafanaData,
            },
            createLightEngine: {
              ...MockLightEngineData,
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

    // click syslog next button
    await act(async () => {
      fireEvent.click(screen.getByTestId("syslog-next-button"));
    });

    const selectLogConfig = screen.getByPlaceholderText(
      "applog:logSourceDesc.s3.step2.chooseALogConfig"
    );

    const divElement = selectLogConfig.previousElementSibling;

    await act(async () => {
      divElement && fireEvent.mouseDown(divElement);
    });
    const listLogConfig = within(document.body).getByRole("listbox");
    const logConfig = await within(listLogConfig).findByText(
      /test-json-config/i
    );

    await act(async () => {
      fireEvent.click(logConfig);
    });

    const revisionSelect = screen.getByTestId("log-conf-revision-select");
    const revision = await within(revisionSelect).findByText(
      /ekslog:ingest.detail.configTab.revision 1/i
    );
    await act(async () => {
      fireEvent.click(revision);
    });

    // click syslog next button
    await act(async () => {
      fireEvent.click(screen.getByTestId("syslog-next-button"));
    });

    // click syslog next button
    await act(async () => {
      fireEvent.click(screen.getByTestId("syslog-next-button"));
    });

    // click syslog next button
    await act(async () => {
      fireEvent.click(screen.getByTestId("syslog-next-button"));
    });

    // click syslog create button
    await act(async () => {
      fireEvent.click(screen.getByTestId("syslog-create-button"));
    });
  });
});
