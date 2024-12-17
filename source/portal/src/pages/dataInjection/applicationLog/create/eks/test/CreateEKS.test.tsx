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
import CreateEKS from "../CreateEKS";
import { screen, act, fireEvent, within } from "@testing-library/react";
import { mockOpenSearchStateData } from "test/domain.mock";
import {
  MockGrafanaData,
  MockLightEngineData,
  MockSelectProcessorState,
} from "test/servicelog.mock";
import { appSyncRequestMutation, appSyncRequestQuery } from "assets/js/request";
import { mockConfigListResource } from "test/config.mock";
import { MockEKSData } from "test/applog.mock";

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

describe("CreateEKS", () => {
  it("renders without errors with opensearch", async () => {
    (appSyncRequestQuery as any).mockResolvedValue({
      data: {
        listLogSources: { logSources: [{ ...MockEKSData }], total: 2 },
        listLogConfigs: { logConfigs: mockConfigListResource, total: 1 },
        listLogConfigVersions: mockConfigListResource,
        listResources: [
          {
            id: "eks-1",
            name: "eks-1",
            parentId: null,
            description: "eks-1",
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
          <CreateEKS />
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

    // click eks next button
    await act(async () => {
      fireEvent.click(screen.getByTestId("eks-next-button"));
    });

    // select eks group
    const autocomplete = screen.getByPlaceholderText(
      "applog:ingestion.eks.specifySource.chooseEKS"
    );
    autocomplete.focus();
    // the value here can be any string you want, so you may also consider to
    // wrapper it as a function and pass in inputValue as parameter
    fireEvent.change(autocomplete, { target: { value: "e" } });
    fireEvent.keyDown(autocomplete, { key: "ArrowDown" });
    fireEvent.keyDown(autocomplete, { key: "Enter" });

    // click eks next button
    await act(async () => {
      fireEvent.click(screen.getByTestId("eks-next-button"));
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

    // input log path
    const logPath = screen.getByPlaceholderText(
      "/var/log/containers/<application_name>-*_<namespace>_<container_name>-*"
    );
    fireEvent.change(logPath, { target: { value: "/var/logs/json.log" } });

    // click eks next button
    await act(async () => {
      fireEvent.click(screen.getByTestId("eks-next-button"));
    });

    // input index name
    const indexName = screen.getByPlaceholderText("log-example");
    fireEvent.change(indexName, { target: { value: "app-logs" } });

    // input shard number
    const shardNum = screen.getByPlaceholderText(
      "servicelog:cluster.inputShardNum"
    );
    fireEvent.change(shardNum, { target: { value: 1 } });

    // click eks next button
    await act(async () => {
      fireEvent.click(screen.getByTestId("eks-next-button"));
    });

    // click eks next button
    await act(async () => {
      fireEvent.click(screen.getByTestId("eks-next-button"));
    });

    // click eks next button
    await act(async () => {
      fireEvent.click(screen.getByTestId("eks-next-button"));
    });

    // click eks create button
    await act(async () => {
      fireEvent.click(screen.getByTestId("eks-create-button"));
    });
  });

  it("renders without errors with light engine", async () => {
    (appSyncRequestQuery as any).mockResolvedValue({
      data: {
        listLogSources: { logSources: [{ ...MockEKSData }], total: 2 },
        listLogConfigs: { logConfigs: mockConfigListResource, total: 1 },
        listLogConfigVersions: mockConfigListResource,
        listResources: [
          {
            id: "eks-1",
            name: "eks-1",
            parentId: null,
            description: "eks-1",
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
            "/log-pipeline/application-log/create/eks?engineType=LIGHT_ENGINE",
          ]}
        >
          <CreateEKS />
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

    // click eks next button
    await act(async () => {
      fireEvent.click(screen.getByTestId("eks-next-button"));
    });

    // select eks group
    const autocomplete = screen.getByPlaceholderText(
      "applog:ingestion.eks.specifySource.chooseEKS"
    );
    autocomplete.focus();
    // the value here can be any string you want, so you may also consider to
    // wrapper it as a function and pass in inputValue as parameter
    fireEvent.change(autocomplete, { target: { value: "e" } });
    fireEvent.keyDown(autocomplete, { key: "ArrowDown" });
    fireEvent.keyDown(autocomplete, { key: "Enter" });

    // click eks next button
    await act(async () => {
      fireEvent.click(screen.getByTestId("eks-next-button"));
    });

    // click eks next button
    await act(async () => {
      fireEvent.click(screen.getByTestId("eks-next-button"));
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

    // click eks next button
    await act(async () => {
      fireEvent.click(screen.getByTestId("eks-next-button"));
    });

    // input log path
    const logPath = screen.getByPlaceholderText(
      "/var/log/containers/<application_name>-*_<namespace>_<container_name>-*"
    );
    fireEvent.change(logPath, { target: { value: "/var/logs/json.log" } });

    // click eks next button
    await act(async () => {
      fireEvent.click(screen.getByTestId("eks-next-button"));
    });

    // click eks next button
    await act(async () => {
      fireEvent.click(screen.getByTestId("eks-next-button"));
    });

    // click eks next button
    await act(async () => {
      fireEvent.click(screen.getByTestId("eks-next-button"));
    });

    // click eks create button
    await act(async () => {
      fireEvent.click(screen.getByTestId("eks-create-button"));
    });
  });
});
