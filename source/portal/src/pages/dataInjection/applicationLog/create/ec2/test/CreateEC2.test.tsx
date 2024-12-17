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
import CreateEC2 from "../CreateEC2";
import { screen, act, fireEvent, within } from "@testing-library/react";
import { mockOpenSearchStateData } from "test/domain.mock";
import {
  MockGrafanaData,
  MockLightEngineData,
  MockSelectProcessorState,
} from "test/servicelog.mock";
import { appSyncRequestMutation, appSyncRequestQuery } from "assets/js/request";
import { MockInstanceLogSources } from "test/instance.mock";
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
}));

beforeEach(() => {
  jest.spyOn(console, "error").mockImplementation(jest.fn());
  jest.spyOn(console, "warn").mockImplementation(jest.fn());
});

describe("CreateEC2", () => {
  it("renders without errors with opensearch", async () => {
    (appSyncRequestQuery as any).mockResolvedValue({
      data: {
        listLogSources: { logSources: MockInstanceLogSources, total: 2 },
        listLogConfigs: { logConfigs: mockConfigListResource, total: 1 },
        listLogConfigVersions: mockConfigListResource,
        listResources: [
          {
            description: null,
            id: "xxxx-xxxx-xxxx",
            name: "xxxx-xxxx-xxxx",
            parentId: null,
            __typename: "Resource",
          },
        ],
      },
    });

    (appSyncRequestMutation as any).mockResolvedValue({
      data: {
        createAppPipeline: "OK",
        createAppLogIngestion: "OK",
        createLightEngineAppPipeline: "OK",
      },
    });

    await act(async () => {
      renderWithProviders(
        <MemoryRouter>
          <CreateEC2 />
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
      );
    });

    // click ec2 next button
    await act(async () => {
      fireEvent.click(screen.getByTestId("ec2-next-button"));
    });

    // select ec2 instance group
    await act(async () => {
      fireEvent.click(screen.getByTestId("table-item-xxx-1"));
    });

    // click ec2 next button
    await act(async () => {
      fireEvent.click(screen.getByTestId("ec2-next-button"));
    });

    // click ec2 next button
    await act(async () => {
      fireEvent.click(screen.getByTestId("ec2-next-button"));
    });

    // click select log config
    const selectLogConfig = screen.getByRole("button", {
      name: /applog:logSourceDesc.s3.step2.chooseALogConfig/i,
    });
    await act(async () => {
      fireEvent.mouseDown(selectLogConfig);
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

    // input log path
    const logPath = screen.getByPlaceholderText(
      "/var/log/app1/*.log, /var/log/app2/*.log"
    );
    fireEvent.change(logPath, { target: { value: "/var/logs/json.log" } });

    // click ec2 next button
    await act(async () => {
      fireEvent.click(screen.getByTestId("ec2-next-button"));
    });

    // input index name
    const indexName = screen.getByPlaceholderText("log-example");
    fireEvent.change(indexName, { target: { value: "app-logs" } });

    // input shard number
    const shardNum = screen.getByPlaceholderText(
      "servicelog:cluster.inputShardNum"
    );
    fireEvent.change(shardNum, { target: { value: 1 } });

    // click ec2 next button
    await act(async () => {
      fireEvent.click(screen.getByTestId("ec2-next-button"));
    });

    // click ec2 next button
    await act(async () => {
      fireEvent.click(screen.getByTestId("ec2-next-button"));
    });

    // click ec2 next button
    await act(async () => {
      fireEvent.click(screen.getByTestId("ec2-next-button"));
    });

    // click ec2 create button
    await act(async () => {
      fireEvent.click(screen.getByTestId("ec2-create-button"));
    });
  });

  it("renders without errors with light engine", async () => {
    (appSyncRequestQuery as any).mockResolvedValue({
      data: {
        listLogSources: { logSources: MockInstanceLogSources, total: 2 },
        listLogConfigs: { logConfigs: mockConfigListResource, total: 1 },
        listLogConfigVersions: mockConfigListResource,
        listResources: [
          {
            description: null,
            id: "xxxx-xxxx-xxxx",
            name: "xxxx-xxxx-xxxx",
            parentId: null,
            __typename: "Resource",
          },
        ],
      },
    });

    (appSyncRequestMutation as any).mockResolvedValue({
      data: {
        createAppPipeline: "OK",
        createAppLogIngestion: "OK",
        createLightEngineAppPipeline: "OK",
      },
    });

    await act(async () => {
      renderWithProviders(
        <MemoryRouter
          initialEntries={[
            "/log-pipeline/application-log/create/ec2?engineType=LIGHT_ENGINE",
          ]}
        >
          <CreateEC2 />
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

    // click ec2 next button
    await act(async () => {
      fireEvent.click(screen.getByTestId("ec2-next-button"));
    });

    // select ec2 instance group
    await act(async () => {
      fireEvent.click(screen.getByTestId("table-item-xxx-1"));
    });

    // click ec2 next button
    await act(async () => {
      fireEvent.click(screen.getByTestId("ec2-next-button"));
    });

    // click ec2 next button
    await act(async () => {
      fireEvent.click(screen.getByTestId("ec2-next-button"));
    });

    // click select log config
    const selectLogConfig = screen.getByRole("button", {
      name: /applog:logSourceDesc.s3.step2.chooseALogConfig/i,
    });
    await act(async () => {
      fireEvent.mouseDown(selectLogConfig);
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

    // input log path
    const logPath = screen.getByPlaceholderText(
      "/var/log/app1/*.log, /var/log/app2/*.log"
    );
    fireEvent.change(logPath, { target: { value: "/var/logs/json.log" } });

    // click ec2 next button
    await act(async () => {
      fireEvent.click(screen.getByTestId("ec2-next-button"));
    });

    // click ec2 next button
    await act(async () => {
      fireEvent.click(screen.getByTestId("ec2-next-button"));
    });

    // click ec2 next button
    await act(async () => {
      fireEvent.click(screen.getByTestId("ec2-next-button"));
    });

    // click ec2 create button
    await act(async () => {
      fireEvent.click(screen.getByTestId("ec2-create-button"));
    });
  });
});
